// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_saveNationalFeaturedDocuments(backendContext) {
  async function saveNationalFeaturedDocuments(request) {
    if(request.data?.library===true)return backendContext.manageNationalLibraryDocuments(request);
    if(backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("failed-precondition","Sélection documentaire indisponible.");
    try{
      const pool=require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const result=await require("../../nap-featured-documents").saveSelection(pool,request.data,{
        authorize:()=>backendContext.engagementAccessContext(request),
        audit:{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-featured-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-featured-${operation}-before`).create({action:"nap.featured.prepare",actorUid:target.actorUid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.featured.saved",request.auth.uid,{...target,auditPreparationId:`nap-featured-${operation}-before`},operation)
        }
      });
      return {source:"nap",...result};
    }catch(error){
      if(error instanceof backendContext.HttpsError)throw error;
      throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Enregistrement à vérifier. Rechargez la sélection ; la sauvegarde technique est conservée.");
    }
  }

  return { saveNationalFeaturedDocuments };
}

module.exports = { createNationalHandlers_saveNationalFeaturedDocuments };
