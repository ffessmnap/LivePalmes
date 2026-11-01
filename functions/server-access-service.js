// Compatibility factory; operation modules hold the existing bodies.
function createAccessService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-access-service/portal-read-stats").createAccessService_portalReadStats({

    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-access-service/clean-engagement-relay-mixed-mode").createAccessService_cleanEngagementRelayMixedMode({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
      set ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES(value) { backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = value; },
      get ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES() { return backendContext.ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES; },
      set ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES(value) { backendContext.ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES = value; },
      get ENGAGEMENT_RELAY_CATEGORY_CODES() { return backendContext.ENGAGEMENT_RELAY_CATEGORY_CODES; },
      set ENGAGEMENT_RELAY_CATEGORY_CODES(value) { backendContext.ENGAGEMENT_RELAY_CATEGORY_CODES = value; },
      get ENGAGEMENT_RELAY_MIXED_MODES() { return backendContext.ENGAGEMENT_RELAY_MIXED_MODES; },
      set ENGAGEMENT_RELAY_MIXED_MODES(value) { backendContext.ENGAGEMENT_RELAY_MIXED_MODES = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-access-service/competition-email-notifications-enabled").createAccessService_competitionEmailNotificationsEnabled({

    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-access-service/competition-notification-preference-token").createAccessService_competitionNotificationPreferenceToken({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get LIVEPALMES_NOTIFICATION_LINK_SECRET() { return backendContext.LIVEPALMES_NOTIFICATION_LINK_SECRET; },
      set LIVEPALMES_NOTIFICATION_LINK_SECRET(value) { backendContext.LIVEPALMES_NOTIFICATION_LINK_SECRET = value; },
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-access-service/valid-competition-notification-preference-token").createAccessService_validCompetitionNotificationPreferenceToken({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; },
      get local$competitionNotificationPreferenceToken() { return operation3().competitionNotificationPreferenceToken; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-access-service/competition-notification-preference-url").createAccessService_competitionNotificationPreferenceUrl({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get local$competitionNotificationPreferenceToken() { return operation3().competitionNotificationPreferenceToken; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-access-service/engagement-club-region-id").createAccessService_engagementClubRegionId({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get CLUB_REFERENCE_REGION_LABELS() { return backendContext.CLUB_REFERENCE_REGION_LABELS; },
      set CLUB_REFERENCE_REGION_LABELS(value) { backendContext.CLUB_REFERENCE_REGION_LABELS = value; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-access-service/engagement-club-code").createAccessService_engagementClubCode({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get CLUB_REFERENCE_BY_ID() { return backendContext.CLUB_REFERENCE_BY_ID; },
      set CLUB_REFERENCE_BY_ID(value) { backendContext.CLUB_REFERENCE_BY_ID = value; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-access-service/engagement-club-name").createAccessService_engagementClubName({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get CLUB_REFERENCE_BY_ID() { return backendContext.CLUB_REFERENCE_BY_ID; },
      set CLUB_REFERENCE_BY_ID(value) { backendContext.CLUB_REFERENCE_BY_ID = value; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-access-service/engagement-stored-club-item").createAccessService_engagementStoredClubItem({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$cleanFirestoreValue() { return operation14().cleanFirestoreValue; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-access-service/public-engagement-club-item").createAccessService_publicEngagementClubItem({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$cleanFirestoreValue() { return operation14().cleanFirestoreValue; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-access-service/public-engagement-club-directory-ref").createAccessService_publicEngagementClubDirectoryRef({
      get ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION() { return backendContext.ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION; },
      set ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION(value) { backendContext.ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-access-service/engagement-clubs-by-ids").createAccessService_engagementClubsByIds({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get CLUB_REFERENCE_BY_ID() { return backendContext.CLUB_REFERENCE_BY_ID; },
      set CLUB_REFERENCE_BY_ID(value) { backendContext.CLUB_REFERENCE_BY_ID = value; },
      get ENGAGEMENT_CLUBS_COLLECTION() { return backendContext.ENGAGEMENT_CLUBS_COLLECTION; },
      set ENGAGEMENT_CLUBS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUBS_COLLECTION = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$engagementStoredClubItem() { return operation9().engagementStoredClubItem; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/server-access-service/engagement-club-access-context").createAccessService_engagementClubAccessContext({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get ACCESS_CAPABILITIES() { return backendContext.ACCESS_CAPABILITIES; },
      set ACCESS_CAPABILITIES(value) { backendContext.ACCESS_CAPABILITIES = value; },
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get CLUB_REFERENCE_REGION_LABELS() { return backendContext.CLUB_REFERENCE_REGION_LABELS; },
      set CLUB_REFERENCE_REGION_LABELS(value) { backendContext.CLUB_REFERENCE_REGION_LABELS = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$canonicalAccessDirectoryRegionId() { return operation22().canonicalAccessDirectoryRegionId; },
      get local$capabilitiesMap() { return operation25().capabilitiesMap; },
      get local$engagementClubRegionId() { return operation6().engagementClubRegionId; },
      get local$engagementClubsByIds() { return operation12().engagementClubsByIds; },
      get local$normalizedAccessScope() { return operation31().normalizedAccessScope; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/server-access-service/clean-firestore-value").createAccessService_cleanFirestoreValue({

    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/server-access-service/competition-id-from").createAccessService_competitionIdFrom({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get COMPETITION_IDS() { return backendContext.COMPETITION_IDS; },
      set COMPETITION_IDS(value) { backendContext.COMPETITION_IDS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; }
    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/server-access-service/assert-admin").createAccessService_assertAdmin({
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; }
    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/server-access-service/assert-capability").createAccessService_assertCapability({
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; }
    });
    return cache17;
  }

  let cache18;
  function operation18() {
    if (!cache18) cache18 = require("./backend/server-access-service/assert-live-palmes-access").createAccessService_assertLivePalmesAccess({
      get ACCESS_CAPABILITIES() { return backendContext.ACCESS_CAPABILITIES; },
      set ACCESS_CAPABILITIES(value) { backendContext.ACCESS_CAPABILITIES = value; },
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$activeCapabilitiesFromMap() { return operation26().activeCapabilitiesFromMap; }
    });
    return cache18;
  }

  let cache19;
  function operation19() {
    if (!cache19) cache19 = require("./backend/server-access-service/normalize-email").createAccessService_normalizeEmail({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache19;
  }

  let cache20;
  function operation20() {
    if (!cache20) cache20 = require("./backend/server-access-service/normalized-engagement-region-key").createAccessService_normalizedEngagementRegionKey({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get CLUB_REFERENCE_REGION_LABELS() { return backendContext.CLUB_REFERENCE_REGION_LABELS; },
      set CLUB_REFERENCE_REGION_LABELS(value) { backendContext.CLUB_REFERENCE_REGION_LABELS = value; }
    });
    return cache20;
  }

  let cache21;
  function operation21() {
    if (!cache21) cache21 = require("./backend/server-access-service/engagement-regions-match").createAccessService_engagementRegionsMatch({
      get local$normalizedEngagementRegionKey() { return operation20().normalizedEngagementRegionKey; }
    });
    return cache21;
  }

  let cache22;
  function operation22() {
    if (!cache22) cache22 = require("./backend/server-access-service/canonical-access-directory-region-id").createAccessService_canonicalAccessDirectoryRegionId({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get CLUB_REFERENCE_REGION_LABELS() { return backendContext.CLUB_REFERENCE_REGION_LABELS; },
      set CLUB_REFERENCE_REGION_LABELS(value) { backendContext.CLUB_REFERENCE_REGION_LABELS = value; },
      get local$normalizedEngagementRegionKey() { return operation20().normalizedEngagementRegionKey; }
    });
    return cache22;
  }

  let cache23;
  function operation23() {
    if (!cache23) cache23 = require("./backend/server-access-service/assert-email").createAccessService_assertEmail({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; }
    });
    return cache23;
  }

  let cache24;
  function operation24() {
    if (!cache24) cache24 = require("./backend/server-access-service/access-scope-for-capability").createAccessService_accessScopeForCapability({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get ACCESS_CAPABILITY_SET() { return backendContext.ACCESS_CAPABILITY_SET; },
      set ACCESS_CAPABILITY_SET(value) { backendContext.ACCESS_CAPABILITY_SET = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get local$assertEmail() { return operation23().assertEmail; },
      get local$canonicalAccessDirectoryRegionId() { return operation22().canonicalAccessDirectoryRegionId; },
      get local$normalizeEmail() { return operation19().normalizeEmail; },
      get local$normalizedAccessScope() { return operation31().normalizedAccessScope; }
    });
    return cache24;
  }

  let cache25;
  function operation25() {
    if (!cache25) cache25 = require("./backend/server-access-service/capabilities-map").createAccessService_capabilitiesMap({
      get ACCESS_CAPABILITIES() { return backendContext.ACCESS_CAPABILITIES; },
      set ACCESS_CAPABILITIES(value) { backendContext.ACCESS_CAPABILITIES = value; }
    });
    return cache25;
  }

  let cache26;
  function operation26() {
    if (!cache26) cache26 = require("./backend/server-access-service/active-capabilities-from-map").createAccessService_activeCapabilitiesFromMap({
      get ACCESS_CAPABILITIES() { return backendContext.ACCESS_CAPABILITIES; },
      set ACCESS_CAPABILITIES(value) { backendContext.ACCESS_CAPABILITIES = value; }
    });
    return cache26;
  }

  let cache27;
  function operation27() {
    if (!cache27) cache27 = require("./backend/server-access-service/access-directory-keys").createAccessService_accessDirectoryKeys({
      get local$accessUserRegionIdFromData() { return operation36().accessUserRegionIdFromData; },
      get local$activeCapabilitiesFromMap() { return operation26().activeCapabilitiesFromMap; },
      get local$capabilitiesMap() { return operation25().capabilitiesMap; }
    });
    return cache27;
  }

  let cache28;
  function operation28() {
    if (!cache28) cache28 = require("./backend/server-access-service/access-directory-filter-key").createAccessService_accessDirectoryFilterKey({
      get local$accessUserRegionIdFromData() { return operation36().accessUserRegionIdFromData; }
    });
    return cache28;
  }

  let cache29;
  function operation29() {
    if (!cache29) cache29 = require("./backend/server-access-service/access-directory-index-state-ref").createAccessService_accessDirectoryIndexStateRef({
      get ACCESS_DIRECTORY_INDEX_STATE_COLLECTION() { return backendContext.ACCESS_DIRECTORY_INDEX_STATE_COLLECTION; },
      set ACCESS_DIRECTORY_INDEX_STATE_COLLECTION(value) { backendContext.ACCESS_DIRECTORY_INDEX_STATE_COLLECTION = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache29;
  }

  let cache30;
  function operation30() {
    if (!cache30) cache30 = require("./backend/server-access-service/access-directory-snapshot-document-id").createAccessService_accessDirectorySnapshotDocumentId({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION() { return backendContext.ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION; },
      set ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION(value) { backendContext.ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION = value; },
      get ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION() { return backendContext.ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION; },
      set ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION(value) { backendContext.ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION = value; },
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache30;
  }

  let cache31;
  function operation31() {
    if (!cache31) cache31 = require("./backend/server-access-service/normalized-access-scope").createAccessService_normalizedAccessScope({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache31;
  }

  let cache32;
  function operation32() {
    if (!cache32) cache32 = require("./backend/server-access-service/assert-engagements-access").createAccessService_assertEngagementsAccess({
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache32;
  }

  let cache33;
  function operation33() {
    if (!cache33) cache33 = require("./backend/server-access-service/engagement-access-context").createAccessService_engagementAccessContext({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get FUNCTIONS_EMULATOR_ACTIVE() { return backendContext.FUNCTIONS_EMULATOR_ACTIVE; },
      set FUNCTIONS_EMULATOR_ACTIVE(value) { backendContext.FUNCTIONS_EMULATOR_ACTIVE = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$competitionEmailNotificationsEnabled() { return operation2().competitionEmailNotificationsEnabled; },
      get local$normalizedAccessScope() { return operation31().normalizedAccessScope; }
    });
    return cache33;
  }

  let cache34;
  function operation34() {
    if (!cache34) cache34 = require("./backend/server-access-service/access-management-context").createAccessService_accessManagementContext({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get FUNCTIONS_EMULATOR_ACTIVE() { return backendContext.FUNCTIONS_EMULATOR_ACTIVE; },
      set FUNCTIONS_EMULATOR_ACTIVE(value) { backendContext.FUNCTIONS_EMULATOR_ACTIVE = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$canonicalAccessDirectoryRegionId() { return operation22().canonicalAccessDirectoryRegionId; },
      get local$normalizedAccessScope() { return operation31().normalizedAccessScope; }
    });
    return cache34;
  }

  let cache35;
  function operation35() {
    if (!cache35) cache35 = require("./backend/server-access-service/audit-management-context").createAccessService_auditManagementContext({
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get FUNCTIONS_EMULATOR_ACTIVE() { return backendContext.FUNCTIONS_EMULATOR_ACTIVE; },
      set FUNCTIONS_EMULATOR_ACTIVE(value) { backendContext.FUNCTIONS_EMULATOR_ACTIVE = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache35;
  }

  let cache36;
  function operation36() {
    if (!cache36) cache36 = require("./backend/server-access-service/access-user-region-id-from-data").createAccessService_accessUserRegionIdFromData({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get CLUB_REFERENCE_BY_ID() { return backendContext.CLUB_REFERENCE_BY_ID; },
      set CLUB_REFERENCE_BY_ID(value) { backendContext.CLUB_REFERENCE_BY_ID = value; },
      get local$canonicalAccessDirectoryRegionId() { return operation22().canonicalAccessDirectoryRegionId; },
      get local$normalizedAccessScope() { return operation31().normalizedAccessScope; }
    });
    return cache36;
  }

  let cache37;
  function operation37() {
    if (!cache37) cache37 = require("./backend/server-access-service/access-user-can-be-managed-by-regional").createAccessService_accessUserCanBeManagedByRegional({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get local$accessUserRegionIdFromData() { return operation36().accessUserRegionIdFromData; }
    });
    return cache37;
  }

  let cache38;
  function operation38() {
    if (!cache38) cache38 = require("./backend/server-access-service/display-name-from-profile").createAccessService_displayNameFromProfile({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache38;
  }

  let cache39;
  function operation39() {
    if (!cache39) cache39 = require("./backend/server-access-service/access-user-display-name").createAccessService_accessUserDisplayName({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$displayNameFromProfile() { return operation38().displayNameFromProfile; }
    });
    return cache39;
  }

  let cache40;
  function operation40() {
    if (!cache40) cache40 = require("./backend/server-access-service/write-audit-log").createAccessService_writeAuditLog({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache40;
  }

  let cache41;
  function operation41() {
    if (!cache41) cache41 = require("./backend/server-access-service/write-audit-log-once").createAccessService_writeAuditLogOnce({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$stableHash() { return operation45().stableHash; }
    });
    return cache41;
  }

  let cache42;
  function operation42() {
    if (!cache42) cache42 = require("./backend/server-access-service/write-access-grants").createAccessService_writeAccessGrants({
      get ACCESS_CAPABILITIES() { return backendContext.ACCESS_CAPABILITIES; },
      set ACCESS_CAPABILITIES(value) { backendContext.ACCESS_CAPABILITIES = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$normalizedAccessScope() { return operation31().normalizedAccessScope; }
    });
    return cache42;
  }

  let cache43;
  function operation43() {
    if (!cache43) cache43 = require("./backend/server-access-service/assert-role").createAccessService_assertRole({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get ROLE_SET() { return backendContext.ROLE_SET; },
      set ROLE_SET(value) { backendContext.ROLE_SET = value; }
    });
    return cache43;
  }

  let cache44;
  function operation44() {
    if (!cache44) cache44 = require("./backend/server-access-service/assert-pin").createAccessService_assertPin({
      get HASH_BYTES() { return backendContext.HASH_BYTES; },
      set HASH_BYTES(value) { backendContext.HASH_BYTES = value; },
      get HASH_ITERATIONS() { return backendContext.HASH_ITERATIONS; },
      set HASH_ITERATIONS(value) { backendContext.HASH_ITERATIONS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; }
    });
    return cache44;
  }

  let cache45;
  function operation45() {
    if (!cache45) cache45 = require("./backend/server-access-service/stable-hash").createAccessService_stableHash({
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; }
    });
    return cache45;
  }
  return {
    portalReadStats: operation0().portalReadStats,
    engagementCategoryCodesForEvent: operation1().engagementCategoryCodesForEvent,
    normalizeEngagementEventCategoryRestrictions: operation1().normalizeEngagementEventCategoryRestrictions,
    cleanEngagementRelayMixedMode: operation1().cleanEngagementRelayMixedMode,
    competitionEmailNotificationsEnabled: operation2().competitionEmailNotificationsEnabled,
    notificationPreferenceSecretValue: operation3().notificationPreferenceSecretValue,
    competitionNotificationPreferenceToken: operation3().competitionNotificationPreferenceToken,
    validCompetitionNotificationPreferenceToken: operation4().validCompetitionNotificationPreferenceToken,
    competitionNotificationPreferenceUrl: operation5().competitionNotificationPreferenceUrl,
    engagementClubRegionId: operation6().engagementClubRegionId,
    engagementClubCode: operation7().engagementClubCode,
    engagementClubName: operation8().engagementClubName,
    engagementStoredClubItem: operation9().engagementStoredClubItem,
    publicEngagementClubItem: operation10().publicEngagementClubItem,
    publicEngagementClubDirectoryRef: operation11().publicEngagementClubDirectoryRef,
    engagementClubsByIds: operation12().engagementClubsByIds,
    engagementClubById: operation13().engagementClubById,
    cleanFirestoreValue: operation14().cleanFirestoreValue,
    competitionIdFrom: operation15().competitionIdFrom,
    assertAdmin: operation16().assertAdmin,
    assertCapability: operation17().assertCapability,
    assertLivePalmesAccess: operation18().assertLivePalmesAccess,
    normalizeEmail: operation19().normalizeEmail,
    normalizedEngagementRegionKey: operation20().normalizedEngagementRegionKey,
    engagementRegionsMatch: operation21().engagementRegionsMatch,
    canonicalAccessDirectoryRegionId: operation22().canonicalAccessDirectoryRegionId,
    assertEmail: operation23().assertEmail,
    cleanAccessProfile: operation24().cleanAccessProfile,
    capabilitiesMap: operation25().capabilitiesMap,
    activeCapabilitiesFromMap: operation26().activeCapabilitiesFromMap,
    accessDirectoryKeys: operation27().accessDirectoryKeys,
    accessDirectoryFilterKey: operation28().accessDirectoryFilterKey,
    accessDirectoryIndexStateRef: operation29().accessDirectoryIndexStateRef,
    accessDirectorySnapshotStateRef: operation30().accessDirectorySnapshotStateRef,
    accessDirectorySnapshotDocumentId: operation30().accessDirectorySnapshotDocumentId,
    accessDirectorySnapshotRef: operation30().accessDirectorySnapshotRef,
    accessDirectorySnapshotEntryKey: operation30().accessDirectorySnapshotEntryKey,
    normalizedAccessScope: operation31().normalizedAccessScope,
    accessScopeForCapability: operation24().accessScopeForCapability,
    accessScopesMapFromProfile: operation24().accessScopesMapFromProfile,
    hasEngagementsCapability: operation32().hasEngagementsCapability,
    engagementAccessContext: operation33().engagementAccessContext,
    accessManagementContext: operation34().accessManagementContext,
    auditManagementContext: operation35().auditManagementContext,
    accessUserRegionIdFromData: operation36().accessUserRegionIdFromData,
    accessUserVisibleToRegional: operation28().accessUserVisibleToRegional,
    accessUserCanBeManagedByRegional: operation37().accessUserCanBeManagedByRegional,
    accessUserVisibleForAccessDirectory: operation28().accessUserVisibleForAccessDirectory,
    assertRegionalAccessUserDeletionRequestAllowed: operation37().assertRegionalAccessUserDeletionRequestAllowed,
    engagementClubAccessContext: operation13().engagementClubAccessContext,
    assertEngagementsAccess: operation32().assertEngagementsAccess,
    displayNameFromProfile: operation38().displayNameFromProfile,
    accessUserDisplayName: operation39().accessUserDisplayName,
    writeAuditLog: operation40().writeAuditLog,
    writeAuditLogOnce: operation41().writeAuditLogOnce,
    writeAccessGrants: operation42().writeAccessGrants,
    assertRole: operation43().assertRole,
    assertPin: operation44().assertPin,
    pinHash: operation44().pinHash,
    stableHash: operation45().stableHash
  };
}

module.exports = { createAccessService };
