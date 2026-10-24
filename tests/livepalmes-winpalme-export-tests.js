const assert = require("node:assert/strict");
const {
  buildWinPalmeCompetitionTxt,
  categoryCode,
  formatDate,
  formatTime,
  regionCode,
  relayCategoryCode,
  relayMemberIds,
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
assert.equal(regionCode({ regionId: "4" }), "CNNP");
assert.equal(regionCode({ regionId: "5" }), "CMAS");
assert.equal(regionCode({ regionId: "10" }), "OPM");
assert.deepEqual(relayMemberIds({ members: [] }), ["", "", "", ""]);

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
assert.match(stableMeetingId(competition), /^CNNP20260606\d{4}$/);
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
assert.ok(output.startsWith("XXX;GENERER PAR LIVEPALMES le 30-05-2026 00:00\r\n\r\n"));
assert.match(output, /\r\nWID;CNNP20260606\d{4};\r\n/);
assert.ok(output.includes("XXX;RENCONTRE;La Roche-sur-Yon;06/06/2026;Piscine;\r\n"));
assert.ok(output.includes("CLU;CNHC;Club Nautique de Houilles Carrières;07780252;IDF;;\r\n"));
assert.ok(output.includes("NAG;BULTEL;Stéphane;04/07/1970;M;CNHC;;50BI;002684;H50+;3631;;\r\n"));
assert.ok(output.includes("REL;CNHC;XSE;4X100SB;044000;3631;18094;18134;10146;\r\n"));
assert.ok(output.includes("CEQ;BIRNAL-PETIT;Carole;CNHC;30/11/2022;;\r\n"));
assert.equal(/(^|[^\r])\n/.test(output), false);
assert.equal(result.buffer.subarray(0, 3).equals(Buffer.from([0xEF, 0xBB, 0xBF])), false);
output.split("\r\n").filter((row) => row.startsWith("REL;")).forEach((row) => {
  assert.equal(row.split(";").length, 10);
});

const goldenResult = buildWinPalmeCompetitionTxt({
  ...competition,
  winPalmeId: "CNNP202606064981"
}, [{
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
    individualEntries: [
      { eventCode: "50SF", entryTime: "25.01" },
      { eventCode: "50BI", entryTime: "26.84" }
    ]
  }],
  relays: [{
    category: "S",
    genderMode: "mixed",
    eventCode: "4X100SB",
    entryTime: "4:40.00",
    members: []
  }],
  teamLeader: { mode: "person", lastName: "BIRNAL-PETIT", firstName: "carole", birthDate: "2022-11-30" }
}], new Map(clubs.map((club) => [club.clubId, club])), { generatedAt: "2026-05-30T00:00:00+02:00" });

assert.equal(goldenResult.buffer.toString("utf8"), [
  "XXX;GENERER PAR LIVEPALMES le 30-05-2026 00:00",
  "",
  "XXX;RENCONTRE;La Roche-sur-Yon;06/06/2026;Piscine;",
  "",
  "WID;CNNP202606064981;",
  "XXX;XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "CLU;CNHC;Club Nautique de Houilles Carrières;07780252;IDF;;",
  "",
  "NAG;BULTEL;Stéphane;04/07/1970;M;CNHC;;50BI;002684;H50+;3631;;",
  "NAG;BULTEL;Stéphane;04/07/1970;M;CNHC;;50SF;002501;H50+;3631;;",
  "REL;CNHC;XSE;4X100SB;044000;;;;;",
  "CEQ;BIRNAL-PETIT;carole;CNHC;30/11/2022;;",
  "XXX;XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx",
  "",
  ""
].join("\r\n"));

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

