// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_updateEngagementCalendarEvent(backendContext) {
  async function updateEngagementCalendarEvent(request) {
    const context = await backendContext.engagementAccessContext(request);
    const calendarEventId = backendContext.cleanText(request.data?.calendarEventId).slice(0, 128);
    if (!calendarEventId) throw new backendContext.HttpsError("invalid-argument", "Evenement requis.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const pool=require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const authorize=event=>{backendContext.assertCanModifyEngagementEvent(context,event);if(!require("../../nap-calendar-event-details").KINDS.has(event.competitionType))throw new backendContext.HttpsError("failed-precondition","Formation, stage ou reunion requis.");};
      try {
        const pack=await require("../../nap-portal-competitions").readNativeCompetition(pool,calendarEventId,authorize);
        if(!pack)throw new backendContext.HttpsError("not-found","Evenement NAP introuvable.");
        const proposed=backendContext.cleanEngagementCalendarEventPayload(request.data||{},context);
        backendContext.assertCanManageEngagementCompetition(context,proposed);
        const patch=Object.fromEntries(["name","date","endDate","address","city","organizer","publicDescription","canceled","eventType"].map(key=>[key,proposed[key]]));
        patch.location=proposed.location||proposed.city;
        patch.calendarDetails={registrationUrl:proposed.registrationUrl,entryDeadlineAt:proposed.entryDeadlineAt,programSessions:proposed.programSessions};
        if(proposed.level!==pack.event.level||!backendContext.engagementRegionsMatch(proposed.regionId,pack.event.regionId)){patch.level=proposed.level;patch.regionId=proposed.regionId;}
        const result=await require("../../nap-qualification-edit-lock").ordinaryEdit(pool,calendarEventId,()=>require("../../nap-portal-competition-change").applyCompetitionChange(pool,{competitionId:calendarEventId,actorUid:context.uid,national:context.national,expectedFingerprint:request.data?.expectedFingerprint,patch},{
          read:async operation=>{const saved=await backendContext.db.collection("auditLogs").doc(`nap-calendar-event-${operation}-before`).get();return saved.exists?saved.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-calendar-event-${operation}-before`).create({action:"nap.calendarEvent.change.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.calendarEvent.changed",context.uid,{...target,auditPreparationId:`nap-calendar-event-${operation}-before`},operation)
        },authorize),{authorize});
        const event=await backendContext.nativePortalCompetition(calendarEventId,item=>backendContext.assertCanManageEngagementCompetition(context,item),true);
        return {...result,event:{...event,sourceType:"calendarEvent",eventType:event.competitionType,regionalPastReadOnly:!context.national&&backendContext.engagementEventIsPast(event)}};
      } catch(error) {
        if(error instanceof backendContext.HttpsError)throw error;
        throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":error instanceof RangeError?"resource-exhausted":"unavailable",error instanceof TypeError||error instanceof RangeError?error.message:"Enregistrement NAP a verifier ; la sauvegarde est conservee.");
      }
    }
    const ref = backendContext.db.collection(backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION).doc(calendarEventId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Evenement introuvable.");
    backendContext.assertCanModifyEngagementEvent(context, snapshot.data() || {});
    const eventData = backendContext.cleanEngagementCalendarEventPayload(request.data || {}, context);
    backendContext.assertCanManageEngagementCompetition(context, eventData);
    const now = new Date().toISOString();
    const payload = { ...eventData, publicationStatus: "published", updatedAt: now, updatedBy: context.uid };
    await ref.set(payload, { merge: true });
    await backendContext.writeAuditLog("engagementCalendarEvent.updated", context.uid, {
      calendarEventId,
      name: payload.name,
      date: payload.date,
      eventType: payload.eventType,
      publicationStatus: payload.publicationStatus,
      canceled: payload.canceled
    });
    return {
      ok: true,
      event: backendContext.engagementCalendarEventDetailItem({
        id: calendarEventId,
        data: () => ({ ...snapshot.data(), ...payload })
      }, { includeDocumentUploader: true })
    };
  }

  return { updateEngagementCalendarEvent };
}

module.exports = { createCompetitionHandlers_updateEngagementCalendarEvent };
