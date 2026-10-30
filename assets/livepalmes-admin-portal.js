(function attachLivePalmesAdminPortal(global) {
  /* portal-wiring-start */
  const portalActions = {};
  const portalState = {
    get accessClubReference() { return accessClubReference; }, set accessClubReference(value) { accessClubReference = value; },
    get accessClubReferenceById() { return accessClubReferenceById; }, set accessClubReferenceById(value) { accessClubReferenceById = value; },
    get accessClubReferenceLoadPromise() { return accessClubReferenceLoadPromise; }, set accessClubReferenceLoadPromise(value) { accessClubReferenceLoadPromise = value; },
    get accessCurrentCursor() { return accessCurrentCursor; }, set accessCurrentCursor(value) { accessCurrentCursor = value; },
    get accessDeletionRequests() { return accessDeletionRequests; }, set accessDeletionRequests(value) { accessDeletionRequests = value; },
    get accessDeletionRequestsLoaded() { return accessDeletionRequestsLoaded; }, set accessDeletionRequestsLoaded(value) { accessDeletionRequestsLoaded = value; },
    get accessDeletionRequestsLoading() { return accessDeletionRequestsLoading; }, set accessDeletionRequestsLoading(value) { accessDeletionRequestsLoading = value; },
    get accessDirectoryFirestoreModulePromise() { return accessDirectoryFirestoreModulePromise; }, set accessDirectoryFirestoreModulePromise(value) { accessDirectoryFirestoreModulePromise = value; },
    get accessDirectoryLetter() { return accessDirectoryLetter; }, set accessDirectoryLetter(value) { accessDirectoryLetter = value; },
    get accessDirectorySnapshotFilteredCount() { return accessDirectorySnapshotFilteredCount; }, set accessDirectorySnapshotFilteredCount(value) { accessDirectorySnapshotFilteredCount = value; },
    get accessDirectorySnapshotMode() { return accessDirectorySnapshotMode; }, set accessDirectorySnapshotMode(value) { accessDirectorySnapshotMode = value; },
    get accessDirectorySnapshotUsers() { return accessDirectorySnapshotUsers; }, set accessDirectorySnapshotUsers(value) { accessDirectorySnapshotUsers = value; },
    get accessDirectoryTruncated() { return accessDirectoryTruncated; }, set accessDirectoryTruncated(value) { accessDirectoryTruncated = value; },
    get accessLoadSequence() { return accessLoadSequence; }, set accessLoadSequence(value) { accessLoadSequence = value; },
    get accessNextCursor() { return accessNextCursor; }, set accessNextCursor(value) { accessNextCursor = value; },
    get accessPage() { return accessPage; }, set accessPage(value) { accessPage = value; },
    get accessPreviousCursors() { return accessPreviousCursors; }, set accessPreviousCursors(value) { accessPreviousCursors = value; },
    get accessUsers() { return accessUsers; }, set accessUsers(value) { accessUsers = value; },
    get accessUsersLoaded() { return accessUsersLoaded; }, set accessUsersLoaded(value) { accessUsersLoaded = value; },
    get accessUsersLoading() { return accessUsersLoading; }, set accessUsersLoading(value) { accessUsersLoading = value; },
    get activeAuthUid() { return activeAuthUid; }, set activeAuthUid(value) { activeAuthUid = value; },
    get activeEngagementClubId() { return activeEngagementClubId; }, set activeEngagementClubId(value) { activeEngagementClubId = value; },
    get activeEngagementNationalTab() { return activeEngagementNationalTab; }, set activeEngagementNationalTab(value) { activeEngagementNationalTab = value; },
    get activeEngagementProgramSessionId() { return activeEngagementProgramSessionId; }, set activeEngagementProgramSessionId(value) { activeEngagementProgramSessionId = value; },
    get activeEngagementsDetailTab() { return activeEngagementsDetailTab; }, set activeEngagementsDetailTab(value) { activeEngagementsDetailTab = value; },
    get activeEngagementsNavEntry() { return activeEngagementsNavEntry; }, set activeEngagementsNavEntry(value) { activeEngagementsNavEntry = value; },
    get activeEngagementsTab() { return activeEngagementsTab; }, set activeEngagementsTab(value) { activeEngagementsTab = value; },
    get adminAuth() { return adminAuth; }, set adminAuth(value) { adminAuth = value; },
    get currentAccessProfile() { return currentAccessProfile; }, set currentAccessProfile(value) { currentAccessProfile = value; },
    get currentUserLoading() { return currentUserLoading; }, set currentUserLoading(value) { currentUserLoading = value; },
    get dirtyEngagementDetailTabs() { return dirtyEngagementDetailTabs; }, set dirtyEngagementDetailTabs(value) { dirtyEngagementDetailTabs = value; },
    get dtnModuleLoadPromise() { return dtnModuleLoadPromise; }, set dtnModuleLoadPromise(value) { dtnModuleLoadPromise = value; },
    get editingUid() { return editingUid; }, set editingUid(value) { editingUid = value; },
    get engagementAccessRequests() { return engagementAccessRequests; }, set engagementAccessRequests(value) { engagementAccessRequests = value; },
    get engagementAccessRequestsLoaded() { return engagementAccessRequestsLoaded; }, set engagementAccessRequestsLoaded(value) { engagementAccessRequestsLoaded = value; },
    get engagementAccessRequestsLoading() { return engagementAccessRequestsLoading; }, set engagementAccessRequestsLoading(value) { engagementAccessRequestsLoading = value; },
    get engagementCalendarCacheRevision() { return engagementCalendarCacheRevision; }, set engagementCalendarCacheRevision(value) { engagementCalendarCacheRevision = value; },
    get engagementCalendarFiltersInitialized() { return engagementCalendarFiltersInitialized; }, set engagementCalendarFiltersInitialized(value) { engagementCalendarFiltersInitialized = value; },
    get engagementClubAvailableSwimmersSexFilter() { return engagementClubAvailableSwimmersSexFilter; }, set engagementClubAvailableSwimmersSexFilter(value) { engagementClubAvailableSwimmersSexFilter = value; },
    get engagementClubEntriesAutosaveCompetitionId() { return engagementClubEntriesAutosaveCompetitionId; }, set engagementClubEntriesAutosaveCompetitionId(value) { engagementClubEntriesAutosaveCompetitionId = value; },
    get engagementClubEntriesAutosaveTimer() { return engagementClubEntriesAutosaveTimer; }, set engagementClubEntriesAutosaveTimer(value) { engagementClubEntriesAutosaveTimer = value; },
    get engagementClubEntriesDirty() { return engagementClubEntriesDirty; }, set engagementClubEntriesDirty(value) { engagementClubEntriesDirty = value; },
    get engagementClubEntriesRenderedCompetitionId() { return engagementClubEntriesRenderedCompetitionId; }, set engagementClubEntriesRenderedCompetitionId(value) { engagementClubEntriesRenderedCompetitionId = value; },
    get engagementClubEntryMutationQueue() { return engagementClubEntryMutationQueue; }, set engagementClubEntryMutationQueue(value) { engagementClubEntryMutationQueue = value; },
    get engagementClubEntryMutationRevision() { return engagementClubEntryMutationRevision; }, set engagementClubEntryMutationRevision(value) { engagementClubEntryMutationRevision = value; },
    get engagementClubInactiveSwimmersDirectoryExpanded() { return engagementClubInactiveSwimmersDirectoryExpanded; }, set engagementClubInactiveSwimmersDirectoryExpanded(value) { engagementClubInactiveSwimmersDirectoryExpanded = value; },
    get engagementClubInactiveSwimmersExpanded() { return engagementClubInactiveSwimmersExpanded; }, set engagementClubInactiveSwimmersExpanded(value) { engagementClubInactiveSwimmersExpanded = value; },
    get engagementClubLastPersistedEntry() { return engagementClubLastPersistedEntry; }, set engagementClubLastPersistedEntry(value) { engagementClubLastPersistedEntry = value; },
    get engagementClubNativeIndividualRetry() { return engagementClubNativeIndividualRetry; }, set engagementClubNativeIndividualRetry(value) { engagementClubNativeIndividualRetry = value; },
    get engagementClubNativeOfficialRetry() { return engagementClubNativeOfficialRetry; }, set engagementClubNativeOfficialRetry(value) { engagementClubNativeOfficialRetry = value; },
    get engagementClubNativeRelayRetry() { return engagementClubNativeRelayRetry; }, set engagementClubNativeRelayRetry(value) { engagementClubNativeRelayRetry = value; },
    get engagementClubNativeSelectionRetry() { return engagementClubNativeSelectionRetry; }, set engagementClubNativeSelectionRetry(value) { engagementClubNativeSelectionRetry = value; },
    get engagementClubPeople() { return engagementClubPeople; }, set engagementClubPeople(value) { engagementClubPeople = value; },
    get engagementClubPeopleCursor() { return engagementClubPeopleCursor; }, set engagementClubPeopleCursor(value) { engagementClubPeopleCursor = value; },
    get engagementClubPeopleHasMore() { return engagementClubPeopleHasMore; }, set engagementClubPeopleHasMore(value) { engagementClubPeopleHasMore = value; },
    get engagementClubPeopleLoaded() { return engagementClubPeopleLoaded; }, set engagementClubPeopleLoaded(value) { engagementClubPeopleLoaded = value; },
    get engagementClubPeopleLoading() { return engagementClubPeopleLoading; }, set engagementClubPeopleLoading(value) { engagementClubPeopleLoading = value; },
    get engagementClubPeopleRequestVersion() { return engagementClubPeopleRequestVersion; }, set engagementClubPeopleRequestVersion(value) { engagementClubPeopleRequestVersion = value; },
    get engagementClubPersistedSwimmerIds() { return engagementClubPersistedSwimmerIds; }, set engagementClubPersistedSwimmerIds(value) { engagementClubPersistedSwimmerIds = value; },
    get engagementClubPersonFormHome() { return engagementClubPersonFormHome; }, set engagementClubPersonFormHome(value) { engagementClubPersonFormHome = value; },
    get engagementClubPersonSaving() { return engagementClubPersonSaving; }, set engagementClubPersonSaving(value) { engagementClubPersonSaving = value; },
    get engagementClubRecapEntries() { return engagementClubRecapEntries; }, set engagementClubRecapEntries(value) { engagementClubRecapEntries = value; },
    get engagementClubRecapEntriesCompetitionId() { return engagementClubRecapEntriesCompetitionId; }, set engagementClubRecapEntriesCompetitionId(value) { engagementClubRecapEntriesCompetitionId = value; },
    get engagementClubRecapEntriesLoading() { return engagementClubRecapEntriesLoading; }, set engagementClubRecapEntriesLoading(value) { engagementClubRecapEntriesLoading = value; },
    get engagementClubRelayDialogDraft() { return engagementClubRelayDialogDraft; }, set engagementClubRelayDialogDraft(value) { engagementClubRelayDialogDraft = value; },
    get engagementClubRelayDialogOpener() { return engagementClubRelayDialogOpener; }, set engagementClubRelayDialogOpener(value) { engagementClubRelayDialogOpener = value; },
    get engagementClubRelayDialogRelayId() { return engagementClubRelayDialogRelayId; }, set engagementClubRelayDialogRelayId(value) { engagementClubRelayDialogRelayId = value; },
    get engagementClubRelayDialogSaving() { return engagementClubRelayDialogSaving; }, set engagementClubRelayDialogSaving(value) { engagementClubRelayDialogSaving = value; },
    get engagementClubRelaysDraft() { return engagementClubRelaysDraft; }, set engagementClubRelaysDraft(value) { engagementClubRelaysDraft = value; },
    get engagementClubRelaysRenderedCompetitionId() { return engagementClubRelaysRenderedCompetitionId; }, set engagementClubRelaysRenderedCompetitionId(value) { engagementClubRelaysRenderedCompetitionId = value; },
    get engagementClubSelectionCompetitionId() { return engagementClubSelectionCompetitionId; }, set engagementClubSelectionCompetitionId(value) { engagementClubSelectionCompetitionId = value; },
    get engagementClubSelectionTimer() { return engagementClubSelectionTimer; }, set engagementClubSelectionTimer(value) { engagementClubSelectionTimer = value; },
    get engagementClubSwimmerCreationRetry() { return engagementClubSwimmerCreationRetry; }, set engagementClubSwimmerCreationRetry(value) { engagementClubSwimmerCreationRetry = value; },
    get engagementClubSwimmerEventTimesBatchTimer() { return engagementClubSwimmerEventTimesBatchTimer; }, set engagementClubSwimmerEventTimesBatchTimer(value) { engagementClubSwimmerEventTimesBatchTimer = value; },
    get engagementClubSwimmerRecovery() { return engagementClubSwimmerRecovery; }, set engagementClubSwimmerRecovery(value) { engagementClubSwimmerRecovery = value; },
    get engagementClubSwimmerRemoving() { return engagementClubSwimmerRemoving; }, set engagementClubSwimmerRemoving(value) { engagementClubSwimmerRemoving = value; },
    get engagementClubSwimmers() { return engagementClubSwimmers; }, set engagementClubSwimmers(value) { engagementClubSwimmers = value; },
    get engagementClubSwimmersCachedAt() { return engagementClubSwimmersCachedAt; }, set engagementClubSwimmersCachedAt(value) { engagementClubSwimmersCachedAt = value; },
    get engagementClubSwimmersClubId() { return engagementClubSwimmersClubId; }, set engagementClubSwimmersClubId(value) { engagementClubSwimmersClubId = value; },
    get engagementClubSwimmersDirectorySexFilter() { return engagementClubSwimmersDirectorySexFilter; }, set engagementClubSwimmersDirectorySexFilter(value) { engagementClubSwimmersDirectorySexFilter = value; },
    get engagementClubSwimmersLoadPromise() { return engagementClubSwimmersLoadPromise; }, set engagementClubSwimmersLoadPromise(value) { engagementClubSwimmersLoadPromise = value; },
    get engagementClubSwimmersLoaded() { return engagementClubSwimmersLoaded; }, set engagementClubSwimmersLoaded(value) { engagementClubSwimmersLoaded = value; },
    get engagementClubSwimmersLoading() { return engagementClubSwimmersLoading; }, set engagementClubSwimmersLoading(value) { engagementClubSwimmersLoading = value; },
    get engagementClubSwimmersRenderedCompetitionId() { return engagementClubSwimmersRenderedCompetitionId; }, set engagementClubSwimmersRenderedCompetitionId(value) { engagementClubSwimmersRenderedCompetitionId = value; },
    get engagementClubTeamEditing() { return engagementClubTeamEditing; }, set engagementClubTeamEditing(value) { engagementClubTeamEditing = value; },
    get engagementClubTeamRenunciationContext() { return engagementClubTeamRenunciationContext; }, set engagementClubTeamRenunciationContext(value) { engagementClubTeamRenunciationContext = value; },
    get engagementClubTeamRenunciationSaving() { return engagementClubTeamRenunciationSaving; }, set engagementClubTeamRenunciationSaving(value) { engagementClubTeamRenunciationSaving = value; },
    get engagementClubTeamSaving() { return engagementClubTeamSaving; }, set engagementClubTeamSaving(value) { engagementClubTeamSaving = value; },
    get engagementClubTimesDialogLoading() { return engagementClubTimesDialogLoading; }, set engagementClubTimesDialogLoading(value) { engagementClubTimesDialogLoading = value; },
    get engagementClubTimesDialogOpener() { return engagementClubTimesDialogOpener; }, set engagementClubTimesDialogOpener(value) { engagementClubTimesDialogOpener = value; },
    get engagementClubTimesDialogSwimmerId() { return engagementClubTimesDialogSwimmerId; }, set engagementClubTimesDialogSwimmerId(value) { engagementClubTimesDialogSwimmerId = value; },
    get engagementCompetitionDocumentEditingId() { return engagementCompetitionDocumentEditingId; }, set engagementCompetitionDocumentEditingId(value) { engagementCompetitionDocumentEditingId = value; },
    get engagementCompetitionDocumentFiles() { return engagementCompetitionDocumentFiles; }, set engagementCompetitionDocumentFiles(value) { engagementCompetitionDocumentFiles = value; },
    get engagementCompetitionDocumentSaving() { return engagementCompetitionDocumentSaving; }, set engagementCompetitionDocumentSaving(value) { engagementCompetitionDocumentSaving = value; },
    get engagementCompetitionStatistics() { return engagementCompetitionStatistics; }, set engagementCompetitionStatistics(value) { engagementCompetitionStatistics = value; },
    get engagementCompetitionStatisticsCompetitionId() { return engagementCompetitionStatisticsCompetitionId; }, set engagementCompetitionStatisticsCompetitionId(value) { engagementCompetitionStatisticsCompetitionId = value; },
    get engagementCompetitionStatisticsLoading() { return engagementCompetitionStatisticsLoading; }, set engagementCompetitionStatisticsLoading(value) { engagementCompetitionStatisticsLoading = value; },
    get engagementCompetitions() { return engagementCompetitions; }, set engagementCompetitions(value) { engagementCompetitions = value; },
    get engagementCompetitionsCachedAt() { return engagementCompetitionsCachedAt; }, set engagementCompetitionsCachedAt(value) { engagementCompetitionsCachedAt = value; },
    get engagementCompetitionsLoaded() { return engagementCompetitionsLoaded; }, set engagementCompetitionsLoaded(value) { engagementCompetitionsLoaded = value; },
    get engagementCompetitionsLoadedCacheKey() { return engagementCompetitionsLoadedCacheKey; }, set engagementCompetitionsLoadedCacheKey(value) { engagementCompetitionsLoadedCacheKey = value; },
    get engagementCompetitionsLoadedRange() { return engagementCompetitionsLoadedRange; }, set engagementCompetitionsLoadedRange(value) { engagementCompetitionsLoadedRange = value; },
    get engagementCompetitionsVisibleLimit() { return engagementCompetitionsVisibleLimit; }, set engagementCompetitionsVisibleLimit(value) { engagementCompetitionsVisibleLimit = value; },
    get engagementDeadlineCountdownTimer() { return engagementDeadlineCountdownTimer; }, set engagementDeadlineCountdownTimer(value) { engagementDeadlineCountdownTimer = value; },
    get engagementDeletionRequests() { return engagementDeletionRequests; }, set engagementDeletionRequests(value) { engagementDeletionRequests = value; },
    get engagementDeletionRequestsLoaded() { return engagementDeletionRequestsLoaded; }, set engagementDeletionRequestsLoaded(value) { engagementDeletionRequestsLoaded = value; },
    get engagementDeletionRequestsLoading() { return engagementDeletionRequestsLoading; }, set engagementDeletionRequestsLoading(value) { engagementDeletionRequestsLoading = value; },
    get engagementDetailEditing() { return engagementDetailEditing; }, set engagementDetailEditing(value) { engagementDetailEditing = value; },
    get engagementDetailRetryPending() { return engagementDetailRetryPending; }, set engagementDetailRetryPending(value) { engagementDetailRetryPending = value; },
    get engagementLongOperation() { return engagementLongOperation; }, set engagementLongOperation(value) { engagementLongOperation = value; },
    get engagementMailJobs() { return engagementMailJobs; }, set engagementMailJobs(value) { engagementMailJobs = value; },
    get engagementMailJobsCompetitionId() { return engagementMailJobsCompetitionId; }, set engagementMailJobsCompetitionId(value) { engagementMailJobsCompetitionId = value; },
    get engagementMailJobsCursor() { return engagementMailJobsCursor; }, set engagementMailJobsCursor(value) { engagementMailJobsCursor = value; },
    get engagementMailJobsHasMore() { return engagementMailJobsHasMore; }, set engagementMailJobsHasMore(value) { engagementMailJobsHasMore = value; },
    get engagementMailJobsLoading() { return engagementMailJobsLoading; }, set engagementMailJobsLoading(value) { engagementMailJobsLoading = value; },
    get engagementMailJobsTotalCount() { return engagementMailJobsTotalCount; }, set engagementMailJobsTotalCount(value) { engagementMailJobsTotalCount = value; },
    get engagementNationalAuditActorSearchSequence() { return engagementNationalAuditActorSearchSequence; }, set engagementNationalAuditActorSearchSequence(value) { engagementNationalAuditActorSearchSequence = value; },
    get engagementNationalAuditActorSearchTimer() { return engagementNationalAuditActorSearchTimer; }, set engagementNationalAuditActorSearchTimer(value) { engagementNationalAuditActorSearchTimer = value; },
    get engagementNationalAuditActorSuggestions() { return engagementNationalAuditActorSuggestions; }, set engagementNationalAuditActorSuggestions(value) { engagementNationalAuditActorSuggestions = value; },
    get engagementNationalAuditAppliedActorUid() { return engagementNationalAuditAppliedActorUid; }, set engagementNationalAuditAppliedActorUid(value) { engagementNationalAuditAppliedActorUid = value; },
    get engagementNationalAuditHasMore() { return engagementNationalAuditHasMore; }, set engagementNationalAuditHasMore(value) { engagementNationalAuditHasMore = value; },
    get engagementNationalAuditLogs() { return engagementNationalAuditLogs; }, set engagementNationalAuditLogs(value) { engagementNationalAuditLogs = value; },
    get engagementNationalAuditLogsLoaded() { return engagementNationalAuditLogsLoaded; }, set engagementNationalAuditLogsLoaded(value) { engagementNationalAuditLogsLoaded = value; },
    get engagementNationalAuditLogsLoading() { return engagementNationalAuditLogsLoading; }, set engagementNationalAuditLogsLoading(value) { engagementNationalAuditLogsLoading = value; },
    get engagementNationalAuditNextCursor() { return engagementNationalAuditNextCursor; }, set engagementNationalAuditNextCursor(value) { engagementNationalAuditNextCursor = value; },
    get engagementNationalAuditVisibleFrom() { return engagementNationalAuditVisibleFrom; }, set engagementNationalAuditVisibleFrom(value) { engagementNationalAuditVisibleFrom = value; },
    get engagementNationalClubAdministratorsAvailable() { return engagementNationalClubAdministratorsAvailable; }, set engagementNationalClubAdministratorsAvailable(value) { engagementNationalClubAdministratorsAvailable = value; },
    get engagementNationalClubAdministratorsByClub() { return engagementNationalClubAdministratorsByClub; }, set engagementNationalClubAdministratorsByClub(value) { engagementNationalClubAdministratorsByClub = value; },
    get engagementNationalClubAdministratorsLoaded() { return engagementNationalClubAdministratorsLoaded; }, set engagementNationalClubAdministratorsLoaded(value) { engagementNationalClubAdministratorsLoaded = value; },
    get engagementNationalClubCreationRetry() { return engagementNationalClubCreationRetry; }, set engagementNationalClubCreationRetry(value) { engagementNationalClubCreationRetry = value; },
    get engagementNationalClubs() { return engagementNationalClubs; }, set engagementNationalClubs(value) { engagementNationalClubs = value; },
    get engagementNationalClubsLoaded() { return engagementNationalClubsLoaded; }, set engagementNationalClubsLoaded(value) { engagementNationalClubsLoaded = value; },
    get engagementNationalClubsLoading() { return engagementNationalClubsLoading; }, set engagementNationalClubsLoading(value) { engagementNationalClubsLoading = value; },
    get engagementNationalClubsVisibleLimit() { return engagementNationalClubsVisibleLimit; }, set engagementNationalClubsVisibleLimit(value) { engagementNationalClubsVisibleLimit = value; },
    get engagementNationalPeople() { return engagementNationalPeople; }, set engagementNationalPeople(value) { engagementNationalPeople = value; },
    get engagementNationalPeopleCursor() { return engagementNationalPeopleCursor; }, set engagementNationalPeopleCursor(value) { engagementNationalPeopleCursor = value; },
    get engagementNationalPeopleLoaded() { return engagementNationalPeopleLoaded; }, set engagementNationalPeopleLoaded(value) { engagementNationalPeopleLoaded = value; },
    get engagementNationalPeopleLoading() { return engagementNationalPeopleLoading; }, set engagementNationalPeopleLoading(value) { engagementNationalPeopleLoading = value; },
    get engagementNationalPeopleMergeMode() { return engagementNationalPeopleMergeMode; }, set engagementNationalPeopleMergeMode(value) { engagementNationalPeopleMergeMode = value; },
    get engagementNationalPersonMergeSourceId() { return engagementNationalPersonMergeSourceId; }, set engagementNationalPersonMergeSourceId(value) { engagementNationalPersonMergeSourceId = value; },
    get engagementNationalSwimmerMergeLoading() { return engagementNationalSwimmerMergeLoading; }, set engagementNationalSwimmerMergeLoading(value) { engagementNationalSwimmerMergeLoading = value; },
    get engagementNationalSwimmerMergeMode() { return engagementNationalSwimmerMergeMode; }, set engagementNationalSwimmerMergeMode(value) { engagementNationalSwimmerMergeMode = value; },
    get engagementNationalSwimmerMergeQuery() { return engagementNationalSwimmerMergeQuery; }, set engagementNationalSwimmerMergeQuery(value) { engagementNationalSwimmerMergeQuery = value; },
    get engagementNationalSwimmerMergeSourceId() { return engagementNationalSwimmerMergeSourceId; }, set engagementNationalSwimmerMergeSourceId(value) { engagementNationalSwimmerMergeSourceId = value; },
    get engagementNationalSwimmerMergeTargets() { return engagementNationalSwimmerMergeTargets; }, set engagementNationalSwimmerMergeTargets(value) { engagementNationalSwimmerMergeTargets = value; },
    get engagementNationalSwimmers() { return engagementNationalSwimmers; }, set engagementNationalSwimmers(value) { engagementNationalSwimmers = value; },
    get engagementNationalSwimmersLoaded() { return engagementNationalSwimmersLoaded; }, set engagementNationalSwimmersLoaded(value) { engagementNationalSwimmersLoaded = value; },
    get engagementNationalSwimmersLoading() { return engagementNationalSwimmersLoading; }, set engagementNationalSwimmersLoading(value) { engagementNationalSwimmersLoading = value; },
    get engagementNavigationRestoring() { return engagementNavigationRestoring; }, set engagementNavigationRestoring(value) { engagementNavigationRestoring = value; },
    get engagementOpenWaterCourses() { return engagementOpenWaterCourses; }, set engagementOpenWaterCourses(value) { engagementOpenWaterCourses = value; },
    get engagementOpenWaterCoursesLoaded() { return engagementOpenWaterCoursesLoaded; }, set engagementOpenWaterCoursesLoaded(value) { engagementOpenWaterCoursesLoaded = value; },
    get engagementOpenWaterCoursesLoading() { return engagementOpenWaterCoursesLoading; }, set engagementOpenWaterCoursesLoading(value) { engagementOpenWaterCoursesLoading = value; },
    get engagementPastCompetitionsExpanded() { return engagementPastCompetitionsExpanded; }, set engagementPastCompetitionsExpanded(value) { engagementPastCompetitionsExpanded = value; },
    get engagementPastCompetitionsVisibleLimit() { return engagementPastCompetitionsVisibleLimit; }, set engagementPastCompetitionsVisibleLimit(value) { engagementPastCompetitionsVisibleLimit = value; },
    get engagementPublicDeepLinkHandled() { return engagementPublicDeepLinkHandled; }, set engagementPublicDeepLinkHandled(value) { engagementPublicDeepLinkHandled = value; },
    get engagementSwimmerChangeRequests() { return engagementSwimmerChangeRequests; }, set engagementSwimmerChangeRequests(value) { engagementSwimmerChangeRequests = value; },
    get engagementSwimmerChangeRequestsLoaded() { return engagementSwimmerChangeRequestsLoaded; }, set engagementSwimmerChangeRequestsLoaded(value) { engagementSwimmerChangeRequestsLoaded = value; },
    get engagementSwimmerChangeRequestsLoading() { return engagementSwimmerChangeRequestsLoading; }, set engagementSwimmerChangeRequestsLoading(value) { engagementSwimmerChangeRequestsLoading = value; },
    get engagementSwimmerCorrectionOpener() { return engagementSwimmerCorrectionOpener; }, set engagementSwimmerCorrectionOpener(value) { engagementSwimmerCorrectionOpener = value; },
    get engagementSwimmerCorrectionReview() { return engagementSwimmerCorrectionReview; }, set engagementSwimmerCorrectionReview(value) { engagementSwimmerCorrectionReview = value; },
    get engagementUnsavedDecisionResolver() { return engagementUnsavedDecisionResolver; }, set engagementUnsavedDecisionResolver(value) { engagementUnsavedDecisionResolver = value; },
    get importModuleLoadPromise() { return importModuleLoadPromise; }, set importModuleLoadPromise(value) { importModuleLoadPromise = value; },
    get importSpreadsheetLoadPromise() { return importSpreadsheetLoadPromise; }, set importSpreadsheetLoadPromise(value) { importSpreadsheetLoadPromise = value; },
    get invitedRegionsBeforeDialog() { return invitedRegionsBeforeDialog; }, set invitedRegionsBeforeDialog(value) { invitedRegionsBeforeDialog = value; },
    get nationalAutomaticMailControl() { return nationalAutomaticMailControl; }, set nationalAutomaticMailControl(value) { nationalAutomaticMailControl = value; },
    get nationalAutomaticMailLoadedAt() { return nationalAutomaticMailLoadedAt; }, set nationalAutomaticMailLoadedAt(value) { nationalAutomaticMailLoadedAt = value; },
    get nationalAutomaticMailLoading() { return nationalAutomaticMailLoading; }, set nationalAutomaticMailLoading(value) { nationalAutomaticMailLoading = value; },
    get nativeCompetitionEditBaseline() { return nativeCompetitionEditBaseline; }, set nativeCompetitionEditBaseline(value) { nativeCompetitionEditBaseline = value; },
    get newlyCreatedEngagementCompetitionId() { return newlyCreatedEngagementCompetitionId; }, set newlyCreatedEngagementCompetitionId(value) { newlyCreatedEngagementCompetitionId = value; },
    get portalClubCodeReferenceById() { return portalClubCodeReferenceById; }, set portalClubCodeReferenceById(value) { portalClubCodeReferenceById = value; },
    get portalClubCodeReferenceLoadPromise() { return portalClubCodeReferenceLoadPromise; }, set portalClubCodeReferenceLoadPromise(value) { portalClubCodeReferenceLoadPromise = value; },
    get portalPendingOverviewLoaded() { return portalPendingOverviewLoaded; }, set portalPendingOverviewLoaded(value) { portalPendingOverviewLoaded = value; },
    get portalPendingOverviewLoading() { return portalPendingOverviewLoading; }, set portalPendingOverviewLoading(value) { portalPendingOverviewLoading = value; },
    get publicClubDirectoryLoadPromise() { return publicClubDirectoryLoadPromise; }, set publicClubDirectoryLoadPromise(value) { publicClubDirectoryLoadPromise = value; },
    get qualificationEditor() { return qualificationEditor; }, set qualificationEditor(value) { qualificationEditor = value; },
    get qualificationExceptionScope() { return qualificationExceptionScope; }, set qualificationExceptionScope(value) { qualificationExceptionScope = value; },
    get recordModuleLoadPromise() { return recordModuleLoadPromise; }, set recordModuleLoadPromise(value) { recordModuleLoadPromise = value; },
    get selectedEngagementClubEntry() { return selectedEngagementClubEntry; }, set selectedEngagementClubEntry(value) { selectedEngagementClubEntry = value; },
    get selectedEngagementCompetition() { return selectedEngagementCompetition; }, set selectedEngagementCompetition(value) { selectedEngagementCompetition = value; },
    get selectedEngagementCompetitionId() { return selectedEngagementCompetitionId; }, set selectedEngagementCompetitionId(value) { selectedEngagementCompetitionId = value; }
  };
  const portalConfig = {
    get AUDIT_ACTION_METADATA() { return AUDIT_ACTION_METADATA; },
    get AUDIT_CAPABILITY_LABELS() { return AUDIT_CAPABILITY_LABELS; },
    get AUDIT_DETAIL_LABELS() { return AUDIT_DETAIL_LABELS; },
    get AUDIT_ROLE_LABELS() { return AUDIT_ROLE_LABELS; },
    get ENGAGEMENT_ADMIN_PUBLIC_SWIMMER_SEARCH_VERSION() { return ENGAGEMENT_ADMIN_PUBLIC_SWIMMER_SEARCH_VERSION; },
    get ENGAGEMENT_CALENDAR_CACHE_TTL_MS() { return ENGAGEMENT_CALENDAR_CACHE_TTL_MS; },
    get ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX() { return ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX; },
    get ENGAGEMENT_CATEGORY_DEFINITIONS() { return ENGAGEMENT_CATEGORY_DEFINITIONS; },
    get ENGAGEMENT_CLUB_SWIMMERS_CACHE_TTL_MS() { return ENGAGEMENT_CLUB_SWIMMERS_CACHE_TTL_MS; },
    get ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX() { return ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX; },
    get ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS() { return ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS; },
    get ENGAGEMENT_CLUB_WORKSPACE_PRELOAD_LIMIT() { return ENGAGEMENT_CLUB_WORKSPACE_PRELOAD_LIMIT; },
    get ENGAGEMENT_CLUB_WORKSPACE_SESSION_CACHE_PREFIX() { return ENGAGEMENT_CLUB_WORKSPACE_SESSION_CACHE_PREFIX; },
    get ENGAGEMENT_COMPETITION_DOCUMENT_EXTENSION_PATTERN() { return ENGAGEMENT_COMPETITION_DOCUMENT_EXTENSION_PATTERN; },
    get ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES() { return ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES; },
    get ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT() { return ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT; },
    get ENGAGEMENT_COMPETITION_DOCUMENT_NATIONAL_MAX_BYTES() { return ENGAGEMENT_COMPETITION_DOCUMENT_NATIONAL_MAX_BYTES; },
    get ENGAGEMENT_DETAIL_TAB_GROUPS() { return ENGAGEMENT_DETAIL_TAB_GROUPS; },
    get ENGAGEMENT_DETAIL_TAB_LABELS() { return ENGAGEMENT_DETAIL_TAB_LABELS; },
    get ENGAGEMENT_EVENT_BY_CODE() { return ENGAGEMENT_EVENT_BY_CODE; },
    get ENGAGEMENT_EVENT_DEFINITIONS() { return ENGAGEMENT_EVENT_DEFINITIONS; },
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS() { return ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS; },
    get ENGAGEMENT_NATIONAL_CLUB_CACHE_KEY() { return ENGAGEMENT_NATIONAL_CLUB_CACHE_KEY; },
    get ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE() { return ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE; },
    get ENGAGEMENT_NATIONAL_HASH_BY_TAB() { return ENGAGEMENT_NATIONAL_HASH_BY_TAB; },
    get ENGAGEMENT_OPEN_WATER_DISCIPLINES() { return ENGAGEMENT_OPEN_WATER_DISCIPLINES; },
    get ENGAGEMENT_OPEN_WATER_ELIMINATION_PROGRAM_FORMATS() { return ENGAGEMENT_OPEN_WATER_ELIMINATION_PROGRAM_FORMATS; },
    get ENGAGEMENT_OPEN_WATER_RELAY_EVENT() { return ENGAGEMENT_OPEN_WATER_RELAY_EVENT; },
    get ENGAGEMENT_PROGRAM_FORMATS() { return ENGAGEMENT_PROGRAM_FORMATS; },
    get ENGAGEMENT_PROGRAM_FORMAT_LABELS() { return ENGAGEMENT_PROGRAM_FORMAT_LABELS; },
    get ENGAGEMENT_PROGRAM_GENDER_MODES() { return ENGAGEMENT_PROGRAM_GENDER_MODES; },
    get ENGAGEMENT_PROGRAM_GENDER_MODE_LABELS() { return ENGAGEMENT_PROGRAM_GENDER_MODE_LABELS; },
    get ENGAGEMENT_PROGRAM_PHASE_LABELS() { return ENGAGEMENT_PROGRAM_PHASE_LABELS; },
    get ENGAGEMENT_RELAY_AGE_CATEGORY_RANK() { return ENGAGEMENT_RELAY_AGE_CATEGORY_RANK; },
    get ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS() { return ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS; },
    get ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE() { return ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE; },
    get ENGAGEMENT_ROUTE_BY_HASH() { return ENGAGEMENT_ROUTE_BY_HASH; },
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get LIVEPALMES_REFERENCE_REGION_LABELS() { return LIVEPALMES_REFERENCE_REGION_LABELS; },
    get LIVEPALMES_REGION_DEFINITIONS() { return LIVEPALMES_REGION_DEFINITIONS; },
    get PERFORMANCE_PUBLIC_SEARCH_BASE() { return PERFORMANCE_PUBLIC_SEARCH_BASE; },
    get PORTAL_ACTIVE_CLUB_SESSION_KEY() { return PORTAL_ACTIVE_CLUB_SESSION_KEY; },
    get PORTAL_FRENCH_ERROR_REPLACEMENTS() { return PORTAL_FRENCH_ERROR_REPLACEMENTS; },
    get PORTAL_NAV_PIN_STORAGE_KEY() { return PORTAL_NAV_PIN_STORAGE_KEY; },
    get accessRequestHistory() { return accessRequestHistory; },
    get engagementClubEntriesAutosaveSwimmers() { return engagementClubEntriesAutosaveSwimmers; },
    get engagementClubEntriesDirtySwimmerIds() { return engagementClubEntriesDirtySwimmerIds; },
    get engagementClubEntryTimeHistoryCache() { return engagementClubEntryTimeHistoryCache; },
    get engagementClubEntryTimeHistoryRequests() { return engagementClubEntryTimeHistoryRequests; },
    get engagementClubSelectionChanges() { return engagementClubSelectionChanges; },
    get engagementClubSwimmerEventTimesBatch() { return engagementClubSwimmerEventTimesBatch; },
    get engagementClubSwimmerEventTimesCache() { return engagementClubSwimmerEventTimesCache; },
    get engagementClubSwimmerEventTimesRequests() { return engagementClubSwimmerEventTimesRequests; },
    get engagementClubWorkspaceCache() { return engagementClubWorkspaceCache; },
    get engagementClubWorkspaceRequests() { return engagementClubWorkspaceRequests; },
    get engagementCompetitionCalendarMemoryCache() { return engagementCompetitionCalendarMemoryCache; },
    get engagementCompetitionCalendarRequests() { return engagementCompetitionCalendarRequests; },
    get engagementCourseScrollHintSeen() { return engagementCourseScrollHintSeen; },
    get engagementLongOperationControlStates() { return engagementLongOperationControlStates; },
    get engagementNationalAuditActors() { return engagementNationalAuditActors; },
    get engagementNationalAuditClubs() { return engagementNationalAuditClubs; },
    get engagementNationalAuditCompetitions() { return engagementNationalAuditCompetitions; },
    get engagementNationalAuditPeople() { return engagementNationalAuditPeople; },
    get portalCallSamples() { return portalCallSamples; },
    get publicPerformanceSwimmerSearchShards() { return publicPerformanceSwimmerSearchShards; }
  };
  const portalContext = { state: portalState, actions: portalActions, config: portalConfig, get elements() { return elements; } };

  const portalNavigation = global.LivePalmesPortalNavigation.create(portalContext);
  const {
    engagementCompetitionType,
    engagementCompetitionTypeLabel,
    publicCalendarPublicationLabel,
    engagementWaterBodyTypeLabel,
    engagementOpenWaterEventCode,
    engagementOpenWaterEventDefinitions,
    engagementEventDefinitionsForCompetition,
    engagementEventDefinition,
    ensureEngagementLongOperation,
    startEngagementLongOperation,
    updateEngagementLongOperation,
    finishEngagementLongOperation,
    ensureFirebaseApp,
    ensureAdminAuth,
    functionsService,
    normalizePortalFrenchError,
    recordPortalCall,
    portalCallMetrics,
    callFunction,
    callFunctionWithTimeout,
    downloadBase64File,
    setMessage,
    setAccessMessage,
    setPublicAccessRequestMessage,
    setFormPending,
    setAccountMessage,
    markLastRefresh,
    lastRefreshTime,
    lastRefreshSuffix,
    toggleLoginPasswordVisibility,
    closeAccountMenu,
    canManagePerformances,
    setPortalNavigationPinned,
    restorePortalNavigationPinned,
    initializePortalNavigationLabels,
    setMobilePortalNavigationOpen,
    collapsePortalNavigationAfterSelection,
    canManageEngagements,
    canViewActivityLog,
    canAccessEngagementsView,
    canCreateEngagementCompetition,
    canDeleteEngagementCompetitionDirectly,
    canDeleteEngagementCompetitionImmediately,
    canReviewEngagementAccessRequests,
    canAccessEngagementRoute,
    preferredEngagementRouteHash,
    canManageAccessDirectory,
    canDeleteAccessUserDirectly,
    engagementClubScope,
    canSwitchEngagementClub,
    activeEngagementClubIdForProfile,
    activeEngagementClubProfile,
    restoreActiveEngagementClubFromSession,
    clearActiveEngagementClub,
    setActiveEngagementClub,
    resetEngagementClubData,
    engagementRegionScope,
    canManageEngagementCompetitionScope,
    isRegionalPastEngagementReadOnly,
    canEditEngagementCompetition,
    setPerformanceMenuOpen,
    setClubMenuOpen,
    setDtnMenuOpen,
    setEngagementsAdminMenuOpen,
    setNationalMenuOpen,
    setAccessMenuOpen,
    setExclusivePortalMenu,
    togglePortalSpace,
    setOverviewSpaceExpanded,
    updateOverviewSpaceTools,
    isEngagementAdminMode,
    engagementNavigationMode,
    engagementNationalPageTitle,
    renderEngagementClubContext,
    updateEngagementsModeView,
    updateEngagementDirtyTabIndicators,
    loadActiveEngagementNationalTab,
    setEngagementNationalTab,
    renderEngagementNationalOverview,
    renderPendingBadgeCollection,
    renderPortalPendingOverview,
    loadPortalPendingOverview,
    loadEngagementNationalOverview,
    loadNationalAutomaticMailControl,
    renderNationalAutomaticMailControls,
    renderNationalAutomaticMailControl,
    updateEngagementDetailEditState,
    markEngagementDetailTabDirty,
    clearEngagementDetailTabDirty,
    confirmLeaveDirtyEngagementTab,
    resolveEngagementUnsavedDecision,
    requestEngagementUnsavedDecision,
    discardEngagementDetailTabChanges,
    isClubEngagementWorkflowTab,
    engagementClubTeamComplete,
    engagementClubEntryHasParticipants,
    updateNativeCompetitionPersonCreationButton,
    updateEngagementClubTeamLeaderActions,
    engagementClubWriteLockReason,
    engagementClubWriteLocked,
    engagementClubSwimmerSelectionLockReason,
    engagementClubIndividualEntriesLockReason,
    engagementClubOfficialsLockReason,
    engagementClubRelaysLockReason,
    engagementClubTeamLeaderLockReason,
    engagementClubStepLockReason,
    engagementClubInformationOnly,
    setEngagementClubFormControlsLocked,
    setEngagementClubCompetitionFormsLocked,
    showEngagementClubWriteLock,
    canOpenClubEngagementTab,
    clubEngagementTabHiddenWhenWriteLocked,
    engagementDetailTabLabel,
    engagementDetailTabsForGroup,
    visibleEngagementDetailTabs,
    engagementLastTabStorageKey,
    storedEngagementDetailTab,
    rememberEngagementDetailTab,
    setEngagementSaveState,
    engagementClubEmptySwimmersHtml,
    engagementDetailTabGroup,
    updateEngagementStepNavigation,
    requestEngagementDetailTab,
    setEngagementsTab,
    setEngagementsDetailTab,
    firebaseAccountError,
    reauthenticateCurrentUser,
    canUse,
    isClubOnlyPortalProfile,
    applyPortalHomeForProfile,
    updateCapabilityView,
    syncEngagementRouteFromHash,
    requestedNavigationView,
    updateNavigationView
  } = portalNavigation;
  Object.assign(portalActions, portalNavigation);

  const portalModulesAndClubs = global.LivePalmesPortalModulesAndClubs.create(portalContext);
  const {
    loadScriptOnce,
    loadPortalClubCodeReference,
    watchRecordWorkbench,
    loadDtnModule,
    loadRecordModule,
    watchImportWorkbench,
    loadImportSpreadsheet,
    loadImportModule,
    capabilityLabel,
    normalizedRegionKey,
    canonicalLivePalmesRegion,
    sameLivePalmesRegion,
    regionDisplayLabel,
    setRegionSelectValue,
    fillLivePalmesRegionSelect,
    selectedRegionMultiSelectValues,
    setRegionMultiSelectValues,
    updateInvitedRegionWarning,
    renderInvitedRegionChoices,
    fillLivePalmesRegionMultiSelect,
    populateLivePalmesRegionSelects,
    accessReferenceRegionLabel,
    normalizeAccessClubReference,
    accessClubLabel,
    accessClubFromId,
    clubDisplayCode,
    clubDisplayLabel,
    populateAccessRegionChoices,
    syncAccessClubFieldsFromSelect,
    populateAccessClubSelect,
    syncPublicAccessRequestClubFieldsFromSelect,
    populatePublicAccessRequestClubSelect,
    normalizedClubFederalNumber,
    publicAccessRequestNewClubInputs,
    updatePublicAccessRequestNewClubMode,
    matchPublicAccessRequestClubByFederalNumber,
    syncEngagementAccessRequestEditClubFieldsFromSelect,
    populateEngagementAccessRequestEditClubSelect,
    loadAccessClubReference,
    renderClubSwitchResults,
    openClubSwitchDialog,
    changeActiveEngagementClub,
    currentEngagementSeasonStartYear,
    engagementSeasonBounds,
    engagementSeasonLabel,
    populateEngagementSeasonFilter,
    syncEngagementStatusSegments
  } = portalModulesAndClubs;
  Object.assign(portalActions, portalModulesAndClubs);

  const portalCompetitionSettings = global.LivePalmesPortalCompetitionSettings.create(portalContext);
  const {
    updateEngagementDetailStepLabels,
    initializeEngagementCalendarFilters,
    applyEngagementCalendarRegionScope,
    resetEngagementCalendarFilters,
    engagementCalendarFiltersPayload,
    engagementCalendarSeptemberPreview,
    engagementCalendarRequestedRange,
    engagementCalendarScopeKey,
    engagementCalendarCacheKey,
    engagementCalendarCacheCompetition,
    readEngagementCalendarCache,
    writeEngagementCalendarCache,
    activateEngagementCalendarCache,
    persistActiveEngagementCalendarCache,
    upsertEngagementCalendarItemFromServer,
    removeEngagementCalendarItemFromCache,
    invalidateEngagementCalendarCaches,
    engagementCompetitionIsInSeptemberPreview,
    filteredEngagementCompetitions,
    engagementCalendarSections,
    renderCurrentUser,
    renderPortalScopeContext,
    renderEngagementsProfile,
    updateEngagementRegionField,
    updateEngagementInvitedRegionField,
    updateEngagementCreateFormAccess,
    updateEngagementEditFormAccess,
    updateEngagementQualificationFields,
    updateEngagementMaxEventsFields,
    setDefaultEngagementOfficialsRequired,
    prepareCreateCompetitionDialog,
    resetCreateCompetitionDialog,
    openCreateCompetitionDialog,
    syncInvitedRegionChoice,
    openInvitedRegionsDialog,
    closeInvitedRegionsDialog,
    qualificationExceptionContext,
    qualificationExceptionsEnabled,
    renderQualificationExceptionToggle,
    confirmQualificationException,
    engagementManualIndividualTimesAllowed,
    engagementKnownIndividualTimesSelectable,
    clearUncheckedQualificationException,
    renderQualificationAlert,
    updateEngagementManualEntryTimeField,
    renderQualificationJobActions,
    renderQualificationEditor,
    finishQualificationJob,
    updateCompetitionWithQualifications,
    updateQualificationCheckboxes,
    fillEngagementEditForm,
    setEngagementEditMode,
    formatShortDate,
    formatDeadline,
    isoToDatetimeLocal,
    normalizeEngagementDeadlineField,
    syncEngagementEndDate,
    markEngagementEndDateManual,
    engagementLevelLabel,
    engagementStatusLabel,
    engagementDeadlineTone,
    engagementOperationalStatusLabel,
    formatEngagementCompetitionDate,
    engagementDeadlineDisplay,
    renderEngagementDetailStatus,
    refreshEngagementDeadlineCountdowns,
    engagementCompetitionMonthLabel,
    engagementCompetitionAction,
    updateEngagementSportFields,
    mergeNationalClubsIntoAccessReference,
    setSelectedEngagementCompetitionClubEntryExists,
    engagementPoolLengthLabel,
    engagementPoolLabel,
    engagementTimingTypeLabel,
    engagementVenueLabel,
    engagementFacilityLabel,
    engagementQualificationPeriodLabel,
    engagementMissingEntryTimeModeLabel,
    engagementEntryTimeRulesLabel,
    engagementMaxEventsLabel,
    engagementFeeAmount,
    formatEngagementFee,
    engagementFeesSummary,
    engagementExternalHttpUrl,
    engagementEmailLinkValue,
    engagementRowValueHtml,
    engagementTeamLeadersWhatsAppUrl,
    engagementTeamLeadersWhatsAppValue,
    engagementCompetitionProgramOverview,
    selectedEngagementFeesFromForm,
    selectedCreateEngagementFeesFromForm,
    updateCreateEngagementFeesMode,
    updateEngagementFeesFormMode,
    renderEngagementFees
  } = portalCompetitionSettings;
  Object.assign(portalActions, portalCompetitionSettings);

  const portalClubPeople = global.LivePalmesPortalClubPeople.create(portalContext);
  const {
    selectedEngagementTeamLeaderFromForm,
    engagementClubTeamLeaderPeople,
    renderEngagementClubTeamPersonOptions,
    setEngagementClubTeamManualFieldsVisible,
    findEngagementClubTeamPersonFromFields,
    applyEngagementClubTeamPerson,
    confirmEngagementClubTeamLeaderCandidate,
    restoreEngagementClubTeamLeaderChoice,
    cancelEngagementClubTeamEdit,
    selectEngagementClubTeamRenunciation,
    openEngagementClubTeamRenunciationDialog,
    closeEngagementClubTeamRenunciationDialog,
    closeEngagementClubExternalTeamDialog,
    openEngagementClubExternalTeamDialog,
    saveEngagementClubExternalTeamLeader,
    engagementClubOfficialPeople,
    engagementClubSwimmerReferenceValue,
    engagementClubSwimmerFromReferenceValue,
    engagementClubPersonForSwimmer,
    renderEngagementClubPersonSwimmerOptions,
    applyEngagementClubPersonSwimmer,
    selectedEngagementClubOfficialIds,
    updateEngagementClubOfficialsSummary,
    renderEngagementClubOfficials,
    engagementClubMemberRoleConflict,
    handleEngagementClubOfficialSelection,
    normalizedEngagementClubSearch,
    normalizedEngagementClubIdentityPart,
    engagementClubPersonLicenseKey,
    engagementClubPersonIdentityKey,
    engagementClubIdentityEditDistance,
    engagementClubIdentityPartSimilar,
    engagementClubPersonIdentityMatch,
    engagementClubPersonDisplayName,
    engagementClubPersonPayloadWithRole,
    resolveEngagementClubPersonIdentity,
    engagementAdminPublicSwimmerSearchTokens,
    engagementAdminPublicSwimmerSearchShard,
    loadEngagementAdminPublicSwimmerSearchShard,
    engagementAdminPublicSwimmerScore,
    engagementAdminPublicSwimmerItem,
    searchEngagementAdminPublicSwimmers,
    mergeEngagementNationalSwimmerResults,
    engagementNationalSwimmerKey,
    engagementNationalSwimmerByKey,
    engagementNationalSwimmerIdentityKey,
    engagementNationalSwimmerDuplicateAlertLabel,
    selectedEngagementNationalSwimmerMergeKeys,
    selectedEngagementNationalSwimmerKeepKey,
    updateEngagementNationalSwimmerSelectionState,
    setEngagementNationalSwimmerMergeMode
  } = portalClubPeople;
  Object.assign(portalActions, portalClubPeople);

  const portalClubEntryState = global.LivePalmesPortalClubEntryState.create(portalContext);
  const {
    selectedEngagementClubSwimmerRows,
    selectedEngagementClubEntryRowsBySwimmerId,
    engagementClubIndividualEvents,
    engagementClubSelectedIndividualEventCodes,
    formatEngagementEntryTimeInput,
    normalizeEngagementEntryTimeInput,
    engagementEntryTimeDisplayLabel,
    engagementClubSwimmerEventTimesCacheKey,
    mergeEngagementClubSwimmerEventTimes,
    markEngagementClubSwimmerEventTimesError,
    flushEngagementClubSwimmerEventTimesBatch,
    ensureEngagementClubSwimmerEventTimes,
    engagementEntryTimeHelpLabel,
    engagementClubProgramSessionsForEntries,
    engagementClubProgramItemAllowsSwimmer,
    engagementClubProgramSessionsForSex,
    engagementClubProgramItemLabel,
    engagementClubEntryRowCountLabel,
    updateEngagementClubEntryRowCount,
    updateEngagementClubSwimmersSummary,
    syncEngagementClubEntriesSaveBar,
    setEngagementClubEntriesDirty,
    markEngagementClubEntrySwimmerDirty,
    setEngagementClubPersistedSwimmers,
    cloneEngagementClubEntry,
    engagementClubWorkspaceScopeKey,
    engagementClubWorkspaceCacheKey,
    readEngagementClubWorkspaceCache,
    writeEngagementClubWorkspaceCache,
    clearEngagementClubWorkspaceSessionCaches,
    engagementClubSwimmersCacheKey,
    readEngagementClubSwimmersCache,
    writeEngagementClubSwimmersCache,
    invalidateEngagementClubSwimmersCache,
    clearEngagementClubSwimmersSessionCaches,
    pendingEngagementClubWorkspaceRequest,
    preloadEngagementClubWorkspaces,
    scheduleEngagementClubWorkspacePreload,
    resetEngagementClubTransientMessages,
    rememberEngagementClubPersistedEntry,
    captureEngagementClubEntriesViewport,
    restoreEngagementClubEntriesViewport,
    renderEngagementClubMutationResult,
    mergeEngagementClubEntryWithLocalSwimmerSelections,
    queueEngagementClubEntryMutation,
    flushEngagementClubSwimmerSelections,
    persistEngagementClubSwimmerSelection,
    removeEngagementClubSwimmerFromCourses,
    resetEngagementClubEntriesAutosave,
    discardPendingEngagementClubIndividualEntries,
    flushEngagementClubIndividualEntriesAutosave,
    persistEngagementClubIndividualEntries,
    engagementClubHasPendingWrites,
    flushPendingEngagementClubWrites,
    engagementNavigationBaseline,
    preserveEngagementNavigation,
    showEngagementNavigationRecovery,
    restoreEngagementNavigation,
    updateEngagementClubEntriesSummary,
    engagementClubSwimmerSearchText,
    engagementCategoryLabel,
    engagementSeasonEndYear,
    engagementSeasonEndYearFromDate,
    engagementSwimmerCategory,
    engagementSwimmerLicenseStatusLabel,
    engagementSwimmerLicenseStatusIndicator,
    setEngagementClubSwimmerRowExpanded,
    engagementSwimmerDisplayName,
    compareEngagementSwimmersByName,
    compareEngagementSwimmersBySexAndName,
    engagementPublicSwimmerProfileUrl,
    engagementClubSwimmerIsActive
  } = portalClubEntryState;
  Object.assign(portalActions, portalClubEntryState);

  const portalClubEntryViews = global.LivePalmesPortalClubEntryViews.create(portalContext);
  const {
    renderEngagementClubSwimmersDirectory,
    setEngagementClubSwimmerActivityStatus,
    requestEngagementClubSwimmerDeletion,
    renderEngagementClubSelectedSwimmersPreview,
    renderEngagementClubSwimmers,
    renderEngagementClubEntriesTable,
    initializeEngagementCourseScrollHints,
    renderEngagementClubEntries,
    engagementClubTimesDialogSwimmer,
    engagementClubTimesDialogEventCodes,
    engagementClubEntryTimeHistoryLabel,
    updateEngagementClubTimeDialogHelp,
    populateEngagementClubEntryTimeHistory,
    loadEngagementClubEntryTimeHistory,
    renderEngagementClubTimesDialog,
    openEngagementClubTimesDialog,
    closeEngagementClubTimesDialog,
    applyEngagementClubTimesDialog,
    engagementClubRelayEvents,
    engagementClubRelaySessionLabel,
    engagementRelayCategoryOptions,
    engagementRelayGenderOptions,
    engagementClubRelaySwimmerOptions,
    engagementRelayLegCount,
    engagementRelayLegPlaceholder,
    engagementRelayLegChoiceLabel,
    engagementRelayPeopleWording,
    engagementRelayMemberShortLabel,
    engagementRelayMemberShortLabels,
    engagementRelayMemberSummary,
    engagementRelayExpectedMemberSex,
    engagementRelaySwimmerAllowedForCategory,
    engagementRelayMemberOptionLabel,
    engagementRelaySameDistanceNature,
    engagementRelayMemberAlreadyUsed,
    selectedEngagementClubRelayRowsFromDom,
    selectedEngagementClubRelayRows,
    engagementClubRelayNeedsCompletion,
    reconcileEngagementClubRelayDraft,
    focusEngagementClubRelayControl,
    focusFirstIncompleteEngagementClubRelay,
    selectedEngagementClubRelayRowsFromElement,
    engagementClubRelayDialogRelay,
    readEngagementClubRelayDialogDraft,
    syncEngagementClubRelayDialogMemberOptions,
    renderEngagementClubRelayDialog,
    openEngagementClubRelayDialog,
    closeEngagementClubRelayDialog,
    applyEngagementClubRelayDialog,
    resetEngagementClubRelayDialogMembers,
    engagementRelayMemberAge,
    engagementClubRelayValidationIssues,
    updateEngagementClubRelaysSummary,
    currentEngagementClubSwimmersForSummary,
    currentEngagementClubOfficialCount,
    engagementClubSummaryTeamLeaderLabel,
    renderEngagementClubSummary,
    renderEngagementClubNativeSummary,
    engagementClubPersistedRelayDraft,
    renderEngagementClubRelays,
    updateEngagementClubTeamFormMode,
    renderEngagementClubEntry,
    engagementClosureAutomationStatusLabel,
    engagementClosureAutomationStatusTone
  } = portalClubEntryViews;
  Object.assign(portalActions, portalClubEntryViews);

  const portalDocumentsAndProgram = global.LivePalmesPortalDocumentsAndProgram.create(portalContext);
  const {
    formatEngagementAutomationDate,
    renderEngagementClosureAutomation,
    loadEngagementClubRecapFiles,
    renderEngagementClubRecapSelector,
    engagementStatisticsTimeModeLabel,
    renderEngagementCompetitionStatistics,
    loadEngagementCompetitionStatistics,
    engagementMailJobTypeLabel,
    renderEngagementMailJobs,
    loadEngagementMailJobs,
    engagementCompetitionDocumentCategoryLabel,
    engagementCompetitionDocumentCategoryOptions,
    engagementCompetitionDocumentFileSize,
    engagementCompetitionDocumentTypeLabel,
    renderEngagementCompetitionDocumentDrafts,
    openEngagementCompetitionDocumentForm,
    closeEngagementCompetitionDocumentForm,
    engagementCompetitionDocumentDraftValues,
    readEngagementCompetitionDocumentFile,
    handleEngagementCompetitionDocumentFiles,
    updateSelectedEngagementCompetitionDocuments,
    saveEngagementCompetitionDocuments,
    deleteEngagementCompetitionDocument,
    renderEngagementSharedDocuments,
    canDownloadEngagementOpenWaterTxt,
    renderEngagementDocuments,
    updateSelectedEngagementDocumentStatus,
    engagementEventSummary,
    engagementProgramSummary,
    engagementProgramStatusSummary,
    engagementEventsCompactSummary,
    missingEngagementProgramEventCount,
    updateEngagementEventsSectionToggleLabels,
    setEngagementEventsSectionOpen,
    updateEngagementEventsSectionSummaries,
    engagementEventCountLabel,
    selectedEngagementEventOptions,
    normalizedEngagementProgramSessions,
    selectedEngagementProgramSessionsFromForm,
    engagementProgramGenderModesForEvent,
    engagementProgramGenderModeShortLabel,
    engagementProgramGenderModeDisplayLabel,
    engagementProgramGenderModeTone,
    engagementProgramPhaseLabel,
    engagementProgramFormatsForEvent,
    engagementProgramPhaseForEvent,
    engagementProgramSameSlot,
    engagementProgramPassages,
    engagementProgramFormatForPhase,
    engagementProgramFirstPhaseForFormat,
    engagementProgramSecondPhaseForFormat,
    engagementProgramCanAddPassage,
    engagementProgramNextPhase,
    normalizeEngagementProgramPassageOrder,
    applyEngagementProgramFormatChange,
    renderEngagementProgramSessions,
    refreshEngagementProgramEditor,
    addEngagementProgramSession,
    handleEngagementProgramAction,
    selectedEngagementEventsFromForm,
    selectedEngagementEventsCategoryError,
    selectedEngagementProgramError,
    engagementAllowedCategoryCodes,
    normalizeEngagementCategoryRestrictions,
    engagementCategoryDefinitionsForEvent,
    updateEngagementEventsSummaryFromForm,
    engagementCategoryColumnInputs,
    updateEngagementCategoryColumnControls,
    applyEngagementCategoryColumnControl,
    renderEngagementOpenWaterCourseLibrary,
    loadEngagementOpenWaterCourses,
    addEngagementOpenWaterCourseToProgram,
    addEngagementOpenWaterCourse,
    setEngagementOpenWaterCourseStatus,
    renderEngagementEventGroup,
    renderEngagementEvents,
    renderNativeCourseRemoval,
    renderEngagementCompetitions,
    renderEngagementCompetitionTable,
    setEngagementCompetitionDetailVisible,
    setEngagementClubEntryLoadingState,
    engagementNativeEditWarningKind,
    renderEngagementNativeEditWarnings,
    engagementClubContextMessage
  } = portalDocumentsAndProgram;
  Object.assign(portalActions, portalDocumentsAndProgram);

  const portalCompetitionActions = global.LivePalmesPortalCompetitionActions.create(portalContext);
  const {
    renderEngagementCompetitionDetail,
    closeEngagementCompetitionDetail,
    loadEngagementCompetitionDetail,
    engagementClubReadRetryBlocked,
    retryEngagementCompetitionRead,
    saveEngagementClubTeamLeader,
    removeEngagementClubTeamLeader,
    saveEngagementClubOfficials,
    renderActiveEngagementClubSwimmerConsumer,
    loadEngagementClubSwimmers,
    saveEngagementClubSwimmers,
    saveEngagementClubRelays,
    downloadEngagementClubSummaryPdf,
    downloadEngagementAdminClubRecapPdf,
    generateEngagementAdminClubRecapPdfs,
    generateEngagementAdminTxtExport,
    prepareEngagementOpeningEmails,
    prepareEngagementClubRecapEmails,
    engagementMailSendButton,
    engagementMailSendActionLabel,
    sendEngagementPreparedEmails,
    selectedEngagementClubNewSwimmerFromForm,
    formatEngagementSwimmerLicense,
    resetEngagementClubNewSwimmerForm,
    setEngagementClubNewSwimmerMessage,
    engagementClubNewSwimmerFormHasValues,
    engagementClubNewSwimmerLockReason,
    updateEngagementClubNewSwimmerControls,
    openEngagementClubNewSwimmerDialog,
    closeEngagementClubNewSwimmerDialog,
    resetEngagementClubNewSwimmerFormFromButton,
    renderEngagementClubNewSwimmerAlerts,
    renderEngagementClubSwimmerRecovery,
    engagementClubNewSwimmerConfirmationMessage,
    createEngagementClubSwimmer,
    recoverEngagementClubSwimmer,
    deleteOrRequestEngagementCompetitionDeletion,
    updateEngagementAccessRequestBadge
  } = portalCompetitionActions;
  Object.assign(portalActions, portalCompetitionActions);

  const portalNationalRequests = global.LivePalmesPortalNationalRequests.create(portalContext);
  const {
    renderEngagementAccessRequests,
    loadEngagementAccessRequests,
    setEngagementAccessRequestEditMessage,
    closeEngagementAccessRequestEditForm,
    openEngagementAccessRequestEditForm,
    correctedEngagementAccessRequestFromEditForm,
    resolveEngagementAccessRequest,
    submitEngagementAccessRequestEdit,
    publicAccessRequestPayloadFromForm,
    submitPublicEngagementAccessRequest,
    updateEngagementNationalRequestsPresentation,
    renderEngagementDeletionRequests,
    loadEngagementDeletionRequests,
    updateEngagementDeletionRequestBadge,
    resolveEngagementDeletionRequest,
    renderEngagementNationalSwimmers,
    updateEngagementNationalSwimmersStatus,
    engagementSwimmerChangeSummary,
    updateEngagementSwimmerChangeRequestsBadge,
    renderEngagementSwimmerChangeRequests,
    loadEngagementSwimmerChangeRequests,
    openEngagementSwimmerChangeRequestReview,
    resolveEngagementSwimmerChangeRequest,
    openEngagementAccessRequestRejectDialog,
    closeEngagementAccessRequestRejectDialog,
    submitEngagementAccessRequestRejection,
    closeEngagementSwimmerCorrectionDialog,
    resetEngagementSwimmerCorrectionDialog,
    openEngagementSwimmerCorrectionDialog,
    updateClubIdentityCorrectionAction,
    submitEngagementSwimmerCorrection,
    normalizeEngagementNationalClub,
    readEngagementNationalClubCache,
    writeEngagementNationalClubCache,
    engagementNationalClubSyncStart,
    mergeEngagementNationalClubDirectory,
    filteredEngagementNationalClubs,
    setEngagementNationalClubAdministrators,
    engagementNationalClubAdministratorsHtml,
    renderEngagementNationalClubs
  } = portalNationalRequests;
  Object.assign(portalActions, portalNationalRequests);

  const portalNationalDirectories = global.LivePalmesPortalNationalDirectories.create(portalContext);
  const {
    loadEngagementNationalClubs,
    closeEngagementNationalClubDialog,
    openEngagementNationalClubDialog,
    saveEngagementNationalClub,
    deleteEngagementNationalClub,
    engagementNationalStatusMatches,
    filteredEngagementNationalSwimmers,
    resetEngagementNationalSwimmerFilters,
    loadEngagementNationalSwimmers,
    setEngagementNationalSwimmerStatus,
    deleteEngagementNationalSwimmer,
    resetEngagementNationalSwimmerMergeState,
    searchEngagementNationalSwimmerMergeTargets,
    mergeEngagementNationalSwimmer,
    mergeSelectedEngagementNationalSwimmers,
    repairEngagementNationalSwimmerMergePublication,
    renderEngagementNationalPeople,
    updateEngagementNationalPeopleStatus,
    visibleNativePeople,
    filteredEngagementNationalPeople,
    resetEngagementNationalPeopleFilters,
    engagementNationalPersonMergeCandidates,
    engagementNationalPersonDuplicateAlertLabel,
    engagementNationalPersonById,
    selectedEngagementNationalPersonMergeIds,
    selectedEngagementNationalPersonKeepId,
    updateEngagementNationalPeopleSelectionState,
    setEngagementNationalPeopleMergeMode,
    loadEngagementNationalPeople,
    setEngagementNationalPersonStatus,
    deleteEngagementNationalPerson,
    mergeEngagementNationalPerson,
    mergeSelectedEngagementNationalPeople
  } = portalNationalDirectories;
  Object.assign(portalActions, portalNationalDirectories);

  const portalActivityJournal = global.LivePalmesPortalActivityJournal.create(portalContext);
  const {
    auditActionLabel,
    auditActionCategory,
    auditActorOrigin,
    auditActorLabel,
    auditActorOptionLabel,
    renderEngagementNationalAuditActorSuggestions,
    setEngagementNationalAuditActorSelection,
    searchEngagementNationalAuditActors,
    handleEngagementNationalAuditActorSearch,
    auditClubId,
    auditClubLabel,
    auditCompetitionLabel,
    auditTargetSummary,
    auditDateLabel,
    auditDetailValue,
    auditEnabledLabels,
    auditPersonLabel,
    auditReadableValue,
    auditDetailLabel,
    auditComplementaryLabel,
    auditValuesEqual,
    auditChangeRows,
    auditDetailIsTechnicalKey,
    auditTechnicalKeyIsReadable,
    auditDetailRows,
    auditTechnicalDetailsHtml,
    filteredEngagementNationalAuditLogs,
    auditEntryHtml,
    updateEngagementNationalAuditFilterOptions,
    resetEngagementNationalAuditFilters,
    resetEngagementNationalAuditData,
    renderEngagementNationalAuditLogs,
    loadEngagementNationalAuditLogs,
    engagementClubPersonRoleLabel,
    closeEngagementClubPersonDialog,
    openNativeCompetitionPersonCreation,
    resetEngagementClubPersonForm
  } = portalActivityJournal;
  Object.assign(portalActions, portalActivityJournal);

  const portalClubAndCompetition = global.LivePalmesPortalClubAndCompetition.create(portalContext);
  const {
    openEngagementClubPersonForm,
    selectedEngagementClubPersonFromForm,
    renderEngagementClubPeople,
    loadEngagementClubPeople,
    saveEngagementClubPerson,
    setEngagementClubPersonStatus,
    loadEngagementCompetitions,
    engagementCompetitionPayloadFromFields,
    createCompetitionFields,
    editCompetitionFields,
    engagementCompetitionPayloadFromForm,
    engagementCompetitionPayloadFromEditForm,
    nativeCompetitionFormValues,
    nativeCompetitionPatchFromForm,
    saveNativeCompetitionDetail,
    engagementOpeningDeadlineError,
    shouldSendEngagementOpeningMail,
    engagementOpeningMailScopeLabel,
    confirmEngagementOpeningMail,
    confirmEngagementReopeningMail,
    confirmOpenedCompetitionSensitiveChanges,
    prepareAndSendEngagementOpeningEmails,
    createEngagementCompetition,
    completeNewlyCreatedEngagementCompetition,
    updateEngagementCompetition,
    saveEngagementCompetitionDetail,
    engagementCompetitionPayloadFromSelection,
    updateEngagementCompetitionEvents,
    updateEngagementCompetitionFees
  } = portalClubAndCompetition;
  Object.assign(portalActions, portalClubAndCompetition);

  const portalAccountAndAccess = global.LivePalmesPortalAccountAndAccess.create(portalContext);
  const {
    loadCurrentUser,
    updateView,
    signIn,
    sendPasswordReset,
    signOut,
    updateAccountEmail,
    toggleAccountNotificationPreferences,
    updateAccountPassword,
    accessPayloadFromForm,
    openAccessDialog,
    fillAccessForm,
    resetAccessForm,
    formatAccessDateTime,
    accessActionIcon,
    renderAccessUsers,
    renderAccessPagination,
    escapeHtml,
    accessFiltersPayload,
    normalizedAccessSearch,
    legacyFilteredAccessUsers,
    accessDirectorySnapshotScope,
    loadAccessDirectoryFirestoreModule,
    preloadAccessDirectoryFirestore,
    loadAccessDirectorySnapshot,
    sortedAccessUsers,
    accessDirectoryUserLetter,
    renderAccessDirectoryAlphabet,
    renderAccessDirectorySnapshotPage,
    loadAccessUsers,
    showNextAccessPage,
    showPreviousAccessPage,
    refreshAccessUsersAfterMutation,
    setAccessStatus,
    renderAccessDeletionRequests,
    loadAccessDeletionRequests,
    deleteAccessUser,
    requestAccessUserDeletion,
    resolveAccessDeletionRequest,
    saveAccessUser
  } = portalAccountAndAccess;
  Object.assign(portalActions, portalAccountAndAccess);

  const portalEvents = global.LivePalmesPortalEvents.create(portalContext);
  const {
    bindEngagementClubPeopleRetry,
    init
  } = portalEvents;
  Object.assign(portalActions, portalEvents);

  /* portal-wiring-end */
  const ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE = false;
  const ENGAGEMENT_SWIMMER_LICENSE_PATTERN = /^[A-Z]-\d{2}-\d+$/;
  const PORTAL_NAV_PIN_STORAGE_KEY = "livepalmes.portal.navPinned";
  const PORTAL_ACTIVE_CLUB_SESSION_KEY = "livepalmes.portal.activeClubId";
  const ENGAGEMENT_NATIONAL_CLUB_CACHE_KEY = "livepalmes.portal.nationalClubs.v2";
  const ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX = "livepalmes.portal.engagementCalendar.v4.";
  const ENGAGEMENT_CALENDAR_CACHE_TTL_MS = 5 * 60 * 1000;
  const ENGAGEMENT_CLUB_WORKSPACE_SESSION_CACHE_PREFIX = "livepalmes.portal.engagementWorkspace.v2.";
  const ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS = 5 * 60 * 1000;
  const ENGAGEMENT_CLUB_WORKSPACE_PRELOAD_LIMIT = 4;
  const ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX = "livepalmes.portal.engagementSwimmers.v1.";
  const ENGAGEMENT_CLUB_SWIMMERS_CACHE_TTL_MS = 5 * 60 * 1000;
  const ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE = 48;
  const ENGAGEMENT_ADMIN_PUBLIC_SWIMMER_SEARCH_VERSION = "20260812-national-swimmers-firestore-2";
  const PERFORMANCE_PUBLIC_SEARCH_BASE = global.LivePalmesEnvironment.publicStorageUrl("performance-public-firestore");
  const publicPerformanceSwimmerSearchShards = new Map();
  const ENGAGEMENT_EVENT_DEFINITIONS = [
    ["25SF", "individual", "25 m Surface", "25 SF", "SF", 25],
    ["25AP", "individual", "25 m Apnee", "25 AP", "AP", 25],
    ["50SF", "individual", "50 m Surface", "50 SF", "SF", 50],
    ["100SF", "individual", "100 m Surface", "100 SF", "SF", 100],
    ["200SF", "individual", "200 m Surface", "200 SF", "SF", 200],
    ["400SF", "individual", "400 m Surface", "400 SF", "SF", 400],
    ["800SF", "individual", "800 m Surface", "800 SF", "SF", 800],
    ["1500SF", "individual", "1500 m Surface", "1500 SF", "SF", 1500],
    ["50AP", "individual", "50 m Apnee", "50 AP", "AP", 50],
    ["100IS", "individual", "100 m Immersion", "100 IS", "IS", 100],
    ["200IS", "individual", "200 m Immersion", "200 IS", "IS", 200],
    ["400IS", "individual", "400 m Immersion", "400 IS", "IS", 400],
    ["50BI", "individual", "50 m Bi-palmes", "50 BI", "BI", 50],
    ["100BI", "individual", "100 m Bi-palmes", "100 BI", "BI", 100],
    ["200BI", "individual", "200 m Bi-palmes", "200 BI", "BI", 200],
    ["400BI", "individual", "400 m Bi-palmes", "400 BI", "BI", 400],
    ["4X50SF", "relay", "4 x 50 m Surface", "4 x 50 SF", "SF", 50, 4, "mastersOnly"],
    ["4X100SF", "relay", "4 x 100 m Surface", "4 x 100 SF", "SF", 100, 4],
    ["4X200SF", "relay", "4 x 200 m Surface", "4 x 200 SF", "SF", 200, 4],
    ["4X100BI", "relay", "4 x 100 m Bi-palmes mixte", "4 x 100 BI", "BI", 100, 4, "required"],
    ["4X100SB", "relay", "4 x 100 m Surface/Bi-palmes mixte", "4 x 100 SB", "SB", 100, 4, "required"]
  ].map(([code, type, label, shortLabel, discipline, distance, relayLegs, relayMixedRule]) => ({
    code,
    type,
    label,
    shortLabel,
    discipline,
    distance,
    ...(relayLegs ? { relayLegs } : {}),
    ...(relayMixedRule ? { relayMixedRule } : {})
  }));
  const ENGAGEMENT_OPEN_WATER_RELAY_EVENT = {
    code: "OW4X1000SB",
    type: "relay",
    label: "4 x 1000 m Surface/Bi-palmes mixte",
    shortLabel: "4 x 1000 SB",
    discipline: "SB",
    distance: 1000,
    relayLegs: 4,
    relayMixedRule: "required"
  };
  const ENGAGEMENT_OPEN_WATER_DISCIPLINES = [
    ["SF", "Surface"],
    ["BI", "Bi-palmes"],
    ["SUP", "Support"]
  ];
  const ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES = [
    { id: "150-elimination-SF", distance: 150, discipline: "SF", label: "150 m élimination Surface", format: "elimination", active: true },
    { id: "150-elimination-BI", distance: 150, discipline: "BI", label: "150 m élimination Bi-palmes", format: "elimination", active: true },
    { id: "1000-SF", distance: 1000, discipline: "SF", label: "1000 m Surface", format: "standard", active: true },
    { id: "1000-BI", distance: 1000, discipline: "BI", label: "1000 m Bi-palmes", format: "standard", active: true },
    { id: "1000-SUP", distance: 1000, discipline: "SUP", label: "1000 m Support", format: "standard", active: true },
    { id: "2000-SF", distance: 2000, discipline: "SF", label: "2000 m Surface", format: "standard", active: true },
    { id: "2000-BI", distance: 2000, discipline: "BI", label: "2000 m Bi-palmes", format: "standard", active: true },
    { id: "2000-SUP", distance: 2000, discipline: "SUP", label: "2000 m Support", format: "standard", active: true },
    { id: "3000-SF", distance: 3000, discipline: "SF", label: "3000 m Surface", format: "standard", active: true },
    { id: "3000-BI", distance: 3000, discipline: "BI", label: "3000 m Bi-palmes", format: "standard", active: true },
    { id: "3000-SUP", distance: 3000, discipline: "SUP", label: "3000 m Support", format: "standard", active: true },
    { id: "4000-SF", distance: 4000, discipline: "SF", label: "4000 m Surface", format: "standard", active: true },
    { id: "4000-BI", distance: 4000, discipline: "BI", label: "4000 m Bi-palmes", format: "standard", active: true },
    { id: "4000-SUP", distance: 4000, discipline: "SUP", label: "4000 m Support", format: "standard", active: true },
    { id: "5000-SF", distance: 5000, discipline: "SF", label: "5000 m Surface", format: "standard", active: true },
    { id: "5000-BI", distance: 5000, discipline: "BI", label: "5000 m Bi-palmes", format: "standard", active: true },
    { id: "5000-SUP", distance: 5000, discipline: "SUP", label: "5000 m Support", format: "standard", active: true },
    { id: "6000-SF", distance: 6000, discipline: "SF", label: "6000 m Surface", format: "standard", active: true },
    { id: "6000-BI", distance: 6000, discipline: "BI", label: "6000 m Bi-palmes", format: "standard", active: true },
    { id: "6000-SUP", distance: 6000, discipline: "SUP", label: "6000 m Support", format: "standard", active: true }
  ];
  const ENGAGEMENT_EVENT_BY_CODE = new Map(
    [...ENGAGEMENT_EVENT_DEFINITIONS, ENGAGEMENT_OPEN_WATER_RELAY_EVENT].map((event) => [event.code, event])
  );
  const ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS = [
    ["P", "Poussins"],
    ["B", "Benjamins"],
    ["M", "Minimes"],
    ["C", "Cadets"],
    ["J", "Juniors"],
    ["S", "Seniors"],
    ["M30+", "Master 30+"],
    ["M40+", "Master 40+"],
    ["M50+", "Master 50+"],
    ["M60+", "Master 60+"],
    ["M70+", "Master 70+"],
    ["M80+", "Master 80+"]
  ];
  const ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS = [
    ["P", "Poussin"],
    ["B", "Benjamin"],
    ["M", "Minime"],
    ["C", "Cadet"],
    ["J", "Junior"],
    ["S", "Senior"],
    ["R140", "Relais R140"],
    ["R180", "Relais R180"],
    ["R220", "Relais R220"],
    ["R260", "Relais R260"]
  ];
  const ENGAGEMENT_RELAY_AGE_CATEGORY_RANK = {
    P: 0,
    B: 1,
    M: 2,
    C: 3,
    J: 4,
    S: 5
  };
  const ENGAGEMENT_CATEGORY_DEFINITIONS = Array.from(new Map([
    ...ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS,
    ...ENGAGEMENT_RELAY_CATEGORY_DEFINITIONS
  ]));
  const ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = {
    "50AP": new Set(["P", "B", "M"])
  };

  /* extracted-function: assets/portal/navigation.js#engagementCompetitionType */

  /* extracted-function: assets/portal/navigation.js#engagementCompetitionTypeLabel */

  /* extracted-function: assets/portal/navigation.js#publicCalendarPublicationLabel */

  /* extracted-function: assets/portal/navigation.js#engagementWaterBodyTypeLabel */

  /* extracted-function: assets/portal/navigation.js#engagementOpenWaterEventCode */

  /* extracted-function: assets/portal/navigation.js#engagementOpenWaterEventDefinitions */

  /* extracted-function: assets/portal/navigation.js#engagementEventDefinitionsForCompetition */

  /* extracted-function: assets/portal/navigation.js#engagementEventDefinition */
  const ENGAGEMENT_PROGRAM_GENDER_MODES = [
    ["female", "Femmes"],
    ["male", "Hommes"],
    ["mixed", "F/H ensemble"]
  ];
  const ENGAGEMENT_PROGRAM_GENDER_MODE_LABELS = Object.fromEntries(ENGAGEMENT_PROGRAM_GENDER_MODES);
  const ENGAGEMENT_PROGRAM_PHASE_LABELS = {
    direct: "Course directe",
    heats: "Séries",
    final: "Finale(s)",
    slowHeats: "Séries lentes",
    fastHeat: "Série rapide"
  };
  const ENGAGEMENT_PROGRAM_FORMATS = [
    ["direct", "Course directe"],
    ["heatsFinal", "Séries + finale(s)"],
    ["slowFast", "Séries lentes / série rapide"]
  ];
  const ENGAGEMENT_PROGRAM_FORMAT_LABELS = Object.fromEntries(ENGAGEMENT_PROGRAM_FORMATS);
  const ENGAGEMENT_OPEN_WATER_ELIMINATION_PROGRAM_FORMATS = ENGAGEMENT_PROGRAM_FORMATS.filter(([format]) => format === "direct" || format === "heatsFinal");
  const LIVEPALMES_REGION_DEFINITIONS = [
    "Hauts de France",
    "Normandie",
    "Ile de France",
    "Grand Est",
    "Bretagne Pays de la Loire",
    "Centre",
    "Nouvelle Aquitaine",
    "Pyr\u00e9n\u00e9es M\u00e9diterran\u00e9e Occitanie",
    "Corse",
    "Sud",
    "Auvergne Rh\u00f4ne Alpes",
    "Bourgogne Franche Comt\u00e9",
    "R\u00e9union",
    "Guadeloupe",
    "Martinique Guyane",
    "Nouvelle Cal\u00e9donie",
    "Polyn\u00e9sie"
  ];
  const LIVEPALMES_REFERENCE_REGION_LABELS = {
    "1": "Grand Est",
    "2": "Nouvelle Aquitaine",
    "3": "Ile de France",
    "6": "Bretagne Pays de la Loire",
    "8": "Centre",
    "9": "Guadeloupe",
    "10": "Pyr\u00e9n\u00e9es M\u00e9diterran\u00e9e Occitanie",
    "11": "Martinique Guyane",
    "12": "Corse",
    "13": "Hauts de France",
    "15": "Normandie",
    "16": "Sud",
    "17": "Auvergne Rh\u00f4ne Alpes",
    "18": "R\u00e9union",
    "22": "Bourgogne Franche Comt\u00e9"
  };
  const ENGAGEMENT_ROUTE_BY_HASH = Object.freeze({
    "#club-competitions": { entry: "club", tab: "calendar" },
    "#club-nageurs": { entry: "clubSwimmers", tab: "clubSwimmers" },
    "#club-officiels": { entry: "clubPeople", tab: "clubPeople" },
    "#competitions-calendrier": { entry: "adminCalendar", tab: "calendar" },
    "#competitions-creation": { entry: "adminCalendar", tab: "calendar" },
    "#competitions-demandes-acces": { entry: "adminAccessRequests", tab: "accessRequests" },
    "#gestion-demandes-acces": { entry: "adminAccessRequests", tab: "accessRequests" },
    "#administration-suppressions": { entry: "adminDeletionRequests", tab: "deletionRequests", nationalTab: "deletions" },
    "#administration-clubs": { entry: "adminDeletionRequests", tab: "deletionRequests", nationalTab: "clubs" },
    "#administration-licences": { entry: "adminDeletionRequests", tab: "deletionRequests", nationalTab: "licenses" },
    "#administration-doublons-nageurs": { entry: "adminDeletionRequests", tab: "deletionRequests", nationalTab: "swimmers" },
    "#administration-officiels": { entry: "adminDeletionRequests", tab: "deletionRequests", nationalTab: "people" },
    "#administration-comptes": { entry: "adminDeletionRequests", tab: "deletionRequests", nationalTab: "deletions" },
    "#administration-historique": { entry: "adminAudit", tab: "deletionRequests", nationalTab: "audit" }
  });
  const ENGAGEMENT_NATIONAL_HASH_BY_TAB = Object.freeze({
    deletions: "#administration-suppressions",
    clubs: "#administration-clubs",
    licenses: "#administration-licences",
    swimmers: "#administration-doublons-nageurs",
    people: "#administration-officiels",
    audit: "#administration-historique"
  });

  const elements = {
    dashboard: document.querySelector("#adminPortalDashboard"),
    email: document.querySelector("#adminPortalEmail"),
    form: document.querySelector("#adminPortalLoginForm"),
    message: document.querySelector("#adminPortalMessage"),
    password: document.querySelector("#adminPortalPassword"),
    passwordToggle: document.querySelector("#adminPortalPasswordToggle"),
    reset: document.querySelector("#adminPortalResetButton"),
    publicAccessRequestForm: document.querySelector("#adminPublicAccessRequestForm"),
    publicAccessRequestFirstName: document.querySelector("#adminPublicAccessRequestFirstName"),
    publicAccessRequestLastName: document.querySelector("#adminPublicAccessRequestLastName"),
    publicAccessRequestEmail: document.querySelector("#adminPublicAccessRequestEmail"),
    publicAccessRequestLicenseNumber: document.querySelector("#adminPublicAccessRequestLicenseNumber"),
    publicAccessRequestWebsite: document.querySelector("#adminPublicAccessRequestWebsite"),
    publicAccessRequestRegionId: document.querySelector("#adminPublicAccessRequestRegionId"),
    publicAccessRequestClubSelect: document.querySelector("#adminPublicAccessRequestClubSelect"),
    publicAccessRequestClubName: document.querySelector("#adminPublicAccessRequestClubName"),
    publicAccessRequestClubId: document.querySelector("#adminPublicAccessRequestClubId"),
    publicAccessRequestNewClub: document.querySelector("#adminPublicAccessRequestNewClub"),
    publicAccessRequestNewClubFields: document.querySelector("#adminPublicAccessRequestNewClubFields"),
    publicAccessRequestNewClubName: document.querySelector("#adminPublicAccessRequestNewClubName"),
    publicAccessRequestNewClubCode: document.querySelector("#adminPublicAccessRequestNewClubCode"),
    publicAccessRequestNewClubFederalNumber: document.querySelector("#adminPublicAccessRequestNewClubFederalNumber"),
    publicAccessRequestNewClubCity: document.querySelector("#adminPublicAccessRequestNewClubCity"),
    publicAccessRequestNewClubPostalCode: document.querySelector("#adminPublicAccessRequestNewClubPostalCode"),
    publicAccessRequestNewClubMatch: document.querySelector("#adminPublicAccessRequestNewClubMatch"),
    scopeContext: document.querySelector("#adminPortalScopeContext"),
    scopeClubButton: document.querySelector("#adminPortalScopeClubButton"),
    scopeClubPrefix: document.querySelector("#adminPortalScopeClubPrefix"),
    scopeClubCode: document.querySelector("#adminPortalScopeClubCode"),
    scopeRole: document.querySelector("#adminPortalScopeRole"),
    scopeRoleLong: document.querySelector("#adminPortalScopeRoleLong"),
    clubSwitchDialog: document.querySelector("#adminPortalClubSwitchDialog"),
    clubSwitchClose: document.querySelector("#adminPortalClubSwitchClose"),
    clubSwitchSearch: document.querySelector("#adminPortalClubSwitchSearch"),
    clubSwitchResults: document.querySelector("#adminPortalClubSwitchResults"),
    clubSwitchStatus: document.querySelector("#adminPortalClubSwitchStatus"),
    clubSwitchReset: document.querySelector("#adminPortalClubSwitchReset"),
    accountClubCode: document.querySelector("#adminPortalAccountClubCode"),
    publicAccessRequestText: document.querySelector("#adminPublicAccessRequestText"),
    publicAccessRequestMessage: document.querySelector("#adminPublicAccessRequestMessage"),
    sessionLabel: document.querySelector("#adminPortalSessionLabel"),
    signOut: document.querySelector("#adminPortalSignOutButton"),
    accountControl: document.querySelector("#adminPortalAccount"),
    accountToggle: document.querySelector("#adminPortalAccountToggle"),
    accountActions: document.querySelector("#adminPortalAccountActions"),
    accountClubSwitch: document.querySelector("#adminPortalAccountClubSwitch"),
    navToggle: document.querySelector("#adminPortalNavToggle"),
    navCurrent: document.querySelector("#adminPortalNavCurrent"),
    homeLink: document.querySelector("#adminPortalHomeLink"),
    homeLabel: document.querySelector("#adminPortalHomeLabel"),
    navigation: document.querySelector("#adminPortalNavigation"),
    sidebar: document.querySelector(".admin-portal-sidebar"),
    navPin: document.querySelector("#adminPortalNavPin"),
    clubMenu: document.querySelector("[data-engagements-club-menu]"),
    clubToggle: document.querySelector("#adminPortalClubToggle"),
    clubSubmenu: document.querySelector("#adminPortalClubSubmenu"),
    performanceMenu: document.querySelector("[data-admin-performance-menu]"),
    performanceToggle: document.querySelector("#adminPortalPerformanceToggle"),
    performanceSubmenu: document.querySelector("#adminPortalPerformanceSubmenu"),
    engagementsAdminMenu: document.querySelector("[data-engagements-admin-nav]"),
    engagementsAdminToggle: document.querySelector("#adminPortalEngagementsToggle"),
    engagementsAdminSubmenu: document.querySelector("#adminPortalEngagementsSubmenu"),
    dtnMenu: document.querySelector("[data-admin-dtn-menu]"),
    dtnToggle: document.querySelector("#adminPortalDtnToggle"),
    dtnSubmenu: document.querySelector("#adminPortalDtnSubmenu"),
    nationalMenu: document.querySelector("[data-engagements-national-menu]"),
    nationalToggle: document.querySelector("#adminPortalNationalToggle"),
    nationalSubmenu: document.querySelector("#adminPortalNationalSubmenu"),
    accessMenu: document.querySelector("[data-access-management-nav]"),
    accessToggle: document.querySelector("#adminPortalAccessToggle"),
    accessSubmenu: document.querySelector("#adminPortalAccessSubmenu"),
    nationalPendingBadges: document.querySelectorAll("#adminPortalNationalPendingBadge, #adminOverviewNationalPendingBadge, #adminEngagementsDeletionRequestsBadge"),
    accessPendingBadges: document.querySelectorAll("#adminPortalAccessPendingBadge, #adminOverviewAccessPendingBadge, #adminAccessHomePendingBadge, #adminEngagementsAccessRequestsBadge"),
    engagementsHomeLinks: document.querySelectorAll("[data-engagements-home-entry]"),
    nationalOverviewCounts: document.querySelector("#adminNationalOverviewCounts"),
    nationalOverviewPendingCount: document.querySelector("#adminNationalOverviewPendingCount"),
    nationalOverviewPendingBreakdown: document.querySelector("#adminNationalOverviewPendingBreakdown"),
    overviewSpaceToggles: document.querySelectorAll(".admin-overview-space-toggle"),
    accessForm: document.querySelector("#adminAccessForm"),
    accessMessage: document.querySelector("#adminAccessMessage"),
    accessList: document.querySelector("#adminAccessList"),
    accessCount: document.querySelector("#adminAccessCount"),
    accessPanel: document.querySelector("#adminAccessPanel"),
    accessDialogTitle: document.querySelector("#adminAccessDialogTitle"),
    accessDialogClose: document.querySelector("#adminAccessDialogClose"),
    accessAdd: document.querySelector("#adminAccessAddButton"),
    accessRegionId: document.querySelector("#adminAccessRegionId"),
    accessClubSelect: document.querySelector("#adminAccessClubSelect"),
    accessClubName: document.querySelector("#adminAccessClubName"),
    accessClubId: document.querySelector("#adminAccessClubId"),
    accessFilters: document.querySelector("#adminAccessFilters"),
    accessSearch: document.querySelector("#adminAccessSearch"),
    accessStatusFilter: document.querySelector("#adminAccessStatusFilter"),
    accessCapabilityFilter: document.querySelector("#adminAccessCapabilityFilter"),
    accessClearFilters: document.querySelector("#adminAccessClearFilters"),
    accessAlphabet: document.querySelector("#adminAccessAlphabet"),
    accessPagination: document.querySelector("#adminAccessPagination"),
    accessPreviousPage: document.querySelector("#adminAccessPreviousPage"),
    accessNextPage: document.querySelector("#adminAccessNextPage"),
    accessPageLabel: document.querySelector("#adminAccessPageLabel"),
    accessDeletionRequestsPanel: document.querySelector("#adminAccessDeletionRequestsPanel"),
    accessDeletionRequestsRefresh: document.querySelector("#adminAccessDeletionRequestsRefresh"),
    accessDeletionRequestsStatus: document.querySelector("#adminAccessDeletionRequestsStatus"),
    accessDeletionRequestsList: document.querySelector("#adminAccessDeletionRequestsList"),
    cancelEdit: document.querySelector("#adminAccessCancelEdit"),
    accountEmailForm: document.querySelector("#adminAccountEmailForm"),
    accountEmail: document.querySelector("#adminAccountEmail"),
    accountEmailPassword: document.querySelector("#adminAccountEmailPassword"),
    accountEmailMessage: document.querySelector("#adminAccountEmailMessage"),
    accountNotificationsForm: document.querySelector("#adminAccountNotificationsForm"),
    accountCompetitionNotifications: document.querySelector("#adminAccountCompetitionNotifications"),
    accountCompetitionNotificationsState: document.querySelector("#adminAccountCompetitionNotificationsState"),
    accountNotificationsSummary: document.querySelector("#adminAccountNotificationsSummary"),
    accountNotificationsMessage: document.querySelector("#adminAccountNotificationsMessage"),
    accountPasswordForm: document.querySelector("#adminAccountPasswordForm"),
    accountEmailDetails: document.querySelector("#adminAccountEmailDetails"),
    accountNotificationsDetails: document.querySelector("#adminAccountNotificationsDetails"),
    accountPasswordDetails: document.querySelector("#adminAccountPasswordDetails"),
    accountCurrentPassword: document.querySelector("#adminAccountCurrentPassword"),
    accountNewPassword: document.querySelector("#adminAccountNewPassword"),
    accountConfirmPassword: document.querySelector("#adminAccountConfirmPassword"),
    accountPasswordMessage: document.querySelector("#adminAccountPasswordMessage"),
    accountFullName: document.querySelector("#adminAccountFullName"),
    accountIdentityEmail: document.querySelector("#adminAccountIdentityEmail"),
    accountEmailSummary: document.querySelector("#adminAccountEmailSummary"),
    accountLicenseMeta: document.querySelector("#adminAccountLicenseMeta"),
    accountLicenseNumber: document.querySelector("#adminAccountLicenseNumber"),
    accountScopeSentence: document.querySelector("#adminAccountScopeSentence"),
    accountCapabilities: document.querySelector("#adminAccountCapabilities"),
    recordModuleStatus: document.querySelector("#adminRecordModuleStatus"),
    performanceStyles: document.querySelector("#adminPerformanceStyles"),
    recordWorkbench: document.querySelector("#adminWorkbench"),
    importModuleStatus: document.querySelector("#adminImportModuleStatus"),
    importStyles: document.querySelector("#adminImportStyles"),
    importWorkbench: document.querySelector("#importWorkbench"),
    correctionModuleStatus: document.querySelector("#adminCorrectionModuleStatus"),
    correctionWorkbench: document.querySelector("#correctionWorkbench"),
    engagementsView: document.querySelector("#adminEngagementsView"),
    engagementsViewTitle: document.querySelector("#adminEngagementsViewTitle"),
    engagementsViewEyebrow: document.querySelector("#adminEngagementsViewEyebrow"),
    engagementsViewDescription: document.querySelector("#adminEngagementsViewDescription"),
    engagementsDetailDeadline: document.querySelector("#adminEngagementsDetailDeadline"),
    engagementsClubContext: document.querySelector("#adminEngagementsClubContext"),
    engagementsClubContextName: document.querySelector("#adminEngagementsClubContextName"),
    engagementsTabButtons: document.querySelectorAll("[data-engagements-tab-button]"),
    engagementsTabPanels: document.querySelectorAll("[data-engagements-tab-panel]"),
    engagementsDetailTabButtons: document.querySelectorAll("[data-engagements-detail-tab-button]"),
    engagementsDetailTabPanels: document.querySelectorAll("[data-engagements-detail-tab-panel]"),
    engagementsDetailStepButtons: document.querySelectorAll("[data-engagement-step-button]"),
    engagementsDetailTabGroups: document.querySelectorAll("[data-engagement-step-group]"),
    engagementsSaveState: document.querySelector("#adminEngagementsSaveState"),
    engagementsStatus: document.querySelector("#adminEngagementsStatus"),
    engagementsCalendarActions: document.querySelector("#adminEngagementsCalendarActions"),
    engagementsCreateOpen: document.querySelector("#adminEngagementsCreateOpen"),
    engagementsCreateDialog: document.querySelector("#adminEngagementsCreateDialog"),
    engagementsCreateDialogClose: document.querySelector("#adminEngagementsCreateDialogClose"),
    engagementsCalendarPanel: document.querySelector("#adminEngagementsCalendarPanel"),
    engagementsCalendarCard: document.querySelector("#adminEngagementsCalendarCard"),
    engagementsCalendarFilters: document.querySelector("#adminEngagementsCalendarFilters"),
    engagementsSeasonFilter: document.querySelector("#adminEngagementsSeasonFilter"),
    engagementsRegionFilter: document.querySelector("#adminEngagementsRegionFilter"),
    engagementsLevelFilter: document.querySelector("#adminEngagementsLevelFilter"),
    engagementsTypeFilter: document.querySelector("#adminEngagementsTypeFilter"),
    engagementsStatusFilter: document.querySelector("#adminEngagementsStatusFilter"),
    engagementsStatusFilterLabel: document.querySelector("#adminEngagementsStatusFilterLabel"),
    engagementsStatusSegments: document.querySelector("#adminEngagementsStatusSegments"),
    engagementsStatusSegmentButtons: document.querySelectorAll("[data-engagement-status]"),
    engagementsAdvancedFilters: document.querySelector("#adminEngagementsAdvancedFilters"),
    engagementsMineFilterLabel: document.querySelector("#adminEngagementsMineFilterLabel"),
    engagementsMineFilter: document.querySelector("#adminEngagementsMineFilter"),
    engagementsFiltersReset: document.querySelector("#adminEngagementsFiltersReset"),
    engagementsCalendarList: document.querySelector("#adminEngagementsCalendarList"),
    engagementsClubPeoplePanel: document.querySelector("#adminEngagementsClubPeoplePanel"),
    engagementsClubPeopleActions: document.querySelector("#adminEngagementsClubPeopleActions"),
    engagementsClubPeopleAddButton: document.querySelector("#adminEngagementsClubPeopleAddButton"),
    engagementsClubPeopleLoadMore: document.querySelector("#adminEngagementsClubPeopleLoadMore"),
    engagementsClubPeopleStatus: document.querySelector("#adminEngagementsClubPeopleStatus"),
    engagementsClubPeopleRetry: document.querySelector("#adminEngagementsClubPeopleRetry"),
    engagementsClubPersonForm: document.querySelector("#adminEngagementsClubPersonForm"),
    engagementsClubPersonId: document.querySelector("#adminEngagementsClubPersonId"),
    engagementsClubPersonSwimmerId: document.querySelector("#adminEngagementsClubPersonSwimmerId"),
    engagementsClubPersonSwimmerSource: document.querySelector("#adminEngagementsClubPersonSwimmerSource"),
    engagementsClubPersonSwimmerSearch: document.querySelector("#adminEngagementsClubPersonSwimmerSearch"),
    engagementsClubPersonSwimmerResults: document.querySelector("#adminEngagementsClubPersonSwimmerResults"),
    engagementsClubPersonFirstName: document.querySelector("#adminEngagementsClubPersonFirstName"),
    engagementsClubPersonLastName: document.querySelector("#adminEngagementsClubPersonLastName"),
    engagementsClubPersonBirthDate: document.querySelector("#adminEngagementsClubPersonBirthDate"),
    engagementsClubPersonSex: document.querySelector("#adminEngagementsClubPersonSex"),
    engagementsClubPersonLicense: document.querySelector("#adminEngagementsClubPersonLicense"),
    engagementsClubPersonRoleTeamLeader: document.querySelector("#adminEngagementsClubPersonRoleTeamLeader"),
    engagementsClubPersonRoleOfficial: document.querySelector("#adminEngagementsClubPersonRoleOfficial"),
    engagementsClubPersonCancel: document.querySelector("#adminEngagementsClubPersonCancel"),
    engagementsClubPersonDialog: document.querySelector("#adminEngagementsClubPersonDialog"),
    engagementsClubPersonMessage: document.querySelector("#adminEngagementsClubPersonMessage"),
    engagementsClubPeopleList: document.querySelector("#adminEngagementsClubPeopleList"),
    engagementsClubSwimmersPanel: document.querySelector("#adminEngagementsClubSwimmersPanel"),
    engagementsClubSwimmersDirectorySearch: document.querySelector("#adminEngagementsClubSwimmersDirectorySearch"),
    engagementsClubSwimmersDirectorySearchClear: document.querySelector("#adminEngagementsClubSwimmersDirectorySearchClear"),
    engagementsClubSwimmersDirectorySexFilter: document.querySelector("#adminEngagementsClubSwimmersDirectorySexFilter"),
    engagementsClubSwimmersDirectoryStatus: document.querySelector("#adminEngagementsClubSwimmersDirectoryStatus"),
    engagementsClubSwimmersDirectoryList: document.querySelector("#adminEngagementsClubSwimmersDirectoryList"),
    engagementsDeletionRequestsNav: document.querySelector("#adminEngagementsDeletionRequestsNav"),
    engagementsDeletionRequestsBadge: document.querySelector("#adminEngagementsDeletionRequestsBadge"),
    engagementsAccessRequestsBadge: document.querySelector("#adminEngagementsAccessRequestsBadge"),
    engagementsAccessRequestsStatus: document.querySelector("#adminEngagementsAccessRequestsStatus"),
    engagementsAccessRequestsList: document.querySelector("#adminEngagementsAccessRequestsList"),
    engagementsAccessRequestEditDialog: document.querySelector("#adminEngagementsAccessRequestEditDialog"),
    engagementsAccessRequestEditForm: document.querySelector("#adminEngagementsAccessRequestEditForm"),
    engagementsAccessRequestEditTitle: document.querySelector("#adminEngagementsAccessRequestEditTitle"),
    engagementsAccessRequestEditId: document.querySelector("#adminEngagementsAccessRequestEditId"),
    engagementsAccessRequestEditFirstName: document.querySelector("#adminEngagementsAccessRequestEditFirstName"),
    engagementsAccessRequestEditLastName: document.querySelector("#adminEngagementsAccessRequestEditLastName"),
    engagementsAccessRequestEditEmail: document.querySelector("#adminEngagementsAccessRequestEditEmail"),
    engagementsAccessRequestEditLicenseNumber: document.querySelector("#adminEngagementsAccessRequestEditLicenseNumber"),
    engagementsAccessRequestEditRegionId: document.querySelector("#adminEngagementsAccessRequestEditRegionId"),
    engagementsAccessRequestEditClubSelect: document.querySelector("#adminEngagementsAccessRequestEditClubSelect"),
    engagementsAccessRequestEditClubName: document.querySelector("#adminEngagementsAccessRequestEditClubName"),
    engagementsAccessRequestEditClubId: document.querySelector("#adminEngagementsAccessRequestEditClubId"),
    engagementsAccessRequestEditNewClubFields: document.querySelector("#adminEngagementsAccessRequestEditNewClubFields"),
    engagementsAccessRequestEditNewClubName: document.querySelector("#adminEngagementsAccessRequestEditNewClubName"),
    engagementsAccessRequestEditNewClubCode: document.querySelector("#adminEngagementsAccessRequestEditNewClubCode"),
    engagementsAccessRequestEditNewClubFederalNumber: document.querySelector("#adminEngagementsAccessRequestEditNewClubFederalNumber"),
    engagementsAccessRequestEditNewClubCity: document.querySelector("#adminEngagementsAccessRequestEditNewClubCity"),
    engagementsAccessRequestEditNewClubPostalCode: document.querySelector("#adminEngagementsAccessRequestEditNewClubPostalCode"),
    engagementsAccessRequestEditCancel: document.querySelector("#adminEngagementsAccessRequestEditCancel"),
    engagementsAccessRequestEditMessage: document.querySelector("#adminEngagementsAccessRequestEditMessage"),
    engagementsAccessRequestRejectDialog: document.querySelector("#adminEngagementsAccessRequestRejectDialog"),
    engagementsAccessRequestRejectForm: document.querySelector("#adminEngagementsAccessRequestRejectForm"),
    engagementsAccessRequestRejectId: document.querySelector("#adminEngagementsAccessRequestRejectId"),
    engagementsAccessRequestRejectReason: document.querySelector("#adminEngagementsAccessRequestRejectReason"),
    engagementsAccessRequestRejectCancel: document.querySelector("#adminEngagementsAccessRequestRejectCancel"),
    engagementsAccessRequestRejectMessage: document.querySelector("#adminEngagementsAccessRequestRejectMessage"),
    engagementsDeletionRequestsPanel: document.querySelector("#adminEngagementsDeletionRequestsPanel"),
    engagementsNationalTabButtons: document.querySelectorAll("[data-engagements-national-tab-button]"),
    engagementsNationalPanels: document.querySelectorAll("[data-engagements-national-panel]"),
    engagementsNationalClubsSearch: document.querySelector("#adminEngagementsNationalClubsSearch"),
    engagementsNationalClubsStatusFilter: document.querySelector("#adminEngagementsNationalClubsStatusFilter"),
    engagementsNationalClubsRegionFilter: document.querySelector("#adminEngagementsNationalClubsRegionFilter"),
    engagementsNationalClubsCreate: document.querySelector("#adminEngagementsNationalClubsCreate"),
    engagementsNationalClubsReset: document.querySelector("#adminEngagementsNationalClubsReset"),
    engagementsNationalClubsStatus: document.querySelector("#adminEngagementsNationalClubsStatus"),
    engagementsNationalClubsList: document.querySelector("#adminEngagementsNationalClubsList"),
    engagementsNationalClubDialog: document.querySelector("#adminEngagementsNationalClubDialog"),
    engagementsNationalClubForm: document.querySelector("#adminEngagementsNationalClubForm"),
    engagementsNationalClubDialogTitle: document.querySelector("#adminEngagementsNationalClubDialogTitle"),
    engagementsNationalClubClose: document.querySelector("#adminEngagementsNationalClubClose"),
    engagementsNationalClubCancel: document.querySelector("#adminEngagementsNationalClubCancel"),
    engagementsNationalClubDelete: document.querySelector("#adminEngagementsNationalClubDelete"),
    engagementsNationalClubId: document.querySelector("#adminEngagementsNationalClubId"),
    engagementsNationalClubFederalNumber: document.querySelector("#adminEngagementsNationalClubFederalNumber"),
    engagementsNationalClubCode: document.querySelector("#adminEngagementsNationalClubCode"),
    engagementsNationalClubName: document.querySelector("#adminEngagementsNationalClubName"),
    engagementsNationalClubRegion: document.querySelector("#adminEngagementsNationalClubRegion"),
    engagementsNationalClubCity: document.querySelector("#adminEngagementsNationalClubCity"),
    engagementsNationalClubPostalCode: document.querySelector("#adminEngagementsNationalClubPostalCode"),
    engagementsNationalClubActive: document.querySelector("#adminEngagementsNationalClubActive"),
    engagementsNationalClubMessage: document.querySelector("#adminEngagementsNationalClubMessage"),
    engagementsDeletionRequestsRefresh: document.querySelector("#adminEngagementsDeletionRequestsRefresh"),
    engagementsDeletionRequestsGroup: document.querySelector("#adminEngagementsDeletionRequestsGroup"),
    engagementsDeletionRequestsCount: document.querySelector("#adminEngagementsDeletionRequestsCount"),
    nationalRequestsEmpty: document.querySelector("#adminNationalRequestsEmpty"),
    engagementsDeletionRequestsStatus: document.querySelector("#adminEngagementsDeletionRequestsStatus"),
    engagementsDeletionRequestsList: document.querySelector("#adminEngagementsDeletionRequestsList"),
    engagementsNationalSwimmersRefresh: document.querySelector("#adminEngagementsNationalSwimmersRefresh"),
    engagementsNationalSwimmersStatus: document.querySelector("#adminEngagementsNationalSwimmersStatus"),
    engagementsNationalSwimmersSearch: document.querySelector("#adminEngagementsNationalSwimmersSearch"),
    engagementsNationalSwimmersStatusFilter: document.querySelector("#adminEngagementsNationalSwimmersStatusFilter"),
    engagementsNationalSwimmersReset: document.querySelector("#adminEngagementsNationalSwimmersReset"),
    engagementsNationalSwimmersMergeMode: document.querySelector("#adminEngagementsNationalSwimmersMergeMode"),
    engagementsNationalSwimmersBulk: document.querySelector("[data-engagement-national-swimmer-bulk]"),
    engagementsNationalSwimmersBulkMerge: document.querySelector("#adminEngagementsNationalSwimmersBulkMerge"),
    engagementsNationalSwimmersSelectionSummary: document.querySelector("#adminEngagementsNationalSwimmersSelectionSummary"),
    engagementsNationalSwimmersList: document.querySelector("#adminEngagementsNationalSwimmersList"),
    engagementsSwimmerChangeRequestsBadge: document.querySelector("#adminEngagementsSwimmerChangeRequestsBadge"),
    engagementsSwimmerChangeRequests: document.querySelector("#adminEngagementsSwimmerChangeRequests"),
    engagementsSwimmerChangeRequestsCount: document.querySelector("#adminEngagementsSwimmerChangeRequestsCount"),
    engagementsSwimmerChangeRequestsStatus: document.querySelector("#adminEngagementsSwimmerChangeRequestsStatus"),
    engagementsSwimmerChangeRequestsList: document.querySelector("#adminEngagementsSwimmerChangeRequestsList"),
    engagementsSwimmerCorrectionDialog: document.querySelector("#adminEngagementsSwimmerCorrectionDialog"),
    engagementsSwimmerCorrectionForm: document.querySelector("#adminEngagementsSwimmerCorrectionForm"),
    engagementsSwimmerCorrectionTitle: document.querySelector("#adminEngagementsSwimmerCorrectionTitle"),
    engagementsSwimmerCorrectionContext: document.querySelector("#adminEngagementsSwimmerCorrectionContext"),
    engagementsSwimmerCorrectionClose: document.querySelector("#adminEngagementsSwimmerCorrectionClose"),
    engagementsSwimmerCorrectionCancel: document.querySelector("#adminEngagementsSwimmerCorrectionCancel"),
    engagementsSwimmerCorrectionSubmit: document.querySelector("#adminEngagementsSwimmerCorrectionSubmit"),
    engagementsSwimmerCorrectionMode: document.querySelector("#adminEngagementsSwimmerCorrectionMode"),
    engagementsSwimmerCorrectionSource: document.querySelector("#adminEngagementsSwimmerCorrectionSource"),
    engagementsSwimmerCorrectionId: document.querySelector("#adminEngagementsSwimmerCorrectionId"),
    engagementsSwimmerCorrectionIdentityKey: document.querySelector("#adminEngagementsSwimmerCorrectionIdentityKey"),
    engagementsSwimmerCorrectionLastName: document.querySelector("#adminEngagementsSwimmerCorrectionLastName"),
    engagementsSwimmerCorrectionFirstName: document.querySelector("#adminEngagementsSwimmerCorrectionFirstName"),
    engagementsSwimmerCorrectionBirthDate: document.querySelector("#adminEngagementsSwimmerCorrectionBirthDate"),
    engagementsSwimmerCorrectionSex: document.querySelector("#adminEngagementsSwimmerCorrectionSex"),
    engagementsSwimmerCorrectionClub: document.querySelector("#adminEngagementsSwimmerCorrectionClub"),
    engagementsSwimmerCorrectionLicense: document.querySelector("#adminEngagementsSwimmerCorrectionLicense"),
    engagementsSwimmerCorrectionReasonLabel: document.querySelector("#adminEngagementsSwimmerCorrectionReasonLabel"),
    engagementsSwimmerCorrectionReason: document.querySelector("#adminEngagementsSwimmerCorrectionReason"),
    engagementsSwimmerCorrectionMessage: document.querySelector("#adminEngagementsSwimmerCorrectionMessage"),
    engagementsNationalPeopleMore: document.querySelector("#adminEngagementsNationalPeopleMore"),
    engagementsNationalPeopleRefresh: document.querySelector("#adminEngagementsNationalPeopleRefresh"),
    engagementsNationalPeopleStatus: document.querySelector("#adminEngagementsNationalPeopleStatus"),
    engagementsNationalPeopleSearch: document.querySelector("#adminEngagementsNationalPeopleSearch"),
    engagementsNationalPeopleStatusFilter: document.querySelector("#adminEngagementsNationalPeopleStatusFilter"),
    engagementsNationalPeopleReset: document.querySelector("#adminEngagementsNationalPeopleReset"),
    engagementsNationalPeopleMergeMode: document.querySelector("#adminEngagementsNationalPeopleMergeMode"),
    engagementsNationalPeopleBulk: document.querySelector("[data-engagement-national-people-bulk]"),
    engagementsNationalPeopleBulkMerge: document.querySelector("#adminEngagementsNationalPeopleBulkMerge"),
    engagementsNationalPeopleSelectionSummary: document.querySelector("#adminEngagementsNationalPeopleSelectionSummary"),
    engagementsNationalPeopleList: document.querySelector("#adminEngagementsNationalPeopleList"),
    engagementsNationalAccountsRefresh: document.querySelector("#adminEngagementsNationalAccountsRefresh"),
    engagementsNationalAccountsGroup: document.querySelector("#adminEngagementsNationalAccountsGroup"),
    engagementsNationalAccountsCount: document.querySelector("#adminEngagementsNationalAccountsCount"),
    engagementsNationalAccountsStatus: document.querySelector("#adminEngagementsNationalAccountsStatus"),
    engagementsNationalAccountsList: document.querySelector("#adminEngagementsNationalAccountsList"),
    engagementsNationalAuditRefresh: document.querySelector("#adminEngagementsNationalAuditRefresh"),
    engagementsNationalAuditSearch: document.querySelector("#adminEngagementsNationalAuditSearch"),
    engagementsNationalAuditPeriod: document.querySelector("#adminEngagementsNationalAuditPeriod"),
    engagementsNationalAuditClub: document.querySelector("#adminEngagementsNationalAuditClub"),
    engagementsNationalAuditActor: document.querySelector("#adminEngagementsNationalAuditActor"),
    engagementsNationalAuditActorSearch: document.querySelector("#adminEngagementsNationalAuditActorSearch"),
    engagementsNationalAuditActorSelected: document.querySelector("#adminEngagementsNationalAuditActorSelected"),
    engagementsNationalAuditActorOptions: document.querySelector("#adminEngagementsNationalAuditActorOptions"),
    engagementsNationalAuditType: document.querySelector("#adminEngagementsNationalAuditType"),
    engagementsNationalAuditOrigin: document.querySelector("#adminEngagementsNationalAuditOrigin"),
    engagementsNationalAuditReset: document.querySelector("#adminEngagementsNationalAuditReset"),
    engagementsNationalAuditStatus: document.querySelector("#adminEngagementsNationalAuditStatus"),
    engagementsNationalAuditList: document.querySelector("#adminEngagementsNationalAuditList"),
    engagementsNationalAuditLoadMore: document.querySelector("#adminEngagementsNationalAuditLoadMore"),
    engagementsDetail: document.querySelector("#adminEngagementsDetail"),
    engagementsDetailEyebrow: document.querySelector("#adminEngagementsDetailEyebrow"),
    engagementsDetailTitle: document.querySelector("#adminEngagementsDetailTitle"),
    engagementsDetailSubtitle: document.querySelector("#adminEngagementsDetailSubtitle"),
    engagementsEditState: document.querySelector("#adminEngagementsEditState"),
    engagementsDetailEntryStatus: document.querySelector("#adminEngagementsDetailEntryStatus"),
    engagementsDetailLevel: document.querySelector("#adminEngagementsDetailLevel"),
    engagementsCancellationAlert: document.querySelector("#adminEngagementsCancellationAlert"),
    engagementsDetailMeta: document.querySelector("#adminEngagementsDetailMeta"),
    engagementsPublicInfo: document.querySelector("#adminEngagementsPublicInfo"),
    engagementsPublicInfoTitle: document.querySelector("#adminEngagementsPublicInfoTitle"),
    engagementsPublicInfoText: document.querySelector("#adminEngagementsPublicInfoText"),
    engagementsDetailList: document.querySelector("#adminEngagementsDetailList"),
    engagementsDetailStatus: document.querySelector("#adminEngagementsDetailStatus"),
    engagementsDetailRetry: document.querySelector("#adminEngagementsDetailRetry"),
    engagementsDetailClose: document.querySelector("#adminEngagementsDetailClose"),
    engagementsUnsavedDialog: document.querySelector("#adminEngagementsUnsavedDialog"),
    engagementsUnsavedSave: document.querySelector("#adminEngagementsUnsavedSave"),
    engagementsUnsavedDiscard: document.querySelector("#adminEngagementsUnsavedDiscard"),
    engagementsUnsavedStay: document.querySelector("#adminEngagementsUnsavedStay"),
    engagementsEventsForm: document.querySelector("#adminEngagementsEventsForm"),
    engagementsEventsSummary: document.querySelector("#adminEngagementsEventsSummary"),
    engagementsNativeCoursesWarning: document.querySelector("#adminEngagementsNativeCoursesWarning"),
    engagementsNativeRegionsWarning: document.querySelector("#adminEngagementsNativeRegionsWarning"),
    engagementsEventsChoiceSection: document.querySelector("#adminEngagementsEventsChoiceSection"),
    engagementsEventsChoiceSummary: document.querySelector("#adminEngagementsEventsChoiceSummary"),
    engagementsProgramSection: document.querySelector("#adminEngagementsProgramSection"),
    engagementsSectionToggles: document.querySelectorAll("[data-engagements-section-toggle]"),
    engagementsIndividualEvents: document.querySelector("#adminEngagementsIndividualEvents"),
    engagementsRelayEvents: document.querySelector("#adminEngagementsRelayEvents"),
    engagementsOpenWaterLibrary: document.querySelector("#adminEngagementsOpenWaterLibrary"),
    engagementsOpenWaterCourseCreator: document.querySelector("#adminEngagementsOpenWaterCourseCreator"),
    engagementsOpenWaterDistance: document.querySelector("#adminEngagementsOpenWaterDistance"),
    engagementsOpenWaterDiscipline: document.querySelector("#adminEngagementsOpenWaterDiscipline"),
    engagementsOpenWaterCourseAdd: document.querySelector("#adminEngagementsOpenWaterCourseAdd"),
    engagementsOpenWaterCourseList: document.querySelector("#adminEngagementsOpenWaterCourseList"),
    engagementsOpenWaterCourseMessage: document.querySelector("#adminEngagementsOpenWaterCourseMessage"),
    engagementsProgramSummary: document.querySelector("#adminEngagementsProgramSummary"),
    engagementsProgramEditHint: document.querySelector("#adminEngagementsProgramEditHint"),
    engagementsProgramAddSession: document.querySelector("#adminEngagementsProgramAddSession"),
    engagementsProgramSessions: document.querySelector("#adminEngagementsProgramSessions"),
    engagementsEventsSaveButton: document.querySelector("#adminEngagementsEventsSaveButton"),
    engagementsEventsMessage: document.querySelector("#adminEngagementsEventsMessage"),
    engagementsFeesForm: document.querySelector("#adminEngagementsFeesForm"),
    engagementsFeesSummary: document.querySelector("#adminEngagementsFeesSummary"),
    engagementsNoFees: document.querySelector("#adminEngagementsNoFees"),
    engagementsFeesGrid: document.querySelector("#adminEngagementsFeesGrid"),
    engagementsPaymentNote: document.querySelector("#adminEngagementsPaymentNote"),
    engagementsSwimmerFee: document.querySelector("#adminEngagementsSwimmerFee"),
    engagementsSwimmerFeeRead: document.querySelector("#adminEngagementsSwimmerFeeRead"),
    engagementsIndividualEventFee: document.querySelector("#adminEngagementsIndividualEventFee"),
    engagementsIndividualEventFeeRead: document.querySelector("#adminEngagementsIndividualEventFeeRead"),
    engagementsRelayFee: document.querySelector("#adminEngagementsRelayFee"),
    engagementsRelayFeeRead: document.querySelector("#adminEngagementsRelayFeeRead"),
    engagementsHelloAssoUrl: document.querySelector("#adminEngagementsHelloAssoUrl"),
    engagementsHelloAssoUrlRead: document.querySelector("#adminEngagementsHelloAssoUrlRead"),
    engagementsFeesSaveButton: document.querySelector("#adminEngagementsFeesSaveButton"),
    engagementsFeesMessage: document.querySelector("#adminEngagementsFeesMessage"),
    engagementsClubTeamForm: document.querySelector("#adminEngagementsClubTeamForm"),
    engagementsClubTeamSummary: document.querySelector("#adminEngagementsClubTeamSummary"),
    engagementsClubTeamChoices: document.querySelector("#adminEngagementsClubTeamChoices"),
    engagementsClubTeamModifyButton: document.querySelector("#adminEngagementsClubTeamModifyButton"),
    engagementsClubTeamEditCancel: document.querySelector("#adminEngagementsClubTeamEditCancel"),
    engagementsClubTeamNativePersonCreate: document.querySelector("#adminEngagementsClubTeamNativePersonCreate"),
    engagementsClubTeamRenunciationButton: document.querySelector("#adminEngagementsClubTeamRenunciationButton"),
    engagementsClubTeamRenunciationDialog: document.querySelector("#adminEngagementsClubTeamRenunciationDialog"),
    engagementsClubTeamRenunciationDialogTitle: document.querySelector("#adminEngagementsClubTeamRenunciationDialogTitle"),
    engagementsClubTeamRenunciationDialogSummary: document.querySelector("#adminEngagementsClubTeamRenunciationDialogSummary"),
    engagementsClubTeamRenunciationDialogForm: document.querySelector("#adminEngagementsClubTeamRenunciationDialogForm"),
    engagementsClubTeamRenunciationDialogClose: document.querySelector("#adminEngagementsClubTeamRenunciationDialogClose"),
    engagementsClubTeamRenunciationDialogCancel: document.querySelector("#adminEngagementsClubTeamRenunciationDialogCancel"),
    engagementsClubTeamPersonFields: document.querySelector("#adminEngagementsClubTeamPersonFields"),
    engagementsClubTeamPersonSearch: document.querySelector("#adminEngagementsClubTeamPersonSearch"),
    engagementsClubTeamPersonSelect: document.querySelector("#adminEngagementsClubTeamPersonSelect"),
    engagementsClubTeamPersonResults: document.querySelector("#adminEngagementsClubTeamPersonResults"),
    engagementsClubTeamPeopleMore: document.querySelector("#adminEngagementsClubTeamPeopleMore"),
    engagementsClubTeamPersonCreate: document.querySelector("#adminEngagementsClubTeamPersonCreate"),
    engagementsClubTeamFirstName: document.querySelector("#adminEngagementsClubTeamFirstName"),
    engagementsClubTeamFirstNameLabel: document.querySelector("#adminEngagementsClubTeamFirstNameLabel"),
    engagementsClubTeamLastName: document.querySelector("#adminEngagementsClubTeamLastName"),
    engagementsClubTeamLastNameLabel: document.querySelector("#adminEngagementsClubTeamLastNameLabel"),
    engagementsClubTeamBirthDateLabel: document.querySelector("#adminEngagementsClubTeamBirthDateLabel"),
    engagementsClubTeamBirthDate: document.querySelector("#adminEngagementsClubTeamBirthDate"),
    engagementsClubTeamSexLabel: document.querySelector("#adminEngagementsClubTeamSexLabel"),
    engagementsClubTeamSex: document.querySelector("#adminEngagementsClubTeamSex"),
    engagementsClubTeamLicenseLabel: document.querySelector("#adminEngagementsClubTeamLicenseLabel"),
    engagementsClubTeamLicense: document.querySelector("#adminEngagementsClubTeamLicense"),
    engagementsClubTeamExternal: document.querySelector("#adminEngagementsClubTeamExternal"),
    engagementsClubTeamExternalOpen: document.querySelector("#adminEngagementsClubTeamExternalOpen"),
    engagementsClubTeamExternalClubIdLabel: document.querySelector("#adminEngagementsClubTeamExternalClubIdLabel"),
    engagementsClubTeamExternalClubNameLabel: document.querySelector("#adminEngagementsClubTeamExternalClubNameLabel"),
    engagementsClubTeamExternalClubId: document.querySelector("#adminEngagementsClubTeamExternalClubId"),
    engagementsClubTeamExternalClubName: document.querySelector("#adminEngagementsClubTeamExternalClubName"),
    engagementsClubTeamExternalNote: document.querySelector("#adminEngagementsClubTeamExternalNote"),
    engagementsClubTeamExternalDialog: document.querySelector("#adminEngagementsClubTeamExternalDialog"),
    engagementsClubTeamExternalDialogForm: document.querySelector("#adminEngagementsClubTeamExternalDialogForm"),
    engagementsClubTeamExternalLastName: document.querySelector("#adminEngagementsClubTeamExternalLastName"),
    engagementsClubTeamExternalFirstName: document.querySelector("#adminEngagementsClubTeamExternalFirstName"),
    engagementsClubTeamExternalDialogClubName: document.querySelector("#adminEngagementsClubTeamExternalDialogClubName"),
    engagementsClubTeamExternalDialogMessage: document.querySelector("#adminEngagementsClubTeamExternalDialogMessage"),
    engagementsClubTeamExternalDialogClose: document.querySelector("#adminEngagementsClubTeamExternalDialogClose"),
    engagementsClubTeamExternalDialogCancel: document.querySelector("#adminEngagementsClubTeamExternalDialogCancel"),
    engagementsClubTeamExternalDialogApply: document.querySelector("#adminEngagementsClubTeamExternalDialogApply"),
    engagementsClubTeamRenunciationLabel: document.querySelector("#adminEngagementsClubTeamRenunciationLabel"),
    engagementsClubTeamRenunciation: document.querySelector("#adminEngagementsClubTeamRenunciation"),
    engagementsClubTeamSaveButton: document.querySelector("#adminEngagementsClubTeamSaveButton"),
    engagementsClubTeamRemoveButton: document.querySelector("#adminEngagementsClubTeamRemoveButton"),
    engagementsClubTeamMessage: document.querySelector("#adminEngagementsClubTeamMessage"),
    engagementsClubOfficialsForm: document.querySelector("#adminEngagementsClubOfficialsForm"),
    engagementsClubOfficialsSummary: document.querySelector("#adminEngagementsClubOfficialsSummary"),
    engagementsClubSelectedOfficialsList: document.querySelector("#adminEngagementsClubSelectedOfficialsList"),
    engagementsClubOfficialsSearch: document.querySelector("#adminEngagementsClubOfficialsSearch"),
    engagementsClubOfficialsList: document.querySelector("#adminEngagementsClubOfficialsList"),
    engagementsClubOfficialsSaveButton: document.querySelector("#adminEngagementsClubOfficialsSaveButton"),
    engagementsClubOfficialsMessage: document.querySelector("#adminEngagementsClubOfficialsMessage"),
    engagementsClubSwimmersForm: document.querySelector("#adminEngagementsClubSwimmersForm"),
    engagementsClubSwimmersSummary: document.querySelector("#adminEngagementsClubSwimmersSummary"),
    engagementsClubSwimmersSearch: document.querySelector("#adminEngagementsClubSwimmersSearch"),
    engagementsClubSelectedSwimmersList: document.querySelector("#adminEngagementsClubSelectedSwimmersList"),
    engagementsClubSwimmersList: document.querySelector("#adminEngagementsClubSwimmersList"),
    engagementsClubSwimmersSaveButton: document.querySelector("#adminEngagementsClubSwimmersSaveButton"),
    engagementsClubSwimmersMessage: document.querySelector("#adminEngagementsClubSwimmersMessage"),
    engagementsClubEntriesForm: document.querySelector("#adminEngagementsClubEntriesForm"),
    engagementsClubEntriesList: document.querySelector("#adminEngagementsClubEntriesList"),
    engagementsClubEntriesSaveBar: document.querySelector("#adminEngagementsClubEntriesSaveBar"),
    engagementsClubEntriesSaveButton: document.querySelector("#adminEngagementsClubEntriesSaveButton"),
    engagementsClubEntriesMessage: document.querySelector("#adminEngagementsClubEntriesMessage"),
    engagementsClubTimesDialog: document.querySelector("#adminEngagementsClubTimesDialog"),
    engagementsClubTimesDialogTitle: document.querySelector("#adminEngagementsClubTimesDialogTitle"),
    engagementsClubTimesDialogMeta: document.querySelector("#adminEngagementsClubTimesDialogMeta"),
    engagementsClubTimesDialogList: document.querySelector("#adminEngagementsClubTimesDialogList"),
    engagementsClubTimesDialogMessage: document.querySelector("#adminEngagementsClubTimesDialogMessage"),
    engagementsClubTimesDialogClose: document.querySelector("#adminEngagementsClubTimesDialogClose"),
    engagementsClubTimesDialogCancel: document.querySelector("#adminEngagementsClubTimesDialogCancel"),
    engagementsClubTimesDialogApply: document.querySelector("#adminEngagementsClubTimesDialogApply"),
    engagementsClubRelaysForm: document.querySelector("#adminEngagementsClubRelaysForm"),
    engagementsClubRelaysSummary: document.querySelector("#adminEngagementsClubRelaysSummary"),
    engagementsClubRelaysList: document.querySelector("#adminEngagementsClubRelaysList"),
    engagementsClubRelaysAddButton: document.querySelector("#adminEngagementsClubRelaysAddButton"),
    engagementsClubRelaysMessage: document.querySelector("#adminEngagementsClubRelaysMessage"),
    engagementsClubRelayDialog: document.querySelector("#adminEngagementsClubRelayDialog"),
    engagementsClubRelayDialogTitle: document.querySelector("#adminEngagementsClubRelayDialogTitle"),
    engagementsClubRelayDialogMeta: document.querySelector("#adminEngagementsClubRelayDialogMeta"),
    engagementsClubRelayDialogEvent: document.querySelector("#adminEngagementsClubRelayDialogEvent"),
    engagementsClubRelayDialogCategory: document.querySelector("#adminEngagementsClubRelayDialogCategory"),
    engagementsClubRelayDialogGender: document.querySelector("#adminEngagementsClubRelayDialogGender"),
    engagementsClubRelayDialogTime: document.querySelector("#adminEngagementsClubRelayDialogTime"),
    engagementsClubRelayDialogMembers: document.querySelector("#adminEngagementsClubRelayDialogMembers"),
    engagementsClubRelayDialogMembersSummary: document.querySelector("#adminEngagementsClubRelayDialogMembersSummary"),
    engagementsClubRelayDialogMembersHelp: document.querySelector("#adminEngagementsClubRelayDialogMembersHelp"),
    engagementsClubRelayDialogList: document.querySelector("#adminEngagementsClubRelayDialogList"),
    engagementsClubRelayDialogMessage: document.querySelector("#adminEngagementsClubRelayDialogMessage"),
    engagementsClubRelayDialogClose: document.querySelector("#adminEngagementsClubRelayDialogClose"),
    engagementsClubRelayDialogReset: document.querySelector("#adminEngagementsClubRelayDialogReset"),
    engagementsClubRelayDialogCancel: document.querySelector("#adminEngagementsClubRelayDialogCancel"),
    engagementsClubRelayDialogApply: document.querySelector("#adminEngagementsClubRelayDialogApply"),
    engagementsClubSummaryStatus: document.querySelector("#adminEngagementsClubSummaryStatus"),
    engagementsClubSummaryList: document.querySelector("#adminEngagementsClubSummaryList"),
    engagementsClubNativeSummary: document.querySelector("#adminEngagementsClubNativeSummary"),
    engagementsClubSummaryPdfButton: document.querySelector("#adminEngagementsClubSummaryPdfButton"),
    engagementsClubNewSwimmerFirstName: document.querySelector("#adminEngagementsClubNewSwimmerFirstName"),
    engagementsClubNewSwimmerLastName: document.querySelector("#adminEngagementsClubNewSwimmerLastName"),
    engagementsClubNewSwimmerBirthDate: document.querySelector("#adminEngagementsClubNewSwimmerBirthDate"),
    engagementsClubNewSwimmerSex: document.querySelector("#adminEngagementsClubNewSwimmerSex"),
    engagementsClubNewSwimmerLicense: document.querySelector("#adminEngagementsClubNewSwimmerLicense"),
    engagementsClubNewSwimmerDialog: document.querySelector("#adminEngagementsClubNewSwimmerDialog"),
    engagementsClubNewSwimmerDialogOpen: document.querySelector("#adminEngagementsClubNewSwimmerDialogOpen"),
    engagementsClubNewSwimmerMessage: document.querySelector("#adminEngagementsClubNewSwimmerMessage"),
    engagementsClubNewSwimmerResetButton: document.querySelector("#adminEngagementsClubNewSwimmerResetButton"),
    engagementsClubNewSwimmerSaveButton: document.querySelector("#adminEngagementsClubNewSwimmerSaveButton"),
    engagementsClubRecoverSwimmerButton: document.querySelector("#adminEngagementsClubRecoverSwimmerButton"),
    engagementsClubNewSwimmerAlerts: document.querySelector("#adminEngagementsClubNewSwimmerAlerts"),
    engagementsDocumentsSummary: document.querySelector("#adminEngagementsDocumentsSummary"),
    engagementsNotificationPreviewActions: document.querySelector("#adminEngagementsNotificationPreviewActions"),
    engagementsNotificationPreviewStatus: document.querySelector("#adminEngagementsNotificationPreviewStatus"),
    engagementsProcessNativeNotificationsButton: document.querySelector("#adminEngagementsProcessNativeNotificationsButton"),
    engagementsLongOperation: document.querySelector("#adminEngagementsLongOperation"),
    engagementsDocumentsTitle: document.querySelector("#adminEngagementsDocumentsTitle"),
    engagementsSharedDocumentsCount: document.querySelector("#adminEngagementsSharedDocumentsCount"),
    engagementsSharedDocumentsList: document.querySelector("#adminEngagementsSharedDocumentsList"),
    engagementsDocumentAddButton: document.querySelector("#adminEngagementsDocumentAddButton"),
    engagementsDocumentForm: document.querySelector("#adminEngagementsDocumentForm"),
    engagementsDocumentFiles: document.querySelector("#adminEngagementsDocumentFiles"),
    engagementsDocumentDrafts: document.querySelector("#adminEngagementsDocumentDrafts"),
    engagementsDocumentNotify: document.querySelector("#adminEngagementsDocumentNotify"),
    engagementsDocumentNotifyLabel: document.querySelector("#adminEngagementsDocumentNotifyLabel"),
    engagementsDocumentFormMessage: document.querySelector("#adminEngagementsDocumentFormMessage"),
    engagementsDocumentCancelButton: document.querySelector("#adminEngagementsDocumentCancelButton"),
    engagementsDocumentSubmitButton: document.querySelector("#adminEngagementsDocumentSubmitButton"),
    engagementsTechnicalFollowup: document.querySelector("#adminEngagementsTechnicalFollowup"),
    engagementsComputerEmailLabel: document.querySelector("#adminEngagementsComputerEmailLabel"),
    engagementsGenerateTxtExportButton: document.querySelector("#adminEngagementsGenerateTxtExportButton"),
    engagementsPrepareOpeningEmailsButton: document.querySelector("#adminEngagementsPrepareOpeningEmailsButton"),
    engagementsGenerateClubRecapsButton: document.querySelector("#adminEngagementsGenerateClubRecapsButton"),
    engagementsPrepareClubRecapEmailsButton: document.querySelector("#adminEngagementsPrepareClubRecapEmailsButton"),
    engagementsSendOpeningEmailsButton: document.querySelector("#adminEngagementsSendOpeningEmailsButton"),
    engagementsSendClubRecapEmailsButton: document.querySelector("#adminEngagementsSendClubRecapEmailsButton"),
    engagementsDocumentsList: document.querySelector("#adminEngagementsDocumentsList"),
    engagementsClubRecapFiles: document.querySelector("#adminEngagementsClubRecapFiles"),
    engagementsClubPdfSelect: document.querySelector("#adminEngagementsClubPdfSelect"),
    engagementsClubPdfDownloadButton: document.querySelector("#adminEngagementsClubPdfDownloadButton"),
    engagementsMailJobsList: document.querySelector("#adminEngagementsMailJobsList"),
    engagementsGeneratedFiles: document.querySelector("#adminEngagementsGeneratedFiles"),
    engagementsStatisticsRefreshButton: document.querySelector("#adminEngagementsStatisticsRefreshButton"),
    engagementsStatisticsUpdatedAt: document.querySelector("#adminEngagementsStatisticsUpdatedAt"),
    engagementsStatisticsSummary: document.querySelector("#adminEngagementsStatisticsSummary"),
    engagementsStatisticsAlerts: document.querySelector("#adminEngagementsStatisticsAlerts"),
    engagementsStatisticsEventSelect: document.querySelector("#adminEngagementsStatisticsEventSelect"),
    engagementsStatisticsEventRows: document.querySelector("#adminEngagementsStatisticsEventRows"),
    engagementsStatisticsClubRows: document.querySelector("#adminEngagementsStatisticsClubRows"),
    engagementsEditButton: document.querySelector("#adminEngagementsEditButton"),
    engagementsSaveButton: document.querySelector("#adminEngagementsSaveButton"),
    engagementsEditCancelTop: document.querySelector("#adminEngagementsEditCancelTop"),
    engagementsDeleteButton: document.querySelector("#adminEngagementsDeleteButton"),
    engagementsEditForm: document.querySelector("#adminEngagementsEditForm"),
    engagementsEditCancel: document.querySelector("#adminEngagementsEditCancel"),
    engagementsEditName: document.querySelector("#adminEngagementsEditName"),
    engagementsEditCompetitionType: document.querySelector("#adminEngagementsEditCompetitionType"),
    engagementsEditWaterBodyType: document.querySelector("#adminEngagementsEditWaterBodyType"),
    engagementsEditDate: document.querySelector("#adminEngagementsEditDate"),
    engagementsEditEndDate: document.querySelector("#adminEngagementsEditEndDate"),
    engagementsEditLocation: document.querySelector("#adminEngagementsEditLocation"),
    engagementsEditCity: document.querySelector("#adminEngagementsEditCity"),
    engagementsEditAddress: document.querySelector("#adminEngagementsEditAddress"),
    engagementsEditOrganizer: document.querySelector("#adminEngagementsEditOrganizer"),
    engagementsEditOrganizerEmail: document.querySelector("#adminEngagementsEditOrganizerEmail"),
    engagementsEditWhatsAppLabel: document.querySelector("#adminEngagementsEditWhatsAppLabel"),
    engagementsEditWhatsAppUrl: document.querySelector("#adminEngagementsEditWhatsAppUrl"),
    engagementsEditPublicDescription: document.querySelector("#adminEngagementsEditPublicDescription"),
    engagementsEditCanceled: document.querySelector("#adminEngagementsEditCanceled"),
    engagementsEditLevel: document.querySelector("#adminEngagementsEditLevel"),
    engagementsEditNationalKind: document.querySelector("#adminEngagementsEditNationalKind"),
    engagementsEditNationalKindLabel: document.querySelector("#adminEngagementsEditNationalKindLabel"),
    engagementsEditRegionId: document.querySelector("#adminEngagementsEditRegionId"),
    engagementsEditRegionNote: document.querySelector("#adminEngagementsEditRegionNote"),
    engagementsEditInvitedRegionIds: document.querySelector("#adminEngagementsEditInvitedRegionIds"),
    engagementsEditInvitedRegionChoices: document.querySelector("#adminEngagementsEditInvitedRegionChoices"),
    engagementsEditDeadline: document.querySelector("#adminEngagementsEditDeadline"),
    engagementsEditComputerEmail: document.querySelector("#adminEngagementsEditComputerEmail"),
    engagementsEditOfficialsManagerEmail: document.querySelector("#adminEngagementsEditOfficialsManagerEmail"),
    engagementsEditPoolLength: document.querySelector("#adminEngagementsEditPoolLength"),
    engagementsEditPoolLaneCount: document.querySelector("#adminEngagementsEditPoolLaneCount"),
    engagementsEditTimingType: document.querySelector("#adminEngagementsEditTimingType"),
    engagementsEditQualificationMode: document.querySelector("#adminEngagementsEditQualificationMode"),
    engagementsEditQualificationStart: document.querySelector("#adminEngagementsEditQualificationStart"),
    engagementsEditQualificationEnd: document.querySelector("#adminEngagementsEditQualificationEnd"),
    engagementsEditMissingEntryTimeMode: document.querySelector("#adminEngagementsEditMissingEntryTimeMode"),
    engagementsEditMaxEvents: document.querySelector("#adminEngagementsEditMaxEvents"),
    engagementsEditMaxEventsUnlimited: document.querySelector("#adminEngagementsEditMaxEventsUnlimited"),
    engagementsEditEntryStatus: document.querySelector("#adminEngagementsEditEntryStatus"),
    engagementsEditOfficialsRequired: document.querySelector("#adminEngagementsEditOfficialsRequired"),
    engagementsCreateForm: document.querySelector("#adminEngagementsCreateForm"),
    engagementsCompetitionType: document.querySelector("#adminEngagementsCompetitionType"),
    engagementsName: document.querySelector("#adminEngagementsName"),
    engagementsDate: document.querySelector("#adminEngagementsDate"),
    engagementsEndDate: document.querySelector("#adminEngagementsEndDate"),
    engagementsLocation: document.querySelector("#adminEngagementsLocation"),
    engagementsLevel: document.querySelector("#adminEngagementsLevel"),
    engagementsRegionId: document.querySelector("#adminEngagementsRegionId"),
    engagementsRegionNote: document.querySelector("#adminEngagementsRegionNote"),
    engagementsInvitedRegionIds: document.querySelector("#adminEngagementsInvitedRegionIds"),
    engagementsInvitedRegionChoices: document.querySelector("#adminEngagementsInvitedRegionChoices"),
    engagementsInvitedRegionDialog: document.querySelector("#adminEngagementsInvitedRegionDialog"),
    engagementsInvitedRegionDialogOpen: document.querySelector("#adminEngagementsInvitedRegionDialogOpen"),
    engagementsInvitedRegionSummary: document.querySelector("#adminEngagementsInvitedRegionSummary"),
    engagementsDeadline: document.querySelector("#adminEngagementsDeadline"),
    engagementsComputerEmail: document.querySelector("#adminEngagementsComputerEmail"),
    engagementsOfficialsManagerEmail: document.querySelector("#adminEngagementsOfficialsManagerEmail"),
    engagementsCreateFeesEnabled: document.querySelector("#adminEngagementsCreateFeesEnabled"),
    engagementsCreateFeesGrid: document.querySelector("#adminEngagementsCreateFeesGrid"),
    engagementsCreateSwimmerFee: document.querySelector("#adminEngagementsCreateSwimmerFee"),
    engagementsCreateIndividualEventFee: document.querySelector("#adminEngagementsCreateIndividualEventFee"),
    engagementsCreateRelayFee: document.querySelector("#adminEngagementsCreateRelayFee"),
    engagementsCreateHelloAssoUrl: document.querySelector("#adminEngagementsCreateHelloAssoUrl"),
    engagementsPoolLength: document.querySelector("#adminEngagementsPoolLength"),
    engagementsPoolLaneCount: document.querySelector("#adminEngagementsPoolLaneCount"),
    engagementsTimingType: document.querySelector("#adminEngagementsTimingType"),
    engagementsQualificationMode: document.querySelector("#adminEngagementsQualificationMode"),
    engagementsQualificationStart: document.querySelector("#adminEngagementsQualificationStart"),
    engagementsQualificationEnd: document.querySelector("#adminEngagementsQualificationEnd"),
    engagementsMissingEntryTimeMode: document.querySelector("#adminEngagementsMissingEntryTimeMode"),
    engagementsMaxEvents: document.querySelector("#adminEngagementsMaxEvents"),
    engagementsMaxEventsUnlimited: document.querySelector("#adminEngagementsMaxEventsUnlimited"),
    engagementsEntryStatus: document.querySelector("#adminEngagementsEntryStatus"),
    engagementsOfficialsRequired: document.querySelector("#adminEngagementsOfficialsRequired"),
    engagementsCreateMessage: document.querySelector("#adminEngagementsCreateMessage"),
    engagementsCreateChecklist: document.querySelector("#adminEngagementsCreateChecklist"),
    engagementsCreateCompleteNow: document.querySelector("#adminEngagementsCreateCompleteNow")
  };

  let adminAuth = null;
  let engagementLongOperation = null;
  const engagementLongOperationControlStates = new Map();

  /* extracted-function: assets/portal/navigation.js#ensureEngagementLongOperation */

  /* extracted-function: assets/portal/navigation.js#startEngagementLongOperation */

  /* extracted-function: assets/portal/navigation.js#updateEngagementLongOperation */

  /* extracted-function: assets/portal/navigation.js#finishEngagementLongOperation */
  let accessUsers = [];
  let invitedRegionsBeforeDialog = [];
  let editingUid = "";
  let accessCurrentCursor = null;
  let accessNextCursor = null;
  let accessPreviousCursors = [];
  let accessPage = 1;
  let accessUsersLoading = false;
  let accessUsersLoaded = false;
  let accessDirectoryTruncated = false;
  let accessDirectorySnapshotUsers = null;
  let accessDirectorySnapshotMode = false;
  let accessDirectorySnapshotFilteredCount = 0;
  let accessDirectoryLetter = "";
  let accessDirectoryFirestoreModulePromise = null;
  let accessLoadSequence = 0;
  let accessDeletionRequests = [];
  let accessDeletionRequestsLoaded = false;
  let accessDeletionRequestsLoading = false;
  let currentUserLoading = false;
  let engagementCompetitions = [];
  let engagementCompetitionsLoaded = false;
  let engagementCompetitionsLoadedRange = "";
  let engagementCompetitionsLoadedCacheKey = "";
  let engagementCompetitionsCachedAt = 0;
  let engagementPublicDeepLinkHandled = false;
  let engagementCalendarCacheRevision = 0;
  const engagementCompetitionCalendarMemoryCache = new Map();
  const engagementCompetitionCalendarRequests = new Map();
  let engagementCompetitionsVisibleLimit = 24;
  let engagementPastCompetitionsVisibleLimit = 24;
  let engagementPastCompetitionsExpanded = false;
  let newlyCreatedEngagementCompetitionId = "";
  let engagementOpenWaterCourses = ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES.map((course) => ({ ...course }));
  let engagementOpenWaterCoursesLoaded = false;
  let engagementOpenWaterCoursesLoading = false;
  let engagementDeadlineCountdownTimer = null;
  let engagementDeletionRequests = [];
  let engagementDeletionRequestsLoaded = false;
  let engagementDeletionRequestsLoading = false;
  let portalPendingOverviewLoaded = false;
  let portalPendingOverviewLoading = false;
  let engagementAccessRequests = [];
  let engagementAccessRequestsLoaded = false;
  let engagementAccessRequestsLoading = false;
  const accessRequestHistory = global.LivePalmesAccessRequestHistory?.create({
    root: document.querySelector("#adminEngagementsAccessRequestsPanel"), callFunction,
    canReview: canReviewEngagementAccessRequests,
    scopeKey: () => JSON.stringify([activeAuthUid, currentAccessProfile?.regionId, currentAccessProfile?.capabilities, currentAccessProfile?.accessScopes]),
    loadPending: loadEngagementAccessRequests, closeEditor: closeEngagementAccessRequestEditForm
  });
  let activeEngagementNationalTab = "deletions";
  let engagementNationalClubs = [];
  let engagementNationalClubsLoaded = false;
  let engagementNationalClubsLoading = false;
  let engagementNationalClubsVisibleLimit = ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
  let engagementNationalClubAdministratorsByClub = new Map();
  let engagementNationalClubAdministratorsLoaded = false;
  let engagementNationalClubAdministratorsAvailable = false;
  let engagementNationalSwimmers = [];
  let engagementNationalSwimmersLoaded = false;
  let engagementNationalSwimmersLoading = false;
  let engagementNationalSwimmerMergeSourceId = "";
  let engagementNationalSwimmerMergeTargets = [];
  let engagementNationalSwimmerMergeQuery = "";
  let engagementNationalSwimmerMergeLoading = false;
  let engagementNationalSwimmerMergeMode = false;
  let engagementSwimmerChangeRequests = [];
  let engagementSwimmerChangeRequestsLoaded = false;
  let engagementSwimmerChangeRequestsLoading = false;
  let engagementSwimmerCorrectionOpener = null;
  let engagementSwimmerCorrectionReview = null;
  let engagementNationalPeople = [];
  let engagementNationalPeopleLoaded = false;
  let engagementNationalPeopleLoading = false;
  let engagementNationalPeopleCursor = null;
  let engagementNationalClubCreationRetry = null;
  let engagementNationalPersonMergeSourceId = "";
  let engagementNationalPeopleMergeMode = false;
  let engagementNationalAuditLogs = [];
  let engagementNationalAuditLogsLoaded = false;
  let engagementNationalAuditLogsLoading = false;
  let engagementNationalAuditNextCursor = null;
  let engagementNationalAuditHasMore = false;
  let engagementNationalAuditVisibleFrom = "";
  let engagementNationalAuditAppliedActorUid = "";
  let engagementNationalAuditActorSearchTimer = 0;
  let engagementNationalAuditActorSearchSequence = 0;
  let engagementNationalAuditActorSuggestions = [];
  const engagementNationalAuditActors = new Map();
  const engagementNationalAuditClubs = new Map();
  const engagementNationalAuditCompetitions = new Map();
  const engagementNationalAuditPeople = new Map();
  let engagementClubPersonSaving = false;
  let engagementClubPersonFormHome = null;
  let engagementClubPeople = [];
  let engagementClubPeopleLoaded = false;
  let engagementClubPeopleLoading = false;
  let engagementClubPeopleCursor = null;
  let engagementClubPeopleHasMore = false;
  let engagementClubPeopleRequestVersion = 0;
  let engagementClubSwimmers = [];
  let engagementClubSwimmersLoaded = false;
  let engagementClubSwimmersLoading = false;
  let engagementClubSwimmersClubId = "";
  let engagementClubSwimmersCachedAt = 0;
  let engagementClubSwimmersLoadPromise = null;
  let engagementClubSwimmersDirectorySexFilter = "all";
  let engagementClubInactiveSwimmersDirectoryExpanded = false;
  let engagementClubAvailableSwimmersSexFilter = "all";
  let engagementClubInactiveSwimmersExpanded = false;
  let engagementClubSwimmerRecovery = null;
  let engagementClubSwimmerCreationRetry = null;
  let engagementClubSwimmersRenderedCompetitionId = "";
  let engagementClubEntriesRenderedCompetitionId = "";
  let engagementClubRelaysRenderedCompetitionId = "";
  let engagementClubRecapEntries = [];
  let engagementClubRecapEntriesCompetitionId = "";
  let engagementClubRecapEntriesLoading = false;
  let engagementMailJobs = [];
  let engagementMailJobsCompetitionId = "";
  let engagementMailJobsLoading = false;
  let engagementMailJobsCursor = null;
  let engagementMailJobsHasMore = false;
  let engagementMailJobsTotalCount = 0;
  let engagementCompetitionDocumentFiles = [];
  let engagementCompetitionDocumentEditingId = "";
  let engagementCompetitionDocumentSaving = false;
  let engagementCompetitionStatistics = null;
  let engagementCompetitionStatisticsCompetitionId = "";
  let engagementCompetitionStatisticsLoading = false;
  let engagementCalendarFiltersInitialized = false;
  let activeEngagementsTab = "calendar";
  let activeEngagementsNavEntry = "club";
  let activeEngagementsDetailTab = "general";
  let engagementClubTeamEditing = true;
  let engagementClubTeamRenunciationSaving = false;
  let engagementClubTeamRenunciationContext = null;
  let engagementClubTeamSaving = false;
  let engagementClubSwimmerRemoving = false;
  let activeEngagementProgramSessionId = "";
  let engagementClubRelaysDraft = [];
  let dirtyEngagementDetailTabs = new Set();
  let engagementUnsavedDecisionResolver = null;
  let engagementDetailEditing = false;
  let nativeCompetitionEditBaseline = null;
  let selectedEngagementCompetitionId = "";
  let selectedEngagementCompetition = null;
  let selectedEngagementClubEntry = null;
  let currentAccessProfile = null;
  let recordModuleLoadPromise = null;
  let importModuleLoadPromise = null;
  let dtnModuleLoadPromise = null;
  let importSpreadsheetLoadPromise = null;
  let accessClubReferenceLoadPromise = null;
  let publicClubDirectoryLoadPromise = null;
  let accessClubReference = [];
  let accessClubReferenceById = new Map();
  let portalClubCodeReferenceLoadPromise = null;
  let portalClubCodeReferenceById = new Map();
  let activeEngagementClubId = "";
  let activeAuthUid = "";
  let engagementClubEntriesDirty = false;
  let engagementNavigationRestoring = false;
  const engagementClubEntriesDirtySwimmerIds = new Set();
  let engagementClubPersistedSwimmerIds = new Set();
  let engagementClubEntryMutationQueue = Promise.resolve();
  let engagementClubEntryMutationRevision = 0;
  let engagementClubLastPersistedEntry = null;
  const engagementClubWorkspaceCache = new Map();
  const engagementClubWorkspaceRequests = new Map();
  const engagementClubEntriesAutosaveSwimmers = new Map();
  const engagementClubSelectionChanges = new Map();
  let engagementClubSelectionTimer = null;
  let engagementClubNativeSelectionRetry = null;
  let engagementClubNativeIndividualRetry = null;
  let engagementClubNativeOfficialRetry = null;
  let engagementClubNativeRelayRetry = null;
  let engagementClubSelectionCompetitionId = "";
  let engagementClubEntriesAutosaveTimer = null;
  let engagementClubEntriesAutosaveCompetitionId = "";
  let engagementDetailRetryPending = false;
  const engagementCourseScrollHintSeen = new Set();
  let engagementClubTimesDialogSwimmerId = "";
  let engagementClubTimesDialogLoading = false;
  let engagementClubTimesDialogOpener = null;
  let engagementClubRelayDialogRelayId = "";
  let engagementClubRelayDialogDraft = null;
  let engagementClubRelayDialogOpener = null;
  let engagementClubRelayDialogSaving = false;
  const engagementClubEntryTimeHistoryCache = new Map();
  const engagementClubEntryTimeHistoryRequests = new Map();
  const engagementClubSwimmerEventTimesCache = new Map();
  const engagementClubSwimmerEventTimesRequests = new Map();
  const engagementClubSwimmerEventTimesBatch = new Map();
  let engagementClubSwimmerEventTimesBatchTimer = null;

  /* extracted-function: assets/portal/navigation.js#ensureFirebaseApp */

  /* extracted-function: assets/portal/navigation.js#ensureAdminAuth */

  /* extracted-function: assets/portal/navigation.js#functionsService */

  const PORTAL_FRENCH_ERROR_REPLACEMENTS = [
    [/\bAcces\b/g, "Accès"],
    [/\bacces\b/g, "accès"],
    [/\bCompetition\b/g, "Compétition"],
    [/\bcompetition\b/g, "compétition"],
    [/\bEpreuve\b/g, "Épreuve"],
    [/\bepreuve\b/g, "épreuve"],
    [/\bRegion\b/g, "Région"],
    [/\bregion\b/g, "région"],
    [/\bNumero\b/g, "Numéro"],
    [/\bnumero\b/g, "numéro"],
    [/\bPrenom\b/g, "Prénom"],
    [/\bprenom\b/g, "prénom"],
    [/\bSelectionnez\b/g, "Sélectionnez"],
    [/\bselectionne(e|es|s)?\b/g, "sélectionné$1"],
    [/\bequipe\b/g, "équipe"],
    [/\bperimetre\b/g, "périmètre"],
    [/\bdesactive(e|es|s)?\b/g, "désactivé$1"],
    [/\breactive(e|es|s)?\b/g, "réactivé$1"],
    [/\bcree(e|es|s)?\b/g, "créé$1"],
    [/\bsupprime(e|es|s)?\b/g, "supprimé$1"],
    [/\benregistre(e|es|s)?\b/g, "enregistré$1"],
    [/\butilise(e|es|s)?\b/g, "utilisé$1"],
    [/\breserve(e|es|s)?\b/g, "réservé$1"],
    [/\blimite(e|es|s)?\b/g, "limité$1"],
    [/\bdedie(e|es|s)?\b/g, "dédié$1"],
    [/\bnecessaire\b/g, "nécessaire"],
    [/\bdefinitive\b/g, "définitive"],
    [/\birreversible\b/g, "irréversible"],
    [/\bDecision\b/g, "Décision"],
    [/\bdeja\b/g, "déjà"],
    [/\bmeme\b/g, "même"],
    [/\betre\b/g, "être"],
    [/\bete\b/g, "été"],
    [/\bcreer\b/g, "créer"],
    [/\bCompletez\b/g, "Complétez"],
    [/\bperiode\b/g, "période"],
    [/\bdebut\b/g, "début"],
    [/\bcloture\b/g, "clôture"],
    [/\bdepassee\b/g, "dépassée"],
    [/\bposterieur(e|es|s)?\b/g, "postérieur$1"],
    [/\begale\b/g, "égale"],
    [/\brecapitulatif\b/g, "récapitulatif"],
    [/\bderogation\b/g, "dérogation"],
    [/\bidentite\b/g, "identité"],
    [/\bplutot\b/g, "plutôt"],
    [/\blie(e|es|s)?\b/g, "lié$1"],
    [/\belement\b/g, "élément"],
    [/\breferentiel\b/g, "référentiel"],
    [/\bfederal\b/g, "fédéral"],
    [/\bprevisualisation\b/g, "prévisualisation"],
    [/\bimportee\b/g, "importée"]
  ];

  /* extracted-function: assets/portal/navigation.js#normalizePortalFrenchError */

  const portalCallSamples = new Map();

  /* extracted-function: assets/portal/navigation.js#recordPortalCall */

  /* extracted-function: assets/portal/navigation.js#portalCallMetrics */

  if (typeof globalThis !== "undefined") globalThis.LivePalmesPortalMetrics = portalCallMetrics;

  /* extracted-function: assets/portal/navigation.js#callFunction */

  /* extracted-function: assets/portal/navigation.js#callFunctionWithTimeout */

  /* extracted-function: assets/portal/navigation.js#downloadBase64File */

  /* extracted-function: assets/portal/navigation.js#setMessage */

  /* extracted-function: assets/portal/navigation.js#setAccessMessage */

  /* extracted-function: assets/portal/navigation.js#setPublicAccessRequestMessage */

  /* extracted-function: assets/portal/navigation.js#setFormPending */

  /* extracted-function: assets/portal/navigation.js#setAccountMessage */

  /* extracted-function: assets/portal/navigation.js#markLastRefresh */

  /* extracted-function: assets/portal/navigation.js#lastRefreshTime */

  /* extracted-function: assets/portal/navigation.js#lastRefreshSuffix */

  /* extracted-function: assets/portal/navigation.js#toggleLoginPasswordVisibility */

  /* extracted-function: assets/portal/navigation.js#closeAccountMenu */

  /* extracted-function: assets/portal/navigation.js#canManagePerformances */

  /* extracted-function: assets/portal/navigation.js#setPortalNavigationPinned */

  /* extracted-function: assets/portal/navigation.js#restorePortalNavigationPinned */

  /* extracted-function: assets/portal/navigation.js#initializePortalNavigationLabels */

  /* extracted-function: assets/portal/navigation.js#setMobilePortalNavigationOpen */

  /* extracted-function: assets/portal/navigation.js#collapsePortalNavigationAfterSelection */

  /* extracted-function: assets/portal/navigation.js#canManageEngagements */

  /* extracted-function: assets/portal/navigation.js#canViewActivityLog */

  /* extracted-function: assets/portal/navigation.js#canAccessEngagementsView */

  /* extracted-function: assets/portal/navigation.js#canCreateEngagementCompetition */

  /* extracted-function: assets/portal/navigation.js#canDeleteEngagementCompetitionDirectly */

  /* extracted-function: assets/portal/navigation.js#canDeleteEngagementCompetitionImmediately */

  /* extracted-function: assets/portal/navigation.js#canReviewEngagementAccessRequests */

  /* extracted-function: assets/portal/navigation.js#canAccessEngagementRoute */

  /* extracted-function: assets/portal/navigation.js#preferredEngagementRouteHash */

  /* extracted-function: assets/portal/navigation.js#canManageAccessDirectory */

  /* extracted-function: assets/portal/navigation.js#canDeleteAccessUserDirectly */

  /* extracted-function: assets/portal/navigation.js#engagementClubScope */

  /* extracted-function: assets/portal/navigation.js#canSwitchEngagementClub */

  /* extracted-function: assets/portal/navigation.js#activeEngagementClubIdForProfile */

  /* extracted-function: assets/portal/navigation.js#activeEngagementClubProfile */

  /* extracted-function: assets/portal/navigation.js#restoreActiveEngagementClubFromSession */

  /* extracted-function: assets/portal/navigation.js#clearActiveEngagementClub */

  /* extracted-function: assets/portal/navigation.js#setActiveEngagementClub */

  /* extracted-function: assets/portal/navigation.js#resetEngagementClubData */

  /* extracted-function: assets/portal/navigation.js#engagementRegionScope */

  /* extracted-function: assets/portal/navigation.js#canManageEngagementCompetitionScope */

  /* extracted-function: assets/portal/navigation.js#isRegionalPastEngagementReadOnly */

  /* extracted-function: assets/portal/navigation.js#canEditEngagementCompetition */

  /* extracted-function: assets/portal/navigation.js#setPerformanceMenuOpen */

  /* extracted-function: assets/portal/navigation.js#setClubMenuOpen */

  /* extracted-function: assets/portal/navigation.js#setDtnMenuOpen */

  /* extracted-function: assets/portal/navigation.js#setEngagementsAdminMenuOpen */

  /* extracted-function: assets/portal/navigation.js#setNationalMenuOpen */

  /* extracted-function: assets/portal/navigation.js#setAccessMenuOpen */

  /* extracted-function: assets/portal/navigation.js#setExclusivePortalMenu */

  /* extracted-function: assets/portal/navigation.js#togglePortalSpace */

  /* extracted-function: assets/portal/navigation.js#setOverviewSpaceExpanded */

  /* extracted-function: assets/portal/navigation.js#updateOverviewSpaceTools */

  /* extracted-function: assets/portal/navigation.js#isEngagementAdminMode */

  /* extracted-function: assets/portal/navigation.js#engagementNavigationMode */

  /* extracted-function: assets/portal/navigation.js#engagementNationalPageTitle */

  /* extracted-function: assets/portal/navigation.js#renderEngagementClubContext */

  /* extracted-function: assets/portal/navigation.js#updateEngagementsModeView */

  /* extracted-function: assets/portal/navigation.js#updateEngagementDirtyTabIndicators */

  /* extracted-function: assets/portal/navigation.js#loadActiveEngagementNationalTab */

  /* extracted-function: assets/portal/navigation.js#setEngagementNationalTab */

  /* extracted-function: assets/portal/navigation.js#renderEngagementNationalOverview */

  /* extracted-function: assets/portal/navigation.js#renderPendingBadgeCollection */

  /* extracted-function: assets/portal/navigation.js#renderPortalPendingOverview */

  /* extracted-function: assets/portal/navigation.js#loadPortalPendingOverview */

  /* extracted-function: assets/portal/navigation.js#loadEngagementNationalOverview */

  let nationalAutomaticMailControl = null, nationalAutomaticMailLoading = false, nationalAutomaticMailLoadedAt = 0;
  /* extracted-function: assets/portal/navigation.js#loadNationalAutomaticMailControl */
  /* extracted-function: assets/portal/navigation.js#renderNationalAutomaticMailControls */
  /* extracted-function: assets/portal/navigation.js#renderNationalAutomaticMailControl */

  /* extracted-function: assets/portal/navigation.js#updateEngagementDetailEditState */

  /* extracted-function: assets/portal/navigation.js#markEngagementDetailTabDirty */

  /* extracted-function: assets/portal/navigation.js#clearEngagementDetailTabDirty */

  /* extracted-function: assets/portal/navigation.js#confirmLeaveDirtyEngagementTab */

  /* extracted-function: assets/portal/navigation.js#resolveEngagementUnsavedDecision */

  /* extracted-function: assets/portal/navigation.js#requestEngagementUnsavedDecision */

  /* extracted-function: assets/portal/navigation.js#discardEngagementDetailTabChanges */

  /* extracted-function: assets/portal/navigation.js#isClubEngagementWorkflowTab */

  /* extracted-function: assets/portal/navigation.js#engagementClubTeamComplete */

  /* extracted-function: assets/portal/navigation.js#engagementClubEntryHasParticipants */

  /* extracted-function: assets/portal/navigation.js#updateNativeCompetitionPersonCreationButton */

  /* extracted-function: assets/portal/navigation.js#updateEngagementClubTeamLeaderActions */

  /* extracted-function: assets/portal/navigation.js#engagementClubWriteLockReason */

  /* extracted-function: assets/portal/navigation.js#engagementClubWriteLocked */

  /* extracted-function: assets/portal/navigation.js#engagementClubSwimmerSelectionLockReason */

  /* extracted-function: assets/portal/navigation.js#engagementClubIndividualEntriesLockReason */

  /* extracted-function: assets/portal/navigation.js#engagementClubOfficialsLockReason */

  /* extracted-function: assets/portal/navigation.js#engagementClubRelaysLockReason */

  /* extracted-function: assets/portal/navigation.js#engagementClubTeamLeaderLockReason */

  /* extracted-function: assets/portal/navigation.js#engagementClubStepLockReason */

  /* extracted-function: assets/portal/navigation.js#engagementClubInformationOnly */

  /* extracted-function: assets/portal/navigation.js#setEngagementClubFormControlsLocked */

  /* extracted-function: assets/portal/navigation.js#setEngagementClubCompetitionFormsLocked */

  /* extracted-function: assets/portal/navigation.js#showEngagementClubWriteLock */

  /* extracted-function: assets/portal/navigation.js#canOpenClubEngagementTab */

  /* extracted-function: assets/portal/navigation.js#clubEngagementTabHiddenWhenWriteLocked */

  const ENGAGEMENT_DETAIL_TAB_LABELS = Object.freeze({
    general: "Général", courses: "Programme", fees: "Frais", team: "Chef d'équipe",
    officials: "Officiels", swimmers: "Nageurs", entries: "Courses individuelles", relays: "Relais",
    summary: "Récapitulatif", statistics: "Statistiques", documents: "GED", delivery: "Diffusion"
  });

  const ENGAGEMENT_DETAIL_TAB_GROUPS = Object.freeze({
    information: ["general", "courses"],
    participants: ["team", "officials", "swimmers"],
    entries: ["entries", "relays"],
    summary: ["summary"],
    statistics: ["statistics"],
    documents: ["documents"],
    delivery: ["delivery"]
  });

  /* extracted-function: assets/portal/navigation.js#engagementDetailTabLabel */

  /* extracted-function: assets/portal/navigation.js#engagementDetailTabsForGroup */

  /* extracted-function: assets/portal/navigation.js#visibleEngagementDetailTabs */

  /* extracted-function: assets/portal/navigation.js#engagementLastTabStorageKey */

  /* extracted-function: assets/portal/navigation.js#storedEngagementDetailTab */

  /* extracted-function: assets/portal/navigation.js#rememberEngagementDetailTab */

  /* extracted-function: assets/portal/navigation.js#setEngagementSaveState */

  /* extracted-function: assets/portal/navigation.js#engagementClubEmptySwimmersHtml */

  /* extracted-function: assets/portal/navigation.js#engagementDetailTabGroup */

  /* extracted-function: assets/portal/navigation.js#updateEngagementStepNavigation */

  /* extracted-function: assets/portal/navigation.js#requestEngagementDetailTab */

  /* extracted-function: assets/portal/navigation.js#setEngagementsTab */

  /* extracted-function: assets/portal/navigation.js#setEngagementsDetailTab */

  /* extracted-function: assets/portal/navigation.js#firebaseAccountError */

  /* extracted-function: assets/portal/navigation.js#reauthenticateCurrentUser */

  /* extracted-function: assets/portal/navigation.js#canUse */

  global.LivePalmesLicenseAdministration = Object.freeze({
    callFunction,
    licensesChanged: () => invalidateEngagementClubSwimmersCache(),
    canManage: () => canDeleteEngagementCompetitionDirectly(),
    openSwimmer: (swimmer, opener = null) => openEngagementSwimmerCorrectionDialog(swimmer, "direct", opener)
  });

  /* extracted-function: assets/portal/navigation.js#isClubOnlyPortalProfile */

  /* extracted-function: assets/portal/navigation.js#applyPortalHomeForProfile */

  /* extracted-function: assets/portal/navigation.js#updateCapabilityView */

  /* extracted-function: assets/portal/navigation.js#syncEngagementRouteFromHash */

  /* extracted-function: assets/portal/navigation.js#requestedNavigationView */

  /* extracted-function: assets/portal/navigation.js#updateNavigationView */

  /* extracted-function: assets/portal/modules-and-clubs.js#loadScriptOnce */

  /* extracted-function: assets/portal/modules-and-clubs.js#loadPortalClubCodeReference */

  /* extracted-function: assets/portal/modules-and-clubs.js#watchRecordWorkbench */

  /* extracted-function: assets/portal/modules-and-clubs.js#loadDtnModule */

  /* extracted-function: assets/portal/modules-and-clubs.js#loadRecordModule */

  /* extracted-function: assets/portal/modules-and-clubs.js#watchImportWorkbench */

  /* extracted-function: assets/portal/modules-and-clubs.js#loadImportSpreadsheet */

  global.LivePalmesLoadImportSpreadsheet = loadImportSpreadsheet;

  /* extracted-function: assets/portal/modules-and-clubs.js#loadImportModule */

  /* extracted-function: assets/portal/modules-and-clubs.js#capabilityLabel */

  /* extracted-function: assets/portal/modules-and-clubs.js#normalizedRegionKey */

  /* extracted-function: assets/portal/modules-and-clubs.js#canonicalLivePalmesRegion */

  /* extracted-function: assets/portal/modules-and-clubs.js#sameLivePalmesRegion */

  /* extracted-function: assets/portal/modules-and-clubs.js#regionDisplayLabel */

  /* extracted-function: assets/portal/modules-and-clubs.js#setRegionSelectValue */

  /* extracted-function: assets/portal/modules-and-clubs.js#fillLivePalmesRegionSelect */

  /* extracted-function: assets/portal/modules-and-clubs.js#selectedRegionMultiSelectValues */

  /* extracted-function: assets/portal/modules-and-clubs.js#setRegionMultiSelectValues */

  /* extracted-function: assets/portal/modules-and-clubs.js#updateInvitedRegionWarning */

  /* extracted-function: assets/portal/modules-and-clubs.js#renderInvitedRegionChoices */

  /* extracted-function: assets/portal/modules-and-clubs.js#fillLivePalmesRegionMultiSelect */

  /* extracted-function: assets/portal/modules-and-clubs.js#populateLivePalmesRegionSelects */

  /* extracted-function: assets/portal/modules-and-clubs.js#accessReferenceRegionLabel */

  /* extracted-function: assets/portal/modules-and-clubs.js#normalizeAccessClubReference */

  /* extracted-function: assets/portal/modules-and-clubs.js#accessClubLabel */

  /* extracted-function: assets/portal/modules-and-clubs.js#accessClubFromId */

  /* extracted-function: assets/portal/modules-and-clubs.js#clubDisplayCode */

  /* extracted-function: assets/portal/modules-and-clubs.js#clubDisplayLabel */

  /* extracted-function: assets/portal/modules-and-clubs.js#populateAccessRegionChoices */

  /* extracted-function: assets/portal/modules-and-clubs.js#syncAccessClubFieldsFromSelect */

  /* extracted-function: assets/portal/modules-and-clubs.js#populateAccessClubSelect */

  /* extracted-function: assets/portal/modules-and-clubs.js#syncPublicAccessRequestClubFieldsFromSelect */

  /* extracted-function: assets/portal/modules-and-clubs.js#populatePublicAccessRequestClubSelect */

  /* extracted-function: assets/portal/modules-and-clubs.js#normalizedClubFederalNumber */

  /* extracted-function: assets/portal/modules-and-clubs.js#publicAccessRequestNewClubInputs */

  /* extracted-function: assets/portal/modules-and-clubs.js#updatePublicAccessRequestNewClubMode */

  /* extracted-function: assets/portal/modules-and-clubs.js#matchPublicAccessRequestClubByFederalNumber */

  /* extracted-function: assets/portal/modules-and-clubs.js#syncEngagementAccessRequestEditClubFieldsFromSelect */

  /* extracted-function: assets/portal/modules-and-clubs.js#populateEngagementAccessRequestEditClubSelect */

  /* extracted-function: assets/portal/modules-and-clubs.js#loadAccessClubReference */

  /* extracted-function: assets/portal/modules-and-clubs.js#renderClubSwitchResults */

  /* extracted-function: assets/portal/modules-and-clubs.js#openClubSwitchDialog */

  /* extracted-function: assets/portal/modules-and-clubs.js#changeActiveEngagementClub */

  /* extracted-function: assets/portal/modules-and-clubs.js#currentEngagementSeasonStartYear */

  /* extracted-function: assets/portal/modules-and-clubs.js#engagementSeasonBounds */

  /* extracted-function: assets/portal/modules-and-clubs.js#engagementSeasonLabel */

  /* extracted-function: assets/portal/modules-and-clubs.js#populateEngagementSeasonFilter */

  /* extracted-function: assets/portal/modules-and-clubs.js#syncEngagementStatusSegments */

  /* extracted-function: assets/portal/competition-settings.js#updateEngagementDetailStepLabels */

  /* extracted-function: assets/portal/competition-settings.js#initializeEngagementCalendarFilters */

  /* extracted-function: assets/portal/competition-settings.js#applyEngagementCalendarRegionScope */

  /* extracted-function: assets/portal/competition-settings.js#resetEngagementCalendarFilters */

  /* extracted-function: assets/portal/competition-settings.js#engagementCalendarFiltersPayload */

  /* extracted-function: assets/portal/competition-settings.js#engagementCalendarSeptemberPreview */

  /* extracted-function: assets/portal/competition-settings.js#engagementCalendarRequestedRange */

  /* extracted-function: assets/portal/competition-settings.js#engagementCalendarScopeKey */

  /* extracted-function: assets/portal/competition-settings.js#engagementCalendarCacheKey */

  /* extracted-function: assets/portal/competition-settings.js#engagementCalendarCacheCompetition */

  /* extracted-function: assets/portal/competition-settings.js#readEngagementCalendarCache */

  /* extracted-function: assets/portal/competition-settings.js#writeEngagementCalendarCache */

  /* extracted-function: assets/portal/competition-settings.js#activateEngagementCalendarCache */

  /* extracted-function: assets/portal/competition-settings.js#persistActiveEngagementCalendarCache */

  /* extracted-function: assets/portal/competition-settings.js#upsertEngagementCalendarItemFromServer */

  /* extracted-function: assets/portal/competition-settings.js#removeEngagementCalendarItemFromCache */

  /* extracted-function: assets/portal/competition-settings.js#invalidateEngagementCalendarCaches */

  /* extracted-function: assets/portal/competition-settings.js#engagementCompetitionIsInSeptemberPreview */

  /* extracted-function: assets/portal/competition-settings.js#filteredEngagementCompetitions */

  /* extracted-function: assets/portal/competition-settings.js#engagementCalendarSections */

  /* extracted-function: assets/portal/competition-settings.js#renderCurrentUser */

  /* extracted-function: assets/portal/competition-settings.js#renderPortalScopeContext */

  /* extracted-function: assets/portal/competition-settings.js#renderEngagementsProfile */

  /* extracted-function: assets/portal/competition-settings.js#updateEngagementRegionField */

  /* extracted-function: assets/portal/competition-settings.js#updateEngagementInvitedRegionField */

  /* extracted-function: assets/portal/competition-settings.js#updateEngagementCreateFormAccess */

  /* extracted-function: assets/portal/competition-settings.js#updateEngagementEditFormAccess */

  /* extracted-function: assets/portal/competition-settings.js#updateEngagementQualificationFields */

  /* extracted-function: assets/portal/competition-settings.js#updateEngagementMaxEventsFields */

  /* extracted-function: assets/portal/competition-settings.js#setDefaultEngagementOfficialsRequired */

  /* extracted-function: assets/portal/competition-settings.js#prepareCreateCompetitionDialog */

  /* extracted-function: assets/portal/competition-settings.js#resetCreateCompetitionDialog */

  /* extracted-function: assets/portal/competition-settings.js#openCreateCompetitionDialog */

  /* extracted-function: assets/portal/competition-settings.js#syncInvitedRegionChoice */

  /* extracted-function: assets/portal/competition-settings.js#openInvitedRegionsDialog */

  /* extracted-function: assets/portal/competition-settings.js#closeInvitedRegionsDialog */


  let qualificationEditor = null;
  let qualificationExceptionScope = "";
  /* extracted-function: assets/portal/competition-settings.js#qualificationExceptionContext */
  /* extracted-function: assets/portal/competition-settings.js#qualificationExceptionsEnabled */
  /* extracted-function: assets/portal/competition-settings.js#renderQualificationExceptionToggle */
  /* extracted-function: assets/portal/competition-settings.js#confirmQualificationException */
  /* extracted-function: assets/portal/competition-settings.js#engagementManualIndividualTimesAllowed */

  /* extracted-function: assets/portal/competition-settings.js#engagementKnownIndividualTimesSelectable */

  /* extracted-function: assets/portal/competition-settings.js#clearUncheckedQualificationException */

  /* extracted-function: assets/portal/competition-settings.js#renderQualificationAlert */

  /* extracted-function: assets/portal/competition-settings.js#updateEngagementManualEntryTimeField */

  /* extracted-function: assets/portal/competition-settings.js#renderQualificationJobActions */

  /* extracted-function: assets/portal/competition-settings.js#renderQualificationEditor */

  /* extracted-function: assets/portal/competition-settings.js#finishQualificationJob */

  /* extracted-function: assets/portal/competition-settings.js#updateCompetitionWithQualifications */

  /* extracted-function: assets/portal/competition-settings.js#updateQualificationCheckboxes */

  /* extracted-function: assets/portal/competition-settings.js#fillEngagementEditForm */

  /* extracted-function: assets/portal/competition-settings.js#setEngagementEditMode */

  /* extracted-function: assets/portal/competition-settings.js#formatShortDate */

  /* extracted-function: assets/portal/competition-settings.js#formatDeadline */

  /* extracted-function: assets/portal/competition-settings.js#isoToDatetimeLocal */

  /* extracted-function: assets/portal/competition-settings.js#normalizeEngagementDeadlineField */

  /* extracted-function: assets/portal/competition-settings.js#syncEngagementEndDate */

  /* extracted-function: assets/portal/competition-settings.js#markEngagementEndDateManual */

  /* extracted-function: assets/portal/competition-settings.js#engagementLevelLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementStatusLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementDeadlineTone */

  /* extracted-function: assets/portal/competition-settings.js#engagementOperationalStatusLabel */

  /* extracted-function: assets/portal/competition-settings.js#formatEngagementCompetitionDate */

  /* extracted-function: assets/portal/competition-settings.js#engagementDeadlineDisplay */

  /* extracted-function: assets/portal/competition-settings.js#renderEngagementDetailStatus */

  /* extracted-function: assets/portal/competition-settings.js#refreshEngagementDeadlineCountdowns */

  /* extracted-function: assets/portal/competition-settings.js#engagementCompetitionMonthLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementCompetitionAction */

  /* extracted-function: assets/portal/competition-settings.js#updateEngagementSportFields */

  /* extracted-function: assets/portal/competition-settings.js#mergeNationalClubsIntoAccessReference */

  /* extracted-function: assets/portal/competition-settings.js#setSelectedEngagementCompetitionClubEntryExists */

  /* extracted-function: assets/portal/competition-settings.js#engagementPoolLengthLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementPoolLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementTimingTypeLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementVenueLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementFacilityLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementQualificationPeriodLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementMissingEntryTimeModeLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementEntryTimeRulesLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementMaxEventsLabel */

  /* extracted-function: assets/portal/competition-settings.js#engagementFeeAmount */

  /* extracted-function: assets/portal/competition-settings.js#formatEngagementFee */

  /* extracted-function: assets/portal/competition-settings.js#engagementFeesSummary */

  /* extracted-function: assets/portal/competition-settings.js#engagementExternalHttpUrl */

  /* extracted-function: assets/portal/competition-settings.js#engagementEmailLinkValue */

  /* extracted-function: assets/portal/competition-settings.js#engagementRowValueHtml */

  /* extracted-function: assets/portal/competition-settings.js#engagementTeamLeadersWhatsAppUrl */

  /* extracted-function: assets/portal/competition-settings.js#engagementTeamLeadersWhatsAppValue */

  /* extracted-function: assets/portal/competition-settings.js#engagementCompetitionProgramOverview */

  /* extracted-function: assets/portal/competition-settings.js#selectedEngagementFeesFromForm */

  /* extracted-function: assets/portal/competition-settings.js#selectedCreateEngagementFeesFromForm */

  /* extracted-function: assets/portal/competition-settings.js#updateCreateEngagementFeesMode */

  /* extracted-function: assets/portal/competition-settings.js#updateEngagementFeesFormMode */

  /* extracted-function: assets/portal/competition-settings.js#renderEngagementFees */

  /* extracted-function: assets/portal/club-people.js#selectedEngagementTeamLeaderFromForm */

  /* extracted-function: assets/portal/club-people.js#engagementClubTeamLeaderPeople */

  /* extracted-function: assets/portal/club-people.js#renderEngagementClubTeamPersonOptions */

  /* extracted-function: assets/portal/club-people.js#setEngagementClubTeamManualFieldsVisible */

  /* extracted-function: assets/portal/club-people.js#findEngagementClubTeamPersonFromFields */

  /* extracted-function: assets/portal/club-people.js#applyEngagementClubTeamPerson */

  /* extracted-function: assets/portal/club-people.js#confirmEngagementClubTeamLeaderCandidate */

  /* extracted-function: assets/portal/club-people.js#restoreEngagementClubTeamLeaderChoice */

  /* extracted-function: assets/portal/club-people.js#cancelEngagementClubTeamEdit */

  /* extracted-function: assets/portal/club-people.js#selectEngagementClubTeamRenunciation */

  /* extracted-function: assets/portal/club-people.js#openEngagementClubTeamRenunciationDialog */

  /* extracted-function: assets/portal/club-people.js#closeEngagementClubTeamRenunciationDialog */

  /* extracted-function: assets/portal/club-people.js#closeEngagementClubExternalTeamDialog */

  /* extracted-function: assets/portal/club-people.js#openEngagementClubExternalTeamDialog */

  /* extracted-function: assets/portal/club-people.js#saveEngagementClubExternalTeamLeader */

  /* extracted-function: assets/portal/club-people.js#engagementClubOfficialPeople */

  /* extracted-function: assets/portal/club-people.js#engagementClubSwimmerReferenceValue */

  /* extracted-function: assets/portal/club-people.js#engagementClubSwimmerFromReferenceValue */

  /* extracted-function: assets/portal/club-people.js#engagementClubPersonForSwimmer */

  /* extracted-function: assets/portal/club-people.js#renderEngagementClubPersonSwimmerOptions */

  /* extracted-function: assets/portal/club-people.js#applyEngagementClubPersonSwimmer */

  /* extracted-function: assets/portal/club-people.js#selectedEngagementClubOfficialIds */

  /* extracted-function: assets/portal/club-people.js#updateEngagementClubOfficialsSummary */

  /* extracted-function: assets/portal/club-people.js#renderEngagementClubOfficials */

  /* extracted-function: assets/portal/club-people.js#engagementClubMemberRoleConflict */

  /* extracted-function: assets/portal/club-people.js#handleEngagementClubOfficialSelection */

  /* extracted-function: assets/portal/club-people.js#normalizedEngagementClubSearch */

  /* extracted-function: assets/portal/club-people.js#normalizedEngagementClubIdentityPart */

  /* extracted-function: assets/portal/club-people.js#engagementClubPersonLicenseKey */

  /* extracted-function: assets/portal/club-people.js#engagementClubPersonIdentityKey */

  /* extracted-function: assets/portal/club-people.js#engagementClubIdentityEditDistance */

  /* extracted-function: assets/portal/club-people.js#engagementClubIdentityPartSimilar */

  /* extracted-function: assets/portal/club-people.js#engagementClubPersonIdentityMatch */

  /* extracted-function: assets/portal/club-people.js#engagementClubPersonDisplayName */

  /* extracted-function: assets/portal/club-people.js#engagementClubPersonPayloadWithRole */

  /* extracted-function: assets/portal/club-people.js#resolveEngagementClubPersonIdentity */

  /* extracted-function: assets/portal/club-people.js#engagementAdminPublicSwimmerSearchTokens */

  /* extracted-function: assets/portal/club-people.js#engagementAdminPublicSwimmerSearchShard */

  /* extracted-function: assets/portal/club-people.js#loadEngagementAdminPublicSwimmerSearchShard */

  /* extracted-function: assets/portal/club-people.js#engagementAdminPublicSwimmerScore */

  /* extracted-function: assets/portal/club-people.js#engagementAdminPublicSwimmerItem */

  /* extracted-function: assets/portal/club-people.js#searchEngagementAdminPublicSwimmers */

  /* extracted-function: assets/portal/club-people.js#mergeEngagementNationalSwimmerResults */

  /* extracted-function: assets/portal/club-people.js#engagementNationalSwimmerKey */

  /* extracted-function: assets/portal/club-people.js#engagementNationalSwimmerByKey */

  /* extracted-function: assets/portal/club-people.js#engagementNationalSwimmerIdentityKey */

  /* extracted-function: assets/portal/club-people.js#engagementNationalSwimmerDuplicateAlertLabel */

  /* extracted-function: assets/portal/club-people.js#selectedEngagementNationalSwimmerMergeKeys */

  /* extracted-function: assets/portal/club-people.js#selectedEngagementNationalSwimmerKeepKey */

  /* extracted-function: assets/portal/club-people.js#updateEngagementNationalSwimmerSelectionState */

  /* extracted-function: assets/portal/club-people.js#setEngagementNationalSwimmerMergeMode */

  /* extracted-function: assets/portal/club-entry-state.js#selectedEngagementClubSwimmerRows */

  /* extracted-function: assets/portal/club-entry-state.js#selectedEngagementClubEntryRowsBySwimmerId */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubIndividualEvents */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubSelectedIndividualEventCodes */

  /* extracted-function: assets/portal/club-entry-state.js#formatEngagementEntryTimeInput */

  /* extracted-function: assets/portal/club-entry-state.js#normalizeEngagementEntryTimeInput */

  /* extracted-function: assets/portal/club-entry-state.js#engagementEntryTimeDisplayLabel */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubSwimmerEventTimesCacheKey */

  /* extracted-function: assets/portal/club-entry-state.js#mergeEngagementClubSwimmerEventTimes */

  /* extracted-function: assets/portal/club-entry-state.js#markEngagementClubSwimmerEventTimesError */

  /* extracted-function: assets/portal/club-entry-state.js#flushEngagementClubSwimmerEventTimesBatch */

  /* extracted-function: assets/portal/club-entry-state.js#ensureEngagementClubSwimmerEventTimes */

  /* extracted-function: assets/portal/club-entry-state.js#engagementEntryTimeHelpLabel */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubProgramSessionsForEntries */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubProgramItemAllowsSwimmer */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubProgramSessionsForSex */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubProgramItemLabel */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubEntryRowCountLabel */

  /* extracted-function: assets/portal/club-entry-state.js#updateEngagementClubEntryRowCount */

  /* extracted-function: assets/portal/club-entry-state.js#updateEngagementClubSwimmersSummary */

  /* extracted-function: assets/portal/club-entry-state.js#syncEngagementClubEntriesSaveBar */

  /* extracted-function: assets/portal/club-entry-state.js#setEngagementClubEntriesDirty */

  /* extracted-function: assets/portal/club-entry-state.js#markEngagementClubEntrySwimmerDirty */

  /* extracted-function: assets/portal/club-entry-state.js#setEngagementClubPersistedSwimmers */

  /* extracted-function: assets/portal/club-entry-state.js#cloneEngagementClubEntry */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubWorkspaceScopeKey */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubWorkspaceCacheKey */

  /* extracted-function: assets/portal/club-entry-state.js#readEngagementClubWorkspaceCache */

  /* extracted-function: assets/portal/club-entry-state.js#writeEngagementClubWorkspaceCache */

  /* extracted-function: assets/portal/club-entry-state.js#clearEngagementClubWorkspaceSessionCaches */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubSwimmersCacheKey */

  /* extracted-function: assets/portal/club-entry-state.js#readEngagementClubSwimmersCache */

  /* extracted-function: assets/portal/club-entry-state.js#writeEngagementClubSwimmersCache */

  /* extracted-function: assets/portal/club-entry-state.js#invalidateEngagementClubSwimmersCache */

  /* extracted-function: assets/portal/club-entry-state.js#clearEngagementClubSwimmersSessionCaches */

  /* extracted-function: assets/portal/club-entry-state.js#pendingEngagementClubWorkspaceRequest */

  /* extracted-function: assets/portal/club-entry-state.js#preloadEngagementClubWorkspaces */

  /* extracted-function: assets/portal/club-entry-state.js#scheduleEngagementClubWorkspacePreload */

  /* extracted-function: assets/portal/club-entry-state.js#resetEngagementClubTransientMessages */

  /* extracted-function: assets/portal/club-entry-state.js#rememberEngagementClubPersistedEntry */

  /* extracted-function: assets/portal/club-entry-state.js#captureEngagementClubEntriesViewport */

  /* extracted-function: assets/portal/club-entry-state.js#restoreEngagementClubEntriesViewport */

  /* extracted-function: assets/portal/club-entry-state.js#renderEngagementClubMutationResult */

  /* extracted-function: assets/portal/club-entry-state.js#mergeEngagementClubEntryWithLocalSwimmerSelections */

  /* extracted-function: assets/portal/club-entry-state.js#queueEngagementClubEntryMutation */

  /* extracted-function: assets/portal/club-entry-state.js#flushEngagementClubSwimmerSelections */

  /* extracted-function: assets/portal/club-entry-state.js#persistEngagementClubSwimmerSelection */

  /* extracted-function: assets/portal/club-entry-state.js#removeEngagementClubSwimmerFromCourses */

  /* extracted-function: assets/portal/club-entry-state.js#resetEngagementClubEntriesAutosave */

  /* extracted-function: assets/portal/club-entry-state.js#discardPendingEngagementClubIndividualEntries */

  /* extracted-function: assets/portal/club-entry-state.js#flushEngagementClubIndividualEntriesAutosave */

  /* extracted-function: assets/portal/club-entry-state.js#persistEngagementClubIndividualEntries */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubHasPendingWrites */

  /* extracted-function: assets/portal/club-entry-state.js#flushPendingEngagementClubWrites */

  /* extracted-function: assets/portal/club-entry-state.js#engagementNavigationBaseline */

  /* extracted-function: assets/portal/club-entry-state.js#preserveEngagementNavigation */

  /* extracted-function: assets/portal/club-entry-state.js#showEngagementNavigationRecovery */

  /* extracted-function: assets/portal/club-entry-state.js#restoreEngagementNavigation */

  /* extracted-function: assets/portal/club-entry-state.js#updateEngagementClubEntriesSummary */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubSwimmerSearchText */

  /* extracted-function: assets/portal/club-entry-state.js#engagementCategoryLabel */

  /* extracted-function: assets/portal/club-entry-state.js#engagementSeasonEndYear */

  /* extracted-function: assets/portal/club-entry-state.js#engagementSeasonEndYearFromDate */

  /* extracted-function: assets/portal/club-entry-state.js#engagementSwimmerCategory */

  /* extracted-function: assets/portal/club-entry-state.js#engagementSwimmerLicenseStatusLabel */

  /* extracted-function: assets/portal/club-entry-state.js#engagementSwimmerLicenseStatusIndicator */

  /* extracted-function: assets/portal/club-entry-state.js#setEngagementClubSwimmerRowExpanded */

  /* extracted-function: assets/portal/club-entry-state.js#engagementSwimmerDisplayName */

  /* extracted-function: assets/portal/club-entry-state.js#compareEngagementSwimmersByName */

  /* extracted-function: assets/portal/club-entry-state.js#compareEngagementSwimmersBySexAndName */

  /* extracted-function: assets/portal/club-entry-state.js#engagementPublicSwimmerProfileUrl */

  /* extracted-function: assets/portal/club-entry-state.js#engagementClubSwimmerIsActive */

  /* extracted-function: assets/portal/club-entry-views.js#renderEngagementClubSwimmersDirectory */

  /* extracted-function: assets/portal/club-entry-views.js#setEngagementClubSwimmerActivityStatus */

  /* extracted-function: assets/portal/club-entry-views.js#requestEngagementClubSwimmerDeletion */

  /* extracted-function: assets/portal/club-entry-views.js#renderEngagementClubSelectedSwimmersPreview */

  /* extracted-function: assets/portal/club-entry-views.js#renderEngagementClubSwimmers */

  /* extracted-function: assets/portal/club-entry-views.js#renderEngagementClubEntriesTable */

  /* extracted-function: assets/portal/club-entry-views.js#initializeEngagementCourseScrollHints */

  /* extracted-function: assets/portal/club-entry-views.js#renderEngagementClubEntries */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClubTimesDialogSwimmer */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClubTimesDialogEventCodes */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClubEntryTimeHistoryLabel */

  /* extracted-function: assets/portal/club-entry-views.js#updateEngagementClubTimeDialogHelp */

  /* extracted-function: assets/portal/club-entry-views.js#populateEngagementClubEntryTimeHistory */

  /* extracted-function: assets/portal/club-entry-views.js#loadEngagementClubEntryTimeHistory */

  /* extracted-function: assets/portal/club-entry-views.js#renderEngagementClubTimesDialog */

  /* extracted-function: assets/portal/club-entry-views.js#openEngagementClubTimesDialog */

  /* extracted-function: assets/portal/club-entry-views.js#closeEngagementClubTimesDialog */

  /* extracted-function: assets/portal/club-entry-views.js#applyEngagementClubTimesDialog */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClubRelayEvents */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClubRelaySessionLabel */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayCategoryOptions */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayGenderOptions */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClubRelaySwimmerOptions */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayLegCount */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayLegPlaceholder */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayLegChoiceLabel */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayPeopleWording */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayMemberShortLabel */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayMemberShortLabels */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayMemberSummary */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayExpectedMemberSex */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelaySwimmerAllowedForCategory */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayMemberOptionLabel */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelaySameDistanceNature */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayMemberAlreadyUsed */

  /* extracted-function: assets/portal/club-entry-views.js#selectedEngagementClubRelayRowsFromDom */

  /* extracted-function: assets/portal/club-entry-views.js#selectedEngagementClubRelayRows */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClubRelayNeedsCompletion */

  /* extracted-function: assets/portal/club-entry-views.js#reconcileEngagementClubRelayDraft */

  /* extracted-function: assets/portal/club-entry-views.js#focusEngagementClubRelayControl */

  /* extracted-function: assets/portal/club-entry-views.js#focusFirstIncompleteEngagementClubRelay */

  /* extracted-function: assets/portal/club-entry-views.js#selectedEngagementClubRelayRowsFromElement */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClubRelayDialogRelay */

  /* extracted-function: assets/portal/club-entry-views.js#readEngagementClubRelayDialogDraft */

  /* extracted-function: assets/portal/club-entry-views.js#syncEngagementClubRelayDialogMemberOptions */

  /* extracted-function: assets/portal/club-entry-views.js#renderEngagementClubRelayDialog */

  /* extracted-function: assets/portal/club-entry-views.js#openEngagementClubRelayDialog */

  /* extracted-function: assets/portal/club-entry-views.js#closeEngagementClubRelayDialog */

  /* extracted-function: assets/portal/club-entry-views.js#applyEngagementClubRelayDialog */

  /* extracted-function: assets/portal/club-entry-views.js#resetEngagementClubRelayDialogMembers */

  /* extracted-function: assets/portal/club-entry-views.js#engagementRelayMemberAge */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClubRelayValidationIssues */

  /* extracted-function: assets/portal/club-entry-views.js#updateEngagementClubRelaysSummary */

  /* extracted-function: assets/portal/club-entry-views.js#currentEngagementClubSwimmersForSummary */

  /* extracted-function: assets/portal/club-entry-views.js#currentEngagementClubOfficialCount */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClubSummaryTeamLeaderLabel */

  /* extracted-function: assets/portal/club-entry-views.js#renderEngagementClubSummary */

  // Show the saved native dossier without applying new-entry completion rules.
  // Existing categories, compact times and relay compositions are never rewritten.
  /* extracted-function: assets/portal/club-entry-views.js#renderEngagementClubNativeSummary */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClubPersistedRelayDraft */

  /* extracted-function: assets/portal/club-entry-views.js#renderEngagementClubRelays */

  /* extracted-function: assets/portal/club-entry-views.js#updateEngagementClubTeamFormMode */

  /* extracted-function: assets/portal/club-entry-views.js#renderEngagementClubEntry */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClosureAutomationStatusLabel */

  /* extracted-function: assets/portal/club-entry-views.js#engagementClosureAutomationStatusTone */

  /* extracted-function: assets/portal/documents-and-program.js#formatEngagementAutomationDate */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementClosureAutomation */

  /* extracted-function: assets/portal/documents-and-program.js#loadEngagementClubRecapFiles */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementClubRecapSelector */

  /* extracted-function: assets/portal/documents-and-program.js#engagementStatisticsTimeModeLabel */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementCompetitionStatistics */

  /* extracted-function: assets/portal/documents-and-program.js#loadEngagementCompetitionStatistics */

  /* extracted-function: assets/portal/documents-and-program.js#engagementMailJobTypeLabel */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementMailJobs */

  /* extracted-function: assets/portal/documents-and-program.js#loadEngagementMailJobs */

  const ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES = 2 * 1024 * 1024;
  const ENGAGEMENT_COMPETITION_DOCUMENT_NATIONAL_MAX_BYTES = 10 * 1024 * 1024;
  const ENGAGEMENT_COMPETITION_DOCUMENT_MAX_COUNT = 20;
  const ENGAGEMENT_COMPETITION_DOCUMENT_EXTENSION_PATTERN = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp|jpe?g|png|zip)$/i;

  /* extracted-function: assets/portal/documents-and-program.js#engagementCompetitionDocumentCategoryLabel */

  /* extracted-function: assets/portal/documents-and-program.js#engagementCompetitionDocumentCategoryOptions */

  /* extracted-function: assets/portal/documents-and-program.js#engagementCompetitionDocumentFileSize */

  /* extracted-function: assets/portal/documents-and-program.js#engagementCompetitionDocumentTypeLabel */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementCompetitionDocumentDrafts */

  /* extracted-function: assets/portal/documents-and-program.js#openEngagementCompetitionDocumentForm */

  /* extracted-function: assets/portal/documents-and-program.js#closeEngagementCompetitionDocumentForm */

  /* extracted-function: assets/portal/documents-and-program.js#engagementCompetitionDocumentDraftValues */

  /* extracted-function: assets/portal/documents-and-program.js#readEngagementCompetitionDocumentFile */

  /* extracted-function: assets/portal/documents-and-program.js#handleEngagementCompetitionDocumentFiles */

  /* extracted-function: assets/portal/documents-and-program.js#updateSelectedEngagementCompetitionDocuments */

  /* extracted-function: assets/portal/documents-and-program.js#saveEngagementCompetitionDocuments */

  /* extracted-function: assets/portal/documents-and-program.js#deleteEngagementCompetitionDocument */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementSharedDocuments */

  /* extracted-function: assets/portal/documents-and-program.js#canDownloadEngagementOpenWaterTxt */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementDocuments */

  /* extracted-function: assets/portal/documents-and-program.js#updateSelectedEngagementDocumentStatus */

  /* extracted-function: assets/portal/documents-and-program.js#engagementEventSummary */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramSummary */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramStatusSummary */

  /* extracted-function: assets/portal/documents-and-program.js#engagementEventsCompactSummary */

  /* extracted-function: assets/portal/documents-and-program.js#missingEngagementProgramEventCount */

  /* extracted-function: assets/portal/documents-and-program.js#updateEngagementEventsSectionToggleLabels */

  /* extracted-function: assets/portal/documents-and-program.js#setEngagementEventsSectionOpen */

  /* extracted-function: assets/portal/documents-and-program.js#updateEngagementEventsSectionSummaries */

  /* extracted-function: assets/portal/documents-and-program.js#engagementEventCountLabel */

  /* extracted-function: assets/portal/documents-and-program.js#selectedEngagementEventOptions */

  /* extracted-function: assets/portal/documents-and-program.js#normalizedEngagementProgramSessions */

  /* extracted-function: assets/portal/documents-and-program.js#selectedEngagementProgramSessionsFromForm */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramGenderModesForEvent */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramGenderModeShortLabel */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramGenderModeDisplayLabel */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramGenderModeTone */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramPhaseLabel */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramFormatsForEvent */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramPhaseForEvent */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramSameSlot */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramPassages */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramFormatForPhase */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramFirstPhaseForFormat */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramSecondPhaseForFormat */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramCanAddPassage */

  /* extracted-function: assets/portal/documents-and-program.js#engagementProgramNextPhase */

  /* extracted-function: assets/portal/documents-and-program.js#normalizeEngagementProgramPassageOrder */

  /* extracted-function: assets/portal/documents-and-program.js#applyEngagementProgramFormatChange */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementProgramSessions */

  /* extracted-function: assets/portal/documents-and-program.js#refreshEngagementProgramEditor */

  /* extracted-function: assets/portal/documents-and-program.js#addEngagementProgramSession */

  /* extracted-function: assets/portal/documents-and-program.js#handleEngagementProgramAction */

  /* extracted-function: assets/portal/documents-and-program.js#selectedEngagementEventsFromForm */

  /* extracted-function: assets/portal/documents-and-program.js#selectedEngagementEventsCategoryError */

  /* extracted-function: assets/portal/documents-and-program.js#selectedEngagementProgramError */

  /* extracted-function: assets/portal/documents-and-program.js#engagementAllowedCategoryCodes */

  /* extracted-function: assets/portal/documents-and-program.js#normalizeEngagementCategoryRestrictions */

  /* extracted-function: assets/portal/documents-and-program.js#engagementCategoryDefinitionsForEvent */

  /* extracted-function: assets/portal/documents-and-program.js#updateEngagementEventsSummaryFromForm */

  /* extracted-function: assets/portal/documents-and-program.js#engagementCategoryColumnInputs */

  /* extracted-function: assets/portal/documents-and-program.js#updateEngagementCategoryColumnControls */

  /* extracted-function: assets/portal/documents-and-program.js#applyEngagementCategoryColumnControl */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementOpenWaterCourseLibrary */

  /* extracted-function: assets/portal/documents-and-program.js#loadEngagementOpenWaterCourses */

  /* extracted-function: assets/portal/documents-and-program.js#addEngagementOpenWaterCourseToProgram */

  /* extracted-function: assets/portal/documents-and-program.js#addEngagementOpenWaterCourse */

  /* extracted-function: assets/portal/documents-and-program.js#setEngagementOpenWaterCourseStatus */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementEventGroup */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementEvents */

  /* extracted-function: assets/portal/documents-and-program.js#renderNativeCourseRemoval */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementCompetitions */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementCompetitionTable */

  /* extracted-function: assets/portal/documents-and-program.js#setEngagementCompetitionDetailVisible */

  /* extracted-function: assets/portal/documents-and-program.js#setEngagementClubEntryLoadingState */

  /* extracted-function: assets/portal/documents-and-program.js#engagementNativeEditWarningKind */

  /* extracted-function: assets/portal/documents-and-program.js#renderEngagementNativeEditWarnings */

  /* extracted-function: assets/portal/documents-and-program.js#engagementClubContextMessage */

  /* extracted-function: assets/portal/competition-actions.js#renderEngagementCompetitionDetail */

  /* extracted-function: assets/portal/competition-actions.js#closeEngagementCompetitionDetail */

  /* extracted-function: assets/portal/competition-actions.js#loadEngagementCompetitionDetail */

  /* extracted-function: assets/portal/competition-actions.js#engagementClubReadRetryBlocked */

  /* extracted-function: assets/portal/competition-actions.js#retryEngagementCompetitionRead */

  /* extracted-function: assets/portal/competition-actions.js#saveEngagementClubTeamLeader */

  /* extracted-function: assets/portal/competition-actions.js#removeEngagementClubTeamLeader */

  /* extracted-function: assets/portal/competition-actions.js#saveEngagementClubOfficials */

  /* extracted-function: assets/portal/competition-actions.js#renderActiveEngagementClubSwimmerConsumer */

  /* extracted-function: assets/portal/competition-actions.js#loadEngagementClubSwimmers */

  /* extracted-function: assets/portal/competition-actions.js#saveEngagementClubSwimmers */

  /* extracted-function: assets/portal/competition-actions.js#saveEngagementClubRelays */

  /* extracted-function: assets/portal/competition-actions.js#downloadEngagementClubSummaryPdf */

  /* extracted-function: assets/portal/competition-actions.js#downloadEngagementAdminClubRecapPdf */

  /* extracted-function: assets/portal/competition-actions.js#generateEngagementAdminClubRecapPdfs */

  /* extracted-function: assets/portal/competition-actions.js#generateEngagementAdminTxtExport */

  /* extracted-function: assets/portal/competition-actions.js#prepareEngagementOpeningEmails */

  /* extracted-function: assets/portal/competition-actions.js#prepareEngagementClubRecapEmails */

  /* extracted-function: assets/portal/competition-actions.js#engagementMailSendButton */

  /* extracted-function: assets/portal/competition-actions.js#engagementMailSendActionLabel */

  /* extracted-function: assets/portal/competition-actions.js#sendEngagementPreparedEmails */

  /* extracted-function: assets/portal/competition-actions.js#selectedEngagementClubNewSwimmerFromForm */

  /* extracted-function: assets/portal/competition-actions.js#formatEngagementSwimmerLicense */

  /* extracted-function: assets/portal/competition-actions.js#resetEngagementClubNewSwimmerForm */

  /* extracted-function: assets/portal/competition-actions.js#setEngagementClubNewSwimmerMessage */

  /* extracted-function: assets/portal/competition-actions.js#engagementClubNewSwimmerFormHasValues */

  /* extracted-function: assets/portal/competition-actions.js#engagementClubNewSwimmerLockReason */

  /* extracted-function: assets/portal/competition-actions.js#updateEngagementClubNewSwimmerControls */

  /* extracted-function: assets/portal/competition-actions.js#openEngagementClubNewSwimmerDialog */

  /* extracted-function: assets/portal/competition-actions.js#closeEngagementClubNewSwimmerDialog */

  /* extracted-function: assets/portal/competition-actions.js#resetEngagementClubNewSwimmerFormFromButton */

  /* extracted-function: assets/portal/competition-actions.js#renderEngagementClubNewSwimmerAlerts */

  /* extracted-function: assets/portal/competition-actions.js#renderEngagementClubSwimmerRecovery */

  /* extracted-function: assets/portal/competition-actions.js#engagementClubNewSwimmerConfirmationMessage */

  /* extracted-function: assets/portal/competition-actions.js#createEngagementClubSwimmer */

  /* extracted-function: assets/portal/competition-actions.js#recoverEngagementClubSwimmer */

  /* extracted-function: assets/portal/competition-actions.js#deleteOrRequestEngagementCompetitionDeletion */

  /* extracted-function: assets/portal/competition-actions.js#updateEngagementAccessRequestBadge */

  /* extracted-function: assets/portal/national-requests.js#renderEngagementAccessRequests */

  /* extracted-function: assets/portal/national-requests.js#loadEngagementAccessRequests */

  /* extracted-function: assets/portal/national-requests.js#setEngagementAccessRequestEditMessage */

  /* extracted-function: assets/portal/national-requests.js#closeEngagementAccessRequestEditForm */

  /* extracted-function: assets/portal/national-requests.js#openEngagementAccessRequestEditForm */

  /* extracted-function: assets/portal/national-requests.js#correctedEngagementAccessRequestFromEditForm */

  /* extracted-function: assets/portal/national-requests.js#resolveEngagementAccessRequest */

  /* extracted-function: assets/portal/national-requests.js#submitEngagementAccessRequestEdit */

  /* extracted-function: assets/portal/national-requests.js#publicAccessRequestPayloadFromForm */

  /* extracted-function: assets/portal/national-requests.js#submitPublicEngagementAccessRequest */

  /* extracted-function: assets/portal/national-requests.js#updateEngagementNationalRequestsPresentation */

  /* extracted-function: assets/portal/national-requests.js#renderEngagementDeletionRequests */

  /* extracted-function: assets/portal/national-requests.js#loadEngagementDeletionRequests */

  /* extracted-function: assets/portal/national-requests.js#updateEngagementDeletionRequestBadge */

  /* extracted-function: assets/portal/national-requests.js#resolveEngagementDeletionRequest */

  /* extracted-function: assets/portal/national-requests.js#renderEngagementNationalSwimmers */

  /* extracted-function: assets/portal/national-requests.js#updateEngagementNationalSwimmersStatus */

  /* extracted-function: assets/portal/national-requests.js#engagementSwimmerChangeSummary */

  /* extracted-function: assets/portal/national-requests.js#updateEngagementSwimmerChangeRequestsBadge */

  /* extracted-function: assets/portal/national-requests.js#renderEngagementSwimmerChangeRequests */

  /* extracted-function: assets/portal/national-requests.js#loadEngagementSwimmerChangeRequests */

  /* extracted-function: assets/portal/national-requests.js#openEngagementSwimmerChangeRequestReview */

  /* extracted-function: assets/portal/national-requests.js#resolveEngagementSwimmerChangeRequest */

  /* extracted-function: assets/portal/national-requests.js#openEngagementAccessRequestRejectDialog */

  /* extracted-function: assets/portal/national-requests.js#closeEngagementAccessRequestRejectDialog */

  /* extracted-function: assets/portal/national-requests.js#submitEngagementAccessRequestRejection */

  /* extracted-function: assets/portal/national-requests.js#closeEngagementSwimmerCorrectionDialog */

  /* extracted-function: assets/portal/national-requests.js#resetEngagementSwimmerCorrectionDialog */

  /* extracted-function: assets/portal/national-requests.js#openEngagementSwimmerCorrectionDialog */

  /* extracted-function: assets/portal/national-requests.js#updateClubIdentityCorrectionAction */

  /* extracted-function: assets/portal/national-requests.js#submitEngagementSwimmerCorrection */

  /* extracted-function: assets/portal/national-requests.js#normalizeEngagementNationalClub */

  /* extracted-function: assets/portal/national-requests.js#readEngagementNationalClubCache */

  /* extracted-function: assets/portal/national-requests.js#writeEngagementNationalClubCache */

  /* extracted-function: assets/portal/national-requests.js#engagementNationalClubSyncStart */

  /* extracted-function: assets/portal/national-requests.js#mergeEngagementNationalClubDirectory */

  /* extracted-function: assets/portal/national-requests.js#filteredEngagementNationalClubs */

  /* extracted-function: assets/portal/national-requests.js#setEngagementNationalClubAdministrators */

  /* extracted-function: assets/portal/national-requests.js#engagementNationalClubAdministratorsHtml */

  /* extracted-function: assets/portal/national-requests.js#renderEngagementNationalClubs */

  /* extracted-function: assets/portal/national-directories.js#loadEngagementNationalClubs */

  /* extracted-function: assets/portal/national-directories.js#closeEngagementNationalClubDialog */

  /* extracted-function: assets/portal/national-directories.js#openEngagementNationalClubDialog */

  /* extracted-function: assets/portal/national-directories.js#saveEngagementNationalClub */

  /* extracted-function: assets/portal/national-directories.js#deleteEngagementNationalClub */

  /* extracted-function: assets/portal/national-directories.js#engagementNationalStatusMatches */

  /* extracted-function: assets/portal/national-directories.js#filteredEngagementNationalSwimmers */

  /* extracted-function: assets/portal/national-directories.js#resetEngagementNationalSwimmerFilters */

  /* extracted-function: assets/portal/national-directories.js#loadEngagementNationalSwimmers */

  /* extracted-function: assets/portal/national-directories.js#setEngagementNationalSwimmerStatus */

  /* extracted-function: assets/portal/national-directories.js#deleteEngagementNationalSwimmer */

  /* extracted-function: assets/portal/national-directories.js#resetEngagementNationalSwimmerMergeState */

  /* extracted-function: assets/portal/national-directories.js#searchEngagementNationalSwimmerMergeTargets */

  /* extracted-function: assets/portal/national-directories.js#mergeEngagementNationalSwimmer */

  /* extracted-function: assets/portal/national-directories.js#mergeSelectedEngagementNationalSwimmers */

  /* extracted-function: assets/portal/national-directories.js#repairEngagementNationalSwimmerMergePublication */

  /* extracted-function: assets/portal/national-directories.js#renderEngagementNationalPeople */

  /* extracted-function: assets/portal/national-directories.js#updateEngagementNationalPeopleStatus */

  // Presentation only: retain every native declaration and its competition ID.
  // Missing identity fields never justify collapsing historical namesakes.
  /* extracted-function: assets/portal/national-directories.js#visibleNativePeople */

  /* extracted-function: assets/portal/national-directories.js#filteredEngagementNationalPeople */

  /* extracted-function: assets/portal/national-directories.js#resetEngagementNationalPeopleFilters */

  /* extracted-function: assets/portal/national-directories.js#engagementNationalPersonMergeCandidates */

  /* extracted-function: assets/portal/national-directories.js#engagementNationalPersonDuplicateAlertLabel */

  /* extracted-function: assets/portal/national-directories.js#engagementNationalPersonById */

  /* extracted-function: assets/portal/national-directories.js#selectedEngagementNationalPersonMergeIds */

  /* extracted-function: assets/portal/national-directories.js#selectedEngagementNationalPersonKeepId */

  /* extracted-function: assets/portal/national-directories.js#updateEngagementNationalPeopleSelectionState */

  /* extracted-function: assets/portal/national-directories.js#setEngagementNationalPeopleMergeMode */

  /* extracted-function: assets/portal/national-directories.js#loadEngagementNationalPeople */

  /* extracted-function: assets/portal/national-directories.js#setEngagementNationalPersonStatus */

  /* extracted-function: assets/portal/national-directories.js#deleteEngagementNationalPerson */

  /* extracted-function: assets/portal/national-directories.js#mergeEngagementNationalPerson */

  /* extracted-function: assets/portal/national-directories.js#mergeSelectedEngagementNationalPeople */

  const AUDIT_ACTION_METADATA = Object.freeze({
    "accessUser.created": ["Compte créé", "access"],
    "accessUser.updated": ["Compte et habilitations modifiés", "access"],
    "accessUser.activated": ["Compte activé", "access"],
    "accessUser.deactivated": ["Compte désactivé", "access"],
    "accessUser.deleted": ["Compte supprimé", "access"],
    "accessUser.emailUpdated": ["Adresse du compte modifiée", "access"],
    "accessUser.competitionEmailPreferenceUpdated": ["Préférence de notification modifiée", "access"],
    "accessUser.deletionRequested": ["Suppression de compte demandée", "requests"],
    "accessUser.deletionRequestResolved": ["Demande de suppression de compte traitée", "requests"],
    "engagementAccessRequest.submitted": ["Demande d'accès déposée", "requests"],
    "engagementAccessRequest.resolved": ["Demande d'accès traitée", "requests"],
    "engagementAccessRequest.redirectedExistingAccount": ["Demande rattachée à un compte existant", "requests"],
    "engagementClub.createdFromAccessRequest": ["Club créé depuis une demande d'accès", "clubs"],
    "engagementClub.created": ["Club créé", "clubs"],
    "engagementClub.updated": ["Club modifié", "clubs"],
    "engagementClub.deleted": ["Club supprimé", "clubs"],
    "engagementClubSwimmer.created": ["Nageur créé", "people"],
    "engagementClubSwimmer.recovered": ["Nageur restauré", "people"],
    "engagementClubSwimmer.statusChanged": ["Statut d'un nageur modifié", "people"],
    "engagementClubSwimmer.activityStatusUpdated": ["Activité d'un nageur mise à jour", "people"],
    "engagementClubSwimmer.changeRequested": ["Correction de nageur demandée", "requests"],
    "engagementClubSwimmer.changeApproved": ["Correction de nageur validée", "requests"],
    "engagementClubSwimmer.changeRejected": ["Correction de nageur refusée", "requests"],
    "engagementClubSwimmer.identityCorrected": ["Identité de nageur corrigée", "people"],
    "engagementClubSwimmer.nationalMerged": ["Fiches nageur fusionnées", "people"],
    "engagementClubSwimmer.mergePublicationRepaired": ["Publication d'une fusion nageur réparée", "technical"],
    "engagementClubSwimmer.deleted": ["Nageur supprimé", "people"],
    "engagementClubSwimmer.deletionRequested": ["Suppression de nageur demandée", "requests"],
    "engagementClubSwimmer.deletionRequestResolved": ["Demande de suppression de nageur traitée", "requests"],
    "engagementClubPerson.saved": ["Officiel enregistré", "people"],
    "engagementClubPerson.statusChanged": ["Statut d'un officiel modifié", "people"],
    "engagementClubPerson.nationalStatusChanged": ["Statut national d'un officiel modifié", "people"],
    "engagementClubPerson.nationalMerged": ["Fiches officiel fusionnées", "people"],
    "engagementClubPerson.nationalDeleted": ["Officiel supprimé", "people"],
    "engagementCompetition.created": ["Compétition créée", "competitions"],
    "engagementCompetition.updated": ["Compétition modifiée", "competitions"],
    "engagementCompetition.deleted": ["Compétition supprimée", "competitions"],
    "engagementCompetition.deletionRequested": ["Suppression de compétition demandée", "requests"],
    "engagementCompetition.deletionRequestResolved": ["Demande de suppression de compétition traitée", "requests"],
    "engagementCompetition.closedAutomatically": ["Engagements fermés automatiquement", "technical"],
    "engagementCompetition.automaticClosureFailed": ["Fermeture automatique en échec", "technical"],
    "engagementCompetition.automaticClosureSweep": ["Contrôle des fermetures automatiques", "technical"],
    "engagementCompetition.documentUploaded": ["Document de compétition ajouté", "competitions"],
    "engagementCompetition.documentReplaced": ["Document de compétition remplacé", "competitions"],
    "engagementCompetition.documentUpdated": ["Document de compétition modifié", "competitions"],
    "engagementCompetition.documentDeleted": ["Document de compétition supprimé", "competitions"],
    "engagementCompetition.documentsNotified": ["Nouveaux documents notifiés", "competitions"],
    "engagementCompetition.openingEmailsPrepared": ["Courriels d'ouverture préparés", "technical"],
    "engagementCompetition.clubRecapEmailsPrepared": ["Courriels récapitulatifs préparés", "technical"],
    "engagementCompetition.preparedEmailsSent": ["Courriels préparés envoyés", "technical"],
    "engagementCompetition.clubRecapPdfGeneratedByAdmin": ["Récapitulatif club généré", "technical"],
    "engagementCompetition.clubRecapPdfsGenerated": ["Récapitulatifs clubs générés", "technical"],
    "engagementCompetition.txtExportGenerated": ["Export WinPalme généré", "technical"],
    "engagementClubEntry.teamLeaderSaved": ["Chef d'équipe enregistré", "competitions"],
    "engagementClubEntry.teamLeaderRemoved": ["Chef d'équipe retiré", "competitions"],
    "engagementClubEntry.officialsSaved": ["Officiels de la compétition enregistrés", "competitions"],
    "engagementClubEntry.swimmerAdded": ["Nageur ajouté aux engagements", "competitions"],
    "engagementClubEntry.swimmerRemoved": ["Nageur retiré des engagements", "competitions"],
    "engagementClubEntry.swimmerSelectionsSaved": ["Sélection des nageurs enregistrée", "competitions"],
    "engagementClubEntry.swimmersSaved": ["Nageurs engagés enregistrés", "competitions"],
    "engagementClubEntry.individualEntriesSaved": ["Courses individuelles enregistrées", "competitions"],
    "engagementClubEntry.relaysSaved": ["Relais enregistrés", "competitions"],
    "engagementClubEntry.recapPdfGenerated": ["Récapitulatif d'engagement généré", "technical"],
    "engagementClubAggregates.rebuilt": ["Agrégats du club reconstruits", "technical"],
    "engagementOpenWaterCourse.created": ["Course d'eau libre créée", "competitions"],
    "engagementOpenWaterCourse.statusChanged": ["Statut d'une course d'eau libre modifié", "competitions"],
    "performanceImport.created": ["Résultats importés", "performances"],
    "performanceImport.deleted": ["Import de résultats annulé", "performances"],
    "performanceImport.publicationResumed": ["Publication d'un import reprise", "performances"],
    "performanceImport.recordAlertDecision": ["Alerte Record/MPF traitée", "performances"],
    "performancePublicData.published": ["Performances publiques publiées", "performances"],
    "recordsMpf.published": ["Records et MPF publiés", "performances"],
    "performanceCorrection.updated": ["Performance corrigée", "performances"],
    "performanceCorrection.hidden": ["Performance masquée", "performances"]
  });

  const AUDIT_DETAIL_LABELS = Object.freeze({
    sourcePersonName: "Personne source", targetPersonName: "Personne conservée",
    birthDate: "Date de naissance", sex: "Sexe", active: "Statut", capabilities: "Habilitations", changedCount: "Modifications appliquées",
    changedSwimmerCount: "Nageurs modifiés", chrono: "Chronométrage", clubCode: "Sigle du club",
    clubId: "Identifiant du club", clubName: "Club", competitionId: "Identifiant de la compétition",
    competitionName: "Compétition", date: "Date", decision: "Décision", email: "Adresse électronique",
    entryStatus: "État des engagements", eventCode: "Épreuve", federalNumber: "Numéro fédéral",
    fileName: "Fichier", hidden: "Masquée", importedPerformances: "Performances importées",
    firstName: "Prénom", individualEntryCount: "Courses individuelles", lastName: "Nom", level: "Niveau", licenseNumber: "Numéro de licence", name: "Nom",
    performanceCount: "Performances", personId: "Identifiant de la personne", reason: "Motif",
    changeCount: "Lignes modifiées", publishedAt: "Date de publication", sourceDate: "Date source", version: "Version publique",
    relayCount: "Relais", requestedChangeCount: "Modifications demandées", requestId: "Identifiant de la demande", roles: "Rôles",
    sourceClubId: "Club d'origine", status: "Statut", swimmerCount: "Nageurs engagés",
    swimmerId: "Identifiant du nageur", swimmerIndexId: "Identifiant du nageur", timingType: "Type de chronométrage",
    uid: "Identifiant utilisateur"
  });

  /* extracted-function: assets/portal/activity-journal.js#auditActionLabel */

  /* extracted-function: assets/portal/activity-journal.js#auditActionCategory */

  /* extracted-function: assets/portal/activity-journal.js#auditActorOrigin */

  /* extracted-function: assets/portal/activity-journal.js#auditActorLabel */

  /* extracted-function: assets/portal/activity-journal.js#auditActorOptionLabel */

  /* extracted-function: assets/portal/activity-journal.js#renderEngagementNationalAuditActorSuggestions */

  /* extracted-function: assets/portal/activity-journal.js#setEngagementNationalAuditActorSelection */

  /* extracted-function: assets/portal/activity-journal.js#searchEngagementNationalAuditActors */

  /* extracted-function: assets/portal/activity-journal.js#handleEngagementNationalAuditActorSearch */

  /* extracted-function: assets/portal/activity-journal.js#auditClubId */

  /* extracted-function: assets/portal/activity-journal.js#auditClubLabel */

  /* extracted-function: assets/portal/activity-journal.js#auditCompetitionLabel */

  /* extracted-function: assets/portal/activity-journal.js#auditTargetSummary */

  /* extracted-function: assets/portal/activity-journal.js#auditDateLabel */

  /* extracted-function: assets/portal/activity-journal.js#auditDetailValue */

  const AUDIT_ROLE_LABELS = Object.freeze({
    swimmer: "Nageur", official: "Officiel", teamLeader: "Chef d’équipe"
  });

  const AUDIT_CAPABILITY_LABELS = Object.freeze({
    "records.manage": "Records / MPF",
    "consoles.access": "Accès aux consoles par PIN",
    "consoles.manage": "Gestion des consoles et des PIN",
    "competitions.import": "Import des compétitions",
    "dtn.view": "Espace DTN",
      "dtn.manage": "Gérer les paramètres DTN",
    "engagements.club.manage": "Engagements club",
    "engagements.club.switch": "Changement de club national",
    "engagements.region.manage": "Engagements région",
    "engagements.national.manage": "Engagements national",
    "admin.full": "Gestion générale"
  });

  /* extracted-function: assets/portal/activity-journal.js#auditEnabledLabels */

  /* extracted-function: assets/portal/activity-journal.js#auditPersonLabel */

  /* extracted-function: assets/portal/activity-journal.js#auditReadableValue */

  /* extracted-function: assets/portal/activity-journal.js#auditDetailLabel */

  /* extracted-function: assets/portal/activity-journal.js#auditComplementaryLabel */

  /* extracted-function: assets/portal/activity-journal.js#auditValuesEqual */

  /* extracted-function: assets/portal/activity-journal.js#auditChangeRows */

  /* extracted-function: assets/portal/activity-journal.js#auditDetailIsTechnicalKey */

  /* extracted-function: assets/portal/activity-journal.js#auditTechnicalKeyIsReadable */

  /* extracted-function: assets/portal/activity-journal.js#auditDetailRows */

  /* extracted-function: assets/portal/activity-journal.js#auditTechnicalDetailsHtml */

  /* extracted-function: assets/portal/activity-journal.js#filteredEngagementNationalAuditLogs */

  /* extracted-function: assets/portal/activity-journal.js#auditEntryHtml */

  /* extracted-function: assets/portal/activity-journal.js#updateEngagementNationalAuditFilterOptions */

  /* extracted-function: assets/portal/activity-journal.js#resetEngagementNationalAuditFilters */

  /* extracted-function: assets/portal/activity-journal.js#resetEngagementNationalAuditData */

  /* extracted-function: assets/portal/activity-journal.js#renderEngagementNationalAuditLogs */

  /* extracted-function: assets/portal/activity-journal.js#loadEngagementNationalAuditLogs */

  /* extracted-function: assets/portal/activity-journal.js#engagementClubPersonRoleLabel */

  /* extracted-function: assets/portal/activity-journal.js#closeEngagementClubPersonDialog */

  /* extracted-function: assets/portal/activity-journal.js#openNativeCompetitionPersonCreation */

  /* extracted-function: assets/portal/activity-journal.js#resetEngagementClubPersonForm */

  /* extracted-function: assets/portal/club-and-competition.js#openEngagementClubPersonForm */

  /* extracted-function: assets/portal/club-and-competition.js#selectedEngagementClubPersonFromForm */

  /* extracted-function: assets/portal/club-and-competition.js#renderEngagementClubPeople */

  /* extracted-function: assets/portal/club-and-competition.js#loadEngagementClubPeople */

  /* extracted-function: assets/portal/club-and-competition.js#saveEngagementClubPerson */

  /* extracted-function: assets/portal/club-and-competition.js#setEngagementClubPersonStatus */

  /* extracted-function: assets/portal/club-and-competition.js#loadEngagementCompetitions */

  /* extracted-function: assets/portal/club-and-competition.js#engagementCompetitionPayloadFromFields */

  /* extracted-function: assets/portal/club-and-competition.js#createCompetitionFields */

  /* extracted-function: assets/portal/club-and-competition.js#editCompetitionFields */

  /* extracted-function: assets/portal/club-and-competition.js#engagementCompetitionPayloadFromForm */

  /* extracted-function: assets/portal/club-and-competition.js#engagementCompetitionPayloadFromEditForm */

  /* extracted-function: assets/portal/club-and-competition.js#nativeCompetitionFormValues */

  /* extracted-function: assets/portal/club-and-competition.js#nativeCompetitionPatchFromForm */

  /* extracted-function: assets/portal/club-and-competition.js#saveNativeCompetitionDetail */

  /* extracted-function: assets/portal/club-and-competition.js#engagementOpeningDeadlineError */

  /* extracted-function: assets/portal/club-and-competition.js#shouldSendEngagementOpeningMail */

  /* extracted-function: assets/portal/club-and-competition.js#engagementOpeningMailScopeLabel */

  /* extracted-function: assets/portal/club-and-competition.js#confirmEngagementOpeningMail */

  /* extracted-function: assets/portal/club-and-competition.js#confirmEngagementReopeningMail */

  /* extracted-function: assets/portal/club-and-competition.js#confirmOpenedCompetitionSensitiveChanges */

  /* extracted-function: assets/portal/club-and-competition.js#prepareAndSendEngagementOpeningEmails */

  /* extracted-function: assets/portal/club-and-competition.js#createEngagementCompetition */

  /* extracted-function: assets/portal/club-and-competition.js#completeNewlyCreatedEngagementCompetition */

  /* extracted-function: assets/portal/club-and-competition.js#updateEngagementCompetition */

  /* extracted-function: assets/portal/club-and-competition.js#saveEngagementCompetitionDetail */

  /* extracted-function: assets/portal/club-and-competition.js#engagementCompetitionPayloadFromSelection */

  /* extracted-function: assets/portal/club-and-competition.js#updateEngagementCompetitionEvents */

  /* extracted-function: assets/portal/club-and-competition.js#updateEngagementCompetitionFees */

  /* extracted-function: assets/portal/account-and-access.js#loadCurrentUser */

  /* extracted-function: assets/portal/account-and-access.js#updateView */

  /* extracted-function: assets/portal/account-and-access.js#signIn */

  /* extracted-function: assets/portal/account-and-access.js#sendPasswordReset */

  /* extracted-function: assets/portal/account-and-access.js#signOut */

  /* extracted-function: assets/portal/account-and-access.js#updateAccountEmail */

  /* extracted-function: assets/portal/account-and-access.js#toggleAccountNotificationPreferences */

  /* extracted-function: assets/portal/account-and-access.js#updateAccountPassword */

  /* extracted-function: assets/portal/account-and-access.js#accessPayloadFromForm */

  /* extracted-function: assets/portal/account-and-access.js#openAccessDialog */

  /* extracted-function: assets/portal/account-and-access.js#fillAccessForm */

  /* extracted-function: assets/portal/account-and-access.js#resetAccessForm */

  /* extracted-function: assets/portal/account-and-access.js#formatAccessDateTime */

  /* extracted-function: assets/portal/account-and-access.js#accessActionIcon */

  /* extracted-function: assets/portal/account-and-access.js#renderAccessUsers */

  /* extracted-function: assets/portal/account-and-access.js#renderAccessPagination */

  /* extracted-function: assets/portal/account-and-access.js#escapeHtml */

  /* extracted-function: assets/portal/account-and-access.js#accessFiltersPayload */

  /* extracted-function: assets/portal/account-and-access.js#normalizedAccessSearch */

  /* extracted-function: assets/portal/account-and-access.js#legacyFilteredAccessUsers */

  /* extracted-function: assets/portal/account-and-access.js#accessDirectorySnapshotScope */

  /* extracted-function: assets/portal/account-and-access.js#loadAccessDirectoryFirestoreModule */

  /* extracted-function: assets/portal/account-and-access.js#preloadAccessDirectoryFirestore */

  /* extracted-function: assets/portal/account-and-access.js#loadAccessDirectorySnapshot */

  /* extracted-function: assets/portal/account-and-access.js#sortedAccessUsers */

  /* extracted-function: assets/portal/account-and-access.js#accessDirectoryUserLetter */

  /* extracted-function: assets/portal/account-and-access.js#renderAccessDirectoryAlphabet */

  /* extracted-function: assets/portal/account-and-access.js#renderAccessDirectorySnapshotPage */

  /* extracted-function: assets/portal/account-and-access.js#loadAccessUsers */

  /* extracted-function: assets/portal/account-and-access.js#showNextAccessPage */

  /* extracted-function: assets/portal/account-and-access.js#showPreviousAccessPage */

  /* extracted-function: assets/portal/account-and-access.js#refreshAccessUsersAfterMutation */

  /* extracted-function: assets/portal/account-and-access.js#setAccessStatus */

  /* extracted-function: assets/portal/account-and-access.js#renderAccessDeletionRequests */

  /* extracted-function: assets/portal/account-and-access.js#loadAccessDeletionRequests */

  /* extracted-function: assets/portal/account-and-access.js#deleteAccessUser */

  /* extracted-function: assets/portal/account-and-access.js#requestAccessUserDeletion */

  /* extracted-function: assets/portal/account-and-access.js#resolveAccessDeletionRequest */

  /* extracted-function: assets/portal/account-and-access.js#saveAccessUser */

    /* extracted-function: assets/portal/events.js#bindEngagementClubPeopleRetry */
    /* extracted-function: assets/portal/events.js#init */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
