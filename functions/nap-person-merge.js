"use strict";
// National merge, <= 35 indexed SQL calls / 4,001 linked rows, no N+1.
// All native before-images are journaled; interruption recovery accepts only
// captured before/after states. Historical chefsdequipe rows are never changed.
const {createHash}=require("node:crypto"),{isDeepStrictEqual:equal}=require("node:util");
const {reference}=require("./nap-club-person-status");
const {nativeEqual}=require("./nap-native-compare");
const {SOURCES,OPTION_COLUMNS,normalizeOptions,person}=require("./nap-club-people");
const schema=require("./nap-approved-person-history-schema"),plans=require("./nap-person-merge-plan");
async function mergePeople(pool,input,audit,authorize) {
  if(typeof authorize!=="function" || input?.confirmMerge!==true || typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{64}$/.test(input.sourceFingerprint||"") || !/^[a-f0-9]{64}$/.test(input.targetFingerprint||""))throw new TypeError("Confirmation nationale et fiches affichees requises.");
  const a=reference(input.sourcePersonId),b=reference(input.targetPersonId);
  if(a.kind!=="officials" || b.kind!=="officials" || a.id===b.id)throw new TypeError("Deux personnes reutilisables distinctes requises.");
  await authorize();const operation=plans.operation(input),saved=await audit.read(operation);if(saved)plans.validateSaved(saved,input);
  const connection=await pool.getConnection(),locks=[];let tableLocked=false,safe=true;
  const query=async(sql,values=[])=>(await connection.execute({sql,timeout:10000},values))[0];
  const readPeople=async()=>{
    const natives=await query("SELECT id,nom,prenom,date,club FROM officiels FORCE INDEX (PRIMARY) WHERE id IN (?,?) ORDER BY id",[a.id,b.id]);
    const options=await query(`SELECT ${OPTION_COLUMNS.map(c=>`\`${c}\``).join(",")} FROM livepalmes_club_people_options FORCE INDEX (PRIMARY) WHERE source=? AND person_id IN (?,?) ORDER BY person_id`,["officiels",a.id,b.id]);
    return {source:natives.find(r=>Number(r.id)===a.id),target:natives.find(r=>Number(r.id)===b.id),sourceOptions:normalizeOptions(options.find(r=>Number(r.person_id)===a.id)),targetOptions:normalizeOptions(options.find(r=>Number(r.person_id)===b.id))};
  };
  const readLinks=()=>query("SELECT id,compet,officiel,club FROM officielsengager FORCE INDEX (livepalmes_officiel_id) WHERE officiel IN (?,?) ORDER BY officiel,id LIMIT 4001",[a.id,b.id]);
  const apply=async(statement,count=1)=>{if(!statement)return;const raw=await query(`EXPLAIN ${statement.sql}`,statement.values);if(!raw.length || raw.some(r=>!(r.select_type==="INSERT" && r.table==="livepalmes_club_people_options") && r.table && !String(r.table).startsWith("<") && !["const","system"].includes(r.type) && (r.type==="ALL" || !r.key)))throw new TypeError("Plan de fusion non indexe.");const result=await query(statement.sql,statement.values);if(result.affectedRows!==count)throw new Error("Fusion interrompue : sauvegarde conservee.");};
  try {
    for(const id of [a.id,b.id].sort((l,r)=>l-r)) {const lock=`lp-person-${createHash("sha256").update(`officiels:${id}`).digest("hex").slice(0,48)}`;if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1)throw new TypeError("Personne en cours de modification.");locks.push(lock);}
    const structure=schema.validate(await schema.inspect(connection));if(!structure.history || !structure.index)throw new TypeError("Complement historique absent.");
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('officiels','officielsengager','livepalmes_club_people_options') LIMIT 1")).length)throw new TypeError("Declencheur natif a verifier.");
    await connection.query({sql:"LOCK TABLES officiels WRITE,officielsengager WRITE,livepalmes_club_people_options WRITE,livepalmes_deleted_people_history READ",timeout:10000});tableLocked=true;
    const current=await readPeople(),links=await readLinks();if(links.length>4000)throw new RangeError("Historique trop volumineux pour cette fusion bornee.");
    const archived=await query("SELECT engagement_id FROM livepalmes_deleted_people_history FORCE INDEX (person_engagement) WHERE person_id IN (?,?) LIMIT 1",[a.id,b.id]);
    if(archived.length)throw new TypeError("Une personne est liee a un historique supprime ; verification nationale requise.");
    const plan=saved||plans.planMerge({...input,timestamp:new Date().toISOString().replace("T"," ").replace("Z","000")},current.source,current.target,current.sourceOptions,current.targetOptions,links);
    if(!equal(current.target,plan.target) || current.source && !equal(current.source,plan.source) || !equal(current.targetOptions,plan.targetOptions) && !equal(current.targetOptions,plan.afterOptions) || current.source && !equal(current.sourceOptions,plan.sourceOptions) || current.sourceOptions && !equal(current.sourceOptions,plan.sourceOptions))throw new TypeError("Une fiche a change depuis l'apercu de fusion.");
    const captured=new Map(plan.beforeLinks.map(r=>[Number(r.id),r])),after=new Map(plan.afterLinks.map(r=>[Number(r.id),r])),actual=new Map(links.map(r=>[Number(r.id),r]));
    if(links.some(row=>!captured.has(Number(row.id)) || !equal(row,captured.get(Number(row.id))) && !equal(row,after.get(Number(row.id)))) || plan.afterLinks.some(row=>!actual.has(Number(row.id))) || plan.removals.some(row=>actual.has(Number(row.id)) && !equal(actual.get(Number(row.id)),row)))throw new TypeError("Les engagements ont change depuis la preparation.");
    if(!current.source && links.some(row=>Number(row.officiel)===a.id))throw new TypeError("Fusion interrompue incoherente : source absente avec liens restants.");
    if(!saved)await audit.prepare(operation,plan);
    if(!equal(current.targetOptions,plan.afterOptions)) {
      const statement=plan.targetOptions?{sql:`UPDATE livepalmes_club_people_options SET role_team_leader=?,role_official=?,active=?,version=?,updated_at=?,updated_by=? WHERE source=? AND person_id=? AND ${OPTION_COLUMNS.map(c=>nativeEqual(`\`${c}\``)).join(" AND ")} LIMIT 1`,values:[plan.afterOptions.role_team_leader,plan.afterOptions.role_official,plan.afterOptions.active,plan.afterOptions.version,plan.afterOptions.updated_at,plan.afterOptions.updated_by,"officiels",plan.target.id,...OPTION_COLUMNS.map(c=>plan.targetOptions[c])]}:{sql:`INSERT INTO livepalmes_club_people_options (${OPTION_COLUMNS.map(c=>`\`${c}\``).join(",")}) VALUES (${OPTION_COLUMNS.map(()=>"?").join(",")})`,values:OPTION_COLUMNS.map(c=>plan.afterOptions[c])};
      await apply(statement);
    }
    const pendingUpdates=plan.updates.filter(row=>equal(actual.get(Number(row.before.id)),row.before));
    const pendingRemovals=plan.removals.filter(row=>actual.has(Number(row.id)));
    await apply(plans.linkStatement("update",pendingUpdates),pendingUpdates.length);
    await apply(plans.linkStatement("delete",pendingRemovals),pendingRemovals.length);
    if(!equal(await readLinks(),plan.afterLinks))throw new Error("Liens fusionnes a verifier.");
    if(current.source)await apply(plans.deleteSource(plan));
    if(current.sourceOptions)await apply(plans.deleteSourceOptions(plan));
    const verified=await readPeople();if(verified.source || verified.sourceOptions || !equal(verified.target,plan.target) || !equal(verified.targetOptions,plan.afterOptions))throw new Error("Fusion NAP a verifier.");
    await connection.query({sql:"UNLOCK TABLES",timeout:10000});tableLocked=false;
    const result={ok:true,source:"nap",operation,sourcePersonId:input.sourcePersonId,targetPersonId:input.targetPersonId,teamLeaderUpdateCount:0,officialsUpdateCount:plan.updates.length+plan.removals.length};
    await audit.complete(operation,{...result,verified:true,historicalLeadersPreserved:true});return {...result,targetPerson:person(plan.target,"officials",plan.afterOptions)};
  } finally {
    try{if(tableLocked)await connection.query({sql:"UNLOCK TABLES",timeout:10000});}catch{safe=false;}
    try{for(const lock of locks.reverse())if(Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1)safe=false;}catch{safe=false;}
    if(safe)connection.release();else connection.destroy();
  }
}
module.exports={mergePeople};
