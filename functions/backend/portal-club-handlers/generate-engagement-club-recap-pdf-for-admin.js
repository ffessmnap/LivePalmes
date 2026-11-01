// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_generateEngagementClubRecapPdfForAdmin(backendContext) {
  async function generateEngagementClubRecapPdfForAdmin(request) {
    const context = await backendContext.engagementAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    const clubId = backendContext.cleanText(request.data?.clubId).slice(0, 40);
    if (!competitionId || !clubId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition et club requis.");
    }
    if(backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const result=await backendContext.nativeAdminCompetitionEntries(context,competitionId),entry=result.entries.find(item=>item.clubId===clubId);
      if(!entry || !backendContext.engagementClubEntryHasParticipants(entry)) throw new backendContext.HttpsError("not-found","Aucun participant NAP pour ce club.");
      const pdf=await backendContext.buildEngagementClubRecapPdf(result.competition,entry);
      if(!Buffer.isBuffer(pdf.buffer) || pdf.buffer.length>10000000) throw new backendContext.HttpsError("resource-exhausted","PDF trop volumineux.");
      return {ok:true,source:"nap",fileName:pdf.fileName,contentType:"application/pdf",generatedAt:pdf.generatedAt,fromStorage:false,pdfBase64:pdf.buffer.toString("base64"),sqlBudget:result.sqlBudget};
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertCanManageEngagementCompetition(context, competition.data() || {});
    const entry = await backendContext.db
      .collection("engagementClubEntries")
      .doc(backendContext.engagementClubEntryId(competitionId, clubId))
      .get();
    if (!entry.exists) {
      throw new backendContext.HttpsError("not-found", "Inscription club introuvable.");
    }
    const entryData = backendContext.engagementClubEntryItem(entry);
    if (entryData.clubId !== clubId) {
      throw new backendContext.HttpsError("permission-denied", "Inscription club incoherente.");
    }
    if (!backendContext.engagementClubEntryHasParticipants(entryData)) {
      throw new backendContext.HttpsError("failed-precondition", "Ce club ne contient encore aucun nageur, officiel ou relais engage.");
    }
    const { buffer, generatedAt, fileName, document, fromStorage } = await backendContext.getOrCreateEngagementClubRecapPdf(competition, entry, {
      force: request.data?.force === true
    });
    await backendContext.writeAuditLog("engagementCompetition.clubRecapPdfGeneratedByAdmin", context.uid, {
      competitionId,
      clubId,
      fileName,
      size: buffer.length,
      fromStorage
    });
    return {
      ok: true,
      fileName,
      contentType: "application/pdf",
      generatedAt,
      document,
      fromStorage,
      pdfBase64: buffer.toString("base64")
    };
  }

  return { generateEngagementClubRecapPdfForAdmin };
}

module.exports = { createClubHandlers_generateEngagementClubRecapPdfForAdmin };
