"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const real=require("../functions/nap-portal-competition-change");
const {fingerprint}=require("../functions/nap-portal-workspaces");
const row={id:51,compet:5140,nom:"EXISTANT",prenom:"Chef",date:"1980-01-02",club:"123",pourclub:"0"};
const pack={competitionId:"5140",clubId:"123",leaders:[row],swimmers:[],officials:[],readAt:"now"};
const authority={competition:Object.fromEntries(real.SPECS.competitions.columns.map(key=>[key,key==="id"?5140:null])),parameters:Object.fromEntries(real.SPECS.compet_parametres.columns.map(key=>[key,key==="id"?900:key==="compet"?5140:key==="actif"?1:null]))};
let current,competition,saved,events,failComplete,race,trigger,denied,multiple;
const connection={release:()=>events.push("release"),execute:async({sql},values)=>{
  assert.equal((sql.match(/\?/g)||[]).length,values?.length||0);
  if(sql.startsWith("SELECT TRIGGER_NAME")) return [trigger?[{TRIGGER_NAME:"unknown"}]:[]];
  if(sql.startsWith("SELECT")) return [current?[{...current}]:[]];
  assert.ok(sql.startsWith("UPDATE chefsdequipe"));assert.ok(saved,"Backup before real mutation");assert.match(sql,/UTC_TIMESTAMP\(\) < \?/);assert.doesNotMatch(sql,/engagements|DELETE|INSERT/);
  events.push("update");if(race) return [{affectedRows:0}];const changed=sql.split(" SET ")[1].split(" WHERE ")[0].split(",").map(value=>value.split("=")[0].replace(/`/g,""));changed.forEach((key,index)=>{current[key]=values[index];});return [{affectedRows:1}];
}};
const pool={getConnection:async()=>connection};
const audit={read:async()=>saved,prepare:async(_,target)=>{events.push("backup");saved=structuredClone(target);},complete:async()=>{events.push("complete");if(failComplete){failComplete=false;throw new Error("audit unavailable");}}};
const sandbox={module:{exports:{}},require:name=>{
  if(name==="./nap-portal-competitions")return {readNativeCompetition:async(_,__,authorize)=>{await authorize(competition.event);return competition;}};
  if(name==="./nap-portal-entries")return {readNativeClubEntry:async(_,input,authorize)=>{await authorize(input);return {...pack,leaders:multiple?[current,{...current,id:52}]:[current]};}};
  return require(`../functions/${name}`);
},Date,structuredClone};
// Node built-ins are passed through separately.
const wrappedRequire=sandbox.require;sandbox.require=name=>name==="node:util"?{isDeepStrictEqual:(a,b)=>require("node:util").isDeepStrictEqual(structuredClone(a),structuredClone(b))}:name.startsWith("node:")?require(name):wrappedRequire(name);
vm.runInNewContext(fs.readFileSync(require.resolve("../functions/nap-team-leader-change"),"utf8"),sandbox);
const {editNativeTeamLeader,planLeaderChange}=sandbox.module.exports;
const input={competitionId:5140,clubId:"123",actorUid:"authenticated",leaderId:51,expectedFingerprint:fingerprint(pack),patch:{firstName:"Chef",lastName:"CORRIGE",birthDate:"1980-01-02"}};
function reset(){current={...row};competition={event:{entryStatus:"open",entryDeadlineAt:"2099-10-07T19:59:00.000Z"},nativeSnapshot:authority};saved=null;events=[];failComplete=race=trigger=denied=multiple=false;}
const authorize=()=>{events.push("authorize");if(denied)throw new TypeError("Denied");};
(async()=>{
  reset();await editNativeTeamLeader(pool,input,audit,authorize);assert.deepEqual(events,["authorize","backup","update","complete","release"]);assert.equal(current.club,"123");assert.equal(current.pourclub,"0");assert.equal(current.id,51);
  reset();denied=true;await assert.rejects(editNativeTeamLeader(pool,input,audit,authorize));assert.deepEqual(events,["authorize","release"]);
  reset();competition.event.entryStatus="closed";await assert.rejects(editNativeTeamLeader(pool,input,audit,authorize));assert.ok(!events.includes("backup"));
  reset();competition.event.entryDeadlineAt="2000-01-01T00:00:00.000Z";await assert.rejects(editNativeTeamLeader(pool,input,audit,authorize));
  reset();await assert.rejects(editNativeTeamLeader(pool,{...input,expectedFingerprint:"stale"},audit,authorize));assert.ok(!saved);
  reset();multiple=true;await assert.rejects(editNativeTeamLeader(pool,input,audit,authorize));assert.ok(!saved);
  reset();trigger=true;await assert.rejects(editNativeTeamLeader(pool,input,audit,authorize));assert.ok(!saved);
  reset();race=true;await assert.rejects(editNativeTeamLeader(pool,input,audit,authorize));assert.equal(current.nom,row.nom);assert.ok(saved);
  reset();failComplete=true;await assert.rejects(editNativeTeamLeader(pool,input,audit,authorize));await editNativeTeamLeader(pool,input,audit,authorize);assert.equal(events.filter(e=>e==="update").length,1);
  assert.throws(()=>planLeaderChange(pack,{...input,patch:{...input.patch,clubId:"999"}}));
  assert.throws(()=>planLeaderChange(pack,{...input,patch:{...input.patch,birthDate:"1980-02-30"}}));
  assert.throws(()=>planLeaderChange({...pack,officials:[{nom:"CORRIGE",prenom:"Chef",date:row.date}]},input));
  const unknown={...pack,leaders:[{...row,date:"0000-00-00"}]};const preserved=planLeaderChange(unknown,{...input,patch:{...input.patch,birthDate:""}});assert.equal(preserved.after.date,"0000-00-00");
  console.log("NAP team leader: no licence, same club, closed/changed/ambiguous dossier refusal, backup, atomic deadline and retry verified");
})().catch(error=>{console.error(error);process.exitCode=1;});
