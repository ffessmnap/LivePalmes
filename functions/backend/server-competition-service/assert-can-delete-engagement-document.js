// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_assertCanDeleteEngagementDocument(backendContext) {
  function assertCanDeleteEngagementDocument(context = {}, event = {}) {
    (0, backendContext.local$assertCanManageEngagementCompetition)(context, event);
    if (!context.national && (0, backendContext.local$engagementEventIsPast)(event)) {
      throw new backendContext.HttpsError("failed-precondition", "Un document existant ne peut plus etre supprime d'un evenement passe par la region.");
    }
  }

  async function mutateNativeCompetitionDocument(request, action) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = request.data?.calendarEventId || request.data?.competitionId;
    const pool = require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
    try {
      const result=await require("../../nap-competition-documents").mutate(pool, {...request.data, competitionId, action, actorUid:context.uid}, {
        national:context.national === true,
        authorize:async (connection,id,kind) => {
          const { SELECT_EVENT: __nativeMember0, EVENT_JOINS: __nativeMember1 } = require("../../nap-calendar-event");
const calendar={ SELECT_EVENT: __nativeMember0, EVENT_JOINS: __nativeMember1 };
          const rows=await require("../../nap-competition-query").bounded(connection,`${calendar.SELECT_EVENT.replace(" FROM competitions c",",cp.id AS parameter_id,cp.niveau FROM competitions c")}${calendar.EVENT_JOINS} WHERE c.id=? LIMIT 2`,[id],1);
          if(!rows.length) throw new backendContext.HttpsError("not-found","Compétition NAP introuvable.");
          const event=require("../../nap-portal-event").portalEventFromRow(rows[0]);
          (0, backendContext.local$assertCanManageEngagementCompetition)(context,event);
          if(kind==="delete") assertCanDeleteEngagementDocument(context,event);
          return Object.fromEntries(["id","date","enddate","comite","parameter_id","niveau"].map(key=>[key,rows[0][key]??null]));
        },
        downloadUrl:(path,token)=>backendContext.competitionDocumentDownloadUrl(backendContext.LIVEPALMES_STORAGE_BUCKET,path,token),
        saveFile:(upload,decoded)=>backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET).file(upload.path).save(decoded.buffer,{resumable:false,metadata:{contentType:decoded.contentType,cacheControl:"public, max-age=300, must-revalidate",metadata:{firebaseStorageDownloadTokens:upload.token}}}),
        deleteFile:path=>backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET).file(path).delete({ignoreNotFound:true}),
        audit:{
          read:async operation=>{const saved=await backendContext.db.collection("auditLogs").doc(`nap-document-${operation}-before`).get();return saved.exists?saved.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-document-${operation}-before`).create({action:"nap.document.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.document.saved",context.uid,{...target,auditPreparationId:`nap-document-${operation}-before`},operation)
        }
      });
      result.documents=await (0, backendContext.local$nativeDocumentAuthors)(result.documents);
      return result;
    } catch(error) {
      if(error instanceof backendContext.HttpsError)throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError||error instanceof TypeError?error.message:"Document NAP à vérifier. La sauvegarde est conservée ; rechargez avant de reprendre.");
    }
  }

  return { assertCanDeleteEngagementDocument, mutateNativeCompetitionDocument };
}

module.exports = { createCompetitionService_assertCanDeleteEngagementDocument };
