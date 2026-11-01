// Existing operation bodies; live services arrive through explicit accessors.
function createEntryService_nativeClubEntryTimeHistory(backendContext) {
  async function nativeClubEntryTimeHistory(context, competitionId, swimmerIndexId, rawCodes) {
    const requestedCodes = new Set((Array.isArray(rawCodes) ? rawCodes : []).slice(0, 30)
      .map(value => backendContext.cleanText(value).toUpperCase().replace(/\s+/g, "")).filter(Boolean));
    try {
      const pool = require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      const result = await require("../../nap-entry-time-preview").previewNativeTimes(pool,
        { competitionId, clubId: String(context.clubId), swimmerIds: [swimmerIndexId], enrolledOnly: true, includeIndividualEntries: true }, {
          authorize: ({ clubId }) => { if (String(clubId) !== String(context.clubId)) throw new backendContext.HttpsError("permission-denied", "Dossier hors du club autorise."); },
          preview: (person, rows, nativeCompetition, dossier) => {
            const competition = require("../../nap-competition-view").competitionItem(nativeCompetition, backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE);
            if (!["manual", "default595999"].includes(competition.missingEntryTimeMode)) {
              throw new backendContext.HttpsError("failed-precondition", "La modification des temps n'est pas autorisee pour cette competition.");
            }
            const links = new Set(dossier.inscriptions.filter(row => String(row.nageur) === String(person.id)).map(row => String(row.id)));
            const savedCodes = [...new Set(dossier.individual.filter(row => links.has(String(row.engagement)))
              .map(row => backendContext.cleanText(row.course).toUpperCase().replace(/\s+/g, ""))
              .filter(code => code && (!requestedCodes.size || requestedCodes.has(code))))];
            return savedCodes.map(eventCode => ({ eventCode, times: backendContext.engagementKnownTimeHistory(rows, eventCode, competition, 2000) }));
          }
        });
      return { ok: true, source: "nap", swimmerIndexId, events: result.swimmers[0].individualEntries, sqlBudget: result.sqlBudget };
    } catch (error) {
      if (error instanceof backendContext.HttpsError) throw error;
      throw new backendContext.HttpsError(error instanceof RangeError ? "resource-exhausted" : error instanceof TypeError ? "failed-precondition" : "unavailable",
        error instanceof RangeError || error instanceof TypeError ? error.message : "Historique NAP momentanement indisponible. Aucun engagement modifie.");
    }
  }

  return { nativeClubEntryTimeHistory };
}

module.exports = { createEntryService_nativeClubEntryTimeHistory };
