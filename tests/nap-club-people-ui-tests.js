"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8");
const start=source.indexOf("  async function loadEngagementClubPeople(");
const end=source.indexOf("\n  async function saveEngagementClubPerson(",start);
let replies=[],inputs=[];
const sandbox={global:{LivePalmesEnvironment:{isTest:true}},canUse:()=>true,engagementClubPeopleLoading:false,engagementClubPeopleLoaded:false,
  engagementClubPeople:[],engagementClubPeopleHasMore:false,engagementClubPeopleCursor:null,engagementClubPeopleRequestVersion:0,
  activeEngagementsTab:"clubPeople",activeEngagementsDetailTab:"team",elements:{engagementsClubPeopleAddButton:{},engagementsClubPeopleLoadMore:{},engagementsClubPeopleStatus:{dataset:{}}},
  renderEngagementClubPeople:()=>{},renderEngagementClubPersonSwimmerOptions:()=>{},renderEngagementClubTeamPersonOptions:()=>{},renderEngagementClubOfficials:()=>{},
  callFunction:async(name,input)=>{assert.equal(name,"listEngagementClubPeople");inputs.push(JSON.parse(JSON.stringify(input)));const reply=replies.shift();return typeof reply==="function"?reply():reply;}};
vm.createContext(sandbox);vm.runInContext(source.slice(start,end),sandbox);
(async()=>{
  replies.push({source:"nap",people:[{id:"nap-official-1"},{id:"nap-leader-1"}],nextCursor:{leaders:100,officials:null},hasMore:true});
  await sandbox.loadEngagementClubPeople();assert.equal(sandbox.engagementClubPeople.length,2);assert.equal(sandbox.elements.engagementsClubPeopleAddButton.disabled,true);
  assert.equal(sandbox.engagementClubPeopleHasMore,true);await sandbox.loadEngagementClubPeople();assert.equal(inputs.length,1,"form redraw reuses current loaded page");
  replies.push({source:"nap",people:[{id:"nap-official-1"},{id:"nap-leader-101"}],nextCursor:{leaders:null,officials:null},hasMore:false});
  await sandbox.loadEngagementClubPeople({append:true});assert.equal(sandbox.engagementClubPeople.length,3);assert.deepEqual(inputs[1].cursor,{leaders:100,officials:null});
  await sandbox.loadEngagementClubPeople({append:true});assert.equal(inputs.length,2,"exhausted cursor produces no further request");
  let finish;replies.push(()=>new Promise(resolve=>{finish=resolve;}));
  const pending=sandbox.loadEngagementClubPeople({force:true});await Promise.resolve();await sandbox.loadEngagementClubPeople({force:true});assert.equal(inputs.length,3,"concurrent requests do not duplicate reads");
  sandbox.engagementClubPeopleRequestVersion++;sandbox.engagementClubPeople=[];sandbox.engagementClubPeopleLoaded=false;sandbox.engagementClubPeopleLoading=false;
  finish({source:"nap",people:[{id:"old-club-person"}],hasMore:false});await pending;assert.equal(sandbox.engagementClubPeople.length,0,"late response from a previous club cannot restore its identities");
  replies.push(()=>{throw Error("Index missing");});await sandbox.loadEngagementClubPeople({force:true});assert.equal(sandbox.engagementClubPeopleLoaded,false);assert.match(sandbox.elements.engagementsClubPeopleStatus.textContent,/Lecture impossible/);
  assert.ok(!source.slice(start,end).includes("rebuild"));
  console.log("Native people UI: explicit keyset continuation, no duplicate requests, refreshed navigation, scope-switch race and unavailable state");
})().catch(error=>{console.error(error);process.exitCode=1;});
