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
        document.querySelector("#adminPortalAuthRetry")?.addEventListener("click", async (event) => {
          const button = event.currentTarget; button.disabled = true;
          portalActions.setMessage("Vérification de votre accès…", "loading");
          try { await auth?.refreshProfile?.(); }
          finally { button.disabled = false; }
        });
        document.addEventListener("livepalmes:portal-session-locked", () => portalActions.suspendEngagementClubWrites());
        document.addEventListener("livepalmes:portal-session-resumed", (event) => {
          portalActions.clearEngagementClubWorkspaceSessionCaches();
          portalActions.clearEngagementClubSwimmersSessionCaches();
          portalActions.invalidateEngagementCalendarCaches();
          portalState.engagementClubPeopleRequestVersion += 1;
          portalState.engagementClubPeopleLoading = false;
          portalState.engagementClubPeopleLoaded = false;
          if (!event.detail.changed) portalState.currentAccessProfile = event.detail.profile;
          // Preserve the current form in memory. No write or replay on resume;
          // server fingerprints still validate the next deliberate save.
        });
        bindEngagementClubPeopleRetry();
        /* deferred-listeners: assets/portal/deferred/workspace-events.js */
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
          portalActions.updateAccessRequestLicenseFields();
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

        portalContext.elements.overviewSpaceToggles.forEach((toggle) => toggle.addEventListener("click", () => {
          const card = toggle.closest("[data-overview-space]");
          const expanded = toggle.getAttribute("aria-expanded") !== "true";
          document.querySelectorAll("[data-overview-space].is-expanded").forEach((otherCard) => {
            if (otherCard !== card) portalActions.setOverviewSpaceExpanded(otherCard, false);
          });
          portalActions.setOverviewSpaceExpanded(card, expanded);
          if (!expanded) toggle.blur();
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
              portalActions.loadEngagementClubPeople();
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
