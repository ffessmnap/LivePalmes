// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_nationalSwimmerSearchMatches(backendContext) {
  function nationalSwimmerSearchMatches(swimmer = {}, terms = []) {
    if (!terms.length) return true;
    const haystack = backendContext.normalizePerformanceSearchText([
      swimmer.firstName,
      swimmer.lastName,
      swimmer.name,
      swimmer.licenseNumber,
      swimmer.birthDate,
      swimmer.sex,
      swimmer.clubId,
      swimmer.club,
      swimmer.clubName,
      swimmer.identityKey,
      swimmer.id,
      swimmer.swimmerId,
      ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : [])
    ].filter(Boolean).join(" "));
    return terms.every((term) => haystack.includes(term));
  }

  function nationalSwimmerSort(left = {}, right = {}) {
    return backendContext.cleanText(right.latestDate).localeCompare(backendContext.cleanText(left.latestDate)) ||
      backendContext.cleanText(left.lastName).localeCompare(backendContext.cleanText(right.lastName), "fr") ||
      backendContext.cleanText(left.firstName).localeCompare(backendContext.cleanText(right.firstName), "fr") ||
      backendContext.cleanText(left.source).localeCompare(backendContext.cleanText(right.source), "fr");
  }

  async function searchEngagementNationalSwimmerDocs(db, query = "", limit = 40) {
    const cleanQuery = backendContext.cleanText(query).slice(0, 120);
    const normalized = backendContext.normalizePerformanceSearchText(cleanQuery);
    const terms = normalized.split(/\s+/).filter((term) => term.length >= 2).slice(0, 5);
    const licenseKey = backendContext.engagementSwimmerLicenseNumberKey(cleanQuery);
    if (!terms.length && licenseKey.length < 3) return [];
    const docs = new Map();
    const addDoc = (doc, source) => {
      if (!doc.exists) return;
      const key = `${source}:${doc.id}`;
      if (!docs.has(key)) docs.set(key, { doc, source });
    };
    const reads = [];
    if (terms.length) {
      reads.push(db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("searchPrefixes", "array-contains", terms[0].slice(0, 18))
        .limit(Math.min(80, Math.max(limit * 2, 30)))
        .get()
        .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "performances"))));
    }
    if (cleanQuery) {
      reads.push(db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("licenseNumber", "==", cleanQuery)
        .limit(limit)
        .get()
        .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "performances"))));
      reads.push(db.collection("engagementClubSwimmers")
        .where("licenseNumber", "==", cleanQuery)
        .limit(limit)
        .get()
        .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "engagement"))));
    }
    if (terms.length) {
      const nameSeed = cleanQuery.split(/\s+/).filter(Boolean).at(-1) || cleanQuery;
      const titleCase = nameSeed.toLocaleLowerCase("fr").replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
      const variants = Array.from(new Set([nameSeed, nameSeed.toLocaleUpperCase("fr"), titleCase].filter(Boolean)));
      const querySpecs = ["lastName", "firstName"]
        .flatMap((field) => variants.map((variant) => ({ field, variant })))
        .slice(0, 6);
      const perQueryLimit = Math.max(8, Math.ceil((limit * 2) / Math.max(1, querySpecs.length)));
      reads.push(...querySpecs.map(({ field, variant }) => db.collection("engagementClubSwimmers")
        .orderBy(field)
        .startAt(variant)
        .endAt(`${variant}\uf8ff`)
        .limit(perQueryLimit)
        .get()
        .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "engagement")))));
    }
    await Promise.all(reads);
    return Array.from(docs.values())
      .map((item) => (0, backendContext.local$engagementNationalSwimmerItemFromDoc)(item.doc, item.source))
      .filter((swimmer) => nationalSwimmerSearchMatches(swimmer, terms))
      .sort(nationalSwimmerSort)
      .slice(0, limit);
  }

  return { nationalSwimmerSearchMatches, nationalSwimmerSort, searchEngagementNationalSwimmerDocs };
}

module.exports = { createNationalService_nationalSwimmerSearchMatches };
