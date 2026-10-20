"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"),"utf8");
const start=source.indexOf("  async function removeEngagementClubSwimmerFromCourses(");
const code=source.slice(start,source.indexOf("  function resetEngagementClubEntriesAutosave(",start));
function fixture({confirm=true,locked=false,allowed=true,relays=true,pending=false,failed=false}={}) {
  const calls=[],button={disabled:false},message={textContent:""};
  const c={engagementClubSwimmerRemoving:false,selectedEngagementCompetitionId:"fixture-competition",activeEngagementClubProfile:()=>({clubId:"fixture-club"}),canUse:()=>allowed,engagementClubSwimmerSelectionLockReason:()=>locked?"closed":"",engagementClubSelectionChanges:new Map(pending?[["x",{}]]:[]),engagementClubEntriesAutosaveSwimmers:new Map(),engagementClubNativeRelayRetry:null,engagementClubNativeOfficialRetry:null,engagementClubNativeSelectionRetry:null,engagementClubNativeIndividualRetry:null,elements:{engagementsClubEntriesMessage:message},engagementClubEntryMutationQueue:Promise.resolve(),selectedEngagementClubEntry:{swimmers:[{swimmerIndexId:"s1",firstName:"Test",lastName:"Nageur"}],relays:relays?[{memberIds:["s1"]}]:[]},global:{confirm:text=>{calls.push(["confirm",text]);return confirm;}},discardPendingEngagementClubIndividualEntries:id=>calls.push(["discard",id]),persistEngagementClubSwimmerSelection:async(s,selected)=>calls.push(["persist",s.swimmerIndexId,selected]),flushEngagementClubSwimmerSelections:async()=>{calls.push(["flush"]);return !failed;}};
  vm.createContext(c);vm.runInContext(code,c);return {c,calls,button,message,run:()=>c.removeEngagementClubSwimmerFromCourses("s1",button)};
}
(async()=>{
  let f=fixture({confirm:false});assert.equal(await f.run(),false);assert.deepEqual(f.calls.map(x=>x[0]),["confirm"]);assert.equal(f.button.disabled,false);
  f=fixture();assert.equal(await f.run(),true);assert.deepEqual(f.calls.map(x=>x[0]),["confirm","discard","persist","flush"]);assert.match(f.calls[0][1],/1 relais/);assert.match(f.calls[0][1],/conservés/);assert.deepEqual(f.calls[2],["persist","s1",false]);
  f=fixture({relays:false});await f.run();assert.doesNotMatch(f.calls[0][1],/composition/);
  for(const options of [{locked:true},{allowed:false},{pending:true}]){f=fixture(options);assert.equal(await f.run(),false);assert.equal(f.calls.length,0);}
  f=fixture({failed:true});assert.equal(await f.run(),false);assert.equal(f.c.engagementClubSwimmerRemoving,false);
  f=fixture();let release;f.c.engagementClubEntryMutationQueue=new Promise(r=>release=r);const first=f.run();assert.equal(await f.run(),false);release();await first;assert.equal(f.calls.filter(x=>x[0]==="persist").length,1);
  f=fixture();f.c.engagementClubEntryMutationQueue=Promise.resolve().then(()=>{f.c.selectedEngagementCompetitionId="other";});assert.equal(await f.run(),false);assert.equal(f.calls.length,0);
  console.log("Swimmer removal UI: cancellation, relay warning, scope, closure, pending operations, double click and failure tested without network");
})().catch(e=>{console.error(e);process.exitCode=1;});
