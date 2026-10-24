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

const buildWaterTxt=require("../functions/winpalme-open-water-manual").buildNativeManualOpenWaterTxt;
// Synthetic native catalogue projection, without personal data.
function catalogueRow(course,id_course,relais=0,sexe="M") {
 const map={"5000":["LD05KM",5000],"3000BI":["LD03KMBI",3000],"4X1000SB Mixte":["LD4X1KMMM",4000],"1000BI":["LD1000BI",1000],"3000":["LD03KM",3000],"1000":["LD1000",1000],"150BIEL":["LD150BIE",150],"150SFEL":["LD150SFE",150],"6000":["LD06KM",6000],"6KMSUPPORT":["LD06KMSUP",6000]};
 return {course,id_course,relais,sexe:relais?"0":sexe,wplabel:map[course][0],longueur:map[course][1],style:"SF",type_:relais?0:1,nbnageur:relais?4:1,mixte:relais?1:0,ld:1,actif:1,validation:1};
}
const waterEvents = [
  ["OW5000SF", "5000", 99, "individual"], ["OW3000BI", "3000BI", 229, "individual"],
  ["4X1000SBMIXTE", "4X1000SB Mixte", 413, "relay"],
  ["OW1000BI", "1000BI", 269, "individual"], ["OW3000SF", "3000", 73, "individual"],
  ["OW1000SF", "1000", 117, "individual"], ["150BIEL", "150BIEL", 454, "individual"],
  ["150SFEL", "150SFEL", 456, "individual"]
].map(([code, course, id_course, type]) => ({ code, type, nativeCourses: [catalogueRow(course,id_course,type === "relay" ? 1 : 0)] }));
const waterCompetition = { ...competition, competitionType: "openWater", events: waterEvents };
const waterEntries = [{ clubId: "106", clubCode: "CNHC", swimmers: [{ swimmerIndexId: "1", sex: "F", category: "S", individualEntries: [{eventCode: "OW3000BI", entryTime: "12:00.00"}] }], relays: [{eventCode: "4X1000SBMIXTE", genderMode: "mixed", category: "S", members: [{swimmerIndexId:"1"},{swimmerIndexId:"2"},{swimmerIndexId:"3"},{swimmerIndexId:"4"}]}] }];
const clubsMap = new Map(clubs.map(club => [club.clubId, club]));
const waterBefore = JSON.stringify([waterCompetition, waterEntries]);
const waterTxt = buildWaterTxt(waterCompetition, waterEntries, clubsMap).buffer.toString("utf8");
assert.equal(buildWaterTxt(waterCompetition,waterEntries,clubsMap,{generatedAt:"2026-10-24T12:00:00Z"}).buffer.toString(),
  buildWinPalmeCompetitionTxt(waterCompetition,waterEntries,clubsMap,{generatedAt:"2026-10-24T12:00:00Z"}).buffer.toString(),"Native Jumièges projection preserves the existing TXT exactly");
assert.ok(waterTxt.includes(";Longue distance;\r\n"));
assert.equal(waterTxt.split("\r\n").filter(row => row.startsWith("DIS;")).length, 8);
assert.ok(waterTxt.includes("DIS;LD03KMBI;3000BI;3000;SF;1;1;229;0\r\n"));
assert.ok(waterTxt.includes("DIS;LD150BIE;150BIEL;150;SF;1;1;;0\r\n"));
assert.ok(waterTxt.includes("DIS;LD150SFE;150SFEL;150;SF;1;1;;0\r\n"));
assert.ok(waterTxt.includes("DIS;LD4X1KMMM;4X1000SB Mixte;4000;SF;2;4;;1\r\n"));
assert.ok(waterTxt.includes(";;LD03KMBI;000001;FSE;1;;"));
assert.ok(waterTxt.includes("REL;CNHC;XSE;LD4X1KMMM;595999;1;2;3;4;"));
assert.equal(JSON.stringify([waterCompetition, waterEntries]), waterBefore);
const femaleFirst = { ...waterCompetition, events: [{ code: "OW3000SF", type: "individual", nativeCourses: [catalogueRow("3000",72,0,"F"),catalogueRow("3000",73)] }] };
assert.ok(buildWaterTxt(femaleFirst).buffer.toString().includes("DIS;LD03KM;3000;3000;SF;1;1;72;0"));
assert.throws(() => buildWaterTxt({...waterCompetition,events:[]}), /Programme eau libre absent/);
assert.throws(() => buildWaterTxt({...waterCompetition,events:[{code:"OW2000SUP",nativeCourses:[{course:"2KMSUPPORT"}]}]}), /sans correspondance/);
assert.throws(() => buildWaterTxt({...waterCompetition,events:waterEvents.filter(event => event.code !== "OW3000BI")},waterEntries,clubsMap), /hors programme|correspondance/);
assert.throws(() => buildWaterTxt({...waterCompetition,events:[{code:"OW1000SF",type:"individual",nativeCourses:[catalogueRow("1000",null)]}]}), /Reference native/);
console.log("Open-water experimental TXT: full programme, first native reference, empty elimination/relay IDs, fixed times and strict unknown-course refusal verified.");

