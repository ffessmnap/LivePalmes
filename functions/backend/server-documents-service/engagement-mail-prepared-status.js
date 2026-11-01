// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_engagementMailPreparedStatus(backendContext) {
  function engagementMailPreparedStatus() {
    return (0, backendContext.local$engagementMailSmtpConfig)().ready ? "ready" : "blocked_missing_config";
  }

  return { engagementMailPreparedStatus };
}

module.exports = { createDocumentsService_engagementMailPreparedStatus };
