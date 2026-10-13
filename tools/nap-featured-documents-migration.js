"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {createHash}=require("node:crypto");
const {documentOptionsContract}=require("../functions/nap-document-options-contract");
const {LOCK}=require("../functions/nap-featured-documents");
const ALTER_SQL=fs.readFileSync(path.join(__dirname,"nap-featured-documents-migration.sql"),"utf8").replace(/\r\n/g,"\n");
const hash=value=>createHash("sha256").update(value).digest("hex");
const q=async(connection,sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
async function inspect(connection){
 const columns=await q(connection,"SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livepalmes_document_options' ORDER BY ORDINAL_POSITION LIMIT 13");
 const indexes=await q(connection,"SELECT INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livepalmes_document_options' ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 3");
 const contract=documentOptionsContract(columns,indexes);
 const tables=await q(connection,"SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='livepalmes_document_options' LIMIT 2");
 if(tables.length!==1||tables[0].ENGINE!=="InnoDB"||tables[0].TABLE_COLLATION!=="utf8mb4_unicode_ci")throw Error("Unexpected complementary table");
 if((await q(connection,"SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='livepalmes_document_options' LIMIT 1")).length)throw Error("Unexpected complementary trigger");
 const ddl=(await q(connection,"SHOW CREATE TABLE livepalmes_document_options"))[0]["Create Table"];
 return {columns,indexes,contract,ddl};
}
async function migrateLocked(connection,backup){
 if(backup?.restorationVerified!==true||backup.twoCopiesVerified!==true||backup.reopenedVerified!==true||!/^[a-f0-9]{64}$/.test(backup.dataHash||"")||!/^[a-f0-9]{64}$/.test(backup.schemaHash||""))throw Error("Verified restored backup required");
 let namedLock=false,tableLock=false;
 try{
  if(Number((await q(connection,"SELECT GET_LOCK(?,0) AS acquired",[LOCK]))[0]?.acquired)!==1)throw Error("Another editorial operation is active");namedLock=true;
  const initial=await inspect(connection);
  if(initial.contract!=="original")throw Error("Migration already applied or schema drift; inspect explicitly");
  // A short native table lock stabilizes the exact backup comparison and DDL.
  // It blocks complementary writes without altering originals or their files.
  await connection.query({sql:"LOCK TABLES livepalmes_document_options WRITE",timeout:10000});tableLock=true;
  const before=await inspect(connection);
  if(before.contract!=="original"||hash(before.ddl)!==backup.schemaHash)throw Error("Schema changed since restored backup");
  const rows=await q(connection,"SELECT * FROM livepalmes_document_options ORDER BY document_id LIMIT 10001");
  if(rows.length>10000||rows.length!==backup.rows||hash(JSON.stringify(rows))!==backup.dataHash)throw Error("Data changed since restored backup");
  const started=Date.now();await connection.query({sql:ALTER_SQL,timeout:30000});
  const after=await inspect(connection);
  if(after.contract!=="featured")throw Error("Migration verification failed");
  const names=before.columns.map(column=>`\`${column.COLUMN_NAME}\``).join(",");
  const oldValues=await q(connection,`SELECT ${names} FROM livepalmes_document_options ORDER BY document_id LIMIT 10001`);
  if(hash(JSON.stringify(oldValues))!==backup.dataHash)throw Error("Original values changed; preserve backup and inspect");
  if((await q(connection,"SELECT document_id FROM livepalmes_document_options WHERE featured_rank IS NOT NULL LIMIT 7")).length)throw Error("Unexpected initial selection");
  return {verified:true,createdAt:new Date().toISOString(),rows:rows.length,beforeSchemaHash:backup.schemaHash,afterSchemaHash:hash(after.ddl),preservedDataHash:backup.dataHash,ddlHash:hash(ALTER_SQL),durationMs:Date.now()-started,dataRowsWritten:false,selectionRows:0};
 }finally{
  try{if(tableLock)await connection.query({sql:"UNLOCK TABLES",timeout:10000});}
  finally{if(namedLock)await q(connection,"SELECT RELEASE_LOCK(?)",[LOCK]);}
 }
}
module.exports={ALTER_SQL,inspect,migrateLocked};