const beaumontEvents = [catalogueRow("6000",74),catalogueRow("6KMSUPPORT",218)].map((row,i)=>({code:`BEAUMONT${i}`,type:"individual",nativeCourses:[row]}));
const beaumontTxt=buildWaterTxt({...waterCompetition,events:beaumontEvents}).buffer.toString();
assert.ok(beaumontTxt.includes("DIS;LD06KM;6000;6000;SF;1;1;74;0"));
assert.ok(beaumontTxt.includes("DIS;LD06KMSUP;6KMSUPPORT;6000;SF;1;1;218;0"));
const refuseRow = (row,pattern=/ambigue|incoherent|Reference native/)=>assert.throws(()=>buildWaterTxt({...waterCompetition,events:[{code:"TEST",type:"individual",nativeCourses:[row]}]}),pattern);
for(const patch of [{wplabel:""},{wplabel:"LD11KM"},{wplabel:"WPRELAISLD3500"},{longueur:0},{style:"BI"},{actif:0},{validation:0},{ld:0},{mixte:1},{nbnageur:3},{type_:0},{sexe:"0"}]) refuseRow({...catalogueRow("6000",74),...patch});
assert.throws(()=>buildWaterTxt({...waterCompetition,events:[{code:"BAD",type:"individual",nativeCourses:[catalogueRow("6000",74),{...catalogueRow("6000",75,0,"F"),longueur:9000}]}]}),/ambigue/);
assert.throws(()=>buildWaterTxt({...waterCompetition,events:[{code:"BAD",type:"individual",nativeCourses:[catalogueRow("6000",74),catalogueRow("6000",75)]}]}),/Reference native/);
assert.throws(()=>buildWaterTxt({...waterCompetition,events:[beaumontEvents[0],{...beaumontEvents[0],code:"SECOND"}]}),/ambigue/);
assert.throws(()=>buildWaterTxt({...waterCompetition,events:[{code:"RELAY",type:"relay",nativeCourses:[{...catalogueRow("4X1000SB Mixte",413,1),course:"4X500",wplabel:"LD4X500SFM",longueur:2000}]}]}),/incoherent/);
console.log("Native catalogue: Beaumont surface/support, missing/inactive/inconsistent fields, collisions, duplicate references and unverified relays tested.");

// Federal numbers distinguish clubs even when their abbreviation is shared.
const { prepareManualOpenWaterEntries } = require("../functions/winpalme-open-water-manual");
const sameCodeClubs=new Map([
  ["101",{clubCode:"CPC",clubName:"Cornouaille",federalNumber:"03290021",regionId:"6"}],
  ["102",{clubCode:"CPC",clubName:"Calais",federalNumber:"09620013",regionId:"13"}]
]);
const sameCodeEntries=["101","102"].map((clubId,i)=>({clubId,clubCode:"CPC",swimmers:[{swimmerIndexId:String(i+1),firstName:"Test",lastName:"Nageur",sex:"F",category:"M30+",individualEntries:[{eventCode:"OW1000SF"}]}],relays:[{eventCode:"4X1000SBMIXTE",nativeCategory:0,category:"NAP-0",genderMode:"mixed",members:[]}],teamLeader:{mode:"person",lastName:"Responsable",firstName:clubId}}));
const sameCodeBefore=JSON.stringify(sameCodeEntries);
const prepared=prepareManualOpenWaterEntries(sameCodeEntries);
const corrected=buildWaterTxt({...waterCompetition,winPalmeId:"CNNP202606279229"},prepared,sameCodeClubs,{generatedAt:"2026-10-24T12:00:00Z"}).buffer.toString("utf8");
const uncorrected=buildWaterTxt({...waterCompetition,winPalmeId:"CNNP202606279229"},sameCodeEntries,sameCodeClubs,{generatedAt:"2026-10-24T12:00:00Z"}).buffer.toString("utf8");
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

