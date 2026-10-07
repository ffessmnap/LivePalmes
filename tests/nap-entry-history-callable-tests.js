"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../functions/index"), "utf8");
const start = source.indexOf("exports.getEngagementClubEntryTimeHistory ="), end = source.indexOf("async function previewNativeClubEntryTimes(", start);
assert.ok(start > 0 && end > start);
let mode = "manual", allowed = true, calls = 0;
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const dossier = { inscriptions: [{ id: 9, nageur: 1 }, { id: 10, nageur: 2 }],
  individual: [{ engagement: 9, course: "100SF" }, { engagement: 9, course: "200SF" }, { engagement: 10, course: "50SF" }] };
const context = { exports: {}, ENVIRONMENT: { projectId: "livepalmes-test" }, CALLABLE_OPTIONS: {},
  defineSecret: value => value, onCall: (options, fn) => Object.assign(fn, { options }), HttpsError,
  process: { env: { LIVEPALMES_NAP_PASSWORD: "test-placeholder" } },
  cleanText: value => String(value ?? "").trim(), cleanEngagementMissingEntryTimeMode: value => value || "manual",
  ENGAGEMENT_EVENT_DEFINITION_BY_CODE: new Map(),
  engagementClubAccessContext: async () => { if (!allowed) throw new HttpsError("permission-denied", "Denied"); return { clubId: "106" }; },
  engagementKnownTimeHistory: (rows, course, competition, limit) => { assert.equal(limit, 2000); return rows.filter(row => row.course === course).slice(0, limit); },
  db: { collection: () => { throw new Error("Legacy Firestore path"); } },
  require: name => {
    if (name === "./nap-portal-swimmers") return { portalPool: () => ({}) };
    if (name === "./nap-portal-workspaces") return { competitionItem: () => ({ missingEntryTimeMode: mode }) };
    if (name === "./nap-entry-time-preview") return { previewNativeTimes: async (pool, input, services) => {
      calls++; assert.equal(input.enrolledOnly, true); assert.equal(input.clubId, "106");
      await services.authorize({ clubId: "106" });
      return { swimmers: [{ individualEntries: services.preview({ id: 1 }, [{ course: "100SF", time: "14200" }], {}, dossier) }], sqlBudget: { queriesMax: 23 } };
    } };
    throw new Error("Unexpected dependency");
  } };
vm.createContext(context); vm.runInContext(source.slice(start, end), context);
(async () => {
  const request = { data: { competitionId: "5140", swimmerIndexId: "1", eventCodes: ["100SF", "50SF"] } };
  const result = await context.exports.getEngagementClubEntryTimeHistory(request);
  assert.equal(result.source, "nap"); assert.equal(result.events.length, 1);
  assert.equal(result.events[0].eventCode, "100SF"); assert.equal(result.events[0].times[0].time, "14200");
  assert.equal(result.sqlBudget.queriesMax, 23);
  assert.equal(context.exports.getEngagementClubEntryTimeHistory.options.secrets[0], "LIVEPALMES_NAP_PASSWORD");
  mode = "default595999"; assert.equal((await context.exports.getEngagementClubEntryTimeHistory(request)).events.length,1);
  mode = "forbidden"; await assert.rejects(() => context.exports.getEngagementClubEntryTimeHistory(request), /pas autorisee/);
  allowed = false; const before = calls;
  await assert.rejects(() => context.exports.getEngagementClubEntryTimeHistory(request), /Denied/); assert.equal(calls, before);
  allowed = true; context.ENVIRONMENT.projectId = "livepalmes";
  await assert.rejects(() => context.exports.getEngagementClubEntryTimeHistory(request), /Legacy Firestore path/);
  console.log("Native history callable checks authenticated club, enrolled swimmer, saved courses and manual mode without legacy reads");
})().catch(error => { console.error(error); process.exitCode = 1; });
