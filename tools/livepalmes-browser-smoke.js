const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const roles = ["live", "speaker", "referee", "video", "computer", "secretary"];
const dedicatedPages = [
  { file: "live.html", role: "live", label: "live" },
  { file: "speaker.html", role: "speaker", label: "speaker" },
  { file: "ja.html", role: "referee", label: "juge arbitre" },
  { file: "video.html", role: "video", label: "juge video" },
  { file: "bureau-perf.html", role: "computer", label: "bureau des performances" },
  { file: "secretariat.html", role: "secretary", label: "secretariat" }
];

const smokeFixture = {
  meet: { name: "Championnat de France 2026", city: "Limoges" },
  events: [
    { id: "50sf", label: "50 m surface", distance: "50 m", discipline: "Surface" },
    { id: "100sf", label: "100 m surface", distance: "100 m", discipline: "Surface" }
  ],
  entrants: [
    { eventId: "50sf", sex: "F", lane: 4, lastName: "Martin", firstName: "Lea", club: "Limoges NAP", category: "Junior", seedTime: "00:19.72", swimmerId: "50sf|f|martin|lea|limoges-nap" },
    { eventId: "50sf", sex: "F", lane: 5, lastName: "Bernard", firstName: "Ines", club: "Pays d'Aix", category: "Senior", seedTime: "00:19.41", swimmerId: "50sf|f|bernard|ines|pays-aix" },
    { eventId: "50sf", sex: "M", lane: 4, lastName: "Petit", firstName: "Nolan", club: "Pessac", category: "Senior", seedTime: "00:16.84", swimmerId: "50sf|m|petit|nolan|pessac" },
    { eventId: "100sf", sex: "F", lane: 4, lastName: "Bernard", firstName: "Ines", club: "Pays d'Aix", category: "Senior", seedTime: "00:43.12", swimmerId: "100sf|f|bernard|ines|pays-aix" }
  ],
  series: [
    { eventId: "50sf", sex: "F", session: "1", series: 1, seriesCount: 1, line: 4, lastName: "Martin", firstName: "Lea", club: "Limoges NAP", category: "Junior", seedTime: "00:19.72", swimmerId: "50sf|f|martin|lea|limoges-nap" },
    { eventId: "50sf", sex: "F", session: "1", series: 1, seriesCount: 1, line: 5, lastName: "Bernard", firstName: "Ines", club: "Pays d'Aix", category: "Senior", seedTime: "00:19.41", swimmerId: "50sf|f|bernard|ines|pays-aix" },
    { eventId: "50sf", sex: "M", session: "1", series: 1, seriesCount: 1, line: 4, lastName: "Petit", firstName: "Nolan", club: "Pessac", category: "Senior", seedTime: "00:16.84", swimmerId: "50sf|m|petit|nolan|pessac" },
    { eventId: "100sf", sex: "F", session: "1", series: 1, seriesCount: 1, line: 4, lastName: "Bernard", firstName: "Ines", club: "Pays d'Aix", category: "Senior", seedTime: "00:43.12", swimmerId: "100sf|f|bernard|ines|pays-aix" }
  ],
  program: [
    { order: 1, session: "1", eventId: "50sf", sex: "F", label: "50 m surface", startTime: "09:00", seriesCount: 1 },
    { order: 2, session: "1", eventId: "50sf", sex: "M", label: "50 m surface", startTime: "09:05", seriesCount: 1 },
    { order: 3, session: "1", eventId: "100sf", sex: "F", label: "100 m surface", startTime: "09:10", seriesCount: 1 }
  ],
  records: [
    { eventId: "50sf", sex: "F", category: "Junior", label: "Record de France junior", holder: "Reference", time: "00:19.45" },
    { eventId: "50sf", sex: "F", category: "Senior", label: "Record de France senior", holder: "Reference", time: "00:18.92" }
  ],
  qualifications: [],
  top2025: [],
  notes: {},
  sourceVersion: "smoke-fixture"
};

function dedicatedPageForRole(role) {
  return dedicatedPages.find((page) => page.role === role);
}

