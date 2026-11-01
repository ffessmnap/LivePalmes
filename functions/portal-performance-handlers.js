// Compatibility factory; operation modules hold the existing bodies.
function createPerformanceHandlers(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/portal-performance-handlers/store-competition-pdf").createPerformanceHandlers_storeCompetitionPdf({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PUBLIC_PERFORMANCE_BUCKET() { return backendContext.PUBLIC_PERFORMANCE_BUCKET; },
      set PUBLIC_PERFORMANCE_BUCKET(value) { backendContext.PUBLIC_PERFORMANCE_BUCKET = value; },
      get assertComputerPdfAccess() { return backendContext.assertComputerPdfAccess; },
      set assertComputerPdfAccess(value) { backendContext.assertComputerPdfAccess = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get competitionIdFrom() { return backendContext.competitionIdFrom; },
      set competitionIdFrom(value) { backendContext.competitionIdFrom = value; },
      get decodePdfDataUrl() { return backendContext.decodePdfDataUrl; },
      set decodePdfDataUrl(value) { backendContext.decodePdfDataUrl = value; },
      get publicPdfStoragePath() { return backendContext.publicPdfStoragePath; },
      set publicPdfStoragePath(value) { backendContext.publicPdfStoragePath = value; },
      get publicStorageUrl() { return backendContext.publicStorageUrl; },
      set publicStorageUrl(value) { backendContext.publicStorageUrl = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/portal-performance-handlers/delete-competition-pdf").createPerformanceHandlers_deleteCompetitionPdf({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PUBLIC_COMPETITION_PDF_PREFIX() { return backendContext.PUBLIC_COMPETITION_PDF_PREFIX; },
      set PUBLIC_COMPETITION_PDF_PREFIX(value) { backendContext.PUBLIC_COMPETITION_PDF_PREFIX = value; },
      get PUBLIC_PERFORMANCE_BUCKET() { return backendContext.PUBLIC_PERFORMANCE_BUCKET; },
      set PUBLIC_PERFORMANCE_BUCKET(value) { backendContext.PUBLIC_PERFORMANCE_BUCKET = value; },
      get assertComputerPdfAccess() { return backendContext.assertComputerPdfAccess; },
      set assertComputerPdfAccess(value) { backendContext.assertComputerPdfAccess = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get competitionIdFrom() { return backendContext.competitionIdFrom; },
      set competitionIdFrom(value) { backendContext.competitionIdFrom = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/portal-performance-handlers/update-engagement-national-swimmer-identity").createPerformanceHandlers_updateEngagementNationalSwimmerIdentity({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get applyEngagementSwimmerIdentityCorrection() { return backendContext.applyEngagementSwimmerIdentityCorrection; },
      set applyEngagementSwimmerIdentityCorrection(value) { backendContext.applyEngagementSwimmerIdentityCorrection = value; },
      get cleanEngagementSwimmerIdentityCorrection() { return backendContext.cleanEngagementSwimmerIdentityCorrection; },
      set cleanEngagementSwimmerIdentityCorrection(value) { backendContext.cleanEngagementSwimmerIdentityCorrection = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementSwimmerIdentitySnapshot() { return backendContext.engagementSwimmerIdentitySnapshot; },
      set engagementSwimmerIdentitySnapshot(value) { backendContext.engagementSwimmerIdentitySnapshot = value; },
      get getEngagementSwimmerCorrectionTarget() { return backendContext.getEngagementSwimmerCorrectionTarget; },
      set getEngagementSwimmerCorrectionTarget(value) { backendContext.getEngagementSwimmerCorrectionTarget = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/portal-performance-handlers/merge-engagement-national-club-swimmer").createPerformanceHandlers_mergeEngagementNationalClubSwimmer({
      get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
      set ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_BASE_COLLECTION() { return backendContext.PERFORMANCE_BASE_COLLECTION; },
      set PERFORMANCE_BASE_COLLECTION(value) { backendContext.PERFORMANCE_BASE_COLLECTION = value; },
      get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
      set PERFORMANCE_SWIMMER_PAGES_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION = value; },
      get activePerformanceRowsForNationalSwimmer() { return backendContext.activePerformanceRowsForNationalSwimmer; },
      set activePerformanceRowsForNationalSwimmer(value) { backendContext.activePerformanceRowsForNationalSwimmer = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deleteEngagementClubRosterSwimmer() { return backendContext.deleteEngagementClubRosterSwimmer; },
      set deleteEngagementClubRosterSwimmer(value) { backendContext.deleteEngagementClubRosterSwimmer = value; },
      get deleteEngagementEntryTimeCache() { return backendContext.deleteEngagementEntryTimeCache; },
      set deleteEngagementEntryTimeCache(value) { backendContext.deleteEngagementEntryTimeCache = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementNationalSwimmerEntrySnapshot() { return backendContext.engagementNationalSwimmerEntrySnapshot; },
      set engagementNationalSwimmerEntrySnapshot(value) { backendContext.engagementNationalSwimmerEntrySnapshot = value; },
      get engagementNationalSwimmerFullName() { return backendContext.engagementNationalSwimmerFullName; },
      set engagementNationalSwimmerFullName(value) { backendContext.engagementNationalSwimmerFullName = value; },
      get engagementNationalSwimmerItemFromDoc() { return backendContext.engagementNationalSwimmerItemFromDoc; },
      set engagementNationalSwimmerItemFromDoc(value) { backendContext.engagementNationalSwimmerItemFromDoc = value; },
      get engagementSwimmerLicenseNumberId() { return backendContext.engagementSwimmerLicenseNumberId; },
      set engagementSwimmerLicenseNumberId(value) { backendContext.engagementSwimmerLicenseNumberId = value; },
      get engagementSwimmerLicensePayload() { return backendContext.engagementSwimmerLicensePayload; },
      set engagementSwimmerLicensePayload(value) { backendContext.engagementSwimmerLicensePayload = value; },
      get getEngagementNationalSwimmerForMerge() { return backendContext.getEngagementNationalSwimmerForMerge; },
      set getEngagementNationalSwimmerForMerge(value) { backendContext.getEngagementNationalSwimmerForMerge = value; },
      get mergeEngagementClubEntryRelays() { return backendContext.mergeEngagementClubEntryRelays; },
      set mergeEngagementClubEntryRelays(value) { backendContext.mergeEngagementClubEntryRelays = value; },
      get mergeEngagementClubEntrySwimmers() { return backendContext.mergeEngagementClubEntrySwimmers; },
      set mergeEngagementClubEntrySwimmers(value) { backendContext.mergeEngagementClubEntrySwimmers = value; },
      get performanceBaseDocId() { return backendContext.performanceBaseDocId; },
      set performanceBaseDocId(value) { backendContext.performanceBaseDocId = value; },
      get performanceMergeTargetPayloadFromSwimmer() { return backendContext.performanceMergeTargetPayloadFromSwimmer; },
      set performanceMergeTargetPayloadFromSwimmer(value) { backendContext.performanceMergeTargetPayloadFromSwimmer = value; },
      get performancePublicKey() { return backendContext.performancePublicKey; },
      set performancePublicKey(value) { backendContext.performancePublicKey = value; },
      get performanceSwimmerPageId() { return backendContext.performanceSwimmerPageId; },
      set performanceSwimmerPageId(value) { backendContext.performanceSwimmerPageId = value; },
      get publicPerformanceBaseRow() { return backendContext.publicPerformanceBaseRow; },
      set publicPerformanceBaseRow(value) { backendContext.publicPerformanceBaseRow = value; },
      get publishEngagementNationalSwimmerMerge() { return backendContext.publishEngagementNationalSwimmerMerge; },
      set publishEngagementNationalSwimmerMerge(value) { backendContext.publishEngagementNationalSwimmerMerge = value; },
      get readPerformanceDocsForNationalSwimmerMerge() { return backendContext.readPerformanceDocsForNationalSwimmerMerge; },
      set readPerformanceDocsForNationalSwimmerMerge(value) { backendContext.readPerformanceDocsForNationalSwimmerMerge = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get swimmerMergeIds() { return backendContext.swimmerMergeIds; },
      set swimmerMergeIds(value) { backendContext.swimmerMergeIds = value; },
      get upsertEngagementClubRosterSwimmer() { return backendContext.upsertEngagementClubRosterSwimmer; },
      set upsertEngagementClubRosterSwimmer(value) { backendContext.upsertEngagementClubRosterSwimmer = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; },
      get writePerformanceSwimmerIndexRows() { return backendContext.writePerformanceSwimmerIndexRows; },
      set writePerformanceSwimmerIndexRows(value) { backendContext.writePerformanceSwimmerIndexRows = value; },
      get writePerformanceSwimmerPageRows() { return backendContext.writePerformanceSwimmerPageRows; },
      set writePerformanceSwimmerPageRows(value) { backendContext.writePerformanceSwimmerPageRows = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/portal-performance-handlers/preview-competition-import").createPerformanceHandlers_previewCompetitionImport({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get activeCompetitionImportData() { return backendContext.activeCompetitionImportData; },
      set activeCompetitionImportData(value) { backendContext.activeCompetitionImportData = value; },
      get assertCapability() { return backendContext.assertCapability; },
      set assertCapability(value) { backendContext.assertCapability = value; },
      get authorizeNativePerformance() { return backendContext.authorizeNativePerformance; },
      set authorizeNativePerformance(value) { backendContext.authorizeNativePerformance = value; },
      get canResumeImportPublication() { return backendContext.canResumeImportPublication; },
      set canResumeImportPublication(value) { backendContext.canResumeImportPublication = value; },
      get competitionImportExistingSummary() { return backendContext.competitionImportExistingSummary; },
      set competitionImportExistingSummary(value) { backendContext.competitionImportExistingSummary = value; },
      get competitionImportPreviewPerformance() { return backendContext.competitionImportPreviewPerformance; },
      set competitionImportPreviewPerformance(value) { backendContext.competitionImportPreviewPerformance = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get detectRecordAlerts() { return backendContext.detectRecordAlerts; },
      set detectRecordAlerts(value) { backendContext.detectRecordAlerts = value; },
      get findExistingCompetitionImport() { return backendContext.findExistingCompetitionImport; },
      set findExistingCompetitionImport(value) { backendContext.findExistingCompetitionImport = value; },
      get importDocumentId() { return backendContext.importDocumentId; },
      set importDocumentId(value) { backendContext.importDocumentId = value; },
      get importPublicationStatus() { return backendContext.importPublicationStatus; },
      set importPublicationStatus(value) { backendContext.importPublicationStatus = value; },
      get loadPerformanceRecordsData() { return backendContext.loadPerformanceRecordsData; },
      set loadPerformanceRecordsData(value) { backendContext.loadPerformanceRecordsData = value; },
      get nativePerformanceFailure() { return backendContext.nativePerformanceFailure; },
      set nativePerformanceFailure(value) { backendContext.nativePerformanceFailure = value; },
      get parseCompetitionImportPayload() { return backendContext.parseCompetitionImportPayload; },
      set parseCompetitionImportPayload(value) { backendContext.parseCompetitionImportPayload = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/portal-performance-handlers/create-competition-import").createPerformanceHandlers_createCompetitionImport({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get assertCapability() { return backendContext.assertCapability; },
      set assertCapability(value) { backendContext.assertCapability = value; },
      get authorizeNativePerformance() { return backendContext.authorizeNativePerformance; },
      set authorizeNativePerformance(value) { backendContext.authorizeNativePerformance = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get cleanTimingType() { return backendContext.cleanTimingType; },
      set cleanTimingType(value) { backendContext.cleanTimingType = value; },
      get competitionImportIdentity() { return backendContext.competitionImportIdentity; },
      set competitionImportIdentity(value) { backendContext.competitionImportIdentity = value; },
      get competitionImportPerformanceId() { return backendContext.competitionImportPerformanceId; },
      set competitionImportPerformanceId(value) { backendContext.competitionImportPerformanceId = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get detectRecordAlerts() { return backendContext.detectRecordAlerts; },
      set detectRecordAlerts(value) { backendContext.detectRecordAlerts = value; },
      get importDocumentId() { return backendContext.importDocumentId; },
      set importDocumentId(value) { backendContext.importDocumentId = value; },
      get loadPerformanceRecordsData() { return backendContext.loadPerformanceRecordsData; },
      set loadPerformanceRecordsData(value) { backendContext.loadPerformanceRecordsData = value; },
      get nativePerformanceFailure() { return backendContext.nativePerformanceFailure; },
      set nativePerformanceFailure(value) { backendContext.nativePerformanceFailure = value; },
      get normalizeLivePalmesImportPerformances() { return backendContext.normalizeLivePalmesImportPerformances; },
      set normalizeLivePalmesImportPerformances(value) { backendContext.normalizeLivePalmesImportPerformances = value; },
      get parseCompetitionImportPayload() { return backendContext.parseCompetitionImportPayload; },
      set parseCompetitionImportPayload(value) { backendContext.parseCompetitionImportPayload = value; },
      get publishCompetitionImportOutputs() { return backendContext.publishCompetitionImportOutputs; },
      set publishCompetitionImportOutputs(value) { backendContext.publishCompetitionImportOutputs = value; },
      get reactivateEngagementClubRosterSwimmersFromPerformanceRows() { return backendContext.reactivateEngagementClubRosterSwimmersFromPerformanceRows; },
      set reactivateEngagementClubRosterSwimmersFromPerformanceRows(value) { backendContext.reactivateEngagementClubRosterSwimmersFromPerformanceRows = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get stageCompetitionImportReplacement() { return backendContext.stageCompetitionImportReplacement; },
      set stageCompetitionImportReplacement(value) { backendContext.stageCompetitionImportReplacement = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writePerformanceBaseRows() { return backendContext.writePerformanceBaseRows; },
      set writePerformanceBaseRows(value) { backendContext.writePerformanceBaseRows = value; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/portal-performance-handlers/list-competition-imports").createPerformanceHandlers_listCompetitionImports({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get assertCapability() { return backendContext.assertCapability; },
      set assertCapability(value) { backendContext.assertCapability = value; },
      get authorizeNativePerformance() { return backendContext.authorizeNativePerformance; },
      set authorizeNativePerformance(value) { backendContext.authorizeNativePerformance = value; },
      get canResumeImportPublication() { return backendContext.canResumeImportPublication; },
      set canResumeImportPublication(value) { backendContext.canResumeImportPublication = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get importPublicationStatus() { return backendContext.importPublicationStatus; },
      set importPublicationStatus(value) { backendContext.importPublicationStatus = value; },
      get isAlreadyPublishedRecordAlert() { return backendContext.isAlreadyPublishedRecordAlert; },
      set isAlreadyPublishedRecordAlert(value) { backendContext.isAlreadyPublishedRecordAlert = value; },
      get nativePerformanceFailure() { return backendContext.nativePerformanceFailure; },
      set nativePerformanceFailure(value) { backendContext.nativePerformanceFailure = value; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/portal-performance-handlers/get-dtn-seasons").createPerformanceHandlers_getDtnSeasons({
      get invokeDtnSeason() { return backendContext.invokeDtnSeason; },
      set invokeDtnSeason(value) { backendContext.invokeDtnSeason = value; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/portal-performance-handlers/update-dtn-season").createPerformanceHandlers_updateDtnSeason({
      get invokeDtnSeason() { return backendContext.invokeDtnSeason; },
      set invokeDtnSeason(value) { backendContext.invokeDtnSeason = value; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/portal-performance-handlers/get-dtn-season-overview").createPerformanceHandlers_getDtnSeasonOverview({
      get invokeDtnSeason() { return backendContext.invokeDtnSeason; },
      set invokeDtnSeason(value) { backendContext.invokeDtnSeason = value; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/portal-performance-handlers/list-dtn-season-sources").createPerformanceHandlers_listDtnSeasonSources({
      get invokeDtnSeason() { return backendContext.invokeDtnSeason; },
      set invokeDtnSeason(value) { backendContext.invokeDtnSeason = value; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/portal-performance-handlers/get-nap-performance-administration").createPerformanceHandlers_getNapPerformanceAdministration({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get authorizeNativePerformance() { return backendContext.authorizeNativePerformance; },
      set authorizeNativePerformance(value) { backendContext.authorizeNativePerformance = value; },
      get nativePerformanceFailure() { return backendContext.nativePerformanceFailure; },
      set nativePerformanceFailure(value) { backendContext.nativePerformanceFailure = value; },
      get readNapRecordsAdministration() { return backendContext.readNapRecordsAdministration; },
      set readNapRecordsAdministration(value) { backendContext.readNapRecordsAdministration = value; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/portal-performance-handlers/save-performance-correction").createPerformanceHandlers_savePerformanceCorrection({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get accessUserDisplayName() { return backendContext.accessUserDisplayName; },
      set accessUserDisplayName(value) { backendContext.accessUserDisplayName = value; },
      get assertCapability() { return backendContext.assertCapability; },
      set assertCapability(value) { backendContext.assertCapability = value; },
      get authorizeNativePerformance() { return backendContext.authorizeNativePerformance; },
      set authorizeNativePerformance(value) { backendContext.authorizeNativePerformance = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get enqueuePerformancePublicationJob() { return backendContext.enqueuePerformancePublicationJob; },
      set enqueuePerformancePublicationJob(value) { backendContext.enqueuePerformancePublicationJob = value; },
      get nativePerformanceFailure() { return backendContext.nativePerformanceFailure; },
      set nativePerformanceFailure(value) { backendContext.nativePerformanceFailure = value; },
      get publishNativeRecords() { return backendContext.publishNativeRecords; },
      set publishNativeRecords(value) { backendContext.publishNativeRecords = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache12;
  }
  return {
    storeCompetitionPdf: operation0().storeCompetitionPdf,
    deleteCompetitionPdf: operation1().deleteCompetitionPdf,
    updateEngagementNationalSwimmerIdentity: operation2().updateEngagementNationalSwimmerIdentity,
    mergeEngagementNationalClubSwimmer: operation3().mergeEngagementNationalClubSwimmer,
    previewCompetitionImport: operation4().previewCompetitionImport,
    createCompetitionImport: operation5().createCompetitionImport,
    listCompetitionImports: operation6().listCompetitionImports,
    getDtnSeasons: operation7().getDtnSeasons,
    updateDtnSeason: operation8().updateDtnSeason,
    getDtnSeasonOverview: operation9().getDtnSeasonOverview,
    listDtnSeasonSources: operation10().listDtnSeasonSources,
    getNapPerformanceAdministration: operation11().getNapPerformanceAdministration,
    savePerformanceCorrection: operation12().savePerformanceCorrection
  };
}

module.exports = { createPerformanceHandlers };
