// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_resolveAccessUserDeletionRequest(backendContext) {
  async function resolveAccessUserDeletionRequest(request) {
    const context = await backendContext.accessManagementContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Admin national requis.");
    }
    const requestId = backendContext.cleanText(request.data?.requestId);
    const decision = backendContext.cleanText(request.data?.decision);
    const decisionMail = require("../../request-decision-mail");
    let choice;
    if (request.data?.action !== "retryNotification") {
      try { choice = decisionMail.options(request.data); }
      catch (error) { throw new backendContext.HttpsError("invalid-argument", error.message); }
    }
    if (!requestId) {
      throw new backendContext.HttpsError("invalid-argument", "Demande requise.");
    }
    if (request.data?.action !== "retryNotification" && !["approved", "rejected"].includes(decision)) {
      throw new backendContext.HttpsError("invalid-argument", "Decision invalide.");
    }
    const requestRef = backendContext.db.collection("accessUserDeletionRequests").doc(requestId);
    const snapshot = await requestRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Demande introuvable.");
    }
    const data = snapshot.data() || {};
    if (request.data?.action === "retryNotification") {
      if (!backendContext.cleanText(request.data?.notificationKey)) throw new backendContext.HttpsError("invalid-argument", "Notification requise.");
      return { ok: true, resolutionNotification: await decisionMail.deliver(backendContext.db, requestRef, backendContext.requestDecisionMailServices(), request.data.notificationKey) };
    }
    if (data.status !== "pending") {
      throw new backendContext.HttpsError("failed-precondition", "Cette demande a deja ete traitee.");
    }
    let deletionResult = null;
    if (decision === "approved") {
      deletionResult = await backendContext.deleteAccessUserAccount(data.targetUid, context.uid, { mode: "request", requestId });
    }
    const now = new Date().toISOString();
    await decisionMail.commit(backendContext.db, requestRef, data, {
      status: decision, resolutionNote: choice.comment, notifyRequester: choice.notifyRequester,
      resolutionNotification: decisionMail.intent(data, requestId, "account_deletion", decision, choice),
      decision,
      resolvedBy: context.uid,
      resolvedByEmail: context.email || "",
      resolvedAt: now,
      updatedAt: now,
      targetDeleted: decision === "approved"
    });
    await backendContext.writeAuditLog("accessUser.deletionRequestResolved", context.uid, {
      requestId,
      decision,
      uid: data.targetUid || "",
      email: data.targetEmail || ""
    });
    const resolutionNotification = await decisionMail.deliver(backendContext.db, requestRef, backendContext.requestDecisionMailServices(), decisionMail.intent(data, requestId, "account_deletion", decision, choice).key, false);
    return {
      ok: true, resolutionNotification,
      requestId,
      decision,
      deletion: deletionResult
    };
  }

  return { resolveAccessUserDeletionRequest };
}

module.exports = { createAccessHandlers_resolveAccessUserDeletionRequest };
