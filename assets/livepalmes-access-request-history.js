(function (global) {
  "use strict";
  const escape = value => String(value || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function dateLabel(value) {
    const date = new Date(value);
    return value && Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }).format(date)
      : "Date non renseignée";
  }
  function card(row) {
    const approved = row.status === "approved";
    const author = row.resolvedByName || row.resolvedByEmail || "Administrateur non renseigné";
    return `<article class="admin-engagements-request-card admin-access-history-card">
      <div class="admin-engagements-request-main"><strong>${escape([row.firstName, row.lastName].filter(Boolean).join(" ") || row.email)}</strong><small>${escape(row.email)}</small></div>
      <div class="admin-engagements-request-scope"><strong>${escape(row.clubName || "Club non renseigné")}</strong><small>${escape(row.regionId)}</small></div>
      <div class="admin-engagements-request-main"><strong>${approved ? "Compte validé" : "Demande refusée"}</strong><small>${escape(dateLabel(row.resolvedAt))} (heure de Paris)</small><small title="${escape(row.resolvedByEmail)}">Par ${escape(author)}</small></div>
      ${!approved && row.resolutionReason ? `<details class="admin-engagements-request-details"><summary>Motif du refus</summary><p>${escape(row.resolutionReason)}</p></details>` : ""}
    </article>`;
  }
  function create({ root, callFunction, canReview, scopeKey, loadPending, closeEditor }) {
    if (!root) return null;
    const find = name => root.querySelector(`[data-access-requests-${name}]`);
    const pending = find("pending"), history = find("history"), list = find("history-list"), status = find("history-status");
    const next = find("next"), refresh = find("refresh"), pendingButton = find("show-pending"), historyButton = find("show-history");
    let rows = [], cursor = null, loadedAt = 0, loading = false, active = false, generation = 0, scope = "";
    function render() {
      list.innerHTML = rows.length ? rows.map(card).join("") : '<p class="admin-engagements-empty">Aucune demande traitée dans ce périmètre.</p>';
      next.hidden = !cursor; next.disabled = loading; refresh.disabled = loading;
    }
    function reset() {
      generation++; rows = []; cursor = null; loadedAt = 0; loading = false; scope = "";
      status.textContent = ""; list.innerHTML = ""; next.hidden = true; refresh.disabled = false;
      active = false; pending.hidden = false; history.hidden = true;
      pendingButton.setAttribute("aria-pressed", "true"); historyButton.setAttribute("aria-pressed", "false");
    }
    async function load({ force = false, more = false } = {}) {
      if (!canReview()) { reset(); return; }
      const key = scopeKey();
      if (scope !== key) { const wasActive = active; reset(); scope = key; if (wasActive) select(true, false); }
      if (loading || (!force && !more && loadedAt && Date.now() - loadedAt < 60000) || (more && !cursor)) return;
      const token = generation;
      loading = true; next.disabled = true; refresh.disabled = true;
      status.textContent = "Chargement de l’historique…"; status.dataset.tone = "loading";
      try {
        const result = await callFunction("listEngagementAccessRequests", { status: "history", ...(more ? { cursor } : {}) });
        if (token !== generation || key !== scopeKey() || !canReview()) return;
        rows = more ? [...rows, ...(result.requests || [])] : result.requests || [];
        cursor = result.nextCursor || null; loadedAt = Date.now();
        render(); status.textContent = `${rows.length} demande${rows.length > 1 ? "s" : ""} traitée${rows.length > 1 ? "s" : ""} affichée${rows.length > 1 ? "s" : ""}${cursor ? " · D’autres traitements sont disponibles." : "."}`;
        status.dataset.tone = "ok";
      } catch (error) {
        if (token !== generation || key !== scopeKey() || !canReview()) return;
        status.textContent = `Historique indisponible : ${error?.message || error}. Vous pouvez réessayer avec Actualiser.`; status.dataset.tone = "error";
      } finally {
        if (token === generation) { loading = false; refresh.disabled = false; next.disabled = false; }
      }
    }
    function select(showHistory, fetch = true) {
      if (!canReview()) { reset(); return; }
      active = showHistory; pending.hidden = showHistory; history.hidden = !showHistory;
      pendingButton.setAttribute("aria-pressed", String(!showHistory)); historyButton.setAttribute("aria-pressed", String(showHistory));
      closeEditor();
      if (fetch) { if (showHistory) load(); else loadPending(); }
    }
    pendingButton.addEventListener("click", () => select(false));
    historyButton.addEventListener("click", () => select(true));
    next.addEventListener("click", () => load({ more: true }));
    refresh.addEventListener("click", () => active ? load({ force: true }) : loadPending({ force: true }));
    return { reset,
      onProfileChange: () => { if (!canReview() || (scope && scope !== scopeKey())) reset(); },
      invalidate: () => { generation++; loadedAt = 0; loading = false; refresh.disabled = false; },
      onOpen: () => { if (!canReview()) reset(); else if (active) load(); }, card };
  }
  global.LivePalmesAccessRequestHistory = { create, card, dateLabel };
  if (typeof module !== "undefined") module.exports = global.LivePalmesAccessRequestHistory;
})(typeof window === "undefined" ? globalThis : window);
