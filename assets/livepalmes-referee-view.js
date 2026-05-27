(function attachLivePalmesRefereeView(global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderDecisionPanelHtml(options = {}) {
    const {
      modalOpen = false,
      selectedName = ""
    } = options;
    return `
      <h3>Décision juge arbitre</h3>
      <p class="panel-subtitle">${selectedName && modalOpen ? `${escapeHtml(selectedName)} sélectionné. La fenêtre de décision est ouverte.` : "Clique sur une ligne de la série pour créer une décision."}</p>
    `;
  }

  function renderActiveDecisionActions(decisions = []) {
    if (!decisions.length) return "";
    return `
      <div class="decision-existing">
        <strong>Décision déjà saisie sur cette ligne</strong>
        ${decisions.map((alert) => `
          <div class="decision-existing-row">
            <span>${escapeHtml(alert.label)}</span>
            <button class="ghost-button compact danger-button" type="button" data-cancel-active-decision="${escapeHtml(alert.id)}">Annuler cette DSQ</button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderDecisionChoices(choices = []) {
    return choices.map((choice) => `
      <button class="decision-choice ${choice.active ? "active" : ""}" type="button" data-decision-type="${escapeHtml(choice.value)}">
        ${escapeHtml(choice.label)}
      </button>
    `).join("");
  }

  function renderRelayLegButtons(from, to, selectedValue) {
    return Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index)
      .map((leg) => `<button class="decision-extra-button ${String(selectedValue) === String(leg) ? "active" : ""}" type="button" data-relay-leg="${leg}">Relayeur ${leg}</button>`)
      .join("");
  }

  function renderLengthSelector(options = {}) {
    const {
      lengthNumber = "1",
      lengthType = "start",
      relay = false
    } = options;
    return `
      <div class="decision-extra">
        <p>${relay ? "Où la coulée du relayeur a-t-elle été constatée ?" : "Où la coulée a-t-elle été constatée ?"}</p>
        <div class="decision-extra-buttons">
          <button class="decision-extra-button ${lengthType === "start" ? "active" : ""}" type="button" data-length-type="start">Au départ</button>
          <button class="decision-extra-button ${lengthType === "length" ? "active" : ""}" type="button" data-length-type="length">Longueur n°</button>
        </div>
        <label class="decision-length-input ${lengthType === "length" ? "" : "muted-field"}">
          Numéro de longueur
          <span class="length-stepper">
            <button class="stepper-button" type="button" data-length-step="-1" ${lengthType === "length" ? "" : "disabled"}>−</button>
            <input id="modalLengthNumber" type="text" inputmode="numeric" pattern="[0-9]*" value="${escapeHtml(lengthNumber || "1")}" ${lengthType === "length" ? "" : "disabled"}>
            <button class="stepper-button" type="button" data-length-step="1" ${lengthType === "length" ? "" : "disabled"}>+</button>
          </span>
        </label>
      </div>
    `;
  }

  function renderDecisionExtra(options = {}) {
    const {
      decisionDraft = {},
      firstLeg = 1,
      legCount = 1,
      relay = false,
      showLengthSelector = false,
      showRelayLeg = false
    } = options;
    if (showRelayLeg) {
      return `
        <div class="decision-extra">
          <p>Quel relayeur est concerné ?</p>
          <div class="decision-extra-buttons">${renderRelayLegButtons(firstLeg, legCount, decisionDraft.relayLeg)}</div>
        </div>
        ${showLengthSelector ? renderLengthSelector({ ...decisionDraft, relay }) : ""}
      `;
    }
    return showLengthSelector ? renderLengthSelector({ ...decisionDraft, relay }) : "";
  }

  function renderDecisionModalHtml(options = {}) {
    const {
      activeDecisions = [],
      choices = [],
      decisionDraft = {},
      entrantName = "",
      firstLeg = 1,
      legCount = 1,
      lineLabel = "-",
      raceInfo = "",
      ready = false,
      relay = false,
      showLengthSelector = false,
      showRelayLeg = false
    } = options;
    return `
      <div class="decision-dialog" role="dialog" aria-modal="true" aria-label="Décision juge arbitre">
        <div class="decision-modal-head">
          <div>
            <span>Décision JA</span>
            <div class="decision-title-line">
              <span class="lane decision-line-pill" title="Ligne ${escapeHtml(String(lineLabel))}">${escapeHtml(String(lineLabel))}</span>
              <h2>${escapeHtml(entrantName)}</h2>
            </div>
            <p class="decision-race-info">${escapeHtml(raceInfo)}</p>
          </div>
          <button class="icon-button decision-close" type="button" data-close-decision aria-label="Fermer">×</button>
        </div>
        ${renderActiveDecisionActions(activeDecisions)}
        <div class="decision-choice-grid">${renderDecisionChoices(choices)}</div>
        ${renderDecisionExtra({ decisionDraft, firstLeg, legCount, relay, showLengthSelector, showRelayLeg })}
        <label class="decision-comment">
          Remarque optionnelle
          <textarea id="modalDecisionComment" placeholder="Précision utile si besoin">${escapeHtml(decisionDraft.comment || "")}</textarea>
        </label>
        <div class="decision-modal-actions">
          <button class="ghost-button" type="button" data-close-decision>Annuler</button>
          <button class="primary-button" type="button" data-submit-decision ${ready ? "" : "disabled"}>Valider la décision</button>
        </div>
      </div>
    `;
  }

  global.LivePalmesRefereeView = {
    renderDecisionModalHtml,
    renderDecisionPanelHtml
  };
})(window);
