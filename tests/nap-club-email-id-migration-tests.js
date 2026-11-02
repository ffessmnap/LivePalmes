"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
const migration = require("../tools/migrate-nap-club-email-ids");
const schema = require("../functions/nap-club-account-emails-schema");
function fixture() {
  let type = "varchar", alters = 0, locked = false;
  const rows = [{ firebase_uid: "fixture", club_id: "106", email: "fixture@example.org", status: "active", competition_notifications: 0, source_version: "123", synchronized_at: "2026-11-02 21:00:00.000000" }];
  const connection = {
    async query(sql) {
      if (sql.startsWith("LOCK TABLES")) locked = true;
      if (sql === "UNLOCK TABLES") locked = false;
      if ([migration.ALTER_SQL, migration.RESTORE_SQL].includes(sql)) {
        assert(locked); alters++; type = sql === migration.ALTER_SQL ? "int" : "varchar";
        for (const row of rows) row.club_id = row.club_id === null ? null : type === "int" ? Number(row.club_id) : String(row.club_id);
        locked = false;
      }
      return [[]];
    },
    async execute({ sql }) {
      if (sql.includes("schema.COLUMNS") && sql.includes("TABLE_NAME=?")) throw Error("bad fixture");
      if (sql.includes("schema.COLUMNS") && sql.includes("ORDER BY ORDINAL_POSITION")) return [[
        ["firebase_uid","varchar(128)","NO","utf8mb4_bin"], ["club_id",type === "int" ? "int(11)" : "varchar(40)","YES",type === "int" ? null : "utf8mb4_bin"],
        ["email","varchar(254)","YES","utf8mb4_bin"], ["status","enum('active','inactive','deleted')","NO","utf8mb4_bin"],
        ["competition_notifications","tinyint(3) unsigned","NO",null], ["source_version","bigint(20) unsigned","NO",null], ["synchronized_at","timestamp(6)","NO",null]
      ].map(([COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLLATION_NAME]) => ({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLLATION_NAME}))];
      if (sql.includes("schema.STATISTICS")) return [[ ["club_status",1,1,"club_id"], ["club_status",1,2,"status"], ["PRIMARY",0,1,"firebase_uid"] ].map(([INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME]) => ({INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME}))];
      if (sql.includes("schema.TABLES")) return [[{ ENGINE: "InnoDB" }]];
      if (sql.includes("schema.COLUMNS")) return [[{COLUMN_TYPE:"int(11)",IS_NULLABLE:"NO",COLUMN_KEY:"PRI",EXTRA:"auto_increment"}]];
      if (/schema\.(TRIGGERS|KEY_COLUMN_USAGE)/.test(sql)) return [[]];
      if (sql.includes("SELECT firebase_uid")) return [structuredClone(rows)];
      if (sql.startsWith("SELECT num_club")) return [[{num_club:106}]];
      if (sql.startsWith("SHOW CREATE")) return [[{Table:"fixture",Create:type}]];
      throw Error("Unexpected fixture query");
    }
  };
  return {connection, rows, get alters(){return alters;}, get locked(){return locked;}};
}
async function main() {
  const f = fixture(); let backups = 0;
  const options = {confirmation:migration.CONFIRMATION,backup:async state=>{assert(f.locked);assert.equal(state.rows[0].club_id,"106");backups++;return {verified:true,archiveHash:"fixture"};}};
  assert.equal((await migration.migrate(f.connection,options)).verified,true);
  assert.equal(f.rows[0].club_id,106); assert.equal(f.alters,1); assert.equal(backups,1); assert(!f.locked);
  assert.equal((await migration.migrate(f.connection,options)).changed,false); assert.equal(f.alters,1);
  await migration.migrate(f.connection,{confirmation:"nap-shared-club-email-ids-restore",restore:true,backup:async()=>({verified:true})});
  assert.equal(f.rows[0].club_id,"106");assert.equal(f.alters,2);
  for(const id of ["0106","106x","2147483648","",0]){const bad=fixture();bad.rows[0].club_id=id;await assert.rejects(migration.migrate(bad.connection,options));assert.equal(bad.alters,0);assert(!bad.locked);}
  const orphan=fixture();orphan.rows[0].club_id="107";await assert.rejects(migration.migrate(orphan.connection,options),/UNKNOWN_CLUB/);assert.equal(orphan.alters,0);
  const noBackup=fixture();await assert.rejects(migration.migrate(noBackup.connection,{confirmation:migration.CONFIRMATION,backup:async()=>({verified:false})}),/BACKUP_REQUIRED/);assert.equal(noBackup.alters,0);
  const drift=fixture();await assert.rejects(migration.migrate(drift.connection,{confirmation:migration.CONFIRMATION,backup:async()=>{drift.rows[0].email="changed@example.org";return{verified:true};}}),/PRE_ALTER_DRIFT/);assert.equal(drift.alters,0);
  const lost=fixture(),originalQuery=lost.connection.query.bind(lost.connection);
  lost.connection.query=async sql=>{const result=await originalQuery(sql);if(sql===migration.ALTER_SQL)throw Error("simulated response loss");return result;};
  await assert.rejects(migration.migrate(lost.connection,{confirmation:migration.CONFIRMATION,backup:async()=>({verified:true})}),/response loss/);assert.equal(lost.alters,1);
  assert.equal((await migration.migrate(lost.connection,options)).changed,false);assert.equal(lost.alters,1);
  const oversized=fixture();oversized.rows.push(...Array.from({length:10000},()=>({...oversized.rows[0]})));
  await assert.rejects(migration.migrate(oversized.connection,options),/BUDGET/);assert.equal(oversized.alters,0);
  await assert.rejects(migration.migrate(null,{}),/APPROVAL/);
  const {verifyProjection}=require("../tools/club-merge-engine");
  for(const initial of ["518",518])for(const projected of ["126",126]){
    const row={firebase_uid:"one",club_id:initial,email:"one@example.org",source_version:"1"};
    const plan={projection:{sql:[row]},firestore:[{path:"users/one"}]};
    const current={projection:{sql:[{...row,club_id:projected,source_version:"1000000"}]},docs:[{path:"users/one",updateTime:"1970-01-01T00:00:01Z"}]};
    verifyProjection(plan,current,"126");
    assert.throws(()=>verifyProjection(plan,{...current,projection:{sql:[{...current.projection.sql[0],club_id:127}]}},"126"),/NOT_CONVERGED/);
  }
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),"lp-email-ids-"));
  try {
    const keyFile=path.join(directory,"key"),primary=path.join(directory,"a.enc"),secondary=path.join(directory,"b.enc");fs.writeFileSync(keyFile,crypto.randomBytes(32));
    const state=await migration.capture(fixture().connection),saved=migration.saveBackup(state,{primary,secondary,keyFile});assert(saved.verified);
    assert(fs.readFileSync(primary).equals(fs.readFileSync(secondary)));assert(!fs.readFileSync(primary).includes(Buffer.from("fixture@example.org")));
    assert.throws(()=>migration.saveBackup(state,{primary,secondary,keyFile}));
  }finally{assert.equal(path.dirname(fs.realpathSync(directory)),fs.realpathSync(os.tmpdir()));fs.rmSync(directory,{recursive:true,force:true});}
  assert.match(schema.CREATE_SQL,/club_id INT NULL DEFAULT NULL/);
  console.log("Club email IDs: strict values, schema compatibility, bounded references, backup-before-ALTER, retry and schema-only recovery passed offline.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
