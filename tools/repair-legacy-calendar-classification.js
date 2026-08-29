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

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function firestoreValue(value) {
  return { stringValue: String(value || "") };
}

function firebaseAccessToken() {
  const output = execFileSync("cmd.exe", ["/c", "firebase.cmd", "login:list", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const token = JSON.parse(output).result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Connexion Firebase CLI introuvable. Exécutez firebase login puis relancez.");
  return token;
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

function main() {
  const beforePath = path.resolve(valueAfter("--before") || "outputs/legacy-calendar-history-preview.json");
  const afterPath = path.resolve(valueAfter("--after") || "outputs/legacy-calendar-history-corrected-preview.json");
  const regionsPath = path.resolve(valueAfter("--regions") || "outputs/legacy-calendar-region-resolutions.json");
  const write = process.argv.includes("--write");
  const expectedCount = Number(valueAfter("--confirm"));
  const delayMs = Math.max(0, Number.parseInt(valueAfter("--delay-ms"), 10) || 0);
  const skip = Math.max(0, Number.parseInt(valueAfter("--skip"), 10) || 0);
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")).competitions || [];
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")).competitions || [];
  const resolutions = JSON.parse(fs.readFileSync(regionsPath, "utf8")).resolvedCities || {};
  const beforeById = new Map(before.map((competition) => [String(competition.legacyCompetitionId), competition]));
  const now = new Date().toISOString();
  const corrections = after
    .filter((competition) => competition.importEligible !== false)
    .map((competition) => {
      const original = beforeById.get(String(competition.legacyCompetitionId));
      if (!original) return null;
      const resolvedRegion = competition.regionId || (!["national", "international"].includes(competition.level)
        ? resolutions[normalize(competition.city || competition.location)] || ""
        : "");
      if (original.level === competition.level && original.regionId === resolvedRegion) return null;
      return {
        id: `legacy-nap-${competition.legacyCompetitionId}`,
        level: competition.level,
        regionId: resolvedRegion,
        name: competition.name,
        date: competition.date
      };
    })
    .filter(Boolean)
    .slice(skip);
  const summary = {
    mode: write ? "write" : "dry-run",
    correctionCount: corrections.length,
    levelCorrectionCount: corrections.filter((item) => beforeById.get(item.id.replace("legacy-nap-", ""))?.level !== item.level).length,
    regionCorrectionCount: corrections.filter((item) => beforeById.get(item.id.replace("legacy-nap-", ""))?.regionId !== item.regionId).length,
    skip,
    samples: corrections.slice(0, 10)
  };
  if (!write) return Promise.resolve(console.log(JSON.stringify(summary, null, 2)));
  if (expectedCount !== corrections.length) throw new Error(`Confirmation explicite requise : ajoutez --confirm ${corrections.length}.`);
  const token = firebaseAccessToken();
  return corrections.reduce((chain, correction, index) => chain.then(async () => {
    const fields = {
      level: firestoreValue(correction.level),
      regionId: firestoreValue(correction.regionId),
      updatedAt: firestoreValue(now),
      updatedBy: firestoreValue("legacy-calendar-classification-repair")
    };
    await commitWrite({
      update: { name: `projects/${PROJECT_ID}/databases/${DATABASE}/documents/${COLLECTION}/${correction.id}`, fields },
      updateMask: { fieldPaths: Object.keys(fields) },
      currentDocument: { exists: true }
    }, token);
    console.log(`Correction Firestore : ${index + 1}/${corrections.length}`);
    if (delayMs && index + 1 < corrections.length) await delay(delayMs);
  }), Promise.resolve()).then(() => console.log(JSON.stringify(summary, null, 2)));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
