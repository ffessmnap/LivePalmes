const path = require("path");
const crypto = require("crypto");

const PROJECT_ID = "livepalmes";
const ROSTER_ID = "482d9673cfee5de391f97fde4d1c84f9f8d6f2cf";
const INDEX_ID = "475ad2ffe0e5576c95a5f76adca5514bd14f6233";
const SWIMMER_ID = "912";
const IDENTITY_KEY = "FAUVEAU|ANTOINE|1992-07-01";
const LICENSE_NUMBER = "A-05-222647";

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function isAntoineFauveau(swimmer = {}) {
  return cleanText(swimmer.swimmerId) === SWIMMER_ID ||
    cleanText(swimmer.identityKey).startsWith("FAUVEAU|ANTOINE|") ||
    (cleanText(swimmer.lastName).toUpperCase() === "FAUVEAU" && cleanText(swimmer.firstName).toUpperCase() === "ANTOINE");
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!process.argv.includes("--project") || process.argv[process.argv.indexOf("--project") + 1] !== PROJECT_ID) {
    throw new Error(`Le script exige --project ${PROJECT_ID}.`);
  }
  const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
  const { getFirestore } = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin", "lib", "firestore"));
  if (!admin.getApps().length) admin.initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore();
  const rosterRef = db.collection("engagementClubRosters").doc(ROSTER_ID);
  const indexRef = db.collection("performanceSwimmerIndex").doc(INDEX_ID);
  const [rosterSnapshot, indexSnapshot] = await Promise.all([rosterRef.get(), indexRef.get()]);
  if (!rosterSnapshot.exists || !indexSnapshot.exists) throw new Error("Effectif ou fiche canonique introuvable.");
  const roster = rosterSnapshot.data() || {};
  const index = indexSnapshot.data() || {};
  if (cleanText(roster.clubId) !== "106") throw new Error(`Club inattendu : ${cleanText(roster.clubId)}`);
  if (cleanText(index.identityKey) !== IDENTITY_KEY || cleanText(index.id || index.swimmerId) !== SWIMMER_ID) {
    throw new Error("La fiche canonique ne correspond plus à Antoine FAUVEAU 1992.");
  }
  const entries = roster.swimmers && typeof roster.swimmers === "object" ? roster.swimmers : {};
  const matchingKeys = Object.entries(entries).filter(([, swimmer]) => isAntoineFauveau(swimmer)).map(([key]) => key);
  if (matchingKeys.length !== 2) throw new Error(`Deux entrées Antoine attendues, ${matchingKeys.length} trouvée(s).`);
  const now = new Date().toISOString();
  const nextEntries = Object.fromEntries(Object.entries(entries).filter(([key]) => !matchingKeys.includes(key)));
  const canonical = {
    id: INDEX_ID,
    swimmerIndexId: INDEX_ID,
    source: "performances",
    swimmerId: SWIMMER_ID,
    identityKey: IDENTITY_KEY,
    firstName: "Antoine",
    lastName: "FAUVEAU",
    name: "Antoine FAUVEAU",
    birthDate: "1992-07-01",
    sex: "M",
    category: "M30+",
    clubId: "106",
    club: "CNHC",
    clubName: cleanText(index.clubName) || cleanText(roster.clubName),
    licenseNumber: LICENSE_NUMBER,
    licenseVerificationStatus: "pending",
    licenseSeasonLabel: "2025-2026",
    licenseSeasonStatus: "to_check",
    latestDate: cleanText(index.latestDate),
    performanceCount: Number(index.performanceCount || 0),
    active: true,
    clubActivityStatus: "inactive",
    clubActivityStatusSource: "club-roster-consolidation",
    clubActivityStatusUpdatedAt: now,
    clubActivityStatusUpdatedBy: "system:targeted-roster-repair",
    updatedAt: now,
    changeRequestStatus: ""
  };
  const canonicalKey = stableHash(`performances|${INDEX_ID}`).slice(0, 40);
  nextEntries[canonicalKey] = canonical;
  const summary = {
    mode: apply ? "apply" : "dry-run",
    rosterReads: 1,
    indexReads: 1,
    rosterWrites: apply ? 1 : 0,
    beforeCount: Object.keys(entries).length,
    matchingEntriesRemoved: matchingKeys.length,
    afterCount: Object.keys(nextEntries).length,
    canonical: {
      key: canonicalKey,
      swimmerIndexId: canonical.swimmerIndexId,
      swimmerId: canonical.swimmerId,
      identityKey: canonical.identityKey,
      birthDate: canonical.birthDate,
      licenseNumber: canonical.licenseNumber,
      performanceCount: canonical.performanceCount,
      clubActivityStatus: canonical.clubActivityStatus
    }
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (!process.argv.includes("--confirm-two-to-one")) throw new Error("Confirmation requise : --confirm-two-to-one");
  await rosterRef.set({
    ...roster,
    swimmers: nextEntries,
    swimmerCount: Object.keys(nextEntries).length,
    updatedAt: now,
    targetedRosterRepairAt: now,
    targetedRosterRepairVersion: 1
  }, { merge: false });
  console.log(JSON.stringify({ ...summary, completedAt: now }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
