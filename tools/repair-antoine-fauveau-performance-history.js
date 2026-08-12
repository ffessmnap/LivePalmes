const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROJECT_ID = "livepalmes";
const PUBLIC_BUCKET = "livepalmes-public-data-718081132564";
const PUBLIC_PREFIX = "performance-public-firestore";
const OLD_IDENTITY = "FAUVEAU|ANTOINE|1992-07-01";
const NEW_IDENTITY = "FAUVEAU|ANTOINE|1993-07-01";
const SWIMMER_ID = "912";
const SOURCE_FILE = path.resolve(process.cwd(), "outputs", "antoine-fauveau-source", "intranap-swimmer-perfs", "chunk-00.json");
const EXPECTED_CURRENT_ROWS = 680;
const EXPECTED_LEGACY_ROWS = 744;
const EXPECTED_MISSING_ROWS = 71;
const EXPECTED_FINAL_ROWS = 353;
const EXPECTED_INTERMEDIATE_ROWS = 398;
const PAGE_SIZE = 500;

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function normalizeSearchText(value) {
  return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, " ").toUpperCase().trim();
}

function searchPrefixes(value) {
  const prefixes = new Set();
  normalizeSearchText(value).split(/\s+/).filter((token) => token.length >= 2).forEach((token) => {
    for (let length = 2; length <= Math.min(token.length, 18); length += 1) prefixes.add(token.slice(0, length));
  });
  return Array.from(prefixes).slice(0, 300);
}

function categoryForRow(row) {
  const seasonYear = Number(row.seasonYear || 0) || 0;
  const age = seasonYear - 1993;
  if (age <= 9) return "P";
  if (age <= 11) return "B";
  if (age <= 13) return "M";
  if (age <= 15) return "C";
  if (age <= 17) return "J";
  if (age <= 29) return "S";
  if (age <= 39) return "M30+";
  if (age <= 49) return "M40+";
  if (age <= 59) return "M50+";
  if (age <= 69) return "M60+";
  if (age <= 79) return "M70+";
  return "M80+";
}

function categoryMetadata(category) {
  const labels = {
    P: "Poussins", B: "Benjamins", M: "Minimes Hommes", C: "Cadets", J: "Juniors Hommes", S: "Seniors Hommes",
    "M30+": "Hommes 30+", "M40+": "Hommes 40+", "M50+": "Hommes 50+", "M60+": "Hommes 60+", "M70+": "Hommes 70+", "M80+": "Hommes 80+"
  };
  const display = { P: "HPO", B: "HBE", M: "HMI", C: "HCA", J: "HJU", S: "HSE" };
  return { category, categoryCode: display[category] || `H${category.slice(1)}`, categoryLabel: labels[category] || category };
}

function correctedRow(row, now) {
  const category = categoryForRow(row);
  return {
    ...row,
    swimmerId: SWIMMER_ID,
    originalSwimmerId: SWIMMER_ID,
    swimmerIdentityKey: NEW_IDENTITY,
    swimmer: "Antoine FAUVEAU",
    firstName: "Antoine",
    lastName: "FAUVEAU",
    birthDate: "1993-07-01",
    sex: "M",
    ...categoryMetadata(category),
    status: "active",
    active: true,
    sourceAction: "performanceHistory.restored",
    updatedAt: now,
    updatedBy: "targeted-history-repair"
  };
}

function legacyBaseRow(row, now) {
  const publicKey = `intranap|${cleanText(row.id)}`;
  const performanceBaseId = stableHash(publicKey).slice(0, 40);
  return correctedRow({
    ...row,
    source: "intranap",
    publicKey,
    performanceBaseId,
    baseVersion: 1,
    clubId: cleanText(row.clubId) || "106",
    club: cleanText(row.club) || "CNHC",
    clubName: cleanText(row.clubName) || "Club Nautique de Houilles Carrières",
    regionId: cleanText(row.regionId) || "3",
    regionLabel: cleanText(row.regionLabel) || "Île-de-France"
  }, now);
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== "" && value !== null && value !== undefined && value !== false && (!Array.isArray(value) || value.length)));
}

