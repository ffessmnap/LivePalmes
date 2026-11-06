"use strict";
// Only the five new Direct tables. Plaintext snapshots never leave this runner.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { seal, open } = require("./production-backup-crypto");
const CANDIDATE = "5b76e1e37eddba618b25c41c92a8168446fe4115";
const app = path.resolve(process.env.DIRECT_APP_DIRECTORY || path.join(__dirname, ".."));
const schema = require(path.join(app, "functions/nap-direct-schema"));
const { createStore } = require(path.join(app, "functions/nap-direct-store"));
const { readActor } = require(path.join(app, "functions/nap-direct-service"));
const { PROJECTS } = require(path.join(app, "functions/livepalmes-environment"));
const mysql = require(path.join(app, "functions/node_modules/mysql2/promise"));
const hash = value => createHash("sha256").update(value).digest("hex");
const order = table => table.keys.find(key => key[0] === "PRIMARY").slice(2).map(name => "`" + name + "`").join(",");
function normalizeRows(table, rows) {
  const jsonColumns = new Set(table.columns.filter(column => column.type === "json").map(column => column.name));
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([name, value]) =>
    [name, jsonColumns.has(name) && typeof value === "string" ? JSON.parse(value) : value])));
}
async function snapshot(pool) {
  const connection = await pool.getConnection();
  try {
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await connection.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");
    const metadata = await schema.inspect(connection);
    assert(schema.validate(metadata).every(Boolean));
    const data = {};
    for (const table of schema.tables) {
      const [rows] = await connection.execute({ sql: "SELECT * FROM `" + table.name + "` WHERE environment=? ORDER BY " + order(table) + " LIMIT 200001", timeout: 30000 }, ["production"]);
      assert(rows.length <= 200000, "Limite de sauvegarde Direct atteinte");
      assert(rows.every(row => row.environment === "production"));
      data[table.name] = normalizeRows(table, rows);
    }
    const result = { schema: 1, environment: "production", planHash: schema.planHash, capturedAt: new Date().toISOString(), data };
    assert(Buffer.byteLength(JSON.stringify(result)) <= 64 * 1024 * 1024, "Sauvegarde Direct trop volumineuse");
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
async function restoreIsolated(value) {
  assert.equal(process.env.DIRECT_RESTORE_ALLOWED, "isolated-ci");
  const options = { host: "127.0.0.1", port: 33317, user: "root", password: process.env.DIRECT_RESTORE_PASSWORD,
    dateStrings: true, supportBigNumbers: true, bigNumberStrings: true, jsonStrings: true, multipleStatements: false };
  assert(options.password);
  const admin = await mysql.createConnection(options);
  const database = "lp_direct_restore_" + Date.now() + "_" + process.pid;
  try {
    const [[runtime]] = await admin.query("SELECT VERSION() AS version");
    assert.match(runtime.version, /^5\.7\./);
    await admin.query("CREATE DATABASE `" + database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    await admin.query("USE `" + database + "`");
    for (let index = 0; index < schema.tables.length; index++) {
      const table = schema.tables[index], rows = value.data[table.name];
      await admin.query(schema.sql[index]);
      const columns = table.columns.map(column => column.name);
      for (let offset = 0; offset < rows.length; offset += 200) {
        const batch = rows.slice(offset, offset + 200);
        const marks = batch.map(() => "(" + columns.map(() => "?").join(",") + ")").join(",");
        await admin.execute("INSERT INTO `" + table.name + "` (" + columns.map(name => "`" + name + "`").join(",") + ") VALUES " + marks,
          batch.flatMap(row => columns.map(name => row[name] !== null && typeof row[name] === "object" ? JSON.stringify(row[name]) : row[name])));
      }
      const [restored] = await admin.execute("SELECT * FROM `" + table.name + "` ORDER BY " + order(table) + " LIMIT 200001");
      // Field order comes from the exact schema in both databases.
      assert.deepEqual(normalizeRows(table, restored), rows, "Restauration Direct divergente");
    }
    assert(schema.validate(await schema.inspect(admin)).every(Boolean));
  } finally {
    await admin.query("DROP DATABASE IF EXISTS `" + database + "`");
    await admin.end();
  }
}
async function main() {
  const mode = process.env.DIRECT_DATA_MODE;
  assert(["check", "backup", "activate"].includes(mode));
  assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: app, encoding: "utf8" }).trim(), CANDIDATE);
  assert.equal(process.env.TARGET_FIREBASE_PROJECT, "livepalmes");
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  assert.equal(credentials.project_id, "livepalmes");
  assert.equal(credentials.client_email, "github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com");
  const secret = execFileSync("gcloud", ["secrets", "versions", "access", "latest", "--project=livepalmes", "--secret=LIVEPALMES_NAP_PASSWORD"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const { napPoolOptions } = require(path.join(app, "functions/nap-connection"));
  const pool = mysql.createPool({ ...napPoolOptions(secret), jsonStrings: true });
  const output = process.env.DIRECT_DATA_OUTPUT;
  assert(output);
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  try {
    const value = await snapshot(pool);
    console.log('Snapshot des cinq tables Direct production obtenu. Chiffrement et restauration isolee en cours.');
    const raw = Buffer.from(JSON.stringify(value)), encrypted = seal(raw, credentials.private_key);
    assert.deepEqual(open(encrypted, credentials.private_key), raw);
    const file = path.join(output, "direct-production.enc");
    fs.writeFileSync(file, encrypted, { mode: 0o600 });
    const verified = JSON.parse(open(fs.readFileSync(file), credentials.private_key));
    await restoreIsolated(verified);
    console.log('Sauvegarde rouverte et restauration MySQL 5.7 isolee verifiees.');
    const report = { schema: 1, candidate: CANDIDATE, mode, environment: "production", tables: schema.tables.map(table => table.name),
      capturedAt: value.capturedAt, encryptedSha256: hash(encrypted), reopenedAndCompared: true, restoredInIsolatedMysql57: true,
      retentionDays: 14, counts: Object.fromEntries(Object.entries(value.data).map(([name, rows]) => [name, rows.length])), nativeRowsWritten: 0, testRowsCopied: 0 };
    if (mode !== "backup") {
      const admin = require(path.join(app, "functions/node_modules/firebase-admin"));
      admin.initializeApp({ credential: admin.credential.cert(credentials) });
      const uid = PROJECTS.livepalmes.legacyAdminUids[0];
      assert.equal(PROJECTS.livepalmes.legacyAdminUids.length, 1);
      const user = await admin.auth().getUser(uid);
      assert.equal(user.disabled, false);
      const actor = await readActor({ auth: { uid } }, { db: admin.firestore(), adminUids: new Set(PROJECTS.livepalmes.legacyAdminUids) });
      assert.equal(actor.national, true);
      console.log('Compte administrateur existant actif et autorise. Verification de Paris 5220.');
      const store = createStore(pool, "production"), competition = await store.native(5220);
      assert.equal(competition.date, "2026-11-07");
      assert.equal(competition.eventType, "pool");
      assert.equal(competition.canceled, false);
      assert.match((competition.city + " " + competition.location).toLowerCase(), /paris/);
      report.competition = { id: 5220, name: competition.name, date: competition.date, city: competition.city, level: competition.level, region: competition.regionLabel };
      report.existingPilotActiveAndAuthorized = true;
      const before = await store.config(5220);
      if (mode === "activate") {
        assert.equal(process.env.DIRECT_ACTIVATION_CONFIRMATION, "direct-production-paris-5220");
        assert(!before || before.state === "active", "Etat Direct existant a examiner");
        if (!before) await store.settings(5220, actor, { state: "active", publicVisible: true, consoles: ["computer"], operationKey: "production-paris-5220-20261107" });
        const detail = await store.detail(5220);
        assert.equal(detail.config.state, "active");
        assert.equal(detail.config.publicVisible, true);
        assert.equal(detail.events.length, 0, "Aucun programme TEST ne doit etre repris");
        report.activated = true;
      }
      report.directConfigurationPresent = Boolean(await store.config(5220));
      await admin.app().delete();
    }
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally { await pool.end(); }
}
module.exports = { snapshot, restoreIsolated };
if (require.main === module) main().catch(error => { console.error("Controle Direct interrompu", error.code || error.name, "Consulter les prerequis, aucun secret affiche"); process.exitCode = 1; });
