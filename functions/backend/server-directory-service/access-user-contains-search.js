// Existing operation bodies; live services arrive through explicit accessors.
function createDirectoryService_accessUserContainsSearch(backendContext) {
  function accessUserListItem(doc) {
    return (0, backendContext.local$accessUserListItemFromData)(doc.id, doc.data() || {});
  }

  function accessUserMatchesFilters(doc, status, capability) {
    const data = doc.data() || {};
    if (status && (data.status || "active") !== status) return false;
    if (capability && data.capabilities?.[capability] !== true) return false;
    return true;
  }

  function normalizedDirectoryText(value) {
    return backendContext.cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr");
  }

  function accessUserContainsSearch(doc, search) {
    const data = doc.data() || {};
    const haystack = [data.firstName, data.lastName, data.email, data.clubId, data.clubName, data.regionId, data.licenseNumber]
      .map(normalizedDirectoryText)
      .join(" ");
    return normalizedDirectoryText(search).split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
  }

  async function searchAccessUserDocuments(search, context, maxScanned = 90) {
    const usersRef = backendContext.db.collection("users");
    const raw = backendContext.cleanText(search).slice(0, 80);
    const variantsFor = (value) => {
      const titleCase = value.toLocaleLowerCase("fr").replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
      return [...new Set([value, titleCase].filter(Boolean))];
    };
    let querySpecs = [];
    if (raw.includes("@")) {
      querySpecs = [{ field: "email", variants: [raw.toLocaleLowerCase("fr")] }];
    } else if (/^[a-z\d-]+$/i.test(raw) && /\d/.test(raw)) {
      const variants = [...new Set([raw, raw.toLocaleUpperCase("fr")])];
      querySpecs = [
        { field: "licenseNumber", variants },
        { field: "clubId", variants }
      ];
    } else {
      const nameSeed = raw.split(/\s+/).filter(Boolean).at(-1) || raw;
      querySpecs = [
        { field: "lastName", variants: variantsFor(nameSeed) },
        { field: "firstName", variants: variantsFor(nameSeed) },
        { field: "clubName", variants: variantsFor(raw) }
      ];
    }
    const flatSpecs = querySpecs.flatMap(({ field, variants }) => variants.map((variant) => ({ field, variant }))).slice(0, 6);
    const perQueryLimit = Math.max(10, Math.floor(maxScanned / Math.max(1, flatSpecs.length)));
    const snapshots = await Promise.all(flatSpecs.map(({ field, variant }) => {
      let query = usersRef;
      if (!context.national && context.regionId) query = query.where("regionId", "==", context.regionId);
      return query
        .orderBy(field)
        .startAt(variant)
        .endAt(`${variant}\uf8ff`)
        .limit(perQueryLimit)
        .get();
    }));
    const documents = new Map();
    snapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => documents.set(doc.id, doc)));
    const matches = [...documents.values()]
      .filter((doc) => accessUserContainsSearch(doc, raw))
      .sort((left, right) => {
        const leftData = left.data() || {};
        const rightData = right.data() || {};
        return `${leftData.lastName || ""}\u0000${leftData.firstName || ""}\u0000${left.id}`
          .localeCompare(`${rightData.lastName || ""}\u0000${rightData.firstName || ""}\u0000${right.id}`, "fr", { sensitivity: "base" });
      });
    return {
      documents: matches,
      scannedCount: snapshots.reduce((total, snapshot) => total + snapshot.size, 0),
      truncated: snapshots.some((snapshot) => snapshot.size >= perQueryLimit)
    };
  }

  return { accessUserListItem, accessUserMatchesFilters, normalizedDirectoryText, accessUserContainsSearch, searchAccessUserDocuments };
}

module.exports = { createDirectoryService_accessUserContainsSearch };
