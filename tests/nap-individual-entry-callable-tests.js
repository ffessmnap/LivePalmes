"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index"),"utf8");
const start=source.indexOf("async function saveNativeClubIndividualEntries("),end=source.indexOf("async function saveNativeClubSwimmerSelections(",start);
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
let calls=0,categoriesReads=0,recordsReads=0,validated=0,allowed=true;
const competition={event:{eventType:"pool"},nativeParameters:{qualif:0,saisie:1,cat_d:null,cat_f:null},participations:[],restrictions:[],options:null};
const connection={trusted:true},pack={swimmers:[]};
const context={nativeClubEntryView:async()=>({source:"nap"}),exports:{},ENVIRONMENT:{sportingDataSource:"nap",projectId:"livepalmes"},CALLABLE_OPTIONS:{},defineSecret:value=>value,onCall:(options,fn)=>Object.assign(fn,{options}),HttpsError,TypeError,RangeError,Date,process:{env:{LIVEPALMES_NAP_PASSWORD:"placeholder"}},ENGAGEMENT_EVENT_DEFINITION_BY_CODE:new Map(),ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES:{"50AP":new Set(["P","B","M"])},importSeasonYear:()=>2027,competitionYear:()=>2026,birthYear:()=>2013,ageCategoryFromDates:()=>"C",automaticEngagementIndividualEntry:()=>{},parseEngagementEntryTime:()=>{},validateEngagementIndividualEntryTimes:()=>{validated++;},engagementClubAccessContext:async()=>{if(!allowed) throw new HttpsError("permission-denied","Denied");return {clubId:"106",uid:"actor"};},writeAuditLogOnce:async()=>{},db:{collection:name=>{assert.equal(name,"auditLogs","TEST never reads abandoned sports collections");return {doc:()=>({get:async()=>({exists:false}),create:async()=>{}})};}},require:name=>{
  if(name==="./nap-portal-swimmers") return {portalPool:()=>({native:true})};
  if(name==="./nap-qualification-entry-effects") return require("../functions/nap-qualification-entry-effects");
  if(name==="./nap-entry-course-rules") return {...require("../functions/nap-entry-course-rules"),readCategories:async c=>{assert.equal(c,connection);categoriesReads++;return [];}};
  if(name==="./nap-portal-workspaces") return {competitionItem:()=>({date:"2026-10-11"}),entryItem:()=>({source:"nap"})};
  if(name==="./nap-entry-static-records") return {loadStaticRecords:async project=>{assert.equal(project,"livepalmes-test");recordsReads++;return {};}};
  if(name==="./nap-individual-entry-resolution") return {resolveChanges:async(input,services)=>{
    assert.equal(input.connection,connection);assert.equal(services.age("2026-10-11","2013-01-01"),14);
    assert.equal(services.forbidden("50AP","M"),true);assert.equal(services.forbidden("50BI","M"),false);
    if(input.changes[0].entries[0]?.entryTimeMode==="manual") await services.validateTimes([],{});
    return [];
  }};
  if(name==="./nap-individual-entry-change") return {saveNativeIndividualEntries:async(pool,input,services)=>{
    assert.equal(pool.native,true);assert.equal(input.clubId,"106");assert.equal(input.actorUid,"actor");
    assert.equal(input.changes[0].swimmerId,"1");assert.equal(Object.hasOwn(input.changes[0],"clubId"),false);
    await services.authorize({clubId:"106"});await assert.rejects(async()=>services.authorize({clubId:"999"}),/hors/);
    await services.resolve({connection,competition,pack,changes:input.changes,histories:new Map()});
    await services.audit.read("operation");await services.audit.prepare("operation",{});await services.audit.complete("operation",{});calls++;
    return {competition,nativeEntry:pack,operation:"operation",writesExecuted:0};
  }};
  throw new Error(`Unexpected dependency ${name}`);
}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
(async()=>{
  const request={data:{competitionId:"legacy-nap-5140",swimmers:[{swimmerIndexId:"1",clubId:"999",individualEntries:[{eventCode:"50BI"}]}],expectedFingerprint:"a".repeat(64),mutationId:"11111111-1111-4111-8111-111111111111"}};
  const result=await context.exports.saveEngagementClubIndividualEntries(request);
  assert.equal(result.source,"nap");assert.equal(result.entry.source,"nap");assert.equal(result.sqlBudget.queriesMax,40);assert.equal(calls,1);assert.equal(categoriesReads,1);assert.equal(recordsReads,0);
  assert.deepEqual(Array.from(context.exports.saveEngagementClubIndividualEntries.options.secrets),["LIVEPALMES_NAP_PASSWORD"]);
  request.data.swimmers[0].individualEntries[0].entryTimeMode="manual";
  await context.exports.saveEngagementClubIndividualEntries(request);assert.equal(recordsReads,1);assert.equal(validated,1);
  competition.nativeParameters.saisie=0;request.data.swimmers[0].individualEntries[0].entryTimeMode="known";
  await context.exports.saveEngagementClubIndividualEntries(request);assert.equal(calls,3);assert.equal(categoriesReads,3);competition.nativeParameters.saisie=1;
  competition.restrictions=[{}];await assert.rejects(()=>context.exports.saveEngagementClubIndividualEntries(request),/restrictions/);assert.equal(calls,3);competition.restrictions=[];
  allowed=false;await assert.rejects(()=>context.exports.saveEngagementClubIndividualEntries(request),/Denied/);assert.equal(calls,3);
  console.log("Individual callable: authenticated native-only path, trusted club/connection, grouped category lookup and conditional static RF/MPF validation verified");
})().catch(error=>{console.error(error);process.exitCode=1;});
