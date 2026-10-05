"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { SOURCES } = require("../functions/nap-public-export");
const PROJECT = "livepalmes-test";

function csvLine(columns, row) {
  return columns.map(column => '"' + String(row[column] ?? "").replace(/"/g, '""') + '"').join(",") + "\n";
}

async function exportSource({ request, directory, bounds }) {
  const report = {};
  fs.mkdirSync(directory, { recursive: true });
  for (const [table, { key, columns }] of Object.entries(SOURCES)) {
    const filename = path.join(directory, `${table}_nap.csv`);
    const fd = fs.openSync(filename, "wx");
    const hash = crypto.createHash("sha256");
    const write = text => { fs.writeSync(fd, text); hash.update(text); };
    let count = 0;
    let after = -1;
    const through = bounds[table];
    try {
      write(csvLine(columns, Object.fromEntries(columns.map(c => [c, c]))));
      if (through !== null) {
        for (let pageNumber = 0; ; pageNumber++) {
          if (pageNumber >= 500) throw new Error("Plafond d'export NAP atteint.");
          const page = await request({ table, after, through });
          if (page.source !== "nap" || page.table !== table || page.through !== through ||
              !Array.isArray(page.items) || page.items.length > 2000 || typeof page.hasMore !== "boolean") {
            throw new Error("Page NAP invalide.");
          }
          for (const row of page.items) {
            const id = Number(row[key]);
            if (row[key] === null || row[key] === undefined || !Number.isSafeInteger(id) || id <= after || id > through) throw new Error("Ordre NAP invalide.");
            after = id;
            write(csvLine(columns, row));
            count++;
          }
          if (page.next !== after || (page.hasMore && page.items.length !== 2000)) throw new Error("Curseur NAP invalide.");
          if (!page.hasMore) break;
        }
      }
    } finally { fs.closeSync(fd); }
    report[table] = { rows: count, through, sha256: hash.digest("hex") };
  }
  return report;
}

async function main() {
  if (process.env.TARGET_FIREBASE_PROJECT !== PROJECT) throw new Error("Export reserve a TEST.");
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  if (credentials.project_id !== PROJECT || credentials.client_email !== "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com") {
    throw new Error("Compte de publication TEST incorrect.");
  }
  const output = path.resolve(process.argv[2] || "outputs/nap-public-source");
  const allowed = path.resolve("outputs");
  const relative = path.relative(allowed, output);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || fs.existsSync(output)) {
    throw new Error("Dossier de travail neuf requis sous outputs.");
  }
  const uri = execFileSync("gcloud", ["functions", "describe", "exportNapPublicPage", "--gen2", "--region=europe-west1", `--project=${PROJECT}`, "--format=value(serviceConfig.uri)"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const endpoint = new URL(uri);
  if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".run.app") || endpoint.username || endpoint.password || endpoint.search) throw new Error("Endpoint d'export invalide.");
  const token = execFileSync("gcloud", ["auth", "print-identity-token", `--audiences=${uri}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const request = async parameters => {
    const url = new URL(uri);
    for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Export NAP refuse (${response.status}).`);
    return response.json();
  };
  const metadata = await request({ action: "inspect" });
  if (metadata.source !== "nap" || metadata.pageSize !== 2000 ||
      !Object.keys(SOURCES).every(table => metadata.bounds[table] === null ||
        (Number.isSafeInteger(metadata.bounds[table]) && metadata.bounds[table] >= 0))) throw new Error("Structure NAP non verifiee.");
  fs.mkdirSync(output, { recursive: true });
  const startedAt = new Date().toISOString();
  const first = await exportSource({ request, directory: path.join(output, "source"), bounds: metadata.bounds });
  const second = await exportSource({ request, directory: path.join(output, "verification"), bounds: metadata.bounds });
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("NAP a change pendant l'export : publication refusee.");
  const report = { source: "nap", project: PROJECT, startedAt, completedAt: new Date().toISOString(), consistency: "two-identical-paginated-reads", tables: first };
  fs.writeFileSync(path.join(output, "export-proof.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) main().catch(() => { console.error("Export NAP interrompu. Aucun fichier public publie."); process.exitCode = 1; });
module.exports = { csvLine, exportSource };
