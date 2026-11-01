// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_verifyPin(backendContext) {
  async function verifyPin(request) {
    const competitionId = backendContext.competitionIdFrom(request.data || {});
    const role = backendContext.cleanText(request.data?.role);
    const pin = backendContext.cleanText(request.data?.pin);
    const clientId = backendContext.cleanText(request.data?.clientId);
    backendContext.assertRole(role);
    backendContext.assertPin(pin);
    const uid = backendContext.cleanText(request.auth?.uid);
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase console requise.");
    }
    await backendContext.assertConsolePortalAccess(request);
    const attemptsRef = backendContext.pinAttemptRef(competitionId, role, uid, clientId);
    await backendContext.assertPinAttemptAllowed(attemptsRef);

    const snapshot = await backendContext.rolePinsRef(competitionId).get();
    if (!snapshot.exists || snapshot.data()?.enabled !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Codes PIN serveur non configures.");
    }

    const entry = snapshot.data()?.roles?.[role];
    if (!entry?.hash || !entry?.salt || !backendContext.safeCompareHex(backendContext.pinHash(pin, entry.salt), entry.hash)) {
      await backendContext.recordFailedPinAttempt(attemptsRef, { clientId, role, uid });
      throw new backendContext.HttpsError("permission-denied", "Code PIN incorrect.");
    }

    await backendContext.clearPinAttempts(attemptsRef);
    const authUser = await backendContext.auth.getUser(uid);
    await backendContext.auth.setCustomUserClaims(uid, backendContext.consoleRoleClaims(
      authUser.customClaims || {},
      role,
      competitionId
    ));
    const now = new Date();
    await backendContext.consoleGrantRef(competitionId, uid).set({
      uid,
      role,
      competitionId,
      clientIdHash: backendContext.stableHash(clientId),
      updatedAt: now.toISOString(),
      expiresAt: backendContext.Timestamp.fromMillis(now.getTime() + 12 * 60 * 60 * 1000)
    }, { merge: false });

    return {
      ok: true,
      role
    };
  }

  return { verifyPin };
}

module.exports = { createAccessHandlers_verifyPin };
