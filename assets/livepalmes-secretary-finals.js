(function attachLivePalmesSecretaryFinals(global) {
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
      activeSession = "",
      availableSessions = [],
      hasFinals = false,
      visibleCardsHtml = ""
    } = options;
    return `
      <div class="panel-title">
        <div>
          <h3>Forfaits finales</h3>
          <p class="panel-subtitle">Gestion par le secrétariat après annonce officielle des finalistes.</p>
        </div>
        <div class="results-admin-actions">
          ${availableSessions.length ? `
            <label class="results-session-select">
              <span>Session</span>
              <select id="secretaryFinalsSessionSelect" aria-label="Session des finales">
                ${availableSessions.length > 1 ? `<option value="all" ${activeSession === "all" ? "selected" : ""}>Toutes</option>` : ""}
                ${availableSessions.map((session) => `
                  <option value="${escapeHtml(session)}" ${activeSession === session ? "selected" : ""}>S${escapeHtml(session)}</option>
                `).join("")}
              </select>
            </label>
          ` : ""}
          <a class="ghost-button compact" href="resultats.html?v=20260519-public-offline-footer" target="_blank" rel="noopener">Page publique</a>
        </div>
      </div>
      <div class="secretary-finals-list">
        ${visibleCardsHtml || `<p class="panel-subtitle">${hasFinals ? "Aucune finale pour cette session." : "Aucune finale publiée pour le moment."}</p>`}
      </div>
    `;
  }

  function renderFinalCardHtml(options = {}) {
    const {
      announced = false,
      eventLabel = "",
      finalistCount = 0,
      resultId = "",
      session = "",
      sexLabel = "",
      startTime = "",
      withdrawals = 0
    } = options;
    const details = [session ? `S${session}` : "", startTime, announced ? "Forfaits ouverts par nageur" : "En attente annonce speaker"].filter(Boolean).join(" - ");
    return `
      <article class="secretary-final-card ${announced ? "" : "pending"}">
        <div>
          <strong>${escapeHtml(eventLabel)} ${escapeHtml(sexLabel)}</strong>
          <span>${escapeHtml(details)}</span>
          <em>${escapeHtml(String(finalistCount))} finaliste${finalistCount > 1 ? "s" : ""}${withdrawals ? ` - ${withdrawals} forfait${withdrawals > 1 ? "s" : ""}` : ""}</em>
        </div>
        <button class="ghost-button compact confirm-button" type="button" data-final-withdrawals="${escapeHtml(resultId)}" ${announced ? "" : "disabled"}>
          Gérer forfaits
        </button>
      </article>
    `;
  }

  function renderWithdrawalGroupHtml(title, rows = []) {
    if (!rows.length) return "";
    return `
      <div class="final-withdrawal-group">
        <strong>${escapeHtml(title)}</strong>
        <ol>
          ${rows.map((row) => `
            <li value="${escapeHtml(row.rank || "")}" class="${escapeHtml(row.className || "")}">
              <div>
                <span>${escapeHtml(row.label || "")}</span>
                <small>${escapeHtml(row.status || "")}</small>
                ${row.repechaged ? `<small class="repechage-label">Repêché${row.sex === "F" ? "e" : ""}</small>` : ""}
              </div>
              ${row.withdrawn ? `
                <button class="ghost-button compact confirm-button" type="button" data-final-reinstate="${escapeHtml(row.resultId)}" data-final-key="${escapeHtml(row.finalKey)}" data-final-index="${escapeHtml(String(row.index))}" data-final-row-key="${escapeHtml(row.rowKey)}">
                  Réintégrer
                </button>
              ` : `
                <button class="ghost-button compact danger-button" type="button" data-final-withdraw="${escapeHtml(row.resultId)}" data-final-key="${escapeHtml(row.finalKey)}" data-final-index="${escapeHtml(String(row.index))}" data-final-row-key="${escapeHtml(row.rowKey)}" data-final-expired="${row.expired ? "1" : "0"}" ${row.actionDisabled ? "disabled" : ""}>
                  Forfait
                </button>
              `}
            </li>
          `).join("")}
        </ol>
      </div>
    `;
  }

  function renderUnqualifiedGroupHtml(options = {}) {
    const {
      actions = true,
      open = false,
      rows = []
    } = options;
    if (!rows.length) return "";
    return `
      <details class="final-withdrawal-group final-unqualified-group" ${open ? "open" : ""}>
        <summary>Non qualifiés suivants (${escapeHtml(String(rows.length))})</summary>
        <ol>
          ${rows.map((row) => `
            <li value="${escapeHtml(row.rank || "")}" class="closed ${row.preWithdrawal ? "prewithdrawn" : ""}">
              <div>
                <span>${escapeHtml(row.label || "")}</span>
                <small>${escapeHtml(row.status || "")}</small>
              </div>
              ${actions && row.actionAllowed ? `
                <button class="ghost-button compact ${row.preWithdrawal ? "confirm-button" : ""}" type="button" data-final-prewithdraw="${escapeHtml(row.resultId)}" data-final-row-key="${escapeHtml(row.rowKey)}">
                  ${row.preWithdrawal ? "Annuler pré-forfait" : "Pré-forfait si repêché"}
                </button>
              ` : ""}
            </li>
          `).join("")}
        </ol>
      </details>
    `;
  }

  function renderCompositionListHtml(options = {}) {
    return `
      <div class="final-withdrawal-list">
        ${options.finalAHtml || ""}
        ${options.finalBHtml || ""}
        ${options.unqualifiedHtml || ""}
      </div>
    `;
  }

  global.LivePalmesSecretaryFinals = {
    renderCompositionListHtml,
    renderFinalCardHtml,
    renderPanelHtml,
    renderUnqualifiedGroupHtml,
    renderWithdrawalGroupHtml
  };
})(window);
