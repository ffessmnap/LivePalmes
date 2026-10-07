"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8");
const start=source.indexOf("  async function saveEngagementClubOfficials(event)"),end=source.indexOf("  function renderActiveEngagementClubSwimmerConsumer",start);
let calls=0,fail=true,ids=["nap-official-1"],seen=[];
const context={selectedEngagementClubEntry:{officials:[{personId:"nap-official-1"}]},selectedEngagementCompetitionId:"legacy-nap-5140",selectedEngagementCompetition:{napSource:true},engagementClubNativeOfficialRetry:null,engagementClubNativeSelectionRetry:null,engagementClubNativeIndividualRetry:null,engagementClubLastPersistedEntry:{napFingerprint:"a".repeat(64)},engagementClubEntryMutationQueue:Promise.resolve(),global:{crypto:{randomUUID:()=>"11111111-1111-4111-8111-111111111111"}},elements:{engagementsClubOfficialsMessage:{}},canUse:()=>true,engagementClubOfficialsLockReason:()=>"",engagementClubTeamComplete:()=>true,selectedEngagementClubOfficialIds:()=>ids,renderEngagementClubOfficials:()=>{},queueEngagementClubEntryMutation:async opts=>{try{await opts.execute();return true;}catch{return false;}},callFunction:async(name,payload)=>{calls++;seen.push(JSON.parse(JSON.stringify(payload)));assert.equal(name,"saveEngagementClubOfficials");if(fail) throw new Error("Interrupted");return {entry:{source:"nap"}};}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
(async()=>{
  assert.equal(await context.saveEngagementClubOfficials(),false);assert.ok(context.engagementClubNativeOfficialRetry);
  ids=["nap-official-2"];fail=false;assert.equal(await context.saveEngagementClubOfficials(),true);assert.deepEqual(seen[0],seen[1],"Retry preserves exact identifiers, fingerprint and operation");assert.equal(context.engagementClubNativeOfficialRetry,null);
  context.engagementClubNativeIndividualRetry={};assert.equal(await context.saveEngagementClubOfficials(),false);assert.equal(calls,2,"Other pending operation prevents another save");
  console.log("Native official UI: durable payload retry, stable operation/fingerprint and cross-operation protection verified");
})().catch(error=>{console.error(error);process.exitCode=1;});
