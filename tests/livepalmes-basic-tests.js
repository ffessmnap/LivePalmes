const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global;

require(path.join(__dirname, "..", "assets", "livepalmes-time.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-people.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-result-parser.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-results.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-results-admin-program.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-results-admin-workflow.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-speaker-info.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-history-view.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-history-presenter.js"));

const parser = global.LivePalmesResultParser;
const time = global.LivePalmesTime;
const people = global.LivePalmesPeople;
const speakerInfo = global.LivePalmesSpeakerInfo;
const historyPresenter = global.LivePalmesHistoryPresenter;

function splitImportedPersonName(value) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  return {
    lastName: parts.shift() || "",
    firstName: parts.join(" ")
  };
}

const parserOptions = {
  formatDisplayName: (row) => [row.lastName, row.firstName].filter(Boolean).join(" "),
  importedBirthYear: (value) => `20${String(value || "").padStart(2, "0")}`,
  importedSeriesTime: time.importedSeriesTime,
  normalizePersonName: people.normalizePersonName,
  splitImportedPersonName
};

function testTimeHelpers() {
  assert.equal(time.timeToMs("01:02.34"), 62340);
  assert.equal(time.importedSeriesTime("1:02:34"), "1:02.34");
  assert.equal(time.importedSeriesTime("38.52"), "38.52");
}

function testPersonHelpers() {
  assert.equal(people.normalizePersonName("Chloe Bador"), people.normalizePersonName("BADOR Chloe"));
  assert.equal(people.formatRank(1), "1er");
  assert.equal(people.formatRank(8), "8e");
}

function testResultParserKeepsFinalTimeAfterFinalMarker() {
  const row = parser.parseResultRow(
    "1 GUILLE Lola 06 SEN * UEP 18.42 38.52 (en finale) 38.52",
    parserOptions
  );
  assert.equal(row.displayName, "GUILLE Lola");
  assert.equal(row.time, "38.52");
  assert.equal(row.qualified, true);
}

function testResultParserIgnoresInNsPrefix() {
  const row = parser.parseResultRow(
    "IN 4 DOUYERE Manon 09 JUN * CLUB 19.10 (en finale) 40.28",
    parserOptions
  );
  assert.equal(row.rank, 4);
  assert.equal(row.displayName, "DOUYERE Manon");
  assert.equal(row.time, "40.28");
}

function testResultParserKeepsTimeBeforeRecordMarker() {
  const row = parser.parseResultRow(
    "8 BADOR Chloe 10 JUN * SASNAP 18.60 (en finale) 40.28 RF",
    parserOptions
  );
  assert.equal(row.rank, 8);
  assert.equal(row.displayName, "BADOR Chloe");
  assert.equal(row.time, "40.28");
  assert.equal(row.qualified, true);
}

function testStatusRows() {
  const dsq = parser.parseResultStatusRow("4 MARTIN Jade 11 CAD * CLUB disqualifiee", parserOptions);
  assert.equal(dsq.resultStatus, "dsq");
  assert.equal(dsq.statusLabel, "DSQ");

  const abd = parser.parseResultStatusRow("5 DURAND Emma 11 CAD * CLUB abandon", parserOptions);
  assert.equal(abd.resultStatus, "ab");
  assert.equal(abd.statusLabel, "ABD");

  const nonSelectable = parser.parseResultStatusRow("14 NS 2 PINO ALAMOS Pilar 95 CSAKB non selectionnable", parserOptions);
  assert.equal(nonSelectable, null);
}

function testIntermediateTimesKeepFinalTime() {
  const row = parser.parseResultRow(
    "1 FOURTON BELLINI Kalliste 07 SEN * PAN 01:10.12 03:31.66 07:20.81 14:05.23",
    parserOptions
  );
  assert.equal(row.displayName, "FOURTON BELLINI Kalliste");
  assert.equal(row.time, "14:05.23");
}

function testPartialUnrankedResultKeepsTime() {
  const row = parser.parseUnrankedResultRow(
    "TREMBLY Yaelle 11 MV 04:32.11 09:01.24 17:57.21",
    parserOptions
  );
  assert.equal(row.rank, "");
  assert.equal(row.displayName, "TREMBLY Yaelle");
  assert.equal(row.time, "17:57.21");
}

function testFinalistsAreSplitBetweenAAndB() {
  const lines = Array.from({ length: 18 }, (_, index) => {
    const rank = index + 1;
    const finalMarker = rank <= 16 ? " (en finale)" : "";
    return `${rank} NAGEUR${rank} Test 0${rank % 10} SEN * CLUB 20.${String(rank).padStart(2, "0")}${finalMarker} 40.${String(rank).padStart(2, "0")}`;
  });
  const parsed = parser.parseFinalistsFromResultLines(lines, parserOptions);
  assert.equal(parsed.finalists.a.length, 8);
  assert.equal(parsed.finalists.b.length, 8);
  assert.equal(parsed.finalists.a[0].rank, 1);
  assert.equal(parsed.finalists.b[0].rank, 9);
  assert.equal(parsed.nextUnqualified.length, 2);
}

function testNonSelectableRowsDoNotDuplicateRankedResults() {
  const parsed = parser.parseFinalistsFromResultLines([
    "2 PINO ALAMOS Pilar 95 SEN * CSAKB 14:13.70",
    "14 NS 2 PINO ALAMOS Pilar 95 SEN * CSAKB",
    "3 CORTES SUAREZ Juana Andrea 98 SEN * CSAKB 14:37.88",
    "15 NS 3 CORTES SUAREZ Juana Andrea 98 SEN * CSAKB"
  ], parserOptions);

  assert.equal(parsed.ranking.length, 2);
  assert.equal(parsed.ranking[0].displayName, "PINO ALAMOS Pilar");
  assert.equal(parsed.ranking[1].displayName, "CORTES SUAREZ Juana Andrea");
}

