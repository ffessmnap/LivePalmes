(function () {
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function renderHeaderReferenceChipsHtml({
    qualificationRows = [],
    recordRows = [],
    selectedRecordKey = "",
    helpers = {}
  } = {}) {
    const categoryClass = helpers.categoryClass || (() => "");
    const recordKey = helpers.recordKey || (() => "");
    const shortRecordLabel = helpers.shortRecordLabel || (() => "");
    return [
      ...recordRows.map((row) => {
        const key = recordKey(row);
        return `
      <button class="ref-chip ref-chip-button ${categoryClass(row.category)} ${selectedRecordKey === key ? "active-ref" : ""}" data-record-key="${escapeHtml(key)}">
        <strong>${escapeHtml(shortRecordLabel(row))}</strong>
        ${escapeHtml(row.time || "-")}
      </button>
    `;
      }),
      ...qualificationRows.map((row) => `
      <span class="ref-chip qualification-chip">
        <strong>${escapeHtml(row.label || "EDF")}</strong>
        ${escapeHtml(row.time || "-")}
      </span>
    `)
    ].join("");
  }

  function renderSelectedHeaderReferenceDetailsHtml(row, helpers = {}) {
    if (!row) return "";
    const recordDescription = helpers.recordDescription || (() => "");
    const shortRecordLabel = helpers.shortRecordLabel || (() => "");
    return `
    <div>
      <strong>${escapeHtml(shortRecordLabel(row))} - ${escapeHtml(row.time || "-")}</strong>
      <span>${escapeHtml(recordDescription(row))}</span>
    </div>
    <button class="icon-button close-ref-details" title="Fermer le détail" aria-label="Fermer le détail">×</button>
  `;
  }

  window.LivePalmesHeaderView = {
    renderHeaderReferenceChipsHtml,
    renderSelectedHeaderReferenceDetailsHtml
  };
}());
