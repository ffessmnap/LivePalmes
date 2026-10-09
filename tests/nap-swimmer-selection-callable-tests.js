"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index"),"utf8");
const start=source.indexOf("async function saveNativeClubSwimmerSelections("),end=source.indexOf("exports.saveEngagementClubSwimmers",start);
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
let calls=0,read=0,prepare=0,complete=0;
const pack={leaders:[{prenom:"Leader",nom:"Example",date:"1980-01-01"}],officials:[]};
const competition={event:{eventType:"pool"},nativeParameters:{qualif:0,cat_d:null,cat_f:null},participations:[],options:null};
const person={id:"1",firstName:"Person",lastName:"Example",birthDate:"1990-01-01",sex:"M",clubId:"106"};
const context={nativeClubEntryView:async()=>({source:"nap"}),exports:{},ENVIRONMENT:{sportingDataSource:"nap",projectId:"livepalmes"},CALLABLE_OPTIONS:{},defineSecret:value=>value,onCall:(options,fn)=>Object.assign(fn,{options}),HttpsError,TypeError,RangeError,Date,process:{env:{LIVEPALMES_NAP_PASSWORD:"placeholder"}},cleanText:value=>String(value??"").trim(),cleanIsoDate:value=>/^\d{4}-\d{2}-\d{2}$/.test(value||"")?value:"",ageCategoryFromDates:()=>"S",ENGAGEMENT_EVENT_DEFINITION_BY_CODE:new Map(),engagementClubAccessContext:async()=>({clubId:"106",uid:"actor"}),writeAuditLogOnce:async()=>{complete++;},db:{collection:name=>{assert.equal(name,"auditLogs","TEST writes no legacy sports collections");return {doc:()=>({get:async()=>{read++;return {exists:false};},create:async()=>{prepare++;}})};}},require:name=>{
  if(name==="./nap-swimmer-entry-plan") return require("../functions/nap-swimmer-entry-plan");
  if(name==="./nap-entry-participation-rules") return require("../functions/nap-entry-participation-rules");
  if(name==="./nap-portal-swimmers") return {portalPool:()=>({native:true})};
  if(name==="./nap-qualification-entry-effects") return require("../functions/nap-qualification-entry-effects");
  if(name==="./nap-portal-workspaces") return {competitionItem:()=>({date:"2026-10-11"}),entryItem:()=>({source:"nap"})};
  if(name==="./nap-swimmer-entry-change") return {saveNativeSwimmerSelection:async(pool,input,services)=>{
    assert.equal(pool.native,true);assert.equal(input.clubId,"106");assert.equal(input.actorUid,"actor");assert.equal(input.changes[0].swimmerId,"1");assert.equal(Object.hasOwn(input.changes[0],"licenseNumber"),false);
    await services.authorize({clubId:"106"});await assert.rejects(async()=>services.authorize({clubId:"999"}),/hors/);
    await services.validate({connection:{execute:async query=>{assert.match(query.sql,/FROM perfs FORCE INDEX \(nageur\)/);return [[]];}},competition,pack,plan:{additions:[person]}});
    await services.audit.read("operation");await services.audit.prepare("operation",{});await services.audit.complete("operation",{});calls++;
    return {nativeEntry:pack,competition,operation:"operation",writesExecuted:1};
  }};
  throw new Error("Unexpected dependency");
}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
(async()=>{
  const request={data:{competitionId:"legacy-nap-5140",changes:[{swimmerIndexId:"1",selected:true,licenseNumber:"must-be-ignored"}],expectedFingerprint:"a".repeat(64),mutationId:"11111111-1111-4111-8111-111111111111"}};
  const result=await context.exports.saveEngagementClubSwimmerSelections(request);assert.equal(result.source,"nap");assert.equal(result.entry.source,"nap");assert.equal(calls,1);assert.equal(read,1);assert.equal(prepare,1);assert.equal(complete,1);assert.deepEqual(Array.from(context.exports.saveEngagementClubSwimmerSelections.options.secrets),["LIVEPALMES_NAP_PASSWORD"]);
  await context.exports.saveEngagementClubSwimmerSelection({data:{...request.data,swimmerIndexId:"1",selected:true}});assert.equal(calls,2);
  competition.nativeParameters.qualif=1;await assert.rejects(()=>context.exports.saveEngagementClubSwimmerSelections(request),/qualifications/);assert.equal(calls,2);competition.nativeParameters.qualif=0;
  competition.participations=[{participation:123}];await assert.rejects(()=>context.exports.saveEngagementClubSwimmerSelections(request),/participation/);assert.equal(calls,2);competition.participations=[];
  competition.participations=[{participation:123,modeengagement:"presence"}];await assert.rejects(()=>context.exports.saveEngagementClubSwimmerSelections(request),/resultat NAP/);assert.equal(calls,2);competition.participations=[];
  competition.event.eventType="training";await assert.rejects(()=>context.exports.saveEngagementClubSwimmerSelections(request),/Type/);assert.equal(calls,2);competition.event.eventType="pool";
  competition.nativeParameters.cat_d=1;await assert.rejects(()=>context.exports.saveEngagementClubSwimmerSelections(request),/categories/);assert.equal(calls,2);competition.nativeParameters.cat_d=null;
  pack.leaders=[{prenom:"Person",nom:"Example",date:"1990-01-01"}];await assert.rejects(()=>context.exports.saveEngagementClubSwimmerSelections(request),/chef/);assert.equal(calls,2);
  context.engagementClubAccessContext=async()=>{throw new HttpsError("permission-denied","Denied");};await assert.rejects(()=>context.exports.saveEngagementClubSwimmerSelections(request),/Denied/);assert.equal(calls,2);
  console.log("Swimmer selection callables: authenticated club, native-only sports path, journal, licences ignored and qualifications/role checks enforced");
})().catch(error=>{console.error(error);process.exitCode=1;});
