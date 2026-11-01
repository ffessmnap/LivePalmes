// Compatibility factory; operation modules hold the existing bodies.
function createCompetitionHandlers(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/portal-competition-handlers/list-engagement-access-requests").createCompetitionHandlers_listEngagementAccessRequests({
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementAccessRequestItem() { return backendContext.engagementAccessRequestItem; },
      set engagementAccessRequestItem(value) { backendContext.engagementAccessRequestItem = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/portal-competition-handlers/list-engagement-qualification-sources").createCompetitionHandlers_listEngagementQualificationSources({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get qualificationService() { return backendContext.qualificationService; },
      set qualificationService(value) { backendContext.qualificationService = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/portal-competition-handlers/process-engagement-qualification-job").createCompetitionHandlers_processEngagementQualificationJob({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get nativeQualificationError() { return backendContext.nativeQualificationError; },
      set nativeQualificationError(value) { backendContext.nativeQualificationError = value; },
      get nativeQualificationNow() { return backendContext.nativeQualificationNow; },
      set nativeQualificationNow(value) { backendContext.nativeQualificationNow = value; },
      get nativeQualificationServices() { return backendContext.nativeQualificationServices; },
      set nativeQualificationServices(value) { backendContext.nativeQualificationServices = value; },
      get qualificationService() { return backendContext.qualificationService; },
      set qualificationService(value) { backendContext.qualificationService = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/portal-competition-handlers/grant-engagement-qualification-exception").createCompetitionHandlers_grantEngagementQualificationException({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get nativeQualificationError() { return backendContext.nativeQualificationError; },
      set nativeQualificationError(value) { backendContext.nativeQualificationError = value; },
      get nativeQualificationNow() { return backendContext.nativeQualificationNow; },
      set nativeQualificationNow(value) { backendContext.nativeQualificationNow = value; },
      get nativeQualificationServices() { return backendContext.nativeQualificationServices; },
      set nativeQualificationServices(value) { backendContext.nativeQualificationServices = value; },
      get qualificationService() { return backendContext.qualificationService; },
      set qualificationService(value) { backendContext.qualificationService = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/portal-competition-handlers/acknowledge-engagement-qualification-alert").createCompetitionHandlers_acknowledgeEngagementQualificationAlert({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get nativeQualificationError() { return backendContext.nativeQualificationError; },
      set nativeQualificationError(value) { backendContext.nativeQualificationError = value; },
      get nativeQualificationNow() { return backendContext.nativeQualificationNow; },
      set nativeQualificationNow(value) { backendContext.nativeQualificationNow = value; },
      get qualificationService() { return backendContext.qualificationService; },
      set qualificationService(value) { backendContext.qualificationService = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/portal-competition-handlers/get-engagement-automatic-mail-control").createCompetitionHandlers_getEngagementAutomaticMailControl({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/portal-competition-handlers/update-engagement-automatic-mail-control").createCompetitionHandlers_updateEngagementAutomaticMailControl({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/portal-competition-handlers/rebuild-engagement-mail-recipient-index-next-page").createCompetitionHandlers_rebuildEngagementMailRecipientIndexNextPage({
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCapability() { return backendContext.assertCapability; },
      set assertCapability(value) { backendContext.assertCapability = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementMailRecipientFromUserDoc() { return backendContext.engagementMailRecipientFromUserDoc; },
      set engagementMailRecipientFromUserDoc(value) { backendContext.engagementMailRecipientFromUserDoc = value; },
      get engagementMailRecipientIndexStateRef() { return backendContext.engagementMailRecipientIndexStateRef; },
      set engagementMailRecipientIndexStateRef(value) { backendContext.engagementMailRecipientIndexStateRef = value; },
      get engagementMailRecipientShardGroups() { return backendContext.engagementMailRecipientShardGroups; },
      set engagementMailRecipientShardGroups(value) { backendContext.engagementMailRecipientShardGroups = value; },
      get engagementMailRecipientShardRef() { return backendContext.engagementMailRecipientShardRef; },
      set engagementMailRecipientShardRef(value) { backendContext.engagementMailRecipientShardRef = value; },
      get engagementMailRecipientShardRefs() { return backendContext.engagementMailRecipientShardRefs; },
      set engagementMailRecipientShardRefs(value) { backendContext.engagementMailRecipientShardRefs = value; },
      get engagementMailRecipientsFromIndex() { return backendContext.engagementMailRecipientsFromIndex; },
      set engagementMailRecipientsFromIndex(value) { backendContext.engagementMailRecipientsFromIndex = value; },
      get writeEngagementClubAdminDirectory() { return backendContext.writeEngagementClubAdminDirectory; },
      set writeEngagementClubAdminDirectory(value) { backendContext.writeEngagementClubAdminDirectory = value; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/portal-competition-handlers/list-engagement-competitions").createCompetitionHandlers_listEngagementCompetitions({
      get ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION() { return backendContext.ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION; },
      set ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION(value) { backendContext.ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION = value; },
      get ENGAGEMENT_COMPETITION_LEVELS() { return backendContext.ENGAGEMENT_COMPETITION_LEVELS; },
      set ENGAGEMENT_COMPETITION_LEVELS(value) { backendContext.ENGAGEMENT_COMPETITION_LEVELS = value; },
      get ENGAGEMENT_ENTRY_STATUSES() { return backendContext.ENGAGEMENT_ENTRY_STATUSES; },
      set ENGAGEMENT_ENTRY_STATUSES(value) { backendContext.ENGAGEMENT_ENTRY_STATUSES = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubCompetitionIndexRef() { return backendContext.engagementClubCompetitionIndexRef; },
      set engagementClubCompetitionIndexRef(value) { backendContext.engagementClubCompetitionIndexRef = value; },
      get engagementClubEntryCompetitionIds() { return backendContext.engagementClubEntryCompetitionIds; },
      set engagementClubEntryCompetitionIds(value) { backendContext.engagementClubEntryCompetitionIds = value; },
      get engagementCompetitionCalendarItemsFromData() { return backendContext.engagementCompetitionCalendarItemsFromData; },
      set engagementCompetitionCalendarItemsFromData(value) { backendContext.engagementCompetitionCalendarItemsFromData = value; },
      get engagementCompetitionCalendarRef() { return backendContext.engagementCompetitionCalendarRef; },
      set engagementCompetitionCalendarRef(value) { backendContext.engagementCompetitionCalendarRef = value; },
      get engagementRegionsMatch() { return backendContext.engagementRegionsMatch; },
      set engagementRegionsMatch(value) { backendContext.engagementRegionsMatch = value; },
      get engagementSeasonBoundsFromEndYear() { return backendContext.engagementSeasonBoundsFromEndYear; },
      set engagementSeasonBoundsFromEndYear(value) { backendContext.engagementSeasonBoundsFromEndYear = value; },
      get engagementSeasonEndYearFromIsoDate() { return backendContext.engagementSeasonEndYearFromIsoDate; },
      set engagementSeasonEndYearFromIsoDate(value) { backendContext.engagementSeasonEndYearFromIsoDate = value; },
      get filterEngagementCompetitionCalendarItems() { return backendContext.filterEngagementCompetitionCalendarItems; },
      set filterEngagementCompetitionCalendarItems(value) { backendContext.filterEngagementCompetitionCalendarItems = value; },
      get isNationalOnlyEngagementCompetitionLevel() { return backendContext.isNationalOnlyEngagementCompetitionLevel; },
      set isNationalOnlyEngagementCompetitionLevel(value) { backendContext.isNationalOnlyEngagementCompetitionLevel = value; },
      get nativePortalCalendarItems() { return backendContext.nativePortalCalendarItems; },
      set nativePortalCalendarItems(value) { backendContext.nativePortalCalendarItems = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/portal-competition-handlers/list-engagement-calendar-events").createCompetitionHandlers_listEngagementCalendarEvents({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementCalendarEventCalendarRef() { return backendContext.engagementCalendarEventCalendarRef; },
      set engagementCalendarEventCalendarRef(value) { backendContext.engagementCalendarEventCalendarRef = value; },
      get engagementCalendarEventItemsFromData() { return backendContext.engagementCalendarEventItemsFromData; },
      set engagementCalendarEventItemsFromData(value) { backendContext.engagementCalendarEventItemsFromData = value; },
      get engagementRegionsMatch() { return backendContext.engagementRegionsMatch; },
      set engagementRegionsMatch(value) { backendContext.engagementRegionsMatch = value; },
      get engagementSeasonBoundsFromEndYear() { return backendContext.engagementSeasonBoundsFromEndYear; },
      set engagementSeasonBoundsFromEndYear(value) { backendContext.engagementSeasonBoundsFromEndYear = value; },
      get engagementSeasonEndYearFromIsoDate() { return backendContext.engagementSeasonEndYearFromIsoDate; },
      set engagementSeasonEndYearFromIsoDate(value) { backendContext.engagementSeasonEndYearFromIsoDate = value; },
      get isNationalOnlyEngagementCompetitionLevel() { return backendContext.isNationalOnlyEngagementCompetitionLevel; },
      set isNationalOnlyEngagementCompetitionLevel(value) { backendContext.isNationalOnlyEngagementCompetitionLevel = value; },
      get nativePortalCalendarItems() { return backendContext.nativePortalCalendarItems; },
      set nativePortalCalendarItems(value) { backendContext.nativePortalCalendarItems = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/portal-competition-handlers/get-engagement-calendar-event").createCompetitionHandlers_getEngagementCalendarEvent({
      get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
      set ENGAGEMENT_CALENDAR_EVENTS_COLLECTION(value) { backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementCalendarEventDetailItem() { return backendContext.engagementCalendarEventDetailItem; },
      set engagementCalendarEventDetailItem(value) { backendContext.engagementCalendarEventDetailItem = value; },
      get engagementDeletionRequestId() { return backendContext.engagementDeletionRequestId; },
      set engagementDeletionRequestId(value) { backendContext.engagementDeletionRequestId = value; },
      get engagementEventIsPast() { return backendContext.engagementEventIsPast; },
      set engagementEventIsPast(value) { backendContext.engagementEventIsPast = value; },
      get nativePortalCompetition() { return backendContext.nativePortalCompetition; },
      set nativePortalCompetition(value) { backendContext.nativePortalCompetition = value; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/portal-competition-handlers/create-engagement-calendar-event").createCompetitionHandlers_createEngagementCalendarEvent({
      get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
      set ENGAGEMENT_CALENDAR_EVENTS_COLLECTION(value) { backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementCalendarEventPayload() { return backendContext.cleanEngagementCalendarEventPayload; },
      set cleanEngagementCalendarEventPayload(value) { backendContext.cleanEngagementCalendarEventPayload = value; },
      get createNativePortalCalendarRecord() { return backendContext.createNativePortalCalendarRecord; },
      set createNativePortalCalendarRecord(value) { backendContext.createNativePortalCalendarRecord = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementCalendarEventDetailItem() { return backendContext.engagementCalendarEventDetailItem; },
      set engagementCalendarEventDetailItem(value) { backendContext.engagementCalendarEventDetailItem = value; },
      get engagementEventIsPast() { return backendContext.engagementEventIsPast; },
      set engagementEventIsPast(value) { backendContext.engagementEventIsPast = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/portal-competition-handlers/update-engagement-calendar-event").createCompetitionHandlers_updateEngagementCalendarEvent({
      get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
      set ENGAGEMENT_CALENDAR_EVENTS_COLLECTION(value) { backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get assertCanModifyEngagementEvent() { return backendContext.assertCanModifyEngagementEvent; },
      set assertCanModifyEngagementEvent(value) { backendContext.assertCanModifyEngagementEvent = value; },
      get cleanEngagementCalendarEventPayload() { return backendContext.cleanEngagementCalendarEventPayload; },
      set cleanEngagementCalendarEventPayload(value) { backendContext.cleanEngagementCalendarEventPayload = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementCalendarEventDetailItem() { return backendContext.engagementCalendarEventDetailItem; },
      set engagementCalendarEventDetailItem(value) { backendContext.engagementCalendarEventDetailItem = value; },
      get engagementEventIsPast() { return backendContext.engagementEventIsPast; },
      set engagementEventIsPast(value) { backendContext.engagementEventIsPast = value; },
      get engagementRegionsMatch() { return backendContext.engagementRegionsMatch; },
      set engagementRegionsMatch(value) { backendContext.engagementRegionsMatch = value; },
      get nativePortalCompetition() { return backendContext.nativePortalCompetition; },
      set nativePortalCompetition(value) { backendContext.nativePortalCompetition = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/portal-competition-handlers/delete-engagement-calendar-event").createCompetitionHandlers_deleteEngagementCalendarEvent({
      get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
      set ENGAGEMENT_CALENDAR_EVENTS_COLLECTION(value) { backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get assertCanModifyEngagementEvent() { return backendContext.assertCanModifyEngagementEvent; },
      set assertCanModifyEngagementEvent(value) { backendContext.assertCanModifyEngagementEvent = value; },
      get assertEngagementCompetitionDocumentPath() { return backendContext.assertEngagementCompetitionDocumentPath; },
      set assertEngagementCompetitionDocumentPath(value) { backendContext.assertEngagementCompetitionDocumentPath = value; },
      get cleanCompetitionDocuments() { return backendContext.cleanCompetitionDocuments; },
      set cleanCompetitionDocuments(value) { backendContext.cleanCompetitionDocuments = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get hasManagedEngagementCompetitionDocumentStorage() { return backendContext.hasManagedEngagementCompetitionDocumentStorage; },
      set hasManagedEngagementCompetitionDocumentStorage(value) { backendContext.hasManagedEngagementCompetitionDocumentStorage = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/portal-competition-handlers/list-engagement-open-water-courses").createCompetitionHandlers_listEngagementOpenWaterCourses({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get cleanEngagementOpenWaterCourses() { return backendContext.cleanEngagementOpenWaterCourses; },
      set cleanEngagementOpenWaterCourses(value) { backendContext.cleanEngagementOpenWaterCourses = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementOpenWaterCourseConfigRef() { return backendContext.engagementOpenWaterCourseConfigRef; },
      set engagementOpenWaterCourseConfigRef(value) { backendContext.engagementOpenWaterCourseConfigRef = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/portal-competition-handlers/add-engagement-open-water-course").createCompetitionHandlers_addEngagementOpenWaterCourse({
      get ENGAGEMENT_OPEN_WATER_COURSE_LIMIT() { return backendContext.ENGAGEMENT_OPEN_WATER_COURSE_LIMIT; },
      set ENGAGEMENT_OPEN_WATER_COURSE_LIMIT(value) { backendContext.ENGAGEMENT_OPEN_WATER_COURSE_LIMIT = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementOpenWaterCourse() { return backendContext.cleanEngagementOpenWaterCourse; },
      set cleanEngagementOpenWaterCourse(value) { backendContext.cleanEngagementOpenWaterCourse = value; },
      get cleanEngagementOpenWaterCourses() { return backendContext.cleanEngagementOpenWaterCourses; },
      set cleanEngagementOpenWaterCourses(value) { backendContext.cleanEngagementOpenWaterCourses = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementOpenWaterCourseConfigRef() { return backendContext.engagementOpenWaterCourseConfigRef; },
      set engagementOpenWaterCourseConfigRef(value) { backendContext.engagementOpenWaterCourseConfigRef = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/portal-competition-handlers/set-engagement-open-water-course-status").createCompetitionHandlers_setEngagementOpenWaterCourseStatus({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementOpenWaterCourses() { return backendContext.cleanEngagementOpenWaterCourses; },
      set cleanEngagementOpenWaterCourses(value) { backendContext.cleanEngagementOpenWaterCourses = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementOpenWaterCourseConfigRef() { return backendContext.engagementOpenWaterCourseConfigRef; },
      set engagementOpenWaterCourseConfigRef(value) { backendContext.engagementOpenWaterCourseConfigRef = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/portal-competition-handlers/get-engagement-competition").createCompetitionHandlers_getEngagementCompetition({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementCompetitionDetailItem() { return backendContext.engagementCompetitionDetailItem; },
      set engagementCompetitionDetailItem(value) { backendContext.engagementCompetitionDetailItem = value; },
      get engagementEventIsPast() { return backendContext.engagementEventIsPast; },
      set engagementEventIsPast(value) { backendContext.engagementEventIsPast = value; },
      get nativePerformanceFailure() { return backendContext.nativePerformanceFailure; },
      set nativePerformanceFailure(value) { backendContext.nativePerformanceFailure = value; },
      get nativePortalCompetition() { return backendContext.nativePortalCompetition; },
      set nativePortalCompetition(value) { backendContext.nativePortalCompetition = value; }
    });
    return cache17;
  }

  let cache18;
  function operation18() {
    if (!cache18) cache18 = require("./backend/portal-competition-handlers/upload-engagement-competition-document").createCompetitionHandlers_uploadEngagementCompetitionDocument({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get MAX_COMPETITION_DOCUMENTS() { return backendContext.MAX_COMPETITION_DOCUMENTS; },
      set MAX_COMPETITION_DOCUMENTS(value) { backendContext.MAX_COMPETITION_DOCUMENTS = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get assertEngagementCompetitionDocumentPath() { return backendContext.assertEngagementCompetitionDocumentPath; },
      set assertEngagementCompetitionDocumentPath(value) { backendContext.assertEngagementCompetitionDocumentPath = value; },
      get cleanCompetitionDocumentInput() { return backendContext.cleanCompetitionDocumentInput; },
      set cleanCompetitionDocumentInput(value) { backendContext.cleanCompetitionDocumentInput = value; },
      get cleanCompetitionDocuments() { return backendContext.cleanCompetitionDocuments; },
      set cleanCompetitionDocuments(value) { backendContext.cleanCompetitionDocuments = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get competitionDocumentDownloadUrl() { return backendContext.competitionDocumentDownloadUrl; },
      set competitionDocumentDownloadUrl(value) { backendContext.competitionDocumentDownloadUrl = value; },
      get competitionDocumentStoragePath() { return backendContext.competitionDocumentStoragePath; },
      set competitionDocumentStoragePath(value) { backendContext.competitionDocumentStoragePath = value; },
      get competitionDocumentTokenFromUrl() { return backendContext.competitionDocumentTokenFromUrl; },
      set competitionDocumentTokenFromUrl(value) { backendContext.competitionDocumentTokenFromUrl = value; },
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get decodeCompetitionDocumentDataUrl() { return backendContext.decodeCompetitionDocumentDataUrl; },
      set decodeCompetitionDocumentDataUrl(value) { backendContext.decodeCompetitionDocumentDataUrl = value; },
      get engagementCompetitionDocumentContext() { return backendContext.engagementCompetitionDocumentContext; },
      set engagementCompetitionDocumentContext(value) { backendContext.engagementCompetitionDocumentContext = value; },
      get engagementCompetitionDocumentUploader() { return backendContext.engagementCompetitionDocumentUploader; },
      set engagementCompetitionDocumentUploader(value) { backendContext.engagementCompetitionDocumentUploader = value; },
      get hasManagedEngagementCompetitionDocumentStorage() { return backendContext.hasManagedEngagementCompetitionDocumentStorage; },
      set hasManagedEngagementCompetitionDocumentStorage(value) { backendContext.hasManagedEngagementCompetitionDocumentStorage = value; },
      get mutateNativeCompetitionDocument() { return backendContext.mutateNativeCompetitionDocument; },
      set mutateNativeCompetitionDocument(value) { backendContext.mutateNativeCompetitionDocument = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache18;
  }

  let cache19;
  function operation19() {
    if (!cache19) cache19 = require("./backend/portal-competition-handlers/update-engagement-competition-document").createCompetitionHandlers_updateEngagementCompetitionDocument({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get cleanCompetitionDocumentInput() { return backendContext.cleanCompetitionDocumentInput; },
      set cleanCompetitionDocumentInput(value) { backendContext.cleanCompetitionDocumentInput = value; },
      get cleanCompetitionDocuments() { return backendContext.cleanCompetitionDocuments; },
      set cleanCompetitionDocuments(value) { backendContext.cleanCompetitionDocuments = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementCompetitionDocumentContext() { return backendContext.engagementCompetitionDocumentContext; },
      set engagementCompetitionDocumentContext(value) { backendContext.engagementCompetitionDocumentContext = value; },
      get mutateNativeCompetitionDocument() { return backendContext.mutateNativeCompetitionDocument; },
      set mutateNativeCompetitionDocument(value) { backendContext.mutateNativeCompetitionDocument = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache19;
  }

  let cache20;
  function operation20() {
    if (!cache20) cache20 = require("./backend/portal-competition-handlers/delete-engagement-competition-document").createCompetitionHandlers_deleteEngagementCompetitionDocument({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get assertCanDeleteEngagementDocument() { return backendContext.assertCanDeleteEngagementDocument; },
      set assertCanDeleteEngagementDocument(value) { backendContext.assertCanDeleteEngagementDocument = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get assertEngagementCompetitionDocumentPath() { return backendContext.assertEngagementCompetitionDocumentPath; },
      set assertEngagementCompetitionDocumentPath(value) { backendContext.assertEngagementCompetitionDocumentPath = value; },
      get cleanCompetitionDocuments() { return backendContext.cleanCompetitionDocuments; },
      set cleanCompetitionDocuments(value) { backendContext.cleanCompetitionDocuments = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementCompetitionDocumentContext() { return backendContext.engagementCompetitionDocumentContext; },
      set engagementCompetitionDocumentContext(value) { backendContext.engagementCompetitionDocumentContext = value; },
      get hasManagedEngagementCompetitionDocumentStorage() { return backendContext.hasManagedEngagementCompetitionDocumentStorage; },
      set hasManagedEngagementCompetitionDocumentStorage(value) { backendContext.hasManagedEngagementCompetitionDocumentStorage = value; },
      get mutateNativeCompetitionDocument() { return backendContext.mutateNativeCompetitionDocument; },
      set mutateNativeCompetitionDocument(value) { backendContext.mutateNativeCompetitionDocument = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache20;
  }

  let cache21;
  function operation21() {
    if (!cache21) cache21 = require("./backend/portal-competition-handlers/preview-engagement-competition-document-notification").createCompetitionHandlers_previewEngagementCompetitionDocumentNotification({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementActiveClubMailRecipients() { return backendContext.engagementActiveClubMailRecipients; },
      set engagementActiveClubMailRecipients(value) { backendContext.engagementActiveClubMailRecipients = value; },
      get engagementCompetitionDetailItem() { return backendContext.engagementCompetitionDetailItem; },
      set engagementCompetitionDetailItem(value) { backendContext.engagementCompetitionDetailItem = value; },
      get engagementCompetitionDocumentContext() { return backendContext.engagementCompetitionDocumentContext; },
      set engagementCompetitionDocumentContext(value) { backendContext.engagementCompetitionDocumentContext = value; },
      get engagementCompetitionDocumentRecipients() { return backendContext.engagementCompetitionDocumentRecipients; },
      set engagementCompetitionDocumentRecipients(value) { backendContext.engagementCompetitionDocumentRecipients = value; },
      get nativeNotificationPreview() { return backendContext.nativeNotificationPreview; },
      set nativeNotificationPreview(value) { backendContext.nativeNotificationPreview = value; }
    });
    return cache21;
  }

  let cache22;
  function operation22() {
    if (!cache22) cache22 = require("./backend/portal-competition-handlers/get-engagement-competition-statistics").createCompetitionHandlers_getEngagementCompetitionStatistics({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get decodeEngagementCompetitionStatisticsCache() { return backendContext.decodeEngagementCompetitionStatisticsCache; },
      set decodeEngagementCompetitionStatisticsCache(value) { backendContext.decodeEngagementCompetitionStatisticsCache = value; },
      get encodeEngagementCompetitionStatisticsCache() { return backendContext.encodeEngagementCompetitionStatisticsCache; },
      set encodeEngagementCompetitionStatisticsCache(value) { backendContext.encodeEngagementCompetitionStatisticsCache = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementCompetitionDetailItem() { return backendContext.engagementCompetitionDetailItem; },
      set engagementCompetitionDetailItem(value) { backendContext.engagementCompetitionDetailItem = value; },
      get engagementCompetitionStatisticsCacheRef() { return backendContext.engagementCompetitionStatisticsCacheRef; },
      set engagementCompetitionStatisticsCacheRef(value) { backendContext.engagementCompetitionStatisticsCacheRef = value; },
      get engagementCompetitionStatisticsItem() { return backendContext.engagementCompetitionStatisticsItem; },
      set engagementCompetitionStatisticsItem(value) { backendContext.engagementCompetitionStatisticsItem = value; },
      get nativeAdminCompetitionEntries() { return backendContext.nativeAdminCompetitionEntries; },
      set nativeAdminCompetitionEntries(value) { backendContext.nativeAdminCompetitionEntries = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; }
    });
    return cache22;
  }

  let cache23;
  function operation23() {
    if (!cache23) cache23 = require("./backend/portal-competition-handlers/generate-engagement-competition-txt-export").createCompetitionHandlers_generateEngagementCompetitionTxtExport({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get buildEngagementCompetitionTxt() { return backendContext.buildEngagementCompetitionTxt; },
      set buildEngagementCompetitionTxt(value) { backendContext.buildEngagementCompetitionTxt = value; },
      get cleanEngagementCompetitionType() { return backendContext.cleanEngagementCompetitionType; },
      set cleanEngagementCompetitionType(value) { backendContext.cleanEngagementCompetitionType = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementPdfFileName() { return backendContext.engagementPdfFileName; },
      set engagementPdfFileName(value) { backendContext.engagementPdfFileName = value; },
      get engagementTxtSwimmerCategory() { return backendContext.engagementTxtSwimmerCategory; },
      set engagementTxtSwimmerCategory(value) { backendContext.engagementTxtSwimmerCategory = value; },
      get getOrCreateEngagementCompetitionTxt() { return backendContext.getOrCreateEngagementCompetitionTxt; },
      set getOrCreateEngagementCompetitionTxt(value) { backendContext.getOrCreateEngagementCompetitionTxt = value; },
      get nativeAdminCompetitionEntries() { return backendContext.nativeAdminCompetitionEntries; },
      set nativeAdminCompetitionEntries(value) { backendContext.nativeAdminCompetitionEntries = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache23;
  }

  let cache24;
  function operation24() {
    if (!cache24) cache24 = require("./backend/portal-competition-handlers/get-portal-pending-request-overview").createCompetitionHandlers_getPortalPendingRequestOverview({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get accessManagementContext() { return backendContext.accessManagementContext; },
      set accessManagementContext(value) { backendContext.accessManagementContext = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementNationalAdministrationPendingCounts() { return backendContext.engagementNationalAdministrationPendingCounts; },
      set engagementNationalAdministrationPendingCounts(value) { backendContext.engagementNationalAdministrationPendingCounts = value; }
    });
    return cache24;
  }

  let cache25;
  function operation25() {
    if (!cache25) cache25 = require("./backend/portal-competition-handlers/create-engagement-competition").createCompetitionHandlers_createEngagementCompetition({
      get ENGAGEMENT_COMPETITION_TYPES() { return backendContext.ENGAGEMENT_COMPETITION_TYPES; },
      set ENGAGEMENT_COMPETITION_TYPES(value) { backendContext.ENGAGEMENT_COMPETITION_TYPES = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementCompetitionPayload() { return backendContext.cleanEngagementCompetitionPayload; },
      set cleanEngagementCompetitionPayload(value) { backendContext.cleanEngagementCompetitionPayload = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get createNativePortalCalendarRecord() { return backendContext.createNativePortalCalendarRecord; },
      set createNativePortalCalendarRecord(value) { backendContext.createNativePortalCalendarRecord = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementCompetitionListItem() { return backendContext.engagementCompetitionListItem; },
      set engagementCompetitionListItem(value) { backendContext.engagementCompetitionListItem = value; },
      get qualificationEngine() { return backendContext.qualificationEngine; },
      set qualificationEngine(value) { backendContext.qualificationEngine = value; },
      get qualificationEvents() { return backendContext.qualificationEvents; },
      set qualificationEvents(value) { backendContext.qualificationEvents = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache25;
  }

  let cache26;
  function operation26() {
    if (!cache26) cache26 = require("./backend/portal-competition-handlers/update-engagement-competition").createCompetitionHandlers_updateEngagementCompetition({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get armNativeCompetitionNotification() { return backendContext.armNativeCompetitionNotification; },
      set armNativeCompetitionNotification(value) { backendContext.armNativeCompetitionNotification = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get assertCanModifyEngagementEvent() { return backendContext.assertCanModifyEngagementEvent; },
      set assertCanModifyEngagementEvent(value) { backendContext.assertCanModifyEngagementEvent = value; },
      get cleanEngagementCompetitionEvents() { return backendContext.cleanEngagementCompetitionEvents; },
      set cleanEngagementCompetitionEvents(value) { backendContext.cleanEngagementCompetitionEvents = value; },
      get cleanEngagementCompetitionPayload() { return backendContext.cleanEngagementCompetitionPayload; },
      set cleanEngagementCompetitionPayload(value) { backendContext.cleanEngagementCompetitionPayload = value; },
      get cleanEngagementCompetitionType() { return backendContext.cleanEngagementCompetitionType; },
      set cleanEngagementCompetitionType(value) { backendContext.cleanEngagementCompetitionType = value; },
      get cleanEngagementOpenWaterCourses() { return backendContext.cleanEngagementOpenWaterCourses; },
      set cleanEngagementOpenWaterCourses(value) { backendContext.cleanEngagementOpenWaterCourses = value; },
      get cleanEngagementProgramSessions() { return backendContext.cleanEngagementProgramSessions; },
      set cleanEngagementProgramSessions(value) { backendContext.cleanEngagementProgramSessions = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementCompetitionDetailItem() { return backendContext.engagementCompetitionDetailItem; },
      set engagementCompetitionDetailItem(value) { backendContext.engagementCompetitionDetailItem = value; },
      get engagementEventIsPast() { return backendContext.engagementEventIsPast; },
      set engagementEventIsPast(value) { backendContext.engagementEventIsPast = value; },
      get engagementOpenWaterCourseConfigRef() { return backendContext.engagementOpenWaterCourseConfigRef; },
      set engagementOpenWaterCourseConfigRef(value) { backendContext.engagementOpenWaterCourseConfigRef = value; },
      get nativePortalCompetition() { return backendContext.nativePortalCompetition; },
      set nativePortalCompetition(value) { backendContext.nativePortalCompetition = value; },
      get nativeQualificationServices() { return backendContext.nativeQualificationServices; },
      set nativeQualificationServices(value) { backendContext.nativeQualificationServices = value; },
      get qualificationEngine() { return backendContext.qualificationEngine; },
      set qualificationEngine(value) { backendContext.qualificationEngine = value; },
      get qualificationEvents() { return backendContext.qualificationEvents; },
      set qualificationEvents(value) { backendContext.qualificationEvents = value; },
      get qualificationService() { return backendContext.qualificationService; },
      set qualificationService(value) { backendContext.qualificationService = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache26;
  }

  let cache27;
  function operation27() {
    if (!cache27) cache27 = require("./backend/portal-competition-handlers/delete-engagement-competition").createCompetitionHandlers_deleteEngagementCompetition({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get assertCanModifyEngagementEvent() { return backendContext.assertCanModifyEngagementEvent; },
      set assertCanModifyEngagementEvent(value) { backendContext.assertCanModifyEngagementEvent = value; },
      get assertEngagementCompetitionDocumentPath() { return backendContext.assertEngagementCompetitionDocumentPath; },
      set assertEngagementCompetitionDocumentPath(value) { backendContext.assertEngagementCompetitionDocumentPath = value; },
      get cleanCompetitionDocuments() { return backendContext.cleanCompetitionDocuments; },
      set cleanCompetitionDocuments(value) { backendContext.cleanCompetitionDocuments = value; },
      get cleanEngagementEntryStatus() { return backendContext.cleanEngagementEntryStatus; },
      set cleanEngagementEntryStatus(value) { backendContext.cleanEngagementEntryStatus = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClosureQueueRef() { return backendContext.engagementClosureQueueRef; },
      set engagementClosureQueueRef(value) { backendContext.engagementClosureQueueRef = value; },
      get engagementCompetitionCalendarRef() { return backendContext.engagementCompetitionCalendarRef; },
      set engagementCompetitionCalendarRef(value) { backendContext.engagementCompetitionCalendarRef = value; },
      get engagementEventIsPast() { return backendContext.engagementEventIsPast; },
      set engagementEventIsPast(value) { backendContext.engagementEventIsPast = value; },
      get engagementSeasonBoundsFromEndYear() { return backendContext.engagementSeasonBoundsFromEndYear; },
      set engagementSeasonBoundsFromEndYear(value) { backendContext.engagementSeasonBoundsFromEndYear = value; },
      get engagementSeasonEndYearFromIsoDate() { return backendContext.engagementSeasonEndYearFromIsoDate; },
      set engagementSeasonEndYearFromIsoDate(value) { backendContext.engagementSeasonEndYearFromIsoDate = value; },
      get hasManagedEngagementCompetitionDocumentStorage() { return backendContext.hasManagedEngagementCompetitionDocumentStorage; },
      set hasManagedEngagementCompetitionDocumentStorage(value) { backendContext.hasManagedEngagementCompetitionDocumentStorage = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache27;
  }
  return {
    listEngagementAccessRequests: operation0().listEngagementAccessRequests,
    listEngagementQualificationSources: operation1().listEngagementQualificationSources,
    processEngagementQualificationJob: operation2().processEngagementQualificationJob,
    grantEngagementQualificationException: operation3().grantEngagementQualificationException,
    acknowledgeEngagementQualificationAlert: operation4().acknowledgeEngagementQualificationAlert,
    getEngagementAutomaticMailControl: operation5().getEngagementAutomaticMailControl,
    updateEngagementAutomaticMailControl: operation6().updateEngagementAutomaticMailControl,
    rebuildEngagementMailRecipientIndexNextPage: operation7().rebuildEngagementMailRecipientIndexNextPage,
    listEngagementCompetitions: operation8().listEngagementCompetitions,
    listEngagementCalendarEvents: operation9().listEngagementCalendarEvents,
    getEngagementCalendarEvent: operation10().getEngagementCalendarEvent,
    createEngagementCalendarEvent: operation11().createEngagementCalendarEvent,
    updateEngagementCalendarEvent: operation12().updateEngagementCalendarEvent,
    deleteEngagementCalendarEvent: operation13().deleteEngagementCalendarEvent,
    listEngagementOpenWaterCourses: operation14().listEngagementOpenWaterCourses,
    addEngagementOpenWaterCourse: operation15().addEngagementOpenWaterCourse,
    setEngagementOpenWaterCourseStatus: operation16().setEngagementOpenWaterCourseStatus,
    getEngagementCompetition: operation17().getEngagementCompetition,
    uploadEngagementCompetitionDocument: operation18().uploadEngagementCompetitionDocument,
    updateEngagementCompetitionDocument: operation19().updateEngagementCompetitionDocument,
    deleteEngagementCompetitionDocument: operation20().deleteEngagementCompetitionDocument,
    previewEngagementCompetitionDocumentNotification: operation21().previewEngagementCompetitionDocumentNotification,
    getEngagementCompetitionStatistics: operation22().getEngagementCompetitionStatistics,
    generateEngagementCompetitionTxtExport: operation23().generateEngagementCompetitionTxtExport,
    getPortalPendingRequestOverview: operation24().getPortalPendingRequestOverview,
    createEngagementCompetition: operation25().createEngagementCompetition,
    updateEngagementCompetition: operation26().updateEngagementCompetition,
    deleteEngagementCompetition: operation27().deleteEngagementCompetition
  };
}

module.exports = { createCompetitionHandlers };
