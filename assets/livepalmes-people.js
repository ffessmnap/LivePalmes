(function attachLivePalmesPeople(global) {
  function formatPersonNameParts(firstName, lastName, fallback = "") {
    const last = String(lastName || "").trim().toLocaleUpperCase("fr-FR");
    const first = String(firstName || "").trim();
    return [last, first].filter(Boolean).join(" ").trim() || fallback;
  }

  function getBirthYear(birthDate) {
    const match = String(birthDate || "").match(/(\d{4})$/);
    return match ? Number(match[1]) : Number.NaN;
  }

  function getBirthYearLabel(birthDate) {
    const year = getBirthYear(birthDate);
    return Number.isFinite(year) ? String(year) : "----";
  }

  function normalizePersonName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z ]/g, " ")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(" ");
  }

  function formatRank(rank) {
    const value = Number(rank);
    if (!Number.isFinite(value)) return "-";
    return value === 1 ? "1er" : `${value}e`;
  }

  function entrantKey(entrant) {
    return [entrant.lastName, entrant.firstName, entrant.birthDate, entrant.sex].join("|").toLowerCase();
  }

  function sameCategory(a, b) {
    return String(a || "").toLowerCase() === String(b || "").toLowerCase();
  }

  function normalizedCategory(category) {
    return String(category || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function masterCategoryClass(normalized) {
    const direct = normalized.match(/^m(\d+)\+?$/);
    const sexAge = normalized.match(/^[fhm](\d+)\+?$/);
    const ageOnly = normalized.match(/^(\d+)\+?$/);
    const rawNumber = Number(direct?.[1] || sexAge?.[1] || ageOnly?.[1] || 0);
    if (!Number.isFinite(rawNumber) || rawNumber <= 0) return "cat-master";
    const age = rawNumber < 30 ? rawNumber * 10 + 20 : rawNumber;
    if (age >= 80) return "cat-master-80";
    if (age >= 70) return "cat-master-70";
    if (age >= 60) return "cat-master-60";
    if (age >= 50) return "cat-master-50";
    if (age >= 40) return "cat-master-40";
    return "cat-master-30";
  }

  function categoryClass(category) {
    const normalized = normalizedCategory(category);
    if (normalized === "minime" || normalized === "minimes") return "cat-minime";
    if (sameCategory(category, "Cadet")) return "cat-cadet";
    if (sameCategory(category, "Junior")) return "cat-junior";
    if (sameCategory(category, "Senior")) return "cat-senior";
    if (/^[fhm]?\d+\+?$/.test(normalized)) return masterCategoryClass(normalized);
    if (normalized === "master" || normalized === "masters") return "cat-master";
    return "cat-other";
  }

  global.LivePalmesPeople = {
    categoryClass,
    entrantKey,
    formatPersonNameParts,
    formatRank,
    getBirthYear,
    getBirthYearLabel,
    normalizePersonName,
    sameCategory
  };
})(window);
