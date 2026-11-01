// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementSwimmerLicenseConflictData(backendContext) {
  function engagementSwimmerLicenseConflictData(data = {}, id = "", source = "") {
    return backendContext.cleanFirestoreValue({
      id,
      source: backendContext.cleanText(source).slice(0, 40),
      swimmerIndexId: backendContext.cleanText(data.swimmerIndexId || data.id).slice(0, 80),
      swimmerId: backendContext.cleanText(data.swimmerId).slice(0, 80),
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName).slice(0, 80),
      name: backendContext.cleanText(data.name).slice(0, 160),
      birthDate: backendContext.cleanIsoDate(data.birthDate),
      sex: backendContext.cleanText(data.sex).slice(0, 20),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60)
    });
  }

  async function findEngagementSwimmerLicenseConflict(db, swimmer = {}, ignoredSwimmerIds = []) {
    const licenseNumber = backendContext.cleanText(swimmer.licenseNumber).slice(0, 60);
    const licenseKey = (0, backendContext.local$engagementSwimmerLicenseNumberKey)(licenseNumber);
    if (!licenseKey) return null;
    const ignored = new Set((Array.isArray(ignoredSwimmerIds) ? ignoredSwimmerIds : [])
      .map((id) => backendContext.cleanText(id).slice(0, 80))
      .filter(Boolean));
    const licenseNumberRefId = (0, backendContext.local$engagementSwimmerLicenseNumberId)(licenseNumber);
    if (licenseNumberRefId) {
      const indexed = await db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(licenseNumberRefId).get();
      if (indexed.exists) {
        const data = indexed.data() || {};
        const indexedSwimmerId = backendContext.cleanText(data.swimmerIndexId || data.swimmerId).slice(0, 80);
        if (!indexedSwimmerId || !ignored.has(indexedSwimmerId)) {
          return engagementSwimmerLicenseConflictData(data, indexed.id, "license-index");
        }
      }
    }
    const collectedLicenseSnapshot = await db.collection("engagementSwimmerLicenses")
      .where("licenseNumber", "==", licenseNumber)
      .limit(2)
      .get();
    for (const doc of collectedLicenseSnapshot.docs) {
      const data = doc.data() || {};
      const indexedSwimmerId = backendContext.cleanText(data.swimmerIndexId || data.swimmerId).slice(0, 80);
      if (!indexedSwimmerId || !ignored.has(indexedSwimmerId)) {
        return engagementSwimmerLicenseConflictData(data, doc.id, "license-collection");
      }
    }
    const engagementSnapshot = await db.collection("engagementClubSwimmers")
      .where("licenseNumber", "==", licenseNumber)
      .limit(2)
      .get();
    for (const doc of engagementSnapshot.docs) {
      if (!ignored.has(doc.id)) {
        return engagementSwimmerLicenseConflictData({ ...(doc.data() || {}), swimmerIndexId: doc.id }, doc.id, "engagement");
      }
    }
    const performanceSnapshot = await db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
      .where("licenseNumber", "==", licenseNumber)
      .limit(2)
      .get();
    for (const doc of performanceSnapshot.docs) {
      if (!ignored.has(doc.id)) {
        return engagementSwimmerLicenseConflictData({ ...(doc.data() || {}), swimmerIndexId: doc.id }, doc.id, "performances");
      }
    }
    const referenceMatch = backendContext.intranapSwimmersIndex.find((match) => (0, backendContext.local$engagementSwimmerLicenseNumberKey)(match.licenseNumber) === licenseKey);
    if (referenceMatch && !ignored.has(backendContext.cleanText(referenceMatch.id || referenceMatch.swimmerIndexId).slice(0, 80))) {
      return engagementSwimmerLicenseConflictData(referenceMatch, backendContext.cleanText(referenceMatch.id || referenceMatch.swimmerIndexId), "reference");
    }
    return null;
  }

  return { engagementSwimmerLicenseConflictData, findEngagementSwimmerLicenseConflict };
}

module.exports = { createEntryModelService_engagementSwimmerLicenseConflictData };
