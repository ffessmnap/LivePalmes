// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_getNapPerformanceAdministration(backendContext) {
  async function getNapPerformanceAdministration(request) {
    if(request.data?.recordsAction!==undefined){
      if(request.data.recordsAction!=="read")throw new backendContext.HttpsError("invalid-argument","Action Records invalide.");
      return backendContext.readNapRecordsAdministration(request);
    }
    if(backendContext.ENVIRONMENT.sportingDataSource !== "nap")throw new backendContext.HttpsError("failed-precondition","Source NAP requise.");
    try{return await require("../../nap-performance-administration").createPerformanceAdministration({authorize:backendContext.authorizeNativePerformance,getPool:()=>require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD)})(request);}
    catch(error){throw backendContext.nativePerformanceFailure(error);}
  }

  return { getNapPerformanceAdministration };
}

module.exports = { createPerformanceHandlers_getNapPerformanceAdministration };
