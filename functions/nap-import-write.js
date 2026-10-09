"use strict";
// Native MyISAM import: immutable before/after journal before every sporting
// mutation, bounded bulk statements and verified recovery, no fake rollback.
const {COLUMNS,positiveId}=require("./nap-performance-change-plan");
const {previewNativeImport,hash}=require("./nap-import-preview");
const {RELAY_COLUMNS,prepareImportOperation,pendingTableChanges,tableFingerprint}=require("./nap-import-operation-plan");
const parse=value=>typeof value==="string"?JSON.parse(value):value;
const batches=items=>Array.from({length:Math.ceil(items.length/200)},(_,i)=>items.slice(i*200,(i+1)*200));
const normalized=(rows,columns)=>rows.map(r=>columns.map(c=>r[c]===null?null:String(r[c]))).sort((a,b)=>Number(a[0])-Number(b[0]));
const sameContext=(a,b,columns)=>hash(normalized(a,columns))===hash(normalized(b,columns));
function createNativeImportWriter({getPool,authorize,preview=previewNativeImport}) {
  return async function write(request) {
    const actor=await authorize(request);let input=request.data||{},resumeReceipt=null,resumePool=null;
    if(!actor?.uid||actor.uid.length>128)throw new TypeError("Auteur autorise requis.");
    if(input.resumeImportId!==undefined) {
      if(typeof input.resumeImportId!=="string"||!/^\w{64}$/.test(input.resumeImportId))throw new TypeError("Import a reprendre invalide.");
      resumePool=await getPool();
      const [receipts]=await resumePool.execute({sql:"SELECT competition_id,created_by,status,metadata FROM livepalmes_performance_imports WHERE id=? LIMIT 1",timeout:10000},[input.resumeImportId]);
      resumeReceipt=receipts[0];
      if(!resumeReceipt||resumeReceipt.created_by!==actor.uid)throw new TypeError("Seul l'auteur autorise peut reprendre cet import.");
      const saved=parse(resumeReceipt.metadata);
      input={resumeImportId:input.resumeImportId,competitionId:Number(resumeReceipt.competition_id),fileName:saved.fileName,operationId:saved.operationId,rawText:"",expectedFingerprint:saved.plan.expectedFingerprint,previewFingerprint:saved.plan.previewFingerprint};
    }
    const competitionId=positiveId(Number(input.competitionId));
    if(typeof input.operationId!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.operationId))throw new TypeError("Identifiant d'operation requis.");
    if(typeof input.fileName!=="string"||!input.fileName.trim()||input.fileName.length>255)throw new TypeError("Nom du fichier requis.");
    const immutable={rawText:input.rawText,competitionId,fileName:input.fileName,expectedFingerprint:input.expectedFingerprint,previewFingerprint:input.previewFingerprint,confirmReplacement:input.confirmReplacement===true,
      excludedSourceLines:input.excludedSourceLines||[],swimmerBindings:input.swimmerBindings||[],memberBindings:input.memberBindings||[],clubBindings:input.clubBindings||[]};
    if(typeof immutable.rawText!=="string"||Buffer.byteLength(immutable.rawText,"utf8")>5*1024*1024)throw new TypeError("Fichier hors limite.");
    const requestHash=resumeReceipt?parse(resumeReceipt.metadata).requestHash:hash(immutable),id=hash([actor.uid,input.operationId]),pointerId=hash(["nap-results-current",competitionId]);
    if(input.resumeImportId&&input.resumeImportId!==id)throw new TypeError("Reprise d'import incoherente.");
    const pool=resumePool||await getPool();
    const [receipts]=await pool.execute({sql:"SELECT competition_id,created_by,status,metadata FROM livepalmes_performance_imports WHERE id=? LIMIT 1",timeout:10000},[id]);
    // Do not hold a pool connection while the preview borrows one: two concurrent
    // requests would otherwise exhaust the existing two-connection NAP pool.
    const preparedPreview=receipts.length?null:await preview(pool,immutable);
    const conn=await pool.getConnection();let named=false,locked=false;
    const q=async(sql,values=[])=>(await conn.execute({sql,timeout:10000},values))[0];
    const journal=async()=>q("SELECT competition_id,created_by,status,metadata FROM livepalmes_performance_imports WHERE id=? LIMIT 1",[id]);
    const pointer=async()=>parse((await q("SELECT metadata FROM livepalmes_performance_imports WHERE id=? LIMIT 1",[pointerId]))[0]?.metadata)||{};
    const native=async(table,columns,limit)=>q(`SELECT ${columns.map(c=>`\`${c}\``).join(",")} FROM ${table} FORCE INDEX (livepalmes_compet_id) WHERE compet=? ORDER BY id LIMIT ${limit+1}`,[competitionId]);
    const writePointer=async(metadata,status)=>q("INSERT INTO livepalmes_performance_imports (id,competition_id,file_hash,file_name,source_type,status,row_count,metadata,created_at,created_by,updated_at) VALUES (?,?,?,'','pointer',?,0,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE status=VALUES(status),metadata=VALUES(metadata),updated_at=UTC_TIMESTAMP(6)",[pointerId,competitionId,hash(pointerId),status,JSON.stringify(metadata),actor.uid]);
    try {
      if(Number((await q("SELECT GET_LOCK(?,0) AS acquired",[`livepalmes_result_import_${competitionId}`]))[0]?.acquired)!==1)throw new TypeError("Un import est deja en cours pour cette competition.");named=true;
      const initial=(await journal())[0];let saved=initial?parse(initial.metadata):null,pack;
      if(initial&&(initial.created_by!==actor.uid||Number(initial.competition_id)!==competitionId||saved?.requestHash!==requestHash))throw new TypeError("Identifiant d'operation deja utilise avec un autre contenu.");
      if(!saved)pack=preparedPreview;
      if((await q("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('perfs','perfs_relais') LIMIT 1")).length)throw new TypeError("Declencheurs NAP a verifier avant import.");
      await conn.query({sql:"LOCK TABLES perfs WRITE, perfs_relais WRITE, livepalmes_performance_imports WRITE, livepalmes_performance_import_rows WRITE, livepalmes_performance_visibility WRITE, competitions READ, nageurs READ, clubs READ",timeout:10000});locked=true;
      const currentPointer=await pointer();
      if(currentPointer.activeImportId&&currentPointer.activeImportId!==id)throw new TypeError("Un import interrompu doit etre repris avant un autre fichier.");
      // A completed old receipt must never roll back a newer import.
      if(initial&&["completed","replaced"].includes(initial.status)&&currentPointer.currentImportId&&currentPointer.currentImportId!==id&&!currentPointer.activeImportId)return {ok:true,source:"nap",importId:id,replayed:true,historical:true,summary:saved.plan.summary};
      if(!saved) {
        if(!pack?.canConfirm)throw new TypeError("Resoudre toutes les lignes avant import.");
        const existing=await native("perfs",COLUMNS,5000),existingRelays=await native("perfs_relais",RELAY_COLUMNS,1000);
        const competition=(await q("SELECT id,libelle,date,lieu,bassin,chrono FROM competitions WHERE id=? LIMIT 1",[competitionId]))[0];
        if(hash({competition,existing,existingRelays})!==pack.expectedFingerprint)throw new TypeError("Les resultats ont change depuis l'aperçu.");
        const allocation=await q("SELECT TABLE_NAME,ENGINE,AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('perfs','perfs_relais') ORDER BY TABLE_NAME LIMIT 2");
        if(allocation.length!==2||allocation.some(r=>r.ENGINE!=="MyISAM"))throw new TypeError("Allocation native a verifier.");
        const next=Object.fromEntries(allocation.map(r=>[r.TABLE_NAME,positiveId(Number(r.AUTO_INCREMENT))]));
        const plan=prepareImportOperation(pack,{perfs:next.perfs,relays:next.perfs_relais},immutable);
        const personIds=[...new Set([...pack.resolution.resolved.map(r=>r.swimmerId),...pack.incomingRelays.flatMap(i=>[i.row.nageur1,i.row.nageur2,i.row.nageur3,i.row.nageur4]),...pack.statusRows.flatMap(r=>r.members||[])].filter(Boolean))];
        const clubIds=[...new Set([...pack.incoming.map(i=>i.row.club),...pack.incomingRelays.map(i=>i.row.club),...pack.statusRows.map(r=>r.clubId)].filter(Boolean).map(String))];
        saved={requestHash,operationId:input.operationId,fileName:input.fileName,plan,competition,fileHash:pack.decoded.fileHash,people:pack.candidates.filter(r=>personIds.includes(r.id)),clubs:pack.clubs.filter(r=>clubIds.includes(String(r.num_club))),
          display:{metadata:{competitionName:competition.libelle,date:competition.date,location:competition.lieu,poolSize:String(competition.bassin),timingType:competition.chrono},summary:plan.summary},visibilityBefore:[]};
        const removed=plan.perfs.removals.map(r=>r.id);
        if(removed.length)saved.visibilityBefore=await q(`SELECT performance_id,hidden,version,updated_at,updated_by FROM livepalmes_performance_visibility WHERE performance_id IN (${removed.map(()=>"?").join(",")}) LIMIT 5001`,removed);
        // Full before images include the native relay table and deleted visibility.
        await q("INSERT INTO livepalmes_performance_imports (id,competition_id,file_hash,file_name,source_type,status,row_count,metadata,created_at,created_by,updated_at) VALUES (?,?,?,?,'ffessm-txt','prepared',?,?,UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6))",[id,competitionId,saved.fileHash,input.fileName,plan.perfs.after.length+plan.relays.after.length+plan.statusRows.length,JSON.stringify(saved),actor.uid]);
      }
      const ids=saved.people.map(r=>r.id),clubIds=saved.clubs.map(r=>r.num_club);
      const people=ids.length?await q(`SELECT id,nom,prenom,date,sexe,club FROM nageurs WHERE id IN (${ids.map(()=>"?").join(",")}) ORDER BY id LIMIT 10001`,ids):[];
      const clubs=clubIds.length?await q(`SELECT num_club,abre_club,nom_club FROM clubs WHERE num_club IN (${clubIds.map(()=>"?").join(",")}) ORDER BY num_club LIMIT 1001`,clubIds):[];
      if(!sameContext(people,saved.people,["id","nom","prenom","date","sexe","club"])||!sameContext(clubs,saved.clubs,["num_club","abre_club","nom_club"]))throw new TypeError("Une fiche ou un club a change. Verification de l'import requise.");
      const competition=(await q("SELECT id,libelle,date,lieu,bassin,chrono FROM competitions WHERE id=? LIMIT 1",[competitionId]))[0];
      if(hash(competition)!==hash(saved.competition))throw new TypeError("La competition a change pendant l'import.");
      const states=[];
      for(const [table,columns,plan,limit] of [["perfs",COLUMNS,saved.plan.perfs,5000],["perfs_relais",RELAY_COLUMNS,saved.plan.relays,1000]]) {
        const pending=pendingTableChanges(await native(table,columns,limit),plan,columns),allocated=plan.additions.map(i=>i.row.id);
        if(allocated.length) {
          const claimed=await q(`SELECT ${columns.map(c=>`\`${c}\``).join(",")} FROM ${table} WHERE id IN (${allocated.map(()=>"?").join(",")}) LIMIT ${allocated.length+1}`,allocated);
          const expected=new Map(plan.additions.map(i=>[i.row.id,i.row]));
          if(claimed.some(row=>!expected.has(row.id)||tableFingerprint([row],columns)!==tableFingerprint([expected.get(row.id)],columns)))throw new TypeError("Identifiant natif utilise depuis l'interruption. Verification requise.");
        }
        states.push({table,columns,plan,limit,pending});
      }
      const removedIds=saved.plan.perfs.removals.map(r=>r.id);
      if(removedIds.length) {
        const visibility=await q(`SELECT performance_id,hidden,version,updated_at,updated_by FROM livepalmes_performance_visibility WHERE performance_id IN (${removedIds.map(()=>"?").join(",")}) LIMIT 5001`,removedIds);
        if(visibility.some(row=>!saved.visibilityBefore.some(before=>hash(before)===hash(row))))throw new TypeError("Le masquage d'un resultat a change pendant l'import.");
      }
      await writePointer({...currentPointer,activeImportId:id},"processing");
      for(const {table,columns,plan,limit,pending} of states) {
        for(const chunk of batches(pending.removals))await q(`DELETE FROM ${table} WHERE id IN (${chunk.map(()=>"?").join(",")})`,chunk.map(r=>r.id));
        for(const chunk of batches(pending.additions))await q(`INSERT INTO ${table} (${columns.map(c=>`\`${c}\``).join(",")}) VALUES ${chunk.map(()=>`(${columns.map(()=>"?").join(",")})`).join(",")}`,chunk.flatMap(item=>columns.map(c=>item.row[c])));
        const verified=await native(table,columns,limit);
        if(tableFingerprint(verified,columns)!==tableFingerprint(plan.after,columns))throw new Error("Native import verification incomplete");
      }
      for(const chunk of batches(saved.plan.perfs.removals))await q(`DELETE FROM livepalmes_performance_visibility WHERE performance_id IN (${chunk.map(()=>"?").join(",")})`,chunk.map(r=>r.id));
      const records=[...saved.plan.perfs.after.map(row=>({table:"perfs",row})),...saved.plan.relays.after.map(row=>({table:"perfs_relais",row})),...saved.plan.statusRows.map(row=>({table:"status",row})),...saved.plan.excluded.map(row=>({table:"excluded",row}))];
      const stored=await q("SELECT row_number,expected_row FROM livepalmes_performance_import_rows WHERE import_id=? ORDER BY row_number LIMIT 15001",[id]);
      if(stored.length>15000||stored.some(r=>!records[Number(r.row_number)-1]||hash(parse(r.expected_row))!==hash(records[Number(r.row_number)-1])))throw new TypeError("Journal des lignes incoherent.");
      const present=new Set(stored.map(r=>Number(r.row_number)));
      for(const chunk of batches(records.map((record,index)=>({record,rowNumber:index+1})).filter(r=>!present.has(r.rowNumber))))await q(`INSERT INTO livepalmes_performance_import_rows (import_id,row_number,performance_id,status,expected_row) VALUES ${chunk.map(()=>"(?,?,NULL,?,?)").join(",")}`,chunk.flatMap(r=>[id,r.rowNumber,r.record.table,JSON.stringify(r.record)]));
      if(currentPointer.currentImportId&&currentPointer.currentImportId!==id)await q("UPDATE livepalmes_performance_imports SET status='replaced',updated_at=UTC_TIMESTAMP(6) WHERE id=? AND status='completed' LIMIT 1",[currentPointer.currentImportId]);
      await q("UPDATE livepalmes_performance_imports SET status='completed',updated_at=UTC_TIMESTAMP(6) WHERE id=? LIMIT 1",[id]);
      await writePointer({currentImportId:id},"current");
      return {ok:true,source:"nap",importId:id,replayed:Boolean(initial),summary:saved.plan.summary};
    }finally {
      try{if(locked)await conn.query({sql:"UNLOCK TABLES",timeout:10000});}finally{try{if(named)await q("SELECT RELEASE_LOCK(?)",[`livepalmes_result_import_${competitionId}`]);}finally{conn.release();}}
    }
  };
}
module.exports={createNativeImportWriter,batches};
