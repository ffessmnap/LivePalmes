const assert = require("node:assert/strict");
const path = require("node:path");

global.window = global;

require(path.join(__dirname, "..", "assets", "livepalmes-time.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-people.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-result-parser.js"));
require(path.join(__dirname, "..", "assets", "livepalmes-damien-hebert-trophy.js"));

const parser = global.LivePalmesResultParser;
const trophy = global.LivePalmesDamienHebertTrophy;
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

function testPointsAndRecordLabelsAfterTimeAreIgnored() {
  assertParsedRow("1 GUILLE Lola 06 SEN * UEP 18.42 38.52 40.62 742", {
    displayName: "GUILLE Lola",
    time: "40.62",
    points: "742"
  });
  assertParsedRow("8 BADOR Chloe 10 JUN * SASNAP 18.60 (en finale) 40.28 RF 689", {
    displayName: "BADOR Chloe",
    time: "40.28",
    points: "689",
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

function testUnrankedLongRaceKeepsPoints() {
  const row = parser.parseUnrankedResultRow("TREMBLY Yaille 11 MV 04:32.11 09:01.24 17:57.21 512", parserOptions);
  assert.equal(row?.time, "17:57.21");
  assert.equal(row?.points, "512");
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

function testFinalDsqKeepsFinalSlotWithoutShiftingFinalB() {
  const parsedRows = [
    { rank: 7, lastName: "DURAND", firstName: "Emma", displayName: "DURAND Emma", birthYear: "2011", club: "CPBR", time: "41.00" },
    { rank: 8, lastName: "HAMON", firstName: "Maiwenn", displayName: "HAMON Maiwenn", birthYear: "2008", club: "CLUB", resultStatus: "dsq", statusLabel: "DSQ", time: "" },
    { rank: 9, lastName: "ANDRE", firstName: "Camille", displayName: "ANDRE Camille", birthYear: "2009", club: "CLUB", time: "41.20" }
  ];
  const performances = parser.resultPerformanceRows(parsedRows, {
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

  assert.deepEqual(performances.map((row) => `${row.displayName}:${row.stage}:${row.statusLabel || row.time}`), [
    "DURAND Emma:finale-a:41.00",
    "HAMON Maiwenn:finale-a:DSQ",
    "ANDRE Camille:finale-b:41.20"
  ]);
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

function testRelayResultRowsAreParsedForPublicRaceDetails() {
  const parsed = parser.parseFinalistsFromResultLines([
    "4x100 m surface Seniors Hommes",
    "1 PAN SEN * PAN 17.10 34.42 51.90 01:08.25 RF 812",
    "2 CPBR SEN * CPBR 17.88 36.10 54.20 01:11.34",
    "3 UEP SEN * UEP disqualifie"
  ], parserOptions);

  assert.equal(parsed.ranking.length, 3);
  assert.deepEqual(parsed.ranking.map((row) => `${row.rank}:${row.displayName}:${row.club}:${row.time || row.statusLabel}`), [
    "1:PAN:PAN:01:08.25",
    "2:CPBR:CPBR:01:11.34",
    "3:UEP:UEP:DSQ"
  ]);
  assert.equal(parsed.ranking[0].relay, true);
  assert.equal(parsed.ranking[0].points, "812");
  assert.equal(parsed.ranking[0].categoryLabel, "Senior");
}

function testRelayResultRowsReadPlainCategoryBeforeClub() {
  const parsed = parser.parseFinalistsFromResultLines([
    "4x100m SB Minimes Mixte",
    "1 Pays d'Aix Natation XMI PAN 3:53.00 357",
    "2 Club Sportif Gravenchon XMI CSG 3:53.63 355",
    "3 Club Nautique de Houilles Carrières XMI CNHC disqualifie"
  ], parserOptions);

  assert.equal(parsed.ranking.length, 3);
  assert.deepEqual(parsed.ranking.map((row) => `${row.rank}:${row.displayName}:${row.categoryLabel}:${row.club}:${row.time || row.statusLabel}`), [
    "1:Pays d'Aix Natation:Minime Mixte:PAN:03:53.00",
    "2:Club Sportif Gravenchon:Minime Mixte:CSG:03:53.63",
    "3:Club Nautique de Houilles Carrières:Minime Mixte:CNHC:DSQ"
  ]);
  assert.equal(parsed.ranking[0].categoryCode, "XMI");
  assert.equal(parsed.ranking[0].points, "357");
}

function testMasterRelayCategoryComesFromSectionTitleAndLegsAreRead() {
  const parsed = parser.parseFinalistsFromResultLines([
    "4x100m Surface Masters R220 Mixte",
    "1 Groupe Subaquatique Morlaix Plouezoc'h X40+ GSMP 4:01.99 286",
    "MESSAGER Philippe 54 H70+ 1:03.90",
    "QUEAU Corinne 77 F40+ [1:02.90] 2:06.80",
    "LAURENT Ronan 75 H50+ [57.51] 3:04.31",
    "LE GOUARD Dotothee 77 F40+ [57.68]",
    "2 Pays Solesmois Palmes X220 PSP 4:48.89 184",
    "VERNHOLLES Jean-Pierre 64 H60+ 1:03.12",
    "DEDIEU Corinne 56 F70+ [1:35.49] 2:38.61"
  ], parserOptions);

  assert.equal(parsed.ranking.length, 2);
  assert.deepEqual(parsed.ranking.map((row) => `${row.rank}:${row.displayName}:${row.categoryCode}:${row.categoryLabel}:${row.club}:${row.time}`), [
    "1:Groupe Subaquatique Morlaix Plouezoc'h:R220:R220:GSMP:04:01.99",
    "2:Pays Solesmois Palmes:R220:R220:PSP:04:48.89"
  ]);
  assert.deepEqual(parsed.ranking.map((row) => row.sectionCategoryLabel), ["R220", "R220"]);
  assert.deepEqual(parsed.ranking[0].relayLegs.map((leg) => `${leg.order}:${leg.name}:${leg.time}`), [
    "1:MESSAGER P.:01:03.90",
    "2:QUEAU C.:01:02.90",
    "3:LAURENT R.:57.51",
    "4:LE G.:57.68"
  ]);
  assert.deepEqual(parsed.ranking[1].relayLegs.map((leg) => `${leg.order}:${leg.name}:${leg.time}`), [
    "1:VERNHOLLES J.:01:03.12",
    "2:DEDIEU C.:01:35.49"
  ]);
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

function testDamienHebertRankingUsesMinimePoints() {
  const rankings = trophy.provisionalRankings([{
    id: "result-50sf-f",
    eventId: "50sf",
    eventLabel: "50 m surface Minimes Femmes",
    sex: "F",
    ranking: [
      { rank: 1, displayName: "DURAND Emma", birthYear: "2011", club: "CLUB", category: "Minime", time: "20.10", points: "742" },
      { rank: 2, displayName: "MARTIN Lea", birthYear: "2011", club: "CLUB", categoryCode: "FMI", time: "20.40", points: "731" },
      { rank: 3, displayName: "SENIOR Test", birthYear: "2000", club: "CLUB", category: "Senior", time: "20.50", points: "900" }
    ]
  }, {
    id: "result-100is-f",
    eventId: "100is",
    eventLabel: "100 m immersion Minimes Femmes",
    sex: "F",
    ranking: [
      { rank: 1, displayName: "DURAND Emma", birthYear: "2011", club: "CLUB", category: "Minime", time: "45.10", points: "700" }
    ]
  }, {
    id: "result-200sf-f",
    eventId: "200sf",
    eventLabel: "200 m surface Minimes Femmes",
    sex: "F",
    ranking: [
      { rank: 1, displayName: "DURAND Emma", birthYear: "2011", club: "CLUB", category: "Minime", time: "1:40.10", points: "999" }
    ]
  }], { normalizePersonName: people.normalizePersonName });

  assert.equal(rankings.female.length, 2);
  assert.equal(rankings.female[0].name, "DURAND Emma");
  assert.equal(rankings.female[0].totalPoints, 1442);
  assert.equal(rankings.female[0].eventCount, 2);
  assert.equal(rankings.female[1].totalPoints, 731);

  const html = trophy.renderPublicProvisionalHtml([{
    eventId: "50sf",
    eventLabel: "50 m surface Minimes Femmes",
    sex: "F",
    ranking: [
      { displayName: "DURAND Emma", birthYear: "2011", club: "CLUB", category: "Minime", points: "742" }
    ]
  }], { normalizePersonName: people.normalizePersonName });
  assert.match(html, /Classement provisoire/);
  assert.match(html, /TDH Filles/);
  assert.match(html, /TDH Gar/);
  assert.match(html, /Courses nag/);
  assert.match(html, /50SF/);
}

[
  testFinalTimeWinsAfterIntermediateTimes,
  testPointsAndRecordLabelsAfterTimeAreIgnored,
  testPartialLongRaceWithoutRankKeepsSwimmerTime,
  testUnrankedLongRaceKeepsPoints,
  testFinalistsSplitOnlyWhenSixteenQualifiedRowsExist,
  testNsAndInMarkersDoNotPolluteNamesOrCreateDuplicates,
  testStatusesBecomePerformancesOnlyFromParsedResultRows,
  testFinalPerformanceStagesUseRankAThenB,
  testFinalDsqKeepsFinalSlotWithoutShiftingFinalB,
  testRelaysAreIgnoredForSwimmerPerformances,
  testRelayResultRowsAreParsedForPublicRaceDetails,
  testRelayResultRowsReadPlainCategoryBeforeClub,
  testMasterRelayCategoryComesFromSectionTitleAndLegsAreRead,
  testRereadPreservesAnnouncedFinalistsOnlyWhenNeeded,
  testDamienHebertRankingUsesMinimePoints
].forEach((test) => test());

console.log("LivePalmes result regression tests OK");
