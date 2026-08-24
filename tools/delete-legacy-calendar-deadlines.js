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

async function commitDelete(id, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE)}/documents:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes: [{ delete: `projects/${PROJECT_ID}/databases/${DATABASE}/documents/${COLLECTION}/${id}`, currentDocument: { exists: true } }] })
  });
  if (response.ok) return;
  throw new Error(`Suppression Firestore impossible (${response.status}) : ${(await response.text()).slice(0, 800)}`);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const input = path.resolve(valueAfter("--input") || "outputs/legacy-calendar-history-preview.json");
  const write = process.argv.includes("--write");
  const expectedCount = Number(valueAfter("--confirm"));
  const delayMs = Math.max(0, Number.parseInt(valueAfter("--delay-ms"), 10) || 0);
  const competitions = JSON.parse(fs.readFileSync(input, "utf8")).competitions || [];
  const deletions = competitions
    .filter((competition) => competition.importEligible !== false && /\blimite\b/i.test(competition.name || ""))
    .map((competition) => ({ id: `legacy-nap-${competition.legacyCompetitionId}`, name: competition.name, date: competition.date }));
  const summary = { mode: write ? "write" : "dry-run", deletionCount: deletions.length, deletions };
  if (!write) return console.log(JSON.stringify(summary, null, 2));
  if (expectedCount !== deletions.length) throw new Error(`Confirmation explicite requise : ajoutez --confirm ${deletions.length}.`);
  const token = firebaseAccessToken();
  for (let index = 0; index < deletions.length; index += 1) {
    await commitDelete(deletions[index].id, token);
    console.log(`Suppression Firestore : ${index + 1}/${deletions.length}`);
    if (delayMs && index + 1 < deletions.length) await delay(delayMs);
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
