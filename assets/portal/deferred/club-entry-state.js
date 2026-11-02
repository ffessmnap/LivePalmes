(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("club-entry-state", function create(portalContext, moduleActions) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function flushEngagementClubSwimmerEventTimesBatch() {
        if (portalState.engagementClubSwimmerEventTimesBatchTimer) global.clearTimeout(portalState.engagementClubSwimmerEventTimesBatchTimer);
        portalState.engagementClubSwimmerEventTimesBatchTimer = null;
        const competitionId = portalState.selectedEngagementCompetitionId;
        const pending = Array.from(portalConfig.engagementClubSwimmerEventTimesBatch.values()).slice(0, 50);
        pending.forEach((item) => portalConfig.engagementClubSwimmerEventTimesBatch.delete(item.cacheKey));
        if (!competitionId || !pending.length) return;
        try {
          if (portalConfig.engagementClubSelectionChanges.size) await moduleActions.flushEngagementClubSwimmerSelections();
          await portalState.engagementClubEntryMutationQueue;
          const result = await portalActions.callFunction("previewEngagementClubSwimmerEventTimesBatch", {
            competitionId,
            swimmerIndexIds: pending.map((item) => item.swimmerIndexId)
          });
          const resultsById = new Map((Array.isArray(result.swimmers) ? result.swimmers : [])
            .map((item) => [item.swimmerIndexId, Array.isArray(item.individualEntries) ? item.individualEntries : []]));
          pending.forEach((item) => {
            const previewEntries = resultsById.get(item.swimmerIndexId) || [];
            if (portalState.selectedEngagementCompetitionId === competitionId) {
              portalConfig.engagementClubSwimmerEventTimesCache.set(item.cacheKey, previewEntries);
              moduleActions.mergeEngagementClubSwimmerEventTimes(item.swimmerIndexId, previewEntries);
            }
            item.resolve();
          });
        } catch (error) {
          pending.forEach((item) => {
            moduleActions.markEngagementClubSwimmerEventTimesError(item.swimmerIndexId);
            item.resolve();
          });
          if (portalContext.elements.engagementsClubEntriesMessage) {
            portalContext.elements.engagementsClubEntriesMessage.textContent = `Le temps d'engagement n'a pas pu être calculé : ${error?.message || error}`;
            portalContext.elements.engagementsClubEntriesMessage.dataset.tone = "error";
          }
        } finally {
          pending.forEach((item) => portalConfig.engagementClubSwimmerEventTimesRequests.delete(item.cacheKey));
          if (portalConfig.engagementClubSwimmerEventTimesBatch.size) void flushEngagementClubSwimmerEventTimesBatch();
        }
      }

    async function ensureEngagementClubSwimmerEventTimes(swimmer = {}) {
        if (portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater") return;
        const swimmerIndexId = swimmer.swimmerIndexId || swimmer.id || "";
        const requestCompetitionId = portalState.selectedEngagementCompetitionId;
        const cacheKey = moduleActions.engagementClubSwimmerEventTimesCacheKey(swimmer);
        if (!swimmerIndexId || !portalState.selectedEngagementCompetitionId) return;
        if (portalConfig.engagementClubSwimmerEventTimesCache.has(cacheKey)) {
          moduleActions.mergeEngagementClubSwimmerEventTimes(swimmerIndexId, portalConfig.engagementClubSwimmerEventTimesCache.get(cacheKey));
          return;
        }
        if (portalConfig.engagementClubSwimmerEventTimesRequests.has(cacheKey)) {
          await portalConfig.engagementClubSwimmerEventTimesRequests.get(cacheKey);
          return;
        }
        const request = new Promise((resolve) => {
          portalConfig.engagementClubSwimmerEventTimesBatch.set(cacheKey, { cacheKey, swimmerIndexId, resolve });
          if (portalState.engagementClubSwimmerEventTimesBatchTimer) global.clearTimeout(portalState.engagementClubSwimmerEventTimesBatchTimer);
          portalState.engagementClubSwimmerEventTimesBatchTimer = global.setTimeout(() => void moduleActions.flushEngagementClubSwimmerEventTimesBatch(), 80);
        });
        portalConfig.engagementClubSwimmerEventTimesRequests.set(cacheKey, request);
        await request;
      }

    async function removeEngagementClubSwimmerFromCourses(swimmerIndexId, button) {
        if (portalState.engagementClubSwimmerRemoving || !portalActions.canUse("engagements.club.manage") || portalActions.engagementClubSwimmerSelectionLockReason()) return false;
        const competitionId = portalState.selectedEngagementCompetitionId;
        const clubId = String(portalActions.activeEngagementClubProfile().clubId || "");
        const scopeCurrent = () => competitionId === portalState.selectedEngagementCompetitionId && clubId === String(portalActions.activeEngagementClubProfile().clubId || "");
        const pending = () => portalConfig.engagementClubSelectionChanges.size || portalConfig.engagementClubEntriesAutosaveSwimmers.size || portalState.engagementClubNativeRelayRetry || portalState.engagementClubNativeOfficialRetry || portalState.engagementClubNativeSelectionRetry || portalState.engagementClubNativeIndividualRetry;
        const message = portalContext.elements.engagementsClubEntriesMessage;
        if (pending()) {
          if (message) message.textContent = "Terminez ou vérifiez les enregistrements en cours avant de retirer un nageur.";
          return false;
        }
        portalState.engagementClubSwimmerRemoving = true;
        button.disabled = true;
        try {
          await portalState.engagementClubEntryMutationQueue;
          if (!scopeCurrent() || pending() || portalActions.engagementClubSwimmerSelectionLockReason()) return false;
          const swimmer = (portalState.selectedEngagementClubEntry?.swimmers || []).find(item => item.swimmerIndexId === swimmerIndexId);
          if (!swimmer) return false;
          const name = [swimmer.firstName, swimmer.lastName].filter(Boolean).join(" ") || "ce nageur";
          const relays = (portalState.selectedEngagementClubEntry?.relays || []).filter(relay => (relay.memberIds || []).includes(swimmerIndexId));
          const warning = relays.length ? `\nCe nageur sera aussi retiré de la composition de ${relays.length} relais. Ces relais seront conservés et leur composition devra être complétée.` : "";
          if (!global.confirm(`Retirer ${name} de cette compétition et supprimer tous ses engagements individuels ?${warning}\nSa fiche, sa licence, ses performances et ses engagements dans les autres compétitions seront conservés.`)) return false;
          if (!scopeCurrent() || portalActions.engagementClubSwimmerSelectionLockReason()) return false;
          moduleActions.discardPendingEngagementClubIndividualEntries(swimmerIndexId);
          await moduleActions.persistEngagementClubSwimmerSelection(swimmer, false);
          return await moduleActions.flushEngagementClubSwimmerSelections({ messageElement: message, loadingMessage: "Retrait du nageur et de ses engagements en cours…" });
        } finally {
          portalState.engagementClubSwimmerRemoving = false;
          if (scopeCurrent()) button.disabled = Boolean(portalActions.engagementClubSwimmerSelectionLockReason());
        }
      }

    async function restoreEngagementNavigation() {
        const checkpoint = global.LivePalmesEngagementNavigation;
        if (!checkpoint || portalState.engagementNavigationRestoring || !portalState.currentAccessProfile || !portalActions.canUse("engagements.club.manage")
          || global.location.hash !== "#club-competitions" || portalActions.isEngagementAdminMode()) return;
        const scope = moduleActions.engagementClubWorkspaceScopeKey();
        const snapshot = checkpoint.read(scope);
        if (!snapshot) return;
        // A native Back restoration may have retained the live document already.
        if (portalState.selectedEngagementCompetitionId) {
          return;
        }
        portalState.engagementNavigationRestoring = true;
        try {
          await portalActions.loadEngagementCompetitionDetail(snapshot.competitionId, snapshot.tab);
          if (scope !== moduleActions.engagementClubWorkspaceScopeKey() || global.location.hash !== "#club-competitions"
            || portalState.selectedEngagementCompetitionId !== snapshot.competitionId) return;
          if (!portalState.selectedEngagementClubEntry || portalContext.elements.engagementsDetailRetry?.hidden === false) throw new Error("Dossier indisponible.");
          if (snapshot.baseline !== moduleActions.engagementNavigationBaseline()) {
            moduleActions.showEngagementNavigationRecovery(snapshot);
            return;
          }
          // Await only the existing grouped directory read, never a request per swimmer.
          if (portalState.engagementClubSwimmersLoadPromise) await portalState.engagementClubSwimmersLoadPromise;
          if (!portalState.engagementClubSwimmersLoaded) throw new Error("Annuaire momentanément indisponible.");
          if (scope !== moduleActions.engagementClubWorkspaceScopeKey() || global.location.hash !== "#club-competitions"
            || portalState.selectedEngagementCompetitionId !== snapshot.competitionId) return;
          portalState.selectedEngagementClubEntry = snapshot.entry;
          portalState.engagementClubSwimmersRenderedCompetitionId = "";
          portalState.engagementClubEntriesRenderedCompetitionId = "";
          // Selection readers can consult the old course DOM. Rebuild from the
          // checkpoint model first, otherwise that DOM could replace unsaved choices.
          if (portalContext.elements.engagementsClubEntriesList) portalContext.elements.engagementsClubEntriesList.innerHTML = "";
          portalState.engagementClubRelaysDraft = snapshot.relays || [];
          portalActions.renderEngagementClubSwimmers();
          if (snapshot.tab === "entries") portalActions.renderEngagementClubEntries();
          portalActions.renderEngagementClubRelays();
          portalState.engagementClubTeamEditing = snapshot.teamEditing === true;
          if (portalContext.elements.engagementsClubTeamPersonFields) portalContext.elements.engagementsClubTeamPersonFields.dataset.manualEntry = String(snapshot.teamManual === true);
          portalContext.elements.engagementsClubTeamForm?.querySelectorAll('input[name="adminEngagementsClubTeamMode"]')
            .forEach(radio => { radio.checked = radio.value === snapshot.teamMode; });
          portalActions.updateEngagementClubTeamLeaderActions();
          portalActions.updateEngagementClubTeamFormMode();
          checkpoint.restoreFields(document, snapshot.fields);
          portalActions.renderEngagementClubSwimmers();
          portalActions.renderEngagementClubOfficials();
          portalState.dirtyEngagementDetailTabs = new Set(snapshot.dirtyTabs || []);
          moduleActions.setEngagementClubEntriesDirty(snapshot.entriesDirty === true);
          for (const id of snapshot.dirtySwimmers || []) portalConfig.engagementClubEntriesDirtySwimmerIds.add(id);
          portalActions.updateEngagementDirtyTabIndicators();
          portalActions.setEngagementsDetailTab(snapshot.tab);
          portalActions.renderEngagementClubSummary();
          checkpoint.clear();
        } catch (_) {
          if (portalContext.elements.engagementsDetailStatus) portalContext.elements.engagementsDetailStatus.textContent = "Le retour au dossier a échoué. Le brouillon reste conservé dans cet onglet ; réessayez depuis Engagements.";
          moduleActions.showEngagementNavigationRecovery(snapshot, "Le chargement du dossier n’a pas abouti.");
        } finally { portalState.engagementNavigationRestoring = false; }
      }
    return { flushEngagementClubSwimmerEventTimesBatch, ensureEngagementClubSwimmerEventTimes, removeEngagementClubSwimmerFromCourses, restoreEngagementNavigation };
  });
})(window);
