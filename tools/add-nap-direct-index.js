"use strict";
// Dedicated, explicitly authorized schema operation; never part of publication.
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { createNapPool } = require("../functions/nap-mysql");
const SPECS = {
  search: { table: "nageurs", name: "livepalmes_prenom_nom", columns: ["prenom", "nom", "date", "id"] },
  top: { table: "perfs", name: "livepalmes_course_relais_tps", columns: ["course", "relais", "tps", "id"] }
};
let operationStage = "confirmation";
async function main() {
  const kind = process.env.NAP_AUTHORIZED_INDEX;
  const spec = SPECS[kind];
  if (!spec || process.env.NAP_INDEX_CONFIRMATION !== `nap-add-${kind}-index` || process.env.TARGET_FIREBASE_PROJECT !== "livepalmes-test") throw new Error("Confirmation incorrecte.");
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== "livepalmes-test" || credentials.client_email !== "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") throw new Error("Compte incorrect.");
  operationStage = "secret-access";
  const password = execFileSync("gcloud", ["secrets", "versions", "access", "1", "--secret=LIVEPALMES_NAP_PASSWORD", "--project=livepalmes-test"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const pool = createNapPool(password);
  try {
    operationStage = "schema-read";
    const [definition] = await pool.execute({ sql: `SHOW CREATE TABLE \`${spec.table}\``, timeout: 10000 });
    fs.mkdirSync("outputs", { recursive: true });
    fs.writeFileSync(`outputs/nap-${kind}-schema-before.json`, JSON.stringify(definition, null, 2) + "\n");
    const [before] = await pool.execute({ sql: `SHOW INDEX FROM \`${spec.table}\``, timeout: 10000 });
    const existing = before.filter(row => row.Key_name === spec.name).sort((a, b) => a.Seq_in_index - b.Seq_in_index);
    if (existing.length && (existing.some(row => Number(row.Non_unique) !== 1) || existing.map(row => row.Column_name).join(",") !== spec.columns.join(","))) throw new Error("Index existant incompatible.");
    if (!existing.length) {
      operationStage = "index-add";
      await pool.query({ sql: `ALTER TABLE \`${spec.table}\` ADD INDEX \`${spec.name}\` (${spec.columns.map(column => `\`${column}\``).join(", ")})`, timeout: 120000 });
    }
    operationStage = "index-verify";
    const [after] = await pool.execute({ sql: `SHOW INDEX FROM \`${spec.table}\``, timeout: 10000 });
    const verified = after.filter(row => row.Key_name === spec.name).sort((a, b) => a.Seq_in_index - b.Seq_in_index);
    if (verified.length !== spec.columns.length || verified.some(row => Number(row.Non_unique) !== 1) || verified.map(row => row.Column_name).join(",") !== spec.columns.join(",")) throw new Error("Verification incomplete.");
    fs.writeFileSync(`outputs/nap-${kind}-index-result.json`, JSON.stringify({ table: spec.table, index: spec.name, columns: spec.columns, alreadyPresent: !!existing.length, verified: true }, null, 2) + "\n");
    console.log(`Index ${spec.name} verifie. Aucune ligne de donnees modifiee.`);
  } finally { await pool.end(); }
}
main().catch(error => {
  const code = typeof error.code === "string" && /^[A-Z_]+$/.test(error.code) ? error.code : "UNAVAILABLE";
  console.error(`Operation index NAP arretee a ${operationStage} (${code}). Consulter la structure avant une nouvelle tentative. Aucun secret affiche.`);
  process.exitCode = 1;
});
