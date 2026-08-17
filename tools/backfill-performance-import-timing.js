const path = require("node:path");

const PROJECT_ID = "livepalmes";
const APPLY_FLAG = "--apply";
const CONFIRM_FLAG = "--confirm-4287-performances";
const QUERY_LIMIT = 2500;
const WRITE_BATCH_SIZE = 400;
const MIGRATION_ID = "performance-import-timing-electronic-v1";

const timingConfig = require(path.join(process.cwd(), "functions", "config", "performance-import-timing.json"));

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function main() {
  const apply = process.argv.includes(APPLY_FLAG);
  if (apply && !process.argv.includes(CONFIRM_FLAG)) {
    throw new Error(`Confirmation requise : ${CONFIRM_FLAG}`);
  }
  const competitions = Array.isArray(timingConfig.competitions) ? timingConfig.competitions : [];
  const expectedPerformanceCount = Number(timingConfig.expectedPerformanceCount || 0);
  if (competitions.length !== 19 || expectedPerformanceCount !== 4287) {
    throw new Error("Configuration de migration inattendue.");
  }
  if (!competitions.every((competition) => competition.timingType === "electronic")) {
    throw new Error("La migration n'accepte que les competitions confirmees electroniques.");
  }

  const admin = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin"));
  const { FieldPath, getFirestore } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "firestore"));
  if (!admin.getApps().length) admin.initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore();

  const importRefs = competitions.map((competition) => db.collection("performanceImports").doc(competition.importId));
  const importSnapshots = await db.getAll(...importRefs);
  const missingImports = importSnapshots.filter((snapshot) => !snapshot.exists).map((snapshot) => snapshot.id);
  if (missingImports.length) throw new Error(`Imports absents : ${missingImports.join(", ")}`);

  const performanceSnapshots = await Promise.all(competitions.map((competition) => db.collection("performances")
    .where("competitionId", "==", competition.importId)
    .orderBy(FieldPath.documentId())
    .limit(QUERY_LIMIT)
    .get()));
  const performanceDocs = performanceSnapshots.flatMap((snapshot) => snapshot.docs);
  if (performanceDocs.length !== expectedPerformanceCount) {
    throw new Error(`Nombre de performances inattendu : ${performanceDocs.length}/${expectedPerformanceCount}`);
  }

  const unexpectedRows = performanceDocs.filter((doc) => {
    const row = doc.data() || {};
    const chrono = cleanText(row.chrono).toUpperCase();
    return cleanText(row.source) !== "livepalmes-import" || cleanText(row.pool).replace(/\s/g, "") !== "50" || (chrono && chrono !== "E");
  });
  if (unexpectedRows.length) {
    throw new Error(`Performances incompatibles avec la migration : ${unexpectedRows.slice(0, 10).map((doc) => doc.id).join(", ")}`);
  }

  const competitionSummary = competitions.map((competition, index) => {
    const importData = importSnapshots[index].data() || {};
    const rows = performanceSnapshots[index].docs;
    return {
      importId: competition.importId,
      seasonYear: competition.seasonYear,
      competition: cleanText(importData.competitionName || importData.metadata?.competitionName || competition.competition),
      location: cleanText(importData.metadata?.location || competition.location),
      performances: rows.length,
      alreadyElectronic: rows.filter((doc) => cleanText(doc.data()?.chrono).toUpperCase() === "E").length,
      toUpdate: rows.filter((doc) => cleanText(doc.data()?.chrono).toUpperCase() !== "E").length
    };
  });
  const summary = {
    ok: true,
    mode: apply ? "apply" : "dry-run",
    configVersion: timingConfig.version,
    imports: competitions.length,
    reads: importSnapshots.length + performanceDocs.length,
    performances: performanceDocs.length,
    alreadyElectronic: competitionSummary.reduce((sum, item) => sum + item.alreadyElectronic, 0),
    toUpdate: competitionSummary.reduce((sum, item) => sum + item.toUpdate, 0),
    competitions: competitionSummary
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const now = new Date().toISOString();
  const writes = [
    ...importSnapshots.map((snapshot) => ({
      ref: snapshot.ref,
      data: {
        timingType: "electronic",
        chrono: "E",
        "metadata.timingType": "electronic",
        timingUpdatedAt: now,
        timingUpdatedBy: MIGRATION_ID
      }
    })),
    ...performanceDocs.map((doc) => ({
      ref: doc.ref,
      data: {
        chrono: "E",
        updatedAt: now,
        updatedBy: MIGRATION_ID,
        sourceAction: "performanceImport.timingBackfill"
      }
    }))
  ];
  for (let index = 0; index < writes.length; index += WRITE_BATCH_SIZE) {
    const batch = db.batch();
    writes.slice(index, index + WRITE_BATCH_SIZE).forEach((write) => batch.update(write.ref, write.data));
    await batch.commit();
  }
  await db.collection("performanceMigrationJobs").doc(MIGRATION_ID).set({
    status: "completed",
    completedAt: now,
    configVersion: timingConfig.version,
    importCount: competitions.length,
    performanceCount: performanceDocs.length,
    timingType: "electronic",
    importIds: competitions.map((competition) => competition.importId)
  }, { merge: true });
  console.log(JSON.stringify({ ...summary, writes: writes.length + 1, completedAt: now }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
