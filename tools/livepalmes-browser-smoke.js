const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const roles = ["live", "speaker", "referee", "video", "computer", "secretary"];

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8"
  }[ext] || "application/octet-stream";
}

function startStaticServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const cleanPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.onopen = () => resolve({
      events,
      close() {
        ws.close();
      },
      send(method, params = {}) {
        const messageId = ++id;
        ws.send(JSON.stringify({ id: messageId, method, params }));
        return new Promise((res, rej) => pending.set(messageId, { res, rej, method }));
      }
    });
    ws.onerror = reject;
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { res, rej, method } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) rej(new Error(`${method}: ${message.error.message}`));
        else res(message.result || {});
        return;
      }
      if (message.method) events.push(message);
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
  throw new Error("Impossible de joindre Edge en mode test.");
}

async function launchBrowser() {
  const edge = findEdge();
  if (!edge) throw new Error("Microsoft Edge introuvable. Definis EDGE_BIN si besoin.");
  const port = 55000 + Math.floor(Math.random() * 5000);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-edge-"));
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
  await client.send("Log.enable");
  await client.send("Network.enable");
  return {
    client,
    cleanup() {
      try { client.close(); } catch {}
      try { processRef.kill(); } catch {}
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
    }
  };
}

async function evaluateJson(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression: `JSON.stringify((() => { ${expression} })())`,
    returnByValue: true,
    awaitPromise: true
  });
  return JSON.parse(result.result.value || "{}");
}

async function waitFor(client, expression, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluateJson(client, `return Boolean(${expression});`);
    if (value === true) return true;
    await sleep(200);
  }
  return false;
}

