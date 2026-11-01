// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_cleanEngagementDeadlineAt(backendContext) {
  function cleanEngagementDeadlineAt(value) {
    const text = (0, backendContext.local$cleanIsoDateTime)(value);
    if (!text) return "";
    const date = new Date(text);
    date.setUTCMinutes(0, 0, 0);
    return date.toISOString();
  }

  function isEngagementOpeningDeadlinePast(entryStatus, entryDeadlineAt, nowMs = Date.now()) {
    if (backendContext.cleanEngagementEntryStatus(entryStatus) !== "open" || !entryDeadlineAt) return false;
    const deadline = new Date(entryDeadlineAt);
    return !Number.isNaN(deadline.getTime()) && deadline.getTime() <= nowMs;
  }

  function isEngagementOpeningTooEarly(entryStatus, competitionDate, nowMs = Date.now()) {
    if (backendContext.cleanEngagementEntryStatus(entryStatus) !== "open" || !competitionDate) return false;
    const startMs = Date.parse(`${competitionDate}T00:00:00.000Z`);
    return Number.isFinite(startMs) && startMs - nowMs > 30 * 24 * 60 * 60 * 1000;
  }

  return { cleanEngagementDeadlineAt, isEngagementOpeningDeadlinePast, isEngagementOpeningTooEarly };
}

module.exports = { createClubPeopleService_cleanEngagementDeadlineAt };
