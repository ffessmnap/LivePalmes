(function initLivePalmesPortalUx(global) {
  "use strict";

  const HOME_LABELS = {
    clubHome: "Espace club",
    performanceHome: "Données sportives",
    engagementsAdminHome: "Organisation des compétitions",
    dtnHome: "Espace DTN",
    nationalHome: "Administration nationale"
  };
  const elements = {
    breadcrumb: document.querySelector("#adminPortalBreadcrumb"),
    navigation: document.querySelector("#adminPortalNavigation")
  };
  let breadcrumbSignature = "";
  let refreshTimer = null;

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

  function renderBreadcrumb() {
    const mount = elements.breadcrumb;
    if (!mount) return;
    const activeView = document.querySelector("[data-admin-view]:not([hidden])")?.dataset.adminView || "";
    const clubIsHome = document.body.dataset.portalHome === "club";
    if (!activeView || activeView === "dashboard" || (clubIsHome && activeView === "clubHome")) {
      mount.hidden = true;
      if (breadcrumbSignature) mount.replaceChildren();
      breadcrumbSignature = "";
      return;
    }
    const activeLink = elements.navigation?.querySelector("a.active,a[aria-current='page']");
    const activeParent = elements.navigation?.querySelector(".admin-portal-nav-parent.active,.admin-portal-nav-parent[aria-current='page']") || activeLink?.closest(".admin-portal-nav-nested")?.querySelector(".admin-portal-nav-parent");
    const parentLabel = activeParent ? cleanLabel(activeParent) : "";
    const currentLabel = activeLink ? cleanLabel(activeLink) : parentLabel || HOME_LABELS[activeView] || document.querySelector(`[data-admin-view="${activeView}"] h2`)?.textContent?.trim() || "";
    const items = [{
      label: clubIsHome ? "Accueil club" : "Vue d’ensemble",
      href: clubIsHome ? "#espace-club" : "#accueil"
    }];
    if (parentLabel && parentLabel !== currentLabel && !(clubIsHome && parentLabel === "Espace club")) {
      items.push({ label: parentLabel, href: `#${activeParent.dataset.adminSpaceHash || "accueil"}` });
    }
    if (currentLabel) items.push({ label: currentLabel });
    const nextSignature = JSON.stringify(items);
    if (nextSignature === breadcrumbSignature) {
      mount.hidden = items.length < 2;
      return;
    }
    breadcrumbSignature = nextSignature;
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

  function refreshEnhancements() {
    global.clearTimeout(refreshTimer);
    refreshTimer = global.setTimeout(() => {
      renderBreadcrumb();
      enhanceResponsiveTables();
      enhanceLoadingStates();
      enhanceTabFocus();
    }, 40);
  }

  global.addEventListener("hashchange", refreshEnhancements);
  document.addEventListener("livepalmes:portal-home-change", refreshEnhancements);
  document.addEventListener("keydown", handleTabKeydown);
  new MutationObserver((mutations) => {
    const generatedOnly = mutations.every((mutation) => mutation.target.closest?.("#adminPortalBreadcrumb"));
    if (!generatedOnly) refreshEnhancements();
  }).observe(document.querySelector("#adminPortalDashboard") || document.body, {
    attributes: true,
    attributeFilter: ["hidden", "class", "aria-current", "aria-selected", "aria-disabled", "data-tone"],
    childList: true,
    subtree: true,
    characterData: true
  });
  refreshEnhancements();
})(window);
