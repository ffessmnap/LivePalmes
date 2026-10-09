"use strict";
// Preview: four indexed reads, at most 426 candidate rows, no old directory.
// Creation: durable intent and generated-id checkpoint; alerts stay in the audit.
const {createHash}=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const {planIdentityChange}=require("./nap-portal-swimmer-change");
const {person}=require("./nap-portal-swimmers");
const rules=require("./nap-performance-normalization");
const {likeLiteral}=require("./nap-direct-search");
const {COLUMNS}=require("./nap-approved-swimmer-correction");
function proposed(input) {
  if(typeof input?.clubId!=="string" || !/^\d{1,16}$/.test(input.clubId)) throw new TypeError("Club NAP requis.");
  const raw=input.swimmer;
  if(!raw || typeof raw!=="object" || Array.isArray(raw) || Object.keys(raw).some(key=>!["firstName","lastName","birthDate","sex","licenseNumber"].includes(key))) throw new TypeError("Identite et licence seules requises.");
  if(typeof raw.licenseNumber!=="string" || !/^[A-Z]-\d{2}-\d+$/.test(raw.licenseNumber) || raw.licenseNumber.length>100) throw new TypeError("Une licence est obligatoire pour creer un nageur.");
  const {after}=planIdentityChange({id:1,nom:"",prenom:"",date:"0000-00-00",sexe:"",club:input.clubId},{firstName:raw.firstName,lastName:raw.lastName,birthDate:raw.birthDate,sex:raw.sex});
  const {id,...native}=after;
  return {...native,number:raw.licenseNumber,actif:1};
}
function tokens(value){return rules.normalizeIdentityText(value).split(/\s+/).filter(token=>token.length>=2);}
async function previewCreation(connection,input,authorize,formatAlert) {
  const native=proposed(input);
  if(typeof authorize!=="function" || typeof formatAlert!=="function") throw new TypeError("Controle du club et des alertes requis.");
  await authorize({clubId:input.clubId});
  const query=async(sql,values)=>(await connection.execute({sql,timeout:10000},values))[0];
  const matches=await query("SELECT id FROM nageurs FORCE INDEX (livepalmes_license_number_id) WHERE number=? LIMIT 2",[native.number]);
  if(matches.length) throw new TypeError("Cette licence existe deja dans NAP. Recherchez ou recuperez la fiche existante.");
  const candidates=new Map();
  const add=rows=>{for(const row of rows){if(!Number.isSafeInteger(Number(row.id)) || Number(row.id)<1) throw new TypeError("Fiche NAP incoherente.");candidates.set(String(row.id),person(row));}};
  const select="SELECT n.id,n.nom,n.prenom,n.date,n.sexe,n.number,n.club,cl.nom_club,cl.abre_club FROM";
  const exact="SELECT id FROM nageurs FORCE INDEX (nageurs_clef) WHERE nom=? AND prenom=? AND date=? LIMIT 11";
  const exactRows=await query(`${select} ((${exact}) UNION (${exact})) candidates JOIN nageurs n FORCE INDEX (PRIMARY) ON n.id=candidates.id LEFT JOIN clubs cl FORCE INDEX (PRIMARY) ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club LIMIT 22`,[native.nom,native.prenom,native.date,native.prenom,native.nom,native.date]);
  add(exactRows);
  const prefixes=[...new Set([tokens(native.nom)[0],tokens(native.prenom)[0]].filter(Boolean).map(token=>token.slice(0,Math.min(6,token.length))))];
  for(const prefix of prefixes) {
    const rows=await query(`${select} (SELECT id FROM nageurs FORCE INDEX (nageurs_clef) WHERE nom LIKE ? ESCAPE '=' LIMIT 201) candidates JOIN nageurs n FORCE INDEX (PRIMARY) ON n.id=candidates.id LEFT JOIN clubs cl FORCE INDEX (PRIMARY) ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club LIMIT 201`,[`${likeLiteral(prefix)}%`]);
    if(rows.length>200) throw new RangeError("Trop de rapprochements possibles. Verification nationale requise avant creation.");
    add(rows);
  }
  const key=rules.swimmerIdentityKey(native.prenom,native.nom,native.date),inverted=rules.swimmerIdentityKey(native.nom,native.prenom,native.date),alerts=[];
  for(const match of candidates.values()) {
    let type="";
    if(inverted!==key && match.identityKey===inverted) type="inverted-identity";
    else if(match.identityKey!==key) {
      const last=tokens(native.nom)[0]||"";
      if(!last || match.birthDate.slice(0,4)!==native.date.slice(0,4) || !tokens(match.lastName).some(token=>token.slice(0,Math.min(6,last.length))===last.slice(0,Math.min(6,last.length))) || !tokens(match.firstName).some(token=>tokens(native.prenom).some(inputToken=>token.slice(0,3)===inputToken.slice(0,3)))) continue;
      type="possible-duplicate";
    }
    alerts.push(formatAlert(match,type));
  }
  alerts.sort((a,b)=>Number(b.type==="inverted-identity")-Number(a.type==="inverted-identity") || Number(b.type==="club-change")-Number(a.type==="club-change") || String(a.name).localeCompare(String(b.name),"fr"));
  const selected=alerts.slice(0,8),blocksCreation=alerts.some(alert=>alert.type==="inverted-identity");
  return {ok:true,source:"nap",swimmer:person({id:0,...native}),alerts:selected,blocksCreation,requiresConfirmation:alerts.length>0 && !blocksCreation,sqlBudget:{queriesMax:4,rowsMax:426}};
}
function insertion(native,timestamp) {
  const keys=["nom","prenom","date","sexe","club","number","actif","creation"];
  return {sql:`INSERT INTO nageurs (${keys.map(key=>`\`${key}\``).join(",")}) SELECT ${keys.map(()=>"?").join(",")} FROM clubs cl FORCE INDEX (PRIMARY) WHERE cl.num_club=? AND NOT EXISTS (SELECT 1 FROM nageurs duplicate FORCE INDEX (livepalmes_license_number_id) WHERE duplicate.number=? LIMIT 1) AND NOT EXISTS (SELECT 1 FROM nageurs inverted FORCE INDEX (nageurs_clef) WHERE inverted.nom=? AND inverted.prenom=? AND inverted.date=? AND ?<>? LIMIT 1)`,values:[...keys.map(key=>key==="creation"?timestamp:native[key]),native.club,native.number,native.prenom,native.nom,native.date,native.prenom,native.nom]};
}
async function createSwimmer(pool,input,audit,authorize,formatAlert) {
  const native=proposed(input);
  if(typeof authorize!=="function" || typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.creationId||"")) throw new TypeError("Creation autorisee requise.");
  await authorize({clubId:input.clubId});
  const operation=createHash("sha256").update(JSON.stringify(["swimmer-create",input.actorUid,input.clubId,input.creationId])).digest("hex");
  const lock=`lp-swimmer-${createHash("sha256").update(native.number).digest("hex").slice(0,40)}`;
  const connection=await pool.getConnection();let locked=false;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  try {
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Licence en cours de modification. Reessayez.");
    locked=true;
    let plan=await audit.read(operation);
    if(plan && (plan.kind!=="native-swimmer-create" || plan.operation!==operation || plan.actorUid!==input.actorUid || plan.clubId!==input.clubId || plan.creationId!==input.creationId || !isDeepStrictEqual(plan.native,native) || !["prepared","writing","identified"].includes(plan.phase))) throw new TypeError("Reprise de creation incompatible. Conservez les valeurs initiales.");
    if(plan?.phase==="writing") throw new TypeError("Creation NAP a verifier : identifiant non confirme. Ne creez pas une seconde fiche.");
    if(!plan || plan.phase==="prepared") {
      const preview=await previewCreation(connection,input,authorize,formatAlert);
      if(preview.blocksCreation) throw new TypeError("Un nageur existe avec le nom et le prenom inverses.");
      if(preview.alerts.length && input.confirmAlerts!==true) throw new TypeError("Confirmez les rapprochements avant de creer le nageur.");
      if(plan && !isDeepStrictEqual(plan.alerts,preview.alerts)) throw new TypeError("Les rapprochements ont change. Verifiez de nouveau la creation.");
      if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='nageurs' LIMIT 1")).length) throw new TypeError("Declencheur NAP a verifier avant creation.");
      if(!plan) {
        plan={kind:"native-swimmer-create",operation,actorUid:input.actorUid,clubId:input.clubId,creationId:input.creationId,native,alerts:preview.alerts,phase:"prepared",timestamp:new Date().toISOString().slice(0,19).replace("T"," ")};
        await audit.prepare(operation,plan);
      }
      const statement=insertion(native,plan.timestamp),explain=await query(`EXPLAIN ${statement.sql}`,statement.values);
      if(!explain.some(row=>row.table==="duplicate" && row.key==="livepalmes_license_number_id") || !explain.some(row=>row.table==="cl" && row.key==="PRIMARY")) throw new TypeError("Plan de creation NAP non indexe.");
      plan={...plan,phase:"writing"};await audit.checkpoint(operation,plan);
      const inserted=await query(statement.sql,statement.values);
      if(inserted.affectedRows===0) {await audit.checkpoint(operation,{...plan,phase:"prepared"});throw new TypeError("Club ou licence modifies. Aucun nageur cree.");}
      if(inserted.affectedRows!==1 || !Number.isSafeInteger(Number(inserted.insertId)) || Number(inserted.insertId)<1 || Number(inserted.insertId)>2147483647) throw new Error("Identifiant de creation non confirme.");
      plan={...plan,phase:"identified",nativeId:Number(inserted.insertId)};await audit.checkpoint(operation,plan);
    }
    if(!Number.isSafeInteger(plan.nativeId) || plan.nativeId<1 || plan.nativeId>2147483647) throw new TypeError("Identifiant sauvegarde invalide.");
    const [row]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM nageurs WHERE id=? LIMIT 1`,[plan.nativeId]);
    if(!row || Object.entries(native).some(([key,value])=>row[key]!==value) || row.creation!==plan.timestamp) throw new TypeError("La fiche creee a change. Verification requise.");
    await audit.complete(operation,{swimmerId:String(plan.nativeId),clubId:input.clubId,alerts:plan.alerts,alertCount:plan.alerts.length,verified:true,licenseValidated:false});
    return {ok:true,source:"nap",operation,swimmer:{...person(row),alerts:plan.alerts,alertCount:plan.alerts.length},alerts:plan.alerts};
  } finally {
    let safe=true;
    try {if(locked && Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1) safe=false;}catch{safe=false;}
    finally{if(safe) connection.release();else connection.destroy();}
  }
}
module.exports={proposed,previewCreation,insertion,createSwimmer};
