// Existing operation bodies; live services arrive through explicit accessors.
function createDirectoryService_accessUserDeletionRequestItem(backendContext) {
  function accessUserDeletionRequestItem(doc) {
    const data = doc.data() || {};
    return {
      id: doc.id,
      targetUid: data.targetUid || "",
      targetEmail: data.targetEmail || "",
      targetFirstName: data.targetFirstName || "",
      targetLastName: data.targetLastName || "",
      targetRegionId: data.targetRegionId || "",
      targetClubId: data.targetClubId || "",
      targetClubName: data.targetClubName || "",
      targetCapabilities: Array.isArray(data.targetCapabilities) ? data.targetCapabilities : [],
      status: data.status || "pending",
      requestedBy: data.requestedBy || "",
      requestedByEmail: data.requestedByEmail || "",
      requestedAt: data.requestedAt || "",
      resolvedBy: data.resolvedBy || "",
      resolvedAt: data.resolvedAt || "",
      decision: data.decision || ""
    };
  }

  return { accessUserDeletionRequestItem };
}

module.exports = { createDirectoryService_accessUserDeletionRequestItem };
