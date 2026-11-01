// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_engagementNationalSwimmerCollectionForSource(backendContext) {
  function engagementNationalSwimmerCollectionForSource(db, source = "") {
    const cleanSource = backendContext.cleanText(source || "engagement");
    if (cleanSource === "performances") return db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION);
    if (cleanSource === "engagement") return db.collection("engagementClubSwimmers");
    throw new backendContext.HttpsError("invalid-argument", "Source nageur invalide.");
  }

  async function materializeEngagementNationalPerformanceSwimmerForMerge(target = {}, context = {}) {
    if (target.ref?.id && target.snapshot?.exists) {
      return {
        ref: target.ref,
        snapshot: target.snapshot,
        swimmer: target.swimmer,
        source: "performances",
        performanceRows: target.performanceRows || [],
        recoveredIndex: false
      };
    }
    const rows = Array.isArray(target.performanceRows) ? target.performanceRows : [];
    const finalPerformanceCount = rows.filter((row) => row.isIntermediate !== true).length;
    if (!rows.length) {
      throw new backendContext.HttpsError(
        "failed-precondition",
        "Les performances de ce nageur ne sont pas encore disponibles dans la base active. Synchronisez la base avant la fusion."
      );
    }
    if (rows.length > backendContext.ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS ||
        !backendContext.recoveredPerformanceRowsAreComplete(rows, target.swimmer?.performanceCount)) {
      throw new backendContext.HttpsError("failed-precondition", "Fusion trop volumineuse ou index incomplet. Une migration dediee est necessaire.");
    }
    const now = context.now || new Date().toISOString();
    await backendContext.writePerformanceSwimmerIndexRows(rows, {
      now,
      action: "engagement.swimmerMergeIndexRecovered",
      mode: "replace"
    });
    await backendContext.writePerformanceSwimmerPageRows(rows, {
      now,
      action: "engagement.swimmerMergeIndexRecovered"
    });
    const indexId = backendContext.performanceSwimmerIndexDocId(rows[0]);
    const ref = backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(indexId);
    if (target.swimmer?.licenseNumber) {
      await ref.set({
        licenseNumber: backendContext.cleanText(target.swimmer.licenseNumber).slice(0, 60),
        updatedAt: now
      }, { merge: true });
    }
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("internal", "Reconstruction de l'index nageur impossible.");
    }
    return {
      ref,
      snapshot,
      swimmer: {
        ...backendContext.engagementClubSwimmerItem(snapshot),
        ...(target.swimmer?.licenseNumber ? { licenseNumber: target.swimmer.licenseNumber } : {})
      },
      source: "performances",
      performanceRows: rows,
      recoveredIndex: true
    };
  }

  async function getEngagementNationalSwimmerForMerge(db, source = "", swimmerId = "", identityKey = "", context = {}) {
    const cleanSource = backendContext.cleanText(source || "engagement");
    const cleanId = backendContext.cleanText(swimmerId).slice(0, 80);
    const cleanIdentityKey = backendContext.cleanText(identityKey).slice(0, 180);
    if (!cleanId) throw new backendContext.HttpsError("invalid-argument", "Nageur requis.");
    if (cleanSource === "engagement") {
      const collection = engagementNationalSwimmerCollectionForSource(db, cleanSource);
      const ref = collection.doc(cleanId);
      const snapshot = await ref.get();
      if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Nageur introuvable.");
      const swimmer = (0, backendContext.local$engagementNationalSwimmerItemFromDoc)(snapshot, cleanSource);
      if (cleanIdentityKey && backendContext.cleanText(swimmer.identityKey) !== cleanIdentityKey) {
        throw new backendContext.HttpsError("failed-precondition", "La fiche nageur a change depuis la recherche. Rechargez-la avant la fusion.");
      }
      return { ref, snapshot, swimmer, source: cleanSource, recoveredIndex: false };
    }
    if (cleanSource !== "performances") {
      engagementNationalSwimmerCollectionForSource(db, cleanSource);
    }
    const target = await (0, backendContext.local$getEngagementSwimmerCorrectionTarget)(db, "performances", cleanId, cleanIdentityKey);
    if (cleanIdentityKey && backendContext.cleanText(target.swimmer?.identityKey) !== cleanIdentityKey) {
      throw new backendContext.HttpsError("failed-precondition", "La fiche nageur a change depuis la recherche. Rechargez-la avant la fusion.");
    }
    return materializeEngagementNationalPerformanceSwimmerForMerge(target, context);
  }

  return { engagementNationalSwimmerCollectionForSource, materializeEngagementNationalPerformanceSwimmerForMerge, getEngagementNationalSwimmerForMerge };
}

module.exports = { createNationalService_engagementNationalSwimmerCollectionForSource };
