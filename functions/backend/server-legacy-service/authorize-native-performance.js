// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_authorizeNativePerformance(backendContext) {
  function authorizeNativePerformance(request) {
    if(!request.auth?.uid)throw new backendContext.HttpsError("unauthenticated","Connexion requise.");
    backendContext.assertCapability(request,"competitions.import");
    const caps=request.auth.token?.livepalmesCapabilities||{};
    return {uid:request.auth.uid,national:backendContext.ADMIN_UIDS.has(request.auth.uid)||caps["admin.full"]===true||caps["engagements.national.manage"]===true};
  }

  return { authorizeNativePerformance };
}

module.exports = { createLegacyService_authorizeNativePerformance };
