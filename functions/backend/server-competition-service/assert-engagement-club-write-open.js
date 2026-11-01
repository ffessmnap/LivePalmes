// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_assertEngagementClubWriteOpen(backendContext) {
  function engagementClubWriteLockReason(competition = {}, nowMs = Date.now()) {
    if (competition.qualificationJobId) return "Contrôle des qualifications en cours. Réessayez après sa validation par le National.";
    const entryStatus = backendContext.cleanEngagementEntryStatus(competition.entryStatus || competition.status);
    if (entryStatus === "closed") return "Les engagements sont fermes.";
    if (entryStatus !== "open") return "Les engagements ne sont pas ouverts.";
    const deadline = backendContext.cleanIsoDateTime(competition.entryDeadlineAt);
    if (!deadline) return "";
    const deadlineMs = Date.parse(deadline);
    return Number.isFinite(deadlineMs) && deadlineMs < nowMs
      ? "La date limite des engagements est depassee."
      : "";
  }

  function assertEngagementClubWriteOpen(competition = {}) {
    const reason = engagementClubWriteLockReason(competition);
    if (reason) {
      throw new backendContext.HttpsError("failed-precondition", reason, {
        entryStatus: backendContext.cleanEngagementEntryStatus(competition.entryStatus || competition.status),
        entryDeadlineAt: backendContext.cleanIsoDateTime(competition.entryDeadlineAt)
      });
    }
  }

  return { engagementClubWriteLockReason, assertEngagementClubWriteOpen };
}

module.exports = { createCompetitionService_assertEngagementClubWriteOpen };
