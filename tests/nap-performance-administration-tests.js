"use strict";
const assert=require("node:assert/strict"),{createPerformanceAdministration}=require("../functions/nap-performance-administration");
const native={id:973,nageur:168,compet:2,course:"100SF",cat:"HSE",tps:"14200",points:"0",newpoints:"0",passage:0,club:"106",relais:0,pid:null,classement:1};
(async()=>{
  let authorized=false,queries=0;const pool={execute:async({sql},values)=>{assert.equal(authorized,true);queries++;assert.match(sql,/^SELECT /);assert.equal(values[0],168);if(sql.includes("COUNT(*)"))return [[{count:1509}]];assert.match(sql,/LIMIT 101$/);assert.match(sql,/LEFT JOIN livepalmes_performance_visibility/);assert.ok(!sql.includes("NOT EXISTS"));return [[{...native,hidden:1,nom:"TEST",prenom:"TEST",date:"2026-01-01",libelle:"TEST",lieu:"TEST",abre_club:"TEST"}]];}};
  const read=createPerformanceAdministration({authorize:async()=>{authorized=true;},getPool:()=>{assert.equal(authorized,true);return pool;}});
  const result=await read({data:{action:"list",swimmerId:168}});assert.equal(queries,2);assert.equal(result.rows[0].hidden,true);assert.equal(result.rows[0].native.tps,"14200");assert.equal(result.rows[0].time,"1:42.00");assert.match(result.rows[0].expectedFingerprint,/^[a-f0-9]{64}$/);
  await assert.rejects(()=>read({data:{action:"list",swimmerId:168,cursor:-1}}));
  const denied=createPerformanceAdministration({authorize:async()=>{throw Error("denied");},getPool:()=>{throw Error("pool must not open");}});await assert.rejects(()=>denied({data:{action:"list",swimmerId:168}}),/denied/);
  const tooMany=createPerformanceAdministration({authorize:async()=>{},getPool:()=>({execute:async()=>[[{count:5001}]]})});await assert.rejects(()=>tooMany({data:{action:"list",swimmerId:168}}),/5 000/);
  console.log("NAP performance administration: auth before pool, bounded person page, hidden results retained, original time and conflict fingerprint verified.");
})().catch(e=>{console.error(e);process.exitCode=1;});
