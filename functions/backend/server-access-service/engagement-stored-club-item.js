// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_engagementStoredClubItem(backendContext) {
  function engagementStoredClubItem(doc) {
    const data = doc?.data ? doc.data() || {} : doc || {};
    return (0, backendContext.local$cleanFirestoreValue)({
      id: backendContext.cleanText(doc?.id || data.id || data.clubId).slice(0, 40),
      clubId: backendContext.cleanText(data.clubId || doc?.id).slice(0, 40),
      clubCode: backendContext.cleanText(data.clubCode).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      federalNumber: backendContext.cleanText(data.federalNumber).slice(0, 24),
      city: backendContext.cleanText(data.city).slice(0, 100),
      postalCode: backendContext.cleanText(data.postalCode).slice(0, 16),
      active: data.active !== false,
      deleted: data.deleted === true,
      source: backendContext.cleanText(data.source || "national").slice(0, 40),
      createdAt: backendContext.cleanText(data.createdAt).slice(0, 40),
      createdBy: backendContext.cleanText(data.createdBy).slice(0, 128),
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40),
      updatedBy: backendContext.cleanText(data.updatedBy).slice(0, 128)
    });
  }

  return { engagementStoredClubItem };
}

module.exports = { createAccessService_engagementStoredClubItem };
