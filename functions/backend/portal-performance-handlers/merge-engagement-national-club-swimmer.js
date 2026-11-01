// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_mergeEngagementNationalClubSwimmer(backendContext) {
  async function mergeEngagementNationalClubSwimmer(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Fusion reservee au niveau national.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      if (request.data?.confirmMerge !== true) throw new backendContext.HttpsError("failed-precondition", "Confirmation de fusion requise.");
      try {
        return await require("../../nap-swimmer-merge").mergeSwimmers(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
          sourceSwimmerId:request.data?.sourceSwimmerId,targetSwimmerId:request.data?.targetSwimmerId,
          ...(request.data?.finalClubId!==undefined?{finalClubId:request.data.finalClubId}:{}),
          ...(request.data?.entryConflictChoices!==undefined?{entryConflictChoices:request.data.entryConflictChoices,entryConflictToken:request.data.entryConflictToken}:{}),
          sourceFingerprint:request.data?.sourceFingerprint,targetFingerprint:request.data?.targetFingerprint,
          sourceLicenseNumber:request.data?.sourceLicenseNumber,targetLicenseNumber:request.data?.targetLicenseNumber,
          actorUid:context.uid,confirmMerge:true,confirmClubMismatch:request.data?.confirmClubMismatch===true,confirmLicenseMismatch:request.data?.confirmLicenseMismatch===true
        },require("../../nap-swimmer-merge-audit").createAudit(backendContext.db,{sourceSwimmerId:request.data?.sourceSwimmerId,targetSwimmerId:request.data?.targetSwimmerId,actorUid:context.uid},backendContext.writeAuditLogOnce),async()=>{if(!context.national)throw new TypeError("Fusion reservee au niveau national.");});
      } catch(error) {
        if(error instanceof TypeError&&error.mergeConflicts){
          if(request.data?.entryConflictProtocol===1)return {ok:false,mergeConflicts:error.mergeConflicts};
          throw new backendContext.HttpsError("failed-precondition","Plusieurs engagements differents necessitent un choix. Rechargez le portail puis relancez la fusion.");
        }
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

  return { mergeEngagementNationalClubSwimmer };
}

module.exports = { createPerformanceHandlers_mergeEngagementNationalClubSwimmer };
