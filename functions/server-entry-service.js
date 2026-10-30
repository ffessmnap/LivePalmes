// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createEntryService(backendContext) {
  async function buildEngagementClubSwimmersFromRequest(requestData = {}, context = {}, competitionData = {}) {
    const competitionId = backendContext.cleanText(requestData.competitionId || competitionData.id);
    const openWater = backendContext.cleanEngagementCompetitionType(competitionData.competitionType) === "openWater";
    const competitionEvents = backendContext.cleanEngagementCompetitionEvents(competitionData.events || [], {
      strict: false,
      competitionType: backendContext.cleanEngagementCompetitionType(competitionData.competitionType)
    });
    const competitionTimeRules = {
      id: competitionId,
      hasQualificationGrants: competitionData.hasQualificationGrants === true,
      qualificationPreview: competitionData.qualificationPreview === true,
      qualifications: competitionData.qualifications,
      events: competitionData.events,
      date: backendContext.cleanIsoDate(competitionData.date),
      poolLength: backendContext.cleanEngagementPoolLength(competitionData.poolLength),
      timingType: backendContext.cleanEngagementTimingType(competitionData.timingType),
      qualificationTimesMode: backendContext.cleanEngagementQualificationTimesMode(competitionData.qualificationTimesMode),
      qualificationStartDate: backendContext.cleanIsoDate(competitionData.qualificationStartDate),
      qualificationEndDate: backendContext.cleanIsoDate(competitionData.qualificationEndDate),
      missingEntryTimeMode: backendContext.cleanEngagementMissingEntryTimeMode(competitionData.missingEntryTimeMode)
    };
    const allowedIndividualEventCodes = new Set(
      competitionEvents.filter((event) => event.type === "individual").map((event) => event.code)
    );
    const maxEventsPerSwimmer = backendContext.cleanEngagementMaxEventsPerSwimmer(competitionData.maxEventsPerSwimmer);
    const requestedSwimmers = Array.isArray(requestData?.swimmers) ? requestData.swimmers : [];
    const uniqueSwimmers = [];
    const seen = new Set();
    requestedSwimmers.slice(0, 300).forEach((rawSwimmer) => {
      const swimmerIndexId = backendContext.cleanText(rawSwimmer?.swimmerIndexId).slice(0, 80);
      const requestedSource = backendContext.cleanText(rawSwimmer?.source);
      const source = requestedSource === "engagement"
        ? "engagement"
        : requestedSource === "reference"
          ? "reference"
          : "performances";
      const licenseNumber = backendContext.cleanText(rawSwimmer?.licenseNumber).toUpperCase().slice(0, 60);
      const individualEntries = backendContext.cleanEngagementEntryIndividualEntries(
        rawSwimmer?.individualEntries || rawSwimmer?.individualEventCodes || [],
        allowedIndividualEventCodes
      );
      if (!swimmerIndexId || seen.has(swimmerIndexId)) return;
      const requestedIndividualCodes = Array.isArray(rawSwimmer?.individualEventCodes)
        ? rawSwimmer.individualEventCodes.map((code) => backendContext.cleanText(code).toUpperCase().replace(/\s+/g, "")).filter(Boolean)
        : (Array.isArray(rawSwimmer?.individualEntries) ? rawSwimmer.individualEntries.map((entry) => backendContext.cleanText(entry?.eventCode || entry?.code).toUpperCase().replace(/\s+/g, "")).filter(Boolean) : []);
      if (requestedIndividualCodes.some((code) => !allowedIndividualEventCodes.has(code))) {
        throw new backendContext.HttpsError("invalid-argument", "Course individuelle non ouverte sur cette competition.");
      }
      if (maxEventsPerSwimmer > 0 && individualEntries.length > maxEventsPerSwimmer) {
        throw new backendContext.HttpsError("failed-precondition", `Maximum ${maxEventsPerSwimmer} course(s) individuelle(s) par nageur.`);
      }
      seen.add(swimmerIndexId);
      uniqueSwimmers.push({ swimmerIndexId, source, licenseNumber, individualEntries });
    });

    const referenceSwimmersById = new Map();
    backendContext.intranapSwimmersIndex.forEach((item) => {
      const swimmer = backendContext.engagementReferenceSwimmerItem(item);
      [
        item.id,
        item.swimmerId,
        ...(Array.isArray(item.aliases) ? item.aliases : []),
        ...(Array.isArray(item.sourceIds) ? item.sourceIds : [])
      ].map(backendContext.cleanText).filter(Boolean).forEach((id) => referenceSwimmersById.set(id, swimmer));
    });
    const firestoreSwimmers = uniqueSwimmers.filter((swimmer) => swimmer.source !== "reference");
    const firestoreRefs = firestoreSwimmers.map((swimmer) => backendContext.db
      .collection(swimmer.source === "engagement" ? "engagementClubSwimmers" : backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
      .doc(swimmer.swimmerIndexId));
    const requestedLicenseIds = Array.from(new Set(uniqueSwimmers.flatMap((requestedSwimmer) => {
      const referenceSwimmer = requestedSwimmer.source === "reference"
        ? referenceSwimmersById.get(requestedSwimmer.swimmerIndexId)
        : null;
      return [requestedSwimmer.swimmerIndexId, referenceSwimmer?.id].map(backendContext.cleanText).filter(Boolean);
    })));
    const licenseReads = [];
    for (let index = 0; index < requestedLicenseIds.length; index += 10) {
      licenseReads.push(backendContext.db.collection("engagementSwimmerLicenses")
        .where("swimmerIndexId", "in", requestedLicenseIds.slice(index, index + 10))
        .get());
    }
    const [firestoreDocs, licenseSnapshots] = await Promise.all([
      firestoreRefs.length ? backendContext.db.getAll(...firestoreRefs) : [],
      Promise.all(licenseReads)
    ]);
    const firestoreDocsByRequestedId = new Map();
    firestoreDocs.forEach((doc, index) => {
      const requestedSwimmer = firestoreSwimmers[index];
      if (!requestedSwimmer) return;
      firestoreDocsByRequestedId.set(`${requestedSwimmer.source}:${requestedSwimmer.swimmerIndexId}`, doc);
    });
    const knownLicenses = new Map();
    licenseSnapshots.flatMap((snapshot) => snapshot.docs).forEach((doc) => {
      if (backendContext.cleanText(doc.data()?.clubId) !== context.clubId) return;
      const license = backendContext.engagementSwimmerLicenseItem(doc);
      if (license.swimmerIndexId) knownLicenses.set(license.swimmerIndexId, license);
    });

    let swimmers = await Promise.all(uniqueSwimmers.map(async (requestedSwimmer) => {
      let swimmer = null;
      if (requestedSwimmer.source === "reference") {
        swimmer = referenceSwimmersById.get(requestedSwimmer.swimmerIndexId) || null;
      } else {
        const doc = firestoreDocsByRequestedId.get(`${requestedSwimmer.source}:${requestedSwimmer.swimmerIndexId}`);
        if (doc?.exists) {
          swimmer = requestedSwimmer.source === "engagement"
            ? backendContext.engagementNewSwimmerItem(doc)
            : backendContext.engagementClubSwimmerItem(doc);
        }
      }
      if (!swimmer) {
        throw new backendContext.HttpsError("invalid-argument", "Nageur inconnu dans la base LivePalmes.");
      }
      if (requestedSwimmer.source === "engagement" && swimmer.active === false) {
        throw new backendContext.HttpsError("failed-precondition", "Nageur desactive par le niveau national.");
      }
      if (swimmer.clubId !== context.clubId) {
        throw new backendContext.HttpsError("permission-denied", "Nageur hors perimetre club.");
      }
      const knownLicense = knownLicenses.get(swimmer.swimmerIndexId) || knownLicenses.get(requestedSwimmer.swimmerIndexId);
      const storedLicenseNumber = backendContext.cleanText(knownLicense?.licenseNumber || swimmer.licenseNumber).toUpperCase().slice(0, 60);
      if (storedLicenseNumber && requestedSwimmer.licenseNumber && storedLicenseNumber !== requestedSwimmer.licenseNumber) {
        throw new backendContext.HttpsError("failed-precondition", "Le numero de licence deja enregistre ne peut pas etre modifie par le club.");
      }
      const licenseNumber = storedLicenseNumber || requestedSwimmer.licenseNumber;
      if (backendContext.ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE && !licenseNumber) {
        throw new backendContext.HttpsError("invalid-argument", "Numero de licence obligatoire pour chaque nageur.");
      }
      if (licenseNumber && !backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
        throw new backendContext.HttpsError("invalid-argument", "Chaque licence doit respecter le format A-12-34567.");
      }
      const licenseVerificationStatus = storedLicenseNumber
        ? backendContext.cleanEngagementLicenseVerificationStatus(knownLicense?.verificationStatus || swimmer.licenseVerificationStatus, "pending")
        : "pending";
      const licenseSeason = storedLicenseNumber && knownLicense
        ? backendContext.engagementLicenseSeasonState(knownLicense)
        : backendContext.engagementLicenseSeasonState(swimmer);
      const individualEntries = openWater
        ? requestedSwimmer.individualEntries.map((entry) => ({ eventCode: entry.eventCode, status: "selected", entryTimeMode: "notRequired" }))
        : await backendContext.resolveEngagementIndividualEntriesForSwimmer(
            { ...swimmer, source: requestedSwimmer.source },
            requestedSwimmer.individualEntries,
            competitionTimeRules
          );
      return backendContext.cleanEngagementEntrySwimmer({
        ...swimmer,
        swimmerIndexId: swimmer.id,
        source: requestedSwimmer.source,
        licenseNumber,
        licenseVerificationStatus,
        licenseSeasonLabel: licenseSeason.label,
        licenseSeasonStatus: licenseSeason.status,
        licenseLocked: Boolean(storedLicenseNumber),
        individualEntries
      });
    }));
    if (!openWater && swimmers.some((swimmer) => swimmer.individualEntries.some((entry) => entry.entryTimeMode === "manual"))) {
      const recordsData = await backendContext.loadPerformanceRecordsData();
      swimmers = backendContext.validateEngagementIndividualEntryTimes(swimmers, competitionTimeRules, recordsData);
    }
    return swimmers;
  }

  function engagementEntryTimeStats(swimmers = []) {
    return swimmers.reduce((stats, swimmer) => {
      (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : []).forEach((entry) => {
        stats.total += 1;
        const mode = backendContext.cleanText(entry.entryTimeMode) || "missing";
        stats[mode] = (stats[mode] || 0) + 1;
        if (entry.entryTimeWarning) stats.warning += 1;
      });
      return stats;
    }, {
      total: 0,
      known: 0,
      manual: 0,
      default595999: 0,
      missing: 0,
      warning: 0
    });
  }

  async function nativeClubEntryTimeHistory(context, competitionId, swimmerIndexId, rawCodes) {
    const requestedCodes = new Set((Array.isArray(rawCodes) ? rawCodes : []).slice(0, 30)
      .map(value => backendContext.cleanText(value).toUpperCase().replace(/\s+/g, "")).filter(Boolean));
    try {
      const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const result = await require("./nap-entry-time-preview").previewNativeTimes(pool,
        { competitionId, clubId: String(context.clubId), swimmerIds: [swimmerIndexId], enrolledOnly: true, includeIndividualEntries: true }, {
          authorize: ({ clubId }) => { if (String(clubId) !== String(context.clubId)) throw new backendContext.HttpsError("permission-denied", "Dossier hors du club autorise."); },
          preview: (person, rows, nativeCompetition, dossier) => {
            const competition = require("./nap-portal-workspaces").competitionItem(nativeCompetition, backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
            if (!["manual", "default595999"].includes(competition.missingEntryTimeMode)) {
              throw new backendContext.HttpsError("failed-precondition", "La modification des temps n'est pas autorisee pour cette competition.");
            }
            const links = new Set(dossier.inscriptions.filter(row => String(row.nageur) === String(person.id)).map(row => String(row.id)));
            const savedCodes = [...new Set(dossier.individual.filter(row => links.has(String(row.engagement)))
              .map(row => backendContext.cleanText(row.course).toUpperCase().replace(/\s+/g, ""))
              .filter(code => code && (!requestedCodes.size || requestedCodes.has(code))))];
            return savedCodes.map(eventCode => ({ eventCode, times: backendContext.engagementKnownTimeHistory(rows, eventCode, competition, 2000) }));
          }
        });
      return { ok: true, source: "nap", swimmerIndexId, events: result.swimmers[0].individualEntries, sqlBudget: result.sqlBudget };
    } catch (error) {
      if (error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError ? "resource-exhausted" : error instanceof TypeError ? "failed-precondition" : "unavailable",
        error instanceof RangeError || error instanceof TypeError ? error.message : "Historique NAP momentanement indisponible. Aucun engagement modifie.");
    }
  }

  async function previewNativeClubEntryTimes(context,competitionId,swimmerIds,enrolledOnly) {
    try {
      const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      return await require("./nap-entry-time-preview").previewNativeTimes(pool,{competitionId,clubId:String(context.clubId),swimmerIds,enrolledOnly},{
        authorize:({clubId})=>{if(String(clubId)!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");},
        prepareQualifications:(connection,input)=>require("./nap-qualification-people").readEvaluations(connection,{...input,events:backendContext.qualificationEvents(require("./nap-portal-workspaces").competitionItem(input.pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE)),categoryFor:backendContext.ageCategoryFromDates}),
        preview:(person,rows,pack,dossier,evaluation)=>{
          const competition=require("./nap-portal-workspaces").competitionItem(pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
          return competition.events.filter(event=>event.type==="individual" && event.nativeRecognized && event.nativeCourses.some(course=>String(course.sexe)===String(person.sex)))
            .map(event=>require("./nap-entry-time-rules").resolveTime({eventCode:event.code},competition,{
              automatic:entry=>backendContext.automaticEngagementIndividualEntry(entry,rows,competition),
              parse:backendContext.parseEngagementEntryTime
            },true)).map(entry=>evaluation?{...entry,qualification:{...evaluation.courses[entry.eventCode],mode:evaluation.mode}}:entry);
        }
      });
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError ? "resource-exhausted" : error instanceof TypeError ? "failed-precondition" : "unavailable",error instanceof RangeError || error instanceof TypeError ? error.message : "Historique NAP momentanement indisponible. Aucun engagement modifie.");
    }
  }

  async function saveNativeClubIndividualEntries(context,request) {
    try {
      const swimmers=request.data?.swimmers;
      if(!Array.isArray(swimmers) || !swimmers.length || swimmers.length>100) throw new TypeError("Modification de 1 a 100 nageurs requise.");
      const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const result=await require("./nap-individual-entry-change").saveNativeIndividualEntries(pool,{
        competitionId:request.data?.competitionId,clubId:String(context.clubId),actorUid:context.uid,
        expectedFingerprint:request.data?.expectedFingerprint,mutationId:request.data?.mutationId,
        changes:swimmers.map(row=>({swimmerId:row?.swimmerIndexId,entries:row?.individualEntries}))
      },{
        authorize:({clubId})=>{if(String(clubId)!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");},
        resolve:async input=>{
          const rules=require("./nap-entry-course-rules"),reason=rules.courseLockReason(input.competition);
          if(reason) throw new TypeError(reason);
          const categories=await rules.readCategories(input.connection);
          return require("./nap-individual-entry-resolution").resolveChanges({...input,categories},{
            view:pack=>require("./nap-portal-workspaces").competitionItem(pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE),
            age:(date,birthDate)=>(backendContext.importSeasonYear(date)||backendContext.competitionYear(date))-backendContext.birthYear(birthDate),
            category:backendContext.ageCategoryFromDates,
            forbidden:(code,category)=>backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code]?.has(category)===true,
            automatic:backendContext.automaticEngagementIndividualEntry,parse:backendContext.parseEngagementEntryTime,
            prepareQualifications:(connection,input)=>require("./nap-qualification-people").readEvaluations(connection,{...input,events:backendContext.qualificationEvents(require("./nap-portal-workspaces").competitionItem(input.pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE)),categoryFor:backendContext.ageCategoryFromDates}),
            validateTimes:async(swimmers,competition)=>backendContext.validateEngagementIndividualEntryTimes(swimmers,competition,(await require("./nap-records-store").read(input.connection)).data)
          });
        },
        prepareEffects:require("./nap-qualification-entry-effects").prepare,
        afterSaved:require("./nap-qualification-entry-effects").apply,
        audit:{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-individual-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-individual-${operation}-before`).create({action:"nap.individualEntry.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubEntry.individualEntriesSaved",context.uid,{...target,auditPreparationId:`nap-individual-${operation}-before`},operation)
        }
      });
      const competition=require("./nap-portal-workspaces").competitionItem(result.competition,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
      return {ok:true,source:"nap",operation:result.operation,writesExecuted:result.writesExecuted,
        entry:await backendContext.nativeClubEntryView(result.nativeEntry,context,competition),
        sqlBudget:{queriesMax:40,writesMax:4}};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError || error instanceof TypeError?error.message:"Enregistrement NAP a verifier. Reprenez la meme modification ; la sauvegarde est conservee.");
    }
  }

  async function saveNativeClubSwimmerSelections(context,request,rawChanges) {
    try {
      if(!Array.isArray(rawChanges) || !rawChanges.length || rawChanges.length>50) throw new TypeError("Selection de 1 a 50 nageurs requise.");
      const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const result=await require("./nap-swimmer-entry-change").saveNativeSwimmerSelection(pool,{
        competitionId:request.data?.competitionId,clubId:String(context.clubId),actorUid:context.uid,
        expectedFingerprint:request.data?.expectedFingerprint,mutationId:request.data?.mutationId,
        changes:rawChanges.map(row=>({swimmerId:row?.swimmerIndexId || row?.swimmer?.swimmerIndexId,selected:row?.selected}))
      },{
        prepareEffects:require("./nap-qualification-entry-effects").prepare,
        afterSaved:require("./nap-qualification-entry-effects").apply,
        authorize:({clubId})=>{
          if(String(clubId)!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");
          // Open/deadline are checked by the executor, permitting confirmation of
          // an already completed operation after closure without another write.
        },
        validate:async({connection,competition,pack,plan})=>{
          const reason=require("./nap-swimmer-entry-plan").selectionLockReason(competition);
          if(reason) throw new TypeError(reason);
          const participation=require("./nap-entry-participation-rules"),evidence=await participation.readEvidence(connection,plan.additions,competition);
          const samePerson=(person,row)=>backendContext.cleanText(person.firstName).toLocaleLowerCase("fr-FR")===backendContext.cleanText(row.prenom).toLocaleLowerCase("fr-FR") && backendContext.cleanText(person.lastName).toLocaleLowerCase("fr-FR")===backendContext.cleanText(row.nom).toLocaleLowerCase("fr-FR") && (!backendContext.cleanIsoDate(row.date) || backendContext.cleanIsoDate(person.birthDate)===backendContext.cleanIsoDate(row.date));
          for(const person of plan.additions) {
            if(!participation.eligible(competition,person.id,evidence)) throw new TypeError("Un resultat NAP dans au moins une competition requise est necessaire pour engager ce nageur.");
            if(!person.firstName || !person.lastName || !backendContext.cleanIsoDate(person.birthDate) || !["F","M"].includes(person.sex)) throw new TypeError("Completez l'identite NAP du nageur avant l'engagement.");
            if(pack.leaders.some(row=>samePerson(person,row))) throw new TypeError("Une meme personne ne peut pas etre nageur et chef d'equipe sur cette competition.");
            if(pack.officials.some(row=>samePerson(person,row))) throw new TypeError("Une meme personne ne peut pas etre nageur et officiel sur cette competition.");
          }
        },
        audit:{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-selection-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-selection-${operation}-before`).create({action:"nap.swimmerSelection.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubEntry.swimmerSelectionsSaved",context.uid,{...target,auditPreparationId:`nap-swimmer-selection-${operation}-before`},operation)
        }
      });
      const competition=require("./nap-portal-workspaces").competitionItem(result.competition,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
      return {ok:true,source:"nap",operation:result.operation,writesExecuted:result.writesExecuted,entry:await backendContext.nativeClubEntryView(result.nativeEntry,context,competition),sqlBudget:{queriesMax:47,writesMax:5}};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError || error instanceof TypeError?error.message:"Enregistrement NAP a verifier. Reprenez la meme modification ; la sauvegarde est conservee.");
    }
  }

  async function saveNativeClubRelays(context,request) {
    try {
      const input={competitionId:request.data?.competitionId,clubId:String(context.clubId),actorUid:context.uid,expectedFingerprint:request.data?.expectedFingerprint,mutationId:request.data?.mutationId};
      const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const authorize=({clubId})=>{if(String(clubId)!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Dossier hors du club autorise.");};
      const audit={
        read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-relay-${operation}-before`).get();return doc.exists?doc.data().target:null;},
        prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-relay-${operation}-before`).create({action:"nap.relay.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
        checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-relay-${operation}-before`).update({target}),
        complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubEntry.relaysSaved",context.uid,{...target,auditPreparationId:`nap-relay-${operation}-before`},operation)
      };
      let result;
      if(request.data?.removeRelayId) {
        result=await require("./nap-relay-entry-change").saveNativeRelayChanges(pool,{...input,changes:[{relayId:request.data.removeRelayId,action:"remove"}]},{authorize,audit,resolve:async({changes})=>changes});
      } else {
        result=await require("./nap-relay-composition-change").saveNativeRelayComposition(pool,{...input,change:request.data?.relayChange},{authorize,audit,resolve:input=>require("./nap-relay-resolution").resolveRelay(input,{
          qualifiedAnchors:(connection,{pack,competition,ids})=>require("./nap-qualification-relay-preview").readAnchors(connection,{competitionId:pack.event.id,rules:competition.qualifications,date:competition.date,events:backendContext.qualificationEvents(competition)},ids,{categoryFor:backendContext.ageCategoryFromDates}),
          view:pack=>{
            const view=require("./nap-portal-workspaces").competitionItem(pack,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
            const events=backendContext.cleanEngagementCompetitionEvents(view.events.map(event=>({...event,multipleRelaysAllowed:event.allowMultipleRelays===true})),{strict:false,competitionType:view.competitionType});
            return {...view,events:events.map(event=>({...view.events.find(row=>row.code===event.code),...event}))};
          },
          validate:async(raw,competition,dossier)=>{
            const swimmers=require("./nap-portal-workspaces").entryItem(dossier,context,birthDate=>backendContext.ageCategoryFromDates(competition.date,birthDate),competition).swimmers;
            const relays=backendContext.cleanEngagementEntryRelays([raw],competition,swimmers);
            return backendContext.validateEngagementRelayEntryTimes(relays,competition,(await require("./nap-records-store").read(input.connection)).data)[0];
          }
        })});
      }
      const competition=require("./nap-portal-workspaces").competitionItem(result.competition,backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
      return {ok:true,source:"nap",operation:result.operation,writesExecuted:result.writesExecuted,entry:await backendContext.nativeClubEntryView(result.nativeEntry,context,competition),sqlBudget:{queriesMax:63,writesMax:5}};
    } catch(error) {
      if(error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError?"resource-exhausted":error instanceof TypeError?"failed-precondition":"unavailable",error instanceof RangeError || error instanceof TypeError?error.message:"Enregistrement NAP a verifier. Reprenez la meme modification ; la sauvegarde est conservee.");
    }
  }

  return {
    buildEngagementClubSwimmersFromRequest,
    engagementEntryTimeStats,
    nativeClubEntryTimeHistory,
    previewNativeClubEntryTimes,
    saveNativeClubIndividualEntries,
    saveNativeClubSwimmerSelections,
    saveNativeClubRelays
  };
}

module.exports = { createEntryService };
