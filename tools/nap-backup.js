"use strict";
// Automatic backups remain disabled until the manual trial is restored and verified.
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
function backupGate(settings, env, mode = "backup") {
  const trial = mode === "trial" && env.GITHUB_EVENT_NAME === "workflow_dispatch";
  if (settings.enabled !== true && !trial) fail("BACKUP_DISABLED");
  if (env.NAP_BACKUP_CONFIRMATION !== CONFIRMATION || env.GITHUB_REF !== "refs/heads/main") fail("BACKUP_NOT_AUTHORIZED");
  if (env.GITHUB_EVENT_NAME === "schedule") require("./nap-backup-restore").checkScheduleProof(env);
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
    async download(folder, stored) {
      const metadataValue = await metadata(stored.id);
      if (metadataValue.trashed || !metadataValue.parents?.includes(folder) || Number(metadataValue.size) !== stored.bytes || stored.bytes > config.maxCompressedBytes + 1024) fail("DRIVE_DOWNLOAD_METADATA_DIFFERS");
      const response = await request(DRIVE + "/" + encodeURIComponent(stored.id) + "?alt=media&supportsAllDrives=true", { headers, signal: AbortSignal.timeout(180000) });
      if (!response.ok) fail("DRIVE_DOWNLOAD_FAILED");
      const chunks = []; let bytes = 0;
      for await (const chunk of response.body) { bytes += chunk.length; if (bytes > stored.bytes) fail("DRIVE_DOWNLOAD_BUDGET_EXCEEDED"); chunks.push(Buffer.from(chunk)); }
      const encrypted = Buffer.concat(chunks);
      if (bytes !== stored.bytes || crypto.createHash("sha256").update(encrypted).digest("hex") !== stored.sha256) fail("DRIVE_DOWNLOAD_DIFFERS");
      return encrypted;
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
  return ["--defaults-extra-file=/run/nap-client.cnf", "--default-character-set=utf8mb4", "--ssl-mode=REQUIRED", "--compress", "--set-gtid-purged=OFF", "--no-tablespaces", "--skip-lock-tables", "--skip-add-locks", "--quick", "--hex-blob", "--skip-routines", "--skip-events", "--skip-triggers", "--skip-comments", "--order-by-primary", "nage-palmes", ...names];
}
function clientContainerArguments(defaults, container, identity = { uid: process.getuid?.(), gid: process.getgid?.() }) {
  if (!Number.isSafeInteger(identity.uid) || !Number.isSafeInteger(identity.gid) || identity.uid < 0 || identity.gid < 0) fail("LINUX_CLIENT_IDENTITY_REQUIRED");
  return ["run", "--rm", "--name", container, "--user", identity.uid + ":" + identity.gid, "--network=host", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--mount", "type=bind,source=" + defaults + ",target=/run/nap-client.cnf,readonly", "--entrypoint=mysqldump", config.clientImage];
}
function dumpFailure(stderr) {
  if (/could not open required defaults file|fatal error in defaults handling/i.test(stderr)) return "DUMP_CLIENT_CONFIG_UNREADABLE";
  if (/unknown (?:variable|option)/i.test(stderr)) return "DUMP_CLIENT_OPTIONS_INVALID";
  const code=stderr.match(/\b(?:error|errno)\s*(?::\s*|\s+|\()\s*(\d{3,5})\b/i);
  return code ? "DUMP_MYSQL_" + code[1] : /SSL|TLS/i.test(stderr) ? "DUMP_TLS_FAILED" : "DUMP_PROCESS_FAILED";
}
async function collectDump(child, settings = config, progress = () => {}) {
  let sqlBytes = 0, compressedBytes = 0;
  const chunks = [];
  // Discard SQL/client stderr: it may contain private values or connection details.
  let diagnostics = "";
  child.stderr.on("data", chunk => { if (diagnostics.length < 4096) diagnostics += chunk.toString("utf8").slice(0, 4096 - diagnostics.length); });
  const exited = new Promise((resolve, reject) => {
    child.once("error", () => reject(Object.assign(new Error(dumpFailure(diagnostics)), { safeCode: dumpFailure(diagnostics) })));
    child.once("exit", code => code === 0 ? resolve() : reject(Object.assign(new Error(dumpFailure(diagnostics)), { safeCode: dumpFailure(diagnostics) })));
  });
  const meter = new Transform({ transform(chunk, encoding, next) { sqlBytes += chunk.length; progress({sqlBytes,compressedBytes}); next(sqlBytes > settings.maxSqlBytes ? Object.assign(new Error("SQL_BUDGET_EXCEEDED"), { safeCode: "SQL_BUDGET_EXCEEDED" }) : null, chunk); } });
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
  } catch (error) {
    if (expired) fail("LOCK_TIME_BUDGET_EXCEEDED");
    throw error;
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
  if (!["--check", "--backup", "--trial", "--decrypt"].includes(mode)) fail("INVALID_MODE");
  if (mode === "--decrypt") {
    if (args.length !== 3) fail("DECRYPT_PATHS_REQUIRED");
    fs.writeFileSync(args[2], open(fs.readFileSync(args[1]), encryptionKey(env)), { flag: "wx", mode: 0o600 });
    console.log("Archive authentifiee et dechiffree localement ; aucune restauration SQL.");
    return;
  }
  if (mode === "--backup" || mode === "--trial") backupGate(config, env, mode.slice(2));
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
    console.log(JSON.stringify({stage:"metadata-checked",at:new Date().toISOString(),tables:details.plan.count}));
    // Prepare client and credentials BEFORE blocking database writes.
    execFileSync("docker", ["pull", config.clientImage], { stdio: "ignore", timeout: 180000 });
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-nap-"));
    const defaults = path.join(temporary, "client.cnf");
    fs.writeFileSync(defaults, `[client]\nhost=${optionValue(options.host)}\nport=${options.port}\nuser=${optionValue(options.user)}\npassword=${optionValue(password)}\n`, { flag: "wx", mode: 0o600 });
    container = "livepalmes-nap-backup-" + crypto.randomBytes(8).toString("hex");
    // Validate every dump option and the private file before locks; discard help output.
    try { execFileSync("docker", [...clientContainerArguments(defaults, container + "-check"), ...dumpOptions(details.tables.map(table=>table.name)), "--help"], { stdio: "ignore", timeout: 15000 }); }
    catch { fail("DUMP_CLIENT_PREFLIGHT_FAILED"); }
    // Same client library, credentials and TLS; only SELECT 1, without any lock.
    const remoteArgs=clientContainerArguments(defaults, container + "-login");
    remoteArgs[remoteArgs.indexOf("--entrypoint=mysqldump")]="--entrypoint=mysql";
    try { execFileSync("docker", [...remoteArgs, "--defaults-extra-file=/run/nap-client.cnf", "--ssl-mode=REQUIRED", "--connect-timeout=10", "--batch", "--skip-column-names", "--execute=SELECT 1", "nage-palmes"], {stdio:["ignore","ignore","pipe"],timeout:15000}); }
    catch(error) { fail("CLIENT_LOGIN_" + dumpFailure(String(error.stderr||""))); }
    console.log(JSON.stringify({stage:"client-login-checked",at:new Date().toISOString()}));
    if (mode === "--check") { console.log(JSON.stringify({ ...summary, backupStarted: false, locksRequested: false,clientLoginChecked:true })); return; }
    let lastProgress={sqlBytes:0,compressedBytes:0},notifiedBytes=-1;
    const exportStarted=Date.now();
    const packed = await lockedExport({ connection, plan: details.plan, stop, dump: () => {
      console.log(JSON.stringify({stage:"tables-locked",at:new Date().toISOString()}));
      child = spawn("docker", [...clientContainerArguments(defaults, container), ...dumpOptions(details.tables.map(t => t.name))], { stdio: ["ignore", "pipe", "pipe"] });
      return collectDump(child,config,progress=>{lastProgress=progress;if(notifiedBytes<0||progress.sqlBytes-notifiedBytes>=16*1024*1024){notifiedBytes=progress.sqlBytes;console.log(JSON.stringify({stage:"export-progress",...progress,elapsedMs:Date.now()-exportStarted}));}});
    } }).catch(error=>{console.log(JSON.stringify({stage:"export-stopped",...lastProgress,elapsedMs:Date.now()-exportStarted}));throw error;});
    const outputDir = path.resolve("outputs/nap-backups");
    const stored = await saveEncrypted({ packed, key, drive, folder, outputDir });
    const report = { schema: 1, ...summary, backupStarted: true, locksReleased: true, stored, completedAt: new Date().toISOString() };
    if (mode === "--trial") {
      const restore = require("./nap-backup-restore");
      const downloaded = await drive.download(folder, stored);
      const recovery = await restore.restoreIsolated({ packed: open(downloaded, key), names: details.tables.map(table => table.name), image: config.clientImage, dumpOptions, maxSqlBytes: config.maxSqlBytes });
      report.restoreProof = { schema: 1, toolSha256: restore.toolFingerprint(), folder, archiveSha256: stored.sha256, downloadedFromDrive: true, restoredAndCompared: recovery.restoredAndCompared, verifiedAt: new Date().toISOString() };
      report.recovery = recovery;
    }
    fs.writeFileSync(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify(report));
  } finally {
    connection.destroy(); stop();
    if (temporary) { fs.rmSync(path.join(temporary, "client.cnf"), { force: true }); fs.rmdirSync(temporary); }
  }
}
module.exports = { clientContainerArguments, dumpFailure, backupGate, encryptionKey, planTables, dumpOptions, collectDump, lockedExport, saveEncrypted, driveClient, inspect, main, CONFIRMATION };
if (require.main === module) main().catch(error => { console.error("Sauvegarde NAP arretee : " + (error.safeCode || "OPERATION_FAILED") + ". Aucune relance automatique ; examiner le resultat avant reprise."); process.exitCode = 1; });
