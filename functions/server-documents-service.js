// Compatibility factory; operation modules hold the existing bodies.
function createDocumentsService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-documents-service/clean-engagement-document-metadata").createDocumentsService_cleanEngagementDocumentMetadata({
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-documents-service/clean-engagement-generated-file").createDocumentsService_cleanEngagementGeneratedFile({
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$cleanEngagementDocumentMetadata() { return operation0().cleanEngagementDocumentMetadata; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-documents-service/engagement-club-recap-pdf-source-hash").createDocumentsService_engagementClubRecapPdfSourceHash({
      get ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX() { return backendContext.ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX; },
      set ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX(value) { backendContext.ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get buildEngagementClubRecapPdf() { return backendContext.buildEngagementClubRecapPdf; },
      set buildEngagementClubRecapPdf(value) { backendContext.buildEngagementClubRecapPdf = value; },
      get cleanPublicCalendarWhatsAppUrl() { return backendContext.cleanPublicCalendarWhatsAppUrl; },
      set cleanPublicCalendarWhatsAppUrl(value) { backendContext.cleanPublicCalendarWhatsAppUrl = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementCompetitionDetailItem() { return backendContext.engagementCompetitionDetailItem; },
      set engagementCompetitionDetailItem(value) { backendContext.engagementCompetitionDetailItem = value; },
      get engagementPdfFileName() { return backendContext.engagementPdfFileName; },
      set engagementPdfFileName(value) { backendContext.engagementPdfFileName = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; },
      get local$cleanEngagementDocumentMetadata() { return operation0().cleanEngagementDocumentMetadata; },
      get local$deleteEngagementCompetitionEntrySummary() { return operation11().deleteEngagementCompetitionEntrySummary; },
      get local$engagementCompetitionEntrySummaryItem() { return operation8().engagementCompetitionEntrySummaryItem; },
      get local$engagementCompetitionEntrySummaryRef() { return operation4().engagementCompetitionEntrySummaryRef; },
      get local$readStoredEngagementClubRecapPdf() { return operation12().readStoredEngagementClubRecapPdf; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-documents-service/engagement-competition-entry-summary-id").createDocumentsService_engagementCompetitionEntrySummaryId({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-documents-service/engagement-competition-entry-summary-ref").createDocumentsService_engagementCompetitionEntrySummaryRef({
      get ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION() { return backendContext.ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION; },
      set ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION(value) { backendContext.ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION = value; },
      get local$engagementCompetitionEntrySummaryId() { return operation3().engagementCompetitionEntrySummaryId; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-documents-service/engagement-competition-statistics-cache-ref").createDocumentsService_engagementCompetitionStatisticsCacheRef({
      get ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION() { return backendContext.ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION; },
      set ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION(value) { backendContext.ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION = value; },
      get local$engagementCompetitionEntrySummaryId() { return operation3().engagementCompetitionEntrySummaryId; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-documents-service/invalidate-engagement-competition-statistics").createDocumentsService_invalidateEngagementCompetitionStatistics({
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubCompetitionIndexKey() { return backendContext.engagementClubCompetitionIndexKey; },
      set engagementClubCompetitionIndexKey(value) { backendContext.engagementClubCompetitionIndexKey = value; },
      get engagementClubCompetitionIndexRef() { return backendContext.engagementClubCompetitionIndexRef; },
      set engagementClubCompetitionIndexRef(value) { backendContext.engagementClubCompetitionIndexRef = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get local$engagementCompetitionEntrySummaryItem() { return operation8().engagementCompetitionEntrySummaryItem; },
      get local$engagementCompetitionEntrySummaryRef() { return operation4().engagementCompetitionEntrySummaryRef; },
      get local$engagementCompetitionStatisticsCacheRef() { return operation5().engagementCompetitionStatisticsCacheRef; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-documents-service/decode-engagement-competition-statistics-cache").createDocumentsService_decodeEngagementCompetitionStatisticsCache({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get zlib() { return backendContext.zlib; },
      set zlib(value) { backendContext.zlib = value; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-documents-service/engagement-competition-entry-summary-item").createDocumentsService_engagementCompetitionEntrySummaryItem({
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubCode() { return backendContext.engagementClubCode; },
      set engagementClubCode(value) { backendContext.engagementClubCode = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubName() { return backendContext.engagementClubName; },
      set engagementClubName(value) { backendContext.engagementClubName = value; },
      get engagementPdfEntryStats() { return backendContext.engagementPdfEntryStats; },
      set engagementPdfEntryStats(value) { backendContext.engagementPdfEntryStats = value; },
      get local$cleanEngagementDocumentMetadata() { return operation0().cleanEngagementDocumentMetadata; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-documents-service/engagement-competition-entry-summaries-from-data").createDocumentsService_engagementCompetitionEntrySummariesFromData({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get local$engagementCompetitionEntrySummaryItem() { return operation8().engagementCompetitionEntrySummaryItem; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-documents-service/delete-engagement-club-competition-index-entry").createDocumentsService_deleteEngagementClubCompetitionIndexEntry({
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubCompetitionIndexKey() { return backendContext.engagementClubCompetitionIndexKey; },
      set engagementClubCompetitionIndexKey(value) { backendContext.engagementClubCompetitionIndexKey = value; },
      get engagementClubCompetitionIndexRef() { return backendContext.engagementClubCompetitionIndexRef; },
      set engagementClubCompetitionIndexRef(value) { backendContext.engagementClubCompetitionIndexRef = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get local$engagementCompetitionEntrySummariesFromData() { return operation9().engagementCompetitionEntrySummariesFromData; },
      get local$engagementCompetitionEntrySummaryItem() { return operation8().engagementCompetitionEntrySummaryItem; },
      get local$engagementCompetitionEntrySummaryRef() { return operation4().engagementCompetitionEntrySummaryRef; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-documents-service/delete-engagement-competition-entry-summary").createDocumentsService_deleteEngagementCompetitionEntrySummary({
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$engagementCompetitionEntrySummaryRef() { return operation4().engagementCompetitionEntrySummaryRef; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-documents-service/read-stored-engagement-club-recap-pdf").createDocumentsService_readStoredEngagementClubRecapPdf({
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/server-documents-service/engagement-officials-pdf-source-hash").createDocumentsService_engagementOfficialsPdfSourceHash({
      get ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX() { return backendContext.ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX; },
      set ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX(value) { backendContext.ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX = value; },
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get buildEngagementOfficialsPdf() { return backendContext.buildEngagementOfficialsPdf; },
      set buildEngagementOfficialsPdf(value) { backendContext.buildEngagementOfficialsPdf = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementCompetitionDetailItem() { return backendContext.engagementCompetitionDetailItem; },
      set engagementCompetitionDetailItem(value) { backendContext.engagementCompetitionDetailItem = value; },
      get engagementPdfFileName() { return backendContext.engagementPdfFileName; },
      set engagementPdfFileName(value) { backendContext.engagementPdfFileName = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; },
      get local$cleanEngagementDocumentMetadata() { return operation0().cleanEngagementDocumentMetadata; },
      get local$engagementOfficialsPdfRows() { return operation14().engagementOfficialsPdfRows; },
      get local$readStoredEngagementClubRecapPdf() { return operation12().readStoredEngagementClubRecapPdf; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/server-documents-service/engagement-officials-pdf-rows").createDocumentsService_engagementOfficialsPdfRows({
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubCode() { return backendContext.engagementClubCode; },
      set engagementClubCode(value) { backendContext.engagementClubCode = value; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/server-documents-service/engagement-txt-download-url").createDocumentsService_engagementTxtDownloadUrl({
      get ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX() { return backendContext.ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX; },
      set ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX(value) { backendContext.ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementClubsByIds() { return backendContext.engagementClubsByIds; },
      set engagementClubsByIds(value) { backendContext.engagementClubsByIds = value; },
      get engagementCompetitionDetailItem() { return backendContext.engagementCompetitionDetailItem; },
      set engagementCompetitionDetailItem(value) { backendContext.engagementCompetitionDetailItem = value; },
      get engagementPdfFileName() { return backendContext.engagementPdfFileName; },
      set engagementPdfFileName(value) { backendContext.engagementPdfFileName = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; },
      get local$buildEngagementCompetitionTxt() { return operation16().buildEngagementCompetitionTxt; },
      get local$cleanEngagementDocumentMetadata() { return operation0().cleanEngagementDocumentMetadata; },
      get local$cleanEngagementGeneratedFile() { return operation1().cleanEngagementGeneratedFile; },
      get local$cleanEngagementGeneratedFiles() { return operation1().cleanEngagementGeneratedFiles; }
    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/server-documents-service/build-engagement-competition-txt").createDocumentsService_buildEngagementCompetitionTxt({
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get buildWinPalmeCompetitionTxt() { return backendContext.buildWinPalmeCompetitionTxt; },
      set buildWinPalmeCompetitionTxt(value) { backendContext.buildWinPalmeCompetitionTxt = value; },
      get engagementPdfFileName() { return backendContext.engagementPdfFileName; },
      set engagementPdfFileName(value) { backendContext.engagementPdfFileName = value; }
    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/server-documents-service/engagement-mail-status-label").createDocumentsService_engagementMailStatusLabel({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache17;
  }

  let cache18;
  function operation18() {
    if (!cache18) cache18 = require("./backend/server-documents-service/engagement-mail-secret-value").createDocumentsService_engagementMailSecretValue({
      get LIVEPALMES_MAIL_FROM() { return backendContext.LIVEPALMES_MAIL_FROM; },
      set LIVEPALMES_MAIL_FROM(value) { backendContext.LIVEPALMES_MAIL_FROM = value; },
      get LIVEPALMES_SMTP_HOST() { return backendContext.LIVEPALMES_SMTP_HOST; },
      set LIVEPALMES_SMTP_HOST(value) { backendContext.LIVEPALMES_SMTP_HOST = value; },
      get LIVEPALMES_SMTP_PASS() { return backendContext.LIVEPALMES_SMTP_PASS; },
      set LIVEPALMES_SMTP_PASS(value) { backendContext.LIVEPALMES_SMTP_PASS = value; },
      get LIVEPALMES_SMTP_PORT() { return backendContext.LIVEPALMES_SMTP_PORT; },
      set LIVEPALMES_SMTP_PORT(value) { backendContext.LIVEPALMES_SMTP_PORT = value; },
      get LIVEPALMES_SMTP_SECURE() { return backendContext.LIVEPALMES_SMTP_SECURE; },
      set LIVEPALMES_SMTP_SECURE(value) { backendContext.LIVEPALMES_SMTP_SECURE = value; },
      get LIVEPALMES_SMTP_USER() { return backendContext.LIVEPALMES_SMTP_USER; },
      set LIVEPALMES_SMTP_USER(value) { backendContext.LIVEPALMES_SMTP_USER = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; }
    });
    return cache18;
  }

  let cache19;
  function operation19() {
    if (!cache19) cache19 = require("./backend/server-documents-service/engagement-mail-prepared-status").createDocumentsService_engagementMailPreparedStatus({
      get local$engagementMailSmtpConfig() { return operation18().engagementMailSmtpConfig; }
    });
    return cache19;
  }
  return {
    cleanEngagementDocumentMetadata: operation0().cleanEngagementDocumentMetadata,
    cleanEngagementGeneratedFile: operation1().cleanEngagementGeneratedFile,
    cleanEngagementGeneratedFiles: operation1().cleanEngagementGeneratedFiles,
    engagementCompetitionDocumentsMetadata: operation1().engagementCompetitionDocumentsMetadata,
    engagementClubRecapPdfStoragePath: operation2().engagementClubRecapPdfStoragePath,
    engagementClubRecapPdfSourceHash: operation2().engagementClubRecapPdfSourceHash,
    engagementCompetitionEntrySummaryId: operation3().engagementCompetitionEntrySummaryId,
    engagementCompetitionEntrySummaryRef: operation4().engagementCompetitionEntrySummaryRef,
    engagementCompetitionStatisticsCacheRef: operation5().engagementCompetitionStatisticsCacheRef,
    invalidateEngagementCompetitionStatistics: operation6().invalidateEngagementCompetitionStatistics,
    decodeEngagementCompetitionStatisticsCache: operation7().decodeEngagementCompetitionStatisticsCache,
    encodeEngagementCompetitionStatisticsCache: operation7().encodeEngagementCompetitionStatisticsCache,
    engagementCompetitionEntrySummaryItem: operation8().engagementCompetitionEntrySummaryItem,
    engagementCompetitionEntrySummariesFromData: operation9().engagementCompetitionEntrySummariesFromData,
    rebuildEngagementCompetitionEntrySummary: operation10().rebuildEngagementCompetitionEntrySummary,
    upsertEngagementCompetitionEntrySummary: operation2().upsertEngagementCompetitionEntrySummary,
    deleteEngagementCompetitionEntrySummary: operation11().deleteEngagementCompetitionEntrySummary,
    upsertEngagementClubCompetitionIndex: operation10().upsertEngagementClubCompetitionIndex,
    deleteEngagementClubCompetitionIndexEntry: operation10().deleteEngagementClubCompetitionIndexEntry,
    syncEngagementCompetitionEntrySummaryFromChange: operation6().syncEngagementCompetitionEntrySummaryFromChange,
    readStoredEngagementClubRecapPdf: operation12().readStoredEngagementClubRecapPdf,
    saveEngagementClubRecapPdfDocument: operation2().saveEngagementClubRecapPdfDocument,
    getOrCreateEngagementClubRecapPdf: operation2().getOrCreateEngagementClubRecapPdf,
    engagementOfficialsPdfStoragePath: operation13().engagementOfficialsPdfStoragePath,
    engagementOfficialsPdfRows: operation14().engagementOfficialsPdfRows,
    resolveEngagementOfficialsPdfRows: operation13().resolveEngagementOfficialsPdfRows,
    engagementOfficialsPdfSourceHash: operation13().engagementOfficialsPdfSourceHash,
    saveEngagementOfficialsPdfDocument: operation13().saveEngagementOfficialsPdfDocument,
    getOrCreateEngagementOfficialsPdf: operation13().getOrCreateEngagementOfficialsPdf,
    engagementTxtStoragePath: operation15().engagementTxtStoragePath,
    engagementTxtDownloadUrl: operation15().engagementTxtDownloadUrl,
    engagementTxtSourceHash: operation15().engagementTxtSourceHash,
    engagementTxtSwimmerCategory: operation16().engagementTxtSwimmerCategory,
    buildEngagementCompetitionTxt: operation16().buildEngagementCompetitionTxt,
    readStoredEngagementTxt: operation15().readStoredEngagementTxt,
    getOrCreateEngagementCompetitionTxt: operation15().getOrCreateEngagementCompetitionTxt,
    engagementMailStatusLabel: operation17().engagementMailStatusLabel,
    engagementMailSecretValue: operation18().engagementMailSecretValue,
    engagementMailSmtpConfig: operation18().engagementMailSmtpConfig,
    engagementMailPreparedStatus: operation19().engagementMailPreparedStatus
  };
}

module.exports = { createDocumentsService };
