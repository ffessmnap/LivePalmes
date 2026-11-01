// Existing operation bodies; live services arrive through explicit accessors.
function createAccessHandlers_deleteAccessUser(backendContext) {
  async function deleteAccessUser(request) {
    const context = await backendContext.accessManagementContext(request);
    if (!context.national) {
      throw new backendContext.HttpsError("permission-denied", "Admin national requis.");
    }
    if (request.data?.confirmPermanent !== true) {
      throw new backendContext.HttpsError("failed-precondition", "Confirmation de suppression definitive requise.");
    }
    return backendContext.deleteAccessUserAccount(request.data?.uid, context.uid, { mode: "direct" });
  }

  return { deleteAccessUser };
}

module.exports = { createAccessHandlers_deleteAccessUser };
