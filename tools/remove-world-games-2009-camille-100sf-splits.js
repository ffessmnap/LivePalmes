const crypto = require("crypto");
const path = require("path");

const PROJECT_ID = "livepalmes";
const BUCKET = "livepalmes-public-data-718081132564";
const PUBLIC_PREFIX = "performance-public-firestore";
const ADDITIONAL_FILE = "performance-public/additional-data.json";
const IDENTITY_KEY = "HEITZ|CAMILLE|1986-03-19";
const SWIMMER_ID = "16423";
const RACE_DATE = "2009-07-24";
const COURSE = "100SF";
const APPLY_FLAG = "--apply";
const CONFIRM_FLAG = "--confirm-camille-world-games-2009-100sf-splits";
const TARGET_IMPORTS = [
  { id: "f66f3a5afeafab610dcf62b6cb29d713", status: "deleted" },
  { id: "f9c4e56a576f747f4d133d6cc699a54e", status: "stored" }
];
const TARGET_BASES = new Map([
  ["80bc0fea1d5957a16a7b353c48332300485a6547", "19.20"],
  ["aeb053512d36954e7b723de967e1150eafc1ccbc", "19.82"],
  ["a2f7b030047b8eaa72740ab51f946b2ec446f931", "19.20"],
  ["ddbaf26799c4e0a3dce136e2e483587e18dda5dc", "19.82"]
]);
const TARGET_RAW = new Map([
  ["f66f3a5afeafab610dcf62b6cb29d713/7cd6caec53469cf39b2245fd8a24e665", "19.20"],
  ["f66f3a5afeafab610dcf62b6cb29d713/2e95711ac168224404d3c59b4fc992df", "19.82"],
  ["f9c4e56a576f747f4d133d6cc699a54e/1b0d27d9329f46f080830c98667c78ea", "19.20"],
  ["f9c4e56a576f747f4d133d6cc699a54e/cf8db49a4bc56494e686f8d466b603df", "19.82"]
]);

const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const stableHash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");
const targetSplit = (split) => text(split?.time) === "19.20" || text(split?.time) === "19.82";
const withoutTargetSplits = (row) => (Array.isArray(row?.intermediateTimes) ? row.intermediateTimes : []).filter((split) => !targetSplit(split));
const rowKey = (row) => text(row?.publicKey || row?.performanceBaseId || row?.id);

function assertRace(row, expectedSplit, label) {
  const matches = (Array.isArray(row?.intermediateTimes) ? row.intermediateTimes : []).filter(targetSplit);
  if (text(row?.course) !== COURSE || text(row?.date) !== RACE_DATE || text(row?.swimmerIdentityKey || IDENTITY_KEY) !== IDENTITY_KEY) {
    throw new Error(`Cible inattendue pour ${label}.`);
  }
  if (matches.length !== 1 || text(matches[0]?.time) !== expectedSplit) {
    throw new Error(`Passage ${expectedSplit} introuvable ou ambigu pour ${label}.`);
  }
}

function topBucketIds(row) {
  const ids = new Set();
  [text(row.category), ""].forEach((category) => {
    [Number(row.seasonYear || 0), 0].forEach((seasonYear) => {
      [text(row.regionId), ""].forEach((regionId) => {
        ids.add(stableHash([text(row.course), text(row.sex), category, seasonYear, regionId].join("|")).slice(0, 40));
      });
    });
  });
  return Array.from(ids);
}

async function readJson(bucket, relativePath, fallback = null) {
  try {
    const [buffer] = await bucket.file(relativePath).download();
    return JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    if (Number(error?.code) === 404) return fallback;
    throw error;
  }
}

async function writeJson(bucket, relativePath, payload, cacheControl = "public, max-age=31536000, immutable") {
  await bucket.file(relativePath).save(JSON.stringify(payload), {
    resumable: false,
    contentType: "application/json; charset=utf-8",
    metadata: { cacheControl }
  });
}

