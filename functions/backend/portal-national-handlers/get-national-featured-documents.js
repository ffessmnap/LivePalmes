// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_getNationalFeaturedDocuments(backendContext) {
  async function getNationalFeaturedDocuments(request) {
    if(request.data?.library===true)return backendContext.manageNationalLibraryDocuments(request);
    const context=await backendContext.engagementAccessContext(request);
    if(!context.national)throw new backendContext.HttpsError("permission-denied","Administration nationale requise.");
    if(backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("failed-precondition","Sélection documentaire indisponible.");
    try{
      const pool=require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const selection=await require("../../nap-featured-documents").readSelection(pool);
      return {source:"nap",documents:selection.documents,fingerprint:selection.fingerprint};
    }catch(error){throw new backendContext.HttpsError("failed-precondition",error instanceof TypeError?error.message:"Sélection documentaire momentanément indisponible.");}
  }

  return { getNationalFeaturedDocuments };
}

module.exports = { createNationalHandlers_getNationalFeaturedDocuments };
