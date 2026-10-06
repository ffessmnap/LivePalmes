"use strict";
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
async function main() {
  const project = "livepalmes-test";
  if (process.env.TARGET_FIREBASE_PROJECT !== project) throw new Error("Diagnostic reserve a TEST.");
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== project || credentials.client_email !== "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") throw new Error("Compte TEST incorrect.");
  const options = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] };
  const uri = execFileSync("gcloud", ["functions", "describe", "exportNapPublicPage", "--gen2", "--region=europe-west1", `--project=${project}`, "--format=value(serviceConfig.uri)"], options).trim();
  const url = new URL(uri);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".run.app") || url.username || url.password || url.search) throw new Error("Endpoint prive invalide.");
  const token = execFileSync("gcloud", ["auth", "print-identity-token", `--audiences=${uri}`], options).trim();
  url.searchParams.set("action", "direct-plan");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error("Diagnostic NAP indisponible.");
  const result = await response.json();
  if (result.source !== "nap" || result.mode !== "explain-only") throw new Error("Diagnostic NAP invalide.");
  const timeShapes = new Map();
  let after = -1;
  for (let page = 0; ; page++) {
    if (page >= 100) throw new Error("Plafond du diagnostic de format atteint.");
    url.searchParams.set("action", "time-shape");
    url.searchParams.set("after", String(after));
    const shapeResponse = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) });
    if (!shapeResponse.ok) throw new Error("Diagnostic des formats indisponible.");
    const shape = await shapeResponse.json();
    if (shape.source !== "nap" || shape.mode !== "time-shape-counts-only" || !Array.isArray(shape.counts) || !Number.isSafeInteger(shape.next) || shape.next < after || shape.next > after + 10000) throw new Error("Diagnostic des formats invalide.");
    for (const count of shape.counts) {
      const key = String(count.width);
      const current = timeShapes.get(key) || { width: count.width, rowCount: 0, numericRows: 0 };
      current.rowCount += Number(count.rowCount || 0); current.numericRows += Number(count.numericRows || 0);
      timeShapes.set(key, current);
    }
    after = shape.next;
    if (!shape.hasMore) break;
  }
  result.timeShapes = [...timeShapes.values()];
  fs.mkdirSync("outputs", { recursive: true });
  fs.writeFileSync("outputs/nap-direct-query-plans.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
}
main().catch(() => { console.error("Diagnostic NAP arrete. Aucune modification de la base."); process.exitCode = 1; });
