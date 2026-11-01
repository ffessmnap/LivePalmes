// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementPoolLaneCount(backendContext) {
  function cleanEngagementWaterBodyType(value) {
    const type = backendContext.cleanText(value);
    return backendContext.ENGAGEMENT_WATER_BODY_TYPES.has(type) ? type : "";
  }

  function cleanEngagementPoolLaneCount(value) {
    if (value === "" || value === null || value === undefined || value === 0 || value === "0") return 0;
    const laneCount = Number(value);
    if (!Number.isInteger(laneCount) || laneCount < 4 || laneCount > 10) {
      throw new backendContext.HttpsError("invalid-argument", "Le nombre de lignes d'eau doit etre compris entre 4 et 10.");
    }
    return laneCount;
  }

  function engagementCompetitionCalendarItem(data = {}, id = "") {
    const competitionType = (0, backendContext.local$cleanEngagementCompetitionType)(data.competitionType);
    const events = (0, backendContext.local$cleanEngagementCompetitionEvents)(data.events || [], { strict: false, competitionType });
    const programSessions = (0, backendContext.local$cleanEngagementProgramSessions)(data.programSessions || [], events, { strict: false });
    return {
      id: backendContext.cleanText(id || data.id).slice(0, 128),
      name: backendContext.cleanText(data.name || data.title).slice(0, 160),
      date: (0, backendContext.local$cleanIsoDate)(data.date),
      endDate: (0, backendContext.local$cleanIsoDate)(data.endDate) || (0, backendContext.local$cleanIsoDate)(data.date),
      location: backendContext.cleanText(data.location).slice(0, 160),
      city: backendContext.cleanText(data.city || data.location).slice(0, 120),
      address: backendContext.cleanText(data.address).slice(0, 300),
      organizer: backendContext.cleanText(data.organizer).slice(0, 160),
      organizerEmail: backendContext.normalizeEmail(data.organizerEmail).slice(0, 180),
      teamLeadersWhatsAppUrl: (0, backendContext.local$isNationalOnlyEngagementCompetitionLevel)(data.level)
        ? backendContext.cleanPublicCalendarWhatsAppUrl(data.teamLeadersWhatsAppUrl)
        : "",
      publicDescription: backendContext.cleanText(data.publicDescription).slice(0, 3000),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      invitedRegionIds: backendContext.cleanEngagementRegionIds(data.invitedRegionIds, data.regionId),
      level: (0, backendContext.local$cleanEngagementCompetitionLevel)(data.level || data.competitionLevel),
      competitionType,
      waterBodyType: competitionType === "openWater" ? cleanEngagementWaterBodyType(data.waterBodyType) : "",
      entryDeadlineAt: backendContext.cleanText(data.entryDeadlineAt).slice(0, 40),
      computerEmail: backendContext.normalizeEmail(data.computerEmail).slice(0, 180),
      officialsManagerEmail: backendContext.normalizeEmail(data.officialsManagerEmail).slice(0, 180),
      entryStatus: (0, backendContext.local$cleanEngagementEntryStatus)(data.entryStatus || data.status),
      publicationStatus: backendContext.cleanPublicCalendarPublicationStatus(data.publicationStatus),
      canceled: data.canceled === true,
      resultsPublishedAt: backendContext.cleanText(data.resultsPublishedAt).slice(0, 40),
      resultsUrl: backendContext.cleanText(data.resultsUrl).slice(0, 900),
      resultsPdfUrl: backendContext.cleanText(data.resultsPdfUrl).slice(0, 900),
      documentCount: backendContext.cleanCompetitionDocuments(data.clubDocuments || []).length,
      officialsRequired: data.officialsRequired === true,
      poolLength: (0, backendContext.local$cleanEngagementPoolLength)(data.poolLength),
      poolLaneCount: cleanEngagementPoolLaneCount(data.poolLaneCount),
      timingType: (0, backendContext.local$cleanEngagementTimingType)(data.timingType),
      qualificationTimesMode: (0, backendContext.local$cleanEngagementQualificationTimesMode)(data.qualificationTimesMode),
      qualificationStartDate: (0, backendContext.local$cleanIsoDate)(data.qualificationStartDate),
      qualificationEndDate: (0, backendContext.local$cleanIsoDate)(data.qualificationEndDate),
      missingEntryTimeMode: data.qualifications?.enabled ? "default595999" : (0, backendContext.local$cleanEngagementMissingEntryTimeMode)(data.missingEntryTimeMode),
      maxEventsPerSwimmer: (0, backendContext.local$cleanEngagementMaxEventsPerSwimmer)(data.maxEventsPerSwimmer),
      eventCount: events.length,
      individualEventCount: events.filter((event) => event.type === "individual").length,
      relayEventCount: events.filter((event) => event.type === "relay").length,
      sessionCount: programSessions.length,
      programItemCount: programSessions.reduce((sum, session) => sum + session.items.length, 0),
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40)
    };
  }

  return { cleanEngagementWaterBodyType, cleanEngagementPoolLaneCount, engagementCompetitionCalendarItem };
}

module.exports = { createCompetitionModelService_cleanEngagementPoolLaneCount };
