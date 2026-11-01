// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_applyEngagementSwimmerIdentityCorrection(backendContext) {
  async function assertNoEngagementSwimmerIdentityConflict(db, current = {}, correction = {}) {
    const ignoredIds = new Set([
      current.id,
      current.swimmerIndexId,
      current.swimmerId,
      ...(Array.isArray(current.sourceIds) ? current.sourceIds : [])
    ].map((id) => backendContext.cleanText(id).slice(0, 80)).filter(Boolean));
    if (correction.identityKey && correction.identityKey !== current.identityKey) {
      const [performanceSnapshot, engagementSnapshot] = await Promise.all([
        db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).where("identityKey", "==", correction.identityKey).limit(3).get(),
        db.collection("engagementClubSwimmers").where("identityKey", "==", correction.identityKey).limit(3).get()
      ]);
      const conflict = [
        ...performanceSnapshot.docs.map((doc) => ({ id: doc.id, source: "performances", data: doc.data() || {} })),
        ...engagementSnapshot.docs.map((doc) => ({ id: doc.id, source: "engagement", data: doc.data() || {} }))
      ].find((candidate) => !ignoredIds.has(candidate.id) && candidate.data.active !== false && backendContext.cleanText(candidate.data.status) !== "merged");
      if (conflict) {
        const name = [backendContext.cleanText(conflict.data.lastName), backendContext.cleanText(conflict.data.firstName)].filter(Boolean).join(" ") || "une fiche existante";
        throw new backendContext.HttpsError("already-exists", `${name} possede deja cette identite. Utilisez la fusion plutot qu'une correction.`, {
          conflictId: conflict.id,
          conflictSource: conflict.source
        });
      }
    }
    if (correction.licenseNumber) {
      await backendContext.assertNoEngagementSwimmerLicenseConflict(db, correction, Array.from(ignoredIds));
    }
  }

  function engagementEntrySwimmerCorrectionResult(items = [], oldIds = new Set(), next = {}) {
    let changed = false;
    const corrected = (Array.isArray(items) ? items : []).map((item) => {
      const itemId = backendContext.cleanText(item?.swimmerIndexId || item?.id || item?.swimmerId);
      if (!oldIds.has(itemId)) return item;
      changed = true;
      return backendContext.cleanFirestoreValue({
        ...item,
        id: next.id,
        swimmerIndexId: next.swimmerIndexId || next.id,
        swimmerId: next.swimmerId || item.swimmerId,
        source: next.source || item.source,
        identityKey: next.identityKey,
        firstName: next.firstName,
        lastName: next.lastName,
        name: next.name,
        birthDate: next.birthDate,
        sex: next.sex,
        category: backendContext.currentEngagementCategoryFromBirthDate(next.birthDate),
        licenseNumber: next.licenseNumber ?? item.licenseNumber
      });
    });
    return { changed, items: corrected };
  }

  function engagementEntryRelayCorrectionResult(relays = [], oldIds = new Set(), next = {}) {
    let changed = false;
    const corrected = (Array.isArray(relays) ? relays : []).map((relay) => {
      const membersResult = engagementEntrySwimmerCorrectionResult(relay?.members || [], oldIds, next);
      const memberIds = (Array.isArray(relay?.memberIds) ? relay.memberIds : [])
        .map((id) => oldIds.has(backendContext.cleanText(id)) ? (next.swimmerIndexId || next.id) : id);
      const idsChanged = memberIds.some((id, index) => id !== relay?.memberIds?.[index]);
      if (!membersResult.changed && !idsChanged) return relay;
      changed = true;
      return backendContext.cleanFirestoreValue({
        ...relay,
        members: membersResult.items,
        memberIds
      });
    });
    return { changed, relays: corrected };
  }

  async function updateEngagementEntriesForSwimmerCorrection(db, current = {}, next = {}, context = {}) {
    const clubId = backendContext.cleanText(current.clubId || next.clubId).slice(0, 40);
    if (!clubId) return { scannedEntryCount: 0, entryUpdateCount: 0, relayUpdateCount: 0 };
    const oldIds = new Set([
      current.id,
      current.swimmerIndexId,
      current.swimmerId,
      ...(Array.isArray(current.sourceIds) ? current.sourceIds : [])
    ].map((id) => backendContext.cleanText(id)).filter(Boolean));
    let scannedEntryCount = 0;
    let entryUpdateCount = 0;
    let relayUpdateCount = 0;
    const now = context.now || new Date().toISOString();
    let cursor = null;
    do {
      let query = db.collection("engagementClubEntries")
        .where("clubId", "==", clubId)
        .orderBy(backendContext.FieldPath.documentId())
        .limit(backendContext.ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      scannedEntryCount += snapshot.size;
      const batch = db.batch();
      let pageUpdateCount = 0;
      snapshot.docs.forEach((doc) => {
        const entry = doc.data() || {};
        const swimmerResult = engagementEntrySwimmerCorrectionResult(entry.swimmers || [], oldIds, next);
        const relayResult = engagementEntryRelayCorrectionResult(entry.relays || [], oldIds, next);
        if (!swimmerResult.changed && !relayResult.changed) return;
        batch.set(doc.ref, backendContext.cleanFirestoreValue({
          ...(swimmerResult.changed ? { swimmers: swimmerResult.items } : {}),
          ...(relayResult.changed ? { relays: relayResult.relays } : {}),
          updatedAt: now,
          updatedBy: context.uid || ""
        }), { merge: true });
        pageUpdateCount += 1;
        if (swimmerResult.changed) entryUpdateCount += 1;
        if (relayResult.changed) relayUpdateCount += 1;
      });
      if (pageUpdateCount) await batch.commit();
      cursor = snapshot.size === backendContext.ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE
        ? snapshot.docs[snapshot.docs.length - 1]
        : null;
    } while (cursor);
    return { scannedEntryCount, entryUpdateCount, relayUpdateCount };
  }

  async function applyEngagementSwimmerIdentityCorrection(target = {}, correction = {}, context = {}) {
    const current = (0, backendContext.local$engagementSwimmerIdentitySnapshot)(target.swimmer, target.source);
    await assertNoEngagementSwimmerIdentityConflict(backendContext.db, current, correction);
    const now = context.now || new Date().toISOString();
    if (target.source === "engagement") {
      const payload = {
        ...correction,
        updatedAt: now,
        updatedBy: context.uid,
        identityCorrectedAt: now,
        identityCorrectedBy: context.uid
      };
      const batch = backendContext.db.batch();
      batch.set(target.ref, payload, { merge: true });
      const oldLicenseRefId = backendContext.engagementSwimmerLicenseNumberId(current.licenseNumber);
      const newLicenseRefId = backendContext.engagementSwimmerLicenseNumberId(correction.licenseNumber);
      if (oldLicenseRefId && oldLicenseRefId !== newLicenseRefId) {
        batch.delete(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(oldLicenseRefId));
      }
      if (correction.licenseNumber) {
        const licensePayload = backendContext.engagementSwimmerLicensePayload(
          { ...current, ...correction, swimmerIndexId: target.swimmerId, source: "engagement" },
          { uid: context.uid, clubId: current.clubId, clubName: current.clubName },
          { type: "national_identity_correction", collectedAt: now, verificationSource: "national" }
        );
        batch.set(backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.stableHash(target.swimmerId).slice(0, 40)), licensePayload, { merge: true });
        if (newLicenseRefId) {
          batch.set(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(newLicenseRefId), {
            ...licensePayload,
            swimmerIndexId: target.swimmerId,
            licenseKey: backendContext.engagementSwimmerLicenseNumberKey(correction.licenseNumber)
          }, { merge: true });
        }
      } else if (current.licenseNumber) {
        batch.delete(backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.stableHash(target.swimmerId).slice(0, 40)));
      }
      const next = (0, backendContext.local$engagementSwimmerIdentitySnapshot)({
        ...current,
        ...correction,
        id: target.swimmerId,
        swimmerIndexId: target.swimmerId,
        source: "engagement",
        updatedAt: now
      }, "engagement");
      backendContext.upsertEngagementClubRosterSwimmer(batch, backendContext.db, { ...next, changeRequestStatus: "", changeRequestId: "", changeRequestedAt: "" }, now);
      if (target.requestedSource !== "engagement" || target.requestedSwimmerId !== target.swimmerId) {
        backendContext.deleteEngagementClubRosterSwimmer(batch, backendContext.db, {
          ...current,
          source: target.requestedSource,
          swimmerIndexId: target.requestedSwimmerId
        }, now);
      }
      await batch.commit();
      const entryResult = await updateEngagementEntriesForSwimmerCorrection(backendContext.db, current, next, { ...context, now });
      return { current, swimmer: next, performanceUpdateCount: 0, publicSnapshot: null, ...entryResult };
    }

    const rows = Array.isArray(target.performanceRows) && target.performanceRows.length
      ? target.performanceRows
      : await backendContext.getPerformanceBaseRowsBySwimmer({
        swimmerIds: Array.from(new Set([
          target.requestedSwimmerId,
          target.swimmerId,
          current.swimmerId,
          ...(current.sourceIds || [])
        ].map(backendContext.cleanText).filter(Boolean))),
        identityKey: current.identityKey
      });
    const finalPerformanceCount = rows.filter((row) => row.isIntermediate !== true).length;
    if (!rows.length) {
      throw new backendContext.HttpsError("failed-precondition", "Les performances de ce nageur ne sont pas encore disponibles dans la base active. Synchronisez la base avant la correction.");
    }
    if (rows.length > backendContext.ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS || (current.performanceCount > 0 && finalPerformanceCount < current.performanceCount)) {
      throw new backendContext.HttpsError("failed-precondition", "Correction trop volumineuse ou index incomplet. Une migration dediee est necessaire.");
    }
    const updatedRows = rows.map((row) => ({
      ...row,
      firstName: correction.firstName,
      lastName: correction.lastName,
      swimmer: correction.name,
      birthDate: correction.birthDate,
      sex: correction.sex,
      swimmerIdentityKey: correction.identityKey,
      sourceAction: "engagement.swimmerIdentityCorrected"
    }));
    await backendContext.writePerformanceBaseRows(updatedRows, {
      actorUid: context.uid,
      actorEmail: context.email || "",
      now,
      action: "engagement.swimmerIdentityCorrected",
      status: "active",
      logChanges: false,
      dtnInvalidationRows: rows
    });
    await backendContext.writePerformanceSwimmerIndexRows(updatedRows, {
      now,
      action: "engagement.swimmerIdentityCorrected",
      mode: "replace"
    });
    await backendContext.writePerformanceSwimmerPageRows(updatedRows, {
      now,
      action: "engagement.swimmerIdentityCorrected"
    });
    const newIndexId = backendContext.performanceSwimmerIndexDocId(updatedRows[0]);
    const newIndexRef = backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(newIndexId);
    await newIndexRef.set({
      licenseNumber: correction.licenseNumber,
      identityCorrectedAt: now,
      identityCorrectedBy: context.uid,
      updatedAt: now
    }, { merge: true });
    const cleanupBatch = backendContext.db.batch();
    const oldIndexId = target.source === "performances" ? target.swimmerId : "";
    const oldLicenseDocId = backendContext.cleanText(target.licenseDocumentId)
      || (oldIndexId ? backendContext.engagementSwimmerLicenseId({ swimmerIndexId: oldIndexId }) : "");
    const newLicenseDocId = backendContext.engagementSwimmerLicenseId({ swimmerIndexId: newIndexId });
    const oldLicenseRefId = backendContext.engagementSwimmerLicenseNumberId(current.licenseNumber);
    const newLicenseRefId = backendContext.engagementSwimmerLicenseNumberId(correction.licenseNumber);
    if (oldLicenseRefId && oldLicenseRefId !== newLicenseRefId) {
      cleanupBatch.delete(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(oldLicenseRefId));
    }
    if (oldLicenseDocId && (oldLicenseDocId !== newLicenseDocId || !correction.licenseNumber)) {
      cleanupBatch.delete(backendContext.db.collection("engagementSwimmerLicenses").doc(oldLicenseDocId));
    }
    if (correction.licenseNumber) {
      const licensePayload = backendContext.engagementSwimmerLicensePayload(
        { ...current, ...correction, swimmerIndexId: newIndexId, source: "performances" },
        { uid: context.uid, clubId: current.clubId, clubName: current.clubName },
        { type: "national_identity_correction", collectedAt: now, verificationSource: "national" }
      );
      cleanupBatch.set(backendContext.db.collection("engagementSwimmerLicenses").doc(newLicenseDocId), licensePayload, { merge: true });
      if (newLicenseRefId) {
        cleanupBatch.set(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(newLicenseRefId), {
          ...licensePayload,
          swimmerIndexId: newIndexId,
          licenseKey: backendContext.engagementSwimmerLicenseNumberKey(correction.licenseNumber)
        }, { merge: true });
      }
    }
    if (oldIndexId && oldIndexId !== newIndexId) {
      const oldPageCount = Math.min(50, Math.max(0, Math.trunc(Number(target.snapshot?.data()?.pageCount || 0) || 0)));
      for (let pageIndex = 0; pageIndex < oldPageCount; pageIndex += 1) {
        cleanupBatch.delete(backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(backendContext.performanceSwimmerPageId(oldIndexId, pageIndex)));
      }
      cleanupBatch.delete(backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(oldIndexId));
    }
    backendContext.deleteEngagementClubRosterSwimmer(cleanupBatch, backendContext.db, {
      ...current,
      source: target.requestedSource,
      swimmerIndexId: target.requestedSwimmerId
    }, now);
    const newIndexSnapshot = await newIndexRef.get();
    const next = (0, backendContext.local$engagementSwimmerIdentitySnapshot)({
      ...backendContext.engagementClubSwimmerItem(newIndexSnapshot),
      ...correction,
      id: newIndexId,
      swimmerIndexId: newIndexId,
      source: "performances",
      clubId: current.clubId,
      clubName: current.clubName,
      performanceCount: finalPerformanceCount
    }, "performances");
    backendContext.upsertEngagementClubRosterSwimmer(cleanupBatch, backendContext.db, { ...next, changeRequestStatus: "", changeRequestId: "", changeRequestedAt: "" }, now);
    await cleanupBatch.commit();
    const entryResult = await updateEngagementEntriesForSwimmerCorrection(backendContext.db, current, next, { ...context, now });
    let publicSnapshot = null;
    try {
      const oldPublicKey = backendContext.publicSwimmerKey(rows[0] || {});
      const newPublicKey = backendContext.publicSwimmerKey(updatedRows[0] || {});
      if (oldPublicKey && newPublicKey && oldPublicKey !== newPublicKey) {
        publicSnapshot = await backendContext.replacePublicSwimmerIdentity(oldPublicKey, newPublicKey, updatedRows);
      } else {
        publicSnapshot = await backendContext.rebuildPublicPerformanceFilesForAffectedRows(updatedRows, {
          now,
          reason: "engagement.swimmerIdentityCorrected"
        });
      }
      await backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows([...rows, ...updatedRows]);
      const correctedTopFiles = await backendContext.rebuildPublicTopFilesForAffectedRows(
        [...rows, ...updatedRows],
        new Map([[newPublicKey, updatedRows]])
      );
      publicSnapshot.correctedTopBuckets = correctedTopFiles.affectedTopBuckets;
    } catch (error) {
      console.error("Publication publique ciblee impossible apres correction nageur", {
        swimmerId: target.swimmerId,
        message: error?.message || String(error)
      });
      publicSnapshot = { ok: false, error: error?.message || "Publication publique ciblee impossible." };
    }
    return {
      current,
      swimmer: next,
      performanceUpdateCount: updatedRows.length,
      publicSnapshot,
      ...entryResult
    };
  }

  return { assertNoEngagementSwimmerIdentityConflict, engagementEntrySwimmerCorrectionResult, engagementEntryRelayCorrectionResult, updateEngagementEntriesForSwimmerCorrection, applyEngagementSwimmerIdentityCorrection };
}

module.exports = { createNationalService_applyEngagementSwimmerIdentityCorrection };
