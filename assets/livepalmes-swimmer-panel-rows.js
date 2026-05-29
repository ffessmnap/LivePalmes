(function attachLivePalmesSwimmerPanelRows(global) {
  function renderRows(options = {}) {
    const {
      emptyHtml = "",
      hasSeriesFilter = false,
      helpers = {},
      state = {},
      visibleEntrants = []
    } = options;

    if (!visibleEntrants.length) return emptyHtml;

    const {
      activeLineAlertsForEntrant,
      categoryClass,
      categoryLabel,
      entrantKey,
      escapeHtml,
      formatDisplayName,
      formatSeriesDisplayName,
      getBirthYearLabel,
      isRelayEntrant,
      isSpeakerView,
      renderCompetitionStatBadges,
      renderEdfBadges,
      renderLineAlertBadges,
      renderLineTimeStatus,
      renderNonSelectableBadge,
      renderRecordGapAlert,
      rowReference,
      shortClubName
    } = helpers;

    return visibleEntrants.map((entrant, index) => {
      const importedForfait = entrant.importedStatus === "forfait";
      const relay = isRelayEntrant(entrant);
      const reference = rowReference(entrant);
      const swimmerId = entrant.swimmerId || entrantKey(entrant);
      const lineLabel = hasSeriesFilter ? (entrant.seriesInfo?.line || "-") : index + 1;
      const clubLabel = state.role === "referee" ? shortClubName(entrant) : (entrant.club || "-");
      const displayName = state.role === "referee" && relay
        ? (shortClubName(entrant) || formatDisplayName(entrant))
        : formatSeriesDisplayName(entrant);
      const lineAlerts = activeLineAlertsForEntrant(entrant);
      const lineTimeStatus = renderLineTimeStatus(entrant, lineAlerts);
      const rowDisabled = lineAlerts.length || importedForfait;

      return `
        <tr class="${state.selectedSwimmerId === swimmerId ? "selected-row" : ""} ${rowDisabled ? "dsq-row" : ""} ${importedForfait ? "imported-forfait-row" : ""} category-row ${categoryClass(entrant.category)}" data-swimmer-id="${escapeHtml(swimmerId)}" data-imported-forfait="${importedForfait ? "1" : "0"}">
          <td><span class="lane">${escapeHtml(lineLabel)}</span></td>
          <td class="name-cell">
            <button class="swimmer-button" data-swimmer-id="${escapeHtml(swimmerId)}">${escapeHtml(displayName)}${!relay ? ` <span class="birth-year">(${escapeHtml(getBirthYearLabel(entrant.birthDate))})</span>${renderNonSelectableBadge(entrant)}${renderCompetitionStatBadges(entrant)}` : ""}${isSpeakerView() ? renderEdfBadges(entrant) : ""}</button>
            ${!relay || state.role === "referee" ? `<span class="club-name">${escapeHtml(clubLabel || "-")}</span>` : ""}
          </td>
          <td><span class="category-pill">${escapeHtml(categoryLabel(entrant.category, entrant.sex))}</span></td>
          <td class="time-cell">
            ${lineTimeStatus
              ? lineTimeStatus
              : lineAlerts.length
              ? renderLineAlertBadges(lineAlerts)
              : `<span class="time">${escapeHtml(entrant.seedTime || "-")}</span>`}
            ${!lineTimeStatus && !lineAlerts.length && isSpeakerView() ? renderRecordGapAlert(entrant) : ""}
            ${!lineTimeStatus && !lineAlerts.length && isSpeakerView() && entrant.seedSource ? `<span class="seed-source">${escapeHtml(entrant.seedSource)}</span>` : ""}
          </td>
          <td>${reference}</td>
        </tr>
      `;
    }).join("");
  }

  global.LivePalmesSwimmerPanelRows = { renderRows };
})(window);
