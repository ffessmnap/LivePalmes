// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyPerformancePublication_assertPublicSwimmerIdentityReplaced(backendContext) {
  async function assertPublicSwimmerIdentityReplaced(oldPayload = {}, oldPerfFile = "", newPayload = {}, newPerfFile = "") {
    const oldFile = await (0, backendContext.local$readPublicPerformanceJson)(oldPerfFile, null);
    if (oldFile) throw new Error("L'ancienne fiche publique existe encore apres la correction.");

    const oldSearchRow = (0, backendContext.local$buildPublicSearchRow)(oldPayload, oldPerfFile);
    const oldSearchShards = new Set((oldSearchRow.searchPrefixes || []).map(backendContext.local$publicPerformanceSearchShard).filter(Boolean));
    for (const shard of oldSearchShards) {
      const rows = await (0, backendContext.local$readPublicPerformanceJson)(`search/${shard}.json`, []);
      const stale = (Array.isArray(rows) ? rows : []).some((row) =>
        (0, backendContext.cleanText)(row.identityKey) === (0, backendContext.cleanText)(oldSearchRow.identityKey) ||
        (0, backendContext.cleanText)(row.perfFile) === (0, backendContext.cleanText)(oldPerfFile)
      );
      if (stale) throw new Error("L'ancienne fiche reste presente dans la recherche publique.");
    }

    const newSearchRow = (0, backendContext.local$buildPublicSearchRow)(newPayload, newPerfFile);
    const idValues = [newSearchRow.id, ...(newSearchRow.sourceIds || []), ...(newSearchRow.aliases || [])]
      .map(backendContext.cleanText)
      .filter(Boolean);
    const idsByShard = new Map();
    idValues.forEach((id) => {
      const shard = (0, backendContext.local$publicPerformanceIdShard)(id);
      if (!shard) return;
      if (!idsByShard.has(shard)) idsByShard.set(shard, []);
      idsByShard.get(shard).push(id);
    });
    for (const [shard, ids] of idsByShard.entries()) {
      const items = await (0, backendContext.local$readPublicPerformanceJson)(`ids/${shard}.json`, {});
      const invalid = ids.some((id) =>
        (0, backendContext.cleanText)(items?.[id]?.identityKey) !== (0, backendContext.cleanText)(newSearchRow.identityKey) ||
        (0, backendContext.cleanText)(items?.[id]?.perfFile) !== (0, backendContext.cleanText)(newPerfFile)
      );
      if (invalid) throw new Error("Un identifiant public ne pointe pas vers la fiche corrigee.");
    }
  }

  async function replacePublicSwimmerIdentity(oldKey = "", newKey = "", updatedRows = []) {
    const oldPerfFile = (0, backendContext.local$publicPerformanceSwimmerFilePath)(oldKey);
    const newPerfFile = (0, backendContext.local$publicPerformanceSwimmerFilePath)(newKey);
    const oldPayload = await (0, backendContext.local$readPublicPerformanceJson)(oldPerfFile, null);
    let publicSnapshot = null;
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const removedFiles = [];
        if (oldPayload) {
          const removedIndexes = await (0, backendContext.local$removePublicSearchIndexes)(oldPayload, oldPerfFile);
          removedFiles.push(...removedIndexes);
        }
        removedFiles.push(await (0, backendContext.local$deletePublicPerformanceFile)(oldPerfFile));
        publicSnapshot = await (0, backendContext.local$rebuildPublicPerformanceFilesForAffectedRows)(updatedRows, {
          now: new Date().toISOString(),
          reason: "engagement.swimmerIdentityCorrected"
        });
        const newPayload = await (0, backendContext.local$readPublicPerformanceJson)(newPerfFile, null);
        if (!newPayload) throw new Error("La nouvelle fiche publique n'a pas ete generee.");
        await assertPublicSwimmerIdentityReplaced(oldPayload || {}, oldPerfFile, newPayload, newPerfFile);
        publicSnapshot.removedFiles = removedFiles.length;
        publicSnapshot.identityReplacementAttempts = attempt;
        return publicSnapshot;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Remplacement de la fiche publique impossible.");
  }

  return { assertPublicSwimmerIdentityReplaced, replacePublicSwimmerIdentity };
}

module.exports = { createLegacyPerformancePublication_assertPublicSwimmerIdentityReplaced };
