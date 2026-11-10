"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { readClubsByIds } = require("../functions/nap-clubs-by-ids");
const { createAccessService } = require("../functions/server-access-service");
const { createCompetitionStatistics } = require("../functions/engagement-competition-statistics");
const { portalModule, deferred } = require("./helpers/portal-module-runtime");
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const cleanText = value => String(value ?? "").trim();

async function main() {
  let queries = 0, answer = [{ num_club: 10, abre_club: "NAP", nom_club: "Club actuel", comite_club: 23 }];
  const pool = { execute: async options => {
    queries++;
    assert.match(options.sql, /FORCE INDEX \(PRIMARY\) WHERE num_club IN \(\?\).*LIMIT 501/);
    assert.deepEqual(options.values, [10]);
    assert.equal(options.timeout, 10000);
    return [answer];
  } };
  assert.equal((await readClubsByIds(pool, ["10", "10"])).get("10").clubName, "Club actuel");
  assert.equal(queries, 1);
  assert.equal((await readClubsByIds(pool, [])).size, 0); assert.equal(queries, 1);
  for (const input of [["club-old"], Array.from({ length: 501 }, (_, i) => String(i + 1))]) {
    await assert.rejects(() => readClubsByIds(pool, input));
  }
  assert.equal(queries, 1, "Invalid or excessive requests fail before SQL");
  answer = [{ num_club: 20 }]; await assert.rejects(() => readClubsByIds(pool, ["10"]), /incohérente/);
  answer = []; assert.equal((await readClubsByIds(pool, ["10"])).size, 0);

  let batches = 0, unavailable = false;
  const context = { cleanText, HttpsError, CLUB_REFERENCE_REGION_LABELS: { 1: "Région A", 12: "Corse" },
    readNapClubsByIds: async ids => {
      batches++; assert.deepEqual(ids, ["10"]);
      if (unavailable) throw Error("private connection details");
      return new Map([["10", { clubId: "10", clubCode: "NAP", clubName: "Club actuel", regionId: "12" }]]);
    },
    get CLUB_REFERENCE_BY_ID() { throw Error("Retired reference must never be read"); }
  };
  const access = createAccessService(context);
  assert.equal(access.engagementClubCode("10", "NAP"), "NAP");
  assert.equal(access.engagementClubName("10", "Club actuel"), "Club actuel");
  const assigned = { clubId: "10", regionId: "1", accessScopes: { "engagements.region.manage": { scopeType: "region", scopeId: "12" } } };
  const profiles = await access.resolveAccessUserClubRegions([assigned, { clubId: "10" }, { clubId: "10" }, null]);
  assert.equal(batches, 1, "Several accounts of one club use one grouped lookup");
  assert.equal(profiles[0], assigned); assert.equal(access.accessUserRegionIdFromData(profiles[0]), "Corse");
  assert.equal(access.accessUserRegionIdFromData(profiles[1]), "Corse"); assert.equal(profiles[3], null);
  assert.equal(Object.hasOwn(assigned, "napClubRegionId"), false, "No account mutation");
  await access.resolveAccessUserClubRegions([assigned]); assert.equal(batches, 1, "Assigned scopes need no NAP lookup");
  const [opaque] = await access.resolveAccessUserClubRegions([{ clubId: "club-old-opaque" }]);
  assert.equal(access.accessUserRegionIdFromData(opaque), ""); assert.equal(batches, 1, "Unknown opaque IDs cannot guess a native club or block unrelated profiles");
  unavailable = true;
  await assert.rejects(() => access.resolveAccessUserClubRegions([{ clubId: "10" }]), error => error.code === "unavailable" && !error.message.includes("private"));
  unavailable = false;
  assert.equal((await access.resolveAccessUserClubRegions([{ clubId: "10" }]))[0].napClubRegionId, "12");

  let projectionWrites = 0;
  const snapshotRebuild = require("../functions/backend/portal-access-handlers/rebuild-access-directory-snapshot-next-page")
    .createAccessHandlers_rebuildAccessDirectorySnapshotNextPage({
      accessManagementContext: async () => ({ national: true }), HttpsError, cleanText,
      accessDirectorySnapshotStateRef: () => ({ get: async () => ({ exists: true, data: () => ({ status: "ready" }) }) }),
      ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION: "snapshots", FieldPath: { documentId: () => "id" },
      db: { batch: () => ({ set() {}, delete() {}, commit: async () => { projectionWrites++; } }), collection: name => ({
        limit: () => ({ get: async () => ({ docs: [], size: 0 }) }),
        orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [{ data: () => ({ clubId: "10" }) }] }) }) })
      }) },
      resolveAccessUserClubRegions: async () => { throw new HttpsError("unavailable", "NAP unavailable"); }
    });
  await assert.rejects(() => snapshotRebuild.rebuildAccessDirectorySnapshotNextPage({ data: { restart: true } }), error => error.code === "unavailable");
  assert.equal(projectionWrites, 0, "A native outage cannot clear a previously built access directory");

  const statistics = createCompetitionStatistics({ cleanText, engagementClubCode: access.engagementClubCode,
    engagementClubName: access.engagementClubName, ageCategoryFromDates: () => "S", normalizeCourseCode: x => x,
    engagementClubEntryHasParticipants: () => true, engagementPdfEventLabel: x => x
  }).engagementCompetitionStatisticsItem([{ clubId: "10", clubCode: "NAP", clubName: "Club actuel", swimmers: [
    { firstName: "Alice", lastName: "Fictive", sex: "F", individualEntries: [{ eventCode: "50SF", entryTime: "25.00", entryTimeValue: 2500 }] }
  ], relays: [{ eventCode: "4X50SF", members: [{ firstName: "Alice", lastName: "Fictive" }] }] }]);
  assert.equal(statistics.clubs[0].clubName, "Club actuel");
  for (const event of statistics.events) assert.equal(event.rows[0].clubCode, "NAP");
  assert.equal(statistics.events[0].rows[0].firstName, "Alice");
  assert.equal(statistics.events[0].rows[0].entryTimeValue, 2500);

  const state = { accessClubReference: [], accessClubReferenceById: new Map(), portalClubCodeReferenceById: new Map() };
  const wait = deferred(); let calls = 0;
  const actions = { callFunction: async name => { calls++; assert.equal(name, "getPublicEngagementClubDirectory"); return wait.promise; }, setAccessMessage() {}, setPublicAccessRequestMessage() {} };
  const module = portalModule("modules-and-clubs.js", "LivePalmesPortalModulesAndClubs", { state, actions, config: { LIVEPALMES_REGION_DEFINITIONS: [], LIVEPALMES_REFERENCE_REGION_LABELS: { 12: "Corse" } }, elements: {} });
  const first = module.loadPortalClubCodeReference(), second = module.loadAccessClubReference();
  assert.equal(calls, 1, "Banner and selectors share the same in-flight native directory");
  wait.resolve({ source: "nap", clubs: [{ clubId: "10", clubCode: "NAP", clubName: "Club actuel", regionId: "12" }] });
  await Promise.all([first, second]);
  assert.equal(module.clubDisplayCode({ clubId: "10" }), "NAP");
  assert.equal(module.clubDisplayCode({ clubId: "10", clubCode: "FRESH" }), "FRESH", "Fresh operation data wins over an earlier directory read");
  await module.loadPortalClubCodeReference(); assert.equal(calls, 1);

  const recoveringState = { accessClubReference: [], accessClubReferenceById: new Map(), portalClubCodeReferenceById: new Map() };
  let failed = true, recoveryCalls = 0;
  const recovering = portalModule("modules-and-clubs.js", "LivePalmesPortalModulesAndClubs", {
    state: recoveringState, config: { LIVEPALMES_REGION_DEFINITIONS: [], LIVEPALMES_REFERENCE_REGION_LABELS: {} }, elements: {},
    actions: { ...actions, callFunction: async () => {
      recoveryCalls++;
      if (failed) throw Error("NAP unavailable");
      return { source: "nap", clubs: [{ clubId: "10", clubCode: "CURRENT", clubName: "Club actuel" }] };
    } }
  }, { window: { LIVEPALMES_CLUB_REFERENCE: { clubs: [["10", "OBSOLETE", "Ancien club"]] } } });
  assert.equal((await recovering.loadPortalClubCodeReference()).size, 0, "A NAP outage cannot revive an old global reference");
  assert.equal(recoveringState.accessClubReferenceLoadPromise, null);
  failed = false;
  assert.equal((await recovering.loadPortalClubCodeReference()).get("10").clubCode, "CURRENT");
  assert.equal(recoveryCalls, 2, "Manual retry works after the native directory recovers");

  const records = fs.readFileSync(require.resolve("../performances/public/admin-records.js"), "utf8");
  const method = records.slice(records.indexOf("function clubIdForCode("), records.indexOf("function uniqueBirthDate("));
  const sandbox = { reference: { clubs: [["10", "SAME"], ["20", "SAME"], ["30", "ONLY"]] }, normalizeLookup: cleanText };
  vm.createContext(sandbox); vm.runInContext(method, sandbox);
  assert.equal(sandbox.clubIdForCode("SAME"), "", "An abbreviation cannot choose between distinct clubs");
  assert.equal(sandbox.clubIdForCode("ONLY"), "30");
  console.log("NAP club sources: grouped bounded SQL, assigned scopes, native statistics, shared directory, outage/recovery and ambiguous codes verified offline.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
