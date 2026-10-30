"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),{createRequire}=require("node:module");
const {createClubHandlers}=require("../functions/portal-club-handlers");
const {createEntryModelService}=require("../functions/server-entry-model-service");
const {readNativeClubEntry}=require("../functions/nap-portal-entries");
const {readNativeCompetition}=require("../functions/nap-portal-competitions");
const {readEntryHistory}=require("../functions/nap-entry-performance-history");
const {previewNativeTimes}=require("../functions/nap-entry-time-preview");
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
function fixture(patch={},legacy=false){
  const data={allowed:true,enrolled:true,mode:1,presence:false,leaders:[{id:1,club:"106",pourclub:"106",nom:"CHEF",prenom:"Fictif"}],...patch},calls=[];
  const person={id:1,club:"106",nom:"FICTIF",prenom:"Nageur",date:"2000-01-01",sexe:"M"};
  const pool={execute:async(input,values=[])=>{
    const sql=typeof input==="string"?input:input.sql;assert.match(sql,/^SELECT /);calls.push({sql,values});
    if(sql.includes("FROM competitions c"))return [[{id:5140,libelle:"Fictive",date:"2026-10-30",niveau:1,qualif:data.qualifications?28:0,saisie:data.mode,tps_d:"2026-01-01",tps_f:"2026-12-31"}]];
    if(sql.includes("FROM livepalmes_qualification_groups"))return [[{id:1}]];
    if(sql.includes("FROM winpalme_sessions"))return [[{id:1}]];
    if(sql.includes("FROM compet_participations"))return [data.presence?[{participation:99,modeengagement:"presencetps"}]:[]];
    if(sql.includes("FROM nageurs n FORCE INDEX"))return [data.wrongClub||data.merged?[]:[person]];
    if(sql.includes("FROM nageursengager FORCE"))return [data.enrolled?Array.from({length:data.inscriptionCount||2},(_,i)=>({id:9+i,nageur:1,compet:5140})):[]];
    if(sql.includes("FROM chefsdequipe"))return [data.leaders];
    if(sql.includes("FROM engagements FORCE")){
      assert.deepEqual(Array.from(values),data.inscriptionCount?Array.from({length:data.inscriptionCount},(_,i)=>9+i):[9,10]);
      return [data.individual||[{id:1,engagement:9,course:"100SF",tps:"014200"},{id:2,engagement:10,course:"200SF",tps:"030000"},{id:3,engagement:10,course:"100SF",tps:"014200"}]];
    }
    if(sql.includes("FROM engagements_relais r"))return [[{id:1}]];
    if(sql.includes("FROM perfs FORCE INDEX"))return [[{nageur:1,compet:99}]];
    if(sql.includes("FROM perfs p FORCE INDEX"))return [data.history||[
      {id:1,nageur:1,course:"100SF",cat:"S",tps:"014200",competition_id:99,date:"2026-02-01",lieu:"Fictif",bassin:50,chrono:"E"},
      {id:2,nageur:1,course:"100SF",cat:"S",tps:"014300",competition_id:98,date:"2025-02-01",bassin:50,chrono:"E"},
      {id:3,nageur:1,course:"50SF",cat:"S",tps:"004200",competition_id:99,date:"2026-02-01",bassin:50,chrono:"E"}]];
    return [[]];
  }};
  const backend={HttpsError,ENVIRONMENT:{sportingDataSource:"nap"},ENGAGEMENT_EVENT_DEFINITION_BY_CODE:new Map(),
    cleanText:value=>String(value??"").trim(),cleanIsoDate:value=>String(value||"").slice(0,10),cleanFirestoreValue:value=>value,formatTimeValue:value=>String(value),
    engagementClubAccessContext:async()=>{if(!data.allowed)throw new HttpsError("permission-denied","Denied");return {clubId:"106"};},
    db:{collection:()=>{throw Error("No Firestore operation permitted");}}};
  backend.engagementKnownTimeHistory=createEntryModelService(backend).engagementKnownTimeHistory;
  const file=require.resolve("../functions/server-entry-service"),realRequire=createRequire(file),sandbox={module:{exports:{}},process:{env:{}},Error,TypeError,RangeError};
  sandbox.require=name=>{
    if(name==="./nap-portal-swimmers")return {portalPool:()=>pool};
    if(legacy&&name==="./nap-entry-time-preview")return {previewNativeTimes:(connection,input,services)=>previewNativeTimes(connection,input,{...services,readers:{competition:readNativeCompetition,entry:readNativeClubEntry,history:readEntryHistory}})};
    return realRequire(name);
  };
  vm.runInNewContext(fs.readFileSync(file,"utf8"),sandbox,{filename:file});
  backend.nativeClubEntryTimeHistory=sandbox.module.exports.createEntryService(backend).nativeClubEntryTimeHistory;
  const handlers=createClubHandlers(backend);
  return {calls,data,run:eventCodes=>handlers.getEngagementClubEntryTimeHistory({data:{competitionId:"5140",swimmerIndexId:"1",eventCodes}})};
}
async function main(){
  for(const presence of [false,true])for(const mode of [0,1]){
    const current=fixture({presence,mode}),before=fixture({presence,mode},true);
    const result=await current.run(["100SF","50SF"]),reference=await before.run(["100SF","50SF"]);
    assert.deepEqual(JSON.parse(JSON.stringify(result.events)),JSON.parse(JSON.stringify(reference.events)));
    assert.equal(result.events.length,1);assert.equal(result.events[0].eventCode,"100SF");assert.equal(result.events[0].times.length,1);
    assert.equal(current.calls.length,19+Number(presence));assert.equal(result.sqlBudget.queriesMax,current.calls.length);
    assert.equal(before.calls.length-current.calls.length,4);
    assert.ok(!current.calls.some(call=>/engagements_relais|engagements_relayeurs|officielsengager|livepalmes_club_entry_options/.test(call.sql)));
  }
  const all=await fixture().run();assert.deepEqual(Array.from(all.events,event=>event.eventCode),["100SF","200SF"]);
  assert.equal(all.events[1].times.length,0,"Saved event without known time stays present");
  assert.equal((await fixture({leaders:[{nom:"-1",prenom:"-1",date:"0000-00-00",club:"106",pourclub:"106"}]}).run()).events.length,2);
  for(const [patch,code,pattern] of [
    [{allowed:false},"permission-denied",/Denied/],[{mode:-1},"failed-precondition",/pas autorisee/],
    [{enrolled:false},"failed-precondition",/non engage/],[{wrongClub:true},"failed-precondition",/hors du club/],
    [{merged:true},"failed-precondition",/hors du club/],[{leaders:[]},"failed-precondition",/Chef/],
    [{leaders:[{nom:"A",prenom:"A"},{nom:"B",prenom:"B"}]},"failed-precondition",/Chef/],
    [{qualifications:true},"failed-precondition",/qualifications/],
    [{inscriptionCount:801},"resource-exhausted",/volumineuse/],[{individual:Array(5001).fill({})},"resource-exhausted",/volumineuse/],
    [{history:Array.from({length:2001},(_,i)=>({id:i+1,nageur:1}))},"resource-exhausted",/volumineux/]
  ]){
    const f=fixture(patch);await assert.rejects(f.run(),error=>error.code===code&&pattern.test(error.message));
    if(patch.allowed===false)assert.equal(f.calls.length,0);
    if(patch.wrongClub||patch.merged)assert.ok(!f.calls.some(call=>/FROM engagements FORCE/.test(call.sql)));
  }
  assert.equal((await fixture({inscriptionCount:800}).run()).events.length,2);
  assert.equal((await fixture({individual:Array.from({length:5000},(_,i)=>({id:i+1,engagement:9,course:"100SF"}))}).run()).events.length,1);
  console.log("Actual history callable/service/readers: saved and duplicate inscriptions, course/date filters, 19–20 SELECT, former output equality, limits and denied scopes passed offline.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
