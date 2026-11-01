// Existing operation bodies; live services arrive through explicit accessors.
function createDirectoryService_engagementAccessRequestItem(backendContext) {
  function engagementAccessRequestItem(doc) {
    const data = doc.data() || {};
    return backendContext.cleanFirestoreValue({
      id: doc.id,
      email: backendContext.cleanText(data.email).slice(0, 180),
      firstName: backendContext.cleanText(data.firstName).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName).slice(0, 80),
      clubRole: backendContext.cleanText(data.clubRole).slice(0, 120),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      newClubRequested: data.newClubRequested === true,
      newClub: data.newClubRequested === true ? {
        clubCode: backendContext.cleanText(data.newClub?.clubCode).slice(0, 40),
        clubName: backendContext.cleanText(data.newClub?.clubName).slice(0, 140),
        regionId: backendContext.cleanText(data.newClub?.regionId || data.regionId).slice(0, 80),
        federalNumber: backendContext.cleanText(data.newClub?.federalNumber).slice(0, 24),
        city: backendContext.cleanText(data.newClub?.city).slice(0, 100),
        postalCode: backendContext.cleanText(data.newClub?.postalCode).slice(0, 16)
      } : null,
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60),
      message: backendContext.cleanText(data.message).slice(0, 600),
      status: backendContext.cleanText(data.status || "pending").slice(0, 40),
      requestedBy: backendContext.cleanText(data.requestedBy).slice(0, 80),
      requestedByEmail: backendContext.cleanText(data.requestedByEmail).slice(0, 180),
      requestedAt: backendContext.cleanText(data.requestedAt).slice(0, 40),
      resolvedAt: backendContext.cleanText(data.resolvedAt).slice(0, 40),
      resolvedBy: backendContext.cleanText(data.resolvedBy).slice(0, 80),
      resolvedByEmail: backendContext.cleanText(data.resolvedByEmail).slice(0, 180),
      resolutionReason: backendContext.cleanText(data.resolutionReason).slice(0, 600),
      resolutionNotification: data.resolutionNotification && typeof data.resolutionNotification === "object"
        ? data.resolutionNotification
        : null
    });
  }

  return { engagementAccessRequestItem };
}

module.exports = { createDirectoryService_engagementAccessRequestItem };
