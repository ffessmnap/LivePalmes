(function attachLivePalmesSwimmerDetailsView(global) {
  function render(options = {}) {
    const {
      categoryClass,
      categoryLabel,
      compactProgramPerformanceLabel,
      competitionStats = [],
      entries = [],
      escapeHtml,
      eventLabel,
      formatName,
      formatRank,
      france2025 = [],
      getBirthYearLabel,
      heldRecords = [],
      internationalMedals = [],
      medalClass,
      renderCompetitionStatBadges,
      renderEdfBadges,
      renderRecordCategoryFlag,
      renderRecordFlag,
      shortChampionshipLabel,
      shortEventLabel,
      swimmer = {},
      swimmerInfos = []
    } = options;

    const uniqueEntries = [...entries.reduce((map, entry) => {
      const key = `${entry.eventId}|${entry.sex || swimmer.sex || ""}`;
      if (!map.has(key)) map.set(key, entry);
      return map;
    }, new Map()).values()];

    return `
      <div class="details-title">
        <div class="swimmer-identity">
          <h4>${escapeHtml(formatName(swimmer))} ${renderCompetitionStatBadges(swimmer)} ${renderEdfBadges(swimmer)}</h4>
          <span>${escapeHtml(swimmer.club || "")} - ${escapeHtml(categoryLabel(swimmer.category, swimmer.sex))} - ${escapeHtml(getBirthYearLabel(swimmer.birthDate))}</span>
          ${competitionStats.length ? `
            <div class="stat-detail-list">
              ${competitionStats.map((item) => `<strong>${escapeHtml(item.icon || "*")} ${escapeHtml(item.detail || item.label || "Rep\u00e8re comp\u00e9tition")}</strong>`).join("")}
            </div>
          ` : ""}
          ${swimmerInfos.length ? `
            <div class="swimmer-info-list">
              ${swimmerInfos.map((item) => `<strong>${escapeHtml(item.info)}</strong>`).join("")}
            </div>
          ` : ""}
        </div>
        <div class="compact-program" aria-label="Courses engag\u00e9es du weekend">
          ${uniqueEntries.map((entry) => `
            <span class="${categoryClass(entry.category)}">
              <strong>${escapeHtml(shortEventLabel(entry.eventId))}</strong>
              ${compactProgramPerformanceLabel(entry)}
            </span>
          `).join("")}
        </div>
        <button class="icon-button close-details" title="Fermer la fiche" aria-label="Fermer la fiche">\u00d7</button>
      </div>
      ${heldRecords.length ? `
        <div class="detail-section">
          <h5>Records actuels d\u00e9tenus</h5>
          <div class="detail-list">
            ${heldRecords.map((record) => `
              <div class="detail-row record-detail ${categoryClass(record.category)}">
                <span>${renderRecordFlag(record)} ${renderRecordCategoryFlag(record)} <strong>${escapeHtml(eventLabel(record.eventId))}</strong> - ${escapeHtml([record.time, record.date, record.place].filter(Boolean).join(" - ") || "-")}</span>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
      ${internationalMedals.length ? `
        <div class="detail-section">
          <h5>International</h5>
          <div class="compact-achievement-list">
            ${internationalMedals.map((medal) => {
              const detail = [medal.time, shortChampionshipLabel(medal.championship)].filter(Boolean).join(" - ");
              return `
                <div class="compact-achievement ${categoryClass(swimmer.category)}">
                  <span class="medal-dot ${medalClass(medal.medal)}" aria-label="${escapeHtml(medal.medal || "M\u00e9daille")}">\u25cf</span>
                  <span><strong>${escapeHtml(medal.eventLabel || eventLabel(medal.eventId))}</strong>${detail ? ` - ${escapeHtml(detail)}` : ""}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      ` : ""}
      ${france2025.length ? `
        <div class="detail-section">
          <h5>France 2025</h5>
          <div class="compact-achievement-list france-compact">
            ${france2025.map((row) => `
              <div class="compact-achievement ${categoryClass(row.category)}">
                <span><strong>${escapeHtml(formatRank(row.rank))}</strong> ${escapeHtml(categoryLabel(row.category, row.sex))}</span>
                <span>${escapeHtml(eventLabel(row.eventId))}</span>
                <span>${escapeHtml(row.time || "-")}</span>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
    `;
  }

  global.LivePalmesSwimmerDetailsView = { render };
})(window);
