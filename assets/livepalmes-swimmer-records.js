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
      if (!rows.length) return null;
      const entrantsByKey = seriesEntrantLookup();
      const categories = rows
        .map((row) => {
          const swimmerId = row.swimmerId || "";
          return entrantsByKey.get(`${row.eventId}|${row.sex}|${row.session || ""}|${swimmerId}`) ||
            entrantsByKey.get(`${row.eventId}|${row.sex}|${swimmerId}`);
        })
        .map((entrant) => entrant?.category)
        .filter(Boolean);
      return categories.length ? [...new Set(categories)] : null;
    }

    function categoryIsVisible(record, categories) {
      return !categories || categories.some((category) => sameCategory(record.category, category));
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
        .filter((record) => recordMatchesRace(record))
        .filter((record) => categoryIsVisible(record, visibleCategories))
        .filter((record) => !relayCategories || relayCategories.has(record.category))
        .sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category));
    }

    function shortRecordLabel(row) {
      if (sameCategory(row.category, "Cadet")) return state.sex === "F" ? "MPF cadette" : "MPF cadet";
      if (sameCategory(row.category, "Junior")) return "RF junior";
      if (sameCategory(row.category, "Senior")) return "RF senior";
      return row.label || row.category || "Record";
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
      if (master) return `${master[2] ? master[2].toUpperCase() : ""}${master[1] || master[3]}+`;
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
