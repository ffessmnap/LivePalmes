// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_writeAuditLog(backendContext) {
  async function writeAuditLog(action, actorUid, target = {}) {
    const now = new Date().toISOString();
    await backendContext.db.collection("auditLogs").add({
      action,
      actorUid,
      target,
      createdAt: now
    });
  }

  return { writeAuditLog };
}

module.exports = { createAccessService_writeAuditLog };
