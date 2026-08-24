const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ID = "livepalmes";
const DATABASE = "(default)";
const COLLECTION = "engagementCalendarEvents";

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function firebaseAccessToken() {
  const output = execFileSync("cmd.exe", ["/c", "firebase.cmd", "login:list", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const token = JSON.parse(output).result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Connexion Firebase CLI introuvable. Exécutez firebase login puis relancez.");
  return token;
}

function fieldsFor(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (typeof value === "number") return [key, { integerValue: String(value) }];
    return [key, { stringValue: String(value || "") }];
  }));
}

async function commitWrite(write, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE)}/documents:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes: [write] })
  });
  if (response.ok) return;
  throw new Error(`Écriture Firestore impossible (${response.status}) : ${(await response.text()).slice(0, 800)}`);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const beforePath = path.resolve(valueAfter("--before") || "outputs/legacy-calendar-history-preview.json");
  const afterPath = path.resolve(valueAfter("--after") || "outputs/legacy-calendar-history-corrected-preview.json");
  const write = process.argv.includes("--write");
  const expectedCount = Number(valueAfter("--confirm"));
  const delayMs = Math.max(0, Number.parseInt(valueAfter("--delay-ms"), 10) || 0);
  const beforeById = new Map((JSON.parse(fs.readFileSync(beforePath, "utf8")).competitions || []).map((competition) => [String(competition.legacyCompetitionId), competition]));
  const now = new Date().toISOString();
  const corrections = (JSON.parse(fs.readFileSync(afterPath, "utf8")).competitions || [])
    .filter((competition) => competition.importEligible !== false && competition.eventType === "openWater")
    .filter((competition) => beforeById.get(String(competition.legacyCompetitionId))?.eventType !== "openWater")
    .map((competition) => ({ id: `legacy-nap-${competition.legacyCompetitionId}`, name: competition.name, date: competition.date }));
  const summary = { mode: write ? "write" : "dry-run", correctionCount: corrections.length, samples: corrections.slice(0, 10) };
  if (!write) return console.log(JSON.stringify(summary, null, 2));
  if (expectedCount !== corrections.length) throw new Error(`Confirmation explicite requise : ajoutez --confirm ${corrections.length}.`);
  const token = firebaseAccessToken();
  for (let index = 0; index < corrections.length; index += 1) {
    const correction = corrections[index];
    const values = { eventType: "openWater", poolLength: "", poolLaneCount: 0, timingType: "", updatedAt: now, updatedBy: "legacy-calendar-open-water-repair" };
    const fields = fieldsFor(values);
    await commitWrite({
      update: { name: `projects/${PROJECT_ID}/databases/${DATABASE}/documents/${COLLECTION}/${correction.id}`, fields },
      updateMask: { fieldPaths: Object.keys(fields) },
      currentDocument: { exists: true }
    }, token);
    console.log(`Correction eau libre Firestore : ${index + 1}/${corrections.length}`);
    if (delayMs && index + 1 < corrections.length) await delay(delayMs);
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
