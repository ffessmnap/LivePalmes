// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementMailJobId(backendContext) {
  function engagementMailJobId(payload = {}) {
    const identity = [
      backendContext.cleanText(payload.type),
      backendContext.cleanText(payload.competitionId),
      backendContext.cleanText(payload.clubId),
      backendContext.normalizeEmail(payload.toEmail)
    ];
    if (backendContext.cleanText(payload.notificationId)) identity.push(backendContext.cleanText(payload.notificationId));
    return backendContext.stableHash(identity.join("|")).slice(0, 40);
  }

  return { engagementMailJobId };
}

module.exports = { createMailService_engagementMailJobId };
