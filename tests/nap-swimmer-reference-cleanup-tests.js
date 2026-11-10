"use strict";
require("./helpers/offline-network");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const cleanText = value => String(value ?? "").trim();
const retired = error => error.code === "failed-precondition" && /retire/.test(error.message);

async function main() {
  for (const file of ["functions/assets/intranap-swimmers-index.json", "functions/intranap-swimmers-reference.json"]) {
    assert.equal(fs.existsSync(file), false, "Retired private copy cannot return: " + file);
  }
  function inspect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (entry.name.endsWith(".js")) assert.doesNotMatch(fs.readFileSync(file, "utf8"),
        /\bintranapSwimmers(?:Index|Reference)\b|\bintranapSwimmerLookup\b|buildIntranapSwimmerReference/,
        "Runtime still depends on an old swimmer snapshot: " + file);
    }
  }
  inspect("functions");

  const readers = require("../functions/nap-portal-swimmer-readers");
  let queries = 0;
  const pool = { execute: async (options, values) => {
    queries++;
    assert.match(options.sql, /FORCE INDEX \(PRIMARY\)/);
    assert.match(options.sql, /WHERE n.id>\? ORDER BY n.id LIMIT 101/);
    assert.equal(options.timeout, 10000);
    assert.deepEqual(values, [0]);
    return [Array.from({ length: 101 }, (_, index) => ({ id: index + 1, nom: "FICTIF", prenom: "Alice-Marie",
      date: "2000-02-03", sexe: "F", club: "10", number: "A-12-34567", nom_club: "Club NAP actuel", abre_club: "NAP" }))];
  } };
  const result = await readers.listNationalSwimmers(pool, {});
  assert.equal(queries, 1, "One grouped native page, no per-row query");
  assert.equal(result.source, "nap"); assert.equal(result.swimmers.length, 100);
  assert.equal(result.hasMore, true); assert.equal(result.nextCursor, 100);
  const swimmer = result.swimmers[0];
  assert.equal(swimmer.firstName, "Alice-Marie"); assert.equal(swimmer.lastName, "FICTIF");
  assert.equal(swimmer.clubName, "Club NAP actuel"); assert.equal(swimmer.club, "NAP");
  assert.equal(swimmer.napSource, true);
  assert.equal(swimmer.source, "reference", "Existing native UI protocol marker is preserved; it does not mean a JSON source");
  await assert.rejects(() => readers.listPortalClubSwimmers({ execute: async options => {
    assert.match(options.sql, /FORCE INDEX \(livepalmes_club_id\)/);
    assert.match(options.sql, /LIMIT 801/);
    return [Array.from({ length: 801 }, (_, id) => ({ id: id + 1 }))];
  } }, "10"), /800/);
  await assert.rejects(() => readers.listNationalSwimmers({ execute: async () => { throw Error("offline"); } }, {}), /offline/);

  const { createClubHandlers_previewEngagementClubSwimmerEventTimes } = require("../functions/backend/portal-club-handlers/preview-engagement-club-swimmer-event-times");
  let nativeCalls = 0;
  const context = { cleanText, HttpsError, ENVIRONMENT: { sportingDataSource: "nap" },
    engagementClubAccessContext: async () => ({ clubId: "10", uid: "synthetic" }),
    previewNativeClubEntryTimes: async (actor, competition, ids) => {
      nativeCalls++; assert.equal(actor.clubId, "10"); assert.equal(competition, "20"); assert.deepEqual(ids, ["1"]);
      return { source: "nap", swimmers: [{ individualEntries: [{ eventCode: "50SF", entryTime: "25.00" }] }] };
    }, get db() { throw Error("Legacy reads forbidden"); }
  };
  const request = { data: { competitionId: "20", swimmerIndexId: "1", source: "reference" } };
  const preview = createClubHandlers_previewEngagementClubSwimmerEventTimes(context);
  assert.equal((await preview.previewEngagementClubSwimmerEventTimes(request)).source, "nap");
  assert.equal(nativeCalls, 1, "The existing reference marker routes directly to NAP");
  context.ENVIRONMENT.sportingDataSource = "firestore";
  await assert.rejects(() => preview.previewEngagementClubSwimmerEventTimes(request), retired);

  const selection = require("../functions/backend/server-entry-service/build-engagement-club-swimmers-from-request")
    .createEntryService_buildEngagementClubSwimmersFromRequest({ cleanText, HttpsError,
      cleanEngagementCompetitionType: () => "pool", cleanEngagementCompetitionEvents: () => [],
      cleanIsoDate: cleanText, cleanEngagementPoolLength: cleanText, cleanEngagementTimingType: cleanText,
      cleanEngagementQualificationTimesMode: cleanText, cleanEngagementMissingEntryTimeMode: cleanText,
      cleanEngagementMaxEventsPerSwimmer: () => 0,
      get db() { throw Error("Retired reference must fail before a read"); }
    });
  await assert.rejects(() => selection.buildEngagementClubSwimmersFromRequest({ swimmers: [{ swimmerIndexId: "1", source: "reference" }] }), retired);

  const oldResolver = require("../functions/backend/server-import-service/resolve-intranap-swimmer")
    .createImportService_resolveIntranapSwimmer({ HttpsError });
  assert.throws(() => oldResolver.resolveIntranapSwimmer({ swimmerId: "1" }, "F"), retired);
  const oldImport = require("../functions/backend/portal-performance-handlers/create-competition-import")
    .createPerformanceHandlers_createCompetitionImport({ HttpsError, ENVIRONMENT: { sportingDataSource: "firestore" }, assertCapability() {},
      get db() { throw Error("Retired import must fail before writing"); },
      parseCompetitionImportPayload() { throw Error("Retired import must fail before parsing"); }
    });
  await assert.rejects(() => oldImport.createCompetitionImport({ data: {} }), retired);
  for (const [file, factory, method] of [
    ["preview-engagement-club-swimmer-creation", "createClubHandlers_previewEngagementClubSwimmerCreation", "previewEngagementClubSwimmerCreation"],
    ["create-engagement-club-swimmer", "createClubHandlers_createEngagementClubSwimmer", "createEngagementClubSwimmer"]
  ]) {
    const obsolete = require("../functions/backend/portal-club-handlers/" + file)[factory]({ HttpsError,
      ENVIRONMENT: { sportingDataSource: "firestore" }, engagementClubAccessContext: async () => ({ clubId: "10" }),
      get db() { throw Error("Retired creation must fail before writing"); },
      cleanEngagementNewSwimmer() { throw Error("Retired creation must fail before processing"); }
    });
    await assert.rejects(() => obsolete[method]({ data: {} }), retired);
  }

  for (const file of ["export-engagement-license-lookup.js", "import-engagement-swimmer-licenses.js", "resolve-engagement-license-placeholders.js"]) {
    const run = spawnSync(process.execPath, [path.join("tools", file), "--apply", "--write", "--project", "livepalmes", "--input", "must-not-open.csv"],
      { encoding: "utf8", timeout: 5000 });
    assert.equal(run.status, 1, file); assert.match(run.stderr, /retire/);
    assert.doesNotMatch(run.stderr, /ENOENT|Firebase|credentials|Cannot find module|Connexion/);
  }
  console.log("Swimmer JSON retirement: direct native pages/identity fields/budgets, reference marker compatibility, fail-closed legacy paths and disabled license tools verified offline.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
