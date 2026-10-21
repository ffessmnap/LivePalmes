"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"), "utf8").replace(/\r\n/g, "\n");
function block(name) {
  const start = source.search(new RegExp(`  (?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  const next = source.slice(start + 1).search(/\n  (?:async )?function /);
  return source.slice(start, start + 1 + next);
}
function fixture() {
  const calls = [], renders = [];
  const c = {
    Date, global: {LivePalmesEnvironment: {sportingDataSource: "nap"}},
    elements: {engagementsSaveState: {dataset: {}, hidden: true}, engagementsDetailStatus: {dataset: {}}, engagementsDetailRetry: {hidden: false}},
    selectedEngagementCompetitionId: "legacy-nap-fixture", selectedEngagementCompetition: {}, selectedEngagementClubEntry: {swimmers: []},
    engagementDetailRetryPending: false, engagementClubEntryMutationRevision: 1,
    engagementClubTeamSaving: false, engagementClubEntriesDirty: false,
    dirtyEngagementDetailTabs: new Set(), engagementClubRelaysDraft: [],
    engagementClubSelectionChanges: new Map(), engagementClubEntriesAutosaveSwimmers: new Set(),
    engagementClubNativeSelectionRetry: null, engagementClubNativeIndividualRetry: null,
    engagementClubNativeOfficialRetry: null, engagementClubNativeRelayRetry: null,
    engagementClubEntryMutationQueue: Promise.resolve(),
    isEngagementAdminMode: () => false, canUse: () => true,
    readEngagementClubWorkspaceCache: () => c.cached,
    cloneEngagementClubEntry: value => JSON.parse(JSON.stringify(value)),
    setEngagementClubEntryLoadingState: state => {c.loading = state;},
    renderEngagementCompetitionDetail: competition => {renders.push(competition); c.elements.engagementsDetailRetry.hidden = true;},
    setEngagementClubPersistedSwimmers: () => {}, renderEngagementClubEntry: entry => renders.push(entry),
    writeEngagementClubWorkspaceCache: (id, value) => {c.cached = value;},
    callFunctionWithTimeout: (name, payload) => {calls.push({name, payload}); return c.response();},
    escapeHtml: value => String(value).replace(/[<>&"]/g, x => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[x])),
    engagementClubSwimmerSelectionLockReason: () => "", engagementClubTeamComplete: () => true,
    engagementEventDefinition: code => code === "50SF" ? {label:"50 m surface"} : null,
    calls, renders,
  };
  vm.createContext(c);
  for (const name of ["compareEngagementSwimmersByName", "compareEngagementSwimmersBySexAndName", "engagementClubWriteLockReason", "engagementDeadlineTone", "engagementClubContextMessage", "setEngagementSaveState", "engagementClubEmptySwimmersHtml", "renderEngagementClubNativeSummary", "engagementCompetitionDocumentFileSize", "engagementClubReadRetryBlocked", "retryEngagementCompetitionRead"]) vm.runInContext(block(name), c);
  return c;
}
(async () => {
  // Exercise the real breadcrumb return listener against the real dirty-tab guard.
  const breadcrumb = {addEventListener: (type, listener) => {breadcrumb.click = listener;}};
  const navigation = {
    document: {querySelector: () => breadcrumb},
    global: {confirm: () => false}, activeEngagementsDetailTab: "team",
    dirtyEngagementDetailTabs: new Set(["team"]),
    selectedEngagementCompetitionId: "fixture", selectedEngagementClubEntry: {draft: "kept"},
    updateNavigationView: () => {navigation.updated = true;}
  };
  vm.createContext(navigation);
  vm.runInContext(block("confirmLeaveDirtyEngagementTab"), navigation);
  vm.runInContext(block("closeEngagementCompetitionDetail"), navigation);
  const listenerStart = source.indexOf('    document.querySelector("#adminPortalBreadcrumb")?.addEventListener("click",');
  const listenerEnd = source.indexOf('\n    elements.navigation?.addEventListener', listenerStart);
  vm.runInContext(source.slice(listenerStart, listenerEnd), navigation);
  let prevented = false;
  breadcrumb.click({target: {closest: () => ({})}, preventDefault: () => {prevented = true;}});
  assert.equal(prevented, true, "breadcrumb must intercept hash navigation before confirmation");
  assert.equal(navigation.selectedEngagementCompetitionId, "fixture");
  assert.equal(navigation.selectedEngagementClubEntry.draft, "kept");
  assert.equal(navigation.updated, undefined, "cancelled return must keep the current dossier");
  navigation.closeEngagementCompetitionDetail = () => true;
  breadcrumb.click({target: {closest: () => ({})}, preventDefault() {}});
  assert.equal(navigation.updated, true, "accepted return uses the existing navigation refresh");
  const visibility = {elements: {engagementsView: {dataset:{}}, engagementsDetail: {}, engagementsDetailClose: {}},
    isEngagementAdminMode: () => false, setEngagementSaveState() {}};
  vm.createContext(visibility);
  vm.runInContext(block("setEngagementCompetitionDetailVisible"), visibility);
  visibility.setEngagementCompetitionDetailVisible(true);
  assert.equal(visibility.elements.engagementsDetailClose.hidden, true, "club uses only the breadcrumb return");
  visibility.isEngagementAdminMode = () => true;
  visibility.setEngagementCompetitionDetailVisible(true);
  assert.equal(visibility.elements.engagementsDetailClose.hidden, false, "organizer keeps the existing button");
  visibility.setEngagementCompetitionDetailVisible(false);
  assert.equal(visibility.elements.engagementsDetailClose.hidden, true);
  const display = {elements:{engagementsClubContext:{},engagementsClubContextName:{}},activeEngagementClubProfile:user=>user,engagementClubScope:user=>String(user.clubId),isEngagementAdminMode:()=>false,canUse:()=>true,clubDisplayCode:club=>club.clubCode||`REF-${club.clubId}`};
  vm.createContext(display);vm.runInContext(block("renderEngagementClubContext"),display);
  display.renderEngagementClubContext({clubId:"106",clubCode:"CNHC"});
  assert.equal(display.elements.engagementsClubContextName.textContent,"CNHC");
  display.activeEngagementClubProfile=user=>({...user,clubId:"107"});
  display.renderEngagementClubContext({clubId:"106",clubCode:"CNHC"});
  assert.equal(display.elements.engagementsClubContextName.textContent,"REF-107","a switched club must never reuse the original club code");
  const c = fixture();
  const open = {napSource: true, entryStatus: "open", nativeIndividualEntriesEditable: true, nativeRelaysEditable: true};
  assert.match(c.engagementClubContextMessage(open), /peuvent être enregistrés/);
  assert.equal(c.engagementClubContextMessage({...open,entryStatus:"closed"}), "", "closure is already shown by the header status");
  for (const [patch, expected] of [[{entryStatus:"upcoming"}, /pas encore ouverts/], [{canceled:true}, /annulée/], [{entryDeadlineAt:"2000-01-01"}, /Date limite dépassée/], [{qualificationJobId:"pending"}, /qualifications en cours/]]) {
    const message = c.engagementClubContextMessage({...open, ...patch});
    assert.match(message, expected); assert.doesNotMatch(message, /peuvent être enregistrés/);
  }
  c.setEngagementSaveState("saving"); assert.match(c.elements.engagementsSaveState.textContent, /en cours/);
  c.setEngagementSaveState("saved"); assert.equal(c.elements.engagementsSaveState.hidden, false);
  assert.match(c.elements.engagementsSaveState.textContent, /confirmé/);
  c.setEngagementSaveState("error"); assert.match(c.elements.engagementsSaveState.textContent, /non confirmé/);
  c.setEngagementSaveState(""); assert.equal(c.elements.engagementsSaveState.hidden, true);
  c.elements.engagementsClubNativeSummary = {};
  c.renderEngagementClubNativeSummary({swimmers: [], relays: []});
  assert.match(c.elements.engagementsClubNativeSummary.innerHTML, /Aucune course enregistrée/);
  assert.match(c.elements.engagementsClubNativeSummary.innerHTML, /data-engagement-go-swimmers/);
  c.engagementClubSwimmerSelectionLockReason = () => "Fermé";
  c.renderEngagementClubNativeSummary({swimmers: [], relays: []});
  assert.doesNotMatch(c.elements.engagementsClubNativeSummary.innerHTML, /data-engagement-go-swimmers/);
  c.renderEngagementClubNativeSummary({swimmers:[{lastName:"<fictif>", individualEntries:[{eventCode:"50SF", entryTime:"00:27.87"}]}], relays:[]});
  assert.match(c.elements.engagementsClubNativeSummary.innerHTML, /&lt;fictif&gt;[\s\S]*50 m surface[\s\S]*00:27.87/);
  assert.doesNotMatch(c.elements.engagementsClubNativeSummary.innerHTML, /50SF|<small>/, "known course displayed once without its duplicate code");
  const historical = {swimmers:[{lastName:"Synthétique",individualEntries:[{eventCode:"ancien<code>",nativeTime:"14200"},{eventCode:"ancien<code>",entryTime:"014200"}]}],relays:[{eventCode:"4x100SF",entryTime:"05:01.23",members:[1,2,3,4].map(i=>({lastName:`Relayeur ${i}`}))}]};
  const beforeSummary=JSON.stringify(historical);
  c.renderEngagementClubNativeSummary(historical);
  const summary=c.elements.engagementsClubNativeSummary.innerHTML;
  assert.equal(JSON.stringify(historical),beforeSummary,"presentation never mutates saved native entries");
  assert.equal((summary.match(/ancien&lt;code&gt;/g)||[]).length,2,"duplicate historic courses remain visible");
  assert.match(summary,/14200[\s\S]*014200/);
  assert.match(summary,/Relayeur 1[\s\S]*Relayeur 2[\s\S]*Relayeur 3[\s\S]*Relayeur 4/);
  assert.match(summary,/05:01.23/);
  const ordered = {swimmers: [
    {sex:"M",lastName:"Albert",firstName:"Zacharie"},
    {sex:"F",lastName:"Zola",firstName:"Alice"},
    {sex:"F",lastName:"Émile",firstName:"Zoé"},
    {sex:"F",lastName:"emile",firstName:"Anne"},
    {sex:"M",lastName:"Albert",firstName:"Benoît"},
    {lastName:"Absent",firstName:"Sexe"}
  ], officials:[{lastName:"Zèbre",firstName:"Luc"},{lastName:"Alpha",firstName:"Zoé"},{lastName:"Alpha",firstName:"Anne"},{lastName:"<officiel>",firstName:"&"}], relays:historical.relays};
  const savedOrder = JSON.stringify(ordered);
  c.renderEngagementClubNativeSummary(ordered);
  const sortedSummary = c.elements.engagementsClubNativeSummary.innerHTML;
  assert.match(sortedSummary,/emile Anne[\s\S]*Émile Zoé[\s\S]*Zola Alice[\s\S]*Albert Benoît[\s\S]*Albert Zacharie[\s\S]*Absent Sexe/,"women then men, alphabetical last name and first name; missing sex last");
  assert.match(sortedSummary,/Officiels engagés <span>4<\/span>[\s\S]*Alpha Anne[\s\S]*Alpha Zoé[\s\S]*Zèbre Luc/);
  assert.match(sortedSummary,/&lt;officiel&gt; &amp;/,"official names are escaped");
  assert.equal(JSON.stringify(ordered),savedOrder,"sorting must not reorder the saved roster, officials or relay members");
  c.renderEngagementClubNativeSummary({swimmers:[],officials:[],relays:[]});
  assert.match(c.elements.engagementsClubNativeSummary.innerHTML,/Aucun officiel engagé/);
  c.selectedEngagementCompetition.officialsRequired=false;
  c.renderEngagementClubNativeSummary({});
  assert.match(c.elements.engagementsClubNativeSummary.innerHTML,/Officiels non requis/);
  c.renderEngagementClubNativeSummary(ordered);
  assert.match(c.elements.engagementsClubNativeSummary.innerHTML,/Alpha Anne/,"saved officials remain visible even when not required");
  c.renderEngagementClubNativeSummary(null);
  assert.equal(c.elements.engagementsClubNativeSummary.hidden,true);
  assert.equal(c.elements.engagementsClubNativeSummary.innerHTML,"");
  for(const missing of [undefined,null,0,-1,"",NaN,Infinity]) assert.equal(c.engagementCompetitionDocumentFileSize(missing),"");
  assert.equal(c.engagementCompetitionDocumentFileSize(512),"512 o");
  assert.equal(c.engagementCompetitionDocumentFileSize(1024),"1 Ko");

  // Un échec conserve les données, une reprise n'utilise que le lecteur natif.
  for (const cached of [undefined, {entry:{swimmers:[]}}]) {
    const r = fixture(); r.cached = cached;
    r.response = async () => {throw Error("private internal detail");};
    const before = r.selectedEngagementClubEntry;
    assert.equal(await r.retryEngagementCompetitionRead(), false);
    assert.equal(r.selectedEngagementClubEntry, before);
    assert.equal(r.renders.length, 0);
    assert.doesNotMatch(r.elements.engagementsDetailStatus.textContent, /private internal/);
    assert.equal(r.loading, cached ? "" : "error");
    assert.equal(r.elements.engagementsDetailRetry.disabled, false);
    let finish;
    r.response = () => new Promise(resolve => {finish=resolve;});
    const pending = r.retryEngagementCompetitionRead();
    await new Promise(setImmediate);
    assert.equal(r.elements.engagementsDetailRetry.disabled, true);
    assert.equal(await r.retryEngagementCompetitionRead(), false);
    assert.equal(r.calls.length, 2, "one read per attempt; no duplicate click or write");
    finish({competition:open, entry:{swimmers:[{swimmerIndexId:"synthetic"}]}});
    assert.equal(await pending, true);
    assert.equal(r.selectedEngagementClubEntry.swimmers[0].swimmerIndexId, "synthetic");
    assert.equal(r.elements.engagementsDetailRetry.hidden, true);
    assert.ok(r.calls.every(call => call.name === "getEngagementClubEntry"));
  }
  for (const key of ["engagementClubTeamSaving", "engagementClubEntriesDirty", "engagementClubNativeSelectionRetry", "engagementClubNativeIndividualRetry", "engagementClubNativeOfficialRetry", "engagementClubNativeRelayRetry"]) {
    const r=fixture(); r[key]=true;
    assert.equal(await r.retryEngagementCompetitionRead(), false); assert.equal(r.calls.length, 0, key);
  }
  for (const key of ["engagementClubSelectionChanges", "engagementClubEntriesAutosaveSwimmers", "dirtyEngagementDetailTabs"]) {
    const r=fixture(); r[key] = new Set(["pending"]);
    assert.equal(await r.retryEngagementCompetitionRead(), false); assert.equal(r.calls.length, 0, key);
  }
  const relay=fixture(); relay.engagementClubRelaysDraft=[{draftPending:true}];
  assert.equal(await relay.retryEngagementCompetitionRead(), false); assert.equal(relay.calls.length, 0);
  const saving=fixture(); saving.setEngagementSaveState("saving");
  assert.equal(await saving.retryEngagementCompetitionRead(), false); assert.equal(saving.calls.length, 0);
  const changed=fixture(); let complete;
  changed.response = () => new Promise(resolve => {complete=resolve;});
  const reading=changed.retryEngagementCompetitionRead(); await new Promise(setImmediate);
  changed.engagementClubEntryMutationRevision++;
  complete({competition:open, entry:{swimmers:[]}});
  assert.equal(await reading, false); assert.equal(changed.renders.length, 0);
  const stale = fixture(); let finish;
  stale.response = () => new Promise(resolve => {finish=resolve;});
  const pending = stale.retryEngagementCompetitionRead(); await new Promise(setImmediate);
  stale.selectedEngagementCompetitionId = "another";
  finish({competition:open, entry:{swimmers:[]}});
  assert.equal(await pending, false); assert.equal(stale.renders.length, 0);
  console.log("Club UX: states, durable server confirmation, empty navigation, safe bounded read retry and stale responses verified offline");
})().catch(error => {console.error(error); process.exitCode=1;});
