// Compatibility factory; operation modules hold the existing bodies.
function createLegacyService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-legacy-service/aggregate-swimmer-index-rows").createLegacyService_aggregateSwimmerIndexRows({
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
      set PERFORMANCE_SWIMMER_PAGES_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION = value; },
      get PERFORMANCE_SWIMMER_PAGE_SIZE() { return backendContext.PERFORMANCE_SWIMMER_PAGE_SIZE; },
      set PERFORMANCE_SWIMMER_PAGE_SIZE(value) { backendContext.PERFORMANCE_SWIMMER_PAGE_SIZE = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get normalizePerformanceSearchText() { return backendContext.normalizePerformanceSearchText; },
      set normalizePerformanceSearchText(value) { backendContext.normalizePerformanceSearchText = value; },
      get performancePublicKey() { return backendContext.performancePublicKey; },
      set performancePublicKey(value) { backendContext.performancePublicKey = value; },
      get performanceSearchPrefixes() { return backendContext.performanceSearchPrefixes; },
      set performanceSearchPrefixes(value) { backendContext.performanceSearchPrefixes = value; },
      get performanceSwimmerIndexKey() { return backendContext.performanceSwimmerIndexKey; },
      set performanceSwimmerIndexKey(value) { backendContext.performanceSwimmerIndexKey = value; },
      get publicPerformanceBaseRow() { return backendContext.publicPerformanceBaseRow; },
      set publicPerformanceBaseRow(value) { backendContext.publicPerformanceBaseRow = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get local$performanceSwimmerPageId() { return operation1().performanceSwimmerPageId; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-legacy-service/performance-swimmer-page-id").createLegacyService_performanceSwimmerPageId({

    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-legacy-service/get-performance-base-rows-by-swimmer").createLegacyService_getPerformanceBaseRowsBySwimmer({
      get ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS() { return backendContext.ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS; },
      set ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS(value) { backendContext.ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_BASE_COLLECTION() { return backendContext.PERFORMANCE_BASE_COLLECTION; },
      set PERFORMANCE_BASE_COLLECTION(value) { backendContext.PERFORMANCE_BASE_COLLECTION = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
      set PERFORMANCE_SWIMMER_PAGES_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get publicPerformanceBaseRow() { return backendContext.publicPerformanceBaseRow; },
      set publicPerformanceBaseRow(value) { backendContext.publicPerformanceBaseRow = value; },
      get publicPerformanceSwimmerFilePath() { return backendContext.publicPerformanceSwimmerFilePath; },
      set publicPerformanceSwimmerFilePath(value) { backendContext.publicPerformanceSwimmerFilePath = value; },
      get readPublicPerformanceJson() { return backendContext.readPublicPerformanceJson; },
      set readPublicPerformanceJson(value) { backendContext.readPublicPerformanceJson = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get uniquePublicPerformanceRows() { return backendContext.uniquePublicPerformanceRows; },
      set uniquePublicPerformanceRows(value) { backendContext.uniquePublicPerformanceRows = value; },
      get local$performanceSwimmerPageId() { return operation1().performanceSwimmerPageId; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-legacy-service/normalized-import-performances").createLegacyService_normalizedImportPerformances({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get normalizeLivePalmesImportPerformances() { return backendContext.normalizeLivePalmesImportPerformances; },
      set normalizeLivePalmesImportPerformances(value) { backendContext.normalizeLivePalmesImportPerformances = value; },
      get writePerformanceBaseRows() { return backendContext.writePerformanceBaseRows; },
      set writePerformanceBaseRows(value) { backendContext.writePerformanceBaseRows = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-legacy-service/additional-performance-file").createLegacyService_additionalPerformanceFile({
      get PUBLIC_ADDITIONAL_PERFORMANCE_PATH() { return backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_PATH; },
      set PUBLIC_ADDITIONAL_PERFORMANCE_PATH(value) { backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_PATH = value; },
      get PUBLIC_PERFORMANCE_BUCKET() { return backendContext.PUBLIC_PERFORMANCE_BUCKET; },
      set PUBLIC_PERFORMANCE_BUCKET(value) { backendContext.PUBLIC_PERFORMANCE_BUCKET = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get publicPerformanceBaseRow() { return backendContext.publicPerformanceBaseRow; },
      set publicPerformanceBaseRow(value) { backendContext.publicPerformanceBaseRow = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-legacy-service/additional-performance-row-key").createLegacyService_additionalPerformanceRowKey({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get performancePublicKey() { return backendContext.performancePublicKey; },
      set performancePublicKey(value) { backendContext.performancePublicKey = value; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-legacy-service/claim-performance-publication-job").createLegacyService_claimPerformancePublicationJob({
      get MAX_COMPETITION_IMPORT_PERFORMANCES() { return backendContext.MAX_COMPETITION_IMPORT_PERFORMANCES; },
      set MAX_COMPETITION_IMPORT_PERFORMANCES(value) { backendContext.MAX_COMPETITION_IMPORT_PERFORMANCES = value; },
      get PERFORMANCE_BASE_CHANGES_COLLECTION() { return backendContext.PERFORMANCE_BASE_CHANGES_COLLECTION; },
      set PERFORMANCE_BASE_CHANGES_COLLECTION(value) { backendContext.PERFORMANCE_BASE_CHANGES_COLLECTION = value; },
      get PERFORMANCE_BASE_COLLECTION() { return backendContext.PERFORMANCE_BASE_COLLECTION; },
      set PERFORMANCE_BASE_COLLECTION(value) { backendContext.PERFORMANCE_BASE_COLLECTION = value; },
      get PERFORMANCE_PUBLICATION_LEASE_MS() { return backendContext.PERFORMANCE_PUBLICATION_LEASE_MS; },
      set PERFORMANCE_PUBLICATION_LEASE_MS(value) { backendContext.PERFORMANCE_PUBLICATION_LEASE_MS = value; },
      get PERFORMANCE_PUBLICATION_MAX_ATTEMPTS() { return backendContext.PERFORMANCE_PUBLICATION_MAX_ATTEMPTS; },
      set PERFORMANCE_PUBLICATION_MAX_ATTEMPTS(value) { backendContext.PERFORMANCE_PUBLICATION_MAX_ATTEMPTS = value; },
      get canClaimPerformancePublicationJob() { return backendContext.canClaimPerformancePublicationJob; },
      set canClaimPerformancePublicationJob(value) { backendContext.canClaimPerformancePublicationJob = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get competitionImportPublicSnapshotSummary() { return backendContext.competitionImportPublicSnapshotSummary; },
      set competitionImportPublicSnapshotSummary(value) { backendContext.competitionImportPublicSnapshotSummary = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deactivatedImportPerformanceRows() { return backendContext.deactivatedImportPerformanceRows; },
      set deactivatedImportPerformanceRows(value) { backendContext.deactivatedImportPerformanceRows = value; },
      get invalidateEngagementEntryTimeCachesForPerformanceRows() { return backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows; },
      set invalidateEngagementEntryTimeCachesForPerformanceRows(value) { backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows = value; },
      get normalizeLivePalmesImportPerformances() { return backendContext.normalizeLivePalmesImportPerformances; },
      set normalizeLivePalmesImportPerformances(value) { backendContext.normalizeLivePalmesImportPerformances = value; },
      get performanceBaseDocId() { return backendContext.performanceBaseDocId; },
      set performanceBaseDocId(value) { backendContext.performanceBaseDocId = value; },
      get performancePublicationFailureStatus() { return backendContext.performancePublicationFailureStatus; },
      set performancePublicationFailureStatus(value) { backendContext.performancePublicationFailureStatus = value; },
      get rebuildPublicPerformanceFilesForAffectedRows() { return backendContext.rebuildPublicPerformanceFilesForAffectedRows; },
      set rebuildPublicPerformanceFilesForAffectedRows(value) { backendContext.rebuildPublicPerformanceFilesForAffectedRows = value; },
      get sameCompetitionImport() { return backendContext.sameCompetitionImport; },
      set sameCompetitionImport(value) { backendContext.sameCompetitionImport = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get touchDtnQualificationCacheState() { return backendContext.touchDtnQualificationCacheState; },
      set touchDtnQualificationCacheState(value) { backendContext.touchDtnQualificationCacheState = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writePerformanceBaseRows() { return backendContext.writePerformanceBaseRows; },
      set writePerformanceBaseRows(value) { backendContext.writePerformanceBaseRows = value; },
      get local$mergeAdditionalPerformanceRows() { return operation5().mergeAdditionalPerformanceRows; },
      get local$readPublishedAdditionalPerformanceDataSnapshot() { return operation4().readPublishedAdditionalPerformanceDataSnapshot; },
      get local$saveAdditionalPerformanceDataSnapshot() { return operation7().saveAdditionalPerformanceDataSnapshot; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-legacy-service/save-additional-performance-data-snapshot").createLegacyService_saveAdditionalPerformanceDataSnapshot({
      get PUBLIC_ADDITIONAL_PERFORMANCE_PATH() { return backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_PATH; },
      set PUBLIC_ADDITIONAL_PERFORMANCE_PATH(value) { backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_PATH = value; },
      get PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN() { return backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN; },
      set PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN(value) { backendContext.PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN = value; },
      get local$additionalPerformanceFile() { return operation4().additionalPerformanceFile; },
      get local$buildAdditionalPerformanceSwimmers() { return operation4().buildAdditionalPerformanceSwimmers; },
      get local$normalizeAdditionalPerformanceDataSnapshot() { return operation4().normalizeAdditionalPerformanceDataSnapshot; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-legacy-service/publish-incremental-performance-import").createLegacyService_publishIncrementalPerformanceImport({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$mergeAdditionalPerformanceRows() { return operation5().mergeAdditionalPerformanceRows; },
      get local$readPublishedAdditionalPerformanceDataSnapshot() { return operation4().readPublishedAdditionalPerformanceDataSnapshot; },
      get local$saveAdditionalPerformanceDataSnapshot() { return operation7().saveAdditionalPerformanceDataSnapshot; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-legacy-service/public-performance-files-bucket").createLegacyService_publicPerformanceFilesBucket({
      get PUBLIC_PERFORMANCE_BUCKET() { return backendContext.PUBLIC_PERFORMANCE_BUCKET; },
      set PUBLIC_PERFORMANCE_BUCKET(value) { backendContext.PUBLIC_PERFORMANCE_BUCKET = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-legacy-service/migration-chunk-statuses").createLegacyService_migrationChunkStatuses({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_BASE_MIGRATION_COLLECTION() { return backendContext.PERFORMANCE_BASE_MIGRATION_COLLECTION; },
      set PERFORMANCE_BASE_MIGRATION_COLLECTION(value) { backendContext.PERFORMANCE_BASE_MIGRATION_COLLECTION = value; },
      get PERFORMANCE_PUBLIC_DATA_URL() { return backendContext.PERFORMANCE_PUBLIC_DATA_URL; },
      set PERFORMANCE_PUBLIC_DATA_URL(value) { backendContext.PERFORMANCE_PUBLIC_DATA_URL = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-legacy-service/historical-rows-from-chunk-payload").createLegacyService_historicalRowsFromChunkPayload({

    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-legacy-service/migrate-historical-performance-base-chunk").createLegacyService_migrateHistoricalPerformanceBaseChunk({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_BASE_MIGRATION_BATCH_SIZE() { return backendContext.PERFORMANCE_BASE_MIGRATION_BATCH_SIZE; },
      set PERFORMANCE_BASE_MIGRATION_BATCH_SIZE(value) { backendContext.PERFORMANCE_BASE_MIGRATION_BATCH_SIZE = value; },
      get PERFORMANCE_BASE_MIGRATION_COLLECTION() { return backendContext.PERFORMANCE_BASE_MIGRATION_COLLECTION; },
      set PERFORMANCE_BASE_MIGRATION_COLLECTION(value) { backendContext.PERFORMANCE_BASE_MIGRATION_COLLECTION = value; },
      get PERFORMANCE_PUBLIC_DATA_URL() { return backendContext.PERFORMANCE_PUBLIC_DATA_URL; },
      set PERFORMANCE_PUBLIC_DATA_URL(value) { backendContext.PERFORMANCE_PUBLIC_DATA_URL = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get writePerformanceBaseRows() { return backendContext.writePerformanceBaseRows; },
      set writePerformanceBaseRows(value) { backendContext.writePerformanceBaseRows = value; },
      get local$historicalRowsFromChunkPayload() { return operation11().historicalRowsFromChunkPayload; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/server-legacy-service/build-additional-performance-data-snapshot").createLegacyService_buildAdditionalPerformanceDataSnapshot({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get local$readPublishedAdditionalPerformanceDataSnapshot() { return operation4().readPublishedAdditionalPerformanceDataSnapshot; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/server-legacy-service/publish-additional-performance-data-snapshot").createLegacyService_publishAdditionalPerformanceDataSnapshot({
      get local$buildAdditionalPerformanceDataSnapshot() { return operation13().buildAdditionalPerformanceDataSnapshot; },
      get local$saveAdditionalPerformanceDataSnapshot() { return operation7().saveAdditionalPerformanceDataSnapshot; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/server-legacy-service/enqueue-performance-publication-job").createLegacyService_enqueuePerformancePublicationJob({
      get PERFORMANCE_PUBLICATION_JOBS_COLLECTION() { return backendContext.PERFORMANCE_PUBLICATION_JOBS_COLLECTION; },
      set PERFORMANCE_PUBLICATION_JOBS_COLLECTION(value) { backendContext.PERFORMANCE_PUBLICATION_JOBS_COLLECTION = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get publicPerformancePublicationJob() { return backendContext.publicPerformancePublicationJob; },
      set publicPerformancePublicationJob(value) { backendContext.publicPerformancePublicationJob = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/server-legacy-service/authorize-nap-records").createLegacyService_authorizeNapRecords({
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCapability() { return backendContext.assertCapability; },
      set assertCapability(value) { backendContext.assertCapability = value; }
    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/server-legacy-service/read-nap-records-administration").createLegacyService_readNapRecordsAdministration({
      get local$authorizeNapRecords() { return operation16().authorizeNapRecords; },
      get local$nativePerformanceFailure() { return operation20().nativePerformanceFailure; }
    });
    return cache17;
  }

  let cache18;
  function operation18() {
    if (!cache18) cache18 = require("./backend/server-legacy-service/publish-native-records").createLegacyService_publishNativeRecords({
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; },
      get local$authorizeNapRecords() { return operation16().authorizeNapRecords; },
      get local$nativePerformanceFailure() { return operation20().nativePerformanceFailure; }
    });
    return cache18;
  }

  let cache19;
  function operation19() {
    if (!cache19) cache19 = require("./backend/server-legacy-service/authorize-native-performance").createLegacyService_authorizeNativePerformance({
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCapability() { return backendContext.assertCapability; },
      set assertCapability(value) { backendContext.assertCapability = value; }
    });
    return cache19;
  }

  let cache20;
  function operation20() {
    if (!cache20) cache20 = require("./backend/server-legacy-service/native-performance-failure").createLegacyService_nativePerformanceFailure({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; }
    });
    return cache20;
  }
  return {
    swimmerDisplayNameFromRow: operation0().swimmerDisplayNameFromRow,
    aggregateSwimmerIndexRows: operation0().aggregateSwimmerIndexRows,
    writePerformanceSwimmerIndexRows: operation0().writePerformanceSwimmerIndexRows,
    performanceSwimmerPageId: operation1().performanceSwimmerPageId,
    sortSwimmerPerformanceRows: operation0().sortSwimmerPerformanceRows,
    writePerformanceSwimmerPageRows: operation0().writePerformanceSwimmerPageRows,
    hydratePerformanceBaseRows: operation2().hydratePerformanceBaseRows,
    getPerformanceBaseRowsBySwimmer: operation2().getPerformanceBaseRowsBySwimmer,
    normalizedImportPerformances: operation3().normalizedImportPerformances,
    syncImportToPerformanceBase: operation3().syncImportToPerformanceBase,
    buildAdditionalPerformanceSwimmers: operation4().buildAdditionalPerformanceSwimmers,
    emptyAdditionalPerformanceDataSnapshot: operation4().emptyAdditionalPerformanceDataSnapshot,
    normalizeAdditionalPerformanceDataSnapshot: operation4().normalizeAdditionalPerformanceDataSnapshot,
    additionalPerformanceFile: operation4().additionalPerformanceFile,
    readPublishedAdditionalPerformanceDataSnapshot: operation4().readPublishedAdditionalPerformanceDataSnapshot,
    additionalPerformanceRowKey: operation5().additionalPerformanceRowKey,
    mergeAdditionalPerformanceRows: operation5().mergeAdditionalPerformanceRows,
    upsertAdditionalCorrection: operation6().upsertAdditionalCorrection,
    saveAdditionalPerformanceDataSnapshot: operation7().saveAdditionalPerformanceDataSnapshot,
    publishIncrementalPerformanceImport: operation8().publishIncrementalPerformanceImport,
    publishIncrementalPerformanceCorrection: operation6().publishIncrementalPerformanceCorrection,
    publicPerformanceFilesBucket: operation9().publicPerformanceFilesBucket,
    performanceBaseMigrationManifest: operation10().performanceBaseMigrationManifest,
    migrationChunkStatuses: operation10().migrationChunkStatuses,
    historicalRowsFromChunkPayload: operation11().historicalRowsFromChunkPayload,
    migrateHistoricalPerformanceBaseChunk: operation12().migrateHistoricalPerformanceBaseChunk,
    buildAdditionalPerformanceDataSnapshot: operation13().buildAdditionalPerformanceDataSnapshot,
    publishAdditionalPerformanceDataSnapshot: operation14().publishAdditionalPerformanceDataSnapshot,
    enqueuePerformancePublicationJob: operation15().enqueuePerformancePublicationJob,
    claimPerformancePublicationJob: operation6().claimPerformancePublicationJob,
    replacementImportRows: operation6().replacementImportRows,
    deactivateReplacedPerformanceBaseRows: operation6().deactivateReplacedPerformanceBaseRows,
    processPerformanceImportReplacementJob: operation6().processPerformanceImportReplacementJob,
    processPerformancePublicationJob: operation6().processPerformancePublicationJob,
    authorizeNapRecords: operation16().authorizeNapRecords,
    readNapRecordsAdministration: operation17().readNapRecordsAdministration,
    publishNativeRecords: operation18().publishNativeRecords,
    authorizeNativePerformance: operation19().authorizeNativePerformance,
    nativePerformanceFailure: operation20().nativePerformanceFailure
  };
}

module.exports = { createLegacyService };
