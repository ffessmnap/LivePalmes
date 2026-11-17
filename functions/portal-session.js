"use strict";
const { createHash } = require("node:crypto");
const DAY = 24 * 60 * 60 * 1000;
const INTERVAL = 5 * 60 * 1000;

// Browser activity is batched at five minutes. The server grants only this
// bounded tolerance; it never accepts a client timestamp or extends on reads.
function createPortalSessions({ getDb, HttpsError, now = Date.now, enabled = true, readProfile }) {
  function fail() { throw new HttpsError("unauthenticated", "Votre session a expiré. Reconnectez-vous.", { portalSessionExpired: true }); }
  function identity(request) {
    const uid = request.auth?.uid;
    const authTime = Number(request.auth?.token?.auth_time) * 1000;
    const id = request.data?._portalSession;
    if (!uid || !Number.isSafeInteger(authTime) || authTime <= 0 || typeof id !== "string" || !/^[a-f0-9]{32}$/.test(id)) fail();
    const key = createHash("sha256").update(uid + ":" + id).digest("hex");
    return { uid, authTime, ref: getDb().collection("portalSessions").doc(key) };
  }
  function live(data, actor, time) {
    return data?.uid === actor.uid && data.authTime === actor.authTime && data.closed !== true &&
      Number.isSafeInteger(data.lastActivityAt) && data.lastActivityAt <= time + INTERVAL && time < data.lastActivityAt + DAY + INTERVAL;
  }
  async function open(request) {
    if (!enabled) throw new HttpsError("failed-precondition", "La session du portail n’est pas activée dans cet environnement.");
    const actor = identity(request);
    const profileRequest = readProfile(request);
    void profileRequest.catch(() => {});
    return getDb().runTransaction(async transaction => {
      const [snapshot,profile] = await Promise.all([transaction.get(actor.ref),profileRequest]);
      if (profile?.status !== "active" || !profile.capabilities?.length) fail();
      const time = now(), data = snapshot.exists ? snapshot.data() : null;
      const recent = actor.authTime <= time + 60000 && time - actor.authTime < INTERVAL;
      if (!live(data, actor, time) && (!recent || data && actor.authTime <= data.authTime)) fail();
      // A startup is not activity: restoring a live session never slides expiry.
      if (!live(data, actor, time)) transaction.set(actor.ref, { uid: actor.uid, authTime: actor.authTime, lastActivityAt: time, updatedAt:time, closed: false });
      return { ok:true, profile, serverTime:time, expiresAt:(live(data, actor, time) ? data.lastActivityAt : time) + DAY + INTERVAL };
    }, {maxAttempts:5});
  }
  async function assertSession(request) {
    if (!enabled) return;
    const actor = identity(request), snapshot = await actor.ref.get();
    if (!snapshot.exists || !live(snapshot.data(), actor, now())) fail();
  }
  async function touch(request) {
    if (!enabled) fail();
    const actor = identity(request);
    return getDb().runTransaction(async transaction => {
      const snapshot = await transaction.get(actor.ref), time = now(), data = snapshot.exists ? snapshot.data() : null;
      if (!live(data, actor, time)) fail();
      const age = Number(request.data?._portalActivityAge || 0);
      if (!Number.isFinite(age) || age < 0 || age > INTERVAL) throw new HttpsError("invalid-argument", "Activité de session invalide.");
      const update = time - (data.updatedAt || data.lastActivityAt) >= INTERVAL;
      const lastActivityAt = update ? Math.max(data.lastActivityAt,time-age) : data.lastActivityAt;
      if (update) transaction.update(actor.ref, { lastActivityAt, updatedAt:time });
      return { ok:true, serverTime:time, expiresAt:lastActivityAt + DAY + INTERVAL };
    }, {maxAttempts:5});
  }
  async function close(request) {
    if (!enabled) fail();
    const actor = identity(request);
    await getDb().runTransaction(async transaction => {
      const snapshot = await transaction.get(actor.ref);
      if (snapshot.exists && snapshot.data().authTime === actor.authTime) transaction.update(actor.ref, {closed:true});
    }, {maxAttempts:5});
    return { ok:true };
  }
  return { open, touch, close, assertSession };
}
module.exports = { createPortalSessions, DAY, INTERVAL };
