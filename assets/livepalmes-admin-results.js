(function attachLivePalmesAdminResults(global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function sessionResultsPdfsForSession(items = [], session = "") {
    return (Array.isArray(items) ? items : [])
      .filter((pdf) => pdf.scope === "full" || (pdf.sessions || []).map(String).includes(String(session || "")) || String(pdf.session || "") === String(session || ""))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  function latestResultSession(results = []) {
    const latest = (Array.isArray(results) ? results : [])
      .filter((result) => result.updatedAt && result.session)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    return latest?.session ? String(latest.session) : "";
  }

  function resultStatusLabel(result) {
    if (!result) return "";
    if (result.hasFinal && result.finalistsAnnouncedAt) return "Finalistes annoncés";
    if (result.hasFinal) return "En attente annonce speaker";
    return "Publié";
  }

  function resultStatusBadge(result, isFinalCompositionDefinitive = false) {
    if (!result) return { label: "À importer", tone: "missing" };
    if (result.hasFinal && !result.finalistsAnnouncedAt) return { label: "Attente speaker", tone: "waiting" };
    if (result.hasFinal) {
      return isFinalCompositionDefinitive
        ? { label: "Finalistes définitifs", tone: "done" }
        : { label: "Finalistes provisoires", tone: "pending" };
    }
    if (result.isPartial) return { label: "Résultat partiel", tone: "partial" };
    return { label: "Résultat publié", tone: "done" };
  }

  function resultUploadKeyForProgram(programKeyValue) {
    return `result:${programKeyValue || ""}`;
  }

  function resultUploadKeyForSessionResults(session) {
    return `session-results:${String(session || "current")}`;
  }

  function resultUploadBadgeHtml(uploadState) {
    if (!uploadState) return "";
    const tone = uploadState.tone || "loading";
    const label = uploadState.label || "Chargement en cours...";
    return `<span class="result-status-badge ${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
  }

  function resultStatusControlHtml(options = {}) {
    const {
      programKeyValue = "",
      result = null,
      statusBadge = resultStatusBadge(result),
      resultId = result?.id || ""
    } = options;
    const className = `result-status-badge ${escapeHtml(statusBadge.tone)}`;
    if (!result) {
      return `<button class="${className} status-action" type="button" data-result-import="${escapeHtml(programKeyValue)}">${escapeHtml(statusBadge.label)}</button>`;
    }
    if (result.hasFinal) {
      return `<button class="${className} status-action" type="button" data-final-composition-result="${escapeHtml(resultId)}">${escapeHtml(statusBadge.label)}</button>`;
    }
    return `<span class="${className}">${escapeHtml(statusBadge.label)}</span>`;
  }

  function renderResultsAdminPanelHtml(options = {}) {
    const {
      activeSession = "",
      publicResultsOnline = true,
      rowsHtml = "",
      seriesImportBusy = false,
      seriesImportStateHtml = "",
      sessionResultsImportHtml = "",
      sessions = []
    } = options;
    return `
      <div class="panel-title">
        <div>
          <h3>Publication des résultats</h3>
          <p class="panel-subtitle">Import PDF, publication publique et suivi des finalistes.</p>
        </div>
        <div class="results-admin-actions">
          ${seriesImportStateHtml}
          ${sessions.length ? `
            <label class="results-session-select">
              <span>Session</span>
              <select id="resultsAdminSessionSelect" aria-label="Session des résultats">
                ${sessions.map((session) => `
                  <option value="${escapeHtml(session.number)}" ${activeSession === session.number ? "selected" : ""}>S${escapeHtml(session.number)}</option>
                `).join("")}
              </select>
            </label>
          ` : ""}
          <button class="ghost-button compact" type="button" data-public-session-infos>Informations</button>
          <button class="ghost-button compact" type="button" data-computer-admin-series ${seriesImportBusy ? "disabled" : ""}>Importer séries</button>
          <button class="public-online-toggle ${publicResultsOnline ? "online" : "offline"}" type="button" data-public-results-online-toggle aria-pressed="${publicResultsOnline ? "true" : "false"}">
            <span></span>${publicResultsOnline ? "Page publique en ligne" : "Page publique hors ligne"}
          </button>
          <a class="ghost-button compact" href="resultats.html?v=20260520-session-infos-light" target="_blank" rel="noopener">Page publique</a>
        </div>
      </div>
      <div class="results-admin-list">
        ${rowsHtml || `<p class="panel-subtitle">Aucune course trouvée dans le programme.</p>`}
        ${sessionResultsImportHtml}
      </div>
    `;
  }

  function renderSessionResultsImportRowHtml(options = {}) {
    const {
      activeSession = "",
      blockingUpload = false,
      latest = null,
      latestUpdatedLabel = "",
      uploadState = null,
      uploadStateHtml = ""
    } = options;
    return `
      <div class="result-admin-row session-results-import-row ${latest ? "published" : ""} ${uploadState ? "waiting" : ""}">
        <div>
          <strong>${activeSession ? `S${escapeHtml(activeSession)} · ` : ""}Résultats complets de session</strong>
          <span>${uploadState ? (uploadState.tone === "error" ? "Le PDF n'a pas pu être envoyé. Tu peux réessayer." : "Le PDF est en cours d'envoi vers la page publique.") : (latest ? escapeHtml([latest.sourceLabel, latest.pdfName].filter(Boolean).join(" - ")) : "Dépôt simple d'un PDF complet, sans lecture des finalistes.")}</span>
          ${!uploadState && latestUpdatedLabel ? `<small class="result-admin-note result-definitive-note">Mis à jour le ${escapeHtml(latestUpdatedLabel)}</small>` : ""}
        </div>
        <div class="result-admin-row-actions">
          ${uploadStateHtml}
          ${blockingUpload ? "" : `
            <button class="result-status-badge ${latest ? "done" : "missing"} status-action" type="button" data-session-results-import="${escapeHtml(activeSession || "")}">
              ${latest ? "Remplacer PDF complet" : "Importer PDF complet"}
            </button>
          `}
        </div>
      </div>
    `;
  }

  function renderResultProgramRowHtml(options = {}) {
    const {
      blockingUpload = false,
      definitiveLabel = "",
      eventLabel = "",
      finalistCount = 0,
      hasFinal = false,
      phaseLabel = "",
      programKeyValue = "",
      result = null,
      resultId = "",
      row = {},
      sexLabel = "",
      status = "",
      statusControlHtml = "",
      uploadState = null,
      uploadStateHtml = ""
    } = options;
    return `
      <div class="result-admin-row ${result ? "published" : ""} ${hasFinal && !result?.finalistsAnnouncedAt ? "waiting" : ""} ${uploadState ? "waiting" : ""}">
        <div>
          <strong>${row.session ? `S${escapeHtml(row.session)} · ` : ""}${escapeHtml(eventLabel)} ${escapeHtml(sexLabel)} - ${escapeHtml(phaseLabel)}</strong>
          <span>${uploadState ? (uploadState.tone === "error" ? "Le PDF n'a pas pu être envoyé. Tu peux réessayer." : "Le PDF est en cours d'envoi vers la page publique.") : escapeHtml([row.startTime, status, result?.pdfName].filter(Boolean).join(" - "))}</span>
          ${!blockingUpload && hasFinal ? `<em>${escapeHtml(String(finalistCount))} finaliste${finalistCount > 1 ? "s" : ""} détecté${finalistCount > 1 ? "s" : ""}</em>` : ""}
          ${!blockingUpload && definitiveLabel ? `<small class="result-admin-note result-definitive-note">${escapeHtml(definitiveLabel)}</small>` : ""}
          ${!blockingUpload && hasFinal && !result?.finalistsAnnouncedAt ? `<small class="result-admin-note">PDF et finalistes masqués côté public jusqu'à l'annonce speaker.</small>` : ""}
        </div>
        <div class="result-admin-row-actions">
          ${uploadStateHtml}
          ${blockingUpload ? "" : statusControlHtml}
          ${!blockingUpload && result ? `
            <button class="ghost-button compact" type="button" data-result-reread="${escapeHtml(programKeyValue)}">
              Relire
            </button>
          ` : ""}
          ${!blockingUpload && result ? `
            <button class="ghost-button compact confirm-button" type="button" data-result-import="${escapeHtml(programKeyValue)}">
              Remplacer
            </button>
          ` : ""}
          ${!blockingUpload && result ? `
            <button class="ghost-button compact danger-button" type="button" data-result-delete="${escapeHtml(resultId)}">
              Supprimer
            </button>
          ` : ""}
        </div>
      </div>
    `;
  }

  global.LivePalmesAdminResults = {
    latestResultSession,
    renderResultProgramRowHtml,
    renderResultsAdminPanelHtml,
    renderSessionResultsImportRowHtml,
    resultStatusBadge,
    resultStatusControlHtml,
    resultStatusLabel,
    resultUploadBadgeHtml,
    resultUploadKeyForProgram,
    resultUploadKeyForSessionResults,
    sessionResultsPdfsForSession
  };
})(window);
