// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_importSwimmerCreation(backendContext) {
  async function importSwimmerCreation(request,write) {
    if(backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("failed-precondition","Source NAP requise.");
    try{return await require("../../nap-import-swimmer-creation").service({
      authorize:backendContext.authorizeNativePerformance,
      getPool:()=>require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),
      formatAlert:(match,type,clubId)=>{
        const {validationStatus,...alert}=backendContext.engagementNewSwimmerAlertFromMatch(match,{clubId},type);
        return alert;
      },
      audit:context=>({
        read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).get();return doc.exists?doc.data().target:null;},
        prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).create({action:"nap.swimmerCreate.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
        checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).update({target}),
        complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.swimmerCreate.complete",context.uid,{...target,validationScope:"national-import",auditPreparationId:`nap-swimmer-create-${operation}-before`},`nap-swimmer-create-${operation}-complete`)
      })
    })(request,write);}catch(error){throw backendContext.nativePerformanceFailure(error);}
  }

  return { importSwimmerCreation };
}

module.exports = { createNationalService_importSwimmerCreation };
