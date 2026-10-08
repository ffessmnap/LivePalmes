"use strict";
const assert=require("node:assert/strict");
const {createNativeTeamLeader,proposedLeader,insertion,indexed}=require("../functions/nap-team-leader-create");
const {fingerprint}=require("../functions/nap-portal-workspaces");
const {SPECS}=require("../functions/nap-portal-competition-change");
const base={competitionId:"5162",clubId:"106",leaders:[],swimmers:[],officials:[],individual:[],relays:[]};
const input={competitionId:5162,clubId:"106",actorUid:"trusted-user",expectedFingerprint:fingerprint(base),patch:{firstName:"Chef",lastName:"TEST",birthDate:"1980-01-02"}};
const authority={competition:Object.fromEntries(SPECS.competitions.columns.map(key=>[key,key==="id"?5162:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(key=>[key,key==="id"?901:key==="compet"?5162:key==="actif"?1:null]))};
const event={entryStatus:"open",entryDeadlineAt:"2099-11-06T20:00:00.000Z"};
function fixture(options={}) {
  let target=null,current=null,insertions=0,fail=options.fail;
  const steps=[];
  const connection={release:()=>steps.push("release"),destroy:()=>steps.push("destroy"),execute:async({sql},values=[])=>{
    assert.equal((sql.match(/\?/g)||[]).length,values.length);
    if(sql.startsWith("SELECT GET_LOCK")) return [[{acquired:1}]];
    if(sql.startsWith("SELECT RELEASE_LOCK")) return [[{released:1}]];
    if(sql.startsWith("SELECT TRIGGER")) return [options.trigger?[{TRIGGER_NAME:"unexpected"}]:[]];
    if(sql.startsWith("EXPLAIN")) return [[{table:"clubs",type:"const",key:"PRIMARY",rows:1},{table:"chefsdequipe",type:"ref",key:"livepalmes_compet_id",rows:2}]];
    if(sql.startsWith("INSERT")) {
      assert.equal(target.phase,"writing");steps.push("insert");insertions++;
      if(options.race) return [{affectedRows:0}];
      current={id:99,...target.proposed};
      if(fail==="insert") {fail=null;throw new Error("unknown insert outcome");}
      return [{affectedRows:1,insertId:99}];
    }
    assert.match(sql,/^SELECT .* FROM chefsdequipe FORCE INDEX .* ORDER BY id LIMIT 2$/);
    return [current?[{...current}]:[]];
  }};
  const readers={competition:async(_,__,authorize)=>{await authorize(event);return {event:{...event,...options.event},nativeSnapshot:authority};},entry:async(_,scope,authorize)=>{await authorize(scope);return {...base,...options.pack,leaders:current?[current]:options.pack?.leaders||[]};}};
  const audit={read:async()=>target,prepare:async(_,value)=>{steps.push("backup");target=structuredClone(value);},checkpoint:async(_,value)=>{if(fail==="checkpoint" && value.phase==="identified") {fail=null;throw new Error("lost id checkpoint");}target=structuredClone(value);steps.push(value.phase);},complete:async()=>{steps.push("complete");if(fail==="complete") {fail=null;throw new Error("lost completion");}}};
  return {run:(change={})=>createNativeTeamLeader({getConnection:async()=>connection},{...input,...change},audit,()=>{if(options.denied) throw new TypeError("Denied");},readers),steps,get count(){return insertions;},get target(){return target;}};
}
(async()=>{
  const ok=fixture();await ok.run();assert.equal(ok.count,1);assert.deepEqual(ok.steps,["backup","writing","insert","identified","complete","release"]);assert.equal(ok.target.proposed.club,"106");assert.equal(ok.target.proposed.pourclub,"");
  for(const options of [{denied:true},{trigger:true},{event:{entryStatus:"closed"}},{event:{entryDeadlineAt:"2000-01-01T00:00:00Z"}},{pack:{leaders:[{id:10}]}}]) {const f=fixture(options);await assert.rejects(f.run());assert.equal(f.count,0);}
  const stale=fixture();await assert.rejects(stale.run({expectedFingerprint:"0".repeat(64)}));assert.equal(stale.count,0);
  const race=fixture({race:true});await assert.rejects(race.run());assert.equal(race.target.phase,"prepared");
  for(const fail of ["insert","checkpoint"]) {const f=fixture({fail});await assert.rejects(f.run());await assert.rejects(f.run(),/identifiant non confirme/);assert.equal(f.count,1);}
  const resumed=fixture({fail:"complete"});await assert.rejects(resumed.run());await resumed.run();assert.equal(resumed.count,1);
  assert.throws(()=>proposedLeader(base,{...input,patch:{...input.patch,birthDate:"1980-02-30"}}));
  assert.throws(()=>proposedLeader(base,{...input,patch:{...input.patch,birthDate:""}}));
  assert.throws(()=>proposedLeader({...base,officials:[{nom:"TEST",prenom:"Chef",date:"1980-01-02"}]},input));
  assert.throws(()=>proposedLeader(base,{...input,patch:{...input.patch,clubId:"other"}}));
  const statement=insertion(proposedLeader(base,input),{competitions:authority.competition,compet_parametres:authority.parameters},event.entryDeadlineAt);
  assert.equal(proposedLeader({...base,clubId:"00106"},{...input,clubId:"00106"}).club,"00106","native textual club identifiers retain leading zeros");
  assert.match(statement.sql,/NOT EXISTS.*livepalmes_compet_id/);assert.match(statement.sql,/UTC_TIMESTAMP\(\) < \?/);assert.match(statement.sql,/FROM clubs WHERE num_club=\?/);
  assert.equal(indexed([{table:"chefsdequipe",type:"ALL",key:null,rows:10000}]),false);
  console.log("NAP first team leader: bounded insertion, club/identity/closure guards, duplicate/race refusal and no uncertain retry verified");
})().catch(error=>{console.error(error);process.exitCode=1;});
