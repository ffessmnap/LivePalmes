// Compatibility factory; operation modules hold the existing bodies.
function createCompetitionService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-competition-service/clean-engagement-competition-payload").createCompetitionService_cleanEngagementCompetitionPayload({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementCompetitionEvents() { return backendContext.cleanEngagementCompetitionEvents; },
      set cleanEngagementCompetitionEvents(value) { backendContext.cleanEngagementCompetitionEvents = value; },
      get cleanEngagementCompetitionLevel() { return backendContext.cleanEngagementCompetitionLevel; },
      set cleanEngagementCompetitionLevel(value) { backendContext.cleanEngagementCompetitionLevel = value; },
      get cleanEngagementCompetitionType() { return backendContext.cleanEngagementCompetitionType; },
      set cleanEngagementCompetitionType(value) { backendContext.cleanEngagementCompetitionType = value; },
      get cleanEngagementDeadlineAt() { return backendContext.cleanEngagementDeadlineAt; },
      set cleanEngagementDeadlineAt(value) { backendContext.cleanEngagementDeadlineAt = value; },
      get cleanEngagementEntryStatus() { return backendContext.cleanEngagementEntryStatus; },
      set cleanEngagementEntryStatus(value) { backendContext.cleanEngagementEntryStatus = value; },
      get cleanEngagementFees() { return backendContext.cleanEngagementFees; },
      set cleanEngagementFees(value) { backendContext.cleanEngagementFees = value; },
      get cleanEngagementMaxEventsPerSwimmer() { return backendContext.cleanEngagementMaxEventsPerSwimmer; },
      set cleanEngagementMaxEventsPerSwimmer(value) { backendContext.cleanEngagementMaxEventsPerSwimmer = value; },
      get cleanEngagementMissingEntryTimeMode() { return backendContext.cleanEngagementMissingEntryTimeMode; },
      set cleanEngagementMissingEntryTimeMode(value) { backendContext.cleanEngagementMissingEntryTimeMode = value; },
      get cleanEngagementPoolLaneCount() { return backendContext.cleanEngagementPoolLaneCount; },
      set cleanEngagementPoolLaneCount(value) { backendContext.cleanEngagementPoolLaneCount = value; },
      get cleanEngagementPoolLength() { return backendContext.cleanEngagementPoolLength; },
      set cleanEngagementPoolLength(value) { backendContext.cleanEngagementPoolLength = value; },
      get cleanEngagementProgramSessions() { return backendContext.cleanEngagementProgramSessions; },
      set cleanEngagementProgramSessions(value) { backendContext.cleanEngagementProgramSessions = value; },
      get cleanEngagementQualificationTimesMode() { return backendContext.cleanEngagementQualificationTimesMode; },
      set cleanEngagementQualificationTimesMode(value) { backendContext.cleanEngagementQualificationTimesMode = value; },
      get cleanEngagementRegionIds() { return backendContext.cleanEngagementRegionIds; },
      set cleanEngagementRegionIds(value) { backendContext.cleanEngagementRegionIds = value; },
      get cleanEngagementTimingType() { return backendContext.cleanEngagementTimingType; },
      set cleanEngagementTimingType(value) { backendContext.cleanEngagementTimingType = value; },
      get cleanEngagementWaterBodyType() { return backendContext.cleanEngagementWaterBodyType; },
      set cleanEngagementWaterBodyType(value) { backendContext.cleanEngagementWaterBodyType = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanOptionalEmail() { return backendContext.cleanOptionalEmail; },
      set cleanOptionalEmail(value) { backendContext.cleanOptionalEmail = value; },
      get cleanPublicCalendarWhatsAppUrl() { return backendContext.cleanPublicCalendarWhatsAppUrl; },
      set cleanPublicCalendarWhatsAppUrl(value) { backendContext.cleanPublicCalendarWhatsAppUrl = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get isEngagementOpeningDeadlinePast() { return backendContext.isEngagementOpeningDeadlinePast; },
      set isEngagementOpeningDeadlinePast(value) { backendContext.isEngagementOpeningDeadlinePast = value; },
      get isEngagementOpeningTooEarly() { return backendContext.isEngagementOpeningTooEarly; },
      set isEngagementOpeningTooEarly(value) { backendContext.isEngagementOpeningTooEarly = value; },
      get isNationalOnlyEngagementCompetitionLevel() { return backendContext.isNationalOnlyEngagementCompetitionLevel; },
      set isNationalOnlyEngagementCompetitionLevel(value) { backendContext.isNationalOnlyEngagementCompetitionLevel = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-competition-service/assert-can-manage-engagement-competition").createCompetitionService_assertCanManageEngagementCompetition({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get engagementRegionsMatch() { return backendContext.engagementRegionsMatch; },
      set engagementRegionsMatch(value) { backendContext.engagementRegionsMatch = value; },
      get isNationalOnlyEngagementCompetitionLevel() { return backendContext.isNationalOnlyEngagementCompetitionLevel; },
      set isNationalOnlyEngagementCompetitionLevel(value) { backendContext.isNationalOnlyEngagementCompetitionLevel = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-competition-service/engagement-event-is-past").createCompetitionService_engagementEventIsPast({
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-competition-service/assert-can-modify-engagement-event").createCompetitionService_assertCanModifyEngagementEvent({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get local$assertCanManageEngagementCompetition() { return operation1().assertCanManageEngagementCompetition; },
      get local$engagementEventIsPast() { return operation2().engagementEventIsPast; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-competition-service/assert-can-delete-engagement-document").createCompetitionService_assertCanDeleteEngagementDocument({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get competitionDocumentDownloadUrl() { return backendContext.competitionDocumentDownloadUrl; },
      set competitionDocumentDownloadUrl(value) { backendContext.competitionDocumentDownloadUrl = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; },
      get local$assertCanManageEngagementCompetition() { return operation1().assertCanManageEngagementCompetition; },
      get local$engagementEventIsPast() { return operation2().engagementEventIsPast; },
      get local$nativeDocumentAuthors() { return operation8().nativeDocumentAuthors; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-competition-service/engagement-deletion-request-id").createCompetitionService_engagementDeletionRequestId({

    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-competition-service/assert-engagement-club-write-open").createCompetitionService_assertEngagementClubWriteOpen({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementEntryStatus() { return backendContext.cleanEngagementEntryStatus; },
      set cleanEngagementEntryStatus(value) { backendContext.cleanEngagementEntryStatus = value; },
      get cleanIsoDateTime() { return backendContext.cleanIsoDateTime; },
      set cleanIsoDateTime(value) { backendContext.cleanIsoDateTime = value; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-competition-service/native-portal-calendar-items").createCompetitionService_nativePortalCalendarItems({

    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-competition-service/native-document-authors").createCompetitionService_nativeDocumentAuthors({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get getAuth() { return backendContext.getAuth; },
      set getAuth(value) { backendContext.getAuth = value; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-competition-service/native-portal-competition").createCompetitionService_nativePortalCompetition({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get local$nativeDocumentAuthors() { return operation8().nativeDocumentAuthors; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-competition-service/create-native-portal-calendar-record").createCompetitionService_createNativePortalCalendarRecord({
      get CLUB_REFERENCE_REGION_LABELS() { return backendContext.CLUB_REFERENCE_REGION_LABELS; },
      set CLUB_REFERENCE_REGION_LABELS(value) { backendContext.CLUB_REFERENCE_REGION_LABELS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementCalendarEventPayload() { return backendContext.cleanEngagementCalendarEventPayload; },
      set cleanEngagementCalendarEventPayload(value) { backendContext.cleanEngagementCalendarEventPayload = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementRegionsMatch() { return backendContext.engagementRegionsMatch; },
      set engagementRegionsMatch(value) { backendContext.engagementRegionsMatch = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; },
      get local$assertCanManageEngagementCompetition() { return operation1().assertCanManageEngagementCompetition; },
      get local$assertCanModifyEngagementEvent() { return operation3().assertCanModifyEngagementEvent; },
      get local$nativePortalCompetition() { return operation9().nativePortalCompetition; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-competition-service/native-club-entry-view").createCompetitionService_nativeClubEntryView({
      get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
      set ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES(value) { backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get birthYear() { return backendContext.birthYear; },
      set birthYear(value) { backendContext.birthYear = value; },
      get competitionYear() { return backendContext.competitionYear; },
      set competitionYear(value) { backendContext.competitionYear = value; },
      get importSeasonYear() { return backendContext.importSeasonYear; },
      set importSeasonYear(value) { backendContext.importSeasonYear = value; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-competition-service/engagement-competition-document-uploader").createCompetitionService_engagementCompetitionDocumentUploader({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/server-competition-service/assert-engagement-competition-document-path").createCompetitionService_assertEngagementCompetitionDocumentPath({
      get ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX() { return backendContext.ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX; },
      set ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX(value) { backendContext.ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/server-competition-service/engagement-competition-document-context").createCompetitionService_engagementCompetitionDocumentContext({
      get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
      set ENGAGEMENT_CALENDAR_EVENTS_COLLECTION(value) { backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get local$assertCanManageEngagementCompetition() { return operation1().assertCanManageEngagementCompetition; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/server-competition-service/national-library-context").createCompetitionService_nationalLibraryContext({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; }
    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/server-competition-service/manage-national-library-documents").createCompetitionService_manageNationalLibraryDocuments({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get competitionDocumentDownloadUrl() { return backendContext.competitionDocumentDownloadUrl; },
      set competitionDocumentDownloadUrl(value) { backendContext.competitionDocumentDownloadUrl = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; },
      get local$nationalLibraryContext() { return operation15().nationalLibraryContext; }
    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/server-competition-service/notify-national-library-document").createCompetitionService_notifyNationalLibraryDocument({
      get ENGAGEMENT_MAIL_JOBS_COLLECTION() { return backendContext.ENGAGEMENT_MAIL_JOBS_COLLECTION; },
      set ENGAGEMENT_MAIL_JOBS_COLLECTION(value) { backendContext.ENGAGEMENT_MAIL_JOBS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementCompetitionNotificationRecipients() { return backendContext.engagementCompetitionNotificationRecipients; },
      set engagementCompetitionNotificationRecipients(value) { backendContext.engagementCompetitionNotificationRecipients = value; },
      get engagementDedupMailRecipients() { return backendContext.engagementDedupMailRecipients; },
      set engagementDedupMailRecipients(value) { backendContext.engagementDedupMailRecipients = value; },
      get engagementMailRecipientIndexStateRef() { return backendContext.engagementMailRecipientIndexStateRef; },
      set engagementMailRecipientIndexStateRef(value) { backendContext.engagementMailRecipientIndexStateRef = value; },
      get engagementMailRecipientsFromIndex() { return backendContext.engagementMailRecipientsFromIndex; },
      set engagementMailRecipientsFromIndex(value) { backendContext.engagementMailRecipientsFromIndex = value; },
      get engagementMailSmtpConfig() { return backendContext.engagementMailSmtpConfig; },
      set engagementMailSmtpConfig(value) { backendContext.engagementMailSmtpConfig = value; },
      get engagementRecipientHasCapability() { return backendContext.engagementRecipientHasCapability; },
      set engagementRecipientHasCapability(value) { backendContext.engagementRecipientHasCapability = value; },
      get nodemailer() { return backendContext.nodemailer; },
      set nodemailer(value) { backendContext.nodemailer = value; },
      get sendEngagementMailJob() { return backendContext.sendEngagementMailJob; },
      set sendEngagementMailJob(value) { backendContext.sendEngagementMailJob = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get local$assertCanManageEngagementCompetition() { return operation1().assertCanManageEngagementCompetition; },
      get local$enqueueNativeNotificationTask() { return operation22().enqueueNativeNotificationTask; },
      get local$nationalLibraryContext() { return operation15().nationalLibraryContext; },
      get local$nativeNotificationPreview() { return operation20().nativeNotificationPreview; },
      get local$nativePortalCompetition() { return operation9().nativePortalCompetition; }
    });
    return cache17;
  }

  let cache18;
  function operation18() {
    if (!cache18) cache18 = require("./backend/server-competition-service/generate-native-club-recap-pdf").createCompetitionService_generateNativeClubRecapPdf({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get buildEngagementClubRecapPdf() { return backendContext.buildEngagementClubRecapPdf; },
      set buildEngagementClubRecapPdf(value) { backendContext.buildEngagementClubRecapPdf = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get local$nativeClubEntryView() { return operation11().nativeClubEntryView; },
      get local$nativePortalCompetition() { return operation9().nativePortalCompetition; }
    });
    return cache18;
  }

  let cache19;
  function operation19() {
    if (!cache19) cache19 = require("./backend/server-competition-service/native-admin-competition-entries").createCompetitionService_nativeAdminCompetitionEntries({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get local$assertCanManageEngagementCompetition() { return operation1().assertCanManageEngagementCompetition; },
      get local$nativePortalCompetition() { return operation9().nativePortalCompetition; }
    });
    return cache19;
  }

  let cache20;
  function operation20() {
    if (!cache20) cache20 = require("./backend/server-competition-service/native-notification-preview").createCompetitionService_nativeNotificationPreview({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementCompetitionDocumentRecipients() { return backendContext.engagementCompetitionDocumentRecipients; },
      set engagementCompetitionDocumentRecipients(value) { backendContext.engagementCompetitionDocumentRecipients = value; },
      get engagementCompetitionNotificationRecipients() { return backendContext.engagementCompetitionNotificationRecipients; },
      set engagementCompetitionNotificationRecipients(value) { backendContext.engagementCompetitionNotificationRecipients = value; },
      get engagementCompetitionOpeningRecipients() { return backendContext.engagementCompetitionOpeningRecipients; },
      set engagementCompetitionOpeningRecipients(value) { backendContext.engagementCompetitionOpeningRecipients = value; },
      get engagementDedupMailRecipients() { return backendContext.engagementDedupMailRecipients; },
      set engagementDedupMailRecipients(value) { backendContext.engagementDedupMailRecipients = value; },
      get engagementMailRecipientFromContext() { return backendContext.engagementMailRecipientFromContext; },
      set engagementMailRecipientFromContext(value) { backendContext.engagementMailRecipientFromContext = value; },
      get engagementMailRecipientIndexStateRef() { return backendContext.engagementMailRecipientIndexStateRef; },
      set engagementMailRecipientIndexStateRef(value) { backendContext.engagementMailRecipientIndexStateRef = value; },
      get engagementMailRecipientsFromIndex() { return backendContext.engagementMailRecipientsFromIndex; },
      set engagementMailRecipientsFromIndex(value) { backendContext.engagementMailRecipientsFromIndex = value; },
      get engagementRecipientHasCapability() { return backendContext.engagementRecipientHasCapability; },
      set engagementRecipientHasCapability(value) { backendContext.engagementRecipientHasCapability = value; },
      get local$assertCanManageEngagementCompetition() { return operation1().assertCanManageEngagementCompetition; },
      get local$nativePortalCompetition() { return operation9().nativePortalCompetition; }
    });
    return cache20;
  }

  let cache21;
  function operation21() {
    if (!cache21) cache21 = require("./backend/server-competition-service/native-notification-automation-services").createCompetitionService_nativeNotificationAutomationServices({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get LIVEPALMES_STORAGE_BUCKET() { return backendContext.LIVEPALMES_STORAGE_BUCKET; },
      set LIVEPALMES_STORAGE_BUCKET(value) { backendContext.LIVEPALMES_STORAGE_BUCKET = value; },
      get REGION() { return backendContext.REGION; },
      set REGION(value) { backendContext.REGION = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get buildEngagementClubRecapPdf() { return backendContext.buildEngagementClubRecapPdf; },
      set buildEngagementClubRecapPdf(value) { backendContext.buildEngagementClubRecapPdf = value; },
      get buildEngagementCompetitionTxt() { return backendContext.buildEngagementCompetitionTxt; },
      set buildEngagementCompetitionTxt(value) { backendContext.buildEngagementCompetitionTxt = value; },
      get buildEngagementOfficialsPdf() { return backendContext.buildEngagementOfficialsPdf; },
      set buildEngagementOfficialsPdf(value) { backendContext.buildEngagementOfficialsPdf = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementClubRecapMailSubject() { return backendContext.engagementClubRecapMailSubject; },
      set engagementClubRecapMailSubject(value) { backendContext.engagementClubRecapMailSubject = value; },
      get engagementClubRecapMailText() { return backendContext.engagementClubRecapMailText; },
      set engagementClubRecapMailText(value) { backendContext.engagementClubRecapMailText = value; },
      get engagementCompetitionDocumentMailSubject() { return backendContext.engagementCompetitionDocumentMailSubject; },
      set engagementCompetitionDocumentMailSubject(value) { backendContext.engagementCompetitionDocumentMailSubject = value; },
      get engagementCompetitionDocumentMailText() { return backendContext.engagementCompetitionDocumentMailText; },
      set engagementCompetitionDocumentMailText(value) { backendContext.engagementCompetitionDocumentMailText = value; },
      get engagementCompetitionDocumentRecipients() { return backendContext.engagementCompetitionDocumentRecipients; },
      set engagementCompetitionDocumentRecipients(value) { backendContext.engagementCompetitionDocumentRecipients = value; },
      get engagementCompetitionNotificationRecipients() { return backendContext.engagementCompetitionNotificationRecipients; },
      set engagementCompetitionNotificationRecipients(value) { backendContext.engagementCompetitionNotificationRecipients = value; },
      get engagementCompetitionOpeningRecipients() { return backendContext.engagementCompetitionOpeningRecipients; },
      set engagementCompetitionOpeningRecipients(value) { backendContext.engagementCompetitionOpeningRecipients = value; },
      get engagementDedupMailRecipients() { return backendContext.engagementDedupMailRecipients; },
      set engagementDedupMailRecipients(value) { backendContext.engagementDedupMailRecipients = value; },
      get engagementMailAttachments() { return backendContext.engagementMailAttachments; },
      set engagementMailAttachments(value) { backendContext.engagementMailAttachments = value; },
      get engagementMailJobId() { return backendContext.engagementMailJobId; },
      set engagementMailJobId(value) { backendContext.engagementMailJobId = value; },
      get engagementMailRecipientFromUserDoc() { return backendContext.engagementMailRecipientFromUserDoc; },
      set engagementMailRecipientFromUserDoc(value) { backendContext.engagementMailRecipientFromUserDoc = value; },
      get engagementMailRecipientIndexStateRef() { return backendContext.engagementMailRecipientIndexStateRef; },
      set engagementMailRecipientIndexStateRef(value) { backendContext.engagementMailRecipientIndexStateRef = value; },
      get engagementMailRecipientsFromIndex() { return backendContext.engagementMailRecipientsFromIndex; },
      set engagementMailRecipientsFromIndex(value) { backendContext.engagementMailRecipientsFromIndex = value; },
      get engagementMailSmtpConfig() { return backendContext.engagementMailSmtpConfig; },
      set engagementMailSmtpConfig(value) { backendContext.engagementMailSmtpConfig = value; },
      get engagementOfficialsMailSubject() { return backendContext.engagementOfficialsMailSubject; },
      set engagementOfficialsMailSubject(value) { backendContext.engagementOfficialsMailSubject = value; },
      get engagementOfficialsMailText() { return backendContext.engagementOfficialsMailText; },
      set engagementOfficialsMailText(value) { backendContext.engagementOfficialsMailText = value; },
      get engagementOfficialsPdfRows() { return backendContext.engagementOfficialsPdfRows; },
      set engagementOfficialsPdfRows(value) { backendContext.engagementOfficialsPdfRows = value; },
      get engagementOpeningMailSubject() { return backendContext.engagementOpeningMailSubject; },
      set engagementOpeningMailSubject(value) { backendContext.engagementOpeningMailSubject = value; },
      get engagementOpeningMailText() { return backendContext.engagementOpeningMailText; },
      set engagementOpeningMailText(value) { backendContext.engagementOpeningMailText = value; },
      get engagementPdfFileName() { return backendContext.engagementPdfFileName; },
      set engagementPdfFileName(value) { backendContext.engagementPdfFileName = value; },
      get engagementRecipientHasCapability() { return backendContext.engagementRecipientHasCapability; },
      set engagementRecipientHasCapability(value) { backendContext.engagementRecipientHasCapability = value; },
      get engagementTxtMailSubject() { return backendContext.engagementTxtMailSubject; },
      set engagementTxtMailSubject(value) { backendContext.engagementTxtMailSubject = value; },
      get engagementTxtMailText() { return backendContext.engagementTxtMailText; },
      set engagementTxtMailText(value) { backendContext.engagementTxtMailText = value; },
      get engagementTxtSwimmerCategory() { return backendContext.engagementTxtSwimmerCategory; },
      set engagementTxtSwimmerCategory(value) { backendContext.engagementTxtSwimmerCategory = value; },
      get livePalmesMailHtml() { return backendContext.livePalmesMailHtml; },
      set livePalmesMailHtml(value) { backendContext.livePalmesMailHtml = value; },
      get nodemailer() { return backendContext.nodemailer; },
      set nodemailer(value) { backendContext.nodemailer = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; },
      get storage() { return backendContext.storage; },
      set storage(value) { backendContext.storage = value; },
      get local$nativePortalCompetition() { return operation9().nativePortalCompetition; }
    });
    return cache21;
  }

  let cache22;
  function operation22() {
    if (!cache22) cache22 = require("./backend/server-competition-service/enqueue-native-notification-task").createCompetitionService_enqueueNativeNotificationTask({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$nativeNotificationTaskServices() { return operation21().nativeNotificationTaskServices; }
    });
    return cache22;
  }

  let cache23;
  function operation23() {
    if (!cache23) cache23 = require("./backend/server-competition-service/deliver-native-notification-jobs").createCompetitionService_deliverNativeNotificationJobs({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementMailSmtpConfig() { return backendContext.engagementMailSmtpConfig; },
      set engagementMailSmtpConfig(value) { backendContext.engagementMailSmtpConfig = value; },
      get nodemailer() { return backendContext.nodemailer; },
      set nodemailer(value) { backendContext.nodemailer = value; },
      get sendEngagementMailJob() { return backendContext.sendEngagementMailJob; },
      set sendEngagementMailJob(value) { backendContext.sendEngagementMailJob = value; }
    });
    return cache23;
  }

  let cache24;
  function operation24() {
    if (!cache24) cache24 = require("./backend/server-competition-service/arm-native-competition-notification").createCompetitionService_armNativeCompetitionNotification({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$assertCanManageEngagementCompetition() { return operation1().assertCanManageEngagementCompetition; },
      get local$enqueueNativeNotificationTask() { return operation22().enqueueNativeNotificationTask; },
      get local$nativePortalCompetition() { return operation9().nativePortalCompetition; }
    });
    return cache24;
  }

  let cache25;
  function operation25() {
    if (!cache25) cache25 = require("./backend/server-competition-service/prepare-engagement-club-recap-email-jobs").createCompetitionService_prepareEngagementClubRecapEmailJobs({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementActiveClubMailRecipients() { return backendContext.engagementActiveClubMailRecipients; },
      set engagementActiveClubMailRecipients(value) { backendContext.engagementActiveClubMailRecipients = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementClubRecapMailSubject() { return backendContext.engagementClubRecapMailSubject; },
      set engagementClubRecapMailSubject(value) { backendContext.engagementClubRecapMailSubject = value; },
      get engagementClubRecapMailText() { return backendContext.engagementClubRecapMailText; },
      set engagementClubRecapMailText(value) { backendContext.engagementClubRecapMailText = value; },
      get engagementCompetitionDetailItem() { return backendContext.engagementCompetitionDetailItem; },
      set engagementCompetitionDetailItem(value) { backendContext.engagementCompetitionDetailItem = value; },
      get engagementCompetitionNotificationRecipients() { return backendContext.engagementCompetitionNotificationRecipients; },
      set engagementCompetitionNotificationRecipients(value) { backendContext.engagementCompetitionNotificationRecipients = value; },
      get engagementMailPreparedStatus() { return backendContext.engagementMailPreparedStatus; },
      set engagementMailPreparedStatus(value) { backendContext.engagementMailPreparedStatus = value; },
      get engagementRecipientsByClub() { return backendContext.engagementRecipientsByClub; },
      set engagementRecipientsByClub(value) { backendContext.engagementRecipientsByClub = value; },
      get getOrCreateEngagementClubRecapPdf() { return backendContext.getOrCreateEngagementClubRecapPdf; },
      set getOrCreateEngagementClubRecapPdf(value) { backendContext.getOrCreateEngagementClubRecapPdf = value; },
      get upsertEngagementMailJob() { return backendContext.upsertEngagementMailJob; },
      set upsertEngagementMailJob(value) { backendContext.upsertEngagementMailJob = value; }
    });
    return cache25;
  }

  let cache26;
  function operation26() {
    if (!cache26) cache26 = require("./backend/server-competition-service/engagement-closure-automation-context").createCompetitionService_engagementClosureAutomationContext({
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get cleanEngagementCompetitionType() { return backendContext.cleanEngagementCompetitionType; },
      set cleanEngagementCompetitionType(value) { backendContext.cleanEngagementCompetitionType = value; },
      get cleanEngagementEntryStatus() { return backendContext.cleanEngagementEntryStatus; },
      set cleanEngagementEntryStatus(value) { backendContext.cleanEngagementEntryStatus = value; },
      get cleanEngagementGeneratedFiles() { return backendContext.cleanEngagementGeneratedFiles; },
      set cleanEngagementGeneratedFiles(value) { backendContext.cleanEngagementGeneratedFiles = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDateTime() { return backendContext.cleanIsoDateTime; },
      set cleanIsoDateTime(value) { backendContext.cleanIsoDateTime = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementCompetitionDetailItem() { return backendContext.engagementCompetitionDetailItem; },
      set engagementCompetitionDetailItem(value) { backendContext.engagementCompetitionDetailItem = value; },
      get engagementMailPreparedStatus() { return backendContext.engagementMailPreparedStatus; },
      set engagementMailPreparedStatus(value) { backendContext.engagementMailPreparedStatus = value; },
      get engagementOfficialsMailSubject() { return backendContext.engagementOfficialsMailSubject; },
      set engagementOfficialsMailSubject(value) { backendContext.engagementOfficialsMailSubject = value; },
      get engagementOfficialsMailText() { return backendContext.engagementOfficialsMailText; },
      set engagementOfficialsMailText(value) { backendContext.engagementOfficialsMailText = value; },
      get engagementTxtMailSubject() { return backendContext.engagementTxtMailSubject; },
      set engagementTxtMailSubject(value) { backendContext.engagementTxtMailSubject = value; },
      get engagementTxtMailText() { return backendContext.engagementTxtMailText; },
      set engagementTxtMailText(value) { backendContext.engagementTxtMailText = value; },
      get getOrCreateEngagementCompetitionTxt() { return backendContext.getOrCreateEngagementCompetitionTxt; },
      set getOrCreateEngagementCompetitionTxt(value) { backendContext.getOrCreateEngagementCompetitionTxt = value; },
      get getOrCreateEngagementOfficialsPdf() { return backendContext.getOrCreateEngagementOfficialsPdf; },
      set getOrCreateEngagementOfficialsPdf(value) { backendContext.getOrCreateEngagementOfficialsPdf = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; },
      get upsertEngagementMailJob() { return backendContext.upsertEngagementMailJob; },
      set upsertEngagementMailJob(value) { backendContext.upsertEngagementMailJob = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get local$prepareEngagementClubRecapEmailJobs() { return operation25().prepareEngagementClubRecapEmailJobs; },
      get local$sendEngagementPreparedEmailJobs() { return operation27().sendEngagementPreparedEmailJobs; }
    });
    return cache26;
  }

  let cache27;
  function operation27() {
    if (!cache27) cache27 = require("./backend/server-competition-service/send-engagement-prepared-email-jobs").createCompetitionService_sendEngagementPreparedEmailJobs({
      get ENGAGEMENT_MAIL_CAPABILITIES() { return backendContext.ENGAGEMENT_MAIL_CAPABILITIES; },
      set ENGAGEMENT_MAIL_CAPABILITIES(value) { backendContext.ENGAGEMENT_MAIL_CAPABILITIES = value; },
      get ENGAGEMENT_MAIL_JOBS_COLLECTION() { return backendContext.ENGAGEMENT_MAIL_JOBS_COLLECTION; },
      set ENGAGEMENT_MAIL_JOBS_COLLECTION(value) { backendContext.ENGAGEMENT_MAIL_JOBS_COLLECTION = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get OPTIONAL_COMPETITION_MAIL_TYPES() { return backendContext.OPTIONAL_COMPETITION_MAIL_TYPES; },
      set OPTIONAL_COMPETITION_MAIL_TYPES(value) { backendContext.OPTIONAL_COMPETITION_MAIL_TYPES = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementActiveMailRecipients() { return backendContext.engagementActiveMailRecipients; },
      set engagementActiveMailRecipients(value) { backendContext.engagementActiveMailRecipients = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementCompetitionNotificationRecipients() { return backendContext.engagementCompetitionNotificationRecipients; },
      set engagementCompetitionNotificationRecipients(value) { backendContext.engagementCompetitionNotificationRecipients = value; },
      get engagementMailSmtpConfig() { return backendContext.engagementMailSmtpConfig; },
      set engagementMailSmtpConfig(value) { backendContext.engagementMailSmtpConfig = value; },
      get nodemailer() { return backendContext.nodemailer; },
      set nodemailer(value) { backendContext.nodemailer = value; },
      get sendEngagementMailJob() { return backendContext.sendEngagementMailJob; },
      set sendEngagementMailJob(value) { backendContext.sendEngagementMailJob = value; }
    });
    return cache27;
  }

  let cache28;
  function operation28() {
    if (!cache28) cache28 = require("./backend/server-competition-service/resolve-engagement-club-person-swimmer").createCompetitionService_resolveEngagementClubPersonSwimmer({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubRosterRef() { return backendContext.engagementClubRosterRef; },
      set engagementClubRosterRef(value) { backendContext.engagementClubRosterRef = value; },
      get engagementClubRosterSwimmersFromData() { return backendContext.engagementClubRosterSwimmersFromData; },
      set engagementClubRosterSwimmersFromData(value) { backendContext.engagementClubRosterSwimmersFromData = value; }
    });
    return cache28;
  }

  let cache29;
  function operation29() {
    if (!cache29) cache29 = require("./backend/server-competition-service/save-native-club-officials").createCompetitionService_saveNativeClubOfficials({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; },
      get local$nativeClubEntryView() { return operation11().nativeClubEntryView; }
    });
    return cache29;
  }
  return {
    cleanEngagementCompetitionPayload: operation0().cleanEngagementCompetitionPayload,
    assertCanManageEngagementCompetition: operation1().assertCanManageEngagementCompetition,
    engagementParisIsoDate: operation2().engagementParisIsoDate,
    engagementEventIsPast: operation2().engagementEventIsPast,
    assertCanModifyEngagementEvent: operation3().assertCanModifyEngagementEvent,
    assertCanDeleteEngagementDocument: operation4().assertCanDeleteEngagementDocument,
    engagementDeletionRequestId: operation5().engagementDeletionRequestId,
    engagementClubWriteLockReason: operation6().engagementClubWriteLockReason,
    assertEngagementClubWriteOpen: operation6().assertEngagementClubWriteOpen,
    nativePortalCalendarItems: operation7().nativePortalCalendarItems,
    nativeDocumentAuthors: operation8().nativeDocumentAuthors,
    nativePortalCompetition: operation9().nativePortalCompetition,
    createNativePortalCalendarRecord: operation10().createNativePortalCalendarRecord,
    nativeClubEntryView: operation11().nativeClubEntryView,
    engagementCompetitionDocumentUploader: operation12().engagementCompetitionDocumentUploader,
    assertEngagementCompetitionDocumentPath: operation13().assertEngagementCompetitionDocumentPath,
    hasManagedEngagementCompetitionDocumentStorage: operation13().hasManagedEngagementCompetitionDocumentStorage,
    engagementCompetitionDocumentContext: operation14().engagementCompetitionDocumentContext,
    nationalLibraryContext: operation15().nationalLibraryContext,
    manageNationalLibraryDocuments: operation16().manageNationalLibraryDocuments,
    notifyNationalLibraryDocument: operation17().notifyNationalLibraryDocument,
    mutateNativeCompetitionDocument: operation4().mutateNativeCompetitionDocument,
    generateNativeClubRecapPdf: operation18().generateNativeClubRecapPdf,
    nativeAdminCompetitionEntries: operation19().nativeAdminCompetitionEntries,
    nativeNotificationPreview: operation20().nativeNotificationPreview,
    nativeNotificationAutomationServices: operation21().nativeNotificationAutomationServices,
    nativeNotificationTaskServices: operation21().nativeNotificationTaskServices,
    enqueueNativeNotificationTask: operation22().enqueueNativeNotificationTask,
    deliverNativeNotificationJobs: operation23().deliverNativeNotificationJobs,
    armNativeCompetitionNotification: operation24().armNativeCompetitionNotification,
    queueNativeDocumentNotification: operation17().queueNativeDocumentNotification,
    prepareEngagementClubRecapEmailJobs: operation25().prepareEngagementClubRecapEmailJobs,
    prepareEngagementTxtEmailJob: operation26().prepareEngagementTxtEmailJob,
    prepareEngagementOfficialsEmailJob: operation26().prepareEngagementOfficialsEmailJob,
    sendEngagementPreparedEmailJobs: operation27().sendEngagementPreparedEmailJobs,
    engagementClosureAutomationContext: operation26().engagementClosureAutomationContext,
    reserveEngagementCompetitionClosure: operation26().reserveEngagementCompetitionClosure,
    processEngagementCompetitionAutomaticClosure: operation26().processEngagementCompetitionAutomaticClosure,
    resolveEngagementClubPersonSwimmer: operation28().resolveEngagementClubPersonSwimmer,
    saveNativeClubOfficials: operation29().saveNativeClubOfficials
  };
}

module.exports = { createCompetitionService };
