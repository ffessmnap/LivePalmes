const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const calendar = require(path.join(root, "functions", "public-calendar.js"));

const ongoing = { id: "ongoing", name: "National", date: "2026-08-19", endDate: "2026-08-20" };
const upcoming = { id: "upcoming", name: "Régional", date: "2026-09-01", endDate: "2026-09-01" };
const finished = { id: "finished", name: "Départemental", date: "2026-08-01", endDate: "2026-08-01" };
const canceled = { ...upcoming, id: "canceled", canceled: true };
const results = { ...finished, id: "results", resultsPublishedAt: "2026-08-02T10:00:00Z" };

assert.equal(calendar.publicCalendarDisplayStatus(ongoing, "2026-08-19"), "ongoing");
assert.equal(calendar.publicCalendarDisplayStatus(upcoming, "2026-08-19"), "upcoming");
assert.equal(calendar.publicCalendarDisplayStatus(finished, "2026-08-19"), "awaitingResults");
assert.equal(calendar.publicCalendarDisplayStatus(canceled, "2026-08-19"), "canceled");
assert.equal(calendar.publicCalendarDisplayStatus(results, "2026-08-19"), "resultsPublished");
assert.deepEqual([finished, upcoming, ongoing].sort((a, b) => calendar.comparePublicCalendarEvents(a, b, "2026-08-19")).map((item) => item.id), ["ongoing", "upcoming", "finished"]);

const detail = calendar.publicCalendarDetail({
  name: "Stage régional",
  date: "2026-10-03",
  city: "Lyon",
  eventType: "stage",
  level: "regional",
  publicationStatus: "published",
  programSessions: [{ label: "Session 1", date: "2026-10-03", startTime: "09:00", endTime: "12:00", summary: "Accueil et pratique" }],
  clubDocuments: [{ id: "doc-1", title: "Programme", fileName: "programme.pdf", storagePath: "competition-documents/x", url: "https://example.test/programme.pdf", size: 12 }]
}, { id: "event-1", sourceType: "calendarEvent" });
assert.equal(detail.eventType, "stage");
assert.equal(detail.program[0].title, "Session 1");
assert.equal(detail.program[0].summary, "Accueil et pratique");
assert.equal(detail.documents[0].url, "https://example.test/programme.pdf");
const legacyDetail = calendar.publicCalendarDetail({
  name: "Historique",
  date: "2025-10-12",
  city: "Cherbourg",
  eventType: "openWater",
  level: "regional",
  publicationStatus: "published",
  clubDocuments: [{ id: "nap-5760", title: "Invitation", fileName: "invitation.pdf", url: "https://nap.ffessm.fr/ged/2026/5067/invitation.pdf" }]
}, { id: "legacy-nap-5067", sourceType: "calendarEvent" });
assert.equal(legacyDetail.eventType, "openWater");
assert.equal(legacyDetail.documents[0].url, "https://nap.ffessm.fr/ged/2026/5067/invitation.pdf");
const practicalDetail = calendar.publicCalendarDetail({
  name: "Piscine historique",
  date: "2025-10-12",
  city: "Tours",
  eventType: "pool",
  level: "regional",
  publicationStatus: "published",
  poolLength: "50",
  poolLaneCount: 8,
  timingType: "electronic"
}, { id: "legacy-nap-pool", sourceType: "calendarEvent" });
assert.equal(practicalDetail.poolLength, "50");
assert.equal(practicalDetail.poolLaneCount, 8);
assert.equal(practicalDetail.timingType, "electronic");
const protocolDetail = calendar.publicCalendarDetail({
  name: "Résultats historiques",
  date: "2025-10-12",
  city: "Cherbourg",
  eventType: "pool",
  level: "regional",
  publicationStatus: "published",
  clubDocuments: [{ id: "nap-5761", title: "Protocole complet", category: "results", fileName: "protocole.pdf", url: "https://nap.ffessm.fr/ged/2026/5067/protocole.pdf", updatedAt: "2025-10-12T20:00:00.000Z" }]
}, { id: "legacy-nap-5067-results", sourceType: "calendarEvent" });
assert.equal(protocolDetail.documents.length, 0);
assert.equal(protocolDetail.results.pdfUrl, "https://nap.ffessm.fr/ged/2026/5067/protocole.pdf");
assert.equal(calendar.publicCalendarDisplayStatus(protocolDetail, "2026-08-20"), "resultsPublished");
assert.equal(calendar.cleanPublicCalendarUrl("javascript:alert(1)"), "");
assert.equal(calendar.cleanPublicCalendarUrl("https://example.test/inscriptions"), "https://example.test/inscriptions");

