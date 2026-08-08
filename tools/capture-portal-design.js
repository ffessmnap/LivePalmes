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
  { name: "import", hash: "import-competitions", selector: "#adminImportView", authenticated: true, menu: "performance" },
  { name: "correction", hash: "correction-performance", selector: "#adminCorrectionView", authenticated: true, menu: "performance" },
  { name: "engagements", hash: "club-competitions", selector: "#adminEngagementsView", authenticated: true },
  { name: "club-courses", hash: "club-competitions", selector: "#adminEngagementsView", authenticated: true, menu: "club", clubCoursesFixture: true },
  { name: "club-swimmers", hash: "club-nageurs", selector: "#adminEngagementsView", authenticated: true, menu: "club", swimmersFixture: true },
  { name: "club-swimmer-change", hash: "club-nageurs", selector: "#adminEngagementsView", authenticated: true, menu: "club", swimmersFixture: true, swimmerCorrectionDialogFixture: "request" },
  { name: "club-officials", hash: "club-officiels", selector: "#adminEngagementsView", authenticated: true, menu: "club", peopleFixture: true },
  { name: "club-officials-add", hash: "club-officiels", selector: "#adminEngagementsView", authenticated: true, menu: "club", peopleFixture: true, peopleFormFixture: true },
  { name: "competition-home", hash: "organisation-competitions", selector: "#adminCompetitionHomeView", authenticated: true, menu: "engagements" },
  { name: "competition-calendar", hash: "competitions-calendrier", selector: "#adminEngagementsView", authenticated: true, menu: "engagements", adminCalendarFixture: true },
  { name: "competition-create", hash: "competitions-creation", selector: "#adminEngagementsView", authenticated: true, menu: "engagements", adminCreateFixture: true },
  { name: "competition-detail", hash: "competitions-calendrier", selector: "#adminEngagementsView", authenticated: true, menu: "engagements", adminDetailFixture: true },
  { name: "dtn-home", hash: "espace-dtn", selector: "#adminDtnHomeView", authenticated: true, menu: "dtn" },
  { name: "dtn", hash: "espace-dtn-france", selector: "#adminDtnView", authenticated: true, menu: "dtn" },
  { name: "national-home", hash: "administration-nationale", selector: "#adminNationalHomeView", authenticated: true, menu: "national" },
  { name: "national-requests", hash: "administration-suppressions", selector: "#adminEngagementsView", authenticated: true, menu: "national", nationalRequestsFixture: true },
  { name: "national-swimmers", hash: "administration-doublons-nageurs", selector: "#adminEngagementsView", authenticated: true, menu: "national", nationalSwimmersFixture: true },
  { name: "national-swimmers-merge", hash: "administration-doublons-nageurs", selector: "#adminEngagementsView", authenticated: true, menu: "national", nationalSwimmersFixture: true, nationalSwimmersMergeFixture: true },
  { name: "national-swimmer-edit", hash: "administration-doublons-nageurs", selector: "#adminEngagementsView", authenticated: true, menu: "national", nationalSwimmersFixture: true, swimmerCorrectionDialogFixture: "direct" },
  { name: "national-officials", hash: "administration-officiels", selector: "#adminEngagementsView", authenticated: true, menu: "national", nationalPeopleFixture: true },
  { name: "national-audit", hash: "administration-historique", selector: "#adminEngagementsView", authenticated: true, menu: "national", nationalAuditFixture: true },
  { name: "access-home", hash: "gestion-acces", selector: "#adminAccessHomeView", authenticated: true, menu: "access" },
  { name: "access-requests", hash: "gestion-demandes-acces", selector: "#adminEngagementsView", authenticated: true, menu: "access", accessRequestsFixture: true },
  { name: "access-users", hash: "gestion-utilisateurs", selector: "#adminAccessView", authenticated: true, menu: "access", accessUsersFixture: true },
  { name: "access-users-expanded", hash: "gestion-utilisateurs", selector: "#adminAccessView", authenticated: true, menu: "access", accessUsersFixture: true, accessUsersExpandedFixture: true },
  { name: "access-user-add", hash: "gestion-utilisateurs", selector: "#adminAccessView", authenticated: true, menu: "access", accessUsersFixture: true, accessDialogFixture: "add" },
  { name: "access-user-edit", hash: "gestion-utilisateurs", selector: "#adminAccessView", authenticated: true, menu: "access", accessUsersFixture: true, accessDialogFixture: "edit" }
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
    ["DEMO Nageuse", "12/03/2008", "F", "S", "A-00-000001", "Femme", "pending"],
    ["DEMO Nageur", "04/09/2011", "M", "C", "A-00-000002", "Homme"],
    ["IDENTITE Volontairement longue pour tester la reduction", "18/05/2014", "F", "M", "", "Femme"]
  ];
  return `
    <div class="admin-engagements-club-swimmers-directory-table" role="table" aria-label="Mes nageurs">
      <div class="admin-engagements-club-swimmers-directory-row admin-engagements-club-swimmers-directory-head" role="row">
        <span role="columnheader">Nageur</span><span role="columnheader">Naissance</span><span role="columnheader">Sexe</span><span role="columnheader">Cat.</span><span role="columnheader">Licence</span><span role="columnheader">Action</span>
      </div>
      ${swimmers.map((row, index) => {
        const sexDisplay = row[2] === "M" ? "H" : row[2];
        const profileButton = `<button class="admin-engagements-club-swimmers-directory-name-button" type="button" title="Voir la fiche publique de ${row[0]}" aria-label="Voir la fiche publique de ${row[0]}"><strong>${row[0]}</strong><svg class="admin-engagements-club-swimmers-directory-profile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-7 7"></path><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"></path></svg></button>`;
        const correctionAction = row[6] === "pending"
          ? '<span class="admin-engagements-club-swimmers-directory-change-pending" aria-label="Correction en attente"><span class="admin-engagements-club-swimmers-directory-change-pending-long">Correction en attente</span><span class="admin-engagements-club-swimmers-directory-change-pending-short" aria-hidden="true">En attente</span></span>'
          : '<button class="admin-engagements-club-swimmers-directory-edit-button" type="button" aria-label="Demander une correction"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4zM13.5 6.5l4 4"></path></svg></button>';
        return `
        <div class="admin-engagements-club-swimmers-directory-row" role="row" data-sex="${row[2]}" data-expanded="false">
          <div class="admin-engagements-club-swimmers-directory-toggle">
            ${profileButton}
            <span class="admin-engagements-club-swimmers-directory-toggle-meta"><span class="admin-engagements-club-swimmers-directory-sex-category" aria-label="${row[5]}, catégorie ${row[3]}"><span class="admin-engagements-club-swimmers-directory-sex">${sexDisplay}</span><span aria-hidden="true">·</span><span class="admin-engagements-club-swimmers-directory-category">${row[3]}</span></span><span class="admin-engagements-club-swimmers-directory-mobile-actions">${correctionAction}</span><button class="admin-engagements-club-swimmers-directory-details-button" type="button" aria-expanded="false" aria-controls="adminEngagementsClubSwimmerFixtureDetails${index}" aria-label="Afficher le détail de ${row[0]}" data-engagement-club-swimmer-directory-toggle><span class="admin-engagements-club-swimmers-directory-chevron" aria-hidden="true">›</span></button></span>
          </div>
          <div id="adminEngagementsClubSwimmerFixtureDetails${index}" class="admin-engagements-club-swimmers-directory-details">
            <span role="cell">${profileButton}</span><span role="cell">${row[1]}</span><span role="cell">${row[2]}</span><span role="cell">${row[3]}</span><span role="cell">${row[4] || '<span class="admin-engagements-club-swimmers-directory-license-missing">Licence à renseigner</span>'}</span><span role="cell" class="admin-engagements-club-swimmers-directory-actions">${correctionAction}</span>
          </div>
        </div>
      `;
      }).join("")}
    </div>
  `;
}

function clubPeopleFixtureHtml() {
  const people = [
    ["MARTIN Camille", "A-00-000001", "Chef d'équipe et officiel", "true"],
    ["ROBERT Alex", "A-00-000002", "Officiel", "true"],
    ["DURAND Louise", "A-00-000003", "Chef d'équipe", "false"]
  ];
  return `
    <div class="admin-engagements-club-people-table" role="table" aria-label="Mes officiels">
      <div class="admin-engagements-club-person-row admin-engagements-club-person-head" role="row">
        <span role="columnheader">Personne</span><span role="columnheader">Licence</span><span role="columnheader">Rôle</span><span role="columnheader">Statut</span><span role="columnheader">Actions</span>
      </div>
      ${people.map((person, index) => `
        <div class="admin-engagements-club-person-row" role="row" data-active="${person[3]}" data-expanded="false">
          <button class="admin-engagements-club-person-toggle" type="button" aria-expanded="false" aria-controls="adminEngagementsClubPersonFixtureDetails${index}" data-engagement-club-person-directory-toggle>
            <strong>${person[0]}</strong>
            <span class="admin-engagements-club-person-toggle-meta"><span class="admin-engagements-club-person-role-badge" title="${person[2]}">${person[2]}</span><span class="admin-engagements-club-person-chevron" aria-hidden="true">›</span></span>
          </button>
          <div id="adminEngagementsClubPersonFixtureDetails${index}" class="admin-engagements-club-person-details">
            <span role="cell"><strong>${person[0]}</strong></span><span role="cell">${person[1]}</span><span role="cell">${person[2]}</span><span role="cell"><span class="admin-engagements-club-person-status" data-active="${person[3]}">${person[3] === "true" ? "Actif" : "Inactif"}</span></span><span role="cell"><span class="admin-engagements-request-actions"><button class="ghost-button" type="button">Modifier</button><button class="ghost-button" type="button">${person[3] === "true" ? "Désactiver" : "Réactiver"}</button></span></span>
          </div>
        </div>
      `).join("")}
    </div>`;
}

function clubCoursesFixtureHtml() {
  const groups = [
    { sex: "F", label: "Femmes", count: "2 nageuses", courses: [["50 m SF", "F"], ["100 m Bi", "F/H"]], swimmers: [["MARTIN", "Camille", "12/03/2008", "J", true], ["DURAND", "Louise", "24/07/2009", "J", false]] },
    { sex: "M", label: "Hommes", count: "2 nageurs", courses: [["50 m SF", "H"], ["100 m Bi", "F/H"]], swimmers: [["ROBERT", "Alex", "06/11/2008", "J", true], ["BERGERON", "Maxime", "18/01/2007", "J", false]] }
  ];
  return groups.map((group) => `
    <section class="admin-engagements-club-entry-group" data-entry-sex="${group.sex}">
      <div class="admin-engagements-club-entry-group-head"><h4>${group.label}</h4><span>${group.count}</span></div>
      <p class="admin-engagements-club-entries-scroll-hint" data-engagement-club-entries-scroll-hint>↔ Faites glisser pour voir les autres courses</p>
      <div class="admin-engagements-club-entries-table-shell" data-engagement-club-entries-sex="${group.sex}" data-scrollable="true" data-at-end="false" tabindex="0" aria-label="Courses ${group.label.toLowerCase()}, faire défiler horizontalement si nécessaire">
        <table class="admin-engagements-club-entries-table" aria-label="Courses ${group.label.toLowerCase()}">
          <thead><tr class="admin-engagements-club-entry-session-head"><th class="admin-engagements-club-entry-identity admin-engagements-club-entry-last-name" rowspan="2">${group.sex === "F" ? "Nageuse" : "Nageur"}</th><th class="admin-engagements-club-entry-identity" rowspan="2">Naissance</th><th class="admin-engagements-club-entry-identity" rowspan="2">Cat.</th><th class="admin-engagements-club-entry-session" colspan="2"><span>Session 1</span><small>15/08/2026 · 09:00</small></th><th class="admin-engagements-club-entry-action" rowspan="2">Temps</th></tr><tr class="admin-engagements-club-entry-course-head">${group.courses.map((course, index) => `<th class="${index === 0 ? "is-session-start" : ""}"><span>${course[0]}</span><small>${course[1]}</small></th>`).join("")}</tr></thead>
          <tbody>${group.swimmers.map((swimmer, swimmerIndex) => `<tr class="admin-engagements-club-entry-row" data-sex="${group.sex}"><th class="admin-engagements-club-entry-last-name admin-engagements-club-entry-swimmer"><strong>${swimmer[0]}</strong><span>${swimmer[1]}</span></th><td>${swimmer[2]}</td><td>${swimmer[3]}</td>${group.courses.map((course, courseIndex) => `<td class="admin-engagements-club-entry-course ${courseIndex === 0 ? "is-session-start" : ""}"><label data-event-selected title="${course[0]} ${course[1]}"><input type="checkbox" aria-label="${course[0]} ${course[1]} pour ${swimmer[0]} ${swimmer[1]}" ${swimmer[4] && courseIndex === swimmerIndex ? "checked" : ""}><small data-engagement-club-entry-cell-time ${swimmer[4] && courseIndex === swimmerIndex ? "" : "hidden"}>00:59.12</small></label></td>`).join("")}<td class="admin-engagements-club-entry-action"><button class="ghost-button compact admin-engagements-club-times-open" type="button" aria-label="Voir ou modifier les temps"><span>${swimmer[4] ? "1" : "0"}</span><b aria-hidden="true">✎</b></button></td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
  `).join("");
}

