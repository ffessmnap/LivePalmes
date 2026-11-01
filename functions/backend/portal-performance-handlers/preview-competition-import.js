// Existing operation bodies; live services arrive through explicit accessors.
function createPerformanceHandlers_previewCompetitionImport(backendContext) {
  async function previewCompetitionImport(request) {
    backendContext.assertCapability(request, "competitions.import");
    if(request.data?.sourceType==="winpalme-zip-preview" && !backendContext.authorizeNativePerformance(request).national)throw new backendContext.HttpsError("permission-denied","Le contrôle des alertes ZIP est réservé à l’administration nationale.");
    if(request.data?.sourceType==="winpalme-zip-preview" && backendContext.ENVIRONMENT.sportingDataSource !== "nap")throw new backendContext.HttpsError("failed-precondition","L’aperçu ZIP nécessite la source NAP.");
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      backendContext.authorizeNativePerformance(request);
      if(request.data?.sourceType==="international-xlsx"||request.data?.workbook)throw new backendContext.HttpsError("failed-precondition","Le raccordement de l'import Excel international reste a terminer ; aucune ancienne base ne sera utilisee.");
      try{
        const result=require("../../nap-import-response").importPreviewResponse(await require("../../nap-import-preview").previewNativeImport(require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),request.data||{}));
        return request.data?.sourceType==="winpalme-zip-preview"?{...result,previewOnly:false,reviewReady:result.canConfirm===true}:result;
      }
      catch(error){throw backendContext.nativePerformanceFailure(error);}
    }
    const parsed = backendContext.parseCompetitionImportPayload(request.data || {});
    const fileHash = backendContext.stableHash(parsed.fileHashSeed || "");
    const importId = backendContext.importDocumentId(parsed.metadata, fileHash);
    const existing = await backendContext.db.collection("performanceImports").doc(importId).get();
    const existingData = existing.exists ? existing.data() || {} : {};
    const matchingImport = existing.exists && backendContext.activeCompetitionImportData(existingData)
      ? existing
      : await backendContext.findExistingCompetitionImport(parsed.metadata, importId);
    const matchingData = matchingImport?.data?.() || {};
    const existingImport = backendContext.competitionImportExistingSummary(matchingImport);
    const publicationStatus = backendContext.importPublicationStatus(matchingData);
    const recordAlerts = backendContext.detectRecordAlerts(parsed.performances, await backendContext.loadPerformanceRecordsData());
    return {
      ok: true,
      importId,
      alreadyImported: Boolean(existingImport),
      existingImport,
      identicalFile: Boolean(existingImport && existingImport.fileHash === fileHash),
      canReplaceImport: Boolean(existingImport && existingImport.status === "stored" && existingImport.importId !== importId),
      publicationStatus: publicationStatus || (existingImport ? "published" : ""),
      canResumePublication: Boolean(existingImport && backendContext.canResumeImportPublication(matchingData)),
      fileHash,
      sourceType: parsed.sourceType,
      metadata: parsed.metadata,
      summary: parsed.summary,
      warnings: parsed.warnings,
      recordAlerts: recordAlerts.slice(0, 100),
      recordAlertCount: recordAlerts.length,
      duplicateDetails: parsed.duplicateDetails.slice(0, 50),
      samplePerformances: parsed.performances.slice(0, 20),
      previewPerformances: parsed.performances.map(backendContext.competitionImportPreviewPerformance)
    };
  }

  return { previewCompetitionImport };
}

module.exports = { createPerformanceHandlers_previewCompetitionImport };
