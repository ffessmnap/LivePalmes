"use strict";
const fs = require("node:fs");
const path = require("node:path");

function text(value) { return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase(); }
function identity(person) {
  return [text(person.lastName).replace(/[^A-Z0-9]+/g, " ").trim(), text(person.firstName).replace(/[^A-Z0-9]+/g, " ").trim(),
    String(person.birthDate || ""), text(person.sex)].join("|");
}
function core(row, person) {
  return JSON.stringify([identity(person), String(row.date || ""), text(row.course), Number(row.timeValue),
    row.isIntermediate === true, text(row.originCourse)]);
}
const META = ["pool", "chrono", "categoryCode", "club", "regionId", "location"];
function metadata(row) { return JSON.stringify(META.map(key => text(row[key]))); }
function profiles(directory) {
  const files = new Set();
  const ids = new Map();
  for (const name of fs.readdirSync(path.join(directory, "ids"))) {
    if (!/^[a-z0-9]{2}\.json$/.test(name)) throw new Error("Index public invalide.");
    const index = JSON.parse(fs.readFileSync(path.join(directory, "ids", name), "utf8"));
    for (const [id, swimmer] of Object.entries(index)) {
      if (!/^swimmers\/[a-f0-9]{2}\/[a-f0-9]{40}\.json$/.test(swimmer.perfFile || "")) throw new Error("Chemin de fiche invalide.");
      files.add(swimmer.perfFile);
      ids.set(id, swimmer);
    }
  }
  return { ids, swimmers: [...files].map(file => JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"))) };
}

function compare(previous, candidate) {
  const nextIdentities = new Map(candidate.swimmers.map(person => [identity(person), person]));
  const nextRows = new Map();
  for (const person of candidate.swimmers) {
    for (const row of person.rows) {
      const key = core(row, person);
      if (!nextRows.has(key)) nextRows.set(key, new Map());
      const metas = nextRows.get(key);
      const meta = metadata(row);
      metas.set(meta, (metas.get(meta) || 0) + 1);
    }
  }
  const counts = { previousSwimmers: previous.swimmers.length, napSwimmers: candidate.swimmers.length,
    previousRows: 0, napRows: candidate.swimmers.reduce((sum, p) => sum + p.rows.length, 0), missingRows: 0, metadataChangedRows: 0,
    missingIdentities: 0, missingLinks: 0, conflictingLinks: 0, recoverableLinks: 0 };
  const samples = [];
  const deferred = [];
  const remaining = new Map([...nextRows].map(([key, metas]) => [key, new Map(metas)]));
  for (const person of previous.swimmers) {
    if (!nextIdentities.has(identity(person))) counts.missingIdentities++;
    for (const row of person.rows) {
      counts.previousRows++;
      const metas = remaining.get(core(row, person));
      const meta = metadata(row);
      if (metas?.get(meta)) { metas.set(meta, metas.get(meta) - 1); continue; }
      deferred.push({ person, row });
    }
  }
  // Preserve every exact match before pairing rows with changed metadata.
  for (const { person, row } of deferred) {
      const metas = remaining.get(core(row, person));
      const other = metas && [...metas].find(([, count]) => count > 0);
      if (other) { counts.metadataChangedRows++; metas.set(other[0], other[1] - 1); }
      else counts.missingRows++;
      if (samples.length < 30) samples.push({ kind: other ? "metadata-changed" : "missing", swimmerId: String(person.id),
        performanceId: String(row.id), date: row.date, course: row.course, time: row.time, pool: row.pool });
  }
  const aliases = [];
  for (const [id, previousPerson] of previous.ids) {
    const next = candidate.ids.get(id);
    const key = identity(previousPerson);
    if (next && identity(next) !== key) counts.conflictingLinks++;
    else if (!next) {
      const target = nextIdentities.get(key);
      if (target) { counts.recoverableLinks++; aliases.push({ oldId: id, targetId: String(target.id), identityKey: target.identityKey, sex: target.sex }); }
      else counts.missingLinks++;
    }
  }
  return { source: "nap", project: "livepalmes-test", ready: !counts.missingRows && !counts.metadataChangedRows &&
    !counts.missingIdentities && !counts.missingLinks && !counts.conflictingLinks && !counts.recoverableLinks, counts, samples, aliases };
}

function main() {
  if (process.argv.length !== 5) throw new Error("Reference, candidat et rapport requis.");
  const [before, after, reportPath] = process.argv.slice(2).map(p => path.resolve(p));
  const relative = path.relative(path.resolve("outputs"), reportPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Rapport de travail requis sous outputs.");
  const previousManifest = JSON.parse(fs.readFileSync(path.join(before, "manifest.json"), "utf8"));
  const nextManifest = JSON.parse(fs.readFileSync(path.join(after, "manifest.json"), "utf8"));
  if (nextManifest.source !== "nap") throw new Error("Candidat hors NAP refuse.");
  const result = compare(profiles(before), profiles(after));
  if (result.counts.previousRows !== previousManifest.rowCount || result.counts.napRows !== nextManifest.rowCount) throw new Error("Reference ou candidat incomplet.");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const { aliases, ...report } = result;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(path.join(path.dirname(reportPath), "nap-link-aliases.json"), JSON.stringify(aliases) + "\n");
  console.log(JSON.stringify({ ready: report.ready, counts: report.counts }, null, 2));
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { compare, identity };
