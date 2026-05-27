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

  function renderFinalistsAlertListHtml({ finals = {}, sex = "", finalistRowName = () => "Concurrent" } = {}) {
    const renderRows = (title, rows = []) => rows.length ? `
    <div class="finalists-alert-group">
      <strong>${escapeHtml(title)}</strong>
      <ol>
        ${rows.map((row) => `
          <li value="${escapeHtml(row.rank || "")}" class="${row.withdrawnAt ? "withdrawn" : ""}">
            <span>${escapeHtml(finalistRowName(row))}</span>
            <em>${escapeHtml(row.time || "")}</em>
            ${row.withdrawnAt ? `<small class="finalist-status withdrawn">Forfait</small>` : ""}
            ${row.repechaged && !row.withdrawnAt ? `<small class="finalist-status repechaged">Repêché${sex === "F" ? "e" : ""}</small>` : ""}
          </li>
        `).join("")}
      </ol>
    </div>
  ` : "";
    return `
    <div class="finalists-alert-list">
      ${renderRows("Finale A", finals.a || [])}
      ${renderRows("Finale B", finals.b || [])}
    </div>
  `;
  }

  function renderAlertCardHtml(alert, {
    actionLabel = "",
    alertPriorityMeta = () => "",
    alertRaceLabel = () => "",
    alertSwimmerLabel = () => "",
    decisionLabels = {},
    detail = "",
    isRequalificationAlert = () => false,
    isSpeakerView = false,
    role = "",
    sexDisplayLabel = () => "",
    speakerAlertSentence = () => ({ text: "", identity: "" })
  } = {}) {
    if (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement") {
      const isReplacement = alert.type === "finalist_replacement_announcement";
      const title = isReplacement
        ? (role === "speaker" ? "Repêchage à annoncer" : "Repêchage finale")
        : (role === "speaker" ? "Finalistes à annoncer" : "Finalistes en attente d'annonce");
      const sentence = isReplacement ? speakerAlertSentence(alert) : null;
      return `
      <div class="alert-card speaker-alert-card finalists-alert-card" data-alert-id="${escapeHtml(alert.id)}">
        <div>
          <strong class="alert-title finalists-alert-title"><span aria-hidden="true">📣</span> ${escapeHtml(title)} <small>${escapeHtml(alertPriorityMeta(alert))}</small></strong>
          <span class="speaker-alert-line">
            <span class="speaker-alert-text">${escapeHtml(sentence?.text || `${alert.eventLabel || alert.eventId} ${alert.sexLabel || sexDisplayLabel(alert.sex)}`)}</span>
            <span class="speaker-alert-identity">- ${escapeHtml(sentence?.identity || `${String(alert.finalistCount || 0)} finaliste${Number(alert.finalistCount || 0) > 1 ? "s" : ""}`)}</span>
          </span>
        </div>
        ${role === "speaker" ? `<button class="ghost-button compact" type="button" ${isReplacement ? `data-alert-action="Annoncé"` : "data-finalists-open"}>${isReplacement ? "Annoncé" : "Ouvrir"}</button>` : ""}
      </div>
    `;
    }
    if (isSpeakerView) {
      const sentence = speakerAlertSentence(alert);
      const alertTitle = role === "live"
        ? (isRequalificationAlert(alert) ? "Requalification signalée" : "Disqualification signalée")
        : (isRequalificationAlert(alert) ? "Requalification à annoncer" : "Disqualification à annoncer");
      return `
      <div class="alert-card speaker-alert-card" data-alert-id="${escapeHtml(alert.id)}">
        <div>
          <strong class="alert-title"><span aria-hidden="true">!</span> ${escapeHtml(alertTitle)} <small>${escapeHtml(alertPriorityMeta(alert))}</small></strong>
          <span class="speaker-alert-line">
            <span class="speaker-alert-text">${escapeHtml(sentence.text)}</span>
            <span class="speaker-alert-identity">- ${escapeHtml(sentence.identity)}</span>
          </span>
        </div>
        ${actionLabel ? `<button class="ghost-button compact" type="button" data-alert-action="${escapeHtml(actionLabel)}">${escapeHtml(actionLabel)}</button>` : ""}
      </div>
    `;
    }
    return `
    <div class="alert-card" data-alert-id="${escapeHtml(alert.id)}">
      <div>
        <strong>${escapeHtml(decisionLabels[alert.type] || (isRequalificationAlert(alert) ? "Requalification / annulation" : alert.type))} <small class="alert-title-meta">${escapeHtml(alertPriorityMeta(alert))}</small></strong>
        <span>${escapeHtml(alertRaceLabel(alert))}</span>
        <span>${escapeHtml(alertSwimmerLabel(alert))}${detail ? ` - ${escapeHtml(detail)}` : ""}</span>
      </div>
      ${actionLabel ? `<button class="ghost-button compact" type="button" data-alert-action="${escapeHtml(actionLabel)}">${escapeHtml(actionLabel)}</button>` : ""}
    </div>
  `;
  }

  function renderVideoInfoCardHtml({
    eventLabel = "",
    sexLabel = "",
    seriesLabel = "",
    timeLabel = ""
  } = {}) {
    return `
    <div class="alert-card video-info-card" aria-live="polite">
      <div>
        <strong class="alert-title"><span aria-hidden="true">⏳</span> Arbitrage vidéo en cours</strong>
        <small class="alert-title-meta">Info - ${escapeHtml(timeLabel || "--:--")}</small>
        <span class="speaker-alert-line">
          <span class="speaker-alert-text">Arbitrage vidéo en cours sur la ${escapeHtml(seriesLabel)} du ${escapeHtml(eventLabel)} ${escapeHtml(sexLabel)}.</span>
        </span>
      </div>
    </div>
  `;
  }

  window.LivePalmesAlertCardView = {
    renderAlertCardHtml,
    renderFinalistsAlertListHtml,
    renderVideoInfoCardHtml
  };
}());
