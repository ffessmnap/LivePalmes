// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_resolveAccessUserDeletionRequest(backendContext) {
  async function resolveAccessUserDeletionRequest(request) {
    const context = await backendContext.accessManagementContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Admin national requis.");
    }
    const requestId = backendContext.cleanText(request.data?.requestId);
    const decision = backendContext.cleanText(request.data?.decision);
    if (!requestId) {
      throw new backendContext.HttpsError("invalid-argument", "Demande requise.");
    }
    if (!["approved", "rejected"].includes(decision)) {
      throw new backendContext.HttpsError("invalid-argument", "Decision invalide.");
    }
    const requestRef = backendContext.db.collection("accessUserDeletionRequests").doc(requestId);
    const snapshot = await requestRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Demande introuvable.");
    }
    const data = snapshot.data() || {};
    if (data.status !== "pending") {
      throw new backendContext.HttpsError("failed-precondition", "Cette demande a deja ete traitee.");
    }
    let deletionResult = null;
    if (decision === "approved") {
      deletionResult = await backendContext.deleteAccessUserAccount(data.targetUid, context.uid, { mode: "request", requestId });
    }
    const now = new Date().toISOString();
    await requestRef.set({
      status: decision,
      decision,
      resolvedBy: context.uid,
      resolvedByEmail: context.email || "",
      resolvedAt: now,
      updatedAt: now,
      targetDeleted: decision === "approved"
    }, { merge: true });
    await backendContext.writeAuditLog("accessUser.deletionRequestResolved", context.uid, {
      requestId,
      decision,
      uid: data.targetUid || "",
      email: data.targetEmail || ""
    });
    return {
      ok: true,
      requestId,
      decision,
      deletion: deletionResult
    };
  }

  return { resolveAccessUserDeletionRequest };
}

module.exports = { createAccessHandlers_resolveAccessUserDeletionRequest };
