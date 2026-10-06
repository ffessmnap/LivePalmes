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
