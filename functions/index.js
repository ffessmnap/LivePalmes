function portalPerformanceHandlers() {
  if (!portalPerformanceHandlers.instance) portalPerformanceHandlers.instance = require("./portal-performance-handlers").createPerformanceHandlers({
    get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
    get PUBLIC_COMPETITION_PDF_PREFIX() { return PUBLIC_COMPETITION_PDF_PREFIX; },
    get PUBLIC_PERFORMANCE_BUCKET() { return PUBLIC_PERFORMANCE_BUCKET; },
    get accessUserDisplayName() { return accessUserDisplayName; },
    get activeCompetitionImportData() { return activeCompetitionImportData; },
    get activePerformanceRowsForNationalSwimmer() { return activePerformanceRowsForNationalSwimmer; },
    get applyEngagementSwimmerIdentityCorrection() { return applyEngagementSwimmerIdentityCorrection; },
    get assertCapability() { return assertCapability; },
    get assertComputerPdfAccess() { return assertComputerPdfAccess; },
    get authorizeNativePerformance() { return authorizeNativePerformance; },
    get canResumeImportPublication() { return canResumeImportPublication; },
    get cleanEngagementSwimmerIdentityCorrection() { return cleanEngagementSwimmerIdentityCorrection; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get cleanTimingType() { return cleanTimingType; },
    get competitionIdFrom() { return competitionIdFrom; },
    get competitionImportExistingSummary() { return competitionImportExistingSummary; },
    get competitionImportIdentity() { return competitionImportIdentity; },
    get competitionImportPerformanceId() { return competitionImportPerformanceId; },
    get competitionImportPreviewPerformance() { return competitionImportPreviewPerformance; },
    get db() { return db; },
    get decodePdfDataUrl() { return decodePdfDataUrl; },
    get deleteEngagementClubRosterSwimmer() { return deleteEngagementClubRosterSwimmer; },
    get deleteEngagementEntryTimeCache() { return deleteEngagementEntryTimeCache; },
    get detectRecordAlerts() { return detectRecordAlerts; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementNationalSwimmerEntrySnapshot() { return engagementNationalSwimmerEntrySnapshot; },
    get engagementNationalSwimmerFullName() { return engagementNationalSwimmerFullName; },
    get engagementNationalSwimmerItemFromDoc() { return engagementNationalSwimmerItemFromDoc; },
    get engagementSwimmerIdentitySnapshot() { return engagementSwimmerIdentitySnapshot; },
    get engagementSwimmerLicenseNumberId() { return engagementSwimmerLicenseNumberId; },
    get engagementSwimmerLicensePayload() { return engagementSwimmerLicensePayload; },
    get enqueuePerformancePublicationJob() { return enqueuePerformancePublicationJob; },
    get findExistingCompetitionImport() { return findExistingCompetitionImport; },
    get getEngagementNationalSwimmerForMerge() { return getEngagementNationalSwimmerForMerge; },
    get getEngagementSwimmerCorrectionTarget() { return getEngagementSwimmerCorrectionTarget; },
    get importDocumentId() { return importDocumentId; },
    get importPublicationStatus() { return importPublicationStatus; },
    get invokeDtnSeason() { return invokeDtnSeason; },
    get isAlreadyPublishedRecordAlert() { return isAlreadyPublishedRecordAlert; },
    get loadPerformanceRecordsData() { return loadPerformanceRecordsData; },
    get mergeEngagementClubEntryRelays() { return mergeEngagementClubEntryRelays; },
    get mergeEngagementClubEntrySwimmers() { return mergeEngagementClubEntrySwimmers; },
    get nativePerformanceFailure() { return nativePerformanceFailure; },
    get normalizeLivePalmesImportPerformances() { return normalizeLivePalmesImportPerformances; },
    get parseCompetitionImportPayload() { return parseCompetitionImportPayload; },
    get performanceBaseDocId() { return performanceBaseDocId; },
    get performanceMergeTargetPayloadFromSwimmer() { return performanceMergeTargetPayloadFromSwimmer; },
    get performancePublicKey() { return performancePublicKey; },
    get performanceSwimmerPageId() { return performanceSwimmerPageId; },
    get publicPdfStoragePath() { return publicPdfStoragePath; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get publicStorageUrl() { return publicStorageUrl; },
    get publishCompetitionImportOutputs() { return publishCompetitionImportOutputs; },
    get publishEngagementNationalSwimmerMerge() { return publishEngagementNationalSwimmerMerge; },
    get publishNativeRecords() { return publishNativeRecords; },
    get reactivateEngagementClubRosterSwimmersFromPerformanceRows() { return reactivateEngagementClubRosterSwimmersFromPerformanceRows; },
    get readNapRecordsAdministration() { return readNapRecordsAdministration; },
    get readPerformanceDocsForNationalSwimmerMerge() { return readPerformanceDocsForNationalSwimmerMerge; },
    get stableHash() { return stableHash; },
    get stageCompetitionImportReplacement() { return stageCompetitionImportReplacement; },
    get storage() { return storage; },
    get swimmerMergeIds() { return swimmerMergeIds; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get writePerformanceBaseRows() { return writePerformanceBaseRows; },
    get writePerformanceSwimmerIndexRows() { return writePerformanceSwimmerIndexRows; },
    get writePerformanceSwimmerPageRows() { return writePerformanceSwimmerPageRows; }
  });
  return portalPerformanceHandlers.instance;
}

function portalAccessHandlers() {
  if (!portalAccessHandlers.instance) portalAccessHandlers.instance = require("./portal-access-handlers").createAccessHandlers({
    get ACCESS_CAPABILITIES() { return ACCESS_CAPABILITIES; },
    get ACCESS_CAPABILITY_SET() { return ACCESS_CAPABILITY_SET; },
    get ACCESS_DIRECTORY_INDEX_VERSION() { return ACCESS_DIRECTORY_INDEX_VERSION; },
    get ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION() { return ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION; },
    get ACCESS_DIRECTORY_SNAPSHOT_VERSION() { return ACCESS_DIRECTORY_SNAPSHOT_VERSION; },
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get FUNCTIONS_EMULATOR_ACTIVE() { return FUNCTIONS_EMULATOR_ACTIVE; },
    get FieldPath() { return FieldPath; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get ROLES() { return ROLES; },
    get Timestamp() { return Timestamp; },
    get accessDirectoryFilterKey() { return accessDirectoryFilterKey; },
    get accessDirectoryIndexStateRef() { return accessDirectoryIndexStateRef; },
    get accessDirectoryKeys() { return accessDirectoryKeys; },
    get accessDirectorySnapshotEntry() { return accessDirectorySnapshotEntry; },
    get accessDirectorySnapshotEntryKey() { return accessDirectorySnapshotEntryKey; },
    get accessDirectorySnapshotRegionId() { return accessDirectorySnapshotRegionId; },
    get accessDirectorySnapshotStateRef() { return accessDirectorySnapshotStateRef; },
    get accessManagementContext() { return accessManagementContext; },
    get accessUserDeletionRequestItem() { return accessUserDeletionRequestItem; },
    get accessUserListItem() { return accessUserListItem; },
    get accessUserMatchesFilters() { return accessUserMatchesFilters; },
    get accessUserRegionIdFromData() { return accessUserRegionIdFromData; },
    get accessUserVisibleForAccessDirectory() { return accessUserVisibleForAccessDirectory; },
    get activeCapabilitiesFromMap() { return activeCapabilitiesFromMap; },
    get assertAdmin() { return assertAdmin; },
    get assertCapability() { return assertCapability; },
    get assertConsolePortalAccess() { return assertConsolePortalAccess; },
    get assertEmail() { return assertEmail; },
    get assertLivePalmesAccess() { return assertLivePalmesAccess; },
    get assertPin() { return assertPin; },
    get assertPinAttemptAllowed() { return assertPinAttemptAllowed; },
    get assertRegionalAccessUserDeletionRequestAllowed() { return assertRegionalAccessUserDeletionRequestAllowed; },
    get assertRole() { return assertRole; },
    get auth() { return auth; },
    get capabilitiesMap() { return capabilitiesMap; },
    get cleanAccessProfile() { return cleanAccessProfile; },
    get cleanText() { return cleanText; },
    get clearPinAttempts() { return clearPinAttempts; },
    get competitionEmailNotificationsEnabled() { return competitionEmailNotificationsEnabled; },
    get competitionIdFrom() { return competitionIdFrom; },
    get consoleGrantRef() { return consoleGrantRef; },
    get consoleRoleClaims() { return consoleRoleClaims; },
    get crypto() { return crypto; },
    get db() { return db; },
    get deleteAccessUserAccount() { return deleteAccessUserAccount; },
    get hasConsolePortalCapability() { return hasConsolePortalCapability; },
    get mergeAccessDirectorySnapshotEntries() { return mergeAccessDirectorySnapshotEntries; },
    get normalizeEmail() { return normalizeEmail; },
    get normalizedAccessScope() { return normalizedAccessScope; },
    get pinAttemptRef() { return pinAttemptRef; },
    get pinHash() { return pinHash; },
    get portalReadStats() { return portalReadStats; },
    get recordFailedPinAttempt() { return recordFailedPinAttempt; },
    get rolePinsRef() { return rolePinsRef; },
    get safeCompareHex() { return safeCompareHex; },
    get saveAccessUserProfile() { return saveAccessUserProfile; },
    get searchAccessUserDocuments() { return searchAccessUserDocuments; },
    get stableHash() { return stableHash; },
    get updatePublicPinNotes() { return updatePublicPinNotes; },
    get writeAccessGrants() { return writeAccessGrants; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return portalAccessHandlers.instance;
}

function portalCompetitionHandlers() {
  if (!portalCompetitionHandlers.instance) portalCompetitionHandlers.instance = require("./portal-competition-handlers").createCompetitionHandlers({
    get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
    get ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION() { return ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION; },
    get ENGAGEMENT_COMPETITION_LEVELS() { return ENGAGEMENT_COMPETITION_LEVELS; },
    get ENGAGEMENT_COMPETITION_TYPES() { return ENGAGEMENT_COMPETITION_TYPES; },
    get ENGAGEMENT_ENTRY_STATUSES() { return ENGAGEMENT_ENTRY_STATUSES; },
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ENGAGEMENT_OPEN_WATER_COURSE_LIMIT() { return ENGAGEMENT_OPEN_WATER_COURSE_LIMIT; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldPath() { return FieldPath; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get MAX_COMPETITION_DOCUMENTS() { return MAX_COMPETITION_DOCUMENTS; },
    get accessManagementContext() { return accessManagementContext; },
    get armNativeCompetitionNotification() { return armNativeCompetitionNotification; },
    get assertCanDeleteEngagementDocument() { return assertCanDeleteEngagementDocument; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get assertCanModifyEngagementEvent() { return assertCanModifyEngagementEvent; },
    get assertCapability() { return assertCapability; },
    get assertEngagementCompetitionDocumentPath() { return assertEngagementCompetitionDocumentPath; },
    get buildEngagementCompetitionTxt() { return buildEngagementCompetitionTxt; },
    get cleanCompetitionDocumentInput() { return cleanCompetitionDocumentInput; },
    get cleanCompetitionDocuments() { return cleanCompetitionDocuments; },
    get cleanEngagementCalendarEventPayload() { return cleanEngagementCalendarEventPayload; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionPayload() { return cleanEngagementCompetitionPayload; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementEntryStatus() { return cleanEngagementEntryStatus; },
    get cleanEngagementOpenWaterCourse() { return cleanEngagementOpenWaterCourse; },
    get cleanEngagementOpenWaterCourses() { return cleanEngagementOpenWaterCourses; },
    get cleanEngagementProgramSessions() { return cleanEngagementProgramSessions; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get competitionDocumentDownloadUrl() { return competitionDocumentDownloadUrl; },
    get competitionDocumentStoragePath() { return competitionDocumentStoragePath; },
    get competitionDocumentTokenFromUrl() { return competitionDocumentTokenFromUrl; },
    get createNativePortalCalendarRecord() { return createNativePortalCalendarRecord; },
    get crypto() { return crypto; },
    get db() { return db; },
    get decodeCompetitionDocumentDataUrl() { return decodeCompetitionDocumentDataUrl; },
    get decodeEngagementCompetitionStatisticsCache() { return decodeEngagementCompetitionStatisticsCache; },
    get encodeEngagementCompetitionStatisticsCache() { return encodeEngagementCompetitionStatisticsCache; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementAccessRequestItem() { return engagementAccessRequestItem; },
    get engagementActiveClubMailRecipients() { return engagementActiveClubMailRecipients; },
    get engagementCalendarEventCalendarRef() { return engagementCalendarEventCalendarRef; },
    get engagementCalendarEventDetailItem() { return engagementCalendarEventDetailItem; },
    get engagementCalendarEventItemsFromData() { return engagementCalendarEventItemsFromData; },
    get engagementClosureQueueRef() { return engagementClosureQueueRef; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubCompetitionIndexRef() { return engagementClubCompetitionIndexRef; },
    get engagementClubEntryCompetitionIds() { return engagementClubEntryCompetitionIds; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementCompetitionCalendarItemsFromData() { return engagementCompetitionCalendarItemsFromData; },
    get engagementCompetitionCalendarRef() { return engagementCompetitionCalendarRef; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementCompetitionDocumentContext() { return engagementCompetitionDocumentContext; },
    get engagementCompetitionDocumentRecipients() { return engagementCompetitionDocumentRecipients; },
    get engagementCompetitionDocumentUploader() { return engagementCompetitionDocumentUploader; },
    get engagementCompetitionListItem() { return engagementCompetitionListItem; },
    get engagementCompetitionStatisticsCacheRef() { return engagementCompetitionStatisticsCacheRef; },
    get engagementCompetitionStatisticsItem() { return engagementCompetitionStatisticsItem; },
    get engagementDeletionRequestId() { return engagementDeletionRequestId; },
    get engagementEventIsPast() { return engagementEventIsPast; },
    get engagementMailRecipientFromUserDoc() { return engagementMailRecipientFromUserDoc; },
    get engagementMailRecipientIndexStateRef() { return engagementMailRecipientIndexStateRef; },
    get engagementMailRecipientShardGroups() { return engagementMailRecipientShardGroups; },
    get engagementMailRecipientShardRef() { return engagementMailRecipientShardRef; },
    get engagementMailRecipientShardRefs() { return engagementMailRecipientShardRefs; },
    get engagementMailRecipientsFromIndex() { return engagementMailRecipientsFromIndex; },
    get engagementNationalAdministrationPendingCounts() { return engagementNationalAdministrationPendingCounts; },
    get engagementOpenWaterCourseConfigRef() { return engagementOpenWaterCourseConfigRef; },
    get engagementPdfFileName() { return engagementPdfFileName; },
    get engagementRegionsMatch() { return engagementRegionsMatch; },
    get engagementSeasonBoundsFromEndYear() { return engagementSeasonBoundsFromEndYear; },
    get engagementSeasonEndYearFromIsoDate() { return engagementSeasonEndYearFromIsoDate; },
    get engagementTxtSwimmerCategory() { return engagementTxtSwimmerCategory; },
    get filterEngagementCompetitionCalendarItems() { return filterEngagementCompetitionCalendarItems; },
    get getOrCreateEngagementCompetitionTxt() { return getOrCreateEngagementCompetitionTxt; },
    get hasManagedEngagementCompetitionDocumentStorage() { return hasManagedEngagementCompetitionDocumentStorage; },
    get isNationalOnlyEngagementCompetitionLevel() { return isNationalOnlyEngagementCompetitionLevel; },
    get mutateNativeCompetitionDocument() { return mutateNativeCompetitionDocument; },
    get nativeAdminCompetitionEntries() { return nativeAdminCompetitionEntries; },
    get nativeNotificationPreview() { return nativeNotificationPreview; },
    get nativePerformanceFailure() { return nativePerformanceFailure; },
    get nativePortalCalendarItems() { return nativePortalCalendarItems; },
    get nativePortalCompetition() { return nativePortalCompetition; },
    get nativeQualificationError() { return nativeQualificationError; },
    get nativeQualificationNow() { return nativeQualificationNow; },
    get nativeQualificationServices() { return nativeQualificationServices; },
    get portalReadStats() { return portalReadStats; },
    get qualificationEngine() { return qualificationEngine; },
    get qualificationEvents() { return qualificationEvents; },
    get qualificationService() { return qualificationService; },
    get storage() { return storage; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get writeEngagementClubAdminDirectory() { return writeEngagementClubAdminDirectory; }
  });
  return portalCompetitionHandlers.instance;
}

function portalNationalHandlers() {
  if (!portalNationalHandlers.instance) portalNationalHandlers.instance = require("./portal-national-handlers").createNationalHandlers({
    get AUDIT_ACTOR_RESOLUTION_LIMIT() { return AUDIT_ACTOR_RESOLUTION_LIMIT; },
    get AUDIT_COMPETITION_RESOLUTION_LIMIT() { return AUDIT_COMPETITION_RESOLUTION_LIMIT; },
    get AUDIT_LEGACY_VISIBLE_SINCE() { return AUDIT_LEGACY_VISIBLE_SINCE; },
    get AUDIT_PAGE_LIMIT() { return AUDIT_PAGE_LIMIT; },
    get AUDIT_PERSON_RESOLUTION_LIMIT() { return AUDIT_PERSON_RESOLUTION_LIMIT; },
    get CLUB_REFERENCE_BY_FEDERAL_NUMBER() { return CLUB_REFERENCE_BY_FEDERAL_NUMBER; },
    get CLUB_REFERENCE_BY_ID() { return CLUB_REFERENCE_BY_ID; },
    get ENGAGEMENT_CLUBS_COLLECTION() { return ENGAGEMENT_CLUBS_COLLECTION; },
    get ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION; },
    get ENGAGEMENT_CLUB_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_ROSTERS_COLLECTION; },
    get ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT() { return ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT; },
    get ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION() { return ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldPath() { return FieldPath; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get auditManagementContext() { return auditManagementContext; },
    get auth() { return auth; },
    get cleanClubPayload() { return cleanClubPayload; },
    get cleanEngagementSwimmerIdentityCorrection() { return cleanEngagementSwimmerIdentityCorrection; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get db() { return db; },
    get deleteEngagementClubPeopleRosterPerson() { return deleteEngagementClubPeopleRosterPerson; },
    get deleteEngagementClubSwimmerPermanently() { return deleteEngagementClubSwimmerPermanently; },
    get displayNameFromProfile() { return displayNameFromProfile; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubPersonEntrySnapshot() { return engagementClubPersonEntrySnapshot; },
    get engagementClubPersonFullName() { return engagementClubPersonFullName; },
    get engagementClubPersonItem() { return engagementClubPersonItem; },
    get engagementClubSwimmerDeletionUsage() { return engagementClubSwimmerDeletionUsage; },
    get engagementNationalSwimmerItemFromDoc() { return engagementNationalSwimmerItemFromDoc; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get engagementStoredClubItem() { return engagementStoredClubItem; },
    get engagementSwimmerChangeRequestItem() { return engagementSwimmerChangeRequestItem; },
    get engagementSwimmerIdentitySnapshot() { return engagementSwimmerIdentitySnapshot; },
    get getEngagementNationalSwimmerForMerge() { return getEngagementNationalSwimmerForMerge; },
    get getEngagementSwimmerCorrectionTarget() { return getEngagementSwimmerCorrectionTarget; },
    get manageNationalLibraryDocuments() { return manageNationalLibraryDocuments; },
    get mergeEngagementClubEntryOfficials() { return mergeEngagementClubEntryOfficials; },
    get portalReadStats() { return portalReadStats; },
    get publicEngagementClubDirectoryRef() { return publicEngagementClubDirectoryRef; },
    get publicEngagementClubItem() { return publicEngagementClubItem; },
    get readEngagementClubAdminDirectory() { return readEngagementClubAdminDirectory; },
    get searchEngagementNationalSwimmerDocs() { return searchEngagementNationalSwimmerDocs; },
    get searchEngagementNationalSwimmerMergeTargetDocs() { return searchEngagementNationalSwimmerMergeTargetDocs; },
    get setEngagementSwimmerChangeRequestRosterState() { return setEngagementSwimmerChangeRequestRosterState; },
    get stableHash() { return stableHash; },
    get upsertEngagementClubPeopleRosterPerson() { return upsertEngagementClubPeopleRosterPerson; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return portalNationalHandlers.instance;
}

function portalClubHandlers() {
  if (!portalClubHandlers.instance) portalClubHandlers.instance = require("./portal-club-handlers").createClubHandlers({
    get ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION; },
    get ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION() { return ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION; },
    get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get assertEngagementClubWriteOpen() { return assertEngagementClubWriteOpen; },
    get assertEngagementSwimmerRoleCompatibility() { return assertEngagementSwimmerRoleCompatibility; },
    get assertNoEngagementSwimmerLicenseConflict() { return assertNoEngagementSwimmerLicenseConflict; },
    get buildEngagementClubRecapPdf() { return buildEngagementClubRecapPdf; },
    get buildEngagementClubSwimmersFromRequest() { return buildEngagementClubSwimmersFromRequest; },
    get buildEngagementNewSwimmerAlerts() { return buildEngagementNewSwimmerAlerts; },
    get cleanEngagementClubActivityStatus() { return cleanEngagementClubActivityStatus; },
    get cleanEngagementClubPerson() { return cleanEngagementClubPerson; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementEntryIndividualEntries() { return cleanEngagementEntryIndividualEntries; },
    get cleanEngagementEntryRelays() { return cleanEngagementEntryRelays; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanEngagementLicenseSeasonStatus() { return cleanEngagementLicenseSeasonStatus; },
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanEngagementMaxEventsPerSwimmer() { return cleanEngagementMaxEventsPerSwimmer; },
    get cleanEngagementMissingEntryTimeMode() { return cleanEngagementMissingEntryTimeMode; },
    get cleanEngagementNewSwimmer() { return cleanEngagementNewSwimmer; },
    get cleanEngagementPoolLength() { return cleanEngagementPoolLength; },
    get cleanEngagementQualificationTimesMode() { return cleanEngagementQualificationTimesMode; },
    get cleanEngagementTeamLeader() { return cleanEngagementTeamLeader; },
    get cleanEngagementTimingType() { return cleanEngagementTimingType; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get clubRecapZip() { return clubRecapZip; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get currentEngagementSeasonInfo() { return currentEngagementSeasonInfo; },
    get db() { return db; },
    get deleteEngagementClubRosterSwimmer() { return deleteEngagementClubRosterSwimmer; },
    get deleteEngagementCompetitionEntrySummary() { return deleteEngagementCompetitionEntrySummary; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementClubPeopleRosterPeopleFromData() { return engagementClubPeopleRosterPeopleFromData; },
    get engagementClubPeopleRosterRef() { return engagementClubPeopleRosterRef; },
    get engagementClubPersonIdentityConflict() { return engagementClubPersonIdentityConflict; },
    get engagementClubPersonItem() { return engagementClubPersonItem; },
    get engagementClubPersonOutsideClubConflict() { return engagementClubPersonOutsideClubConflict; },
    get engagementClubRosterRef() { return engagementClubRosterRef; },
    get engagementClubRosterSwimmerItem() { return engagementClubRosterSwimmerItem; },
    get engagementClubRosterSwimmerKey() { return engagementClubRosterSwimmerKey; },
    get engagementClubRosterSwimmersFromData() { return engagementClubRosterSwimmersFromData; },
    get engagementClubSwimmerItem() { return engagementClubSwimmerItem; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementCompetitionEntrySummariesFromData() { return engagementCompetitionEntrySummariesFromData; },
    get engagementCompetitionEntrySummaryItem() { return engagementCompetitionEntrySummaryItem; },
    get engagementCompetitionEntrySummaryRef() { return engagementCompetitionEntrySummaryRef; },
    get engagementKnownTimeHistory() { return engagementKnownTimeHistory; },
    get engagementLicenseControlSeason() { return engagementLicenseControlSeason; },
    get engagementNewSwimmerAlertFromMatch() { return engagementNewSwimmerAlertFromMatch; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get engagementPdfFeeTotal() { return engagementPdfFeeTotal; },
    get engagementPersonLicenseKey() { return engagementPersonLicenseKey; },
    get engagementReferenceSwimmerItem() { return engagementReferenceSwimmerItem; },
    get engagementSwimmerLicenseId() { return engagementSwimmerLicenseId; },
    get engagementSwimmerLicenseNumberId() { return engagementSwimmerLicenseNumberId; },
    get engagementSwimmerLicenseNumberKey() { return engagementSwimmerLicenseNumberKey; },
    get engagementSwimmerLicensePayload() { return engagementSwimmerLicensePayload; },
    get engagementSwimmerRecoveryPreview() { return engagementSwimmerRecoveryPreview; },
    get engagementTeamLeaderComplete() { return engagementTeamLeaderComplete; },
    get generateNativeClubRecapPdf() { return generateNativeClubRecapPdf; },
    get getEngagementEntryTimeRowsForSwimmer() { return getEngagementEntryTimeRowsForSwimmer; },
    get getOrCreateEngagementClubRecapPdf() { return getOrCreateEngagementClubRecapPdf; },
    get importSwimmerCreation() { return importSwimmerCreation; },
    get intranapSwimmersIndex() { return intranapSwimmersIndex; },
    get loadPerformanceRecordsData() { return loadPerformanceRecordsData; },
    get nativeAdminCompetitionEntries() { return nativeAdminCompetitionEntries; },
    get nativeClubEntryTimeHistory() { return nativeClubEntryTimeHistory; },
    get nativeClubEntryView() { return nativeClubEntryView; },
    get nativePortalCompetition() { return nativePortalCompetition; },
    get portalReadStats() { return portalReadStats; },
    get previewNativeClubEntryTimes() { return previewNativeClubEntryTimes; },
    get publicEngagementClubDirectoryRef() { return publicEngagementClubDirectoryRef; },
    get publicEngagementClubItem() { return publicEngagementClubItem; },
    get qualificationEngine() { return qualificationEngine; },
    get qualificationRelaysAfterIndividualChange() { return qualificationRelaysAfterIndividualChange; },
    get qualificationService() { return qualificationService; },
    get rebuildEngagementClubPeopleRoster() { return rebuildEngagementClubPeopleRoster; },
    get resolveEngagementClubPersonSwimmer() { return resolveEngagementClubPersonSwimmer; },
    get resolveEngagementIndividualEntriesForSwimmer() { return resolveEngagementIndividualEntriesForSwimmer; },
    get saveNativeClubIndividualEntries() { return saveNativeClubIndividualEntries; },
    get saveNativeClubOfficials() { return saveNativeClubOfficials; },
    get saveNativeClubRelays() { return saveNativeClubRelays; },
    get saveNativeClubSwimmerSelections() { return saveNativeClubSwimmerSelections; },
    get sortEngagementClubSwimmers() { return sortEngagementClubSwimmers; },
    get stableHash() { return stableHash; },
    get throwEngagementClubPersonIdentityConflict() { return throwEngagementClubPersonIdentityConflict; },
    get uniqueEngagementClubSwimmers() { return uniqueEngagementClubSwimmers; },
    get upsertEngagementClubPeopleRosterPerson() { return upsertEngagementClubPeopleRosterPerson; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; },
    get validateEngagementIndividualEntryTimes() { return validateEngagementIndividualEntryTimes; },
    get validateEngagementRelayEntryTimes() { return validateEngagementRelayEntryTimes; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return portalClubHandlers.instance;
}











const crypto = require("node:crypto");
const { clubRecapZip } = require("./club-recap-zip");
const qualificationEngine = require("./engagement-qualification");
const { createDtnSeasonService } = require("./dtn-season-service");
const { createQualificationService } = require("./engagement-qualification-service");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldPath, FieldValue, getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const { HttpsError, onCall, onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onTaskDispatched } = require("firebase-functions/v2/tasks");
const {
  PERFORMANCE_PUBLICATION_LEASE_MS,
  PERFORMANCE_PUBLICATION_MAX_ATTEMPTS,
  canClaimPerformancePublicationJob,
  performancePublicationFailureStatus,
  publicPerformancePublicationJob
} = require("./performance-publication-jobs");
const { defineBoolean, defineSecret } = require("firebase-functions/params");
const { createNapPool, readSwimmerPerformances, performanceRequest } = require("./nap-mysql");
const { consoleRoleClaims, hasConsolePortalCapability } = require("./console-access");
const clubReference = require("./assets/club-reference.json");
const intranapSwimmersReference = require("./intranap-swimmers-reference.json");
const intranapSwimmersIndex = require("./assets/intranap-swimmers-index.json");
const { nextPublicResultsIndex } = require("./public-results-index");
const {
  decodePdfDataUrl,
  publicPdfStoragePath,
  publicStorageUrl
} = require("./public-pdf-storage");
const { nextPortalAccessRateLimit } = require("./portal-access-protection");
const { livePalmesEnvironment } = require("./livepalmes-environment");
const {
  engagementAccessAcknowledgement,
  engagementAccessRejection,
  engagementExistingAccountNotice,
  engagementAccessAdminNotification,
  engagementAccessAdminNotificationRecipients
} = require("./portal-access-mail");
const { engagementSwimmerChangeResolutionMail } = require("./engagement-swimmer-change-mail");
const { competitionMailLines, competitionMailDateTime } = require("./engagement-competition-mail-format");
const { escapeMailHtml, livePalmesMailHtml } = require("./livepalmes-mail-html");
const { cleanClubPayload } = require("./engagement-clubs");
const {
  findReferenceSwimmerCorrectionTarget,
  swimmerMergeIds,
  recoveredPerformanceRowsAreComplete
} = require("./engagement-swimmer-corrections");
const { buildWinPalmeCompetitionTxt } = require("./winpalme-export");
const {
  MAX_COMPETITION_DOCUMENTS,
  cleanCompetitionDocumentInput,
  cleanCompetitionDocuments,
  competitionDocumentDownloadUrl,
  competitionDocumentTokenFromUrl,
  competitionDocumentStoragePath,
  decodeCompetitionDocumentDataUrl
} = require("./engagement-competition-documents");
const {
  applyCompetitionImportTiming,
  cleanTimingType,
  ffessmBasTimingType,
  performanceImportChrono
} = require("./performance-import-timing");
const {
  competitionImportIdentity,
  sameCompetitionImport
} = require("./performance-import-replacement");
const {
  canResumeImportPublication,
  deactivatedImportPerformanceRows,
  hydratePublicSwimmerRowsFromPayload,
  importPublicationError,
  importPublicationResultStatus,
  importPublicationStatus,
  PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
  publicPerformanceSwimmerStorageRow,
  publicSwimmerPayloadSupportsTopRebuild
} = require("./performance-import-publication");
const {
  PUBLIC_CALENDAR_EVENT_TYPES,
  PUBLIC_CALENDAR_GENERIC_EVENT_TYPES,
  cleanPublicCalendarEventType,
  cleanPublicCalendarLevel,
  cleanPublicCalendarProgram,
  cleanPublicCalendarPublicationStatus,
  cleanPublicCalendarUrl,
  cleanPublicCalendarWhatsAppUrl,
  publicCalendarDetail,
  publicCalendarSummary
} = require("./public-calendar");

initializeApp();
const ENVIRONMENT = livePalmesEnvironment();
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();
db.settings({ ignoreUndefinedProperties: true });

const REGION = "europe-west1";
const LIVEPALMES_SMTP_HOST = defineSecret("LIVEPALMES_SMTP_HOST");
const LIVEPALMES_SMTP_PORT = defineSecret("LIVEPALMES_SMTP_PORT");
const LIVEPALMES_SMTP_USER = defineSecret("LIVEPALMES_SMTP_USER");
const LIVEPALMES_SMTP_PASS = defineSecret("LIVEPALMES_SMTP_PASS");
const LIVEPALMES_SMTP_SECURE = defineSecret("LIVEPALMES_SMTP_SECURE");
const LIVEPALMES_MAIL_FROM = defineSecret("LIVEPALMES_MAIL_FROM");
const LIVEPALMES_NOTIFICATION_LINK_SECRET = defineSecret("LIVEPALMES_NOTIFICATION_LINK_SECRET");
const LIVEPALMES_ENFORCE_APP_CHECK = defineBoolean("LIVEPALMES_ENFORCE_APP_CHECK", { default: false });
const ENGAGEMENT_MAIL_SECRETS = [
  LIVEPALMES_SMTP_HOST,
  LIVEPALMES_SMTP_PORT,
  LIVEPALMES_SMTP_USER,
  LIVEPALMES_SMTP_PASS,
  LIVEPALMES_SMTP_SECURE,
  LIVEPALMES_MAIL_FROM
];
const ENGAGEMENT_NOTIFICATION_MAIL_SECRETS = [
  ...ENGAGEMENT_MAIL_SECRETS,
  LIVEPALMES_NOTIFICATION_LINK_SECRET
];
const COMPETITION_IDS = new Set(["livepalmes-active", "livepalmes-test"]);
const ADMIN_UIDS = new Set(ENVIRONMENT.legacyAdminUids);
const FUNCTIONS_EMULATOR_ACTIVE = process.env.FUNCTIONS_EMULATOR === "true";
const ROLES = ["live", "speaker", "referee", "video", "computer", "secretary"];
const ROLE_SET = new Set(ROLES);
const ENGAGEMENT_COMPETITION_LEVELS = new Set(["departemental", "regional", "national", "international"]);
const ENGAGEMENT_ENTRY_STATUSES = new Set(["upcoming", "open", "closed"]);
const ENGAGEMENT_COMPETITION_TYPES = new Set(["pool", "openWater"]);
const ENGAGEMENT_WATER_BODY_TYPES = new Set(["sea", "lake", "river", "other"]);
const ENGAGEMENT_POOL_LENGTHS = new Set(["25", "33", "50"]);
const ENGAGEMENT_TIMING_TYPES = new Set(["manual", "electronic"]);
const ENGAGEMENT_QUALIFICATION_TIME_MODES = new Set(["all", "period"]);
const ENGAGEMENT_MISSING_ENTRY_TIME_MODES = new Set(["manual", "forbidden", "default595999", "none"]);
const ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE = false;
const ENGAGEMENT_SWIMMER_LICENSE_PATTERN = /^[A-Z]-\d{2}-\d+$/;
const ENGAGEMENT_LICENSE_VERIFICATION_STATUSES = new Set(["verified", "pending", "rejected", "conflict"]);
const ENGAGEMENT_LICENSE_SEASON_STATUSES = new Set(["to_check", "valid", "invalid"]);
const ACCESS_CAPABILITIES = [
  "admin.full",
  "records.manage",
  "consoles.manage",
  "consoles.access",
  "competitions.import",
  "dtn.view",
  "dtn.manage",
  "engagements.club.manage",
  "engagements.club.switch",
  "engagements.region.manage",
  "engagements.national.manage"
];
const ACCESS_CAPABILITY_SET = new Set(ACCESS_CAPABILITIES);
const ENGAGEMENT_MAIL_CAPABILITIES = [
  "engagements.club.manage",
  "engagements.region.manage",
  "engagements.national.manage"
];
const OPTIONAL_COMPETITION_MAIL_TYPES = new Set([
  "competition_documents",
  "opening_notification",
  "club_recap_pdf"
]);
const HASH_ITERATIONS = 120000;
const HASH_BYTES = 32;
const CALLABLE_OPTIONS = { region: REGION, invoker: "public" };
// Public sporting reads use NAP; operational migration tools remain TEST-only.
if (ENVIRONMENT.sportingDataSource === "nap") {
  const napPassword = defineSecret("LIVEPALMES_NAP_PASSWORD");
  let napPool;
  let homeEventsReader;
  exports.readNapPublicSwimmer = onRequest({
    region: REGION, invoker: "public", secrets: [napPassword], maxInstances: 2, concurrency: 4, timeoutSeconds: 30,
    cors: ENVIRONMENT.name === "test"
      ? [/^https:\/\/livepalmes-test(?:--[a-z0-9-]+)?\.web\.app$/, "https://livepalmes-test.firebaseapp.com"]
      : ["https://livepalmes.web.app", "https://livepalmes.firebaseapp.com"]
  }, async (request, response) => {
    response.set("Cache-Control", "no-store");
    const homeRequest=request.query.action==="home-page"||(!request.query.action&&!request.query.id&&["/","/index.html"].includes(request.path));
    if (request.method !== "GET" && !(request.method === "HEAD" && homeRequest)) { response.status(405).json({ error: "Methode interdite." }); return; }
    try {
      if (!napPool) napPool = createNapPool(napPassword.value());
      const action = request.query.action || (request.query.id ? "swimmer" : ["/", "/index.html"].includes(request.path) ? "home-page" : "swimmer");
      if(action==="home-page"){
        const homePage=require("./nap-home-page");
        const page=await homePage.readPage(napPool);
        response.set("X-LivePalmes-Home-Source","nap-server-html");
        response.set("Cache-Control","private, no-store");
        response.status(page.events&&page.documents?200:503).type("html").send(page.html);return;
      }
      if (!["swimmer", "search", "top", "top-years", "top-metadata", "calendar-manifest", "calendar-season", "competition", "competition-results", "records", "documents-featured", "documents-catalogue", "home-events"].includes(action)) throw new TypeError("Action invalide.");
      if(action==="home-events"){
        const home=require("./nap-home-direct");
        if(!homeEventsReader)homeEventsReader=home.createReader(()=>home.read(napPool));
        response.set("X-LivePalmes-Home-Source","nap-direct");
        response.json(await homeEventsReader());return;
      }
      response.json(action === "documents-featured" ? {source:"nap",documents:await require("./nap-public-documents").readFeatured(napPool)}
        : action === "documents-catalogue" ? {source:"nap",...await require("./nap-public-documents").readLibrary(napPool,require("./assets/nap-public-documents-index.json"),request.query)}
        : action === "records" ? await require("./nap-records-store").read(napPool)
        : action === "calendar-manifest" ? await require("./nap-direct-calendar").readCalendarManifest(napPool)
        : action === "calendar-season" ? await require("./nap-direct-calendar").readCalendarSeason(napPool, request.query.year)
        : action === "competition" ? await require("./nap-direct-calendar").readCompetition(napPool, request.query.id)
        : action === "competition-results" ? await require("./nap-direct-competition-results").readCompetitionResults(napPool, request.query.id)
        : action === "top" ? await require("./nap-direct-tops").readDirectTop(napPool, request.query)
        : action === "top-years" ? await require("./nap-direct-tops").readTopBirthYears(napPool, request.query)
        : action === "top-metadata" ? await require("./nap-direct-tops").readTopMetadata(napPool)
        : action === "search"
        ? await require("./nap-public-swimmer-redirect").searchSwimmers(napPool, request.query.q)
        : await require("./nap-public-swimmer-redirect").readSwimmer(napPool, request.query.id));
    } catch (error) {
      response.status(error instanceof TypeError ? 400 : 503).json({ error: error instanceof RangeError
        ? "Donnees trop volumineuses pour cette consultation."
        : "Consultation NAP indisponible." });
    }
  });
exports.getNapSwimmerPerformances = onCall({
    ...CALLABLE_OPTIONS, secrets: [napPassword],
    maxInstances: 2, concurrency: 4, timeoutSeconds: 30
  }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
    assertAdmin(request);
    let input;
    try { input = performanceRequest(request.data); }
    catch { throw new HttpsError("invalid-argument", "Identifiants NAP entiers requis."); }
    try {
      if (!napPool) napPool = createNapPool(napPassword.value());
      return await readSwimmerPerformances(napPool, input);
    } catch {
      // Ne pas exposer les erreurs du pilote, les secrets ou les donnees.
      throw new HttpsError("unavailable", "Consultation NAP indisponible. Verifier la configuration serveur.");
    }
  });
}
if (ENVIRONMENT.projectId === "livepalmes-test") {
  const napPassword = defineSecret("LIVEPALMES_NAP_PASSWORD");
  let napPool;
  // Export reserve au compte de publication TEST, jamais accessible au public.
  const { inspectExportSources, readExportPage, readSourceSchema } = require("./nap-public-export");
  exports.exportNapPublicPage = onRequest({
    region: REGION,
    invoker: "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com",
    secrets: [napPassword], maxInstances: 2, concurrency: 4, timeoutSeconds: 180
  }, async (request, response) => {
    response.set("Cache-Control", "no-store");
    const indexOperation = request.method === "POST" && request.query.action === "approved-index";
    const swimmerCorrection = request.method === "POST" && request.query.action === "approved-swimmer-correction";
    const noraClubs = request.method === "POST" && request.query.action === "approved-nora-performance-clubs";
    const portalSchema = request.method === "POST" && request.query.action === "approved-portal-schema";
    const closureSchema = request.method === "POST" && request.query.action === "approved-closure-schema";
    const peopleSchema = request.method === "POST" && request.query.action === "approved-people-schema";
    const dtnSchema = request.method === "POST" && request.query.action === "approved-dtn-schema";
    const licenseReports = request.method === "POST" && request.query.action === "approved-license-reports";
    const dtnSettings = request.method === "POST" && request.query.action === "approved-dtn-settings";
    const homeRefresh = request.method === "POST" && request.query.action === "home-events-refresh";
    if (request.method === "GET" && request.query.action === "home-events-refresh") { response.status(405).json({ error: "Methode interdite." }); return; }
    if (request.method !== "GET" && !indexOperation && !swimmerCorrection && !noraClubs && !portalSchema && !closureSchema && !peopleSchema && !dtnSchema && !dtnSettings && !licenseReports && !homeRefresh || request.method === "GET" && ["approved-index", "approved-swimmer-correction", "approved-nora-performance-clubs", "approved-portal-schema", "approved-closure-schema", "approved-people-schema", "approved-dtn-schema", "approved-dtn-settings", "approved-license-reports"].includes(request.query.action)) { response.status(405).json({ error: "Methode interdite." }); return; }
    try {
      if (!napPool) napPool = createNapPool(napPassword.value());
      const data = noraClubs ? await require("./nap-nora-performance-clubs").repair(napPool, request.body, {
        readDocument: async id => { const doc = await db.collection("auditLogs").doc(id).get(); return doc.exists ? doc.data() : null; },
        read: async () => { const doc = await db.collection("auditLogs").doc("nap-nora-13787-performance-clubs-20261024-before").get(); return doc.exists ? doc.data().target : null; },
        prepare: target => db.collection("auditLogs").doc("nap-nora-13787-performance-clubs-20261024-before").create({ action: "nap.performanceClubs.authorizedRepair.prepare", actorUid: "github-livepalmes-test-backend", target, createdAt: new Date().toISOString() }),
        complete: target => writeAuditLogOnce("nap.performanceClubs.authorizedRepair.complete", "github-livepalmes-test-backend", target, "nap-nora-13787-performance-clubs-20261024")
      }) : licenseReports ? await require("./nap-license-report-migration").request(napPool, request.body)
        : dtnSettings ? await require("./nap-dtn-settings-migration").migrateDtnSettings(napPool, db, request.body)
        : dtnSchema ? await require("./nap-approved-dtn-schema").approvedDtnSchema(napPool, request.body)
        : peopleSchema ? request.body?.confirmation === "nap-add-official-identity-fields"
          ? await require("./nap-approved-official-identity-schema").approvedOfficialIdentitySchema(napPool,request.body)
          : await require("./nap-approved-people-schema").approvedPeopleSchema(napPool, request.body)
        : closureSchema ? await require("./nap-approved-closure-schema").approvedClosureSchema(napPool, request.body)
        : portalSchema ? await require("./nap-approved-portal-schema").approvedPortalSchema(napPool, request.body)
        : swimmerCorrection ? await require("./nap-approved-swimmer-correction").approvedSwimmerCorrection(napPool, request.body, {
        read: async () => {
          const snapshot = await db.collection("auditLogs").doc("nap-swimmer-912-fauvau-before").get();
          return snapshot.exists ? snapshot.data().target : null;
        },
        prepare: target => db.collection("auditLogs").doc("nap-swimmer-912-fauvau-before").create({ action: "nap.swimmer.authorizedCorrection.prepare", actorUid: "github-livepalmes-test-backend", target, createdAt: new Date().toISOString() }),
        complete: target => writeAuditLogOnce("nap.swimmer.authorizedCorrection.complete", "github-livepalmes-test-backend", target, "nap-swimmer-912-fauvau")
      }) : indexOperation ? await require("./nap-approved-index").approvedIndexOperation(napPool, request.body)
        : homeRefresh ? await require("./nap-home-events-refresh").refreshTestHomeEvents(napPool,storage.bucket(ENVIRONMENT.publicBucket).file(require("./nap-home-events").OBJECT_PATH),{projectId:ENVIRONMENT.projectId,confirmation:request.body?.confirmation})
        : request.query.action === "document-themes-inspect" ? await require("./nap-document-themes-inspect").inspect(napPool)
        : request.query.action === "performance-clubs" ? await require("./nap-consultation-diagnostic").inspect(napPool)
        : request.query.action === "home-events-measure" ? await require("./nap-home-measure").measure(napPool,{direct:request.query.direct==="1"})
        : request.query.action === "home-events-page" ? await require("./nap-home-events").readPage(napPool,request.query)
        : request.query.action === "direct-plan" ? await require("./nap-direct-query-checks").inspectDirectQueries(napPool)
        : request.query.action === "time-shape" ? await require("./nap-direct-query-checks").inspectTimeShape(napPool, request.query.after)
        : request.query.action === "portal-contract" ? await require("./nap-portal-contract").inspectPortalContract(napPool)
        : request.query.action === "engagement-contract" ? await require("./nap-engagement-contract").inspectEngagementContract(napPool)
        : request.query.action === "portal-competition-contract" ? await require("./nap-portal-competitions").inspectNativeCompetitions(napPool)
        : request.query.action === "portal-entry-contract" ? await require("./nap-portal-entries").inspectNativeClubEntry(napPool)
        : request.query.action === "portal-person-status-plans" ? await require("./nap-club-person-status").inspectStatusWritePlans(napPool)
        : request.query.action === "portal-team-leader-contract" ? await require("./nap-team-leader-contract").inspectNativeLeaderContract(napPool)
        : request.query.action === "dtn-source-contract" ? await require("./nap-dtn-source-proof").inspectDtnSource(napPool)
        : request.query.action === "dtn-service-contract" ? await require("./nap-dtn-service-proof").inspectDtnService(napPool)
        : request.query.action === "portal-competition-write-plans" ? await require("./nap-competition-write-plans").inspectCompetitionWritePlans(napPool)
        : request.query.action === "portal-course-document-contract" ? await require("./nap-course-document-contract").inspectCourseDocumentContract(napPool)
        : request.query.action === "calendar-contract" ? await require("./nap-calendar-contract").inspectCalendarContract(napPool)
        : request.query.action === "source-inventory" ? await require("./nap-source-inventory").inspectSourceInventory(napPool)
        : request.query.action === "schema" ? await readSourceSchema(napPool)
        : request.query.action === "inspect" ? await inspectExportSources(napPool)
          : await readExportPage(napPool, request.query);
      response.json(data);
    } catch (error) {
      response.status(error instanceof TypeError ? 400 : 503).json({ error: noraClubs && (error instanceof TypeError || error instanceof RangeError) ? error.message : "Export NAP indisponible." });
    }
  });
}
const ENGAGEMENT_MAIL_CALLABLE_OPTIONS = { ...CALLABLE_OPTIONS, secrets: ENGAGEMENT_NOTIFICATION_MAIL_SECRETS, timeoutSeconds: 300 };
const ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS = { ...CALLABLE_OPTIONS,
  ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) };
const NOTIFICATION_PREFERENCE_CALLABLE_OPTIONS = { ...CALLABLE_OPTIONS, secrets: [LIVEPALMES_NOTIFICATION_LINK_SECRET] };
const ENGAGEMENT_DOCUMENT_UPLOAD_OPTIONS = { ...CALLABLE_OPTIONS, timeoutSeconds: 120, memory: "512MiB" };
const ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS = { ...CALLABLE_OPTIONS, timeoutSeconds: 540, memory: "1GiB" };
const ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS = {
  ...ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS,
  secrets: ENGAGEMENT_MAIL_SECRETS
};
const PORTAL_ACCESS_REQUEST_OPTIONS = {
  ...CALLABLE_OPTIONS,
  secrets: ENGAGEMENT_MAIL_SECRETS,
  timeoutSeconds: 30,
  // Active uniquement apres observation des metriques App Check en production.
  enforceAppCheck: LIVEPALMES_ENFORCE_APP_CHECK
};
const ENGAGEMENT_CLOSURE_SCHEDULER_OPTIONS = {
  region: REGION,
  schedule: ENVIRONMENT.sportingDataSource === "nap" ? "0 * * * *" : "*/5 * * * *",
  timeZone: "Europe/Paris",
  timeoutSeconds: 540,
  memory: "1GiB",
  secrets: ENVIRONMENT.sportingDataSource === "nap" ? [defineSecret("LIVEPALMES_NAP_PASSWORD"), ...ENGAGEMENT_NOTIFICATION_MAIL_SECRETS] : ENGAGEMENT_NOTIFICATION_MAIL_SECRETS
};
const MIGRATION_CALLABLE_OPTIONS = { region: REGION, invoker: "public", timeoutSeconds: 540, memory: "1GiB" };
const PUBLIC_PERFORMANCE_CALLABLE_OPTIONS = { region: REGION, invoker: "public", timeoutSeconds: 120, memory: "1GiB" };
const PERFORMANCE_PUBLICATION_JOB_OPTIONS = {
  region: REGION,
  document: "performancePublicationJobs/{jobId}",
  retry: true,
  timeoutSeconds: 540,
  memory: "1GiB"
};
const PERFORMANCE_PUBLICATION_SCHEDULER_OPTIONS = {
  region: REGION,
  schedule: "*/5 * * * *",
  timeZone: "Europe/Paris",
  timeoutSeconds: 540,
  memory: "1GiB"
};
const COMPETITION_IMPORT_CALLABLE_OPTIONS = { ...PUBLIC_PERFORMANCE_CALLABLE_OPTIONS,
  ...(ENVIRONMENT.sportingDataSource === "nap"?{secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD")],maxInstances:2,concurrency:4}: {}) };
const PUBLIC_RESULT_TRIGGER_OPTIONS = {
  region: REGION,
  document: "competitions/{competitionId}/results/{resultId}",
  retry: true
};
const PIN_MAX_FAILED_ATTEMPTS = 5;
const PIN_LOCK_MS_BY_LEVEL = [2 * 60 * 1000, 5 * 60 * 1000];
const AUDIT_LEGACY_VISIBLE_SINCE = "2026-08-12T00:00:00.000Z";
const AUDIT_PAGE_LIMIT = 50;
const AUDIT_ACTOR_RESOLUTION_LIMIT = 25;
const AUDIT_COMPETITION_RESOLUTION_LIMIT = 25;
const AUDIT_PERSON_RESOLUTION_LIMIT = 25;
const PUBLIC_PERFORMANCE_BUCKET = ENVIRONMENT.publicBucket;
const LIVEPALMES_STORAGE_BUCKET = ENVIRONMENT.firebaseStorageBucket;
const ENGAGEMENT_CLOSURE_BATCH_LIMIT = 5;
const PUBLIC_ADDITIONAL_PERFORMANCE_PATH = "performance-public/additional-data.json";
const PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN = "4a78ebdf-07b8-4f05-8d8c-0c6231a7ad5d";
const PUBLIC_PERFORMANCE_FILES_PATH = "performance-public-firestore";
const PUBLIC_COMPETITION_PDF_PREFIX = "competition-pdfs";
const ENGAGEMENT_PDF_LOGO_PATH = path.join(__dirname, "assets", "logo-ffessm-nage-avec-palmes.png");
const PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT = 100;
const MAX_COMPETITION_IMPORT_PERFORMANCES = 5000;
const PERFORMANCE_BASE_COLLECTION = "performances";
const PERFORMANCE_BASE_CHANGES_COLLECTION = "performanceChanges";
const PERFORMANCE_BASE_MIGRATION_COLLECTION = "performanceMigrationJobs";
const PERFORMANCE_PUBLICATION_JOBS_COLLECTION = "performancePublicationJobs";
const PERFORMANCE_SWIMMERS_COLLECTION = "performanceSwimmerIndex";
const PERFORMANCE_SWIMMER_PAGES_COLLECTION = "performanceSwimmerPages";
const PERFORMANCE_SWIMMER_INDEX_STATE_COLLECTION = "performanceSwimmerIndexState";
const PERFORMANCE_TOP_BUCKETS_COLLECTION = "performanceTopViews";
const PERFORMANCE_TOP_INDEX_STATE_COLLECTION = "performanceTopIndexState";
const ENGAGEMENT_CLUB_ROSTERS_COLLECTION = "engagementClubRosters";
const ENGAGEMENT_CLUBS_COLLECTION = "engagementClubs";
const ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION = "engagementPublicDirectories";
const ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION = "engagementCompetitionCalendars";
const ENGAGEMENT_CALENDAR_EVENTS_COLLECTION = "engagementCalendarEvents";
const ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION = "engagementCalendarEventCalendars";
const ENGAGEMENT_CONFIGURATION_COLLECTION = "engagementConfigurations";
const ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION = "engagementCompetitionEntrySummaries";
const ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION = "engagementClubCompetitionIndexes";
const ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION = "engagementCompetitionStatisticsCache";
const ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION = "engagementClubPeopleRosters";
const ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION = "engagementSwimmerLicenseNumbers";
const ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION = "engagementSwimmerChangeRequests";
const ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION = "engagementEntryTimeCaches";
const ENGAGEMENT_ENTRY_TIME_CACHE_VERSION = 4;
const ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX = "entry-documents";
const ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX = "competition-documents";
const ENGAGEMENT_MAIL_JOBS_COLLECTION = "engagementMailJobs";
const ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION = "engagementMailRecipientShards";
const ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION = "engagementMailRecipientIndexState";
const ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION = "engagementClubAdminDirectories";
const ACCESS_DIRECTORY_INDEX_STATE_COLLECTION = "accessDirectoryIndexState";
const ACCESS_DIRECTORY_INDEX_VERSION = 3;
const ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION = "accessDirectorySnapshots";
const ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION = "accessDirectorySnapshotState";
const ACCESS_DIRECTORY_SNAPSHOT_VERSION = 3;
const ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT = 32;
const ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT = 167;
const ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES = 800000;
const ENGAGEMENT_CLOSURE_QUEUE_COLLECTION = "engagementClosureQueue";
const ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID = "open-water-courses";
const ENGAGEMENT_OPEN_WATER_COURSE_LIMIT = 100;
const ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES = new Set(["SF", "BI", "SUP"]);
const ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES = [
  { id: "150-elimination-SF", distance: 150, discipline: "SF", label: "150 m élimination Surface", format: "elimination", active: true },
  { id: "150-elimination-BI", distance: 150, discipline: "BI", label: "150 m élimination Bi-palmes", format: "elimination", active: true },
  { id: "1000-SF", distance: 1000, discipline: "SF", label: "1000 m Surface", format: "standard", active: true },
  { id: "1000-BI", distance: 1000, discipline: "BI", label: "1000 m Bi-palmes", format: "standard", active: true },
  { id: "1000-SUP", distance: 1000, discipline: "SUP", label: "1000 m Support", format: "standard", active: true },
  { id: "3000-SF", distance: 3000, discipline: "SF", label: "3000 m Surface", format: "standard", active: true },
  { id: "3000-BI", distance: 3000, discipline: "BI", label: "3000 m Bi-palmes", format: "standard", active: true },
  { id: "3000-SUP", distance: 3000, discipline: "SUP", label: "3000 m Support", format: "standard", active: true },
  { id: "5000-SF", distance: 5000, discipline: "SF", label: "5000 m Surface", format: "standard", active: true },
  { id: "5000-BI", distance: 5000, discipline: "BI", label: "5000 m Bi-palmes", format: "standard", active: true },
  { id: "5000-SUP", distance: 5000, discipline: "SUP", label: "5000 m Support", format: "standard", active: true }
];
const PERFORMANCE_TOP_INDEX_LIMIT = 500;
const DTN_QUALIFICATION_CACHE_COLLECTION = "dtnQualificationViews";
const DTN_QUALIFICATION_CACHE_STATE_COLLECTION = "dtnQualificationViewState";
const DTN_QUALIFICATION_JOBS_COLLECTION = "dtnQualificationJobs";
const DTN_QUALIFICATION_CACHE_VERSION = 5;
const DTN_NEAR_MINIMUM_MAX_PERCENT = 5;
const DTN_LISTING_CACHE_VERSION = 3;
const DTN_QUALIFICATION_MAX_ROWS_PER_COURSE = 5000;
const DTN_QUALIFICATION_JOB_OPTIONS = {
  region: REGION,
  document: `${DTN_QUALIFICATION_JOBS_COLLECTION}/{jobId}`,
  timeoutSeconds: 540,
  memory: "1GiB"
};
const PORTAL_ACCESS_RATE_LIMIT_COLLECTION = "portalAccessRequestRateLimits";
const DTN_EDF_LIMOGES_COMPETITION_ID = "e40fe3129ffd5d76286774193a2855ed";
const DTN_EDF_COMPETITION_IDS_BY_SEASON = {
  2026: ["5039", "4978", "4979", DTN_EDF_LIMOGES_COMPETITION_ID]
};
const DTN_LISTING_SEASON_YEARS = new Set([2026]);
const PERFORMANCE_SWIMMER_PAGE_SIZE = 500;
const ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS = 5000;
const ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE = 250;
const ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT = 3;
const PERFORMANCE_PUBLIC_DATA_URL = `${ENVIRONMENT.hostingOrigin}/performances/public/data`;
const PERFORMANCE_BASE_MIGRATION_BATCH_SIZE = 2000;
const POOL_COURSES = ["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"];

function serverAccessService() {
  if (!serverAccessService.instance) serverAccessService.instance = require("./server-access-service").createAccessService({
    get cleanText() { return cleanText; },
    get ACCESS_CAPABILITIES() { return ACCESS_CAPABILITIES; },
    get ACCESS_CAPABILITY_SET() { return ACCESS_CAPABILITY_SET; },
    get ACCESS_DIRECTORY_INDEX_STATE_COLLECTION() { return ACCESS_DIRECTORY_INDEX_STATE_COLLECTION; },
    get ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION() { return ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION; },
    get ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION() { return ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION; },
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get CLUB_REFERENCE_BY_ID() { return CLUB_REFERENCE_BY_ID; },
    get CLUB_REFERENCE_REGION_LABELS() { return CLUB_REFERENCE_REGION_LABELS; },
    get COMPETITION_IDS() { return COMPETITION_IDS; },
    get ENGAGEMENT_CLUBS_COLLECTION() { return ENGAGEMENT_CLUBS_COLLECTION; },
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES() { return ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES; },
    get ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION() { return ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION; },
    get ENGAGEMENT_RELAY_CATEGORY_CODES() { return ENGAGEMENT_RELAY_CATEGORY_CODES; },
    get ENGAGEMENT_RELAY_MIXED_MODES() { return ENGAGEMENT_RELAY_MIXED_MODES; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FUNCTIONS_EMULATOR_ACTIVE() { return FUNCTIONS_EMULATOR_ACTIVE; },
    get HASH_BYTES() { return HASH_BYTES; },
    get HASH_ITERATIONS() { return HASH_ITERATIONS; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_NOTIFICATION_LINK_SECRET() { return LIVEPALMES_NOTIFICATION_LINK_SECRET; },
    get ROLE_SET() { return ROLE_SET; },
    get auth() { return auth; },
    get crypto() { return crypto; },
    get db() { return db; },
    get hasConsolePortalCapability() { return hasConsolePortalCapability; }
  });
  return serverAccessService.instance;
}

/* extracted-function: functions/server-access-service.js#portalReadStats */
function portalReadStats(input0, input1) {
  return serverAccessService().portalReadStats(...arguments);
}
const COURSE_META = {
  "50SF": ["50 m Surface", "50 SF", "SF", 50],
  "100SF": ["100 m Surface", "100 SF", "SF", 100],
  "200SF": ["200 m Surface", "200 SF", "SF", 200],
  "400SF": ["400 m Surface", "400 SF", "SF", 400],
  "800SF": ["800 m Surface", "800 SF", "SF", 800],
  "1500SF": ["1500 m Surface", "1500 SF", "SF", 1500],
  "50AP": ["50 m Apnee", "50 AP", "AP", 50],
  "100IS": ["100 m Immersion", "100 IS", "IS", 100],
  "200IS": ["200 m Immersion", "200 IS", "IS", 200],
  "400IS": ["400 m Immersion", "400 IS", "IS", 400],
  "50BI": ["50 m Bi-palmes", "50 BI", "BI", 50],
  "100BI": ["100 m Bi-palmes", "100 BI", "BI", 100],
  "200BI": ["200 m Bi-palmes", "200 BI", "BI", 200],
  "400BI": ["400 m Bi-palmes", "400 BI", "BI", 400]
};
const ENGAGEMENT_RELAY_EVENTS = [
  ["4X50SF", "4 x 50 m Surface", "4 x 50 SF", "SF", 50, 4, "mastersOnly"],
  ["4X100SF", "4 x 100 m Surface", "4 x 100 SF", "SF", 100, 4],
  ["4X200SF", "4 x 200 m Surface", "4 x 200 SF", "SF", 200, 4],
  ["4X100BI", "4 x 100 m Bi-palmes mixte", "4 x 100 BI", "BI", 100, 4, "required"],
  ["4X100SB", "4 x 100 m Surface/Bi-palmes mixte", "4 x 100 SB", "SB", 100, 4, "required"],
  ["OW4X1000SB", "4 x 1000 m Surface/Bi-palmes mixte", "4 x 1000 SB", "SB", 1000, 4, "required"]
];
const ENGAGEMENT_EVENT_DEFINITIONS = [
  ...["SF", "AP"].map(discipline => ({code: `25${discipline}`, type: "individual", label: `25 m ${discipline === "SF" ? "Surface" : "Apnee"}`, shortLabel: `25 ${discipline}`, discipline, distance: 25})),
  ...POOL_COURSES.map((code) => {
    const meta = COURSE_META[code] || [code, code, courseStyleFromCode(code), courseLengthFromCode(code)];
    return {
      code,
      type: "individual",
      label: meta[0],
      shortLabel: meta[1],
      discipline: meta[2],
      distance: meta[3]
    };
  }),
  ...ENGAGEMENT_RELAY_EVENTS.map(([code, label, shortLabel, discipline, distance, relayLegs, relayMixedRule]) => ({
    code,
    type: "relay",
    label,
    shortLabel,
    discipline,
    distance,
    relayLegs,
    ...(relayMixedRule ? { relayMixedRule } : {})
  }))
];
const ENGAGEMENT_EVENT_DEFINITION_BY_CODE = new Map(
  ENGAGEMENT_EVENT_DEFINITIONS.map((event) => [event.code, event])
);
const ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES = ["P", "B", "M", "C", "J", "S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"];
const ENGAGEMENT_RELAY_CATEGORY_CODES = ["P", "B", "M", "C", "J", "S", "R140", "R180", "R220", "R260"];
const ENGAGEMENT_RELAY_AGE_CATEGORY_RANK = {
  P: 0,
  B: 1,
  M: 2,
  C: 3,
  J: 4,
  S: 5
};
const ENGAGEMENT_CATEGORY_CODES = Array.from(new Set([
  ...ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES,
  ...ENGAGEMENT_RELAY_CATEGORY_CODES
]));
const ENGAGEMENT_CATEGORY_CODE_SET = new Set(ENGAGEMENT_CATEGORY_CODES);
const ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = {
  "50AP": new Set(["P", "B", "M"])
};
const ENGAGEMENT_RELAY_MIXED_MODES = new Set(["none", "masters", "required"]);
const ENGAGEMENT_PROGRAM_GENDER_MODES = new Set(["female", "male", "mixed"]);
const ENGAGEMENT_PROGRAM_PHASES = new Set(["direct", "heats", "final", "slowHeats", "fastHeat"]);

/* extracted-function: functions/server-access-service.js#engagementCategoryCodesForEvent */
function engagementCategoryCodesForEvent(input0) {
  return serverAccessService().engagementCategoryCodesForEvent(...arguments);
}

/* extracted-function: functions/server-access-service.js#normalizeEngagementEventCategoryRestrictions */
function normalizeEngagementEventCategoryRestrictions(input0) {
  return serverAccessService().normalizeEngagementEventCategoryRestrictions(...arguments);
}

/* extracted-function: functions/server-access-service.js#cleanEngagementRelayMixedMode */
function cleanEngagementRelayMixedMode() {
  return serverAccessService().cleanEngagementRelayMixedMode(...arguments);
}

const CATEGORY_LABELS = {
  F: {
    P: "Poussines",
    B: "Benjamines",
    M: "Minimes Femmes",
    C: "Cadettes",
    J: "Juniors Femmes",
    S: "Seniors Femmes",
    "M30+": "Femmes 30+",
    "M40+": "Femmes 40+",
    "M50+": "Femmes 50+",
    "M60+": "Femmes 60+",
    "M70+": "Femmes 70+",
    "M80+": "Femmes 80+"
  },
  M: {
    P: "Poussins",
    B: "Benjamins",
    M: "Minimes Hommes",
    C: "Cadets",
    J: "Juniors Hommes",
    S: "Seniors Hommes",
    "M30+": "Hommes 30+",
    "M40+": "Hommes 40+",
    "M50+": "Hommes 50+",
    "M60+": "Hommes 60+",
    "M70+": "Hommes 70+",
    "M80+": "Hommes 80+"
  }
};

function cleanText(value) {
  return String(value || "").trim();
}

/* extracted-function: functions/server-access-service.js#competitionEmailNotificationsEnabled */
function competitionEmailNotificationsEnabled() {
  return serverAccessService().competitionEmailNotificationsEnabled(...arguments);
}

/* extracted-function: functions/server-access-service.js#notificationPreferenceSecretValue */
function notificationPreferenceSecretValue() {
  return serverAccessService().notificationPreferenceSecretValue(...arguments);
}

/* extracted-function: functions/server-access-service.js#competitionNotificationPreferenceToken */
function competitionNotificationPreferenceToken() {
  return serverAccessService().competitionNotificationPreferenceToken(...arguments);
}

/* extracted-function: functions/server-access-service.js#validCompetitionNotificationPreferenceToken */
function validCompetitionNotificationPreferenceToken() {
  return serverAccessService().validCompetitionNotificationPreferenceToken(...arguments);
}

/* extracted-function: functions/server-access-service.js#competitionNotificationPreferenceUrl */
function competitionNotificationPreferenceUrl() {
  return serverAccessService().competitionNotificationPreferenceUrl(...arguments);
}

const CLUB_REFERENCE_BY_ID = new Map((Array.isArray(clubReference.clubs) ? clubReference.clubs : [])
  .map((club) => [cleanText(club?.[0]), {
    clubId: cleanText(club?.[0]),
    clubCode: cleanText(club?.[1]),
    clubName: cleanText(club?.[2]),
    regionId: cleanText(club?.[3]).slice(0, 80),
    federalNumber: cleanText(club?.[4]).slice(0, 24),
    city: cleanText(club?.[5]).slice(0, 100),
    postalCode: cleanText(club?.[6]).slice(0, 16),
    active: club?.[7] !== false,
    source: "intranap"
  }])
  .filter(([clubId]) => clubId));

const CLUB_REFERENCE_BY_FEDERAL_NUMBER = new Map(Array.from(CLUB_REFERENCE_BY_ID.values())
  .filter((club) => club.federalNumber)
  .map((club) => [club.federalNumber.toUpperCase(), club]));

const CLUB_REFERENCE_REGION_LABELS = {
  "1": "Grand Est",
  "2": "Nouvelle Aquitaine",
  "3": "Ile de France",
  "6": "Bretagne Pays de la Loire",
  "8": "Centre",
  "9": "Guadeloupe",
  "10": "Pyrénées Méditerranée Occitanie",
  "11": "Martinique Guyane",
  "12": "Corse",
  "13": "Hauts de France",
  "15": "Normandie",
  "16": "Sud",
  "17": "Auvergne Rhône Alpes",
  "18": "Réunion",
  "22": "Bourgogne Franche Comté"
};

/* extracted-function: functions/server-access-service.js#engagementClubRegionId */
function engagementClubRegionId() {
  return serverAccessService().engagementClubRegionId(...arguments);
}

/* extracted-function: functions/server-access-service.js#engagementClubCode */
function engagementClubCode(input0) {
  return serverAccessService().engagementClubCode(...arguments);
}

/* extracted-function: functions/server-access-service.js#engagementClubName */
function engagementClubName(input0) {
  return serverAccessService().engagementClubName(...arguments);
}

/* extracted-function: functions/server-access-service.js#engagementStoredClubItem */
function engagementStoredClubItem(input0) {
  return serverAccessService().engagementStoredClubItem(...arguments);
}

/* extracted-function: functions/server-access-service.js#publicEngagementClubItem */
function publicEngagementClubItem() {
  return serverAccessService().publicEngagementClubItem(...arguments);
}

/* extracted-function: functions/server-access-service.js#publicEngagementClubDirectoryRef */
function publicEngagementClubDirectoryRef() {
  return serverAccessService().publicEngagementClubDirectoryRef(...arguments);
}

/* extracted-function: functions/server-access-service.js#engagementClubsByIds */
async function engagementClubsByIds() {
  return serverAccessService().engagementClubsByIds(...arguments);
}

/* extracted-function: functions/server-access-service.js#engagementClubById */
async function engagementClubById(input0) {
  return serverAccessService().engagementClubById(...arguments);
}

/* extracted-function: functions/server-access-service.js#cleanFirestoreValue */
function cleanFirestoreValue(input0) {
  return serverAccessService().cleanFirestoreValue(...arguments);
}

/* extracted-function: functions/server-access-service.js#competitionIdFrom */
function competitionIdFrom() {
  return serverAccessService().competitionIdFrom(...arguments);
}

/* extracted-function: functions/server-access-service.js#assertAdmin */
function assertAdmin(input0) {
  return serverAccessService().assertAdmin(...arguments);
}

/* extracted-function: functions/server-access-service.js#assertCapability */
function assertCapability(input0, input1) {
  return serverAccessService().assertCapability(...arguments);
}

/* extracted-function: functions/server-access-service.js#assertLivePalmesAccess */
async function assertLivePalmesAccess(input0) {
  return serverAccessService().assertLivePalmesAccess(...arguments);
}

/* extracted-function: functions/server-access-service.js#normalizeEmail */
function normalizeEmail(input0) {
  return serverAccessService().normalizeEmail(...arguments);
}

/* extracted-function: functions/server-access-service.js#normalizedEngagementRegionKey */
function normalizedEngagementRegionKey(input0) {
  return serverAccessService().normalizedEngagementRegionKey(...arguments);
}

/* extracted-function: functions/server-access-service.js#engagementRegionsMatch */
function engagementRegionsMatch(input0, input1) {
  return serverAccessService().engagementRegionsMatch(...arguments);
}

/* extracted-function: functions/server-access-service.js#canonicalAccessDirectoryRegionId */
function canonicalAccessDirectoryRegionId(input0) {
  return serverAccessService().canonicalAccessDirectoryRegionId(...arguments);
}

/* extracted-function: functions/server-access-service.js#assertEmail */
function assertEmail(input0) {
  return serverAccessService().assertEmail(...arguments);
}

/* extracted-function: functions/server-access-service.js#cleanAccessProfile */
function cleanAccessProfile() {
  return serverAccessService().cleanAccessProfile(...arguments);
}

/* extracted-function: functions/server-access-service.js#capabilitiesMap */
function capabilitiesMap() {
  return serverAccessService().capabilitiesMap(...arguments);
}

/* extracted-function: functions/server-access-service.js#activeCapabilitiesFromMap */
function activeCapabilitiesFromMap() {
  return serverAccessService().activeCapabilitiesFromMap(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessDirectoryKeys */
function accessDirectoryKeys() {
  return serverAccessService().accessDirectoryKeys(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessDirectoryFilterKey */
function accessDirectoryFilterKey() {
  return serverAccessService().accessDirectoryFilterKey(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessDirectoryIndexStateRef */
function accessDirectoryIndexStateRef() {
  return serverAccessService().accessDirectoryIndexStateRef(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessDirectorySnapshotStateRef */
function accessDirectorySnapshotStateRef() {
  return serverAccessService().accessDirectorySnapshotStateRef(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessDirectorySnapshotDocumentId */
function accessDirectorySnapshotDocumentId() {
  return serverAccessService().accessDirectorySnapshotDocumentId(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessDirectorySnapshotRef */
function accessDirectorySnapshotRef() {
  return serverAccessService().accessDirectorySnapshotRef(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessDirectorySnapshotEntryKey */
function accessDirectorySnapshotEntryKey() {
  return serverAccessService().accessDirectorySnapshotEntryKey(...arguments);
}

/* extracted-function: functions/server-access-service.js#normalizedAccessScope */
function normalizedAccessScope() {
  return serverAccessService().normalizedAccessScope(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessScopeForCapability */
function accessScopeForCapability() {
  return serverAccessService().accessScopeForCapability(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessScopesMapFromProfile */
function accessScopesMapFromProfile() {
  return serverAccessService().accessScopesMapFromProfile(...arguments);
}

/* extracted-function: functions/server-access-service.js#hasEngagementsCapability */
function hasEngagementsCapability() {
  return serverAccessService().hasEngagementsCapability(...arguments);
}

/* extracted-function: functions/server-access-service.js#engagementAccessContext */
async function engagementAccessContext(input0) {
  return serverAccessService().engagementAccessContext(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessManagementContext */
async function accessManagementContext(input0) {
  return serverAccessService().accessManagementContext(...arguments);
}

/* extracted-function: functions/server-access-service.js#auditManagementContext */
async function auditManagementContext(input0) {
  return serverAccessService().auditManagementContext(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessUserRegionIdFromData */
function accessUserRegionIdFromData() {
  return serverAccessService().accessUserRegionIdFromData(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessUserVisibleToRegional */
function accessUserVisibleToRegional(input0) {
  return serverAccessService().accessUserVisibleToRegional(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessUserCanBeManagedByRegional */
function accessUserCanBeManagedByRegional(input0) {
  return serverAccessService().accessUserCanBeManagedByRegional(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessUserVisibleForAccessDirectory */
function accessUserVisibleForAccessDirectory(input0, input1) {
  return serverAccessService().accessUserVisibleForAccessDirectory(...arguments);
}

/* extracted-function: functions/server-access-service.js#assertRegionalAccessUserDeletionRequestAllowed */
function assertRegionalAccessUserDeletionRequestAllowed(input0) {
  return serverAccessService().assertRegionalAccessUserDeletionRequestAllowed(...arguments);
}

/* extracted-function: functions/server-access-service.js#engagementClubAccessContext */
async function engagementClubAccessContext(input0) {
  return serverAccessService().engagementClubAccessContext(...arguments);
}

/* extracted-function: functions/server-access-service.js#assertEngagementsAccess */
async function assertEngagementsAccess(input0) {
  return serverAccessService().assertEngagementsAccess(...arguments);
}

/* extracted-function: functions/server-access-service.js#displayNameFromProfile */
function displayNameFromProfile() {
  return serverAccessService().displayNameFromProfile(...arguments);
}

/* extracted-function: functions/server-access-service.js#accessUserDisplayName */
async function accessUserDisplayName(input0) {
  return serverAccessService().accessUserDisplayName(...arguments);
}

/* extracted-function: functions/server-access-service.js#userByEmailOrCreate */
async function userByEmailOrCreate(input0) {
  return serverAccessService().userByEmailOrCreate(...arguments);
}

/* extracted-function: functions/server-access-service.js#saveAccessUserProfile */
async function saveAccessUserProfile(input0, input1) {
  return serverAccessService().saveAccessUserProfile(...arguments);
}

/* extracted-function: functions/server-access-service.js#writeAuditLog */
async function writeAuditLog(input0, input1) {
  return serverAccessService().writeAuditLog(...arguments);
}

/* extracted-function: functions/server-access-service.js#writeAuditLogOnce */
async function writeAuditLogOnce(input0, input1) {
  return serverAccessService().writeAuditLogOnce(...arguments);
}

/* extracted-function: functions/server-access-service.js#writeAccessGrants */
async function writeAccessGrants(input0, input1, input2, input3, input4, input5) {
  return serverAccessService().writeAccessGrants(...arguments);
}

/* extracted-function: functions/server-access-service.js#assertRole */
function assertRole(input0) {
  return serverAccessService().assertRole(...arguments);
}

/* extracted-function: functions/server-access-service.js#assertPin */
function assertPin(input0) {
  return serverAccessService().assertPin(...arguments);
}

/* extracted-function: functions/server-access-service.js#pinHash */
function pinHash(input0, input1) {
  return serverAccessService().pinHash(...arguments);
}

/* extracted-function: functions/server-access-service.js#stableHash */
function stableHash(input0) {
  return serverAccessService().stableHash(...arguments);
}

function competitionImportParser() {
  if (!competitionImportParser.instance) competitionImportParser.instance = require("./competition-import-parser").createCompetitionImportParser({
    CATEGORY_LABELS,
    HttpsError,
    POOL_COURSES,
    ageCategoryFromDates,
    applyCompetitionImportTiming,
    cleanText,
    courseLengthFromCode,
    courseStyleFromCode,
    fallbackCategoryFromSource,
    ffessmBasTimingType,
    formatTimeValue,
    importSeasonYear,
    normalizeCategoryCode,
    normalizeCourseCode,
    normalizeImportToken,
    parseTimeValue,
    stableHash
  });
  return competitionImportParser.instance;
}

/* extracted-function: functions/competition-import-parser.js#cleanImportText */
function cleanImportText(input0) {
  return competitionImportParser().cleanImportText(...arguments);
}

function serverImportService() {
  if (!serverImportService.instance) serverImportService.instance = require("./server-import-service").createImportService({
    get courseLengthFromCode() { return courseLengthFromCode; },
    get courseStyleFromCode() { return courseStyleFromCode; },
    get swimmerIdentityKey() { return swimmerIdentityKey; },
    get normalizeIdentityText() { return normalizeIdentityText; },
    get COURSE_META() { return COURSE_META; },
    get ENGAGEMENT_LICENSE_SEASON_STATUSES() { return ENGAGEMENT_LICENSE_SEASON_STATUSES; },
    get ENGAGEMENT_LICENSE_VERIFICATION_STATUSES() { return ENGAGEMENT_LICENSE_VERIFICATION_STATUSES; },
    get HttpsError() { return HttpsError; },
    get POOL_COURSES() { return POOL_COURSES; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get competitionImportIdentity() { return competitionImportIdentity; },
    get crypto() { return crypto; },
    get db() { return db; },
    get importPublicationStatus() { return importPublicationStatus; },
    get intranapSwimmerLookup() { return intranapSwimmerLookup; },
    get intranapSwimmersReference() { return intranapSwimmersReference; },
    get sameCompetitionImport() { return sameCompetitionImport; },
    get stableHash() { return stableHash; }
  });
  return serverImportService.instance;
}

/* extracted-function: functions/server-import-service.js#normalizeImportToken */
function normalizeImportToken(input0) {
  return serverImportService().normalizeImportToken(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseFrenchDate */
function parseFrenchDate(input0) {
  return competitionImportParser().parseFrenchDate(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseImportDate */
function parseImportDate(input0) {
  return competitionImportParser().parseImportDate(...arguments);
}

/* extracted-function: functions/server-import-service.js#parseTimeValue */
function parseTimeValue(input0) {
  return serverImportService().parseTimeValue(...arguments);
}

/* extracted-function: functions/server-import-service.js#formatTimeValue */
function formatTimeValue(input0) {
  return serverImportService().formatTimeValue(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseIntermediateTimes */
function parseIntermediateTimes() {
  return competitionImportParser().parseIntermediateTimes(...arguments);
}

function courseStyleFromCode(course) {
  const match = cleanText(course).toUpperCase().match(/(?:SF|AP|IS|BI)$/);
  return match ? match[0] : "";
}

function courseLengthFromCode(course) {
  const match = cleanText(course).toUpperCase().match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

/* extracted-function: functions/server-import-service.js#normalizeCourseCode */
function normalizeCourseCode(input0) {
  return serverImportService().normalizeCourseCode(...arguments);
}

/* extracted-function: functions/server-import-service.js#normalizeCategoryCode */
function normalizeCategoryCode(input0) {
  return serverImportService().normalizeCategoryCode(...arguments);
}

function normalizeIdentityText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function swimmerIdentityKey(firstName, lastName, birthDate) {
  const first = normalizeIdentityText(firstName);
  const last = normalizeIdentityText(lastName);
  const birth = cleanText(birthDate);
  if (!first || !last || !birth) return "";
  return `${last}|${first}|${birth}`;
}

function canonicalSwimmerId(ids) {
  return ids
    .map((id) => cleanText(id))
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, "fr-FR", { numeric: true }))[0] || "";
}

/* extracted-function: functions/server-import-service.js#competitionYear */
function competitionYear(input0) {
  return serverImportService().competitionYear(...arguments);
}

/* extracted-function: functions/server-import-service.js#birthYear */
function birthYear(input0) {
  return serverImportService().birthYear(...arguments);
}

/* extracted-function: functions/server-import-service.js#ageCategoryFromDates */
function ageCategoryFromDates(input0, input1) {
  return serverImportService().ageCategoryFromDates(...arguments);
}

/* extracted-function: functions/server-import-service.js#performanceCategoryFromRow */
function performanceCategoryFromRow() {
  return serverImportService().performanceCategoryFromRow(...arguments);
}

/* extracted-function: functions/server-import-service.js#fallbackCategoryFromSource */
function fallbackCategoryFromSource(input0) {
  return serverImportService().fallbackCategoryFromSource(...arguments);
}

/* extracted-function: functions/server-import-service.js#importPerformanceCategory */
function importPerformanceCategory() {
  return serverImportService().importPerformanceCategory(...arguments);
}

/* extracted-function: functions/server-import-service.js#loadPerformanceRecordsData */
async function loadPerformanceRecordsData() {
  return serverImportService().loadPerformanceRecordsData(...arguments);
}

/* extracted-function: functions/server-import-service.js#recordReferenceRows */
function recordReferenceRows() {
  return serverImportService().recordReferenceRows(...arguments);
}

/* extracted-function: functions/server-import-service.js#recordReferenceKey */
function recordReferenceKey() {
  return serverImportService().recordReferenceKey(...arguments);
}

/* extracted-function: functions/server-import-service.js#recordReferenceMap */
function recordReferenceMap() {
  return serverImportService().recordReferenceMap(...arguments);
}

/* extracted-function: functions/server-import-service.js#recordReferenceForPerformance */
function recordReferenceForPerformance(input0, input1, input2, input3) {
  return serverImportService().recordReferenceForPerformance(...arguments);
}

/* extracted-function: functions/server-import-service.js#engagementRelayReferenceCourseCode */
function engagementRelayReferenceCourseCode(input0) {
  return serverImportService().engagementRelayReferenceCourseCode(...arguments);
}

/* extracted-function: functions/server-import-service.js#engagementRelayReferenceRows */
function engagementRelayReferenceRows() {
  return serverImportService().engagementRelayReferenceRows(...arguments);
}

/* extracted-function: functions/server-import-service.js#engagementRelayReferenceKey */
function engagementRelayReferenceKey() {
  return serverImportService().engagementRelayReferenceKey(...arguments);
}

/* extracted-function: functions/server-import-service.js#engagementRelayReferenceMap */
function engagementRelayReferenceMap() {
  return serverImportService().engagementRelayReferenceMap(...arguments);
}

/* extracted-function: functions/server-import-service.js#engagementRelayReferenceForEntry */
function engagementRelayReferenceForEntry(input0, input1) {
  return serverImportService().engagementRelayReferenceForEntry(...arguments);
}

/* extracted-function: functions/server-import-service.js#isYouthCategory */
function isYouthCategory(input0) {
  return serverImportService().isYouthCategory(...arguments);
}

/* extracted-function: functions/server-import-service.js#normalizedRecordAlertName */
function normalizedRecordAlertName(input0) {
  return serverImportService().normalizedRecordAlertName(...arguments);
}

/* extracted-function: functions/server-import-service.js#sameRecordAlertSwimmer */
function sameRecordAlertSwimmer(input0, input1) {
  return serverImportService().sameRecordAlertSwimmer(...arguments);
}

/* extracted-function: functions/server-import-service.js#isAlreadyPublishedRecordAlert */
function isAlreadyPublishedRecordAlert() {
  return serverImportService().isAlreadyPublishedRecordAlert(...arguments);
}

/* extracted-function: functions/server-import-service.js#buildRecordAlert */
function buildRecordAlert(input0, input1, input2) {
  return serverImportService().buildRecordAlert(...arguments);
}

/* extracted-function: functions/server-import-service.js#detectRecordAlerts */
function detectRecordAlerts() {
  return serverImportService().detectRecordAlerts(...arguments);
}

function buildIntranapSwimmerReference() {
  const byId = new Map();
  const byIdentity = new Map();
  const groupedByIdentity = new Map();
  intranapSwimmersReference.forEach((swimmer) => {
    const key = swimmerIdentityKey(swimmer.firstName, swimmer.lastName, swimmer.birthDate);
    if (!key) return;
    if (!groupedByIdentity.has(key)) groupedByIdentity.set(key, []);
    groupedByIdentity.get(key).push(swimmer);
  });
  groupedByIdentity.forEach((group, key) => {
    const canonicalId = canonicalSwimmerId(group.map((swimmer) => swimmer.id));
    const canonical = group.find((swimmer) => String(swimmer.id) === String(canonicalId)) || group[0];
    const merged = {
      ...canonical,
      id: String(canonicalId || canonical.id),
      identityKey: key,
      aliases: group.map((swimmer) => String(swimmer.id)).filter((id) => id && id !== String(canonicalId)),
      sourceIds: group.map((swimmer) => String(swimmer.id)).filter(Boolean)
    };
    byIdentity.set(key, merged);
    group.forEach((swimmer) => byId.set(String(swimmer.id), merged));
  });
  intranapSwimmersReference.forEach((swimmer) => {
    if (!byId.has(String(swimmer.id))) byId.set(String(swimmer.id), swimmer);
  });
  return { byId, byIdentity };
}

const intranapSwimmerLookup = buildIntranapSwimmerReference();

/* extracted-function: functions/server-import-service.js#resolveIntranapSwimmer */
function resolveIntranapSwimmer(input0, input1) {
  return serverImportService().resolveIntranapSwimmer(...arguments);
}

/* extracted-function: functions/server-import-service.js#competitionImportPreviewPerformance */
function competitionImportPreviewPerformance() {
  return serverImportService().competitionImportPreviewPerformance(...arguments);
}

/* extracted-function: functions/server-import-service.js#categoryCodeFromCategory */
function categoryCodeFromCategory(input0, input1) {
  return serverImportService().categoryCodeFromCategory(...arguments);
}

/* extracted-function: functions/server-import-service.js#coursePayload */
function coursePayload(input0) {
  return serverImportService().coursePayload(...arguments);
}

/* extracted-function: functions/server-import-service.js#importSeasonYear */
function importSeasonYear(input0) {
  return serverImportService().importSeasonYear(...arguments);
}

/* extracted-function: functions/server-import-service.js#currentEngagementSeasonInfo */
function currentEngagementSeasonInfo() {
  return serverImportService().currentEngagementSeasonInfo(...arguments);
}

/* extracted-function: functions/server-import-service.js#cleanEngagementLicenseVerificationStatus */
function cleanEngagementLicenseVerificationStatus(input0) {
  return serverImportService().cleanEngagementLicenseVerificationStatus(...arguments);
}

/* extracted-function: functions/server-import-service.js#cleanEngagementLicenseSeasonStatus */
function cleanEngagementLicenseSeasonStatus(input0) {
  return serverImportService().cleanEngagementLicenseSeasonStatus(...arguments);
}

/* extracted-function: functions/server-import-service.js#engagementLicenseSeasonState */
function engagementLicenseSeasonState() {
  return serverImportService().engagementLicenseSeasonState(...arguments);
}

/* extracted-function: functions/server-import-service.js#engagementSeasonEndYearFromIsoDate */
function engagementSeasonEndYearFromIsoDate() {
  return serverImportService().engagementSeasonEndYearFromIsoDate(...arguments);
}

/* extracted-function: functions/server-import-service.js#engagementSeasonBoundsFromEndYear */
function engagementSeasonBoundsFromEndYear(input0) {
  return serverImportService().engagementSeasonBoundsFromEndYear(...arguments);
}

/* extracted-function: functions/server-import-service.js#currentEngagementCategoryFromBirthDate */
function currentEngagementCategoryFromBirthDate(input0) {
  return serverImportService().currentEngagementCategoryFromBirthDate(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseFfessmTxtImport */
function parseFfessmTxtImport(input0) {
  return competitionImportParser().parseFfessmTxtImport(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#cleanWorkbookRows */
function cleanWorkbookRows(input0, input1) {
  return competitionImportParser().cleanWorkbookRows(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#cleanInternationalWorkbookPayload */
function cleanInternationalWorkbookPayload(input0) {
  return competitionImportParser().cleanInternationalWorkbookPayload(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#competitionValueFromRows */
function competitionValueFromRows(input0, input1) {
  return competitionImportParser().competitionValueFromRows(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#headerMapFromRow */
function headerMapFromRow() {
  return competitionImportParser().headerMapFromRow(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#requiredHeadersPresent */
function requiredHeadersPresent(input0, input1) {
  return competitionImportParser().requiredHeadersPresent(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#internationalHeaderRow */
function internationalHeaderRow(input0) {
  return competitionImportParser().internationalHeaderRow(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#cellByHeader */
function cellByHeader(input0, input1, input2) {
  return competitionImportParser().cellByHeader(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#normalizeInternationalCategory */
function normalizeInternationalCategory(input0) {
  return competitionImportParser().normalizeInternationalCategory(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseInternationalIntermediateTimes */
function parseInternationalIntermediateTimes(input0, input1) {
  return competitionImportParser().parseInternationalIntermediateTimes(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseInternationalWorkbookImport */
function parseInternationalWorkbookImport(input0) {
  return competitionImportParser().parseInternationalWorkbookImport(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseCompetitionImportPayload */
function parseCompetitionImportPayload() {
  return competitionImportParser().parseCompetitionImportPayload(...arguments);
}

/* extracted-function: functions/server-import-service.js#importDocumentId */
function importDocumentId() {
  return serverImportService().importDocumentId(...arguments);
}

/* extracted-function: functions/server-import-service.js#activeCompetitionImportData */
function activeCompetitionImportData() {
  return serverImportService().activeCompetitionImportData(...arguments);
}

/* extracted-function: functions/server-import-service.js#competitionImportExistingSummary */
function competitionImportExistingSummary(input0) {
  return serverImportService().competitionImportExistingSummary(...arguments);
}

/* extracted-function: functions/server-import-service.js#findExistingCompetitionImport */
async function findExistingCompetitionImport() {
  return serverImportService().findExistingCompetitionImport(...arguments);
}

/* extracted-function: functions/server-import-service.js#safeCompareHex */
function safeCompareHex(input0, input1) {
  return serverImportService().safeCompareHex(...arguments);
}

/* extracted-function: functions/server-import-service.js#roleUid */
function roleUid(input0, input1, input2) {
  return serverImportService().roleUid(...arguments);
}

/* extracted-function: functions/server-import-service.js#liveDataRef */
function liveDataRef(input0) {
  return serverImportService().liveDataRef(...arguments);
}

/* extracted-function: functions/server-import-service.js#rolePinsRef */
function rolePinsRef(input0) {
  return serverImportService().rolePinsRef(...arguments);
}

/* extracted-function: functions/server-import-service.js#pinAttemptRef */
function pinAttemptRef(input0, input1, input2, input3) {
  return serverImportService().pinAttemptRef(...arguments);
}

/* extracted-function: functions/server-import-service.js#consoleGrantRef */
function consoleGrantRef(input0, input1) {
  return serverImportService().consoleGrantRef(...arguments);
}

/* extracted-function: functions/server-import-service.js#lockRemainingSeconds */
function lockRemainingSeconds() {
  return serverImportService().lockRemainingSeconds(...arguments);
}

/* extracted-function: functions/server-import-service.js#lockMessage */
function lockMessage(input0) {
  return serverImportService().lockMessage(...arguments);
}

/* extracted-function: functions/server-import-service.js#assertPinAttemptAllowed */
async function assertPinAttemptAllowed(input0) {
  return serverImportService().assertPinAttemptAllowed(...arguments);
}

function serverConsoleService() {
  if (!serverConsoleService.instance) serverConsoleService.instance = require("./server-console-service").createConsoleService({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get HttpsError() { return HttpsError; },
    get PIN_LOCK_MS_BY_LEVEL() { return PIN_LOCK_MS_BY_LEVEL; },
    get PIN_MAX_FAILED_ATTEMPTS() { return PIN_MAX_FAILED_ATTEMPTS; },
    get cleanText() { return cleanText; },
    get consoleGrantRef() { return consoleGrantRef; },
    get db() { return db; },
    get hasConsolePortalCapability() { return hasConsolePortalCapability; },
    get liveDataRef() { return liveDataRef; },
    get lockMessage() { return lockMessage; },
    get lockRemainingSeconds() { return lockRemainingSeconds; },
    get stableHash() { return stableHash; }
  });
  return serverConsoleService.instance;
}

/* extracted-function: functions/server-console-service.js#recordFailedPinAttempt */
async function recordFailedPinAttempt(input0) {
  return serverConsoleService().recordFailedPinAttempt(...arguments);
}

/* extracted-function: functions/server-console-service.js#clearPinAttempts */
async function clearPinAttempts(input0) {
  return serverConsoleService().clearPinAttempts(...arguments);
}

/* extracted-function: functions/server-console-service.js#updatePublicPinNotes */
async function updatePublicPinNotes(input0, input1) {
  return serverConsoleService().updatePublicPinNotes(...arguments);
}

/* extracted-function: functions/server-console-service.js#assertConsolePortalAccess */
async function assertConsolePortalAccess(input0) {
  return serverConsoleService().assertConsolePortalAccess(...arguments);
}

/* extracted-function: functions/server-console-service.js#assertComputerPdfAccess */
async function assertComputerPdfAccess(input0, input1) {
  return serverConsoleService().assertComputerPdfAccess(...arguments);
}

exports.storeCompetitionPdf = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-performance-handlers.js#storeCompetitionPdf#arrow */ async (request) => {
  return portalPerformanceHandlers().storeCompetitionPdf(request);
});

exports.deleteCompetitionPdf = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-performance-handlers.js#deleteCompetitionPdf#arrow */ async (request) => {
  return portalPerformanceHandlers().deleteCompetitionPdf(request);
});

exports.syncOfficialResultToPublicIndex = onDocumentUpdated(PUBLIC_RESULT_TRIGGER_OPTIONS, async (event) => {
  const competitionId = cleanText(event.params?.competitionId);
  const resultId = cleanText(event.params?.resultId);
  if (!COMPETITION_IDS.has(competitionId) || !resultId || !event.data?.after?.exists) return;
  const officialResult = event.data.after.data() || {};
  const indexRef = db
    .collection("competitions")
    .doc(competitionId)
    .collection("public")
    .doc("resultsIndex");
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(indexRef);
    if (!snapshot.exists) return;
    const nextIndex = nextPublicResultsIndex(snapshot.data() || {}, resultId, officialResult);
    if (!nextIndex) return;
    transaction.update(indexRef, nextIndex);
  });
});

exports.setRolePins = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#setRolePins#arrow */ async (request) => {
  return portalAccessHandlers().setRolePins(request);
});

exports.verifyPin = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#verifyPin#arrow */ async (request) => {
  return portalAccessHandlers().verifyPin(request);
});

exports.createOrUpdateAccessUser = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#createOrUpdateAccessUser#arrow */ async (request) => {
  return portalAccessHandlers().createOrUpdateAccessUser(request);
});

function serverDirectoryService() {
  if (!serverDirectoryService.instance) serverDirectoryService.instance = require("./server-directory-service").createDirectoryService({
    get ACCESS_CAPABILITIES() { return ACCESS_CAPABILITIES; },
    get ACCESS_DIRECTORY_SNAPSHOT_VERSION() { return ACCESS_DIRECTORY_SNAPSHOT_VERSION; },
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get CLUB_REFERENCE_BY_FEDERAL_NUMBER() { return CLUB_REFERENCE_BY_FEDERAL_NUMBER; },
    get CLUB_REFERENCE_REGION_LABELS() { return CLUB_REFERENCE_REGION_LABELS; },
    get ENGAGEMENT_CLUBS_COLLECTION() { return ENGAGEMENT_CLUBS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get PORTAL_ACCESS_RATE_LIMIT_COLLECTION() { return PORTAL_ACCESS_RATE_LIMIT_COLLECTION; },
    get accessDirectorySnapshotEntryKey() { return accessDirectorySnapshotEntryKey; },
    get accessDirectorySnapshotRef() { return accessDirectorySnapshotRef; },
    get accessDirectorySnapshotStateRef() { return accessDirectorySnapshotStateRef; },
    get accessUserRegionIdFromData() { return accessUserRegionIdFromData; },
    get activeCapabilitiesFromMap() { return activeCapabilitiesFromMap; },
    get assertEmail() { return assertEmail; },
    get auth() { return auth; },
    get cleanClubPayload() { return cleanClubPayload; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessAcknowledgement() { return engagementAccessAcknowledgement; },
    get engagementAccessAdminNotification() { return engagementAccessAdminNotification; },
    get engagementAccessAdminNotificationRecipients() { return engagementAccessAdminNotificationRecipients; },
    get engagementAccessRejection() { return engagementAccessRejection; },
    get engagementActiveMailRecipients() { return engagementActiveMailRecipients; },
    get engagementClubCode() { return engagementClubCode; },
    get engagementClubName() { return engagementClubName; },
    get engagementClubRegionId() { return engagementClubRegionId; },
    get engagementExistingAccountNotice() { return engagementExistingAccountNotice; },
    get engagementMailRecipientFromUserDoc() { return engagementMailRecipientFromUserDoc; },
    get engagementMailRecipientIndexKey() { return engagementMailRecipientIndexKey; },
    get engagementMailRecipientShardNumber() { return engagementMailRecipientShardNumber; },
    get engagementMailRecipientShardRef() { return engagementMailRecipientShardRef; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get engagementStoredClubItem() { return engagementStoredClubItem; },
    get livePalmesMailHtml() { return livePalmesMailHtml; },
    get nextPortalAccessRateLimit() { return nextPortalAccessRateLimit; },
    get nodemailer() { return nodemailer; },
    get normalizeEmail() { return normalizeEmail; },
    get publicEngagementClubDirectoryRef() { return publicEngagementClubDirectoryRef; },
    get publicEngagementClubItem() { return publicEngagementClubItem; },
    get stableHash() { return stableHash; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return serverDirectoryService.instance;
}

/* extracted-function: functions/server-directory-service.js#cleanEngagementAccessRequestPayload */
function cleanEngagementAccessRequestPayload() {
  return serverDirectoryService().cleanEngagementAccessRequestPayload(...arguments);
}

/* extracted-function: functions/server-directory-service.js#engagementAccessRequestItem */
function engagementAccessRequestItem(input0) {
  return serverDirectoryService().engagementAccessRequestItem(...arguments);
}

/* extracted-function: functions/server-directory-service.js#assertEngagementAccessRequestScope */
function assertEngagementAccessRequestScope() {
  return serverDirectoryService().assertEngagementAccessRequestScope(...arguments);
}

/* extracted-function: functions/server-directory-service.js#engagementAccessExistingClubPayload */
function engagementAccessExistingClubPayload() {
  return serverDirectoryService().engagementAccessExistingClubPayload(...arguments);
}

/* extracted-function: functions/server-directory-service.js#findEngagementClubByFederalNumber */
async function findEngagementClubByFederalNumber() {
  return serverDirectoryService().findEngagementClubByFederalNumber(...arguments);
}

/* extracted-function: functions/server-directory-service.js#resolveExistingClubForAccessRequest */
async function resolveExistingClubForAccessRequest() {
  return serverDirectoryService().resolveExistingClubForAccessRequest(...arguments);
}

/* extracted-function: functions/server-directory-service.js#createClubFromEngagementAccessRequest */
async function createClubFromEngagementAccessRequest() {
  return serverDirectoryService().createClubFromEngagementAccessRequest(...arguments);
}

/* extracted-function: functions/server-directory-service.js#sendEngagementAccessAcknowledgement */
async function sendEngagementAccessAcknowledgement() {
  return serverDirectoryService().sendEngagementAccessAcknowledgement(...arguments);
}

/* extracted-function: functions/server-directory-service.js#sendEngagementAccessRejection */
async function sendEngagementAccessRejection() {
  return serverDirectoryService().sendEngagementAccessRejection(...arguments);
}

/* extracted-function: functions/server-directory-service.js#sendEngagementExistingAccountNotice */
async function sendEngagementExistingAccountNotice() {
  return serverDirectoryService().sendEngagementExistingAccountNotice(...arguments);
}

/* extracted-function: functions/server-directory-service.js#engagementExistingAccessAccount */
async function engagementExistingAccessAccount() {
  return serverDirectoryService().engagementExistingAccessAccount(...arguments);
}

/* extracted-function: functions/server-directory-service.js#consumePublicAccessRequestRateLimit */
async function consumePublicAccessRequestRateLimit() {
  return serverDirectoryService().consumePublicAccessRequestRateLimit(...arguments);
}

/* extracted-function: functions/server-directory-service.js#sendEngagementAccessAdminNotifications */
async function sendEngagementAccessAdminNotifications() {
  return serverDirectoryService().sendEngagementAccessAdminNotifications(...arguments);
}

exports.submitEngagementAccessRequest = onCall({ ...PORTAL_ACCESS_REQUEST_OPTIONS, secrets: ENVIRONMENT.sportingDataSource === "nap" ? [...ENGAGEMENT_MAIL_SECRETS, defineSecret("LIVEPALMES_NAP_PASSWORD") ] : ENGAGEMENT_MAIL_SECRETS }, async (request) => {
  const uid = cleanText(request.auth?.uid);
  if (cleanText(request.data?.website)) {
    throw new HttpsError("invalid-argument", "Demande invalide.");
  }
  let payload = cleanEngagementAccessRequestPayload(request.data || {}, request);
  const now = new Date().toISOString();
  await consumePublicAccessRequestRateLimit(request, now);
  try { payload = await resolveExistingClubForAccessRequest(payload); }
  catch (error) { throw new HttpsError(error instanceof TypeError ? "failed-precondition" : "unavailable", error instanceof TypeError ? error.message : "Annuaire NAP indisponible. Reessayez."); }
  const existingAccount = await engagementExistingAccessAccount(payload.email);
  if (existingAccount) {
    const guidanceEmail = await sendEngagementExistingAccountNotice(existingAccount);
    await writeAuditLog("engagementAccessRequest.redirectedExistingAccount", uid || "public-login-page", {
      email: payload.email,
      guidanceEmailStatus: guidanceEmail.status
    });
    return {
      ok: true,
      request: null,
      existingAccount: true,
      guidanceEmailSent: guidanceEmail.status === "sent"
    };
  }
  const requestClubKey = payload.clubId || payload.newClub?.federalNumber || "new-club";
  const requestId = stableHash(`${payload.email}|${requestClubKey}|engagements.club.manage`).slice(0, 40);
  const ref = db.collection("engagementAccessRequests").doc(requestId);
  const savedPayload = {
    ...payload,
    status: "pending",
    requestedBy: uid || "public-login-page",
    requestedByEmail: cleanText(request.auth?.token?.email || payload.email).slice(0, 180),
    requestSource: uid ? "authenticated-portal" : "login-page",
    requestedAt: now,
    updatedAt: now,
    updatedBy: uid || "public-login-page"
  };
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists && snapshot.data()?.status === "pending") {
      throw new HttpsError("already-exists", "Une demande est deja en attente pour cet email et ce club.");
    }
    transaction.set(ref, savedPayload, { merge: true });
  });
  await writeAuditLog("engagementAccessRequest.submitted", uid || "public-login-page", {
    requestId,
    email: payload.email,
    clubId: payload.clubId,
    regionId: payload.regionId
  });
  const acknowledgementEmail = await sendEngagementAccessAcknowledgement(payload);
  const adminNotification = await sendEngagementAccessAdminNotifications(payload);
  await ref.set({
    acknowledgementEmail,
    adminNotification,
    updatedAt: new Date().toISOString()
  }, { merge: true }).catch((error) => {
    console.error(
      "Statut des notifications de demande d'acces non enregistre.",
      cleanText(error?.code || error?.name || "firestore-error").slice(0, 80)
    );
  });
  return {
    ok: true,
    request: engagementAccessRequestItem({ id: requestId, data: () => savedPayload }),
    acknowledgementEmailSent: acknowledgementEmail.status === "sent",
    adminNotificationStatus: adminNotification.status
  };
});

exports.listEngagementAccessRequests = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-competition-handlers.js#listEngagementAccessRequests#arrow */ async (request) => {
  return portalCompetitionHandlers().listEngagementAccessRequests(request);
});

exports.resolveEngagementAccessRequest = onCall({ ...PORTAL_ACCESS_REQUEST_OPTIONS, secrets: ENVIRONMENT.sportingDataSource === "nap" ? [...ENGAGEMENT_MAIL_SECRETS, defineSecret("LIVEPALMES_NAP_PASSWORD") ] : ENGAGEMENT_MAIL_SECRETS }, async (request) => {
  const context = await engagementAccessContext(request);
  const requestId = cleanText(request.data?.requestId).slice(0, 80);
  const decision = cleanText(request.data?.decision);
  const resolutionReason = cleanText(request.data?.resolutionReason).slice(0, 600);
  if (!requestId) {
    throw new HttpsError("invalid-argument", "Demande requise.");
  }
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Decision invalide.");
  }
  if (decision === "rejected" && !resolutionReason) {
    throw new HttpsError("invalid-argument", "Le motif du refus est obligatoire.");
  }
  const ref = db.collection("engagementAccessRequests").doc(requestId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Demande introuvable.");
  }
  const data = snapshot.data() || {};
  if (data.status !== "pending") {
    throw new HttpsError("failed-precondition", "Demande deja traitee.");
  }
  assertEngagementAccessRequestScope(context, data);
  const now = new Date().toISOString();
  let accessResult = null;
  let clubCreationResult = null;
  let resolvedData = data;
  if (decision === "approved") {
    resolvedData = {
      ...data,
      ...cleanEngagementAccessRequestPayload({
        ...data,
        ...(request.data?.correctedRequest && typeof request.data.correctedRequest === "object" ? request.data.correctedRequest : {})
      }, request)
    };
    assertEngagementAccessRequestScope(context, resolvedData);
    const existingAccount = await engagementExistingAccessAccount(resolvedData.email);
    if (existingAccount) {
      throw new HttpsError(
        "already-exists",
        "Cette adresse possede deja un compte LivePalmes. Utilisez la gestion des comptes pour modifier son club sans remplacer ses droits."
      );
    }
    if (resolvedData.newClubRequested === true) {
      if (!context.national) {
        throw new HttpsError("permission-denied", "La creation d'un club est reservee au niveau national.");
      }
      try { clubCreationResult = await createClubFromEngagementAccessRequest(resolvedData, context.uid, requestId); }
      catch (error) { if (error instanceof HttpsError) throw error; throw new HttpsError(error instanceof TypeError ? "failed-precondition" : "unavailable", error instanceof TypeError ? error.message : "Creation du club a verifier. Reprenez la meme demande ; sauvegarde conservee."); }
      resolvedData = {
        ...resolvedData,
        ...engagementAccessExistingClubPayload(clubCreationResult.club)
      };
    }
    const profile = cleanAccessProfile({
      firstName: resolvedData.firstName,
      lastName: resolvedData.lastName,
      email: resolvedData.email,
      clubId: resolvedData.clubId,
      clubName: resolvedData.clubName,
      regionId: resolvedData.regionId,
      licenseNumber: resolvedData.licenseNumber,
      capabilities: ["engagements.club.manage"]
    });
    accessResult = await saveAccessUserProfile(profile, context.uid);
  }
  await ref.set({
    ...(decision === "approved" ? {
      email: resolvedData.email,
      firstName: resolvedData.firstName,
      lastName: resolvedData.lastName,
      clubId: resolvedData.clubId,
      clubName: resolvedData.clubName,
      regionId: resolvedData.regionId,
      licenseNumber: resolvedData.licenseNumber,
      ...(clubCreationResult ? {
        requestedNewClub: true,
        createdClubId: cleanText(clubCreationResult.club?.clubId).slice(0, 40),
        newClubCreated: clubCreationResult.created === true
      } : {})
    } : {}),
    ...(decision === "rejected" ? { resolutionReason } : {}),
    status: decision,
    resolvedAt: now,
    resolvedBy: context.uid,
    resolvedByEmail: context.email,
    updatedAt: now,
    updatedBy: context.uid,
    ...(accessResult ? { accessUid: accessResult.uid } : {})
  }, { merge: true });
  await writeAuditLog("engagementAccessRequest.resolved", context.uid, {
    requestId,
    decision,
    email: cleanText(resolvedData.email).slice(0, 180),
    clubId: cleanText(resolvedData.clubId).slice(0, 40),
    regionId: cleanText(resolvedData.regionId).slice(0, 80),
    corrected: decision === "approved" && JSON.stringify(resolvedData) !== JSON.stringify(data),
    accessUid: accessResult?.uid || "",
    resolutionReason: decision === "rejected" ? resolutionReason : "",
    createdClubId: cleanText(clubCreationResult?.club?.clubId).slice(0, 40)
  });
  let resolutionNotification = null;
  if (decision === "rejected") {
    resolutionNotification = await sendEngagementAccessRejection({ ...data, resolutionReason });
    await ref.set({ resolutionNotification, updatedAt: new Date().toISOString() }, { merge: true }).catch((error) => {
      console.error(
        "Statut de notification du refus non enregistre.",
        cleanText(error?.code || error?.name || "firestore-error").slice(0, 80)
      );
    });
  }
  const updated = await ref.get();
  return {
    ok: true,
    request: engagementAccessRequestItem(updated),
    access: accessResult,
    club: clubCreationResult?.club ? publicEngagementClubItem(clubCreationResult.club) : null,
    resolutionNotification
  };
});

/* extracted-function: functions/server-directory-service.js#accessUserListItemFromData */
function accessUserListItemFromData(input0) {
  return serverDirectoryService().accessUserListItemFromData(...arguments);
}

/* extracted-function: functions/server-directory-service.js#accessUserListItem */
function accessUserListItem(input0) {
  return serverDirectoryService().accessUserListItem(...arguments);
}

/* extracted-function: functions/server-directory-service.js#accessDirectorySnapshotEntry */
function accessDirectorySnapshotEntry(input0) {
  return serverDirectoryService().accessDirectorySnapshotEntry(...arguments);
}

/* extracted-function: functions/server-directory-service.js#accessDirectorySnapshotRegionId */
function accessDirectorySnapshotRegionId() {
  return serverDirectoryService().accessDirectorySnapshotRegionId(...arguments);
}

/* extracted-function: functions/server-directory-service.js#sameAccessDirectorySnapshotEntry */
function sameAccessDirectorySnapshotEntry(input0, input1) {
  return serverDirectoryService().sameAccessDirectorySnapshotEntry(...arguments);
}

/* extracted-function: functions/server-directory-service.js#mergeAccessDirectorySnapshotEntries */
function mergeAccessDirectorySnapshotEntries(input0, input1, input2, input3, input4) {
  return serverDirectoryService().mergeAccessDirectorySnapshotEntries(...arguments);
}

/* extracted-function: functions/server-directory-service.js#syncAccessDirectorySnapshotFromUserChange */
async function syncAccessDirectorySnapshotFromUserChange(input0, input1, input2, input3) {
  return serverDirectoryService().syncAccessDirectorySnapshotFromUserChange(...arguments);
}

/* extracted-function: functions/server-directory-service.js#accessUserDeletionRequestItem */
function accessUserDeletionRequestItem(input0) {
  return serverDirectoryService().accessUserDeletionRequestItem(...arguments);
}

/* extracted-function: functions/server-directory-service.js#accessUserMatchesFilters */
function accessUserMatchesFilters(input0, input1, input2) {
  return serverDirectoryService().accessUserMatchesFilters(...arguments);
}

/* extracted-function: functions/server-directory-service.js#normalizedDirectoryText */
function normalizedDirectoryText(input0) {
  return serverDirectoryService().normalizedDirectoryText(...arguments);
}

/* extracted-function: functions/server-directory-service.js#accessUserContainsSearch */
function accessUserContainsSearch(input0, input1) {
  return serverDirectoryService().accessUserContainsSearch(...arguments);
}

/* extracted-function: functions/server-directory-service.js#searchAccessUserDocuments */
async function searchAccessUserDocuments(input0, input1) {
  return serverDirectoryService().searchAccessUserDocuments(...arguments);
}

exports.rebuildAccessDirectoryIndexNextPage = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#rebuildAccessDirectoryIndexNextPage#arrow */ async (request) => {
  return portalAccessHandlers().rebuildAccessDirectoryIndexNextPage(request);
});

exports.rebuildAccessDirectorySnapshotNextPage = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#rebuildAccessDirectorySnapshotNextPage#arrow */ async (request) => {
  return portalAccessHandlers().rebuildAccessDirectorySnapshotNextPage(request);
});

exports.listAccessUsers = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#listAccessUsers#arrow */ async (request) => {
  return portalAccessHandlers().listAccessUsers(request);
});

exports.setAccessUserStatus = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#setAccessUserStatus#arrow */ async (request) => {
  return portalAccessHandlers().setAccessUserStatus(request);
});

/* extracted-function: functions/server-directory-service.js#deleteAccessUserAccount */
async function deleteAccessUserAccount(input0, input1) {
  return serverDirectoryService().deleteAccessUserAccount(...arguments);
}

exports.deleteAccessUser = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#deleteAccessUser#arrow */ async (request) => {
  return portalAccessHandlers().deleteAccessUser(request);
});

exports.requestAccessUserDeletion = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#requestAccessUserDeletion#arrow */ async (request) => {
  return portalAccessHandlers().requestAccessUserDeletion(request);
});

exports.listAccessUserDeletionRequests = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#listAccessUserDeletionRequests#arrow */ async (request) => {
  return portalAccessHandlers().listAccessUserDeletionRequests(request);
});

exports.resolveAccessUserDeletionRequest = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#resolveAccessUserDeletionRequest#arrow */ async (request) => {
  return portalAccessHandlers().resolveAccessUserDeletionRequest(request);
});

exports.updateCurrentAccountEmail = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#updateCurrentAccountEmail#arrow */ async (request) => {
  return portalAccessHandlers().updateCurrentAccountEmail(request);
});

/* extracted-function: functions/server-directory-service.js#setCompetitionEmailNotificationPreference */
async function setCompetitionEmailNotificationPreference() {
  return serverDirectoryService().setCompetitionEmailNotificationPreference(...arguments);
}

exports.updateCurrentEmailNotificationPreferences = onCall(CALLABLE_OPTIONS, async (request) => {
  await assertLivePalmesAccess(request);
  const uid = cleanText(request.auth?.uid);
  const result = await setCompetitionEmailNotificationPreference(
    uid,
    request.data?.competitionNotifications === true,
    "portal"
  );
  return { ok: true, competitionNotificationsEnabled: result.enabled, updatedAt: result.updatedAt };
});

exports.disableCompetitionEmailNotifications = onCall(NOTIFICATION_PREFERENCE_CALLABLE_OPTIONS, async (request) => {
  const uid = cleanText(request.data?.uid).slice(0, 128);
  const token = cleanText(request.data?.token).slice(0, 180);
  if (!validCompetitionNotificationPreferenceToken(uid, token)) {
    throw new HttpsError("permission-denied", "Lien de désinscription invalide.");
  }
  const result = await setCompetitionEmailNotificationPreference(uid, false, "email_link");
  return { ok: true, competitionNotificationsEnabled: result.enabled, updatedAt: result.updatedAt };
});

exports.getCurrentAccessUser = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-access-handlers.js#getCurrentAccessUser#arrow */ async (request) => {
  return portalAccessHandlers().getCurrentAccessUser(request);
});

function serverCompetitionModelService() {
  if (!serverCompetitionModelService.instance) serverCompetitionModelService.instance = require("./server-competition-model-service").createCompetitionModelService({
    get ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION() { return ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION; },
    get ENGAGEMENT_CATEGORY_CODE_SET() { return ENGAGEMENT_CATEGORY_CODE_SET; },
    get ENGAGEMENT_CLOSURE_QUEUE_COLLECTION() { return ENGAGEMENT_CLOSURE_QUEUE_COLLECTION; },
    get ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION() { return ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION; },
    get ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION() { return ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION; },
    get ENGAGEMENT_COMPETITION_LEVELS() { return ENGAGEMENT_COMPETITION_LEVELS; },
    get ENGAGEMENT_COMPETITION_TYPES() { return ENGAGEMENT_COMPETITION_TYPES; },
    get ENGAGEMENT_CONFIGURATION_COLLECTION() { return ENGAGEMENT_CONFIGURATION_COLLECTION; },
    get ENGAGEMENT_ENTRY_STATUSES() { return ENGAGEMENT_ENTRY_STATUSES; },
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get ENGAGEMENT_MISSING_ENTRY_TIME_MODES() { return ENGAGEMENT_MISSING_ENTRY_TIME_MODES; },
    get ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID() { return ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID; },
    get ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES() { return ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES; },
    get ENGAGEMENT_OPEN_WATER_COURSE_LIMIT() { return ENGAGEMENT_OPEN_WATER_COURSE_LIMIT; },
    get ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES() { return ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES; },
    get ENGAGEMENT_POOL_LENGTHS() { return ENGAGEMENT_POOL_LENGTHS; },
    get ENGAGEMENT_PROGRAM_GENDER_MODES() { return ENGAGEMENT_PROGRAM_GENDER_MODES; },
    get ENGAGEMENT_PROGRAM_PHASES() { return ENGAGEMENT_PROGRAM_PHASES; },
    get ENGAGEMENT_QUALIFICATION_TIME_MODES() { return ENGAGEMENT_QUALIFICATION_TIME_MODES; },
    get ENGAGEMENT_TIMING_TYPES() { return ENGAGEMENT_TIMING_TYPES; },
    get ENGAGEMENT_WATER_BODY_TYPES() { return ENGAGEMENT_WATER_BODY_TYPES; },
    get FieldPath() { return FieldPath; },
    get HttpsError() { return HttpsError; },
    get PUBLIC_CALENDAR_EVENT_TYPES() { return PUBLIC_CALENDAR_EVENT_TYPES; },
    get cleanCompetitionDocuments() { return cleanCompetitionDocuments; },
    get cleanEngagementGeneratedFiles() { return cleanEngagementGeneratedFiles; },
    get cleanEngagementRegionIds() { return cleanEngagementRegionIds; },
    get cleanEngagementRelayMixedMode() { return cleanEngagementRelayMixedMode; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDateTime() { return cleanIsoDateTime; },
    get cleanPublicCalendarEventType() { return cleanPublicCalendarEventType; },
    get cleanPublicCalendarLevel() { return cleanPublicCalendarLevel; },
    get cleanPublicCalendarProgram() { return cleanPublicCalendarProgram; },
    get cleanPublicCalendarPublicationStatus() { return cleanPublicCalendarPublicationStatus; },
    get cleanPublicCalendarUrl() { return cleanPublicCalendarUrl; },
    get cleanPublicCalendarWhatsAppUrl() { return cleanPublicCalendarWhatsAppUrl; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementCategoryCodesForEvent() { return engagementCategoryCodesForEvent; },
    get engagementCompetitionDocumentsMetadata() { return engagementCompetitionDocumentsMetadata; },
    get normalizeEmail() { return normalizeEmail; },
    get normalizeEngagementEventCategoryRestrictions() { return normalizeEngagementEventCategoryRestrictions; },
    get stableHash() { return stableHash; }
  });
  return serverCompetitionModelService.instance;
}

/* extracted-function: functions/server-competition-model-service.js#cleanIsoDate */
function cleanIsoDate(input0) {
  return serverCompetitionModelService().cleanIsoDate(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementCompetitionLevel */
function cleanEngagementCompetitionLevel(input0) {
  return serverCompetitionModelService().cleanEngagementCompetitionLevel(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#isNationalOnlyEngagementCompetitionLevel */
function isNationalOnlyEngagementCompetitionLevel(input0) {
  return serverCompetitionModelService().isNationalOnlyEngagementCompetitionLevel(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementEntryStatus */
function cleanEngagementEntryStatus(input0) {
  return serverCompetitionModelService().cleanEngagementEntryStatus(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementCompetitionType */
function cleanEngagementCompetitionType(input0) {
  return serverCompetitionModelService().cleanEngagementCompetitionType(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementWaterBodyType */
function cleanEngagementWaterBodyType(input0) {
  return serverCompetitionModelService().cleanEngagementWaterBodyType(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementOpenWaterCourse */
function cleanEngagementOpenWaterCourse() {
  return serverCompetitionModelService().cleanEngagementOpenWaterCourse(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementOpenWaterCourses */
function cleanEngagementOpenWaterCourses() {
  return serverCompetitionModelService().cleanEngagementOpenWaterCourses(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementOpenWaterCourseConfigRef */
function engagementOpenWaterCourseConfigRef() {
  return serverCompetitionModelService().engagementOpenWaterCourseConfigRef(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementOpenWaterEventDefinition */
function engagementOpenWaterEventDefinition() {
  return serverCompetitionModelService().engagementOpenWaterEventDefinition(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanOptionalEmail */
function cleanOptionalEmail(input0) {
  return serverCompetitionModelService().cleanOptionalEmail(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementPoolLength */
function cleanEngagementPoolLength(input0) {
  return serverCompetitionModelService().cleanEngagementPoolLength(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementPoolLaneCount */
function cleanEngagementPoolLaneCount(input0) {
  return serverCompetitionModelService().cleanEngagementPoolLaneCount(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementTimingType */
function cleanEngagementTimingType(input0) {
  return serverCompetitionModelService().cleanEngagementTimingType(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementQualificationTimesMode */
function cleanEngagementQualificationTimesMode(input0) {
  return serverCompetitionModelService().cleanEngagementQualificationTimesMode(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementMissingEntryTimeMode */
function cleanEngagementMissingEntryTimeMode(input0) {
  return serverCompetitionModelService().cleanEngagementMissingEntryTimeMode(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementMaxEventsPerSwimmer */
function cleanEngagementMaxEventsPerSwimmer(input0) {
  return serverCompetitionModelService().cleanEngagementMaxEventsPerSwimmer(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementFeeAmount */
function cleanEngagementFeeAmount(input0) {
  return serverCompetitionModelService().cleanEngagementFeeAmount(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementFees */
function cleanEngagementFees() {
  return serverCompetitionModelService().cleanEngagementFees(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementCompetitionEvents */
function cleanEngagementCompetitionEvents() {
  return serverCompetitionModelService().cleanEngagementCompetitionEvents(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementProgramSessions */
function cleanEngagementProgramSessions() {
  return serverCompetitionModelService().cleanEngagementProgramSessions(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementCompetitionCalendarItem */
function engagementCompetitionCalendarItem() {
  return serverCompetitionModelService().engagementCompetitionCalendarItem(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementCompetitionListItem */
function engagementCompetitionListItem(input0) {
  return serverCompetitionModelService().engagementCompetitionListItem(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementCompetitionCalendarRef */
function engagementCompetitionCalendarRef(input0, input1) {
  return serverCompetitionModelService().engagementCompetitionCalendarRef(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementCalendarEventCalendarRef */
function engagementCalendarEventCalendarRef(input0, input1) {
  return serverCompetitionModelService().engagementCalendarEventCalendarRef(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#cleanEngagementCalendarEventPayload */
function cleanEngagementCalendarEventPayload() {
  return serverCompetitionModelService().cleanEngagementCalendarEventPayload(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementCalendarEventCalendarItem */
function engagementCalendarEventCalendarItem() {
  return serverCompetitionModelService().engagementCalendarEventCalendarItem(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementCalendarEventDetailItem */
function engagementCalendarEventDetailItem(input0) {
  return serverCompetitionModelService().engagementCalendarEventDetailItem(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementCalendarEventItemsFromData */
function engagementCalendarEventItemsFromData() {
  return serverCompetitionModelService().engagementCalendarEventItemsFromData(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementClubCompetitionIndexRef */
function engagementClubCompetitionIndexRef(input0, input1) {
  return serverCompetitionModelService().engagementClubCompetitionIndexRef(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementClubCompetitionIndexKey */
function engagementClubCompetitionIndexKey(input0) {
  return serverCompetitionModelService().engagementClubCompetitionIndexKey(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementClosureQueueRef */
function engagementClosureQueueRef(input0, input1) {
  return serverCompetitionModelService().engagementClosureQueueRef(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementClosureQueueItem */
function engagementClosureQueueItem() {
  return serverCompetitionModelService().engagementClosureQueueItem(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementCompetitionCalendarItemsFromData */
function engagementCompetitionCalendarItemsFromData() {
  return serverCompetitionModelService().engagementCompetitionCalendarItemsFromData(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#filterEngagementCompetitionCalendarItems */
function filterEngagementCompetitionCalendarItems() {
  return serverCompetitionModelService().filterEngagementCompetitionCalendarItems(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementCompetitionDetailItem */
function engagementCompetitionDetailItem(input0) {
  return serverCompetitionModelService().engagementCompetitionDetailItem(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementClubEntryId */
function engagementClubEntryId(input0, input1) {
  return serverCompetitionModelService().engagementClubEntryId(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementClubEntryCompetitionIds */
async function engagementClubEntryCompetitionIds() {
  return serverCompetitionModelService().engagementClubEntryCompetitionIds(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#engagementPersonLicenseKey */
function engagementPersonLicenseKey(input0) {
  return serverCompetitionModelService().engagementPersonLicenseKey(...arguments);
}

/* extracted-function: functions/server-competition-model-service.js#assertEngagementSwimmerRoleCompatibility */
function assertEngagementSwimmerRoleCompatibility() {
  return serverCompetitionModelService().assertEngagementSwimmerRoleCompatibility(...arguments);
}

function serverEntryModelService() {
  if (!serverEntryModelService.instance) serverEntryModelService.instance = require("./server-entry-model-service").createEntryModelService({
    get ENGAGEMENT_CLUB_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_ROSTERS_COLLECTION; },
    get ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION() { return ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION; },
    get ENGAGEMENT_ENTRY_TIME_CACHE_VERSION() { return ENGAGEMENT_ENTRY_TIME_CACHE_VERSION; },
    get ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT() { return ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT; },
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get ENGAGEMENT_PROGRAM_GENDER_MODES() { return ENGAGEMENT_PROGRAM_GENDER_MODES; },
    get ENGAGEMENT_RELAY_AGE_CATEGORY_RANK() { return ENGAGEMENT_RELAY_AGE_CATEGORY_RANK; },
    get ENGAGEMENT_RELAY_CATEGORY_CODES() { return ENGAGEMENT_RELAY_CATEGORY_CODES; },
    get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
    get POOL_COURSES() { return POOL_COURSES; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get armNativeCompetitionNotification() { return armNativeCompetitionNotification; },
    get assertCanModifyEngagementEvent() { return assertCanModifyEngagementEvent; },
    get assertEngagementClubWriteOpen() { return assertEngagementClubWriteOpen; },
    get birthYear() { return birthYear; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementDocumentMetadata() { return cleanEngagementDocumentMetadata; },
    get cleanEngagementLicenseSeasonStatus() { return cleanEngagementLicenseSeasonStatus; },
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanEngagementPoolLength() { return cleanEngagementPoolLength; },
    get cleanEngagementProgramSessions() { return cleanEngagementProgramSessions; },
    get cleanEngagementTimingType() { return cleanEngagementTimingType; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get competitionYear() { return competitionYear; },
    get createQualificationService() { return createQualificationService; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get currentEngagementSeasonInfo() { return currentEngagementSeasonInfo; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementCategoryCodesForEvent() { return engagementCategoryCodesForEvent; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubCode() { return engagementClubCode; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubName() { return engagementClubName; },
    get engagementClubSwimmerItem() { return engagementClubSwimmerItem; },
    get engagementEntryTimeCacheBuilds() { return engagementEntryTimeCacheBuilds; },
    get engagementLicenseSeasonState() { return engagementLicenseSeasonState; },
    get engagementRelayReferenceForEntry() { return engagementRelayReferenceForEntry; },
    get engagementRelayReferenceMap() { return engagementRelayReferenceMap; },
    get engagementSeasonBoundsFromEndYear() { return engagementSeasonBoundsFromEndYear; },
    get formatTimeValue() { return formatTimeValue; },
    get hydratePublicSwimmerRowsFromPayload() { return hydratePublicSwimmerRowsFromPayload; },
    get importSeasonYear() { return importSeasonYear; },
    get intranapSwimmersIndex() { return intranapSwimmersIndex; },
    get isYouthCategory() { return isYouthCategory; },
    get legacyQualificationService() { return legacyQualificationService; }, set legacyQualificationService(value) { legacyQualificationService = value; },
    get normalizeCategoryCode() { return normalizeCategoryCode; },
    get normalizeCourseCode() { return normalizeCourseCode; },
    get normalizePerformanceSearchText() { return normalizePerformanceSearchText; },
    get parseTimeValue() { return parseTimeValue; },
    get performanceSearchTokens() { return performanceSearchTokens; },
    get performanceSwimmerIndexKey() { return performanceSwimmerIndexKey; },
    get performanceSwimmerPageId() { return performanceSwimmerPageId; },
    get publicBetterPerformance() { return publicBetterPerformance; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get publicPerformanceSwimmerFilePath() { return publicPerformanceSwimmerFilePath; },
    get qualificationEngine() { return qualificationEngine; },
    get readPublicPerformanceJson() { return readPublicPerformanceJson; },
    get recordReferenceForPerformance() { return recordReferenceForPerformance; },
    get recordReferenceMap() { return recordReferenceMap; },
    get stableHash() { return stableHash; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return serverEntryModelService.instance;
}

/* extracted-function: functions/server-entry-model-service.js#cleanEngagementTeamLeader */
function cleanEngagementTeamLeader() {
  return serverEntryModelService().cleanEngagementTeamLeader(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementTeamLeaderComplete */
function engagementTeamLeaderComplete() {
  return serverEntryModelService().engagementTeamLeaderComplete(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#cleanEngagementEntryOfficial */
function cleanEngagementEntryOfficial() {
  return serverEntryModelService().cleanEngagementEntryOfficial(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#parseEngagementEntryTime */
function parseEngagementEntryTime(input0) {
  return serverEntryModelService().parseEngagementEntryTime(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#cleanEngagementEntryIndividualEntries */
function cleanEngagementEntryIndividualEntries() {
  return serverEntryModelService().cleanEngagementEntryIndividualEntries(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#cleanEngagementEntrySwimmer */
function cleanEngagementEntrySwimmer() {
  return serverEntryModelService().cleanEngagementEntrySwimmer(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementRelayAllowedCategories */
function engagementRelayAllowedCategories() {
  return serverEntryModelService().engagementRelayAllowedCategories(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#cleanEngagementRelayGenderMode */
function cleanEngagementRelayGenderMode() {
  return serverEntryModelService().cleanEngagementRelayGenderMode(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementRelayMemberCategory */
function engagementRelayMemberCategory() {
  return serverEntryModelService().engagementRelayMemberCategory(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementRelayMemberAge */
function engagementRelayMemberAge() {
  return serverEntryModelService().engagementRelayMemberAge(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementRelayMemberAllowedForCategory */
function engagementRelayMemberAllowedForCategory() {
  return serverEntryModelService().engagementRelayMemberAllowedForCategory(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#assertEngagementRelayMembers */
function assertEngagementRelayMembers() {
  return serverEntryModelService().assertEngagementRelayMembers(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#cleanEngagementEntryRelays */
function cleanEngagementEntryRelays() {
  return serverEntryModelService().cleanEngagementEntryRelays(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#qualificationRelaysAfterIndividualChange */
function qualificationRelaysAfterIndividualChange() {
  return serverEntryModelService().qualificationRelaysAfterIndividualChange(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#qualificationEvents */
function qualificationEvents() {
  return serverEntryModelService().qualificationEvents(...arguments);
}

let legacyQualificationService;
/* extracted-function: functions/server-entry-model-service.js#qualificationService */
function qualificationService() {
  return serverEntryModelService().qualificationService(...arguments);
}

exports.listEngagementQualificationSources = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4, timeoutSeconds:60 } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#listEngagementQualificationSources#arrow */ async (request) => {
  return portalCompetitionHandlers().listEngagementQualificationSources(request);
});
/* extracted-function: functions/server-entry-model-service.js#nativeQualificationServices */
function nativeQualificationServices(input0) {
  return serverEntryModelService().nativeQualificationServices(...arguments);
}
const nativeQualificationOptions=ENVIRONMENT.sportingDataSource === "nap"?{secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD")],maxInstances:2,concurrency:4}:{};
const nativeQualificationNow=()=>new Date().toISOString().replace('T',' ').replace('Z','000');
/* extracted-function: functions/server-entry-model-service.js#nativeQualificationError */
function nativeQualificationError(input0) {
  return serverEntryModelService().nativeQualificationError(...arguments);
}
exports.processEngagementQualificationJob = onCall({ ...CALLABLE_OPTIONS,...nativeQualificationOptions,timeoutSeconds:300 }, /* extracted-handler: functions/portal-competition-handlers.js#processEngagementQualificationJob#arrow */ async (request) => {
  return portalCompetitionHandlers().processEngagementQualificationJob(request);
});
exports.grantEngagementQualificationException = onCall({ ...CALLABLE_OPTIONS,...nativeQualificationOptions,timeoutSeconds:60 },/* extracted-handler: functions/portal-competition-handlers.js#grantEngagementQualificationException#arrow */ async (request) => {
  return portalCompetitionHandlers().grantEngagementQualificationException(request);
});
exports.acknowledgeEngagementQualificationAlert = onCall({ ...CALLABLE_OPTIONS,...nativeQualificationOptions,timeoutSeconds:60 },/* extracted-handler: functions/portal-competition-handlers.js#acknowledgeEngagementQualificationAlert#arrow */ async (request) => {
  return portalCompetitionHandlers().acknowledgeEngagementQualificationAlert(request);
});
// Retired endpoints remain deny-only so previously deployed clients cannot use
// the removed request workflow. Historical documents are not migrated or erased.
const retiredQualificationRequest = () => { throw new HttpsError("failed-precondition", "Les demandes de dérogation sont supprimées. Une exception peut être accordée directement par le National."); };
exports.requestEngagementQualificationDerogation = onCall(CALLABLE_OPTIONS, retiredQualificationRequest);
exports.listEngagementQualificationRequests = onCall(CALLABLE_OPTIONS, retiredQualificationRequest);
exports.resolveEngagementQualificationRequest = onCall(CALLABLE_OPTIONS, retiredQualificationRequest);
exports.syncEngagementQualificationTargets = onDocumentWritten({ region: REGION,
  document: "engagementClubEntries/{entryId}", retry: true, timeoutSeconds: 540 }, (event) => ENVIRONMENT.sportingDataSource === "nap" ? null : qualificationService().syncTargets(event));
exports.revalidateEngagementQualificationCache = onDocumentWritten({ region: REGION,
  document: `${ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION}/{cacheId}`, retry: true, timeoutSeconds: 540 }, (event) => ENVIRONMENT.sportingDataSource === "nap" ? null : qualificationService().revalidateCache(event));

/* extracted-function: functions/server-entry-model-service.js#engagementQualificationRowAllowed */
function engagementQualificationRowAllowed() {
  return serverEntryModelService().engagementQualificationRowAllowed(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#bestEngagementKnownTime */
function bestEngagementKnownTime() {
  return serverEntryModelService().bestEngagementKnownTime(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementKnownTimeHistory */
function engagementKnownTimeHistory() {
  return serverEntryModelService().engagementKnownTimeHistory(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementEntryTimeCacheId */
function engagementEntryTimeCacheId() {
  return serverEntryModelService().engagementEntryTimeCacheId(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementEntryTimeCacheRef */
function engagementEntryTimeCacheRef(input0) {
  return serverEntryModelService().engagementEntryTimeCacheRef(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementEntryTimeCacheRow */
function engagementEntryTimeCacheRow() {
  return serverEntryModelService().engagementEntryTimeCacheRow(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementEntryTimeCacheRowsFromData */
function engagementEntryTimeCacheRowsFromData() {
  return serverEntryModelService().engagementEntryTimeCacheRowsFromData(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementEntryTimeRowsToEvents */
function engagementEntryTimeRowsToEvents() {
  return serverEntryModelService().engagementEntryTimeRowsToEvents(...arguments);
}

const engagementEntryTimeCacheBuilds = new Map();

/* extracted-function: functions/server-entry-model-service.js#engagementEntryTimeSourceKeys */
function engagementEntryTimeSourceKeys() {
  return serverEntryModelService().engagementEntryTimeSourceKeys(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#readEngagementEntryTimeSourceRows */
async function readEngagementEntryTimeSourceRows() {
  return serverEntryModelService().readEngagementEntryTimeSourceRows(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#rebuildEngagementEntryTimeCache */
async function rebuildEngagementEntryTimeCache(input0) {
  return serverEntryModelService().rebuildEngagementEntryTimeCache(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#getEngagementEntryTimeRowsForSwimmer */
async function getEngagementEntryTimeRowsForSwimmer() {
  return serverEntryModelService().getEngagementEntryTimeRowsForSwimmer(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#getEngagementQualificationRows */
async function getEngagementQualificationRows() {
  return serverEntryModelService().getEngagementQualificationRows(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#deleteEngagementEntryTimeCache */
function deleteEngagementEntryTimeCache(input0, input1) {
  return serverEntryModelService().deleteEngagementEntryTimeCache(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#invalidateEngagementEntryTimeCachesForPerformanceRows */
async function invalidateEngagementEntryTimeCachesForPerformanceRows() {
  return serverEntryModelService().invalidateEngagementEntryTimeCachesForPerformanceRows(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementCompetitionAppliesToFranceRecords */
function engagementCompetitionAppliesToFranceRecords() {
  return serverEntryModelService().engagementCompetitionAppliesToFranceRecords(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementCompetitionAppliesToMpf */
function engagementCompetitionAppliesToMpf() {
  return serverEntryModelService().engagementCompetitionAppliesToMpf(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementRecordReferencesForEntry */
function engagementRecordReferencesForEntry(input0) {
  return serverEntryModelService().engagementRecordReferencesForEntry(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementEntryTimeWarning */
function engagementEntryTimeWarning() {
  return serverEntryModelService().engagementEntryTimeWarning(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#validateEngagementIndividualEntryTimes */
function validateEngagementIndividualEntryTimes() {
  return serverEntryModelService().validateEngagementIndividualEntryTimes(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementRelayReferencesForEntry */
function engagementRelayReferencesForEntry(input0) {
  return serverEntryModelService().engagementRelayReferencesForEntry(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#validateEngagementRelayEntryTimes */
function validateEngagementRelayEntryTimes() {
  return serverEntryModelService().validateEngagementRelayEntryTimes(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#resolveEngagementIndividualEntriesForSwimmer */
async function resolveEngagementIndividualEntriesForSwimmer() {
  return serverEntryModelService().resolveEngagementIndividualEntriesForSwimmer(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#automaticEngagementIndividualEntry */
function automaticEngagementIndividualEntry(input0, input1, input2) {
  return serverEntryModelService().automaticEngagementIndividualEntry(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementSwimmerIdentityKey */
function engagementSwimmerIdentityKey(input0, input1, input2) {
  return serverEntryModelService().engagementSwimmerIdentityKey(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#cleanEngagementNewSwimmer */
function cleanEngagementNewSwimmer() {
  return serverEntryModelService().cleanEngagementNewSwimmer(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementNewSwimmerItem */
function engagementNewSwimmerItem(input0) {
  return serverEntryModelService().engagementNewSwimmerItem(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementNewSwimmerAlertFromMatch */
function engagementNewSwimmerAlertFromMatch() {
  return serverEntryModelService().engagementNewSwimmerAlertFromMatch(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#buildEngagementNewSwimmerAlerts */
async function buildEngagementNewSwimmerAlerts() {
  return serverEntryModelService().buildEngagementNewSwimmerAlerts(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementSwimmerLicenseId */
function engagementSwimmerLicenseId() {
  return serverEntryModelService().engagementSwimmerLicenseId(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementSwimmerLicenseNumberKey */
function engagementSwimmerLicenseNumberKey() {
  return serverEntryModelService().engagementSwimmerLicenseNumberKey(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementSwimmerLicenseNumberId */
function engagementSwimmerLicenseNumberId() {
  return serverEntryModelService().engagementSwimmerLicenseNumberId(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementClubRosterId */
function engagementClubRosterId(input0) {
  return serverEntryModelService().engagementClubRosterId(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementClubRosterRef */
function engagementClubRosterRef(input0, input1) {
  return serverEntryModelService().engagementClubRosterRef(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#cleanEngagementClubActivityStatus */
function cleanEngagementClubActivityStatus() {
  return serverEntryModelService().cleanEngagementClubActivityStatus(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementClubRosterSwimmerKey */
function engagementClubRosterSwimmerKey() {
  return serverEntryModelService().engagementClubRosterSwimmerKey(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementClubRosterSwimmerItem */
function engagementClubRosterSwimmerItem() {
  return serverEntryModelService().engagementClubRosterSwimmerItem(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementClubRosterSwimmersFromData */
function engagementClubRosterSwimmersFromData() {
  return serverEntryModelService().engagementClubRosterSwimmersFromData(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#upsertEngagementClubRosterSwimmer */
function upsertEngagementClubRosterSwimmer(input0, input1) {
  return serverEntryModelService().upsertEngagementClubRosterSwimmer(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#deleteEngagementClubRosterSwimmer */
function deleteEngagementClubRosterSwimmer(input0, input1) {
  return serverEntryModelService().deleteEngagementClubRosterSwimmer(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementSwimmerLicenseDataItem */
function engagementSwimmerLicenseDataItem() {
  return serverEntryModelService().engagementSwimmerLicenseDataItem(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementSwimmerLicenseItem */
function engagementSwimmerLicenseItem(input0) {
  return serverEntryModelService().engagementSwimmerLicenseItem(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementLegacySwimmerLicensesByClub */
async function engagementLegacySwimmerLicensesByClub(input0, input1) {
  return serverEntryModelService().engagementLegacySwimmerLicensesByClub(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementSwimmerLicensePayload */
function engagementSwimmerLicensePayload() {
  return serverEntryModelService().engagementSwimmerLicensePayload(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementSwimmerLicenseConflictData */
function engagementSwimmerLicenseConflictData() {
  return serverEntryModelService().engagementSwimmerLicenseConflictData(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#findEngagementSwimmerLicenseConflict */
async function findEngagementSwimmerLicenseConflict(input0) {
  return serverEntryModelService().findEngagementSwimmerLicenseConflict(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#assertNoEngagementSwimmerLicenseConflict */
async function assertNoEngagementSwimmerLicenseConflict(input0) {
  return serverEntryModelService().assertNoEngagementSwimmerLicenseConflict(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementSwimmerRecoveryPreview */
async function engagementSwimmerRecoveryPreview(input0, input1) {
  return serverEntryModelService().engagementSwimmerRecoveryPreview(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementClubEntryItem */
function engagementClubEntryItem(input0) {
  return serverEntryModelService().engagementClubEntryItem(...arguments);
}

/* extracted-function: functions/server-entry-model-service.js#engagementClubEntryHasParticipants */
function engagementClubEntryHasParticipants() {
  return serverEntryModelService().engagementClubEntryHasParticipants(...arguments);
}

function engagementPdfRenderer() {
  if (!engagementPdfRenderer.instance) engagementPdfRenderer.instance = require("./engagement-pdf-renderer").createEngagementPdfRenderer({
    ENGAGEMENT_EVENT_DEFINITION_BY_CODE,
    ENGAGEMENT_PDF_LOGO_PATH,
    PDFDocument,
    QRCode,
    ageCategoryFromDates,
    cleanEngagementCompetitionLevel,
    cleanEngagementCompetitionType,
    cleanEngagementTimingType,
    cleanIsoDate,
    cleanPublicCalendarWhatsAppUrl,
    cleanText,
    engagementClubCode,
    fs,
    normalizeCategoryCode,
    normalizeCourseCode
  });
  return engagementPdfRenderer.instance;
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfFormatDate */
function engagementPdfFormatDate(input0) {
  return engagementPdfRenderer().engagementPdfFormatDate(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfFormatDateTime */
function engagementPdfFormatDateTime(input0) {
  return engagementPdfRenderer().engagementPdfFormatDateTime(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfLevelLabel */
function engagementPdfLevelLabel(input0) {
  return engagementPdfRenderer().engagementPdfLevelLabel(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfStatusLabel */
function engagementPdfStatusLabel(input0) {
  return engagementPdfRenderer().engagementPdfStatusLabel(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfTimingLabel */
function engagementPdfTimingLabel(input0) {
  return engagementPdfRenderer().engagementPdfTimingLabel(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfMoney */
function engagementPdfMoney(input0) {
  return engagementPdfRenderer().engagementPdfMoney(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfFileName */
function engagementPdfFileName(input0) {
  return engagementPdfRenderer().engagementPdfFileName(...arguments);
}

function serverDocumentsService() {
  if (!serverDocumentsService.instance) serverDocumentsService.instance = require("./server-documents-service").createDocumentsService({
    get ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION() { return ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION; },
    get ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION() { return ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION; },
    get ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX() { return ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_MAIL_FROM() { return LIVEPALMES_MAIL_FROM; },
    get LIVEPALMES_SMTP_HOST() { return LIVEPALMES_SMTP_HOST; },
    get LIVEPALMES_SMTP_PASS() { return LIVEPALMES_SMTP_PASS; },
    get LIVEPALMES_SMTP_PORT() { return LIVEPALMES_SMTP_PORT; },
    get LIVEPALMES_SMTP_SECURE() { return LIVEPALMES_SMTP_SECURE; },
    get LIVEPALMES_SMTP_USER() { return LIVEPALMES_SMTP_USER; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get buildEngagementClubRecapPdf() { return buildEngagementClubRecapPdf; },
    get buildEngagementOfficialsPdf() { return buildEngagementOfficialsPdf; },
    get buildWinPalmeCompetitionTxt() { return buildWinPalmeCompetitionTxt; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanPublicCalendarWhatsAppUrl() { return cleanPublicCalendarWhatsAppUrl; },
    get cleanText() { return cleanText; },
    get crypto() { return crypto; },
    get db() { return db; },
    get engagementClubCode() { return engagementClubCode; },
    get engagementClubCompetitionIndexKey() { return engagementClubCompetitionIndexKey; },
    get engagementClubCompetitionIndexRef() { return engagementClubCompetitionIndexRef; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementClubName() { return engagementClubName; },
    get engagementClubsByIds() { return engagementClubsByIds; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementPdfEntryStats() { return engagementPdfEntryStats; },
    get engagementPdfFileName() { return engagementPdfFileName; },
    get normalizeEmail() { return normalizeEmail; },
    get stableHash() { return stableHash; },
    get storage() { return storage; },
    get zlib() { return zlib; }
  });
  return serverDocumentsService.instance;
}

/* extracted-function: functions/server-documents-service.js#cleanEngagementDocumentMetadata */
function cleanEngagementDocumentMetadata() {
  return serverDocumentsService().cleanEngagementDocumentMetadata(...arguments);
}

/* extracted-function: functions/server-documents-service.js#cleanEngagementGeneratedFile */
function cleanEngagementGeneratedFile() {
  return serverDocumentsService().cleanEngagementGeneratedFile(...arguments);
}

/* extracted-function: functions/server-documents-service.js#cleanEngagementGeneratedFiles */
function cleanEngagementGeneratedFiles() {
  return serverDocumentsService().cleanEngagementGeneratedFiles(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementCompetitionDocumentsMetadata */
function engagementCompetitionDocumentsMetadata() {
  return serverDocumentsService().engagementCompetitionDocumentsMetadata(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementClubRecapPdfStoragePath */
function engagementClubRecapPdfStoragePath(input0, input1) {
  return serverDocumentsService().engagementClubRecapPdfStoragePath(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementClubRecapPdfSourceHash */
function engagementClubRecapPdfSourceHash() {
  return serverDocumentsService().engagementClubRecapPdfSourceHash(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfEventLabel */
function engagementPdfEventLabel(input0) {
  return engagementPdfRenderer().engagementPdfEventLabel(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfSwimmerName */
function engagementPdfSwimmerName() {
  return engagementPdfRenderer().engagementPdfSwimmerName(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfPersonName */
function engagementPdfPersonName() {
  return engagementPdfRenderer().engagementPdfPersonName(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfGenderLabel */
function engagementPdfGenderLabel(input0) {
  return engagementPdfRenderer().engagementPdfGenderLabel(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfRelayCategoryLabel */
function engagementPdfRelayCategoryLabel(input0) {
  return engagementPdfRenderer().engagementPdfRelayCategoryLabel(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfEntryStats */
function engagementPdfEntryStats() {
  return engagementPdfRenderer().engagementPdfEntryStats(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfFeeTotal */
function engagementPdfFeeTotal() {
  return engagementPdfRenderer().engagementPdfFeeTotal(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementCompetitionEntrySummaryId */
function engagementCompetitionEntrySummaryId(input0) {
  return serverDocumentsService().engagementCompetitionEntrySummaryId(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementCompetitionEntrySummaryRef */
function engagementCompetitionEntrySummaryRef(input0, input1) {
  return serverDocumentsService().engagementCompetitionEntrySummaryRef(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementCompetitionStatisticsCacheRef */
function engagementCompetitionStatisticsCacheRef(input0, input1) {
  return serverDocumentsService().engagementCompetitionStatisticsCacheRef(...arguments);
}

/* extracted-function: functions/server-documents-service.js#invalidateEngagementCompetitionStatistics */
function invalidateEngagementCompetitionStatistics(input0, input1, input2) {
  return serverDocumentsService().invalidateEngagementCompetitionStatistics(...arguments);
}

/* extracted-function: functions/server-documents-service.js#decodeEngagementCompetitionStatisticsCache */
function decodeEngagementCompetitionStatisticsCache() {
  return serverDocumentsService().decodeEngagementCompetitionStatisticsCache(...arguments);
}

/* extracted-function: functions/server-documents-service.js#encodeEngagementCompetitionStatisticsCache */
function encodeEngagementCompetitionStatisticsCache() {
  return serverDocumentsService().encodeEngagementCompetitionStatisticsCache(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementCompetitionEntrySummaryItem */
function engagementCompetitionEntrySummaryItem() {
  return serverDocumentsService().engagementCompetitionEntrySummaryItem(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementCompetitionEntrySummariesFromData */
function engagementCompetitionEntrySummariesFromData() {
  return serverDocumentsService().engagementCompetitionEntrySummariesFromData(...arguments);
}

/* extracted-function: functions/server-documents-service.js#rebuildEngagementCompetitionEntrySummary */
async function rebuildEngagementCompetitionEntrySummary(input0, input1) {
  return serverDocumentsService().rebuildEngagementCompetitionEntrySummary(...arguments);
}

/* extracted-function: functions/server-documents-service.js#upsertEngagementCompetitionEntrySummary */
function upsertEngagementCompetitionEntrySummary(input0, input1) {
  return serverDocumentsService().upsertEngagementCompetitionEntrySummary(...arguments);
}

/* extracted-function: functions/server-documents-service.js#deleteEngagementCompetitionEntrySummary */
function deleteEngagementCompetitionEntrySummary(input0, input1) {
  return serverDocumentsService().deleteEngagementCompetitionEntrySummary(...arguments);
}

/* extracted-function: functions/server-documents-service.js#upsertEngagementClubCompetitionIndex */
function upsertEngagementClubCompetitionIndex(input0, input1) {
  return serverDocumentsService().upsertEngagementClubCompetitionIndex(...arguments);
}

/* extracted-function: functions/server-documents-service.js#deleteEngagementClubCompetitionIndexEntry */
function deleteEngagementClubCompetitionIndexEntry(input0, input1) {
  return serverDocumentsService().deleteEngagementClubCompetitionIndexEntry(...arguments);
}

/* extracted-function: functions/server-documents-service.js#syncEngagementCompetitionEntrySummaryFromChange */
async function syncEngagementCompetitionEntrySummaryFromChange() {
  return serverDocumentsService().syncEngagementCompetitionEntrySummaryFromChange(...arguments);
}

exports.syncEngagementClubEntryToCompetitionSummary = onDocumentWritten({
  region: REGION,
  document: "engagementClubEntries/{entryId}"
}, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  await syncEngagementCompetitionEntrySummaryFromChange(event);
});

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfCollectIndividualRows */
function engagementPdfCollectIndividualRows() {
  return engagementPdfRenderer().engagementPdfCollectIndividualRows(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfIndividualProgramColumns */
function engagementPdfIndividualProgramColumns() {
  return engagementPdfRenderer().engagementPdfIndividualProgramColumns(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfIndividualMatrix */
function engagementPdfIndividualMatrix() {
  return engagementPdfRenderer().engagementPdfIndividualMatrix(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfSwimmersWithoutIndividualRows */
function engagementPdfSwimmersWithoutIndividualRows() {
  return engagementPdfRenderer().engagementPdfSwimmersWithoutIndividualRows(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfCompactSummary */
function engagementPdfCompactSummary(input0) {
  return engagementPdfRenderer().engagementPdfCompactSummary(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfDrawIndividualMatrix */
function engagementPdfDrawIndividualMatrix(input0) {
  return engagementPdfRenderer().engagementPdfDrawIndividualMatrix(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfCollectRelayRows */
function engagementPdfCollectRelayRows() {
  return engagementPdfRenderer().engagementPdfCollectRelayRows(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfDocToBuffer */
function engagementPdfDocToBuffer(input0) {
  return engagementPdfRenderer().engagementPdfDocToBuffer(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfAddFooter */
function engagementPdfAddFooter(input0, input1) {
  return engagementPdfRenderer().engagementPdfAddFooter(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfEnsureSpace */
function engagementPdfEnsureSpace(input0, input1, input2) {
  return engagementPdfRenderer().engagementPdfEnsureSpace(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfSection */
function engagementPdfSection(input0, input1, input2) {
  return engagementPdfRenderer().engagementPdfSection(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfEmptyState */
function engagementPdfEmptyState(input0, input1, input2) {
  return engagementPdfRenderer().engagementPdfEmptyState(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfWhatsAppBlock */
function engagementPdfWhatsAppBlock(input0, input1, input2, input3) {
  return engagementPdfRenderer().engagementPdfWhatsAppBlock(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfKeyValues */
function engagementPdfKeyValues(input0, input1, input2) {
  return engagementPdfRenderer().engagementPdfKeyValues(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfFeesTable */
function engagementPdfFeesTable(input0) {
  return engagementPdfRenderer().engagementPdfFeesTable(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfTextHeight */
function engagementPdfTextHeight(input0, input1, input2) {
  return engagementPdfRenderer().engagementPdfTextHeight(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#engagementPdfTable */
function engagementPdfTable(input0, input1, input2, input3) {
  return engagementPdfRenderer().engagementPdfTable(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#buildEngagementClubRecapPdf */
async function buildEngagementClubRecapPdf() {
  return engagementPdfRenderer().buildEngagementClubRecapPdf(...arguments);
}

/* extracted-function: functions/server-documents-service.js#readStoredEngagementClubRecapPdf */
async function readStoredEngagementClubRecapPdf() {
  return serverDocumentsService().readStoredEngagementClubRecapPdf(...arguments);
}

/* extracted-function: functions/server-documents-service.js#saveEngagementClubRecapPdfDocument */
async function saveEngagementClubRecapPdfDocument() {
  return serverDocumentsService().saveEngagementClubRecapPdfDocument(...arguments);
}

/* extracted-function: functions/server-documents-service.js#getOrCreateEngagementClubRecapPdf */
async function getOrCreateEngagementClubRecapPdf(input0, input1) {
  return serverDocumentsService().getOrCreateEngagementClubRecapPdf(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementOfficialsPdfStoragePath */
function engagementOfficialsPdfStoragePath(input0) {
  return serverDocumentsService().engagementOfficialsPdfStoragePath(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementOfficialsPdfRows */
function engagementOfficialsPdfRows() {
  return serverDocumentsService().engagementOfficialsPdfRows(...arguments);
}

/* extracted-function: functions/server-documents-service.js#resolveEngagementOfficialsPdfRows */
async function resolveEngagementOfficialsPdfRows(input0) {
  return serverDocumentsService().resolveEngagementOfficialsPdfRows(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementOfficialsPdfSourceHash */
function engagementOfficialsPdfSourceHash() {
  return serverDocumentsService().engagementOfficialsPdfSourceHash(...arguments);
}

/* extracted-function: functions/engagement-pdf-renderer.js#buildEngagementOfficialsPdf */
async function buildEngagementOfficialsPdf() {
  return engagementPdfRenderer().buildEngagementOfficialsPdf(...arguments);
}

/* extracted-function: functions/server-documents-service.js#saveEngagementOfficialsPdfDocument */
async function saveEngagementOfficialsPdfDocument() {
  return serverDocumentsService().saveEngagementOfficialsPdfDocument(...arguments);
}

/* extracted-function: functions/server-documents-service.js#getOrCreateEngagementOfficialsPdf */
async function getOrCreateEngagementOfficialsPdf(input0, input1) {
  return serverDocumentsService().getOrCreateEngagementOfficialsPdf(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementTxtStoragePath */
function engagementTxtStoragePath(input0) {
  return serverDocumentsService().engagementTxtStoragePath(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementTxtDownloadUrl */
function engagementTxtDownloadUrl(input0, input1) {
  return serverDocumentsService().engagementTxtDownloadUrl(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementTxtSourceHash */
function engagementTxtSourceHash() {
  return serverDocumentsService().engagementTxtSourceHash(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementTxtSwimmerCategory */
function engagementTxtSwimmerCategory() {
  return serverDocumentsService().engagementTxtSwimmerCategory(...arguments);
}

/* extracted-function: functions/server-documents-service.js#buildEngagementCompetitionTxt */
function buildEngagementCompetitionTxt() {
  return serverDocumentsService().buildEngagementCompetitionTxt(...arguments);
}

/* extracted-function: functions/server-documents-service.js#readStoredEngagementTxt */
async function readStoredEngagementTxt() {
  return serverDocumentsService().readStoredEngagementTxt(...arguments);
}

/* extracted-function: functions/server-documents-service.js#getOrCreateEngagementCompetitionTxt */
async function getOrCreateEngagementCompetitionTxt(input0) {
  return serverDocumentsService().getOrCreateEngagementCompetitionTxt(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementMailStatusLabel */
function engagementMailStatusLabel(input0) {
  return serverDocumentsService().engagementMailStatusLabel(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementMailSecretValue */
function engagementMailSecretValue(input0, input1) {
  return serverDocumentsService().engagementMailSecretValue(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementMailSmtpConfig */
function engagementMailSmtpConfig() {
  return serverDocumentsService().engagementMailSmtpConfig(...arguments);
}

/* extracted-function: functions/server-documents-service.js#engagementMailPreparedStatus */
function engagementMailPreparedStatus() {
  return serverDocumentsService().engagementMailPreparedStatus(...arguments);
}

exports.getEngagementAutomaticMailControl = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-competition-handlers.js#getEngagementAutomaticMailControl#arrow */ async (request) => {
  return portalCompetitionHandlers().getEngagementAutomaticMailControl(request);
});
exports.updateEngagementAutomaticMailControl = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-competition-handlers.js#updateEngagementAutomaticMailControl#arrow */ async (request) => {
  return portalCompetitionHandlers().updateEngagementAutomaticMailControl(request);
});

function serverMailService() {
  if (!serverMailService.instance) serverMailService.instance = require("./server-mail-service").createMailService({
    get ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION() { return ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION; },
    get ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES() { return ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES; },
    get ENGAGEMENT_MAIL_CAPABILITIES() { return ENGAGEMENT_MAIL_CAPABILITIES; },
    get ENGAGEMENT_MAIL_JOBS_COLLECTION() { return ENGAGEMENT_MAIL_JOBS_COLLECTION; },
    get ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT() { return ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT; },
    get ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION() { return ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION; },
    get ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION() { return ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION; },
    get ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT() { return ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldPath() { return FieldPath; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get OPTIONAL_COMPETITION_MAIL_TYPES() { return OPTIONAL_COMPETITION_MAIL_TYPES; },
    get activeCapabilitiesFromMap() { return activeCapabilitiesFromMap; },
    get cleanEngagementCompetitionLevel() { return cleanEngagementCompetitionLevel; },
    get cleanEngagementRegionIds() { return cleanEngagementRegionIds; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get competitionEmailNotificationsEnabled() { return competitionEmailNotificationsEnabled; },
    get competitionMailDateTime() { return competitionMailDateTime; },
    get competitionMailLines() { return competitionMailLines; },
    get competitionNotificationPreferenceUrl() { return competitionNotificationPreferenceUrl; },
    get crypto() { return crypto; },
    get db() { return db; },
    get engagementClubCode() { return engagementClubCode; },
    get engagementClubName() { return engagementClubName; },
    get engagementMailPreparedStatus() { return engagementMailPreparedStatus; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get engagementMailStatusLabel() { return engagementMailStatusLabel; },
    get engagementPdfFeeTotal() { return engagementPdfFeeTotal; },
    get engagementPdfMoney() { return engagementPdfMoney; },
    get escapeMailHtml() { return escapeMailHtml; },
    get isNationalOnlyEngagementCompetitionLevel() { return isNationalOnlyEngagementCompetitionLevel; },
    get livePalmesMailHtml() { return livePalmesMailHtml; },
    get normalizeEmail() { return normalizeEmail; },
    get normalizedEngagementRegionKey() { return normalizedEngagementRegionKey; },
    get readStoredEngagementClubRecapPdf() { return readStoredEngagementClubRecapPdf; },
    get stableHash() { return stableHash; }
  });
  return serverMailService.instance;
}

/* extracted-function: functions/server-mail-service.js#engagementMailPreparedReason */
function engagementMailPreparedReason() {
  return serverMailService().engagementMailPreparedReason(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailJobId */
function engagementMailJobId() {
  return serverMailService().engagementMailJobId(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailRecipientFromUserDoc */
function engagementMailRecipientFromUserDoc(input0) {
  return serverMailService().engagementMailRecipientFromUserDoc(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailRecipientShardNumber */
function engagementMailRecipientShardNumber() {
  return serverMailService().engagementMailRecipientShardNumber(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailRecipientShardRef */
function engagementMailRecipientShardRef(input0, input1, input2) {
  return serverMailService().engagementMailRecipientShardRef(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailRecipientIndexStateRef */
function engagementMailRecipientIndexStateRef(input0) {
  return serverMailService().engagementMailRecipientIndexStateRef(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailRecipientIndexKey */
function engagementMailRecipientIndexKey() {
  return serverMailService().engagementMailRecipientIndexKey(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementClubAdminDirectoryRef */
function engagementClubAdminDirectoryRef(input0) {
  return serverMailService().engagementClubAdminDirectoryRef(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementClubAdminDirectoryEntry */
function engagementClubAdminDirectoryEntry() {
  return serverMailService().engagementClubAdminDirectoryEntry(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementClubAdminDirectoryMap */
function engagementClubAdminDirectoryMap() {
  return serverMailService().engagementClubAdminDirectoryMap(...arguments);
}

/* extracted-function: functions/server-mail-service.js#assertEngagementClubAdminDirectorySize */
function assertEngagementClubAdminDirectorySize() {
  return serverMailService().assertEngagementClubAdminDirectorySize(...arguments);
}

/* extracted-function: functions/server-mail-service.js#writeEngagementClubAdminDirectory */
async function writeEngagementClubAdminDirectory(input0) {
  return serverMailService().writeEngagementClubAdminDirectory(...arguments);
}

/* extracted-function: functions/server-mail-service.js#updateEngagementClubAdminDirectory */
async function updateEngagementClubAdminDirectory(input0) {
  return serverMailService().updateEngagementClubAdminDirectory(...arguments);
}

/* extracted-function: functions/server-mail-service.js#readEngagementClubAdminDirectory */
async function readEngagementClubAdminDirectory(input0) {
  return serverMailService().readEngagementClubAdminDirectory(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailRecipientShardRefs */
function engagementMailRecipientShardRefs(input0) {
  return serverMailService().engagementMailRecipientShardRefs(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailRecipientShardGroups */
function engagementMailRecipientShardGroups() {
  return serverMailService().engagementMailRecipientShardGroups(...arguments);
}

/* extracted-function: functions/server-mail-service.js#replaceEngagementMailRecipientIndex */
async function replaceEngagementMailRecipientIndex(input0) {
  return serverMailService().replaceEngagementMailRecipientIndex(...arguments);
}

/* extracted-function: functions/server-mail-service.js#bootstrapEngagementMailRecipientIndex */
async function bootstrapEngagementMailRecipientIndex(input0) {
  return serverMailService().bootstrapEngagementMailRecipientIndex(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailRecipientsFromIndex */
async function engagementMailRecipientsFromIndex(input0) {
  return serverMailService().engagementMailRecipientsFromIndex(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementRecipientHasCapability */
function engagementRecipientHasCapability() {
  return serverMailService().engagementRecipientHasCapability(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementCompetitionNotificationRecipients */
function engagementCompetitionNotificationRecipients() {
  return serverMailService().engagementCompetitionNotificationRecipients(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementActiveMailRecipients */
async function engagementActiveMailRecipients(input0) {
  return serverMailService().engagementActiveMailRecipients(...arguments);
}

// Reuse the existing profile trigger; TEST must never write account addresses to shared NAP.
const syncNapClubAccountEmail = require("./nap-club-account-emails").createSynchronizer({
  projectId: ENVIRONMENT.projectId,
  createPool: () => createNapPool(defineSecret("LIVEPALMES_NAP_PASSWORD").value()),
  db
});

exports.syncEngagementMailRecipientIndex = onDocumentWritten({
  region: REGION,
  ...(ENVIRONMENT.projectId === "livepalmes" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}),
  document: "users/{uid}",
  retry: true
}, async (event) => {
  const uid = cleanText(event.params.uid);
  if (!uid) return;
  const beforeData = event.data?.before?.exists ? event.data.before.data() || {} : null;
  const before = beforeData ? engagementMailRecipientFromUserDoc(event.data.before) : null;
  const afterData = event.data?.after?.exists ? event.data.after.data() || {} : {};
  const after = event.data?.after?.exists && afterData.status === "active"
    ? engagementMailRecipientFromUserDoc(event.data.after)
    : null;
  const now = new Date().toISOString();
  const snapshotSync = syncAccessDirectorySnapshotFromUserChange(
    uid,
    beforeData,
    event.data?.after?.exists ? afterData : null,
    now
  ).catch((error) => {
    console.error("Mise à jour de l'annuaire privé des accès impossible.", cleanText(error?.message || error));
  });
  const key = engagementMailRecipientIndexKey(uid);
  const capabilities = new Set([...(before?.capabilities || []), ...(after?.capabilities || [])]);
  if (capabilities.size) {
    const batch = db.batch();
    capabilities.forEach((capability) => {
      const shardNumber = engagementMailRecipientShardNumber(uid);
      const value = after?.capabilities?.includes(capability) ? after : FieldValue.delete();
      batch.set(engagementMailRecipientShardRef(db, capability, shardNumber), {
        capability,
        shardNumber,
        recipients: { [key]: value },
        generatedAt: now
      }, { merge: true });
    });
    await batch.commit();
    await updateEngagementClubAdminDirectory(db, before, after, now).catch((error) => {
      console.error("Mise à jour de l'annuaire privé des administrateurs impossible.", cleanText(error?.message || error));
    });
  }
  await snapshotSync;
  await syncNapClubAccountEmail(uid);
});

exports.rebuildEngagementMailRecipientIndexNextPage = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-competition-handlers.js#rebuildEngagementMailRecipientIndexNextPage#arrow */ async (request) => {
  return portalCompetitionHandlers().rebuildEngagementMailRecipientIndexNextPage(request);
});

/* extracted-function: functions/server-mail-service.js#engagementActiveClubMailRecipients */
async function engagementActiveClubMailRecipients(input0) {
  return serverMailService().engagementActiveClubMailRecipients(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailRecipientFromContext */
function engagementMailRecipientFromContext() {
  return serverMailService().engagementMailRecipientFromContext(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementDedupMailRecipients */
function engagementDedupMailRecipients() {
  return serverMailService().engagementDedupMailRecipients(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementCompetitionOpeningRecipients */
function engagementCompetitionOpeningRecipients() {
  return serverMailService().engagementCompetitionOpeningRecipients(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementCompetitionDocumentRecipients */
function engagementCompetitionDocumentRecipients() {
  return serverMailService().engagementCompetitionDocumentRecipients(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementCompetitionDocumentMailSubject */
function engagementCompetitionDocumentMailSubject() {
  return serverMailService().engagementCompetitionDocumentMailSubject(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementCompetitionDocumentMailText */
function engagementCompetitionDocumentMailText() {
  return serverMailService().engagementCompetitionDocumentMailText(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementCompetitionDocumentMailHtml */
function engagementCompetitionDocumentMailHtml() {
  return serverMailService().engagementCompetitionDocumentMailHtml(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementRecipientsByClub */
function engagementRecipientsByClub() {
  return serverMailService().engagementRecipientsByClub(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementOpeningMailSubject */
function engagementOpeningMailSubject() {
  return serverMailService().engagementOpeningMailSubject(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementOpeningMailText */
function engagementOpeningMailText() {
  return serverMailService().engagementOpeningMailText(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementClubRecapMailSubject */
function engagementClubRecapMailSubject() {
  return serverMailService().engagementClubRecapMailSubject(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementClubRecapMailText */
function engagementClubRecapMailText() {
  return serverMailService().engagementClubRecapMailText(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementTxtMailSubject */
function engagementTxtMailSubject() {
  return serverMailService().engagementTxtMailSubject(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementTxtMailText */
function engagementTxtMailText() {
  return serverMailService().engagementTxtMailText(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementOfficialsMailSubject */
function engagementOfficialsMailSubject() {
  return serverMailService().engagementOfficialsMailSubject(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementOfficialsMailText */
function engagementOfficialsMailText() {
  return serverMailService().engagementOfficialsMailText(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailJobItemFromData */
function engagementMailJobItemFromData() {
  return serverMailService().engagementMailJobItemFromData(...arguments);
}

/* extracted-function: functions/server-mail-service.js#upsertEngagementMailJob */
async function upsertEngagementMailJob() {
  return serverMailService().upsertEngagementMailJob(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailAttachments */
async function engagementMailAttachments() {
  return serverMailService().engagementMailAttachments(...arguments);
}

/* extracted-function: functions/server-mail-service.js#engagementMailWithNotificationPreferenceFooter */
function engagementMailWithNotificationPreferenceFooter() {
  return serverMailService().engagementMailWithNotificationPreferenceFooter(...arguments);
}

/* extracted-function: functions/server-mail-service.js#sendEngagementMailJob */
async function sendEngagementMailJob(input0, input1, input2, input3) {
  return serverMailService().sendEngagementMailJob(...arguments);
}

function serverClubPeopleService() {
  if (!serverClubPeopleService.instance) serverClubPeopleService.instance = require("./server-club-people-service").createClubPeopleService({
    get ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION; },
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get cleanEngagementClubActivityStatus() { return cleanEngagementClubActivityStatus; },
    get cleanEngagementEntryStatus() { return cleanEngagementEntryStatus; },
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get db() { return db; },
    get deleteEngagementClubRosterSwimmer() { return deleteEngagementClubRosterSwimmer; },
    get deleteEngagementEntryTimeCache() { return deleteEngagementEntryTimeCache; },
    get engagementClubRosterRef() { return engagementClubRosterRef; },
    get engagementClubRosterSwimmerItem() { return engagementClubRosterSwimmerItem; },
    get engagementClubRosterSwimmerKey() { return engagementClubRosterSwimmerKey; },
    get engagementLegacySwimmerLicensesByClub() { return engagementLegacySwimmerLicensesByClub; },
    get engagementLicenseSeasonState() { return engagementLicenseSeasonState; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get engagementSwimmerIdentityKey() { return engagementSwimmerIdentityKey; },
    get engagementSwimmerLicenseNumberKey() { return engagementSwimmerLicenseNumberKey; },
    get intranapSwimmersIndex() { return intranapSwimmersIndex; },
    get normalizePerformanceSearchText() { return normalizePerformanceSearchText; },
    get normalizedEngagementRegionKey() { return normalizedEngagementRegionKey; },
    get stableHash() { return stableHash; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; }
  });
  return serverClubPeopleService.instance;
}

/* extracted-function: functions/server-club-people-service.js#cleanEngagementClubPerson */
function cleanEngagementClubPerson() {
  return serverClubPeopleService().cleanEngagementClubPerson(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#engagementClubPersonItem */
function engagementClubPersonItem(input0) {
  return serverClubPeopleService().engagementClubPersonItem(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#engagementClubPeopleRosterId */
function engagementClubPeopleRosterId(input0) {
  return serverClubPeopleService().engagementClubPeopleRosterId(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#engagementClubPeopleRosterRef */
function engagementClubPeopleRosterRef(input0, input1) {
  return serverClubPeopleService().engagementClubPeopleRosterRef(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#engagementClubPeopleRosterPersonItem */
function engagementClubPeopleRosterPersonItem() {
  return serverClubPeopleService().engagementClubPeopleRosterPersonItem(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#engagementClubPeopleRosterPeopleFromData */
function engagementClubPeopleRosterPeopleFromData() {
  return serverClubPeopleService().engagementClubPeopleRosterPeopleFromData(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#engagementClubPersonIdentityConflict */
function engagementClubPersonIdentityConflict() {
  return serverClubPeopleService().engagementClubPersonIdentityConflict(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#throwEngagementClubPersonIdentityConflict */
function throwEngagementClubPersonIdentityConflict() {
  return serverClubPeopleService().throwEngagementClubPersonIdentityConflict(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#engagementClubPersonOutsideClubConflict */
async function engagementClubPersonOutsideClubConflict() {
  return serverClubPeopleService().engagementClubPersonOutsideClubConflict(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#upsertEngagementClubPeopleRosterPerson */
function upsertEngagementClubPeopleRosterPerson(input0, input1) {
  return serverClubPeopleService().upsertEngagementClubPeopleRosterPerson(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#deleteEngagementClubPeopleRosterPerson */
function deleteEngagementClubPeopleRosterPerson(input0, input1) {
  return serverClubPeopleService().deleteEngagementClubPeopleRosterPerson(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#rebuildEngagementClubPeopleRoster */
async function rebuildEngagementClubPeopleRoster(input0) {
  return serverClubPeopleService().rebuildEngagementClubPeopleRoster(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#syncEngagementClubPeopleRosterFromChange */
async function syncEngagementClubPeopleRosterFromChange() {
  return serverClubPeopleService().syncEngagementClubPeopleRosterFromChange(...arguments);
}

exports.syncEngagementClubPersonToRoster = onDocumentWritten({
  region: REGION,
  document: "engagementClubPeople/{personId}"
}, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  await syncEngagementClubPeopleRosterFromChange(event);
});

/* extracted-function: functions/server-club-people-service.js#engagementClubSwimmerItem */
function engagementClubSwimmerItem(input0) {
  return serverClubPeopleService().engagementClubSwimmerItem(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#engagementReferenceSwimmerItem */
function engagementReferenceSwimmerItem() {
  return serverClubPeopleService().engagementReferenceSwimmerItem(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#engagementReferenceClubSwimmers */
function engagementReferenceClubSwimmers() {
  return serverClubPeopleService().engagementReferenceClubSwimmers(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#sortEngagementClubSwimmers */
function sortEngagementClubSwimmers() {
  return serverClubPeopleService().sortEngagementClubSwimmers(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#engagementClubSwimmerMatchKeys */
function engagementClubSwimmerMatchKeys() {
  return serverClubPeopleService().engagementClubSwimmerMatchKeys(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#engagementClubSwimmerSourceRank */
function engagementClubSwimmerSourceRank() {
  return serverClubPeopleService().engagementClubSwimmerSourceRank(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#mergeEngagementClubSwimmerItems */
function mergeEngagementClubSwimmerItems() {
  return serverClubPeopleService().mergeEngagementClubSwimmerItems(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#uniqueEngagementClubSwimmers */
function uniqueEngagementClubSwimmers() {
  return serverClubPeopleService().uniqueEngagementClubSwimmers(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#rebuildEngagementClubRoster */
async function rebuildEngagementClubRoster(input0) {
  return serverClubPeopleService().rebuildEngagementClubRoster(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#syncEngagementClubRosterFromSwimmerChange */
async function syncEngagementClubRosterFromSwimmerChange() {
  return serverClubPeopleService().syncEngagementClubRosterFromSwimmerChange(...arguments);
}

exports.syncPerformanceSwimmerToEngagementClubRoster = onDocumentWritten({
  region: REGION,
  document: `${PERFORMANCE_SWIMMERS_COLLECTION}/{swimmerIndexId}`
}, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  await syncEngagementClubRosterFromSwimmerChange(event, "performances");
});

exports.syncEngagementClubSwimmerToRoster = onDocumentWritten({
  region: REGION,
  document: "engagementClubSwimmers/{swimmerId}"
}, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  await syncEngagementClubRosterFromSwimmerChange(event, "engagement");
});

/* extracted-function: functions/server-club-people-service.js#reactivateEngagementClubRosterSwimmersFromPerformanceRows */
async function reactivateEngagementClubRosterSwimmersFromPerformanceRows() {
  return serverClubPeopleService().reactivateEngagementClubRosterSwimmersFromPerformanceRows(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#cleanIsoDateTime */
function cleanIsoDateTime(input0) {
  return serverClubPeopleService().cleanIsoDateTime(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#cleanEngagementDeadlineAt */
function cleanEngagementDeadlineAt(input0) {
  return serverClubPeopleService().cleanEngagementDeadlineAt(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#isEngagementOpeningDeadlinePast */
function isEngagementOpeningDeadlinePast(input0, input1) {
  return serverClubPeopleService().isEngagementOpeningDeadlinePast(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#isEngagementOpeningTooEarly */
function isEngagementOpeningTooEarly(input0, input1) {
  return serverClubPeopleService().isEngagementOpeningTooEarly(...arguments);
}

/* extracted-function: functions/server-club-people-service.js#cleanEngagementRegionIds */
function cleanEngagementRegionIds() {
  return serverClubPeopleService().cleanEngagementRegionIds(...arguments);
}

function serverCompetitionService() {
  if (!serverCompetitionService.instance) serverCompetitionService.instance = require("./server-competition-service").createCompetitionService({
    get CLUB_REFERENCE_REGION_LABELS() { return CLUB_REFERENCE_REGION_LABELS; },
    get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
    get ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX() { return ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX; },
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get ENGAGEMENT_MAIL_CAPABILITIES() { return ENGAGEMENT_MAIL_CAPABILITIES; },
    get ENGAGEMENT_MAIL_JOBS_COLLECTION() { return ENGAGEMENT_MAIL_JOBS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get OPTIONAL_COMPETITION_MAIL_TYPES() { return OPTIONAL_COMPETITION_MAIL_TYPES; },
    get REGION() { return REGION; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get birthYear() { return birthYear; },
    get buildEngagementClubRecapPdf() { return buildEngagementClubRecapPdf; },
    get buildEngagementCompetitionTxt() { return buildEngagementCompetitionTxt; },
    get buildEngagementOfficialsPdf() { return buildEngagementOfficialsPdf; },
    get cleanEngagementCalendarEventPayload() { return cleanEngagementCalendarEventPayload; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionLevel() { return cleanEngagementCompetitionLevel; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementDeadlineAt() { return cleanEngagementDeadlineAt; },
    get cleanEngagementEntryStatus() { return cleanEngagementEntryStatus; },
    get cleanEngagementFees() { return cleanEngagementFees; },
    get cleanEngagementGeneratedFiles() { return cleanEngagementGeneratedFiles; },
    get cleanEngagementMaxEventsPerSwimmer() { return cleanEngagementMaxEventsPerSwimmer; },
    get cleanEngagementMissingEntryTimeMode() { return cleanEngagementMissingEntryTimeMode; },
    get cleanEngagementPoolLaneCount() { return cleanEngagementPoolLaneCount; },
    get cleanEngagementPoolLength() { return cleanEngagementPoolLength; },
    get cleanEngagementProgramSessions() { return cleanEngagementProgramSessions; },
    get cleanEngagementQualificationTimesMode() { return cleanEngagementQualificationTimesMode; },
    get cleanEngagementRegionIds() { return cleanEngagementRegionIds; },
    get cleanEngagementTimingType() { return cleanEngagementTimingType; },
    get cleanEngagementWaterBodyType() { return cleanEngagementWaterBodyType; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanIsoDateTime() { return cleanIsoDateTime; },
    get cleanOptionalEmail() { return cleanOptionalEmail; },
    get cleanPublicCalendarWhatsAppUrl() { return cleanPublicCalendarWhatsAppUrl; },
    get cleanText() { return cleanText; },
    get competitionDocumentDownloadUrl() { return competitionDocumentDownloadUrl; },
    get competitionYear() { return competitionYear; },
    get crypto() { return crypto; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementActiveClubMailRecipients() { return engagementActiveClubMailRecipients; },
    get engagementActiveMailRecipients() { return engagementActiveMailRecipients; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementClubRecapMailSubject() { return engagementClubRecapMailSubject; },
    get engagementClubRecapMailText() { return engagementClubRecapMailText; },
    get engagementClubRosterRef() { return engagementClubRosterRef; },
    get engagementClubRosterSwimmersFromData() { return engagementClubRosterSwimmersFromData; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementCompetitionDocumentMailSubject() { return engagementCompetitionDocumentMailSubject; },
    get engagementCompetitionDocumentMailText() { return engagementCompetitionDocumentMailText; },
    get engagementCompetitionDocumentRecipients() { return engagementCompetitionDocumentRecipients; },
    get engagementCompetitionNotificationRecipients() { return engagementCompetitionNotificationRecipients; },
    get engagementCompetitionOpeningRecipients() { return engagementCompetitionOpeningRecipients; },
    get engagementDedupMailRecipients() { return engagementDedupMailRecipients; },
    get engagementMailAttachments() { return engagementMailAttachments; },
    get engagementMailJobId() { return engagementMailJobId; },
    get engagementMailPreparedStatus() { return engagementMailPreparedStatus; },
    get engagementMailRecipientFromContext() { return engagementMailRecipientFromContext; },
    get engagementMailRecipientFromUserDoc() { return engagementMailRecipientFromUserDoc; },
    get engagementMailRecipientIndexStateRef() { return engagementMailRecipientIndexStateRef; },
    get engagementMailRecipientsFromIndex() { return engagementMailRecipientsFromIndex; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get engagementOfficialsMailSubject() { return engagementOfficialsMailSubject; },
    get engagementOfficialsMailText() { return engagementOfficialsMailText; },
    get engagementOfficialsPdfRows() { return engagementOfficialsPdfRows; },
    get engagementOpeningMailSubject() { return engagementOpeningMailSubject; },
    get engagementOpeningMailText() { return engagementOpeningMailText; },
    get engagementPdfFileName() { return engagementPdfFileName; },
    get engagementRecipientHasCapability() { return engagementRecipientHasCapability; },
    get engagementRecipientsByClub() { return engagementRecipientsByClub; },
    get engagementRegionsMatch() { return engagementRegionsMatch; },
    get engagementTxtMailSubject() { return engagementTxtMailSubject; },
    get engagementTxtMailText() { return engagementTxtMailText; },
    get engagementTxtSwimmerCategory() { return engagementTxtSwimmerCategory; },
    get getAuth() { return getAuth; },
    get getOrCreateEngagementClubRecapPdf() { return getOrCreateEngagementClubRecapPdf; },
    get getOrCreateEngagementCompetitionTxt() { return getOrCreateEngagementCompetitionTxt; },
    get getOrCreateEngagementOfficialsPdf() { return getOrCreateEngagementOfficialsPdf; },
    get importSeasonYear() { return importSeasonYear; },
    get isEngagementOpeningDeadlinePast() { return isEngagementOpeningDeadlinePast; },
    get isEngagementOpeningTooEarly() { return isEngagementOpeningTooEarly; },
    get isNationalOnlyEngagementCompetitionLevel() { return isNationalOnlyEngagementCompetitionLevel; },
    get livePalmesMailHtml() { return livePalmesMailHtml; },
    get nodemailer() { return nodemailer; },
    get normalizeEmail() { return normalizeEmail; },
    get sendEngagementMailJob() { return sendEngagementMailJob; },
    get storage() { return storage; },
    get upsertEngagementMailJob() { return upsertEngagementMailJob; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return serverCompetitionService.instance;
}

/* extracted-function: functions/server-competition-service.js#cleanEngagementCompetitionPayload */
function cleanEngagementCompetitionPayload() {
  return serverCompetitionService().cleanEngagementCompetitionPayload(...arguments);
}

/* extracted-function: functions/server-competition-service.js#assertCanManageEngagementCompetition */
function assertCanManageEngagementCompetition() {
  return serverCompetitionService().assertCanManageEngagementCompetition(...arguments);
}

/* extracted-function: functions/server-competition-service.js#engagementParisIsoDate */
function engagementParisIsoDate() {
  return serverCompetitionService().engagementParisIsoDate(...arguments);
}

/* extracted-function: functions/server-competition-service.js#engagementEventIsPast */
function engagementEventIsPast() {
  return serverCompetitionService().engagementEventIsPast(...arguments);
}

/* extracted-function: functions/server-competition-service.js#assertCanModifyEngagementEvent */
function assertCanModifyEngagementEvent() {
  return serverCompetitionService().assertCanModifyEngagementEvent(...arguments);
}

/* extracted-function: functions/server-competition-service.js#assertCanDeleteEngagementDocument */
function assertCanDeleteEngagementDocument() {
  return serverCompetitionService().assertCanDeleteEngagementDocument(...arguments);
}

/* extracted-function: functions/server-competition-service.js#engagementDeletionRequestId */
function engagementDeletionRequestId() {
  return serverCompetitionService().engagementDeletionRequestId(...arguments);
}

/* extracted-function: functions/server-competition-service.js#engagementClubWriteLockReason */
function engagementClubWriteLockReason() {
  return serverCompetitionService().engagementClubWriteLockReason(...arguments);
}

/* extracted-function: functions/server-competition-service.js#assertEngagementClubWriteOpen */
function assertEngagementClubWriteOpen() {
  return serverCompetitionService().assertEngagementClubWriteOpen(...arguments);
}

/* extracted-function: functions/server-competition-service.js#nativePortalCalendarItems */
async function nativePortalCalendarItems(input0) {
  return serverCompetitionService().nativePortalCalendarItems(...arguments);
}

/* extracted-function: functions/server-competition-service.js#nativeDocumentAuthors */
async function nativeDocumentAuthors(input0) {
  return serverCompetitionService().nativeDocumentAuthors(...arguments);
}
/* extracted-function: functions/server-competition-service.js#nativePortalCompetition */
async function nativePortalCompetition(input0, input1) {
  return serverCompetitionService().nativePortalCompetition(...arguments);
}
/* extracted-function: functions/server-competition-service.js#createNativePortalCalendarRecord */
async function createNativePortalCalendarRecord(input0, input1, input2) {
  return serverCompetitionService().createNativePortalCalendarRecord(...arguments);
}

/* extracted-function: functions/server-competition-service.js#nativeClubEntryView */
async function nativeClubEntryView(input0, input1, input2) {
  return serverCompetitionService().nativeClubEntryView(...arguments);
}

exports.listEngagementCompetitions = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#listEngagementCompetitions#arrow */ async (request) => {
  return portalCompetitionHandlers().listEngagementCompetitions(request);
});

exports.listEngagementCalendarEvents = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#listEngagementCalendarEvents#arrow */ async (request) => {
  return portalCompetitionHandlers().listEngagementCalendarEvents(request);
});

exports.getEngagementCalendarEvent = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#getEngagementCalendarEvent#arrow */ async (request) => {
  return portalCompetitionHandlers().getEngagementCalendarEvent(request);
});

exports.createEngagementCalendarEvent = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4, timeoutSeconds:120 } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#createEngagementCalendarEvent#arrow */ async (request) => {
  return portalCompetitionHandlers().createEngagementCalendarEvent(request);
});

exports.updateEngagementCalendarEvent = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4, timeoutSeconds:120 } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#updateEngagementCalendarEvent#arrow */ async (request) => {
  return portalCompetitionHandlers().updateEngagementCalendarEvent(request);
});

exports.deleteEngagementCalendarEvent = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#deleteEngagementCalendarEvent#arrow */ async (request) => {
  return portalCompetitionHandlers().deleteEngagementCalendarEvent(request);
});

exports.listEngagementOpenWaterCourses = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#listEngagementOpenWaterCourses#arrow */ async (request) => {
  return portalCompetitionHandlers().listEngagementOpenWaterCourses(request);
});

exports.addEngagementOpenWaterCourse = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#addEngagementOpenWaterCourse#arrow */ async (request) => {
  return portalCompetitionHandlers().addEngagementOpenWaterCourse(request);
});

exports.setEngagementOpenWaterCourseStatus = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#setEngagementOpenWaterCourseStatus#arrow */ async (request) => {
  return portalCompetitionHandlers().setEngagementOpenWaterCourseStatus(request);
});

exports.getEngagementCompetition = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#getEngagementCompetition#arrow */ async (request) => {
  return portalCompetitionHandlers().getEngagementCompetition(request);
});

/* extracted-function: functions/server-competition-service.js#engagementCompetitionDocumentUploader */
function engagementCompetitionDocumentUploader() {
  return serverCompetitionService().engagementCompetitionDocumentUploader(...arguments);
}

/* extracted-function: functions/server-competition-service.js#assertEngagementCompetitionDocumentPath */
function assertEngagementCompetitionDocumentPath() {
  return serverCompetitionService().assertEngagementCompetitionDocumentPath(...arguments);
}

/* extracted-function: functions/server-competition-service.js#hasManagedEngagementCompetitionDocumentStorage */
function hasManagedEngagementCompetitionDocumentStorage() {
  return serverCompetitionService().hasManagedEngagementCompetitionDocumentStorage(...arguments);
}

/* extracted-function: functions/server-competition-service.js#engagementCompetitionDocumentContext */
async function engagementCompetitionDocumentContext(input0) {
  return serverCompetitionService().engagementCompetitionDocumentContext(...arguments);
}

// National document selection. No client-supplied role or actor is authoritative.
exports.getNationalFeaturedDocuments = onCall({ ...CALLABLE_OPTIONS, secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD")] }, /* extracted-handler: functions/portal-national-handlers.js#getNationalFeaturedDocuments#arrow */ async (request) => {
  return portalNationalHandlers().getNationalFeaturedDocuments(request);
});
exports.saveNationalFeaturedDocuments = onCall({ ...ENGAGEMENT_DOCUMENT_UPLOAD_OPTIONS, secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD")] }, /* extracted-handler: functions/portal-national-handlers.js#saveNationalFeaturedDocuments#arrow */ async (request) => {
  return portalNationalHandlers().saveNationalFeaturedDocuments(request);
});
// End national document selection.
/* extracted-function: functions/server-competition-service.js#nationalLibraryContext */
async function nationalLibraryContext(input0) {
  return serverCompetitionService().nationalLibraryContext(...arguments);
}
/* extracted-function: functions/server-competition-service.js#manageNationalLibraryDocuments */
async function manageNationalLibraryDocuments(input0) {
  return serverCompetitionService().manageNationalLibraryDocuments(...arguments);
}
/* extracted-function: functions/server-competition-service.js#notifyNationalLibraryDocument */
async function notifyNationalLibraryDocument(input0) {
  return serverCompetitionService().notifyNationalLibraryDocument(...arguments);
}
/* extracted-function: functions/server-competition-service.js#mutateNativeCompetitionDocument */
async function mutateNativeCompetitionDocument(input0, input1) {
  return serverCompetitionService().mutateNativeCompetitionDocument(...arguments);
}
exports.uploadEngagementCompetitionDocument = onCall({ ...ENGAGEMENT_DOCUMENT_UPLOAD_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#uploadEngagementCompetitionDocument#arrow */ async (request) => {
  return portalCompetitionHandlers().uploadEngagementCompetitionDocument(request);
});

exports.updateEngagementCompetitionDocument = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#updateEngagementCompetitionDocument#arrow */ async (request) => {
  return portalCompetitionHandlers().updateEngagementCompetitionDocument(request);
});

exports.deleteEngagementCompetitionDocument = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#deleteEngagementCompetitionDocument#arrow */ async (request) => {
  return portalCompetitionHandlers().deleteEngagementCompetitionDocument(request);
});

exports.previewEngagementCompetitionDocumentNotification = onCall(ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, /* extracted-handler: functions/portal-competition-handlers.js#previewEngagementCompetitionDocumentNotification#arrow */ async (request) => {
  return portalCompetitionHandlers().previewEngagementCompetitionDocumentNotification(request);
});

exports.notifyEngagementCompetitionDocuments = onCall(ENVIRONMENT.sportingDataSource === "nap" ? (ENVIRONMENT.projectId === "livepalmes-test" ? ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS : { ...ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, timeoutSeconds:300, secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD"),...ENGAGEMENT_NOTIFICATION_MAIL_SECRETS] }) : ENGAGEMENT_MAIL_CALLABLE_OPTIONS, async (request) => {
  if(request.data?.library===true)return notifyNationalLibraryDocument(request);
  if (ENVIRONMENT.sportingDataSource === "nap") return queueNativeDocumentNotification(request);
  const { context, competitionId, snapshot } = await engagementCompetitionDocumentContext(request);
  const competition = engagementCompetitionDetailItem(snapshot);
  const documentIds = Array.from(new Set((Array.isArray(request.data?.documentIds) ? request.data.documentIds : [])
    .map((id) => cleanText(id).slice(0, 80))
    .filter(Boolean))).slice(0, MAX_COMPETITION_DOCUMENTS);
  const documents = cleanCompetitionDocuments(snapshot.data()?.clubDocuments || [])
    .filter((document) => documentIds.includes(document.id));
  if (!documents.length || documents.length !== documentIds.length) {
    throw new HttpsError("invalid-argument", "Documents à notifier introuvables.");
  }
  const recipients = engagementCompetitionDocumentRecipients(
    await engagementActiveClubMailRecipients(db),
    competition
  );
  const notificationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const subject = engagementCompetitionDocumentMailSubject(competition, documents);
  const text = engagementCompetitionDocumentMailText(competition, documents);
  const html = engagementCompetitionDocumentMailHtml(competition, documents);
  const preparedJobs = [];
  for (let offset = 0; offset < recipients.length; offset += 25) {
    const chunk = recipients.slice(offset, offset + 25);
    const chunkJobs = await Promise.all(chunk.map(async (recipient) => {
      const payload = {
        type: "competition_documents",
        notificationId,
        competitionId,
        competitionName: competition.name,
        clubId: recipient.clubId,
        clubName: recipient.clubName,
        regionId: recipient.regionId,
        toEmail: recipient.email,
        toName: [recipient.firstName, recipient.lastName].filter(Boolean).join(" "),
        recipientUid: recipient.uid,
        subject,
        text,
        html
      };
      const item = await upsertEngagementMailJob(payload, now);
      return item ? {
        item,
        data: {
          ...payload,
          status: engagementMailPreparedStatus(),
          textBody: text,
          htmlBody: html,
          createdAt: now,
          updatedAt: now
        }
      } : null;
    }));
    preparedJobs.push(...chunkJobs.filter(Boolean));
  }
  const config = engagementMailSmtpConfig();
  let sentCount = 0;
  let errorCount = 0;
  if (config.ready && preparedJobs.length) {
    const transporter = nodemailer.createTransport({
      ...config.transport,
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });
    for (let offset = 0; offset < preparedJobs.length; offset += 5) {
      const results = await Promise.all(preparedJobs.slice(offset, offset + 5).map(({ item, data }) =>
        sendEngagementMailJob(transporter, {
          id: item.id,
          ref: db.collection(ENGAGEMENT_MAIL_JOBS_COLLECTION).doc(item.id),
          data: () => data
        }, config, context)
      ));
      sentCount += results.filter((job) => job.status === "sent").length;
      errorCount += results.filter((job) => job.status === "failed").length;
    }
    await transporter.close();
  }
  await writeAuditLog("engagementCompetition.documentsNotified", context.uid, {
    competitionId,
    notificationId,
    documentIds,
    documentCount: documents.length,
    recipientCount: recipients.length,
    sentCount,
    errorCount,
    configurationMissing: !config.ready
  });
  return {
    ok: true,
    competitionId,
    notificationId,
    documentCount: documents.length,
    recipientCount: recipients.length,
    clubCount: new Set(recipients.map((recipient) => cleanText(recipient.clubId)).filter(Boolean)).size,
    sentCount,
    errorCount,
    configurationMissing: !config.ready
  };
});

exports.getEngagementClubEntry = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#getEngagementClubEntry#arrow */ async (request) => {
  return portalClubHandlers().getEngagementClubEntry(request);
});

exports.preloadEngagementClubWorkspaces = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  // Native workspaces are read when actually opened. Prefetch must neither
  // consult the abandoned sports collections nor hide an IntraNAP edit.
  if (ENVIRONMENT.sportingDataSource === "nap") return { ok: true, source: "nap", workspaces: [] };
  const competitionIds = Array.from(new Set(
    (Array.isArray(request.data?.competitionIds) ? request.data.competitionIds : [])
      .map((competitionId) => cleanText(competitionId).slice(0, 128))
      .filter(Boolean)
  )).slice(0, 4);
  if (!competitionIds.length) {
    return {
      ok: true,
      workspaces: [],
      readStats: portalReadStats("preloadEngagementClubWorkspaces", startedAt, {
        baseDocuments: 1,
        variableDocumentsMax: 0,
        cacheHit: false
      })
    };
  }
  const refs = competitionIds.flatMap((competitionId) => [
    db.collection("engagementCompetitions").doc(competitionId),
    db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId))
  ]);
  const snapshots = await db.getAll(...refs);
  const workspaces = competitionIds.flatMap((competitionId, index) => {
    const competition = snapshots[index * 2];
    const entry = snapshots[index * 2 + 1];
    if (!competition?.exists) return [];
    return [{
      competitionId,
      competition: engagementCompetitionDetailItem(competition),
      entry: engagementClubEntryItem(entry, {
        competitionId,
        clubId: context.clubId,
        clubName: context.clubName,
        regionId: context.regionId,
        status: "active"
      })
    }];
  });
  return {
    ok: true,
    workspaces,
    readStats: portalReadStats("preloadEngagementClubWorkspaces", startedAt, {
      baseDocuments: 1 + refs.length,
      variableDocumentsMax: 0,
      cacheHit: false
    })
  };
});

// TEST recap is generated directly from the trusted native dossier. No sports
// Firestore read, saved PDF cache or Storage write: <=14+1 documents+8 bounded SQL reads.
/* extracted-function: functions/server-competition-service.js#generateNativeClubRecapPdf */
async function generateNativeClubRecapPdf(input0, input1) {
  return serverCompetitionService().generateNativeClubRecapPdf(...arguments);
}

exports.generateEngagementClubRecapPdf = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#generateEngagementClubRecapPdf#arrow */ async (request) => {
  return portalClubHandlers().generateEngagementClubRecapPdf(request);
});

/* extracted-function: functions/server-competition-service.js#nativeAdminCompetitionEntries */
async function nativeAdminCompetitionEntries(input0, input1) {
  return serverCompetitionService().nativeAdminCompetitionEntries(...arguments);
}
/* extracted-function: functions/server-competition-service.js#nativeNotificationPreview */
async function nativeNotificationPreview(input0, input1) {
  return serverCompetitionService().nativeNotificationPreview(...arguments);
}
// Reuse the queue and builders. Preview retains manifests only; delivery is
// explicitly selected and gated by the national setting on TEST.
/* extracted-function: functions/server-competition-service.js#nativeNotificationAutomationServices */
function nativeNotificationAutomationServices() {
  return serverCompetitionService().nativeNotificationAutomationServices(...arguments);
}
/* extracted-function: functions/server-competition-service.js#nativeNotificationTaskServices */
function nativeNotificationTaskServices() {
  return serverCompetitionService().nativeNotificationTaskServices(...arguments);
}
/* extracted-function: functions/server-competition-service.js#enqueueNativeNotificationTask */
async function enqueueNativeNotificationTask(input0) {
  return serverCompetitionService().enqueueNativeNotificationTask(...arguments);
}
exports.processNapNotificationTask = onTaskDispatched({region:REGION,
  timeoutSeconds:540,memory:'1GiB',concurrency:1,maxInstances:1,
  retryConfig:{maxAttempts:3,minBackoffSeconds:60,maxBackoffSeconds:300},
  rateLimits:{maxConcurrentDispatches:1,maxDispatchesPerSecond:1},
  secrets:[defineSecret('LIVEPALMES_NAP_PASSWORD'),...ENGAGEMENT_NOTIFICATION_MAIL_SECRETS]
},async request=>{
  if(request.data?.probe===true&&ENVIRONMENT.projectId==='livepalmes-test'){
    console.info('notification-task-test-probe',{requestedAt:request.data.requestedAt,handledAt:new Date().toISOString(),mailsSent:0});return;
  }
  await require('./nap-notification-task').run(db,String(request.data?.eventId||''),nativeNotificationTaskServices());
});
/* extracted-function: functions/server-competition-service.js#deliverNativeNotificationJobs */
async function deliverNativeNotificationJobs() {
  return serverCompetitionService().deliverNativeNotificationJobs(...arguments);
}
/* extracted-function: functions/server-competition-service.js#armNativeCompetitionNotification */
async function armNativeCompetitionNotification(input0, input1, input2) {
  return serverCompetitionService().armNativeCompetitionNotification(...arguments);
}
/* extracted-function: functions/server-competition-service.js#queueNativeDocumentNotification */
async function queueNativeDocumentNotification(input0) {
  return serverCompetitionService().queueNativeDocumentNotification(...arguments);
}
exports.processNapCompetitionNotifications = onCall({ ...ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS,secrets:[defineSecret('LIVEPALMES_NAP_PASSWORD'),...ENGAGEMENT_NOTIFICATION_MAIL_SECRETS],timeoutSeconds:300,memory:'1GiB' },async request=>{
  if(ENVIRONMENT.sportingDataSource !== "nap")throw new HttpsError('failed-precondition','Source NAP requise.');
  const context=await engagementAccessContext(request),automation=require('./nap-notification-automation');
  try{
    if(request.data?.action==='adopt-open-season'){
      if(!context.national)throw new HttpsError('permission-denied','Reprise reservee au niveau national.');
      return await automation.adoptOpenCompetitions(db,{season:request.data.season,offset:request.data.offset},{
        authorize:async()=>{},schedule:enqueueNativeNotificationTask,season:async year=>{const pack=await require('./nap-portal-competitions').readNativeCompetitionSeason(require('./nap-portal-swimmers').portalPool(process.env.LIVEPALMES_NAP_PASSWORD),year);return {...pack,events:pack.events.map(event=>({...event,id:String(require('./nap-direct-calendar').positiveId(event.id))}))};}});
    }
    if(!['process','restart'].includes(request.data?.action))throw new TypeError('Action de notification inconnue.');
    const competitionId=String(require('./nap-direct-calendar').positiveId(request.data.competitionId));
    await nativePortalCompetition(competitionId,event=>assertCanManageEngagementCompetition(context,event));
    const snapshot=await db.collection(automation.COLLECTION).where('competitionId','==',competitionId).limit(101).get();
    if(snapshot.size>100)throw new RangeError('Historique technique trop volumineux : maintenance requise.');
    const now=new Date().toISOString(),services=nativeNotificationAutomationServices(false),results=[];
    const pointer=snapshot.docs.find(doc=>doc.id===`nap-state-${competitionId}`)?.data()||{};
    const events=snapshot.docs.filter(doc=>doc.data().source==='nap'&&['opening','closure','documents'].includes(doc.data().kind)&&automation.currentEvent(doc.data(),pointer));
    const blocked=events.filter(doc=>doc.data().status==='blocked');
    if(request.data.action==='restart'){
      const results=[];
      for(const doc of blocked.slice(0,2))results.push(await automation.resumeBlocked(db,doc.ref,services,now));
      return {ok:true,disabled:true,sentCount:0,resumedCount:results.filter(result=>result.resumed).length,remaining:Math.max(0,blocked.length-results.length)};
    }
    if(blocked.length)throw new TypeError('Preparation interrompue apres une modification NAP. Une reprise explicite est necessaire.');
    // Explicit maintenance of an already managed competition also arms its
    // future closure. It neither replays an opening nor prepares mail early.
    const future=events.filter(doc=>doc.data().kind==='closure'&&doc.data().automatic&&doc.data().deliveryMode==='bcc-v1'&&doc.data().status==='pending'&&doc.data().runAt>now),schedules=[];
    for(const doc of future.slice(0,2))schedules.push(await enqueueNativeNotificationTask(doc.id));
    const due=events.filter(doc=>doc.data().runAt&&doc.data().runAt<=now&&!['completed','cancelled'].includes(doc.data().status)).sort((a,b)=>a.data().runAt.localeCompare(b.data().runAt));
    for(const doc of due.slice(0,2))results.push(doc.data().deliveryMode==='bcc-v1'?await enqueueNativeNotificationTask(doc.id):await automation.processEvent(db,doc.ref,services,now));
    const delivery=await deliverNativeNotificationJobs(competitionId);
    return {ok:true,source:'nap',disabled:false,scheduledCount:schedules.filter(result=>result.queued).length,schedulingPending:future.length-schedules.filter(result=>result.queued).length,sentCount:delivery.sent,processedCount:results.length,jobCount:results.reduce((sum,result)=>sum+(result.jobCount||0),0),attachmentCount:results.reduce((sum,result)=>sum+(result.attachmentCount||0),0),remaining:Math.max(0,due.length-results.filter(result=>result.done||result.skipped).length)};
  }catch(error){if(error instanceof HttpsError)throw error;throw new HttpsError(error instanceof TypeError?'failed-precondition':error instanceof RangeError?'resource-exhausted':'unavailable',error instanceof TypeError||error instanceof RangeError?error.message:'Preparation NAP interrompue : vous pouvez reprendre le traitement.');}
});
exports.listEngagementCompetitionClubRecaps = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#listEngagementCompetitionClubRecaps#arrow */ async (request) => {
  return portalClubHandlers().listEngagementCompetitionClubRecaps(request);
});

function competitionStatistics() {
  if (!competitionStatistics.instance) competitionStatistics.instance = require("./engagement-competition-statistics").createCompetitionStatistics({
    ageCategoryFromDates,
    cleanText,
    engagementClubCode,
    engagementClubEntryHasParticipants,
    engagementClubName,
    engagementPdfEventLabel,
    normalizeCourseCode
  });
  return competitionStatistics.instance;
}

/* extracted-function: functions/engagement-competition-statistics.js#engagementCompetitionStatisticsItem */
function engagementCompetitionStatisticsItem() {
  return competitionStatistics().engagementCompetitionStatisticsItem(...arguments);
}

exports.getEngagementCompetitionStatistics = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#getEngagementCompetitionStatistics#arrow */ async (request) => {
  return portalCompetitionHandlers().getEngagementCompetitionStatistics(request);
});

exports.generateEngagementClubRecapPdfForAdmin = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#generateEngagementClubRecapPdfForAdmin#arrow */ async (request) => {
  return portalClubHandlers().generateEngagementClubRecapPdfForAdmin(request);
});

exports.generateEngagementCompetitionClubRecapPdfs = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#generateEngagementCompetitionClubRecapPdfs#arrow */ async (request) => {
  return portalClubHandlers().generateEngagementCompetitionClubRecapPdfs(request);
});

exports.generateEngagementCompetitionTxtExport = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#generateEngagementCompetitionTxtExport#arrow */ async (request) => {
  return portalCompetitionHandlers().generateEngagementCompetitionTxtExport(request);
});

exports.listEngagementCompetitionMailJobs = onCall(ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  let competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  if (ENVIRONMENT.sportingDataSource === "nap") {
    competitionId=String(require('./nap-direct-calendar').positiveId(competitionId));
    await nativePortalCompetition(competitionId, event => assertCanManageEngagementCompetition(context, event));
  } else {
    const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) throw new HttpsError("not-found", "Competition d'engagements introuvable.");
    assertCanManageEngagementCompetition(context, competition.data() || {});
  }
  const pageSize = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.pageSize) || 100)));
  const cursor = request.data?.cursor && typeof request.data.cursor === "object" ? request.data.cursor : {};
  const documentId = FieldPath.documentId();
  let jobsQuery = db.collection(ENGAGEMENT_MAIL_JOBS_COLLECTION)
    .where("competitionId", "==", competitionId)
    .orderBy("updatedAt", "desc")
    .orderBy(documentId, "desc");
  if (cleanText(cursor.id) && typeof cursor.updatedAt === "string") {
    jobsQuery = jobsQuery.startAfter(cursor.updatedAt, cleanText(cursor.id));
  }
  const [snapshot, totalSnapshot] = await Promise.all([
    jobsQuery.limit(pageSize + 1).get(),
    cleanText(cursor.id)
      ? Promise.resolve(null)
      : db.collection(ENGAGEMENT_MAIL_JOBS_COLLECTION).where("competitionId", "==", competitionId).count().get()
  ]);
  const pageDocuments = snapshot.docs.slice(0, pageSize);
  const control=require('./engagement-mail-control'),setting=await control.read(db);
  const jobs = pageDocuments
    .filter(doc=>ENVIRONMENT.sportingDataSource !== "nap"||doc.data().source==='nap')
    .map(doc=>{
      const data=doc.data()||{};
      const gate=control.decision(setting,data,ENVIRONMENT.projectId);
      return engagementMailJobItemFromData({...data,
        ...(['ready','pending'].includes(data.status)&&!gate.allowed?{status:'cancelled',reason:gate.reason}:{}),
        ...(ENVIRONMENT.projectId==='livepalmes-test'?{toEmail:control.TEST_ADDRESS}:{})},doc.id);
    })
    .sort((left, right) => cleanText(right.updatedAt).localeCompare(cleanText(left.updatedAt)) || cleanText(left.toEmail).localeCompare(cleanText(right.toEmail)));
  const lastDocument = pageDocuments.at(-1);
  return {
    ok: true,
    competitionId,
    collection: ENGAGEMENT_MAIL_JOBS_COLLECTION,
    jobs,
    totalCount: totalSnapshot ? Math.max(0, Number(totalSnapshot.data()?.count || 0)) : null,
    hasMore: snapshot.size > pageSize,
    nextCursor: snapshot.size > pageSize && lastDocument ? {
      updatedAt: cleanText(lastDocument.get("updatedAt")).slice(0, 40),
      id: lastDocument.id
    } : null
  };
});

exports.prepareEngagementOpeningNotificationEmails = onCall(ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return nativeNotificationPreview(request, "opening");
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competitionSnapshot = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competitionSnapshot.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competitionSnapshot.data() || {});
  const competition = engagementCompetitionDetailItem(competitionSnapshot);
  const recipients = engagementCompetitionOpeningRecipients(
    await engagementActiveMailRecipients(db),
    competition,
    [engagementMailRecipientFromContext(context)].filter(Boolean)
  );
  const now = new Date().toISOString();
  const jobs = [];
  for (const recipient of recipients) {
    const job = await upsertEngagementMailJob({
      type: "opening_notification",
      competitionId,
      competitionName: competition.name,
      clubId: recipient.clubId,
      clubName: recipient.clubName,
      regionId: recipient.regionId,
      toEmail: recipient.email,
      toName: [recipient.firstName, recipient.lastName].filter(Boolean).join(" "),
      recipientUid: recipient.uid,
      subject: engagementOpeningMailSubject(competition),
      text: engagementOpeningMailText(competition)
    }, now);
    if (job) jobs.push(job);
  }
  await writeAuditLog("engagementCompetition.openingEmailsPrepared", context.uid, {
    competitionId,
    recipientCount: recipients.length,
    jobCount: jobs.length,
    mailStatus: "ready"
  });
  return {
    ok: true,
    competitionId,
    recipientCount: recipients.length,
    jobCount: jobs.length,
    jobs
  };
});

/* extracted-function: functions/server-competition-service.js#prepareEngagementClubRecapEmailJobs */
async function prepareEngagementClubRecapEmailJobs(input0, input1) {
  return serverCompetitionService().prepareEngagementClubRecapEmailJobs(...arguments);
}

exports.prepareEngagementClubRecapEmails = onCall(ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return nativeNotificationPreview(request, "club_recaps");
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competitionSnapshot = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competitionSnapshot.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competitionSnapshot.data() || {});
  const result = await prepareEngagementClubRecapEmailJobs(db, competitionSnapshot, {
    forcePdf: request.data?.forcePdf === true
  });
  await writeAuditLog("engagementCompetition.clubRecapEmailsPrepared", context.uid, {
    competitionId,
    clubEntryCount: result.clubEntryCount,
    skippedClubCount: result.skippedClubCount,
    jobCount: result.jobCount,
    pdfGeneratedCount: result.pdfGeneratedCount,
    pdfReusedCount: result.pdfReusedCount,
    errorCount: result.errorCount,
    mailStatus: result.mailStatus
  });
  return {
    ok: true,
    ...result
  };
});

/* extracted-function: functions/server-competition-service.js#prepareEngagementTxtEmailJob */
async function prepareEngagementTxtEmailJob(input0, input1) {
  return serverCompetitionService().prepareEngagementTxtEmailJob(...arguments);
}

/* extracted-function: functions/server-competition-service.js#prepareEngagementOfficialsEmailJob */
async function prepareEngagementOfficialsEmailJob(input0, input1) {
  return serverCompetitionService().prepareEngagementOfficialsEmailJob(...arguments);
}

/* extracted-function: functions/server-competition-service.js#sendEngagementPreparedEmailJobs */
async function sendEngagementPreparedEmailJobs(input0, input1) {
  return serverCompetitionService().sendEngagementPreparedEmailJobs(...arguments);
}

exports.sendEngagementPreparedEmails = onCall(ENVIRONMENT.sportingDataSource === "nap" ? ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS : ENGAGEMENT_MAIL_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return nativeNotificationPreview(request, "send");
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competition.data() || {});
  const result = await sendEngagementPreparedEmailJobs(db, competition, context, {
    type: request.data?.type,
    limit: request.data?.limit
  });
  await writeAuditLog("engagementCompetition.preparedEmailsSent", context.uid, {
    competitionId,
    requestedType: cleanText(request.data?.type).slice(0, 80),
    attemptedCount: result.attemptedCount,
    sentCount: result.sentCount,
    errorCount: result.errorCount
  });
  return {
    ok: true,
    ...result
  };
});

/* extracted-function: functions/server-competition-service.js#engagementClosureAutomationContext */
function engagementClosureAutomationContext() {
  return serverCompetitionService().engagementClosureAutomationContext(...arguments);
}

/* extracted-function: functions/server-competition-service.js#reserveEngagementCompetitionClosure */
async function reserveEngagementCompetitionClosure(input0, input1, input2) {
  return serverCompetitionService().reserveEngagementCompetitionClosure(...arguments);
}

/* extracted-function: functions/server-competition-service.js#processEngagementCompetitionAutomaticClosure */
async function processEngagementCompetitionAutomaticClosure(input0, input1, input2) {
  return serverCompetitionService().processEngagementCompetitionAutomaticClosure(...arguments);
}

exports.closeDueEngagementCompetitions = onSchedule(ENGAGEMENT_CLOSURE_SCHEDULER_OPTIONS, async () => {
  const now = new Date().toISOString();
  const snapshot = await db.collection(ENGAGEMENT_CLOSURE_QUEUE_COLLECTION)
    .where("runAt", "<=", now)
    .orderBy("runAt")
    .limit(ENGAGEMENT_CLOSURE_BATCH_LIMIT)
    .get();
  const results = [];
  if(ENVIRONMENT.sportingDataSource === "nap"){
    const automation=require('./nap-notification-automation'),services=nativeNotificationAutomationServices(false);
    for(const event of snapshot.docs){
      // Old technical events are retained, never interpreted as native data.
      if(event.data()?.source!=='nap')continue;
      try{results.push(event.data().deliveryMode==='bcc-v1'?await enqueueNativeNotificationTask(event.id):await automation.processEvent(db,event.ref,services,now));}
      catch{results.push({status:'failed'});}
    }
    await deliverNativeNotificationJobs();
    return null;
  }
  for (const queueSnapshot of snapshot.docs) {
    const queue = queueSnapshot.data() || {};
    const competitionId = cleanText(queue.competitionId || queueSnapshot.id).slice(0, 128);
    if (!competitionId) {
      await queueSnapshot.ref.delete();
      results.push({ skipped: true, reason: "missing-competition-id" });
      continue;
    }
    const competitionSnapshot = await db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competitionSnapshot.exists) {
      await queueSnapshot.ref.delete();
      results.push({ competitionId, skipped: true, reason: "competition-not-found" });
      continue;
    }
    const result = await processEngagementCompetitionAutomaticClosure(db, competitionSnapshot, now);
    results.push(result);
    if (result.skipped && result.reason === "deadline-not-reached") {
      const queueItem = engagementClosureQueueItem(competitionSnapshot.data() || {}, competitionSnapshot.id, now);
      if (queueItem) await queueSnapshot.ref.set(queueItem, { merge: true });
      else await queueSnapshot.ref.delete();
    } else {
      await queueSnapshot.ref.delete();
    }
  }
  if (snapshot.size || results.length) {
    await writeAuditLog("engagementCompetition.automaticClosureSweep", "system:engagementClosureScheduler", {
      checkedAt: now,
      dueQueueCount: snapshot.size,
      processedCount: results.filter((result) => !result.skipped).length,
      skippedCount: results.filter((result) => result.skipped).length,
      failedCount: results.filter((result) => result.status === "failed").length
    });
  }
  return null;
});

exports.saveEngagementClubTeamLeader = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#saveEngagementClubTeamLeader#arrow */ async (request) => {
  return portalClubHandlers().saveEngagementClubTeamLeader(request);
});

exports.removeEngagementClubTeamLeader = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#removeEngagementClubTeamLeader#arrow */ async (request) => {
  return portalClubHandlers().removeEngagementClubTeamLeader(request);
});

exports.listEngagementClubPeople = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#listEngagementClubPeople#arrow */ async (request) => {
  return portalClubHandlers().listEngagementClubPeople(request);
});

/* extracted-function: functions/server-competition-service.js#resolveEngagementClubPersonSwimmer */
async function resolveEngagementClubPersonSwimmer(input0) {
  return serverCompetitionService().resolveEngagementClubPersonSwimmer(...arguments);
}

exports.saveEngagementClubPerson = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#saveEngagementClubPerson#arrow */ async (request) => {
  return portalClubHandlers().saveEngagementClubPerson(request);
});

exports.setEngagementClubPersonStatus = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#setEngagementClubPersonStatus#arrow */ async (request) => {
  return portalClubHandlers().setEngagementClubPersonStatus(request);
});

/* extracted-function: functions/server-competition-service.js#saveNativeClubOfficials */
async function saveNativeClubOfficials(input0, input1) {
  return serverCompetitionService().saveNativeClubOfficials(...arguments);
}

exports.saveEngagementClubOfficials = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#saveEngagementClubOfficials#arrow */ async (request) => {
  return portalClubHandlers().saveEngagementClubOfficials(request);
});

exports.listEngagementClubSwimmers = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#listEngagementClubSwimmers#arrow */ async (request) => {
  return portalClubHandlers().listEngagementClubSwimmers(request);
});

exports.setEngagementClubSwimmerActivityStatus = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#setEngagementClubSwimmerActivityStatus#arrow */ async (request) => {
  return portalClubHandlers().setEngagementClubSwimmerActivityStatus(request);
});

exports.rebuildEngagementClubAggregates = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est desactivee : utilisez la fiche NAP.");
  const startedAt = Date.now();
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Reconstruction reservee au niveau national.");
  }
  const clubIds = Array.from(new Set((Array.isArray(request.data?.clubIds) ? request.data.clubIds : [])
    .map((clubId) => cleanText(clubId).slice(0, 40))
    .filter(Boolean))).slice(0, 1);
  if (!clubIds.length) throw new HttpsError("invalid-argument", "Au moins un club est requis.");
  const results = [];
  for (const clubId of clubIds) {
    const userSnapshot = await db.collection("users").where("clubId", "==", clubId).limit(1).get();
    const user = userSnapshot.docs[0]?.data() || {};
    const clubContext = {
      clubId,
      clubName: cleanText(user.clubName).slice(0, 140),
      regionId: cleanText(user.regionId).slice(0, 80)
    };
    const [swimmers, people] = await Promise.all([
      rebuildEngagementClubRoster(db, clubContext, 200),
      rebuildEngagementClubPeopleRoster(db, clubContext)
    ]);
    results.push({ clubId, swimmerCount: swimmers.length, personCount: people.length });
  }
  await writeAuditLog("engagementClubAggregates.rebuilt", context.uid, {
    clubCount: results.length,
    clubs: results
  });
  return {
    ok: true,
    results,
    readStats: portalReadStats("rebuildEngagementClubAggregates", startedAt, {
      baseDocuments: clubIds.length,
      variableDocumentsMax: clubIds.length * 801,
      cacheHit: false
    })
  };
});

function serverNationalService() {
  if (!serverNationalService.instance) serverNationalService.instance = require("./server-national-service").createNationalService({
    get ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION() { return ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION; },
    get ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE() { return ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE; },
    get ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS() { return ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS; },
    get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldPath() { return FieldPath; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
    get aggregateSwimmerIndexRows() { return aggregateSwimmerIndexRows; },
    get assertNoEngagementSwimmerLicenseConflict() { return assertNoEngagementSwimmerLicenseConflict; },
    get authorizeNativePerformance() { return authorizeNativePerformance; },
    get cleanEngagementEntryIndividualEntries() { return cleanEngagementEntryIndividualEntries; },
    get cleanEngagementEntryOfficial() { return cleanEngagementEntryOfficial; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get db() { return db; },
    get deleteEngagementClubRosterSwimmer() { return deleteEngagementClubRosterSwimmer; },
    get deletePublicPerformanceFile() { return deletePublicPerformanceFile; },
    get engagementClubSwimmerItem() { return engagementClubSwimmerItem; },
    get engagementMailRecipientIndexStateRef() { return engagementMailRecipientIndexStateRef; },
    get engagementMailRecipientsFromIndex() { return engagementMailRecipientsFromIndex; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get engagementNewSwimmerAlertFromMatch() { return engagementNewSwimmerAlertFromMatch; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get engagementReferenceSwimmerItem() { return engagementReferenceSwimmerItem; },
    get engagementSwimmerChangeResolutionMail() { return engagementSwimmerChangeResolutionMail; },
    get engagementSwimmerIdentityKey() { return engagementSwimmerIdentityKey; },
    get engagementSwimmerLicenseId() { return engagementSwimmerLicenseId; },
    get engagementSwimmerLicenseItem() { return engagementSwimmerLicenseItem; },
    get engagementSwimmerLicenseNumberId() { return engagementSwimmerLicenseNumberId; },
    get engagementSwimmerLicenseNumberKey() { return engagementSwimmerLicenseNumberKey; },
    get engagementSwimmerLicensePayload() { return engagementSwimmerLicensePayload; },
    get findReferenceSwimmerCorrectionTarget() { return findReferenceSwimmerCorrectionTarget; },
    get getPerformanceBaseRowsBySwimmer() { return getPerformanceBaseRowsBySwimmer; },
    get intranapSwimmersIndex() { return intranapSwimmersIndex; },
    get invalidateEngagementEntryTimeCachesForPerformanceRows() { return invalidateEngagementEntryTimeCachesForPerformanceRows; },
    get livePalmesMailHtml() { return livePalmesMailHtml; },
    get nativePerformanceFailure() { return nativePerformanceFailure; },
    get nodemailer() { return nodemailer; },
    get normalizeCategoryCode() { return normalizeCategoryCode; },
    get normalizeEmail() { return normalizeEmail; },
    get normalizePerformanceSearchText() { return normalizePerformanceSearchText; },
    get performanceBaseDocId() { return performanceBaseDocId; },
    get performanceSwimmerIndexDocId() { return performanceSwimmerIndexDocId; },
    get performanceSwimmerPageId() { return performanceSwimmerPageId; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get publicPerformanceSwimmerFilePath() { return publicPerformanceSwimmerFilePath; },
    get publicSwimmerKey() { return publicSwimmerKey; },
    get readPublicPerformanceJson() { return readPublicPerformanceJson; },
    get rebuildPublicPerformanceFilesForAffectedRows() { return rebuildPublicPerformanceFilesForAffectedRows; },
    get rebuildPublicTopFilesForAffectedRows() { return rebuildPublicTopFilesForAffectedRows; },
    get recoveredPerformanceRowsAreComplete() { return recoveredPerformanceRowsAreComplete; },
    get removePublicSearchIndexes() { return removePublicSearchIndexes; },
    get replacePublicSwimmerIdentity() { return replacePublicSwimmerIdentity; },
    get stableHash() { return stableHash; },
    get swimmerMergeIds() { return swimmerMergeIds; },
    get uniquePublicPerformanceRows() { return uniquePublicPerformanceRows; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get writePerformanceBaseRows() { return writePerformanceBaseRows; },
    get writePerformanceSwimmerIndexRows() { return writePerformanceSwimmerIndexRows; },
    get writePerformanceSwimmerPageRows() { return writePerformanceSwimmerPageRows; }
  });
  return serverNationalService.instance;
}

/* extracted-function: functions/server-national-service.js#importSwimmerCreation */
async function importSwimmerCreation(input0, input1) {
  return serverNationalService().importSwimmerCreation(...arguments);
}
exports.previewEngagementClubSwimmerCreation = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4 } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#previewEngagementClubSwimmerCreation#arrow */ async (request) => {
  return portalClubHandlers().previewEngagementClubSwimmerCreation(request);
});

exports.previewEngagementClubSwimmerRecovery = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4 } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#previewEngagementClubSwimmerRecovery#arrow */ async (request) => {
  return portalClubHandlers().previewEngagementClubSwimmerRecovery(request);
});

exports.recoverEngagementClubSwimmer = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4 } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#recoverEngagementClubSwimmer#arrow */ async (request) => {
  return portalClubHandlers().recoverEngagementClubSwimmer(request);
});

exports.createEngagementClubSwimmer = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4 } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#createEngagementClubSwimmer#arrow */ async (request) => {
  return portalClubHandlers().createEngagementClubSwimmer(request);
});

exports.listEngagementNationalClubSwimmers = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  }
  if (ENVIRONMENT.sportingDataSource === "nap") {
    try {
      const service = require("./nap-portal-swimmers");
      return await service.listNationalSwimmers(service.portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {cursor:request.data?.cursor});
    } catch (error) {
      throw new HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable", error instanceof TypeError ? error.message : "Annuaire national NAP indisponible. Reessayez.");
    }
  }
  const limit = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.limit) || 80)));
  const snapshot = await db
    .collection("engagementClubSwimmers")
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return {
    ok: true,
    swimmers: snapshot.docs.map(engagementNewSwimmerItem)
  };
});

/* extracted-function: functions/server-national-service.js#nationalSwimmerSearchMatches */
function nationalSwimmerSearchMatches() {
  return serverNationalService().nationalSwimmerSearchMatches(...arguments);
}

/* extracted-function: functions/server-national-service.js#nationalSwimmerSort */
function nationalSwimmerSort() {
  return serverNationalService().nationalSwimmerSort(...arguments);
}

/* extracted-function: functions/server-national-service.js#searchEngagementNationalSwimmerDocs */
async function searchEngagementNationalSwimmerDocs(input0) {
  return serverNationalService().searchEngagementNationalSwimmerDocs(...arguments);
}

exports.searchEngagementNationalSwimmers = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#searchEngagementNationalSwimmers#arrow */ async (request) => {
  return portalNationalHandlers().searchEngagementNationalSwimmers(request);
});

/* extracted-function: functions/server-national-service.js#engagementLicenseControlSeason */
function engagementLicenseControlSeason() {
  return serverNationalService().engagementLicenseControlSeason(...arguments);
}

/* extracted-function: functions/server-national-service.js#engagementLicenseControlPerson */
function engagementLicenseControlPerson() {
  return serverNationalService().engagementLicenseControlPerson(...arguments);
}

/* extracted-function: functions/server-national-service.js#engagementLicenseReportRequest */
async function engagementLicenseReportRequest(input0, input1, input2) {
  return serverNationalService().engagementLicenseReportRequest(...arguments);
}

exports.prepareEngagementLicenseControlBatch = onCall(ENVIRONMENT.projectId === "livepalmes-test" ? ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS : { ...ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, timeoutSeconds: 300, secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD"), ...ENGAGEMENT_NOTIFICATION_MAIL_SECRETS] }, async (request) => {
  const startedAt = Date.now();
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Controle des licences reserve au niveau national.");
  if (ENVIRONMENT.sportingDataSource === "nap") {
    try {
      const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      if (request.data?.action) return await engagementLicenseReportRequest(request.data, context, pool);
      return await require("./engagement-license-reports").attach(db, await require("./nap-license-control").prepareBatch(pool, request.data || {}), require("./nap-license-reports").store(pool));
    }
    catch(error) { throw new HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable",error instanceof TypeError || error instanceof RangeError ? error.message : "Controle NAP indisponible."); }
  }
  const season = engagementLicenseControlSeason(request.data?.season);
  const competitionIds = Array.from(new Set((Array.isArray(request.data?.competitionIds) ? request.data.competitionIds : [])
    .map((id) => cleanText(id).slice(0, 128))
    .filter(Boolean))).slice(0, 5);
  if (!competitionIds.length) throw new HttpsError("invalid-argument", "Selectionnez au moins une competition.");

  const competitionSnapshots = await db.getAll(...competitionIds.map((id) => db.collection("engagementCompetitions").doc(id)));
  const competitions = competitionSnapshots.map((snapshot) => {
    if (!snapshot.exists) throw new HttpsError("not-found", "Une competition selectionnee est introuvable.");
    const item = engagementCompetitionDetailItem(snapshot);
    if (!item.date || item.date < season.startDate || item.date > season.endDate) {
      throw new HttpsError("failed-precondition", `La competition ${item.name || item.id} n'appartient pas a la saison ${season.label}.`);
    }
    return item;
  });

  const entrySnapshots = await Promise.all(competitionIds.map(async (competitionId) => {
    const snapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(501)
      .get();
    if (snapshot.size > 500) throw new HttpsError("resource-exhausted", "Trop de clubs engages pour preparer ce lot en une fois.");
    return snapshot;
  }));
  const competitionById = new Map(competitions.map((competition) => [competition.id, competition]));
  const peopleById = new Map();
  entrySnapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => {
    const entry = engagementClubEntryItem(doc);
    if (entry.status === "deleted") return;
    const competition = competitionById.get(entry.competitionId);
    (entry.swimmers || []).forEach((swimmer) => {
      const person = engagementLicenseControlPerson(swimmer, entry, competition ? [competition] : []);
      if (!person.livePalmesId || !person.firstName || !person.lastName || !person.birthDate) return;
      const existing = peopleById.get(person.livePalmesId);
      if (!existing) {
        peopleById.set(person.livePalmesId, person);
        return;
      }
      const sources = new Map(existing.competitionIds.map((id, index) => [id, existing.competitions[index] || id]));
      person.competitionIds.forEach((id, index) => sources.set(id, person.competitions[index] || id));
      existing.competitionIds = Array.from(sources.keys());
      existing.competitions = Array.from(sources.values());
      if (!existing.licenseNumber && person.licenseNumber) existing.licenseNumber = person.licenseNumber;
    });
  }));
  if (peopleById.size > 800) throw new HttpsError("resource-exhausted", "Le lot depasse 800 nageurs. Selectionnez moins de competitions.");

  const people = Array.from(peopleById.values());
  const licenseSnapshots = people.length
    ? await db.getAll(...people.map((person) => db.collection("engagementSwimmerLicenses").doc(engagementSwimmerLicenseId({ swimmerIndexId: person.swimmerIndexId }))))
    : [];
  const licenseBySwimmerId = new Map(licenseSnapshots.filter((snapshot) => snapshot.exists)
    .map((snapshot) => {
      const license = engagementSwimmerLicenseItem(snapshot);
      return [license.swimmerIndexId, license];
    }));
  people.forEach((person) => {
    const license = licenseBySwimmerId.get(person.swimmerIndexId);
    const seasonRecord = license?.licenseSeasons?.[season.label] || {};
    person.licenseNumber = cleanText(license?.licenseNumber || person.licenseNumber).toUpperCase().slice(0, 60);
    person.seasonStatus = cleanEngagementLicenseSeasonStatus(seasonRecord.status, "to_check");
    person.validatedAt = cleanText(seasonRecord.validatedAt || seasonRecord.updatedAt).slice(0, 40);
    person.validationSource = cleanText(seasonRecord.source).slice(0, 40);
    person.federalValidityEndDate = cleanIsoDate(seasonRecord.federalValidityEndDate);
  });
  people.sort((left, right) => left.lastName.localeCompare(right.lastName, "fr") || left.firstName.localeCompare(right.firstName, "fr"));
  const batchId = `licences-${season.label}-${stableHash(`${Date.now()}|${competitionIds.join("|")}`).slice(0, 10)}`;
  return {
    ok: true,
    batchId,
    season,
    competitions: competitions.map((competition) => ({ id: competition.id, name: competition.name, date: competition.date })),
    people,
    readStats: portalReadStats("prepareEngagementLicenseControlBatch", startedAt, {
      baseDocuments: competitionIds.length,
      variableDocumentsMax: competitionIds.length * 501 + people.length,
      cacheHit: false
    })
  };
});

exports.validateEngagementSwimmerLicenses = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#validateEngagementSwimmerLicenses#arrow */ async (request) => {
  return portalClubHandlers().validateEngagementSwimmerLicenses(request);
});

/* extracted-function: functions/server-national-service.js#engagementSwimmerIdentitySnapshot */
function engagementSwimmerIdentitySnapshot() {
  return serverNationalService().engagementSwimmerIdentitySnapshot(...arguments);
}

/* extracted-function: functions/server-national-service.js#cleanEngagementSwimmerIdentityCorrection */
function cleanEngagementSwimmerIdentityCorrection() {
  return serverNationalService().cleanEngagementSwimmerIdentityCorrection(...arguments);
}

/* extracted-function: functions/server-national-service.js#findPerformanceSwimmerCorrectionTarget */
async function findPerformanceSwimmerCorrectionTarget(input0) {
  return serverNationalService().findPerformanceSwimmerCorrectionTarget(...arguments);
}

/* extracted-function: functions/server-national-service.js#findEngagementSwimmerCorrectionLicense */
async function findEngagementSwimmerCorrectionLicense(input0) {
  return serverNationalService().findEngagementSwimmerCorrectionLicense(...arguments);
}

/* extracted-function: functions/server-national-service.js#getEngagementSwimmerCorrectionTarget */
async function getEngagementSwimmerCorrectionTarget(input0) {
  return serverNationalService().getEngagementSwimmerCorrectionTarget(...arguments);
}

/* extracted-function: functions/server-national-service.js#assertNoEngagementSwimmerIdentityConflict */
async function assertNoEngagementSwimmerIdentityConflict(input0) {
  return serverNationalService().assertNoEngagementSwimmerIdentityConflict(...arguments);
}

/* extracted-function: functions/server-national-service.js#engagementEntrySwimmerCorrectionResult */
function engagementEntrySwimmerCorrectionResult() {
  return serverNationalService().engagementEntrySwimmerCorrectionResult(...arguments);
}

/* extracted-function: functions/server-national-service.js#engagementEntryRelayCorrectionResult */
function engagementEntryRelayCorrectionResult() {
  return serverNationalService().engagementEntryRelayCorrectionResult(...arguments);
}

/* extracted-function: functions/server-national-service.js#updateEngagementEntriesForSwimmerCorrection */
async function updateEngagementEntriesForSwimmerCorrection(input0) {
  return serverNationalService().updateEngagementEntriesForSwimmerCorrection(...arguments);
}

/* extracted-function: functions/server-national-service.js#setEngagementSwimmerChangeRequestRosterState */
function setEngagementSwimmerChangeRequestRosterState(input0) {
  return serverNationalService().setEngagementSwimmerChangeRequestRosterState(...arguments);
}

/* extracted-function: functions/server-national-service.js#applyEngagementSwimmerIdentityCorrection */
async function applyEngagementSwimmerIdentityCorrection() {
  return serverNationalService().applyEngagementSwimmerIdentityCorrection(...arguments);
}

/* extracted-function: functions/server-national-service.js#engagementSwimmerChangeRequestItem */
function engagementSwimmerChangeRequestItem(input0) {
  return serverNationalService().engagementSwimmerChangeRequestItem(...arguments);
}

/* extracted-function: functions/server-national-service.js#sendEngagementSwimmerChangeResolutionNotification */
async function sendEngagementSwimmerChangeResolutionNotification() {
  return serverNationalService().sendEngagementSwimmerChangeResolutionNotification(...arguments);
}

exports.requestEngagementClubSwimmerChange = onCall({ ...ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#requestEngagementClubSwimmerChange#arrow */ async (request) => {
  return portalNationalHandlers().requestEngagementClubSwimmerChange(request);
});

exports.listEngagementSwimmerChangeRequests = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-national-handlers.js#listEngagementSwimmerChangeRequests#arrow */ async (request) => {
  return portalNationalHandlers().listEngagementSwimmerChangeRequests(request);
});

/* extracted-function: functions/server-national-service.js#engagementNationalAdministrationPendingCounts */
async function engagementNationalAdministrationPendingCounts() {
  return serverNationalService().engagementNationalAdministrationPendingCounts(...arguments);
}

exports.getEngagementNationalAdministrationOverview = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  return {
    ok: true,
    counts: await engagementNationalAdministrationPendingCounts()
  };
});

exports.listEngagementNationalClubs = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#listEngagementNationalClubs#arrow */ async (request) => {
  return portalNationalHandlers().listEngagementNationalClubs(request);
});

exports.getPublicEngagementClubDirectory = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#getPublicEngagementClubDirectory#arrow */ async () => {
  return portalClubHandlers().getPublicEngagementClubDirectory();
});

exports.saveEngagementNationalClub = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#saveEngagementNationalClub#arrow */ async (request) => {
  return portalNationalHandlers().saveEngagementNationalClub(request);
});

exports.deleteEngagementNationalClub = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#deleteEngagementNationalClub#arrow */ async (request) => {
  return portalNationalHandlers().deleteEngagementNationalClub(request);
});

exports.getPortalPendingRequestOverview = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-competition-handlers.js#getPortalPendingRequestOverview#arrow */ async (request) => {
  return portalCompetitionHandlers().getPortalPendingRequestOverview(request);
});

exports.resolveEngagementSwimmerChangeRequest = onCall(ENVIRONMENT.sportingDataSource === "nap"
  ? { ...ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] }
  : ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Validation reservee au niveau national.");
  const requestId = cleanText(request.data?.requestId).slice(0, 80);
  const decision = cleanText(request.data?.decision);
  const resolutionNote = cleanText(request.data?.resolutionNote).slice(0, 500);
  if (!requestId || !["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Demande et decision requises.");
  }
  const ref = db.collection(ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).doc(requestId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Demande de correction introuvable.");
  const data = snapshot.data() || {};
  if (ENVIRONMENT.sportingDataSource === "nap") {
    if (data.reportType === "duplicate") {
      // Close the report only. Merging remains a separate national operation.
      if (request.data?.proposed !== undefined) throw new HttpsError("invalid-argument", "Un signalement ne corrige pas l'identite.");
      if (!resolutionNote) throw new HttpsError("invalid-argument", "Expliquez le traitement du signalement avant de le clore.");
      const now = new Date().toISOString();
      const result = { reportOnly: true, identityChanged: false, merged: false };
      await db.runTransaction(async transaction => {
        const latest = await transaction.get(ref), current = latest.data() || {};
        if (!latest.exists || current.reportType !== "duplicate" || current.requestedAt !== data.requestedAt || current.expectedFingerprint !== data.expectedFingerprint) throw new HttpsError("failed-precondition", "Le signalement a change. Rechargez les demandes.");
        if (current.status !== "pending") {
          if (current.status === decision && current.resolvedBy === context.uid && current.resolutionNote === resolutionNote) return;
          throw new HttpsError("failed-precondition", "Signalement deja traite.");
        }
        transaction.set(ref, { status: decision, resolutionNote, resolvedAt: now, resolvedBy: context.uid,
          updatedAt: now, updatedBy: context.uid, result,
          resolutionNotification: { status: "skipped", reason: "report-only-no-email" } }, { merge: true });
      }, { maxAttempts: 3 });
      await writeAuditLogOnce("nap.swimmer.duplicateReportClosed", context.uid, { requestId, swimmerId: data.targetSwimmerId, clubId: data.clubId, decision }, stableHash([requestId, data.requestedAt, decision, context.uid, resolutionNote].join("|")));
      return { ok: true, request: engagementSwimmerChangeRequestItem(await ref.get()), result };
    }
    let nativeConnection, nativeLock, resolution, claimed = false, claimWasExisting = false, writeAttempted = false;
    try {
      const helper = data.requestType === "person-change" ? require("./nap-person-change-requests") : require("./nap-swimmer-change-requests");
      resolution = helper.prepareResolution(data, { ...request.data, decision, resolutionNote }, context.uid);
      if (data.status !== "pending") {
        if (data.status === decision && data.nativeResolution?.key === resolution.key) return { ok: true, request: engagementSwimmerChangeRequestItem(snapshot), result: data.result || {} };
        throw new HttpsError("failed-precondition", "Demande deja traitee.");
      }
      const nap = require("./nap-portal-swimmers");
      nativeConnection = await nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD).getConnection();
      const lockName = `lp-swimmer-request-${stableHash(requestId).slice(0, 40)}`;
      const [lockRows] = await nativeConnection.execute({ sql: "SELECT GET_LOCK(?,0) AS acquired", timeout: 10000 }, [lockName]);
      if (Number(lockRows[0]?.acquired) !== 1) throw new TypeError("Une decision est en cours. Rechargez les demandes avant de recommencer.");
      nativeLock = lockName;
      claimWasExisting = await db.runTransaction(async transaction => {
        const current = await transaction.get(ref), latest = current.data() || {};
        if (!current.exists || latest.status !== "pending" || latest.requestedAt !== data.requestedAt || latest.expectedFingerprint !== data.expectedFingerprint) throw new HttpsError("failed-precondition", "La demande a change. Rechargez-la.");
        if (latest.nativeResolution && latest.nativeResolution.key !== resolution.key) throw new HttpsError("failed-precondition", "Une decision est deja en cours. Reprenez la meme decision depuis le meme compte.");
        transaction.set(ref, { nativeResolution: { key: resolution.key, actorUid: context.uid, decision }, updatedAt: new Date().toISOString() }, { merge: true });
        return !!latest.nativeResolution;
      }, { maxAttempts: 3 });
      claimed = true;
      let result = null;
      if (decision === "approved") {
        const correctionConnection = { execute: async (query, values) => {
          const mutation = query.sql.startsWith("UPDATE nageurs SET ");
          if (mutation) writeAttempted = true;
          const response = await nativeConnection.execute(query, values);
          if (mutation && response[0]?.affectedRows === 0) writeAttempted = false;
          return response;
        } };
        if(data.requestType === "person-change") {
          result=await require("./nap-club-person-edit").editNativePerson(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
            clubId:String(data.clubId),actorUid:context.uid,personId:data.targetSwimmerId,expectedFingerprint:resolution.expectedFingerprint,patch:resolution.proposed
          },{
            read:async operation=>{const before=await db.collection("auditLogs").doc(`nap-person-identity-${operation}-before`).get();return before.exists?before.data().target:null;},
            prepare:(operation,target)=>db.collection("auditLogs").doc(`nap-person-identity-${operation}-before`).create({action:"nap.person.identity.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
            complete:(operation,target)=>writeAuditLogOnce("nap.person.identityCorrected",context.uid,{...target,auditPreparationId:`nap-person-identity-${operation}-before`},operation)
          },()=>{if(!context.national)throw new HttpsError("permission-denied","Visa national requis.");},{fillOnly:false,onWrite:value=>{writeAttempted=value;}});
        } else result = await nap.correctPortalIdentity(correctionConnection, {
          id: resolution.id, expectedFingerprint: resolution.expectedFingerprint, proposed: resolution.proposed,
          actorUid: context.uid, reason: resolution.reason
        }, {
          read: async operation => { const before = await db.collection("auditLogs").doc(`nap-identity-${operation}-before`).get(); return before.exists ? before.data().target : null; },
          prepare: (operation, target) => db.collection("auditLogs").doc(`nap-identity-${operation}-before`).create({ action: "nap.swimmer.identityCorrection.prepare", actorUid: context.uid, target, createdAt: new Date().toISOString() }),
          complete: (operation, target) => writeAuditLogOnce("nap.swimmer.identityCorrected", context.uid,{...target,auditPreparationId:`nap-identity-${operation}-before`}, operation)
        }, { prepare: async () => [], apply: async () => ({ entryUpdateCount: 0, relayUpdateCount: 0, oldLivepalmesLinksIgnored: true }) });
      }
      const now = new Date().toISOString();
      const completed = { ...data, status: decision, resolutionNote, resolvedAt: now, resolvedBy: context.uid,
        resolvedByEmail: context.email || "", updatedAt: now, updatedBy: context.uid,
        nativeResolution: { key: resolution.key, actorUid: context.uid, decision },
        ...(decision === "approved" ? { resolvedProposed: resolution.resolvedProposed, proposalAdjusted: resolution.proposalAdjusted } : {}), result: cleanFirestoreValue(result || {}) };
      await ref.set(cleanFirestoreValue(completed), { merge: false });
      // TEST has no automatic emails. The production notification below stays unchanged.
      const resolutionNotification = { status: "skipped", reason: "test-emails-disabled" };
      await ref.set({ resolutionNotification }, { merge: true });
      await writeAuditLogOnce(`nap.swimmer.change${decision === "approved" ? "Approved" : "Rejected"}`, context.uid,
        { requestId, swimmerId: data.targetSwimmerId, clubId: data.clubId, notificationStatus: resolutionNotification.status }, resolution.key);
      return { ok: true, request: engagementSwimmerChangeRequestItem({ id: requestId, data: () => ({ ...completed, resolutionNotification }) }), result };
    } catch (error) {
      // Before any SQL mutation, release a new claim so a stale/invalid request can be refused or reviewed.
      // An uncertain write or an existing retry remains bound to its exact decision.
      if (claimed && !claimWasExisting && !writeAttempted) {
        try {
          await db.runTransaction(async transaction => {
            const current = await transaction.get(ref), latest = current.data() || {};
            if (latest.status === "pending" && latest.nativeResolution?.key === resolution.key) transaction.set(ref, { nativeResolution: null }, { merge: true });
          }, { maxAttempts: 3 });
        } catch { /* Preserve the claim if its durable release is unavailable. */ }
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable", error instanceof TypeError || error instanceof RangeError ? error.message : "Decision a verifier. Rechargez les demandes ou reprenez exactement la meme decision ; sa sauvegarde est conservee.");
    } finally {
      if (nativeConnection) {
        try { if (nativeLock) await nativeConnection.execute({ sql: "SELECT RELEASE_LOCK(?) AS released", timeout: 10000 }, [nativeLock]); }
        catch { nativeConnection.destroy(); nativeConnection = null; }
        finally { if (nativeConnection) nativeConnection.release(); }
      }
    }
  }
  if (cleanText(data.status) !== "pending") throw new HttpsError("failed-precondition", "Demande deja traitee.");
  const target = await getEngagementSwimmerCorrectionTarget(
    db,
    data.requestedSource,
    data.requestedSwimmerId,
    data.current?.identityKey
  );
  const current = engagementSwimmerIdentitySnapshot(target.swimmer, target.source);
  const expected = engagementSwimmerIdentitySnapshot(data.current || {}, data.targetSource);
  const stale = ["firstName", "lastName", "birthDate", "sex", "licenseNumber"]
    .some((field) => cleanText(current[field]) !== cleanText(expected[field]));
  if (decision === "approved" && stale) {
    throw new HttpsError("failed-precondition", "La fiche a change depuis la demande. Rechargez-la avant de valider.");
  }
  const now = new Date().toISOString();
  let result = null;
  let requestedCorrection = null;
  let resolvedProposed = null;
  let proposalAdjusted = false;
  if (decision === "approved") {
    requestedCorrection = cleanEngagementSwimmerIdentityCorrection(data.proposed || {}, current);
    const reviewedProposal = request.data?.proposed && typeof request.data.proposed === "object" && !Array.isArray(request.data.proposed)
      ? request.data.proposed
      : data.proposed || {};
    const correction = cleanEngagementSwimmerIdentityCorrection(reviewedProposal, current);
    proposalAdjusted = ["firstName", "lastName", "birthDate", "sex", "licenseNumber"]
      .some((field) => cleanText(correction[field]) !== cleanText(requestedCorrection[field]));
    resolvedProposed = engagementSwimmerIdentitySnapshot({ ...current, ...correction }, target.source);
    result = await applyEngagementSwimmerIdentityCorrection(target, correction, { ...context, now });
  } else {
    const batch = db.batch();
    setEngagementSwimmerChangeRequestRosterState(batch, { ...target, swimmer: current }, "rejected", requestId, now);
    await batch.commit();
  }
  await ref.set({
    status: decision,
    resolutionNote,
    resolvedAt: now,
    resolvedBy: context.uid,
    resolvedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid,
    ...(decision === "approved" ? { resolvedProposed, proposalAdjusted } : {}),
    result: cleanFirestoreValue(result || {})
  }, { merge: true });
  const resolutionNotification = await sendEngagementSwimmerChangeResolutionNotification({
    decision,
    requestedByEmail: data.requestedByEmail,
    requestedByFirstName: data.requestedByFirstName,
    requestedByLastName: data.requestedByLastName,
    swimmer: current,
    current,
    resolvedProposed: resolvedProposed || data.proposed || {},
    clubName: data.clubName,
    resolutionNote
  });
  await ref.set({
    resolutionNotification,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await writeAuditLog(`engagementClubSwimmer.change${decision === "approved" ? "Approved" : "Rejected"}`, context.uid, {
    requestId,
    swimmerId: target.swimmerId,
    source: target.source,
    clubId: cleanText(data.clubId),
    reason: cleanText(data.reason),
    resolutionNote,
    requestedProposed: requestedCorrection || data.proposed || {},
    resolvedProposed: resolvedProposed || {},
    proposalAdjusted,
    notificationStatus: resolutionNotification.status,
    performanceUpdateCount: Number(result?.performanceUpdateCount || 0),
    entryUpdateCount: Number(result?.entryUpdateCount || 0),
    relayUpdateCount: Number(result?.relayUpdateCount || 0)
  });
  const updated = await ref.get();
  return { ok: true, request: engagementSwimmerChangeRequestItem(updated), result };
});

exports.updateEngagementNationalSwimmerIdentity = onCall({ ...ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-performance-handlers.js#updateEngagementNationalSwimmerIdentity#arrow */ async (request) => {
  return portalPerformanceHandlers().updateEngagementNationalSwimmerIdentity(request);
});

exports.setEngagementNationalClubSwimmerStatus = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#setEngagementNationalClubSwimmerStatus#arrow */ async (request) => {
  return portalNationalHandlers().setEngagementNationalClubSwimmerStatus(request);
});

/* extracted-function: functions/server-national-service.js#engagementClubSwimmerDeletionUsage */
async function engagementClubSwimmerDeletionUsage(input0) {
  return serverNationalService().engagementClubSwimmerDeletionUsage(...arguments);
}

/* extracted-function: functions/server-national-service.js#deleteEngagementClubSwimmerPermanently */
async function deleteEngagementClubSwimmerPermanently(input0, input1) {
  return serverNationalService().deleteEngagementClubSwimmerPermanently(...arguments);
}

exports.requestEngagementClubSwimmerDeletion = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne suppression Firebase est desactivee. Utilisez la gestion NAP de la fiche.");
  const context = await engagementClubAccessContext(request);
  const swimmerId = cleanText(request.data?.swimmerId).slice(0, 80);
  if (!swimmerId) {
    throw new HttpsError("invalid-argument", "Nageur requis.");
  }
  const ref = db.collection("engagementClubSwimmers").doc(swimmerId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Seul un nageur cree depuis le portail peut etre supprime par son club.");
  }
  const swimmer = snapshot.data() || {};
  if (cleanText(swimmer.clubId) !== context.clubId) {
    throw new HttpsError("permission-denied", "Nageur hors perimetre club.");
  }
  const requestRef = db.collection("engagementSwimmerDeletionRequests").doc(swimmerId);
  const pendingRequest = await requestRef.get();
  if (pendingRequest.exists && cleanText(pendingRequest.data()?.status) === "pending") {
    throw new HttpsError("already-exists", "Une demande de retrait est deja en attente pour ce nageur.");
  }
  const usage = await engagementClubSwimmerDeletionUsage(swimmerId, swimmer, context);
  const blocked = usage.performanceMatchCount > 0 || usage.entryUsageCount > 0 || usage.entryScanTruncated;
  if (!blocked) {
    const deleted = await deleteEngagementClubSwimmerPermanently(ref, snapshot, context, "club-unused");
    return { ok: true, deleted: true, requested: false, usage, ...deleted };
  }
  const now = new Date().toISOString();
  const payload = {
    swimmerId,
    swimmerName: cleanText(swimmer.name).slice(0, 160) || [cleanText(swimmer.lastName), cleanText(swimmer.firstName)].filter(Boolean).join(" "),
    firstName: cleanText(swimmer.firstName).slice(0, 80),
    lastName: cleanText(swimmer.lastName).slice(0, 80),
    birthDate: cleanIsoDate(swimmer.birthDate),
    licenseNumber: cleanText(swimmer.licenseNumber).slice(0, 60),
    clubId: context.clubId,
    clubName: context.clubName,
    regionId: context.regionId,
    status: "pending",
    ...usage,
    requestedAt: now,
    requestedBy: context.uid,
    requestedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid
  };
  const batch = db.batch();
  batch.set(ref, {
    active: false,
    status: "deletion-pending",
    deletionRequestStatus: "pending",
    disabledAt: now,
    disabledBy: context.uid,
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  deleteEngagementClubRosterSwimmer(batch, db, { ...swimmer, id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" }, now);
  batch.set(requestRef, payload, { merge: false });
  await batch.commit();
  await writeAuditLog("engagementClubSwimmer.deletionRequested", context.uid, {
    swimmerId,
    clubId: context.clubId,
    performanceMatchCount: usage.performanceMatchCount,
    entryUsageCount: usage.entryUsageCount,
    entryScanTruncated: usage.entryScanTruncated
  });
  return { ok: true, deleted: false, requested: true, usage };
});

exports.deleteEngagementNationalClubSwimmer = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#deleteEngagementNationalClubSwimmer#arrow */ async (request) => {
  return portalNationalHandlers().deleteEngagementNationalClubSwimmer(request);
});

exports.listEngagementSwimmerDeletionRequests = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne suppression Firebase est desactivee. Utilisez la gestion NAP de la fiche.");
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  }
  const status = ["pending", "approved", "rejected"].includes(cleanText(request.data?.status))
    ? cleanText(request.data.status)
    : "pending";
  const limit = Math.min(100, Math.max(10, Math.trunc(Number(request.data?.limit) || 50)));
  const snapshot = await db.collection("engagementSwimmerDeletionRequests")
    .where("status", "==", status)
    .limit(limit)
    .get();
  const requests = snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      requestType: "swimmer",
      swimmerId: cleanText(data.swimmerId || doc.id).slice(0, 80),
      swimmerName: cleanText(data.swimmerName).slice(0, 160),
      firstName: cleanText(data.firstName).slice(0, 80),
      lastName: cleanText(data.lastName).slice(0, 80),
      birthDate: cleanIsoDate(data.birthDate),
      licenseNumber: cleanText(data.licenseNumber).slice(0, 60),
      clubId: cleanText(data.clubId).slice(0, 40),
      clubName: cleanText(data.clubName).slice(0, 140),
      regionId: cleanText(data.regionId).slice(0, 80),
      performanceMatchCount: Math.max(0, Math.trunc(Number(data.performanceMatchCount) || 0)),
      entryUsageCount: Math.max(0, Math.trunc(Number(data.entryUsageCount) || 0)),
      competitionIds: (Array.isArray(data.competitionIds) ? data.competitionIds : []).map((value) => cleanText(value).slice(0, 128)).filter(Boolean).slice(0, 25),
      entryScanTruncated: data.entryScanTruncated === true,
      status: cleanText(data.status),
      requestedAt: cleanText(data.requestedAt),
      requestedBy: cleanText(data.requestedBy),
      requestedByEmail: cleanText(data.requestedByEmail)
    };
  }).sort((left, right) => String(right.requestedAt || "").localeCompare(String(left.requestedAt || "")));
  return { ok: true, status, requests };
});

exports.resolveEngagementSwimmerDeletionRequest = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne suppression Firebase est desactivee. Utilisez la gestion NAP de la fiche.");
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Validation reservee au niveau national.");
  }
  const requestId = cleanText(request.data?.requestId).slice(0, 80);
  const decision = cleanText(request.data?.decision);
  if (!requestId) throw new HttpsError("invalid-argument", "Demande requise.");
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Decision invalide.");
  }
  const requestRef = db.collection("engagementSwimmerDeletionRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();
  if (!requestSnapshot.exists) throw new HttpsError("not-found", "Demande de retrait introuvable.");
  const deletionRequest = requestSnapshot.data() || {};
  if (cleanText(deletionRequest.status) !== "pending") {
    throw new HttpsError("failed-precondition", "Demande deja traitee.");
  }
  const swimmerId = cleanText(deletionRequest.swimmerId || requestId).slice(0, 80);
  const swimmerRef = db.collection("engagementClubSwimmers").doc(swimmerId);
  const swimmerSnapshot = await swimmerRef.get();
  const swimmer = swimmerSnapshot.exists ? swimmerSnapshot.data() || {} : {};
  const now = new Date().toISOString();
  const batch = db.batch();
  if (swimmerSnapshot.exists) {
    if (decision === "rejected") {
      batch.set(swimmerRef, {
        active: true,
        status: "active",
        deletionRequestStatus: "rejected",
        reactivatedAt: now,
        reactivatedBy: context.uid,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
      upsertEngagementClubRosterSwimmer(batch, db, { ...swimmer, active: true, status: "active", id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" }, now);
    } else {
      batch.set(swimmerRef, {
        active: false,
        status: "inactive",
        deletionRequestStatus: "approved",
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
      deleteEngagementClubRosterSwimmer(batch, db, { ...swimmer, id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" }, now);
    }
  }
  batch.set(requestRef, {
    status: decision,
    decidedAt: now,
    decidedBy: context.uid,
    decidedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  await batch.commit();
  await writeAuditLog("engagementClubSwimmer.deletionRequestResolved", context.uid, {
    requestId,
    swimmerId,
    decision,
    clubId: cleanText(deletionRequest.clubId).slice(0, 40),
    performanceMatchCount: Math.max(0, Math.trunc(Number(deletionRequest.performanceMatchCount) || 0)),
    entryUsageCount: Math.max(0, Math.trunc(Number(deletionRequest.entryUsageCount) || 0))
  });
  return { ok: true, requestId, swimmerId, decision, swimmerActive: decision === "rejected" };
});

/* extracted-function: functions/server-national-service.js#engagementNationalSwimmerCollectionForSource */
function engagementNationalSwimmerCollectionForSource(input0) {
  return serverNationalService().engagementNationalSwimmerCollectionForSource(...arguments);
}

/* extracted-function: functions/server-national-service.js#engagementNationalSwimmerItemFromDoc */
function engagementNationalSwimmerItemFromDoc(input0) {
  return serverNationalService().engagementNationalSwimmerItemFromDoc(...arguments);
}

/* extracted-function: functions/server-national-service.js#materializeEngagementNationalPerformanceSwimmerForMerge */
async function materializeEngagementNationalPerformanceSwimmerForMerge() {
  return serverNationalService().materializeEngagementNationalPerformanceSwimmerForMerge(...arguments);
}

/* extracted-function: functions/server-national-service.js#getEngagementNationalSwimmerForMerge */
async function getEngagementNationalSwimmerForMerge(input0) {
  return serverNationalService().getEngagementNationalSwimmerForMerge(...arguments);
}

/* extracted-function: functions/server-national-service.js#engagementNationalSwimmerFullName */
function engagementNationalSwimmerFullName() {
  return serverNationalService().engagementNationalSwimmerFullName(...arguments);
}

/* extracted-function: functions/server-national-service.js#engagementNationalSwimmerEntrySnapshot */
function engagementNationalSwimmerEntrySnapshot() {
  return serverNationalService().engagementNationalSwimmerEntrySnapshot(...arguments);
}

/* extracted-function: functions/server-national-service.js#mergeEngagementEntryIndividualEntries */
function mergeEngagementEntryIndividualEntries() {
  return serverNationalService().mergeEngagementEntryIndividualEntries(...arguments);
}

/* extracted-function: functions/server-national-service.js#mergeEngagementClubEntrySwimmers */
function mergeEngagementClubEntrySwimmers() {
  return serverNationalService().mergeEngagementClubEntrySwimmers(...arguments);
}

/* extracted-function: functions/server-national-service.js#mergeEngagementClubEntryRelays */
function mergeEngagementClubEntryRelays() {
  return serverNationalService().mergeEngagementClubEntryRelays(...arguments);
}

/* extracted-function: functions/server-national-service.js#searchEngagementNationalSwimmerMergeTargetDocs */
async function searchEngagementNationalSwimmerMergeTargetDocs(input0) {
  return serverNationalService().searchEngagementNationalSwimmerMergeTargetDocs(...arguments);
}

exports.searchEngagementNationalSwimmerMergeTargets = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#searchEngagementNationalSwimmerMergeTargets#arrow */ async (request) => {
  return portalNationalHandlers().searchEngagementNationalSwimmerMergeTargets(request);
});

/* extracted-function: functions/server-national-service.js#performanceMergeTargetPayloadFromSwimmer */
function performanceMergeTargetPayloadFromSwimmer() {
  return serverNationalService().performanceMergeTargetPayloadFromSwimmer(...arguments);
}

/* extracted-function: functions/server-national-service.js#publicPerformanceRowsFromSwimmerPayload */
function publicPerformanceRowsFromSwimmerPayload() {
  return serverNationalService().publicPerformanceRowsFromSwimmerPayload(...arguments);
}

/* extracted-function: functions/server-national-service.js#publishEngagementNationalSwimmerMerge */
async function publishEngagementNationalSwimmerMerge() {
  return serverNationalService().publishEngagementNationalSwimmerMerge(...arguments);
}

/* extracted-function: functions/server-national-service.js#activePerformanceRowsForNationalSwimmer */
async function activePerformanceRowsForNationalSwimmer() {
  return serverNationalService().activePerformanceRowsForNationalSwimmer(...arguments);
}

/* extracted-function: functions/server-national-service.js#readPerformanceDocsForNationalSwimmerMerge */
async function readPerformanceDocsForNationalSwimmerMerge(input0) {
  return serverNationalService().readPerformanceDocsForNationalSwimmerMerge(...arguments);
}

exports.mergeEngagementNationalClubSwimmer = onCall({ ...ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-performance-handlers.js#mergeEngagementNationalClubSwimmer#arrow */ async (request) => {
  return portalPerformanceHandlers().mergeEngagementNationalClubSwimmer(request);
});

exports.repairEngagementNationalSwimmerMergePublication = onCall(ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Reparation reservee au niveau national.");
  if(ENVIRONMENT.sportingDataSource==="nap")throw new HttpsError("failed-precondition","Les fiches NAP sont lues directement. Utilisez Finaliser la fusion depuis la fiche fusionnee.");
  const sourceSwimmerId = cleanText(request.data?.sourceSwimmerId).slice(0, 80);
  const sourceSource = cleanText(request.data?.sourceSource || "performances").slice(0, 40);
  const sourceIdentityKey = cleanText(request.data?.sourceIdentityKey).slice(0, 180);
  if (!sourceSwimmerId) throw new HttpsError("invalid-argument", "Fiche fusionnee requise.");
  const source = await getEngagementNationalSwimmerForMerge(
    db,
    sourceSource,
    sourceSwimmerId,
    sourceIdentityKey,
    { uid: context.uid, now: new Date().toISOString() }
  );
  const sourceSwimmer = source.swimmer;
  if (cleanText(sourceSwimmer.status) !== "merged" || !cleanText(sourceSwimmer.mergedIntoId)) {
    throw new HttpsError("failed-precondition", "Cette fiche n'est pas marquee comme fusionnee.");
  }
  const target = await getEngagementNationalSwimmerForMerge(
    db,
    sourceSwimmer.mergedIntoSource || "performances",
    sourceSwimmer.mergedIntoId,
    "",
    { uid: context.uid, now: new Date().toISOString() }
  );
  const targetRows = await activePerformanceRowsForNationalSwimmer(target);
  const publicSnapshot = await publishEngagementNationalSwimmerMerge(
    sourceSwimmer,
    target.swimmer,
    targetRows,
    { now: new Date().toISOString() }
  );
  await writeAuditLog("engagementClubSwimmer.mergePublicationRepaired", context.uid, {
    sourceSwimmerId: source.ref.id,
    targetSwimmerId: target.ref.id,
    affectedRows: targetRows.length,
    writtenFiles: Number(publicSnapshot.writtenFiles || 0),
    correctedTopBuckets: Number(publicSnapshot.correctedTopBuckets || 0)
  });
  return { ok: true, publicSnapshot };
});

exports.listEngagementNationalClubPeople = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#listEngagementNationalClubPeople#arrow */ async (request) => {
  return portalNationalHandlers().listEngagementNationalClubPeople(request);
});

exports.setEngagementNationalClubPersonStatus = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#setEngagementNationalClubPersonStatus#arrow */ async (request) => {
  return portalNationalHandlers().setEngagementNationalClubPersonStatus(request);
});

exports.deleteEngagementNationalClubPerson = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#deleteEngagementNationalClubPerson#arrow */ async (request) => {
  return portalNationalHandlers().deleteEngagementNationalClubPerson(request);
});

exports.listEngagementNationalAuditLogs = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/portal-national-handlers.js#listEngagementNationalAuditLogs#arrow */ async (request) => {
  return portalNationalHandlers().listEngagementNationalAuditLogs(request);
});

/* extracted-function: functions/server-national-service.js#engagementClubPersonEntrySnapshot */
function engagementClubPersonEntrySnapshot() {
  return serverNationalService().engagementClubPersonEntrySnapshot(...arguments);
}

/* extracted-function: functions/server-national-service.js#engagementClubPersonFullName */
function engagementClubPersonFullName() {
  return serverNationalService().engagementClubPersonFullName(...arguments);
}

/* extracted-function: functions/server-national-service.js#mergeEngagementClubEntryOfficials */
function mergeEngagementClubEntryOfficials() {
  return serverNationalService().mergeEngagementClubEntryOfficials(...arguments);
}

exports.mergeEngagementNationalClubPerson = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-national-handlers.js#mergeEngagementNationalClubPerson#arrow */ async (request) => {
  return portalNationalHandlers().mergeEngagementNationalClubPerson(request);
});

function serverEntryService() {
  if (!serverEntryService.instance) serverEntryService.instance = require("./server-entry-service").createEntryService({
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE() { return ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE; },
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get automaticEngagementIndividualEntry() { return automaticEngagementIndividualEntry; },
    get birthYear() { return birthYear; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementEntryIndividualEntries() { return cleanEngagementEntryIndividualEntries; },
    get cleanEngagementEntryRelays() { return cleanEngagementEntryRelays; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanEngagementMaxEventsPerSwimmer() { return cleanEngagementMaxEventsPerSwimmer; },
    get cleanEngagementMissingEntryTimeMode() { return cleanEngagementMissingEntryTimeMode; },
    get cleanEngagementPoolLength() { return cleanEngagementPoolLength; },
    get cleanEngagementQualificationTimesMode() { return cleanEngagementQualificationTimesMode; },
    get cleanEngagementTimingType() { return cleanEngagementTimingType; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get competitionYear() { return competitionYear; },
    get db() { return db; },
    get engagementClubSwimmerItem() { return engagementClubSwimmerItem; },
    get engagementKnownTimeHistory() { return engagementKnownTimeHistory; },
    get engagementLicenseSeasonState() { return engagementLicenseSeasonState; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get engagementReferenceSwimmerItem() { return engagementReferenceSwimmerItem; },
    get engagementSwimmerLicenseItem() { return engagementSwimmerLicenseItem; },
    get importSeasonYear() { return importSeasonYear; },
    get intranapSwimmersIndex() { return intranapSwimmersIndex; },
    get loadPerformanceRecordsData() { return loadPerformanceRecordsData; },
    get nativeClubEntryView() { return nativeClubEntryView; },
    get parseEngagementEntryTime() { return parseEngagementEntryTime; },
    get qualificationEvents() { return qualificationEvents; },
    get resolveEngagementIndividualEntriesForSwimmer() { return resolveEngagementIndividualEntriesForSwimmer; },
    get validateEngagementIndividualEntryTimes() { return validateEngagementIndividualEntryTimes; },
    get validateEngagementRelayEntryTimes() { return validateEngagementRelayEntryTimes; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return serverEntryService.instance;
}

/* extracted-function: functions/server-entry-service.js#buildEngagementClubSwimmersFromRequest */
async function buildEngagementClubSwimmersFromRequest() {
  return serverEntryService().buildEngagementClubSwimmersFromRequest(...arguments);
}

/* extracted-function: functions/server-entry-service.js#engagementEntryTimeStats */
function engagementEntryTimeStats() {
  return serverEntryService().engagementEntryTimeStats(...arguments);
}

exports.previewEngagementClubEntryTimes = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne saisie Firebase est desactivee. Utilisez les engagements NAP.");
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
  }
  const swimmers = await buildEngagementClubSwimmersFromRequest(request.data || {}, context, { ...competition.data(), qualificationPreview: true });
  return {
    ok: true,
    swimmers,
    stats: engagementEntryTimeStats(swimmers)
  };
});

exports.getEngagementClubEntryTimeHistory = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#getEngagementClubEntryTimeHistory#arrow */ async (request) => {
  return portalClubHandlers().getEngagementClubEntryTimeHistory(request);
});

/* extracted-function: functions/server-entry-service.js#nativeClubEntryTimeHistory */
async function nativeClubEntryTimeHistory(input0, input1, input2, input3) {
  return serverEntryService().nativeClubEntryTimeHistory(...arguments);
}

/* extracted-function: functions/server-entry-service.js#previewNativeClubEntryTimes */
async function previewNativeClubEntryTimes(input0, input1, input2, input3) {
  return serverEntryService().previewNativeClubEntryTimes(...arguments);
}

exports.previewEngagementClubSwimmerEventTimes = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#previewEngagementClubSwimmerEventTimes#arrow */ async (request) => {
  return portalClubHandlers().previewEngagementClubSwimmerEventTimes(request);
});

exports.previewEngagementClubSwimmerEventTimesBatch = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#previewEngagementClubSwimmerEventTimesBatch#arrow */ async (request) => {
  return portalClubHandlers().previewEngagementClubSwimmerEventTimesBatch(request);
});

/* extracted-function: functions/server-entry-service.js#saveNativeClubIndividualEntries */
async function saveNativeClubIndividualEntries(input0, input1) {
  return serverEntryService().saveNativeClubIndividualEntries(...arguments);
}

exports.saveEngagementClubIndividualEntries = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#saveEngagementClubIndividualEntries#arrow */ async (request) => {
  return portalClubHandlers().saveEngagementClubIndividualEntries(request);
});

/* extracted-function: functions/server-entry-service.js#saveNativeClubSwimmerSelections */
async function saveNativeClubSwimmerSelections(input0, input1, input2) {
  return serverEntryService().saveNativeClubSwimmerSelections(...arguments);
}

exports.saveEngagementClubSwimmerSelection = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#saveEngagementClubSwimmerSelection#arrow */ async (request) => {
  return portalClubHandlers().saveEngagementClubSwimmerSelection(request);
});

exports.saveEngagementClubSwimmerSelections = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#saveEngagementClubSwimmerSelections#arrow */ async (request) => {
  return portalClubHandlers().saveEngagementClubSwimmerSelections(request);
});

exports.saveEngagementClubSwimmers = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne saisie Firebase est desactivee. Utilisez les engagements NAP.");
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les nageurs.");
  }

  const competitionData = { ...competition.data(), id: competition.id };
  const swimmers = await buildEngagementClubSwimmersFromRequest(request.data || {}, context, competitionData);
  assertEngagementSwimmerRoleCompatibility(entry.data() || {}, swimmers);

  const now = new Date().toISOString();
  const relays = qualificationRelaysAfterIndividualChange(entry.data()?.relays || [], swimmers, competitionData);
  await db.runTransaction(async (batch) => {
  const currentCompetition = await batch.get(competition.ref);
  const currentEntry = await batch.get(entryRef);
  assertEngagementClubWriteOpen(currentCompetition.data() || {});
  if (currentCompetition.updateTime.toMillis() !== competition.updateTime.toMillis() || currentEntry.updateTime.toMillis() !== entry.updateTime.toMillis()) throw new HttpsError("aborted", "La fiche a changé. Rechargez-la.");
  qualificationService().revokeRemovedExceptions(batch, competitionId, currentEntry.data()?.swimmers || [], swimmers, context.uid);
  batch.set(entryRef, {
    swimmers,
    relays,
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  swimmers.forEach((swimmer) => {
    if (!swimmer.licenseNumber) return;
    if (!swimmer.licenseLocked && swimmer.source !== "reference") {
      const swimmerCollection = swimmer.source === "engagement" ? "engagementClubSwimmers" : PERFORMANCE_SWIMMERS_COLLECTION;
      const swimmerRef = db.collection(swimmerCollection).doc(swimmer.swimmerIndexId);
      batch.set(swimmerRef, {
        licenseNumber: cleanText(swimmer.licenseNumber).slice(0, 60),
        licenseVerificationStatus: cleanEngagementLicenseVerificationStatus(swimmer.licenseVerificationStatus, "pending"),
        licenseSeasonLabel: cleanText(swimmer.licenseSeasonLabel).slice(0, 20),
        licenseSeasonStatus: cleanEngagementLicenseSeasonStatus(swimmer.licenseSeasonStatus, "to_check"),
        licenseUpdatedAt: now,
        licenseUpdatedBy: context.uid,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    }
    if (!swimmer.licenseLocked) {
      const licenseRef = db.collection("engagementSwimmerLicenses").doc(engagementSwimmerLicenseId(swimmer));
      const licensePayload = {
        ...engagementSwimmerLicensePayload(swimmer, context, {
          type: "engagement",
          verificationSource: "club",
          competitionId,
          collectedAt: now
        }),
        updatedAt: now,
        updatedBy: context.uid
      };
      batch.set(licenseRef, licensePayload, { merge: true });
    }
    upsertEngagementClubRosterSwimmer(batch, db, swimmer, now);
  });
  });
  await writeAuditLog("engagementClubEntry.swimmersSaved", context.uid, {
    competitionId,
    clubId: context.clubId,
    swimmerCount: swimmers.length
  });
  const updatedEntryData = {
    ...(entry.data() || {}),
    swimmers,
    relays,
    updatedAt: now,
    updatedBy: context.uid
  };
  return {
    ok: true,
    entry: engagementClubEntryItem({
      id: entryRef.id,
      exists: true,
      data: () => updatedEntryData
    })
  };
});

/* extracted-function: functions/server-entry-service.js#saveNativeClubRelays */
async function saveNativeClubRelays(input0, input1) {
  return serverEntryService().saveNativeClubRelays(...arguments);
}

exports.saveEngagementClubRelays = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-club-handlers.js#saveEngagementClubRelays#arrow */ async (request) => {
  return portalClubHandlers().saveEngagementClubRelays(request);
});

exports.createEngagementCompetition = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4, timeoutSeconds:120 } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#createEngagementCompetition#arrow */ async (request) => {
  return portalCompetitionHandlers().createEngagementCompetition(request);
});

exports.updateEngagementCompetition = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4, timeoutSeconds:120 } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#updateEngagementCompetition#arrow */ async (request) => {
  return portalCompetitionHandlers().updateEngagementCompetition(request);
});

exports.deleteEngagementCompetition = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-competition-handlers.js#deleteEngagementCompetition#arrow */ async (request) => {
  return portalCompetitionHandlers().deleteEngagementCompetition(request);
});

exports.requestEngagementCompetitionDeletion = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est desactivee : utilisez la fiche NAP.");
  const context = await engagementAccessContext(request);
  if (context.national) {
    throw new HttpsError("failed-precondition", "Un niveau national peut supprimer directement l'evenement.");
  }
  const calendarEventId = cleanText(request.data?.calendarEventId).slice(0, 128);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  const eventId = calendarEventId || competitionId;
  const sourceType = calendarEventId ? "calendarEvent" : "competition";
  if (!eventId) {
    throw new HttpsError("invalid-argument", "Competition ou evenement requis.");
  }

  const collection = sourceType === "calendarEvent" ? ENGAGEMENT_CALENDAR_EVENTS_COLLECTION : "engagementCompetitions";
  const docRef = db.collection(collection).doc(eventId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Competition ou evenement introuvable.");
  }

  const eventData = snapshot.data() || {};
  assertCanManageEngagementCompetition(context, eventData);

  const now = new Date().toISOString();
  const payload = {
    sourceType,
    eventId,
    competitionId: sourceType === "competition" ? eventId : "",
    calendarEventId: sourceType === "calendarEvent" ? eventId : "",
    competitionName: eventData.name || "",
    competitionDate: eventData.date || "",
    competitionLevel: eventData.level || "",
    regionId: eventData.regionId || "",
    status: "pending",
    requestedAt: now,
    requestedBy: context.uid,
    requestedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid
  };
  const requestId = engagementDeletionRequestId(sourceType, eventId);
  await db.collection("engagementCompetitionDeletionRequests").doc(requestId).set(payload, { merge: true });
  await writeAuditLog("engagementCompetition.deletionRequested", context.uid, {
    sourceType,
    eventId,
    name: payload.competitionName,
    date: payload.competitionDate,
    regionId: payload.regionId,
    level: payload.competitionLevel
  });
  return {
    ok: true,
    requested: true,
    requestId
  };
});

exports.listEngagementCompetitionDeletionRequests = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  }
  const status = ["pending", "approved", "rejected"].includes(cleanText(request.data?.status))
    ? cleanText(request.data.status)
    : "pending";
  if (ENVIRONMENT.sportingDataSource === "nap") return { ok: true, source: "nap", status, requests: [] };
  const limit = Math.min(100, Math.max(10, Math.trunc(Number(request.data?.limit) || 50)));
  const snapshot = await db
    .collection("engagementCompetitionDeletionRequests")
    .where("status", "==", status)
    .limit(limit)
    .get();

  const requests = snapshot.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        sourceType: cleanText(data.sourceType) === "calendarEvent" ? "calendarEvent" : "competition",
        eventId: cleanText(data.eventId || data.calendarEventId || data.competitionId),
        competitionId: cleanText(data.competitionId),
        calendarEventId: cleanText(data.calendarEventId),
        competitionName: cleanText(data.competitionName),
        competitionDate: cleanText(data.competitionDate),
        competitionLevel: cleanText(data.competitionLevel),
        regionId: cleanText(data.regionId),
        status: cleanText(data.status),
        requestedAt: cleanText(data.requestedAt),
        requestedBy: cleanText(data.requestedBy),
        requestedByEmail: cleanText(data.requestedByEmail)
      };
    })
    .sort((left, right) => String(right.requestedAt || "").localeCompare(String(left.requestedAt || "")));

  return {
    ok: true,
    status,
    requests
  };
});

exports.resolveEngagementCompetitionDeletionRequest = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est desactivee : utilisez la fiche NAP.");
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Validation reservee au niveau national.");
  }
  const requestId = cleanText(request.data?.requestId).slice(0, 128);
  const decision = cleanText(request.data?.decision);
  if (!requestId) {
    throw new HttpsError("invalid-argument", "Demande requise.");
  }
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Decision invalide.");
  }

  const requestRef = db.collection("engagementCompetitionDeletionRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();
  if (!requestSnapshot.exists) {
    throw new HttpsError("not-found", "Demande de suppression introuvable.");
  }
  const deletionRequest = requestSnapshot.data() || {};
  if (deletionRequest.status && deletionRequest.status !== "pending") {
    throw new HttpsError("failed-precondition", "Demande deja traitee.");
  }

  const sourceType = cleanText(deletionRequest.sourceType) === "calendarEvent" ? "calendarEvent" : "competition";
  const eventId = cleanText(deletionRequest.eventId || deletionRequest.calendarEventId || deletionRequest.competitionId || requestId).slice(0, 128);
  const collection = sourceType === "calendarEvent" ? ENGAGEMENT_CALENDAR_EVENTS_COLLECTION : "engagementCompetitions";
  const eventRef = db.collection(collection).doc(eventId);
  const eventSnapshot = await eventRef.get();
  const eventData = eventSnapshot.exists ? eventSnapshot.data() || {} : {};
  const now = new Date().toISOString();
  const batch = db.batch();
  if (decision === "approved" && eventSnapshot.exists) {
    batch.delete(eventRef);
  }
  batch.set(requestRef, {
    status: decision,
    decidedAt: now,
    decidedBy: context.uid,
    decidedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  await batch.commit();
  const documents = cleanCompetitionDocuments(eventData.clubDocuments || [], { includeUploader: true });
  const documentDeletionResults = decision === "approved" && eventSnapshot.exists
    ? await Promise.allSettled(documents.filter(hasManagedEngagementCompetitionDocumentStorage).map((document) =>
        storage.bucket(LIVEPALMES_STORAGE_BUCKET)
          .file(assertEngagementCompetitionDocumentPath(document.storagePath))
          .delete({ ignoreNotFound: true })
      ))
    : [];

  await writeAuditLog("engagementCompetition.deletionRequestResolved", context.uid, {
    requestId,
    decision,
    sourceType,
    eventId,
    name: eventData.name || deletionRequest.competitionName || "",
    date: eventData.date || deletionRequest.competitionDate || "",
    regionId: eventData.regionId || deletionRequest.regionId || "",
    level: eventData.level || deletionRequest.competitionLevel || "",
    documentCount: documents.length,
    documentDeleteErrorCount: documentDeletionResults.filter((result) => result.status === "rejected").length
  });
  return {
    ok: true,
    decision,
    competitionDeleted: decision === "approved" && eventSnapshot.exists,
    sourceType,
    eventId
  };
});

exports.previewCompetitionImport = onCall(COMPETITION_IMPORT_CALLABLE_OPTIONS, /* extracted-handler: functions/portal-performance-handlers.js#previewCompetitionImport#arrow */ async (request) => {
  return portalPerformanceHandlers().previewCompetitionImport(request);
});

function serverPerformanceService() {
  if (!serverPerformanceService.instance) serverPerformanceService.instance = require("./server-performance-service").createPerformanceService({
    get CATEGORY_LABELS() { return CATEGORY_LABELS; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_BASE_CHANGES_COLLECTION() { return PERFORMANCE_BASE_CHANGES_COLLECTION; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get PERFORMANCE_PUBLICATION_JOBS_COLLECTION() { return PERFORMANCE_PUBLICATION_JOBS_COLLECTION; },
    get PERFORMANCE_TOP_BUCKETS_COLLECTION() { return PERFORMANCE_TOP_BUCKETS_COLLECTION; },
    get PERFORMANCE_TOP_INDEX_LIMIT() { return PERFORMANCE_TOP_INDEX_LIMIT; },
    get POOL_COURSES() { return POOL_COURSES; },
    get activeCompetitionImportData() { return activeCompetitionImportData; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get categoryCodeFromCategory() { return categoryCodeFromCategory; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get cleanTimingType() { return cleanTimingType; },
    get competitionImportIdentity() { return competitionImportIdentity; },
    get coursePayload() { return coursePayload; },
    get db() { return db; },
    get fallbackCategoryFromSource() { return fallbackCategoryFromSource; },
    get importPublicationError() { return importPublicationError; },
    get importPublicationResultStatus() { return importPublicationResultStatus; },
    get importSeasonYear() { return importSeasonYear; },
    get invalidateEngagementEntryTimeCachesForPerformanceRows() { return invalidateEngagementEntryTimeCachesForPerformanceRows; },
    get normalizeCategoryCode() { return normalizeCategoryCode; },
    get normalizeCourseCode() { return normalizeCourseCode; },
    get performanceCategoryFromRow() { return performanceCategoryFromRow; },
    get performanceImportChrono() { return performanceImportChrono; },
    get publicPerformancePublicationJob() { return publicPerformancePublicationJob; },
    get publishIncrementalPerformanceImport() { return publishIncrementalPerformanceImport; },
    get publishIncrementalPublicPerformanceFiles() { return publishIncrementalPublicPerformanceFiles; },
    get readPublishedAdditionalPerformanceDataSnapshot() { return readPublishedAdditionalPerformanceDataSnapshot; },
    get resolveIntranapSwimmer() { return resolveIntranapSwimmer; },
    get sameCompetitionImport() { return sameCompetitionImport; },
    get stableHash() { return stableHash; },
    get swimmerIdentityKey() { return swimmerIdentityKey; },
    get touchDtnQualificationCacheState() { return touchDtnQualificationCacheState; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return serverPerformanceService.instance;
}

/* extracted-function: functions/server-performance-service.js#competitionImportPublicSnapshotSummary */
function competitionImportPublicSnapshotSummary() {
  return serverPerformanceService().competitionImportPublicSnapshotSummary(...arguments);
}

/* extracted-function: functions/server-performance-service.js#publishCompetitionImportOutputs */
async function publishCompetitionImportOutputs() {
  return serverPerformanceService().publishCompetitionImportOutputs(...arguments);
}

/* extracted-function: functions/server-performance-service.js#competitionImportPerformanceId */
function competitionImportPerformanceId(input0) {
  return serverPerformanceService().competitionImportPerformanceId(...arguments);
}

/* extracted-function: functions/server-performance-service.js#stageCompetitionImportReplacement */
async function stageCompetitionImportReplacement() {
  return serverPerformanceService().stageCompetitionImportReplacement(...arguments);
}

exports.createCompetitionImport = onCall(COMPETITION_IMPORT_CALLABLE_OPTIONS, /* extracted-handler: functions/portal-performance-handlers.js#createCompetitionImport#arrow */ async (request) => {
  return portalPerformanceHandlers().createCompetitionImport(request);
});

exports.resumeCompetitionImportPublication = onCall(COMPETITION_IMPORT_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  const importId = cleanText(request.data?.importId).slice(0, 160);
  if (!importId) {
    throw new HttpsError("invalid-argument", "Import inconnu.");
  }

  const importRef = db.collection("performanceImports").doc(importId);
  const claimedAt = new Date().toISOString();
  let importData = {};
  await db.runTransaction(async (transaction) => {
    const importSnapshot = await transaction.get(importRef);
    if (!importSnapshot.exists) {
      throw new HttpsError("not-found", "Import introuvable.");
    }
    importData = importSnapshot.data() || {};
    if (!canResumeImportPublication(importData, Date.parse(claimedAt))) {
      throw new HttpsError("failed-precondition", "Cet import ne necessite pas de reprise de publication.");
    }
    transaction.set(importRef, {
      publicationStatus: "publishing",
      publicationStartedAt: claimedAt,
      publicationUpdatedAt: claimedAt,
      publicationError: ""
    }, { merge: true });
  });

  let rawSnapshot = null;
  let normalizedPerformances = [];
  try {
    const expectedCount = Number(importData.performanceBaseCount || importData.summary?.importedPerformances || 0) || 0;
    if (!expectedCount || expectedCount > MAX_COMPETITION_IMPORT_PERFORMANCES) {
      throw new HttpsError("failed-precondition", "Volume de l'import incompatible avec la reprise automatique.");
    }
    rawSnapshot = await importRef.collection("performances").limit(expectedCount + 1).get();
    if (rawSnapshot.size !== expectedCount) {
      throw new HttpsError(
        "failed-precondition",
        `Import incomplet : ${rawSnapshot.size} performance(s) stockee(s) sur ${expectedCount} attendue(s).`
      );
    }

    const rawPerformances = rawSnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
    normalizedPerformances = normalizeLivePalmesImportPerformances(rawPerformances);
    if (normalizedPerformances.length !== expectedCount) {
      throw new HttpsError(
        "failed-precondition",
        `Reprise incomplete : ${normalizedPerformances.length} performance(s) normalisee(s) sur ${expectedCount} attendue(s).`
      );
    }
  } catch (error) {
    const failedAt = new Date().toISOString();
    await importRef.set({
      publicationStatus: "failed",
      publicationUpdatedAt: failedAt,
      publicationError: cleanText(error?.message || error).slice(0, 500)
    }, { merge: true });
    throw error;
  }

  const now = new Date().toISOString();
  const actorUid = request.auth.uid;
  const actorEmail = request.auth.token?.email || "";
  const publication = await publishCompetitionImportOutputs(normalizedPerformances, importRef, {
    importId,
    now
  });
  await writeAuditLog("performanceImport.publicationResumed", actorUid, {
    importId,
    actorEmail,
    performanceCount: normalizedPerformances.length,
    publicationStatus: publication.publicationStatus,
    publicSnapshot: competitionImportPublicSnapshotSummary(publication.publicSnapshot),
    publicFilesSnapshot: competitionImportPublicSnapshotSummary(publication.publicFilesSnapshot)
  });

  return {
    ok: publication.publicationStatus === "published",
    importId,
    performanceCount: normalizedPerformances.length,
    publicationStatus: publication.publicationStatus,
    publicSnapshot: publication.publicSnapshot,
    publicFilesSnapshot: publication.publicFilesSnapshot,
    readStats: {
      importDocuments: 1,
      performanceDocuments: rawSnapshot?.size || 0,
      maximumPerformanceDocuments: MAX_COMPETITION_IMPORT_PERFORMANCES,
      maximumPerformanceDocumentReads: MAX_COMPETITION_IMPORT_PERFORMANCES + 1
    }
  };
});

exports.listCompetitionImports = onCall(COMPETITION_IMPORT_CALLABLE_OPTIONS, /* extracted-handler: functions/portal-performance-handlers.js#listCompetitionImports#arrow */ async (request) => {
  return portalPerformanceHandlers().listCompetitionImports(request);
});

/* extracted-function: functions/server-performance-service.js#markCompetitionImportDeleted */
async function markCompetitionImportDeleted(input0) {
  return serverPerformanceService().markCompetitionImportDeleted(...arguments);
}

exports.deleteCompetitionImport = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  const importId = cleanText(request.data?.importId).slice(0, 160);
  if (!importId) {
    throw new HttpsError("invalid-argument", "Import inconnu.");
  }
  const now = new Date().toISOString();
  const actorUid = request.auth.uid;
  const actorEmail = request.auth.token?.email || "";
  const result = await markCompetitionImportDeleted(importId, {
    now,
    actorUid,
    actorEmail
  });
  if (result.alreadyDeleted) return result;
  await touchDtnQualificationCacheState(result.affectedRows || [], {
    action: "performanceImport.deleted",
    now
  });

  let publicSnapshot = null;
  try {
    publicSnapshot = await saveAdditionalPerformanceDataSnapshot({
      ...(result.publishedSnapshot || {}),
      performances: (result.publishedSnapshot?.performances || [])
        .filter((row) => cleanText(row.importId) !== importId)
    });
  } catch (error) {
    console.error("Publication publique impossible apres suppression import", {
      importId,
      message: error?.message || String(error)
    });
    publicSnapshot = {
      ok: false,
      error: error?.message || "Publication publique impossible."
    };
  }

  let publicFilesSnapshot = null;
  try {
    const deactivatedRows = deactivatedImportPerformanceRows(result.affectedRows);
    publicFilesSnapshot = await rebuildPublicPerformanceFilesForAffectedRows(deactivatedRows, {
      now,
      reason: "performanceImport.deleted",
      importId
    });
    await invalidateEngagementEntryTimeCachesForPerformanceRows(result.affectedRows || []);
  } catch (error) {
    console.error("Publication publique ciblee impossible apres suppression import", {
      importId,
      message: error?.message || String(error)
    });
    publicFilesSnapshot = {
      ok: false,
      error: error?.message || "Publication publique ciblee impossible."
    };
  }

  await writeAuditLog("performanceImport.deleted", actorUid, {
    importId,
    actorEmail,
    importPerformanceCount: result.importPerformanceCount,
    performanceBaseCount: result.performanceBaseCount,
    publicSnapshot,
    publicFilesSnapshot
  });

  const { affectedRows, publishedSnapshot, ...publicResult } = result;
  return {
    ...publicResult,
    publicSnapshot,
    publicFilesSnapshot
  };
});

exports.updateCompetitionImportRecordAlertDecision = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  const importId = cleanText(request.data?.importId).slice(0, 160);
  const alertIndex = Number(request.data?.alertIndex);
  const status = cleanText(request.data?.status);
  const allowedStatuses = new Set(["pending", "accepted", "rejected"]);
  if (!importId) {
    throw new HttpsError("invalid-argument", "Import inconnu.");
  }
  if (!Number.isInteger(alertIndex) || alertIndex < 0) {
    throw new HttpsError("invalid-argument", "Alerte inconnue.");
  }
  if (!allowedStatuses.has(status)) {
    throw new HttpsError("invalid-argument", "Decision inconnue.");
  }

  const importRef = db.collection("performanceImports").doc(importId);
  const importDoc = await importRef.get();
  if (!importDoc.exists) {
    throw new HttpsError("not-found", "Import introuvable.");
  }
  const data = importDoc.data() || {};
  const recordAlerts = Array.isArray(data.recordAlerts) ? data.recordAlerts.slice() : [];
  if (!recordAlerts[alertIndex]) {
    throw new HttpsError("not-found", "Alerte introuvable.");
  }

  const now = new Date().toISOString();
  const updatedByName = await accessUserDisplayName(request.auth.uid, request.auth.token || {});
  const nextAlert = { ...recordAlerts[alertIndex] };
  if (status === "pending") {
    delete nextAlert.decision;
  } else {
    nextAlert.decision = {
      status,
      updatedAt: now,
      updatedBy: request.auth.uid,
      updatedByEmail: request.auth.token?.email || "",
      updatedByName
    };
  }
  recordAlerts[alertIndex] = cleanFirestoreValue(nextAlert);

  await importRef.set({
    recordAlerts,
    recordAlertDecisionUpdatedAt: now,
    updatedAt: now
  }, { merge: true });

  await writeAuditLog("performanceImport.recordAlertDecision", request.auth.uid, {
    importId,
    alertIndex,
    status,
    alert: {
      type: nextAlert.type || "",
      swimmer: nextAlert.swimmer || "",
      course: nextAlert.course || "",
      time: nextAlert.time || "",
      referenceTime: nextAlert.referenceTime || ""
    }
  });

  return {
    ok: true,
    importId,
    alertIndex,
    status,
    recordAlerts: recordAlerts.slice(0, 20)
  };
});

/* extracted-function: functions/server-performance-service.js#performancePublicKey */
function performancePublicKey() {
  return serverPerformanceService().performancePublicKey(...arguments);
}

/* extracted-function: functions/server-performance-service.js#performanceBaseDocId */
function performanceBaseDocId() {
  return serverPerformanceService().performanceBaseDocId(...arguments);
}

/* extracted-function: functions/server-performance-service.js#normalizeLivePalmesImportPerformances */
function normalizeLivePalmesImportPerformances() {
  return serverPerformanceService().normalizeLivePalmesImportPerformances(...arguments);
}

/* extracted-function: functions/server-performance-service.js#cleanPerformanceBaseRow */
function cleanPerformanceBaseRow() {
  return serverPerformanceService().cleanPerformanceBaseRow(...arguments);
}

/* extracted-function: functions/server-performance-service.js#writePerformanceBaseRows */
async function writePerformanceBaseRows() {
  return serverPerformanceService().writePerformanceBaseRows(...arguments);
}

/* extracted-function: functions/server-performance-service.js#publicPerformanceBaseRow */
function publicPerformanceBaseRow() {
  return serverPerformanceService().publicPerformanceBaseRow(...arguments);
}

/* extracted-function: functions/server-performance-service.js#uniquePublicPerformanceRows */
function uniquePublicPerformanceRows() {
  return serverPerformanceService().uniquePublicPerformanceRows(...arguments);
}

/* extracted-function: functions/server-performance-service.js#publicSwimmerKey */
function publicSwimmerKey() {
  return serverPerformanceService().publicSwimmerKey(...arguments);
}

/* extracted-function: functions/server-performance-service.js#publicBetterPerformance */
function publicBetterPerformance(input0, input1) {
  return serverPerformanceService().publicBetterPerformance(...arguments);
}

/* extracted-function: functions/server-performance-service.js#publicTopIndexRow */
function publicTopIndexRow() {
  return serverPerformanceService().publicTopIndexRow(...arguments);
}

/* extracted-function: functions/server-performance-service.js#performanceTopBucketKey */
function performanceTopBucketKey() {
  return serverPerformanceService().performanceTopBucketKey(...arguments);
}

/* extracted-function: functions/server-performance-service.js#performanceTopBucketId */
function performanceTopBucketId(input0) {
  return serverPerformanceService().performanceTopBucketId(...arguments);
}

/* extracted-function: functions/server-performance-service.js#performanceTopBucketVariants */
function performanceTopBucketVariants() {
  return serverPerformanceService().performanceTopBucketVariants(...arguments);
}

/* extracted-function: functions/server-performance-service.js#bestTopRows */
function bestTopRows() {
  return serverPerformanceService().bestTopRows(...arguments);
}

/* extracted-function: functions/server-performance-service.js#encodePerformanceTopIndexRows */
function encodePerformanceTopIndexRows(input0) {
  return serverPerformanceService().encodePerformanceTopIndexRows(...arguments);
}

/* extracted-function: functions/server-performance-service.js#readPerformanceTopIndexRows */
function readPerformanceTopIndexRows() {
  return serverPerformanceService().readPerformanceTopIndexRows(...arguments);
}

/* extracted-function: functions/server-performance-service.js#writePerformanceTopIndexRows */
async function writePerformanceTopIndexRows() {
  return serverPerformanceService().writePerformanceTopIndexRows(...arguments);
}

/* extracted-function: functions/server-performance-service.js#performanceTopRowsFromIndex */
async function performanceTopRowsFromIndex() {
  return serverPerformanceService().performanceTopRowsFromIndex(...arguments);
}

function serverDtnService() {
  if (!serverDtnService.instance) serverDtnService.instance = require("./server-dtn-service").createDtnService({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get DTN_EDF_LIMOGES_COMPETITION_ID() { return DTN_EDF_LIMOGES_COMPETITION_ID; },
    get DTN_LISTING_CACHE_VERSION() { return DTN_LISTING_CACHE_VERSION; },
    get DTN_NEAR_MINIMUM_MAX_PERCENT() { return DTN_NEAR_MINIMUM_MAX_PERCENT; },
    get DTN_QUALIFICATION_CACHE_COLLECTION() { return DTN_QUALIFICATION_CACHE_COLLECTION; },
    get DTN_QUALIFICATION_CACHE_STATE_COLLECTION() { return DTN_QUALIFICATION_CACHE_STATE_COLLECTION; },
    get DTN_QUALIFICATION_CACHE_VERSION() { return DTN_QUALIFICATION_CACHE_VERSION; },
    get DTN_QUALIFICATION_JOBS_COLLECTION() { return DTN_QUALIFICATION_JOBS_COLLECTION; },
    get DTN_QUALIFICATION_MAX_ROWS_PER_COURSE() { return DTN_QUALIFICATION_MAX_ROWS_PER_COURSE; },
    get ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES() { return ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldPath() { return FieldPath; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get POOL_COURSES() { return POOL_COURSES; },
    get assertCapability() { return assertCapability; },
    get assertLivePalmesAccess() { return assertLivePalmesAccess; },
    get birthYear() { return birthYear; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get createDtnSeasonService() { return createDtnSeasonService; },
    get db() { return db; },
    get importSeasonYear() { return importSeasonYear; },
    get publicBetterPerformance() { return publicBetterPerformance; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get publicPerformanceTopFileName() { return publicPerformanceTopFileName; },
    get publicSwimmerKey() { return publicSwimmerKey; },
    get readPublicPerformanceJson() { return readPublicPerformanceJson; },
    get stableHash() { return stableHash; },
    get uniquePublicPerformanceRows() { return uniquePublicPerformanceRows; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return serverDtnService.instance;
}

/* extracted-function: functions/server-dtn-service.js#dtnSeasonService */
function dtnSeasonService() {
  return serverDtnService().dtnSeasonService(...arguments);
}

const DTN_SEASON_OPTIONS = ENVIRONMENT.sportingDataSource === "nap" ? {
  ...CALLABLE_OPTIONS, secrets: ["LIVEPALMES_NAP_PASSWORD"], timeoutSeconds: 540, memory: "1GiB", maxInstances: 2, concurrency: 4
} : CALLABLE_OPTIONS;
/* extracted-function: functions/server-dtn-service.js#invokeDtnSeason */
async function invokeDtnSeason(input0, input1) {
  return serverDtnService().invokeDtnSeason(...arguments);
}
exports.getDtnSeasons = onCall(DTN_SEASON_OPTIONS, /* extracted-handler: functions/portal-performance-handlers.js#getDtnSeasons#expression */ (request) => {
  return portalPerformanceHandlers().getDtnSeasons(request);
});
exports.updateDtnSeason = onCall(DTN_SEASON_OPTIONS, /* extracted-handler: functions/portal-performance-handlers.js#updateDtnSeason#expression */ (request) => {
  return portalPerformanceHandlers().updateDtnSeason(request);
});
exports.getDtnSeasonOverview = onCall(DTN_SEASON_OPTIONS, /* extracted-handler: functions/portal-performance-handlers.js#getDtnSeasonOverview#expression */ (request) => {
  return portalPerformanceHandlers().getDtnSeasonOverview(request);
});
exports.listDtnSeasonSources = onCall(DTN_SEASON_OPTIONS, /* extracted-handler: functions/portal-performance-handlers.js#listDtnSeasonSources#expression */ (request) => {
  return portalPerformanceHandlers().listDtnSeasonSources(request);
});

/* extracted-function: functions/server-dtn-service.js#dtnQualificationRow */
function dtnQualificationRow() {
  return serverDtnService().dtnQualificationRow(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#bestDtnQualificationRows */
function bestDtnQualificationRows() {
  return serverDtnService().bestDtnQualificationRows(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#nearDtnQualificationRows */
function nearDtnQualificationRows() {
  return serverDtnService().nearDtnQualificationRows(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#dtnQualificationCacheStateRef */
function dtnQualificationCacheStateRef(input0) {
  return serverDtnService().dtnQualificationCacheStateRef(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#dtnQualificationCacheRef */
function dtnQualificationCacheRef(input0, input1) {
  return serverDtnService().dtnQualificationCacheRef(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#dtnListingCacheRef */
function dtnListingCacheRef(input0) {
  return serverDtnService().dtnListingCacheRef(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#dtnQualificationSeasonsForRows */
function dtnQualificationSeasonsForRows() {
  return serverDtnService().dtnQualificationSeasonsForRows(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#touchDtnQualificationCacheState */
async function touchDtnQualificationCacheState() {
  return serverDtnService().touchDtnQualificationCacheState(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#dtnQualificationCacheFingerprint */
function dtnQualificationCacheFingerprint(input0) {
  return serverDtnService().dtnQualificationCacheFingerprint(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#dtnQualificationRowsForStandard */
function dtnQualificationRowsForStandard() {
  return serverDtnService().dtnQualificationRowsForStandard(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#dtnListingCacheFingerprint */
function dtnListingCacheFingerprint(input0) {
  return serverDtnService().dtnListingCacheFingerprint(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#emptyDtnQualificationPayload */
function emptyDtnQualificationPayload(input0) {
  return serverDtnService().emptyDtnQualificationPayload(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#buildDtnQualificationPayload */
async function buildDtnQualificationPayload(input0) {
  return serverDtnService().buildDtnQualificationPayload(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#emptyDtnListingPayload */
function emptyDtnListingPayload(input0) {
  return serverDtnService().emptyDtnListingPayload(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#isDtnElectronicFiftyMeterPerformance */
function isDtnElectronicFiftyMeterPerformance() {
  return serverDtnService().isDtnElectronicFiftyMeterPerformance(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#dtnListingAthletes */
function dtnListingAthletes() {
  return serverDtnService().dtnListingAthletes(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#buildDtnListingPayload */
async function buildDtnListingPayload(input0) {
  return serverDtnService().buildDtnListingPayload(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#enqueueDtnQualificationJob */
async function enqueueDtnQualificationJob() {
  return serverDtnService().enqueueDtnQualificationJob(...arguments);
}

exports.buildDtnQualificationView = onDocumentCreated(DTN_QUALIFICATION_JOB_OPTIONS, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return;
  const snapshot = event.data;
  if (!snapshot?.exists) return;
  const job = snapshot.data() || {};
  if (job.view === "season") return dtnSeasonService().build(snapshot);
  if (snapshot.id.startsWith("season-lock-")) return;
  const listingView = cleanText(job.view) === "listing";
  const seasonYear = Number(job.seasonYear || 0);
  const sex = normalizeCategoryCode(job.sex);
  const standards = Array.isArray(job.standards) ? job.standards : [];
  const rules = Array.isArray(job.rules) ? job.rules : [];
  const competitionIds = Array.isArray(job.competitionIds) ? job.competitionIds.map(cleanText).filter(Boolean) : [];
  const sourceVersion = Number(job.sourceVersion || 0) || 0;
  const listingVersion = Number(job.listingVersion || 0) || 0;
  const fingerprint = cleanText(job.fingerprint);
  const startedAt = Date.now();
  await snapshot.ref.set({ status: "running", startedAt: new Date().toISOString() }, { merge: true });
  try {
    const payload = listingView
      ? await buildDtnListingPayload({ seasonYear, rules })
      : await buildDtnQualificationPayload({ seasonYear, sex, standards, competitionIds });
    const stateSnapshot = await dtnQualificationCacheStateRef(seasonYear).get();
    const latestSourceVersion = Number(stateSnapshot.data()?.version || 0) || 0;
    const latestListingVersion = Number(stateSnapshot.data()?.listingVersion || 0) || 0;
    if (latestSourceVersion !== sourceVersion || (listingView && latestListingVersion !== listingVersion)) {
      await snapshot.ref.set({ status: "obsolete", completedAt: new Date().toISOString() }, { merge: true });
      return;
    }
    const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    if (payloadBytes >= 900000) throw new Error("Vue DTN trop volumineuse pour le cache Firestore.");
    const generatedAt = new Date().toISOString();
    const cacheRef = listingView ? dtnListingCacheRef(seasonYear) : dtnQualificationCacheRef(seasonYear, sex);
    await cacheRef.set({
      fingerprint,
      sourceVersion,
      ...(listingView ? { listingVersion } : {}),
      generatedAt,
      payloadBytes,
      payload: cleanFirestoreValue(payload)
    }, { merge: false });
    await snapshot.ref.set({
      status: "completed",
      completedAt: generatedAt,
      durationMs: Date.now() - startedAt,
      scannedRows: Number(payload.readStats?.scannedRows || 0)
    }, { merge: true });
  } catch (error) {
    console.error("Construction asynchrone DTN impossible", { seasonYear, sex, view: listingView ? "listing" : "edf", error: cleanText(error?.message || error) });
    await snapshot.ref.set({
      status: "failed",
      failedAt: new Date().toISOString(),
      error: cleanText(error?.message || error).slice(0, 300)
    }, { merge: true });
  }
});

exports.refreshDtnQualificationCache = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "dtn.view");
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Utilisez la DTN par saison pour recalculer les resultats.");
  const seasonYear = Number(request.data?.seasonYear || 0);
  if (!Number.isInteger(seasonYear) || !DTN_EDF_COMPETITION_IDS_BY_SEASON[seasonYear]) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }

  const stateRef = dtnQualificationCacheStateRef(seasonYear);
  const now = new Date().toISOString();
  const sourceVersion = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateRef);
    const current = Number(snapshot.data()?.version || 0) || 0;
    const next = current + 1;
    transaction.set(stateRef, {
      version: next,
      updatedAt: now,
      reason: "dtn.manual-refresh"
    }, { merge: true });
    return next;
  });

  return { ok: true, seasonYear, sourceVersion, refreshedAt: now };
});

exports.getDtnQualificationOverview = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  assertCapability(request, "dtn.view");
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Utilisez la DTN par saison pour consulter les resultats.");
  const seasonYear = Number(request.data?.seasonYear || 0);
  const sex = normalizeCategoryCode(request.data?.sex);
  const allowedStandardIds = new Set(["TSP", "TRP", "TJP", "TEP", "TU16C2", "TU16C1"]);
  const rawStandards = Array.isArray(request.data?.standards) ? request.data.standards.slice(0, 6) : [];
  if (!Number.isInteger(seasonYear) || seasonYear < 2000 || seasonYear > 2100) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }
  if (sex !== "F" && sex !== "M") {
    throw new HttpsError("invalid-argument", "Sexe DTN invalide.");
  }
  const standards = rawStandards.map((raw) => {
    const id = cleanText(raw?.id).toUpperCase();
    const birthMin = Number(raw?.birthMin || 0) || 0;
    if (!allowedStandardIds.has(id) || (birthMin && (birthMin < 1900 || birthMin > 2100))) {
      throw new HttpsError("invalid-argument", "Référentiel DTN invalide.");
    }
    const thresholds = {};
    POOL_COURSES.forEach((course) => {
      const threshold = Number(raw?.thresholds?.[course] || 0) || 0;
      if (threshold > 0 && threshold <= 10000000) thresholds[course] = threshold;
    });
    return { id, birthMin, thresholds };
  });
  if (!standards.length) throw new HttpsError("invalid-argument", "Aucun temps DTN fourni.");

  const competitionIds = DTN_EDF_COMPETITION_IDS_BY_SEASON[seasonYear] || [];
  if (!competitionIds.length) throw new HttpsError("failed-precondition", "Compétitions DTN non définies pour cette saison.");

  const stateSnapshot = await dtnQualificationCacheStateRef(seasonYear).get();
  const sourceVersion = Number(stateSnapshot.data()?.version || 0) || 0;
  const fingerprint = dtnQualificationCacheFingerprint({ seasonYear, sex, standards, competitionIds, sourceVersion });
  const cacheRef = dtnQualificationCacheRef(seasonYear, sex);
  const cacheSnapshot = await cacheRef.get();
  if (cacheSnapshot.exists && cleanText(cacheSnapshot.data()?.fingerprint) === fingerprint) {
    const cachedPayload = cacheSnapshot.data()?.payload;
    if (cachedPayload && typeof cachedPayload === "object") {
      console.info("Cache DTN utilise", { seasonYear, sex, sourceVersion });
      return {
        ...cachedPayload,
        cache: { hit: true, pending: false, stale: false, generatedAt: cleanText(cacheSnapshot.data()?.generatedAt) },
        portalReadStats: portalReadStats("getDtnQualificationOverview", startedAt, { baseDocuments: 2, cacheHit: true })
      };
    }
  }
  const stalePayload = cacheSnapshot.exists && cacheSnapshot.data()?.payload && typeof cacheSnapshot.data().payload === "object"
    ? cacheSnapshot.data().payload
    : emptyDtnQualificationPayload({ seasonYear, sex, standards, competitionIds });
  if (request.data?.rebuild !== true) {
    console.info("Vue DTN absente ou obsolete, recalcul manuel requis", { seasonYear, sex, sourceVersion, stale: cacheSnapshot.exists });
    return {
      ...stalePayload,
      cache: {
        hit: false,
        pending: false,
        stale: cacheSnapshot.exists,
        refreshRequired: true,
        generatedAt: cleanText(cacheSnapshot.data()?.generatedAt)
      },
      portalReadStats: portalReadStats("getDtnQualificationOverview", startedAt, { baseDocuments: 2, cacheHit: false })
    };
  }
  const jobId = await enqueueDtnQualificationJob({
    seasonYear,
    sex,
    standards,
    competitionIds,
    sourceVersion,
    fingerprint
  });
  console.info("Vue DTN mise en file", { seasonYear, sex, sourceVersion, jobId, stale: cacheSnapshot.exists });
  return {
    ...stalePayload,
    cache: {
      hit: false,
      pending: true,
      stale: cacheSnapshot.exists,
      generatedAt: cleanText(cacheSnapshot.data()?.generatedAt),
      jobId
    },
    portalReadStats: portalReadStats("getDtnQualificationOverview", startedAt, { baseDocuments: 2, cacheHit: false })
  };
});

/* extracted-function: functions/server-dtn-service.js#normalizeDtnListingRules */
function normalizeDtnListingRules() {
  return serverDtnService().normalizeDtnListingRules(...arguments);
}

exports.refreshDtnListingCache = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "dtn.view");
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Utilisez la DTN par saison pour recalculer les resultats.");
  const seasonYear = Number(request.data?.seasonYear || 0);
  if (!Number.isInteger(seasonYear) || !DTN_LISTING_SEASON_YEARS.has(seasonYear)) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }
  const stateRef = dtnQualificationCacheStateRef(seasonYear);
  const now = new Date().toISOString();
  const listingVersion = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateRef);
    const next = (Number(snapshot.data()?.listingVersion || 0) || 0) + 1;
    transaction.set(stateRef, {
      listingVersion: next,
      listingUpdatedAt: now,
      listingReason: "dtn.listing.manual-refresh"
    }, { merge: true });
    return next;
  });
  return { ok: true, seasonYear, listingVersion, refreshedAt: now };
});

exports.getDtnListingOverview = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  assertCapability(request, "dtn.view");
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Utilisez la DTN par saison pour consulter les resultats.");
  const seasonYear = Number(request.data?.seasonYear || 0);
  if (!Number.isInteger(seasonYear) || seasonYear < 2000 || seasonYear > 2100 || !DTN_LISTING_SEASON_YEARS.has(seasonYear)) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }
  const rules = normalizeDtnListingRules(request.data?.rules);
  const stateSnapshot = await dtnQualificationCacheStateRef(seasonYear).get();
  const sourceVersion = Number(stateSnapshot.data()?.version || 0) || 0;
  const listingVersion = Number(stateSnapshot.data()?.listingVersion || 0) || 0;
  const fingerprint = dtnListingCacheFingerprint({ seasonYear, rules, sourceVersion, listingVersion });
  const cacheRef = dtnListingCacheRef(seasonYear);
  const cacheSnapshot = await cacheRef.get();
  if (cacheSnapshot.exists && cleanText(cacheSnapshot.data()?.fingerprint) === fingerprint) {
    const cachedPayload = cacheSnapshot.data()?.payload;
    if (cachedPayload && typeof cachedPayload === "object") {
      return {
        ...cachedPayload,
        cache: { hit: true, pending: false, stale: false, generatedAt: cleanText(cacheSnapshot.data()?.generatedAt) },
        portalReadStats: portalReadStats("getDtnListingOverview", startedAt, { baseDocuments: 2, cacheHit: true })
      };
    }
  }
  const stalePayload = cacheSnapshot.exists && cacheSnapshot.data()?.payload && typeof cacheSnapshot.data().payload === "object"
    ? cacheSnapshot.data().payload
    : emptyDtnListingPayload({ seasonYear, rules });
  if (request.data?.rebuild !== true) {
    return {
      ...stalePayload,
      cache: {
        hit: false,
        pending: false,
        stale: cacheSnapshot.exists,
        refreshRequired: true,
        generatedAt: cleanText(cacheSnapshot.data()?.generatedAt)
      },
      portalReadStats: portalReadStats("getDtnListingOverview", startedAt, { baseDocuments: 2, cacheHit: false })
    };
  }
  const jobId = await enqueueDtnQualificationJob({
    view: "listing",
    seasonYear,
    rules,
    sourceVersion,
    listingVersion,
    fingerprint
  });
  return {
    ...stalePayload,
    cache: {
      hit: false,
      pending: true,
      stale: cacheSnapshot.exists,
      generatedAt: cleanText(cacheSnapshot.data()?.generatedAt),
      jobId
    },
    portalReadStats: portalReadStats("getDtnListingOverview", startedAt, { baseDocuments: 2, cacheHit: false })
  };
});

/* extracted-function: functions/server-dtn-service.js#normalizePerformanceSearchText */
function normalizePerformanceSearchText(input0) {
  return serverDtnService().normalizePerformanceSearchText(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#performanceSearchTokens */
function performanceSearchTokens(input0) {
  return serverDtnService().performanceSearchTokens(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#performanceSearchPrefixes */
function performanceSearchPrefixes(input0) {
  return serverDtnService().performanceSearchPrefixes(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#performanceSwimmerIndexKey */
function performanceSwimmerIndexKey() {
  return serverDtnService().performanceSwimmerIndexKey(...arguments);
}

/* extracted-function: functions/server-dtn-service.js#performanceSwimmerIndexDocId */
function performanceSwimmerIndexDocId() {
  return serverDtnService().performanceSwimmerIndexDocId(...arguments);
}

function serverLegacyService() {
  if (!serverLegacyService.instance) serverLegacyService.instance = require("./server-legacy-service").createLegacyService({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS() { return ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get MAX_COMPETITION_IMPORT_PERFORMANCES() { return MAX_COMPETITION_IMPORT_PERFORMANCES; },
    get PERFORMANCE_BASE_CHANGES_COLLECTION() { return PERFORMANCE_BASE_CHANGES_COLLECTION; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get PERFORMANCE_BASE_MIGRATION_BATCH_SIZE() { return PERFORMANCE_BASE_MIGRATION_BATCH_SIZE; },
    get PERFORMANCE_BASE_MIGRATION_COLLECTION() { return PERFORMANCE_BASE_MIGRATION_COLLECTION; },
    get PERFORMANCE_PUBLICATION_JOBS_COLLECTION() { return PERFORMANCE_PUBLICATION_JOBS_COLLECTION; },
    get PERFORMANCE_PUBLICATION_LEASE_MS() { return PERFORMANCE_PUBLICATION_LEASE_MS; },
    get PERFORMANCE_PUBLICATION_MAX_ATTEMPTS() { return PERFORMANCE_PUBLICATION_MAX_ATTEMPTS; },
    get PERFORMANCE_PUBLIC_DATA_URL() { return PERFORMANCE_PUBLIC_DATA_URL; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
    get PERFORMANCE_SWIMMER_PAGE_SIZE() { return PERFORMANCE_SWIMMER_PAGE_SIZE; },
    get PUBLIC_ADDITIONAL_PERFORMANCE_PATH() { return PUBLIC_ADDITIONAL_PERFORMANCE_PATH; },
    get PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN() { return PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN; },
    get PUBLIC_PERFORMANCE_BUCKET() { return PUBLIC_PERFORMANCE_BUCKET; },
    get assertCapability() { return assertCapability; },
    get canClaimPerformancePublicationJob() { return canClaimPerformancePublicationJob; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get competitionImportPublicSnapshotSummary() { return competitionImportPublicSnapshotSummary; },
    get db() { return db; },
    get deactivatedImportPerformanceRows() { return deactivatedImportPerformanceRows; },
    get invalidateEngagementEntryTimeCachesForPerformanceRows() { return invalidateEngagementEntryTimeCachesForPerformanceRows; },
    get normalizeLivePalmesImportPerformances() { return normalizeLivePalmesImportPerformances; },
    get normalizePerformanceSearchText() { return normalizePerformanceSearchText; },
    get performanceBaseDocId() { return performanceBaseDocId; },
    get performancePublicKey() { return performancePublicKey; },
    get performancePublicationFailureStatus() { return performancePublicationFailureStatus; },
    get performanceSearchPrefixes() { return performanceSearchPrefixes; },
    get performanceSwimmerIndexKey() { return performanceSwimmerIndexKey; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get publicPerformancePublicationJob() { return publicPerformancePublicationJob; },
    get publicPerformanceSwimmerFilePath() { return publicPerformanceSwimmerFilePath; },
    get readPublicPerformanceJson() { return readPublicPerformanceJson; },
    get rebuildPublicPerformanceFilesForAffectedRows() { return rebuildPublicPerformanceFilesForAffectedRows; },
    get sameCompetitionImport() { return sameCompetitionImport; },
    get stableHash() { return stableHash; },
    get storage() { return storage; },
    get touchDtnQualificationCacheState() { return touchDtnQualificationCacheState; },
    get uniquePublicPerformanceRows() { return uniquePublicPerformanceRows; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get writePerformanceBaseRows() { return writePerformanceBaseRows; }
  });
  return serverLegacyService.instance;
}

/* extracted-function: functions/server-legacy-service.js#swimmerDisplayNameFromRow */
function swimmerDisplayNameFromRow() {
  return serverLegacyService().swimmerDisplayNameFromRow(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#aggregateSwimmerIndexRows */
function aggregateSwimmerIndexRows() {
  return serverLegacyService().aggregateSwimmerIndexRows(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#writePerformanceSwimmerIndexRows */
async function writePerformanceSwimmerIndexRows() {
  return serverLegacyService().writePerformanceSwimmerIndexRows(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#performanceSwimmerPageId */
function performanceSwimmerPageId(input0, input1) {
  return serverLegacyService().performanceSwimmerPageId(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#sortSwimmerPerformanceRows */
function sortSwimmerPerformanceRows() {
  return serverLegacyService().sortSwimmerPerformanceRows(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#writePerformanceSwimmerPageRows */
async function writePerformanceSwimmerPageRows() {
  return serverLegacyService().writePerformanceSwimmerPageRows(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#hydratePerformanceBaseRows */
async function hydratePerformanceBaseRows() {
  return serverLegacyService().hydratePerformanceBaseRows(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#getPerformanceBaseRowsBySwimmer */
async function getPerformanceBaseRowsBySwimmer() {
  return serverLegacyService().getPerformanceBaseRowsBySwimmer(...arguments);
}

exports.rebuildPerformanceSwimmerIndexNextPage = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  const stateRef = db.collection(PERFORMANCE_SWIMMER_INDEX_STATE_COLLECTION).doc("default");
  const stateSnapshot = await stateRef.get();
  const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
  const reset = request.data?.reset === true;
  const pageSize = Math.min(Math.max(Number(request.data?.pageSize || 500) || 500, 100), 500);
  const startedAt = reset || !state.startedAt ? new Date().toISOString() : cleanText(state.startedAt);
  const cursor = reset ? "" : cleanText(state.cursor);
  let query = db.collection(PERFORMANCE_BASE_COLLECTION)
    .orderBy(FieldPath.documentId())
    .limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  const rows = snapshot.docs.map((doc) => ({ performanceBaseId: doc.id, ...(doc.data() || {}) }));
  const includePages = request.data?.includePages !== false;
  const indexResult = await writePerformanceSwimmerIndexRows(rows, {
    now: new Date().toISOString(),
    action: reset ? "performanceSwimmerIndex.rebuild.reset" : "performanceSwimmerIndex.rebuild",
    mode: "incremental"
  });
  const pageResult = includePages
    ? await writePerformanceSwimmerPageRows(rows, {
      now: new Date().toISOString(),
      action: reset ? "performanceSwimmerPages.rebuild.reset" : "performanceSwimmerPages.rebuild"
    })
    : { writtenPages: 0 };
  const nextCursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : cursor;
  const done = snapshot.size < pageSize;
  const indexedPerformanceCount = (reset ? 0 : Number(state.indexedPerformanceCount || 0) || 0) + rows.length;
  const indexedSwimmerPageCount = (reset ? 0 : Number(state.indexedSwimmerPageCount || 0) || 0) + indexResult.written;
  await stateRef.set({
    startedAt,
    updatedAt: new Date().toISOString(),
    cursor: nextCursor,
    done,
    indexedPerformanceCount,
    indexedSwimmerPageCount,
    lastPagePerformanceCount: rows.length,
    lastPageSwimmerCount: indexResult.written,
    lastWrittenPerformancePages: pageResult.writtenPages || 0
  }, { merge: true });
  return {
    ok: true,
    done,
    cursor: nextCursor,
    pagePerformanceCount: rows.length,
    pageSwimmerCount: indexResult.written,
    writtenPerformancePages: pageResult.writtenPages || 0,
    indexedPerformanceCount,
    indexedSwimmerPageCount
  };
});

exports.rebuildPerformanceTopIndexNextPage = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  const stateRef = db.collection(PERFORMANCE_TOP_INDEX_STATE_COLLECTION).doc("default");
  const stateSnapshot = await stateRef.get();
  const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
  const reset = request.data?.reset === true;
  const pageSize = Math.min(Math.max(Number(request.data?.pageSize || 500) || 500, 100), 500);
  const startedAt = reset || !state.startedAt ? new Date().toISOString() : cleanText(state.startedAt);
  const cursor = reset ? "" : cleanText(state.cursor);
  let query = db.collection(PERFORMANCE_BASE_COLLECTION)
    .orderBy(FieldPath.documentId())
    .limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  const rows = snapshot.docs.map((doc) => ({ performanceBaseId: doc.id, ...(doc.data() || {}) }));
  const indexResult = await writePerformanceTopIndexRows(rows, {
    now: new Date().toISOString()
  });
  const nextCursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : cursor;
  const done = snapshot.size < pageSize;
  const indexedPerformanceCount = (reset ? 0 : Number(state.indexedPerformanceCount || 0) || 0) + rows.length;
  const touchedBucketIds = Array.from(new Set([
    ...(!reset && Array.isArray(state.touchedBucketIds) ? state.touchedBucketIds.map(cleanText) : []),
    ...(indexResult.touchedBucketIds || [])
  ].filter(Boolean)));
  await stateRef.set({
    startedAt,
    cursor: nextCursor,
    done,
    indexedPerformanceCount,
    touchedBucketIds,
    touchedBucketCount: touchedBucketIds.length,
    lastPagePerformanceCount: rows.length,
    lastPageIndexedRows: indexResult.writtenRows || 0,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  return {
    ok: true,
    done,
    cursor: nextCursor,
    pagePerformanceCount: rows.length,
    pageIndexedRows: indexResult.writtenRows || 0,
    indexedPerformanceCount,
    touchedBucketCount: touchedBucketIds.length
  };
});

/* extracted-function: functions/server-legacy-service.js#normalizedImportPerformances */
async function normalizedImportPerformances(input0) {
  return serverLegacyService().normalizedImportPerformances(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#syncImportToPerformanceBase */
async function syncImportToPerformanceBase(input0) {
  return serverLegacyService().syncImportToPerformanceBase(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#buildAdditionalPerformanceSwimmers */
function buildAdditionalPerformanceSwimmers() {
  return serverLegacyService().buildAdditionalPerformanceSwimmers(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#emptyAdditionalPerformanceDataSnapshot */
function emptyAdditionalPerformanceDataSnapshot() {
  return serverLegacyService().emptyAdditionalPerformanceDataSnapshot(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#normalizeAdditionalPerformanceDataSnapshot */
function normalizeAdditionalPerformanceDataSnapshot() {
  return serverLegacyService().normalizeAdditionalPerformanceDataSnapshot(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#additionalPerformanceFile */
function additionalPerformanceFile() {
  return serverLegacyService().additionalPerformanceFile(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#readPublishedAdditionalPerformanceDataSnapshot */
async function readPublishedAdditionalPerformanceDataSnapshot() {
  return serverLegacyService().readPublishedAdditionalPerformanceDataSnapshot(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#additionalPerformanceRowKey */
function additionalPerformanceRowKey() {
  return serverLegacyService().additionalPerformanceRowKey(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#mergeAdditionalPerformanceRows */
function mergeAdditionalPerformanceRows() {
  return serverLegacyService().mergeAdditionalPerformanceRows(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#upsertAdditionalCorrection */
function upsertAdditionalCorrection() {
  return serverLegacyService().upsertAdditionalCorrection(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#saveAdditionalPerformanceDataSnapshot */
async function saveAdditionalPerformanceDataSnapshot() {
  return serverLegacyService().saveAdditionalPerformanceDataSnapshot(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#publishIncrementalPerformanceImport */
async function publishIncrementalPerformanceImport() {
  return serverLegacyService().publishIncrementalPerformanceImport(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#publishIncrementalPerformanceCorrection */
async function publishIncrementalPerformanceCorrection() {
  return serverLegacyService().publishIncrementalPerformanceCorrection(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#publicPerformanceFilesBucket */
function publicPerformanceFilesBucket() {
  return serverLegacyService().publicPerformanceFilesBucket(...arguments);
}

function legacyPerformancePublication() {
  if (!legacyPerformancePublication.instance) legacyPerformancePublication.instance = require("./legacy-performance-publication").createLegacyPerformancePublication({
    PUBLIC_PERFORMANCE_FILES_PATH,
    PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
    PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT,
    cleanText,
    hydratePublicSwimmerRowsFromPayload,
    normalizePerformanceSearchText,
    performancePublicKey,
    performanceSearchPrefixes,
    publicBetterPerformance,
    publicPerformanceBaseRow,
    publicPerformanceFilesBucket,
    publicPerformanceSwimmerStorageRow,
    publicSwimmerKey,
    publicSwimmerPayloadSupportsTopRebuild,
    stableHash,
    uniquePublicPerformanceRows
  });
  return legacyPerformancePublication.instance;
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceFilePath */
function publicPerformanceFilePath() {
  return legacyPerformancePublication().publicPerformanceFilePath(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceFile */
function publicPerformanceFile() {
  return legacyPerformancePublication().publicPerformanceFile(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#readPublicPerformanceJson */
async function readPublicPerformanceJson(input0, input1) {
  return legacyPerformancePublication().readPublicPerformanceJson(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#savePublicPerformanceJson */
async function savePublicPerformanceJson(input0, input1) {
  return legacyPerformancePublication().savePublicPerformanceJson(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#savePublicPerformanceText */
async function savePublicPerformanceText(input0, input1) {
  return legacyPerformancePublication().savePublicPerformanceText(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceCompactObject */
function publicPerformanceCompactObject() {
  return legacyPerformancePublication().publicPerformanceCompactObject(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceSearchShard */
function publicPerformanceSearchShard(input0) {
  return legacyPerformancePublication().publicPerformanceSearchShard(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceIdShard */
function publicPerformanceIdShard(input0) {
  return legacyPerformancePublication().publicPerformanceIdShard(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceTopFileName */
function publicPerformanceTopFileName(input0, input1) {
  return legacyPerformancePublication().publicPerformanceTopFileName(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceSwimmerFilePath */
function publicPerformanceSwimmerFilePath(input0) {
  return legacyPerformancePublication().publicPerformanceSwimmerFilePath(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceRowKey */
function publicPerformanceRowKey() {
  return legacyPerformancePublication().publicPerformanceRowKey(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceTopCandidateKey */
function publicPerformanceTopCandidateKey() {
  return legacyPerformancePublication().publicPerformanceTopCandidateKey(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceSwimmerRow */
function publicPerformanceSwimmerRow() {
  return legacyPerformancePublication().publicPerformanceSwimmerRow(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceTopRow */
function publicPerformanceTopRow() {
  return legacyPerformancePublication().publicPerformanceTopRow(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#sortPublicPerformanceRows */
function sortPublicPerformanceRows() {
  return legacyPerformancePublication().sortPublicPerformanceRows(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#sortPublicTopRows */
function sortPublicTopRows() {
  return legacyPerformancePublication().sortPublicTopRows(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#mergePublicSwimmerRows */
function mergePublicSwimmerRows() {
  return legacyPerformancePublication().mergePublicSwimmerRows(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#mergePublicTopRows */
function mergePublicTopRows() {
  return legacyPerformancePublication().mergePublicTopRows(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#buildPublicSwimmerPayload */
function buildPublicSwimmerPayload(input0) {
  return legacyPerformancePublication().buildPublicSwimmerPayload(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#buildPublicSearchRow */
function buildPublicSearchRow() {
  return legacyPerformancePublication().buildPublicSearchRow(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publishPublicSwimmerFile */
async function publishPublicSwimmerFile(input0) {
  return legacyPerformancePublication().publishPublicSwimmerFile(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publishPublicSearchIndexes */
async function publishPublicSearchIndexes(input0, input1) {
  return legacyPerformancePublication().publishPublicSearchIndexes(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#distinctPublicTopPreview */
function distinctPublicTopPreview(input0, input1, input2) {
  return legacyPerformancePublication().distinctPublicTopPreview(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publishPublicTopFiles */
async function publishPublicTopFiles(input0) {
  return legacyPerformancePublication().publishPublicTopFiles(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#mergePublicPerformanceManifest */
function mergePublicPerformanceManifest() {
  return legacyPerformancePublication().mergePublicPerformanceManifest(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publishIncrementalPublicPerformanceFiles */
async function publishIncrementalPublicPerformanceFiles() {
  return legacyPerformancePublication().publishIncrementalPublicPerformanceFiles(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#deletePublicPerformanceFile */
async function deletePublicPerformanceFile() {
  return legacyPerformancePublication().deletePublicPerformanceFile(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#removePublicSearchIndexes */
async function removePublicSearchIndexes() {
  return legacyPerformancePublication().removePublicSearchIndexes(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#assertPublicSwimmerIdentityReplaced */
async function assertPublicSwimmerIdentityReplaced() {
  return legacyPerformancePublication().assertPublicSwimmerIdentityReplaced(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#replacePublicSwimmerIdentity */
async function replacePublicSwimmerIdentity() {
  return legacyPerformancePublication().replacePublicSwimmerIdentity(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceTopKey */
function publicPerformanceTopKey() {
  return legacyPerformancePublication().publicPerformanceTopKey(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceMatchesTopKey */
function publicPerformanceMatchesTopKey() {
  return legacyPerformancePublication().publicPerformanceMatchesTopKey(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#publicPerformanceActiveRow */
function publicPerformanceActiveRow() {
  return legacyPerformancePublication().publicPerformanceActiveRow(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#getActivePublicRowsForAffectedSwimmer */
async function getActivePublicRowsForAffectedSwimmer() {
  return legacyPerformancePublication().getActivePublicRowsForAffectedSwimmer(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#rebuildPublicSwimmerFilesForAffectedRows */
async function rebuildPublicSwimmerFilesForAffectedRows() {
  return legacyPerformancePublication().rebuildPublicSwimmerFilesForAffectedRows(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#rebuildPublicTopFilesForAffectedRows */
async function rebuildPublicTopFilesForAffectedRows() {
  return legacyPerformancePublication().rebuildPublicTopFilesForAffectedRows(...arguments);
}

/* extracted-function: functions/legacy-performance-publication.js#rebuildPublicPerformanceFilesForAffectedRows */
async function rebuildPublicPerformanceFilesForAffectedRows() {
  return legacyPerformancePublication().rebuildPublicPerformanceFilesForAffectedRows(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#performanceBaseMigrationManifest */
async function performanceBaseMigrationManifest() {
  return serverLegacyService().performanceBaseMigrationManifest(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#migrationChunkStatuses */
async function migrationChunkStatuses() {
  return serverLegacyService().migrationChunkStatuses(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#historicalRowsFromChunkPayload */
function historicalRowsFromChunkPayload() {
  return serverLegacyService().historicalRowsFromChunkPayload(...arguments);
}

exports.importHistoricalPerformanceRows = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  const data = request.data || {};
  const source = cleanText(data.source || "intranap").slice(0, 80);
  const rawRows = Array.isArray(data.rows)
    ? data.rows
    : historicalRowsFromChunkPayload(data.payload && typeof data.payload === "object" ? data.payload : {});
  const rows = rawRows
    .slice(0, 2000)
    .map((row) => ({
      ...row,
      source: cleanText(row.source || source || "intranap")
    }))
    .filter((row) => POOL_COURSES.includes(normalizeCourseCode(row.course)) && Number(row.timeValue || 0) > 0);
  if (!rows.length) {
    throw new HttpsError("invalid-argument", "Aucune performance historique valide dans le lot.");
  }
  const now = new Date().toISOString();
  const result = await writePerformanceBaseRows(rows, {
    actorUid: request.auth.uid,
    actorEmail: request.auth.token?.email || "",
    now,
    action: "historicalImport.batch",
    changeSeed: cleanText(data.batchId || now),
    status: "active",
    logChanges: false
  });
  await db.collection(PERFORMANCE_BASE_MIGRATION_COLLECTION).doc(cleanText(data.batchId || stableHash(now).slice(0, 24))).set({
    source,
    status: "completed",
    importedCount: result.written,
    updatedAt: now,
    importedBy: request.auth.uid,
    importedByEmail: request.auth.token?.email || ""
  }, { merge: true });
  return {
    ok: true,
    written: result.written
  };
});

/* extracted-function: functions/server-legacy-service.js#migrateHistoricalPerformanceBaseChunk */
async function migrateHistoricalPerformanceBaseChunk(input0, input1) {
  return serverLegacyService().migrateHistoricalPerformanceBaseChunk(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#buildAdditionalPerformanceDataSnapshot */
async function buildAdditionalPerformanceDataSnapshot() {
  return serverLegacyService().buildAdditionalPerformanceDataSnapshot(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#publishAdditionalPerformanceDataSnapshot */
async function publishAdditionalPerformanceDataSnapshot() {
  return serverLegacyService().publishAdditionalPerformanceDataSnapshot(...arguments);
}

exports.exportAdditionalPerformanceData = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  return buildAdditionalPerformanceDataSnapshot();
});

exports.publishPerformancePublicData = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  try {
    const publicSnapshot = await publishAdditionalPerformanceDataSnapshot();
    await writeAuditLog("performancePublicData.published", request.auth.uid, {
      path: publicSnapshot.path,
      importCount: publicSnapshot.importCount,
      performanceCount: publicSnapshot.performanceCount
    });
    return publicSnapshot;
  } catch (error) {
    console.error("Publication publique des performances impossible", {
      message: error?.message || String(error),
      code: error?.code || "",
      stack: error?.stack || ""
    });
    throw new HttpsError("failed-precondition", error?.message || "Publication publique impossible.");
  }
});

exports.getPerformanceBaseMigrationStatus = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  const manifest = await performanceBaseMigrationManifest();
  const chunks = await migrationChunkStatuses(manifest.chunks);
  const completed = chunks.filter((chunk) => chunk.status === "completed").length;
  return {
    ok: true,
    generatedAt: manifest.generatedAt || "",
    totalChunks: chunks.length,
    completedChunks: completed,
    pendingChunks: chunks.length - completed,
    totalPerformances: chunks.reduce((sum, chunk) => sum + Number(chunk.performanceCount || 0), 0),
    migratedPerformances: chunks.reduce((sum, chunk) => sum + Number(chunk.migratedCount || 0), 0),
    chunks
  };
});

exports.migratePerformanceBaseNextChunk = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  const manifest = await performanceBaseMigrationManifest();
  const chunks = await migrationChunkStatuses(manifest.chunks);
  const next = chunks.find((chunk) => chunk.status !== "completed");
  if (!next) {
    return {
      ok: true,
      done: true,
      message: "Tous les lots historiques sont deja migres."
    };
  }
  const result = await migrateHistoricalPerformanceBaseChunk(next.name, request);
  const updatedChunks = await migrationChunkStatuses(manifest.chunks);
  return {
    ...result,
    done: false,
    completedChunks: updatedChunks.filter((chunk) => chunk.status === "completed").length,
    totalChunks: updatedChunks.length,
    migratedPerformances: updatedChunks.reduce((sum, chunk) => sum + Number(chunk.migratedCount || 0), 0),
    totalPerformances: updatedChunks.reduce((sum, chunk) => sum + Number(chunk.performanceCount || 0), 0)
  };
});

/* extracted-function: functions/server-legacy-service.js#enqueuePerformancePublicationJob */
async function enqueuePerformancePublicationJob() {
  return serverLegacyService().enqueuePerformancePublicationJob(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#claimPerformancePublicationJob */
async function claimPerformancePublicationJob(input0) {
  return serverLegacyService().claimPerformancePublicationJob(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#replacementImportRows */
async function replacementImportRows() {
  return serverLegacyService().replacementImportRows(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#deactivateReplacedPerformanceBaseRows */
async function deactivateReplacedPerformanceBaseRows() {
  return serverLegacyService().deactivateReplacedPerformanceBaseRows(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#processPerformanceImportReplacementJob */
async function processPerformanceImportReplacementJob(input0) {
  return serverLegacyService().processPerformanceImportReplacementJob(...arguments);
}

/* extracted-function: functions/server-legacy-service.js#processPerformancePublicationJob */
async function processPerformancePublicationJob(input0) {
  return serverLegacyService().processPerformancePublicationJob(...arguments);
}

exports.publishPerformanceCorrectionJob = onDocumentCreated(PERFORMANCE_PUBLICATION_JOB_OPTIONS, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  if (!event.data?.exists) return;
  const result = await processPerformancePublicationJob(event.data.ref);
  if (result.retryable) throw result.error;
});

exports.resumePerformancePublicationJobs = onSchedule(PERFORMANCE_PUBLICATION_SCHEDULER_OPTIONS, async () => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  const [pendingSnapshot, processingSnapshot] = await Promise.all([
    db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).where("status", "==", "pending").limit(3).get(),
    db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).where("status", "==", "processing").limit(3).get()
  ]);
  const jobs = [...pendingSnapshot.docs, ...processingSnapshot.docs]
    .filter((snapshot, index, all) => all.findIndex((item) => item.id === snapshot.id) === index)
    .filter((snapshot) => canClaimPerformancePublicationJob(snapshot.data() || {}));
  for (const snapshot of jobs) await processPerformancePublicationJob(snapshot.ref);
  return null;
});

exports.getPerformancePublicationJobStatus = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  const jobId = cleanText(request.data?.jobId).slice(0, 80);
  if (!jobId) throw new HttpsError("invalid-argument", "Travail de publication manquant.");
  const snapshot = await db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(jobId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Travail de publication introuvable.");
  return { ok: true, publicationJob: publicPerformancePublicationJob(snapshot.data() || {}, snapshot.id) };
});

exports.retryPerformancePublicationJob = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  const jobId = cleanText(request.data?.jobId).slice(0, 80);
  if (!jobId) throw new HttpsError("invalid-argument", "Travail de publication manquant.");
  const snapshot = await db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(jobId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Travail de publication introuvable.");
  const job = snapshot.data() || {};
  if (job.status !== "failed") throw new HttpsError("failed-precondition", "Ce travail ne nécessite pas de reprise manuelle.");
  if (job.type === "performanceImportReplacement") {
    const now = new Date().toISOString();
    const newJobId = stableHash(`${snapshot.id}|retry|${now}`).slice(0, 40);
    const newJobRef = db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(newJobId);
    await newJobRef.create(cleanFirestoreValue({
      id: newJobId,
      type: "performanceImportReplacement",
      oldImportId: job.oldImportId,
      newImportId: job.newImportId,
      status: "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      requestedBy: request.auth.uid,
      requestedByEmail: request.auth.token?.email || "",
      retryOf: snapshot.id
    }));
    await Promise.all([
      snapshot.ref.set({ replacedBy: newJobId, updatedAt: now }, { merge: true }),
      db.collection("performanceImports").doc(cleanText(job.oldImportId)).set({ replacementJobId: newJobId, updatedAt: now }, { merge: true }),
      db.collection("performanceImports").doc(cleanText(job.newImportId)).set({ replacementJobId: newJobId, publicationStatus: "pending", updatedAt: now }, { merge: true })
    ]);
    return {
      ok: true,
      publicationJob: publicPerformancePublicationJob({ status: "pending", attempts: 0, createdAt: now, updatedAt: now }, newJobId)
    };
  }
  const publicationJob = await enqueuePerformancePublicationJob(job.correction || {}, {
    uid: request.auth.uid,
    email: request.auth.token?.email || ""
  });
  await snapshot.ref.set({ replacedBy: publicationJob.id, updatedAt: new Date().toISOString() }, { merge: true });
  return { ok: true, publicationJob };
});

// RF/MPF: existing records capability, native versioned snapshot, no mail or TOP rebuild.
/* extracted-function: functions/server-legacy-service.js#authorizeNapRecords */
function authorizeNapRecords(input0) {
  return serverLegacyService().authorizeNapRecords(...arguments);
}
/* extracted-function: functions/server-legacy-service.js#readNapRecordsAdministration */
async function readNapRecordsAdministration(input0) {
  return serverLegacyService().readNapRecordsAdministration(...arguments);
}
/* extracted-function: functions/server-legacy-service.js#publishNativeRecords */
async function publishNativeRecords(input0) {
  return serverLegacyService().publishNativeRecords(...arguments);
}

const NAP_PERFORMANCE_OPTIONS={...CALLABLE_OPTIONS,...(ENVIRONMENT.sportingDataSource === "nap"?{secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD")],maxInstances:2,concurrency:4}: {})};
/* extracted-function: functions/server-legacy-service.js#authorizeNativePerformance */
function authorizeNativePerformance(input0) {
  return serverLegacyService().authorizeNativePerformance(...arguments);
}
/* extracted-function: functions/server-legacy-service.js#nativePerformanceFailure */
function nativePerformanceFailure(input0) {
  return serverLegacyService().nativePerformanceFailure(...arguments);
}
exports.getNapPerformanceAdministration=onCall(NAP_PERFORMANCE_OPTIONS,/* extracted-handler: functions/portal-performance-handlers.js#getNapPerformanceAdministration#arrow */ async (request) => {
  return portalPerformanceHandlers().getNapPerformanceAdministration(request);
});
exports.savePerformanceCorrection = onCall(NAP_PERFORMANCE_OPTIONS, /* extracted-handler: functions/portal-performance-handlers.js#savePerformanceCorrection#arrow */ async (request) => {
  return portalPerformanceHandlers().savePerformanceCorrection(request);
});
