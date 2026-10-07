"use strict";
const assert=require("node:assert/strict");
const {inspectSelection}=require("../functions/nap-swimmer-entry-proof");
const {SPECS}=require("../functions/nap-portal-competition-change");
const pack={competitionId:"5140",clubId:"106",swimmers:[{id:"1",clubId:"106",firstName:"Example",lastName:"Person",birthDate:"1990-01-01",sex:"M"}],inscriptions:[{id:11,nageur:1,compet:5140}],individual:[{id:21,engagement:11,course:"100SF",tps:"14200"}],relays:[{id:30,compet:5140,club:"106"}],members:[{id:40,relais:30,pos:1,nageur:1}],leaders:[{id:50,compet:5140,nom:"Leader",prenom:"Example",date:"1980-01-01",club:"106",pourclub:""}]};
const nativeSnapshot={competition:Object.fromEntries(SPECS.competitions.columns.map(key=>[key,key==="id"?5140:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,key==="id"||key==="compet"?5140:key==="actif"?1:null]))};
const competition={nativeSnapshot,options:null,event:{entryDeadlineAt:"2099-10-07T19:59:00.000Z"}};
(async()=>{
  let calls=0;
  const connection={execute:async(query,values)=>{assert.match(query.sql,/^EXPLAIN (DELETE|INSERT) /);assert.equal((query.sql.match(/\?/g)||[]).length,values.length);calls++;return [[{table:"n",type:"range",key:"PRIMARY",rows:1}]];}};
  const result=await inspectSelection(connection,pack,async()=>competition);assert.equal(result.indexed,true);assert.equal(result.explainCount,4);assert.equal(result.relayRemovalInspected,true);assert.equal(calls,4);assert.equal(result.writesExecuted,false);assert.equal(JSON.stringify(result).includes("1990-01-01"),false);
  const refused=await inspectSelection({execute:async()=>[[{table:"n",type:"ALL",key:null,rows:100}]]},pack,async()=>competition);assert.equal(refused.indexed,false);
  const absent=await inspectSelection(connection,{...pack,leaders:[]},async()=>competition);assert.equal(absent.available,false);assert.equal(calls,4);
  console.log("Native selection diagnostic: four EXPLAIN only, no writes or identities, indexed plans required");
})().catch(error=>{console.error(error);process.exitCode=1;});
