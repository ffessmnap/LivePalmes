// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementSwimmerRecoveryPreview(backendContext) {
  async function engagementSwimmerRecoveryPreview(db, licenseNumber, context = {}) {
    const cleanLicense = backendContext.cleanText(licenseNumber).toUpperCase().slice(0, 60);
    if (!backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(cleanLicense)) {
      throw new backendContext.HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
    }
    const conflict = await (0, backendContext.local$findEngagementSwimmerLicenseConflict)(db, { licenseNumber: cleanLicense });
    if (!conflict) return { found: false, licenseNumber: cleanLicense };

    const [performanceSnapshot, licenseSnapshot] = await Promise.all([
      db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).where("licenseNumber", "==", cleanLicense).limit(2).get(),
      db.collection("engagementSwimmerLicenses").where("licenseNumber", "==", cleanLicense).limit(2).get()
    ]);
    const conflictSwimmerId = backendContext.cleanText(conflict.swimmerIndexId || conflict.swimmerId).slice(0, 80);
    let engagementDoc = null;
    if (conflictSwimmerId) {
      const snapshot = await db.collection("engagementClubSwimmers").doc(conflictSwimmerId).get();
      if (snapshot.exists && (0, backendContext.local$engagementSwimmerLicenseNumberKey)(snapshot.data()?.licenseNumber) === (0, backendContext.local$engagementSwimmerLicenseNumberKey)(cleanLicense)) {
        engagementDoc = snapshot;
      }
    }
    const performanceDoc = performanceSnapshot.docs[0] || null;
    const stored = engagementDoc ? (0, backendContext.local$engagementNewSwimmerItem)(engagementDoc) : null;
    const performance = performanceDoc
      ? (0, backendContext.local$engagementClubRosterSwimmerItem)({ ...(performanceDoc.data() || {}), id: performanceDoc.id, swimmerIndexId: performanceDoc.id, source: "performances" })
      : null;
    const swimmer = stored || performance || (0, backendContext.local$engagementClubRosterSwimmerItem)({ ...conflict, source: conflict.source || "reference" });
    const season = backendContext.currentEngagementSeasonInfo();
    const bounds = backendContext.engagementSeasonBoundsFromEndYear(season.endYear);
    const publishedResult = performanceSnapshot.docs.some((doc) => {
      const date = backendContext.cleanIsoDate(doc.data()?.latestDate);
      return date >= bounds.startDate && date <= bounds.endDate;
    });
    return {
      found: true,
      sameClub: backendContext.cleanText(swimmer.clubId) === backendContext.cleanText(context.clubId),
      eligible: backendContext.cleanText(swimmer.clubId) !== backendContext.cleanText(context.clubId) && !publishedResult,
      publishedResult,
      swimmer,
      source: stored ? "engagement" : performance ? "performances" : "reference",
      engagementSwimmerId: stored?.swimmerIndexId || "",
      licenseRecordIds: licenseSnapshot.docs.map((doc) => doc.id),
      season: {
        label: season.label,
        startDate: bounds.startDate,
        endDate: bounds.endDate
      }
    };
  }

  return { engagementSwimmerRecoveryPreview };
}

module.exports = { createEntryModelService_engagementSwimmerRecoveryPreview };
