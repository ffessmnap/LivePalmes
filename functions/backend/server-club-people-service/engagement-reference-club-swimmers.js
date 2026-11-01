// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_engagementReferenceClubSwimmers(backendContext) {
  function engagementReferenceClubSwimmers(clubId = "", limit = 800) {
    const targetClubId = backendContext.cleanText(clubId);
    if (!targetClubId) return [];
    return backendContext.intranapSwimmersIndex
      .filter((swimmer) => backendContext.cleanText(swimmer.clubId) === targetClubId)
      .slice(0, limit)
      .map(backendContext.local$engagementReferenceSwimmerItem)
      .filter((swimmer) => swimmer.swimmerIndexId && swimmer.clubId === targetClubId);
  }

  async function rebuildEngagementClubRoster(db, context = {}, limit = 800) {
    const clubId = backendContext.cleanText(context.clubId);
    if (!clubId) return [];
    const snapshot = await db
      .collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
      .where("clubId", "==", clubId)
      .limit(limit)
      .get();
    const newSwimmersSnapshot = await db
      .collection("engagementClubSwimmers")
      .where("clubId", "==", clubId)
      .where("active", "==", true)
      .limit(200)
      .get();
    const legacyLicenses = await backendContext.engagementLegacySwimmerLicensesByClub(db, clubId);
    const swimmers = (0, backendContext.local$sortEngagementClubSwimmers)((0, backendContext.local$uniqueEngagementClubSwimmers)([
      ...newSwimmersSnapshot.docs.map(backendContext.engagementNewSwimmerItem),
      ...snapshot.docs.map(backendContext.local$engagementClubSwimmerItem),
      ...engagementReferenceClubSwimmers(clubId, limit)
    ], limit).map((swimmer) => {
      const legacyLicense = legacyLicenses.get(swimmer.swimmerIndexId);
      return legacyLicense?.licenseNumber
        ? {
            ...swimmer,
            licenseNumber: legacyLicense.licenseNumber,
            licenseVerificationStatus: legacyLicense.verificationStatus || "pending",
            licenseSeasonLabel: legacyLicense.licenseSeasonLabel,
            licenseSeasonStatus: legacyLicense.licenseSeasonStatus,
            licenseSeasons: legacyLicense.licenseSeasons
          }
        : swimmer;
    }));
    const now = new Date().toISOString();
    const rosterEntries = {};
    swimmers.forEach((swimmer) => {
      const item = backendContext.engagementClubRosterSwimmerItem(swimmer);
      if (item.swimmerIndexId && item.clubId === clubId) rosterEntries[backendContext.engagementClubRosterSwimmerKey(item)] = item;
    });
    await backendContext.engagementClubRosterRef(db, clubId).set({
      clubId,
      clubName: backendContext.cleanText(context.clubName).slice(0, 140) || swimmers.find((swimmer) => swimmer.clubName)?.clubName || "",
      generatedAt: now,
      updatedAt: now,
      swimmerCount: Object.keys(rosterEntries).length,
      swimmers: rosterEntries
    }, { merge: false });
    return swimmers;
  }

  return { engagementReferenceClubSwimmers, rebuildEngagementClubRoster };
}

module.exports = { createClubPeopleService_engagementReferenceClubSwimmers };
