// Compatibility factory; operation modules hold the existing bodies.
function createMailService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-mail-service/engagement-mail-prepared-reason").createMailService_engagementMailPreparedReason({
      get ENGAGEMENT_MAIL_JOBS_COLLECTION() { return backendContext.ENGAGEMENT_MAIL_JOBS_COLLECTION; },
      set ENGAGEMENT_MAIL_JOBS_COLLECTION(value) { backendContext.ENGAGEMENT_MAIL_JOBS_COLLECTION = value; },
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementMailPreparedStatus() { return backendContext.engagementMailPreparedStatus; },
      set engagementMailPreparedStatus(value) { backendContext.engagementMailPreparedStatus = value; },
      get engagementMailSmtpConfig() { return backendContext.engagementMailSmtpConfig; },
      set engagementMailSmtpConfig(value) { backendContext.engagementMailSmtpConfig = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; },
      get local$engagementMailJobId() { return operation1().engagementMailJobId; },
      get local$engagementMailJobItemFromData() { return operation22().engagementMailJobItemFromData; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-mail-service/engagement-mail-job-id").createMailService_engagementMailJobId({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-mail-service/engagement-mail-recipient-from-user-doc").createMailService_engagementMailRecipientFromUserDoc({
      get ENGAGEMENT_MAIL_CAPABILITIES() { return backendContext.ENGAGEMENT_MAIL_CAPABILITIES; },
      set ENGAGEMENT_MAIL_CAPABILITIES(value) { backendContext.ENGAGEMENT_MAIL_CAPABILITIES = value; },
      get activeCapabilitiesFromMap() { return backendContext.activeCapabilitiesFromMap; },
      set activeCapabilitiesFromMap(value) { backendContext.activeCapabilitiesFromMap = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get competitionEmailNotificationsEnabled() { return backendContext.competitionEmailNotificationsEnabled; },
      set competitionEmailNotificationsEnabled(value) { backendContext.competitionEmailNotificationsEnabled = value; },
      get engagementClubName() { return backendContext.engagementClubName; },
      set engagementClubName(value) { backendContext.engagementClubName = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-mail-service/engagement-mail-recipient-shard-number").createMailService_engagementMailRecipientShardNumber({
      get ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT() { return backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT; },
      set ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT(value) { backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-mail-service/engagement-mail-recipient-shard-ref").createMailService_engagementMailRecipientShardRef({
      get ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION() { return backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION; },
      set ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION(value) { backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-mail-service/engagement-mail-recipient-index-state-ref").createMailService_engagementMailRecipientIndexStateRef({
      get ENGAGEMENT_MAIL_CAPABILITIES() { return backendContext.ENGAGEMENT_MAIL_CAPABILITIES; },
      set ENGAGEMENT_MAIL_CAPABILITIES(value) { backendContext.ENGAGEMENT_MAIL_CAPABILITIES = value; },
      get ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION() { return backendContext.ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION; },
      set ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION(value) { backendContext.ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION = value; },
      get ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT() { return backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT; },
      set ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT(value) { backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT = value; },
      get local$engagementMailRecipientShardRef() { return operation4().engagementMailRecipientShardRef; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-mail-service/engagement-mail-recipient-index-key").createMailService_engagementMailRecipientIndexKey({
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-mail-service/assert-engagement-club-admin-directory-size").createMailService_assertEngagementClubAdminDirectorySize({
      get ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION() { return backendContext.ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION; },
      set ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION(value) { backendContext.ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION = value; },
      get ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES() { return backendContext.ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES; },
      set ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES(value) { backendContext.ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; },
      get local$engagementRecipientHasCapability() { return operation13().engagementRecipientHasCapability; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-mail-service/engagement-club-admin-directory-map").createMailService_engagementClubAdminDirectoryMap({
      get local$assertEngagementClubAdminDirectorySize() { return operation7().assertEngagementClubAdminDirectorySize; },
      get local$engagementClubAdminDirectoryEntry() { return operation7().engagementClubAdminDirectoryEntry; },
      get local$engagementClubAdminDirectoryRef() { return operation7().engagementClubAdminDirectoryRef; },
      get local$engagementMailRecipientIndexKey() { return operation6().engagementMailRecipientIndexKey; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-mail-service/update-engagement-club-admin-directory").createMailService_updateEngagementClubAdminDirectory({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$assertEngagementClubAdminDirectorySize() { return operation7().assertEngagementClubAdminDirectorySize; },
      get local$engagementClubAdminDirectoryEntry() { return operation7().engagementClubAdminDirectoryEntry; },
      get local$engagementClubAdminDirectoryRef() { return operation7().engagementClubAdminDirectoryRef; },
      get local$engagementMailRecipientIndexKey() { return operation6().engagementMailRecipientIndexKey; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-mail-service/read-engagement-club-admin-directory").createMailService_readEngagementClubAdminDirectory({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$engagementClubAdminDirectoryRef() { return operation7().engagementClubAdminDirectoryRef; },
      get local$engagementMailRecipientIndexStateRef() { return operation5().engagementMailRecipientIndexStateRef; },
      get local$engagementMailRecipientsFromIndex() { return operation5().engagementMailRecipientsFromIndex; },
      get local$writeEngagementClubAdminDirectory() { return operation8().writeEngagementClubAdminDirectory; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-mail-service/engagement-mail-recipient-shard-groups").createMailService_engagementMailRecipientShardGroups({
      get ENGAGEMENT_MAIL_CAPABILITIES() { return backendContext.ENGAGEMENT_MAIL_CAPABILITIES; },
      set ENGAGEMENT_MAIL_CAPABILITIES(value) { backendContext.ENGAGEMENT_MAIL_CAPABILITIES = value; },
      get local$engagementMailRecipientIndexKey() { return operation6().engagementMailRecipientIndexKey; },
      get local$engagementMailRecipientShardNumber() { return operation3().engagementMailRecipientShardNumber; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-mail-service/bootstrap-engagement-mail-recipient-index").createMailService_bootstrapEngagementMailRecipientIndex({
      get ENGAGEMENT_MAIL_CAPABILITIES() { return backendContext.ENGAGEMENT_MAIL_CAPABILITIES; },
      set ENGAGEMENT_MAIL_CAPABILITIES(value) { backendContext.ENGAGEMENT_MAIL_CAPABILITIES = value; },
      get ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT() { return backendContext.ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT; },
      set ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT(value) { backendContext.ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT = value; },
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get local$engagementMailRecipientFromUserDoc() { return operation2().engagementMailRecipientFromUserDoc; },
      get local$engagementMailRecipientIndexStateRef() { return operation5().engagementMailRecipientIndexStateRef; },
      get local$engagementMailRecipientShardGroups() { return operation11().engagementMailRecipientShardGroups; },
      get local$engagementMailRecipientShardRef() { return operation4().engagementMailRecipientShardRef; },
      get local$engagementMailRecipientShardRefs() { return operation5().engagementMailRecipientShardRefs; },
      get local$engagementMailRecipientsFromIndex() { return operation5().engagementMailRecipientsFromIndex; },
      get local$engagementRecipientHasCapability() { return operation13().engagementRecipientHasCapability; },
      get local$writeEngagementClubAdminDirectory() { return operation8().writeEngagementClubAdminDirectory; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/server-mail-service/engagement-recipient-has-capability").createMailService_engagementRecipientHasCapability({

    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/server-mail-service/engagement-competition-document-recipients").createMailService_engagementCompetitionDocumentRecipients({
      get cleanEngagementCompetitionLevel() { return backendContext.cleanEngagementCompetitionLevel; },
      set cleanEngagementCompetitionLevel(value) { backendContext.cleanEngagementCompetitionLevel = value; },
      get cleanEngagementRegionIds() { return backendContext.cleanEngagementRegionIds; },
      set cleanEngagementRegionIds(value) { backendContext.cleanEngagementRegionIds = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get isNationalOnlyEngagementCompetitionLevel() { return backendContext.isNationalOnlyEngagementCompetitionLevel; },
      set isNationalOnlyEngagementCompetitionLevel(value) { backendContext.isNationalOnlyEngagementCompetitionLevel = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; },
      get normalizedEngagementRegionKey() { return backendContext.normalizedEngagementRegionKey; },
      set normalizedEngagementRegionKey(value) { backendContext.normalizedEngagementRegionKey = value; },
      get local$engagementRecipientHasCapability() { return operation13().engagementRecipientHasCapability; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/server-mail-service/engagement-active-club-mail-recipients").createMailService_engagementActiveClubMailRecipients({
      get local$engagementActiveMailRecipients() { return operation12().engagementActiveMailRecipients; },
      get local$engagementRecipientHasCapability() { return operation13().engagementRecipientHasCapability; }
    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/server-mail-service/engagement-mail-recipient-from-context").createMailService_engagementMailRecipientFromContext({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; }
    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/server-mail-service/engagement-competition-document-mail-subject").createMailService_engagementCompetitionDocumentMailSubject({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get competitionMailLines() { return backendContext.competitionMailLines; },
      set competitionMailLines(value) { backendContext.competitionMailLines = value; }
    });
    return cache17;
  }

  let cache18;
  function operation18() {
    if (!cache18) cache18 = require("./backend/server-mail-service/engagement-competition-document-mail-html").createMailService_engagementCompetitionDocumentMailHtml({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get competitionMailLines() { return backendContext.competitionMailLines; },
      set competitionMailLines(value) { backendContext.competitionMailLines = value; },
      get escapeMailHtml() { return backendContext.escapeMailHtml; },
      set escapeMailHtml(value) { backendContext.escapeMailHtml = value; }
    });
    return cache18;
  }

  let cache19;
  function operation19() {
    if (!cache19) cache19 = require("./backend/server-mail-service/engagement-recipients-by-club").createMailService_engagementRecipientsByClub({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache19;
  }

  let cache20;
  function operation20() {
    if (!cache20) cache20 = require("./backend/server-mail-service/engagement-opening-mail-subject").createMailService_engagementOpeningMailSubject({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get competitionMailDateTime() { return backendContext.competitionMailDateTime; },
      set competitionMailDateTime(value) { backendContext.competitionMailDateTime = value; },
      get competitionMailLines() { return backendContext.competitionMailLines; },
      set competitionMailLines(value) { backendContext.competitionMailLines = value; }
    });
    return cache20;
  }

  let cache21;
  function operation21() {
    if (!cache21) cache21 = require("./backend/server-mail-service/engagement-club-recap-mail-subject").createMailService_engagementClubRecapMailSubject({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get competitionMailLines() { return backendContext.competitionMailLines; },
      set competitionMailLines(value) { backendContext.competitionMailLines = value; },
      get engagementPdfFeeTotal() { return backendContext.engagementPdfFeeTotal; },
      set engagementPdfFeeTotal(value) { backendContext.engagementPdfFeeTotal = value; },
      get engagementPdfMoney() { return backendContext.engagementPdfMoney; },
      set engagementPdfMoney(value) { backendContext.engagementPdfMoney = value; }
    });
    return cache21;
  }

  let cache22;
  function operation22() {
    if (!cache22) cache22 = require("./backend/server-mail-service/engagement-mail-job-item-from-data").createMailService_engagementMailJobItemFromData({
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubCode() { return backendContext.engagementClubCode; },
      set engagementClubCode(value) { backendContext.engagementClubCode = value; },
      get engagementMailStatusLabel() { return backendContext.engagementMailStatusLabel; },
      set engagementMailStatusLabel(value) { backendContext.engagementMailStatusLabel = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; }
    });
    return cache22;
  }

  let cache23;
  function operation23() {
    if (!cache23) cache23 = require("./backend/server-mail-service/engagement-mail-attachments").createMailService_engagementMailAttachments({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; },
      get readStoredEngagementClubRecapPdf() { return backendContext.readStoredEngagementClubRecapPdf; },
      set readStoredEngagementClubRecapPdf(value) { backendContext.readStoredEngagementClubRecapPdf = value; }
    });
    return cache23;
  }

  let cache24;
  function operation24() {
    if (!cache24) cache24 = require("./backend/server-mail-service/engagement-mail-with-notification-preference-footer").createMailService_engagementMailWithNotificationPreferenceFooter({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get OPTIONAL_COMPETITION_MAIL_TYPES() { return backendContext.OPTIONAL_COMPETITION_MAIL_TYPES; },
      set OPTIONAL_COMPETITION_MAIL_TYPES(value) { backendContext.OPTIONAL_COMPETITION_MAIL_TYPES = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get competitionNotificationPreferenceUrl() { return backendContext.competitionNotificationPreferenceUrl; },
      set competitionNotificationPreferenceUrl(value) { backendContext.competitionNotificationPreferenceUrl = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get escapeMailHtml() { return backendContext.escapeMailHtml; },
      set escapeMailHtml(value) { backendContext.escapeMailHtml = value; },
      get livePalmesMailHtml() { return backendContext.livePalmesMailHtml; },
      set livePalmesMailHtml(value) { backendContext.livePalmesMailHtml = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; },
      get local$engagementMailAttachments() { return operation23().engagementMailAttachments; },
      get local$engagementMailJobItemFromData() { return operation22().engagementMailJobItemFromData; }
    });
    return cache24;
  }
  return {
    engagementMailPreparedReason: operation0().engagementMailPreparedReason,
    engagementMailJobId: operation1().engagementMailJobId,
    engagementMailRecipientFromUserDoc: operation2().engagementMailRecipientFromUserDoc,
    engagementMailRecipientShardNumber: operation3().engagementMailRecipientShardNumber,
    engagementMailRecipientShardRef: operation4().engagementMailRecipientShardRef,
    engagementMailRecipientIndexStateRef: operation5().engagementMailRecipientIndexStateRef,
    engagementMailRecipientIndexKey: operation6().engagementMailRecipientIndexKey,
    engagementClubAdminDirectoryRef: operation7().engagementClubAdminDirectoryRef,
    engagementClubAdminDirectoryEntry: operation7().engagementClubAdminDirectoryEntry,
    engagementClubAdminDirectoryMap: operation8().engagementClubAdminDirectoryMap,
    assertEngagementClubAdminDirectorySize: operation7().assertEngagementClubAdminDirectorySize,
    writeEngagementClubAdminDirectory: operation8().writeEngagementClubAdminDirectory,
    updateEngagementClubAdminDirectory: operation9().updateEngagementClubAdminDirectory,
    readEngagementClubAdminDirectory: operation10().readEngagementClubAdminDirectory,
    engagementMailRecipientShardRefs: operation5().engagementMailRecipientShardRefs,
    engagementMailRecipientShardGroups: operation11().engagementMailRecipientShardGroups,
    replaceEngagementMailRecipientIndex: operation12().replaceEngagementMailRecipientIndex,
    bootstrapEngagementMailRecipientIndex: operation12().bootstrapEngagementMailRecipientIndex,
    engagementMailRecipientsFromIndex: operation5().engagementMailRecipientsFromIndex,
    engagementRecipientHasCapability: operation13().engagementRecipientHasCapability,
    engagementCompetitionNotificationRecipients: operation14().engagementCompetitionNotificationRecipients,
    engagementActiveMailRecipients: operation12().engagementActiveMailRecipients,
    engagementActiveClubMailRecipients: operation15().engagementActiveClubMailRecipients,
    engagementMailRecipientFromContext: operation16().engagementMailRecipientFromContext,
    engagementDedupMailRecipients: operation14().engagementDedupMailRecipients,
    engagementCompetitionOpeningRecipients: operation14().engagementCompetitionOpeningRecipients,
    engagementCompetitionDocumentRecipients: operation14().engagementCompetitionDocumentRecipients,
    engagementCompetitionDocumentMailSubject: operation17().engagementCompetitionDocumentMailSubject,
    engagementCompetitionDocumentMailText: operation17().engagementCompetitionDocumentMailText,
    engagementCompetitionDocumentMailHtml: operation18().engagementCompetitionDocumentMailHtml,
    engagementRecipientsByClub: operation19().engagementRecipientsByClub,
    engagementOpeningMailSubject: operation20().engagementOpeningMailSubject,
    engagementOpeningMailText: operation20().engagementOpeningMailText,
    engagementClubRecapMailSubject: operation21().engagementClubRecapMailSubject,
    engagementClubRecapMailText: operation21().engagementClubRecapMailText,
    engagementTxtMailSubject: operation17().engagementTxtMailSubject,
    engagementTxtMailText: operation17().engagementTxtMailText,
    engagementOfficialsMailSubject: operation17().engagementOfficialsMailSubject,
    engagementOfficialsMailText: operation17().engagementOfficialsMailText,
    engagementMailJobItemFromData: operation22().engagementMailJobItemFromData,
    upsertEngagementMailJob: operation0().upsertEngagementMailJob,
    engagementMailAttachments: operation23().engagementMailAttachments,
    engagementMailWithNotificationPreferenceFooter: operation24().engagementMailWithNotificationPreferenceFooter,
    sendEngagementMailJob: operation24().sendEngagementMailJob
  };
}

module.exports = { createMailService };
