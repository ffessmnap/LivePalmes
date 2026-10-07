"use strict";
const assert=require("node:assert/strict");
const {saveNativeRelayChanges:save}=require("../functions/nap-relay-entry-change");
const {fingerprint}=require("../functions/nap-portal-workspaces");
const {SPECS}=require("../functions/nap-portal-competition-change");
function fixture(options={}) {
  let authorized=false,saved=null,writes=0,interruption=0,completions=0,prepareFailure=false;
  let relays=[{id:12,compet:5140,categorie:0,club:"48",course:261,tps:"000315"},{id:13,compet:5140,categorie:999,club:"48",course:261,tps:"000340"}];
  let members=[{id:21,relais:12,pos:0,nageur:912},{id:22,relais:12,pos:5,nageur:913}];
  const pack={source:"nap",competitionId:"5140",clubId:"48",swimmers:[],inscriptions:[],individual:[],officials:[],options:null,leaders:[{id:30,compet:5140,nom:"CHEF",prenom:"Exemple",date:"1980-01-01",club:"48",pourclub:""}],relays,members};
  const competition={event:{entryStatus:"open",entryDeadlineAt:"2099-10-07T19:59:00.000Z"},nativeSnapshot:{competition:Object.fromEntries(SPECS.competitions.columns.map(key=>[key,key==="id"?5140:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,key==="id"||key==="compet"?5140:key==="actif"?1:null]))},options:null};
  const calls=[];
  const connection={release:()=>calls.push("release"),destroy:()=>calls.push("destroy"),execute:async(query)=>{
    assert.ok(authorized);calls.push(query.sql);
    if(query.sql.startsWith("SELECT GET_LOCK")) return [[{acquired:1}]];
    if(query.sql.startsWith("SELECT RELEASE_LOCK")) return [[{released:options.failedRelease?0:1}]];
    if(query.sql.includes("information_schema.TRIGGERS")) return [options.trigger?[{TRIGGER_NAME:"test"}]:[]];
    if(query.sql.startsWith("EXPLAIN")) return [[{table:"engagements_relais",type:options.unsafe?"ALL":"range",key:options.unsafe?null:"PRIMARY",rows:1}]];
    assert.ok(saved,"journal precedes every MyISAM write");
    assert.match(query.sql,/UTC_TIMESTAMP\(\) < \?/);
    if(options.conflict===writes+1) return [{affectedRows:0}];
    let affectedRows=1;
    if(query.sql.startsWith("UPDATE")) relays=relays.map(row=>row.id===12?{...row,tps:"031500"}:row);
    else if(query.sql.startsWith("DELETE FROM engagements_relayeurs")) {affectedRows=members.filter(row=>row.relais===12).length;members=members.filter(row=>row.relais!==12);}
    else if(query.sql.startsWith("DELETE FROM engagements_relais")) relays=relays.filter(row=>row.id!==12);
    else throw new Error("Unexpected SQL");
    writes++;if(interruption===writes) throw new Error("Interrupted after applied effect");
    return [{affectedRows}];
  }};
  const pool={getConnection:async()=>{assert.ok(authorized);return connection;}};
  const input={competitionId:5140,clubId:"48",actorUid:"test-actor",mutationId:"11111111-1111-4111-8111-111111111111",expectedFingerprint:fingerprint(pack),changes:[options.time?{relayId:12,action:"time",time:"031500"}:{relayId:12,action:"remove"}]};
  const services={authorize:async()=>{authorized=true;},resolve:async({changes})=>changes,readers:{competition:async()=>structuredClone(competition),entry:async()=>({...structuredClone(pack),relays:structuredClone(relays),members:structuredClone(members)})},audit:{read:async()=>saved?structuredClone(saved):null,prepare:async(operation,target)=>{if(prepareFailure) throw new Error("Journal unavailable");saved=structuredClone(target);},complete:async()=>{completions++;}}};
  return {pool,input,services,calls,competition,setInterruption:n=>{interruption=n;},failPrepare:()=>{prepareFailure=true;},concurrentMember:()=>{members.push({id:23,relais:12,pos:3,nageur:914});},stats:()=>({writes,completions,relays,members,saved})};
}
(async()=>{
  let f=fixture(),result=await save(f.pool,f.input,f.services);
  assert.equal(result.writesExecuted,2);assert.equal(f.stats().completions,1);
  assert.equal(result.nativeEntry.relays[0].tps,"000340","unrelated raw time/category is retained");
  assert.equal(result.nativeEntry.relays[0].categorie,999);
  assert.equal(fingerprint(result.nativeEntry),fingerprint(await f.services.readers.entry()));
  f.competition.event.entryStatus="closed";
  result=await save(f.pool,f.input,f.services);assert.equal(result.writesExecuted,0,"completed retries may be acknowledged after closure");
  for(const step of [1,2]) {
    f=fixture();f.setInterruption(step);await assert.rejects(()=>save(f.pool,f.input,f.services),/Interrupted/);
    f.setInterruption(0);await save(f.pool,f.input,f.services);assert.equal(f.stats().writes,2,"applied effects are not repeated");
  }
  f=fixture({time:true});f.setInterruption(1);await assert.rejects(()=>save(f.pool,f.input,f.services));
  f.setInterruption(0);result=await save(f.pool,f.input,f.services);assert.equal(result.writesExecuted,0);assert.equal(f.stats().writes,1);
  f=fixture();f.setInterruption(1);await assert.rejects(()=>save(f.pool,f.input,f.services));
  f.setInterruption(0);f.concurrentMember();await assert.rejects(()=>save(f.pool,f.input,f.services),/composition/);assert.equal(f.stats().writes,1);
  for(const options of [{unsafe:true},{trigger:true},{conflict:1}]) {
    f=fixture(options);await assert.rejects(()=>save(f.pool,f.input,f.services));assert.equal(f.stats().writes,0);
  }
  f=fixture();f.failPrepare();await assert.rejects(()=>save(f.pool,f.input,f.services),/Journal/);assert.equal(f.stats().writes,0);
  f=fixture();f.competition.event.entryStatus="closed";await assert.rejects(()=>save(f.pool,f.input,f.services),/fermes/);assert.equal(f.stats().writes,0);
  f=fixture();f.services.authorize=async()=>{throw new Error("Denied");};await assert.rejects(()=>save(f.pool,f.input,f.services),/Denied/);assert.deepEqual(f.calls,[]);
  f=fixture({failedRelease:true});await save(f.pool,f.input,f.services);assert.equal(f.calls.at(-1),"destroy");
  f=fixture();f.services.readers.entry=async connection=>{
    for(let index=0;index<61;index++) await connection.execute({sql:"SELECT GET_LOCK(?,0) AS acquired"},["mock"]);
  };
  await assert.rejects(()=>save(f.pool,f.input,f.services),/Budget/);
  assert.equal(f.stats().writes,0);assert.equal(f.calls.at(-1),"release","cleanup remains available after the enforced query ceiling");
  console.log("Relay native service: authorization, durable before-image, partial MyISAM recovery, closure, concurrent members, indexed plans and cleanup; no network or database.");
})().catch(error=>{console.error(error);process.exitCode=1;});
