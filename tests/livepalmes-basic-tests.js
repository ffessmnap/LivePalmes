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

[
  testTimeHelpers,
  testPersonHelpers,
  testResultParserKeepsFinalTimeAfterFinalMarker,
  testResultParserIgnoresInNsPrefix,
  testResultParserKeepsTimeBeforeRecordMarker,
  testStatusRows
].forEach((test) => test());

console.log("LivePalmes basic tests OK");
