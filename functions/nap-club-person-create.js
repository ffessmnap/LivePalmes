"use strict";
// At most 12 SQL calls/801 club witnesses. Two native writes, no engagement.
// One audit read, intent + attempt + generated-id checkpoints + completion.
// MyISAM insertion with an uncertain generated id is never silently repeated.
const {createHash}=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const {planIdentity,identity}=require("./nap-club-person-edit");
const {changedOptions,buildStatusStatement}=require("./nap-club-person-status");
const {person,OPTION_COLUMNS,normalizeOptions,SOURCES}=require("./nap-club-people");
const {inspectPeopleSchema,validate}=require("./nap-approved-people-schema");
const spec=SOURCES.officials;
function creation(input) {
  if(typeof input?.clubId!=="string" || !/^\d{1,16}$/.test(input.clubId) || !Number.isSafeInteger(Number(input.clubId)) || Number(input.clubId)<=0 || Number(input.clubId)>2147483647 || typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.creationId || "")) throw new TypeError("Creation et club autorise requis.");
  const raw=input.person;
  if(!raw || typeof raw!=="object" || Array.isArray(raw) || Object.keys(raw).length!==4 || Object.keys(raw).some(key=>!["firstName","lastName","birthDate","roles"].includes(key))) throw new TypeError("Identite et roles NAP seuls requis.");
  const roles=raw.roles;
  if(!roles || Object.keys(roles).length!==2 || Object.keys(roles).some(key=>!["teamLeader","official"].includes(key)) || typeof roles.teamLeader!=="boolean" || typeof roles.official!=="boolean" || !roles.teamLeader && !roles.official) throw new TypeError("Selectionnez au moins un role.");
  if(typeof raw.birthDate!=="string" || !raw.birthDate) throw new TypeError("Date de naissance requise.");
  const {id,...native}=planIdentity({id:0,nom:"",prenom:"",date:"0000-00-00",club:input.clubId},{firstName:raw.firstName,lastName:raw.lastName,birthDate:raw.birthDate});
  return {native,roles:{...roles}};
}
function creationStatement(native) {
  return {sql:"INSERT INTO officiels (nom,prenom,date,club) SELECT ?,?,?,? FROM clubs WHERE num_club=?",values:[native.nom,native.prenom,native.date,native.club,native.club]};
}
async function createNativePerson(pool,input,audit,authorize) {
  if(typeof authorize!=="function") throw new TypeError("Controle du club requis.");
  const proposed=creation(input);
  await authorize({clubId:input.clubId});
  const operation=createHash("sha256").update(JSON.stringify(["person-create",input.actorUid,input.clubId,input.creationId])).digest("hex");
  const connection=await pool.getConnection();let lock=null;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try {
    const name=`lp-person-club-${createHash("sha256").update(input.clubId).digest("hex").slice(0,40)}`;
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[name]))[0]?.acquired)!==1) throw new TypeError("Annuaire en cours de modification. Reessayez.");
    lock=name;
    const saved=await audit.read(operation);
    if(saved && (saved.kind!=="native-person-create" || saved.operation!==operation || saved.actorUid!==input.actorUid || saved.clubId!==input.clubId || saved.creationId!==input.creationId || !isDeepStrictEqual(saved.proposed,proposed) || !["prepared","writing","identified"].includes(saved.phase))) throw new TypeError("Reprise de creation incompatible. Conservez les valeurs initiales.");
    if(saved?.phase==="writing") throw new TypeError("Creation NAP a verifier avant toute nouvelle tentative : identifiant non confirme, sauvegarde conservee.");
    if(!validate(await inspectPeopleSchema(connection))) throw new TypeError("Complement NAP absent.");
    let plan=saved;
    if(!plan || plan.phase==="prepared") {
      const [club]=await query("SELECT num_club FROM clubs WHERE num_club=? LIMIT 1",[input.clubId]);
      if(!club || Number(club.num_club)!==Number(input.clubId)) throw new TypeError("Club NAP introuvable.");
      const peers=await query("SELECT id,nom,prenom,date,club FROM officiels FORCE INDEX (livepalmes_club_id) WHERE club=? ORDER BY id LIMIT 801",[input.clubId]);
      if(peers.length>800) throw new RangeError("Annuaire trop volumineux pour cette creation bornee.");
      if(peers.some(row=>String(row.club)!==input.clubId)) throw new TypeError("Annuaire hors club.");
      if(peers.some(row=>identity(row)===identity(proposed.native))) throw new TypeError("Cette personne existe deja dans le club. Utilisez sa fiche sans en creer une seconde.");
      if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('officiels','livepalmes_club_people_options') LIMIT 3")).length) throw new TypeError("Declencheur NAP a verifier avant creation.");
      if(!plan) {
        plan={kind:"native-person-create",operation,actorUid:input.actorUid,clubId:input.clubId,creationId:input.creationId,proposed,phase:"prepared",timestamp:new Date().toISOString().replace("T"," ").replace("Z","000")};
        await audit.prepare(operation,plan);
      }
      plan={...plan,phase:"writing"};
      await audit.checkpoint(operation,plan);
      const insertStatement=creationStatement(proposed.native);
      const inserted=await query(insertStatement.sql,insertStatement.values);
      if(inserted.affectedRows===0) {
        await audit.checkpoint(operation,{...plan,phase:"prepared"});
        throw new TypeError("Club NAP modifie ; aucune personne creee.");
      }
      if(inserted.affectedRows!==1 || !Number.isSafeInteger(Number(inserted.insertId)) || Number(inserted.insertId)<=0 || Number(inserted.insertId)>2147483647) throw new Error("Identifiant de creation non confirme.");
      plan={...plan,phase:"identified",nativeId:Number(inserted.insertId)};
      await audit.checkpoint(operation,plan);
    }
    if(!Number.isSafeInteger(plan.nativeId) || plan.nativeId<=0 || plan.nativeId>2147483647) throw new TypeError("Identifiant sauvegarde invalide.");
    const [native]=await query(`SELECT ${spec.columns.map(key=>`\`${key}\``).join(",")} FROM officiels WHERE id=? LIMIT 1`,[plan.nativeId]);
    if(!native || !isDeepStrictEqual(native,{id:plan.nativeId,...proposed.native})) throw new TypeError("La fiche creee a change. Verification requise ; aucun engagement modifie.");
    const after={...changedOptions("officials",native,null,true,plan.timestamp,input.actorUid),role_team_leader:proposed.roles.teamLeader?1:0,role_official:proposed.roles.official?1:0};
    // INSERT never overwrites existing options. A resumed INSERT is safe on its PK.
    try {
      const statement=buildStatusStatement("officials",native,null,after),result=await query(statement.sql,statement.values);
      if(result.affectedRows!==1) throw new TypeError("La fiche creee a change avant les roles. Verification requise.");
    } catch(error) {if(error.code!=="ER_DUP_ENTRY") throw error;}
    const [options]=await query(`SELECT ${OPTION_COLUMNS.map(key=>`\`${key}\``).join(",")} FROM livepalmes_club_people_options WHERE source='officiels' AND person_id=? LIMIT 1`,[plan.nativeId]);
    if(!isDeepStrictEqual(normalizeOptions(options),after)) throw new TypeError("Roles de la nouvelle fiche a verifier ; aucun role existant remplace.");
    await audit.complete(operation,{personId:`nap-official-${plan.nativeId}`,clubId:input.clubId,verified:true,entriesPreserved:true});
    return {ok:true,source:"nap",person:person(native,"officials",after),operation};
  } finally {
    let safe=true;
    try {if(lock && Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1) safe=false;}catch {safe=false;}
    finally {if(safe) connection.release();else connection.destroy();}
  }
}
module.exports={creation,creationStatement,createNativePerson};
