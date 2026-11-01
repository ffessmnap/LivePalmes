// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_listEngagementSwimmerChangeRequests(backendContext) {
  async function listEngagementSwimmerChangeRequests(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Lecture reservee au niveau national.");
    const status = ["pending", "approved", "rejected"].includes(backendContext.cleanText(request.data?.status))
      ? backendContext.cleanText(request.data.status)
      : "pending";
    const limit = Math.min(100, Math.max(10, Math.trunc(Number(request.data?.limit) || 50)));
    const snapshot = await backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION)
      .where("status", "==", status)
      .limit(limit)
      .get();
    const requests = snapshot.docs
      .map(backendContext.engagementSwimmerChangeRequestItem)
      .sort((left, right) => backendContext.cleanText(right.requestedAt).localeCompare(backendContext.cleanText(left.requestedAt)));
    return { ok: true, status, requests };
  }

  return { listEngagementSwimmerChangeRequests };
}

module.exports = { createNationalHandlers_listEngagementSwimmerChangeRequests };
