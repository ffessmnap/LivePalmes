// Existing operation bodies; live services arrive through explicit accessors.
function createDirectoryService_deleteAccessUserAccount(backendContext) {
  async function deleteAccessUserAccount(uid, actorUid, source = {}) {
    const targetUid = backendContext.cleanText(uid);
    if (!targetUid) {
      throw new backendContext.HttpsError("invalid-argument", "Utilisateur requis.");
    }
    if (targetUid === actorUid) {
      throw new backendContext.HttpsError("failed-precondition", "Tu ne peux pas supprimer ton propre acces.");
    }
    if (backendContext.ADMIN_UIDS.has(targetUid)) {
      throw new backendContext.HttpsError("failed-precondition", "Ce compte administrateur racine ne peut pas etre supprime.");
    }
    const userRef = backendContext.db.collection("users").doc(targetUid);
    const snapshot = await userRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Acces LivePalmes introuvable.");
    }
    const data = snapshot.data() || {};
    const capabilities = backendContext.activeCapabilitiesFromMap(data.capabilities || {});
    const email = data.email || "";
    try {
      await backendContext.auth.deleteUser(targetUid);
    } catch (error) {
      if (error?.code !== "auth/user-not-found") throw error;
    }
    const batch = backendContext.db.batch();
    batch.delete(userRef);
    backendContext.ACCESS_CAPABILITIES.forEach((capability) => {
      batch.delete(backendContext.db.collection("accessGrants").doc(`${targetUid}_${capability.replace(".", "_")}`));
    });
    await batch.commit();
    await backendContext.writeAuditLog("accessUser.deleted", actorUid, {
      uid: targetUid,
      email,
      capabilities,
      regionId: data.regionId || "",
      clubId: data.clubId || "",
      source
    });
    return {
      ok: true,
      uid: targetUid,
      email
    };
  }

  return { deleteAccessUserAccount };
}

module.exports = { createDirectoryService_deleteAccessUserAccount };
