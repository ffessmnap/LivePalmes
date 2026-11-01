// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_generateNativeClubRecapPdf(backendContext) {
  async function generateNativeClubRecapPdf(context, competitionId) {
    try {
      const competition = await (0, backendContext.local$nativePortalCompetition)(competitionId, () => {});
      const pool = require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const pack = await require("../../nap-portal-entries").readNativeClubEntry(pool, { competitionId, clubId: context.clubId }, ({ clubId }) => {
        if (String(clubId) !== String(context.clubId)) throw new backendContext.HttpsError("permission-denied", "Dossier hors du club autorise.");
      });
      const entry = await (0, backendContext.local$nativeClubEntryView)(pack,context,competition);
      if (!backendContext.engagementClubEntryHasParticipants(entry)) throw new backendContext.HttpsError("failed-precondition", "Aucun participant enregistre pour ce club.");
      const pdf = await backendContext.buildEngagementClubRecapPdf(competition, entry);
      if (!Buffer.isBuffer(pdf.buffer) || pdf.buffer.length > 10000000) throw new RangeError("Recapitulatif trop volumineux.");
      return { ok: true, source: "nap", fileName: pdf.fileName, contentType: "application/pdf", generatedAt: pdf.generatedAt,
        fromStorage: false, pdfBase64: pdf.buffer.toString("base64"), sqlBudget: { queriesMax: 25, rowsMax: 20519 } };
    } catch (error) {
      if (error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError ? "resource-exhausted" : error instanceof TypeError ? "failed-precondition" : "unavailable",
        error instanceof RangeError || error instanceof TypeError ? error.message : "Recapitulatif momentanement indisponible. Aucun engagement modifie.");
    }
  }

  return { generateNativeClubRecapPdf };
}

module.exports = { createCompetitionService_generateNativeClubRecapPdf };
