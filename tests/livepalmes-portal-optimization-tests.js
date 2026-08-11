const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const portal = read("assets/livepalmes-admin-portal.js");
const portalAuth = read("assets/livepalmes-admin-auth.js");
const dtn = read("assets/livepalmes-dtn-qualifications.js");
const portalCss = read("assets/livepalmes-admin-portal.css");
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
const clubReferenceSource = read("performances/public/data/club-reference.js");
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
    ${engagementRoutePolicyFunctions}
    result = {
      club: canAccessEngagementRoute("club"),
      clubSwimmers: canAccessEngagementRoute("clubSwimmers"),
      adminCalendar: canAccessEngagementRoute("adminCalendar"),
      adminAccessRequests: canAccessEngagementRoute("adminAccessRequests"),
      adminDeletionRequests: canAccessEngagementRoute("adminDeletionRequests"),
      unknown: canAccessEngagementRoute("unknown"),
      fallback: preferredEngagementRouteHash()
    };
  `, sandbox);
  return JSON.parse(JSON.stringify(sandbox.result));
}
const filteredEngagementCompetitionsStart = portal.indexOf("function filteredEngagementCompetitions");
const filteredEngagementCompetitionsEnd = portal.indexOf("function renderCurrentUser", filteredEngagementCompetitionsStart);
const filteredEngagementCompetitionsFunction = portal.slice(filteredEngagementCompetitionsStart, filteredEngagementCompetitionsEnd);
const filteredEngagementCompetitionsSandbox = {};
vm.runInNewContext(`
  const engagementCompetitions = [
    { id: "closed-old", entryStatus: "closed", date: "2026-01-10", name: "Fermée ancienne" },
    { id: "upcoming", entryStatus: "upcoming", date: "2026-03-10", name: "À venir" },
    { id: "open-late", entryStatus: "open", date: "2026-04-10", entryDeadlineAt: "2026-04-01T20:00:00Z", name: "Ouverte tardive" },
    { id: "closed-recent", entryStatus: "closed", date: "2026-02-10", name: "Fermée récente" },
    { id: "open-urgent", entryStatus: "open", date: "2026-05-10", entryDeadlineAt: "2026-03-20T20:00:00Z", name: "Ouverte urgente" }
  ];
  const engagementCalendarFiltersPayload = () => ({ startDate: "2025-09-01", endDate: "2026-08-31", regionId: "", level: "", entryStatus: "", mineOnly: false });
  const canonicalLivePalmesRegion = (value) => value || "";
  const canEditEngagementCompetition = () => true;
  ${filteredEngagementCompetitionsFunction}
  result = filteredEngagementCompetitions().map((competition) => competition.id);
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
const competitionDetailLoadStart = portal.indexOf("async function loadEngagementCompetitionDetail");
const competitionDetailLoadEnd = portal.indexOf("async function saveEngagementClubTeamLeader", competitionDetailLoadStart);
const competitionDetailLoad = portal.slice(competitionDetailLoadStart, competitionDetailLoadEnd);
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
const openingMailEnd = functions.indexOf("function engagementClubRecapMailSubject", openingMailStart);
const openingMailFunctions = functions.slice(openingMailStart, openingMailEnd);
const openingMailSandbox = {};
vm.runInNewContext(`
  const engagementPdfMoney = (value) => value + " €";
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
    })
  };
`, openingMailSandbox);

