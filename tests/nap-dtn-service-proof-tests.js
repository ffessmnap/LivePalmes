"use strict";
const assert=require("node:assert/strict"),seed=require("../functions/config/dtn-season-2025-2026.json"),{TABLES}=require("../functions/nap-dtn-source-stamp"),{inspectDtnService}=require("../functions/nap-dtn-service-proof");
function fixture({unsafe=false,tracking=true}={}) {
  let statements=0;
  const execute=async({sql},values=[])=>{
    statements++;assert.match(sql,/^(EXPLAIN )?SELECT /);
    if(sql.startsWith("EXPLAIN")) return [[{table:"native",type:unsafe?"ALL":"range",key:unsafe?null:"PRIMARY",rows:1,Extra:""}]];
    if(sql.includes("FROM livepalmes_dtn_catalogue")) return [[{revision:0,saison_active:seed.id,saison_precedente:"",saison_brouillon:""}]];
    if(sql.includes("FROM livepalmes_dtn_saisons")) {assert.deepEqual(values,[seed.id]);return [[{id:seed.id,revision:seed.revision,configuration:JSON.stringify(seed)}]];}
    if(sql.includes("FROM livepalmes_dtn_resultats")) return [[]];
    if(sql.includes("FROM livepalmes_performance_visibility")) return [[]];
    if(sql.includes("FROM competitions")) return [[{id:1,libelle:"PUBLIC COMPETITION",date:"2026-01-01"}]];
    if(sql.includes("SELECT VERSION")) return [[{version:"5.7.44",os:tracking?"Linux":"Win64"}]];
    if(sql.includes("information_schema.TABLES")) return [TABLES.map(TABLE_NAME=>({TABLE_NAME,ENGINE:"MyISAM",changed_at:100,server_now:105}))];
    throw new Error("Unexpected query");
  };
  return {pool:{execute,getConnection:async()=>({execute,release:()=>{}})},count:()=>statements};
}
(async()=>{
  const f=fixture(),result=await inspectDtnService(f.pool);assert.equal(result.complete,true);assert.equal(result.writesExecuted,false);assert.equal(result.changeTrackingAvailable,true);assert.equal(result.sourcePageRows,1);assert.equal(result.sqlBudget.queriesExecuted,15);assert.equal(f.count(),15);
  assert.ok(!/PUBLIC COMPETITION|configuration|SELECT|france/.test(JSON.stringify(result)));
  assert.equal((await inspectDtnService(fixture({tracking:false}).pool)).complete,false);
  await assert.rejects(()=>inspectDtnService(fixture({unsafe:true}).pool),/Plan/);
  console.log("DTN service proof: live settings only, fixed indexed plans, source tracking capability, bounded budget and no names/writes verified.");
})().catch(e=>{console.error(e);process.exitCode=1;});