function accessUsersFixtureHtml() {
  const users = [
    ["MARTIN", "Camille", "camille.martin@example.fr", "Club Démonstration", "A-00-000001", "Engagements club +1", "Actif", "active"],
    ["ROBERT", "Alex", "alex.robert@example.fr", "Club Démonstration", "A-00-000002", "Engagements région +2", "Actif", "active"],
    ["DURAND", "Louise", "louise.durand@example.fr", "Club Démonstration", "A-00-000003", "Aucun droit actif", "Inactif", "inactive"]
  ];
  const editIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Z"></path></svg>';
  const statusIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>';
  return `
    <div class="admin-access-table" role="table" aria-label="Utilisateurs du portail">
      <div class="admin-access-table-head" role="row">
        <span role="columnheader">Nom</span><span role="columnheader">Prénom</span><span role="columnheader">Email</span><span role="columnheader">Club</span><span role="columnheader">Connexion</span><span role="columnheader">État</span><span role="columnheader" aria-label="Détails"></span>
      </div>
      ${users.map((user, index) => `
        <article class="admin-access-row ${user[7] === "inactive" ? "inactive" : ""}" data-expanded="false" role="rowgroup">
          <button class="admin-access-row-toggle" type="button" aria-expanded="false" aria-controls="adminAccessFixtureDetails${index}" data-access-directory-toggle>
            <span class="admin-access-row-toggle-user"><strong>${user[0]} ${user[1]}</strong><small>${user[2]}</small></span>
            <span class="admin-access-row-toggle-meta"><span class="admin-access-status ${user[7]}">${user[6]}</span><span class="admin-access-row-chevron" aria-hidden="true">›</span></span>
          </button>
          <div class="admin-access-row-summary" role="row">
            <div class="admin-access-last-name" role="cell" data-label="Nom"><strong>${user[0]}</strong></div>
            <div class="admin-access-first-name" role="cell" data-label="Prénom">${user[1]}</div>
            <div class="admin-access-email" role="cell" data-label="Email">${user[2]}</div>
            <div class="admin-access-scope" role="cell" data-label="Club"><span>${user[3]}</span></div>
            <div role="cell" data-label="Connexion"><small class="admin-access-login">05/08/2026 18:30</small></div>
            <div role="cell" data-label="État"><span class="admin-access-status ${user[7]}">${user[6]}</span></div>
            <div class="admin-access-row-disclosure" role="cell"><button type="button" aria-expanded="false" aria-controls="adminAccessFixtureDetails${index}" aria-label="Afficher le détail de ${user[0]} ${user[1]}" data-access-directory-toggle><span class="admin-access-row-chevron" aria-hidden="true">›</span></button></div>
          </div>
          <div id="adminAccessFixtureDetails${index}" class="admin-access-row-expanded">
            <div class="admin-access-row-expanded-data">
              <div><span>Licence</span><strong>${user[4]}</strong></div>
              <div><span>Périmètre</span><strong>${user[3]}</strong><small>Club 001 · Région Île-de-France</small></div>
              <div class="admin-access-row-expanded-rights"><span>Habilitations</span><strong>${user[5]}</strong></div>
            </div>
            <div class="admin-access-row-actions"><button class="ghost-button admin-access-action-button" type="button">${editIcon}<span>Modifier</span></button><button class="ghost-button admin-access-action-button" type="button">${statusIcon}<span>${user[7] === "active" ? "Désactiver" : "Réactiver"}</span></button></div>
          </div>
        </article>
      `).join("")}
    </div>`;
}

