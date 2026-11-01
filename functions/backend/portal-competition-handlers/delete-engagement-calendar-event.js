// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_deleteEngagementCalendarEvent(backendContext) {
  async function deleteEngagementCalendarEvent(request) {
    const context = await backendContext.engagementAccessContext(request);
    const calendarEventId = backendContext.cleanText(request.data?.calendarEventId).slice(0, 128);
    if (!calendarEventId) throw new backendContext.HttpsError("invalid-argument", "Evenement requis.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const pool=require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      try {
        const result=await require("../../nap-competition-deletion").competitionDeletion(pool,{competitionId:calendarEventId,actorUid:context.uid,previewOnly:request.data?.previewOnly===true,confirmPermanent:request.data?.confirmPermanent===true,expectedFingerprint:request.data?.expectedFingerprint},{
          prepare:(id,target)=>backendContext.db.collection("auditLogs").doc(`nap-competition-delete-${id}-before`).create({action:"nap.calendarEventDelete.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(id,target)=>backendContext.writeAuditLogOnce("nap.calendarEventDelete.complete",context.uid,{...target,auditPreparationId:`nap-competition-delete-${id}-before`},`nap-competition-delete-${id}-complete`)
        },async id=>{
          const pack=await require("../../nap-portal-competitions").readNativeCompetition(pool,id,event=>backendContext.assertCanModifyEngagementEvent(context,event));
          if(!pack||!require("../../nap-calendar-event-details").KINDS.has(pack.event.competitionType))throw new backendContext.HttpsError("failed-precondition","Formation, stage ou reunion requis.");
          return pack;
        });
        return {...result,calendarEventId,...(request.data?.previewOnly===true?{warning:"L'événement, ses documents rattachés, son programme et ses paramètres seront retirés. Cette action est irréversible."}:{})};
      } catch(error) {
        if(error instanceof backendContext.HttpsError)throw error;
        throw new backendContext.HttpsError("failed-precondition",error instanceof TypeError||error instanceof RangeError?error.message:"Suppression NAP a verifier ; aucune nouvelle tentative automatique.");
      }
    }
    const ref = backendContext.db.collection(backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION).doc(calendarEventId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Evenement introuvable.");
    backendContext.assertCanModifyEngagementEvent(context, snapshot.data() || {});
    const data = snapshot.data() || {};
    await ref.delete();
    const documents = backendContext.cleanCompetitionDocuments(data.clubDocuments || [], { includeUploader: true });
    const deletionResults = await Promise.allSettled(documents.filter(backendContext.hasManagedEngagementCompetitionDocumentStorage).map((document) =>
      backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET)
        .file(backendContext.assertEngagementCompetitionDocumentPath(document.storagePath))
        .delete({ ignoreNotFound: true })
    ));
    await backendContext.writeAuditLog("engagementCalendarEvent.deleted", context.uid, {
      calendarEventId,
      name: data.name || "",
      documentCount: documents.length,
      documentDeleteErrorCount: deletionResults.filter((result) => result.status === "rejected").length
    });
    return { ok: true, deleted: true, calendarEventId };
  }

  return { deleteEngagementCalendarEvent };
}

module.exports = { createCompetitionHandlers_deleteEngagementCalendarEvent };
