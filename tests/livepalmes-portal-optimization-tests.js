const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const portal = read("assets/livepalmes-admin-portal.js");
const calendarEvents = read("assets/livepalmes-admin-calendar-events.js");
const portalAuth = read("assets/livepalmes-admin-auth.js");
const dtn = read("assets/livepalmes-dtn-qualifications.js");
const portalCss = read("assets/livepalmes-admin-portal.css");
const portalUx = read("assets/livepalmes-portal-ux.js");
const portalHtml = read("portail.html");
const records = read("performances/public/admin-records.js");
const imports = read("performances/public/import-competitions.js");
const publicSeries = read("assets/pages/series-public.js");
const publicResults = read("assets/pages/resultats.js");
const functions = read("functions/index.js");
const firebase = JSON.parse(read("firebase.json"));
const indexes = JSON.parse(read("firestore.indexes.json"));
const functionsClubReference = JSON.parse(read("functions/assets/club-reference.json"));
const clubReferenceGenerator = read("tools/build-admin-club-reference.js");
const publicPerformanceGenerator = read("tools/build-public-performance-files.js");
const clubReferenceSource = read("performances/public/data/club-reference.js");
[
  "Modifications non enregistrees",
  "Etape chef d'equipe",
  "Renonciation au droit de reclamation",
  "Competition creee",
  "Parametres enregistres",
  "Aucune epreuve selectionnee",
  "Region non renseignee",
  "Email de reinitialisation envoye",
  "Selectionnez une competition",
  "A choisir"
].forEach((legacyLabel) => {
  assert.equal(portal.includes(legacyLabel), false, `Libellé sans accents encore présent : ${legacyLabel}`);
});
[
  "Étape chef d'équipe validée.",
  "Renonciation au droit de réclamation confirmée.",
  "Compétition créée",
  "Paramètres enregistrés",
  "Aucune épreuve sélectionnée",
  "Région non renseignée",
  "E-mail de réinitialisation envoyé",
  "Sélectionnez une compétition",
  "À choisir"
].forEach((expectedLabel) => {
  assert.ok(portal.includes(expectedLabel), `Libellé français attendu absent : ${expectedLabel}`);
});
assert.ok(portal.includes("function normalizePortalFrenchError(error)"));
assert.ok(portal.includes("throw normalizePortalFrenchError(error)"));
const frenchErrorNormalizationStart = portal.indexOf("const PORTAL_FRENCH_ERROR_REPLACEMENTS");
const frenchErrorNormalizationEnd = portal.indexOf("async function callFunction", frenchErrorNormalizationStart);
const frenchErrorNormalizationSandbox = {};
vm.runInNewContext(`${portal.slice(frenchErrorNormalizationStart, frenchErrorNormalizationEnd)}
  const sourceError = new Error("Acces desactive : competition deja supprimee.");
  sourceError.code = "functions/failed-precondition";
  result = normalizePortalFrenchError(sourceError);
`, frenchErrorNormalizationSandbox);
assert.equal(frenchErrorNormalizationSandbox.result.message, "Accès désactivé : compétition déjà supprimée.");
assert.equal(frenchErrorNormalizationSandbox.result.code, "functions/failed-precondition");
const { mergeRosterSwimmers } = require(path.join(root, "tools", "dedupe-engagement-club-rosters.js"));
const { initialActivityStatus } = require(path.join(root, "tools", "initialize-engagement-club-swimmer-activity.js"));
assert.equal(initialActivityStatus("2023-08-31"), "inactive");
assert.equal(initialActivityStatus("2023-09-01"), "active");
assert.equal(initialActivityStatus("2026-08-31"), "active");
assert.equal(initialActivityStatus("2026-09-01"), "inactive");
const mergedRosterFixture = mergeRosterSwimmers({
  reference: {
    id: "14908", swimmerIndexId: "14908", swimmerId: "14908", source: "reference",
    identityKey: "DUQUESNE FRESSON|EMILIEN|2005-03-09", firstName: "Emilien", lastName: "DUQUESNE FRESSON",
    birthDate: "2005-03-09", sex: "M", clubId: "106", licenseNumber: "A-19-839274", performanceCount: 18
  },
  performances: {
    id: "performance-index", swimmerIndexId: "performance-index", swimmerId: "14908", source: "performances",
    identityKey: "DUQUESNE FRESSON|EMILIEN|2005-03-09", firstName: "Emilien", lastName: "DUQUESNE FRESSON",
    birthDate: "2005-03-09", sex: "M", clubId: "106", licenseNumber: "A-19-839274", performanceCount: 0
  },
  other: {
    id: "other", swimmerIndexId: "other", swimmerId: "15000", source: "performances",
    identityKey: "AUTRE|NAGEUR|2005-01-01", firstName: "Nageur", lastName: "AUTRE", birthDate: "2005-01-01", sex: "M", clubId: "106"
  }
});
const mergedRosterItems = Object.values(mergedRosterFixture.entries);
assert.equal(mergedRosterFixture.beforeCount, 3);
assert.equal(mergedRosterFixture.afterCount, 2);
assert.equal(mergedRosterItems.find((item) => item.swimmerId === "14908")?.source, "performances");
assert.equal(mergedRosterItems.find((item) => item.swimmerId === "14908")?.swimmerIndexId, "performance-index");
assert.equal(mergedRosterItems.find((item) => item.swimmerId === "14908")?.performanceCount, 18);
const sandbox = { window: {} };
vm.runInNewContext(clubReferenceSource, sandbox);
const engagementNavigationModeStart = portal.indexOf("function engagementNavigationMode");
const engagementNavigationModeEnd = portal.indexOf("function engagementNationalPageTitle", engagementNavigationModeStart);
const engagementNavigationModeFunction = portal.slice(engagementNavigationModeStart, engagementNavigationModeEnd);
const engagementNavigationModeSandbox = {};
vm.runInNewContext(`${engagementNavigationModeFunction}
  result = {
    club: engagementNavigationMode("club"),
    clubDirectory: engagementNavigationMode("clubSwimmers"),
    regionalAdmin: engagementNavigationMode("adminCalendar"),
    nationalAdmin: engagementNavigationMode("adminDeletionRequests")
  };`, engagementNavigationModeSandbox);
const engagementRoutePolicyStart = portal.indexOf("function canAccessEngagementRoute");
const engagementRoutePolicyEnd = portal.indexOf("function canManageAccessDirectory", engagementRoutePolicyStart);
const engagementRoutePolicyFunctions = portal.slice(engagementRoutePolicyStart, engagementRoutePolicyEnd);
function evaluateEngagementRoutePolicy(capabilities) {
  const sandbox = {};
  vm.runInNewContext(`
    const capabilities = new Set(${JSON.stringify(capabilities)});
    const canUse = (capability) => capabilities.has(capability);
    const canCreateEngagementCompetition = () => canUse("engagements.region.manage") || canUse("engagements.national.manage");
    const canDeleteEngagementCompetitionDirectly = () => canUse("engagements.national.manage");
    const canReviewEngagementAccessRequests = () => canUse("engagements.region.manage") || canUse("engagements.national.manage");
    const canViewActivityLog = () => canUse("admin.full");
    ${engagementRoutePolicyFunctions}
    result = {
      club: canAccessEngagementRoute("club"),
      clubSwimmers: canAccessEngagementRoute("clubSwimmers"),
      adminCalendar: canAccessEngagementRoute("adminCalendar"),
      adminAccessRequests: canAccessEngagementRoute("adminAccessRequests"),
      adminDeletionRequests: canAccessEngagementRoute("adminDeletionRequests"),
      adminAudit: canAccessEngagementRoute("adminAudit"),
      unknown: canAccessEngagementRoute("unknown"),
      fallback: preferredEngagementRouteHash()
    };
  `, sandbox);
  return JSON.parse(JSON.stringify(sandbox.result));
}
const filteredEngagementCompetitionsStart = portal.indexOf("function engagementCalendarSeptemberPreview");
const filteredEngagementCompetitionsEnd = portal.indexOf("function renderCurrentUser", filteredEngagementCompetitionsStart);
const filteredEngagementCompetitionsFunction = portal.slice(filteredEngagementCompetitionsStart, filteredEngagementCompetitionsEnd);
const filteredEngagementCompetitionsSandbox = {};
vm.runInNewContext(`
  const engagementCompetitions = [
    { id: "closed-old", entryStatus: "closed", date: "2026-01-10", name: "Fermée ancienne" },
    { id: "upcoming", entryStatus: "upcoming", date: "2026-03-10", name: "À venir" },
    { id: "open-late", entryStatus: "open", date: "2026-04-10", entryDeadlineAt: "2026-04-01T20:00:00Z", name: "Ouverte tardive" },
    { id: "closed-recent", entryStatus: "closed", date: "2026-02-10", name: "Fermée récente" },
    { id: "open-urgent", entryStatus: "open", date: "2026-05-10", entryDeadlineAt: "2026-03-20T20:00:00Z", name: "Ouverte urgente" },
    { id: "next-september", entryStatus: "open", date: "2026-09-12", entryDeadlineAt: "2026-09-05T20:00:00Z", name: "Saison suivante" },
    { id: "next-october", entryStatus: "open", date: "2026-10-03", entryDeadlineAt: "2026-09-25T20:00:00Z", name: "Hors aperçu" }
  ];
  const currentEngagementSeasonStartYear = (date = new Date()) => date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  const engagementCalendarFiltersPayload = () => ({ startYear: 2025, startDate: "2025-09-01", endDate: "2026-08-31", regionId: "", level: "", entryStatus: "", mineOnly: false });
  const canonicalLivePalmesRegion = (value) => value || "";
  const canEditEngagementCompetition = () => true;
  ${filteredEngagementCompetitionsFunction}
  result = {
    competitions: filteredEngagementCompetitions().map((competition) => competition.id),
    augustPreview: engagementCalendarSeptemberPreview(engagementCalendarFiltersPayload(), new Date("2026-08-11T12:00:00")),
    julyPreview: engagementCalendarSeptemberPreview(engagementCalendarFiltersPayload(), new Date("2026-07-11T12:00:00")),
    otherSeasonPreview: engagementCalendarSeptemberPreview({ ...engagementCalendarFiltersPayload(), startYear: 2024 }, new Date("2026-08-11T12:00:00"))
  };
`, filteredEngagementCompetitionsSandbox);
const differentialEntriesStart = functions.indexOf("exports.saveEngagementClubIndividualEntries");
const differentialEntriesEnd = functions.indexOf("exports.saveEngagementClubSwimmerSelection", differentialEntriesStart);
const differentialEntriesFunction = functions.slice(differentialEntriesStart, differentialEntriesEnd);
const swimmerSelectionStart = functions.indexOf("exports.saveEngagementClubSwimmerSelection");
const swimmerSelectionEnd = functions.indexOf("exports.saveEngagementClubSwimmers", swimmerSelectionStart);
const swimmerSelectionFunction = functions.slice(swimmerSelectionStart, swimmerSelectionEnd);
const closeCompetitionDetailStart = portal.indexOf("function closeEngagementCompetitionDetail");
const closeCompetitionDetailEnd = portal.indexOf("async function loadEngagementCompetitionDetail", closeCompetitionDetailStart);
const closeCompetitionDetailFunction = portal.slice(closeCompetitionDetailStart, closeCompetitionDetailEnd);
const fullSwimmerBuildStart = functions.indexOf("async function buildEngagementClubSwimmersFromRequest");
const fullSwimmerBuildEnd = functions.indexOf("function engagementEntryTimeStats", fullSwimmerBuildStart);
const fullSwimmerBuild = functions.slice(fullSwimmerBuildStart, fullSwimmerBuildEnd);
const fullSwimmerSaveStart = functions.indexOf("exports.saveEngagementClubSwimmers");
const fullSwimmerSaveEnd = functions.indexOf("exports.saveEngagementClubRelays", fullSwimmerSaveStart);
const fullSwimmerSave = functions.slice(fullSwimmerSaveStart, fullSwimmerSaveEnd);
const clubEntryReadStart = functions.indexOf("exports.getEngagementClubEntry");
const clubEntryReadEnd = functions.indexOf("exports.generateEngagementClubRecapPdf", clubEntryReadStart);
const clubEntryRead = functions.slice(clubEntryReadStart, clubEntryReadEnd);
const engagementEntryTimeCacheStart = functions.indexOf("async function rebuildEngagementEntryTimeCache");
const engagementEntryTimeCacheEnd = functions.indexOf("function deleteEngagementEntryTimeCache", engagementEntryTimeCacheStart);
const engagementEntryTimeCacheSource = functions.slice(engagementEntryTimeCacheStart, engagementEntryTimeCacheEnd);
const competitionDetailLoadStart = portal.indexOf("async function loadEngagementCompetitionDetail");
const competitionDetailLoadEnd = portal.indexOf("async function saveEngagementClubTeamLeader", competitionDetailLoadStart);
const competitionDetailLoad = portal.slice(competitionDetailLoadStart, competitionDetailLoadEnd);
const engagementCompetitionListStart = functions.indexOf("exports.listEngagementCompetitions");
const engagementCompetitionListEnd = functions.indexOf("exports.getEngagementCompetition", engagementCompetitionListStart);
const engagementCompetitionListSource = functions.slice(engagementCompetitionListStart, engagementCompetitionListEnd);
const engagementClubSwimmerListStart = functions.indexOf("exports.listEngagementClubSwimmers");
const engagementClubSwimmerListEnd = functions.indexOf("exports.rebuildEngagementClubAggregates", engagementClubSwimmerListStart);
const engagementClubSwimmerListSource = functions.slice(engagementClubSwimmerListStart, engagementClubSwimmerListEnd);
const engagementClubRecapListStart = functions.indexOf("exports.listEngagementCompetitionClubRecaps");
const engagementClubRecapListEnd = functions.indexOf("function engagementCompetitionStatisticsItem", engagementClubRecapListStart);
const engagementClubRecapListSource = functions.slice(engagementClubRecapListStart, engagementClubRecapListEnd);
const dtnBuildSource = functions.slice(functions.indexOf("async function buildDtnQualificationPayload"), functions.indexOf("async function enqueueDtnQualificationJob"));
const dtnOverviewSource = functions.slice(functions.indexOf("exports.getDtnQualificationOverview"), functions.indexOf("function normalizePerformanceSearchText"));
const dtnListingAthletesSource = functions.slice(functions.indexOf("function isDtnElectronicFiftyMeterPerformance"), functions.indexOf("async function buildDtnListingPayload"));
const dtnListingSandbox = {};
vm.runInNewContext(`
  const POOL_COURSES = ["50SF", "100SF"];
  const birthYear = (value) => Number(String(value || "").slice(0, 4)) || 0;
  const publicSwimmerKey = (row) => row.swimmerId;
  const dtnQualificationRow = (row) => ({ ...row });
  const publicBetterPerformance = (row, current) => !current || row.timeValue < current.timeValue;
  const cleanText = (value) => String(value || "");
  const cleanFirestoreValue = (value) => value;
  ${dtnListingAthletesSource}
  const rows = [
    { swimmerId: "cadet", firstName: "A", lastName: "CADET", birthDate: "2012-01-01", sex: "F", pool: "50", chrono: "E", course: "50SF", timeValue: 100, time: "1.00" },
    { swimmerId: "cadet", firstName: "A", lastName: "CADET", birthDate: "2012-01-01", sex: "F", pool: "50", chrono: "E", course: "50SF", timeValue: 110, time: "1.10" },
    { swimmerId: "cadet-25", firstName: "A", lastName: "CADET25", birthDate: "2012-01-01", sex: "F", pool: "25", chrono: "E", course: "50SF", timeValue: 80, time: "0.80" },
    { swimmerId: "cadet-manual", firstName: "A", lastName: "CADETM", birthDate: "2012-01-01", sex: "F", pool: "50", chrono: "M", course: "50SF", timeValue: 80, time: "0.80" },
    { swimmerId: "cadet-unknown", firstName: "A", lastName: "CADETU", birthDate: "2012-01-01", sex: "F", pool: "50", chrono: "", course: "50SF", timeValue: 80, time: "0.80" },
    { swimmerId: "minime", firstName: "E", lastName: "MINIME", birthDate: "2013-01-01", sex: "F", pool: "50", chrono: "E", course: "50SF", timeValue: 90, time: "0.90" },
    { swimmerId: "junior", firstName: "B", lastName: "JUNIOR", birthDate: "2010-01-01", sex: "F", pool: "50 m", chrono: "electronic", course: "100SF", timeValue: 150, time: "1.50" },
    { swimmerId: "age18", firstName: "C", lastName: "AGE18", birthDate: "2008-01-01", sex: "M", pool: "50", chrono: "Électronique", course: "50SF", timeValue: 95, time: "0.95" },
    { swimmerId: "age19", firstName: "D", lastName: "AGE19", birthDate: "2007-01-01", sex: "M", pool: "50", chrono: "E", course: "50SF", timeValue: 93, time: "0.93" },
    { swimmerId: "age22", firstName: "D", lastName: "AGE22", birthDate: "2004-01-01", sex: "M", pool: "50", chrono: "E", course: "50SF", timeValue: 90, time: "0.90" }
  ];
  const thresholds = { F: { "50SF": 120, "100SF": 160 }, M: { "50SF": 120, "100SF": 160 } };
  const releve = dtnListingAthletes(rows, { minAge: 0, maxAge: 21, thresholds }, 2026);
  const releveKeys = new Set(releve.map(publicSwimmerKey));
  result = {
    releve,
    tec1: dtnListingAthletes(rows, { minAge: 14, maxAge: 15, thresholds }, 2026),
    tep: dtnListingAthletes(rows, { minAge: 16, maxAge: 18, thresholds }, 2026),
    tec1Exclusive: dtnListingAthletes(rows, { minAge: 14, maxAge: 15, thresholds }, 2026).filter((athlete) => !releveKeys.has(publicSwimmerKey(athlete))),
    tepExclusive: dtnListingAthletes(rows, { minAge: 16, maxAge: 18, thresholds }, 2026).filter((athlete) => !releveKeys.has(publicSwimmerKey(athlete)))
  };
`, dtnListingSandbox);
assert.deepEqual(Array.from(dtnListingSandbox.result.tec1, (row) => row.swimmerId), ["cadet"]);
assert.equal(dtnListingSandbox.result.tec1[0].qualifications.length, 1);
assert.equal(dtnListingSandbox.result.tec1[0].qualifications[0].timeValue, 100);
assert.deepEqual(Array.from(dtnListingSandbox.result.tep, (row) => row.swimmerId), ["age18", "junior"]);
assert.equal(dtnListingSandbox.result.tec1Exclusive.length, 0);
assert.equal(dtnListingSandbox.result.tepExclusive.length, 0);
const mailRecipientSource = functions.slice(functions.indexOf("async function engagementActiveMailRecipients"), functions.indexOf("async function engagementActiveClubMailRecipients"));
const additionalPerformanceSnapshotSource = functions.slice(functions.indexOf("async function buildAdditionalPerformanceDataSnapshot"), functions.indexOf("async function publishAdditionalPerformanceDataSnapshot"));
const importDeletionSource = functions.slice(functions.indexOf("async function markCompetitionImportDeleted"), functions.indexOf("exports.updateCompetitionImportRecordAlertDecision"));
const programSessionsForSexStart = portal.indexOf("function engagementClubProgramSessionsForSex");
const programSessionsForSexEnd = portal.indexOf("function engagementClubProgramItemLabel", programSessionsForSexStart);
const programSessionsForSexFunction = portal.slice(programSessionsForSexStart, programSessionsForSexEnd);
const programSessionsForSexSandbox = {};
vm.runInNewContext(`${programSessionsForSexFunction}
  result = {
    female: engagementClubProgramSessionsForSex([{ id: "s1", items: [{ eventCode: "F", genderMode: "female" }, { eventCode: "M", genderMode: "male" }, { eventCode: "X", genderMode: "mixed" }] }], "F"),
    male: engagementClubProgramSessionsForSex([{ id: "s1", items: [{ eventCode: "F", genderMode: "female" }, { eventCode: "M", genderMode: "male" }, { eventCode: "X", genderMode: "mixed" }] }], "M")
  };`, programSessionsForSexSandbox);