function testFinalPerformanceStageAndStatus() {
  const result = { stage: "finales", phaseLabel: "Finales", programKey: "100is-f-finales", eventLabel: "100 m immersion" };
  const row = { eventId: "100is", sex: "F", session: "4", finalStageCount: 2 };
  const performances = parser.resultPerformanceRows([
    { rank: 1, lastName: "GUILLE", firstName: "Lola", birthYear: "2006", club: "UEP", time: "40.62" },
    { rank: 9, lastName: "ANDRE", firstName: "Camille", birthYear: "2009", club: "CLUB", time: "41.20" },
    { rank: 8, lastName: "HAMON", firstName: "Maiwenn", birthYear: "2008", club: "CLUB", resultStatus: "dsq", statusLabel: "DSQ" }
  ], result, row, {
    isFinalStage: (stage) => String(stage || "").includes("final"),
    normalizePersonName: people.normalizePersonName
  });

  assert.equal(performances[0].stage, "finale-a");
  assert.equal(performances[1].stage, "finale-b");
  assert.equal(performances[2].statusLabel, "DSQ");
}

function testResultParserFallbacksIgnoreInvalidHelpers() {
  const performances = parser.resultPerformanceRows([
    { rank: 1, displayName: "NAGEUR Test", birthYear: "2010", club: "CLUB", time: "40.12" }
  ], { stage: "series", phaseLabel: "Serie", programKey: "50ap-f-series", eventLabel: "50 m apnee" }, { eventId: "50ap", sex: "F" }, {
    normalizePersonName: "not-a-function"
  });

  assert.equal(performances.length, 1);
  assert.equal(performances[0].time, "40.12");
}

function testFinalResultRowMatchesLegacyFinalStage() {
  const context = {
    data: { program: [], events: [], series: [] },
    isFinalStage: (stage) => String(stage || "").startsWith("finale"),
    programKey: (row) => [row.session, row.eventId, row.sex, row.stage].filter(Boolean).join("-"),
    raceOptionKey: (eventId, sex) => `${eventId}-${sex}`,
    raceResults: [{
      id: "result-50ap-h-finale-a",
      raceKey: "50ap-H",
      session: "2",
      stage: "finale-a",
      programKey: "2-50ap-H-finale-a"
    }]
  };

  const result = global.LivePalmesResultsAdminWorkflow.resultForProgramRow({
    eventId: "50ap",
    sex: "H",
    session: "2",
    stage: "finales",
    finalStages: ["finale-b", "finale-a"]
  }, context);

  assert.equal(result?.id, "result-50ap-h-finale-a");
}

function testSpeakerInfoHandlesEmptyEncodedCells() {
  const rows = [
    ["REN", "Meeting 2026", "", "Paris, France"],
    ["NAG", "DURAND", "Emma", "01/01/2010", "F", "CLUB", "", "50sf", "00:40.00", undefined, "", "", "", "", "", undefined]
  ];
  const sources = speakerInfo.parseSeedSourceSheet(rows, {
    fixPdfEncoding: (value) => (typeof value === "undefined" ? undefined : String(value)),
    normalizePersonName: people.normalizePersonName,
    timeToMs: time.timeToMs
  });

  assert.equal(sources.get("50sf|F|durand|emma|2010|F|40000"), "Paris 2026");
  assert.equal(sources.get("50sf|F|durand emma|40000"), "Paris 2026");
}

function testHistoryRebuildsFinalAnnouncementsFromResults() {
  const presenter = historyPresenter.init({
    alerts: [],
    raceResults: [{
      id: "result-50sf-F",
      eventId: "50sf",
      eventLabel: "50 m surface",
      sex: "F",
      sexLabel: "Femmes",
      finalistsAnnouncedAt: "2026-05-24T07:47:31.243Z",
      finalists: {
        a: [{ rank: 1, lastName: "MARTIN", firstName: "Lea", clubCode: "CLUB", time: "20.00" }],
        b: [{ rank: 9, lastName: "DURAND", firstName: "Emma", clubCode: "CLUB", time: "21.00", repechaged: true, repechageAnnouncedAt: "2026-05-24T08:31:36.985Z" }]
      }
    }],
    livePalmesHistoryView: global.LivePalmesHistoryView,
    escapeHtml: (value) => String(value ?? ""),
    isRequalificationAlert: () => false,
    sexDisplayLabel: (sex) => sex
  });
  const rows = presenter.syntheticFinalHistoryRows();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].type, "finalists_announcement");
  assert.equal(rows[0].speakerStatus, "done");
  assert.equal(rows[1].type, "finalist_replacement_announcement");
  assert.equal(rows[1].replacementName, "DURAND Emma");
}

[
  testTimeHelpers,
  testPersonHelpers,
  testResultParserKeepsFinalTimeAfterFinalMarker,
  testResultParserIgnoresInNsPrefix,
  testResultParserKeepsTimeBeforeRecordMarker,
  testStatusRows,
  testIntermediateTimesKeepFinalTime,
  testPartialUnrankedResultKeepsTime,
  testFinalistsAreSplitBetweenAAndB,
  testNonSelectableRowsDoNotDuplicateRankedResults,
  testFinalPerformanceStageAndStatus,
  testResultParserFallbacksIgnoreInvalidHelpers,
  testFinalResultRowMatchesLegacyFinalStage,
  testSpeakerInfoHandlesEmptyEncodedCells,
  testHistoryRebuildsFinalAnnouncementsFromResults
].forEach((test) => test());

console.log("LivePalmes basic tests OK");
