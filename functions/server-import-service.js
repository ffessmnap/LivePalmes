// Compatibility factory; operation modules hold the existing bodies.
function createImportService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-import-service/active-competition-import-data").createImportService_activeCompetitionImportData({
      get POOL_COURSES() { return backendContext.POOL_COURSES; },
      set POOL_COURSES(value) { backendContext.POOL_COURSES = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get local$ageCategoryFromDates() { return operation5().ageCategoryFromDates; },
      get local$categoryCodeFromCategory() { return operation7().categoryCodeFromCategory; },
      get local$fallbackCategoryFromSource() { return operation7().fallbackCategoryFromSource; },
      get local$formatTimeValue() { return operation2().formatTimeValue; },
      get local$isYouthCategory() { return operation9().isYouthCategory; },
      get local$normalizeCategoryCode() { return operation4().normalizeCategoryCode; },
      get local$normalizeCourseCode() { return operation3().normalizeCourseCode; },
      get local$recordReferenceForPerformance() { return operation9().recordReferenceForPerformance; },
      get local$recordReferenceMap() { return operation9().recordReferenceMap; },
      get local$sameRecordAlertSwimmer() { return operation11().sameRecordAlertSwimmer; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-import-service/parse-time-value").createImportService_parseTimeValue({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-import-service/format-time-value").createImportService_formatTimeValue({

    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-import-service/normalize-course-code").createImportService_normalizeCourseCode({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-import-service/normalize-category-code").createImportService_normalizeCategoryCode({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-import-service/age-category-from-dates").createImportService_ageCategoryFromDates({
      get local$importSeasonYear() { return operation16().importSeasonYear; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-import-service/performance-category-from-row").createImportService_performanceCategoryFromRow({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$ageCategoryFromDates() { return operation5().ageCategoryFromDates; },
      get local$fallbackCategoryFromSource() { return operation7().fallbackCategoryFromSource; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-import-service/category-code-from-category").createImportService_categoryCodeFromCategory({
      get local$normalizeCategoryCode() { return operation4().normalizeCategoryCode; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-import-service/load-performance-records-data").createImportService_loadPerformanceRecordsData({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-import-service/is-youth-category").createImportService_isYouthCategory({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$normalizeCategoryCode() { return operation4().normalizeCategoryCode; },
      get local$normalizeCourseCode() { return operation3().normalizeCourseCode; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-import-service/engagement-relay-reference-course-code").createImportService_engagementRelayReferenceCourseCode({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$normalizeCourseCode() { return operation3().normalizeCourseCode; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-import-service/normalized-record-alert-name").createImportService_normalizedRecordAlertName({
      get normalizeIdentityText() { return backendContext.normalizeIdentityText; },
      set normalizeIdentityText(value) { backendContext.normalizeIdentityText = value; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-import-service/is-already-published-record-alert").createImportService_isAlreadyPublishedRecordAlert({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$sameRecordAlertSwimmer() { return operation11().sameRecordAlertSwimmer; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/server-import-service/resolve-intranap-swimmer").createImportService_resolveIntranapSwimmer({
      get swimmerIdentityKey() { return backendContext.swimmerIdentityKey; },
      set swimmerIdentityKey(value) { backendContext.swimmerIdentityKey = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get intranapSwimmerLookup() { return backendContext.intranapSwimmerLookup; },
      set intranapSwimmerLookup(value) { backendContext.intranapSwimmerLookup = value; },
      get local$normalizeCategoryCode() { return operation4().normalizeCategoryCode; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/server-import-service/competition-import-existing-summary").createImportService_competitionImportExistingSummary({
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get competitionImportIdentity() { return backendContext.competitionImportIdentity; },
      set competitionImportIdentity(value) { backendContext.competitionImportIdentity = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get importPublicationStatus() { return backendContext.importPublicationStatus; },
      set importPublicationStatus(value) { backendContext.importPublicationStatus = value; },
      get sameCompetitionImport() { return backendContext.sameCompetitionImport; },
      set sameCompetitionImport(value) { backendContext.sameCompetitionImport = value; },
      get local$activeCompetitionImportData() { return operation0().activeCompetitionImportData; },
      get local$normalizeCategoryCode() { return operation4().normalizeCategoryCode; },
      get local$resolveIntranapSwimmer() { return operation13().resolveIntranapSwimmer; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/server-import-service/course-payload").createImportService_coursePayload({
      get courseLengthFromCode() { return backendContext.courseLengthFromCode; },
      set courseLengthFromCode(value) { backendContext.courseLengthFromCode = value; },
      get courseStyleFromCode() { return backendContext.courseStyleFromCode; },
      set courseStyleFromCode(value) { backendContext.courseStyleFromCode = value; },
      get COURSE_META() { return backendContext.COURSE_META; },
      set COURSE_META(value) { backendContext.COURSE_META = value; }
    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/server-import-service/import-season-year").createImportService_importSeasonYear({

    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/server-import-service/current-engagement-season-info").createImportService_currentEngagementSeasonInfo({

    });
    return cache17;
  }

  let cache18;
  function operation18() {
    if (!cache18) cache18 = require("./backend/server-import-service/clean-engagement-license-season-status").createImportService_cleanEngagementLicenseSeasonStatus({
      get ENGAGEMENT_LICENSE_SEASON_STATUSES() { return backendContext.ENGAGEMENT_LICENSE_SEASON_STATUSES; },
      set ENGAGEMENT_LICENSE_SEASON_STATUSES(value) { backendContext.ENGAGEMENT_LICENSE_SEASON_STATUSES = value; },
      get ENGAGEMENT_LICENSE_VERIFICATION_STATUSES() { return backendContext.ENGAGEMENT_LICENSE_VERIFICATION_STATUSES; },
      set ENGAGEMENT_LICENSE_VERIFICATION_STATUSES(value) { backendContext.ENGAGEMENT_LICENSE_VERIFICATION_STATUSES = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$currentEngagementSeasonInfo() { return operation17().currentEngagementSeasonInfo; }
    });
    return cache18;
  }

  let cache19;
  function operation19() {
    if (!cache19) cache19 = require("./backend/server-import-service/engagement-season-end-year-from-iso-date").createImportService_engagementSeasonEndYearFromIsoDate({
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get local$currentEngagementSeasonInfo() { return operation17().currentEngagementSeasonInfo; },
      get local$importSeasonYear() { return operation16().importSeasonYear; }
    });
    return cache19;
  }

  let cache20;
  function operation20() {
    if (!cache20) cache20 = require("./backend/server-import-service/engagement-season-bounds-from-end-year").createImportService_engagementSeasonBoundsFromEndYear({
      get local$currentEngagementSeasonInfo() { return operation17().currentEngagementSeasonInfo; }
    });
    return cache20;
  }

  let cache21;
  function operation21() {
    if (!cache21) cache21 = require("./backend/server-import-service/current-engagement-category-from-birth-date").createImportService_currentEngagementCategoryFromBirthDate({
      get local$ageCategoryFromDates() { return operation5().ageCategoryFromDates; }
    });
    return cache21;
  }

  let cache22;
  function operation22() {
    if (!cache22) cache22 = require("./backend/server-import-service/assert-pin-attempt-allowed").createImportService_assertPinAttemptAllowed({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache22;
  }

  let cache23;
  function operation23() {
    if (!cache23) cache23 = require("./backend/server-import-service/role-uid").createImportService_roleUid({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; }
    });
    return cache23;
  }

  let cache24;
  function operation24() {
    if (!cache24) cache24 = require("./backend/server-import-service/live-data-ref").createImportService_liveDataRef({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache24;
  }

  let cache25;
  function operation25() {
    if (!cache25) cache25 = require("./backend/server-import-service/role-pins-ref").createImportService_rolePinsRef({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache25;
  }

  let cache26;
  function operation26() {
    if (!cache26) cache26 = require("./backend/server-import-service/console-grant-ref").createImportService_consoleGrantRef({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache26;
  }
  return {
    normalizeImportToken: operation0().normalizeImportToken,
    parseTimeValue: operation1().parseTimeValue,
    formatTimeValue: operation2().formatTimeValue,
    normalizeCourseCode: operation3().normalizeCourseCode,
    normalizeCategoryCode: operation4().normalizeCategoryCode,
    competitionYear: operation5().competitionYear,
    birthYear: operation5().birthYear,
    ageCategoryFromDates: operation5().ageCategoryFromDates,
    performanceCategoryFromRow: operation6().performanceCategoryFromRow,
    fallbackCategoryFromSource: operation7().fallbackCategoryFromSource,
    importPerformanceCategory: operation0().importPerformanceCategory,
    loadPerformanceRecordsData: operation8().loadPerformanceRecordsData,
    recordReferenceRows: operation9().recordReferenceRows,
    recordReferenceKey: operation9().recordReferenceKey,
    recordReferenceMap: operation9().recordReferenceMap,
    recordReferenceForPerformance: operation9().recordReferenceForPerformance,
    engagementRelayReferenceCourseCode: operation10().engagementRelayReferenceCourseCode,
    engagementRelayReferenceRows: operation10().engagementRelayReferenceRows,
    engagementRelayReferenceKey: operation10().engagementRelayReferenceKey,
    engagementRelayReferenceMap: operation10().engagementRelayReferenceMap,
    engagementRelayReferenceForEntry: operation10().engagementRelayReferenceForEntry,
    isYouthCategory: operation9().isYouthCategory,
    normalizedRecordAlertName: operation11().normalizedRecordAlertName,
    sameRecordAlertSwimmer: operation11().sameRecordAlertSwimmer,
    isAlreadyPublishedRecordAlert: operation12().isAlreadyPublishedRecordAlert,
    buildRecordAlert: operation0().buildRecordAlert,
    detectRecordAlerts: operation0().detectRecordAlerts,
    resolveIntranapSwimmer: operation13().resolveIntranapSwimmer,
    competitionImportPreviewPerformance: operation14().competitionImportPreviewPerformance,
    categoryCodeFromCategory: operation7().categoryCodeFromCategory,
    coursePayload: operation15().coursePayload,
    importSeasonYear: operation16().importSeasonYear,
    currentEngagementSeasonInfo: operation17().currentEngagementSeasonInfo,
    cleanEngagementLicenseVerificationStatus: operation18().cleanEngagementLicenseVerificationStatus,
    cleanEngagementLicenseSeasonStatus: operation18().cleanEngagementLicenseSeasonStatus,
    engagementLicenseSeasonState: operation18().engagementLicenseSeasonState,
    engagementSeasonEndYearFromIsoDate: operation19().engagementSeasonEndYearFromIsoDate,
    engagementSeasonBoundsFromEndYear: operation20().engagementSeasonBoundsFromEndYear,
    currentEngagementCategoryFromBirthDate: operation21().currentEngagementCategoryFromBirthDate,
    importDocumentId: operation0().importDocumentId,
    activeCompetitionImportData: operation0().activeCompetitionImportData,
    competitionImportExistingSummary: operation14().competitionImportExistingSummary,
    findExistingCompetitionImport: operation14().findExistingCompetitionImport,
    safeCompareHex: operation22().safeCompareHex,
    roleUid: operation23().roleUid,
    liveDataRef: operation24().liveDataRef,
    rolePinsRef: operation25().rolePinsRef,
    pinAttemptRef: operation22().pinAttemptRef,
    consoleGrantRef: operation26().consoleGrantRef,
    lockRemainingSeconds: operation22().lockRemainingSeconds,
    lockMessage: operation22().lockMessage,
    assertPinAttemptAllowed: operation22().assertPinAttemptAllowed
  };
}

module.exports = { createImportService };