function smokeStorageScript() {
  const roleState = {
    eventId: "50sf",
    sex: "F",
    search: "",
    category: "all",
    series: "1",
    session: "1",
    programKey: "1|1|50sf|F|series",
    lineOrder: "asc",
    selectedSwimmerId: "",
    selectedRecordKey: "",
    liveMode: true
  };
  const roleStates = Object.fromEntries(roles.map((role) => [role, { ...roleState, role }]));
  return `
    (() => {
      try {
        localStorage.setItem("napSpeakerFrance2026:v15", ${JSON.stringify(JSON.stringify(smokeFixture))});
        localStorage.setItem("napSpeakerFrance2026:role-states:v1", ${JSON.stringify(JSON.stringify(roleStates))});
        localStorage.setItem("napSpeakerFrance2026:active-view:v1", JSON.stringify({ role: "live", profileHomeActive: true }));
      } catch {}
    })();
  `;
}

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
  await client.send("Network.setBlockedURLs", {
    urls: [
      "*firestore.googleapis.com/*",
      "*google.firestore.v1.Firestore*"
    ]
  });
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
      const text = event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text || "exception";
      return text.includes("TypeError: Failed to fetch") ? [] : [text];
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
    const page = dedicatedPageForRole(role);
    assert(page, `Page dediee introuvable pour ${role}.`);
    await client.send("Page.navigate", { url: `${baseUrl}/${page.file}?smoke-role=${Date.now()}-${role}` });
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

