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
  { name: "records", hash: "records-mpf", selector: "#adminRecordsView", authenticated: true },
  { name: "engagements", hash: "engagements", selector: "#adminEngagementsView", authenticated: true },
  { name: "dtn", hash: "espace-dtn-france", selector: "#adminDtnView", authenticated: true },
  { name: "access", hash: "gestion-acces", selector: "#adminAccessView", authenticated: true }
];
const viewports = [
  { name: "desktop", width: 1280, height: 720, deviceScaleFactor: 1, mobile: false },
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
    document.querySelectorAll("[data-admin-view]").forEach((element) => {
      element.hidden = !authenticated || !element.matches(${JSON.stringify(view.selector)});
    });
    if (authenticated) {
      document.querySelectorAll("#adminPortalNavigation [hidden]").forEach((element) => {
        if (element.matches(".admin-portal-nav-submenu,[data-engagements-admin-nav],[data-access-management-nav]")) element.hidden = false;
      });
      document.querySelectorAll("#adminPortalNavigation [data-admin-view-link]").forEach((link) => {
        const active = link.dataset.adminViewLink === document.querySelector(${JSON.stringify(view.selector)})?.dataset.adminView;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
      document.querySelectorAll(${JSON.stringify(`${view.selector} [data-capability-panel],${view.selector} [data-engagements-panel],${view.selector} [data-access-management-panel]`)}).forEach((element) => {
        element.hidden = false;
      });
    }
    const target = document.querySelector(${JSON.stringify(view.selector)});
    return Boolean(target && getComputedStyle(target).display !== "none");
  `;
}

async function captureView(client, baseUrl, viewport, view) {
  await client.send("Emulation.setDeviceMetricsOverride", viewport);
  await client.send("Page.navigate", { url: `${baseUrl}/portail.html?portal-design=${Date.now()}#${view.hash}` });
  const ready = await waitFor(client, "document.readyState === 'complete' && document.querySelector('.admin-portal-page')", 8000);
  if (!ready) throw new Error(`${view.name}/${viewport.name} : portail non charge.`);
  const visible = await evaluate(client, presentationScript(view));
  if (!visible) throw new Error(`${view.name}/${viewport.name} : vue non visible.`);
  const audit = await evaluate(client, `
    const root = document.documentElement;
    const emptyButtons = [...document.querySelectorAll("button")].filter((button) => !button.textContent.trim() && !button.getAttribute("aria-label") && !button.getAttribute("title"));
    const unlabeledControls = [...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter((control) => !(control.labels && control.labels.length) && !control.getAttribute("aria-label") && !control.getAttribute("aria-labelledby"));
    return {
      overflow: root.scrollWidth > innerWidth + 1,
      emptyButtons: emptyButtons.length,
      unlabeledControls: unlabeledControls.length,
      h1Count: document.querySelectorAll("h1").length
    };
  `);
  if (audit.overflow) throw new Error(`${view.name}/${viewport.name} : debordement horizontal global.`);
  if (audit.emptyButtons || audit.unlabeledControls || audit.h1Count !== 1) {
    throw new Error(`${view.name}/${viewport.name} : structure accessible invalide ${JSON.stringify(audit)}.`);
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
