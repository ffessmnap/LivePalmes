(function attachLivePalmesRoleQueueView(global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderQueueItem(alert, options = {}) {
    const role = options.role || "";
    const helpers = options.helpers || {};
    if (role === "secretary" && alert.type === "forfait" && alert.secretaryStatus === "pending") {
      const detail = helpers.alertCommentLabel?.(alert) || "";
      return `
        <div class="queue-item urgent-queue-item" data-alert-id="${escapeHtml(alert.id)}">
          <div>
            <strong class="alert-title"><span aria-hidden="true">!</span> Forfait non déclaré à prendre en note <small>${escapeHtml(helpers.formatAlertTime?.(alert.createdAt) || "")}</small></strong>
            <strong>${escapeHtml(helpers.alertRaceLabel?.(alert) || "")}</strong>
            <span>${escapeHtml(`${helpers.alertSwimmerLabel?.(alert) || ""}${detail ? ` - ${detail}` : ""}`)}</span>
          </div>
          <div class="queue-actions">
            <button class="ghost-button compact confirm-button" type="button" data-queue-action="done-secretary">Pris note</button>
          </div>
        </div>
      `;
    }
    if (role === "secretary" && (alert.type === "finalists_announcement" || alert.type === "finalist_replacement_announcement")) {
      const label = alert.type === "finalist_replacement_announcement"
        ? "Repêchage en attente d'annonce speaker"
        : "Finalistes en attente d'annonce speaker";
      const detail = alert.type === "finalist_replacement_announcement" && alert.replacementName
        ? `Repêché(e) : ${alert.replacementName}${alert.replacementClub ? ` - ${alert.replacementClub}` : ""}`
        : "Le secrétariat peut relancer le speaker si l'annonce tarde.";
      return `
        <div class="queue-item video-info-card" data-alert-id="${escapeHtml(alert.id)}">
          <div>
            <strong class="alert-title secretary-info-title"><span aria-hidden="true">i</span> ${escapeHtml(label)} <small>${escapeHtml(helpers.formatAlertTime?.(alert.createdAt) || "")}</small></strong>
            <strong class="secretary-info-race">${escapeHtml(alert.eventLabel || alert.eventId)} ${escapeHtml(alert.sexLabel || helpers.sexDisplayLabel?.(alert.sex) || "")}</strong>
            <span class="secretary-info-detail">${escapeHtml(detail)}</span>
          </div>
        </div>
      `;
    }
    if (alert.type === "final_composition_ready") {
      return `
        <div class="queue-item final-composition-item" data-alert-id="${escapeHtml(alert.id)}">
          <div>
            <strong class="alert-title"><span aria-hidden="true">i</span> Composition finale définitive <small>${escapeHtml(helpers.formatAlertTime?.(alert.createdAt) || "")}</small></strong>
            <strong>${escapeHtml(alert.eventLabel || alert.eventId)} ${escapeHtml(alert.sexLabel || helpers.sexDisplayLabel?.(alert.sex) || "")}</strong>
            <span>La composition de la ou des finales est définitive.</span>
          </div>
          <div class="queue-actions">
            <button class="ghost-button compact confirm-button" type="button" data-final-composition-open="${escapeHtml(alert.id)}">Voir les qualifiés et forfaits</button>
          </div>
        </div>
      `;
    }
    const videoActions = role === "video"
      ? `<button class="ghost-button compact confirm-button" type="button" data-queue-action="confirm-video">Confirmer DSQ</button>
         <button class="ghost-button compact danger-button" type="button" data-queue-action="reject-video">Invalider</button>`
      : "";
    const computerActions = role === "computer"
      ? `<button class="ghost-button compact confirm-button" type="button" data-queue-action="done-computer">Traité</button>`
      : "";
    const title = role === "video" ? "Demande arbitrage vidéo à traiter" : "Décision à saisir";
    const detail = helpers.alertCommentLabel?.(alert) || "";
    const identityLine = role === "video"
      ? ""
      : `${helpers.alertSwimmerLabel?.(alert) || ""}${detail ? ` - ${detail}` : ""}`;
    return `
      <div class="queue-item urgent-queue-item" data-alert-id="${escapeHtml(alert.id)}">
        <div>
          <strong class="alert-title"><span aria-hidden="true">!</span> ${escapeHtml(title)} <small>${escapeHtml([helpers.formatAlertTime?.(alert.createdAt)].filter(Boolean).join(""))}</small></strong>
          <strong>${escapeHtml(helpers.decisionMotifLabel?.(alert) || "")}</strong>
          <span>${escapeHtml(helpers.alertRaceLabel?.(alert) || "")}</span>
          ${identityLine ? `<span>${escapeHtml(identityLine)}</span>` : ""}
        </div>
        <div class="queue-actions">${videoActions}${computerActions}</div>
      </div>
    `;
  }

  function renderRoleQueueHtml(options = {}) {
    const {
      helpers = {},
      role = "",
      rows = [],
      title = "Informations"
    } = options;
    return `
      <h3>${escapeHtml(title)}</h3>
      <div class="queue-list">
        ${rows.length ? rows.map((alert) => renderQueueItem(alert, { helpers, role })).join("") : `<p class="panel-subtitle">Aucune information en attente.</p>`}
      </div>
    `;
  }

  global.LivePalmesRoleQueueView = {
    renderRoleQueueHtml
  };
})(window);
