"use strict";
const {createHash,randomUUID}=require("node:crypto");
const {documentOptionsContract}=require("./nap-document-options-contract");
const {publicDocument}=require("./nap-public-documents");
const {publicUrl}=require("./nap-direct-calendar");
const LOCK="livepalmes-featured-documents";
const MAX_VERSION=Number.MAX_SAFE_INTEGER-2;
const digest=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const q=async(connection,sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
const utcStamp=()=>new Date().toISOString().replace("T"," ").replace("Z","000");
function selectionInput(input){
 if(!input||!Array.isArray(input.documentIds)||input.documentIds.length>6||new Set(input.documentIds).size!==input.documentIds.length||input.documentIds.some(id=>!Number.isSafeInteger(id)||id<1||id>2147483647)||!/^[a-f0-9]{64}$/.test(input.expectedFingerprint||""))throw new TypeError("Sélection documentaire invalide.");
 return {documentIds:[...input.documentIds],expectedFingerprint:input.expectedFingerprint};
}
async function readSelection(connection){
 const rows=await q(connection,"SELECT o.document_id,o.featured_rank,o.version,d.id,d.name,d.date,d.location,d.type,d.element,t.label AS type_label,e.title AS element_label FROM livepalmes_document_options o FORCE INDEX (livepalmes_document_featured_rank) LEFT JOIN documents d FORCE INDEX (PRIMARY) ON d.id=o.document_id AND d.public='Y' AND d.competition=0 LEFT JOIN documents_types t FORCE INDEX (PRIMARY) ON t.id=d.type LEFT JOIN elements e FORCE INDEX (PRIMARY) ON e.id=d.element WHERE o.featured_rank IS NOT NULL ORDER BY o.featured_rank LIMIT 7");
 if(rows.length>6||rows.some((row,i)=>Number(row.featured_rank)!==i+1||!Number.isSafeInteger(Number(row.version))||Number(row.version)<1))throw new TypeError("Sélection documentaire à vérifier.");
 const documents=rows.map(row=>{
  const item=row.id==null?null:publicDocument(row);
  return item?{...item,available:Boolean(item.url)}:{id:Number(row.document_id),title:"Document indisponible",available:false};
 });
 return {documents,fingerprint:digest(rows.map(row=>[Number(row.document_id),Number(row.featured_rank),Number(row.version),row.id==null?null:[row.name,row.date,row.location,row.type,row.element]])),state:rows.map(row=>({documentId:Number(row.document_id),rank:Number(row.featured_rank),version:Number(row.version)}))};
}
async function assertExtendedContract(connection){
 const columns=await q(connection,"SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livepalmes_document_options' ORDER BY ORDINAL_POSITION LIMIT 13");
 const indexes=await q(connection,"SELECT INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livepalmes_document_options' ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 3");
 if(documentOptionsContract(columns,indexes)!=="featured")throw new TypeError("La sélection documentaire n’est pas encore disponible.");
 const tables=await q(connection,"SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('documents','livepalmes_document_options') LIMIT 3");
 if(tables.length!==2||!tables.some(row=>row.TABLE_NAME==="documents"&&row.ENGINE==="MyISAM")||!tables.some(row=>row.TABLE_NAME==="livepalmes_document_options"&&row.ENGINE==="InnoDB"&&row.TABLE_COLLATION==="utf8mb4_unicode_ci"))throw new TypeError("Structure documentaire à vérifier.");
 if((await q(connection,"SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='livepalmes_document_options' LIMIT 1")).length)throw new TypeError("Déclencheur documentaire à vérifier.");
}
async function assertEligible(connection,ids){
 if(!ids.length)return;
 const found=await q(connection,`SELECT id,location FROM documents FORCE INDEX (PRIMARY) WHERE id IN (${ids.map(()=>"?").join(",")}) AND public='Y' AND competition=0 LIMIT 6`,ids);
 if(found.length!==ids.length||ids.some(id=>!found.some(row=>Number(row.id)===id&&publicUrl(row.location))))throw new TypeError("Sélectionnez uniquement des documents généraux encore publics avec un lien disponible.");
}
async function saveSelection(pool,input,services){
 const clean=selectionInput(input);
 // Authentication and national scope are an injected server operation, not a
 // client boolean or a role inferred from the contents of the request.
 const actor=await services.authorize();
 if(!actor||actor.national!==true||typeof actor.uid!=="string"||!actor.uid||actor.uid.length>128)throw new TypeError("Administration nationale requise.");
 const connection=await pool.getConnection();let locked=false,inTransaction=false;
 try{
  if(Number((await q(connection,"SELECT GET_LOCK(?,0) AS acquired",[LOCK]))[0]?.acquired)!==1)throw new TypeError("La sélection est en cours de modification. Réessayez.");
  locked=true;
  await assertExtendedContract(connection);
  await connection.beginTransaction();inTransaction=true;
  const before=await readSelection(connection);
  if(before.fingerprint!==clean.expectedFingerprint)throw new TypeError("La sélection a changé. Rechargez avant d’enregistrer.");
  await assertEligible(connection,clean.documentIds);
  if(JSON.stringify(before.state.map(row=>row.documentId))===JSON.stringify(clean.documentIds)){await connection.rollback();inTransaction=false;return {documents:before.documents,fingerprint:before.fingerprint,unchanged:true};}
  if(before.state.some(row=>row.version>MAX_VERSION))throw new TypeError("Version documentaire à vérifier.");
  // CAS prevents duplicate commits; a distinct journal attempt also permits a
  // deliberate reload/retry after a verified transaction rollback.
  const operation=digest([actor.uid,clean.expectedFingerprint,clean.documentIds,randomUUID()]);
  if(await services.audit.read(operation))throw new TypeError("Cette opération dispose déjà d’une sauvegarde. Vérifiez son état avant de la reprendre.");
  const options=clean.documentIds.length?await q(connection,`SELECT document_id,version FROM livepalmes_document_options FORCE INDEX (PRIMARY) WHERE document_id IN (${clean.documentIds.map(()=>"?").join(",")}) LIMIT 6 FOR UPDATE`,clean.documentIds):[];
  if(options.some(row=>!Number.isSafeInteger(Number(row.version))||Number(row.version)<1||Number(row.version)>MAX_VERSION))throw new TypeError("Version documentaire à vérifier.");
  await services.audit.prepare(operation,{kind:"nap-featured-documents",before:before.state,existingOptions:options,after:clean.documentIds,actorUid:actor.uid});
  const now=utcStamp();
  if(before.state.length)await q(connection,"UPDATE livepalmes_document_options SET featured_rank=NULL,version=version+1,updated_at=?,updated_by=? WHERE featured_rank IS NOT NULL LIMIT 6",[now,actor.uid]);
  for(let i=0;i<clean.documentIds.length;i++){
   await q(connection,"INSERT INTO livepalmes_document_options (document_id,category,file_name,storage_path,content_type,size,version,created_at,updated_at,created_by,updated_by,featured_rank) VALUES (?,NULL,NULL,NULL,NULL,NULL,1,?,?,?,?,?) ON DUPLICATE KEY UPDATE featured_rank=VALUES(featured_rank),version=version+1,updated_at=VALUES(updated_at),updated_by=VALUES(updated_by)",[clean.documentIds[i],now,now,actor.uid,actor.uid,i+1]);
  }
  // Native documents are MyISAM: this recheck narrows external races, while all
  // public reads independently enforce current native eligibility as well.
  await assertEligible(connection,clean.documentIds);
  const after=await readSelection(connection);
  if(JSON.stringify(after.state.map(row=>row.documentId))!==JSON.stringify(clean.documentIds))throw new Error("Selection verification failed");
  const freshActor=await services.authorize();
  if(freshActor?.national!==true||freshActor.uid!==actor.uid)throw new TypeError("Administration nationale requise.");
  await connection.commit();inTransaction=false;
  await services.audit.complete(operation,{verified:true,before:before.state,after:after.state});
  return {documents:after.documents,fingerprint:after.fingerprint};
 }finally{
  try{if(inTransaction)await connection.rollback();}
  finally{try{if(locked)await q(connection,"SELECT RELEASE_LOCK(?)",[LOCK]);}finally{connection.release();}}
 }
}
module.exports={LOCK,selectionInput,readSelection,saveSelection,assertExtendedContract};
