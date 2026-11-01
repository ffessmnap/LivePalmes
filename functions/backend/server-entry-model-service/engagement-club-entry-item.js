// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementClubEntryItem(backendContext) {
  function engagementClubEntryItem(doc, fallback = {}) {
    const data = doc?.exists ? doc.data() || {} : fallback;
    const teamLeader = data.teamLeader || {};
    const officials = Array.isArray(data.officials) ? data.officials : [];
    const swimmers = Array.isArray(data.swimmers) ? data.swimmers : [];
    const relays = Array.isArray(data.relays) ? data.relays : [];
    const documents = data.documents && typeof data.documents === "object" ? data.documents : {};
    const clubRecapPdf = backendContext.cleanEngagementDocumentMetadata(documents.clubRecapPdf || {});
    return {
      id: doc?.id || backendContext.engagementClubEntryId(data.competitionId, data.clubId),
      competitionId: backendContext.cleanText(data.competitionId).slice(0, 128),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubCode: backendContext.engagementClubCode(data.clubId, data.clubCode).slice(0, 40),
      clubName: backendContext.engagementClubName(data.clubId, data.clubName).slice(0, 140),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      status: backendContext.cleanText(data.status || "active"),
      qualificationAlert: data.qualificationAlert || null,
      teamLeader: {
        mode: backendContext.cleanText(teamLeader.mode),
        personId: backendContext.cleanText(teamLeader.personId).slice(0, 80),
        firstName: backendContext.cleanText(teamLeader.firstName),
        lastName: backendContext.cleanText(teamLeader.lastName),
        birthDate: backendContext.cleanIsoDate(teamLeader.birthDate),
        sex: ["F", "M"].includes(backendContext.cleanText(teamLeader.sex).toUpperCase()) ? backendContext.cleanText(teamLeader.sex).toUpperCase() : "",
        licenseNumber: backendContext.cleanText(teamLeader.licenseNumber),
        externalClub: teamLeader.externalClub === true,
        clubId: backendContext.cleanText(teamLeader.clubId),
        clubName: backendContext.cleanText(teamLeader.clubName),
        renunciationAccepted: teamLeader.renunciationAccepted === true
      },
      officials: officials.map(backendContext.local$cleanEngagementEntryOfficial).filter((official) => official.personId || official.licenseNumber),
      swimmers: swimmers.map(backendContext.local$cleanEngagementEntrySwimmer).filter((swimmer) => swimmer.swimmerIndexId || swimmer.swimmerId || swimmer.licenseNumber),
      relays: relays.map((relay) => ({
        relayId: backendContext.cleanText(relay.relayId).slice(0, 80),
        eventCode: backendContext.normalizeCourseCode(relay.eventCode),
        category: backendContext.cleanText(relay.category).toUpperCase().slice(0, 20),
        genderMode: backendContext.ENGAGEMENT_PROGRAM_GENDER_MODES.has(backendContext.cleanText(relay.genderMode)) ? backendContext.cleanText(relay.genderMode) : "female",
        manualEntryTime: backendContext.cleanText(relay.manualEntryTime).slice(0, 20),
        entryTime: backendContext.cleanText(relay.entryTime).slice(0, 20),
        entryTimeValue: Number(relay.entryTimeValue || 0) || 0,
        memberIds: (Array.isArray(relay.memberIds) ? relay.memberIds : [])
          .map((memberId) => backendContext.cleanText(memberId).slice(0, 80))
          .filter(Boolean),
        members: (Array.isArray(relay.members) ? relay.members : []).map((member) => ({
          swimmerIndexId: backendContext.cleanText(member.swimmerIndexId).slice(0, 80),
          swimmerId: backendContext.cleanText(member.swimmerId).slice(0, 80),
          firstName: backendContext.cleanText(member.firstName).slice(0, 80),
          lastName: backendContext.cleanText(member.lastName).slice(0, 80),
          name: backendContext.cleanText(member.name).slice(0, 160),
          birthDate: backendContext.cleanIsoDate(member.birthDate),
          sex: backendContext.normalizeCategoryCode(member.sex),
          licenseNumber: backendContext.cleanText(member.licenseNumber).slice(0, 60)
        })).filter((member) => member.swimmerIndexId)
      })).filter((relay) => relay.eventCode && relay.category),
      documents: clubRecapPdf ? { clubRecapPdf } : {},
      teamLeaderComplete: (0, backendContext.local$engagementTeamLeaderComplete)(teamLeader),
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40)
    };
  }

  return { engagementClubEntryItem };
}

module.exports = { createEntryModelService_engagementClubEntryItem };
