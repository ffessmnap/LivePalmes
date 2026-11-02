(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("club-entry-views", function create(portalContext, moduleActions) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function setEngagementClubSwimmerActivityStatus(swimmerId, source, status, swimmerName = "ce nageur", swimmerSex = "") {
        const cleanId = String(swimmerId || "").trim();
        const cleanStatus = status === "inactive" ? "inactive" : "active";
        if (!cleanId || !portalActions.canUse("engagements.club.manage")) return;
        const subject = String(swimmerSex || "").toUpperCase() === "F"
          ? "Elle"
          : String(swimmerSex || "").toUpperCase() === "M" ? "Il" : "Cette personne";
        if (cleanStatus === "inactive" && !global.confirm(`Rendre ${swimmerName} inactif ? ${subject} n'apparaîtra plus spontanément dans les sélections d'engagement.`)) return;
        if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = `Mise à jour du statut de ${swimmerName}...`;
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("setEngagementClubSwimmerActivityStatus", {
            swimmerIndexId: cleanId,
            source: source || "performances",
            expectedFingerprint: portalState.engagementClubSwimmers.find(item => String(item.swimmerIndexId || item.id) === cleanId)?.napActivityFingerprint,
            status: cleanStatus
          });
          const swimmerIndex = portalState.engagementClubSwimmers.findIndex((item) =>
            (item.source || "performances") === (source || "performances") &&
            (item.id === cleanId || item.swimmerIndexId === cleanId)
          );
          if (swimmerIndex >= 0) {
            portalState.engagementClubSwimmers[swimmerIndex] = {
              ...portalState.engagementClubSwimmers[swimmerIndex],
              ...(result.swimmer || {}),
              clubActivityStatus: cleanStatus
            };
            portalActions.writeEngagementClubSwimmersCache();
          }
          moduleActions.renderEngagementClubSwimmersDirectory();
          moduleActions.renderEngagementClubSwimmers();
          if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = `${swimmerName} est maintenant ${cleanStatus === "active" ? "actif" : "inactif"}.`;
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = `Mise à jour impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "error";
          }
        }
      }

    async function requestEngagementClubSwimmerDeletion(swimmerId, swimmerName = "ce nageur") {
        const cleanId = String(swimmerId || "").trim();
        if (!cleanId || !portalActions.canUse("engagements.club.manage")) return;
        if (!global.confirm(`Demander la suppression de ${swimmerName} ? La fiche sera supprimée immédiatement si elle n'est utilisée nulle part. Sinon, elle sera désactivée et transmise au niveau national.`)) return;
        if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = "Vérification des performances et engagements...";
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("requestEngagementClubSwimmerDeletion", { swimmerId: cleanId });
          portalActions.invalidateEngagementClubSwimmersCache();
          await portalActions.loadEngagementClubSwimmers({ force: true, silent: true });
          if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = result.deleted
              ? `${swimmerName} a été supprimé définitivement : aucune performance ni inscription ne le référençait.`
              : `${swimmerName} a été désactivé. Une demande avec le détail des utilisations a été transmise au niveau national.`;
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = `Suppression impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "error";
          }
        }
      }

    async function loadEngagementClubEntryTimeHistory(swimmer = {}) {
        const eventCodes = moduleActions.engagementClubTimesDialogEventCodes(swimmer);
        const cacheKey = portalActions.engagementClubSwimmerEventTimesCacheKey(swimmer);
        if (!cacheKey || !eventCodes.length || !portalActions.engagementKnownIndividualTimesSelectable()) return;
        if (portalConfig.engagementClubEntryTimeHistoryCache.has(cacheKey)) {
          moduleActions.populateEngagementClubEntryTimeHistory(swimmer);
          return;
        }
        if (portalConfig.engagementClubEntryTimeHistoryRequests.has(cacheKey)) {
          await portalConfig.engagementClubEntryTimeHistoryRequests.get(cacheKey);
          moduleActions.populateEngagementClubEntryTimeHistory(swimmer);
          return;
        }
        const request = (async () => {
          if (portalConfig.engagementClubSelectionChanges.size) await portalActions.flushEngagementClubSwimmerSelections();
          if (portalState.engagementClubEntriesAutosaveTimer) await portalActions.flushEngagementClubIndividualEntriesAutosave();
          await portalState.engagementClubEntryMutationQueue;
          const result = await portalActions.callFunction("getEngagementClubEntryTimeHistory", {
            competitionId: portalState.selectedEngagementCompetitionId,
            swimmerIndexId: swimmer.swimmerIndexId,
            eventCodes
          });
          portalConfig.engagementClubEntryTimeHistoryCache.set(cacheKey, new Map(
            (Array.isArray(result.events) ? result.events : []).map((event) => [event.eventCode, event.times || []])
          ));
        })();
        portalConfig.engagementClubEntryTimeHistoryRequests.set(cacheKey, request);
        if (portalContext.elements.engagementsClubTimesDialogMessage && portalState.engagementClubTimesDialogSwimmerId === swimmer.swimmerIndexId) {
          portalContext.elements.engagementsClubTimesDialogMessage.textContent = "Chargement des autres temps connus...";
          portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "loading";
        }
        try {
          await request;
          moduleActions.populateEngagementClubEntryTimeHistory(swimmer);
          if (portalContext.elements.engagementsClubTimesDialogMessage && portalState.engagementClubTimesDialogSwimmerId === swimmer.swimmerIndexId) {
            portalContext.elements.engagementsClubTimesDialogMessage.textContent = "";
            portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "";
          }
        } catch (error) {
          if (portalContext.elements.engagementsClubTimesDialogMessage && portalState.engagementClubTimesDialogSwimmerId === swimmer.swimmerIndexId) {
            portalContext.elements.engagementsClubTimesDialogMessage.textContent = `Historique indisponible : ${error?.message || error}`;
            portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "error";
          }
        } finally {
          portalConfig.engagementClubEntryTimeHistoryRequests.delete(cacheKey);
        }
      }

    async function openEngagementClubTimesDialog(swimmerIndexId = "", opener = null) {
        const row = Array.from(portalContext.elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || [])
          .find((candidate) => candidate.dataset.engagementClubEntrySwimmerId === swimmerIndexId);
        if (!row) return;
        portalState.engagementClubTimesDialogSwimmerId = swimmerIndexId;
        portalState.engagementClubTimesDialogOpener = opener;
        const swimmer = moduleActions.engagementClubTimesDialogSwimmer();
        portalState.engagementClubTimesDialogLoading = Boolean(swimmer && (swimmer.individualEntries || [])
          .some((entry) => !entry.entryTimeMode || entry.entryTimeMode === "pending"));
        if (portalContext.elements.engagementsClubTimesDialog && !portalContext.elements.engagementsClubTimesDialog.open) {
          portalContext.elements.engagementsClubTimesDialog.showModal();
        }
        moduleActions.renderEngagementClubTimesDialog();
        if (!swimmer) return;
        if (portalState.engagementClubTimesDialogLoading) {
          if (portalState.engagementClubEntriesAutosaveTimer) await portalActions.flushEngagementClubIndividualEntriesAutosave();
          else await portalState.engagementClubEntryMutationQueue;
          if (portalState.engagementClubTimesDialogSwimmerId !== swimmerIndexId) return;
          const refreshedSwimmer = moduleActions.engagementClubTimesDialogSwimmer() || swimmer;
          const stillPending = (refreshedSwimmer.individualEntries || [])
            .some((entry) => !entry.entryTimeMode || entry.entryTimeMode === "pending");
          if (stillPending) await portalActions.ensureEngagementClubSwimmerEventTimes(refreshedSwimmer);
          if (portalState.engagementClubTimesDialogSwimmerId !== swimmerIndexId) return;
          portalState.engagementClubTimesDialogLoading = false;
          moduleActions.renderEngagementClubTimesDialog();
        }
        void moduleActions.loadEngagementClubEntryTimeHistory(moduleActions.engagementClubTimesDialogSwimmer() || swimmer);
      }

    async function applyEngagementClubRelayDialog() {
        let relay = moduleActions.readEngagementClubRelayDialogDraft();
        if (!relay || portalState.engagementClubRelayDialogSaving) return;
        const timeInput = portalContext.elements.engagementsClubRelayDialogTime;
        const openWater = portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater";
        if (!openWater && timeInput && !portalActions.normalizeEngagementEntryTimeInput(timeInput)) {
          timeInput.reportValidity?.();
          timeInput.focus?.();
          return;
        }
        relay = { ...relay, manualEntryTime: openWater ? "" : timeInput?.value || "", draftPending: false };
        portalState.engagementClubRelayDialogDraft = relay;
        const relayIndex = portalState.engagementClubRelaysDraft.findIndex((candidate) => candidate.relayId === relay.relayId);
        const nextRows = relayIndex >= 0
          ? portalState.engagementClubRelaysDraft.map((candidate, index) => index === relayIndex ? relay : candidate)
          : [...portalState.engagementClubRelaysDraft, relay];
        const validationIssues = moduleActions.engagementClubRelayValidationIssues(portalState.selectedEngagementCompetition?.napSource===true ? [relay] : nextRows);
        if (validationIssues.length) {
          if (portalContext.elements.engagementsClubRelayDialogMessage) {
            portalContext.elements.engagementsClubRelayDialogMessage.textContent = validationIssues[0];
            portalContext.elements.engagementsClubRelayDialogMessage.dataset.tone = "error";
          }
          const firstMissingControl = !relay.eventCode
            ? portalContext.elements.engagementsClubRelayDialogEvent
            : !relay.category
              ? portalContext.elements.engagementsClubRelayDialogCategory
              : !relay.genderMode
                ? portalContext.elements.engagementsClubRelayDialogGender
                : !openWater && !relay.manualEntryTime ? portalContext.elements.engagementsClubRelayDialogTime : null;
          firstMissingControl?.focus?.();
          return;
        }
        const previousRows = portalState.engagementClubRelaysDraft;
        portalState.engagementClubRelaysDraft = nextRows;
        portalState.engagementClubRelayDialogSaving = true;
        moduleActions.renderEngagementClubRelayDialog();
        if (portalContext.elements.engagementsClubRelayDialogMessage) {
          portalContext.elements.engagementsClubRelayDialogMessage.textContent = "Enregistrement du relais...";
          portalContext.elements.engagementsClubRelayDialogMessage.dataset.tone = "loading";
        }
        const saved = await portalActions.saveEngagementClubRelays(null, portalContext.elements.engagementsClubRelayDialogMessage, nextRows, "", relay);
        portalState.engagementClubRelayDialogSaving = false;
        if (!saved) {
          portalState.engagementClubRelaysDraft = previousRows;
          moduleActions.renderEngagementClubRelayDialog();
          return;
        }
        const relayId = relay.relayId;
        moduleActions.closeEngagementClubRelayDialog(false);
        global.requestAnimationFrame?.(() => {
          const savedRow = Array.from(portalContext.elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || [])
            .find((row) => row.dataset.engagementClubRelayId === relayId);
          (savedRow?.querySelector("[data-engagement-club-relay-edit]") || savedRow?.querySelector("[data-engagement-club-relay-compose]"))?.focus?.();
        });
      }
    return { setEngagementClubSwimmerActivityStatus, requestEngagementClubSwimmerDeletion, loadEngagementClubEntryTimeHistory, openEngagementClubTimesDialog, applyEngagementClubRelayDialog };
  });
})(window);
