"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const migration=require("../tools/nap-swimmer-ns-migration");
const {COLUMNS}=require("../functions/nap-approved-swimmer-correction");
function fixture(options={}){
  let extended=false,lockLost=false;const log=[];
  const data=[Object.fromEntries(COLUMNS.map(c=>[c,c==="id"?42:c==="club"?"106":c==="wc"?null:"fictif"]))];
  const original=COLUMNS.map(COLUMN_NAME=>({COLUMN_NAME,COLUMN_TYPE:"varchar(64)",IS_NULLABLE:"NO",COLUMN_DEFAULT:null,EXTRA:""}));
  const indexes=[{INDEX_NAME:"PRIMARY",COLUMN_NAME:"id",SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null},{INDEX_NAME:"livepalmes_club_id",COLUMN_NAME:"club",SEQ_IN_INDEX:1,NON_UNIQUE:1,SUB_PART:null}];
  const connection={execute:async({sql},values=[])=>{
    log.push(sql);
    if(sql==="SHOW GRANTS")return [[{grant:options.denied?"GRANT SELECT ON `nage-palmes`.* TO 'fictif'@'%'":"GRANT ALL PRIVILEGES ON `nage-palmes`.* TO 'fictif'@'%'"}]];
    if(sql.includes("GET_LOCK"))return [[{acquired:options.locked?0:1}]];
    if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
    if(lockLost&&sql!=="SHOW GRANTS")throw Error("table lock lost by ALTER");
    if(sql.includes("PROCESSLIST"))return [options.writer?[{ID:1}]:[]];
    if(sql.includes("information_schema.TABLES"))return [[{TABLE_NAME:"nageurs",ENGINE:options.engine||"MyISAM",TABLE_COLLATION:"latin1_swedish_ci"}]];
    if(sql.includes("information_schema.COLUMNS"))return [[...original,...extended?[{COLUMN_NAME:"livepalmes_ns",COLUMN_TYPE:options.badAdded?"varchar(64)":"tinyint(4)",IS_NULLABLE:"YES",COLUMN_DEFAULT:null,EXTRA:""},{COLUMN_NAME:"livepalmes_ns_version",COLUMN_TYPE:"int(10) unsigned",IS_NULLABLE:"YES",COLUMN_DEFAULT:null,EXTRA:""}]:[]]];
    if(sql.includes("information_schema.STATISTICS"))return [indexes];
    if(sql.includes("information_schema.TRIGGERS"))return [options.trigger?[{TRIGGER_NAME:"unexpected"}]:[]];
    if(sql.startsWith("SHOW CREATE"))return [[{"Create Table":extended?"extended-ddl":"native-ddl"}]];
    if(sql.startsWith("SELECT COUNT"))return [[{total:options.tooMany?migration.MAX_ROWS+1:1}]];
    if(sql.startsWith("SELECT `"))return [values[0]<42?structuredClone(data):[]];
    if(sql.startsWith("SELECT id FROM nageurs WHERE livepalmes_ns"))return [options.nonNull?[{id:42}]:[]];
    if(sql.startsWith("EXPLAIN"))return [[{type:options.badPlan?"ALL":"ref",key:sql.includes("(PRIMARY)")?"PRIMARY":"livepalmes_club_id"}]];
    throw Error("unexpected SQL");
  },query:async({sql})=>{log.push(sql);if(sql.startsWith("LOCK TABLES"))lockLost=false;if(sql.startsWith("ALTER")){if(options.failAlter)throw Error("DDL failure");extended=true;lockLost=true;if(options.postDataDrift)data[0].nom="changed";}return [[]];}};
  return {connection,log,data,setExtended:()=>{extended=true;}};
}
async function run(){
  let backup;const f=fixture();const prepared=await migration.prepare(f.connection,value=>{backup=structuredClone(value);});
  assert.equal(prepared.rowCount,1);assert.equal(prepared.dataRowsWritten,false);assert.ok(!f.log.some(s=>s.startsWith("ALTER")));
  fs.mkdirSync("tmp",{recursive:true});const directory=fs.mkdtempSync(path.resolve("tmp/ns-migration-"));
  const key="synthetic-private-key-never-a-real-credential";
  const proof=migration.storeBackup(directory,backup,key);const reopened=migration.loadBackup(directory,key);
  assert.deepEqual(reopened.backup,backup);assert.equal(proof.reopenedVerified,true);assert.equal(proof.twoCopiesVerified,true);
  const result=await migration.apply(f.connection,reopened.backup,reopened.proof);assert.equal(result.verified,true);assert.equal(result.initialNsValues,"all-null");assert.equal(result.dataRowsWritten,false);
  assert.equal(f.log.filter(s=>s.startsWith("ALTER TABLE")).length,1);assert.ok(f.log.at(-1).includes("RELEASE_LOCK"));assert.ok(f.log.includes("UNLOCK TABLES"));assert.ok(!f.log.some(s=>/^(INSERT|UPDATE|DELETE|DROP|CREATE|TRUNCATE|REPLACE) /.test(s)));
  assert.ok(f.log.findIndex((sql,index)=>index>f.log.findIndex(s=>s.startsWith("ALTER TABLE"))&&sql==="LOCK TABLES nageurs WRITE")>0);
  const unverified=fixture();await assert.rejects(migration.apply(unverified.connection,backup,{...proof,reopenedVerified:false}),/verified-backup/);assert.equal(unverified.log.length,0);
  for(const options of [{denied:true},{locked:true},{writer:true},{engine:"InnoDB"},{trigger:true},{tooMany:true}]){const rejected=fixture(options);await assert.rejects(migration.prepare(rejected.connection,()=>{}));assert.ok(!rejected.log.some(s=>s.startsWith("ALTER")));}
  const drift=fixture();drift.data[0].nom="other";await assert.rejects(migration.apply(drift.connection,backup,proof),/native-drift/);assert.ok(!drift.log.some(s=>s.startsWith("ALTER")));
  const already=fixture();already.setExtended();await assert.rejects(migration.apply(already.connection,backup,proof),/already-extended/);assert.ok(!already.log.some(s=>s.startsWith("ALTER")));
  for(const options of [{failAlter:true},{badAdded:true},{postDataDrift:true},{nonNull:true},{badPlan:true}]){const rejected=fixture(options);await assert.rejects(migration.apply(rejected.connection,backup,proof));assert.ok(rejected.log.includes("UNLOCK TABLES"));assert.ok(rejected.log.at(-1).includes("RELEASE_LOCK"));}
  const bytes=fs.readFileSync(path.join(directory,"nageurs-backup-copy.enc"));bytes[bytes.length-1]^=1;fs.writeFileSync(path.join(directory,"nageurs-backup-copy.enc"),bytes);assert.throws(()=>migration.loadBackup(directory,key),/backup-copy/);
  const source=fs.readFileSync(".github/workflows/nap-authorized-swimmer-ns-schema.yml","utf8");assert.ok(source.indexOf("Conserver la sauvegarde chiffree")<source.indexOf("Ajouter uniquement les colonnes"));assert.match(source,/github.run_attempt == 1/);assert.ok(!/firebase deploy|workflow_run|schedule:/.test(source));
  console.log("NS migration offline: encrypted copies reopened, bounded PK backup, native locks, drift/duplicate/trigger refusal, one DDL, preserved originals, NULL defaults, indexed plans and cleanup passed.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
