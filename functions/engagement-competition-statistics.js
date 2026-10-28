// Preserve the execution mode of the existing index.js function bodies.

// Existing behavior extracted from index.js. Dependencies are supplied by its entry points.
function createCompetitionStatistics({
  ageCategoryFromDates,
  cleanText,
  engagementClubCode,
  engagementClubEntryHasParticipants,
  engagementClubName,
  engagementPdfEventLabel,
  normalizeCourseCode
}) {
  function engagementCompetitionStatisticsItem(entries = [], competition = {}) {
    const clubRows = [];
    const individualRowsByEvent = new Map();
    const relayRowsByEvent = new Map();
    const counts = {
      clubCount: 0,
      swimmerCount: 0,
      femaleCount: 0,
      maleCount: 0,
      unknownSexCount: 0,
      individualEntryCount: 0,
      relayCount: 0,
      officialCount: 0,
      manualTimeCount: 0,
      unknownTimeOriginCount: 0,
      defaultTimeCount: 0,
      incompleteClubCount: 0
    };
    let returnedIndividualRowCount = 0;
    let returnedRelayRowCount = 0;
    const maximumReturnedRows = 10000;
    let truncated = false;

    entries.filter(engagementClubEntryHasParticipants).forEach((entry) => {
      const swimmers = Array.isArray(entry.swimmers) ? entry.swimmers : [];
      const relays = Array.isArray(entry.relays) ? entry.relays : [];
      const officials = Array.isArray(entry.officials) ? entry.officials : [];
      const individualCount = swimmers.reduce((sum, swimmer) => sum + (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries.length : 0), 0);
      counts.clubCount += 1;
      counts.swimmerCount += swimmers.length;
      counts.individualEntryCount += individualCount;
      counts.relayCount += relays.length;
      counts.officialCount += officials.length;
      if (!entry.teamLeaderComplete || (competition.officialsRequired === true && !officials.length)) counts.incompleteClubCount += 1;
      swimmers.forEach((swimmer) => {
        const sex = cleanText(swimmer.sex).toUpperCase();
        if (sex === "F") counts.femaleCount += 1;
        else if (sex === "M") counts.maleCount += 1;
        else counts.unknownSexCount += 1;
        (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : []).forEach((individualEntry) => {
          const eventCode = normalizeCourseCode(individualEntry.eventCode);
          if (!eventCode) return;
          const entryTimeMode = cleanText(individualEntry.entryTimeMode);
          if (entryTimeMode === "manual") counts.manualTimeCount += 1;
          if (entryTimeMode === "native") counts.unknownTimeOriginCount += 1;
          if (entryTimeMode === "default595999") counts.defaultTimeCount += 1;
          if (returnedIndividualRowCount + returnedRelayRowCount >= maximumReturnedRows) {
            truncated = true;
            return;
          }
          if (!individualRowsByEvent.has(eventCode)) individualRowsByEvent.set(eventCode, []);
          individualRowsByEvent.get(eventCode).push({
            eventCode,
            firstName: cleanText(swimmer.firstName).slice(0, 80),
            lastName: cleanText(swimmer.lastName || swimmer.name).slice(0, 80),
            sex: sex === "F" || sex === "M" ? sex : "",
            category: ageCategoryFromDates(competition.date, swimmer.birthDate) || "",
            clubId: cleanText(entry.clubId).slice(0, 40),
            clubCode: engagementClubCode(entry.clubId, entry.clubCode).slice(0, 40),
            entryTime: cleanText(individualEntry.entryTime || individualEntry.manualEntryTime).slice(0, 20) || "-",
            entryTimeValue: Number(individualEntry.entryTimeValue || 0) || 0,
            entryTimeMode
          });
          returnedIndividualRowCount += 1;
        });
      });
      relays.forEach((relay) => {
        const eventCode = normalizeCourseCode(relay.eventCode);
        if (!eventCode) return;
        if (returnedIndividualRowCount + returnedRelayRowCount >= maximumReturnedRows) {
          truncated = true;
          return;
        }
        if (!relayRowsByEvent.has(eventCode)) relayRowsByEvent.set(eventCode, []);
        relayRowsByEvent.get(eventCode).push({
          eventCode,
          clubId: cleanText(entry.clubId).slice(0, 40),
          clubCode: engagementClubCode(entry.clubId, entry.clubCode).slice(0, 40),
          category: cleanText(relay.category).slice(0, 20),
          genderMode: cleanText(relay.genderMode).slice(0, 20),
          entryTime: cleanText(relay.entryTime || relay.manualEntryTime).slice(0, 20) || "-",
          entryTimeValue: Number(relay.entryTimeValue || 0) || 0,
          members: (Array.isArray(relay.members) ? relay.members : []).slice(0, 4).map((member) => ({
            firstName: cleanText(member.firstName).slice(0, 80),
            lastName: cleanText(member.lastName || member.name).slice(0, 80)
          }))
        });
        returnedRelayRowCount += 1;
      });
      clubRows.push({
        clubId: cleanText(entry.clubId).slice(0, 40),
        clubCode: engagementClubCode(entry.clubId, entry.clubCode).slice(0, 40),
        clubName: engagementClubName(entry.clubId, entry.clubName).slice(0, 140),
        swimmerCount: swimmers.length,
        femaleCount: swimmers.filter((swimmer) => cleanText(swimmer.sex).toUpperCase() === "F").length,
        maleCount: swimmers.filter((swimmer) => cleanText(swimmer.sex).toUpperCase() === "M").length,
        individualCount,
        relayCount: relays.length,
        officialCount: officials.length,
        teamLeaderComplete: entry.teamLeaderComplete === true,
        updatedAt: cleanText(entry.updatedAt).slice(0, 40)
      });
    });

    const sortByEntryTime = (left, right) => {
      const leftTime = Number(left.entryTimeValue || 0) || Number.MAX_SAFE_INTEGER;
      const rightTime = Number(right.entryTimeValue || 0) || Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime || cleanText(left.lastName || left.clubCode || left.clubId).localeCompare(cleanText(right.lastName || right.clubCode || right.clubId), "fr");
    };
    individualRowsByEvent.forEach((rows) => rows.sort(sortByEntryTime));
    relayRowsByEvent.forEach((rows) => rows.sort(sortByEntryTime));
    clubRows.sort((left, right) => cleanText(left.clubCode || left.clubName).localeCompare(cleanText(right.clubCode || right.clubName), "fr"));

    const configuredEvents = Array.isArray(competition.events) ? competition.events : [];
    const eventCodes = [];
    configuredEvents.forEach((event) => {
      const code = normalizeCourseCode(event.code || event.eventCode);
      if (code && !eventCodes.includes(code)) eventCodes.push(code);
    });
    [...individualRowsByEvent.keys(), ...relayRowsByEvent.keys()].forEach((code) => {
      if (!eventCodes.includes(code)) eventCodes.push(code);
    });
    const events = eventCodes.map((eventCode) => {
      const configuredEvent = configuredEvents.find((event) => normalizeCourseCode(event.code || event.eventCode) === eventCode) || {};
      const type = configuredEvent.type === "relay" || relayRowsByEvent.has(eventCode) && !individualRowsByEvent.has(eventCode) ? "relay" : "individual";
      const rows = type === "relay" ? relayRowsByEvent.get(eventCode) || [] : individualRowsByEvent.get(eventCode) || [];
      return {
        eventCode,
        label: engagementPdfEventLabel(eventCode),
        type,
        entryCount: rows.length,
        rows
      };
    });

    return { counts, events, clubs: clubRows, truncated };
  }

  return {
    engagementCompetitionStatisticsItem
  };
}

module.exports = { createCompetitionStatistics };
