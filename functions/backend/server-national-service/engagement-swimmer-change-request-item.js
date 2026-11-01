// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_engagementSwimmerChangeRequestItem(backendContext) {
  function engagementSwimmerChangeRequestItem(doc) {
    const data = doc.data() || {};
    return backendContext.cleanFirestoreValue({
      id: doc.id,
      requestType: data.requestType === "swimmer-ns" ? "swimmer-ns" : data.requestType === "person-change" ? "person-change" : "swimmer-change",
      reportType: data.reportType === "duplicate" ? "duplicate" : "correction",
      status: backendContext.cleanText(data.status).slice(0, 40),
      napSource: data.napSource === true,
      requestedSource: backendContext.cleanText(data.requestedSource).slice(0, 40),
      requestedSwimmerId: backendContext.cleanText(data.requestedSwimmerId).slice(0, 80),
      targetSource: backendContext.cleanText(data.targetSource).slice(0, 40),
      targetSwimmerId: backendContext.cleanText(data.targetSwimmerId).slice(0, 80),
      current: data.current && typeof data.current === "object" ? (0, backendContext.local$engagementSwimmerIdentitySnapshot)(data.current, data.current.source) : {},
      proposed: data.proposed && typeof data.proposed === "object" ? (0, backendContext.local$engagementSwimmerIdentitySnapshot)(data.proposed, data.proposed.source) : {},
      resolvedProposed: data.resolvedProposed && typeof data.resolvedProposed === "object" ? (0, backendContext.local$engagementSwimmerIdentitySnapshot)(data.resolvedProposed, data.resolvedProposed.source) : {},
      proposalAdjusted: data.proposalAdjusted === true,
      reason: backendContext.cleanText(data.reason).slice(0, 500),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      requestedAt: backendContext.cleanText(data.requestedAt).slice(0, 40),
      requestedBy: backendContext.cleanText(data.requestedBy).slice(0, 128),
      requestedByEmail: backendContext.cleanText(data.requestedByEmail).slice(0, 180),
      requestedByFirstName: backendContext.cleanText(data.requestedByFirstName).slice(0, 80),
      requestedByLastName: backendContext.cleanText(data.requestedByLastName).slice(0, 80),
      resolvedAt: backendContext.cleanText(data.resolvedAt).slice(0, 40),
      resolvedBy: backendContext.cleanText(data.resolvedBy).slice(0, 128),
      resolutionNote: backendContext.cleanText(data.resolutionNote).slice(0, 500),
      resolutionNotification: {
        status: backendContext.cleanText(data.resolutionNotification?.status).slice(0, 40),
        attemptedAt: backendContext.cleanText(data.resolutionNotification?.attemptedAt).slice(0, 40),
        sentAt: backendContext.cleanText(data.resolutionNotification?.sentAt).slice(0, 40),
        reason: backendContext.cleanText(data.resolutionNotification?.reason).slice(0, 180)
      }
    });
  }

  return { engagementSwimmerChangeRequestItem };
}

module.exports = { createNationalService_engagementSwimmerChangeRequestItem };
