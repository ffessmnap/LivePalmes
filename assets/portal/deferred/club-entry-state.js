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

    function mergeEngagementClubSwimmerEventTimes(swimmerIndexId = "", entries = []) {
        const previewByCode = new Map((Array.isArray(entries) ? entries : [])
          .map((entry) => [entry?.eventCode, entry])
          .filter(([eventCode]) => eventCode));
        if (!swimmerIndexId || !previewByCode.size) return;
        let updatedSwimmer = null;
        const swimmers = moduleActions.selectedEngagementClubSwimmerRows().map((swimmer) => {
          if (swimmer.swimmerIndexId !== swimmerIndexId) return swimmer;
          updatedSwimmer = {
            ...swimmer,
            individualEntries: (swimmer.individualEntries || []).map((entry) => {
              if(portalState.selectedEngagementCompetition?.napSource===true && entry.entryTimeMode==="native") return entry;
              if (portalActions.engagementManualIndividualTimesAllowed() && entry.entryTimeMode === "manual" && entry.manualEntryTime) return entry;
              const preview = previewByCode.get(entry.eventCode);
              return preview ? { ...entry, ...preview, manualEntryTime: "" } : entry;
            })
          };
          return updatedSwimmer;
        });
        portalState.selectedEngagementClubEntry = {
          ...(portalState.selectedEngagementClubEntry || {}),
          swimmers
        };
        const entryRow = Array.from(portalContext.elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || [])
          .find((row) => row.dataset.engagementClubEntrySwimmerId === swimmerIndexId);
        portalActions.updateQualificationCheckboxes(entryRow, entries);
        const updatedByCode = new Map((updatedSwimmer?.individualEntries || []).map((entry) => [entry.eventCode, entry]));
        Array.from(entryRow?.querySelectorAll("[data-engagement-club-swimmer-event]:checked") || []).forEach((checkbox) => {
          const eventCode = checkbox.dataset.engagementClubSwimmerEvent || "";
          const choice = checkbox.closest("[data-event-selected]");
          const entry = updatedByCode.get(eventCode);
          const timeValue = choice?.querySelector("[data-engagement-club-entry-cell-time]");
          const editButton = choice?.querySelector("[data-engagement-club-time-edit]");
          if (!entry || !timeValue) return;
          timeValue.textContent = moduleActions.engagementEntryTimeDisplayLabel(entry);
          timeValue.dataset.entryTimeMode = entry.entryTimeMode || "pending";
          timeValue.title = moduleActions.engagementEntryTimeHelpLabel(entry, portalActions.engagementManualIndividualTimesAllowed());
          if (editButton) editButton.dataset.engagementClubTimeAuto = entry.entryTime || "59:59.99";
        });
        moduleActions.updateEngagementClubEntriesSummary();
        portalActions.renderEngagementClubSummary();
      }

    function markEngagementClubSwimmerEventTimesError(swimmerIndexId = "") {
        const entryRow = Array.from(portalContext.elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || [])
          .find((row) => row.dataset.engagementClubEntrySwimmerId === swimmerIndexId);
        Array.from(entryRow?.querySelectorAll('[data-engagement-club-entry-cell-time][data-entry-time-mode="pending"]') || [])
          .forEach((timeValue) => {
            timeValue.textContent = "Indisponible";
            timeValue.dataset.entryTimeMode = "error";
          });
      }

    function readEngagementClubSwimmersCache() {
        try {
          const cacheKey = moduleActions.engagementClubSwimmersCacheKey();
          const stored = JSON.parse(global.sessionStorage?.getItem(`${portalConfig.ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX}${cacheKey}`) || "null");
          if (!stored || stored.version !== 1 || !Array.isArray(stored.swimmers) || !Number(stored.cachedAt)) return null;
          const expectedClubId = portalActions.engagementClubScope();
          if (expectedClubId && stored.clubId && String(stored.clubId) !== expectedClubId) return null;
          return {
            clubId: String(stored.clubId || expectedClubId || ""),
            swimmers: stored.swimmers.map((swimmer) => ({ ...swimmer })),
            cachedAt: Number(stored.cachedAt)
          };
        } catch (_) {
          return null;
        }
      }

    function invalidateEngagementClubSwimmersCache() {
        portalState.engagementClubSwimmersLoaded = false;
        portalState.engagementClubSwimmersCachedAt = 0;
        try {
          global.sessionStorage?.removeItem(`${portalConfig.ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX}${moduleActions.engagementClubSwimmersCacheKey()}`);
        } catch (_) {}
      }

    function pendingEngagementClubWorkspaceRequest(competitionId) {
        return portalConfig.engagementClubWorkspaceRequests.get(moduleActions.engagementClubWorkspaceCacheKey(competitionId)) || null;
      }

    function preloadEngagementClubWorkspaces(competitions = []) {
        if (!portalActions.canUse("engagements.club.manage")) return Promise.resolve([]);
        const candidates = competitions
          .filter((competition) => competition?.id && competition.napSource !== true && competition.clubEntryExists === true)
          .sort((left, right) => {
            const priority = (competition) => competition.entryStatus === "open" ? 0 : competition.entryStatus === "upcoming" ? 1 : 2;
            return priority(left) - priority(right) || String(left.date || "").localeCompare(String(right.date || ""));
          })
          .slice(0, portalConfig.ENGAGEMENT_CLUB_WORKSPACE_PRELOAD_LIMIT);
        const competitionIds = candidates
          .filter((competition) => {
            const cached = moduleActions.readEngagementClubWorkspaceCache(competition.id);
            return !cached?.cachedAt || Date.now() - cached.cachedAt >= portalConfig.ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS;
          })
          .map((competition) => competition.id)
          .filter((competitionId) => !moduleActions.pendingEngagementClubWorkspaceRequest(competitionId));
        if (!competitionIds.length) return Promise.resolve([]);
        const scopeKey = moduleActions.engagementClubWorkspaceScopeKey();
        const requestedAt = Date.now();
        const requestPromise = portalActions.callFunction("preloadEngagementClubWorkspaces", { competitionIds })
          .then((result) => {
            if (scopeKey !== moduleActions.engagementClubWorkspaceScopeKey()) return [];
            const workspaces = Array.isArray(result.workspaces) ? result.workspaces : [];
            workspaces.forEach((workspace) => {
              moduleActions.writeEngagementClubWorkspaceCache(workspace.competitionId, workspace, requestedAt);
            });
            return workspaces;
          })
          .catch(() => [])
          .finally(() => {
            competitionIds.forEach((competitionId) => {
              const cacheKey = moduleActions.engagementClubWorkspaceCacheKey(competitionId, scopeKey);
              if (portalConfig.engagementClubWorkspaceRequests.get(cacheKey) === requestPromise) {
                portalConfig.engagementClubWorkspaceRequests.delete(cacheKey);
              }
            });
          });
        competitionIds.forEach((competitionId) => {
          portalConfig.engagementClubWorkspaceRequests.set(moduleActions.engagementClubWorkspaceCacheKey(competitionId, scopeKey), requestPromise);
        });
        return requestPromise;
      }

    function scheduleEngagementClubWorkspacePreload(competitions = []) {
        global.setTimeout(() => { void moduleActions.preloadEngagementClubWorkspaces(competitions); }, 0);
      }

    function resetEngagementClubTransientMessages() {
        [
          portalContext.elements.engagementsClubTeamMessage,
          portalContext.elements.engagementsClubOfficialsMessage,
          portalContext.elements.engagementsClubSwimmersMessage,
          portalContext.elements.engagementsClubEntriesMessage,
          portalContext.elements.engagementsClubRelaysMessage
        ].filter(Boolean).forEach((message) => {
          message.textContent = "";
          delete message.dataset.tone;
        });
      }

    function showEngagementNavigationRecovery(snapshot, message = "Le dossier a évolué depuis votre départ.") {
        if (document.getElementById("engagementNavigationRecovery")) return;
        const note = document.createElement("p");
        note.id = "engagementNavigationRecovery";
        note.setAttribute("role", "status");
        note.textContent = message + " Votre brouillon est conservé sans remplacer les données actuelles. ";
        const download = document.createElement("a");
        download.textContent = "Télécharger mon brouillon";
        download.download = "brouillon-engagements.json";
        download.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
        note.append(download);
        const retry = document.createElement("button");
        retry.type = "button";
        retry.textContent = "Réessayer la reprise";
        retry.addEventListener("click", () => {
          if (portalActions.engagementClubReadRetryBlocked()) {
            global.alert("Terminez les modifications ou enregistrements en cours avant de reprendre le brouillon.");
            return;
          }
          note.remove();
          portalState.selectedEngagementCompetitionId = "";
          void moduleActions.restoreEngagementNavigation();
        });
        note.append(" ", retry);
        const dismiss = document.createElement("button");
        dismiss.type = "button";
        dismiss.textContent = "Fermer ce rappel";
        dismiss.addEventListener("click", () => {
          if (!global.confirm("Avez-vous conservé votre brouillon ? Fermer ce rappel abandonne sa restauration automatique.")) return;
          global.LivePalmesEngagementNavigation.clear();
          note.remove();
        });
        note.append(" ", dismiss);
        portalContext.elements.engagementsDetail?.prepend(note);
      }

    function normalizeEngagementEntryTimeInput(input) {
        if (!input) return true;
        const rawValue = String(input.value || "").trim();
        if (!rawValue) {
          input.setCustomValidity?.("");
          return true;
        }
        const formattedValue = moduleActions.formatEngagementEntryTimeInput(rawValue);
        if (!formattedValue) {
          input.setCustomValidity?.("Saisissez un temps au format MM:SS.CC, par exemple 00:59.12, ou uniquement les chiffres 5912.");
          return false;
        }
        input.value = formattedValue;
        input.setCustomValidity?.("");
        return true;
      }

    function engagementClubEntryRowCountLabel(row) {
        const count = row?.querySelectorAll("[data-engagement-club-swimmer-event]:checked").length || 0;
        const maxEvents = Number(portalState.selectedEngagementCompetition?.maxEventsPerSwimmer || 0);
        return maxEvents > 0 ? `${count}/${maxEvents}` : String(count);
      }

    function updateEngagementClubEntryRowCount(row) {
        const button = row?.querySelector("[data-engagement-club-times-open]");
        if (!button) return;
        const countLabel = moduleActions.engagementClubEntryRowCountLabel(row);
        const count = row?.querySelectorAll("[data-engagement-club-swimmer-event]:checked").length || 0;
        button.querySelector("span")?.replaceChildren(countLabel);
        button.setAttribute("aria-label", portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater"
          ? `${count} course${count > 1 ? "s" : ""} sélectionnée${count > 1 ? "s" : ""}`
          : `Voir ou modifier les temps d'engagement, ${count} course${count > 1 ? "s" : ""}`);
      }

    function markEngagementClubEntrySwimmerDirty(swimmerIndexId = "") {
        const cleanId = String(swimmerIndexId || "").trim();
        if (cleanId) portalConfig.engagementClubEntriesDirtySwimmerIds.add(cleanId);
        moduleActions.setEngagementClubEntriesDirty(true);
      }

    function engagementClubSwimmersCacheKey() {
        return moduleActions.engagementClubWorkspaceScopeKey();
      }

    function writeEngagementClubSwimmersCache(swimmers = portalState.engagementClubSwimmers, clubId = portalState.engagementClubSwimmersClubId, cachedAt = Date.now()) {
        portalState.engagementClubSwimmersCachedAt = cachedAt;
        try {
          global.sessionStorage?.setItem(`${portalConfig.ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX}${moduleActions.engagementClubSwimmersCacheKey()}`, JSON.stringify({
            version: 1,
            clubId: String(clubId || portalActions.engagementClubScope() || ""),
            cachedAt,
            swimmers
          }));
        } catch (_) {
          // Le cache reste facultatif si le stockage de session est indisponible.
        }
      }

    function persistEngagementClubSwimmerSelection(swimmer = {}, selected = true) {
        const swimmerIndexId = String(swimmer.swimmerIndexId || swimmer.id || "").trim();
        const competitionId = portalState.selectedEngagementCompetitionId;
        if (!swimmerIndexId) return Promise.resolve(false);
        portalActions.setEngagementSaveState("saving");
        if (portalState.engagementClubSelectionCompetitionId && portalState.engagementClubSelectionCompetitionId !== competitionId) {
          void moduleActions.flushEngagementClubSwimmerSelections();
        }
        portalState.engagementClubSelectionCompetitionId = competitionId;
        portalConfig.engagementClubSelectionChanges.set(swimmerIndexId, {
          swimmerIndexId,
          selected,
          swimmer: selected ? swimmer : undefined
        });
        if (portalState.engagementClubSelectionTimer) global.clearTimeout(portalState.engagementClubSelectionTimer);
        portalState.engagementClubSelectionTimer = global.setTimeout(() => void moduleActions.flushEngagementClubSwimmerSelections(), 400);
        return Promise.resolve(true);
      }

    function discardPendingEngagementClubIndividualEntries(swimmerIndexId = "") {
        const cleanId = String(swimmerIndexId || "").trim();
        if (!cleanId) return;
        portalConfig.engagementClubEntriesAutosaveSwimmers.delete(cleanId);
        if (portalConfig.engagementClubEntriesAutosaveSwimmers.size || !portalState.engagementClubEntriesAutosaveTimer) return;
        global.clearTimeout(portalState.engagementClubEntriesAutosaveTimer);
        portalState.engagementClubEntriesAutosaveTimer = null;
        portalState.engagementClubEntriesAutosaveCompetitionId = "";
      }

    function persistEngagementClubIndividualEntries(swimmer = {}) {
        const swimmerIndexId = String(swimmer.swimmerIndexId || swimmer.id || "").trim();
        const competitionId = portalState.selectedEngagementCompetitionId;
        if (!swimmerIndexId || !competitionId) return Promise.resolve(false);
        portalActions.setEngagementSaveState("saving");
        if (portalState.engagementClubEntriesAutosaveCompetitionId && portalState.engagementClubEntriesAutosaveCompetitionId !== competitionId) {
          moduleActions.resetEngagementClubEntriesAutosave();
        }
        moduleActions.markEngagementClubEntrySwimmerDirty(swimmerIndexId);
        portalState.engagementClubEntriesAutosaveCompetitionId = competitionId;
        portalConfig.engagementClubEntriesAutosaveSwimmers.set(swimmerIndexId, {
          swimmerIndexId,
          individualEntries: moduleActions.cloneEngagementClubEntry(swimmer.individualEntries || [])
        });
        portalState.engagementClubEntryMutationRevision += 1;
        if (portalContext.elements.engagementsClubEntriesMessage) {
          portalContext.elements.engagementsClubEntriesMessage.textContent = "Enregistrement des courses...";
          portalContext.elements.engagementsClubEntriesMessage.dataset.tone = "loading";
        }
        if (portalState.engagementClubEntriesAutosaveTimer) global.clearTimeout(portalState.engagementClubEntriesAutosaveTimer);
        portalState.engagementClubEntriesAutosaveTimer = global.setTimeout(() => {
          void moduleActions.flushEngagementClubIndividualEntriesAutosave();
        }, 500);
        return Promise.resolve(true);
      }

    function engagementNavigationBaseline() {
        return JSON.stringify([
          portalState.selectedEngagementClubEntry?.napFingerprint || portalState.engagementClubLastPersistedEntry,
          // NAP updatedAt is the read time, not a stored modification date.
          portalState.selectedEngagementCompetition?.napFingerprint || portalState.selectedEngagementCompetition?.updatedAt || "",
          portalState.selectedEngagementCompetition?.entryStatus || ""
        ]);
      }

    function preserveEngagementNavigation() {
        const checkpoint = global.LivePalmesEngagementNavigation;
        if (!checkpoint) throw new Error("Le brouillon ne peut pas encore être conservé. Réessayez dans un instant.");
        if (!portalState.selectedEngagementCompetitionId) return;
        if (portalActions.isEngagementAdminMode()) {
          if (portalState.dirtyEngagementDetailTabs.size) throw new Error("Enregistrez ou annulez vos modifications avant de consulter le site public.");
          return;
        }
        if (!portalActions.canUse("engagements.club.manage") || !portalState.selectedEngagementClubEntry) return;
        if (moduleActions.engagementClubHasPendingWrites() || portalState.engagementClubTeamSaving || portalState.engagementClubTeamRenunciationSaving
          || portalState.engagementClubSwimmerRemoving || portalState.engagementClubNativeSelectionRetry || portalState.engagementClubNativeIndividualRetry
          || portalState.engagementClubNativeOfficialRetry || portalState.engagementClubNativeRelayRetry || portalState.engagementNavigationRestoring) {
          throw new Error("Un enregistrement est en cours ou reste à vérifier. Terminez-le avant de consulter le site public.");
        }
        if (document.querySelector("dialog[open]")) throw new Error("Terminez ou fermez la fenêtre ouverte avant de consulter le site public.");
        if (document.getElementById("engagementNavigationRecovery")) throw new Error("Conservez le brouillon proposé au téléchargement avant de poursuivre.");
        const forms = [portalContext.elements.engagementsClubTeamForm, portalContext.elements.engagementsClubOfficialsForm,
          portalContext.elements.engagementsClubSwimmersForm, portalContext.elements.engagementsClubEntriesForm, portalContext.elements.engagementsClubRelaysForm];
        const entry = moduleActions.cloneEngagementClubEntry(portalState.selectedEngagementClubEntry);
        entry.swimmers = moduleActions.selectedEngagementClubSwimmerRows();
        checkpoint.save(moduleActions.engagementClubWorkspaceScopeKey(), {
          competitionId: portalState.selectedEngagementCompetitionId, tab: portalState.activeEngagementsDetailTab,
          baseline: moduleActions.engagementNavigationBaseline(), entry,
          fields: checkpoint.captureFields(forms),
          relays: portalActions.selectedEngagementClubRelayRows(),
          dirtyTabs: [...portalState.dirtyEngagementDetailTabs], entriesDirty: portalState.engagementClubEntriesDirty,
          dirtySwimmers: [...portalConfig.engagementClubEntriesDirtySwimmerIds],
          teamEditing: portalState.engagementClubTeamEditing,
          teamManual: portalContext.elements.engagementsClubTeamPersonFields?.dataset.manualEntry === "true",
          teamMode: portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.value || ""
        });
      }

    function setEngagementClubSwimmerRowExpanded(row, expanded) {
        if (!row) return;
        const open = expanded === true;
        row.dataset.expanded = open ? "true" : "false";
        const button = row.querySelector("[data-engagement-club-swimmer-details-toggle]");
        if (button) {
          button.setAttribute("aria-expanded", open ? "true" : "false");
          button.setAttribute("aria-label", `${open ? "Masquer" : "Afficher"} le détail de ${button.dataset.engagementClubSwimmerDetailsName || "ce nageur"}`);
        }
      }

    function engagementPublicSwimmerProfileUrl(swimmer = {}, name = moduleActions.engagementSwimmerDisplayName(swimmer)) {
        const params = new URLSearchParams();
        const swimmerId = String(swimmer.swimmerId || swimmer.id || swimmer.swimmerIndexId || "").trim();
        if (swimmerId) {
          params.set("id", swimmerId);
        } else {
          params.set("name", name);
          if (swimmer.birthDate) params.set("birth", swimmer.birthDate);
          if (swimmer.sex) params.set("sex", swimmer.sex);
        }
        return `performances/nageur.html?${params.toString()}`;
      }
    return { flushEngagementClubSwimmerEventTimesBatch, ensureEngagementClubSwimmerEventTimes, removeEngagementClubSwimmerFromCourses, restoreEngagementNavigation , mergeEngagementClubSwimmerEventTimes, markEngagementClubSwimmerEventTimesError, readEngagementClubSwimmersCache, invalidateEngagementClubSwimmersCache, pendingEngagementClubWorkspaceRequest, preloadEngagementClubWorkspaces, scheduleEngagementClubWorkspacePreload, resetEngagementClubTransientMessages, showEngagementNavigationRecovery , normalizeEngagementEntryTimeInput, engagementClubEntryRowCountLabel, updateEngagementClubEntryRowCount, markEngagementClubEntrySwimmerDirty, engagementClubSwimmersCacheKey, writeEngagementClubSwimmersCache, persistEngagementClubSwimmerSelection, discardPendingEngagementClubIndividualEntries, persistEngagementClubIndividualEntries, engagementNavigationBaseline, preserveEngagementNavigation, setEngagementClubSwimmerRowExpanded, engagementPublicSwimmerProfileUrl };
  });
})(window);
