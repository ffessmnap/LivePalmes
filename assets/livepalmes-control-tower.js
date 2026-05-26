(function attachLivePalmesControlTower(global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderPanelHtml(options = {}) {
    const {
      canReset = false,
      competitionLabel = "Compétition",
      consoleRows = [],
      directEnabled = false,
      firebaseStatus = "",
      jaProgressLabel = "",
      pageResultCount = 0,
      publicOnline = true,
      publicPositionEnabled = false,
      publicProgressLabel = "",
      roleLabels = {},
      sessionRows = [],
      seriesCount = 0,
      seriesUpdatedLabel = ""
    } = options;
    const connectedTotal = consoleRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
    return `
      <div class="control-tower-head">
        <div>
          <p class="eyebrow">Pilotage</p>
          <h2>Tour de contrôle</h2>
          <p>${escapeHtml(competitionLabel)}</p>
        </div>
        <div class="control-tower-state">
          <span class="status-pill ${directEnabled ? "ok" : "warning"}">${directEnabled ? "Direct" : "Manuel"}</span>
          <span class="status-pill ${firebaseStatus === "online" || directEnabled ? "ok" : "muted"}">Firebase ${escapeHtml(firebaseStatus || "-")}</span>
        </div>
      </div>
      <div class="control-tower-grid">
        <article class="control-card wide">
          <span>Repères compétition</span>
          <strong>${escapeHtml(publicPositionEnabled ? publicProgressLabel : "Partage public désactivé")}</strong>
          <small>Point JA : ${escapeHtml(jaProgressLabel || "non renseigné")}</small>
        </article>
        <article class="control-card">
          <span>Pages publiques</span>
          <strong>${publicOnline ? "En ligne" : "Hors ligne"}</strong>
          <small>${escapeHtml(String(pageResultCount))} résultat${pageResultCount > 1 ? "s" : ""} publié${pageResultCount > 1 ? "s" : ""}</small>
        </article>
        <article class="control-card">
          <span>Séries</span>
          <strong>${escapeHtml(String(seriesCount))} courses</strong>
          <small>MAJ ${escapeHtml(seriesUpdatedLabel)}</small>
        </article>
      </div>
      <article class="panel control-panel control-actions-panel">
        <div class="panel-title">
          <h3>Commandes</h3>
          <span class="soft-count">Synchronisées</span>
        </div>
        <div class="control-action-grid">
          <button class="sync-mode-toggle control-sync-toggle ${directEnabled ? "active" : ""}" type="button" data-control-competition-mode aria-pressed="${directEnabled ? "true" : "false"}">
            <span aria-hidden="true"></span>${directEnabled ? "Direct" : "Manuel"}
          </button>
          <label class="control-speaker-share-toggle">
            <input type="checkbox" data-control-public-position ${publicPositionEnabled ? "checked" : ""} ${options.firestoreAvailable ? "" : "disabled"}>
            <span class="control-toggle-switch" aria-hidden="true"></span>
            <span>Partage position speaker</span>
          </label>
          <button class="public-online-toggle ${publicOnline ? "online" : "offline"} control-public-online-toggle" type="button" data-control-public-online aria-pressed="${publicOnline ? "true" : "false"}">
            <span></span>${publicOnline ? "Pages publiques en ligne" : "Pages publiques hors ligne"}
          </button>
          <button class="ghost-button compact" type="button" data-control-speaker-info>MAJ repères</button>
          <button class="ghost-button compact danger-button" type="button" data-control-results-reset title="${canReset ? "Remise à zéro LivePalmes" : "RAZ indisponible quand l'actualisation directe est active"}">RAZ</button>
        </div>
      </article>
      <div class="control-tower-columns">
        <article class="panel control-panel">
          <div class="panel-title">
            <h3>Consoles</h3>
            <span class="soft-count">${escapeHtml(String(connectedTotal))} connecté${connectedTotal > 1 ? "s" : ""}</span>
          </div>
          <div class="control-console-list">
            ${consoleRows.map((row) => `
              <div class="control-console-row">
                <strong>${escapeHtml(roleLabels[row.role] || row.role)}</strong>
                <span>${escapeHtml(row.presenceLabel || "")}</span>
                <small>${escapeHtml(row.actionLabel || "")}</small>
                ${row.role === "control" ? "" : `<button class="ghost-button compact control-preview-button" type="button" data-control-preview-role="${escapeHtml(row.role)}">Voir</button>`}
              </div>
            `).join("")}
          </div>
        </article>
        <article class="panel control-panel">
          <div class="panel-title">
            <h3>Sessions</h3>
            <span class="soft-count">${escapeHtml(String(sessionRows.length))}</span>
          </div>
          <div class="control-session-list">
            ${sessionRows.length ? sessionRows.map((item) => `
              <div class="control-session-row">
                <strong>${escapeHtml(item.label || `Session ${item.number}`)}</strong>
                <span>${escapeHtml(String(item.resultCount))} / ${escapeHtml(String(item.programCount))} résultats</span>
                <small>${item.lastResultLabel ? `MAJ ${escapeHtml(item.lastResultLabel)}` : "Pas de résultat"}</small>
              </div>
            `).join("") : `<p class="panel-subtitle">Aucune session chargée.</p>`}
          </div>
        </article>
      </div>
    `;
  }

  global.LivePalmesControlTower = {
    renderPanelHtml
  };
})(window);
