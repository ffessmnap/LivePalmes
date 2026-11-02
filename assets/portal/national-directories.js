(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    /* deferred-function: assets/portal/deferred/national-directories.js#loadEngagementNationalClubs */
    async function loadEngagementNationalClubs(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "loadEngagementNationalClubs", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#closeEngagementNationalClubDialog */
    function closeEngagementNationalClubDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "closeEngagementNationalClubDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#openEngagementNationalClubDialog */
    function openEngagementNationalClubDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "openEngagementNationalClubDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#saveEngagementNationalClub */
    async function saveEngagementNationalClub(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "saveEngagementNationalClub", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#deleteEngagementNationalClub */
    async function deleteEngagementNationalClub(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "deleteEngagementNationalClub", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#engagementNationalStatusMatches */
    function engagementNationalStatusMatches(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "engagementNationalStatusMatches", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#filteredEngagementNationalSwimmers */
    function filteredEngagementNationalSwimmers(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "filteredEngagementNationalSwimmers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#resetEngagementNationalSwimmerFilters */
    function resetEngagementNationalSwimmerFilters(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "resetEngagementNationalSwimmerFilters", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#loadEngagementNationalSwimmers */
    async function loadEngagementNationalSwimmers(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "loadEngagementNationalSwimmers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#setEngagementNationalSwimmerStatus */
    async function setEngagementNationalSwimmerStatus(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "setEngagementNationalSwimmerStatus", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#deleteEngagementNationalSwimmer */
    async function deleteEngagementNationalSwimmer(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "deleteEngagementNationalSwimmer", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#resetEngagementNationalSwimmerMergeState */
    function resetEngagementNationalSwimmerMergeState(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "resetEngagementNationalSwimmerMergeState", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#searchEngagementNationalSwimmerMergeTargets */
    async function searchEngagementNationalSwimmerMergeTargets(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "searchEngagementNationalSwimmerMergeTargets", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#chooseMergeEngagements */
    function chooseMergeEngagements(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "chooseMergeEngagements", args, moduleActions);
    }

    let swimmerMergePending=false;
    async function executeSwimmerMerge(payload) {
        if(swimmerMergePending)throw new Error("Une fusion est déjà en cours. Terminez-la avant d’en lancer une autre.");
        swimmerMergePending=true;
        payload={...payload,entryConflictProtocol:1};
        try{
        let result=await portalActions.callFunction("mergeEngagementNationalClubSwimmer",payload);
        if(result?.mergeConflicts){
          const choices=await chooseMergeEngagements(result.mergeConflicts);
          if(!choices){const error=new Error("Fusion annulée avant modification.");error.mergeCancelled=true;throw error;}
          result=await portalActions.callFunction("mergeEngagementNationalClubSwimmer",{...payload,entryConflictToken:result.mergeConflicts.token,entryConflictChoices:choices});
          if(result?.mergeConflicts)throw new Error("Les engagements ont changé. Relancez la fusion pour refaire les choix.");
        }
        return result;
        }finally{swimmerMergePending=false;}
      }

    /* deferred-function: assets/portal/deferred/national-directories.js#mergeEngagementNationalSwimmer */
    async function mergeEngagementNationalSwimmer(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "mergeEngagementNationalSwimmer", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#mergeSelectedEngagementNationalSwimmers */
    async function mergeSelectedEngagementNationalSwimmers(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "mergeSelectedEngagementNationalSwimmers", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#repairEngagementNationalSwimmerMergePublication */
    async function repairEngagementNationalSwimmerMergePublication(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "repairEngagementNationalSwimmerMergePublication", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#renderEngagementNationalPeople */
    function renderEngagementNationalPeople(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "renderEngagementNationalPeople", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#updateEngagementNationalPeopleStatus */
    function updateEngagementNationalPeopleStatus(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "updateEngagementNationalPeopleStatus", args, moduleActions);
    }

    function visibleNativePeople(people) {
        const key = person => {
          if (!person.napSource || !person.firstName || !person.lastName || !person.birthDate || !person.clubId) return null;
          return JSON.stringify([person.clubId, person.lastName.trim(), person.firstName.trim(), person.birthDate]);
        };
        const officials = new Map();
        for (const person of people) {
          if (person.nativePersonKind !== "officials" || !person.roles?.teamLeader) continue;
          const identity = key(person);
          if (identity) officials.set(identity, (officials.get(identity) || 0) + 1);
        }
        const seen = new Set();
        return people.filter(person => {
          if (person.nativePersonKind !== "leaders") return true;
          const identity = key(person);
          if (!identity) return true;
          if (officials.get(identity) === 1 || seen.has(identity)) return false;
          seen.add(identity);
          return true;
        });
      }

    /* deferred-function: assets/portal/deferred/national-directories.js#filteredEngagementNationalPeople */
    function filteredEngagementNationalPeople(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "filteredEngagementNationalPeople", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#resetEngagementNationalPeopleFilters */
    function resetEngagementNationalPeopleFilters(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "resetEngagementNationalPeopleFilters", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#engagementNationalPersonMergeCandidates */
    function engagementNationalPersonMergeCandidates(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "engagementNationalPersonMergeCandidates", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#engagementNationalPersonDuplicateAlertLabel */
    function engagementNationalPersonDuplicateAlertLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "engagementNationalPersonDuplicateAlertLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#engagementNationalPersonById */
    function engagementNationalPersonById(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "engagementNationalPersonById", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#selectedEngagementNationalPersonMergeIds */
    function selectedEngagementNationalPersonMergeIds(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "selectedEngagementNationalPersonMergeIds", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#selectedEngagementNationalPersonKeepId */
    function selectedEngagementNationalPersonKeepId(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "selectedEngagementNationalPersonKeepId", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#updateEngagementNationalPeopleSelectionState */
    function updateEngagementNationalPeopleSelectionState(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "updateEngagementNationalPeopleSelectionState", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#setEngagementNationalPeopleMergeMode */
    function setEngagementNationalPeopleMergeMode(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "national-directories", "setEngagementNationalPeopleMergeMode", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#loadEngagementNationalPeople */
    async function loadEngagementNationalPeople(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "loadEngagementNationalPeople", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#setEngagementNationalPersonStatus */
    async function setEngagementNationalPersonStatus(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "setEngagementNationalPersonStatus", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#deleteEngagementNationalPerson */
    async function deleteEngagementNationalPerson(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "deleteEngagementNationalPerson", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#mergeEngagementNationalPerson */
    async function mergeEngagementNationalPerson(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "mergeEngagementNationalPerson", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/national-directories.js#mergeSelectedEngagementNationalPeople */
    async function mergeSelectedEngagementNationalPeople(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "national-directories", "mergeSelectedEngagementNationalPeople", args, moduleActions);
    }

    const moduleActions = { loadEngagementNationalClubs, closeEngagementNationalClubDialog, openEngagementNationalClubDialog, saveEngagementNationalClub, deleteEngagementNationalClub, engagementNationalStatusMatches, filteredEngagementNationalSwimmers, resetEngagementNationalSwimmerFilters, loadEngagementNationalSwimmers, setEngagementNationalSwimmerStatus, deleteEngagementNationalSwimmer, resetEngagementNationalSwimmerMergeState, searchEngagementNationalSwimmerMergeTargets, chooseMergeEngagements, executeSwimmerMerge, mergeEngagementNationalSwimmer, mergeSelectedEngagementNationalSwimmers, repairEngagementNationalSwimmerMergePublication, renderEngagementNationalPeople, updateEngagementNationalPeopleStatus, visibleNativePeople, filteredEngagementNationalPeople, resetEngagementNationalPeopleFilters, engagementNationalPersonMergeCandidates, engagementNationalPersonDuplicateAlertLabel, engagementNationalPersonById, selectedEngagementNationalPersonMergeIds, selectedEngagementNationalPersonKeepId, updateEngagementNationalPeopleSelectionState, setEngagementNationalPeopleMergeMode, loadEngagementNationalPeople, setEngagementNationalPersonStatus, deleteEngagementNationalPerson, mergeEngagementNationalPerson, mergeSelectedEngagementNationalPeople };
    return {
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
    };
  }
  global.LivePalmesPortalNationalDirectories = { create };
})(window);
