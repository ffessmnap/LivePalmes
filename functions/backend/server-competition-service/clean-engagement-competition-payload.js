// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_cleanEngagementCompetitionPayload(backendContext) {
  function cleanEngagementCompetitionPayload(raw = {}, context = {}) {
    const name = backendContext.cleanText(raw.name).slice(0, 160);
    const date = backendContext.cleanIsoDate(raw.date);
    const endDate = backendContext.cleanIsoDate(raw.endDate) || date;
    const location = backendContext.cleanText(raw.location).slice(0, 160);
    const city = backendContext.cleanText(raw.city || raw.location).slice(0, 120);
    const address = backendContext.cleanText(raw.address).slice(0, 300);
    const organizer = backendContext.cleanText(raw.organizer).slice(0, 160);
    const organizerEmail = backendContext.cleanOptionalEmail(raw.organizerEmail, "Email organisateur");
    const publicDescription = backendContext.cleanText(raw.publicDescription).slice(0, 3000);
    const level = backendContext.cleanEngagementCompetitionLevel(raw.level);
    const requestedTeamLeadersWhatsAppUrl = backendContext.cleanText(raw.teamLeadersWhatsAppUrl).slice(0, 500);
    const teamLeadersWhatsAppUrl = context.national && backendContext.isNationalOnlyEngagementCompetitionLevel(level)
      ? backendContext.cleanPublicCalendarWhatsAppUrl(requestedTeamLeadersWhatsAppUrl)
      : "";
    const entryDeadlineAt = backendContext.cleanEngagementDeadlineAt(raw.entryDeadlineAt);
    const computerEmail = backendContext.cleanOptionalEmail(raw.computerEmail, "Email du responsable informatique");
    const officialsManagerEmail = backendContext.cleanOptionalEmail(raw.officialsManagerEmail, "Email du responsable juge");
    const entryStatus = backendContext.cleanEngagementEntryStatus(raw.entryStatus);
    const publicationStatus = "published";
    const competitionType = backendContext.cleanEngagementCompetitionType(raw.competitionType);
    const waterBodyType = competitionType === "openWater" ? backendContext.cleanEngagementWaterBodyType(raw.waterBodyType) : "";
    const poolLength = competitionType === "pool" ? backendContext.cleanEngagementPoolLength(raw.poolLength) : "";
    const poolLaneCount = competitionType === "pool" ? backendContext.cleanEngagementPoolLaneCount(raw.poolLaneCount) : 0;
    const timingType = backendContext.cleanEngagementTimingType(raw.timingType);
    const qualificationTimesMode = competitionType === "openWater" ? "all" : backendContext.cleanEngagementQualificationTimesMode(raw.qualificationTimesMode);
    const qualificationStartDate = qualificationTimesMode === "period" ? backendContext.cleanIsoDate(raw.qualificationStartDate) : "";
    const qualificationEndDate = qualificationTimesMode === "period" ? backendContext.cleanIsoDate(raw.qualificationEndDate) : "";
    const missingEntryTimeMode = competitionType === "openWater" ? "none" : backendContext.cleanEngagementMissingEntryTimeMode(raw.missingEntryTimeMode);
    const maxEventsPerSwimmer = backendContext.cleanEngagementMaxEventsPerSwimmer(raw.maxEventsPerSwimmer);
    const requestedRegionId = backendContext.cleanText(raw.regionId).slice(0, 80);
    const regionId = backendContext.isNationalOnlyEngagementCompetitionLevel(level) ? "" : (context.national ? requestedRegionId : context.regionId);
    const invitedRegionIds = backendContext.isNationalOnlyEngagementCompetitionLevel(level) ? [] : backendContext.cleanEngagementRegionIds(raw.invitedRegionIds, regionId);
    const events = Object.prototype.hasOwnProperty.call(raw, "events")
      ? backendContext.cleanEngagementCompetitionEvents(raw.events, { competitionType })
      : null;
    const programSessions = events
      ? backendContext.cleanEngagementProgramSessions(raw.programSessions || [], events)
      : null;
    const programItemCount = (programSessions || [])
      .reduce((sum, session) => sum + (session.items || []).length, 0);

    if (!context.national && !context.region) {
      throw new backendContext.HttpsError("permission-denied", "Droit creation competition engagements requis.");
    }
    if (!context.national && backendContext.isNationalOnlyEngagementCompetitionLevel(level)) {
      throw new backendContext.HttpsError("permission-denied", "Une competition nationale doit etre creee par le niveau national.");
    }
    if (!context.national && entryStatus === "closed") {
      throw new backendContext.HttpsError("permission-denied", "La fermeture des engagements est automatique apres la date de cloture.");
    }
    if (!name || !date || !city) {
      throw new backendContext.HttpsError("invalid-argument", "Nom, date et ville sont obligatoires.");
    }
    if (endDate && endDate < date) {
      throw new backendContext.HttpsError("invalid-argument", "La date de fin doit etre egale ou posterieure a la date de debut.");
    }
    if (!backendContext.isNationalOnlyEngagementCompetitionLevel(level) && !regionId) {
      throw new backendContext.HttpsError("invalid-argument", "Region obligatoire pour une competition departementale ou regionale.");
    }
    if (context.national && backendContext.isNationalOnlyEngagementCompetitionLevel(level) && requestedTeamLeadersWhatsAppUrl && !teamLeadersWhatsAppUrl) {
      throw new backendContext.HttpsError("invalid-argument", "Le lien du groupe WhatsApp doit commencer par https://chat.whatsapp.com/.");
    }
    if (entryStatus === "open" && publicationStatus !== "published") {
      throw new backendContext.HttpsError("failed-precondition", "Publiez la competition avant d'ouvrir les engagements.");
    }
    if (entryStatus === "open" && !programItemCount) {
      throw new backendContext.HttpsError("failed-precondition", "Ajoutez au moins une course au programme avant d'ouvrir les engagements.");
    }
    if (qualificationTimesMode === "period" && (!qualificationStartDate || !qualificationEndDate)) {
      throw new backendContext.HttpsError("invalid-argument", "Periode des temps d'engagement incomplete.");
    }
    if (qualificationTimesMode === "period" && qualificationStartDate > qualificationEndDate) {
      throw new backendContext.HttpsError("invalid-argument", "La fin de periode des temps doit etre apres le debut.");
    }
    if (entryStatus === "open" && !entryDeadlineAt) {
      throw new backendContext.HttpsError("failed-precondition", "Renseignez la date et l'heure de cloture avant d'ouvrir les engagements.");
    }
    if (backendContext.isEngagementOpeningDeadlinePast(entryStatus, entryDeadlineAt)) {
      throw new backendContext.HttpsError("failed-precondition", "Impossible d'ouvrir les engagements : la date de cloture est depassee.");
    }
    if (backendContext.isEngagementOpeningTooEarly(entryStatus, date)) {
      throw new backendContext.HttpsError("failed-precondition", "Impossible d'ouvrir les engagements plus de 30 jours avant la competition.");
    }
    if (entryStatus === "open" && !timingType) {
      throw new backendContext.HttpsError("failed-precondition", "Renseignez le chronometrage avant d'ouvrir les engagements.");
    }
    if (entryStatus === "open" && competitionType === "pool" && (!poolLength || !poolLaneCount)) {
      throw new backendContext.HttpsError("failed-precondition", "Renseignez le bassin et le nombre de lignes d'eau avant d'ouvrir les engagements.");
    }

    return {
      name,
      date,
      endDate,
      location,
      city,
      address,
      organizer,
      organizerEmail,
      teamLeadersWhatsAppUrl,
      publicDescription,
      regionId,
      invitedRegionIds,
      level,
      competitionType,
      waterBodyType,
      entryDeadlineAt,
      computerEmail,
      officialsManagerEmail,
      entryStatus,
      publicationStatus,
      canceled: raw.canceled === true,
      officialsRequired: raw.officialsRequired === true,
      poolLength,
      poolLaneCount,
      timingType,
      qualificationTimesMode,
      qualificationStartDate,
      qualificationEndDate,
      missingEntryTimeMode,
      maxEventsPerSwimmer,
      ...(Object.prototype.hasOwnProperty.call(raw, "fees")
        ? { fees: backendContext.cleanEngagementFees(raw.fees) }
        : {}),
      ...(events
        ? {
            events,
            programSessions
          }
        : {})
    };
  }

  return { cleanEngagementCompetitionPayload };
}

module.exports = { createCompetitionService_cleanEngagementCompetitionPayload };
