"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index"),"utf8");
const start=source.indexOf("async function saveNativeClubRelays("),end=source.indexOf("exports.createEngagementCompetition",start);
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
let allowed=true,calls=[];
const context={exports:{},ENVIRONMENT:{projectId:"livepalmes-test"},CALLABLE_OPTIONS:{},defineSecret:value=>value,onCall:(options,fn)=>Object.assign(fn,{options}),HttpsError,TypeError,RangeError,Date,process:{env:{LIVEPALMES_NAP_PASSWORD:"placeholder"}},ENGAGEMENT_EVENT_DEFINITION_BY_CODE:new Map(),ageCategoryFromDates:()=>"S",writeAuditLogOnce:async()=>{},engagementClubAccessContext:async()=>{if(!allowed)throw new HttpsError("permission-denied","Denied");return {clubId:"106",uid:"actor"};},db:{collection:name=>{assert.equal(name,"auditLogs","No abandoned sports collection on TEST");return {doc:()=>({get:async()=>({exists:false}),create:async()=>{},update:async()=>{}})};}},require:name=>{
  if(name==="./nap-portal-swimmers")return {portalPool:()=>({native:true})};
  if(name==="./nap-portal-workspaces")return {competitionItem:()=>({date:"2026-11-07"}),entryItem:()=>({source:"nap"})};
  if(["./nap-relay-composition-change","./nap-relay-entry-change"].includes(name)) {
    const save=async(pool,input,services)=>{
      calls.push(name);assert.equal(pool.native,true);assert.equal(input.clubId,"106");assert.equal(input.actorUid,"actor");
      await services.authorize({clubId:"106"});await assert.rejects(async()=>services.authorize({clubId:"999"}),/hors/);
      await services.audit.read("operation");await services.audit.prepare("operation",{});await services.audit.complete("operation",{});
      if(name.includes("composition")) {assert.equal(input.change.action,"create");await services.audit.checkpoint("operation",{});}
      else assert.equal(input.changes[0].action,"remove");
      return {competition:{},nativeEntry:{},operation:"operation",writesExecuted:0};
    };return {saveNativeRelayComposition:save,saveNativeRelayChanges:save};
  }
  throw new Error(`Unexpected dependency ${name}`);
}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
(async()=>{
  const save=context.exports.saveEngagementClubRelays;
  const result=await save({data:{competitionId:"legacy-nap-5162",clubId:"999",relayChange:{action:"create"}}});
  assert.equal(result.source,"nap");assert.equal(result.sqlBudget.queriesMax,60);
  await save({data:{competitionId:"legacy-nap-5162",removeRelayId:"99"}});assert.equal(calls.length,2);
  assert.deepEqual(Array.from(save.options.secrets),["LIVEPALMES_NAP_PASSWORD"]);
  allowed=false;await assert.rejects(()=>save({data:{}}),/Denied/);assert.equal(calls.length,2);
  console.log("Relay callable: TEST routes exclusively to NAP, trusted club and audit-only Firebase, authenticated creation/removal; no network.");
})().catch(error=>{console.error(error);process.exitCode=1;});
