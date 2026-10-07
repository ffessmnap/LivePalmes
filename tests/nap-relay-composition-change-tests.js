"use strict";
const assert=require("node:assert/strict");
const {saveNativeRelayComposition:save}=require("../functions/nap-relay-composition-change");
const {fingerprint}=require("../functions/nap-portal-workspaces");
const {SPECS}=require("../functions/nap-portal-competition-change");
function fixture(compose=false) {
  let authorized=false,saved=null,options=null,writes=0,failAt=0,complete=0,failCheckpoint=false;
  const after={compet:5141,club:106,categorie:0,course:261,tps:"031500"};
  let relays=compose?[{id:99,...after,categorie:999,tps:"000315"}]:[],members=compose?[{id:55,relais:99,pos:5,nageur:8}]:[];
  const people=[1,2,3,4].map(id=>({id,club:"106",date:"2000-01-01",sexe:id%2?"M":"F"}));
  const base={source:"nap",competitionId:"5141",clubId:"106",swimmers:people.map(row=>({id:row.id,clubId:"106"})),inscriptions:people.map(row=>({id:row.id,nageur:row.id,compet:5141})),individual:[],officials:[],leaders:[{id:30,compet:5141,nom:"CHEF",prenom:"Exemple",date:"1980-01-01",club:"106",pourclub:""}]};
  const read=()=>({...structuredClone(base),relays:structuredClone(relays),members:structuredClone(members),options:structuredClone(options)});
  const competition={event:{entryStatus:"open",entryDeadlineAt:"2099-01-01T00:00:00.000Z"},nativeSnapshot:{competition:Object.fromEntries(SPECS.competitions.columns.map(key=>[key,key==="id"?5141:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,key==="id"||key==="compet"?5141:key==="actif"?1:null]))},options:null};
  const calls=[];
  const connection={release:()=>calls.push("release"),destroy:()=>calls.push("destroy"),execute:async(query,values=[])=>{
    assert.ok(authorized);calls.push(query.sql);
    if(query.sql.startsWith("SELECT GET_LOCK")) return [[{acquired:1}]];
    if(query.sql.startsWith("SELECT RELEASE_LOCK")) return [[{released:1}]];
    if(query.sql.startsWith("EXPLAIN")) return [[{table:"mock-source",type:"const",key:"PRIMARY",rows:1}]];
    if(query.sql.includes("information_schema.TRIGGERS")) return [[]];
    if(query.sql.startsWith("SELECT id,compet")) return [structuredClone(relays)];
    if(query.sql.startsWith("SELECT id,relais")) return [structuredClone(members)];
    assert.ok(saved,"durable intent before every native write");
    assert.match(query.sql,/UTC_TIMESTAMP\(\) < \?/);
    let affectedRows=1;
    if(query.sql.startsWith("INSERT INTO engagements_relais")) {assert.equal(saved.phase,"writing");assert.equal(relays.length,0);relays=[{id:99,...after}];}
    else if(query.sql.startsWith("UPDATE engagements_relais")) relays=[{id:99,...after}];
    else if(query.sql.startsWith("DELETE FROM engagements_relayeurs")) {affectedRows=members.length;members=[];}
    else if(query.sql.startsWith("INSERT INTO engagements_relayeurs")) {assert.ok(!members.length);affectedRows=4;members=people.map((row,index)=>({id:100+index,relais:99,pos:index+1,nageur:row.id}));}
    else if(query.sql.startsWith("INSERT INTO livepalmes_club_entry_options")) options={competition_id:5141,club_id:106,version:1,submission_metadata:JSON.parse(values[2])};
    else throw new Error("Unexpected SQL");
    writes++;if(failAt===writes) throw new Error("Interrupted after applied effect");
    return [{affectedRows,insertId:99}];
  }};
  const pool={getConnection:async()=>{assert.ok(authorized);return connection;}};
  const input={competitionId:5141,clubId:"106",actorUid:"test-actor",mutationId:"11111111-1111-4111-8111-111111111111",expectedFingerprint:fingerprint(read()),change:{action:compose?"compose":"create",...(compose?{relayId:99}:{})}};
  const services={authorize:async()=>{authorized=true;},readers:{competition:async()=>structuredClone(competition),entry:async()=>read()},resolve:async()=>({action:input.change.action,relayId:compose?99:undefined,native:after,members:people.map((row,index)=>({nageur:row.id,pos:index+1})),course:{id_course:261,course:"4X100BI Mixte",sexe:"0",relais:1},people,detail:{category:"J",genderMode:"mixed"}}),audit:{read:async()=>saved?structuredClone(saved):null,prepare:async(operation,target)=>{saved=structuredClone(target);},checkpoint:async(operation,target)=>{if(failCheckpoint && target.phase==="identified") throw new Error("Checkpoint unavailable");saved=structuredClone(target);},complete:async()=>{complete++;}}};
  return {pool,input,services,competition,calls,setFail:n=>{failAt=n;},failCheckpoint:()=>{failCheckpoint=true;},stats:()=>({writes,complete,relays,members,options,saved})};
}
(async()=>{
  let f=fixture();let result=await save(f.pool,f.input,f.services);
  assert.equal(result.writesExecuted,3);assert.equal(result.nativeEntry.members.length,4);assert.equal(result.nativeEntry.relays[0].categorie,0);
  assert.equal(result.nativeEntry.options.submission_metadata.relay_details_v1["99"].category,"J");
  f.competition.event.entryStatus="closed";result=await save(f.pool,f.input,f.services);assert.equal(result.writesExecuted,0);
  for(const step of [2,3]) {
    f=fixture();f.setFail(step);await assert.rejects(()=>save(f.pool,f.input,f.services),/Interrupted/);f.setFail(0);
    await save(f.pool,f.input,f.services);assert.equal(f.stats().writes,3);assert.equal(f.stats().relays.length,1);assert.equal(f.stats().members.length,4);
  }
  f=fixture();f.setFail(1);await assert.rejects(()=>save(f.pool,f.input,f.services));f.setFail(0);
  await assert.rejects(()=>save(f.pool,f.input,f.services),/identifiant non confirme/);assert.equal(f.stats().writes,1,"uncertain auto-increment insert is never repeated");
  f=fixture();f.failCheckpoint();await assert.rejects(()=>save(f.pool,f.input,f.services),/Checkpoint/);
  await assert.rejects(()=>save(f.pool,f.input,f.services),/identifiant non confirme/);assert.equal(f.stats().writes,1);
  f=fixture(true);result=await save(f.pool,f.input,f.services);assert.equal(result.writesExecuted,4);assert.deepEqual(result.nativeEntry.members.map(row=>row.pos),[1,2,3,4]);
  for(const step of [1,2,3]) {f=fixture(true);f.setFail(step);await assert.rejects(()=>save(f.pool,f.input,f.services));f.setFail(0);await save(f.pool,f.input,f.services);assert.equal(f.stats().writes,4);}
  f=fixture();f.services.authorize=async()=>{throw new Error("Denied");};await assert.rejects(()=>save(f.pool,f.input,f.services),/Denied/);assert.deepEqual(f.calls,[]);
  f=fixture();f.services.resolve=async()=>({action:"create",native:{compet:5141,club:"106",categorie:0,course:261,tps:"031500"},members:[],people:[],course:{id_course:261,course:"4X100BI Mixte",sexe:"0",relais:1},detail:{category:"invented",genderMode:"mixed"}});await assert.rejects(()=>save(f.pool,f.input,f.services),/Categorie/);assert.equal(f.stats().writes,0);
  console.log("Full native relay composition: one generated relay, four members, additive category detail, closure, interrupted effects and uncertain generated-id checkpoint; no network or database.");
})().catch(error=>{console.error(error);process.exitCode=1;});
