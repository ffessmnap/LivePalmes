"use strict";
const fs = require("node:fs"), crypto = require("node:crypto");
const { KEYS, SCOPES } = require("./github-credential-scope");
const RECIPIENT = "485c22e71fad5f461433f94f4c392f32afa4d4f99608f8460b1f4066b1ebae82";
const IDENTITIES = {
  [KEYS[0]]: ["livepalmes", "github-actions-livepalmes@livepalmes.iam.gserviceaccount.com"],
  [KEYS[1]]: ["livepalmes", "github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com"],
  [KEYS[2]]: ["livepalmes-test", "github-livepalmes-test@livepalmes-test.iam.gserviceaccount.com"],
  [KEYS[3]]: ["livepalmes-test", "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com"]
};
const hash = data => crypto.createHash("sha256").update(data).digest("hex");
function credentialsFor(scope, environment) {
  const selected = scope === "repository" ? KEYS : SCOPES[scope];
  if (!selected || scope === "firebase-preview") throw new Error("Unsupported transfer scope");
  const credentials = {};
  for (const name of selected) {
    const raw = environment[name];
    if (!raw || raw.length > 20000) throw new Error("Credential missing");
    const value = JSON.parse(raw), expected = IDENTITIES[name];
    if (value.type !== "service_account" || value.project_id !== expected[0] || value.client_email !== expected[1] || !value.private_key_id ||
        crypto.createPrivateKey(value.private_key).asymmetricKeyType !== "rsa") throw new Error("Credential identity mismatch");
    credentials[name] = raw;
  }
  return credentials;
}
function seal(payload, publicPem) {
  const key = crypto.randomBytes(32), nonce = crypto.randomBytes(12);
  const context = Buffer.from("LivePalmes A3 same-key confinement v1");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce); cipher.setAAD(context);
  const plain = Buffer.from(JSON.stringify(payload));
  try {
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    return { schema: 1, algorithm: "RSA-OAEP-SHA256/AES-256-GCM", recipient: hash(publicPem.toString().replace(/\r\n/g, "\n")),
      wrappedKey: crypto.publicEncrypt({ key: publicPem, oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, key).toString("base64"),
      nonce: nonce.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
  } finally { key.fill(0); plain.fill(0); }
}
function run(environment = process.env) {
  if (environment.GITHUB_REPOSITORY !== "ffessmnap/LivePalmes" || environment.GITHUB_REF !== "refs/heads/main" ||
      environment.GITHUB_EVENT_NAME !== "workflow_dispatch" || environment.GITHUB_RUN_ATTEMPT !== "1") throw new Error("Unauthorized execution");
  const publicPem = fs.readFileSync("tools/a3-github-transfer-public.pem");
  if (hash(publicPem.toString().replace(/\r\n/g, "\n")) !== RECIPIENT) throw new Error("Recipient mismatch");
  const scope = environment.A3_TRANSFER_SCOPE, credentials = credentialsFor(scope, environment);
  const payload = { schema: 1, repository: environment.GITHUB_REPOSITORY, ref: environment.GITHUB_REF,
    source: environment.GITHUB_SHA, runId: environment.GITHUB_RUN_ID, scope, credentials };
  const encrypted = seal(payload, publicPem);
  fs.mkdirSync("tmp/a3-secret-transfer", { recursive: true, mode: 0o700 });
  fs.writeFileSync("tmp/a3-secret-transfer/credentials.enc.json", JSON.stringify(encrypted), { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ scope, credentials: Object.keys(credentials).length, encryptedOnly: true }));
}
module.exports = { IDENTITIES, RECIPIENT, credentialsFor, seal, run };
if (require.main === module) { try { run(); } catch { console.error("Transfert A3 refuse : controle de contexte, destinataire ou identite non satisfait. Aucune valeur affichee."); process.exitCode = 1; } }
