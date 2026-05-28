const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global;

require(path.join(__dirname, "..", "assets", "livepalmes-time.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-people.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-result-parser.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-results-admin-workflow.js"));

const parser = global.LivePalmesResultParser;
const time = global.LivePalmesTime;
const people = global.LivePalmesPeople;

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
  testFinalPerformanceStageAndStatus,
  testResultParserFallbacksIgnoreInvalidHelpers,
  testFinalResultRowMatchesLegacyFinalStage
].forEach((test) => test());

console.log("LivePalmes basic tests OK");
