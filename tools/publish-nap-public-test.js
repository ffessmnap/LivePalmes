"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const PROJECT = "livepalmes-test";
const BUCKET = "livepalmes-test-public-data-206080168534";
const VERSION = "20261006-v1";
function publicationPlan(directory) {
  const root = path.resolve(directory);
  const relative = path.relative(path.resolve("outputs"), root);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Source de travail NAP requise.");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  if (manifest.source !== "nap" || !manifest.sourceExport?.tables?.perfs || manifest.rowCount <= 0) throw new Error("Source NAP verifiee requise.");
  const files = [];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Lien de fichier refuse.");
      if (entry.isDirectory()) walk(full);
      else {
        const name = path.relative(root, full).replace(/\\/g, "/");
        if (!/^(?:manifest\.json|version\.js|(?:ids|search)\/[a-z0-9]{2}\.json|swimmers\/[a-f0-9]{2}\/[a-f0-9]{40}\.json|(?:tops|tops-preview)\/[A-Z0-9]+\/[MF]-[A-Z0-9+]+\.json|dtn-listing\/\d{4}\.json)$/.test(name)) throw new Error("Fichier hors publication NAP.");
        files.push({ full, name });
      }
    }
  };
  walk(root);
  const count = prefix => files.filter(file => file.name.startsWith(prefix + "/")).length;
  for (const [folder, field] of [["swimmers", "swimmerFiles"], ["ids", "idFiles"], ["search", "searchFiles"], ["tops", "topFiles"], ["tops-preview", "topPreviewFiles"], ["dtn-listing", "dtnListingFiles"]]) {
    if (count(folder) !== manifest[field]) throw new Error("Construction NAP incomplete.");
  }
  if (!files.some(file => file.name === "version.js")) throw new Error("Version NAP absente.");
  return { files, manifest, prefix: `performance-public-nap/versions/${VERSION}` };
}
async function publish(plan, bucket) {
  const [existing] = await bucket.getFiles({ prefix: plan.prefix + "/", maxResults: 1, autoPaginate: false });
  if (existing.length) throw new Error("Version NAP deja presente : ecrasement refuse.");
  const upload = async file => {
    const bytes = fs.readFileSync(file.full);
    const [stored] = await bucket.upload(file.full, { destination: `${plan.prefix}/${file.name}`, resumable: false,
      preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: file.name.endsWith(".js") ? "application/javascript; charset=utf-8" : "application/json; charset=utf-8",
        cacheControl: "public, max-age=31536000, immutable" } });
    if (stored.metadata.md5Hash !== crypto.createHash("md5").update(bytes).digest("base64")) throw new Error("Empreinte Storage NAP differente.");
  };
  const content = plan.files.filter(file => file.name !== "manifest.json");
  let offset = 0;
  let completed = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (offset < content.length) {
      await upload(content[offset++]);
      completed++;
      if (completed % 1000 === 0 || completed === content.length) console.log(`Fichiers NAP TEST publies : ${completed}/${content.length}.`);
    }
  }));
  await upload(plan.files.find(file => file.name === "manifest.json"));
  return { project: PROJECT, bucket: BUCKET, prefix: plan.prefix, files: plan.files.length, rowCount: plan.manifest.rowCount };
}
async function main() {
  if (process.env.TARGET_FIREBASE_PROJECT !== PROJECT || process.env.NAP_PUBLICATION_CONFIRMATION !== "livepalmes-test-nap-publish") throw new Error("Publication TEST non confirmee.");
  const credential = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credential.project_id !== PROJECT || credential.client_email !== "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") throw new Error("Compte TEST incorrect.");
  const requireFunctions = require("node:module").createRequire(path.resolve(__dirname, "../functions/package.json"));
  const { initializeApp, cert } = requireFunctions("firebase-admin/app");
  const { getStorage } = requireFunctions("firebase-admin/storage");
  const app = initializeApp({ credential: cert(credential), projectId: PROJECT });
  const proof = await publish(publicationPlan(process.argv[2]), getStorage(app).bucket(BUCKET));
  fs.writeFileSync("outputs/nap-publication-proof.json", JSON.stringify(proof, null, 2) + "\n");
  console.log(JSON.stringify(proof));
}
if (require.main === module) main().catch(() => { console.error("Publication NAP TEST arretee. Aucune ancienne source remplacee."); process.exitCode = 1; });
module.exports = { publicationPlan, publish };
