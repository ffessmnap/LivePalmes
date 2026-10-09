"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index"),"utf8");
const start=source.indexOf("async function saveNativeClubOfficials("),end=source.indexOf("exports.listEngagementClubSwimmers",start);
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
let calls=0,allowed=true;
const context={nativeClubEntryView:async()=>({source:"nap"}),exports:{},ENVIRONMENT:{sportingDataSource:"nap",projectId:"livepalmes"},CALLABLE_OPTIONS:{},defineSecret:value=>value,onCall:(options,fn)=>Object.assign(fn,{options}),HttpsError,TypeError,RangeError,Date,process:{env:{LIVEPALMES_NAP_PASSWORD:"placeholder"}},ENGAGEMENT_EVENT_DEFINITION_BY_CODE:new Map(),ageCategoryFromDates:()=>"C",writeAuditLogOnce:async()=>{},engagementClubAccessContext:async()=>{if(!allowed) throw new HttpsError("permission-denied","Denied");return {clubId:"106",uid:"actor"};},db:{collection:name=>{assert.equal(name,"auditLogs","No abandoned sports collection on TEST");return {doc:()=>({get:async()=>({exists:false}),create:async()=>{}})};}},require:name=>{
  if(name==="./nap-portal-swimmers") return {portalPool:()=>({native:true})};
  if(name==="./nap-portal-workspaces") return {competitionItem:()=>({date:"2026-10-11"}),entryItem:()=>({source:"nap"})};
  if(name==="./nap-official-entry-change") return {saveNativeOfficials:async(pool,input,services)=>{
    assert.equal(pool.native,true);assert.equal(input.clubId,"106");assert.equal(input.actorUid,"actor");assert.equal(input.officialPersonIds[0],"nap-official-1");
    await services.authorize({clubId:"106"});await assert.rejects(async()=>services.authorize({clubId:"999"}),/hors/);
    await services.audit.read("operation");await services.audit.prepare("operation",{});await services.audit.complete("operation",{});calls++;
    return {competition:{},nativeEntry:{},operation:"operation",writesExecuted:0};
  }};
  throw new Error(`Unexpected dependency ${name}`);
}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
(async()=>{
  const result=await context.exports.saveEngagementClubOfficials({data:{competitionId:"legacy-nap-5140",clubId:"999",officialPersonIds:["nap-official-1"]}});
  assert.equal(result.source,"nap");assert.equal(result.entry.source,"nap");assert.equal(result.sqlBudget.queriesMax,33);assert.equal(calls,1);
  assert.deepEqual(Array.from(context.exports.saveEngagementClubOfficials.options.secrets),["LIVEPALMES_NAP_PASSWORD"]);
  allowed=false;await assert.rejects(()=>context.exports.saveEngagementClubOfficials({data:{}}),/Denied/);assert.equal(calls,1);
  console.log("Official callable: authentication before native access, trusted club, audit only and bounded SQL verified without network");
})().catch(error=>{console.error(error);process.exitCode=1;});
