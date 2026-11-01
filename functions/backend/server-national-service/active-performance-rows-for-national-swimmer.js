// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_activePerformanceRowsForNationalSwimmer(backendContext) {
  function publicPerformanceRowsFromSwimmerPayload(payload = {}) {
    return (Array.isArray(payload?.rows) ? payload.rows : []).map((row) => backendContext.publicPerformanceBaseRow({
      ...row,
      swimmerId: backendContext.cleanText(payload.id),
      swimmerIdentityKey: backendContext.cleanText(payload.identityKey),
      swimmer: backendContext.cleanText(payload.name),
      firstName: backendContext.cleanText(payload.firstName),
      lastName: backendContext.cleanText(payload.lastName),
      birthDate: backendContext.cleanText(payload.birthDate),
      sex: backendContext.cleanText(payload.sex),
      clubId: backendContext.cleanText(row.clubId || payload.clubId),
      club: backendContext.cleanText(row.club || payload.club),
      clubName: backendContext.cleanText(row.clubName || payload.clubName)
    }));
  }

  async function publishEngagementNationalSwimmerMerge(sourceSwimmer = {}, targetSwimmer = {}, targetRows = [], context = {}) {
    const oldPublicKey = backendContext.cleanText(sourceSwimmer.identityKey) || backendContext.publicSwimmerKey(sourceSwimmer);
    const newPublicKey = backendContext.cleanText(targetSwimmer.identityKey) || backendContext.publicSwimmerKey(targetSwimmer);
    const rows = backendContext.uniquePublicPerformanceRows((Array.isArray(targetRows) ? targetRows : []).map(backendContext.publicPerformanceBaseRow));
    if (!oldPublicKey || !newPublicKey || !rows.length) {
      throw new Error("Donnees insuffisantes pour publier la fusion nageur.");
    }
    const oldPayload = await backendContext.readPublicPerformanceJson(backendContext.publicPerformanceSwimmerFilePath(oldPublicKey), null);
    const oldRows = publicPerformanceRowsFromSwimmerPayload(oldPayload || {});
    const now = context.now || new Date().toISOString();
    const newPerfFile = backendContext.publicPerformanceSwimmerFilePath(newPublicKey);
    const existingTargetPayload = await backendContext.readPublicPerformanceJson(newPerfFile, null);
    if (existingTargetPayload) {
      await backendContext.removePublicSearchIndexes(existingTargetPayload, newPerfFile);
      await backendContext.deletePublicPerformanceFile(newPerfFile);
    }
    const publicSnapshot = oldPublicKey === newPublicKey
      ? await backendContext.rebuildPublicPerformanceFilesForAffectedRows(rows, {
          now,
          reason: "engagement.swimmerMerged"
        })
      : await backendContext.replacePublicSwimmerIdentity(oldPublicKey, newPublicKey, rows);
    const topSnapshot = await backendContext.rebuildPublicTopFilesForAffectedRows(
      [...oldRows, ...rows],
      new Map([[newPublicKey, rows]])
    );
    return {
      ...publicSnapshot,
      oldPublicKey,
      newPublicKey,
      correctedTopBuckets: topSnapshot.affectedTopBuckets
    };
  }

  async function activePerformanceRowsForNationalSwimmer(target = {}) {
    const swimmer = target.swimmer || {};
    return backendContext.getPerformanceBaseRowsBySwimmer({
      swimmerIds: backendContext.swimmerMergeIds(swimmer, target.ref?.id).slice(0, 25),
      identityKey: backendContext.cleanText(swimmer.identityKey).slice(0, 180)
    });
  }

  return { publicPerformanceRowsFromSwimmerPayload, publishEngagementNationalSwimmerMerge, activePerformanceRowsForNationalSwimmer };
}

module.exports = { createNationalService_activePerformanceRowsForNationalSwimmer };
