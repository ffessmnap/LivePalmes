// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_normalizedImportPerformances(backendContext) {
  async function normalizedImportPerformances(importId) {
    const importRef = backendContext.db.collection("performanceImports").doc(importId);
    const importDoc = await importRef.get();
    if (!importDoc.exists) return [];
    const importData = importDoc.data() || {};
    if (importData.status !== "stored") return [];
    const metadata = importData.metadata || {};
    const performancesSnapshot = await importRef
      .collection("performances")
      .where("active", "==", true)
      .get();
    const rawPerformances = performancesSnapshot.docs.map((perfDoc) => ({
      id: perfDoc.id,
      importId,
      metadata,
      competitionName: importData.competitionName || metadata.competitionName || "",
      importedAt: importData.importedAt || "",
      ...perfDoc.data()
    }));
    return backendContext.normalizeLivePalmesImportPerformances(rawPerformances);
  }

  async function syncImportToPerformanceBase(importId, context = {}) {
    const performances = await normalizedImportPerformances(importId);
    const result = await backendContext.writePerformanceBaseRows(performances, {
      ...context,
      importId,
      action: "performanceImport.synced",
      changeSeed: importId
    });
    await backendContext.db.collection("performanceImports").doc(importId).set({
      performanceBaseSyncedAt: context.now || new Date().toISOString(),
      performanceBaseCount: result.written
    }, { merge: true });
    return result;
  }

  return { normalizedImportPerformances, syncImportToPerformanceBase };
}

module.exports = { createLegacyService_normalizedImportPerformances };
