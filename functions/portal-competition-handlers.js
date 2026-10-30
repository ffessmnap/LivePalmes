// Preserve the execution mode of the existing index.js function bodies.

// Existing callable bodies only. Firebase registrations stay in index.js.
// This factory performs no I/O and retains live access to its explicit services.
function createCompetitionHandlers(backendContext) {
  async function listEngagementAccessRequests(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.region && !context.national) {
      throw new backendContext.HttpsError("permission-denied", "Lecture reservee aux responsables engagements region ou national.");
    }
    if (request.data?.status === "history") {
      return require("./access-request-history").listHistory({
        db: /* backend-shorthand */ backendContext.db, FieldPath: /* backend-shorthand */ backendContext.FieldPath, context, input: request.data, item: backendContext.engagementAccessRequestItem, HttpsError: /* backend-shorthand */ backendContext.HttpsError
      });
    }
    const status = ["pending", "approved", "rejected"].includes(backendContext.cleanText(request.data?.status))
      ? backendContext.cleanText(request.data.status)
      : "pending";
    const limit = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.limit) || 80)));
    let requestsQuery = backendContext.db.collection("engagementAccessRequests").where("status", "==", status);
    if (!context.national) {
      if (!context.regionId) {
        throw new backendContext.HttpsError("failed-precondition", "Perimetre regional requis.");
      }
      requestsQuery = requestsQuery.where("regionId", "==", context.regionId);
    }
    const snapshot = await requestsQuery.limit(limit).get();
    const requests = snapshot.docs
      .map(backendContext.engagementAccessRequestItem)
      .filter((item) => context.national || item.regionId === context.regionId)
      .sort((left, right) =>
        backendContext.cleanText(right.requestedAt).localeCompare(backendContext.cleanText(left.requestedAt)) ||
        backendContext.cleanText(left.lastName).localeCompare(backendContext.cleanText(right.lastName), "fr")
      );
    return {
      ok: true,
      requests
    };
  }

  async function listEngagementQualificationSources(request) {
    if (backendContext.ENVIRONMENT.sportingDataSource !== "nap") return backendContext.qualificationService().listSources(request);
    const context=await backendContext.engagementAccessContext(request);
    if(!context.national) throw new backendContext.HttpsError("permission-denied","Droit national des engagements requis.");
    try {
      return await require("./nap-qualification-sources").listSources(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),request.data);
    } catch(error) {
      throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable",error instanceof TypeError ? error.message : "Liste des competitions NAP momentanement indisponible.");
    }
  }

  async function processEngagementQualificationJob(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource !== "nap")return backendContext.qualificationService().process(request);
    const context=await backendContext.engagementAccessContext(request);
    if(!context.national)throw new backendContext.HttpsError("permission-denied","Droit national des engagements requis.");
    try{return await require("./nap-qualification-callables").process(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{competitionId:request.data?.competitionId,jobId:request.data?.jobId,action:request.data?.action,cursor:request.data?.cursor,national:true,actorUid:context.uid,now:backendContext.nativeQualificationNow()},backendContext.nativeQualificationServices(context));}
    catch(error){throw backendContext.nativeQualificationError(error);}
  }

  async function grantEngagementQualificationException(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource !== "nap")return backendContext.qualificationService().grantException(request);
    const context=await backendContext.engagementAccessContext(request);
    if(!context.national)throw new backendContext.HttpsError("permission-denied","Droit national des engagements requis.");
    const club=await backendContext.engagementClubAccessContext(request);
    try{return await require("./nap-qualification-grant-change").grantException(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{competitionId:request.data?.competitionId,clubId:String(club.clubId),swimmerId:request.data?.swimmerIndexId,eventCode:request.data?.eventCode,national:true,confirmed:true,actorUid:context.uid,now:backendContext.nativeQualificationNow()},backendContext.nativeQualificationServices(context));}
    catch(error){throw backendContext.nativeQualificationError(error);}
  }

  async function acknowledgeEngagementQualificationAlert(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource !== "nap")return backendContext.qualificationService().acknowledgeAlert(request);
    const context=await backendContext.engagementClubAccessContext(request);
    let connection;
    try{
      connection=await require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD).getConnection();
      return await require("./nap-qualification-effects").acknowledge(connection,{competitionId:request.data?.competitionId,clubId:String(context.clubId),alertAt:request.data?.alertAt,actorUid:context.uid,now:backendContext.nativeQualificationNow(),authorize:scope=>{if(scope.clubId!==String(context.clubId))throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");}});
    }catch(error){if(connection){connection.destroy();connection=null;}throw backendContext.nativeQualificationError(error);}
    finally{connection?.release();}
  }

  async function getEngagementAutomaticMailControl(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError('permission-denied', 'Administration nationale requise.');
    const control = require('./engagement-mail-control');
    return { ...await control.read(backendContext.db), testRecipient: backendContext.ENVIRONMENT.projectId === 'livepalmes-test' ? control.TEST_ADDRESS : '' };
  }

  async function updateEngagementAutomaticMailControl(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError('permission-denied', 'Administration nationale requise.');
    try {
      const control = require('./engagement-mail-control');
      const result = await control.update(backendContext.db, request.data, context);
      await backendContext.writeAuditLog('engagementNotifications.deliveryControlChanged', context.uid, { enabled: result.enabled, scope: result.scope, revision: result.revision });
      return { ...result, testRecipient: backendContext.ENVIRONMENT.projectId === 'livepalmes-test' ? control.TEST_ADDRESS : '' };
    } catch (error) {
      throw new backendContext.HttpsError(error instanceof TypeError ? 'failed-precondition' : 'unavailable',
        error instanceof TypeError ? error.message : 'Réglage des mails indisponible.');
    }
  }

  async function rebuildEngagementMailRecipientIndexNextPage(request) {
    backendContext.assertCapability(request, "engagements.national.manage");
    const reset = request.data?.reset === true;
    const pageSize = Math.min(Math.max(Number(request.data?.pageSize || 200) || 200, 50), 250);
    const stateRef = backendContext.engagementMailRecipientIndexStateRef(backendContext.db);
    const stateSnapshot = await stateRef.get();
    const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
    if (!reset && state.status !== "rebuilding") {
      throw new backendContext.HttpsError("failed-precondition", "Commence la reconstruction des destinataires avec reset: true.");
    }
    const cursor = reset ? "" : backendContext.cleanText(state.cursor);
    const now = new Date().toISOString();
    if (reset) {
      const deleteBatch = backendContext.db.batch();
      backendContext.engagementMailRecipientShardRefs(backendContext.db).forEach((ref) => deleteBatch.delete(ref));
      deleteBatch.set(stateRef, { status: "rebuilding", cursor: "", processedCount: 0, updatedAt: now }, { merge: true });
      await deleteBatch.commit();
    }

    let query = backendContext.db.collection("users").orderBy(backendContext.FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    const recipients = snapshot.docs
      .filter((doc) => (doc.data() || {}).status === "active")
      .map(backendContext.engagementMailRecipientFromUserDoc)
      .filter((recipient) => recipient.email && recipient.capabilities?.length);
    const batch = backendContext.db.batch();
    backendContext.engagementMailRecipientShardGroups(recipients).forEach((group) => {
      batch.set(backendContext.engagementMailRecipientShardRef(backendContext.db, group.capability, group.shardNumber), {
        capability: group.capability,
        shardNumber: group.shardNumber,
        recipients: group.recipients,
        generatedAt: now
      }, { merge: true });
    });
    const nextCursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : cursor;
    const done = snapshot.size < pageSize;
    const processedCount = (reset ? 0 : Number(state.processedCount || 0) || 0) + snapshot.size;
    batch.set(stateRef, {
      status: done ? "ready" : "rebuilding",
      cursor: done ? "" : nextCursor,
      processedCount,
      generatedAt: done ? now : backendContext.cleanText(state.generatedAt),
      updatedAt: now,
      source: "paged-rebuild"
    }, { merge: true });
    await batch.commit();
    if (done) {
      const indexedRecipients = await backendContext.engagementMailRecipientsFromIndex(backendContext.db, ["engagements.club.manage"]);
      await backendContext.writeEngagementClubAdminDirectory(backendContext.db, indexedRecipients, now);
    }
    return { ok: true, done, pageCount: snapshot.size, processedCount, nextCursor: done ? "" : nextCursor };
  }

  async function listEngagementCompetitions(request) {
    const startedAt = Date.now();
    const manageOnly = request.data?.manageOnly === true;
    const managementContext = manageOnly ? await backendContext.engagementAccessContext(request) : null;
    const clubContext = manageOnly ? null : await backendContext.engagementClubAccessContext(request);
    if (manageOnly && !managementContext.national && (!managementContext.region || !managementContext.regionId)) {
      throw new backendContext.HttpsError("permission-denied", "Droit gestion competition engagements requis.");
    }
    const rawRanges = Array.isArray(request.data?.ranges) && request.data.ranges.length
      ? request.data.ranges.slice(0, 2)
      : [{ fromDate: request.data?.fromDate, toDate: request.data?.toDate }];
    const ranges = rawRanges.map((rawRange = {}) => {
      const fromDate = backendContext.cleanIsoDate(rawRange.fromDate) || new Date().toISOString().slice(0, 10);
      const season = backendContext.engagementSeasonBoundsFromEndYear(backendContext.engagementSeasonEndYearFromIsoDate(fromDate));
      return {
        startDate: fromDate || season.startDate,
        endDate: backendContext.cleanIsoDate(rawRange.toDate) || season.endDate,
        season
      };
    });
    const limit = Math.min(1200, Math.max(10, Math.trunc(Number(request.data?.limit) || 250)));
    const regionId = backendContext.cleanText(request.data?.regionId).slice(0, 80);
    const level = backendContext.ENGAGEMENT_COMPETITION_LEVELS.has(backendContext.cleanText(request.data?.level))
      ? backendContext.cleanText(request.data.level)
      : "";
    const entryStatus = backendContext.ENGAGEMENT_ENTRY_STATUSES.has(backendContext.cleanText(request.data?.entryStatus))
      ? backendContext.cleanText(request.data.entryStatus)
      : "";
    const seasonEndYears = Array.from(new Set(ranges.map((range) => range.season.endYear)));
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const items = await backendContext.nativePortalCalendarItems(ranges);
      const competitions = items.filter(item => ["pool", "openWater"].includes(item.competitionType))
        .filter(item => ranges.some(range => item.date >= range.startDate && item.date <= range.endDate))
        .filter(item => !manageOnly || managementContext.national || (!item.nationalManagementOnly && backendContext.engagementRegionsMatch(item.regionId, managementContext.regionId)))
        .filter(item => !regionId || backendContext.engagementRegionsMatch(item.regionId, regionId))
        .filter(item => !level || item.level === level).filter(item => !entryStatus || item.entryStatus === entryStatus);
      if (competitions.length > limit) throw new backendContext.HttpsError("resource-exhausted", "Trop de competitions : reduisez la periode demandee.");
      return { ok: true, source: "nap", competitions, fromDate: ranges[0].startDate, toDate: ranges[ranges.length - 1].endDate,
        ...(manageOnly && request.data?.includeCalendarEvents === true ? { calendarEvents: items
          .filter(item => !["pool", "openWater"].includes(item.competitionType))
          .filter(item => ranges.some(range => item.date >= range.startDate && item.date <= range.endDate))
          .filter(item => managementContext.national || (!item.nationalManagementOnly && backendContext.engagementRegionsMatch(item.regionId, managementContext.regionId)))
          .map(item => ({ ...item, sourceType: "calendarEvent", eventType: item.competitionType })) } : {}),
        readStats: backendContext.portalReadStats("listEngagementCompetitions", startedAt, { baseDocuments: 1, variableDocumentsMax: 0, cacheHit: false }),
        sqlBudget: { queriesMax: seasonEndYears.length, rowsMax: seasonEndYears.length * 500 } };
    }
    const calendarRefs = seasonEndYears.map((endYear) => backendContext.engagementCompetitionCalendarRef(backendContext.db, endYear));
    const clubEntryIndexRef = clubContext ? backendContext.engagementClubCompetitionIndexRef(backendContext.db, clubContext.clubId) : null;
    const prefetchedSnapshots = await backendContext.db.getAll(...calendarRefs, ...[clubEntryIndexRef].filter(Boolean));
    const calendarSnapshots = prefetchedSnapshots.slice(0, calendarRefs.length);
    const clubEntryIndexSnapshot = clubEntryIndexRef ? prefetchedSnapshots[calendarRefs.length] : null;
    const calendarByEndYear = new Map(calendarSnapshots.map((snapshot, index) => [seasonEndYears[index], snapshot]));
    const calendarReady = calendarSnapshots.every((snapshot) => snapshot?.exists && backendContext.cleanText(snapshot.data()?.generatedAt));
    const allCalendarCompetitions = Array.from(new Map(calendarSnapshots.flatMap((snapshot) => {
      const items = snapshot?.exists ? backendContext.engagementCompetitionCalendarItemsFromData(snapshot.data() || {}) : [];
      return items.map((competition) => [competition.id, competition]);
    })).values());
    const calendarCompetitions = Array.from(new Map(ranges.flatMap((range) => {
      const snapshot = calendarByEndYear.get(range.season.endYear);
      const items = snapshot?.exists ? backendContext.engagementCompetitionCalendarItemsFromData(snapshot.data() || {}) : [];
      return backendContext.filterEngagementCompetitionCalendarItems(items, {
        startDate: range.startDate,
        endDate: range.endDate,
        regionId,
        level,
        entryStatus
      });
    }).map((competition) => [competition.id, competition])).values())
      .filter((competition) => !manageOnly || managementContext.national || (
        !backendContext.isNationalOnlyEngagementCompetitionLevel(competition.level) &&
        backendContext.engagementRegionsMatch(competition.regionId, managementContext.regionId)
      ))
      .slice(0, limit);
    const clubEntryIndexResult = clubContext
      ? await backendContext.engagementClubEntryCompetitionIds(allCalendarCompetitions, clubContext.clubId, seasonEndYears.map(String), clubEntryIndexSnapshot)
      : { ids: new Set(), cacheHit: true, fallbackDocumentsMax: 0 };
    const competitions = calendarCompetitions.map((competition) => clubContext
      ? { ...competition, clubEntryExists: clubEntryIndexResult.ids.has(competition.id) }
      : competition);

    return {
      ok: true,
      collection: backendContext.ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION,
      fromDate: ranges[0].startDate,
      toDate: ranges[ranges.length - 1].endDate,
      ranges: ranges.map((range) => ({
        fromDate: range.startDate,
        toDate: range.endDate,
        seasonStartYear: range.season.startYear,
        seasonEndYear: range.season.endYear
      })),
      seasonStartYear: ranges[0].season.startYear,
      seasonEndYear: ranges[0].season.endYear,
      calendarGenerated: false,
      readStats: backendContext.portalReadStats("listEngagementCompetitions", startedAt, {
        baseDocuments: 1 + calendarSnapshots.length + (clubContext ? 1 : 0),
        variableDocumentsMax: clubEntryIndexResult.fallbackDocumentsMax,
        cacheHit: Boolean(calendarReady && clubEntryIndexResult.cacheHit)
      }),
      competitions
    };
  }

  async function listEngagementCalendarEvents(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national && (!context.region || !context.regionId)) {
      throw new backendContext.HttpsError("permission-denied", "Droit de gestion du calendrier requis.");
    }
    const rawRanges = Array.isArray(request.data?.ranges) && request.data.ranges.length
      ? request.data.ranges.slice(0, 2)
      : [{ fromDate: request.data?.fromDate, toDate: request.data?.toDate }];
    const ranges = rawRanges.map((rawRange = {}) => {
      const startDate = backendContext.cleanIsoDate(rawRange.fromDate) || new Date().toISOString().slice(0, 10);
      const season = backendContext.engagementSeasonBoundsFromEndYear(backendContext.engagementSeasonEndYearFromIsoDate(startDate));
      return {
        startDate,
        endDate: backendContext.cleanIsoDate(rawRange.toDate) || season.endDate,
        season
      };
    });
    const seasonEndYears = Array.from(new Set(ranges.map((range) => range.season.endYear)));
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const items = await backendContext.nativePortalCalendarItems(ranges);
      return { ok: true, source: "nap", events: items.filter(item => !["pool", "openWater"].includes(item.competitionType))
        .filter(item => ranges.some(range => item.date >= range.startDate && item.date <= range.endDate))
        .filter(item => context.national || (!item.nationalManagementOnly && backendContext.engagementRegionsMatch(item.regionId, context.regionId)))
        .map(item => ({ ...item, sourceType: "calendarEvent", eventType: item.competitionType })),
        readStats: backendContext.portalReadStats("listEngagementCalendarEvents", startedAt, { baseDocuments: 1, variableDocumentsMax: 0, cacheHit: false }),
        sqlBudget: { queriesMax: seasonEndYears.length, rowsMax: seasonEndYears.length * 500 } };
    }
    const refs = seasonEndYears.map((endYear) => backendContext.engagementCalendarEventCalendarRef(backendContext.db, endYear));
    const snapshots = await backendContext.db.getAll(...refs);
    const byEndYear = new Map(snapshots.map((snapshot, index) => [seasonEndYears[index], snapshot]));
    const events = Array.from(new Map(ranges.flatMap((range) => {
      const snapshot = byEndYear.get(range.season.endYear);
      const items = snapshot?.exists ? backendContext.engagementCalendarEventItemsFromData(snapshot.data() || {}) : [];
      return items
        .filter((item) => item.date >= range.startDate && item.date <= range.endDate)
        .map((item) => [item.id, item]);
    })).values())
      .filter((item) => context.national || (
        !backendContext.isNationalOnlyEngagementCompetitionLevel(item.level) &&
        backendContext.engagementRegionsMatch(item.regionId, context.regionId)
      ))
      .sort((left, right) => backendContext.cleanText(left.date).localeCompare(backendContext.cleanText(right.date)) || backendContext.cleanText(left.name).localeCompare(backendContext.cleanText(right.name), "fr"))
      .slice(0, 1200);
    return {
      ok: true,
      events,
      readStats: backendContext.portalReadStats("listEngagementCalendarEvents", startedAt, {
        baseDocuments: 1 + snapshots.length,
        variableDocumentsMax: 0,
        cacheHit: snapshots.every((snapshot) => snapshot.exists && backendContext.cleanText(snapshot.data()?.generatedAt))
      })
    };
  }

  async function getEngagementCalendarEvent(request) {
    const context = await backendContext.engagementAccessContext(request);
    const calendarEventId = backendContext.cleanText(request.data?.calendarEventId).slice(0, 128);
    if (!calendarEventId) throw new backendContext.HttpsError("invalid-argument", "Evenement requis.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const event = await backendContext.nativePortalCompetition(calendarEventId, item => backendContext.assertCanManageEngagementCompetition(context, item), true);
      return { ok: true, source: "nap", event: { ...event, sourceType: "calendarEvent", eventType: event.competitionType,
        regionalPastReadOnly: !context.national && backendContext.engagementEventIsPast(event) } };
    }
    const snapshot = await backendContext.db.collection(backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION).doc(calendarEventId).get();
    if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Evenement introuvable.");
    const eventData = snapshot.data() || {};
    backendContext.assertCanManageEngagementCompetition(context, eventData);
    const deletionRequest = await backendContext.db.collection("engagementCompetitionDeletionRequests")
      .doc(backendContext.engagementDeletionRequestId("calendarEvent", calendarEventId))
      .get();
    return {
      ok: true,
      event: {
        ...backendContext.engagementCalendarEventDetailItem(snapshot, { includeDocumentUploader: true }),
        regionalPastReadOnly: !context.national && backendContext.engagementEventIsPast(eventData),
        deletionRequestStatus: deletionRequest.exists && deletionRequest.data()?.status === "pending" ? "pending" : ""
      }
    };
  }

  async function createEngagementCalendarEvent(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const raw=request.data || {};
      if (!["training","stage","meeting"].includes(raw.eventType)) throw new backendContext.HttpsError("failed-precondition","Choisissez Formation, Stage ou Reunion. Le type Autre n'est pas propose.");
      const result=await backendContext.createNativePortalCalendarRecord(raw,context,raw.eventType);
      return {...result,event:{...result.competition,sourceType:"calendarEvent",eventType:result.competition.competitionType,regionalPastReadOnly:!context.national&&backendContext.engagementEventIsPast(result.competition)}};
    }
    const eventData = backendContext.cleanEngagementCalendarEventPayload(request.data || {}, context);
    const now = new Date().toISOString();
    const ref = backendContext.db.collection(backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION).doc();
    const payload = {
      ...eventData,
      publicationStatus: "published",
      clubDocuments: [],
      createdAt: now,
      createdBy: context.uid,
      updatedAt: now,
      updatedBy: context.uid
    };
    await ref.set(payload);
    await backendContext.writeAuditLog("engagementCalendarEvent.created", context.uid, {
      calendarEventId: ref.id,
      name: payload.name,
      date: payload.date,
      eventType: payload.eventType,
      regionId: payload.regionId,
      level: payload.level
    });
    return { ok: true, event: backendContext.engagementCalendarEventDetailItem({ id: ref.id, data: () => payload }, { includeDocumentUploader: true }) };
  }

  async function updateEngagementCalendarEvent(request) {
    const context = await backendContext.engagementAccessContext(request);
    const calendarEventId = backendContext.cleanText(request.data?.calendarEventId).slice(0, 128);
    if (!calendarEventId) throw new backendContext.HttpsError("invalid-argument", "Evenement requis.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const authorize=event=>{backendContext.assertCanModifyEngagementEvent(context,event);if(!require("./nap-calendar-event-details").KINDS.has(event.competitionType))throw new backendContext.HttpsError("failed-precondition","Formation, stage ou reunion requis.");};
      try {
        const pack=await require("./nap-portal-competitions").readNativeCompetition(pool,calendarEventId,authorize);
        if(!pack)throw new backendContext.HttpsError("not-found","Evenement NAP introuvable.");
        const proposed=backendContext.cleanEngagementCalendarEventPayload(request.data||{},context);
        backendContext.assertCanManageEngagementCompetition(context,proposed);
        const patch=Object.fromEntries(["name","date","endDate","address","city","organizer","publicDescription","canceled","eventType"].map(key=>[key,proposed[key]]));
        patch.location=proposed.location||proposed.city;
        patch.calendarDetails={registrationUrl:proposed.registrationUrl,entryDeadlineAt:proposed.entryDeadlineAt,programSessions:proposed.programSessions};
        if(proposed.level!==pack.event.level||!backendContext.engagementRegionsMatch(proposed.regionId,pack.event.regionId)){patch.level=proposed.level;patch.regionId=proposed.regionId;}
        const result=await require("./nap-qualification-edit-lock").ordinaryEdit(pool,calendarEventId,()=>require("./nap-portal-competition-change").applyCompetitionChange(pool,{competitionId:calendarEventId,actorUid:context.uid,national:context.national,expectedFingerprint:request.data?.expectedFingerprint,patch},{
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

  async function deleteEngagementCalendarEvent(request) {
    const context = await backendContext.engagementAccessContext(request);
    const calendarEventId = backendContext.cleanText(request.data?.calendarEventId).slice(0, 128);
    if (!calendarEventId) throw new backendContext.HttpsError("invalid-argument", "Evenement requis.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      try {
        const result=await require("./nap-competition-deletion").competitionDeletion(pool,{competitionId:calendarEventId,actorUid:context.uid,previewOnly:request.data?.previewOnly===true,confirmPermanent:request.data?.confirmPermanent===true,expectedFingerprint:request.data?.expectedFingerprint},{
          prepare:(id,target)=>backendContext.db.collection("auditLogs").doc(`nap-competition-delete-${id}-before`).create({action:"nap.calendarEventDelete.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(id,target)=>backendContext.writeAuditLogOnce("nap.calendarEventDelete.complete",context.uid,{...target,auditPreparationId:`nap-competition-delete-${id}-before`},`nap-competition-delete-${id}-complete`)
        },async id=>{
          const pack=await require("./nap-portal-competitions").readNativeCompetition(pool,id,event=>backendContext.assertCanModifyEngagementEvent(context,event));
          if(!pack||!require("./nap-calendar-event-details").KINDS.has(pack.event.competitionType))throw new backendContext.HttpsError("failed-precondition","Formation, stage ou reunion requis.");
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

  async function listEngagementOpenWaterCourses(request) {
    const startedAt = Date.now();
    await backendContext.engagementAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return require("./nap-open-water-library").read(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD));
    const snapshot = await backendContext.engagementOpenWaterCourseConfigRef().get();
    return {
      ok: true,
      courses: backendContext.cleanEngagementOpenWaterCourses(snapshot.exists ? snapshot.data()?.courses : []),
      readStats: backendContext.portalReadStats("listEngagementOpenWaterCourses", startedAt, {
        baseDocuments: 2,
        variableDocumentsMax: 0,
        cacheHit: snapshot.exists
      })
    };
  }

  async function addEngagementOpenWaterCourse(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national && (!context.region || !context.regionId)) {
      throw new backendContext.HttpsError("permission-denied", "Droit regional ou national requis pour modifier la bibliotheque eau libre.");
    }
    if(!request.data?.discipline&&backendContext.ENVIRONMENT.sportingDataSource === "nap"){
      const distance=Number(request.data?.distance);
      if(!Number.isInteger(distance)||distance<1||distance>100000)throw new backendContext.HttpsError("invalid-argument","Distance entière de 1 à 100 000 mètres requise.");
      const courses=(distance===150?["SF","BI"]:["SF","BI","SUP"]).map(discipline=>backendContext.cleanEngagementOpenWaterCourse({distance,discipline}));
      const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),library=require("./nap-open-water-library");
      let nativeReferencesCreated=0;
      try {
        const current=await library.readStored(pool);
        library.plan(current,{action:"addDistance",courses,expectedFingerprint:current.fingerprint});
        const native=await require("./nap-open-water-reference-addition").ensureDistanceReferences(pool,{distance,actorUid:context.uid},
          payload=>require("./nap-open-water-reference-backup").backupVerified(backendContext.db,context.uid,payload,process.env.LIVEPALMES_NAP_PASSWORD));
        nativeReferencesCreated=native.created;
        const result=await library.change(pool,{action:"addDistance",courses,expectedFingerprint:current.fingerprint},context.uid,saved=>backendContext.writeAuditLog("engagementOpenWaterCourse.nativeChange",context.uid,saved));
        return {...result,nativeReferencesReady:true,nativeReferencesCreated};
      }catch(error){
        if(error instanceof backendContext.HttpsError)throw error;
        const created=Number(error.nativeReferencesCreated)||nativeReferencesCreated;
        const message=created?`${created} référence(s) NAP créée(s) et sauvegardée(s), mais l'ajout de distance doit être repris. Aucune course de compétition ni aucun engagement modifié.`
          : error instanceof TypeError||error instanceof RangeError?error.message:"Ajout de distance NAP à vérifier. Reprenez la même distance ; les sauvegardes sont conservées.";
        throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":error instanceof RangeError?"resource-exhausted":"unavailable",message);
      }
    }
    const course = backendContext.cleanEngagementOpenWaterCourse({
      distance: request.data?.distance,
      discipline: request.data?.discipline
    });
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return require("./nap-open-water-library").change(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {action:"add",course}, context.uid, saved => backendContext.writeAuditLog("engagementOpenWaterCourse.nativeChange",context.uid,saved));
    const ref = backendContext.engagementOpenWaterCourseConfigRef();
    const now = new Date().toISOString();
    let courses = [];
    await backendContext.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      courses = backendContext.cleanEngagementOpenWaterCourses(snapshot.exists ? snapshot.data()?.courses : []);
      if (courses.some((item) => item.id === course.id)) {
        throw new backendContext.HttpsError("already-exists", "Cette course existe deja dans la bibliotheque eau libre.");
      }
      if (courses.length >= backendContext.ENGAGEMENT_OPEN_WATER_COURSE_LIMIT) {
        throw new backendContext.HttpsError("resource-exhausted", "La bibliotheque eau libre a atteint sa limite de courses.");
      }
      courses = [...courses, course].sort((left, right) => left.distance - right.distance || left.label.localeCompare(right.label, "fr"));
      transaction.set(ref, {
        courses,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    });
    await backendContext.writeAuditLog("engagementOpenWaterCourse.created", context.uid, {
      distance: course.distance,
      discipline: course.discipline,
      courseId: course.id
    });
    return { ok: true, course, courses };
  }

  async function setEngagementOpenWaterCourseStatus(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national && (!context.region || !context.regionId)) {
      throw new backendContext.HttpsError("permission-denied", "Droit regional ou national requis pour modifier la bibliotheque eau libre.");
    }
    const courseId = backendContext.cleanText(request.data?.courseId).slice(0, 60);
    const active = request.data?.active === true;
    if (!courseId) throw new backendContext.HttpsError("invalid-argument", "Course eau libre requise.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return require("./nap-open-water-library").change(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {action:"status",courseId,active}, context.uid, saved => backendContext.writeAuditLog("engagementOpenWaterCourse.nativeChange",context.uid,saved));
    const ref = backendContext.engagementOpenWaterCourseConfigRef();
    const now = new Date().toISOString();
    let courses = [];
    await backendContext.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      courses = backendContext.cleanEngagementOpenWaterCourses(snapshot.exists ? snapshot.data()?.courses : []);
      const index = courses.findIndex((course) => course.id === courseId);
      if (index < 0) throw new backendContext.HttpsError("not-found", "Course eau libre introuvable.");
      courses[index] = { ...courses[index], active };
      transaction.set(ref, {
        courses,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    });
    await backendContext.writeAuditLog("engagementOpenWaterCourse.statusChanged", context.uid, { courseId, active });
    return { ok: true, courses };
  }

  async function getEngagementCompetition(request) {
    const context = await backendContext.engagementAccessContext(request);
    if(request.data?.action!==undefined){
      if(request.data.action!=="import-source"||backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("invalid-argument","Action de consultation invalide.");
      if(!context.national&&(!context.region||!context.regionId))throw new backendContext.HttpsError("permission-denied","TXT réservé aux administrations régionale et nationale.");
      try{return await require("./nap-import-private-text").readCurrent(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),request.data.competitionId,event=>backendContext.assertCanManageEngagementCompetition(context,event));}
      catch(error){throw backendContext.nativePerformanceFailure(error);}
    }
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const competition = await backendContext.nativePortalCompetition(competitionId, event => backendContext.assertCanManageEngagementCompetition(context, event), true);
      return { ok: true, source: "nap", competition: { ...competition, regionalPastReadOnly: !context.national && backendContext.engagementEventIsPast(competition) } };
    }
    const doc = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!doc.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertCanManageEngagementCompetition(context, doc.data() || {});
    const deletionRequest = await backendContext.db.collection("engagementCompetitionDeletionRequests").doc(competitionId).get();
    const deletionRequestData = deletionRequest.exists ? deletionRequest.data() || {} : {};
    return {
      ok: true,
      competition: {
        ...backendContext.engagementCompetitionDetailItem(doc, { includeDocumentUploader: true }),
        regionalPastReadOnly: !context.national && backendContext.engagementEventIsPast(doc.data() || {}),
        deletionRequestStatus: deletionRequestData.status === "pending" ? "pending" : ""
      }
    };
  }

  async function uploadEngagementCompetitionDocument(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.mutateNativeCompetitionDocument(request,"upload");
    const { context, competitionId, calendarEventId, sourceType, ref, snapshot } = await backendContext.engagementCompetitionDocumentContext(request);
    const requestedDocumentId = backendContext.cleanText(request.data?.documentId).slice(0, 80);
    const initialDocuments = backendContext.cleanCompetitionDocuments(snapshot.data()?.clubDocuments || [], { includeUploader: true });
    const existingDocument = requestedDocumentId
      ? initialDocuments.find((document) => document.id === requestedDocumentId)
      : null;
    if (requestedDocumentId && !existingDocument) {
      throw new backendContext.HttpsError("not-found", "Document à remplacer introuvable.");
    }
    if (!existingDocument && initialDocuments.length >= backendContext.MAX_COMPETITION_DOCUMENTS) {
      throw new backendContext.HttpsError("resource-exhausted", `La compétition contient déjà ${backendContext.MAX_COMPETITION_DOCUMENTS} documents.`);
    }
    let input;
    let decoded;
    try {
      input = backendContext.cleanCompetitionDocumentInput(request.data || {});
      decoded = backendContext.decodeCompetitionDocumentDataUrl(request.data?.fileDataUrl, input.fileName, { national: context.national === true });
    } catch (error) {
      throw new backendContext.HttpsError("invalid-argument", backendContext.cleanText(error?.message || error).slice(0, 220));
    }
    const documentId = existingDocument?.id || backendContext.crypto.randomUUID();
    const storagePath = existingDocument?.storagePath || backendContext.competitionDocumentStoragePath({
      competitionId,
      documentId,
      fileName: input.fileName,
      buffer: decoded.buffer
    });
    const token = backendContext.competitionDocumentTokenFromUrl(existingDocument?.url) || backendContext.crypto.randomUUID();
    const bucket = backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET);
    const file = bucket.file(storagePath);
    await file.save(decoded.buffer, {
      resumable: false,
      metadata: {
        contentType: decoded.contentType,
        cacheControl: "public, max-age=300, must-revalidate",
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });
    const now = new Date().toISOString();
    const document = {
      id: documentId,
      ...input,
      contentType: decoded.contentType,
      storagePath,
      url: backendContext.competitionDocumentDownloadUrl(backendContext.LIVEPALMES_STORAGE_BUCKET, storagePath, token),
      size: decoded.buffer.length,
      uploadedAt: existingDocument?.uploadedAt || now,
      updatedAt: now,
      uploadedBy: backendContext.engagementCompetitionDocumentUploader(context)
    };
    let previousStoragePath = existingDocument?.storagePath || "";
    let updatedDocuments = [];
    try {
      await backendContext.db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(ref);
        if (!currentSnapshot.exists) throw new backendContext.HttpsError("not-found", "Compétition d'engagements introuvable.");
        backendContext.assertCanManageEngagementCompetition(context, currentSnapshot.data() || {});
        const currentDocuments = backendContext.cleanCompetitionDocuments(currentSnapshot.data()?.clubDocuments || [], { includeUploader: true });
        const currentIndex = currentDocuments.findIndex((item) => item.id === documentId);
        if (existingDocument && currentIndex < 0) throw new backendContext.HttpsError("not-found", "Document à remplacer introuvable.");
        if (!existingDocument && currentIndex < 0 && currentDocuments.length >= backendContext.MAX_COMPETITION_DOCUMENTS) {
          throw new backendContext.HttpsError("resource-exhausted", `La compétition contient déjà ${backendContext.MAX_COMPETITION_DOCUMENTS} documents.`);
        }
        if (currentIndex >= 0) {
          previousStoragePath = currentDocuments[currentIndex].storagePath;
          currentDocuments[currentIndex] = document;
        } else {
          currentDocuments.push(document);
        }
        updatedDocuments = backendContext.cleanCompetitionDocuments(currentDocuments, { includeUploader: true });
        transaction.update(ref, {
          clubDocuments: updatedDocuments,
          documentsUpdatedAt: now,
          documentsUpdatedBy: context.uid
        });
      });
    } catch (error) {
      await file.delete({ ignoreNotFound: true }).catch(() => undefined);
      throw error;
    }
    if (backendContext.hasManagedEngagementCompetitionDocumentStorage({ storagePath: previousStoragePath }) && previousStoragePath !== storagePath) {
      await bucket.file(backendContext.assertEngagementCompetitionDocumentPath(previousStoragePath)).delete({ ignoreNotFound: true }).catch(() => undefined);
    }
    await backendContext.writeAuditLog(existingDocument
      ? `${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentReplaced`
      : `${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentUploaded`, context.uid, {
      competitionId,
      calendarEventId,
      documentId,
      title: document.title,
      category: document.category,
      fileName: document.fileName,
      size: document.size
    });
    return {
      ok: true,
      competitionId,
      calendarEventId,
      documentId,
      documents: updatedDocuments
    };
  }

  async function updateEngagementCompetitionDocument(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.mutateNativeCompetitionDocument(request,"update");
    const { context, competitionId, calendarEventId, sourceType, ref } = await backendContext.engagementCompetitionDocumentContext(request);
    const documentId = backendContext.cleanText(request.data?.documentId).slice(0, 80);
    if (!documentId) throw new backendContext.HttpsError("invalid-argument", "Document requis.");
    const now = new Date().toISOString();
    let updatedDocuments = [];
    await backendContext.db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(ref);
      if (!currentSnapshot.exists) throw new backendContext.HttpsError("not-found", "Compétition d'engagements introuvable.");
      backendContext.assertCanManageEngagementCompetition(context, currentSnapshot.data() || {});
      const documents = backendContext.cleanCompetitionDocuments(currentSnapshot.data()?.clubDocuments || [], { includeUploader: true });
      const index = documents.findIndex((document) => document.id === documentId);
      if (index < 0) throw new backendContext.HttpsError("not-found", "Document introuvable.");
      let input;
      try {
        input = backendContext.cleanCompetitionDocumentInput({ ...request.data, fileName: documents[index].fileName });
      } catch (error) {
        throw new backendContext.HttpsError("invalid-argument", backendContext.cleanText(error?.message || error).slice(0, 220));
      }
      documents[index] = { ...documents[index], ...input, updatedAt: now };
      updatedDocuments = backendContext.cleanCompetitionDocuments(documents, { includeUploader: true });
      transaction.update(ref, {
        clubDocuments: updatedDocuments,
        documentsUpdatedAt: now,
        documentsUpdatedBy: context.uid
      });
    });
    await backendContext.writeAuditLog(`${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentUpdated`, context.uid, {
      competitionId,
      calendarEventId,
      documentId,
      title: updatedDocuments.find((document) => document.id === documentId)?.title || ""
    });
    return { ok: true, competitionId, calendarEventId, documentId, documents: updatedDocuments };
  }

  async function deleteEngagementCompetitionDocument(request) {
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.mutateNativeCompetitionDocument(request,"delete");
    const { context, competitionId, calendarEventId, sourceType, ref } = await backendContext.engagementCompetitionDocumentContext(request);
    const documentId = backendContext.cleanText(request.data?.documentId).slice(0, 80);
    if (!documentId) throw new backendContext.HttpsError("invalid-argument", "Document requis.");
    const now = new Date().toISOString();
    let deletedDocument = null;
    let updatedDocuments = [];
    await backendContext.db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(ref);
      if (!currentSnapshot.exists) throw new backendContext.HttpsError("not-found", "Compétition d'engagements introuvable.");
      backendContext.assertCanManageEngagementCompetition(context, currentSnapshot.data() || {});
      backendContext.assertCanDeleteEngagementDocument(context, currentSnapshot.data() || {});
      const documents = backendContext.cleanCompetitionDocuments(currentSnapshot.data()?.clubDocuments || [], { includeUploader: true });
      deletedDocument = documents.find((document) => document.id === documentId) || null;
      if (!deletedDocument) throw new backendContext.HttpsError("not-found", "Document introuvable.");
      updatedDocuments = documents.filter((document) => document.id !== documentId);
      transaction.update(ref, {
        clubDocuments: updatedDocuments,
        documentsUpdatedAt: now,
        documentsUpdatedBy: context.uid
      });
    });
    let storageDeleted = true;
    if (backendContext.hasManagedEngagementCompetitionDocumentStorage(deletedDocument)) {
      try {
        await backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET)
          .file(backendContext.assertEngagementCompetitionDocumentPath(deletedDocument.storagePath))
          .delete({ ignoreNotFound: true });
      } catch (_) {
        storageDeleted = false;
      }
    }
    await backendContext.writeAuditLog(`${sourceType === "calendarEvent" ? "engagementCalendarEvent" : "engagementCompetition"}.documentDeleted`, context.uid, {
      competitionId,
      calendarEventId,
      documentId,
      title: deletedDocument.title,
      fileName: deletedDocument.fileName,
      storageDeleted
    });
    return { ok: true, competitionId, calendarEventId, documentId, documents: updatedDocuments, storageDeleted };
  }

  async function previewEngagementCompetitionDocumentNotification(request) {
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.nativeNotificationPreview(request, "documents");
    const { competitionId, snapshot } = await backendContext.engagementCompetitionDocumentContext(request);
    const recipients = backendContext.engagementCompetitionDocumentRecipients(
      await backendContext.engagementActiveClubMailRecipients(backendContext.db),
      backendContext.engagementCompetitionDetailItem(snapshot)
    );
    return {
      ok: true,
      competitionId,
      recipientCount: recipients.length,
      clubCount: new Set(recipients.map((recipient) => backendContext.cleanText(recipient.clubId)).filter(Boolean)).size
    };
  }

  async function getEngagementCompetitionStatistics(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result=await backendContext.nativeAdminCompetitionEntries(context,competitionId);
      return {ok:true,source:"nap",competitionId,generatedAt:result.generatedAt,...backendContext.engagementCompetitionStatisticsItem(result.entries,result.competition),sqlBudget:result.sqlBudget};
    }
    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const cacheRef = backendContext.engagementCompetitionStatisticsCacheRef(backendContext.db, competitionId);
    const [competitionSnapshot, cacheSnapshot] = await backendContext.db.getAll(competitionRef, cacheRef);
    if (!competitionSnapshot.exists) throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    backendContext.assertCanManageEngagementCompetition(context, competitionSnapshot.data() || {});
    const competition = backendContext.engagementCompetitionDetailItem(competitionSnapshot);
    const cachedStatistics = cacheSnapshot.exists
      ? backendContext.decodeEngagementCompetitionStatisticsCache(cacheSnapshot.data() || {}, competition)
      : null;
    if (cachedStatistics && request.data?.force !== true) {
      return {
        ok: true,
        competitionId,
        generatedAt: backendContext.cleanText(cacheSnapshot.data()?.generatedAt).slice(0, 40) || new Date().toISOString(),
        ...cachedStatistics,
        readStats: backendContext.portalReadStats("getEngagementCompetitionStatistics", startedAt, {
          baseDocuments: 2,
          cacheHit: true
        })
      };
    }
    const entriesSnapshot = await backendContext.db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    const entries = entriesSnapshot.docs.map((doc) => backendContext.engagementClubEntryItem(doc));
    const statistics = backendContext.engagementCompetitionStatisticsItem(entries, competition);
    const generatedAt = new Date().toISOString();
    const payloadGzip = backendContext.encodeEngagementCompetitionStatisticsCache(statistics);
    await cacheRef.set({
      competitionId,
      competitionUpdatedAt: backendContext.cleanText(competition.updatedAt).slice(0, 40),
      generatedAt,
      updatedAt: generatedAt,
      status: payloadGzip ? "ready" : "too_large",
      payloadEncoding: payloadGzip ? "gzip-base64" : "",
      payloadGzip,
      sourceEntryCount: entriesSnapshot.size
    }, { merge: false });
    return {
      ok: true,
      competitionId,
      generatedAt,
      ...statistics,
      readStats: backendContext.portalReadStats("getEngagementCompetitionStatistics", startedAt, {
        baseDocuments: 2 + entriesSnapshot.size,
        cacheHit: false
      })
    };
  }

  async function generateEngagementCompetitionTxtExport(request) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result=await backendContext.nativeAdminCompetitionEntries(context,competitionId);
      if(!["pool", "openWater"].includes(result.competition.competitionType)) throw new backendContext.HttpsError("failed-precondition","Type de competition non pris en charge pour l'export TXT.");
      const entries=result.entries.filter(backendContext.engagementClubEntryHasParticipants).map(entry=>({...entry,swimmers:entry.swimmers.map(person=>({...person,individualEntries:person.individualEntries.map(course=>course.nativeTime==="599999"?{...course,entryTime:"",manualEntryTime:"",entryTimeValue:0,entryTimeMode:"default595999"}:course)}))}));
      let txt;
      try {
        const exportEntries=result.competition.competitionType==="openWater"
          ? require("./winpalme-open-water-manual").prepareManualOpenWaterEntries(entries) : entries;
        const exportCompetition=result.competition.competitionType==="openWater"
          ? await require("./winpalme-open-water-manual").readManualOpenWaterCompetition(
            require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),result.competition)
          : result.competition;
        txt=result.competition.competitionType==="openWater"
          ? {...require("./winpalme-open-water-manual").buildNativeManualOpenWaterTxt(exportCompetition,
            exportEntries.map(entry=>({...entry,swimmers:(entry.swimmers||[]).map(swimmer=>({...swimmer,category:backendContext.engagementTxtSwimmerCategory(swimmer,exportCompetition)}))})),result.clubsById),
            fileName:`engagements-winpalme-${backendContext.engagementPdfFileName(exportCompetition.name || exportCompetition.id)}.txt`}
          : backendContext.buildEngagementCompetitionTxt(exportCompetition,exportEntries,result.clubsById);
      }
      catch (error) {
        if(result.competition.competitionType==="openWater") throw new backendContext.HttpsError("failed-precondition", error.message || "Export eau libre indisponible.");
        throw error;
      }
      const buffer=txt.buffer;
      if (!Buffer.isBuffer(buffer)) throw new backendContext.HttpsError("internal", "Export TXT indisponible.");
      if(buffer.length>10000000) throw new backendContext.HttpsError("resource-exhausted","Export trop volumineux.");
      return {ok:true,source:"nap",competitionId,entryCount:entries.length,fileName:txt.fileName,contentType:"text/plain; charset=utf-8",generatedAt:result.generatedAt,fromStorage:false,txtBase64:buffer.toString("base64"),sqlBudget:result.competition.competitionType==="openWater" ? {...result.sqlBudget,queriesMax:result.sqlBudget.queriesMax+2,widRowsMax:1,catalogueRowsMax:300} : result.sqlBudget};
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    if (backendContext.cleanEngagementCompetitionType(competition.data()?.competitionType) === "openWater") {
      throw new backendContext.HttpsError("failed-precondition", "L'export TXT eau libre sera disponible apres validation de son format.");
    }
    backendContext.assertCanManageEngagementCompetition(context, competition.data() || {});
    const entriesSnapshot = await backendContext.db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    const result = await backendContext.getOrCreateEngagementCompetitionTxt(competition, entriesSnapshot.docs, {
      force: request.data?.force === true
    });
    await backendContext.writeAuditLog("engagementCompetition.txtExportGenerated", context.uid, {
      competitionId,
      entryCount: result.entryCount,
      fileName: result.fileName,
      size: result.buffer.length,
      fromStorage: result.fromStorage
    });
    return {
      ok: true,
      competitionId,
      entryCount: result.entryCount,
      fileName: result.fileName,
      contentType: "text/plain; charset=utf-8",
      generatedAt: result.generatedAt,
      document: result.document,
      file: result.file,
      generatedFiles: result.generatedFiles,
      fromStorage: result.fromStorage,
      txtBase64: result.buffer.toString("base64")
    };
  }

  async function getPortalPendingRequestOverview(request) {
    const context = await backendContext.accessManagementContext(request);
    let accessRequestsQuery = backendContext.db.collection("engagementAccessRequests").where("status", "==", "pending");
    if (!context.national) {
      if (!context.regionId) {
        throw new backendContext.HttpsError("failed-precondition", "Perimetre regional requis.");
      }
      accessRequestsQuery = accessRequestsQuery.where("regionId", "==", context.regionId);
    }
    const [accessSnapshot, nationalRequests] = await Promise.all([
      accessRequestsQuery.count().get(),
      context.national ? backendContext.engagementNationalAdministrationPendingCounts() : Promise.resolve(null)
    ]);
    return {
      ok: true,
      scope: {
        type: context.national ? "national" : "region",
        regionId: context.national ? "" : context.regionId
      },
      accessRequests: {
        pending: Math.max(0, Number(accessSnapshot.data()?.count || 0))
      },
      nationalRequests
    };
  }

  async function createEngagementCompetition(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const raw=request.data || {};
      if (!["pool","openWater"].includes(raw.competitionType)) throw new backendContext.HttpsError("invalid-argument","Choisissez le type de competition.");
      return backendContext.createNativePortalCalendarRecord(raw,context,raw.competitionType);
    }
    if (!backendContext.ENGAGEMENT_COMPETITION_TYPES.has(backendContext.cleanText(request.data?.competitionType))) {
      throw new backendContext.HttpsError("invalid-argument", "Choisissez le type de competition : piscine ou eau libre.");
    }
    const competition = backendContext.cleanEngagementCompetitionPayload({
      ...(request.data || {}),
      entryStatus: "upcoming",
      entryDeadlineAt: ""
    }, context);
    if (request.data?.qualifications !== undefined) {
      if (!context.national) throw new backendContext.HttpsError("permission-denied", "Seul le National peut configurer les qualifications.");
      try { competition.qualifications = backendContext.qualificationEngine.validateRules(request.data.qualifications, backendContext.qualificationEvents(competition)); }
      catch (error) { throw new backendContext.HttpsError("invalid-argument", error.message); }
      if (competition.qualifications.enabled && competition.competitionType !== "pool") throw new backendContext.HttpsError("invalid-argument", "Qualifications réservées aux compétitions piscine.");
      if (competition.qualifications.enabled) competition.missingEntryTimeMode = "default595999";
      competition.qualificationVersion = 1;
    }
    const now = new Date().toISOString();
    const docRef = backendContext.db.collection("engagementCompetitions").doc();
    const payload = {
      ...competition,
      createdAt: now,
      createdBy: context.uid,
      updatedAt: now,
      updatedBy: context.uid
    };
    await docRef.set(payload);
    await backendContext.writeAuditLog("engagementCompetition.created", context.uid, {
      competitionId: docRef.id,
      name: payload.name,
      date: payload.date,
      regionId: payload.regionId,
      level: payload.level,
      entryStatus: payload.entryStatus
    });
    return {
      ok: true,
      competition: backendContext.engagementCompetitionListItem({
        id: docRef.id,
        data: () => payload
      })
    };
  }

  async function updateEngagementCompetition(request) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const nativeChange = require("./nap-portal-competition-change");
      const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const authorize = event => backendContext.assertCanModifyEngagementEvent(context,event);
      try {
        const patch={...(request.data?.patch||{})},incoming=request.data?.qualifications??patch.qualifications;
        if(request.data?.notificationOpeningRequested!==undefined&&typeof request.data.notificationOpeningRequested!=='boolean')throw new TypeError("Choix du mail d'ouverture invalide.");
        delete patch.qualifications;
        if(incoming!==undefined||['date','qualificationStartDate','qualificationEndDate','courseOptions'].some(key=>Object.hasOwn(patch,key))){
          const pack=await require("./nap-portal-competitions").readNativeCompetition(pool,competitionId,authorize);
          if(!pack)throw new backendContext.HttpsError("not-found","Competition NAP introuvable.");
          const services=backendContext.nativeQualificationServices(context),events=services.eventsFor(pack),previous=services.competitionFor(pack).qualifications;
          let rules=previous;
          if(incoming!==undefined){try{rules=backendContext.qualificationEngine.validateRules(incoming,events,false);}catch(error){throw new backendContext.HttpsError('invalid-argument',error.message);}}
          const changed=!require('node:util').isDeepStrictEqual(previous,rules);
          const affects=changed||rules.enabled&&['date','qualificationStartDate','qualificationEndDate','courseOptions'].some(key=>Object.hasOwn(patch,key));
          if(affects){
            if(!context.national)throw new backendContext.HttpsError("permission-denied","Cette modification affecte les qualifications : intervention nationale requise.");
            return await require("./nap-qualification-control-start").beginControl(pool,{competitionId,actorUid:context.uid,national:true,expectedFingerprint:request.data?.expectedFingerprint,patch,rules,events,notificationOpeningRequested:request.data?.notificationOpeningRequested===true},services);
          }
          if(!Object.keys(patch).length)return {ok:true,unchanged:true,competition:await backendContext.nativePortalCompetition(competitionId,event=>backendContext.assertCanManageEngagementCompetition(context,event))};
        }
        const applyNativeChange = Object.hasOwn(patch,"removeNativeCourseIds") ? require("./nap-open-water-course-removal").removeNativeCourses
          : Object.hasOwn(patch,"addNativeCourses") ? require("./nap-course-addition").addNativeCourses
          : Object.hasOwn(request.data?.patch || {},"removeNativeCourseId") ? require("./nap-course-removal").removeNativeCourse : nativeChange.applyCompetitionChange;
        const result = await require("./nap-qualification-edit-lock").ordinaryEdit(pool,competitionId,()=>applyNativeChange(pool, {
          competitionId, actorUid:context.uid,national:context.national,expectedFingerprint:request.data?.expectedFingerprint,patch,
          eventDefinitions:backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE,normalizeProgram:backendContext.cleanEngagementProgramSessions,normalizeEvents:backendContext.cleanEngagementCompetitionEvents
        }, {
          read:async operation => { const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-competition-${operation}-before`).get(); return snapshot.exists ? snapshot.data().target : null; },
          prepare:(operation,target) => backendContext.db.collection("auditLogs").doc(`nap-competition-${operation}-before`).create({action:"nap.competition.change.prepare",actorUid:context.uid,target:{...target,notificationOpeningRequested:request.data?.notificationOpeningRequested===true},createdAt:new Date().toISOString()}),
          complete:async(operation,target) => {await backendContext.armNativeCompetitionNotification(context,{competitionId,patch},operation);await backendContext.writeAuditLogOnce("nap.competition.changed",context.uid,{...target,auditPreparationId:`nap-competition-${operation}-before`},operation);}
        },authorize),{authorize});
        const competition=await backendContext.nativePortalCompetition(competitionId,event=>backendContext.assertCanManageEngagementCompetition(context,event));
        return {...result,competition:{...competition,regionalPastReadOnly:!context.national && backendContext.engagementEventIsPast(competition)}};
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable",error instanceof TypeError || error instanceof RangeError ? error.message : "Enregistrement NAP a verifier. Reprenez la meme modification ; la sauvegarde est conservee.");
      }
    }
    const docRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertCanModifyEngagementEvent(context, snapshot.data() || {});
    const competition = backendContext.cleanEngagementCompetitionPayload(request.data || {}, context);
    const storedCompetitionType = backendContext.cleanEngagementCompetitionType(snapshot.data()?.competitionType);
    if (competition.competitionType !== storedCompetitionType) {
      throw new backendContext.HttpsError("failed-precondition", "Le type de competition ne peut pas etre modifie apres sa creation.");
    }
    if (storedCompetitionType === "openWater" && Array.isArray(competition.events)) {
      const courseSnapshot = await backendContext.engagementOpenWaterCourseConfigRef().get();
      const configuredCourses = backendContext.cleanEngagementOpenWaterCourses(courseSnapshot.exists ? courseSnapshot.data()?.courses : []);
      const existingCourseIds = new Set(backendContext.cleanEngagementCompetitionEvents(snapshot.data()?.events || [], {
        strict: false,
        competitionType: "openWater"
      }).map((event) => event.openWaterCourseId).filter(Boolean));
      const selectableCourseIds = new Set(configuredCourses
        .filter((course) => course.active !== false || existingCourseIds.has(course.id))
        .map((course) => course.id));
      const unknownCourse = competition.events.find((event) =>
        event.type === "individual" && !selectableCourseIds.has(event.openWaterCourseId)
      );
      if (unknownCourse) {
        throw new backendContext.HttpsError("failed-precondition", "Une course eau libre n'est pas disponible dans la bibliotheque nationale.");
      }
    }
    backendContext.assertCanManageEngagementCompetition(context, competition);
    if (snapshot.data()?.qualificationJobId) throw new backendContext.HttpsError("failed-precondition", "Un contrôle de qualification est déjà en cours.");
    const incoming = request.data?.qualifications;
    if (incoming !== undefined && !context.national && JSON.stringify(incoming) !== JSON.stringify(snapshot.data()?.qualifications || { enabled: false })) {
      throw new backendContext.HttpsError("permission-denied", "Seul le National peut modifier les qualifications.");
    }
    let qualifications;
    try {
      qualifications = backendContext.qualificationEngine.validateRules(incoming === undefined ? snapshot.data()?.qualifications : incoming,
        backendContext.qualificationEvents({ ...snapshot.data(), ...competition }), competition.entryStatus === "open");
    } catch (error) { throw new backendContext.HttpsError("invalid-argument", error.message); }
    if (qualifications.enabled && competition.competitionType !== "pool") throw new backendContext.HttpsError("invalid-argument", "Qualifications réservées aux compétitions piscine.");
    const now = new Date().toISOString();
    const payload = { ...competition, qualifications, ...(qualifications.enabled ? { missingEntryTimeMode: "default595999" } : {}), updatedAt: now, updatedBy: context.uid };
    const affectsQualifications = JSON.stringify(qualifications) !== JSON.stringify(snapshot.data()?.qualifications || { enabled: false, groups: [], standards: {} }) ||
      (qualifications.enabled && (snapshot.data()?.missingEntryTimeMode !== "default595999" || competition.date !== snapshot.data()?.date || JSON.stringify(competition.events || snapshot.data()?.events) !== JSON.stringify(snapshot.data()?.events)));
    if (affectsQualifications) {
      payload.qualificationVersion = Number(snapshot.data()?.qualificationVersion || 0) + 1;
      if (!context.national) throw new backendContext.HttpsError("permission-denied", "Cette modification affecte les qualifications : intervention nationale requise.");
      return backendContext.qualificationService().begin(request, docRef, payload, snapshot.updateTime.toMillis());
    }
    await backendContext.db.runTransaction(async (tx) => {
      const latest = await tx.get(docRef);
      if (latest.updateTime.toMillis() !== snapshot.updateTime.toMillis() || latest.data()?.qualificationJobId) throw new backendContext.HttpsError("aborted", "La compétition a changé. Rechargez sa fiche.");
      tx.set(docRef, payload, { merge: true });
    });
    await backendContext.writeAuditLog("engagementCompetition.updated", context.uid, {
      competitionId,
      name: payload.name,
      date: payload.date,
      regionId: payload.regionId,
      level: payload.level,
      entryStatus: payload.entryStatus
    });
    const updated = await docRef.get();
    return {
      ok: true,
      competition: backendContext.engagementCompetitionDetailItem(updated, { includeDocumentUploader: true })
    };
  }

  async function deleteEngagementCompetition(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      try {
        return await require("./nap-competition-deletion").competitionDeletion(pool, {
          competitionId: request.data?.competitionId, actorUid: context.uid,
          previewOnly: request.data?.previewOnly === true, confirmPermanent: request.data?.confirmPermanent === true,
          expectedFingerprint: request.data?.expectedFingerprint
        }, {
          prepare: (id, target) => backendContext.db.collection("auditLogs").doc(`nap-competition-delete-${id}-before`).create({action:"nap.competitionDelete.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete: (id, target) => backendContext.writeAuditLogOnce("nap.competitionDelete.complete",context.uid,{...target,auditPreparationId:`nap-competition-delete-${id}-before`},`nap-competition-delete-${id}-complete`)
        }, async id => {
          const pack = await require("./nap-portal-competitions").readNativeCompetition(pool,id,event=>backendContext.assertCanModifyEngagementEvent(context,event));
          if (!pack) throw new backendContext.HttpsError("not-found", "Competition NAP introuvable.");
          return pack;
        });
      } catch (error) {
        if (error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError("failed-precondition", error?.code === 6 || error?.code === "ALREADY_EXISTS" ? "Une suppression est deja en cours ou doit etre verifiee ; aucune nouvelle tentative automatique." : error instanceof TypeError || error instanceof RangeError ? error.message : "Suppression NAP a verifier ; sauvegarde conservee si la confirmation avait commence.");
      }
    }
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }

    const docRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }

    const competition = snapshot.data() || {};
    if (!context.national) {
      backendContext.assertCanManageEngagementCompetition(context, competition);
      if (backendContext.engagementEventIsPast(competition)) {
        throw new backendContext.HttpsError("failed-precondition", "Une competition passee doit faire l'objet d'une demande de suppression au niveau national.");
      }
      if (backendContext.cleanEngagementEntryStatus(competition.entryStatus || competition.status) !== "upcoming") {
        throw new backendContext.HttpsError("failed-precondition", "Seule une competition a venir peut etre retiree du calendrier par la region.");
      }
      const entriesSnapshot = await backendContext.db.collection("engagementClubEntries")
        .where("competitionId", "==", competitionId)
        .limit(1)
        .get();
      if (!entriesSnapshot.empty) {
        throw new backendContext.HttpsError("failed-precondition", "Impossible de retirer cette competition : au moins un club a deja commence ses engagements.");
      }
    }
    const now = new Date().toISOString();
    const deletionRequestRef = backendContext.db.collection("engagementCompetitionDeletionRequests").doc(competitionId);
    const deletionRequest = await deletionRequestRef.get();
    const batch = backendContext.db.batch();
    batch.delete(docRef);
    const competitionDate = backendContext.cleanIsoDate(competition.date);
    const seasonEndYear = competitionDate ? backendContext.engagementSeasonEndYearFromIsoDate(competitionDate) : null;
    if (seasonEndYear !== null) {
      const season = backendContext.engagementSeasonBoundsFromEndYear(seasonEndYear);
      batch.set(backendContext.engagementCompetitionCalendarRef(backendContext.db, seasonEndYear), {
        ...season,
        generatedAt: now,
        updatedAt: now,
        competitions: {
          [competitionId]: backendContext.FieldValue.delete()
        }
      }, { merge: true });
    }
    batch.delete(backendContext.engagementClosureQueueRef(backendContext.db, competitionId));
    if (deletionRequest.exists) {
      batch.set(deletionRequestRef, {
        status: "approved",
        approvedAt: now,
        approvedBy: context.uid,
        approvedByEmail: context.email || "",
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    }
    await batch.commit();
    const competitionDocuments = backendContext.cleanCompetitionDocuments(competition.clubDocuments || [], { includeUploader: true });
    const documentDeletionResults = await Promise.allSettled(competitionDocuments.filter(backendContext.hasManagedEngagementCompetitionDocumentStorage).map((document) =>
      backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET)
        .file(backendContext.assertEngagementCompetitionDocumentPath(document.storagePath))
        .delete({ ignoreNotFound: true })
    ));
    await backendContext.writeAuditLog("engagementCompetition.deleted", context.uid, {
      competitionId,
      name: competition.name || "",
      date: competition.date || "",
      regionId: competition.regionId || "",
      level: competition.level || "",
      competitionDocumentCount: competitionDocuments.length,
      competitionDocumentDeleteErrorCount: documentDeletionResults.filter((result) => result.status === "rejected").length
    });
    return {
      ok: true,
      deleted: true,
      competitionId
    };
  }

  return { listEngagementAccessRequests, listEngagementQualificationSources, processEngagementQualificationJob, grantEngagementQualificationException, acknowledgeEngagementQualificationAlert, getEngagementAutomaticMailControl, updateEngagementAutomaticMailControl, rebuildEngagementMailRecipientIndexNextPage, listEngagementCompetitions, listEngagementCalendarEvents, getEngagementCalendarEvent, createEngagementCalendarEvent, updateEngagementCalendarEvent, deleteEngagementCalendarEvent, listEngagementOpenWaterCourses, addEngagementOpenWaterCourse, setEngagementOpenWaterCourseStatus, getEngagementCompetition, uploadEngagementCompetitionDocument, updateEngagementCompetitionDocument, deleteEngagementCompetitionDocument, previewEngagementCompetitionDocumentNotification, getEngagementCompetitionStatistics, generateEngagementCompetitionTxtExport, getPortalPendingRequestOverview, createEngagementCompetition, updateEngagementCompetition, deleteEngagementCompetition };
}

module.exports = { createCompetitionHandlers };
