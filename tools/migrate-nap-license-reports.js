"use strict";
// Explicit, bounded migration. Only PROD reports are official source records.
const fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const cryptoBackup=require("./production-backup-crypto");
function sealedBackup(file,data,key){const bytes=Buffer.from(JSON.stringify(data));const encrypted=cryptoBackup.seal(bytes,key);fs.writeFileSync(file,encrypted,{mode:0o600});if(!cryptoBackup.open(fs.readFileSync(file),key).equals(bytes))throw Error("Sauvegarde chiffrée non vérifiée");}
const root=path.resolve(__dirname,".."),{store,ddl,tables,hash,query}=require("../functions/nap-license-reports");
const columns=[[["season","varchar(9)","NO"],["competition_id","int","NO"],["version","int unsigned","NO"],["revision","char(64)","NO"],["summary","text","NO"]],[["season","varchar(9)","NO"],["competition_id","int","NO"],["version","int unsigned","NO"],["revision","char(64)","NO"],["report","mediumtext","NO"],["summary","text","NO"],["mail","text","YES"]]];
async function inspect(pool){
 const result=[];
 for(let i=0;i<tables.length;i++){
  const table=tables[i],meta=await query(pool,"SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? LIMIT 2",[table]);
  const cols=await query(pool,"SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION LIMIT 8",[table]);
  const keys=await query(pool,"SELECT INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 8",[table]);
  const expected=i?{PRIMARY:["season","competition_id","version"],competition_history:["competition_id"],report_revision:["season","competition_id","revision"]}:{PRIMARY:["season","competition_id"]};
  if(meta.length && (meta.length!==1||meta[0].ENGINE!=="InnoDB"||meta[0].TABLE_COLLATION!=="utf8mb4_unicode_ci"||cols.length!==columns[i].length||cols.some((c,j)=>c.COLUMN_NAME!==columns[i][j][0]||c.COLUMN_TYPE.replace(/\bint\(\d+\)/g,"int")!==columns[i][j][1]||c.IS_NULLABLE!==columns[i][j][2]||c.COLUMN_DEFAULT!==null||c.EXTRA)||keys.length!==Object.values(expected).flat().length||Object.entries(expected).some(([name,fields])=>{const actual=keys.filter(k=>k.INDEX_NAME===name);return actual.length!==fields.length||actual.some((k,j)=>k.COLUMN_NAME!==fields[j]||Number(k.SEQ_IN_INDEX)!==j+1||Number(k.NON_UNIQUE)!==(name==="competition_history"?1:0)||k.SUB_PART!==null);})))throw Error("Structure des bilans incompatible");
  if(!meta.length&&(cols.length||keys.length))throw Error("Structure orpheline");
  if((await query(pool,"SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE=? LIMIT 1",[table])).length)throw Error("Déclencheur inattendu");
  result.push({table,present:meta.length===1,meta,cols,keys});
 }
 return result;
}
function validate(report){
 require("../functions/nap-license-state").seasonInfo(report.season);
 require("../functions/nap-direct-calendar").positiveId(report.competitionId);
 if(!["ok","issues"].includes(report.status)||!Array.isArray(report.people)||!report.people.length||report.people.length>800||!/^[a-f0-9]{64}$/.test(report.revision)||!/^[a-f0-9]{64}$/.test(report.fingerprint)||!Number.isFinite(Date.parse(report.completedAt))||!report.completedBy||report.counts?.total!==report.people.length||Buffer.byteLength(JSON.stringify(report))>700000)throw Error("Bilan source incompatible");
 const counts=report.counts;
 if([counts.total,counts.valid,counts.expired,counts.notFound,counts.unconfirmed??counts.other??0].some(n=>!Number.isSafeInteger(n)||n<0)||counts.valid+counts.expired+counts.notFound+(counts.unconfirmed??counts.other??0)!==counts.total||report.people.some(p=>!["valid","licence_expiree","introuvable","anomalie_licence","anomalie_identite","ambigu","erreur","timeout","non_controle"].includes(p.status)))throw Error("Compteurs ou statuts incompatibles");
 return report;
}
async function source(db){
 const snapshot=await db.collection("engagementConfigurations").orderBy("__name__").startAt("license-control-").endBefore("license-control.").limit(1001).get();
 if(snapshot.size>1000)throw Error("Plus de 1 000 bilans : reprise à découper explicitement");
 return snapshot.docs.map(doc=>{const report=validate(doc.data());if(doc.id!==`license-control-${report.season}-${report.competitionId}`)throw Error("Identifiant source incompatible");return report;});
}
async function migrate(pool,db,phase,backup){
 const reports=await source(db),metadata=await inspect(pool),target=store(pool);
 const ids=[...new Set(reports.map(r=>Number(r.competitionId)))];
 if(ids.length){const competitions=await query(pool,`SELECT id FROM competitions FORCE INDEX(PRIMARY) WHERE id IN (${ids.map(()=>"?").join(",")}) LIMIT 1001`,ids);if(competitions.length!==ids.length)throw Error("Bilan rattaché à une compétition absente de NAP");}
 const before=[];
 for(const report of reports)before.push(metadata.every(m=>m.present)?await target.read(report.season,report.competitionId):null);
 const plan={sourceProject:"livepalmes",sourceHash:hash(reports),schemaHash:hash(metadata),targetHash:hash(before),reports,before,metadata,ddl};
 if(phase==="prepare")return plan;
 if(!backup||backup.sourceProject!=="livepalmes"||backup.sourceHash!==plan.sourceHash||hash(backup.reports)!==plan.sourceHash||backup.schemaHash!==plan.schemaHash||backup.targetHash!==plan.targetHash||hash(backup.before)!==plan.targetHash||hash(backup.ddl)!==hash(ddl))throw Error("La source ou la destination a changé depuis la sauvegarde");
 // DDL is additive and separately verified; never alters native tables.
 for(let i=0;i<metadata.length;i++)if(!metadata[i].present)await pool.query({sql:ddl[i],timeout:30000});
 if(!(await inspect(pool)).every(m=>m.present))throw Error("Structure incomplète");
 const sample=reports[0]||{season:"2026-2027",competitionId:"1"};
 const plans=[];
 for(const [sql,args] of [
  ["SELECT competition_id,summary FROM livepalmes_license_control_current WHERE season=? ORDER BY competition_id LIMIT 1001",[sample.season]],
  ["SELECT version,summary FROM livepalmes_license_control_history WHERE season=? AND competition_id=? AND version<? ORDER BY version DESC LIMIT 21",[sample.season,Number(sample.competitionId),2147483647]],
  ["SELECT 1 FROM livepalmes_license_control_history FORCE INDEX(competition_history) WHERE competition_id=? LIMIT 1",[Number(sample.competitionId)]]
 ]){const plan=await query(pool,"EXPLAIN "+sql,args);if(plan.some(r=>r.table&&!r.key&&!(Number(r.rows)<=2)))throw Error("Lecture NAP non indexée");plans.push(plan);}
 let imported=0;
 for(const report of reports){
  const current=await target.read(report.season,report.competitionId);
  if(current){if(hash(current)!==hash(report))throw Error("Bilan NAP différent : aucune fusion ni écrasement automatique");}
  else {await target.save(report,"");imported++;}
  if(hash(await target.read(report.season,report.competitionId))!==hash(report))throw Error("Relecture différente");
 }
 if(hash(await source(db))!==plan.sourceHash)throw Error("La source PROD a changé pendant la reprise : vérifier avant bascule");
 return {verified:true,imported,alreadyPresent:reports.length-imported,sourceHash:plan.sourceHash,tables,plans,realEmailsSent:0,nativeRowsChanged:0};
}
function officialDatabase(credentials,load=require("node:module").createRequire(path.join(root,"functions/package.json"))) {
 const {initializeApp,cert}=load("firebase-admin/app"),{getFirestore}=load("firebase-admin/firestore");
 return getFirestore(initializeApp({credential:cert(credentials),projectId:"livepalmes"}));
}
async function main(){
 const phase=process.env.NAP_LICENSE_PHASE;
 if(!["export","prepare","apply"].includes(phase)||process.env.NAP_LICENSE_CONFIRMATION!=="nap-license-reports-history")throw Error("Confirmation requise");
 const functionRequire=require("node:module").createRequire(path.join(root,"functions/package.json"));
 const admin=functionRequire("firebase-admin/app"),{getFirestore}=functionRequire("firebase-admin/firestore");
 const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));
 if(phase==="export"){
  if(credentials.project_id!=="livepalmes")throw Error("Source PROD requise");
  admin.initializeApp({credential:admin.credential.cert(credentials),projectId:"livepalmes"});
  const reports=await source(getFirestore());fs.mkdirSync("outputs/nap-license-reports",{recursive:true});
  const exported={sourceProject:"livepalmes",reports,hash:hash(reports)};fs.writeFileSync("outputs/nap-license-reports/source.json",JSON.stringify(exported));sealedBackup("outputs/nap-license-reports/source.enc",exported,credentials.private_key);return;
 }
 if(credentials.project_id!=="livepalmes-test")throw Error("Compte TEST requis pour NAP");
 const exported=JSON.parse(fs.readFileSync("outputs/nap-license-reports/source.json","utf8"));
 if(exported.sourceProject!=="livepalmes"||hash(exported.reports)!==exported.hash)throw Error("Sauvegarde source invalide");
 // No Firestore credentials in this phase; the export is authenticated separately.
 const db={collection:()=>({orderBy:()=>({startAt:()=>({endBefore:()=>({limit:()=>({get:async()=>({size:exported.reports.length,docs:exported.reports.map(r=>({id:`license-control-${r.season}-${r.competitionId}`,data:()=>r}))})})})})})})};
 const password=execFileSync("gcloud",["secrets","versions","access","latest","--secret=LIVEPALMES_NAP_PASSWORD","--project=livepalmes-test"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
 const pool=require("../functions/nap-mysql").createNapPool(password);
 try{const result=await migrate(pool,db,phase,phase==="apply"?JSON.parse(fs.readFileSync("outputs/nap-license-reports/before.json","utf8")):null);fs.writeFileSync(`outputs/nap-license-reports/${phase==="prepare"?"before":"result"}.json`,JSON.stringify(result));if(phase==="prepare")sealedBackup("outputs/nap-license-reports/before.enc",result,credentials.private_key);}finally{await pool.end();}
}
if(require.main===module)main().catch(error=>{console.error("Diagnostic technique :",error.name,/^[A-Z_0-9-]{1,60}$/.test(String(error.code))?error.code:"operation-refused");console.error("Reprise des bilans arrêtée ; conserver les preuves et examiner le conflit. Aucun secret affiché.");process.exitCode=1;});
module.exports={inspect,validate,source,migrate,columns,officialDatabase};
