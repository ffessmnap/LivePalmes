"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const {
  COPY, COPY_SUBCOLLECTIONS_BY_ROOT, DESTINATION_PROJECT, EXCLUDE,
  REFERENCE_REPLACEMENTS, SOURCE_PROJECT, STORAGE
} = require("./firebase-test-data-sync-manifest");

const APPLY_CONFIRMATION = "copy-livepalmes-readonly-to-livepalmes-test";
const AUTOMATION_CONFIRMATION = "email-and-schedulers-disabled-in-livepalmes-test";
const BATCH_SIZE = 200;

function parseArgs(argv) {
  const out = {
    apply: false,
    includeStorage: false,
    inventoryOnly: false,
    pageSize: BATCH_SIZE,
    checkpoint: ".firebase-test-data-sync-checkpoint.json"
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--apply") out.apply = true;
    else if (key === "--include-storage") out.includeStorage = true;
    else if (key === "--inventory-only") out.inventoryOnly = true;
    else if (["--source-credential", "--destination-credential", "--confirmation", "--automation-confirmation", "--checkpoint", "--page-size"].includes(key)) out[key.slice(2)] = argv[++i] || "";
    else throw new Error(`Argument inconnu : ${key}`);
  }
  out.pageSize = Number(out["page-size"] || out.pageSize);
  if (!Number.isInteger(out.pageSize) || out.pageSize < 1 || out.pageSize > 400) throw new Error("--page-size doit être compris entre 1 et 400.");
  if (out.apply && out.inventoryOnly) throw new Error("--inventory-only est incompatible avec --apply.");
  return out;
}

function readCredential(file, expectedProject) {
  if (!file) throw new Error(`Credential obligatoire pour ${expectedProject}.`);
  const json = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
  if (json.project_id !== expectedProject) throw new Error(`Le credential doit appartenir à ${expectedProject}.`);
  return json;
}

function assertSafety(args, sourceCredential, destinationCredential) {
  if (SOURCE_PROJECT === DESTINATION_PROJECT) throw new Error("Source et destination identiques.");
  if (sourceCredential.project_id !== SOURCE_PROJECT || destinationCredential.project_id !== DESTINATION_PROJECT) throw new Error("Couple de projets interdit.");
  if (args.apply && args.confirmation !== APPLY_CONFIRMATION) throw new Error(`Confirmation requise : ${APPLY_CONFIRMATION}`);
  if (args.apply && args["automation-confirmation"] !== AUTOMATION_CONFIRMATION) throw new Error(`Confirmation requise : ${AUTOMATION_CONFIRMATION}`);
}

function loadFirebaseAdmin() {
  const functionsRequire = createRequire(path.join(__dirname, "..", "functions", "package.json"));
  const { cert, initializeApp } = functionsRequire("firebase-admin/app");
  const { FieldPath, getFirestore } = functionsRequire("firebase-admin/firestore");
  const { getStorage } = functionsRequire("firebase-admin/storage");
  return { cert, initializeApp, FieldPath, getFirestore, getStorage };
}

function isProtectedAdminProfile(data = {}) {
  return data.status === "active" && data.capabilities?.["admin.full"] === true;
}

async function findProtectedAdminUids(db) {
  const snapshot = await db.collection("users").get();
  return snapshot.docs.filter((doc) => isProtectedAdminProfile(doc.data())).map((doc) => doc.id);
}

function transformValue(value, destinationDb) {
  if (typeof value === "string") {
    return REFERENCE_REPLACEMENTS.reduce((result, [from, to]) => result.split(from).join(to), value);
  }
  if (Array.isArray(value)) return value.map((item) => transformValue(item, destinationDb));
  if (value && typeof value === "object") {
    if (Buffer.isBuffer(value) || value instanceof Date) return value;
    if (value.constructor?.name === "DocumentReference") {
      if (!destinationDb) throw new Error(`Référence Firestore impossible à transformer : ${value.path}`);
      return destinationDb.doc(value.path);
    }
    if (typeof value.toDate === "function" || value.latitude !== undefined) return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, transformValue(item, destinationDb)]));
  }
  return value;
}

function loadCheckpoint(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { return {}; }
}

