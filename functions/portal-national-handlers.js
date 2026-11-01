// Compatibility factory; operation modules hold the existing bodies.
function createNationalHandlers(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/portal-national-handlers/get-national-featured-documents").createNationalHandlers_getNationalFeaturedDocuments({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get manageNationalLibraryDocuments() { return backendContext.manageNationalLibraryDocuments; },
      set manageNationalLibraryDocuments(value) { backendContext.manageNationalLibraryDocuments = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/portal-national-handlers/save-national-featured-documents").createNationalHandlers_saveNationalFeaturedDocuments({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get manageNationalLibraryDocuments() { return backendContext.manageNationalLibraryDocuments; },
      set manageNationalLibraryDocuments(value) { backendContext.manageNationalLibraryDocuments = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/portal-national-handlers/search-engagement-national-swimmers").createNationalHandlers_searchEngagementNationalSwimmers({
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
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get searchEngagementNationalSwimmerDocs() { return backendContext.searchEngagementNationalSwimmerDocs; },
      set searchEngagementNationalSwimmerDocs(value) { backendContext.searchEngagementNationalSwimmerDocs = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/portal-national-handlers/request-engagement-club-swimmer-change").createNationalHandlers_requestEngagementClubSwimmerChange({
      get AUDIT_ACTOR_RESOLUTION_LIMIT() { return backendContext.AUDIT_ACTOR_RESOLUTION_LIMIT; },
      set AUDIT_ACTOR_RESOLUTION_LIMIT(value) { backendContext.AUDIT_ACTOR_RESOLUTION_LIMIT = value; },
      get AUDIT_COMPETITION_RESOLUTION_LIMIT() { return backendContext.AUDIT_COMPETITION_RESOLUTION_LIMIT; },
      set AUDIT_COMPETITION_RESOLUTION_LIMIT(value) { backendContext.AUDIT_COMPETITION_RESOLUTION_LIMIT = value; },
      get AUDIT_LEGACY_VISIBLE_SINCE() { return backendContext.AUDIT_LEGACY_VISIBLE_SINCE; },
      set AUDIT_LEGACY_VISIBLE_SINCE(value) { backendContext.AUDIT_LEGACY_VISIBLE_SINCE = value; },
      get AUDIT_PAGE_LIMIT() { return backendContext.AUDIT_PAGE_LIMIT; },
      set AUDIT_PAGE_LIMIT(value) { backendContext.AUDIT_PAGE_LIMIT = value; },
      get AUDIT_PERSON_RESOLUTION_LIMIT() { return backendContext.AUDIT_PERSON_RESOLUTION_LIMIT; },
      set AUDIT_PERSON_RESOLUTION_LIMIT(value) { backendContext.AUDIT_PERSON_RESOLUTION_LIMIT = value; },
      get CLUB_REFERENCE_BY_FEDERAL_NUMBER() { return backendContext.CLUB_REFERENCE_BY_FEDERAL_NUMBER; },
      set CLUB_REFERENCE_BY_FEDERAL_NUMBER(value) { backendContext.CLUB_REFERENCE_BY_FEDERAL_NUMBER = value; },
      get CLUB_REFERENCE_BY_ID() { return backendContext.CLUB_REFERENCE_BY_ID; },
      set CLUB_REFERENCE_BY_ID(value) { backendContext.CLUB_REFERENCE_BY_ID = value; },
      get ENGAGEMENT_CLUBS_COLLECTION() { return backendContext.ENGAGEMENT_CLUBS_COLLECTION; },
      set ENGAGEMENT_CLUBS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUBS_COLLECTION = value; },
      get ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION() { return backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION; },
      set ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION = value; },
      get ENGAGEMENT_CLUB_ROSTERS_COLLECTION() { return backendContext.ENGAGEMENT_CLUB_ROSTERS_COLLECTION; },
      set ENGAGEMENT_CLUB_ROSTERS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUB_ROSTERS_COLLECTION = value; },
      get ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT() { return backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT; },
      set ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT(value) { backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT = value; },
      get ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION() { return backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION; },
      set ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION(value) { backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_BASE_COLLECTION() { return backendContext.PERFORMANCE_BASE_COLLECTION; },
      set PERFORMANCE_BASE_COLLECTION(value) { backendContext.PERFORMANCE_BASE_COLLECTION = value; },
      get auditManagementContext() { return backendContext.auditManagementContext; },
      set auditManagementContext(value) { backendContext.auditManagementContext = value; },
      get auth() { return backendContext.auth; },
      set auth(value) { backendContext.auth = value; },
      get cleanClubPayload() { return backendContext.cleanClubPayload; },
      set cleanClubPayload(value) { backendContext.cleanClubPayload = value; },
      get cleanEngagementSwimmerIdentityCorrection() { return backendContext.cleanEngagementSwimmerIdentityCorrection; },
      set cleanEngagementSwimmerIdentityCorrection(value) { backendContext.cleanEngagementSwimmerIdentityCorrection = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get currentEngagementCategoryFromBirthDate() { return backendContext.currentEngagementCategoryFromBirthDate; },
      set currentEngagementCategoryFromBirthDate(value) { backendContext.currentEngagementCategoryFromBirthDate = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deleteEngagementClubPeopleRosterPerson() { return backendContext.deleteEngagementClubPeopleRosterPerson; },
      set deleteEngagementClubPeopleRosterPerson(value) { backendContext.deleteEngagementClubPeopleRosterPerson = value; },
      get deleteEngagementClubSwimmerPermanently() { return backendContext.deleteEngagementClubSwimmerPermanently; },
      set deleteEngagementClubSwimmerPermanently(value) { backendContext.deleteEngagementClubSwimmerPermanently = value; },
      get displayNameFromProfile() { return backendContext.displayNameFromProfile; },
      set displayNameFromProfile(value) { backendContext.displayNameFromProfile = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubAccessContext() { return backendContext.engagementClubAccessContext; },
      set engagementClubAccessContext(value) { backendContext.engagementClubAccessContext = value; },
      get engagementClubPersonEntrySnapshot() { return backendContext.engagementClubPersonEntrySnapshot; },
      set engagementClubPersonEntrySnapshot(value) { backendContext.engagementClubPersonEntrySnapshot = value; },
      get engagementClubPersonFullName() { return backendContext.engagementClubPersonFullName; },
      set engagementClubPersonFullName(value) { backendContext.engagementClubPersonFullName = value; },
      get engagementClubPersonItem() { return backendContext.engagementClubPersonItem; },
      set engagementClubPersonItem(value) { backendContext.engagementClubPersonItem = value; },
      get engagementClubSwimmerDeletionUsage() { return backendContext.engagementClubSwimmerDeletionUsage; },
      set engagementClubSwimmerDeletionUsage(value) { backendContext.engagementClubSwimmerDeletionUsage = value; },
      get engagementNationalSwimmerItemFromDoc() { return backendContext.engagementNationalSwimmerItemFromDoc; },
      set engagementNationalSwimmerItemFromDoc(value) { backendContext.engagementNationalSwimmerItemFromDoc = value; },
      get engagementNewSwimmerItem() { return backendContext.engagementNewSwimmerItem; },
      set engagementNewSwimmerItem(value) { backendContext.engagementNewSwimmerItem = value; },
      get engagementStoredClubItem() { return backendContext.engagementStoredClubItem; },
      set engagementStoredClubItem(value) { backendContext.engagementStoredClubItem = value; },
      get engagementSwimmerChangeRequestItem() { return backendContext.engagementSwimmerChangeRequestItem; },
      set engagementSwimmerChangeRequestItem(value) { backendContext.engagementSwimmerChangeRequestItem = value; },
      get engagementSwimmerIdentitySnapshot() { return backendContext.engagementSwimmerIdentitySnapshot; },
      set engagementSwimmerIdentitySnapshot(value) { backendContext.engagementSwimmerIdentitySnapshot = value; },
      get getEngagementNationalSwimmerForMerge() { return backendContext.getEngagementNationalSwimmerForMerge; },
      set getEngagementNationalSwimmerForMerge(value) { backendContext.getEngagementNationalSwimmerForMerge = value; },
      get getEngagementSwimmerCorrectionTarget() { return backendContext.getEngagementSwimmerCorrectionTarget; },
      set getEngagementSwimmerCorrectionTarget(value) { backendContext.getEngagementSwimmerCorrectionTarget = value; },
      get manageNationalLibraryDocuments() { return backendContext.manageNationalLibraryDocuments; },
      set manageNationalLibraryDocuments(value) { backendContext.manageNationalLibraryDocuments = value; },
      get mergeEngagementClubEntryOfficials() { return backendContext.mergeEngagementClubEntryOfficials; },
      set mergeEngagementClubEntryOfficials(value) { backendContext.mergeEngagementClubEntryOfficials = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; },
      get publicEngagementClubDirectoryRef() { return backendContext.publicEngagementClubDirectoryRef; },
      set publicEngagementClubDirectoryRef(value) { backendContext.publicEngagementClubDirectoryRef = value; },
      get publicEngagementClubItem() { return backendContext.publicEngagementClubItem; },
      set publicEngagementClubItem(value) { backendContext.publicEngagementClubItem = value; },
      get readEngagementClubAdminDirectory() { return backendContext.readEngagementClubAdminDirectory; },
      set readEngagementClubAdminDirectory(value) { backendContext.readEngagementClubAdminDirectory = value; },
      get searchEngagementNationalSwimmerDocs() { return backendContext.searchEngagementNationalSwimmerDocs; },
      set searchEngagementNationalSwimmerDocs(value) { backendContext.searchEngagementNationalSwimmerDocs = value; },
      get searchEngagementNationalSwimmerMergeTargetDocs() { return backendContext.searchEngagementNationalSwimmerMergeTargetDocs; },
      set searchEngagementNationalSwimmerMergeTargetDocs(value) { backendContext.searchEngagementNationalSwimmerMergeTargetDocs = value; },
      get setEngagementSwimmerChangeRequestRosterState() { return backendContext.setEngagementSwimmerChangeRequestRosterState; },
      set setEngagementSwimmerChangeRequestRosterState(value) { backendContext.setEngagementSwimmerChangeRequestRosterState = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get upsertEngagementClubPeopleRosterPerson() { return backendContext.upsertEngagementClubPeopleRosterPerson; },
      set upsertEngagementClubPeopleRosterPerson(value) { backendContext.upsertEngagementClubPeopleRosterPerson = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/portal-national-handlers/list-engagement-swimmer-change-requests").createNationalHandlers_listEngagementSwimmerChangeRequests({
      get ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION() { return backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION; },
      set ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION(value) { backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementSwimmerChangeRequestItem() { return backendContext.engagementSwimmerChangeRequestItem; },
      set engagementSwimmerChangeRequestItem(value) { backendContext.engagementSwimmerChangeRequestItem = value; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/portal-national-handlers/list-engagement-national-clubs").createNationalHandlers_listEngagementNationalClubs({
      get ENGAGEMENT_CLUBS_COLLECTION() { return backendContext.ENGAGEMENT_CLUBS_COLLECTION; },
      set ENGAGEMENT_CLUBS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUBS_COLLECTION = value; },
      get ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT() { return backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT; },
      set ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT(value) { backendContext.ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementStoredClubItem() { return backendContext.engagementStoredClubItem; },
      set engagementStoredClubItem(value) { backendContext.engagementStoredClubItem = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; },
      get publicEngagementClubDirectoryRef() { return backendContext.publicEngagementClubDirectoryRef; },
      set publicEngagementClubDirectoryRef(value) { backendContext.publicEngagementClubDirectoryRef = value; },
      get publicEngagementClubItem() { return backendContext.publicEngagementClubItem; },
      set publicEngagementClubItem(value) { backendContext.publicEngagementClubItem = value; },
      get readEngagementClubAdminDirectory() { return backendContext.readEngagementClubAdminDirectory; },
      set readEngagementClubAdminDirectory(value) { backendContext.readEngagementClubAdminDirectory = value; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/portal-national-handlers/save-engagement-national-club").createNationalHandlers_saveEngagementNationalClub({
      get CLUB_REFERENCE_BY_FEDERAL_NUMBER() { return backendContext.CLUB_REFERENCE_BY_FEDERAL_NUMBER; },
      set CLUB_REFERENCE_BY_FEDERAL_NUMBER(value) { backendContext.CLUB_REFERENCE_BY_FEDERAL_NUMBER = value; },
      get CLUB_REFERENCE_BY_ID() { return backendContext.CLUB_REFERENCE_BY_ID; },
      set CLUB_REFERENCE_BY_ID(value) { backendContext.CLUB_REFERENCE_BY_ID = value; },
      get ENGAGEMENT_CLUBS_COLLECTION() { return backendContext.ENGAGEMENT_CLUBS_COLLECTION; },
      set ENGAGEMENT_CLUBS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUBS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanClubPayload() { return backendContext.cleanClubPayload; },
      set cleanClubPayload(value) { backendContext.cleanClubPayload = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementStoredClubItem() { return backendContext.engagementStoredClubItem; },
      set engagementStoredClubItem(value) { backendContext.engagementStoredClubItem = value; },
      get publicEngagementClubDirectoryRef() { return backendContext.publicEngagementClubDirectoryRef; },
      set publicEngagementClubDirectoryRef(value) { backendContext.publicEngagementClubDirectoryRef = value; },
      get publicEngagementClubItem() { return backendContext.publicEngagementClubItem; },
      set publicEngagementClubItem(value) { backendContext.publicEngagementClubItem = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/portal-national-handlers/delete-engagement-national-club").createNationalHandlers_deleteEngagementNationalClub({
      get CLUB_REFERENCE_BY_ID() { return backendContext.CLUB_REFERENCE_BY_ID; },
      set CLUB_REFERENCE_BY_ID(value) { backendContext.CLUB_REFERENCE_BY_ID = value; },
      get ENGAGEMENT_CLUBS_COLLECTION() { return backendContext.ENGAGEMENT_CLUBS_COLLECTION; },
      set ENGAGEMENT_CLUBS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUBS_COLLECTION = value; },
      get ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION() { return backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION; },
      set ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION = value; },
      get ENGAGEMENT_CLUB_ROSTERS_COLLECTION() { return backendContext.ENGAGEMENT_CLUB_ROSTERS_COLLECTION; },
      set ENGAGEMENT_CLUB_ROSTERS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUB_ROSTERS_COLLECTION = value; },
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get PERFORMANCE_BASE_COLLECTION() { return backendContext.PERFORMANCE_BASE_COLLECTION; },
      set PERFORMANCE_BASE_COLLECTION(value) { backendContext.PERFORMANCE_BASE_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementStoredClubItem() { return backendContext.engagementStoredClubItem; },
      set engagementStoredClubItem(value) { backendContext.engagementStoredClubItem = value; },
      get portalReadStats() { return backendContext.portalReadStats; },
      set portalReadStats(value) { backendContext.portalReadStats = value; },
      get publicEngagementClubDirectoryRef() { return backendContext.publicEngagementClubDirectoryRef; },
      set publicEngagementClubDirectoryRef(value) { backendContext.publicEngagementClubDirectoryRef = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/portal-national-handlers/set-engagement-national-club-swimmer-status").createNationalHandlers_setEngagementNationalClubSwimmerStatus({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementNewSwimmerItem() { return backendContext.engagementNewSwimmerItem; },
      set engagementNewSwimmerItem(value) { backendContext.engagementNewSwimmerItem = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/portal-national-handlers/delete-engagement-national-club-swimmer").createNationalHandlers_deleteEngagementNationalClubSwimmer({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deleteEngagementClubSwimmerPermanently() { return backendContext.deleteEngagementClubSwimmerPermanently; },
      set deleteEngagementClubSwimmerPermanently(value) { backendContext.deleteEngagementClubSwimmerPermanently = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubSwimmerDeletionUsage() { return backendContext.engagementClubSwimmerDeletionUsage; },
      set engagementClubSwimmerDeletionUsage(value) { backendContext.engagementClubSwimmerDeletionUsage = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/portal-national-handlers/search-engagement-national-swimmer-merge-targets").createNationalHandlers_searchEngagementNationalSwimmerMergeTargets({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementNationalSwimmerItemFromDoc() { return backendContext.engagementNationalSwimmerItemFromDoc; },
      set engagementNationalSwimmerItemFromDoc(value) { backendContext.engagementNationalSwimmerItemFromDoc = value; },
      get getEngagementNationalSwimmerForMerge() { return backendContext.getEngagementNationalSwimmerForMerge; },
      set getEngagementNationalSwimmerForMerge(value) { backendContext.getEngagementNationalSwimmerForMerge = value; },
      get searchEngagementNationalSwimmerDocs() { return backendContext.searchEngagementNationalSwimmerDocs; },
      set searchEngagementNationalSwimmerDocs(value) { backendContext.searchEngagementNationalSwimmerDocs = value; },
      get searchEngagementNationalSwimmerMergeTargetDocs() { return backendContext.searchEngagementNationalSwimmerMergeTargetDocs; },
      set searchEngagementNationalSwimmerMergeTargetDocs(value) { backendContext.searchEngagementNationalSwimmerMergeTargetDocs = value; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/portal-national-handlers/list-engagement-national-club-people").createNationalHandlers_listEngagementNationalClubPeople({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubPersonItem() { return backendContext.engagementClubPersonItem; },
      set engagementClubPersonItem(value) { backendContext.engagementClubPersonItem = value; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/portal-national-handlers/set-engagement-national-club-person-status").createNationalHandlers_setEngagementNationalClubPersonStatus({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubPersonItem() { return backendContext.engagementClubPersonItem; },
      set engagementClubPersonItem(value) { backendContext.engagementClubPersonItem = value; },
      get upsertEngagementClubPeopleRosterPerson() { return backendContext.upsertEngagementClubPeopleRosterPerson; },
      set upsertEngagementClubPeopleRosterPerson(value) { backendContext.upsertEngagementClubPeopleRosterPerson = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/portal-national-handlers/delete-engagement-national-club-person").createNationalHandlers_deleteEngagementNationalClubPerson({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deleteEngagementClubPeopleRosterPerson() { return backendContext.deleteEngagementClubPeopleRosterPerson; },
      set deleteEngagementClubPeopleRosterPerson(value) { backendContext.deleteEngagementClubPeopleRosterPerson = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/portal-national-handlers/list-engagement-national-audit-logs").createNationalHandlers_listEngagementNationalAuditLogs({
      get AUDIT_ACTOR_RESOLUTION_LIMIT() { return backendContext.AUDIT_ACTOR_RESOLUTION_LIMIT; },
      set AUDIT_ACTOR_RESOLUTION_LIMIT(value) { backendContext.AUDIT_ACTOR_RESOLUTION_LIMIT = value; },
      get AUDIT_COMPETITION_RESOLUTION_LIMIT() { return backendContext.AUDIT_COMPETITION_RESOLUTION_LIMIT; },
      set AUDIT_COMPETITION_RESOLUTION_LIMIT(value) { backendContext.AUDIT_COMPETITION_RESOLUTION_LIMIT = value; },
      get AUDIT_LEGACY_VISIBLE_SINCE() { return backendContext.AUDIT_LEGACY_VISIBLE_SINCE; },
      set AUDIT_LEGACY_VISIBLE_SINCE(value) { backendContext.AUDIT_LEGACY_VISIBLE_SINCE = value; },
      get AUDIT_PAGE_LIMIT() { return backendContext.AUDIT_PAGE_LIMIT; },
      set AUDIT_PAGE_LIMIT(value) { backendContext.AUDIT_PAGE_LIMIT = value; },
      get AUDIT_PERSON_RESOLUTION_LIMIT() { return backendContext.AUDIT_PERSON_RESOLUTION_LIMIT; },
      set AUDIT_PERSON_RESOLUTION_LIMIT(value) { backendContext.AUDIT_PERSON_RESOLUTION_LIMIT = value; },
      get FieldPath() { return backendContext.FieldPath; },
      set FieldPath(value) { backendContext.FieldPath = value; },
      get auditManagementContext() { return backendContext.auditManagementContext; },
      set auditManagementContext(value) { backendContext.auditManagementContext = value; },
      get auth() { return backendContext.auth; },
      set auth(value) { backendContext.auth = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get displayNameFromProfile() { return backendContext.displayNameFromProfile; },
      set displayNameFromProfile(value) { backendContext.displayNameFromProfile = value; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/portal-national-handlers/merge-engagement-national-club-person").createNationalHandlers_mergeEngagementNationalClubPerson({
      get ENVIRONMENT() { return backendContext.ENVIRONMENT; },
      set ENVIRONMENT(value) { backendContext.ENVIRONMENT = value; },
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deleteEngagementClubPeopleRosterPerson() { return backendContext.deleteEngagementClubPeopleRosterPerson; },
      set deleteEngagementClubPeopleRosterPerson(value) { backendContext.deleteEngagementClubPeopleRosterPerson = value; },
      get engagementAccessContext() { return backendContext.engagementAccessContext; },
      set engagementAccessContext(value) { backendContext.engagementAccessContext = value; },
      get engagementClubPersonEntrySnapshot() { return backendContext.engagementClubPersonEntrySnapshot; },
      set engagementClubPersonEntrySnapshot(value) { backendContext.engagementClubPersonEntrySnapshot = value; },
      get engagementClubPersonFullName() { return backendContext.engagementClubPersonFullName; },
      set engagementClubPersonFullName(value) { backendContext.engagementClubPersonFullName = value; },
      get engagementClubPersonItem() { return backendContext.engagementClubPersonItem; },
      set engagementClubPersonItem(value) { backendContext.engagementClubPersonItem = value; },
      get mergeEngagementClubEntryOfficials() { return backendContext.mergeEngagementClubEntryOfficials; },
      set mergeEngagementClubEntryOfficials(value) { backendContext.mergeEngagementClubEntryOfficials = value; },
      get upsertEngagementClubPeopleRosterPerson() { return backendContext.upsertEngagementClubPeopleRosterPerson; },
      set upsertEngagementClubPeopleRosterPerson(value) { backendContext.upsertEngagementClubPeopleRosterPerson = value; },
      get writeAuditLog() { return backendContext.writeAuditLog; },
      set writeAuditLog(value) { backendContext.writeAuditLog = value; },
      get writeAuditLogOnce() { return backendContext.writeAuditLogOnce; },
      set writeAuditLogOnce(value) { backendContext.writeAuditLogOnce = value; }
    });
    return cache15;
  }
  return {
    getNationalFeaturedDocuments: operation0().getNationalFeaturedDocuments,
    saveNationalFeaturedDocuments: operation1().saveNationalFeaturedDocuments,
    searchEngagementNationalSwimmers: operation2().searchEngagementNationalSwimmers,
    requestEngagementClubSwimmerChange: operation3().requestEngagementClubSwimmerChange,
    listEngagementSwimmerChangeRequests: operation4().listEngagementSwimmerChangeRequests,
    listEngagementNationalClubs: operation5().listEngagementNationalClubs,
    saveEngagementNationalClub: operation6().saveEngagementNationalClub,
    deleteEngagementNationalClub: operation7().deleteEngagementNationalClub,
    setEngagementNationalClubSwimmerStatus: operation8().setEngagementNationalClubSwimmerStatus,
    deleteEngagementNationalClubSwimmer: operation9().deleteEngagementNationalClubSwimmer,
    searchEngagementNationalSwimmerMergeTargets: operation10().searchEngagementNationalSwimmerMergeTargets,
    listEngagementNationalClubPeople: operation11().listEngagementNationalClubPeople,
    setEngagementNationalClubPersonStatus: operation12().setEngagementNationalClubPersonStatus,
    deleteEngagementNationalClubPerson: operation13().deleteEngagementNationalClubPerson,
    listEngagementNationalAuditLogs: operation14().listEngagementNationalAuditLogs,
    mergeEngagementNationalClubPerson: operation15().mergeEngagementNationalClubPerson
  };
}

module.exports = { createNationalHandlers };
