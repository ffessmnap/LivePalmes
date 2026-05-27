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

  function renderAlertDetailModalHtml({
    alert = {},
    clickedSentence = null,
    comment = "",
    courseLabel = "",
    decisionLabel = "",
    formatAlertDateTime = () => "",
    hasSeriesLine = false,
    identity = "",
    seriesLineLabel = "",
    sheetTitle = "Fiche décision",
    speakerSentence = null,
    status = "",
    statusClass = "",
    timeline = []
  } = {}) {
    return `
    <div class="decision-dialog alert-detail-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(sheetTitle)}">
      <div class="decision-modal-head">
        <div>
          <span>${escapeHtml(sheetTitle)}</span>
          <h2>${escapeHtml(decisionLabel)}</h2>
          <p>${escapeHtml(identity)}</p>
          <p class="decision-race-info">${escapeHtml(courseLabel)}${hasSeriesLine ? ` - ${escapeHtml(seriesLineLabel)}` : ""}</p>
        </div>
        <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
      </div>
      <div class="alert-detail-status ${escapeHtml(statusClass)}">
        <strong>${escapeHtml(status)}</strong>
      </div>
      <div class="alert-detail-grid">
        <div><span>Course</span><strong>${escapeHtml(courseLabel)}</strong></div>
        ${hasSeriesLine ? `<div><span>Série - Ligne</span><strong>${escapeHtml(seriesLineLabel)}</strong></div>` : ""}
        <div><span>Concurrent</span><strong>${escapeHtml(identity)}</strong></div>
        <div><span>Motif</span><strong>${escapeHtml(decisionLabel)}</strong></div>
      </div>
      ${comment ? `<div class="alert-detail-note"><span>Remarque</span><strong>${escapeHtml(comment)}</strong></div>` : ""}
      ${speakerSentence ? `<div class="alert-detail-note"><span>Texte speaker</span><strong>${escapeHtml(speakerSentence.text)} - ${escapeHtml(speakerSentence.identity)}</strong></div>` : ""}
      ${clickedSentence ? `<div class="alert-detail-note"><span>Alerte en cours</span><strong>${escapeHtml(clickedSentence.text)} - ${escapeHtml(clickedSentence.identity)}</strong></div>` : ""}
      <div class="alert-detail-timeline">
        <h3>Historique</h3>
        ${timeline.length ? timeline.map(([label, value]) => `
          <div class="alert-timeline-row">
            <time>${escapeHtml(formatAlertDateTime(value) || "--")}</time>
            <strong>${escapeHtml(label)}</strong>
          </div>
        `).join("") : `<p class="panel-subtitle">Aucun historique disponible.</p>`}
      </div>
    </div>
  `;
  }

  function renderFinalistsAnnouncementModalHtml({
    alert = {},
    canMarkAnnounced = false,
    eventLabel = "",
    finalistsListHtml = "",
    sexLabel = "",
    speakerText = ""
  } = {}) {
    return `
    <div class="decision-dialog alert-detail-dialog finalists-announcement-dialog" role="dialog" aria-modal="true" aria-label="Finalistes à annoncer">
      <div class="decision-modal-head">
        <div>
          <span>Annonce speaker</span>
          <h2>Finalistes à annoncer</h2>
          <p>${escapeHtml(eventLabel)} ${escapeHtml(sexLabel)}</p>
        </div>
        <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
      </div>
      <div class="alert-detail-note finalists-speaker-text">
        <span>Texte speaker</span>
        <strong>${escapeHtml(speakerText)}</strong>
      </div>
      ${finalistsListHtml}
      <div class="decision-actions">
        <button class="ghost-button" type="button" data-close-alert-detail>Fermer</button>
        ${canMarkAnnounced ? `<button class="primary-button" type="button" data-finalists-announced="${escapeHtml(alert.id)}">Annoncé</button>` : ""}
      </div>
    </div>
  `;
  }

  function renderFinalWithdrawalsModalHtml({
    eventLabel = "",
    finalAHtml = "",
    finalBHtml = "",
    sexLabel = "",
    unqualifiedHtml = ""
  } = {}) {
    return `
    <div class="decision-dialog alert-detail-dialog final-withdrawal-dialog" role="dialog" aria-modal="true" aria-label="Forfaits finales">
      <div class="decision-modal-head">
        <div>
          <span>Secrétariat</span>
          <h2>Forfaits finales</h2>
          <p>${escapeHtml(eventLabel)} ${escapeHtml(sexLabel)}</p>
        </div>
        <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
      </div>
      <div class="final-withdrawal-list">
        ${finalAHtml}
        ${finalBHtml}
        ${unqualifiedHtml}
      </div>
      <div class="decision-actions">
        <button class="ghost-button" type="button" data-close-alert-detail>Fermer</button>
      </div>
    </div>
  `;
  }

  window.LivePalmesAlertDetailView = {
    renderAlertDetailModalHtml,
    renderFinalistsAnnouncementModalHtml,
    renderFinalWithdrawalsModalHtml
  };
}());
