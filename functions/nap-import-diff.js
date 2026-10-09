"use strict";
// Preview only: no SQL and no write. The confirmed fingerprint must be checked
// against the current competition results again under the import write lock.
const { createHash } = require("node:crypto");
const { COLUMNS, positiveId, nativeRow } = require("./nap-performance-change-plan");
const { parseCompactTime } = require("./nap-performance-normalization");
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fields = COLUMNS.filter(key => key !== "id");
function signature(row) {
  return JSON.stringify(fields.map(key => key === "tps" ? parseCompactTime(row[key]) || String(row[key]) : row[key] === null ? null : String(row[key])));
}
function incomingRow(row, competitionId) {
  if (!row || Object.keys(row).length !== fields.length || fields.some(key => !Object.hasOwn(row, key)) || row.compet !== competitionId || !parseCompactTime(row.tps)) throw new TypeError("Ligne importee native incomplete ou hors competition.");
  if (typeof row.course !== "string" || !row.course || row.course.length > 10 || typeof row.cat !== "string" || row.cat.length > 11 || typeof row.club !== "string" || row.club.length > 16 || typeof row.tps !== "string" || row.tps.length > 10) throw new TypeError("Format natif de resultat invalide.");
  for (const key of ["nageur", "passage", "relais", "classement"]) if (!Number.isSafeInteger(row[key]) || row[key] < 0 || row[key] > 2147483647) throw new TypeError("Entier natif de resultat invalide.");
  if (row.pid !== null && (!Number.isSafeInteger(row.pid) || row.pid < 0 || row.pid > 2147483647)) throw new TypeError("Reference native de resultat invalide.");
  for (const key of ["points", "newpoints"]) if (!/^-?\d{1,18}$/.test(String(row[key])) || typeof row[key] === "number" && !Number.isSafeInteger(row[key])) throw new TypeError("Points natifs invalides.");
  return Object.fromEntries(fields.map(key => [key, row[key]]));
}
function planImportDiff({ competitionId, existing, incoming, ignoredRows = 0, unresolvedRows = 0 }) {
  positiveId(competitionId);
  if (!Array.isArray(existing) || !Array.isArray(incoming) || !incoming.length || existing.length > 5000 || incoming.length > 5000) throw new TypeError("Lot de resultats hors limite.");
  if (ignoredRows !== 0 || unresolvedRows !== 0) throw new TypeError("Resoudre toutes les lignes ignorees ou non raccordees avant remplacement.");
  const before = existing.map(nativeRow).sort((a, b) => a.id - b.id);
  if (new Set(before.map(row => row.id)).size !== before.length || before.some(row => row.compet !== competitionId)) throw new TypeError("Resultats existants ambigus ou hors competition.");
  const proposed = incoming.map(row => incomingRow(row, competitionId));
  const available = new Map();
  for (const row of before) {
    const key = signature(row), queue = available.get(key) || [];
    queue.push(row); available.set(key, queue);
  }
  const unchanged = [], additions = [];
  for (let rowIndex = 0; rowIndex < proposed.length; rowIndex++) {
    const row = proposed[rowIndex], matched = available.get(signature(row))?.shift();
    if (matched) unchanged.push({ rowIndex, performanceId: matched.id, row: matched });
    else additions.push({ rowIndex, row });
  }
  const removals = [...available.values()].flat().sort((a, b) => a.id - b.id);
  // Do not guess which heat/final or intermediate a changed line replaces.
  // Explicit removals and additions describe the full difference faithfully.
  const expectedFingerprint = hash(before);
  return { competitionId, expectedFingerprint, previewFingerprint: hash({ competitionId, expectedFingerprint, proposed }),
    unchanged, additions, removals, requiresReplacementConfirmation: before.length > 0 && Boolean(additions.length || removals.length),
    summary: { before: before.length, after: proposed.length, unchanged: unchanged.length, additions: additions.length, removals: removals.length } };
}
module.exports = { signature, planImportDiff };
