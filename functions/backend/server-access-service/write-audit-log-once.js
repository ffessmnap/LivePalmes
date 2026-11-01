// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_writeAuditLogOnce(backendContext) {
  async function writeAuditLogOnce(action, actorUid, target = {}, eventId = "") {
    const now = new Date().toISOString();
    const auditId = (0, backendContext.local$stableHash)([action, eventId || now].join("|")).slice(0, 40);
    await backendContext.db.collection("auditLogs").doc(auditId).set({
      action,
      actorUid,
      target,
      createdAt: now
    }, { merge: false });
  }

  return { writeAuditLogOnce };
}

module.exports = { createAccessService_writeAuditLogOnce };
