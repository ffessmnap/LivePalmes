// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_createCompetitionImport(backendContext) {
  async function createCompetitionImport(request) {
    backendContext.assertCapability(request, "competitions.import");
    if(request.data?.sourceType==="winpalme-zip-preview"&&!backendContext.authorizeNativePerformance(request).national)throw new backendContext.HttpsError("permission-denied","L’enregistrement ZIP est réservé à l’administration nationale.");
    if(request.data?.sourceType==="winpalme-zip-preview"&&backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("failed-precondition","Le dépôt ZIP nécessite la source NAP.");
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      if(request.data?.sourceType==="international-xlsx"||request.data?.workbook)throw new backendContext.HttpsError("failed-precondition","Import Excel NAP non disponible pour le moment.");
      try{return await require("../../nap-import-write").createNativeImportWriter({authorize:backendContext.authorizeNativePerformance,getPool:()=>require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),protocolStorage:require("../../nap-import-protocol-storage").createProtocolStorage(backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET))})(request);}
      catch(error){throw backendContext.nativePerformanceFailure(error);}
    }
    const fileName = backendContext.cleanText(request.data?.fileName).slice(0, 180);
    const confirmImportId = backendContext.cleanText(request.data?.importId);
    const parsed = backendContext.parseCompetitionImportPayload(request.data || {});
    if (!backendContext.cleanTimingType(parsed.metadata?.timingType)) {
      throw new backendContext.HttpsError("failed-precondition", "Le type de chronometrage electronique ou manuel est obligatoire.");
    }
    if (!parsed.performances.length) {
      throw new backendContext.HttpsError("failed-precondition", "Aucune performance importable dans ce fichier.");
    }
    const fileHash = backendContext.stableHash(parsed.fileHashSeed || "");
    const importId = backendContext.importDocumentId(parsed.metadata, fileHash);
    const recordAlerts = backendContext.detectRecordAlerts(parsed.performances, await backendContext.loadPerformanceRecordsData());
    if (confirmImportId && confirmImportId !== importId) {
      throw new backendContext.HttpsError("invalid-argument", "Le fichier ne correspond plus a la previsualisation.");
    }

    const importRef = backendContext.db.collection("performanceImports").doc(importId);
    const existing = await importRef.get();
    const existingData = existing.exists ? existing.data() || {} : {};
    if (existing.exists && existingData.status !== "deleted" && request.data?.overwrite !== true) {
      throw new backendContext.HttpsError("already-exists", "Cette competition semble deja importee.");
    }

    const now = new Date().toISOString();
    const actorUid = request.auth.uid;
    const actorEmail = request.auth.token?.email || "";
    const replacedImportId = backendContext.cleanText(request.data?.replaceImportId).slice(0, 160);
    if (replacedImportId) {
      return backendContext.stageCompetitionImportReplacement({
        parsed,
        importId,
        fileName,
        fileHash,
        recordAlerts,
        replacedImportId,
        actorUid,
        actorEmail,
        now
      });
    }
    const batches = [];
    let batch = backendContext.db.batch();
    let batchSize = 0;

    function commitIfNeeded(force = false) {
      if (batchSize >= 450 || (force && batchSize > 0)) {
        batches.push(batch.commit());
        batch = backendContext.db.batch();
        batchSize = 0;
      }
    }

    const rawImportedPerformances = [];

    batch.set(importRef, {
      importId,
      competitionKey: backendContext.competitionImportIdentity(parsed.metadata),
      status: "stored",
      sourceType: parsed.sourceType || "ffessm-txt",
      fileName,
      fileHash,
      competitionName: parsed.metadata.competitionName,
      timingType: parsed.metadata.timingType,
      chrono: parsed.metadata.chrono,
      metadata: parsed.metadata,
      summary: parsed.summary,
      warnings: parsed.warnings,
      recordAlerts: recordAlerts.slice(0, 100),
      recordAlertCount: recordAlerts.length,
      duplicateDetails: parsed.duplicateDetails.slice(0, 50),
      importedBy: actorUid,
      importedByEmail: actorEmail,
      importedAt: now,
      updatedAt: now,
      publicationStatus: "pending",
      publicationUpdatedAt: now,
      publicationError: ""
    }, { merge: false });
    batchSize += 1;

    parsed.clubs.forEach((club) => {
      const clubRef = importRef.collection("clubs").doc(club.code || backendContext.stableHash(JSON.stringify(club)).slice(0, 20));
      batch.set(clubRef, {
        ...club,
        importId,
        updatedAt: now
      }, { merge: false });
      batchSize += 1;
      commitIfNeeded();
    });

    parsed.performances.forEach((perf) => {
      const perfId = backendContext.competitionImportPerformanceId(importId, perf);
      const perfRef = importRef.collection("performances").doc(perfId);
      const storedPerf = {
        ...perf,
        performanceId: perfId,
        importId,
        competitionName: parsed.metadata.competitionName,
        metadata: parsed.metadata,
        importedBy: actorUid,
        importedAt: now,
        updatedAt: now,
        updatedBy: actorUid
      };
      rawImportedPerformances.push({
        id: perfId,
        ...storedPerf
      });
      batch.set(perfRef, storedPerf, { merge: false });
      batchSize += 1;
      commitIfNeeded();
    });

    commitIfNeeded(true);
    await Promise.all(batches);

    let performanceBaseSync = null;
    const normalizedImportedPerformances = backendContext.normalizeLivePalmesImportPerformances(rawImportedPerformances);
    try {
      performanceBaseSync = await backendContext.writePerformanceBaseRows(normalizedImportedPerformances, {
        actorUid,
        actorEmail,
        now,
        importId,
        action: "performanceImport.synced",
        changeSeed: importId
      });
      await importRef.set({
        performanceBaseSyncedAt: now,
        performanceBaseCount: performanceBaseSync.written
      }, { merge: true });
    } catch (error) {
      console.error("Synchronisation performances impossible apres import", {
        importId,
        message: error?.message || String(error)
      });
      performanceBaseSync = {
        ok: false,
        error: error?.message || "Synchronisation performances impossible."
      };
    }

    let clubActivityReactivation = null;
    try {
      clubActivityReactivation = await backendContext.reactivateEngagementClubRosterSwimmersFromPerformanceRows(normalizedImportedPerformances, {
        now,
        actorUid
      });
    } catch (error) {
      console.warn("Réactivation des nageurs de club impossible après import", {
        importId,
        message: error?.message || String(error)
      });
      clubActivityReactivation = { ok: false, error: error?.message || String(error) };
    }

    await backendContext.writeAuditLog("performanceImport.created", actorUid, {
      importId,
      fileName,
      fileHash,
      competitionName: parsed.metadata.competitionName,
      date: parsed.metadata.date,
      timingType: parsed.metadata.timingType,
      chrono: parsed.metadata.chrono,
      importedPerformances: parsed.summary.importedPerformances,
      performanceBaseSync,
      clubActivityReactivation
    });

    const publication = await backendContext.publishCompetitionImportOutputs(normalizedImportedPerformances, importRef, {
      importId,
      now
    });

    return {
      ok: true,
      importId,
      sourceType: parsed.sourceType,
      metadata: parsed.metadata,
      summary: parsed.summary,
      warnings: parsed.warnings,
      recordAlerts: recordAlerts.slice(0, 100),
      recordAlertCount: recordAlerts.length,
      duplicateDetails: parsed.duplicateDetails.slice(0, 50),
      performanceBaseSync,
      clubActivityReactivation,
      publicationStatus: publication.publicationStatus,
      publicSnapshot: publication.publicSnapshot,
      publicFilesSnapshot: publication.publicFilesSnapshot
    };
  }

  return { createCompetitionImport };
}

module.exports = { createPerformanceHandlers_createCompetitionImport };