function engagementCompetitionsFixtureHtml() {
  const rows = [
    ["15–17 août", "TEST LIVEPALMES", "Houilles", "National", "Île-de-France", "Ouverts", "Ferme dans 1 j 4 h", "open", "warning", "Commencer mes engagements"],
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
    <article class="admin-engagements-competition" role="row" data-engagement-competition-card-id="fixture" data-engagement-open-tab="team">
      <time class="admin-engagements-competition-date" role="cell" data-label="Date">${row[0]}</time>
      <div class="admin-engagements-competition-main" role="cell" data-label="Compétition"><strong>${row[1]}</strong><small class="admin-engagements-competition-location">${row[2]}</small><small class="admin-engagements-competition-mobile-meta">${row[2]} · ${row[3]} · ${row[4]}</small></div>
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
        national: ["#adminPortalNationalToggle", "#adminPortalNationalSubmenu"],
        access: ["#adminPortalAccessToggle", "#adminPortalAccessSubmenu"]
      };
      Object.entries(menuState).forEach(([name, selectors]) => {
        const toggle = document.querySelector(selectors[0]);
        const submenu = document.querySelector(selectors[1]);
        const open = name === menu;
        if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
        if (submenu) submenu.hidden = !open;
      });
      document.querySelectorAll("#adminPortalNavigation [data-admin-view-link]").forEach((link) => {
        const active = link.hash === location.hash;
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
      document.querySelectorAll("#adminPortalAccessPendingBadge,#adminOverviewAccessPendingBadge,#adminAccessHomePendingBadge,#adminEngagementsAccessRequestsBadge").forEach((badge) => {
        badge.hidden = false;
        badge.textContent = "3";
        badge.setAttribute("aria-label", "3 demandes d'accès en attente");
      });
      document.querySelectorAll("#adminPortalNationalPendingBadge,#adminOverviewNationalPendingBadge,#adminEngagementsDeletionRequestsBadge").forEach((badge) => {
        badge.hidden = false;
        badge.textContent = "5";
        badge.setAttribute("aria-label", "5 demandes nationales en attente");
      });
      if (${view.name === "national-home" ? "true" : "false"}) {
        const pendingCounts = document.querySelector("#adminNationalOverviewCounts");
        const pendingCount = document.querySelector("#adminNationalOverviewPendingCount");
        const pendingBreakdown = document.querySelector("#adminNationalOverviewPendingBreakdown");
        if (pendingCounts) pendingCounts.hidden = false;
        if (pendingCount) {
          pendingCount.hidden = false;
          pendingCount.textContent = "5";
        }
        if (pendingBreakdown) pendingBreakdown.textContent = "2 corrections · 2 suppressions de données · 1 suppression de compte";
      }
      if (${view.swimmersFixture ? "true" : "false"}) {
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
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
      if (${view.clubCoursesFixture ? "true" : "false"}) {
        const engagementsView = document.querySelector("#adminEngagementsView");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        const card = document.querySelector("#adminEngagementsCalendarCard");
        const detail = document.querySelector("#adminEngagementsDetail");
        const close = document.querySelector("#adminEngagementsDetailClose");
        if (engagementsView) {
          engagementsView.dataset.engagementsMode = "club";
          engagementsView.dataset.engagementsTab = "calendar";
        }
        if (viewTitle) viewTitle.textContent = "Engagements en compétition";
        if (card) card.dataset.detailOpen = "true";
        if (detail) detail.hidden = false;
        if (close) close.hidden = false;
        ["#adminEngagementsCalendarActions", "#adminEngagementsCalendarFilters", "#adminEngagementsCalendarList", "#adminEngagementsRefreshButton"].forEach((selector) => {
          document.querySelector(selector)?.setAttribute("hidden", "");
        });
        const detailTitle = document.querySelector("#adminEngagementsDetailTitle");
        const detailSubtitle = document.querySelector("#adminEngagementsDetailSubtitle");
        const detailEyebrow = document.querySelector("#adminEngagementsDetailEyebrow");
        if (detailEyebrow) detailEyebrow.hidden = true;
        if (detailTitle) detailTitle.textContent = "TEST LIVEPALMES";
        if (detailSubtitle) detailSubtitle.textContent = "15/08/2026 · Houilles";
        document.querySelectorAll("#adminEngagementsDetail [data-engagements-detail-tab-button]").forEach((tab) => {
          const selected = tab.id === "adminEngagementsDetailEntriesTab";
          tab.setAttribute("aria-selected", selected ? "true" : "false");
          tab.tabIndex = selected ? 0 : -1;
        });
        document.querySelectorAll("#adminEngagementsDetail [data-engagements-detail-tab-panel]").forEach((panel) => {
          panel.hidden = panel.id !== "adminEngagementsDetailEntriesPanel";
        });
        const mobileStepNav = document.querySelector("#adminEngagementsMobileStepNav");
        const mobileStepLabel = document.querySelector("#adminEngagementsMobileStepLabel");
        const mobileStepMeta = document.querySelector("#adminEngagementsMobileStepMeta");
        const mobileStepPrev = document.querySelector("#adminEngagementsMobileStepPrev");
        const mobileStepNext = document.querySelector("#adminEngagementsMobileStepNext");
        const stepFooter = document.querySelector("#adminEngagementsStepFooter");
        const footerPrev = document.querySelector("#adminEngagementsFooterPrev");
        const footerNext = document.querySelector("#adminEngagementsFooterNext");
        if (mobileStepNav) mobileStepNav.hidden = false;
        if (mobileStepLabel) mobileStepLabel.textContent = "Courses";
        if (mobileStepMeta) mobileStepMeta.textContent = "Étape 6/8 · Toutes les étapes";
        if (mobileStepPrev) mobileStepPrev.disabled = false;
        if (mobileStepNext) mobileStepNext.disabled = false;
        if (stepFooter) stepFooter.hidden = false;
        if (footerPrev) footerPrev.textContent = "← Nageurs";
        if (footerNext) footerNext.textContent = "Relais →";
        const mount = document.querySelector("#adminEngagementsClubEntriesList");
        if (mount) mount.innerHTML = ${JSON.stringify(clubCoursesFixtureHtml())};
      }
      if (${view.nationalRequestsFixture ? "true" : "false"}) {
        const engagementsView = document.querySelector("#adminEngagementsView");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        if (engagementsView) {
          engagementsView.dataset.engagementsMode = "admin";
          engagementsView.dataset.engagementsTab = "deletionRequests";
        }
        if (viewTitle) viewTitle.textContent = "Demandes à traiter";
        document.querySelectorAll("#adminEngagementsView [data-engagements-tab-panel]").forEach((panel) => {
          panel.hidden = panel.id !== "adminEngagementsDeletionRequestsPanel";
        });
        document.querySelectorAll("[data-engagements-national-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.engagementsNationalPanel !== "deletions";
        });
        const empty = document.querySelector("#adminNationalRequestsEmpty");
        const requests = document.querySelector("#adminEngagementsSwimmerChangeRequests");
        const requestCount = document.querySelector("#adminEngagementsSwimmerChangeRequestsCount");
        const requestList = document.querySelector("#adminEngagementsSwimmerChangeRequestsList");
        if (empty) empty.hidden = true;
        if (requests) {
          requests.hidden = false;
          requests.open = true;
        }
        if (requestCount) requestCount.textContent = "1 en attente";
        if (requestList) requestList.innerHTML = '<article class="admin-engagements-swimmer-change-request"><div class="admin-engagements-swimmer-change-request-head"><div><strong>MARTIN Camille</strong><span>Club Démonstration · 06/08/2026 14:30</span></div><span class="admin-engagements-request-status" data-status="pending">En attente</span></div><div class="admin-engagements-swimmer-change-diff"><div><span>Nom</span><del>MARTNI</del><strong>MARTIN</strong></div><div><span>Naissance</span><del>12/03/2008</del><strong>13/03/2008</strong></div></div><p class="admin-engagements-request-note"><strong>Motif du club :</strong> Faute constatée sur la licence fédérale.</p><label class="admin-engagements-swimmer-change-resolution-note"><span>Commentaire national <small>(facultatif)</small></span><input type="text" placeholder="Précision pour le club"></label><div class="admin-engagements-request-actions"><button class="ghost-button" type="button">Refuser</button><button type="button">Valider la correction</button></div></article>';
      }
      if (${view.nationalSwimmersFixture ? "true" : "false"}) {
        const engagementsView = document.querySelector("#adminEngagementsView");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        const mergeMode = ${view.nationalSwimmersMergeFixture ? "true" : "false"};
        if (engagementsView) {
          engagementsView.dataset.engagementsMode = "admin";
          engagementsView.dataset.engagementsTab = "deletionRequests";
        }
        if (viewTitle) viewTitle.textContent = "Nageurs";
        document.querySelectorAll("#adminEngagementsView [data-engagements-tab-panel]").forEach((panel) => {
          panel.hidden = panel.id !== "adminEngagementsDeletionRequestsPanel";
        });
        document.querySelectorAll("[data-engagements-national-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.engagementsNationalPanel !== "swimmers";
        });
        const mergeButton = document.querySelector("#adminEngagementsNationalSwimmersMergeMode");
        const bulk = document.querySelector("[data-engagement-national-swimmer-bulk]");
        if (mergeButton) {
          mergeButton.setAttribute("aria-pressed", mergeMode ? "true" : "false");
          mergeButton.textContent = mergeMode ? "Quitter le mode doublons" : "Gérer les doublons";
        }
        if (bulk) bulk.hidden = !mergeMode;
        const status = document.querySelector("#adminEngagementsNationalSwimmersStatus");
        const list = document.querySelector("#adminEngagementsNationalSwimmersList");
        if (status) {
          status.textContent = "2 nageurs affichés.";
          status.dataset.tone = "ok";
        }
        if (list) list.innerHTML = '<div class="admin-engagements-national-table-wrap"><table class="admin-engagements-national-table" data-merge-mode="' + (mergeMode ? 'true' : 'false') + '"><thead><tr><th class="admin-engagements-national-choice">Conserver</th><th class="admin-engagements-national-choice">Fusionner</th><th class="admin-engagements-national-merge-only">Alerte</th><th>Nom</th><th>Prénom</th><th>Naissance</th><th>Sexe</th><th>Licence</th><th>Club</th><th>Perf.</th><th>Statut</th><th>Actions</th></tr></thead><tbody><tr><td class="admin-engagements-national-choice"><input type="radio" aria-label="Conserver"></td><td class="admin-engagements-national-choice"><input type="checkbox" aria-label="Fusionner"></td><td class="admin-engagements-national-merge-only"><span class="admin-engagements-duplicate-badge">Doublon possible</span></td><td><strong>MARTIN</strong></td><td>Camille</td><td>13/03/2008</td><td>F</td><td>A-00-000001</td><td>Club Démonstration</td><td>24</td><td>Actif</td><td class="admin-engagements-national-table-actions"><details class="admin-national-row-menu"><summary aria-label="Actions pour MARTIN Camille">⋮</summary><div><button class="ghost-button" type="button">Modifier la fiche</button></div></details></td></tr><tr><td class="admin-engagements-national-choice"><input type="radio" aria-label="Conserver"></td><td class="admin-engagements-national-choice"><input type="checkbox" aria-label="Fusionner"></td><td class="admin-engagements-national-merge-only"><span class="admin-engagements-duplicate-badge">Aucun</span></td><td><strong>DURAND</strong></td><td>Lina</td><td>24/07/2009</td><td>F</td><td>A-00-000002</td><td>Palmes Atlantique</td><td>11</td><td>Actif</td><td class="admin-engagements-national-table-actions"><details class="admin-national-row-menu"><summary aria-label="Actions pour DURAND Lina">⋮</summary><div><button class="ghost-button" type="button">Modifier la fiche</button></div></details></td></tr></tbody></table></div>';
      }
      if (${view.nationalPeopleFixture ? "true" : "false"}) {
        const engagementsView = document.querySelector("#adminEngagementsView");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        if (engagementsView) {
          engagementsView.dataset.engagementsMode = "admin";
          engagementsView.dataset.engagementsTab = "deletionRequests";
        }
        if (viewTitle) viewTitle.textContent = "Officiels";
        document.querySelectorAll("#adminEngagementsView [data-engagements-tab-panel]").forEach((panel) => {
          panel.hidden = panel.id !== "adminEngagementsDeletionRequestsPanel";
        });
        document.querySelectorAll("[data-engagements-national-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.engagementsNationalPanel !== "people";
        });
        const status = document.querySelector("#adminEngagementsNationalPeopleStatus");
        const list = document.querySelector("#adminEngagementsNationalPeopleList");
        if (status) status.textContent = "2 personnes affichées.";
        if (list) list.innerHTML = '<div class="admin-engagements-national-table-wrap"><table class="admin-engagements-national-table" data-merge-mode="false"><thead><tr><th class="admin-engagements-national-choice">Conserver</th><th class="admin-engagements-national-choice">Fusionner</th><th class="admin-engagements-national-merge-only">Alerte</th><th>Nom</th><th>Prénom</th><th>Licence</th><th>Rôle</th><th>Club</th><th>Statut</th><th>Actions</th></tr></thead><tbody><tr><td class="admin-engagements-national-choice"></td><td class="admin-engagements-national-choice"></td><td class="admin-engagements-national-merge-only"></td><td><strong>BERGERON</strong></td><td>Maxime</td><td>A-00-100001</td><td>Juge</td><td>Club Démonstration</td><td>Actif</td><td class="admin-engagements-national-table-actions"><details class="admin-national-row-menu"><summary aria-label="Actions pour BERGERON Maxime">⋮</summary><div><button class="ghost-button">Désactiver</button><button class="ghost-button">Supprimer</button></div></details></td></tr><tr><td class="admin-engagements-national-choice"></td><td class="admin-engagements-national-choice"></td><td class="admin-engagements-national-merge-only"></td><td><strong>FAUVEAU</strong></td><td>Antoine</td><td>A-00-100002</td><td>Chef d’équipe</td><td>Nage avec Palmes</td><td>Actif</td><td class="admin-engagements-national-table-actions"><details class="admin-national-row-menu"><summary aria-label="Actions pour FAUVEAU Antoine">⋮</summary><div><button class="ghost-button">Désactiver</button><button class="ghost-button">Supprimer</button></div></details></td></tr></tbody></table></div>';
      }
      if (${view.nationalAuditFixture ? "true" : "false"}) {
        const engagementsView = document.querySelector("#adminEngagementsView");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        if (engagementsView) {
          engagementsView.dataset.engagementsMode = "admin";
          engagementsView.dataset.engagementsTab = "deletionRequests";
        }
        if (viewTitle) viewTitle.textContent = "Journal d’activité";
        document.querySelectorAll("#adminEngagementsView [data-engagements-tab-panel]").forEach((panel) => {
          panel.hidden = panel.id !== "adminEngagementsDeletionRequestsPanel";
        });
        document.querySelectorAll("[data-engagements-national-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.engagementsNationalPanel !== "audit";
        });
        const status = document.querySelector("#adminEngagementsNationalAuditStatus");
        const list = document.querySelector("#adminEngagementsNationalAuditList");
        if (status) status.textContent = "2 actions affichées.";
        if (list) list.innerHTML = '<div class="admin-engagements-national-table-wrap"><table class="admin-engagements-national-table admin-engagements-national-audit-table"><thead><tr><th>Date</th><th>Action</th><th>Acteur</th><th>Objet</th><th>Détails</th></tr></thead><tbody><tr><td>06/08/2026 14:30</td><td><strong>Correction de nageur validée</strong></td><td>Vous</td><td>MARTIN Camille</td><td><details class="admin-national-audit-details"><summary>Voir</summary><code>engagementClubSwimmer.changeApproved</code></details></td></tr><tr><td>06/08/2026 13:05</td><td><strong>Compte modifié</strong></td><td>Administrateur LivePalmes</td><td>Club Démonstration</td><td><details class="admin-national-audit-details"><summary>Voir</summary><code>accessUser.updated</code></details></td></tr></tbody></table></div>';
      }
      if (${view.peopleFixture ? "true" : "false"}) {
        const engagementsView = document.querySelector("#adminEngagementsView");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        const peopleActions = document.querySelector("#adminEngagementsClubPeopleActions");
        if (engagementsView) {
          engagementsView.dataset.engagementsMode = "club";
          engagementsView.dataset.engagementsTab = "clubPeople";
        }
        if (viewTitle) viewTitle.textContent = "Mes officiels";
        if (peopleActions) peopleActions.hidden = false;
        document.querySelectorAll("#adminEngagementsView [data-engagements-tab-panel]").forEach((panel) => {
          panel.hidden = panel.id !== "adminEngagementsClubPeoplePanel";
        });
        const status = document.querySelector("#adminEngagementsClubPeopleStatus");
        const mount = document.querySelector("#adminEngagementsClubPeopleList");
        if (status) {
          status.textContent = "";
          status.dataset.tone = "neutral";
        }
        if (mount) mount.innerHTML = ${JSON.stringify(clubPeopleFixtureHtml())};
      }
      if (${view.peopleFormFixture ? "true" : "false"}) {
        const form = document.querySelector("#adminEngagementsClubPersonForm");
        const search = document.querySelector("#adminEngagementsClubPersonSwimmerSearch");
        const results = document.querySelector("#adminEngagementsClubPersonSwimmerResults");
        if (form) form.hidden = false;
        if (search) search.value = "mart";
        if (search) search.setAttribute("aria-expanded", "true");
        if (results) {
          results.hidden = false;
          results.innerHTML = '<button type="button" data-engagement-club-person-swimmer-result="performances:demo-1"><strong>MARTIN Camille</strong><small>A-00-000001</small></button>';
        }
      }
      if (${view.accessRequestsFixture ? "true" : "false"}) {
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        if (viewTitle) viewTitle.textContent = "Demandes d'accès";
        document.querySelectorAll("#adminEngagementsView [data-engagements-tab-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.engagementsTabPanel !== "accessRequests";
        });
      }
      if (${view.accessUsersFixture ? "true" : "false"}) {
        const count = document.querySelector("#adminAccessCount");
        const mount = document.querySelector("#adminAccessList");
        if (count) count.textContent = "3 comptes affichés";
        if (mount) mount.innerHTML = ${JSON.stringify(accessUsersFixtureHtml())};
      }
      if (${view.accessUsersExpandedFixture ? "true" : "false"}) {
        const row = document.querySelector("#adminAccessList .admin-access-row");
        if (row) {
          row.dataset.expanded = "true";
          row.querySelectorAll("[data-access-directory-toggle]").forEach((toggle) => toggle.setAttribute("aria-expanded", "true"));
        }
      }
      if (${view.adminCalendarFixture ? "true" : "false"}) {
        const engagementsView = document.querySelector("#adminEngagementsView");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        const card = document.querySelector("#adminEngagementsCalendarCard");
        const calendarActions = document.querySelector("#adminEngagementsCalendarActions");
        const refreshMeta = document.querySelector("#adminEngagementsRefreshMeta");
        const mount = document.querySelector("#adminEngagementsCalendarList");
        if (engagementsView) {
          engagementsView.dataset.engagementsMode = "admin";
          engagementsView.dataset.engagementsTab = "calendar";
        }
        if (viewTitle) viewTitle.textContent = "Compétitions à administrer";
        if (card) card.dataset.detailOpen = "false";
        if (calendarActions) calendarActions.hidden = false;
        if (refreshMeta) {
          refreshMeta.textContent = "Actualisé à 13:30";
          refreshMeta.hidden = false;
        }
        if (mount) mount.innerHTML = ${JSON.stringify(engagementCompetitionsFixtureHtml())};
      }
      if (${view.adminCreateFixture ? "true" : "false"}) {
        const engagementsView = document.querySelector("#adminEngagementsView");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        if (engagementsView) {
          engagementsView.dataset.engagementsMode = "admin";
          engagementsView.dataset.engagementsTab = "create";
        }
        if (viewTitle) viewTitle.textContent = "Créer une compétition";
        document.querySelectorAll("#adminEngagementsView [data-engagements-tab-panel]").forEach((panel) => {
          panel.hidden = panel.dataset.engagementsTabPanel !== "create";
        });
      }
      if (${view.adminDetailFixture ? "true" : "false"}) {
        const engagementsView = document.querySelector("#adminEngagementsView");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        const card = document.querySelector("#adminEngagementsCalendarCard");
        const close = document.querySelector("#adminEngagementsDetailClose");
        const detail = document.querySelector("#adminEngagementsDetail");
        if (engagementsView) {
          engagementsView.dataset.engagementsMode = "admin";
          engagementsView.dataset.engagementsTab = "calendar";
        }
        if (viewTitle) viewTitle.textContent = "Compétitions à administrer";
        if (card) card.dataset.detailOpen = "true";
        if (close) close.hidden = false;
        document.querySelector("#adminEngagementsCalendarActions")?.setAttribute("hidden", "");
        document.querySelector("#adminEngagementsCalendarFilters")?.setAttribute("hidden", "");
        document.querySelector("#adminEngagementsCalendarList")?.setAttribute("hidden", "");
        document.querySelector("#adminEngagementsRefreshButton")?.setAttribute("hidden", "");
        if (detail) detail.hidden = false;
        const detailEyebrow = document.querySelector("#adminEngagementsDetailEyebrow");
        const detailTitle = document.querySelector("#adminEngagementsDetailTitle");
        const detailSubtitle = document.querySelector("#adminEngagementsDetailSubtitle");
        if (detailEyebrow) detailEyebrow.hidden = true;
        if (detailTitle) detailTitle.textContent = "TEST LIVEPALMES";
        if (detailSubtitle) detailSubtitle.textContent = "15/08/2026 au 17/08/2026 · Houilles";
        const editState = document.querySelector("#adminEngagementsEditState");
        const level = document.querySelector("#adminEngagementsDetailLevel");
        const entryStatus = document.querySelector("#adminEngagementsDetailEntryStatus");
        if (editState) {
          editState.textContent = "Lecture seule";
          editState.hidden = false;
        }
        if (level) {
          level.textContent = "National";
          level.hidden = false;
        }
        if (entryStatus) {
          entryStatus.textContent = "Engagements ouverts";
          entryStatus.hidden = false;
        }
        const detailList = document.querySelector("#adminEngagementsDetailList");
        if (detailList) detailList.innerHTML = "<div><dt>Date</dt><dd>15/08/2026 au 17/08/2026</dd></div><div><dt>Lieu</dt><dd>Houilles</dd></div><div><dt>Bassin</dt><dd>50 m · 10 lignes d'eau</dd></div><div><dt>Programme</dt><dd>14 courses individuelles, 3 relais</dd></div>";
      }
      if (${JSON.stringify(view.name)} === "engagements") {
        const engagementsView = document.querySelector("#adminEngagementsView");
        const viewTitle = document.querySelector("#adminEngagementsViewTitle");
        const statusFilterLabel = document.querySelector("#adminEngagementsStatusFilterLabel");
        const statusSegments = document.querySelector("#adminEngagementsStatusSegments");
        const mount = document.querySelector("#adminEngagementsCalendarList");
        if (engagementsView) {
          engagementsView.dataset.engagementsMode = "club";
          engagementsView.dataset.engagementsTab = "calendar";
        }
        if (viewTitle) viewTitle.textContent = "Engagements en compétition";
        if (statusFilterLabel) statusFilterLabel.hidden = true;
        if (statusSegments) statusSegments.hidden = false;
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
      peopleAccordion: null,
      accessAccordion: null,
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
        if (${viewport.width <= 700 ? "true" : "false"}) {
          const mobileNav = document.querySelector("#adminEngagementsMobileStepNav");
          const current = document.querySelector("#adminEngagementsMobileStepCurrent");
          const menu = document.querySelector("#adminEngagementsMobileStepMenu");
          if (mobileNav) mobileNav.hidden = false;
          current?.click();
          result.tabKeyboard = Boolean(current?.getAttribute("aria-expanded") === "true" && menu && !menu.hidden);
          current?.click();
        } else {
          general.focus();
          general.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
          result.tabKeyboard = program.getAttribute("aria-selected") === "true" && document.activeElement === program;
          general.click();
        }
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
    if (${JSON.stringify(view.name)} === "club-officials" && ${viewport.width <= 700 ? "true" : "false"}) {
      const toggles = [...document.querySelectorAll("[data-engagement-club-person-directory-toggle]")];
      toggles[0]?.click();
      const firstOpened = toggles[0]?.getAttribute("aria-expanded") === "true" && toggles[0]?.closest("[data-expanded]")?.dataset.expanded === "true";
      toggles[1]?.click();
      result.peopleAccordion = Boolean(firstOpened && toggles[0]?.getAttribute("aria-expanded") === "false" && toggles[1]?.getAttribute("aria-expanded") === "true");
    }
    if (${JSON.stringify(view.name)} === "access-users" && ${viewport.width <= 760 ? "true" : "false"}) {
      const toggles = [...document.querySelectorAll(".admin-access-row-toggle[data-access-directory-toggle]")];
      toggles[0]?.click();
      const firstOpened = toggles[0]?.getAttribute("aria-expanded") === "true" && toggles[0]?.closest("[data-expanded]")?.dataset.expanded === "true";
      toggles[1]?.click();
      result.accessAccordion = Boolean(firstOpened && toggles[0]?.getAttribute("aria-expanded") === "false" && toggles[1]?.getAttribute("aria-expanded") === "true");
    }
    return result;
  `);
  const failures = [];
  if (audit.blocked.length) failures.push(`actions bloquees ${JSON.stringify(audit.blocked)}`);
  if (audit.delayedTouch.length) failures.push(`actions tactiles non optimisees ${JSON.stringify(audit.delayedTouch)}`);
  if (audit.covered.length) failures.push(`actions recouvertes ${JSON.stringify(audit.covered)}`);
  if (audit.removedComponents) failures.push(`${audit.removedComponents} composant(s) supprime(s) encore present(s)`);
  ["accountMenu", "mobileNavigation", "mobileParentNavigation", "overviewToggle", "overviewLink", "swimmerAccordion", "peopleAccordion", "accessAccordion", "distinctEngagementRoutes", "tabKeyboard", "accountProgressiveDisclosure"].forEach((key) => {
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
      overweightTableText: overweightTableText.slice(0, 12).map((element) => ({ tag: element.tagName, className: element.className || "", text: element.textContent.trim().slice(0, 36), weight: getComputedStyle(element).fontWeight })),
      overweightSelectedTabs: overweightSelectedTabs.slice(0, 12).map((element) => ({ id: element.id || "", text: element.textContent.trim().slice(0, 36), weight: getComputedStyle(element).fontWeight }))
    };
  `);
  if (audit.overflow) throw new Error(`${view.name}/${viewport.name} : debordement horizontal global.`);
  if (audit.emptyButtons || audit.unlabeledControls || audit.h1Count !== 1) {
    throw new Error(`${view.name}/${viewport.name} : structure accessible invalide ${JSON.stringify(audit)}.`);
  }
  if (audit.overweightTableText.length || audit.overweightSelectedTabs.length) {
    throw new Error(`${view.name}/${viewport.name} : graisse typographique excessive ${JSON.stringify(audit)}.`);
  }
  await auditInteractions(client, viewport, view);
  if (view.accessDialogFixture) {
    const dialogOpened = await evaluate(client, `
      const dialog = document.querySelector("#adminAccessPanel");
      const title = document.querySelector("#adminAccessDialogTitle");
      if (!dialog) return false;
      if (${JSON.stringify(view.accessDialogFixture)} === "edit") {
        if (title) title.textContent = "Modifier MARTIN Camille";
        const values = {
          adminAccessLastName: "MARTIN",
          adminAccessFirstName: "Camille",
          adminAccessEmail: "camille.martin@example.fr",
          adminAccessLicenseNumber: "A-00-000001"
        };
        Object.entries(values).forEach(([id, value]) => {
          const field = document.getElementById(id);
          if (field) field.value = value;
        });
      } else if (title) {
        title.textContent = "Ajouter un utilisateur";
      }
      dialog.showModal();
      return dialog.open;
    `);
    if (!dialogOpened) throw new Error(`${view.name}/${viewport.name} : ouverture de la fenêtre utilisateur impossible.`);
    await sleep(100);
  }
  if (view.swimmerCorrectionDialogFixture) {
    const dialogOpened = await evaluate(client, `
      const dialog = document.querySelector("#adminEngagementsSwimmerCorrectionDialog");
      if (!dialog) return false;
      const direct = ${JSON.stringify(view.swimmerCorrectionDialogFixture)} === "direct";
      const values = {
        adminEngagementsSwimmerCorrectionLastName: direct ? "MARTIN" : "MARTNI",
        adminEngagementsSwimmerCorrectionFirstName: "Camille",
        adminEngagementsSwimmerCorrectionBirthDate: "2008-03-13",
        adminEngagementsSwimmerCorrectionSex: "F",
        adminEngagementsSwimmerCorrectionLicense: "A-00-000001",
        adminEngagementsSwimmerCorrectionReason: "Correction vérifiée sur la licence fédérale."
      };
      Object.entries(values).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value;
      });
      const title = document.querySelector("#adminEngagementsSwimmerCorrectionTitle");
      const context = document.querySelector("#adminEngagementsSwimmerCorrectionContext");
      const submit = document.querySelector("#adminEngagementsSwimmerCorrectionSubmit");
      const reasonLabel = document.querySelector("#adminEngagementsSwimmerCorrectionReasonLabel");
      if (title) title.textContent = direct ? "Modifier le nageur" : "Demander une correction";
      if (context) context.textContent = "MARTIN Camille · Club Démonstration";
      if (submit) submit.textContent = direct ? "Enregistrer la correction" : "Envoyer la demande";
      if (reasonLabel) reasonLabel.textContent = direct ? "Motif de la correction" : "Motif de la demande";
      dialog.showModal();
      return dialog.open;
    `);
    if (!dialogOpened) throw new Error(`${view.name}/${viewport.name} : ouverture de la fenêtre de correction impossible.`);
    await sleep(100);
  }
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
