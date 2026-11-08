"use strict";
async function list(db, collection, input, item) {
  if (input.cursor && !/^[a-zA-Z0-9_-]{1,128}$/.test(input.cursor)) throw new TypeError("Page d’historique invalide.");
  let query = db.collection(collection).where("status", "in", ["approved", "rejected"]).orderBy("__name__");
  if (input.cursor) query = query.startAfter(input.cursor);
  const snapshot = await query.limit(26).get(), docs = snapshot.docs.slice(0, 25);
  return { ok: true, requests: docs.map(item), nextCursor: snapshot.docs.length > 25 ? docs.at(-1).id : null };
}
module.exports = { list };
