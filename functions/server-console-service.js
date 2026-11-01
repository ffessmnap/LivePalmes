// Compatibility factory; operation modules hold the existing bodies.
function createConsoleService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-console-service/assert-console-portal-access").createConsoleService_assertConsolePortalAccess({
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PIN_LOCK_MS_BY_LEVEL() { return backendContext.PIN_LOCK_MS_BY_LEVEL; },
      set PIN_LOCK_MS_BY_LEVEL(value) { backendContext.PIN_LOCK_MS_BY_LEVEL = value; },
      get PIN_MAX_FAILED_ATTEMPTS() { return backendContext.PIN_MAX_FAILED_ATTEMPTS; },
      set PIN_MAX_FAILED_ATTEMPTS(value) { backendContext.PIN_MAX_FAILED_ATTEMPTS = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get hasConsolePortalCapability() { return backendContext.hasConsolePortalCapability; },
      set hasConsolePortalCapability(value) { backendContext.hasConsolePortalCapability = value; },
      get lockMessage() { return backendContext.lockMessage; },
      set lockMessage(value) { backendContext.lockMessage = value; },
      get lockRemainingSeconds() { return backendContext.lockRemainingSeconds; },
      set lockRemainingSeconds(value) { backendContext.lockRemainingSeconds = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-console-service/update-public-pin-notes").createConsoleService_updatePublicPinNotes({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get liveDataRef() { return backendContext.liveDataRef; },
      set liveDataRef(value) { backendContext.liveDataRef = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-console-service/assert-computer-pdf-access").createConsoleService_assertComputerPdfAccess({
      get ADMIN_UIDS() { return backendContext.ADMIN_UIDS; },
      set ADMIN_UIDS(value) { backendContext.ADMIN_UIDS = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get consoleGrantRef() { return backendContext.consoleGrantRef; },
      set consoleGrantRef(value) { backendContext.consoleGrantRef = value; }
    });
    return cache2;
  }
  return {
    recordFailedPinAttempt: operation0().recordFailedPinAttempt,
    clearPinAttempts: operation0().clearPinAttempts,
    updatePublicPinNotes: operation1().updatePublicPinNotes,
    assertConsolePortalAccess: operation0().assertConsolePortalAccess,
    assertComputerPdfAccess: operation2().assertComputerPdfAccess
  };
}

module.exports = { createConsoleService };
