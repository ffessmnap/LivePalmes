// Existing bodies isolated by responsibility; no I/O during factory creation.
function createAccountHandlers(backendContext) {
  async function createOrUpdateAccessUser(request) {
    const context = await backendContext.accessManagementContext(request);
    const raw = request.data || {};
    if (!context.adminFull && (!context.region || !context.regionId || raw.uid ||
        !Array.isArray(raw.capabilities) || raw.capabilities.length !== 1 || raw.capabilities[0] !== "engagements.club.manage" ||
        backendContext.canonicalAccessDirectoryRegionId(raw.regionId) !== context.regionId)) {
      throw new backendContext.HttpsError("permission-denied", "Creation limitee aux acces club de votre region.");
    }
    const profile = backendContext.cleanAccessProfile(request.data || {});
    if (!context.adminFull) {
      const club = await backendContext.engagementClubAccessContext({ ...request, data: { activeClubId: profile.clubId } });
      profile.clubId = club.clubId;
      profile.clubName = club.clubName;
      profile.regionId = context.regionId;
      // Creation only: preserve existing accounts and cumulative capabilities.
      try {
        await backendContext.auth.getUserByEmail(profile.email);
        throw new backendContext.HttpsError("already-exists", "Ce compte existe deja ; contactez l'administration nationale.");
      } catch (error) {
        if (error?.code !== "auth/user-not-found") throw error;
      }
      profile.createOnly = true;
    }
    return backendContext.saveAccessUserProfile(profile, request.auth.uid);
  }

  return { createOrUpdateAccessUser };
}

module.exports = { createAccountHandlers };
