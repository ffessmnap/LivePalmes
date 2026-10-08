"use strict";
// Fixed creation budget: <=18 SQL calls, then the existing bounded detail reader.
// Native MyISAM inserts are checkpointed; an uncertain generated id is never retried.
const {createHash}=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const contract=require("./nap-competition-create-schema.json");
const schema=require("./nap-approved-portal-schema");
const {nativeEqual}=require("./nap-native-compare");
function planCreation(input) {
  if(typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.creationId || "")) throw new TypeError("Identifiant de creation requis.");
  const event=input.event;
  if(!event || !["pool","openWater"].includes(event.competitionType) || !["departemental","regional","national","international"].includes(event.level)) throw new TypeError("Type ou niveau invalide.");
  const text=(value,max,required=false)=>{if(typeof value!=="string" || value.length>max || /[\u0000-\u001f]/.test(value) || required&&!value.trim()) throw new TypeError("Champ de creation invalide."); return value.trim();};
  const day=value=>{if(typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value+"T12:00:00Z")) || new Date(value+"T12:00:00Z").toISOString().slice(0,10)!==value) throw new TypeError("Date invalide.");return value;};
  const name=text(event.name,160,true),city=text(event.city,64,true),date=day(event.date),enddate=day(event.endDate||date);
  if(enddate<date) throw new TypeError("Dates inversees.");
  // Reject unsupported characters instead of MySQL silently replacing them in latin1.
  if(/[^\u0020-\u00ff]/.test(name+city)) throw new TypeError("Le nom et la ville contiennent un caractere non compatible avec NAP.");
  const comite=Number(input.committeeId);
  if(!Number.isInteger(comite)||comite<1||comite>2147483647) throw new TypeError("Region NAP requise.");
  const competition={libelle:name,lieu:city,date,enddate,comite,comments:"",filepdf:null,filetxt:null,bassin:null,chrono:null,ld:event.competitionType==="openWater"?1:0,wid:"",equipe:null,reference:0,arrived:null,integration:null,type:6,organisateur:0,delegue:"",typecnc:event.competitionType==="openWater"?1:0,derogation:0,affiche:"",live:0,qualiffrance:0,description:"",integrationstatus:0};
  const parameters={cat_d:null,cat_f:null,tps_d:null,tps_f:null,date_limit:null,actif:0,dateactif:null,mailtxt:"",mailjuges:"",user:null,sendtxt:0,sendpdfclubs:0,sendpdfjuges:0,sendforfait:0,qualif:0,who:null,officiel:0,saisie:1,relais:0,wc:null,send48:0,niveau:({departemental:0,regional:1,national:2,international:8})[event.level],open:0,type_chrono_elec:0,nb_nageurs:0,no_premiere_ligne:1,nb_lignes:0,mailcontrole:"",sendpdfcontrole:0,logocompet:"",live_header:"",live_hashtag:""};
  return {competition,parameters};
}
function insert(table,row,guard=null) {
  if(!["competitions","compet_parametres","livepalmes_competition_options"].includes(table)) throw new TypeError("Table invalide.");
  const keys=Object.keys(row);
  return {sql:`INSERT INTO \`${table}\` (${keys.map(k=>`\`${k}\``).join(",")}) ${guard ? `SELECT ${keys.map(()=>"?").join(",")} FROM DUAL WHERE ${guard.sql}` : `VALUES (${keys.map(()=>"?").join(",")})`}`,values:[...Object.values(row),...(guard?.values||[])]};
}
function competitionGuard(id,row) {
  return {sql:`EXISTS(SELECT 1 FROM competitions FORCE INDEX(PRIMARY) WHERE id=? AND ${Object.keys(row).map(k=>nativeEqual(`\`${k}\``)).join(" AND ")})`,values:[id,...Object.values(row)]};
}
async function createCompetition(pool,input,audit,authorize) {
  const proposed=planCreation(input);
  if(typeof authorize!=="function") throw new TypeError("Controle du perimetre requis.");
  await authorize(input.event);
  const operation=createHash("sha256").update(JSON.stringify(["competition-create",input.actorUid,input.creationId])).digest("hex");
  const connection=await pool.getConnection();let locked=false;
  const query=async(sql,values=[])=> (await connection.execute({sql,timeout:10000},values))[0];
  const readRow=async(table,id)=> (await query(`SELECT * FROM \`${table}\` FORCE INDEX(PRIMARY) WHERE ${table==="livepalmes_competition_options"?"competition_id":"id"}=? LIMIT 1`,[id]))[0];
  const verify=(row,expected)=> {if(!row||Object.entries(expected).some(([key,value])=>!isDeepStrictEqual(row[key],value))) throw new TypeError("La nouvelle competition a change. Verification requise.");};
  try {
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",["lp-competition-create"]))[0]?.acquired)!==1) throw new TypeError("Creation en cours. Reessayez.");
    locked=true;
    let saved=await audit.read(operation);
    if(saved && (saved.actorUid!==input.actorUid || saved.creationId!==input.creationId || saved.operation!==operation || !isDeepStrictEqual(saved.proposed,proposed))) throw new TypeError("Reprise incompatible : conservez les valeurs initiales.");
    if(saved?.phase==="writing") throw new TypeError("Creation a verifier : identifiant non confirme. Ne creez pas un doublon.");
    if(saved?.phase==="complete") {await audit.complete(operation,{competitionId:saved.nativeId,verified:true});return {ok:true,source:"nap",competitionId:`legacy-nap-${saved.nativeId}`,resumed:true};}
    for(const table of ["competitions","compet_parametres"]) {
      const rows=await query(`SHOW CREATE TABLE \`${table}\``);
      if(rows.length!==1 || rows[0]["Create Table"].replace(/AUTO_INCREMENT=\d+/,"AUTO_INCREMENT=0")!==contract[table]) throw new TypeError("Structure NAP modifiee : creation a verifier.");
    }
    const metadata=await schema.inspect(connection);
    if(!metadata.columns.some(c=>c.TABLE_NAME==="livepalmes_competition_options" && c.COLUMN_NAME==="entry_closed")) throw new TypeError("Champ de fermeture NAP absent : creation a verifier.");
    if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN ('competitions','compet_parametres','livepalmes_competition_options') LIMIT 4")).length) throw new TypeError("Declencheur NAP a verifier.");
    const kinds=await query("SELECT id,label FROM compet_types FORCE INDEX(PRIMARY) WHERE id IN (0,1) ORDER BY id LIMIT 3");
    if(!isDeepStrictEqual(kinds,[{id:0,label:"Piscine"},{id:1,label:"Eau libre"}])) throw new TypeError("Types NAP modifies.");
    const scopes=await query("SELECT id,label FROM compet_type FORCE INDEX(PRIMARY) WHERE id=6 LIMIT 1");
    if(!isDeepStrictEqual(scopes,[{id:6,label:"AUTRE"}])) throw new TypeError("Type general NAP modifie.");
    if(!saved) {
      saved={operation,creationId:input.creationId,actorUid:input.actorUid,proposed,phase:"prepared",timestamp:new Date().toISOString().replace("T"," ").replace("Z","000")};
      await audit.prepare(operation,saved);
    }
    if(saved.phase==="prepared") {
      await authorize(input.event);
      saved={...saved,phase:"writing"};await audit.checkpoint(operation,saved);
      const statement=insert("competitions",proposed.competition),result=await query(statement.sql,statement.values);
      if(result.affectedRows!==1 || !Number.isSafeInteger(Number(result.insertId)) || Number(result.insertId)<=0 || Number(result.insertId)>2147483647) throw new Error("Identifiant de competition non confirme.");
      saved={...saved,phase:"identified",nativeId:Number(result.insertId)};await audit.checkpoint(operation,saved);
    }
    if(!["identified","parameters","options"].includes(saved.phase)) throw new TypeError("Etat de creation incompatible.");
    verify(await readRow("competitions",saved.nativeId),{id:saved.nativeId,...proposed.competition});
    const parameters={compet:saved.nativeId,...proposed.parameters};
    if(saved.phase==="identified") {
      // No retry if the native parameters generated-id checkpoint is uncertain.
      saved={...saved,phase:"writing"};await audit.checkpoint(operation,saved);
      const guard=competitionGuard(saved.nativeId,proposed.competition);
      guard.sql+=" AND NOT EXISTS(SELECT 1 FROM compet_parametres FORCE INDEX(compet) WHERE compet=? LIMIT 1)";guard.values.push(saved.nativeId);
      const statement=insert("compet_parametres",parameters,guard),result=await query(statement.sql,statement.values);
      if(result.affectedRows!==1 || !Number.isSafeInteger(Number(result.insertId)) || Number(result.insertId)<=0 || Number(result.insertId)>2147483647) throw new Error("Identifiant de parametres non confirme.");
      saved={...saved,phase:"parameters",parameterId:Number(result.insertId)};await audit.checkpoint(operation,saved);
    }
    verify(await readRow("compet_parametres",saved.parameterId),{id:saved.parameterId,...parameters});
    const options=Object.fromEntries(schema.tables[0].columns.map(c=>[c.name,c.name==="competition_id"?saved.nativeId:c.name==="version"?"1":c.name.endsWith("_at")?saved.timestamp:c.name.endsWith("_by")?input.actorUid:null]));
    options.entry_closed=null;
    if(saved.phase==="parameters") {
      const guard=competitionGuard(saved.nativeId,proposed.competition);
      guard.sql+=` AND EXISTS(SELECT 1 FROM compet_parametres FORCE INDEX(PRIMARY) WHERE id=? AND ${Object.keys(parameters).map(k=>nativeEqual(`\`${k}\``)).join(" AND ")})`;guard.values.push(saved.parameterId,...Object.values(parameters));
      const statement=insert("livepalmes_competition_options",options,guard);
      try {if((await query(statement.sql,statement.values)).affectedRows!==1) throw new Error("Complement non enregistre.");} catch(error){if(error.code!=="ER_DUP_ENTRY") throw error;}
    }
    verify(await readRow("livepalmes_competition_options",saved.nativeId),options);
    saved={...saved,phase:"complete"};await audit.checkpoint(operation,saved);await audit.complete(operation,{competitionId:saved.nativeId,verified:true});
    return {ok:true,source:"nap",competitionId:`legacy-nap-${saved.nativeId}`};
  } finally {if(locked) await query("SELECT RELEASE_LOCK(?)",["lp-competition-create"]);connection.release();}
}
module.exports={planCreation,insert,competitionGuard,createCompetition};
