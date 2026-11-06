"use strict";

// Standalone, read-only inventory. No Firestore write, Auth, callable or SQL API.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const planner = require("./user-name-correction-plan");
const { seal, open } = require("./production-backup-crypto");
const ENDPOINT = "https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents/users";
const MAX_BYTES = 32 * 1024 * 1024;
let stage = "guard";

async function collect({ token, fetcher = fetch }) {
  const documents = [], seenTokens = new Set();
  let next = "", requests = 0, bytes = 0;
  do {
    if (++requests > 11) throw new Error("Page budget exceeded");
    const url = new URL(ENDPOINT);
    url.searchParams.set("pageSize", String(Math.min(100, planner.MAX_DOCUMENTS + 1 - documents.length)));
    url.searchParams.set("orderBy", "__name__");
    if (next) url.searchParams.set("pageToken", next);
    const response = await fetcher(url, { method: "GET", redirect: "error", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Read denied or unavailable (HTTP ${response.status})`);
    // Bound streamed bytes too, before materializing private JSON in memory.
    const chunks = [];
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) throw new Error("Byte budget exceeded");
      chunks.push(chunk);
    }
    const page = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (page.documents !== undefined && !Array.isArray(page.documents)) throw new Error("Malformed page");
    if ((page.documents || []).length > Number(url.searchParams.get("pageSize"))) throw new Error("Oversized page");
    documents.push(...(page.documents || []));
    if (documents.length > planner.MAX_DOCUMENTS) throw new Error("Profile budget exceeded");
    next = page.nextPageToken || "";
    if (next && (typeof next !== "string" || seenTokens.has(next) || !page.documents?.length)) throw new Error("Stuck pagination");
    if (next) seenTokens.add(next);
  } while (next);
  return { documents, requests, bytes };
}

function details(documents) {
  const result = { active: 0, inactive: 0, otherOrMissingStatus: 0, missingFirstName: 0, missingLastName: 0,
    nullFirstName: 0, nullLastName: 0, blankFirstName: 0, blankLastName: 0, uidMismatch: 0 };
  for (const doc of documents) {
    const fields = doc.fields;
    const status = fields.status?.stringValue;
    result[status === "active" ? "active" : status === "inactive" ? "inactive" : "otherOrMissingStatus"]++;
    for (const [field, suffix] of [["firstName", "FirstName"], ["lastName", "LastName"]]) {
      if (!Object.hasOwn(fields, field)) result[`missing${suffix}`]++;
      else if (Object.hasOwn(fields[field], "nullValue")) result[`null${suffix}`]++;
      else if (typeof fields[field].stringValue === "string" && !fields[field].stringValue.trim()) result[`blank${suffix}`]++;
    }
    if (Object.hasOwn(fields, "uid") && fields.uid?.stringValue !== doc.name.split("/").at(-1)) result.uidMismatch++;
  }
  return result;
}

function powershell(script, input) {
  return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script],
    { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], windowsHide: true }).trim();
}
function protectKey(mode, input) {
  if (!["Protect", "Unprotect"].includes(mode)) throw new Error("Invalid key operation");
  const script = `[void][System.Reflection.Assembly]::LoadWithPartialName('System.Security'); $v=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Convert]::ToBase64String([System.Security.Cryptography.ProtectedData]::${mode}($v,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser))`;
  return Buffer.from(powershell(script, input.toString("base64")), "base64");
}
function privateDirectory(directory) {
  if (fs.existsSync(directory)) throw new Error("Destination already exists");
  fs.mkdirSync(directory, { recursive: true });
  const sid = powershell("[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value");
  if (!/^S-1-\d+(?:-\d+)+$/.test(sid)) throw new Error("Windows identity unavailable");
  execFileSync("icacls.exe", [directory, "/inheritance:r", "/grant:r", `*${sid}:(OI)(CI)F`], { stdio: "pipe", windowsHide: true });
  assertPrivateDirectory(directory);
}
function assertPrivateDirectory(directory) {
  // Paths are fixed under LOCALAPPDATA plus a generated operation identifier.
  const quoted = directory.replace(/'/g, "''");
  // Use .NET directly: inherited PSModulePath may point to PowerShell 7 modules
  // while this helper deliberately uses Windows PowerShell's DPAPI runtime.
  const protectedAcl = powershell(`$acl=([System.IO.DirectoryInfo]::new('${quoted}')).GetAccessControl(); $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $rules=$acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier]); $bad=0; foreach($r in $rules) { if($r.IdentityReference.Value -ne $sid -or $r.AccessControlType -ne 'Allow') { $bad++ } }; if (-not $acl.AreAccessRulesProtected -or $bad -ne 0 -or $rules.Count -eq 0) { throw 'ACL invalid' }; 'verified'`);
  if (protectedAcl !== "verified" || fs.lstatSync(directory).isSymbolicLink()) throw new Error("Private ACL unavailable");
}

async function main() {
  if (process.platform !== "win32" || process.argv[2] !== "--read-only-prod-backup" || !process.env.LOCALAPPDATA || !process.env.APPDATA) throw new Error("Explicit Windows read-only mode required");
  const operationId = `user-names-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID()}`;
  const base = path.join(process.env.LOCALAPPDATA, "LivePalmes");
  const directory = path.join(base, "ProtectedBackups", operationId);
  const copyDirectory = path.join(base, "ProtectedBackupCopies", operationId);
  const keyDirectory = path.join(base, "ProtectedKeys", operationId);
  // Secure storage and prove key recovery BEFORE any private remote read.
  stage = "private-storage";
  for (const target of [directory, copyDirectory, keyDirectory]) privateDirectory(target);
  stage = "key-recovery";
  const key = crypto.randomBytes(32), keyFile = path.join(keyDirectory, "key.dpapi");
  fs.writeFileSync(keyFile, protectKey("Protect", key), { flag: "wx" });
  const recoveredKey = protectKey("Unprotect", fs.readFileSync(keyFile));
  if (!recoveredKey.equals(key)) throw new Error("Key recovery failed");
  stage = "google-authentication";
  // Reuse the already authenticated gcloud session. Stdout stays in memory;
  // no token is passed on a command line or written to disk by this tool.
  const token = powershell("gcloud.cmd auth print-access-token --quiet; if($LASTEXITCODE -ne 0) { throw 'Google access unavailable' }");
  if (token.length < 30 || /\s/.test(token)) throw new Error("Access token unavailable");
  const startedAt = new Date().toISOString();
  stage = "read-only-prod-inventory";
  const { documents, requests, bytes } = await collect({ token });
  const completedAt = new Date().toISOString();
  stage = "plan-and-encryption";
  const plan = planner.prepare(documents, operationId);
  const payload = JSON.parse(open(planner.makeVerifiedBackup(documents, plan, key), key).toString("utf8"));
  payload.inventory = { startedAt, completedAt, requests, bytes, readOnly: true, maxDocuments: planner.MAX_DOCUMENTS };
  const encrypted = seal(Buffer.from(JSON.stringify(payload)), key);
  stage = "disk-backup-verification";
  for (const target of [directory, copyDirectory]) {
    const file = path.join(target, "users.enc");
    fs.writeFileSync(file, encrypted, { flag: "wx" });
    const disk = fs.readFileSync(file);
    if (!disk.equals(encrypted)) throw new Error("Saved bytes differ");
    const restored = planner.restoreBackup(disk, recoveredKey);
    if (planner.hash(restored.documents) !== planner.hash(documents)) throw new Error("Restore comparison failed");
  }
  let restoreSimulations = 0;
  stage = "offline-restore-verification";
  for (const doc of documents) {
    const proposal = planner.proposedWrite(plan, doc.name, doc);
    if (proposal.status !== "proposed-only") continue;
    const after = { ...doc, updateTime: "2099-01-01T00:00:00.123456789Z", fields: { ...doc.fields, ...proposal.write.update.fields } };
    const receipt = { planDigest: plan.digest, name: doc.name, afterVersion: after.updateTime };
    const undo = planner.proposedWrite(plan, doc.name, after, receipt, "rollback");
    const restoredFields = { ...after.fields, ...undo.write.update.fields };
    if (planner.hash(restoredFields) !== planner.hash(doc.fields)) throw new Error("Offline rollback failed");
    restoreSimulations++;
  }
  const receipt = { operationId, projectId: "livepalmes", database: "(default)", collection: "users", startedAt, completedAt,
    ...planner.summary(plan), details: details(documents), requests, responseBytes: bytes, planDigest: plan.digest,
    encryptedSha256: crypto.createHash("sha256").update(encrypted).digest("hex"), backupReopened: true, restoredDocumentsCompared: documents.length,
    restoreSimulations, windowsAclVerified: true, keyRecoveryVerified: true, keyProtection: "Windows DPAPI CurrentUser", localEncryptedCopies: 2,
    independentOffDeviceCopy: false, authenticationSource: "existing-gcloud-session", firestoreWrites: 0, authReads: 0, authWrites: 0, sqlRequests: 0, emailsSent: 0, backupDirectory: directory, keyDirectory };
  for (const target of [directory, copyDirectory]) fs.writeFileSync(path.join(target, "receipt.json"), JSON.stringify(receipt, null, 2), { flag: "wx" });
  key.fill(0); recoveredKey.fill(0);
  console.log(JSON.stringify(receipt, null, 2));
}
if (require.main === module) main().catch(error => {
  // Never emit OAuth, Firestore or OS exception payloads containing private values.
  const code = /^(?:EACCES|EPERM|ENOENT|ENOTFOUND|EAI_AGAIN|400|401|403)$/.test(String(error?.code)) ? String(error.code) : "not-disclosed";
  console.error(`Inventaire arrete (etape ${stage}, code ${code}) : aucune correction demandee ni executee. Sauvegarde complete non attestee.`);
  process.exitCode = 1;
});
module.exports = { collect, details, ENDPOINT, protectKey, powershell, privateDirectory, assertPrivateDirectory };
