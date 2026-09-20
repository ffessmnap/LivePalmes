"use strict";
const fs = require("node:fs");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const MAGIC = Buffer.from("LIVEPALMES_BACKUP_V1\n");
function seal(data, secret) {
  const salt = crypto.randomBytes(32), iv = crypto.randomBytes(12);
  const key = crypto.hkdfSync("sha256", secret, salt, "LivePalmes production code backup", 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(MAGIC);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), encrypted]);
}
function open(data, secret) {
  if (!data.subarray(0, MAGIC.length).equals(MAGIC) || data.length < MAGIC.length + 60) throw new Error("Sauvegarde invalide");
  let offset = MAGIC.length;
  const salt = data.subarray(offset, offset += 32), iv = data.subarray(offset, offset += 12), tag = data.subarray(offset, offset += 16);
  const key = crypto.hkdfSync("sha256", secret, salt, "LivePalmes production code backup", 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(MAGIC); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data.subarray(offset)), decipher.final()]);
}
module.exports = { seal, open };
if (require.main === module) {
  const [mode, input, output] = process.argv.slice(2);
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== "livepalmes" || credentials.client_email !== "github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com" || !credentials.private_key) throw new Error("Compte backend PROD requis");
  if (fs.existsSync(output)) throw new Error("Destination deja presente");
  if (mode === "seal") {
    const packed = execFileSync("tar", ["-czf", "-", "-C", input, "."], { maxBuffer: 1024 * 1024 * 1024 });
    fs.writeFileSync(output, seal(packed, credentials.private_key), { mode: 0o600 });
  } else if (mode === "open") {
    const packed = open(fs.readFileSync(input), credentials.private_key);
    fs.mkdirSync(output, { mode: 0o700 });
    execFileSync("tar", ["-xzf", "-", "-C", output], { input: packed });
  } else throw new Error("Mode invalide");
  console.log(mode === "seal" ? "Sauvegarde chiffree avec authentification, aucune cle incluse." : "Sauvegarde authentifiee et ouverte.");
}
