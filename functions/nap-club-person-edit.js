"use strict";
// Native official identity only: 13 SQL calls maximum, 801 club rows maximum.
// One audit read and two audit writes. No entry, licence or role is rewritten.
const {createHash}=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const {SOURCES,OPTION_COLUMNS,normalizeOptions,person}=require("./nap-club-people");
const {reference}=require("./nap-club-person-status");
const {date}=require("./nap-direct-calendar");
const spec=SOURCES.officials;
function identity(row) {return [row.nom,row.prenom].map(value=>String(value).trim().toLocaleUpperCase("fr")).concat(date(row.date)).join("|");}
function planIdentity(native,patch) {
  if(!patch || typeof patch!=="object" || Array.isArray(patch) || Object.keys(patch).length!==3 || Object.keys(patch).some(key=>!["firstName","lastName","birthDate"].includes(key))) throw new TypeError("Nom, prenom et date uniquement.");
  for(const key of ["firstName","lastName"]) if(typeof patch[key]!=="string" || !patch[key].trim() || patch[key].length>100 || /[\u0000-\u001f]/.test(patch[key])) throw new TypeError("Nom et prenom requis, 100 caracteres maximum.");
  let birth=native.date;
  if(patch.birthDate!==date(native.date)) {
    if(typeof patch.birthDate!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(patch.birthDate) || !date(patch.birthDate) || new Date(`${patch.birthDate}T12:00:00Z`).toISOString().slice(0,10)!==patch.birthDate) throw new TypeError("Date de naissance invalide.");
    birth=patch.birthDate;
  }
  return {...native,nom:patch.lastName.trim(),prenom:patch.firstName.trim(),date:birth};
}
function statement(before,after) {
  const changed=["nom","prenom","date"].filter(key=>before[key]!==after[key]);
  if(!changed.length) throw new TypeError("Aucun champ a modifier.");
  return {sql:`UPDATE officiels SET ${changed.map(key=>`\`${key}\`=?`).join(",")} WHERE id=? AND ${spec.columns.slice(1).map(key=>`BINARY \`${key}\` <=> BINARY ?`).join(" AND ")} LIMIT 1`,values:[...changed.map(key=>after[key]),before.id,...spec.columns.slice(1).map(key=>before[key])]};
}
async function editNativePerson(pool,input,audit,authorize) {
  if(typeof authorize!=="function" || typeof input?.clubId!=="string" || !/^\d{1,16}$/.test(input.clubId) || typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{64}$/.test(input.expectedFingerprint || "")) throw new TypeError("Fiche et perimetre NAP requis.");
  const {kind,id}=reference(input.personId);
  if(kind!=="officials") throw new TypeError("Cette ancienne declaration se corrige dans le dossier de sa competition.");
  await authorize({clubId:input.clubId});
  const operation=createHash("sha256").update(JSON.stringify(["identity",input.clubId,input.actorUid,input.personId,input.expectedFingerprint,input.patch])).digest("hex");
  const connection=await pool.getConnection();const locks=[];
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  const read=async()=>{
    const [native]=await query(`SELECT ${spec.columns.map(key=>`\`${key}\``).join(",")} FROM officiels WHERE id=? LIMIT 1`,[id]);
    if(!native || String(native.club)!==input.clubId) throw new TypeError("Personne hors du club autorise.");
    const [options]=await query(`SELECT ${OPTION_COLUMNS.map(key=>`\`${key}\``).join(",")} FROM livepalmes_club_people_options WHERE source=? AND person_id=? LIMIT 1`,[spec.table,id]);
    return {native,options:normalizeOptions(options)};
  };
  try {
    const clubLock=`lp-person-club-${createHash("sha256").update(input.clubId).digest("hex").slice(0,40)}`;
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[clubLock]))[0]?.acquired)!==1) throw new TypeError("Annuaire en cours de modification. Reessayez.");
    locks.push(clubLock);
    const lock=`lp-person-${createHash("sha256").update(`${spec.table}:${id}`).digest("hex").slice(0,48)}`;
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Personne en cours de modification. Reessayez.");
    locks.push(lock);
    const current=await read(),saved=await audit.read(operation);
    let plan;
    if(saved) {
      if(saved.kind!=="native-person-identity" || saved.operation!==operation || saved.actorUid!==input.actorUid || saved.clubId!==input.clubId || saved.personId!==input.personId || saved.expectedFingerprint!==input.expectedFingerprint || !isDeepStrictEqual(saved.options,current.options) || person(saved.before,kind,saved.options).napFingerprint!==input.expectedFingerprint || !isDeepStrictEqual(planIdentity(saved.before,input.patch),saved.after)) throw new TypeError("Sauvegarde de personne incompatible.");
      plan=saved;
    } else {
      if(person(current.native,kind,current.options).napFingerprint!==input.expectedFingerprint) throw new TypeError("La fiche NAP a change. Rechargez avant d'enregistrer.");
      plan={kind:"native-person-identity",operation,actorUid:input.actorUid,clubId:input.clubId,personId:input.personId,expectedFingerprint:input.expectedFingerprint,before:current.native,after:planIdentity(current.native,input.patch),options:current.options};
    }
    if(!isDeepStrictEqual(current.native,plan.before) && !(saved && isDeepStrictEqual(current.native,plan.after))) throw new TypeError("La fiche NAP a change. Rechargez avant d'enregistrer.");
    if(isDeepStrictEqual(plan.before,plan.after)) return {ok:true,source:"nap",person:person(current.native,kind,current.options),unchanged:true};
    // Existing duplicates remain intact; a correction must not create a new one.
    const peers=await query("SELECT id,nom,prenom,date,club FROM officiels FORCE INDEX (livepalmes_club_id) WHERE club=? ORDER BY id LIMIT 801",[input.clubId]);
    if(peers.length>800) throw new RangeError("Annuaire trop volumineux pour cette correction bornee.");
    if(peers.some(row=>String(row.club)!==input.clubId)) throw new TypeError("Annuaire hors club.");
    if(identity(plan.before)!==identity(plan.after) && peers.some(row=>Number(row.id)!==id && identity(row)===identity(plan.after))) throw new TypeError("Cette identite existe deja dans le club. Verifiez les fiches avant correction.");
    if(!isDeepStrictEqual(current.native,plan.after)) {
      if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='officiels' LIMIT 1")).length) throw new TypeError("Declencheur natif a verifier.");
      if(!saved) await audit.prepare(operation,plan);
      const update=statement(plan.before,plan.after),result=await query(update.sql,update.values);
      if(result.affectedRows!==1) throw new TypeError("La fiche a change. Rechargez ; la sauvegarde est conservee.");
    }
    const verified=await read();
    if(!isDeepStrictEqual(verified.native,plan.after) || !isDeepStrictEqual(verified.options,plan.options)) throw new Error("Correction a verifier : sauvegarde conservee.");
    await audit.complete(operation,{personId:input.personId,clubId:input.clubId,verified:true,entriesPreserved:true});
    return {ok:true,source:"nap",person:person(verified.native,kind,verified.options),operation};
  } finally {
    let releaseSafe=true;
    try {for(const lock of locks.reverse()) {const rows=await query("SELECT RELEASE_LOCK(?) AS released",[lock]);if(Number(rows[0]?.released)!==1) releaseSafe=false;}}
    catch {releaseSafe=false;}
    finally {if(releaseSafe) connection.release();else connection.destroy();}
  }
}
module.exports={identity,planIdentity,statement,editNativePerson};
