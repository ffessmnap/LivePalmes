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
  programSessions: [{ label: "Réunion 1", date: "2026-10-03", startTime: "09:00", endTime: "12:00", summary: "Accueil et pratique" }],
  clubDocuments: [{ id: "doc-1", title: "Programme", fileName: "programme.pdf", storagePath: "competition-documents/x", url: "https://example.test/programme.pdf", size: 12 }]
}, { id: "event-1", sourceType: "calendarEvent" });
assert.equal(detail.eventType, "stage");
assert.equal(detail.program[0].title, "Réunion 1");
assert.equal(detail.program[0].summary, "Accueil et pratique");
assert.equal(detail.documents[0].url, "https://example.test/programme.pdf");
assert.equal(calendar.cleanPublicCalendarUrl("javascript:alert(1)"), "");
assert.equal(calendar.cleanPublicCalendarUrl("https://example.test/inscriptions"), "https://example.test/inscriptions");

const browserSource = fs.readFileSync(path.join(root, "assets", "public", "livepalmes-public-calendar.js"), "utf8");
const browserContext = { window: {}, Date, URL, console };
vm.runInNewContext(browserSource, browserContext);
const browserCalendar = browserContext.window.LivePalmesPublicCalendar;
assert.equal(browserCalendar.status(ongoing, "2026-08-19"), "ongoing");
assert.equal(browserCalendar.TYPE_LABELS.training, "Formation");
assert.equal(browserCalendar.seasonLabel(2027), "2026-2027");

for (const file of ["calendrier.html", "competition.html"]) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  assert.ok(html.includes("livepalmes-public-calendar.js"));
  assert.ok(html.includes("livepalmes-public-calendar.css"));
  assert.ok(html.includes("Une erreur ou un bug à signaler ?"));
  assert.ok(html.includes("mailto:livepalmes@nap-ffessm.fr"));
}

const portalHtml = fs.readFileSync(path.join(root, "portail.html"), "utf8");
assert.ok(portalHtml.includes('value="training"'));
assert.ok(portalHtml.includes("livepalmes-admin-calendar-events.js"));
assert.ok(portalHtml.includes("Ces documents sont publics"));

const calendarCss = fs.readFileSync(path.join(root, "assets", "public", "livepalmes-public-calendar.css"), "utf8");
assert.ok(calendarCss.includes(".public-calendar-page .public-footer"));
assert.ok(calendarCss.includes("text-align:center"));

console.log("Public calendar tests OK");
