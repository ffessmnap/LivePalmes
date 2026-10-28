"use strict";
const assert = require("node:assert/strict");
const fs = require("./helpers/source-files");
const path = require("node:path");
const vm = require("node:vm");
const server = fs.readFileSync(path.join(__dirname, "../functions/index.js"), "utf8");
const client = fs.readFileSync(path.join(__dirname, "../assets/livepalmes-admin-portal.js"), "utf8");
const callableStart = server.indexOf("exports.generateEngagementCompetitionTxtExport =");
const callable = server.slice(callableStart, server.indexOf("exports.listEngagementCompetitionMailJobs =", callableStart));
function clientFunction(name) {
  const match = client.match(new RegExp(`^  (?:async )?function ${name}\\([^]*?^  \\}`, "m"));
  assert.ok(match, name);
  return match[0];
}
const clientCode = ["canDownloadEngagementOpenWaterTxt", "renderEngagementDocuments", "generateEngagementAdminTxtExport"].map(clientFunction).join("\n");
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
const course = { id_course: 120, course: "1500", sexe: "M", relais: 0, wplabel: "LD1500", longueur: 1500,
  style: "SF", type_: 1, nbnageur: 1, mixte: 0, ld: 1, actif: 1, validation: 1 };
const competition = { id: "legacy-nap-4982", napSource: true, name: "Compétition fictive", date: "2026-11-01", regionId: "2",
  competitionType: "openWater", events: [{ code: "OW1500SF", type: "individual", nativeCourses: [course] }] };
const entries = [{ clubId: "1", clubCode: "TEST", swimmers: [{ firstName: "Test", lastName: "Nageur", birthDate: "2000-01-01",
  sex: "M", swimmerIndexId: "1", individualEntries: [{ eventCode: "OW1500SF" }] }], officials: [], relays: [] }];
