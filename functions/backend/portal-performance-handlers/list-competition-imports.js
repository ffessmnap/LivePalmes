// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_listCompetitionImports(backendContext) {
  async function listCompetitionImports(request) {
    backendContext.assertCapability(request, "competitions.import");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      backendContext.authorizeNativePerformance(request);
      try {
        return await require("../../nap-import-history").readImportHistory(require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD));
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

  return { listCompetitionImports };
}

module.exports = { createPerformanceHandlers_listCompetitionImports };
