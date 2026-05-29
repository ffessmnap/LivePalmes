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

    function currentRecordRows() {
      const order = { Cadet: 1, Junior: 2, Senior: 3 };
      const relayCategories = isRelayEntrant({ eventId: state.eventId })
        ? new Set((data.entrants || []).filter(matchesRace).map((entrant) => entrant.category).filter(Boolean))
        : null;
      return (data.records || [])
        .filter(shouldKeepRecord)
        .filter((record) => recordMatchesRace(record))
        .filter((record) => !relayCategories || relayCategories.has(record.category))
        .sort((a, b) => (order[a.category] || 99) - (order[b.category] || 99));
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
      return "REC";
    }

    function renderRecordFlag(row) {
      return `<span class="record-flag" title="${escapeHtml(shortRecordLabel(row))}">${escapeHtml(recordFlagText(row))}</span>`;
    }

    function shortCategoryLabel(category) {
      if (sameCategory(category, "Cadet")) return "CAD";
      if (sameCategory(category, "Junior")) return "JUN";
      if (sameCategory(category, "Senior")) return "SEN";
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
