"use strict";
const assert=require("node:assert/strict");
const {saveNativeIndividualEntries:save}=require("../functions/nap-individual-entry-change");
const {fingerprint}=require("../functions/nap-portal-workspaces");
const {SPECS}=require("../functions/nap-portal-competition-change");
function fixture(options={}) {
  let allowed=false,saved=null,complete=0,history=0,writeCount=0,failAfter=0,prepareFails=false,completionFails=false;
  let individual=[{id:20,engagement:11,course:"100SF",tps:"14200"},{id:21,engagement:11,course:"50SF",tps:"3000"}];
  const pack={source:"nap",competitionId:"5140",clubId:"106",swimmers:[{id:"1",clubId:"106"}],inscriptions:[{id:11,nageur:1,compet:5140}],individual,leaders:[{id:30,compet:5140,nom:"TEST",prenom:"Exemple",date:"1990-01-01",club:"106",pourclub:""}],relays:[],members:[],officials:[],options:null};
  const competition={event:{entryStatus:"open",entryDeadlineAt:"2099-10-07T19:59:00.000Z"},nativeSnapshot:{competition:Object.fromEntries(SPECS.competitions.columns.map(key=>[key,key==="id"?5140:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,key==="id"||key==="compet"?5140:key==="actif"?1:null]))},options:null};
  const calls=[];
  const connection={release:()=>calls.push("release"),destroy:()=>calls.push("destroy"),execute:async(query,values)=>{
    assert.equal(allowed,true,"authorization precedes SQL");calls.push(query.sql);
    if(query.sql.startsWith("SELECT GET_LOCK")) return [[{acquired:1}]];
    if(query.sql.startsWith("SELECT RELEASE_LOCK")) return [[{released:1}]];
    if(query.sql.includes("information_schema.TRIGGERS")) return [[]];
    if(query.sql.startsWith("SELECT id FROM forfait")) return [options.forfeit ? [{id:9}] : []];
    if(query.sql.startsWith("EXPLAIN ")) {
      if(writeCount===0) assert.equal(saved,null,"all first-attempt plans must be inspected before the journal");
      return [[{table:"engagements",type:options.unsafePlan?"ALL":"range",key:options.unsafePlan?null:"PRIMARY",rows:2}]];
    }
    if(query.sql.startsWith("SELECT id,engagement")) return [structuredClone(individual)];
    assert.ok(saved,"durable journal precedes every native write");
    assert.match(query.sql,/UTC_TIMESTAMP\(\) < \?/);assert.match(query.sql,/FROM chefsdequipe scope_l/);
    assert.match(query.sql,/NOT EXISTS \(SELECT 1 FROM forfait scope_f/);
    if(options.conflictAt===writeCount+1) return [{affectedRows:0}];
    if(query.sql.startsWith("DELETE")) individual=individual.filter(row=>row.id!==21);
    else if(query.sql.startsWith("UPDATE")) individual=individual.map(row=>row.id===20?{...row,tps:"14100"}:row);
    else if(query.sql.startsWith("INSERT")) {assert.ok(!individual.some(row=>row.course==="200SF"));individual.push({id:22,engagement:11,course:"200SF",tps:"30000"});}
    else throw new Error("Unexpected query");
    writeCount++;if(failAfter===writeCount) throw new Error("Interrupted after applied native effect");return [{affectedRows:1}];
  }};
  const pool={getConnection:async()=>{assert.equal(allowed,true);return connection;}};
  const input={competitionId:5140,clubId:"106",actorUid:"test-actor",mutationId:"11111111-1111-4111-8111-111111111111",expectedFingerprint:fingerprint(pack),changes:[{swimmerId:1,entries:["100SF","200SF"]}]};
  const services={authorize:async()=>{allowed=true;},resolve:async()=>[{swimmerId:1,managedCourses:["50SF","100SF","200SF"],entries:[{course:"100SF",tps:"14100"},{course:"200SF",tps:"30000"}]}],readers:{competition:async()=>structuredClone(competition),entry:async()=>({...structuredClone(pack),individual:structuredClone(individual)}),history:async()=>{history++;return new Map();}},audit:{read:async()=>saved?structuredClone(saved):null,prepare:async(operation,target)=>{if(prepareFails) throw new Error("Journal unavailable");saved=structuredClone(target);},complete:async()=>{if(completionFails) {completionFails=false;throw new Error("Audit completion interrupted");}complete++;}}};
  return {pool,input,services,calls,competition,setFail:n=>{failAfter=n;},failPrepare:()=>{prepareFails=true;},failComplete:()=>{completionFails=true;},addUnexpected:()=>{individual.push({id:99,engagement:11,course:"400SF",tps:"060000"});},stats:()=>({writeCount,complete,history,individual})};
}
(async()=>{
  for(const options of [{unsafePlan:true},{forfeit:true}]) {
    const refused=fixture(options);
    await assert.rejects(()=>save(refused.pool,refused.input,refused.services),/Plan de recherche|forfaits/);
    assert.equal(refused.stats().writeCount,0);
    assert.equal(await refused.services.audit.read(),null,"refusal precedes the durable journal");
  }
  const conflict=fixture({conflictAt:2});
  await assert.rejects(()=>save(conflict.pool,conflict.input,conflict.services),/dossier a change/);
  assert.equal(conflict.stats().writeCount,1,"a guarded conflict stops later insertions");
  assert.ok(await conflict.services.audit.read(),"the before-image survives a partial MyISAM write");
  let f=fixture();let result=await save(f.pool,f.input,f.services);assert.equal(result.writesExecuted,3);assert.equal(f.stats().complete,1);assert.equal(f.stats().history,1);assert.equal(f.stats().individual.length,2);assert.equal(result.nativeEntry.individual.find(row=>row.id===20).tps,"14100");assert.equal(f.calls.at(-1),"release");
  result=await save(f.pool,f.input,f.services);assert.equal(result.writesExecuted,0);assert.equal(f.stats().writeCount,3);assert.equal(f.stats().history,1);
  for(const step of [1,2,3]) {
    f=fixture();f.setFail(step);await assert.rejects(()=>save(f.pool,f.input,f.services),/Interrupted/);f.setFail(0);
    await save(f.pool,f.input,f.services);assert.equal(f.stats().writeCount,3);assert.equal(f.stats().history,1);assert.equal(f.stats().individual.filter(row=>row.course==="200SF").length,1);
  }
  f=fixture();f.failPrepare();await assert.rejects(()=>save(f.pool,f.input,f.services),/Journal/);assert.equal(f.stats().writeCount,0);
  f=fixture();f.failComplete();await assert.rejects(()=>save(f.pool,f.input,f.services),/Audit/);f.competition.event.entryStatus="closed";await save(f.pool,f.input,f.services);assert.equal(f.stats().writeCount,3);
  f=fixture();f.setFail(1);await assert.rejects(()=>save(f.pool,f.input,f.services));f.addUnexpected();f.setFail(0);await assert.rejects(()=>save(f.pool,f.input,f.services),/ailleurs/);assert.equal(f.stats().writeCount,1);
  f=fixture();f.competition.event.entryStatus="closed";await assert.rejects(()=>save(f.pool,f.input,f.services),/fermes/);assert.equal(f.stats().writeCount,0);
  f=fixture();f.services.authorize=async()=>{throw new Error("Denied");};await assert.rejects(()=>save(f.pool,f.input,f.services),/Denied/);assert.deepEqual(f.calls,[]);
  f=fixture();await assert.rejects(()=>save(f.pool,{...f.input,expectedFingerprint:"a".repeat(64)},f.services),/change/);assert.equal(f.stats().writeCount,0);
  console.log("NAP individual entry writes: authorization, journal, interruption recovery and closure passed without network");
})().catch(error=>{console.error(error);process.exitCode=1;});
