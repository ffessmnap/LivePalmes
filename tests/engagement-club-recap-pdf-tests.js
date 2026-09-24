"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const PDFDocument = require("../functions/node_modules/pdfkit");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "functions/index.js"), "utf8");

// Execute the production PDF helpers without initializing Firebase or sending email.
function extract(name) {
  const match = source.match(new RegExp(`^(?:async )?function ${name}\\([^]*?^\\}`, "m"));
  assert.ok(match, name);
  return match[0];
}

const events = [
  { code: "50SF", shortLabel: "50 SF", type: "individual" },
  { code: "100SF", shortLabel: "100 SF", type: "individual" },
  { code: "4X100SF", shortLabel: "4 x 100 SF", type: "relay" }
];
const competition = {
  id: "pdf-test", name: "Compétition TEST - exemple fictif", date: "2026-11-08",
  location: "Données fictives", level: "regional", competitionType: "pool", events,
  officialsRequired: false, fees: { swimmerFee: 10, individualEventFee: 3, relayFee: 8 }
};
const swimmer = (id, firstName, lastName, sex, individualEntries = []) => ({
  swimmerIndexId: id, firstName, lastName, sex, birthDate: "2005-01-01",
  licenseNumber: `TEST-${id}`, individualEntries
});
const entry = {
  clubId: "example", clubCode: "TEST", clubName: "Club exemple (fictif)",
  teamLeader: { mode: "renounced" },
  swimmers: [
    swimmer("1", "Alice", "Martin", "F", [{ eventCode: "50SF", entryTime: "00:25.00" }, { eventCode: "100SF", entryTime: "00:55.00" }]),
    swimmer("2", "Hugo", "Bernard", "M", [{ eventCode: "50SF", entryTime: "00:23.00" }]),
    swimmer("3", "Léa", "Petit", "F"),
    swimmer("4", "Louis", "Robert", "M"),
    swimmer("5", "Emma", "Moreau", "F"),
    swimmer("6", "Noé", "Laurent", "M")
  ]
};
entry.relays = [{
  eventCode: "4X100SF", category: "S", genderMode: "mixed", entryTime: "04:00.00",
  memberIds: ["1", "2", "5", "6"], members: entry.swimmers.filter(s => ["1", "2", "5", "6"].includes(s.swimmerIndexId))
}];

