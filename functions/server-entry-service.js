// Compatibility factory; operation modules hold the existing bodies.
function createEntryService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-entry-service/build-engagement-club-swimmers-from-request").createEntryService_buildEngagementClubSwimmersFromRequest({
      get ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE() { return backendContext.ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE; },
      set ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE(value) { backendContext.ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE = value; },
      get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
      set ENGAGEMENT_SWIMMER_LICENSE_PATTERN(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get cleanEngagementCompetitionEvents() { return backendContext.cleanEngagementCompetitionEvents; },
      set cleanEngagementCompetitionEvents(value) { backendContext.cleanEngagementCompetitionEvents = value; },
      get cleanEngagementCompetitionType() { return backendContext.cleanEngagementCompetitionType; },
      set cleanEngagementCompetitionType(value) { backendContext.cleanEngagementCompetitionType = value; },
      get cleanEngagementEntryIndividualEntries() { return backendContext.cleanEngagementEntryIndividualEntries; },
      set cleanEngagementEntryIndividualEntries(value) { backendContext.cleanEngagementEntryIndividualEntries = value; },
      get cleanEngagementEntrySwimmer() { return backendContext.cleanEngagementEntrySwimmer; },
      set cleanEngagementEntrySwimmer(value) { backendContext.cleanEngagementEntrySwimmer = value; },
      get cleanEngagementLicenseVerificationStatus() { return backendContext.cleanEngagementLicenseVerificationStatus; },
      set cleanEngagementLicenseVerificationStatus(value) { backendContext.cleanEngagementLicenseVerificationStatus = value; },
      get cleanEngagementMaxEventsPerSwimmer() { return backendContext.cleanEngagementMaxEventsPerSwimmer; },
      set cleanEngagementMaxEventsPerSwimmer(value) { backendContext.cleanEngagementMaxEventsPerSwimmer = value; },
      get cleanEngagementMissingEntryTimeMode() { return backendContext.cleanEngagementMissingEntryTimeMode; },
      set cleanEngagementMissingEntryTimeMode(value) { backendContext.cleanEngagementMissingEntryTimeMode = value; },
      get cleanEngagementPoolLength() { return backendContext.cleanEngagementPoolLength; },
      set cleanEngagementPoolLength(value) { backendContext.cleanEngagementPoolLength = value; },
      get cleanEngagementQualificationTimesMode() { return backendContext.cleanEngagementQualificationTimesMode; },
      set cleanEngagementQualificationTimesMode(value) { backendContext.cleanEngagementQualificationTimesMode = value; },
      get cleanEngagementTimingType() { return backendContext.cleanEngagementTimingType; },
      set cleanEngagementTimingType(value) { backendContext.cleanEngagementTimingType = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubSwimmerItem() { return backendContext.engagementClubSwimmerItem; },
      set engagementClubSwimmerItem(value) { backendContext.engagementClubSwimmerItem = value; },
      get engagementLicenseSeasonState() { return backendContext.engagementLicenseSeasonState; },
      set engagementLicenseSeasonState(value) { backendContext.engagementLicenseSeasonState = value; },
      get engagementNewSwimmerItem() { return backendContext.engagementNewSwimmerItem; },
      set engagementNewSwimmerItem(value) { backendContext.engagementNewSwimmerItem = value; },
      get engagementReferenceSwimmerItem() { return backendContext.engagementReferenceSwimmerItem; },
      set engagementReferenceSwimmerItem(value) { backendContext.engagementReferenceSwimmerItem = value; },
      get engagementSwimmerLicenseItem() { return backendContext.engagementSwimmerLicenseItem; },
      set engagementSwimmerLicenseItem(value) { backendContext.engagementSwimmerLicenseItem = value; },
      get intranapSwimmersIndex() { return backendContext.intranapSwimmersIndex; },
      set intranapSwimmersIndex(value) { backendContext.intranapSwimmersIndex = value; },
      get loadPerformanceRecordsData() { return backendContext.loadPerformanceRecordsData; },
      set loadPerformanceRecordsData(value) { backendContext.loadPerformanceRecordsData = value; },
      get resolveEngagementIndividualEntriesForSwimmer() { return backendContext.resolveEngagementIndividualEntriesForSwimmer; },
      set resolveEngagementIndividualEntriesForSwimmer(value) { backendContext.resolveEngagementIndividualEntriesForSwimmer = value; },
      get validateEngagementIndividualEntryTimes() { return backendContext.validateEngagementIndividualEntryTimes; },
      set validateEngagementIndividualEntryTimes(value) { backendContext.validateEngagementIndividualEntryTimes = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-entry-service/engagement-entry-time-stats").createEntryService_engagementEntryTimeStats({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-entry-service/native-club-entry-time-history").createEntryService_nativeClubEntryTimeHistory({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementKnownTimeHistory() { return backendContext.engagementKnownTimeHistory; },
      set engagementKnownTimeHistory(value) { backendContext.engagementKnownTimeHistory = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-entry-service/preview-native-club-entry-times").createEntryService_previewNativeClubEntryTimes({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get automaticEngagementIndividualEntry() { return backendContext.automaticEngagementIndividualEntry; },
      set automaticEngagementIndividualEntry(value) { backendContext.automaticEngagementIndividualEntry = value; },
      get parseEngagementEntryTime() { return backendContext.parseEngagementEntryTime; },
      set parseEngagementEntryTime(value) { backendContext.parseEngagementEntryTime = value; },
      get qualificationEvents() { return backendContext.qualificationEvents; },
      set qualificationEvents(value) { backendContext.qualificationEvents = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-entry-service/save-native-club-individual-entries").createEntryService_saveNativeClubIndividualEntries({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
      set ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES(value) { backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get automaticEngagementIndividualEntry() { return backendContext.automaticEngagementIndividualEntry; },
      set automaticEngagementIndividualEntry(value) { backendContext.automaticEngagementIndividualEntry = value; },
      get birthYear() { return backendContext.birthYear; },
      set birthYear(value) { backendContext.birthYear = value; },
      get competitionYear() { return backendContext.competitionYear; },
      set competitionYear(value) { backendContext.competitionYear = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get importSeasonYear() { return backendContext.importSeasonYear; },
      set importSeasonYear(value) { backendContext.importSeasonYear = value; },
      get nativeClubEntryView() { return backendContext.nativeClubEntryView; },
      set nativeClubEntryView(value) { backendContext.nativeClubEntryView = value; },
      get parseEngagementEntryTime() { return backendContext.parseEngagementEntryTime; },
      set parseEngagementEntryTime(value) { backendContext.parseEngagementEntryTime = value; },
      get qualificationEvents() { return backendContext.qualificationEvents; },
      set qualificationEvents(value) { backendContext.qualificationEvents = value; },
      get validateEngagementIndividualEntryTimes() { return backendContext.validateEngagementIndividualEntryTimes; },
      set validateEngagementIndividualEntryTimes(value) { backendContext.validateEngagementIndividualEntryTimes = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-entry-service/save-native-club-swimmer-selections").createEntryService_saveNativeClubSwimmerSelections({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get nativeClubEntryView() { return backendContext.nativeClubEntryView; },
      set nativeClubEntryView(value) { backendContext.nativeClubEntryView = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-entry-service/save-native-club-relays").createEntryService_saveNativeClubRelays({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get cleanEngagementCompetitionEvents() { return backendContext.cleanEngagementCompetitionEvents; },
      set cleanEngagementCompetitionEvents(value) { backendContext.cleanEngagementCompetitionEvents = value; },
      get cleanEngagementEntryRelays() { return backendContext.cleanEngagementEntryRelays; },
      set cleanEngagementEntryRelays(value) { backendContext.cleanEngagementEntryRelays = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get nativeClubEntryView() { return backendContext.nativeClubEntryView; },
      set nativeClubEntryView(value) { backendContext.nativeClubEntryView = value; },
      get qualificationEvents() { return backendContext.qualificationEvents; },
      set qualificationEvents(value) { backendContext.qualificationEvents = value; },
      get validateEngagementRelayEntryTimes() { return backendContext.validateEngagementRelayEntryTimes; },
      set validateEngagementRelayEntryTimes(value) { backendContext.validateEngagementRelayEntryTimes = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache6;
  }
  return {
    buildEngagementClubSwimmersFromRequest: operation0().buildEngagementClubSwimmersFromRequest,
    engagementEntryTimeStats: operation1().engagementEntryTimeStats,
    nativeClubEntryTimeHistory: operation2().nativeClubEntryTimeHistory,
    previewNativeClubEntryTimes: operation3().previewNativeClubEntryTimes,
    saveNativeClubIndividualEntries: operation4().saveNativeClubIndividualEntries,
    saveNativeClubSwimmerSelections: operation5().saveNativeClubSwimmerSelections,
    saveNativeClubRelays: operation6().saveNativeClubRelays
  };
}

module.exports = { createEntryService };
