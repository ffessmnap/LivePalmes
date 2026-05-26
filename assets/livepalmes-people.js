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

  function categoryClass(category) {
    if (sameCategory(category, "Cadet")) return "cat-cadet";
    if (sameCategory(category, "Junior")) return "cat-junior";
    if (sameCategory(category, "Senior")) return "cat-senior";
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