const competitionDetail = calendar.publicCalendarDetail({
  name: "Championnat régional",
  date: "2026-10-03",
  competitionType: "pool",
  programSessions: [
    { items: [{ eventCode: "100SF", genderMode: "female", phase: "heats" }] },
    { items: [{ eventCode: "100SF", genderMode: "female", phase: "final" }] }
  ]
}, { id: "competition-1", sourceType: "competition", eventLabelByCode: { "100SF": "100 m Surface" } });
assert.equal(competitionDetail.program[0].items[0].detail, "Femmes · Séries");
assert.equal(competitionDetail.program[1].items[0].detail, "Femmes · Finale(s)");

const browserSource = fs.readFileSync(path.join(root, "assets", "public", "livepalmes-public-calendar.js"), "utf8");
const competitionPageSource = fs.readFileSync(path.join(root, "assets", "pages", "competition.js"), "utf8");
const calendarPageSource = fs.readFileSync(path.join(root, "assets", "pages", "calendrier.js"), "utf8");
const browserContext = { window: {}, Date, URL, console };
vm.runInNewContext(browserSource, browserContext);
const browserCalendar = browserContext.window.LivePalmesPublicCalendar;
assert.equal(browserCalendar.status(ongoing, "2026-08-19"), "ongoing");
assert.equal(browserCalendar.TYPE_LABELS.training, "Formation");
assert.equal(browserCalendar.seasonLabel(2027), "2026-2027");
assert.ok(!calendarPageSource.includes("function compareByDateDescending"));
assert.ok(calendarPageSource.includes("function isCurrentOrUpcoming"));
assert.ok(calendarPageSource.includes("calendar-past-section"));
assert.ok(calendarPageSource.includes("Depuis le début de la saison"));
assert.ok(calendarPageSource.includes("nodes.historyLink.hidden = !past.length"));
assert.ok(calendarPageSource.includes('id="calendarSeasonHistory"'));
assert.ok(!calendarPageSource.includes("<details class=\"calendar-past-section\""));
assert.ok(calendarPageSource.includes("const sorted = chosen.sort(api.compare)"));
assert.ok(calendarPageSource.includes("selectedSeasonEndYear !== currentSeasonEndYear"));
assert.ok(!calendarPageSource.includes("nodes.period"));
assert.ok(calendarPageSource.includes("function displayStatus(event)"));
assert.ok(calendarPageSource.includes('status === "awaitingResults" ? "" : status'));
assert.ok(competitionPageSource.includes("const timingLabels={manual:\"Manuel\",electronic:\"Électronique\"}"));
assert.ok(competitionPageSource.includes("Lignes d’eau"));
assert.ok(competitionPageSource.includes('<h2>Documents</h2>'));
assert.ok(!competitionPageSource.includes("Documents officiels"));
assert.ok(competitionPageSource.includes("calendar-results-banner"));
assert.ok(competitionPageSource.includes("calendar-detail-hero-content"));
assert.ok(!competitionPageSource.includes("Retrouvez les résultats de cette compétition."));
assert.ok(!competitionPageSource.includes("Résultats disponibles"));
assert.ok(competitionPageSource.includes("Télécharger le protocole"));
assert.ok(competitionPageSource.includes('pool:"Compétition piscine"'));
assert.ok(competitionPageSource.includes('openWater:"Compétition eau libre"'));
assert.ok(competitionPageSource.includes("Niveau ${String(label).toLocaleLowerCase"));
assert.ok(competitionPageSource.includes('month:"long"'));
assert.ok(competitionPageSource.includes("calendar-entry-link"));
assert.ok(competitionPageSource.includes('state==="resultsPublished"'));
assert.ok(competitionPageSource.indexOf("resultsHtml(event.results)") < competitionPageSource.indexOf("calendar-detail-grid"));
assert.ok(competitionPageSource.indexOf("Informations pratiques") < competitionPageSource.indexOf('<h2>Documents</h2>'));
assert.ok(competitionPageSource.indexOf('<h2>Documents</h2>') < competitionPageSource.indexOf('<h2>Programme</h2>'));

