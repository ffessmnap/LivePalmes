const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION = 2;

function cleanText(value) {
  return String(value || "").trim();
}

function swimmerKey(row = {}) {
  return cleanText(row.swimmerIdentityKey || row.identityKey || row.swimmerId || row.id || row.swimmer);
}

function betterPerformance(candidate, current) {
  if (!current) return true;
  return Number(candidate.timeValue || 0) < Number(current.timeValue || 0) ||
    (Number(candidate.timeValue || 0) === Number(current.timeValue || 0) && cleanText(candidate.date).localeCompare(cleanText(current.date)) < 0);
}

function performanceRef(row = {}) {
  return cleanText(row.publicKey || row.performanceBaseId || row.id);
}

function topBucketKey(row = {}) {
  return [cleanText(row.course), cleanText(row.sex), cleanText(row.category)].join("|");
}

function topCandidateKey(row = {}) {
  return [
    topBucketKey(row),
    swimmerKey(row),
    Number(row.seasonYear || 0) || 0,
    cleanText(row.regionId)
  ].join("|");
}

function swimmerCourseKey(row = {}) {
  return [swimmerKey(row), cleanText(row.course)].join("|");
}

function samePerformance(expected, actual) {
  return Number(expected?.timeValue || 0) === Number(actual?.timeValue || 0) &&
    cleanText(expected?.date) === cleanText(actual?.date) &&
    (!cleanText(expected?.id) || !cleanText(actual?.id) || cleanText(expected.id) === cleanText(actual.id));
}

function sameBestPerformance(expected, actual) {
  return Number(expected?.timeValue || 0) === Number(actual?.timeValue || 0) &&
    cleanText(expected?.date) === cleanText(actual?.date);
}

function addBest(map, key, row) {
  if (key && betterPerformance(row, map.get(key))) map.set(key, row);
}

async function collectExpectedSeed(seedPath) {
  const expectedCandidates = new Map();
  const expectedSwimmerCourses = new Map();
  let rows = 0;
  const input = fs.createReadStream(seedPath, { encoding: "utf8" });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (row.active === false || cleanText(row.status || "active") !== "active") continue;
    if (!row.timeValue || !row.course || !row.category || (row.sex !== "F" && row.sex !== "M")) continue;
    rows += 1;
    addBest(expectedCandidates, topCandidateKey(row), row);
    addBest(expectedSwimmerCourses, swimmerCourseKey(row), row);
  }
  return { expectedCandidates, expectedSwimmerCourses, rows };
}

function jsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  const walk = (current) => {
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".json")) files.push(full);
    });
  };
  walk(dir);
  return files;
}

function sortPerformancePublicationFiles(files, sourceDir) {
  const root = path.resolve(sourceDir);
  const priority = (filePath) => {
    const relative = path.relative(root, path.resolve(filePath)).replace(/\\/g, "/");
    if (relative === "manifest.json") return 2;
    if (relative === "version.js") return 1;
    return 0;
  };

  return [...files].sort((left, right) => {
    const priorityDifference = priority(left) - priority(right);
    if (priorityDifference !== 0) return priorityDifference;
    return path.relative(root, left).localeCompare(path.relative(root, right));
  });
}

function collectActualTops(outDir, errors) {
  const actualCandidates = new Map();
  const actualSwimmerCourses = new Map();
  const topDir = path.join(outDir, "tops");
  const files = jsonFiles(topDir);
  let rows = 0;
  files.forEach((file) => {
    const relative = path.relative(topDir, file).replace(/\\/g, "/");
    const [course, fileName] = relative.split("/");
    const match = /^([FM])-(.+)\.json$/.exec(fileName || "");
    if (!course || !match) {
      errors.push(`Nom de fichier TOP inattendu : ${relative}`);
      return;
    }
    const expectedSex = match[1];
    const expectedCategory = match[2];
    const payload = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(payload)) {
      errors.push(`Fichier TOP non tabulaire : ${relative}`);
      return;
    }
    payload.forEach((row) => {
      rows += 1;
      const rowCategory = cleanText(row.category).replace(/\+/g, "");
      if (row.course !== course || row.sex !== expectedSex || rowCategory !== expectedCategory) {
        errors.push(`Ligne rangée dans le mauvais TOP : ${relative} / ${performanceRef(row) || swimmerKey(row)}`);
      }
      addBest(actualCandidates, topCandidateKey(row), row);
      addBest(actualSwimmerCourses, swimmerCourseKey(row), row);
    });
  });
  return { actualCandidates, actualSwimmerCourses, files: files.length, rows };
}

