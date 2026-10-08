"use strict";
// First declaration only. 28 bounded SQL calls including the existing 22 reads;
// one native INSERT. A lost generated id requires verification, never a retry.
const {createHash}=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const {positiveId}=require("./nap-direct-calendar");
const {fingerprint}=require("./nap-portal-workspaces");
const {authorityGuard,operationHash}=require("./nap-portal-competition-change");
const {readNativeCompetition}=require("./nap-portal-competitions");
const {readNativeClubEntry}=require("./nap-portal-entries");
const {COLUMNS,planLeaderChange}=require("./nap-team-leader-change");
function proposedLeader(pack,input) {
  if(pack.leaders.length) throw new TypeError("Un chef d'equipe est deja declare. Rechargez le dossier.");
  if(!input.patch?.birthDate) throw new TypeError("Date de naissance requise pour declarer le chef d'equipe.");
  const seed={id:0,compet:input.competitionId,nom:"",prenom:"",date:"0000-00-00",club:input.clubId,pourclub:""};
  const {id,...row}=planLeaderChange({...pack,leaders:[seed]},{...input,leaderId:0}).after;
  return row;
}
function insertion(row,authority,deadline) {
  const scope=authorityGuard("chefsdequipe",authority);
  return {sql:`INSERT INTO chefsdequipe (compet,nom,prenom,date,club,pourclub) SELECT ?,?,?,?,?,? FROM clubs WHERE num_club=? AND ${scope.sql} AND UTC_TIMESTAMP() < ? AND NOT EXISTS (SELECT 1 FROM chefsdequipe FORCE INDEX (livepalmes_compet_id) WHERE compet=? AND (club=? OR pourclub=?))`,values:[...COLUMNS.slice(1).map(key=>row[key]),row.club,...scope.values,deadline.replace("T"," ").replace("Z",""),row.compet,row.club,row.club]};
}
function indexed(rows) {
  return Array.isArray(rows) && rows.length && rows.every(row=>row.select_type==="INSERT" && row.table==="chefsdequipe" || String(row.table).startsWith("<") || ["const","system"].includes(row.type) || row.rows!=null && Number(row.rows)===0 || row.table==null && row.type==null && /^(?:Impossible WHERE(?: noticed after reading const tables)?|no matching row in const table|No tables used)$/i.test(String(row.Extra||"")) || row.type!=="ALL" && Boolean(row.key));
}
async function createNativeTeamLeader(pool,input,audit,authorize,readers={competition:readNativeCompetition,entry:readNativeClubEntry}) {
  if(typeof authorize!=="function" || !/^[a-f0-9]{64}$/.test(input?.expectedFingerprint||"") || typeof input?.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^\d{1,16}$/.test(String(input?.clubId)) || !Number.isSafeInteger(Number(input.clubId)) || Number(input.clubId)<=0) throw new TypeError("Dossier et utilisateur autorises requis.");
  input={...input,competitionId:positiveId(input.competitionId),clubId:String(input.clubId)};
  const operation=operationHash({...input,patch:{...input.patch,action:"first-team-leader",clubId:input.clubId}});
  const connection=await pool.getConnection();
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  const lock=`lp-entry-${createHash("sha256").update(JSON.stringify([input.competitionId,input.clubId])).digest("hex").slice(0,40)}`;
  let locked=false,safe=true;
  try {
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Dossier en cours d'enregistrement. Reessayez.");
    locked=true;
    const competition=await readers.competition(connection,input.competitionId,authorize);
    if(!competition || competition.event.entryStatus!=="open" || !Number.isFinite(Date.parse(competition.event.entryDeadlineAt)) || Date.now()>=Date.parse(competition.event.entryDeadlineAt)) throw new TypeError("Les engagements sont fermes.");
    const pack=await readers.entry(connection,input,({clubId})=>{if(String(clubId)!==input.clubId) throw new TypeError("Dossier hors du club autorise.");});
    const authority={competitions:competition.nativeSnapshot.competition,compet_parametres:competition.nativeSnapshot.parameters};
    let target=await audit.read(operation);
    const saved=Boolean(target);
    if(target) {
      if(target.kind!=="native-team-leader-create" || target.operation!==operation || target.actorUid!==input.actorUid || target.clubId!==input.clubId || target.competitionId!==input.competitionId || target.expectedFingerprint!==input.expectedFingerprint || !isDeepStrictEqual(target.patch,input.patch) || !isDeepStrictEqual(target.authority,authority) || !["prepared","writing","identified"].includes(target.phase)) throw new TypeError("Sauvegarde du chef d'equipe incompatible.");
      if(target.phase==="writing") throw new TypeError("Declaration NAP a verifier avant toute nouvelle tentative : identifiant non confirme, sauvegarde conservee.");
      if(!isDeepStrictEqual(target.proposed,proposedLeader({...pack,leaders:[]},input))) throw new TypeError("Identite sauvegardee incompatible.");
    } else {
      if(fingerprint(pack)!==input.expectedFingerprint) throw new TypeError("Le dossier NAP a change. Rechargez avant d'enregistrer.");
      target={kind:"native-team-leader-create",operation,actorUid:input.actorUid,clubId:input.clubId,competitionId:input.competitionId,expectedFingerprint:input.expectedFingerprint,patch:input.patch,authority,proposed:proposedLeader(pack,input),phase:"prepared"};
    }
    if(target.phase!=="identified") {
      if(fingerprint(pack)!==input.expectedFingerprint || pack.leaders.length) throw new TypeError("Le dossier a change. Rechargez avant de declarer un chef d'equipe.");
      if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='chefsdequipe' LIMIT 1")).length) throw new TypeError("Declencheur natif a verifier avant declaration.");
      const statement=insertion(target.proposed,authority,competition.event.entryDeadlineAt);
      if(!indexed(await query(`EXPLAIN ${statement.sql}`,statement.values))) throw new TypeError("Plan de recherche NAP a verifier avant declaration.");
      if(!saved) await audit.prepare(operation,target);
      target={...target,phase:"writing"};
      await audit.checkpoint(operation,target);
      const result=await query(statement.sql,statement.values);
      if(result.affectedRows===0) {
        await audit.checkpoint(operation,{...target,phase:"prepared"});
        throw new TypeError("Le dossier ou sa fermeture a change : aucun chef d'equipe ajoute.");
      }
      if(result.affectedRows!==1 || !Number.isSafeInteger(Number(result.insertId)) || Number(result.insertId)<=0 || Number(result.insertId)>2147483647) throw new Error("Identifiant de declaration non confirme.");
      target={...target,phase:"identified",leaderId:Number(result.insertId)};
      await audit.checkpoint(operation,target);
    }
    positiveId(target.leaderId);
    const verified=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM chefsdequipe FORCE INDEX (livepalmes_compet_id) WHERE compet=? AND (club=? OR pourclub=?) ORDER BY id LIMIT 2`,[input.competitionId,input.clubId,input.clubId]);
    // mysql2 returns native numeric ids/compet and string club fields.
    if(verified.length!==1 || !isDeepStrictEqual(verified[0],{id:target.leaderId,...target.proposed}) || pack.leaders.some(row=>Number(row.id)!==target.leaderId)) throw new TypeError("Declaration creee a verifier : sauvegarde conservee.");
    await audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,leaderId:target.leaderId,verified:true,entriesPreserved:true});
    return {ok:true,source:"nap",operation};
  } finally {
    try {if(locked && Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1) safe=false;}catch {safe=false;}
    if(safe) connection.release();else connection.destroy();
  }
}
module.exports={proposedLeader,insertion,indexed,createNativeTeamLeader};
