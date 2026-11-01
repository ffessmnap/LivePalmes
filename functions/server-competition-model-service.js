// Compatibility factory; operation modules hold the existing bodies.
function createCompetitionModelService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-competition-model-service/clean-iso-date").createCompetitionModelService_cleanIsoDate({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-competition-model-service/clean-engagement-competition-level").createCompetitionModelService_cleanEngagementCompetitionLevel({
      get ENGAGEMENT_COMPETITION_LEVELS() { return backendContext.ENGAGEMENT_COMPETITION_LEVELS; },
      set ENGAGEMENT_COMPETITION_LEVELS(value) { backendContext.ENGAGEMENT_COMPETITION_LEVELS = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-competition-model-service/clean-engagement-entry-status").createCompetitionModelService_cleanEngagementEntryStatus({
      get ENGAGEMENT_ENTRY_STATUSES() { return backendContext.ENGAGEMENT_ENTRY_STATUSES; },
      set ENGAGEMENT_ENTRY_STATUSES(value) { backendContext.ENGAGEMENT_ENTRY_STATUSES = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-competition-model-service/clean-engagement-competition-type").createCompetitionModelService_cleanEngagementCompetitionType({
      get ENGAGEMENT_COMPETITION_TYPES() { return backendContext.ENGAGEMENT_COMPETITION_TYPES; },
      set ENGAGEMENT_COMPETITION_TYPES(value) { backendContext.ENGAGEMENT_COMPETITION_TYPES = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-competition-model-service/clean-engagement-pool-lane-count").createCompetitionModelService_cleanEngagementPoolLaneCount({
      get ENGAGEMENT_WATER_BODY_TYPES() { return backendContext.ENGAGEMENT_WATER_BODY_TYPES; },
      set ENGAGEMENT_WATER_BODY_TYPES(value) { backendContext.ENGAGEMENT_WATER_BODY_TYPES = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanCompetitionDocuments() { return backendContext.cleanCompetitionDocuments; },
      set cleanCompetitionDocuments(value) { backendContext.cleanCompetitionDocuments = value; },
      get cleanEngagementRegionIds() { return backendContext.cleanEngagementRegionIds; },
      set cleanEngagementRegionIds(value) { backendContext.cleanEngagementRegionIds = value; },
      get cleanPublicCalendarPublicationStatus() { return backendContext.cleanPublicCalendarPublicationStatus; },
      set cleanPublicCalendarPublicationStatus(value) { backendContext.cleanPublicCalendarPublicationStatus = value; },
      get cleanPublicCalendarWhatsAppUrl() { return backendContext.cleanPublicCalendarWhatsAppUrl; },
      set cleanPublicCalendarWhatsAppUrl(value) { backendContext.cleanPublicCalendarWhatsAppUrl = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; },
      get local$cleanEngagementCompetitionEvents() { return operation7().cleanEngagementCompetitionEvents; },
      get local$cleanEngagementCompetitionLevel() { return operation1().cleanEngagementCompetitionLevel; },
      get local$cleanEngagementCompetitionType() { return operation3().cleanEngagementCompetitionType; },
      get local$cleanEngagementEntryStatus() { return operation2().cleanEngagementEntryStatus; },
      get local$cleanEngagementMaxEventsPerSwimmer() { return operation11().cleanEngagementMaxEventsPerSwimmer; },
      get local$cleanEngagementMissingEntryTimeMode() { return operation10().cleanEngagementMissingEntryTimeMode; },
      get local$cleanEngagementPoolLength() { return operation9().cleanEngagementPoolLength; },
      get local$cleanEngagementProgramSessions() { return operation13().cleanEngagementProgramSessions; },
      get local$cleanEngagementQualificationTimesMode() { return operation10().cleanEngagementQualificationTimesMode; },
      get local$cleanEngagementTimingType() { return operation9().cleanEngagementTimingType; },
      get local$cleanIsoDate() { return operation0().cleanIsoDate; },
      get local$isNationalOnlyEngagementCompetitionLevel() { return operation1().isNationalOnlyEngagementCompetitionLevel; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-competition-model-service/clean-engagement-open-water-course").createCompetitionModelService_cleanEngagementOpenWaterCourse({
      get ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES() { return backendContext.ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES; },
      set ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES(value) { backendContext.ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-competition-model-service/clean-engagement-open-water-courses").createCompetitionModelService_cleanEngagementOpenWaterCourses({
      get ENGAGEMENT_CONFIGURATION_COLLECTION() { return backendContext.ENGAGEMENT_CONFIGURATION_COLLECTION; },
      set ENGAGEMENT_CONFIGURATION_COLLECTION(value) { backendContext.ENGAGEMENT_CONFIGURATION_COLLECTION = value; },
      get ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID() { return backendContext.ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID; },
      set ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID(value) { backendContext.ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID = value; },
      get ENGAGEMENT_OPEN_WATER_COURSE_LIMIT() { return backendContext.ENGAGEMENT_OPEN_WATER_COURSE_LIMIT; },
      set ENGAGEMENT_OPEN_WATER_COURSE_LIMIT(value) { backendContext.ENGAGEMENT_OPEN_WATER_COURSE_LIMIT = value; },
      get ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES() { return backendContext.ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES; },
      set ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES(value) { backendContext.ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$cleanEngagementOpenWaterCourse() { return operation5().cleanEngagementOpenWaterCourse; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-competition-model-service/clean-engagement-competition-events").createCompetitionModelService_cleanEngagementCompetitionEvents({
      get ENGAGEMENT_CATEGORY_CODE_SET() { return backendContext.ENGAGEMENT_CATEGORY_CODE_SET; },
      set ENGAGEMENT_CATEGORY_CODE_SET(value) { backendContext.ENGAGEMENT_CATEGORY_CODE_SET = value; },
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
      set ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES(value) { backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementRelayMixedMode() { return backendContext.cleanEngagementRelayMixedMode; },
      set cleanEngagementRelayMixedMode(value) { backendContext.cleanEngagementRelayMixedMode = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementCategoryCodesForEvent() { return backendContext.engagementCategoryCodesForEvent; },
      set engagementCategoryCodesForEvent(value) { backendContext.engagementCategoryCodesForEvent = value; },
      get normalizeEngagementEventCategoryRestrictions() { return backendContext.normalizeEngagementEventCategoryRestrictions; },
      set normalizeEngagementEventCategoryRestrictions(value) { backendContext.normalizeEngagementEventCategoryRestrictions = value; },
      get local$cleanEngagementCompetitionType() { return operation3().cleanEngagementCompetitionType; },
      get local$cleanEngagementOpenWaterCourse() { return operation5().cleanEngagementOpenWaterCourse; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-competition-model-service/clean-optional-email").createCompetitionModelService_cleanOptionalEmail({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-competition-model-service/clean-engagement-pool-length").createCompetitionModelService_cleanEngagementPoolLength({
      get ENGAGEMENT_POOL_LENGTHS() { return backendContext.ENGAGEMENT_POOL_LENGTHS; },
      set ENGAGEMENT_POOL_LENGTHS(value) { backendContext.ENGAGEMENT_POOL_LENGTHS = value; },
      get ENGAGEMENT_TIMING_TYPES() { return backendContext.ENGAGEMENT_TIMING_TYPES; },
      set ENGAGEMENT_TIMING_TYPES(value) { backendContext.ENGAGEMENT_TIMING_TYPES = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-competition-model-service/clean-engagement-missing-entry-time-mode").createCompetitionModelService_cleanEngagementMissingEntryTimeMode({
      get ENGAGEMENT_MISSING_ENTRY_TIME_MODES() { return backendContext.ENGAGEMENT_MISSING_ENTRY_TIME_MODES; },
      set ENGAGEMENT_MISSING_ENTRY_TIME_MODES(value) { backendContext.ENGAGEMENT_MISSING_ENTRY_TIME_MODES = value; },
      get ENGAGEMENT_QUALIFICATION_TIME_MODES() { return backendContext.ENGAGEMENT_QUALIFICATION_TIME_MODES; },
      set ENGAGEMENT_QUALIFICATION_TIME_MODES(value) { backendContext.ENGAGEMENT_QUALIFICATION_TIME_MODES = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-competition-model-service/clean-engagement-max-events-per-swimmer").createCompetitionModelService_cleanEngagementMaxEventsPerSwimmer({

    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-competition-model-service/clean-engagement-fee-amount").createCompetitionModelService_cleanEngagementFeeAmount({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$engagementCompetitionCalendarItem() { return operation4().engagementCompetitionCalendarItem; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/server-competition-model-service/clean-engagement-program-sessions").createCompetitionModelService_cleanEngagementProgramSessions({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get ENGAGEMENT_PROGRAM_GENDER_MODES() { return backendContext.ENGAGEMENT_PROGRAM_GENDER_MODES; },
      set ENGAGEMENT_PROGRAM_GENDER_MODES(value) { backendContext.ENGAGEMENT_PROGRAM_GENDER_MODES = value; },
      get ENGAGEMENT_PROGRAM_PHASES() { return backendContext.ENGAGEMENT_PROGRAM_PHASES; },
      set ENGAGEMENT_PROGRAM_PHASES(value) { backendContext.ENGAGEMENT_PROGRAM_PHASES = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$cleanIsoDate() { return operation0().cleanIsoDate; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/server-competition-model-service/engagement-competition-calendar-ref").createCompetitionModelService_engagementCompetitionCalendarRef({
      get ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION() { return backendContext.ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION; },
      set ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION(value) { backendContext.ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION = value; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/server-competition-model-service/engagement-calendar-event-calendar-ref").createCompetitionModelService_engagementCalendarEventCalendarRef({
      get ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION() { return backendContext.ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION; },
      set ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION(value) { backendContext.ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION = value; },
      get local$engagementCalendarEventCalendarItem() { return operation17().engagementCalendarEventCalendarItem; }
    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/server-competition-model-service/clean-engagement-calendar-event-payload").createCompetitionModelService_cleanEngagementCalendarEventPayload({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PUBLIC_CALENDAR_EVENT_TYPES() { return backendContext.PUBLIC_CALENDAR_EVENT_TYPES; },
      set PUBLIC_CALENDAR_EVENT_TYPES(value) { backendContext.PUBLIC_CALENDAR_EVENT_TYPES = value; },
      get cleanIsoDateTime() { return backendContext.cleanIsoDateTime; },
      set cleanIsoDateTime(value) { backendContext.cleanIsoDateTime = value; },
      get cleanPublicCalendarEventType() { return backendContext.cleanPublicCalendarEventType; },
      set cleanPublicCalendarEventType(value) { backendContext.cleanPublicCalendarEventType = value; },
      get cleanPublicCalendarLevel() { return backendContext.cleanPublicCalendarLevel; },
      set cleanPublicCalendarLevel(value) { backendContext.cleanPublicCalendarLevel = value; },
      get cleanPublicCalendarProgram() { return backendContext.cleanPublicCalendarProgram; },
      set cleanPublicCalendarProgram(value) { backendContext.cleanPublicCalendarProgram = value; },
      get cleanPublicCalendarUrl() { return backendContext.cleanPublicCalendarUrl; },
      set cleanPublicCalendarUrl(value) { backendContext.cleanPublicCalendarUrl = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$cleanIsoDate() { return operation0().cleanIsoDate; },
      get local$isNationalOnlyEngagementCompetitionLevel() { return operation1().isNationalOnlyEngagementCompetitionLevel; }
    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/server-competition-model-service/engagement-calendar-event-calendar-item").createCompetitionModelService_engagementCalendarEventCalendarItem({
      get cleanCompetitionDocuments() { return backendContext.cleanCompetitionDocuments; },
      set cleanCompetitionDocuments(value) { backendContext.cleanCompetitionDocuments = value; },
      get cleanIsoDateTime() { return backendContext.cleanIsoDateTime; },
      set cleanIsoDateTime(value) { backendContext.cleanIsoDateTime = value; },
      get cleanPublicCalendarEventType() { return backendContext.cleanPublicCalendarEventType; },
      set cleanPublicCalendarEventType(value) { backendContext.cleanPublicCalendarEventType = value; },
      get cleanPublicCalendarLevel() { return backendContext.cleanPublicCalendarLevel; },
      set cleanPublicCalendarLevel(value) { backendContext.cleanPublicCalendarLevel = value; },
      get cleanPublicCalendarPublicationStatus() { return backendContext.cleanPublicCalendarPublicationStatus; },
      set cleanPublicCalendarPublicationStatus(value) { backendContext.cleanPublicCalendarPublicationStatus = value; },
      get cleanPublicCalendarUrl() { return backendContext.cleanPublicCalendarUrl; },
      set cleanPublicCalendarUrl(value) { backendContext.cleanPublicCalendarUrl = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$cleanIsoDate() { return operation0().cleanIsoDate; }
    });
    return cache17;
  }

  let cache18;
  function operation18() {
    if (!cache18) cache18 = require("./backend/server-competition-model-service/engagement-calendar-event-detail-item").createCompetitionModelService_engagementCalendarEventDetailItem({
      get cleanCompetitionDocuments() { return backendContext.cleanCompetitionDocuments; },
      set cleanCompetitionDocuments(value) { backendContext.cleanCompetitionDocuments = value; },
      get cleanPublicCalendarProgram() { return backendContext.cleanPublicCalendarProgram; },
      set cleanPublicCalendarProgram(value) { backendContext.cleanPublicCalendarProgram = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$engagementCalendarEventCalendarItem() { return operation17().engagementCalendarEventCalendarItem; }
    });
    return cache18;
  }

  let cache19;
  function operation19() {
    if (!cache19) cache19 = require("./backend/server-competition-model-service/engagement-club-competition-index-key").createCompetitionModelService_engagementClubCompetitionIndexKey({
      get ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION() { return backendContext.ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION; },
      set ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION(value) { backendContext.ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache19;
  }

  let cache20;
  function operation20() {
    if (!cache20) cache20 = require("./backend/server-competition-model-service/engagement-closure-queue-ref").createCompetitionModelService_engagementClosureQueueRef({
      get ENGAGEMENT_CLOSURE_QUEUE_COLLECTION() { return backendContext.ENGAGEMENT_CLOSURE_QUEUE_COLLECTION; },
      set ENGAGEMENT_CLOSURE_QUEUE_COLLECTION(value) { backendContext.ENGAGEMENT_CLOSURE_QUEUE_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache20;
  }

  let cache21;
  function operation21() {
    if (!cache21) cache21 = require("./backend/server-competition-model-service/engagement-closure-queue-item").createCompetitionModelService_engagementClosureQueueItem({
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDateTime() { return backendContext.cleanIsoDateTime; },
      set cleanIsoDateTime(value) { backendContext.cleanIsoDateTime = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$cleanEngagementCompetitionLevel() { return operation1().cleanEngagementCompetitionLevel; },
      get local$cleanEngagementEntryStatus() { return operation2().cleanEngagementEntryStatus; }
    });
    return cache21;
  }

  let cache22;
  function operation22() {
    if (!cache22) cache22 = require("./backend/server-competition-model-service/engagement-club-entry-competition-ids").createCompetitionModelService_engagementClubEntryCompetitionIds({
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$engagementClubCompetitionIndexKey() { return operation19().engagementClubCompetitionIndexKey; },
      get local$engagementClubCompetitionIndexRef() { return operation19().engagementClubCompetitionIndexRef; },
      get local$engagementClubEntryId() { return operation24().engagementClubEntryId; },
      get local$engagementCompetitionCalendarItem() { return operation4().engagementCompetitionCalendarItem; }
    });
    return cache22;
  }

  let cache23;
  function operation23() {
    if (!cache23) cache23 = require("./backend/server-competition-model-service/engagement-competition-detail-item").createCompetitionModelService_engagementCompetitionDetailItem({
      get cleanCompetitionDocuments() { return backendContext.cleanCompetitionDocuments; },
      set cleanCompetitionDocuments(value) { backendContext.cleanCompetitionDocuments = value; },
      get cleanEngagementGeneratedFiles() { return backendContext.cleanEngagementGeneratedFiles; },
      set cleanEngagementGeneratedFiles(value) { backendContext.cleanEngagementGeneratedFiles = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementCompetitionDocumentsMetadata() { return backendContext.engagementCompetitionDocumentsMetadata; },
      set engagementCompetitionDocumentsMetadata(value) { backendContext.engagementCompetitionDocumentsMetadata = value; },
      get local$cleanEngagementCompetitionEvents() { return operation7().cleanEngagementCompetitionEvents; },
      get local$cleanEngagementCompetitionType() { return operation3().cleanEngagementCompetitionType; },
      get local$cleanEngagementFees() { return operation12().cleanEngagementFees; },
      get local$cleanEngagementProgramSessions() { return operation13().cleanEngagementProgramSessions; },
      get local$engagementCompetitionListItem() { return operation12().engagementCompetitionListItem; }
    });
    return cache23;
  }

  let cache24;
  function operation24() {
    if (!cache24) cache24 = require("./backend/server-competition-model-service/engagement-club-entry-id").createCompetitionModelService_engagementClubEntryId({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache24;
  }

  let cache25;
  function operation25() {
    if (!cache25) cache25 = require("./backend/server-competition-model-service/engagement-person-license-key").createCompetitionModelService_engagementPersonLicenseKey({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache25;
  }

  let cache26;
  function operation26() {
    if (!cache26) cache26 = require("./backend/server-competition-model-service/assert-engagement-swimmer-role-compatibility").createCompetitionModelService_assertEngagementSwimmerRoleCompatibility({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get local$engagementPersonLicenseKey() { return operation25().engagementPersonLicenseKey; }
    });
    return cache26;
  }
  return {
    cleanIsoDate: operation0().cleanIsoDate,
    cleanEngagementCompetitionLevel: operation1().cleanEngagementCompetitionLevel,
    isNationalOnlyEngagementCompetitionLevel: operation1().isNationalOnlyEngagementCompetitionLevel,
    cleanEngagementEntryStatus: operation2().cleanEngagementEntryStatus,
    cleanEngagementCompetitionType: operation3().cleanEngagementCompetitionType,
    cleanEngagementWaterBodyType: operation4().cleanEngagementWaterBodyType,
    cleanEngagementOpenWaterCourse: operation5().cleanEngagementOpenWaterCourse,
    cleanEngagementOpenWaterCourses: operation6().cleanEngagementOpenWaterCourses,
    engagementOpenWaterCourseConfigRef: operation6().engagementOpenWaterCourseConfigRef,
    engagementOpenWaterEventDefinition: operation7().engagementOpenWaterEventDefinition,
    cleanOptionalEmail: operation8().cleanOptionalEmail,
    cleanEngagementPoolLength: operation9().cleanEngagementPoolLength,
    cleanEngagementPoolLaneCount: operation4().cleanEngagementPoolLaneCount,
    cleanEngagementTimingType: operation9().cleanEngagementTimingType,
    cleanEngagementQualificationTimesMode: operation10().cleanEngagementQualificationTimesMode,
    cleanEngagementMissingEntryTimeMode: operation10().cleanEngagementMissingEntryTimeMode,
    cleanEngagementMaxEventsPerSwimmer: operation11().cleanEngagementMaxEventsPerSwimmer,
    cleanEngagementFeeAmount: operation12().cleanEngagementFeeAmount,
    cleanEngagementFees: operation12().cleanEngagementFees,
    cleanEngagementCompetitionEvents: operation7().cleanEngagementCompetitionEvents,
    cleanEngagementProgramSessions: operation13().cleanEngagementProgramSessions,
    engagementCompetitionCalendarItem: operation4().engagementCompetitionCalendarItem,
    engagementCompetitionListItem: operation12().engagementCompetitionListItem,
    engagementCompetitionCalendarRef: operation14().engagementCompetitionCalendarRef,
    engagementCalendarEventCalendarRef: operation15().engagementCalendarEventCalendarRef,
    cleanEngagementCalendarEventPayload: operation16().cleanEngagementCalendarEventPayload,
    engagementCalendarEventCalendarItem: operation17().engagementCalendarEventCalendarItem,
    engagementCalendarEventDetailItem: operation18().engagementCalendarEventDetailItem,
    engagementCalendarEventItemsFromData: operation15().engagementCalendarEventItemsFromData,
    engagementClubCompetitionIndexRef: operation19().engagementClubCompetitionIndexRef,
    engagementClubCompetitionIndexKey: operation19().engagementClubCompetitionIndexKey,
    engagementClosureQueueRef: operation20().engagementClosureQueueRef,
    engagementClosureQueueItem: operation21().engagementClosureQueueItem,
    engagementCompetitionCalendarItemsFromData: operation22().engagementCompetitionCalendarItemsFromData,
    filterEngagementCompetitionCalendarItems: operation22().filterEngagementCompetitionCalendarItems,
    engagementCompetitionDetailItem: operation23().engagementCompetitionDetailItem,
    engagementClubEntryId: operation24().engagementClubEntryId,
    engagementClubEntryCompetitionIds: operation22().engagementClubEntryCompetitionIds,
    engagementPersonLicenseKey: operation25().engagementPersonLicenseKey,
    assertEngagementSwimmerRoleCompatibility: operation26().assertEngagementSwimmerRoleCompatibility
  };
}

module.exports = { createCompetitionModelService };
