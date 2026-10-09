"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("assets/livepalmes-admin-portal.js","utf8");
const start=source.indexOf("  function engagementClubWriteLockReason("),end=source.indexOf("  const ENGAGEMENT_DETAIL_TAB_LABELS",start);
const context={selectedEngagementCompetition:{napSource:true,nativeReadOnly:true,nativeSwimmerSelectionEditable:true,entryStatus:"open",entryDeadlineAt:"2099-10-07T19:59:00.000Z"},global:{LivePalmesEnvironment:{sportingDataSource:"nap",isTest:true}},engagementClubTeamComplete:()=>true,isEngagementAdminMode:()=>false};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
assert.equal(context.engagementClubSwimmerSelectionLockReason(),"");assert.equal(context.clubEngagementTabHiddenWhenWriteLocked("swimmers"),false);
assert.equal(context.engagementClubWriteLocked(),true,"other native writes remain locked");
for(const tab of ["entries","relays","officials"]) assert.equal(context.clubEngagementTabHiddenWhenWriteLocked(tab),true);
context.selectedEngagementCompetition.entryStatus="closed";assert.match(context.engagementClubSwimmerSelectionLockReason(),/fermes/);
context.selectedEngagementCompetition.entryStatus="open";context.selectedEngagementCompetition.nativeSwimmerSelectionEditable=false;assert.match(context.engagementClubSwimmerSelectionLockReason(),/consultable/);
context.selectedEngagementCompetition.nativeSwimmerSelectionEditable=true;context.global.LivePalmesEnvironment.sportingDataSource="firebase";assert.match(context.engagementClubSwimmerSelectionLockReason(),/consultable/);
assert.match(source,/expectedFingerprint:engagementClubLastPersistedEntry\?\.napFingerprint,mutationId:global.crypto.randomUUID\(\)/);
assert.match(source,/engagementClubNativeSelectionRetry=payload/);assert.match(source,/callFunction\("saveEngagementClubSwimmerSelections",payload\)/);
// Execute the real autosave and retry branches: a failed response must retain
// exactly the same UUID, fingerprint and explicit choices, not a new operation.
const payloads=[];let attempts=0,uuids=0;
const queueContext={selectedEngagementCompetition:{napSource:true},selectedEngagementCompetitionId:"legacy-nap-5140",engagementClubSelectionTimer:null,engagementClubSelectionCompetitionId:"legacy-nap-5140",engagementClubSelectionChanges:new Map([["1",{swimmerIndexId:"1",selected:true,swimmer:{licenseNumber:"ignored"}}]]),engagementClubNativeRelayRetry:null,engagementClubNativeOfficialRetry:null,engagementClubNativeSelectionRetry:null,engagementClubNativeIndividualRetry:null,engagementClubLastPersistedEntry:{competitionId:"legacy-nap-5140",napFingerprint:"a".repeat(64)},elements:{engagementsClubSwimmersMessage:{},engagementsClubEntriesForm:{}},global:{crypto:{randomUUID:()=>{uuids++;return "11111111-1111-4111-8111-111111111111";}}},callFunction:async(name,payload)=>{assert.equal(name,"saveEngagementClubSwimmerSelections");payloads.push(JSON.parse(JSON.stringify(payload)));attempts++;if(attempts===1) throw new Error("Response interrupted");return {entry:{source:"nap"}};},queueEngagementClubEntryMutation:options=>options.execute(),canUse:()=>true,engagementClubSwimmerSelectionLockReason:()=>""};
vm.createContext(queueContext);
vm.runInContext(source.slice(source.indexOf("  function flushEngagementClubSwimmerSelections("),source.indexOf("  function resetEngagementClubEntriesAutosave(")),queueContext);
vm.runInContext(source.slice(source.indexOf("  async function saveEngagementClubSwimmers("),source.indexOf("  async function saveEngagementClubRelays(")),queueContext);
(async()=>{
  await assert.rejects(()=>queueContext.flushEngagementClubSwimmerSelections(),/interrupted/);
  assert.ok(queueContext.engagementClubNativeSelectionRetry);
  await queueContext.saveEngagementClubSwimmers(null);
  assert.equal(uuids,1);assert.deepEqual(payloads[0],payloads[1]);assert.equal(Object.hasOwn(payloads[0].changes[0],"swimmer"),false);assert.equal(queueContext.engagementClubNativeSelectionRetry,null);
  console.log("Native selection UI: scoped locks, closure and actual stable retry payload verified without network");
})().catch(error=>{console.error(error);process.exitCode=1;});

// Native recap must not discard a saved relay merely because old native
// categories/manual-time fields do not satisfy the LivePalmes editor.
const nativeEntry={source:"nap",swimmers:[{firstName:"Example",lastName:"<Person>",individualEntries:[{eventCode:"50BI",entryTime:"30.00"},{eventCode:"200BI",entryTime:"2:30.00"},{eventCode:"400BI",entryTime:"5:00.00"},{eventCode:"OLDCOURSE",nativeTime:"599999"}]}],relays:[{eventCode:"4X100BI",category:"NAP-27",manualEntryTime:"",entryTime:"4:10.00",members:[{firstName:"A",lastName:"One"},{firstName:"B",lastName:"Two"}]}]};
const beforeNative=JSON.stringify(nativeEntry);
const summaryContext={elements:{engagementsClubSummaryList:{},engagementsClubNativeSummary:{}},selectedEngagementCompetition:{napSource:true,fees:{enabled:false},officialsRequired:false},selectedEngagementClubEntry:nativeEntry,
  escapeHtml:value=>String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"),engagementRowValueHtml:value=>String(value),currentEngagementClubSwimmersForSummary:entry=>entry.swimmers,
  selectedEngagementClubRelayRows:()=>nativeEntry.relays,engagementClubRelayNeedsCompletion:()=>true,currentEngagementClubOfficialCount:()=>0,engagementFeeAmount:()=>0,engagementExternalHttpUrl:()=>"",engagementTeamLeadersWhatsAppValue:()=>"",engagementClubSummaryTeamLeaderLabel:()=>"Leader"};
vm.createContext(summaryContext);
vm.runInContext(source.slice(source.indexOf("  function renderEngagementClubSummary("),source.indexOf("  function renderEngagementClubRelays(")),summaryContext);
summaryContext.renderEngagementClubSummary(nativeEntry);
assert.match(summaryContext.elements.engagementsClubSummaryList.innerHTML,/>1 relais</);
assert.match(summaryContext.elements.engagementsClubSummaryList.innerHTML,/>4 courses</);
assert.match(summaryContext.elements.engagementsClubNativeSummary.innerHTML,/50BI — 30.00.*200BI — 2:30.00.*400BI — 5:00.00/);
assert.match(summaryContext.elements.engagementsClubNativeSummary.innerHTML,/OLDCOURSE — 599999/);
assert.match(summaryContext.elements.engagementsClubNativeSummary.innerHTML,/&lt;Person&gt;/);
assert.match(summaryContext.elements.engagementsClubNativeSummary.innerHTML,/One A, Two B/);
assert.equal(JSON.stringify(nativeEntry),beforeNative,"recap never changes stored native values or incomplete composition");
summaryContext.selectedEngagementCompetition.napSource=false;
summaryContext.renderEngagementClubSummary({...nativeEntry,source:"legacy"});
assert.match(summaryContext.elements.engagementsClubSummaryList.innerHTML,/>0 relais</,"legacy completion rule remains unchanged");
assert.equal(summaryContext.elements.engagementsClubNativeSummary.hidden,true);
assert.equal(summaryContext.elements.engagementsClubNativeSummary.innerHTML,"");
