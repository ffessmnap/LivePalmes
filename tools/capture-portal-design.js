const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "tmp", "portal-design-captures");
const views = [
  { name: "login", hash: "accueil", selector: "#adminPortalLoginPanel", authenticated: false },
  { name: "overview", hash: "accueil", selector: "#adminOverviewView", authenticated: true },
  { name: "overview-expanded", hash: "accueil", selector: "#adminOverviewView", authenticated: true, overviewSpace: "national" },
  { name: "club-home", hash: "espace-club", selector: "#adminClubHomeView", authenticated: true, menu: "club", clubOnly: true },
  { name: "account", hash: "mon-compte", selector: "#adminAccountView", authenticated: true },
  { name: "performance-home", hash: "gestion-performances", selector: "#adminPerformanceHomeView", authenticated: true, menu: "performance" },
  { name: "records", hash: "records-mpf", selector: "#adminRecordsView", authenticated: true, menu: "performance" },
  { name: "engagements", hash: "club-competitions", selector: "#adminEngagementsView", authenticated: true },
  { name: "club-swimmers", hash: "club-nageurs", selector: "#adminEngagementsView", authenticated: true, menu: "club", swimmersFixture: true },
  { name: "competition-home", hash: "organisation-competitions", selector: "#adminCompetitionHomeView", authenticated: true, menu: "engagements" },
  { name: "dtn-home", hash: "espace-dtn", selector: "#adminDtnHomeView", authenticated: true, menu: "dtn" },
  { name: "dtn", hash: "espace-dtn-france", selector: "#adminDtnView", authenticated: true, menu: "dtn" },
  { name: "national-home", hash: "administration-nationale", selector: "#adminNationalHomeView", authenticated: true, menu: "national" },
  { name: "access", hash: "gestion-acces", selector: "#adminAccessView", authenticated: true }
];
const viewports = [
  { name: "wide", width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false },
  { name: "desktop", width: 1280, height: 720, deviceScaleFactor: 1, mobile: false },
  { name: "tablet", width: 1024, height: 768, deviceScaleFactor: 1, mobile: false },
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 1, mobile: true }
];

function mimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8"
  }[extension] || "application/octet-stream";
}

function startStaticServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const cleanPath = decodeURIComponent(url.pathname === "/" ? "/portail.html" : url.pathname);
    const filePath = path.resolve(rootDir, `.${cleanPath}`);
    if (!filePath.startsWith(rootDir)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, { "content-type": mimeType(filePath) });
      response.end(content);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

function edgeCandidates() {
  return [
    process.env.EDGE_BIN,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
  ].filter(Boolean);
}

function findEdge() {
  return edgeCandidates().find((candidate) => fs.existsSync(candidate));
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function createCdpClient(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    let id = 0;
    const pending = new Map();
    socket.onopen = () => resolve({
      close() {
        socket.close();
      },
      send(method, params = {}) {
        const messageId = ++id;
        socket.send(JSON.stringify({ id: messageId, method, params }));
        return new Promise((res, rej) => pending.set(messageId, { res, rej, method }));
      }
    });
    socket.onerror = reject;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const { res, rej, method } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) rej(new Error(`${method}: ${message.error.message}`));
      else res(message.result || {});
    };
  });
}