function collectErrors(client) {
  return client.events.flatMap((event) => {
    if (event.method === "Runtime.exceptionThrown") {
      return [event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text || "exception"];
    }
    if (event.method === "Log.entryAdded" && event.params.entry.level === "error") {
      const text = event.params.entry.text || "";
      return text.includes("Failed to load resource") ? [] : [text];
    }
    return [];
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function testRoleOpening(client, baseUrl) {
  const results = [];
  for (const role of roles) {
    await client.send("Page.navigate", { url: `${baseUrl}/index.html?smoke-role=${Date.now()}-${role}` });
    await sleep(1200);
    await client.send("Runtime.evaluate", {
      expression: `document.querySelector('button[data-home-role="${role}"]')?.click()`,
      awaitPromise: true
    });
    await waitFor(client, `document.body.className.includes('role-${role}')`, 5000);
    const state = await evaluateJson(client, `
      return {
        role: ${JSON.stringify(role)},
        ok: document.body.className.includes('role-${role}'),
        bodyClass: document.body.className,
        appScript: document.querySelector('script[src^="app.js"]')?.getAttribute('src') || '',
        roleQueueText: (document.querySelector('#roleQueue')?.textContent || '').trim(),
        resultsAdminText: (document.querySelector('#resultsAdminPanel')?.textContent || '').trim(),
        roleHistoryHidden: Boolean(document.querySelector('#roleHistory')?.hidden),
        roleHistoryText: (document.querySelector('#roleHistory')?.textContent || '').trim(),
        speakerHistoryHidden: Boolean(document.querySelector('#speakerHistory')?.hidden),
        speakerHistoryText: (document.querySelector('#speakerHistory')?.textContent || '').trim()
      };
    `);
    results.push(state);
  }
  const failed = results.filter((item) => !item.ok);
  assert(!failed.length, `Ouverture console KO : ${failed.map((item) => item.role).join(", ")}`);
  const speaker = results.find((item) => item.role === "speaker");
  assert(
    !speaker?.speakerHistoryHidden && speaker?.speakerHistoryText.includes("Journal des annonces"),
    "Speaker : journal des annonces absent."
  );
  const live = results.find((item) => item.role === "live");
  assert(
    !live?.speakerHistoryHidden && live?.speakerHistoryText.includes("Journal des annonces"),
    "Live : journal absent."
  );
  const referee = results.find((item) => item.role === "referee");
  assert(
    !referee?.roleHistoryHidden && referee?.roleHistoryText.includes("Historique"),
    "Juge arbitre : historique absent."
  );
  const computer = results.find((item) => item.role === "computer");
  assert(
    computer?.resultsAdminText.includes("Publication des résultats"),
    "Bureau des performances : panneau resultats absent."
  );
  assert(
    computer?.roleHistoryText.includes("Journal"),
    "Bureau des performances : journal absent."
  );
  const video = results.find((item) => item.role === "video");
  assert(
    video?.roleQueueText.includes("Demandes vidéo"),
    "Juge video : file des demandes absente."
  );
  assert(
    !video?.roleHistoryHidden && video?.roleHistoryText.includes("Historique"),
    "Juge video : historique absent."
  );
  console.log("Consoles : OK");
}

async function testSpeakerActions(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}/index.html?smoke-speaker=${Date.now()}` });
  await sleep(1500);
  await client.send("Runtime.evaluate", {
    expression: "document.querySelector('button[data-home-role=\"speaker\"]')?.click()",
    awaitPromise: true
  });
  await sleep(700);
  await client.send("Runtime.evaluate", { expression: "document.querySelector('tr[data-swimmer-id]')?.click()", awaitPromise: true });
  await sleep(300);
  const swimmer = await evaluateJson(client, `
    return {
      selectedRows: document.querySelectorAll('.selected-row').length,
      detailsText: (document.querySelector('#swimmerDetails')?.textContent || '').trim()
    };
  `);
  assert(swimmer.selectedRows > 0 && swimmer.detailsText, "Speaker : clic nageur KO.");

  await client.send("Runtime.evaluate", { expression: "document.querySelector('#swimmerDetails .close-details')?.click()", awaitPromise: true });
  await sleep(200);
  const swimmerClosed = await evaluateJson(client, `
    return {
      selectedRows: document.querySelectorAll('.selected-row').length,
      hidden: Boolean(document.querySelector('#swimmerDetails')?.hidden)
    };
  `);
  assert(swimmerClosed.selectedRows === 0 && swimmerClosed.hidden, "Speaker : fermeture fiche nageur KO.");

  await client.send("Runtime.evaluate", { expression: "document.querySelector('[data-record-key]')?.click()", awaitPromise: true });
  await sleep(300);
  const record = await evaluateJson(client, `
    return {
      activeRefs: document.querySelectorAll('.active-ref').length,
      text: (document.querySelector('#headerRefDetails')?.textContent || document.querySelector('#entrantsSubtitle')?.textContent || '').trim()
    };
  `);
  assert(record.activeRefs > 0 && record.text, "Speaker : clic record KO.");

  await client.send("Runtime.evaluate", { expression: "document.querySelector('#programBtn')?.click()", awaitPromise: true });
  await sleep(300);
  const programBefore = await evaluateJson(client, `
    return {
      buttons: document.querySelectorAll('[data-program-race]').length,
      modalHidden: Boolean(document.querySelector('#programModal')?.hidden)
    };
  `);
  assert(programBefore.buttons > 0 && !programBefore.modalHidden, "Speaker : ouverture programme KO.");

  await client.send("Runtime.evaluate", {
    expression: "Array.from(document.querySelectorAll('[data-program-race]')).find((button) => !button.classList.contains('active'))?.click()",
    awaitPromise: true
  });
  await sleep(400);
  const programAfter = await evaluateJson(client, `
    return {
      title: document.querySelector('#raceTitle')?.textContent.trim() || '',
      modalHidden: Boolean(document.querySelector('#programModal')?.hidden)
    };
  `);
  assert(programAfter.title && programAfter.modalHidden, "Speaker : choix course programme KO.");

  await client.send("Runtime.evaluate", { expression: "document.querySelector('#nextSeriesInlineBtn')?.click()", awaitPromise: true });
  await sleep(300);
  const navigation = await evaluateJson(client, `
    return {
      title: document.querySelector('#raceTitle')?.textContent.trim() || '',
      previousText: document.querySelector('#previousSeriesInlineBtn')?.textContent || '',
      nextText: document.querySelector('#nextSeriesInlineBtn')?.textContent || '',
      previousFloat: document.querySelector('#previousSeriesBtn')?.textContent || '',
      nextFloat: document.querySelector('#nextSeriesBtn')?.textContent || ''
    };
  `);
  assert(navigation.title, "Speaker : navigation suivante KO.");
  assert(!/[ÃÂâ]/.test(Object.values(navigation).join(" ")), "Speaker : caracteres casses dans la navigation.");
  console.log("Actions speaker : OK");
}

async function testRefereeDecisionFlow(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}/index.html?smoke-referee=${Date.now()}` });
  await sleep(1500);
  await client.send("Runtime.evaluate", {
    expression: "document.querySelector('button[data-home-role=\"referee\"]')?.click()",
    awaitPromise: true
  });
  await waitFor(client, "document.body.className.includes('role-referee') && document.querySelectorAll('tr[data-swimmer-id]').length > 0", 5000);
  await client.send("Runtime.evaluate", {
    expression: "Array.from(document.querySelectorAll('tr[data-swimmer-id]')).find((row) => row.dataset.importedForfait !== '1')?.querySelector('[data-swimmer-id]')?.click()",
    awaitPromise: true
  });
  await waitFor(client, "!document.querySelector('#decisionModal')?.hidden", 4000);
  const decision = await evaluateJson(client, `
    return {
      selectedRows: document.querySelectorAll('.selected-row').length,
      modalOpen: !document.querySelector('#decisionModal')?.hidden,
      choices: document.querySelectorAll('#decisionModal [data-decision-type]').length,
      submitPresent: Boolean(document.querySelector('#decisionModal [data-submit-decision]'))
    };
  `);
  assert(decision.selectedRows > 0 && decision.modalOpen && decision.choices > 0 && decision.submitPresent, "JA : ouverture decision nageur KO.");

  await client.send("Runtime.evaluate", { expression: "document.querySelector('#decisionModal [data-close-decision]')?.click()", awaitPromise: true });
  await waitFor(client, "document.querySelector('#decisionModal')?.hidden", 4000);
  const closed = await evaluateJson(client, `
    return {
      modalHidden: Boolean(document.querySelector('#decisionModal')?.hidden)
    };
  `);
  assert(closed.modalHidden, "JA : fermeture decision KO.");
  console.log("Actions JA : OK");
}

