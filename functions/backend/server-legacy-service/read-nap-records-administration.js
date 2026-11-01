// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_readNapRecordsAdministration(backendContext) {
  async function readNapRecordsAdministration(request){
    (0, backendContext.local$authorizeNapRecords)(request);
    try{return await require("../../nap-records-store").read(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{administration:true});}
    catch(error){throw (0, backendContext.local$nativePerformanceFailure)(error);}
  }

  return { readNapRecordsAdministration };
}

module.exports = { createLegacyService_readNapRecordsAdministration };
