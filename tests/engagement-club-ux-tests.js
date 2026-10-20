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
    calls, renders,
  };
  vm.createContext(c);
  for (const name of ["engagementClubWriteLockReason", "engagementDeadlineTone", "engagementClubContextMessage", "setEngagementSaveState", "engagementClubEmptySwimmersHtml", "renderEngagementClubNativeSummary", "retryEngagementCompetitionRead"]) vm.runInContext(block(name), c);
  return c;
}
(async () => {
  const c = fixture();
  const open = {napSource: true, entryStatus: "open", nativeIndividualEntriesEditable: true, nativeRelaysEditable: true};
  assert.match(c.engagementClubContextMessage(open), /peuvent être enregistrés/);
  for (const [patch, expected] of [[{entryStatus:"closed"}, /fermés.*consultable/], [{entryStatus:"upcoming"}, /pas encore ouverts/], [{canceled:true}, /annulée/], [{entryDeadlineAt:"2000-01-01"}, /Date limite dépassée/], [{qualificationJobId:"pending"}, /qualifications en cours/]]) {
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
  assert.match(c.elements.engagementsClubNativeSummary.innerHTML, /&lt;fictif&gt;.*50SF — 00:27.87/);

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
  for (const key of ["engagementClubSelectionChanges", "engagementClubEntriesAutosaveSwimmers"]) {
    const r=fixture(); r[key] = new Set(["pending"]);
    assert.equal(await r.retryEngagementCompetitionRead(), false); assert.equal(r.calls.length, 0, key);
  }
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
