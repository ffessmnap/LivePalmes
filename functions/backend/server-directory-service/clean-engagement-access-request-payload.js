// Existing operation bodies; live services arrive through explicit accessors.
function createDirectoryService_cleanEngagementAccessRequestPayload(backendContext) {
  function cleanEngagementAccessRequestPayload(raw = {}, request = {}) {
    const authEmail = backendContext.normalizeEmail(request.auth?.token?.email || "");
    const email = backendContext.normalizeEmail(raw.email || authEmail);
    backendContext.assertEmail(email);
    const firstName = backendContext.cleanText(raw.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName).toLocaleUpperCase("fr-FR").slice(0, 80);
    const clubRole = backendContext.cleanText(raw.clubRole).slice(0, 120);
    const clubId = backendContext.cleanText(raw.clubId).slice(0, 40);
    const clubName = backendContext.cleanText(raw.clubName).slice(0, 140);
    const regionId = backendContext.cleanText(raw.regionId).slice(0, 80);
    const licenseNumber = backendContext.cleanText(raw.licenseNumber).slice(0, 60);
    const message = backendContext.cleanText(raw.message).slice(0, 600);
    const newClubRequested = raw.newClubRequested === true;
    let newClub = null;
    if (newClubRequested) {
      try {
        newClub = backendContext.cleanClubPayload({ ...(raw.newClub || {}), regionId, active: true }, {});
      } catch (error) {
        throw new backendContext.HttpsError("invalid-argument", backendContext.cleanText(error?.message || error));
      }
      if (!newClub.city || !newClub.postalCode) {
        throw new backendContext.HttpsError("invalid-argument", "Ville et code postal du nouveau club obligatoires.");
      }
    }
    if (!firstName || !lastName || !regionId || !licenseNumber || (!clubId && !newClubRequested)) {
      throw new backendContext.HttpsError("invalid-argument", "Nom, prenom, club, region et licence sont obligatoires.");
    }
    return {
      email,
      firstName,
      lastName,
      clubRole,
      clubId: newClubRequested ? "" : clubId,
      clubName: newClubRequested ? "" : clubName,
      regionId,
      licenseNumber,
      message,
      newClubRequested,
      ...(newClub ? { newClub } : {})
    };
  }

  function engagementAccessExistingClubPayload(club = {}) {
    return {
      clubId: backendContext.cleanText(club.clubId || club.id).slice(0, 40),
      clubName: backendContext.cleanText(club.clubName).slice(0, 140),
      regionId: backendContext.engagementClubRegionId(club, club.regionId),
      newClubRequested: false
    };
  }

  async function findEngagementClubByFederalNumber(federalNumber = "") {
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return require("../../nap-club-access-request").findByFederalNumber(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), federalNumber);
    const cleanNumber = backendContext.cleanText(federalNumber).toUpperCase().slice(0, 24);
    if (!cleanNumber) return null;
    const referenceClub = backendContext.CLUB_REFERENCE_BY_FEDERAL_NUMBER.get(cleanNumber);
    if (referenceClub) {
      const overrideSnapshot = await backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION).doc(referenceClub.clubId).get();
      if (!overrideSnapshot.exists) return referenceClub;
      const override = backendContext.engagementStoredClubItem(overrideSnapshot);
      if (override.deleted === true || override.federalNumber.toUpperCase() !== cleanNumber) return null;
      return { ...referenceClub, ...override };
    }
    const snapshot = await backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION)
      .where("federalNumber", "==", cleanNumber)
      .limit(2)
      .get();
    const storedClub = snapshot.docs.map(backendContext.engagementStoredClubItem).find((club) => club.deleted !== true);
    return storedClub || null;
  }

  async function engagementExistingAccessAccount(email = "") {
    let authUser;
    try {
      authUser = await backendContext.auth.getUserByEmail(backendContext.normalizeEmail(email));
    } catch (error) {
      if (error?.code === "auth/user-not-found") return null;
      throw error;
    }
    const snapshot = await backendContext.db.collection("users").doc(authUser.uid).get();
    if (!snapshot.exists) return null;
    const data = snapshot.data() || {};
    if (!["active", "inactive"].includes(backendContext.cleanText(data.status))) return null;
    return {
      uid: authUser.uid,
      email: backendContext.normalizeEmail(authUser.email || email),
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      status: backendContext.cleanText(data.status),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubCode: backendContext.engagementClubCode(data.clubId, data.clubCode).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140)
    };
  }

  return { cleanEngagementAccessRequestPayload, engagementAccessExistingClubPayload, findEngagementClubByFederalNumber, engagementExistingAccessAccount };
}

module.exports = { createDirectoryService_cleanEngagementAccessRequestPayload };
