// Retired national Direct. Installed URLs refuse without reading or changing data.
function createAccessHandlers_verifyPin(backendContext) {
  async function verifyPin() {
    throw new backendContext.HttpsError("failed-precondition", "L’ancien Direct national est retiré. Utilisez le nouveau Direct depuis le calendrier.");
  }
  return { verifyPin };
}
module.exports = { createAccessHandlers_verifyPin };
