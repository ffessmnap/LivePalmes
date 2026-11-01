// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_migrationChunkStatuses(backendContext) {
  async function performanceBaseMigrationManifest() {
    const response = await fetch(`${backendContext.PERFORMANCE_PUBLIC_DATA_URL}/performance-base-migration-manifest.json?cache=${Date.now()}`);
    if (!response.ok) {
      throw new backendContext.HttpsError("failed-precondition", "Manifeste de migration historique introuvable.");
    }
    const manifest = await response.json();
    const chunks = Array.isArray(manifest.chunks) ? manifest.chunks : [];
    return {
      ...manifest,
      chunks: chunks
        .map((chunk) => ({
          name: backendContext.cleanText(chunk.name),
          performanceCount: Number(chunk.performanceCount || 0) || 0,
          swimmerCount: Number(chunk.swimmerCount || 0) || 0,
          bytes: Number(chunk.bytes || 0) || 0
        }))
        .filter((chunk) => /^chunk-[A-Za-z0-9-]+\.json$/.test(chunk.name))
    };
  }

  async function migrationChunkStatuses(chunks = []) {
    const refs = chunks.map((chunk) => backendContext.db.collection(backendContext.PERFORMANCE_BASE_MIGRATION_COLLECTION).doc(chunk.name));
    const snapshots = refs.length ? await backendContext.db.getAll(...refs) : [];
    const byName = new Map();
    snapshots.forEach((snapshot) => {
      byName.set(snapshot.id, snapshot.exists ? snapshot.data() || {} : {});
    });
    return chunks.map((chunk) => ({
      ...chunk,
      status: byName.get(chunk.name)?.status || "pending",
      migratedCount: Number(byName.get(chunk.name)?.migratedCount || 0) || 0,
      totalCount: Number(byName.get(chunk.name)?.totalCount || chunk.performanceCount || 0) || 0,
      lastBatchCount: Number(byName.get(chunk.name)?.lastBatchCount || 0) || 0,
      updatedAt: byName.get(chunk.name)?.updatedAt || "",
      completedAt: byName.get(chunk.name)?.completedAt || "",
      error: byName.get(chunk.name)?.error || ""
    }));
  }

  return { performanceBaseMigrationManifest, migrationChunkStatuses };
}

module.exports = { createLegacyService_migrationChunkStatuses };
