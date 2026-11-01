// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyPerformancePublication_deletePublicPerformanceFile(backendContext) {
  async function deletePublicPerformanceFile(relativePath = "") {
    const file = (0, backendContext.local$publicPerformanceFile)(relativePath);
    try {
      await file.delete();
    } catch (error) {
      if (!(error?.code === 404 || /No such object|not found/i.test(error?.message || ""))) throw error;
    }
    return (0, backendContext.local$publicPerformanceFilePath)(relativePath);
  }

  async function removePublicSearchIndexes(swimmerPayload = {}, perfFile = "") {
    if (!swimmerPayload || typeof swimmerPayload !== "object") return [];
    const searchRow = (0, backendContext.local$buildPublicSearchRow)(swimmerPayload, perfFile);
    const searchShards = new Set((searchRow.searchPrefixes || []).map(backendContext.local$publicPerformanceSearchShard).filter(Boolean));
    const idValues = [searchRow.id, ...(searchRow.sourceIds || []), ...(searchRow.aliases || [])].map(backendContext.cleanText).filter(Boolean);
    const idShards = new Set(idValues.map(backendContext.local$publicPerformanceIdShard).filter(Boolean));
    const written = [];

    for (const shard of searchShards) {
      const relativePath = `search/${shard}.json`;
      const rows = await (0, backendContext.local$readPublicPerformanceJson)(relativePath, []);
      const filtered = (Array.isArray(rows) ? rows : []).filter((row) =>
        (0, backendContext.cleanText)(row.id) !== (0, backendContext.cleanText)(searchRow.id) &&
        (0, backendContext.cleanText)(row.identityKey) !== (0, backendContext.cleanText)(searchRow.identityKey) &&
        (0, backendContext.cleanText)(row.perfFile) !== (0, backendContext.cleanText)(perfFile)
      );
      written.push(await (0, backendContext.local$savePublicPerformanceJson)(relativePath, filtered, "public, max-age=31536000, immutable"));
    }

    for (const shard of idShards) {
      const relativePath = `ids/${shard}.json`;
      const items = await (0, backendContext.local$readPublicPerformanceJson)(relativePath, {});
      idValues.forEach((id) => {
        delete items[id];
      });
      written.push(await (0, backendContext.local$savePublicPerformanceJson)(relativePath, items, "public, max-age=31536000, immutable"));
    }

    return written;
  }

  function publicPerformanceTopKey(row = {}) {
    const publicRow = (0, backendContext.publicPerformanceBaseRow)(row);
    return publicRow.course && publicRow.sex && publicRow.category
      ? `${publicRow.course}|${publicRow.sex}|${publicRow.category}`
      : "";
  }

  function publicPerformanceMatchesTopKey(row = {}, topKey = "") {
    return publicPerformanceTopKey(row) === topKey;
  }

  function publicPerformanceActiveRow(row = {}) {
    const status = (0, backendContext.cleanText)(row.status || "active");
    return row.active !== false && status !== "hidden" && status !== "deleted";
  }

  async function getActivePublicRowsForAffectedSwimmer(seedRows = []) {
    const publicSeedRows = seedRows.map(backendContext.publicPerformanceBaseRow);
    const swimmerKey = (0, backendContext.publicSwimmerKey)(publicSeedRows[0] || {});
    if (!swimmerKey) return publicSeedRows.filter(publicPerformanceActiveRow);
    const current = await (0, backendContext.local$readPublicPerformanceJson)((0, backendContext.local$publicPerformanceSwimmerFilePath)(swimmerKey), null);
    if (current && !(0, backendContext.publicSwimmerPayloadSupportsTopRebuild)(current)) {
      throw new Error(`Fiche publique au format historique pour ${swimmerKey}. Une reconstruction globale contrôlée est requise avant la publication ciblée.`);
    }
    const identitySeed = publicSeedRows.find((row) => row.swimmer || row.firstName || row.lastName || row.birthDate || row.sex) || {};
    const hydrationPayload = {
      ...(current || {}),
      id: (0, backendContext.cleanText)(current?.id || identitySeed.swimmerId || identitySeed.originalSwimmerId),
      identityKey: (0, backendContext.cleanText)(current?.identityKey || identitySeed.swimmerIdentityKey || swimmerKey),
      name: (0, backendContext.cleanText)(current?.name || identitySeed.swimmer),
      firstName: (0, backendContext.cleanText)(current?.firstName || identitySeed.firstName),
      lastName: (0, backendContext.cleanText)(current?.lastName || identitySeed.lastName),
      birthDate: (0, backendContext.cleanText)(current?.birthDate || identitySeed.birthDate),
      sex: (0, backendContext.cleanText)(current?.sex || identitySeed.sex),
      clubId: (0, backendContext.cleanText)(current?.clubId || identitySeed.clubId),
      club: (0, backendContext.cleanText)(current?.club || identitySeed.club),
      clubName: (0, backendContext.cleanText)(current?.clubName || identitySeed.clubName)
    };
    const affectedKeys = new Set(publicSeedRows.map(backendContext.local$publicPerformanceRowKey).filter(Boolean));
    const keptRows = (0, backendContext.hydratePublicSwimmerRowsFromPayload)(current?.rows, hydrationPayload, swimmerKey)
      .map(backendContext.publicPerformanceBaseRow)
      .filter((row) => !affectedKeys.has((0, backendContext.local$publicPerformanceRowKey)(row)));
    return (0, backendContext.uniquePublicPerformanceRows)([
      ...keptRows,
      ...publicSeedRows.filter(publicPerformanceActiveRow)
    ]);
  }

  async function rebuildPublicSwimmerFilesForAffectedRows(affectedRows = []) {
    const bySwimmer = new Map();
    affectedRows.map(backendContext.publicPerformanceBaseRow).forEach((row) => {
      const swimmerKey = (0, backendContext.publicSwimmerKey)(row);
      if (!swimmerKey) return;
      if (!bySwimmer.has(swimmerKey)) bySwimmer.set(swimmerKey, []);
      bySwimmer.get(swimmerKey).push(row);
    });

    const writtenFiles = new Set();
    const activeRowsBySwimmer = new Map();
    for (const [swimmerKey, rows] of bySwimmer.entries()) {
      const activeRows = await getActivePublicRowsForAffectedSwimmer(rows);
      activeRowsBySwimmer.set(swimmerKey, activeRows);
      const perfFile = (0, backendContext.local$publicPerformanceSwimmerFilePath)(swimmerKey);
      const existing = await (0, backendContext.local$readPublicPerformanceJson)(perfFile, null);
      if (existing) {
        const removed = await removePublicSearchIndexes(existing, perfFile);
        removed.forEach((filePath) => writtenFiles.add(filePath));
      }
      if (!activeRows.length) {
        writtenFiles.add(await deletePublicPerformanceFile(perfFile));
        continue;
      }
      const payload = (0, backendContext.local$buildPublicSwimmerPayload)(swimmerKey, activeRows);
      await (0, backendContext.local$savePublicPerformanceJson)(perfFile, payload, "public, max-age=31536000, immutable");
      writtenFiles.add((0, backendContext.local$publicPerformanceFilePath)(perfFile));
      const searchFiles = await (0, backendContext.local$publishPublicSearchIndexes)(payload, perfFile);
      searchFiles.forEach((filePath) => writtenFiles.add(filePath));
    }

    return {
      activeRowsBySwimmer,
      affectedSwimmers: bySwimmer.size,
      writtenFiles
    };
  }

  async function rebuildPublicTopFilesForAffectedRows(affectedRows = [], activeRowsBySwimmer = new Map()) {
    const publicAffectedRows = affectedRows.map(backendContext.publicPerformanceBaseRow);
    const topKeys = new Set(publicAffectedRows.map(publicPerformanceTopKey).filter(Boolean));
    const activeRows = Array.from(activeRowsBySwimmer.values()).flat();
    activeRows.map(backendContext.publicPerformanceBaseRow).forEach((row) => {
      const topKey = publicPerformanceTopKey(row);
      if (topKey) topKeys.add(topKey);
    });

    const writtenFiles = new Set();
    for (const topKey of topKeys) {
      const [course, sex, category] = topKey.split("|");
      if (!course || !sex || !category) continue;
      const affectedCandidateKeys = new Set(publicAffectedRows
        .filter((row) => publicPerformanceMatchesTopKey(row, topKey))
        .map(backendContext.local$publicPerformanceTopCandidateKey)
        .filter(Boolean));
      activeRows
        .filter((row) => publicPerformanceMatchesTopKey(row, topKey))
        .map(backendContext.local$publicPerformanceTopCandidateKey)
        .filter(Boolean)
        .forEach((key) => affectedCandidateKeys.add(key));

      const fileName = (0, backendContext.local$publicPerformanceTopFileName)(sex, category);
      const fullPath = `tops/${course}/${fileName}`;
      const previewPath = `tops-preview/${course}/${fileName}`;
      const existingRows = await (0, backendContext.local$readPublicPerformanceJson)(fullPath, []);
      const keptRows = (Array.isArray(existingRows) ? existingRows : [])
        .filter((row) => !affectedCandidateKeys.has((0, backendContext.local$publicPerformanceTopCandidateKey)(row)));
      const replacementRows = activeRows.filter((row) => publicPerformanceMatchesTopKey(row, topKey));
      const mergedRows = (0, backendContext.local$mergePublicTopRows)(keptRows, replacementRows);
      await (0, backendContext.local$savePublicPerformanceJson)(fullPath, mergedRows, "public, max-age=31536000, immutable");
      await (0, backendContext.local$savePublicPerformanceJson)(previewPath, (0, backendContext.local$distinctPublicTopPreview)(mergedRows, backendContext.PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT, backendContext.publicSwimmerKey), "public, max-age=31536000, immutable");
      writtenFiles.add((0, backendContext.local$publicPerformanceFilePath)(fullPath));
      writtenFiles.add((0, backendContext.local$publicPerformanceFilePath)(previewPath));
    }

    return {
      affectedTopBuckets: topKeys.size,
      writtenFiles
    };
  }

  async function rebuildPublicPerformanceFilesForAffectedRows(affectedRows = [], context = {}) {
    const rows = affectedRows.map(backendContext.publicPerformanceBaseRow).filter((row) => (0, backendContext.publicSwimmerKey)(row) || publicPerformanceTopKey(row));
    if (!rows.length) return { ok: true, affectedRows: 0, writtenFiles: 0 };

    const swimmerResult = await rebuildPublicSwimmerFilesForAffectedRows(rows);
    const topResult = await rebuildPublicTopFilesForAffectedRows(rows, swimmerResult.activeRowsBySwimmer);
    const generatedAt = context.now || new Date().toISOString();
    const currentManifest = await (0, backendContext.local$readPublicPerformanceJson)("manifest.json", {});
    const manifest = {
      ...(0, backendContext.local$mergePublicPerformanceManifest)(currentManifest, Array.from(swimmerResult.activeRowsBySwimmer.values()).flat(), generatedAt),
      lastTargetedRebuild: {
        generatedAt,
        reason: (0, backendContext.cleanText)(context.reason),
        affectedRows: rows.length,
        affectedSwimmers: swimmerResult.affectedSwimmers,
        affectedTopBuckets: topResult.affectedTopBuckets
      }
    };

    const writtenFiles = new Set([...swimmerResult.writtenFiles, ...topResult.writtenFiles]);
    writtenFiles.add(await (0, backendContext.local$savePublicPerformanceJson)("manifest.json", manifest, "public, max-age=300"));
    writtenFiles.add(await (0, backendContext.local$savePublicPerformanceText)("version.js", `window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(generatedAt)};\n`, "public, max-age=300"));

    return {
      ok: true,
      affectedRows: rows.length,
      affectedSwimmers: swimmerResult.affectedSwimmers,
      affectedTopBuckets: topResult.affectedTopBuckets,
      writtenFiles: writtenFiles.size,
      reason: (0, backendContext.cleanText)(context.reason)
    };
  }

  return { deletePublicPerformanceFile, removePublicSearchIndexes, publicPerformanceTopKey, publicPerformanceMatchesTopKey, publicPerformanceActiveRow, getActivePublicRowsForAffectedSwimmer, rebuildPublicSwimmerFilesForAffectedRows, rebuildPublicTopFilesForAffectedRows, rebuildPublicPerformanceFilesForAffectedRows };
}

module.exports = { createLegacyPerformancePublication_deletePublicPerformanceFile };
