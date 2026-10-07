"use strict";
// One relay per action, <=60 indexed/grouped SQL calls and <=5 native writes.
// Existing dossier limits apply. Firebase is solely a durable operation log.
const {createHash}=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const {positiveId}=require("./nap-direct-calendar");
const {fingerprint}=require("./nap-portal-workspaces");
const {readNativeCompetition}=require("./nap-portal-competitions");
const {readNativeClubEntry}=require("./nap-portal-entries");
const {planComposition}=require("./nap-relay-composition-plan");
const {remainingComposition}=require("./nap-relay-composition-recovery");
const sql=require("./nap-relay-composition-statements");
const details=require("./nap-relay-details");
const {detailStatement}=require("./nap-relay-details-statement");
const {indexed}=require("./nap-individual-entry-proof");
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function dossierHash(pack) {const {relays,members,options,readAt,...other}=pack;return hash(other);}
function competitionHash(pack) {const {event,readAt,...other}=pack;return hash(other);}
async function saveNativeRelayComposition(pool,input,services) {
  if(typeof services?.authorize!=="function" || typeof services?.resolve!=="function" || !services.audit || !/^\d{1,16}$/.test(String(input?.clubId)) || typeof input?.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{64}$/.test(input?.expectedFingerprint||"") || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input?.mutationId||"") || !["create","compose"].includes(input?.change?.action) || Buffer.byteLength(JSON.stringify(input.change))>20000) throw new TypeError("Modification explicite d'un relais requise.");
  input={...input,competitionId:positiveId(input.competitionId),clubId:String(input.clubId)};
  await services.authorize({competitionId:input.competitionId,clubId:input.clubId});
  const operation=hash(["native-relay-compose",input.actorUid,input.competitionId,input.clubId,input.mutationId]),payloadHash=hash(input.change);
  const connection=await pool.getConnection();let locked=false,count=0,safe=true,writes=0;
  const lock=`lp-entry-${hash([input.competitionId,input.clubId]).slice(0,40)}`;
  const checked={execute:async(query,values=[])=>{
    if(++count>60) throw new RangeError("Budget de requetes relais depasse.");
    return connection.execute({...query,timeout:10000},values);
  }};
  const query=async(text,values=[])=> (await checked.execute({sql:text},values))[0];
  const readers=services.readers||{competition:readNativeCompetition,entry:readNativeClubEntry};
  async function prove(statement) {
    const rows=await query(`EXPLAIN ${statement.sql}`,statement.values);
    const target={"insert-relay":"engagements_relais","insert-members":"engagements_relayeurs","insert-details":"livepalmes_club_entry_options"}[statement.kind];
    if(!rows.length || !rows.every(row=>target && row.select_type==="INSERT" && row.table===target || indexed(statement,[row]))) throw new TypeError("Plan de recherche NAP a verifier avant les relais.");
  }
  async function execute(statement) {
    await prove(statement);
    const result=await query(statement.sql,statement.values);
    if(Number(result.affectedRows)!==statement.expectedRows) throw new TypeError("Le dossier a change pendant l'enregistrement. Sauvegarde conservee ; reprenez la meme modification.");
    writes++;return result;
  }
  async function readTarget(id) {
    const relays=await query("SELECT id,compet,categorie,club,course,tps FROM engagements_relais FORCE INDEX (PRIMARY) WHERE id=? AND compet=? AND club=? LIMIT 1",[id,input.competitionId,input.clubId]);
    const members=await query("SELECT id,relais,pos,nageur FROM engagements_relayeurs FORCE INDEX (livepalmes_relais_pos_id) WHERE relais=? ORDER BY pos,id LIMIT 1201",[id]);
    if(members.length>1200) throw new RangeError("Composition native trop volumineuse.");
    return {relays,members};
  }
  try {
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Dossier en cours d'enregistrement.");
    locked=true;
    let target=await services.audit.read(operation);
    const competition=await readers.competition(checked,input.competitionId,event=>services.authorize({...input,event}));
    if(!competition) throw new TypeError("Competition NAP introuvable.");
    let pack=await readers.entry(checked,input,scope=>services.authorize(scope));
    if(target) {
      if(target.kind!=="native-relay-composition" || target.operation!==operation || target.actorUid!==input.actorUid || target.competitionId!==input.competitionId || target.clubId!==input.clubId || target.payloadHash!==payloadHash || target.expectedFingerprint!==input.expectedFingerprint || target.planHash!==hash(target.plan) || !["prepared","writing","identified"].includes(target.phase)) throw new TypeError("Sauvegarde du relais incompatible.");
      if(target.phase==="writing") throw new TypeError("Creation NAP a verifier : identifiant non confirme. Aucune nouvelle insertion automatique.");
      if(target.dossierHash!==dossierHash(pack)) throw new TypeError("Les autres participants ont change. Verification requise.");
      if(target.phase==="identified" && remainingComposition(target.plan,target.relayId,pack.relays,pack.members).complete && isDeepStrictEqual(details.detail(pack.relays.find(row=>Number(row.id)===target.relayId),pack.options?.submission_metadata),target.detail)) {
        await services.audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,relayId:target.relayId,verified:true});
        return {ok:true,source:"nap",operation,writesExecuted:0,competition,nativeEntry:pack};
      }
      if(target.competitionHash!==competitionHash(competition)) throw new TypeError("Les regles de la competition ont change.");
    } else if(fingerprint(pack)!==input.expectedFingerprint) throw new TypeError("Le dossier NAP a change. Rechargez avant d'enregistrer.");
    if(competition.event.entryStatus!=="open" || !Number.isFinite(Date.parse(competition.event.entryDeadlineAt)) || Date.now()>=Date.parse(competition.event.entryDeadlineAt)) throw new TypeError("Les engagements sont fermes.");
    if(pack.leaders.length!==1 || !String(pack.leaders[0].nom||"").trim() || !String(pack.leaders[0].prenom||"").trim()) throw new TypeError("Chef d'equipe natif a verifier.");
    const authority={competitions:competition.nativeSnapshot.competition,compet_parametres:competition.nativeSnapshot.parameters,options:competition.options,nativeLeader:pack.leaders[0]};
    if(!target) {
      const resolved=await services.resolve({connection:checked,competition,pack,change:input.change});
      if(resolved.action!==input.change.action || resolved.action==="compose" && Number(resolved.relayId)!==Number(input.change.relayId)) throw new TypeError("Resolution du relais incompatible.");
      const plan=planComposition(pack,resolved);
      if(!Array.isArray(resolved.people) || resolved.people.length>4) throw new TypeError("Identites natives groupees requises.");
      details.changed(null,{...plan.after,id:plan.relayId||1},resolved.detail);
      // Validate every member witness before any auto-increment INSERT. This
      // placeholder is used for preparation only, never for an actual write.
      if(plan.membersAfter.length) sql.insertMembers(plan,plan.relayId||1,plan.membersAfter,resolved.people,authority,competition.event.entryDeadlineAt);
      target={kind:"native-relay-composition",operation,actorUid:input.actorUid,competitionId:input.competitionId,clubId:input.clubId,payloadHash,expectedFingerprint:input.expectedFingerprint,dossierHash:dossierHash(pack),competitionHash:competitionHash(competition),plan,planHash:hash(plan),course:resolved.course,people:resolved.people,detail:resolved.detail,optionsBefore:pack.options,activeRelayIds:pack.relays.map(row=>row.id),phase:plan.action==="create"?"prepared":"identified",relayId:plan.relayId||null,timestamp:new Date().toISOString().replace("T"," ").replace("Z","000")};
      if(Buffer.byteLength(JSON.stringify(target))>500000) throw new RangeError("Sauvegarde du relais trop volumineuse.");
      // Validate and explain the creation before preparing its durable intent.
      if(plan.action==="create") await prove(sql.insertRelay(plan,target.course,authority,competition.event.entryDeadlineAt));
      else await prove(sql.updateRelay(plan,target.course,authority,competition.event.entryDeadlineAt));
      if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('engagements_relais','engagements_relayeurs','livepalmes_club_entry_options') LIMIT 1")).length) throw new TypeError("Declencheur natif a verifier avant les relais.");
      await services.audit.prepare(operation,target);
    }
    if(target.phase==="prepared") {
      target={...target,phase:"writing"};await services.audit.checkpoint(operation,target);
      const result=await execute(sql.insertRelay(target.plan,target.course,authority,competition.event.entryDeadlineAt));
      target={...target,phase:"identified",relayId:positiveId(result.insertId)};
      await services.audit.checkpoint(operation,target);
    }
    let current=await readTarget(target.relayId),pending=remainingComposition(target.plan,target.relayId,current.relays,current.members);
    if(pending.update) await execute(sql.updateRelay(target.plan,target.course,authority,competition.event.entryDeadlineAt));
    if(pending.removals.length) await execute(sql.removeMembers(target.plan,target.relayId,pending.removals,authority,competition.event.entryDeadlineAt));
    current=await readTarget(target.relayId);pending=remainingComposition(target.plan,target.relayId,current.relays,current.members);
    if(pending.additions.length) await execute(sql.insertMembers(target.plan,target.relayId,pending.additions,target.people,authority,competition.event.entryDeadlineAt));
    current=await readTarget(target.relayId);
    if(!remainingComposition(target.plan,target.relayId,current.relays,current.members).complete) throw new TypeError("Composition a verifier ; sauvegarde conservee.");
    const after=details.changed(target.optionsBefore?.submission_metadata,current.relays[0],target.detail,[...new Set([...target.activeRelayIds,target.relayId])]);
    pack=await readers.entry(checked,input,scope=>services.authorize(scope));
    if(!isDeepStrictEqual(details.detail(current.relays[0],pack.options?.submission_metadata),target.detail)) await execute(detailStatement({...input,timestamp:target.timestamp},target.optionsBefore,after,authority,competition.event.entryDeadlineAt));
    pack=await readers.entry(checked,input,scope=>services.authorize(scope));
    if(dossierHash(pack)!==target.dossierHash || !remainingComposition(target.plan,target.relayId,pack.relays,pack.members).complete || !isDeepStrictEqual(details.detail(pack.relays.find(row=>Number(row.id)===target.relayId),pack.options?.submission_metadata),target.detail)) throw new TypeError("Enregistrement du relais a verifier ; sauvegarde conservee.");
    await services.audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,relayId:target.relayId,verified:true});
    return {ok:true,source:"nap",operation,writesExecuted:writes,competition,nativeEntry:pack};
  } finally {
    try {if(locked && Number((await connection.execute({sql:"SELECT RELEASE_LOCK(?) AS released",timeout:10000},[lock]))[0][0]?.released)!==1) safe=false;}catch {safe=false;}
    if(safe) connection.release();else connection.destroy();
  }
}
module.exports={saveNativeRelayComposition};
