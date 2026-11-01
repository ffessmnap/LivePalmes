// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_updateCurrentAccountEmail(backendContext) {
  async function updateCurrentAccountEmail(request) {
    await backendContext.assertLivePalmesAccess(request);
    const uid = backendContext.cleanText(request.auth?.uid);
    const email = backendContext.normalizeEmail(request.data?.email);
    backendContext.assertEmail(email);

    const authTime = Number(request.auth?.token?.auth_time || 0) * 1000;
    if (!authTime || Date.now() - authTime > 5 * 60 * 1000) {
      throw new backendContext.HttpsError("failed-precondition", "Reconnexion recente requise.");
    }

    const authUser = await backendContext.auth.getUser(uid);
    const previousEmail = backendContext.normalizeEmail(authUser.email);
    const userRef = backendContext.db.collection("users").doc(uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.exists ? userSnapshot.data() || {} : {};
    const capabilities = backendContext.ADMIN_UIDS.has(uid)
      ? backendContext.ACCESS_CAPABILITIES
      : backendContext.activeCapabilitiesFromMap(userData.capabilities || request.auth?.token?.livepalmesCapabilities || {});
    const accessScopes = userData.accessScopes || {};
    const now = new Date().toISOString();

    if (email !== previousEmail) {
      try {
        await backendContext.auth.updateUser(uid, { email, emailVerified: false });
      } catch (error) {
        if (error?.code === "auth/email-already-exists") {
          throw new backendContext.HttpsError("already-exists", "Cette adresse email est deja utilisee.");
        }
        if (error?.code === "auth/invalid-email") {
          throw new backendContext.HttpsError("invalid-argument", "Email invalide.");
        }
        throw error;
      }
    }

    try {
      const batch = backendContext.db.batch();
      batch.set(userRef, {
        uid,
        email,
        status: userData.status || "active",
        updatedAt: now,
        updatedBy: uid,
        ...(!userSnapshot.exists ? { createdAt: now, createdBy: uid } : {})
      }, { merge: true });
      backendContext.ACCESS_CAPABILITIES.forEach((capability) => {
        const grantRef = backendContext.db.collection("accessGrants").doc(`${uid}_${capability.replace(".", "_")}`);
        const scope = backendContext.normalizedAccessScope(accessScopes[capability]);
        batch.set(grantRef, {
          uid,
          email,
          capability,
          scopeType: scope.scopeType,
          scopeId: scope.scopeId,
          status: capabilities.includes(capability) ? "active" : "inactive",
          updatedAt: now,
          updatedBy: uid,
          createdAt: now
        }, { merge: true });
      });
      await batch.commit();
    } catch (error) {
      if (email !== previousEmail && previousEmail) {
        await backendContext.auth.updateUser(uid, { email: previousEmail }).catch((rollbackError) => {
          console.error("Rollback email compte impossible", rollbackError);
        });
      }
      throw new backendContext.HttpsError("internal", "La mise a jour du profil LivePalmes a echoue.");
    }

    await backendContext.writeAuditLog("accessUser.emailUpdated", uid, {
      uid,
      previousEmail,
      email
    }).catch((error) => console.warn("Journalisation du changement d'email impossible", error));

    return {
      ok: true,
      uid,
      email,
      verificationRequired: true
    };
  }

  return { updateCurrentAccountEmail };
}

module.exports = { createAccessHandlers_updateCurrentAccountEmail };
