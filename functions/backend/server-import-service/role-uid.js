// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_roleUid(backendContext) {
  function roleUid(competitionId, role, clientId) {
    const digest = backendContext.crypto
      .createHash("sha256")
      .update(`${competitionId}|${role}|${backendContext.cleanText(clientId) || Date.now()}`)
      .digest("hex")
      .slice(0, 28);
    return `lp-${role}-${digest}`;
  }

  return { roleUid };
}

module.exports = { createImportService_roleUid };