async function waitForCdp(port) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/list`);
    } catch {
      await sleep(100);
    }
  }
  throw new Error("Impossible de joindre Edge en mode capture.");
}

async function launchBrowser() {
  const edge = findEdge();
  if (!edge) throw new Error("Microsoft Edge introuvable. Definis EDGE_BIN si besoin.");
  const port = 55000 + Math.floor(Math.random() * 5000);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-portal-design-"));
  const processRef = spawn(edge, [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: "ignore" });
  await waitForCdp(port);
  const created = await fetchJson(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const client = await createCdpClient(created.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");
  await client.send("Network.setBlockedURLs", { urls: ["https://*"] });
  return {
    client,
    cleanup() {
      try { client.close(); } catch {}
      try { processRef.kill(); } catch {}
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
    }
  };
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression: `JSON.stringify((() => { ${expression} })())`,
    returnByValue: true,
    awaitPromise: true
  });
  return JSON.parse(result.result.value || "null");
}

async function waitFor(client, expression, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await evaluate(client, `return Boolean(${expression});`)) return true;
    await sleep(100);
  }
  return false;
}

function clubSwimmersFixtureHtml() {
  const swimmers = [
    ["DEMO Nageuse", "12/03/2008", "F", "S", "A-00-000001", "Femme"],
    ["DEMO Nageur", "04/09/2011", "M", "C", "A-00-000002", "Homme"],
    ["IDENTITE Volontairement longue pour tester la reduction", "18/05/2014", "F", "M", "", "Femme"]
  ];
  return `
    <div class="admin-engagements-club-swimmers-directory-table" role="table" aria-label="Mes nageurs">
      <div class="admin-engagements-club-swimmers-directory-row admin-engagements-club-swimmers-directory-head" role="row">
        <span role="columnheader">Nageur</span><span role="columnheader">Naissance</span><span role="columnheader">Sexe</span><span role="columnheader">Cat.</span><span role="columnheader">Licence</span>
      </div>
      ${swimmers.map((row, index) => `
        <div class="admin-engagements-club-swimmers-directory-row" role="row" data-sex="${row[2]}" data-expanded="false">
          <button class="admin-engagements-club-swimmers-directory-toggle" type="button" aria-expanded="false" aria-controls="adminEngagementsClubSwimmerFixtureDetails${index}" data-engagement-club-swimmer-directory-toggle>
            <strong>${row[0]}</strong>
            <span class="admin-engagements-club-swimmers-directory-toggle-meta"><span class="admin-engagements-club-swimmers-directory-sex" aria-label="${row[5]}">${row[2]}</span><span class="admin-engagements-club-swimmers-directory-category" aria-label="Catégorie ${row[3]}">${row[3]}</span><span class="admin-engagements-club-swimmers-directory-chevron" aria-hidden="true">›</span></span>
          </button>
          <div id="adminEngagementsClubSwimmerFixtureDetails${index}" class="admin-engagements-club-swimmers-directory-details">
            <span role="cell"><strong>${row[0]}</strong></span><span role="cell">${row[1]}</span><span role="cell">${row[2]}</span><span role="cell">${row[3]}</span><span role="cell">${row[4] || '<span class="admin-engagements-club-swimmers-directory-license-missing">Licence à renseigner</span>'}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function engagementCompetitionsFixtureHtml() {
  const rows = [
    ["15–17 août", "TEST LIVEPALMES", "Houilles", "National", "Île-de-France", "Ouverts", "Ferme dans 1 j 4 h", "open", "warning", "Gérer mes engagements"],
    ["12 septembre", "Championnat régional", "Beaumont-sur-Oise", "Régional", "Île-de-France", "À venir", "Ouvre dans 18 jours", "upcoming", "neutral", "Voir les informations"],
    ["4 octobre", "Meeting de rentrée", "Corbie", "Départemental", "Hauts-de-France", "Fermés", "Fermés depuis le 28 septembre", "closed", "neutral", "Voir le récapitulatif"]
  ];
  return `
    <div class="admin-engagements-competitions-table" role="table" aria-label="Engagements en compétition">
      <div class="admin-engagements-competitions-table-head" role="row">
        <span role="columnheader">Date</span><span role="columnheader">Compétition</span><span role="columnheader">Niveau / région</span><span role="columnheader">Engagements</span><span role="columnheader">Action</span>
      </div>
      <section class="admin-engagements-competition-group" role="rowgroup" aria-labelledby="engagement-fixture-open">
        <h4 id="engagement-fixture-open">Août 2026</h4>
        ${rows.slice(0, 1).map((row) => engagementCompetitionFixtureRow(row)).join("")}
      </section>
      <section class="admin-engagements-competition-group" role="rowgroup" aria-labelledby="engagement-fixture-month">
        <h4 id="engagement-fixture-month">Septembre 2026</h4>
        ${rows.slice(1).map((row) => engagementCompetitionFixtureRow(row)).join("")}
      </section>
    </div>
  `;
}

function engagementCompetitionFixtureRow(row) {
  return `
    <article class="admin-engagements-competition" role="row">
      <time class="admin-engagements-competition-date" role="cell" data-label="Date">${row[0]}</time>
      <div class="admin-engagements-competition-main" role="cell" data-label="Compétition"><strong>${row[1]}</strong><small class="admin-engagements-competition-location">${row[2]}</small></div>
      <div class="admin-engagements-competition-scope" role="cell" data-label="Niveau / région"><span>${row[3]}</span><small>${row[4]}</small></div>
      <div class="admin-engagements-competition-status" role="cell" data-label="Engagements"><span class="admin-engagements-competition-entry-badge" data-entry-state="${row[7]}">${row[5]}</span><small data-entry-status="${row[8]}">${row[6]}</small></div>
      <div class="admin-engagements-competition-actions" role="cell" data-label="Action"><button class="ghost-button" type="button" aria-label="${row[9]} — ${row[1]}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg><span>${row[9]}</span></button></div>
    </article>
  `;
}

function presentationScript(view) {
  return `
    history.replaceState(null, "", "#${view.hash}");
    const authenticated = ${view.authenticated ? "true" : "false"};
    document.body.dataset.adminAuth = authenticated ? "unlocked" : "locked";
    const login = document.querySelector("#adminPortalLoginPanel");
    const dashboard = document.querySelector("#adminPortalDashboard");
    const account = document.querySelector("#adminPortalAccount");
    const navToggle = document.querySelector("#adminPortalNavToggle");
    if (login) login.hidden = authenticated;
    if (dashboard) dashboard.hidden = !authenticated;
    if (account) account.hidden = !authenticated;
    if (navToggle) navToggle.hidden = !authenticated;
    document.body.dataset.portalHome = ${view.clubOnly ? '"club"' : '"overview"'};
    const homeLink = document.querySelector("#adminPortalHomeLink");
    const homeLabel = document.querySelector("#adminPortalHomeLabel");
    if (homeLink) {
      homeLink.href = ${view.clubOnly ? '"#espace-club"' : '"#accueil"'};
      homeLink.dataset.adminViewLink = ${view.clubOnly ? '"clubHome"' : '"dashboard"'};
    }
    if (homeLabel) homeLabel.textContent = ${view.clubOnly ? '"Accueil club"' : '"Vue d’ensemble"'};
    document.dispatchEvent(new CustomEvent("livepalmes:portal-home-change"));
    const sidebar = document.querySelector(".admin-portal-sidebar");
    if (sidebar) sidebar.classList.toggle("is-pinned", authenticated && ${view.pinned ? "true" : "false"});
    document.querySelectorAll("[data-admin-view]").forEach((element) => {
      element.hidden = !authenticated || !element.matches(${JSON.stringify(view.selector)});
    });
    if (authenticated) {
      document.querySelectorAll("#adminPortalNavigation [hidden]").forEach((element) => {
        if (element.matches("[data-engagements-club-menu],[data-engagements-club-nav],[data-engagements-admin-nav],[data-engagements-national-menu],[data-engagements-national-nav],[data-access-management-nav]")) element.hidden = false;
      });
      if (${view.clubOnly ? "true" : "false"}) {
        document.querySelectorAll("[data-engagements-admin-nav],[data-engagements-national-menu],[data-access-management-nav],[data-admin-performance-menu],[data-admin-dtn-menu]").forEach((element) => {
          element.hidden = true;
        });
        document.querySelectorAll(".admin-portal-nav-group").forEach((group) => {
          group.hidden = !Array.from(group.children).some((child) => {
            if (child.tagName === "A") return !child.hidden;
            return child.classList?.contains("admin-portal-nav-nested") && !child.hidden;
          });
        });
      }
      const menu = ${JSON.stringify(view.menu || "")};
      const menuState = {
        club: ["#adminPortalClubToggle", "#adminPortalClubSubmenu"],
        performance: ["#adminPortalPerformanceToggle", "#adminPortalPerformanceSubmenu"],
        dtn: ["#adminPortalDtnToggle", "#adminPortalDtnSubmenu"],
        engagements: ["#adminPortalEngagementsToggle", "#adminPortalEngagementsSubmenu"],
        national: ["#adminPortalNationalToggle", "#adminPortalNationalSubmenu"]
      };
      Object.entries(menuState).forEach(([name, selectors]) => {
        const toggle = document.querySelector(selectors[0]);
        const submenu = document.querySelector(selectors[1]);
        const open = name === menu;
        if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
        if (submenu) submenu.hidden = !open;
      });
      document.querySelectorAll("#adminPortalNavigation [data-admin-view-link]").forEach((link) => {
        const active = link.dataset.adminViewLink === document.querySelector(${JSON.stringify(view.selector)})?.dataset.adminView;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
      const currentNavigationLink = document.querySelector("#adminPortalNavigation [data-admin-view-link].active");
      const currentNavigationParent = document.querySelector("#adminPortalNavigation .admin-portal-nav-parent[aria-expanded='true']");
      const currentNavigationLabel = currentNavigationLink?.textContent?.trim() || currentNavigationParent?.children?.[1]?.textContent?.trim() || "Navigation";
      const currentNavigation = document.querySelector("#adminPortalNavCurrent");
      if (currentNavigation) currentNavigation.textContent = currentNavigationLabel;
      document.querySelectorAll(${JSON.stringify(`${view.selector} [data-capability-panel],${view.selector} [data-engagements-panel],${view.selector} [data-access-management-panel],${view.selector} [data-engagements-admin-request-nav],${view.selector} [data-engagements-national-nav],${view.selector} [data-overview-club],${view.selector} [data-overview-competition],${view.selector} [data-overview-performance],${view.selector} [data-overview-national]`)}).forEach((element) => {
        element.hidden = false;
      });
      const overviewSpace = ${JSON.stringify(view.overviewSpace || "")};
      if (overviewSpace) {
        const card = document.querySelector("[data-overview-" + overviewSpace + "]");
        const toggle = card?.querySelector(".admin-overview-space-toggle");
        const tools = card ? [...card.querySelectorAll("[data-overview-tool]:not([hidden])")] : [];
        card?.classList.add("is-expanded");
        if (toggle) {
          toggle.setAttribute("aria-expanded", "true");
          const label = toggle.querySelector("span:first-child");
          if (label) label.textContent = "Masquer les outils";
        }
        if (card) card.dataset.overviewToolCount = String(tools.length);
      }
      if (${view.swimmersFixture ? "true" : "false"}) {
        const viewEyebrow = document.querySelector("#adminEngagementsViewEyebrow");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        if (viewEyebrow) viewEyebrow.textContent = "Espace club";
        if (viewTitle) viewTitle.textContent = "Mes nageurs";
        document.querySelectorAll("#adminEngagementsView [data-engagements-tab-panel]").forEach((panel) => {
          panel.hidden = panel.id !== "adminEngagementsClubSwimmersPanel";
        });
        const status = document.querySelector("#adminEngagementsClubSwimmersDirectoryStatus");
        const mount = document.querySelector("#adminEngagementsClubSwimmersDirectoryList");
        if (status) {
          status.textContent = "";
          status.dataset.tone = "neutral";
        }
        if (mount) mount.innerHTML = ${JSON.stringify(clubSwimmersFixtureHtml())};
      }
      if (${JSON.stringify(view.name)} === "engagements") {
        const engagementsView = document.querySelector("#adminEngagementsView");
        const viewEyebrow = document.querySelector("#adminEngagementsViewEyebrow");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        const calendarHead = document.querySelector("#adminEngagementsCalendarHead");
        const statusFilterLabel = document.querySelector("#adminEngagementsStatusFilterLabel");
        const statusSegments = document.querySelector("#adminEngagementsStatusSegments");
        const resultsCount = document.querySelector("#adminEngagementsResultsCount");
        const mount = document.querySelector("#adminEngagementsCalendarList");
        if (engagementsView) {
          engagementsView.dataset.engagementsMode = "club";
          engagementsView.dataset.engagementsTab = "calendar";
        }
        if (viewEyebrow) viewEyebrow.hidden = true;
        if (viewTitle) viewTitle.textContent = "Engagements en compétition";
        if (calendarHead) calendarHead.hidden = true;
        if (statusFilterLabel) statusFilterLabel.hidden = true;
        if (statusSegments) statusSegments.hidden = false;
        if (resultsCount) resultsCount.hidden = true;
        if (mount) mount.innerHTML = ${JSON.stringify(engagementCompetitionsFixtureHtml())};
      }
      if (${JSON.stringify(view.name)} === "account") {
        document.querySelectorAll("#adminAccountView details").forEach((details) => {
          details.open = false;
        });
        const values = {
          adminAccountFullName: "Camille Martin",
          adminAccountIdentityEmail: "camille.martin@example.fr",
          adminAccountEmailSummary: "Adresse actuelle : camille.martin@example.fr",
          adminAccountLicenseNumber: "A-00-000001",
          adminAccountScopeSentence: "Vous gérez les engagements du club Nage avec palmes Démonstration, région Île-de-France."
        };
        Object.entries(values).forEach(([id, value]) => {
          const element = document.getElementById(id);
          if (element) element.textContent = value;
        });
      }
    }
    const target = document.querySelector(${JSON.stringify(view.selector)});
    return Boolean(target && getComputedStyle(target).display !== "none");
  `;
}

async function auditInteractions(client, viewport, view) {
  const audit = await evaluate(client, `
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return !element.hidden &&
        !element.closest("[hidden],details:not([open])") &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") > 0.01 &&
        rect.width > 0 &&
        rect.height > 0;
    };
    const actionable = [...document.querySelectorAll('a[href],button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),summary')]
      .filter(isVisible);
    const blocked = [];
    const delayedTouch = [];
    const covered = [];
    actionable.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const label = element.id || element.getAttribute("href") || element.getAttribute("aria-label") || element.textContent.trim().slice(0, 48);
      if (getComputedStyle(element).pointerEvents === "none") blocked.push(label);
      if (${viewport.width <= 1080 ? "true" : "false"} && element.matches('a[href],button,summary,[role="tab"]') && getComputedStyle(element).touchAction !== "manipulation") delayedTouch.push(label);
      const x = Math.max(0, Math.min(innerWidth - 1, rect.left + rect.width / 2));
      const y = Math.max(0, Math.min(innerHeight - 1, rect.top + rect.height / 2));
      if (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) return;
      let ancestor = element.parentElement;
      while (ancestor) {
        const ancestorStyle = getComputedStyle(ancestor);
        if (/hidden|auto|scroll/.test(ancestorStyle.overflow + " " + ancestorStyle.overflowX + " " + ancestorStyle.overflowY)) {
          const ancestorRect = ancestor.getBoundingClientRect();
          if (x < ancestorRect.left || x > ancestorRect.right || y < ancestorRect.top || y > ancestorRect.bottom) return;
        }
        ancestor = ancestor.parentElement;
      }
      const hit = document.elementFromPoint(x, y);
      if (hit && hit !== element && !element.contains(hit)) covered.push({ label, hit: hit.id || hit.className || hit.tagName });
    });

    const result = {
      blocked,
      delayedTouch,
      covered,
      removedComponents: document.querySelectorAll("#adminPortalSearchButton,#adminPortalSearchDialog,#adminPortalQuickAccess,.admin-overview-intro,#adminAccessRequestView,[data-admin-view-link='accessRequest']").length,
      mobileNavigation: null,
      mobileParentNavigation: null,
      accountMenu: null,
      overviewToggle: null,
      overviewLink: null,
      swimmerAccordion: null,
      distinctEngagementRoutes: null,
      tabKeyboard: null,
      unauthorizedGroupsVisible: null,
      accountProgressiveDisclosure: null
    };
    const accountToggle = document.querySelector("#adminPortalAccountToggle");
    const accountActions = document.querySelector("#adminPortalAccountActions");
    if (${view.authenticated ? "true" : "false"} && accountToggle && isVisible(accountToggle)) {
      accountToggle.click();
      const opened = accountToggle.getAttribute("aria-expanded") === "true" && !accountActions.hidden;
      accountToggle.click();
      result.accountMenu = opened && accountToggle.getAttribute("aria-expanded") === "false" && accountActions.hidden;
    }

    if (${viewport.width <= 1080 ? "true" : "false"} && ${view.authenticated ? "true" : "false"}) {
      const navToggle = document.querySelector("#adminPortalNavToggle");
      const sidebar = document.querySelector(".admin-portal-sidebar");
      const navigation = document.querySelector("#adminPortalNavigation");
      navToggle?.click();
      const opened = navToggle?.getAttribute("aria-expanded") === "true" && sidebar?.classList.contains("is-open") && getComputedStyle(navigation).display !== "none";
      const directLink = navigation?.querySelector('a[href="#mon-compte"]');
      directLink?.click();
      result.mobileNavigation = Boolean(opened && globalThis.location.hash === "#mon-compte" && navToggle?.getAttribute("aria-expanded") === "false" && !sidebar?.classList.contains("is-open"));
      navToggle?.click();
      const parentButton = navigation?.querySelector('#adminPortalPerformanceToggle');
      parentButton?.click();
      result.mobileParentNavigation = Boolean(globalThis.location.hash === "#gestion-performances" && navToggle?.getAttribute("aria-expanded") === "false" && !sidebar?.classList.contains("is-open"));
    }

    if (${JSON.stringify(view.name)} === "overview") {
      const card = document.querySelector("[data-overview-space]");
      const toggle = card?.querySelector(".admin-overview-space-toggle");
      toggle?.click();
      result.overviewToggle = Boolean(card?.classList.contains("is-expanded") && toggle?.getAttribute("aria-expanded") === "true");
      toggle?.click();
      const mainLink = card?.querySelector(".admin-overview-space-main");
      const expectedHash = mainLink?.getAttribute("href");
      mainLink?.click();
      result.overviewLink = Boolean(expectedHash && globalThis.location.hash === expectedHash);
      const routeLinks = [...document.querySelectorAll('#adminPortalNavigation [data-admin-view-link="engagements"]')]
        .map((link) => link.getAttribute("href"));
      result.distinctEngagementRoutes = Boolean(routeLinks.length && routeLinks.every((hash) => hash && hash !== "#engagements") && new Set(routeLinks).size === routeLinks.length);
    }
    if (${JSON.stringify(view.name)} === "engagements") {
      const detail = document.querySelector("#adminEngagementsDetail");
      const general = document.querySelector("#adminEngagementsDetailGeneralTab");
      const program = document.querySelector("#adminEngagementsDetailCoursesTab");
      if (detail && general && program) {
        detail.hidden = false;
        general.focus();
        general.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
        result.tabKeyboard = program.getAttribute("aria-selected") === "true" && document.activeElement === program;
        general.click();
        detail.hidden = true;
      }
    }
    if (${view.clubOnly ? "true" : "false"}) {
      const visibleGroupLabels = [...document.querySelectorAll(".admin-portal-nav-group:not([hidden]) > h2")]
        .map((heading) => heading.textContent.trim());
      result.unauthorizedGroupsVisible = visibleGroupLabels.some((label) => ["DonnÃ©es sportives", "Suivi DTN"].includes(label));
    }
    if (${JSON.stringify(view.name)} === "account") {
      const emailCard = document.querySelector("#adminAccountEmailForm")?.closest("details");
      const passwordCard = document.querySelector("#adminAccountPasswordForm")?.closest("details");
      const initiallyClosed = !emailCard?.open && !passwordCard?.open;
      emailCard?.querySelector("summary")?.click();
      const emailOpened = emailCard?.open && isVisible(document.querySelector("#adminAccountEmailForm")) && !passwordCard?.open;
      passwordCard?.querySelector("summary")?.click();
      const passwordOpened = passwordCard?.open && isVisible(document.querySelector("#adminAccountPasswordForm")) && !emailCard?.open;
      result.accountProgressiveDisclosure = Boolean(initiallyClosed && emailOpened && passwordOpened);
    }
    if (${JSON.stringify(view.name)} === "club-swimmers" && ${viewport.width <= 700 ? "true" : "false"}) {
      const toggles = [...document.querySelectorAll("[data-engagement-club-swimmer-directory-toggle]")];
      toggles[0]?.click();
      const firstOpened = toggles[0]?.getAttribute("aria-expanded") === "true" && toggles[0]?.closest("[data-expanded]")?.dataset.expanded === "true";
      toggles[1]?.click();
      result.swimmerAccordion = Boolean(firstOpened && toggles[0]?.getAttribute("aria-expanded") === "false" && toggles[1]?.getAttribute("aria-expanded") === "true");
    }
    return result;
  `);
  const failures = [];
  if (audit.blocked.length) failures.push(`actions bloquees ${JSON.stringify(audit.blocked)}`);
  if (audit.delayedTouch.length) failures.push(`actions tactiles non optimisees ${JSON.stringify(audit.delayedTouch)}`);
  if (audit.covered.length) failures.push(`actions recouvertes ${JSON.stringify(audit.covered)}`);
  if (audit.removedComponents) failures.push(`${audit.removedComponents} composant(s) supprime(s) encore present(s)`);
  ["accountMenu", "mobileNavigation", "mobileParentNavigation", "overviewToggle", "overviewLink", "swimmerAccordion", "distinctEngagementRoutes", "tabKeyboard", "accountProgressiveDisclosure"].forEach((key) => {
    if (audit[key] === false) failures.push(`${key} KO`);
  });
  if (audit.unauthorizedGroupsVisible) failures.push("rubriques non autorisees visibles");
  if (failures.length) throw new Error(`${view.name}/${viewport.name} : interactions invalides : ${failures.join(", ")}`);
  await evaluate(client, presentationScript(view));
}

async function captureView(client, baseUrl, viewport, view) {
  await client.send("Emulation.setDeviceMetricsOverride", viewport);
  await client.send("Page.navigate", { url: `${baseUrl}/portail.html?portal-design=${Date.now()}#${view.hash}` });
  const ready = await waitFor(client, "document.readyState === 'complete' && document.querySelector('.admin-portal-page')", 8000);
  if (!ready) throw new Error(`${view.name}/${viewport.name} : portail non charge.`);
  const visible = await evaluate(client, presentationScript(view));
  if (!visible) throw new Error(`${view.name}/${viewport.name} : vue non visible.`);
  await sleep(100);
  const audit = await evaluate(client, `
    const root = document.documentElement;
    const emptyButtons = [...document.querySelectorAll("button")].filter((button) => !button.textContent.trim() && !button.getAttribute("aria-label") && !button.getAttribute("title"));
    const unlabeledControls = [...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter((control) => !(control.labels && control.labels.length) && !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby"));
    const isVisible = (element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
    const overweightTableText = [...document.querySelectorAll("table th,table td,table th *,table td *")].filter((element) => isVisible(element) && element.textContent.trim() && Number.parseInt(getComputedStyle(element).fontWeight, 10) > 500);
    const overweightSelectedTabs = [...document.querySelectorAll('[role="tab"][aria-selected="true"]')].filter((element) => isVisible(element) && Number.parseInt(getComputedStyle(element).fontWeight, 10) > 500);
    return {
      overflow: root.scrollWidth > innerWidth + 1,
      emptyButtons: emptyButtons.length,
      unlabeledControls: unlabeledControls.length,
      h1Count: document.querySelectorAll("h1").length,
      overweightTableText: overweightTableText.length,
      overweightSelectedTabs: overweightSelectedTabs.length
    };
  `);
  if (audit.overflow) throw new Error(`${view.name}/${viewport.name} : debordement horizontal global.`);
  if (audit.emptyButtons || audit.unlabeledControls || audit.h1Count !== 1) {
    throw new Error(`${view.name}/${viewport.name} : structure accessible invalide ${JSON.stringify(audit)}.`);
  }
  if (audit.overweightTableText || audit.overweightSelectedTabs) {
    throw new Error(`${view.name}/${viewport.name} : graisse typographique excessive ${JSON.stringify(audit)}.`);
  }
  await auditInteractions(client, viewport, view);
  if (view.name === "club-swimmers" && viewport.width <= 700) {
    const opened = await evaluate(client, `
      const toggle = document.querySelector("[data-engagement-club-swimmer-directory-toggle]");
      toggle?.click();
      return toggle?.getAttribute("aria-expanded") === "true";
    `);
    if (!opened) throw new Error(`${view.name}/${viewport.name} : ouverture visuelle de l'accordeon impossible.`);
  }
  const screenshot = await client.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const fileName = `${view.name}-${viewport.name}.png`;
  fs.writeFileSync(path.join(outputDir, fileName), Buffer.from(screenshot.data, "base64"));
  console.log(`${fileName} : OK`);
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const { server, baseUrl } = await startStaticServer();
  const browser = await launchBrowser();
  try {
    for (const viewport of viewports) {
      for (const view of views) {
        await captureView(browser.client, baseUrl, viewport, view);
      }
    }
    console.log(`\nCaptures du portail disponibles dans ${outputDir}`);
  } finally {
    browser.cleanup();
    server.close();
  }
}

main().catch((error) => {
  console.error(`\nCapture du portail KO : ${error.message}`);
  process.exit(1);
});
