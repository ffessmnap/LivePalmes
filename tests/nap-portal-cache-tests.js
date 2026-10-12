"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"), "utf8");
const storage = new Map();
const context = { engagementCompetitionCalendarMemoryCache: new Map(), ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX: "calendar.",
  global: { sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) } },
  engagementTeamLeadersWhatsAppUrl: value => value || "", engagementCompetitionType: item => item.competitionType || "pool" };
vm.createContext(context);
for (const [name, next] of [["engagementCalendarCacheCompetition", "readEngagementCalendarCache"], ["readEngagementCalendarCache", "writeEngagementCalendarCache"], ["writeEngagementCalendarCache", "activateEngagementCalendarCache"]]) {
  const start = source.indexOf(`  function ${name}(`);
  vm.runInContext(source.slice(start, source.indexOf(`  function ${next}(`, start)), context);
}
const item = { id: "legacy-nap-5140", napSource: true, nativeReadOnly: true, legacyCompetitionId: "5140", competitionType: "pool" };
context.writeEngagementCalendarCache("club", [item], 100, "nap");
context.engagementCompetitionCalendarMemoryCache.clear();
const restored = context.readEngagementCalendarCache("club");
assert.equal(restored.source, "nap");
assert.equal(restored.competitions[0].napSource, true);
assert.equal(restored.competitions[0].nativeReadOnly, true);
assert.equal(restored.competitions[0].legacyCompetitionId, "5140");
context.writeEngagementCalendarCache("empty", [], 100, "nap");
context.engagementCompetitionCalendarMemoryCache.clear();
assert.equal(context.readEngagementCalendarCache("empty").source, "nap", "Empty native calendar also requires a fresh read");
storage.set("calendar.old", JSON.stringify({ version: 2, competitions: [{ id: "obsolete" }], cachedAt: 100 }));
assert.equal(context.readEngagementCalendarCache("old"), null, "Pre-cutover sports calendar must not delay the first native read");
console.log("NAP portal cache: native source, read-only status, empty calendars and obsolete-cache invalidation verified");

// Native event types must survive both display and the session calendar cache.
vm.runInContext(source.slice(source.indexOf("  function engagementCompetitionType("), source.indexOf("  function engagementCompetitionTypeLabel(")), context);
for (const type of ["pool", "openWater", "training", "stage", "meeting", "other"]) {
  const native = { ...item, eventType: type, competitionType: type };
  assert.equal(context.engagementCompetitionType(native), type);
  context.writeEngagementCalendarCache(type, [native], 100, "nap");
  context.engagementCompetitionCalendarMemoryCache.clear();
  assert.equal(context.engagementCompetitionType(context.readEngagementCalendarCache(type).competitions[0]), type);
}
assert.equal(context.engagementCompetitionType({ ...item, eventType: "training", competitionType: "pool" }), "training", "Native eventType repairs the display of an older cached pool label");
assert.equal(context.engagementCompetitionType({ competitionType: "pool" }), "pool");
assert.equal(context.engagementCompetitionType({ sourceType: "calendarEvent", eventType: "meeting" }), "meeting");

// A stalled read must terminate visibly; normal responses/errors remain intact.
const detail = source.slice(source.indexOf("  async function loadEngagementCompetitionDetail("), source.indexOf("  async function saveEngagementClubTeamLeader("));
assert.ok(detail.includes('callFunctionWithTimeout("getEngagementClubEntry", { competitionId: cleanId })'));
assert.ok(detail.includes('setEngagementClubEntryLoadingState(clubMode && !cachedWorkspace ? "error" : "")'));
let timer;
let cleared = 0;
let read = () => Promise.resolve({ entry: { id: "saved" } });
const timeoutContext = { callFunction: (...args) => read(...args), setTimeout: (callback, delay) => { assert.equal(delay, 30000); timer = callback; return 1; }, clearTimeout: () => { cleared++; } };
vm.createContext(timeoutContext);
vm.runInContext(source.slice(source.indexOf("  async function callFunctionWithTimeout("), source.indexOf("  function downloadBase64File(")), timeoutContext);
(async () => {
  assert.equal((await timeoutContext.callFunctionWithTimeout("getEngagementClubEntry", {})).entry.id, "saved");
  read = () => Promise.reject(new Error("Lecture indisponible"));
  await assert.rejects(timeoutContext.callFunctionWithTimeout("getEngagementClubEntry", {}), /Lecture indisponible/);
  read = () => new Promise(() => {});
  const stalled = timeoutContext.callFunctionWithTimeout("getEngagementClubEntry", {});
  timer();
  await assert.rejects(stalled, /Délai de lecture dépassé/);
  assert.equal(cleared, 3, "Timers are released for success, failure and timeout");
  console.log("Portal recipe: native event labels/cache and bounded engagement reads verified offline");
})().catch(error => { console.error(error); process.exitCode = 1; });
