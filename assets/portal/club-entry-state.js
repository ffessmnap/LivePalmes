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

    function normalizeEngagementEntryTimeInput(input) {
        if (!input) return true;
        const rawValue = String(input.value || "").trim();
        if (!rawValue) {
          input.setCustomValidity?.("");
          return true;
        }
        const formattedValue = formatEngagementEntryTimeInput(rawValue);
        if (!formattedValue) {
          input.setCustomValidity?.("Saisissez un temps au format MM:SS.CC, par exemple 00:59.12, ou uniquement les chiffres 5912.");
          return false;
        }
        input.value = formattedValue;
        input.setCustomValidity?.("");
        return true;
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

    function mergeEngagementClubSwimmerEventTimes(swimmerIndexId = "", entries = []) {
        const previewByCode = new Map((Array.isArray(entries) ? entries : [])
          .map((entry) => [entry?.eventCode, entry])
          .filter(([eventCode]) => eventCode));
        if (!swimmerIndexId || !previewByCode.size) return;
        let updatedSwimmer = null;
        const swimmers = selectedEngagementClubSwimmerRows().map((swimmer) => {
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
          timeValue.textContent = engagementEntryTimeDisplayLabel(entry);
          timeValue.dataset.entryTimeMode = entry.entryTimeMode || "pending";
          timeValue.title = engagementEntryTimeHelpLabel(entry, portalActions.engagementManualIndividualTimesAllowed());
          if (editButton) editButton.dataset.engagementClubTimeAuto = entry.entryTime || "59:59.99";
        });
        updateEngagementClubEntriesSummary();
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

    async function flushEngagementClubSwimmerEventTimesBatch() {
        if (portalState.engagementClubSwimmerEventTimesBatchTimer) global.clearTimeout(portalState.engagementClubSwimmerEventTimesBatchTimer);
        portalState.engagementClubSwimmerEventTimesBatchTimer = null;
        const competitionId = portalState.selectedEngagementCompetitionId;
        const pending = Array.from(portalConfig.engagementClubSwimmerEventTimesBatch.values()).slice(0, 50);
        pending.forEach((item) => portalConfig.engagementClubSwimmerEventTimesBatch.delete(item.cacheKey));
        if (!competitionId || !pending.length) return;
        try {
          if (portalConfig.engagementClubSelectionChanges.size) await flushEngagementClubSwimmerSelections();
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
              mergeEngagementClubSwimmerEventTimes(item.swimmerIndexId, previewEntries);
            }
            item.resolve();
          });
        } catch (error) {
          pending.forEach((item) => {
            markEngagementClubSwimmerEventTimesError(item.swimmerIndexId);
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
        const cacheKey = engagementClubSwimmerEventTimesCacheKey(swimmer);
        if (!swimmerIndexId || !portalState.selectedEngagementCompetitionId) return;
        if (portalConfig.engagementClubSwimmerEventTimesCache.has(cacheKey)) {
          mergeEngagementClubSwimmerEventTimes(swimmerIndexId, portalConfig.engagementClubSwimmerEventTimesCache.get(cacheKey));
          return;
        }
        if (portalConfig.engagementClubSwimmerEventTimesRequests.has(cacheKey)) {
          await portalConfig.engagementClubSwimmerEventTimesRequests.get(cacheKey);
          return;
        }
        const request = new Promise((resolve) => {
          portalConfig.engagementClubSwimmerEventTimesBatch.set(cacheKey, { cacheKey, swimmerIndexId, resolve });
          if (portalState.engagementClubSwimmerEventTimesBatchTimer) global.clearTimeout(portalState.engagementClubSwimmerEventTimesBatchTimer);
          portalState.engagementClubSwimmerEventTimesBatchTimer = global.setTimeout(() => void flushEngagementClubSwimmerEventTimesBatch(), 80);
        });
        portalConfig.engagementClubSwimmerEventTimesRequests.set(cacheKey, request);
        await request;
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

    function engagementClubEntryRowCountLabel(row) {
        const count = row?.querySelectorAll("[data-engagement-club-swimmer-event]:checked").length || 0;
        const maxEvents = Number(portalState.selectedEngagementCompetition?.maxEventsPerSwimmer || 0);
        return maxEvents > 0 ? `${count}/${maxEvents}` : String(count);
      }

    function updateEngagementClubEntryRowCount(row) {
        const button = row?.querySelector("[data-engagement-club-times-open]");
        if (!button) return;
        const countLabel = engagementClubEntryRowCountLabel(row);
        const count = row?.querySelectorAll("[data-engagement-club-swimmer-event]:checked").length || 0;
        button.querySelector("span")?.replaceChildren(countLabel);
        button.setAttribute("aria-label", portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater"
          ? `${count} course${count > 1 ? "s" : ""} sélectionnée${count > 1 ? "s" : ""}`
          : `Voir ou modifier les temps d'engagement, ${count} course${count > 1 ? "s" : ""}`);
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

    function markEngagementClubEntrySwimmerDirty(swimmerIndexId = "") {
        const cleanId = String(swimmerIndexId || "").trim();
        if (cleanId) portalConfig.engagementClubEntriesDirtySwimmerIds.add(cleanId);
        setEngagementClubEntriesDirty(true);
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

    function engagementClubSwimmersCacheKey() {
        return engagementClubWorkspaceScopeKey();
      }

    function readEngagementClubSwimmersCache() {
        try {
          const cacheKey = engagementClubSwimmersCacheKey();
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

    function writeEngagementClubSwimmersCache(swimmers = portalState.engagementClubSwimmers, clubId = portalState.engagementClubSwimmersClubId, cachedAt = Date.now()) {
        portalState.engagementClubSwimmersCachedAt = cachedAt;
        try {
          global.sessionStorage?.setItem(`${portalConfig.ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX}${engagementClubSwimmersCacheKey()}`, JSON.stringify({
            version: 1,
            clubId: String(clubId || portalActions.engagementClubScope() || ""),
            cachedAt,
            swimmers
          }));
        } catch (_) {
          // Le cache reste facultatif si le stockage de session est indisponible.
        }
      }

    function invalidateEngagementClubSwimmersCache() {
        portalState.engagementClubSwimmersLoaded = false;
        portalState.engagementClubSwimmersCachedAt = 0;
        try {
          global.sessionStorage?.removeItem(`${portalConfig.ENGAGEMENT_CLUB_SWIMMERS_SESSION_CACHE_PREFIX}${engagementClubSwimmersCacheKey()}`);
        } catch (_) {}
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

    function pendingEngagementClubWorkspaceRequest(competitionId) {
        return portalConfig.engagementClubWorkspaceRequests.get(engagementClubWorkspaceCacheKey(competitionId)) || null;
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
            const cached = readEngagementClubWorkspaceCache(competition.id);
            return !cached?.cachedAt || Date.now() - cached.cachedAt >= portalConfig.ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS;
          })
          .map((competition) => competition.id)
          .filter((competitionId) => !pendingEngagementClubWorkspaceRequest(competitionId));
        if (!competitionIds.length) return Promise.resolve([]);
        const scopeKey = engagementClubWorkspaceScopeKey();
        const requestedAt = Date.now();
        const requestPromise = portalActions.callFunction("preloadEngagementClubWorkspaces", { competitionIds })
          .then((result) => {
            if (scopeKey !== engagementClubWorkspaceScopeKey()) return [];
            const workspaces = Array.isArray(result.workspaces) ? result.workspaces : [];
            workspaces.forEach((workspace) => {
              writeEngagementClubWorkspaceCache(workspace.competitionId, workspace, requestedAt);
            });
            return workspaces;
          })
          .catch(() => [])
          .finally(() => {
            competitionIds.forEach((competitionId) => {
              const cacheKey = engagementClubWorkspaceCacheKey(competitionId, scopeKey);
              if (portalConfig.engagementClubWorkspaceRequests.get(cacheKey) === requestPromise) {
                portalConfig.engagementClubWorkspaceRequests.delete(cacheKey);
              }
            });
          });
        competitionIds.forEach((competitionId) => {
          portalConfig.engagementClubWorkspaceRequests.set(engagementClubWorkspaceCacheKey(competitionId, scopeKey), requestPromise);
        });
        return requestPromise;
      }

    function scheduleEngagementClubWorkspacePreload(competitions = []) {
        global.setTimeout(() => { void preloadEngagementClubWorkspaces(competitions); }, 0);
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
        portalActions.setEngagementSaveState("saving");
        if (messageElement) {
          messageElement.textContent = loadingMessage || "Enregistrement...";
          messageElement.dataset.tone = "loading";
        }
        const task = portalState.engagementClubEntryMutationQueue.then(async () => {
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

    function persistEngagementClubSwimmerSelection(swimmer = {}, selected = true) {
        const swimmerIndexId = String(swimmer.swimmerIndexId || swimmer.id || "").trim();
        const competitionId = portalState.selectedEngagementCompetitionId;
        if (!swimmerIndexId) return Promise.resolve(false);
        portalActions.setEngagementSaveState("saving");
        if (portalState.engagementClubSelectionCompetitionId && portalState.engagementClubSelectionCompetitionId !== competitionId) {
          void flushEngagementClubSwimmerSelections();
        }
        portalState.engagementClubSelectionCompetitionId = competitionId;
        portalConfig.engagementClubSelectionChanges.set(swimmerIndexId, {
          swimmerIndexId,
          selected,
          swimmer: selected ? swimmer : undefined
        });
        if (portalState.engagementClubSelectionTimer) global.clearTimeout(portalState.engagementClubSelectionTimer);
        portalState.engagementClubSelectionTimer = global.setTimeout(() => void flushEngagementClubSwimmerSelections(), 400);
        return Promise.resolve(true);
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
          discardPendingEngagementClubIndividualEntries(swimmerIndexId);
          await persistEngagementClubSwimmerSelection(swimmer, false);
          return await flushEngagementClubSwimmerSelections({ messageElement: message, loadingMessage: "Retrait du nageur et de ses engagements en cours…" });
        } finally {
          portalState.engagementClubSwimmerRemoving = false;
          if (scopeCurrent()) button.disabled = Boolean(portalActions.engagementClubSwimmerSelectionLockReason());
        }
      }

    function resetEngagementClubEntriesAutosave() {
        if (portalState.engagementClubEntriesAutosaveTimer) global.clearTimeout(portalState.engagementClubEntriesAutosaveTimer);
        portalState.engagementClubEntriesAutosaveTimer = null;
        portalConfig.engagementClubEntriesAutosaveSwimmers.clear();
        portalState.engagementClubEntriesAutosaveCompetitionId = "";
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

    function persistEngagementClubIndividualEntries(swimmer = {}) {
        const swimmerIndexId = String(swimmer.swimmerIndexId || swimmer.id || "").trim();
        const competitionId = portalState.selectedEngagementCompetitionId;
        if (!swimmerIndexId || !competitionId) return Promise.resolve(false);
        portalActions.setEngagementSaveState("saving");
        if (portalState.engagementClubEntriesAutosaveCompetitionId && portalState.engagementClubEntriesAutosaveCompetitionId !== competitionId) {
          resetEngagementClubEntriesAutosave();
        }
        markEngagementClubEntrySwimmerDirty(swimmerIndexId);
        portalState.engagementClubEntriesAutosaveCompetitionId = competitionId;
        portalConfig.engagementClubEntriesAutosaveSwimmers.set(swimmerIndexId, {
          swimmerIndexId,
          individualEntries: cloneEngagementClubEntry(swimmer.individualEntries || [])
        });
        portalState.engagementClubEntryMutationRevision += 1;
        if (portalContext.elements.engagementsClubEntriesMessage) {
          portalContext.elements.engagementsClubEntriesMessage.textContent = "Enregistrement des courses...";
          portalContext.elements.engagementsClubEntriesMessage.dataset.tone = "loading";
        }
        if (portalState.engagementClubEntriesAutosaveTimer) global.clearTimeout(portalState.engagementClubEntriesAutosaveTimer);
        portalState.engagementClubEntriesAutosaveTimer = global.setTimeout(() => {
          void flushEngagementClubIndividualEntriesAutosave();
        }, 500);
        return Promise.resolve(true);
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
        if (engagementClubHasPendingWrites() || portalState.engagementClubTeamSaving || portalState.engagementClubTeamRenunciationSaving
          || portalState.engagementClubSwimmerRemoving || portalState.engagementClubNativeSelectionRetry || portalState.engagementClubNativeIndividualRetry
          || portalState.engagementClubNativeOfficialRetry || portalState.engagementClubNativeRelayRetry || portalState.engagementNavigationRestoring) {
          throw new Error("Un enregistrement est en cours ou reste à vérifier. Terminez-le avant de consulter le site public.");
        }
        if (document.querySelector("dialog[open]")) throw new Error("Terminez ou fermez la fenêtre ouverte avant de consulter le site public.");
        if (document.getElementById("engagementNavigationRecovery")) throw new Error("Conservez le brouillon proposé au téléchargement avant de poursuivre.");
        const forms = [portalContext.elements.engagementsClubTeamForm, portalContext.elements.engagementsClubOfficialsForm,
          portalContext.elements.engagementsClubSwimmersForm, portalContext.elements.engagementsClubEntriesForm, portalContext.elements.engagementsClubRelaysForm];
        const entry = cloneEngagementClubEntry(portalState.selectedEngagementClubEntry);
        entry.swimmers = selectedEngagementClubSwimmerRows();
        checkpoint.save(engagementClubWorkspaceScopeKey(), {
          competitionId: portalState.selectedEngagementCompetitionId, tab: portalState.activeEngagementsDetailTab,
          baseline: engagementNavigationBaseline(), entry,
          fields: checkpoint.captureFields(forms),
          relays: portalActions.selectedEngagementClubRelayRows(),
          dirtyTabs: [...portalState.dirtyEngagementDetailTabs], entriesDirty: portalState.engagementClubEntriesDirty,
          dirtySwimmers: [...portalConfig.engagementClubEntriesDirtySwimmerIds],
          teamEditing: portalState.engagementClubTeamEditing,
          teamManual: portalContext.elements.engagementsClubTeamPersonFields?.dataset.manualEntry === "true",
          teamMode: portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.value || ""
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
          void restoreEngagementNavigation();
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

    async function restoreEngagementNavigation() {
        const checkpoint = global.LivePalmesEngagementNavigation;
        if (!checkpoint || portalState.engagementNavigationRestoring || !portalState.currentAccessProfile || !portalActions.canUse("engagements.club.manage")
          || global.location.hash !== "#club-competitions" || portalActions.isEngagementAdminMode()) return;
        const scope = engagementClubWorkspaceScopeKey();
        const snapshot = checkpoint.read(scope);
        if (!snapshot) return;
        // A native Back restoration may have retained the live document already.
        if (portalState.selectedEngagementCompetitionId) {
          return;
        }
        portalState.engagementNavigationRestoring = true;
        try {
          await portalActions.loadEngagementCompetitionDetail(snapshot.competitionId, snapshot.tab);
          if (scope !== engagementClubWorkspaceScopeKey() || global.location.hash !== "#club-competitions"
            || portalState.selectedEngagementCompetitionId !== snapshot.competitionId) return;
          if (!portalState.selectedEngagementClubEntry || portalContext.elements.engagementsDetailRetry?.hidden === false) throw new Error("Dossier indisponible.");
          if (snapshot.baseline !== engagementNavigationBaseline()) {
            showEngagementNavigationRecovery(snapshot);
            return;
          }
          // Await only the existing grouped directory read, never a request per swimmer.
          if (portalState.engagementClubSwimmersLoadPromise) await portalState.engagementClubSwimmersLoadPromise;
          if (!portalState.engagementClubSwimmersLoaded) throw new Error("Annuaire momentanément indisponible.");
          if (scope !== engagementClubWorkspaceScopeKey() || global.location.hash !== "#club-competitions"
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
          setEngagementClubEntriesDirty(snapshot.entriesDirty === true);
          for (const id of snapshot.dirtySwimmers || []) portalConfig.engagementClubEntriesDirtySwimmerIds.add(id);
          portalActions.updateEngagementDirtyTabIndicators();
          portalActions.setEngagementsDetailTab(snapshot.tab);
          portalActions.renderEngagementClubSummary();
          checkpoint.clear();
        } catch (_) {
          if (portalContext.elements.engagementsDetailStatus) portalContext.elements.engagementsDetailStatus.textContent = "Le retour au dossier a échoué. Le brouillon reste conservé dans cet onglet ; réessayez depuis Engagements.";
          showEngagementNavigationRecovery(snapshot, "Le chargement du dossier n’a pas abouti.");
        } finally { portalState.engagementNavigationRestoring = false; }
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

    function engagementPublicSwimmerProfileUrl(swimmer = {}, name = engagementSwimmerDisplayName(swimmer)) {
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

    function engagementClubSwimmerIsActive(swimmer = {}) {
        return String(swimmer.clubActivityStatus || "active").trim().toLowerCase() !== "inactive";
      }

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
