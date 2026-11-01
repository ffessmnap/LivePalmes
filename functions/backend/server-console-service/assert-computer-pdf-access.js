// Existing operation bodies; live services arrive through explicit accessors.
function createConsoleService_assertComputerPdfAccess(backendContext) {
  async function assertComputerPdfAccess(request, competitionId) {
    const uid = backendContext.cleanText(request.auth?.uid);
    if (!uid) throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    const token = request.auth?.token || {};
    const capabilities = token.livepalmesCapabilities || {};
    if (backendContext.ADMIN_UIDS.has(uid) || capabilities["admin.full"] === true) return;
    if (
      token.livepalmesAccess !== true
      || token.livepalmesConsoleAccess !== true
      || token.livepalmesConsole !== true
      || token.livepalmesRole !== "computer"
      || token.livepalmesCompetition !== competitionId
    ) {
      throw new backendContext.HttpsError("permission-denied", "Acces bureau des performances requis.");
    }
    const grantSnapshot = await backendContext.consoleGrantRef(competitionId, uid).get();
    const grant = grantSnapshot.exists ? grantSnapshot.data() || {} : {};
    const expiresAtMs = typeof grant.expiresAt?.toMillis === "function"
      ? grant.expiresAt.toMillis()
      : Date.parse(grant.expiresAt || "");
    if (
      !grantSnapshot.exists
      || grant.role !== "computer"
      || grant.competitionId !== competitionId
      || !Number.isFinite(expiresAtMs)
      || expiresAtMs <= Date.now()
    ) {
      throw new backendContext.HttpsError("permission-denied", "Autorisation bureau des performances expiree.");
    }
  }

  return { assertComputerPdfAccess };
}

module.exports = { createConsoleService_assertComputerPdfAccess };
