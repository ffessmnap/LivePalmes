const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const {
  competitionImportFallbackIdentity,
  competitionImportIdentity,
  normalizeImportIdentityText,
  sameCompetitionImport
} = require(path.join(root, "functions", "performance-import-replacement.js"));

const lignano = {
  competitionCode: "CMAS-2026-WC-LIGNANO",
  competitionName: "2026 CMAS World Cup Finswimming Indoor - Lignano",
  date: "2026-03-06",
  location: "Lignano Sabbiadoro, Italie",
  poolSize: "50"
};
assert.equal(normalizeImportIdentityText("Électronique / Lignano"), "electronique lignano");
assert.equal(competitionImportIdentity(lignano), "code:cmas 2026 wc lignano");
assert.equal(
  competitionImportFallbackIdentity(lignano),
  "2026-03-06|2026 cmas world cup finswimming indoor lignano|lignano sabbiadoro italie|50"
);
assert.equal(sameCompetitionImport(lignano, { ...lignano, competitionName: "Nom corrigé" }), true);
assert.equal(sameCompetitionImport(
  { ...lignano, competitionCode: "" },
  { ...lignano, competitionCode: "", sourceUrl: "https://example.test/corrected" }
), true);
assert.equal(sameCompetitionImport(lignano, { ...lignano, competitionCode: "OTHER" }), false);

const functionsSource = fs.readFileSync(path.join(root, "functions", "index.js"), "utf8");
const portalSource = fs.readFileSync(path.join(root, "portail.html"), "utf8");
const uiSource = fs.readFileSync(path.join(root, "performances", "public", "import-competitions.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "performances", "public", "import-competitions.css"), "utf8");

assert.ok(functionsSource.includes("async function findExistingCompetitionImport"));
assert.ok(functionsSource.includes('.where("competitionKey", "==", identity)'));
assert.ok(functionsSource.includes('.where("metadata.competitionCode", "==", cleanText(metadata.competitionCode))'));
assert.ok(functionsSource.includes('.where("metadata.date", "==", cleanText(metadata.date))'));
assert.ok(functionsSource.includes('canReplaceImport: Boolean(existingImport && existingImport.status === "stored" && existingImport.importId !== importId)'));
assert.ok(functionsSource.includes("async function stageCompetitionImportReplacement"));
assert.ok(functionsSource.includes('status: "replacement_staged"'));
assert.ok(functionsSource.includes('type: "performanceImportReplacement"'));
assert.ok(functionsSource.includes("async function processPerformanceImportReplacementJob"));
assert.ok(functionsSource.includes('status: "replaced"'));
assert.ok(functionsSource.includes("replacedBy: newImportId"));
assert.ok(functionsSource.includes("replacementOf: oldImportId"));
assert.ok(functionsSource.includes(".limit(expectedCount + 1)"));
assert.ok(functionsSource.includes('job.type === "performanceImportReplacement"'));

assert.ok(portalSource.includes('id="competitionImportExisting"'));
assert.ok(portalSource.includes('id="competitionImportReplaceButton"'));
assert.ok(portalSource.includes('<option value="replacement_staged">Remplacement en cours</option>'));
assert.ok(portalSource.includes('<option value="replaced">Remplacé</option>'));
assert.ok(uiSource.includes("Cette compétition a déjà été importée"));
assert.ok(uiSource.includes("Remplacer l'import existant"));
assert.ok(uiSource.includes("replaceImportId: existingImport.importId"));
assert.ok(uiSource.includes("monitorImportReplacement"));
assert.ok(uiSource.includes("data-retry-import-replacement"));
assert.ok(cssSource.includes(".competition-import-existing"));
assert.ok(cssSource.includes("#competitionImportValidateButton:disabled"));

console.log("Performance import replacement tests: OK");
