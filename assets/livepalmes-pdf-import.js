(function attachLivePalmesPdfImport(global) {
  const EVENT_ALIASES = {
    "50mapnee": "50ap",
    "50mapnée": "50ap",
    "50msurface": "50sf",
    "100msurface": "100sf",
    "200msurface": "200sf",
    "400msurface": "400sf",
    "800msurface": "800sf",
    "1500msurface": "1500sf",
    "100mimmersion": "100is",
    "200mimmersion": "200is",
    "400mimmersion": "400is",
    "50mbipalmes": "50bi",
    "100mbipalmes": "100bi",
    "200mbipalmes": "200bi",
    "400mbipalmes": "400bi",
    "4x50msurface": "4x50sf",
    "4x100msurface": "4x100sf",
    "4x200msurface": "4x200sf",
    "4x100mbipalmes": "4x100bix",
    "4x100msb": "4x100sb"
  };

  function fixPdfEncoding(value) {
    let text = String(value || "");
    const replacements = {
      "Ã©": "é",
      "Ã¨": "è",
      "Ãª": "ê",
      "Ã«": "ë",
      "Ã ": "à",
      "Ã¢": "â",
      "Ã¤": "ä",
      "Ã®": "î",
      "Ã¯": "ï",
      "Ã´": "ô",
      "Ã¶": "ö",
      "Ã¹": "ù",
      "Ã»": "û",
      "Ã¼": "ü",
      "Ã§": "ç",
      "Ã‰": "É",
      "Ãˆ": "È",
      "ÃŠ": "Ê",
      "Ã‹": "Ë",
      "Ã€": "À",
      "Ã‚": "Â",
      "ÃŽ": "Î",
      "Ã”": "Ô",
      "Ã™": "Ù",
      "Ã‡": "Ç",
      "È": "é",
      "Ë": "é",
      "Í": "ê",
      "Ô": "ï",
      "Å“": "œ",
      "Å’": "Œ",
      "â€™": "’",
      "â€˜": "‘",
      "â€“": "-",
      "â€”": "-"
    };
    Object.entries(replacements).forEach(([bad, good]) => {
      text = text.replaceAll(bad, good);
    });
    text = text.normalize("NFC")
      .replace(/C[¸̧]/g, "C")
      .replace(/c[¸̧]/g, "c")
      .replace(/[ÇĆČĈĊ]/g, "C")
      .replace(/[çćčĉċ]/g, "c")
      .replace(/\bFRAN[«‹]OIS\b/gi, "FRANCOIS")
      .replace(/\bDOUY(?:…|\.{3}|�|□)RE\b/gi, "DOUYERE")
      .replace(/\bFRAN(?:C|…|\.{3}|�|□)OIS\b/gi, "FRANCOIS")
      .replace(/\bRAPHAÎL\b/g, "RAPHAEL")
      .replace(/\bRaphaÎl\b/g, "Raphaël")
      .replace(/\bMAÎLLE\b/g, "MAELLE")
      .replace(/\bMaÎlle\b/g, "Maëlle")
      .replace(/\bMaïlle\b/g, "Maëlle");
    text = text.replace(/([A-Za-zÀ-ÖØ-öø-ÿ])Î([A-Za-zÀ-ÖØ-öø-ÿ])/g, "$1ï$2");
    return text.normalize("NFC");
  }

  function normalizePdfLabel(value) {
    return fixPdfEncoding(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function importedEventId(label, options = {}) {
    const normalized = normalizePdfLabel(label);
    const known = EVENT_ALIASES[normalized];
    if (known) return known;
    const event = (options.events || []).find((item) => normalizePdfLabel(item.label) === normalized);
    return event?.id || "";
  }

  function importedEventInfo(eventId, fallbackLabel = "", options = {}) {
    const existing = (options.events || []).find((event) => event.id === eventId);
    if (existing) return existing;
    const label = fallbackLabel || eventId;
    const distance = label.match(/^\d+x?\d*\s*m/i)?.[0] || "";
    return {
      id: eventId,
      label,
      distance,
      discipline: label.replace(distance, "").trim() || label
    };
  }

  function importedCategoryLabel(code) {
    const clean = String(code || "").toUpperCase();
    if (clean.includes("MI")) return "Minime";
    if (clean.includes("CA")) return "Cadet";
    if (clean.includes("JU")) return "Junior";
    if (clean.includes("SE")) return "Senior";
    if (/^[FHM]\d+\+?$/.test(clean)) return clean.replace(/(\d)$/, "$1+");
    if (/^\d+\+?$/.test(clean)) return clean.endsWith("+") ? clean : `${clean}+`;
    if (clean.includes("MA")) return "Masters";
    return clean || "";
  }

  function importedBirthYear(twoDigits) {
    const value = Number.parseInt(twoDigits, 10);
    if (!Number.isFinite(value)) return "";
    return String(value <= 35 ? 2000 + value : 1900 + value);
  }

  function normalizePdfUppercaseEToken(token) {
    const text = String(token || "");
    const withPlainE = text.replace(/[ÉÈÊËéèêë]/g, "E").replace(/[Çç]/g, "C");
    const letters = withPlainE.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ-]/g, "");
    return letters && letters === letters.toUpperCase() ? withPlainE : text.replace(/[ÉÈÊË]/g, "E").replace(/Ç/g, "C");
  }

  function splitImportedPersonName(value) {
    const tokens = fixPdfEncoding(value)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(normalizePdfUppercaseEToken);
    let firstIndex = Math.max(0, tokens.length - 1);
    for (let index = 0; index < tokens.length; index += 1) {
      const letters = tokens[index].replace(/[^A-Za-zÀ-ÖØ-öø-ÿ-]/g, "");
      if (letters && letters !== letters.toUpperCase()) {
        firstIndex = index;
        break;
      }
    }
    const titleCase = (text) => text.toLowerCase().replace(/(^|\s|-)([a-zà-öø-ÿ])/g, (match) => match.toUpperCase());
    return {
      lastName: titleCase(tokens.slice(0, firstIndex).join(" ")),
      firstName: tokens.slice(firstIndex).join(" ")
    };
  }

  function isImportedRelayEvent(eventId) {
    return String(eventId || "").includes("x");
  }

  global.LivePalmesPdfImport = {
    EVENT_ALIASES,
    fixPdfEncoding,
    importedBirthYear,
    importedCategoryLabel,
    importedEventId,
    importedEventInfo,
    isImportedRelayEvent,
    normalizePdfLabel,
    normalizePdfUppercaseEToken,
    splitImportedPersonName
  };
})(window);
