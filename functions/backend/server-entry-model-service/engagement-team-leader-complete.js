// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementTeamLeaderComplete(backendContext) {
  function engagementTeamLeaderComplete(teamLeader = {}) {
    if (teamLeader.mode === "renounced") return teamLeader.renunciationAccepted === true;
    return Boolean(teamLeader.mode === "person" && teamLeader.firstName && teamLeader.lastName && (teamLeader.externalClub ? teamLeader.clubName : teamLeader.licenseNumber));
  }

  return { engagementTeamLeaderComplete };
}

module.exports = { createEntryModelService_engagementTeamLeaderComplete };
