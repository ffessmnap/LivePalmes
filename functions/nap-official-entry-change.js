"use strict";
// Prepared native official selection. No callable is registered by this module.
// Reuse the dossier lock/journal used by swimmer and individual selections.
const {createHash}=require("node:crypto");
const {positiveId}=require("./nap-direct-calendar");
const {fingerprint}=require("./nap-portal-workspaces");
const {readNativeCompetition}=require("./nap-portal-competitions");
const {readNativeClubEntry}=require("./nap-portal-entries");
const {SOURCES,OPTION_COLUMNS,normalizeOptions}=require("./nap-club-people");
const {officialIds,planOfficials}=require("./nap-official-entry-plan");
const {remainingOfficials}=require("./nap-official-entry-recovery");
const {selectedStatement,insertion,deletion}=require("./nap-official-entry-statements");
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function untouched(pack) {const {readAt,officials,...other}=pack;return hash(other);}
function competitionHash(pack) {const {readAt,event,...other}=pack;return hash(other);}
function indexed(statement,rows) {
  return Array.isArray(rows) && rows.length>0 && rows.every(row=>statement.kind==="insert" && row.select_type==="INSERT" && row.table==="officielsengager" || String(row.table).startsWith("<") || ["const","system"].includes(row.type) || row.rows!=null && Number(row.rows)===0 || row.table==null && row.type==null && /^(?:Impossible WHERE(?: noticed after reading const tables)?|no matching row in const table|No tables used)$/i.test(String(row.Extra||"")) || row.type!=="ALL" && Boolean(row.key));
}
async function readPeople(connection,ids,clubId) {
  if(!ids.length) return [];
  const statement=selectedStatement(ids,clubId),[rows]=await connection.execute({sql:statement.sql,timeout:10000},statement.values);
  if(rows.length>80) throw new RangeError("Selection de personnes trop volumineuse.");
  return rows.map(row=>({native:Object.fromEntries(SOURCES.officials.columns.map(key=>[key,row[key]])),options:row.option_person_id==null?null:normalizeOptions(Object.fromEntries(OPTION_COLUMNS.map(key=>[key,row[`option_${key}`]])))}));
}
async function saveNativeOfficials(pool,input,services) {
  if(typeof services?.authorize!=="function" || !services.audit || !/^\d{1,16}$/.test(String(input?.clubId)) || !/^[a-f0-9]{64}$/.test(input?.expectedFingerprint||"") || typeof input?.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input?.mutationId||"")) throw new TypeError("Selection native explicite requise.");
  const ids=officialIds(input.officialPersonIds);
  input={...input,competitionId:positiveId(input.competitionId),clubId:String(input.clubId)};
  await services.authorize({competitionId:input.competitionId,clubId:input.clubId});
  const payloadHash=hash(input.officialPersonIds),operation=hash(["native-official-entry",input.actorUid,input.competitionId,input.clubId,input.mutationId]);
  const connection=await pool.getConnection(),readers=services.readers||{competition:readNativeCompetition,entry:readNativeClubEntry,people:readPeople};
  const query=async(sql,values=[])=> (await connection.execute({sql,timeout:10000},values))[0];
  const lock=`lp-entry-${hash([input.competitionId,input.clubId]).slice(0,40)}`;
  let locked=false,safe=true;
  try {
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Dossier en cours d'enregistrement. Reessayez.");
    locked=true;
    let target=await services.audit.read(operation);
    const competition=await readers.competition(connection,input.competitionId,event=>services.authorize({competitionId:input.competitionId,clubId:input.clubId,event}));
    if(!competition) throw new TypeError("Competition NAP introuvable.");
    const pack=await readers.entry(connection,input,services.authorize);
    if(target) {
      if(target.kind!=="native-official-entry-change" || target.operation!==operation || target.actorUid!==input.actorUid || target.competitionId!==input.competitionId || target.clubId!==input.clubId || target.expectedFingerprint!==input.expectedFingerprint || target.payloadHash!==payloadHash || target.planHash!==hash(target.plan) || target.peopleHash!==hash(target.people) || target.untouchedHash!==untouched(pack)) throw new TypeError("Sauvegarde incompatible ou dossier modifie ailleurs.");
      if(remainingOfficials(target.plan,pack.officials).complete) {
        await services.audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,verified:true});
        return {ok:true,source:"nap",operation,writesExecuted:0,competition,nativeEntry:pack};
      }
      if(target.competitionHash!==competitionHash(competition)) throw new TypeError("Parametres de competition modifies. Verification requise.");
    } else if(fingerprint(pack)!==input.expectedFingerprint) throw new TypeError("Le dossier NAP a change. Rechargez avant d'enregistrer.");
    if(competition.event.entryStatus!=="open" || !Number.isFinite(Date.parse(competition.event.entryDeadlineAt)) || Date.now()>=Date.parse(competition.event.entryDeadlineAt)) throw new TypeError("Les engagements sont fermes.");
    const needsJournal=!target;
    if(!target) {
      const present=new Set(pack.officials.map(row=>Number(row.officiel)));
      const people=await readers.people(connection,ids.filter(id=>!present.has(id)),input.clubId);
      const plan=planOfficials(pack,input.officialPersonIds,people);
      if(remainingOfficials(plan,pack.officials).complete) return {ok:true,source:"nap",operation,writesExecuted:0,competition,nativeEntry:pack};
      target={kind:"native-official-entry-change",operation,actorUid:input.actorUid,competitionId:input.competitionId,clubId:input.clubId,expectedFingerprint:input.expectedFingerprint,payloadHash,plan,planHash:hash(plan),people,peopleHash:hash(people),untouchedHash:untouched(pack),competitionHash:competitionHash(competition)};
      if(Buffer.byteLength(JSON.stringify(target))>500000) throw new RangeError("Sauvegarde trop volumineuse.");
    }
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='officielsengager' LIMIT 1")).length) throw new TypeError("Declencheur natif a verifier avant enregistrement.");
    const pending=remainingOfficials(target.plan,pack.officials),authority={competitions:competition.nativeSnapshot.competition,compet_parametres:competition.nativeSnapshot.parameters,options:competition.options,nativeLeader:pack.leaders[0]},batch=[];
    if(pending.removals.length) batch.push(deletion(target.plan,pending.removals,authority,competition.event.entryDeadlineAt));
    if(pending.additions.length) batch.push(insertion({...target.plan,additions:pending.additions},target.people,authority,competition.event.entryDeadlineAt));
    for(const statement of batch) if(!indexed(statement,await query(`EXPLAIN ${statement.sql}`,statement.values))) throw new TypeError("Plan de recherche NAP a verifier avant cet enregistrement.");
    if(needsJournal) await services.audit.prepare(operation,target);
    for(const statement of batch) if(Number((await query(statement.sql,statement.values)).affectedRows)!==statement.expectedRows) throw new TypeError("Le dossier a change pendant l'enregistrement. Reprenez la meme selection ; la sauvegarde est conservee.");
    const current=await query("SELECT e.id,e.compet,e.officiel,e.club,o.nom,o.prenom,o.date FROM officielsengager e FORCE INDEX (livepalmes_compet_club_id) LEFT JOIN officiels o ON o.id=e.officiel WHERE e.compet=? AND e.club=? ORDER BY e.id LIMIT 201",[input.competitionId,input.clubId]);
    if(!remainingOfficials(target.plan,current).complete) throw new TypeError("Enregistrement incomplet. Reprenez la meme selection ; la sauvegarde est conservee.");
    await services.audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,verified:true});
    return {ok:true,source:"nap",operation,writesExecuted:batch.length,competition,nativeEntry:{...pack,readAt:new Date().toISOString(),officials:current}};
  } finally {
    try {if(locked && Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1) safe=false;}catch {safe=false;}
    if(safe) connection.release();else connection.destroy();
  }
}
module.exports={saveNativeOfficials,readPeople,indexed};
