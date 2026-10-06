"use strict";
const { createHash } = require("node:crypto");
const { createNapPool } = require("./nap-mysql");
const { swimmerId } = require("./nap-direct-swimmer");
const { fingerprint, planIdentityChange } = require("./nap-portal-swimmer-change");
const { COLUMNS, hash } = require("./nap-approved-swimmer-correction");
const rules = require("./nap-performance-normalization");
let pool;
function portalPool(password) { if (!pool) pool = createNapPool(password); return pool; }
function person(row) {
  const firstName = rules.cleanText(row.prenom), lastName = rules.cleanText(row.nom), id = String(row.id);
  return { id, swimmerId: id, swimmerIndexId: id, source: "reference", napSource: true, napFingerprint: fingerprint(row),
    firstName, lastName, name: [firstName, lastName].join(" "), birthDate: row.date, sex: row.sexe,
    clubId: String(row.club || ""), club: rules.cleanText(row.abre_club || row.nom_club), clubName: rules.cleanText(row.nom_club),
    identityKey: rules.swimmerIdentityKey(firstName, lastName, row.date), sourceIds: [id] };
}
async function searchPortalSwimmers(connection, query) {
  const result = await require("./nap-direct-search").searchDirectSwimmers(connection, query);
  if (!result.swimmers.length) return { ...result, swimmers: [] };
  const ids = result.swimmers.map(item => swimmerId(item.id));
  const [rows] = await connection.execute({ sql: `SELECT n.id,n.nom,n.prenom,n.date,n.sexe,n.club,cl.abre_club,cl.nom_club FROM nageurs n LEFT JOIN clubs cl ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club WHERE n.id IN (${ids.map(() => "?").join(",")}) ORDER BY n.nom,n.prenom,n.date,n.id LIMIT 20`, timeout: 10000 }, ids);
  return { ...result, swimmers: rows.map(person) };
}
async function listPortalClubSwimmers(connection, clubId) {
  if (!/^\d{1,16}$/.test(String(clubId))) throw new TypeError("Club NAP invalide.");
  const [rows] = await connection.execute({ sql: "SELECT n.id,n.nom,n.prenom,n.date,n.sexe,n.club,cl.abre_club,cl.nom_club FROM nageurs n FORCE INDEX (livepalmes_club_id) LEFT JOIN clubs cl ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club WHERE n.club=? ORDER BY n.id LIMIT 801", timeout: 10000 }, [String(clubId)]);
  if (rows.length > 800) throw new RangeError("Effectif superieur a 800 nageurs : pagination requise.");
  return rows.map(person);
}
async function correctPortalIdentity(connection, input, audit, linked) {
  const id = swimmerId(input?.id);
  if (!/^[a-f0-9]{64}$/.test(input.expectedFingerprint || "") || !input.actorUid || !input.reason?.trim() || input.reason.length > 500) throw new TypeError("Fiche et motif requis.");
  const fields = input.proposed;
  if (!fields || Object.keys(fields).some(key => !["firstName", "lastName", "birthDate", "sex"].includes(key))) throw new TypeError("Champs invalides.");
  const operation = createHash("sha256").update(JSON.stringify([id, input.expectedFingerprint, input.actorUid, Object.keys(fields).sort().map(key => [key, fields[key]])])).digest("hex");
  let saved = await audit.read(operation);
  const [rows] = await connection.execute({ sql: `SELECT ${COLUMNS.map(key => `\`${key}\``).join(",")} FROM nageurs WHERE id=? LIMIT 1`, timeout: 10000 }, [id]);
  if (rows.length !== 1) throw new TypeError("Nageur introuvable.");
  const row = rows[0];
  if (!saved) {
    const plan = planIdentityChange(row, fields, input.expectedFingerprint);
    const [duplicates] = await connection.execute({ sql: "SELECT id FROM nageurs FORCE INDEX (nageurs_clef) WHERE nom=? AND prenom=? AND date=? AND id<>? LIMIT 3", timeout: 10000 }, [plan.after.nom, plan.after.prenom, plan.after.date, id]);
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
    const sql = `UPDATE nageurs SET ${columns.map(key => `\`${key}\`=?`).join(",")} WHERE ${COLUMNS.map(key => `BINARY \`${key}\` <=> BINARY ?`).join(" AND ")} LIMIT 1`;
    const [result] = await connection.execute({ sql, timeout: 10000 }, [...columns.map(key => saved.after[key]), ...COLUMNS.map(key => saved.before[key])]);
    if (result.affectedRows !== 1) throw new TypeError("La fiche a change. Rechargez avant de corriger.");
  }
  const [verified] = await connection.execute({ sql: `SELECT ${COLUMNS.map(key => `\`${key}\``).join(",")} FROM nageurs WHERE id=? LIMIT 1`, timeout: 10000 }, [id]);
  if (verified.length !== 1 || hash(verified[0]) !== saved.afterHash) throw new Error("Verification NAP incomplete.");
  const dependentResult = await linked.apply(saved.dependent);
  const result = { ok: true, source: "nap", operation, alreadyApplied, swimmer: person(verified[0]), changedColumns: saved.changedColumns, ...dependentResult };
  await audit.complete(operation, { id, operation, actorUid: input.actorUid, changedColumns: saved.changedColumns, beforeHash: saved.beforeHash, afterHash: saved.afterHash, verified: true, ...dependentResult });
  return result;
}
module.exports = { portalPool, person, searchPortalSwimmers, listPortalClubSwimmers, correctPortalIdentity };
