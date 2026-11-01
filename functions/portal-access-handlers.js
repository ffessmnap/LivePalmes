// Compatibility factory; operation modules hold the existing bodies.
function createAccessHandlers(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/portal-access-handlers/set-role-pins").createAccessHandlers_setRolePins({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get ROLES() { return backendContext.ROLES; },
      set ROLES(value) { backendContext.ROLES = value; },
      get assertCapability() { return backendContext.assertCapability; },
      set assertCapability(value) { backendContext.assertCapability = value; },
      get assertPin() { return backendContext.assertPin; },
      set assertPin(value) { backendContext.assertPin = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get competitionIdFrom() { return backendContext.competitionIdFrom; },
      set competitionIdFrom(value) { backendContext.competitionIdFrom = value; },
      get crypto() { return backendContext.crypto; },
      set crypto(value) { backendContext.crypto = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get pinHash() { return backendContext.pinHash; },
      set pinHash(value) { backendContext.pinHash = value; },
      get rolePinsRef() { return backendContext.rolePinsRef; },
      set rolePinsRef(value) { backendContext.rolePinsRef = value; },
      get updatePublicPinNotes() { return backendContext.updatePublicPinNotes; },
      set updatePublicPinNotes(value) { backendContext.updatePublicPinNotes = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/portal-access-handlers/verify-pin").createAccessHandlers_verifyPin({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get Timestamp() { return backendContext.Timestamp; },
      set Timestamp(value) { backendContext.Timestamp = value; },
      get assertConsolePortalAccess() { return backendContext.assertConsolePortalAccess; },
      set assertConsolePortalAccess(value) { backendContext.assertConsolePortalAccess = value; },
      get assertPin() { return backendContext.assertPin; },
      set assertPin(value) { backendContext.assertPin = value; },
      get assertPinAttemptAllowed() { return backendContext.assertPinAttemptAllowed; },
      set assertPinAttemptAllowed(value) { backendContext.assertPinAttemptAllowed = value; },
      get assertRole() { return backendContext.assertRole; },
      set assertRole(value) { backendContext.assertRole = value; },
      get auth() { return backendContext.auth; },
      set auth(value) { backendContext.auth = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get clearPinAttempts() { return backendContext.clearPinAttempts; },
      set clearPinAttempts(value) { backendContext.clearPinAttempts = value; },
      get competitionIdFrom() { return backendContext.competitionIdFrom; },
      set competitionIdFrom(value) { backendContext.competitionIdFrom = value; },
      get consoleGrantRef() { return backendContext.consoleGrantRef; },
      set consoleGrantRef(value) { backendContext.consoleGrantRef = value; },
      get consoleRoleClaims() { return backendContext.consoleRoleClaims; },
      set consoleRoleClaims(value) { backendContext.consoleRoleClaims = value; },
      get pinAttemptRef() { return backendContext.pinAttemptRef; },
      set pinAttemptRef(value) { backendContext.pinAttemptRef = value; },
      get pinHash() { return backendContext.pinHash; },
      set pinHash(value) { backendContext.pinHash = value; },
      get recordFailedPinAttempt() { return backendContext.recordFailedPinAttempt; },
      set recordFailedPinAttempt(value) { backendContext.recordFailedPinAttempt = value; },
      get rolePinsRef() { return backendContext.rolePinsRef; },
      set rolePinsRef(value) { backendContext.rolePinsRef = value; },
      get safeCompareHex() { return backendContext.safeCompareHex; },
      set safeCompareHex(value) { backendContext.safeCompareHex = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/portal-access-handlers/rebuild-access-directory-index-next-page").createAccessHandlers_rebuildAccessDirectoryIndexNextPage({
      get ACCESS_DIRECTORY_INDEX_VERSION() { return backendContext.ACCESS_DIRECTORY_INDEX_VERSION; },
      set ACCESS_DIRECTORY_INDEX_VERSION(value) { backendContext.ACCESS_DIRECTORY_INDEX_VERSION = value; },
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get accessDirectoryIndexStateRef() { return backendContext.accessDirectoryIndexStateRef; },
      set accessDirectoryIndexStateRef(value) { backendContext.accessDirectoryIndexStateRef = value; },
      get accessDirectoryKeys() { return backendContext.accessDirectoryKeys; },
      set accessDirectoryKeys(value) { backendContext.accessDirectoryKeys = value; },
      get accessManagementContext() { return backendContext.accessManagementContext; },
      set accessManagementContext(value) { backendContext.accessManagementContext = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/portal-access-handlers/rebuild-access-directory-snapshot-next-page").createAccessHandlers_rebuildAccessDirectorySnapshotNextPage({
      get ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION() { return backendContext.ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION; },
      set ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION(value) { backendContext.ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION = value; },
      get ACCESS_DIRECTORY_SNAPSHOT_VERSION() { return backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION; },
      set ACCESS_DIRECTORY_SNAPSHOT_VERSION(value) { backendContext.ACCESS_DIRECTORY_SNAPSHOT_VERSION = value; },
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get accessDirectorySnapshotEntry() { return backendContext.accessDirectorySnapshotEntry; },
      set accessDirectorySnapshotEntry(value) { backendContext.accessDirectorySnapshotEntry = value; },
      get accessDirectorySnapshotEntryKey() { return backendContext.accessDirectorySnapshotEntryKey; },
      set accessDirectorySnapshotEntryKey(value) { backendContext.accessDirectorySnapshotEntryKey = value; },
      get accessDirectorySnapshotRegionId() { return backendContext.accessDirectorySnapshotRegionId; },
      set accessDirectorySnapshotRegionId(value) { backendContext.accessDirectorySnapshotRegionId = value; },
      get accessDirectorySnapshotStateRef() { return backendContext.accessDirectorySnapshotStateRef; },
      set accessDirectorySnapshotStateRef(value) { backendContext.accessDirectorySnapshotStateRef = value; },
      get accessManagementContext() { return backendContext.accessManagementContext; },
      set accessManagementContext(value) { backendContext.accessManagementContext = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get mergeAccessDirectorySnapshotEntries() { return backendContext.mergeAccessDirectorySnapshotEntries; },
      set mergeAccessDirectorySnapshotEntries(value) { backendContext.mergeAccessDirectorySnapshotEntries = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/portal-access-handlers/list-access-users").createAccessHandlers_listAccessUsers({
      get ACCESS_CAPABILITY_SET() { return backendContext.ACCESS_CAPABILITY_SET; },
      set ACCESS_CAPABILITY_SET(value) { backendContext.ACCESS_CAPABILITY_SET = value; },
      get ACCESS_DIRECTORY_INDEX_VERSION() { return backendContext.ACCESS_DIRECTORY_INDEX_VERSION; },
      set ACCESS_DIRECTORY_INDEX_VERSION(value) { backendContext.ACCESS_DIRECTORY_INDEX_VERSION = value; },
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get accessDirectoryFilterKey() { return backendContext.accessDirectoryFilterKey; },
      set accessDirectoryFilterKey(value) { backendContext.accessDirectoryFilterKey = value; },
      get accessDirectoryIndexStateRef() { return backendContext.accessDirectoryIndexStateRef; },
      set accessDirectoryIndexStateRef(value) { backendContext.accessDirectoryIndexStateRef = value; },
      get accessManagementContext() { return backendContext.accessManagementContext; },
      set accessManagementContext(value) { backendContext.accessManagementContext = value; },
      get accessUserListItem() { return backendContext.accessUserListItem; },
      set accessUserListItem(value) { backendContext.accessUserListItem = value; },
      get accessUserMatchesFilters() { return backendContext.accessUserMatchesFilters; },
      set accessUserMatchesFilters(value) { backendContext.accessUserMatchesFilters = value; },
      get accessUserVisibleForAccessDirectory() { return backendContext.accessUserVisibleForAccessDirectory; },
      set accessUserVisibleForAccessDirectory(value) { backendContext.accessUserVisibleForAccessDirectory = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get searchAccessUserDocuments() { return backendContext.searchAccessUserDocuments; },
      set searchAccessUserDocuments(value) { backendContext.searchAccessUserDocuments = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/portal-access-handlers/set-access-user-status").createAccessHandlers_setAccessUserStatus({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get accessDirectoryKeys() { return backendContext.accessDirectoryKeys; },
      set accessDirectoryKeys(value) { backendContext.accessDirectoryKeys = value; },
      get activeCapabilitiesFromMap() { return backendContext.activeCapabilitiesFromMap; },
      set activeCapabilitiesFromMap(value) { backendContext.activeCapabilitiesFromMap = value; },
      get assertAdmin() { return backendContext.assertAdmin; },
      set assertAdmin(value) { backendContext.assertAdmin = value; },
      get auth() { return backendContext.auth; },
      set auth(value) { backendContext.auth = value; },
      get capabilitiesMap() { return backendContext.capabilitiesMap; },
      set capabilitiesMap(value) { backendContext.capabilitiesMap = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get hasConsolePortalCapability() { return backendContext.hasConsolePortalCapability; },
      set hasConsolePortalCapability(value) { backendContext.hasConsolePortalCapability = value; },
      get writeAccessGrants() { return backendContext.writeAccessGrants; },
      set writeAccessGrants(value) { backendContext.writeAccessGrants = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/portal-access-handlers/delete-access-user").createAccessHandlers_deleteAccessUser({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get accessManagementContext() { return backendContext.accessManagementContext; },
      set accessManagementContext(value) { backendContext.accessManagementContext = value; },
      get deleteAccessUserAccount() { return backendContext.deleteAccessUserAccount; },
      set deleteAccessUserAccount(value) { backendContext.deleteAccessUserAccount = value; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/portal-access-handlers/request-access-user-deletion").createAccessHandlers_requestAccessUserDeletion({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get accessManagementContext() { return backendContext.accessManagementContext; },
      set accessManagementContext(value) { backendContext.accessManagementContext = value; },
      get accessUserDeletionRequestItem() { return backendContext.accessUserDeletionRequestItem; },
      set accessUserDeletionRequestItem(value) { backendContext.accessUserDeletionRequestItem = value; },
      get accessUserRegionIdFromData() { return backendContext.accessUserRegionIdFromData; },
      set accessUserRegionIdFromData(value) { backendContext.accessUserRegionIdFromData = value; },
      get activeCapabilitiesFromMap() { return backendContext.activeCapabilitiesFromMap; },
      set activeCapabilitiesFromMap(value) { backendContext.activeCapabilitiesFromMap = value; },
      get assertRegionalAccessUserDeletionRequestAllowed() { return backendContext.assertRegionalAccessUserDeletionRequestAllowed; },
      set assertRegionalAccessUserDeletionRequestAllowed(value) { backendContext.assertRegionalAccessUserDeletionRequestAllowed = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/portal-access-handlers/list-access-user-deletion-requests").createAccessHandlers_listAccessUserDeletionRequests({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get accessManagementContext() { return backendContext.accessManagementContext; },
      set accessManagementContext(value) { backendContext.accessManagementContext = value; },
      get accessUserDeletionRequestItem() { return backendContext.accessUserDeletionRequestItem; },
      set accessUserDeletionRequestItem(value) { backendContext.accessUserDeletionRequestItem = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/portal-access-handlers/resolve-access-user-deletion-request").createAccessHandlers_resolveAccessUserDeletionRequest({
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get accessManagementContext() { return backendContext.accessManagementContext; },
      set accessManagementContext(value) { backendContext.accessManagementContext = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deleteAccessUserAccount() { return backendContext.deleteAccessUserAccount; },
      set deleteAccessUserAccount(value) { backendContext.deleteAccessUserAccount = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/portal-access-handlers/update-current-account-email").createAccessHandlers_updateCurrentAccountEmail({
      get ACCESS_CAPABILITIES() { return backendContext.ACCESS_CAPABILITIES; },
      set ACCESS_CAPABILITIES(value) { backendContext.ACCESS_CAPABILITIES = value; },
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get activeCapabilitiesFromMap() { return backendContext.activeCapabilitiesFromMap; },
      set activeCapabilitiesFromMap(value) { backendContext.activeCapabilitiesFromMap = value; },
      get assertEmail() { return backendContext.assertEmail; },
      set assertEmail(value) { backendContext.assertEmail = value; },
      get assertLivePalmesAccess() { return backendContext.assertLivePalmesAccess; },
      set assertLivePalmesAccess(value) { backendContext.assertLivePalmesAccess = value; },
      get auth() { return backendContext.auth; },
      set auth(value) { backendContext.auth = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get normalizeEmail() { return backendContext.normalizeEmail; },
      set normalizeEmail(value) { backendContext.normalizeEmail = value; },
      get normalizedAccessScope() { return backendContext.normalizedAccessScope; },
      set normalizedAccessScope(value) { backendContext.normalizedAccessScope = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/portal-access-handlers/get-current-access-user").createAccessHandlers_getCurrentAccessUser({
      get ACCESS_CAPABILITIES() { return backendContext.ACCESS_CAPABILITIES; },
      set ACCESS_CAPABILITIES(value) { backendContext.ACCESS_CAPABILITIES = value; },
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get FUNCTIONS_EMULATOR_ACTIVE() { return backendContext.FUNCTIONS_EMULATOR_ACTIVE; },
      set FUNCTIONS_EMULATOR_ACTIVE(value) { backendContext.FUNCTIONS_EMULATOR_ACTIVE = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get activeCapabilitiesFromMap() { return backendContext.activeCapabilitiesFromMap; },
      set activeCapabilitiesFromMap(value) { backendContext.activeCapabilitiesFromMap = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get competitionEmailNotificationsEnabled() { return backendContext.competitionEmailNotificationsEnabled; },
      set competitionEmailNotificationsEnabled(value) { backendContext.competitionEmailNotificationsEnabled = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; }
    });
    return cache11;
  }
  return {
    setRolePins: operation0().setRolePins,
    verifyPin: operation1().verifyPin,
    rebuildAccessDirectoryIndexNextPage: operation2().rebuildAccessDirectoryIndexNextPage,
    rebuildAccessDirectorySnapshotNextPage: operation3().rebuildAccessDirectorySnapshotNextPage,
    listAccessUsers: operation4().listAccessUsers,
    setAccessUserStatus: operation5().setAccessUserStatus,
    deleteAccessUser: operation6().deleteAccessUser,
    requestAccessUserDeletion: operation7().requestAccessUserDeletion,
    listAccessUserDeletionRequests: operation8().listAccessUserDeletionRequests,
    resolveAccessUserDeletionRequest: operation9().resolveAccessUserDeletionRequest,
    updateCurrentAccountEmail: operation10().updateCurrentAccountEmail,
    getCurrentAccessUser: operation11().getCurrentAccessUser
  };
}

module.exports = { createAccessHandlers };
