// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_listEngagementAccessRequests(backendContext) {
  async function listEngagementAccessRequests(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.region && !context.national) {
      throw new backendContext.HttpsError("permission-denied", "Lecture reservee aux responsables engagements region ou national.");
    }
    if (request.data?.status === "history") {
      return require("../../access-request-history").listHistory({
        db: /* backend-shorthand */ backendContext.db, FieldPath: /* backend-shorthand */ backendContext.FieldPath, context, input: request.data, item: backendContext.engagementAccessRequestItem, HttpsError: /* backend-shorthand */ backendContext.HttpsError
      });
    }
    const status = ["pending", "approved", "rejected"].includes(backendContext.cleanText(request.data?.status))
      ? backendContext.cleanText(request.data.status)
      : "pending";
    const limit = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.limit) || 80)));
    let requestsQuery = backendContext.db.collection("engagementAccessRequests").where("status", "==", status);
    if (!context.national) {
      if (!context.regionId) {
        throw new backendContext.HttpsError("failed-precondition", "Perimetre regional requis.");
      }
      requestsQuery = requestsQuery.where("regionId", "==", context.regionId);
    }
    const snapshot = await requestsQuery.limit(limit).get();
    const requests = snapshot.docs
      .map(backendContext.engagementAccessRequestItem)
      .filter((item) => context.national || item.regionId === context.regionId)
      .sort((left, right) =>
        backendContext.cleanText(right.requestedAt).localeCompare(backendContext.cleanText(left.requestedAt)) ||
        backendContext.cleanText(left.lastName).localeCompare(backendContext.cleanText(right.lastName), "fr")
      );
    return {
      ok: true,
      requests
    };
  }

  return { listEngagementAccessRequests };
}

module.exports = { createCompetitionHandlers_listEngagementAccessRequests };
