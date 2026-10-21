(function (document, global) {
  "use strict";
  const body = document.body;
  const header = document.getElementById("publicSiteHeader");
  if (!header || document.getElementById("livepalmesMobileNavigation")) return;
  const isPortal = body.classList.contains("admin-portal-page");
  const sessionKey = "livepalmes:portal-session-display:v1";
  const contextKey = "livepalmes:mobile-navigation-display:v1";
  const mobile = global.matchMedia("(max-width: 1080px)");
  const navigation = document.createElement("nav");
  navigation.id = "livepalmesMobileNavigation";
  navigation.className = "livepalmes-mobile-navigation";
  navigation.setAttribute("aria-label", "Accès rapides du portail");
  navigation.hidden = true;
  const paths = {
    home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
    entries: "M8 3v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
    public: "M3 12h18M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c5 5 5 13 0 18-5-5-5-13 0-18Z"
  };
  const links = {};
  for (const [key, label, href, accessible] of [
    ["home", "Accueil", "/portail.html#accueil", "Accueil du portail"],
    ["entries", "Engagements", "/portail.html#club-competitions", "Engagements en compétition"],
    ["public", "Site public", "/", "Accueil du site public"]
  ]) {
    const link = document.createElement("a");
    link.href = href;
    link.setAttribute("aria-label", accessible);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", paths[key]);
    svg.append(path);
    const text = document.createElement("span");
    text.textContent = label;
    link.append(svg, text);
    navigation.append(link);
    links[key] = link;
  }
  body.append(navigation);
  // Presentation only: no identity, token, draft or authority is copied to public pages.
  function readContext() {
    try {
      if (global.localStorage.getItem(sessionKey) !== "connected") return null;
      const hint = JSON.parse(global.localStorage.getItem(contextKey) || "null");
      return hint && typeof hint.club === "boolean" && ["#accueil", "#espace-club"].includes(hint.home) ? hint : null;
    } catch (_) { return null; }
  }
  function portalContext() {
    if (body.dataset.adminAuth !== "unlocked") return null;
    // Existing capability-filtered elements are the sole source of shortcut visibility.
    const club = document.querySelector("[data-engagements-club-menu]");
    return { club: Boolean(club && !club.hidden), home: body.dataset.portalHome === "club" ? "#espace-club" : "#accueil" };
  }
  function saveContext(context) {
    try {
      const value = context ? JSON.stringify(context) : null;
      if (value && global.localStorage.getItem(contextKey) !== value) global.localStorage.setItem(contextKey, value);
      else if (!value) global.localStorage.removeItem(contextKey);
    } catch (_) { /* Storage unavailable: the live portal still works. */ }
  }
  function refresh() {
    const context = isPortal ? portalContext() : readContext();
    if (isPortal && ["locked", "unlocked"].includes(body.dataset.adminAuth)) saveContext(context);
    navigation.hidden = !context;
    body.classList.toggle("has-mobile-portal-navigation", Boolean(context));
    links.entries.hidden = !context?.club;
    links.home.href = isPortal ? context?.home || "#accueil" : "/portail.html" + (context?.home || "#accueil");
    links.entries.href = isPortal ? "#club-competitions" : "/portail.html#club-competitions";
    const active = !isPortal ? "public" : global.location.hash === "#club-competitions" ? "entries" : "home";
    for (const [key, link] of Object.entries(links)) {
      if (key === active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    syncConsultationLinks();
  }
  // A same-origin consultation keeps the original portal document alive. Returning
  // focuses that document and changes only its hash, through its existing route guards.
  // External links retain noopener; no draft is serialized or silently saved.
  const contextId = global.crypto?.randomUUID?.() || String(Date.now());
  if (isPortal) global.name = "livepalmes-portal-" + contextId;
  const publicTarget = "livepalmes-public-" + contextId;
  function syncConsultationLinks() {
    if (!isPortal) return;
    const connected = body.dataset.adminAuth === "unlocked";
    for (const link of [links.public, ...header.querySelectorAll(".public-site-brand,.public-site-nav a")]) {
      const enabled = mobile.matches && connected;
      link.target = enabled ? publicTarget : "livepalmes-public";
      link.rel = enabled ? "opener" : "noopener";
    }
    links.public.setAttribute("aria-label", "Accueil du site public (nouvel onglet, dossier conservé)");
  }
  function returnToPortal(event, hash) {
    if (isPortal || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    try {
      const source = global.opener;
      if (!source || source.closed || source.location.origin !== global.location.origin || source.location.pathname !== "/portail.html") return;
      // Do not return to an expired session or infer access from the public display hint.
      if (source.document.body.dataset.adminAuth !== "unlocked") return;
      if (!/^livepalmes-portal-[\w-]+$/.test(source.name)) return;
      // Native named-tab navigation also activates the original tab in browsers
      // which ignore window.focus(). Same-document hash navigation keeps drafts.
      event.currentTarget.href = source.location.pathname + (source.location.search || "") + hash;
      event.currentTarget.target = source.name;
      event.currentTarget.rel = "opener";
    } catch (_) { /* Unrelated/closed tab: normal authenticated portal navigation. */ }
  }
  links.home.addEventListener("click", event => returnToPortal(event, readContext()?.home || "#accueil"));
  links.entries.addEventListener("click", event => returnToPortal(event, "#club-competitions"));
  if (!isPortal) {
    header.querySelector(".public-site-portal")?.addEventListener("click", event => returnToPortal(event, readContext()?.home || "#accueil"));
    header.querySelector(".public-site-account-link")?.addEventListener("click", event => returnToPortal(event, "#mon-compte"));
  }
  // Avoid obscuring fields when a virtual keyboard reduces the visual viewport.
  function updateKeyboard() {
    const field = document.activeElement;
    const editing = field?.matches?.("input,textarea,select,[contenteditable=true]");
    body.classList.toggle("mobile-portal-keyboard", Boolean(editing && global.visualViewport && global.visualViewport.height < global.innerHeight * .75));
  }
  global.visualViewport?.addEventListener("resize", updateKeyboard);
  document.addEventListener("focusin", updateKeyboard);
  document.addEventListener("focusout", () => global.setTimeout(updateKeyboard, 0));
  global.addEventListener("hashchange", refresh);
  global.addEventListener("pageshow", refresh);
  global.addEventListener("storage", event => { if ([sessionKey, contextKey, null].includes(event.key)) refresh(); });
  mobile.addEventListener("change", refresh);
  if (isPortal) {
    new MutationObserver(refresh).observe(body, { attributes: true, attributeFilter: ["data-admin-auth", "data-portal-home"] });
    const club = document.querySelector("[data-engagements-club-menu]");
    if (club) new MutationObserver(refresh).observe(club, { attributes: true, attributeFilter: ["hidden"] });
  }
  refresh();
})(document, window);
