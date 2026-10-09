"use strict";
const assert=require("node:assert/strict"),schema=require("../functions/nap-approved-person-history-schema");
const {person,OPTION_COLUMNS}=require("../functions/nap-club-people");
const plans=require("../functions/nap-person-merge-plan"),service=require("../functions/nap-person-merge");
const oldInspect=schema.inspect,oldValidate=schema.validate;schema.inspect=async()=>({});schema.validate=()=>({history:true,index:true});
function fixture() {
 const source={id:7,nom:"SOURCE",prenom:"Personne",date:"1980-01-01",club:"106"},target={id:8,nom:"CIBLE",prenom:"Personne",date:"1980-01-01",club:"106"};
 const state={people:[source,target],options:[],links:[{id:1,compet:10,officiel:7,club:"106"},{id:2,compet:11,officiel:7,club:"106"},{id:3,compet:10,officiel:8,club:"106"}],saved:null,fail:"",locked:false,writes:0,sql:0};
 const input={sourcePersonId:"nap-official-7",targetPersonId:"nap-official-8",actorUid:"national",confirmMerge:true,sourceFingerprint:person(source,"officials").napFingerprint,targetFingerprint:person(target,"officials").napFingerprint};
 const interrupt=stage=>{if(state.fail===stage)throw Error("interrupted "+stage);};
 const connection={execute:async({sql},values=[])=>{
  state.sql++;
  if(sql.includes("GET_LOCK"))return [[{acquired:1}]];if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
  if(sql.includes("information_schema.TRIGGERS"))return [[]];
  if(sql.startsWith("EXPLAIN"))return [[{table:sql.includes("INSERT INTO")?"livepalmes_club_people_options":"native",select_type:sql.includes("INSERT INTO")?"INSERT":"SIMPLE",type:sql.includes("INSERT INTO")?"ALL":"range",key:sql.includes("INSERT INTO")?null:"PRIMARY"}]];
  if(sql.startsWith("SELECT id,nom"))return [structuredClone(state.people)];
  if(sql.startsWith("SELECT") && sql.includes("FROM livepalmes_club_people_options"))return [structuredClone(state.options)];
  if(sql.startsWith("SELECT id,compet"))return [structuredClone(state.links).sort((a,b)=>a.officiel-b.officiel||a.id-b.id)];
  if(sql.startsWith("SELECT engagement_id"))return [[]];
  assert.equal(state.locked,true);assert.ok(state.saved);state.writes++;
  if(sql.startsWith("INSERT INTO livepalmes_club_people_options")){state.options.push(Object.fromEntries(OPTION_COLUMNS.map((c,i)=>[c,values[i]])));interrupt("options");return [{affectedRows:1}];}
  if(sql.startsWith("UPDATE livepalmes_club_people_options")){const row=state.options.find(r=>r.person_id===values[7]);for(const [i,c] of ["role_team_leader","role_official","active","version","updated_at","updated_by"].entries())row[c]=values[i];interrupt("options");return [{affectedRows:1}];}
  if(sql.startsWith("UPDATE officielsengager")){for(let i=1;i<values.length;i+=4){const row=state.links.find(r=>r.id===values[i]);assert.equal(row.officiel,values[i+2]);row.officiel=values[0];}interrupt("updates");return [{affectedRows:(values.length-1)/4}];}
  if(sql.startsWith("DELETE FROM officielsengager")){const ids=values.filter((v,i)=>i%4===0);state.links=state.links.filter(r=>!ids.includes(r.id));interrupt("removals");return [{affectedRows:ids.length}];}
  if(sql.startsWith("DELETE FROM officiels ")){state.people=state.people.filter(p=>p.id!==values[0]);interrupt("source");return [{affectedRows:1}];}
  if(sql.startsWith("DELETE FROM livepalmes_club_people_options")){state.options=state.options.filter(p=>p.person_id!==values[1]);interrupt("source-options");return [{affectedRows:1}];}
  throw Error(sql);
 },query:async({sql})=>{state.sql++;if(sql.startsWith("LOCK TABLES"))state.locked=true;else if(sql==="UNLOCK TABLES")state.locked=false;else throw Error(sql);return [];},release:()=>{},destroy:()=>{}};
 const audit={read:async()=>structuredClone(state.saved),prepare:async(key,p)=>{interrupt("backup");state.saved=structuredClone(p);},complete:async()=>interrupt("complete")};
 const pool={getConnection:async()=>connection};return {state,input,source,target,pool,audit,run:()=>service.mergePeople(pool,input,audit,()=>{})};
}
(async()=>{
 let f=fixture();const plan=plans.planMerge({...f.input,timestamp:"2026-10-09 20:00:00.000000"},f.source,f.target,null,null,f.state.links);
 assert.equal(plan.updates.length,1);assert.equal(plan.removals.length,1);assert.equal(plan.target.nom,"CIBLE");assert.equal(plan.afterOptions.active,1);assert.ok(plan.afterLinks.every(r=>r.officiel===8));plans.validateSaved(plan,f.input);
 assert.throws(()=>plans.planMerge({...f.input,timestamp:"2026-10-09 20:00:00.000000"},f.source,{...f.target,club:"107"},null,null,[]),TypeError);
 let result=await f.run();assert.equal(result.officialsUpdateCount,2);assert.equal(result.targetPerson.lastName,"CIBLE");assert.equal(f.state.people.length,1);assert.equal(f.state.links.length,2);assert.equal(f.state.locked,false);assert.ok(f.state.sql<=35);const writes=f.state.writes;await f.run();assert.equal(f.state.writes,writes,"Lost completion can be retried without repeated writes");
 for(const fail of ["backup","options","updates","removals","source","complete"]) {f=fixture();f.state.fail=fail;await assert.rejects(f.run());assert.equal(f.state.locked,false);f.state.fail="";await f.run();assert.equal(f.state.people.length,1);assert.equal(f.state.links.length,2);assert.equal(f.state.options.length,1);}
 f=fixture();const option=(id,leader,official)=>({source:"officiels",person_id:id,club_id:"106",role_team_leader:leader,role_official:official,active:1,version:1,created_at:"2026-01-01 00:00:00.000000",updated_at:"2026-01-01 00:00:00.000000",created_by:"national",updated_by:"national"});f.state.options=[option(7,1,0),option(8,0,1)];f.input.sourceFingerprint=person(f.source,"officials",f.state.options[0]).napFingerprint;f.input.targetFingerprint=person(f.target,"officials",f.state.options[1]).napFingerprint;f.state.fail="source";await assert.rejects(f.run());f.state.fail="";result=await f.run();assert.equal(f.state.options.length,1);assert.equal(result.targetPerson.roles.teamLeader,true);assert.equal(result.targetPerson.roles.official,true);
 f=fixture();await assert.rejects(service.mergePeople(f.pool,f.input,f.audit,()=>{throw Error("denied");}));assert.equal(f.state.sql,0);
 f=fixture();f.state.fail="options";await assert.rejects(f.run());f.state.fail="";f.state.links.push({id:4,compet:12,officiel:7,club:"106"});await assert.rejects(f.run(),TypeError);assert.equal(f.state.people.length,2);
 console.log("Native person merge: chosen identity/combined roles, one official per merged dossier, bounded SQL, authorization, concurrent history and interruption recovery passed offline.");
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{schema.inspect=oldInspect;schema.validate=oldValidate;});
