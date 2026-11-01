// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_listAccessUserDeletionRequests(backendContext) {
  async function listAccessUserDeletionRequests(request) {
    const context = await backendContext.accessManagementContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Admin national requis.");
    }
    const snapshot = await backendContext.db.collection("accessUserDeletionRequests")
      .where("status", "==", "pending")
      .limit(100)
      .get();
    const requests = snapshot.docs
      .map(backendContext.accessUserDeletionRequestItem)
      .sort((left, right) => String(left.requestedAt || "").localeCompare(String(right.requestedAt || "")));
    return {
      ok: true,
      requests
    };
  }

  return { listAccessUserDeletionRequests };
}

module.exports = { createAccessHandlers_listAccessUserDeletionRequests };
