// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_generateEngagementClubRecapPdf(backendContext) {
  async function generateEngagementClubRecapPdf(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") return backendContext.generateNativeClubRecapPdf(context, competitionId);
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    const entry = await backendContext.db
      .collection("engagementClubEntries")
      .doc(backendContext.engagementClubEntryId(competitionId, context.clubId))
      .get();
    if (!entry.exists) {
      throw new backendContext.HttpsError("failed-precondition", "Aucune inscription club a recapitulatif.");
    }
    const entryData = backendContext.engagementClubEntryItem(entry);
    if (entryData.clubId !== context.clubId) {
      throw new backendContext.HttpsError("permission-denied", "Inscription hors perimetre club.");
    }
    if (!backendContext.engagementClubEntryHasParticipants(entryData)) {
      throw new backendContext.HttpsError("failed-precondition", "Ajoutez au moins un nageur, un officiel ou un relais avant de generer le recapitulatif.");
    }
    const { buffer, generatedAt, fileName, document, fromStorage } = await backendContext.getOrCreateEngagementClubRecapPdf(competition, entry, {
      force: request.data?.force === true
    });
    await backendContext.writeAuditLog("engagementClubEntry.recapPdfGenerated", context.uid, {
      competitionId,
      clubId: context.clubId,
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

  return { generateEngagementClubRecapPdf };
}

module.exports = { createClubHandlers_generateEngagementClubRecapPdf };
