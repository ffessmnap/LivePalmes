"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { preview, nativeClubScopes } = require("../functions/nap-notification-preview");
const source = fs.readFileSync("functions/index.js", "utf8");
const competition = { id: "legacy-nap-5162", source: "nap", napSource: true, officialsRequired: false,
  computerEmail: "tech@example.org", clubDocuments: [{ id: "nap-34" }] };
const recipients = [{ uid: "a", clubId: "106" }, { uid: "b", clubId: "107" }];
function services(overrides = {}) {
  const calls = [];
  return { calls, competition: async () => { calls.push("competition"); return competition; },
    recipients: async () => { calls.push("recipients"); return recipients; },
    select: (kind, items) => { calls.push(kind); return items; }, clubRecipients: items => items,
    hasParticipants: entry => entry.swimmers?.length > 0,
    entries: async () => { calls.push("entries"); return { entries: [{ clubId: "106", teamLeaderComplete: true, swimmers: [{}] },
      { clubId: "107", teamLeaderComplete: false, swimmers: [{}] }, { clubId: "108", teamLeaderComplete: true, swimmers: [] }] }; }, ...overrides };
}
async function run() {
  const opening = await preview({ kind: "opening", competitionId: competition.id }, services());
  assert.equal(opening.recipientCount, 2); assert.equal(opening.plannedJobCount, 2);
  assert.equal(opening.jobCount, 0); assert.equal(opening.sentCount, 0); assert.equal(opening.disabled, true);
  assert.equal(opening.mailStatus, "test-emails-disabled");
  const sending = services();
  assert.equal((await preview({ kind: "send" }, sending)).attemptedCount, 0);
  assert.deepEqual(sending.calls, ["competition"], "Sending cannot read recipients, old outbox or SMTP in TEST");
  const denied = services({ competition: async () => { throw new Error("forbidden"); } });
  await assert.rejects(preview({ kind: "opening" }, denied), /forbidden/); assert.deepEqual(denied.calls, []);
  await assert.rejects(preview({ kind: "opening" }, services({ competition: async () => ({ source: "firebase" }) })), /NAP/);
  await assert.rejects(preview({ kind: "documents", documentIds: ["nap-999"] }, services()), /introuvables/);
  await assert.rejects(preview({ kind: "documents", documentIds: "nap-34" }, services()), /Liste/);
  const recaps = await preview({ kind: "club_recaps" }, services());
  assert.equal(recaps.clubEntryCount, 3); assert.equal(recaps.engagedClubCount, 2);
  assert.equal(recaps.recipientCount, 1); assert.equal(recaps.pdfGeneratedCount, 0);
  assert.equal(recaps.closureRecipients.officialsRequired, false);
  let queries = 0;
  const connection = { execute: async (query, values) => {
    queries++; assert.ok(query.sql.includes("FORCE INDEX (PRIMARY)")); assert.deepEqual(values, ["106"]);
    return [[{ num_club: 106, comite_club: 3 }]];
  } };
  const mapped = await nativeClubScopes(connection, [{ clubId: "106", regionId: "old-region", capabilities: ["engagements.club.manage"] },
    { clubId: "", regionId: "Sud", capabilities: ["engagements.region.manage"] }]);
  assert.equal(mapped[0].regionId, "Ile de France"); assert.equal(mapped[1].regionId, "Sud"); assert.equal(queries, 1);
  await assert.rejects(nativeClubScopes(connection, [{ clubId: "former-firebase-id", capabilities: ["engagements.club.manage"] }]), /identifiant NAP/);
  assert.equal(queries, 1, "Unmapped identifiers are never guessed or scanned");
  await assert.rejects(nativeClubScopes({ execute: async () => [[]] }, [{ clubId: "106", capabilities: ["engagements.club.manage"] }]), /existant/);
  const names = ["previewEngagementCompetitionDocumentNotification", "notifyEngagementCompetitionDocuments",
    "prepareEngagementOpeningNotificationEmails", "prepareEngagementClubRecapEmails", "sendEngagementPreparedEmails", "listEngagementCompetitionMailJobs"];
  for (const name of names) {
    const start = source.indexOf(`exports.${name} =`), end = source.indexOf("\n});", start) + 4;
    assert.ok(start > 0 && end > start);
    let previews = 0, authorizations = 0;
    const sandbox = { exports: {}, ENVIRONMENT: { projectId: "livepalmes-test" },
      ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS: {}, ENGAGEMENT_MAIL_CALLABLE_OPTIONS: {},
      onCall: (_options, handler) => handler,
      nativeNotificationPreview: async () => { previews++; return { disabled: true }; },
      engagementAccessContext: async () => ({ national: true }), cleanText: value => String(value || ""),
      nativePortalCompetition: async (id, authorize) => { assert.equal(id, competition.id); authorize(competition); },
      assertCanManageEngagementCompetition: () => { authorizations++; },
      db: { collection: () => { throw new Error("Firestore sporting read or outbox forbidden in TEST"); } } };
    vm.runInNewContext(source.slice(start, end), sandbox);
    const result = await sandbox.exports[name]({ data: { competitionId: competition.id } });
    assert.equal(result.disabled, true);
    assert.equal(previews, name === "listEngagementCompetitionMailJobs" ? 0 : 1);
    if (name === "listEngagementCompetitionMailJobs") assert.equal(authorizations, 1);
  }
  const helperStart = source.indexOf("async function nativeNotificationPreview(");
  const helperEnd = source.indexOf("exports.listEngagementCompetitionClubRecaps =", helperStart);
  const helper = source.slice(helperStart, helperEnd);
  assert.ok(helper.includes('state.data()?.status !== "ready"'));
  assert.equal(helper.includes("bootstrapEngagementMailRecipientIndex"), false);
  assert.equal(helper.includes("engagementCompetitions"), false);
  assert.equal(helper.includes("engagementClubEntries"), false);
  let shardReads = 0, clubReads = 0;
  const helperSandbox = { Object, TypeError, RangeError, process: { env: {} },
    HttpsError: class extends Error { constructor(code, message) { super(message); this.code = code; } },
    engagementAccessContext: async () => ({ national: true }), cleanText: value => String(value || ""),
    nativePortalCompetition: async (_id, authorize) => { authorize(competition); return competition; },
    assertCanManageEngagementCompetition: () => {},
    engagementMailRecipientIndexStateRef: () => ({ get: async () => ({ data: () => ({ status: "missing" }) }) }),
    engagementMailRecipientsFromIndex: async () => { shardReads++; return []; },
    require: name => {
      if (name === "./nap-notification-preview") return { preview, nativeClubScopes };
      if (name === "./nap-portal-swimmers") return { portalPool: () => { clubReads++; return connection; } };
      throw new Error("Unexpected dependency: " + name);
    }, db: {}, engagementClubEntryHasParticipants: () => true };
  vm.runInNewContext(helper, helperSandbox);
  await assert.rejects(helperSandbox.nativeNotificationPreview({ data: { competitionId: competition.id } }, "opening"),
    error => error.code === "failed-precondition" && /Annuaire/.test(error.message));
  assert.equal(shardReads, 0); assert.equal(clubReads, 0);
  assert.equal((await helperSandbox.nativeNotificationPreview({ data: { competitionId: competition.id } }, "send")).attemptedCount, 0);
  const portal = fs.readFileSync("assets/livepalmes-admin-portal.js", "utf8");
  for (const [name, next, expectedCall] of [
    ["prepareEngagementOpeningEmails", "  async function prepareEngagementClubRecapEmails", "prepareEngagementOpeningNotificationEmails"],
    ["prepareEngagementClubRecapEmails", "  function engagementMailSendButton", "prepareEngagementClubRecapEmails"]
  ]) {
    const start = portal.indexOf(`  async function ${name}(`), end = portal.indexOf(next, start);
    assert.ok(start > 0 && end > start);
    const apiCalls = [], finishes = [];
    const ui = { selectedEngagementCompetitionId: competition.id, isEngagementAdminMode: () => true,
      elements: { engagementsDocumentsSummary: {}, engagementsPrepareOpeningEmailsButton: {}, engagementsPrepareClubRecapEmailsButton: {} },
      startEngagementLongOperation: () => {}, finishEngagementLongOperation: (...args) => finishes.push(args),
      callFunction: async call => { apiCalls.push(call); return { disabled: true, recipientCount: 12, clubCount: 3 }; },
      loadEngagementMailJobs: () => { throw new Error("Unnecessary reload after read-only preview"); } };
    vm.runInNewContext(portal.slice(start, end), ui);
    await ui[name]();
    assert.deepEqual(apiCalls, [expectedCall]); assert.equal(finishes.length, 1);
    assert.match(ui.elements.engagementsDocumentsSummary.textContent, /TEST.*12.*Aucun mail préparé ni envoyé/);
  }
  console.log("Aperçus notifications NAP : autorisation, sources, périmètres natifs, budgets et absence d'envoi OK.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
