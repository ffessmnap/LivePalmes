"use strict";
const {notMerged}=require("./nap-swimmer-merge-state");
const { createHash } = require("node:crypto");
const {nativeEqual}=require("./nap-native-compare");
const { portalPool } = require("./nap-portal-pool");
const { swimmerId } = require("./nap-swimmer-values");
const { fingerprint } = require("./nap-swimmer-identity-values");
const { planIdentityChange } = require("./nap-portal-swimmer-change");
const { COLUMNS, hash } = require("./nap-approved-swimmer-correction");

const licenseState = require("./nap-license-state");
const mergeState = require("./nap-swimmer-merge-state");


const { person } = require("./nap-swimmer-profile");
const { searchPortalSwimmers, listPortalClubSwimmers, listNationalSwimmers } = require("./nap-portal-swimmer-readers");

// National directory: one indexed keyset page, no legacy roster or per-row read.

async function correctPortalIdentity(connection, input, audit, linked) {
  const id = swimmerId(input?.id);
  if (!/^[a-f0-9]{64}$/.test(input.expectedFingerprint || "") || !input.actorUid || !input.reason?.trim() || input.reason.length > 500) throw new TypeError("Fiche et motif requis.");
  const fields = input.proposed;
  if (!fields || Object.keys(fields).some(key => !["firstName", "lastName", "birthDate", "sex"].includes(key))) throw new TypeError("Champs invalides.");
  const operation = createHash("sha256").update(JSON.stringify([id, input.expectedFingerprint, input.actorUid, Object.keys(fields).sort().map(key => [key, fields[key]])])).digest("hex");
  let saved = await audit.read(operation);
  const [rows] = await connection.execute({ sql: `SELECT ${COLUMNS.map(key => `\`${key}\``).join(",")} FROM nageurs WHERE id=? AND ${notMerged()} LIMIT 1`, timeout: 10000 }, [id]);
  if (rows.length !== 1) throw new TypeError("Nageur introuvable.");
  const row = rows[0];
  if (!saved) {
    const plan = planIdentityChange(row, fields, input.expectedFingerprint);
    const [duplicates] = await connection.execute({ sql: `SELECT id FROM nageurs FORCE INDEX (nageurs_clef) WHERE nom=? AND prenom=? AND date=? AND id<>? AND ${notMerged()} LIMIT 3`, timeout: 10000 }, [plan.after.nom, plan.after.prenom, plan.after.date, id]);
    if (duplicates.length) throw new TypeError("Une fiche identique existe deja. Verifiez les doublons avant de corriger.");
    const after = { ...row, ...plan.after };
    // Prepare bounded dependent updates before the irreversible MyISAM write.
    const dependent = await linked.prepare(person(row), person(after));
    saved = { id, operation, actorUid: input.actorUid, reason: input.reason.trim(), before: row, after, beforeHash: hash(row), afterHash: hash(after), changedColumns: plan.changedColumns, dependent };
    if (Buffer.byteLength(JSON.stringify(saved)) > 500000) throw new RangeError("Sauvegarde trop volumineuse pour cette correction.");
    await audit.prepare(operation, saved);
  }
  if (saved.id !== id || saved.actorUid !== input.actorUid || saved.beforeHash !== hash(saved.before) || saved.afterHash !== hash(saved.after) || fingerprint(saved.before) !== input.expectedFingerprint) throw new TypeError("Sauvegarde incompatible.");
  const currentHash = hash(row), alreadyApplied = currentHash === saved.afterHash;
  if (!alreadyApplied && currentHash !== saved.beforeHash) throw new TypeError("La fiche a change. Rechargez avant de corriger.");
  if (!alreadyApplied) {
    const columns = saved.changedColumns;
    if (!columns.length || columns.some(key => !["nom", "prenom", "date", "sexe"].includes(key))) throw new TypeError("Correction invalide.");
    const sql = `UPDATE nageurs SET ${columns.map(key => `\`${key}\`=?`).join(",")} WHERE ${notMerged()} AND ${COLUMNS.map(key => nativeEqual(`\`${key}\``)).join(" AND ")} LIMIT 1`;
    const [result] = await connection.execute({ sql, timeout: 10000 }, [...columns.map(key => saved.after[key]), ...COLUMNS.map(key => saved.before[key])]);
    if (result.affectedRows !== 1) throw new TypeError("La fiche a change. Rechargez avant de corriger.");
  }
  const [verified] = await connection.execute({ sql: `SELECT ${COLUMNS.map(key => `\`${key}\``).join(",")} FROM nageurs WHERE id=? AND ${notMerged()} LIMIT 1`, timeout: 10000 }, [id]);
  if (verified.length !== 1 || hash(verified[0]) !== saved.afterHash) throw new Error("Verification NAP incomplete.");
  const dependentResult = await linked.apply(saved.dependent);
  const result = { ok: true, source: "nap", operation, alreadyApplied, swimmer: person(verified[0]), changedColumns: saved.changedColumns, ...dependentResult };
  await audit.complete(operation, { id, operation, actorUid: input.actorUid, changedColumns: saved.changedColumns, beforeHash: saved.beforeHash, afterHash: saved.afterHash, verified: true, ...dependentResult });
  return result;
}
module.exports = { portalPool, person, searchPortalSwimmers, listPortalClubSwimmers, listNationalSwimmers, correctPortalIdentity };
