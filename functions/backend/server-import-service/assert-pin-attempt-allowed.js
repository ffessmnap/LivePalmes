// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_assertPinAttemptAllowed(backendContext) {
  function safeCompareHex(left, right) {
    const leftBuffer = Buffer.from(String(left || ""), "hex");
    const rightBuffer = Buffer.from(String(right || ""), "hex");
    return leftBuffer.length === rightBuffer.length && backendContext.crypto.timingSafeEqual(leftBuffer, rightBuffer);
  }

  function pinAttemptRef(competitionId, role, uid, clientId) {
    const key = backendContext.stableHash(`${competitionId}|${role}|${uid}|${backendContext.cleanText(clientId)}`);
    return backendContext.db
      .collection("competitions")
      .doc(competitionId)
      .collection("security")
      .doc("pinAttempts")
      .collection("items")
      .doc(key);
  }

  function lockRemainingSeconds(attempt = {}, nowMs = Date.now()) {
    const lockedUntilMs = Date.parse(attempt.lockedUntil || "");
    if (!Number.isFinite(lockedUntilMs) || lockedUntilMs <= nowMs) return 0;
    return Math.ceil((lockedUntilMs - nowMs) / 1000);
  }

  function lockMessage(seconds) {
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Trop d'essais incorrects. Reessaie dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
  }

  async function assertPinAttemptAllowed(ref) {
    const snapshot = await ref.get();
    const seconds = lockRemainingSeconds(snapshot.data() || {});
    if (seconds > 0) {
      throw new backendContext.HttpsError("resource-exhausted", lockMessage(seconds), { retryAfterSeconds: seconds });
    }
  }

  return { safeCompareHex, pinAttemptRef, lockRemainingSeconds, lockMessage, assertPinAttemptAllowed };
}

module.exports = { createImportService_assertPinAttemptAllowed };
