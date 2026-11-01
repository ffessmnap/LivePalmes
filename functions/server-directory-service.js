// Compatibility factory; operation modules hold the existing bodies.
function createDirectoryService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-directory-service/clean-engagement-access-request-payload").createDirectoryService_cleanEngagementAccessRequestPayload({
      get CLUB_REFERENCE_BY_FEDERAL_NUMBER() { return backendContext.CLUB_REFERENCE_BY_FEDERAL_NUMBER; },
      set CLUB_REFERENCE_BY_FEDERAL_NUMBER(value) { backendContext.CLUB_REFERENCE_BY_FEDERAL_NUMBER = value; },
      get ENGAGEMENT_CLUBS_COLLECTION() { return backendContext.ENGAGEMENT_CLUBS_COLLECTION; },
      set ENGAGEMENT_CLUBS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUBS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertEmail() { return backendContext.assertEmail; },
      set assertEmail(value) { backendContext.assertEmail = value; },
      get auth() { return backendContext.auth; },
      set auth(value) { backendContext.auth = value; },
      get cleanClubPayload() { return backendContext.cleanClubPayload; },
      set cleanClubPayload(value) { backendContext.cleanClubPayload = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubCode() { return backendContext.engagementClubCode; },
      set engagementClubCode(value) { backendContext.engagementClubCode = value; },
      get engagementClubRegionId() { return backendContext.engagementClubRegionId; },
      set engagementClubRegionId(value) { backendContext.engagementClubRegionId = value; },
      get engagementStoredClubItem() { return backendContext.engagementStoredClubItem; },
      set engagementStoredClubItem(value) { backendContext.engagementStoredClubItem = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-directory-service/engagement-access-request-item").createDirectoryService_engagementAccessRequestItem({
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-directory-service/assert-engagement-access-request-scope").createDirectoryService_assertEngagementAccessRequestScope({
      get ENGAGEMENT_CLUBS_COLLECTION() { return backendContext.ENGAGEMENT_CLUBS_COLLECTION; },
      set ENGAGEMENT_CLUBS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUBS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanClubPayload() { return backendContext.cleanClubPayload; },
      set cleanClubPayload(value) { backendContext.cleanClubPayload = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessRejection() { return backendContext.engagementAccessRejection; },
      set engagementAccessRejection(value) { backendContext.engagementAccessRejection = value; },
      get engagementMailSmtpConfig() { return backendContext.engagementMailSmtpConfig; },
      set engagementMailSmtpConfig(value) { backendContext.engagementMailSmtpConfig = value; },
      get livePalmesMailHtml() { return backendContext.livePalmesMailHtml; },
      set livePalmesMailHtml(value) { backendContext.livePalmesMailHtml = value; },
      get nodemailer() { return backendContext.nodemailer; },
      set nodemailer(value) { backendContext.nodemailer = value; },
      get publicEngagementClubDirectoryRef() { return backendContext.publicEngagementClubDirectoryRef; },
      set publicEngagementClubDirectoryRef(value) { backendContext.publicEngagementClubDirectoryRef = value; },
      get publicEngagementClubItem() { return backendContext.publicEngagementClubItem; },
      set publicEngagementClubItem(value) { backendContext.publicEngagementClubItem = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; },
      get local$findEngagementClubByFederalNumber() { return operation0().findEngagementClubByFederalNumber; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-directory-service/consume-public-access-request-rate-limit").createDirectoryService_consumePublicAccessRequestRateLimit({
      get CLUB_REFERENCE_REGION_LABELS() { return backendContext.CLUB_REFERENCE_REGION_LABELS; },
      set CLUB_REFERENCE_REGION_LABELS(value) { backendContext.CLUB_REFERENCE_REGION_LABELS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PORTAL_ACCESS_RATE_LIMIT_COLLECTION() { return backendContext.PORTAL_ACCESS_RATE_LIMIT_COLLECTION; },
      set PORTAL_ACCESS_RATE_LIMIT_COLLECTION(value) { backendContext.PORTAL_ACCESS_RATE_LIMIT_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessAcknowledgement() { return backendContext.engagementAccessAcknowledgement; },
      set engagementAccessAcknowledgement(value) { backendContext.engagementAccessAcknowledgement = value; },
      get engagementAccessAdminNotification() { return backendContext.engagementAccessAdminNotification; },
      set engagementAccessAdminNotification(value) { backendContext.engagementAccessAdminNotification = value; },
      get engagementAccessAdminNotificationRecipients() { return backendContext.engagementAccessAdminNotificationRecipients; },
      set engagementAccessAdminNotificationRecipients(value) { backendContext.engagementAccessAdminNotificationRecipients = value; },
      get engagementActiveMailRecipients() { return backendContext.engagementActiveMailRecipients; },
      set engagementActiveMailRecipients(value) { backendContext.engagementActiveMailRecipients = value; },
      get engagementClubCode() { return backendContext.engagementClubCode; },
      set engagementClubCode(value) { backendContext.engagementClubCode = value; },
      get engagementClubName() { return backendContext.engagementClubName; },
      set engagementClubName(value) { backendContext.engagementClubName = value; },
      get engagementExistingAccountNotice() { return backendContext.engagementExistingAccountNotice; },
      set engagementExistingAccountNotice(value) { backendContext.engagementExistingAccountNotice = value; },
      get engagementMailSmtpConfig() { return backendContext.engagementMailSmtpConfig; },
      set engagementMailSmtpConfig(value) { backendContext.engagementMailSmtpConfig = value; },
      get livePalmesMailHtml() { return backendContext.livePalmesMailHtml; },
      set livePalmesMailHtml(value) { backendContext.livePalmesMailHtml = value; },
      get nextPortalAccessRateLimit() { return backendContext.nextPortalAccessRateLimit; },
      set nextPortalAccessRateLimit(value) { backendContext.nextPortalAccessRateLimit = value; },
      get nodemailer() { return backendContext.nodemailer; },
      set nodemailer(value) { backendContext.nodemailer = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get local$engagementAccessExistingClubPayload() { return operation0().engagementAccessExistingClubPayload; },
      get local$findEngagementClubByFederalNumber() { return operation0().findEngagementClubByFederalNumber; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-directory-service/access-user-list-item-from-data").createDirectoryService_accessUserListItemFromData({
      get activeCapabilitiesFromMap() { return backendContext.activeCapabilitiesFromMap; },
      set activeCapabilitiesFromMap(value) { backendContext.activeCapabilitiesFromMap = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-directory-service/access-user-contains-search").createDirectoryService_accessUserContainsSearch({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$accessUserListItemFromData() { return operation4().accessUserListItemFromData; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-directory-service/access-directory-snapshot-entry").createDirectoryService_accessDirectorySnapshotEntry({
      get ACCESS_DIRECTORY_SNAPSHOT_VERSION() { return backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION; },
      set ACCESS_DIRECTORY_SNAPSHOT_VERSION(value) { backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION = value; },
      get accessDirectorySnapshotRef() { return backendContext.accessDirectorySnapshotRef; },
      set accessDirectorySnapshotRef(value) { backendContext.accessDirectorySnapshotRef = value; },
      get accessUserRegionIdFromData() { return backendContext.accessUserRegionIdFromData; },
      set accessUserRegionIdFromData(value) { backendContext.accessUserRegionIdFromData = value; },
      get local$accessUserListItemFromData() { return operation4().accessUserListItemFromData; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-directory-service/same-access-directory-snapshot-entry").createDirectoryService_sameAccessDirectorySnapshotEntry({

    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-directory-service/access-user-deletion-request-item").createDirectoryService_accessUserDeletionRequestItem({

    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-directory-service/delete-access-user-account").createDirectoryService_deleteAccessUserAccount({
      get ACCESS_CAPABILITIES() { return backendContext.ACCESS_CAPABILITIES; },
      set ACCESS_CAPABILITIES(value) { backendContext.ACCESS_CAPABILITIES = value; },
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get activeCapabilitiesFromMap() { return backendContext.activeCapabilitiesFromMap; },
      set activeCapabilitiesFromMap(value) { backendContext.activeCapabilitiesFromMap = value; },
      get auth() { return backendContext.auth; },
      set auth(value) { backendContext.auth = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-directory-service/set-competition-email-notification-preference").createDirectoryService_setCompetitionEmailNotificationPreference({
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementMailRecipientFromUserDoc() { return backendContext.engagementMailRecipientFromUserDoc; },
      set engagementMailRecipientFromUserDoc(value) { backendContext.engagementMailRecipientFromUserDoc = value; },
      get engagementMailRecipientIndexKey() { return backendContext.engagementMailRecipientIndexKey; },
      set engagementMailRecipientIndexKey(value) { backendContext.engagementMailRecipientIndexKey = value; },
      get engagementMailRecipientShardNumber() { return backendContext.engagementMailRecipientShardNumber; },
      set engagementMailRecipientShardNumber(value) { backendContext.engagementMailRecipientShardNumber = value; },
      get engagementMailRecipientShardRef() { return backendContext.engagementMailRecipientShardRef; },
      set engagementMailRecipientShardRef(value) { backendContext.engagementMailRecipientShardRef = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache10;
  }
  return {
    cleanEngagementAccessRequestPayload: operation0().cleanEngagementAccessRequestPayload,
    engagementAccessRequestItem: operation1().engagementAccessRequestItem,
    assertEngagementAccessRequestScope: operation2().assertEngagementAccessRequestScope,
    engagementAccessExistingClubPayload: operation0().engagementAccessExistingClubPayload,
    findEngagementClubByFederalNumber: operation0().findEngagementClubByFederalNumber,
    resolveExistingClubForAccessRequest: operation3().resolveExistingClubForAccessRequest,
    createClubFromEngagementAccessRequest: operation2().createClubFromEngagementAccessRequest,
    sendEngagementAccessAcknowledgement: operation3().sendEngagementAccessAcknowledgement,
    sendEngagementAccessRejection: operation2().sendEngagementAccessRejection,
    sendEngagementExistingAccountNotice: operation3().sendEngagementExistingAccountNotice,
    engagementExistingAccessAccount: operation0().engagementExistingAccessAccount,
    consumePublicAccessRequestRateLimit: operation3().consumePublicAccessRequestRateLimit,
    sendEngagementAccessAdminNotifications: operation3().sendEngagementAccessAdminNotifications,
    accessUserListItemFromData: operation4().accessUserListItemFromData,
    accessUserListItem: operation5().accessUserListItem,
    accessDirectorySnapshotEntry: operation6().accessDirectorySnapshotEntry,
    accessDirectorySnapshotRegionId: operation6().accessDirectorySnapshotRegionId,
    sameAccessDirectorySnapshotEntry: operation7().sameAccessDirectorySnapshotEntry,
    mergeAccessDirectorySnapshotEntries: operation6().mergeAccessDirectorySnapshotEntries,
    accessUserDeletionRequestItem: operation8().accessUserDeletionRequestItem,
    accessUserMatchesFilters: operation5().accessUserMatchesFilters,
    normalizedDirectoryText: operation5().normalizedDirectoryText,
    accessUserContainsSearch: operation5().accessUserContainsSearch,
    searchAccessUserDocuments: operation5().searchAccessUserDocuments,
    deleteAccessUserAccount: operation9().deleteAccessUserAccount,
    setCompetitionEmailNotificationPreference: operation10().setCompetitionEmailNotificationPreference
  };
}

module.exports = { createDirectoryService };
