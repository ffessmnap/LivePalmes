"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../tools/ffessm-license-control-extension/core.js");

const batch = core.parseLivePalmesBatch([
  "lot_id;saison;livepalmes_id;nom;prenom;date_naissance;licence_livepalmes;competitions_sources",
  "lot-1;2026-2027;swimmer-1;DUPONT;Camille;2004-03-19;A-12-345678;France A, France B"
].join("\n"));
const person = batch.people[0];

assert.deepEqual(core.searchQueries(person), ["A-12-345678", "DUPONT Camille", "DUPONT"]);
assert.deepEqual(core.searchQueries({ ...person, currentLicense: "" }), ["DUPONT Camille", "DUPONT"]);
assert.deepEqual(core.searchQueries({ ...person, lastName: "LE GOFF", firstName: "Jean-Pierre" }), [
  "A-12-345678", "LE GOFF Jean-Pierre", "LE GOFF"
]);

assert.equal(batch.requiredValidity, "31/12/2027");
assert.equal(person.birthDate, "19/03/2004");
assert.equal(core.requiredValidityForSeason("2026-2027"), "31/12/2027");
assert.equal(core.validityCoversSeason("31/12/2027", "2026-2027"), true);
assert.equal(core.validityCoversSeason("31/12/2028", "2026-2027"), true);
assert.equal(core.validityCoversSeason("30/12/2027", "2026-2027"), false);
assert.equal(core.validityCoversSeason("31/12/2026", "2026-2027"), false);
assert.throws(() => core.requiredValidityForSeason("2026"), /Saison invalide/);

const exact = core.analyzeCandidates(person, [{
  license: "A-12-345678",
  name: "DUPONT Camille",
  birthDate: "19/03/2004",
  structure: "Club test",
  validity: "31/12/2027"
}]);
assert.equal(exact.status, "validable");
assert.equal(exact.selectedCandidate.validitySufficient, true);

const expired = core.analyzeCandidates(person, [{
  license: "A-12-345678",
  name: "DUPONT Camille",
  birthDate: "19/03/2004",
  validity: "31/12/2026"
}]);
assert.equal(expired.status, "licence_expiree");

const otherLicense = core.analyzeCandidates(person, [{
  license: "B-98-765432",
  name: "DUPONT Camille",
  birthDate: "19/03/2004",
  validity: "31/12/2027"
}]);
assert.equal(otherLicense.status, "anomalie_licence");

const closeIdentity = core.analyzeCandidates(person, [{
  license: "A-12-345678",
  name: "DUPON Camille",
  birthDate: "19/03/2004",
  validity: "31/12/2027"
}]);
assert.equal(closeIdentity.status, "anomalie_identite");

const ambiguous = core.analyzeCandidates(person, [
  { license: "A-12-345678", name: "DUPONT Camille", birthDate: "19/03/2004", validity: "31/12/2027" },
  { license: "B-98-765432", name: "DUPONT Camille", birthDate: "19/03/2004", validity: "31/12/2027" }
]);
assert.equal(ambiguous.status, "ambigu");

const noCurrentLicense = { ...person, currentLicense: "" };
const discoverable = core.analyzeCandidates(noCurrentLicense, [{
  license: "A-12-345678",
  name: "DUPONT Camille",
  birthDate: "19/03/2004",
  validity: "31/12/2027"
}]);
assert.equal(discoverable.status, "validable");

const csv = core.exportResultsCsv([exact], "2026-09-02T10:00:00.000Z");
assert.match(csv, /date_validite_requise/);
assert.match(csv, /31\/12\/2027/);
assert.match(csv, /validable/);


const unrelatedRow = {
  license: "Z-99-999999", name: "MARTIN Camille", birthDate: "01/01/2000", validity: "31/12/2027"
};
const exactAmongCandidates = core.analyzeCandidates(person, [unrelatedRow, {
  license: "A-12-345678", name: "DUPONT Camille", birthDate: "19/03/2004", validity: "31/12/2027"
}]);
const notFound = core.analyzeCandidates(person, []);
const mixedResults = [
  exactAmongCandidates, expired, otherLicense, closeIdentity, ambiguous, notFound,
  { ...person, status: "timeout", details: "Recherche interrompue.", candidates: [] }
].map((result, index) => ({ ...result, livePalmesId: `swimmer-${index + 1}` }));
const exportedRows = core.parseDelimited(core.exportResultsCsv(mixedResults));
const exportedHeaders = exportedRows[0];
const field = (rowIndex, name) => exportedRows[rowIndex][exportedHeaders.indexOf(name)];
assert.equal(exportedRows.length, mixedResults.length + 1, "Un seul résultat exporté par nageur.");
assert.equal(new Set(exportedRows.slice(1).map(row => row[exportedHeaders.indexOf("livepalmes_id")])).size, mixedResults.length);
assert.equal(exportedHeaders.includes("candidat_no"), false);
assert.equal(field(1, "licence_ffessm"), "A-12-345678");
assert.equal(field(1, "identite_ffessm"), "DUPONT Camille");
assert.equal(field(1, "statut"), "validable");
assert.equal(field(2, "validite_ffessm"), "31/12/2026");
assert.equal(field(3, "licence_ffessm"), "B-98-765432");
assert.equal(field(3, "statut"), "anomalie_licence");
for (const rowIndex of [4, 5, 6, 7]) {
  for (const name of ["licence_ffessm", "identite_ffessm", "date_naissance_ffessm", "structure_ffessm", "validite_ffessm"]) {
    assert.equal(field(rowIndex, name), "", "Aucune identité arbitraire exportée.");
  }
}
assert.equal(field(4, "statut"), "anomalie_identite");
assert.equal(field(5, "statut"), "ambigu");
assert.equal(field(6, "statut"), "introuvable");
assert.equal(field(7, "statut"), "timeout");
assert.equal(field(7, "date_validite_requise"), "31/12/2027");
assert.equal(core.parseDelimited(core.exportResultsCsv([])).length, 1);

const extensionRoot = path.join(__dirname, "..", "tools", "ffessm-license-control-extension");
const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, "manifest.json"), "utf8"));
assert.deepEqual(manifest.content_scripts[0].matches, ["https://macommission.ffessm.fr/*"]);
assert.deepEqual(manifest.content_scripts[0].js, ["core.js", "report.js", "content.js"]);
assert.equal(manifest.permissions, undefined);

console.log("Tests extension contrôle licences FFESSM : OK");

require("./ffessm-license-report-tests.js");
