// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_requestAccessUserDeletion(backendContext) {
  async function requestAccessUserDeletion(request) {
    const context = await backendContext.accessManagementContext(request);
    if (context.national) {
      throw new backendContext.HttpsError("failed-precondition", "Un admin national peut supprimer directement ce compte.");
    }
    const targetUid = backendContext.cleanText(request.data?.uid);
    if (!targetUid) {
      throw new backendContext.HttpsError("invalid-argument", "Utilisateur requis.");
    }
    if (targetUid === context.uid) {
      throw new backendContext.HttpsError("failed-precondition", "Tu ne peux pas demander la suppression de ton propre acces.");
    }
    const userRef = backendContext.db.collection("users").doc(targetUid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Acces LivePalmes introuvable.");
    }
    const data = snapshot.data() || {};
    backendContext.assertRegionalAccessUserDeletionRequestAllowed(context, data);

    const pendingSnapshot = await backendContext.db.collection("accessUserDeletionRequests")
      .where("targetUid", "==", targetUid)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    if (!pendingSnapshot.empty) {
      throw new backendContext.HttpsError("already-exists", "Une demande de suppression est deja en attente pour ce compte.");
    }

    const now = new Date().toISOString();
    const requestRef = await backendContext.db.collection("accessUserDeletionRequests").add({
      targetUid,
      targetEmail: data.email || "",
      targetFirstName: data.firstName || "",
      targetLastName: data.lastName || "",
      targetRegionId: backendContext.accessUserRegionIdFromData(data),
      targetClubId: data.clubId || "",
      targetClubName: data.clubName || "",
      targetCapabilities: backendContext.activeCapabilitiesFromMap(data.capabilities || {}),
      status: "pending",
      requestedBy: context.uid,
      requestedByEmail: context.email || "",
      requestedAt: now,
      updatedAt: now
    });
    await backendContext.writeAuditLog("accessUser.deletionRequested", context.uid, {
      requestId: requestRef.id,
      uid: targetUid,
      email: data.email || "",
      regionId: backendContext.accessUserRegionIdFromData(data)
    });
    const created = await requestRef.get();
    return {
      ok: true,
      request: backendContext.accessUserDeletionRequestItem(created)
    };
  }

  return { requestAccessUserDeletion };
}

module.exports = { createAccessHandlers_requestAccessUserDeletion };
