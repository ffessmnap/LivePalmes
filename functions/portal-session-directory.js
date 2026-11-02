"use strict";
async function readPortalDirectorySnapshot({ db, HttpsError, managementContext }, request) {
  const actor = await managementContext(request);
  const scopeType = actor.adminFull || actor.national ? "national" : "region";
  const scopeId = scopeType === "national" ? "" : actor.regionId;
  if (scopeType === "region" && !scopeId) throw new HttpsError("permission-denied", "Région de gestion absente.");
  const id = scopeType === "national" ? "national" : `region:${encodeURIComponent(scopeId)}`;
  const snapshot = await db.collection("accessDirectorySnapshots").doc(id).get();
  if (!snapshot.exists) return { users:null };
  const data = snapshot.data() || {};
  if (data.status !== "ready" || Number(data.version) < 3 || data.scopeType !== scopeType || scopeType === "region" && data.scopeId !== scopeId) return { users:null };
  const entries = Object.values(data.entries && typeof data.entries === "object" ? data.entries : {});
  if (entries.length > 5000) throw new HttpsError("resource-exhausted", "Annuaire trop volumineux. Utilisez la consultation paginée.");
  return { users:entries.filter(item=>item && typeof item === "object" && item.uid) };
}
module.exports = { readPortalDirectorySnapshot };
