// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_resolveEngagementClubPersonSwimmer(backendContext) {
  async function resolveEngagementClubPersonSwimmer(db, context = {}, rawPerson = {}) {
    const swimmerIndexId = backendContext.cleanText(rawPerson.swimmerIndexId).slice(0, 80);
    if (!swimmerIndexId) return null;
    const swimmerSource = backendContext.cleanText(rawPerson.swimmerSource || rawPerson.source || "performances").slice(0, 40) || "performances";
    const rosterSnapshot = await backendContext.engagementClubRosterRef(db, context.clubId).get();
    if (!rosterSnapshot.exists) {
      throw new backendContext.HttpsError("failed-precondition", "Chargez d'abord les nageurs du club.");
    }
    const swimmer = backendContext.engagementClubRosterSwimmersFromData(rosterSnapshot.data() || {}).find((candidate) =>
      candidate.swimmerIndexId === swimmerIndexId && backendContext.cleanText(candidate.source || "performances") === swimmerSource
    );
    if (!swimmer || swimmer.clubId !== context.clubId || swimmer.active === false) {
      throw new backendContext.HttpsError("permission-denied", "Nageur hors perimetre club ou inactif.");
    }
    return swimmer;
  }

  return { resolveEngagementClubPersonSwimmer };
}

module.exports = { createCompetitionService_resolveEngagementClubPersonSwimmer };
