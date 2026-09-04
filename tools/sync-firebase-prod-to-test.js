"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const {
  COPY, COPY_SUBCOLLECTIONS, DESTINATION_PROJECT, EXCLUDE, REFERENCE_REPLACEMENTS, SOURCE_PROJECT, STORAGE
} = require("./firebase-test-data-sync-manifest");

const APPLY_CONFIRMATION = "copy-livepalmes-readonly-to-livepalmes-test";
const AUTOMATION_CONFIRMATION = "email-and-schedulers-disabled-in-livepalmes-test";
const BATCH_SIZE = 200;

function parseArgs(argv) {
  const out = { apply: false, includeStorage: false, pageSize: BATCH_SIZE, checkpoint: ".firebase-test-data-sync-checkpoint.json" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--apply") out.apply = true;
    else if (key === "--include-storage") out.includeStorage = true;
    else if (["--source-credential", "--destination-credential", "--confirmation", "--automation-confirmation", "--checkpoint", "--page-size"].includes(key)) out[key.slice(2)] = argv[++i] || "";
    else throw new Error(`Argument inconnu : ${key}`);
  }
  out.pageSize = Number(out["page-size"] || out.pageSize);
  if (!Number.isInteger(out.pageSize) || out.pageSize < 1 || out.pageSize > 400) throw new Error("--page-size doit être compris entre 1 et 400.");
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
  const { getFirestore } = functionsRequire("firebase-admin/firestore");
  const { getStorage } = functionsRequire("firebase-admin/storage");
  return { cert, initializeApp, getFirestore, getStorage };
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
  console.log(`[INVENTAIRE] ${sourceCollection.path}: source=${sourceTotal}; destination=${destinationBefore}`);
  do {
    let query = sourceCollection.orderBy("__name__").limit(context.pageSize);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    processed += snapshot.size;
    console.log(`[${context.apply ? "COPIER" : "DRY-RUN"}] ${sourceCollection.path}: +${snapshot.size} (traités ${processed}/${sourceTotal})`);
    if (context.apply) {
      const batch = context.destinationDb.batch();
      for (const doc of snapshot.docs) batch.set(destinationCollection.doc(doc.id), transformValue(doc.data(), context.destinationDb), { merge: false });
      await batch.commit();
    }
    for (const doc of snapshot.docs) {
      const children = await doc.ref.listCollections();
      for (const child of children) {
        if (EXCLUDE.includes(child.id) || !COPY_SUBCOLLECTIONS.includes(child.id)) console.log(`[EXCLURE] ${child.path}`);
        else await copyCollection(child, destinationCollection.doc(doc.id).collection(child.id), context);
      }
    }
    cursor = snapshot.docs.at(-1).id;
    context.checkpoint[sourceCollection.path] = cursor;
    if (context.apply) saveCheckpoint(context.checkpointFile, context.checkpoint);
    if (snapshot.size < context.pageSize) break;
  } while (true);
  context.counts[sourceCollection.path] = { source: sourceTotal, destinationBefore, processed };
}

async function copyStorage(sourceStorage, destinationStorage, context) {
  for (const spec of STORAGE.copy) {
    const sourceBucket = sourceStorage.bucket(spec.sourceBucket);
    const destinationBucket = destinationStorage.bucket(spec.destinationBucket);
    for (const prefix of spec.prefixes) {
      let pageToken;
      let count = 0;
      do {
        const [files, , response] = await sourceBucket.getFiles({ prefix, maxResults: context.pageSize, pageToken, autoPaginate: false });
        count += files.length;
        console.log(`[${context.apply ? "COPIER STORAGE" : "DRY-RUN STORAGE"}] ${spec.sourceBucket}/${prefix}: +${files.length} (total ${count})`);
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
  const args = parseArgs(argv);
  const sourceCredential = readCredential(args["source-credential"], SOURCE_PROJECT);
  const destinationCredential = readCredential(args["destination-credential"], DESTINATION_PROJECT);
  assertSafety(args, sourceCredential, destinationCredential);
  const { cert, initializeApp, getFirestore, getStorage } = loadFirebaseAdmin();
  const sourceApp = initializeApp({ credential: cert(sourceCredential), projectId: SOURCE_PROJECT }, "prod-read-only-source");
  const destinationApp = initializeApp({ credential: cert(destinationCredential), projectId: DESTINATION_PROJECT }, "test-write-destination");
  const context = {
    apply: args.apply, pageSize: args.pageSize, checkpointFile: path.resolve(args.checkpoint),
    checkpoint: args.apply ? loadCheckpoint(path.resolve(args.checkpoint)) : {}, counts: {},
    destinationDb: getFirestore(destinationApp)
  };
  const sourceDb = getFirestore(sourceApp);
  const adminSnapshot = await context.destinationDb.collection("users").where("capabilities.admin.full", "==", true).get();
  const protectedAdminUids = adminSnapshot.docs.filter((doc) => doc.data().status === "active").map((doc) => doc.id);
  console.log(`Super-admins TEST protégés: ${protectedAdminUids.join(", ") || "AUCUN"}`);
  if (args.apply && !protectedAdminUids.length) throw new Error("Aucun super-admin TEST actif : synchronisation refusée.");
  console.log(`Mode=${args.apply ? "APPLY" : "DRY-RUN"}; source=${SOURCE_PROJECT} (lecture seule); destination=${DESTINATION_PROJECT}`);
  for (const name of COPY) await copyCollection(sourceDb.collection(name), context.destinationDb.collection(name), context);
  if (args.includeStorage) await copyStorage(getStorage(sourceApp), getStorage(destinationApp), context);
  console.log(JSON.stringify({ mode: args.apply ? "apply" : "dry-run", counts: context.counts }, null, 2));
}

module.exports = { APPLY_CONFIRMATION, AUTOMATION_CONFIRMATION, assertSafety, loadFirebaseAdmin, parseArgs, transformValue };
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
