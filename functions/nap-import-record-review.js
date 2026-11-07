"use strict";
const lifecycle=require("./nap-import-lifecycle");
const records=require("./nap-records-store");
const detection=require("./nap-import-record-detection");
const {canonical}=require("./nap-import-operation-plan");
const {COLUMNS}=require("./nap-performance-change-plan");
const parse=lifecycle.parse;
const sql=async(connection,text,values=[])=>(await connection.execute({sql:text,timeout:10000},values))[0];
const validId=value=>typeof value==="string"&&/^[a-f0-9]{64}$/.test(value);
const journalSql="SELECT competition_id,status,metadata FROM livepalmes_performance_imports WHERE id=? LIMIT 1";
const reviewSql="SELECT competition_id,JSON_EXTRACT(metadata,'$.sourceContractVersion') AS source_version,JSON_EXTRACT(metadata,'$.recordReview') AS record_review FROM livepalmes_performance_imports WHERE id=? LIMIT 1";
function enabled(saved){return saved?.sourceContractVersion===1&&saved.recordReview?.detectionVersion===1;}
function checkReview(review){if(review.version!==1||!Array.isArray(review.candidates)||review.candidates.length>10000||Buffer.byteLength(JSON.stringify(review))>2*1024*1024)throw new RangeError("Journal des candidatures trop volumineux ou incompatible.");return review;}
async function writeReview(q,importId,review){
  checkReview(review);
  const serialized=JSON.stringify(review);
  const changed=await q("UPDATE livepalmes_performance_imports SET metadata=JSON_SET(metadata,'$.recordReview',CAST(? AS JSON)),updated_at=UTC_TIMESTAMP(6) WHERE id=? AND OCTET_LENGTH(JSON_SET(metadata,'$.recordReview',CAST(? AS JSON)))<=14680064 LIMIT 1",[serialized,importId,serialized]);
  if(changed.affectedRows!==1)throw new TypeError("Journal des candidatures non enregistré.");
}
async function current(q,importId,{lock=false}={}){
  const row=(await q(journalSql+(lock?" FOR UPDATE":""),[importId]))[0],saved=parse(row?.metadata);
  if(!row||!enabled(saved))throw new TypeError("Cet ancien import ne relève pas de la détection Records/MPF.");
  const pointer=parse((await q("SELECT metadata FROM livepalmes_performance_imports WHERE id=? LIMIT 1",[lifecycle.pointerId(Number(row.competition_id))]))[0]?.metadata)||{};
  if(row.status!=="completed"||pointer.currentImportId!==importId||pointer.activeImportId||pointer.activeDeletionId||pointer.resultsDeleted||saved.recordReview.state!=="current")throw new TypeError("La source de cet import n’est plus courante ou une opération est interrompue.");
  checkReview(saved.recordReview);
  return saved;
}
// One guard connection + one transaction connection; GET_LOCK(0) prevents pool
// starvation (the native pool has two connections). MyISAM sources are held READ
// while InnoDB record versions and review markers commit together.
async function guarded(pool,importId,run){
  if(!validId(importId))throw new TypeError("Import invalide.");
  const initial=(await sql(pool,reviewSql,[importId]))[0];
  if(!initial||!enabled({sourceContractVersion:Number(initial.source_version),recordReview:parse(initial.record_review)}))throw new TypeError("Cet ancien import ne relève pas de la détection Records/MPF.");
  const competitionId=Number(initial.competition_id),guard=await pool.getConnection();let globalLocked=false,competitionLocked=false,tables=false,work=null;
  const q=(text,values)=>sql(guard,text,values);
  try{
    if(Number((await q("SELECT GET_LOCK('livepalmes_records_import_review',0) AS acquired"))[0]?.acquired)!==1)throw new TypeError("Une revue Records/MPF est déjà en cours. Réessayez.");globalLocked=true;
    if(Number((await q("SELECT GET_LOCK(?,0) AS acquired",[`livepalmes_result_import_${competitionId}`]))[0]?.acquired)!==1)throw new TypeError("Les résultats de cette compétition sont en cours de modification.");competitionLocked=true;
    // Reserve both connections before taking native table locks: an unrelated
    // writer must not occupy the second slot waiting on our READ lock.
    work=await pool.getConnection();
    const lease={execute:work.execute.bind(work),beginTransaction:work.beginTransaction.bind(work),commit:work.commit.bind(work),rollback:work.rollback.bind(work),release:()=>{}};
    await guard.query({sql:"LOCK TABLES perfs READ, livepalmes_performance_visibility READ, competitions READ, nageurs READ",timeout:10000});tables=true;
    return await run(q,competitionId,lease);
  }finally{
    try{if(tables)await guard.query({sql:"UNLOCK TABLES",timeout:10000});}
    finally{try{if(competitionLocked)await q("SELECT RELEASE_LOCK(?)",[`livepalmes_result_import_${competitionId}`]);}finally{try{if(globalLocked)await q("SELECT RELEASE_LOCK('livepalmes_records_import_review')");}finally{if(work)work.release();guard.release();}}}
  }
}
async function verifySources(q,saved,sources){
  const ids=[...new Set(sources.map(source=>Number(source.performanceId)))];
  if(ids.length>5000||!ids.length)throw new TypeError("Lot de sources invalide.");
  const rows=await q(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM perfs FORCE INDEX (PRIMARY) WHERE id IN (${ids.map(()=>"?").join(",")}) LIMIT 5001`,ids);
  const hidden=await q(`SELECT performance_id,hidden FROM livepalmes_performance_visibility FORCE INDEX (PRIMARY) WHERE performance_id IN (${ids.map(()=>"?").join(",")}) LIMIT 5001`,ids);
  const competition=(await q("SELECT id,libelle,date,lieu,bassin,chrono FROM competitions WHERE id=? LIMIT 1",[saved.competition.id]))[0];
  if(lifecycle.hash(competition)!==lifecycle.hash(saved.competition))throw new TypeError("La compétition a changé depuis l’import.");
  const actual=new Map(rows.map(row=>[Number(row.id),row])),invisible=new Set(hidden.filter(row=>Number(row.hidden)===1).map(row=>Number(row.performance_id)));
  for(const source of sources){const row=actual.get(Number(source.performanceId));if(!row||Number(row.compet)!==Number(saved.competition.id)||invisible.has(Number(row.id))||require("./nap-import-preview").hash(canonical(row,COLUMNS))!==source.fingerprint)throw new TypeError("Une performance source a changé, a été masquée ou supprimée. Réexamen nécessaire.");}
  const peopleIds=[...new Set(rows.map(row=>Number(row.nageur)))];
  const people=await q(`SELECT id,nom,prenom,date,sexe,club FROM nageurs FORCE INDEX (PRIMARY) WHERE id IN (${peopleIds.map(()=>"?").join(",")}) LIMIT 5001`,peopleIds),expected=new Map(saved.people.map(row=>[Number(row.id),row]));
  for(const person of people)if(!expected.has(Number(person.id))||["nom","prenom","date","sexe"].some(key=>String(person[key]||"")!==String(expected.get(Number(person.id))[key]||"")))throw new TypeError("L’identité source a changé depuis l’import.");
  if(people.length!==peopleIds.length)throw new TypeError("Une identité source a disparu.");
}
function page(review,input){
  const offset=input.offset??0;if(!Number.isSafeInteger(offset)||offset<0||offset>10000)throw new TypeError("Page de candidatures invalide.");
  return {ok:true,source:"nap",review:{...review,candidates:review.candidates.slice(offset,offset+50)},total:review.candidates.length,offset,hasMore:offset+50<review.candidates.length};
}
async function action(pool,input,actor){
  if(!validId(input?.importId)||!["read","detect","decision","draft"].includes(input.action))throw new TypeError("Action de revue invalide.");
  if(input.action==="read"){
    const row=(await sql(pool,reviewSql,[input.importId]))[0],saved={sourceContractVersion:Number(row?.source_version),recordReview:parse(row?.record_review)};
    if(!enabled(saved))return {ok:true,source:"nap",eligible:false};
    return {...page(checkReview(saved.recordReview),input),eligible:true};
  }
  return guarded(pool,input.importId,async(sourceQuery,competitionId,connection)=>{
    let transaction=false;
    const q=(text,values)=>sql(connection,text,values);
    try{
      await connection.beginTransaction();transaction=true;
      const saved=await current(q,input.importId,{lock:true}),official=await records.read(connection,{administration:true});let review=saved.recordReview;
      if(input.action==="detect"){
        if(saved.plan.perfs.sources.length)await verifySources(sourceQuery,saved,saved.plan.perfs.sources);
        const prior=new Map(review.candidates.map(candidate=>[candidate.id,candidate])),found=detection.detect(input.importId,saved,official);
        const candidates=found.map(candidate=>{
          const old=prior.get(candidate.id);
          return old&&old.source.fingerprint===candidate.source.fingerprint&&old.referenceFingerprint===candidate.referenceFingerprint?{...candidate,state:old.state,...(old.decision?{decision:old.decision}:{})}:candidate;
        }).filter(candidate=>prior.get(candidate.id)?.state!=="published");
        for(const old of review.candidates)if(old.state==="published")candidates.push(old);
        review={...review,status:"ready",referenceRevision:official.revision,detectedAt:new Date().toISOString(),candidates};
        await writeReview(q,input.importId,review);
      }else{
        if(!validId(input.candidateId))throw new TypeError("Candidature invalide.");
        const candidate=review.candidates.find(candidate=>candidate.id===input.candidateId);
        if(!candidate||!["pending","accepted","rejected"].includes(candidate.state))throw new TypeError("Cette candidature n’est plus modifiable.");
        await verifySources(sourceQuery,saved,[candidate.source]);
        const fresh=detection.detect(input.importId,saved,official).find(item=>item.id===candidate.id);
        if(!fresh||fresh.referenceFingerprint!==candidate.referenceFingerprint||candidate.referenceRevision!==official.revision)throw new TypeError("Les Records/MPF ont changé. Actualisez la détection puis contrôlez la candidature.");
        if(input.action==="decision"){
          if(!["pending","accepted","rejected"].includes(input.state))throw new TypeError("Décision invalide.");
          candidate.state=input.state;candidate.decision={uid:actor.uid,email:actor.email||"",at:new Date().toISOString()};
          await writeReview(q,input.importId,review);
        }else{
          if(candidate.state!=="accepted")throw new TypeError("Contrôlez la candidature avant de préparer son brouillon.");
          await connection.commit();transaction=false;
          return {ok:true,source:"nap",draft:{...candidate,sourceKey:candidate.id,importId:input.importId,scope:candidate.type,category:candidate.targetCategory,kind:"individual",alertStatus:candidate.status,
            importCandidate:{importId:input.importId,candidateId:candidate.id,referenceRevision:official.revision}}};
        }
      }
      await connection.commit();transaction=false;return page(review,input);
    }finally{try{if(transaction)await connection.rollback();}finally{connection.release();}}
  });
}
module.exports={action,guarded,current,verifySources,writeReview,checkReview,enabled,page,sql,journalSql};
