// Preserve the execution mode of the existing index.js function bodies.

// Existing callable bodies only. Firebase registrations stay in index.js.
// This factory performs no I/O and retains live access to its explicit services.
function createPerformanceHandlers(backendContext) {
  async function storeCompetitionPdf(request) {
    const competitionId = backendContext.competitionIdFrom(request.data || {});
    await backendContext.assertComputerPdfAccess(request, competitionId);
    const kind = backendContext.cleanText(request.data?.kind);
    const id = backendContext.cleanText(request.data?.id).slice(0, 180);
    const pdfName = backendContext.cleanText(request.data?.pdfName).slice(0, 220) || "document.pdf";
    if (!id) throw new backendContext.HttpsError("invalid-argument", "Identifiant PDF requis.");
    let buffer;
    let storagePath;
    try {
      buffer = backendContext.decodePdfDataUrl(request.data?.pdfDataUrl);
      storagePath = backendContext.publicPdfStoragePath({ competitionId, kind, id, buffer });
    } catch (error) {
      throw new backendContext.HttpsError("invalid-argument", error?.message || "PDF invalide.");
    }
    const bucket = backendContext.storage.bucket(backendContext.PUBLIC_PERFORMANCE_BUCKET);
    await bucket.file(storagePath).save(buffer, {
      resumable: false,
      contentType: "application/pdf",
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
        contentDisposition: `inline; filename="${pdfName.replace(/["\r\n]/g, "_")}"`
      }
    });
    return {
      ok: true,
      id,
      kind,
      pdfName,
      pdfSize: buffer.length,
      storagePath,
      pdfUrl: backendContext.publicStorageUrl(backendContext.PUBLIC_PERFORMANCE_BUCKET, storagePath)
    };
  }

  async function deleteCompetitionPdf(request) {
    const competitionId = backendContext.competitionIdFrom(request.data || {});
    await backendContext.assertComputerPdfAccess(request, competitionId);
    const storagePath = backendContext.cleanText(request.data?.storagePath).slice(0, 600);
    const expectedPrefix = `${backendContext.PUBLIC_COMPETITION_PDF_PREFIX}/${competitionId}/`;
    if (!storagePath.startsWith(expectedPrefix) || storagePath.includes("..")) {
      throw new backendContext.HttpsError("invalid-argument", "Chemin PDF invalide.");
    }
    await backendContext.storage.bucket(backendContext.PUBLIC_PERFORMANCE_BUCKET).file(storagePath).delete({ ignoreNotFound: true });
    return { ok: true, storagePath };
  }

  async function updateEngagementNationalSwimmerIdentity(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Correction reservee au niveau national.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap" && request.data?.napSource !== true) throw new backendContext.HttpsError("failed-precondition", "Rechargez la recherche NAP avant de corriger cette fiche.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap" && request.data?.napSource === true) {
      const nap = require("./nap-portal-swimmers");
      try {
        const proposed = request.data.proposed || {};
        return await (proposed.clubId !== undefined || proposed.licenseNumber !== undefined ? require("./nap-national-swimmer-correction").correctNationalSwimmer : nap.correctPortalIdentity)(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {
          id: request.data.swimmerId, expectedFingerprint: request.data.expectedFingerprint, expectedLicenseNumber: request.data.expectedLicenseNumber, proposed,
          previewOnly: request.data.previewOnly===true, historicalClubConfirmation: request.data.historicalClubConfirmation,
          actorUid: context.uid, reason: backendContext.cleanText(request.data.reason)
        }, {
          read: async operation => {
            const snapshot = await backendContext.db.collection("auditLogs").doc(`nap-identity-${operation}-before`).get();
            return snapshot.exists ? snapshot.data().target : null;
          },
          prepare: (operation, target) => backendContext.db.collection("auditLogs").doc(`nap-identity-${operation}-before`).create({ action: "nap.swimmer.identityCorrection.prepare", actorUid: context.uid, target, createdAt: new Date().toISOString() }),
          complete: (operation, target) => backendContext.writeAuditLogOnce("nap.swimmer.identityCorrected", context.uid,{...target,auditPreparationId:`nap-identity-${operation}-before`}, operation)
        }, {
          prepare: async () => [],
          apply: async () => ({ entryUpdateCount: 0, relayUpdateCount: 0, oldLivepalmesLinksIgnored: true })
        });
      } catch (error) {
        throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable", error instanceof TypeError || error instanceof RangeError ? error.message : "Correction a verifier. Rechargez la recherche ou reprenez la meme correction ; sa sauvegarde est conservee.");
      }
    }
    const target = await backendContext.getEngagementSwimmerCorrectionTarget(
      backendContext.db,
      request.data?.source,
      request.data?.swimmerId,
      request.data?.identityKey
    );
    const current = backendContext.engagementSwimmerIdentitySnapshot(target.swimmer, target.source);
    const correction = backendContext.cleanEngagementSwimmerIdentityCorrection(request.data?.proposed || {}, current);
    const reason = backendContext.cleanText(request.data?.reason).slice(0, 500);
    if (!reason) throw new backendContext.HttpsError("invalid-argument", "Le motif de la correction est obligatoire.");
    const now = new Date().toISOString();
    const result = await backendContext.applyEngagementSwimmerIdentityCorrection(target, correction, { ...context, now });
    await backendContext.writeAuditLog("engagementClubSwimmer.identityCorrected", context.uid, {
      swimmerId: target.swimmerId,
      source: target.source,
      reason,
      current,
      proposed: result.swimmer,
      performanceUpdateCount: Number(result.performanceUpdateCount || 0),
      entryUpdateCount: Number(result.entryUpdateCount || 0),
      relayUpdateCount: Number(result.relayUpdateCount || 0)
    });
    return { ok: true, ...result };
  }

  async function mergeEngagementNationalClubSwimmer(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Fusion reservee au niveau national.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      if (request.data?.confirmMerge !== true) throw new backendContext.HttpsError("failed-precondition", "Confirmation de fusion requise.");
      try {
        return await require("./nap-swimmer-merge").mergeSwimmers(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
          sourceSwimmerId:request.data?.sourceSwimmerId,targetSwimmerId:request.data?.targetSwimmerId,
          ...(request.data?.finalClubId!==undefined?{finalClubId:request.data.finalClubId}:{}),
          ...(request.data?.entryConflictChoices!==undefined?{entryConflictChoices:request.data.entryConflictChoices,entryConflictToken:request.data.entryConflictToken}:{}),
          sourceFingerprint:request.data?.sourceFingerprint,targetFingerprint:request.data?.targetFingerprint,
          sourceLicenseNumber:request.data?.sourceLicenseNumber,targetLicenseNumber:request.data?.targetLicenseNumber,
          actorUid:context.uid,confirmMerge:true,confirmClubMismatch:request.data?.confirmClubMismatch===true,confirmLicenseMismatch:request.data?.confirmLicenseMismatch===true
        },require("./nap-swimmer-merge-audit").createAudit(backendContext.db,{sourceSwimmerId:request.data?.sourceSwimmerId,targetSwimmerId:request.data?.targetSwimmerId,actorUid:context.uid},backendContext.writeAuditLogOnce),async()=>{if(!context.national)throw new TypeError("Fusion reservee au niveau national.");});
      } catch(error) {
        if(error instanceof TypeError&&error.mergeConflicts)return {ok:false,mergeConflicts:error.mergeConflicts};
        if(error instanceof backendContext.HttpsError)throw error;
        throw new backendContext.HttpsError(error instanceof TypeError||error instanceof RangeError?"failed-precondition":"unavailable",error instanceof TypeError||error instanceof RangeError?error.message:"Fusion NAP interrompue. Conservez les deux fiches choisies et reprenez la meme demande.");
      }
    }
    const sourceSwimmerId = backendContext.cleanText(request.data?.sourceSwimmerId).slice(0, 80);
    const sourceSource = backendContext.cleanText(request.data?.sourceSource || "engagement").slice(0, 40);
    const sourceIdentityKey = backendContext.cleanText(request.data?.sourceIdentityKey).slice(0, 180);
    const targetSwimmerId = backendContext.cleanText(request.data?.targetSwimmerId).slice(0, 80);
    const targetSource = backendContext.cleanText(request.data?.targetSource || "performances").slice(0, 40);
    const targetIdentityKey = backendContext.cleanText(request.data?.targetIdentityKey).slice(0, 180);
    if (!sourceSwimmerId || !targetSwimmerId || (sourceSource === targetSource && sourceSwimmerId === targetSwimmerId)) {
      throw new backendContext.HttpsError("invalid-argument", "Nageurs source et cible requis.");
    }
    if (request.data?.confirmMerge !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation de fusion requise.");
    }
    const recoveryContext = { uid: context.uid, now: new Date().toISOString() };
    const source = await backendContext.getEngagementNationalSwimmerForMerge(backendContext.db, sourceSource, sourceSwimmerId, sourceIdentityKey, recoveryContext);
    const target = await backendContext.getEngagementNationalSwimmerForMerge(backendContext.db, targetSource, targetSwimmerId, targetIdentityKey, recoveryContext);
    if (source.ref.path === target.ref.path) {
      throw new backendContext.HttpsError("invalid-argument", "Les deux selections correspondent a la meme fiche nageur.");
    }
    const sourceSwimmer = source.swimmer;
    const targetSwimmer = target.swimmer;
    const sourceMergeIds = backendContext.swimmerMergeIds(sourceSwimmer, sourceSwimmerId).slice(0, 25);
    const resolvedSourceSwimmerId = source.ref.id;
    const resolvedTargetSwimmerId = target.ref.id;
    if (sourceSwimmer.status === "merged" || sourceSwimmer.mergedIntoId) {
      throw new backendContext.HttpsError("failed-precondition", "Ce nageur est deja fusionne.");
    }
    if (targetSwimmer.status === "merged" || targetSwimmer.mergedIntoId) {
      throw new backendContext.HttpsError("failed-precondition", "La fiche cible est deja fusionnee vers une autre fiche.");
    }
    const clubMismatch = Boolean(sourceSwimmer.clubId && targetSwimmer.clubId && sourceSwimmer.clubId !== targetSwimmer.clubId);
    if (clubMismatch && request.data?.confirmClubMismatch !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Les clubs sont differents. Confirmation speciale requise.", {
        code: "club-mismatch"
      });
    }
    const licenseMismatch = Boolean(sourceSwimmer.licenseNumber && targetSwimmer.licenseNumber && sourceSwimmer.licenseNumber !== targetSwimmer.licenseNumber);
    if (licenseMismatch && request.data?.confirmLicenseMismatch !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Les numeros de licence sont differents. Confirmation speciale requise.", {
        code: "license-mismatch"
      });
    }
    const performanceDocs = source.performanceRows?.length
      ? source.performanceRows.map((row) => {
          const id = backendContext.cleanText(row.performanceBaseId || backendContext.performanceBaseDocId(row));
          return { id, ref: backendContext.db.collection(backendContext.PERFORMANCE_BASE_COLLECTION).doc(id), data: () => row };
        }).filter((doc) => doc.id)
      : await backendContext.readPerformanceDocsForNationalSwimmerMerge(backendContext.db, sourceSwimmer, sourceSwimmerId, 180);
    const now = new Date().toISOString();
    const targetName = backendContext.engagementNationalSwimmerFullName(targetSwimmer);
    const targetSnapshot = backendContext.engagementNationalSwimmerEntrySnapshot(targetSwimmer, target.source);
    const entriesSnapshot = sourceSwimmer.clubId
      ? await backendContext.db.collection("engagementClubEntries").where("clubId", "==", sourceSwimmer.clubId).limit(300).get()
      : { docs: [], size: 0 };
    const batch = backendContext.db.batch();
    const targetPayload = {
      active: true,
      status: "active",
      mergedSourceIds: backendContext.FieldValue.arrayUnion(...sourceMergeIds),
      updatedAt: now,
      updatedBy: context.uid
    };
    if (!targetSwimmer.licenseNumber && sourceSwimmer.licenseNumber) {
      targetPayload.licenseNumber = sourceSwimmer.licenseNumber;
      targetSnapshot.licenseNumber = sourceSwimmer.licenseNumber;
    }
    const sourcePayload = {
      active: false,
      status: "merged",
      mergedIntoId: resolvedTargetSwimmerId,
      mergedIntoSource: target.source,
      mergedIntoName: targetName,
      mergedAt: now,
      mergedBy: context.uid,
      updatedAt: now,
      updatedBy: context.uid
    };
    batch.set(target.ref, targetPayload, { merge: true });
    batch.set(source.ref, sourcePayload, { merge: true });
    backendContext.upsertEngagementClubRosterSwimmer(batch, backendContext.db, { ...targetSwimmer, ...targetPayload, swimmerIndexId: targetSwimmer.swimmerIndexId || targetSwimmer.id, source: target.source }, now);
    sourceMergeIds.forEach((sourceId) => {
      backendContext.deleteEngagementClubRosterSwimmer(batch, backendContext.db, { ...sourceSwimmer, id: sourceId, swimmerIndexId: sourceId, source: source.source }, now);
      backendContext.deleteEngagementEntryTimeCache(batch, backendContext.db, { source: source.source, swimmerIndexId: sourceId });
    });
    backendContext.deleteEngagementEntryTimeCache(batch, backendContext.db, { source: target.source, swimmerIndexId: targetSwimmer.swimmerIndexId || targetSwimmer.id });
    if (source.source === "performances") {
      const pageCount = Math.min(50, Math.max(0, Math.trunc(Number(source.snapshot.data()?.pageCount || 0) || 0)));
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        batch.delete(backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(backendContext.performanceSwimmerPageId(resolvedSourceSwimmerId, pageIndex)));
      }
    }
    let entrySwimmerUpdateCount = 0;
    let relayUpdateCount = 0;
    entriesSnapshot.docs.forEach((entryDoc) => {
      const entry = entryDoc.data() || {};
      const updates = {};
      const swimmersResult = backendContext.mergeEngagementClubEntrySwimmers(entry.swimmers || [], sourceMergeIds, targetSnapshot);
      if (swimmersResult.changed) {
        updates.swimmers = swimmersResult.swimmers;
        entrySwimmerUpdateCount += 1;
      }
      const relaysResult = backendContext.mergeEngagementClubEntryRelays(entry.relays || [], sourceMergeIds, targetSnapshot);
      if (relaysResult.changed) {
        updates.relays = relaysResult.relays;
        relayUpdateCount += 1;
      }
      if (Object.keys(updates).length) {
        batch.set(entryDoc.ref, {
          ...updates,
          updatedAt: now,
          updatedBy: context.uid
        }, { merge: true });
      }
    });
    const updatedPerformanceRows = [];
    const performanceTarget = backendContext.performanceMergeTargetPayloadFromSwimmer({ ...targetSwimmer, ...targetPayload });
    performanceDocs.forEach((doc) => {
      const before = doc.data() || {};
      const row = backendContext.publicPerformanceBaseRow({ performanceBaseId: doc.id, ...before });
      const updated = backendContext.cleanFirestoreValue({
        ...performanceTarget,
        originalSwimmerId: backendContext.cleanText(row.originalSwimmerId || row.swimmerId || sourceSwimmerId).slice(0, 80),
        updatedAt: now,
        updatedBy: context.uid,
        sourceAction: "engagement.swimmerMerged"
      });
      batch.set(doc.ref, updated, { merge: true });
      updatedPerformanceRows.push(backendContext.publicPerformanceBaseRow({
        ...row,
        ...updated,
        performanceBaseId: doc.id,
        publicKey: row.publicKey || before.publicKey || backendContext.performancePublicKey(row)
      }));
    });
    if (source.source === "engagement") {
      const sourceLicenseNumberRefId = backendContext.engagementSwimmerLicenseNumberId(sourceSwimmer.licenseNumber);
      if (sourceLicenseNumberRefId) {
        batch.delete(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(sourceLicenseNumberRefId));
      }
      sourceMergeIds.forEach((sourceId) => {
        batch.delete(backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.stableHash(sourceId).slice(0, 40)));
      });
    }
    if (targetPayload.licenseNumber) {
      const targetLicensePayload = backendContext.engagementSwimmerLicensePayload(
        { ...targetSwimmer, ...targetPayload, swimmerIndexId: targetSwimmer.swimmerIndexId || targetSwimmer.id },
        { uid: context.uid, clubId: targetSwimmer.clubId || sourceSwimmer.clubId, clubName: targetSwimmer.clubName || sourceSwimmer.clubName },
        { type: "national_merge", collectedAt: now, verificationSource: "national" }
      );
      batch.set(backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.stableHash(targetSwimmer.swimmerIndexId || targetSwimmer.id || targetSwimmerId).slice(0, 40)), targetLicensePayload, { merge: true });
      const targetLicenseNumberRefId = backendContext.engagementSwimmerLicenseNumberId(targetPayload.licenseNumber);
      if (targetLicenseNumberRefId) {
        batch.set(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(targetLicenseNumberRefId), targetLicensePayload, { merge: true });
      }
    }
    await batch.commit();
    if (updatedPerformanceRows.length) {
      await backendContext.writePerformanceSwimmerIndexRows(updatedPerformanceRows, { action: "engagement.swimmerMerged", now });
      await backendContext.writePerformanceSwimmerPageRows(updatedPerformanceRows, { action: "engagement.swimmerMerged", now });
    }
    let publicSnapshot = { ok: true, skipped: true, reason: "Aucune performance source a publier." };
    if (updatedPerformanceRows.length) {
      try {
        const targetRows = await backendContext.activePerformanceRowsForNationalSwimmer({
          ...target,
          swimmer: { ...targetSwimmer, ...targetPayload }
        });
        publicSnapshot = await backendContext.publishEngagementNationalSwimmerMerge(
          sourceSwimmer,
          { ...targetSwimmer, ...targetPayload },
          targetRows,
          { now }
        );
      } catch (error) {
        console.error("Publication publique ciblee impossible apres fusion nageur", {
          sourceSwimmerId: resolvedSourceSwimmerId,
          targetSwimmerId: resolvedTargetSwimmerId,
          message: error?.message || String(error)
        });
        publicSnapshot = { ok: false, error: error?.message || "Publication publique ciblee impossible." };
      }
    }
    await backendContext.writeAuditLog("engagementClubSwimmer.nationalMerged", context.uid, {
      sourceSwimmerId,
      resolvedSourceSwimmerId,
      sourceSource: source.source,
      targetSwimmerId,
      resolvedTargetSwimmerId,
      targetSource: target.source,
      sourceClubId: sourceSwimmer.clubId,
      targetClubId: targetSwimmer.clubId,
      clubMismatch,
      licenseMismatch,
      sourceIndexRecovered: source.recoveredIndex === true,
      targetIndexRecovered: target.recoveredIndex === true,
      publicSnapshotOk: publicSnapshot.ok !== false,
      scannedEntryCount: entriesSnapshot.size,
      entrySwimmerUpdateCount,
      relayUpdateCount,
      performanceUpdateCount: updatedPerformanceRows.length
    });
    const [updatedSource, updatedTarget] = await backendContext.db.getAll(source.ref, target.ref);
    return {
      ok: true,
      source: backendContext.engagementNationalSwimmerItemFromDoc(updatedSource, source.source),
      target: backendContext.engagementNationalSwimmerItemFromDoc(updatedTarget, target.source),
      scannedEntryCount: entriesSnapshot.size,
      entrySwimmerUpdateCount,
      relayUpdateCount,
      performanceUpdateCount: updatedPerformanceRows.length,
      publicSnapshot
    };
  }

  async function previewCompetitionImport(request) {
    backendContext.assertCapability(request, "competitions.import");
    if(request.data?.sourceType==="winpalme-zip-preview" && !backendContext.authorizeNativePerformance(request).national)throw new backendContext.HttpsError("permission-denied","Le contrôle des alertes ZIP est réservé à l’administration nationale.");
    if(request.data?.sourceType==="winpalme-zip-preview" && backendContext.ENVIRONMENT.sportingDataSource !== "nap")throw new backendContext.HttpsError("failed-precondition","L’aperçu ZIP nécessite la source NAP.");
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      backendContext.authorizeNativePerformance(request);
      if(request.data?.sourceType==="international-xlsx"||request.data?.workbook)throw new backendContext.HttpsError("failed-precondition","Le raccordement de l'import Excel international reste a terminer ; aucune ancienne base ne sera utilisee.");
      try{
        const result=require("./nap-import-response").importPreviewResponse(await require("./nap-import-preview").previewNativeImport(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),request.data||{}));
        return request.data?.sourceType==="winpalme-zip-preview"?{...result,previewOnly:false,reviewReady:result.canConfirm===true}:result;
      }
      catch(error){throw backendContext.nativePerformanceFailure(error);}
    }
    const parsed = backendContext.parseCompetitionImportPayload(request.data || {});
    const fileHash = backendContext.stableHash(parsed.fileHashSeed || "");
    const importId = backendContext.importDocumentId(parsed.metadata, fileHash);
    const existing = await backendContext.db.collection("performanceImports").doc(importId).get();
    const existingData = existing.exists ? existing.data() || {} : {};
    const matchingImport = existing.exists && backendContext.activeCompetitionImportData(existingData)
      ? existing
      : await backendContext.findExistingCompetitionImport(parsed.metadata, importId);
    const matchingData = matchingImport?.data?.() || {};
    const existingImport = backendContext.competitionImportExistingSummary(matchingImport);
    const publicationStatus = backendContext.importPublicationStatus(matchingData);
    const recordAlerts = backendContext.detectRecordAlerts(parsed.performances, await backendContext.loadPerformanceRecordsData());
    return {
      ok: true,
      importId,
      alreadyImported: Boolean(existingImport),
      existingImport,
      identicalFile: Boolean(existingImport && existingImport.fileHash === fileHash),
      canReplaceImport: Boolean(existingImport && existingImport.status === "stored" && existingImport.importId !== importId),
      publicationStatus: publicationStatus || (existingImport ? "published" : ""),
      canResumePublication: Boolean(existingImport && backendContext.canResumeImportPublication(matchingData)),
      fileHash,
      sourceType: parsed.sourceType,
      metadata: parsed.metadata,
      summary: parsed.summary,
      warnings: parsed.warnings,
      recordAlerts: recordAlerts.slice(0, 100),
      recordAlertCount: recordAlerts.length,
      duplicateDetails: parsed.duplicateDetails.slice(0, 50),
      samplePerformances: parsed.performances.slice(0, 20),
      previewPerformances: parsed.performances.map(backendContext.competitionImportPreviewPerformance)
    };
  }

  async function createCompetitionImport(request) {
    backendContext.assertCapability(request, "competitions.import");
    if(request.data?.sourceType==="winpalme-zip-preview"&&!backendContext.authorizeNativePerformance(request).national)throw new backendContext.HttpsError("permission-denied","L’enregistrement ZIP est réservé à l’administration nationale.");
    if(request.data?.sourceType==="winpalme-zip-preview"&&backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("failed-precondition","Le dépôt ZIP nécessite la source NAP.");
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      if(request.data?.sourceType==="international-xlsx"||request.data?.workbook)throw new backendContext.HttpsError("failed-precondition","Import Excel NAP non disponible pour le moment.");
      try{return await require("./nap-import-write").createNativeImportWriter({authorize:backendContext.authorizeNativePerformance,getPool:()=>require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),protocolStorage:require("./nap-import-protocol-storage").createProtocolStorage(backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET))})(request);}
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

  async function listCompetitionImports(request) {
    backendContext.assertCapability(request, "competitions.import");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      backendContext.authorizeNativePerformance(request);
      try {
        return await require("./nap-import-history").readImportHistory(require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD));
      } catch(error) { throw backendContext.nativePerformanceFailure(error); }
    }
    const snapshot = await backendContext.db
      .collection("performanceImports")
      .orderBy("importedAt", "desc")
      .limit(50)
      .get();
    return {
      ok: true,
      imports: snapshot.docs.map((doc) => {
        const data = doc.data() || {};
        const recordAlerts = Array.isArray(data.recordAlerts)
          ? data.recordAlerts.filter((alert) => !backendContext.isAlreadyPublishedRecordAlert(alert))
          : [];
        return {
          importId: doc.id,
          status: data.status || "",
          sourceType: data.sourceType || "",
          fileName: data.fileName || "",
          metadata: data.metadata || {},
          summary: data.summary || {},
          warnings: data.warnings || [],
          recordAlertCount: recordAlerts.length,
          recordAlerts: recordAlerts.slice(0, 20),
          duplicateDetails: data.duplicateDetails || [],
          publicationStatus: backendContext.importPublicationStatus(data) || (data.status === "stored" ? "published" : ""),
          publicationUpdatedAt: data.publicationUpdatedAt || "",
          publicationError: data.publicationError || "",
          canResumePublication: data.status === "stored" && backendContext.canResumeImportPublication(data),
          replacementOf: data.replacementOf || "",
          replacedBy: data.replacedBy || "",
          replacementJobId: data.replacementJobId || "",
          importedByEmail: data.importedByEmail || "",
          importedAt: data.importedAt || ""
        };
      })
    };
  }

  function getDtnSeasons(request) { return backendContext.invokeDtnSeason("list", request); }

  function updateDtnSeason(request) { return backendContext.invokeDtnSeason("update", request); }

  function getDtnSeasonOverview(request) { return backendContext.invokeDtnSeason("overview", request); }

  function listDtnSeasonSources(request) { return backendContext.invokeDtnSeason("sources", request); }

  async function getNapPerformanceAdministration(request) {
    if(request.data?.recordsAction!==undefined){
      if(request.data.recordsAction!=="read")throw new backendContext.HttpsError("invalid-argument","Action Records invalide.");
      return backendContext.readNapRecordsAdministration(request);
    }
    if(backendContext.ENVIRONMENT.sportingDataSource !== "nap")throw new backendContext.HttpsError("failed-precondition","Source NAP requise.");
    try{return await require("./nap-performance-administration").createPerformanceAdministration({authorize:backendContext.authorizeNativePerformance,getPool:()=>require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD)})(request);}
    catch(error){throw backendContext.nativePerformanceFailure(error);}
  }

  async function savePerformanceCorrection(request) {
    if(request.data?.recordsAction!==undefined){
      if(request.data.recordsAction!=="publish")throw new backendContext.HttpsError("invalid-argument","Action Records invalide.");
      return backendContext.publishNativeRecords(request);
    }
    backendContext.assertCapability(request, "competitions.import");
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try{return await require("./nap-performance-write").createPerformanceWriter({authorize:backendContext.authorizeNativePerformance,getPool:()=>require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD)}).change(request,request.data);}
      catch(error){throw backendContext.nativePerformanceFailure(error);}
    }
    const data = request.data || {};
    const targetKey = backendContext.cleanText(data.targetKey).slice(0, 240);
    if (!targetKey) {
      throw new backendContext.HttpsError("invalid-argument", "Performance cible manquante.");
    }
    const reason = backendContext.cleanText(data.reason).slice(0, 500);
    if (!reason) {
      throw new backendContext.HttpsError("invalid-argument", "Motif obligatoire.");
    }
    const allowedPatchFields = new Set([
      "time",
      "timeValue",
      "club",
      "clubName",
      "location",
      "date",
      "rank",
      "points",
      "intermediateTimes"
    ]);
    const rawPatch = data.patch && typeof data.patch === "object" ? data.patch : {};
    const patch = {};
    Object.keys(rawPatch).forEach((key) => {
      if (!allowedPatchFields.has(key)) return;
      if (key === "timeValue") {
        const value = Number(rawPatch[key]);
        if (Number.isFinite(value) && value > 0) patch[key] = value;
        return;
      }
      if (key === "intermediateTimes") {
        patch[key] = Array.isArray(rawPatch[key])
          ? rawPatch[key].slice(0, 12).map((split) => ({
            distance: Number(split?.distance || 0) || "",
            code: backendContext.cleanText(split?.code).slice(0, 20),
            time: backendContext.cleanText(split?.time).slice(0, 20),
            timeValue: Number(split?.timeValue || 0) || 0
          })).filter((split) => split.code || split.time)
          : [];
        return;
      }
      patch[key] = backendContext.cleanText(rawPatch[key]).slice(0, key === "location" || key === "clubName" ? 160 : 80);
    });

    const targetRowKeys = new Set([
      "id", "source", "swimmerId", "originalSwimmerId", "swimmerIdentityKey", "swimmer", "firstName", "lastName", "birthDate",
      "sex", "clubId", "club", "clubName", "regionId", "regionLabel", "competitionId", "competition", "location", "date",
      "seasonYear", "pool", "chrono", "course", "courseLabel", "courseShortLabel", "style", "length", "isIntermediate",
      "originCourse", "originCourseShortLabel", "originPerformanceId", "category", "categoryCode", "categoryLabel",
      "timeValue", "time", "rank", "points", "intermediateTimes"
    ]);
    const rawTargetRow = data.targetRow && typeof data.targetRow === "object" ? data.targetRow : {};
    const targetRow = {};
    Object.keys(rawTargetRow).forEach((key) => {
      if (!targetRowKeys.has(key)) return;
      if (key === "timeValue" || key === "seasonYear" || key === "length") {
        const value = Number(rawTargetRow[key]);
        if (Number.isFinite(value)) targetRow[key] = value;
        return;
      }
      if (key === "isIntermediate") {
        targetRow[key] = rawTargetRow[key] === true;
        return;
      }
      if (key === "intermediateTimes") {
        targetRow[key] = Array.isArray(rawTargetRow[key])
          ? rawTargetRow[key].slice(0, 12).map((split) => ({
            distance: Number(split?.distance || 0) || "",
            code: backendContext.cleanText(split?.code).slice(0, 20),
            time: backendContext.cleanText(split?.time).slice(0, 20),
            timeValue: Number(split?.timeValue || 0) || 0
          })).filter((split) => split.code || split.time)
          : [];
        return;
      }
      targetRow[key] = backendContext.cleanText(rawTargetRow[key]).slice(0, 180);
    });

    const hidden = data.hidden === true;
    if (!hidden && !Object.keys(patch).length) {
      throw new backendContext.HttpsError("invalid-argument", "Aucune correction a enregistrer.");
    }

    const now = new Date().toISOString();
    const updatedByName = await backendContext.accessUserDisplayName(request.auth.uid, request.auth.token || {});
    const correctionId = backendContext.stableHash(targetKey).slice(0, 32);
    const ref = backendContext.db.collection("performanceCorrections").doc(correctionId);
    const existing = await ref.get();
    const payload = {
      id: correctionId,
      targetKey,
      targetId: backendContext.cleanText(data.targetId).slice(0, 180),
      targetSource: backendContext.cleanText(data.targetSource).slice(0, 80),
      targetSummary: backendContext.cleanFirestoreValue(data.targetSummary && typeof data.targetSummary === "object" ? data.targetSummary : {}),
      targetRow: backendContext.cleanFirestoreValue(targetRow),
      hidden,
      patch: backendContext.cleanFirestoreValue(patch),
      reason,
      updatedAt: now,
      updatedBy: request.auth.uid,
      updatedByEmail: request.auth.token?.email || "",
      updatedByName,
      createdAt: existing.exists ? existing.data()?.createdAt || now : now,
      createdBy: existing.exists ? existing.data()?.createdBy || request.auth.uid : request.auth.uid
    };
    const safePayload = backendContext.cleanFirestoreValue(payload);
    await ref.set(safePayload, { merge: false });
    await ref.collection("history").add({
      ...safePayload,
      correctionId,
      savedAt: now
    });
    await backendContext.writeAuditLog(hidden ? "performanceCorrection.hidden" : "performanceCorrection.updated", request.auth.uid, {
      correctionId,
      targetKey,
      targetId: payload.targetId,
      targetSource: payload.targetSource,
      hidden,
      reason
    });

    const publicationJob = await backendContext.enqueuePerformancePublicationJob({
      id: correctionId,
      targetKey: safePayload.targetKey,
      targetId: safePayload.targetId,
      targetSource: safePayload.targetSource,
      targetRow: safePayload.targetRow || {},
      hidden: safePayload.hidden === true,
      patch: safePayload.patch || {},
      updatedAt: safePayload.updatedAt,
      updatedByName: safePayload.updatedByName || ""
    }, {
      uid: request.auth.uid,
      email: request.auth.token?.email || ""
    });
    return {
      ok: true,
      correction: {
        id: correctionId,
        targetKey,
        hidden,
        patch,
        updatedAt: now
      },
      publicationJob
    };
  }

  return { storeCompetitionPdf, deleteCompetitionPdf, updateEngagementNationalSwimmerIdentity, mergeEngagementNationalClubSwimmer, previewCompetitionImport, createCompetitionImport, listCompetitionImports, getDtnSeasons, updateDtnSeason, getDtnSeasonOverview, listDtnSeasonSources, getNapPerformanceAdministration, savePerformanceCorrection };
}

module.exports = { createPerformanceHandlers };