const textCalls = [];
class RecordedPdf extends PDFDocument {
  text(text, ...args) { textCalls.push(String(text)); return super.text(text, ...args); }
}
const context = vm.createContext({
  fs, crypto, Buffer, console, PDFDocument: RecordedPdf,
  QRCode: require("../functions/node_modules/qrcode"),
  cleanPublicCalendarWhatsAppUrl: require("../functions/public-calendar").cleanPublicCalendarWhatsAppUrl,
  CLUB_REFERENCE_BY_ID: new Map(),
  ENGAGEMENT_EVENT_DEFINITION_BY_CODE: new Map(events.map(event => [event.code, event])),
  ENGAGEMENT_COMPETITION_LEVELS: new Set(["regional", "national", "international"]),
  ENGAGEMENT_COMPETITION_TYPES: new Set(["pool", "openWater"]),
  ENGAGEMENT_PDF_LOGO_PATH: path.join(root, "functions/assets/logo-ffessm-nage-avec-palmes.png")
});
const helpers = [...source.matchAll(/^(?:async )?function (engagementPdf\w+)\(/gm)].map(match => match[1]);
vm.runInContext([...new Set([...helpers, "buildEngagementClubRecapPdf", "engagementClubRecapPdfSourceHash",
  "engagementClubEntryHasParticipants", "cleanText", "cleanIsoDate", "normalizeCourseCode", "normalizeCategoryCode",
  "ageCategoryFromDates", "birthYear", "competitionYear", "importSeasonYear", "stableHash", "engagementClubCode",
  "cleanEngagementCompetitionLevel", "cleanEngagementCompetitionType"
])].map(extract).join("\n"), context);

async function main() {
  const original = JSON.stringify(entry);
  const rows = context.engagementPdfSwimmersWithoutIndividualRows(entry, competition);
  assert.equal(rows.length, 4);
  assert.equal(rows.filter(row => row.entries === "Aucune course engagée").length, 2);
  assert.equal(rows.filter(row => row.entries === "Relais uniquement").length, 2);
  const matrixRows = ["F", "M"].flatMap(sex => context.engagementPdfIndividualMatrix(entry, competition, sex)?.rows || []);
  assert.equal(matrixRows.length + rows.length, 6, "Chaque inscrit apparaît dans un seul tableau de nageurs.");
  assert.equal(JSON.stringify(context.engagementPdfEntryStats(entry)), JSON.stringify({ swimmerCount: 6, individualCount: 3, relayCount: 1 }));
  assert.equal(context.engagementPdfFeeTotal(entry, competition), 77, "6 x 10 + 3 x 3 + 1 x 8, sans doubler les relayeurs.");
  assert.equal(context.engagementPdfFeeTotal(entry, { fees: { ...competition.fees, enabled: false } }), 0);
  assert.equal(context.engagementPdfFeeTotal(entry, { fees: {} }), 0);

  const pdf = await context.buildEngagementClubRecapPdf(competition, entry);
  assert.equal(pdf.buffer.subarray(0, 4).toString(), "%PDF");
  assert.equal(textCalls.filter(text => text === "Aucune course engagée").length, 2);
  assert.ok(textCalls.includes("6 nageurs · 3 courses · 1 relais"));
  assert.ok(textCalls.includes("60,00 EUR") && textCalls.includes("9,00 EUR") && textCalls.includes("8,00 EUR") && textCalls.includes("77,00 EUR"));
  assert.ok(!textCalls.some(text => /remplaçant/i.test(text)));
  assert.equal(JSON.stringify(entry), original, "La génération ne modifie pas les inscriptions.");
  const examplePath = process.argv[2];
  if (examplePath) { fs.mkdirSync(path.dirname(examplePath), { recursive: true }); fs.writeFileSync(examplePath, pdf.buffer); }

  const noCourses = { swimmers: [swimmer("7", "Camille", "Durand", "F"), { ...swimmer("8", "Alex", "Dubois", "M"), individualEntries: undefined }], relays: [] };
  assert.equal(context.engagementClubEntryHasParticipants(noCourses), true);
  assert.equal(context.engagementPdfFeeTotal(noCourses, competition), 20);
  textCalls.length = 0;
  await context.buildEngagementClubRecapPdf({ ...competition, events: [] }, noCourses);
  assert.equal(textCalls.filter(text => text === "Aucune course engagée").length, 2, "Affichage même sans programme ni course individuelle.");
  assert.ok(textCalls.includes("2 nageurs · 0 course · 0 relais"));
  assert.ok(textCalls.includes("20,00 EUR"));

  // Legacy relay shape, repeated participation and unnamed relay: no extra swimmer or fee.
  const legacy = { ...entry, relays: [{ ...entry.relays[0], memberIds: undefined }, entry.relays[0], { eventCode: "4X100SF" }] };
  assert.equal(context.engagementPdfSwimmersWithoutIndividualRows(legacy, competition).filter(row => row.entries === "Relais uniquement").length, 2);
  assert.equal(context.engagementPdfEntryStats(legacy).swimmerCount, 6);
  assert.equal(context.engagementPdfFeeTotal(legacy, competition), 93);
  assert.equal(context.engagementPdfSwimmersWithoutIndividualRows({}, competition).length, 0);

  // The layout version invalidates old cached PDFs even when entries are unchanged.
  const oldHash = vm.runInContext(`(${extract("engagementClubRecapPdfSourceHash").replace("    registeredSwimmersLayoutVersion: 1,\n", "")})`, context);
  assert.notEqual(context.engagementClubRecapPdfSourceHash(competition, entry), oldHash(competition, entry));
  textCalls.length = 0;
  const many = { swimmers: Array.from({ length: 70 }, (_, i) => swimmer(`p${i}`, "Camille", `Exemple ${i}`, "F")), relays: [] };
  await context.buildEngagementClubRecapPdf(competition, many);
  assert.equal(textCalls.filter(text => text === "Aucune course engagée").length, 70, "Aucun inscrit perdu lors des sauts de page.");
  console.log("PDF club : inscrits sans course, relais, effectifs, frais, cache et pagination OK.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
