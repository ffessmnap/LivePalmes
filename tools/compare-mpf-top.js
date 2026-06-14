#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const recordsPath = path.join(root, "performances", "public", "data", "records-data.js");
const summaryPath = path.join(root, "performances", "public", "data", "intranap-summary.js");
const topRoot = path.join(root, "performances", "public", "data", "performance-public", "tops");
const outputDir = path.join(root, "outputs");
const additionalUrl = "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public/additional-data.json";

function jsData(filePath, globalName) {
  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(new RegExp(`window\\.${globalName}\\s*=\\s*(\\{.*\\});?\\s*$`, "s"));
  if (!match) throw new Error(`Impossible de lire ${globalName} dans ${filePath}`);
  return JSON.parse(match[1]);
}

function categoryFileSlug(category) {
  return String(category || "").replace(/\+/g, "");
}

function readTopRows(course, sex, category) {
  const file = path.join(topRoot, course, `${sex}-${categoryFileSlug(category)}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
}

function normalizeIdentityPart(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function rowSwimmerKey(row) {
  if (row.swimmerIdentityKey) return row.swimmerIdentityKey;
  const first = normalizeIdentityPart(row.firstName);
  const last = normalizeIdentityPart(row.lastName);
  const birth = String(row.birthDate || "").trim();
  if (first && last && birth) return `${last}|${first}|${birth}`;
  return String(row.swimmerId || row.swimmer || "");
}

function performanceCorrectionKey(row) {
  if (row?.id) return `${row.source || "intranap"}|${row.id}`;
  return [
    row?.swimmerIdentityKey || row?.swimmerId || row?.swimmer,
    row?.date,
    row?.course,
    row?.timeValue,
    row?.club || row?.clubName,
    row?.competitionId || row?.location
  ].map((value) => String(value || "").trim()).join("|");
}

function correctionMovesSwimmer(correction, row = {}) {
  const patch = correction?.patch || {};
  return Boolean(patch.swimmerId) && String(patch.swimmerId) !== String(row.swimmerId || "");
}

function correctedRows(rows, corrections) {
  if (!corrections.length) return rows;
  const byKey = new Map(corrections.map((correction) => [correction.targetKey, correction]));
  return rows
    .map((row) => {
      const correction = byKey.get(performanceCorrectionKey(row));
      if (!correction) return row;
      if (correction.hidden || correctionMovesSwimmer(correction, row)) return null;
      return { ...row, ...(correction.patch || {}) };
    })
    .filter(Boolean);
}

function rowFromCorrection(correction) {
  if (!correction || correction.hidden || !correction.targetRow || !correctionMovesSwimmer(correction, correction.targetRow)) return null;
  return { ...correction.targetRow, ...(correction.patch || {}) };
}

function bestTopRow(course, sex, category, additionalRows, corrections) {
  const intranapRows = readTopRows(course, sex, category);
  const importedRows = additionalRows.filter((row) => row.course === course && row.sex === sex && row.category === category);
  const reassignedRows = corrections
    .map(rowFromCorrection)
    .filter((row) => row && row.course === course && row.sex === sex && row.category === category);
  const rows = [...correctedRows([...intranapRows, ...importedRows], corrections), ...reassignedRows]
    .filter((row) => row.course === course && row.sex === sex && row.category === category && Number.isFinite(Number(row.timeValue)));
  const bestBySwimmer = new Map();
  rows.forEach((row) => {
    const key = rowSwimmerKey(row);
    const current = bestBySwimmer.get(key);
    if (!current || row.timeValue < current.timeValue || (row.timeValue === current.timeValue && String(row.date).localeCompare(current.date) < 0)) {
      bestBySwimmer.set(key, row);
    }
  });
  return Array.from(bestBySwimmer.values())
    .sort((a, b) => a.timeValue - b.timeValue || String(a.date).localeCompare(String(b.date)))[0] || null;
}

function categoryCode(sex, category) {
  if (/^M\d+\+$/.test(category)) return `${sex === "F" ? "F" : "H"}${category.replace("M", "")}`;
  const map = { P: "PO", B: "BE", M: "MI", C: "CA", J: "JU", S: "SE" };
  return `${sex === "F" ? "F" : "H"}${map[category] || category}`;
}

function isIndividualMpf(row, topCourses, topCategories) {
  return row &&
    !row.placeholderRecord &&
    row.sex &&
    topCategories.has(`${row.sex}|${row.category}`) &&
    topCourses.has(row.course) &&
    !String(row.style || "").startsWith("RELAY");
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function main() {
  const recordsData = jsData(recordsPath, "LIVEPALMES_RECORDS");
  const summary = jsData(summaryPath, "LIVEPALMES_INTRANAP_SUMMARY");
  const response = await fetch(additionalUrl, { cache: "no-store" });
  const payload = response.ok ? await response.json() : {};
  const additionalRows = Array.isArray(payload.performances) ? payload.performances : [];
  const corrections = Array.isArray(payload.corrections) ? payload.corrections : [];
  const topCourses = new Set(summary.filters.courses.map((course) => course.code));
  const topCategories = new Set(summary.filters.categories.map((category) => `${category.sex}|${category.code}`));
  const mpfByKey = new Map();

  (recordsData.records || []).forEach((row) => {
    if (!isIndividualMpf(row, topCourses, topCategories)) return;
    const key = `${row.sex}|${row.category}|${row.course}`;
    const current = mpfByKey.get(key);
    if (!current || Number(row.value) < Number(current.value) || (Number(row.value) === Number(current.value) && String(row.date).localeCompare(current.date) < 0)) {
      mpfByKey.set(key, row);
    }
  });

  const slower = [];
  const missingTop = [];
  for (const [key, mpf] of mpfByKey.entries()) {
    const top = bestTopRow(mpf.course, mpf.sex, mpf.category, additionalRows, corrections);
    if (!top) {
      missingTop.push(key);
      continue;
    }
    if (Number(mpf.value) > Number(top.timeValue)) {
      slower.push({
        key,
        code: categoryCode(mpf.sex, mpf.category),
        course: mpf.courseShortLabel || mpf.course,
        mpfTime: mpf.time,
        mpfSwimmer: mpf.swimmer,
        mpfClub: mpf.club,
        mpfDate: mpf.date,
        mpfLocation: mpf.location,
        topTime: top.time,
        topSwimmer: top.swimmer,
        topClub: top.club,
        topDate: top.date,
        topLocation: top.location,
        deltaCs: Number(mpf.value) - Number(top.timeValue)
      });
    }
  }

  slower.sort((a, b) => b.deltaCs - a.deltaCs || a.code.localeCompare(b.code, "fr-FR") || a.course.localeCompare(b.course, "fr-FR"));

  fs.mkdirSync(outputDir, { recursive: true });
  const csvRows = [
    ["categorie", "course", "ecart_centiemes", "mpf_temps", "mpf_nageur", "mpf_club", "mpf_date", "mpf_lieu", "top_temps", "top_nageur", "top_club", "top_date", "top_lieu"],
    ...slower.map((row) => [row.code, row.course, row.deltaCs, row.mpfTime, row.mpfSwimmer, row.mpfClub, row.mpfDate, row.mpfLocation, row.topTime, row.topSwimmer, row.topClub, row.topDate, row.topLocation])
  ];
  fs.writeFileSync(path.join(outputDir, "mpf-vs-top-slower.csv"), csvRows.map((row) => row.map(csvEscape).join(";")).join("\n") + "\n");

  const md = [
    "# MPF plus lentes que le rang 1 du TOP",
    "",
    `- Genere : ${new Date().toISOString()}`,
    `- Records updatedAt : ${recordsData.updatedAt}`,
    `- TOP generatedAt : ${summary.generatedAt}`,
    `- MPF comparees : ${mpfByKey.size}`,
    `- Cas detectes : ${slower.length}`,
    `- TOP manquant : ${missingTop.length}`,
    "",
    "| Categorie | Course | Ecart | MPF | TOP |",
    "|---|---:|---:|---|---|",
    ...slower.map((row) => `| ${row.code} | ${row.course} | ${row.deltaCs} cs | ${row.mpfTime} - ${row.mpfSwimmer} (${row.mpfClub}, ${row.mpfDate}, ${row.mpfLocation}) | ${row.topTime} - ${row.topSwimmer} (${row.topClub}, ${row.topDate}, ${row.topLocation}) |`),
    "",
    missingTop.length ? `TOP manquants : ${missingTop.join(", ")}` : ""
  ].join("\n");
  fs.writeFileSync(path.join(outputDir, "mpf-vs-top-slower.md"), md, "utf8");

  console.log(JSON.stringify({
    recordsUpdatedAt: recordsData.updatedAt,
    topGeneratedAt: summary.generatedAt,
    additionalRows: additionalRows.length,
    corrections: corrections.length,
    mpfCompared: mpfByKey.size,
    slowerCount: slower.length,
    missingTopCount: missingTop.length,
    csv: path.join(outputDir, "mpf-vs-top-slower.csv"),
    md: path.join(outputDir, "mpf-vs-top-slower.md"),
    top20: slower.slice(0, 20)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
