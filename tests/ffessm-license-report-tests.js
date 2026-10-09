"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../tools/ffessm-license-control-extension/core.js");
const report = require("../tools/ffessm-license-control-extension/report.js");
const person = {
  batchId: "lot-test", season: "2026-2027", livePalmesId: "1", lastName: "DUPONT", firstName: "Camille",
  birthDate: "19/03/2004", currentLicense: "A-12-345678", requiredValidity: "31/12/2027", competitions: "Meeting A | Meeting B"
};
const makePerson = (id, lastName, competitions) => ({ ...person, livePalmesId: id, lastName, competitions });
const people = [
  person, makePerson("2", "DURAND", "Meeting A"), makePerson("3", "LE GOFF", "Meeting A"),
  makePerson("4", "MARTIN", "Meeting B"), makePerson("5", "D'ÉTÉ & FILS", "Meeting A"),
  makePerson("6", "BERNARD", "Meeting A"), makePerson("7", "ROBERT", "Meeting A"),
  makePerson("8", "=HYPERLINK(\"malicious\")", "Meeting A"), makePerson("9", "NON CONTRÔLÉ", "Meeting A")
];
const batch = { batchId: person.batchId, season: person.season, requiredValidity: person.requiredValidity, people };
const candidate = p => ({ license: p.currentLicense, name: p.lastName + " " + p.firstName, birthDate: p.birthDate, validity: "31/12/2027" });
const results = [
  core.analyzeCandidates(people[0], [candidate(people[0])]),
  core.analyzeCandidates(people[1], [{ ...candidate(people[1]), validity: "31/12/2026" }]),
  core.analyzeCandidates(people[2], [{ ...candidate(people[2]), license: "B-98-765432", validity: "31/12/2026" }]),
  core.analyzeCandidates(people[3], [candidate(people[3])]),
  core.analyzeCandidates(people[4], [{ license: "Z-00-999999", name: "AUTRE PERSONNE", birthDate: "01/01/2000", validity: "31/12/2027" }]),
  core.analyzeCandidates(people[5], [candidate(people[5]), { ...candidate(people[5]), license: "C-99-999999" }]),
  core.analyzeCandidates(people[6], []),
  { ...people[7], status: "timeout", details: "Ma Commission n’a pas répondu.", candidates: [] }
];
assert.deepEqual(report.competitionNames(people), ["Meeting A", "Meeting B"]);
const a = report.buildReport(batch, results, "Meeting A", "2026-10-09T22:50:00Z");
assert.equal(a.rows.length, 8);
assert.equal(a.rows.some(r => r.id === "4"), false, "Pas de nageur d'une autre compétition.");
assert.equal(new Set(a.rows.map(r => r.id)).size, a.rows.length);
assert.deepEqual(a.summary, { total: 8, controlled: 7, conforming: 1, toReview: 6, pending: 1 });
assert.equal(a.rows.at(-1).status, "validable", "Les dossiers à vérifier sont placés en premier.");
assert.equal(a.rows.find(r => r.id === "3").values[4], "B-98-765432");
assert.match(a.rows.find(r => r.id === "3").values[7], /insuffisante/);
for (const id of ["5", "6", "7", "8", "9"]) {
  assert.equal(a.rows.find(r => r.id === id).values[4], "", "Pas de licence fédérale non concordante.");
  assert.equal(a.rows.find(r => r.id === id).values[5], "");
}
const b = report.buildReport(batch, results, "Meeting B");
assert.deepEqual(b.summary, { total: 2, controlled: 2, conforming: 2, toReview: 0, pending: 0 });
assert.throws(() => report.buildReport(batch, results, "Meeting"), /Choisissez/);
assert.throws(() => report.buildReport(batch, [...results, results[0]], "Meeting A"), /plusieurs/);
assert.deepEqual(report.competitionNames([{ competitions: "Meeting, national | Meeting B | Meeting, national" }]), ["Meeting B", "Meeting, national"]);
const noCompetition = { ...batch, people: [{ ...person, competitions: "" }] };
assert.equal(report.buildReport(noCompetition, [], "").summary.pending, 1);
const bytes = report.exportReportXlsx(batch, results, "Meeting A", "2026-10-09T22:50:00Z");
const buffer = Buffer.from(bytes);
const files = new Map();
let offset = 0;
while (buffer.readUInt32LE(offset) === 0x04034b50) {
  const size = buffer.readUInt32LE(offset + 18);
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const name = buffer.toString("utf8", offset + 30, offset + 30 + nameLength);
  const dataStart = offset + 30 + nameLength + extraLength;
  files.set(name, buffer.toString("utf8", dataStart, dataStart + size));
  offset = dataStart + size;
}
assert.equal(files.size, 6);
const sheet = files.get("xl/worksheets/sheet1.xml");
assert.match(sheet, /autoFilter ref="A8:H16"/);
assert.match(sheet, /state="frozen"/);
assert.match(sheet, /D'ÉTÉ &amp; FILS/);
assert.equal(sheet.includes("AUTRE PERSONNE"), false);
assert.equal(sheet.includes("Z-00-999999"), false);
assert.equal(sheet.includes("<f>"), false, "Les noms ne peuvent pas devenir des formules.");
assert.match(sheet, /t="inlineStr"[^>]*><is><t xml:space="preserve">=HYPERLINK/);
assert.match(files.get("xl/styles.xml"), /formatCode="dd\/mm\/yyyy"/);
if (process.env.LIVEPALMES_REPORT_SAMPLE) {
  fs.writeFileSync(path.resolve(process.env.LIVEPALMES_REPORT_SAMPLE), buffer);
}
console.log("Tests bilan Excel licences FFESSM : OK");
