"use strict";
// Independent code-backup key. V1 and all business-data consumers stay unchanged.
const crypto = require("node:crypto");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const MAGIC = Buffer.from("LIVEPALMES_CODE_BACKUP_V2\n");
const MAX_HEADER = 1024;
const fail = () => { throw new Error("Sauvegarde code V2 invalide ou non authentifiee"); };
function exactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join("|") !== [...keys].sort().join("|")) fail();
}
function readKey(value) {
  exactKeys(value, ["schema", "keyId", "key"]);
  if (value.schema !== 2 || typeof value.keyId !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(value.keyId) ||
      typeof value.key !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value.key)) fail();
  const key = Buffer.from(value.key, "base64");
  if (key.length !== 32 || key.toString("base64") !== value.key || key.every(byte => byte === 0)) fail();
  return key;
}
function context(value) {
  exactKeys(value, ["project", "repository", "kind", "candidate", "runId"]);
  if (value.project !== "livepalmes" || value.repository !== "ffessmnap/LivePalmes" ||
      value.kind !== "production-code" || typeof value.candidate !== "string" || !/^[0-9a-f]{40}$/.test(value.candidate) ||
      !Number.isSafeInteger(value.runId) || value.runId <= 0) fail();
  return { project: value.project, repository: value.repository, kind: value.kind,
    candidate: value.candidate, runId: value.runId };
}
function seal(data, record, expected) {
  if (!Buffer.isBuffer(data)) fail();
  const secret = readKey(record);
  try {
    const header = Buffer.from(JSON.stringify({ schema: 2, keyId: record.keyId, context: context(expected) }));
    if (header.length > MAX_HEADER) fail();
    const length = Buffer.alloc(4); length.writeUInt32BE(header.length);
    const salt = crypto.randomBytes(32), iv = crypto.randomBytes(12);
    const aad = Buffer.concat([MAGIC, length, header, salt, iv]);
    const key = Buffer.from(crypto.hkdfSync("sha256", secret, salt, "LivePalmes production code backup V2", 32));
    try {
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(aad);
      const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
      return Buffer.concat([aad, cipher.getAuthTag(), encrypted]);
    } finally { key.fill(0); }
  } finally { secret.fill(0); }
}
function open(data, record, expected) {
  const secret = readKey(record);
  try {
    const wanted = context(expected);
    if (!Buffer.isBuffer(data) || data.length < MAGIC.length + 64 ||
        !data.subarray(0, MAGIC.length).equals(MAGIC)) fail();
    const size = data.readUInt32BE(MAGIC.length), start = MAGIC.length + 4;
    if (!size || size > MAX_HEADER || data.length < start + size + 60) fail();
    const header = JSON.parse(data.subarray(start, start + size).toString("utf8"));
    exactKeys(header, ["schema", "keyId", "context"]);
    if (header.schema !== 2 || header.keyId !== record.keyId ||
        JSON.stringify(context(header.context)) !== JSON.stringify(wanted)) fail();
    let offset = start + size;
    const salt = data.subarray(offset, offset += 32), iv = data.subarray(offset, offset += 12);
    const aad = data.subarray(0, offset), tag = data.subarray(offset, offset += 16);
    const key = Buffer.from(crypto.hkdfSync("sha256", secret, salt, "LivePalmes production code backup V2", 32));
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAAD(aad); decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data.subarray(offset)), decipher.final()]);
    } finally { key.fill(0); }
  } catch { return fail(); }
  finally { secret.fill(0); }
}
module.exports = { seal, open };
if (require.main === module) {
  try {
    const [mode, input, output, ...extra] = process.argv.slice(2);
    if (!["seal", "open"].includes(mode) || !input || !output || extra.length || fs.existsSync(output)) fail();
    // Neither a credential file nor a key passed in argv is accepted.
    const record = JSON.parse(process.env.LIVEPALMES_CODE_BACKUP_KEY_V2 || "null");
    const expected = JSON.parse(process.env.LIVEPALMES_CODE_BACKUP_CONTEXT || "null");
    readKey(record).fill(0); context(expected);
    if (mode === "seal") {
      const packed = execFileSync("tar", ["-czf", "-", "-C", input, "."], { maxBuffer: 1024 ** 3, stdio: ["pipe", "pipe", "pipe"] });
      fs.writeFileSync(output, seal(packed, record, expected), { mode: 0o600, flag: "wx" });
    } else {
      // Authentication and exact original release context precede any output directory.
      const packed = open(fs.readFileSync(input), record, expected);
      fs.mkdirSync(output, { mode: 0o700 });
      execFileSync("tar", ["-xzf", "-", "-C", output], { input: packed, stdio: ["pipe", "pipe", "pipe"] });
    }
    console.log(mode === "seal" ? "Sauvegarde code V2 chiffree." : "Sauvegarde code V2 authentifiee et ouverte.");
  } catch {
    // JSON parsing, subprocesses and crypto errors must never echo key material.
    console.error("Operation de sauvegarde code V2 refusee ; aucune cle affichee.");
    process.exitCode = 1;
  }
}