function backend(projectId, event = competition, denied = false) {
  const queries = [], builds = [];
  const context = { exports: {}, Buffer, process: { env: {} }, CALLABLE_OPTIONS: {}, ENVIRONMENT: { sportingDataSource: "nap", projectId },
    defineSecret: x => x, onCall: (_options, handler) => handler, cleanText: x => String(x || "").trim(), HttpsError,
    engagementAccessContext: async () => ({ uid: "fixture" }),
    nativeAdminCompetitionEntries: async () => {
      if (denied) throw new HttpsError("permission-denied", "Compétition hors périmètre.");
      return { competition: event, entries, clubsById: new Map([["1", { clubCode: "TEST", federalNumber: "07780252", regionId: "2" }]]), sqlBudget: { queriesMax: 24 }, generatedAt: "fixture" };
    },
    engagementClubEntryHasParticipants: () => true, engagementTxtSwimmerCategory: () => "S", engagementPdfFileName: () => "fixture",
    buildEngagementCompetitionTxt: () => { builds.push("pool"); return { buffer: Buffer.from("pool fixture"), fileName: "pool.txt" }; },
    require: name => name === "./nap-portal-swimmers" ? { portalPool: () => ({ execute: async (query) => {
      queries.push(query.sql);
      assert.match(query.sql, /SELECT .* FORCE INDEX \(PRIMARY\)/);
      return query.sql.includes("FROM competitions ") ? [[{ id: Number(String(event.id).replace(/^legacy-nap-/, "")), date: event.date, comite: 2 }]] : [[{ ...course, id: course.id_course }]];
    } }) } : require(path.join(__dirname, "../functions", name))
  };
  vm.createContext(context); vm.runInContext(callable, context);
  return { context, invoke: () => context.exports.generateEngagementCompetitionTxtExport({ data: { competitionId: event.id } }), queries, builds };
}
function frontend(event = competition, isTest = false, result) {
  const downloads = [], calls = [];
  const context = { global: { LivePalmesEnvironment: { isTest, sportingDataSource: "nap" } }, selectedEngagementCompetition: event,
    selectedEngagementCompetitionId: event.id, isEngagementAdminMode: () => true, engagementCompetitionType: x => x.competitionType,
    elements: { engagementsGenerateTxtExportButton: {}, engagementsDocumentsSummary: { dataset: {} } },
    renderEngagementSharedDocuments: () => {}, renderEngagementClubRecapSelector: () => {}, renderEngagementMailJobs: () => {},
    callFunction: async (name, input) => { calls.push({ name, input }); if (result instanceof Error) throw result; return result; },
    downloadBase64File: (...args) => downloads.push(args)
  };
  vm.createContext(context); vm.runInContext(clientCode, context); context.renderEngagementDocuments(event);
  return { context, calls, downloads };
}
async function main() {
  const before = JSON.stringify([competition, entries]);
  const references = new Map();
  for (const project of ["livepalmes", "livepalmes-test"]) {
    for (const id of ["5136", "legacy-nap-5136", "4982", "legacy-nap-4982", "4903", "15136"]) {
      const event = { ...competition, id }, serverFixture = backend(project, event), result = await serverFixture.invoke();
      assert.equal(serverFixture.queries.length, 2); assert.equal(result.sqlBudget.queriesMax, 26);
      assert.equal(result.fromStorage, false);
      const text = Buffer.from(result.txtBase64, "base64").toString("utf8");
      assert.ok(text.includes(`WID;CSNA20261101${id.replace(/^legacy-nap-/, "")};`)); assert.match(text, /DIS;LD1500;/);
      // The only variable field is the generator timestamp.
      const stableText = text.split("\r\n").slice(1).join("\r\n");
      if (references.has(id)) assert.equal(stableText, references.get(id), "Same generator and bytes on TEST and PROD");
      else references.set(id, stableText);
      const ui = frontend(event, project.endsWith("-test"), result);
      assert.equal(ui.context.elements.engagementsGenerateTxtExportButton.disabled, false);
      await ui.context.generateEngagementAdminTxtExport();
      assert.equal(ui.calls.length, 1); assert.equal(ui.calls[0].name, "generateEngagementCompetitionTxtExport");
      assert.equal(ui.calls[0].input.competitionId, id); assert.equal(ui.downloads[0][0], result.txtBase64);
      assert.match(ui.context.elements.engagementsDocumentsSummary.textContent, /téléchargé pour 1 club/);
    }
  }
  for (const project of ["livepalmes", "livepalmes-test"]) {
    const malformed = backend(project, { ...competition, id: "5136x" });
    await assert.rejects(malformed.invoke(), e => e.code === "failed-precondition");
    assert.equal(malformed.queries.length, 0, "Invalid native ID rejected before SQL");
    const unsupported = backend(project, { ...competition, competitionType: "unknown" });
    await assert.rejects(unsupported.invoke(), e => e.code === "failed-precondition");
    assert.equal(unsupported.queries.length, 0);
  }
  const legacy = frontend({ ...competition, napSource: false });
  await legacy.context.generateEngagementAdminTxtExport(); assert.equal(legacy.calls.length, 0);
  assert.equal(legacy.context.elements.engagementsGenerateTxtExportButton.disabled, true);
  assert.match(legacy.context.elements.engagementsDocumentsSummary.textContent, /issue de NAP/);
  const legacyServer = backend("livepalmes"); legacyServer.context.ENVIRONMENT.sportingDataSource = "firestore";
  legacyServer.context.db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => competition }) }) }) };
  legacyServer.context.cleanEngagementCompetitionType = x => x;
  await assert.rejects(legacyServer.invoke(), e => e.code === "failed-precondition");
  const club = frontend(); club.context.isEngagementAdminMode = () => false;
  await club.context.generateEngagementAdminTxtExport(); assert.equal(club.calls.length, 0);
  const denied = backend("livepalmes", competition, true);
  await assert.rejects(denied.invoke(), e => e.code === "permission-denied"); assert.equal(denied.queries.length, 0);
  const anonymous = backend("livepalmes");
  anonymous.context.engagementAccessContext = async () => { throw new HttpsError("unauthenticated", "Session requise."); };
  await assert.rejects(anonymous.invoke(), e => e.code === "unauthenticated"); assert.equal(anonymous.queries.length, 0);
  const pool = backend("livepalmes", { ...competition, id: "999", competitionType: "pool" });
  assert.equal(Buffer.from((await pool.invoke()).txtBase64, "base64").toString(), "pool fixture"); assert.equal(pool.queries.length, 0);
  const invalid = backend("livepalmes", { ...competition, events: [] });
  await assert.rejects(invalid.invoke(), e => e.code === "failed-precondition" && /Programme eau libre absent/.test(e.message));
  for (const failure of [Error("Compétition hors périmètre."), {}]) {
    const ui = frontend(competition, false, failure); await ui.context.generateEngagementAdminTxtExport();
    assert.equal(ui.downloads.length, 0); assert.equal(ui.context.elements.engagementsGenerateTxtExportButton.disabled, false);
    assert.match(ui.context.elements.engagementsDocumentsSummary.textContent, /Téléchargement TXT impossible/);
  }
  assert.equal(JSON.stringify([competition, entries]), before, "No mutation of sporting data");
  console.log("Manual WinPalme: all native water competitions TEST/PROD, unchanged bytes, invalid IDs/types, authentication, permissions, pool, unknown courses and visible errors; no network or writes.");
  if (process.argv.includes("--browser")) await browserTest();
}
async function browserTest() {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ headless: true, ...(process.env.LIVEPALMES_BROWSER_EXECUTABLE ? { executablePath: process.env.LIVEPALMES_BROWSER_EXECUTABLE } : {}) });
  const html = fs.readFileSync(path.join(__dirname, "../portail.html"), "utf8");
  const panel = html.slice(html.indexOf('<div id="adminEngagementsDetailDocumentsPanel"'), html.indexOf('<div id="adminEngagementsDetailDeliveryPanel"')).replace(' hidden>', '>');
  try {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, acceptDownloads: true }), errors = [], calls = [];
      const result = await backend("livepalmes").invoke(); let denied = false;
      page.on("pageerror", e => errors.push(e.message));
      await page.exposeFunction("fixtureExport", async (name, input) => { calls.push({ name, input }); if (denied) throw Error("Compétition hors périmètre."); return result; });
      await page.route("**/*", route => route.abort());
      await page.route("https://fixture.test/", route => route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="fr"><meta charset="utf-8"><body class="admin-portal-page"><main style="padding:16px">${panel}</main></body></html>` }));
      await page.goto("https://fixture.test/");
      for (const file of ["styles.css", "assets/livepalmes-admin-portal.css"]) await page.addStyleTag({ path: file });
      await page.evaluate(event => {
        window.global = window; window.LivePalmesEnvironment = { isTest: false, sportingDataSource: "nap" };
        window.selectedEngagementCompetition = event; window.selectedEngagementCompetitionId = event.id;
        window.isEngagementAdminMode = () => true; window.engagementCompetitionType = x => x.competitionType;
        window.elements = {};
        for (const key of ["engagementsGenerateTxtExportButton", "engagementsDocumentsSummary", "engagementsDocumentsTitle"])
          window.elements[key] = document.querySelector("#admin" + key[0].toUpperCase() + key.slice(1));
        window.renderEngagementSharedDocuments = window.renderEngagementClubRecapSelector = window.renderEngagementMailJobs = () => {};
        window.callFunction = (name, input) => fixtureExport(name, input);
      }, competition);
      await page.addScriptTag({ content: clientCode + "\n" + clientFunction("downloadBase64File") });
      await page.evaluate(() => { renderEngagementDocuments(); elements.engagementsGenerateTxtExportButton.addEventListener("click", generateEngagementAdminTxtExport); });
      assert.equal(calls.length, 0, "No initial reads");
      const button = page.getByRole("button", { name: "Télécharger le TXT WinPalme" }); assert.equal(await button.isEnabled(), true);
      const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
      assert.deepEqual(fs.readFileSync(await download.path()), Buffer.from(result.txtBase64, "base64"));
      await page.getByText("Export WinPalme téléchargé pour 1 club.", { exact: true }).waitFor();
      assert.equal(calls.length, 1); denied = true; await button.click();
      await page.getByText("Téléchargement TXT impossible : Compétition hors périmètre.", { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(errors, []); await page.close();
    }
    console.log("Manual WinPalme browser: real GED/button/download, exact TXT bytes, PROD environment, visible refusal, 1440/390/320 px; all network blocked.");
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
