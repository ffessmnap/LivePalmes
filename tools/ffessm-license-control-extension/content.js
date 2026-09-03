(() => {
  "use strict";

  if (window.top !== window || document.getElementById("livepalmes-license-control-launcher")) return;
  const core = window.LivePalmesLicenseControl;
  if (!core) return;

  const IDS = {
    launcher: "livepalmes-license-control-launcher",
    panel: "livepalmes-license-control-panel",
    close: "livepalmes-license-control-close",
    file: "livepalmes-license-control-file",
    input: "livepalmes-license-control-input",
    summary: "livepalmes-license-control-summary",
    delay: "livepalmes-license-control-delay",
    start: "livepalmes-license-control-start",
    retry: "livepalmes-license-control-retry",
    stop: "livepalmes-license-control-stop",
    export: "livepalmes-license-control-export",
    status: "livepalmes-license-control-status",
    results: "livepalmes-license-control-results"
  };

  const state = {
    running: false,
    stopRequested: false,
    batch: null,
    results: []
  };

  const SEARCH_TIMEOUT_MS = 30000;
  const MAX_SEARCH_ATTEMPTS = 3;
  const RETRY_DELAYS_MS = [3000, 6000];
  const MAX_RESULT_PAGES = 20;

  class SearchTimeoutError extends Error {
    constructor(message) {
      super(message);
      this.name = "SearchTimeoutError";
      this.code = "search_timeout";
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isVisible(element) {
    return Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
  }

  function delay(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function waitFor(getValue, timeoutMs = 8000, intervalMs = 100) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        const value = getValue();
        if (value) {
          window.clearInterval(timer);
          resolve(value);
        } else if (Date.now() - startedAt >= timeoutMs) {
          window.clearInterval(timer);
          reject(new Error("Délai dépassé en attendant l’interface fédérale."));
        }
      }, intervalMs);
    });
  }

  function setStatus(message, tone = "") {
    const status = document.getElementById(IDS.status);
    if (!status) return;
    status.textContent = message;
    if (tone) status.dataset.tone = tone;
    else delete status.dataset.tone;
  }

  function setRunning(running) {
    state.running = running;
    const retryable = state.results.some((result) => ["timeout", "erreur"].includes(result.status));
    document.getElementById(IDS.start).disabled = running || !state.batch;
    document.getElementById(IDS.retry).disabled = running || !retryable;
    document.getElementById(IDS.stop).disabled = !running;
    document.getElementById(IDS.export).disabled = running || !state.results.length;
    document.getElementById(IDS.file).disabled = running;
    document.getElementById(IDS.input).disabled = running;
    document.getElementById(IDS.panel).setAttribute("aria-busy", running ? "true" : "false");
  }

  async function getSearchInput() {
    let input = document.querySelector('input[name="licence"]');
    if (isVisible(input)) return input;
    const openLink = document.querySelector('a[title="Rechercher un pratiquant"]');
    if (!openLink) throw new Error("Le menu « Rechercher un pratiquant » est introuvable.");
    openLink.click();
    input = await waitFor(() => {
      const candidate = document.querySelector('input[name="licence"]');
      return isVisible(candidate) ? candidate : null;
    });
    return input;
  }

  function setAngularInputValue(input, value) {
    const inputWindow = input.ownerDocument.defaultView;
    const descriptor = Object.getOwnPropertyDescriptor(inputWindow.HTMLInputElement.prototype, "value");
    descriptor.set.call(input, value);
    input.dispatchEvent(new inputWindow.Event("input", { bubbles: true }));
  }

  function grid() {
    return document.querySelector('kendo-grid[role="grid"], kendo-grid');
  }

  function gridSignature() {
    return grid()?.textContent.replace(/\s+/g, " ").trim() || "";
  }

  function gridLoading() {
    const element = grid();
    return Boolean(element && (
      element.querySelector(".k-loading-mask, .k-i-loading, .k-loader") ||
      element.getAttribute("aria-busy") === "true"
    ));
  }

  async function waitForGridSettled(previousSignature = "", { requireChange = true } = {}) {
    const startedAt = Date.now();
    let stableCount = 0;
    let lastSignature = "";
    let loadingSeen = false;
    while (Date.now() - startedAt < SEARCH_TIMEOUT_MS) {
      await delay(250);
      const loading = gridLoading();
      if (loading) loadingSeen = true;
      const signature = gridSignature();
      const changed = signature !== previousSignature;
      const minimumElapsed = Date.now() - startedAt >= 1200;
      stableCount = signature === lastSignature ? stableCount + 1 : 0;
      lastSignature = signature;
      if (!loading && minimumElapsed && stableCount >= 2 && (!requireChange || loadingSeen || changed)) return;
    }
    throw new SearchTimeoutError(`Ma Commission n’a pas terminé l’opération après ${Math.round(SEARCH_TIMEOUT_MS / 1000)} secondes.`);
  }

  async function triggerSearch(query) {
    const input = await getSearchInput();
    const inputWindow = input.ownerDocument.defaultView;
    const previousSignature = gridSignature();
    input.focus();
    setAngularInputValue(input, query);
    await delay(80);
    input.dispatchEvent(new inputWindow.Event("change", { bubbles: true }));
    input.dispatchEvent(new inputWindow.KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true }));
    input.dispatchEvent(new inputWindow.KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true }));
    input.blur();
    await waitForGridSettled(previousSignature);
  }

  function currentGridRows() {
    return Array.from(document.querySelectorAll("kendo-grid tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent.trim()))
      .filter((cells) => cells.length >= 5 && !/No records available/i.test(cells.join(" ")))
      .map((cells) => ({
        license: cells[0],
        name: cells[1],
        birthDate: cells[2],
        structure: cells[3],
        validity: cells[4]
      }));
  }

  function paginationButton(label) {
    return document.querySelector(`button[aria-label="${label}"]`);
  }

  async function clickPagination(button) {
    if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return false;
    const previousSignature = gridSignature();
    button.click();
    await waitForGridSettled(previousSignature);
    return true;
  }

  async function readAllGridRows() {
    const first = paginationButton("Go to the first page");
    if (first && !first.disabled && first.getAttribute("aria-disabled") !== "true") await clickPagination(first);
    const rows = [];
    for (let page = 0; page < MAX_RESULT_PAGES; page += 1) {
      rows.push(...currentGridRows());
      const next = paginationButton("Go to the next page");
      if (!next || next.disabled || next.getAttribute("aria-disabled") === "true") break;
      if (page === MAX_RESULT_PAGES - 1) throw new Error(`Recherche interrompue au-delà de ${MAX_RESULT_PAGES} pages de résultats.`);
      await clickPagination(next);
    }
    return rows;
  }

  async function searchQueryWithRetries(query, label) {
    for (let attempt = 1; attempt <= MAX_SEARCH_ATTEMPTS; attempt += 1) {
      if (state.stopRequested) throw new Error("Recherche arrêtée.");
      setStatus(`${label} — tentative ${attempt}/${MAX_SEARCH_ATTEMPTS}`, "loading");
      try {
        await triggerSearch(query);
        return await readAllGridRows();
      } catch (error) {
        const timedOut = error?.code === "search_timeout" || error instanceof SearchTimeoutError;
        if (!timedOut || attempt === MAX_SEARCH_ATTEMPTS) throw error;
        const retryDelay = RETRY_DELAYS_MS[attempt - 1] || RETRY_DELAYS_MS.at(-1);
        setStatus(`${label} — délai dépassé, nouvelle tentative dans ${Math.round(retryDelay / 1000)} s…`, "warning");
        await delay(retryDelay);
      }
    }
    return [];
  }

  function decisiveResult(result) {
    return ["validable", "licence_expiree", "anomalie_licence", "ambigu"].includes(result.status);
  }

  async function searchPerson(person, positionLabel) {
    const queries = core.searchQueries(person);
    let federalRows = [];
    for (let index = 0; index < queries.length; index += 1) {
      const query = queries[index];
      const rows = await searchQueryWithRetries(query, `${positionLabel} : ${person.lastName} ${person.firstName}`);
      federalRows.push(...rows);
      const result = core.analyzeCandidates(person, federalRows);
      if (decisiveResult(result)) return result;
      if (index < queries.length - 1) await delay(Math.max(1500, Number(document.getElementById(IDS.delay).value) || 2000));
    }
    return core.analyzeCandidates(person, federalRows);
  }

  async function searchPersonSafely(person, positionLabel) {
    try {
      return await searchPerson(person, positionLabel);
    } catch (error) {
      const timedOut = error?.code === "search_timeout" || error instanceof SearchTimeoutError;
      return {
        ...person,
        status: timedOut ? "timeout" : "erreur",
        details: timedOut ? "La recherche fédérale reste en délai dépassé après trois tentatives." : (error?.message || String(error)),
        candidates: []
      };
    }
  }

  function statusLabel(status) {
    return {
      validable: "Validable",
      licence_expiree: "Licence expirée",
      anomalie_licence: "Licence différente",
      anomalie_identite: "Identité à examiner",
      ambigu: "Ambigu",
      introuvable: "Introuvable",
      timeout: "Délai dépassé",
      erreur: "Erreur"
    }[status] || status;
  }

  function renderResults() {
    const mount = document.getElementById(IDS.results);
    if (!state.results.length) {
      mount.innerHTML = '<p class="livepalmes-license-control-empty">Aucun résultat pour le moment.</p>';
      return;
    }
    mount.innerHTML = `
      <table>
        <thead><tr><th>Nageur</th><th>Licence LP</th><th>Licence FFESSM</th><th>Validité</th><th>État</th></tr></thead>
        <tbody>${state.results.map((result) => {
          const candidate = result.selectedCandidate || (result.candidates?.length === 1 ? result.candidates[0] : null);
          return `<tr>
            <td><strong>${escapeHtml(`${result.lastName} ${result.firstName}`)}</strong><small>${escapeHtml(result.birthDate)}</small></td>
            <td>${escapeHtml(result.currentLicense || "—")}</td>
            <td>${escapeHtml(candidate?.license || (result.candidates?.length ? `${result.candidates.length} candidats` : "—"))}</td>
            <td>${escapeHtml(candidate?.validity || "—")}<small>Requise : ${escapeHtml(result.requiredValidity)}</small></td>
            <td><span class="livepalmes-license-status is-${escapeHtml(result.status)}">${escapeHtml(statusLabel(result.status))}</span><small>${escapeHtml(result.details)}</small></td>
          </tr>`;
        }).join("")}</tbody>
      </table>`;
  }

  function resultCounts() {
    return state.results.reduce((counts, result) => {
      counts[result.status] = (counts[result.status] || 0) + 1;
      return counts;
    }, {});
  }

  function finishStatus(prefix = "Terminé") {
    const counts = resultCounts();
    const validable = counts.validable || 0;
    const retryable = (counts.timeout || 0) + (counts.erreur || 0);
    const anomalies = state.results.length - validable - retryable;
    setStatus(`${prefix} : ${validable} validable${validable > 1 ? "s" : ""}, ${anomalies} anomalie${anomalies > 1 ? "s" : ""}${retryable ? `, ${retryable} à relancer` : ""}.`, retryable ? "warning" : "ok");
  }

  async function runPeople(people, { replace = true } = {}) {
    if (state.running || !people.length) return;
    state.stopRequested = false;
    if (replace) state.results = [];
    renderResults();
    setRunning(true);
    const betweenSearches = Math.max(1500, Number(document.getElementById(IDS.delay).value) || 2000);
    for (let index = 0; index < people.length; index += 1) {
      if (state.stopRequested) break;
      const person = people[index];
      const result = await searchPersonSafely(person, `Recherche ${index + 1}/${people.length}`);
      if (replace) state.results.push(result);
      else {
        const resultIndex = state.results.findIndex((item) => item.livePalmesId === person.livePalmesId);
        if (resultIndex >= 0) state.results[resultIndex] = result;
      }
      renderResults();
      if (index < people.length - 1 && !state.stopRequested) await delay(betweenSearches);
    }
    setRunning(false);
    finishStatus(state.stopRequested ? "Arrêté" : replace ? "Terminé" : "Relance terminée");
  }

  function parseInput() {
    try {
      state.batch = core.parseLivePalmesBatch(document.getElementById(IDS.input).value);
      document.getElementById(IDS.summary).innerHTML = `<strong>Lot ${escapeHtml(state.batch.batchId)}</strong><span>Saison ${escapeHtml(state.batch.season)} · ${state.batch.people.length} nageur${state.batch.people.length > 1 ? "s" : ""} · validité minimale ${escapeHtml(state.batch.requiredValidity)}</span>`;
      setStatus("Fichier prêt. Vérifiez la saison avant de lancer le contrôle.", "ok");
    } catch (error) {
      state.batch = null;
      document.getElementById(IDS.summary).textContent = "";
      setStatus(error?.message || String(error), "error");
    }
    state.results = [];
    renderResults();
    setRunning(false);
  }

  async function loadFile(file) {
    if (!file) return;
    try {
      document.getElementById(IDS.input).value = await file.text();
      parseInput();
    } catch (error) {
      setStatus(`Lecture du fichier impossible : ${error?.message || error}`, "error");
    }
  }

  function exportCsv() {
    if (!state.results.length || !state.batch) return;
    const content = core.exportResultsCsv(state.results);
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `controle-licences-ffessm-${state.batch.season}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function mount() {
    const launcher = document.createElement("button");
    launcher.id = IDS.launcher;
    launcher.type = "button";
    launcher.textContent = "Contrôle licences LivePalmes";
    launcher.setAttribute("aria-controls", IDS.panel);
    launcher.setAttribute("aria-expanded", "false");

    const panel = document.createElement("aside");
    panel.id = IDS.panel;
    panel.hidden = true;
    panel.setAttribute("aria-label", "Contrôle des licences LivePalmes");
    panel.innerHTML = `
      <header><div><strong>Contrôle des licences</strong><span>LivePalmes × Ma Commission</span></div><button id="${IDS.close}" type="button" aria-label="Fermer">×</button></header>
      <div class="livepalmes-license-control-body">
        <p class="livepalmes-license-control-help">Chargez le fichier exporté par LivePalmes. Le module compare identité, numéro et date de validité fédérale sans lire vos identifiants de connexion.</p>
        <label class="livepalmes-license-control-file"><span>Fichier LivePalmes</span><input id="${IDS.file}" type="file" accept=".csv,text/csv"></label>
        <label class="livepalmes-license-control-paste"><span>Ou collez le CSV</span><textarea id="${IDS.input}" rows="6" spellcheck="false" placeholder="lot_id;saison;livepalmes_id;nom;prenom;date_naissance;licence_livepalmes;competitions_sources"></textarea></label>
        <div id="${IDS.summary}" class="livepalmes-license-control-summary" aria-live="polite"></div>
        <div class="livepalmes-license-control-actions">
          <button id="${IDS.start}" type="button" disabled>Lancer le contrôle</button>
          <button id="${IDS.retry}" type="button" class="secondary" disabled>Relancer les erreurs</button>
          <button id="${IDS.stop}" type="button" class="danger" disabled>Arrêter</button>
          <button id="${IDS.export}" type="button" class="secondary" disabled>Exporter pour LivePalmes</button>
          <label>Pause <input id="${IDS.delay}" type="number" min="1500" step="500" value="2000"> ms</label>
        </div>
        <p id="${IDS.status}" class="livepalmes-license-control-status" aria-live="polite">Chargez un fichier LivePalmes pour commencer.</p>
        <div id="${IDS.results}" class="livepalmes-license-control-results"></div>
        <p class="livepalmes-license-control-privacy">Les données restent dans cette page et ne sont exportées que lorsque vous cliquez sur « Exporter pour LivePalmes ».</p>
      </div>`;

    document.body.append(launcher, panel);
    renderResults();
    launcher.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      launcher.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    });
    document.getElementById(IDS.close).addEventListener("click", () => {
      panel.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
      launcher.focus();
    });
    document.getElementById(IDS.file).addEventListener("change", (event) => void loadFile(event.target.files?.[0]));
    document.getElementById(IDS.input).addEventListener("change", parseInput);
    document.getElementById(IDS.start).addEventListener("click", () => void runPeople(state.batch?.people || []));
    document.getElementById(IDS.retry).addEventListener("click", () => {
      const retryIds = new Set(state.results.filter((result) => ["timeout", "erreur"].includes(result.status)).map((result) => result.livePalmesId));
      void runPeople((state.batch?.people || []).filter((person) => retryIds.has(person.livePalmesId)), { replace: false });
    });
    document.getElementById(IDS.stop).addEventListener("click", () => {
      state.stopRequested = true;
      setStatus("Arrêt demandé après l’opération fédérale en cours…", "warning");
    });
    document.getElementById(IDS.export).addEventListener("click", exportCsv);
  }

  mount();
})();
