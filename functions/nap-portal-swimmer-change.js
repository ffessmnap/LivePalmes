"use strict";
const { createHash } = require("node:crypto");
const {nativeEqual}=require("./nap-native-compare");
const { swimmerId } = require("./nap-direct-swimmer");
const EDITABLE = ["firstName", "lastName", "birthDate", "sex"];
function fingerprint(row) {
  return createHash("sha256").update(JSON.stringify([row.id, row.nom, row.prenom, row.date, row.sexe, row.club])).digest("hex");
}
function name(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 64 || /[\u0000-\u001f\u007f]/.test(value)) throw new TypeError("Nom et prenom requis, 64 caracteres maximum.");
  return value.trim();
}
function birthDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("Date de naissance invalide.");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new TypeError("Date de naissance invalide.");
  return value;
}
function planIdentityChange(row, proposed, expectedFingerprint) {
  if (!row || !proposed || typeof proposed !== "object" || Array.isArray(proposed) || Object.keys(proposed).some(key => !EDITABLE.includes(key))) throw new TypeError("Champs de correction invalides.");
  const id = swimmerId(row.id), before = { ...row, id };
  const hash = fingerprint(before);
  if (expectedFingerprint && expectedFingerprint !== hash) throw new TypeError("La fiche a change. Rechargez avant de corriger.");
  const after = { id, nom: name(proposed.lastName ?? row.nom), prenom: name(proposed.firstName ?? row.prenom), date: birthDate(proposed.birthDate ?? row.date), sexe: String(proposed.sex ?? row.sexe), club: row.club };
  if (!["F", "M"].includes(after.sexe)) throw new TypeError("Sexe invalide.");
  const changedColumns = ["nom", "prenom", "date", "sexe"].filter(key => after[key] !== before[key]);
  if (!changedColumns.length) throw new TypeError("Aucune modification.");
  // This is a plan only. No caller currently executes the statement.
  // Compare raw old values, including club, to avoid overwriting a concurrent edit.
  return { source: "nap", mode: "swimmer-identity-preview", writesExecuted: false, id, before, after, expectedFingerprint: hash, changedColumns,
    sql: `UPDATE nageurs SET nom=?,prenom=?,date=?,sexe=? WHERE id=? AND ${nativeEqual("nom","=")} AND ${nativeEqual("prenom","=")} AND date=? AND BINARY sexe=BINARY ? AND BINARY club=BINARY ? LIMIT 1`,
    parameters: [after.nom, after.prenom, after.date, after.sexe, id, row.nom, row.prenom, row.date, row.sexe, row.club] };
}
async function previewIdentityChange(pool, input) {
  const id = swimmerId(input?.id);
  const [rows] = await pool.execute({ sql: "SELECT id,nom,prenom,date,sexe,club FROM nageurs WHERE id=? LIMIT 1", timeout: 10000 }, [id]);
  if (!rows.length) throw new TypeError("Nageur introuvable.");
  const plan = planIdentityChange(rows[0], input.proposed, input.expectedFingerprint);
  const [matches] = await pool.execute({ sql: "SELECT id FROM nageurs FORCE INDEX (nageurs_clef) WHERE nom=? AND prenom=? AND date=? AND id<>? LIMIT 3", timeout: 10000 }, [plan.after.nom, plan.after.prenom, plan.after.date, id]);
  return { ...plan, possibleDuplicateIds: matches.map(row => String(row.id)) };
}
module.exports = { fingerprint, planIdentityChange, previewIdentityChange };
