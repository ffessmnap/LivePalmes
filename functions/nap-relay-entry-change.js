"use strict";
// Existing relay corrections/removals only. Creation/composition is resolved
// separately before activation of the public callable. No sports Firestore.
// Budget before implementation: ordinary opening unchanged; one action uses
// <=60 grouped/indexed SQL calls, <=3 writes, <=200 relays/1200 members.
// Final dossier is returned for cache reuse; retries never scan global tables.
const {createHash}=require("node:crypto");
const {positiveId}=require("./nap-direct-calendar");
const {fingerprint}=require("./nap-portal-workspaces");
const {readNativeCompetition}=require("./nap-portal-competitions");
const {readNativeClubEntry}=require("./nap-portal-entries");
const {planRelayChanges}=require("./nap-relay-entry-plan");
const {remainingRelays}=require("./nap-relay-entry-recovery");
const {statements}=require("./nap-relay-entry-statements");
const {indexed}=require("./nap-individual-entry-proof");
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function dossierHash(pack) {const {relays,members,readAt,...rest}=pack;return hash(rest);}
function competitionHash(pack) {const {event,readAt,...rest}=pack;return hash(rest);}
async function saveNativeRelayChanges(pool,input,services) {
  if(typeof services?.authorize!=="function" || typeof services?.resolve!=="function" || !services.audit || !/^\d{1,16}$/.test(String(input?.clubId)) || !/^[a-f0-9]{64}$/.test(input?.expectedFingerprint||"") || typeof input?.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input?.mutationId||"") || !Array.isArray(input.changes) || !input.changes.length || input.changes.length>10 || Buffer.byteLength(JSON.stringify(input.changes))>50000) throw new TypeError("Modification explicite de relais requise.");
  input={...input,competitionId:positiveId(input.competitionId),clubId:String(input.clubId)};
  await services.authorize({competitionId:input.competitionId,clubId:input.clubId});
  const operation=hash(["native-relay",input.actorUid,input.competitionId,input.clubId,input.mutationId]),payloadHash=hash(input.changes);
  const connection=await pool.getConnection();let locked=false,safe=true,queryCount=0;
  const lock=`lp-entry-${hash([input.competitionId,input.clubId]).slice(0,40)}`;
  const checked={execute:async(query,values=[])=>{
    if(++queryCount>60) throw new RangeError("Budget de requetes relais depasse.");
    return connection.execute(typeof query==="string"?{sql:query,timeout:10000}:{...query,timeout:10000},values);
  }};
  const query=async(sql,values=[])=> (await checked.execute({sql},values))[0];
  const readers=services.readers || {competition:readNativeCompetition,entry:readNativeClubEntry};
  try {
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Dossier en cours d'enregistrement. Reessayez.");
    locked=true;
    const saved=await services.audit.read(operation);
    const competition=await readers.competition(checked,input.competitionId,event=>services.authorize({...input,event}));
    if(!competition) throw new TypeError("Competition NAP introuvable.");
    const pack=await readers.entry(checked,input,scope=>services.authorize(scope));
    let target=saved;
    if(target) {
      if(target.kind!=="native-relay-change" || target.operation!==operation || target.actorUid!==input.actorUid || target.competitionId!==input.competitionId || target.clubId!==input.clubId || target.payloadHash!==payloadHash || target.expectedFingerprint!==input.expectedFingerprint || target.planHash!==hash(target.plan)) throw new TypeError("Sauvegarde de relais incompatible. Conservez la modification initiale.");
      if(target.dossierHash!==dossierHash(pack)) throw new TypeError("Les autres participants ont change. Verification requise.");
      if(remainingRelays(target.plan,pack.relays,pack.members).complete) {
        await services.audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,verified:true});
        return {ok:true,source:"nap",operation,recovered:true,writesExecuted:0,competition,nativeEntry:pack};
      }
      if(target.competitionHash!==competitionHash(competition)) throw new TypeError("Les regles de la competition ont change.");
    } else if(fingerprint(pack)!==input.expectedFingerprint) throw new TypeError("Le dossier NAP a change. Rechargez avant d'enregistrer.");
    if(competition.event.entryStatus!=="open" || !Number.isFinite(Date.parse(competition.event.entryDeadlineAt)) || Date.now()>=Date.parse(competition.event.entryDeadlineAt)) throw new TypeError("Les engagements sont fermes.");
    if(pack.leaders.length!==1 || !String(pack.leaders[0].nom||"").trim() || !String(pack.leaders[0].prenom||"").trim()) throw new TypeError("Chef d'equipe natif a verifier.");
    const needsJournal=!target;
    if(!target) {
      const changes=await services.resolve({connection:checked,competition,pack,changes:input.changes});
      if(!Array.isArray(changes) || changes.length!==input.changes.length || changes.some((row,index)=>Number(row.relayId)!==Number(input.changes[index]?.relayId) || row.action!==input.changes[index]?.action)) throw new TypeError("Resolution des relais incomplete.");
      const plan=planRelayChanges(pack,changes);
      target={kind:"native-relay-change",operation,actorUid:input.actorUid,competitionId:input.competitionId,clubId:input.clubId,payloadHash,expectedFingerprint:input.expectedFingerprint,dossierHash:dossierHash(pack),competitionHash:competitionHash(competition),plan,planHash:hash(plan)};
      if(Buffer.byteLength(JSON.stringify(target))>500000) throw new RangeError("Sauvegarde trop volumineuse pour ce lot.");
      if(remainingRelays(plan,pack.relays,pack.members).complete) return {ok:true,source:"nap",operation,writesExecuted:0,competition,nativeEntry:pack};
    }
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('engagements_relais','engagements_relayeurs') LIMIT 1")).length) throw new TypeError("Declencheur natif a verifier avant les relais.");
    const pending=remainingRelays(target.plan,pack.relays,pack.members);
    const authority={competitions:competition.nativeSnapshot.competition,compet_parametres:competition.nativeSnapshot.parameters,options:competition.options,nativeLeader:pack.leaders[0]};
    const batch=statements(pending.plan,authority,competition.event.entryDeadlineAt);
    for(const statement of batch) if(!indexed(statement,await query(`EXPLAIN ${statement.sql}`,statement.values))) throw new TypeError("Plan de recherche NAP a verifier avant les relais.");
    if(needsJournal) await services.audit.prepare(operation,target);
    let writes=0;
    for(const statement of batch) {
      const result=await query(statement.sql,statement.values);
      if(Number(result.affectedRows)!==statement.expectedRows) throw new TypeError("Le dossier a change pendant l'enregistrement. Reprenez la meme modification ; la sauvegarde est conservee.");
      writes++;
    }
    const current=await readers.entry(checked,input,scope=>services.authorize(scope));
    if(dossierHash(current)!==target.dossierHash || !remainingRelays(target.plan,current.relays,current.members).complete) throw new TypeError("Enregistrement a verifier. Reprenez la meme modification ; la sauvegarde est conservee.");
    await services.audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,verified:true});
    return {ok:true,source:"nap",operation,writesExecuted:writes,competition,nativeEntry:current};
  } finally {
    // Cleanup must remain possible even after the enforced action budget.
    try {if(locked && Number((await connection.execute({sql:"SELECT RELEASE_LOCK(?) AS released",timeout:10000},[lock]))[0][0]?.released)!==1) safe=false;}catch {safe=false;}
    if(safe) connection.release();else connection.destroy();
  }
}
module.exports={saveNativeRelayChanges};
