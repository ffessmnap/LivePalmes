"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("functions/index.js","utf8");
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
let denied=false,accesses=0,removed=0;
const context={exports:{},ENVIRONMENT:{sportingDataSource:"nap",projectId:"livepalmes-test"},CALLABLE_OPTIONS:{},defineSecret:value=>value,onCall:(options,fn)=>Object.assign(fn,{options}),HttpsError,TypeError,RangeError,Date,process:{env:{}},cleanText:value=>String(value||""),engagementClubAccessContext:async()=>{if(denied)throw new HttpsError("permission-denied","denied");return {clubId:"106",uid:"trusted"};},assertEngagementClubWriteOpen:()=>{},nativePortalCompetition:async()=>({napSource:true}),nativeClubEntryView:async()=>({source:"nap",teamLeader:{}}),writeAuditLogOnce:async()=>{},db:{collection:name=>{assert.equal(name,"auditLogs","No abandoned sports collection");accesses++;return {doc:()=>({get:async()=>({exists:false}),create:async()=>{},update:async()=>{}})};}},require:name=>{
  if(name==="./nap-portal-swimmers")return {portalPool:()=>({})};
  if(name==="./nap-portal-entries")return {readNativeClubEntry:async()=>({leaders:[]})};
  if(name==="./nap-team-leader-remove")return {removeNativeTeamLeader:async(pool,input,audit,authorize)=>{assert.equal(input.clubId,"106");assert.equal(input.actorUid,"trusted");assert.equal(input.leaderId,99);assert.equal(input.expectedFingerprint,"current");await authorize({});await audit.read("operation");await audit.prepare("operation",{});await audit.checkpoint("operation",{});await audit.complete("operation",{});removed++;return {ok:true,source:"nap"};}};
  throw Error("Unexpected dependency");
}};
vm.createContext(context);vm.runInContext(source.slice(source.indexOf("exports.removeEngagementClubTeamLeader ="),source.indexOf("exports.listEngagementClubPeople =")),context);
(async()=>{
  const request={data:{competitionId:"legacy-nap-5162",clubId:"999",actorUid:"forged",leaderId:99,expectedFingerprint:"current"}};
  const result=await context.exports.removeEngagementClubTeamLeader(request);
  assert.equal(result.source,"nap");assert.equal(result.sqlBudget.writesMax,1);assert.equal(result.sqlBudget.queriesMax,54);assert.equal(result.competition.nativeTeamLeaderRequired,true);
  assert.deepEqual(Array.from(context.exports.removeEngagementClubTeamLeader.options.secrets),["LIVEPALMES_NAP_PASSWORD"]);
  denied=true;await assert.rejects(context.exports.removeEngagementClubTeamLeader(request),e=>e.code==="permission-denied");assert.equal(removed,1);assert.equal(accesses,3);
  console.log("Native leader withdrawal callable: authenticated club/actor, technical audit only, no old dossier writes and bounded native response verified.");
})().catch(error=>{console.error(error);process.exitCode=1;});
