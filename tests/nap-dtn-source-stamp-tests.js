"use strict";
const assert=require("node:assert/strict"),{TABLES,sourceStamp}=require("../functions/nap-dtn-source-stamp");
function fixture(extra={}) {
  const state={released:0,queries:[]};
  const connection={release:()=>state.released++,execute:async({sql})=>{
    state.queries.push(sql);
    if(sql.startsWith("SELECT VERSION")) return [[{version:extra.version||"5.7.44",os:extra.os||"Linux"}]];
    if(sql.startsWith("SET SESSION")) return [{}];
    return [TABLES.map(TABLE_NAME=>({TABLE_NAME,ENGINE:extra.engine||"MyISAM",changed_at:extra.changed??100,server_now:105}))];
  }};
  return {state,pool:{getConnection:async()=>connection}};
}
(async()=>{
  const f=fixture(),a=await sourceStamp(f.pool,{settled:true});assert.match(a.fingerprint,/^[a-f0-9]{64}$/);assert.equal(a.latestChange,100);assert.equal(f.state.released,1);assert.equal(f.state.queries.length,2);
  assert.notEqual(a.fingerprint,(await sourceStamp(fixture({changed:101}).pool)).fingerprint);
  for(const extra of [{os:"Win64"},{version:"10.6.0-MariaDB"},{engine:"InnoDB"},{changed:null}]) {
    const invalid=fixture(extra);if(extra.changed===null) extra.changed=0;
    await assert.rejects(()=>sourceStamp(fixture(extra).pool),/Suivi/);
    assert.equal(invalid.state.queries.length,0);
  }
  await assert.rejects(()=>sourceStamp(fixture({changed:105}).pool,{settled:true}),/quelques secondes/);
  const modern=fixture({version:"8.0.42"});await sourceStamp(modern.pool);assert.equal(modern.state.queries[1],"SET SESSION information_schema_stats_expiry=0");assert.equal(modern.state.queries.length,3);
  console.log("DTN source tracking: fixed metadata, platform/engine guards, settled timestamp precision, change detection and MySQL 8 session cache verified.");
})().catch(e=>{console.error(e);process.exitCode=1;});
