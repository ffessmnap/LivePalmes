// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_accessUserDisplayName(backendContext) {
  async function accessUserDisplayName(uid, fallbackToken = {}) {
    const cleanUid = backendContext.cleanText(uid);
    if (!cleanUid) return "";
    const snapshot = await backendContext.db.collection("users").doc(cleanUid).get().catch(() => null);
    const data = snapshot?.exists ? snapshot.data() || {} : {};
    return (0, backendContext.local$displayNameFromProfile)(data) || backendContext.cleanText(fallbackToken.name);
  }

  return { accessUserDisplayName };
}

module.exports = { createAccessService_accessUserDisplayName };
