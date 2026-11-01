// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_generateEngagementCompetitionTxtExport(backendContext) {
  async function generateEngagementCompetitionTxtExport(request) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result=await backendContext.nativeAdminCompetitionEntries(context,competitionId);
      if(!["pool", "openWater"].includes(result.competition.competitionType)) throw new backendContext.HttpsError("failed-precondition","Type de competition non pris en charge pour l'export TXT.");
      const entries=result.entries.filter(backendContext.engagementClubEntryHasParticipants).map(entry=>({...entry,swimmers:entry.swimmers.map(person=>({...person,individualEntries:person.individualEntries.map(course=>course.nativeTime==="599999"?{...course,entryTime:"",manualEntryTime:"",entryTimeValue:0,entryTimeMode:"default595999"}:course)}))}));
      let txt;
      try {
        const exportEntries=result.competition.competitionType==="openWater"
          ? require("../../winpalme-open-water-manual").prepareManualOpenWaterEntries(entries) : entries;
        const exportCompetition=result.competition.competitionType==="openWater"
          ? await require("../../winpalme-open-water-manual").readManualOpenWaterCompetition(
            require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),result.competition)
          : result.competition;
        txt=result.competition.competitionType==="openWater"
          ? {...require("../../winpalme-open-water-manual").buildNativeManualOpenWaterTxt(exportCompetition,
            exportEntries.map(entry=>({...entry,swimmers:(entry.swimmers||[]).map(swimmer=>({...swimmer,category:backendContext.engagementTxtSwimmerCategory(swimmer,exportCompetition)}))})),result.clubsById),
            fileName:`engagements-winpalme-${backendContext.engagementPdfFileName(exportCompetition.name || exportCompetition.id)}.txt`}
          : backendContext.buildEngagementCompetitionTxt(exportCompetition,exportEntries,result.clubsById);
      }
      catch (error) {
        if(result.competition.competitionType==="openWater") throw new backendContext.HttpsError("failed-precondition", error.message || "Export eau libre indisponible.");
        throw error;
      }
      const buffer=txt.buffer;
      if (!Buffer.isBuffer(buffer)) throw new backendContext.HttpsError("internal", "Export TXT indisponible.");
      if(buffer.length>10000000) throw new backendContext.HttpsError("resource-exhausted","Export trop volumineux.");
      return {ok:true,source:"nap",competitionId,entryCount:entries.length,fileName:txt.fileName,contentType:"text/plain; charset=utf-8",generatedAt:result.generatedAt,fromStorage:false,txtBase64:buffer.toString("base64"),sqlBudget:result.competition.competitionType==="openWater" ? {...result.sqlBudget,queriesMax:result.sqlBudget.queriesMax+2,widRowsMax:1,catalogueRowsMax:300} : result.sqlBudget};
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    if (backendContext.cleanEngagementCompetitionType(competition.data()?.competitionType) === "openWater") {
      throw new backendContext.HttpsError("failed-precondition", "L'export TXT eau libre sera disponible apres validation de son format.");
    }
    backendContext.assertCanManageEngagementCompetition(context, competition.data() || {});
    const entriesSnapshot = await backendContext.db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(500)
      .get();
    const result = await backendContext.getOrCreateEngagementCompetitionTxt(competition, entriesSnapshot.docs, {
      force: request.data?.force === true
    });
    await backendContext.writeAuditLog("engagementCompetition.txtExportGenerated", context.uid, {
      competitionId,
      entryCount: result.entryCount,
      fileName: result.fileName,
      size: result.buffer.length,
      fromStorage: result.fromStorage
    });
    return {
      ok: true,
      competitionId,
      entryCount: result.entryCount,
      fileName: result.fileName,
      contentType: "text/plain; charset=utf-8",
      generatedAt: result.generatedAt,
      document: result.document,
      file: result.file,
      generatedFiles: result.generatedFiles,
      fromStorage: result.fromStorage,
      txtBase64: result.buffer.toString("base64")
    };
  }

  return { generateEngagementCompetitionTxtExport };
}

module.exports = { createCompetitionHandlers_generateEngagementCompetitionTxtExport };
