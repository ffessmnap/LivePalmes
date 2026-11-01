// Compatibility factory; operation modules hold the existing bodies.
function createDtnService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-dtn-service/dtn-season-service").createDtnService_dtnSeasonService({
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCapability() { return backendContext.assertCapability; },
      set assertCapability(value) { backendContext.assertCapability = value; },
      get assertLivePalmesAccess() { return backendContext.assertLivePalmesAccess; },
      set assertLivePalmesAccess(value) { backendContext.assertLivePalmesAccess = value; },
      get createDtnSeasonService() { return backendContext.createDtnSeasonService; },
      set createDtnSeasonService(value) { backendContext.createDtnSeasonService = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get publicPerformanceBaseRow() { return backendContext.publicPerformanceBaseRow; },
      set publicPerformanceBaseRow(value) { backendContext.publicPerformanceBaseRow = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-dtn-service/invoke-dtn-season").createDtnService_invokeDtnSeason({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get local$dtnSeasonService() { return operation0().dtnSeasonService; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-dtn-service/best-dtn-qualification-rows").createDtnService_bestDtnQualificationRows({
      get DTN_EDF_LIMOGES_COMPETITION_ID() { return backendContext.DTN_EDF_LIMOGES_COMPETITION_ID; },
      set DTN_EDF_LIMOGES_COMPETITION_ID(value) { backendContext.DTN_EDF_LIMOGES_COMPETITION_ID = value; },
      get DTN_NEAR_MINIMUM_MAX_PERCENT() { return backendContext.DTN_NEAR_MINIMUM_MAX_PERCENT; },
      set DTN_NEAR_MINIMUM_MAX_PERCENT(value) { backendContext.DTN_NEAR_MINIMUM_MAX_PERCENT = value; },
      get DTN_QUALIFICATION_MAX_ROWS_PER_COURSE() { return backendContext.DTN_QUALIFICATION_MAX_ROWS_PER_COURSE; },
      set DTN_QUALIFICATION_MAX_ROWS_PER_COURSE(value) { backendContext.DTN_QUALIFICATION_MAX_ROWS_PER_COURSE = value; },
      get ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES() { return backendContext.ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES; },
      set ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES(value) { backendContext.ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES = value; },
      get POOL_COURSES() { return backendContext.POOL_COURSES; },
      set POOL_COURSES(value) { backendContext.POOL_COURSES = value; },
      get birthYear() { return backendContext.birthYear; },
      set birthYear(value) { backendContext.birthYear = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get publicBetterPerformance() { return backendContext.publicBetterPerformance; },
      set publicBetterPerformance(value) { backendContext.publicBetterPerformance = value; },
      get publicPerformanceBaseRow() { return backendContext.publicPerformanceBaseRow; },
      set publicPerformanceBaseRow(value) { backendContext.publicPerformanceBaseRow = value; },
      get publicPerformanceTopFileName() { return backendContext.publicPerformanceTopFileName; },
      set publicPerformanceTopFileName(value) { backendContext.publicPerformanceTopFileName = value; },
      get publicSwimmerKey() { return backendContext.publicSwimmerKey; },
      set publicSwimmerKey(value) { backendContext.publicSwimmerKey = value; },
      get readPublicPerformanceJson() { return backendContext.readPublicPerformanceJson; },
      set readPublicPerformanceJson(value) { backendContext.readPublicPerformanceJson = value; },
      get uniquePublicPerformanceRows() { return backendContext.uniquePublicPerformanceRows; },
      set uniquePublicPerformanceRows(value) { backendContext.uniquePublicPerformanceRows = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-dtn-service/dtn-qualification-cache-state-ref").createDtnService_dtnQualificationCacheStateRef({
      get DTN_QUALIFICATION_CACHE_STATE_COLLECTION() { return backendContext.DTN_QUALIFICATION_CACHE_STATE_COLLECTION; },
      set DTN_QUALIFICATION_CACHE_STATE_COLLECTION(value) { backendContext.DTN_QUALIFICATION_CACHE_STATE_COLLECTION = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-dtn-service/dtn-qualification-cache-ref").createDtnService_dtnQualificationCacheRef({
      get DTN_QUALIFICATION_CACHE_COLLECTION() { return backendContext.DTN_QUALIFICATION_CACHE_COLLECTION; },
      set DTN_QUALIFICATION_CACHE_COLLECTION(value) { backendContext.DTN_QUALIFICATION_CACHE_COLLECTION = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-dtn-service/dtn-listing-cache-ref").createDtnService_dtnListingCacheRef({
      get DTN_QUALIFICATION_CACHE_COLLECTION() { return backendContext.DTN_QUALIFICATION_CACHE_COLLECTION; },
      set DTN_QUALIFICATION_CACHE_COLLECTION(value) { backendContext.DTN_QUALIFICATION_CACHE_COLLECTION = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-dtn-service/dtn-qualification-seasons-for-rows").createDtnService_dtnQualificationSeasonsForRows({
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get importSeasonYear() { return backendContext.importSeasonYear; },
      set importSeasonYear(value) { backendContext.importSeasonYear = value; },
      get local$dtnQualificationCacheStateRef() { return operation3().dtnQualificationCacheStateRef; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-dtn-service/dtn-qualification-cache-fingerprint").createDtnService_dtnQualificationCacheFingerprint({
      get DTN_QUALIFICATION_CACHE_VERSION() { return backendContext.DTN_QUALIFICATION_CACHE_VERSION; },
      set DTN_QUALIFICATION_CACHE_VERSION(value) { backendContext.DTN_QUALIFICATION_CACHE_VERSION = value; },
      get POOL_COURSES() { return backendContext.POOL_COURSES; },
      set POOL_COURSES(value) { backendContext.POOL_COURSES = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-dtn-service/dtn-listing-cache-fingerprint").createDtnService_dtnListingCacheFingerprint({
      get DTN_LISTING_CACHE_VERSION() { return backendContext.DTN_LISTING_CACHE_VERSION; },
      set DTN_LISTING_CACHE_VERSION(value) { backendContext.DTN_LISTING_CACHE_VERSION = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get POOL_COURSES() { return backendContext.POOL_COURSES; },
      set POOL_COURSES(value) { backendContext.POOL_COURSES = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-dtn-service/enqueue-dtn-qualification-job").createDtnService_enqueueDtnQualificationJob({
      get DTN_QUALIFICATION_JOBS_COLLECTION() { return backendContext.DTN_QUALIFICATION_JOBS_COLLECTION; },
      set DTN_QUALIFICATION_JOBS_COLLECTION(value) { backendContext.DTN_QUALIFICATION_JOBS_COLLECTION = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-dtn-service/normalize-performance-search-text").createDtnService_normalizePerformanceSearchText({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-dtn-service/performance-search-tokens").createDtnService_performanceSearchTokens({
      get local$normalizePerformanceSearchText() { return operation10().normalizePerformanceSearchText; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-dtn-service/performance-search-prefixes").createDtnService_performanceSearchPrefixes({
      get local$performanceSearchTokens() { return operation11().performanceSearchTokens; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/server-dtn-service/performance-swimmer-index-key").createDtnService_performanceSwimmerIndexKey({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$normalizePerformanceSearchText() { return operation10().normalizePerformanceSearchText; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/server-dtn-service/performance-swimmer-index-doc-id").createDtnService_performanceSwimmerIndexDocId({
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get local$performanceSwimmerIndexKey() { return operation13().performanceSwimmerIndexKey; }
    });
    return cache14;
  }
  return {
    dtnSeasonService: operation0().dtnSeasonService,
    invokeDtnSeason: operation1().invokeDtnSeason,
    dtnQualificationRow: operation2().dtnQualificationRow,
    bestDtnQualificationRows: operation2().bestDtnQualificationRows,
    nearDtnQualificationRows: operation2().nearDtnQualificationRows,
    dtnQualificationCacheStateRef: operation3().dtnQualificationCacheStateRef,
    dtnQualificationCacheRef: operation4().dtnQualificationCacheRef,
    dtnListingCacheRef: operation5().dtnListingCacheRef,
    dtnQualificationSeasonsForRows: operation6().dtnQualificationSeasonsForRows,
    touchDtnQualificationCacheState: operation6().touchDtnQualificationCacheState,
    dtnQualificationCacheFingerprint: operation7().dtnQualificationCacheFingerprint,
    dtnQualificationRowsForStandard: operation2().dtnQualificationRowsForStandard,
    dtnListingCacheFingerprint: operation8().dtnListingCacheFingerprint,
    emptyDtnQualificationPayload: operation7().emptyDtnQualificationPayload,
    buildDtnQualificationPayload: operation2().buildDtnQualificationPayload,
    emptyDtnListingPayload: operation8().emptyDtnListingPayload,
    isDtnElectronicFiftyMeterPerformance: operation2().isDtnElectronicFiftyMeterPerformance,
    dtnListingAthletes: operation2().dtnListingAthletes,
    buildDtnListingPayload: operation2().buildDtnListingPayload,
    enqueueDtnQualificationJob: operation9().enqueueDtnQualificationJob,
    normalizeDtnListingRules: operation8().normalizeDtnListingRules,
    normalizePerformanceSearchText: operation10().normalizePerformanceSearchText,
    performanceSearchTokens: operation11().performanceSearchTokens,
    performanceSearchPrefixes: operation12().performanceSearchPrefixes,
    performanceSwimmerIndexKey: operation13().performanceSwimmerIndexKey,
    performanceSwimmerIndexDocId: operation14().performanceSwimmerIndexDocId
  };
}

module.exports = { createDtnService };
