"use strict";
const assert=require("node:assert/strict");
const {createHash}=require("node:crypto");
const {migrateLocked}=require("../tools/nap-featured-documents-migration");
const {FILE_SCHEMA,NULLABLE_FILE_FIELDS}=require("../functions/nap-document-options-contract");
const hash=value=>createHash("sha256").update(value).digest("hex");
function fixture(settings={}){
 let extended=false;const log=[],rows=[{document_id:1,version:"1",file_name:"original.pdf"}];
 const connection={execute:async({sql})=>{
  log.push(sql);
  if(sql.includes("GET_LOCK"))return [[{acquired:settings.locked?0:1}]];
  if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
  if(sql.includes("information_schema.COLUMNS"))return [[...FILE_SCHEMA.map(([COLUMN_NAME,COLUMN_TYPE])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:extended&&NULLABLE_FILE_FIELDS.has(COLUMN_NAME)?"YES":"NO",COLUMN_DEFAULT:null,EXTRA:""})),...extended?[{COLUMN_NAME:"featured_rank",COLUMN_TYPE:"tinyint unsigned",IS_NULLABLE:"YES",COLUMN_DEFAULT:null,EXTRA:""}]:[]]];
  if(sql.includes("information_schema.STATISTICS"))return [[...extended?[{INDEX_NAME:"livepalmes_document_featured_rank",COLUMN_NAME:"featured_rank",SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null}]:[],{INDEX_NAME:"PRIMARY",COLUMN_NAME:"document_id",SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null}]];
  if(sql.includes("information_schema.TABLES"))return [[{TABLE_NAME:"livepalmes_document_options",ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}]];
  if(sql.includes("information_schema.TRIGGERS"))return [[]];
  if(sql.startsWith("SHOW CREATE"))return [[{"Create Table":extended?"extended-ddl":"original-ddl"}]];
  if(sql.startsWith("SELECT *")||sql.startsWith("SELECT `"))return [settings.dataDrift?[{...rows[0],version:"2"}]:rows];
  if(sql.startsWith("SELECT document_id FROM"))return [[]];
  throw Error("Unexpected SQL");
 },query:async({sql})=>{log.push(sql);if(sql.includes("ALTER TABLE")){if(settings.failAlter)throw Error("injected DDL failure");extended=true;}return [[]];}};
 return {connection,log,backup:{restorationVerified:true,twoCopiesVerified:true,reopenedVerified:true,dataHash:hash(JSON.stringify(rows)),schemaHash:hash("original-ddl"),rows:1}};
}
(async()=>{
 const success=fixture();const result=await migrateLocked(success.connection,success.backup);assert.equal(result.verified,true);assert.equal(result.dataRowsWritten,false);assert.equal(result.selectionRows,0);
 assert.ok(success.log.findIndex(sql=>sql.startsWith("LOCK TABLES"))<success.log.findIndex(sql=>sql.includes("ALTER TABLE")));
 assert.ok(success.log.includes("UNLOCK TABLES"));assert.ok(success.log.at(-1).includes("RELEASE_LOCK"));assert.ok(!success.log.some(sql=>/^(INSERT|UPDATE|DELETE) /.test(sql)));
 const unverified=fixture();await assert.rejects(migrateLocked(unverified.connection,{...unverified.backup,restorationVerified:false}),/backup/);assert.equal(unverified.log.length,0);
 const locked=fixture({locked:true});await assert.rejects(migrateLocked(locked.connection,locked.backup),/active/);assert.equal(locked.log.length,1);
 const changed=fixture({dataDrift:true});await assert.rejects(migrateLocked(changed.connection,changed.backup),/Data changed/);assert.ok(!changed.log.some(sql=>sql.includes("ALTER TABLE")));assert.ok(changed.log.includes("UNLOCK TABLES"));
 const failure=fixture({failAlter:true});await assert.rejects(migrateLocked(failure.connection,failure.backup),/injected/);assert.ok(failure.log.includes("UNLOCK TABLES"));assert.ok(failure.log.at(-1).includes("RELEASE_LOCK"));
 console.log("Featured migration: restored-backup gate, stable native lock, drift refusal before DDL, no data DML and cleanup after DDL failure passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
