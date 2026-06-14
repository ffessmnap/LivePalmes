const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const PROJECT_ID = "livepalmes";
const DATABASE = "(default)";
const PERFORMANCE_COLLECTION = "performances";
const PERFORMANCE_CHANGES_COLLECTION = "performanceChanges";
const SWIMMER_INDEX_COLLECTION = "performanceSwimmerIndex";
const SWIMMER_PAGES_COLLECTION = "performanceSwimmerPages";
const TOP_VIEWS_COLLECTION = "performanceTopViews";
const MIGRATION_COLLECTION = "performanceMigrationJobs";
const SWIMMER_PAGE_SIZE = 500;
const TOP_LIMIT = 500;

const rootDir = process.cwd();
const defaultSeed = path.join(rootDir, "outputs", "performance-base-seed.ndjson");

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeSearchText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function searchTokens(value) {
  return Array.from(new Set(normalizeSearchText(value).split(/\s+/).filter((token) => token.length >= 2)));
}

function searchPrefixes(value) {
  const prefixes = new Set();
  searchTokens(value).forEach((token) => {
    const max = Math.min(token.length, 18);
    for (let length = 2; length <= max; length += 1) prefixes.add(token.slice(0, length));
  });
  return Array.from(prefixes).slice(0, 300);
}

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function performancePublicKey(row = {}) {
  if (row.publicKey) return cleanText(row.publicKey);
  if (row.id) return `${row.source || "intranap"}|${row.id}`;
  return [
    row.swimmerIdentityKey || row.swimmerId || row.swimmer,
    row.date,
    row.course,
    row.timeValue,
    row.club || row.clubName,
    row.competitionId || row.location
  ].map(cleanText).join("|");
}

function publicSwimmerKey(row = {}) {
  if (row.swimmerIdentityKey) return cleanText(row.swimmerIdentityKey);
  const first = normalizeSearchText(row.firstName);
  const last = normalizeSearchText(row.lastName);
  const birth = cleanText(row.birthDate);
  return first && last && birth ? `${last}|${first}|${birth}` : cleanText(row.swimmerId || row.swimmer);
}

function swimmerIndexKey(row = {}) {
  return publicSwimmerKey(row);
}

function swimmerPageId(indexDocId, pageIndex) {
  return `${indexDocId}_${String(pageIndex).padStart(4, "0")}`;
}

function topBucketKey(filters = {}) {
  return [
    cleanText(filters.course),
    cleanText(filters.sex),
    cleanText(filters.category),
    Number(filters.seasonYear || 0) || 0,
    cleanText(filters.regionId)
  ].join("|");
}

function topBucketId(bucketKey) {
  return stableHash(bucketKey).slice(0, 40);
}

function topBucketVariants(row = {}) {
  const course = cleanText(row.course);
  const sex = cleanText(row.sex);
  if (!course || (sex !== "F" && sex !== "M")) return [];
  const categoryValues = Array.from(new Set([cleanText(row.category), ""]));
  const seasonValues = Array.from(new Set([Number(row.seasonYear || 0) || 0, 0]));
  const regionValues = Array.from(new Set([cleanText(row.regionId), ""]));
  const variants = [];
  categoryValues.forEach((category) => {
    seasonValues.forEach((seasonYear) => {
      regionValues.forEach((regionId) => {
        const key = topBucketKey({ course, sex, category, seasonYear, regionId });
        variants.push({ key, id: topBucketId(key), course, sex, category, seasonYear, regionId });
      });
    });
  });
  return variants;
}

function betterPerformance(candidate, current) {
  if (!current) return true;
  return Number(candidate.timeValue || 0) < Number(current.timeValue || 0) ||
    (Number(candidate.timeValue || 0) === Number(current.timeValue || 0) && cleanText(candidate.date).localeCompare(cleanText(current.date)) < 0);
}

function sortPerformanceRows(rows = []) {
  return rows.sort((a, b) =>
    cleanText(b.date).localeCompare(cleanText(a.date)) ||
    cleanText(a.course).localeCompare(cleanText(b.course), "fr-FR", { numeric: true }) ||
    Number(a.timeValue || 0) - Number(b.timeValue || 0)
  );
}

function topRows(rows = []) {
  const best = Array.from(rows)
    .sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || cleanText(a.date).localeCompare(cleanText(b.date)))
    .slice(0, TOP_LIMIT);
  return best;
}

