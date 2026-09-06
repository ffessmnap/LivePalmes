"use strict";

const SOURCE_PROJECT = "livepalmes";
const DESTINATION_PROJECT = "livepalmes-test";

const COPY = Object.freeze([
  "competitions", "engagementClubs", "engagementConfigurations", "engagementCalendarEvents",
  "engagementCompetitions", "engagementClubEntries", "engagementClubPeople",
  "engagementClubSwimmers", "engagementSwimmerLicenses", "engagementSwimmerLicenseNumbers",
  "engagementSwimmerAlerts", "performanceImports", "performances", "performanceChanges",
  "performanceCorrections",
  "engagementClubRosters", "engagementClubPeopleRosters", "engagementPublicDirectories",
  "engagementCompetitionCalendars", "engagementCalendarEventCalendars",
  "engagementCompetitionEntrySummaries", "engagementClubCompetitionIndexes",
  "engagementCompetitionStatisticsCache", "engagementEntryTimeCaches",
  "performanceSwimmerIndex", "performanceSwimmerPages", "performanceSwimmerIndexState",
  "performanceTopViews", "performanceTopIndexState", "dtnQualificationViews",
  "dtnQualificationViewState"
]);

const COPY_SUBCOLLECTIONS_BY_ROOT = Object.freeze({
  competitions: Object.freeze([
    "results", "liveData", "history", "performanceData", "extras", "races", "summaries",
    "resultArchives", "historyArchives", "resultPdfs", "seriesPdfs", "sessionResultsPdfs"
  ]),
  performanceImports: Object.freeze(["clubs", "performances"])
});

const COPY_SUBCOLLECTIONS = Object.freeze([
  ...COPY_SUBCOLLECTIONS_BY_ROOT.competitions,
  ...COPY_SUBCOLLECTIONS_BY_ROOT.performanceImports
]);

const REBUILD = Object.freeze([]);

const EXCLUDE = Object.freeze([
  "users", "accessGrants", "accessDirectoryIndexState", "accessDirectorySnapshots",
  "accessDirectorySnapshotState", "accessUserDeletionRequests", "auditLogs",
  "portalAccessRequestRateLimits", "engagementAccessRequests", "consoleGrants", "security",
  "secrets", "pinAttempts", "engagementMailJobs", "engagementMailRecipientShards",
  "engagementMailRecipientIndexState", "engagementClubAdminDirectories",
  "engagementClosureQueue", "performancePublicationJobs", "performanceMigrationJobs",
  "dtnQualificationJobs", "public", "presence", "roleLocks", "testMode", "alerts",
  "engagementCompetitionDeletionRequests",
  "engagementSwimmerChangeRequests", "engagementSwimmerDeletionRequests"
]);

const PRESERVE_TEST = Object.freeze([
  "Firebase Authentication", "users", "accessGrants", "accessDirectoryIndexState",
  "accessDirectorySnapshots", "accessDirectorySnapshotState", "auditLogs",
  "engagementClubAdminDirectories"
]);

const STORAGE = Object.freeze({
  copy: [
    { sourceBucket: "livepalmes.firebasestorage.app", destinationBucket: "livepalmes-test.firebasestorage.app", prefixes: ["competition-documents/", "entry-documents/"] },
    { sourceBucket: "livepalmes-public-data-718081132564", destinationBucket: "livepalmes-test-public-data-206080168534", prefixes: ["competition-pdfs/"] }
  ],
  rebuild: [
    "calendar/", "performance-public/", "performance-public-firestore/", "records/", "dtn-listing/"
  ]
});

const REFERENCE_REPLACEMENTS = Object.freeze([
  ["livepalmes.firebasestorage.app", "livepalmes-test.firebasestorage.app"],
  ["livepalmes-public-data-718081132564", "livepalmes-test-public-data-206080168534"],
  ["https://livepalmes.web.app", "https://livepalmes-test.web.app"],
  ["projects/livepalmes/", "projects/livepalmes-test/"]
]);

module.exports = {
  COPY, COPY_SUBCOLLECTIONS, COPY_SUBCOLLECTIONS_BY_ROOT, DESTINATION_PROJECT, EXCLUDE,
  PRESERVE_TEST, REBUILD, REFERENCE_REPLACEMENTS, SOURCE_PROJECT, STORAGE
};
