(function initLivePalmesPortalUx(global) {
  "use strict";

  const FAVORITES_KEY = "livepalmes.portal.favorites.v1";
  const RECENTS_KEY = "livepalmes.portal.recents.v1";
  const MAX_RECENTS = 5;
  const HOME_LABELS = {
    clubHome: "Espace club",
    performanceHome: "Données sportives",
    engagementsAdminHome: "Organisation des compétitions",
    dtnHome: "Espace DTN",
    nationalHome: "Administration nationale"
  };
  const elements = {
    body: document.body,
    navigation: document.querySelector("#adminPortalNavigation"),
    breadcrumb: document.querySelector("#adminPortalBreadcrumb"),
    searchButton: document.querySelector("#adminPortalSearchButton"),
    searchDialog: document.querySelector("#adminPortalSearchDialog"),
    searchInput: document.querySelector("#adminPortalSearchInput"),
    searchResults: document.querySelector("#adminPortalSearchResults"),
    searchHint: document.querySelector("#adminPortalSearchHint"),
    quickAccess: document.querySelector("#adminPortalQuickAccess"),
    favorites: document.querySelector("#adminPortalFavorites"),
    recents: document.querySelector("#adminPortalRecents"),
    clearRecents: document.querySelector("#adminPortalQuickAccessClear")
  };
  let favorites = readStoredList(FAVORITES_KEY);
  let recents = readStoredList(RECENTS_KEY);
  let previousFocus = null;
  let refreshTimer = null;

  function readStoredList(key) {
    try {
      const value = JSON.parse(global.localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
    } catch {
      return [];
    }
  }

  function writeStoredList(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Le portail reste utilisable lorsque le stockage local est indisponible.
    }
  }

  function normalizedText(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function cleanLabel(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll(".admin-portal-nav-icon,.admin-portal-nav-badge,[aria-hidden='true']").forEach((item) => item.remove());
    return clone.textContent.replace(/\s+/g, " ").trim();
  }

  function isAvailable(element) {
    if (!element || element.closest("[hidden]")) return false;
    const style = global.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function isNavigationAvailable(element) {
    if (!element || element.hidden) return false;
    let ancestor = element.parentElement;
    while (ancestor && ancestor !== elements.navigation) {
      if (ancestor.hidden && !ancestor.classList.contains("admin-portal-nav-submenu")) return false;
      ancestor = ancestor.parentElement;
    }
    return true;
  }

  function entryKey(element) {
    const parts = [
      element.getAttribute("href") || `#${element.dataset.adminSpaceHash || ""}`,
      element.dataset.engagementsNavEntry || "",
      element.dataset.engagementsNationalTarget || "",
      element.dataset.dtnGridLink || ""
    ];
    return parts.join("|");
  }

  function navigationEntries() {
    if (!elements.navigation) return [];
    const candidates = [
      ...elements.navigation.querySelectorAll("a[href^='#'][data-admin-view-link]"),
      ...elements.navigation.querySelectorAll("a[href]:not([href^='#'])[data-capability-nav]"),
      ...elements.navigation.querySelectorAll("button[data-admin-space-hash]")
    ];
    const seen = new Set();
    return candidates.filter(isNavigationAvailable).map((element) => {
      const key = entryKey(element);
      if (seen.has(key)) return null;
      seen.add(key);
      const group = element.closest(".admin-portal-nav-group")?.querySelector(":scope > h2")?.textContent?.trim() || "Portail";
      return {
        key,
        label: cleanLabel(element),
        group,
        element,
        type: "Outil"
      };
    }).filter(Boolean);
  }

  function loadedCompetitionEntries() {
    return [...document.querySelectorAll(".admin-engagements-competition")].filter(isAvailable).map((card) => {
      const action = card.querySelector("[data-engagement-competition-id]");
      const name = card.querySelector("strong")?.textContent?.trim();
      if (!action || !name) return null;
      return {
        key: `competition|${action.dataset.engagementCompetitionId || name}`,
        label: name,
        group: card.querySelector("small")?.textContent?.trim() || "Compétitions",
        element: action,
        type: "Compétition chargée",
        transient: true
      };
    }).filter(Boolean);
  }

  function entriesByKey() {
    return new Map(navigationEntries().map((entry) => [entry.key, entry]));
  }

  function activateEntry(entry, { remember = true } = {}) {
    if (!entry?.element) return;
    if (remember && !entry.transient) rememberRecent(entry.key);
    closeSearch();
    entry.element.click();
  }

  function rememberRecent(key) {
    recents = [key, ...recents.filter((item) => item !== key)].slice(0, MAX_RECENTS);
    writeStoredList(RECENTS_KEY, recents);
    renderQuickAccess();
  }

  function toggleFavorite(key) {
    favorites = favorites.includes(key)
      ? favorites.filter((item) => item !== key)
      : [key, ...favorites];
    writeStoredList(FAVORITES_KEY, favorites);
    renderSearchResults();
    renderQuickAccess();
  }

  function createQuickButton(entry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "admin-portal-quick-item";
    const label = document.createElement("span");
    label.textContent = entry.label;
    const group = document.createElement("small");
    group.textContent = entry.group;
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    button.append(label, group, arrow);
    button.addEventListener("click", () => activateEntry(entry));
    return button;
  }

  function renderQuickList(mount, title, keys, availableEntries) {
    if (!mount) return 0;
    mount.replaceChildren();
    const entries = keys.map((key) => availableEntries.get(key)).filter(Boolean);
    if (!entries.length) return 0;
    const heading = document.createElement("strong");
    heading.className = "admin-portal-quick-label";
    heading.textContent = title;
    mount.append(heading, ...entries.map(createQuickButton));
    return entries.length;
  }

  function renderQuickAccess() {
    if (!elements.quickAccess) return;
    const availableEntries = entriesByKey();
    const favoriteCount = renderQuickList(elements.favorites, "Favoris", favorites, availableEntries);
    const recentCount = renderQuickList(elements.recents, "Récents", recents, availableEntries);
    elements.quickAccess.hidden = favoriteCount + recentCount === 0;
    if (elements.clearRecents) elements.clearRecents.hidden = recentCount === 0;
  }

  function renderBreadcrumb() {
    const mount = elements.breadcrumb;
    if (!mount) return;
    const activeView = document.querySelector("[data-admin-view]:not([hidden])")?.dataset.adminView || "";
    if (!activeView || activeView === "dashboard") {
      mount.hidden = true;
      mount.replaceChildren();
      return;
    }
    const activeLink = elements.navigation?.querySelector("a.active,a[aria-current='page']");
    const activeParent = elements.navigation?.querySelector(".admin-portal-nav-parent.active,.admin-portal-nav-parent[aria-current='page']") || activeLink?.closest(".admin-portal-nav-nested")?.querySelector(".admin-portal-nav-parent");
    const parentLabel = activeParent ? cleanLabel(activeParent) : "";
    const currentLabel = activeLink ? cleanLabel(activeLink) : parentLabel || HOME_LABELS[activeView] || document.querySelector(`[data-admin-view="${activeView}"] h2`)?.textContent?.trim() || "";
    const items = [{ label: "Vue d’ensemble", href: "#accueil" }];
    if (parentLabel && parentLabel !== currentLabel) {
      items.push({ label: parentLabel, href: `#${activeParent.dataset.adminSpaceHash || "accueil"}` });
    }
    if (currentLabel) items.push({ label: currentLabel });
    mount.replaceChildren();
    items.forEach((item, index) => {
      if (index) {
        const separator = document.createElement("span");
        separator.className = "admin-portal-breadcrumb-separator";
        separator.setAttribute("aria-hidden", "true");
        separator.textContent = "›";
        mount.append(separator);
      }
      if (item.href) {
        const link = document.createElement("a");
        link.href = item.href;
        link.textContent = item.label;
        mount.append(link);
      } else {
        const current = document.createElement("span");
        current.setAttribute("aria-current", "page");
        current.textContent = item.label;
        mount.append(current);
      }
    });
    mount.hidden = items.length < 2;
  }

  function searchEntries() {
    const query = normalizedText(elements.searchInput?.value || "");
    const entries = [...navigationEntries(), ...loadedCompetitionEntries()];
    if (!query) return entries.slice(0, 12);
    const terms = query.split(" ").filter(Boolean);
    return entries.filter((entry) => {
      const haystack = normalizedText(`${entry.label} ${entry.group} ${entry.type}`);
      return terms.every((term) => haystack.includes(term));
    }).slice(0, 20);
  }

  function renderSearchResults() {
    const mount = elements.searchResults;
    if (!mount) return;
    const results = searchEntries();
    mount.replaceChildren();
    if (!results.length) {
      const empty = document.createElement("p");
      empty.className = "admin-portal-search-empty";
      empty.textContent = "Aucun outil ou élément déjà chargé ne correspond à cette recherche.";
      mount.append(empty);
      return;
    }
    results.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "admin-portal-search-result";
      row.setAttribute("role", "option");
      const action = document.createElement("button");
      action.type = "button";
      action.className = "admin-portal-search-result-action";
      const label = document.createElement("span");
      label.textContent = entry.label;
      const context = document.createElement("small");
      context.textContent = `${entry.type} · ${entry.group}`;
      action.append(label, context);
      action.addEventListener("click", () => activateEntry(entry));
      row.append(action);
      if (!entry.transient) {
        const favorite = document.createElement("button");
        favorite.type = "button";
        favorite.className = "admin-portal-search-favorite";
        const selected = favorites.includes(entry.key);
        favorite.setAttribute("aria-pressed", selected ? "true" : "false");
        favorite.setAttribute("aria-label", selected ? `Retirer ${entry.label} des favoris` : `Ajouter ${entry.label} aux favoris`);
        favorite.title = selected ? "Retirer des favoris" : "Ajouter aux favoris";
        favorite.textContent = selected ? "★" : "☆";
        favorite.addEventListener("click", () => toggleFavorite(entry.key));
        row.append(favorite);
      }
      mount.append(row);
    });
  }

  function openSearch() {
    if (!elements.searchDialog || elements.body.dataset.adminAuth !== "unlocked") return;
    previousFocus = document.activeElement;
    elements.searchDialog.hidden = false;
    elements.body.classList.add("admin-portal-search-open");
    if (elements.searchInput) elements.searchInput.value = "";
    renderSearchResults();
    global.requestAnimationFrame(() => elements.searchInput?.focus());
  }

  function closeSearch() {
    if (!elements.searchDialog || elements.searchDialog.hidden) return;
    elements.searchDialog.hidden = true;
    elements.body.classList.remove("admin-portal-search-open");
    previousFocus?.focus?.();
  }

  function enhanceResponsiveTables() {
    document.querySelectorAll(".admin-dtn-results-table,.admin-engagements-national-table").forEach((table) => {
      table.classList.add("admin-portal-responsive-table");
      const labels = [...table.querySelectorAll("thead th")].map((cell) => cell.textContent.trim());
      table.querySelectorAll("tbody tr").forEach((row) => {
        [...row.children].forEach((cell, index) => {
          if (cell.tagName === "TD" && labels[index]) cell.dataset.label = labels[index];
        });
      });
    });
  }

  function enhanceLoadingStates() {
    document.querySelectorAll("[aria-live]").forEach((status) => {
      const text = normalizedText(status.textContent);
      status.classList.toggle("is-loading", /chargement|recherche en cours|mise a jour en cours|recalcul/.test(text));
    });
  }

  function refreshEnhancements() {
    global.clearTimeout(refreshTimer);
    refreshTimer = global.setTimeout(() => {
      renderBreadcrumb();
      renderQuickAccess();
      enhanceResponsiveTables();
      enhanceLoadingStates();
      if (!elements.searchDialog?.hidden) renderSearchResults();
    }, 40);
  }

  elements.searchButton?.addEventListener("click", openSearch);
  elements.searchInput?.addEventListener("input", renderSearchResults);
  elements.searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      elements.searchResults?.querySelector("button")?.focus();
    }
  });
  elements.searchDialog?.addEventListener("click", (event) => {
    if (event.target.closest("[data-portal-search-close]")) closeSearch();
  });
  elements.clearRecents?.addEventListener("click", () => {
    recents = [];
    writeStoredList(RECENTS_KEY, recents);
    renderQuickAccess();
  });
  elements.navigation?.addEventListener("click", (event) => {
    const target = event.target.closest("a[data-admin-view-link],a[data-capability-nav],button[data-admin-space-hash]");
    if (!target || !isNavigationAvailable(target)) return;
    rememberRecent(entryKey(target));
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && elements.searchDialog && !elements.searchDialog.hidden) {
      const focusable = [...elements.searchDialog.querySelectorAll("button:not([disabled]),input:not([disabled])")].filter(isAvailable);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
      return;
    }
    if (event.key === "/" && !/input|textarea|select/i.test(document.activeElement?.tagName || "")) {
      event.preventDefault();
      openSearch();
      return;
    }
    if (event.key === "Escape") closeSearch();
  });

  global.addEventListener("hashchange", refreshEnhancements);
  new MutationObserver((mutations) => {
    const generatedOnly = mutations.every((mutation) => mutation.target.closest?.("#adminPortalBreadcrumb,#adminPortalQuickAccess"));
    if (!generatedOnly) refreshEnhancements();
  }).observe(document.querySelector("#adminPortalDashboard") || document.body, {
    attributes: true,
    attributeFilter: ["hidden", "class", "aria-current", "aria-selected", "data-tone"],
    childList: true,
    subtree: true,
    characterData: true
  });
  refreshEnhancements();
})(window);
