const path = require("node:path");

const PROJECT_ID = "livepalmes";
const APPLY_FLAG = "--apply";
const CONFIRM_FLAG = "--confirm-4287-performances";
const QUERY_LIMIT = 2500;
const WRITE_BATCH_SIZE = 400;
const MIGRATION_ID = "performance-import-timing-materialized-v2";

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
  if (!competitions.every((competition) => ["electronic", "manual"].includes(competition.timingType))) {
    throw new Error("Chaque competition doit avoir un type de chronometrage confirme.");
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

  const rawPerformanceSnapshots = await Promise.all(importRefs.map((importRef) => importRef
    .collection("performances")
    .orderBy(FieldPath.documentId())
    .limit(QUERY_LIMIT)
    .get()));
  const rawPerformanceDocs = rawPerformanceSnapshots.flatMap((snapshot) => snapshot.docs);
  if (rawPerformanceDocs.length !== expectedPerformanceCount) {
    throw new Error(`Nombre de performances brutes inattendu : ${rawPerformanceDocs.length}/${expectedPerformanceCount}`);
  }

  const unexpectedRows = performanceDocs.filter((doc) => {
    const row = doc.data() || {};
    const chrono = cleanText(row.chrono).toUpperCase();
    const competition = competitions.find((item) => item.importId === cleanText(row.competitionId));
    const expectedChrono = competition?.timingType === "manual" ? "M" : "E";
    return cleanText(row.source) !== "livepalmes-import" || !competition || (chrono && chrono !== expectedChrono);
  });
  if (unexpectedRows.length) {
    throw new Error(`Performances incompatibles avec la migration : ${unexpectedRows.slice(0, 10).map((doc) => doc.id).join(", ")}`);
  }

  const competitionSummary = competitions.map((competition, index) => {
    const importData = importSnapshots[index].data() || {};
    const rows = performanceSnapshots[index].docs;
    const rawRows = rawPerformanceSnapshots[index].docs;
    const chrono = competition.timingType === "manual" ? "M" : "E";
    return {
      importId: competition.importId,
      seasonYear: competition.seasonYear,
      competition: cleanText(importData.competitionName || importData.metadata?.competitionName || competition.competition),
      location: cleanText(importData.metadata?.location || competition.location),
      timingType: competition.timingType,
      chrono,
      performances: rows.length,
      rawPerformances: rawRows.length,
      alreadyTimed: rows.filter((doc) => cleanText(doc.data()?.chrono).toUpperCase() === chrono).length,
      toUpdate: rows.filter((doc) => cleanText(doc.data()?.chrono).toUpperCase() !== chrono).length,
      rawToUpdate: rawRows.filter((doc) => {
        const row = doc.data() || {};
        return cleanText(row.chrono).toUpperCase() !== chrono || cleanText(row.timingType) !== competition.timingType;
      }).length
    };
  });
  const summary = {
    ok: true,
    mode: apply ? "apply" : "dry-run",
    configVersion: timingConfig.version,
    imports: competitions.length,
    reads: importSnapshots.length + performanceDocs.length + rawPerformanceDocs.length,
    performances: performanceDocs.length,
    rawPerformances: rawPerformanceDocs.length,
    alreadyTimed: competitionSummary.reduce((sum, item) => sum + item.alreadyTimed, 0),
    toUpdate: competitionSummary.reduce((sum, item) => sum + item.toUpdate, 0),
    rawToUpdate: competitionSummary.reduce((sum, item) => sum + item.rawToUpdate, 0),
    competitions: competitionSummary
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const now = new Date().toISOString();
  const writes = [
    ...importSnapshots.map((snapshot, index) => {
      const competition = competitions[index];
      const chrono = competition.timingType === "manual" ? "M" : "E";
      return {
        ref: snapshot.ref,
        data: {
          timingType: competition.timingType,
          chrono,
          "metadata.timingType": competition.timingType,
          "metadata.chrono": chrono,
          "metadata.timingSource": "confirmed-history",
          timingUpdatedAt: now,
          timingUpdatedBy: MIGRATION_ID
        }
      };
    }),
    ...rawPerformanceSnapshots.flatMap((snapshot, index) => {
      const competition = competitions[index];
      const chrono = competition.timingType === "manual" ? "M" : "E";
      return snapshot.docs.map((doc) => ({
        ref: doc.ref,
        data: {
          timingType: competition.timingType,
          chrono,
          "metadata.timingType": competition.timingType,
          "metadata.chrono": chrono,
          "metadata.timingSource": "confirmed-history",
          updatedAt: now,
          updatedBy: MIGRATION_ID
        }
      }));
    }),
    ...performanceSnapshots.flatMap((snapshot, index) => {
      const competition = competitions[index];
      const chrono = competition.timingType === "manual" ? "M" : "E";
      return snapshot.docs.map((doc) => ({
        ref: doc.ref,
        data: {
          timingType: competition.timingType,
          chrono,
          updatedAt: now,
          updatedBy: MIGRATION_ID,
          sourceAction: "performanceImport.timingBackfill"
        }
      }));
    })
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
    rawPerformanceCount: rawPerformanceDocs.length,
    timingTypes: Array.from(new Set(competitions.map((competition) => competition.timingType))),
    importIds: competitions.map((competition) => competition.importId)
  }, { merge: true });
  console.log(JSON.stringify({ ...summary, writes: writes.length + 1, completedAt: now }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
