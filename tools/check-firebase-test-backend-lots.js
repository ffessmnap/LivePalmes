"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  ALL_SAFE_LOTS, LOTS, METADATA, PROJECT_ID, PUBLICATION_EFFECT_FUNCTIONS
} = require("./firebase-test-backend-lots");

const root = path.join(__dirname, "..");
const backend = fs.readFileSync(path.join(root, "functions", "index.js"), "utf8");
const exported = [...backend.matchAll(/^exports\.([A-Za-z0-9_]+)\s*=\s*on(?:Call|Schedule|DocumentCreated|DocumentUpdated|DocumentWritten|Request)\s*\(/gm)]
  .map((match) => match[1]);
const classified = Object.values(LOTS).flat();

assert.equal(PROJECT_ID, "livepalmes-test");
assert.equal(new Set(exported).size, exported.length, "Un export Firebase est déclaré plusieurs fois.");
assert.equal(new Set(classified).size, classified.length, "Une Function appartient à plusieurs lots.");
assert.deepEqual([...classified].sort(), [...exported].sort(), "Chaque export doit appartenir exactement à un lot.");
assert.deepEqual(ALL_SAFE_LOTS, ["access", "engagement-core", "performance", "publications"]);
assert.ok(!ALL_SAFE_LOTS.includes("email") && !ALL_SAFE_LOTS.includes("schedulers"));

const emailSecrets = new Set(METADATA.email.secrets);
assert.equal(emailSecrets.size, 7);
for (const lot of ["access", "engagement-core", "performance", "publications"]) {
  assert.deepEqual(METADATA[lot].secrets, [], `${lot} ne doit exiger aucun secret email.`);
}
assert.deepEqual(LOTS.schedulers.sort(), ["closeDueEngagementCompetitions", "resumePerformancePublicationJobs"]);
assert.ok(!LOTS.performance.includes("resumePerformancePublicationJobs"));

const publicationFunctions = new Set(LOTS.publications);
for (const forbidden of ["storeCompetitionPdf", "deleteCompetitionPdf", "syncOfficialResultToPublicIndex", "syncPublicRecordsData", "publishPerformancePublicData"]) {
  assert.ok(publicationFunctions.has(forbidden));
}

const publicationEffects = new Set(PUBLICATION_EFFECT_FUNCTIONS);
assert.equal(publicationEffects.size, PUBLICATION_EFFECT_FUNCTIONS.length, "Effet public déclaré plusieurs fois.");
for (const lot of ["access", "engagement-core", "performance"]) {
  assert.ok(!LOTS[lot].some((name) => publicationEffects.has(name)), `${lot} contient une Function à effet public.`);
}
assert.deepEqual(
  PUBLICATION_EFFECT_FUNCTIONS.filter((name) => !publicationFunctions.has(name)).sort(),
  ["resolveEngagementSwimmerChangeRequest", "resumePerformancePublicationJobs"],
  "Seules l'action email mixte et la reprise planifiée peuvent avoir un effet public hors publications."
);

for (const name of [
  "createCompetitionImport", "resumeCompetitionImportPublication", "deleteCompetitionImport",
  "publishPerformanceCorrectionJob", "retryPerformancePublicationJob",
  "updateEngagementNationalSwimmerIdentity", "mergeEngagementNationalClubSwimmer",
  "repairEngagementNationalSwimmerMergePublication", "savePerformanceCorrection"
]) assert.ok(publicationFunctions.has(name), `${name} doit rester dans publications.`);

for (const name of ["importHistoricalPerformanceRows", "migratePerformanceBaseNextChunk"]) {
  assert.ok(LOTS.performance.includes(name), `${name} doit rester une migration Firestore interne.`);
}
assert.ok(!METADATA.performance.iam.join(" ").includes("objectAdmin"), "performance ne doit pas pouvoir administrer le bucket public.");
for (const lot of ["access", "engagement-core", "performance"]) {
  assert.ok(!LOTS[lot].some((name) => publicationFunctions.has(name)), `${lot} contient une publication publique.`);
}

console.log(`Lots Firebase TEST : ${exported.length} Functions classées exactement une fois.`);
