(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    /* deferred-function: assets/portal/deferred/activity-journal.js#auditActionLabel */
    function auditActionLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditActionLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditActionCategory */
    function auditActionCategory(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditActionCategory", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditActorOrigin */
    function auditActorOrigin(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditActorOrigin", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditActorLabel */
    function auditActorLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditActorLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditActorOptionLabel */
    function auditActorOptionLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditActorOptionLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#renderEngagementNationalAuditActorSuggestions */
    function renderEngagementNationalAuditActorSuggestions(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "renderEngagementNationalAuditActorSuggestions", args, moduleActions);
    }

    function setEngagementNationalAuditActorSelection(choice = null) {
        const uid = String(choice?.uid || "");
        if (portalContext.elements.engagementsNationalAuditActor) portalContext.elements.engagementsNationalAuditActor.value = uid;
        if (portalContext.elements.engagementsNationalAuditActorSearch) {
          portalContext.elements.engagementsNationalAuditActorSearch.dataset.selected = uid ? "true" : "false";
          portalContext.elements.engagementsNationalAuditActorSearch.title = uid ? "Utilisateur sélectionné" : "";
        }
        if (portalContext.elements.engagementsNationalAuditActorSelected) portalContext.elements.engagementsNationalAuditActorSelected.hidden = !uid;
      }

    /* deferred-function: assets/portal/deferred/activity-journal.js#searchEngagementNationalAuditActors */
    async function searchEngagementNationalAuditActors(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "activity-journal", "searchEngagementNationalAuditActors", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#handleEngagementNationalAuditActorSearch */
    function handleEngagementNationalAuditActorSearch(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "handleEngagementNationalAuditActorSearch", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditClubId */
    function auditClubId(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditClubId", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditClubLabel */
    function auditClubLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditClubLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditCompetitionLabel */
    function auditCompetitionLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditCompetitionLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditTargetSummary */
    function auditTargetSummary(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditTargetSummary", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditDateLabel */
    function auditDateLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditDateLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditDetailValue */
    function auditDetailValue(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditDetailValue", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditEnabledLabels */
    function auditEnabledLabels(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditEnabledLabels", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditPersonLabel */
    function auditPersonLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditPersonLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditReadableValue */
    function auditReadableValue(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditReadableValue", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditDetailLabel */
    function auditDetailLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditDetailLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditComplementaryLabel */
    function auditComplementaryLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditComplementaryLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditValuesEqual */
    function auditValuesEqual(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditValuesEqual", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditChangeRows */
    function auditChangeRows(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditChangeRows", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditDetailIsTechnicalKey */
    function auditDetailIsTechnicalKey(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditDetailIsTechnicalKey", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditTechnicalKeyIsReadable */
    function auditTechnicalKeyIsReadable(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditTechnicalKeyIsReadable", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditDetailRows */
    function auditDetailRows(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditDetailRows", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditTechnicalDetailsHtml */
    function auditTechnicalDetailsHtml(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditTechnicalDetailsHtml", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#filteredEngagementNationalAuditLogs */
    function filteredEngagementNationalAuditLogs(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "filteredEngagementNationalAuditLogs", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#auditEntryHtml */
    function auditEntryHtml(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "auditEntryHtml", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#updateEngagementNationalAuditFilterOptions */
    function updateEngagementNationalAuditFilterOptions(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "updateEngagementNationalAuditFilterOptions", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#resetEngagementNationalAuditFilters */
    function resetEngagementNationalAuditFilters(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "resetEngagementNationalAuditFilters", args, moduleActions);
    }

    function resetEngagementNationalAuditData() {
        portalState.engagementNationalAuditLogs = [];
        portalState.engagementNationalAuditLogsLoaded = false;
        portalState.engagementNationalAuditLogsLoading = false;
        portalState.engagementNationalAuditNextCursor = null;
        portalState.engagementNationalAuditHasMore = false;
        portalState.engagementNationalAuditVisibleFrom = "";
        portalState.engagementNationalAuditAppliedActorUid = "";
        portalState.engagementNationalAuditActorSearchSequence += 1;
        global.clearTimeout(portalState.engagementNationalAuditActorSearchTimer);
        portalState.engagementNationalAuditActorSuggestions = [];
        setEngagementNationalAuditActorSelection();
        portalConfig.engagementNationalAuditActors.clear();
        portalConfig.engagementNationalAuditClubs.clear();
        portalConfig.engagementNationalAuditCompetitions.clear();
        portalConfig.engagementNationalAuditPeople.clear();
      }

    /* deferred-function: assets/portal/deferred/activity-journal.js#renderEngagementNationalAuditLogs */
    function renderEngagementNationalAuditLogs(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "renderEngagementNationalAuditLogs", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#loadEngagementNationalAuditLogs */
    async function loadEngagementNationalAuditLogs(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "activity-journal", "loadEngagementNationalAuditLogs", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#engagementClubPersonRoleLabel */
    function engagementClubPersonRoleLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "engagementClubPersonRoleLabel", args, moduleActions);
    }

    function closeEngagementClubPersonDialog() {
        const form=portalContext.elements.engagementsClubPersonForm;
        if(!portalState.engagementClubPersonFormHome || !form) return;
        portalContext.elements.engagementsClubPersonDialog?.close();
        portalState.engagementClubPersonFormHome.parent.insertBefore(form,portalState.engagementClubPersonFormHome.next);
        portalState.engagementClubPersonFormHome.opener?.focus?.();
        portalState.engagementClubPersonFormHome=null;
        form.hidden=true;
      }

    /* deferred-function: assets/portal/deferred/activity-journal.js#openNativeCompetitionPersonCreation */
    function openNativeCompetitionPersonCreation(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "openNativeCompetitionPersonCreation", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/activity-journal.js#resetEngagementClubPersonForm */
    function resetEngagementClubPersonForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "activity-journal", "resetEngagementClubPersonForm", args, moduleActions);
    }

    const moduleActions = { auditActionLabel, auditActionCategory, auditActorOrigin, auditActorLabel, auditActorOptionLabel, renderEngagementNationalAuditActorSuggestions, setEngagementNationalAuditActorSelection, searchEngagementNationalAuditActors, handleEngagementNationalAuditActorSearch, auditClubId, auditClubLabel, auditCompetitionLabel, auditTargetSummary, auditDateLabel, auditDetailValue, auditEnabledLabels, auditPersonLabel, auditReadableValue, auditDetailLabel, auditComplementaryLabel, auditValuesEqual, auditChangeRows, auditDetailIsTechnicalKey, auditTechnicalKeyIsReadable, auditDetailRows, auditTechnicalDetailsHtml, filteredEngagementNationalAuditLogs, auditEntryHtml, updateEngagementNationalAuditFilterOptions, resetEngagementNationalAuditFilters, resetEngagementNationalAuditData, renderEngagementNationalAuditLogs, loadEngagementNationalAuditLogs, engagementClubPersonRoleLabel, closeEngagementClubPersonDialog, openNativeCompetitionPersonCreation, resetEngagementClubPersonForm };
    return {
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
    };
  }
  global.LivePalmesPortalActivityJournal = { create };
})(window);
