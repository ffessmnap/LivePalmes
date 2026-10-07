"use strict";
const assert=require("node:assert/strict");
const {inspectDtnSource}=require("../functions/nap-dtn-source-proof");
(async()=>{
  let statements=0,released=0;
  const execute=async({sql})=>{
    statements++;assert.match(sql,/^(EXPLAIN )?SELECT /);
    if(sql.startsWith("EXPLAIN")) return [[{table:sql.includes("STRAIGHT_JOIN")?"p":"competitions",type:"range",key:sql.includes("STRAIGHT_JOIN")?"livepalmes_compet_id":"livepalmes_date_id",rows:1,Extra:"Using index condition"}]];
    if(!sql.includes("STRAIGHT_JOIN")) return [[{id:1}]];
    return [[{id:1,competition_id:1,date:"2026-01-01",swimmer_id:null,nom:"PRIVATE",prenom:"SECRET"}]];
  };
  const result=await inspectDtnSource({execute,getConnection:async()=>({execute,release:()=>released++})});
  assert.equal(statements,4);assert.equal(released,1);assert.equal(result.complete,true);assert.equal(result.excludedRows,1);assert.equal(result.writesExecuted,false);
  assert.ok(!/PRIVATE|SECRET|nom|prenom|SELECT|cursor/.test(JSON.stringify(result)));
  let connection=false;
  const empty=await inspectDtnSource({execute:async({sql})=>[sql.startsWith("EXPLAIN")?[{type:"range",key:"livepalmes_date_id"}]:[]],getConnection:async()=>{connection=true;}});
  assert.equal(empty.complete,true);assert.equal(empty.sqlBudget.queriesExecuted,2);assert.equal(connection,false);
  console.log("DTN source proof: bounded indexed reads, no private identities, no writes, empty season and SQL budget verified.");
})().catch(e=>{console.error(e);process.exitCode=1;});
