"use strict";
const assert=require("node:assert/strict");
const {saveNativeOfficials:save,indexed,readPeople}=require("../functions/nap-official-entry-change");
const {fingerprint}=require("../functions/nap-portal-workspaces");
const {SPECS}=require("../functions/nap-portal-competition-change");
function fixture(options={}) {
  let allowed=false,saved=null,writes=0,complete=0,peopleReads=0,failAfter=0,failComplete=false,failPrepare=false;
  const calls=[],native={id:8,nom:"NOUVEAU",prenom:"Exemple",date:"1980-01-03",club:"106"};
  let officials=[{id:20,compet:5140,officiel:9,club:"106",nom:"EXISTANT",prenom:"Autre",date:"1980-01-04"}];
  const pack={source:"nap",competitionId:"5140",clubId:"106",swimmers:[],inscriptions:[],individual:[],relays:[],members:[],officials,leaders:[{id:30,compet:5140,nom:"CHEF",prenom:"Autre",date:"1970-01-01",club:"106",pourclub:""}],options:null};
  const competition={event:{entryStatus:"open",entryDeadlineAt:"2099-10-07T19:59:00.000Z"},nativeSnapshot:{competition:Object.fromEntries(SPECS.competitions.columns.map(key=>[key,key==="id"?5140:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,key==="id"||key==="compet"?5140:key==="actif"?1:null]))},options:null};
  const connection={release:()=>calls.push("release"),destroy:()=>calls.push("destroy"),execute:async(query)=>{
    assert.equal(allowed,true,"authorization precedes SQL");calls.push(query.sql);
    if(query.sql.startsWith("SELECT GET_LOCK")) return [[{acquired:1}]];
    if(query.sql.startsWith("SELECT RELEASE_LOCK")) return [[{released:1}]];
    if(query.sql.includes("information_schema.TRIGGERS")) return [options.trigger?[{TRIGGER_NAME:"sample"}]:[]];
    if(query.sql.startsWith("EXPLAIN ")) {if(writes===0) assert.equal(saved,null,"plans inspected before first journal");return [[{table:"officielsengager",type:options.unsafe?"ALL":"range",key:options.unsafe?null:"PRIMARY",rows:1}]];}
    if(query.sql.startsWith("SELECT e.id")) return [structuredClone(officials)];
    assert.ok(saved,"durable journal precedes native writes");assert.match(query.sql,/FROM chefsdequipe scope_l/);assert.match(query.sql,/UTC_TIMESTAMP\(\) < \?/);
    if(options.conflict===writes+1) return [{affectedRows:0}];
    if(query.sql.startsWith("DELETE")) officials=[];
    else if(query.sql.startsWith("INSERT")) {assert.ok(!officials.some(row=>row.officiel===8));officials.push({id:21,compet:5140,officiel:8,club:"106",nom:native.nom,prenom:native.prenom,date:native.date});}
    else throw Error("Unexpected query");
    if(++writes===failAfter) throw Error("Interrupted after native effect");return [{affectedRows:1}];
  }};
  const services={authorize:async()=>{allowed=true;},readers:{competition:async()=>structuredClone(competition),entry:async()=>({...structuredClone(pack),officials:structuredClone(officials)}),people:async(c,ids,clubId)=>{assert.equal(c,connection);assert.deepEqual(ids,[8]);assert.equal(clubId,"106");peopleReads++;return [{native,options:null}];}},audit:{read:async()=>saved?structuredClone(saved):null,prepare:async(operation,target)=>{if(failPrepare) throw Error("Journal unavailable");saved=structuredClone(target);},complete:async()=>{if(failComplete) {failComplete=false;throw Error("Audit unavailable");}complete++;}}};
  return {pool:{getConnection:async()=>{assert.equal(allowed,true);return connection;}},services,input:{competitionId:5140,clubId:"106",actorUid:"actor",mutationId:"11111111-1111-4111-8111-111111111111",expectedFingerprint:fingerprint(pack),officialPersonIds:["nap-official-8"]},competition,calls,setFail:n=>{failAfter=n;},failPrepare:()=>{failPrepare=true;},failComplete:()=>{failComplete=true;},changeElsewhere:()=>{pack.individual.push({id:99});},stats:()=>({writes,complete,peopleReads,officials,saved})};
}
(async()=>{
  for(const options of [{unsafe:true},{trigger:true}]) {const f=fixture(options);await assert.rejects(()=>save(f.pool,f.input,f.services),/Plan|Declencheur/);assert.equal(f.stats().writes,0);assert.equal(f.stats().saved,null);}
  let f=fixture(),result=await save(f.pool,f.input,f.services);assert.equal(result.writesExecuted,2);assert.equal(f.stats().officials[0].officiel,8);assert.equal(fingerprint(result.nativeEntry),fingerprint(await f.services.readers.entry()));
  result=await save(f.pool,f.input,f.services);assert.equal(result.writesExecuted,0);assert.equal(f.stats().writes,2);assert.equal(f.stats().peopleReads,1);
  for(const step of [1,2]) {f=fixture();f.setFail(step);await assert.rejects(()=>save(f.pool,f.input,f.services),/Interrupted/);f.setFail(0);await save(f.pool,f.input,f.services);assert.equal(f.stats().writes,2);assert.equal(f.stats().officials.length,1);assert.equal(f.stats().peopleReads,1);}
  f=fixture({conflict:2});await assert.rejects(()=>save(f.pool,f.input,f.services),/dossier a change/);assert.equal(f.stats().writes,1);assert.ok(f.stats().saved);
  f=fixture();f.failPrepare();await assert.rejects(()=>save(f.pool,f.input,f.services),/Journal/);assert.equal(f.stats().writes,0);
  f=fixture();f.failComplete();await assert.rejects(()=>save(f.pool,f.input,f.services),/Audit/);f.competition.event.entryStatus="closed";await save(f.pool,f.input,f.services);assert.equal(f.stats().writes,2);
  f=fixture();f.setFail(1);await assert.rejects(()=>save(f.pool,f.input,f.services));f.setFail(0);f.changeElsewhere();await assert.rejects(()=>save(f.pool,f.input,f.services),/modifie ailleurs/);assert.equal(f.stats().writes,1);
  f=fixture();f.services.authorize=async()=>{throw Error("Denied");};await assert.rejects(()=>save(f.pool,f.input,f.services),/Denied/);assert.deepEqual(f.calls,[]);
  assert.equal(indexed({kind:"insert"},[{select_type:"INSERT",table:"officielsengager",type:"ALL",key:null}]),true);assert.equal(indexed({kind:"insert"},[{table:"officiels",type:"ALL",key:null,rows:100}]),false);
  let read=0;assert.deepEqual(await readPeople({execute:()=>{throw Error("Unexpected read");}},[],"106"),[]);
  const people=await readPeople({execute:async(query,values)=>{read++;assert.match(query.sql,/FORCE INDEX \(PRIMARY\).*LIMIT 80$/);assert.deepEqual(values,[8,"106"]);return [[{id:8,nom:"NOUVEAU",prenom:"Exemple",date:null,club:"106",option_person_id:null}]];}},[8],"106");assert.equal(read,1);assert.equal(people[0].native.id,8);assert.equal(people[0].options,null);
  console.log("Native official executor: auth, grouped lookup, guarded plans, journal/retry, partial conflict, closure confirmation and returned fingerprint verified without network");
})().catch(error=>{console.error(error);process.exitCode=1;});
