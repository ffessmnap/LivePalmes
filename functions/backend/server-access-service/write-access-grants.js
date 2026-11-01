// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_writeAccessGrants(backendContext) {
  async function writeAccessGrants(uid, email, capabilities, status, actorUid, now, accessScopes = {}) {
    const batch = backendContext.db.batch();
    backendContext.ACCESS_CAPABILITIES.forEach((capability) => {
      const grantRef = backendContext.db.collection("accessGrants").doc(`${uid}_${capability.replace(".", "_")}`);
      const scope = (0, backendContext.local$normalizedAccessScope)(accessScopes[capability]);
      batch.set(grantRef, {
        uid,
        email,
        capability,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        status: capabilities.includes(capability) ? status : "inactive",
        updatedAt: now,
        updatedBy: actorUid,
        createdAt: now
      }, { merge: true });
    });
    return batch.commit();
  }

  return { writeAccessGrants };
}

module.exports = { createAccessService_writeAccessGrants };
