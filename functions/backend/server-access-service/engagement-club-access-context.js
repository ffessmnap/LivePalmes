// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_engagementClubAccessContext(backendContext) {
  async function engagementClubById(clubId) {
    return (await (0, backendContext.local$engagementClubsByIds)([clubId])).get(backendContext.cleanText(clubId)) || null;
  }

  async function engagementClubAccessContext(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active") {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes desactive.");
    }
    const capabilities = backendContext.ADMIN_UIDS.has(uid)
      ? (0, backendContext.local$capabilitiesMap)(backendContext.ACCESS_CAPABILITIES)
      : (data.capabilities || request.auth?.token?.livepalmesCapabilities || {});
    const national = capabilities["admin.full"] === true || capabilities["engagements.national.manage"] === true;
    const hasRegional = capabilities["engagements.region.manage"] === true;
    const regional = !national && hasRegional;
    if (capabilities["engagements.club.manage"] !== true && !hasRegional) {
      throw new backendContext.HttpsError("permission-denied", "Droit engagements club requis.");
    }
    const accessScopes = data.accessScopes || {};
    const clubScope = (0, backendContext.local$normalizedAccessScope)(accessScopes["engagements.club.manage"]);
    const homeClubId = backendContext.cleanText(clubScope.scopeId || data.clubId).slice(0, 40);
    if (!homeClubId && !hasRegional) {
      throw new backendContext.HttpsError("failed-precondition", "Numero de club requis pour les engagements club.");
    }
    const requestedClubId = backendContext.cleanText(request.data?.activeClubId).slice(0, 40);
    const isSwitchingClub = Boolean(requestedClubId && requestedClubId !== homeClubId);
    if (isSwitchingClub && !hasRegional && capabilities["engagements.club.switch"] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Droit de changement de club requis.");
    }
    let activeClub = null;
    const checkedClubId = requestedClubId || homeClubId;
    if (!checkedClubId) throw new backendContext.HttpsError("failed-precondition", "Choisissez un club.");
    // Regional scope also checks the real home club; cumulative switch rights cannot bypass it.
    if (isSwitchingClub || regional) {
      if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
        try {
          const pool = require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
          activeClub = await require("../../nap-club-directory").findClub(pool, checkedClubId);
        } catch (error) {
          throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable",
            error instanceof TypeError ? error.message : "Club NAP indisponible. Reessayez.");
        }
      } else activeClub = await engagementClubById(checkedClubId);
    }
    if ((isSwitchingClub || regional) && (!activeClub || !backendContext.CLUB_REFERENCE_REGION_LABELS[activeClub.regionId])) {
      throw new backendContext.HttpsError("invalid-argument", "Club actif inconnu.");
    }
    if (regional) {
      const regionId = (0, backendContext.local$canonicalAccessDirectoryRegionId)(accessScopes["engagements.region.manage"]?.scopeId || data.regionId);
      if (!regionId || (0, backendContext.local$canonicalAccessDirectoryRegionId)(activeClub.regionId) !== regionId) {
        throw new backendContext.HttpsError("permission-denied", "Club hors de votre region.");
      }
    }
    const clubId = activeClub?.clubId || homeClubId;
    return {
      uid,
      email: backendContext.cleanText(request.auth?.token?.email || data.email).slice(0, 180),
      firstName: backendContext.cleanText(data.firstName || request.auth?.token?.given_name).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName || request.auth?.token?.family_name).slice(0, 80),
      clubId,
      clubName: activeClub?.clubName || backendContext.cleanText(data.clubName).slice(0, 140),
      regionId: activeClub ? (0, backendContext.local$engagementClubRegionId)(activeClub, data.regionId) : backendContext.cleanText(data.regionId).slice(0, 80),
      homeClubId,
      switchedClub: isSwitchingClub
    };
  }

  return { engagementClubById, engagementClubAccessContext };
}

module.exports = { createAccessService_engagementClubAccessContext };