async function testPublicSeries(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}/series-public.html?smoke-series=${Date.now()}` });
  const ready = await waitFor(client, "document.querySelectorAll('#publicSeriesRaceSelect option').length > 0", 12000);
  assert(ready, "Page publique series : aucune course dans le menu.");
  const state = await evaluateJson(client, `
    const options = Array.from(document.querySelectorAll('#publicSeriesRaceSelect option')).map((option) => option.textContent.trim());
    return {
      script: document.querySelector('script[src^="series-public.js"]')?.getAttribute('src') || '',
      count: options.length,
      sample: options.slice(0, 8),
      hasRefresh: Boolean(document.querySelector('#refreshPublicSeriesBtn')),
      hasFloatingRefresh: Boolean(document.querySelector('#refreshPublicSeriesFloatBtn')),
      hasTimePrefix: options.some((label) => /^\\d{1,2}:\\d{2}\\s*[·-]/.test(label))
    };
  `);
  assert(state.script.includes("series-public.js"), "Page publique series : script absent.");
  assert(state.hasRefresh && state.hasFloatingRefresh, "Page publique series : boutons actualiser absents.");
  assert(!state.hasTimePrefix, "Page publique series : le menu des courses contient encore des horaires.");
  await client.send("Runtime.evaluate", { expression: "document.querySelector('#refreshPublicSeriesBtn')?.click()", awaitPromise: true });
  await waitFor(client, "document.querySelectorAll('#publicSeriesRaceSelect option').length > 0", 6000);
  await client.send("Runtime.evaluate", {
    expression: "document.querySelector('[data-swimmer-key]:not([data-swimmer-key=\"\"])')?.click()",
    awaitPromise: true
  });
  await waitFor(client, "!document.querySelector('#publicSwimmerSheet')?.hidden || document.querySelectorAll('[data-swimmer-key]:not([data-swimmer-key=\"\"])').length === 0", 4000);
  const swimmer = await evaluateJson(client, `
    const hasRows = document.querySelectorAll('[data-swimmer-key]:not([data-swimmer-key=""])').length > 0;
    return {
      hasRows,
      sheetOpen: hasRows ? !document.querySelector('#publicSwimmerSheet')?.hidden : true,
      programRows: document.querySelectorAll('#publicSwimmerSheet .public-swimmer-program-row').length,
      loading: /Chargement des temps/.test(document.querySelector('#publicSwimmerSheet')?.textContent || '')
    };
  `);
  assert(swimmer.sheetOpen && (!swimmer.hasRows || swimmer.programRows > 0 || swimmer.loading), `Page publique series : fiche nageur KO. ${JSON.stringify(swimmer)}`);
  await client.send("Runtime.evaluate", { expression: "document.querySelector('#publicSwimmerSheet [data-close-swimmer]')?.click()", awaitPromise: true });
  await waitFor(client, "document.querySelector('#publicSwimmerSheet')?.hidden", 4000);
  console.log("Page publique series : OK");
}

async function testPublicResults(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}/resultats.html?smoke-results=${Date.now()}` });
  const ready = await waitFor(client, "document.querySelector('#publicResultsList')?.children.length > 0", 12000);
  assert(ready, "Page publique resultats : liste non chargee.");
  const state = await evaluateJson(client, `
    return {
      script: document.querySelector('script[src*="resultats.js"]')?.getAttribute('src') || '',
      title: document.querySelector('#publicMeetTitle')?.textContent.trim() || '',
      hasList: document.querySelector('#publicResultsList')?.children.length > 0,
      hasRefresh: Boolean(document.querySelector('#refreshPublicResultsBtn')),
      searchInputs: document.querySelectorAll('#publicSwimmerSearchInput').length
    };
  `);
  assert(state.script.includes("resultats.js"), "Page publique resultats : script absent.");
  assert(state.hasList && state.hasRefresh, "Page publique resultats : structure principale incomplete.");
  await client.send("Runtime.evaluate", { expression: "document.querySelector('#refreshPublicResultsBtn')?.click()", awaitPromise: true });
  await waitFor(client, "document.querySelector('#publicResultsList')?.children.length > 0", 6000);
  await client.send("Runtime.evaluate", {
    expression: "document.querySelector('[data-result-swimmer-key]:not([data-result-swimmer-key=\"\"])')?.click()",
    awaitPromise: true
  });
  await waitFor(client, "!document.querySelector('#publicSwimmerSheet')?.hidden || document.querySelectorAll('[data-result-swimmer-key]:not([data-result-swimmer-key=\"\"])').length === 0", 4000);
  const swimmer = await evaluateJson(client, `
    const hasButtons = document.querySelectorAll('[data-result-swimmer-key]:not([data-result-swimmer-key=""])').length > 0;
    return {
      hasButtons,
      sheetOpen: hasButtons ? !document.querySelector('#publicSwimmerSheet')?.hidden : true,
      hasProgram: document.querySelectorAll('#publicSwimmerSheet .public-swimmer-program-row').length > 0,
      loading: /Chargement des temps/.test(document.querySelector('#publicSwimmerSheet')?.textContent || '')
    };
  `);
  assert(swimmer.sheetOpen && (!swimmer.hasButtons || swimmer.hasProgram || swimmer.loading), `Page publique resultats : fiche nageur KO. ${JSON.stringify(swimmer)}`);
  await client.send("Runtime.evaluate", { expression: "document.querySelector('#publicSwimmerSheet [data-close-swimmer-sheet]')?.click()", awaitPromise: true });
  await waitFor(client, "document.querySelector('#publicSwimmerSheet')?.hidden", 4000);
  console.log("Page publique resultats : OK");
}

async function main() {
  const { server, baseUrl } = await startStaticServer();
  const browser = await launchBrowser();
  try {
    await testRoleOpening(browser.client, baseUrl);
    await testSpeakerActions(browser.client, baseUrl);
    await testRefereeDecisionFlow(browser.client, baseUrl);
    await testPublicSeries(browser.client, baseUrl);
    await testPublicResults(browser.client, baseUrl);
    const errors = collectErrors(browser.client);
    assert(!errors.length, `Erreurs navigateur : ${errors.join(" | ")}`);
    console.log("\nSmoke navigateur LivePalmes OK.");
  } finally {
    browser.cleanup();
    server.close();
  }
}

main().catch((error) => {
  console.error(`\nSmoke navigateur LivePalmes KO : ${error.message}`);
  process.exit(1);
});