function publicRow(row = {}) {
  return {
    id: cleanText(row.id),
    source: cleanText(row.source || "intranap"),
    publicKey: cleanText(row.publicKey || performancePublicKey(row)),
    performanceBaseId: cleanText(row.performanceBaseId),
    status: cleanText(row.status || "active"),
    active: row.active !== false && row.status !== "hidden",
    swimmerId: cleanText(row.swimmerId),
    originalSwimmerId: cleanText(row.originalSwimmerId),
    swimmerIdentityKey: cleanText(row.swimmerIdentityKey),
    swimmer: cleanText(row.swimmer),
    firstName: cleanText(row.firstName),
    lastName: cleanText(row.lastName),
    birthDate: cleanText(row.birthDate),
    sex: cleanText(row.sex),
    clubId: cleanText(row.clubId),
    club: cleanText(row.club),
    clubName: cleanText(row.clubName),
    regionId: cleanText(row.regionId),
    regionLabel: cleanText(row.regionLabel),
    competitionId: cleanText(row.competitionId),
    competition: cleanText(row.competition),
    location: cleanText(row.location),
    date: cleanText(row.date),
    seasonYear: Number(row.seasonYear || 0) || 0,
    pool: cleanText(row.pool),
    chrono: cleanText(row.chrono),
    course: cleanText(row.course),
    courseLabel: cleanText(row.courseLabel),
    courseShortLabel: cleanText(row.courseShortLabel),
    style: cleanText(row.style),
    length: Number(row.length || 0) || 0,
    isIntermediate: row.isIntermediate === true,
    originCourse: cleanText(row.originCourse),
    originCourseShortLabel: cleanText(row.originCourseShortLabel),
    originPerformanceId: cleanText(row.originPerformanceId),
    category: cleanText(row.category),
    categoryCode: cleanText(row.categoryCode),
    categoryLabel: cleanText(row.categoryLabel),
    timeValue: Number(row.timeValue || 0) || 0,
    time: cleanText(row.time),
    points: cleanText(row.points),
    rank: cleanText(row.rank)
  };
}

function firestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(firestoreValue) } };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value)
          .filter(([, item]) => item !== undefined)
          .map(([key, item]) => [key, firestoreValue(item)]))
      }
    };
  }
  return { stringValue: String(value) };
}

function firestoreFields(object) {
  return Object.fromEntries(Object.entries(object)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, firestoreValue(value)]));
}

function docName(collection, id) {
  return `projects/${PROJECT_ID}/databases/${DATABASE}/documents/${collection}/${id}`;
}

function updateWrite(collection, id, payload) {
  return {
    update: {
      name: docName(collection, id),
      fields: firestoreFields(payload)
    }
  };
}

function readArgs(argv) {
  const args = {
    seed: defaultSeed,
    limit: 0,
    dryRun: false,
    skipPerformances: false,
    skipIndexes: false,
    onlyTopViews: false,
    onlySwimmerIndex: false,
    onlySwimmerPages: false,
    batchSize: 200
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--seed") args.seed = path.resolve(argv[index += 1] || "");
    else if (arg === "--limit") args.limit = Number(argv[index += 1] || 0) || 0;
    else if (arg === "--batch-size") args.batchSize = Number(argv[index += 1] || args.batchSize) || args.batchSize;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--skip-performances") args.skipPerformances = true;
    else if (arg === "--skip-indexes") args.skipIndexes = true;
    else if (arg === "--only-top-views") args.onlyTopViews = true;
    else if (arg === "--only-swimmer-index") args.onlySwimmerIndex = true;
    else if (arg === "--only-swimmer-pages") args.onlySwimmerPages = true;
  }
  return args;
}

function firebaseAccessToken() {
  const output = execFileSync("cmd.exe", ["/c", "firebase.cmd", "login:list", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const payload = JSON.parse(output);
  const token = payload.result?.[0]?.tokens?.access_token;
  if (!token) throw new Error("Token Firebase CLI introuvable.");
  return token;
}

async function commitWrites(writes, tokenState) {
  if (!writes.length) return;
  const body = JSON.stringify({ writes });
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (!tokenState.token || Date.now() - tokenState.refreshedAt > 45 * 60 * 1000) {
      tokenState.token = firebaseAccessToken();
      tokenState.refreshedAt = Date.now();
    }
    let response;
    try {
      response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE)}/documents:commit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenState.token}`,
          "Content-Type": "application/json"
        },
        body
      });
    } catch (error) {
      if (attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      continue;
    }
    if (response.ok) return;
    const text = await response.text();
    if (response.status === 401) {
      tokenState.token = "";
      continue;
    }
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 5) {
      throw new Error(`Commit Firestore impossible (${response.status}) : ${text.slice(0, 800)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
  }
}

