// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createDtnService(backendContext) {
  function dtnSeasonService() {
    const native = backendContext.ENVIRONMENT.sportingDataSource === "nap";
    const factory = native ? require("./nap-dtn-season-service").createNativeDtnSeasonService : backendContext.createDtnSeasonService;
    return factory({
      db: /* backend-shorthand */ backendContext.db, fieldPath: backendContext.FieldPath,
      getPool: () => require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),
      audit: (action, request, target) => backendContext.writeAuditLogOnce(action, request.auth.uid, target, `nap-dtn-${target.seasonId}-${target.revision}-${action}`),
      fail: (message, code = "failed-precondition") => { throw new backendContext.HttpsError(code, message); },
      authorize: async (request) => {
        if (!request.auth?.uid) throw new backendContext.HttpsError("unauthenticated", "Connexion requise.");
        await backendContext.assertLivePalmesAccess(request);
        backendContext.assertCapability(request, "dtn.view");
      },
      canManage: (request) => backendContext.ADMIN_UIDS.has(request.auth?.uid) || request.auth?.token?.livepalmesCapabilities?.["admin.full"] === true || request.auth?.token?.livepalmesCapabilities?.["dtn.manage"] === true,
      normalizeRow: backendContext.publicPerformanceBaseRow
    });
  }

  async function invokeDtnSeason(method, request) {
    if (backendContext.ENVIRONMENT.sportingDataSource !== "nap") return dtnSeasonService()[method](request);
    try { return await dtnSeasonService()[method](request); }
    catch (error) {
      if (error instanceof backendContext.HttpsError) throw error;
      if (error instanceof TypeError || error instanceof RangeError) throw new backendContext.HttpsError("failed-precondition", error.message);
      throw new backendContext.HttpsError("unavailable", "La DTN est temporairement indisponible. Reessayez dans quelques instants.");
    }
  }

  function dtnQualificationRow(row = {}) {
    return backendContext.cleanFirestoreValue({
      swimmerId: backendContext.cleanText(row.swimmerId),
      swimmerIdentityKey: backendContext.cleanText(row.swimmerIdentityKey),
      swimmer: backendContext.cleanText(row.swimmer),
      firstName: backendContext.cleanText(row.firstName),
      lastName: backendContext.cleanText(row.lastName),
      birthDate: backendContext.cleanText(row.birthDate),
      sex: backendContext.cleanText(row.sex),
      club: backendContext.cleanText(row.club || row.clubName),
      competition: backendContext.cleanText(row.competition),
      location: backendContext.cleanText(row.location),
      date: backendContext.cleanText(row.date),
      seasonYear: Number(row.seasonYear || 0) || 0,
      course: backendContext.cleanText(row.course),
      time: backendContext.cleanText(row.time),
      timeValue: Number(row.timeValue || 0) || 0
    });
  }

  function bestDtnQualificationRows(rows = [], standard = {}, threshold = 0) {
    const bestBySwimmer = new Map();
    rows.forEach((row) => {
      if (!Number(row.timeValue) || Number(row.timeValue) > threshold) return;
      if (standard.birthMin && backendContext.birthYear(row.birthDate) < standard.birthMin) return;
      const key = backendContext.publicSwimmerKey(row);
      if (!key) return;
      const current = bestBySwimmer.get(key);
      if (backendContext.publicBetterPerformance(row, current)) bestBySwimmer.set(key, row);
    });
    return Array.from(bestBySwimmer.values())
      .sort((a, b) => Number(a.timeValue || 0) - Number(b.timeValue || 0) || backendContext.cleanText(a.swimmer).localeCompare(backendContext.cleanText(b.swimmer), "fr-FR"))
      .map(dtnQualificationRow);
  }

  function nearDtnQualificationRows(rows = [], standard = {}, threshold = 0) {
    if (!threshold || !["TSP", "TRP"].includes(standard.id)) return [];
    // Select the best admissible swim BEFORE excluding achieved minima.
    return bestDtnQualificationRows(rows, standard, threshold * (1 + backendContext.DTN_NEAR_MINIMUM_MAX_PERCENT / 100))
      .filter((row) => row.timeValue > threshold &&
        (row.timeValue - threshold) * 100 < threshold * backendContext.DTN_NEAR_MINIMUM_MAX_PERCENT);
  }

  function dtnQualificationCacheStateRef(seasonYear) {
    return backendContext.db.collection(backendContext.DTN_QUALIFICATION_CACHE_STATE_COLLECTION).doc(String(seasonYear));
  }

  function dtnQualificationCacheRef(seasonYear, sex) {
    return backendContext.db.collection(backendContext.DTN_QUALIFICATION_CACHE_COLLECTION).doc(`${seasonYear}-${sex}`);
  }

  function dtnListingCacheRef(seasonYear) {
    return backendContext.db.collection(backendContext.DTN_QUALIFICATION_CACHE_COLLECTION).doc(`${seasonYear}-listing`);
  }

  function dtnQualificationSeasonsForRows(rows = []) {
    const seasons = new Set();
    rows.forEach((inputRow) => {
      const row = inputRow && typeof inputRow === "object" ? inputRow : {};
      const seasonYear = Number(row.seasonYear || 0) || backendContext.importSeasonYear(backendContext.cleanText(row.date));
      if (Number.isInteger(seasonYear) && seasonYear >= 2001 && seasonYear <= 2100) seasons.add(seasonYear);
    });
    return Array.from(seasons);
  }

  async function touchDtnQualificationCacheState(rows = [], context = {}) {
    const seasons = dtnQualificationSeasonsForRows(rows);
    if (!seasons.length) return { touchedSeasons: [] };
    const now = backendContext.cleanText(context.now) || new Date().toISOString();
    const batch = backendContext.db.batch();
    seasons.forEach((seasonYear) => {
      batch.set(dtnQualificationCacheStateRef(seasonYear), {
        version: backendContext.FieldValue.increment(1),
        updatedAt: now,
        reason: backendContext.cleanText(context.action || "performanceBase.updated")
      }, { merge: true });
    });
    await batch.commit();
    return { touchedSeasons: seasons };
  }

  function dtnQualificationCacheFingerprint({ seasonYear, sex, standards, competitionIds, sourceVersion }) {
    return backendContext.stableHash(JSON.stringify({
      cacheVersion: backendContext.DTN_QUALIFICATION_CACHE_VERSION,
      seasonYear,
      sex,
      standards,
      competitionIds,
      sourceVersion
    }));
  }

  function dtnQualificationRowsForStandard(rows = [], standardId = "", competitionIds = []) {
    const id = backendContext.cleanText(standardId).toUpperCase();
    if (id === "TU16C1" || id === "TU16C2") return rows;
    const allowedCompetitionIds = id === "TJP" || id === "TEP"
      ? competitionIds.filter((competitionId) => competitionId !== backendContext.DTN_EDF_LIMOGES_COMPETITION_ID)
      : competitionIds;
    const allowed = new Set(allowedCompetitionIds);
    return rows.filter((row) => allowed.has(backendContext.cleanText(row.competitionId)));
  }

  function dtnListingCacheFingerprint({ seasonYear, rules, sourceVersion, listingVersion }) {
    return backendContext.stableHash(JSON.stringify({
      cacheVersion: backendContext.DTN_LISTING_CACHE_VERSION,
      seasonYear,
      rules,
      sourceVersion,
      listingVersion
    }));
  }

  function emptyDtnQualificationPayload({ seasonYear, sex, standards, competitionIds }) {
    return {
      ok: true,
      seasonYear,
      sex,
      standards: standards.map((standard) => ({
        id: standard.id,
        courses: backendContext.POOL_COURSES.map((course) => ({
          course,
          threshold: Number(standard.thresholds[course] || 0),
          qualifiers: [],
          count: 0
        }))
      })),
      competitionIds,
      readStats: { scannedRows: 0, bounded: true }
    };
  }

  async function buildDtnQualificationPayload({ seasonYear, sex, standards, competitionIds }) {
    const indexedCourses = await Promise.all(backendContext.POOL_COURSES.map(async (course) => {
      const categoryRows = await Promise.all(backendContext.ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES.map((category) =>
        backendContext.readPublicPerformanceJson(`tops/${course}/${backendContext.publicPerformanceTopFileName(sex, category)}`, [])
      ));
      const rows = backendContext.uniquePublicPerformanceRows(categoryRows.flat()
        .map(backendContext.publicPerformanceBaseRow)
        .filter((row) =>
          Number(row.seasonYear || 0) === seasonYear &&
          row.course === course &&
          row.sex === sex &&
          row.active !== false &&
          row.status !== "hidden" &&
          row.status !== "deleted"
        ));
      if (rows.length > backendContext.DTN_QUALIFICATION_MAX_ROWS_PER_COURSE) {
        throw new Error(`Qualification DTN bornee pour ${course} (${rows.length} lignes).`);
      }
      return {
        course,
        rows
      };
    }));
    const scannedRows = indexedCourses.reduce((total, item) => total + item.rows.length, 0);
    return {
      ok: true,
      seasonYear,
      sex,
      standards: standards.map((standard) => ({
        id: standard.id,
        courses: indexedCourses.map(({ course, rows }) => {
          const threshold = Number(standard.thresholds[course] || 0);
          const eligibleRows = dtnQualificationRowsForStandard(rows, standard.id, competitionIds);
          const qualifiers = threshold ? bestDtnQualificationRows(eligibleRows, standard, threshold) : [];
          const nearMinimum = nearDtnQualificationRows(eligibleRows, standard, threshold);
          return { course, threshold, qualifiers, count: qualifiers.length,
            ...(["TSP", "TRP"].includes(standard.id) ? { nearMinimum, nearMinimumMaxPercent: backendContext.DTN_NEAR_MINIMUM_MAX_PERCENT } : {}) };
        })
      })),
      competitionIds,
      readStats: { scannedRows, firestoreDocuments: 0, source: "public-storage-top-files", bounded: true }
    };
  }

  function emptyDtnListingPayload({ seasonYear, rules }) {
    return {
      ok: true,
      seasonYear,
      standards: rules.map((rule) => ({
        id: rule.id,
        sourceId: rule.sourceId,
        minAge: rule.minAge,
        maxAge: rule.maxAge,
        athletes: [],
        count: 0
      })),
      eligibility: { pool: "50", timing: "electronic" },
      readStats: { scannedRows: 0, bounded: true }
    };
  }

  function isDtnElectronicFiftyMeterPerformance(row = {}) {
    const pool = backendContext.cleanText(row.pool).toUpperCase().replace(/\s+/g, "");
    const chrono = backendContext.cleanText(row.chrono)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase();
    return (pool === "50" || pool === "50M") && (chrono === "E" || chrono === "ELECTRONIC" || chrono === "ELECTRONIQUE");
  }

  function dtnListingAthletes(rows = [], rule = {}, seasonYear = 0) {
    const athletes = new Map();
    rows.forEach((row) => {
      if (!isDtnElectronicFiftyMeterPerformance(row)) return;
      const born = backendContext.birthYear(row.birthDate);
      const age = born ? seasonYear - born : -1;
      if (age < rule.minAge || age > rule.maxAge) return;
      const threshold = Number(rule.thresholds?.[row.sex]?.[row.course] || 0);
      if (!threshold || !Number(row.timeValue) || Number(row.timeValue) > threshold) return;
      const key = backendContext.publicSwimmerKey(row);
      if (!key) return;
      if (!athletes.has(key)) {
        athletes.set(key, {
          ...dtnQualificationRow(row),
          qualificationsByCourse: new Map()
        });
      }
      const athlete = athletes.get(key);
      const current = athlete.qualificationsByCourse.get(row.course)?.row;
      if (!current || backendContext.publicBetterPerformance(row, current)) {
        athlete.qualificationsByCourse.set(row.course, { row, threshold });
      }
    });
    return Array.from(athletes.values()).map((athlete) => {
      const qualifications = Array.from(athlete.qualificationsByCourse.entries())
        .sort((a, b) => backendContext.POOL_COURSES.indexOf(a[0]) - backendContext.POOL_COURSES.indexOf(b[0]))
        .map(([course, qualification]) => ({
          course,
          time: backendContext.cleanText(qualification.row.time),
          timeValue: Number(qualification.row.timeValue || 0),
          threshold: qualification.threshold,
          competition: backendContext.cleanText(qualification.row.competition),
          location: backendContext.cleanText(qualification.row.location),
          date: backendContext.cleanText(qualification.row.date)
        }));
      const { qualificationsByCourse, ...row } = athlete;
      return backendContext.cleanFirestoreValue({ ...row, qualifications });
    }).sort((a, b) => backendContext.cleanText(a.lastName).localeCompare(backendContext.cleanText(b.lastName), "fr-FR") || backendContext.cleanText(a.firstName).localeCompare(backendContext.cleanText(b.firstName), "fr-FR"));
  }

  async function buildDtnListingPayload({ seasonYear, rules }) {
    const sourceRows = await backendContext.readPublicPerformanceJson(`dtn-listing/${seasonYear}.json`, []);
    const rows = backendContext.uniquePublicPerformanceRows(sourceRows
      .map(backendContext.publicPerformanceBaseRow)
      .filter((row) =>
        Number(row.seasonYear || 0) === seasonYear &&
        backendContext.POOL_COURSES.includes(row.course) &&
        (row.sex === "F" || row.sex === "M") &&
        isDtnElectronicFiftyMeterPerformance(row) &&
        row.active !== false &&
        row.status !== "hidden" &&
        row.status !== "deleted"
      ));
    if (rows.length > backendContext.DTN_QUALIFICATION_MAX_ROWS_PER_COURSE * backendContext.POOL_COURSES.length) {
      throw new Error(`Mise en liste DTN bornee pour ${seasonYear} (${rows.length} lignes).`);
    }
    const athletesByRule = new Map(rules.map((rule) => [rule.id, dtnListingAthletes(rows, rule, seasonYear)]));
    const releveAthleteKeys = new Set((athletesByRule.get("RELEVE") || []).map(backendContext.publicSwimmerKey).filter(Boolean));
    return {
      ok: true,
      seasonYear,
      standards: rules.map((rule) => {
        const athletes = rule.id === "RELEVE"
          ? athletesByRule.get(rule.id) || []
          : (athletesByRule.get(rule.id) || []).filter((athlete) => !releveAthleteKeys.has(backendContext.publicSwimmerKey(athlete)));
        return {
          id: rule.id,
          sourceId: rule.sourceId,
          minAge: rule.minAge,
          maxAge: rule.maxAge,
          athletes,
          count: athletes.length
        };
      }),
      eligibility: { pool: "50", timing: "electronic" },
      readStats: { scannedRows: rows.length, firestoreDocuments: 0, storageFiles: 1, source: "public-storage-dtn-season-file", bounded: true }
    };
  }

  async function enqueueDtnQualificationJob(job = {}) {
    const jobId = job.view === "listing"
      ? `${job.seasonYear}-listing-${backendContext.cleanText(job.fingerprint).slice(0, 24)}`
      : `${job.seasonYear}-${job.sex}-${backendContext.cleanText(job.fingerprint).slice(0, 24)}`;
    const ref = backendContext.db.collection(backendContext.DTN_QUALIFICATION_JOBS_COLLECTION).doc(jobId);
    try {
      await ref.create({
        ...backendContext.cleanFirestoreValue(job),
        status: "pending",
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      if (Number(error?.code) !== 6 && backendContext.cleanText(error?.code) !== "already-exists") throw error;
    }
    return jobId;
  }

  function normalizeDtnListingRules(inputRules = []) {
    const expectedSources = new Map([
      ["RELEVE", "TRP"],
      ["TEP", "TEP"],
      ["TEC1", "TU16C1"]
    ]);
    const rules = (Array.isArray(inputRules) ? inputRules : []).slice(0, 3).map((raw) => {
      const id = backendContext.cleanText(raw?.id).toUpperCase();
      const sourceId = backendContext.cleanText(raw?.sourceId).toUpperCase();
      const minAge = Number(raw?.minAge);
      const maxAge = Number(raw?.maxAge);
      if (expectedSources.get(id) !== sourceId || !Number.isInteger(minAge) || !Number.isInteger(maxAge) || minAge < 0 || maxAge > 120 || minAge > maxAge) {
        throw new backendContext.HttpsError("invalid-argument", "Regle de mise en liste DTN invalide.");
      }
      const thresholds = { F: {}, M: {} };
      ["F", "M"].forEach((sex) => {
        backendContext.POOL_COURSES.forEach((course) => {
          const threshold = Number(raw?.thresholds?.[sex]?.[course] || 0) || 0;
          if (threshold > 0 && threshold <= 10000000) thresholds[sex][course] = threshold;
        });
      });
      return { id, sourceId, minAge, maxAge, thresholds };
    });
    if (rules.length !== 3 || new Set(rules.map((rule) => rule.id)).size !== 3) {
      throw new backendContext.HttpsError("invalid-argument", "Referentiels de mise en liste DTN incomplets.");
    }
    const tep = rules.find((rule) => rule.id === "TEP");
    const tec1 = rules.find((rule) => rule.id === "TEC1");
    if (tep.minAge !== tec1.maxAge + 1) {
      throw new backendContext.HttpsError("invalid-argument", "Tranches Espoir DTN invalides.");
    }
    return rules;
  }

  function normalizePerformanceSearchText(value) {
    return backendContext.cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, " ")
      .toUpperCase()
      .trim();
  }

  function performanceSearchTokens(value) {
    return Array.from(new Set(normalizePerformanceSearchText(value).split(/\s+/).filter((token) => token.length >= 2)));
  }

  function performanceSearchPrefixes(value) {
    const prefixes = new Set();
    performanceSearchTokens(value).forEach((token) => {
      const max = Math.min(token.length, 18);
      for (let length = 2; length <= max; length += 1) {
        prefixes.add(token.slice(0, length));
      }
    });
    return Array.from(prefixes).slice(0, 300);
  }

  function performanceSwimmerIndexKey(row = {}) {
    const identity = backendContext.cleanText(row.swimmerIdentityKey);
    if (identity) return identity;
    const first = normalizePerformanceSearchText(row.firstName);
    const last = normalizePerformanceSearchText(row.lastName);
    const birth = backendContext.cleanText(row.birthDate);
    if (first && last && birth) return `${last}|${first}|${birth}`;
    return backendContext.cleanText(row.swimmerId || row.originalSwimmerId || row.swimmer);
  }

  function performanceSwimmerIndexDocId(row = {}) {
    return backendContext.stableHash(performanceSwimmerIndexKey(row)).slice(0, 40);
  }

  return {
    dtnSeasonService,
    invokeDtnSeason,
    dtnQualificationRow,
    bestDtnQualificationRows,
    nearDtnQualificationRows,
    dtnQualificationCacheStateRef,
    dtnQualificationCacheRef,
    dtnListingCacheRef,
    dtnQualificationSeasonsForRows,
    touchDtnQualificationCacheState,
    dtnQualificationCacheFingerprint,
    dtnQualificationRowsForStandard,
    dtnListingCacheFingerprint,
    emptyDtnQualificationPayload,
    buildDtnQualificationPayload,
    emptyDtnListingPayload,
    isDtnElectronicFiftyMeterPerformance,
    dtnListingAthletes,
    buildDtnListingPayload,
    enqueueDtnQualificationJob,
    normalizeDtnListingRules,
    normalizePerformanceSearchText,
    performanceSearchTokens,
    performanceSearchPrefixes,
    performanceSwimmerIndexKey,
    performanceSwimmerIndexDocId
  };
}

module.exports = { createDtnService };
