const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "performances", "public", "data", "admin-reference.js");
const outputPath = path.join(rootDir, "performances", "public", "data", "club-reference.js");
const functionsOutputPath = path.join(rootDir, "functions", "assets", "club-reference.json");
const intranapDir = process.env.INTRANAP_DIR || path.resolve(rootDir, "..", "..", "BDD INTRANAP");

function parseCsvText(text, separator = ",") {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === separator && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => String(cell || "").trim())) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value || row.length) {
    row.push(value);
    if (row.some((cell) => String(cell || "").trim())) rows.push(row);
  }
  return rows;
}

function normalizeClubName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function officialFederalClubReference() {
  const empty = { numbers: new Set(), byName: new Map() };
  if (!fs.existsSync(intranapDir)) return empty;
  const source = fs.readdirSync(intranapDir)
    .filter((fileName) => /^clubs_ffessm_.*\.csv$/i.test(fileName))
    .map((fileName) => ({ fileName, path: path.join(intranapDir, fileName) }))
    .filter((file) => fs.readFileSync(file.path, "utf8").split(/\r?\n/, 1)[0].includes("numero_club_ffessm"))
    .sort((left, right) => fs.statSync(right.path).mtimeMs - fs.statSync(left.path).mtimeMs)[0];
  if (!source) return empty;
  const rows = parseCsvText(fs.readFileSync(source.path, "utf8"), ";");
  const headers = rows.shift().map((cell) => String(cell || "").trim());
  const federalNumberIndex = headers.indexOf("numero_club_ffessm");
  const clubNameIndex = headers.indexOf("nom_club");
  const clubs = rows
    .map((row) => ({
      federalNumber: String(row[federalNumberIndex] || "").trim(),
      clubName: String(row[clubNameIndex] || "").trim()
    }))
    .filter((club) => /^\d{8}$/.test(club.federalNumber));
  const byName = new Map();
  clubs.forEach((club) => {
    const key = normalizeClubName(club.clubName);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(club);
  });
  return {
    numbers: new Set(clubs.map((club) => club.federalNumber)),
    byName
  };
}

function reconcileFederalNumber(rawValue, officialNumbers = new Set(), options = {}) {
  const raw = String(rawValue || "").trim();
  if (!raw || !officialNumbers.size || officialNumbers.has(raw)) {
    return { federalNumber: raw, status: officialNumbers.has(raw) ? "verified" : "unverified" };
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8 && officialNumbers.has(digits)) {
    return { federalNumber: digits, status: "normalized" };
  }
  if (/^\d{7}$/.test(raw)) {
    const expanded = `${raw.slice(0, 4)}0${raw.slice(4)}`;
    if (officialNumbers.has(expanded)) {
      return { federalNumber: expanded, status: "legacy-expanded" };
    }
  }
  const nameMatches = options.officialByName?.get(normalizeClubName(options.clubName)) || [];
  if (digits.length === 8 && nameMatches.length === 1) {
    const officialNumber = nameMatches[0].federalNumber;
    const matchingStructure = digits.slice(0, 4) === officialNumber.slice(0, 4)
      || digits.slice(-4) === officialNumber.slice(-4);
    if (matchingStructure) {
      return { federalNumber: officialNumber, status: "name-structure-matched" };
    }
  }
  return { federalNumber: raw, status: "unverified" };
}

function federalClubDetails(officialReference = { numbers: new Set(), byName: new Map() }) {
  if (!fs.existsSync(intranapDir)) return new Map();
  const source = fs.readdirSync(intranapDir)
    .filter((fileName) => /^clubs_.*\.csv$/i.test(fileName))
    .map((fileName) => ({ fileName, path: path.join(intranapDir, fileName) }))
    .filter((file) => fs.readFileSync(file.path, "utf8").split(/\r?\n/, 1)[0].includes("federal_club"))
    .sort((left, right) => fs.statSync(right.path).mtimeMs - fs.statSync(left.path).mtimeMs)[0];
  if (!source) return new Map();
  const rows = parseCsvText(fs.readFileSync(source.path, "utf8"));
  const headers = rows.shift().map((cell) => String(cell || "").trim());
  const index = Object.fromEntries(headers.map((header, position) => [header, position]));
  return new Map(rows.map((row) => {
    const reconciliation = reconcileFederalNumber(row[index.federal_club], officialReference.numbers, {
      clubName: row[index.nom_club],
      officialByName: officialReference.byName
    });
    return [String(row[index.num_club] || "").trim(), {
      federalNumber: reconciliation.federalNumber,
      federalNumberStatus: reconciliation.status,
      city: String(row[index.ville] || "").trim(),
      postalCode: String(row[index.postalcode] || "").trim(),
      active: String(row[index.actif_club] || "").trim() !== "0"
    }];
  }));
}

function main() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(sourcePath, "utf8"), sandbox, { filename: sourcePath });

  const sourceClubs = Array.isArray(sandbox.window.LIVEPALMES_ADMIN_REFERENCE?.clubs)
    ? sandbox.window.LIVEPALMES_ADMIN_REFERENCE.clubs
    : [];
  const existingReference = fs.existsSync(functionsOutputPath)
    ? JSON.parse(fs.readFileSync(functionsOutputPath, "utf8"))
    : { clubs: [] };
  const existingById = new Map((existingReference.clubs || []).map((club) => [String(club?.[0] || "").trim(), club]));
  const officialFederalReference = officialFederalClubReference();
  const federalById = federalClubDetails(officialFederalReference);
  const clubs = sourceClubs.map((club) => {
    const clubId = String(club?.[0] || "").trim();
    const details = federalById.get(clubId) || {};
    const existing = existingById.get(clubId) || [];
    return [
      ...club.slice(0, 4),
      details.federalNumber || existing[4] || "",
      details.city || existing[5] || "",
      details.postalCode || existing[6] || "",
      details.active ?? existing[7] ?? true
    ];
  });

  const reference = { clubs };
  const reconciliationCounts = Array.from(federalById.values()).reduce((counts, details) => {
    const status = details.federalNumberStatus || "unverified";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const payload = `window.LIVEPALMES_CLUB_REFERENCE = ${JSON.stringify(reference)};\n`;
  const functionsPayload = `${JSON.stringify(reference)}\n`;
  if (process.argv.includes("--check")) {
    const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
    const existingFunctions = fs.existsSync(functionsOutputPath) ? fs.readFileSync(functionsOutputPath, "utf8") : "";
    if (existing !== payload || existingFunctions !== functionsPayload) {
      console.error(`${path.relative(rootDir, outputPath)} et ${path.relative(rootDir, functionsOutputPath)} doivent etre regeneres.`);
      process.exitCode = 1;
      return;
    }
    console.log(`${clubs.length} clubs verifies dans ${path.relative(rootDir, outputPath)}. Rapprochement federal: ${JSON.stringify(reconciliationCounts)}.`);
    return;
  }
  fs.writeFileSync(outputPath, payload, "utf8");
  fs.mkdirSync(path.dirname(functionsOutputPath), { recursive: true });
  fs.writeFileSync(functionsOutputPath, functionsPayload, "utf8");
  console.log(`${clubs.length} clubs ecrits dans ${path.relative(rootDir, outputPath)} et ${path.relative(rootDir, functionsOutputPath)}. Rapprochement federal: ${JSON.stringify(reconciliationCounts)}.`);
}

if (require.main === module) main();

module.exports = {
  normalizeClubName,
  parseCsvText,
  reconcileFederalNumber
};