async function commitInBatches(writes, tokenState, batchSize, label = "") {
  let written = 0;
  for (let index = 0; index < writes.length; index += batchSize) {
    await commitWrites(writes.slice(index, index + batchSize), tokenState);
    written += Math.min(batchSize, writes.length - index);
    if (label && (written % 5000 === 0 || written === writes.length)) {
      console.log(`${label}: ${written}/${writes.length}`);
    }
  }
}

function loadSeed(seedPath, limit = 0) {
  const text = fs.readFileSync(seedPath, "utf8");
  const rows = [];
  const seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const row = publicRow(JSON.parse(line));
    const publicKey = row.publicKey || performancePublicKey(row);
    if (!publicKey || seen.has(publicKey) || !row.timeValue || !row.course || !row.sex) continue;
    seen.add(publicKey);
    const performanceBaseId = row.performanceBaseId || stableHash(publicKey).slice(0, 40);
    rows.push({
      ...row,
      publicKey,
      performanceBaseId,
      status: "active",
      active: true,
      baseVersion: 1,
      sourceAction: "historicalSeed",
      updatedAt: new Date().toISOString(),
      updatedBy: "local-seed"
    });
    if (limit && rows.length >= limit) break;
  }
  return rows;
}

function buildIndexes(rows) {
  const swimmers = new Map();
  const topBuckets = new Map();

  rows.forEach((row) => {
    const indexKey = swimmerIndexKey(row);
    if (indexKey) {
      if (!swimmers.has(indexKey)) {
        swimmers.set(indexKey, {
          indexKey,
          rows: [],
          sourceIds: new Set(),
          aliases: new Set()
        });
      }
      const swimmer = swimmers.get(indexKey);
      swimmer.rows.push(row);
      [row.swimmerId, row.originalSwimmerId].map(cleanText).filter(Boolean).forEach((id) => swimmer.sourceIds.add(id));
      if (row.originalSwimmerId && row.originalSwimmerId !== row.swimmerId) swimmer.aliases.add(row.originalSwimmerId);
    }

    if (!row.timeValue || row.active === false || row.status === "hidden") return;
    topBucketVariants(row).forEach((bucket) => {
      if (!topBuckets.has(bucket.id)) topBuckets.set(bucket.id, { ...bucket, bestBySwimmer: new Map() });
      const current = topBuckets.get(bucket.id);
      const key = publicSwimmerKey(row);
      if (!key) return;
      if (betterPerformance(row, current.bestBySwimmer.get(key))) current.bestBySwimmer.set(key, row);
    });
  });

  return { swimmers, topBuckets };
}

