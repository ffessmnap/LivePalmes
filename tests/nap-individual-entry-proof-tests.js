"use strict";
const assert=require("node:assert/strict");
const {inspectStatements}=require("../functions/nap-individual-entry-proof");
(async()=>{
  let calls=0;
  const proof=await inspectStatements({execute:async()=>{calls++;throw new Error("Unexpected SQL");}},{inscriptions:[{id:1,nageur:1},{id:2,nageur:1}],individual:[{id:3,engagement:1,course:"100SF",tps:"14200"}]});
  assert.equal(proof.available,false);assert.equal(proof.writesExecuted,false);assert.equal(calls,0);
  const {SPECS}=require("../functions/nap-portal-competition-change");
  const nativeSnapshot={competition:Object.fromEntries(SPECS.competitions.columns.map(key=>[key,key==="id"?5140:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,key==="id"||key==="compet"?5140:key==="actif"?1:null]))};
  const sample={competitionId:5140,clubId:"106",inscriptions:[{id:11,nageur:1,compet:5140}],individual:[{id:20,engagement:11,course:"100SF",tps:"14200"}]};
  const competition={nativeSnapshot,options:null,event:{entryStatus:"open",entryDeadlineAt:"2026-10-07T19:59:00.000Z"}};
  const inspected=[];
  const connection={execute:async(query,values)=>{
    assert.match(query.sql,/^EXPLAIN (INSERT|UPDATE|DELETE) /);
    assert.equal((query.sql.match(/\?/g)||[]).length,values.length);
    inspected.push(query.sql);return [[{table:"engagements",type:"range",key:"PRIMARY",rows:1,Extra:null}]];
  }};
  const actual=await inspectStatements(connection,sample,async()=>competition);
  assert.equal(actual.available,true);assert.equal(actual.indexed,true);assert.equal(actual.writesExecuted,false);assert.equal(inspected.length,3);assert.equal(JSON.stringify(actual).includes("14200"),false);
  const refused=await inspectStatements({execute:async()=>[[{table:"engagements",type:"ALL",key:null,rows:100}]]},sample,async()=>competition);
  assert.equal(refused.indexed,false);assert.equal(refused.writesExecuted,false);
  const insertTarget=await inspectStatements({execute:async(query)=>[query.sql.startsWith("EXPLAIN INSERT") ? [{select_type:"INSERT",table:"engagements",type:"ALL",key:null,rows:null},{table:"scope_i",type:"eq_ref",key:"PRIMARY",rows:1},{select_type:"DERIVED",table:null,type:null,key:null,rows:null,Extra:"No tables used"}] : [{table:"engagements",type:"range",key:"PRIMARY",rows:1}]]},sample,async()=>competition);
  assert.equal(insertTarget.indexed,true);
  const closed=await inspectStatements(connection,sample,async()=>({...competition,event:{entryStatus:"closed"}}));assert.equal(closed.available,false);assert.equal(inspected.length,3);
  console.log("NAP individual entry proof stays EXPLAIN-only");
})().catch(error=>{console.error(error);process.exitCode=1;});
