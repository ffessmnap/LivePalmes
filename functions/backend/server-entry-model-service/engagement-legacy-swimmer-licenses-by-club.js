// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementLegacySwimmerLicensesByClub(backendContext) {
  async function engagementLegacySwimmerLicensesByClub(db, clubId) {
    const cleanClubId = backendContext.cleanText(clubId);
    if (!cleanClubId) return new Map();
    const snapshot = await db.collection("engagementSwimmerLicenses")
      .where("clubId", "==", cleanClubId)
      .limit(201)
      .get();
    if (snapshot.size > 200) {
      throw new backendContext.HttpsError("failed-precondition", "Trop de licences historiques pour une reconstruction directe de ce club.");
    }
    const byIndexId = new Map();
    snapshot.docs.forEach((doc) => {
      const license = (0, backendContext.local$engagementSwimmerLicenseItem)(doc);
      if (license.swimmerIndexId && license.licenseNumber) byIndexId.set(license.swimmerIndexId, license);
    });
    return byIndexId;
  }

  return { engagementLegacySwimmerLicensesByClub };
}

module.exports = { createEntryModelService_engagementLegacySwimmerLicensesByClub };