function publicSwimmerRow(row) {
  return compactObject({
    id: cleanText(row.id), source: cleanText(row.source), publicKey: cleanText(row.publicKey), performanceBaseId: cleanText(row.performanceBaseId),
    club: cleanText(row.club), location: cleanText(row.location), date: cleanText(row.date), seasonYear: Number(row.seasonYear || 0), pool: cleanText(row.pool),
    course: cleanText(row.course), ...(row.isIntermediate === true ? { length: Number(row.length || 0), isIntermediate: true, originCourse: cleanText(row.originCourse), originPerformanceId: cleanText(row.originPerformanceId) } : {}),
    categoryCode: cleanText(row.categoryCode), timeValue: Number(row.timeValue || 0), time: cleanText(row.time), intermediateTimes: Array.isArray(row.intermediateTimes) ? row.intermediateTimes : []
  });
}

function publicTopRow(row) {
  return compactObject({
    id: cleanText(row.id), source: cleanText(row.source), importId: cleanText(row.importId), publicKey: cleanText(row.publicKey), performanceBaseId: cleanText(row.performanceBaseId),
    swimmerId: SWIMMER_ID, swimmerIdentityKey: NEW_IDENTITY, swimmer: "Antoine FAUVEAU", firstName: "Antoine", lastName: "FAUVEAU", birthDate: "1993-07-01", sex: "M",
    club: cleanText(row.club), clubName: cleanText(row.clubName), regionId: cleanText(row.regionId), competition: cleanText(row.competition), location: cleanText(row.location),
    date: cleanText(row.date), seasonYear: Number(row.seasonYear || 0), pool: cleanText(row.pool), course: cleanText(row.course), courseShortLabel: cleanText(row.courseShortLabel),
    isIntermediate: row.isIntermediate === true, originCourse: cleanText(row.originCourse), category: cleanText(row.category), categoryCode: cleanText(row.categoryCode),
    timeValue: Number(row.timeValue || 0), time: cleanText(row.time), intermediateTimes: Array.isArray(row.intermediateTimes) ? row.intermediateTimes : []
  });
}

function sortRows(rows) {
  return rows.sort((left, right) => cleanText(right.date).localeCompare(cleanText(left.date)) || cleanText(left.course).localeCompare(cleanText(right.course), "fr", { numeric: true }) || Number(left.timeValue || 0) - Number(right.timeValue || 0));
}

function candidateKey(row) {
  return [cleanText(row.swimmerIdentityKey), Number(row.seasonYear || 0), cleanText(row.regionId)].join("|");
}

function topBucketVariants(row) {
  const variants = [];
  [cleanText(row.category), ""].forEach((category) => [Number(row.seasonYear || 0), 0].forEach((seasonYear) => [cleanText(row.regionId), ""].forEach((regionId) => {
    const key = [cleanText(row.course), "M", category, seasonYear, regionId].join("|");
    variants.push({ id: stableHash(key).slice(0, 40), key, course: cleanText(row.course), sex: "M", category, seasonYear, regionId });
  })));
  return variants;
}

function rowMatchesBucket(row, bucket) {
  return cleanText(row.course) === bucket.course && (!bucket.category || cleanText(row.category) === bucket.category) && (!bucket.seasonYear || Number(row.seasonYear || 0) === bucket.seasonYear) && (!bucket.regionId || cleanText(row.regionId) === bucket.regionId);
}

function bestRows(rows) {
  const best = new Map();
  rows.forEach((row) => {
    const key = candidateKey(row);
    const current = best.get(key);
    if (!current || Number(row.timeValue || 0) < Number(current.timeValue || 0) || (Number(row.timeValue || 0) === Number(current.timeValue || 0) && cleanText(row.date) < cleanText(current.date))) best.set(key, publicTopRow(row));
  });
  return Array.from(best.values()).sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || cleanText(a.date).localeCompare(cleanText(b.date))).slice(0, 500);
}

