"use strict";
// Explicit operator operation on the shared NAP projection. No access at import.
const fs = require("node:fs"), { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { TABLE, clubIdValue } = require("../functions/nap-club-account-emails");
const schema = require("../functions/nap-club-account-emails-schema");
const { seal, open } = require("./production-backup-crypto");
const { privatePath, writeOnce } = require("./club-merge-backup");
const MAX_ROWS = 10000, CONFIRMATION = "nap-shared-club-email-ids-int";
const ALTER_SQL = `ALTER TABLE ${TABLE} MODIFY COLUMN club_id INT NULL DEFAULT NULL, ALGORITHM=COPY, LOCK=EXCLUSIVE`;
const RESTORE_SQL = `ALTER TABLE ${TABLE} MODIFY COLUMN club_id VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL, ALGORITHM=COPY, LOCK=EXCLUSIVE`;
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function fail(code) { throw new Error(code); }
function normalized(rows) { return rows.map(row => {
  const id = clubIdValue(row.club_id);
  if (row.club_id !== null && id === null) fail("EMAIL_ID_INVALID_STORED_VALUE");
  return { ...row, club_id: id };
}); }
async function query(connection, sql, values = []) {
  return (await connection.execute({ sql, timeout: 10000 }, values))[0];
}
async function capture(connection) {
  const structure = await schema.inspect(connection);
  if (!structure.exists) fail("EMAIL_TABLE_MISSING");
  const native = await query(connection, "SELECT COLUMN_TYPE,IS_NULLABLE,COLUMN_KEY,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='clubs' AND COLUMN_NAME='num_club' LIMIT 2");
  if (native.length !== 1 || !/^int(?:\(11\))?$/.test(native[0].COLUMN_TYPE) || native[0].IS_NULLABLE !== "NO" || native[0].COLUMN_KEY !== "PRI" || native[0].EXTRA !== "auto_increment") fail("NATIVE_CLUB_ID_SCHEMA_CHANGED");
  const triggers = await query(connection, "SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE=? LIMIT 1", [TABLE]);
  const foreignKeys = await query(connection, "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL AND (TABLE_NAME=? OR REFERENCED_TABLE_NAME=?) LIMIT 1", [TABLE, TABLE]);
  if (triggers.length || foreignKeys.length) fail("UNREVIEWED_EMAIL_TABLE_DEPENDENCY");
  const rows = await query(connection, `SELECT firebase_uid,club_id,email,status,competition_notifications,source_version,synchronized_at FROM ${TABLE} FORCE INDEX (PRIMARY) ORDER BY firebase_uid LIMIT 10001`);
  if (rows.length > MAX_ROWS) fail("EMAIL_ID_ROW_BUDGET_EXCEEDED");
  const values = normalized(rows), ids = [...new Set(values.map(row => row.club_id).filter(id => id !== null))];
  const clubs = ids.length ? await query(connection, `SELECT num_club FROM clubs FORCE INDEX (PRIMARY) WHERE num_club IN (${ids.map(() => "?").join(",")}) ORDER BY num_club LIMIT 10001`, ids) : [];
  const existing = new Set(clubs.map(row => Number(row.num_club)));
  if (ids.some(id => !existing.has(id))) fail("EMAIL_ID_UNKNOWN_CLUB");
  const ddl = await query(connection, `SHOW CREATE TABLE ${TABLE}`);
  return { format: "nap-club-email-ids-v1", table: TABLE, structure, native: native[0], ddl: Object.values(ddl[0])[1], rows, clubs, semanticHash: hash(values) };
}
function saveBackup(snapshot, { primary, secondary, keyFile }) {
  const a = privatePath(primary), b = privatePath(secondary);
  if (a === b) fail("TWO_BACKUP_LOCATIONS_REQUIRED");
  const key = fs.readFileSync(privatePath(keyFile, { existing: true }));
  if (key.length < 32 || key.length > 4096) fail("PRIVATE_BACKUP_KEY_REQUIRED");
  const bytes = Buffer.from(JSON.stringify(snapshot)), encrypted = seal(bytes, key);
  writeOnce(a, encrypted); writeOnce(b, encrypted);
  for (const file of [a, b]) if (!open(fs.readFileSync(file), key).equals(bytes)) fail("EMAIL_ID_BACKUP_REOPEN_FAILED");
  return { verified: true, archiveHash: hash(encrypted.toString("base64")) };
}
async function migrate(connection, { confirmation, backup, restore = false } = {}) {
  if (confirmation !== (restore ? "nap-shared-club-email-ids-restore" : CONFIRMATION) || typeof backup !== "function") fail("EMAIL_ID_MIGRATION_APPROVAL_REQUIRED");
  // DDL commits implicitly. Never pretend that transaction rollback undoes ALTER.
  await connection.query("SET SESSION lock_wait_timeout=10");
  await connection.query("SET SESSION innodb_lock_wait_timeout=10");
  await connection.query("SET SESSION sql_mode=CONCAT(@@sql_mode,',STRICT_ALL_TABLES')");
  await connection.query("SET autocommit=0");
  try {
    await connection.query(`LOCK TABLES ${TABLE} WRITE, clubs READ`);
    const before = await capture(connection), target = restore ? "varchar" : "int";
    if (before.structure.clubIdType === target) return { changed: false, verified: true, accounts: before.rows.length, clubIdType: target, dataRowsWritten: false };
    const saved = await backup(before);
    if (saved?.verified !== true) fail("EMAIL_ID_BACKUP_REQUIRED");
    const fresh = await capture(connection);
    if (hash(before) !== hash(fresh)) fail("EMAIL_ID_PRE_ALTER_DRIFT");
    await connection.query(restore ? RESTORE_SQL : ALTER_SQL);
    // ALTER can release a table lock: reacquire before checking the result.
    await connection.query(`LOCK TABLES ${TABLE} WRITE, clubs READ`);
    const after = await capture(connection);
    if (after.structure.clubIdType !== target || after.semanticHash !== before.semanticHash) fail("EMAIL_ID_POST_ALTER_REVIEW_REQUIRED");
    return { changed: true, verified: true, accounts: after.rows.length, clubIdType: target, semanticHash: after.semanticHash, backupHash: saved.archiveHash, dataRowsWritten: false };
  } finally {
    await connection.query("UNLOCK TABLES");
    await connection.query("SET autocommit=1");
  }
}
async function main(args = process.argv.slice(2), env = process.env) {
  const [mode, primary, secondary, keyFile] = args;
  if (!(["inspect", "apply", "restore"].includes(mode)) || args.length !== (mode === "inspect" ? 1 : 4)) fail("EMAIL_ID_COMMAND_REQUIRED");
  if (mode !== "inspect") {
    const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    if (git("branch", "--show-current") !== "main" || !/^[a-f0-9]{40}$/.test(env.NAP_EMAIL_IDS_EXPECTED_COMMIT || "") || git("rev-parse", "HEAD") !== env.NAP_EMAIL_IDS_EXPECTED_COMMIT || git("rev-parse", "origin/main") !== env.NAP_EMAIL_IDS_EXPECTED_COMMIT) fail("EMAIL_ID_EXACT_MAIN_REQUIRED");
    for (const file of ["tools/migrate-nap-club-email-ids.js", "functions/nap-club-account-emails.js", "functions/nap-club-account-emails-schema.js"]) {
      if (git("show", "HEAD:" + file).replace(/\r\n/g, "\n") !== fs.readFileSync(file, "utf8").trim().replace(/\r\n/g, "\n")) fail("EMAIL_ID_UNCOMMITTED_SOURCE");
    }
    if (env.NAP_EMAIL_IDS_CONFIRMATION !== (mode === "restore" ? "nap-shared-club-email-ids-restore" : CONFIRMATION)) fail("EMAIL_ID_MIGRATION_APPROVAL_REQUIRED");
  }
  const auth = require("./club-merge-auth");
  if (!env.NAP_DB_PASSWORD && env.NAP_EMAIL_IDS_LOAD_NAP_SECRET !== "1") fail("NAP_CREDENTIALS_REQUIRED");
  const token = auth.tokenProvider({ mode: "gcloud", account: env.NAP_EMAIL_IDS_GCLOUD_ACCOUNT || "" });
  const password = env.NAP_DB_PASSWORD || await auth.existingNapPassword(token);
  const { connectionLimit, waitForConnections, queueLimit, ...options } = require("../functions/nap-connection").napPoolOptions(password);
  const connection = await require("../functions/node_modules/mysql2/promise").createConnection(options);
  try {
    if (mode === "inspect") {
      await connection.query("START TRANSACTION READ ONLY");
      try {
        const state = await capture(connection);
        console.log(JSON.stringify({ mode, clubIdType: state.structure.clubIdType, accounts: state.rows.length, withClub: state.rows.filter(r => r.club_id !== null).length, distinctClubs: state.clubs.length, verified: true, writes: 0 }));
      } finally { await connection.rollback(); }
    } else console.log(JSON.stringify(await migrate(connection, { confirmation: env.NAP_EMAIL_IDS_CONFIRMATION, restore: mode === "restore", backup: snapshot => saveBackup(snapshot, { primary, secondary, keyFile }) })));
  } finally { await connection.end(); }
}
module.exports = { capture, migrate, normalized, saveBackup, MAX_ROWS, CONFIRMATION, ALTER_SQL, RESTORE_SQL, main };
if (require.main === module) main().catch(error => {
  console.error(/^[A-Z][A-Z0-9_]{3,100}$/.test(error.message || "") ? error.message : "EMAIL_ID_OPERATION_STOPPED_REVIEW_REQUIRED");
  process.exitCode = 1;
});