function saveCheckpoint(file, checkpoint) {
  fs.writeFileSync(file, `${JSON.stringify(checkpoint, null, 2)}\n`, { mode: 0o600 });
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "--";
  const seconds = Math.round(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function progressText(pathName, processed, total, startedAt) {
  const elapsed = Date.now() - startedAt;
  const percent = total ? Math.min(100, (processed / total) * 100) : 100;
  const remaining = processed > 0 && processed < total ? elapsed * ((total - processed) / processed) : 0;
  return `${pathName}: ${processed}/${total} (${percent.toFixed(1)} %) | écoulé ${formatDuration(elapsed)} | restant estimé ${processed ? formatDuration(remaining) : "--"}`;
}

function isDirectCompetitionSubcollectionPath(documentPath, collectionName) {
  const parts = String(documentPath || "").split("/").filter(Boolean);
  return parts.length === 4 && parts[0] === "competitions" && parts[2] === collectionName;
}

async function copyCollection(sourceCollection, destinationCollection, context) {
  const collectionName = sourceCollection.id;
  if (EXCLUDE.includes(collectionName)) {
    console.log(`[EXCLURE] ${sourceCollection.path}`);
    return;
  }
  let cursor = context.checkpoint[sourceCollection.path] || "";
  const [sourceAggregate, destinationAggregate] = await Promise.all([
    sourceCollection.count().get(), destinationCollection.count().get()
  ]);
  const sourceTotal = sourceAggregate.data().count;
  const destinationBefore = destinationAggregate.data().count;
  let processed = 0;
  const collectionStartedAt = Date.now();
  console.log(`[INVENTAIRE] ${sourceCollection.path}: source=${sourceTotal}; destination=${destinationBefore}`);

  if (context.inventoryOnly) {
    context.counts[sourceCollection.path] = { source: sourceTotal, destinationBefore, processed: 0, inventoryOnly: true };
    return;
  }

  do {
    let query = sourceCollection.orderBy("__name__").limit(context.pageSize);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    processed += snapshot.size;
    console.log(`[${context.apply ? "COPIER" : "DRY-RUN"}] ${progressText(sourceCollection.path, processed, sourceTotal, collectionStartedAt)}`);
    if (context.apply) {
      const batch = context.destinationDb.batch();
      for (const doc of snapshot.docs) batch.set(destinationCollection.doc(doc.id), transformValue(doc.data(), context.destinationDb), { merge: false });
      await batch.commit();
    }
    cursor = snapshot.docs.at(-1).id;
    context.checkpoint[sourceCollection.path] = cursor;
    if (context.apply) saveCheckpoint(context.checkpointFile, context.checkpoint);
    if (snapshot.size < context.pageSize) break;
  } while (true);
  context.counts[sourceCollection.path] = {
    source: sourceTotal,
    destinationBefore,
    processed,
    duration: formatDuration(Date.now() - collectionStartedAt)
  };
}

async function copyPerformanceImportSubcollections(sourceDb, destinationDb, context) {
  const imports = await sourceDb.collection("performanceImports").orderBy("__name__").get();
  for (const importDoc of imports.docs) {
    for (const collectionName of COPY_SUBCOLLECTIONS_BY_ROOT.performanceImports) {
      await copyCollection(
        importDoc.ref.collection(collectionName),
        destinationDb.collection("performanceImports").doc(importDoc.id).collection(collectionName),
        context
      );
    }
  }
}

async function copyCompetitionSubcollectionGroup(sourceDb, destinationDb, collectionName, FieldPath, context) {
  const checkpointKey = `collectionGroup:competitions:${collectionName}`;
  let cursorPath = context.checkpoint[checkpointKey] || "";
  const sourceGroup = sourceDb.collectionGroup(collectionName);
  const destinationGroup = destinationDb.collectionGroup(collectionName);
  const [sourceAggregate, destinationAggregate] = await Promise.all([
    sourceGroup.count().get(), destinationGroup.count().get()
  ]);
  const sourceGroupTotal = sourceAggregate.data().count;
  const destinationGroupBefore = destinationAggregate.data().count;
  const startedAt = Date.now();
  let scanned = 0;
  let processed = 0;
  console.log(`[INVENTAIRE] competitions/*/${collectionName}: groupe source=${sourceGroupTotal}; groupe destination=${destinationGroupBefore}`);

  if (context.inventoryOnly) {
    context.counts[`competitions/*/${collectionName}`] = {
      sourceGroup: sourceGroupTotal,
      destinationGroupBefore,
      processed: 0,
      inventoryOnly: true
    };
    return;
  }

  do {
    let query = sourceGroup.orderBy(FieldPath.documentId()).limit(context.pageSize);
    if (cursorPath) query = query.startAfter(sourceDb.doc(cursorPath));
    const snapshot = await query.get();
    if (snapshot.empty) break;
    scanned += snapshot.size;
    const accepted = snapshot.docs.filter((doc) => isDirectCompetitionSubcollectionPath(doc.ref.path, collectionName));
    processed += accepted.length;
    console.log(`[${context.apply ? "COPIER" : "DRY-RUN"}] competitions/*/${collectionName}: scannés ${scanned}/${sourceGroupTotal}; retenus ${processed} | écoulé ${formatDuration(Date.now() - startedAt)}`);
    if (context.apply && accepted.length) {
      const batch = destinationDb.batch();
      for (const doc of accepted) batch.set(destinationDb.doc(doc.ref.path), transformValue(doc.data(), destinationDb), { merge: false });
      await batch.commit();
    }
    cursorPath = snapshot.docs.at(-1).ref.path;
    context.checkpoint[checkpointKey] = cursorPath;
    if (context.apply) saveCheckpoint(context.checkpointFile, context.checkpoint);
    if (snapshot.size < context.pageSize) break;
  } while (true);

  context.counts[`competitions/*/${collectionName}`] = {
    sourceGroup: sourceGroupTotal,
    destinationGroupBefore,
    scanned,
    processed,
    duration: formatDuration(Date.now() - startedAt)
  };
}

async function copyKnownSubcollections(sourceDb, destinationDb, FieldPath, context) {
  await copyPerformanceImportSubcollections(sourceDb, destinationDb, context);
  for (const collectionName of COPY_SUBCOLLECTIONS_BY_ROOT.competitions) {
    await copyCompetitionSubcollectionGroup(sourceDb, destinationDb, collectionName, FieldPath, context);
  }
}

async function copyStorage(sourceStorage, destinationStorage, context) {
  for (const spec of STORAGE.copy) {
    const sourceBucket = sourceStorage.bucket(spec.sourceBucket);
    const destinationBucket = destinationStorage.bucket(spec.destinationBucket);
    for (const prefix of spec.prefixes) {
      let pageToken;
      let count = 0;
      const storageStartedAt = Date.now();
      do {
        const [files, , response] = await sourceBucket.getFiles({ prefix, maxResults: context.pageSize, pageToken, autoPaginate: false });
        count += files.length;
        console.log(`[${context.apply ? "COPIER STORAGE" : "DRY-RUN STORAGE"}] ${spec.sourceBucket}/${prefix}: ${count} objets | écoulé ${formatDuration(Date.now() - storageStartedAt)}`);
        if (context.apply) {
          for (const file of files) {
            const [buffer] = await file.download();
            await destinationBucket.file(file.name).save(buffer, {
              resumable: false,
              metadata: {
                contentType: file.metadata.contentType,
                cacheControl: file.metadata.cacheControl,
                contentDisposition: file.metadata.contentDisposition,
                metadata: transformValue(file.metadata.metadata || {})
              }
            });
          }
        }
        pageToken = response?.nextPageToken;
      } while (pageToken);
    }
  }
}

async function main(argv = process.argv.slice(2)) {
  const totalStartedAt = Date.now();
  const args = parseArgs(argv);
  const sourceCredential = readCredential(args["source-credential"], SOURCE_PROJECT);
  const destinationCredential = readCredential(args["destination-credential"], DESTINATION_PROJECT);
  assertSafety(args, sourceCredential, destinationCredential);
  const { cert, initializeApp, FieldPath, getFirestore, getStorage } = loadFirebaseAdmin();
  const sourceApp = initializeApp({ credential: cert(sourceCredential), projectId: SOURCE_PROJECT }, "prod-read-only-source");
  const destinationApp = initializeApp({ credential: cert(destinationCredential), projectId: DESTINATION_PROJECT }, "test-write-destination");
  const context = {
    apply: args.apply,
    inventoryOnly: args.inventoryOnly,
    pageSize: args.pageSize,
    checkpointFile: path.resolve(args.checkpoint),
    checkpoint: args.apply ? loadCheckpoint(path.resolve(args.checkpoint)) : {},
    counts: {},
    destinationDb: getFirestore(destinationApp)
  };
  const sourceDb = getFirestore(sourceApp);
  const protectedAdminUids = await findProtectedAdminUids(context.destinationDb);
  console.log(`Super-admins TEST protégés: ${protectedAdminUids.join(", ") || "AUCUN"}`);
  if (args.apply && !protectedAdminUids.length) throw new Error("Aucun super-admin TEST actif : synchronisation refusée.");
  const mode = args.inventoryOnly ? "INVENTAIRE" : args.apply ? "APPLY" : "DRY-RUN";
  console.log(`Mode=${mode}; source=${SOURCE_PROJECT} (lecture seule); destination=${DESTINATION_PROJECT}`);
  for (const name of COPY) await copyCollection(sourceDb.collection(name), context.destinationDb.collection(name), context);
  await copyKnownSubcollections(sourceDb, context.destinationDb, FieldPath, context);
  if (args.includeStorage && !args.inventoryOnly) await copyStorage(getStorage(sourceApp), getStorage(destinationApp), context);
  const totalDuration = formatDuration(Date.now() - totalStartedAt);
  console.log(JSON.stringify({ mode: mode.toLowerCase(), totalDuration, counts: context.counts }, null, 2));
  console.log(`Durée totale : ${totalDuration}`);
}

module.exports = {
  APPLY_CONFIRMATION, AUTOMATION_CONFIRMATION, assertSafety, findProtectedAdminUids, formatDuration,
  isDirectCompetitionSubcollectionPath, isProtectedAdminProfile, loadFirebaseAdmin, parseArgs,
  progressText, transformValue
};
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