async function main() {
  const apply = process.argv.includes(APPLY_FLAG);
  if (apply && !process.argv.includes(CONFIRM_FLAG)) throw new Error(`Confirmation requise : ${CONFIRM_FLAG}`);

  const admin = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin"));
  const { getFirestore } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "firestore"));
  const { getStorage } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "storage"));
  if (!admin.getApps().length) admin.initializeApp({ projectId: PROJECT_ID, storageBucket: BUCKET });
  const db = getFirestore();
  const bucket = getStorage().bucket(BUCKET);

  const importRefs = TARGET_IMPORTS.map((item) => db.collection("performanceImports").doc(item.id));
  const baseRefs = Array.from(TARGET_BASES.keys()).map((id) => db.collection("performances").doc(id));
  const rawRefs = Array.from(TARGET_RAW.keys()).map((key) => {
    const [importId, rawId] = key.split("/");
    return db.collection("performanceImports").doc(importId).collection("performances").doc(rawId);
  });
  const swimmerIndexId = stableHash(IDENTITY_KEY).slice(0, 40);
  const swimmerIndexRef = db.collection("performanceSwimmerIndex").doc(swimmerIndexId);
  const [importSnapshots, baseSnapshots, rawSnapshots, swimmerIndexSnapshot] = await Promise.all([
    db.getAll(...importRefs),
    db.getAll(...baseRefs),
    db.getAll(...rawRefs),
    swimmerIndexRef.get()
  ]);

  importSnapshots.forEach((snapshot, index) => {
    if (!snapshot.exists || text(snapshot.data()?.status) !== TARGET_IMPORTS[index].status) {
      throw new Error(`Etat inattendu pour l'import ${TARGET_IMPORTS[index].id}.`);
    }
  });
  baseSnapshots.forEach((snapshot) => {
    if (!snapshot.exists) throw new Error(`Performance absente : ${snapshot.id}.`);
    assertRace(snapshot.data() || {}, TARGET_BASES.get(snapshot.id), `performance ${snapshot.id}`);
  });
  rawSnapshots.forEach((snapshot) => {
    const importId = snapshot.ref.parent.parent.id;
    const key = `${importId}/${snapshot.id}`;
    if (!snapshot.exists) throw new Error(`Ligne brute absente : ${key}.`);
    assertRace(snapshot.data() || {}, TARGET_RAW.get(key), `ligne brute ${key}`);
  });
  if (!swimmerIndexSnapshot.exists || Number(swimmerIndexSnapshot.data()?.pageCount || 0) < 1 || Number(swimmerIndexSnapshot.data()?.pageCount || 0) > 5) {
    throw new Error("Index nageur Camille Heitz absent ou inattendu.");
  }

  const pageCount = Number(swimmerIndexSnapshot.data().pageCount);
  const pageRefs = Array.from({ length: pageCount }, (_, index) => db.collection("performanceSwimmerPages").doc(`${swimmerIndexId}_${String(index).padStart(4, "0")}`));
  const pageSnapshots = await db.getAll(...pageRefs);
  const activeBaseRows = baseSnapshots.filter((snapshot) => snapshot.data()?.active !== false).map((snapshot) => ({ performanceBaseId: snapshot.id, ...(snapshot.data() || {}) }));
  if (activeBaseRows.length !== 2) throw new Error(`Nombre de performances actives inattendu : ${activeBaseRows.length}/2.`);
  const activeKeys = new Set(activeBaseRows.flatMap((row) => [text(row.id), text(row.publicKey), text(row.performanceBaseId)]).filter(Boolean));
  let pageMatches = 0;
  const updatedPages = pageSnapshots.flatMap((snapshot) => {
    if (!snapshot.exists) throw new Error(`Page nageur absente : ${snapshot.id}.`);
    const data = snapshot.data() || {};
    let changed = false;
    const rows = (Array.isArray(data.rows) ? data.rows : []).map((row) => {
      if (!activeKeys.has(rowKey(row))) return row;
      pageMatches += 1;
      changed = true;
      return { ...row, intermediateTimes: withoutTargetSplits(row) };
    });
    return changed ? [{ snapshot, data: { ...data, rows } }] : [];
  });
  if (pageMatches !== 0) throw new Error(`Occurrences inattendues dans les pages nageur : ${pageMatches}/0.`);

  const bucketIds = new Set(activeBaseRows.flatMap(topBucketIds));
  const topSnapshots = await db.getAll(...Array.from(bucketIds).map((id) => db.collection("performanceTopViews").doc(id)));
  let topViewMatches = 0;
  const updatedTopViews = topSnapshots.filter((snapshot) => snapshot.exists).flatMap((snapshot) => {
    const data = snapshot.data() || {};
    let changed = false;
    const rows = (Array.isArray(data.rows) ? data.rows : []).map((row) => {
      if (!activeKeys.has(rowKey(row))) return row;
      topViewMatches += 1;
      changed = true;
      return { ...row, intermediateTimes: withoutTargetSplits(row) };
    });
    return changed ? [{ snapshot, data: { ...data, rows } }] : [];
  });

  const swimmerHash = stableHash(IDENTITY_KEY).slice(0, 40);
  const profilePath = `${PUBLIC_PREFIX}/swimmers/${swimmerHash.slice(0, 2)}/${swimmerHash}.json`;
  const publicTopPath = `${PUBLIC_PREFIX}/tops/100SF/F-S.json`;
  const publicPreviewPath = `${PUBLIC_PREFIX}/tops-preview/100SF/F-S.json`;
  const [additional, profile, publicTop, publicPreview, manifest] = await Promise.all([
    readJson(bucket, ADDITIONAL_FILE, {}),
    readJson(bucket, profilePath, null),
    readJson(bucket, publicTopPath, []),
    readJson(bucket, publicPreviewPath, []),
    readJson(bucket, `${PUBLIC_PREFIX}/manifest.json`, {})
  ]);
  if (!profile || text(profile.id) !== SWIMMER_ID || text(profile.identityKey) !== IDENTITY_KEY) throw new Error("Fiche publique Camille Heitz inattendue.");

  let additionalMatches = 0;
  const updatedAdditional = {
    ...additional,
    performances: (Array.isArray(additional?.performances) ? additional.performances : []).map((row) => {
      if (!activeKeys.has(rowKey(row))) return row;
      additionalMatches += 1;
      return { ...row, intermediateTimes: withoutTargetSplits(row) };
    })
  };
  let profileMatches = 0;
  const updatedProfile = {
    ...profile,
    rows: (Array.isArray(profile.rows) ? profile.rows : []).map((row) => {
      if (!activeKeys.has(rowKey(row))) return row;
      profileMatches += 1;
      return { ...row, intermediateTimes: withoutTargetSplits(row) };
    })
  };
  const patchPublicTop = (rows) => (Array.isArray(rows) ? rows : []).map((row) => activeKeys.has(rowKey(row))
    ? { ...row, intermediateTimes: withoutTargetSplits(row) }
    : row);
  const publicTopMatches = (Array.isArray(publicTop) ? publicTop : []).filter((row) => activeKeys.has(rowKey(row)) && (row.intermediateTimes || []).some(targetSplit)).length;
  const publicPreviewMatches = (Array.isArray(publicPreview) ? publicPreview : []).filter((row) => activeKeys.has(rowKey(row)) && (row.intermediateTimes || []).some(targetSplit)).length;
  if (additionalMatches !== 2 || profileMatches !== 2) {
    throw new Error(`Occurrences publiques inattendues : additional=${additionalMatches}/2, fiche=${profileMatches}/2.`);
  }

  const summary = {
    mode: apply ? "apply" : "dry-run",
    firestoreReads: importSnapshots.length + baseSnapshots.length + rawSnapshots.length + 1 + pageSnapshots.length + topSnapshots.length,
    baseRows: baseSnapshots.length,
    rawRows: rawSnapshots.length,
    swimmerPageRows: pageMatches,
    topViewRows: topViewMatches,
    additionalRows: additionalMatches,
    publicProfileRows: profileMatches,
    publicTopRows: publicTopMatches,
    publicPreviewRows: publicPreviewMatches,
    firestoreWrites: baseSnapshots.length + rawSnapshots.length + importSnapshots.length + updatedPages.length + updatedTopViews.length + baseSnapshots.length,
    storageWrites: 6
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const now = new Date().toISOString();
  const batch = db.batch();
  baseSnapshots.forEach((snapshot) => {
    const current = snapshot.data() || {};
    const updated = {
      ...current,
      intermediateTimes: withoutTargetSplits(current),
      updatedAt: now,
      updatedBy: "targeted-world-games-2009-split-removal",
      sourceAction: "performanceImport.intermediateTimesRemoved"
    };
    batch.set(snapshot.ref, updated, { merge: true });
    const changeId = stableHash([snapshot.id, "performanceImport.intermediateTimesRemoved", now].join("|")).slice(0, 40);
    batch.set(db.collection("performanceChanges").doc(changeId), {
      performanceBaseId: snapshot.id,
      publicKey: text(current.publicKey),
      action: "performanceImport.intermediateTimesRemoved",
      importId: text(current.importId),
      status: text(current.status || "active"),
      row: updated,
      actorUid: "",
      actorEmail: "",
      createdAt: now,
      confirmedByUser: true
    });
  });
  rawSnapshots.forEach((snapshot) => batch.set(snapshot.ref, {
    intermediateTimes: withoutTargetSplits(snapshot.data() || {}),
    updatedAt: now,
    updatedBy: "targeted-world-games-2009-split-removal"
  }, { merge: true }));
  importSnapshots.forEach((snapshot) => batch.set(snapshot.ref, {
    summary: {
      ...(snapshot.data()?.summary || {}),
      performancesWithIntermediateTimes: 0
    },
    updatedAt: now
  }, { merge: true }));
  updatedPages.forEach(({ snapshot, data }) => batch.set(snapshot.ref, { ...data, updatedAt: now }));
  updatedTopViews.forEach(({ snapshot, data }) => batch.set(snapshot.ref, { ...data, updatedAt: now }));
  await batch.commit();

  const updatedManifest = {
    ...manifest,
    generatedAt: now,
    lastTargetedRebuild: {
      generatedAt: now,
      reason: "performanceImport.intermediateTimesRemoved",
      affectedRows: 2,
      affectedSwimmers: 1,
      affectedTopBuckets: 1
    }
  };
  await Promise.all([
    writeJson(bucket, ADDITIONAL_FILE, updatedAdditional, "public, max-age=300"),
    writeJson(bucket, profilePath, updatedProfile),
    writeJson(bucket, publicTopPath, patchPublicTop(publicTop)),
    writeJson(bucket, publicPreviewPath, patchPublicTop(publicPreview)),
    writeJson(bucket, `${PUBLIC_PREFIX}/manifest.json`, updatedManifest, "public, max-age=300"),
    bucket.file(`${PUBLIC_PREFIX}/version.js`).save(`window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(now)};\n`, {
      resumable: false,
      contentType: "application/javascript; charset=utf-8",
      metadata: { cacheControl: "public, max-age=300" }
    })
  ]);
  console.log(JSON.stringify({ ...summary, completedAt: now }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
