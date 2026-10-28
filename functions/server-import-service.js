// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createImportService(backendContext) {
  function normalizeImportToken(value) {
    return backendContext.cleanText(value).replace(/\s+/g, " ");
  }

  function parseTimeValue(value) {
    const raw = backendContext.cleanText(value).replace(",", ".");
    if (!raw || raw === "00.00" || raw === "00:00.00" || raw === "59:59.99") return null;
    const match = raw.match(/^(?:(\d+):)?(\d{1,2})\.(\d{1,2})$/);
    if (!match) return null;
    const minutes = Number(match[1] || 0);
    const seconds = Number(match[2]);
    const hundredths = Number(match[3].padEnd(2, "0").slice(0, 2));
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || !Number.isFinite(hundredths) || seconds >= 60) return null;
    return minutes * 6000 + seconds * 100 + hundredths;
  }

  function formatTimeValue(timeValue) {
    const total = Number(timeValue);
    if (!Number.isFinite(total) || total <= 0) return "";
    const minutes = Math.floor(total / 6000);
    const seconds = Math.floor((total % 6000) / 100);
    const hundredths = total % 100;
    return minutes
      ? `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`
      : `${seconds}.${String(hundredths).padStart(2, "0")}`;
  }





  function normalizeCourseCode(value) {
    return backendContext.cleanText(value).replace(/\s+/g, "").toUpperCase();
  }

  function normalizeCategoryCode(value) {
    return backendContext.cleanText(value).replace(/\s+/g, "").toUpperCase();
  }







  function competitionYear(date) {
    const match = String(date || "").match(/^(\d{4})-/);
    return match ? Number(match[1]) : 0;
  }

  function birthYear(date) {
    const match = String(date || "").match(/^(\d{4})-/);
    const year = match ? Number(match[1]) : 0;
    return year >= 1900 && year <= 2100 ? year : 0;
  }

  function ageCategoryFromDates(competitionDate, birthDate) {
    const year = importSeasonYear(competitionDate) || competitionYear(competitionDate);
    const born = birthYear(birthDate);
    const age = year && born ? year - born : null;
    if (!Number.isFinite(age) || age < 0 || age > 120) return "";
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

  function performanceCategoryFromRow(row = {}, dateOverride = "") {
    const date = backendContext.cleanText(dateOverride || row.date || row.metadata?.date);
    return ageCategoryFromDates(date, row.birthDate) ||
      backendContext.cleanText(row.category) ||
      fallbackCategoryFromSource(row.categoryCode || row.categoryLabel || row.importedCategoryCode || row.classificationCategory);
  }

  function fallbackCategoryFromSource(sourceCategory) {
    const code = normalizeCategoryCode(sourceCategory);
    if (code.endsWith("PO")) return "P";
    if (code.endsWith("BE")) return "B";
    if (code.endsWith("MI")) return "M";
    if (code.endsWith("CA")) return "C";
    if (code.endsWith("JU")) return "J";
    if (code.endsWith("SE") || code.endsWith("S1")) return "S";
    if (/^[FH](30|35)\+$/.test(code) || /^[FH][MV][01]$/.test(code) || code === "M30+") return "M30+";
    if (/^[FH](40|45)\+$/.test(code) || /^[FH][MV]2$/.test(code)) return "M40+";
    if (/^[FH](50|55)\+$/.test(code) || /^[FH][MV]3$/.test(code)) return "M50+";
    if (/^[FH](60|65)\+$/.test(code) || /^[FH][MV]4$/.test(code)) return "M60+";
    if (/^[FH](70|75)\+$/.test(code) || /^[FH][MV][5-9]$/.test(code)) return "M70+";
    if (/^[FH]80\+$/.test(code)) return "M80+";
    return "";
  }

  function importPerformanceCategory(perf = {}) {
    return ageCategoryFromDates(perf.date, perf.birthDate) ||
      fallbackCategoryFromSource(perf.categoryCode || perf.importedCategoryCode || perf.classificationCategory);
  }

  async function loadPerformanceRecordsData() {
    const snapshot = await backendContext.db
      .collection("competitions")
      .doc("livepalmes-active")
      .collection("performanceData")
      .doc("records")
      .get();
    return snapshot.exists ? snapshot.data() || {} : {};
  }

  function recordReferenceRows(recordsData = {}) {
    return [
      ...(Array.isArray(recordsData.franceRecords) ? recordsData.franceRecords : []).map((row) => ({
        ...row,
        alertType: row.recordType === "RFJ" ? "RFJ" : "RF",
        alertLabel: row.recordType === "RFJ" ? "Record de France Jeunes" : "Record de France"
      })),
      ...(Array.isArray(recordsData.records) ? recordsData.records : []).map((row) => ({
        ...row,
        alertType: "MPF",
        alertLabel: "Meilleure Performance Francaise"
      }))
    ].filter((row) =>
      !String(row.course || "").startsWith("4X") &&
      normalizeCourseCode(row.course) &&
      (row.sex === "F" || row.sex === "M") &&
      Number(row.value || 0) > 0 &&
      backendContext.cleanText(row.time) &&
      backendContext.cleanText(row.time) !== "A etablir" &&
      backendContext.cleanText(row.time) !== "À établir"
    );
  }

  function recordReferenceKey(row = {}) {
    return [
      backendContext.cleanText(row.alertType || row.recordType || "MPF"),
      backendContext.cleanText(row.sex),
      backendContext.cleanText(row.alertType) === "MPF" ? backendContext.cleanText(row.category) : "",
      normalizeCourseCode(row.course)
    ].join("|");
  }

  function recordReferenceMap(recordsData = {}) {
    const byKey = new Map();
    recordReferenceRows(recordsData).forEach((row) => {
      const key = recordReferenceKey(row);
      const existing = byKey.get(key);
      if (!existing || Number(row.value || 0) < Number(existing.value || 0)) byKey.set(key, row);
    });
    return byKey;
  }

  function recordReferenceForPerformance(referenceMap, type, perf, category) {
    const sex = normalizeCategoryCode(perf.sex);
    const course = normalizeCourseCode(perf.course);
    const key = [type, sex, type === "MPF" ? category : "", course].join("|");
    return referenceMap.get(key) || null;
  }

  function engagementRelayReferenceCourseCode(course) {
    const code = normalizeCourseCode(course);
    return code === "4X100BI" ? "4X100BIX" : code;
  }

  function engagementRelayReferenceRows(recordsData = {}) {
    return [
      ...(Array.isArray(recordsData.franceRecords) ? recordsData.franceRecords : []).map((row) => ({
        ...row,
        alertType: row.recordType === "RFJ" ? "RFJ" : "RF",
        alertLabel: row.recordType === "RFJ" ? "Record de France Junior club" : "Record de France club"
      })),
      ...(Array.isArray(recordsData.records) ? recordsData.records : []).map((row) => ({
        ...row,
        alertType: "MPF",
        alertLabel: "Meilleure Performance Francaise club"
      }))
    ].filter((row) =>
      normalizeCourseCode(row.course).startsWith("4X") &&
      (backendContext.cleanText(row.relayType).toLowerCase() === "club" || backendContext.cleanText(row.style).toUpperCase() === "RELAY_CLUB") &&
      (row.sex === "F" || row.sex === "M") &&
      Number(row.value || 0) > 0 &&
      backendContext.cleanText(row.time) &&
      backendContext.cleanText(row.time) !== "A etablir" &&
      backendContext.cleanText(row.time) !== "À établir"
    );
  }

  function engagementRelayReferenceKey(row = {}) {
    return [
      backendContext.cleanText(row.alertType || row.recordType || "MPF"),
      backendContext.cleanText(row.mixedRelay) === "true" || row.mixedRelay === true ? "MIXED" : backendContext.cleanText(row.sex),
      backendContext.cleanText(row.alertType) === "MPF" ? backendContext.cleanText(row.category) : "",
      normalizeCourseCode(row.course)
    ].join("|");
  }

  function engagementRelayReferenceMap(recordsData = {}) {
    const byKey = new Map();
    engagementRelayReferenceRows(recordsData).forEach((row) => {
      const key = engagementRelayReferenceKey(row);
      const existing = byKey.get(key);
      if (!existing || Number(row.value || 0) < Number(existing.value || 0)) byKey.set(key, row);
    });
    return byKey;
  }

  function engagementRelayReferenceForEntry(referenceMap, type, relay = {}) {
    const sex = relay.genderMode === "mixed" ? "MIXED" : relay.genderMode === "male" ? "M" : "F";
    const course = engagementRelayReferenceCourseCode(relay.eventCode);
    const key = [type, sex, type === "MPF" ? relay.category : "", course].join("|");
    return referenceMap.get(key) || null;
  }

  function isYouthCategory(category) {
    return ["P", "B", "M", "C", "J"].includes(backendContext.cleanText(category));
  }

  function normalizedRecordAlertName(value) {
    const normalized = backendContext.normalizeIdentityText(value);
    if (!normalized) return "";
    return normalized.split(/\s+/).filter(Boolean).sort().join(" ");
  }

  function sameRecordAlertSwimmer(left, right) {
    const leftRaw = backendContext.normalizeIdentityText(left);
    const rightRaw = backendContext.normalizeIdentityText(right);
    if (!leftRaw || !rightRaw) return false;
    return leftRaw === rightRaw || normalizedRecordAlertName(leftRaw) === normalizedRecordAlertName(rightRaw);
  }

  function isAlreadyPublishedRecordAlert(alert = {}) {
    return backendContext.cleanText(alert.status) === "equal" &&
      Number(alert.timeValue || 0) === Number(alert.referenceValue || 0) &&
      sameRecordAlertSwimmer(alert.swimmer, alert.referenceSwimmer);
  }

  function buildRecordAlert(perf, category, reference) {
    const timeValue = Number(perf.timeValue || 0);
    const referenceValue = Number(reference.value || 0);
    if (!timeValue || !referenceValue || timeValue > referenceValue) return null;
    const status = timeValue < referenceValue ? "improved" : "equal";
    const sourceLine = Number(perf.sourceLine || perf.originSourceLine || 0) || "";
    const swimmer = [perf.firstName, perf.lastName].filter(Boolean).join(" ").trim();
    const referenceSwimmer = backendContext.cleanText(reference.swimmer);
    if (status === "equal" && sameRecordAlertSwimmer(swimmer, referenceSwimmer)) return null;
    return {
      type: reference.alertType,
      label: reference.alertLabel,
      status,
      swimmer,
      firstName: backendContext.cleanText(perf.firstName),
      lastName: backendContext.cleanText(perf.lastName),
      birthDate: backendContext.cleanText(perf.birthDate),
      sex: normalizeCategoryCode(perf.sex),
      category,
      categoryCode: categoryCodeFromCategory(category, normalizeCategoryCode(perf.sex)),
      course: normalizeCourseCode(perf.course),
      time: backendContext.cleanText(perf.time) || formatTimeValue(timeValue),
      timeValue,
      referenceTime: backendContext.cleanText(reference.time) || formatTimeValue(referenceValue),
      referenceValue,
      referenceSwimmer,
      referenceDate: backendContext.cleanText(reference.date),
      referenceLocation: backendContext.cleanText(reference.location),
      referenceKey: backendContext.cleanText(reference.key),
      date: backendContext.cleanText(perf.date),
      location: backendContext.cleanText(perf.location),
      club: backendContext.cleanText(perf.club),
      clubName: backendContext.cleanText(perf.clubName),
      isIntermediate: perf.isIntermediate === true,
      originCourse: normalizeCourseCode(perf.originCourse),
      originTime: backendContext.cleanText(perf.originTime),
      splitCode: backendContext.cleanText(perf.splitCode),
      splitDistance: Number(perf.splitDistance || 0) || "",
      sourceLine
    };
  }

  function detectRecordAlerts(performances = [], recordsData = {}) {
    const referenceMap = recordReferenceMap(recordsData);
    const alerts = [];
    const seen = new Set();
    performances.forEach((perf) => {
      const timeValue = Number(perf.timeValue || 0);
      const sex = normalizeCategoryCode(perf.sex);
      const course = normalizeCourseCode(perf.course);
      if (!timeValue || (sex !== "F" && sex !== "M") || !backendContext.POOL_COURSES.includes(course)) return;
      const category = importPerformanceCategory(perf);
      if (!category) return;
      const candidates = [
        recordReferenceForPerformance(referenceMap, "MPF", perf, category),
        recordReferenceForPerformance(referenceMap, "RF", perf, category),
        isYouthCategory(category) ? recordReferenceForPerformance(referenceMap, "RFJ", perf, category) : null
      ].filter(Boolean);
      candidates.forEach((reference) => {
        const alert = buildRecordAlert(perf, category, reference);
        if (!alert) return;
        const key = [
          alert.type,
          alert.course,
          alert.sex,
          alert.category,
          alert.timeValue,
          alert.swimmer,
          alert.date,
          alert.sourceLine,
          alert.isIntermediate ? alert.originCourse : ""
        ].join("|");
        if (seen.has(key)) return;
        seen.add(key);
        alerts.push(alert);
      });
    });
    return alerts.sort((a, b) =>
      ["RF", "RFJ", "MPF"].indexOf(a.type) - ["RF", "RFJ", "MPF"].indexOf(b.type) ||
      a.course.localeCompare(b.course, "fr-FR", { numeric: true }) ||
      a.timeValue - b.timeValue
    );
  }



  function resolveIntranapSwimmer(perf, sex) {
    const expectedSex = normalizeCategoryCode(sex || perf.sex);
    const isCompatible = (swimmer) => {
      if (!swimmer) return false;
      const swimmerSex = normalizeCategoryCode(swimmer.sex);
      return !expectedSex || swimmerSex === expectedSex;
    };
    const rawId = backendContext.cleanText(perf.swimmerId);
    const allowSourceIdMatch = backendContext.cleanText(perf.sourceFormat) !== "international-xlsx";
    const byIdMatch = allowSourceIdMatch && rawId ? backendContext.intranapSwimmerLookup.byId.get(rawId) : null;
    if (isCompatible(byIdMatch)) return { swimmer: byIdMatch, method: "id" };

    const key = backendContext.swimmerIdentityKey(perf.firstName, perf.lastName, perf.birthDate);
    if (!key) return { swimmer: null, method: "none" };
    const identityMatch = backendContext.intranapSwimmerLookup.byIdentity.get(key) || null;
    return isCompatible(identityMatch)
      ? { swimmer: identityMatch, method: "identity" }
      : { swimmer: null, method: "none" };
  }

  function competitionImportPreviewPerformance(perf = {}) {
    const swimmerMatch = resolveIntranapSwimmer(perf, perf.sex);
    const swimmer = swimmerMatch.swimmer;
    return backendContext.cleanFirestoreValue({
      sourceLine: Number(perf.sourceLine || perf.originSourceLine || 0) || null,
      firstName: backendContext.cleanText(perf.firstName),
      lastName: backendContext.cleanText(perf.lastName),
      birthDate: backendContext.cleanText(perf.birthDate),
      sex: normalizeCategoryCode(perf.sex),
      swimmerId: backendContext.cleanText(perf.swimmerId),
      course: backendContext.cleanText(perf.course),
      time: backendContext.cleanText(perf.time),
      intermediateTimes: Array.isArray(perf.intermediateTimes)
        ? perf.intermediateTimes.map((split) => ({ code: backendContext.cleanText(split.code), time: backendContext.cleanText(split.time) }))
        : [],
      categoryCode: backendContext.cleanText(perf.categoryCode),
      club: backendContext.cleanText(perf.club),
      clubName: backendContext.cleanText(perf.clubName),
      date: backendContext.cleanText(perf.date),
      round: backendContext.cleanText(perf.round),
      isIntermediate: perf.isIntermediate === true,
      originCourse: backendContext.cleanText(perf.originCourse),
      duplicateInFile: perf.duplicateInFile === true,
      swimmerMatch: swimmer ? {
        status: "matched",
        method: swimmerMatch.method,
        swimmerId: backendContext.cleanText(swimmer.id),
        name: backendContext.cleanText(swimmer.name) || [backendContext.cleanText(swimmer.firstName), backendContext.cleanText(swimmer.lastName)].filter(Boolean).join(" "),
        birthDate: backendContext.cleanText(swimmer.birthDate),
        sex: normalizeCategoryCode(swimmer.sex)
      } : {
        status: "unmatched",
        method: "none"
      }
    });
  }

  function categoryCodeFromCategory(category, sex) {
    const prefix = sex === "F" ? "F" : "H";
    const suffixes = {
      P: "PO",
      B: "BE",
      M: "MI",
      C: "CA",
      J: "JU",
      S: "SE",
      "M30+": "30+",
      "M40+": "40+",
      "M50+": "50+",
      "M60+": "60+",
      "M70+": "70+",
      "M80+": "80+"
    };
    return `${prefix}${suffixes[category] || category}`;
  }

  function coursePayload(course) {
    const meta = backendContext.COURSE_META[course] || [course, course, backendContext.courseStyleFromCode(course), backendContext.courseLengthFromCode(course)];
    return {
      code: course,
      label: meta[0],
      shortLabel: meta[1],
      style: meta[2],
      length: meta[3]
    };
  }

  function importSeasonYear(dateIso) {
    const date = new Date(`${dateIso}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    return date.getUTCMonth() >= 8 ? date.getUTCFullYear() + 1 : date.getUTCFullYear();
  }

  function currentEngagementSeasonInfo(date = new Date()) {
    const year = date.getUTCFullYear();
    const startYear = date.getUTCMonth() >= 8 ? year : year - 1;
    return {
      startYear,
      endYear: startYear + 1,
      label: `${startYear}-${startYear + 1}`
    };
  }

  function cleanEngagementLicenseVerificationStatus(value, fallback = "pending") {
    const status = backendContext.cleanText(value).toLowerCase();
    return backendContext.ENGAGEMENT_LICENSE_VERIFICATION_STATUSES.has(status) ? status : fallback;
  }

  function cleanEngagementLicenseSeasonStatus(value, fallback = "to_check") {
    const status = backendContext.cleanText(value).toLowerCase();
    return backendContext.ENGAGEMENT_LICENSE_SEASON_STATUSES.has(status) ? status : fallback;
  }

  function engagementLicenseSeasonState(data = {}, date = new Date()) {
    const season = currentEngagementSeasonInfo(date);
    const seasons = data.licenseSeasons && typeof data.licenseSeasons === "object" ? data.licenseSeasons : {};
    const stored = seasons[season.label] && typeof seasons[season.label] === "object" ? seasons[season.label] : {};
    const legacyStatus = backendContext.cleanText(data.licenseSeasonLabel) === season.label ? data.licenseSeasonStatus : "";
    return {
      startYear: season.startYear,
      endYear: season.endYear,
      label: season.label,
      status: cleanEngagementLicenseSeasonStatus(stored.status || legacyStatus, "to_check")
    };
  }

  function engagementSeasonEndYearFromIsoDate(dateIso = "") {
    const cleanDate = backendContext.cleanIsoDate(dateIso);
    if (!cleanDate) return currentEngagementSeasonInfo(new Date()).endYear;
    return importSeasonYear(cleanDate) || currentEngagementSeasonInfo(new Date()).endYear;
  }

  function engagementSeasonBoundsFromEndYear(endYear) {
    const year = Math.trunc(Number(endYear) || currentEngagementSeasonInfo(new Date()).endYear);
    return {
      startYear: year - 1,
      endYear: year,
      label: `${year - 1}-${year}`,
      startDate: `${year - 1}-09-01`,
      endDate: `${year}-08-31`
    };
  }

  function currentEngagementCategoryFromBirthDate(birthDate) {
    return ageCategoryFromDates(new Date().toISOString().slice(0, 10), birthDate);
  }

  function importDocumentId(metadata = {}, fileHash = "") {
    const seed = [
      metadata.date,
      metadata.competitionName,
      metadata.location,
      metadata.poolSize,
      fileHash
    ].join("|");
    return backendContext.stableHash(seed).slice(0, 32);
  }

  function activeCompetitionImportData(data = {}) {
    return !["deleted", "replaced"].includes(backendContext.cleanText(data.status));
  }

  function competitionImportExistingSummary(snapshot) {
    if (!snapshot?.exists) return null;
    const data = snapshot.data() || {};
    return backendContext.cleanFirestoreValue({
      importId: snapshot.id,
      status: data.status || "",
      fileName: data.fileName || "",
      fileHash: data.fileHash || "",
      metadata: data.metadata || {},
      summary: data.summary || {},
      importedAt: data.importedAt || "",
      importedByEmail: data.importedByEmail || "",
      publicationStatus: backendContext.importPublicationStatus(data) || "",
      replacementJobId: data.replacementJobId || ""
    });
  }

  async function findExistingCompetitionImport(metadata = {}, excludedImportId = "") {
    const identity = backendContext.competitionImportIdentity(metadata);
    const candidateSnapshots = [];
    const keyedSnapshot = await backendContext.db.collection("performanceImports")
      .where("competitionKey", "==", identity)
      .limit(5)
      .get();
    candidateSnapshots.push(...keyedSnapshot.docs);

    if (!candidateSnapshots.length && backendContext.cleanText(metadata.competitionCode)) {
      const codeSnapshot = await backendContext.db.collection("performanceImports")
        .where("metadata.competitionCode", "==", backendContext.cleanText(metadata.competitionCode))
        .limit(5)
        .get();
      candidateSnapshots.push(...codeSnapshot.docs);
    }

    if (!candidateSnapshots.length && !backendContext.cleanText(metadata.competitionCode) && backendContext.cleanText(metadata.date)) {
      const dateSnapshot = await backendContext.db.collection("performanceImports")
        .where("metadata.date", "==", backendContext.cleanText(metadata.date))
        .limit(20)
        .get();
      candidateSnapshots.push(...dateSnapshot.docs);
    }

    return candidateSnapshots.find((snapshot) => {
      const data = snapshot.data() || {};
      return snapshot.id !== excludedImportId &&
        activeCompetitionImportData(data) &&
        backendContext.sameCompetitionImport(data.metadata || {}, metadata);
    }) || null;
  }

  function safeCompareHex(left, right) {
    const leftBuffer = Buffer.from(String(left || ""), "hex");
    const rightBuffer = Buffer.from(String(right || ""), "hex");
    return leftBuffer.length === rightBuffer.length && backendContext.crypto.timingSafeEqual(leftBuffer, rightBuffer);
  }

  function roleUid(competitionId, role, clientId) {
    const digest = backendContext.crypto
      .createHash("sha256")
      .update(`${competitionId}|${role}|${backendContext.cleanText(clientId) || Date.now()}`)
      .digest("hex")
      .slice(0, 28);
    return `lp-${role}-${digest}`;
  }

  function liveDataRef(competitionId) {
    return backendContext.db
      .collection("competitions")
      .doc(competitionId)
      .collection("liveData")
      .doc("current");
  }

  function rolePinsRef(competitionId) {
    return backendContext.db
      .collection("competitions")
      .doc(competitionId)
      .collection("secrets")
      .doc("rolePins");
  }

  function pinAttemptRef(competitionId, role, uid, clientId) {
    const key = backendContext.stableHash(`${competitionId}|${role}|${uid}|${backendContext.cleanText(clientId)}`);
    return backendContext.db
      .collection("competitions")
      .doc(competitionId)
      .collection("security")
      .doc("pinAttempts")
      .collection("items")
      .doc(key);
  }

  function consoleGrantRef(competitionId, uid) {
    return backendContext.db
      .collection("competitions")
      .doc(competitionId)
      .collection("consoleGrants")
      .doc(uid);
  }

  function lockRemainingSeconds(attempt = {}, nowMs = Date.now()) {
    const lockedUntilMs = Date.parse(attempt.lockedUntil || "");
    if (!Number.isFinite(lockedUntilMs) || lockedUntilMs <= nowMs) return 0;
    return Math.ceil((lockedUntilMs - nowMs) / 1000);
  }

  function lockMessage(seconds) {
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Trop d'essais incorrects. Reessaie dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
  }

  async function assertPinAttemptAllowed(ref) {
    const snapshot = await ref.get();
    const seconds = lockRemainingSeconds(snapshot.data() || {});
    if (seconds > 0) {
      throw new backendContext.HttpsError("resource-exhausted", lockMessage(seconds), { retryAfterSeconds: seconds });
    }
  }

  return {
    normalizeImportToken,
    parseTimeValue,
    formatTimeValue,
    normalizeCourseCode,
    normalizeCategoryCode,
    competitionYear,
    birthYear,
    ageCategoryFromDates,
    performanceCategoryFromRow,
    fallbackCategoryFromSource,
    importPerformanceCategory,
    loadPerformanceRecordsData,
    recordReferenceRows,
    recordReferenceKey,
    recordReferenceMap,
    recordReferenceForPerformance,
    engagementRelayReferenceCourseCode,
    engagementRelayReferenceRows,
    engagementRelayReferenceKey,
    engagementRelayReferenceMap,
    engagementRelayReferenceForEntry,
    isYouthCategory,
    normalizedRecordAlertName,
    sameRecordAlertSwimmer,
    isAlreadyPublishedRecordAlert,
    buildRecordAlert,
    detectRecordAlerts,
    resolveIntranapSwimmer,
    competitionImportPreviewPerformance,
    categoryCodeFromCategory,
    coursePayload,
    importSeasonYear,
    currentEngagementSeasonInfo,
    cleanEngagementLicenseVerificationStatus,
    cleanEngagementLicenseSeasonStatus,
    engagementLicenseSeasonState,
    engagementSeasonEndYearFromIsoDate,
    engagementSeasonBoundsFromEndYear,
    currentEngagementCategoryFromBirthDate,
    importDocumentId,
    activeCompetitionImportData,
    competitionImportExistingSummary,
    findExistingCompetitionImport,
    safeCompareHex,
    roleUid,
    liveDataRef,
    rolePinsRef,
    pinAttemptRef,
    consoleGrantRef,
    lockRemainingSeconds,
    lockMessage,
    assertPinAttemptAllowed
  };
}

module.exports = { createImportService };
