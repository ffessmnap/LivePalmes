// Compatibility factory; operation modules hold the existing bodies.
function createEntryModelService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-entry-model-service/clean-engagement-team-leader").createEntryModelService_cleanEngagementTeamLeader({
      get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
      set ENGAGEMENT_SWIMMER_LICENSE_PATTERN(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-entry-model-service/engagement-team-leader-complete").createEntryModelService_engagementTeamLeaderComplete({

    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-entry-model-service/clean-engagement-entry-official").createEntryModelService_cleanEngagementEntryOfficial({
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-entry-model-service/parse-engagement-entry-time").createEntryModelService_parseEngagementEntryTime({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get formatTimeValue() { return backendContext.formatTimeValue; },
      set formatTimeValue(value) { backendContext.formatTimeValue = value; },
      get parseTimeValue() { return backendContext.parseTimeValue; },
      set parseTimeValue(value) { backendContext.parseTimeValue = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-entry-model-service/clean-engagement-entry-individual-entries").createEntryModelService_cleanEngagementEntryIndividualEntries({
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-entry-model-service/clean-engagement-entry-swimmer").createEntryModelService_cleanEngagementEntrySwimmer({
      get cleanEngagementLicenseSeasonStatus() { return backendContext.cleanEngagementLicenseSeasonStatus; },
      set cleanEngagementLicenseSeasonStatus(value) { backendContext.cleanEngagementLicenseSeasonStatus = value; },
      get cleanEngagementLicenseVerificationStatus() { return backendContext.cleanEngagementLicenseVerificationStatus; },
      set cleanEngagementLicenseVerificationStatus(value) { backendContext.cleanEngagementLicenseVerificationStatus = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementLicenseSeasonState() { return backendContext.engagementLicenseSeasonState; },
      set engagementLicenseSeasonState(value) { backendContext.engagementLicenseSeasonState = value; },
      get local$cleanEngagementEntryIndividualEntries() { return operation4().cleanEngagementEntryIndividualEntries; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-entry-model-service/assert-engagement-relay-members").createEntryModelService_assertEngagementRelayMembers({
      get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
      set ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES(value) { backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = value; },
      get ENGAGEMENT_PROGRAM_GENDER_MODES() { return backendContext.ENGAGEMENT_PROGRAM_GENDER_MODES; },
      set ENGAGEMENT_PROGRAM_GENDER_MODES(value) { backendContext.ENGAGEMENT_PROGRAM_GENDER_MODES = value; },
      get ENGAGEMENT_RELAY_AGE_CATEGORY_RANK() { return backendContext.ENGAGEMENT_RELAY_AGE_CATEGORY_RANK; },
      set ENGAGEMENT_RELAY_AGE_CATEGORY_RANK(value) { backendContext.ENGAGEMENT_RELAY_AGE_CATEGORY_RANK = value; },
      get ENGAGEMENT_RELAY_CATEGORY_CODES() { return backendContext.ENGAGEMENT_RELAY_CATEGORY_CODES; },
      set ENGAGEMENT_RELAY_CATEGORY_CODES(value) { backendContext.ENGAGEMENT_RELAY_CATEGORY_CODES = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get birthYear() { return backendContext.birthYear; },
      set birthYear(value) { backendContext.birthYear = value; },
      get cleanEngagementCompetitionType() { return backendContext.cleanEngagementCompetitionType; },
      set cleanEngagementCompetitionType(value) { backendContext.cleanEngagementCompetitionType = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get competitionYear() { return backendContext.competitionYear; },
      set competitionYear(value) { backendContext.competitionYear = value; },
      get engagementRelayReferenceForEntry() { return backendContext.engagementRelayReferenceForEntry; },
      set engagementRelayReferenceForEntry(value) { backendContext.engagementRelayReferenceForEntry = value; },
      get engagementRelayReferenceMap() { return backendContext.engagementRelayReferenceMap; },
      set engagementRelayReferenceMap(value) { backendContext.engagementRelayReferenceMap = value; },
      get formatTimeValue() { return backendContext.formatTimeValue; },
      set formatTimeValue(value) { backendContext.formatTimeValue = value; },
      get importSeasonYear() { return backendContext.importSeasonYear; },
      set importSeasonYear(value) { backendContext.importSeasonYear = value; },
      get normalizeCategoryCode() { return backendContext.normalizeCategoryCode; },
      set normalizeCategoryCode(value) { backendContext.normalizeCategoryCode = value; },
      get normalizeCourseCode() { return backendContext.normalizeCourseCode; },
      set normalizeCourseCode(value) { backendContext.normalizeCourseCode = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get local$engagementCompetitionAppliesToFranceRecords() { return operation17().engagementCompetitionAppliesToFranceRecords; },
      get local$engagementCompetitionAppliesToMpf() { return operation17().engagementCompetitionAppliesToMpf; },
      get local$parseEngagementEntryTime() { return operation3().parseEngagementEntryTime; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-entry-model-service/qualification-relays-after-individual-change").createEntryModelService_qualificationRelaysAfterIndividualChange({
      get qualificationEngine() { return backendContext.qualificationEngine; },
      set qualificationEngine(value) { backendContext.qualificationEngine = value; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-entry-model-service/qualification-events").createEntryModelService_qualificationEvents({
      get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
      set ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES(value) { backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = value; },
      get cleanEngagementCompetitionEvents() { return backendContext.cleanEngagementCompetitionEvents; },
      set cleanEngagementCompetitionEvents(value) { backendContext.cleanEngagementCompetitionEvents = value; },
      get engagementCategoryCodesForEvent() { return backendContext.engagementCategoryCodesForEvent; },
      set engagementCategoryCodesForEvent(value) { backendContext.engagementCategoryCodesForEvent = value; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-entry-model-service/automatic-engagement-individual-entry").createEntryModelService_automaticEngagementIndividualEntry({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
      set PERFORMANCE_SWIMMER_PAGES_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get assertEngagementClubWriteOpen() { return backendContext.assertEngagementClubWriteOpen; },
      set assertEngagementClubWriteOpen(value) { backendContext.assertEngagementClubWriteOpen = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get createQualificationService() { return backendContext.createQualificationService; },
      set createQualificationService(value) { backendContext.createQualificationService = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get formatTimeValue() { return backendContext.formatTimeValue; },
      set formatTimeValue(value) { backendContext.formatTimeValue = value; },
      get legacyQualificationService() { return backendContext.legacyQualificationService; },
      set legacyQualificationService(value) { backendContext.legacyQualificationService = value; },
      get performanceSwimmerPageId() { return backendContext.performanceSwimmerPageId; },
      set performanceSwimmerPageId(value) { backendContext.performanceSwimmerPageId = value; },
      get publicBetterPerformance() { return backendContext.publicBetterPerformance; },
      set publicBetterPerformance(value) { backendContext.publicBetterPerformance = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get local$cleanEngagementEntryIndividualEntries() { return operation4().cleanEngagementEntryIndividualEntries; },
      get local$engagementEntryTimeCacheId() { return operation14().engagementEntryTimeCacheId; },
      get local$engagementEntryTimeCacheRef() { return operation12().engagementEntryTimeCacheRef; },
      get local$engagementEntryTimeCacheRow() { return operation12().engagementEntryTimeCacheRow; },
      get local$engagementEntryTimeCacheRowsFromData() { return operation12().engagementEntryTimeCacheRowsFromData; },
      get local$engagementEntryTimeRowsToEvents() { return operation12().engagementEntryTimeRowsToEvents; },
      get local$engagementQualificationRowAllowed() { return operation12().engagementQualificationRowAllowed; },
      get local$getEngagementEntryTimeRowsForSwimmer() { return operation12().getEngagementEntryTimeRowsForSwimmer; },
      get local$qualificationEvents() { return operation8().qualificationEvents; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-entry-model-service/native-qualification-services").createEntryModelService_nativeQualificationServices({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get armNativeCompetitionNotification() { return backendContext.armNativeCompetitionNotification; },
      set armNativeCompetitionNotification(value) { backendContext.armNativeCompetitionNotification = value; },
      get assertCanModifyEngagementEvent() { return backendContext.assertCanModifyEngagementEvent; },
      set assertCanModifyEngagementEvent(value) { backendContext.assertCanModifyEngagementEvent = value; },
      get assertEngagementClubWriteOpen() { return backendContext.assertEngagementClubWriteOpen; },
      set assertEngagementClubWriteOpen(value) { backendContext.assertEngagementClubWriteOpen = value; },
      get cleanEngagementCompetitionEvents() { return backendContext.cleanEngagementCompetitionEvents; },
      set cleanEngagementCompetitionEvents(value) { backendContext.cleanEngagementCompetitionEvents = value; },
      get cleanEngagementProgramSessions() { return backendContext.cleanEngagementProgramSessions; },
      set cleanEngagementProgramSessions(value) { backendContext.cleanEngagementProgramSessions = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; },
      get local$automaticEngagementIndividualEntry() { return operation9().automaticEngagementIndividualEntry; },
      get local$qualificationEvents() { return operation8().qualificationEvents; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-entry-model-service/native-qualification-error").createEntryModelService_nativeQualificationError({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-entry-model-service/engagement-entry-time-cache-ref").createEntryModelService_engagementEntryTimeCacheRef({
      get ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION() { return backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION; },
      set ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION(value) { backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION = value; },
      get ENGAGEMENT_ENTRY_TIME_CACHE_VERSION() { return backendContext.ENGAGEMENT_ENTRY_TIME_CACHE_VERSION; },
      set ENGAGEMENT_ENTRY_TIME_CACHE_VERSION(value) { backendContext.ENGAGEMENT_ENTRY_TIME_CACHE_VERSION = value; },
      get ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT() { return backendContext.ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT; },
      set ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT(value) { backendContext.ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementEntryTimeCacheBuilds() { return backendContext.engagementEntryTimeCacheBuilds; },
      set engagementEntryTimeCacheBuilds(value) { backendContext.engagementEntryTimeCacheBuilds = value; },
      get hydratePublicSwimmerRowsFromPayload() { return backendContext.hydratePublicSwimmerRowsFromPayload; },
      set hydratePublicSwimmerRowsFromPayload(value) { backendContext.hydratePublicSwimmerRowsFromPayload = value; },
      get normalizeCourseCode() { return backendContext.normalizeCourseCode; },
      set normalizeCourseCode(value) { backendContext.normalizeCourseCode = value; },
      get publicPerformanceBaseRow() { return backendContext.publicPerformanceBaseRow; },
      set publicPerformanceBaseRow(value) { backendContext.publicPerformanceBaseRow = value; },
      get publicPerformanceSwimmerFilePath() { return backendContext.publicPerformanceSwimmerFilePath; },
      set publicPerformanceSwimmerFilePath(value) { backendContext.publicPerformanceSwimmerFilePath = value; },
      get readPublicPerformanceJson() { return backendContext.readPublicPerformanceJson; },
      set readPublicPerformanceJson(value) { backendContext.readPublicPerformanceJson = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get local$engagementEntryTimeCacheId() { return operation14().engagementEntryTimeCacheId; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/server-entry-model-service/engagement-known-time-history").createEntryModelService_engagementKnownTimeHistory({
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get formatTimeValue() { return backendContext.formatTimeValue; },
      set formatTimeValue(value) { backendContext.formatTimeValue = value; },
      get local$engagementQualificationRowAllowed() { return operation12().engagementQualificationRowAllowed; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/server-entry-model-service/engagement-entry-time-cache-id").createEntryModelService_engagementEntryTimeCacheId({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/server-entry-model-service/delete-engagement-entry-time-cache").createEntryModelService_deleteEngagementEntryTimeCache({
      get ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION() { return backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION; },
      set ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION(value) { backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION = value; },
      get local$engagementEntryTimeCacheId() { return operation14().engagementEntryTimeCacheId; }
    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/server-entry-model-service/invalidate-engagement-entry-time-caches-for-performance-rows").createEntryModelService_invalidateEngagementEntryTimeCachesForPerformanceRows({
      get ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION() { return backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION; },
      set ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION(value) { backendContext.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get performanceSwimmerIndexKey() { return backendContext.performanceSwimmerIndexKey; },
      set performanceSwimmerIndexKey(value) { backendContext.performanceSwimmerIndexKey = value; },
      get local$engagementEntryTimeCacheId() { return operation14().engagementEntryTimeCacheId; }
    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/server-entry-model-service/engagement-competition-applies-to-france-records").createEntryModelService_engagementCompetitionAppliesToFranceRecords({
      get cleanEngagementPoolLength() { return backendContext.cleanEngagementPoolLength; },
      set cleanEngagementPoolLength(value) { backendContext.cleanEngagementPoolLength = value; },
      get cleanEngagementTimingType() { return backendContext.cleanEngagementTimingType; },
      set cleanEngagementTimingType(value) { backendContext.cleanEngagementTimingType = value; }
    });
    return cache17;
  }

  let cache18;
  function operation18() {
    if (!cache18) cache18 = require("./backend/server-entry-model-service/engagement-entry-time-warning").createEntryModelService_engagementEntryTimeWarning({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get POOL_COURSES() { return backendContext.POOL_COURSES; },
      set POOL_COURSES(value) { backendContext.POOL_COURSES = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get formatTimeValue() { return backendContext.formatTimeValue; },
      set formatTimeValue(value) { backendContext.formatTimeValue = value; },
      get isYouthCategory() { return backendContext.isYouthCategory; },
      set isYouthCategory(value) { backendContext.isYouthCategory = value; },
      get normalizeCategoryCode() { return backendContext.normalizeCategoryCode; },
      set normalizeCategoryCode(value) { backendContext.normalizeCategoryCode = value; },
      get normalizeCourseCode() { return backendContext.normalizeCourseCode; },
      set normalizeCourseCode(value) { backendContext.normalizeCourseCode = value; },
      get recordReferenceForPerformance() { return backendContext.recordReferenceForPerformance; },
      set recordReferenceForPerformance(value) { backendContext.recordReferenceForPerformance = value; },
      get recordReferenceMap() { return backendContext.recordReferenceMap; },
      set recordReferenceMap(value) { backendContext.recordReferenceMap = value; },
      get local$engagementCompetitionAppliesToFranceRecords() { return operation17().engagementCompetitionAppliesToFranceRecords; },
      get local$engagementCompetitionAppliesToMpf() { return operation17().engagementCompetitionAppliesToMpf; }
    });
    return cache18;
  }

  let cache19;
  function operation19() {
    if (!cache19) cache19 = require("./backend/server-entry-model-service/resolve-engagement-individual-entries-for-swimmer").createEntryModelService_resolveEngagementIndividualEntriesForSwimmer({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get qualificationEngine() { return backendContext.qualificationEngine; },
      set qualificationEngine(value) { backendContext.qualificationEngine = value; },
      get local$automaticEngagementIndividualEntry() { return operation9().automaticEngagementIndividualEntry; },
      get local$cleanEngagementEntryIndividualEntries() { return operation4().cleanEngagementEntryIndividualEntries; },
      get local$getEngagementEntryTimeRowsForSwimmer() { return operation12().getEngagementEntryTimeRowsForSwimmer; },
      get local$getEngagementQualificationRows() { return operation9().getEngagementQualificationRows; },
      get local$parseEngagementEntryTime() { return operation3().parseEngagementEntryTime; },
      get local$qualificationService() { return operation9().qualificationService; }
    });
    return cache19;
  }

  let cache20;
  function operation20() {
    if (!cache20) cache20 = require("./backend/server-entry-model-service/engagement-swimmer-identity-key").createEntryModelService_engagementSwimmerIdentityKey({
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get normalizePerformanceSearchText() { return backendContext.normalizePerformanceSearchText; },
      set normalizePerformanceSearchText(value) { backendContext.normalizePerformanceSearchText = value; }
    });
    return cache20;
  }

  let cache21;
  function operation21() {
    if (!cache21) cache21 = require("./backend/server-entry-model-service/clean-engagement-new-swimmer").createEntryModelService_cleanEngagementNewSwimmer({
      get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
      set ENGAGEMENT_SWIMMER_LICENSE_PATTERN(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get currentEngagementSeasonInfo() { return backendContext.currentEngagementSeasonInfo; },
      set currentEngagementSeasonInfo(value) { backendContext.currentEngagementSeasonInfo = value; },
      get local$engagementSwimmerIdentityKey() { return operation20().engagementSwimmerIdentityKey; }
    });
    return cache21;
  }

  let cache22;
  function operation22() {
    if (!cache22) cache22 = require("./backend/server-entry-model-service/engagement-new-swimmer-item").createEntryModelService_engagementNewSwimmerItem({
      get cleanEngagementLicenseVerificationStatus() { return backendContext.cleanEngagementLicenseVerificationStatus; },
      set cleanEngagementLicenseVerificationStatus(value) { backendContext.cleanEngagementLicenseVerificationStatus = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get currentEngagementCategoryFromBirthDate() { return backendContext.currentEngagementCategoryFromBirthDate; },
      set currentEngagementCategoryFromBirthDate(value) { backendContext.currentEngagementCategoryFromBirthDate = value; },
      get engagementLicenseSeasonState() { return backendContext.engagementLicenseSeasonState; },
      set engagementLicenseSeasonState(value) { backendContext.engagementLicenseSeasonState = value; }
    });
    return cache22;
  }

  let cache23;
  function operation23() {
    if (!cache23) cache23 = require("./backend/server-entry-model-service/build-engagement-new-swimmer-alerts").createEntryModelService_buildEngagementNewSwimmerAlerts({
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubSwimmerItem() { return backendContext.engagementClubSwimmerItem; },
      set engagementClubSwimmerItem(value) { backendContext.engagementClubSwimmerItem = value; },
      get intranapSwimmersIndex() { return backendContext.intranapSwimmersIndex; },
      set intranapSwimmersIndex(value) { backendContext.intranapSwimmersIndex = value; },
      get performanceSearchTokens() { return backendContext.performanceSearchTokens; },
      set performanceSearchTokens(value) { backendContext.performanceSearchTokens = value; },
      get local$engagementNewSwimmerItem() { return operation22().engagementNewSwimmerItem; },
      get local$engagementSwimmerIdentityKey() { return operation20().engagementSwimmerIdentityKey; }
    });
    return cache23;
  }

  let cache24;
  function operation24() {
    if (!cache24) cache24 = require("./backend/server-entry-model-service/engagement-swimmer-license-id").createEntryModelService_engagementSwimmerLicenseId({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache24;
  }

  let cache25;
  function operation25() {
    if (!cache25) cache25 = require("./backend/server-entry-model-service/engagement-swimmer-license-number-key").createEntryModelService_engagementSwimmerLicenseNumberKey({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache25;
  }

  let cache26;
  function operation26() {
    if (!cache26) cache26 = require("./backend/server-entry-model-service/engagement-swimmer-license-number-id").createEntryModelService_engagementSwimmerLicenseNumberId({
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get local$engagementSwimmerLicenseNumberKey() { return operation25().engagementSwimmerLicenseNumberKey; }
    });
    return cache26;
  }

  let cache27;
  function operation27() {
    if (!cache27) cache27 = require("./backend/server-entry-model-service/engagement-club-roster-id").createEntryModelService_engagementClubRosterId({
      get ENGAGEMENT_CLUB_ROSTERS_COLLECTION() { return backendContext.ENGAGEMENT_CLUB_ROSTERS_COLLECTION; },
      set ENGAGEMENT_CLUB_ROSTERS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUB_ROSTERS_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache27;
  }

  let cache28;
  function operation28() {
    if (!cache28) cache28 = require("./backend/server-entry-model-service/clean-engagement-club-activity-status").createEntryModelService_cleanEngagementClubActivityStatus({
      get cleanEngagementLicenseSeasonStatus() { return backendContext.cleanEngagementLicenseSeasonStatus; },
      set cleanEngagementLicenseSeasonStatus(value) { backendContext.cleanEngagementLicenseSeasonStatus = value; },
      get cleanEngagementLicenseVerificationStatus() { return backendContext.cleanEngagementLicenseVerificationStatus; },
      set cleanEngagementLicenseVerificationStatus(value) { backendContext.cleanEngagementLicenseVerificationStatus = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementLicenseSeasonState() { return backendContext.engagementLicenseSeasonState; },
      set engagementLicenseSeasonState(value) { backendContext.engagementLicenseSeasonState = value; }
    });
    return cache28;
  }

  let cache29;
  function operation29() {
    if (!cache29) cache29 = require("./backend/server-entry-model-service/engagement-club-roster-swimmer-key").createEntryModelService_engagementClubRosterSwimmerKey({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache29;
  }

  let cache30;
  function operation30() {
    if (!cache30) cache30 = require("./backend/server-entry-model-service/engagement-club-roster-swimmers-from-data").createEntryModelService_engagementClubRosterSwimmersFromData({
      get local$engagementClubRosterSwimmerItem() { return operation28().engagementClubRosterSwimmerItem; }
    });
    return cache30;
  }

  let cache31;
  function operation31() {
    if (!cache31) cache31 = require("./backend/server-entry-model-service/upsert-engagement-club-roster-swimmer").createEntryModelService_upsertEngagementClubRosterSwimmer({
      get local$engagementClubRosterRef() { return operation27().engagementClubRosterRef; },
      get local$engagementClubRosterSwimmerItem() { return operation28().engagementClubRosterSwimmerItem; },
      get local$engagementClubRosterSwimmerKey() { return operation29().engagementClubRosterSwimmerKey; }
    });
    return cache31;
  }

  let cache32;
  function operation32() {
    if (!cache32) cache32 = require("./backend/server-entry-model-service/delete-engagement-club-roster-swimmer").createEntryModelService_deleteEngagementClubRosterSwimmer({
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$engagementClubRosterRef() { return operation27().engagementClubRosterRef; },
      get local$engagementClubRosterSwimmerKey() { return operation29().engagementClubRosterSwimmerKey; }
    });
    return cache32;
  }

  let cache33;
  function operation33() {
    if (!cache33) cache33 = require("./backend/server-entry-model-service/engagement-swimmer-license-data-item").createEntryModelService_engagementSwimmerLicenseDataItem({
      get cleanEngagementLicenseVerificationStatus() { return backendContext.cleanEngagementLicenseVerificationStatus; },
      set cleanEngagementLicenseVerificationStatus(value) { backendContext.cleanEngagementLicenseVerificationStatus = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementLicenseSeasonState() { return backendContext.engagementLicenseSeasonState; },
      set engagementLicenseSeasonState(value) { backendContext.engagementLicenseSeasonState = value; }
    });
    return cache33;
  }

  let cache34;
  function operation34() {
    if (!cache34) cache34 = require("./backend/server-entry-model-service/engagement-legacy-swimmer-licenses-by-club").createEntryModelService_engagementLegacySwimmerLicensesByClub({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$engagementSwimmerLicenseItem() { return operation33().engagementSwimmerLicenseItem; }
    });
    return cache34;
  }

  let cache35;
  function operation35() {
    if (!cache35) cache35 = require("./backend/server-entry-model-service/engagement-swimmer-license-payload").createEntryModelService_engagementSwimmerLicensePayload({
      get cleanEngagementLicenseSeasonStatus() { return backendContext.cleanEngagementLicenseSeasonStatus; },
      set cleanEngagementLicenseSeasonStatus(value) { backendContext.cleanEngagementLicenseSeasonStatus = value; },
      get cleanEngagementLicenseVerificationStatus() { return backendContext.cleanEngagementLicenseVerificationStatus; },
      set cleanEngagementLicenseVerificationStatus(value) { backendContext.cleanEngagementLicenseVerificationStatus = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get currentEngagementSeasonInfo() { return backendContext.currentEngagementSeasonInfo; },
      set currentEngagementSeasonInfo(value) { backendContext.currentEngagementSeasonInfo = value; }
    });
    return cache35;
  }

  let cache36;
  function operation36() {
    if (!cache36) cache36 = require("./backend/server-entry-model-service/engagement-swimmer-license-conflict-data").createEntryModelService_engagementSwimmerLicenseConflictData({
      get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
      set ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get intranapSwimmersIndex() { return backendContext.intranapSwimmersIndex; },
      set intranapSwimmersIndex(value) { backendContext.intranapSwimmersIndex = value; },
      get local$engagementSwimmerLicenseNumberId() { return operation26().engagementSwimmerLicenseNumberId; },
      get local$engagementSwimmerLicenseNumberKey() { return operation25().engagementSwimmerLicenseNumberKey; }
    });
    return cache36;
  }

  let cache37;
  function operation37() {
    if (!cache37) cache37 = require("./backend/server-entry-model-service/assert-no-engagement-swimmer-license-conflict").createEntryModelService_assertNoEngagementSwimmerLicenseConflict({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get engagementClubCode() { return backendContext.engagementClubCode; },
      set engagementClubCode(value) { backendContext.engagementClubCode = value; },
      get engagementClubName() { return backendContext.engagementClubName; },
      set engagementClubName(value) { backendContext.engagementClubName = value; },
      get local$findEngagementSwimmerLicenseConflict() { return operation36().findEngagementSwimmerLicenseConflict; }
    });
    return cache37;
  }

  let cache38;
  function operation38() {
    if (!cache38) cache38 = require("./backend/server-entry-model-service/engagement-swimmer-recovery-preview").createEntryModelService_engagementSwimmerRecoveryPreview({
      get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
      set ENGAGEMENT_SWIMMER_LICENSE_PATTERN(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get currentEngagementSeasonInfo() { return backendContext.currentEngagementSeasonInfo; },
      set currentEngagementSeasonInfo(value) { backendContext.currentEngagementSeasonInfo = value; },
      get engagementSeasonBoundsFromEndYear() { return backendContext.engagementSeasonBoundsFromEndYear; },
      set engagementSeasonBoundsFromEndYear(value) { backendContext.engagementSeasonBoundsFromEndYear = value; },
      get local$engagementClubRosterSwimmerItem() { return operation28().engagementClubRosterSwimmerItem; },
      get local$engagementNewSwimmerItem() { return operation22().engagementNewSwimmerItem; },
      get local$engagementSwimmerLicenseNumberKey() { return operation25().engagementSwimmerLicenseNumberKey; },
      get local$findEngagementSwimmerLicenseConflict() { return operation36().findEngagementSwimmerLicenseConflict; }
    });
    return cache38;
  }

  let cache39;
  function operation39() {
    if (!cache39) cache39 = require("./backend/server-entry-model-service/engagement-club-entry-item").createEntryModelService_engagementClubEntryItem({
      get ENGAGEMENT_PROGRAM_GENDER_MODES() { return backendContext.ENGAGEMENT_PROGRAM_GENDER_MODES; },
      set ENGAGEMENT_PROGRAM_GENDER_MODES(value) { backendContext.ENGAGEMENT_PROGRAM_GENDER_MODES = value; },
      get cleanEngagementDocumentMetadata() { return backendContext.cleanEngagementDocumentMetadata; },
      set cleanEngagementDocumentMetadata(value) { backendContext.cleanEngagementDocumentMetadata = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubCode() { return backendContext.engagementClubCode; },
      set engagementClubCode(value) { backendContext.engagementClubCode = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubName() { return backendContext.engagementClubName; },
      set engagementClubName(value) { backendContext.engagementClubName = value; },
      get normalizeCategoryCode() { return backendContext.normalizeCategoryCode; },
      set normalizeCategoryCode(value) { backendContext.normalizeCategoryCode = value; },
      get normalizeCourseCode() { return backendContext.normalizeCourseCode; },
      set normalizeCourseCode(value) { backendContext.normalizeCourseCode = value; },
      get local$cleanEngagementEntryOfficial() { return operation2().cleanEngagementEntryOfficial; },
      get local$cleanEngagementEntrySwimmer() { return operation5().cleanEngagementEntrySwimmer; },
      get local$engagementTeamLeaderComplete() { return operation1().engagementTeamLeaderComplete; }
    });
    return cache39;
  }

  let cache40;
  function operation40() {
    if (!cache40) cache40 = require("./backend/server-entry-model-service/engagement-club-entry-has-participants").createEntryModelService_engagementClubEntryHasParticipants({

    });
    return cache40;
  }
  return {
    cleanEngagementTeamLeader: operation0().cleanEngagementTeamLeader,
    engagementTeamLeaderComplete: operation1().engagementTeamLeaderComplete,
    cleanEngagementEntryOfficial: operation2().cleanEngagementEntryOfficial,
    parseEngagementEntryTime: operation3().parseEngagementEntryTime,
    cleanEngagementEntryIndividualEntries: operation4().cleanEngagementEntryIndividualEntries,
    cleanEngagementEntrySwimmer: operation5().cleanEngagementEntrySwimmer,
    engagementRelayAllowedCategories: operation6().engagementRelayAllowedCategories,
    cleanEngagementRelayGenderMode: operation6().cleanEngagementRelayGenderMode,
    engagementRelayMemberCategory: operation6().engagementRelayMemberCategory,
    engagementRelayMemberAge: operation6().engagementRelayMemberAge,
    engagementRelayMemberAllowedForCategory: operation6().engagementRelayMemberAllowedForCategory,
    assertEngagementRelayMembers: operation6().assertEngagementRelayMembers,
    cleanEngagementEntryRelays: operation6().cleanEngagementEntryRelays,
    qualificationRelaysAfterIndividualChange: operation7().qualificationRelaysAfterIndividualChange,
    qualificationEvents: operation8().qualificationEvents,
    qualificationService: operation9().qualificationService,
    nativeQualificationServices: operation10().nativeQualificationServices,
    nativeQualificationError: operation11().nativeQualificationError,
    engagementQualificationRowAllowed: operation12().engagementQualificationRowAllowed,
    bestEngagementKnownTime: operation9().bestEngagementKnownTime,
    engagementKnownTimeHistory: operation13().engagementKnownTimeHistory,
    engagementEntryTimeCacheId: operation14().engagementEntryTimeCacheId,
    engagementEntryTimeCacheRef: operation12().engagementEntryTimeCacheRef,
    engagementEntryTimeCacheRow: operation12().engagementEntryTimeCacheRow,
    engagementEntryTimeCacheRowsFromData: operation12().engagementEntryTimeCacheRowsFromData,
    engagementEntryTimeRowsToEvents: operation12().engagementEntryTimeRowsToEvents,
    engagementEntryTimeSourceKeys: operation12().engagementEntryTimeSourceKeys,
    readEngagementEntryTimeSourceRows: operation12().readEngagementEntryTimeSourceRows,
    rebuildEngagementEntryTimeCache: operation12().rebuildEngagementEntryTimeCache,
    getEngagementEntryTimeRowsForSwimmer: operation12().getEngagementEntryTimeRowsForSwimmer,
    getEngagementQualificationRows: operation9().getEngagementQualificationRows,
    deleteEngagementEntryTimeCache: operation15().deleteEngagementEntryTimeCache,
    invalidateEngagementEntryTimeCachesForPerformanceRows: operation16().invalidateEngagementEntryTimeCachesForPerformanceRows,
    engagementCompetitionAppliesToFranceRecords: operation17().engagementCompetitionAppliesToFranceRecords,
    engagementCompetitionAppliesToMpf: operation17().engagementCompetitionAppliesToMpf,
    engagementRecordReferencesForEntry: operation18().engagementRecordReferencesForEntry,
    engagementEntryTimeWarning: operation18().engagementEntryTimeWarning,
    validateEngagementIndividualEntryTimes: operation18().validateEngagementIndividualEntryTimes,
    engagementRelayReferencesForEntry: operation6().engagementRelayReferencesForEntry,
    validateEngagementRelayEntryTimes: operation6().validateEngagementRelayEntryTimes,
    resolveEngagementIndividualEntriesForSwimmer: operation19().resolveEngagementIndividualEntriesForSwimmer,
    automaticEngagementIndividualEntry: operation9().automaticEngagementIndividualEntry,
    engagementSwimmerIdentityKey: operation20().engagementSwimmerIdentityKey,
    cleanEngagementNewSwimmer: operation21().cleanEngagementNewSwimmer,
    engagementNewSwimmerItem: operation22().engagementNewSwimmerItem,
    engagementNewSwimmerAlertFromMatch: operation23().engagementNewSwimmerAlertFromMatch,
    buildEngagementNewSwimmerAlerts: operation23().buildEngagementNewSwimmerAlerts,
    engagementSwimmerLicenseId: operation24().engagementSwimmerLicenseId,
    engagementSwimmerLicenseNumberKey: operation25().engagementSwimmerLicenseNumberKey,
    engagementSwimmerLicenseNumberId: operation26().engagementSwimmerLicenseNumberId,
    engagementClubRosterId: operation27().engagementClubRosterId,
    engagementClubRosterRef: operation27().engagementClubRosterRef,
    cleanEngagementClubActivityStatus: operation28().cleanEngagementClubActivityStatus,
    engagementClubRosterSwimmerKey: operation29().engagementClubRosterSwimmerKey,
    engagementClubRosterSwimmerItem: operation28().engagementClubRosterSwimmerItem,
    engagementClubRosterSwimmersFromData: operation30().engagementClubRosterSwimmersFromData,
    upsertEngagementClubRosterSwimmer: operation31().upsertEngagementClubRosterSwimmer,
    deleteEngagementClubRosterSwimmer: operation32().deleteEngagementClubRosterSwimmer,
    engagementSwimmerLicenseDataItem: operation33().engagementSwimmerLicenseDataItem,
    engagementSwimmerLicenseItem: operation33().engagementSwimmerLicenseItem,
    engagementLegacySwimmerLicensesByClub: operation34().engagementLegacySwimmerLicensesByClub,
    engagementSwimmerLicensePayload: operation35().engagementSwimmerLicensePayload,
    engagementSwimmerLicenseConflictData: operation36().engagementSwimmerLicenseConflictData,
    findEngagementSwimmerLicenseConflict: operation36().findEngagementSwimmerLicenseConflict,
    assertNoEngagementSwimmerLicenseConflict: operation37().assertNoEngagementSwimmerLicenseConflict,
    engagementSwimmerRecoveryPreview: operation38().engagementSwimmerRecoveryPreview,
    engagementClubEntryItem: operation39().engagementClubEntryItem,
    engagementClubEntryHasParticipants: operation40().engagementClubEntryHasParticipants
  };
}

module.exports = { createEntryModelService };
