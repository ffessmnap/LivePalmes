"use strict";
// No schedule or backup is enabled by this tool. Check mode never locks or exports.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { spawn, execFileSync } = require("node:child_process");
const { Transform, Writable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { seal, open } = require("./production-backup-crypto");
const config = require("./nap-backup-config.json");
const DRIVE = "https://www.googleapis.com/drive/v3/files";
const CONFIRMATION = "NAP-PROD-SAUVEGARDE-ET-VERROUILLAGE-AUTORISES";
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function backupGate(settings, env) {
  if (settings.enabled !== true) fail("BACKUP_DISABLED");
  if (env.NAP_BACKUP_CONFIRMATION !== CONFIRMATION || env.GITHUB_REF !== "refs/heads/main") fail("BACKUP_NOT_AUTHORIZED");
}
function encryptionKey(env) {
  const value = env.NAP_BACKUP_ENCRYPTION_KEY || "";
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value) || Buffer.from(value, "base64").length !== 32) fail("ENCRYPTION_KEY_REQUIRED");
  return Buffer.from(value, "base64");
}
function folderId(env) {
  if (!/^[A-Za-z0-9_-]{10,150}$/.test(env.NAP_BACKUP_FOLDER_ID || "")) fail("DRIVE_FOLDER_REQUIRED");
  return env.NAP_BACKUP_FOLDER_ID;
}
function identifier(name) {
  if (typeof name !== "string" || !name || name.length > 64 || name.includes("\0")) fail("INVALID_TABLE_NAME");
  return "`" + name.replace(/`/g, "``") + "`";
}
function planTables(tables, settings = config) {
  if (!tables.length || tables.length > settings.maxTables) fail("TABLE_BUDGET_EXCEEDED");
  if (new Set(tables.map(t => t.name)).size !== tables.length) fail("DUPLICATE_TABLE");
  if (tables.some(t => t.type !== "BASE TABLE" || !["MyISAM", "InnoDB"].includes(t.engine))) fail("UNSUPPORTED_TABLE_OR_VIEW");
  const bytes = tables.reduce((sum, t) => sum + Number(t.dataBytes || 0) + Number(t.indexBytes || 0), 0);
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > settings.maxDatabaseBytes) fail("DATABASE_BUDGET_EXCEEDED");
  return { bytes, count: tables.length, lockSql: "LOCK TABLES " + tables.map(t => identifier(t.name) + " READ").join(", ") };
}
async function responseJson(response) {
  if (!response.ok) fail("REMOTE_HTTP_" + response.status);
  return response.json();
}
async function serviceToken(env, settings = config, request = fetch) {
  const account = JSON.parse(fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (account.type !== "service_account" || account.project_id !== settings.secretProject || account.client_email !== settings.serviceAccount) fail("DEDICATED_ACCOUNT_REQUIRED");
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: account.client_email, scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/drive", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 };
  const message = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url") + "." + Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.sign("RSA-SHA256", Buffer.from(message), account.private_key).toString("base64url");
  const data = await responseJson(await request("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: message + "." + signature }), signal: AbortSignal.timeout(30000) }));
  if (!data.access_token) fail("GOOGLE_TOKEN_MISSING");
  return data.access_token;
}
function driveClient(token, request = fetch) {
  const headers = { Authorization: "Bearer " + token };
  async function metadata(id) {
    const fields = "id,name,mimeType,driveId,parents,trashed,capabilities(canAddChildren),size,md5Checksum";
    return responseJson(await request(`${DRIVE}/${encodeURIComponent(id)}?supportsAllDrives=true&fields=${encodeURIComponent(fields)}`, { headers, signal: AbortSignal.timeout(30000) }));
  }
  return {
    async checkFolder(id) {
      const folder = await metadata(id);
      if (folder.mimeType !== "application/vnd.google-apps.folder" || !folder.driveId || folder.trashed || !folder.capabilities?.canAddChildren) fail("SHARED_DRIVE_FOLDER_NOT_WRITABLE");
      return { id: folder.id, name: folder.name, driveId: folder.driveId };
    },
    async upload(id, name, encrypted) {
      // The only remote write is a new encrypted file; never replace or delete a file.
      const boundary = "livepalmes_" + crypto.randomBytes(16).toString("hex");
      const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [id], appProperties: { livepalmes: "nap-backup-v1" } })}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`), encrypted, Buffer.from(`\r\n--${boundary}--\r\n`)]);
      const created = await responseJson(await request("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id", { method: "POST", headers: { ...headers, "Content-Type": "multipart/related; boundary=" + boundary }, body, signal: AbortSignal.timeout(180000) }));
      if (!/^[A-Za-z0-9_-]+$/.test(created.id || "")) fail("DRIVE_UPLOAD_ID_MISSING");
      const stored = await metadata(created.id);
      const md5 = crypto.createHash("md5").update(encrypted).digest("hex");
      if (stored.trashed || !stored.parents?.includes(id) || Number(stored.size) !== encrypted.length || stored.md5Checksum !== md5) fail("DRIVE_UPLOAD_VERIFICATION_FAILED");
      return { id: created.id, bytes: encrypted.length, md5 };
    }
  };
}
async function secretPassword(token, settings = config) {
  const url = `https://secretmanager.googleapis.com/v1/projects/${settings.secretProject}/secrets/${settings.secretName}/versions/latest:access`;
  const data = await responseJson(await fetch(url, { headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(30000) }));
  const password = Buffer.from(data.payload?.data || "", "base64").toString("utf8");
  if (!password) fail("NAP_PASSWORD_MISSING");
  return password;
}
async function inspect(connection, settings = config) {
  const query = async sql => (await connection.query({ sql, timeout: 10000 }))[0];
  const [server] = await query("SELECT VERSION() AS version, DATABASE() AS databaseName, @@innodb_table_locks AS tableLocks");
  if (!/^5\.7\./.test(server.version) || server.databaseName !== "nage-palmes" || Number(server.tableLocks) !== 1) fail("NAP_RUNTIME_DRIFT");
  const tables = await query(`SELECT TABLE_NAME AS name,TABLE_TYPE AS type,ENGINE AS engine,DATA_LENGTH AS dataBytes,INDEX_LENGTH AS indexBytes FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME LIMIT ${settings.maxTables + 1}`);
  const plan = planTables(tables, settings);
  const grants = await query("SHOW GRANTS");
  if (grants.length > 100) fail("GRANT_BUDGET_EXCEEDED");
  const allowed = new Set();
  for (const row of grants) {
    const match = String(Object.values(row)[0]).match(/^GRANT (.+?) ON (\*\.\*|`nage-palmes`\.\*) TO /i);
    if (match) for (const item of match[1].split(",")) allowed.add(item.trim().toUpperCase());
  }
  if (!allowed.has("ALL PRIVILEGES") && !["SELECT", "LOCK TABLES", "SHOW VIEW", "TRIGGER", "EVENT"].every(p => allowed.has(p))) fail("BACKUP_PRIVILEGES_MISSING");
  const tls = await query("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
  if (!tls[0]?.Value) fail("TLS_REQUIRED");
  // The current source has none. Routines would require mysql.proc privileges
  // with this legacy client; triggers/events may touch tables outside our scope.
  for (const sql of ["SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE() LIMIT 1", "SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() LIMIT 1", "SELECT EVENT_NAME FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE() LIMIT 1"]) {
    if ((await query(sql)).length) fail("STORED_OBJECTS_REQUIRE_REVIEW");
  }
  return { server, tables, plan };
}
function optionValue(value) { return '"' + String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"'; }
function dumpOptions(names) {
  if (!Array.isArray(names) || !names.length || names.some(name => !/^[A-Za-z0-9_]+$/.test(name))) fail("DUMP_TABLE_NAMES_INVALID");
  return ["--defaults-extra-file=/run/nap-client.cnf", "--default-character-set=utf8mb4", "--ssl-mode=REQUIRED", "--set-gtid-purged=OFF", "--no-tablespaces", "--skip-lock-tables", "--skip-add-locks", "--quick", "--hex-blob", "--skip-routines", "--events", "--triggers", "--skip-comments", "nage-palmes", ...names];
}
async function collectDump(child, settings = config) {
  let sqlBytes = 0, compressedBytes = 0;
  const chunks = [];
  // Discard SQL/client stderr: it may contain private values or connection details.
  child.stderr.resume();
  const exited = new Promise((resolve, reject) => {
    child.once("error", () => reject(Object.assign(new Error("DUMP_PROCESS_FAILED"), { safeCode: "DUMP_PROCESS_FAILED" })));
    child.once("exit", code => code === 0 ? resolve() : reject(Object.assign(new Error("DUMP_PROCESS_FAILED"), { safeCode: "DUMP_PROCESS_FAILED" })));
  });
  const meter = new Transform({ transform(chunk, encoding, next) { sqlBytes += chunk.length; next(sqlBytes > settings.maxSqlBytes ? Object.assign(new Error("SQL_BUDGET_EXCEEDED"), { safeCode: "SQL_BUDGET_EXCEEDED" }) : null, chunk); } });
  const sink = new Writable({ write(chunk, encoding, next) { compressedBytes += chunk.length; if (compressedBytes > settings.maxCompressedBytes) return next(Object.assign(new Error("COMPRESSED_BUDGET_EXCEEDED"), { safeCode: "COMPRESSED_BUDGET_EXCEEDED" })); chunks.push(chunk); next(); } });
  await Promise.all([exited, pipeline(child.stdout, meter, zlib.createGzip(), sink)]);
  if (!sqlBytes) fail("EMPTY_DUMP");
  return Buffer.concat(chunks);
}
async function lockedExport({ connection, plan, dump, stop, settings = config }) {
  let expired = false;
  const timer = setTimeout(() => { expired = true; connection.destroy(); stop(); }, settings.maxLockMilliseconds);
  try {
    await connection.query({ sql: "SET SESSION lock_wait_timeout=10", timeout: 12000 });
    await connection.query({ sql: "SET SESSION innodb_lock_wait_timeout=10", timeout: 12000 });
    await connection.query({ sql: "SET autocommit=0", timeout: 12000 });
    // READ, not READ LOCAL: also block concurrent MyISAM inserts. One DB only.
    await connection.query({ sql: plan.lockSql, timeout: 15000 });
    const packed = await dump();
    if (expired) fail("LOCK_TIME_BUDGET_EXCEEDED");
    return packed;
  } finally {
    clearTimeout(timer);
    // Closing the dedicated connection releases every lock, including on failure.
    connection.destroy();
    stop();
  }
}
async function saveEncrypted({ packed, key, drive, folder, outputDir, now = new Date() }) {
  const encrypted = seal(packed, key);
  if (!crypto.timingSafeEqual(crypto.createHash("sha256").update(open(encrypted, key)).digest(), crypto.createHash("sha256").update(packed).digest())) fail("ENCRYPTION_VERIFICATION_FAILED");
  const name = "nap-" + now.toISOString().replace(/[:.]/g, "-") + "-" + crypto.randomBytes(4).toString("hex") + ".sql.gz.enc";
  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  const destination = path.join(outputDir, name);
  fs.writeFileSync(destination, encrypted, { flag: "wx", mode: 0o600 });
  // Keep the encrypted local copy even if Drive is unavailable.
  const stored = await drive.upload(folder, name, encrypted);
  return { file: name, ...stored, sha256: crypto.createHash("sha256").update(encrypted).digest("hex") };
}
async function main(env = process.env, args = process.argv.slice(2)) {
  const mode = args[0] || "--check";
  if (!["--check", "--backup", "--decrypt"].includes(mode)) fail("INVALID_MODE");
  if (mode === "--decrypt") {
    if (args.length !== 3) fail("DECRYPT_PATHS_REQUIRED");
    fs.writeFileSync(args[2], open(fs.readFileSync(args[1]), encryptionKey(env)), { flag: "wx", mode: 0o600 });
    console.log("Archive authentifiee et dechiffree localement ; aucune restauration SQL.");
    return;
  }
  if (mode === "--backup") backupGate(config, env);
  const folder = folderId(env), key = encryptionKey(env);
  const token = await serviceToken(env), drive = driveClient(token);
  const target = await drive.checkFolder(folder);
  const password = await secretPassword(token);
  const mysql = require("../functions/node_modules/mysql2/promise");
  const { napPoolOptions } = require("../functions/nap-mysql");
  const { connectionLimit, waitForConnections, queueLimit, ...options } = napPoolOptions(password);
  const connection = await mysql.createConnection(options);
  let temporary, child, container;
  function stop() {
    if (child && child.exitCode === null) child.kill("SIGKILL");
    if (container) { try { execFileSync("docker", ["rm", "-f", container], { stdio: "ignore", timeout: 10000 }); } catch {} }
  }
  try {
    const details = await inspect(connection);
    const summary = { mode, version: details.server.version, tables: details.plan.count, physicalBytes: details.plan.bytes, sharedDriveAccessible: true, folder: target.id, enabled: config.enabled };
    if (mode === "--check") { console.log(JSON.stringify({ ...summary, backupStarted: false, locksRequested: false })); return; }
    // Prepare client and credentials BEFORE blocking database writes.
    execFileSync("docker", ["pull", config.clientImage], { stdio: "ignore", timeout: 180000 });
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-nap-"));
    const defaults = path.join(temporary, "client.cnf");
    fs.writeFileSync(defaults, `[client]\nhost=${optionValue(options.host)}\nport=${options.port}\nuser=${optionValue(options.user)}\npassword=${optionValue(password)}\n`, { flag: "wx", mode: 0o600 });
    container = "livepalmes-nap-backup-" + crypto.randomBytes(8).toString("hex");
    const packed = await lockedExport({ connection, plan: details.plan, stop, dump: () => {
      child = spawn("docker", ["run", "--rm", "--name", container, "--network=host", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--mount", `type=bind,source=${defaults},target=/run/nap-client.cnf,readonly`, "--entrypoint=mysqldump", config.clientImage, ...dumpOptions(details.tables.map(t => t.name))], { stdio: ["ignore", "pipe", "pipe"] });
      return collectDump(child);
    } });
    const stored = await saveEncrypted({ packed, key, drive, folder, outputDir: path.resolve("outputs/nap-backups") });
    console.log(JSON.stringify({ ...summary, backupStarted: true, locksReleased: true, stored }));
  } finally {
    connection.destroy(); stop();
    if (temporary) { fs.rmSync(path.join(temporary, "client.cnf"), { force: true }); fs.rmdirSync(temporary); }
  }
}
module.exports = { backupGate, encryptionKey, planTables, dumpOptions, collectDump, lockedExport, saveEncrypted, driveClient, inspect, main, CONFIRMATION };
if (require.main === module) main().catch(error => { console.error("Sauvegarde NAP arretee : " + (error.safeCode || "OPERATION_FAILED") + ". Aucune relance automatique ; examiner le resultat avant reprise."); process.exitCode = 1; });
