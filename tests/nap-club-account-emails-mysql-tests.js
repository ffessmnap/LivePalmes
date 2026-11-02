"use strict";
// Reuses the existing isolated CI MySQL service. No NAP host or password accepted.
const assert = require("node:assert/strict"), mysql = require("../functions/node_modules/mysql2/promise");
const schema = require("../functions/nap-club-account-emails-schema");
const projection = require("../functions/nap-club-account-emails");
const migration = require("../tools/migrate-nap-club-email-ids");
async function main() {
  assert.equal(process.env.NAP_TEAM_FIXTURE_ALLOWED,"isolated-ci");assert(process.env.NAP_TEAM_FIXTURE_PASSWORD);
  const settings={host:"127.0.0.1",port:33317,user:"root",password:process.env.NAP_TEAM_FIXTURE_PASSWORD,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true,multipleStatements:false};
  const database="lp_email_ids_fixture_"+Date.now()+"_"+process.pid;assert.match(database,/^lp_email_ids_fixture_\d+_\d+$/);
  const admin=await mysql.createConnection(settings);
  assert.match((await admin.query("SELECT VERSION() AS v"))[0][0].v,/^5\.7\./);
  await admin.query("CREATE DATABASE `"+database+"` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin");
  const pool=mysql.createPool({...settings,database,connectionLimit:3}),connection=await pool.getConnection();
  const q=async(sql,values=[])=>(await connection.execute(sql,values))[0];
  let backups=0;
  const options={confirmation:migration.CONFIRMATION,backup:async state=>{backups++;assert.equal(state.rows.length,3);return{verified:true,archiveHash:"isolated-fixture"};}};
  try {
    await q("CREATE TABLE clubs (num_club INT NOT NULL AUTO_INCREMENT PRIMARY KEY) ENGINE=MyISAM");await q("INSERT INTO clubs VALUES (106),(721)");
    await q(schema.CREATE_SQL);await connection.query(migration.RESTORE_SQL);
    await q("INSERT INTO livepalmes_club_account_emails (firebase_uid,club_id,email,status,competition_notifications,source_version) VALUES ('one','106','one@example.org','active',1,1),('two','721','two@example.org','active',0,2),('none',NULL,NULL,'deleted',0,3)");
    for(const invalid of ["0106","106oops","2147483648","0","", " 106"]){
      await q("UPDATE livepalmes_club_account_emails SET club_id=? WHERE firebase_uid='one'",[invalid]);
      await assert.rejects(migration.migrate(connection,options));assert.equal(backups,0);
    }
    await q("UPDATE livepalmes_club_account_emails SET club_id='107' WHERE firebase_uid='one'");
    await assert.rejects(migration.migrate(connection,options),/UNKNOWN_CLUB/);
    await q("UPDATE livepalmes_club_account_emails SET club_id='106' WHERE firebase_uid='one'");
    const before=await migration.capture(connection),result=await migration.migrate(connection,options);
    assert(result.changed&&result.verified);assert.equal(backups,1);
    assert.equal((await schema.inspect(connection,{allowLegacy:false})).clubIdType,"int");
    assert.deepEqual(migration.normalized((await migration.capture(connection)).rows),migration.normalized(before.rows));
    assert.equal((await migration.migrate(connection,options)).changed,false);assert.equal(backups,1);
    // Deployed legacy writer binds decimal strings. Keep its SQL/version logic
    // and exercise exactly that binding against the converted integer column.
    const legacyPool={async getConnection(){const c=await pool.getConnection();return{beginTransaction:()=>c.beginTransaction(),commit:()=>c.commit(),rollback:()=>c.rollback(),release:()=>c.release(),execute:(query,values)=>c.execute(query,query.sql.includes("competition_notifications, source_version)")?values.map((v,i)=>i%6===1&&v!==null?String(v):v):values)};}};
    const row={uid:"one",clubId:106,email:"updated@example.org",status:"active",notifications:1,version:"4"};
    await projection.writeProjection(legacyPool,[row.uid],async()=>[row]);
    assert.equal((await q("SELECT club_id FROM livepalmes_club_account_emails WHERE firebase_uid='one'"))[0].club_id,106);
    await projection.writeProjection(pool,[row.uid],async()=>[{...row,clubId:721,version:"5"}]);
    await projection.writeProjection(legacyPool,[row.uid],async()=>[row]);
    assert.equal((await q("SELECT club_id FROM livepalmes_club_account_emails WHERE firebase_uid='one'"))[0].club_id,721);
    const plan=await q("EXPLAIN SELECT DISTINCT email FROM livepalmes_club_account_emails WHERE club_id=? AND status='active' AND email IS NOT NULL ORDER BY email",[106]);
    assert.equal(plan[0].key,"club_status");
    const current=await migration.capture(connection);
    await migration.migrate(connection,{restore:true,confirmation:"nap-shared-club-email-ids-restore",backup:async()=>({verified:true})});
    assert.equal((await schema.inspect(connection)).clubIdType,"varchar");
    assert.deepEqual(migration.normalized((await migration.capture(connection)).rows),migration.normalized(current.rows));
    console.log("Club email IDs MySQL 5.7: real locks/ALTER, invalid and orphan refusal, NULL/data preservation, legacy/current writers, stale versions, index, retry and schema-only rollback passed.");
  } finally {connection.release();await pool.end();await admin.query("DROP DATABASE `"+database+"`");await admin.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
