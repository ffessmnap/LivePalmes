(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    /* deferred-function: assets/portal/deferred/competition-actions.js#renderEngagementCompetitionDetail */
    function renderEngagementCompetitionDetail(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "renderEngagementCompetitionDetail", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-actions.js#engagementClubReadRetryBlocked */
    function engagementClubReadRetryBlocked(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "engagementClubReadRetryBlocked", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-actions.js#renderActiveEngagementClubSwimmerConsumer */
    function renderActiveEngagementClubSwimmerConsumer(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "renderActiveEngagementClubSwimmerConsumer", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-actions.js#engagementMailSendButton */
    function engagementMailSendButton(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "engagementMailSendButton", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#engagementMailSendActionLabel */
    function engagementMailSendActionLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "engagementMailSendActionLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#sendEngagementPreparedEmails */
    async function sendEngagementPreparedEmails(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-actions", "sendEngagementPreparedEmails", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#selectedEngagementClubNewSwimmerFromForm */
    function selectedEngagementClubNewSwimmerFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "selectedEngagementClubNewSwimmerFromForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#formatEngagementSwimmerLicense */
    function formatEngagementSwimmerLicense(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "formatEngagementSwimmerLicense", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-actions.js#setEngagementClubNewSwimmerMessage */
    function setEngagementClubNewSwimmerMessage(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "setEngagementClubNewSwimmerMessage", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#engagementClubNewSwimmerFormHasValues */
    function engagementClubNewSwimmerFormHasValues(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "engagementClubNewSwimmerFormHasValues", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-actions.js#openEngagementClubNewSwimmerDialog */
    function openEngagementClubNewSwimmerDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "openEngagementClubNewSwimmerDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#closeEngagementClubNewSwimmerDialog */
    function closeEngagementClubNewSwimmerDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "closeEngagementClubNewSwimmerDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#resetEngagementClubNewSwimmerFormFromButton */
    function resetEngagementClubNewSwimmerFormFromButton(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "resetEngagementClubNewSwimmerFormFromButton", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#renderEngagementClubNewSwimmerAlerts */
    function renderEngagementClubNewSwimmerAlerts(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "renderEngagementClubNewSwimmerAlerts", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#renderEngagementClubSwimmerRecovery */
    function renderEngagementClubSwimmerRecovery(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "renderEngagementClubSwimmerRecovery", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-actions.js#engagementClubNewSwimmerConfirmationMessage */
    function engagementClubNewSwimmerConfirmationMessage(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "engagementClubNewSwimmerConfirmationMessage", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-actions.js#updateEngagementAccessRequestBadge */
    function updateEngagementAccessRequestBadge(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-actions", "updateEngagementAccessRequestBadge", args, moduleActions);
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
