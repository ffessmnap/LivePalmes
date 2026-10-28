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
    teamComplete: true, permitted: true, response: {}, calls,
    engagementClubSwimmerRecovery: null, engagementClubSwimmerCreationRetry: null,
    ENGAGEMENT_SWIMMER_LICENSE_PATTERN: /^[A-Z]-\d{2}-\d+$/,
    elements: {
      engagementsClubNewSwimmerDialogOpen: button(), engagementsClubNewSwimmerSaveButton: button(),
      engagementsClubRecoverSwimmerButton: button(), engagementsClubNewSwimmerMessage: {dataset: {}},
      engagementsClubNewSwimmerAlerts: {}, engagementsClubSwimmersSearch: {}, engagementsClubSwimmersMessage: {dataset: {}},
      engagementsClubNewSwimmerDialog: {open: false, showModal() {this.open = true;}},
    },
    global: {LivePalmesEnvironment: {sportingDataSource: "nap"}, crypto: {randomUUID: () => "isolated-request"}, confirm: () => true},
    Date, canUse: () => context.permitted,
    engagementClubTeamComplete: () => context.teamComplete,
    selectedEngagementClubNewSwimmerFromForm: () => context.swimmer,
    engagementSwimmerDisplayName: () => "Nageur fictif",
    renderEngagementClubSwimmerRecovery: value => {context.recoveryShown = value;},
    renderEngagementClubNewSwimmerAlerts: () => {},
    engagementClubNewSwimmerConfirmationMessage: () => "Confirmer ?",
    invalidateEngagementClubSwimmersCache: () => {context.invalidated = true;},
    loadEngagementClubSwimmers: async () => {context.reloaded = true;},
    resetEngagementClubNewSwimmerForm: () => {},
    closeEngagementClubNewSwimmerDialog: () => {context.elements.engagementsClubNewSwimmerDialog.open = false;},
    renderEngagementClubSwimmers: () => {},
    callFunction: async (name, payload) => {
      calls.push({name, payload});
      const response = context.response[name];
      if (response instanceof Error) throw response;
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
  await created.createEngagementClubSwimmer();
  assert.deepEqual(created.calls.map(c => c.name), ["previewEngagementClubSwimmerRecovery", "previewEngagementClubSwimmerCreation", "createEngagementClubSwimmer"]);
  assert.equal(created.calls[2].payload.creationId, "isolated-request");
  assert.equal(created.calls[2].payload.competitionId, "legacy-nap-123");
  assert.equal(created.reloaded, true);
  assert.match(created.elements.engagementsClubSwimmersMessage.textContent, /Nageur créé/);
  const found = fixture();
  found.response.previewEngagementClubSwimmerRecovery = {found: true, eligible: true, source: "nap", swimmer: {...found.swimmer, napFingerprint: "unchanged"}};
  await found.createEngagementClubSwimmer();
  assert.equal(found.calls.length, 1, "Recovery preview must not create a duplicate");
  await found.recoverEngagementClubSwimmer();
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
  const render = block("renderEngagementClubSwimmers");
  assert.equal(render.includes("engagementsClubNewSwimmerDialogOpen.disabled=true"), false);
  assert.ok(render.includes("updateEngagementClubNewSwimmerControls();"));
  assert.ok(render.includes('control.disabled=true;control.required=false;'), "Inline licence correction remains disabled");
  console.log("NAP swimmer dialog: opening, locks, simulated creation/recovery, duplicate prevention and errors verified without network.");
})().catch(error => {console.error(error); process.exitCode = 1;});
