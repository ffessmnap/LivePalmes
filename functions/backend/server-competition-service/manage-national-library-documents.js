// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_manageNationalLibraryDocuments(backendContext) {
  async function manageNationalLibraryDocuments(request) {
    const context=await (0, backendContext.local$nationalLibraryContext)(request);
    const library=require("../../nap-national-documents");
    const pool=require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
    try{
      const input=request.data||{};
      if(input.action==='list')return await library.list(pool,input);
      if(input.action==='detail')return {document:library.view(await library.record(pool,input.documentId))};
      return await library.mutate(pool,input,{
        authorize:()=>(0, backendContext.local$nationalLibraryContext)(request),
        downloadUrl:(path,token)=>backendContext.competitionDocumentDownloadUrl(backendContext.LIVEPALMES_STORAGE_BUCKET,path,token),
        saveFile:(upload,decoded)=>backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET).file(upload.path).save(decoded.buffer,{resumable:false,metadata:{contentType:decoded.contentType,cacheControl:'public, max-age=300, must-revalidate',metadata:{firebaseStorageDownloadTokens:upload.token}}}),
        audit:{
          read:async operation=>(await backendContext.db.collection('auditLogs').doc(`national-document-${operation}-before`).get()).exists,
          prepare:(operation,target)=>backendContext.db.collection('auditLogs').doc(`national-document-${operation}-before`).create({action:'nap.nationalDocument.prepare',actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce('nap.nationalDocument.saved',context.uid,{...target,auditPreparationId:`national-document-${operation}-before`},operation)
        }
      });
    }catch(error){
      if(error instanceof backendContext.HttpsError)throw error;
      throw new backendContext.HttpsError(error instanceof TypeError?'failed-precondition':error instanceof RangeError?'resource-exhausted':'unavailable',error instanceof TypeError||error instanceof RangeError?error.message:'Opération à vérifier. La sauvegarde technique est conservée ; rechargez avant de reprendre.');
    }
  }

  return { manageNationalLibraryDocuments };
}

module.exports = { createCompetitionService_manageNationalLibraryDocuments };
