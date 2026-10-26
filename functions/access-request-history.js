"use strict";

// Read-only projection of existing requests. No collection scan or per-row lookup.
async function listHistory({ db, FieldPath, context, input = {}, item, HttpsError }) {
  if (!context.national && !context.region) {
    throw new HttpsError("permission-denied", "Lecture réservée aux responsables régionaux ou nationaux.");
  }
  if (!context.national && !context.regionId) {
    throw new HttpsError("failed-precondition", "Périmètre régional requis.");
  }
  const limit = 25;
  const cursor = input.cursor;
  if (cursor && (typeof cursor !== "object" || typeof cursor.resolvedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cursor.resolvedAt) ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(cursor.id || ""))) {
    throw new HttpsError("invalid-argument", "Page d’historique invalide.");
  }
  let query = db.collection("engagementAccessRequests").where("status", "in", ["approved", "rejected"]);
  if (!context.national) query = query.where("regionId", "==", context.regionId);
  query = query.orderBy("resolvedAt", "desc").orderBy(FieldPath.documentId(), "desc");
  if (cursor) query = query.startAfter(cursor.resolvedAt, cursor.id);
  const snapshot = await query.limit(limit + 1).get();
  const requests = snapshot.docs.slice(0, limit).map(item);
  const actorIds = [...new Set(requests.map(row => row.resolvedBy).filter(uid => /^[^/]{1,128}$/.test(uid)))];
  const actors = actorIds.length ? await db.getAll(...actorIds.map(uid => db.collection("users").doc(uid))) : [];
  const names = new Map(actors.filter(doc => doc.exists).map(doc => {
    const profile = doc.data() || {};
    return [doc.id, [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim().slice(0, 180)];
  }));
  requests.forEach(row => { row.resolvedByName = names.get(row.resolvedBy) || ""; });
  const last = requests[requests.length - 1];
  return { ok: true, requests, nextCursor: snapshot.docs.length > limit && last
    ? { resolvedAt: last.resolvedAt, id: last.id } : null };
}

module.exports = { listHistory };
