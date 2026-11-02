(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    /* deferred-function: assets/portal/deferred/national-requests.js#renderEngagementAccessRequests */
    function renderEngagementAccessRequests(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "renderEngagementAccessRequests", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#loadEngagementAccessRequests */
    async function loadEngagementAccessRequests(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-requests", "loadEngagementAccessRequests", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#setEngagementAccessRequestEditMessage */
    function setEngagementAccessRequestEditMessage(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "setEngagementAccessRequestEditMessage", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#closeEngagementAccessRequestEditForm */
    function closeEngagementAccessRequestEditForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "closeEngagementAccessRequestEditForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#openEngagementAccessRequestEditForm */
    function openEngagementAccessRequestEditForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "openEngagementAccessRequestEditForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#correctedEngagementAccessRequestFromEditForm */
    function correctedEngagementAccessRequestFromEditForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "correctedEngagementAccessRequestFromEditForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#resolveEngagementAccessRequest */
    async function resolveEngagementAccessRequest(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-requests", "resolveEngagementAccessRequest", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#submitEngagementAccessRequestEdit */
    async function submitEngagementAccessRequestEdit(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-requests", "submitEngagementAccessRequestEdit", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#publicAccessRequestPayloadFromForm */
    function publicAccessRequestPayloadFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "publicAccessRequestPayloadFromForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#submitPublicEngagementAccessRequest */
    async function submitPublicEngagementAccessRequest(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-requests", "submitPublicEngagementAccessRequest", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#updateEngagementNationalRequestsPresentation */
    function updateEngagementNationalRequestsPresentation(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "updateEngagementNationalRequestsPresentation", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#renderEngagementDeletionRequests */
    function renderEngagementDeletionRequests(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "renderEngagementDeletionRequests", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#loadEngagementDeletionRequests */
    async function loadEngagementDeletionRequests(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-requests", "loadEngagementDeletionRequests", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#updateEngagementDeletionRequestBadge */
    function updateEngagementDeletionRequestBadge(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "updateEngagementDeletionRequestBadge", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#resolveEngagementDeletionRequest */
    async function resolveEngagementDeletionRequest(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-requests", "resolveEngagementDeletionRequest", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#renderEngagementNationalSwimmers */
    function renderEngagementNationalSwimmers(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "renderEngagementNationalSwimmers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#updateEngagementNationalSwimmersStatus */
    function updateEngagementNationalSwimmersStatus(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "updateEngagementNationalSwimmersStatus", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#engagementSwimmerChangeSummary */
    function engagementSwimmerChangeSummary(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "engagementSwimmerChangeSummary", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#updateEngagementSwimmerChangeRequestsBadge */
    function updateEngagementSwimmerChangeRequestsBadge(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "updateEngagementSwimmerChangeRequestsBadge", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#renderEngagementSwimmerChangeRequests */
    function renderEngagementSwimmerChangeRequests(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "renderEngagementSwimmerChangeRequests", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#loadEngagementSwimmerChangeRequests */
    async function loadEngagementSwimmerChangeRequests(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-requests", "loadEngagementSwimmerChangeRequests", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#openEngagementSwimmerChangeRequestReview */
    function openEngagementSwimmerChangeRequestReview(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "openEngagementSwimmerChangeRequestReview", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#resolveEngagementSwimmerChangeRequest */
    async function resolveEngagementSwimmerChangeRequest(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-requests", "resolveEngagementSwimmerChangeRequest", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#openEngagementAccessRequestRejectDialog */
    function openEngagementAccessRequestRejectDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "openEngagementAccessRequestRejectDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#closeEngagementAccessRequestRejectDialog */
    function closeEngagementAccessRequestRejectDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "closeEngagementAccessRequestRejectDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#submitEngagementAccessRequestRejection */
    async function submitEngagementAccessRequestRejection(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-requests", "submitEngagementAccessRequestRejection", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#closeEngagementSwimmerCorrectionDialog */
    function closeEngagementSwimmerCorrectionDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "closeEngagementSwimmerCorrectionDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#resetEngagementSwimmerCorrectionDialog */
    function resetEngagementSwimmerCorrectionDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "resetEngagementSwimmerCorrectionDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#openEngagementSwimmerCorrectionDialog */
    function openEngagementSwimmerCorrectionDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "openEngagementSwimmerCorrectionDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#updateClubIdentityCorrectionAction */
    function updateClubIdentityCorrectionAction(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "updateClubIdentityCorrectionAction", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#submitEngagementSwimmerCorrection */
    async function submitEngagementSwimmerCorrection(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-requests", "submitEngagementSwimmerCorrection", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#normalizeEngagementNationalClub */
    function normalizeEngagementNationalClub(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "normalizeEngagementNationalClub", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#readEngagementNationalClubCache */
    function readEngagementNationalClubCache(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "readEngagementNationalClubCache", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#writeEngagementNationalClubCache */
    function writeEngagementNationalClubCache(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "writeEngagementNationalClubCache", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#engagementNationalClubSyncStart */
    function engagementNationalClubSyncStart(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "engagementNationalClubSyncStart", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#mergeEngagementNationalClubDirectory */
    function mergeEngagementNationalClubDirectory(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "mergeEngagementNationalClubDirectory", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#filteredEngagementNationalClubs */
    function filteredEngagementNationalClubs(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "filteredEngagementNationalClubs", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#setEngagementNationalClubAdministrators */
    function setEngagementNationalClubAdministrators(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "setEngagementNationalClubAdministrators", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#engagementNationalClubAdministratorsHtml */
    function engagementNationalClubAdministratorsHtml(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "engagementNationalClubAdministratorsHtml", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-requests.js#renderEngagementNationalClubs */
    function renderEngagementNationalClubs(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-requests", "renderEngagementNationalClubs", args, moduleActions);
    }

    const moduleActions = { renderEngagementAccessRequests, loadEngagementAccessRequests, setEngagementAccessRequestEditMessage, closeEngagementAccessRequestEditForm, openEngagementAccessRequestEditForm, correctedEngagementAccessRequestFromEditForm, resolveEngagementAccessRequest, submitEngagementAccessRequestEdit, publicAccessRequestPayloadFromForm, submitPublicEngagementAccessRequest, updateEngagementNationalRequestsPresentation, renderEngagementDeletionRequests, loadEngagementDeletionRequests, updateEngagementDeletionRequestBadge, resolveEngagementDeletionRequest, renderEngagementNationalSwimmers, updateEngagementNationalSwimmersStatus, engagementSwimmerChangeSummary, updateEngagementSwimmerChangeRequestsBadge, renderEngagementSwimmerChangeRequests, loadEngagementSwimmerChangeRequests, openEngagementSwimmerChangeRequestReview, resolveEngagementSwimmerChangeRequest, openEngagementAccessRequestRejectDialog, closeEngagementAccessRequestRejectDialog, submitEngagementAccessRequestRejection, closeEngagementSwimmerCorrectionDialog, resetEngagementSwimmerCorrectionDialog, openEngagementSwimmerCorrectionDialog, updateClubIdentityCorrectionAction, submitEngagementSwimmerCorrection, normalizeEngagementNationalClub, readEngagementNationalClubCache, writeEngagementNationalClubCache, engagementNationalClubSyncStart, mergeEngagementNationalClubDirectory, filteredEngagementNationalClubs, setEngagementNationalClubAdministrators, engagementNationalClubAdministratorsHtml, renderEngagementNationalClubs };
    return {
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
    };
  }
  global.LivePalmesPortalNationalRequests = { create };
})(window);
