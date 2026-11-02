(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    function selectedEngagementClubSwimmerRows() {
        const swimmerFormRows = portalState.engagementClubSwimmersRenderedCompetitionId === portalState.selectedEngagementCompetitionId
          ? Array.from(portalContext.elements.engagementsClubSwimmersForm?.querySelectorAll("[data-engagement-club-swimmer-row]") || [])
          : [];
        if (!swimmerFormRows.length) {
          const entriesBySwimmer = selectedEngagementClubEntryRowsBySwimmerId();
          return (Array.isArray(portalState.selectedEngagementClubEntry?.swimmers) ? portalState.selectedEngagementClubEntry.swimmers : [])
            .map((swimmer) => ({
              ...cloneEngagementClubEntry(swimmer),
              individualEntries: entriesBySwimmer.get(swimmer.swimmerIndexId) || cloneEngagementClubEntry(swimmer.individualEntries || []),
              individualEventCodes: (entriesBySwimmer.get(swimmer.swimmerIndexId) || swimmer.individualEntries || [])
                .map((entry) => entry?.eventCode)
                .filter(Boolean)
            }))
            .filter((swimmer) => swimmer.swimmerIndexId);
        }
        return swimmerFormRows
          .map((row) => {
            const checkbox = row.querySelector("[data-engagement-club-swimmer-id]");
            if (!checkbox?.checked) return null;
            const swimmerIndexId = checkbox.dataset.engagementClubSwimmerId || "";
            const entriesBySwimmer = selectedEngagementClubEntryRowsBySwimmerId();
            const savedSwimmer = (portalState.selectedEngagementClubEntry?.swimmers || []).find((swimmer) => swimmer.swimmerIndexId === swimmerIndexId) || {};
            const individualEntries = entriesBySwimmer.get(swimmerIndexId) || savedSwimmer.individualEntries || [];
            const licenseField = row.querySelector("[data-engagement-club-swimmer-license]");
            return {
              swimmerIndexId,
              source: checkbox.dataset.engagementClubSwimmerSource || "performances",
              swimmerId: checkbox.dataset.engagementClubSwimmerLivepalmesId || "",
              name: checkbox.dataset.engagementClubSwimmerName || "",
              firstName: checkbox.dataset.engagementClubSwimmerFirstName || "",
              lastName: checkbox.dataset.engagementClubSwimmerLastName || "",
              birthDate: checkbox.dataset.engagementClubSwimmerBirthDate || "",
              sex: checkbox.dataset.engagementClubSwimmerSex || "",
              category: checkbox.dataset.engagementClubSwimmerCategory || "",
              licenseNumber: portalState.selectedEngagementCompetition?.napSource === true
                ? String(licenseField?.value ?? licenseField?.dataset.engagementClubSwimmerLicense ?? "").trim()
                : String(licenseField?.value || licenseField?.dataset.engagementClubSwimmerLicense || "").trim().toUpperCase(),
              individualEventCodes: individualEntries.map((entry) => entry.eventCode),
              individualEntries
            };
          })
          .filter((row) => row?.swimmerIndexId);
      }

    function selectedEngagementClubEntryRowsBySwimmerId() {
        const bySwimmerId = new Map();
        Array.from(portalContext.elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || []).forEach((row) => {
          const swimmerIndexId = row.dataset.engagementClubEntrySwimmerId || "";
          if (!swimmerIndexId) return;
          const savedSwimmer = (portalState.selectedEngagementClubEntry?.swimmers || [])
            .find((swimmer) => swimmer.swimmerIndexId === swimmerIndexId) || {};
          const savedEntryByCode = new Map((savedSwimmer.individualEntries || [])
            .map((entry) => [entry.eventCode, entry])
            .filter(([code]) => code));
          const individualEntries = Array.from(row.querySelectorAll("[data-engagement-club-swimmer-event]:checked"))
            .map((input) => {
              const eventCode = String(input.dataset.engagementClubSwimmerEvent || "").trim();
              const timeInput = Array.from(row.querySelectorAll("[data-engagement-club-swimmer-event-time]"))
                .find((item) => item.dataset.engagementClubSwimmerEventTime === eventCode);
              const manualEntryTime = timeInput && !timeInput.disabled ? String(timeInput.value || "").trim() : "";
              return eventCode ? { ...(savedEntryByCode.get(eventCode) || {}), eventCode, manualEntryTime } : null;
            })
            .filter(Boolean);
          bySwimmerId.set(swimmerIndexId, individualEntries);
        });
        return bySwimmerId;
      }

    function engagementClubIndividualEvents() {
        return (portalState.selectedEngagementCompetition?.events || [])
          .filter((event) => event?.type === "individual" && portalActions.engagementEventDefinition(event.code));
      }

    function engagementClubSelectedIndividualEventCodes(swimmer = {}) {
        const entries = Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : [];
        const directCodes = Array.isArray(swimmer.individualEventCodes) ? swimmer.individualEventCodes : [];
        return new Set([
          ...entries.map((entry) => entry?.eventCode),
          ...directCodes
        ].map((code) => String(code || "").trim()).filter(Boolean));
      }

    function formatEngagementEntryTimeInput(value = "") {
        const text = String(value || "").trim().replace(",", ".").replace(/\s+/g, "");
        if (!text) return "";
        let minutes = 0;
        let seconds = 0;
        let hundredths = 0;
        if (/^\d{1,6}$/.test(text)) {
          const padded = text.padStart(text.length <= 4 ? 4 : 6, "0");
          hundredths = Number(padded.slice(-2));
          seconds = Number(padded.slice(-4, -2));
          minutes = Number(padded.slice(0, -4) || 0);
        } else {
          const match = text.match(/^(?:(\d{1,2}):)?(\d{1,2})\.(\d{1,2})$/);
          if (!match) return "";
          minutes = Number(match[1] || 0);
          seconds = Number(match[2]);
          hundredths = Number(match[3].padEnd(2, "0").slice(0, 2));
        }
        if (seconds >= 60 || minutes > 99 || (minutes === 0 && seconds === 0 && hundredths === 0)) return "";
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#normalizeEngagementEntryTimeInput */
    function normalizeEngagementEntryTimeInput(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "normalizeEngagementEntryTimeInput", args, moduleActions);
    }

    function engagementEntryTimeDisplayLabel(entry = {}) {
        if (String(entry.nativeTime || "") === "599999" || (portalState.selectedEngagementCompetition?.napSource === true && Number(portalState.selectedEngagementCompetition.nativeParameters?.saisie) === 0 && entry.entryTimeMode === "default595999")) return "Sans temps connu";
        if (entry.entryTime) return formatEngagementEntryTimeInput(entry.entryTime) || entry.entryTime;
        return entry.entryTimeMode === "default595999" ? "59:59.99" : "Calcul...";
      }

    function engagementClubSwimmerEventTimesCacheKey(swimmer = {}) {
        return [
          portalState.selectedEngagementCompetitionId,
          portalState.selectedEngagementCompetition?.qualificationVersion || 0,
          portalState.selectedEngagementCompetition?.updatedAt || "",
          swimmer.source || "performances",
          swimmer.swimmerIndexId || swimmer.id || ""
        ].join(":");
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#mergeEngagementClubSwimmerEventTimes */
    function mergeEngagementClubSwimmerEventTimes(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "mergeEngagementClubSwimmerEventTimes", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#markEngagementClubSwimmerEventTimesError */
    function markEngagementClubSwimmerEventTimesError(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "markEngagementClubSwimmerEventTimesError", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#flushEngagementClubSwimmerEventTimesBatch */
    async function flushEngagementClubSwimmerEventTimesBatch(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-entry-state", "flushEngagementClubSwimmerEventTimesBatch", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#ensureEngagementClubSwimmerEventTimes */
    async function ensureEngagementClubSwimmerEventTimes(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-entry-state", "ensureEngagementClubSwimmerEventTimes", args, moduleActions);
    }

    function engagementEntryTimeHelpLabel(entry = {}, manualAllowed = false) {
        const warning = entry.entryTimeWarning ? ` - Alerte : ${entry.entryTimeWarning}` : "";
        if (entry.entryTimeMode === "known") {
          return `${[
            entry.date ? portalActions.formatShortDate(entry.date) : "",
            entry.location || ""
          ].filter(Boolean).join(" · ")}${warning}`;
        }
        if (entry.entryTimeMode === "manual") return `Temps saisi manuellement${warning}`;
        if (entry.entryTimeMode === "default595999") return `Aucun temps connu${warning}`;
        return "Temps en cours de calcul";
      }

    function engagementClubProgramSessionsForEntries() {
        const events = engagementClubIndividualEvents();
        const eventOptions = events.map((event) => ({
          code: event.code,
          label: event.shortLabel || event.label || event.code,
          type: event.type || "individual"
        }));
        const seenSlots = new Set();
        const sessions = portalActions.normalizedEngagementProgramSessions(portalState.selectedEngagementCompetition?.programSessions || [], eventOptions)
          .map((session) => ({
            ...session,
            items: (session.items || []).filter((item) => {
              if (portalActions.engagementEventDefinition(item.eventCode)?.type !== "individual" || item.phase === "final") return false;
              const slotKey = `${item.eventCode}:${item.genderMode}`;
              if (seenSlots.has(slotKey)) return false;
              seenSlots.add(slotKey);
              return true;
            })
          }))
          .filter((session) => session.items.length);
        if (sessions.length) return sessions;
        return events.length ? [{
          id: "individual-program",
          label: "Programme",
          date: portalState.selectedEngagementCompetition?.date || "",
          startTime: "",
          items: events.map((event) => ({ eventCode: event.code, genderMode: "mixed" }))
        }] : [];
      }

    function engagementClubProgramItemAllowsSwimmer(item = {}, swimmer = {}) {
        if (item.genderMode === "female" && swimmer.sex === "M") return false;
        if (item.genderMode === "male" && swimmer.sex === "F") return false;
        const nativePerson=portalState.selectedEngagementClubEntry?.swimmers?.find(person=>String(person.swimmerIndexId)===String(swimmer.swimmerIndexId || swimmer.id));
        if(portalState.selectedEngagementCompetition?.napSource===true && Array.isArray(nativePerson?.nativeAllowedEventCodes) && !nativePerson.nativeAllowedEventCodes.includes(item.eventCode)) return false;
        const event = engagementClubIndividualEvents().find((candidate) => candidate.code === item.eventCode) || {};
        const restrictions = Array.isArray(event.categoryRestrictions) ? event.categoryRestrictions : [];
        const category = engagementSwimmerCategory(swimmer, portalState.selectedEngagementCompetition?.date || "");
        const knownCategory = portalConfig.ENGAGEMENT_INDIVIDUAL_CATEGORY_DEFINITIONS.some(([code]) => code === category);
        if(portalState.selectedEngagementCompetition?.napSource===true && (!event.nativeRecognized || !event.nativeCourses?.some(row=>String(row.sexe)===String(swimmer.sex)) || portalConfig.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[event.code]?.has(category))) return false;
        return !restrictions.length || !knownCategory || restrictions.includes(category);
      }

    function engagementClubProgramSessionsForSex(sessions = [], sex = "") {
        return sessions
          .map((session) => ({
            ...session,
            items: (session.items || []).filter((item) => {
              if (sex === "F") return item.genderMode !== "male";
              if (sex === "M") return item.genderMode !== "female";
              return true;
            })
          }))
          .filter((session) => session.items.length);
      }

    function engagementClubProgramItemLabel(item = {}) {
        const event = portalActions.engagementEventDefinition(item.eventCode) || {};
        const eventOption = engagementClubIndividualEvents().find((candidate) => candidate.code === item.eventCode) || event;
        return {
          short: event.shortLabel || eventOption.shortLabel || item.eventCode,
          gender: portalActions.engagementProgramGenderModeShortLabel(item.genderMode, item.eventCode, eventOption),
          full: `${event.label || eventOption.label || item.eventCode} - ${portalActions.engagementProgramGenderModeDisplayLabel(item.genderMode, item.eventCode, eventOption)}`
        };
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#engagementClubEntryRowCountLabel */
    function engagementClubEntryRowCountLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "engagementClubEntryRowCountLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#updateEngagementClubEntryRowCount */
    function updateEngagementClubEntryRowCount(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "updateEngagementClubEntryRowCount", args, moduleActions);
    }

    function updateEngagementClubSwimmersSummary() {
        if (!portalContext.elements.engagementsClubSwimmersSummary) return;
        const selectedRows = portalActions.currentEngagementClubSwimmersForSummary();
        const selectedCount = selectedRows.length;
        portalContext.elements.engagementsClubSwimmersSummary.textContent = selectedCount
          ? `${selectedCount} nageur${selectedCount > 1 ? "s" : ""} engagé${selectedCount > 1 ? "s" : ""}.`
          : "Aucun nageur engagé.";
        portalActions.renderEngagementClubSummary();
      }

    function syncEngagementClubEntriesSaveBar() {
        if (portalContext.elements.engagementsClubEntriesForm) {
          portalContext.elements.engagementsClubEntriesForm.dataset.dirty = portalState.engagementClubEntriesDirty ? "true" : "false";
        }
        if (portalContext.elements.engagementsClubEntriesSaveBar) {
          portalContext.elements.engagementsClubEntriesSaveBar.hidden = !portalState.engagementClubEntriesDirty && !portalState.engagementClubNativeIndividualRetry;
        }
        if (portalContext.elements.engagementsClubEntriesSaveButton) {
          portalContext.elements.engagementsClubEntriesSaveButton.disabled = (!portalState.engagementClubEntriesDirty && !portalState.engagementClubNativeIndividualRetry) || (portalState.engagementClubSwimmersLoading && !portalState.engagementClubSwimmersLoaded) || Boolean(portalActions.engagementClubIndividualEntriesLockReason());
        }
      }

    function setEngagementClubEntriesDirty(dirty) {
        portalState.engagementClubEntriesDirty = Boolean(dirty);
        if (!portalState.engagementClubEntriesDirty) portalConfig.engagementClubEntriesDirtySwimmerIds.clear();
        syncEngagementClubEntriesSaveBar();
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#markEngagementClubEntrySwimmerDirty */
    function markEngagementClubEntrySwimmerDirty(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "markEngagementClubEntrySwimmerDirty", args, moduleActions);
    }

    function setEngagementClubPersistedSwimmers(entry = {}) {
        portalState.engagementClubPersistedSwimmerIds = new Set((entry.swimmers || [])
          .map((swimmer) => String(swimmer?.swimmerIndexId || "").trim())
          .filter(Boolean));
      }

    function cloneEngagementClubEntry(entry = {}) {
        return JSON.parse(JSON.stringify(entry || {}));
      }

    function engagementClubWorkspaceScopeKey() {
        const uid = portalState.currentAccessProfile?.uid || portalState.activeAuthUid || global.firebase?.auth?.().currentUser?.uid || "anonymous";
        const clubId = portalActions.engagementClubScope(portalActions.activeEngagementClubProfile(portalState.currentAccessProfile || {})) || "none";
        return [uid, clubId].map((part) => encodeURIComponent(String(part || ""))).join(".");
      }

    function engagementClubWorkspaceCacheKey(competitionId, scopeKey = engagementClubWorkspaceScopeKey()) {
        return `${scopeKey}.${encodeURIComponent(String(competitionId || "").trim())}`;
      }

    function readEngagementClubWorkspaceCache(competitionId) {
        const cacheKey = engagementClubWorkspaceCacheKey(competitionId);
        const memoryEntry = portalConfig.engagementClubWorkspaceCache.get(cacheKey);
        if (memoryEntry) return memoryEntry;
        try {
          const stored = JSON.parse(global.sessionStorage?.getItem(`${portalConfig.ENGAGEMENT_CLUB_WORKSPACE_SESSION_CACHE_PREFIX}${cacheKey}`) || "null");
          if (!stored || stored.version !== 2 || !stored.competition || !stored.entry || !Number(stored.cachedAt)) return null;
          const entry = {
            competition: cloneEngagementClubEntry(stored.competition),
            entry: cloneEngagementClubEntry(stored.entry),
            cachedAt: Number(stored.cachedAt)
          };
          portalConfig.engagementClubWorkspaceCache.set(cacheKey, entry);
          return entry;
        } catch (_) {
          return null;
        }
      }

    function writeEngagementClubWorkspaceCache(competitionId, workspace = {}, cachedAt = Date.now()) {
        const cleanId = String(competitionId || workspace.competition?.id || "").trim();
        if (!cleanId) return null;
        const cacheKey = engagementClubWorkspaceCacheKey(cleanId);
        const current = portalConfig.engagementClubWorkspaceCache.get(cacheKey);
        if (current?.cachedAt && current.cachedAt > cachedAt) return current;
        const entry = {
          competition: cloneEngagementClubEntry(workspace.competition || {}),
          entry: cloneEngagementClubEntry(workspace.entry || {}),
          cachedAt
        };
        portalConfig.engagementClubWorkspaceCache.set(cacheKey, entry);
        try {
          global.sessionStorage?.setItem(`${portalConfig.ENGAGEMENT_CLUB_WORKSPACE_SESSION_CACHE_PREFIX}${cacheKey}`, JSON.stringify({
            version: 2,
            ...entry
          }));
        } catch (_) {
          // Le cache reste facultatif si le stockage de session est indisponible.
        }
        return entry;
      }

    function clearEngagementClubWorkspaceSessionCaches() {
        global.LivePalmesEngagementNavigation?.clear();
        portalConfig.engagementClubWorkspaceCache.clear();
        portalConfig.engagementClubWorkspaceRequests.clear();
        try {
          const keys = [];
          for (let index = 0; index < (global.sessionStorage?.length || 0); index += 1) {
            const key = global.sessionStorage?.key(index) || "";
            if (key.startsWith(portalConfig.ENGAGEMENT_CLUB_WORKSPACE_SESSION_CACHE_PREFIX)) keys.push(key);
          }
          keys.forEach((key) => global.sessionStorage?.removeItem(key));
        } catch (_) {}
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#engagementClubSwimmersCacheKey */
    function engagementClubSwimmersCacheKey(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "engagementClubSwimmersCacheKey", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#readEngagementClubSwimmersCache */
    function readEngagementClubSwimmersCache(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "readEngagementClubSwimmersCache", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#writeEngagementClubSwimmersCache */
    function writeEngagementClubSwimmersCache(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "writeEngagementClubSwimmersCache", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#invalidateEngagementClubSwimmersCache */
    function invalidateEngagementClubSwimmersCache(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "invalidateEngagementClubSwimmersCache", args, moduleActions);
    }

    function clearEngagementClubSwimmersSessionCaches() {
        portalState.engagementClubSwimmersCachedAt = 0;
        portalState.engagementClubSwimmersLoadPromise = null;
        try {
          const keys = [];
          for (let index = 0; index < (global.sessionStorage?.length || 0); index += 1) {
            const key = global.sessionStorage?.key(index) || "";
            if (key.startsWith(portalConfig.ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX)) keys.push(key);
          }
          keys.forEach((key) => global.sessionStorage?.removeItem(key));
        } catch (_) {}
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#pendingEngagementClubWorkspaceRequest */
    function pendingEngagementClubWorkspaceRequest(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "pendingEngagementClubWorkspaceRequest", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#preloadEngagementClubWorkspaces */
    function preloadEngagementClubWorkspaces(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "preloadEngagementClubWorkspaces", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#scheduleEngagementClubWorkspacePreload */
    function scheduleEngagementClubWorkspacePreload(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "scheduleEngagementClubWorkspacePreload", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#resetEngagementClubTransientMessages */
    function resetEngagementClubTransientMessages(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "resetEngagementClubTransientMessages", args, moduleActions);
    }

    function rememberEngagementClubPersistedEntry(entry = {}) {
        portalState.engagementClubLastPersistedEntry = cloneEngagementClubEntry(entry);
        setEngagementClubPersistedSwimmers(entry);
        if (portalState.selectedEngagementCompetitionId && !portalActions.isEngagementAdminMode() && portalActions.canUse("engagements.club.manage")) {
          const cached = readEngagementClubWorkspaceCache(portalState.selectedEngagementCompetitionId) || {};
          writeEngagementClubWorkspaceCache(portalState.selectedEngagementCompetitionId, {
            competition: cloneEngagementClubEntry(portalState.selectedEngagementCompetition || cached.competition || {}),
            entry: cloneEngagementClubEntry(entry)
          });
        }
      }

    function captureEngagementClubEntriesViewport() {
        const active = document.activeElement;
        const shell = active?.closest?.(".admin-engagements-club-entries-table-shell")
          || portalContext.elements.engagementsClubEntriesList?.querySelector(".admin-engagements-club-entries-table-shell");
        if (!shell) return null;
        const row = active?.closest?.("[data-engagement-club-entry-row]");
        return {
          scrollLeft: shell.scrollLeft,
          scrollTop: shell.scrollTop,
          sex: shell.dataset.engagementClubEntriesSex || "",
          swimmerIndexId: row?.dataset.engagementClubEntrySwimmerId || "",
          eventCode: active?.dataset?.engagementClubSwimmerEvent || "",
          timesButton: active?.matches?.("[data-engagement-club-times-open]") === true,
          shellFocused: active === shell
        };
      }

    function restoreEngagementClubEntriesViewport(state = null) {
        if (!state) return;
        const shells = Array.from(portalContext.elements.engagementsClubEntriesList?.querySelectorAll(".admin-engagements-club-entries-table-shell") || []);
        const shell = shells.find((candidate) => candidate.dataset.engagementClubEntriesSex === state.sex) || shells[0];
        if (!shell) return;
        const row = Array.from(shell.querySelectorAll("[data-engagement-club-entry-row]"))
          .find((candidate) => candidate.dataset.engagementClubEntrySwimmerId === state.swimmerIndexId);
        const target = state.eventCode
          ? Array.from(row?.querySelectorAll("[data-engagement-club-swimmer-event]") || [])
            .find((candidate) => candidate.dataset.engagementClubSwimmerEvent === state.eventCode)
          : state.timesButton
            ? row?.querySelector("[data-engagement-club-times-open]")
            : state.shellFocused ? shell : null;
        target?.focus?.({ preventScroll: true });
        shell.scrollLeft = state.scrollLeft;
        shell.scrollTop = state.scrollTop;
      }

    function renderEngagementClubMutationResult(entry = {}, renderScope = "all") {
        portalState.selectedEngagementClubEntry = entry || {};
        if (renderScope === "entries") {
          const viewport = captureEngagementClubEntriesViewport();
          portalState.engagementClubEntriesRenderedCompetitionId = "";
          portalActions.renderEngagementClubEntries();
          portalActions.renderEngagementClubSummary();
          restoreEngagementClubEntriesViewport(viewport);
          return;
        }
        portalActions.renderEngagementClubEntry(portalState.selectedEngagementClubEntry);
      }

    function mergeEngagementClubEntryWithLocalSwimmerSelections(entry = {}) {
        const localSelectedSwimmers = selectedEngagementClubSwimmerRows();
        if (!localSelectedSwimmers.length) return entry;
        const swimmers = Array.isArray(entry.swimmers) ? [...entry.swimmers] : [];
        const savedIds = new Set(swimmers.map((swimmer) => swimmer?.swimmerIndexId).filter(Boolean));
        localSelectedSwimmers.forEach((swimmer) => {
          if (!swimmer.swimmerIndexId || savedIds.has(swimmer.swimmerIndexId)) return;
          swimmers.push(swimmer);
          savedIds.add(swimmer.swimmerIndexId);
        });
        return { ...entry, swimmers };
      }

    function queueEngagementClubEntryMutation({ execute, messageElement, loadingMessage, errorPrefix = "Enregistrement impossible", competitionId = portalState.selectedEngagementCompetitionId, renderScope = "all", preserveLocalSwimmerSelections = false } = {}) {
        const revision = ++portalState.engagementClubEntryMutationRevision;
        const sessionRevision = global.LivePalmesPortalSession?.revision();
        portalActions.setEngagementSaveState("saving");
        if (messageElement) {
          messageElement.textContent = loadingMessage || "Enregistrement...";
          messageElement.dataset.tone = "loading";
        }
        const task = portalState.engagementClubEntryMutationQueue.then(async () => {
          if (sessionRevision !== global.LivePalmesPortalSession?.revision()) return false;
          try {
            const result = await execute?.();
            if (result?.entry && competitionId === portalState.selectedEngagementCompetitionId) rememberEngagementClubPersistedEntry(result.entry);
            if (revision === portalState.engagementClubEntryMutationRevision && competitionId === portalState.selectedEngagementCompetitionId && result?.entry) {
              setEngagementClubEntriesDirty(false);
              const entryToRender = preserveLocalSwimmerSelections
                ? mergeEngagementClubEntryWithLocalSwimmerSelections(result.entry)
                : result.entry;
              renderEngagementClubMutationResult(entryToRender, renderScope);
            }
            if (messageElement && revision === portalState.engagementClubEntryMutationRevision && competitionId === portalState.selectedEngagementCompetitionId) {
              messageElement.textContent = "";
              messageElement.dataset.tone = "";
            }
            if (revision === portalState.engagementClubEntryMutationRevision && competitionId === portalState.selectedEngagementCompetitionId) portalActions.setEngagementSaveState("saved");
            return true;
          } catch (error) {
            if (revision === portalState.engagementClubEntryMutationRevision && competitionId === portalState.selectedEngagementCompetitionId && portalState.engagementClubLastPersistedEntry) {
              setEngagementClubEntriesDirty(false);
              renderEngagementClubMutationResult(cloneEngagementClubEntry(portalState.engagementClubLastPersistedEntry), renderScope);
            }
            if (messageElement && competitionId === portalState.selectedEngagementCompetitionId) {
              messageElement.textContent = `${errorPrefix} : ${error?.message || error}`;
              messageElement.dataset.tone = "error";
            }
            if (revision === portalState.engagementClubEntryMutationRevision && competitionId === portalState.selectedEngagementCompetitionId) portalActions.setEngagementSaveState("error");
            return false;
          }
        });
        portalState.engagementClubEntryMutationQueue = task.then(() => undefined, () => undefined);
        return task;
      }

    function flushEngagementClubSwimmerSelections({ messageElement = portalContext.elements.engagementsClubSwimmersMessage, loadingMessage = "" } = {}) {
        if (portalState.engagementClubSelectionTimer) global.clearTimeout(portalState.engagementClubSelectionTimer);
        portalState.engagementClubSelectionTimer = null;
        const competitionId = portalState.engagementClubSelectionCompetitionId;
        const changes = Array.from(portalConfig.engagementClubSelectionChanges.values());
        const nativeSelection=portalState.selectedEngagementCompetition?.napSource===true;
        portalConfig.engagementClubSelectionChanges.clear();
        portalState.engagementClubSelectionCompetitionId = "";
        if (!competitionId || !changes.length) return Promise.resolve(false);
        return queueEngagementClubEntryMutation({
          competitionId,
          messageElement,
          loadingMessage: loadingMessage || (changes.length > 1 ? `Enregistrement de ${changes.length} modifications...` : "Enregistrement du nageur..."),
          preserveLocalSwimmerSelections: !nativeSelection,
          execute: async () => {
            if(!nativeSelection) return portalActions.callFunction("saveEngagementClubSwimmerSelections", { competitionId, changes });
            if(portalState.engagementClubNativeRelayRetry || portalState.engagementClubNativeOfficialRetry || portalState.engagementClubNativeSelectionRetry || portalState.engagementClubNativeIndividualRetry) throw new Error("Un enregistrement NAP reste a verifier. Cliquez sur Enregistrer pour le reprendre avant une autre selection.");
            if(portalState.engagementClubLastPersistedEntry?.competitionId!==competitionId) throw new Error("Reouvrez le dossier NAP avant l'enregistrement.");
            const payload={competitionId,changes:changes.map(({swimmerIndexId,selected})=>({swimmerIndexId,selected})),expectedFingerprint:portalState.engagementClubLastPersistedEntry?.napFingerprint,mutationId:global.crypto.randomUUID()};
            portalState.engagementClubNativeSelectionRetry=payload;
            const result=await portalActions.callFunction("saveEngagementClubSwimmerSelections",payload);
            portalState.engagementClubNativeSelectionRetry=null;
            return result;
          }
        });
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#persistEngagementClubSwimmerSelection */
    function persistEngagementClubSwimmerSelection(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "persistEngagementClubSwimmerSelection", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#removeEngagementClubSwimmerFromCourses */
    async function removeEngagementClubSwimmerFromCourses(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-entry-state", "removeEngagementClubSwimmerFromCourses", args, moduleActions);
    }

    function resetEngagementClubEntriesAutosave() {
        if (portalState.engagementClubEntriesAutosaveTimer) global.clearTimeout(portalState.engagementClubEntriesAutosaveTimer);
        portalState.engagementClubEntriesAutosaveTimer = null;
        portalConfig.engagementClubEntriesAutosaveSwimmers.clear();
        portalState.engagementClubEntriesAutosaveCompetitionId = "";
      }

    function suspendEngagementClubWrites() {
        const pending = engagementClubHasPendingWrites();
        if (portalState.engagementClubSelectionTimer) global.clearTimeout(portalState.engagementClubSelectionTimer);
        portalState.engagementClubSelectionTimer = null;
        portalState.engagementClubSelectionCompetitionId = "";
        portalConfig.engagementClubSelectionChanges.clear();
        resetEngagementClubEntriesAutosave();
        ++portalState.engagementClubEntryMutationRevision;
        // Keep the form, dirty markers and uncertain native mutation IDs. Only
        // a new deliberate save may submit them after reauthentication.
        if (pending) portalActions.setEngagementSaveState("error");
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#discardPendingEngagementClubIndividualEntries */
    function discardPendingEngagementClubIndividualEntries(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "discardPendingEngagementClubIndividualEntries", args, moduleActions);
    }

    function flushEngagementClubIndividualEntriesAutosave() {
        if (portalState.engagementClubEntriesAutosaveTimer) global.clearTimeout(portalState.engagementClubEntriesAutosaveTimer);
        portalState.engagementClubEntriesAutosaveTimer = null;
        const competitionId = portalState.engagementClubEntriesAutosaveCompetitionId;
        const swimmers = Array.from(portalConfig.engagementClubEntriesAutosaveSwimmers.values());
        const nativeEntries=portalState.selectedEngagementCompetition?.napSource===true;
        portalConfig.engagementClubEntriesAutosaveSwimmers.clear();
        portalState.engagementClubEntriesAutosaveCompetitionId = "";
        if (!competitionId || !swimmers.length || competitionId !== portalState.selectedEngagementCompetitionId) return Promise.resolve(false);
        return queueEngagementClubEntryMutation({
          competitionId,
          renderScope: "entries",
          messageElement: portalContext.elements.engagementsClubEntriesMessage,
          loadingMessage: swimmers.length > 1 ? "Enregistrement des courses..." : "Enregistrement de la course...",
          execute: async () => {
            if(!nativeEntries) return portalActions.callFunction("saveEngagementClubIndividualEntries",{competitionId,swimmers});
            if(portalState.engagementClubNativeRelayRetry || portalState.engagementClubNativeOfficialRetry || portalState.engagementClubNativeSelectionRetry || portalState.engagementClubNativeIndividualRetry) throw new Error("Un enregistrement NAP reste a verifier avant une autre modification.");
            if(portalState.engagementClubLastPersistedEntry?.competitionId!==competitionId) throw new Error("Reouvrez le dossier NAP avant l'enregistrement.");
            const payload={competitionId,swimmers,expectedFingerprint:portalState.engagementClubLastPersistedEntry?.napFingerprint,mutationId:global.crypto.randomUUID()};
            portalState.engagementClubNativeIndividualRetry=payload;
            const result=await portalActions.callFunction("saveEngagementClubIndividualEntries",payload);
            portalState.engagementClubNativeIndividualRetry=null;
            return result;
          }
        });
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#persistEngagementClubIndividualEntries */
    function persistEngagementClubIndividualEntries(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "persistEngagementClubIndividualEntries", args, moduleActions);
    }

    function engagementClubHasPendingWrites() {
        return Boolean(
          portalConfig.engagementClubSelectionChanges.size ||
          portalConfig.engagementClubEntriesAutosaveSwimmers.size ||
          portalState.engagementClubSelectionTimer ||
          portalState.engagementClubEntriesAutosaveTimer ||
          portalState.engagementClubRelayDialogSaving ||
          portalContext.elements.engagementsSaveState?.dataset.state === "saving"
        );
      }

    function flushPendingEngagementClubWrites() {
        if (portalConfig.engagementClubSelectionChanges.size) void flushEngagementClubSwimmerSelections();
        if (portalConfig.engagementClubEntriesAutosaveSwimmers.size) void flushEngagementClubIndividualEntriesAutosave();
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#engagementNavigationBaseline */
    function engagementNavigationBaseline(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "engagementNavigationBaseline", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#preserveEngagementNavigation */
    function preserveEngagementNavigation(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "preserveEngagementNavigation", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#showEngagementNavigationRecovery */
    function showEngagementNavigationRecovery(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "showEngagementNavigationRecovery", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#restoreEngagementNavigation */
    async function restoreEngagementNavigation(...args) {
      const checkpoint = global.LivePalmesEngagementNavigation;
      if (!checkpoint || !portalState.currentAccessProfile || portalState.engagementNavigationRestoring
          || !portalActions.canUse("engagements.club.manage") || portalActions.isEngagementAdminMode()
          || global.location.hash !== "#club-competitions" || !checkpoint.read(engagementClubWorkspaceScopeKey())) return;
      return global.LivePalmesPortalDeferred.invoke(portalContext, "club-entry-state", "restoreEngagementNavigation", args, moduleActions);
    }

    function updateEngagementClubEntriesSummary() {
        portalActions.renderEngagementClubSummary();
      }

    function engagementClubSwimmerSearchText(swimmer = {}) {
        return portalActions.normalizedEngagementClubSearch([
          swimmer.name,
          swimmer.firstName,
          swimmer.lastName,
          swimmer.birthDate,
          swimmer.sex,
          swimmer.swimmerId,
          swimmer.licenseNumber,
          swimmer.category,
          swimmer.club,
          swimmer.clubName
        ].filter(Boolean).join(" "));
      }

    function engagementCategoryLabel(category) {
        const code = String(category || "").trim();
        const match = portalConfig.ENGAGEMENT_CATEGORY_DEFINITIONS.find(([itemCode]) => itemCode === code);
        return match ? match[1] : code;
      }

    function engagementSeasonEndYear(date = new Date()) {
        const month = date.getMonth();
        const year = date.getFullYear();
        return month >= 8 ? year + 1 : year;
      }

    function engagementSeasonEndYearFromDate(dateValue = "") {
        const value = String(dateValue || "").trim();
        const match = value.match(/^(\d{4})-(\d{2})-\d{2}$/);
        if (!match) return engagementSeasonEndYear();
        const year = Number(match[1]);
        const month = Number(match[2]);
        if (!Number.isFinite(year) || !Number.isFinite(month)) return engagementSeasonEndYear();
        return month >= 9 ? year + 1 : year;
      }

    function engagementSwimmerCategory(swimmer = {}, competitionDate = "") {
        if (swimmer.category) return String(swimmer.category);
        const birthYear = Number(String(swimmer.birthDate || "").slice(0, 4));
        if (!Number.isFinite(birthYear) || birthYear < 1900) return "";
        const age = engagementSeasonEndYearFromDate(competitionDate) - birthYear;
        if (!Number.isFinite(age) || age < 0 || age > 120) return "";
        if (age <= 9) return "P";
        if (age <= 11) return "B";
        if (age <= 13) return "M";
        if (age <= 15) return "C";
        if (age <= 17) return "J";
        if (age <= 29) return "S";
        if (age <= 39) return "M30+";
        if (age <= 49) return "M40+";
        if (age <= 59) return "M50+";
        if (age <= 69) return "M60+";
        if (age <= 79) return "M70+";
        return "M80+";
      }

    function engagementSwimmerLicenseStatusLabel(swimmer = {}, selected = {}) {
        const licenseNumber = selected.licenseNumber || swimmer.licenseNumber || "";
        if (!licenseNumber) return "";
        const verificationStatus = swimmer.licenseVerificationStatus || selected.licenseVerificationStatus || "";
        const seasonStatus = swimmer.licenseSeasonStatus || selected.licenseSeasonStatus || "";
        const verificationLabel = {
          verified: "",
          pending: "À vérifier",
          rejected: "Rejetée",
          conflict: "Conflit"
        }[verificationStatus] || "";
        const seasonLabel = {
          to_check: "Saison à contrôler",
          valid: "Saison valide",
          invalid: "Saison invalide"
        }[seasonStatus] || "";
        return [verificationLabel, seasonLabel].filter(Boolean).join(" · ");
      }

    function engagementSwimmerLicenseStatusIndicator(swimmer = {}, selected = {}) {
        const licenseNumber = selected.licenseNumber || swimmer.licenseNumber || "";
        if (!licenseNumber) return "";
        const verificationStatus = swimmer.licenseVerificationStatus || selected.licenseVerificationStatus || "";
        const seasonStatus = swimmer.licenseSeasonStatus || selected.licenseSeasonStatus || "";
        const requiresAttention = verificationStatus !== "verified" || seasonStatus !== "valid";
        const label = requiresAttention
          ? engagementSwimmerLicenseStatusLabel(swimmer, selected) || "Licence et saison à vérifier"
          : "Licence et saison vérifiées";
        return `<span class="admin-engagements-club-swimmer-license-status" title="${portalActions.escapeHtml(label)}" aria-label="${portalActions.escapeHtml(label)}">${requiresAttention ? "!" : "✓"}</span>`;
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#setEngagementClubSwimmerRowExpanded */
    function setEngagementClubSwimmerRowExpanded(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "setEngagementClubSwimmerRowExpanded", args, moduleActions);
    }

    function engagementSwimmerDisplayName(swimmer = {}, fallback = "Nageur") {
        return [swimmer.lastName, swimmer.firstName].filter(Boolean).join(" ") || swimmer.name || fallback;
      }

    function compareEngagementSwimmersByName(left = {}, right = {}) {
        return String(left.lastName || left.name || "").localeCompare(String(right.lastName || right.name || ""), "fr", { sensitivity: "base", numeric: true }) ||
          String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr", { sensitivity: "base", numeric: true });
      }

    function compareEngagementSwimmersBySexAndName(left = {}, right = {}) {
        const sexRank = (value) => String(value || "").toUpperCase() === "F" ? 0 : String(value || "").toUpperCase() === "M" ? 1 : 2;
        return sexRank(left.sex) - sexRank(right.sex) ||
          compareEngagementSwimmersByName(left, right);
      }

    /* deferred-function: assets/portal/deferred/club-entry-state.js#engagementPublicSwimmerProfileUrl */
    function engagementPublicSwimmerProfileUrl(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "club-entry-state", "engagementPublicSwimmerProfileUrl", args, moduleActions);
    }

    function engagementClubSwimmerIsActive(swimmer = {}) {
        return String(swimmer.clubActivityStatus || "active").trim().toLowerCase() !== "inactive";
      }

    const moduleActions = { selectedEngagementClubSwimmerRows, selectedEngagementClubEntryRowsBySwimmerId, engagementClubIndividualEvents, engagementClubSelectedIndividualEventCodes, formatEngagementEntryTimeInput, normalizeEngagementEntryTimeInput, engagementEntryTimeDisplayLabel, engagementClubSwimmerEventTimesCacheKey, mergeEngagementClubSwimmerEventTimes, markEngagementClubSwimmerEventTimesError, flushEngagementClubSwimmerEventTimesBatch, ensureEngagementClubSwimmerEventTimes, engagementEntryTimeHelpLabel, engagementClubProgramSessionsForEntries, engagementClubProgramItemAllowsSwimmer, engagementClubProgramSessionsForSex, engagementClubProgramItemLabel, engagementClubEntryRowCountLabel, updateEngagementClubEntryRowCount, updateEngagementClubSwimmersSummary, syncEngagementClubEntriesSaveBar, setEngagementClubEntriesDirty, markEngagementClubEntrySwimmerDirty, setEngagementClubPersistedSwimmers, cloneEngagementClubEntry, engagementClubWorkspaceScopeKey, engagementClubWorkspaceCacheKey, readEngagementClubWorkspaceCache, writeEngagementClubWorkspaceCache, clearEngagementClubWorkspaceSessionCaches, engagementClubSwimmersCacheKey, readEngagementClubSwimmersCache, writeEngagementClubSwimmersCache, invalidateEngagementClubSwimmersCache, clearEngagementClubSwimmersSessionCaches, pendingEngagementClubWorkspaceRequest, preloadEngagementClubWorkspaces, scheduleEngagementClubWorkspacePreload, resetEngagementClubTransientMessages, rememberEngagementClubPersistedEntry, captureEngagementClubEntriesViewport, restoreEngagementClubEntriesViewport, renderEngagementClubMutationResult, mergeEngagementClubEntryWithLocalSwimmerSelections, queueEngagementClubEntryMutation, flushEngagementClubSwimmerSelections, persistEngagementClubSwimmerSelection, removeEngagementClubSwimmerFromCourses, resetEngagementClubEntriesAutosave, discardPendingEngagementClubIndividualEntries, flushEngagementClubIndividualEntriesAutosave, persistEngagementClubIndividualEntries, engagementClubHasPendingWrites, flushPendingEngagementClubWrites, engagementNavigationBaseline, preserveEngagementNavigation, showEngagementNavigationRecovery, restoreEngagementNavigation, updateEngagementClubEntriesSummary, engagementClubSwimmerSearchText, engagementCategoryLabel, engagementSeasonEndYear, engagementSeasonEndYearFromDate, engagementSwimmerCategory, engagementSwimmerLicenseStatusLabel, engagementSwimmerLicenseStatusIndicator, setEngagementClubSwimmerRowExpanded, engagementSwimmerDisplayName, compareEngagementSwimmersByName, compareEngagementSwimmersBySexAndName, engagementPublicSwimmerProfileUrl, engagementClubSwimmerIsActive };
    return {
      selectedEngagementClubSwimmerRows,
      selectedEngagementClubEntryRowsBySwimmerId,
      engagementClubIndividualEvents,
      engagementClubSelectedIndividualEventCodes,
      formatEngagementEntryTimeInput,
      normalizeEngagementEntryTimeInput,
      engagementEntryTimeDisplayLabel,
      engagementClubSwimmerEventTimesCacheKey,
      mergeEngagementClubSwimmerEventTimes,
      markEngagementClubSwimmerEventTimesError,
      flushEngagementClubSwimmerEventTimesBatch,
      ensureEngagementClubSwimmerEventTimes,
      engagementEntryTimeHelpLabel,
      engagementClubProgramSessionsForEntries,
      engagementClubProgramItemAllowsSwimmer,
      engagementClubProgramSessionsForSex,
      engagementClubProgramItemLabel,
      engagementClubEntryRowCountLabel,
      updateEngagementClubEntryRowCount,
      updateEngagementClubSwimmersSummary,
      syncEngagementClubEntriesSaveBar,
      setEngagementClubEntriesDirty,
      markEngagementClubEntrySwimmerDirty,
      setEngagementClubPersistedSwimmers,
      cloneEngagementClubEntry,
      engagementClubWorkspaceScopeKey,
      engagementClubWorkspaceCacheKey,
      readEngagementClubWorkspaceCache,
      writeEngagementClubWorkspaceCache,
      clearEngagementClubWorkspaceSessionCaches,
      engagementClubSwimmersCacheKey,
      readEngagementClubSwimmersCache,
      writeEngagementClubSwimmersCache,
      invalidateEngagementClubSwimmersCache,
      clearEngagementClubSwimmersSessionCaches,
      pendingEngagementClubWorkspaceRequest,
      preloadEngagementClubWorkspaces,
      scheduleEngagementClubWorkspacePreload,
      resetEngagementClubTransientMessages,
      rememberEngagementClubPersistedEntry,
      captureEngagementClubEntriesViewport,
      restoreEngagementClubEntriesViewport,
      renderEngagementClubMutationResult,
      mergeEngagementClubEntryWithLocalSwimmerSelections,
      queueEngagementClubEntryMutation,
      flushEngagementClubSwimmerSelections,
      persistEngagementClubSwimmerSelection,
      removeEngagementClubSwimmerFromCourses,
      resetEngagementClubEntriesAutosave,
      suspendEngagementClubWrites,
      discardPendingEngagementClubIndividualEntries,
      flushEngagementClubIndividualEntriesAutosave,
      persistEngagementClubIndividualEntries,
      engagementClubHasPendingWrites,
      flushPendingEngagementClubWrites,
      engagementNavigationBaseline,
      preserveEngagementNavigation,
      showEngagementNavigationRecovery,
      restoreEngagementNavigation,
      updateEngagementClubEntriesSummary,
      engagementClubSwimmerSearchText,
      engagementCategoryLabel,
      engagementSeasonEndYear,
      engagementSeasonEndYearFromDate,
      engagementSwimmerCategory,
      engagementSwimmerLicenseStatusLabel,
      engagementSwimmerLicenseStatusIndicator,
      setEngagementClubSwimmerRowExpanded,
      engagementSwimmerDisplayName,
      compareEngagementSwimmersByName,
      compareEngagementSwimmersBySexAndName,
      engagementPublicSwimmerProfileUrl,
      engagementClubSwimmerIsActive
    };
  }
  global.LivePalmesPortalClubEntryState = { create };
})(window);
