// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyPerformancePublication_mergePublicSwimmerRows(backendContext) {
  function mergePublicSwimmerRows(existingRows = [], incomingRows = []) {
    const byKey = new Map();
    [...existingRows, ...incomingRows].forEach((row) => {
      const key = (0, backendContext.local$publicPerformanceRowKey)(row);
      if (!key) return;
      byKey.set(key, (0, backendContext.local$publicPerformanceSwimmerRow)(row));
    });
    return (0, backendContext.local$sortPublicPerformanceRows)(Array.from(byKey.values()));
  }

  async function publishPublicSwimmerFile(indexKey, incomingRows = []) {
    const perfFile = (0, backendContext.local$publicPerformanceSwimmerFilePath)(indexKey);
    const existing = await (0, backendContext.local$readPublicPerformanceJson)(perfFile, null);
    const existingRows = Array.isArray(existing?.rows) ? existing.rows : [];
    const mergedRows = mergePublicSwimmerRows(existingRows, incomingRows);
    const generated = (0, backendContext.local$buildPublicSwimmerPayload)(indexKey, mergedRows);
    const payload = {
      ...generated,
      id: generated.id || (0, backendContext.cleanText)(existing?.id),
      identityKey: generated.identityKey || (0, backendContext.cleanText)(existing?.identityKey) || indexKey,
      aliases: Array.from(new Set([...(Array.isArray(existing?.aliases) ? existing.aliases : []), ...(generated.aliases || [])].map(backendContext.cleanText).filter(Boolean))),
      sourceIds: Array.from(new Set([...(Array.isArray(existing?.sourceIds) ? existing.sourceIds : []), ...(generated.sourceIds || [])].map(backendContext.cleanText).filter(Boolean))),
      name: generated.name || (0, backendContext.cleanText)(existing?.name),
      lastName: generated.lastName || (0, backendContext.cleanText)(existing?.lastName),
      firstName: generated.firstName || (0, backendContext.cleanText)(existing?.firstName),
      birthDate: generated.birthDate || (0, backendContext.cleanText)(existing?.birthDate),
      sex: generated.sex || (0, backendContext.cleanText)(existing?.sex),
      clubId: generated.clubId || (0, backendContext.cleanText)(existing?.clubId),
      club: generated.club || (0, backendContext.cleanText)(existing?.club),
      clubName: generated.clubName || (0, backendContext.cleanText)(existing?.clubName)
    };
    await (0, backendContext.local$savePublicPerformanceJson)(perfFile, payload, "public, max-age=31536000, immutable");
    return { perfFile, payload, existing };
  }

  async function publishPublicTopFiles(topKey, incomingRows = []) {
    const [course, sex, category] = topKey.split("|");
    if (!course || !sex || !category) return [];
    const fileName = (0, backendContext.local$publicPerformanceTopFileName)(sex, category);
    const fullPath = `tops/${course}/${fileName}`;
    const previewPath = `tops-preview/${course}/${fileName}`;
    const existingRows = await (0, backendContext.local$readPublicPerformanceJson)(fullPath, []);
    const mergedRows = (0, backendContext.local$mergePublicTopRows)(existingRows, incomingRows);
    const previewRows = (0, backendContext.local$distinctPublicTopPreview)(mergedRows, backendContext.PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT, backendContext.publicSwimmerKey);
    return [
      await (0, backendContext.local$savePublicPerformanceJson)(fullPath, mergedRows, "public, max-age=31536000, immutable"),
      await (0, backendContext.local$savePublicPerformanceJson)(previewPath, previewRows, "public, max-age=31536000, immutable")
    ];
  }

  async function publishIncrementalPublicPerformanceFiles(performances = [], context = {}) {
    const rows = performances
      .map(backendContext.publicPerformanceBaseRow)
      .filter((row) => row.active !== false && row.status !== "hidden" && row.course && row.sex && row.category && row.timeValue);
    if (!rows.length) return { ok: true, writtenFiles: 0, rowCount: 0 };

    const bySwimmer = new Map();
    const byTop = new Map();
    rows.forEach((row) => {
      const swimmerKey = (0, backendContext.publicSwimmerKey)(row);
      if (swimmerKey) {
        if (!bySwimmer.has(swimmerKey)) bySwimmer.set(swimmerKey, []);
        bySwimmer.get(swimmerKey).push(row);
      }
      const topKey = [row.course, row.sex, row.category].map(backendContext.cleanText).join("|");
      if (row.course && row.sex && row.category) {
        if (!byTop.has(topKey)) byTop.set(topKey, []);
        byTop.get(topKey).push(row);
      }
    });

    const writtenFiles = new Set();
    for (const [swimmerKey, swimmerRows] of bySwimmer.entries()) {
      const { perfFile, payload } = await publishPublicSwimmerFile(swimmerKey, swimmerRows);
      writtenFiles.add((0, backendContext.local$publicPerformanceFilePath)(perfFile));
      const searchFiles = await (0, backendContext.local$publishPublicSearchIndexes)(payload, perfFile);
      searchFiles.forEach((filePath) => writtenFiles.add(filePath));
    }
    for (const [topKey, topRows] of byTop.entries()) {
      const topFiles = await publishPublicTopFiles(topKey, topRows);
      topFiles.forEach((filePath) => writtenFiles.add(filePath));
    }

    const generatedAt = context.now || new Date().toISOString();
    const currentManifest = await (0, backendContext.local$readPublicPerformanceJson)("manifest.json", {});
    const manifest = (0, backendContext.local$mergePublicPerformanceManifest)(currentManifest, rows, generatedAt);
    writtenFiles.add(await (0, backendContext.local$savePublicPerformanceJson)("manifest.json", manifest, "public, max-age=300"));
    writtenFiles.add(await (0, backendContext.local$savePublicPerformanceText)("version.js", `window.LIVEPALMES_PERFORMANCE_PUBLIC_VERSION = ${JSON.stringify(generatedAt)};\n`, "public, max-age=300"));

    return {
      ok: true,
      rowCount: rows.length,
      affectedSwimmers: bySwimmer.size,
      affectedTopBuckets: byTop.size,
      writtenFiles: writtenFiles.size,
      importId: (0, backendContext.cleanText)(context.importId)
    };
  }

  return { mergePublicSwimmerRows, publishPublicSwimmerFile, publishPublicTopFiles, publishIncrementalPublicPerformanceFiles };
}

module.exports = { createLegacyPerformancePublication_mergePublicSwimmerRows };
