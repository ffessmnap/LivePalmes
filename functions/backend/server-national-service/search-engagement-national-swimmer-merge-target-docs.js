// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_searchEngagementNationalSwimmerMergeTargetDocs(backendContext) {
  async function searchEngagementNationalSwimmerMergeTargetDocs(db, sourceSwimmer = {}, query = "", limit = 25) {
    const docs = new Map();
    const addDocs = (snapshot, source) => {
      snapshot.docs.forEach((doc) => {
        const key = `${source}:${doc.id}`;
        if (!docs.has(key)) docs.set(key, { doc, source });
      });
    };
    const cleanQuery = backendContext.cleanText(query).slice(0, 100);
    const sourceIdentityKey = backendContext.cleanText(sourceSwimmer.identityKey).slice(0, 180);
    const sourceLicense = backendContext.cleanText(sourceSwimmer.licenseNumber).slice(0, 60);
    const searchToken = backendContext.normalizePerformanceSearchText(cleanQuery || (0, backendContext.local$engagementNationalSwimmerFullName)(sourceSwimmer)).split(/\s+/)[0] || "";
    const reads = [];
    if (sourceIdentityKey) {
      reads.push(db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).where("identityKey", "==", sourceIdentityKey).limit(limit).get().then((snapshot) => addDocs(snapshot, "performances")));
      reads.push(db.collection("engagementClubSwimmers").where("identityKey", "==", sourceIdentityKey).limit(limit).get().then((snapshot) => addDocs(snapshot, "engagement")));
    }
    const license = cleanQuery || sourceLicense;
    if (license) {
      reads.push(db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).where("licenseNumber", "==", license).limit(limit).get().then((snapshot) => addDocs(snapshot, "performances")));
      reads.push(db.collection("engagementClubSwimmers").where("licenseNumber", "==", license).limit(limit).get().then((snapshot) => addDocs(snapshot, "engagement")));
    }
    if (searchToken.length >= 2) {
      reads.push(db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).where("searchPrefixes", "array-contains", searchToken.slice(0, 18)).limit(limit).get().then((snapshot) => addDocs(snapshot, "performances")));
    }
    await Promise.all(reads);
    return Array.from(docs.values()).slice(0, limit);
  }

  return { searchEngagementNationalSwimmerMergeTargetDocs };
}

module.exports = { createNationalService_searchEngagementNationalSwimmerMergeTargetDocs };
