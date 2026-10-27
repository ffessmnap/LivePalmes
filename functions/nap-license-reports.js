"use strict";
// Business reports shared by TEST/PROD. No SMTP, swimmer validation or Firestore.
const {createHash}=require("node:crypto");
const {seasonInfo}=require("./nap-license-state");
const {positiveId}=require("./nap-direct-calendar");
const tables=["livepalmes_license_control_current","livepalmes_license_control_history"];
const ddl=[
 `CREATE TABLE ${tables[0]} (season varchar(9) NOT NULL,competition_id int NOT NULL,version int unsigned NOT NULL,revision char(64) NOT NULL,summary text NOT NULL,PRIMARY KEY(season,competition_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
 `CREATE TABLE ${tables[1]} (season varchar(9) NOT NULL,competition_id int NOT NULL,version int unsigned NOT NULL,revision char(64) NOT NULL,report mediumtext NOT NULL,summary text NOT NULL,mail text NULL,PRIMARY KEY(season,competition_id,version),UNIQUE KEY report_revision(season,competition_id,revision),KEY competition_history(competition_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];
const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const query=async(c,sql,args=[])=> (await c.execute({sql,timeout:10000},args))[0];
function key(season,competition){return [seasonInfo(season).label,positiveId(competition)];}
function revision(value){if(!/^[a-f0-9]{64}$/.test(value||""))throw new TypeError("Révision de bilan invalide.");return value;}
function summary(report){return require("./engagement-license-reports").view(report);}
function decode(row){if(!row)return null;const report=JSON.parse(row.report);return {...report,mail:row.mail?JSON.parse(row.mail):null};}
async function locked(pool,args,fn){
 const c=await pool.getConnection(),lock=`lp-license-${hash(args).slice(0,40)}`;let acquired=false,transaction=false;
 try{
  if(Number((await query(c,"SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1)throw new TypeError("Un contrôle de cette compétition est déjà en cours.");acquired=true;
  await c.beginTransaction();transaction=true;
  const result=await fn(c);await c.commit();transaction=false;return result;
 }finally{try{if(transaction)await c.rollback();}finally{try{if(acquired)await query(c,"SELECT RELEASE_LOCK(?)",[lock]);}finally{c.release();}}}
}
function store(pool){return {
 async summaries(season){
  const rows=await query(pool,`SELECT competition_id,summary FROM ${tables[0]} WHERE season=? ORDER BY competition_id LIMIT 1001`,[seasonInfo(season).label]);
  if(rows.length>1000)throw new RangeError("Plus de 1 000 contrôles dans cette saison.");
  return {reports:Object.fromEntries(rows.map(r=>[String(r.competition_id),JSON.parse(r.summary)])),readStats:{napQueries:1,napRows:rows.length,firestoreDocuments:0}};
 },
 async readMany(season,ids){
  if(!Array.isArray(ids)||!ids.length||ids.length>5)throw new TypeError("Sélection de bilans invalide.");
  const keys=ids.map(positiveId),rows=await query(pool,`SELECT h.report,h.mail FROM ${tables[0]} c JOIN ${tables[1]} h ON h.season=c.season AND h.competition_id=c.competition_id AND h.version=c.version WHERE c.season=? AND c.competition_id IN (${keys.map(()=>"?").join(",")}) LIMIT 5`,[seasonInfo(season).label,...keys]);
  return new Map(rows.map(r=>{const p=decode(r);return [String(p.competitionId),p];}));
 },
 async read(season,id){return (await this.readMany(season,[id])).get(String(positiveId(id)))||null;},
 async save(report,expectedRevision=""){
  const args=key(report.season,report.competitionId);revision(report.revision);
  if(Buffer.byteLength(JSON.stringify(report))>700000)throw new RangeError("Bilan trop volumineux.");
  return locked(pool,args,async c=>{
   const rows=await query(c,`SELECT version,revision FROM ${tables[0]} WHERE season=? AND competition_id=? LIMIT 1 FOR UPDATE`,args),previous=rows[0];
   if((previous?.revision||"")!==expectedRevision)throw new TypeError("Le bilan a été modifié par une autre personne. Rechargez avant de le remplacer.");
   const version=Number(previous?.version||0)+1;
   const inserted=await query(c,`INSERT INTO ${tables[1]} (season,competition_id,version,revision,report,summary,mail) SELECT ?,?,?,?,?,?,? FROM competitions WHERE id=?`,[...args,version,report.revision,JSON.stringify({...report,mail:null}),JSON.stringify(summary(report)),report.mail?JSON.stringify(report.mail):null,args[1]]);
   if(inserted.affectedRows!==1)throw new TypeError("La compétition n’existe plus. Aucun bilan enregistré.");
   await query(c,`INSERT INTO ${tables[0]} (season,competition_id,version,revision,summary) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE version=VALUES(version),revision=VALUES(revision),summary=VALUES(summary)`,[...args,version,report.revision,JSON.stringify(summary(report))]);
   return {version};
  });
 },
 async history(season,id,before){
  const args=key(season,id);if(before!==undefined&&(!Number.isSafeInteger(before)||before<1))throw new TypeError("Page d’historique invalide.");
  const rows=await query(pool,`SELECT version,summary FROM ${tables[1]} WHERE season=? AND competition_id=?${before!==undefined?" AND version<?":""} ORDER BY version DESC LIMIT 21`,[...args,...(before!==undefined?[before]:[])]);
  return {reports:rows.slice(0,20).map(r=>({...JSON.parse(r.summary),version:Number(r.version)})),nextBefore:rows.length>20?Number(rows[19].version):null};
 },
 async readVersion(season,id,version){
  if(!Number.isSafeInteger(version)||version<1)throw new TypeError("Version de bilan invalide.");
  return decode((await query(pool,`SELECT report,mail FROM ${tables[1]} WHERE season=? AND competition_id=? AND version=? LIMIT 1`,[...key(season,id),version]))[0]);
 },
 async markMail(report,mail){
  const args=key(report.season,report.competitionId);
  return locked(pool,args,async c=>{
   const rows=await query(c,`SELECT version,revision FROM ${tables[0]} WHERE season=? AND competition_id=? LIMIT 1 FOR UPDATE`,args);
   if(rows[0]?.revision!==report.revision)throw new TypeError("Le bilan a changé pendant l’envoi.");
   const current=decode((await query(c,`SELECT report,mail FROM ${tables[1]} WHERE season=? AND competition_id=? AND version=? LIMIT 1 FOR UPDATE`,[...args,rows[0].version]))[0]);
   const receipt=current.mail?.sentAt?current.mail:mail;
   await query(c,`UPDATE ${tables[1]} SET mail=?,summary=? WHERE season=? AND competition_id=? AND version=?`,[JSON.stringify(receipt),JSON.stringify(summary({...current,mail:receipt})),...args,rows[0].version]);
   await query(c,`UPDATE ${tables[0]} SET summary=? WHERE season=? AND competition_id=?`,[JSON.stringify(summary({...current,mail:receipt})),...args]);
  });
 }
};}
module.exports={store,tables,ddl,hash,query};
