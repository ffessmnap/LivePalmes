// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_authorizeNativePerformance(backendContext) {
  async function authorizeNativePerformance(request) {
    if(!request.auth?.uid)throw new backendContext.HttpsError("unauthenticated","Connexion requise.");
    const profile = await backendContext.assertCapability(request,"competitions.import");
    const caps=profile.capabilities;
    return {uid:request.auth.uid,national:caps["admin.full"]===true||caps["engagements.national.manage"]===true};
  }

  return { authorizeNativePerformance };
}

module.exports = { createLegacyService_authorizeNativePerformance };
