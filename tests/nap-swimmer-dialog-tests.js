"use strict";
const assert = require("node:assert/strict");
const fs = require("./helpers/source-files");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"), "utf8").replace(/\r\n/g, "\n");
function block(name) {
  const start = source.search(new RegExp(`  (?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  const next = source.slice(start + 1).search(/\n  (?:async )?function /);
  return source.slice(start, start + 1 + next);
}
function fixture() {
  const button = () => ({disabled: true, title: ""});
  const calls = [];
  const context = {
    selectedEngagementCompetition: {napSource: true, nativeReadOnly: true, nativeSwimmerSelectionEditable: true, entryStatus: "open"},
    selectedEngagementCompetitionId: "legacy-nap-123",
    teamComplete: true, permitted: true, response: {}, calls, engagementClubSwimmers: [],
    engagementClubSwimmerRecovery: null, engagementClubSwimmerCreationRetry: null,
    ENGAGEMENT_SWIMMER_LICENSE_PATTERN: /^[A-Z]-\d{2}-\d+$/,
    elements: {
      engagementsClubNewSwimmerDialogOpen: button(), engagementsClubNewSwimmerSaveButton: button(),
      engagementsClubRecoverSwimmerButton: button(), engagementsClubNewSwimmerMessage: {dataset: {}},
      engagementsClubNewSwimmerAlerts: {}, engagementsClubSwimmersSearch: {}, engagementsClubSwimmersMessage: {dataset: {}},
      engagementsClubNewSwimmerDialog: {dataset: {}, open: false, showModal() {this.open = true;}},
      engagementsClubSwimmersDirectorySearch: {value: ""}, engagementsClubSwimmersDirectoryStatus: {dataset: {}},
    },
    global: {LivePalmesEnvironment: {sportingDataSource: "nap"}, crypto: {randomUUID: () => "isolated-request"}, confirm: () => true},
    Date, document: {getElementById: () => null}, canUse: () => context.permitted,
    engagementClubScope: () => context.clubId || "club-fixture",
    requestedNavigationView: () => "engagements",
    engagementClubTeamComplete: () => context.teamComplete,
    selectedEngagementClubNewSwimmerFromForm: () => context.swimmer,
    engagementSwimmerDisplayName: () => "Nageur fictif",
    renderEngagementClubSwimmerRecovery: value => {context.recoveryShown = value;},
    renderEngagementClubNewSwimmerAlerts: () => {},
    engagementClubNewSwimmerConfirmationMessage: () => "Confirmer ?",
    invalidateEngagementClubSwimmersCache: () => {context.invalidated = true;},
    loadEngagementClubSwimmers: async () => {context.reloaded = true; return context.engagementClubSwimmers;},
    retryEngagementCompetitionRead: async () => {context.dossierReads = (context.dossierReads || 0) + 1; return true;},
    resetEngagementClubNewSwimmerForm: () => {},
    closeEngagementClubNewSwimmerDialog: () => {context.elements.engagementsClubNewSwimmerDialog.open = false;},
    renderEngagementClubSwimmers: () => {},
    renderEngagementClubSwimmersDirectory: () => {context.directoryRendered = true;},
    callFunction: async (name, payload) => {
      calls.push({name, payload});
      const response = context.response[name];
      if (response instanceof Error) throw response;
      if (typeof response === "function") return response(payload);
      return response || {};
    }
  };
  context.swimmer = {firstName: "Fictif", lastName: "EXEMPLE", birthDate: "2000-01-02", sex: "M", licenseNumber: "A-26-000000"};
  vm.createContext(context);
  for (const name of ["engagementClubWriteLockReason", "engagementClubSwimmerSelectionLockReason",
    "engagementClubNewSwimmerLockReason", "updateEngagementClubNewSwimmerControls", "setEngagementClubNewSwimmerMessage",
    "openEngagementClubNewSwimmerDialog", "createEngagementClubSwimmer", "recoverEngagementClubSwimmer"]) {
    vm.runInContext(block(name), context);
  }
  // Exercise completion inside the real deferred factory, including its private helper.
  context.window = context.global;
  context.global.LivePalmesPortalDeferred = {register: (_, factory) => {
    context.competitionActions = factory({state: context, config: context, actions: context, elements: context.elements}, context);
  }};
  vm.runInContext(require("node:fs").readFileSync("assets/portal/deferred/competition-actions.js", "utf8"), context);
  context.createEngagementClubSwimmer = context.competitionActions.createEngagementClubSwimmer;
  context.recoverEngagementClubSwimmer = context.competitionActions.recoverEngagementClubSwimmer;
  return context;
}
(async () => {
  const c = fixture();
  c.updateEngagementClubNewSwimmerControls();
  assert.equal(c.elements.engagementsClubNewSwimmerDialogOpen.disabled, false);
  c.openEngagementClubNewSwimmerDialog();
  assert.equal(c.elements.engagementsClubNewSwimmerDialog.open, true);
  assert.equal(c.calls.length, 0, "Opening must never read or write data");
  for (const patch of [{entryStatus: "closed"}, {entryStatus: "upcoming"}, {entryDeadlineAt: "2000-01-01"},
    {nativeSwimmerSelectionEditable: false}, {qualificationJobId: "pending"}]) {
    const locked = fixture(); Object.assign(locked.selectedEngagementCompetition, patch);
    locked.updateEngagementClubNewSwimmerControls();
    assert.equal(locked.elements.engagementsClubNewSwimmerDialogOpen.disabled, true);
    assert.ok(locked.elements.engagementsClubNewSwimmerDialogOpen.title);
    locked.openEngagementClubNewSwimmerDialog();
    assert.equal(locked.elements.engagementsClubNewSwimmerDialog.open, false);
    await locked.createEngagementClubSwimmer();
    locked.engagementClubSwimmerRecovery = {eligible: true, swimmer: {licenseNumber: "A-26-000000"}};
    await locked.recoverEngagementClubSwimmer();
    assert.equal(locked.calls.length, 0, "Locked form must not reach an endpoint");
  }
  const noTeam = fixture(); noTeam.teamComplete = false;
  noTeam.updateEngagementClubNewSwimmerControls();
  assert.equal(noTeam.elements.engagementsClubNewSwimmerDialogOpen.disabled, true);
  const legacy = fixture(); legacy.global.LivePalmesEnvironment.sportingDataSource = "firestore";
  legacy.selectedEngagementCompetition = {entryStatus: "open"};
  assert.equal(legacy.engagementClubNewSwimmerLockReason(), "");
  const created = fixture();
  created.response.previewEngagementClubSwimmerRecovery = {found: false, source: "nap"};
  created.response.previewEngagementClubSwimmerCreation = {source: "nap", alerts: []};
  created.response.createEngagementClubSwimmer = {source: "nap", swimmer: created.swimmer};
  created.engagementClubSwimmers = [created.swimmer];
  created.engagementClubAvailableSwimmersSexFilter = "F";
  await created.createEngagementClubSwimmer();
  assert.deepEqual(created.calls.map(c => c.name), ["previewEngagementClubSwimmerRecovery", "previewEngagementClubSwimmerCreation", "createEngagementClubSwimmer"]);
  assert.equal(created.calls[2].payload.creationId, "isolated-request");
  assert.equal(created.calls[2].payload.competitionId, "legacy-nap-123");
  assert.equal(created.reloaded, true);
  assert.equal(created.dossierReads, 1);
  assert.equal(created.engagementClubAvailableSwimmersSexFilter, "all");
  assert.equal(created.elements.engagementsClubSwimmersSearch.value, created.swimmer.licenseNumber);
  assert.equal(created.elements.engagementsClubSwimmersMessage.dataset.tone, "ok");
  assert.match(created.elements.engagementsClubSwimmersMessage.textContent, /Nageur créé/);
  const found = fixture();
  found.response.previewEngagementClubSwimmerRecovery = {found: true, eligible: true, source: "nap", swimmer: {...found.swimmer, napFingerprint: "unchanged"}};
  await found.createEngagementClubSwimmer();
  assert.equal(found.calls.length, 1, "Recovery preview must not create a duplicate");
  await found.recoverEngagementClubSwimmer();
  assert.equal(found.dossierReads, 1);
  assert.equal(found.elements.engagementsClubSwimmersMessage.dataset.tone, "warning", "Absent swimmer is never announced as selectable");
  assert.equal(found.calls[1].name, "recoverEngagementClubSwimmer");
  assert.equal(found.calls[1].payload.expectedFingerprint, "unchanged");
  assert.equal(found.calls[1].payload.mutationId, "isolated-request");
  assert.match(found.elements.engagementsClubSwimmersMessage.textContent, /Nageur récupéré/);
  for (const recovery of [{found: true, sameClub: true}, {found: true, eligible: false, publishedResult: true}]) {
    const denied = fixture(); denied.response.previewEngagementClubSwimmerRecovery = recovery;
    await denied.createEngagementClubSwimmer(); await denied.recoverEngagementClubSwimmer();
    assert.equal(denied.calls.length, 1);
  }
  const invalid = fixture(); invalid.swimmer.licenseNumber = "incorrect";
  await invalid.createEngagementClubSwimmer(); assert.equal(invalid.calls.length, 0);
  const failure = fixture(); failure.response.previewEngagementClubSwimmerRecovery = new Error("indisponible");
  await failure.createEngagementClubSwimmer();
  assert.match(failure.elements.engagementsClubNewSwimmerMessage.textContent, /indisponible/);
  assert.equal(failure.elements.engagementsClubNewSwimmerSaveButton.disabled, false);
  function directoryFixture() {
    const d = fixture();d.activeEngagementsTab = "clubSwimmers";d.selectedEngagementCompetition = null;d.selectedEngagementCompetitionId = "";d.teamComplete = false;
    d.openEngagementClubNewSwimmerDialog({origin:"directory",currentTarget:{id:"adminEngagementsClubSwimmersDirectoryAddButton"}});
    assert.equal(d.elements.engagementsClubNewSwimmerDialog.open,true,"Directory creation works without a competition or team leader");
    d.response.previewEngagementClubSwimmerRecovery = {found:false,source:"nap"};
    d.response.previewEngagementClubSwimmerCreation = {alerts:[],source:"nap"};
    d.response.createEngagementClubSwimmer = {swimmer:d.swimmer,source:"nap"};return d;
  }
  const directory = directoryFixture();await directory.createEngagementClubSwimmer();
  assert.equal(directory.calls[2].payload.competitionId,"");
  assert.equal(directory.directoryRendered,true);
  assert.equal(directory.dossierReads, undefined, "No competition read when creating from Mes nageurs");
  assert.equal(directory.engagementClubSwimmersDirectorySexFilter,"all");
  assert.equal(directory.elements.engagementsClubSwimmersDirectorySearch.value,"EXEMPLE");
  assert.match(directory.elements.engagementsClubSwimmersDirectoryStatus.textContent,/Nageur créé/);
  assert.equal(directory.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone,"warning","A missing row after refresh requests a refresh without offering a second creation");
  const doubled = directoryFixture();let release;
  doubled.response.previewEngagementClubSwimmerRecovery = () => new Promise(resolve=>{release=resolve;});
  const pending = doubled.createEngagementClubSwimmer();await doubled.createEngagementClubSwimmer();
  assert.equal(doubled.calls.length,1,"A double click starts only one request");release({found:false});await pending;
  assert.equal(doubled.calls.filter(call=>call.name==='createEngagementClubSwimmer').length,1);
  for (const change of [d=>{d.clubId='another-club';},d=>{d.permitted=false;},d=>{d.activeEngagementsTab='calendar';}]) {
    const stale=directoryFixture();let finish;
    stale.response.previewEngagementClubSwimmerRecovery=()=>new Promise(resolve=>{finish=resolve;});
    const operation=stale.createEngagementClubSwimmer();change(stale);finish({found:false});await operation;
    assert.equal(stale.calls.length,1,"A changed scope or page stops before creation");assert.equal(stale.directoryRendered,undefined);
  }
  const retry=directoryFixture();retry.response.createEngagementClubSwimmer=new Error('Réponse perdue');await retry.createEngagementClubSwimmer();
  const creationId=retry.calls[2].payload.creationId;retry.response.createEngagementClubSwimmer={swimmer:retry.swimmer,source:'nap'};
  await retry.createEngagementClubSwimmer();assert.equal(retry.calls[3].name,'createEngagementClubSwimmer');assert.equal(retry.calls[3].payload.creationId,creationId,'A retry reuses the same mutation identity');
  const recovered=directoryFixture();recovered.response.previewEngagementClubSwimmerRecovery={found:true,eligible:true,source:'nap',swimmer:{...recovered.swimmer,napFingerprint:'same'}};
  recovered.response.recoverEngagementClubSwimmer={swimmer:recovered.swimmer};await recovered.createEngagementClubSwimmer();await recovered.recoverEngagementClubSwimmer();
  assert.equal(recovered.calls[1].payload.competitionId,'');assert.equal(recovered.directoryRendered,true);assert.match(recovered.elements.engagementsClubSwimmersDirectoryStatus.textContent,/Nageur récupéré/);
  // Use the production reader and first-selection sender against a synthetic dossier.
  // Only the roster changes between opening the competition and the first click.
  for (const recover of [false, true]) {
    const f = fixture();
    const {fingerprint} = require("../functions/nap-competition-fingerprint");
    const pack = {swimmers: []};
    const previous = fingerprint(pack);
    const entry = () => ({competitionId:f.selectedEngagementCompetitionId, napFingerprint:fingerprint(pack), swimmers:[]});
    f.engagementClubLastPersistedEntry = entry();
    f.swimmer.id = "7";
    f.response.previewEngagementClubSwimmerRecovery = {found:recover, eligible:recover, source:"nap", swimmer:f.swimmer};
    f.response.previewEngagementClubSwimmerCreation = {source:"nap"};
    f.response[recover ? "recoverEngagementClubSwimmer" : "createEngagementClubSwimmer"] = () => {
      pack.swimmers.push(f.swimmer);
      f.engagementClubSwimmers = pack.swimmers;
      return {swimmer:f.swimmer};
    };
    Object.assign(f, {
      retryEngagementCompetitionRead:f.competitionActions.retryEngagementCompetitionRead,
      engagementClubReadRetryBlocked:()=>false, isEngagementAdminMode:()=>false,
      readEngagementClubWorkspaceCache:()=>null, writeEngagementClubWorkspaceCache:()=>{},
      setEngagementClubEntryLoadingState:()=>{}, renderEngagementCompetitionDetail:()=>{},
      setEngagementClubPersistedSwimmers:()=>{}, cloneEngagementClubEntry:value=>({...value}),
      renderEngagementClubEntry:value=>{f.engagementClubLastPersistedEntry=value;},
      callFunctionWithTimeout:async name=>{
        assert.equal(name,"getEngagementClubEntry");
        return {entry:entry(),competition:f.selectedEngagementCompetition};
      },
      engagementClubSelectionChanges:new Map(), engagementClubSelectionTimer:null,
      engagementClubNativeSelectionRetry:null, engagementClubNativeOfficialRetry:null,
      engagementClubNativeRelayRetry:null, engagementClubNativeIndividualRetry:null,
      queueEngagementClubEntryMutation:({execute})=>execute()
    });
    await f.createEngagementClubSwimmer();
    if (recover) await f.recoverEngagementClubSwimmer();
    assert.notEqual(f.engagementClubLastPersistedEntry.napFingerprint, previous);
    f.engagementClubSelectionCompetitionId = f.selectedEngagementCompetitionId;
    f.engagementClubSelectionChanges.set("7",{swimmerIndexId:"7",selected:true});
    f.response.saveEngagementClubSwimmerSelections = payload => {
      assert.equal(payload.expectedFingerprint, fingerprint(pack));
      assert.deepEqual(JSON.parse(JSON.stringify(payload.changes)), [{swimmerIndexId:"7",selected:true}]);
      return {entry:entry()};
    };
    vm.runInContext(block("flushEngagementClubSwimmerSelections"), f);
    await f.flushEngagementClubSwimmerSelections();
    assert.equal(f.engagementClubNativeSelectionRetry, null);
    assert.equal(f.calls.filter(call=>call.name==="saveEngagementClubSwimmerSelections").length, 1);
  }
  const offline = fixture();
  offline.engagementClubSwimmers = [offline.swimmer];
  offline.elements.engagementsDetailRetry = {hidden:true};
  offline.retryEngagementCompetitionRead = async () => false;
  await offline.createEngagementClubSwimmer();
  assert.equal(offline.elements.engagementsClubSwimmersMessage.dataset.tone, "warning");
  assert.match(offline.elements.engagementsClubSwimmersMessage.textContent, /Nageur créé.*Réessayer le chargement/);
  assert.equal(offline.elements.engagementsDetailRetry.hidden, false);

  const render = block("renderEngagementClubSwimmers");
  assert.equal(render.includes("engagementsClubNewSwimmerDialogOpen.disabled=true"), false);
  assert.ok(render.includes("updateEngagementClubNewSwimmerControls();"));
  assert.ok(render.includes('control.disabled=true;control.required=false;'), "Inline licence correction remains disabled");
  console.log("NAP swimmer dialog: opening, locks, simulated creation/recovery, duplicate prevention and errors verified without network.");
})().catch(error => {console.error(error); process.exitCode = 1;});
