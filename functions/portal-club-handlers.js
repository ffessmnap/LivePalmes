// Preserve the execution mode of the existing index.js function bodies.

// Existing callable bodies only. Firebase registrations stay in index.js.
// This factory performs no I/O and retains live access to its explicit services.
function createClubHandlers(backendContext) {
  async function getEngagementClubEntry(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const competition = await backendContext.nativePortalCompetition(competitionId, () => {});
      const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const pack = await require("./nap-portal-entries").readNativeClubEntry(pool, { competitionId, clubId: context.clubId }, ({ clubId }) => {
        if (String(clubId) !== String(context.clubId)) throw new backendContext.HttpsError("permission-denied", "Dossier hors du club autorise.");
      });
      return { ok: true, source: "nap", competition: { ...competition, nativeTeamLeaderEditable: pack.leaders.length <= 1, nativeTeamLeaderRequired: pack.leaders.length === 0, nativeRelaysEditable: competition.competitionType === "pool" && pack.leaders.length === 1 && !require("./nap-swimmer-entry-plan").selectionLockReason(competition), nativeOfficialsEditable: pack.leaders.length === 1 && new Set((pack.officials || []).map(row=>String(row.officiel))).size<=80, nativeIndividualEntriesEditable: pack.leaders.length === 1 && !require("./nap-entry-course-rules").courseLockReason(competition), nativeSwimmerSelectionEditable: pack.leaders.length === 1 && !require("./nap-swimmer-entry-plan").selectionLockReason(competition) }, entry: await backendContext.nativeClubEntryView(pack,context,competition),
        readStats: backendContext.portalReadStats("getEngagementClubEntry", startedAt, { baseDocuments: 1, variableDocumentsMax: 0, cacheHit: false }),
        sqlBudget: { queriesMax: 26, rowsMax: 20520, accessQueriesMax: 1, profileDocumentsMax: 1 } };
    }
    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const [competition, entry] = await backendContext.db.getAll(competitionRef, entryRef);
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    return {
      ok: true,
      competition: backendContext.engagementCompetitionDetailItem(competition),
      entry: backendContext.engagementClubEntryItem(entry, {
        competitionId,
        clubId: context.clubId,
        clubName: context.clubName,
        regionId: context.regionId,
        status: "active"
      }),
      readStats: backendContext.portalReadStats("getEngagementClubEntry", startedAt, {
        baseDocuments: 3,
        cacheHit: false
      })
    };
  }

  async function generateEngagementClubRecapPdf(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.generateNativeClubRecapPdf(context, competitionId);
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    const entry = await backendContext.db
      .collection("engagementClubEntries")
      .doc(backendContext.engagementClubEntryId(competitionId, context.clubId))
      .get();
    if (!entry.exists) {
      throw new backendContext.HttpsError("failed-precondition", "Aucune inscription club a recapitulatif.");
    }
    const entryData = backendContext.engagementClubEntryItem(entry);
    if (entryData.clubId !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Inscription hors perimetre club.");
    }
    if (!backendContext.engagementClubEntryHasParticipants(entryData)) {
      throw new backendContext.HttpsError("failed-precondition", "Ajoutez au moins un nageur, un officiel ou un relais avant de generer le recapitulatif.");
    }
    const { buffer, generatedAt, fileName, document, fromStorage } = await backendContext.getOrCreateEngagementClubRecapPdf(competition, entry, {
      force: request.data?.force === true
    });
    await backendContext.writeAuditLog("engagementClubEntry.recapPdfGenerated", context.uid, {
      competitionId,
      clubId: context.clubId,
      fileName,
      size: buffer.length,
      fromStorage
    });
    return {
      ok: true,
      fileName,
      contentType: "application/pdf",
      generatedAt,
      document,
      fromStorage,
      pdfBase64: buffer.toString("base64")
    };
  }

  async function listEngagementCompetitionClubRecaps(request) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result=await backendContext.nativeAdminCompetitionEntries(context,competitionId);
      return {ok:true,source:"nap",competitionId,summaryGenerated:false,summaryReady:true,entries:result.entries.filter(backendContext.engagementClubEntryHasParticipants).map(entry=>({...backendContext.engagementCompetitionEntrySummaryItem(entry),totalFee:backendContext.engagementPdfFeeTotal(entry,result.competition)})),sqlBudget:result.sqlBudget};
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertCanManageEngagementCompetition(context, competition.data() || {});
    const summarySnapshot = await backendContext.engagementCompetitionEntrySummaryRef(backendContext.db, competitionId).get();
    const summaryReady = summarySnapshot?.exists && backendContext.cleanText(summarySnapshot.data()?.generatedAt);
    const summaryEntries = summarySnapshot?.exists
      ? backendContext.engagementCompetitionEntrySummariesFromData(summarySnapshot.data() || {})
      : [];
    const competitionDetail = backendContext.engagementCompetitionDetailItem(competition);
    const entries = summaryEntries.map((entry) => ({
      ...entry,
      totalFee: backendContext.engagementPdfFeeTotal(entry, competitionDetail)
    }));
    return {
      ok: true,
      competitionId,
      collection: backendContext.ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION,
      summaryGenerated: false,
      summaryReady: Boolean(summaryReady),
      entries
    };
  }

  async function generateEngagementClubRecapPdfForAdmin(request) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const clubId = backendContext.cleanText(request.data?.clubId).slice(0, 40);
    if (!competitionId || !clubId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition et club requis.");
    }
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result=await backendContext.nativeAdminCompetitionEntries(context,competitionId),entry=result.entries.find(item=>item.clubId===clubId);
      if(!entry || !backendContext.engagementClubEntryHasParticipants(entry)) throw new backendContext.HttpsError("not-found","Aucun participant NAP pour ce club.");
      const pdf=await backendContext.buildEngagementClubRecapPdf(result.competition,entry);
      if(!Buffer.isBuffer(pdf.buffer) || pdf.buffer.length>10000000) throw new backendContext.HttpsError("resource-exhausted","PDF trop volumineux.");
      return {ok:true,source:"nap",fileName:pdf.fileName,contentType:"application/pdf",generatedAt:pdf.generatedAt,fromStorage:false,pdfBase64:pdf.buffer.toString("base64"),sqlBudget:result.sqlBudget};
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertCanManageEngagementCompetition(context, competition.data() || {});
    const entry = await backendContext.db
      .collection("engagementClubEntries")
      .doc(backendContext.engagementClubEntryId(competitionId, clubId))
      .get();
    if (!entry.exists) {
      throw new backendContext.HttpsError("not-found", "Inscription club introuvable.");
    }
    const entryData = backendContext.engagementClubEntryItem(entry);
    if (entryData.clubId !== clubId) {
      throw new backendContext.HttpsError("permission-denied", "Inscription club incoherente.");
    }
    if (!backendContext.engagementClubEntryHasParticipants(entryData)) {
      throw new backendContext.HttpsError("failed-precondition", "Ce club ne contient encore aucun nageur, officiel ou relais engage.");
    }
    const { buffer, generatedAt, fileName, document, fromStorage } = await backendContext.getOrCreateEngagementClubRecapPdf(competition, entry, {
      force: request.data?.force === true
    });
    await backendContext.writeAuditLog("engagementCompetition.clubRecapPdfGeneratedByAdmin", context.uid, {
      competitionId,
      clubId,
      fileName,
      size: buffer.length,
      fromStorage
    });
    return {
      ok: true,
      fileName,
      contentType: "application/pdf",
      generatedAt,
      document,
      fromStorage,
      pdfBase64: buffer.toString("base64")
    };
  }

  async function generateEngagementCompetitionClubRecapPdfs(request) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result = await backendContext.nativeAdminCompetitionEntries(context, competitionId);
      const files = [], entries = [];
      let bytes = 0, skippedCount = 0;
      for (const entry of result.entries) {
        if (!entry.teamLeaderComplete || !backendContext.engagementClubEntryHasParticipants(entry)) { skippedCount++; continue; }
        const { buffer } = await backendContext.buildEngagementClubRecapPdf(result.competition, entry);
        if (!Buffer.isBuffer(buffer)) throw new backendContext.HttpsError("internal", "PDF indisponible.");
        bytes += buffer.length;
        if (bytes > 7000000) throw new backendContext.HttpsError("resource-exhausted", "ZIP trop volumineux : télécharger les PDF individuellement.");
        files.push({ name: `club-${entry.clubId}.pdf`, buffer });
        entries.push(backendContext.engagementCompetitionEntrySummaryItem(entry));
      }
      const buffer = backendContext.clubRecapZip(files);
      return { ok: true, source: "nap", competitionId, entryCount: result.entries.length,
        generatedCount: files.length, reusedCount: 0, skippedCount, errorCount: 0, errors: [], entries,
        fileName: `recapitulatifs-${competitionId}.zip`, contentType: "application/zip",
        zipBase64: buffer.toString("base64"), sqlBudget: result.sqlBudget };
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertCanManageEngagementCompetition(context, competition.data() || {});
    const entriesSnapshot = await backendContext.db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    let generatedCount = 0;
    let reusedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];
    const entries = [];
    for (const entryDoc of entriesSnapshot.docs) {
      const entry = backendContext.engagementClubEntryItem(entryDoc);
      if (!entry.clubId || !entry.teamLeaderComplete || !backendContext.engagementClubEntryHasParticipants(entry)) {
        skippedCount += 1;
        continue;
      }
      try {
        const result = await backendContext.getOrCreateEngagementClubRecapPdf(competition, entryDoc, {
          force: request.data?.force === true
        });
        if (result.fromStorage) reusedCount += 1;
        else generatedCount += 1;
        entries.push(backendContext.engagementCompetitionEntrySummaryItem({
          ...entry,
          documents: {
            ...(entry.documents || {}),
            clubRecapPdf: result.document
          }
        }));
      } catch (error) {
        errorCount += 1;
        errors.push({
          clubId: entry.clubId,
          clubName: entry.clubName,
          message: backendContext.cleanText(error?.message || String(error)).slice(0, 220)
        });
        console.warn("engagement recap pdf generation failed", {
          competitionId,
          clubId: entry.clubId,
          message: error?.message || String(error)
        });
      }
    }
    await backendContext.writeAuditLog("engagementCompetition.clubRecapPdfsGenerated", context.uid, {
      competitionId,
      entryCount: entriesSnapshot.size,
      generatedCount,
      reusedCount,
      skippedCount,
      errorCount
    });
    return {
      ok: true,
      competitionId,
      entryCount: entriesSnapshot.size,
      generatedCount,
      reusedCount,
      skippedCount,
      errorCount,
      errors,
      entries
    };
  }

  async function saveEngagementClubTeamLeader(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        const saveLeader = request.data?.leaderId == null || request.data.leaderId === ""
          ? require("./nap-team-leader-create").createNativeTeamLeader
          : require("./nap-team-leader-change").editNativeTeamLeader;
        const result = await saveLeader(pool, {
          competitionId, clubId: String(context.clubId), actorUid: context.uid,
          leaderId: request.data?.leaderId, expectedFingerprint: request.data?.expectedFingerprint, patch: request.data?.patch
        }, {
          read: async operation => { const snapshot = await backendContext.db.collection("auditLogs").doc(`nap-team-leader-${operation}-before`).get(); return snapshot.exists ? snapshot.data().target : null; },
          prepare: (operation, target) => backendContext.db.collection("auditLogs").doc(`nap-team-leader-${operation}-before`).create({ action: "nap.teamLeader.change.prepare", actorUid: context.uid, target, createdAt: new Date().toISOString() }),
          checkpoint: (operation, target) => backendContext.db.collection("auditLogs").doc(`nap-team-leader-${operation}-before`).update({ target, updatedAt: new Date().toISOString() }),
          complete: (operation, target) => backendContext.writeAuditLogOnce("engagementClubEntry.teamLeaderSaved", context.uid,{...target,auditPreparationId:`nap-team-leader-${operation}-before`}, operation)
        }, event => backendContext.assertEngagementClubWriteOpen(event));
        const competition = await backendContext.nativePortalCompetition(competitionId, () => {});
        const pack = await require("./nap-portal-entries").readNativeClubEntry(pool, { competitionId, clubId: context.clubId }, () => {});
        return { ...result, competition: { ...competition, nativeTeamLeaderEditable: pack.leaders.length <= 1, nativeTeamLeaderRequired: pack.leaders.length === 0, nativeRelaysEditable: competition.competitionType === "pool" && pack.leaders.length === 1 && !require("./nap-swimmer-entry-plan").selectionLockReason(competition), nativeOfficialsEditable: pack.leaders.length === 1 && new Set((pack.officials || []).map(row=>String(row.officiel))).size<=80, nativeIndividualEntriesEditable: pack.leaders.length === 1 && !require("./nap-entry-course-rules").courseLockReason(competition), nativeSwimmerSelectionEditable: pack.leaders.length === 1 && !require("./nap-swimmer-entry-plan").selectionLockReason(competition) }, entry: await backendContext.nativeClubEntryView(pack,context,competition) };
      } catch (error) {
        if (error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable", error instanceof TypeError || error instanceof RangeError ? error.message : "Modification NAP a verifier. Reprenez la meme correction ; la sauvegarde est conservee.");
      }
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});
    const rawTeamLeader = backendContext.cleanEngagementTeamLeader(request.data?.teamLeader || {});
    let personRef = null;
    let person = null;
    if (rawTeamLeader.mode === "person" && !rawTeamLeader.externalClub && rawTeamLeader.personId) {
      personRef = backendContext.db.collection("engagementClubPeople").doc(rawTeamLeader.personId);
      const personSnapshot = await personRef.get();
      if (!personSnapshot.exists) {
        throw new backendContext.HttpsError("not-found", "Membre du club introuvable.");
      }
      person = backendContext.engagementClubPersonItem(personSnapshot);
      if (person.clubId !== context.clubId || person.active === false) {
        throw new backendContext.HttpsError("permission-denied", "Membre hors perimetre club ou inactif.");
      }
      if (!person.birthDate || !person.sex) {
        throw new backendContext.HttpsError("failed-precondition", "Completez la date de naissance et le sexe de ce membre avant de le choisir comme chef d'equipe.");
      }
    }
    const teamLeader = rawTeamLeader.mode === "person" && !rawTeamLeader.externalClub
      ? {
          ...rawTeamLeader,
          ...(person ? {
            personId: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            birthDate: person.birthDate,
            sex: person.sex,
            licenseNumber: person.licenseNumber
          } : {}),
          clubId: context.clubId,
          clubName: context.clubName
        }
      : rawTeamLeader;
    if (!backendContext.engagementTeamLeaderComplete(teamLeader)) {
      throw new backendContext.HttpsError("invalid-argument", "Chef d'equipe ou renonciation obligatoire.");
    }
    const now = new Date().toISOString();
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const snapshot = await entryRef.get();
    if (snapshot.exists && teamLeader.mode === "person") {
      const entryData = snapshot.data() || {};
      const licenseKey = backendContext.engagementPersonLicenseKey(teamLeader.licenseNumber);
      const alreadyOfficial = (Array.isArray(entryData.officials) ? entryData.officials : []).some((official) =>
        (teamLeader.personId && official.personId === teamLeader.personId) ||
        (licenseKey && backendContext.engagementPersonLicenseKey(official.licenseNumber) === licenseKey));
      const alreadySwimmer = (Array.isArray(entryData.swimmers) ? entryData.swimmers : []).some((swimmer) =>
        (person?.swimmerIndexId && backendContext.cleanText(swimmer.swimmerIndexId) === person.swimmerIndexId) ||
        (licenseKey && backendContext.engagementPersonLicenseKey(swimmer.licenseNumber) === licenseKey));
      if (alreadyOfficial) throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre chef d'equipe et officiel sur cette competition.");
      if (alreadySwimmer) throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre chef d'equipe et nageur sur cette competition.");
    }
    const payload = {
      competitionId,
      clubId: context.clubId,
      clubName: context.clubName,
      regionId: context.regionId,
      status: "active",
      teamLeader,
      teamLeaderComplete: true,
      updatedAt: now,
      updatedBy: context.uid,
      ...(snapshot.exists ? {} : { createdAt: now, createdBy: context.uid })
    };
    const batch = backendContext.db.batch();
    batch.set(entryRef, payload, { merge: true });
    if (personRef && person) {
      const updatedPerson = {
        ...person,
        roles: {
          ...person.roles,
          teamLeader: true
        },
        updatedAt: now,
        updatedBy: context.uid
      };
      batch.set(personRef, {
        roles: updatedPerson.roles,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
      backendContext.upsertEngagementClubPeopleRosterPerson(batch, backendContext.db, updatedPerson, now);
    }
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubEntry.teamLeaderSaved", context.uid, {
      competitionId,
      clubId: context.clubId,
      mode: teamLeader.mode
    });
    const updatedData = { ...(snapshot.data() || {}), ...payload };
    return {
      ok: true,
      entry: backendContext.engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedData })
    };
  }

  async function removeEngagementClubTeamLeader(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0,128);
        const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        const result = await require("./nap-team-leader-remove").removeNativeTeamLeader(pool, {
          competitionId, clubId: String(context.clubId), actorUid: context.uid,
          leaderId: request.data?.leaderId, expectedFingerprint: request.data?.expectedFingerprint
        }, {
          read: async operation => { const snapshot = await backendContext.db.collection("auditLogs").doc(`nap-team-leader-remove-${operation}-before`).get(); return snapshot.exists ? snapshot.data().target : null; },
          prepare: (operation,target) => backendContext.db.collection("auditLogs").doc(`nap-team-leader-remove-${operation}-before`).create({action:"nap.teamLeader.remove.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          checkpoint: (operation,target) => backendContext.db.collection("auditLogs").doc(`nap-team-leader-remove-${operation}-before`).update({target,updatedAt:new Date().toISOString()}),
          complete: (operation,target) => backendContext.writeAuditLogOnce("engagementClubEntry.teamLeaderRemoved",context.uid,{...target,auditPreparationId:`nap-team-leader-remove-${operation}-before`},operation)
        }, event => backendContext.assertEngagementClubWriteOpen(event));
        const competition = await backendContext.nativePortalCompetition(competitionId, () => {});
        const pack = await require("./nap-portal-entries").readNativeClubEntry(pool,{competitionId,clubId:context.clubId},()=>{});
        return {...result,competition:{...competition,nativeTeamLeaderEditable:pack.leaders.length<=1,nativeTeamLeaderRequired:pack.leaders.length===0,nativeRelaysEditable:false,nativeOfficialsEditable:false,nativeIndividualEntriesEditable:false,nativeSwimmerSelectionEditable:false},entry:await backendContext.nativeClubEntryView(pack,context,competition),sqlBudget:{queriesMax:54,writesMax:1}};
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable",error instanceof TypeError || error instanceof RangeError ? error.message : "Retrait NAP a verifier. La sauvegarde est conservee.");
      }
    }
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});
    const now = new Date().toISOString();
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    await backendContext.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(entryRef);
      if (!snapshot.exists) {
        throw new backendContext.HttpsError("not-found", "Aucun chef d'equipe enregistre.");
      }
      const entry = backendContext.engagementClubEntryItem(snapshot);
      if (entry.teamLeader.mode !== "person") {
        throw new backendContext.HttpsError("failed-precondition", "Aucun chef d'equipe a retirer.");
      }
      if (backendContext.engagementClubEntryHasParticipants(entry)) {
        throw new backendContext.HttpsError("failed-precondition", "Le chef d'equipe ne peut plus etre retire : remplacez-le tant que des nageurs, officiels ou relais sont engages.");
      }
      transaction.delete(entryRef);
      backendContext.deleteEngagementCompetitionEntrySummary(transaction, backendContext.db, entry, now);
    });
    await backendContext.writeAuditLog("engagementClubEntry.teamLeaderRemoved", context.uid, {
      competitionId,
      clubId: context.clubId
    });
    return {
      ok: true,
      entry: backendContext.engagementClubEntryItem(null, {
        competitionId,
        clubId: context.clubId,
        clubName: context.clubName,
        regionId: context.regionId,
        status: "active"
      })
    };
  }

  async function listEngagementClubPeople(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const result = await require("./nap-club-people").readClubPeople(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {clubId:context.clubId,cursor:request.data?.cursor}, ({clubId}) => {
          if(clubId!==context.clubId) throw new backendContext.HttpsError("permission-denied", "Personnes hors du club autorise.");
        });
        return {ok:true,clubId:context.clubId,...result,readStats:backendContext.portalReadStats("listEngagementClubPeople",startedAt,{baseDocuments:1,variableDocumentsMax:0,cacheHit:false})};
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : error instanceof RangeError ? "resource-exhausted" : "unavailable", "Personnes NAP indisponibles. " + (error instanceof TypeError || error instanceof RangeError ? error.message : "Reessayez le chargement."));
      }
    }
    const includeInactive = request.data?.includeInactive === true;
    const forceRebuild = request.data?.forceRoster === true;
    const rosterSnapshot = forceRebuild ? null : await backendContext.engagementClubPeopleRosterRef(backendContext.db, context.clubId).get();
    const rosterReady = rosterSnapshot?.exists && backendContext.cleanText(rosterSnapshot.data()?.generatedAt);
    let rosterGenerated = false;
    const rosterPeople = rosterReady
      ? backendContext.engagementClubPeopleRosterPeopleFromData(rosterSnapshot.data() || {})
      : await backendContext.rebuildEngagementClubPeopleRoster(backendContext.db, context).then((items) => {
        rosterGenerated = true;
        return items;
      });
    const people = rosterPeople
      .filter((person) => includeInactive || person.active)
      .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
    return {
      ok: true,
      collection: backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION,
      rosterGenerated,
      readStats: backendContext.portalReadStats("listEngagementClubPeople", startedAt, {
        baseDocuments: 2,
        variableDocumentsMax: rosterGenerated ? 200 : 0,
        cacheHit: !rosterGenerated
      }),
      people
    };
  }

  async function saveEngagementClubPerson(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        if(request.data?.roles) {
          return await require("./nap-club-person-status").changeNativePersonStatus(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
            clubId:String(context.clubId),actorUid:context.uid,personId:request.data.personId,expectedFingerprint:request.data.expectedFingerprint,active:request.data.active,roles:request.data.roles
          },{
            read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-person-roles-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
            prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-roles-${operation}-before`).create({action:"nap.person.roles.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
            complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.person.roles.changed",context.uid,target,operation)
          },scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Personne hors club.");});
        }
        if (!backendContext.cleanText(request.data?.personId)) {
          return await require("./nap-club-person-create").createNativePerson(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {
            clubId:String(context.clubId), actorUid:context.uid, creationId:request.data?.creationId, person:request.data?.person
          }, {
            read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-person-create-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
            prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-create-${operation}-before`).create({action:"nap.person.create.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
            checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-create-${operation}-before`).update({target}),
            complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubPerson.created",context.uid,{...target,auditPreparationId:`nap-person-create-${operation}-before`},operation)
          },scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Personne hors club.");});
        }
        return await require("./nap-club-person-edit").editNativePerson(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
          clubId:String(context.clubId),actorUid:context.uid,personId:request.data?.personId,
          expectedFingerprint:request.data?.expectedFingerprint,patch:request.data?.patch
        },{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-person-identity-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-identity-${operation}-before`).create({action:"nap.person.identity.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubPerson.saved",context.uid,{...target,auditPreparationId:`nap-person-identity-${operation}-before`},operation)
        },scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Personne hors club.");});
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError || error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError || error instanceof RangeError?error.message:"Correction NAP a verifier. Reprenez la meme action ; la sauvegarde est conservee.");
      }
    }
    const personId = backendContext.cleanText(request.data?.personId).slice(0, 80);
    const rawPerson = request.data?.person || {};
    const linkedSwimmer = await backendContext.resolveEngagementClubPersonSwimmer(backendContext.db, context, rawPerson);
    const person = backendContext.cleanEngagementClubPerson(linkedSwimmer ? {
      ...rawPerson,
      firstName: linkedSwimmer.firstName,
      lastName: linkedSwimmer.lastName,
      licenseNumber: linkedSwimmer.licenseNumber,
      swimmerIndexId: linkedSwimmer.swimmerIndexId,
      swimmerSource: linkedSwimmer.source,
      birthDate: linkedSwimmer.birthDate,
      sex: linkedSwimmer.sex,
      identityKey: linkedSwimmer.identityKey
    } : rawPerson, context);
    const docId = personId || backendContext.stableHash(`${context.clubId}|${person.licenseNumber}`).slice(0, 40);
    const ref = backendContext.db.collection("engagementClubPeople").doc(docId);
    const [snapshot, peopleRosterSnapshot] = await Promise.all([
      ref.get(),
      backendContext.engagementClubPeopleRosterRef(backendContext.db, context.clubId).get()
    ]);
    if (snapshot.exists && backendContext.cleanText(snapshot.data()?.clubId) !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Personne hors perimetre club.");
    }
    if (!personId && snapshot.exists) {
      backendContext.throwEngagementClubPersonIdentityConflict({ type: "license", person: backendContext.engagementClubPersonItem(snapshot) });
    }
    if (peopleRosterSnapshot.exists) {
      const conflict = backendContext.engagementClubPersonIdentityConflict(
        backendContext.engagementClubPeopleRosterPeopleFromData(peopleRosterSnapshot.data() || {}),
        person,
        personId
      );
      if (conflict) backendContext.throwEngagementClubPersonIdentityConflict(conflict);
    }
    if (!personId && person.roles.teamLeader && await backendContext.engagementClubPersonOutsideClubConflict(person, context.clubId)) {
      throw new backendContext.HttpsError("failed-precondition", "Cette personne existe déjà dans un autre club. Déclarez-la comme chef d'équipe hors club.", {
        outsideClubExistingPerson: true
      });
    }
    const now = new Date().toISOString();
    const payload = {
      ...person,
      updatedAt: now,
      updatedBy: context.uid,
      ...(snapshot.exists ? {} : { createdAt: now, createdBy: context.uid })
    };
    const batch = backendContext.db.batch();
    batch.set(ref, payload, { merge: true });
    backendContext.upsertEngagementClubPeopleRosterPerson(batch, backendContext.db, { ...payload, id: docId }, now);
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubPerson.saved", context.uid, {
      personId: docId,
      firstName: person.firstName,
      lastName: person.lastName,
      clubId: context.clubId,
      licenseNumber: person.licenseNumber,
      roles: person.roles
    });
    return {
      ok: true,
      person: backendContext.engagementClubPersonItem({ id: ref.id, exists: true, data: () => ({ ...(snapshot.data() || {}), ...payload }) })
    };
  }

  async function setEngagementClubPersonStatus(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const pool=require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        return await require("./nap-club-person-status").changeNativePersonStatus(pool,{
          clubId:String(context.clubId),actorUid:context.uid,personId:request.data?.personId,
          active:request.data?.active,expectedFingerprint:request.data?.expectedFingerprint
        },{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-person-status-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-person-status-${operation}-before`).create({action:"nap.person.status.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubPerson.statusChanged",context.uid,{...target,auditPreparationId:`nap-person-status-${operation}-before`},operation)
        },scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Personne hors club.");});
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Statut NAP a verifier. Reprenez la meme action ; la sauvegarde est conservee.");
      }
    }
    const personId = backendContext.cleanText(request.data?.personId).slice(0, 80);
    const active = request.data?.active === true;
    if (!personId) {
      throw new backendContext.HttpsError("invalid-argument", "Personne requise.");
    }
    const ref = backendContext.db.collection("engagementClubPeople").doc(personId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Personne introuvable.");
    }
    if (backendContext.cleanText(snapshot.data()?.clubId) !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Personne hors perimetre club.");
    }
    const now = new Date().toISOString();
    const payload = {
      active,
      updatedAt: now,
      updatedBy: context.uid
    };
    const batch = backendContext.db.batch();
    batch.set(ref, payload, { merge: true });
    backendContext.upsertEngagementClubPeopleRosterPerson(batch, backendContext.db, backendContext.engagementClubPersonItem({
      id: ref.id,
      data: () => ({ ...(snapshot.data() || {}), ...payload })
    }), now);
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubPerson.statusChanged", context.uid, {
      personId,
      firstName: backendContext.cleanText(snapshot.data()?.firstName).slice(0, 80),
      lastName: backendContext.cleanText(snapshot.data()?.lastName).slice(0, 80),
      clubId: context.clubId,
      active
    });
    return {
      ok: true,
      person: backendContext.engagementClubPersonItem({ id: ref.id, exists: true, data: () => ({ ...(snapshot.data() || {}), ...payload }) })
    };
  }

  async function saveEngagementClubOfficials(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.saveNativeClubOfficials(context,request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const entry = await entryRef.get();
    if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les officiels.");
    }

    const personIds = Array.from(new Set((Array.isArray(request.data?.officialPersonIds) ? request.data.officialPersonIds : [])
      .map((id) => backendContext.cleanText(id).slice(0, 80))
      .filter(Boolean)))
      .slice(0, 80);
    const personRefs = personIds.map((id) => backendContext.db.collection("engagementClubPeople").doc(id));
    const personDocs = personRefs.length ? await backendContext.db.getAll(...personRefs) : [];
    const entryData = entry.data() || {};
    const teamLeader = entryData.teamLeader || {};
    const enteredSwimmers = Array.isArray(entryData.swimmers) ? entryData.swimmers.map(backendContext.cleanEngagementEntrySwimmer) : [];
    const officials = personDocs.map((doc) => {
      if (!doc.exists) {
        throw new backendContext.HttpsError("invalid-argument", "Officiel inconnu dans la base club.");
      }
      const person = backendContext.engagementClubPersonItem(doc);
      if (person.clubId !== context.clubId || !person.active || person.roles.official !== true) {
        throw new backendContext.HttpsError("permission-denied", "Officiel hors perimetre club ou inactif.");
      }
      const licenseKey = backendContext.engagementPersonLicenseKey(person.licenseNumber);
      if (backendContext.cleanText(teamLeader.personId) === person.id || (licenseKey && backendContext.engagementPersonLicenseKey(teamLeader.licenseNumber) === licenseKey)) {
        throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre chef d'equipe et officiel sur cette competition.");
      }
      if (enteredSwimmers.some((swimmer) =>
        (person.swimmerIndexId && swimmer.swimmerIndexId === person.swimmerIndexId) ||
        (licenseKey && backendContext.engagementPersonLicenseKey(swimmer.licenseNumber) === licenseKey))) {
        throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre nageur et officiel sur cette competition.");
      }
      return {
        personId: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        birthDate: person.birthDate,
        licenseNumber: person.licenseNumber
      };
    });

    const now = new Date().toISOString();
    await entryRef.set({
      officials,
      updatedAt: now,
      updatedBy: context.uid
    }, { merge: true });
    await backendContext.writeAuditLog("engagementClubEntry.officialsSaved", context.uid, {
      competitionId,
      clubId: context.clubId,
      officialCount: officials.length
    });
    const updatedData = { ...entryData, officials, updatedAt: now, updatedBy: context.uid };
    return {
      ok: true,
      entry: backendContext.engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedData })
    };
  }

  async function listEngagementClubSwimmers(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    const limit = Math.min(800, Math.max(50, Math.trunc(Number(request.data?.limit) || 400)));
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const nap = require("./nap-portal-swimmers");
        const people = await nap.listPortalClubSwimmers(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD), context.clubId);
        return { ok: true, clubId: context.clubId, source: "nap", swimmers: people.map(item => ({
          ...item, category: backendContext.currentEngagementCategoryFromBirthDate(item.birthDate)
        })), readStats: backendContext.portalReadStats("listEngagementClubSwimmers", startedAt, { baseDocuments: 1, variableDocumentsMax: 0, cacheHit: false }) };
      } catch (error) {
        throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable", "Effectif NAP indisponible. " + (error instanceof RangeError ? error.message : "Reessayez le chargement."));
      }
    }
    const rosterSnapshot = await backendContext.engagementClubRosterRef(backendContext.db, context.clubId).get();
    const rosterReady = rosterSnapshot?.exists && backendContext.cleanText(rosterSnapshot.data()?.generatedAt);
    if (!rosterReady) {
      throw new backendContext.HttpsError(
        "unavailable",
        "Effectif agrege momentanement indisponible. Aucune reconstruction massive n'a ete lancee."
      );
    }
    const swimmers = backendContext.sortEngagementClubSwimmers(
      backendContext.uniqueEngagementClubSwimmers(backendContext.engagementClubRosterSwimmersFromData(rosterSnapshot.data() || {}), limit)
    );
    return {
      ok: true,
      clubId: context.clubId,
      rosterGenerated: false,
      readStats: backendContext.portalReadStats("listEngagementClubSwimmers", startedAt, {
        baseDocuments: 2,
        variableDocumentsMax: 0,
        cacheHit: true
      }),
      swimmers
    };
  }

  async function setEngagementClubSwimmerActivityStatus(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    const swimmerIndexId = backendContext.cleanText(request.data?.swimmerIndexId).slice(0, 80);
    const source = backendContext.cleanText(request.data?.source || "performances").slice(0, 40) || "performances";
    const status = backendContext.cleanEngagementClubActivityStatus(request.data?.status, "");
    if (!swimmerIndexId || !status) {
      throw new backendContext.HttpsError("invalid-argument", "Nageur et statut actif ou inactif requis.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const result=await require("./nap-swimmer-activity").change(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {
          id:swimmerIndexId,clubId:String(context.clubId),actorUid:context.uid,status,expectedFingerprint:request.data?.expectedFingerprint
        }, {
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-activity-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-activity-${operation}-before`).create({action:"nap.swimmerActivity.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.swimmerActivity.complete",context.uid,{...target,auditPreparationId:`nap-swimmer-activity-${operation}-before`},`nap-swimmer-activity-${operation}-complete`)
        });
        return result;
      } catch(error) { throw new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":"unavailable",error instanceof TypeError?error.message:"Statut NAP a verifier. Rechargez la fiche avant de reessayer."); }
    }
    const rosterRef = backendContext.engagementClubRosterRef(backendContext.db, context.clubId);
    const snapshot = await rosterRef.get();
    if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Effectif du club introuvable.");
    const data = snapshot.data() || {};
    const entries = data.swimmers && typeof data.swimmers === "object" ? data.swimmers : {};
    const match = Object.entries(entries).find(([, swimmer]) =>
      backendContext.cleanText(swimmer?.swimmerIndexId || swimmer?.id) === swimmerIndexId &&
      backendContext.cleanText(swimmer?.source || "performances") === source
    );
    if (!match) throw new backendContext.HttpsError("not-found", "Nageur introuvable dans l'effectif du club.");
    const [key, swimmer] = match;
    const now = new Date().toISOString();
    const updated = backendContext.engagementClubRosterSwimmerItem({
      ...swimmer,
      clubActivityStatus: status,
      clubActivityStatusSource: "club",
      clubActivityStatusUpdatedAt: now,
      clubActivityStatusUpdatedBy: context.uid
    });
    await rosterRef.set({
      updatedAt: now,
      swimmers: { [key]: updated }
    }, { merge: true });
    await backendContext.writeAuditLog("engagementClubSwimmer.activityStatusUpdated", context.uid, {
      clubId: context.clubId,
      swimmerIndexId,
      swimmerId: backendContext.cleanText(updated.swimmerId),
      source,
      status
    });
    return {
      ok: true,
      swimmer: updated,
      readStats: backendContext.portalReadStats("setEngagementClubSwimmerActivityStatus", startedAt, {
        baseDocuments: 3,
        variableDocumentsMax: 0,
        cacheHit: true
      })
    };
  }

  async function previewEngagementClubSwimmerCreation(request) {
    if(request.data?.importReview===true)return backendContext.importSwimmerCreation(request,false);
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const input={clubId:String(context.clubId),actorUid:context.uid,swimmer:request.data?.swimmer,creationId:request.data?.creationId,confirmAlerts:request.data?.confirmAlerts};
        const authorize=scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Nageur hors club.");};
        const formatAlert=(match,type)=>backendContext.engagementNewSwimmerAlertFromMatch(match,{...context,clubId:String(context.clubId)},type);
        return await require("./nap-swimmer-creation").previewCreation(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),input,authorize,formatAlert);
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError || error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError || error instanceof RangeError?error.message:"Creation NAP a verifier. Reprenez la meme action ; sauvegarde conservee.");
      }
    }
    const swimmer = backendContext.cleanEngagementNewSwimmer(request.data?.swimmer || {}, context);
    await backendContext.assertNoEngagementSwimmerLicenseConflict(backendContext.db, swimmer);
    const alerts = await backendContext.buildEngagementNewSwimmerAlerts(swimmer, context);
    const blockingAlerts = alerts.filter((alert) => alert.type === "inverted-identity");
    return {
      ok: true,
      swimmer,
      alerts,
      requiresConfirmation: alerts.length > 0 && blockingAlerts.length === 0,
      blocksCreation: blockingAlerts.length > 0
    };
  }

  async function previewEngagementClubSwimmerRecovery(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const preview = await require("./nap-swimmer-recovery").previewRecovery(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {
          clubId:String(context.clubId),licenseNumber:backendContext.cleanText(request.data?.licenseNumber).toUpperCase()
        }, scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Nageur hors club.");});
        return {ok:true,...preview};
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError || error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError || error instanceof RangeError?error.message:"Lecture NAP indisponible. Reessayez.");
      }
    }
    const preview = await backendContext.engagementSwimmerRecoveryPreview(backendContext.db, request.data?.licenseNumber, context);
    return {
      ok: true,
      ...preview,
      readStats: backendContext.portalReadStats("previewEngagementClubSwimmerRecovery", startedAt, {
        baseDocuments: 2,
        variableDocumentsMax: 4,
        cacheHit: false
      })
    };
  }

  async function recoverEngagementClubSwimmer(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        return await require("./nap-swimmer-recovery").recoverSwimmer(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
          clubId:String(context.clubId),actorUid:context.uid,licenseNumber:backendContext.cleanText(request.data?.licenseNumber).toUpperCase(),mutationId:request.data?.mutationId,expectedFingerprint:request.data?.expectedFingerprint
        },{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-recovery-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-recovery-${operation}-before`).create({action:"nap.swimmer.recovery.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("engagementClubSwimmer.recovered",context.uid,{...target,auditPreparationId:`nap-swimmer-recovery-${operation}-before`},operation)
        },scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Nageur hors club.");});
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError || error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError || error instanceof RangeError?error.message:"Recuperation NAP a verifier. Reprenez la meme action ; la sauvegarde est conservee.");
      }
    }
    const preview = await backendContext.engagementSwimmerRecoveryPreview(backendContext.db, request.data?.licenseNumber, context);
    if (!preview.found) throw new backendContext.HttpsError("not-found", "Nageur introuvable dans la base.");
    if (preview.sameClub) throw new backendContext.HttpsError("already-exists", "Ce nageur est deja connu dans votre club.");
    if (!preview.eligible) {
      throw new backendContext.HttpsError("failed-precondition", "Ce nageur a deja un resultat publie cette saison. Son changement de club necessite une derogation nationale.");
    }

    const now = new Date().toISOString();
    const previousSwimmer = preview.swimmer || {};
    const swimmer = backendContext.cleanEngagementNewSwimmer({
      ...previousSwimmer,
      licenseNumber: request.data?.licenseNumber
    }, context);
    const swimmerId = preview.engagementSwimmerId || backendContext.stableHash([
      context.clubId,
      swimmer.identityKey || swimmer.name,
      swimmer.licenseNumber
    ].join("|")).slice(0, 40);
    const swimmerRef = backendContext.db.collection("engagementClubSwimmers").doc(swimmerId);
    const licensePayload = {
      ...backendContext.engagementSwimmerLicensePayload({ ...swimmer, swimmerIndexId: swimmerId }, context, {
        type: "club-recovery",
        competitionId: backendContext.cleanText(request.data?.competitionId).slice(0, 128),
        collectedAt: now
      }),
      updatedAt: now,
      updatedBy: context.uid
    };
    const batch = backendContext.db.batch();
    if (preview.engagementSwimmerId) {
      backendContext.deleteEngagementClubRosterSwimmer(batch, backendContext.db, {
        ...previousSwimmer,
        swimmerIndexId: swimmerId,
        source: "engagement"
      }, now);
    }
    const payload = {
      ...swimmer,
      source: "engagement",
      clubActivityStatus: "active",
      clubActivityStatusSource: "club-recovery",
      clubActivityStatusUpdatedAt: now,
      clubActivityStatusUpdatedBy: context.uid,
      updatedAt: now,
      updatedBy: context.uid,
      ...(preview.engagementSwimmerId ? {} : { createdAt: now, createdBy: context.uid })
    };
    batch.set(swimmerRef, payload, { merge: true });
    batch.set(backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.engagementSwimmerLicenseId({ ...swimmer, swimmerIndexId: swimmerId })), licensePayload, { merge: true });
    preview.licenseRecordIds
      .filter((id) => id !== backendContext.engagementSwimmerLicenseId({ ...swimmer, swimmerIndexId: swimmerId }))
      .forEach((id) => batch.delete(backendContext.db.collection("engagementSwimmerLicenses").doc(id)));
    const licenseNumberRefId = backendContext.engagementSwimmerLicenseNumberId(swimmer.licenseNumber);
    if (licenseNumberRefId) {
      batch.set(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(licenseNumberRefId), {
        ...licensePayload,
        swimmerIndexId: swimmerId,
        licenseKey: backendContext.engagementSwimmerLicenseNumberKey(swimmer.licenseNumber)
      }, { merge: true });
    }
    backendContext.upsertEngagementClubRosterSwimmer(batch, backendContext.db, { ...payload, id: swimmerId, swimmerIndexId: swimmerId }, now);
    const transferAlertRef = backendContext.db.collection("engagementSwimmerAlerts").doc(backendContext.stableHash([
      "club-change",
      swimmer.licenseNumber,
      preview.season.label,
      previousSwimmer.clubId,
      context.clubId
    ].join("|")).slice(0, 40));
    batch.set(transferAlertRef, {
      type: "club-change",
      status: "confirmed-by-club",
      swimmerIndexId: swimmerId,
      identityKey: swimmer.identityKey,
      licenseNumber: swimmer.licenseNumber,
      name: swimmer.name,
      fromClubId: backendContext.cleanText(previousSwimmer.clubId),
      fromClubName: backendContext.cleanText(previousSwimmer.clubName),
      clubId: context.clubId,
      clubName: context.clubName,
      seasonLabel: preview.season.label,
      reason: "no-published-result-this-season",
      confirmedAt: now,
      confirmedBy: context.uid,
      updatedAt: now
    }, { merge: true });
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubSwimmer.recovered", context.uid, {
      swimmerId,
      licenseNumber: swimmer.licenseNumber,
      fromClubId: backendContext.cleanText(previousSwimmer.clubId),
      toClubId: context.clubId,
      seasonLabel: preview.season.label,
      publishedResult: false
    });
    const updated = await swimmerRef.get();
    return {
      ok: true,
      swimmer: backendContext.engagementNewSwimmerItem(updated),
      readStats: backendContext.portalReadStats("recoverEngagementClubSwimmer", startedAt, {
        baseDocuments: 2,
        variableDocumentsMax: 8,
        cacheHit: false
      })
    };
  }

  async function createEngagementClubSwimmer(request) {
    if(request.data?.importReview===true)return backendContext.importSwimmerCreation(request,true);
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const input={clubId:String(context.clubId),actorUid:context.uid,swimmer:request.data?.swimmer,creationId:request.data?.creationId,confirmAlerts:request.data?.confirmAlerts};
        const authorize=scope=>{if(scope.clubId!==String(context.clubId)) throw new backendContext.HttpsError("permission-denied","Nageur hors club.");};
        const formatAlert=(match,type)=>backendContext.engagementNewSwimmerAlertFromMatch(match,{...context,clubId:String(context.clubId)},type);
        return await require("./nap-swimmer-creation").createSwimmer(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),input,{
          read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).get();return doc.exists?doc.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).create({action:"nap.swimmerCreate.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).update({target}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.swimmerCreate.complete",context.uid,{...target,auditPreparationId:`nap-swimmer-create-${operation}-before`},`nap-swimmer-create-${operation}-complete`)
        },authorize,formatAlert);
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError || error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError || error instanceof RangeError?error.message:"Creation NAP a verifier. Reprenez la meme action ; sauvegarde conservee.");
      }
    }
    const swimmer = backendContext.cleanEngagementNewSwimmer(request.data?.swimmer || {}, context);
    const now = new Date().toISOString();
    const docId = backendContext.stableHash([
      context.clubId,
      swimmer.identityKey || swimmer.name,
      swimmer.licenseNumber
    ].join("|")).slice(0, 40);
    const ref = backendContext.db.collection("engagementClubSwimmers").doc(docId);
    const snapshot = await ref.get();
    if (snapshot.exists && backendContext.cleanText(snapshot.data()?.clubId) !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Nageur hors perimetre club.");
    }
    if (snapshot.exists) {
      throw new backendContext.HttpsError("already-exists", "Un nageur avec cette licence existe deja pour ce club. Utilisez la fiche existante.");
    }
    await backendContext.assertNoEngagementSwimmerLicenseConflict(backendContext.db, swimmer);
    const alerts = await backendContext.buildEngagementNewSwimmerAlerts(swimmer, context);
    const blockingAlerts = alerts.filter((alert) => alert.type === "inverted-identity");
    if (blockingAlerts.length) {
      throw new backendContext.HttpsError("already-exists", "Un nageur existe deja avec le nom et le prenom inverses.", {
        alerts: blockingAlerts,
        blocksCreation: true
      });
    }
    const confirmAlerts = request.data?.confirmAlerts === true;
    if (alerts.length && !confirmAlerts) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation obligatoire avant creation du nageur.", {
        alerts,
        requiresConfirmation: true
      });
    }
    const season = backendContext.currentEngagementSeasonInfo(new Date(now));
    const payload = {
      ...swimmer,
      alerts,
      alertCount: alerts.length,
      alertValidationStatus: alerts.length ? "validated-by-club" : "",
      alertValidatedAt: alerts.length ? now : "",
      alertValidatedBy: alerts.length ? context.uid : "",
      seasonStartYear: season.startYear,
      seasonLabel: season.label,
      clubActivityStatus: "active",
      clubActivityStatusSource: "club-creation",
      clubActivityStatusUpdatedAt: now,
      clubActivityStatusUpdatedBy: context.uid,
      updatedAt: now,
      updatedBy: context.uid,
      ...(snapshot.exists ? {} : { createdAt: now, createdBy: context.uid })
    };
    const batch = backendContext.db.batch();
    batch.set(ref, payload, { merge: true });
    const licenseRef = backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.engagementSwimmerLicenseId({ ...swimmer, swimmerIndexId: docId }));
    const licensePayload = {
      ...backendContext.engagementSwimmerLicensePayload({ ...swimmer, swimmerIndexId: docId }, context, {
        competitionId: backendContext.cleanText(request.data?.competitionId).slice(0, 128),
        collectedAt: now
      }),
      updatedAt: now,
      updatedBy: context.uid
    };
    batch.set(licenseRef, licensePayload, { merge: true });
    const licenseNumberRefId = backendContext.engagementSwimmerLicenseNumberId(swimmer.licenseNumber);
    if (licenseNumberRefId) {
      batch.create(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(licenseNumberRefId), {
        ...licensePayload,
        swimmerIndexId: docId,
        licenseKey: backendContext.engagementSwimmerLicenseNumberKey(swimmer.licenseNumber),
        updatedAt: now,
        updatedBy: context.uid
      });
    }
    backendContext.upsertEngagementClubRosterSwimmer(batch, backendContext.db, { ...payload, id: docId, swimmerIndexId: docId, source: "engagement" }, now);
    alerts.forEach((alert, index) => {
      const alertRef = backendContext.db.collection("engagementSwimmerAlerts").doc(backendContext.stableHash(`${docId}|${alert.type}|${alert.swimmerIndexId || index}`).slice(0, 40));
      batch.set(alertRef, {
        ...alert,
        status: "validated-by-club",
        newSwimmerId: docId,
        clubId: context.clubId,
        clubName: context.clubName,
        regionId: context.regionId,
        seasonStartYear: season.startYear,
        seasonLabel: season.label,
        validatedAt: now,
        validatedBy: context.uid,
        createdAt: now,
        createdBy: context.uid
      }, { merge: true });
    });
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubSwimmer.created", context.uid, {
      swimmerId: docId,
      clubId: context.clubId,
      alertCount: alerts.length,
      alertTypes: Array.from(new Set(alerts.map((alert) => backendContext.cleanText(alert.type)).filter(Boolean))),
      seasonStartYear: season.startYear,
      seasonLabel: season.label
    });
    const updated = await ref.get();
    return {
      ok: true,
      swimmer: backendContext.engagementNewSwimmerItem(updated),
      alerts
    };
  }

  async function validateEngagementSwimmerLicenses(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Validation des licences reservee au niveau national.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const connection=await require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD).getConnection();
      let locked=false;
      try {
        const [lock]=await connection.execute({sql:"SELECT GET_LOCK('livepalmes_license_control',0) AS acquired",timeout:10000});
        if(Number(lock[0]?.acquired)!==1) throw new TypeError("Un controle de licences est deja en cours.");
        locked=true;
        return await require("./nap-license-control").validateBatch(connection,request.data || {},context.uid,{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-licenses-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-licenses-${operation}-before`).create({action:"nap.licenses.correction.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.licenses.corrected",context.uid,{...target,auditPreparationId:`nap-licenses-${operation}-before`},operation)
        });
      } catch(error) {throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable",error instanceof TypeError || error instanceof RangeError ? error.message : "Validation a verifier. La sauvegarde est conservee : reprenez le meme lot.");}
      finally {try{if(locked)await connection.execute({sql:"SELECT RELEASE_LOCK('livepalmes_license_control')",timeout:10000});}finally{connection.release();}}
    }
    const season = backendContext.engagementLicenseControlSeason(request.data?.season);
    const source = backendContext.cleanText(request.data?.source) === "admin_import" ? "admin_import" : "national_manual";
    const rawItems = Array.isArray(request.data?.items) ? request.data.items.slice(0, 100) : [];
    if (!rawItems.length) throw new backendContext.HttpsError("invalid-argument", "Aucune licence a valider.");
    const ids = new Set();
    const items = rawItems.map((raw) => {
      const swimmerIndexId = backendContext.cleanText(raw?.swimmerIndexId || raw?.livePalmesId).slice(0, 80);
      const licenseNumber = backendContext.cleanText(raw?.licenseNumber).toUpperCase().slice(0, 60);
      if (!swimmerIndexId || ids.has(swimmerIndexId)) throw new backendContext.HttpsError("invalid-argument", "Nageur absent ou duplique dans la selection.");
      if (!backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) throw new backendContext.HttpsError("invalid-argument", "Chaque licence doit respecter le format A-12-34567.");
      ids.add(swimmerIndexId);
      const federalValidityEndDate = backendContext.cleanIsoDate(raw?.federalValidityEndDate);
      if (source === "admin_import" && (!federalValidityEndDate || federalValidityEndDate < season.requiredValidityDate)) {
        throw new backendContext.HttpsError("failed-precondition", "Une licence importee ne couvre pas la saison demandee.");
      }
      return {
        swimmerIndexId,
        swimmerId: backendContext.cleanText(raw?.swimmerId).slice(0, 80),
        identityKey: backendContext.cleanText(raw?.identityKey).slice(0, 180),
        source: backendContext.cleanText(raw?.source || "performances").slice(0, 40),
        firstName: backendContext.cleanText(raw?.firstName).slice(0, 80),
        lastName: backendContext.cleanText(raw?.lastName).slice(0, 80),
        name: backendContext.cleanText(raw?.name).slice(0, 160),
        birthDate: backendContext.cleanIsoDate(raw?.birthDate),
        sex: backendContext.cleanText(raw?.sex).toUpperCase().slice(0, 1),
        clubId: backendContext.cleanText(raw?.clubId).slice(0, 40),
        clubName: backendContext.cleanText(raw?.clubName).slice(0, 140),
        licenseNumber,
        federalValidityEndDate
      };
    });
    const now = new Date().toISOString();
    await backendContext.db.runTransaction(async (transaction) => {
      const licenseRefs = items.map((item) => backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.engagementSwimmerLicenseId({ swimmerIndexId: item.swimmerIndexId })));
      const numberRefs = items.map((item) => backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(backendContext.engagementSwimmerLicenseNumberId(item.licenseNumber)));
      const rosterClubIds = Array.from(new Set(items.map((item) => item.clubId).filter(Boolean)));
      const rosterRefs = rosterClubIds.map((clubId) => backendContext.engagementClubRosterRef(backendContext.db, clubId));
      const readSnapshots = await transaction.getAll(...licenseRefs, ...numberRefs, ...rosterRefs);
      const licenseSnapshots = readSnapshots.slice(0, licenseRefs.length);
      const numberSnapshots = readSnapshots.slice(licenseRefs.length, licenseRefs.length + numberRefs.length);
      const rosterOffset = licenseRefs.length + numberRefs.length;
      const rosterDataByClub = new Map(rosterClubIds.map((clubId, index) => [clubId, readSnapshots[rosterOffset + index]?.data() || {}]));
      numberSnapshots.forEach((snapshot, index) => {
        const ownerId = backendContext.cleanText(snapshot.data()?.swimmerIndexId).slice(0, 80);
        if (snapshot.exists && ownerId && ownerId !== items[index].swimmerIndexId) {
          throw new backendContext.HttpsError("already-exists", `La licence ${items[index].licenseNumber} appartient deja a une autre fiche.`);
        }
      });
      const rosterUpdates = new Map();
      items.forEach((item, index) => {
        const seasonRecord = {
          status: "valid",
          validatedAt: now,
          updatedAt: now,
          updatedBy: context.uid,
          source,
          ...(item.federalValidityEndDate ? { federalValidityEndDate: item.federalValidityEndDate } : {})
        };
        const payload = backendContext.cleanFirestoreValue({
          ...item,
          verificationStatus: "verified",
          verificationSource: source,
          licenseSeasonLabel: season.label,
          licenseSeasonStatus: "valid",
          licenseSeasons: { [season.label]: seasonRecord },
          updatedAt: now,
          updatedBy: context.uid
        });
        const previousLicenseNumber = backendContext.cleanText(licenseSnapshots[index]?.data()?.licenseNumber).toUpperCase().slice(0, 60);
        if (previousLicenseNumber && previousLicenseNumber !== item.licenseNumber) {
          transaction.delete(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(backendContext.engagementSwimmerLicenseNumberId(previousLicenseNumber)));
        }
        transaction.set(licenseRefs[index], payload, { merge: true });
        transaction.set(numberRefs[index], {
          ...payload,
          licenseKey: backendContext.engagementSwimmerLicenseNumberKey(item.licenseNumber)
        }, { merge: true });
        if (item.clubId) {
          if (!rosterUpdates.has(item.clubId)) rosterUpdates.set(item.clubId, {});
          const rosterKey = backendContext.engagementClubRosterSwimmerKey(item);
          const storedRosterItem = rosterDataByClub.get(item.clubId)?.swimmers?.[rosterKey] || {};
          const rosterItem = backendContext.engagementClubRosterSwimmerItem({
            ...storedRosterItem,
            ...item,
            id: item.swimmerIndexId,
            licenseVerificationStatus: "verified",
            licenseSeasonLabel: season.label,
            licenseSeasonStatus: "valid",
            licenseSeasons: {
              ...(storedRosterItem.licenseSeasons && typeof storedRosterItem.licenseSeasons === "object" ? storedRosterItem.licenseSeasons : {}),
              [season.label]: seasonRecord
            },
            updatedAt: now,
            active: true
          });
          rosterUpdates.get(item.clubId)[rosterKey] = rosterItem;
        }
      });
      rosterUpdates.forEach((swimmers, clubId) => transaction.set(backendContext.engagementClubRosterRef(backendContext.db, clubId), {
        clubId,
        updatedAt: now,
        swimmers
      }, { merge: true }));
    });
    await backendContext.writeAuditLog("engagementSwimmerLicenses.validated", context.uid, {
      season: season.label,
      source,
      count: items.length,
      swimmerIds: items.map((item) => item.swimmerIndexId)
    });
    return { ok: true, season: season.label, source, validatedCount: items.length, validatedAt: now };
  }

  async function getPublicEngagementClubDirectory() {
    const startedAt = Date.now();
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {return await require("./nap-club-directory").directory(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD));}
      catch(error) {throw new backendContext.HttpsError("unavailable",error instanceof RangeError?error.message:"Annuaire NAP indisponible. Reessayez.");}
    }
    const snapshot = await backendContext.publicEngagementClubDirectoryRef().get();
    const clubsById = snapshot.exists && snapshot.data()?.clubs && typeof snapshot.data().clubs === "object"
      ? snapshot.data().clubs
      : {};
    return {
      ok: true,
      clubs: Object.values(clubsById).map(backendContext.publicEngagementClubItem).filter((club) => club.clubId && club.clubName),
      updatedAt: backendContext.cleanText(snapshot.data()?.updatedAt).slice(0, 40),
      readStats: backendContext.portalReadStats("getPublicEngagementClubDirectory", startedAt, {
        baseDocuments: 1,
        variableDocumentsMax: 0
      })
    };
  }

  async function getEngagementClubEntryTimeHistory(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const swimmerIndexId = backendContext.cleanText(request.data?.swimmerIndexId).slice(0, 80);
    if (!competitionId || !swimmerIndexId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition et nageur requis.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      return backendContext.nativeClubEntryTimeHistory(context, competitionId, swimmerIndexId, request.data?.eventCodes);
    }
    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const [competition, entry] = await backendContext.db.getAll(competitionRef, entryRef);
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
    }
    const competitionData = { ...competition.data(), id: competition.id };
    if (competitionData.qualifications?.enabled || backendContext.cleanEngagementMissingEntryTimeMode(competitionData.missingEntryTimeMode) !== "manual") {
      throw new backendContext.HttpsError("failed-precondition", "La modification des temps d'engagement n'est pas autorisee.");
    }
    const swimmer = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
      .map(backendContext.cleanEngagementEntrySwimmer)
      .find((candidate) => candidate.swimmerIndexId === swimmerIndexId);
    if (!swimmer) {
      throw new backendContext.HttpsError("failed-precondition", "Nageur non engage par ce club.");
    }
    const requestedCodes = new Set((Array.isArray(request.data?.eventCodes) ? request.data.eventCodes : [])
      .map((code) => backendContext.cleanText(code).toUpperCase().replace(/\s+/g, ""))
      .filter(Boolean)
      .slice(0, 30));
    const savedCodes = Array.from(new Set((swimmer.individualEntries || [])
      .map((item) => backendContext.cleanText(item.eventCode).toUpperCase().replace(/\s+/g, ""))
      .filter((code) => code && (!requestedCodes.size || requestedCodes.has(code)))));
    const competitionTimeRules = {
      qualificationTimesMode: backendContext.cleanEngagementQualificationTimesMode(competitionData.qualificationTimesMode),
      qualificationStartDate: backendContext.cleanIsoDate(competitionData.qualificationStartDate),
      qualificationEndDate: backendContext.cleanIsoDate(competitionData.qualificationEndDate)
    };
    const rows = savedCodes.length ? await backendContext.getEngagementEntryTimeRowsForSwimmer(swimmer) : [];
    return {
      ok: true,
      swimmerIndexId,
      events: savedCodes.map((eventCode) => ({
        eventCode,
        times: backendContext.engagementKnownTimeHistory(rows, eventCode, competitionTimeRules, 10)
      })),
      readStats: backendContext.portalReadStats("getEngagementClubEntryTimeHistory", startedAt, {
        baseDocuments: savedCodes.length ? 3 : 2,
        variableDocumentsMax: savedCodes.length ? 1 : 0,
        cacheHit: null
      })
    };
  }

  async function previewEngagementClubSwimmerEventTimes(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const swimmerIndexId = backendContext.cleanText(request.data?.swimmerIndexId).slice(0, 80);
    const requestedSource = backendContext.cleanText(request.data?.source);
    const source = requestedSource === "engagement"
      ? "engagement"
      : requestedSource === "reference"
        ? "reference"
        : "performances";
    if (!competitionId || !swimmerIndexId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition et nageur requis.");
    }

    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result=await backendContext.previewNativeClubEntryTimes(context,competitionId,[swimmerIndexId],false);
      return {...result,swimmerIndexId,individualEntries:result.swimmers[0].individualEntries};
    }

    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const [competition, entry] = await backendContext.db.getAll(competitionRef, entryRef);
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
    }

    let swimmer = null;
    if (source === "reference") {
      const reference = backendContext.intranapSwimmersIndex.find((item) => [
        item.id,
        item.swimmerId,
        ...(Array.isArray(item.aliases) ? item.aliases : []),
        ...(Array.isArray(item.sourceIds) ? item.sourceIds : [])
      ].map(backendContext.cleanText).includes(swimmerIndexId));
      if (reference) swimmer = backendContext.engagementReferenceSwimmerItem(reference);
    } else {
      const swimmerDoc = await backendContext.db
        .collection(source === "engagement" ? "engagementClubSwimmers" : backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .doc(swimmerIndexId)
        .get();
      if (swimmerDoc.exists) {
        swimmer = source === "engagement"
          ? backendContext.engagementNewSwimmerItem(swimmerDoc)
          : backendContext.engagementClubSwimmerItem(swimmerDoc);
      }
    }
    if (!swimmer) throw new backendContext.HttpsError("not-found", "Nageur introuvable.");
    if (swimmer.clubId !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Nageur hors perimetre club.");
    }

    const competitionData = { ...competition.data(), id: competition.id };
    const competitionTimeRules = {
      id: competitionId,
      hasQualificationGrants: competitionData.hasQualificationGrants === true,
      qualificationPreview: true,
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
    const eventEntries = backendContext.cleanEngagementCompetitionEvents(competitionData.events || [], {
      strict: false,
      competitionType: backendContext.cleanEngagementCompetitionType(competitionData.competitionType)
    })
      .filter((event) => event.type === "individual")
      .map((event) => ({ eventCode: event.code }));
    const individualEntries = await backendContext.resolveEngagementIndividualEntriesForSwimmer(
      { ...swimmer, swimmerIndexId: swimmer.id || swimmerIndexId, source },
      eventEntries,
      competitionTimeRules
    );
    return {
      ok: true,
      swimmerIndexId,
      individualEntries
    };
  }

  async function previewEngagementClubSwimmerEventTimesBatch(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const swimmerIds = Array.from(new Set((Array.isArray(request.data?.swimmerIndexIds) ? request.data.swimmerIndexIds : [])
      .map((id) => backendContext.cleanText(id).slice(0, 80))
      .filter(Boolean))).slice(0, 50);
    if (!competitionId || !swimmerIds.length) {
      throw new backendContext.HttpsError("invalid-argument", "Competition et nageurs requis.");
    }
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.previewNativeClubEntryTimes(context,competitionId,swimmerIds,true);
    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const [competition, entry] = await backendContext.db.getAll(competitionRef, entryRef);
    if (!competition.exists) throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
    }
    const savedById = new Map((Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
      .map(backendContext.cleanEngagementEntrySwimmer)
      .filter((swimmer) => swimmer.swimmerIndexId)
      .map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    const competitionData = { ...competition.data(), id: competition.id };
    if (backendContext.cleanEngagementCompetitionType(competitionData.competitionType) === "openWater") {
      return {
        ok: true,
        swimmers: swimmerIds.map((swimmerIndexId) => ({ swimmerIndexId, individualEntries: [] })),
        readStats: backendContext.portalReadStats("previewEngagementClubSwimmerEventTimesBatch", startedAt, {
          baseDocuments: 3,
          variableDocumentsMax: 0,
          cacheHit: true
        })
      };
    }
    const competitionTimeRules = {
      id: competitionId,
      hasQualificationGrants: competitionData.hasQualificationGrants === true,
      qualificationPreview: true,
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
    const eventEntries = backendContext.cleanEngagementCompetitionEvents(competitionData.events || [], {
      strict: false,
      competitionType: backendContext.cleanEngagementCompetitionType(competitionData.competitionType)
    })
      .filter((event) => event.type === "individual")
      .map((event) => ({ eventCode: event.code }));
    const swimmers = await Promise.all(swimmerIds.map(async (swimmerIndexId) => {
      const swimmer = savedById.get(swimmerIndexId);
      if (!swimmer) throw new backendContext.HttpsError("failed-precondition", "Enregistrez d'abord les nageurs selectionnes.");
      const individualEntries = await backendContext.resolveEngagementIndividualEntriesForSwimmer(swimmer, eventEntries, competitionTimeRules);
      return { swimmerIndexId, individualEntries };
    }));
    return {
      ok: true,
      swimmers,
      readStats: backendContext.portalReadStats("previewEngagementClubSwimmerEventTimesBatch", startedAt, {
        baseDocuments: 3,
        variableDocumentsMax: swimmerIds.length,
        cacheHit: null
      })
    };
  }

  async function saveEngagementClubIndividualEntries(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.saveNativeClubIndividualEntries(context,request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }

    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const [competition, entry] = await backendContext.db.getAll(competitionRef, entryRef);
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});
    if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
    }

    const competitionData = { ...competition.data(), id: competition.id };
    const openWater = backendContext.cleanEngagementCompetitionType(competitionData.competitionType) === "openWater";
    const competitionEvents = backendContext.cleanEngagementCompetitionEvents(competitionData.events || [], {
      strict: false,
      competitionType: backendContext.cleanEngagementCompetitionType(competitionData.competitionType)
    });
    const allowedIndividualEventCodes = new Set(
      competitionEvents.filter((event) => event.type === "individual").map((event) => event.code)
    );
    const maxEventsPerSwimmer = backendContext.cleanEngagementMaxEventsPerSwimmer(competitionData.maxEventsPerSwimmer);
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
    const savedSwimmers = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
      .map(backendContext.cleanEngagementEntrySwimmer)
      .filter((swimmer) => swimmer.swimmerIndexId);
    const savedSwimmersById = new Map(savedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    const requestedChanges = Array.isArray(request.data?.swimmers) ? request.data.swimmers.slice(0, 100) : [];
    const seen = new Set();

    let changedSwimmers = await Promise.all(requestedChanges.map(async (rawSwimmer) => {
      const swimmerIndexId = backendContext.cleanText(rawSwimmer?.swimmerIndexId).slice(0, 80);
      if (!swimmerIndexId || seen.has(swimmerIndexId)) {
        throw new backendContext.HttpsError("invalid-argument", "Nageur modifie invalide ou duplique.");
      }
      seen.add(swimmerIndexId);
      const savedSwimmer = savedSwimmersById.get(swimmerIndexId);
      if (!savedSwimmer) {
        throw new backendContext.HttpsError("failed-precondition", "Enregistrez d'abord les nageurs selectionnes avant leurs courses.");
      }
      const rawEntries = Array.isArray(rawSwimmer?.individualEntries)
        ? rawSwimmer.individualEntries
        : Array.isArray(rawSwimmer?.individualEventCodes)
          ? rawSwimmer.individualEventCodes
          : [];
      const requestedCodes = rawEntries
        .map((rawEntry) => backendContext.cleanText(rawEntry?.eventCode || rawEntry?.code || rawEntry).toUpperCase().replace(/\s+/g, ""))
        .filter(Boolean);
      if (requestedCodes.some((code) => !allowedIndividualEventCodes.has(code))) {
        throw new backendContext.HttpsError("invalid-argument", "Course individuelle non ouverte sur cette competition.");
      }
      const individualEntries = backendContext.cleanEngagementEntryIndividualEntries(rawEntries, allowedIndividualEventCodes);
      if (maxEventsPerSwimmer > 0 && individualEntries.length > maxEventsPerSwimmer) {
        throw new backendContext.HttpsError("failed-precondition", `Maximum ${maxEventsPerSwimmer} course(s) individuelle(s) par nageur.`);
      }
      const resolvedEntries = openWater
        ? individualEntries.map((entry) => ({ eventCode: entry.eventCode, status: "selected", entryTimeMode: "notRequired" }))
        : await backendContext.resolveEngagementIndividualEntriesForSwimmer(savedSwimmer, individualEntries, competitionTimeRules);
      return backendContext.cleanEngagementEntrySwimmer({
        ...savedSwimmer,
        individualEntries: resolvedEntries
      });
    }));

    if (!openWater && changedSwimmers.some((swimmer) => swimmer.individualEntries.some((entryItem) => entryItem.entryTimeMode === "manual"))) {
      const recordsData = await backendContext.loadPerformanceRecordsData();
      changedSwimmers = backendContext.validateEngagementIndividualEntryTimes(changedSwimmers, competitionTimeRules, recordsData);
    }
    const changedById = new Map(changedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    const now = new Date().toISOString();
    let updatedEntryData = entry.data() || {};
    if (changedSwimmers.length) {
      await backendContext.db.runTransaction(async (transaction) => {
        const latestEntry = await transaction.get(entryRef);
        const latestCompetition = await transaction.get(competitionRef);
        backendContext.assertEngagementClubWriteOpen(latestCompetition.data() || {});
        if (latestCompetition.updateTime.toMillis() !== competition.updateTime.toMillis()) throw new backendContext.HttpsError("aborted", "Les règles ont changé. Rechargez la compétition.");
        if (!latestEntry.exists || !backendContext.engagementTeamLeaderComplete(latestEntry.data()?.teamLeader || {})) {
          throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
        }
        const latestSwimmers = (Array.isArray(latestEntry.data()?.swimmers) ? latestEntry.data().swimmers : [])
          .map(backendContext.cleanEngagementEntrySwimmer)
          .filter((swimmer) => swimmer.swimmerIndexId);
        const latestIds = new Set(latestSwimmers.map((swimmer) => swimmer.swimmerIndexId));
        const missingSwimmer = changedSwimmers.find((swimmer) => !latestIds.has(swimmer.swimmerIndexId));
        if (missingSwimmer) {
          throw new backendContext.HttpsError("failed-precondition", "Un nageur modifie n'est plus selectionne dans cette competition. Rechargez la fiche.");
        }
        const swimmers = latestSwimmers.map((swimmer) => changedById.get(swimmer.swimmerIndexId) || swimmer);
        if (competitionData.qualifications?.enabled && latestSwimmers.some((swimmer) => changedById.has(swimmer.swimmerIndexId) && JSON.stringify(swimmer) !== JSON.stringify(savedSwimmersById.get(swimmer.swimmerIndexId)))) {
          throw new backendContext.HttpsError("aborted", "Les engagements ont changé. Rechargez avant de recommencer.");
        }
        backendContext.qualificationService().revokeRemovedExceptions(transaction, competitionId, latestSwimmers, swimmers, context.uid);
        const relays = backendContext.qualificationRelaysAfterIndividualChange(latestEntry.data()?.relays || [], swimmers, competitionData);
        updatedEntryData = {
          ...(latestEntry.data() || {}),
          swimmers,
          relays,
          updatedAt: now,
          updatedBy: context.uid
        };
        transaction.set(entryRef, {
          swimmers,
          relays,
          updatedAt: now,
          updatedBy: context.uid
        }, { merge: true });
      });
      await backendContext.writeAuditLog("engagementClubEntry.individualEntriesSaved", context.uid, {
        competitionId,
        clubId: context.clubId,
        changedSwimmerCount: changedSwimmers.length,
        individualEntryCount: changedSwimmers.reduce((sum, swimmer) => sum + swimmer.individualEntries.length, 0)
      });
    }
    return {
      ok: true,
      changedSwimmerCount: changedSwimmers.length,
      entry: backendContext.engagementClubEntryItem({
        id: entryRef.id,
        exists: true,
        data: () => updatedEntryData
      })
    };
  }

  async function saveEngagementClubSwimmerSelection(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.saveNativeClubSwimmerSelections(context,request,[{swimmerIndexId:request.data?.swimmer?.swimmerIndexId || request.data?.swimmerIndexId,selected:request.data?.selected}]);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const swimmerIndexId = backendContext.cleanText(request.data?.swimmer?.swimmerIndexId || request.data?.swimmerIndexId).slice(0, 80);
    const selected = request.data?.selected === true;
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (!swimmerIndexId) {
      throw new backendContext.HttpsError("invalid-argument", "Nageur requis.");
    }

    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const competition = await competitionRef.get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});

    let validatedSwimmer = null;
    if (selected) {
      const swimmers = await backendContext.buildEngagementClubSwimmersFromRequest({ swimmers: [request.data?.swimmer || {}] }, context, { ...competition.data(), id: competition.id });
      validatedSwimmer = swimmers[0] || null;
      if (!validatedSwimmer || validatedSwimmer.swimmerIndexId !== swimmerIndexId) {
        throw new backendContext.HttpsError("invalid-argument", "Nageur invalide.");
      }
    }

    const now = new Date().toISOString();
    let changed = false;
    let updatedEntryData = null;
    await backendContext.db.runTransaction(async (transaction) => {
      const entry = await transaction.get(entryRef);
      const currentCompetition = await transaction.get(competitionRef);
      backendContext.assertEngagementClubWriteOpen(currentCompetition.data() || {});
      if (currentCompetition.updateTime.toMillis() !== competition.updateTime.toMillis()) throw new backendContext.HttpsError("aborted", "La compétition a changé. Rechargez la fiche.");
      if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
        throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les nageurs.");
      }
      if (selected && validatedSwimmer) backendContext.assertEngagementSwimmerRoleCompatibility(entry.data() || {}, [validatedSwimmer]);
      const savedSwimmers = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
        .map(backendContext.cleanEngagementEntrySwimmer)
        .filter((swimmer) => swimmer.swimmerIndexId);
      const alreadySelected = savedSwimmers.some((swimmer) => swimmer.swimmerIndexId === swimmerIndexId);
      const swimmers = selected
        ? (alreadySelected ? savedSwimmers : [...savedSwimmers, validatedSwimmer])
        : savedSwimmers.filter((swimmer) => swimmer.swimmerIndexId !== swimmerIndexId);
      const relays = backendContext.qualificationRelaysAfterIndividualChange(entry.data()?.relays || [], swimmers, competition.data() || {});
      changed = selected !== alreadySelected;
      updatedEntryData = {
        ...(entry.data() || {}),
        swimmers,
        relays,
        updatedAt: changed ? now : backendContext.cleanText(entry.data()?.updatedAt),
        updatedBy: changed ? context.uid : backendContext.cleanText(entry.data()?.updatedBy)
      };
      if (!changed) return;
      backendContext.qualificationService().revokeRemovedExceptions(transaction, competitionId, savedSwimmers, swimmers, context.uid);
      transaction.set(entryRef, {
        swimmers,
        relays,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
      if (!selected || !validatedSwimmer) return;
      if (validatedSwimmer.licenseNumber && !validatedSwimmer.licenseLocked && validatedSwimmer.source !== "reference") {
        const swimmerCollection = validatedSwimmer.source === "engagement" ? "engagementClubSwimmers" : backendContext.PERFORMANCE_SWIMMERS_COLLECTION;
        transaction.set(backendContext.db.collection(swimmerCollection).doc(validatedSwimmer.swimmerIndexId), {
          licenseNumber: backendContext.cleanText(validatedSwimmer.licenseNumber).slice(0, 60),
          licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(validatedSwimmer.licenseVerificationStatus, "pending"),
          licenseSeasonLabel: backendContext.cleanText(validatedSwimmer.licenseSeasonLabel).slice(0, 20),
          licenseSeasonStatus: backendContext.cleanEngagementLicenseSeasonStatus(validatedSwimmer.licenseSeasonStatus, "to_check"),
          licenseUpdatedAt: now,
          licenseUpdatedBy: context.uid,
          updatedAt: now,
          updatedBy: context.uid
        }, { merge: true });
      }
      if (validatedSwimmer.licenseNumber && !validatedSwimmer.licenseLocked) {
        const licenseRef = backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.engagementSwimmerLicenseId(validatedSwimmer));
        transaction.set(licenseRef, {
          ...backendContext.engagementSwimmerLicensePayload(validatedSwimmer, context, {
            type: "engagement",
            verificationSource: "club",
            competitionId,
            collectedAt: now
          }),
          updatedAt: now,
          updatedBy: context.uid
        }, { merge: true });
      }
      backendContext.upsertEngagementClubRosterSwimmer(transaction, backendContext.db, validatedSwimmer, now);
    });

    if (changed) {
      await backendContext.writeAuditLog(selected ? "engagementClubEntry.swimmerAdded" : "engagementClubEntry.swimmerRemoved", context.uid, {
        competitionId,
        clubId: context.clubId,
        swimmerIndexId
      });
    }
    return {
      ok: true,
      changed,
      selected,
      entry: backendContext.engagementClubEntryItem({
        id: entryRef.id,
        exists: true,
        data: () => updatedEntryData || {}
      })
    };
  }

  async function saveEngagementClubSwimmerSelections(request) {
    const startedAt = Date.now();
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.saveNativeClubSwimmerSelections(context,request,request.data?.changes);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const rawChanges = Array.isArray(request.data?.changes) ? request.data.changes.slice(0, 50) : [];
    if (!competitionId || !rawChanges.length) {
      throw new backendContext.HttpsError("invalid-argument", "Competition et modifications requises.");
    }
    const changes = [];
    const seen = new Set();
    rawChanges.forEach((rawChange) => {
      const swimmerIndexId = backendContext.cleanText(rawChange?.swimmer?.swimmerIndexId || rawChange?.swimmerIndexId).slice(0, 80);
      if (!swimmerIndexId || seen.has(swimmerIndexId)) {
        throw new backendContext.HttpsError("invalid-argument", "Modification de nageur invalide ou dupliquee.");
      }
      seen.add(swimmerIndexId);
      changes.push({
        swimmerIndexId,
        selected: rawChange?.selected === true,
        swimmer: rawChange?.swimmer || {}
      });
    });

    const competitionRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const competition = await competitionRef.get();
    if (!competition.exists) throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});

    const selectedChanges = changes.filter((change) => change.selected);
    const validatedSwimmers = selectedChanges.length
      ? await backendContext.buildEngagementClubSwimmersFromRequest({ swimmers: selectedChanges.map((change) => change.swimmer) }, context, { ...competition.data(), id: competition.id })
      : [];
    const validatedById = new Map(validatedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
    selectedChanges.forEach((change) => {
      if (!validatedById.has(change.swimmerIndexId)) throw new backendContext.HttpsError("invalid-argument", "Nageur invalide.");
    });

    const now = new Date().toISOString();
    let changedCount = 0;
    let updatedEntryData = null;
    await backendContext.db.runTransaction(async (transaction) => {
      const entry = await transaction.get(entryRef);
      const currentCompetition = await transaction.get(competitionRef);
      backendContext.assertEngagementClubWriteOpen(currentCompetition.data() || {});
      if (currentCompetition.updateTime.toMillis() !== competition.updateTime.toMillis()) throw new backendContext.HttpsError("aborted", "La compétition a changé. Rechargez la fiche.");
      if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
        throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les nageurs.");
      }
      backendContext.assertEngagementSwimmerRoleCompatibility(entry.data() || {}, validatedSwimmers);
      const savedSwimmers = (Array.isArray(entry.data()?.swimmers) ? entry.data().swimmers : [])
        .map(backendContext.cleanEngagementEntrySwimmer)
        .filter((swimmer) => swimmer.swimmerIndexId);
      const swimmersById = new Map(savedSwimmers.map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
      changes.forEach((change) => {
        const existed = swimmersById.has(change.swimmerIndexId);
        if (change.selected) {
          if (!existed) {
            swimmersById.set(change.swimmerIndexId, validatedById.get(change.swimmerIndexId));
            changedCount += 1;
          }
        } else if (existed) {
          swimmersById.delete(change.swimmerIndexId);
          changedCount += 1;
        }
      });
      const swimmers = Array.from(swimmersById.values());
      const relays = backendContext.qualificationRelaysAfterIndividualChange(entry.data()?.relays || [], swimmers, competition.data() || {});
      updatedEntryData = {
        ...(entry.data() || {}),
        swimmers,
        relays,
        updatedAt: changedCount ? now : backendContext.cleanText(entry.data()?.updatedAt),
        updatedBy: changedCount ? context.uid : backendContext.cleanText(entry.data()?.updatedBy)
      };
      if (!changedCount) return;
      backendContext.qualificationService().revokeRemovedExceptions(transaction, competitionId, savedSwimmers, swimmers, context.uid);
      transaction.set(entryRef, { swimmers, relays, updatedAt: now, updatedBy: context.uid }, { merge: true });
      validatedSwimmers.forEach((swimmer) => {
        if (!swimmer.licenseNumber || swimmer.licenseLocked) return;
        if (swimmer.source !== "reference") {
          const swimmerCollection = swimmer.source === "engagement" ? "engagementClubSwimmers" : backendContext.PERFORMANCE_SWIMMERS_COLLECTION;
          transaction.set(backendContext.db.collection(swimmerCollection).doc(swimmer.swimmerIndexId), {
            licenseNumber: backendContext.cleanText(swimmer.licenseNumber).slice(0, 60),
            licenseVerificationStatus: backendContext.cleanEngagementLicenseVerificationStatus(swimmer.licenseVerificationStatus, "pending"),
            licenseSeasonLabel: backendContext.cleanText(swimmer.licenseSeasonLabel).slice(0, 20),
            licenseSeasonStatus: backendContext.cleanEngagementLicenseSeasonStatus(swimmer.licenseSeasonStatus, "to_check"),
            licenseUpdatedAt: now,
            licenseUpdatedBy: context.uid,
            updatedAt: now,
            updatedBy: context.uid
          }, { merge: true });
        }
        transaction.set(backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.engagementSwimmerLicenseId(swimmer)), {
          ...backendContext.engagementSwimmerLicensePayload(swimmer, context, {
            type: "engagement",
            verificationSource: "club",
            competitionId,
            collectedAt: now
          }),
          updatedAt: now,
          updatedBy: context.uid
        }, { merge: true });
        backendContext.upsertEngagementClubRosterSwimmer(transaction, backendContext.db, swimmer, now);
      });
    });
    if (changedCount) {
      await backendContext.writeAuditLog("engagementClubEntry.swimmerSelectionsSaved", context.uid, {
        competitionId,
        clubId: context.clubId,
        requestedChangeCount: changes.length,
        changedCount
      });
    }
    return {
      ok: true,
      requestedChangeCount: changes.length,
      changedCount,
      readStats: backendContext.portalReadStats("saveEngagementClubSwimmerSelections", startedAt, {
        baseDocuments: 3,
        variableDocumentsMax: selectedChanges.length * 3,
        cacheHit: null
      }),
      entry: backendContext.engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedEntryData || {} })
    };
  }

  async function saveEngagementClubRelays(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.saveNativeClubRelays(context,request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    const entry = await entryRef.get();
    if (!entry.exists || !backendContext.engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
      throw new backendContext.HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les relais.");
    }
    const entryData = entry.data() || {};
    const removeRelayId = backendContext.cleanText(request.data?.removeRelayId).slice(0, 128);
    if (removeRelayId) {
      // A deletion must not validate unrelated, possibly incomplete compositions.
      const now = new Date().toISOString();
      let updatedData;
      await backendContext.db.runTransaction(async (transaction) => {
        const currentCompetition = await transaction.get(competition.ref);
        const currentEntry = await transaction.get(entryRef);
        backendContext.assertEngagementClubWriteOpen(currentCompetition.data() || {});
        if (!currentEntry.exists) throw new backendContext.HttpsError("not-found", "Engagements introuvables.");
        const data = currentEntry.data();
        const relays = (data.relays || []).filter((relay) => relay.relayId !== removeRelayId);
        updatedData = { ...data, relays, updatedAt: now, updatedBy: context.uid };
        transaction.set(entryRef, { relays, updatedAt: now, updatedBy: context.uid }, { merge: true });
      });
      await backendContext.writeAuditLog("engagementClubEntry.relayDeleted", context.uid, { competitionId, clubId: context.clubId, relayId: removeRelayId });
      return { ok: true, entry: backendContext.engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedData }) };
    }
    const swimmers = (Array.isArray(entryData.swimmers) ? entryData.swimmers : [])
      .map(backendContext.cleanEngagementEntrySwimmer)
      .filter((swimmer) => swimmer.swimmerIndexId);
    const competitionData = { ...competition.data(), id: competition.id };
    const events = backendContext.cleanEngagementCompetitionEvents(competitionData.events || [], {
      strict: false,
      competitionType: backendContext.cleanEngagementCompetitionType(competitionData.competitionType)
    });
    let relays = backendContext.cleanEngagementEntryRelays(request.data?.relays || [], {
      date: backendContext.cleanIsoDate(competitionData.date),
      competitionType: backendContext.cleanEngagementCompetitionType(competitionData.competitionType),
      events
    }, swimmers);
    if (relays.length && backendContext.cleanEngagementCompetitionType(competitionData.competitionType) !== "openWater") {
      const recordsData = await backendContext.loadPerformanceRecordsData();
      relays = backendContext.validateEngagementRelayEntryTimes(relays, {
        date: backendContext.cleanIsoDate(competitionData.date),
        poolLength: backendContext.cleanEngagementPoolLength(competitionData.poolLength),
        timingType: backendContext.cleanEngagementTimingType(competitionData.timingType)
      }, recordsData);
    }
    if (competitionData.qualifications?.enabled) {
      const evaluations = {};
      const memberIds = new Set(relays.flatMap((relay) => relay.memberIds || []));
      for (const swimmer of swimmers.filter((item) => memberIds.has(item.swimmerIndexId) && item.individualEntries?.length)) {
        evaluations[swimmer.swimmerIndexId] = await backendContext.qualificationService().evaluate(swimmer, { ...competitionData, id: competitionId });
      }
      if (relays.some((relay) => !backendContext.qualificationEngine.relayEligible(relay, swimmers, evaluations))) {
        throw new backendContext.HttpsError("failed-precondition", "Chaque relais composé doit comprendre un nageur qualifié et engagé sur une course individuelle qualifiée. Une composition vide peut être renseignée lors de la compétition.");
      }
    }
    const now = new Date().toISOString();
    await backendContext.db.runTransaction(async (transaction) => {
      const currentCompetition = await transaction.get(competition.ref);
      const currentEntry = await transaction.get(entryRef);
      backendContext.assertEngagementClubWriteOpen(currentCompetition.data() || {});
      if (currentCompetition.updateTime.toMillis() !== competition.updateTime.toMillis() || currentEntry.updateTime.toMillis() !== entry.updateTime.toMillis()) throw new backendContext.HttpsError("aborted", "Les engagements ont changé. Rechargez la fiche.");
      transaction.set(entryRef, { relays, updatedAt: now, updatedBy: context.uid }, { merge: true });
    });
    await backendContext.writeAuditLog("engagementClubEntry.relaysSaved", context.uid, {
      competitionId,
      clubId: context.clubId,
      relayCount: relays.length
    });
    const updatedData = { ...entryData, relays, updatedAt: now, updatedBy: context.uid };
    return {
      ok: true,
      entry: backendContext.engagementClubEntryItem({ id: entryRef.id, exists: true, data: () => updatedData })
    };
  }

  return { getEngagementClubEntry, generateEngagementClubRecapPdf, listEngagementCompetitionClubRecaps, generateEngagementClubRecapPdfForAdmin, generateEngagementCompetitionClubRecapPdfs, saveEngagementClubTeamLeader, removeEngagementClubTeamLeader, listEngagementClubPeople, saveEngagementClubPerson, setEngagementClubPersonStatus, saveEngagementClubOfficials, listEngagementClubSwimmers, setEngagementClubSwimmerActivityStatus, previewEngagementClubSwimmerCreation, previewEngagementClubSwimmerRecovery, recoverEngagementClubSwimmer, createEngagementClubSwimmer, validateEngagementSwimmerLicenses, getPublicEngagementClubDirectory, getEngagementClubEntryTimeHistory, previewEngagementClubSwimmerEventTimes, previewEngagementClubSwimmerEventTimesBatch, saveEngagementClubIndividualEntries, saveEngagementClubSwimmerSelection, saveEngagementClubSwimmerSelections, saveEngagementClubRelays };
}

module.exports = { createClubHandlers };
