const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const rootDir = process.cwd();
const defaultSeed = path.join(rootDir, "outputs", "performance-base-seed.ndjson");
const defaultOutDir = path.join(rootDir, "performances", "public", "data", "performance-public");
let activeOutDir = "";
let expectedFiles = new Set();
const writeStats = {
  changed: 0,
  unchanged: 0,
  deleted: 0
};

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanIntermediateTimes(value) {
  return Array.isArray(value)
    ? value.map((split) => ({
      code: cleanText(split?.code),
      distance: Number(split?.distance || 0) || 0,
      time: cleanText(split?.time),
      timeValue: Number(split?.timeValue || 0) || 0
    })).filter((split) => split.time)
    : [];
}

function stableHash(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
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

function searchShard(value) {
  const token = normalizeSearchText(value).split(/\s+/).find((item) => item.length >= 2) || "";
  return token.slice(0, 2).toLowerCase();
}

function idShard(value) {
  const id = cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!id) return "";
  if (id.length === 1) return `0${id}`;
  return id.slice(0, 2);
}

function publicSwimmerKey(row = {}) {
  if (row.swimmerIdentityKey) return cleanText(row.swimmerIdentityKey);
  const first = normalizeSearchText(row.firstName);
  const last = normalizeSearchText(row.lastName);
  const birth = cleanText(row.birthDate);
  return first && last && birth ? `${last}|${first}|${birth}` : cleanText(row.swimmerId || row.swimmer);
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
  ].map((value) => cleanText(value)).join("|");
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

function topFileName(sex, category) {
  return `${cleanText(sex)}-${cleanText(category).replace(/\+/g, "")}.json`;
}

function swimmerFilePath(indexKey) {
  const hash = stableHash(indexKey).slice(0, 40);
  return `swimmers/${hash.slice(0, 2)}/${hash}.json`;
}

function publicRow(row = {}) {
  return {
    id: cleanText(row.id),
    source: cleanText(row.source || "intranap"),
    publicKey: cleanText(row.publicKey),
    performanceBaseId: cleanText(row.performanceBaseId),
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

function topRow(row = {}) {
  const top = {
    id: cleanText(row.id),
    source: cleanText(row.source || "intranap"),
    publicKey: cleanText(row.publicKey),
    swimmerId: cleanText(row.swimmerId),
    swimmerIdentityKey: cleanText(row.swimmerIdentityKey),
    swimmer: cleanText(row.swimmer),
    firstName: cleanText(row.firstName),
    lastName: cleanText(row.lastName),
    birthDate: cleanText(row.birthDate),
    sex: cleanText(row.sex),
    club: cleanText(row.club),
    clubName: cleanText(row.clubName),
    regionId: cleanText(row.regionId),
    regionLabel: cleanText(row.regionLabel),
    competitionId: cleanText(row.competitionId),
    competition: cleanText(row.competition),
    location: cleanText(row.location),
    date: cleanText(row.date),
    seasonYear: Number(row.seasonYear || 0) || 0,
    course: cleanText(row.course),
    courseShortLabel: cleanText(row.courseShortLabel),
    style: cleanText(row.style),
    isIntermediate: row.isIntermediate === true,
    originCourse: cleanText(row.originCourse),
    originCourseShortLabel: cleanText(row.originCourseShortLabel),
    originPerformanceId: cleanText(row.originPerformanceId),
    category: cleanText(row.category),
    categoryCode: cleanText(row.categoryCode),
    categoryLabel: cleanText(row.categoryLabel),
    timeValue: Number(row.timeValue || 0) || 0,
    time: cleanText(row.time)
  };
  const intermediateTimes = cleanIntermediateTimes(row.intermediateTimes);
  if (intermediateTimes.length) top.intermediateTimes = intermediateTimes;
  return top;
}

function swimmerRow(row = {}) {
  return {
    id: cleanText(row.id),
    source: cleanText(row.source || "intranap"),
    publicKey: cleanText(row.publicKey),
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

function readArgs(argv) {
  const args = {
    seed: defaultSeed,
    outDir: defaultOutDir,
    limit: 0,
    affectedFile: "",
    affectedPublicKeys: [],
    affectedSwimmerKeys: [],
    affectedTopKeys: []
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--seed") args.seed = path.resolve(argv[index += 1] || "");
    else if (arg === "--out-dir") args.outDir = path.resolve(argv[index += 1] || "");
    else if (arg === "--limit") args.limit = Number(argv[index += 1] || 0) || 0;
    else if (arg === "--affected-file") args.affectedFile = path.resolve(argv[index += 1] || "");
    else if (arg === "--affected-public-key") args.affectedPublicKeys.push(cleanText(argv[index += 1]));
    else if (arg === "--affected-swimmer-key") args.affectedSwimmerKeys.push(cleanText(argv[index += 1]));
    else if (arg === "--affected-top-key") args.affectedTopKeys.push(cleanText(argv[index += 1]));
  }
  return args;
}

function ensureInsideRoot(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(rootDir)) throw new Error(`Chemin hors projet refuse : ${resolved}`);
  return resolved;
}

function writeJson(filePath, payload) {
  writeText(filePath, JSON.stringify(payload));
}

function writeText(filePath, content) {
  const resolved = path.resolve(filePath);
  if (activeOutDir) expectedFiles.add(resolved);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) {
    writeStats.unchanged += 1;
    return;
  }
  fs.writeFileSync(filePath, content, "utf8");
  writeStats.changed += 1;
}

function deleteStaleFiles(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      deleteStaleFiles(full);
      if (!fs.readdirSync(full).length) fs.rmdirSync(full);
      return;
    }
    if (!expectedFiles.has(path.resolve(full))) {
      fs.unlinkSync(full);
      writeStats.deleted += 1;
    }
  });
}

