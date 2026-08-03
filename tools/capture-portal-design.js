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
  { name: "overview-quick", hash: "accueil", selector: "#adminOverviewView", authenticated: true, ux: "quick" },
  { name: "search", hash: "accueil", selector: "#adminOverviewView", authenticated: true, ux: "search" },
  { name: "club-home", hash: "espace-club", selector: "#adminClubHomeView", authenticated: true, menu: "club" },
  { name: "performance-home", hash: "gestion-performances", selector: "#adminPerformanceHomeView", authenticated: true, menu: "performance" },
  { name: "records", hash: "records-mpf", selector: "#adminRecordsView", authenticated: true, menu: "performance" },
  { name: "engagements", hash: "engagements", selector: "#adminEngagementsView", authenticated: true },
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

function presentationScript(view) {
  return `
    const authenticated = ${view.authenticated ? "true" : "false"};
    document.body.dataset.adminAuth = authenticated ? "unlocked" : "locked";
    const login = document.querySelector("#adminPortalLoginPanel");
    const dashboard = document.querySelector("#adminPortalDashboard");
    const account = document.querySelector("#adminPortalAccount");
    if (login) login.hidden = authenticated;
    if (dashboard) dashboard.hidden = !authenticated;
    if (account) account.hidden = !authenticated;
    const sidebar = document.querySelector(".admin-portal-sidebar");
    if (sidebar) sidebar.classList.toggle("is-pinned", authenticated && ${view.pinned ? "true" : "false"});
    document.querySelectorAll("[data-admin-view]").forEach((element) => {
      element.hidden = !authenticated || !element.matches(${JSON.stringify(view.selector)});
    });
    if (authenticated) {
      document.querySelectorAll("#adminPortalNavigation [hidden]").forEach((element) => {
        if (element.matches("[data-engagements-club-menu],[data-engagements-club-nav],[data-engagements-admin-nav],[data-engagements-national-menu],[data-engagements-national-nav],[data-access-management-nav]")) element.hidden = false;
      });
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
      const ux = ${JSON.stringify(view.ux || "")};
      if (ux === "quick") {
        const recentLink = document.querySelector('#adminPortalNavigation a[href="#mon-compte"]');
        const preventNavigation = (event) => event.preventDefault();
        document.addEventListener("click", preventNavigation, { capture: true, once: true });
        recentLink?.click();
      }
      if (ux === "search") document.querySelector("#adminPortalSearchButton")?.click();
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
    const activeDialog = document.querySelector('#adminPortalSearchDialog:not([hidden])');
    const actionable = [...document.querySelectorAll('a[href],button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),summary')]
      .filter(isVisible)
      .filter((element) => !activeDialog || activeDialog.contains(element));
    const blocked = [];
    const covered = [];
    actionable.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const label = element.id || element.getAttribute("href") || element.getAttribute("aria-label") || element.textContent.trim().slice(0, 48);
      if (getComputedStyle(element).pointerEvents === "none") blocked.push(label);
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
      if (element.classList.contains("admin-portal-search-backdrop")) return;
      const hit = document.elementFromPoint(x, y);
      if (hit && hit !== element && !element.contains(hit)) covered.push({ label, hit: hit.id || hit.className || hit.tagName });
    });

    const result = { blocked, covered, mobileNavigation: null, mobileParentNavigation: null, accountMenu: null, search: null, overviewToggle: null, overviewLink: null };
    const accountToggle = document.querySelector("#adminPortalAccountToggle");
    const accountActions = document.querySelector("#adminPortalAccountActions");
    if (${view.authenticated ? "true" : "false"} && accountToggle && isVisible(accountToggle)) {
      accountToggle.click();
      const opened = accountToggle.getAttribute("aria-expanded") === "true" && !accountActions.hidden;
      accountToggle.click();
      result.accountMenu = opened && accountToggle.getAttribute("aria-expanded") === "false" && accountActions.hidden;
    }

    const searchButton = document.querySelector("#adminPortalSearchButton");
    const searchDialog = document.querySelector("#adminPortalSearchDialog");
    if (${view.authenticated ? "true" : "false"} && searchButton && isVisible(searchButton)) {
      searchButton.click();
      const opened = !searchDialog.hidden && document.body.classList.contains("admin-portal-search-open");
      searchDialog.querySelector("[data-portal-search-close]")?.click();
      result.search = opened && searchDialog.hidden && !document.body.classList.contains("admin-portal-search-open");
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
    }
    return result;
  `);
  const failures = [];
  if (audit.blocked.length) failures.push(`actions bloquees ${JSON.stringify(audit.blocked)}`);
  if (audit.covered.length) failures.push(`actions recouvertes ${JSON.stringify(audit.covered)}`);
  ["accountMenu", "search", "mobileNavigation", "mobileParentNavigation", "overviewToggle", "overviewLink"].forEach((key) => {
    if (audit[key] === false) failures.push(`${key} KO`);
  });
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
