(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    function renderEngagementCompetitionDetail(competition = {}) {
        if (portalContext.elements.engagementsDetailRetry) portalContext.elements.engagementsDetailRetry.hidden = true;
        portalActions.renderQualificationJobActions(competition);
        portalActions.setEngagementCompetitionDetailVisible(true);
        portalState.engagementDetailEditing = false;
        portalActions.setEngagementsDetailTab(portalState.activeEngagementsDetailTab);
        if (portalContext.elements.engagementsEditForm) portalContext.elements.engagementsEditForm.hidden = true;
        if (portalContext.elements.engagementsDetailList) portalContext.elements.engagementsDetailList.hidden = false;
        if (portalContext.elements.engagementsEditButton) portalContext.elements.engagementsEditButton.hidden = !portalActions.isEngagementAdminMode() || !portalActions.canEditEngagementCompetition(competition);
        if (portalContext.elements.engagementsSaveButton) portalContext.elements.engagementsSaveButton.hidden = true;
        if (portalContext.elements.engagementsEditCancelTop) portalContext.elements.engagementsEditCancelTop.hidden = true;
        if (portalContext.elements.engagementsDeleteButton) {
          const canRequestOrDelete = portalActions.isEngagementAdminMode() && portalActions.canManageEngagementCompetitionScope(competition) && (competition.napSource !== true || portalActions.canDeleteEngagementCompetitionImmediately(competition));
          const deletionPending = portalActions.isEngagementAdminMode() && competition.deletionRequestStatus === "pending";
          const directDelete = portalActions.canDeleteEngagementCompetitionImmediately(competition);
          portalContext.elements.engagementsDeleteButton.hidden = !canRequestOrDelete;
          portalContext.elements.engagementsDeleteButton.disabled = deletionPending && !directDelete;
          portalContext.elements.engagementsDeleteButton.textContent = deletionPending && !directDelete
            ? "Suppression demandée"
            : directDelete
            ? "Supprimer"
            : "Demander la suppression";
        }
        if (portalContext.elements.engagementsDetailTitle) {
        portalContext.elements.engagementsDetailTitle.textContent = competition.name || "Compétition sans nom";
        }
        if (portalContext.elements.engagementsDetailSubtitle) {
          portalContext.elements.engagementsDetailSubtitle.textContent = [
            competition.endDate && competition.endDate !== competition.date
              ? `${portalActions.formatShortDate(competition.date)} au ${portalActions.formatShortDate(competition.endDate)}`
              : portalActions.formatShortDate(competition.date),
            portalActions.isEngagementAdminMode()
              ? competition.location || competition.city || ""
              : competition.city || competition.location || ""
          ].filter((item) => item && item !== "-").join(" · ");
        }
        if (portalContext.elements.engagementsDetailMeta) {
          const contextMessage = portalActions.engagementClubContextMessage(competition);
          const warnings = (competition.nativeWarnings || []).filter(warning => !portalActions.engagementNativeEditWarningKind(warning));
          portalContext.elements.engagementsDetailMeta.innerHTML = competition.napSource === true
            ? `${contextMessage ? `<p role="status">${portalActions.escapeHtml(contextMessage)}</p>` : ""}${warnings.map(warning => `<p>${portalActions.escapeHtml(warning)}</p>`).join("")}`
            : "";
          portalContext.elements.engagementsDetailMeta.hidden = !portalContext.elements.engagementsDetailMeta.innerHTML;
        }
        const adminMode = portalActions.isEngagementAdminMode();
        const feedback = portalContext.elements.engagementsSaveState?.closest("[data-engagement-club-feedback]");
        if (feedback) feedback.hidden = adminMode || competition.entryStatus !== "open" || Boolean(portalActions.engagementClubSwimmerSelectionLockReason());
        if (portalContext.elements.engagementsDetailLevel) {
          portalContext.elements.engagementsDetailLevel.textContent = portalActions.engagementLevelLabel(competition.level);
          portalContext.elements.engagementsDetailLevel.dataset.level = competition.level || "";
          portalContext.elements.engagementsDetailLevel.hidden = false;
        }
        if (portalContext.elements.engagementsDetailEntryStatus) {
          portalActions.renderEngagementDetailStatus(competition);
        }
        if (portalContext.elements.engagementsCancellationAlert) portalContext.elements.engagementsCancellationAlert.hidden = competition.canceled !== true;
        const openWater = portalActions.engagementCompetitionType(competition) === "openWater";
        const nationalCompetition = ["national", "international"].includes(competition.level);
        const clubWhatsAppValue = portalActions.engagementTeamLeadersWhatsAppValue(competition);
        const publicDescription = [String(competition.publicDescription || "").trim(), competition.legacyDescription ? `Présentation existante\n${competition.legacyDescription}` : ""].filter(Boolean).join("\n\n");
        if (portalContext.elements.engagementsPublicInfo) portalContext.elements.engagementsPublicInfo.hidden = !publicDescription;
        if (portalContext.elements.engagementsPublicInfoTitle) {
          portalContext.elements.engagementsPublicInfoTitle.textContent = adminMode ? "Présentation publique" : "Informations de l’organisateur";
        }
        if (portalContext.elements.engagementsPublicInfoText) portalContext.elements.engagementsPublicInfoText.textContent = publicDescription;
        const sharedRows = [
          ["Type", portalActions.engagementCompetitionTypeLabel(portalActions.engagementCompetitionType(competition))],
          ["Date", portalActions.formatShortDate(competition.date)],
          ["Date de fin", portalActions.formatShortDate(competition.endDate || competition.date)],
          ["Lieu", portalActions.engagementVenueLabel(competition)],
          ...(competition.napSource && competition.nativeRules?.courses?.length ? [["Courses proposées", competition.nativeRules.courses.map(course => `${course.course || "Course ancienne"}${course.sexe === "F" ? " femmes" : course.sexe === "M" ? " hommes" : ""}`).join(", ")]] : []),
          ...(competition.organizer ? [["Organisateur", competition.organizer]] : []),
          ...(competition.organizerEmail ? [["Email organisateur", portalActions.engagementEmailLinkValue(competition.organizerEmail)]] : []),
          ...(!nationalCompetition ? [
            ["Région", portalActions.regionDisplayLabel(competition.regionId)],
            ["Régions invitées", (competition.invitedRegionIds || []).map(portalActions.regionDisplayLabel).filter((region) => region && region !== "-").join(", ") || "-"]
          ] : []),
          ["Niveau", portalActions.engagementLevelLabel(competition.level)],
          ["Statut engagements", competition.canceled ? "Compétition annulée" : portalActions.engagementOperationalStatusLabel(competition)],
          ["Limite engagements", portalActions.formatDeadline(competition.entryDeadlineAt)],
          [openWater ? "Plan d’eau" : "Bassin", portalActions.engagementFacilityLabel(competition)],
          ...(!openWater ? [
            ["Temps engagements", portalActions.engagementQualificationPeriodLabel(competition)],
            ["Sans temps connu", competition.napSource === true && !competition.missingEntryTimeMode ? "Paramètres natifs conservés" : portalActions.engagementMissingEntryTimeModeLabel(competition.missingEntryTimeMode)]
          ] : []),
          ["Max épreuves nageur", portalActions.engagementMaxEventsLabel(competition.maxEventsPerSwimmer)],
          ["Officiels", competition.officialsRequired ? "Requis" : "Non requis"],
          ["Programme", portalActions.engagementEventSummary(competition.events || [])],
          ["Frais", portalActions.engagementFeesSummary(competition.fees || {})]
        ];
        const clubRows = [
          ["Type", portalActions.engagementCompetitionTypeLabel(portalActions.engagementCompetitionType(competition))],
          ["Date", competition.endDate && competition.endDate !== competition.date
            ? `${portalActions.formatShortDate(competition.date)} au ${portalActions.formatShortDate(competition.endDate)}`
            : portalActions.formatShortDate(competition.date)],
          ["Lieu", portalActions.engagementVenueLabel(competition)],
          ...(competition.organizer ? [["Organisateur", competition.organizer]] : []),
          ...(competition.organizerEmail ? [["Email organisateur", portalActions.engagementEmailLinkValue(competition.organizerEmail)]] : []),
          ...(clubWhatsAppValue ? [["Groupe WhatsApp", clubWhatsAppValue]] : []),
          ["Limite engagements", portalActions.formatDeadline(competition.entryDeadlineAt)],
          ["Programme", portalActions.engagementCompetitionProgramOverview(competition)],
          ["Limite par nageur", portalActions.engagementMaxEventsLabel(competition.maxEventsPerSwimmer)],
          ...(!openWater ? [["Temps d'engagement", portalActions.engagementEntryTimeRulesLabel(competition)]] : []),
          ["Frais d'engagement", portalActions.engagementFeesSummary(competition.fees || {})],
          ["Niveau", portalActions.engagementLevelLabel(competition.level)],
          ...(!nationalCompetition ? [["Région", portalActions.regionDisplayLabel(competition.regionId)]] : []),
          ["Officiels", competition.officialsRequired ? "À déclarer" : "Non requis"],
          [openWater ? "Plan d’eau" : "Bassin", portalActions.engagementFacilityLabel(competition)]
        ];
        const rows = adminMode ? [
          ["Identifiant", competition.id || "-"],
          ...sharedRows,
          ["Email du responsable informatique", competition.computerEmail || "-"],
          ["Création", competition.createdAt ? portalActions.formatDeadline(competition.createdAt).replace(/^Limite /, "") : "-"],
          ["Dernière mise à jour", competition.updatedAt ? portalActions.formatDeadline(competition.updatedAt).replace(/^Limite /, "") : "-"]
        ] : clubRows;
        if (portalContext.elements.engagementsDetailList) {
          portalContext.elements.engagementsDetailList.innerHTML = rows.map(([label, value]) => `
        <div>
          <dt>${portalActions.escapeHtml(label)}</dt>
          <dd>${portalActions.engagementRowValueHtml(value)}</dd>
        </div>
      `).join("");
        }
        if (portalContext.elements.engagementsDetailStatus) {
          portalContext.elements.engagementsDetailStatus.textContent = "";
          portalContext.elements.engagementsDetailStatus.dataset.tone = "";
        }
        portalActions.updateEngagementDetailEditState();
        portalActions.renderEngagementEvents(competition);
        portalActions.renderEngagementFees(competition);
        portalActions.renderEngagementDocuments(competition);
      }

    function closeEngagementCompetitionDetail({ skipConfirmation = false } = {}) {
        if (!skipConfirmation && !portalActions.confirmLeaveDirtyEngagementTab()) return false;
        if (!portalState.engagementNavigationRestoring) global.LivePalmesEngagementNavigation?.clear();
        if (portalConfig.engagementClubEntriesAutosaveSwimmers.size) {
          void portalActions.flushEngagementClubIndividualEntriesAutosave();
        }
        if (portalConfig.engagementClubSelectionChanges.size) void portalActions.flushEngagementClubSwimmerSelections();
        portalActions.clearEngagementDetailTabDirty();
        portalState.selectedEngagementCompetitionId = "";
        portalState.selectedEngagementCompetition = null;
        portalState.selectedEngagementClubEntry = null;
        portalState.engagementClubEntryMutationRevision += 1;
        portalState.engagementClubLastPersistedEntry = null;
        portalActions.resetEngagementClubEntriesAutosave();
        portalState.engagementClubPersistedSwimmerIds.clear();
        portalActions.setEngagementClubEntriesDirty(false);
        portalActions.setEngagementClubEntryLoadingState("");
        portalState.engagementClubRecapEntries = [];
        portalState.engagementClubRecapEntriesCompetitionId = "";
        portalState.engagementClubRecapEntriesLoading = false;
        portalState.engagementMailJobs = [];
        portalState.engagementMailJobsCompetitionId = "";
        portalState.engagementMailJobsLoading = false;
        portalState.engagementCompetitionDocumentFiles = [];
        portalState.engagementCompetitionDocumentEditingId = "";
        portalState.engagementCompetitionDocumentSaving = false;
        portalState.engagementCompetitionStatistics = null;
        portalState.engagementCompetitionStatisticsCompetitionId = "";
        portalState.engagementCompetitionStatisticsLoading = false;
        portalActions.setEngagementsDetailTab("general");
        portalActions.setEngagementCompetitionDetailVisible(false);
        if (portalContext.elements.engagementsDetailTitle) portalContext.elements.engagementsDetailTitle.textContent = "Sélectionnez une compétition";
        if (portalContext.elements.engagementsDetailSubtitle) portalContext.elements.engagementsDetailSubtitle.textContent = "";
        if (portalContext.elements.engagementsEditState) portalContext.elements.engagementsEditState.hidden = true;
        if (portalContext.elements.engagementsDetailEntryStatus) portalContext.elements.engagementsDetailEntryStatus.hidden = true;
        if (portalContext.elements.engagementsDetailLevel) portalContext.elements.engagementsDetailLevel.hidden = true;
        if (portalContext.elements.engagementsCancellationAlert) portalContext.elements.engagementsCancellationAlert.hidden = true;
        if (portalContext.elements.engagementsDetailMeta) portalContext.elements.engagementsDetailMeta.innerHTML = "";
        if (portalContext.elements.engagementsPublicInfo) portalContext.elements.engagementsPublicInfo.hidden = true;
        if (portalContext.elements.engagementsPublicInfoText) portalContext.elements.engagementsPublicInfoText.textContent = "";
        if (portalContext.elements.engagementsDetailList) portalContext.elements.engagementsDetailList.innerHTML = "";
        if (portalContext.elements.engagementsEditForm) portalContext.elements.engagementsEditForm.hidden = true;
        if (portalContext.elements.engagementsEditButton) portalContext.elements.engagementsEditButton.hidden = true;
        if (portalContext.elements.engagementsSaveButton) portalContext.elements.engagementsSaveButton.hidden = true;
        if (portalContext.elements.engagementsEditCancelTop) portalContext.elements.engagementsEditCancelTop.hidden = true;
        if (portalContext.elements.engagementsDeleteButton) portalContext.elements.engagementsDeleteButton.hidden = true;
        if (portalContext.elements.engagementsIndividualEvents) portalContext.elements.engagementsIndividualEvents.innerHTML = "";
        if (portalContext.elements.engagementsRelayEvents) portalContext.elements.engagementsRelayEvents.innerHTML = "";
        if (portalContext.elements.engagementsEventsSummary) portalContext.elements.engagementsEventsSummary.textContent = "Aucune épreuve sélectionnée.";
        if (portalContext.elements.engagementsProgramSummary) portalContext.elements.engagementsProgramSummary.textContent = "Ordre non renseigné.";
        if (portalContext.elements.engagementsProgramSessions) portalContext.elements.engagementsProgramSessions.innerHTML = "";
        if (portalContext.elements.engagementsEventsChoiceSummary) portalContext.elements.engagementsEventsChoiceSummary.textContent = "Aucune épreuve sélectionnée.";
        if (portalContext.elements.engagementsEventsMessage) portalContext.elements.engagementsEventsMessage.textContent = "";
        portalActions.setEngagementEventsSectionOpen(portalContext.elements.engagementsEventsChoiceSection, false);
        portalActions.setEngagementEventsSectionOpen(portalContext.elements.engagementsProgramSection, false);
        if (portalContext.elements.engagementsFeesForm) portalContext.elements.engagementsFeesForm.reset();
        if (portalContext.elements.engagementsFeesSummary) portalContext.elements.engagementsFeesSummary.textContent = "Aucun frais renseigne.";
        if (portalContext.elements.engagementsFeesMessage) portalContext.elements.engagementsFeesMessage.textContent = "";
        if (portalContext.elements.engagementsClubTeamForm) portalContext.elements.engagementsClubTeamForm.reset();
        if (portalContext.elements.engagementsClubTeamSummary) portalContext.elements.engagementsClubTeamSummary.textContent = "À renseigner avant de commencer les engagements.";
        if (portalContext.elements.engagementsClubTeamMessage) portalContext.elements.engagementsClubTeamMessage.textContent = "";
        if (portalContext.elements.engagementsClubOfficialsSummary) portalContext.elements.engagementsClubOfficialsSummary.textContent = "Aucun officiel sélectionné.";
        if (portalContext.elements.engagementsClubOfficialsList) portalContext.elements.engagementsClubOfficialsList.innerHTML = "";
        if (portalContext.elements.engagementsClubOfficialsMessage) portalContext.elements.engagementsClubOfficialsMessage.textContent = "";
        if (portalContext.elements.engagementsClubSwimmersSummary) portalContext.elements.engagementsClubSwimmersSummary.textContent = "Aucun nageur engagé.";
        if (portalContext.elements.engagementsClubSwimmersSearch) portalContext.elements.engagementsClubSwimmersSearch.value = "";
        portalState.engagementClubAvailableSwimmersSexFilter = "all";
        portalState.engagementClubInactiveSwimmersDirectoryExpanded = false;
        portalState.engagementClubInactiveSwimmersExpanded = false;
        if (portalContext.elements.engagementsClubSelectedSwimmersList) portalContext.elements.engagementsClubSelectedSwimmersList.innerHTML = "";
        if (portalContext.elements.engagementsClubSwimmersList) portalContext.elements.engagementsClubSwimmersList.innerHTML = "";
        if (portalContext.elements.engagementsClubSwimmersMessage) portalContext.elements.engagementsClubSwimmersMessage.textContent = "";
        if (portalContext.elements.engagementsClubEntriesList) portalContext.elements.engagementsClubEntriesList.innerHTML = "";
        if (portalContext.elements.engagementsClubEntriesMessage) portalContext.elements.engagementsClubEntriesMessage.textContent = "";
        portalState.engagementClubRelaysDraft = [];
        if (portalContext.elements.engagementsClubRelaysSummary) portalContext.elements.engagementsClubRelaysSummary.textContent = "Aucun relais sélectionné.";
        if (portalContext.elements.engagementsClubRelaysList) portalContext.elements.engagementsClubRelaysList.innerHTML = "";
        if (portalContext.elements.engagementsClubRelaysMessage) portalContext.elements.engagementsClubRelaysMessage.textContent = "";
        if (portalContext.elements.engagementsClubSummaryStatus) {
          portalContext.elements.engagementsClubSummaryStatus.textContent = "";
          portalContext.elements.engagementsClubSummaryStatus.hidden = true;
        }
        if (portalContext.elements.engagementsClubSummaryList) portalContext.elements.engagementsClubSummaryList.innerHTML = "";
        resetEngagementClubNewSwimmerForm();
        if (portalContext.elements.engagementsClubNewSwimmerAlerts) portalContext.elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
        if (portalContext.elements.engagementsDocumentsSummary) portalContext.elements.engagementsDocumentsSummary.textContent = "Documents à préparer.";
        if (portalContext.elements.engagementsComputerEmailLabel) portalContext.elements.engagementsComputerEmailLabel.textContent = "Email du responsable informatique non renseigne";
        if (portalContext.elements.engagementsDocumentsList) portalContext.elements.engagementsDocumentsList.innerHTML = "";
        if (portalContext.elements.engagementsClubRecapFiles) portalContext.elements.engagementsClubRecapFiles.innerHTML = "";
        if (portalContext.elements.engagementsMailJobsList) portalContext.elements.engagementsMailJobsList.innerHTML = "";
        if (portalContext.elements.engagementsStatisticsSummary) portalContext.elements.engagementsStatisticsSummary.innerHTML = "";
        if (portalContext.elements.engagementsStatisticsAlerts) portalContext.elements.engagementsStatisticsAlerts.innerHTML = "";
        if (portalContext.elements.engagementsStatisticsEventRows) portalContext.elements.engagementsStatisticsEventRows.innerHTML = "";
        if (portalContext.elements.engagementsStatisticsClubRows) portalContext.elements.engagementsStatisticsClubRows.innerHTML = "";
        if (portalContext.elements.engagementsStatisticsEventSelect) portalContext.elements.engagementsStatisticsEventSelect.innerHTML = "";
        if (portalContext.elements.engagementsStatisticsUpdatedAt) portalContext.elements.engagementsStatisticsUpdatedAt.textContent = "Les statistiques sont calculées à la demande.";
        if (portalContext.elements.engagementsGeneratedFiles) portalContext.elements.engagementsGeneratedFiles.innerHTML = "";
        if (portalContext.elements.engagementsSharedDocumentsList) portalContext.elements.engagementsSharedDocumentsList.innerHTML = "";
        portalActions.closeEngagementCompetitionDocumentForm();
        if (portalContext.elements.engagementsDetailStatus) portalContext.elements.engagementsDetailStatus.textContent = "";
        portalActions.renderEngagementCompetitions();
        return true;
      }

    /* deferred-function: assets/portal/deferred/competition-actions.js#loadEngagementCompetitionDetail */
    async function loadEngagementCompetitionDetail(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "loadEngagementCompetitionDetail", args, moduleActions);
    }

    function engagementClubReadRetryBlocked() {
        return portalContext.elements.engagementsSaveState?.dataset.state === "saving"
          || portalState.engagementClubTeamSaving || portalState.engagementClubEntriesDirty || portalState.dirtyEngagementDetailTabs.size
          || portalState.engagementClubRelaysDraft.some(relay => relay.draftPending)
          || portalConfig.engagementClubSelectionChanges.size || portalConfig.engagementClubEntriesAutosaveSwimmers.size
          || portalState.engagementClubNativeSelectionRetry || portalState.engagementClubNativeIndividualRetry
          || portalState.engagementClubNativeOfficialRetry || portalState.engagementClubNativeRelayRetry;
      }

    /* deferred-function: assets/portal/deferred/competition-actions.js#retryEngagementCompetitionRead */
    async function retryEngagementCompetitionRead(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "retryEngagementCompetitionRead", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#saveEngagementClubTeamLeader */
    async function saveEngagementClubTeamLeader(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "saveEngagementClubTeamLeader", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#removeEngagementClubTeamLeader */
    async function removeEngagementClubTeamLeader(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "removeEngagementClubTeamLeader", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#saveEngagementClubOfficials */
    async function saveEngagementClubOfficials(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "saveEngagementClubOfficials", args, moduleActions);
    }

    function renderActiveEngagementClubSwimmerConsumer() {
        if (portalState.activeEngagementsTab === "clubSwimmers") {
          portalActions.renderEngagementClubSwimmersDirectory();
          return;
        }
        if (portalState.activeEngagementsTab === "clubPeople") {
          portalActions.renderEngagementClubPersonSwimmerOptions();
          return;
        }
        if (!portalState.selectedEngagementCompetitionId) return;
        if (portalState.activeEngagementsDetailTab === "team") {
          portalActions.renderEngagementClubTeamPersonOptions(portalContext.elements.engagementsClubTeamPersonSelect?.value || "");
          return;
        }
        if (portalState.activeEngagementsDetailTab === "officials") portalActions.renderEngagementClubOfficials();
        if (portalState.activeEngagementsDetailTab === "swimmers") portalActions.renderEngagementClubSwimmers();
        if (portalState.activeEngagementsDetailTab === "entries") portalActions.renderEngagementClubEntries();
        if (portalState.activeEngagementsDetailTab === "relays") portalActions.renderEngagementClubRelays();
      }

    /* deferred-function: assets/portal/deferred/competition-actions.js#loadEngagementClubSwimmers */
    async function loadEngagementClubSwimmers(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "loadEngagementClubSwimmers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#saveEngagementClubSwimmers */
    async function saveEngagementClubSwimmers(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "saveEngagementClubSwimmers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#saveEngagementClubRelays */
    async function saveEngagementClubRelays(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "saveEngagementClubRelays", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#downloadEngagementClubSummaryPdf */
    async function downloadEngagementClubSummaryPdf(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "downloadEngagementClubSummaryPdf", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#downloadEngagementAdminClubRecapPdf */
    async function downloadEngagementAdminClubRecapPdf(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "downloadEngagementAdminClubRecapPdf", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#generateEngagementAdminClubRecapPdfs */
    async function generateEngagementAdminClubRecapPdfs(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "generateEngagementAdminClubRecapPdfs", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#generateEngagementAdminTxtExport */
    async function generateEngagementAdminTxtExport(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "generateEngagementAdminTxtExport", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#prepareEngagementOpeningEmails */
    async function prepareEngagementOpeningEmails(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "prepareEngagementOpeningEmails", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#prepareEngagementClubRecapEmails */
    async function prepareEngagementClubRecapEmails(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "prepareEngagementClubRecapEmails", args, moduleActions);
    }

    function engagementMailSendButton(type) {
        return type === "club_recap_pdf"
          ? portalContext.elements.engagementsSendClubRecapEmailsButton
          : portalContext.elements.engagementsSendOpeningEmailsButton;
      }

    function engagementMailSendActionLabel(type) {
        if (type === "entries_txt") return "TXT informatique";
        return type === "club_recap_pdf" ? "PDF clubs" : "d'ouverture";
      }

    /* deferred-function: assets/portal/deferred/competition-actions.js#sendEngagementPreparedEmails */
    async function sendEngagementPreparedEmails(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "sendEngagementPreparedEmails", args, moduleActions);
    }

    function selectedEngagementClubNewSwimmerFromForm() {
        return {
          firstName: String(portalContext.elements.engagementsClubNewSwimmerFirstName?.value || "").trim(),
          lastName: String(portalContext.elements.engagementsClubNewSwimmerLastName?.value || "").trim().toLocaleUpperCase("fr-FR"),
          birthDate: String(portalContext.elements.engagementsClubNewSwimmerBirthDate?.value || "").trim(),
          sex: String(portalContext.elements.engagementsClubNewSwimmerSex?.value || "").trim(),
          licenseNumber: formatEngagementSwimmerLicense(portalContext.elements.engagementsClubNewSwimmerLicense?.value || "")
        };
      }

    function formatEngagementSwimmerLicense(value = "") {
        const source = String(value || "").toUpperCase();
        const letterIndex = source.search(/[A-Z]/);
        if (letterIndex < 0) return "";
        const letter = source[letterIndex];
        const digits = source.slice(letterIndex + 1).replace(/\D/g, "").slice(0, 57);
        const federation = digits.slice(0, 2);
        const number = digits.slice(2);
        return `${letter}-${federation}${federation.length === 2 ? `-${number}` : ""}`;
      }

    function resetEngagementClubNewSwimmerForm() {
        portalState.engagementClubSwimmerCreationRetry = null;
        [
          portalContext.elements.engagementsClubNewSwimmerFirstName,
          portalContext.elements.engagementsClubNewSwimmerLastName,
          portalContext.elements.engagementsClubNewSwimmerBirthDate,
          portalContext.elements.engagementsClubNewSwimmerSex,
          portalContext.elements.engagementsClubNewSwimmerLicense
        ].forEach((field) => {
          if (field) field.value = "";
        });
        portalState.engagementClubSwimmerRecovery = null;
        if (portalContext.elements.engagementsClubRecoverSwimmerButton) portalContext.elements.engagementsClubRecoverSwimmerButton.hidden = true;
      }

    function setEngagementClubNewSwimmerMessage(message = "", tone = "") {
        if (!portalContext.elements.engagementsClubNewSwimmerMessage) return;
        portalContext.elements.engagementsClubNewSwimmerMessage.textContent = message;
        if (tone) portalContext.elements.engagementsClubNewSwimmerMessage.dataset.tone = tone;
        else delete portalContext.elements.engagementsClubNewSwimmerMessage.dataset.tone;
      }

    function engagementClubNewSwimmerFormHasValues() {
        return Object.values(selectedEngagementClubNewSwimmerFromForm()).some(Boolean);
      }

    function engagementClubNewSwimmerLockReason() {
        const dialog = portalContext.elements.engagementsClubNewSwimmerDialog;
        if (dialog?.dataset?.origin === "directory") {
          if (!portalActions.canUse("engagements.club.manage") || !portalActions.engagementClubScope()) return "Sélectionnez un club autorisé avant d’ajouter un nageur.";
          if (String(portalActions.engagementClubScope()) !== dialog.dataset.clubId) return "Le club actif a changé. Rouvrez le formulaire depuis Mes nageurs.";
          if (portalState.activeEngagementsTab !== "clubSwimmers" || portalActions.requestedNavigationView() !== "engagements") return "Ouvrez Mes nageurs pour poursuivre cet ajout.";
          return "";
        }
        return portalActions.engagementClubSwimmerSelectionLockReason()
          || (!portalActions.engagementClubTeamComplete() ? "Renseignez le chef d'équipe ou confirmez la renonciation pour activer cette étape." : "");
      }

    function updateEngagementClubNewSwimmerControls() {
        const reason = engagementClubNewSwimmerLockReason();
        const busy = portalContext.elements.engagementsClubNewSwimmerDialog?.dataset?.busy === "true";
        [portalContext.elements.engagementsClubNewSwimmerDialogOpen, portalContext.elements.engagementsClubNewSwimmerSaveButton,
          portalContext.elements.engagementsClubRecoverSwimmerButton].forEach((button) => {
          if (!button) return;
          button.disabled = Boolean(reason) || busy;
          button.title = reason;
        });
        const directoryButton = document.getElementById("adminEngagementsClubSwimmersDirectoryAddButton");
        if (directoryButton) directoryButton.disabled = busy || !portalActions.canUse("engagements.club.manage") || !portalActions.engagementClubScope();
        [portalContext.elements.engagementsClubNewSwimmerFirstName, portalContext.elements.engagementsClubNewSwimmerLastName,
          portalContext.elements.engagementsClubNewSwimmerBirthDate, portalContext.elements.engagementsClubNewSwimmerSex,
          portalContext.elements.engagementsClubNewSwimmerLicense, portalContext.elements.engagementsClubNewSwimmerResetButton]
          .forEach((field) => { if (field) field.disabled = busy; });
      }

    function openEngagementClubNewSwimmerDialog({ origin = "competition", currentTarget } = {}) {
        const dialog = portalContext.elements.engagementsClubNewSwimmerDialog;
        if (!dialog || dialog.open) return;
        dialog.dataset.origin = origin === "directory" ? "directory" : "competition";
        dialog.dataset.clubId = String(portalActions.engagementClubScope() || "");
        if (engagementClubNewSwimmerLockReason()) { delete dialog.dataset.origin; return; }
        dialog.dataset.requestVersion = String((Number(dialog.dataset.requestVersion) || 0) + 1);
        dialog.dataset.openerId = currentTarget?.id || "adminEngagementsClubNewSwimmerDialogOpen";
        delete dialog.dataset.busy;
        resetEngagementClubNewSwimmerForm();
        setEngagementClubNewSwimmerMessage();
        updateEngagementClubNewSwimmerControls();
        dialog.showModal();
        global.requestAnimationFrame?.(() => portalContext.elements.engagementsClubNewSwimmerLastName?.focus?.());
      }

    function closeEngagementClubNewSwimmerDialog({ force = false, restoreFocus = true } = {}) {
        const dialog = portalContext.elements.engagementsClubNewSwimmerDialog;
        if (!dialog?.open) return true;
        if (!force && dialog.dataset.busy === "true") return false;
        if (!force && engagementClubNewSwimmerFormHasValues() && !global.confirm("Abandonner les informations saisies pour ce nageur ?")) return false;
        resetEngagementClubNewSwimmerForm();
        if (portalContext.elements.engagementsClubNewSwimmerAlerts) portalContext.elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
        setEngagementClubNewSwimmerMessage();
        const openerId = dialog.dataset.openerId;
        dialog.dataset.requestVersion = String((Number(dialog.dataset.requestVersion) || 0) + 1);
        delete dialog.dataset.busy;
        delete dialog.dataset.origin;
        dialog.close();
        updateEngagementClubNewSwimmerControls();
        if (restoreFocus) (document.getElementById(openerId) || portalContext.elements.engagementsClubNewSwimmerDialogOpen)?.focus?.();
        return true;
      }

    function resetEngagementClubNewSwimmerFormFromButton() {
        if (portalContext.elements.engagementsClubNewSwimmerDialog?.dataset?.busy === "true") return;
        resetEngagementClubNewSwimmerForm();
        if (portalContext.elements.engagementsClubNewSwimmerAlerts) portalContext.elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
        setEngagementClubNewSwimmerMessage();
        if (portalContext.elements.engagementsClubSwimmersMessage) {
          portalContext.elements.engagementsClubSwimmersMessage.textContent = "";
          delete portalContext.elements.engagementsClubSwimmersMessage.dataset.tone;
        }
        portalContext.elements.engagementsClubNewSwimmerLastName?.focus();
      }

    function renderEngagementClubNewSwimmerAlerts(alerts = [], { confirmed = false } = {}) {
        const mount = portalContext.elements.engagementsClubNewSwimmerAlerts;
        if (!mount) return;
        if (!alerts.length) {
          mount.innerHTML = '<p class="admin-portal-message" data-tone="ok">Aucune ressemblance forte détectée.</p>';
          return;
        }
        const blocksCreation = alerts.some((alert) => alert.type === "inverted-identity");
        mount.innerHTML = `
      <p class="admin-portal-message" data-tone="error">${blocksCreation
            ? "Création impossible : une fiche avec la même date de naissance utilise déjà ce nom et ce prénom dans l'ordre inverse."
            : confirmed
            ? `Alerte : ${alerts.length} rapprochement${alerts.length > 1 ? "s" : ""} trouvé${alerts.length > 1 ? "s" : ""}. Le nageur est créé, l'alerte est tracée comme validée par le club.`
            : `Alerte : ${alerts.length} rapprochement${alerts.length > 1 ? "s" : ""} trouvé${alerts.length > 1 ? "s" : ""}. Confirmez la création uniquement si ce nageur est bien nouveau pour votre club.`}</p>
      <div class="admin-engagements-club-swimmer-alert-list">
        ${alerts.map((alert) => `
          <article>
            <strong>${portalActions.escapeHtml(alert.message || "Rapprochement possible")}</strong>
            <small>${portalActions.escapeHtml([
                  alert.name,
                  alert.birthDate ? portalActions.formatShortDate(alert.birthDate) : "",
                  alert.clubId || alert.clubName ? portalActions.clubDisplayLabel(alert) : "",
                  alert.latestDate ? `dernier résultat ${portalActions.formatShortDate(alert.latestDate)}` : ""
                ].filter(Boolean).join(" - "))}</small>
          </article>
        `).join("")}
      </div>
    `;
      }

    function renderEngagementClubSwimmerRecovery(recovery = {}) {
        const swimmer = recovery.swimmer || {};
        const name = portalActions.engagementSwimmerDisplayName(swimmer, "Ce nageur");
        const club = portalActions.clubDisplayLabel(swimmer, { fallback: "un autre club" });
        if (portalContext.elements.engagementsClubNewSwimmerAlerts) {
          const message = recovery.sameClub
            ? `${name} est déjà connu dans votre club. Recherchez-le dans la liste ci-dessus.`
            : recovery.eligible
            ? `${name} est rattaché à ${club}. Il peut être récupéré pour sa première compétition de la saison.`
            : `${name} a déjà un résultat publié cette saison pour ${club}. Son changement de club nécessite une dérogation nationale.`;
          portalContext.elements.engagementsClubNewSwimmerAlerts.innerHTML = `<p class="admin-portal-message" data-tone="${recovery.eligible ? "warning" : recovery.sameClub ? "ok" : "error"}">${portalActions.escapeHtml(message)}</p>`;
        }
        if (portalContext.elements.engagementsClubRecoverSwimmerButton) {
          portalContext.elements.engagementsClubRecoverSwimmerButton.hidden = !recovery.eligible;
          portalContext.elements.engagementsClubRecoverSwimmerButton.disabled = !recovery.eligible;
        }
      }

    function engagementClubNewSwimmerConfirmationMessage(alerts = []) {
        const preview = alerts.slice(0, 3).map((alert) => [
          alert.name || "Nageur rapproché",
          alert.birthDate ? portalActions.formatShortDate(alert.birthDate) : "",
          alert.clubId || alert.clubName ? portalActions.clubDisplayLabel(alert) : ""
        ].filter(Boolean).join(" - ")).join("\n");
        return [
          `${alerts.length} rapprochement${alerts.length > 1 ? "s" : ""} trouvé${alerts.length > 1 ? "s" : ""}.`,
          preview,
          alerts.length > 3 ? `+ ${alerts.length - 3} autre${alerts.length - 3 > 1 ? "s" : ""} rapprochement${alerts.length - 3 > 1 ? "s" : ""}.` : "",
          "Confirmer la création de ce nageur ? Cette validation sera tracée."
        ].filter(Boolean).join("\n\n");
      }

    /* deferred-function: assets/portal/deferred/competition-actions.js#createEngagementClubSwimmer */
    async function createEngagementClubSwimmer(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "createEngagementClubSwimmer", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#recoverEngagementClubSwimmer */
    async function recoverEngagementClubSwimmer(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "recoverEngagementClubSwimmer", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#deleteOrRequestEngagementCompetitionDeletion */
    async function deleteOrRequestEngagementCompetitionDeletion(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "deleteOrRequestEngagementCompetitionDeletion", args, moduleActions);
    }

    function updateEngagementAccessRequestBadge(count = portalState.engagementAccessRequests.length) {
        if (portalState.portalPendingOverviewLoaded) return;
        portalActions.renderPendingBadgeCollection(
          portalContext.elements.accessPendingBadges,
          portalActions.canReviewEngagementAccessRequests() ? count : 0,
          "demande d'accès en attente",
          "demandes d'accès en attente"
        );
      }

    const moduleActions = { renderEngagementCompetitionDetail, closeEngagementCompetitionDetail, loadEngagementCompetitionDetail, engagementClubReadRetryBlocked, retryEngagementCompetitionRead, saveEngagementClubTeamLeader, removeEngagementClubTeamLeader, saveEngagementClubOfficials, renderActiveEngagementClubSwimmerConsumer, loadEngagementClubSwimmers, saveEngagementClubSwimmers, saveEngagementClubRelays, downloadEngagementClubSummaryPdf, downloadEngagementAdminClubRecapPdf, generateEngagementAdminClubRecapPdfs, generateEngagementAdminTxtExport, prepareEngagementOpeningEmails, prepareEngagementClubRecapEmails, engagementMailSendButton, engagementMailSendActionLabel, sendEngagementPreparedEmails, selectedEngagementClubNewSwimmerFromForm, formatEngagementSwimmerLicense, resetEngagementClubNewSwimmerForm, setEngagementClubNewSwimmerMessage, engagementClubNewSwimmerFormHasValues, engagementClubNewSwimmerLockReason, updateEngagementClubNewSwimmerControls, openEngagementClubNewSwimmerDialog, closeEngagementClubNewSwimmerDialog, resetEngagementClubNewSwimmerFormFromButton, renderEngagementClubNewSwimmerAlerts, renderEngagementClubSwimmerRecovery, engagementClubNewSwimmerConfirmationMessage, createEngagementClubSwimmer, recoverEngagementClubSwimmer, deleteOrRequestEngagementCompetitionDeletion, updateEngagementAccessRequestBadge };
    return {
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
    };
  }
  global.LivePalmesPortalCompetitionActions = { create };
})(window);
