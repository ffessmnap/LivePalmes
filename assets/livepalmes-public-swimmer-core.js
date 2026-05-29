(function attachLivePalmesPublicSwimmerCore(global) {
  function cleanText(value) {
    return String(value ?? "")
      .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©", "\u00e9")
      .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¨", "\u00e8")
      .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âª", "\u00ea")
      .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â«", "\u00eb")
      .replaceAll("ÃƒÆ’Ã†â€™ ", "\u00e0")
      .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢", "\u00e2")
      .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¹", "\u00f9")
      .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â»", "\u00fb")
      .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â®", "\u00ee")
      .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¯", "\u00ef")
      .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â´", "\u00f4")
      .replaceAll("ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§", "\u00e7")
      .replaceAll("ÃƒÆ’Ã‚Â©", "\u00e9")
      .replaceAll("ÃƒÆ’Ã‚Â¨", "\u00e8")
      .replaceAll("ÃƒÆ’Ã‚Âª", "\u00ea")
      .replaceAll("ÃƒÆ’Ã‚Â«", "\u00eb")
      .replaceAll("ÃƒÆ’ ", "\u00e0")
      .replaceAll("ÃƒÆ’Ã‚Â¢", "\u00e2")
      .replaceAll("ÃƒÆ’Ã‚Â¹", "\u00f9")
      .replaceAll("ÃƒÆ’Ã‚Â»", "\u00fb")
      .replaceAll("ÃƒÆ’Ã‚Â®", "\u00ee")
      .replaceAll("ÃƒÆ’Ã‚Â¯", "\u00ef")
      .replaceAll("ÃƒÆ’Ã‚Â´", "\u00f4")
      .replaceAll("ÃƒÆ’Ã‚Â§", "\u00e7")
      .replace(/\bapn\s+e\b/gi, "apn\u00e9e")
      .replace(/\br\s+sultats\b/gi, "r\u00e9sultats")
      .replace(/\bcomp\s+tition\b/gi, "comp\u00e9tition");
  }

  function normalizeText(value) {
    return cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function formatPersonNameParts(firstName, lastName, fallback = "") {
    const last = cleanText(lastName).trim().toLocaleUpperCase("fr-FR");
    const first = cleanText(firstName).trim();
    return [last, first].filter(Boolean).join(" ").trim() || cleanText(fallback);
  }

  function sameCategory(a, b) {
    return normalizeText(a) === normalizeText(b);
  }

  function categoryLabel(category, sex) {
    if (sameCategory(category, "Cadet")) return sex === "F" ? "Cadette" : "Cadet";
    if (sameCategory(category, "Junior")) return "Junior";
    if (sameCategory(category, "Senior")) return "Senior";
    return cleanText(category || "");
  }

  function sexLabel(sex) {
    if (sex === "F") return "Femmes";
    if (sex === "M") return "Hommes";
    return "Mixte";
  }

  function eventLabel(events = [], eventId, fallback = "") {
    return cleanText((Array.isArray(events) ? events : []).find((event) => event.id === eventId)?.label || fallback || eventId || "Course");
  }

  function programKey(row) {
    return [row?.order, row?.session || "", row?.eventId, row?.sex, row?.stage || "series"].join("|");
  }

  function isFinalStage(stage) {
    const value = String(stage || "");
    return value === "finalA" || value === "finalB" || value.startsWith("finale");
  }

  function publicSessions(program = [], series = [], options = {}) {
    const values = new Set([
      ...(Array.isArray(program) ? program : []).map((row) => row.session),
      ...(options.includeSeries ? (Array.isArray(series) ? series : []).map((row) => row.session) : [])
    ].filter(Boolean));
    return [...values].sort((a, b) => Number(a) - Number(b));
  }

  function rowStartTime(row, program = []) {
    if (row?.startTime) return row.startTime;
    const match = (Array.isArray(program) ? program : []).find((item) =>
      item.eventId === row?.eventId &&
      item.sex === row?.sex &&
      (!row?.session || !item.session || item.session === row.session) &&
      (!isFinalStage(item.stage) || item.stage === row?.stage)
    );
    return match?.startTime || "";
  }

  function categoryClass(category) {
    if (sameCategory(category, "Cadet")) return "cat-cadet";
    if (sameCategory(category, "Junior")) return "cat-junior";
    if (sameCategory(category, "Senior")) return "cat-senior";
    return "cat-other";
  }

  function finalStageLabel(stage) {
    const value = String(stage || "").toLowerCase();
    if (value.includes("b")) return "Finale B";
    if (value.includes("a")) return "Finale A";
    return "Finale";
  }

  function isRelayRow(row) {
    return /^4x/i.test(String(row?.eventId || row?.label || ""));
  }

  function comparableEventId(value) {
    return normalizeText(value).replace(/\s+/g, "");
  }

  function eventSignature(value) {
    const text = comparableEventId(value);
    const distance = (text.match(/\d+x?\d*/i) || [""])[0];
    const discipline = text
      .replace(distance, "")
      .replace(/metres?|m$/g, "")
      .replace(/surface/g, "sf")
      .replace(/apnee/g, "ap")
      .replace(/immersion/g, "is")
      .replace(/bipalmes?/g, "bi")
      .replace(/[^a-z0-9]/g, "");
    return `${distance}${discipline}`;
  }

  function recordEventMatches(recordEventId, eventId) {
    const recordId = comparableEventId(recordEventId);
    const raceId = comparableEventId(eventId);
    if (recordId && raceId && recordId === raceId) return true;
    const recordSig = eventSignature(recordEventId);
    const raceSig = eventSignature(eventId);
    return Boolean(recordSig && raceSig && recordSig === raceSig);
  }

  function birthYearLabel(row) {
    const value = cleanText(row?.birthDate || row?.birthYear || "");
    const match = value.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : value;
  }

  function swimmerKey(row) {
    if (row?.swimmerId) return `id:${row.swimmerId}`;
    return normalizeText([row?.lastName, row?.firstName, row?.name, row?.displayName, row?.club].filter(Boolean).join("|"));
  }

  global.LivePalmesPublicSwimmerCore = {
    birthYearLabel,
    categoryClass,
    categoryLabel,
    cleanText,
    comparableEventId,
    eventLabel,
    eventSignature,
    finalStageLabel,
    formatPersonNameParts,
    isFinalStage,
    isRelayRow,
    normalizeText,
    programKey,
    publicSessions,
    recordEventMatches,
    rowStartTime,
    sameCategory,
    sexLabel,
    swimmerKey
  };
})(window);
