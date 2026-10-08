"use strict";
const { createHash } = require("node:crypto");
const {nativeEqual}=require("./nap-native-compare");
const OPERATION = "nap-correct-swimmer-912-fauvau";
const COLUMNS = ["id", "nom", "prenom", "date", "sexe", "club", "actif", "wc", "edf", "creation", "number"];
const hash = row => createHash("sha256").update(JSON.stringify(COLUMNS.map(key => row[key]))).digest("hex");
const afterRow = before => ({ ...before, nom: "FAUVAU" });
async function approvedSwimmerCorrection(pool, input, audit) {
  if (input?.confirmation !== OPERATION || !["prepare", "apply"].includes(input.phase)) throw new TypeError("Confirmation invalide.");
  const [rows] = await pool.execute({ sql: `SELECT ${COLUMNS.map(key => `\`${key}\``).join(",")} FROM nageurs WHERE id=? LIMIT 1`, timeout: 10000 }, [912]);
  if (rows.length !== 1) throw new TypeError("Nageur introuvable.");
  const current = rows[0];
  let preparation = await audit.read();
  if (!preparation) {
    if (input.phase !== "prepare" || current.nom !== "FAUVEAU" || current.prenom !== "Antoine") throw new TypeError("Identite differente de l'accord.");
    preparation = { operation: OPERATION, id: 912, before: current, beforeHash: hash(current), afterHash: hash(afterRow(current)), preparedAt: new Date().toISOString() };
    // Durable, protected backup must succeed before any MySQL mutation.
    await audit.prepare(preparation);
  }
  if (preparation.operation !== OPERATION || preparation.id !== 912 || preparation.before?.nom !== "FAUVEAU" || preparation.before?.prenom !== "Antoine" || preparation.beforeHash !== hash(preparation.before) || preparation.afterHash !== hash(afterRow(preparation.before))) throw new Error("Sauvegarde incompatible.");
  const currentHash = hash(current);
  if (![preparation.beforeHash, preparation.afterHash].includes(currentHash)) throw new TypeError("Fiche modifiee depuis la sauvegarde.");
  const base = { source: "nap", mode: "approved-swimmer-correction", operation: OPERATION, id: 912, changedColumns: ["nom"], beforeHash: preparation.beforeHash, afterHash: preparation.afterHash };
  if (input.phase === "prepare") return { ...base, before: preparation.before, writesExecuted: false };
  if (input.beforeHash !== preparation.beforeHash) throw new TypeError("Empreinte de sauvegarde requise.");
  const alreadyApplied = currentHash === preparation.afterHash;
  if (!alreadyApplied) {
    // Compare every saved column atomically; update only the authorized surname.
    const guards = COLUMNS.map(key => nativeEqual(`\`${key}\``)).join(" AND ");
    const [result] = await pool.execute({ sql: `UPDATE nageurs SET nom=? WHERE ${guards} LIMIT 1`, timeout: 10000 }, ["FAUVAU", ...COLUMNS.map(key => preparation.before[key])]);
    if (result.affectedRows !== 1) throw new Error("Modification concurrente, correction refusee.");
  }
  const [verified] = await pool.execute({ sql: `SELECT ${COLUMNS.map(key => `\`${key}\``).join(",")} FROM nageurs WHERE id=? LIMIT 1`, timeout: 10000 }, [912]);
  if (verified.length !== 1 || hash(verified[0]) !== preparation.afterHash) throw new Error("Verification incomplete, ne pas relancer sans controle.");
  const proof = { ...base, verified: true, alreadyApplied, writesExecuted: !alreadyApplied, verifiedAt: new Date().toISOString() };
  await audit.complete(proof);
  return proof;
}
module.exports = { OPERATION, COLUMNS, hash, approvedSwimmerCorrection };
