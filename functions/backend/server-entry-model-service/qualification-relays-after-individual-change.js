// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_qualificationRelaysAfterIndividualChange(backendContext) {
  function qualificationRelaysAfterIndividualChange(relays = [], swimmers = [], competition = {}) {
    const selectedIds = new Set(swimmers.map((swimmer) => swimmer.swimmerIndexId));
    relays = relays.map((relay) => ({ ...relay,
      memberIds: (relay.memberIds || []).filter((id) => selectedIds.has(id)),
      members: (relay.members || []).filter((member) => selectedIds.has(member.swimmerIndexId))
    }));
    if (!competition.qualifications?.enabled) return relays;
    const evaluations = Object.fromEntries(swimmers.map((swimmer) => [swimmer.swimmerIndexId, {
      courses: Object.fromEntries((swimmer.individualEntries || []).map((entry) => [entry.eventCode, entry.qualification || {}]))
    }]));
    return relays.filter((relay) => backendContext.qualificationEngine.relayEligible(relay, swimmers, evaluations));
  }

  return { qualificationRelaysAfterIndividualChange };
}

module.exports = { createEntryModelService_qualificationRelaysAfterIndividualChange };
