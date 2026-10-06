"use strict";
// One native course only. Entries, restrictions and detailed programs are never
// reconciled or deleted. Budget: native dossier + 5 bounded reads, one DELETE;
// the caller returns a fresh native dossier after completion.
const native=require("./nap-portal-competitions");
const {positiveId}=require("./nap-direct-calendar");
const {fingerprint}=require("./nap-portal-workspaces");
const {operationHash,authorityGuard}=require("./nap-portal-competition-change");
const {isDeepStrictEqual}=require("node:util");
const COLUMNS=["id","compet","pos","id_course","opencourse","cost","limitnageur"];
const ENTRY_CHECKS=[
  "SELECT id FROM nageursengager FORCE INDEX (livepalmes_compet_nageur_id) WHERE compet=? LIMIT 1",
  "SELECT id FROM engagements_relais FORCE INDEX (livepalmes_compet_club_id) WHERE compet=? LIMIT 1"
];
function buildRemovalStatement(row,authority,national) {
  const scope=authorityGuard("compet_courses",authority);
  const entries=national ? "" : " AND NOT EXISTS (SELECT 1 FROM nageursengager FORCE INDEX (livepalmes_compet_nageur_id) WHERE compet=? LIMIT 1) AND NOT EXISTS (SELECT 1 FROM engagements_relais FORCE INDEX (livepalmes_compet_club_id) WHERE compet=? LIMIT 1)";
  return {sql:`DELETE FROM compet_courses WHERE id=? AND ${COLUMNS.slice(1).map(column=>`BINARY \`${column}\` <=> BINARY ?`).join(" AND ")} AND ${scope.sql}${entries} LIMIT 1`,values:[row.id,...COLUMNS.slice(1).map(column=>row[column]),...scope.values,...(national ? [] : [row.compet,row.compet])]};
}
async function removeNativeCourse(pool,input,audit,authorize) {
  if(typeof authorize!=="function" || !input.patch || Object.keys(input.patch).some(key=>!["removeNativeCourseId","confirmCourseRemoval"].includes(key)) || input.patch.confirmCourseRemoval!==true) throw new TypeError("Confirmation du retrait de la course requise.");
  const competitionId=positiveId(input.competitionId),courseId=positiveId(input.patch.removeNativeCourseId);
  const operation=operationHash(input),connection=await pool.getConnection();
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try {
    const pack=await native.readNativeCompetition(connection,competitionId,authorize);
    if(!pack) throw new TypeError("Competition introuvable.");
    const saved=await audit.read(operation);
    if(!saved && fingerprint(pack)!==input.expectedFingerprint) throw new TypeError("La competition a change. Rechargez la fiche.");
    const authority=pack.nativeSnapshot;
    const guards={competitions:authority.competition,compet_parametres:authority.parameters};
    const hasIndividual=(await query(ENTRY_CHECKS[0],[competitionId])).length>0;
    const hasRelay=(await query(ENTRY_CHECKS[1],[competitionId])).length>0;
    if((hasIndividual || hasRelay) && input.national!==true) throw new TypeError("Des engagements existent : seul un administrateur national peut retirer une course apres confirmation.");
    const triggers=await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='compet_courses' LIMIT 1");
    if(triggers.length) throw new TypeError("Declencheur natif a verifier avant retrait.");
    const rows=await query(`SELECT ${COLUMNS.map(column=>`\`${column}\``).join(",")} FROM compet_courses WHERE id=? LIMIT 1`,[courseId]);
    if(saved) {
      if(saved.kind!=="native-course-removal" || saved.actorUid!==input.actorUid || saved.competitionId!==competitionId || saved.courseId!==courseId || saved.operation!==operation || saved.expectedFingerprint!==input.expectedFingerprint || !isDeepStrictEqual(saved.authority,guards) || COLUMNS.some(column=>!Object.hasOwn(saved.before || {},column)) || Number(saved.before.compet)!==competitionId || Number(saved.before.id)!==courseId) throw new TypeError("Sauvegarde de retrait incompatible.");
      if(rows.length && !isDeepStrictEqual(rows[0],saved.before)) throw new TypeError("La course a change. Rechargez la fiche.");
    } else {
      if(rows.length!==1 || Number(rows[0].compet)!==competitionId || !pack.courses.some(row=>Number(row.id)===courseId)) throw new TypeError("Course absente de cette competition.");
      await audit.prepare(operation,{kind:"native-course-removal",actorUid:input.actorUid,competitionId,courseId,operation,expectedFingerprint:input.expectedFingerprint,authority:guards,before:rows[0],existingEntries:hasIndividual || hasRelay});
    }
    if(rows.length) {
      const statement=buildRemovalStatement(rows[0],guards,input.national===true);
      const result=await query(statement.sql,statement.values);
      if(result.affectedRows!==1) throw new TypeError("La competition ou ses engagements ont change. Rechargez la fiche avant de reprendre.");
      const remaining=await query("SELECT id FROM compet_courses WHERE id=? LIMIT 1",[courseId]);
      if(remaining.length) throw new Error("Retrait a verifier : sauvegarde conservee.");
    }
    await audit.complete(operation,{kind:"native-course-removal",competitionId,courseId,operation,actorUid:input.actorUid,verified:true,resumed:Boolean(saved),entriesPreserved:true});
    return {ok:true,source:"nap",operation,entriesPreserved:true};
  } finally {connection.release();}
}
module.exports={removeNativeCourse,buildRemovalStatement,ENTRY_CHECKS};
