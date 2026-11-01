// Existing operation bodies; live services arrive through explicit accessors.
function createConsoleService_assertConsolePortalAccess(backendContext) {
  async function recordFailedPinAttempt(ref, details = {}) {
    const now = new Date();
    const nowIso = now.toISOString();
    let blockedSeconds = 0;
    await backendContext.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const previous = snapshot.exists ? snapshot.data() || {} : {};
      const wasLocked = backendContext.lockRemainingSeconds(previous, now.getTime()) > 0;
      if (wasLocked) {
        blockedSeconds = backendContext.lockRemainingSeconds(previous, now.getTime());
        return;
      }
      const failedCount = Number(previous.failedCount || 0) + 1;
      const previousLockLevel = Number(previous.lockLevel || 0);
      const payload = {
        clientIdHash: backendContext.stableHash(details.clientId || ""),
        failedCount,
        lastFailedAt: nowIso,
        role: details.role,
        uid: details.uid,
        uidHash: backendContext.stableHash(details.uid || ""),
        updatedAt: nowIso
      };
      if (failedCount >= backendContext.PIN_MAX_FAILED_ATTEMPTS) {
        const lockLevel = Math.min(previousLockLevel + 1, backendContext.PIN_LOCK_MS_BY_LEVEL.length);
        const lockMs = backendContext.PIN_LOCK_MS_BY_LEVEL[Math.max(0, lockLevel - 1)] || backendContext.PIN_LOCK_MS_BY_LEVEL[backendContext.PIN_LOCK_MS_BY_LEVEL.length - 1];
        const lockedUntil = new Date(now.getTime() + lockMs);
        payload.failedCount = 0;
        payload.lockLevel = lockLevel;
        payload.lockedAt = nowIso;
        payload.lockedUntil = lockedUntil.toISOString();
        blockedSeconds = Math.ceil(lockMs / 1000);
      } else {
        payload.lockLevel = previousLockLevel;
        payload.lockedUntil = "";
      }
      transaction.set(ref, payload, { merge: true });
    });
    if (blockedSeconds > 0) {
      throw new backendContext.HttpsError("resource-exhausted", backendContext.lockMessage(blockedSeconds), { retryAfterSeconds: blockedSeconds });
    }
  }

  async function clearPinAttempts(ref) {
    await ref.delete().catch(() => {});
  }

  async function assertConsolePortalAccess(request) {
    const uid = backendContext.cleanText(request.auth?.uid);
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion au portail LivePalmes requise.");
    }
    if (backendContext.ADMIN_UIDS.has(uid)) return;
    const token = request.auth?.token || {};
    if (token.livepalmesAccess !== true || !backendContext.hasConsolePortalCapability(token.livepalmesCapabilities || {})) {
      throw new backendContext.HttpsError("permission-denied", "Acces aux consoles LivePalmes requis.");
    }
    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active" || !backendContext.hasConsolePortalCapability(data.capabilities || {})) {
      throw new backendContext.HttpsError("permission-denied", "Acces aux consoles LivePalmes inactif.");
    }
  }

  return { recordFailedPinAttempt, clearPinAttempts, assertConsolePortalAccess };
}

module.exports = { createConsoleService_assertConsolePortalAccess };
