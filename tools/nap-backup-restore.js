"use strict";
// Restore only into a disposable Docker server with no network or host mount.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), zlib = require("node:zlib");
const { execFileSync } = require("node:child_process");
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
function fail(code) { throw Object.assign(new Error(code), { safeCode: code }); }
function toolFingerprint() {
  return hash(Buffer.concat(["nap-backup.js", "nap-backup-restore.js", "nap-backup-config.json", "production-backup-crypto.js"].map(name => Buffer.concat([Buffer.from(name + "\0"), name === "nap-backup-config.json" ? Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(path.join(__dirname, name), "utf8"))).filter(([key]) => key !== "enabled")))) : fs.readFileSync(path.join(__dirname, name))]))));
}
function checkScheduleProof(env) {
  let proof;
  try { proof = JSON.parse(env.NAP_BACKUP_RESTORE_PROOF || ""); } catch { fail("RESTORE_PROOF_REQUIRED"); }
  if (!proof || env.NAP_BACKUP_SCHEDULE_ENABLED !== "true" || proof.schema !== 1 || proof.toolSha256 !== toolFingerprint() ||
      proof.folder !== env.NAP_BACKUP_FOLDER_ID || proof.downloadedFromDrive !== true || proof.restoredAndCompared !== true ||
      !/^[a-f0-9]{64}$/.test(proof.archiveSha256 || "") || !Number.isFinite(Date.parse(proof.verifiedAt))) fail("RESTORE_PROOF_REQUIRED");
  return proof;
}
function isolatedArguments(container, image) {
  if (!/^livepalmes-nap-restore-[a-f0-9]{16}$/.test(container) || image !== "mysql:5.7.44") fail("ISOLATED_RESTORE_TARGET_REQUIRED");
  return ["run", "-d", "--name", container, "--label", "livepalmes.nap-restore=true", "--network", "none",
    "--memory", "1g", "--cpus", "2", "--env", "MYSQL_ROOT_PASSWORD", image,
    "--skip-log-bin", "--local-infile=0", "--secure-file-priv=NULL"];
}
function compareDump(packed, restored, maxBytes) {
  const source = zlib.gunzipSync(packed, { maxOutputLength: maxBytes });
  if (restored.length > maxBytes || !source.length || hash(source) !== hash(restored)) fail("RESTORED_SQL_DIFFERS");
  return { sqlBytes: source.length, sqlSha256: hash(source), restoredAndCompared: true };
}
async function restoreIsolated({ packed, names, image, dumpOptions, maxSqlBytes, run, pause = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (!Array.isArray(names) || !names.length || names.some(name => !/^[A-Za-z0-9_]+$/.test(name))) fail("RESTORE_TABLES_INVALID");
  const container = "livepalmes-nap-restore-" + crypto.randomBytes(8).toString("hex"), password = crypto.randomBytes(32).toString("hex");
  const environment = { ...process.env, MYSQL_ROOT_PASSWORD: password, MYSQL_PWD: password };
  const execute = run || ((args, options = {}) => {
    try { return execFileSync("docker", args, { env: environment, stdio: ["pipe", "pipe", "ignore"], timeout: 10000, maxBuffer: maxSqlBytes, ...options }); }
    catch { fail("ISOLATED_RESTORE_COMMAND_FAILED"); }
  });
  let created = false;
  try {
    const args = isolatedArguments(container, image);
    created = true; // A timed-out Docker request may already have created it.
    execute(args);
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { execute(["exec", "--env", "MYSQL_PWD", container, "mysql", "-uroot", "--batch", "--skip-column-names", "-e", "SELECT 1"]); ready = true; break; }
      catch { await pause(1000); }
    }
    if (!ready) fail("ISOLATED_RESTORE_NOT_READY");
    execute(["exec", "--env", "MYSQL_PWD", container, "mysql", "-uroot", "-e", "CREATE DATABASE \u0060nage-palmes\u0060 CHARACTER SET utf8mb4"]);
    const raw = zlib.gunzipSync(packed, { maxOutputLength: maxSqlBytes });
    execute(["exec", "-i", "--env", "MYSQL_PWD", container, "mysql", "-uroot", "--default-character-set=utf8mb4", "--binary-mode", "nage-palmes"], { input: raw, timeout: 180000 });
    const flags = dumpOptions(names).filter(value => !value.startsWith("--defaults-extra-file=") && value !== "--ssl-mode=REQUIRED");
    const restored = execute(["exec", "--env", "MYSQL_PWD", container, "mysqldump", "-uroot", "--ssl-mode=DISABLED", ...flags], { timeout: 90000 });
    return compareDump(packed, restored, maxSqlBytes);
  } finally {
    if (created) execute(["rm", "-f", "-v", container]);
  }
}
module.exports = { toolFingerprint, checkScheduleProof, isolatedArguments, compareDump, restoreIsolated };
