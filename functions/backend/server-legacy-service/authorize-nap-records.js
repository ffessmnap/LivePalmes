// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_authorizeNapRecords(backendContext) {
  function authorizeNapRecords(request){
    if(!request.auth?.uid)throw new backendContext.HttpsError("unauthenticated","Connexion requise.");
    if(!backendContext.ADMIN_UIDS.has(request.auth.uid) && request.auth.token?.livepalmesAccess!==true)throw new backendContext.HttpsError("permission-denied","Acces LivePalmes actif requis.");
    backendContext.assertCapability(request,"records.manage");
    if(backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("failed-precondition","Source NAP requise.");
    return {uid:request.auth.uid,email:request.auth.token?.email||""};
  }

  return { authorizeNapRecords };
}

module.exports = { createLegacyService_authorizeNapRecords };
