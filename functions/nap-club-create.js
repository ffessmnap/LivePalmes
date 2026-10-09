"use strict";
// At most seven SQL calls, one native insert, durable generated-id checkpoint.
const {createHash}=require("node:crypto"),{isDeepStrictEqual}=require("node:util");
const {COLUMNS}=require("./nap-club-change"),directory=require("./nap-club-directory");
function proposed(raw) {
 const c=require("./engagement-clubs").cleanClubPayload(raw,{});
 return {federal_club:c.federalNumber,nom_club:c.clubName,abre_club:c.clubCode,hc_club:"",comite_club:directory.region(c.regionId),actif_club:c.active?1:0,postalcode:c.postalCode,longitude:"",latitude:"",ville:c.city,web:"",enf:0,cnnp:0,email:"",tel:"",logo:""};
}
function statement(native,timestamp) {
 const keys=COLUMNS.filter(key=>key!=="num_club");
 return {sql:`INSERT INTO clubs (${keys.map(key=>`\`${key}\``).join(",")}) SELECT ${keys.map(()=>"?").join(",")} WHERE NOT EXISTS (SELECT 1 FROM clubs duplicate FORCE INDEX (livepalmes_federal_id) WHERE federal_club=? LIMIT 1)`,values:[...keys.map(key=>key==="integrationdate"?timestamp:native[key]),native.federal_club]};
}
async function create(pool,input,audit,authorize) {
 if(!input?.actorUid || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.creationId||"") || typeof authorize!=="function") throw new TypeError("Creation nationale requise.");
 await authorize();const native=proposed(input.club),operation=createHash("sha256").update(JSON.stringify([input.actorUid,input.creationId])).digest("hex");
 const connection=await pool.getConnection();let locked=false;
 const query=async(sql,values=[])=>(await connection.execute({sql,timeout:10000},values))[0];
 const lock=`lp-club-${createHash("sha256").update(native.federal_club).digest("hex").slice(0,40)}`;
 try {
  if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1) throw new TypeError("Club en cours de creation. Reessayez.");locked=true;
  let saved=await audit.read(operation);
  if(saved && (saved.operation!==operation || saved.actorUid!==input.actorUid || saved.creationId!==input.creationId || !isDeepStrictEqual(saved.native,native) || !["prepared","writing","identified"].includes(saved.phase))) throw new TypeError("Reprise de creation incompatible.");
  if(saved?.phase==="writing") throw new TypeError("Creation NAP a verifier : identifiant non confirme. Ne creez pas un second club.");
  if(!saved || saved.phase==="prepared") {
   if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='clubs' LIMIT 1")).length) throw new TypeError("Declencheur club a verifier.");
   const timestamp=saved?.timestamp||new Date().toISOString().slice(0,19).replace("T"," ");
   const insert=statement(native,timestamp),plans=await query(`EXPLAIN ${insert.sql}`,insert.values);
   if(!plans.some(row=>row.table==="duplicate" && row.key==="livepalmes_federal_id")) throw new TypeError("Index federal absent.");
   if(!saved){saved={operation,actorUid:input.actorUid,creationId:input.creationId,native,timestamp,phase:"prepared"};await audit.prepare(operation,saved);}
   saved={...saved,phase:"writing"};await audit.checkpoint(operation,saved);
   const inserted=await query(insert.sql,insert.values);
   if(inserted.affectedRows===0){await audit.checkpoint(operation,{...saved,phase:"prepared"});throw new TypeError("Ce numero federal existe deja dans NAP.");}
   if(inserted.affectedRows!==1 || !Number.isSafeInteger(Number(inserted.insertId)) || Number(inserted.insertId)<1 || Number(inserted.insertId)>2147483647) throw new Error("Identifiant club non confirme.");
   saved={...saved,phase:"identified",nativeId:Number(inserted.insertId)};await audit.checkpoint(operation,saved);
  }
  if(!Number.isSafeInteger(saved.nativeId)||saved.nativeId<1) throw new TypeError("Identifiant club sauvegarde invalide.");
  const [row]=await query(`SELECT ${COLUMNS.map(key=>`\`${key}\``).join(",")} FROM clubs WHERE num_club=? LIMIT 1`,[saved.nativeId]);
  if(!row || Object.entries(native).some(([key,value])=>row[key]!==value) || row.integrationdate!==saved.timestamp) throw new TypeError("Club cree modifie. Verification requise.");
  await audit.complete(operation,{clubId:String(saved.nativeId),verified:true,created:true});
  return {ok:true,source:"nap",created:true,club:directory.club(row)};
 }finally {
  let safe=true;try{if(locked && Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1)safe=false;}catch{safe=false;}
  finally{if(safe)connection.release();else connection.destroy();}
 }
}
module.exports={proposed,statement,create};