function swimmerIndexDoc(indexKey, aggregate) {
  const rows = sortPerformanceRows(aggregate.rows.slice());
  const first = rows[0] || {};
  const latestWithClub = rows.find((row) => row.club || row.clubName) || first;
  const name = first.swimmer || [first.firstName, first.lastName].filter(Boolean).join(" ");
  const sourceIds = Array.from(aggregate.sourceIds);
  const aliases = Array.from(new Set([...aggregate.aliases, ...sourceIds.filter((id) => id !== first.swimmerId)]));
  const searchText = normalizeSearchText([
    name,
    first.firstName,
    first.lastName,
    first.birthDate,
    first.sex,
    latestWithClub.club,
    latestWithClub.clubName,
    first.swimmerId,
    ...sourceIds
  ].filter(Boolean).join(" "));
  return {
    indexKey,
    id: first.swimmerId || sourceIds[0] || stableHash(indexKey).slice(0, 16),
    aliases,
    sourceIds,
    identityKey: first.swimmerIdentityKey || indexKey,
    name,
    lastName: first.lastName,
    firstName: first.firstName,
    birthDate: first.birthDate,
    sex: first.sex,
    clubId: latestWithClub.clubId || "",
    club: latestWithClub.club || "",
    clubName: latestWithClub.clubName || "",
    performanceCount: rows.filter((row) => !row.isIntermediate).length,
    rowCount: rows.length,
    pageCount: Math.ceil(rows.length / SWIMMER_PAGE_SIZE),
    latestDate: rows[0]?.date || "",
    searchText,
    searchPrefixes: searchPrefixes(searchText),
    source: "performances",
    sourceAction: "historicalSeed",
    updatedAt: new Date().toISOString()
  };
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const seedPath = path.resolve(args.seed);
  if (!fs.existsSync(seedPath)) throw new Error(`Fichier seed introuvable : ${seedPath}`);

  console.log(`Lecture ${seedPath}`);
  const rows = loadSeed(seedPath, args.limit);
  const { swimmers, topBuckets } = buildIndexes(rows);
  const topViewDocs = Array.from(topBuckets.values()).map((bucket) => ({
    id: bucket.id,
    payload: {
      bucketId: bucket.id,
      bucketKey: bucket.key,
      course: bucket.course,
      sex: bucket.sex,
      category: bucket.category,
      seasonYear: bucket.seasonYear,
      regionId: bucket.regionId,
      rows: topRows(Array.from(bucket.bestBySwimmer.values())),
      rowCount: Math.min(TOP_LIMIT, bucket.bestBySwimmer.size),
      sourceRowCount: bucket.bestBySwimmer.size,
      updatedAt: new Date().toISOString()
    }
  }));
  const maxTopBytes = topViewDocs.reduce((max, doc) => Math.max(max, Buffer.byteLength(JSON.stringify(doc.payload))), 0);
  const summary = {
    performances: rows.length,
    swimmers: swimmers.size,
    topViews: topViewDocs.length,
    maxTopViewJsonBytes: maxTopBytes,
    dryRun: args.dryRun
  };
  console.log(JSON.stringify(summary, null, 2));
  if (args.dryRun) return;

  const tokenState = { token: "", refreshedAt: 0 };
  const now = new Date().toISOString();

  if (!args.skipPerformances) {
    const writes = rows.map((row) => updateWrite(PERFORMANCE_COLLECTION, row.performanceBaseId, row));
    await commitInBatches(writes, tokenState, Math.min(args.batchSize, 200), "performances");
  }

  if (!args.skipIndexes && !args.onlyTopViews && !args.onlySwimmerPages) {
    const swimmerWrites = [];
    swimmers.forEach((aggregate, indexKey) => {
      const indexDocId = stableHash(indexKey).slice(0, 40);
      swimmerWrites.push(updateWrite(SWIMMER_INDEX_COLLECTION, indexDocId, swimmerIndexDoc(indexKey, aggregate)));
    });
    await commitInBatches(swimmerWrites, tokenState, 200, "swimmerIndex");
  }

  if (!args.skipIndexes && !args.onlyTopViews && !args.onlySwimmerIndex) {
    let pageWriteCount = 0;
    for (const [indexKey, aggregate] of swimmers.entries()) {
      const indexDocId = stableHash(indexKey).slice(0, 40);
      const sortedRows = sortPerformanceRows(aggregate.rows.slice()).map(publicRow);
      const pageWrites = [];
      for (let pageIndex = 0; pageIndex < Math.ceil(sortedRows.length / SWIMMER_PAGE_SIZE); pageIndex += 1) {
        pageWrites.push(updateWrite(SWIMMER_PAGES_COLLECTION, swimmerPageId(indexDocId, pageIndex), {
          swimmerIndexId: indexDocId,
          indexKey,
          pageIndex,
          rowCount: Math.min(SWIMMER_PAGE_SIZE, sortedRows.length - (pageIndex * SWIMMER_PAGE_SIZE)),
          rows: sortedRows.slice(pageIndex * SWIMMER_PAGE_SIZE, (pageIndex + 1) * SWIMMER_PAGE_SIZE),
          updatedAt: now
        }));
      }
      await commitInBatches(pageWrites, tokenState, 10);
      pageWriteCount += pageWrites.length;
      if (pageWriteCount % 1000 < pageWrites.length || pageWriteCount === pageWrites.length) {
        console.log(`swimmerPages total: ${pageWriteCount}`);
      }
    }
  }

  if (!args.skipIndexes && !args.onlySwimmerIndex && !args.onlySwimmerPages) {
    await commitInBatches(topViewDocs.map((doc) => updateWrite(TOP_VIEWS_COLLECTION, doc.id, doc.payload)), tokenState, 10, "topViews");
  }

  await commitWrites([updateWrite(MIGRATION_COLLECTION, "intranap-csv-seed", {
    ...summary,
    dryRun: false,
    completedAt: now,
    source: "BDD INTRANAP",
    seedPath
  })], tokenState);
  console.log("Import Firestore termine.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
