"use strict";
const assert=require("node:assert/strict");
const {editNativePerson,planIdentity,statement}=require("../functions/nap-club-person-edit");
const {person}=require("../functions/nap-club-people");
const original={id:7,nom:"Ancien",prenom:"Arnaud",date:"1980-01-03",club:"106"};
function fixture() {
  const state={native:{...original},options:null,audit:null,writes:0,queries:[],peers:[],allowed:false,released:0};
  const connection={execute:async({sql},values=[])=>{
    assert.equal(state.allowed,true);state.queries.push(sql);
    if(sql.includes("GET_LOCK")) return [[{acquired:state.busy?0:1}]];
    if(sql.includes("RELEASE_LOCK")) return [[{released:1}]];
    if(sql.includes("TRIGGERS")) return [state.trigger?[{}]:[]];
    if(sql.includes("FORCE INDEX")) return [state.peers];
    if(sql.startsWith("SELECT") && sql.includes("FROM officiels")) return [[{...state.native}]];
    if(sql.startsWith("SELECT") && sql.includes("FROM livepalmes_club_people_options")) return [state.options?[{...state.options}]:[]];
    assert.ok(sql.startsWith("UPDATE officiels SET"),"no other native/old LivePalmes write");
    assert.ok(state.audit,"backup before write");
    assert.deepEqual({sql,values},statement(state.audit.before,state.audit.after));
    if(state.cas) return [{affectedRows:0}];
    state.native={...state.audit.after};state.writes++;return [{affectedRows:1}];
  },release:()=>state.released++};
  state.input={clubId:"106",actorUid:"club-admin",personId:"nap-official-7",expectedFingerprint:person(original,"officials").napFingerprint,patch:{firstName:"Arnaud",lastName:"Correct",birthDate:original.date}};
  state.run=(input=state.input,authorize=()=>{state.allowed=true;})=>editNativePerson({getConnection:async()=>connection},input,{
    read:async()=>state.audit,
    prepare:async(_,plan)=>{state.audit=JSON.parse(JSON.stringify(plan));},
    complete:async()=>{if(state.interrupted) throw Error("audit interrupted");state.done=true;}
  },authorize);
  return state;
}
(async()=>{
  const denied=fixture();await assert.rejects(denied.run(denied.input,()=>{throw Error("denied");}),/denied/);assert.equal(denied.queries.length,0);
  const historical=fixture();await assert.rejects(historical.run({...historical.input,personId:"nap-leader-7"}),/ancienne declaration/);assert.equal(historical.queries.length,0);
  const s=fixture(),result=await s.run();assert.equal(s.writes,1);assert.equal(s.done,true);assert.equal(result.person.lastName,"Correct");assert.equal(result.person.licenseNumber,"");assert.equal(result.person.napSource,true);assert.equal(s.options,null);assert.ok(s.queries.length<=13);
  await s.run();assert.equal(s.writes,1,"same correction retry does not write twice");
  const interrupted=fixture();interrupted.interrupted=true;await assert.rejects(interrupted.run(),/interrupted/);assert.equal(interrupted.writes,1);interrupted.interrupted=false;await interrupted.run();assert.equal(interrupted.writes,1);assert.equal(interrupted.done,true);
  for(const tweak of [s=>s.native.club="107",s=>s.input.expectedFingerprint="f".repeat(64),s=>s.busy=true,s=>s.trigger=true,s=>s.cas=true,s=>s.peers=[{...original,id:8,nom:"Correct"}],s=>s.peers=Array(801).fill(original)]) {
    const bad=fixture();tweak(bad);await assert.rejects(bad.run());assert.equal(bad.writes,0);assert.equal(bad.released,1);
  }
  for(const patch of [{firstName:"",lastName:"Correct",birthDate:original.date},{firstName:"A",lastName:"B",birthDate:"2026-02-30"},{firstName:"A",lastName:"B",birthDate:original.date,club:"107"},{firstName:"A".repeat(101),lastName:"B",birthDate:original.date}]) assert.throws(()=>planIdentity(original,patch),TypeError);
  const stale=fixture();await stale.run();stale.native.prenom="IntraNAP";await assert.rejects(stale.run(),/fiche NAP a change/);assert.equal(stale.writes,1);
  const unchanged=fixture();unchanged.input.patch.lastName=original.nom;assert.equal((await unchanged.run()).unchanged,true);assert.equal(unchanged.writes,0);assert.equal(unchanged.audit,null);
  console.log("Correction officiel NAP : droits, empreinte, doublon, CAS, sauvegarde, reprise et aucun engagement/role/licence modifie verifies.");
})().catch(error=>{console.error(error);process.exitCode=1;});
