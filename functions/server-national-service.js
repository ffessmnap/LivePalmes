// Compatibility factory; operation modules hold the existing bodies.
function createNationalService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-national-service/import-swimmer-creation").createNationalService_importSwimmerCreation({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get authorizeNativePerformance() { return backendContext.authorizeNativePerformance; },
      set authorizeNativePerformance(value) { backendContext.authorizeNativePerformance = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementNewSwimmerAlertFromMatch() { return backendContext.engagementNewSwimmerAlertFromMatch; },
      set engagementNewSwimmerAlertFromMatch(value) { backendContext.engagementNewSwimmerAlertFromMatch = value; },
      get nativePerformanceFailure() { return backendContext.nativePerformanceFailure; },
      set nativePerformanceFailure(value) { backendContext.nativePerformanceFailure = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-national-service/national-swimmer-search-matches").createNationalService_nationalSwimmerSearchMatches({
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementSwimmerLicenseNumberKey() { return backendContext.engagementSwimmerLicenseNumberKey; },
      set engagementSwimmerLicenseNumberKey(value) { backendContext.engagementSwimmerLicenseNumberKey = value; },
      get normalizePerformanceSearchText() { return backendContext.normalizePerformanceSearchText; },
      set normalizePerformanceSearchText(value) { backendContext.normalizePerformanceSearchText = value; },
      get local$engagementNationalSwimmerItemFromDoc() { return operation14().engagementNationalSwimmerItemFromDoc; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-national-service/engagement-license-control-season").createNationalService_engagementLicenseControlSeason({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-national-service/engagement-license-control-person").createNationalService_engagementLicenseControlPerson({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementMailRecipientIndexStateRef() { return backendContext.engagementMailRecipientIndexStateRef; },
      set engagementMailRecipientIndexStateRef(value) { backendContext.engagementMailRecipientIndexStateRef = value; },
      get engagementMailRecipientsFromIndex() { return backendContext.engagementMailRecipientsFromIndex; },
      set engagementMailRecipientsFromIndex(value) { backendContext.engagementMailRecipientsFromIndex = value; },
      get engagementMailSmtpConfig() { return backendContext.engagementMailSmtpConfig; },
      set engagementMailSmtpConfig(value) { backendContext.engagementMailSmtpConfig = value; },
      get livePalmesMailHtml() { return backendContext.livePalmesMailHtml; },
      set livePalmesMailHtml(value) { backendContext.livePalmesMailHtml = value; },
      get nodemailer() { return backendContext.nodemailer; },
      set nodemailer(value) { backendContext.nodemailer = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-national-service/engagement-swimmer-identity-snapshot").createNationalService_engagementSwimmerIdentitySnapshot({
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-national-service/clean-engagement-swimmer-identity-correction").createNationalService_cleanEngagementSwimmerIdentityCorrection({
      get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
      set ENGAGEMENT_SWIMMER_LICENSE_PATTERN(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementSwimmerIdentityKey() { return backendContext.engagementSwimmerIdentityKey; },
      set engagementSwimmerIdentityKey(value) { backendContext.engagementSwimmerIdentityKey = value; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-national-service/find-engagement-swimmer-correction-license").createNationalService_findEngagementSwimmerCorrectionLicense({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get aggregateSwimmerIndexRows() { return backendContext.aggregateSwimmerIndexRows; },
      set aggregateSwimmerIndexRows(value) { backendContext.aggregateSwimmerIndexRows = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubSwimmerItem() { return backendContext.engagementClubSwimmerItem; },
      set engagementClubSwimmerItem(value) { backendContext.engagementClubSwimmerItem = value; },
      get engagementNewSwimmerItem() { return backendContext.engagementNewSwimmerItem; },
      set engagementNewSwimmerItem(value) { backendContext.engagementNewSwimmerItem = value; },
      get engagementReferenceSwimmerItem() { return backendContext.engagementReferenceSwimmerItem; },
      set engagementReferenceSwimmerItem(value) { backendContext.engagementReferenceSwimmerItem = value; },
      get engagementSwimmerLicenseId() { return backendContext.engagementSwimmerLicenseId; },
      set engagementSwimmerLicenseId(value) { backendContext.engagementSwimmerLicenseId = value; },
      get engagementSwimmerLicenseItem() { return backendContext.engagementSwimmerLicenseItem; },
      set engagementSwimmerLicenseItem(value) { backendContext.engagementSwimmerLicenseItem = value; },
      get findReferenceSwimmerCorrectionTarget() { return backendContext.findReferenceSwimmerCorrectionTarget; },
      set findReferenceSwimmerCorrectionTarget(value) { backendContext.findReferenceSwimmerCorrectionTarget = value; },
      get getPerformanceBaseRowsBySwimmer() { return backendContext.getPerformanceBaseRowsBySwimmer; },
      set getPerformanceBaseRowsBySwimmer(value) { backendContext.getPerformanceBaseRowsBySwimmer = value; },
      get intranapSwimmersIndex() { return backendContext.intranapSwimmersIndex; },
      set intranapSwimmersIndex(value) { backendContext.intranapSwimmersIndex = value; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-national-service/apply-engagement-swimmer-identity-correction").createNationalService_applyEngagementSwimmerIdentityCorrection({
      get ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE() { return backendContext.ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE; },
      set ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE(value) { backendContext.ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE = value; },
      get ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS() { return backendContext.ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS; },
      set ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS(value) { backendContext.ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS = value; },
      get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
      set ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION = value; },
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
      set PERFORMANCE_SWIMMER_PAGES_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION = value; },
      get assertNoEngagementSwimmerLicenseConflict() { return backendContext.assertNoEngagementSwimmerLicenseConflict; },
      set assertNoEngagementSwimmerLicenseConflict(value) { backendContext.assertNoEngagementSwimmerLicenseConflict = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get currentEngagementCategoryFromBirthDate() { return backendContext.currentEngagementCategoryFromBirthDate; },
      set currentEngagementCategoryFromBirthDate(value) { backendContext.currentEngagementCategoryFromBirthDate = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deleteEngagementClubRosterSwimmer() { return backendContext.deleteEngagementClubRosterSwimmer; },
      set deleteEngagementClubRosterSwimmer(value) { backendContext.deleteEngagementClubRosterSwimmer = value; },
      get engagementClubSwimmerItem() { return backendContext.engagementClubSwimmerItem; },
      set engagementClubSwimmerItem(value) { backendContext.engagementClubSwimmerItem = value; },
      get engagementSwimmerLicenseId() { return backendContext.engagementSwimmerLicenseId; },
      set engagementSwimmerLicenseId(value) { backendContext.engagementSwimmerLicenseId = value; },
      get engagementSwimmerLicenseNumberId() { return backendContext.engagementSwimmerLicenseNumberId; },
      set engagementSwimmerLicenseNumberId(value) { backendContext.engagementSwimmerLicenseNumberId = value; },
      get engagementSwimmerLicenseNumberKey() { return backendContext.engagementSwimmerLicenseNumberKey; },
      set engagementSwimmerLicenseNumberKey(value) { backendContext.engagementSwimmerLicenseNumberKey = value; },
      get engagementSwimmerLicensePayload() { return backendContext.engagementSwimmerLicensePayload; },
      set engagementSwimmerLicensePayload(value) { backendContext.engagementSwimmerLicensePayload = value; },
      get getPerformanceBaseRowsBySwimmer() { return backendContext.getPerformanceBaseRowsBySwimmer; },
      set getPerformanceBaseRowsBySwimmer(value) { backendContext.getPerformanceBaseRowsBySwimmer = value; },
      get invalidateEngagementEntryTimeCachesForPerformanceRows() { return backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows; },
      set invalidateEngagementEntryTimeCachesForPerformanceRows(value) { backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows = value; },
      get performanceSwimmerIndexDocId() { return backendContext.performanceSwimmerIndexDocId; },
      set performanceSwimmerIndexDocId(value) { backendContext.performanceSwimmerIndexDocId = value; },
      get performanceSwimmerPageId() { return backendContext.performanceSwimmerPageId; },
      set performanceSwimmerPageId(value) { backendContext.performanceSwimmerPageId = value; },
      get publicSwimmerKey() { return backendContext.publicSwimmerKey; },
      set publicSwimmerKey(value) { backendContext.publicSwimmerKey = value; },
      get rebuildPublicPerformanceFilesForAffectedRows() { return backendContext.rebuildPublicPerformanceFilesForAffectedRows; },
      set rebuildPublicPerformanceFilesForAffectedRows(value) { backendContext.rebuildPublicPerformanceFilesForAffectedRows = value; },
      get rebuildPublicTopFilesForAffectedRows() { return backendContext.rebuildPublicTopFilesForAffectedRows; },
      set rebuildPublicTopFilesForAffectedRows(value) { backendContext.rebuildPublicTopFilesForAffectedRows = value; },
      get replacePublicSwimmerIdentity() { return backendContext.replacePublicSwimmerIdentity; },
      set replacePublicSwimmerIdentity(value) { backendContext.replacePublicSwimmerIdentity = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get upsertEngagementClubRosterSwimmer() { return backendContext.upsertEngagementClubRosterSwimmer; },
      set upsertEngagementClubRosterSwimmer(value) { backendContext.upsertEngagementClubRosterSwimmer = value; },
      get writePerformanceBaseRows() { return backendContext.writePerformanceBaseRows; },
      set writePerformanceBaseRows(value) { backendContext.writePerformanceBaseRows = value; },
      get writePerformanceSwimmerIndexRows() { return backendContext.writePerformanceSwimmerIndexRows; },
      set writePerformanceSwimmerIndexRows(value) { backendContext.writePerformanceSwimmerIndexRows = value; },
      get writePerformanceSwimmerPageRows() { return backendContext.writePerformanceSwimmerPageRows; },
      set writePerformanceSwimmerPageRows(value) { backendContext.writePerformanceSwimmerPageRows = value; },
      get local$engagementSwimmerIdentitySnapshot() { return operation4().engagementSwimmerIdentitySnapshot; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-national-service/set-engagement-swimmer-change-request-roster-state").createNationalService_setEngagementSwimmerChangeRequestRosterState({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get upsertEngagementClubRosterSwimmer() { return backendContext.upsertEngagementClubRosterSwimmer; },
      set upsertEngagementClubRosterSwimmer(value) { backendContext.upsertEngagementClubRosterSwimmer = value; },
      get local$engagementSwimmerIdentitySnapshot() { return operation4().engagementSwimmerIdentitySnapshot; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-national-service/engagement-swimmer-change-request-item").createNationalService_engagementSwimmerChangeRequestItem({
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$engagementSwimmerIdentitySnapshot() { return operation4().engagementSwimmerIdentitySnapshot; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-national-service/send-engagement-swimmer-change-resolution-notification").createNationalService_sendEngagementSwimmerChangeResolutionNotification({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementMailSmtpConfig() { return backendContext.engagementMailSmtpConfig; },
      set engagementMailSmtpConfig(value) { backendContext.engagementMailSmtpConfig = value; },
      get engagementSwimmerChangeResolutionMail() { return backendContext.engagementSwimmerChangeResolutionMail; },
      set engagementSwimmerChangeResolutionMail(value) { backendContext.engagementSwimmerChangeResolutionMail = value; },
      get livePalmesMailHtml() { return backendContext.livePalmesMailHtml; },
      set livePalmesMailHtml(value) { backendContext.livePalmesMailHtml = value; },
      get nodemailer() { return backendContext.nodemailer; },
      set nodemailer(value) { backendContext.nodemailer = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-national-service/engagement-national-administration-pending-counts").createNationalService_engagementNationalAdministrationPendingCounts({
      get ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION() { return backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION; },
      set ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION(value) { backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-national-service/delete-engagement-club-swimmer-permanently").createNationalService_deleteEngagementClubSwimmerPermanently({
      get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
      set ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deleteEngagementClubRosterSwimmer() { return backendContext.deleteEngagementClubRosterSwimmer; },
      set deleteEngagementClubRosterSwimmer(value) { backendContext.deleteEngagementClubRosterSwimmer = value; },
      get engagementSwimmerLicenseNumberId() { return backendContext.engagementSwimmerLicenseNumberId; },
      set engagementSwimmerLicenseNumberId(value) { backendContext.engagementSwimmerLicenseNumberId = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/server-national-service/engagement-national-swimmer-collection-for-source").createNationalService_engagementNationalSwimmerCollectionForSource({
      get ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS() { return backendContext.ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS; },
      set ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS(value) { backendContext.ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubSwimmerItem() { return backendContext.engagementClubSwimmerItem; },
      set engagementClubSwimmerItem(value) { backendContext.engagementClubSwimmerItem = value; },
      get performanceSwimmerIndexDocId() { return backendContext.performanceSwimmerIndexDocId; },
      set performanceSwimmerIndexDocId(value) { backendContext.performanceSwimmerIndexDocId = value; },
      get recoveredPerformanceRowsAreComplete() { return backendContext.recoveredPerformanceRowsAreComplete; },
      set recoveredPerformanceRowsAreComplete(value) { backendContext.recoveredPerformanceRowsAreComplete = value; },
      get writePerformanceSwimmerIndexRows() { return backendContext.writePerformanceSwimmerIndexRows; },
      set writePerformanceSwimmerIndexRows(value) { backendContext.writePerformanceSwimmerIndexRows = value; },
      get writePerformanceSwimmerPageRows() { return backendContext.writePerformanceSwimmerPageRows; },
      set writePerformanceSwimmerPageRows(value) { backendContext.writePerformanceSwimmerPageRows = value; },
      get local$engagementNationalSwimmerItemFromDoc() { return operation14().engagementNationalSwimmerItemFromDoc; },
      get local$getEngagementSwimmerCorrectionTarget() { return operation6().getEngagementSwimmerCorrectionTarget; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/server-national-service/engagement-national-swimmer-item-from-doc").createNationalService_engagementNationalSwimmerItemFromDoc({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubSwimmerItem() { return backendContext.engagementClubSwimmerItem; },
      set engagementClubSwimmerItem(value) { backendContext.engagementClubSwimmerItem = value; },
      get engagementNewSwimmerItem() { return backendContext.engagementNewSwimmerItem; },
      set engagementNewSwimmerItem(value) { backendContext.engagementNewSwimmerItem = value; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/server-national-service/engagement-national-swimmer-full-name").createNationalService_engagementNationalSwimmerFullName({

    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/server-national-service/engagement-national-swimmer-entry-snapshot").createNationalService_engagementNationalSwimmerEntrySnapshot({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_BASE_COLLECTION() { return backendContext.PERFORMANCE_BASE_COLLECTION; },
      set PERFORMANCE_BASE_COLLECTION(value) { backendContext.PERFORMANCE_BASE_COLLECTION = value; },
      get cleanEngagementEntryIndividualEntries() { return backendContext.cleanEngagementEntryIndividualEntries; },
      set cleanEngagementEntryIndividualEntries(value) { backendContext.cleanEngagementEntryIndividualEntries = value; },
      get cleanEngagementEntrySwimmer() { return backendContext.cleanEngagementEntrySwimmer; },
      set cleanEngagementEntrySwimmer(value) { backendContext.cleanEngagementEntrySwimmer = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementSwimmerIdentityKey() { return backendContext.engagementSwimmerIdentityKey; },
      set engagementSwimmerIdentityKey(value) { backendContext.engagementSwimmerIdentityKey = value; },
      get getPerformanceBaseRowsBySwimmer() { return backendContext.getPerformanceBaseRowsBySwimmer; },
      set getPerformanceBaseRowsBySwimmer(value) { backendContext.getPerformanceBaseRowsBySwimmer = value; },
      get normalizeCategoryCode() { return backendContext.normalizeCategoryCode; },
      set normalizeCategoryCode(value) { backendContext.normalizeCategoryCode = value; },
      get performanceBaseDocId() { return backendContext.performanceBaseDocId; },
      set performanceBaseDocId(value) { backendContext.performanceBaseDocId = value; },
      get local$engagementNationalSwimmerFullName() { return operation15().engagementNationalSwimmerFullName; }
    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/server-national-service/search-engagement-national-swimmer-merge-target-docs").createNationalService_searchEngagementNationalSwimmerMergeTargetDocs({
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get normalizePerformanceSearchText() { return backendContext.normalizePerformanceSearchText; },
      set normalizePerformanceSearchText(value) { backendContext.normalizePerformanceSearchText = value; },
      get local$engagementNationalSwimmerFullName() { return operation15().engagementNationalSwimmerFullName; }
    });
    return cache17;
  }

  let cache18;
  function operation18() {
    if (!cache18) cache18 = require("./backend/server-national-service/active-performance-rows-for-national-swimmer").createNationalService_activePerformanceRowsForNationalSwimmer({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get deletePublicPerformanceFile() { return backendContext.deletePublicPerformanceFile; },
      set deletePublicPerformanceFile(value) { backendContext.deletePublicPerformanceFile = value; },
      get getPerformanceBaseRowsBySwimmer() { return backendContext.getPerformanceBaseRowsBySwimmer; },
      set getPerformanceBaseRowsBySwimmer(value) { backendContext.getPerformanceBaseRowsBySwimmer = value; },
      get publicPerformanceBaseRow() { return backendContext.publicPerformanceBaseRow; },
      set publicPerformanceBaseRow(value) { backendContext.publicPerformanceBaseRow = value; },
      get publicPerformanceSwimmerFilePath() { return backendContext.publicPerformanceSwimmerFilePath; },
      set publicPerformanceSwimmerFilePath(value) { backendContext.publicPerformanceSwimmerFilePath = value; },
      get publicSwimmerKey() { return backendContext.publicSwimmerKey; },
      set publicSwimmerKey(value) { backendContext.publicSwimmerKey = value; },
      get readPublicPerformanceJson() { return backendContext.readPublicPerformanceJson; },
      set readPublicPerformanceJson(value) { backendContext.readPublicPerformanceJson = value; },
      get rebuildPublicPerformanceFilesForAffectedRows() { return backendContext.rebuildPublicPerformanceFilesForAffectedRows; },
      set rebuildPublicPerformanceFilesForAffectedRows(value) { backendContext.rebuildPublicPerformanceFilesForAffectedRows = value; },
      get rebuildPublicTopFilesForAffectedRows() { return backendContext.rebuildPublicTopFilesForAffectedRows; },
      set rebuildPublicTopFilesForAffectedRows(value) { backendContext.rebuildPublicTopFilesForAffectedRows = value; },
      get removePublicSearchIndexes() { return backendContext.removePublicSearchIndexes; },
      set removePublicSearchIndexes(value) { backendContext.removePublicSearchIndexes = value; },
      get replacePublicSwimmerIdentity() { return backendContext.replacePublicSwimmerIdentity; },
      set replacePublicSwimmerIdentity(value) { backendContext.replacePublicSwimmerIdentity = value; },
      get swimmerMergeIds() { return backendContext.swimmerMergeIds; },
      set swimmerMergeIds(value) { backendContext.swimmerMergeIds = value; },
      get uniquePublicPerformanceRows() { return backendContext.uniquePublicPerformanceRows; },
      set uniquePublicPerformanceRows(value) { backendContext.uniquePublicPerformanceRows = value; }
    });
    return cache18;
  }

  let cache19;
  function operation19() {
    if (!cache19) cache19 = require("./backend/server-national-service/engagement-club-person-entry-snapshot").createNationalService_engagementClubPersonEntrySnapshot({
      get cleanEngagementEntryOfficial() { return backendContext.cleanEngagementEntryOfficial; },
      set cleanEngagementEntryOfficial(value) { backendContext.cleanEngagementEntryOfficial = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache19;
  }
  return {
    importSwimmerCreation: operation0().importSwimmerCreation,
    nationalSwimmerSearchMatches: operation1().nationalSwimmerSearchMatches,
    nationalSwimmerSort: operation1().nationalSwimmerSort,
    searchEngagementNationalSwimmerDocs: operation1().searchEngagementNationalSwimmerDocs,
    engagementLicenseControlSeason: operation2().engagementLicenseControlSeason,
    engagementLicenseControlPerson: operation3().engagementLicenseControlPerson,
    engagementLicenseReportRequest: operation3().engagementLicenseReportRequest,
    engagementSwimmerIdentitySnapshot: operation4().engagementSwimmerIdentitySnapshot,
    cleanEngagementSwimmerIdentityCorrection: operation5().cleanEngagementSwimmerIdentityCorrection,
    findPerformanceSwimmerCorrectionTarget: operation6().findPerformanceSwimmerCorrectionTarget,
    findEngagementSwimmerCorrectionLicense: operation6().findEngagementSwimmerCorrectionLicense,
    getEngagementSwimmerCorrectionTarget: operation6().getEngagementSwimmerCorrectionTarget,
    assertNoEngagementSwimmerIdentityConflict: operation7().assertNoEngagementSwimmerIdentityConflict,
    engagementEntrySwimmerCorrectionResult: operation7().engagementEntrySwimmerCorrectionResult,
    engagementEntryRelayCorrectionResult: operation7().engagementEntryRelayCorrectionResult,
    updateEngagementEntriesForSwimmerCorrection: operation7().updateEngagementEntriesForSwimmerCorrection,
    setEngagementSwimmerChangeRequestRosterState: operation8().setEngagementSwimmerChangeRequestRosterState,
    applyEngagementSwimmerIdentityCorrection: operation7().applyEngagementSwimmerIdentityCorrection,
    engagementSwimmerChangeRequestItem: operation9().engagementSwimmerChangeRequestItem,
    sendEngagementSwimmerChangeResolutionNotification: operation10().sendEngagementSwimmerChangeResolutionNotification,
    engagementNationalAdministrationPendingCounts: operation11().engagementNationalAdministrationPendingCounts,
    engagementClubSwimmerDeletionUsage: operation12().engagementClubSwimmerDeletionUsage,
    deleteEngagementClubSwimmerPermanently: operation12().deleteEngagementClubSwimmerPermanently,
    engagementNationalSwimmerCollectionForSource: operation13().engagementNationalSwimmerCollectionForSource,
    engagementNationalSwimmerItemFromDoc: operation14().engagementNationalSwimmerItemFromDoc,
    materializeEngagementNationalPerformanceSwimmerForMerge: operation13().materializeEngagementNationalPerformanceSwimmerForMerge,
    getEngagementNationalSwimmerForMerge: operation13().getEngagementNationalSwimmerForMerge,
    engagementNationalSwimmerFullName: operation15().engagementNationalSwimmerFullName,
    engagementNationalSwimmerEntrySnapshot: operation16().engagementNationalSwimmerEntrySnapshot,
    mergeEngagementEntryIndividualEntries: operation16().mergeEngagementEntryIndividualEntries,
    mergeEngagementClubEntrySwimmers: operation16().mergeEngagementClubEntrySwimmers,
    mergeEngagementClubEntryRelays: operation16().mergeEngagementClubEntryRelays,
    searchEngagementNationalSwimmerMergeTargetDocs: operation17().searchEngagementNationalSwimmerMergeTargetDocs,
    performanceMergeTargetPayloadFromSwimmer: operation16().performanceMergeTargetPayloadFromSwimmer,
    publicPerformanceRowsFromSwimmerPayload: operation18().publicPerformanceRowsFromSwimmerPayload,
    publishEngagementNationalSwimmerMerge: operation18().publishEngagementNationalSwimmerMerge,
    activePerformanceRowsForNationalSwimmer: operation18().activePerformanceRowsForNationalSwimmer,
    readPerformanceDocsForNationalSwimmerMerge: operation16().readPerformanceDocsForNationalSwimmerMerge,
    engagementClubPersonEntrySnapshot: operation19().engagementClubPersonEntrySnapshot,
    engagementClubPersonFullName: operation19().engagementClubPersonFullName,
    mergeEngagementClubEntryOfficials: operation19().mergeEngagementClubEntryOfficials
  };
}

module.exports = { createNationalService };