assert.ok(Array.isArray(sandbox.window.LIVEPALMES_CLUB_REFERENCE?.clubs));
assert.equal(openingMailSandbox.result.subject, "Ouverture des engagements - Meeting test");
assert.match(openingMailSandbox.result.text, /^Bonjour,/);
assert.match(openingMailSandbox.result.text, /https:\/\/livepalmes\.web\.app\/portail\.html#club-competitions/);
assert.match(openingMailSandbox.result.text, /Vos modifications sont enregistrées progressivement/);
assert.doesNotMatch(openingMailSandbox.result.text, /frais|HelloAsso/i);
assert.match(openingMailSandbox.result.text, /Sportivement,\nFFESSM - CNNP$/);
assert.deepEqual(evaluateEngagementRoutePolicy(["engagements.club.manage"]), {
  club: true,
  clubSwimmers: true,
  adminCalendar: false,
  adminAccessRequests: false,
  adminDeletionRequests: false,
  unknown: false,
  fallback: "#club-competitions"
});
assert.deepEqual(evaluateEngagementRoutePolicy(["engagements.region.manage"]), {
  club: false,
  clubSwimmers: false,
  adminCalendar: true,
  adminAccessRequests: true,
  adminDeletionRequests: false,
  unknown: false,
  fallback: "#competitions-calendrier"
});
assert.deepEqual(evaluateEngagementRoutePolicy(["engagements.national.manage"]), {
  club: false,
  clubSwimmers: false,
  adminCalendar: true,
  adminAccessRequests: true,
  adminDeletionRequests: true,
  unknown: false,
  fallback: "#competitions-calendrier"
});
assert.deepEqual(evaluateEngagementRoutePolicy(["engagements.club.manage", "engagements.region.manage"]), {
  club: true,
  clubSwimmers: true,
  adminCalendar: true,
  adminAccessRequests: true,
  adminDeletionRequests: false,
  unknown: false,
  fallback: "#club-competitions"
});
assert.deepEqual(evaluateEngagementRoutePolicy([]), {
  club: false,
  clubSwimmers: false,
  adminCalendar: false,
  adminAccessRequests: false,
  adminDeletionRequests: false,
  unknown: false,
  fallback: "#accueil"
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
assert.ok(functions.includes("DTN_QUALIFICATION_MAX_ROWS_PER_COURSE + 1"));
assert.equal(functions.includes('licenseUpdatedBy: "engagement-roster-migration"'), false);
assert.ok(functions.includes("revokeRefreshTokens(uid)"));
assert.ok(functions.includes("nextPortalAccessRateLimit"));
assert.ok(functions.includes('alertType === "inverted-identity"'));
assert.ok(functions.includes('blocksCreation: blockingAlerts.length > 0'));
assert.ok(functions.includes('throw new HttpsError("already-exists", "Un nageur existe deja avec le nom et le prenom inverses."'));
assert.ok(portal.includes('alerts.find((alert) => alert.type === "inverted-identity")'));
assert.ok(portal.includes("Le nom et le prenom sont inverses pour la meme date de naissance."));
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
assert.ok(portalHtml.includes('class="admin-engagements-club-swimmers-directory-search-label">Rechercher</span>'));
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
assert.ok(portal.includes("if (event.target.checked) void ensureEngagementClubSwimmerEventTimes(swimmer)"));
assert.ok(portal.includes("if (!swimmerFormRows.length)"));
assert.ok(portal.includes("entriesBySwimmer.get(swimmer.swimmerIndexId) || cloneEngagementClubEntry(swimmer.individualEntries || [])"));
assert.ok(portal.includes("async function openEngagementClubTimesDialog"));
assert.ok(portal.includes("await ensureEngagementClubSwimmerEventTimes(swimmer)"));
assert.ok(functions.includes("exports.previewEngagementClubSwimmerEventTimes"));
assert.ok(functions.includes("exports.previewEngagementClubSwimmerEventTimesBatch"));
assert.ok(functions.includes("exports.getEngagementClubEntryTimeHistory"));
assert.ok(functions.includes("ENGAGEMENT_ENTRY_TIME_CACHE_VERSION = 2"));
const engagementQualificationSource = functions.slice(functions.indexOf("function engagementQualificationRowAllowed"), functions.indexOf("function bestEngagementKnownTime"));
assert.equal(engagementQualificationSource.includes("isIntermediate"), false);
assert.ok(functions.includes("function engagementKnownTimeHistory"));
assert.ok(functions.includes('.slice(0, Math.max(1, Math.min(10, Number(limit || 10))))'));
assert.ok(functions.includes("exports.saveEngagementClubIndividualEntries"));
assert.ok(functions.includes("exports.saveEngagementClubSwimmerSelection"));
assert.ok(functions.includes("exports.saveEngagementClubSwimmerSelections"));
assert.ok(portal.includes('callFunction("saveEngagementClubSwimmerSelections"'));
assert.ok(portal.includes("function mergeEngagementClubEntryWithLocalSwimmerSelections"));
assert.ok(portal.includes("function queueEngagementClubEntryMutation"));
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
assert.ok(portal.includes("swimmers\n      })"));
assert.ok(portal.includes("discardPendingEngagementClubIndividualEntries(swimmerIndexId)"));
assert.ok(portal.includes("const selectedRows = currentEngagementClubSwimmersForSummary();"));
assert.ok(closeCompetitionDetailFunction.indexOf("flushEngagementClubIndividualEntriesAutosave()") < closeCompetitionDetailFunction.indexOf('selectedEngagementCompetitionId = ""'));
assert.ok(portal.includes('pendingEntryMutations.then(() => callFunction("getEngagementClubEntry"'));
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
assert.ok(portalHtml.indexOf('id="adminEngagementsClubSwimmersSearch"') < portalHtml.indexOf('id="adminEngagementsClubSwimmersList"'));
assert.ok(portalHtml.indexOf('id="adminEngagementsClubSwimmersList"') < portalHtml.indexOf('class="admin-engagements-club-new-swimmer"'));
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
assert.ok(portal.includes('renderSwimmerTable(availableSwimmers, "Résultats de recherche")'));
assert.ok(portal.includes("query && engagementClubSwimmerSearchText(swimmer).includes(query)"));
assert.equal(portal.includes("Recherchez un nageur par son nom"), false);
assert.ok(portalCss.includes("#adminEngagementsDetailSwimmersPanel .admin-engagements-club-new-swimmer summary"));
assert.ok(portalCss.includes("font-weight: 500"));
assert.equal(portal.includes("data-engagement-club-swimmers-show-more"), false);
assert.ok(portal.includes("renderEngagementClubSelectedSwimmersPreview(selectedMount, selectedById)"));
assert.ok(portal.includes("function renderActiveEngagementClubSwimmerConsumer"));
assert.ok(portal.includes('if (activeEngagementsTab === "clubSwimmers")'));
assert.equal(competitionDetailLoad.includes("clubPeoplePromise"), false);
assert.ok(portal.includes('(nextTab === "team" || nextTab === "officials") && canUse("engagements.club.manage") && !engagementClubPeopleLoaded'));
assert.ok(portal.includes('pendingEntryMutations.then(() => callFunction("getEngagementClubEntry", { competitionId: cleanId }))'));
assert.ok(competitionDetailLoad.includes("const cachedWorkspace = clubMode ? engagementClubWorkspaceCache.get(cleanId) : null"));
assert.ok(competitionDetailLoad.includes("selectedEngagementClubEntry = cloneEngagementClubEntry(cachedWorkspace.entry)"));
assert.ok(competitionDetailLoad.includes("if (selectedEngagementCompetitionId !== cleanId) return"));
assert.equal((competitionDetailLoad.match(/callFunction\("getEngagementClubEntry"/g) || []).length, 1);
assert.equal(competitionDetailLoad.includes("loadEngagementClubEntry("), false);
assert.ok(clubEntryRead.includes("const [competition, entry] = await db.getAll(competitionRef, entryRef)"));
assert.ok(clubEntryRead.includes("competition: engagementCompetitionDetailItem(competition)"));
assert.equal(clubEntryRead.includes("peopleRosterReady:"), false);
assert.equal(clubEntryRead.includes("peopleRosterRef"), false);
assert.equal(clubEntryRead.includes("const competition = await"), false);
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
assert.ok(portalHtml.includes('id="adminEngagementsMaxEvents"'));
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
assert.ok(portalCss.includes(".admin-engagements-club-swimmer-license-cell {\n  display: grid"));
assert.ok(portal.includes("Nageurs engagés"));
assert.ok(portal.includes("data-engagement-club-swimmer-details-toggle"));
assert.ok(portal.includes("setEngagementClubSwimmerRowExpanded"));
assert.ok(portal.includes("engagementSwimmerCategory({"));
assert.ok(portalCss.includes('[data-expanded="true"] .admin-engagements-club-swimmer-details'));
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
assert.ok(portal.includes("].sort(compareEngagementSwimmersBySexAndName)"));
assert.ok(portal.includes(".sort(compareEngagementSwimmersBySexAndName)\n      .slice(0, 50)"));
assert.ok(portalCss.includes('.admin-engagements-club-swimmer-row[data-selected="true"][data-sex="F"]'));
assert.ok(portalCss.includes('.admin-engagements-club-swimmer-row[data-selected="true"][data-sex="M"]'));
assert.ok(portalHtml.includes('id="adminEngagementsPoolLaneCount" type="number" min="4" max="10"'));
assert.ok(portalHtml.includes('id="adminEngagementsEditPoolLaneCount" type="number" min="4" max="10"'));
assert.ok(portal.includes('poolLaneCount: fields.poolLaneCount?.value === ""'));
assert.ok(portal.includes('dialog.insertAdjacentElement("afterend", modal)'));
assert.ok(functions.includes("function cleanEngagementPoolLaneCount"));
assert.ok(functions.includes('value === 0 || value === "0"'));
assert.ok(functions.includes("Renseignez le bassin, le nombre de lignes d'eau et le chronometrage avant d'ouvrir les engagements."));
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
assert.ok(portalHtml.includes('id="adminEngagementsNationalSwimmersSearch"'));
assert.ok(portal.includes("data-engagement-club-swimmer-change"));
assert.ok(portal.includes('data-engagement-national-swimmer-action="edit"'));
assert.ok(portal.includes('"requestEngagementClubSwimmerChange"'));
assert.ok(portal.includes('callFunction("listEngagementSwimmerChangeRequests"'));
assert.ok(portal.includes('callFunction("resolveEngagementSwimmerChangeRequest"'));
assert.ok(portal.includes('callFunction(direct ? "updateEngagementNationalSwimmerIdentity"'));
assert.ok(functions.includes('const ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION = "engagementSwimmerChangeRequests"'));
assert.ok(functions.includes("exports.requestEngagementClubSwimmerChange"));
assert.ok(functions.includes("exports.listEngagementSwimmerChangeRequests"));
assert.ok(functions.includes("exports.getEngagementNationalAdministrationOverview"));
assert.ok(functions.includes("exports.resolveEngagementSwimmerChangeRequest"));
assert.ok(functions.includes("exports.updateEngagementNationalSwimmerIdentity"));
assert.ok(functions.includes("function assertNoEngagementSwimmerIdentityConflict"));
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
assert.ok(portal.includes("ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS = 30 * 1000"));
assert.ok(portal.includes("if (cachedWorkspaceFresh) return"));
assert.ok(portal.includes('if (canUse("engagements.club.manage")) void loadEngagementCompetitions()'));
assert.ok(portal.includes('setEngagementClubEntryLoadingState("loading")'));
assert.ok(portal.includes("Chargement de vos engagements enregistrés..."));
assert.ok(portal.includes("admin-engagements-calendar-loading"));
assert.ok(portalCss.includes("#adminEngagementsDetail[data-club-entry-loading]"));
assert.ok(portal.includes("engagementCompetitionsLoadedRange"));
assert.ok(portalAuth.includes("accessRefreshPromise && accessRefreshUid === refreshUid"));
assert.ok(functions.includes('console.info("livepalmes.portal.reads"'));
assert.ok(functions.includes("exports.rebuildEngagementClubAggregates"));
assert.ok(functions.includes('.where("swimmerIdentityKey", "==", identityKey).limit(500).get()'));
assert.ok(functions.includes("exports.buildDtnQualificationView = onDocumentCreated"));
assert.ok(functions.includes("enqueueDtnQualificationJob"));
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
assert.ok(portalHtml.includes('id="adminEngagementsStepFooter"'));
assert.ok(portalHtml.includes('id="adminEngagementsSaveState"'));
assert.ok(portal.includes("function storedEngagementDetailTab"));
assert.ok(portal.includes("livepalmes.engagement.lastTab."));
assert.ok(portal.includes('label: "Continuer mes engagements"'));
assert.ok(portal.includes('label: "Commencer mes engagements"'));
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
assert.deepEqual(JSON.parse(JSON.stringify(filteredEngagementCompetitionsSandbox.result)), [
  "open-urgent", "open-late", "upcoming", "closed-recent", "closed-old"
]);
assert.ok(portalHtml.indexOf('data-engagement-status=""') < portalHtml.indexOf('data-engagement-status="open"'));
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
assert.equal((portalHtml.match(/20260811-admin-pilotage-6/g) || []).length, 2);
assert.ok(portal.includes('activeEngagementsTab === "calendar"'));
assert.ok(portalCss.includes('#adminEngagementsView:not([data-engagements-tab="calendar"]) #adminEngagementsCalendarActions'));
assert.ok(portal.includes("manageOnly: isEngagementAdminMode()"));
assert.ok(portal.includes('label: "Administrer"'));
assert.equal(portal.includes('label: canEditEngagementCompetition(competition) ? "Administrer" : "Voir la fiche"'), false);
assert.ok(functions.includes("const manageOnly = request.data?.manageOnly === true;"));
assert.ok(functions.includes("const managementContext = manageOnly ? await engagementAccessContext(request) : null;"));
assert.ok(functions.includes('cleanText(competition.regionId) === managementContext.regionId'));
assert.ok(functions.includes("assertCanManageEngagementCompetition(context, doc.data() || {});"));
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
assert.ok(functions.includes('["Code club", engagementClubCode(entry.clubId, entry.clubCode) || "-"]'));
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

console.log("Optimisations portail : OK");
