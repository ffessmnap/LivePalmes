"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index"),"utf8");
const start=source.indexOf("async function previewNativeClubEntryTimes("),end=source.indexOf("exports.saveEngagementClubIndividualEntries",start);
assert.ok(start>0 && end>start);
const calls=[];
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
const context={exports:{},ENVIRONMENT:{sportingDataSource:"nap",projectId:"livepalmes-test"},CALLABLE_OPTIONS:{},defineSecret:value=>value,onCall:(options,fn)=>Object.assign(fn,{options}),HttpsError,TypeError,RangeError,process:{env:{LIVEPALMES_NAP_PASSWORD:"test-placeholder"}},cleanText:value=>String(value??"").trim(),parseEngagementEntryTime:()=>null,engagementClubAccessContext:async()=>({clubId:"106",uid:"test-actor"}),automaticEngagementIndividualEntry:(entry,rows)=>({...entry,rowCount:rows.length}),ENGAGEMENT_EVENT_DEFINITION_BY_CODE:new Map(),db:{getAll:()=>{throw new Error("Legacy Firestore path");},collection:()=>{throw new Error("Legacy Firestore path");}},require:name=>{
  if(name==="./nap-entry-time-rules") return require("../functions/nap-entry-time-rules");
  if(name==="./nap-portal-swimmers") return {portalPool:()=>({nativePool:true})};
  if(name==="./nap-portal-workspaces") return {competitionItem:()=>({events:[{code:"100SF",type:"individual",nativeRecognized:true,nativeCourses:[{sexe:"M"}]},{code:"200SF",type:"individual",nativeRecognized:true,nativeCourses:[{sexe:"F"}]},{code:"ANCIEN",type:"individual",nativeRecognized:false,nativeCourses:[{sexe:"M"}]},{code:"4X100SF",type:"relay",nativeRecognized:true,nativeCourses:[{sexe:"M"}]}]})};
  if(name==="./nap-entry-time-preview") return {previewNativeTimes:async(pool,input,services)=>{
    assert.equal(pool.nativePool,true);assert.equal(input.clubId,"106");await services.authorize({clubId:input.clubId});calls.push(input);
    return {ok:true,source:"nap",swimmers:input.swimmerIds.map(id=>({swimmerIndexId:String(id),individualEntries:services.preview({sex:"M"},[{timeValue:10200}],{})}))};
  }};
  throw new Error("Unexpected dependency");
}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
(async()=>{
  const single=await context.exports.previewEngagementClubSwimmerEventTimes({data:{competitionId:"legacy-nap-5140",swimmerIndexId:"1",source:"performances"}});
  assert.equal(single.source,"nap");assert.equal(single.individualEntries.length,1);assert.equal(single.individualEntries[0].eventCode,"100SF");assert.equal(calls[0].enrolledOnly,false);
  const batch=await context.exports.previewEngagementClubSwimmerEventTimesBatch({data:{competitionId:"legacy-nap-5140",swimmerIndexIds:["1","2"]}});
  assert.equal(batch.swimmers.length,2);assert.equal(calls[1].enrolledOnly,true);assert.equal(context.exports.previewEngagementClubSwimmerEventTimesBatch.options.secrets[0],"LIVEPALMES_NAP_PASSWORD");
  context.engagementClubAccessContext=async()=>{throw new HttpsError("permission-denied","Denied");};await assert.rejects(()=>context.exports.previewEngagementClubSwimmerEventTimes({data:{competitionId:"5140",swimmerIndexId:"1"}}),/Denied/);assert.equal(calls.length,2);
  context.engagementClubAccessContext=async()=>({clubId:"106"});context.ENVIRONMENT.projectId="livepalmes";
  assert.equal((await context.exports.previewEngagementClubSwimmerEventTimes({data:{competitionId:"5140",swimmerIndexId:"1"}})).source,"nap");assert.equal(calls.length,3);
  console.log("Native time preview callables route TEST to NAP, authorize first and preserve the PROD route");
})().catch(error=>{console.error(error);process.exitCode=1;});