async function testHomeDedicatedLinks(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}/pilotage-livepalmes.html?smoke-home=${Date.now()}` });
  const ready = await waitFor(client, "document.readyState === 'complete' && !document.querySelector('#profileHome')?.hidden && document.querySelector('button[data-home-role=\"speaker\"]')", 5000);
  assert(ready, "Accueil : carte speaker introuvable.");
  await sleep(800);
  await client.send("Runtime.evaluate", {
    expression: "document.querySelector('button[data-home-role=\"speaker\"]')?.click()",
    awaitPromise: true
  });
  await waitFor(client, "location.pathname.endsWith('/speaker.html')", 5000);
  const state = await evaluateJson(client, `
    return {
      pathname: location.pathname,
      dedicatedRole: window.LivePalmesDedicatedRole || "",
      isSpeaker: document.body.className.includes("role-speaker")
    };
  `);
  assert(state.pathname.endsWith("/speaker.html"), `Accueil : redirection speaker KO (${state.pathname}).`);
  assert(state.dedicatedRole === "speaker" || state.isSpeaker, "Accueil : page speaker dediee non reconnue.");
  await waitFor(client, "document.body.className.includes('role-speaker') || !document.querySelector('#roleCodesModal')?.hidden", 5000);
  await client.send("Runtime.evaluate", {
    expression: "document.querySelector('#profileHomeBtn')?.click()",
    awaitPromise: true
  });
  await waitFor(client, "location.pathname.endsWith('/pilotage-livepalmes.html')", 5000);
  const homeState = await evaluateJson(client, `
    return {
      pathname: location.pathname,
      dedicatedRole: window.LivePalmesDedicatedRole || ""
    };
  `);
  assert(homeState.pathname.endsWith("/pilotage-livepalmes.html") && !homeState.dedicatedRole, `Console : retour accueil KO (${JSON.stringify(homeState)}).`);
  await client.send("Page.navigate", { url: `${baseUrl}/index.html?smoke-root-public=${Date.now()}` });
  const publicReady = await waitFor(client, "document.querySelector('#publicHomeTitle') && !document.querySelector('#profileHome')", 5000);
  assert(publicReady, "Racine LivePalmes : l'accueil public doit remplacer l'accueil consoles.");
  console.log("Accueil vers pages dediees : OK");
}

async function seedFallbackCompetitionData(client, baseUrl) {
  const script = smokeStorageScript();
  await client.send("Page.addScriptToEvaluateOnNewDocument", { source: script });
  await client.send("Runtime.evaluate", {
    expression: script,
    awaitPromise: true
  });
  const seeded = await evaluateJson(client, `
    try {
      const data = JSON.parse(localStorage.getItem("napSpeakerFrance2026:v15") || "{}");
      return { entrants: data.entrants?.length || 0, series: data.series?.length || 0 };
    } catch {
      return { entrants: 0, series: 0 };
    }
  `);
  assert(seeded.entrants > 0 && seeded.series > 0, `Preparation smoke KO : ${JSON.stringify(seeded)}`);
}

async function testSpeakerActions(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}/speaker.html?smoke-speaker=${Date.now()}` });
  let ready = await waitFor(client, "document.body.className.includes('role-speaker') && document.querySelectorAll('tr[data-swimmer-id]').length > 0", 6000);
  if (!ready) {
    await client.send("Runtime.evaluate", { expression: "location.reload()", awaitPromise: true });
    ready = await waitFor(client, "document.body.className.includes('role-speaker') && document.querySelectorAll('tr[data-swimmer-id]').length > 0", 6000);
  }
  if (!ready) {
    await client.send("Runtime.evaluate", {
      expression: `
        window.applyFreshData?.(${JSON.stringify(smokeFixture)}, true);
        window.switchRoleUnlocked?.("speaker");
        window.render?.();
      `,
      awaitPromise: true
    });
    ready = await waitFor(client, "document.body.className.includes('role-speaker') && document.querySelectorAll('tr[data-swimmer-id]').length > 0", 6000);
  }
  if (!ready) {
    const debug = await evaluateJson(client, `
      return {
        bodyClass: document.body.className,
        raceTitle: (document.querySelector('#raceTitle')?.textContent || '').trim(),
        categoryValue: document.querySelector('#categorySelect')?.value || '',
        searchValue: document.querySelector('#searchInput')?.value || '',
        filteredText: (document.querySelector('#filteredCount')?.textContent || '').trim(),
        entrantCount: (document.querySelector('#entrantCount')?.textContent || '').trim(),
        rowCount: document.querySelectorAll('tr[data-swimmer-id]').length,
        tableText: (document.querySelector('#entrantsBody')?.textContent || '').trim(),
        raceEntrantsCount: window.raceEntrants?.().length ?? -1,
        raceSeriesForCount: window.raceSeriesFor?.('50sf', 'F').length ?? -1,
        programRowsCount: window.programRows?.().length ?? -1,
        currentSeriesRowsCount: window.currentSeriesRows?.().length ?? -1,
        availableSeriesNumbers: window.availableSeriesNumbers?.() || [],
        selectedSeriesLabel: window.selectedSeriesLabel?.() || '',
        firstMatchesRace: (() => {
          try {
            const data = JSON.parse(localStorage.getItem('napSpeakerFrance2026:v15') || '{}');
            return window.matchesRace?.(data.entrants?.[0]) ?? null;
          } catch { return null; }
        })(),
        firstSeriesMatchesRace: (() => {
          try {
            const data = JSON.parse(localStorage.getItem('napSpeakerFrance2026:v15') || '{}');
            return window.matchesRace?.(data.series?.[0]) ?? null;
          } catch { return null; }
        })(),
        stored: (() => {
          try {
            const data = JSON.parse(localStorage.getItem('napSpeakerFrance2026:v15') || '{}');
            return {
              events: data.events?.length || 0,
              entrants: data.entrants?.length || 0,
              series: data.series?.length || 0,
              program: data.program?.length || 0,
              firstEntrant: data.entrants?.[0] || null,
              firstSeries: data.series?.[0] || null
            };
          } catch { return {}; }
        })()
      };
    `);
    assert(false, `Speaker : aucune ligne nageur disponible. ${JSON.stringify(debug)}`);
  }
  await sleep(700);
  await client.send("Runtime.evaluate", { expression: "document.querySelector('tr[data-swimmer-id] .swimmer-button, tr[data-swimmer-id]')?.click()", awaitPromise: true });
  await waitFor(client, "document.querySelectorAll('.selected-row').length > 0 && (document.querySelector('#swimmerDetails')?.textContent || '').trim().length > 0", 4000);
  const swimmer = await evaluateJson(client, `
    return {
      selectedRows: document.querySelectorAll('.selected-row').length,
      detailsText: (document.querySelector('#swimmerDetails')?.textContent || '').trim(),
      bodyClass: document.body.className,
      rowCount: document.querySelectorAll('tr[data-swimmer-id]').length,
      buttonCount: document.querySelectorAll('.swimmer-button').length,
      detailsHidden: Boolean(document.querySelector('#swimmerDetails')?.hidden),
      entrantText: (document.querySelector('tr[data-swimmer-id]')?.textContent || '').trim(),
      raceTitle: (document.querySelector('#raceTitle')?.textContent || '').trim(),
      eventOptions: document.querySelectorAll('#eventSelect option').length,
      sessionValue: document.querySelector('#sessionSelect')?.value || '',
      storedEntrants: (() => {
        try { return JSON.parse(localStorage.getItem('napSpeakerFrance2026:v15') || '{}').entrants?.length || 0; }
        catch { return -1; }
      })()
    };
  `);
  assert(swimmer.selectedRows > 0 && swimmer.detailsText, `Speaker : clic nageur KO. ${JSON.stringify(swimmer)}`);

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

