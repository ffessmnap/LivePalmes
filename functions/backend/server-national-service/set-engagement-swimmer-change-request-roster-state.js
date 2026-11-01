// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_setEngagementSwimmerChangeRequestRosterState(backendContext) {
  function setEngagementSwimmerChangeRequestRosterState(batch, target = {}, status = "", requestId = "", now = "") {
    const swimmer = (0, backendContext.local$engagementSwimmerIdentitySnapshot)(target.swimmer || target.current || {}, target.requestedSource || target.source);
    const rosterItem = {
      ...swimmer,
      id: target.requestedSwimmerId || swimmer.id,
      swimmerIndexId: target.requestedSwimmerId || swimmer.swimmerIndexId,
      source: target.requestedSource || swimmer.source,
      changeRequestStatus: status,
      changeRequestId: requestId,
      changeRequestedAt: status === "pending" ? now : "",
      active: true,
      updatedAt: now
    };
    backendContext.upsertEngagementClubRosterSwimmer(batch, backendContext.db, rosterItem, now);
  }

  return { setEngagementSwimmerChangeRequestRosterState };
}

module.exports = { createNationalService_setEngagementSwimmerChangeRequestRosterState };
