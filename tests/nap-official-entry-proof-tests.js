"use strict";
const assert=require("node:assert/strict");
const {inspectOfficialStatements:inspect}=require("../functions/nap-official-entry-proof");
const {SPECS}=require("../functions/nap-portal-competition-change");
const pack={competitionId:5140,clubId:"106",leaders:[{id:30,compet:5140,nom:"CHEF",prenom:"Exemple",date:"1980-01-01",club:"106",pourclub:""}],officials:[]};
const directory={people:[{nativePersonKind:"officials",nativePersonId:"8",clubId:"106",active:true,roles:{official:true}}]};
const competition={event:{entryDeadlineAt:"2026-10-07T19:59:00.000Z"},nativeSnapshot:{competition:Object.fromEntries(SPECS.competitions.columns.map(key=>[key,key==="id"?5140:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,key==="id"||key==="compet"?5140:key==="actif"?1:null]))},options:null};
(async()=>{
  const noCalls={execute:async()=>{throw Error("Unexpected read");}};
  assert.equal((await inspect(noCalls,pack,{people:[]})).available,false);
  assert.equal((await inspect(noCalls,{...pack,leaders:[]},directory)).available,false);
  const calls=[];
  const connection={execute:async(query,values)=>{
    assert.match(query.sql,/^(EXPLAIN|SELECT) /,"never executes sports DML");assert.equal((query.sql.match(/\?/g)||[]).length,values.length);calls.push(query.sql);
    if(query.sql.startsWith("EXPLAIN")) return [[{table:"native",type:"range",key:"PRIMARY",rows:1}]];
    return [[{id:8,nom:"NOUVEAU",prenom:"Exemple",date:"1980-01-03",club:"106",option_person_id:null}]];
  }};
  const proof=await inspect(connection,pack,directory,async()=>competition);
  assert.equal(proof.available,true);assert.equal(proof.indexed,true);assert.equal(proof.explainCount,3);assert.equal(proof.writesExecuted,false);assert.equal(calls.length,4);
  assert.equal(JSON.stringify(proof).includes("NOUVEAU"),false);assert.equal(JSON.stringify(proof).includes("1980"),false);assert.equal(JSON.stringify(proof).includes('"values"'),false);
  let unsafeCalls=0;
  const unsafe=await inspect({execute:async()=>{unsafeCalls++;return [[{table:"officiels",type:"ALL",key:null,rows:100}]];}},pack,directory,async()=>competition);
  assert.equal(unsafe.indexed,false);assert.equal(unsafeCalls,1,"unsafe lookup refused before reading identities");
  console.log("Native official proof: three parameterized EXPLAINs, one indexed sample lookup, no mutation or identities in result verified");
})().catch(error=>{console.error(error);process.exitCode=1;});
