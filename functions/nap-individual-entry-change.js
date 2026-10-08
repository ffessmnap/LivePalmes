"use strict";
// Native writes use existing tables; Firestore is only
// the operation journal. Authorization and sporting resolution stay server-side.
const {createHash}=require("node:crypto");
const {positiveId}=require("./nap-direct-calendar");
const {fingerprint}=require("./nap-portal-workspaces");
const {readNativeCompetition}=require("./nap-portal-competitions");
const {readNativeClubEntry}=require("./nap-portal-entries");
const {readEntryHistory}=require("./nap-entry-performance-history");
const {planIndividualEntries}=require("./nap-individual-entry-plan");
const {remaining}=require("./nap-individual-entry-recovery");
const {statements}=require("./nap-individual-entry-statements");
const {indexed}=require("./nap-individual-entry-proof");
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function unchangedDossier(pack) {const {individual,readAt,...untouched}=pack;return hash(untouched);}
function unchangedCompetition(pack) {const {event,readAt,...native}=pack;return hash(native);}
async function saveNativeIndividualEntries(pool,input,services) {
  if(typeof services?.authorize!=="function" || typeof services?.resolve!=="function" || !services.audit || !/^\d{1,16}$/.test(String(input?.clubId)) || !/^[a-f0-9]{64}$/.test(input?.expectedFingerprint||"") || typeof input?.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input?.mutationId||"") || !Array.isArray(input.changes) || input.changes.length>100 || Buffer.byteLength(JSON.stringify(input.changes))>100000) throw new TypeError("Modification native explicite requise.");
  input={...input,competitionId:positiveId(input.competitionId),clubId:String(input.clubId)};
  await services.authorize({competitionId:input.competitionId,clubId:input.clubId});
  const payloadHash=hash(input.changes),operation=hash(["native-individual",input.actorUid,input.clubId,input.competitionId,input.mutationId]);
  const connection=await pool.getConnection();let locked=false,safe=true;
  const lock=`lp-entry-${hash([input.competitionId,input.clubId]).slice(0,40)}`;
  const query=async(sql,values=[])=> (await connection.execute({sql,timeout:10000},values))[0];
  const readers=services.readers || {competition:readNativeCompetition,entry:readNativeClubEntry,history:readEntryHistory};
  try {
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Dossier en cours d'enregistrement. Reessayez.");
    locked=true;
    const saved=await services.audit.read(operation);
    const competition=await readers.competition(connection,input.competitionId,event=>services.authorize({competitionId:input.competitionId,clubId:input.clubId,event}));
    if(!competition) throw new TypeError("Competition NAP introuvable.");
    const pack=await readers.entry(connection,input,scope=>services.authorize(scope));
    let target=saved;
    if(target) {
      if(target.kind!=="native-individual-entry-change" || target.operation!==operation || target.actorUid!==input.actorUid || target.competitionId!==input.competitionId || target.clubId!==input.clubId || target.payloadHash!==payloadHash || target.expectedFingerprint!==input.expectedFingerprint || target.planHash!==hash(target.plan)) throw new TypeError("Sauvegarde incompatible. Conservez la modification initiale.");
      if(target.dossierHash!==unchangedDossier(pack)) throw new TypeError("Les participants du dossier ont change. Verification requise.");
      // Completion can be confirmed after closure; no remaining write may run.
      if(remaining(target.plan,pack.individual).complete) {
        await services.audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,verified:true});
        return {ok:true,source:"nap",operation,recovered:true,writesExecuted:0,competition,nativeEntry:pack};
      }
      if(target.competitionHash!==unchangedCompetition(competition)) throw new TypeError("Les regles de la competition ont change. Verification requise.");
    } else {
      if(fingerprint(pack)!==input.expectedFingerprint) throw new TypeError("Le dossier NAP a change. Rechargez avant d'enregistrer.");
    }
    if(competition.event.entryStatus!=="open" || !Number.isFinite(Date.parse(competition.event.entryDeadlineAt)) || Date.now()>=Date.parse(competition.event.entryDeadlineAt)) throw new TypeError("Les engagements sont fermes.");
    if(pack.leaders.length!==1 || !String(pack.leaders[0].nom||"").trim() || !String(pack.leaders[0].prenom||"").trim()) throw new TypeError("Chef d'equipe natif a verifier. Renonciation encore a raccorder.");
    const needsJournal=!target;
    if(!target) {
      const ids=new Set(input.changes.map(row=>positiveId(row?.swimmerId))),people=pack.swimmers.filter(row=>ids.has(Number(row.id)));
      if(ids.size!==input.changes.length || people.length!==ids.size) throw new TypeError("Nageurs hors du dossier autorise ou dupliques.");
      const histories=people.length && competition.event.eventType!=="openWater" ? await readers.history(connection,people) : new Map();
      const changes=await services.resolve({connection,competition,pack,changes:input.changes,histories});
      if(!Array.isArray(changes) || changes.length!==ids.size || new Set(changes.map(row=>Number(row.swimmerId))).size!==ids.size || changes.some(row=>!ids.has(Number(row.swimmerId)))) throw new TypeError("Resolution des courses incomplete.");
      const plan=planIndividualEntries(pack,changes);
      if(pack.individual.length+plan.plans.reduce((sum,row)=>sum+row.additions.length-row.removals.length,0)>5000) throw new RangeError("Dossier NAP trop volumineux : pagination requise.");
      target={kind:"native-individual-entry-change",operation,actorUid:input.actorUid,competitionId:input.competitionId,clubId:input.clubId,payloadHash,expectedFingerprint:input.expectedFingerprint,dossierHash:unchangedDossier(pack),competitionHash:unchangedCompetition(competition),plan,planHash:hash(plan)};
      if(Buffer.byteLength(JSON.stringify(target))>500000) throw new RangeError("Sauvegarde trop volumineuse pour ce lot. Selectionnez moins de nageurs.");
      if(remaining(plan,pack.individual).complete) return {ok:true,source:"nap",operation,writesExecuted:0,competition,nativeEntry:pack};
    }
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='engagements' LIMIT 1")).length) throw new TypeError("Declencheur natif a verifier avant enregistrement.");
    const pending=remaining(target.plan,pack.individual),authority={competitions:competition.nativeSnapshot.competition,compet_parametres:competition.nativeSnapshot.parameters,options:competition.options,nativeLeader:pack.leaders[0]};
    const batch=statements(pending,authority,competition.event.entryDeadlineAt);
    if((await query("SELECT id FROM forfait FORCE INDEX (livepalmes_compet_engagement_id) WHERE compet=? LIMIT 1",[input.competitionId])).length) throw new TypeError("Les forfaits natifs doivent etre raccordes avant la modification des courses de cette competition.");
    for(const statement of batch) {
      if(!indexed(statement,await query(`EXPLAIN ${statement.sql}`,statement.values))) throw new TypeError("Plan de recherche NAP a verifier avant cet enregistrement.");
    }
    if(needsJournal) await services.audit.prepare(operation,target);
    let writes=0;
    for(const statement of batch) {
      const result=await query(statement.sql,statement.values);
      if(Number(result.affectedRows)!==statement.expectedRows) throw new TypeError("Le dossier a change pendant l'enregistrement. Reprenez la meme modification ; la sauvegarde est conservee.");
      writes++;
    }
    // Reuse the one final read for the entire bounded dossier. Its SQL order
    // must match the normal reader so the returned fingerprint is reusable.
    const links=pack.inscriptions.map(row=>row.id);
    const current=links.length ? await query(`SELECT id,engagement,course,tps FROM engagements FORCE INDEX (engagements_clef) WHERE engagement IN (${links.map(()=>"?").join(",")}) ORDER BY engagement,course,id LIMIT 5001`,links) : [];
    if(!remaining(target.plan,current).complete) throw new Error("Enregistrement interrompu. Reprenez la meme modification ; la sauvegarde est conservee.");
    if(current.length>5000) throw new RangeError("Dossier NAP trop volumineux : pagination requise.");
    await services.audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,verified:true});
    return {ok:true,source:"nap",operation,writesExecuted:writes,competition,nativeEntry:{...pack,readAt:new Date().toISOString(),individual:current}};
  } finally {
    try {if(locked && Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1) safe=false;}catch {safe=false;}
    if(safe) connection.release();else connection.destroy();
  }
}
module.exports={saveNativeIndividualEntries};
