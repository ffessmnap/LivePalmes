"use strict";
const assert=require("node:assert/strict");
const {readSwimmer,searchSwimmers}=require("../functions/nap-public-swimmer-redirect");
const person={id:13,nom:"TEST",prenom:"Cible",date:"1980-01-01",sexe:"M",club:"106"};
const perf={id:1,course:"50SF",cat:"HSE",tps:"002000",competition_id:1,date:"2025-05-01",bassin:50,chrono:"E",ld:0,relais:0};
(async()=>{
  const calls=[];
  const pool={execute:async(query,values)=>{
    calls.push({sql:query.sql,values});assert.equal(query.timeout,10000);
    if(query.sql.startsWith("SELECT target_id")){
      assert.match(query.sql,/FORCE INDEX \(PRIMARY\).*LIMIT 1$/);
      return [values[0]===12?[{target_id:13}]:[]];
    }
    // No source identity is available: the existing readers must receive 13.
    if(query.sql.startsWith("SELECT n.")){assert.equal(values[0],13);return [[person]];}
    assert.equal(values.at(-1),13);return [[perf]];
  }};
  const merged=await readSwimmer(pool,12);
  assert.equal(merged.swimmer.id,"13");assert.equal(merged.swimmer.rows[0].timeValue,2000);assert.equal(calls.length,3);
  calls.length=0;assert.equal((await searchSwimmers(pool,"12")).swimmers[0].id,"13");assert.equal(calls.length,2);
  calls.length=0;await readSwimmer(pool,13);assert.equal(calls.length,3);
  calls.length=0;await assert.rejects(readSwimmer(pool,"12 OR 1"),TypeError);assert.equal(calls.length,0);
  calls.length=0;
  await searchSwimmers({execute:async(query)=>{calls.push(query);assert.ok(!query.sql.startsWith("SELECT target_id"));return [[]];}},"TEST");assert.equal(calls.length,1);
  await assert.rejects(readSwimmer({execute:async()=>{throw Error("Unavailable");}},12),/Unavailable/);
  console.log("Public merged swimmer links: deleted source resolved, current target/history, numeric/name budgets, invalid input and no silent fallback passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
