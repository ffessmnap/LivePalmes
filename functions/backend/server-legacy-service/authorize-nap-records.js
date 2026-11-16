// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_authorizeNapRecords(backendContext) {
  async function authorizeNapRecords(request){
    if(!request.auth?.uid)throw new backendContext.HttpsError("unauthenticated","Connexion requise.");
    await backendContext.assertCapability(request,"records.manage");
    if(backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("failed-precondition","Source NAP requise.");
    return {uid:request.auth.uid,email:request.auth.token?.email||""};
  }

  return { authorizeNapRecords };
}

module.exports = { createLegacyService_authorizeNapRecords };
