"use strict";
// Separate, explicitly authorized additive migration. Never run by a deployment.
const { createHash } = require("node:crypto");
const table = "livepalmes_competition_options";
const sql = "ALTER TABLE `livepalmes_competition_options` ADD COLUMN `entry_closed` tinyint NULL DEFAULT NULL";
const digest = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const planHash = digest(sql);
function validColumn(rows) {
  if (!rows.length) return false;
  const c = rows[0];
  if (rows.length !== 1 || c.Field !== "entry_closed" || !/^tinyint(?:\(4\))?$/.test(c.Type) || c.Null !== "YES" || c.Default !== null || c.Extra || c.Key) throw new TypeError("Champ de fermeture incompatible.");
  return true;
}
async function approvedClosureSchema(pool, input) {
  if (input?.confirmation !== "nap-add-shared-entry-closure" || !["prepare", "apply"].includes(input.phase)) throw new TypeError("Confirmation invalide.");
  const connection = await pool.getConnection(); let locked = false;
  const query = async (sql, values = []) => (await connection.execute({ sql, timeout: 10000 }, values))[0];
  try {
    if (input.phase === "apply") {
      if (input.planHash !== planHash) throw new TypeError("Plan non confirme.");
      const lock = await query("SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired");
      if (Number(lock[0]?.acquired) !== 1) throw new Error("Operation de structure deja en cours.");
      locked = true;
    }
    const definition = await query("SHOW CREATE TABLE `livepalmes_competition_options`");
    if (definition.length !== 1 || !/ENGINE=InnoDB\b/.test(definition[0]["Create Table"] || "")) throw new TypeError("Table complementaire incompatible.");
    const present = validColumn(await query("SHOW COLUMNS FROM `livepalmes_competition_options` LIKE 'entry_closed'"));
    const schemaHash = digest(definition);
    const result = { source: "nap", mode: "approved-closure-schema", table, sql, planHash, schemaHash, alreadyPresent: present, dataRowsWritten: false };
    if (input.phase === "prepare") return { ...result, definition };
    if (input.schemaHash !== schemaHash) throw new TypeError("Structure modifiee depuis la sauvegarde.");
    if (!present) {
      const processes = await query("SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)[[:space:]]' LIMIT 101");
      if (processes.length) throw new Error("Ecriture en cours : operation differee.");
      await connection.query({ sql, timeout: 120000 });
    }
    if (!validColumn(await query("SHOW COLUMNS FROM `livepalmes_competition_options` LIKE 'entry_closed'"))) throw new Error("Verification incomplete.");
    return { ...result, verified: true };
  } finally {
    try { if (locked) await query("SELECT RELEASE_LOCK('livepalmes_portal_schema')"); }
    finally { connection.release(); }
  }
}
module.exports = { table, sql, planHash, validColumn, approvedClosureSchema };
