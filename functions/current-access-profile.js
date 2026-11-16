"use strict";

// A callable request is server-created. Keep one authoritative read for that
// request only; never retain an authorization between two calls or users.
function requestCache() {
  // Initialize on the first guarded call, without eager module side effects.
  if (!requestCache.value) requestCache.value = new WeakMap();
  return requestCache.value;
}

function readCurrentAccessProfile(request, { db, HttpsError }) {
  const uid = request.auth?.uid;
  if (!uid) return Promise.reject(new HttpsError("unauthenticated", "Connexion Firebase requise."));
  const requests = requestCache();
  const previous = requests.get(request);
  if (previous && previous.uid === uid && previous.db === db) return previous.promise;
  const entry = { uid, db };
  entry.promise = (async () => {
    let snapshot;
    try {
      snapshot = await db.collection("users").doc(uid).get();
    } catch {
      throw new HttpsError("unavailable", "Verification des droits indisponible. Reessayez.");
    }
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active") {
      throw new HttpsError("permission-denied", "Acces LivePalmes desactive ou absent.");
    }
    entry.data = Object.freeze({ ...data, capabilities: Object.freeze({ ...data.capabilities }),
      accessScopes: Object.freeze({ ...data.accessScopes }) });
    return { snapshot, data: entry.data };
  })();
  requests.set(request, entry);
  return entry.promise;
}

// Only for synchronous policy callbacks that run after an awaited guard.
// Missing initialization is a refusal, never a fallback to token claims.
function currentAccessCapabilities(request, { db, HttpsError }) {
  const entry = requestCache().get(request);
  if (!entry || entry.db !== db || entry.uid !== request.auth?.uid || !entry.data) {
    throw new HttpsError("permission-denied", "Verification des droits requise.");
  }
  return entry.data.capabilities;
}

module.exports = { readCurrentAccessProfile, currentAccessCapabilities };
