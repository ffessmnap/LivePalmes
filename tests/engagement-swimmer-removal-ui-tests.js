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
function confirmedRemovalFixture({last=false}={}) {
  const swimmers=[{swimmerIndexId:"s1",firstName:"Test",lastName:"Nageur",sex:"F",individualEntries:[{eventCode:"50SF",entryTime:"25.01"}]},
    ...last?[]:[{swimmerIndexId:"s2",firstName:"Autre",lastName:"Nageur",sex:"M",individualEntries:[{eventCode:"50SF",entryTime:"28.02"}]}]];
  const saved={competitionId:"fixture-competition",source:"nap",napSource:true,napFingerprint:"before",teamLeader:{mode:"person"},swimmers,relays:[]};
  const staleRows=swimmers.map(person=>({querySelector:selector=>selector.includes("-id]")?{checked:true,dataset:{engagementClubSwimmerId:person.swimmerIndexId,engagementClubSwimmerFirstName:person.firstName,engagementClubSwimmerLastName:person.lastName,engagementClubSwimmerSex:person.sex}}:{value:"A-00-123"}}));
  const entryRows=swimmers.map(person=>({dataset:{engagementClubEntrySwimmerId:person.swimmerIndexId},querySelectorAll:selector=>selector.includes(":checked")?[{dataset:{engagementClubSwimmerEvent:"50SF"}}]:[]}));
  let finish,fail;const reply=new Promise((resolve,reject)=>{finish=resolve;fail=reject;});
  const states=[],calls=[],message={textContent:"",dataset:{}},mount={dataset:{},innerHTML:"",querySelectorAll:selector=>selector==="[data-engagement-club-entry-row]"?entryRows:[]};
  const c={selectedEngagementCompetitionId:saved.competitionId,selectedEngagementCompetition:{napSource:true},selectedEngagementClubEntry:saved,
    engagementClubLastPersistedEntry:JSON.parse(JSON.stringify(saved)),engagementClubSwimmersRenderedCompetitionId:saved.competitionId,engagementClubEntriesRenderedCompetitionId:saved.competitionId,
    engagementClubSwimmersLoaded:true,engagementClubSwimmersLoading:false,engagementClubSwimmers:swimmers,
    engagementClubSwimmerRemoving:false,engagementClubSelectionChanges:new Map(),engagementClubEntriesAutosaveSwimmers:new Map(),
    engagementClubEntryMutationQueue:Promise.resolve(),engagementClubEntryMutationRevision:0,engagementClubSelectionTimer:null,engagementClubSelectionCompetitionId:"",
    engagementClubNativeRelayRetry:null,engagementClubNativeOfficialRetry:null,engagementClubNativeSelectionRetry:null,engagementClubNativeIndividualRetry:null,
    activeEngagementsDetailTab:"entries",activeEngagementClubProfile:()=>({clubId:"fixture-club"}),canUse:()=>true,isEngagementAdminMode:()=>false,
    engagementClubTeamComplete:()=>true,engagementClubSwimmerSelectionLockReason:()=>"",engagementClubIndividualEntriesLockReason:()=>"",engagementClubWriteLockReason:()=>"",
    elements:{engagementsClubEntriesMessage:message,engagementsClubEntriesList:mount,engagementsClubSwimmersList:{querySelector:()=>staleRows[0]},engagementsClubSwimmersForm:{querySelectorAll:()=>staleRows,querySelector:()=>staleRows[0]}},
    document:{querySelectorAll:()=>[]},global:{confirm:()=>true,setTimeout:()=>1,clearTimeout:()=>{},crypto:{randomUUID:()=>"fixture-mutation"}},
    cloneEngagementClubEntry:value=>JSON.parse(JSON.stringify(value)),setEngagementSaveState:state=>states.push(state),
    rememberEngagementClubPersistedEntry:entry=>{c.engagementClubLastPersistedEntry=JSON.parse(JSON.stringify(entry));},
    setEngagementClubEntriesDirty:()=>{},discardPendingEngagementClubIndividualEntries:()=>{},
    renderEngagementClubTeamPersonOptions:()=>{},findEngagementClubTeamPersonFromFields:()=>null,updateEngagementClubTeamFormMode:()=>{},
    setEngagementClubCompetitionFormsLocked:()=>{},updateEngagementClubTeamLeaderActions:()=>{},isClubEngagementWorkflowTab:()=>false,
    setEngagementsDetailTab:tab=>{assert.equal(tab,"entries");c.renderEngagementClubEntries();c.renderEngagementClubSummary();},
    renderEngagementClubSummary:()=>{c.summaryIds=c.selectedEngagementClubEntry.swimmers.map(p=>p.swimmerIndexId);},
    syncEngagementClubEntriesSaveBar:()=>{},updateEngagementClubEntriesSummary:()=>{},engagementClubEmptySwimmersHtml:()=>"Aucun nageur engagé",
    engagementClubProgramSessionsForEntries:()=>[{}],renderQualificationExceptionToggle:()=>{},renderQualificationAlert:()=>{},updateQualificationCheckboxes:()=>{},
    renderEngagementClubEntriesTable:({rows})=>rows.map(person=>`${person.swimmerIndexId}:${person.individualEntries.map(row=>row.entryTime||"Calcul...").join(",")}`).join(";"),
    callFunction:async(name,payload)=>{calls.push({name,payload});return reply;}};
  vm.createContext(c);
  for(const name of ["selectedEngagementClubSwimmerRows","selectedEngagementClubEntryRowsBySwimmerId","currentEngagementClubSwimmersForSummary","renderEngagementClubEntries","renderEngagementClubEntry","renderEngagementClubMutationResult","queueEngagementClubEntryMutation","persistEngagementClubSwimmerSelection","flushEngagementClubSwimmerSelections","removeEngagementClubSwimmerFromCourses"]){
    const start=source.search(new RegExp(`  (?:async )?function ${name}\\(`)),next=source.slice(start+1).search(/\n  (?:async )?function /);
    assert.ok(start>=0,name);vm.runInContext(source.slice(start,start+1+next),c);
  }
  c.renderEngagementClubEntries();
  return {c,mount,states,calls,staleRows,run:()=>c.removeEngagementClubSwimmerFromCourses("s1",{disabled:false}),
    success:()=>finish({entry:{...saved,napFingerprint:"after",swimmers:swimmers.filter(p=>p.swimmerIndexId!=="s1")}}),failure:()=>fail(Error("Server failure"))};
}
(async()=>{
  let f=fixture({confirm:false});assert.equal(await f.run(),false);assert.deepEqual(f.calls.map(x=>x[0]),["confirm"]);assert.equal(f.button.disabled,false);
  f=fixture();assert.equal(await f.run(),true);assert.deepEqual(f.calls.map(x=>x[0]),["confirm","discard","persist","flush"]);assert.match(f.calls[0][1],/1 relais/);assert.match(f.calls[0][1],/conservés/);assert.deepEqual(f.calls[2],["persist","s1",false]);
  f=fixture({relays:false});await f.run();assert.doesNotMatch(f.calls[0][1],/composition/);
  for(const options of [{locked:true},{allowed:false},{pending:true}]){f=fixture(options);assert.equal(await f.run(),false);assert.equal(f.calls.length,0);}
  f=fixture({failed:true});assert.equal(await f.run(),false);assert.equal(f.c.engagementClubSwimmerRemoving,false);
  f=fixture();let release;f.c.engagementClubEntryMutationQueue=new Promise(r=>release=r);const first=f.run();assert.equal(await f.run(),false);release();await first;assert.equal(f.calls.filter(x=>x[0]==="persist").length,1);
  f=fixture();f.c.engagementClubEntryMutationQueue=Promise.resolve().then(()=>{f.c.selectedEngagementCompetitionId="other";});assert.equal(await f.run(),false);assert.equal(f.calls.length,0);
  for(const last of [false,true]) {
    const r=confirmedRemovalFixture({last}),pending=r.run();await new Promise(setImmediate);
    assert.match(r.mount.innerHTML,/s1:25.01/,"keep the row until the server confirms removal");
    assert.equal(r.states.at(-1),"saving");assert.equal(r.calls.length,1);
    assert.deepEqual(JSON.parse(JSON.stringify(r.calls[0].payload.changes)),[{swimmerIndexId:"s1",selected:false}]);
    r.success();assert.equal(await pending,true);
    assert.doesNotMatch(r.mount.innerHTML,/s1|Calcul/);assert.equal(r.states.at(-1),"saved");
    assert.match(r.mount.innerHTML,last?/Aucun nageur engagé/:/s2:28.02/);
    assert.deepEqual(Array.from(r.c.summaryIds),last?[]:["s2"]);
    assert.equal(r.staleRows[0].querySelector("[data-engagement-club-swimmer-id]").checked,true,"hidden stale controls must not resurrect a confirmed removal");
    assert.equal(r.c.selectedEngagementClubSwimmerRows().length,last?0:1);
  }
  const r=confirmedRemovalFixture(),pending=r.run();await new Promise(setImmediate);r.failure();assert.equal(await pending,false);
  assert.match(r.mount.innerHTML,/s1:25.01/);assert.match(r.mount.innerHTML,/s2:28.02/);assert.equal(r.states.at(-1),"error");
  assert.equal(r.calls.length,1,"failure must not trigger an extra read or silent retry");
  console.log("Swimmer removal UI: cancellation, relay warning, scope, closure, pending operations, double click and failure tested without network");
})().catch(e=>{console.error(e);process.exitCode=1;});
