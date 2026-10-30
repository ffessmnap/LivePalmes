"use strict";
// Bounded group removal for one open-water competition. Never delete entries,
// restrictions or library references. Audit before MyISAM writes; exact replay.
// Budget: one existing dossier, 2 entry existence checks, triggers, EXPLAIN,
// two locked course reads (<=300), authority, one grouped DELETE, verification.
const {isDeepStrictEqual}=require('node:util');
const native=require('./nap-portal-competitions');
const {fingerprint}=require('./nap-portal-workspaces');
const {positiveId}=require('./nap-direct-calendar');
const {operationHash,authorityGuard}=require('./nap-portal-competition-change');
const {ENTRY_CHECKS}=require('./nap-course-removal');
const READ='SELECT id,compet,pos,id_course,opencourse,cost,limitnageur FROM compet_courses WHERE compet=? ORDER BY pos,id LIMIT 301';
async function removeNativeCourses(pool,input,audit,authorize){
  const ids=input.patch?.removeNativeCourseIds;
  if(typeof authorize!=='function'||Object.keys(input.patch||{}).some(k=>!['removeNativeCourseIds','confirmCourseRemoval'].includes(k))||input.patch.confirmCourseRemoval!==true||!Array.isArray(ids)||!ids.length||ids.length>300||new Set(ids).size!==ids.length||ids.some(id=>!Number.isSafeInteger(id)||id<=0))throw new TypeError('Selection et confirmation des retraits requises.');
  const id=positiveId(input.competitionId),operation=operationHash(input),connection=await pool.getConnection();let locked=false;
  const query=async(sql,values=[])=>(await (/^(LOCK TABLES|UNLOCK TABLES)/.test(sql)?connection.query({sql,timeout:10000}):connection.execute({sql,timeout:10000},values)))[0];
  try{
    const pack=await native.readNativeCompetition(connection,id,authorize);
    if(!pack||!['openWater'].includes(pack.event.eventType||pack.event.competitionType))throw new TypeError('Competition eau libre requise.');
    let saved=await audit.read(operation);
    if(!saved&&fingerprint(pack)!==input.expectedFingerprint)throw new TypeError('La competition a change. Rechargez la fiche.');
    const authority={competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters};
    const explain=await query('EXPLAIN '+READ,[id]);
    if(!explain.length||explain.some(row=>row.table&&(!row.key||row.type==='ALL')))throw new TypeError('Index des courses a verifier.');
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='compet_courses' LIMIT 1")).length)throw new TypeError('Declencheur natif a verifier avant retrait.');
    await query('LOCK TABLES compet_courses WRITE, nageursengager READ, engagements_relais READ, competitions AS scope_c READ, compet_parametres AS scope_p READ');locked=true;
    const guard=authorityGuard('compet_courses',authority);
    if(!(await query(`SELECT 1 AS authorized FROM DUAL WHERE ${guard.sql}`,guard.values)).length)throw new TypeError('Le perimetre a change. Rechargez la fiche.');
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='compet_courses' LIMIT 1")).length)throw new TypeError('Declencheur natif a verifier avant retrait.');
    const hasIndividual=(await query(ENTRY_CHECKS[0],[id])).length>0,hasRelay=(await query(ENTRY_CHECKS[1],[id])).length>0;
    if((hasIndividual||hasRelay)&&input.national!==true)throw new TypeError('Des engagements existent : seul un administrateur national peut retirer une course apres confirmation.');
    const before=await query(READ,[id]);
    if(before.length>300)throw new RangeError('Trop de courses dans cette competition.');
    if(saved){
      if(saved.kind!=='native-open-water-course-removal'||saved.actorUid!==input.actorUid||saved.competitionId!==id||saved.operation!==operation||saved.expectedFingerprint!==input.expectedFingerprint||!isDeepStrictEqual(saved.ids,ids)||!isDeepStrictEqual(saved.authority,authority)||!Array.isArray(saved.before))throw new TypeError('Sauvegarde de retrait incompatible.');
      const remaining=saved.before.filter(row=>!ids.includes(Number(row.id)));
      if(!isDeepStrictEqual(before,saved.before)&&!isDeepStrictEqual(before,remaining))throw new TypeError('Les courses ont change. Rechargez la fiche.');
    }else{
      if(ids.some(key=>!before.some(row=>Number(row.id)===key)))throw new TypeError('Course absente de cette competition.');
      saved={kind:'native-open-water-course-removal',actorUid:input.actorUid,competitionId:id,operation,expectedFingerprint:input.expectedFingerprint,ids,authority,before};
      await audit.prepare(operation,saved);
    }
    const present=before.filter(row=>ids.includes(Number(row.id)));
    if(present.length){
      const result=await query(`DELETE FROM compet_courses WHERE compet=? AND id IN (${ids.map(()=>'?').join(',')}) AND ${guard.sql} LIMIT 300`,[id,...ids,...guard.values]);
      if(Number(result.affectedRows)!==present.length)throw new Error('Retrait a verifier : sauvegarde conservee.');
    }
    if(!isDeepStrictEqual(await query(READ,[id]),saved.before.filter(row=>!ids.includes(Number(row.id)))))throw new Error('Verification du retrait incomplete.');
    await query('UNLOCK TABLES');locked=false;
    await audit.complete(operation,{kind:saved.kind,competitionId:id,actorUid:input.actorUid,operation,removed:ids.length,entriesPreserved:true,verified:true});
    return {ok:true,source:'nap',operation,removed:ids.length,entriesPreserved:true};
  }finally{if(locked){try{await query('UNLOCK TABLES');}catch(error){connection.destroy();throw error;}}connection.release();}
}
module.exports={removeNativeCourses,READ};
