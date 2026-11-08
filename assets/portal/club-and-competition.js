(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    /* deferred-function: assets/portal/deferred/club-and-competition.js#validateEngagementCompetitionContacts */
    function validateEngagementCompetitionContacts(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "validateEngagementCompetitionContacts", args, moduleActions);
    }
    /* deferred-function: assets/portal/deferred/club-and-competition.js#openEngagementClubPersonForm */
    function openEngagementClubPersonForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "openEngagementClubPersonForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#selectedEngagementClubPersonFromForm */
    function selectedEngagementClubPersonFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "selectedEngagementClubPersonFromForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#renderEngagementClubPeople */
    function renderEngagementClubPeople(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "renderEngagementClubPeople", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#loadEngagementClubPeople */
    async function loadEngagementClubPeople(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "loadEngagementClubPeople", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#saveEngagementClubPerson */
    async function saveEngagementClubPerson(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "saveEngagementClubPerson", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#setEngagementClubPersonStatus */
    async function setEngagementClubPersonStatus(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "setEngagementClubPersonStatus", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#loadEngagementCompetitions */
    async function loadEngagementCompetitions(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "loadEngagementCompetitions", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#engagementCompetitionPayloadFromFields */
    function engagementCompetitionPayloadFromFields(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "engagementCompetitionPayloadFromFields", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#createCompetitionFields */
    function createCompetitionFields(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "createCompetitionFields", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#editCompetitionFields */
    function editCompetitionFields(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "editCompetitionFields", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#engagementCompetitionPayloadFromForm */
    function engagementCompetitionPayloadFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "engagementCompetitionPayloadFromForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#engagementCompetitionPayloadFromEditForm */
    function engagementCompetitionPayloadFromEditForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "engagementCompetitionPayloadFromEditForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#nativeCompetitionFormValues */
    function nativeCompetitionFormValues(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "nativeCompetitionFormValues", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#nativeCompetitionPatchFromForm */
    function nativeCompetitionPatchFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "nativeCompetitionPatchFromForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#saveNativeCompetitionDetail */
    async function saveNativeCompetitionDetail(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "saveNativeCompetitionDetail", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#engagementOpeningDeadlineError */
    function engagementOpeningDeadlineError(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "engagementOpeningDeadlineError", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#shouldSendEngagementOpeningMail */
    function shouldSendEngagementOpeningMail(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "shouldSendEngagementOpeningMail", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#engagementOpeningMailScopeLabel */
    function engagementOpeningMailScopeLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "engagementOpeningMailScopeLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#confirmEngagementOpeningMail */
    function confirmEngagementOpeningMail(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "confirmEngagementOpeningMail", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#confirmEngagementReopeningMail */
    function confirmEngagementReopeningMail(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "confirmEngagementReopeningMail", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#confirmOpenedCompetitionSensitiveChanges */
    function confirmOpenedCompetitionSensitiveChanges(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "confirmOpenedCompetitionSensitiveChanges", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#prepareAndSendEngagementOpeningEmails */
    async function prepareAndSendEngagementOpeningEmails(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "prepareAndSendEngagementOpeningEmails", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#createEngagementCompetition */
    async function createEngagementCompetition(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "createEngagementCompetition", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#completeNewlyCreatedEngagementCompetition */
    async function completeNewlyCreatedEngagementCompetition(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "completeNewlyCreatedEngagementCompetition", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#updateEngagementCompetition */
    async function updateEngagementCompetition(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "updateEngagementCompetition", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#saveEngagementCompetitionDetail */
    async function saveEngagementCompetitionDetail(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "saveEngagementCompetitionDetail", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#engagementCompetitionPayloadFromSelection */
    function engagementCompetitionPayloadFromSelection(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-and-competition", "engagementCompetitionPayloadFromSelection", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#updateEngagementCompetitionEvents */
    async function updateEngagementCompetitionEvents(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "updateEngagementCompetitionEvents", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-and-competition.js#updateEngagementCompetitionFees */
    async function updateEngagementCompetitionFees(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-and-competition", "updateEngagementCompetitionFees", args, moduleActions);
    }

    const moduleActions = { validateEngagementCompetitionContacts, openEngagementClubPersonForm, selectedEngagementClubPersonFromForm, renderEngagementClubPeople, loadEngagementClubPeople, saveEngagementClubPerson, setEngagementClubPersonStatus, loadEngagementCompetitions, engagementCompetitionPayloadFromFields, createCompetitionFields, editCompetitionFields, engagementCompetitionPayloadFromForm, engagementCompetitionPayloadFromEditForm, nativeCompetitionFormValues, nativeCompetitionPatchFromForm, saveNativeCompetitionDetail, engagementOpeningDeadlineError, shouldSendEngagementOpeningMail, engagementOpeningMailScopeLabel, confirmEngagementOpeningMail, confirmEngagementReopeningMail, confirmOpenedCompetitionSensitiveChanges, prepareAndSendEngagementOpeningEmails, createEngagementCompetition, completeNewlyCreatedEngagementCompetition, updateEngagementCompetition, saveEngagementCompetitionDetail, engagementCompetitionPayloadFromSelection, updateEngagementCompetitionEvents, updateEngagementCompetitionFees };
    return {
      validateEngagementCompetitionContacts,
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
    };
  }
  global.LivePalmesPortalClubAndCompetition = { create };
})(window);
