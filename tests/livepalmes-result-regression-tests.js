const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global;

require(path.join(__dirname, "..", "assets", "livepalmes-time.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-people.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-result-parser.js"));

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

function assertParsedRow(line, expected) {
  const row = parser.parseResultRow(line, parserOptions);
  assert.ok(row, `Ligne non lue : ${line}`);
  Object.entries(expected).forEach(([key, value]) => {
    assert.equal(row[key], value, `${key} incorrect pour : ${line}`);
  });
  return row;
}

function testFinalTimeWinsAfterIntermediateTimes() {
  assertParsedRow("1 FOURTON BELLINI Kalliste 07 SEN * PAN 01:10.12 03:31.66 07:20.81 14:05.23", {
    displayName: "FOURTON BELLINI Kalliste",
    time: "14:05.23"
  });
  assertParsedRow("1 GUILLE Lola 06 SEN * UEP 18.42 38.52 (en finale) 38.52", {
    displayName: "GUILLE Lola",
    time: "38.52",
    qualified: true
  });
  assertParsedRow("8 BADOR Chloe 10 JUN * SASNAP 18.60 (en finale) 40.28 RF", {
    displayName: "BADOR Chloe",
    time: "40.28",
    qualified: true
  });
}

function testPartialLongRaceWithoutRankKeepsSwimmerTime() {
  const rows = [
    parser.parseUnrankedResultRow("TREMBLY Yaille 11 MV 04:32.11 09:01.24 17:57.21", parserOptions),
    parser.parseUnrankedResultRow("DURAND Emma 11 CPBR 04:05.28 08:12.71 16:15.81", parserOptions),
    parser.parseUnrankedResultRow("MERCIE Adele 12 CPBR 04:40.12 09:19.84 18:36.65", parserOptions)
  ];
  assert.deepEqual(rows.map((row) => row?.time), ["17:57.21", "16:15.81", "18:36.65"]);
  assert.deepEqual(rows.map((row) => row?.rank), ["", "", ""]);
}

function testFinalistsSplitOnlyWhenSixteenQualifiedRowsExist() {
  const finalLines = Array.from({ length: 16 }, (_, index) => {
    const rank = index + 1;
    return `${rank} NAGEUR${rank} Test 0${rank % 10} SEN * CLUB 20.${String(rank).padStart(2, "0")} (en finale) 40.${String(rank).padStart(2, "0")}`;
  });
  const parsedWithFinalB = parser.parseFinalistsFromResultLines(finalLines, parserOptions);
  assert.equal(parsedWithFinalB.finalists.a.length, 8);
  assert.equal(parsedWithFinalB.finalists.b.length, 8);
  assert.equal(parsedWithFinalB.finalists.b[0].rank, 9);

  const parsedWithoutFinalB = parser.parseFinalistsFromResultLines(finalLines.slice(0, 8), parserOptions);
  assert.equal(parsedWithoutFinalB.finalists.a.length, 8);
  assert.equal(parsedWithoutFinalB.finalists.b.length, 0);
}

function testNsAndInMarkersDoNotPolluteNamesOrCreateDuplicates() {
  const parsed = parser.parseFinalistsFromResultLines([
    "IN 4 DOUYERE Manon 09 JUN * CLUB 19.10 (en finale) 40.28",
    "2 PINO ALAMOS Pilar 95 SEN * CSAKB 14:13.70",
    "14 NS 2 PINO ALAMOS Pilar 95 SEN * CSAKB",
    "3 CORTES SUAREZ Juana Andrea 98 SEN * CSAKB 14:37.88",
    "15 NS 3 CORTES SUAREZ Juana Andrea 98 SEN * CSAKB"
  ], parserOptions);

  assert.equal(parsed.ranking.length, 3);
  assert.equal(parsed.ranking[0].displayName, "PINO ALAMOS Pilar");
  assert.equal(parsed.ranking[1].displayName, "CORTES SUAREZ Juana Andrea");
  assert.equal(parsed.ranking[2].displayName, "DOUYERE Manon");
  assert.equal(parsed.ranking.some((row) => /\bIN\b|\bNS\b/.test(row.displayName)), false);
}