const openingDeadlineErrorStart = portal.indexOf("function engagementOpeningDeadlineError");
const openingDeadlineErrorEnd = portal.indexOf("function shouldSendEngagementOpeningMail", openingDeadlineErrorStart);
const openingDeadlineErrorFunction = portal.slice(openingDeadlineErrorStart, openingDeadlineErrorEnd);
const openingDeadlineErrorSandbox = {};
vm.runInNewContext(`${openingDeadlineErrorFunction}
  const nowMs = Date.parse("2026-08-08T12:00:00.000Z");
  result = {
    past: engagementOpeningDeadlineError({ entryStatus: "open", entryDeadlineAt: "2026-08-08T11:00:00.000Z" }, nowMs),
    equal: engagementOpeningDeadlineError({ entryStatus: "open", entryDeadlineAt: "2026-08-08T12:00:00.000Z" }, nowMs),
    future: engagementOpeningDeadlineError({ entryStatus: "open", entryDeadlineAt: "2026-08-08T13:00:00.000Z" }, nowMs),
    closed: engagementOpeningDeadlineError({ entryStatus: "closed", entryDeadlineAt: "2026-08-08T11:00:00.000Z" }, nowMs)
  };`, openingDeadlineErrorSandbox);
const openingDeadlinePastStart = functions.indexOf("function isEngagementOpeningDeadlinePast");
const openingDeadlinePastEnd = functions.indexOf("function cleanEngagementRegionIds", openingDeadlinePastStart);
const openingDeadlinePastFunction = functions.slice(openingDeadlinePastStart, openingDeadlinePastEnd);
const openingDeadlinePastSandbox = {};
vm.runInNewContext(`
  const cleanEngagementEntryStatus = (value) => value;
  ${openingDeadlinePastFunction}
  const nowMs = Date.parse("2026-08-08T12:00:00.000Z");
  result = {
    past: isEngagementOpeningDeadlinePast("open", "2026-08-08T11:00:00.000Z", nowMs),
    equal: isEngagementOpeningDeadlinePast("open", "2026-08-08T12:00:00.000Z", nowMs),
    future: isEngagementOpeningDeadlinePast("open", "2026-08-08T13:00:00.000Z", nowMs),
    closed: isEngagementOpeningDeadlinePast("closed", "2026-08-08T11:00:00.000Z", nowMs)
  };`, openingDeadlinePastSandbox);
const openingMailStart = functions.indexOf("function engagementOpeningMailSubject");
const openingMailEnd = functions.indexOf("function engagementMailJobItemFromData", openingMailStart);
const openingMailFunctions = functions.slice(openingMailStart, openingMailEnd);
const openingMailSandbox = {};
vm.runInNewContext(`
  const engagementPdfMoney = (value) => value + " €";
  const engagementPdfFeeTotal = () => 12;
  const engagementPdfFormatDate = (value) => value;
  const engagementPdfFormatDateTime = (value) => value;
  ${openingMailFunctions}
  result = {
    subject: engagementOpeningMailSubject({ name: "Meeting test" }),
    text: engagementOpeningMailText({
      name: "Meeting test",
      date: "2026-09-12",
      location: "Piscine test",
      entryDeadlineAt: "2026-09-05 23:59",
      fees: { swimmerFee: 2, individualEventFee: 3, relayFee: 4, helloAssoUrl: "https://example.test/paiement" }
    }),
    recapText: engagementClubRecapMailText(
      { name: "Meeting test", fees: { enabled: false } },
      { clubName: "Club test" }
    ),
    recapFeeText: engagementClubRecapMailText(
      { name: "Meeting test", fees: { enabled: true } },
      { clubName: "Club test" }
    ),
    txtText: engagementTxtMailText(
      { name: "Meeting test", date: "2026-09-12", location: "Piscine test" },
      { fileName: "engagements.txt" }
    )
  };
`, openingMailSandbox);

