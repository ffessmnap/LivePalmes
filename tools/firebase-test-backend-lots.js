"use strict";

const PROJECT_ID = "livepalmes-test";

const LOTS = Object.freeze({
  access: [
    "getCurrentAccessUser", "createOrUpdateAccessUser", "listAccessUsers", "setAccessUserStatus",
    "deleteAccessUser", "requestAccessUserDeletion", "listAccessUserDeletionRequests",
    "resolveAccessUserDeletionRequest", "updateCurrentAccountEmail", "setRolePins", "verifyPin",
    "rebuildAccessDirectoryIndexNextPage", "rebuildAccessDirectorySnapshotNextPage"
  ],
  "engagement-core": [
    "listEngagementAccessRequests",
    "syncEngagementClubEntryToCompetitionSummary", "syncEngagementMailRecipientIndex",
    "rebuildEngagementMailRecipientIndexNextPage", "syncEngagementClubPersonToRoster",
    "syncPerformanceSwimmerToEngagementClubRoster", "syncEngagementClubSwimmerToRoster",
    "listEngagementCompetitions", "listEngagementCalendarEvents", "getEngagementCalendarEvent",
    "createEngagementCalendarEvent", "updateEngagementCalendarEvent", "deleteEngagementCalendarEvent",
    "listEngagementOpenWaterCourses", "addEngagementOpenWaterCourse", "setEngagementOpenWaterCourseStatus",
    "getEngagementCompetition", "uploadEngagementCompetitionDocument", "updateEngagementCompetitionDocument",
    "deleteEngagementCompetitionDocument", "previewEngagementCompetitionDocumentNotification",
    "getEngagementClubEntry", "preloadEngagementClubWorkspaces", "generateEngagementClubRecapPdf",
    "listEngagementCompetitionClubRecaps", "getEngagementCompetitionStatistics",
    "generateEngagementClubRecapPdfForAdmin", "generateEngagementCompetitionClubRecapPdfs",
    "generateEngagementCompetitionTxtExport", "saveEngagementClubTeamLeader", "removeEngagementClubTeamLeader",
    "listEngagementClubPeople", "saveEngagementClubPerson", "setEngagementClubPersonStatus",
    "saveEngagementClubOfficials", "listEngagementClubSwimmers", "setEngagementClubSwimmerActivityStatus",
    "rebuildEngagementClubAggregates", "previewEngagementClubSwimmerCreation",
    "previewEngagementClubSwimmerRecovery", "recoverEngagementClubSwimmer", "createEngagementClubSwimmer",
    "listEngagementNationalClubSwimmers", "searchEngagementNationalSwimmers",
    "prepareEngagementLicenseControlBatch", "validateEngagementSwimmerLicenses",
    "requestEngagementClubSwimmerChange", "listEngagementSwimmerChangeRequests",
    "getEngagementNationalAdministrationOverview", "listEngagementNationalClubs",
    "getPublicEngagementClubDirectory", "saveEngagementNationalClub", "deleteEngagementNationalClub",
    "getPortalPendingRequestOverview",
    "setEngagementNationalClubSwimmerStatus", "requestEngagementClubSwimmerDeletion",
    "deleteEngagementNationalClubSwimmer", "listEngagementSwimmerDeletionRequests",
    "resolveEngagementSwimmerDeletionRequest", "searchEngagementNationalSwimmerMergeTargets",
    "listEngagementNationalClubPeople", "setEngagementNationalClubPersonStatus",
    "deleteEngagementNationalClubPerson", "listEngagementNationalAuditLogs",
    "mergeEngagementNationalClubPerson", "previewEngagementClubEntryTimes",
    "getEngagementClubEntryTimeHistory", "previewEngagementClubSwimmerEventTimes",
    "previewEngagementClubSwimmerEventTimesBatch", "saveEngagementClubIndividualEntries",
    "saveEngagementClubSwimmerSelection", "saveEngagementClubSwimmerSelections",
    "saveEngagementClubSwimmers", "saveEngagementClubRelays", "createEngagementCompetition",
    "updateEngagementCompetition", "deleteEngagementCompetition", "requestEngagementCompetitionDeletion",
    "listEngagementCompetitionDeletionRequests", "resolveEngagementCompetitionDeletionRequest"
  ],
  performance: [
    "previewCompetitionImport", "listCompetitionImports", "updateCompetitionImportRecordAlertDecision",
    "buildDtnQualificationView", "refreshDtnQualificationCache", "getDtnQualificationOverview",
    "refreshDtnListingCache", "getDtnListingOverview", "rebuildPerformanceSwimmerIndexNextPage",
    "rebuildPerformanceTopIndexNextPage", "importHistoricalPerformanceRows", "exportAdditionalPerformanceData",
    "getPerformanceBaseMigrationStatus", "migratePerformanceBaseNextChunk",
    "getPerformancePublicationJobStatus"
  ],
  publications: [
    "storeCompetitionPdf", "deleteCompetitionPdf", "syncOfficialResultToPublicIndex",
    "rebuildEngagementCompetitionCalendars",
    "syncEngagementCompetitionToCalendar", "syncEngagementCalendarEventToCalendar",
    "syncPublicRecordsData", "publishPerformancePublicData",
    "createCompetitionImport", "resumeCompetitionImportPublication", "deleteCompetitionImport",
    "publishPerformanceCorrectionJob", "retryPerformancePublicationJob", "savePerformanceCorrection",
    "updateEngagementNationalSwimmerIdentity", "mergeEngagementNationalClubSwimmer",
    "repairEngagementNationalSwimmerMergePublication"
  ],
  email: [
    "submitEngagementAccessRequest", "resolveEngagementAccessRequest",
    "updateCurrentEmailNotificationPreferences", "disableCompetitionEmailNotifications",
    "notifyEngagementCompetitionDocuments", "listEngagementCompetitionMailJobs",
    "prepareEngagementOpeningNotificationEmails", "prepareEngagementClubRecapEmails",
    "sendEngagementPreparedEmails", "resolveEngagementSwimmerChangeRequest"
  ],
  schedulers: ["resumePerformancePublicationJobs", "closeDueEngagementCompetitions"]
});

