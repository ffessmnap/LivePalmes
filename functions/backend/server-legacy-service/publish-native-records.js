// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_publishNativeRecords(backendContext) {
  async function publishNativeRecords(request){
    const actor=(0, backendContext.local$authorizeNapRecords)(request);
    try{
      const result=await require("../../nap-records-store").publish(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),request.data,actor);
      await backendContext.writeAuditLogOnce("recordsMpf.published",actor.uid,{version:String(result.revision),source:"nap",publishedAt:result.data.updatedAt||""},`nap-records-${request.data.operationId}`);
      return result;
    }
    catch(error){throw (0, backendContext.local$nativePerformanceFailure)(error);}
  }

  return { publishNativeRecords };
}

module.exports = { createLegacyService_publishNativeRecords };