function writeSearchIndexes(outDir, swimmerIndex, options = {}) {
  const onlySearchShards = options.searchShards instanceof Set ? options.searchShards : null;
  const onlyIdShards = options.idShards instanceof Set ? options.idShards : null;
  const searchShards = new Map();
  const idShards = new Map();

  swimmerIndex.forEach((swimmer) => {
    const compact = {
      id: swimmer.id,
      aliases: swimmer.aliases,
      sourceIds: swimmer.sourceIds,
      identityKey: swimmer.identityKey,
      name: swimmer.name,
      lastName: swimmer.lastName,
      firstName: swimmer.firstName,
      birthDate: swimmer.birthDate,
      sex: swimmer.sex,
      clubId: swimmer.clubId,
      club: swimmer.club,
      clubName: swimmer.clubName,
      performanceCount: swimmer.performanceCount,
      latestDate: swimmer.latestDate,
      searchText: swimmer.searchText,
      perfFile: swimmer.perfFile
    };

    const shards = new Set(swimmer.searchPrefixes
      .map(searchShard)
      .filter((shard) => shard && (!onlySearchShards || onlySearchShards.has(shard))));
    shards.forEach((shard) => {
      if (!searchShards.has(shard)) searchShards.set(shard, new Map());
      searchShards.get(shard).set(swimmer.id, compact);
    });

    [swimmer.id, ...(swimmer.sourceIds || []), ...(swimmer.aliases || [])]
      .map(cleanText)
      .filter(Boolean)
      .forEach((id) => {
        const shard = idShard(id);
        if (!shard) return;
        if (onlyIdShards && !onlyIdShards.has(shard)) return;
        if (!idShards.has(shard)) idShards.set(shard, {});
        idShards.get(shard)[id] = compact;
      });
  });

  let searchFileCount = 0;
  let idFileCount = 0;
  let largestSearchFile = { file: "", bytes: 0, rows: 0 };

  searchShards.forEach((items, shard) => {
    const rows = Array.from(items.values()).sort((a, b) =>
      cleanText(a.lastName).localeCompare(cleanText(b.lastName), "fr-FR") ||
      cleanText(a.firstName).localeCompare(cleanText(b.firstName), "fr-FR") ||
      cleanText(a.name).localeCompare(cleanText(b.name), "fr-FR")
    );
    const filePath = path.join(outDir, "search", `${shard}.json`);
    writeJson(filePath, rows);
    const bytes = fs.statSync(filePath).size;
    if (bytes > largestSearchFile.bytes) largestSearchFile = { file: `search/${shard}.json`, bytes, rows: rows.length };
    searchFileCount += 1;
  });

  idShards.forEach((items, shard) => {
    writeJson(path.join(outDir, "ids", `${shard}.json`), items);
    idFileCount += 1;
  });

  return { searchFileCount, idFileCount, largestSearchFile };
}

