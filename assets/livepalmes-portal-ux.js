(function initLivePalmesPortalUx(global) {
  "use strict";

  const longOperationControllers = new WeakMap();
  let refreshTimer = null;

  function formatLongOperationElapsed(milliseconds) {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function createLongOperation(options = {}) {
    const panel = typeof options.element === "string" ? document.querySelector(options.element) : options.element;
    if (!panel) return null;
    if (longOperationControllers.has(panel)) return longOperationControllers.get(panel);
    panel.classList.add("admin-long-operation");
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");
    panel.setAttribute("aria-atomic", "true");
    const icon = document.createElement("span");
    icon.className = "admin-long-operation-icon";
    icon.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    copy.className = "admin-long-operation-copy";
    const title = document.createElement("strong");
    const detail = document.createElement("p");
    copy.append(title, detail);
    const elapsed = document.createElement("span");
    elapsed.className = "admin-long-operation-elapsed";
    elapsed.setAttribute("aria-hidden", "true");
    const bar = document.createElement("span");
    bar.className = "admin-long-operation-bar";
    bar.setAttribute("aria-hidden", "true");
    bar.append(document.createElement("span"));
    panel.replaceChildren(icon, copy, elapsed, bar);
    let timer = null;
    let startedAt = 0;
    const busyTargets = (Array.isArray(options.busyTargets) ? options.busyTargets : [options.busyTargets]).filter(Boolean);

    function updateElapsed() {
      if (!startedAt) return;
      elapsed.textContent = `Temps écoulé ${formatLongOperationElapsed(Date.now() - startedAt)}`;
    }

    function setBusy(busy) {
      busyTargets.forEach((target) => target.setAttribute("aria-busy", busy ? "true" : "false"));
    }

    function stopTimer() {
      if (timer) global.clearInterval(timer);
      timer = null;
    }

    const controller = {
      start(content = {}) {
        stopTimer();
        panel.hidden = false;
        panel.dataset.state = "loading";
        title.textContent = content.title || "Opération en cours...";
        detail.textContent = content.detail || "Cette opération peut prendre quelques instants.";
        startedAt = Date.now();
        updateElapsed();
        timer = global.setInterval(updateElapsed, 1000);
        setBusy(true);
      },
      update(content = {}) {
        if (content.title) title.textContent = content.title;
        if (content.detail) detail.textContent = content.detail;
      },
      finish(content = {}) {
        stopTimer();
        panel.hidden = false;
        panel.dataset.state = content.state || "success";
        title.textContent = content.title || (content.state === "error" ? "Opération impossible" : "Opération terminée");
        detail.textContent = content.detail || "";
        updateElapsed();
        startedAt = 0;
        setBusy(false);
      },
      hide() {
        stopTimer();
        startedAt = 0;
        panel.hidden = true;
        setBusy(false);
      },
      panel
    };
    longOperationControllers.set(panel, controller);
    return controller;
  }

  function normalizedText(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  // Present existing cards in place: delegated decisions and unsaved comments
  // keep their original nodes. This enhancement never requests or writes data.
  const nationalRequests = { selected: "", filter: "all", signature: "" };
  function enhanceNationalRequests() {
    const panel = document.querySelector('.admin-national-requests-page');
    if (!panel || panel.closest('[hidden]')) return;
    const groups = [...panel.querySelectorAll('.admin-national-request-group')];
    const cards = groups.flatMap((group, groupIndex) => [...group.querySelectorAll('article')].map(card => ({
      card, group, groupIndex,
      key: groupIndex + ':' + (card.dataset.engagementSwimmerChangeRequest || card.dataset.engagementDeletionRequestId || card.dataset.accessDeletionRequestId),
      name: card.querySelector('strong')?.textContent.trim() || 'Demande',
      meta: card.querySelector('.admin-engagements-request-main small,.admin-engagements-swimmer-change-request-head span')?.textContent.trim() || '',
      type: ['Identité, doublon ou NS', 'Suppression de données', 'Suppression de compte'][groupIndex]
    })));
    const filtered = cards.filter(item => nationalRequests.filter === 'all' || String(item.groupIndex) === nationalRequests.filter);
    if (!filtered.some(item => item.key === nationalRequests.selected)) nationalRequests.selected = filtered[0]?.key || '';
    const selected = filtered.find(item => item.key === nationalRequests.selected);
    let browser = panel.querySelector('.admin-national-request-browser');
    if (!browser) {
      nationalRequests.signature = '';
      browser = document.createElement('nav');
      browser.className = 'admin-national-request-browser';
      browser.setAttribute('aria-label', 'Demandes nationales en attente');
      panel.prepend(browser);
      browser.addEventListener('click', event => {
        const button = event.target.closest('[data-request-filter],[data-request-select]');
        if (!button) return;
        if (button.dataset.requestFilter) { nationalRequests.filter = button.dataset.requestFilter; panel.dataset.requestDetail = 'false'; }
        else { nationalRequests.selected = button.dataset.requestSelect; panel.dataset.requestDetail = 'true'; }
        enhanceNationalRequests();
        const focus = button.dataset.requestSelect ? panel.querySelector('[data-request-active="true"] .admin-national-request-back')
          : browser.querySelector('[data-request-filter][aria-pressed="true"]');
        if (focus?.getClientRects().length) focus.focus();
      });
    }
    panel.dataset.requestLayout = 'split';
    const signature = JSON.stringify([cards.map(({key, name, meta}) => [key, name, meta]), nationalRequests.filter, nationalRequests.selected]);
    if (signature !== nationalRequests.signature) {
      nationalRequests.signature = signature;
      browser.replaceChildren();
      const filters = document.createElement('div'); filters.className = 'admin-national-request-filters';
      for (const [key,label] of [['all','Toutes'],['0','Identités et NS'],['1','Données'],['2','Comptes']]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'ghost-button';
        button.dataset.requestFilter = key; button.setAttribute('aria-pressed', String(nationalRequests.filter === key));
        button.textContent = label + ' · ' + cards.filter(item => key === 'all' || String(item.groupIndex) === key).length;
        filters.append(button);
      }
      browser.append(filters);
      for (const item of filtered) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'admin-national-request-choice';
        button.dataset.requestSelect = item.key; button.setAttribute('aria-pressed', String(item.key === nationalRequests.selected));
        const type = document.createElement('small'); type.textContent = item.type;
        const name = document.createElement('strong'); name.textContent = item.name;
        const meta = document.createElement('span'); meta.textContent = item.meta;
        button.append(type, name, meta); browser.append(button);
      }
      if (!filtered.length && cards.length) { const empty = document.createElement('p'); empty.textContent = 'Aucune demande dans cette rubrique.'; browser.append(empty); }
    }
    for (const group of groups) {
      const active = group === selected?.group;
      // Empty/error/loading groups stay visible below the detail, preserving
      // their existing status and recovery messages.
      const hasCards = group.querySelector('article');
      const value = !hasCards || active ? 'true' : 'false';
      if (group.dataset.requestActive !== value) group.dataset.requestActive = value;
      if (active && !group.open) group.open = true;
    }
    for (const item of cards) {
      const hidden = item.key !== nationalRequests.selected;
      if (item.card.hidden !== hidden) item.card.hidden = hidden;
      if (!item.card.querySelector('.admin-national-request-back')) {
        const back = document.createElement('button'); back.type = 'button'; back.className = 'ghost-button admin-national-request-back';
        back.textContent = '← Demandes';
        back.onclick = () => { panel.dataset.requestDetail = 'false'; browser.querySelector('[data-request-select][aria-pressed="true"]')?.focus(); };
        item.card.prepend(back);
      }
    }
  }

  function enhanceResponsiveTables() {
    document.querySelectorAll(".admin-dtn-results-table:not(.admin-dtn-listing-table),.admin-engagements-national-table").forEach((table) => {
      table.classList.add("admin-portal-responsive-table");
      const labels = [...table.querySelectorAll("thead th")].map((cell) => cell.textContent.trim());
      table.querySelectorAll("tbody tr").forEach((row) => {
        [...row.children].forEach((cell, index) => {
          if (cell.tagName === "TD" && labels[index]) cell.dataset.label = labels[index];
        });
      });
    });
    document.querySelectorAll(".admin-dtn-listing-table").forEach((table) => table.classList.remove("admin-portal-responsive-table"));
  }

  function enhanceLoadingStates() {
    document.querySelectorAll("[aria-live]").forEach((status) => {
      if (status.matches("[data-swimmer-ns-status],#adminEngagementsSwimmerCorrectionMessage")) {
        // Le dialogue pilote explicitement l'envoi, sans dépendre de son libellé.
        status.classList.toggle("is-loading", status.dataset.tone === "loading");
        return;
      }
      if (status.closest("#adminEngagementsDetail")) {
        // Le dossier pilote ses attentes explicitement, jamais par ses libellés.
        const saving = document.querySelector("#adminEngagementsSaveState")?.dataset.state === "saving";
        status.classList.toggle("is-loading", status.dataset.tone === "loading" && !saving);
        return;
      }
      const loadingSource = status.matches("#adminDtnGrid")
        ? status.querySelector(".admin-dtn-summary-loading,.admin-record-module-status")
        : status;
      const text = normalizedText(loadingSource?.textContent || "");
      status.classList.toggle("is-loading", /chargement|recherche en cours|mise a jour en cours|recalcul/.test(text));
    });
  }

  function visibleTabs(tablist) {
    return Array.from(tablist?.querySelectorAll?.('[role="tab"]') || []).filter((tab) => {
      return !tab.hidden && !tab.closest("[hidden]") && tab.getAttribute("aria-disabled") !== "true";
    });
  }

  function enhanceTabFocus() {
    document.querySelectorAll('[role="tablist"]').forEach((tablist) => {
      const tabs = visibleTabs(tablist);
      if (!tabs.length) return;
      const selected = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0];
      tabs.forEach((tab) => {
        tab.tabIndex = tab === selected ? 0 : -1;
      });
    });
  }

  function handleTabKeydown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const current = event.target.closest?.('[role="tab"]');
    const tablist = current?.closest?.('[role="tablist"]');
    if (!current || !tablist) return;
    const tabs = visibleTabs(tablist);
    const currentIndex = tabs.indexOf(current);
    if (currentIndex < 0 || tabs.length < 2) return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : event.key === "ArrowRight"
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    next.focus();
    next.click();
    global.requestAnimationFrame(() => {
      const active = tablist.querySelector('[role="tab"][aria-selected="true"]');
      if (active && !active.hidden && !active.closest("[hidden]")) active.focus();
    });
  }

  // Fit the sidebar below its actual top edge, including the TEST banner.
  function fitSidebarToViewport() {
    const sidebar = document.querySelector(".admin-portal-sidebar");
    if (!sidebar || !sidebar.getClientRects().length) return;
    const top = `${Math.max(0, Math.ceil(sidebar.getBoundingClientRect().top))}px`;
    if (sidebar.style.getPropertyValue("--portal-sidebar-top") !== top) {
      sidebar.style.setProperty("--portal-sidebar-top", top);
    }
  }

  let sidebarFrame = 0;
  function scheduleSidebarFit() {
    if (sidebarFrame) return;
    sidebarFrame = global.requestAnimationFrame(() => {
      sidebarFrame = 0;
      fitSidebarToViewport();
    });
  }

  global.addEventListener("resize", scheduleSidebarFit);
  global.addEventListener("scroll", scheduleSidebarFit, { passive: true });
  if (global.ResizeObserver) {
    const sidebarObserver = new global.ResizeObserver(scheduleSidebarFit);
    const topbar = document.querySelector(".admin-portal-topbar");
    if (topbar) sidebarObserver.observe(topbar);
  }

  function refreshEnhancements() {
    global.clearTimeout(refreshTimer);
    refreshTimer = global.setTimeout(() => {
      fitSidebarToViewport();
      enhanceNationalRequests();
      enhanceResponsiveTables();
      enhanceLoadingStates();
      enhanceTabFocus();
    }, 40);
  }

  global.addEventListener("hashchange", refreshEnhancements);
  document.addEventListener("livepalmes:portal-home-change", refreshEnhancements);
  document.addEventListener("keydown", handleTabKeydown);
  new MutationObserver((mutations) => {
    refreshEnhancements();
  }).observe(document.querySelector("#adminPortalDashboard") || document.body, {
    attributes: true,
    attributeFilter: ["hidden", "class", "aria-current", "aria-selected", "aria-disabled", "data-tone", "data-detail-open"],
    childList: true,
    subtree: true,
    characterData: true
  });
  global.LivePalmesLongOperation = { create: createLongOperation };
  refreshEnhancements();
})(window);
