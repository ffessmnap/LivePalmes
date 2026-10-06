"use strict";
const { createHash } = require("node:crypto");
const SPECS = {
  search: { table: "nageurs", name: "livepalmes_prenom_nom", columns: ["prenom", "nom", "date", "id"] },
  top: { table: "perfs", name: "livepalmes_course_relais_tps", columns: ["course", "relais", "tps", "id"] }
};
function validIndex(rows, spec) {
  const found = rows.filter(row => row.Key_name === spec.name).sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index));
  if (!found.length) return false;
  if (found.length !== spec.columns.length || found.some((row, i) => Number(row.Non_unique) !== 1 || row.Sub_part != null || row.Column_name !== spec.columns[i])) throw new Error("Index incompatible.");
  return true;
}
async function approvedIndexOperation(pool, input) {
  const spec = SPECS[input?.index];
  if (!spec || input.confirmation !== `nap-add-${input.index}-index` || !["prepare", "apply"].includes(input.phase)) throw new TypeError("Confirmation invalide.");
  const [definition] = await pool.execute({ sql: `SHOW CREATE TABLE \`${spec.table}\``, timeout: 10000 });
  const schemaHash = createHash("sha256").update(JSON.stringify(definition)).digest("hex");
  const [indexes] = await pool.execute({ sql: `SHOW INDEX FROM \`${spec.table}\``, timeout: 10000 });
  const present = validIndex(indexes, spec);
  const base = { source: "nap", mode: "approved-index", table: spec.table, index: spec.name, columns: spec.columns, schemaHash, alreadyPresent: present };
  if (input.phase === "prepare") return { ...base, definition };
  if (!present) {
    if (input.schemaHash !== schemaHash) throw new TypeError("Structure modifiee depuis la preparation.");
    const [processes] = await pool.query({ sql: "SHOW PROCESSLIST", timeout: 10000 });
    if (processes.some(row => /^\s*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)\b/i.test(String(row.Info || "")))) throw new Error("Ecriture en cours.");
    await pool.query({ sql: `ALTER TABLE \`${spec.table}\` ADD INDEX \`${spec.name}\` (${spec.columns.map(column => `\`${column}\``).join(", ")})`, timeout: 120000 });
  }
  const [after] = await pool.execute({ sql: `SHOW INDEX FROM \`${spec.table}\``, timeout: 10000 });
  if (!validIndex(after, spec)) throw new Error("Verification incomplete.");
  return { ...base, verified: true };
}
module.exports = { approvedIndexOperation, validIndex };
