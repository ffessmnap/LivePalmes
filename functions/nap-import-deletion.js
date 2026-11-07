"use strict";
// MyISAM deletion is resumable, not transactional. Its receipt stores ids/hashes
// and counts, never another before-image or a new copy of sporting results.
const {COLUMNS,positiveId}=require("./nap-performance-change-plan");
const {RELAY_COLUMNS,canonical}=require("./nap-import-operation-plan");
const {hash,pointerId,parse,invalidateImportReview}=require("./nap-import-lifecycle");
const LIMITS={perfs:5000,relays:1000,statuses:5000};
const VISIBILITY=["performance_id","hidden","version","updated_at","updated_by"];
const chunks=items=>Array.from({length:Math.ceil(items.length/200)},(_,i)=>items.slice(i*200,(i+1)*200));
const projection=columns=>columns.map(c=>`\`${c}\``).join(",");
function entries(rows,columns,key="id"){
  return rows.map(row=>[Number(row[key]),hash(canonical(row,columns))]).sort((a,b)=>a[0]-b[0]);
}
function checkRemaining(rows,expected,columns,key="id"){
  const saved=new Map(expected);
  if(new Set(rows.map(r=>Number(r[key]))).size!==rows.length||entries(rows,columns,key).some(([id,digest])=>saved.get(id)!==digest))throw new TypeError("Les résultats ont changé. Rechargez avant de supprimer ; une suppression interrompue doit être examinée avant reprise.");
}
function summarize(perfs,relays,statuses){
  const people=new Set(),clubs=new Set();
  const addPerson=id=>{if(Number.isSafeInteger(Number(id))&&Number(id)>0)people.add(Number(id));};
  const addClub=id=>{if(id!==null&&id!==undefined&&String(id)!=="")clubs.add(String(id));};
  for(const row of perfs){addPerson(row.nageur);addClub(row.club);}
  for(const row of relays){[1,2,3,4].forEach(n=>addPerson(row[`nageur${n}`]));addClub(row.club);}
  for(const item of statuses){const row=parse(item.expected_row)?.row;addPerson(row.swimmerId);(row.members||[]).forEach(addPerson);addClub(row.clubId);}
  return {performances:perfs.length,relays:relays.length,statuses:statuses.length,swimmers:people.size,clubs:clubs.size};
}
async function readState(query,competitionId,pointer,visibilityIds){
  const perfs=await query(`SELECT ${projection(COLUMNS)} FROM perfs FORCE INDEX (livepalmes_compet_id) WHERE compet=? ORDER BY id LIMIT 5001`,[competitionId]);
  const relays=await query(`SELECT ${projection(RELAY_COLUMNS)} FROM perfs_relais FORCE INDEX (livepalmes_compet_id) WHERE compet=? ORDER BY id LIMIT 1001`,[competitionId]);
  const statuses=!pointer.resultsDeleted&&pointer.currentImportId?await query("SELECT row_number,expected_row FROM livepalmes_performance_import_rows FORCE INDEX (PRIMARY) WHERE import_id=? AND status='status' ORDER BY row_number LIMIT 5001",[pointer.currentImportId]):[];
  if(perfs.length>LIMITS.perfs||relays.length>LIMITS.relays||statuses.length>LIMITS.statuses)throw new RangeError("Cette compétition dépasse les limites de suppression (5 000 performances, 1 000 relais, 5 000 statuts). Aucune suppression lancée.");
  if(perfs.some(r=>Number(r.compet)!==competitionId)||relays.some(r=>Number(r.compet)!==competitionId)||statuses.some(r=>{const item=parse(r.expected_row);return item?.table!=="status"||!item.row||!["ABD","DSQ","FRT"].includes(item.row.status);}))throw new TypeError("Résultats de compétition incohérents.");
  const ids=visibilityIds||perfs.map(r=>r.id);
  const visibility=ids.length?await query(`SELECT ${projection(VISIBILITY)} FROM livepalmes_performance_visibility FORCE INDEX (PRIMARY) WHERE performance_id IN (${ids.map(()=>"?").join(",")}) LIMIT 5001`,ids):[];
  return {perfs,relays,statuses,visibility};
}
function stateProof(competition,pointer,state){
  return {competition,importId:pointer.currentImportId||null,lastDeletionId:pointer.lastDeletionId||null,resultsDeleted:pointer.resultsDeleted===true,
    perfs:entries(state.perfs,COLUMNS),relays:entries(state.relays,RELAY_COLUMNS),statuses:state.statuses.map(row=>[Number(row.row_number),hash(parse(row.expected_row))]).sort((a,b)=>a[0]-b[0]),visibility:entries(state.visibility,VISIBILITY,"performance_id")};
}
function createNativeResultDeletion({getPool,authorize}){
  return async request=>{
    const actor=await authorize(request);
    if(!actor?.uid||actor.national!==true)throw new TypeError("Suppression des résultats réservée à l’administration nationale.");
    const input=request.data||{},competitionId=positiveId(Number(input.competitionId)),importId=input.importId;
    if(!/^[a-f0-9]{64}$/.test(importId||"")||!["preview","delete"].includes(input.action))throw new TypeError("Action de suppression invalide.");
    if(input.action==="delete"&&(input.confirmDeletion!==true||!/^[a-f0-9]{64}$/.test(input.expectedFingerprint||"")||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.operationId||"")))throw new TypeError("Confirmation explicite et aperçu actuel requis.");
    const id=input.deletionId||hash(["nap-results-delete",actor.uid,input.operationId]);
    if(!/^[a-f0-9]{64}$/.test(id))throw new TypeError("Identifiant de suppression invalide.");
    const pool=await getPool(),conn=await pool.getConnection();let named=false,locked=false;
    const q=async(sql,values=[])=>(await conn.execute({sql,timeout:10000},values))[0];
    const readPointer=async()=>parse((await q("SELECT metadata FROM livepalmes_performance_imports WHERE id=? AND source_type='pointer' LIMIT 1",[pointerId(competitionId)]))[0]?.metadata)||{};
    const receipt=async key=>(await q("SELECT competition_id,source_type,status,metadata FROM livepalmes_performance_imports WHERE id=? LIMIT 1",[key]))[0];
    const writePointer=async pointer=>{
      const result=await q("UPDATE livepalmes_performance_imports SET metadata=?,status=?,updated_at=UTC_TIMESTAMP(6) WHERE id=? AND source_type='pointer' LIMIT 1",[JSON.stringify(pointer),pointer.activeDeletionId?"processing":pointer.resultsDeleted?"deleted":"current",pointerId(competitionId)]);
      if(result.affectedRows!==1)throw new Error("Pointeur de résultats non confirmé. Reprenez la même suppression.");
    };
    try{
      if(Number((await q("SELECT GET_LOCK(?,0) AS acquired",[`livepalmes_result_import_${competitionId}`]))[0]?.acquired)!==1)throw new TypeError("Une opération sur les résultats de cette compétition est déjà en cours.");named=true;
      if(input.action==="delete"){
        if((await q("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('perfs','perfs_relais') LIMIT 1")).length)throw new TypeError("Déclencheurs NAP à vérifier avant suppression.");
        await conn.query({sql:"LOCK TABLES perfs WRITE, perfs_relais WRITE, livepalmes_performance_imports WRITE, livepalmes_performance_import_rows READ, livepalmes_performance_visibility WRITE, competitions READ",timeout:10000});locked=true;
      }
      const competition=(await q("SELECT id,libelle,date,lieu FROM competitions WHERE id=? LIMIT 1",[competitionId]))[0];
      if(!competition)throw new TypeError("Compétition NAP introuvable.");
      let pointer=await readPointer();
      if(pointer.activeImportId)throw new TypeError("L’import interrompu doit être terminé avant la suppression.");
      if(input.action==="preview"&&pointer.activeDeletionId){
        const operation=await receipt(pointer.activeDeletionId),saved=parse(operation?.metadata);
        if(operation?.source_type!=="results-deletion"||!["prepared","completed"].includes(operation.status)||saved?.importId!==importId||Number(operation.competition_id)!==competitionId)throw new TypeError("Suppression en cours à vérifier.");
        return {ok:true,source:"nap",competition,summary:saved.summary,expectedFingerprint:saved.fingerprint,operationId:saved.operationId,deletionId:pointer.activeDeletionId,resume:true};
      }
      const previous=input.action==="delete"?await receipt(id):null;
      let saved=previous?parse(previous.metadata):null;
      if(previous&&(previous.source_type!=="results-deletion"||!["prepared","completed"].includes(previous.status)||Number(previous.competition_id)!==competitionId||saved?.importId!==importId||saved?.operationId!==input.operationId||saved?.fingerprint!==input.expectedFingerprint))throw new TypeError("La demande de suppression ne correspond plus au journal.");
      if(previous?.status==="completed"&&pointer.activeDeletionId!==id)return {ok:true,source:"nap",deleted:true,replayed:true,deletionId:id,summary:saved.summary};
      if(pointer.activeDeletionId&&pointer.activeDeletionId!==id)throw new TypeError("Une suppression interrompue doit être reprise avant une autre opération.");
      if(pointer.currentImportId!==importId)throw new TypeError("Cet import n’est plus la version courante. Actualisez l’historique.");
      const source=(await q("SELECT competition_id,source_type,status FROM livepalmes_performance_imports WHERE id=? LIMIT 1",[importId]))[0];
      if(Number(source?.competition_id)!==competitionId||!["completed","deleted"].includes(source?.status)||source.source_type==="results-deletion")throw new TypeError("Seul un import terminé de cette compétition permet cette suppression.");
      const state=await readState(q,competitionId,pointer,saved?.proof?.perfs.map(r=>r[0])),proof=stateProof(competition,pointer,state);
      if(input.action==="preview"){
        const summary=summarize(state.perfs,state.relays,state.statuses);
        if(!summary.performances&&!summary.relays&&!summary.statuses)throw new TypeError("Cette compétition n’a plus de résultats à supprimer.");
        return {ok:true,source:"nap",competition,summary,expectedFingerprint:hash(proof),resume:false};
      }
      if(!saved){
        if(hash(proof)!==input.expectedFingerprint)throw new TypeError("Les résultats ont changé depuis la confirmation. Actualisez puis confirmez à nouveau.");
        saved={version:1,operationId:input.operationId,importId,fingerprint:input.expectedFingerprint,proof,summary:summarize(state.perfs,state.relays,state.statuses)};
        if(!saved.summary.performances&&!saved.summary.relays&&!saved.summary.statuses)throw new TypeError("Aucun résultat à supprimer.");
        await q("INSERT INTO livepalmes_performance_imports (id,competition_id,file_hash,file_name,source_type,status,row_count,metadata,created_at,created_by,updated_at) VALUES (?,?,?,'','results-deletion','prepared',0,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6))",[id,competitionId,input.expectedFingerprint,JSON.stringify(saved),actor.uid]);
      }
      if(saved.version!==1||hash(saved.proof)!==saved.fingerprint||hash(saved.proof.competition)!==hash(competition)||saved.proof.importId!==pointer.currentImportId||saved.proof.lastDeletionId!==(pointer.lastDeletionId||null)||saved.proof.resultsDeleted!==(pointer.resultsDeleted===true))throw new TypeError("L’état de la compétition a changé depuis cette suppression.");
      checkRemaining(state.perfs,saved.proof.perfs,COLUMNS);checkRemaining(state.relays,saved.proof.relays,RELAY_COLUMNS);checkRemaining(state.visibility,saved.proof.visibility,VISIBILITY,"performance_id");
      if(hash(proof.statuses)!==hash(saved.proof.statuses))throw new TypeError("Les statuts de résultats ont changé pendant la suppression.");
      if(previous){
        for(const [table,initial,limit] of [["perfs",saved.proof.perfs,5001],["perfs_relais",saved.proof.relays,1001]]){
          if(!initial.length)continue;
          const ids=initial.map(row=>row[0]);
          const claimed=await q(`SELECT id,compet FROM ${table} FORCE INDEX (PRIMARY) WHERE id IN (${ids.map(()=>"?").join(",")}) LIMIT ${limit}`,ids);
          if(claimed.some(row=>Number(row.compet)!==competitionId))throw new TypeError("Un identifiant de résultat appartient désormais à une autre compétition. Vérification nationale requise avant reprise.");
        }
      }
      pointer={...pointer,activeDeletionId:id,deletionSummary:saved.summary};await writePointer(pointer);
      for(const [table,key,rows] of [["perfs","id",state.perfs],["perfs_relais","id",state.relays],["livepalmes_performance_visibility","performance_id",state.visibility]]){
        for(const chunk of chunks(rows))await q(`DELETE FROM ${table} WHERE ${table==="livepalmes_performance_visibility"?"":"compet=? AND "}${key} IN (${chunk.map(()=>"?").join(",")})`,[...(table==="livepalmes_performance_visibility"?[]:[competitionId]),...chunk.map(r=>r[key])]);
      }
      const verified=await readState(q,competitionId,pointer,saved.proof.perfs.map(r=>r[0]));
      if(verified.perfs.length||verified.relays.length)throw new Error("Suppression interrompue : reprenez la même opération pour terminer la vérification.");
      if(saved.proof.visibility.length){
        const remaining=await q(`SELECT performance_id FROM livepalmes_performance_visibility FORCE INDEX (PRIMARY) WHERE performance_id IN (${saved.proof.visibility.map(()=>"?").join(",")}) LIMIT 5001`,saved.proof.visibility.map(r=>r[0]));
        if(remaining.length)throw new Error("Suppression des masquages interrompue : reprenez la même opération.");
      }
      await invalidateImportReview(q,importId,{reason:"deleted",operationId:id});
      await q("UPDATE livepalmes_performance_imports SET status='deleted',updated_at=UTC_TIMESTAMP(6) WHERE id=? LIMIT 1",[importId]);
      await q("UPDATE livepalmes_performance_imports SET status='completed',updated_at=UTC_TIMESTAMP(6) WHERE id=? LIMIT 1",[id]);
      const final={...pointer,resultsDeleted:true,lastDeletionId:id};delete final.activeDeletionId;delete final.deletionSummary;
      await writePointer(final);
      return {ok:true,source:"nap",deleted:true,replayed:Boolean(previous),deletionId:id,summary:saved.summary};
    }finally{
      try{if(locked)await conn.query({sql:"UNLOCK TABLES",timeout:10000});}finally{try{if(named)await q("SELECT RELEASE_LOCK(?)",[`livepalmes_result_import_${competitionId}`]);}finally{conn.release();}}
    }
  };
}
module.exports={LIMITS,entries,checkRemaining,summarize,readState,stateProof,createNativeResultDeletion};