// Synthetic open-water programme mirrors Jumièges without personal data.
const waterEvents = [
  ["OW5000SF", "5000", 99, "individual"], ["OW3000BI", "3000BI", 229, "individual"],
  ["4X1000SBMIXTE", "4X1000SB Mixte", 413, "relay"],
  ["OW1000BI", "1000BI", 269, "individual"], ["OW3000SF", "3000", 73, "individual"],
  ["OW1000SF", "1000", 117, "individual"], ["150BIEL", "150BIEL", 454, "individual"],
  ["150SFEL", "150SFEL", 456, "individual"]
].map(([code, course, id_course, type]) => ({ code, type, nativeCourses: [{ course, id_course, relais: type === "relay" ? 1 : 0 }] }));
const waterCompetition = { ...competition, competitionType: "openWater", events: waterEvents };
const waterEntries = [{ clubId: "106", clubCode: "CNHC", swimmers: [{ swimmerIndexId: "1", sex: "F", category: "S", individualEntries: [{eventCode: "OW3000BI", entryTime: "12:00.00"}] }], relays: [{eventCode: "4X1000SBMIXTE", genderMode: "mixed", category: "S", members: [{swimmerIndexId:"1"},{swimmerIndexId:"2"},{swimmerIndexId:"3"},{swimmerIndexId:"4"}]}] }];
const clubsMap = new Map(clubs.map(club => [club.clubId, club]));
const waterBefore = JSON.stringify([waterCompetition, waterEntries]);
const waterTxt = buildWinPalmeCompetitionTxt(waterCompetition, waterEntries, clubsMap).buffer.toString("utf8");
assert.ok(waterTxt.includes(";Longue distance;\r\n"));
assert.equal(waterTxt.split("\r\n").filter(row => row.startsWith("DIS;")).length, 8);
assert.ok(waterTxt.includes("DIS;LD03KMBI;3000BI;3000;SF;1;1;229;0\r\n"));
assert.ok(waterTxt.includes("DIS;LD150BIE;150BIEL;150;SF;1;1;;0\r\n"));
assert.ok(waterTxt.includes("DIS;LD150SFE;150SFEL;150;SF;1;1;;0\r\n"));
assert.ok(waterTxt.includes("DIS;LD4X1KMMM;4X1000SB Mixte;4000;SF;2;4;;1\r\n"));
assert.ok(waterTxt.includes(";;LD03KMBI;000001;FSE;1;;"));
assert.ok(waterTxt.includes("REL;CNHC;XSE;LD4X1KMMM;595999;1;2;3;4;"));
assert.equal(JSON.stringify([waterCompetition, waterEntries]), waterBefore);
const femaleFirst = { ...waterCompetition, events: [{ code: "OW3000SF", type: "individual", nativeCourses: [{course:"3000",id_course:72,relais:0},{course:"3000",id_course:73,relais:0}] }] };
assert.ok(buildWinPalmeCompetitionTxt(femaleFirst).buffer.toString().includes("DIS;LD03KM;3000;3000;SF;1;1;72;0"));
assert.throws(() => buildWinPalmeCompetitionTxt({...waterCompetition,events:[]}), /Programme eau libre absent/);
assert.throws(() => buildWinPalmeCompetitionTxt({...waterCompetition,events:[{code:"OW2000SUP",nativeCourses:[{course:"2KMSUPPORT"}]}]}), /sans correspondance/);
assert.throws(() => buildWinPalmeCompetitionTxt({...waterCompetition,events:waterEvents.filter(event => event.code !== "OW3000BI")},waterEntries,clubsMap), /hors programme|correspondance/);
assert.throws(() => buildWinPalmeCompetitionTxt({...waterCompetition,events:[{code:"OW1000SF",type:"individual",nativeCourses:[{course:"1000",relais:0}]}]}), /Reference native/);
console.log("Open-water experimental TXT: full programme, first native reference, empty elimination/relay IDs, fixed times and strict unknown-course refusal verified.");

// Federal numbers distinguish clubs even when their abbreviation is shared.
const { prepareManualOpenWaterEntries } = require("../functions/winpalme-open-water-manual");
const sameCodeClubs=new Map([
  ["101",{clubCode:"CPC",clubName:"Cornouaille",federalNumber:"03290021",regionId:"6"}],
  ["102",{clubCode:"CPC",clubName:"Calais",federalNumber:"09620013",regionId:"13"}]
]);
const sameCodeEntries=["101","102"].map((clubId,i)=>({clubId,clubCode:"CPC",swimmers:[{swimmerIndexId:String(i+1),firstName:"Test",lastName:"Nageur",sex:"F",category:"M30+",individualEntries:[{eventCode:"OW1000SF"}]}],relays:[{eventCode:"4X1000SBMIXTE",nativeCategory:0,category:"NAP-0",genderMode:"mixed",members:[]}],teamLeader:{mode:"person",lastName:"Responsable",firstName:clubId}}));
const sameCodeBefore=JSON.stringify(sameCodeEntries);
const prepared=prepareManualOpenWaterEntries(sameCodeEntries);
const corrected=buildWinPalmeCompetitionTxt({...waterCompetition,winPalmeId:"CNNP202606279229"},prepared,sameCodeClubs,{generatedAt:"2026-10-24T12:00:00Z"}).buffer.toString("utf8");
const uncorrected=buildWinPalmeCompetitionTxt({...waterCompetition,winPalmeId:"CNNP202606279229"},sameCodeEntries,sameCodeClubs,{generatedAt:"2026-10-24T12:00:00Z"}).buffer.toString("utf8");
assert.equal(corrected,uncorrected.replaceAll(";XNAP-0;",";XSE;"),"Only the agreed relay category changes");
assert.equal(JSON.stringify(sameCodeEntries),sameCodeBefore,"No native category, identity or club mutation");
assert.equal(corrected.split("\r\n").filter(row=>row.startsWith("CLU;CPC;")).length,2);
assert.ok(corrected.includes("CLU;CPC;Cornouaille;03290021;BPL;;"));
assert.ok(corrected.includes("CLU;CPC;Calais;09620013;HDF;;"));
assert.equal(corrected.split("\r\n").filter(row=>row.startsWith("REL;CPC;XSE;")).length,2);
assert.equal(corrected.includes("XNAP-0"),false);
assert.ok(corrected.includes(";LD1000;000001;F30+;"),"Individual categories retained");
assert.ok(corrected.includes("WID;CNNP202606279229;"),"WID retained");
assert.equal(corrected.split("\r\n").filter(row=>row.startsWith("CEQ;")).every(row=>row.split(";")[3]==="CPC"),true);
assert.throws(()=>prepareManualOpenWaterEntries([{relays:[{category:"NAP-9",eventCode:"4X1000SBMIXTE"}]}]),/non raccordee/);
assert.throws(()=>prepareManualOpenWaterEntries([{relays:[{category:"NAP-0",nativeCategory:0,genderMode:"mixed",eventCode:"UNKNOWN"}]}]),/non raccordee/);
assert.equal(prepareManualOpenWaterEntries([{relays:[{category:"J"}]}])[0].relays[0].category,"J");
console.log("Manual water export: XSE sentinel mapping, explicit categories, separate same-code/federal-number clubs, unchanged individual categories/WID and no mutation passed.");
