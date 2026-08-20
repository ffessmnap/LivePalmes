const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const BUCKET = "livepalmes-public-data-718081132564";
const BASE = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`;
const UPLOAD = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o`;
function valueAfter(flag) { const index = process.argv.indexOf(flag); return index >= 0 ? process.argv[index + 1] || "" : ""; }
function token() { return JSON.parse(execFileSync("cmd.exe", ["/c", "firebase.cmd", "login:list", "--json"], { encoding: "utf8" })).result?.[0]?.tokens?.access_token || ""; }
async function readJson(name, auth) { const response = await fetch(`${BASE}/${encodeURIComponent(name)}?alt=media`, { headers: { Authorization: `Bearer ${auth}` } }); if (!response.ok) throw new Error(`Lecture Storage ${response.status}: ${name}`); return response.json(); }
async function writeJson(name, data, auth, cacheControl) { const response = await fetch(`${UPLOAD}?uploadType=media&name=${encodeURIComponent(name)}`, { method: "POST", headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json; charset=utf-8", "Cache-Control": cacheControl }, body: JSON.stringify(data) }); if (!response.ok) throw new Error(`Écriture Storage ${response.status}: ${name}`); }
async function main() {
  const directory = path.resolve(valueAfter("--input") || "outputs/public-calendar-results");
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
  const write = process.argv.includes("--write"); const expected = Number(valueAfter("--confirm"));
  if (!write) return console.log(JSON.stringify({ mode: "dry-run", eventCount: manifest.length, largestBytes: Math.max(...manifest.map((item) => item.bytes)) }, null, 2));
  if (expected !== manifest.length) throw new Error(`Confirmation explicite requise : ajoutez --confirm ${manifest.length}.`);
  const auth = token(); if (!auth) throw new Error("Connexion Firebase CLI introuvable.");
  let completed = 0;
  for (const item of manifest) {
    const file = path.join(directory, `${item.id}.json`); const results = JSON.parse(fs.readFileSync(file, "utf8"));
    const detail = await readJson(`calendar/events/${item.id}.json`, auth);
    const dataPath = `results/${item.id}.json`;
    await writeJson(`calendar/${dataPath}`, results, auth, "public, max-age=300");
    await writeJson(`calendar/events/${item.id}.json`, { ...detail, results: { ...(detail.results || {}), publishedAt: detail.results?.publishedAt || detail.resultsPublishedAt || detail.date, dataPath } }, auth, "public, max-age=60, must-revalidate");
    completed += 1; if (completed % 25 === 0 || completed === manifest.length) console.log(`Publication résultats : ${completed}/${manifest.length}`);
  }
  console.log(JSON.stringify({ mode: "write", eventCount: completed }, null, 2));
}
main().catch((error) => { console.error(error.stack || error.message || String(error)); process.exitCode = 1; });
