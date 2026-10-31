// Existing bodies isolated by responsibility; no I/O during factory creation.
function createAccountWriteService(backendContext) {
  async function userByEmailOrCreate(profile) {
    const displayName = backendContext.displayNameFromProfile(profile);
    if (profile.createOnly) {
      // Auth uniqueness closes the race after the read-only email lookup.
      const user = await backendContext.auth.createUser({ email: profile.email, emailVerified: false, displayName, disabled: false });
      return { user, created: true };
    }
    if (profile.uid) {
      const existing = await backendContext.auth.getUser(profile.uid);
      await backendContext.auth.updateUser(existing.uid, { email: profile.email, displayName, disabled: false });
      return { user: { ...existing, email: profile.email, displayName }, created: false };
    }
    try {
      const existing = await backendContext.auth.getUserByEmail(profile.email);
      await backendContext.auth.updateUser(existing.uid, { displayName, disabled: false });
      return { user: existing, created: false };
    } catch (error) {
      if (error?.code !== "auth/user-not-found") throw error;
      const user = await backendContext.auth.createUser({
        email: profile.email,
        emailVerified: false,
        displayName,
        disabled: false
      });
      return { user, created: true };
    }
  }

  async function saveAccessUserProfile(profile, actorUid) {
    const { user, created } = await userByEmailOrCreate(profile);
    const now = new Date().toISOString();
    const capabilityMap = backendContext.capabilitiesMap(profile.capabilities);

    await backendContext.auth.setCustomUserClaims(user.uid, {
      ...(user.customClaims || {}),
      livepalmesAccess: true,
      livepalmesConsoleAccess: backendContext.hasConsolePortalCapability(capabilityMap),
      livepalmesCapabilities: capabilityMap
    });

    const userRef = backendContext.db.collection("users").doc(user.uid);
    await userRef.set({
      uid: user.uid,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      clubId: profile.clubId,
      clubName: profile.clubName,
      regionId: profile.regionId,
      licenseNumber: profile.licenseNumber,
      status: "active",
      capabilities: capabilityMap,
      accessDirectoryKeys: backendContext.accessDirectoryKeys({ ...profile, capabilities: profile.capabilities }, "active"),
      accessScopes: profile.accessScopes,
      updatedAt: now,
      updatedBy: actorUid,
      ...(created ? { createdAt: now, createdBy: actorUid } : {})
    }, { merge: true });

    await backendContext.writeAccessGrants(user.uid, profile.email, profile.capabilities, "active", actorUid, now, profile.accessScopes);

    await backendContext.writeAuditLog(created ? "accessUser.created" : "accessUser.updated", actorUid, {
      uid: user.uid,
      email: profile.email,
      capabilities: profile.capabilities,
      accessScopes: profile.accessScopes
    });

    return {
      ok: true,
      created,
      uid: user.uid,
      email: profile.email,
      capabilities: profile.capabilities
    };
  }

  return { userByEmailOrCreate, saveAccessUserProfile };
}

module.exports = { createAccountWriteService };