function collectActualSwimmers(outDir, errors) {
  const actualSwimmerCourses = new Map();
  const swimmerDir = path.join(outDir, "swimmers");
  const files = jsonFiles(swimmerDir);
  let rows = 0;
  files.forEach((file) => {
    const payload = JSON.parse(fs.readFileSync(file, "utf8"));
    const identityKey = cleanText(payload.identityKey || payload.id);
    if (!identityKey || !Array.isArray(payload.rows)) {
      errors.push(`Fiche nageur invalide : ${path.relative(outDir, file)}`);
      return;
    }
    if (Number(payload.rowSchemaVersion || 0) < PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION) {
      errors.push(`Fiche nageur d'un ancien schéma : ${path.relative(outDir, file)}`);
      return;
    }
    payload.rows.forEach((row) => {
      rows += 1;
      addBest(actualSwimmerCourses, `${identityKey}|${cleanText(row.course)}`, row);
    });
  });
  return { actualSwimmerCourses, files: files.length, rows };
}

function compareMaps(expected, actual, label, errors, maxErrors, comparator = samePerformance) {
  for (const [key, expectedRow] of expected.entries()) {
    const actualRow = actual.get(key);
    if (!actualRow) errors.push(`${label} absent : ${key} (${expectedRow.time || expectedRow.timeValue})`);
    else if (!comparator(expectedRow, actualRow)) {
      errors.push(`${label} incohérent : ${key} attendu ${expectedRow.time || expectedRow.timeValue}, obtenu ${actualRow.time || actualRow.timeValue}`);
    }
    if (errors.length >= maxErrors) return;
  }
  for (const key of actual.keys()) {
    if (!expected.has(key)) errors.push(`${label} sans source active : ${key}`);
    if (errors.length >= maxErrors) return;
  }
}

async function checkPerformancePublicConsistency({ seedPath, outDir, maxErrors = 50 } = {}) {
  const resolvedSeed = path.resolve(seedPath || "");
  const resolvedOut = path.resolve(outDir || "");
  if (!fs.existsSync(resolvedSeed)) throw new Error(`Export canonique introuvable : ${resolvedSeed}`);
  if (!fs.existsSync(resolvedOut)) throw new Error(`Dossier public introuvable : ${resolvedOut}`);

  const errors = [];
  const expected = await collectExpectedSeed(resolvedSeed);
  const tops = collectActualTops(resolvedOut, errors);
  const swimmers = collectActualSwimmers(resolvedOut, errors);
  if (errors.length < maxErrors) compareMaps(expected.expectedCandidates, tops.actualCandidates, "Candidat TOP", errors, maxErrors);
  if (errors.length < maxErrors) compareMaps(expected.expectedSwimmerCourses, tops.actualSwimmerCourses, "Meilleur temps TOP", errors, maxErrors, sameBestPerformance);
  if (errors.length < maxErrors) compareMaps(expected.expectedSwimmerCourses, swimmers.actualSwimmerCourses, "Meilleur temps fiche nageur", errors, maxErrors, sameBestPerformance);

  return {
    ok: errors.length === 0,
    seedRows: expected.rows,
    expectedTopCandidates: expected.expectedCandidates.size,
    topFiles: tops.files,
    topRows: tops.rows,
    swimmerFiles: swimmers.files,
    swimmerRows: swimmers.rows,
    comparedSwimmerCourses: expected.expectedSwimmerCourses.size,
    errors
  };
}

module.exports = {
  betterPerformance,
  checkPerformancePublicConsistency,
  sameBestPerformance,
  samePerformance,
  swimmerCourseKey,
  swimmerKey,
  sortPerformancePublicationFiles,
  topCandidateKey
};
