"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const { attachPublishedProtocols, applyPublishedProtocol } = require("../functions/nap-calendar-protocols");
const { eventFromRow, SELECT_EVENT } = require("../functions/nap-calendar-event");
const { readNativeCompetitionSeason } = require("../functions/nap-portal-calendar-reader");
const { portalEventFromRow } = require("../functions/nap-portal-event");
const { listItem } = require("../functions/nap-competition-list-item");
let deferred;
const browser = { window: { LivePalmesPortalDeferred: { register: (name, factory) => { deferred = factory; } } }, document: { querySelectorAll: () => [] } };
for (const file of ["documents-and-program", "competition-settings"]) vm.runInNewContext(fs.readFileSync(`assets/portal/${file}.js`, "utf8"), browser);
vm.runInNewContext(fs.readFileSync("assets/portal/deferred/competition-settings.js", "utf8"), browser);
const context = { state: {}, config: {}, elements: {}, actions: {
  engagementCompetitionType: c => c.eventType || c.competitionType || "pool"
} };
const actions = browser.window.LivePalmesPortalDocumentsAndProgram.create(context);
const settings = browser.window.LivePalmesPortalCompetitionSettings.create(context);
const now = Date.parse("2026-11-08T12:00:00Z"), future = "2026-11-08T13:00:00Z";
const base = { id: "legacy-nap-2", name: "Fixture", date: "2026-11-08", publicationStatus: "published", entryStatus: "upcoming", eventType: "pool" };
const status = patch => actions.engagementCompetitionAdminStatus({ ...base, ...patch }, now).label;
assert.equal(status({}), "Au calendrier");
assert.equal(status({ entryStatus: "open", entryDeadlineAt: future }), "Engagements ouverts");
assert.equal(status({ entryStatus: "closed", entryDeadlineAt: future }), "Engagements fermés");
for (const entryStatus of ["open", "upcoming"]) assert.equal(status({ entryStatus, entryDeadlineAt: new Date(now).toISOString() }), "Engagements fermés");
assert.equal(status({ resultsPublishedAt: base.date, entryStatus: "closed" }), "Résultats publiés");
assert.equal(status({ resultsPdfUrl: "https://example.test/protocole.pdf?alt=media", entryStatus: "open" }), "Résultats publiés");
assert.equal(status({ canceled: true, resultsPublishedAt: base.date }), "Annulée");
for (const patch of [{ entryStatus: "open" }, { entryStatus: "" }, { entryStatus: "unknown" }, { entryStatusKnown: false }, { entryDeadlineAt: "invalid" }, { deadlineWarning: "ambiguous-native-deadline" }, { publicationStatus: "draft" }]) assert.equal(status(patch), "État à vérifier");
assert.equal(status({ eventType: "training", entryStatus: "" }), "Au calendrier");
assert.equal(status({ importStatus: "completed", imports: [{}] }), "Au calendrier", "An import history is never a publication signal");

(async () => {
  const raw = { id: 2, libelle: "Fixture", date: base.date, actif: 0, niveau: 1, type_label: "Piscine", has_results: 0 };
  let calls = [];
  const pool = { execute: async (query, values) => {
    calls.push({ query, values });
    return [query.sql.includes("FROM competitions c") ? [raw] : [
      { id: 1, competition: 2, name: "Invitation", location: "ged/invitation.pdf", type_label: "Invitation" },
      { id: 2, competition: 2, name: "Protocole", location: "ged/protocole.pdf", type_label: "Résultats" }
    ]];
  } };
  const season = await readNativeCompetitionSeason(pool, 2027);
  assert.equal(calls.length, 2);
  assert.match(calls[1].query.sql, /FORCE INDEX \(livepalmes_compet_public_id\)/);
  assert.match(calls[1].query.sql, /d.public='Y'.*LIMIT 101/);
  assert.deepEqual(calls[1].values, [2]);
  const event = season.events[0];
  assert.equal(event.resultsPublishedAt, base.date);
  assert.equal(event.results.pdfUrl, "https://nap.ffessm.fr/ged/protocole.pdf");
  assert.equal(event.results.url, "", "PDF alone does not fabricate structured results");
  assert.equal(event.results.dataPath, "");
  assert.equal(portalEventFromRow({ ...raw, actif: null }).entryStatusKnown, false);
  assert.equal(portalEventFromRow(raw).entryStatusKnown, true);
  context.actions.engagementTeamLeadersWhatsAppUrl = () => "";
  const cached = deferred(context, settings).engagementCalendarCacheCompetition(listItem(event));
  assert.equal(cached.resultsPublishedAt, base.date);
  assert.equal(cached.resultsPdfUrl, event.results.pdfUrl);
  assert.equal(cached.entryStatusKnown, true);
  assert.equal(status(JSON.parse(JSON.stringify(cached))), "Résultats publiés", "Publication survives memory/session cache");
  const unknown = deferred(context, settings).engagementCalendarCacheCompetition({ ...base, entryStatus: undefined, deadlineWarning: "invalid-native-deadline" });
  assert.equal(unknown.entryStatus, ""); assert.equal(unknown.deadlineWarning, "invalid-native-deadline");
  calls = []; await attachPublishedProtocols(pool, []); assert.equal(calls.length, 0);
  await assert.rejects(attachPublishedProtocols({ execute: async () => [Array(101).fill({ competition: 2 })] }, [event]), RangeError);
  await assert.rejects(attachPublishedProtocols({ execute: async () => [[{ competition: 3 }]] }, [event]), RangeError);
  await assert.rejects(attachPublishedProtocols(pool, Array.from({ length: 501 }, (_, i) => ({ id: i + 1 }))), RangeError);
  for (const doc of [
    { name: "Protocole", location: "javascript:bad.pdf" },
    { name: "Invitation", location: "ged/invitation.pdf" },
    { name: "Protocole", location: "ged/resultats.txt" },
    { name: "Protocole", location: "ged/p.pdf", document_id: 1, category: "information" }
  ]) {
    const result = await attachPublishedProtocols({ execute: async () => [[{ id: 1, competition: 2, ...doc }]] }, [eventFromRow(raw)]);
    assert.equal(result[0].resultsPublishedAt, "");
  }
  assert.equal(applyPublishedProtocol(eventFromRow({ ...raw, has_results: 1 }), []).resultsPublishedAt, base.date);
  assert.match(SELECT_EVENT, /JSON_UNQUOTE\(JSON_EXTRACT\(ri.metadata,'\$\.resultsDeleted'\)\)/);
  assert.match(SELECT_EVENT, /\$\.currentImportId/);
  console.log("Competition statuses: priority, effective deadlines, unknown states, cache, grouped public PDF publication and bounded reads verified offline.");
})().catch(error => { console.error(error); process.exitCode = 1; });
