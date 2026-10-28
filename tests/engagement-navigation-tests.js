"use strict";
const assert = require("node:assert/strict"), fs = require("./helpers/source-files"), vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../assets/livepalmes-engagement-navigation.js"), "utf8");
const portal = fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"), "utf8").replace(/\r\n/g, "\n");
function block(name) {
  const start = portal.search(new RegExp(`  (?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  const end = portal.slice(start + 1).search(/\n  (?:async )?function /);
  return portal.slice(start, start + 1 + end);
}
function fixture() {
  const data = new Map(), fields = new Map(), writes = [];
  const window = { sessionStorage: { getItem: k => data.get(k) || null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) } };
  vm.runInNewContext(source, { window });
  const api = window.LivePalmesEngagementNavigation;
  const form = { querySelectorAll: selector => selector.includes("input[id]") ? [...fields.values()] : [], querySelector: () => null };
  const c = { global: { ...window, location: {hash:"#club-competitions"} }, document: {querySelector:()=>null,getElementById:id=>fields.get(id)},
    currentAccessProfile: {uid:"u"}, engagementNavigationRestoring:false, selectedEngagementCompetitionId:"fixture",
    selectedEngagementCompetition:{napFingerprint:"competition-base",updatedAt:"read-date",entryStatus:"open"}, selectedEngagementClubEntry:{napFingerprint:"base",swimmers:[]},
    engagementClubLastPersistedEntry:{napFingerprint:"base",swimmers:[]}, engagementClubTeamEditing:true,
    engagementClubTeamSaving:false, engagementClubTeamRenunciationSaving:false, engagementClubSwimmerRemoving:false,
    engagementClubNativeSelectionRetry:null, engagementClubNativeIndividualRetry:null, engagementClubNativeOfficialRetry:null, engagementClubNativeRelayRetry:null,
    engagementClubEntriesDirty:true, engagementClubEntriesDirtySwimmerIds:new Set(["s"]), dirtyEngagementDetailTabs:new Set(["team"]),
    activeEngagementsDetailTab:"entries", engagementClubRelaysDraft:[{relayId:"r",draftPending:true,manualEntryTime:"01:23.45"}],
    engagementClubSwimmersLoadPromise:null, engagementClubSwimmersLoaded:true, isEngagementAdminMode:()=>false, canUse:()=>true, engagementClubWorkspaceScopeKey:()=>"u.club",
    cloneEngagementClubEntry:v=>JSON.parse(JSON.stringify(v)), selectedEngagementClubSwimmerRows:()=>[{swimmerIndexId:"s",individualEntries:[{eventCode:"50SF",manualEntryTime:"00:33.12"}]}],
    selectedEngagementClubRelayRows:()=>c.engagementClubRelaysDraft,
    elements:{engagementsClubTeamForm:form,engagementsDetailRetry:{hidden:true},engagementsDetailStatus:{},engagementsClubEntriesForm:form,engagementsClubEntriesList:{innerHTML:"old server choices"}},
    engagementClubHasPendingWrites:()=>false, renderEngagementClubSwimmers:()=>{},renderEngagementClubOfficials:()=>{},renderEngagementClubEntries:()=>{},renderEngagementClubRelays:()=>{},
    updateEngagementClubTeamLeaderActions:()=>{},updateEngagementClubTeamFormMode:()=>{},updateEngagementDirtyTabIndicators:()=>{},renderEngagementClubSummary:()=>{},
    setEngagementClubEntriesDirty:value=>{c.engagementClubEntriesDirty=value;c.engagementClubEntriesDirtySwimmerIds.clear();},setEngagementsDetailTab:tab=>c.activeEngagementsDetailTab=tab,
    loadEngagementCompetitionDetail: async id=>{c.selectedEngagementCompetitionId=id;c.selectedEngagementClubEntry={napFingerprint:c.serverFingerprint || "base",swimmers:[]};},
    showEngagementNavigationRecovery:s=>c.recovery=s,
    callFunction:()=>writes.push("write"),callFunctionWithTimeout:()=>writes.push("read"), fields, api, data, writes };
  vm.createContext(c);
  for(const name of ["engagementNavigationBaseline","preserveEngagementNavigation","restoreEngagementNavigation"]) vm.runInContext(block(name), c);
  return c;
}
(async()=>{
  const c=fixture();
  c.fields.set("manual",{id:"manual",type:"text",value:"BROUILLON NON ENREGISTRÉ",labels:[{textContent:"Saisie"}]});
  c.fields.set("password",{id:"password",type:"password",value:"never-copy"});
  c.preserveEngagementNavigation();
  assert.equal(c.api.read("other.club"),null,"never restore another club/account");
  assert.equal(c.api.read("u.club").fields.length,1);
  const serialized=[...c.data.values()][0];assert.doesNotMatch(serialized,/never-copy/);
  // New portal document, after an actual unload: only the session checkpoint survives.
  const back=fixture();back.api.save("u.club",JSON.parse(serialized));back.fields.set("manual",{id:"manual",type:"text",value:""});
  back.selectedEngagementCompetition.updatedAt="new-read-date";
  back.renderEngagementClubEntries=()=>{assert.equal(back.elements.engagementsClubEntriesList.innerHTML,"","old DOM must not override the checkpoint course choices");};
  back.selectedEngagementCompetitionId="";await back.restoreEngagementNavigation();
  assert.equal(back.fields.get("manual").value,"BROUILLON NON ENREGISTRÉ");
  assert.equal(back.selectedEngagementClubEntry.swimmers[0].individualEntries[0].manualEntryTime,"00:33.12");
  assert.equal(back.engagementClubRelaysDraft[0].draftPending,true);assert.equal(back.activeEngagementsDetailTab,"entries");
  assert.equal(back.engagementClubEntriesDirty,true);assert.ok(back.engagementClubEntriesDirtySwimmerIds.has("s"));
  assert.deepEqual(back.writes,[]);assert.equal(back.api.read("u.club"),null,"consume after successful restore only");
  const team=fixture();const teamSnapshot=JSON.parse(serialized);teamSnapshot.tab="team";team.api.save("u.club",teamSnapshot);team.selectedEngagementCompetitionId="";
  team.renderEngagementClubEntries=()=>{throw Error("Do not render/fetch hidden course qualifications from the team step");};
  await team.restoreEngagementNavigation();assert.equal(team.api.read("u.club"),null);assert.equal(team.selectedEngagementClubEntry.swimmers[0].individualEntries[0].manualEntryTime,"00:33.12");
  // Quota/denial and in-flight or uncertain writes keep the portal alive.
  c.engagementClubHasPendingWrites=()=>true;assert.throws(c.preserveEngagementNavigation,/enregistrement/);
  c.engagementClubHasPendingWrites=()=>false;c.global.sessionStorage.setItem=()=>{throw Error("quota")};assert.throws(c.preserveEngagementNavigation,/quota/);
  const conflict=fixture();conflict.api.save("u.club",JSON.parse(serialized));conflict.selectedEngagementCompetitionId="";conflict.serverFingerprint="changed";
  await conflict.restoreEngagementNavigation();assert.ok(conflict.recovery);assert.equal(conflict.selectedEngagementClubEntry.napFingerprint,"changed");assert.ok(conflict.api.read("u.club"));
  const programChange=fixture();programChange.api.save("u.club",JSON.parse(serialized));programChange.selectedEngagementCompetitionId="";
  programChange.selectedEngagementCompetition.napFingerprint="new-program";
  await programChange.restoreEngagementNavigation();assert.ok(programChange.recovery);assert.ok(programChange.api.read("u.club"));
  const failed=fixture();failed.api.save("u.club",JSON.parse(serialized));failed.selectedEngagementCompetitionId="";failed.loadEngagementCompetitionDetail=async()=>{throw Error("offline")};
  await failed.restoreEngagementNavigation();assert.ok(failed.api.read("u.club"));assert.match(failed.elements.engagementsDetailStatus.textContent,/reste conservé/);
  assert.doesNotMatch(source,/localStorage|fetch\(|firebase|XMLHttpRequest/);
  console.log("Engagement navigation: full unload/restore, manual field/course/relay drafts, dirty state, scope isolation, quota, pending writes, conflict and offline retention verified without services.");
})().catch(error=>{console.error(error);process.exitCode=1;});
