(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    function bindEngagementClubPeopleRetry() {
        portalContext.elements.engagementsClubPeopleRetry?.addEventListener("click", () => portalActions.loadEngagementClubPeople({ force: true }));
      }

    function init() {
        portalActions.initializePortalNavigationLabels();
        if (!portalState.engagementDeadlineCountdownTimer) {
          portalState.engagementDeadlineCountdownTimer = global.setInterval(portalActions.refreshEngagementDeadlineCountdowns, 60000);
        }
        portalActions.restorePortalNavigationPinned();
        portalActions.restoreActiveEngagementClubFromSession();
        portalActions.populateLivePalmesRegionSelects();
        portalActions.populateAccessClubSelect();
        portalActions.populateEngagementSeasonFilter();
        const auth = portalActions.ensureAdminAuth();
        portalActions.updateView(auth?.status?.() || {});
        bindEngagementClubPeopleRetry();
        portalContext.elements.form?.addEventListener("submit", portalActions.signIn);
        portalContext.elements.passwordToggle?.addEventListener("click", portalActions.toggleLoginPasswordVisibility);
        portalContext.elements.scopeClubButton?.addEventListener("click", portalActions.openClubSwitchDialog);
        portalContext.elements.accountClubSwitch?.addEventListener("click", () => {
          portalActions.closeAccountMenu();
          portalActions.openClubSwitchDialog();
        });
        portalContext.elements.clubSwitchSearch?.addEventListener("input", portalActions.renderClubSwitchResults);
        portalContext.elements.clubSwitchResults?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-portal-active-club-id]");
          if (!button) return;
          portalActions.changeActiveEngagementClub(button.dataset.portalActiveClubId || "");
        });
        portalContext.elements.clubSwitchReset?.addEventListener("click", () => portalActions.changeActiveEngagementClub(""));
        portalContext.elements.clubSwitchClose?.addEventListener("click", () => portalContext.elements.clubSwitchDialog?.close());
        portalContext.elements.reset?.addEventListener("click", portalActions.sendPasswordReset);
        portalContext.elements.publicAccessRequestForm?.addEventListener("submit", portalActions.submitPublicEngagementAccessRequest);
        portalContext.elements.publicAccessRequestLastName?.addEventListener("input", (event) => {
          event.currentTarget.value = event.currentTarget.value.toLocaleUpperCase("fr-FR");
        });
        portalContext.elements.publicAccessRequestRegionId?.addEventListener("change", () => {
          if (portalContext.elements.publicAccessRequestNewClub?.checked !== true) {
            void portalActions.loadAccessClubReference().then(() => portalActions.populatePublicAccessRequestClubSelect());
          }
        });
        portalContext.elements.publicAccessRequestClubSelect?.addEventListener("focus", () => void portalActions.loadAccessClubReference().then(() => portalActions.populatePublicAccessRequestClubSelect()));
        portalContext.elements.publicAccessRequestClubSelect?.addEventListener("change", portalActions.syncPublicAccessRequestClubFieldsFromSelect);
        portalContext.elements.publicAccessRequestNewClub?.addEventListener("change", () => portalActions.updatePublicAccessRequestNewClubMode());
        portalContext.elements.publicAccessRequestNewClubFederalNumber?.addEventListener("input", (event) => {
          event.currentTarget.value = event.currentTarget.value.toUpperCase();
        });
        portalContext.elements.publicAccessRequestNewClubFederalNumber?.addEventListener("change", () => {
          void portalActions.matchPublicAccessRequestClubByFederalNumber();
        });
        portalContext.elements.signOut?.addEventListener("click", portalActions.signOut);
        portalContext.elements.engagementsMailJobsList?.addEventListener("click", (event) => {
          if (event.target.closest("[data-engagement-mail-jobs-refresh]")) void portalActions.loadEngagementMailJobs({ force: true });
          if (event.target.closest("[data-engagement-mail-jobs-more]")) void portalActions.loadEngagementMailJobs({ append: true });
        });
        portalContext.elements.engagementsDeletionRequestsRefresh?.addEventListener("click", () => portalActions.loadEngagementDeletionRequests({ force: true }));
        portalContext.elements.engagementsNationalSwimmersRefresh?.addEventListener("click", () => portalActions.loadEngagementNationalSwimmers({ force: true }));
        portalContext.elements.engagementsCalendarFilters?.addEventListener("submit", (event) => event.preventDefault());
        [portalContext.elements.engagementsRegionFilter, portalContext.elements.engagementsLevelFilter, portalContext.elements.engagementsTypeFilter, portalContext.elements.engagementsStatusFilter, portalContext.elements.engagementsMineFilter].forEach((filter) => {
          filter?.addEventListener("change", () => {
            portalState.engagementCompetitionsVisibleLimit = 24;
            portalState.engagementPastCompetitionsVisibleLimit = 24;
            portalState.engagementPastCompetitionsExpanded = false;
            portalActions.syncEngagementStatusSegments();
            portalActions.renderEngagementCompetitions();
          });
        });
        portalContext.elements.engagementsSeasonFilter?.addEventListener("change", () => {
          portalState.engagementCompetitionsVisibleLimit = 24;
          portalState.engagementPastCompetitionsVisibleLimit = 24;
          portalState.engagementPastCompetitionsExpanded = false;
          portalActions.loadEngagementCompetitions({ force: true });
        });
        portalContext.elements.engagementsStatusSegmentButtons?.forEach((button) => {
          button.addEventListener("click", () => {
            if (portalContext.elements.engagementsStatusFilter) portalContext.elements.engagementsStatusFilter.value = button.dataset.engagementStatus || "";
            portalState.engagementCompetitionsVisibleLimit = 24;
            portalState.engagementPastCompetitionsVisibleLimit = 24;
            portalState.engagementPastCompetitionsExpanded = false;
            portalActions.syncEngagementStatusSegments();
            portalActions.renderEngagementCompetitions();
          });
        });
        portalContext.elements.engagementsFiltersReset?.addEventListener("click", () => {
          portalActions.resetEngagementCalendarFilters();
          const filters = portalActions.engagementCalendarFiltersPayload();
          const requestedRange = portalActions.engagementCalendarRequestedRange(filters);
          if (portalState.engagementCompetitionsLoadedRange === requestedRange) portalActions.renderEngagementCompetitions();
          else portalActions.loadEngagementCompetitions({ force: true });
        });
        portalContext.elements.engagementsTabButtons?.forEach((button) => {
          button.addEventListener("click", () => {
            portalActions.setEngagementsTab(button.dataset.engagementsTabButton);
            if (portalState.activeEngagementsTab === "calendar") portalActions.loadEngagementCompetitions();
            if (portalState.activeEngagementsTab === "accessRequests") portalActions.loadEngagementAccessRequests();
            if (portalState.activeEngagementsTab === "deletionRequests") portalActions.loadActiveEngagementNationalTab();
            if (portalState.activeEngagementsTab === "clubPeople") {
              portalActions.loadEngagementClubPeople();
              portalActions.loadEngagementClubSwimmers({ silent: true });
            }
            if (portalState.activeEngagementsTab === "clubSwimmers") portalActions.loadEngagementClubSwimmers();
            portalActions.updateNavigationView();
          });
        });
        portalContext.elements.engagementsDetailTabButtons?.forEach((button) => {
          button.addEventListener("click", () => portalActions.requestEngagementDetailTab(button.dataset.engagementsDetailTabButton));
        });
        portalContext.elements.engagementsDetailRetry?.addEventListener("click", portalActions.retryEngagementCompetitionRead);
        portalContext.elements.engagementsDetail?.addEventListener("click", async (event) => {
          if (!event.target.closest?.("[data-engagement-go-swimmers]")) return;
          await portalActions.requestEngagementDetailTab("swimmers");
          Array.from(portalContext.elements.engagementsDetailTabButtons || []).find(button => button.dataset.engagementsDetailTabButton === portalState.activeEngagementsDetailTab)?.focus();
        });
        portalContext.elements.engagementsUnsavedSave?.addEventListener("click", () => portalActions.resolveEngagementUnsavedDecision("save"));
        portalContext.elements.engagementsUnsavedDiscard?.addEventListener("click", () => portalActions.resolveEngagementUnsavedDecision("discard"));
        portalContext.elements.engagementsUnsavedStay?.addEventListener("click", () => portalActions.resolveEngagementUnsavedDecision("stay"));
        portalContext.elements.engagementsUnsavedDialog?.addEventListener("cancel", (event) => {
          event.preventDefault();
          portalActions.resolveEngagementUnsavedDecision("stay");
        });
        portalContext.elements.engagementsDetailStepButtons?.forEach((button) => {
          button.addEventListener("click", () => {
            const requestedGroup = button.dataset.engagementStepButton || "";
            const groupTabs = portalActions.engagementDetailTabsForGroup(requestedGroup);
            const visibleTabs = new Set(portalActions.visibleEngagementDetailTabs());
            const preferredClubTab = !portalActions.isEngagementAdminMode()
              && requestedGroup === "participants"
              && portalActions.engagementClubTeamComplete()
              && visibleTabs.has("swimmers")
              ? "swimmers"
              : "";
            if (requestedGroup === portalActions.engagementDetailTabGroup(portalState.activeEngagementsDetailTab)
              && (!preferredClubTab || portalState.activeEngagementsDetailTab === preferredClubTab)) return;
            const target = preferredClubTab || groupTabs.find((tab) => visibleTabs.has(tab)) || "";
            if (target) portalActions.requestEngagementDetailTab(target);
          });
        });
        portalContext.elements.engagementsCalendarList?.addEventListener("toggle", (event) => {
          if (event.target.isConnected && event.target.matches?.("[data-engagement-past]")) portalState.engagementPastCompetitionsExpanded = event.target.open;
        }, true);
        portalContext.elements.engagementsCalendarList?.addEventListener("click", (event) => {
          if (event.target.closest("[data-engagement-filters-reset]")) {
            portalActions.resetEngagementCalendarFilters();
            const filters = portalActions.engagementCalendarFiltersPayload();
            const requestedRange = portalActions.engagementCalendarRequestedRange(filters);
            if (portalState.engagementCompetitionsLoadedRange === requestedRange) portalActions.renderEngagementCompetitions();
            else portalActions.loadEngagementCompetitions({ force: true });
            return;
          }
          if (event.target.closest("[data-engagement-show-more]")) {
            if (event.target.closest("[data-engagement-show-more]").dataset.engagementShowMore === "past") {
              portalState.engagementPastCompetitionsVisibleLimit += 24;
              portalState.engagementPastCompetitionsExpanded = true;
            } else portalState.engagementCompetitionsVisibleLimit += 24;
            portalActions.renderEngagementCompetitions();
            return;
          }
          const button = event.target.closest("[data-engagement-competition-id]");
          if (button) {
            const item = portalState.engagementCompetitions.find((competition) => competition.id === button.dataset.engagementCompetitionId);
            if (item?.sourceType === "calendarEvent") global.LivePalmesCalendarEvents?.open?.(item.id);
            else portalActions.loadEngagementCompetitionDetail(button.dataset.engagementCompetitionId, button.dataset.engagementOpenTab || "general");
            return;
          }
          const card = event.target.closest("[data-engagement-competition-card-id]");
          if (card) {
            const item = portalState.engagementCompetitions.find((competition) => competition.id === card.dataset.engagementCompetitionCardId);
            if (item?.sourceType === "calendarEvent") global.LivePalmesCalendarEvents?.open?.(item.id);
            else portalActions.loadEngagementCompetitionDetail(card.dataset.engagementCompetitionCardId, card.dataset.engagementOpenTab || "general");
          }
        });
        portalContext.elements.engagementsDeletionRequestsList?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-engagement-deletion-action]");
          if (!button) return;
          const action = button.dataset.engagementDeletionAction;
          if (action === "view") {
            portalActions.setEngagementsTab("calendar");
            global.location.hash = "#competitions-calendrier";
            if (button.dataset.engagementSourceType === "calendarEvent") {
              global.LivePalmesCalendarEvents?.open?.(button.dataset.engagementEventId);
            } else {
              portalActions.loadEngagementCompetitionDetail(button.dataset.engagementEventId);
            }
            return;
          }
          const decision = action === "approve" ? "approved" : action === "reject" ? "rejected" : "";
          if (decision) portalActions.resolveEngagementDeletionRequest(
            button.dataset.engagementDeletionRequestId,
            decision,
            button.dataset.engagementDeletionRequestType || "competition"
          );
        });
        portalContext.elements.engagementsAccessRequestsList?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-engagement-access-request-action]");
          if (!button) return;
          if (button.dataset.engagementAccessRequestAction === "edit") {
            portalActions.openEngagementAccessRequestEditForm(button.dataset.engagementAccessRequestId || "");
            return;
          }
          if (button.dataset.engagementAccessRequestAction === "reject") {
            portalActions.openEngagementAccessRequestRejectDialog(button.dataset.engagementAccessRequestId || "");
          }
        });
        portalContext.elements.engagementsAccessRequestEditForm?.addEventListener("submit", portalActions.submitEngagementAccessRequestEdit);
        portalContext.elements.engagementsAccessRequestEditCancel?.addEventListener("click", portalActions.closeEngagementAccessRequestEditForm);
        portalContext.elements.engagementsAccessRequestEditDialog?.addEventListener("cancel", (event) => {
          event.preventDefault();
          portalActions.closeEngagementAccessRequestEditForm();
        });
        portalContext.elements.engagementsAccessRequestEditRegionId?.addEventListener("change", () => portalActions.populateEngagementAccessRequestEditClubSelect());
        portalContext.elements.engagementsAccessRequestEditClubSelect?.addEventListener("change", portalActions.syncEngagementAccessRequestEditClubFieldsFromSelect);
        portalContext.elements.engagementsAccessRequestRejectForm?.addEventListener("submit", portalActions.submitEngagementAccessRequestRejection);
        portalContext.elements.engagementsAccessRequestRejectCancel?.addEventListener("click", portalActions.closeEngagementAccessRequestRejectDialog);
        portalContext.elements.engagementsAccessRequestRejectDialog?.addEventListener("cancel", (event) => {
          event.preventDefault();
          portalActions.closeEngagementAccessRequestRejectDialog();
        });
        portalContext.elements.engagementsNationalTabButtons?.forEach((button) => {
          button.addEventListener("click", () => {
            const tab = button.dataset.engagementsNationalTabButton;
            portalActions.setEngagementNationalTab(tab);
            const hash = portalConfig.ENGAGEMENT_NATIONAL_HASH_BY_TAB[tab];
            if (hash && global.location.hash !== hash) global.location.hash = hash;
          });
        });
        portalContext.elements.engagementsNationalAccountsRefresh?.addEventListener("click", () => portalActions.loadAccessDeletionRequests({ force: true }));
        portalContext.elements.engagementsNationalClubsSearch?.addEventListener("input", () => {
          portalState.engagementNationalClubsVisibleLimit = portalConfig.ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
          portalActions.renderEngagementNationalClubs();
        });
        portalContext.elements.engagementsNationalClubsStatusFilter?.addEventListener("change", () => {
          portalState.engagementNationalClubsVisibleLimit = portalConfig.ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
          portalActions.renderEngagementNationalClubs();
        });
        portalContext.elements.engagementsNationalClubsRegionFilter?.addEventListener("change", () => {
          portalState.engagementNationalClubsVisibleLimit = portalConfig.ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
          portalActions.renderEngagementNationalClubs();
        });
        portalContext.elements.engagementsNationalClubsReset?.addEventListener("click", () => {
          if (portalContext.elements.engagementsNationalClubsSearch) portalContext.elements.engagementsNationalClubsSearch.value = "";
          if (portalContext.elements.engagementsNationalClubsStatusFilter) portalContext.elements.engagementsNationalClubsStatusFilter.value = "";
          if (portalContext.elements.engagementsNationalClubsRegionFilter) portalContext.elements.engagementsNationalClubsRegionFilter.value = "";
          portalState.engagementNationalClubsVisibleLimit = portalConfig.ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
          portalActions.renderEngagementNationalClubs();
        });
        portalContext.elements.engagementsNationalClubsCreate?.addEventListener("click", () => portalActions.openEngagementNationalClubDialog());
        portalContext.elements.engagementsNationalClubsList?.addEventListener("click", (event) => {
          if (event.target.closest("[data-engagement-national-clubs-show-more]")) {
            portalState.engagementNationalClubsVisibleLimit += portalConfig.ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
            portalActions.renderEngagementNationalClubs();
            return;
          }
          const button = event.target.closest("[data-engagement-national-club-edit]");
          if (button) portalActions.openEngagementNationalClubDialog(button.dataset.engagementNationalClubEdit || "");
        });
        portalContext.elements.engagementsNationalClubForm?.addEventListener("submit", portalActions.saveEngagementNationalClub);
        portalContext.elements.engagementsNationalClubClose?.addEventListener("click", portalActions.closeEngagementNationalClubDialog);
        portalContext.elements.engagementsNationalClubCancel?.addEventListener("click", portalActions.closeEngagementNationalClubDialog);
        portalContext.elements.engagementsNationalClubDelete?.addEventListener("click", portalActions.deleteEngagementNationalClub);
        portalContext.elements.engagementsNationalAccountsList?.addEventListener("click", (event) => {
          const decisionButton = event.target.closest("[data-access-deletion-decision]");
          if (!decisionButton) return;
          portalActions.resolveAccessDeletionRequest(
            decisionButton.dataset.accessDeletionRequestId,
            decisionButton.dataset.accessDeletionDecision,
            portalContext.elements.engagementsNationalAccountsStatus
          );
        });
        portalContext.elements.engagementsNationalAuditRefresh?.addEventListener("click", () => portalActions.loadEngagementNationalAuditLogs({ force: true }));
        portalContext.elements.engagementsNationalAuditSearch?.addEventListener("input", portalActions.renderEngagementNationalAuditLogs);
        portalContext.elements.engagementsNationalAuditPeriod?.addEventListener("change", () => portalActions.loadEngagementNationalAuditLogs({ force: true }));
        portalContext.elements.engagementsNationalAuditClub?.addEventListener("change", () => portalActions.loadEngagementNationalAuditLogs({ force: true }));
        portalContext.elements.engagementsNationalAuditActorSearch?.addEventListener("input", portalActions.handleEngagementNationalAuditActorSearch);
        portalContext.elements.engagementsNationalAuditType?.addEventListener("change", portalActions.renderEngagementNationalAuditLogs);
        portalContext.elements.engagementsNationalAuditOrigin?.addEventListener("change", portalActions.renderEngagementNationalAuditLogs);
        portalContext.elements.engagementsNationalAuditReset?.addEventListener("click", portalActions.resetEngagementNationalAuditFilters);
        portalContext.elements.engagementsNationalAuditLoadMore?.addEventListener("click", () => portalActions.loadEngagementNationalAuditLogs({ append: true }));
        portalContext.elements.engagementsNationalSwimmersList?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-engagement-national-swimmer-action]");
          if (!button) return;
          const action = button.dataset.engagementNationalSwimmerAction;
          const swimmerId = button.dataset.engagementNationalSwimmerId || "";
          const swimmerSource = button.dataset.engagementNationalSwimmerSource || "engagement";
          const swimmerKey = `${swimmerSource}:${swimmerId}`;
          if (action === "edit") {
            const swimmer = portalState.engagementNationalSwimmers.find((item) =>
              (item.source || "performances") === swimmerSource && (item.id === swimmerId || item.swimmerIndexId === swimmerId)
            );
            if (swimmer) portalActions.openEngagementSwimmerCorrectionDialog(swimmer, "direct", button);
          } else if (action === "disable" || action === "enable") {
            portalActions.setEngagementNationalSwimmerStatus(swimmerId, action === "enable");
          } else if (action === "delete") {
            portalActions.deleteEngagementNationalSwimmer(swimmerId);
          } else if (action === "repair-publication") {
            portalActions.repairEngagementNationalSwimmerMergePublication(swimmerId, swimmerSource);
          } else if (action === "merge") {
            portalState.engagementNationalSwimmerMergeSourceId = portalState.engagementNationalSwimmerMergeSourceId === swimmerKey ? "" : swimmerKey;
            portalState.engagementNationalSwimmerMergeTargets = [];
            const source = portalState.engagementNationalSwimmers.find((item) =>
              (item.source || "performances") === swimmerSource && (item.id === swimmerId || item.swimmerIndexId === swimmerId)
            ) || {};
            portalState.engagementNationalSwimmerMergeQuery = [source.firstName, source.lastName].filter(Boolean).join(" ") || source.licenseNumber || "";
            portalActions.renderEngagementNationalSwimmers();
            portalActions.searchEngagementNationalSwimmerMergeTargets(swimmerId, swimmerSource);
          } else if (action === "cancel-merge") {
            portalActions.resetEngagementNationalSwimmerMergeState();
            portalActions.renderEngagementNationalSwimmers();
          } else if (action === "search-merge") {
            portalActions.searchEngagementNationalSwimmerMergeTargets(swimmerId, swimmerSource);
          } else if (action === "confirm-merge") {
            const card = button.closest("[data-engagement-national-swimmer-key]");
            const targetValue = card?.querySelector("[data-engagement-national-swimmer-merge-target]")?.value || "";
            portalActions.mergeEngagementNationalSwimmer(swimmerId, swimmerSource, targetValue);
          }
        });
        portalContext.elements.engagementsNationalSwimmersList?.addEventListener("change", (event) => {
          const keep = event.target.closest("[data-engagement-national-swimmer-keep]");
          const merge = event.target.closest("[data-engagement-national-swimmer-merge-check]");
          if (keep?.checked) {
            const duplicateMerge = Array.from(portalContext.elements.engagementsNationalSwimmersList?.querySelectorAll("[data-engagement-national-swimmer-merge-check]") || [])
              .find((item) => item.value === keep.value);
            if (duplicateMerge) duplicateMerge.checked = false;
          }
          if (merge?.checked) {
            const currentKeep = portalActions.selectedEngagementNationalSwimmerKeepKey();
            if (currentKeep && currentKeep === merge.value) merge.checked = false;
          }
          portalActions.updateEngagementNationalSwimmerSelectionState();
        });
        portalContext.elements.engagementsNationalSwimmersSearch?.addEventListener("input", () => {
          portalState.engagementNationalSwimmersLoaded = false;
          if (!String(portalContext.elements.engagementsNationalSwimmersSearch?.value || "").trim()) portalActions.resetEngagementNationalSwimmerFilters();
        });
        portalContext.elements.engagementsNationalSwimmersSearch?.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            portalActions.loadEngagementNationalSwimmers({ force: true });
          }
        });
        portalContext.elements.engagementsNationalSwimmersStatusFilter?.addEventListener("change", portalActions.renderEngagementNationalSwimmers);
        portalContext.elements.engagementsNationalSwimmersReset?.addEventListener("click", portalActions.resetEngagementNationalSwimmerFilters);
        portalContext.elements.engagementsNationalSwimmersMergeMode?.addEventListener("click", () => {
          portalActions.setEngagementNationalSwimmerMergeMode(!portalState.engagementNationalSwimmerMergeMode);
        });
        portalContext.elements.engagementsNationalSwimmersBulkMerge?.addEventListener("click", portalActions.mergeSelectedEngagementNationalSwimmers);
        portalContext.elements.engagementsSwimmerChangeRequestsList?.addEventListener("click", (event) => {
          const editButton = event.target.closest("[data-engagement-swimmer-change-edit]");
          if (editButton) {
            portalActions.openEngagementSwimmerChangeRequestReview(
              editButton.dataset.engagementSwimmerChangeEdit || "",
              editButton,
              editButton.closest("[data-engagement-swimmer-change-request]")
            );
            return;
          }
          const button = event.target.closest("[data-engagement-swimmer-change-decision]");
          if (!button) return;
          portalActions.resolveEngagementSwimmerChangeRequest(
            button.dataset.engagementSwimmerChangeRequestId || "",
            button.dataset.engagementSwimmerChangeDecision || "",
            button.closest("[data-engagement-swimmer-change-request]")
          );
        });
        portalContext.elements.engagementsNationalPeopleMore?.addEventListener("click", () => portalActions.loadEngagementNationalPeople({append:true}));
        portalContext.elements.engagementsNationalPeopleRefresh?.addEventListener("click", () => portalActions.loadEngagementNationalPeople({ force: true }));
        portalContext.elements.engagementsNationalPeopleList?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-engagement-national-person-action]");
          if (!button) return;
          const action = button.dataset.engagementNationalPersonAction;
          const personId = button.dataset.engagementNationalPersonId || "";
          if (action === "disable" || action === "enable") {
            portalActions.setEngagementNationalPersonStatus(personId, action === "enable");
          } else if (action === "delete") {
            portalActions.deleteEngagementNationalPerson(personId);
          } else if (action === "merge") {
            portalState.engagementNationalPersonMergeSourceId = portalState.engagementNationalPersonMergeSourceId === personId ? "" : personId;
            portalActions.renderEngagementNationalPeople();
          } else if (action === "cancel-merge") {
            portalState.engagementNationalPersonMergeSourceId = "";
            portalActions.renderEngagementNationalPeople();
          } else if (action === "confirm-merge") {
            const card = button.closest("[data-engagement-national-person-id]");
            const targetId = card?.querySelector("[data-engagement-national-person-merge-target]")?.value || "";
            portalActions.mergeEngagementNationalPerson(personId, targetId);
          }
        });
        portalContext.elements.engagementsNationalPeopleList?.addEventListener("change", (event) => {
          const keep = event.target.closest("[data-engagement-national-person-keep]");
          const merge = event.target.closest("[data-engagement-national-person-merge-check]");
          if (keep?.checked) {
            const duplicateMerge = Array.from(portalContext.elements.engagementsNationalPeopleList?.querySelectorAll("[data-engagement-national-person-merge-check]") || [])
              .find((item) => item.value === keep.value);
            if (duplicateMerge) duplicateMerge.checked = false;
          }
          if (merge?.checked) {
            const currentKeep = portalActions.selectedEngagementNationalPersonKeepId();
            if (currentKeep && currentKeep === merge.value) merge.checked = false;
          }
          portalActions.updateEngagementNationalPeopleSelectionState();
        });
        portalContext.elements.engagementsNationalPeopleSearch?.addEventListener("input", portalActions.renderEngagementNationalPeople);
        portalContext.elements.engagementsNationalPeopleStatusFilter?.addEventListener("change", portalActions.renderEngagementNationalPeople);
        portalContext.elements.engagementsNationalPeopleReset?.addEventListener("click", portalActions.resetEngagementNationalPeopleFilters);
        portalContext.elements.engagementsNationalPeopleMergeMode?.addEventListener("click", () => {
          portalActions.setEngagementNationalPeopleMergeMode(!portalState.engagementNationalPeopleMergeMode);
        });
        portalContext.elements.engagementsNationalPeopleBulkMerge?.addEventListener("click", portalActions.mergeSelectedEngagementNationalPeople);
        portalContext.elements.engagementsClubSwimmersDirectorySearch?.addEventListener("input", portalActions.renderEngagementClubSwimmersDirectory);
        portalContext.elements.engagementsClubSwimmersDirectorySearchClear?.addEventListener("click", () => {
          if (!portalContext.elements.engagementsClubSwimmersDirectorySearch) return;
          portalContext.elements.engagementsClubSwimmersDirectorySearch.value = "";
          portalActions.renderEngagementClubSwimmersDirectory();
          portalContext.elements.engagementsClubSwimmersDirectorySearch.focus();
        });
        portalContext.elements.engagementsClubSwimmersDirectorySexFilter?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-engagement-club-swimmer-sex-filter]");
          if (!button) return;
          const requestedFilter = button.dataset.engagementClubSwimmerSexFilter || "all";
          portalState.engagementClubSwimmersDirectorySexFilter = requestedFilter === "F" || requestedFilter === "M" ? requestedFilter : "all";
          portalActions.renderEngagementClubSwimmersDirectory();
        });
        portalContext.elements.engagementsClubSwimmersDirectorySearch?.form?.addEventListener("submit", (event) => event.preventDefault());
        portalContext.elements.engagementsClubSwimmersDirectoryList?.addEventListener("click", (event) => {
          const inactiveToggle = event.target.closest("[data-engagement-club-directory-inactive-toggle]");
          if (inactiveToggle) {
            const scrollContainer = inactiveToggle.closest(".admin-engagements-club-swimmers-directory-table");
            const scrollTop = scrollContainer?.scrollTop || 0;
            portalState.engagementClubInactiveSwimmersDirectoryExpanded = inactiveToggle.getAttribute("aria-expanded") !== "true";
            inactiveToggle.setAttribute("aria-expanded", String(portalState.engagementClubInactiveSwimmersDirectoryExpanded));
            portalContext.elements.engagementsClubSwimmersDirectoryList
              .querySelectorAll('[data-activity-status="inactive"]')
              .forEach((row) => { row.hidden = !portalState.engagementClubInactiveSwimmersDirectoryExpanded; });
            if (scrollContainer) scrollContainer.scrollTop = scrollTop;
            return;
          }
          const activityButton = event.target.closest("[data-engagement-club-swimmer-activity]");
          if (activityButton) {
            void portalActions.setEngagementClubSwimmerActivityStatus(
              activityButton.dataset.engagementClubSwimmerActivity || "",
              activityButton.dataset.engagementClubSwimmerActivitySource || "performances",
              activityButton.dataset.engagementClubSwimmerActivityStatus || "active",
              activityButton.dataset.engagementClubSwimmerActivityName || "ce nageur",
              activityButton.dataset.engagementClubSwimmerActivitySex || ""
            );
            return;
          }
          const changeButton = event.target.closest("[data-engagement-club-swimmer-change], [data-engagement-club-swimmer-duplicate]");
          if (changeButton) {
            const swimmerId = changeButton.dataset.engagementClubSwimmerChange || changeButton.dataset.engagementClubSwimmerDuplicate || "";
            const source = changeButton.dataset.engagementClubSwimmerChangeSource || "performances";
            const swimmer = portalState.engagementClubSwimmers.find((item) =>
              (item.source || "performances") === source && (item.id === swimmerId || item.swimmerIndexId === swimmerId)
            );
            if (swimmer) portalActions.openEngagementSwimmerCorrectionDialog(swimmer, changeButton.dataset.engagementClubSwimmerDuplicate ? "duplicate" : "request", changeButton);
            return;
          }
          const deleteButton = event.target.closest("[data-engagement-club-swimmer-delete]");
          if (deleteButton) {
            portalActions.requestEngagementClubSwimmerDeletion(
              deleteButton.dataset.engagementClubSwimmerDelete || "",
              deleteButton.dataset.engagementClubSwimmerDeleteName || "ce nageur"
            );
            return;
          }
          const profileButton = event.target.closest("[data-engagement-club-swimmer-public-profile]");
          if (profileButton) {
            const name = profileButton.dataset.engagementClubSwimmerPublicName || "ce nageur";
            const profileUrl = profileButton.dataset.engagementClubSwimmerPublicProfile || "";
            if (profileUrl && global.confirm(`Ouvrir la fiche publique de ${name} dans un nouvel onglet ?`)) {
              global.open(profileUrl, "_blank", "noopener,noreferrer");
            }
            return;
          }
          const button = event.target.closest("[data-engagement-club-swimmer-directory-toggle]");
          if (!button) return;
          const row = button.closest(".admin-engagements-club-swimmers-directory-row");
          const expanded = button.getAttribute("aria-expanded") === "true";
          if (!expanded) {
            portalContext.elements.engagementsClubSwimmersDirectoryList.querySelectorAll("[data-engagement-club-swimmer-directory-toggle][aria-expanded=\"true\"]")
              .forEach((openButton) => {
                openButton.setAttribute("aria-expanded", "false");
                const openRow = openButton.closest(".admin-engagements-club-swimmers-directory-row");
                if (openRow) openRow.dataset.expanded = "false";
              });
          }
          button.setAttribute("aria-expanded", expanded ? "false" : "true");
          if (row) row.dataset.expanded = expanded ? "false" : "true";
        });
        portalContext.elements.engagementsSwimmerCorrectionForm?.addEventListener("submit", (event) => {
          event.preventDefault();
          void portalActions.submitEngagementSwimmerCorrection();
        });
        portalContext.elements.engagementsSwimmerCorrectionForm?.addEventListener("input",portalActions.updateClubIdentityCorrectionAction);
        portalContext.elements.engagementsSwimmerCorrectionForm?.addEventListener("change",portalActions.updateClubIdentityCorrectionAction);
        portalContext.elements.engagementsSwimmerCorrectionClose?.addEventListener("click", portalActions.closeEngagementSwimmerCorrectionDialog);
        portalContext.elements.engagementsSwimmerCorrectionCancel?.addEventListener("click", portalActions.closeEngagementSwimmerCorrectionDialog);
        portalContext.elements.engagementsSwimmerCorrectionDialog?.addEventListener("close", () => {
          portalActions.resetEngagementSwimmerCorrectionDialog();
          portalState.engagementSwimmerCorrectionReview = null;
          const opener = portalState.engagementSwimmerCorrectionOpener;
          portalState.engagementSwimmerCorrectionOpener = null;
          opener?.focus?.();
        });
        portalContext.elements.engagementsSwimmerCorrectionDialog?.addEventListener("click", (event) => {
          if (event.target === portalContext.elements.engagementsSwimmerCorrectionDialog) portalActions.closeEngagementSwimmerCorrectionDialog();
        });
        portalContext.elements.engagementsSwimmerCorrectionLastName?.addEventListener("input", (event) => {
          const start = event.target.selectionStart;
          const end = event.target.selectionEnd;
          event.target.value = event.target.value.toUpperCase();
          if (Number.isInteger(start) && Number.isInteger(end)) event.target.setSelectionRange(start, end);
        });
        portalContext.elements.engagementsSwimmerCorrectionLicense?.addEventListener("input", (event) => {
          if (portalContext.elements.engagementsSwimmerCorrectionForm?.dataset.napSource === "true") return;
          event.currentTarget.value = portalActions.formatEngagementSwimmerLicense(event.currentTarget.value);
        });
        portalContext.elements.engagementsClubPeopleAddButton?.addEventListener("click", () => portalActions.openEngagementClubPersonForm());
        portalContext.elements.engagementsClubPeopleLoadMore?.addEventListener("click", () => portalActions.loadEngagementClubPeople({append:true}));
        portalContext.elements.engagementsClubPersonSwimmerSearch?.addEventListener("input", () => {
          portalActions.applyEngagementClubPersonSwimmer("");
          portalActions.renderEngagementClubPersonSwimmerOptions();
          if (portalContext.elements.engagementsClubPersonMessage) portalContext.elements.engagementsClubPersonMessage.textContent = "";
        });
        portalContext.elements.engagementsClubPersonSwimmerSearch?.addEventListener("focus", portalActions.renderEngagementClubPersonSwimmerOptions);
        portalContext.elements.engagementsClubPersonSwimmerSearch?.addEventListener("keydown", (event) => {
          const firstResult = portalContext.elements.engagementsClubPersonSwimmerResults?.querySelector("button:not(:disabled)");
          if (event.key === "ArrowDown" && firstResult) {
            event.preventDefault();
            firstResult.focus();
          } else if (event.key === "Enter" && firstResult && !portalContext.elements.engagementsClubPersonSwimmerResults.hidden) {
            event.preventDefault();
            firstResult.click();
          } else if (event.key === "Escape" && portalContext.elements.engagementsClubPersonSwimmerResults) {
            portalContext.elements.engagementsClubPersonSwimmerResults.hidden = true;
            portalContext.elements.engagementsClubPersonSwimmerSearch.setAttribute("aria-expanded", "false");
          }
        });
        portalContext.elements.engagementsClubPersonSwimmerResults?.addEventListener("click", (event) => {
          const result = event.target.closest("[data-engagement-club-person-swimmer-result]");
          if (!result) return;
          portalActions.applyEngagementClubPersonSwimmer(result.dataset.engagementClubPersonSwimmerResult);
          if (portalContext.elements.engagementsClubPersonMessage) portalContext.elements.engagementsClubPersonMessage.textContent = "";
        });
        portalContext.elements.engagementsClubPersonLicense?.addEventListener("input", (event) => {
          event.currentTarget.value = portalActions.formatEngagementSwimmerLicense(event.currentTarget.value);
        });
        portalContext.elements.engagementsClubPersonLastName?.addEventListener("input", (event) => {
          event.currentTarget.value = event.currentTarget.value.toLocaleUpperCase("fr-FR");
        });
        portalContext.elements.engagementsClubPersonDialog?.addEventListener("cancel", event=>{event.preventDefault();if(portalState.engagementClubPersonSaving) return;portalActions.closeEngagementClubPersonDialog();portalActions.resetEngagementClubPersonForm();});
        portalContext.elements.engagementsClubPersonCancel?.addEventListener("click", () => {
          if(portalState.engagementClubPersonSaving) return;
          portalActions.closeEngagementClubPersonDialog();
          portalActions.resetEngagementClubPersonForm();
          if (portalContext.elements.engagementsClubPersonForm) portalContext.elements.engagementsClubPersonForm.hidden = true;
        });
        portalContext.elements.engagementsClubPersonForm?.addEventListener("submit", portalActions.saveEngagementClubPerson);
        portalContext.elements.engagementsClubPeopleList?.addEventListener("click", (event) => {
          const toggle = event.target.closest("[data-engagement-club-person-directory-toggle]");
          if (toggle) {
            const row = toggle.closest(".admin-engagements-club-person-row");
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            if (!expanded) {
              portalContext.elements.engagementsClubPeopleList.querySelectorAll('[data-engagement-club-person-directory-toggle][aria-expanded="true"]')
                .forEach((openToggle) => {
                  openToggle.setAttribute("aria-expanded", "false");
                  const openRow = openToggle.closest(".admin-engagements-club-person-row");
                  if (openRow) openRow.dataset.expanded = "false";
                });
            }
            toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
            if (row) row.dataset.expanded = expanded ? "false" : "true";
            return;
          }
          const button = event.target.closest("[data-engagement-club-person-action]");
          if (!button) return;
          const personId = button.dataset.engagementClubPersonId || "";
          const action = button.dataset.engagementClubPersonAction;
          if (action === "edit") {
            const person=portalState.engagementClubPeople.find(person=>person.id===personId);
            if(person&&global.LivePalmesEnvironment?.sportingDataSource==="nap")portalActions.openEngagementSwimmerCorrectionDialog({...person,source:"officials"},"request",button);
            else portalActions.openEngagementClubPersonForm(person);
          } else if(action === "roles") {
            portalActions.openEngagementClubPersonForm(portalState.engagementClubPeople.find(person=>person.id===personId));
          } else if (action === "disable" || action === "enable") {
            portalActions.setEngagementClubPersonStatus(personId, action === "enable");
          }
        });
        portalContext.elements.engagementsDetailClose?.addEventListener("click", portalActions.closeEngagementCompetitionDetail);
        portalContext.elements.engagementsEditButton?.addEventListener("click", () => portalActions.setEngagementEditMode(true));
        portalContext.elements.engagementsSaveButton?.addEventListener("click", portalActions.saveEngagementCompetitionDetail);
        portalContext.elements.engagementsDeleteButton?.addEventListener("click", portalActions.deleteOrRequestEngagementCompetitionDeletion);
        portalContext.elements.engagementsEditCancelTop?.addEventListener("click", () => {
          portalActions.clearEngagementDetailTabDirty();
          portalState.activeEngagementProgramSessionId = "";
          portalState.engagementDetailEditing = false;
          portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition || {});
        });
        portalContext.elements.engagementsEditCancel?.addEventListener("click", () => {
          portalActions.clearEngagementDetailTabDirty("general");
          portalActions.setEngagementEditMode(false);
        });
        portalContext.elements.engagementsCreateForm?.addEventListener("submit", portalActions.createEngagementCompetition);
        portalContext.elements.engagementsEditForm?.addEventListener("submit", portalActions.saveEngagementCompetitionDetail);
        portalContext.elements.engagementsEditForm?.addEventListener("input", () => portalActions.markEngagementDetailTabDirty("general"));
        portalContext.elements.engagementsEditForm?.addEventListener("change", () => portalActions.markEngagementDetailTabDirty("general"));
        portalContext.elements.engagementsEventsForm?.addEventListener("submit", portalActions.saveEngagementCompetitionDetail);
        portalContext.elements.engagementsOpenWaterCourseAdd?.addEventListener("click", portalActions.addEngagementOpenWaterCourse);
        portalContext.elements.engagementsOpenWaterCourseList?.addEventListener("click", (event) => {
          const selectButton = event.target.closest("[data-open-water-course-select]");
          if (selectButton) {
            portalActions.addEngagementOpenWaterCourseToProgram(selectButton.dataset.openWaterCourseSelect || "");
            return;
          }
          const statusButton = event.target.closest("[data-open-water-course-id]");
          if (statusButton) void portalActions.setEngagementOpenWaterCourseStatus(statusButton);
        });
        portalContext.elements.engagementsEventsForm?.addEventListener("change", (event) => {
          const control = event.target.closest?.("[data-engagement-category-column]");
          if (control) portalActions.applyEngagementCategoryColumnControl(control);
        });
        portalContext.elements.engagementsEventsForm?.addEventListener("input", portalActions.updateEngagementEventsSummaryFromForm);
        portalContext.elements.engagementsEventsForm?.addEventListener("change", (event) => {
          portalActions.updateEngagementEventsSummaryFromForm(event);
          const eventInput = event.target.closest?.("[data-engagement-event-code]");
          if (eventInput && !eventInput.checked && portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater") {
            const preservedEvents = portalActions.selectedEngagementEventsFromForm();
            const preservedSessions = portalActions.selectedEngagementProgramSessionsFromForm();
            portalActions.renderEngagementEvents({ ...portalState.selectedEngagementCompetition, events: preservedEvents, programSessions: preservedSessions });
          }
        });
        portalContext.elements.engagementsProgramAddSession?.addEventListener("click", portalActions.addEngagementProgramSession);
        portalContext.elements.engagementsProgramSessions?.addEventListener("click", portalActions.handleEngagementProgramAction);
        portalContext.elements.engagementsProgramSessions?.addEventListener("change", () => {
          const sessions = portalActions.selectedEngagementProgramSessionsFromForm();
          portalActions.markEngagementDetailTabDirty("courses");
          portalActions.renderEngagementProgramSessions(sessions, portalActions.isEngagementAdminMode() && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition());
        });
        portalContext.elements.engagementsSectionToggles?.forEach((button) => {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const section = document.querySelector(`#${button.dataset.engagementsSectionToggle}`);
            if (!section) return;
            section.open = !section.open;
            portalActions.updateEngagementEventsSectionToggleLabels();
          });
        });
        [portalContext.elements.engagementsEventsChoiceSection, portalContext.elements.engagementsProgramSection].forEach((section) => {
          section?.addEventListener("toggle", () => {
            if (section === portalContext.elements.engagementsProgramSection && portalContext.elements.engagementsEventsForm?.dataset.clubProgramView === "true" && !section.open) {
              section.open = true;
            }
            portalActions.updateEngagementEventsSectionToggleLabels();
          });
        });
        portalContext.elements.engagementsDate?.addEventListener("change", () => portalActions.syncEngagementEndDate(portalContext.elements.engagementsDate, portalContext.elements.engagementsEndDate));
        portalContext.elements.engagementsEndDate?.addEventListener("change", () => portalActions.markEngagementEndDateManual(portalContext.elements.engagementsDate, portalContext.elements.engagementsEndDate));
        portalContext.elements.engagementsEditDate?.addEventListener("change", () => portalActions.syncEngagementEndDate(portalContext.elements.engagementsEditDate, portalContext.elements.engagementsEditEndDate));
        portalContext.elements.engagementsEditEndDate?.addEventListener("change", () => portalActions.markEngagementEndDateManual(portalContext.elements.engagementsEditDate, portalContext.elements.engagementsEditEndDate));
        portalContext.elements.engagementsDeadline?.addEventListener("change", () => portalActions.normalizeEngagementDeadlineField(portalContext.elements.engagementsDeadline));
        portalContext.elements.engagementsEditDeadline?.addEventListener("change", () => portalActions.normalizeEngagementDeadlineField(portalContext.elements.engagementsEditDeadline));
        portalContext.elements.engagementsFeesForm?.addEventListener("submit", portalActions.saveEngagementCompetitionDetail);
        portalContext.elements.engagementsNoFees?.addEventListener("change", () => {
          portalActions.updateEngagementFeesFormMode(portalActions.isEngagementAdminMode() && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition());
        });
        portalContext.elements.engagementsFeesForm?.addEventListener("input", () => portalActions.markEngagementDetailTabDirty("fees"));
        portalContext.elements.engagementsFeesForm?.addEventListener("change", () => portalActions.markEngagementDetailTabDirty("fees"));
        portalContext.elements.engagementsClubTeamForm?.addEventListener("submit", portalActions.saveEngagementClubTeamLeader);
        portalContext.elements.engagementsClubTeamRenunciationButton?.addEventListener("click", portalActions.openEngagementClubTeamRenunciationDialog);
        portalContext.elements.engagementsClubTeamRenunciationDialogForm?.addEventListener("submit", portalActions.selectEngagementClubTeamRenunciation);
        portalContext.elements.engagementsClubTeamRenunciationDialogClose?.addEventListener("click", portalActions.closeEngagementClubTeamRenunciationDialog);
        portalContext.elements.engagementsClubTeamRenunciationDialogCancel?.addEventListener("click", portalActions.closeEngagementClubTeamRenunciationDialog);
        portalContext.elements.engagementsClubTeamRenunciationDialog?.addEventListener("cancel", portalActions.closeEngagementClubTeamRenunciationDialog);
        portalContext.elements.engagementsClubTeamModifyButton?.addEventListener("click", async () => {
          if (portalState.engagementClubTeamSaving || portalActions.engagementClubTeamLeaderLockReason() || !portalActions.canUse("engagements.club.manage")) return;
          const editCompetitionId = portalState.selectedEngagementCompetitionId;
          const editClubId = String(portalActions.activeEngagementClubProfile().clubId || "");
          const editScopeCurrent = () => portalState.engagementClubTeamEditing && portalState.selectedEngagementCompetitionId === editCompetitionId && String(portalActions.activeEngagementClubProfile().clubId || "") === editClubId;
          portalState.engagementClubTeamEditing = true;
          portalActions.updateEngagementClubTeamLeaderActions();
          if (portalState.selectedEngagementCompetition?.nativeReadOnly === true && portalState.selectedEngagementCompetition?.nativeTeamLeaderEditable === true) {
            portalActions.restoreEngagementClubTeamLeaderChoice();
            portalActions.setEngagementClubTeamManualFieldsVisible(false);
            await portalActions.loadEngagementClubPeople({ silent: true });
            if (!editScopeCurrent()) return;
            portalActions.renderEngagementClubTeamPersonOptions();
            portalActions.updateEngagementClubTeamFormMode();
            portalContext.elements.engagementsClubTeamPersonSearch?.focus();
            return;
          }
          portalActions.restoreEngagementClubTeamLeaderChoice();
          const teamLeader = portalState.selectedEngagementClubEntry?.teamLeader || {};
          if (teamLeader.mode === "person" && !teamLeader.externalClub) {
            await Promise.all([
              portalActions.loadEngagementClubPeople({ silent: true }),
              portalActions.loadEngagementClubSwimmers({ silent: true })
            ]);
            if (!editScopeCurrent()) return;
            portalActions.renderEngagementClubTeamPersonOptions(teamLeader.personId || "");
            portalContext.elements.engagementsClubTeamPersonSearch?.focus();
          } else if (teamLeader.externalClub) {
            portalContext.elements.engagementsClubTeamExternalOpen?.focus();
          } else {
            portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.focus();
          }
        });
        portalContext.elements.engagementsClubTeamEditCancel?.addEventListener("click", portalActions.cancelEngagementClubTeamEdit);
        portalContext.elements.engagementsClubTeamRemoveButton?.addEventListener("click", portalActions.removeEngagementClubTeamLeader);
        portalContext.elements.engagementsClubTeamExternalOpen?.addEventListener("click", () => {
          const currentTeamLeader = portalState.selectedEngagementClubEntry?.teamLeader || {};
          const editingCurrentExternal = currentTeamLeader.mode === "person" && currentTeamLeader.externalClub === true;
          portalState.engagementClubTeamEditing = true;
          portalContext.elements.engagementsClubTeamForm?.querySelectorAll('input[name="adminEngagementsClubTeamMode"]')
            .forEach((radio) => { radio.checked = false; });
          if (portalContext.elements.engagementsClubTeamRenunciation) portalContext.elements.engagementsClubTeamRenunciation.checked = false;
          if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = true;
          if (!editingCurrentExternal) {
            [
              portalContext.elements.engagementsClubTeamFirstName,
              portalContext.elements.engagementsClubTeamLastName,
              portalContext.elements.engagementsClubTeamBirthDate,
              portalContext.elements.engagementsClubTeamSex,
              portalContext.elements.engagementsClubTeamLicense,
              portalContext.elements.engagementsClubTeamExternalClubId,
              portalContext.elements.engagementsClubTeamExternalClubName
            ].forEach((field) => { if (field) field.value = ""; });
          }
          portalActions.updateEngagementClubTeamFormMode();
          portalActions.openEngagementClubExternalTeamDialog();
        });
        portalContext.elements.engagementsClubTeamForm?.addEventListener("change", async (event) => {
          const changedMode = event.target?.matches?.('input[name="adminEngagementsClubTeamMode"]')
            ? event.target.value
            : "";
          if (changedMode === "renounced") {
            return;
          }
          if (changedMode === "person" && portalContext.elements.engagementsClubTeamRenunciation) {
            portalContext.elements.engagementsClubTeamRenunciation.checked = false;
            if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = false;
          }
          if (event.target === portalContext.elements.engagementsClubTeamExternal && event.target.checked) {
            if (portalContext.elements.engagementsClubTeamPersonSelect) portalContext.elements.engagementsClubTeamPersonSelect.value = "";
            if (portalContext.elements.engagementsClubTeamPersonSearch) portalContext.elements.engagementsClubTeamPersonSearch.value = "";
            [
              portalContext.elements.engagementsClubTeamFirstName,
              portalContext.elements.engagementsClubTeamLastName,
              portalContext.elements.engagementsClubTeamBirthDate,
              portalContext.elements.engagementsClubTeamSex,
              portalContext.elements.engagementsClubTeamLicense,
              portalContext.elements.engagementsClubTeamExternalClubId,
              portalContext.elements.engagementsClubTeamExternalClubName
            ].forEach((field) => {
              if (field) field.value = "";
            });
            portalActions.setEngagementClubTeamManualFieldsVisible(true);
          }
          portalActions.updateEngagementClubTeamFormMode();
          if (event.target === portalContext.elements.engagementsClubTeamExternal && event.target.checked) {
            portalActions.openEngagementClubExternalTeamDialog();
          }
          if (changedMode === "person") {
            await Promise.all([
              portalActions.loadEngagementClubPeople({ silent: true }),
              global.LivePalmesEnvironment?.sportingDataSource === "nap" ? Promise.resolve() : portalActions.loadEngagementClubSwimmers({ silent: true })
            ]);
            portalActions.setEngagementClubTeamManualFieldsVisible(false);
            portalActions.renderEngagementClubTeamPersonOptions("");
            portalActions.updateEngagementClubTeamFormMode();
            portalContext.elements.engagementsClubTeamPersonSearch?.focus();
          }
          if (portalContext.elements.engagementsClubTeamMessage) portalContext.elements.engagementsClubTeamMessage.textContent = "";
        });
        portalContext.elements.engagementsClubTeamPersonSearch?.addEventListener("input", () => {
          if (portalContext.elements.engagementsClubTeamPersonSelect) portalContext.elements.engagementsClubTeamPersonSelect.value = "";
          portalActions.setEngagementClubTeamManualFieldsVisible(false);
          portalActions.applyEngagementClubTeamPerson("");
          portalActions.renderEngagementClubTeamPersonOptions("");
          portalActions.updateEngagementClubTeamFormMode();
          if (portalContext.elements.engagementsClubTeamMessage) portalContext.elements.engagementsClubTeamMessage.textContent = "";
        });
        portalContext.elements.engagementsClubTeamPersonSelect?.addEventListener("change", async () => {
          const radio = portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"][value="person"]');
          if (radio) radio.checked = true;
          if (portalContext.elements.engagementsClubTeamRenunciation) portalContext.elements.engagementsClubTeamRenunciation.checked = false;
          portalActions.updateEngagementClubTeamFormMode();
          const selectionId = portalContext.elements.engagementsClubTeamPersonSelect.value;
          let person = portalActions.engagementClubTeamLeaderPeople().find((candidate) => (candidate.selectionId || candidate.id) === selectionId) || null;
          let selectionFailed = false;
          try {
            person = await portalActions.confirmEngagementClubTeamLeaderCandidate(person || {});
          } catch (error) {
            if (portalContext.elements.engagementsClubTeamMessage) {
              portalContext.elements.engagementsClubTeamMessage.textContent = `Ajout du chef d'équipe impossible : ${error?.message || error}`;
              portalContext.elements.engagementsClubTeamMessage.dataset.tone = "error";
            }
            person = null;
            selectionFailed = true;
          }
          const personId = person?.id || "";
          if (!personId) {
            portalContext.elements.engagementsClubTeamPersonSelect.value = "";
            portalActions.applyEngagementClubTeamPerson("");
            if (!selectionFailed && portalContext.elements.engagementsClubTeamMessage) portalContext.elements.engagementsClubTeamMessage.textContent = "";
            return;
          }
          portalActions.renderEngagementClubTeamPersonOptions(personId);
          portalContext.elements.engagementsClubTeamPersonSelect.value = personId;
          portalActions.applyEngagementClubTeamPerson(personId);
          if (portalContext.elements.engagementsClubTeamMessage) portalContext.elements.engagementsClubTeamMessage.textContent = "";
          if (personId) {
            const saved = await portalActions.saveEngagementClubTeamLeader();
            if (saved && person) {
              portalState.engagementClubPeople = portalState.engagementClubPeople.map((candidate) => candidate.id === person.id
                ? { ...candidate, roles: { ...candidate.roles, teamLeader: true } }
                : candidate);
              portalActions.renderEngagementClubTeamPersonOptions(person.id);
            }
            if (!saved) { portalActions.renderEngagementClubTeamPersonOptions(); if (portalContext.elements.engagementsClubTeamSaveButton) portalContext.elements.engagementsClubTeamSaveButton.hidden = false; }
          }
        });
        portalContext.elements.engagementsClubTeamPeopleMore?.addEventListener("click", async () => { await portalActions.loadEngagementClubPeople({ silent: true, append: true }); portalActions.updateEngagementClubTeamFormMode(); });
        portalContext.elements.engagementsClubTeamPersonResults?.addEventListener("change", event => {
          const candidate = event.target.closest?.("[data-engagement-club-team-candidate]");
          if (!candidate?.checked || !portalContext.elements.engagementsClubTeamPersonSelect) return;
          portalContext.elements.engagementsClubTeamPersonSelect.value = candidate.value;
          portalContext.elements.engagementsClubTeamPersonSelect.dispatchEvent(new Event("change", { bubbles: true }));
        });
        portalContext.elements.engagementsClubTeamPersonResults?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-engagement-club-team-person-result]");
          const personId = button?.dataset.engagementClubTeamPersonResult || "";
          if (!personId || !portalContext.elements.engagementsClubTeamPersonSelect) return;
          portalContext.elements.engagementsClubTeamPersonSelect.value = personId;
          portalContext.elements.engagementsClubTeamPersonSelect.dispatchEvent(new Event("change", { bubbles: true }));
        });
        portalContext.elements.engagementsClubTeamNativePersonCreate?.addEventListener("click",portalActions.openNativeCompetitionPersonCreation);
        portalContext.elements.engagementsClubTeamPersonCreate?.addEventListener("click", () => {
          if(global.LivePalmesEnvironment?.sportingDataSource === "nap") {portalActions.openNativeCompetitionPersonCreation();return;}
          const radio = portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"][value="person"]');
          if (radio) radio.checked = true;
          if (portalContext.elements.engagementsClubTeamPersonSelect) portalContext.elements.engagementsClubTeamPersonSelect.value = "";
          portalActions.setEngagementClubTeamManualFieldsVisible(true);
          portalActions.applyEngagementClubTeamPerson("");
          portalContext.elements.engagementsClubTeamFirstName?.focus();
        });
        portalContext.elements.engagementsClubTeamExternalDialogForm?.addEventListener("submit", portalActions.saveEngagementClubExternalTeamLeader);
        portalContext.elements.engagementsClubTeamExternalDialogClose?.addEventListener("click", () => portalActions.closeEngagementClubExternalTeamDialog({ reset: true }));
        portalContext.elements.engagementsClubTeamExternalDialogCancel?.addEventListener("click", () => portalActions.closeEngagementClubExternalTeamDialog({ reset: true }));
        portalContext.elements.engagementsClubTeamExternalDialog?.addEventListener("cancel", () => {
          portalActions.restoreEngagementClubTeamLeaderChoice();
        });
        portalContext.elements.engagementsClubTeamForm?.addEventListener("input", (event) => {
          if (
            portalContext.elements.engagementsClubTeamPersonSelect &&
            [
              portalContext.elements.engagementsClubTeamFirstName,
              portalContext.elements.engagementsClubTeamLastName,
              portalContext.elements.engagementsClubTeamBirthDate,
              portalContext.elements.engagementsClubTeamSex,
              portalContext.elements.engagementsClubTeamLicense
            ].includes(event.target)
          ) {
            const selectedPerson = portalState.engagementClubPeople.find((person) => person.id === portalContext.elements.engagementsClubTeamPersonSelect.value);
            if (!selectedPerson || (selectedPerson.birthDate && selectedPerson.sex)) {
              portalContext.elements.engagementsClubTeamPersonSelect.value = "";
            }
            portalActions.updateEngagementClubTeamFormMode();
          }
          if (portalContext.elements.engagementsClubTeamMessage) portalContext.elements.engagementsClubTeamMessage.textContent = "";
        });
        portalContext.elements.engagementsClubTeamLicense?.addEventListener("input", (event) => {
          event.currentTarget.value = portalActions.formatEngagementSwimmerLicense(event.currentTarget.value);
        });
        portalContext.elements.engagementsClubTeamLastName?.addEventListener("input", (event) => {
          event.currentTarget.value = event.currentTarget.value.toLocaleUpperCase("fr-FR");
        });
        portalContext.elements.engagementsClubOfficialsForm?.addEventListener("submit", portalActions.saveEngagementClubOfficials);
        portalContext.elements.engagementsClubOfficialsList?.addEventListener("change", portalActions.handleEngagementClubOfficialSelection);
        portalContext.elements.engagementsClubSelectedOfficialsList?.addEventListener("change", portalActions.handleEngagementClubOfficialSelection);
        portalContext.elements.engagementsClubOfficialsSearch?.addEventListener("input", portalActions.renderEngagementClubOfficials);
        portalContext.elements.engagementsClubSwimmersForm?.addEventListener("submit", (event) => event.preventDefault());
        portalContext.elements.engagementsClubEntriesForm?.addEventListener("submit", (event) => event.preventDefault());
        portalContext.elements.engagementsClubSummaryPdfButton?.addEventListener("click", portalActions.downloadEngagementClubSummaryPdf);
        portalContext.elements.engagementsGenerateTxtExportButton?.addEventListener("click", portalActions.generateEngagementAdminTxtExport);
        portalContext.elements.engagementsDocumentAddButton?.addEventListener("click", () => portalActions.openEngagementCompetitionDocumentForm());
        portalContext.elements.engagementsDocumentFiles?.addEventListener("change", portalActions.handleEngagementCompetitionDocumentFiles);
        portalContext.elements.engagementsDocumentForm?.addEventListener("submit", portalActions.saveEngagementCompetitionDocuments);
        portalContext.elements.engagementsDocumentCancelButton?.addEventListener("click", portalActions.closeEngagementCompetitionDocumentForm);
        portalContext.elements.engagementsSharedDocumentsList?.addEventListener("click", (event) => {
          const editButton = event.target.closest("[data-engagement-document-edit]");
          if (editButton) {
            portalActions.openEngagementCompetitionDocumentForm(editButton.dataset.engagementDocumentEdit);
            return;
          }
          const deleteButton = event.target.closest("[data-engagement-document-delete]");
          if (deleteButton) void portalActions.deleteEngagementCompetitionDocument(deleteButton.dataset.engagementDocumentDelete);
        });
        portalContext.elements.engagementsClubPdfSelect?.addEventListener("change", portalActions.renderEngagementClubRecapSelector);
        portalContext.elements.engagementsClubPdfDownloadButton?.addEventListener("click", () => portalActions.downloadEngagementAdminClubRecapPdf(portalContext.elements.engagementsClubPdfSelect?.value));
        portalContext.elements.engagementsStatisticsRefreshButton?.addEventListener("click", () => portalActions.loadEngagementCompetitionStatistics({ force: true }));
        portalContext.elements.engagementsStatisticsEventSelect?.addEventListener("change", portalActions.renderEngagementCompetitionStatistics);
        portalContext.elements.engagementsPrepareOpeningEmailsButton?.addEventListener("click", portalActions.prepareEngagementOpeningEmails);
        portalContext.elements.engagementsGenerateClubRecapsButton?.addEventListener("click", portalActions.generateEngagementAdminClubRecapPdfs);
        portalContext.elements.engagementsPrepareClubRecapEmailsButton?.addEventListener("click", portalActions.prepareEngagementClubRecapEmails);
        portalContext.elements.engagementsProcessNativeNotificationsButton?.addEventListener("click", async()=>{
          const button=portalContext.elements.engagementsProcessNativeNotificationsButton,status=portalContext.elements.engagementsNotificationPreviewStatus;
          if(!portalState.selectedEngagementCompetitionId||!portalActions.isEngagementAdminMode())return;
          const competitionId=portalState.selectedEngagementCompetitionId;
          button.disabled=true;
          if(status)status.textContent='Traitement des notifications selon le réglage national… Sur TEST, les destinataires sont redirigés vers livepalmes@nap-ffessm.fr.';
          try{
            const result=await portalActions.callFunction('processNapCompetitionNotifications',{action:'process',competitionId});
            if(portalState.selectedEngagementCompetitionId!==competitionId)return;
            if(status)status.textContent=`TEST : ${result.jobCount||0} mail(s) et ${result.attachmentCount||0} pièce(s) préparés ; ${result.sentCount||0} mail(s) envoyés vers livepalmes@nap-ffessm.fr. ${result.remaining?'Le traitement peut être poursuivi avec ce bouton.':'Aucun autre lot à traiter pour le moment.'}`;
            await portalActions.loadEngagementMailJobs({ force: true });
          }catch(error){
            if(portalState.selectedEngagementCompetitionId!==competitionId)return;
            if(status)status.textContent=`Traitement interrompu : ${error?.message||error}`;
          }
          finally{button.disabled=false;}
        });
        portalContext.elements.engagementsSendOpeningEmailsButton?.addEventListener("click", () => portalActions.sendEngagementPreparedEmails("opening_notification"));
        portalContext.elements.engagementsSendClubRecapEmailsButton?.addEventListener("click", () => portalActions.sendEngagementPreparedEmails("club_recap_pdf"));
        portalContext.elements.engagementsClubRecapFiles?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-engagement-admin-club-pdf]");
          if (!button) return;
          portalActions.downloadEngagementAdminClubRecapPdf(button.dataset.engagementAdminClubPdf);
        });
        portalContext.elements.engagementsClubRelaysAddButton?.addEventListener("click", () => {
          const relayEvents = portalActions.engagementClubRelayEvents();
          if (!relayEvents.length) return;
          portalActions.openEngagementClubRelayDialog("", portalContext.elements.engagementsClubRelaysAddButton);
          if (portalContext.elements.engagementsClubRelaysMessage) portalContext.elements.engagementsClubRelaysMessage.textContent = "";
        });
        portalContext.elements.engagementsClubSwimmersSearch?.addEventListener("input", () => {
          portalActions.renderEngagementClubSwimmers();
        });
        portalContext.elements.engagementsClubNewSwimmerLicense?.addEventListener("input", (event) => {
          event.currentTarget.value = portalActions.formatEngagementSwimmerLicense(event.currentTarget.value);
          portalState.engagementClubSwimmerRecovery = null;
          if (portalContext.elements.engagementsClubRecoverSwimmerButton) portalContext.elements.engagementsClubRecoverSwimmerButton.hidden = true;
        });
        portalContext.elements.engagementsClubNewSwimmerLastName?.addEventListener("input", (event) => {
          event.currentTarget.value = event.currentTarget.value.toLocaleUpperCase("fr-FR");
        });
        portalContext.elements.engagementsClubNewSwimmerResetButton?.addEventListener("click", portalActions.resetEngagementClubNewSwimmerFormFromButton);
        portalContext.elements.engagementsClubNewSwimmerSaveButton?.addEventListener("click", portalActions.createEngagementClubSwimmer);
        portalContext.elements.engagementsClubRecoverSwimmerButton?.addEventListener("click", portalActions.recoverEngagementClubSwimmer);
        portalContext.elements.engagementsClubNewSwimmerDialogOpen?.addEventListener("click", portalActions.openEngagementClubNewSwimmerDialog);
        portalContext.elements.engagementsClubNewSwimmerDialog?.addEventListener("click", (event) => {
          const dialog = portalContext.elements.engagementsClubNewSwimmerDialog;
          const bounds = dialog.getBoundingClientRect();
          const clickedBackdrop = event.target === dialog && (
            event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
          );
          if (event.target.closest("[data-engagement-club-new-swimmer-dialog-close]") || clickedBackdrop) {
            portalActions.closeEngagementClubNewSwimmerDialog();
          }
        });
        portalContext.elements.engagementsClubNewSwimmerDialog?.addEventListener("cancel", (event) => {
          event.preventDefault();
          portalActions.closeEngagementClubNewSwimmerDialog();
        });
        portalContext.elements.engagementsClubSwimmersForm?.addEventListener("click", (event) => {
          const inactiveToggle = event.target.closest("[data-engagement-club-inactive-swimmers-toggle]");
          if (inactiveToggle) {
            portalState.engagementClubInactiveSwimmersExpanded = inactiveToggle.getAttribute("aria-expanded") !== "true";
            portalActions.renderEngagementClubSwimmers();
            return;
          }
          const sexFilterButton = event.target.closest("[data-engagement-club-available-swimmer-sex-filter]");
          if (sexFilterButton) {
            const requestedFilter = sexFilterButton.dataset.engagementClubAvailableSwimmerSexFilter || "all";
            portalState.engagementClubAvailableSwimmersSexFilter = requestedFilter === "F" || requestedFilter === "M" ? requestedFilter : "all";
            portalActions.renderEngagementClubSwimmers();
            return;
          }
          const button = event.target.closest("[data-engagement-club-swimmer-details-toggle]");
          if (!button) return;
          const row = button.closest("[data-engagement-club-swimmer-row]");
          const open = button.getAttribute("aria-expanded") !== "true";
          portalContext.elements.engagementsClubSwimmersForm.querySelectorAll('[data-engagement-club-swimmer-row][data-expanded="true"]')
            .forEach((candidate) => {
              if (candidate !== row) portalActions.setEngagementClubSwimmerRowExpanded(candidate, false);
            });
          portalActions.setEngagementClubSwimmerRowExpanded(row, open);
        });
        portalContext.elements.engagementsClubSwimmersForm?.addEventListener("change", (event) => {
          if(portalActions.engagementClubSwimmerSelectionLockReason()) return;
          const row = event.target.closest("[data-engagement-club-swimmer-row]");
          if (!row) return;
          const checkbox = row?.querySelector("[data-engagement-club-swimmer-id]");
          const license = row?.querySelector("[data-engagement-club-swimmer-license]");
          const selectionChanged = event.target.matches("[data-engagement-club-swimmer-id]");
          if (selectionChanged && checkbox?.checked) {
            const swimmerIndexId = checkbox.dataset.engagementClubSwimmerId || "";
            const swimmer = portalState.engagementClubSwimmers.find((candidate) => String(candidate.id || candidate.swimmerIndexId) === swimmerIndexId) || {
              id: swimmerIndexId,
              swimmerIndexId,
              licenseNumber: license?.value || license?.dataset.engagementClubSwimmerLicense || ""
            };
            const conflict = portalActions.engagementClubMemberRoleConflict(swimmer, "swimmer");
            if (conflict) {
              checkbox.checked = false;
              row.dataset.selected = "false";
              global.alert(conflict);
              if (portalContext.elements.engagementsClubSwimmersMessage) {
                portalContext.elements.engagementsClubSwimmersMessage.textContent = conflict;
                portalContext.elements.engagementsClubSwimmersMessage.dataset.tone = "error";
              }
              return;
            }
          }
          if (selectionChanged && checkbox && !checkbox.checked) {
            const swimmerIndexId = checkbox.dataset.engagementClubSwimmerId || "";
            const savedSwimmer = (portalState.selectedEngagementClubEntry?.swimmers || [])
              .find((swimmer) => swimmer.swimmerIndexId === swimmerIndexId) || {};
            const currentEntries = portalActions.selectedEngagementClubEntryRowsBySwimmerId().get(swimmerIndexId) || savedSwimmer.individualEntries || [];
            if (currentEntries.length) {
              const swimmerName = checkbox.dataset.engagementClubSwimmerName || "ce nageur";
              const confirmed = global.confirm(
                `Retirer ${swimmerName} supprimera aussi ${currentEntries.length} engagement${currentEntries.length > 1 ? "s" : ""} sur les courses individuelles. Confirmer cette suppression ?`
              );
              if (!confirmed) {
                checkbox.checked = true;
                if (row) row.dataset.selected = "true";
                return;
              }
            }
          }
          if (event.target.matches("input[data-engagement-club-swimmer-license]")) {
            event.target.value = String(event.target.value || "").trim().toUpperCase();
          }
          if (row && checkbox) {
            row.dataset.selected = checkbox.checked ? "true" : "false";
            if (license?.matches("input")) {
              license.required = checkbox.checked && portalConfig.ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE;
            }
          }
          if (selectionChanged) {
            const swimmerIndexId = checkbox?.dataset.engagementClubSwimmerId || "";
            if (checkbox?.checked !== true) portalActions.discardPendingEngagementClubIndividualEntries(swimmerIndexId);
            const shouldExpandLicense = checkbox?.checked === true && Boolean(license?.matches("input") && license.value);
            const swimmers = portalActions.selectedEngagementClubSwimmerRows();
            const changedSwimmer = swimmers.find((swimmer) => swimmer.swimmerIndexId === swimmerIndexId) || {
              swimmerIndexId,
              source: checkbox?.dataset.engagementClubSwimmerSource || "performances"
            };
            portalState.selectedEngagementClubEntry = {
              ...(portalState.selectedEngagementClubEntry || {}),
              swimmers
            };
            portalActions.renderEngagementClubSwimmers();
            if (shouldExpandLicense && swimmerIndexId) {
              const nextCheckbox = Array.from(portalContext.elements.engagementsClubSwimmersForm?.querySelectorAll("[data-engagement-club-swimmer-id]") || [])
                .find((input) => input.dataset.engagementClubSwimmerId === swimmerIndexId);
              portalActions.setEngagementClubSwimmerRowExpanded(nextCheckbox?.closest("[data-engagement-club-swimmer-row]"), true);
              nextCheckbox?.closest("[data-engagement-club-swimmer-row]")?.querySelector("[data-engagement-club-swimmer-license]")?.focus?.();
            }
            portalActions.renderEngagementClubEntries();
            portalActions.renderEngagementClubRelays();
            if (portalState.selectedEngagementCompetition?.napSource !== true && checkbox?.checked && changedSwimmer.licenseNumber && !portalConfig.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(changedSwimmer.licenseNumber)) {
              if (portalContext.elements.engagementsClubSwimmersMessage) {
                portalContext.elements.engagementsClubSwimmersMessage.textContent = "La licence doit respecter le format A-12-34567 lorsqu'elle est renseignée.";
                portalContext.elements.engagementsClubSwimmersMessage.dataset.tone = "error";
              }
              return;
            }
            void portalActions.persistEngagementClubSwimmerSelection(changedSwimmer, checkbox?.checked === true);
            return;
          }
          const swimmers = portalActions.selectedEngagementClubSwimmerRows();
          portalState.selectedEngagementClubEntry = { ...(portalState.selectedEngagementClubEntry || {}), swimmers };
          portalActions.updateEngagementClubSwimmersSummary();
          portalActions.renderEngagementClubEntries();
          portalActions.renderEngagementClubRelays();
          const swimmerIndexId = checkbox?.dataset.engagementClubSwimmerId || "";
          const changedSwimmer = swimmers.find((swimmer) => swimmer.swimmerIndexId === swimmerIndexId);
          if (event.target.matches("input[data-engagement-club-swimmer-license]") && checkbox?.checked && changedSwimmer && !portalState.engagementClubPersistedSwimmerIds.has(swimmerIndexId)) {
            if (changedSwimmer.licenseNumber && !portalConfig.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(changedSwimmer.licenseNumber)) {
              if (portalContext.elements.engagementsClubSwimmersMessage) {
                portalContext.elements.engagementsClubSwimmersMessage.textContent = "La licence doit respecter le format A-12-34567.";
                portalContext.elements.engagementsClubSwimmersMessage.dataset.tone = "error";
              }
              event.target.reportValidity?.();
              return;
            }
            void portalActions.persistEngagementClubSwimmerSelection(changedSwimmer, true);
          } else if (portalContext.elements.engagementsClubSwimmersMessage) {
            portalContext.elements.engagementsClubSwimmersMessage.textContent = "";
            portalContext.elements.engagementsClubSwimmersMessage.dataset.tone = "";
          }
        });
        portalContext.elements.engagementsClubEntriesList?.addEventListener("change", async (event) => {
          const row = event.target.closest("[data-engagement-club-entry-row]");
          let courseSelectionChanged = event.target.matches("[data-engagement-club-swimmer-event]");
          let exceptionChanged = false;
          if (courseSelectionChanged && event.target.checked && event.target.dataset.qualificationExceptionRequired === "true") {
            const max = Number(portalState.selectedEngagementCompetition?.maxEventsPerSwimmer || 0);
            if (max && row.querySelectorAll("[data-engagement-club-swimmer-event]:checked").length > max) {
              event.target.checked = false;
              portalContext.elements.engagementsClubEntriesMessage.textContent = `Maximum ${max} courses individuelles par nageur.`;
              return;
            }
            if (!await portalActions.confirmQualificationException(event.target, row)) { event.target.checked = false; portalActions.updateQualificationCheckboxes(row); return; }
            exceptionChanged = true;
          }
          if (courseSelectionChanged && portalState.selectedEngagementCompetition?.qualifications?.enabled && !event.target.checked && event.target.dataset.qualificationAnchor === "true") {
            const checked = [...row.querySelectorAll("[data-engagement-club-swimmer-event]:checked")];
            if (!checked.some((box) => box.dataset.qualificationAnchor === "true")) {
              const dependent = event.target.dataset.qualificationMode === "one" ? checked.filter((box) => box.dataset.qualificationApproved !== "true") : [];
              const swimmerId = row.dataset.engagementClubEntrySwimmerId;
              const relays = (portalState.selectedEngagementClubEntry?.relays || []).filter((relay) => (relay.memberIds || []).includes(swimmerId) && !(relay.memberIds || []).some((id) => id !== swimmerId && (portalState.selectedEngagementClubEntry.swimmers || []).find((swimmer) => swimmer.swimmerIndexId === id)?.individualEntries?.some((entry) => entry.qualification?.qualified)));
              if ((dependent.length || relays.length) && !global.confirm(`Attention : vous retirez la dernière course qualifiée. Cela supprimera ${dependent.length} autre(s) engagement(s) individuel(s) et ${relays.length} relais composé(s) qui en dépendent. Continuer ?`)) { event.target.checked = true; return; }
              dependent.forEach((box) => { box.checked = false; box.closest("label")?.querySelector("small")?.setAttribute("hidden", ""); });
            }
          }

          if (event.target.matches("[data-engagement-club-swimmer-event]") && event.target.checked) {
            const maxEvents = Number(portalState.selectedEngagementCompetition?.maxEventsPerSwimmer || 0);
            const checkedEvents = Array.from(row?.querySelectorAll("[data-engagement-club-swimmer-event]:checked") || []);
            if (maxEvents > 0 && checkedEvents.length > maxEvents) {
              event.target.checked = false;
              courseSelectionChanged = false;
              if (portalContext.elements.engagementsClubEntriesMessage) {
                portalContext.elements.engagementsClubEntriesMessage.textContent = `Maximum ${maxEvents} course${maxEvents > 1 ? "s" : ""} individuelle${maxEvents > 1 ? "s" : ""} par nageur.`;
                portalContext.elements.engagementsClubEntriesMessage.dataset.tone = "error";
              }
            }
          }
          if (event.target.matches("[data-engagement-club-swimmer-event]")) {
            const openWater = portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater";
            const eventCode = event.target.dataset.engagementClubSwimmerEvent || "";
            const choice = event.target.closest("[data-event-selected]");
            const timeValue = choice?.querySelector("[data-engagement-club-entry-cell-time]");
            const timeInput = Array.from(row?.querySelectorAll("[data-engagement-club-swimmer-event-time]") || [])
              .find((input) => input.dataset.engagementClubSwimmerEventTime === eventCode);
            const checked = event.target.checked;
            if (timeValue && !openWater) {
              timeValue.hidden = !checked;
              if (checked && !timeValue.textContent.trim()) {
                timeValue.textContent = "Calcul...";
                timeValue.dataset.entryTimeMode = "pending";
              }
            }
            if (timeInput && !checked) {
              timeInput.value = "";
              timeInput.disabled = true;
            }
            portalActions.updateEngagementClubEntryRowCount(row);
          }
          if (courseSelectionChanged) {
            exceptionChanged = portalActions.clearUncheckedQualificationException(event.target, row) || exceptionChanged;
            portalActions.updateQualificationCheckboxes(row);
            const swimmerIndexId = row?.dataset.engagementClubEntrySwimmerId || "";
            const swimmers = portalActions.selectedEngagementClubSwimmerRows();
            const swimmer = swimmers.find((item) => item.swimmerIndexId === swimmerIndexId);
            portalState.selectedEngagementClubEntry = { ...(portalState.selectedEngagementClubEntry || {}), swimmers };
            if (swimmer) {
              void portalActions.persistEngagementClubIndividualEntries(swimmer);
              if (exceptionChanged) void portalActions.flushEngagementClubIndividualEntriesAutosave();
            }
          }
          portalActions.updateEngagementClubEntriesSummary();
          if (portalContext.elements.engagementsClubEntriesMessage && !event.target.matches("[data-engagement-club-swimmer-event]")) {
            portalContext.elements.engagementsClubEntriesMessage.textContent = "";
          }
        });
        portalContext.elements.engagementsClubEntriesList?.addEventListener("click", (event) => {
          const remove = event.target.closest("[data-engagement-club-swimmer-remove]");
          if (remove) {
            void portalActions.removeEngagementClubSwimmerFromCourses(remove.dataset.engagementClubSwimmerRemove || "", remove);
            return;
          }
          const button = event.target.closest("[data-engagement-club-times-open]");
          if (!button) return;
          void portalActions.openEngagementClubTimesDialog(button.dataset.engagementClubTimesOpen || "", button);
          if (portalContext.elements.engagementsClubEntriesMessage) portalContext.elements.engagementsClubEntriesMessage.textContent = "";
        });
        portalContext.elements.engagementsClubTimesDialogList?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-engagement-club-time-toggle]");
          if (!button) return;
          const row = button.closest("[data-engagement-club-time-dialog-row]");
          const input = row?.querySelector("[data-engagement-club-time-dialog-input]");
          const display = row?.querySelector("[data-engagement-club-time-dialog-display]");
          const historySelect = row?.querySelector("[data-engagement-club-time-history-select]");
          const help = row?.querySelector("[data-engagement-club-time-dialog-help]");
          if (!input) return;
          if (input.disabled) {
            input.value = button.dataset.automaticTime || "59:59.99";
            input.hidden = false;
            input.disabled = false;
            button.textContent = "Rétablir auto";
            if (help) help.textContent = "Temps saisi manuellement";
            input.focus?.();
          } else {
            row.dataset.nativeAutoRequested="true";
            input.value = "";
            input.hidden = true;
            input.disabled = true;
            button.textContent = "Saisie libre";
            if (display) {
              display.textContent = display.dataset.automaticLabel || "59:59.99";
              display.dataset.entryTimeMode = "known";
            }
            if (historySelect) portalActions.updateEngagementClubTimeDialogHelp(historySelect);
          }
          if (portalContext.elements.engagementsClubTimesDialogMessage) {
            portalContext.elements.engagementsClubTimesDialogMessage.textContent = "";
            portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "";
          }
        });
        portalContext.elements.engagementsClubTimesDialogList?.addEventListener("input", (event) => {
          if (!event.target.matches("[data-engagement-club-time-dialog-input]")) return;
          event.target.setCustomValidity?.("");
          const help = event.target.closest("[data-engagement-club-time-dialog-row]")?.querySelector("[data-engagement-club-time-dialog-help]");
          if (help) help.textContent = "Temps saisi manuellement";
          if (portalContext.elements.engagementsClubTimesDialogMessage) {
            portalContext.elements.engagementsClubTimesDialogMessage.textContent = "";
            portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "";
          }
        });
        portalContext.elements.engagementsClubTimesDialogList?.addEventListener("change", (event) => {
          if (event.target.matches("[data-engagement-club-time-history-select]")) {
            const row = event.target.closest("[data-engagement-club-time-dialog-row]");
            const input = row?.querySelector("[data-engagement-club-time-dialog-input]");
            const toggle = row?.querySelector("[data-engagement-club-time-toggle]");
            if (input) {
              input.value = event.target.value;
              input.hidden = true;
              input.disabled = true;
            }
            if (toggle) {
              toggle.textContent = "Saisie libre";
              toggle.dataset.automaticTime = event.target.value;
            }
            portalActions.updateEngagementClubTimeDialogHelp(event.target);
            if (portalContext.elements.engagementsClubTimesDialogMessage) {
              portalContext.elements.engagementsClubTimesDialogMessage.textContent = "";
              portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "";
            }
            return;
          }
          if (!event.target.matches("[data-engagement-club-time-dialog-input]")) return;
          if (!portalActions.normalizeEngagementEntryTimeInput(event.target)) event.target.reportValidity?.();
        });
        portalContext.elements.engagementsClubTimesDialogApply?.addEventListener("click", portalActions.applyEngagementClubTimesDialog);
        portalContext.elements.engagementsClubTimesDialogClose?.addEventListener("click", portalActions.closeEngagementClubTimesDialog);
        portalContext.elements.engagementsClubTimesDialogCancel?.addEventListener("click", portalActions.closeEngagementClubTimesDialog);
        portalContext.elements.engagementsClubTimesDialog?.addEventListener("cancel", (event) => {
          event.preventDefault();
          portalActions.closeEngagementClubTimesDialog();
        });
        portalContext.elements.engagementsClubTimesDialog?.addEventListener("click", (event) => {
          if (event.target === portalContext.elements.engagementsClubTimesDialog) portalActions.closeEngagementClubTimesDialog();
        });
        portalContext.elements.engagementsClubRelayDialogApply?.addEventListener("click", () => void portalActions.applyEngagementClubRelayDialog());
        portalContext.elements.engagementsClubRelayDialogReset?.addEventListener("click", portalActions.resetEngagementClubRelayDialogMembers);
        portalContext.elements.engagementsClubRelayDialog?.addEventListener("input", (event) => {
          if (event.target === portalContext.elements.engagementsClubRelayDialogTime) event.target.setCustomValidity?.("");
          if (portalContext.elements.engagementsClubRelayDialogMessage) {
            portalContext.elements.engagementsClubRelayDialogMessage.textContent = "";
            portalContext.elements.engagementsClubRelayDialogMessage.dataset.tone = "";
          }
        });
        portalContext.elements.engagementsClubRelayDialog?.addEventListener("change", (event) => {
          if (event.target.matches("[data-engagement-club-relay-dialog-member]")) {
            portalActions.syncEngagementClubRelayDialogMemberOptions();
            portalState.engagementClubRelayDialogDraft = portalActions.readEngagementClubRelayDialogDraft();
            const selectedCount = (portalState.engagementClubRelayDialogDraft?.memberIds || []).filter(Boolean).length;
            const relayEvent = portalActions.engagementClubRelayEvents().find((item) => item.code === portalState.engagementClubRelayDialogDraft?.eventCode) || {};
            const peopleWording = portalActions.engagementRelayPeopleWording(portalState.engagementClubRelayDialogDraft?.genderMode);
            if (portalContext.elements.engagementsClubRelayDialogMembersSummary) {
              portalContext.elements.engagementsClubRelayDialogMembersSummary.textContent = selectedCount
                ? `Participants · ${selectedCount}/${portalActions.engagementRelayLegCount(relayEvent)}`
                : `Choisir les ${peopleWording.plural}`;
            }
            return;
          }
          const fieldByElement = new Map([
            [portalContext.elements.engagementsClubRelayDialogEvent, "event"],
            [portalContext.elements.engagementsClubRelayDialogCategory, "category"],
            [portalContext.elements.engagementsClubRelayDialogGender, "gender"]
          ]);
          const changedField = fieldByElement.get(event.target);
          if (event.target === portalContext.elements.engagementsClubRelayDialogTime) {
            if (!portalActions.normalizeEngagementEntryTimeInput(event.target)) event.target.reportValidity?.();
            return;
          }
          if (!changedField || !portalState.engagementClubRelayDialogDraft) return;
          const previousRelay = portalState.engagementClubRelayDialogDraft;
          const currentRelay = portalActions.readEngagementClubRelayDialogDraft();
          const reconciledRelay = portalActions.reconcileEngagementClubRelayDraft(currentRelay, previousRelay, changedField);
          const previousMemberCount = (previousRelay.memberIds || []).filter(Boolean).length;
          const nextMemberCount = (reconciledRelay.memberIds || []).filter(Boolean).length;
          portalState.engagementClubRelayDialogDraft = reconciledRelay;
          portalActions.renderEngagementClubRelayDialog();
          if (previousMemberCount > nextMemberCount && portalContext.elements.engagementsClubRelayDialogMessage) {
            portalContext.elements.engagementsClubRelayDialogMessage.textContent = "Les participants devenus incompatibles ont été retirés.";
            portalContext.elements.engagementsClubRelayDialogMessage.dataset.tone = "";
          }
          global.requestAnimationFrame?.(() => event.target?.id && document.querySelector(`#${event.target.id}`)?.focus?.());
        });
        portalContext.elements.engagementsClubRelayDialogClose?.addEventListener("click", () => portalActions.closeEngagementClubRelayDialog());
        portalContext.elements.engagementsClubRelayDialogCancel?.addEventListener("click", () => portalActions.closeEngagementClubRelayDialog());
        portalContext.elements.engagementsClubRelayDialog?.addEventListener("cancel", (event) => {
          event.preventDefault();
          portalActions.closeEngagementClubRelayDialog();
        });
        portalContext.elements.engagementsClubRelayDialog?.addEventListener("click", (event) => {
          if (event.target === portalContext.elements.engagementsClubRelayDialog) portalActions.closeEngagementClubRelayDialog();
        });
        portalContext.elements.engagementsClubRelaysList?.addEventListener("change", (event) => {
          const changedControl = event.target;
          if (changedControl.matches("[data-engagement-club-relay-time]") && !portalActions.normalizeEngagementEntryTimeInput(changedControl)) {
            if (portalContext.elements.engagementsClubRelaysMessage) {
              portalContext.elements.engagementsClubRelaysMessage.textContent = "Temps invalide : utilisez MM:SS.CC ou saisissez uniquement les chiffres.";
              portalContext.elements.engagementsClubRelaysMessage.dataset.tone = "error";
            }
            changedControl.reportValidity?.();
            return;
          }
          const row = changedControl.closest("[data-engagement-club-relay-row]");
          const relayId = row?.dataset.engagementClubRelayId || "";
          const previousRelay = portalState.engagementClubRelaysDraft.find((relay) => relay.relayId === relayId) || {};
          const changedField = changedControl.matches("[data-engagement-club-relay-event]")
            ? "event"
            : changedControl.matches("[data-engagement-club-relay-category]")
              ? "category"
              : changedControl.matches("[data-engagement-club-relay-gender]")
                ? "gender" : "time";
          portalState.engagementClubRelaysDraft = portalActions.selectedEngagementClubRelayRowsFromDom().map((relay) =>
            relay.relayId === relayId
              ? { ...portalActions.reconcileEngagementClubRelayDraft(relay, previousRelay, changedField), draftPending: true }
              : relay
          );
          portalActions.renderEngagementClubRelays();
          const focusSelector = changedField === "event"
            ? "[data-engagement-club-relay-event]"
            : changedField === "category"
              ? "[data-engagement-club-relay-category]"
              : changedField === "gender"
                ? "[data-engagement-club-relay-gender]" : "[data-engagement-club-relay-time]";
          portalActions.focusEngagementClubRelayControl(relayId, focusSelector);
          if (portalContext.elements.engagementsClubRelaysMessage) portalContext.elements.engagementsClubRelaysMessage.textContent = "";
        });
        portalContext.elements.engagementsClubRelaysList?.addEventListener("input", (event) => {
          if (!event.target.matches("[data-engagement-club-relay-time]")) return;
          event.target.setCustomValidity?.("");
          if (portalContext.elements.engagementsClubRelaysMessage) {
            portalContext.elements.engagementsClubRelaysMessage.textContent = "";
            portalContext.elements.engagementsClubRelaysMessage.dataset.tone = "";
          }
        });
        portalContext.elements.engagementsClubRelaysList?.addEventListener("pointerdown", (event) => {
          const composeButton = event.target.closest("[data-engagement-club-relay-compose]");
          if (!composeButton || (Number.isFinite(event.button) && event.button !== 0)) return;
          event.preventDefault();
          portalActions.openEngagementClubRelayDialog(composeButton.dataset.engagementClubRelayCompose || "", composeButton);
          if (portalContext.elements.engagementsClubRelaysMessage) portalContext.elements.engagementsClubRelaysMessage.textContent = "";
        });
        portalContext.elements.engagementsClubRelaysList?.addEventListener("click", async (event) => {
          const editButton = event.target.closest("[data-engagement-club-relay-edit]");
          if (editButton) {
            const row = editButton.closest("[data-engagement-club-relay-row]");
            const relayId = row?.dataset.engagementClubRelayId || "";
            portalActions.openEngagementClubRelayDialog(relayId, editButton);
            return;
          }
          const cancelEditButton = event.target.closest("[data-engagement-club-relay-cancel-edit]");
          if (cancelEditButton) {
            const row = cancelEditButton.closest("[data-engagement-club-relay-row]");
            const relayId = row?.dataset.engagementClubRelayId || "";
            const savedRelay = (portalState.selectedEngagementClubEntry?.relays || []).find((relay) => relay.relayId === relayId);
            if (savedRelay) {
              portalState.engagementClubRelaysDraft = portalActions.selectedEngagementClubRelayRowsFromDom().map((candidate) => candidate.relayId === relayId
                ? { ...savedRelay, persisted: true, draftPending: false, draftNotice: "" }
                : candidate);
              portalActions.renderEngagementClubRelays();
            }
            if (portalContext.elements.engagementsClubRelaysMessage) {
              portalContext.elements.engagementsClubRelaysMessage.textContent = "Modifications annulées.";
              portalContext.elements.engagementsClubRelaysMessage.dataset.tone = "";
            }
            return;
          }
          const composeButton = event.target.closest("[data-engagement-club-relay-compose]");
          if (composeButton) {
            if (!portalContext.elements.engagementsClubRelayDialog?.open) {
              portalActions.openEngagementClubRelayDialog(composeButton.dataset.engagementClubRelayCompose || "", composeButton);
            }
            if (portalContext.elements.engagementsClubRelaysMessage) portalContext.elements.engagementsClubRelaysMessage.textContent = "";
            return;
          }
          const removeButton = event.target.closest("[data-engagement-club-relay-remove]");
          if (!removeButton) return;
          const row = removeButton.closest("[data-engagement-club-relay-row]");
          const relayId = row?.dataset.engagementClubRelayId || "";
          const currentRows = portalActions.selectedEngagementClubRelayRowsFromDom();
          const relay = currentRows.find((candidate) => candidate.relayId === relayId);
          if (!relay) return;
          if (relay.persisted && !global.confirm("Supprimer définitivement ce relais enregistré ?")) return;
          portalState.engagementClubRelaysDraft = currentRows.filter((candidate) => candidate.relayId !== relayId);
          portalActions.renderEngagementClubRelays();
          if (relay.persisted) {
            const saved = await portalActions.saveEngagementClubRelays(null, portalContext.elements.engagementsClubRelaysMessage, portalState.engagementClubRelaysDraft, relayId);
            if (!saved) {
              portalState.engagementClubRelaysDraft = currentRows;
              portalActions.renderEngagementClubRelays();
            } else {
              const drafts = currentRows.filter((candidate) => candidate.relayId !== relayId && candidate.draftPending);
              if (drafts.length) {
                const ids = new Set(drafts.map((candidate) => candidate.relayId));
                portalState.engagementClubRelaysDraft = [...(portalState.selectedEngagementClubEntry?.relays || []).filter((candidate) => !ids.has(candidate.relayId)), ...drafts];
                portalActions.renderEngagementClubRelays();
              }
            }
            return;
          }
          if (portalContext.elements.engagementsClubRelaysMessage) portalContext.elements.engagementsClubRelaysMessage.textContent = "";
        });
        portalContext.elements.engagementsClubEntriesList?.addEventListener("input", () => {
          if (portalContext.elements.engagementsClubEntriesMessage) portalContext.elements.engagementsClubEntriesMessage.textContent = "";
        });
        portalContext.elements.engagementsLevel?.addEventListener("change", () => {
          portalActions.updateEngagementCreateFormAccess();
        });
        portalContext.elements.engagementsCreateOpen?.addEventListener("click", portalActions.openCreateCompetitionDialog);
        portalContext.elements.engagementsCreateDialogClose?.addEventListener("click", () => portalContext.elements.engagementsCreateDialog?.close());
        portalContext.elements.engagementsCreateCompleteNow?.addEventListener("click", () => void portalActions.completeNewlyCreatedEngagementCompetition());
        portalContext.elements.engagementsCreateChecklist?.addEventListener("close", () => { portalState.newlyCreatedEngagementCompetitionId = ""; });
        portalContext.elements.engagementsRegionId?.addEventListener("change", () => portalActions.updateEngagementCreateFormAccess());
        portalContext.elements.engagementsEditLevel?.addEventListener("change", () => {
          portalActions.setDefaultEngagementOfficialsRequired("edit");
          portalActions.updateEngagementEditFormAccess();
        });
        portalContext.elements.engagementsEditRegionId?.addEventListener("change", () => portalActions.updateEngagementEditFormAccess());
        portalContext.elements.engagementsEditQualificationMode?.addEventListener("change", () => { portalActions.updateEngagementQualificationFields("edit"); portalState.qualificationEditor?.refreshPeriod(); });
        [portalContext.elements.engagementsEditQualificationStart, portalContext.elements.engagementsEditQualificationEnd].forEach((field) => field?.addEventListener("change", () => portalState.qualificationEditor?.refreshPeriod()));
        portalContext.elements.engagementsEditMaxEventsUnlimited?.addEventListener("change", () => portalActions.updateEngagementMaxEventsFields("edit"));
        portalContext.elements.engagementsEditInvitedRegionChoices?.addEventListener("change", (event) => portalActions.syncInvitedRegionChoice(event, portalContext.elements.engagementsEditInvitedRegionIds));
        portalActions.prepareCreateCompetitionDialog();
        portalActions.updateEngagementQualificationFields("edit");
        portalActions.updateEngagementMaxEventsFields("edit");
        portalContext.elements.accountToggle?.addEventListener("click", () => {
          const open = portalContext.elements.accountToggle.getAttribute("aria-expanded") !== "true";
          portalContext.elements.accountToggle.setAttribute("aria-expanded", open ? "true" : "false");
          if (portalContext.elements.accountActions) portalContext.elements.accountActions.hidden = !open;
        });
        portalContext.elements.accountActions?.addEventListener("click", portalActions.closeAccountMenu);
        document.addEventListener("click", (event) => {
          if (!portalContext.elements.accountControl?.contains(event.target)) portalActions.closeAccountMenu();
        });
        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape") portalActions.closeAccountMenu();
        });
        portalContext.elements.navToggle?.addEventListener("click", () => {
          portalActions.setMobilePortalNavigationOpen(portalContext.elements.navToggle.getAttribute("aria-expanded") !== "true");
        });
        portalContext.elements.navPin?.addEventListener("click", () => {
          portalActions.setPortalNavigationPinned(portalContext.elements.navPin.getAttribute("aria-pressed") !== "true");
        });
        portalContext.elements.sidebar?.addEventListener("pointerleave", () => {
          portalContext.elements.sidebar.classList.remove("is-collapsed-after-navigation");
        });
        portalContext.elements.sidebar?.addEventListener("focusin", () => {
          portalContext.elements.sidebar.classList.remove("is-collapsed-after-navigation");
        });
        portalContext.elements.clubToggle?.addEventListener("click", () => {
          if (portalState.selectedEngagementCompetitionId && !portalActions.closeEngagementCompetitionDetail()) return;
          portalActions.togglePortalSpace("club", "clubHome", "espace-club", portalContext.elements.clubToggle);
          portalActions.collapsePortalNavigationAfterSelection();
        });
        portalContext.elements.performanceToggle?.addEventListener("click", () => {
          portalActions.togglePortalSpace("performance", "performanceHome", "gestion-performances", portalContext.elements.performanceToggle);
          portalActions.collapsePortalNavigationAfterSelection();
        });
        portalContext.elements.engagementsAdminToggle?.addEventListener("click", () => {
          global.location.hash = "competitions-calendrier";
          portalActions.collapsePortalNavigationAfterSelection();
        });
        portalContext.elements.dtnToggle?.addEventListener("click", () => {
          portalActions.togglePortalSpace("dtn", "dtnHome", "espace-dtn", portalContext.elements.dtnToggle);
          portalActions.collapsePortalNavigationAfterSelection();
        });
        portalContext.elements.nationalToggle?.addEventListener("click", () => {
          if (global.location.hash === "#administration-nationale") portalActions.updateNavigationView();
          else global.location.hash = "administration-nationale";
          portalActions.collapsePortalNavigationAfterSelection();
        });
        portalContext.elements.accessToggle?.addEventListener("click", () => {
          portalActions.togglePortalSpace("access", "accessHome", "gestion-acces", portalContext.elements.accessToggle);
          portalActions.collapsePortalNavigationAfterSelection();
        });
        portalContext.elements.overviewSpaceToggles.forEach((toggle) => toggle.addEventListener("click", () => {
          const card = toggle.closest("[data-overview-space]");
          const expanded = toggle.getAttribute("aria-expanded") !== "true";
          document.querySelectorAll("[data-overview-space].is-expanded").forEach((otherCard) => {
            if (otherCard !== card) portalActions.setOverviewSpaceExpanded(otherCard, false);
          });
          portalActions.setOverviewSpaceExpanded(card, expanded);
          if (!expanded) toggle.blur();
        }));
        portalContext.elements.engagementsHomeLinks.forEach((link) => link.addEventListener("click", (event) => {
          const nextEntry = link.dataset.engagementsHomeEntry || "adminCalendar";
          const nextTab = link.dataset.engagementsHomeTab || "calendar";
          const contextChanged = portalActions.engagementNavigationMode(nextEntry) !== portalActions.engagementNavigationMode();
          const closesCompetitionDetail = Boolean(portalState.selectedEngagementCompetitionId && (contextChanged || nextTab === "calendar"));
          if (closesCompetitionDetail && !portalActions.confirmLeaveDirtyEngagementTab()) {
            event.preventDefault();
            return;
          }
          portalState.activeEngagementsNavEntry = nextEntry;
          portalActions.setEngagementsTab(nextTab);
          if (closesCompetitionDetail) portalActions.closeEngagementCompetitionDetail({ skipConfirmation: true });
          if (link.dataset.engagementsNationalTarget) {
            portalActions.setEngagementNationalTab(link.dataset.engagementsNationalTarget);
          }
          if (global.location.hash === link.hash) portalActions.updateNavigationView();
        }));
        portalContext.elements.navigation?.addEventListener("click", (event) => {
          const link = event.target.closest("a");
          if (!link) return;
          if (link.dataset.adminViewLink === "engagements") {
            const nextEntry = link.dataset.engagementsNavEntry || "club";
            const contextChanged = portalActions.engagementNavigationMode(nextEntry) !== portalActions.engagementNavigationMode();
            if (contextChanged && portalState.selectedEngagementCompetitionId && !portalActions.confirmLeaveDirtyEngagementTab()) {
              event.preventDefault();
              return;
            }
            portalState.activeEngagementsNavEntry = nextEntry;
            if (link.dataset.engagementsNavTab) {
              portalActions.setEngagementsTab(link.dataset.engagementsNavTab);
            }
            if (link.dataset.engagementsNationalTarget) {
              portalActions.setEngagementNationalTab(link.dataset.engagementsNationalTarget);
            }
            if (portalState.activeEngagementsTab === "calendar") {
              portalActions.closeEngagementCompetitionDetail({ skipConfirmation: contextChanged });
              portalActions.loadEngagementCompetitions();
            }
            if (portalState.activeEngagementsTab === "accessRequests") {
              portalActions.closeEngagementCompetitionDetail();
              portalActions.loadEngagementAccessRequests();
            }
            if (portalState.activeEngagementsTab === "deletionRequests") {
              portalActions.closeEngagementCompetitionDetail();
              portalActions.loadEngagementDeletionRequests();
            }
            if (portalState.activeEngagementsTab === "clubPeople") {
              portalActions.closeEngagementCompetitionDetail();
              portalActions.loadEngagementClubPeople({force:global.LivePalmesEnvironment?.sportingDataSource === "nap"});
              portalActions.loadEngagementClubSwimmers({ silent: true });
            }
            if (portalState.activeEngagementsTab === "clubSwimmers") {
              portalActions.closeEngagementCompetitionDetail();
              portalActions.loadEngagementClubSwimmers();
            }
            if (global.location.hash === link.hash) portalActions.updateNavigationView();
          }
          portalActions.collapsePortalNavigationAfterSelection();
        });
        portalContext.elements.accountEmailForm?.addEventListener("submit", portalActions.updateAccountEmail);
        portalContext.elements.accountCompetitionNotifications?.addEventListener("click", portalActions.toggleAccountNotificationPreferences);
        portalContext.elements.accountPasswordForm?.addEventListener("submit", portalActions.updateAccountPassword);
        [portalContext.elements.accountNotificationsDetails, portalContext.elements.accountEmailDetails, portalContext.elements.accountPasswordDetails].forEach((details) => {
          details?.querySelector(":scope > summary")?.addEventListener("click", () => {
            if (details.open) return;
            [portalContext.elements.accountEmailDetails, portalContext.elements.accountPasswordDetails].forEach((otherDetails) => {
              if (otherDetails && otherDetails !== details) otherDetails.open = false;
            });
          });
        });
        portalContext.elements.accessForm?.addEventListener("submit", portalActions.saveAccessUser);
        portalContext.elements.accessRegionId?.addEventListener("change", () => void portalActions.loadAccessClubReference().then(() => portalActions.populateAccessClubSelect()));
        portalContext.elements.accessClubSelect?.addEventListener("focus", () => void portalActions.loadAccessClubReference().then(() => portalActions.populateAccessClubSelect()));
        portalContext.elements.accessClubSelect?.addEventListener("change", portalActions.syncAccessClubFieldsFromSelect);
        portalContext.elements.accessDeletionRequestsRefresh?.addEventListener("click", () => portalActions.loadAccessDeletionRequests({ force: true }));
        portalContext.elements.accessAdd?.addEventListener("click", () => {
          if (!portalActions.canUse("admin.full") && !portalActions.canUse("engagements.region.manage")) return;
          portalActions.resetAccessForm();
          void portalActions.loadAccessClubReference().then(() => portalActions.populateAccessClubSelect());
          portalActions.openAccessDialog();
          portalContext.elements.accessForm?.querySelector("#adminAccessLastName")?.focus();
        });
        portalContext.elements.cancelEdit?.addEventListener("click", () => portalActions.resetAccessForm(true));
        portalContext.elements.accessDialogClose?.addEventListener("click", () => portalActions.resetAccessForm(true));
        portalContext.elements.accessPanel?.addEventListener("close", () => {
          portalActions.resetAccessForm();
          portalContext.elements.accessAdd?.setAttribute("aria-expanded", "false");
        });
        portalContext.elements.accessFilters?.addEventListener("submit", (event) => {
          event.preventDefault();
          portalActions.loadAccessUsers({ reset: true });
        });
        portalContext.elements.accessStatusFilter?.addEventListener("change", () => portalActions.loadAccessUsers({ reset: true }));
        portalContext.elements.accessCapabilityFilter?.addEventListener("change", () => portalActions.loadAccessUsers({ reset: true }));
        portalContext.elements.accessClearFilters?.addEventListener("click", () => {
          portalContext.elements.accessFilters?.reset();
          portalState.accessDirectoryLetter = "";
          portalActions.loadAccessUsers({ reset: true });
        });
        portalContext.elements.accessAlphabet?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-access-directory-letter]");
          if (!button || button.disabled || !portalState.accessDirectorySnapshotMode) return;
          portalState.accessDirectoryLetter = button.dataset.accessDirectoryLetter || "";
          portalActions.renderAccessDirectorySnapshotPage({ reset: true });
        });
        portalContext.elements.accessPreviousPage?.addEventListener("click", portalActions.showPreviousAccessPage);
        portalContext.elements.accessNextPage?.addEventListener("click", portalActions.showNextAccessPage);
        global.addEventListener("hashchange", portalActions.updateNavigationView);
        document.addEventListener("click", event => {
          if (!global.matchMedia("(max-width: 1080px)").matches || document.body.dataset.adminAuth !== "unlocked"
            || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          const link = event.target.closest("#livepalmesMobileNavigation a, #publicSiteHeader a");
          if (!link) return;
          const destination = new URL(link.href, global.location.href);
          if (destination.origin !== global.location.origin || destination.pathname === "/portail.html") return;
          try {
            portalActions.preserveEngagementNavigation();
            link.target = "_self";
            link.rel = "noopener";
          } catch (error) {
            event.preventDefault();
            global.alert(error.message);
          }
        }, true);
        portalContext.elements.accessList?.addEventListener("click", (event) => {
          const directoryToggle = event.target.closest("[data-access-directory-toggle]");
          if (directoryToggle) {
            const row = directoryToggle.closest(".admin-access-row");
            const willExpand = row?.dataset.expanded !== "true";
            portalContext.elements.accessList.querySelectorAll('.admin-access-row[data-expanded="true"]').forEach((expandedRow) => {
              expandedRow.dataset.expanded = "false";
              expandedRow.querySelectorAll("[data-access-directory-toggle]").forEach((toggle) => toggle.setAttribute("aria-expanded", "false"));
            });
            if (row) {
              row.dataset.expanded = willExpand ? "true" : "false";
              row.querySelectorAll("[data-access-directory-toggle]").forEach((toggle) => toggle.setAttribute("aria-expanded", willExpand ? "true" : "false"));
            }
            return;
          }
          const edit = event.target.closest("[data-access-edit]");
          if (edit) {
            const user = portalState.accessUsers.find((item) => item.uid === edit.dataset.accessEdit);
            if (user) portalActions.fillAccessForm(user);
            return;
          }
          const statusButton = event.target.closest("[data-access-status]");
          if (statusButton) {
            portalActions.setAccessStatus(statusButton.dataset.accessUid, statusButton.dataset.accessStatus);
            return;
          }
          const deleteButton = event.target.closest("[data-access-delete]");
          if (deleteButton) {
            portalActions.deleteAccessUser(deleteButton.dataset.accessDelete);
            return;
          }
          const deleteRequestButton = event.target.closest("[data-access-delete-request]");
          if (deleteRequestButton) {
            portalActions.requestAccessUserDeletion(deleteRequestButton.dataset.accessDeleteRequest);
          }
        });
        portalContext.elements.accessDeletionRequestsList?.addEventListener("click", (event) => {
          const decisionButton = event.target.closest("[data-access-deletion-decision]");
          if (!decisionButton) return;
          portalActions.resolveAccessDeletionRequest(decisionButton.dataset.accessDeletionRequestId, decisionButton.dataset.accessDeletionDecision);
        });
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") portalActions.flushPendingEngagementClubWrites();
        });
        global.addEventListener("livepalmes:calendar-events-changed", async (event) => {
          portalActions.invalidateEngagementCalendarCaches();
          if (!portalActions.isEngagementAdminMode()) return;
          await portalActions.loadEngagementCompetitions({ force: true });
          const detail = event.detail || {};
          if (detail.action === "delete") {
            portalActions.removeEngagementCalendarItemFromCache(detail.calendarEventId, "calendarEvent");
          } else if (detail.event) {
            portalActions.upsertEngagementCalendarItemFromServer(detail.event, "calendarEvent");
          }
        });
        global.addEventListener("beforeunload", (event) => {
          if (!portalActions.engagementClubHasPendingWrites()) return;
          portalActions.flushPendingEngagementClubWrites();
          event.preventDefault();
          event.returnValue = "";
        });
      }

    return {
      bindEngagementClubPeopleRetry,
      init
    };
  }
  global.LivePalmesPortalEvents = { create };
})(window);
