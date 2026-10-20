"use strict";
// First native club write: edit one existing declaration, never recreate a
// dossier or reconcile sporting entries. Budget: 14 competition + 8 dossier
// reads, trigger/PK checks, one guarded UPDATE and one verification read.
const {isDeepStrictEqual}=require("node:util");
const {nativeEqual}=require("./nap-native-compare");
const {positiveId,date}=require("./nap-direct-calendar");
const {fingerprint}=require("./nap-portal-workspaces");
const {operationHash,authorityGuard}=require("./nap-portal-competition-change");
const {readNativeCompetition}=require("./nap-portal-competitions");
const {readNativeClubEntry}=require("./nap-portal-entries");
const COLUMNS=["id","compet","nom","prenom","date","club","pourclub"];
function name(value) {
  if(typeof value!=="string" || !value.trim() || value.trim()==="-1" || value.length>100 || /[\u0000-\u001f]/.test(value)) throw new TypeError("Nom et prenom requis, 100 caracteres maximum.");
  return value.trim();
}
function planLeaderChange(pack,input) {
  const patch=input.patch;
  const waiver=patch?.mode==="renounced" && patch.renunciationAccepted===true && Object.keys(patch).length===2;
  if(!waiver && (!patch || Object.keys(patch).length!==3 || Object.keys(patch).some(key=>!["firstName","lastName","birthDate"].includes(key)))) throw new TypeError("Modification du nom, prenom et date uniquement.");
  if(pack.leaders.length!==1 || String(pack.leaders[0].id)!==String(input.leaderId)) throw new TypeError("Declaration de chef d'equipe a verifier avant modification.");
  const before={...pack.leaders[0]};
  if(COLUMNS.some(key=>!Object.hasOwn(before,key)) || String(before.compet)!==String(input.competitionId) || ![String(before.club),String(before.pourclub)].includes(String(input.clubId))) throw new TypeError("Declaration hors du dossier club.");
  if(waiver) {
    if(String(before.club)!==String(input.clubId) || !["", "0", String(input.clubId)].includes(String(before.pourclub))) throw new TypeError("Declaration pour un autre club a verifier avant renonciation.");
    return {before,after:{...before,nom:"-1",prenom:"-1",date:"0000-00-00",pourclub:String(input.clubId)}};
  }
  if(require("./nap-team-leader-state").isWaiver(before) && !patch.birthDate) throw new TypeError("Date de naissance requise pour declarer le chef d'equipe.");
  let birthDate=before.date;
  if(patch.birthDate!==date(before.date)) {
    if(typeof patch.birthDate!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(patch.birthDate) || !date(patch.birthDate) || new Date(`${patch.birthDate}T12:00:00Z`).toISOString().slice(0,10)!==patch.birthDate) throw new TypeError("Date de naissance invalide.");
    birthDate=patch.birthDate;
  }
  // IntraNAP recognises the declaration through the represented club. Never
  // take a declaration already representing another club away from it.
  if(String(before.club)===String(input.clubId) && !["", "0", String(input.clubId)].includes(String(before.pourclub))) throw new TypeError("Declaration pour un autre club a verifier avant modification.");
  const after={...before,nom:name(patch.lastName),prenom:name(patch.firstName),date:birthDate,pourclub:String(input.clubId)};
  const identity=row=>[String(row.nom).trim().toLocaleUpperCase("fr"),String(row.prenom).trim().toLocaleUpperCase("fr"),date(row.date)].join("|");
  const enrolled=new Set((pack.inscriptions || []).map(row=>String(row.nageur)));
  for(const row of pack.members || []) enrolled.add(String(row.nageur));
  if(date(after.date) && [...pack.swimmers.filter(row=>enrolled.has(String(row.id))).map(row=>({nom:row.lastName,prenom:row.firstName,date:row.birthDate})),...pack.officials].some(row=>identity(row)===identity(after))) throw new TypeError("Cette personne est deja nageur ou officiel sur ce dossier.");
  return {before,after};
}
function buildLeaderUpdate(plan,authority,deadline) {
  const scope=authorityGuard("chefsdequipe",authority);
  const changed=["nom","prenom","date","pourclub"].filter(key=>plan.before[key]!==plan.after[key]);
  if(!changed.length) throw new TypeError("Aucun champ a modifier.");
  return {sql:`UPDATE chefsdequipe SET ${changed.map(key=>`\`${key}\`=?`).join(",")} WHERE id=? AND ${COLUMNS.slice(1).map(key=>nativeEqual(`\`${key}\``)).join(" AND ")} AND ${scope.sql} AND UTC_TIMESTAMP() < ? LIMIT 1`,values:[...changed.map(key=>plan.after[key]),plan.before.id,...COLUMNS.slice(1).map(key=>plan.before[key]),...scope.values,deadline.replace("T"," ").replace("Z","")]};
}
async function editNativeTeamLeader(pool,input,audit,authorize) {
  if(typeof authorize!=="function" || !/^\d{1,16}$/.test(String(input.clubId))) throw new TypeError("Club autorise requis.");
  input={...input,competitionId:positiveId(input.competitionId),leaderId:positiveId(input.leaderId)};
  const operation=operationHash({...input,patch:{...input.patch,leaderId:input.leaderId,clubId:input.clubId}});
  const connection=await pool.getConnection();
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try {
    const competition=await readNativeCompetition(connection,input.competitionId,authorize);
    if(!competition || competition.event.entryStatus!=="open" || !competition.event.entryDeadlineAt || Date.now()>=Date.parse(competition.event.entryDeadlineAt)) throw new TypeError("Les engagements ne sont pas ouverts ou leur date limite est a verifier.");
    const pack=await readNativeClubEntry(connection,input,({clubId})=>{if(String(clubId)!==String(input.clubId)) throw new TypeError("Dossier hors du club autorise.");});
    if(pack.leaders.length!==1 || Number(pack.leaders[0].id)!==input.leaderId) throw new TypeError("Declaration de chef d'equipe a verifier avant modification.");
    const authority={competitions:competition.nativeSnapshot.competition,compet_parametres:competition.nativeSnapshot.parameters};
    const saved=await audit.read(operation);
    let plan;
    if(saved) {
      if(saved.kind!=="native-team-leader-edit" || saved.operation!==operation || saved.actorUid!==input.actorUid || saved.clubId!==input.clubId || saved.leaderId!==input.leaderId || saved.competitionId!==input.competitionId || saved.expectedFingerprint!==input.expectedFingerprint || !isDeepStrictEqual(saved.authority,authority)) throw new TypeError("Sauvegarde de chef d'equipe incompatible.");
      plan={before:saved.before,after:saved.after};
      if(COLUMNS.some(key=>!Object.hasOwn(plan.before||{},key) || !Object.hasOwn(plan.after||{},key))) throw new TypeError("Sauvegarde incomplete.");
      const expected=planLeaderChange({...pack,leaders:[plan.before]},input);
      if(!isDeepStrictEqual(expected,plan)) throw new TypeError("Modification sauvegardee incompatible.");
    } else {
      if(fingerprint(pack)!==input.expectedFingerprint) throw new TypeError("Le dossier NAP a change. Rechargez avant d'enregistrer.");
      plan=planLeaderChange(pack,input);
    }
    const triggers=await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='chefsdequipe' LIMIT 1");
    if(triggers.length) throw new TypeError("Declencheur natif a verifier avant modification.");
    const [current]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM chefsdequipe WHERE id=? LIMIT 1`,[input.leaderId]);
    if(!isDeepStrictEqual(current,plan.before) && !(saved && isDeepStrictEqual(current,plan.after))) throw new TypeError("Le chef d'equipe a change. Rechargez le dossier.");
    if(!saved && !isDeepStrictEqual(plan.before,plan.after)) await audit.prepare(operation,{kind:"native-team-leader-edit",operation,actorUid:input.actorUid,clubId:input.clubId,competitionId:input.competitionId,leaderId:input.leaderId,expectedFingerprint:input.expectedFingerprint,authority,...plan});
    if(!isDeepStrictEqual(current,plan.after)) {
      const statement=buildLeaderUpdate(plan,authority,competition.event.entryDeadlineAt);
      const result=await query(statement.sql,statement.values);
      if(result.affectedRows!==1) throw new TypeError("La declaration ou la fermeture a change. Rechargez le dossier.");
      const [verified]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM chefsdequipe WHERE id=? LIMIT 1`,[input.leaderId]);
      if(!isDeepStrictEqual(verified,plan.after)) throw new Error("Modification a verifier : sauvegarde conservee.");
    }
    if(saved || !isDeepStrictEqual(plan.before,plan.after)) await audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,leaderId:input.leaderId,verified:true,entriesPreserved:true});
    return {ok:true,source:"nap",operation};
  } finally {connection.release();}
}
module.exports={COLUMNS,planLeaderChange,buildLeaderUpdate,editNativeTeamLeader};
