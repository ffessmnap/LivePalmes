(function attachLivePalmesPublicSwimmers(global) {
  function cleanText(value) {
    return String(value ?? "")
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
      .replaceAll("ÃƒÂ©", "\u00e9")
      .replaceAll("ÃƒÂ¨", "\u00e8")
      .replaceAll("ÃƒÂª", "\u00ea")
      .replaceAll("ÃƒÂ«", "\u00eb")
      .replaceAll("Ãƒ ", "\u00e0")
      .replaceAll("ÃƒÂ¢", "\u00e2")
      .replaceAll("ÃƒÂ¹", "\u00f9")
      .replaceAll("ÃƒÂ»", "\u00fb")
      .replaceAll("ÃƒÂ®", "\u00ee")
      .replaceAll("ÃƒÂ¯", "\u00ef")
      .replaceAll("ÃƒÂ´", "\u00f4")
      .replaceAll("ÃƒÂ§", "\u00e7")
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

  function categoryClass(category) {
    if (sameCategory(category, "Cadet")) return "cat-cadet";
    if (sameCategory(category, "Junior")) return "cat-junior";
    if (sameCategory(category, "Senior")) return "cat-senior";
    return "cat-other";
  }

  function isFinalStage(stage) {
    const value = String(stage || "");
    return value === "finalA" || value === "finalB" || value.startsWith("finale");
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

  function performanceNameKey(row) {
    const parts = [row?.lastName, row?.firstName].filter(Boolean);
    return normalizeText(parts.length ? parts.join(" ") : (row?.displayName || row?.name || ""));
  }

  function performanceClubKey(row) {
    return normalizeText(row?.clubCode || row?.club || "");
  }

  function performanceDuplicateKey(performance) {
    return [
      performance?.eventId || "",
      performance?.sex || "",
      performance?.stage || "",
      performance?.phaseLabel || "",
      performanceNameKey(performance),
      birthYearLabel(performance),
      performanceClubKey(performance),
      cleanText(performance?.time || ""),
      cleanText(performance?.status || ""),
      cleanText(performance?.statusLabel || "")
    ].join("|");
  }

  function uniquePerformances(rows) {
    const seen = new Set();
    return rows.filter((performance) => {
      const key = performanceDuplicateKey(performance);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function performanceStatusLabel(performance) {
    const status = cleanText(performance?.status || performance?.resultStatus || "").toLowerCase();
    const label = cleanText(performance?.statusLabel || "").trim();
    const normalizedLabel = normalizeText(label);
    if (status === "dsq" || /\b(dsq|dq|disqual)/.test(normalizedLabel)) return "DSQ";
    if (status === "ab" || /\b(ab|abd|dnf|abandon)\b/.test(normalizedLabel)) return "ABD";
    if (status === "dns" || /\b(dns|ns|abs|absent|forfait)\b/.test(normalizedLabel)) return "Forfait";
    return label;
  }

  function performanceValueLabel(performance) {
    return cleanText(performanceStatusLabel(performance) || performance?.time || "-");
  }

  function timeToMs(value) {
    const text = String(value || "").trim();
    const parts = text.split(":");
    if (!text) return Number.POSITIVE_INFINITY;
    if (parts.length === 2) {
      const ms = (Number(parts[0]) * 60 + Number(parts[1].replace(",", "."))) * 1000;
      return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
    }
    const ms = Number(text.replace(",", ".")) * 1000;
    return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
  }

  function performanceDeltaLabel(performance, referenceTime, referenceLabel = "") {
    if (performance?.status || !performance?.time || !referenceTime) return "";
    const performanceMs = timeToMs(performance.time);
    const referenceMs = timeToMs(referenceTime);
    if (!Number.isFinite(performanceMs) || !Number.isFinite(referenceMs)) return "";
    const delta = (performanceMs - referenceMs) / 1000;
    if (!Number.isFinite(delta)) return "";
    const sign = delta >= 0 ? "+" : "-";
    return `${sign}${Math.abs(delta).toFixed(2).replace(".", ",")}s${referenceLabel ? ` / ${referenceLabel}` : ""}`;
  }

  global.LivePalmesPublicSwimmers = {
    birthYearLabel,
    categoryClass,
    categoryLabel,
    cleanText,
    comparableEventId,
    eventSignature,
    finalStageLabel,
    formatPersonNameParts,
    isFinalStage,
    isRelayRow,
    normalizeText,
    performanceClubKey,
    performanceDeltaLabel,
    performanceDuplicateKey,
    performanceNameKey,
    performanceStatusLabel,
    performanceValueLabel,
    recordEventMatches,
    sameCategory,
    timeToMs,
    uniquePerformances
  };
})(window);