assert.ok(Array.isArray(sandbox.window.LIVEPALMES_CLUB_REFERENCE?.clubs));
assert.equal(openingMailSandbox.result.subject, "Ouverture des engagements - Meeting test");
assert.match(openingMailSandbox.result.text, /^Bonjour,/);
assert.match(openingMailSandbox.result.text, /https:\/\/livepalmes\.web\.app\/portail\.html#club-competitions/);
assert.match(openingMailSandbox.result.text, /Merci de finaliser et de vérifier les engagements de votre club au plus tard le 2026-09-05 23:59\./);
assert.doesNotMatch(openingMailSandbox.result.text, /Vos modifications sont enregistrées progressivement|Pensez à vérifier l'ensemble/);
assert.doesNotMatch(openingMailSandbox.result.text, /frais|HelloAsso/i);
assert.match(openingMailSandbox.result.text, /Sportivement,\nCommission Nationale Nage avec Palmes - FFESSM$/);
assert.match(openingMailSandbox.result.recapFeeText, /Total indicatif des frais d'engagement : 12 €/);
assert.match(openingMailSandbox.result.recapText, /Sportivement,\nCommission Nationale Nage avec Palmes - FFESSM$/);
assert.match(openingMailSandbox.result.txtText, /Sportivement,\nCommission Nationale Nage avec Palmes - FFESSM$/);
assert.deepEqual(evaluateEngagementRoutePolicy(["engagements.club.manage"]), {
  club: true,
  clubSwimmers: true,
  adminCalendar: false,
  adminAccessRequests: false,
  adminDeletionRequests: false,
  adminAudit: false,
  unknown: false,
  fallback: "#club-competitions"
});
assert.deepEqual(evaluateEngagementRoutePolicy(["engagements.region.manage"]), {
  club: false,
  clubSwimmers: false,
  adminCalendar: true,
  adminAccessRequests: true,
  adminDeletionRequests: false,
  adminAudit: false,
  unknown: false,
  fallback: "#competitions-calendrier"
});
assert.deepEqual(evaluateEngagementRoutePolicy(["engagements.national.manage"]), {
  club: false,
  clubSwimmers: false,
  adminCalendar: true,
  adminAccessRequests: true,
  adminDeletionRequests: true,
  adminAudit: false,
  unknown: false,
  fallback: "#competitions-calendrier"
});
assert.deepEqual(evaluateEngagementRoutePolicy(["engagements.club.manage", "engagements.region.manage"]), {
  club: true,
  clubSwimmers: true,
  adminCalendar: true,
  adminAccessRequests: true,
  adminDeletionRequests: false,
  adminAudit: false,
  unknown: false,
  fallback: "#club-competitions"
});
assert.deepEqual(evaluateEngagementRoutePolicy([]), {
  club: false,
  clubSwimmers: false,
  adminCalendar: false,
  adminAccessRequests: false,
  adminDeletionRequests: false,
  adminAudit: false,
  unknown: false,
  fallback: "#accueil"
});
assert.deepEqual(evaluateEngagementRoutePolicy(["admin.full"]), {
  club: false,
  clubSwimmers: false,
  adminCalendar: false,
  adminAccessRequests: false,
  adminDeletionRequests: false,
  adminAudit: true,
  unknown: false,
  fallback: "#administration-historique"
});
assert.equal(Boolean(openingDeadlineErrorSandbox.result.past), true);
assert.equal(Boolean(openingDeadlineErrorSandbox.result.equal), true);
assert.equal(openingDeadlineErrorSandbox.result.future, "");
assert.equal(openingDeadlineErrorSandbox.result.closed, "");
assert.deepEqual(JSON.parse(JSON.stringify(openingDeadlinePastSandbox.result)), {
  past: true,
  equal: true,
  future: false,
  closed: false
});
assert.equal(Object.hasOwn(sandbox.window.LIVEPALMES_CLUB_REFERENCE, "swimmers"), false);
assert.equal(portal.includes("LIVEPALMES_ADMIN_REFERENCE"), false);
assert.equal(records.includes("LIVEPALMES_ADMIN_REFERENCE"), false);
assert.ok(firebase.hosting.ignore.includes("performances/public/data/admin-reference.js"));
assert.equal(firebase.firestore.indexes, "firestore.indexes.json");
assert.ok(indexes.indexes.some((index) => index.collectionGroup === "users"));
assert.equal(portal.includes("withTimeout(loadRemoteRecordsData"), false);
assert.ok(imports.includes('global.location.hash === "#import-competitions"'));
[
  "competitionImportProgress",
  "adminDtnLongOperation",
  "adminEngagementsLongOperation"
].forEach((id) => assert.ok(portalHtml.includes(`id="${id}" class="admin-long-operation"`)));
assert.ok(portalUx.includes("function createLongOperation"));
assert.ok(portalUx.includes('panel.setAttribute("role", "status")'));
assert.ok(portalUx.includes("Temps écoulé"));
assert.ok(portalUx.includes('panel.dataset.state = "loading"'));
assert.ok(portalUx.includes('content.state || "success"'));
assert.ok(portalCss.includes(".admin-portal-page .admin-long-operation"));
assert.ok(portalCss.includes('[data-state="background"]'));
assert.ok(imports.includes("startImportProgress("));
assert.ok(imports.includes('setImportControlsBusy(true, phase)'));
assert.ok(imports.includes("Correction et publication en cours"));
assert.ok(imports.includes("Republication complète en cours"));
assert.ok(dtn.includes("Recalcul des qualifications en cours"));
assert.ok(dtn.includes("Recalcul de la mise en liste en cours"));
assert.ok(portal.includes("Génération des PDF clubs en cours"));
assert.ok(portal.includes("Envoi des courriels"));
assert.ok(dtnBuildSource.includes('source: "public-storage-top-files"'));
assert.equal(dtnBuildSource.includes(".collection(PERFORMANCE_BASE_COLLECTION)"), false);
assert.equal(functions.includes('licenseUpdatedBy: "engagement-roster-migration"'), false);
assert.ok(functions.includes("revokeRefreshTokens(uid)"));
assert.ok(functions.includes("nextPortalAccessRateLimit"));
assert.ok(functions.includes('alertType === "inverted-identity"'));
assert.ok(functions.includes('blocksCreation: blockingAlerts.length > 0'));
assert.ok(functions.includes('throw new HttpsError("already-exists", "Un nageur existe deja avec le nom et le prenom inverses."'));
assert.ok(portal.includes('alerts.find((alert) => alert.type === "inverted-identity")'));
assert.ok(portal.includes("Le nom et le prénom sont inversés pour la même date de naissance."));
assert.ok(portalHtml.indexOf('id="adminEngagementsClubNewSwimmerLastName"') < portalHtml.indexOf('id="adminEngagementsClubNewSwimmerFirstName"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubNewSwimmerResetButton"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubContext"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubContextName"'));
assert.ok(portalHtml.includes("Vous effectuez les engagements pour le club :"));
assert.ok(portal.includes("function renderEngagementClubContext"));
assert.ok(portal.includes('const visible = !isEngagementAdminMode() && canUse("engagements.club.manage")'));
assert.ok(portalCss.includes(".admin-engagements-club-context"));
assert.ok(portal.includes('const clubLabel = clubId ? clubDisplayCode({ clubId, clubName: user.clubName }, "") : ""'));
assert.ok(portalCss.includes("min-height: 22px"));
assert.ok(portalCss.includes('"context context"'));
assert.ok(portalCss.includes("grid-area: context"));
assert.ok(portalCss.includes("padding-bottom: 2px"));
assert.ok(portalCss.includes("margin-top: -8px"));
assert.equal(portalHtml.includes('href="#competitions-demandes-acces"'), false);
assert.ok(portalHtml.includes('id="adminPortalAccessToggle"'));
assert.ok(portalHtml.includes('href="#gestion-demandes-acces"'));
assert.ok(portalHtml.includes('href="#gestion-utilisateurs"'));
assert.ok(portalHtml.includes('data-admin-view="accessHome"'));
assert.ok(portalHtml.includes('id="adminPortalAccessPendingBadge"'));
assert.ok(portalHtml.includes('id="adminPortalNationalPendingBadge"'));
assert.ok(portalHtml.includes('id="adminOverviewAccessPendingBadge"'));
assert.ok(portalHtml.includes('id="adminOverviewNationalPendingBadge"'));
assert.ok(portalHtml.includes('id="adminAccessHomePendingBadge"'));
assert.ok(portal.includes('callFunction("getPortalPendingRequestOverview", {})'));
assert.ok(portal.includes("const portalPendingOverviewLoaded" ) || portal.includes("let portalPendingOverviewLoaded"));
assert.ok(portalCss.includes(".admin-pending-badge"));
assert.ok(functions.includes("exports.getPortalPendingRequestOverview"));
assert.ok(functions.includes('accessRequestsQuery = accessRequestsQuery.where("regionId", "==", context.regionId)'));
assert.ok(functions.includes('requestsQuery = requestsQuery.where("regionId", "==", context.regionId)'));
assert.equal(portal.includes("onSnapshot("), false);
assert.ok(portal.includes('"#gestion-demandes-acces": { entry: "adminAccessRequests", tab: "accessRequests" }'));
assert.ok(portal.includes('activeEngagementsNavEntry === "adminAccessRequests"'));
assert.ok(portal.includes("function formatEngagementSwimmerLicense"));
assert.ok(portal.includes('"Meilleur temps parmi tous les temps connus"'));
assert.ok(portal.includes('`Meilleur temps connu réalisé du ${start} au ${end} inclus`'));
assert.ok(portal.includes("function engagementEntryTimeRulesLabel"));
assert.ok(portal.includes('["Temps d\'engagement", engagementEntryTimeRulesLabel(competition)]'));
assert.ok(portal.includes('lastName: String(elements.engagementsClubNewSwimmerLastName?.value || "").trim().toLocaleUpperCase("fr-FR")'));
assert.ok(portal.includes('event.currentTarget.value = event.currentTarget.value.toLocaleUpperCase("fr-FR")'));
assert.ok(portal.includes('addEventListener("input", (event) =>'));
assert.ok(portalCss.includes(".admin-engagements-club-new-swimmer-grid"));
assert.equal(functions.includes("const db = db;"), false);
assert.ok(portal.includes("data-engagement-club-swimmer-directory-toggle"));
assert.ok(portal.includes('data-expanded="false"'));
assert.ok(portalCss.includes('.admin-engagements-club-swimmers-directory-row[data-sex="F"]'));
assert.ok(portalCss.includes('.admin-engagements-club-swimmers-directory-row[data-expanded="true"] .admin-engagements-club-swimmers-directory-details'));
assert.ok(portal.includes('class="admin-engagements-club-swimmers-directory-delete-button"'));
assert.ok(portal.includes('aria-label="Demander la suppression de ${escapeHtml(name)}"'));
assert.equal(portal.includes('>Demander la suppression</button>'), false);
assert.ok(portalCss.includes(".admin-engagements-club-swimmers-directory-delete-button svg"));
assert.ok(portalHtml.includes('id="adminEngagementsClubSwimmersDirectorySearchLabel"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubSwimmersDirectorySearchClear"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubSwimmersDirectorySexFilter"'));
assert.ok(portalHtml.includes('data-engagement-club-swimmer-sex-filter="F"'));
assert.ok(portal.includes('class="admin-engagements-club-swimmers-directory-profile-icon"'));
assert.ok(portal.includes('class="admin-engagements-club-swimmers-directory-change-pending" aria-label="Correction en attente"'));
assert.ok(portal.includes('class="admin-engagements-club-swimmers-directory-change-pending-short" aria-hidden="true">En attente</span>'));
assert.ok(portal.includes('class="admin-engagements-club-swimmers-directory-mobile-actions"'));
assert.ok(portal.includes('class="admin-engagements-club-swimmers-directory-sex-category"'));
assert.ok(portal.includes('<span aria-hidden="true">·</span>'));
assert.ok(portal.includes('const sexDisplay = sex === "M" ? "H" : (sex || "-");'));
assert.ok(portalCss.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"));
assert.equal(portalHtml.includes("adminEngagementsClubSwimmersMissingLicenseFilter"), false);
assert.equal(portal.includes("engagementsClubSwimmersMissingLicenseFilter"), false);
assert.equal(portalHtml.includes('id="adminEngagementsClubSwimmersDirectoryTitle"'), false);
assert.equal(portalHtml.includes('id="adminEngagementsClubPeopleTitle"'), false);
assert.ok(portalHtml.includes('aria-label="Effectif des nageurs du club"'));
assert.ok(portalHtml.includes('aria-label="Gestion des officiels du club"'));
assert.equal(portalHtml.includes("admin-overview-intro"), false);
assert.equal(portalCss.includes(".admin-overview-intro"), false);
assert.ok(portalCss.includes(".admin-portal-page .admin-portal-space-home > .admin-overview-head"));
assert.ok(portalCss.includes("padding: 10px 14px"));
assert.equal(portal.includes('textContent = "Fiche chargee."'), false);
assert.ok(portal.includes('callFunction("previewEngagementClubSwimmerEventTimesBatch"'));
assert.ok(portal.includes("engagementClubSwimmerEventTimesCache.has(cacheKey)"));
assert.ok(portal.includes("if (!swimmerFormRows.length)"));
assert.ok(portal.includes("entriesBySwimmer.get(swimmer.swimmerIndexId) || cloneEngagementClubEntry(swimmer.individualEntries || [])"));
assert.ok(portal.includes("async function openEngagementClubTimesDialog"));
assert.ok(portal.includes("if (stillPending) await ensureEngagementClubSwimmerEventTimes(refreshedSwimmer)"));
assert.ok(portal.includes("if (engagementClubEntriesAutosaveTimer) await flushEngagementClubIndividualEntriesAutosave();"));
assert.equal(portal.includes("if (event.target.checked) void ensureEngagementClubSwimmerEventTimes(swimmer);"), false);
assert.ok(engagementEntryTimeCacheSource.includes("readEngagementEntryTimeSourceRows(swimmer)"));
assert.ok(engagementEntryTimeCacheSource.includes("engagementEntryTimeCacheBuilds.has(cacheId)"));
assert.equal(engagementEntryTimeCacheSource.includes("getPerformanceBaseRowsBySwimmer"), false);
assert.equal(engagementEntryTimeCacheSource.includes("PERFORMANCE_BASE_COLLECTION"), false);
assert.ok(functions.includes("variableDocumentsMax: swimmerIds.length"));
assert.equal(engagementCompetitionListSource.includes("rebuildEngagementCompetitionCalendar"), false);
assert.equal(engagementCompetitionListSource.includes("forceCalendar"), false);
assert.ok(engagementCompetitionListSource.includes("engagementClubEntryCompetitionIds(allCalendarCompetitions, clubContext.clubId, seasonEndYears.map(String), clubEntryIndexSnapshot)"));
assert.ok(engagementCompetitionListSource.includes("clubEntryIndexResult.fallbackDocumentsMax"));
assert.ok(functions.includes("ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION"));
assert.ok(functions.includes("coveredRanges"));
assert.ok(functions.includes('.where(FieldPath.documentId(), "in", entryIds)'));
assert.ok(functions.includes('.select("competitionId")'));
assert.equal(engagementClubSwimmerListSource.includes("rebuildEngagementClubRoster"), false);
assert.equal(engagementClubSwimmerListSource.includes("forceRoster"), false);
assert.ok(engagementClubSwimmerListSource.includes("variableDocumentsMax: 0"));
assert.ok(functions.includes("function engagementClubSwimmerMatchKeys"));
assert.ok(functions.includes("function mergeEngagementClubSwimmerItems"));
assert.ok(functions.includes("const identityKey = normalizePerformanceSearchText(swimmer.identityKey"));
assert.equal(functions.includes("const identityKey = normalizeSearchText(swimmer.identityKey"), false);
assert.ok(functions.includes("return Array.from(new Set((swimmerId ? ["));
assert.ok(functions.includes("`swimmer:${swimmerId}`"));
assert.ok(functions.includes("merged.performanceCount = Math.max"));
assert.equal(engagementClubRecapListSource.includes("rebuildEngagementCompetitionEntrySummary"), false);
assert.equal(engagementClubRecapListSource.includes("forceSummary"), false);
assert.ok(functions.includes("generatedAt: now || new Date().toISOString()"));
assert.ok(functions.includes("async function publishCompetitionImportOutputs(normalizedPerformances = [], importRef, context = {})"));
assert.ok(functions.includes("invalidateEngagementEntryTimeCachesForPerformanceRows(normalizedPerformances)"));
assert.ok(functions.includes("publishCompetitionImportOutputs(normalizedImportedPerformances, importRef"));
assert.ok(functions.includes("exports.resumeCompetitionImportPublication"));
assert.ok(functions.includes("invalidateEngagementEntryTimeCachesForPerformanceRows(result.affectedRows || [])"));
assert.ok(functions.includes("exports.previewEngagementClubSwimmerEventTimes"));
assert.ok(functions.includes("exports.previewEngagementClubSwimmerEventTimesBatch"));
assert.ok(functions.includes("exports.getEngagementClubEntryTimeHistory"));
assert.ok(functions.includes("ENGAGEMENT_ENTRY_TIME_CACHE_VERSION = 3"));
const engagementQualificationSource = functions.slice(functions.indexOf("function engagementQualificationRowAllowed"), functions.indexOf("function bestEngagementKnownTime"));
assert.equal(engagementQualificationSource.includes("isIntermediate"), false);
assert.ok(functions.includes("function engagementKnownTimeHistory"));
assert.ok(functions.includes("async function assertPublicSwimmerIdentityReplaced"));
assert.ok(functions.includes("async function replacePublicSwimmerIdentity"));
assert.ok(functions.includes("for (let attempt = 1; attempt <= 3; attempt += 1)"));
assert.ok(functions.includes("L'ancienne fiche reste presente dans la recherche publique."));
assert.ok(functions.includes("Un identifiant public ne pointe pas vers la fiche corrigee."));
assert.ok(functions.includes("const licenseCandidateIds = Array.from(new Set(["));
assert.ok(functions.includes("licenseDocumentId: licenseMatch.documentId"));
assert.ok(functions.includes("const oldLicenseDocId = cleanText(target.licenseDocumentId)"));
assert.ok(functions.includes("async function hydratePerformanceBaseRows(rows = [])"));
assert.ok(functions.includes('const source = id.startsWith("import:") ? "livepalmes-import" : "intranap";'));
assert.ok(functions.includes("return hydratePerformanceBaseRows(pageRows);"));
assert.ok(functions.includes("return hydratePerformanceBaseRows(publicRows);"));
assert.ok(portal.includes("Number(existing.performanceCount || 0) > Number(swimmer.performanceCount || 0)"));
assert.ok(portal.includes('const PERFORMANCE_PUBLIC_SEARCH_BASE = "https://storage.googleapis.com/livepalmes-public-data-718081132564/performance-public-firestore";'));
assert.ok(portal.includes('const ENGAGEMENT_ADMIN_PUBLIC_SWIMMER_SEARCH_VERSION = "20260812-national-swimmers-firestore-2";'));
assert.ok(functions.includes('.slice(0, Math.max(1, Math.min(10, Number(limit || 10))))'));
assert.ok(functions.includes("exports.saveEngagementClubIndividualEntries"));
assert.ok(functions.includes("exports.saveEngagementClubSwimmerSelection"));
assert.ok(functions.includes("exports.saveEngagementClubSwimmerSelections"));
assert.ok(portal.includes('callFunction("saveEngagementClubSwimmerSelections"'));
assert.ok(portal.includes("function mergeEngagementClubEntryWithLocalSwimmerSelections"));
assert.ok(portal.includes("function queueEngagementClubEntryMutation"));
assert.ok(portal.includes("renderEngagementClubMutationResult(cloneEngagementClubEntry(engagementClubLastPersistedEntry), renderScope)"));
assert.equal(portal.includes("mergeEngagementClubEntryWithLocalSwimmerSelections(cloneEngagementClubEntry(engagementClubLastPersistedEntry))"), false);
assert.ok(portal.includes("function captureEngagementClubEntriesViewport"));
assert.ok(portal.includes("function restoreEngagementClubEntriesViewport"));
assert.ok(portal.includes('renderScope: "entries"'));
assert.ok(portal.includes("function persistEngagementClubIndividualEntries"));
assert.ok(portal.includes("const engagementClubEntriesAutosaveSwimmers = new Map()"));
assert.ok(portal.includes("const engagementClubWorkspaceCache = new Map()"));
assert.ok(portal.includes("engagementClubWorkspaceCache.clear()"));
assert.equal(portal.includes("selectedEngagementClubEntryCompetitionId"), false);
assert.ok(portal.includes("function flushEngagementClubIndividualEntriesAutosave"));
assert.ok(portal.includes("engagementClubEntriesAutosaveSwimmers.set(swimmerIndexId"));
assert.ok(portal.includes("}, 500)"));
assert.match(portal, /swimmers\r?\n\s+\}\)/);
assert.ok(portal.includes("discardPendingEngagementClubIndividualEntries(swimmerIndexId)"));
assert.ok(portal.includes("const selectedRows = currentEngagementClubSwimmersForSummary();"));
assert.ok(closeCompetitionDetailFunction.indexOf("flushEngagementClubIndividualEntriesAutosave()") < closeCompetitionDetailFunction.indexOf('selectedEngagementCompetitionId = ""'));
assert.ok(portal.includes("pendingEntryMutations.then(async () =>"));
assert.ok(swimmerSelectionFunction.includes("await competitionRef.get()"));
assert.ok(swimmerSelectionFunction.includes("await db.runTransaction"));
assert.ok(swimmerSelectionFunction.includes("{ swimmers: [request.data?.swimmer || {}] }"));
assert.ok(swimmerSelectionFunction.includes("savedSwimmers.filter((swimmer) => swimmer.swimmerIndexId !== swimmerIndexId)"));
assert.equal(swimmerSelectionFunction.includes("requestedSwimmers.slice(0, 300)"), false);
assert.ok(portal.includes('callFunction(useIndividualEntriesSave ? "saveEngagementClubIndividualEntries" : "saveEngagementClubSwimmers"'));
assert.ok(portal.includes("engagementClubEntriesDirtySwimmerIds.add(cleanId)"));
assert.ok(portal.includes("engagementClubPersistedSwimmerIds.has(swimmerIndexId)"));
assert.ok(differentialEntriesFunction.includes("const [competition, entry] = await db.getAll(competitionRef, entryRef)"));
assert.ok(differentialEntriesFunction.includes("changedSwimmers.some"));
assert.ok(differentialEntriesFunction.includes("await db.runTransaction"));
assert.ok(differentialEntriesFunction.includes("const latestEntry = await transaction.get(entryRef)"));
assert.ok(differentialEntriesFunction.includes("const latestIds = new Set"));
assert.equal(differentialEntriesFunction.includes("engagementLegacySwimmerLicensesByClub"), false);
assert.equal(differentialEntriesFunction.includes("PERFORMANCE_SWIMMERS_COLLECTION"), false);
assert.ok(functions.includes('const manualMode = cleanText(entry.entryTimeMode) === "manual"'));
assert.ok(fullSwimmerBuild.includes('collection("engagementSwimmerLicenses")'));
assert.ok(fullSwimmerBuild.includes('.where("swimmerIndexId", "in", requestedLicenseIds.slice(index, index + 10))'));
assert.equal(fullSwimmerBuild.includes("engagementLegacySwimmerLicensesByClub"), false);
assert.ok(fullSwimmerBuild.includes('entry.entryTimeMode === "manual"'));
assert.equal(fullSwimmerSave.includes("const updated = await entryRef.get()"), false);
assert.ok(functions.includes("const [competition, entry] = await db.getAll(competitionRef, entryRef)"));
const clubEntryItemSource = functions.slice(functions.indexOf("function engagementClubEntryItem"), functions.indexOf("function engagementPdfFormatDate"));
assert.ok(clubEntryItemSource.includes("personId: cleanText(teamLeader.personId)"));
assert.ok(clubEntryItemSource.includes("birthDate: cleanIsoDate(teamLeader.birthDate)"));
assert.ok(clubEntryItemSource.includes('sex: ["F", "M"].includes'));
assert.ok(portal.includes("const saved = await saveEngagementClubOfficials()"));
assert.ok(portalHtml.includes('id="adminEngagementsClubOfficialsSaveButton" type="submit" hidden'));
assert.ok(portal.includes('global.addEventListener("beforeunload"'));
assert.ok(portal.includes('document.addEventListener("visibilitychange"'));
assert.ok(portalCss.includes("#adminEngagementsDetailTeamPanel .admin-engagements-form-section-grid"));
assert.ok(portalCss.includes(".admin-engagements-form-section-grid > .admin-engagements-check"));
assert.equal(portal.includes("Temps d'engagement indisponible :"), false);
assert.ok(portal.includes('club <strong>${escapeHtml(clubValue)}</strong>'));
assert.ok(portalCss.includes(".admin-account-scope-sentence strong"));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamPersonFields" class="admin-engagements-form-section-grid" hidden'));
assert.equal(portalHtml.includes('name="adminEngagementsClubTeamMode" value="person" checked'), false);
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamRenunciationButton"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamRenunciationDialog"'));
assert.ok(portal.includes("async function selectEngagementClubTeamRenunciation(event)"));
assert.ok(portal.includes('engagementsClubTeamRenunciationButton?.addEventListener("click", openEngagementClubTeamRenunciationDialog)'));
assert.ok(portalCss.includes("display: flex !important"));
assert.ok(portal.includes("Confirmer cette suppression ?"));
assert.ok(portalHtml.includes('id="adminEngagementsNoFees"'));
assert.ok(portal.includes('fees.enabled === false'));
assert.ok(functions.includes('const enabled = rawFees.enabled !== false'));
assert.ok(portal.includes("Annuler : réouvrir sans renvoyer de mail."));
assert.ok(portal.includes("data-engagement-category-column"));
assert.ok(portal.includes("control.indeterminate = checkedCount > 0"));
assert.ok(portal.includes("engagementCategoryColumnInputs(mount"));
assert.ok(portalCss.includes('.admin-engagements-mixed-choice input[type="checkbox"]'));
assert.ok(portalHtml.includes('id="adminEngagementsClubTimesDialog"'));
assert.ok(portalHtml.indexOf('id="adminEngagementsClubSelectedSwimmersList"') < portalHtml.indexOf('id="adminEngagementsClubSwimmersSearch"'));
assert.ok(portalHtml.indexOf('id="adminEngagementsClubSwimmersSearch"') < portalHtml.indexOf('id="adminEngagementsClubNewSwimmerDialogOpen"'));
assert.ok(portalHtml.includes('class="admin-engagements-club-swimmer-tools"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubNewSwimmerDialog"'));
assert.ok(portalHtml.includes('<option value="F">Femme</option>'));
assert.ok(portalHtml.includes('<option value="M">Homme</option>'));
assert.ok(portal.includes("function openEngagementClubNewSwimmerDialog"));
assert.ok(portal.includes("function closeEngagementClubNewSwimmerDialog"));
assert.ok(portal.includes("Abandonner les informations saisies pour ce nageur ?"));
assert.ok(portalHtml.indexOf('id="adminEngagementsClubNewSwimmerDialog"') < portalHtml.indexOf('id="adminEngagementsClubSwimmersList"'));
assert.equal(portalHtml.includes('id="adminEngagementsClubEntriesSummary"'), false);
assert.equal(portalHtml.includes('id="adminEngagementsClubEntriesSaveBar"'), false);
assert.equal(portalHtml.includes('id="adminEngagementsClubSwimmersSaveButton"'), false);
assert.equal(portalHtml.includes('id="adminEngagementsClubSwimmersSummary"'), false);
assert.ok(portal.includes("engagementClubProgramSessionsForEntries"));
assert.deepEqual(
  JSON.parse(JSON.stringify(programSessionsForSexSandbox.result.female[0].items.map((item) => item.eventCode))),
  ["F", "X"]
);
assert.deepEqual(
  JSON.parse(JSON.stringify(programSessionsForSexSandbox.result.male[0].items.map((item) => item.eventCode))),
  ["M", "X"]
);
assert.ok(portal.includes("function renderEngagementClubEntriesTable"));
assert.ok(portal.indexOf('{ sex: "F", label: "Femmes"') < portal.indexOf('{ sex: "M", label: "Hommes"'));
assert.ok(portal.includes('data-engagement-club-entries-sex="${escapeHtml(sex)}"'));
assert.ok(portal.includes('const identityColumnLabel = sex === "F" ? "Nageuse" : "Nageur";'));
assert.ok(portal.includes('scope="col">${identityColumnLabel}</th>'));
assert.ok(portal.includes('category: selected.category || swimmer.category || ""'));
assert.ok(portal.includes('}, selectedEngagementCompetition?.date || "") || "-";'));
assert.ok(portal.includes('admin-engagements-club-entry-last-name admin-engagements-club-entry-swimmer'));
assert.ok(portal.includes('<strong>${escapeHtml(lastName)}</strong><span>${escapeHtml(firstName || "-")}</span>'));
assert.ok(portalCss.includes(".admin-engagements-club-entry-group-head"));
assert.ok(portalCss.includes(".admin-engagements-club-entry-swimmer span"));
assert.ok(portal.includes('query ? "Résultats de recherche" : "Nageurs actifs"'));
assert.ok(portal.includes('data-engagement-club-available-swimmer-sex-filter="F"'));
assert.ok(portal.includes('engagementClubAvailableSwimmersSexFilter === "all"'));
assert.ok(portal.includes(".filter(availableSexMatches)"));
assert.ok(portalCss.includes(".admin-engagements-club-swimmers-sex-filter"));
assert.ok(portal.includes("? engagementClubSwimmerSearchText(swimmer).includes(query)"));
assert.ok(portal.includes(": engagementClubSwimmerIsActive(swimmer)"));
assert.equal(portal.includes("Recherchez un nageur par son nom"), false);
assert.ok(portalCss.includes("#adminEngagementsDetailSwimmersPanel .admin-engagements-club-new-swimmer-dialog"));
assert.ok(portalCss.includes("#adminEngagementsDetailSwimmersPanel .admin-engagements-club-swimmer-tools"));
assert.ok(portalCss.includes("font-weight: 500"));
assert.equal(portal.includes("data-engagement-club-swimmers-show-more"), false);
assert.ok(portal.includes("renderEngagementClubSelectedSwimmersPreview(selectedMount, selectedById)"));
assert.ok(portal.includes("function renderActiveEngagementClubSwimmerConsumer"));
assert.ok(portal.includes('if (activeEngagementsTab === "clubSwimmers")'));
assert.equal(competitionDetailLoad.includes("clubPeoplePromise"), false);
assert.ok(portal.includes('(nextTab === "team" || nextTab === "officials") && canUse("engagements.club.manage") && !engagementClubPeopleLoaded'));
assert.ok(portal.includes('return callFunction("getEngagementClubEntry", { competitionId: cleanId });'));
assert.ok(competitionDetailLoad.includes("const cachedWorkspace = clubMode ? readEngagementClubWorkspaceCache(cleanId) : null"));
assert.ok(competitionDetailLoad.includes("selectedEngagementClubEntry = cloneEngagementClubEntry(cachedWorkspace.entry)"));
assert.ok(competitionDetailLoad.includes("const preloadRequest = pendingEngagementClubWorkspaceRequest(cleanId)"));
assert.ok(competitionDetailLoad.includes("if (selectedEngagementCompetitionId !== cleanId) return"));
assert.equal((competitionDetailLoad.match(/callFunction\("getEngagementClubEntry"/g) || []).length, 1);
assert.equal(competitionDetailLoad.includes("loadEngagementClubEntry("), false);
assert.ok(clubEntryRead.includes("const [competition, entry] = await db.getAll(competitionRef, entryRef)"));
assert.ok(clubEntryRead.includes("competition: engagementCompetitionDetailItem(competition)"));
assert.ok(clubEntryRead.includes("exports.preloadEngagementClubWorkspaces"));
assert.ok(clubEntryRead.includes(").slice(0, 4)"));
assert.ok(clubEntryRead.includes("const snapshots = await db.getAll(...refs)"));
assert.ok(clubEntryRead.includes("baseDocuments: 1 + refs.length"));
assert.equal(clubEntryRead.includes("peopleRosterReady:"), false);
assert.equal(clubEntryRead.includes("peopleRosterRef"), false);
assert.equal(clubEntryRead.includes("const competition = await"), false);
assert.ok(engagementClubSwimmerListSource.includes("const rosterSnapshot = await engagementClubRosterRef(db, context.clubId).get()"));
assert.ok(engagementClubSwimmerListSource.includes("baseDocuments: 2"));
assert.ok(engagementClubSwimmerListSource.includes("variableDocumentsMax: 0"));
assert.ok(portal.includes('return `${eventCount} épreuve${eventCount > 1 ? "s" : ""} - ${sessionCount} session'));
assert.ok(portal.includes('class="admin-engagements-competitions-table" role="table"'));
assert.ok(portal.includes('<span role="columnheader">Niveau / région</span>'));
assert.equal(portal.includes('<span role="columnheader">Lieu</span>'), false);
assert.ok(portal.includes('<small class="admin-engagements-competition-location">'));
assert.ok(portal.includes('class="admin-engagements-competition-entry-badge"'));
assert.ok(portal.includes('class="admin-engagements-competition-status" role="cell"'));
assert.ok(portalCss.includes("Calendriers Club et Organisateur : tableau dense"));
assert.ok(portalCss.includes("bandeau plat, cinq colonnes"));
assert.ok(portalCss.includes('#adminEngagementsView[data-engagements-tab="calendar"] #adminEngagementsCalendarFilters'));
assert.ok(portalCss.includes("@media (max-width: 1120px) and (min-width: 761px)"));
assert.ok(portalCss.includes("@media (max-width: 760px)"));
assert.equal(portal.includes('const payment = fees.helloAssoUrl ? "HelloAsso publie" : "HelloAsso en attente"'), false);
assert.ok(portalHtml.includes("Engagements en compétition"));
assert.ok(portal.includes('"Engagements en comp\\u00e9tition"'));
assert.ok(portalHtml.includes('id="adminEngagementsDetailEntryStatus"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamPersonSearch"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamBirthDate"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamSex"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubPersonBirthDate"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubPersonSex"'));
assert.ok(portal.includes('elements.engagementsClubTeamPersonSearch?.addEventListener("input"'));
assert.ok(portal.includes('const saved = await saveEngagementClubTeamLeader();'));
assert.ok(portal.includes('!declaringPerson || (Boolean(knownPerson) && knownPersonReady)'));
assert.ok(portal.includes('if (!person.active) return false;'));
assert.ok(portal.includes('function resolveEngagementClubPersonIdentity'));
assert.ok(portal.includes('Une personne similaire existe peut-être'));
assert.ok(portal.includes('Cette création est impossible'));
assert.ok(functions.includes('function engagementClubPersonIdentityConflict'));
assert.ok(functions.includes('throwEngagementClubPersonIdentityConflict'));
assert.ok(functions.includes('Date de naissance et sexe obligatoires.'));
assert.ok(portalHtml.includes('id="adminEngagementsDetailLevel"'));
assert.ok(portalHtml.indexOf('id="adminEngagementsDetailClose"') < portalHtml.indexOf('id="adminEngagementsCalendarPanel"'));
assert.equal(portalHtml.includes('id="adminEngagementsResultsCount"'), false);
assert.equal(portalHtml.includes('id="adminEngagementsRefreshMeta"'), false);
assert.ok(portalHtml.includes('id="adminEngagementsCalendarActions"'));
assert.equal(portalHtml.includes('id="adminEngagementsCalendarHead"'), false);
assert.equal(portalHtml.includes('id="adminEngagementsCalendarTitle"'), false);
assert.equal(portalHtml.includes('id="adminEngagementsViewEyebrow"'), false);
assert.equal(portalHtml.includes('id="adminEngagementsViewIntro"'), false);
assert.equal(portalHtml.includes('id="adminEngagementsCreateTitle"'), false);
assert.equal(portalHtml.includes('id="adminEngagementsAccessRequestsTitle"'), false);
assert.equal((portalHtml.match(/admin-tool-workspace-head/g) || []).length, 7);
assert.ok(portalCss.includes(".admin-portal-page .admin-tool-workspace-head"));
assert.ok(portalCss.includes("un titre unique, compact"));
assert.ok(portal.includes("elements.engagementsDetailEyebrow.hidden = true"));
assert.equal(portal.includes("Fiche compétition organisateur"), false);
assert.equal(portal.includes("`Actualisé à ${lastRefreshTime(elements.engagementsRefreshMeta)}`"), false);
assert.ok(portal.includes('? "Comp\\u00e9titions \\u00e0 administrer"'));
assert.ok(portal.includes('? "Cr\\u00e9er une comp\\u00e9tition"'));
assert.ok(portal.includes("function engagementNationalPageTitle"));
assert.ok(portal.includes('? engagementNationalPageTitle()'));
assert.ok(portal.includes("!selectedEngagementCompetition?.id || !isEngagementAdminMode()"));
assert.ok(portalCss.includes(".admin-engagements-workspace-back"));
assert.ok(portalCss.includes('.admin-engagements-level-badge'));
assert.ok(portalCss.includes('#adminEngagementsView[data-engagements-tab="calendar"] #adminEngagementsDetail'));
assert.ok(portal.includes('Statut : engagements ${statusLabel}'));
assert.equal(portalHtml.includes('id="adminEngagementsDetailEntryStatus" class="admin-engagements-entry-status" type="button"'), false);
assert.equal(portalHtml.includes('id="adminEngagementsPreparationState"'), false);
assert.equal(portal.includes("engagementsPreparationState"), false);
assert.ok(!portalHtml.includes('id="adminEngagementsClubOfficialSwimmerSelect"'));
assert.equal(portalHtml.includes('id="adminEngagementsClubPersonSwimmerSelect"'), false);
assert.ok(portalHtml.includes('id="adminEngagementsClubPersonSwimmerSearch"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubPersonSwimmerResults"'));
assert.equal(portalHtml.includes("Personne existante"), false);
assert.ok(portal.includes("elements.engagementsClubPersonSwimmerSearch?.addEventListener"));
assert.ok(portal.includes("matchingSwimmers.slice(0, 8)"));
assert.ok(portal.includes("terms.every((term) => haystack.includes(term))"));
assert.ok(portal.includes("data-engagement-club-person-swimmer-result"));
assert.ok(portalCss.includes(".admin-engagements-club-person-swimmer-source label"));
assert.ok(portalCss.includes(".admin-engagements-club-person-swimmer-results button"));
assert.ok(portal.includes('class="admin-engagements-club-people-table"'));
assert.ok(portal.includes('const name = [person.lastName, person.firstName].filter(Boolean).join(" ") || "Personne sans nom";'));
assert.ok(portal.includes("data-engagement-club-person-directory-toggle"));
assert.ok(portal.includes('class="admin-engagements-club-person-status"'));
assert.equal(portal.includes("admin-engagements-club-person-card"), false);
assert.ok(portalHtml.includes('id="adminEngagementsClubPeopleActions"'));
assert.ok(portalHtml.indexOf('id="adminEngagementsClubPeopleActions"') < portalHtml.indexOf('id="adminEngagementsClubPeoplePanel"'));
assert.equal(portalHtml.includes('id="adminEngagementsClubPeopleRefresh"'), false);
assert.ok(portal.includes("elements.engagementsClubPeopleActions.hidden = !peopleMode"));
const clubPeopleLoadSource = portal.slice(portal.indexOf("async function loadEngagementClubPeople"), portal.indexOf("async function saveEngagementClubPerson"));
assert.equal(clubPeopleLoadSource.includes("activeCount"), false);
assert.equal(clubPeopleLoadSource.includes("lastRefreshSuffix"), false);
assert.ok(portalCss.includes(".admin-engagements-club-person-row"));
assert.ok(portalCss.includes(".admin-engagements-club-person-details"));
assert.ok(portalCss.includes("#adminEngagementsClubPeopleStatus:empty"));
assert.equal(portalHtml.includes('id="adminAccessRefreshButton"'), false);
assert.ok(portalHtml.includes('id="adminPublicAccessRequestLastName" type="text" autocomplete="family-name" autocapitalize="characters" required'));
const publicAccessRequestPayloadSource = portal.slice(portal.indexOf("function publicAccessRequestPayloadFromForm"), portal.indexOf("async function submitPublicEngagementAccessRequest"));
assert.ok(publicAccessRequestPayloadSource.includes('trim().toLocaleUpperCase("fr-FR")'));
assert.ok(portal.includes('elements.publicAccessRequestLastName?.addEventListener("input"'));
const cleanAccessRequestSource = functions.slice(functions.indexOf("function cleanEngagementAccessRequestPayload"), functions.indexOf("function engagementAccessRequestItem"));
assert.ok(cleanAccessRequestSource.includes('cleanText(raw.lastName).toLocaleUpperCase("fr-FR")'));
assert.ok(portalHtml.includes('id="adminAccessAddButton" class="ghost-button admin-access-add-button"'));
assert.ok(portalHtml.indexOf('id="adminAccessAddButton"') < portalHtml.indexOf('id="adminAccessListPanel"'));
assert.ok(portalHtml.includes('<dialog id="adminAccessPanel"'));
assert.ok(portalHtml.includes('id="adminAccessDialogClose"'));
assert.equal(portalHtml.includes('<section id="adminAccessPanel"'), false);
assert.ok(portal.includes('dialog.showModal()'));
assert.ok(portal.includes('elements.accessPanel?.addEventListener("close"'));
assert.ok(portalCss.includes("#adminAccessView .admin-access-dialog::backdrop"));
assert.ok(portal.includes("data-access-directory-toggle"));
assert.ok(portal.includes('class="admin-access-row-summary"'));
assert.ok(portal.includes('class="admin-access-row-expanded"'));
assert.ok(portal.includes('class="ghost-button admin-access-action-button"'));
assert.ok(portal.includes('<span role="columnheader">Nom</span>'));
assert.ok(portal.includes('<span role="columnheader">Prénom</span>'));
assert.ok(portal.includes('<span role="columnheader">Email</span>'));
assert.ok(portal.includes('const name = [user.lastName, user.firstName]'));
const accessUsersRenderSource = portal.slice(portal.indexOf("function renderAccessUsers"), portal.indexOf("function renderAccessPagination"));
assert.ok(accessUsersRenderSource.includes("const sortedUsers = [...accessUsers].sort"));
assert.ok(accessUsersRenderSource.includes('String(left.lastName || "").localeCompare'));
assert.ok(accessUsersRenderSource.includes('String(left.firstName || "").localeCompare'));
assert.ok(portalCss.includes("#adminAccessView .admin-access-row-toggle"));
assert.ok(portalCss.includes("#adminAccessView .admin-access-action-button svg"));
assert.ok(portalCss.includes("#adminAccessView .admin-access-row > div::before"));
assert.ok(portalCss.includes("content: none;"));
assert.ok(portalCss.includes('#adminAccessView .admin-access-row[data-expanded="true"] .admin-access-row-expanded'));
const accessUsersLoadSource = portal.slice(portal.indexOf("async function loadAccessUsers"), portal.indexOf("async function showNextAccessPage"));
assert.ok(accessUsersLoadSource.includes("accessUsersLoaded && !reset && !force"));
assert.ok(accessUsersLoadSource.includes("accessUsersLoaded = true"));
assert.equal(accessUsersLoadSource.includes("lastRefreshSuffix"), false);
assert.equal(portal.includes("function addEngagementClubSwimmerAsOfficial"), false);
assert.ok(portal.includes('callFunction("saveEngagementClubPerson"'));
assert.ok(portal.includes("function engagementClubPersonForSwimmer"));
assert.ok(functions.includes("async function resolveEngagementClubPersonSwimmer"));
assert.ok(functions.includes("swimmerIndexId: linkedSwimmer.swimmerIndexId"));
assert.ok(functions.includes("swimmer: roles.swimmer === true"));
assert.ok(functions.includes("swimmer: targetRoles.swimmer === true || sourceRoles.swimmer === true"));
const clubGeneralRowsSource = portal.slice(portal.indexOf("const clubRows = ["), portal.indexOf("const rows = adminMode ? ["));
assert.equal(clubGeneralRowsSource.includes('"Statut engagements"'), false);
assert.ok(portalCss.includes("#adminEngagementsDetailGeneralPanel .admin-engagements-detail-list dd"));
assert.ok(portalCss.includes("font-size: 0.82rem"));
assert.equal(portalHtml.includes('id="adminEngagementsMaxEvents"'), false);
assert.ok(portalHtml.includes('id="adminEngagementsEditMaxEvents"'));
assert.ok(portalHtml.includes('<option value="0">Aucune limite</option>'));
assert.ok(portal.includes("const maxEventsValue = Math.trunc(Number(fields.maxEvents?.value))"));
assert.equal(portalHtml.includes('id="adminEngagementsClubSummaryRelays"'), false);
assert.equal(portal.includes("Recapitulatif indicatif de l'inscription du club."), false);
assert.ok(portalHtml.indexOf('id="adminEngagementsClubSummaryPdfButton"') > portalHtml.indexOf('id="adminEngagementsClubSummaryList"'));
assert.ok(portal.includes('category: ""'));
assert.ok(portal.includes("function engagementClubRelaySessionLabel"));
assert.ok(portal.includes('memberSummary ? `<small title="${escapeHtml(memberSummary)}">'));
assert.ok(portal.includes("function reconcileEngagementClubRelayDraft"));
assert.ok(portal.includes('draftNotice: "Épreuve modifiée : vérifiez le temps et les relayeurs."'));
assert.ok(portal.includes("const incompleteCount = rows.filter(engagementClubRelayNeedsCompletion).length"));
assert.equal(portal.includes("return eventCode && category"), false);
assert.ok(portalCss.includes(".admin-engagements-club-relay-draft-notice"));
assert.ok(portalHtml.includes('id="adminEngagementsClubRelayDialog"'));
assert.equal(portalHtml.includes('id="adminEngagementsClubRelaysSaveButton"'), false);
assert.ok(portalHtml.includes('id="adminEngagementsClubRelayDialogEvent"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubRelayDialogMembers"'));
assert.ok(portalHtml.includes('>Valider le relais</button>'));
assert.ok(portal.includes("await saveEngagementClubRelays(null, elements.engagementsClubRelayDialogMessage, nextRows)"));
assert.ok(portal.includes('messageElement.textContent = "Enregistrement du relais..."'));
assert.ok(portalCss.includes(".admin-engagements-club-relay-dialog-grid"));
assert.ok(portalCss.includes("scrollbar-gutter: stable"));
assert.ok(portalCss.includes("--portal-page-gutter: 16px"));
assert.ok(portalCss.includes("--portal-page-gutter: 12px"));
assert.ok(portalCss.includes("--portal-page-gutter: 8px"));
assert.ok(portalCss.includes("margin: 0 var(--portal-card-gutter)"));
assert.ok(portalCss.includes("padding: 0 var(--portal-panel-gutter) var(--portal-panel-gutter)"));
assert.ok(portalCss.includes("min-height: 36px"));
assert.ok(portalCss.includes("min-height: 40px"));
assert.ok(portalCss.includes(".admin-engagements-club-swimmer-license-cell {\n  display: flex"));
assert.ok(portal.includes("function engagementSwimmerLicenseStatusIndicator"));
assert.ok(portal.includes('>${requiresAttention ? "!" : "✓"}</span>'));
assert.ok(portal.includes("Nageurs engagés"));
assert.ok(portal.includes("data-engagement-club-swimmer-details-toggle"));
assert.ok(portal.includes("setEngagementClubSwimmerRowExpanded"));
assert.ok(portal.includes("engagementSwimmerCategory({"));
assert.ok(portalCss.includes('[data-expanded="true"] .admin-engagements-club-swimmer-details'));
assert.ok(portalCss.includes("#adminEngagementsDetailSwimmersPanel .admin-engagements-club-swimmers-inactive,"));
assert.ok(portalCss.includes("/* Les nageurs ne passent en accordéon que sur les petits mobiles. */"));
assert.ok(portalCss.includes("@media (min-width: 521px) and (max-width: 700px)"));
assert.ok(portalCss.includes("min-width: 500px"));
assert.ok(portalCss.includes("grid-column: auto"));
assert.ok(portal.includes('verified: ""'));
assert.ok(portal.includes('to_check: "Saison à contrôler"'));
assert.ok(portal.includes("Choisir une categorie"));
assert.ok(portal.includes("Choisir une distance"));
assert.ok(portal.includes("Choisir un sexe"));
assert.ok(portal.includes("genderOptions.length === 1"));
assert.ok(portal.includes("disabled data-relay-gender-locked=true"));
assert.ok(portal.includes("function syncEngagementClubRelayDialogMemberOptions"));
assert.ok(portal.includes("function resetEngagementClubRelayDialogMembers"));
assert.ok(portal.includes("function engagementRelayLegChoiceLabel"));
assert.ok(portal.includes('<span aria-hidden="true">${memberIndex + 1}</span>'));
assert.ok(portal.includes('<option value="">${escapeHtml(choiceLabel)}</option>'));
assert.ok(portal.includes("function engagementRelayMemberSummary"));
assert.ok(portal.includes("function engagementRelayMemberShortLabels"));
assert.ok(portal.includes('class="admin-engagements-club-relay-member-list"'));
assert.ok(portalCss.includes(".admin-engagements-club-relay-member-list"));
assert.ok(portalHtml.includes('id="adminEngagementsClubRelayDialogReset"'));
assert.ok(portal.includes('eventCode: ""'));
assert.ok(portal.includes('genderMode: ""'));
assert.ok(portalCss.includes("#adminEngagementsClubRelayDialogReset"));
assert.ok(portal.includes('data-engagement-club-relay-readonly="true"'));
assert.ok(portal.includes("data-engagement-club-relay-edit"));
assert.ok(portal.includes('data-engagement-club-relay-remove aria-label="Supprimer le relais" title="Supprimer le relais"><svg'));
assert.ok(portalCss.includes(".admin-engagements-club-relay-row > .admin-engagements-club-relay-remove"));
assert.ok(portalCss.includes("container-type: inline-size"));
assert.ok(portalCss.includes("@container (max-width: 759px)"));
assert.ok(portalCss.includes("@container (max-width: 520px)"));
assert.ok(portalCss.includes("grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(150px, 1.25fr)"));
assert.ok(!portalHtml.includes('id="adminEngagementsClubRelaysSummary"'));
assert.ok(portalHtml.includes('>Ajouter un relais</button>'));
assert.ok(portalHtml.indexOf('id="adminEngagementsClubRelaysAddButton"') > portalHtml.indexOf('id="adminEngagementsClubRelaysList"'));
assert.ok(portalCss.includes("grid-template-columns: repeat(3, minmax(0, 1fr))"));
assert.ok(portal.includes('openEngagementClubRelayDialog("", elements.engagementsClubRelaysAddButton)'));
assert.ok(portal.includes('openEngagementClubRelayDialog(relayId, editButton)'));
assert.ok(portal.includes('(savedRelay.members || []).map((member) => member.swimmerIndexId).filter(Boolean)'));
assert.ok(portal.includes('(Array.isArray(relay.members) ? relay.members.map((member) => member.swimmerIndexId).filter(Boolean) : [])'));
assert.ok(functions.includes('memberIds: (Array.isArray(relay.memberIds) ? relay.memberIds : [])'));
assert.ok(portalCss.includes(".admin-engagements-club-relay-dialog-fields"));
assert.ok(portalCss.includes(".admin-engagements-club-relay-compose-readonly > strong"));
assert.ok(portal.includes("choisissez Femmes, Hommes ou Mixte"));
assert.ok(portalCss.includes('@media (min-width: 521px) and (max-width: 1080px)'));
assert.ok(portalCss.includes('.admin-engagements-club-relay-event small'));
assert.ok(portalCss.includes('box-shadow: inset 3px 0 0 #cf6f9b'));
assert.ok(portalCss.includes('box-shadow: inset 3px 0 0 #4f8fc5'));
assert.ok(portal.includes("const sortedSelectedRows = [...selectedRows].sort"));
assert.ok(portal.includes("function renderEngagementClubSelectedSwimmersPreview"));
assert.ok(portal.includes("sexRank(left.sex) - sexRank(right.sex)"));
assert.ok(portal.includes("function compareEngagementSwimmersBySexAndName"));
assert.ok(portal.includes("function compareEngagementSwimmersByName"));
assert.ok(portal.includes('engagementClubAvailableSwimmersSexFilter === "all"\n      ? compareEngagementSwimmersByName'));
assert.ok(portal.includes("].sort(compareEngagementSwimmersBySexAndName)"));
assert.ok(portal.includes(".sort(compareAvailableSwimmers)\n      .slice(0, visibleAvailableLimit)"));
assert.ok(portalCss.includes('.admin-engagements-club-swimmer-row[data-selected="true"][data-sex="F"]'));
assert.ok(portalCss.includes('.admin-engagements-club-swimmer-row[data-selected="true"][data-sex="M"]'));
assert.equal(portalHtml.includes('id="adminEngagementsPoolLaneCount"'), false);
assert.ok(portalHtml.includes('id="adminEngagementsEditPoolLaneCount" type="number" min="4" max="10"'));
assert.ok(portal.includes('poolLaneCount: fields.poolLaneCount?.value === ""'));
assert.ok(portal.includes('dialog.insertAdjacentElement("afterend", modal)'));
assert.ok(functions.includes("function cleanEngagementPoolLaneCount"));
assert.ok(functions.includes('value === 0 || value === "0"'));
assert.ok(functions.includes("Renseignez le bassin et le nombre de lignes d'eau avant d'ouvrir les engagements."));
assert.ok(functions.includes("Renseignez le chronometrage avant d'ouvrir les engagements."));
assert.ok(functions.includes("Renseignez la date et l'heure de cloture avant d'ouvrir les engagements."));
assert.ok(functions.includes("Seule une competition a venir peut etre retiree du calendrier par la region."));
assert.ok(portal.includes("Programme en préparation."));
assert.ok(portal.includes("function confirmOpenedCompetitionSensitiveChanges"));
assert.ok(portal.includes("const ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE = false"));
assert.ok(functions.includes("const ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE = false"));
assert.ok(portal.includes("preserveLocalSwimmerSelections: true"));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamPersonResults"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamPersonCreate"'));
assert.ok(portalHtml.includes('class="admin-engagements-club-team-summary"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamExternalNote"'));
assert.ok(portalHtml.includes("Un chef d&rsquo;&eacute;quipe hors club ne peut pas"));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamExternalDialog"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamExternalDialogApply"'));
assert.ok(portalHtml.includes('class="admin-engagements-club-external-team-note"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubSelectedOfficialsList"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubOfficialsSearch"'));
assert.ok(portal.includes("data-engagement-club-team-person-result"));
assert.ok(portal.includes("...engagementClubSwimmers"));
assert.ok(portal.includes("function confirmEngagementClubTeamLeaderCandidate"));
assert.ok(portal.includes("Voulez-vous lui attribuer ce rôle ?"));
assert.ok(portal.includes('candidateType: "swimmer"'));
assert.ok(portal.includes("if (candidate.candidateType !== \"swimmer\") return candidate;"));
assert.ok(portal.includes("renderEngagementClubTeamPersonOptions(personId)"));
assert.ok(portal.includes("let selectionFailed = false"));
assert.ok(portal.includes("setEngagementClubTeamManualFieldsVisible(true)"));
assert.ok(portal.includes("engagementsClubTeamExternalNote.hidden"));
assert.ok(portal.includes("teamSearchLabel.hidden = !declaringPerson || externalClub"));
assert.ok(portal.includes("function openEngagementClubExternalTeamDialog"));
assert.ok(portal.includes("saveEngagementClubExternalTeamLeader"));
assert.ok(portalHtml.includes("Rechercher parmi les membres du club"));
assert.ok(portal.includes('renderOfficialTable(availableClubOfficials, "Officiels du club")'));
assert.ok(portal.includes("Officiels engagés"));
assert.ok(portal.includes("handleEngagementClubOfficialSelection"));
assert.ok(portal.includes('engagementClubMemberRoleConflict(candidate, "official")'));
assert.ok(portal.includes('engagementClubMemberRoleConflict(swimmer, "swimmer")'));
assert.ok(functions.includes("assertEngagementSwimmerRoleCompatibility"));
assert.ok(functions.includes("Une meme personne ne peut pas etre nageur et officiel"));
assert.ok(portalCss.includes(".admin-engagements-club-team-summary[data-complete=\"false\"]"));
assert.ok(portalCss.includes(".admin-engagements-club-external-team-grid"));
assert.ok(portalCss.includes(".admin-engagements-club-external-team-note"));
assert.ok(functions.includes("if (!externalClub && !licenseNumber)"));
assert.ok(functions.includes("teamLeader.externalClub ? teamLeader.clubName : teamLeader.licenseNumber"));
assert.ok(portalCss.includes("#adminEngagementsDetailGeneralPanel .admin-engagements-detail-list dd"));
assert.ok(portalCss.includes("#adminEngagementsDetailEntriesPanel .admin-engagements-club-entry-action"));
assert.ok(portalCss.includes("#adminEngagementsDetailRelaysPanel .admin-engagements-club-relay-members"));
assert.ok(portal.includes('data-engagement-club-swimmer-delete="${escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}"'));
assert.ok(portal.includes('callFunction("requestEngagementClubSwimmerDeletion"'));
assert.ok(portal.includes('callFunction("setEngagementClubSwimmerActivityStatus"'));
assert.ok(portal.includes('cache: "no-cache"'));
assert.ok(portal.includes("publicPerformanceSwimmerSearchShards.clear();"));
assert.ok(portal.includes("stablePerformanceId || swimmer.swimmerId || swimmer.identityKey"));
assert.ok(portal.includes("function engagementClubSwimmerIsActive"));
assert.ok(portal.includes('data-engagement-club-swimmer-activity-status="${nextActivityStatus}"'));
assert.ok(portal.includes('class="admin-engagements-club-swimmers-directory-activity-separator"'));
assert.ok(portal.includes(': engagementClubSwimmerIsActive(swimmer)'));
assert.ok(portal.includes('query ? "Résultats de recherche" : "Nageurs actifs"'));
assert.ok(functions.includes("exports.setEngagementClubSwimmerActivityStatus"));
assert.ok(functions.includes("async function reactivateEngagementClubRosterSwimmersFromPerformanceRows"));
assert.ok(functions.includes("indexDocs.set(snapshot.id, { ...(snapshot.data() || {}), id: snapshot.id })"));
assert.ok(functions.includes("indexDocs.set(doc.id, { ...(doc.data() || {}), id: doc.id })"));
assert.ok(functions.includes('clubActivityStatusSource: "new-performance"'));
assert.ok(functions.includes("clubActivityReactivation = await reactivateEngagementClubRosterSwimmersFromPerformanceRows"));
assert.ok(portalCss.includes(".admin-engagements-club-swimmers-directory-activity-separator"));
assert.ok(portalCss.includes(".admin-engagements-club-swimmers-directory-activity-button"));
assert.ok(portal.includes("engagementsClubSwimmersDirectorySearchClear?.addEventListener"));
assert.ok(portal.includes("engagementsClubSwimmersDirectorySexFilter?.addEventListener"));
assert.ok(portal.includes('engagementClubSwimmersDirectorySexFilter === "all"'));
assert.ok(portalCss.includes(".admin-engagements-club-swimmers-directory-sex-filter"));
assert.ok(portalCss.includes('[data-activity-status="inactive"]'));
assert.ok(portalCss.includes('content: "·"'));
assert.ok(portal.includes('<span>${isActive ? "Actif" : "Inactif"}</span>'));
assert.ok(portal.includes('<path d="M12 3v9"></path>'));
assert.ok(portalCss.includes('[data-engagement-club-swimmer-activity-status="inactive"]:hover'));
assert.ok(portal.includes("${subject} n'apparaîtra plus spontanément dans les sélections d'engagement."));
assert.ok(portal.includes('data-engagement-club-swimmer-activity-sex="${escapeHtml(sex)}"'));
assert.ok(portal.includes('? "Elle"'));
assert.ok(portal.includes('title="Profil ${isActive ? "actif — cliquer pour rendre inactif"'));
assert.ok(portalCss.includes("minmax(110px, 0.7fr) 166px"));
assert.ok(portalHtml.indexOf('id="adminEngagementsClubNewSwimmerDialog"') < portalHtml.indexOf('id="adminEngagementsClubSwimmersList"'));
assert.ok(portal.includes('callFunction("listEngagementSwimmerDeletionRequests"'));
assert.ok(portal.includes('"resolveEngagementSwimmerDeletionRequest"'));
assert.ok(functions.includes("async function engagementClubSwimmerDeletionUsage"));
assert.ok(functions.includes('.where("clubId", "==", context.clubId).limit(201).get()'));
assert.ok(functions.includes('where("identityKey", "==", identityKey).limit(5).get()'));
assert.ok(functions.includes("exports.requestEngagementClubSwimmerDeletion"));
assert.ok(functions.includes("exports.listEngagementSwimmerDeletionRequests"));
assert.ok(functions.includes("exports.resolveEngagementSwimmerDeletionRequest"));
assert.ok(functions.includes('status: "deletion-pending"'));
assert.ok(portalHtml.includes('id="adminEngagementsSwimmerCorrectionDialog"'));
assert.ok(portalHtml.includes('id="adminEngagementsSwimmerChangeRequestsList"'));
assert.ok(portalHtml.includes('id="adminNationalOverviewPendingCount"'));
assert.ok(portalHtml.includes('data-engagements-national-panel="deletions"'));
assert.ok(portalHtml.includes('data-engagements-national-panel="swimmers"'));
assert.ok(portalHtml.includes('data-engagements-national-panel="people"'));
assert.ok(portalHtml.includes('data-engagements-national-panel="audit"'));
assert.equal(portalHtml.includes('data-engagements-national-panel="accounts"'), false);
assert.equal(portalHtml.includes('class="admin-engagements-national-tabs"'), false);
assert.ok(portalHtml.includes('id="adminEngagementsNationalSwimmersMergeMode"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalPeopleMergeMode"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalAuditSearch"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalAuditPeriod"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalAuditClub"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalAuditActor"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalAuditActorSearch"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalAuditActorSelected"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalAuditActorOptions"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalAuditOrigin"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalAuditLoadMore"'));
assert.ok(portalHtml.includes('data-engagements-nav-entry="adminAudit"'));
assert.equal(portal.includes("normalizePerformanceSearchText"), false);
assert.ok(portal.includes("function canViewActivityLog()"));
assert.ok(portal.includes('return canUse("admin.full")'));
assert.ok(portal.includes("function groupedEngagementNationalAuditLogs"));
assert.ok(portal.includes("const latestGroupByKey = new Map()"));
assert.ok(portal.includes("10 * 60 * 1000"));
assert.ok(portal.includes('actionLabel = grouped ? "Engagements mis à jour"'));
assert.ok(portal.includes('callFunction("listEngagementNationalAuditLogs"'));
assert.ok(portal.includes('callFunction("listAccessUsers", { pageSize: 25, search: query }'));
assert.ok(portal.includes("function handleEngagementNationalAuditActorSearch"));
assert.ok(portal.includes("function setEngagementNationalAuditActorSelection"));
assert.ok(portal.includes("function auditChangeRows"));
assert.ok(portal.includes("function auditGroupedActionsHtml"));
assert.ok(portal.includes('Détails complémentaires'));
assert.ok(portal.includes("function auditReadableValue"));
assert.ok(portal.includes('teamLeader: "Chef d’équipe"'));
assert.ok(portal.includes('Action réalisée par'));
assert.ok(portal.includes('mise${actionLogs.length > 1 ? "s" : ""} à jour regroupée'));
assert.ok(portal.includes("accessClubReference.forEach((club)"));
assert.ok(functions.includes("async function auditManagementContext"));
assert.ok(functions.includes('data.capabilities?.["admin.full"] !== true'));
assert.ok(functions.includes('const AUDIT_LEGACY_VISIBLE_SINCE = "2026-08-12T00:00:00.000Z"'));
assert.ok(functions.includes('orderBy(FieldPath.documentId(), "desc")'));
assert.ok(functions.includes("query.limit(limit + 1).get()"));
assert.ok(functions.includes("AUDIT_ACTOR_RESOLUTION_LIMIT = 25"));
assert.ok(functions.includes("AUDIT_COMPETITION_RESOLUTION_LIMIT = 25"));
assert.ok(functions.includes("AUDIT_PERSON_RESOLUTION_LIMIT = 25"));
assert.ok(functions.includes('db.collection("engagementClubPeople").doc(personId)'));
assert.ok(functions.includes("personDocuments: personSnapshots.length"));
assert.ok(functions.includes('db.collection("engagementCompetitions").doc(competitionId)'));
assert.ok(functions.includes("auth.getUsers(unresolvedAuthUids.map"));
assert.ok(portal.includes("engagementNationalAuditCompetitions"));
assert.ok(portal.includes("knownCompetitionIds"));
assert.ok(portal.includes('actor.name || actor.email || "Utilisateur non identifié"'));
assert.ok(portal.includes('(competitionId ? "Compétition" : "")'));
assert.ok(portalCss.includes("minmax(140px, 1.6fr) repeat(5, minmax(72px, 1fr)) auto"));
assert.ok(portalHtml.includes('class="admin-national-audit-filter-actions"'));
assert.ok(portalHtml.includes("Recharger le journal"));
assert.ok(portalHtml.indexOf('id="adminEngagementsNationalAuditRefresh"') < portalHtml.indexOf('data-engagements-national-panel="audit"'));
assert.ok(functions.includes('writeAuditLogOnce("recordsMpf.published"'));
assert.ok(functions.includes('data.updatedBy).slice(0, 160) || "system:records-publication"'));
assert.ok(portal.includes('"recordsMpf.published": ["Records et MPF publiés", "performances"]'));
const auditIndexes = indexes.indexes.filter((index) => index.collectionGroup === "auditLogs");
assert.equal(auditIndexes.length, 3);
assert.ok(auditIndexes.some((index) => index.fields.some((field) => field.fieldPath === "actorUid")));
assert.ok(auditIndexes.some((index) => index.fields.some((field) => field.fieldPath === "target.clubId")));
assert.ok(portalHtml.includes('id="adminEngagementsNationalSwimmersSearch"'));
assert.ok(portal.includes("data-engagement-club-swimmer-change"));
assert.ok(portal.includes('data-engagement-national-swimmer-action="edit"'));
assert.ok(portal.includes('"requestEngagementClubSwimmerChange"'));
assert.ok(portal.includes('callFunction("listEngagementSwimmerChangeRequests"'));
assert.ok(portal.includes('callFunction("resolveEngagementSwimmerChangeRequest"'));
assert.ok(portal.includes("sourceIdentityKey: source.identityKey"));
assert.ok(portal.includes("targetIdentityKey: target.identityKey"));
assert.ok(portal.includes('data-engagement-national-swimmer-action="repair-publication"'));
assert.ok(portal.includes('callFunction("repairEngagementNationalSwimmerMergePublication"'));
assert.ok(portal.includes("item.requestedByFirstName"));
assert.ok(portal.includes("item.requestedByLastName"));
assert.ok(portal.includes("<strong>Demandée par :</strong>"));
assert.ok(portal.includes("resolutionNotification?.status"));
assert.ok(portal.includes('data-engagement-swimmer-change-edit="${escapeHtml(item.id || "")}"'));
assert.ok(portal.includes("function openEngagementSwimmerChangeRequestReview"));
assert.ok(portal.includes('openEngagementSwimmerCorrectionDialog(swimmer, "review", opener'));
assert.ok(portal.includes('review ? "Modifier et valider la demande"'));
assert.ok(portal.includes('review ? "Valider la demande"'));
assert.ok(portal.includes("proposed: payload.proposed"));
assert.ok(portal.includes("engagementSwimmerCorrectionReview = null"));
assert.ok(portal.includes('callFunction(direct ? "updateEngagementNationalSwimmerIdentity"'));
assert.ok(functions.includes('const ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION = "engagementSwimmerChangeRequests"'));
assert.ok(functions.includes("exports.requestEngagementClubSwimmerChange"));
assert.ok(functions.includes("exports.requestEngagementClubSwimmerChange = onCall(ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS"));
assert.ok(functions.includes("exports.listEngagementSwimmerChangeRequests"));
assert.ok(functions.includes("exports.getEngagementNationalAdministrationOverview"));
assert.ok(functions.includes("exports.resolveEngagementSwimmerChangeRequest"));
assert.ok(functions.includes("materializeEngagementNationalPerformanceSwimmerForMerge"));
assert.ok(functions.includes('action: "engagement.swimmerMergeIndexRecovered"'));
assert.ok(functions.includes("sourceMergeIds = swimmerMergeIds"));
assert.ok(functions.includes("recoveredPerformanceRowsAreComplete(rows, target.swimmer?.performanceCount)"));
assert.ok(functions.includes("resolvedTargetSwimmerId"));
assert.ok(functions.includes("publishEngagementNationalSwimmerMerge"));
assert.ok(functions.includes("existingTargetPayload"));
assert.ok(functions.includes("await deletePublicPerformanceFile(newPerfFile)"));
assert.ok(functions.includes("exports.repairEngagementNationalSwimmerMergePublication"));
assert.ok(functions.includes("mergePublicationRepaired"));
assert.ok(functions.includes("ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS"));
assert.ok(functions.includes("sendEngagementSwimmerChangeResolutionNotification"));
assert.ok(functions.includes("requestedByFirstName: context.firstName"));
assert.ok(functions.includes("notificationStatus: resolutionNotification.status"));
assert.ok(functions.includes("resolvedProposed: data.resolvedProposed"));
assert.ok(functions.includes("proposalAdjusted: data.proposalAdjusted === true"));
assert.ok(functions.includes("const reviewedProposal = request.data?.proposed"));
assert.ok(functions.includes("requestedProposed: requestedCorrection || data.proposed || {}"));
assert.ok(functions.includes("exports.updateEngagementNationalSwimmerIdentity"));
assert.ok(functions.includes("function assertNoEngagementSwimmerIdentityConflict"));
assert.ok(functions.includes("findReferenceSwimmerCorrectionTarget(intranapSwimmersIndex"));
assert.ok(functions.includes("async function findEngagementSwimmerCorrectionLicense"));
assert.ok(functions.includes("licenseMatch.documentId"));
assert.ok(functions.includes('source: "performance-base"'));
assert.ok(functions.includes('resolvedBy: "performance-base"'));
assert.ok(functions.includes("Array.isArray(target.performanceRows) && target.performanceRows.length"));
assert.ok(functions.includes('resolvedBy: `reference-${referenceTarget.matchedBy || "fallback"}`'));
assert.ok(functions.includes("ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS"));
assert.ok(functions.includes("ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS"));
assert.ok(functions.includes("ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE"));
assert.ok(functions.includes("for (let index = 0; index < refs.length; index += 400)"));
assert.ok(functions.includes(".orderBy(FieldPath.documentId())"));
assert.ok(functions.includes("rebuildPublicPerformanceFilesForAffectedRows(updatedRows"));
assert.ok(portalCss.includes(".admin-engagements-swimmer-correction-dialog::backdrop"));
assert.ok(portalCss.includes('content: "Action"'));
assert.ok(portal.includes("data-engagement-club-entry-cell-time"));
assert.ok(portal.includes("function formatEngagementEntryTimeInput"));
assert.ok(portal.includes("function normalizeEngagementEntryTimeInput"));
assert.ok(portal.includes('placeholder="00:00.00" data-engagement-club-relay-time'));
assert.ok(portal.includes('Temps invalide : utilisez MM:SS.CC ou saisissez uniquement les chiffres.'));
assert.ok(portal.includes('String(minutes).padStart(2, "0")'));
assert.ok(portal.includes("void persistEngagementClubIndividualEntries(swimmer)"));
assert.ok(portal.includes("data-engagement-club-times-open"));
assert.ok(portal.includes("openEngagementClubTimesDialog"));
assert.equal(portal.includes("Chargement des temps du nageur..."), false);
const clubTimesDialogOpenSource = portal.slice(portal.indexOf("async function openEngagementClubTimesDialog"), portal.indexOf("function closeEngagementClubTimesDialog"));
assert.ok(clubTimesDialogOpenSource.includes("ensureEngagementClubSwimmerEventTimes"));
assert.ok(portal.includes('callFunction("getEngagementClubEntryTimeHistory"'));
assert.ok(portal.includes("data-engagement-club-time-history-select"));
assert.ok(portalCss.includes(".admin-engagements-club-time-history-select"));
assert.equal(portal.includes("Temps LivePalmes"), false);
assert.ok(portal.includes("Temps saisi manuellement"));
assert.ok(portal.includes("Aucun temps connu"));
assert.ok(portal.includes('button.textContent = "Saisie libre"'));
assert.ok(portal.includes("option.dataset.historyDate"));
assert.ok(portal.includes("option.dataset.historyLocation"));
assert.ok(portal.includes("if (!value || seen.has(value)) return"));
assert.ok(portalCss.includes('[data-has-alternatives="false"]'));
assert.ok(portal.includes("setEngagementClubEntriesDirty(true)"));
assert.ok(portal.includes("setEngagementClubEntriesDirty(false)"));
assert.ok(portal.includes("selectedEngagementClubEntry = {\n          ...(selectedEngagementClubEntry || {}),\n          swimmers\n        };\n        renderEngagementClubSwimmers();"));
assert.ok(portal.includes("renderEngagementClubEntries();\n        renderEngagementClubRelays();"));
assert.ok(portal.includes("engagementClubSwimmerEventTimesCache.has(cacheKey)"));
assert.equal(portal.includes('callFunction("previewEngagementClubEntryTimes"'), false);
assert.ok(portal.includes("ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS = 5 * 60 * 1000"));
assert.ok(portal.includes("ENGAGEMENT_CLUB_WORKSPACE_PRELOAD_LIMIT = 4"));
assert.ok(portal.includes('callFunction("preloadEngagementClubWorkspaces", { competitionIds })'));
assert.ok(portal.includes("ENGAGEMENT_CLUB_WORKSPACE_SESSION_CACHE_PREFIX"));
assert.ok(portal.includes("ENGAGEMENT_CLUB_SWIMMERS_CACHE_TTL_MS = 5 * 60 * 1000"));
assert.ok(portal.includes("ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX"));
assert.ok(portal.includes("function readEngagementClubSwimmersCache"));
assert.ok(portal.includes("function writeEngagementClubSwimmersCache"));
assert.ok(portal.includes("function invalidateEngagementClubSwimmersCache"));
assert.ok(portal.includes('void loadEngagementClubSwimmers({ silent: true });'));
assert.ok(portal.includes("engagementClubSwimmersLoading && !engagementClubSwimmersLoaded"));
assert.ok(portal.includes('const clubCalendarAlreadyOpen = requestedMode === "club" && global.location.hash === "#club-competitions"'));
assert.ok(portal.includes("if (!entry && shouldActivate)"));
assert.ok(portal.includes("Le calendrier est momentanément indisponible."));
assert.ok(portal.includes("if (cachedWorkspaceFresh) return"));
assert.equal(portal.includes('if (canUse("engagements.club.manage")) void loadEngagementCompetitions()'), false);
assert.ok(portal.includes('if (engagementsActive && activeEngagementsTab === "calendar") loadEngagementCompetitions();'));
assert.ok(portal.includes('setEngagementClubEntryLoadingState("loading")'));
assert.ok(portal.includes("Chargement de vos engagements enregistrés..."));
assert.ok(portal.includes("admin-engagements-calendar-loading"));
assert.ok(portalCss.includes("#adminEngagementsDetail[data-club-entry-loading]"));
assert.ok(portal.includes("engagementCompetitionsLoadedRange"));
assert.ok(portal.includes('ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX = "livepalmes.portal.engagementCalendar.v2."'));
assert.ok(portalHtml.includes('livepalmes-admin-portal.js?v=20260819-calendar-status-1'));
assert.ok(portalHtml.includes('livepalmes-admin-calendar-events.js?v=20260819-calendar-status-1'));
assert.ok(portal.includes("ENGAGEMENT_CALENDAR_CACHE_TTL_MS = 5 * 60 * 1000"));
assert.ok(portal.includes("engagementCompetitionCalendarMemoryCache"));
assert.ok(portal.includes("engagementCompetitionCalendarRequests"));
assert.ok(portal.includes('loadEngagementCompetitions({ mode: "club", activate: false, silent: true })'));
assert.ok(portal.includes('manageOnly: requestedMode === "admin"'));
assert.ok(portal.includes("global.sessionStorage?.setItem(`${ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX}${cacheKey}`"));
assert.ok(portal.includes("function upsertEngagementCalendarItemFromServer"));
assert.ok(portal.includes('upsertEngagementCalendarItemFromServer(selectedEngagementCompetition, "competition")'));
assert.ok(calendarEvents.includes('detail: { action: "upsert", event: result.event }'));
assert.ok(calendarEvents.includes('detail: { action: "delete", calendarEventId }'));
const calendarCacheReconciliationStart = portal.indexOf("function upsertEngagementCalendarItemFromServer");
const calendarCacheReconciliationEnd = portal.indexOf("function invalidateEngagementCalendarCaches", calendarCacheReconciliationStart);
const calendarCacheReconciliationSandbox = {};
vm.runInNewContext(`
  let engagementCompetitions = [{ id: "competition-1", sourceType: "competition", publicationStatus: "draft" }];
  const engagementCalendarCacheCompetition = (item) => ({ ...item });
  let persisted = 0;
  let rendered = 0;
  const persistActiveEngagementCalendarCache = () => { persisted += 1; };
  const renderEngagementCompetitions = () => { rendered += 1; };
  ${portal.slice(calendarCacheReconciliationStart, calendarCacheReconciliationEnd)}
  upsertEngagementCalendarItemFromServer({ id: "competition-1", publicationStatus: "published" }, "competition");
  result = { engagementCompetitions, persisted, rendered };
`, calendarCacheReconciliationSandbox);
assert.equal(calendarCacheReconciliationSandbox.result.engagementCompetitions.length, 1);
assert.equal(calendarCacheReconciliationSandbox.result.engagementCompetitions[0].publicationStatus, "published");
assert.equal(calendarCacheReconciliationSandbox.result.persisted, 1);
assert.equal(calendarCacheReconciliationSandbox.result.rendered, 1);
assert.ok(engagementCompetitionListSource.includes("const prefetchedSnapshots = await db.getAll"));
assert.ok(engagementCompetitionListSource.includes("clubEntryIndexSnapshot"));
assert.ok(portalAuth.includes("accessRefreshPromise && accessRefreshUid === refreshUid"));
assert.ok(functions.includes('console.info("livepalmes.portal.reads"'));
assert.ok(functions.includes("exports.rebuildEngagementClubAggregates"));
assert.ok(functions.includes("publicPerformanceSwimmerFilePath(sourceKey)"));
assert.ok(functions.includes("exports.buildDtnQualificationView = onDocumentCreated"));
assert.ok(functions.includes("enqueueDtnQualificationJob"));
assert.ok(dtnOverviewSource.includes("request.data?.rebuild !== true"));
assert.ok(dtn.includes("rebuild: options.rebuild === true"));
assert.ok(mailRecipientSource.includes("engagementMailRecipientsFromIndex"));
assert.equal(mailRecipientSource.includes(".limit(1000)"), false);
assert.ok(functions.includes("exports.rebuildEngagementMailRecipientIndexNextPage"));
assert.ok(functions.includes("ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT = 32"));
assert.equal(additionalPerformanceSnapshotSource.includes(".collection("), false);
assert.ok(additionalPerformanceSnapshotSource.includes("readPublishedAdditionalPerformanceDataSnapshot"));
assert.equal(importDeletionSource.includes('.collection("performances").get()'), false);
assert.equal(importDeletionSource.includes('.where("importId", "==", importId)'), false);
assert.ok(functions.includes("Number(request.data?.pageSize || 500) || 500, 100), 500"));
assert.equal(functions.slice(functions.indexOf("const DTN_QUALIFICATION_JOB_OPTIONS"), functions.indexOf("const PORTAL_ACCESS_RATE_LIMIT_COLLECTION")).includes("retry: true"), false);
assert.ok(dtn.includes("Recalcul lancé en arrière-plan"));
assert.equal(portalHtml.includes("assets/livepalmes-dtn-qualifications.js"), false);
assert.ok(portal.includes("function loadDtnModule"));
assert.ok(portalCss.includes(".admin-engagements-club-entries-table-shell"));
assert.equal(portalCss.includes(".admin-engagements-club-entries-save-bar"), false);
assert.ok(portalCss.includes(".admin-engagements-club-entry-last-name"));
assert.ok(portalCss.includes("[data-engagement-club-entry-cell-time][hidden]"));
assert.ok(portalCss.includes(".admin-engagements-club-times-dialog::backdrop"));
assert.ok(publicSeries.includes("restoredPublicSeriesCache"));
assert.ok(publicSeries.includes("Index publics indisponibles."));
assert.ok(publicResults.includes("restoredPublicResultsCache"));
assert.equal(portalHtml.includes('id="adminEngagementsStepFooter"'), false);
assert.equal(portalCss.includes("admin-engagements-step-footer"), false);
assert.equal(portal.includes("engagementsFooterPrev"), false);
assert.equal(portal.includes("engagementsFooterNext"), false);
assert.ok(portalHtml.includes('id="adminEngagementsSaveState"'));
assert.ok(portal.includes("function storedEngagementDetailTab"));
assert.ok(portal.includes("livepalmes.engagement.lastTab."));
assert.ok(portal.includes("engagementClubScope(currentAccessProfile || {})"));
assert.ok(portal.includes('const hasClubEntry = competition.clubEntryExists === true'));
assert.equal(portal.includes("Boolean(rememberedTab)"), false);
assert.ok(portal.includes("function setSelectedEngagementCompetitionClubEntryExists"));
assert.ok(portal.includes("setSelectedEngagementCompetitionClubEntryExists(true)"));
assert.ok(portal.includes("setSelectedEngagementCompetitionClubEntryExists(false)"));
assert.ok(portal.includes('label: "Mes engagements"'));
assert.ok(portal.includes('label: "S’engager"'));
assert.ok(portal.includes("function updateEngagementStepNavigation"));
assert.ok(portal.includes('data-engagement-competition-card-id="${escapeHtml(competition.id)}"'));
assert.ok(portal.includes("function setEngagementSaveState"));
assert.ok(portal.includes("function initializeEngagementCourseScrollHints"));
assert.ok(portalCss.includes("Parcours compact des engagements club"));
assert.ok(portalHtml.includes('class="admin-engagements-detail-step-bar"'));
assert.ok(portalHtml.includes('data-engagement-step-button="information"'));
assert.ok(portalHtml.includes('data-engagement-step-label="summary">Récapitulatif</strong>'));
assert.ok(portalHtml.includes('data-engagement-step-label="statistics">Statistiques</strong>'));
assert.ok(portalHtml.includes('data-engagement-step-label="documents">GED</strong>'));
assert.ok(portalHtml.includes('data-engagement-step-label="delivery">Diffusion</strong>'));
assert.ok(portalHtml.includes('id="adminEngagementsDetailStatisticsPanel"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamRemoveButton"'));
assert.ok(portal.includes("function removeEngagementClubTeamLeader"));
assert.ok(portal.includes('callFunction("removeEngagementClubTeamLeader"'));
assert.ok(portal.includes("function engagementClubEntryHasParticipants"));
assert.ok(functions.includes("exports.removeEngagementClubTeamLeader"));
assert.ok(functions.includes("function engagementClubEntryHasParticipants"));
assert.ok(functions.includes("entries.filter(engagementClubEntryHasParticipants).forEach"));
assert.ok(functions.includes("!engagementClubEntryHasParticipants(entry) || !recipients.length"));
assert.ok(functions.includes('"cancelled_no_participants"'));
assert.ok(functions.includes("function engagementPdfRelayCategoryLabel(code)"));
assert.ok(functions.includes('P: "Poussin"'));
assert.equal((functions.match(/relayCategoryLabelVersion: 2/g) || []).length, 1);
assert.ok(functions.includes('format: "winpalme-v2"'));
assert.ok(functions.includes("deleteEngagementCompetitionEntrySummary(transaction, db, entry, now)"));
assert.ok(portalHtml.includes('id="adminEngagementsClubPdfSelect"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubPdfDownloadButton"'));
assert.ok(portal.includes('callFunction("getEngagementCompetitionStatistics"'));
assert.ok(portal.includes('loadEngagementCompetitionStatistics({ force: true })'));
assert.ok(functions.includes("exports.getEngagementCompetitionStatistics"));
assert.ok(functions.includes('portalReadStats("getEngagementCompetitionStatistics"'));
assert.ok(functions.includes('maximumReturnedRows = 10000'));
assert.ok(portalCss.includes('.admin-engagements-statistics-summary'));
assert.ok(portalCss.includes('.admin-engagements-ged-grid'));
assert.ok(portalHtml.includes('data-engagement-step-group="participants" hidden'));
assert.ok(portal.includes("visibleGroupTabCount < 2"));
assert.equal(portalHtml.includes("adminEngagementsMobileStepNav"), false);
assert.equal(portal.includes("engagementsMobileStep"), false);
assert.ok(portalHtml.includes('data-engagements-detail-tab-button="courses">Programme</button>'));
assert.ok(portalHtml.includes('data-engagements-detail-tab-button="entries">Courses individuelles</button>'));
assert.ok(portal.includes('entries: "Courses individuelles"'));
assert.ok(portalCss.includes("position: sticky;"));
assert.ok(portalCss.includes('grid-template-areas:\n    "context context"\n    "title badges"\n    "subtitle badges"'));
assert.ok(portalCss.includes(".admin-engagements-level-badge,"));
assert.ok(portalCss.includes("justify-content: center;"));
assert.ok(portalCss.includes("admin-engagements-club-entries-scroll-hint"));
assert.deepEqual(JSON.parse(JSON.stringify(engagementNavigationModeSandbox.result)), {
  club: "club",
  clubDirectory: "club",
  regionalAdmin: "admin",
  nationalAdmin: "admin"
});
assert.ok(portal.includes("const contextChanged = Boolean(previousMode && previousMode !== nextMode);"));
assert.ok(portal.includes("closeEngagementCompetitionDetail({ skipConfirmation: true })"));
assert.ok(portal.includes('engagementCompetitionsLoadedRange = "";'));
assert.ok(portal.includes("function closeEngagementCompetitionDetail({ skipConfirmation = false } = {})"));
assert.deepEqual(JSON.parse(JSON.stringify(filteredEngagementCompetitionsSandbox.result)), {
  competitions: ["open-urgent", "open-late", "upcoming", "closed-recent", "closed-old", "next-september"],
  augustPreview: {
    startYear: 2026,
    startDate: "2026-09-01",
    endDate: "2026-09-30"
  },
  julyPreview: null,
  otherSeasonPreview: null
});
assert.equal(portalHtml.includes("data-engagement-status"), false);
assert.ok(portalHtml.indexOf('id="adminEngagementsSeasonFilter"') < portalHtml.indexOf('id="adminEngagementsTypeFilter"'));
assert.ok(portalHtml.indexOf('id="adminEngagementsTypeFilter"') < portalHtml.indexOf('id="adminEngagementsRegionFilter"'));
assert.ok(portalHtml.indexOf('id="adminEngagementsRegionFilter"') < portalHtml.indexOf('id="adminEngagementsLevelFilter"'));
assert.ok(portal.includes('elements.engagementsStatusFilter.value = "";'));
assert.ok(portal.includes("admin-engagements-competition-mobile-meta"));
assert.ok(portalCss.includes("Calendrier Club mobile : filtres et compétitions en lecture dense"));
assert.ok(portalCss.includes("grid-template-columns: 108px minmax(0, 1fr)"));
assert.ok(portalCss.includes("grid-template-columns: auto minmax(0, 1fr) 30px"));
assert.ok(portalCss.includes("toutes les pages du portail"));
assert.ok(portalCss.includes(".admin-portal-space-home .admin-overview-card"));
assert.ok(portalCss.includes(".admin-national-home .admin-overview-card"));
assert.ok(portalCss.includes("#adminAccessView .admin-access-filters"));
assert.ok(portalCss.includes(".admin-national-directory-toolbar > .admin-national-merge-mode-button"));
assert.match(portalHtml, /id="adminEngagementsAccessRequestsRefresh"[^>]*hidden/);
assert.ok(portalCss.includes("white-space: nowrap"));
assert.ok(portalCss.includes("Le nom du portail reste lisible sur une ligne"));
assert.ok(portalCss.includes("Calendrier organisateur mobile : mêmes lignes denses que le calendrier Club"));
assert.ok(portalCss.includes('[data-engagements-mode="admin"][data-engagements-tab="calendar"] #adminEngagementsCalendarFilters'));
assert.ok(portalCss.includes('[data-engagements-mode="admin"] #adminEngagementsCalendarCard .admin-engagements-competition-group'));
assert.ok(portalHtml.includes("assets/livepalmes-admin-portal.css?v=20260819-public-calendar-1"));
assert.ok(portalHtml.includes("assets/livepalmes-portal-ux.js?v=20260818-long-operations-1"));
assert.ok(portalHtml.includes("assets/livepalmes-admin-portal.js?v=20260819-calendar-status-1"));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamModifyButton"'));
assert.ok(portalHtml.includes('id="adminEngagementsClubTeamExternalOpen"'));
assert.ok(portalHtml.includes("Chef d&rsquo;équipe de mon club"));
assert.ok(portal.includes("let engagementClubTeamEditing = true"));
assert.ok(portal.includes("restoreEngagementClubTeamLeaderChoice"));
assert.ok(portal.includes("const candidateListsReady = engagementClubPeopleLoaded && engagementClubSwimmersLoaded"));
assert.ok(portal.includes("Préparation des sélections enregistrées…"));
assert.ok(portalHtml.includes("<p>Chargement du portail</p>"));
assert.ok(portalCss.includes('[data-admin-auth="loading"] #adminPortalLoginPanel'));
assert.ok(portalCss.includes(".admin-portal-auth-loading.is-loading::before"));
assert.ok(portal.includes('!authReady ? "loading" : signedIn ? "unlocked" : "locked"'));
assert.ok(portal.includes('selectedEngagementCompetitionId && !closeEngagementCompetitionDetail()'));
assert.ok(portal.includes('contextChanged || nextTab === "calendar"'));
assert.ok(portal.includes('["P", "Poussin"]'));
assert.ok(portal.includes('["S", "Senior"]'));
assert.ok(portal.includes('const base = [["female", "Femmes"], ["male", "Hommes"]]'));
assert.ok(portalCss.includes(".admin-national-row-menu > div"));
assert.ok(portalCss.includes("right: 0;\n  z-index: 20;"));
assert.ok(portal.includes('activeEngagementsTab === "calendar"'));
assert.ok(portalCss.includes('#adminEngagementsView:not([data-engagements-tab="calendar"]) #adminEngagementsCalendarActions'));
assert.ok(portal.includes('manageOnly: requestedMode === "admin"'));
assert.ok(portal.includes('label: "Administrer"'));
assert.equal(portal.includes('label: canEditEngagementCompetition(competition) ? "Administrer" : "Voir la fiche"'), false);
assert.ok(portal.includes("const staleInitialCalendar = !previousMode && engagementCompetitionsLoaded"));
assert.ok(functions.includes("const manageOnly = request.data?.manageOnly === true;"));
assert.ok(functions.includes("const managementContext = manageOnly ? await engagementAccessContext(request) : null;"));
assert.ok(functions.includes('entryStatus: "upcoming",\n    entryDeadlineAt: ""'));
assert.ok(functions.includes('cleanText(competition.regionId) === managementContext.regionId'));
assert.ok(functions.includes("assertCanManageEngagementCompetition(context, doc.data() || {});"));
assert.ok(portal.includes('elements.engagementsDeleteButton.textContent = directDelete ? "Suppression en cours..." : "Envoi en cours...";'));
assert.ok(portal.includes("const remainingCompetitions = engagementCompetitions.filter((item) => item.id !== competition.id);"));
assert.ok(portal.includes("elements.engagementsStatus?.textContent !== successMessage"));
assert.ok(portal.includes("}, 4000);"));
assert.ok(functions.includes("batch.set(engagementCompetitionCalendarRef(db, seasonEndYear)"));
assert.ok(functions.includes("batch.delete(engagementClosureQueueRef(db, competitionId));"));
assert.ok(Array.isArray(functionsClubReference.clubs));
assert.ok(functionsClubReference.clubs.some((club) => club[0] === "106" && String(club[1]).trim() === "CNHC"));
assert.ok(clubReferenceGenerator.includes('functionsOutputPath = path.join(rootDir, "functions", "assets", "club-reference.json")'));
assert.ok(portal.includes("function clubDisplayCode"));
assert.ok(portal.includes("function clubDisplayLabel"));
assert.ok(portal.includes("function applyEngagementCalendarRegionScope"));
assert.ok(portal.includes("function engagementClubInformationOnly"));
assert.ok(portal.includes("clubInformationOnly && clubOnlyTabs.has(requestedTab)"));
assert.ok(portal.includes("isEngagementAdminMode() || clubInformationOnly"));
assert.ok(portal.includes('const regionalAdministration = mode === "admin"'));
assert.ok(portal.includes('regionalAdministration ? engagementRegionScope(user) : ""'));
assert.ok(portal.includes("applyEngagementCalendarRegionScope(currentAccessProfile, nextMode)"));
assert.equal(portal.includes('return `${code}${name} (${club.clubId})`;'), false);
assert.ok(functions.includes('const clubReference = require("./assets/club-reference.json");'));
assert.ok(functions.includes('engagementPdfCompactSummary(doc, ['));
assert.ok(functions.includes('function engagementPdfFeesTable'));
assert.ok(functions.includes('function engagementPdfEmptyState'));
assert.ok(functions.includes('label: "Sous-total"'));
assert.ok(functions.includes('text("TOTAL ESTIMÉ"'));
assert.ok(functions.includes('["Échéance", "Avant la fin de la première journée"]'));
assert.ok(functions.includes('doc.engagementPdfContinuationHeader = () =>'));
assert.ok(functions.includes('engagementPdfEmptyState(doc, "Aucun relais engagé."'));
assert.ok(functions.includes('engagementPdfEmptyState(doc, "Aucun officiel déclaré."'));
assert.ok(functions.includes('engagementClubCode(entry.clubId, entry.clubCode)].filter(Boolean).join(" · ")'));
assert.ok(functions.includes('const chunk = columns;'));
assert.ok(functions.includes('sessionGroups.forEach((group, groupIndex) => {'));
assert.ok(functions.includes('doc.lineWidth(1.15).strokeColor("#879da1")'));
assert.ok(functions.includes('layout: "portrait"'));
assert.equal(functions.includes('layout: "landscape"'), false);
assert.equal(functions.includes('columns.slice(start, start + 14)'), false);
assert.ok(functions.includes("clubCode: engagementClubCode(entry.clubId, entry.clubCode)"));
assert.ok(portalHtml.includes('id="adminPortalScopeContext"'));
assert.ok(portalHtml.includes('id="adminPortalAccountClubCode"'));
assert.ok(portalHtml.includes('class="admin-portal-title-prefix"'));
assert.ok(portal.includes("function renderPortalScopeContext"));
assert.ok(portal.includes('const clubCode = clubDisplayCode({ clubId, clubName }, "");'));
assert.ok(portal.includes('const clubLabel = clubCode || clubName;'));
assert.ok(portal.includes("elements.scopeRole.hidden = true"));
assert.ok(portal.includes('Vos droits LivePalmes sont de niveau national. Votre club pour les engagements est <strong>${escapeHtml(clubValue)}</strong>'));
assert.ok(portal.includes('Vos droits LivePalmes sont de niveau régional${regionValue && regionValue !== "-" ? ` (<strong>${escapeHtml(regionValue)}</strong>)` : ""}. Votre club pour les engagements est <strong>${escapeHtml(clubValue)}</strong>'));
assert.ok(portal.includes("renderPortalScopeContext({});"));
assert.ok(portal.includes("elements.engagementsAdvancedFilters.open = false"));
assert.ok(portal.includes('parts.push(`${days} j`)'));
assert.ok(functions.includes("isEngagementOpeningDeadlinePast(entryStatus, entryDeadlineAt)"));
assert.ok(functions.includes("Impossible d'ouvrir les engagements : la date de cloture est depassee."));
assert.ok(functions.includes('"engagements.club.switch"'));
assert.ok(functions.includes("Le droit de changement de club requiert le droit engagements club."));
assert.ok(functions.includes("const requestedClubId = cleanText(request.data?.activeClubId).slice(0, 40);"));
assert.ok(functions.includes("const activeClub = isSwitchingClub ? await engagementClubById(requestedClubId) : null;"));
assert.ok(functions.includes("exports.listEngagementNationalClubs"));
assert.ok(functions.includes("exports.saveEngagementNationalClub"));
assert.ok(functions.includes('.orderBy("updatedAt", "asc")'));
assert.ok(functions.includes('.orderBy(FieldPath.documentId(), "asc")'));
assert.ok(functions.includes('query.where("updatedAt", ">", updatedAfter)'));
assert.ok(functions.includes("snapshot.docs.slice(0, pageLimit)"));
assert.ok(functions.includes("syncWatermark"));
assert.ok(!functions.includes("variableDocumentsMax: 1500"));
assert.ok(functions.includes("!activeClub || !CLUB_REFERENCE_REGION_LABELS[activeClub.regionId]"));
assert.ok(functions.includes("Droit de changement de club requis."));
assert.ok(functions.includes("Club actif inconnu."));
assert.ok(portalAuth.includes('capabilities["engagements.club.switch"] === true'));
assert.ok(portalHtml.includes('id="adminPortalScopeClubButton"'));
assert.ok(portalHtml.includes('id="adminPortalClubSwitchDialog"'));
assert.ok(portalHtml.includes('value="engagements.club.switch"'));
assert.ok(portal.includes('const PORTAL_ACTIVE_CLUB_SESSION_KEY = "livepalmes.portal.activeClubId";'));
assert.ok(portal.includes("function activeEngagementClubIdForProfile"));
assert.ok(portal.includes("function changeActiveEngagementClub"));
assert.ok(portal.includes("...(activeClubId ? { activeClubId } : {})"));
assert.ok(portal.includes("Boolean(LIVEPALMES_REFERENCE_REGION_LABELS[club.referenceRegionId])"));
assert.ok(portal.includes("if (!signedIn && status.ready)"));
assert.ok(portal.includes('requestedGroup === "participants"'));
assert.ok(portal.includes('engagementClubTeamComplete()'));
assert.ok(portal.includes('visibleTabs.has("swimmers")'));
assert.ok(portal.includes("const target = preferredClubTab || groupTabs.find"));
assert.ok(portalCss.includes(".admin-portal-club-switch-dialog"));
assert.ok(portalCss.includes(".admin-portal-club-switch-result"));
assert.ok(portalHtml.includes('href="#administration-clubs"'));
assert.ok(portalHtml.includes('id="adminOverviewNationalTools"'));
assert.ok(portalHtml.includes('data-overview-tool data-engagements-home-entry="adminDeletionRequests" data-engagements-home-tab="deletionRequests" data-engagements-national-target="clubs"'));
assert.ok(portalHtml.includes('data-engagements-national-target="clubs" data-engagements-national-nav'));
assert.ok(portalHtml.includes('data-engagements-national-panel="clubs"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalClubFederalNumber"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalClubsRegionFilter"'));
assert.ok(portalHtml.includes('id="adminEngagementsNationalClubDelete"'));
assert.ok(portal.includes('callFunction("listEngagementNationalClubs"'));
assert.ok(portal.includes('callFunction("saveEngagementNationalClub"'));
assert.ok(portal.includes('callFunction("getPublicEngagementClubDirectory"'));
assert.ok(portal.includes('callFunction("deleteEngagementNationalClub"'));
assert.ok(portal.includes('club.active !== false && normalizedRegionKey(club.regionId) === regionKey'));
assert.ok(portal.includes('const ENGAGEMENT_NATIONAL_CLUB_CACHE_KEY = "livepalmes.portal.nationalClubs.v1";'));
assert.ok(portal.includes("function readEngagementNationalClubCache"));
assert.ok(portal.includes("function mergeEngagementNationalClubDirectory"));
assert.ok(portal.includes("engagementNationalClubSyncStart(cached.syncedThrough)"));
assert.ok(portal.includes("ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE = 48"));
assert.ok(portal.includes("data-engagement-national-clubs-show-more"));
assert.ok(portal.includes("performances/public/data/club-reference.js?v=20260813-national-clubs-3"));
assert.ok(portal.includes('elements.engagementsNationalClubFederalNumber.readOnly = false'));
assert.ok(portal.includes("confirmFederalNumberChange: federalNumberChanged"));
assert.ok(portal.includes("Cette modification sera journalisée."));
assert.ok(portal.includes("function setEngagementNationalClubAdministrators"));
assert.ok(portal.includes("function engagementNationalClubAdministratorsHtml"));
assert.ok(portal.includes("includeAdministrators,"));
assert.ok(portal.includes("Administrateurs engagements"));
assert.ok(portalCss.includes(".admin-national-club-card"));
assert.ok(portalCss.includes(".admin-national-club-card-administrators"));
assert.ok(portalCss.includes(".admin-national-clubs-show-more"));
assert.ok(portalHtml.includes("assets/livepalmes-admin-portal.js?v=20260819-calendar-status-1"));
assert.ok(portalHtml.includes('class="admin-portal-workspace-head admin-tool-workspace-head admin-dtn-workspace-head"'));
assert.ok(portalHtml.includes('id="adminDtnSeason" class="admin-dtn-season-picker" aria-label="Saison DTN"'));
assert.equal(portalHtml.includes('<select id="adminDtnSeason"></select>'), false);
assert.ok(portalHtml.includes("Export WinPalme de la compétition"));
assert.ok(functions.includes("exports.getPublicEngagementClubDirectory"));
assert.ok(functions.includes("exports.deleteEngagementNationalClub"));
assert.ok(functions.includes('ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION = "engagementClubAdminDirectories"'));
assert.ok(functions.includes("ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES = 800000"));
assert.ok(functions.includes("function readEngagementClubAdminDirectory"));
assert.ok(functions.includes('includeAdministrators ? readEngagementClubAdminDirectory(db) : Promise.resolve(null)'));
assert.ok(functions.includes('engagementMailRecipientsFromIndex(db, ["engagements.club.manage"])'));
assert.ok(functions.includes("await updateEngagementClubAdminDirectory(db, before, after, now)"));
assert.ok(functions.includes('request.data?.confirmFederalNumberChange !== true'));
assert.ok(functions.includes("previousFederalNumber, federalNumberChanged: true"));
assert.ok(functions.includes('.where("status", "==", "pending")'));
assert.ok(functions.includes('variableDocumentsMax: dependencyQueries.length'));
assert.equal(functions.includes("Le numero federal permanent d'un club ne peut pas etre modifie."), false);
assert.ok(portalHtml.includes('href="#espace-dtn-listes"'));
assert.ok(portal.includes('"#espace-dtn-listes"'));
assert.ok(dtn.includes('releve: { id: "RELEVE", sourceId: "TRP", minAge: 0, maxAge: 21 }'));
assert.ok(dtn.includes('{ id: "TEC1", sourceId: "TU16C1", minAge: 14, maxAge: 15 }'));
assert.ok(dtn.includes('{ id: "TEP", sourceId: "TEP", minAge: 16, maxAge: 18 }'));
assert.ok(dtn.includes('"1500SF": ["124799", null, "131899", "133199", null, "143699"]'));
assert.ok(dtn.includes('"400IS": ["025299", null, "030449", "031019", null, "033199"]'));
assert.ok(dtn.includes('"1500SF": ["135399", null, "140899", "141999", null, "152500"]'));
assert.ok(dtn.includes('"400IS": ["030999", null, "032079", "032619", null, "034200"]'));
assert.ok(dtn.includes('functions.httpsCallable("getDtnListingOverview")'));
assert.ok(dtn.includes('functions.httpsCallable("refreshDtnListingCache")'));
assert.ok(dtn.includes("const LISTING_REFRESH_DELAYS_MS = [1500, 2500, 4000, 7000, 12000, 18000]"));
assert.ok(dtn.includes("await waitForListingRefresh(season, overview)"));
assert.ok(dtn.includes("Vérification automatique en cours"));
assert.ok(dtn.includes('data-dtn-listing-sex="all"'));
assert.ok(dtn.includes('data-dtn-listing-sex="F"'));
assert.ok(dtn.includes('data-dtn-listing-sex="M"'));
assert.ok(dtn.includes('class="admin-dtn-listing-tabs"'));
assert.ok(dtn.includes('data-dtn-listing-filter="performance"'));
assert.ok(dtn.includes('data-dtn-listing-filter="club"'));
assert.ok(dtn.includes('data-dtn-listing-filter="course"'));
assert.ok(dtn.includes('<label>Club<select data-dtn-listing-filter="club"><option value="all">Tous</option>'));
assert.ok(dtn.includes('<label>Épreuve<select data-dtn-listing-filter="course"><option value="all">Toutes</option>'));
assert.ok(dtn.includes('state.listingTab === "espoir"'));
assert.ok(dtn.includes("elements.toolbar.hidden = true"));
assert.ok(dtn.includes('class="admin-dtn-grid-actions"'));
assert.ok(dtn.includes("gridActions.append(elements.sexSegment, elements.refreshBox)"));
assert.ok(dtn.includes('<details class="admin-dtn-export">'));
assert.ok(dtn.includes('<summary>Exporter Excel</summary>'));
assert.equal(dtn.includes('class="admin-dtn-listing-count"'), false);
assert.ok(dtn.includes('elements.grid.querySelector(".admin-dtn-grid-head")?.append(elements.refreshBox)'));
assert.ok(dtn.includes("elements.grid.after(elements.definitions)"));
assert.equal(dtn.includes("Chaque sportif apparaît une seule fois, avec toutes ses performances qualificatives."), false);
assert.equal(dtn.includes("Épreuves individuelles · Saison"), false);
assert.equal(dtn.includes("Temps piscine · Saison"), false);
assert.ok(dtn.includes("LISTING_PREFERENCES_KEY"));
assert.ok(dtn.includes("persistListingPreferences()"));
assert.ok(dtn.includes("Tous · ${sexCounts.all}"));
assert.ok(dtn.includes("Relève · ${tabCounts.releve}"));
assert.ok(dtn.includes('addEventListener("toggle"'));
assert.equal(dtn.includes('data-dtn-listing-filter="sex"'), false);
assert.equal(dtn.includes("data-dtn-listing-reset"), false);
assert.ok(dtn.includes('data-sex="${escapeHtml(athlete.sex)}"'));
assert.ok(portalCss.includes('tr[data-sex="F"] > td'));
assert.ok(portalCss.includes('tr[data-sex="M"] > td'));
assert.ok(portalCss.includes("background: #fff7fb"));
assert.ok(portalCss.includes("background: #f5fbff"));
assert.ok(portalCss.includes("box-shadow: inset 3px 0 #b01762"));
assert.ok(portalCss.includes("box-shadow: inset 3px 0 #1769aa"));
assert.ok(portalCss.includes("#adminDtnView .admin-dtn-listing-table th:first-child"));
assert.ok(portalCss.includes("min-width: 860px !important"));
assert.ok(portalCss.includes("#adminDtnView .admin-dtn-listing-table td[data-label]::before"));
assert.ok(portalUx.includes(".admin-dtn-results-table:not(.admin-dtn-listing-table)"));
assert.ok(portalUx.includes('table.classList.remove("admin-portal-responsive-table")'));
assert.ok(portalUx.includes('status.matches("#adminDtnGrid")'));
assert.ok(portalUx.includes('status.querySelector(".admin-dtn-summary-loading,.admin-record-module-status")'));
assert.ok(portalCss.includes("#adminDtnView > .admin-dtn-workspace-head"));
assert.ok(dtn.includes("filteredListingRows(currentListingOverview || {})"));
assert.ok(functions.includes('exports.getDtnListingOverview = onCall'));
assert.ok(functions.includes('exports.refreshDtnListingCache = onCall'));
assert.ok(functions.includes('source: "public-storage-top-files"'));
assert.ok(functions.includes('readPublicPerformanceJson(`dtn-listing/${seasonYear}.json`, [])'));
assert.ok(functions.includes('source: "public-storage-dtn-season-file"'));
assert.ok(functions.includes('const releveAthleteKeys = new Set'));
assert.ok(functions.includes('!releveAthleteKeys.has(publicSwimmerKey(athlete))'));
assert.ok(dtn.includes("Priorité Relève sur Espoir"));
assert.ok(publicPerformanceGenerator.includes('path.join(outDir, "dtn-listing", `${seasonYear}.json`)'));
assert.ok(portalCss.includes("#adminDtnView .admin-dtn-listing-table th:nth-child(7)"));
assert.ok(portalCss.includes("table-layout: fixed"));
assert.ok(portalCss.includes("width: 41%"));
assert.ok(functions.includes('portalReadStats("getDtnListingOverview", startedAt, { baseDocuments: 2'));
assert.equal(functions.slice(functions.indexOf("async function buildDtnListingPayload"), functions.indexOf("async function enqueueDtnQualificationJob")).includes(".collection("), false);
assert.ok(portal.includes("function resetCreateCompetitionDialog"));
assert.ok(portal.includes('elements.engagementsEndDate.dataset.autoFromStart = "true"'));
assert.equal(portal.includes('updateEngagementQualificationFields("create")'), false);
[
  "adminEngagementsName",
  "adminEngagementsCompetitionType",
  "adminEngagementsDate",
  "adminEngagementsEndDate",
  "adminEngagementsLocation",
  "adminEngagementsLevel",
  "adminEngagementsRegionId"
].forEach((id) => assert.ok(portalHtml.includes(`id="${id}"`)));
assert.equal(portalHtml.includes('id="adminEngagementsRegionNote"'), false);
[
  "adminEngagementsDeadline",
  "adminEngagementsEntryStatus",
  "adminEngagementsPoolLength",
  "adminEngagementsTimingType",
  "adminEngagementsInvitedRegionIds",
  "adminEngagementsCreateFeesEnabled"
].forEach((id) => assert.equal(portalHtml.includes(`id="${id}"`), false));
assert.equal(portalHtml.includes("Ajouter des informations complémentaires"), false);
assert.equal(portalHtml.includes("Renseignez uniquement les informations nécessaires à l’ajout au calendrier."), false);
assert.ok(portalHtml.includes('<h2 id="adminEngagementsCreateDialogTitle">Ajout d’un événement au calendrier</h2>'));
assert.ok(portalHtml.includes('aria-labelledby="adminEngagementsCreateDialogTitle"'));
const quickCreateActions = portalHtml.slice(
  portalHtml.indexOf('<div class="admin-portal-actions">', portalHtml.indexOf('id="adminEngagementsCreateForm"')),
  portalHtml.indexOf('</div>', portalHtml.indexOf('<div class="admin-portal-actions">', portalHtml.indexOf('id="adminEngagementsCreateForm"')))
);
assert.ok(quickCreateActions.includes('id="adminEngagementsCreateDialogClose"'));
assert.ok(quickCreateActions.includes('type="submit">Ajouter au calendrier</button>'));
assert.ok(portalCss.includes(".admin-engagements-create-form > .admin-portal-actions"));
assert.ok(portalCss.includes("justify-content: flex-end"));
assert.ok(portalCss.includes(".admin-engagements-create-form > #adminEngagementsCreateMessage:empty"));
assert.ok(portalHtml.includes('id="adminEngagementsCreateCompleteNow"'));
assert.ok(portalHtml.includes("Compléter maintenant"));
assert.ok(portalHtml.includes("Plus tard"));
assert.ok(portal.includes('entryStatus: "upcoming"'));
assert.ok(portal.includes("function completeNewlyCreatedEngagementCompetition"));
assert.ok(portalHtml.includes('id="adminEngagementsTypeFilter"'));
assert.ok(portalHtml.includes('id="adminEngagementsEditCompetitionType" type="text" readonly'));
assert.ok(portalHtml.includes('id="adminEngagementsEditWaterBodyType"'));
assert.ok(portalHtml.includes('id="adminEngagementsOpenWaterCourseCreator"'));
assert.ok(portalHtml.includes('id="adminEngagementsOpenWaterDiscipline"'));
assert.ok(portal.includes('class="admin-engagements-open-water-course-add"'));
assert.ok(portal.includes('shortLabel: "SP"'));
assert.ok(portalCss.includes(".admin-engagements-open-water-label-short"));
assert.equal(portal.includes("Ajoutée au programme"), false);
assert.ok(portalHtml.includes('id="adminEngagementsUnsavedDialog"'));
assert.equal(portalHtml.includes('Classement automatique de la plus courte à la plus longue.'), false);
assert.ok(portal.includes('function engagementOpenWaterEventDefinitions'));
assert.ok(portal.includes('engagementCompetitionType(selectedEngagementCompetition) === "openWater"'));
assert.ok(portal.includes('saveEngagementCompetitionDetail(null, { continueEditing: true })'));
assert.ok(portal.includes('discardEngagementDetailTabChanges(activeEngagementsDetailTab)'));
assert.ok(portalCss.includes('[data-competition-type="openWater"]'));
assert.ok(functions.includes('const ENGAGEMENT_COMPETITION_TYPES = new Set(["pool", "openWater"])'));
assert.ok(functions.includes('const FUNCTIONS_EMULATOR_ACTIVE = process.env.FUNCTIONS_EMULATOR === "true"'));
assert.ok(functions.includes('exports.listEngagementOpenWaterCourses'));
assert.ok(functions.includes('exports.addEngagementOpenWaterCourse'));
assert.ok(functions.includes('exports.setEngagementOpenWaterCourseStatus'));
assert.ok(functions.includes('Le 150 m elimination est disponible uniquement en Surface et Bi-palmes.'));
assert.ok(functions.includes('Droit regional ou national requis pour modifier la bibliotheque eau libre.'));
assert.ok(functions.includes('Le type de competition ne peut pas etre modifie apres sa creation.'));
assert.ok(functions.includes('open_water_export_pending'));
assert.equal(portal.includes("await loadEngagementCompetitionDetail(result.competition.id)"), false);
assert.ok(portalHtml.includes('id="adminPublicAccessRequestNewClub"'));
assert.ok(portalHtml.includes('id="adminPublicAccessRequestNewClubFederalNumber"'));
assert.ok(portalHtml.includes('id="adminEngagementsAccessRequestRejectReason"'));
assert.ok(portal.includes('fillLivePalmesRegionSelect(elements.publicAccessRequestRegionId, "À choisir")'));
assert.ok(portal.includes("async function matchPublicAccessRequestClubByFederalNumber"));
assert.ok(portal.includes("await loadAccessClubReference()"));
assert.ok(portal.includes("await matchPublicAccessRequestClubByFederalNumber()"));
assert.ok(portal.includes("Le référentiel des clubs est temporairement indisponible"));
assert.ok(portal.includes("openEngagementAccessRequestRejectDialog"));
assert.ok(functions.includes("async function findEngagementClubByFederalNumber"));
assert.ok(functions.includes("async function createClubFromEngagementAccessRequest"));
assert.ok(functions.includes('throw new HttpsError("permission-denied", "La creation d\'un club est reservee au niveau national.")'));
assert.ok(functions.includes('throw new HttpsError("invalid-argument", "Le motif du refus est obligatoire.")'));
assert.ok(functions.includes("sendEngagementAccessRejection"));

assert.ok(portal.includes("global.LivePalmesLoadImportSpreadsheet = loadImportSpreadsheet"));
assert.ok(imports.includes("function ensureSpreadsheetReader()"));
assert.ok(imports.includes("if (importsLoadPromise) return importsLoadPromise"));
assert.equal(portal.includes("loadImportModule({ includeSpreadsheet: importActive })"), false);
assert.equal(portal.includes("performances/public/data/records-data.js?v=records-firestore-20260629060432"), false);
assert.ok(records.includes("function localRecordsDataUrl"));
assert.ok(portal.includes("globalThis.LivePalmesPortalMetrics = portalCallMetrics"));
assert.ok(portal.includes("p50Ms: percentile(0.5)"));
assert.ok(portal.includes("p95Ms: percentile(0.95)"));
assert.ok(portal.includes('pageSize: 100'));
assert.ok(portal.includes("data-engagement-mail-jobs-more"));
assert.ok(functions.includes("exports.listEngagementCompetitionMailJobs"));
assert.ok(functions.includes("jobsQuery.limit(pageSize + 1)"));
assert.ok(functions.includes("ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION"));
assert.ok(functions.includes("decodeEngagementCompetitionStatisticsCache"));
assert.ok(functions.includes('status: payloadGzip ? "ready" : "too_large"'));
assert.ok(functions.includes("exports.rebuildAccessDirectoryIndexNextPage"));
assert.ok(functions.includes('where("accessDirectoryKeys", "array-contains"'));
assert.ok(functions.includes("searchAccessUserDocuments(search, context, maxScanned = 90)"));
assert.ok(functions.includes("request.data?.directoryMode === true"));
assert.ok(portal.includes("result.replaceDirectory === true"));
assert.ok(indexes.indexes.some((index) => index.collectionGroup === "users" && index.fields.some((field) => field.fieldPath === "accessDirectoryKeys")));
assert.ok(indexes.indexes.some((index) => index.collectionGroup === "engagementMailJobs" && index.fields.some((field) => field.fieldPath === "updatedAt" && field.order === "DESCENDING")));
assert.ok(portalHtml.includes('id="adminEngagementsSharedDocumentsList"'));
assert.ok(portalHtml.includes('data-engagements-club-documents-tab'));
assert.ok(portalHtml.includes('data-engagements-admin-documents-tab'));
assert.ok(portalHtml.includes('accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.jpg,.jpeg,.png,.zip"'));
assert.ok(portal.includes("previewEngagementCompetitionDocumentNotification"));
assert.ok(portal.includes("notifyEngagementCompetitionDocuments"));
assert.ok(portal.includes("ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024"));
assert.ok(functions.includes("exports.uploadEngagementCompetitionDocument"));
assert.ok(functions.includes("exports.deleteEngagementCompetitionDocument"));
assert.ok(functions.includes("includeDocumentUploader: true"));
assert.ok(functions.includes('OPTIONAL_COMPETITION_MAIL_TYPES'));
assert.ok(functions.includes('"club_recap_pdf"'));
assert.ok(functions.includes("exports.disableCompetitionEmailNotifications"));
assert.ok(functions.includes("exports.updateCurrentEmailNotificationPreferences"));
assert.ok(functions.includes("competitionNotificationPreferenceUrl"));
assert.ok(functions.includes("cancelled_notifications_disabled"));
assert.ok(functions.includes("batch.set(userRef, preferencePatch, { merge: true })"));
assert.ok(functions.includes("recipients: { [recipientKey]: value }"));
assert.ok(functions.includes("gérer ou désactiver les notifications email LivePalmes en cliquant sur"));
assert.ok(functions.includes('href="https://livepalmes.web.app/portail.html#mon-compte"'));
assert.equal(functions.includes("Les messages indispensables concernant votre compte et sa sécurité resteront envoyés.</p>"), false);
assert.ok(portalHtml.includes('id="adminAccountCompetitionNotifications"'));
assert.ok(portalHtml.includes('role="switch" aria-checked="true"'));
assert.equal(portalHtml.includes("Enregistrer mes préférences"), false);
assert.ok(portal.includes("updateCurrentEmailNotificationPreferences"));
assert.ok(portal.includes("Désactiver les notifications de compétition ?"));
assert.ok(portal.includes('addEventListener("click", toggleAccountNotificationPreferences)'));
assert.ok(portalCss.includes(".admin-engagements-shared-document-card"));
assert.equal(portalCss.includes('[data-engagements-mode="club"] #adminEngagementsDetail [data-engagement-step-button="documents"]'), false);
assert.ok(portal.includes('if (tab === "documents" && !isEngagementAdminMode()) return "information"'));
assert.ok(portal.includes('if (group === "information") return [...tabs, "documents"]'));

console.log("Optimisations portail : OK");