async function readStorageJson(bucket, relativePath, fallback) {
  try {
    const [buffer] = await bucket.file(`${PUBLIC_PREFIX}/${relativePath}`).download();
    return JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    if (Number(error?.code) === 404 || /not found|No such object/i.test(error?.message || "")) return fallback;
    throw error;
  }
}

async function saveStorageJson(bucket, relativePath, payload, cacheControl = "public, max-age=31536000, immutable") {
  await bucket.file(`${PUBLIC_PREFIX}/${relativePath}`).save(JSON.stringify(payload), { resumable: false, contentType: "application/json; charset=utf-8", metadata: { cacheControl } });
}

async function publishPublicFiles(admin, combinedRows, affectedRows, summary, now) {
  const { getStorage } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "storage"));
  const bucket = getStorage().bucket(PUBLIC_BUCKET);
  const indexId = stableHash(NEW_IDENTITY).slice(0, 40);
  const oldIndexId = stableHash(OLD_IDENTITY).slice(0, 40);
  const latestWithClub = combinedRows.find((row) => row.club || row.clubName) || combinedRows[0];
  const searchText = normalizeSearchText(["Antoine FAUVEAU", "Antoine", "FAUVEAU", "1993-07-01", "M", latestWithClub.club, latestWithClub.clubName, SWIMMER_ID].join(" "));
  const perfFile = `swimmers/${indexId.slice(0, 2)}/${indexId}.json`;
  const oldPerfFile = `swimmers/${oldIndexId.slice(0, 2)}/${oldIndexId}.json`;
  const swimmerPayload = {
    id: SWIMMER_ID, identityKey: NEW_IDENTITY, sourceIds: [SWIMMER_ID], name: "Antoine FAUVEAU", lastName: "FAUVEAU", firstName: "Antoine",
    birthDate: "1993-07-01", sex: "M", clubId: cleanText(latestWithClub.clubId), club: cleanText(latestWithClub.club), clubName: cleanText(latestWithClub.clubName),
    performanceCount: summary.finalRows, rowCount: combinedRows.length, rows: combinedRows.map(publicSwimmerRow)
  };
  await saveStorageJson(bucket, perfFile, swimmerPayload);
  await bucket.file(`${PUBLIC_PREFIX}/${oldPerfFile}`).delete({ ignoreNotFound: true });
  const searchRow = { ...swimmerPayload, rows: undefined, rowCount: undefined, latestDate: combinedRows[0].date, searchText, perfFile };
  for (const shard of ["an", "fa"]) {
    const relativePath = `search/${shard}.json`;
    const rows = await readStorageJson(bucket, relativePath, []);
    const filtered = (Array.isArray(rows) ? rows : []).filter((row) => cleanText(row.id) !== SWIMMER_ID && cleanText(row.identityKey) !== OLD_IDENTITY && cleanText(row.identityKey) !== NEW_IDENTITY);
    filtered.push(compactObject(searchRow));
    filtered.sort((a, b) => cleanText(a.lastName).localeCompare(cleanText(b.lastName), "fr") || cleanText(a.firstName).localeCompare(cleanText(b.firstName), "fr"));
    await saveStorageJson(bucket, relativePath, filtered);
  }
  const idItems = await readStorageJson(bucket, "ids/91.json", {});
  idItems[SWIMMER_ID] = compactObject(searchRow);
  await saveStorageJson(bucket, "ids/91.json", idItems);

  const topKeys = new Set(affectedRows.map((row) => `${cleanText(row.course)}|${cleanText(row.category)}`).filter((key) => !key.startsWith("|") && !key.endsWith("|")));
  for (const topKey of topKeys) {
    const [course, category] = topKey.split("|");
    const fileName = `M-${category.replace(/\+/g, "")}.json`;
    const fullPath = `tops/${course}/${fileName}`;
    const previewPath = `tops-preview/${course}/${fileName}`;
    const existing = await readStorageJson(bucket, fullPath, []);
    const kept = (Array.isArray(existing) ? existing : []).filter((row) => cleanText(row.swimmerId) !== SWIMMER_ID && cleanText(row.swimmerIdentityKey) !== OLD_IDENTITY && cleanText(row.swimmerIdentityKey) !== NEW_IDENTITY);
    const replacements = combinedRows.filter((row) => row.course === course && row.category === category);
    const rows = bestRows([...kept, ...replacements]);
    await saveStorageJson(bucket, fullPath, rows);
    await saveStorageJson(bucket, previewPath, rows.slice(0, 100));
  }
  const manifest = await readStorageJson(bucket, "manifest.json", {});
  await saveStorageJson(bucket, "manifest.json", { ...manifest, generatedAt: now, lastTargetedRebuild: { generatedAt: now, reason: "antoine-fauveau-history-restored", affectedRows: combinedRows.length, affectedSwimmers: 1, affectedTopBuckets: topKeys.size } }, "public, max-age=300");
  await bucket.file(`${PUBLIC_PREFIX}/version.js`).save(`window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(now)};\n`, { resumable: false, contentType: "application/javascript; charset=utf-8", metadata: { cacheControl: "public, max-age=300" } });
  return topKeys.size;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const resumePublication = process.argv.includes("--resume-publication");
  if (apply && !process.argv.includes("--confirm-751-rows")) throw new Error("Confirmation requise : --confirm-751-rows");
  if (!fs.existsSync(SOURCE_FILE)) throw new Error(`Source normalisée absente : ${SOURCE_FILE}`);
  const sourcePayload = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"));
  const legacyRows = Array.isArray(sourcePayload[SWIMMER_ID]) ? sourcePayload[SWIMMER_ID] : [];
  if (legacyRows.length !== EXPECTED_LEGACY_ROWS) throw new Error(`Source historique inattendue : ${legacyRows.length}/${EXPECTED_LEGACY_ROWS}`);

  const admin = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin"));
  const { getFirestore } = require(path.join(process.cwd(), "functions", "node_modules", "firebase-admin", "lib", "firestore"));
  if (!admin.getApps().length) admin.initializeApp({ projectId: PROJECT_ID });
  const db = getFirestore();
  const [oldSnapshot, duplicateSnapshot] = await Promise.all([
    db.collection("performances").where("swimmerIdentityKey", "==", OLD_IDENTITY).limit(1200).get(),
    db.collection("performances").where("swimmerIdentityKey", "==", NEW_IDENTITY).limit(1200).get()
  ]);
  if (resumePublication) {
    if (oldSnapshot.size !== 0 || duplicateSnapshot.size !== 751) {
      throw new Error(`Reprise impossible : ancienne identité=${oldSnapshot.size}, nouvelle identité=${duplicateSnapshot.size}`);
    }
    const now = new Date().toISOString();
    const combinedRows = sortRows(duplicateSnapshot.docs.map((doc) => ({ performanceBaseId: doc.id, ...(doc.data() || {}) })));
    const finalCount = combinedRows.filter((row) => row.isIntermediate !== true).length;
    const intermediateCount = combinedRows.filter((row) => row.isIntermediate === true).length;
    if (finalCount !== EXPECTED_FINAL_ROWS || intermediateCount !== EXPECTED_INTERMEDIATE_ROWS) {
      throw new Error(`Reprise incohérente : finales=${finalCount}, intermédiaires=${intermediateCount}`);
    }
    const summary = { mode: "resume-publication", reads: duplicateSnapshot.size, originalRows: combinedRows.length, duplicateRowsToDelete: 0, missingRowsToCreate: 0, finalRows: finalCount, intermediateRows: intermediateCount };
    const affectedPublicTopFiles = await publishPublicFiles(admin, combinedRows, [...legacyRows, ...combinedRows], summary, now);
    console.log(JSON.stringify({ ...summary, affectedPublicTopFiles, completedAt: now }, null, 2));
    return;
  }
  if (oldSnapshot.size !== EXPECTED_CURRENT_ROWS || duplicateSnapshot.size !== EXPECTED_CURRENT_ROWS) {
    throw new Error(`Inventaire inattendu : originaux=${oldSnapshot.size}, copies=${duplicateSnapshot.size}`);
  }
  const oldByLogicalId = new Map(oldSnapshot.docs.map((doc) => [cleanText(doc.data()?.id), doc]));
  const duplicateByLogicalId = new Map(duplicateSnapshot.docs.map((doc) => [cleanText(doc.data()?.id), doc]));
  const sharedIds = Array.from(oldByLogicalId.keys()).filter((id) => duplicateByLogicalId.has(id));
  if (sharedIds.length !== EXPECTED_CURRENT_ROWS) throw new Error(`Copies non bijectives : ${sharedIds.length}/${EXPECTED_CURRENT_ROWS}`);

  const now = new Date().toISOString();
  const correctedExisting = oldSnapshot.docs.map((doc) => ({ docRef: doc.ref, row: correctedRow({ performanceBaseId: doc.id, ...(doc.data() || {}) }, now) }));
  const missingRows = legacyRows.filter((row) => !oldByLogicalId.has(cleanText(row.id))).map((row) => legacyBaseRow(row, now));
  if (missingRows.length !== EXPECTED_MISSING_ROWS) throw new Error(`Historique manquant inattendu : ${missingRows.length}/${EXPECTED_MISSING_ROWS}`);
  const combinedRows = sortRows([...correctedExisting.map((item) => item.row), ...missingRows]);
  const finalCount = combinedRows.filter((row) => row.isIntermediate !== true).length;
  const intermediateCount = combinedRows.filter((row) => row.isIntermediate === true).length;
  if (combinedRows.length !== 751 || finalCount !== EXPECTED_FINAL_ROWS || intermediateCount !== EXPECTED_INTERMEDIATE_ROWS) {
    throw new Error(`Total réparé inattendu : lignes=${combinedRows.length}, finales=${finalCount}, intermédiaires=${intermediateCount}`);
  }

  const summary = {
    mode: apply ? "apply" : "dry-run", reads: oldSnapshot.size + duplicateSnapshot.size, originalRows: oldSnapshot.size,
    duplicateRowsToDelete: duplicateSnapshot.size, missingRowsToCreate: missingRows.length, finalRows: finalCount, intermediateRows: intermediateCount
  };
  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const writer = db.bulkWriter({ throttling: { initialOpsPerSecond: 100, maxOpsPerSecond: 200 } });
  correctedExisting.forEach(({ docRef, row }) => writer.set(docRef, row, { merge: true }));
  missingRows.forEach((row) => writer.create(db.collection("performances").doc(row.performanceBaseId), row));
  duplicateSnapshot.docs.forEach((doc) => writer.delete(doc.ref));
  await writer.close();

  const indexId = stableHash(NEW_IDENTITY).slice(0, 40);
  const indexRef = db.collection("performanceSwimmerIndex").doc(indexId);
  const oldIndexRef = db.collection("performanceSwimmerIndex").doc(stableHash(OLD_IDENTITY).slice(0, 40));
  const [indexSnapshot, oldIndexSnapshot] = await Promise.all([indexRef.get(), oldIndexRef.get()]);
  const existingIndex = indexSnapshot.data() || {};
  const latestWithClub = combinedRows.find((row) => row.club || row.clubName) || combinedRows[0];
  const searchText = normalizeSearchText(["Antoine FAUVEAU", "Antoine", "FAUVEAU", "1993-07-01", "M", latestWithClub.club, latestWithClub.clubName, SWIMMER_ID].join(" "));
  const batch = db.batch();
  batch.set(indexRef, {
    ...existingIndex, indexKey: NEW_IDENTITY, id: SWIMMER_ID, aliases: [], sourceIds: [SWIMMER_ID], identityKey: NEW_IDENTITY,
    name: "Antoine FAUVEAU", lastName: "FAUVEAU", firstName: "Antoine", birthDate: "1993-07-01", sex: "M",
    clubId: cleanText(latestWithClub.clubId), club: cleanText(latestWithClub.club), clubName: cleanText(latestWithClub.clubName),
    performanceCount: finalCount, rowCount: combinedRows.length, pageCount: Math.ceil(combinedRows.length / PAGE_SIZE), latestDate: combinedRows[0].date,
    searchText, searchPrefixes: searchPrefixes(searchText), source: "performances", sourceAction: "performanceHistory.restored", updatedAt: now
  });
  for (let pageIndex = 0; pageIndex < Math.ceil(combinedRows.length / PAGE_SIZE); pageIndex += 1) {
    batch.set(db.collection("performanceSwimmerPages").doc(`${indexId}_${String(pageIndex).padStart(4, "0")}`), {
      swimmerIndexId: indexId, indexKey: NEW_IDENTITY, pageIndex, rowCount: Math.min(PAGE_SIZE, combinedRows.length - pageIndex * PAGE_SIZE),
      rows: combinedRows.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE), updatedAt: now
    });
  }
  const oldPageCount = Math.max(0, Number(oldIndexSnapshot.data()?.pageCount || 0));
  for (let pageIndex = 0; pageIndex < oldPageCount; pageIndex += 1) {
    batch.delete(db.collection("performanceSwimmerPages").doc(`${oldIndexRef.id}_${String(pageIndex).padStart(4, "0")}`));
  }
  batch.delete(oldIndexRef);
  batch.set(db.collection("performanceMigrationJobs").doc("antoine-fauveau-history-20260812"), { ...summary, completedAt: now, swimmerId: SWIMMER_ID, identityKey: NEW_IDENTITY, source: "INTRANAP ciblé", confirmedByUser: true });
  await batch.commit();

  const affectedBuckets = new Map();
  [...oldSnapshot.docs.map((doc) => doc.data() || {}), ...duplicateSnapshot.docs.map((doc) => doc.data() || {}), ...combinedRows].forEach((row) => {
    if (!row.course || !row.timeValue) return;
    topBucketVariants(row).forEach((bucket) => affectedBuckets.set(bucket.id, bucket));
  });
  const bucketRefs = Array.from(affectedBuckets.keys()).map((id) => db.collection("performanceTopViews").doc(id));
  const bucketSnapshots = bucketRefs.length ? await db.getAll(...bucketRefs) : [];
  const topWriter = db.bulkWriter();
  bucketSnapshots.forEach((snapshot) => {
    const bucket = affectedBuckets.get(snapshot.id);
    const existing = snapshot.exists ? snapshot.data() || {} : {};
    const kept = (Array.isArray(existing.rows) ? existing.rows : []).filter((row) => cleanText(row.swimmerId) !== SWIMMER_ID && cleanText(row.swimmerIdentityKey) !== OLD_IDENTITY && cleanText(row.swimmerIdentityKey) !== NEW_IDENTITY);
    const replacements = combinedRows.filter((row) => rowMatchesBucket(row, bucket));
    const rows = bestRows([...kept, ...replacements]);
    topWriter.set(snapshot.ref, { ...existing, bucketId: bucket.id, bucketKey: bucket.key, course: bucket.course, sex: "M", category: bucket.category, seasonYear: bucket.seasonYear, regionId: bucket.regionId, rows, rowCount: rows.length, sourceRowCount: rows.length, updatedAt: now });
  });
  await topWriter.close();

  const affectedPublicRows = [
    ...oldSnapshot.docs.map((doc) => doc.data() || {}),
    ...duplicateSnapshot.docs.map((doc) => doc.data() || {}),
    ...combinedRows
  ];
  const affectedPublicTopFiles = await publishPublicFiles(admin, combinedRows, affectedPublicRows, summary, now);

  console.log(JSON.stringify({ ...summary, affectedTopViews: affectedBuckets.size, affectedPublicTopFiles, completedAt: now }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