// Execute the real season/category normalisation used by the callable.
const vm=require("node:vm"),fs=require("node:fs"),source=fs.readFileSync("functions/index.js","utf8");
const seasonalContext={buildWinPalmeCompetitionTxt:buildWaterTxt,engagementPdfFileName:value=>String(value),Date};
vm.createContext(seasonalContext);
for(const [start,end] of [["function competitionYear(","function performanceCategoryFromRow("],["function importSeasonYear(","function currentEngagementSeasonInfo("],["function engagementTxtSwimmerCategory(","async function readStoredEngagementTxt("]]) {
  vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),seasonalContext);
}
for(const [age,category] of [[9,"P"],[10,"B"],[11,"B"],[12,"M"],[13,"M"],[14,"C"],[15,"C"],[16,"J"],[17,"J"],[18,"S"],[29,"S"],[30,"M30+"],[39,"M30+"],[40,"M40+"],[49,"M40+"],[50,"M50+"],[59,"M50+"],[60,"M60+"],[69,"M60+"],[70,"M70+"],[79,"M70+"],[80,"M80+"]]) {
  assert.equal(seasonalContext.ageCategoryFromDates("2026-06-27",String(2026-age)+"-12-31"),category);
}
assert.equal(seasonalContext.ageCategoryFromDates("2026-08-31","1997-12-31"),"S");
assert.equal(seasonalContext.ageCategoryFromDates("2026-09-01","1997-12-31"),"M30+");
const bornEntry=[{clubId:"106",clubCode:"CNHC",swimmers:[{lastName:"Test",firstName:"Saison",sex:"F",birthDate:"1996-12-31",category:"S",individualEntries:[{eventCode:"OW1000SF"}]}],relays:[]}];
const birthBefore=JSON.stringify(bornEntry);
const seasonalTxt=seasonalContext.buildEngagementCompetitionTxt({...waterCompetition,date:"2026-06-27",winPalmeId:"CNNP202606274982"},bornEntry,clubsMap).buffer.toString("utf8");
assert.ok(seasonalTxt.includes(";LD1000;000001;F30+;"));
assert.equal(JSON.stringify(bornEntry),birthBefore);
(async()=>{
  const {readManualOpenWaterCompetition}=require("../functions/winpalme-open-water-manual");
  for(const [id,date,comite,wid] of [[4982,"2026-06-27",4,"CNNP202606274982"],[4760,"2024-05-18",3,"IDF202405184760"]]) {
    let reads=0;const competition={id:"legacy-nap-"+id,date,events:[waterEvents[0]]};const before=JSON.stringify(competition);
    const result=await readManualOpenWaterCompetition({execute:async(query,args)=>{reads++;if(reads===1){assert.match(query.sql,/FORCE INDEX.*WHERE id=\? LIMIT 2/);assert.deepEqual(args,[id]);return [[{id,date,comite}]];}assert.match(query.sql,/course_dispo FORCE INDEX.*WHERE id IN.*LIMIT 301/);assert.deepEqual(args,[99]);return [[{...catalogueRow("5000",99),id:99}]];}},competition);
    assert.equal(result.winPalmeId,wid);assert.equal(reads,2);assert.equal(JSON.stringify(competition),before);
  }
  for(const rows of [[],[{id:4982,date:"2026-06-28",comite:4}],[{id:4982,date:"2026-06-27",comite:14}]]) {
    await assert.rejects(readManualOpenWaterCompetition({execute:async()=>[rows]},{id:"4982",date:"2026-06-27"}),/Reference e-NAP|Code du comite/);
  }
  await assert.rejects(readManualOpenWaterCompetition({execute:async()=>{throw new Error("private SQL");}},{id:"4982",date:"2026-06-27"}),e=>e.message==="Lecture de la reference e-NAP indisponible.");
  const input={id:"4903",date:"2025-05-01",events:beaumontEvents};
  for(const mode of ["missing","changed","error"]){
    let count=0;
    await assert.rejects(readManualOpenWaterCompetition({execute:async()=>{
      if(++count===1)return [[{id:4903,date:input.date,comite:3}]];
      if(mode==="error")throw Error("private SQL");
      return [mode==="missing"?[]:[{...catalogueRow("6000",74),id:74,course:"changed"},{...catalogueRow("6KMSUPPORT",218),id:218}]];
    }},input),/Catalogue eau libre|Programme eau libre modifie|Lecture du catalogue/);
  }
  console.log("Native e-NAP WIDs, two grouped primary-key reads, incomplete/stale catalogue refusal, season boundaries and no mutation passed.");
})().catch(error=>{console.error(error);process.exitCode=1;});