function testStatusesBecomePerformancesOnlyFromParsedResultRows() {
  const parsed = parser.parseFinalistsFromResultLines([
    "1 GUILLE Lola 06 SEN * UEP 40.62",
    "8 HAMON Maiwenn 08 JUN * CLUB DSQ",
    "9 MARTIN Jade 11 CAD * CLUB abandon",
    "10 LEFEBVRE Zoe 10 JUN * CLUB forfait"
  ], parserOptions);

  const performances = parser.resultPerformanceRows(parsed.ranking, {
    eventLabel: "100 m immersion",
    phaseLabel: "Finales",
    programKey: "4-100is-F-finales",
    stage: "finales",
    updatedAt: "2026-05-28T10:00:00.000Z"
  }, {
    eventId: "100is",
    finalStageCount: 2,
    session: "4",
    sex: "F",
    stage: "finales"
  }, {
    isFinalStage: (stage) => String(stage || "").includes("final"),
    normalizePersonName: people.normalizePersonName
  });

  assert.deepEqual(performances.map((row) => row.statusLabel), ["", "DSQ", "ABD", "Forfait"]);
  assert.equal(performances.find((row) => row.displayName === "HAMON Maiwenn")?.stage, "finale-a");
}

function testFinalPerformanceStagesUseRankAThenB() {
  const parsedRows = [
    { rank: 1, lastName: "GUILLE", firstName: "Lola", birthYear: "2006", club: "UEP", time: "40.62" },
    { rank: 8, lastName: "BADOR", firstName: "Chloe", birthYear: "2010", club: "SASNAP", time: "41.10" },
    { rank: 9, lastName: "ANDRE", firstName: "Camille", birthYear: "2009", club: "CLUB", time: "41.20" },
    { rank: 16, lastName: "MARTIN", firstName: "Jade", birthYear: "2011", club: "CLUB", time: "42.10" }
  ];
  const performances = parser.resultPerformanceRows(parsedRows, {
    eventLabel: "50 m apnee",
    phaseLabel: "Finales",
    programKey: "2-50ap-F-finales",
    stage: "finales",
    updatedAt: "2026-05-28T10:00:00.000Z"
  }, {
    eventId: "50ap",
    finalStageCount: 2,
    session: "2",
    sex: "F",
    stage: "finales"
  }, {
    isFinalStage: (stage) => String(stage || "").includes("final"),
    normalizePersonName: people.normalizePersonName
  });

  assert.deepEqual(performances.map((row) => row.stage), ["finale-a", "finale-a", "finale-b", "finale-b"]);
}

function testRelaysAreIgnoredForSwimmerPerformances() {
  const performances = parser.resultPerformanceRows([
    { rank: 1, lastName: "RELAIS", firstName: "Equipe", birthYear: "2000", club: "CLUB", time: "03:20.00" }
  ], {
    eventLabel: "4x100 m SB",
    phaseLabel: "Series",
    programKey: "1-4x100-M-series",
    stage: "series"
  }, {
    eventId: "4x100",
    session: "1",
    sex: "M",
    stage: "series"
  }, parserOptions);

  assert.equal(performances.length, 0);
}

function testRereadPreservesAnnouncedFinalistsOnlyWhenNeeded() {
  assert.equal(parser.shouldPreserveFinalistsOnReread({
    hasFinal: true,
    finalistsAnnouncedAt: "2026-05-28T10:00:00.000Z"
  }), true);
  assert.equal(parser.shouldPreserveFinalistsOnReread({
    hasFinal: true,
    finalists: { a: [{ withdrawnAt: "2026-05-28T10:00:00.000Z" }], b: [] }
  }), true);
  assert.equal(parser.shouldPreserveFinalistsOnReread({
    hasFinal: true,
    finalists: { a: [], b: [] }
  }), false);
}

[
  testFinalTimeWinsAfterIntermediateTimes,
  testPartialLongRaceWithoutRankKeepsSwimmerTime,
  testFinalistsSplitOnlyWhenSixteenQualifiedRowsExist,
  testNsAndInMarkersDoNotPolluteNamesOrCreateDuplicates,
  testStatusesBecomePerformancesOnlyFromParsedResultRows,
  testFinalPerformanceStagesUseRankAThenB,
  testRelaysAreIgnoredForSwimmerPerformances,
  testRereadPreservesAnnouncedFinalistsOnlyWhenNeeded
].forEach((test) => test());

console.log("LivePalmes result regression tests OK");
