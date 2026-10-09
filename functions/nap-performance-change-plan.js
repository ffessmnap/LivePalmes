"use strict";
// Pure plans only. Callers must authorize, journal the before image and verify
// the fingerprint again under the native write lock before executing a plan.
const { createHash } = require("node:crypto");
const { parseCompactTime } = require("./nap-performance-normalization");
const COLUMNS = Object.freeze(["id", "nageur", "compet", "course", "cat", "tps", "points", "newpoints", "passage", "club", "relais", "pid", "classement"]);
function positiveId(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) throw new TypeError("Identifiant NAP invalide.");
  return value;
}
function nativeRow(row) {
  if (!row || COLUMNS.some(key => !Object.hasOwn(row, key))) throw new TypeError("Sauvegarde de performance incomplete.");
  positiveId(row.id);
  return Object.fromEntries(COLUMNS.map(key => [key, row[key]]));
}
function fingerprint(row, hidden = false) {
  if (typeof hidden !== "boolean") throw new TypeError("Etat de masquage invalide.");
  return createHash("sha256").update(JSON.stringify({ row: nativeRow(row), hidden })).digest("hex");
}
function integer(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) throw new TypeError("Valeur numerique invalide.");
  return value;
}
function planChange({ row, hidden = false, input, national = false }) {
  const before = nativeRow(row);
  if (!input || positiveId(input.performanceId) !== before.id || input.expectedFingerprint !== fingerprint(before, hidden)) {
    throw new TypeError("Le resultat a change. Rechargez avant de confirmer.");
  }
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!reason || reason.length > 500 || /[\u0000-\u001f]/.test(reason)) throw new TypeError("Motif de modification obligatoire.");
  if (!["correct", "hide", "restore", "delete"].includes(input.action)) throw new TypeError("Action de performance invalide.");
  if (input.action === "delete" && (!national || input.confirmDeletion !== true)) {
    throw new TypeError("Suppression definitive reservee au national, apres confirmation.");
  }
  const patch = input.patch;
  const after = { ...before };
  if (input.action === "correct") {
    if (!patch || Array.isArray(patch) || typeof patch !== "object" || !Object.keys(patch).length) throw new TypeError("Correction explicite requise.");
    for (const [key, value] of Object.entries(patch)) {
      if (key === "tps") {
        if (typeof value !== "string" || value.length > 10 || !/^\d+$/.test(value) || !parseCompactTime(value)) throw new TypeError("Temps NAP invalide.");
        after.tps = value; // Preserve native compact digits, including unpadded historical times.
      } else if (["points", "newpoints", "classement"].includes(key)) {
        after[key] = integer(value);
      } else if (key === "club") {
        // Club existence must be verified by the repository, using this id.
        after.club = String(positiveId(value));
      } else {
        throw new TypeError("Ce champ exige une correction distincte de sa fiche NAP.");
      }
    }
    if (COLUMNS.every(key => after[key] === before[key])) throw new TypeError("Aucune valeur ne change.");
  } else if (patch !== undefined && (typeof patch !== "object" || patch === null || Array.isArray(patch) || Object.keys(patch).length)) {
    throw new TypeError("Une action de masquage ou suppression ne corrige aucun champ.");
  }
  if (input.action === "hide" && hidden || input.action === "restore" && !hidden) throw new TypeError("Le resultat est deja dans cet etat.");
  return {
    action: input.action, performanceId: before.id, competitionId: positiveId(before.compet),
    reason, before, after: input.action === "delete" ? null : after,
    hiddenBefore: hidden, hiddenAfter: input.action === "hide" || input.action === "correct" && hidden,
    expectedFingerprint: input.expectedFingerprint,
    requiredClubId: input.action === "correct" && Object.hasOwn(patch, "club") ? Number(after.club) : null
  };
}
module.exports = { COLUMNS, positiveId, nativeRow, fingerprint, planChange };
