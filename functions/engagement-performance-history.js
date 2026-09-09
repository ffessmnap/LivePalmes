"use strict";

// One index and at most twenty existing pages (500 rows/page). Never query the
// performance base when a public file is missing. Unknown is not an empty history.
async function readIndexedHistory({ db, indexId, HttpsError }) {
  if (!indexId || indexId.includes("/")) return null;
  return db.runTransaction(async (tx) => {
    const index = await tx.get(db.collection("performanceSwimmerIndex").doc(indexId));
    if (!index.exists) return null;
    const value = index.data();
    const count = value.pageCount;
    if (!Number.isInteger(count) || count < 0 || count > 20 || !Number.isInteger(value.rowCount) || value.rowCount < 0 || !value.updatedAt) return null;
    const rows = [];
    for (let page = 0; page < count; page++) {
      const snapshot = await tx.get(db.collection("performanceSwimmerPages").doc(`${indexId}_${String(page).padStart(4, "0")}`));
      const data = snapshot.data();
      if (!snapshot.exists || data.swimmerIndexId !== indexId || data.pageIndex !== page || data.updatedAt !== value.updatedAt || !Array.isArray(data.rows) || data.rows.length > 500 || data.rowCount !== data.rows.length) {
        throw new HttpsError("unavailable", "Index des performances incomplet. Aucun engagement n'a été supprimé. Réessayez après son actualisation.");
      }
      rows.push(...data.rows);
    }
    if (rows.length !== value.rowCount) throw new HttpsError("unavailable", "Index des performances incomplet. Aucun engagement n'a été supprimé. Réessayez après son actualisation.");
    return { sourceKey: indexId, sourceDataset: "performance-swimmer-pages", rows };
  });
}

module.exports = { readIndexedHistory };
