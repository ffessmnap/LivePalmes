"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../functions/index.js"), "utf8");
const calls = [];
const pool = {};
const event = { id: "legacy-nap-5140", date: "2026-10-11", competitionType: "pool", level: "regional", regionId: "PACA", nationalManagementOnly: false };
let management = { national: true, uid: "admin" };
const context = { clubId: "00123", clubName: "Club" };
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const sandbox = { exports: {}, ENVIRONMENT: { projectId: "livepalmes-test" }, CALLABLE_OPTIONS: {}, defineSecret: name => name,
  onCall: (_, callback) => callback, HttpsError, process: { env: {} }, ENGAGEMENT_EVENT_DEFINITION_BY_CODE: new Map(),
  ENGAGEMENT_COMPETITION_LEVELS: new Set(["regional", "national"]), ENGAGEMENT_ENTRY_STATUSES: new Set(["open", "closed", "upcoming"]),
  cleanText: value => String(value || ""), cleanIsoDate: value => /^\d{4}-\d\d-\d\d$/.test(String(value)) ? value : "",
  engagementSeasonEndYearFromIsoDate: value => Number(value.slice(0, 4)) + (value.slice(5, 7) >= "09" ? 1 : 0),
  engagementSeasonBoundsFromEndYear: endYear => ({ endYear, startYear: endYear - 1, startDate: `${endYear - 1}-09-01`, endDate: `${endYear}-08-31` }),
  engagementRegionsMatch: (left, right) => left === right,
  engagementAccessContext: async () => management, engagementClubAccessContext: async () => context,
  assertCanManageEngagementCompetition: (actor, item) => { calls.push("authorize"); if (!actor.national && actor.regionId !== item.regionId) throw new HttpsError("permission-denied", "Hors region"); },
  engagementEventIsPast: () => false, ageCategoryFromDates: () => "M30+", portalReadStats: () => ({}),
  db: { getAll: () => { throw new Error("Old sports read"); }, collection: () => { throw new Error("Old sports read"); } },
  require: name => {
    if (name === "./nap-portal-swimmers") return { portalPool: () => pool };
    if (name === "./nap-portal-competitions") return {
      readNativeCompetitionSeason: async (connection, year) => { assert.equal(connection, pool); assert.equal(year, 2027); calls.push("season"); return { events: [event, { ...event, id: "legacy-nap-5200", competitionType: "training" }] }; },
      readNativeCompetition: async (_, id, authorize) => { assert.equal(id, event.id); await authorize(event); calls.push("detail"); return { event }; }
    };
    if (name === "./nap-portal-workspaces") return { listItem: item => ({ ...item, napSource: true }), competitionItem: pack => ({ ...pack.event, napSource: true }),
      readDocuments: async () => { calls.push("documents"); return []; }, entryItem: pack => ({ source: "nap", clubId: pack.clubId }) };
    if (name === "./nap-portal-entries") return { readNativeClubEntry: async (_, input, authorize) => { await authorize(input); calls.push("entry"); return input; } };
    throw new Error(`Unexpected module ${name}`);
  } };
vm.createContext(sandbox);
const helperStart = source.indexOf("async function nativePortalCalendarItems(");
vm.runInContext(source.slice(helperStart, source.indexOf("exports.listEngagementCompetitions", helperStart)), sandbox);
for (const name of ["listEngagementCompetitions", "listEngagementCalendarEvents", "getEngagementCompetition", "getEngagementCalendarEvent", "getEngagementClubEntry", "preloadEngagementClubWorkspaces", "createEngagementCompetition", "createEngagementCalendarEvent"]) {
  const start = source.indexOf(`exports.${name} =`);
  const end = source.indexOf("\nexports.", start + 1);
  vm.runInContext(source.slice(start, end), sandbox);
}
(async () => {
  const list = await sandbox.exports.listEngagementCompetitions({ data: { manageOnly: true, fromDate: "2026-09-01", toDate: "2027-08-31" } });
  assert.equal(list.source, "nap"); assert.equal(list.competitions.length, 1); assert.equal(list.competitions[0].id, event.id);
  const calendar = await sandbox.exports.listEngagementCalendarEvents({ data: { fromDate: "2026-09-01", toDate: "2027-08-31" } });
  assert.equal(calendar.events.length, 1); assert.equal(calendar.events[0].competitionType, "training");
  calls.length = 0;
  await sandbox.exports.getEngagementCompetition({ data: { competitionId: event.id } });
  assert.deepEqual(calls, ["authorize", "detail", "documents"]);
  calls.length = 0; management = { national: false, region: true, regionId: "AURA" };
  await assert.rejects(sandbox.exports.getEngagementCompetition({ data: { competitionId: event.id } }), error => error.code === "permission-denied");
  assert.deepEqual(calls, ["authorize"]);
  const entry = await sandbox.exports.getEngagementClubEntry({ data: { competitionId: event.id, clubId: "999" } });
  assert.equal(entry.entry.clubId, "00123", "Caller cannot choose another club dossier");
  assert.equal(entry.sqlBudget.queriesMax, 23);
  const preload = await sandbox.exports.preloadEngagementClubWorkspaces({ data: { competitionIds: [event.id] } });
  assert.equal(preload.workspaces.length, 0);
  for (const name of ["createEngagementCompetition", "createEngagementCalendarEvent"]) await assert.rejects(sandbox.exports[name]({ data: {} }), error => error.code === "failed-precondition");
  console.log("NAP portal callables: scope, authenticated club, native reads and no old sports fallback verified");
})().catch(error => { console.error(error); process.exitCode = 1; });