const METADATA = Object.freeze({
  bootstrap: {
    secrets: [],
    apis: ["firestore.googleapis.com", "firebaserules.googleapis.com", "cloudfunctions.googleapis.com", "run.googleapis.com", "cloudbuild.googleapis.com", "artifactregistry.googleapis.com"],
    iam: ["roles/datastore.indexAdmin", "roles/firebaserules.admin", "roles/cloudfunctions.developer", "roles/iam.serviceAccountUser"],
    dependencies: ["Firestore: users; règles; 11 index composites", "Auth: jeton Firebase requis par getCurrentAccessUser"]
  },
  access: {
    secrets: [],
    apis: ["cloudfunctions.googleapis.com", "run.googleapis.com", "cloudbuild.googleapis.com", "artifactregistry.googleapis.com", "firestore.googleapis.com", "identitytoolkit.googleapis.com"],
    iam: ["roles/cloudfunctions.developer", "roles/iam.serviceAccountUser", "runtime: roles/datastore.user + administration Firebase Auth"],
    dependencies: ["Firestore: users, accès, annuaires, grants, audit", "Auth: utilisateurs, custom claims, révocation"]
  },
  "engagement-core": {
    secrets: [],
    apis: ["cloudfunctions.googleapis.com", "run.googleapis.com", "cloudbuild.googleapis.com", "artifactregistry.googleapis.com", "firestore.googleapis.com", "eventarc.googleapis.com", "pubsub.googleapis.com", "storage.googleapis.com"],
    iam: ["roles/cloudfunctions.developer", "roles/eventarc.admin", "roles/iam.serviceAccountUser", "runtime: roles/datastore.user + objectAdmin limité au bucket Firebase Storage TEST"],
    dependencies: ["Firestore: engagement*, users, performances et audit", "Storage TEST: livepalmes-test.firebasestorage.app", "Auth: identité et capacités"]
  },
  performance: {
    secrets: [],
    apis: ["cloudfunctions.googleapis.com", "run.googleapis.com", "cloudbuild.googleapis.com", "artifactregistry.googleapis.com", "firestore.googleapis.com", "eventarc.googleapis.com", "pubsub.googleapis.com", "storage.googleapis.com"],
    iam: ["roles/cloudfunctions.developer", "roles/eventarc.admin", "roles/iam.serviceAccountUser", "runtime: roles/datastore.user + objectViewer limité aux sources publiques TEST"],
    dependencies: ["Firestore: performance*, imports et caches DTN", "Storage/Hosting TEST: lecture des sources DTN et migration", "Auth: capacité competitions.import ou dtn.view"]
  },
  publications: {
    secrets: [],
    apis: ["cloudfunctions.googleapis.com", "run.googleapis.com", "cloudbuild.googleapis.com", "artifactregistry.googleapis.com", "firestore.googleapis.com", "eventarc.googleapis.com", "pubsub.googleapis.com", "storage.googleapis.com"],
    iam: ["roles/cloudfunctions.developer", "roles/eventarc.admin", "roles/iam.serviceAccountUser", "runtime: roles/datastore.user + objectAdmin limité au bucket public TEST"],
    dependencies: ["Firestore TEST: résultats, calendrier, records et performances", "Storage TEST: livepalmes-test-public-data-206080168534"]
  },
  email: {
    secrets: ["LIVEPALMES_SMTP_HOST", "LIVEPALMES_SMTP_PORT", "LIVEPALMES_SMTP_USER", "LIVEPALMES_SMTP_PASS", "LIVEPALMES_SMTP_SECURE", "LIVEPALMES_MAIL_FROM", "LIVEPALMES_NOTIFICATION_LINK_SECRET"],
    apis: ["cloudfunctions.googleapis.com", "run.googleapis.com", "cloudbuild.googleapis.com", "artifactregistry.googleapis.com", "firestore.googleapis.com", "secretmanager.googleapis.com"],
    iam: ["roles/cloudfunctions.developer", "roles/iam.serviceAccountUser", "runtime: roles/datastore.user + roles/secretmanager.secretAccessor limité aux secrets TEST"],
    dependencies: ["Firestore TEST: users, demandes, shards et engagementMailJobs", "Auth TEST", "SMTP de capture exclusivement TEST", "Hosting TEST pour les liens de préférences"]
  },
  schedulers: {
    secrets: ["LIVEPALMES_SMTP_HOST", "LIVEPALMES_SMTP_PORT", "LIVEPALMES_SMTP_USER", "LIVEPALMES_SMTP_PASS", "LIVEPALMES_SMTP_SECURE", "LIVEPALMES_MAIL_FROM", "LIVEPALMES_NOTIFICATION_LINK_SECRET"],
    apis: ["cloudfunctions.googleapis.com", "run.googleapis.com", "cloudbuild.googleapis.com", "artifactregistry.googleapis.com", "firestore.googleapis.com", "storage.googleapis.com", "cloudscheduler.googleapis.com", "secretmanager.googleapis.com"],
    iam: ["roles/cloudfunctions.developer", "roles/cloudscheduler.admin", "roles/iam.serviceAccountUser", "runtime: rôles Firestore/Storage/Secret Manager TEST des traitements appelés"],
    dependencies: ["Firestore TEST: engagementClosureQueue et performancePublicationJobs", "Buckets TEST", "SMTP de capture TEST pour closeDueEngagementCompetitions"]
  }
});