for (const file of ["calendrier.html", "competition.html"]) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  assert.ok(html.includes("livepalmes-public-calendar.js"));
  assert.ok(html.includes("livepalmes-public-calendar.css"));
  assert.ok(html.includes("Une erreur ou un bug à signaler ?"));
  assert.ok(html.includes("mailto:livepalmes@nap-ffessm.fr"));
}
const competitionHtml = fs.readFileSync(path.join(root, "competition.html"), "utf8");
assert.ok(competitionHtml.includes("LivePalmes – Calendrier fédéral"));
assert.ok(competitionHtml.includes('href="calendrier.html"'));
assert.ok(!competitionHtml.includes("calendar-detail-back"));
const calendarHtml = fs.readFileSync(path.join(root, "calendrier.html"), "utf8");
assert.ok(calendarHtml.includes("LivePalmes – Calendrier fédéral"));
assert.ok(!calendarHtml.includes('id="calendarPeriod"'));

const portalHtml = fs.readFileSync(path.join(root, "portail.html"), "utf8");
assert.ok(portalHtml.includes('value="training"'));
assert.ok(portalHtml.includes("livepalmes-admin-calendar-events.js"));
assert.ok(portalHtml.includes("Ces documents sont publics"));

const functionsSource = fs.readFileSync(path.join(root, "functions", "index.js"), "utf8");
const competitionSyncStart = functionsSource.indexOf("async function syncEngagementCompetitionCalendarFromChange");
const competitionSyncEnd = functionsSource.indexOf("exports.syncEngagementCompetitionToCalendar", competitionSyncStart);
const competitionSyncSource = functionsSource.slice(competitionSyncStart, competitionSyncEnd);
assert.ok(competitionSyncSource.includes("await db.runTransaction"));
assert.ok(competitionSyncSource.includes("const currentSnapshot = await transaction.get(sourceRef)"));
assert.ok(competitionSyncSource.includes("current && currentSeason === endYear"));
assert.ok(functionsSource.includes('publishPublicCalendarChange(event, "competition", resolvedChange)'));
assert.ok(functionsSource.includes("exports.rebuildEngagementCompetitionCalendars"));
assert.ok(functionsSource.includes("variableDocumentsMax: endYears.length * 1200"));

const calendarCss = fs.readFileSync(path.join(root, "assets", "public", "livepalmes-public-calendar.css"), "utf8");
assert.ok(calendarCss.includes(".public-calendar-page .public-footer"));
assert.ok(calendarCss.includes("text-align:center"));
assert.ok(calendarCss.includes("grid-template-columns:minmax(0,1.4fr) minmax(300px,1fr)"));
assert.ok(calendarCss.includes(".calendar-entry-note"));
assert.ok(calendarCss.includes(".calendar-documents-card"));
assert.ok(calendarCss.includes(".calendar-results-banner"));
assert.ok(calendarCss.includes("grid-template-columns:minmax(0,1fr) auto"));
assert.ok(calendarCss.includes(".calendar-past-section"));
assert.ok(competitionPageSource.indexOf("Accéder aux engagements LivePalmes") < competitionPageSource.indexOf("Les engagements sont effectués exclusivement"));

console.log("Public calendar tests OK");
