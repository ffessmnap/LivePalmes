// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createCompetitionService(backendContext) {
  function cleanEngagementCompetitionPayload(raw = {}, context = {}) {
    const name = backendContext.cleanText(raw.name).slice(0, 160);
    const date = backendContext.cleanIsoDate(raw.date);
    const endDate = backendContext.cleanIsoDate(raw.endDate) || date;
    const location = backendContext.cleanText(raw.location).slice(0, 160);
    const city = backendContext.cleanText(raw.city || raw.location).slice(0, 120);
    const address = backendContext.cleanText(raw.address).slice(0, 300);
    const organizer = backendContext.cleanText(raw.organizer).slice(0, 160);
    const organizerEmail = backendContext.cleanOptionalEmail(raw.organizerEmail, "Email organisateur");
    const publicDescription = backendContext.cleanText(raw.publicDescription).slice(0, 3000);
    const level = backendContext.cleanEngagementCompetitionLevel(raw.level);
    const requestedTeamLeadersWhatsAppUrl = backendContext.cleanText(raw.teamLeadersWhatsAppUrl).slice(0, 500);
    const teamLeadersWhatsAppUrl = context.national && backendContext.isNationalOnlyEngagementCompetitionLevel(level)
      ? backendContext.cleanPublicCalendarWhatsAppUrl(requestedTeamLeadersWhatsAppUrl)
      : "";
    const entryDeadlineAt = backendContext.cleanEngagementDeadlineAt(raw.entryDeadlineAt);
    const computerEmail = backendContext.cleanOptionalEmail(raw.computerEmail, "Email du responsable informatique");
    const officialsManagerEmail = backendContext.cleanOptionalEmail(raw.officialsManagerEmail, "Email du responsable juge");
    const entryStatus = backendContext.cleanEngagementEntryStatus(raw.entryStatus);
    const publicationStatus = "published";
    const competitionType = backendContext.cleanEngagementCompetitionType(raw.competitionType);
    const waterBodyType = competitionType === "openWater" ? backendContext.cleanEngagementWaterBodyType(raw.waterBodyType) : "";
    const poolLength = competitionType === "pool" ? backendContext.cleanEngagementPoolLength(raw.poolLength) : "";
    const poolLaneCount = competitionType === "pool" ? backendContext.cleanEngagementPoolLaneCount(raw.poolLaneCount) : 0;
    const timingType = backendContext.cleanEngagementTimingType(raw.timingType);
    const qualificationTimesMode = competitionType === "openWater" ? "all" : backendContext.cleanEngagementQualificationTimesMode(raw.qualificationTimesMode);
    const qualificationStartDate = qualificationTimesMode === "period" ? backendContext.cleanIsoDate(raw.qualificationStartDate) : "";
    const qualificationEndDate = qualificationTimesMode === "period" ? backendContext.cleanIsoDate(raw.qualificationEndDate) : "";
    const missingEntryTimeMode = competitionType === "openWater" ? "none" : backendContext.cleanEngagementMissingEntryTimeMode(raw.missingEntryTimeMode);
    const maxEventsPerSwimmer = backendContext.cleanEngagementMaxEventsPerSwimmer(raw.maxEventsPerSwimmer);
    const requestedRegionId = backendContext.cleanText(raw.regionId).slice(0, 80);
    const regionId = backendContext.isNationalOnlyEngagementCompetitionLevel(level) ? "" : (context.national ? requestedRegionId : context.regionId);
    const invitedRegionIds = backendContext.isNationalOnlyEngagementCompetitionLevel(level) ? [] : backendContext.cleanEngagementRegionIds(raw.invitedRegionIds, regionId);
    const events = Object.prototype.hasOwnProperty.call(raw, "events")
      ? backendContext.cleanEngagementCompetitionEvents(raw.events, { competitionType })
      : null;
    const programSessions = events
      ? backendContext.cleanEngagementProgramSessions(raw.programSessions || [], events)
      : null;
    const programItemCount = (programSessions || [])
      .reduce((sum, session) => sum + (session.items || []).length, 0);

    if (!context.national && !context.region) {
      throw new backendContext.HttpsError("permission-denied", "Droit creation competition engagements requis.");
    }
    if (!context.national && backendContext.isNationalOnlyEngagementCompetitionLevel(level)) {
      throw new backendContext.HttpsError("permission-denied", "Une competition nationale doit etre creee par le niveau national.");
    }
    if (!context.national && entryStatus === "closed") {
      throw new backendContext.HttpsError("permission-denied", "La fermeture des engagements est automatique apres la date de cloture.");
    }
    if (!name || !date || !city) {
      throw new backendContext.HttpsError("invalid-argument", "Nom, date et ville sont obligatoires.");
    }
    if (endDate && endDate < date) {
      throw new backendContext.HttpsError("invalid-argument", "La date de fin doit etre egale ou posterieure a la date de debut.");
    }
    if (!backendContext.isNationalOnlyEngagementCompetitionLevel(level) && !regionId) {
      throw new backendContext.HttpsError("invalid-argument", "Region obligatoire pour une competition departementale ou regionale.");
    }
    if (context.national && backendContext.isNationalOnlyEngagementCompetitionLevel(level) && requestedTeamLeadersWhatsAppUrl && !teamLeadersWhatsAppUrl) {
      throw new backendContext.HttpsError("invalid-argument", "Le lien du groupe WhatsApp doit commencer par https://chat.whatsapp.com/.");
    }
    if (entryStatus === "open" && publicationStatus !== "published") {
      throw new backendContext.HttpsError("failed-precondition", "Publiez la competition avant d'ouvrir les engagements.");
    }
    if (entryStatus === "open" && !programItemCount) {
      throw new backendContext.HttpsError("failed-precondition", "Ajoutez au moins une course au programme avant d'ouvrir les engagements.");
    }
    if (qualificationTimesMode === "period" && (!qualificationStartDate || !qualificationEndDate)) {
      throw new backendContext.HttpsError("invalid-argument", "Periode des temps d'engagement incomplete.");
    }
    if (qualificationTimesMode === "period" && qualificationStartDate > qualificationEndDate) {
      throw new backendContext.HttpsError("invalid-argument", "La fin de periode des temps doit etre apres le debut.");
    }
    if (entryStatus === "open" && !entryDeadlineAt) {
      throw new backendContext.HttpsError("failed-precondition", "Renseignez la date et l'heure de cloture avant d'ouvrir les engagements.");
    }
    if (backendContext.isEngagementOpeningDeadlinePast(entryStatus, entryDeadlineAt)) {
      throw new backendContext.HttpsError("failed-precondition", "Impossible d'ouvrir les engagements : la date de cloture est depassee.");
    }
    if (backendContext.isEngagementOpeningTooEarly(entryStatus, date)) {
      throw new backendContext.HttpsError("failed-precondition", "Impossible d'ouvrir les engagements plus de 30 jours avant la competition.");
    }
    if (entryStatus === "open" && !timingType) {
      throw new backendContext.HttpsError("failed-precondition", "Renseignez le chronometrage avant d'ouvrir les engagements.");
    }
    if (entryStatus === "open" && competitionType === "pool" && (!poolLength || !poolLaneCount)) {
      throw new backendContext.HttpsError("failed-precondition", "Renseignez le bassin et le nombre de lignes d'eau avant d'ouvrir les engagements.");
    }

    return {
      name,
      date,
      endDate,
      location,
      city,
      address,
      organizer,
      organizerEmail,
      teamLeadersWhatsAppUrl,
      publicDescription,
      regionId,
      invitedRegionIds,
      level,
      competitionType,
      waterBodyType,
      entryDeadlineAt,
      computerEmail,
      officialsManagerEmail,
      entryStatus,
      publicationStatus,
      canceled: raw.canceled === true,
      officialsRequired: raw.officialsRequired === true,
      poolLength,
      poolLaneCount,
      timingType,
      qualificationTimesMode,
      qualificationStartDate,
      qualificationEndDate,
      missingEntryTimeMode,
      maxEventsPerSwimmer,
      ...(Object.prototype.hasOwnProperty.call(raw, "fees")
        ? { fees: backendContext.cleanEngagementFees(raw.fees) }
        : {}),
      ...(events
        ? {
            events,
            programSessions
          }
        : {})
    };
  }

  function assertCanManageEngagementCompetition(context = {}, competition = {}) {
    if (context.national) return;
    if (!context.region || !context.regionId) {
      throw new backendContext.HttpsError("permission-denied", "Droit gestion competition engagements requis.");
    }
    if (backendContext.isNationalOnlyEngagementCompetitionLevel(competition.level)) {
      throw new backendContext.HttpsError("permission-denied", "Competition nationale reservee au niveau national.");
    }
    if (!backendContext.engagementRegionsMatch(competition.regionId, context.regionId)) {
      throw new backendContext.HttpsError("permission-denied", "Competition hors perimetre regional.");
    }
  }

  function engagementParisIsoDate(nowMs = Date.now()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(nowMs));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function engagementEventIsPast(event = {}, nowMs = Date.now()) {
    const endDate = backendContext.cleanIsoDate(event.endDate) || backendContext.cleanIsoDate(event.date);
    return Boolean(endDate && endDate < engagementParisIsoDate(nowMs));
  }

  function assertCanModifyEngagementEvent(context = {}, event = {}) {
    assertCanManageEngagementCompetition(context, event);
    if (!context.national && engagementEventIsPast(event)) {
      throw new backendContext.HttpsError("failed-precondition", "Cet evenement passe est consultable mais ne peut plus etre modifie par la region.");
    }
  }

  function assertCanDeleteEngagementDocument(context = {}, event = {}) {
    assertCanManageEngagementCompetition(context, event);
    if (!context.national && engagementEventIsPast(event)) {
      throw new backendContext.HttpsError("failed-precondition", "Un document existant ne peut plus etre supprime d'un evenement passe par la region.");
    }
  }

  function engagementDeletionRequestId(sourceType = "competition", eventId = "") {
    return sourceType === "calendarEvent" ? `calendarEvent-${eventId}` : eventId;
  }

  function engagementClubWriteLockReason(competition = {}, nowMs = Date.now()) {
    if (competition.qualificationJobId) return "Contrôle des qualifications en cours. Réessayez après sa validation par le National.";
    const entryStatus = backendContext.cleanEngagementEntryStatus(competition.entryStatus || competition.status);
    if (entryStatus === "closed") return "Les engagements sont fermes.";
    if (entryStatus !== "open") return "Les engagements ne sont pas ouverts.";
    const deadline = backendContext.cleanIsoDateTime(competition.entryDeadlineAt);
    if (!deadline) return "";
    const deadlineMs = Date.parse(deadline);
    return Number.isFinite(deadlineMs) && deadlineMs < nowMs
      ? "La date limite des engagements est depassee."
      : "";
  }

  function assertEngagementClubWriteOpen(competition = {}) {
    const reason = engagementClubWriteLockReason(competition);
    if (reason) {
      throw new backendContext.HttpsError("failed-precondition", reason, {
        entryStatus: backendContext.cleanEngagementEntryStatus(competition.entryStatus || competition.status),
        entryDeadlineAt: backendContext.cleanIsoDateTime(competition.entryDeadlineAt)
      });
    }
  }

  async function nativePortalCalendarItems(ranges) {
    const native = require("./nap-portal-competitions");
    const view = require("./nap-portal-workspaces");
    const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
    const years = [...new Set(ranges.map(range => range.season.endYear))];
    const events = [];
    for (const year of years) events.push(...(await native.readNativeCompetitionSeason(pool, year)).events);
    return [...new Map(events.map(event => [event.id, view.listItem(event)])).values()];
  }

  async function nativeDocumentAuthors(documents) {
    const ids=[...new Set(documents.map(document=>document.uploadedBy?.uid).filter(Boolean))];
    if(!ids.length)return documents;
    // Auth identities only, one batch <=100; no former sporting collection read.
    const users=await backendContext.getAuth().getUsers(ids.map(uid=>({uid}))).catch(()=>({users:[]}));
    const byId=new Map(users.users.map(user=>[user.uid,user]));
    return documents.map(document=>{const user=byId.get(document.uploadedBy?.uid);return user?{...document,uploadedBy:{uid:user.uid,name:backendContext.cleanText(user.displayName),email:backendContext.cleanText(user.email)}}:document;});
  }

  async function nativePortalCompetition(input, authorize, includeUploaders=false) {
    const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
    const native = require("./nap-portal-competitions");
    const view = require("./nap-portal-workspaces");
    const pack = await native.readNativeCompetition(pool, input, authorize);
    if (!pack) throw new backendContext.HttpsError("not-found", "Competition NAP introuvable.");
    const competition = view.competitionItem(pack, backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
    competition.qualificationJobId=await require("./nap-qualification-jobs").activeControl(pool,input);
    competition.nativeSelectionLockReason=require('./nap-swimmer-entry-plan').selectionLockReason(competition);
    competition.clubDocuments = await view.readDocuments(pool, input, {includeUploader:includeUploaders});
    if(includeUploaders)competition.clubDocuments=await nativeDocumentAuthors(competition.clubDocuments);
    competition.documentCount = competition.clubDocuments.length;
    return competition;
  }

  async function createNativePortalCalendarRecord(raw,context,kind) {
    const event=backendContext.cleanEngagementCalendarEventPayload({...raw,eventType:kind},context);
    event.competitionType=kind;
    const committeeId=["national","international"].includes(event.level) ? (event.level==="national"?4:5) : Object.keys(backendContext.CLUB_REFERENCE_REGION_LABELS).find(id=>backendContext.engagementRegionsMatch(id,event.regionId));
    try {
      const result=await require("./nap-competition-create").createCompetition(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{actorUid:context.uid,creationId:raw.creationId,committeeId,event},{
        read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-competition-create-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
        prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-competition-create-${operation}-before`).create({action:"nap.competition.create.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
        checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-competition-create-${operation}-before`).update({target}),
        complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementCompetition.created",context.uid,{...target,auditPreparationId:`nap-competition-create-${operation}-before`},operation)
      },proposed=>assertCanModifyEngagementEvent(context,proposed));
      const competition=await nativePortalCompetition(result.competitionId,proposed=>assertCanManageEngagementCompetition(context,proposed));
      return {...result,competition};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":error instanceof RangeError?"resource-exhausted":"unavailable",error instanceof TypeError||error instanceof RangeError?error.message:"Creation NAP a verifier. Conservez le formulaire : ne creez pas une seconde competition.");
    }
  }

  async function nativeClubEntryView(pack,context,competition) {
    return require("./nap-portal-workspaces").entryWithCourseRules(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),pack,context,competition,{
      age:(date,birthDate)=>(backendContext.importSeasonYear(date)||backendContext.competitionYear(date))-backendContext.birthYear(birthDate),
      category:backendContext.ageCategoryFromDates,
      forbidden:(code,category)=>backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code]?.has(category)===true
    });
  }

  function engagementCompetitionDocumentUploader(context = {}) {
    return {
      uid: backendContext.cleanText(context.uid).slice(0, 128),
      name: [backendContext.cleanText(context.firstName), backendContext.cleanText(context.lastName)].filter(Boolean).join(" ").slice(0, 180),
      email: backendContext.normalizeEmail(context.email).slice(0, 180)
    };
  }

  function assertEngagementCompetitionDocumentPath(storagePath = "") {
    const cleanPath = backendContext.cleanText(storagePath);
    if (!cleanPath.startsWith(`${backendContext.ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX}/`) || cleanPath.includes("..")) {
      throw new backendContext.HttpsError("failed-precondition", "Chemin de document de compétition invalide.");
    }
    return cleanPath;
  }

  function hasManagedEngagementCompetitionDocumentStorage(document = {}) {
    const storagePath = backendContext.cleanText(document?.storagePath);
    return storagePath.startsWith(`${backendContext.ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX}/`) && !storagePath.includes("..");
  }

  async function engagementCompetitionDocumentContext(request) {
    const context = await backendContext.engagementAccessContext(request);
    const calendarEventId = backendContext.cleanText(request.data?.calendarEventId).slice(0, 128);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const eventId = calendarEventId || competitionId;
    const sourceType = calendarEventId ? "calendarEvent" : "competition";
    if (!eventId) throw new backendContext.HttpsError("invalid-argument", "Compétition ou evenement requis.");
    const collection = sourceType === "calendarEvent" ? backendContext.ENGAGEMENT_CALENDAR_EVENTS_COLLECTION : "engagementCompetitions";
    const ref = backendContext.db.collection(collection).doc(eventId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Compétition ou evenement introuvable.");
    assertCanManageEngagementCompetition(context, snapshot.data() || {});
    return { context, competitionId: eventId, calendarEventId, sourceType, ref, snapshot };
  }

  async function nationalLibraryContext(request) {
    const context=await backendContext.engagementAccessContext(request);
    if(!context.national)throw new backendContext.HttpsError('permission-denied','Administration nationale requise.');
    if(backendContext.ENVIRONMENT.sportingDataSource!=='nap')throw new backendContext.HttpsError('failed-precondition','Bibliothèque NAP indisponible.');
    return context;
  }

  async function manageNationalLibraryDocuments(request) {
    const context=await nationalLibraryContext(request);
    const library=require('./nap-national-documents');
    const pool=require('./nap-portal-swimmers').portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
    try{
      const input=request.data||{};
      if(input.action==='list')return await library.list(pool,input);
      if(input.action==='detail')return {document:library.view(await library.record(pool,input.documentId))};
      return await library.mutate(pool,input,{
        authorize:()=>nationalLibraryContext(request),
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

  async function notifyNationalLibraryDocument(request) {
    const context=await nationalLibraryContext(request);
    try{
      const input=request.data||{},library=require('./nap-national-documents');
      if(!['preview','send'].includes(input.action))throw new TypeError('Action de notification invalide.');
      const pool=require('./nap-portal-swimmers').portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const document=library.view(await library.record(pool,input.documentId));
      const setting=await require('./engagement-mail-control').read(backendContext.db);
      if((await backendContext.engagementMailRecipientIndexStateRef(backendContext.db).get()).data()?.status!=='ready')throw new TypeError('Annuaire des destinataires indisponible ; aucune reconstruction automatique.');
      const scoped=await require('./nap-notification-preview').nativeClubScopes(pool,await backendContext.engagementMailRecipientsFromIndex(backendContext.db,['engagements.club.manage']));
      if(scoped.length>10000)throw new RangeError('Annuaire des destinataires trop volumineux.');
      const control=require('./engagement-mail-control');
      const recipients=backendContext.engagementCompetitionNotificationRecipients(backendContext.engagementDedupMailRecipients(scoped))
        .filter(x=>x.clubId&&backendContext.engagementRecipientHasCapability(x,'engagements.club.manage')&&control.clubAllowed(setting,x))
        .sort((a,b)=>String(a.uid).localeCompare(String(b.uid))||String(a.email).localeCompare(String(b.email)));
      const fingerprint=backendContext.crypto.createHash('sha256').update(JSON.stringify([document.fingerprint,setting,recipients])).digest('hex');
      const disabled=backendContext.ENVIRONMENT.projectId==='livepalmes-test'||!setting.enabled;
      const result={recipientCount:recipients.length,clubCount:new Set(recipients.map(x=>x.clubId)).size,scope:setting.scope,fingerprint,disabled,sentCount:0,errorCount:0,skippedCount:0,test:backendContext.ENVIRONMENT.projectId==='livepalmes-test'};
      if(input.action==='preview')return result;
      if(input.expectedFingerprint!==fingerprint)throw new TypeError('Le document, les destinataires ou le réglage ont changé. Actualisez l’aperçu.');
      // No SMTP configuration, transporter, outbox or delayed event is created on TEST.
      if(disabled)return {...result,done:true};
      const offset=input.offset??0;
      if(!Number.isSafeInteger(offset)||offset<0||offset>recipients.length||offset%20!==0)throw new TypeError('Page de notification invalide.');
      const config=backendContext.engagementMailSmtpConfig();if(!config.ready)throw new TypeError('Configuration des mails indisponible.');
      const transporter=backendContext.nodemailer.createTransport({...config.transport,pool:true,maxConnections:1,connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000});
      try{
        for(const recipient of recipients.slice(offset,offset+20)){
          const now=new Date().toISOString();
          const jobId=backendContext.crypto.createHash('sha256').update(JSON.stringify(['national-document',document.id,document.fingerprint,recipient.uid,recipient.email])).digest('hex');
          const ref=backendContext.db.collection(backendContext.ENGAGEMENT_MAIL_JOBS_COLLECTION).doc(jobId);
          const job={source:'nap',type:'competition_documents',status:'sending',competitionId:'national-library',notificationId:`national-document-${document.id}`,recipientUid:recipient.uid,toEmail:recipient.email,clubId:String(recipient.clubId),recipientRegionId:recipient.napClubRegionId,subject:`LivePalmes — ${document.title}`,textBody:`Un document est disponible dans la bibliothèque LivePalmes.\n\n${document.title}\n${document.description||''}\n${document.url}\n\n${backendContext.ENVIRONMENT.hostingOrigin}/bibliotheque.html`,createdAt:now,notificationDueAt:now,updatedAt:now,attemptedAt:now};
          const claimed=await backendContext.db.runTransaction(async transaction=>{if((await transaction.get(ref)).exists)return false;transaction.create(ref,job);return true;});
          if(!claimed){result.skippedCount++;continue;}
          const sent=await backendContext.sendEngagementMailJob(transporter,{id:jobId,ref,data:()=>job},config,context);
          if(sent.status==='sent')result.sentCount++;else result.errorCount++;
          if(sent.stopDelivery)return {...result,done:true,interrupted:true};
        }
      }finally{transporter.close();}
      await backendContext.writeAuditLog('nap.nationalDocument.notified',context.uid,{documentId:document.id,offset,sentCount:result.sentCount,errorCount:result.errorCount});
      return {...result,done:offset+20>=recipients.length,nextOffset:offset+20};
    }catch(error){if(error instanceof backendContext.HttpsError)throw error;throw new backendContext.HttpsError(error instanceof TypeError?'failed-precondition':'unavailable',error instanceof TypeError?error.message:'Notification interrompue. Les envois déjà tentés ne seront pas renvoyés automatiquement.');}
  }

  async function mutateNativeCompetitionDocument(request, action) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = request.data?.calendarEventId || request.data?.competitionId;
    const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
    try {
      const result=await require("./nap-competition-documents").mutate(pool, {...request.data, competitionId, action, actorUid:context.uid}, {
        national:context.national === true,
        authorize:async (connection,id,kind) => {
          const calendar=require("./nap-direct-calendar");
          const rows=await require("./nap-portal-competitions").bounded(connection,`${calendar.SELECT_EVENT.replace(" FROM competitions c",",cp.id AS parameter_id,cp.niveau FROM competitions c")}${calendar.EVENT_JOINS} WHERE c.id=? LIMIT 2`,[id],1);
          if(!rows.length) throw new backendContext.HttpsError("not-found","Compétition NAP introuvable.");
          const event=require("./nap-portal-competitions").portalEventFromRow(rows[0]);
          assertCanManageEngagementCompetition(context,event);
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
      result.documents=await nativeDocumentAuthors(result.documents);
      return result;
    } catch(error) {
      if(error instanceof backendContext.HttpsError)throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError||error instanceof TypeError?error.message:"Document NAP à vérifier. La sauvegarde est conservée ; rechargez avant de reprendre.");
    }
  }

  async function generateNativeClubRecapPdf(context, competitionId) {
    try {
      const competition = await nativePortalCompetition(competitionId, () => {});
      const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const pack = await require("./nap-portal-entries").readNativeClubEntry(pool, { competitionId, clubId: context.clubId }, ({ clubId }) => {
        if (String(clubId) !== String(context.clubId)) throw new backendContext.HttpsError("permission-denied", "Dossier hors du club autorise.");
      });
      const entry = await nativeClubEntryView(pack,context,competition);
      if (!backendContext.engagementClubEntryHasParticipants(entry)) throw new backendContext.HttpsError("failed-precondition", "Aucun participant enregistre pour ce club.");
      const pdf = await backendContext.buildEngagementClubRecapPdf(competition, entry);
      if (!Buffer.isBuffer(pdf.buffer) || pdf.buffer.length > 10000000) throw new RangeError("Recapitulatif trop volumineux.");
      return { ok: true, source: "nap", fileName: pdf.fileName, contentType: "application/pdf", generatedAt: pdf.generatedAt,
        fromStorage: false, pdfBase64: pdf.buffer.toString("base64"), sqlBudget: { queriesMax: 25, rowsMax: 20519 } };
    } catch (error) {
      if (error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError ? "resource-exhausted" : error instanceof TypeError ? "failed-precondition" : "unavailable",
        error instanceof RangeError || error instanceof TypeError ? error.message : "Recapitulatif momentanement indisponible. Aucun engagement modifie.");
    }
  }

  async function nativeAdminCompetitionEntries(context,competitionId) {
    try {
      const competition=await nativePortalCompetition(competitionId,event=>assertCanManageEngagementCompetition(context,event));
      const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const result=await require("./nap-admin-entries").readAdminEntries(pool,{competitionId,competition},event=>assertCanManageEngagementCompetition(context,event),{category:backendContext.ageCategoryFromDates});
      return {...result,competition,sqlBudget:{...result.sqlBudget,queriesMax:24,dossierRowsMax:result.sqlBudget.rowsMax}};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError || error instanceof TypeError?error.message:"Lecture des engagements NAP indisponible.");
    }
  }

  async function nativeNotificationPreview(request, kind) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.calendarEventId || request.data?.competitionId).slice(0, 128);
    if (!competitionId) throw new backendContext.HttpsError("invalid-argument", "Compétition requise.");
    try {
      return await require("./nap-notification-preview").preview({ competitionId, kind,
        documentIds: kind === "documents" && Object.hasOwn(request.data || {}, "documentIds") ? request.data.documentIds : undefined }, {
        competition: id => nativePortalCompetition(id, event => assertCanManageEngagementCompetition(context, event)),
        mailSetting: () => require('./engagement-mail-control').read(backendContext.db),
        recipients: async () => {
          const state = await backendContext.engagementMailRecipientIndexStateRef(backendContext.db).get();
          if (state.data()?.status !== "ready") throw new backendContext.HttpsError("failed-precondition", "Annuaire des destinataires indisponible. Sa reconstruction doit être demandée séparément.");
          return require("./nap-notification-preview").nativeClubScopes(
            require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), await backendContext.engagementMailRecipientsFromIndex(backendContext.db));
        },
        select: (type, recipients, competition) => type === "opening"
          ? backendContext.engagementCompetitionOpeningRecipients(recipients, competition, [backendContext.engagementMailRecipientFromContext(context)].filter(Boolean))
          : backendContext.engagementCompetitionDocumentRecipients(recipients, competition),
        clubRecipients: recipients => backendContext.engagementCompetitionNotificationRecipients(backendContext.engagementDedupMailRecipients(recipients))
          .filter(recipient => recipient.clubId && backendContext.engagementRecipientHasCapability(recipient, "engagements.club.manage")),
        entries: competition => require("./nap-admin-entries").readAdminEntries(
          require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), { competitionId, competition },
          event => assertCanManageEngagementCompetition(context, event), { category: backendContext.ageCategoryFromDates }),
        hasParticipants: backendContext.engagementClubEntryHasParticipants
      });
    } catch (error) {
      if (error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable",
        error instanceof TypeError || error instanceof RangeError ? error.message : "Aperçu des notifications NAP indisponible.");
    }
  }

  function nativeNotificationAutomationServices(simulation = true) {
    if(backendContext.ENVIRONMENT.sportingDataSource !== "nap")throw new backendContext.HttpsError("failed-precondition","Source NAP requise.");
    const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
    let recipientPromise, mailSettingPromise;
    const competitionPromises=new Map(),entryPromises=new Map();
    const services={simulation,deleteField:()=>backendContext.FieldValue.delete(),
      mailSetting: () => mailSettingPromise ||= require('./engagement-mail-control').read(backendContext.db),
      allowEvent: simulation ? undefined : async event => {
        const control=require('./engagement-mail-control');
        return control.eventDecision(await services.mailSetting(),{createdAt:event.createdAt,notificationDueAt:event.automatic?event.deadline:event.createdAt}).allowed;
      },
      persistAttachment: simulation ? undefined : async (event,file,metadata) => {
        const storagePath=`engagements/notification-mail/${event.competitionId}/${event.operation}/${metadata.sha256}`;
        await backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET).file(storagePath).save(file.buffer,{resumable:false,
          metadata:{contentType:metadata.contentType,cacheControl:'private, no-store'}});
        return {...metadata,storagePath};
      },
      competition:id=>{
        if(!competitionPromises.has(id))competitionPromises.set(id,(async()=>({...await nativePortalCompetition(id,()=>{}),id:String(require('./nap-direct-calendar').positiveId(id))}))());
        return competitionPromises.get(id);
      },
      recipients:()=>recipientPromise||=(async()=>{
        const state=await backendContext.engagementMailRecipientIndexStateRef(backendContext.db).get();
        if(state.data()?.status!=="ready")throw new TypeError("Annuaire des destinataires indisponible.");
        return require("./nap-notification-preview").nativeClubScopes(pool,await backendContext.engagementMailRecipientsFromIndex(backendContext.db));
      })(),
      select:(kind,recipients,competition,event)=>kind==='opening'?backendContext.engagementCompetitionOpeningRecipients(recipients,competition,recipients.filter(recipient=>recipient.uid===event.actorUid)):backendContext.engagementCompetitionDocumentRecipients(recipients,competition),
      clubRecipients:recipients=>backendContext.engagementCompetitionNotificationRecipients(backendContext.engagementDedupMailRecipients(recipients)).filter(recipient=>recipient.clubId&&backendContext.engagementRecipientHasCapability(recipient,"engagements.club.manage")),
      entries:competition=>{
        if(!entryPromises.has(competition.id))entryPromises.set(competition.id,require("./nap-admin-entries").readAdminEntries(pool,{competitionId:competition.id,competition},()=>{},{category:backendContext.ageCategoryFromDates}));
        return entryPromises.get(competition.id);
      },
      hasParticipants:backendContext.engagementClubEntryHasParticipants,clubPdf:backendContext.buildEngagementClubRecapPdf,
      txt:(competition,entries,clubs)=>require('./nap-notification-txt').build(competition,entries,clubs,{
        pool,poolTxt:backendContext.buildEngagementCompetitionTxt,category:backendContext.engagementTxtSwimmerCategory,
        fileName:event=>`engagements-winpalme-${backendContext.engagementPdfFileName(event.name || event.id)}.txt`
      }),
      officialsPdf:(competition,entries)=>backendContext.buildEngagementOfficialsPdf(competition,backendContext.engagementOfficialsPdfRows(entries)),
      mail:(kind,competition,recipient,details)=>{
        const email=backendContext.normalizeEmail(recipient.email);
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw new TypeError('Adresse de destinataire invalide : corrigez le contact avant de reprendre.');
        const type=kind==='opening'?'opening_notification':kind==='documents'?'competition_documents':kind==='club_recap'?'club_recap_pdf':kind;
        const subject=kind==='opening'?backendContext.engagementOpeningMailSubject(competition):kind==='documents'?backendContext.engagementCompetitionDocumentMailSubject(competition,details.documents):kind==='club_recap'?backendContext.engagementClubRecapMailSubject(competition,details.entry):kind==='entries_txt'?backendContext.engagementTxtMailSubject(competition):backendContext.engagementOfficialsMailSubject(competition);
        const text=kind==='opening'?backendContext.engagementOpeningMailText(competition):kind==='documents'?backendContext.engagementCompetitionDocumentMailText(competition,details.documents):kind==='club_recap'?backendContext.engagementClubRecapMailText(competition,details.entry):kind==='entries_txt'?backendContext.engagementTxtMailText(competition,details):backendContext.engagementOfficialsMailText(competition,details);
        return {type,competitionId:competition.id,competitionName:competition.name,competitionRegionId:String(competition.regionId||''),
          recipientRegionId:String(recipient.napClubRegionId||''),clubId:String(recipient.clubId||''),toEmail:email,recipientUid:String(recipient.uid||''),subject,textBody:text,attachments:details.attachments||[]};
      },
      job:(event,competition,payload,now)=>{
        const data={...payload,notificationId:`${event.operation}:${Number(event.generation||0)}`,source:'nap',simulation,
          status:simulation?'disabled':'ready',reason:simulation?'test-emails-disabled':'',
          notificationDueAt:event.automatic?event.deadline:event.createdAt,
          notificationEvent:{kind:event.kind,cycleKey:event.cycleKey,closureKey:event.closureKey,automatic:event.automatic},
          createdAt:now,updatedAt:now,sentAt:''};
        return {...data,id:payload.deliveryMode==='bcc-v1'?require('./nap-notification-automation').hash([
          'bcc-v1',data.type,data.competitionId,data.notificationId,data.clubId,payload.recipients.map(item=>item.email)
        ]).slice(0,40):backendContext.engagementMailJobId(data)};
      }
    };
    services.page=(event,competition)=>require("./nap-notification-pages").page(event,competition,services);
    return services;
  }

  function nativeNotificationTaskServices() {
    const services=nativeNotificationAutomationServices(false);
    services.projectId=backendContext.ENVIRONMENT.projectId;
    services.enqueue=(data,options)=>require('firebase-admin/functions').getFunctions().taskQueue(`locations/${backendContext.REGION}/functions/processNapNotificationTask`).enqueue(data,options);
    services.warn=message=>console.warn(message);
    services.deliver=async ref=>{
      // No transport is created on TEST, regardless of the national switch.
      if(backendContext.ENVIRONMENT.projectId!=='livepalmes')return {done:true,sent:0};
      const config=backendContext.engagementMailSmtpConfig();
      if(!config.ready)throw new TypeError('Configuration des mails indisponible.');
      const event=(await ref.get()).data(),competition=await services.competition(event.competitionId);
      const transporter=backendContext.nodemailer.createTransport({...config.transport,pool:true,maxConnections:1,maxMessages:100,maxRequeues:0,
        connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000});
      try{return await require('./nap-bcc-delivery').drain(backendContext.db,ref,{
        projectId:backendContext.ENVIRONMENT.projectId,fromEmail:config.fromEmail,send:mail=>transporter.sendMail(mail),attachments:backendContext.engagementMailAttachments,
        content:job=>{
          const footer=`\n\nVous pouvez gérer les notifications email dans la rubrique Mon compte :\n${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#mon-compte`;
          const text=String(job.textBody||'').slice(0,5000)+(['opening_notification','competition_documents','club_recap_pdf'].includes(job.type)?footer:'');
          return {text,html:backendContext.livePalmesMailHtml(text)};
        },
        eligible:(job,item,snapshot)=>{
          if(['entries_txt','officials_pdf'].includes(job.type))return !item.uid&&backendContext.normalizeEmail(item.email)===backendContext.normalizeEmail(job.type==='entries_txt'?competition.computerEmail:competition.officialsManagerEmail);
          const user=snapshot?.data();
          if(!user||user.status!=='active')return false;
          const recipient={...backendContext.engagementMailRecipientFromUserDoc(snapshot),napClubRegionId:item.recipientRegionId};
          if(recipient.email!==item.email||String(recipient.clubId)!==item.clubId||!recipient.competitionNotificationsEnabled)return false;
          if(job.type==='club_recap_pdf')return item.clubId===job.clubId&&backendContext.engagementRecipientHasCapability(recipient,'engagements.club.manage');
          return services.select(job.type==='opening_notification'?'opening':'documents',[recipient],competition,event).length===1;
        }
      });}finally{transporter.close();}
    };
    return services;
  }

  async function enqueueNativeNotificationTask(eventId) {
    const result=await require('./nap-notification-task').enqueue(backendContext.db,eventId,nativeNotificationTaskServices());
    if(result.queued===false)throw new Error('Programmation de la notification a reprendre.');
    return result;
  }

  async function deliverNativeNotificationJobs(competitionId = '') {
    const control=require('./engagement-mail-control');
    if(!(await control.read(backendContext.db)).enabled)return {processed:0,sent:0};
    const config=backendContext.engagementMailSmtpConfig();
    if(!config.ready)throw new TypeError('Configuration des mails indisponible.');
    const transporter=backendContext.nodemailer.createTransport({...config.transport,pool:true,maxConnections:1,maxMessages:100,
      maxRequeues:0,connectionTimeout:15000,greetingTimeout:15000,socketTimeout:30000});
    try {
      return await require('./nap-mail-delivery').drain(backendContext.db,{projectId:backendContext.ENVIRONMENT.projectId,competitionId,
        send:doc=>backendContext.sendEngagementMailJob(transporter,doc,config,{uid:'nap-notification-automation',email:''})});
    } finally { transporter.close(); }
  }

  async function armNativeCompetitionNotification(context,input,operation) {
    const patch=input.patch||{};
    if(!['entryStatus','entryDeadlineAt','entryDeadlineLocal'].some(key=>Object.hasOwn(patch,key)))return;
    const competition=await nativePortalCompetition(input.competitionId,event=>assertCanManageEngagementCompetition(context,event));
    const journal=await backendContext.db.collection('auditLogs').doc(`nap-competition-${operation}-before`).get();
    if(!journal.exists)throw new TypeError('Sauvegarde de notification introuvable.');
    const requested=journal.data()?.target?.notificationOpeningRequested===true;
    const automation=require('./nap-notification-automation'),id=String(require('./nap-direct-calendar').positiveId(competition.id));
    await automation.arm(backendContext.db,{competitionId:id,operation,deliveryMode:'bcc-v1',
      action:competition.entryStatus,deadline:competition.entryDeadlineAt,openingRequested:requested,actorUid:context.uid,newCycle:requested});
    for(const kind of competition.entryStatus==='open'?['opening','closure']:competition.entryStatus==='closed'?['closure']:[])
      await enqueueNativeNotificationTask(automation.eventRef(backendContext.db,id,operation,kind).id);
  }

  async function queueNativeDocumentNotification(request) {
    const preview=await nativeNotificationPreview(request,'documents');
    const context=await backendContext.engagementAccessContext(request);
    const competition=await nativePortalCompetition(request.data?.competitionId||request.data?.calendarEventId,event=>assertCanManageEngagementCompetition(context,event));
    const ids=request.data?.documentIds;
    if(!Array.isArray(ids)||!ids.length||ids.length>20)throw new backendContext.HttpsError('invalid-argument','Documents a notifier requis.');
    const documents=competition.clubDocuments.filter(document=>ids.includes(document.id));
    if(documents.length!==new Set(ids).size)throw new backendContext.HttpsError('failed-precondition','Les documents ont change. Rechargez la fiche.');
    const automation=require('./nap-notification-automation');
    const mailState=await require('./engagement-mail-control').read(backendContext.db);
    const queued=await automation.armDocuments(backendContext.db,{competitionId:String(require('./nap-direct-calendar').positiveId(competition.id)),
      action:'documents',documentIds:ids,controlRevision:mailState.revision,actorUid:context.uid,operation:automation.hash(['documents-v1',competition.id,context.uid,documents])});
    await enqueueNativeNotificationTask(queued.eventId);
    return {...preview,previewOnly:false,queued:true,notificationAt:queued.runAt,groupingMinutes:5};
  }

  async function prepareEngagementClubRecapEmailJobs(db, competitionSnapshot, options = {}) {
    const competition = backendContext.engagementCompetitionDetailItem(competitionSnapshot);
    const competitionId = backendContext.cleanText(competition.id).slice(0, 128);
    const recipientsByClub = backendContext.engagementRecipientsByClub(backendContext.engagementCompetitionNotificationRecipients(
      await backendContext.engagementActiveClubMailRecipients(db)
    ));
    const entriesSnapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    const now = new Date().toISOString();
    const jobs = [];
    let skippedClubCount = 0;
    let pdfGeneratedCount = 0;
    let pdfReusedCount = 0;
    let errorCount = 0;
    const errors = [];
    for (const entryDoc of entriesSnapshot.docs) {
      const entry = backendContext.engagementClubEntryItem(entryDoc);
      const recipients = recipientsByClub.get(entry.clubId) || [];
      if (!entry.clubId || !entry.teamLeaderComplete || !backendContext.engagementClubEntryHasParticipants(entry) || !recipients.length) {
        skippedClubCount += 1;
        continue;
      }
      let pdf = null;
      try {
        pdf = await backendContext.getOrCreateEngagementClubRecapPdf(competitionSnapshot, entryDoc, {
          force: options.forcePdf === true
        });
      } catch (error) {
        errorCount += 1;
        errors.push({
          clubId: entry.clubId,
          clubName: entry.clubName,
          message: backendContext.cleanText(error?.message || error).slice(0, 220)
        });
        continue;
      }
      if (pdf.fromStorage) pdfReusedCount += 1;
      else pdfGeneratedCount += 1;
      for (const recipient of recipients) {
        const job = await backendContext.upsertEngagementMailJob({
          type: "club_recap_pdf",
          competitionId,
          competitionName: competition.name,
          clubId: entry.clubId,
          clubName: entry.clubName,
          regionId: entry.regionId,
          toEmail: recipient.email,
          toName: [recipient.firstName, recipient.lastName].filter(Boolean).join(" "),
          recipientUid: recipient.uid,
          subject: backendContext.engagementClubRecapMailSubject(competition, entry),
          text: backendContext.engagementClubRecapMailText(competition, entry),
          attachments: [{
            type: "clubRecapPdf",
            fileName: pdf.document?.fileName || pdf.fileName,
            contentType: "application/pdf",
            storagePath: pdf.document?.storagePath
          }]
        }, now);
        if (job) jobs.push(job);
      }
    }
    if (jobs.length || errorCount) {
      await db.collection("engagementCompetitions").doc(competitionId).set({
        documents: {
          clubRecapEmails: {
            status: jobs.length ? "generated" : "pending",
            generatedAt: now,
            updatedAt: now,
            jobCount: jobs.length,
            errorCount
          }
        }
      }, { merge: true });
    }
    return {
      competitionId,
      clubEntryCount: entriesSnapshot.size,
      skippedClubCount,
      jobCount: jobs.length,
      pdfGeneratedCount,
      pdfReusedCount,
      errorCount,
      mailStatus: backendContext.engagementMailPreparedStatus(),
      errors,
      jobs
    };
  }

  async function prepareEngagementTxtEmailJob(db, competitionSnapshot, options = {}) {
    const competition = backendContext.engagementCompetitionDetailItem(competitionSnapshot);
    const competitionId = backendContext.cleanText(competition.id).slice(0, 128);
    if (backendContext.cleanEngagementCompetitionType(competition.competitionType) === "openWater") {
      return {
        competitionId,
        entryCount: 0,
        jobCount: 0,
        errorCount: 0,
        generatedAt: "",
        skippedReason: "open_water_export_pending",
        errors: [],
        generatedFiles: backendContext.cleanEngagementGeneratedFiles(competition.generatedFiles || [])
      };
    }
    const computerEmail = backendContext.normalizeEmail(competition.computerEmail);
    const now = new Date().toISOString();
    if (!computerEmail) {
      return {
        competitionId,
        jobCount: 0,
        errorCount: 1,
        errors: [{
          message: "Email du responsable informatique non renseigne."
        }],
        generatedFiles: backendContext.cleanEngagementGeneratedFiles(competition.generatedFiles || [])
      };
    }
    const entriesSnapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    const txt = await backendContext.getOrCreateEngagementCompetitionTxt(competitionSnapshot, entriesSnapshot.docs, {
      force: options.forceTxt === true
    });
    const job = await backendContext.upsertEngagementMailJob({
      type: "entries_txt",
      competitionId,
      competitionName: competition.name,
      clubId: "informatique",
      clubName: "Informatique competition",
      regionId: competition.regionId,
      toEmail: computerEmail,
      toName: "Responsable informatique",
      subject: backendContext.engagementTxtMailSubject(competition),
      text: backendContext.engagementTxtMailText(competition, txt),
      attachments: [{
        type: "entriesTxt",
        fileName: txt.document?.fileName || txt.fileName,
        contentType: "text/plain; charset=utf-8",
        storagePath: txt.document?.storagePath
      }]
    }, now);
    await db.collection("engagementCompetitions").doc(competitionId).set({
      documents: {
        entriesTxt: {
          status: "generated",
          generatedAt: txt.generatedAt,
          updatedAt: now,
          jobCount: job ? 1 : 0
        }
      }
    }, { merge: true });
    return {
      competitionId,
      entryCount: txt.entryCount,
      jobCount: job ? 1 : 0,
      errorCount: 0,
      mailStatus: backendContext.engagementMailPreparedStatus(),
      generatedAt: txt.generatedAt,
      generatedFiles: txt.generatedFiles,
      txtFileName: txt.fileName,
      txtFromStorage: txt.fromStorage,
      jobs: job ? [job] : []
    };
  }

  async function prepareEngagementOfficialsEmailJob(db, competitionSnapshot, options = {}) {
    const competition = backendContext.engagementCompetitionDetailItem(competitionSnapshot);
    const competitionId = backendContext.cleanText(competition.id).slice(0, 128);
    if (competition.officialsRequired !== true) {
      return {
        competitionId,
        jobCount: 0,
        errorCount: 0,
        officialCount: 0,
        personLookupReadCount: 0,
        skippedReason: "officials_not_required"
      };
    }
    const officialsManagerEmail = backendContext.normalizeEmail(competition.officialsManagerEmail);
    if (!officialsManagerEmail) {
      return {
        competitionId,
        jobCount: 0,
        errorCount: 1,
        officialCount: 0,
        personLookupReadCount: 0,
        errors: [{ message: "Email du responsable juge non renseigne." }]
      };
    }
    const entriesSnapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    const pdf = await backendContext.getOrCreateEngagementOfficialsPdf(db, competitionSnapshot, entriesSnapshot.docs, {
      force: options.forcePdf === true
    });
    const now = new Date().toISOString();
    const job = await backendContext.upsertEngagementMailJob({
      type: "officials_pdf",
      competitionId,
      competitionName: competition.name,
      clubId: "jury",
      clubName: "Jury compétition",
      regionId: competition.regionId,
      toEmail: officialsManagerEmail,
      toName: "Responsable juge",
      subject: backendContext.engagementOfficialsMailSubject(competition),
      text: backendContext.engagementOfficialsMailText(competition, pdf),
      attachments: [{
        type: "officialsPdf",
        fileName: pdf.document?.fileName || pdf.fileName,
        contentType: "application/pdf",
        storagePath: pdf.document?.storagePath
      }]
    }, now);
    await db.collection("engagementCompetitions").doc(competitionId).set({
      documents: {
        officialsEmail: {
          status: "generated",
          generatedAt: pdf.generatedAt,
          updatedAt: now,
          jobCount: job ? 1 : 0
        }
      }
    }, { merge: true });
    return {
      competitionId,
      jobCount: job ? 1 : 0,
      errorCount: 0,
      officialCount: pdf.officialCount,
      personLookupReadCount: pdf.personLookupReadCount,
      mailStatus: backendContext.engagementMailPreparedStatus(),
      generatedAt: pdf.generatedAt,
      pdfFileName: pdf.fileName,
      pdfFromStorage: pdf.fromStorage,
      jobs: job ? [job] : []
    };
  }

  async function sendEngagementPreparedEmailJobs(db, competitionSnapshot, context = {}, options = {}) {
    const competitionId = backendContext.cleanText(competitionSnapshot.id).slice(0, 128);
    const requestedType = backendContext.cleanText(options.type).slice(0, 80);
    const limit = Math.max(1, Math.min(Number(options.limit || 500) || 500, 500));
    const config = backendContext.engagementMailSmtpConfig();
    if (!config.ready) {
      throw new backendContext.HttpsError(
        "failed-precondition",
        "Configuration mail SMTP incomplete."
      );
    }
    const snapshot = await db.collection(backendContext.ENGAGEMENT_MAIL_JOBS_COLLECTION)
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    let eligibleRecapClubIds = null;
    if (requestedType === "club_recap_pdf") {
      const entriesSnapshot = await db.collection("engagementClubEntries")
        .where("competitionId", "==", competitionId)
        .limit(500)
        .get();
      eligibleRecapClubIds = new Set(entriesSnapshot.docs
        .map((doc) => backendContext.engagementClubEntryItem(doc))
        .filter((entry) => entry.teamLeaderComplete && backendContext.engagementClubEntryHasParticipants(entry))
        .map((entry) => entry.clubId));
    }
    const pendingDocs = snapshot.docs
      .filter((doc) => {
        const data = doc.data() || {};
        const status = backendContext.cleanText(data.status);
        if (requestedType && backendContext.cleanText(data.type) !== requestedType) return false;
        return status === "ready" || status === "blocked_missing_config" || status === "failed";
      });
    const notificationCapabilities = requestedType === "club_recap_pdf"
      ? ["engagements.club.manage"]
      : backendContext.ENGAGEMENT_MAIL_CAPABILITIES;
    const enabledNotificationUids = pendingDocs.some((doc) => backendContext.OPTIONAL_COMPETITION_MAIL_TYPES.has(backendContext.cleanText(doc.data()?.type)))
      ? new Set(backendContext.engagementCompetitionNotificationRecipients(await backendContext.engagementActiveMailRecipients(db, notificationCapabilities))
          .map((recipient) => backendContext.cleanText(recipient.uid))
          .filter(Boolean))
      : null;
    const notificationsDisabledDocs = enabledNotificationUids
      ? pendingDocs.filter((doc) => {
          const data = doc.data() || {};
          const recipientUid = backendContext.cleanText(data.recipientUid);
          return backendContext.OPTIONAL_COMPETITION_MAIL_TYPES.has(backendContext.cleanText(data.type)) && recipientUid && !enabledNotificationUids.has(recipientUid);
        })
      : [];
    const noParticipantsDocs = eligibleRecapClubIds
      ? pendingDocs.filter((doc) => !eligibleRecapClubIds.has(backendContext.cleanText(doc.data()?.clubId)))
      : [];
    const cancelledDocs = [...new Map([...notificationsDisabledDocs, ...noParticipantsDocs].map((doc) => [doc.id, doc])).values()];
    if (cancelledDocs.length) {
      const now = new Date().toISOString();
      const batch = db.batch();
      cancelledDocs.forEach((doc) => {
        const notificationsDisabled = notificationsDisabledDocs.some((item) => item.id === doc.id);
        batch.set(doc.ref, {
          status: notificationsDisabled ? "cancelled_notifications_disabled" : "cancelled_no_participants",
          updatedAt: now,
          cancelledAt: now
        }, { merge: true });
      });
      await batch.commit();
    }
    const candidates = pendingDocs
      .filter((doc) => !eligibleRecapClubIds || eligibleRecapClubIds.has(backendContext.cleanText(doc.data()?.clubId)))
      .filter((doc) => !notificationsDisabledDocs.some((item) => item.id === doc.id))
      .sort((left, right) =>
        backendContext.cleanText(left.data()?.updatedAt).localeCompare(backendContext.cleanText(right.data()?.updatedAt)) ||
        backendContext.cleanText(left.data()?.toEmail).localeCompare(backendContext.cleanText(right.data()?.toEmail))
      )
      .slice(0, limit);
    const transporter = backendContext.nodemailer.createTransport(config.transport);
    const jobs = [];
    let sentCount = 0;
    let errorCount = 0;
    for (const doc of candidates) {
      const job = await backendContext.sendEngagementMailJob(transporter, doc, config, context);
      if (job.status === "sent") sentCount += 1;
      else if (job.status === "failed") errorCount += 1;
      jobs.push(job);
    }
    if ((requestedType === "club_recap_pdf" || requestedType === "entries_txt" || requestedType === "officials_pdf") && candidates.length) {
      const now = new Date().toISOString();
      await db.collection("engagementCompetitions").doc(competitionId).set({
        documents: requestedType === "entries_txt"
          ? {
              entriesTxt: {
                status: sentCount === candidates.length && !errorCount ? "sent" : "generated",
                generatedAt: now,
                updatedAt: now,
                attemptedCount: candidates.length,
                sentCount,
                errorCount
              }
            }
          : requestedType === "officials_pdf"
            ? {
                officialsEmail: {
                  status: sentCount === candidates.length && !errorCount ? "sent" : "generated",
                  generatedAt: now,
                  updatedAt: now,
                  attemptedCount: candidates.length,
                  sentCount,
                  errorCount
                }
              }
            : {
              clubRecapEmails: {
                status: sentCount === candidates.length && !errorCount ? "sent" : "generated",
                generatedAt: now,
                updatedAt: now,
                attemptedCount: candidates.length,
                sentCount,
                errorCount
              }
            }
      }, { merge: true });
    }
    return {
      competitionId,
      attemptedCount: candidates.length,
      sentCount,
      errorCount,
      jobs
    };
  }

  function engagementClosureAutomationContext() {
    return {
      uid: "system:engagementClosureScheduler",
      email: "livepalmes@nap-ffessm.fr",
      national: true,
      region: true,
      regionId: ""
    };
  }

  async function reserveEngagementCompetitionClosure(db, competitionRef, now) {
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(competitionRef);
      if (!snapshot.exists) {
        return { reserved: false, reason: "not-found" };
      }
      const data = snapshot.data() || {};
      if (data.qualificationJobId) return { reserved: false, reason: "qualification-control" };
      const entryStatus = backendContext.cleanEngagementEntryStatus(data.entryStatus || data.status);
      const deadline = backendContext.cleanIsoDateTime(data.entryDeadlineAt);
      if (entryStatus !== "open") {
        return { reserved: false, reason: "not-open" };
      }
      if (!deadline || deadline > now) {
        return { reserved: false, reason: "deadline-not-reached" };
      }
      transaction.set(competitionRef, {
        entryStatus: "closed",
        closureAutomationStatus: "processing",
        closureAutomationStartedAt: now,
        closureAutomationLastAttemptAt: now,
        closureAutomationAttemptCount: backendContext.FieldValue.increment(1),
        updatedAt: now,
        updatedBy: "system:engagementClosureScheduler"
      }, { merge: true });
      return {
        reserved: true,
        competition: backendContext.engagementCompetitionDetailItem({
          id: snapshot.id,
          data: () => ({ ...data, entryStatus: "closed" })
        })
      };
    });
  }

  async function processEngagementCompetitionAutomaticClosure(db, competitionSnapshot, now) {
    const context = engagementClosureAutomationContext();
    const competitionRef = competitionSnapshot.ref;
    const reservation = await reserveEngagementCompetitionClosure(db, competitionRef, now);
    if (!reservation.reserved) {
      return {
        competitionId: competitionSnapshot.id,
        skipped: true,
        reason: reservation.reason
      };
    }
    const closedSnapshot = await competitionRef.get();
    try {
      const preparation = await prepareEngagementClubRecapEmailJobs(db, closedSnapshot, {
        forcePdf: false
      });
      const txtPreparation = await prepareEngagementTxtEmailJob(db, closedSnapshot, {
        forceTxt: false
      });
      const officialsPreparation = await prepareEngagementOfficialsEmailJob(db, closedSnapshot, {
        forcePdf: false
      });
      const sendResult = preparation.jobCount
        ? await sendEngagementPreparedEmailJobs(db, closedSnapshot, context, {
            type: "club_recap_pdf",
            limit: 500
          })
        : {
            competitionId: closedSnapshot.id,
            attemptedCount: 0,
            sentCount: 0,
            errorCount: 0,
            jobs: []
          };
      const txtSendResult = txtPreparation.jobCount
        ? await sendEngagementPreparedEmailJobs(db, closedSnapshot, context, {
            type: "entries_txt",
            limit: 10
          })
        : {
            competitionId: closedSnapshot.id,
            attemptedCount: 0,
            sentCount: 0,
            errorCount: 0,
            jobs: []
          };
      const officialsSendResult = officialsPreparation.jobCount
        ? await sendEngagementPreparedEmailJobs(db, closedSnapshot, context, {
            type: "officials_pdf",
            limit: 10
          })
        : {
            competitionId: closedSnapshot.id,
            attemptedCount: 0,
            sentCount: 0,
            errorCount: 0,
            jobs: []
          };
      const completedAt = new Date().toISOString();
      const status = preparation.errorCount || txtPreparation.errorCount || officialsPreparation.errorCount || sendResult.errorCount || txtSendResult.errorCount || officialsSendResult.errorCount
        ? "completed_with_errors"
        : "completed";
      await competitionRef.set({
        closureAutomationStatus: status,
        closureAutomationCompletedAt: completedAt,
        closureRecapEmailsPreparedAt: preparation.jobCount ? completedAt : "",
        closureRecapEmailsSentAt: sendResult.attemptedCount ? completedAt : "",
        closureAutomationSummary: backendContext.cleanFirestoreValue({
          clubEntryCount: preparation.clubEntryCount,
          skippedClubCount: preparation.skippedClubCount,
          jobCount: preparation.jobCount,
          pdfGeneratedCount: preparation.pdfGeneratedCount,
          pdfReusedCount: preparation.pdfReusedCount,
          txtGeneratedCount: txtPreparation.generatedAt ? 1 : 0,
          txtMailJobCount: txtPreparation.jobCount,
          officialsPdfGeneratedCount: officialsPreparation.generatedAt ? 1 : 0,
          officialsMailJobCount: officialsPreparation.jobCount,
          officialCount: officialsPreparation.officialCount,
          officialsPersonLookupReadCount: officialsPreparation.personLookupReadCount,
          prepareErrorCount: Number(preparation.errorCount || 0) + Number(txtPreparation.errorCount || 0) + Number(officialsPreparation.errorCount || 0),
          attemptedMailCount: Number(sendResult.attemptedCount || 0) + Number(txtSendResult.attemptedCount || 0) + Number(officialsSendResult.attemptedCount || 0),
          sentMailCount: Number(sendResult.sentCount || 0) + Number(txtSendResult.sentCount || 0) + Number(officialsSendResult.sentCount || 0),
          sendErrorCount: Number(sendResult.errorCount || 0) + Number(txtSendResult.errorCount || 0) + Number(officialsSendResult.errorCount || 0),
          txtAttemptedMailCount: txtSendResult.attemptedCount,
          txtSentMailCount: txtSendResult.sentCount,
          txtSendErrorCount: txtSendResult.errorCount,
          officialsAttemptedMailCount: officialsSendResult.attemptedCount,
          officialsSentMailCount: officialsSendResult.sentCount,
          officialsSendErrorCount: officialsSendResult.errorCount,
          updatedAt: completedAt
        }),
        updatedAt: completedAt,
        updatedBy: context.uid
      }, { merge: true });
      await backendContext.writeAuditLog("engagementCompetition.closedAutomatically", context.uid, {
        competitionId: closedSnapshot.id,
        closureAutomationStatus: status,
        clubEntryCount: preparation.clubEntryCount,
        skippedClubCount: preparation.skippedClubCount,
        jobCount: preparation.jobCount,
        pdfGeneratedCount: preparation.pdfGeneratedCount,
        pdfReusedCount: preparation.pdfReusedCount,
        txtGeneratedCount: txtPreparation.generatedAt ? 1 : 0,
        txtMailJobCount: txtPreparation.jobCount,
        officialsPdfGeneratedCount: officialsPreparation.generatedAt ? 1 : 0,
        officialsMailJobCount: officialsPreparation.jobCount,
        officialCount: officialsPreparation.officialCount,
        officialsPersonLookupReadCount: officialsPreparation.personLookupReadCount,
        prepareErrorCount: Number(preparation.errorCount || 0) + Number(txtPreparation.errorCount || 0) + Number(officialsPreparation.errorCount || 0),
        attemptedMailCount: Number(sendResult.attemptedCount || 0) + Number(txtSendResult.attemptedCount || 0) + Number(officialsSendResult.attemptedCount || 0),
        sentMailCount: Number(sendResult.sentCount || 0) + Number(txtSendResult.sentCount || 0) + Number(officialsSendResult.sentCount || 0),
        sendErrorCount: Number(sendResult.errorCount || 0) + Number(txtSendResult.errorCount || 0) + Number(officialsSendResult.errorCount || 0),
        txtAttemptedMailCount: txtSendResult.attemptedCount,
        txtSentMailCount: txtSendResult.sentCount,
        txtSendErrorCount: txtSendResult.errorCount,
        officialsAttemptedMailCount: officialsSendResult.attemptedCount,
        officialsSentMailCount: officialsSendResult.sentCount,
        officialsSendErrorCount: officialsSendResult.errorCount
      });
      return {
        competitionId: closedSnapshot.id,
        skipped: false,
        status,
        preparation,
        txtPreparation,
        officialsPreparation,
        sendResult,
        txtSendResult,
        officialsSendResult
      };
    } catch (error) {
      const failedAt = new Date().toISOString();
      await competitionRef.set({
        closureAutomationStatus: "failed",
        closureAutomationFailedAt: failedAt,
        closureAutomationReason: backendContext.cleanText(error?.message || error).slice(0, 220),
        updatedAt: failedAt,
        updatedBy: context.uid
      }, { merge: true });
      await backendContext.writeAuditLog("engagementCompetition.automaticClosureFailed", context.uid, {
        competitionId: closedSnapshot.id,
        message: backendContext.cleanText(error?.message || error).slice(0, 220)
      });
      return {
        competitionId: closedSnapshot.id,
        skipped: false,
        status: "failed",
        error: backendContext.cleanText(error?.message || error).slice(0, 220)
      };
    }
  }

  async function resolveEngagementClubPersonSwimmer(db, context = {}, rawPerson = {}) {
    const swimmerIndexId = backendContext.cleanText(rawPerson.swimmerIndexId).slice(0, 80);
    if (!swimmerIndexId) return null;
    const swimmerSource = backendContext.cleanText(rawPerson.swimmerSource || rawPerson.source || "performances").slice(0, 40) || "performances";
    const rosterSnapshot = await backendContext.engagementClubRosterRef(db, context.clubId).get();
    if (!rosterSnapshot.exists) {
      throw new backendContext.HttpsError("failed-precondition", "Chargez d'abord les nageurs du club.");
    }
    const swimmer = backendContext.engagementClubRosterSwimmersFromData(rosterSnapshot.data() || {}).find((candidate) =>
      candidate.swimmerIndexId === swimmerIndexId && backendContext.cleanText(candidate.source || "performances") === swimmerSource
    );
    if (!swimmer || swimmer.clubId !== context.clubId || swimmer.active === false) {
      throw new backendContext.HttpsError("permission-denied", "Nageur hors perimetre club ou inactif.");
    }
    return swimmer;
  }

  async function saveNativeClubOfficials(context,request) {
    try {
      const result=await require("./nap-official-entry-change").saveNativeOfficials(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
        competitionId:request.data?.competitionId,clubId:String(context.clubId),actorUid:context.uid,
        officialPersonIds:request.data?.officialPersonIds,expectedFingerprint:request.data?.expectedFingerprint,mutationId:request.data?.mutationId
      },{
        authorize:({clubId})=>{if(String(clubId)!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");},
        audit:{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-official-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-official-${operation}-before`).create({action:"nap.officialEntry.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubEntry.officialsSaved",context.uid,{...target,auditPreparationId:`nap-official-${operation}-before`},operation)
        }
      });
      const competition=require("./nap-portal-workspaces").competitionItem(result.competition,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
      return {ok:true,source:"nap",operation:result.operation,writesExecuted:result.writesExecuted,
        entry:await nativeClubEntryView(result.nativeEntry,context,competition),sqlBudget:{queriesMax:33,writesMax:2}};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError || error instanceof TypeError?error.message:"Enregistrement NAP a verifier. Reprenez la meme selection ; la sauvegarde est conservee.");
    }
  }

  return {
    cleanEngagementCompetitionPayload,
    assertCanManageEngagementCompetition,
    engagementParisIsoDate,
    engagementEventIsPast,
    assertCanModifyEngagementEvent,
    assertCanDeleteEngagementDocument,
    engagementDeletionRequestId,
    engagementClubWriteLockReason,
    assertEngagementClubWriteOpen,
    nativePortalCalendarItems,
    nativeDocumentAuthors,
    nativePortalCompetition,
    createNativePortalCalendarRecord,
    nativeClubEntryView,
    engagementCompetitionDocumentUploader,
    assertEngagementCompetitionDocumentPath,
    hasManagedEngagementCompetitionDocumentStorage,
    engagementCompetitionDocumentContext,
    nationalLibraryContext,
    manageNationalLibraryDocuments,
    notifyNationalLibraryDocument,
    mutateNativeCompetitionDocument,
    generateNativeClubRecapPdf,
    nativeAdminCompetitionEntries,
    nativeNotificationPreview,
    nativeNotificationAutomationServices,
    nativeNotificationTaskServices,
    enqueueNativeNotificationTask,
    deliverNativeNotificationJobs,
    armNativeCompetitionNotification,
    queueNativeDocumentNotification,
    prepareEngagementClubRecapEmailJobs,
    prepareEngagementTxtEmailJob,
    prepareEngagementOfficialsEmailJob,
    sendEngagementPreparedEmailJobs,
    engagementClosureAutomationContext,
    reserveEngagementCompetitionClosure,
    processEngagementCompetitionAutomaticClosure,
    resolveEngagementClubPersonSwimmer,
    saveNativeClubOfficials
  };
}

module.exports = { createCompetitionService };
