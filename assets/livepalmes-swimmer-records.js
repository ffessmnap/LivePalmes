(function attachLivePalmesSwimmerRecords(global) {
  function build(options = {}) {
    const {
      categoryClass,
      data = {},
      escapeHtml,
      isRelayEntrant,
      matchesRace,
      recordMatchesRace,
      sameCategory,
      shouldKeepRecord,
      state = {}
    } = options;

    function recordKey(row) {
      return [row.eventId, row.sex, row.category, row.label].join("|").toLowerCase();
    }

    function sameSession(row) {
      return !state.session || state.session === "all" || !row.session || row.session === state.session;
    }

    function sameSeriesSelection(row) {
      if (!state.series || state.series === "all") return true;
      if (String(state.series).startsWith("finale-")) return row.stage === state.series;
      return Number(row.series) === Number(state.series);
    }

    function visibleSeriesRows() {
      return (data.series || [])
        .filter((row) => row.eventId === state.eventId && row.sex === state.sex)
        .filter(sameSession)
        .filter(sameSeriesSelection);
    }

    function seriesEntrantLookup() {
      const lookup = new Map();
      (data.entrants || [])
        .filter(matchesRace)
        .filter(sameSession)
        .forEach((entrant) => {
          const swimmerId = entrant.swimmerId || "";
          if (!swimmerId) return;
          lookup.set(`${entrant.eventId}|${entrant.sex}|${entrant.session || ""}|${swimmerId}`, entrant);
          lookup.set(`${entrant.eventId}|${entrant.sex}|${swimmerId}`, entrant);
        });
      return lookup;
    }

    function visibleSeriesCategories() {
      const rows = visibleSeriesRows();
      if (!rows.length) return [];
      const entrantsByKey = seriesEntrantLookup();
      const categories = rows
        .map((row) => {
          const swimmerId = row.swimmerId || "";
          return entrantsByKey.get(`${row.eventId}|${row.sex}|${row.session || ""}|${swimmerId}`) ||
            entrantsByKey.get(`${row.eventId}|${row.sex}|${swimmerId}`) ||
            row;
        })
        .map((entrant) => entrant?.category)
        .filter(Boolean);
      return [...new Set(categories)];
    }

    function recordDisplayLabel(row) {
      return String(row?.label || "").replace(/(^|[^A-Z0-9])M(\d+\+)(?=$|[^A-Z0-9])/gi, "$1H$2");
    }

    function categoryMatchKey(category) {
      const value = String(category || "").trim();
      const master = value.match(/^([fhm])(\d+\+)$/i);
      if (master) {
        const prefix = master[1].toUpperCase() === "M" ? "H" : master[1].toUpperCase();
        return `${prefix}${master[2]}`.toLowerCase();
      }
      return value.toLowerCase();
    }

    function categoryIsVisible(record, categories) {
      if (!Array.isArray(categories)) return true;
      if (!categories.length) return false;
      const recordCategory = categoryMatchKey(record.category);
      return categories.some((category) => categoryMatchKey(category) === recordCategory);
    }

    function comparableRecordRaceId(value) {
      const compact = String(value || "")
        .toLowerCase()
        .replace(/-mi\b/g, "")
        .replace(/[^a-z0-9x]+/g, "");
      return /^4x/i.test(compact) && compact.endsWith("x") ? compact.slice(0, -1) : compact;
    }

    function recordMatchesCurrentRace(record) {
      if (recordMatchesRace(record)) return true;
      const recordId = comparableRecordRaceId(record.eventId);
      const raceId = comparableRecordRaceId(state.eventId);
      if (!recordId || !raceId || recordId !== raceId) return false;
      if (state.sex === "X" && isRelayEntrant({ eventId: state.eventId })) {
        return ["F", "M", "X"].includes(String(record.sex || ""));
      }
      return String(record.sex || "") === String(state.sex || "");
    }

    function categoryOrder(category) {
      if (sameCategory(category, "Minime") || sameCategory(category, "Minimes")) return 1;
      if (sameCategory(category, "Cadet")) return 2;
      if (sameCategory(category, "Junior")) return 3;
      if (sameCategory(category, "Senior")) return 4;
      const master = String(category || "").match(/^(?:master|masters|m?(\d+)\+?|[fhm](\d+)\+?)$/i);
      if (master) return 5 + (Number(master[1] || master[2] || 0) / 100);
      return 99;
    }

    function currentRecordRows() {
      const visibleCategories = visibleSeriesCategories();
      const relayCategories = isRelayEntrant({ eventId: state.eventId })
        ? new Set((data.entrants || []).filter(matchesRace).map((entrant) => entrant.category).filter(Boolean))
        : null;
      return (data.records || [])
        .filter(shouldKeepRecord)
        .filter(recordMatchesCurrentRace)
        .filter((record) => categoryIsVisible(record, visibleCategories))
        .filter((record) => !relayCategories || relayCategories.has(record.category))
        .sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category));
    }

    function shortRecordLabel(row) {
      if (sameCategory(row.category, "Cadet")) return state.sex === "F" ? "MPF cadette" : "MPF cadet";
      if (sameCategory(row.category, "Junior")) return "RF junior";
      if (sameCategory(row.category, "Senior")) return "RF senior";
      return recordDisplayLabel(row) || row.category || "Record";
    }

    function recordFlagText(row) {
      if (sameCategory(row.category, "Cadet")) return "MPF";
      if (sameCategory(row.category, "Junior")) return "RFJ";
      if (sameCategory(row.category, "Senior")) return "RF";
      if (/^mpf\b/i.test(String(row.label || ""))) return "MPF";
      return "REC";
    }

    function renderRecordFlag(row) {
      return `<span class="record-flag" title="${escapeHtml(shortRecordLabel(row))}">${escapeHtml(recordFlagText(row))}</span>`;
    }

    function shortCategoryLabel(category) {
      if (sameCategory(category, "Minime") || sameCategory(category, "Minimes")) return "MIN";
      if (sameCategory(category, "Cadet")) return "CAD";
      if (sameCategory(category, "Junior")) return "JUN";
      if (sameCategory(category, "Senior")) return "SEN";
      const master = String(category || "").match(/^(?:m?(\d+)\+?|([fhm])(\d+)\+?)$/i);
      if (master) {
        const prefix = master[2] ? (master[2].toUpperCase() === "M" ? "H" : master[2].toUpperCase()) : "";
        return `${prefix}${master[1] || master[3]}+`;
      }
      if (/^masters?$/i.test(String(category || ""))) return "MAS";
      return String(category || "").slice(0, 3).toUpperCase();
    }

    function renderRecordCategoryFlag(row) {
      return `<span class="record-category-flag ${categoryClass(row.category)}">${escapeHtml(shortCategoryLabel(row.category))}</span>`;
    }

    function recordDescription(row) {
      return [
        row.holder || "Titulaire à renseigner",
        row.club,
        row.date,
        row.place
      ].filter(Boolean).join(" - ");
    }

    return {
      currentRecordRows,
      recordDescription,
      recordFlagText,
      recordKey,
      renderRecordCategoryFlag,
      renderRecordFlag,
      shortCategoryLabel,
      shortRecordLabel
    };
  }

  global.LivePalmesSwimmerRecords = { build };
})(window);