function affectedRowsFromFile(filePath) {
  if (!filePath) return [];
  if (!fs.existsSync(filePath)) throw new Error(`Fichier d'impacts introuvable : ${filePath}`);
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  if (Array.isArray(payload)) return payload;
  return [
    ...(Array.isArray(payload.rows) ? payload.rows : []),
    ...(Array.isArray(payload.before) ? payload.before : []),
    ...(Array.isArray(payload.after) ? payload.after : []),
    ...(payload.before && typeof payload.before === "object" ? [payload.before] : []),
    ...(payload.after && typeof payload.after === "object" ? [payload.after] : [])
  ];
}

function topKeyForRow(row = {}) {
  const course = cleanText(row.course);
  const sex = cleanText(row.sex);
  const category = cleanText(row.category);
  return course && sex && category ? `${course}|${sex}|${category}` : "";
}

function affectedScope(args) {
  const rows = affectedRowsFromFile(args.affectedFile).map(publicRow);
  const publicKeys = new Set(args.affectedPublicKeys.map(cleanText).filter(Boolean));
  const swimmerKeys = new Set(args.affectedSwimmerKeys.map(cleanText).filter(Boolean));
  const topKeys = new Set(args.affectedTopKeys.map(cleanText).filter(Boolean));

  rows.forEach((row) => {
    const publicKey = performancePublicKey(row);
    const swimmerKey = publicSwimmerKey(row);
    const topKey = topKeyForRow(row);
    if (publicKey) publicKeys.add(publicKey);
    if (swimmerKey) swimmerKeys.add(swimmerKey);
    if (topKey) topKeys.add(topKey);
  });

  const enabled = Boolean(publicKeys.size || swimmerKeys.size || topKeys.size);
  return { enabled, publicKeys, swimmerKeys, topKeys };
}

