"use strict";
const {createHash}=require("node:crypto");
const {positiveId}=require("./nap-direct-calendar");
const {fingerprint}=require("./nap-portal-workspaces");
const {readNativeCompetition}=require("./nap-portal-competitions");
const {readNativeClubEntry}=require("./nap-portal-entries");
const {planSelection}=require("./nap-swimmer-entry-plan");
const {statements}=require("./nap-swimmer-entry-statements");
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
function untouched(pack,plan) {
  const ids=new Set([...plan.additions.map(row=>Number(row.id)),...plan.removals.map(row=>Number(row.swimmer.id))]);
  const links=new Set(plan.removals.map(row=>Number(row.inscription.id)));
  const {readAt,...copy}=pack;
  return hash({...copy,inscriptions:pack.inscriptions.filter(row=>!ids.has(Number(row.nageur))),individual:pack.individual.filter(row=>!links.has(Number(row.engagement))),members:pack.members.filter(row=>!ids.has(Number(row.nageur)))});
}
// Accept only unchanged or already removed saved rows. A retry may not delete
// a course/member newly added by another interface in the meantime.
function remaining(plan,pack) {
  const removals=plan.removals.map(item=>{
    const inscriptions=pack.inscriptions.filter(row=>Number(row.nageur)===Number(item.swimmer.id));
    if(inscriptions.some(row=>hash(row)!==hash(item.inscription)) || inscriptions.length>1) throw new TypeError("Inscription modifiee ailleurs. Rechargez le dossier.");
    const entries=pack.individual.filter(row=>Number(row.engagement)===Number(item.inscription.id));
    const members=pack.members.filter(row=>Number(row.nageur)===Number(item.swimmer.id));
    for(const [rows,before] of [[entries,item.entries],[members,item.members]]) if(rows.some(row=>!before.some(saved=>hash(row)===hash(saved)))) throw new TypeError("Courses ou relais modifies ailleurs. Verification requise.");
    if(!inscriptions.length && (entries.length || members.length)) throw new TypeError("Retrait incomplet sans inscription. Verification requise.");
    return inscriptions.length ? {...item,entries,members} : null;
  }).filter(Boolean);
  const additions=plan.additions.filter(person=>{
    const rows=pack.inscriptions.filter(row=>Number(row.nageur)===Number(person.id));
    if(rows.length>1 || rows.some(row=>Number(row.compet)!==Number(plan.competitionId))) throw new TypeError("Inscription native ambigue.");
    return !rows.length;
  });
  return {...plan,additions,removals,complete:!additions.length&&!removals.length};
}
// Opening: existing 14+8 reads. Save: <= 42 bounded SQL operations, including
// lock/release, trigger/forfait checks, <=4 grouped writes and one full verify.
// Journal: one read, one before image, one completion; no sports copy/cache.
async function saveNativeSwimmerSelection(pool,input,services) {
  if(typeof services?.authorize!=="function" || typeof services?.validate!=="function" || !services.audit || !/^\d{1,16}$/.test(String(input?.clubId)) || !/^[a-f0-9]{64}$/.test(input?.expectedFingerprint||"") || typeof input?.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input?.mutationId||"") || !Array.isArray(input.changes) || !input.changes.length || input.changes.length>50 || Buffer.byteLength(JSON.stringify(input.changes))>20000) throw new TypeError("Selection native explicite requise.");
  input={...input,competitionId:positiveId(input.competitionId),clubId:String(input.clubId)};
  await services.authorize({competitionId:input.competitionId,clubId:input.clubId});
  const operation=hash(["native-swimmer-selection",input.actorUid,input.competitionId,input.clubId,input.mutationId]),payloadHash=hash(input.changes);
  const connection=await pool.getConnection(),readers=services.readers||{competition:readNativeCompetition,entry:readNativeClubEntry};
  const query=async(sql,values=[])=> (await connection.execute({sql,timeout:10000},values))[0];
  const lock=`lp-entry-${hash([input.competitionId,input.clubId]).slice(0,40)}`;
  let locked=false,safe=true;
  try {
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Dossier en cours d'enregistrement. Reessayez.");
    locked=true;
    const saved=await services.audit.read(operation);
    const competition=await readers.competition(connection,input.competitionId,event=>services.authorize({competitionId:input.competitionId,clubId:input.clubId,event}));
    if(!competition) throw new TypeError("Competition NAP introuvable.");
    const pack=await readers.entry(connection,input,services.authorize);
    const {readAt,event,...competitionRows}=competition;
    let target=saved;
    if(target) {
      if(target.kind!=="native-swimmer-selection" || target.operation!==operation || target.actorUid!==input.actorUid || target.competitionId!==input.competitionId || target.clubId!==input.clubId || target.expectedFingerprint!==input.expectedFingerprint || target.payloadHash!==payloadHash || target.planHash!==hash(target.plan) || target.untouchedHash!==untouched(pack,target.plan)) throw new TypeError("Sauvegarde incompatible ou dossier modifie ailleurs.");
      if(remaining(target.plan,pack).complete) {
        await services.audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,verified:true});
        return {ok:true,source:"nap",operation,writesExecuted:0,nativeEntry:pack,competition};
      }
      if(target.competitionHash!==hash(competitionRows)) throw new TypeError("Parametres de competition modifies. Verification requise.");
    } else if(fingerprint(pack)!==input.expectedFingerprint) throw new TypeError("Le dossier NAP a change. Rechargez avant d'enregistrer.");
    if(competition.event.entryStatus!=="open" || !Number.isFinite(Date.parse(competition.event.entryDeadlineAt)) || Date.now()>=Date.parse(competition.event.entryDeadlineAt)) throw new TypeError("Les engagements sont fermes.");
    if(pack.leaders.length!==1 || !String(pack.leaders[0].nom||"").trim() || !String(pack.leaders[0].prenom||"").trim()) throw new TypeError("Chef d'equipe NAP a verifier avant les nageurs.");
    const plan=target ? remaining(target.plan,pack) : planSelection(pack,input.changes);
    for(const person of plan.additions) require("./nap-entry-birth-policy").assertEligible(competition,person);
    await services.validate({connection,competition,pack,plan});
    if(!plan.additions.length&&!plan.removals.length) return {ok:true,source:"nap",operation,writesExecuted:0,nativeEntry:pack,competition};
    if(plan.removals.length && (await query("SELECT id FROM forfait FORCE INDEX (livepalmes_compet_engagement_id) WHERE compet=? LIMIT 1",[input.competitionId])).length) throw new TypeError("Cette competition contient des forfaits anciens. Leur lien NAP doit etre confirme avant le retrait d'un nageur.");
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('nageursengager','engagements','engagements_relayeurs') LIMIT 1")).length) throw new TypeError("Declencheur NAP a verifier avant l'enregistrement.");
    const authority={competitions:competition.nativeSnapshot.competition,compet_parametres:competition.nativeSnapshot.parameters,options:competition.options,nativeLeader:pack.leaders[0]};
    const batch=statements(plan,authority,competition.event.entryDeadlineAt);
    // Check the actual server's access plans before any durable operation.
    // EXPLAIN never executes these prepared DML statements.
    for(const statement of batch) {
      const explain=await query(`EXPLAIN ${statement.sql}`,statement.values);
      if(!indexed(statement,explain)) throw new TypeError("Plan de recherche NAP a verifier avant cet enregistrement.");
    }
    if(!target) {
      target={kind:"native-swimmer-selection",operation,actorUid:input.actorUid,competitionId:input.competitionId,clubId:input.clubId,expectedFingerprint:input.expectedFingerprint,payloadHash,plan,planHash:hash(plan),untouchedHash:untouched(pack,plan),competitionHash:hash(competitionRows)};
      if(Buffer.byteLength(JSON.stringify(target))>500000) throw new RangeError("Sauvegarde trop volumineuse : selectionnez moins de nageurs.");
      await services.audit.prepare(operation,target);
    }
    // Stop if a guarded write does not apply every expected effect. Never
    // proceed to parent removal or additions after a conflicting child write.
    for(const statement of batch) {
      const result=await query(statement.sql,statement.values);
      const count=statement.kind==="engagements"?plan.removals.reduce((sum,row)=>sum+row.entries.length,0):statement.kind==="engagements_relayeurs"?plan.removals.reduce((sum,row)=>sum+row.members.length,0):statement.kind==="nageursengager"?plan.removals.length:plan.additions.length;
      if(Number(result.affectedRows)!==count) throw new TypeError("Le dossier a change pendant l'enregistrement. Reprenez la meme modification ; la sauvegarde est conservee.");
    }
    const verified=await readers.entry(connection,input,services.authorize);
    if(untouched(verified,target.plan)!==target.untouchedHash || !remaining(target.plan,verified).complete) throw new TypeError("Verification NAP incomplete. Reprenez la meme modification.");
    await services.audit.complete(operation,{competitionId:input.competitionId,clubId:input.clubId,verified:true});
    return {ok:true,source:"nap",operation,writesExecuted:batch.length,nativeEntry:verified,competition};
  } finally {
    try {if(locked && Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1) safe=false;}catch {safe=false;}
    if(safe) connection.release();else connection.destroy();
  }
}
function indexed(statement,rows) {
  return rows.length>0 && rows.every(row=>statement.kind==="insert" && row.select_type==="INSERT" && row.table==="nageursengager" || String(row.table).startsWith("<") || ["const","system"].includes(row.type) || row.rows!=null && Number(row.rows)===0 || row.table==null && row.type==null && /^(?:Impossible WHERE(?: noticed after reading const tables)?|no matching row in const table|No tables used)$/i.test(String(row.Extra||"")) || row.type!=="ALL" && Boolean(row.key));
}
module.exports={saveNativeSwimmerSelection,remaining,untouched,indexed};
