// Compatibility factory; operation modules hold the existing bodies.
function createClubHandlers(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/portal-club-handlers/get-engagement-club-entry").createClubHandlers_getEngagementClubEntry({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementCompetitionDetailItem() { return backendContext.engagementCompetitionDetailItem; },
      set engagementCompetitionDetailItem(value) { backendContext.engagementCompetitionDetailItem = value; },
      get nativeClubEntryView() { return backendContext.nativeClubEntryView; },
      set nativeClubEntryView(value) { backendContext.nativeClubEntryView = value; },
      get nativePortalCompetition() { return backendContext.nativePortalCompetition; },
      set nativePortalCompetition(value) { backendContext.nativePortalCompetition = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/portal-club-handlers/generate-engagement-club-recap-pdf").createClubHandlers_generateEngagementClubRecapPdf({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get generateNativeClubRecapPdf() { return backendContext.generateNativeClubRecapPdf; },
      set generateNativeClubRecapPdf(value) { backendContext.generateNativeClubRecapPdf = value; },
      get getOrCreateEngagementClubRecapPdf() { return backendContext.getOrCreateEngagementClubRecapPdf; },
      set getOrCreateEngagementClubRecapPdf(value) { backendContext.getOrCreateEngagementClubRecapPdf = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/portal-club-handlers/list-engagement-competition-club-recaps").createClubHandlers_listEngagementCompetitionClubRecaps({
      get ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION() { return backendContext.ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION; },
      set ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION(value) { backendContext.ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementCompetitionDetailItem() { return backendContext.engagementCompetitionDetailItem; },
      set engagementCompetitionDetailItem(value) { backendContext.engagementCompetitionDetailItem = value; },
      get engagementCompetitionEntrySummariesFromData() { return backendContext.engagementCompetitionEntrySummariesFromData; },
      set engagementCompetitionEntrySummariesFromData(value) { backendContext.engagementCompetitionEntrySummariesFromData = value; },
      get engagementCompetitionEntrySummaryItem() { return backendContext.engagementCompetitionEntrySummaryItem; },
      set engagementCompetitionEntrySummaryItem(value) { backendContext.engagementCompetitionEntrySummaryItem = value; },
      get engagementCompetitionEntrySummaryRef() { return backendContext.engagementCompetitionEntrySummaryRef; },
      set engagementCompetitionEntrySummaryRef(value) { backendContext.engagementCompetitionEntrySummaryRef = value; },
      get engagementPdfFeeTotal() { return backendContext.engagementPdfFeeTotal; },
      set engagementPdfFeeTotal(value) { backendContext.engagementPdfFeeTotal = value; },
      get nativeAdminCompetitionEntries() { return backendContext.nativeAdminCompetitionEntries; },
      set nativeAdminCompetitionEntries(value) { backendContext.nativeAdminCompetitionEntries = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/portal-club-handlers/generate-engagement-club-recap-pdf-for-admin").createClubHandlers_generateEngagementClubRecapPdfForAdmin({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get buildEngagementClubRecapPdf() { return backendContext.buildEngagementClubRecapPdf; },
      set buildEngagementClubRecapPdf(value) { backendContext.buildEngagementClubRecapPdf = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get getOrCreateEngagementClubRecapPdf() { return backendContext.getOrCreateEngagementClubRecapPdf; },
      set getOrCreateEngagementClubRecapPdf(value) { backendContext.getOrCreateEngagementClubRecapPdf = value; },
      get nativeAdminCompetitionEntries() { return backendContext.nativeAdminCompetitionEntries; },
      set nativeAdminCompetitionEntries(value) { backendContext.nativeAdminCompetitionEntries = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/portal-club-handlers/generate-engagement-competition-club-recap-pdfs").createClubHandlers_generateEngagementCompetitionClubRecapPdfs({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertCanManageEngagementCompetition() { return backendContext.assertCanManageEngagementCompetition; },
      set assertCanManageEngagementCompetition(value) { backendContext.assertCanManageEngagementCompetition = value; },
      get buildEngagementClubRecapPdf() { return backendContext.buildEngagementClubRecapPdf; },
      set buildEngagementClubRecapPdf(value) { backendContext.buildEngagementClubRecapPdf = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get clubRecapZip() { return backendContext.clubRecapZip; },
      set clubRecapZip(value) { backendContext.clubRecapZip = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementCompetitionEntrySummaryItem() { return backendContext.engagementCompetitionEntrySummaryItem; },
      set engagementCompetitionEntrySummaryItem(value) { backendContext.engagementCompetitionEntrySummaryItem = value; },
      get getOrCreateEngagementClubRecapPdf() { return backendContext.getOrCreateEngagementClubRecapPdf; },
      set getOrCreateEngagementClubRecapPdf(value) { backendContext.getOrCreateEngagementClubRecapPdf = value; },
      get nativeAdminCompetitionEntries() { return backendContext.nativeAdminCompetitionEntries; },
      set nativeAdminCompetitionEntries(value) { backendContext.nativeAdminCompetitionEntries = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/portal-club-handlers/save-engagement-club-team-leader").createClubHandlers_saveEngagementClubTeamLeader({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertEngagementClubWriteOpen() { return backendContext.assertEngagementClubWriteOpen; },
      set assertEngagementClubWriteOpen(value) { backendContext.assertEngagementClubWriteOpen = value; },
      get cleanEngagementTeamLeader() { return backendContext.cleanEngagementTeamLeader; },
      set cleanEngagementTeamLeader(value) { backendContext.cleanEngagementTeamLeader = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementClubPersonItem() { return backendContext.engagementClubPersonItem; },
      set engagementClubPersonItem(value) { backendContext.engagementClubPersonItem = value; },
      get engagementPersonLicenseKey() { return backendContext.engagementPersonLicenseKey; },
      set engagementPersonLicenseKey(value) { backendContext.engagementPersonLicenseKey = value; },
      get engagementTeamLeaderComplete() { return backendContext.engagementTeamLeaderComplete; },
      set engagementTeamLeaderComplete(value) { backendContext.engagementTeamLeaderComplete = value; },
      get nativeClubEntryView() { return backendContext.nativeClubEntryView; },
      set nativeClubEntryView(value) { backendContext.nativeClubEntryView = value; },
      get nativePortalCompetition() { return backendContext.nativePortalCompetition; },
      set nativePortalCompetition(value) { backendContext.nativePortalCompetition = value; },
      get upsertEngagementClubPeopleRosterPerson() { return backendContext.upsertEngagementClubPeopleRosterPerson; },
      set upsertEngagementClubPeopleRosterPerson(value) { backendContext.upsertEngagementClubPeopleRosterPerson = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/portal-club-handlers/remove-engagement-club-team-leader").createClubHandlers_removeEngagementClubTeamLeader({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertEngagementClubWriteOpen() { return backendContext.assertEngagementClubWriteOpen; },
      set assertEngagementClubWriteOpen(value) { backendContext.assertEngagementClubWriteOpen = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deleteEngagementCompetitionEntrySummary() { return backendContext.deleteEngagementCompetitionEntrySummary; },
      set deleteEngagementCompetitionEntrySummary(value) { backendContext.deleteEngagementCompetitionEntrySummary = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryHasParticipants() { return backendContext.engagementClubEntryHasParticipants; },
      set engagementClubEntryHasParticipants(value) { backendContext.engagementClubEntryHasParticipants = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get nativeClubEntryView() { return backendContext.nativeClubEntryView; },
      set nativeClubEntryView(value) { backendContext.nativeClubEntryView = value; },
      get nativePortalCompetition() { return backendContext.nativePortalCompetition; },
      set nativePortalCompetition(value) { backendContext.nativePortalCompetition = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/portal-club-handlers/list-engagement-club-people").createClubHandlers_listEngagementClubPeople({
      get ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION() { return backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION; },
      set ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubPeopleRosterPeopleFromData() { return backendContext.engagementClubPeopleRosterPeopleFromData; },
      set engagementClubPeopleRosterPeopleFromData(value) { backendContext.engagementClubPeopleRosterPeopleFromData = value; },
      get engagementClubPeopleRosterRef() { return backendContext.engagementClubPeopleRosterRef; },
      set engagementClubPeopleRosterRef(value) { backendContext.engagementClubPeopleRosterRef = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; },
      get rebuildEngagementClubPeopleRoster() { return backendContext.rebuildEngagementClubPeopleRoster; },
      set rebuildEngagementClubPeopleRoster(value) { backendContext.rebuildEngagementClubPeopleRoster = value; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/portal-club-handlers/save-engagement-club-person").createClubHandlers_saveEngagementClubPerson({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementClubPerson() { return backendContext.cleanEngagementClubPerson; },
      set cleanEngagementClubPerson(value) { backendContext.cleanEngagementClubPerson = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubPeopleRosterPeopleFromData() { return backendContext.engagementClubPeopleRosterPeopleFromData; },
      set engagementClubPeopleRosterPeopleFromData(value) { backendContext.engagementClubPeopleRosterPeopleFromData = value; },
      get engagementClubPeopleRosterRef() { return backendContext.engagementClubPeopleRosterRef; },
      set engagementClubPeopleRosterRef(value) { backendContext.engagementClubPeopleRosterRef = value; },
      get engagementClubPersonIdentityConflict() { return backendContext.engagementClubPersonIdentityConflict; },
      set engagementClubPersonIdentityConflict(value) { backendContext.engagementClubPersonIdentityConflict = value; },
      get engagementClubPersonItem() { return backendContext.engagementClubPersonItem; },
      set engagementClubPersonItem(value) { backendContext.engagementClubPersonItem = value; },
      get engagementClubPersonOutsideClubConflict() { return backendContext.engagementClubPersonOutsideClubConflict; },
      set engagementClubPersonOutsideClubConflict(value) { backendContext.engagementClubPersonOutsideClubConflict = value; },
      get resolveEngagementClubPersonSwimmer() { return backendContext.resolveEngagementClubPersonSwimmer; },
      set resolveEngagementClubPersonSwimmer(value) { backendContext.resolveEngagementClubPersonSwimmer = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get throwEngagementClubPersonIdentityConflict() { return backendContext.throwEngagementClubPersonIdentityConflict; },
      set throwEngagementClubPersonIdentityConflict(value) { backendContext.throwEngagementClubPersonIdentityConflict = value; },
      get upsertEngagementClubPeopleRosterPerson() { return backendContext.upsertEngagementClubPeopleRosterPerson; },
      set upsertEngagementClubPeopleRosterPerson(value) { backendContext.upsertEngagementClubPeopleRosterPerson = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/portal-club-handlers/set-engagement-club-person-status").createClubHandlers_setEngagementClubPersonStatus({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubPersonItem() { return backendContext.engagementClubPersonItem; },
      set engagementClubPersonItem(value) { backendContext.engagementClubPersonItem = value; },
      get upsertEngagementClubPeopleRosterPerson() { return backendContext.upsertEngagementClubPeopleRosterPerson; },
      set upsertEngagementClubPeopleRosterPerson(value) { backendContext.upsertEngagementClubPeopleRosterPerson = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/portal-club-handlers/save-engagement-club-officials").createClubHandlers_saveEngagementClubOfficials({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertEngagementClubWriteOpen() { return backendContext.assertEngagementClubWriteOpen; },
      set assertEngagementClubWriteOpen(value) { backendContext.assertEngagementClubWriteOpen = value; },
      get cleanEngagementEntrySwimmer() { return backendContext.cleanEngagementEntrySwimmer; },
      set cleanEngagementEntrySwimmer(value) { backendContext.cleanEngagementEntrySwimmer = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementClubPersonItem() { return backendContext.engagementClubPersonItem; },
      set engagementClubPersonItem(value) { backendContext.engagementClubPersonItem = value; },
      get engagementPersonLicenseKey() { return backendContext.engagementPersonLicenseKey; },
      set engagementPersonLicenseKey(value) { backendContext.engagementPersonLicenseKey = value; },
      get engagementTeamLeaderComplete() { return backendContext.engagementTeamLeaderComplete; },
      set engagementTeamLeaderComplete(value) { backendContext.engagementTeamLeaderComplete = value; },
      get saveNativeClubOfficials() { return backendContext.saveNativeClubOfficials; },
      set saveNativeClubOfficials(value) { backendContext.saveNativeClubOfficials = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/portal-club-handlers/list-engagement-club-swimmers").createClubHandlers_listEngagementClubSwimmers({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get currentEngagementCategoryFromBirthDate() { return backendContext.currentEngagementCategoryFromBirthDate; },
      set currentEngagementCategoryFromBirthDate(value) { backendContext.currentEngagementCategoryFromBirthDate = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubRosterRef() { return backendContext.engagementClubRosterRef; },
      set engagementClubRosterRef(value) { backendContext.engagementClubRosterRef = value; },
      get engagementClubRosterSwimmersFromData() { return backendContext.engagementClubRosterSwimmersFromData; },
      set engagementClubRosterSwimmersFromData(value) { backendContext.engagementClubRosterSwimmersFromData = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; },
      get sortEngagementClubSwimmers() { return backendContext.sortEngagementClubSwimmers; },
      set sortEngagementClubSwimmers(value) { backendContext.sortEngagementClubSwimmers = value; },
      get uniqueEngagementClubSwimmers() { return backendContext.uniqueEngagementClubSwimmers; },
      set uniqueEngagementClubSwimmers(value) { backendContext.uniqueEngagementClubSwimmers = value; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/portal-club-handlers/set-engagement-club-swimmer-activity-status").createClubHandlers_setEngagementClubSwimmerActivityStatus({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementClubActivityStatus() { return backendContext.cleanEngagementClubActivityStatus; },
      set cleanEngagementClubActivityStatus(value) { backendContext.cleanEngagementClubActivityStatus = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubRosterRef() { return backendContext.engagementClubRosterRef; },
      set engagementClubRosterRef(value) { backendContext.engagementClubRosterRef = value; },
      get engagementClubRosterSwimmerItem() { return backendContext.engagementClubRosterSwimmerItem; },
      set engagementClubRosterSwimmerItem(value) { backendContext.engagementClubRosterSwimmerItem = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/portal-club-handlers/preview-engagement-club-swimmer-creation").createClubHandlers_previewEngagementClubSwimmerCreation({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertNoEngagementSwimmerLicenseConflict() { return backendContext.assertNoEngagementSwimmerLicenseConflict; },
      set assertNoEngagementSwimmerLicenseConflict(value) { backendContext.assertNoEngagementSwimmerLicenseConflict = value; },
      get buildEngagementNewSwimmerAlerts() { return backendContext.buildEngagementNewSwimmerAlerts; },
      set buildEngagementNewSwimmerAlerts(value) { backendContext.buildEngagementNewSwimmerAlerts = value; },
      get cleanEngagementNewSwimmer() { return backendContext.cleanEngagementNewSwimmer; },
      set cleanEngagementNewSwimmer(value) { backendContext.cleanEngagementNewSwimmer = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementNewSwimmerAlertFromMatch() { return backendContext.engagementNewSwimmerAlertFromMatch; },
      set engagementNewSwimmerAlertFromMatch(value) { backendContext.engagementNewSwimmerAlertFromMatch = value; },
      get importSwimmerCreation() { return backendContext.importSwimmerCreation; },
      set importSwimmerCreation(value) { backendContext.importSwimmerCreation = value; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/portal-club-handlers/preview-engagement-club-swimmer-recovery").createClubHandlers_previewEngagementClubSwimmerRecovery({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementSwimmerRecoveryPreview() { return backendContext.engagementSwimmerRecoveryPreview; },
      set engagementSwimmerRecoveryPreview(value) { backendContext.engagementSwimmerRecoveryPreview = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/portal-club-handlers/recover-engagement-club-swimmer").createClubHandlers_recoverEngagementClubSwimmer({
      get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
      set ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementNewSwimmer() { return backendContext.cleanEngagementNewSwimmer; },
      set cleanEngagementNewSwimmer(value) { backendContext.cleanEngagementNewSwimmer = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deleteEngagementClubRosterSwimmer() { return backendContext.deleteEngagementClubRosterSwimmer; },
      set deleteEngagementClubRosterSwimmer(value) { backendContext.deleteEngagementClubRosterSwimmer = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementNewSwimmerItem() { return backendContext.engagementNewSwimmerItem; },
      set engagementNewSwimmerItem(value) { backendContext.engagementNewSwimmerItem = value; },
      get engagementSwimmerLicenseId() { return backendContext.engagementSwimmerLicenseId; },
      set engagementSwimmerLicenseId(value) { backendContext.engagementSwimmerLicenseId = value; },
      get engagementSwimmerLicenseNumberId() { return backendContext.engagementSwimmerLicenseNumberId; },
      set engagementSwimmerLicenseNumberId(value) { backendContext.engagementSwimmerLicenseNumberId = value; },
      get engagementSwimmerLicenseNumberKey() { return backendContext.engagementSwimmerLicenseNumberKey; },
      set engagementSwimmerLicenseNumberKey(value) { backendContext.engagementSwimmerLicenseNumberKey = value; },
      get engagementSwimmerLicensePayload() { return backendContext.engagementSwimmerLicensePayload; },
      set engagementSwimmerLicensePayload(value) { backendContext.engagementSwimmerLicensePayload = value; },
      get engagementSwimmerRecoveryPreview() { return backendContext.engagementSwimmerRecoveryPreview; },
      set engagementSwimmerRecoveryPreview(value) { backendContext.engagementSwimmerRecoveryPreview = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get upsertEngagementClubRosterSwimmer() { return backendContext.upsertEngagementClubRosterSwimmer; },
      set upsertEngagementClubRosterSwimmer(value) { backendContext.upsertEngagementClubRosterSwimmer = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/portal-club-handlers/create-engagement-club-swimmer").createClubHandlers_createEngagementClubSwimmer({
      get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
      set ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertNoEngagementSwimmerLicenseConflict() { return backendContext.assertNoEngagementSwimmerLicenseConflict; },
      set assertNoEngagementSwimmerLicenseConflict(value) { backendContext.assertNoEngagementSwimmerLicenseConflict = value; },
      get buildEngagementNewSwimmerAlerts() { return backendContext.buildEngagementNewSwimmerAlerts; },
      set buildEngagementNewSwimmerAlerts(value) { backendContext.buildEngagementNewSwimmerAlerts = value; },
      get cleanEngagementNewSwimmer() { return backendContext.cleanEngagementNewSwimmer; },
      set cleanEngagementNewSwimmer(value) { backendContext.cleanEngagementNewSwimmer = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get currentEngagementSeasonInfo() { return backendContext.currentEngagementSeasonInfo; },
      set currentEngagementSeasonInfo(value) { backendContext.currentEngagementSeasonInfo = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementNewSwimmerAlertFromMatch() { return backendContext.engagementNewSwimmerAlertFromMatch; },
      set engagementNewSwimmerAlertFromMatch(value) { backendContext.engagementNewSwimmerAlertFromMatch = value; },
      get engagementNewSwimmerItem() { return backendContext.engagementNewSwimmerItem; },
      set engagementNewSwimmerItem(value) { backendContext.engagementNewSwimmerItem = value; },
      get engagementSwimmerLicenseId() { return backendContext.engagementSwimmerLicenseId; },
      set engagementSwimmerLicenseId(value) { backendContext.engagementSwimmerLicenseId = value; },
      get engagementSwimmerLicenseNumberId() { return backendContext.engagementSwimmerLicenseNumberId; },
      set engagementSwimmerLicenseNumberId(value) { backendContext.engagementSwimmerLicenseNumberId = value; },
      get engagementSwimmerLicenseNumberKey() { return backendContext.engagementSwimmerLicenseNumberKey; },
      set engagementSwimmerLicenseNumberKey(value) { backendContext.engagementSwimmerLicenseNumberKey = value; },
      get engagementSwimmerLicensePayload() { return backendContext.engagementSwimmerLicensePayload; },
      set engagementSwimmerLicensePayload(value) { backendContext.engagementSwimmerLicensePayload = value; },
      get importSwimmerCreation() { return backendContext.importSwimmerCreation; },
      set importSwimmerCreation(value) { backendContext.importSwimmerCreation = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get upsertEngagementClubRosterSwimmer() { return backendContext.upsertEngagementClubRosterSwimmer; },
      set upsertEngagementClubRosterSwimmer(value) { backendContext.upsertEngagementClubRosterSwimmer = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/portal-club-handlers/validate-engagement-swimmer-licenses").createClubHandlers_validateEngagementSwimmerLicenses({
      get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
      set ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION = value; },
      get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
      set ENGAGEMENT_SWIMMER_LICENSE_PATTERN(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubRosterRef() { return backendContext.engagementClubRosterRef; },
      set engagementClubRosterRef(value) { backendContext.engagementClubRosterRef = value; },
      get engagementClubRosterSwimmerItem() { return backendContext.engagementClubRosterSwimmerItem; },
      set engagementClubRosterSwimmerItem(value) { backendContext.engagementClubRosterSwimmerItem = value; },
      get engagementClubRosterSwimmerKey() { return backendContext.engagementClubRosterSwimmerKey; },
      set engagementClubRosterSwimmerKey(value) { backendContext.engagementClubRosterSwimmerKey = value; },
      get engagementLicenseControlSeason() { return backendContext.engagementLicenseControlSeason; },
      set engagementLicenseControlSeason(value) { backendContext.engagementLicenseControlSeason = value; },
      get engagementSwimmerLicenseId() { return backendContext.engagementSwimmerLicenseId; },
      set engagementSwimmerLicenseId(value) { backendContext.engagementSwimmerLicenseId = value; },
      get engagementSwimmerLicenseNumberId() { return backendContext.engagementSwimmerLicenseNumberId; },
      set engagementSwimmerLicenseNumberId(value) { backendContext.engagementSwimmerLicenseNumberId = value; },
      get engagementSwimmerLicenseNumberKey() { return backendContext.engagementSwimmerLicenseNumberKey; },
      set engagementSwimmerLicenseNumberKey(value) { backendContext.engagementSwimmerLicenseNumberKey = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache17;
  }

  let cache18;
  function operation18() {
    if (!cache18) cache18 = require("./backend/portal-club-handlers/get-public-engagement-club-directory").createClubHandlers_getPublicEngagementClubDirectory({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; },
      get publicEngagementClubDirectoryRef() { return backendContext.publicEngagementClubDirectoryRef; },
      set publicEngagementClubDirectoryRef(value) { backendContext.publicEngagementClubDirectoryRef = value; },
      get publicEngagementClubItem() { return backendContext.publicEngagementClubItem; },
      set publicEngagementClubItem(value) { backendContext.publicEngagementClubItem = value; }
    });
    return cache18;
  }

  let cache19;
  function operation19() {
    if (!cache19) cache19 = require("./backend/portal-club-handlers/get-engagement-club-entry-time-history").createClubHandlers_getEngagementClubEntryTimeHistory({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementEntrySwimmer() { return backendContext.cleanEngagementEntrySwimmer; },
      set cleanEngagementEntrySwimmer(value) { backendContext.cleanEngagementEntrySwimmer = value; },
      get cleanEngagementMissingEntryTimeMode() { return backendContext.cleanEngagementMissingEntryTimeMode; },
      set cleanEngagementMissingEntryTimeMode(value) { backendContext.cleanEngagementMissingEntryTimeMode = value; },
      get cleanEngagementQualificationTimesMode() { return backendContext.cleanEngagementQualificationTimesMode; },
      set cleanEngagementQualificationTimesMode(value) { backendContext.cleanEngagementQualificationTimesMode = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementKnownTimeHistory() { return backendContext.engagementKnownTimeHistory; },
      set engagementKnownTimeHistory(value) { backendContext.engagementKnownTimeHistory = value; },
      get engagementTeamLeaderComplete() { return backendContext.engagementTeamLeaderComplete; },
      set engagementTeamLeaderComplete(value) { backendContext.engagementTeamLeaderComplete = value; },
      get getEngagementEntryTimeRowsForSwimmer() { return backendContext.getEngagementEntryTimeRowsForSwimmer; },
      set getEngagementEntryTimeRowsForSwimmer(value) { backendContext.getEngagementEntryTimeRowsForSwimmer = value; },
      get nativeClubEntryTimeHistory() { return backendContext.nativeClubEntryTimeHistory; },
      set nativeClubEntryTimeHistory(value) { backendContext.nativeClubEntryTimeHistory = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; }
    });
    return cache19;
  }

  let cache20;
  function operation20() {
    if (!cache20) cache20 = require("./backend/portal-club-handlers/preview-engagement-club-swimmer-event-times").createClubHandlers_previewEngagementClubSwimmerEventTimes({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get cleanEngagementCompetitionEvents() { return backendContext.cleanEngagementCompetitionEvents; },
      set cleanEngagementCompetitionEvents(value) { backendContext.cleanEngagementCompetitionEvents = value; },
      get cleanEngagementCompetitionType() { return backendContext.cleanEngagementCompetitionType; },
      set cleanEngagementCompetitionType(value) { backendContext.cleanEngagementCompetitionType = value; },
      get cleanEngagementMissingEntryTimeMode() { return backendContext.cleanEngagementMissingEntryTimeMode; },
      set cleanEngagementMissingEntryTimeMode(value) { backendContext.cleanEngagementMissingEntryTimeMode = value; },
      get cleanEngagementPoolLength() { return backendContext.cleanEngagementPoolLength; },
      set cleanEngagementPoolLength(value) { backendContext.cleanEngagementPoolLength = value; },
      get cleanEngagementQualificationTimesMode() { return backendContext.cleanEngagementQualificationTimesMode; },
      set cleanEngagementQualificationTimesMode(value) { backendContext.cleanEngagementQualificationTimesMode = value; },
      get cleanEngagementTimingType() { return backendContext.cleanEngagementTimingType; },
      set cleanEngagementTimingType(value) { backendContext.cleanEngagementTimingType = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubSwimmerItem() { return backendContext.engagementClubSwimmerItem; },
      set engagementClubSwimmerItem(value) { backendContext.engagementClubSwimmerItem = value; },
      get engagementNewSwimmerItem() { return backendContext.engagementNewSwimmerItem; },
      set engagementNewSwimmerItem(value) { backendContext.engagementNewSwimmerItem = value; },
      get engagementReferenceSwimmerItem() { return backendContext.engagementReferenceSwimmerItem; },
      set engagementReferenceSwimmerItem(value) { backendContext.engagementReferenceSwimmerItem = value; },
      get engagementTeamLeaderComplete() { return backendContext.engagementTeamLeaderComplete; },
      set engagementTeamLeaderComplete(value) { backendContext.engagementTeamLeaderComplete = value; },
      get intranapSwimmersIndex() { return backendContext.intranapSwimmersIndex; },
      set intranapSwimmersIndex(value) { backendContext.intranapSwimmersIndex = value; },
      get previewNativeClubEntryTimes() { return backendContext.previewNativeClubEntryTimes; },
      set previewNativeClubEntryTimes(value) { backendContext.previewNativeClubEntryTimes = value; },
      get resolveEngagementIndividualEntriesForSwimmer() { return backendContext.resolveEngagementIndividualEntriesForSwimmer; },
      set resolveEngagementIndividualEntriesForSwimmer(value) { backendContext.resolveEngagementIndividualEntriesForSwimmer = value; }
    });
    return cache20;
  }

  let cache21;
  function operation21() {
    if (!cache21) cache21 = require("./backend/portal-club-handlers/preview-engagement-club-swimmer-event-times-batch").createClubHandlers_previewEngagementClubSwimmerEventTimesBatch({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanEngagementCompetitionEvents() { return backendContext.cleanEngagementCompetitionEvents; },
      set cleanEngagementCompetitionEvents(value) { backendContext.cleanEngagementCompetitionEvents = value; },
      get cleanEngagementCompetitionType() { return backendContext.cleanEngagementCompetitionType; },
      set cleanEngagementCompetitionType(value) { backendContext.cleanEngagementCompetitionType = value; },
      get cleanEngagementEntrySwimmer() { return backendContext.cleanEngagementEntrySwimmer; },
      set cleanEngagementEntrySwimmer(value) { backendContext.cleanEngagementEntrySwimmer = value; },
      get cleanEngagementMissingEntryTimeMode() { return backendContext.cleanEngagementMissingEntryTimeMode; },
      set cleanEngagementMissingEntryTimeMode(value) { backendContext.cleanEngagementMissingEntryTimeMode = value; },
      get cleanEngagementPoolLength() { return backendContext.cleanEngagementPoolLength; },
      set cleanEngagementPoolLength(value) { backendContext.cleanEngagementPoolLength = value; },
      get cleanEngagementQualificationTimesMode() { return backendContext.cleanEngagementQualificationTimesMode; },
      set cleanEngagementQualificationTimesMode(value) { backendContext.cleanEngagementQualificationTimesMode = value; },
      get cleanEngagementTimingType() { return backendContext.cleanEngagementTimingType; },
      set cleanEngagementTimingType(value) { backendContext.cleanEngagementTimingType = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementTeamLeaderComplete() { return backendContext.engagementTeamLeaderComplete; },
      set engagementTeamLeaderComplete(value) { backendContext.engagementTeamLeaderComplete = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; },
      get previewNativeClubEntryTimes() { return backendContext.previewNativeClubEntryTimes; },
      set previewNativeClubEntryTimes(value) { backendContext.previewNativeClubEntryTimes = value; },
      get resolveEngagementIndividualEntriesForSwimmer() { return backendContext.resolveEngagementIndividualEntriesForSwimmer; },
      set resolveEngagementIndividualEntriesForSwimmer(value) { backendContext.resolveEngagementIndividualEntriesForSwimmer = value; }
    });
    return cache21;
  }

  let cache22;
  function operation22() {
    if (!cache22) cache22 = require("./backend/portal-club-handlers/save-engagement-club-individual-entries").createClubHandlers_saveEngagementClubIndividualEntries({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertEngagementClubWriteOpen() { return backendContext.assertEngagementClubWriteOpen; },
      set assertEngagementClubWriteOpen(value) { backendContext.assertEngagementClubWriteOpen = value; },
      get cleanEngagementCompetitionEvents() { return backendContext.cleanEngagementCompetitionEvents; },
      set cleanEngagementCompetitionEvents(value) { backendContext.cleanEngagementCompetitionEvents = value; },
      get cleanEngagementCompetitionType() { return backendContext.cleanEngagementCompetitionType; },
      set cleanEngagementCompetitionType(value) { backendContext.cleanEngagementCompetitionType = value; },
      get cleanEngagementEntryIndividualEntries() { return backendContext.cleanEngagementEntryIndividualEntries; },
      set cleanEngagementEntryIndividualEntries(value) { backendContext.cleanEngagementEntryIndividualEntries = value; },
      get cleanEngagementEntrySwimmer() { return backendContext.cleanEngagementEntrySwimmer; },
      set cleanEngagementEntrySwimmer(value) { backendContext.cleanEngagementEntrySwimmer = value; },
      get cleanEngagementMaxEventsPerSwimmer() { return backendContext.cleanEngagementMaxEventsPerSwimmer; },
      set cleanEngagementMaxEventsPerSwimmer(value) { backendContext.cleanEngagementMaxEventsPerSwimmer = value; },
      get cleanEngagementMissingEntryTimeMode() { return backendContext.cleanEngagementMissingEntryTimeMode; },
      set cleanEngagementMissingEntryTimeMode(value) { backendContext.cleanEngagementMissingEntryTimeMode = value; },
      get cleanEngagementPoolLength() { return backendContext.cleanEngagementPoolLength; },
      set cleanEngagementPoolLength(value) { backendContext.cleanEngagementPoolLength = value; },
      get cleanEngagementQualificationTimesMode() { return backendContext.cleanEngagementQualificationTimesMode; },
      set cleanEngagementQualificationTimesMode(value) { backendContext.cleanEngagementQualificationTimesMode = value; },
      get cleanEngagementTimingType() { return backendContext.cleanEngagementTimingType; },
      set cleanEngagementTimingType(value) { backendContext.cleanEngagementTimingType = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementTeamLeaderComplete() { return backendContext.engagementTeamLeaderComplete; },
      set engagementTeamLeaderComplete(value) { backendContext.engagementTeamLeaderComplete = value; },
      get loadPerformanceRecordsData() { return backendContext.loadPerformanceRecordsData; },
      set loadPerformanceRecordsData(value) { backendContext.loadPerformanceRecordsData = value; },
      get qualificationRelaysAfterIndividualChange() { return backendContext.qualificationRelaysAfterIndividualChange; },
      set qualificationRelaysAfterIndividualChange(value) { backendContext.qualificationRelaysAfterIndividualChange = value; },
      get qualificationService() { return backendContext.qualificationService; },
      set qualificationService(value) { backendContext.qualificationService = value; },
      get resolveEngagementIndividualEntriesForSwimmer() { return backendContext.resolveEngagementIndividualEntriesForSwimmer; },
      set resolveEngagementIndividualEntriesForSwimmer(value) { backendContext.resolveEngagementIndividualEntriesForSwimmer = value; },
      get saveNativeClubIndividualEntries() { return backendContext.saveNativeClubIndividualEntries; },
      set saveNativeClubIndividualEntries(value) { backendContext.saveNativeClubIndividualEntries = value; },
      get validateEngagementIndividualEntryTimes() { return backendContext.validateEngagementIndividualEntryTimes; },
      set validateEngagementIndividualEntryTimes(value) { backendContext.validateEngagementIndividualEntryTimes = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache22;
  }

  let cache23;
  function operation23() {
    if (!cache23) cache23 = require("./backend/portal-club-handlers/save-engagement-club-swimmer-selection").createClubHandlers_saveEngagementClubSwimmerSelection({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get assertEngagementClubWriteOpen() { return backendContext.assertEngagementClubWriteOpen; },
      set assertEngagementClubWriteOpen(value) { backendContext.assertEngagementClubWriteOpen = value; },
      get assertEngagementSwimmerRoleCompatibility() { return backendContext.assertEngagementSwimmerRoleCompatibility; },
      set assertEngagementSwimmerRoleCompatibility(value) { backendContext.assertEngagementSwimmerRoleCompatibility = value; },
      get buildEngagementClubSwimmersFromRequest() { return backendContext.buildEngagementClubSwimmersFromRequest; },
      set buildEngagementClubSwimmersFromRequest(value) { backendContext.buildEngagementClubSwimmersFromRequest = value; },
      get cleanEngagementEntrySwimmer() { return backendContext.cleanEngagementEntrySwimmer; },
      set cleanEngagementEntrySwimmer(value) { backendContext.cleanEngagementEntrySwimmer = value; },
      get cleanEngagementLicenseSeasonStatus() { return backendContext.cleanEngagementLicenseSeasonStatus; },
      set cleanEngagementLicenseSeasonStatus(value) { backendContext.cleanEngagementLicenseSeasonStatus = value; },
      get cleanEngagementLicenseVerificationStatus() { return backendContext.cleanEngagementLicenseVerificationStatus; },
      set cleanEngagementLicenseVerificationStatus(value) { backendContext.cleanEngagementLicenseVerificationStatus = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementSwimmerLicenseId() { return backendContext.engagementSwimmerLicenseId; },
      set engagementSwimmerLicenseId(value) { backendContext.engagementSwimmerLicenseId = value; },
      get engagementSwimmerLicensePayload() { return backendContext.engagementSwimmerLicensePayload; },
      set engagementSwimmerLicensePayload(value) { backendContext.engagementSwimmerLicensePayload = value; },
      get engagementTeamLeaderComplete() { return backendContext.engagementTeamLeaderComplete; },
      set engagementTeamLeaderComplete(value) { backendContext.engagementTeamLeaderComplete = value; },
      get qualificationRelaysAfterIndividualChange() { return backendContext.qualificationRelaysAfterIndividualChange; },
      set qualificationRelaysAfterIndividualChange(value) { backendContext.qualificationRelaysAfterIndividualChange = value; },
      get qualificationService() { return backendContext.qualificationService; },
      set qualificationService(value) { backendContext.qualificationService = value; },
      get saveNativeClubSwimmerSelections() { return backendContext.saveNativeClubSwimmerSelections; },
      set saveNativeClubSwimmerSelections(value) { backendContext.saveNativeClubSwimmerSelections = value; },
      get upsertEngagementClubRosterSwimmer() { return backendContext.upsertEngagementClubRosterSwimmer; },
      set upsertEngagementClubRosterSwimmer(value) { backendContext.upsertEngagementClubRosterSwimmer = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache23;
  }

  let cache24;
  function operation24() {
    if (!cache24) cache24 = require("./backend/portal-club-handlers/save-engagement-club-swimmer-selections").createClubHandlers_saveEngagementClubSwimmerSelections({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get assertEngagementClubWriteOpen() { return backendContext.assertEngagementClubWriteOpen; },
      set assertEngagementClubWriteOpen(value) { backendContext.assertEngagementClubWriteOpen = value; },
      get assertEngagementSwimmerRoleCompatibility() { return backendContext.assertEngagementSwimmerRoleCompatibility; },
      set assertEngagementSwimmerRoleCompatibility(value) { backendContext.assertEngagementSwimmerRoleCompatibility = value; },
      get buildEngagementClubSwimmersFromRequest() { return backendContext.buildEngagementClubSwimmersFromRequest; },
      set buildEngagementClubSwimmersFromRequest(value) { backendContext.buildEngagementClubSwimmersFromRequest = value; },
      get cleanEngagementEntrySwimmer() { return backendContext.cleanEngagementEntrySwimmer; },
      set cleanEngagementEntrySwimmer(value) { backendContext.cleanEngagementEntrySwimmer = value; },
      get cleanEngagementLicenseSeasonStatus() { return backendContext.cleanEngagementLicenseSeasonStatus; },
      set cleanEngagementLicenseSeasonStatus(value) { backendContext.cleanEngagementLicenseSeasonStatus = value; },
      get cleanEngagementLicenseVerificationStatus() { return backendContext.cleanEngagementLicenseVerificationStatus; },
      set cleanEngagementLicenseVerificationStatus(value) { backendContext.cleanEngagementLicenseVerificationStatus = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementSwimmerLicenseId() { return backendContext.engagementSwimmerLicenseId; },
      set engagementSwimmerLicenseId(value) { backendContext.engagementSwimmerLicenseId = value; },
      get engagementSwimmerLicensePayload() { return backendContext.engagementSwimmerLicensePayload; },
      set engagementSwimmerLicensePayload(value) { backendContext.engagementSwimmerLicensePayload = value; },
      get engagementTeamLeaderComplete() { return backendContext.engagementTeamLeaderComplete; },
      set engagementTeamLeaderComplete(value) { backendContext.engagementTeamLeaderComplete = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; },
      get qualificationRelaysAfterIndividualChange() { return backendContext.qualificationRelaysAfterIndividualChange; },
      set qualificationRelaysAfterIndividualChange(value) { backendContext.qualificationRelaysAfterIndividualChange = value; },
      get qualificationService() { return backendContext.qualificationService; },
      set qualificationService(value) { backendContext.qualificationService = value; },
      get saveNativeClubSwimmerSelections() { return backendContext.saveNativeClubSwimmerSelections; },
      set saveNativeClubSwimmerSelections(value) { backendContext.saveNativeClubSwimmerSelections = value; },
      get upsertEngagementClubRosterSwimmer() { return backendContext.upsertEngagementClubRosterSwimmer; },
      set upsertEngagementClubRosterSwimmer(value) { backendContext.upsertEngagementClubRosterSwimmer = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache24;
  }

  let cache25;
  function operation25() {
    if (!cache25) cache25 = require("./backend/portal-club-handlers/save-engagement-club-relays").createClubHandlers_saveEngagementClubRelays({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get assertEngagementClubWriteOpen() { return backendContext.assertEngagementClubWriteOpen; },
      set assertEngagementClubWriteOpen(value) { backendContext.assertEngagementClubWriteOpen = value; },
      get cleanEngagementCompetitionEvents() { return backendContext.cleanEngagementCompetitionEvents; },
      set cleanEngagementCompetitionEvents(value) { backendContext.cleanEngagementCompetitionEvents = value; },
      get cleanEngagementCompetitionType() { return backendContext.cleanEngagementCompetitionType; },
      set cleanEngagementCompetitionType(value) { backendContext.cleanEngagementCompetitionType = value; },
      get cleanEngagementEntryRelays() { return backendContext.cleanEngagementEntryRelays; },
      set cleanEngagementEntryRelays(value) { backendContext.cleanEngagementEntryRelays = value; },
      get cleanEngagementEntrySwimmer() { return backendContext.cleanEngagementEntrySwimmer; },
      set cleanEngagementEntrySwimmer(value) { backendContext.cleanEngagementEntrySwimmer = value; },
      get cleanEngagementPoolLength() { return backendContext.cleanEngagementPoolLength; },
      set cleanEngagementPoolLength(value) { backendContext.cleanEngagementPoolLength = value; },
      get cleanEngagementTimingType() { return backendContext.cleanEngagementTimingType; },
      set cleanEngagementTimingType(value) { backendContext.cleanEngagementTimingType = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubEntryId() { return backendContext.engagementClubEntryId; },
      set engagementClubEntryId(value) { backendContext.engagementClubEntryId = value; },
      get engagementClubEntryItem() { return backendContext.engagementClubEntryItem; },
      set engagementClubEntryItem(value) { backendContext.engagementClubEntryItem = value; },
      get engagementTeamLeaderComplete() { return backendContext.engagementTeamLeaderComplete; },
      set engagementTeamLeaderComplete(value) { backendContext.engagementTeamLeaderComplete = value; },
      get loadPerformanceRecordsData() { return backendContext.loadPerformanceRecordsData; },
      set loadPerformanceRecordsData(value) { backendContext.loadPerformanceRecordsData = value; },
      get qualificationEngine() { return backendContext.qualificationEngine; },
      set qualificationEngine(value) { backendContext.qualificationEngine = value; },
      get qualificationService() { return backendContext.qualificationService; },
      set qualificationService(value) { backendContext.qualificationService = value; },
      get saveNativeClubRelays() { return backendContext.saveNativeClubRelays; },
      set saveNativeClubRelays(value) { backendContext.saveNativeClubRelays = value; },
      get validateEngagementRelayEntryTimes() { return backendContext.validateEngagementRelayEntryTimes; },
      set validateEngagementRelayEntryTimes(value) { backendContext.validateEngagementRelayEntryTimes = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; }
    });
    return cache25;
  }
  return {
    getEngagementClubEntry: operation0().getEngagementClubEntry,
    generateEngagementClubRecapPdf: operation1().generateEngagementClubRecapPdf,
    listEngagementCompetitionClubRecaps: operation2().listEngagementCompetitionClubRecaps,
    generateEngagementClubRecapPdfForAdmin: operation3().generateEngagementClubRecapPdfForAdmin,
    generateEngagementCompetitionClubRecapPdfs: operation4().generateEngagementCompetitionClubRecapPdfs,
    saveEngagementClubTeamLeader: operation5().saveEngagementClubTeamLeader,
    removeEngagementClubTeamLeader: operation6().removeEngagementClubTeamLeader,
    listEngagementClubPeople: operation7().listEngagementClubPeople,
    saveEngagementClubPerson: operation8().saveEngagementClubPerson,
    setEngagementClubPersonStatus: operation9().setEngagementClubPersonStatus,
    saveEngagementClubOfficials: operation10().saveEngagementClubOfficials,
    listEngagementClubSwimmers: operation11().listEngagementClubSwimmers,
    setEngagementClubSwimmerActivityStatus: operation12().setEngagementClubSwimmerActivityStatus,
    previewEngagementClubSwimmerCreation: operation13().previewEngagementClubSwimmerCreation,
    previewEngagementClubSwimmerRecovery: operation14().previewEngagementClubSwimmerRecovery,
    recoverEngagementClubSwimmer: operation15().recoverEngagementClubSwimmer,
    createEngagementClubSwimmer: operation16().createEngagementClubSwimmer,
    validateEngagementSwimmerLicenses: operation17().validateEngagementSwimmerLicenses,
    getPublicEngagementClubDirectory: operation18().getPublicEngagementClubDirectory,
    getEngagementClubEntryTimeHistory: operation19().getEngagementClubEntryTimeHistory,
    previewEngagementClubSwimmerEventTimes: operation20().previewEngagementClubSwimmerEventTimes,
    previewEngagementClubSwimmerEventTimesBatch: operation21().previewEngagementClubSwimmerEventTimesBatch,
    saveEngagementClubIndividualEntries: operation22().saveEngagementClubIndividualEntries,
    saveEngagementClubSwimmerSelection: operation23().saveEngagementClubSwimmerSelection,
    saveEngagementClubSwimmerSelections: operation24().saveEngagementClubSwimmerSelections,
    saveEngagementClubRelays: operation25().saveEngagementClubRelays
  };
}

module.exports = { createClubHandlers };
