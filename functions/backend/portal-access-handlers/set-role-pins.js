// Retired national Direct. Installed URLs refuse without reading or changing data.
function createAccessHandlers_setRolePins(backendContext) {
  async function setRolePins(request) {
    await backendContext.assertCapability(request, "consoles.manage");
    throw new backendContext.HttpsError("failed-precondition", "L’ancien Direct national est retiré. Utilisez le nouveau Direct depuis le calendrier.");
  }
  return { setRolePins };
}
module.exports = { createAccessHandlers_setRolePins };
