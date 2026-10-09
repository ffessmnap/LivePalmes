"use strict";
const assert=require("node:assert/strict");
const schema=require("../functions/nap-approved-person-history-schema");
const {person}=require("../functions/nap-club-people");
const {COLUMNS}=require("../functions/nap-person-deletion-plan");
const service=require("../functions/nap-person-deletion");
// Schema guards have their own strict metadata tests; mock only the inspection.
const oldInspect=schema.inspect,oldValidate=schema.validate;
schema.inspect=async()=>({});schema.validate=()=>({history:true,index:true});
function fixture() {
  const native={id:7,nom:"NOM",prenom:"Prenom",date:"1980-01-01",club:"106"};
  const state={native,options:null,entries:[{id:1,compet:10,officiel:7,club:"106"}],history:[],saved:null,locked:false,mutations:0,fail:"",released:false};
  const input={personId:"nap-official-7",actorUid:"national",confirmPermanent:true,expectedFingerprint:person(native,"officials").napFingerprint};
  const connection={execute:async({sql},values=[])=>{
    if(sql.includes("GET_LOCK"))return [[{acquired:1}]];
    if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
    if(sql.includes("information_schema.TRIGGERS"))return [[]];
    if(sql.startsWith("SELECT id,nom"))return [state.native?[structuredClone(state.native)]:[]];
    if(sql.startsWith("SELECT") && sql.includes("FROM livepalmes_club_people_options"))return [state.options?[structuredClone(state.options)]:[]];
    if(sql.startsWith("SELECT") && sql.includes("FROM officielsengager"))return [structuredClone(state.entries)];
    if(sql.startsWith("SELECT") && sql.includes("livepalmes_deleted_people_history"))return [structuredClone(state.history)];
    if(sql.startsWith("SELECT id FROM officiels"))return [state.native?[{id:7}]:[]];
    assert.equal(state.locked,true,"All sporting mutations require table locks");assert.ok(state.saved,"Backup before any mutation");
    if(sql.startsWith("INSERT INTO livepalmes_deleted_people_history")) {
      if(state.fail==="archive")throw Error("archive failure");
      state.history=Array.from({length:values.length/COLUMNS.length},(_,i)=>Object.fromEntries(COLUMNS.map((c,j)=>[c,values[i*COLUMNS.length+j]])));state.mutations++;return [{affectedRows:state.history.length}];
    }
    if(sql.startsWith("DELETE FROM officiels ")) {
      if(state.fail==="before-delete")throw Error("interruption");
      state.native=null;state.mutations++;if(state.fail==="after-delete")throw Error("lost response");return [{affectedRows:1}];
    }
    if(sql.startsWith("DELETE FROM livepalmes_club_people_options")){state.options=null;state.mutations++;return [{affectedRows:1}];}
    throw Error(sql);
  },query:async({sql})=>{if(sql.startsWith("LOCK TABLES"))state.locked=true;else if(sql==="UNLOCK TABLES")state.locked=false;else throw Error(sql);return [];},release:()=>{state.released=true;},destroy:()=>{state.released=true;}};
  const pool={getConnection:async()=>connection};
  const audit={read:async()=>structuredClone(state.saved),prepare:async(key,plan)=>{if(state.fail==="backup")throw Error("backup failed");state.saved=structuredClone(plan);},complete:async()=>{if(state.fail==="complete")throw Error("journal failed");}};
  return {state,input,pool,audit,run:()=>service.deletePerson(pool,input,audit,()=>{})};
}
(async()=>{
  let f=fixture();let result=await f.run();assert.equal(result.historicalEntries,1);assert.equal(f.state.native,null);assert.equal(f.state.history[0].nom,"NOM");assert.equal(f.state.entries.length,1);assert.equal(f.state.locked,false);assert.equal(f.state.released,true);assert.equal(f.state.mutations,2);
  result=await f.run();assert.equal(result.ok,true);assert.equal(f.state.mutations,2,"Retry does not repeat native writes");
  for(const fail of ["backup","archive","before-delete","after-delete","complete"]) {
    f=fixture();f.state.fail=fail;await assert.rejects(f.run());assert.equal(f.state.locked,false);assert.equal(f.state.released,true);
    if(["backup","archive"].includes(fail))assert.ok(f.state.native,"A failed backup/archive prevents deletion");
    f.state.fail="";await f.run();assert.equal(f.state.native,null);assert.equal(f.state.history.length,1);assert.equal(f.state.entries.length,1);
  }
  f=fixture();f.state.options={source:"officiels",person_id:7,club_id:"106",role_team_leader:1,role_official:1,active:1,version:1,created_at:"2026-01-01 00:00:00.000000",updated_at:"2026-01-01 00:00:00.000000",created_by:"national",updated_by:"national"};f.input.expectedFingerprint=person(f.state.native,"officials",f.state.options).napFingerprint;
  f.state.fail="after-delete";await assert.rejects(f.run());assert.ok(f.state.options);f.state.fail="";await f.run();assert.equal(f.state.options,null,"Interrupted native deletion still cleans the saved options safely");
  f=fixture();f.state.fail="before-delete";await assert.rejects(f.run());f.state.fail="";f.state.entries.push({id:2,compet:11,officiel:7,club:"106"});await assert.rejects(f.run(),TypeError);assert.ok(f.state.native);
  f=fixture();await assert.rejects(service.deletePerson(f.pool,f.input,f.audit,()=>{throw Error("denied");}));assert.equal(f.state.saved,null);assert.equal(f.state.mutations,0);
  f=fixture();f.input.expectedFingerprint="0".repeat(64);await assert.rejects(f.run(),TypeError);assert.equal(f.state.mutations,0);
  console.log("Native person deletion: authorization, table locks, backup/archive before deletion, preserved links, all interruption retries and concurrent-history refusal passed without network.");
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{schema.inspect=oldInspect;schema.validate=oldValidate;});
