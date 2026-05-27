(function attachLivePalmesProgramView(global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderProgramSeriesChip(item = {}, options = {}) {
    const readOnlyProgram = Boolean(options.readOnlyProgram);
    const className = [
      "program-series-chip",
      item.current ? "current" : "",
      item.speakerCurrent ? "speaker-current" : "",
      item.progressClass || ""
    ].filter(Boolean).join(" ");
    const attrs = readOnlyProgram
      ? "disabled"
      : `data-program-race="${escapeHtml(item.programKey)}" data-program-series="${escapeHtml(item.series)}" data-program-stage="${escapeHtml(item.stage || "series")}"`;
    return `
      <button class="${className}" type="button" ${attrs}>
        <strong>${escapeHtml(item.label)}</strong>${item.time ? `<span>${escapeHtml(item.time)}</span>` : ""}${item.speakerCurrent ? `<em>speaker</em>` : ""}${item.progressClass === "ja-current" ? `<em>JA</em>` : ""}
      </button>
    `;
  }

  function renderProgramRow(row = {}, options = {}) {
    const readOnlyProgram = Boolean(options.readOnlyProgram);
    const className = [
      "program-row",
      row.current ? "current-race" : "",
      row.progressClass || "",
      readOnlyProgram ? "readonly-program-row" : ""
    ].filter(Boolean).join(" ");
    return `
      <div class="${className}" data-program-row="${escapeHtml(row.programKey)}">
        <button class="program-race-button" type="button" ${readOnlyProgram ? "disabled" : `data-program-race="${escapeHtml(row.programKey)}"`}>
          <span>${row.session ? `S${escapeHtml(row.session)} · ` : ""}${escapeHtml(row.eventLabel)} ${escapeHtml(row.sexLabel)}${row.splitNote || ""}</span>
          ${row.startTime ? `<small>${escapeHtml(row.startTime)}</small>` : ""}
        </button>
        <div class="program-series-line">
          ${row.items?.length ? row.items.map((item) => renderProgramSeriesChip({ ...item, programKey: row.programKey }, options)).join("") : `<span class="no-series-note">Aucune série</span>`}
        </div>
      </div>
    `;
  }

  function renderProgramModalHtml(options = {}) {
    const {
      compactProgram = false,
      readOnlyProgram = false,
      rows = [],
      sessionLabel = "",
      speakerMarker = ""
    } = options;
    return `
      <div class="decision-dialog program-dialog ${compactProgram ? "compact-program-dialog" : ""}" role="dialog" aria-modal="true" aria-label="Programme">
        <div class="decision-modal-head">
          <div>
            <span>Avancement</span>
            <h2>Programme simplifié</h2>
            <p>${escapeHtml(sessionLabel)}</p>
            ${speakerMarker ? `<p class="speaker-program-marker">${escapeHtml(speakerMarker)}</p>` : ""}
          </div>
          <button class="decision-close" type="button" data-program-close aria-label="Fermer">×</button>
        </div>
        <div class="program-list">
          ${rows.length ? rows.map((row) => renderProgramRow(row, { readOnlyProgram })).join("") : `<p class="empty">Aucun programme disponible.</p>`}
        </div>
      </div>
    `;
  }

  global.LivePalmesProgramView = {
    renderProgramModalHtml
  };
})(window);