function main() {
  const args = readArgs(process.argv.slice(2));
  const seedPath = path.resolve(args.seed);
  const outDir = ensureInsideRoot(args.outDir);
  if (!fs.existsSync(seedPath)) throw new Error(`Seed introuvable : ${seedPath}`);
  const scope = affectedScope(args);

  activeOutDir = outDir;
  expectedFiles = new Set();
  writeStats.changed = 0;
  writeStats.unchanged = 0;
  writeStats.deleted = 0;
  fs.mkdirSync(outDir, { recursive: true });

  const swimmers = new Map();
  const topBuckets = new Map();
  const seasons = new Set();
  const regions = new Map();
  const courses = new Set();
  const categories = new Set();
  let rowCount = 0;

  const lines = fs.readFileSync(seedPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = publicRow(JSON.parse(line));
    if (!row.timeValue || !row.course || (row.sex !== "F" && row.sex !== "M") || !row.category) continue;
    rowCount += 1;
    if (args.limit && rowCount > args.limit) break;
    if (scope.publicKeys.has(performancePublicKey(row))) {
      const swimmerKey = publicSwimmerKey(row);
      const topKey = topKeyForRow(row);
      if (swimmerKey) scope.swimmerKeys.add(swimmerKey);
      if (topKey) scope.topKeys.add(topKey);
    }

    courses.add(row.course);
    categories.add(`${row.sex}|${row.category}`);
    if (row.seasonYear) seasons.add(row.seasonYear);
    if (row.regionId) regions.set(String(row.regionId), row.regionLabel || row.regionId);

    const swimmerKey = publicSwimmerKey(row);
    if (swimmerKey) {
      if (!swimmers.has(swimmerKey)) {
        swimmers.set(swimmerKey, {
          indexKey: swimmerKey,
          rows: [],
          sourceIds: new Set(),
          aliases: new Set()
        });
      }
      const current = swimmers.get(swimmerKey);
      current.rows.push(row);
      [row.swimmerId, row.originalSwimmerId].map(cleanText).filter(Boolean).forEach((id) => current.sourceIds.add(id));
      if (row.originalSwimmerId && row.originalSwimmerId !== row.swimmerId) current.aliases.add(row.originalSwimmerId);
    }

    const topKey = `${row.course}|${row.sex}|${row.category}`;
    if (!scope.enabled || scope.topKeys.has(topKey)) {
      if (!topBuckets.has(topKey)) topBuckets.set(topKey, new Map());
      const candidateKey = [
        publicSwimmerKey(row),
        row.seasonYear || 0,
        row.regionId || ""
      ].join("|");
      const bucket = topBuckets.get(topKey);
      if (betterPerformance(row, bucket.get(candidateKey))) bucket.set(candidateKey, topRow(row));
    }
  }

  const swimmerIndex = [];
  const affectedSearchShards = new Set();
  const affectedIdShards = new Set();
  swimmers.forEach((entry) => {
    const rows = sortPerformanceRows(entry.rows.slice());
    const first = rows[0] || {};
    const latestWithClub = rows.find((row) => row.club || row.clubName) || first;
    const name = first.swimmer || [first.firstName, first.lastName].filter(Boolean).join(" ");
    const sourceIds = Array.from(entry.sourceIds);
    const aliases = Array.from(new Set([...entry.aliases, ...sourceIds.filter((id) => id !== first.swimmerId)]));
    const file = swimmerFilePath(entry.indexKey);
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
    const searchIndexText = normalizeSearchText([
      name,
      first.firstName,
      first.lastName,
      first.swimmerId,
      ...sourceIds
    ].filter(Boolean).join(" "));

    const shouldWriteSwimmerFile = !scope.enabled || scope.swimmerKeys.has(entry.indexKey);
    const swimmerPayload = {
      id: first.swimmerId || sourceIds[0] || stableHash(entry.indexKey).slice(0, 16),
      identityKey: first.swimmerIdentityKey || entry.indexKey,
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
      rows: rows.map(swimmerRow)
    };
    if (shouldWriteSwimmerFile) writeJson(path.join(outDir, file), swimmerPayload);

    const swimmerIndexRow = {
      id: first.swimmerId || sourceIds[0] || stableHash(entry.indexKey).slice(0, 16),
      aliases,
      sourceIds,
      identityKey: first.swimmerIdentityKey || entry.indexKey,
      name,
      lastName: first.lastName,
      firstName: first.firstName,
      birthDate: first.birthDate,
      sex: first.sex,
      clubId: latestWithClub.clubId || "",
      club: latestWithClub.club || "",
      clubName: latestWithClub.clubName || "",
      performanceCount: rows.filter((row) => !row.isIntermediate).length,
      latestDate: rows[0]?.date || "",
      searchText,
      searchPrefixes: searchPrefixes(searchIndexText),
      perfFile: file
    };
    swimmerIndex.push(swimmerIndexRow);
    if (shouldWriteSwimmerFile) {
      swimmerIndexRow.searchPrefixes.map(searchShard).filter(Boolean).forEach((shard) => affectedSearchShards.add(shard));
      [swimmerIndexRow.id, ...(swimmerIndexRow.sourceIds || []), ...(swimmerIndexRow.aliases || [])]
        .map(idShard)
        .filter(Boolean)
        .forEach((shard) => affectedIdShards.add(shard));
    }
  });

  swimmerIndex.sort((a, b) =>
    cleanText(a.lastName).localeCompare(cleanText(b.lastName), "fr-FR") ||
    cleanText(a.firstName).localeCompare(cleanText(b.firstName), "fr-FR") ||
    cleanText(a.name).localeCompare(cleanText(b.name), "fr-FR")
  );
  const searchIndexStats = scope.enabled
    ? writeSearchIndexes(outDir, swimmerIndex.filter((swimmer) => {
      const hasSearchShard = swimmer.searchPrefixes.map(searchShard).some((shard) => affectedSearchShards.has(shard));
      const hasIdShard = [swimmer.id, ...(swimmer.sourceIds || []), ...(swimmer.aliases || [])]
        .map(idShard)
        .some((shard) => affectedIdShards.has(shard));
      return hasSearchShard || hasIdShard;
    }), { searchShards: affectedSearchShards, idShards: affectedIdShards })
    : writeSearchIndexes(outDir, swimmerIndex);

  let topFileCount = 0;
  let topCandidateCount = 0;
  topBuckets.forEach((bucket, key) => {
    const [course, sex, category] = key.split("|");
    const rows = Array.from(bucket.values())
      .sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || cleanText(a.date).localeCompare(cleanText(b.date)));
    topCandidateCount += rows.length;
    topFileCount += 1;
    writeJson(path.join(outDir, "tops", course, topFileName(sex, category)), rows);
  });

  const generatedAt = new Date().toISOString();
  const previousManifestPath = path.join(outDir, "manifest.json");
  const previousManifest = scope.enabled && fs.existsSync(previousManifestPath)
    ? JSON.parse(fs.readFileSync(previousManifestPath, "utf8"))
    : null;
  const manifest = previousManifest ? {
    ...previousManifest,
    generatedAt,
    lastIncremental: {
      generatedAt,
      swimmers: scope.swimmerKeys.size,
      topBuckets: scope.topKeys.size,
      publicKeys: scope.publicKeys.size
    }
  } : {
    generatedAt,
    source: "performance-base-seed.ndjson",
    rowCount,
    swimmers: swimmerIndex.length,
    swimmerFiles: swimmerIndex.length,
    searchFiles: searchIndexStats.searchFileCount,
    idFiles: searchIndexStats.idFileCount,
    largestSearchFile: searchIndexStats.largestSearchFile,
    topFiles: topFileCount,
    topCandidates: topCandidateCount,
    seasons: Array.from(seasons).sort((a, b) => b - a),
    regions: Array.from(regions.entries()).map(([id, label]) => ({ id, label })).sort((a, b) => String(a.label).localeCompare(String(b.label), "fr-FR")),
    courses: Array.from(courses).sort(),
    categories: Array.from(categories).sort()
  };
  writeJson(path.join(outDir, "manifest.json"), manifest);
  writeText(path.join(outDir, "version.js"), `window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(generatedAt)};\n`);
  if (!scope.enabled) deleteStaleFiles(outDir);

  const files = [];
  const walk = (dir) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    });
  };
  walk(outDir);
  const totalBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  console.log(JSON.stringify({
    ok: true,
    outDir,
    ...manifest,
    files: files.length,
    totalBytes,
    incremental: scope.enabled,
    affectedSwimmers: scope.swimmerKeys.size,
    affectedTopBuckets: scope.topKeys.size,
    affectedPublicKeys: scope.publicKeys.size,
    changedFiles: writeStats.changed,
    unchangedFiles: writeStats.unchanged,
    deletedFiles: writeStats.deleted
  }, null, 2));
}

main();
