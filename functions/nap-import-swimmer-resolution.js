"use strict";
// Bounded, in-memory resolution after grouped indexed NAP reads. File ids are
// hints, never proof of identity. Unknown/ambiguous identities require a choice.
const { positiveId } = require("./nap-performance-change-plan");
const text = value => String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ").toUpperCase();
function identity(row, native = false) {
  const lastName = text(native ? row.nom : row.lastName);
  const firstName = text(native ? row.prenom : row.firstName);
  const date = native ? row.date : row.birthDate;
  const sex = text(native ? row.sexe : row.sex);
  if (!lastName || !firstName || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !["F", "M"].includes(sex)) return null;
  const parsedDate = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return null;
  return JSON.stringify([lastName, firstName, date, sex]);
}
function resolveSwimmers(performances, candidates, bindings = []) {
  if (!Array.isArray(performances) || !performances.length || performances.length > 5000 || !Array.isArray(candidates) || candidates.length > 10000 || !Array.isArray(bindings) || bindings.length > performances.length) {
    throw new TypeError("Lot de rattachement hors limite.");
  }
  const byId = new Map(), byIdentity = new Map();
  for (const candidate of candidates) {
    const id = positiveId(candidate.id);
    if (byId.has(id)) throw new TypeError("Fiche NAP candidate en doublon.");
    byId.set(id, candidate);
    const key = identity(candidate, true);
    if (key) byIdentity.set(key, [...(byIdentity.get(key) || []), id]);
  }
  const choices = new Map();
  for (const binding of bindings) {
    if (!binding || !Number.isInteger(binding.rowIndex) || binding.rowIndex < 0 || binding.rowIndex >= performances.length || choices.has(binding.rowIndex)) throw new TypeError("Choix de rattachement invalide.");
    const id = positiveId(binding.swimmerId);
    if (!byId.has(id)) throw new TypeError("La fiche choisie doit etre relue dans NAP.");
    choices.set(binding.rowIndex, id);
  }
  const resolved = [], unresolved = [];
  performances.forEach((performance, rowIndex) => {
    if (choices.has(rowIndex)) {
      resolved.push({ rowIndex, swimmerId: choices.get(rowIndex), source: "explicit-choice" });
      return;
    }
    const key = identity(performance);
    const matching = key ? byIdentity.get(key) || [] : [];
    if (matching.length === 1) resolved.push({ rowIndex, swimmerId: matching[0], source: "exact-identity" });
    else unresolved.push({ rowIndex, reason: !key ? "incomplete-identity" : matching.length ? "ambiguous-identity" : "unknown-identity", candidateIds: matching });
  });
  return { canConfirm: unresolved.length === 0, resolved, unresolved };
}
module.exports = { identity, resolveSwimmers };
