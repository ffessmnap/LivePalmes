// Compatibility factory; operation modules hold the existing bodies.
function createPerformanceService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-performance-service/competition-import-public-snapshot-summary").createPerformanceService_competitionImportPublicSnapshotSummary({
      get CATEGORY_LABELS() { return backendContext.CATEGORY_LABELS; },
      set CATEGORY_LABELS(value) { backendContext.CATEGORY_LABELS = value; },
      get POOL_COURSES() { return backendContext.POOL_COURSES; },
      set POOL_COURSES(value) { backendContext.POOL_COURSES = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get categoryCodeFromCategory() { return backendContext.categoryCodeFromCategory; },
      set categoryCodeFromCategory(value) { backendContext.categoryCodeFromCategory = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get cleanTimingType() { return backendContext.cleanTimingType; },
      set cleanTimingType(value) { backendContext.cleanTimingType = value; },
      get coursePayload() { return backendContext.coursePayload; },
      set coursePayload(value) { backendContext.coursePayload = value; },
      get fallbackCategoryFromSource() { return backendContext.fallbackCategoryFromSource; },
      set fallbackCategoryFromSource(value) { backendContext.fallbackCategoryFromSource = value; },
      get importSeasonYear() { return backendContext.importSeasonYear; },
      set importSeasonYear(value) { backendContext.importSeasonYear = value; },
      get normalizeCategoryCode() { return backendContext.normalizeCategoryCode; },
      set normalizeCategoryCode(value) { backendContext.normalizeCategoryCode = value; },
      get normalizeCourseCode() { return backendContext.normalizeCourseCode; },
      set normalizeCourseCode(value) { backendContext.normalizeCourseCode = value; },
      get performanceImportChrono() { return backendContext.performanceImportChrono; },
      set performanceImportChrono(value) { backendContext.performanceImportChrono = value; },
      get resolveIntranapSwimmer() { return backendContext.resolveIntranapSwimmer; },
      set resolveIntranapSwimmer(value) { backendContext.resolveIntranapSwimmer = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get swimmerIdentityKey() { return backendContext.swimmerIdentityKey; },
      set swimmerIdentityKey(value) { backendContext.swimmerIdentityKey = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-performance-service/publish-competition-import-outputs").createPerformanceService_publishCompetitionImportOutputs({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get importPublicationError() { return backendContext.importPublicationError; },
      set importPublicationError(value) { backendContext.importPublicationError = value; },
      get importPublicationResultStatus() { return backendContext.importPublicationResultStatus; },
      set importPublicationResultStatus(value) { backendContext.importPublicationResultStatus = value; },
      get invalidateEngagementEntryTimeCachesForPerformanceRows() { return backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows; },
      set invalidateEngagementEntryTimeCachesForPerformanceRows(value) { backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows = value; },
      get publishIncrementalPerformanceImport() { return backendContext.publishIncrementalPerformanceImport; },
      set publishIncrementalPerformanceImport(value) { backendContext.publishIncrementalPerformanceImport = value; },
      get publishIncrementalPublicPerformanceFiles() { return backendContext.publishIncrementalPublicPerformanceFiles; },
      set publishIncrementalPublicPerformanceFiles(value) { backendContext.publishIncrementalPublicPerformanceFiles = value; },
      get local$competitionImportPublicSnapshotSummary() { return operation0().competitionImportPublicSnapshotSummary; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-performance-service/competition-import-performance-id").createPerformanceService_competitionImportPerformanceId({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_PUBLICATION_JOBS_COLLECTION() { return backendContext.PERFORMANCE_PUBLICATION_JOBS_COLLECTION; },
      set PERFORMANCE_PUBLICATION_JOBS_COLLECTION(value) { backendContext.PERFORMANCE_PUBLICATION_JOBS_COLLECTION = value; },
      get activeCompetitionImportData() { return backendContext.activeCompetitionImportData; },
      set activeCompetitionImportData(value) { backendContext.activeCompetitionImportData = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get competitionImportIdentity() { return backendContext.competitionImportIdentity; },
      set competitionImportIdentity(value) { backendContext.competitionImportIdentity = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get publicPerformancePublicationJob() { return backendContext.publicPerformancePublicationJob; },
      set publicPerformancePublicationJob(value) { backendContext.publicPerformancePublicationJob = value; },
      get sameCompetitionImport() { return backendContext.sameCompetitionImport; },
      set sameCompetitionImport(value) { backendContext.sameCompetitionImport = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-performance-service/mark-competition-import-deleted").createPerformanceService_markCompetitionImportDeleted({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_BASE_CHANGES_COLLECTION() { return backendContext.PERFORMANCE_BASE_CHANGES_COLLECTION; },
      set PERFORMANCE_BASE_CHANGES_COLLECTION(value) { backendContext.PERFORMANCE_BASE_CHANGES_COLLECTION = value; },
      get PERFORMANCE_BASE_COLLECTION() { return backendContext.PERFORMANCE_BASE_COLLECTION; },
      set PERFORMANCE_BASE_COLLECTION(value) { backendContext.PERFORMANCE_BASE_COLLECTION = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get invalidateEngagementEntryTimeCachesForPerformanceRows() { return backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows; },
      set invalidateEngagementEntryTimeCachesForPerformanceRows(value) { backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows = value; },
      get readPublishedAdditionalPerformanceDataSnapshot() { return backendContext.readPublishedAdditionalPerformanceDataSnapshot; },
      set readPublishedAdditionalPerformanceDataSnapshot(value) { backendContext.readPublishedAdditionalPerformanceDataSnapshot = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get local$performanceBaseDocId() { return operation5().performanceBaseDocId; },
      get local$publicPerformanceBaseRow() { return operation7().publicPerformanceBaseRow; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-performance-service/performance-public-key").createPerformanceService_performancePublicKey({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-performance-service/performance-base-doc-id").createPerformanceService_performanceBaseDocId({
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get local$performancePublicKey() { return operation4().performancePublicKey; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-performance-service/clean-performance-base-row").createPerformanceService_cleanPerformanceBaseRow({
      get CATEGORY_LABELS() { return backendContext.CATEGORY_LABELS; },
      set CATEGORY_LABELS(value) { backendContext.CATEGORY_LABELS = value; },
      get PERFORMANCE_BASE_CHANGES_COLLECTION() { return backendContext.PERFORMANCE_BASE_CHANGES_COLLECTION; },
      set PERFORMANCE_BASE_CHANGES_COLLECTION(value) { backendContext.PERFORMANCE_BASE_CHANGES_COLLECTION = value; },
      get PERFORMANCE_BASE_COLLECTION() { return backendContext.PERFORMANCE_BASE_COLLECTION; },
      set PERFORMANCE_BASE_COLLECTION(value) { backendContext.PERFORMANCE_BASE_COLLECTION = value; },
      get categoryCodeFromCategory() { return backendContext.categoryCodeFromCategory; },
      set categoryCodeFromCategory(value) { backendContext.categoryCodeFromCategory = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get coursePayload() { return backendContext.coursePayload; },
      set coursePayload(value) { backendContext.coursePayload = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get importSeasonYear() { return backendContext.importSeasonYear; },
      set importSeasonYear(value) { backendContext.importSeasonYear = value; },
      get invalidateEngagementEntryTimeCachesForPerformanceRows() { return backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows; },
      set invalidateEngagementEntryTimeCachesForPerformanceRows(value) { backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows = value; },
      get normalizeCategoryCode() { return backendContext.normalizeCategoryCode; },
      set normalizeCategoryCode(value) { backendContext.normalizeCategoryCode = value; },
      get normalizeCourseCode() { return backendContext.normalizeCourseCode; },
      set normalizeCourseCode(value) { backendContext.normalizeCourseCode = value; },
      get performanceCategoryFromRow() { return backendContext.performanceCategoryFromRow; },
      set performanceCategoryFromRow(value) { backendContext.performanceCategoryFromRow = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get touchDtnQualificationCacheState() { return backendContext.touchDtnQualificationCacheState; },
      set touchDtnQualificationCacheState(value) { backendContext.touchDtnQualificationCacheState = value; },
      get local$performanceBaseDocId() { return operation5().performanceBaseDocId; },
      get local$performancePublicKey() { return operation4().performancePublicKey; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-performance-service/public-performance-base-row").createPerformanceService_publicPerformanceBaseRow({
      get CATEGORY_LABELS() { return backendContext.CATEGORY_LABELS; },
      set CATEGORY_LABELS(value) { backendContext.CATEGORY_LABELS = value; },
      get categoryCodeFromCategory() { return backendContext.categoryCodeFromCategory; },
      set categoryCodeFromCategory(value) { backendContext.categoryCodeFromCategory = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get normalizeCategoryCode() { return backendContext.normalizeCategoryCode; },
      set normalizeCategoryCode(value) { backendContext.normalizeCategoryCode = value; },
      get performanceCategoryFromRow() { return backendContext.performanceCategoryFromRow; },
      set performanceCategoryFromRow(value) { backendContext.performanceCategoryFromRow = value; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-performance-service/unique-public-performance-rows").createPerformanceService_uniquePublicPerformanceRows({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$performancePublicKey() { return operation4().performancePublicKey; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-performance-service/public-swimmer-key").createPerformanceService_publicSwimmerKey({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-performance-service/public-better-performance").createPerformanceService_publicBetterPerformance({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-performance-service/best-top-rows").createPerformanceService_bestTopRows({
      get CATEGORY_LABELS() { return backendContext.CATEGORY_LABELS; },
      set CATEGORY_LABELS(value) { backendContext.CATEGORY_LABELS = value; },
      get PERFORMANCE_TOP_BUCKETS_COLLECTION() { return backendContext.PERFORMANCE_TOP_BUCKETS_COLLECTION; },
      set PERFORMANCE_TOP_BUCKETS_COLLECTION(value) { backendContext.PERFORMANCE_TOP_BUCKETS_COLLECTION = value; },
      get PERFORMANCE_TOP_INDEX_LIMIT() { return backendContext.PERFORMANCE_TOP_INDEX_LIMIT; },
      set PERFORMANCE_TOP_INDEX_LIMIT(value) { backendContext.PERFORMANCE_TOP_INDEX_LIMIT = value; },
      get categoryCodeFromCategory() { return backendContext.categoryCodeFromCategory; },
      set categoryCodeFromCategory(value) { backendContext.categoryCodeFromCategory = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get normalizeCategoryCode() { return backendContext.normalizeCategoryCode; },
      set normalizeCategoryCode(value) { backendContext.normalizeCategoryCode = value; },
      get performanceCategoryFromRow() { return backendContext.performanceCategoryFromRow; },
      set performanceCategoryFromRow(value) { backendContext.performanceCategoryFromRow = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get local$performancePublicKey() { return operation4().performancePublicKey; },
      get local$publicBetterPerformance() { return operation10().publicBetterPerformance; },
      get local$publicSwimmerKey() { return operation9().publicSwimmerKey; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-performance-service/performance-top-rows-from-index").createPerformanceService_performanceTopRowsFromIndex({
      get PERFORMANCE_TOP_BUCKETS_COLLECTION() { return backendContext.PERFORMANCE_TOP_BUCKETS_COLLECTION; },
      set PERFORMANCE_TOP_BUCKETS_COLLECTION(value) { backendContext.PERFORMANCE_TOP_BUCKETS_COLLECTION = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$performanceTopBucketId() { return operation11().performanceTopBucketId; },
      get local$performanceTopBucketKey() { return operation11().performanceTopBucketKey; },
      get local$readPerformanceTopIndexRows() { return operation11().readPerformanceTopIndexRows; }
    });
    return cache12;
  }
  return {
    competitionImportPublicSnapshotSummary: operation0().competitionImportPublicSnapshotSummary,
    publishCompetitionImportOutputs: operation1().publishCompetitionImportOutputs,
    competitionImportPerformanceId: operation2().competitionImportPerformanceId,
    stageCompetitionImportReplacement: operation2().stageCompetitionImportReplacement,
    markCompetitionImportDeleted: operation3().markCompetitionImportDeleted,
    performancePublicKey: operation4().performancePublicKey,
    performanceBaseDocId: operation5().performanceBaseDocId,
    normalizeLivePalmesImportPerformances: operation0().normalizeLivePalmesImportPerformances,
    cleanPerformanceBaseRow: operation6().cleanPerformanceBaseRow,
    writePerformanceBaseRows: operation6().writePerformanceBaseRows,
    publicPerformanceBaseRow: operation7().publicPerformanceBaseRow,
    uniquePublicPerformanceRows: operation8().uniquePublicPerformanceRows,
    publicSwimmerKey: operation9().publicSwimmerKey,
    publicBetterPerformance: operation10().publicBetterPerformance,
    publicTopIndexRow: operation11().publicTopIndexRow,
    performanceTopBucketKey: operation11().performanceTopBucketKey,
    performanceTopBucketId: operation11().performanceTopBucketId,
    performanceTopBucketVariants: operation11().performanceTopBucketVariants,
    bestTopRows: operation11().bestTopRows,
    encodePerformanceTopIndexRows: operation11().encodePerformanceTopIndexRows,
    readPerformanceTopIndexRows: operation11().readPerformanceTopIndexRows,
    writePerformanceTopIndexRows: operation11().writePerformanceTopIndexRows,
    performanceTopRowsFromIndex: operation12().performanceTopRowsFromIndex
  };
}

module.exports = { createPerformanceService };
