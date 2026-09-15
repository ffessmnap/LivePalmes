"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../functions/index.js"), "utf8");
function section(text, start, end) { const i = text.indexOf(start); assert.ok(i >= 0); return text.slice(i, text.indexOf(end, i)); }
async function main() {
  const context = { qualificationEngine: require("../functions/engagement-qualification") };
  vm.createContext(context);
  vm.runInContext(section(source, "function qualificationRelaysAfterIndividualChange(", "function qualificationEvents("), context);
  const relays = [{ relayId: "one", memberIds: ["gone", "here"], members: [{ swimmerIndexId: "gone" }, { swimmerIndexId: "here" }] }];
  const swimmers = [{ swimmerIndexId: "here", individualEntries: [{ eventCode: "50SF", qualification: { qualified: true } }] }];
  for (const competition of [{}, { qualifications: { enabled: true } }]) {
    const result = context.qualificationRelaysAfterIndividualChange(relays, swimmers, competition);
    assert.equal(result.length, 1);
    assert.equal(JSON.stringify(result[0].memberIds), '["here"]');
    assert.equal(JSON.stringify(result[0].members), '[{"swimmerIndexId":"here"}]');
  }
  assert.equal(relays[0].memberIds.length, 2, "Pas de mutation de la source.");
  assert.equal(context.qualificationRelaysAfterIndividualChange(relays, [], {}).length, 1, "Le relais devenu vide reste engagé.");
  let data = { teamLeader: {}, relays: [{ relayId: "delete", memberIds: ["gone"] }, { relayId: "keep", memberIds: ["also-gone"] }] };
  let reads = 0, writes = 0, closed = false;
  const entryRef = { get: async () => { reads++; return { exists: true, data: () => structuredClone(data) }; } };
  const competitionRef = { get: async () => { reads++; return { exists: true, ref: competitionRef, data: () => ({}) }; } };
  Object.assign(context, { exports: {}, CALLABLE_OPTIONS: {}, onCall: (options, fn) => fn,
    engagementClubAccessContext: async () => ({ clubId: "club", uid: "user" }), cleanText: value => String(value || ""),
    engagementClubEntryId: () => "entry", engagementTeamLeaderComplete: () => true,
    assertEngagementClubWriteOpen: () => { if (closed) throw new Error("closed"); }, HttpsError: class extends Error { constructor(code, message) { super(message); } },
    writeAuditLog: async () => {}, engagementClubEntryItem: snapshot => snapshot.data(),
    db: { collection: name => ({ doc: () => name === "engagementCompetitions" ? competitionRef : entryRef }),
      runTransaction: async fn => fn({ get: ref => ref.get(), set: (ref, update) => { writes++; data = { ...data, ...update }; } }) }
  });
  const start = source.indexOf("exports.saveEngagementClubRelays =");
  vm.runInContext(source.slice(start, source.indexOf("\n});", start) + 4), context);
  const result = await context.exports.saveEngagementClubRelays({ data: { competitionId: "meet", removeRelayId: "delete", relays: [] } });
  assert.equal(result.entry.relays.length, 1); assert.equal(result.entry.relays[0].relayId, "keep");
  assert.equal(result.entry.relays[0].memberIds[0], "also-gone", "La suppression ignore les erreurs des autres relais.");
  assert.equal(reads, 4); assert.equal(writes, 1, "Pas de validation, lecture de performance ou remplacement fourni par le client.");
  closed = true;
  await assert.rejects(context.exports.saveEngagementClubRelays({ data: { competitionId: "meet", removeRelayId: "keep" } }), /closed/);
  assert.equal(writes, 1);
  const portal = fs.readFileSync(require("node:path").join(__dirname, "../assets/livepalmes-admin-portal.js"), "utf8");
  let payload;
  const ui = { selectedEngagementCompetitionId: "meet", selectedEngagementClubEntry: {}, engagementClubRelaysDraft: [],
    elements: { engagementsClubRelaysMessage: { dataset: {} } }, canUse: () => true,
    showEngagementClubWriteLock: () => false, engagementClubTeamComplete: () => true,
    selectedEngagementClubRelayRowsFromDom: () => [{ relayId: "keep", memberIds: ["gone"] }],
    engagementClubRelayValidationIssues: () => { throw new Error("La suppression ne doit pas valider la composition."); },
    setEngagementSaveState: () => {}, renderEngagementClubEntry: () => {},
    callFunction: async (name, data) => { payload = data; return { entry: { relays: [] } }; }
  };
  vm.createContext(ui);
  vm.runInContext(section(portal, "  async function saveEngagementClubRelays(", "  async function downloadEngagementClubSummaryPdf("), ui);
  assert.equal(await ui.saveEngagementClubRelays(null, ui.elements.engagementsClubRelaysMessage, null, "delete"), true);
  assert.equal(payload.removeRelayId, "delete");
  assert.equal(ui.elements.engagementsClubRelaysMessage.textContent, "Relais supprimé.");
  console.log("Relais : suppression ciblée, droits de clôture, retrait des nageurs et lectures bornées OK.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
