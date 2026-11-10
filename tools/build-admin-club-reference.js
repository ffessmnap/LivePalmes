const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

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

function main() {
  if (!process.argv.includes("--check")) throw new Error("Ancienne génération clubs retirée : les lecteurs utilisent NAP.");
  const retired = ["functions/assets/club-reference.json", "performances/public/data/club-reference.js"];
  for (const name of retired) {
    if (fs.existsSync(path.join(rootDir, name))) throw new Error(`Ancien référentiel clubs encore présent : ${name}`);
  }
  console.log("Référentiels clubs statiques retirés ; sources NAP utilisées.");
}

if (require.main === module) main();

module.exports = {
  normalizeClubName,
  parseCsvText,
  reconcileFederalNumber
};