async function testDedicatedConsolePages(client, baseUrl) {
  const results = [];
  for (const page of dedicatedPages) {
    const otherRole = page.role === "computer" ? "speaker" : "computer";
    await client.send("Runtime.evaluate", {
      expression: `localStorage.setItem("napSpeakerFrance2026:active-view:v1", ${JSON.stringify(JSON.stringify({ role: otherRole, profileHomeActive: false }))})`,
      awaitPromise: true
    });
    await client.send("Page.navigate", { url: `${baseUrl}/${page.file}?smoke-dedicated-page=${Date.now()}` });
    const ready = await waitFor(client, `document.body.className.includes('role-${page.role}') || !document.querySelector('#roleCodesModal')?.hidden`, 8000);
    assert(ready, `Page ${page.label} : ouverture ou demande de code absente.`);
    const state = await evaluateJson(client, `
      return {
        role: ${JSON.stringify(page.role)},
        file: ${JSON.stringify(page.file)},
        isRole: document.body.className.includes('role-${page.role}'),
        pinOpen: !document.querySelector('#roleCodesModal')?.hidden,
        profileHomeVisible: !document.querySelector('#profileHome')?.hidden,
        hasOnlyRoleCard: Array.from(document.querySelectorAll('.profile-card'))
          .filter((card) => getComputedStyle(card).display !== 'none')
          .every((card) => card.dataset.homeRole === '${page.role}')
      };
    `);
    assert(state.isRole || state.pinOpen, `Page ${page.label} : role non declenche.`);
    assert(!state.profileHomeVisible || state.hasOnlyRoleCard, `Page ${page.label} : l'accueil dedie affiche d'autres consoles.`);
    results.push(page.label);
  }
  console.log(`Pages dediees : OK (${results.join(", ")})`);
}

async function testRefereeDecisionFlow(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}/ja.html?smoke-referee=${Date.now()}` });
  let ready = await waitFor(client, "document.body.className.includes('role-referee') && document.querySelectorAll('tr[data-swimmer-id]').length > 0", 5000);
  if (!ready) {
    await client.send("Runtime.evaluate", {
      expression: `
        window.applyFreshData?.(${JSON.stringify(smokeFixture)}, true);
        window.switchRoleUnlocked?.("referee");
        window.render?.();
      `,
      awaitPromise: true
    });
    ready = await waitFor(client, "document.body.className.includes('role-referee') && document.querySelectorAll('tr[data-swimmer-id]').length > 0", 5000);
  }
  if (!ready) {
    assert(false, "JA : aucune ligne nageur disponible.");
  }
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

async function testPublicHome(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}/public.html?smoke-public-home=${Date.now()}` });
  const ready = await waitFor(client, "document.querySelector('#publicHomeTitle') && document.querySelector('script[src*=\"public-home.js\"]')", 6000);
  assert(ready, "Accueil public : page non chargee.");
  const desktop = await evaluateJson(client, `
    return {
      title: document.querySelector('#publicHomeTitle')?.textContent.trim() || '',
      resultLink: document.querySelector('a[href="resultats.html"]')?.textContent.trim() || '',
      seriesLink: document.querySelector('a[href="series-public.html"]')?.textContent.trim() || '',
      archiveLink: Boolean(document.querySelector('a[href="archives.html"]')),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    };
  `);
  assert(desktop.title.includes("Live") && desktop.resultLink && desktop.seriesLink && desktop.archiveLink, "Accueil public : liens principaux absents.");
  assert(!desktop.overflow, "Accueil public : debordement horizontal desktop.");
  await client.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(250);
  const mobile = await evaluateJson(client, `
    return {
      cardCount: document.querySelectorAll('.public-home-card').length,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
    };
  `);
  assert(mobile.cardCount === 3 && !mobile.overflow, "Accueil public : mise en page mobile KO.");
  await client.send("Emulation.clearDeviceMetricsOverride");
  await client.send("Page.navigate", { url: `${baseUrl}/archives.html?smoke-archives=${Date.now()}` });
  const archiveReady = await waitFor(client, "document.querySelector('.public-archive-empty')", 4000);
  assert(archiveReady, "Archives publiques : page non chargee.");
  console.log("Accueil public : OK");
}

async function testPublicResults(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}/resultats.html?smoke-results=${Date.now()}` });
  const ready = await waitFor(client, "document.querySelector('#publicResultsList')?.children.length > 0 && document.querySelector('script[src*=\"resultats.js\"]')", 12000);
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
    await testHomeDedicatedLinks(browser.client, baseUrl);
    await seedFallbackCompetitionData(browser.client, baseUrl);
    await testRoleOpening(browser.client, baseUrl);
    await seedFallbackCompetitionData(browser.client, baseUrl);
    await testSpeakerActions(browser.client, baseUrl);
    await testDedicatedConsolePages(browser.client, baseUrl);
    await seedFallbackCompetitionData(browser.client, baseUrl);
    await testRefereeDecisionFlow(browser.client, baseUrl);
    await browser.client.send("Network.setBlockedURLs", { urls: [] });
    await testPublicHome(browser.client, baseUrl);
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
