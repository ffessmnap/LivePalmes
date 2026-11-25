(function (global) {
  const canonicalRegionLabels = {
    AURA: "Auvergne-Rhône-Alpes",
    17: "Auvergne-Rhône-Alpes",
    BFC: "Bourgogne-Franche-Comté",
    22: "Bourgogne-Franche-Comté",
    BPL: "Bretagne - Pays de la Loire",
    6: "Bretagne - Pays de la Loire",
    CENT: "Centre-Val de Loire",
    8: "Centre-Val de Loire",
    CSNA: "Nouvelle-Aquitaine",
    2: "Nouvelle-Aquitaine",
    EST: "Est",
    1: "Est",
    FRA: "National / fédéral",
    4: "National / fédéral",
    GUAD: "Guadeloupe",
    9: "Guadeloupe",
    HDF: "Hauts-de-France",
    13: "Hauts-de-France",
    21: "Hauts-de-France",
    IDFP: "Île-de-France",
    3: "Île-de-France",
    NORM: "Normandie",
    15: "Normandie",
    OPM: "Open / fédéral",
    19: "Open / fédéral",
    PACA: "Provence-Alpes-Côte d’Azur",
    16: "Provence-Alpes-Côte d’Azur"
  };

  function regionOptions(regions, additionalRows = []) {
    const groups = new Map();
    const addRegion = (id, label) => {
      const regionId = String(id || "").trim();
      if (!regionId) return;
      const canonicalLabel = canonicalRegionLabels[regionId] || String(label || regionId).trim();
      if (!groups.has(canonicalLabel)) groups.set(canonicalLabel, new Set());
      groups.get(canonicalLabel).add(regionId);
    };
    regions.forEach((region) => addRegion(region.id, region.label));
    additionalRows.forEach((row) => addRegion(row.regionId, row.regionLabel));
    return Array.from(groups, ([label, ids]) => ({
      label,
      ids: Array.from(ids),
      value: Array.from(ids).sort((a, b) => a.localeCompare(b, "fr-FR", { numeric: true })).join(",")
    })).sort((a, b) => a.label.localeCompare(b.label, "fr-FR"));
  }

  global.LivePalmesTopRegions = regionOptions;
})(window);
