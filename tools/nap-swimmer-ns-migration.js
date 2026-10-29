"use strict";
// One explicitly authorized DDL, with a bounded encrypted native-table backup.
const fs=require("node:fs"),path=require("node:path"),{createHash}=require("node:crypto");
const {sql:ALTER_SQL,planHash}=require("../functions/nap-swimmer-ns-schema");
const {COLUMNS}=require("../functions/nap-approved-swimmer-correction");
const {seal,open}=require("./production-backup-crypto");
const MAX_ROWS=100000,PAGE_SIZE=1000,MAX_BYTES=64*1024*1024,LOCK="livepalmes_portal_schema";
const hash=value=>createHash("sha256").update(typeof value==="string"||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest("hex");
const fail=code=>{const error=new Error(code);error.safeCode=code;throw error;};
const query=async(connection,sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
async function inspect(connection){
  const tables=await query(connection,"SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='nageurs' LIMIT 2");
  const columns=await query(connection,"SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='nageurs' ORDER BY ORDINAL_POSITION LIMIT 14");
  const indexes=await query(connection,"SELECT INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX,NON_UNIQUE,SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='nageurs' ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 31");
  const triggers=await query(connection,"SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='nageurs' LIMIT 1");
  if(tables.length!==1||tables[0].ENGINE!=="MyISAM"||indexes.length>30||triggers.length)fail("unexpected-table-or-trigger");
  const ddl=(await query(connection,"SHOW CREATE TABLE nageurs"))[0]?.["Create Table"];
  if(typeof ddl!=="string"||ddl.length>30000)fail("invalid-ddl");
  return {tables,columns,indexes,ddl};
}
function validateOriginal(meta){
  if(meta.columns.length!==COLUMNS.length||meta.columns.some((c,i)=>c.COLUMN_NAME!==COLUMNS[i]))fail("unexpected-or-already-extended-schema");
  if(!meta.indexes.some(k=>k.INDEX_NAME==="PRIMARY"&&k.COLUMN_NAME==="id")||!meta.indexes.some(k=>k.INDEX_NAME==="livepalmes_club_id"&&k.COLUMN_NAME==="club"))fail("missing-native-index");
}
async function rows(connection){
  const deadline=Date.now()+30000;
  const count=Number((await query(connection,"SELECT COUNT(*) AS total FROM nageurs"))[0]?.total);
  if(!Number.isSafeInteger(count)||count<0||count>MAX_ROWS)fail("backup-row-budget-exceeded");
  const result=[];let cursor=0,bytes=0;
  for(let page=0;page<=Math.ceil(MAX_ROWS/PAGE_SIZE);page++){
    if(Date.now()>deadline)fail("backup-time-budget-exceeded");
    const batch=await query(connection,`SELECT ${COLUMNS.map(c=>`\`${c}\``).join(",")} FROM nageurs FORCE INDEX (PRIMARY) WHERE id>? ORDER BY id LIMIT ${PAGE_SIZE}`,[cursor]);
    if(batch.length>PAGE_SIZE)fail("invalid-backup-page");
    for(const row of batch){const id=Number(row.id);if(!Number.isSafeInteger(id)||id<=cursor||COLUMNS.some(c=>!Object.hasOwn(row,c)))fail("invalid-backup-row");cursor=id;bytes+=Buffer.byteLength(JSON.stringify(row));result.push(row);}
    if(result.length>MAX_ROWS||bytes>MAX_BYTES)fail("backup-size-budget-exceeded");
    if(batch.length<PAGE_SIZE){if(result.length!==count)fail("backup-count-changed");return result;}
  }
  fail("backup-page-budget-exceeded");
}
async function withLock(connection,run){
  let named=false,table=false;
  try{
    const grants=await query(connection,"SHOW GRANTS");
    if(grants.length>100)fail("unexpected-grants");
    const required=new Set(["SELECT","ALTER","LOCK TABLES"]);
    for(const row of grants){const grant=String(Object.values(row)[0]||""),match=grant.match(/^GRANT (.*?) ON ((?:`nage-palmes`|nage-palmes)\.(?:\*|`nageurs`|nageurs)|\*\.\*) TO /i);if(!match)continue;const names=match[1].split(",").map(v=>v.trim().toUpperCase());for(const name of required)if(names.includes(name)||names.includes("ALL PRIVILEGES"))required.delete(name);}
    if(required.size)fail("missing-select-alter-or-lock-privilege");
    if(Number((await query(connection,"SELECT GET_LOCK(?,0) AS acquired",[LOCK]))[0]?.acquired)!==1)fail("schema-operation-active");named=true;
    // Refuse an already active native writer; the table lock then serializes every writer.
    const active=await query(connection,"SELECT ID FROM information_schema.PROCESSLIST WHERE ID<>CONNECTION_ID() AND COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)[[:space:]]' LIMIT 101");
    if(active.length)fail("native-write-active");
    await connection.query({sql:"SET SESSION lock_wait_timeout=10",timeout:10000});
    await connection.query({sql:"LOCK TABLES nageurs WRITE",timeout:10000});table=true;
    return await run();
  }finally{
    try{if(table)await connection.query({sql:"UNLOCK TABLES",timeout:10000});}
    finally{if(named)await query(connection,"SELECT RELEASE_LOCK(?) AS released",[LOCK]);}
  }
}
async function prepare(connection,persist){
  return withLock(connection,async()=>{
    const schema=await inspect(connection);validateOriginal(schema);
    const data=await rows(connection);
    const backup={schema:1,planHash,createdAt:new Date().toISOString(),nativeSchema:schema,rows:data,rowCount:data.length,dataHash:hash(data),schemaHash:hash(schema)};
    await persist(backup);
    return {planHash,rowCount:data.length,dataHash:backup.dataHash,schemaHash:backup.schemaHash,dataRowsWritten:false};
  });
}
async function apply(connection,backup,proof){
  if(!proof?.reopenedVerified||!proof.twoCopiesVerified||backup?.planHash!==planHash||backup.dataHash!==hash(backup.rows)||backup.schemaHash!==hash(backup.nativeSchema)||backup.rowCount!==backup.rows.length)fail("verified-backup-required");
  validateOriginal(backup.nativeSchema);
  return withLock(connection,async()=>{
    const before=await inspect(connection);validateOriginal(before);
    if(hash(before)!==backup.schemaHash||hash(await rows(connection))!==backup.dataHash)fail("native-drift-since-backup");
    const started=Date.now();
    // No DML, migration/backfill, new table, function invocation or email.
    await connection.query({sql:ALTER_SQL,timeout:60000});
    const after=await inspect(connection),added=after.columns.slice(COLUMNS.length);
    if(hash(after.tables)!==hash(before.tables)||hash(after.indexes)!==hash(before.indexes)||hash(after.columns.slice(0,COLUMNS.length))!==hash(before.columns)||
      added.length!==2||added.some((c,i)=>c.COLUMN_NAME!==["livepalmes_ns","livepalmes_ns_version"][i]||
        String(c.COLUMN_TYPE).toLowerCase().replace(/\(\d+\)/g,"")!==["tinyint","int unsigned"][i]||c.IS_NULLABLE!=="YES"||c.COLUMN_DEFAULT!==null||c.EXTRA))fail("post-ddl-schema-mismatch");
    const original=await rows(connection);
    if(hash(original)!==backup.dataHash)fail("post-ddl-native-data-mismatch");
    if((await query(connection,"SELECT id FROM nageurs WHERE livepalmes_ns IS NOT NULL OR livepalmes_ns_version IS NOT NULL LIMIT 1")).length)fail("non-null-initial-ns");
    const pk=await query(connection,"EXPLAIN SELECT id FROM nageurs FORCE INDEX (PRIMARY) WHERE id=? LIMIT 1",[original[0]?.id||1]);
    const club=await query(connection,"EXPLAIN SELECT id FROM nageurs FORCE INDEX (livepalmes_club_id) WHERE club=? ORDER BY id LIMIT 801",[original[0]?.club||"0"]);
    if(!pk.length||pk.some(r=>!['const','ref','range','system'].includes(r.type)||r.key!=="PRIMARY")||!club.length||club.some(r=>!['const','ref','range','system'].includes(r.type)||r.key!=="livepalmes_club_id"))fail("native-index-plan-mismatch");
    return {verified:true,planHash,completedAt:new Date().toISOString(),rowCount:original.length,preservedDataHash:backup.dataHash,beforeSchemaHash:backup.schemaHash,afterSchemaHash:hash(after),dataRowsWritten:false,initialNsValues:"all-null",durationMs:Date.now()-started};
  });
}
function storeBackup(directory,backup,key){
  fs.mkdirSync(directory,{recursive:true});const encoded=Buffer.from(JSON.stringify(backup));
  const encrypted=seal(encoded,key);
  for(const name of ["nageurs-backup.enc","nageurs-backup-copy.enc"])fs.writeFileSync(path.join(directory,name),encrypted,{flag:"wx",mode:0o600});
  const first=fs.readFileSync(path.join(directory,"nageurs-backup.enc")),second=fs.readFileSync(path.join(directory,"nageurs-backup-copy.enc"));
  if(!first.equals(second)||!open(first,key).equals(encoded)||!open(second,key).equals(encoded))fail("backup-reopen-failed");
  const proof={planHash,rowCount:backup.rowCount,dataHash:backup.dataHash,schemaHash:backup.schemaHash,cipherHash:hash(first),reopenedVerified:true,twoCopiesVerified:true};
  fs.writeFileSync(path.join(directory,"backup-proof.json"),JSON.stringify(proof,null,2)+"\n",{flag:"wx"});return proof;
}
function loadBackup(directory,key){
  const proof=JSON.parse(fs.readFileSync(path.join(directory,"backup-proof.json"),"utf8"));
  const first=fs.readFileSync(path.join(directory,"nageurs-backup.enc")),second=fs.readFileSync(path.join(directory,"nageurs-backup-copy.enc"));
  if(!first.equals(second)||hash(first)!==proof.cipherHash)fail("backup-copy-or-hash-mismatch");
  const restored=open(first,key);if(!restored.equals(open(second,key)))fail("backup-reopen-failed");
  const backup=JSON.parse(restored);if(backup.planHash!==proof.planHash||backup.rowCount!==proof.rowCount||backup.dataHash!==proof.dataHash||backup.schemaHash!==proof.schemaHash)fail("backup-proof-mismatch");
  return {backup,proof};
}
async function main(){
  const {execFileSync}=require("node:child_process"),phase=process.env.NAP_NS_PHASE;
  if(process.env.TARGET_FIREBASE_PROJECT!=="livepalmes-test"||process.env.NAP_NS_CONFIRMATION!=="nap-add-swimmer-ns-columns"||!["prepare","apply"].includes(phase)||
    execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim()!==process.env.EXPECTED_COMMIT)fail("invalid-target-or-confirmation");
  const credentials=JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,"utf8"));
  if(credentials.project_id!=="livepalmes-test"||credentials.client_email!=="github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com"||!credentials.private_key)fail("invalid-test-credentials");
  const options={encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:30000,maxBuffer:1024*1024};
  // Use exactly the existing TEST swimmer reader's bound secret version, captured in memory.
  const binding=JSON.parse(execFileSync("gcloud",["functions","describe","listEngagementClubSwimmers","--gen2","--region=europe-west1","--project=livepalmes-test","--format=json"],options)).serviceConfig.secretEnvironmentVariables?.find(v=>v.key==="LIVEPALMES_NAP_PASSWORD");
  const projectNumber=execFileSync("gcloud",["projects","describe","livepalmes-test","--format=value(projectNumber)"],options).trim();
  if(!/^\d+$/.test(projectNumber)||binding?.secret!=="LIVEPALMES_NAP_PASSWORD"||!["livepalmes-test",projectNumber].includes(String(binding.projectId))||!/^\d+$/.test(String(binding.version)))fail("unexpected-nap-binding");
  const password=execFileSync("gcloud",["secrets","versions","access",String(binding.version),"--secret=LIVEPALMES_NAP_PASSWORD","--project=livepalmes-test"],options).trim();
  const pool=require("../functions/nap-mysql").createNapPool(password);let connection;
  const directory=path.resolve("outputs/ns-native-backup");
  try{
    connection=await pool.getConnection();
    let result;
    if(phase==="prepare")result=await prepare(connection,backup=>storeBackup(directory,backup,credentials.private_key));
    else{const {backup,proof}=loadBackup(directory,credentials.private_key);result=await apply(connection,backup,proof);}
    fs.mkdirSync("outputs",{recursive:true});fs.writeFileSync(`outputs/ns-schema-${phase}-proof.json`,JSON.stringify(result,null,2)+"\n");
    console.log(JSON.stringify({phase,...result}));
  }finally{connection?.release();await pool.end();}
}
module.exports={inspect,validateOriginal,rows,withLock,prepare,apply,storeBackup,loadBackup,hash,MAX_ROWS};
if(require.main===module)main().catch(error=>{console.error("Migration NS arrêtée : "+(error.safeCode||String(error.code||"technical-failure").replace(/[^a-zA-Z0-9_-]/g,""))+". Aucun détail de données ou secret affiché ; examiner la preuve avant reprise.");process.exitCode=1;});
