const assert = require("node:assert/strict");
const {
  buildWinPalmeCompetitionTxt,
  categoryCode,
  formatDate,
  formatTime,
  relayCategoryCode,
  stableMeetingId,
  swimmerWinPalmeId
} = require("../functions/winpalme-export");
const { cleanClubPayload, mergeClubDirectory } = require("../functions/engagement-clubs");
const { parseCsvText, reconcileFederalNumber } = require("../tools/build-admin-club-reference");
const generatedClubReference = require("../functions/assets/club-reference.json");

assert.equal(formatDate("2026-06-06"), "06/06/2026");
assert.equal(formatTime("26.84"), "002684");
assert.equal(formatTime("1:14.53"), "011453");
assert.equal(formatTime("59:59.99"), "595999");
assert.equal(categoryCode("M", "F"), "FMI");
assert.equal(categoryCode("S", "M"), "HSE");
assert.equal(categoryCode("M50+", "F"), "F50+");
assert.equal(relayCategoryCode("S", "mixed"), "XSE");

const officialFederalNumbers = new Set(["07780252", "03290017", "08110293"]);
assert.deepEqual(reconcileFederalNumber("07780252", officialFederalNumbers), {
  federalNumber: "07780252",
  status: "verified"
});
assert.deepEqual(reconcileFederalNumber("07780252b", officialFederalNumbers), {
  federalNumber: "07780252",
  status: "normalized"
});
assert.deepEqual(reconcileFederalNumber("08.11.0293", officialFederalNumbers), {
  federalNumber: "08110293",
  status: "normalized"
});
assert.deepEqual(reconcileFederalNumber("0329017", officialFederalNumbers), {
  federalNumber: "03290017",
  status: "legacy-expanded"
});
assert.deepEqual(reconcileFederalNumber("990001", officialFederalNumbers), {
  federalNumber: "990001",
  status: "unverified"
});
const officialByName = new Map([
  ["GENERATION GRAND BLEU", [{ federalNumber: "33130404", clubName: "GENERATION GRAND BLEU" }]],
  ["PLONGEE EVASION", [{ federalNumber: "14690280", clubName: "PLONGEE EVASION" }]]
]);
assert.deepEqual(reconcileFederalNumber("12130404", new Set(["33130404", "14690280"]), {
  clubName: "Génération Grand Bleu",
  officialByName
}), {
  federalNumber: "33130404",
  status: "name-structure-matched"
});
assert.deepEqual(reconcileFederalNumber("08820443", new Set(["33130404", "14690280"]), {
  clubName: "Plongée Evasion",
  officialByName
}), {
  federalNumber: "08820443",
  status: "unverified"
});
assert.deepEqual(parseCsvText("name;number\r\nClub;07780252\r\n", ";"), [
  ["name", "number"],
  ["Club", "07780252"]
]);
const generatedClubsByCode = new Map(generatedClubReference.clubs.map((club) => [club[1], club]));
assert.equal(generatedClubsByCode.get("GSMP")?.[4], "03290017");
assert.equal(generatedClubsByCode.get("CNHC - PF Aix")?.[4], "07780252");

const competition = {
  id: "la-roche-sur-yon-2026-06-06",
  name: "La Roche-sur-Yon",
  location: "La Roche-sur-Yon",
  date: "2026-06-06"
};
assert.match(stableMeetingId(competition), /^LP20260606\d{4}$/);
assert.equal(swimmerWinPalmeId({ swimmerIndexId: "3631" }), "3631");
assert.match(swimmerWinPalmeId({ swimmerIndexId: "new-swimmer-hash" }), /^\d{9}$/);

const clubs = mergeClubDirectory([
  ["106", "CNHC", "Club Nautique de Houilles Carrières", "3", "07780252", "Houilles", "78800", true]
], []);
const result = buildWinPalmeCompetitionTxt(competition, [{
  clubId: "106",
  clubCode: "CNHC",
  clubName: "Club Nautique de Houilles Carrières",
  swimmers: [{
    swimmerIndexId: "3631",
    lastName: "BULTEL",
    firstName: "Stéphane",
    birthDate: "1970-07-04",
    sex: "M",
    category: "M50+",
    individualEntries: [{ eventCode: "50BI", entryTime: "26.84" }]
  }],
  relays: [{
    category: "S",
    genderMode: "mixed",
    eventCode: "4X100SB",
    entryTime: "4:40.00",
    members: [{ swimmerIndexId: "3631" }, { swimmerIndexId: "18094" }, { swimmerIndexId: "18134" }, { swimmerIndexId: "10146" }]
  }],
  teamLeader: { mode: "person", lastName: "BIRNAL-PETIT", firstName: "Carole", birthDate: "2022-11-30" }
}], new Map(clubs.map((club) => [club.clubId, club])), { generatedAt: "2026-05-30T00:00:00+02:00" });

const output = result.buffer.toString("utf8");
assert.ok(output.includes("XXX;RENCONTRE;La Roche-sur-Yon;06/06/2026;Piscine;\r\n"));
assert.ok(output.includes("CLU;CNHC;Club Nautique de Houilles Carrières;07780252;IDF;;\r\n"));
assert.ok(output.includes("NAG;BULTEL;Stéphane;04/07/1970;M;CNHC;;50BI;002684;H50+;3631;;\r\n"));
assert.ok(output.includes("REL;CNHC;XSE;4X100SB;044000;3631;18094;18134;10146;\r\n"));
assert.ok(output.includes("CEQ;BIRNAL-PETIT;Carole;CNHC;30/11/2022;;\r\n"));
assert.equal(/(^|[^\r])\n/.test(output), false);

assert.throws(() => buildWinPalmeCompetitionTxt(competition, [{
  clubId: "missing",
  clubCode: "MISS",
  swimmers: [],
  relays: []
}], new Map()), /Numero federal manquant/);

assert.deepEqual(cleanClubPayload({
  federalNumber: "07780252",
  clubCode: "cnhc",
  clubName: "Club Nautique de Houilles Carrières",
  regionId: "3",
  active: true
}), {
  clubCode: "CNHC",
  clubName: "Club Nautique de Houilles Carrières",
  regionId: "3",
  federalNumber: "07780252",
  city: "",
  postalCode: "",
  active: true,
  source: "national"
});

console.log("Tests export WinPalme et référentiel clubs OK.");
