"use strict";
// National-only deletion. Fixed indexed budget: <= 25 SQL calls, 2,001 links
// maximum; no linked entry or historical leader declaration is deleted.
const {createHash}=require("node:crypto");
const {isDeepStrictEqual:equal}=require("node:util");
const {reference}=require("./nap-club-person-status");
const {SOURCES,OPTION_COLUMNS,normalizeOptions}=require("./nap-club-people");
const plans=require("./nap-person-deletion-plan");
const schema=require("./nap-approved-person-history-schema");
function operation(input) {return createHash("sha256").update(JSON.stringify(["person-delete",input.actorUid,input.personId,input.expectedFingerprint])).digest("hex");}
async function deletePerson(pool,input,audit,authorize) {
  if(typeof authorize!=="function" || input?.confirmPermanent!==true || typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{64}$/.test(input.expectedFingerprint||"")) throw new TypeError("Confirmation nationale et fiche affichee requises.");
  const ref=reference(input.personId);
  if(ref.kind!=="officials") throw new TypeError("Les declarations historiques par competition sont conservees.");
  await authorize();
  const key=operation(input),saved=await audit.read(key);
  if(saved) plans.validateSaved(saved,{...input,timestamp:saved.history[0]?.deleted_at||"2026-01-01 00:00:00.000000"});
  const connection=await pool.getConnection();let locked=false,tableLocked=false,safe=true;
  const query=async(sql,values=[])=>(await connection.execute({sql,timeout:10000},values))[0];
  const lock=`lp-person-${createHash("sha256").update(`officiels:${ref.id}`).digest("hex").slice(0,48)}`;
  try {
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Personne en cours de modification.");locked=true;
    const structure=schema.validate(await schema.inspect(connection));
    if(!structure.history || !structure.index) throw new TypeError("Complement historique absent.");
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('officiels','officielsengager','livepalmes_club_people_options','livepalmes_deleted_people_history') LIMIT 1")).length) throw new TypeError("Declencheur natif a verifier.");
    // Table locks also protect against IntraNAP, which does not use our advisory lock.
    await connection.query({sql:"LOCK TABLES officiels WRITE,officielsengager WRITE,livepalmes_club_people_options WRITE,livepalmes_deleted_people_history WRITE",timeout:10000});tableLocked=true;
    const natives=await query("SELECT id,nom,prenom,date,club FROM officiels WHERE id=? LIMIT 1",[ref.id]);
    const [rawOptions]=await query(`SELECT ${OPTION_COLUMNS.map(c=>`\`${c}\``).join(",")} FROM livepalmes_club_people_options WHERE source=? AND person_id=? LIMIT 1`,["officiels",ref.id]);
    const options=normalizeOptions(rawOptions);
    const entries=await query("SELECT id,compet,officiel,club FROM officielsengager FORCE INDEX (livepalmes_officiel_id) WHERE officiel=? ORDER BY id LIMIT 2001",[ref.id]);
    if(entries.length>2000) throw new RangeError("Historique trop volumineux pour cette suppression bornee.");
    const plan=saved||plans.planDeletion({...input,timestamp:new Date().toISOString().replace("T"," ").replace("Z","000")},natives[0],options,entries);
    if(!equal(entries,plan.entries) || natives.length && !equal(natives[0],plan.native) || natives.length && !equal(options,plan.options) || !saved && !natives.length) throw new TypeError("La fiche ou ses engagements ont change. Rechargez avant de supprimer.");
    let archived=[];
    if(entries.length) archived=await query(`SELECT ${plans.COLUMNS.map(c=>`\`${c}\``).join(",")} FROM ${plans.TABLE} WHERE engagement_id IN (${entries.map(()=>"?").join(",")}) ORDER BY engagement_id`,entries.map(r=>r.id));
    if(archived.length && !equal(archived,plan.history)) throw new TypeError("Historique deja present ou divergent ; aucune suppression.");
    if(!saved) await audit.prepare(key,plan);
    const statements=plans.statements(plan);
    for(const write of statements) {
      if(write.kind==="archive" && archived.length) continue;
      if(write.kind==="delete-person" && !natives.length) continue;
      if(write.kind==="delete-options" && !options) continue;
      const result=await query(write.sql,write.values);
      const expected=write.kind==="archive"?plan.history.length:1;
      if(result.affectedRows!==expected) throw new Error("Suppression interrompue : sauvegarde conservee.");
    }
    if((await query("SELECT id FROM officiels WHERE id=? LIMIT 1",[ref.id])).length || (await query("SELECT person_id FROM livepalmes_club_people_options WHERE source=? AND person_id=? LIMIT 1",["officiels",ref.id])).length) throw new Error("Suppression a verifier.");
    if(plan.history.length) {
      const verified=await query(`SELECT ${plans.COLUMNS.map(c=>`\`${c}\``).join(",")} FROM ${plans.TABLE} WHERE engagement_id IN (${entries.map(()=>"?").join(",")}) ORDER BY engagement_id`,entries.map(r=>r.id));
      if(!equal(verified,plan.history)) throw new Error("Historique a verifier : sauvegarde conservee.");
    }
    // Release table locks before the final technical journal network write.
    await connection.query({sql:"UNLOCK TABLES",timeout:10000});tableLocked=false;
    await audit.complete(key,{personId:input.personId,clubId:String(plan.native.club),historicalEntries:plan.history.length,verified:true});
    return {ok:true,source:"nap",personId:input.personId,operation:key,historicalEntries:plan.history.length};
  } finally {
    try {if(tableLocked) await connection.query({sql:"UNLOCK TABLES",timeout:10000});}catch{safe=false;}
    try {if(locked && Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1)safe=false;}catch{safe=false;}
    if(safe)connection.release();else connection.destroy();
  }
}
module.exports={operation,deletePerson};