const ALL_SAFE_LOTS = Object.freeze(["access", "engagement-core", "performance", "publications"]);

// Toute Function susceptible d'écrire dans le bucket public, ou de créer/rejouer
// un job qui y écrit, doit être déclarée ici. Les seules exceptions hors du lot
// publications sont documentées : résolution email d'une identité et scheduler.
const PUBLICATION_EFFECT_FUNCTIONS = Object.freeze([
  "storeCompetitionPdf", "deleteCompetitionPdf", "syncOfficialResultToPublicIndex",
  "rebuildEngagementCompetitionCalendars", "syncEngagementCompetitionToCalendar",
  "syncEngagementCalendarEventToCalendar", "syncPublicRecordsData", "publishPerformancePublicData",
  "createCompetitionImport", "resumeCompetitionImportPublication", "deleteCompetitionImport",
  "publishPerformanceCorrectionJob", "retryPerformancePublicationJob", "savePerformanceCorrection",
  "updateEngagementNationalSwimmerIdentity", "mergeEngagementNationalClubSwimmer",
  "repairEngagementNationalSwimmerMergePublication", "resolveEngagementSwimmerChangeRequest",
  "resumePerformancePublicationJobs"
]);

module.exports = { ALL_SAFE_LOTS, LOTS, METADATA, PROJECT_ID, PUBLICATION_EFFECT_FUNCTIONS };
