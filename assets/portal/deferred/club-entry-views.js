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

    function engagementClubTimesDialogEventCodes(swimmer = {}) {
        const selectedCodes = portalActions.engagementClubSelectedIndividualEventCodes(swimmer);
        const orderedCodes = portalActions.engagementClubProgramSessionsForEntries()
          .flatMap((session) => session.items || [])
          .map((item) => item.eventCode)
          .filter((code, index, codes) => selectedCodes.has(code) && codes.indexOf(code) === index);
        selectedCodes.forEach((code) => {
          if (!orderedCodes.includes(code)) orderedCodes.push(code);
        });
        return orderedCodes;
      }

    function engagementClubEntryTimeHistoryLabel(item = {}) {
        return portalActions.formatEngagementEntryTimeInput(item.entryTime) || item.entryTime || "Temps inconnu";
      }

    function populateEngagementClubEntryTimeHistory(swimmer = {}) {
        const cacheKey = portalActions.engagementClubSwimmerEventTimesCacheKey(swimmer);
        const historyByEvent = portalConfig.engagementClubEntryTimeHistoryCache.get(cacheKey);
        if (!historyByEvent || portalState.engagementClubTimesDialogSwimmerId !== swimmer.swimmerIndexId) return;
        Array.from(portalContext.elements.engagementsClubTimesDialogList?.querySelectorAll("[data-engagement-club-time-history-select]") || [])
          .forEach((select) => {
            const eventCode = select.dataset.engagementClubTimeHistorySelect || "";
            const originalTime = select.dataset.originalTime || "";
            const selectedTime = select.value;
            const seen = new Set([originalTime]);
            select.querySelectorAll("option[data-history-option]").forEach((option) => option.remove());
            (historyByEvent.get(eventCode) || []).forEach((item) => {
              const value = portalActions.formatEngagementEntryTimeInput(item.entryTime) || item.entryTime || "";
              if (!value || seen.has(value)) return;
              seen.add(value);
              const option = document.createElement("option");
              option.value = value;
              option.textContent = moduleActions.engagementClubEntryTimeHistoryLabel(item);
              option.dataset.historyOption = "true";
              option.dataset.entryTimeMode = "known";
              option.dataset.historyDate = item.date ? portalActions.formatShortDate(item.date) : "";
              option.dataset.historyLocation = item.location || "";
              select.append(option);
            });
            select.value = Array.from(select.options).some((option) => option.value === selectedTime)
              ? selectedTime
              : originalTime;
            const hasAlternatives = select.querySelectorAll("option[data-history-option]").length > 0;
            select.disabled = !hasAlternatives;
            select.dataset.hasAlternatives = hasAlternatives ? "true" : "false";
            moduleActions.updateEngagementClubTimeDialogHelp(select);
          });
      }

    function renderEngagementClubTimesDialog() {
        const swimmer = moduleActions.engagementClubTimesDialogSwimmer();
        const mount = portalContext.elements.engagementsClubTimesDialogList;
        if (!swimmer || !mount) return;
        const name = portalActions.engagementSwimmerDisplayName(swimmer, "Nageur");
        const meta = [
          swimmer.birthDate ? `né(e) le ${portalActions.formatShortDate(swimmer.birthDate)}` : "",
          swimmer.category ? `catégorie ${swimmer.category}` : "",
          swimmer.licenseNumber ? `licence ${swimmer.licenseNumber}` : ""
        ].filter(Boolean).join(" · ");
        if (portalContext.elements.engagementsClubTimesDialogTitle) portalContext.elements.engagementsClubTimesDialogTitle.textContent = name;
        if (portalContext.elements.engagementsClubTimesDialogMeta) portalContext.elements.engagementsClubTimesDialogMeta.textContent = meta;
        if (portalContext.elements.engagementsClubTimesDialogApply) portalContext.elements.engagementsClubTimesDialogApply.disabled = portalState.engagementClubTimesDialogLoading;
        if (portalContext.elements.engagementsClubTimesDialogMessage) {
          portalContext.elements.engagementsClubTimesDialogMessage.textContent = portalState.engagementClubTimesDialogLoading ? "Recherche des temps d'engagement..." : "";
          portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = portalState.engagementClubTimesDialogLoading ? "loading" : "";
        }
        const eventCodes = moduleActions.engagementClubTimesDialogEventCodes(swimmer);
        if (!eventCodes.length) {
          mount.innerHTML = '<p class="admin-engagements-empty">Aucune course cochée pour ce nageur.</p>';
          return;
        }
        const entryByCode = new Map((swimmer.individualEntries || []).map((entry) => [entry.eventCode, entry]));
        const cacheKey = portalActions.engagementClubSwimmerEventTimesCacheKey(swimmer);
        const previewByCode = new Map((portalConfig.engagementClubSwimmerEventTimesCache.get(cacheKey) || []).map((entry) => [entry.eventCode, entry]));
        const manualAllowed = portalActions.engagementManualIndividualTimesAllowed();
        const knownSelectable = portalActions.engagementKnownIndividualTimesSelectable();
        mount.innerHTML = eventCodes.map((eventCode) => {
          const event = portalActions.engagementEventDefinition(eventCode) || { code: eventCode, shortLabel: eventCode, label: eventCode };
          const entry = entryByCode.get(eventCode) || {};
          const preview = previewByCode.get(eventCode) || (entry.entryTimeMode !== "manual" ? entry : {});
          const manualEditing = manualAllowed && entry.entryTimeMode === "manual" && Boolean(entry.manualEntryTime || entry.entryTime);
          const manualValueRaw = manualEditing ? (entry.manualEntryTime || entry.entryTime || "") : "";
          const manualValue = portalActions.formatEngagementEntryTimeInput(manualValueRaw) || manualValueRaw;
          const automaticValueRaw = preview.entryTime || "59:59.99";
          const automaticValue = portalActions.formatEngagementEntryTimeInput(automaticValueRaw) || automaticValueRaw;
          const displayedEntry = manualEditing ? entry : preview;
          const displayLabel = portalActions.engagementEntryTimeDisplayLabel(displayedEntry);
          const help = portalActions.engagementEntryTimeHelpLabel(displayedEntry, manualAllowed);
          const automaticLabel = portalActions.engagementEntryTimeDisplayLabel(preview);
          return `
        <div class="admin-engagements-club-time-dialog-row" data-engagement-club-time-dialog-row="${portalActions.escapeHtml(eventCode)}">
          <div class="admin-engagements-club-time-dialog-course">
            <strong>${portalActions.escapeHtml(event.shortLabel || eventCode)}</strong>
            <small>${portalActions.escapeHtml(event.label || eventCode)}</small>
          </div>
          <div class="admin-engagements-club-time-dialog-value">
            ${knownSelectable ? `
              <select class="admin-engagements-club-time-history-select" data-engagement-club-time-history-select="${portalActions.escapeHtml(eventCode)}" data-original-time="${portalActions.escapeHtml(displayLabel)}" data-entry-time-mode="${portalActions.escapeHtml(displayedEntry.entryTimeMode || "pending")}" data-has-alternatives="false" aria-label="Temps d'engagement ${portalActions.escapeHtml(event.shortLabel || eventCode)}" disabled>
                <option value="${portalActions.escapeHtml(displayLabel)}" data-entry-time-mode="${portalActions.escapeHtml(displayedEntry.entryTimeMode || "pending")}" data-history-date="${portalActions.escapeHtml(displayedEntry.date ? portalActions.formatShortDate(displayedEntry.date) : "")}" data-history-location="${portalActions.escapeHtml(displayedEntry.location || "")}">${portalActions.escapeHtml(displayLabel)}</option>
              </select>
            ` : `
              <span data-engagement-club-time-dialog-display data-entry-time-mode="${portalActions.escapeHtml(displayedEntry.entryTimeMode || "pending")}" data-automatic-label="${portalActions.escapeHtml(automaticLabel)}">${portalActions.escapeHtml(displayLabel)}</span>
            `}
            ${manualAllowed ? `
              <button class="ghost-button compact" type="button" data-engagement-club-time-toggle data-automatic-time="${portalActions.escapeHtml(automaticValue)}">${manualEditing ? "Rétablir auto" : "Saisie libre"}</button>
              <input type="text" maxlength="8" inputmode="numeric" placeholder="00:00.00" aria-label="Temps manuel ${portalActions.escapeHtml(event.shortLabel || eventCode)}" data-engagement-club-time-dialog-input value="${portalActions.escapeHtml(manualValue)}" ${manualEditing ? "" : "hidden disabled"}>
            ` : knownSelectable ? '<input type="text" data-engagement-club-time-dialog-input hidden disabled>' : ""}
          </div>
          <small class="admin-engagements-club-time-dialog-help" data-engagement-club-time-dialog-help>${portalActions.escapeHtml(help)}</small>
        </div>
      `;
        }).join("");
      }

    function focusFirstIncompleteEngagementClubRelay() {
        global.requestAnimationFrame?.(() => {
          const rows = Array.from(portalContext.elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || []);
          const row = rows.find((item) => moduleActions.engagementClubRelayNeedsCompletion(moduleActions.selectedEngagementClubRelayRowsFromElement(item)));
          if (!row) return;
          const relay = moduleActions.selectedEngagementClubRelayRowsFromElement(row);
          const control = !relay.eventCode
            ? row.querySelector("[data-engagement-club-relay-event]")
            : !relay.category
              ? row.querySelector("[data-engagement-club-relay-category]")
              : !relay.genderMode
                ? row.querySelector("[data-engagement-club-relay-gender]")
                : portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "pool" && !String(relay.manualEntryTime || "").trim()
                  ? row.querySelector("[data-engagement-club-relay-time]")
                  : Array.from(row.querySelectorAll("[data-engagement-club-relay-member]")).find((item) => !item.value);
          control?.focus?.();
          row.scrollIntoView?.({ block: "nearest" });
        });
      }

    function selectedEngagementClubRelayRowsFromElement(row) {
        if (!row) return {};
        const relayId = row.dataset.engagementClubRelayId || "";
        const existingRelay = portalState.engagementClubRelaysDraft.find((relay) => relay.relayId === relayId) || {};
        return {
          ...existingRelay,
          relayId,
          eventCode: row.querySelector("[data-engagement-club-relay-event]")?.value || "",
          category: row.querySelector("[data-engagement-club-relay-category]")?.value || "",
          genderMode: row.querySelector("[data-engagement-club-relay-gender]")?.value || "",
          manualEntryTime: row.querySelector("[data-engagement-club-relay-time]")?.value || "",
          memberIds: Array.isArray(existingRelay.memberIds) ? existingRelay.memberIds : [],
          draftPending: existingRelay.draftPending === true || row.dataset.engagementClubRelayPending === "true",
          persisted: existingRelay.persisted === true || row.dataset.engagementClubRelayPersisted === "true"
        };
      }

    function renderEngagementClubSwimmersDirectory() {
        const mount = portalContext.elements.engagementsClubSwimmersDirectoryList;
        if (!mount) return;
        portalContext.elements.engagementsClubSwimmersDirectorySexFilter?.querySelectorAll("[data-engagement-club-swimmer-sex-filter]").forEach((button) => {
          button.setAttribute("aria-pressed", String(button.dataset.engagementClubSwimmerSexFilter === portalState.engagementClubSwimmersDirectorySexFilter));
        });
        const clubLabel = portalActions.clubDisplayLabel(portalState.currentAccessProfile || {}, { fallback: "votre club" });
        if (portalState.engagementClubSwimmersLoading && !portalState.engagementClubSwimmersLoaded) {
          mount.innerHTML = '<p class="admin-engagements-empty">Chargement des nageurs du club...</p>';
          if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = `Lecture de la base nageurs pour ${clubLabel}...`;
            portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "loading";
          }
          return;
        }
        if (!portalState.engagementClubSwimmersLoaded) {
          mount.innerHTML = '<p class="admin-engagements-empty">Les nageurs seront chargés à l’ouverture de cette page.</p>';
          return;
        }
        const query = portalActions.normalizedEngagementClubSearch(portalContext.elements.engagementsClubSwimmersDirectorySearch?.value || "");
        if (portalContext.elements.engagementsClubSwimmersDirectorySearchClear) {
          portalContext.elements.engagementsClubSwimmersDirectorySearchClear.hidden = !String(portalContext.elements.engagementsClubSwimmersDirectorySearch?.value || "").length;
        }
        const swimmers = portalState.engagementClubSwimmers
          .filter((swimmer) =>
            (!query || portalActions.engagementClubSwimmerSearchText(swimmer).includes(query)) &&
            (portalState.engagementClubSwimmersDirectorySexFilter === "all" || String(swimmer.sex || "").trim().toUpperCase() === portalState.engagementClubSwimmersDirectorySexFilter)
          )
          .sort((left, right) =>
            Number(portalActions.engagementClubSwimmerIsActive(right)) - Number(portalActions.engagementClubSwimmerIsActive(left)) ||
            String(left.lastName || left.name || "").localeCompare(String(right.lastName || right.name || ""), "fr", { sensitivity: "base" }) ||
            String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr", { sensitivity: "base" })
          )
          .slice(0, 800);
        const activeCount = swimmers.filter(portalActions.engagementClubSwimmerIsActive).length;
        const inactiveCount = swimmers.length - activeCount;
        const hiddenCount = Math.max(0, portalState.engagementClubSwimmers.length - swimmers.length);
        if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = "";
          portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "neutral";
        }
        if (!swimmers.length) {
          mount.innerHTML = portalState.engagementClubSwimmers.length
            ? '<p class="admin-engagements-empty">Aucun nageur ne correspond aux filtres.</p>'
            : "<p class=\"admin-engagements-empty\">Aucun nageur trouvé dans l'effectif du club.</p>";
          return;
        }
        mount.innerHTML = `
      <div class="admin-engagements-club-swimmers-directory-table" role="table" aria-label="Mes nageurs">
        <div class="admin-engagements-club-swimmers-directory-row admin-engagements-club-swimmers-directory-head" role="row">
          <span role="columnheader">Nageur</span>
          <span role="columnheader">Naissance</span>
          <span role="columnheader">Sexe</span>
          <span role="columnheader">Cat.</span>
          <span role="columnheader">Licence</span>
          <span role="columnheader">NS</span>
          <span role="columnheader">Action</span>
        </div>
        ${swimmers.map((swimmer, index) => {
          const name = portalActions.engagementSwimmerDisplayName(swimmer, "Nageur sans nom");
          const category = portalActions.engagementSwimmerCategory(swimmer);
          const sex = String(swimmer.sex || "").trim().toUpperCase();
          const sexLabel = sex === "F" ? "Femme" : (sex === "M" ? "Homme" : "Sexe non renseigné");
          const sexDisplay = sex === "M" ? "H" : (sex || "-");
          const detailsId = `adminEngagementsClubSwimmerDirectoryDetails${index}`;
          const publicProfileUrl = portalActions.engagementPublicSwimmerProfileUrl(swimmer, name);
          const changePending = swimmer.changeRequestStatus === "pending";
          const licenseStatusIndicator = portalActions.engagementSwimmerLicenseStatusIndicator(swimmer, swimmer);
          const profileButton = `
        <button class="admin-engagements-club-swimmers-directory-name-button" type="button" title="Voir la fiche publique de ${portalActions.escapeHtml(name)}" aria-label="Voir la fiche publique de ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-public-profile="${portalActions.escapeHtml(publicProfileUrl)}" data-engagement-club-swimmer-public-name="${portalActions.escapeHtml(name)}">
          <strong>${portalActions.escapeHtml(name)}</strong>
          <svg class="admin-engagements-club-swimmers-directory-profile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-7 7"></path><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"></path></svg>
        </button>`;
          const correctionAction = changePending
            ? '<span class="admin-engagements-club-swimmers-directory-change-pending" aria-label="Correction en attente"><span class="admin-engagements-club-swimmers-directory-change-pending-long">Correction en attente</span><span class="admin-engagements-club-swimmers-directory-change-pending-short" aria-hidden="true">En attente</span></span>'
            : `<button class="admin-engagements-club-swimmers-directory-edit-button" type="button" title="Demander une correction pour ${portalActions.escapeHtml(name)}" aria-label="Demander une correction pour ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-change="${portalActions.escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-engagement-club-swimmer-change-source="${portalActions.escapeHtml(swimmer.source || "performances")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4zM13.5 6.5l4 4"></path></svg></button>`;
          const duplicateAction = swimmer.napSource && !changePending
            ? `<button class="admin-engagements-club-swimmers-directory-edit-button" type="button" title="Signaler un doublon pour ${portalActions.escapeHtml(name)}" aria-label="Signaler un doublon pour ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-duplicate="${portalActions.escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-engagement-club-swimmer-change-source="${portalActions.escapeHtml(swimmer.source || "reference")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9h11v11H9zM4 15V4h11"/></svg></button>` : "";
          const deletionAction = swimmer.source === "engagement"
            ? `<button class="admin-engagements-club-swimmers-directory-delete-button" type="button" title="Demander la suppression de ${portalActions.escapeHtml(name)}" aria-label="Demander la suppression de ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-delete="${portalActions.escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-engagement-club-swimmer-delete-name="${portalActions.escapeHtml(name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"></path></svg></button>`
            : "";
          const isActive = portalActions.engagementClubSwimmerIsActive(swimmer);
          const nextActivityStatus = isActive ? "inactive" : "active";
          const activityAction = `<button class="admin-engagements-club-swimmers-directory-activity-button" type="button" title="Profil ${isActive ? "actif — cliquer pour rendre inactif" : "inactif — cliquer pour rendre actif"} : ${portalActions.escapeHtml(name)}" aria-label="Profil ${isActive ? "actif" : "inactif"} de ${portalActions.escapeHtml(name)}, ${isActive ? "rendre inactif" : "rendre actif"}" data-engagement-club-swimmer-activity="${portalActions.escapeHtml(swimmer.id || swimmer.swimmerIndexId || "")}" data-engagement-club-swimmer-activity-source="${portalActions.escapeHtml(swimmer.source || "performances")}" data-engagement-club-swimmer-activity-status="${nextActivityStatus}" data-engagement-club-swimmer-activity-name="${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-activity-sex="${portalActions.escapeHtml(sex)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9"></path><path d="M6.7 5.7a8 8 0 1 0 10.6 0"></path></svg><span>${isActive ? "Actif" : "Inactif"}</span></button>`;
          const activitySeparator = index === 0 && activeCount
            ? `<div class="admin-engagements-club-swimmers-directory-activity-separator" role="row"><strong>Actifs</strong><span>${activeCount}</span></div>`
            : index === activeCount && inactiveCount
              ? `<button class="admin-engagements-club-swimmers-directory-activity-separator admin-engagements-club-inactive-toggle" type="button" role="row" data-engagement-club-directory-inactive-toggle aria-expanded="${portalState.engagementClubInactiveSwimmersDirectoryExpanded}"><strong>Nageurs inactifs</strong><span>${inactiveCount}</span><i aria-hidden="true"></i></button>`
              : "";
          return `
        ${activitySeparator}
        <div class="admin-engagements-club-swimmers-directory-row" role="row" data-sex="${portalActions.escapeHtml(sex)}" data-activity-status="${isActive ? "active" : "inactive"}" data-expanded="false" ${!isActive && !portalState.engagementClubInactiveSwimmersDirectoryExpanded ? "hidden" : ""}>
          <div class="admin-engagements-club-swimmers-directory-toggle">
            ${profileButton}
            <span class="admin-engagements-club-swimmers-directory-toggle-meta">
              <span class="admin-engagements-club-swimmers-directory-sex-category" aria-label="${portalActions.escapeHtml(sexLabel)}, catégorie ${portalActions.escapeHtml(category || "non renseignée")}"><span class="admin-engagements-club-swimmers-directory-sex">${portalActions.escapeHtml(sexDisplay)}</span><span aria-hidden="true">·</span><span class="admin-engagements-club-swimmers-directory-category">${portalActions.escapeHtml(category || "-")}</span></span>
              <span class="admin-engagements-club-swimmers-directory-mobile-actions">${activityAction}${correctionAction}${duplicateAction}${deletionAction}</span>
              <button class="admin-engagements-club-swimmers-directory-details-button" type="button" aria-expanded="false" aria-controls="${detailsId}" aria-label="Afficher le détail de ${portalActions.escapeHtml(name)}" data-engagement-club-swimmer-directory-toggle>
                <span class="admin-engagements-club-swimmers-directory-chevron" aria-hidden="true">›</span>
              </button>
            </span>
          </div>
          <div id="${detailsId}" class="admin-engagements-club-swimmers-directory-details">
            <span role="cell">${profileButton}</span>
            <span role="cell">${portalActions.escapeHtml(swimmer.birthDate ? portalActions.formatShortDate(swimmer.birthDate) : "-")}</span>
            <span role="cell">${portalActions.escapeHtml(swimmer.sex || "-")}</span>
            <span role="cell" title="${portalActions.escapeHtml(portalActions.engagementCategoryLabel(category) || "-")}">${portalActions.escapeHtml(category || "-")}</span>
            <span class="admin-engagements-club-swimmer-license-cell" role="cell">${swimmer.licenseNumber
                  ? `<span class="admin-engagements-club-swimmers-directory-license-content"><span class="admin-engagements-club-swimmer-license-value">${portalActions.escapeHtml(swimmer.licenseNumber)}</span>${licenseStatusIndicator}</span>`
                  : '<span class="admin-engagements-club-swimmers-directory-license-missing">Licence à renseigner</span>'}</span>
            <span role="cell" class="admin-engagements-club-swimmers-directory-ns"${swimmer.nonSelectable === true ? ' title="Non sélectionnable"' : ""}>${swimmer.nonSelectable === true ? "NS" : ""}</span>
            <span role="cell" class="admin-engagements-club-swimmers-directory-actions">
              ${activityAction}${correctionAction}${duplicateAction}${deletionAction}
            </span>
          </div>
        </div>
      `;
        }).join("")}
      </div>
      ${hiddenCount ? `<p class="admin-engagements-empty">${hiddenCount} nageur${hiddenCount > 1 ? "s" : ""} masque${hiddenCount > 1 ? "s" : ""} par les filtres ou la limite d'affichage.</p>` : ""}
    `;
      }

    function engagementClubTimesDialogSwimmer() {
        if (!portalState.engagementClubTimesDialogSwimmerId) return null;
        return portalActions.selectedEngagementClubSwimmerRows()
          .find((swimmer) => swimmer.swimmerIndexId === portalState.engagementClubTimesDialogSwimmerId) || null;
      }

    function updateEngagementClubTimeDialogHelp(select) {
        const row = select?.closest("[data-engagement-club-time-dialog-row]");
        const help = row?.querySelector("[data-engagement-club-time-dialog-help]");
        const option = select?.selectedOptions?.[0];
        if (!help || !option) return;
        const mode = option.dataset.entryTimeMode || select.dataset.entryTimeMode || "";
        help.textContent = mode === "manual"
          ? "Temps saisi manuellement"
          : mode === "default595999"
          ? "Aucun temps connu"
          : [option.dataset.historyDate || "", option.dataset.historyLocation || ""].filter(Boolean).join(" · ");
      }

    function closeEngagementClubTimesDialog(restoreFocus = true) {
        if (portalContext.elements.engagementsClubTimesDialog?.open) portalContext.elements.engagementsClubTimesDialog.close();
        const opener = portalState.engagementClubTimesDialogOpener;
        portalState.engagementClubTimesDialogSwimmerId = "";
        portalState.engagementClubTimesDialogLoading = false;
        portalState.engagementClubTimesDialogOpener = null;
        if (restoreFocus) opener?.focus?.();
      }

    function applyEngagementClubTimesDialog() {
        const swimmer = moduleActions.engagementClubTimesDialogSwimmer();
        if (!swimmer) return;
        const overrides = new Map();
        const dialogRows = Array.from(portalContext.elements.engagementsClubTimesDialogList?.querySelectorAll("[data-engagement-club-time-dialog-row]") || []);
        for (const dialogRow of dialogRows) {
          const eventCode = dialogRow.dataset.engagementClubTimeDialogRow || "";
          const input = dialogRow.querySelector("[data-engagement-club-time-dialog-input]");
          const historySelect = dialogRow.querySelector("[data-engagement-club-time-history-select]");
          if (!input) continue;
          const historyValue = String(historySelect?.value || "").trim();
          const historyChanged = Boolean(historySelect && historyValue && historyValue !== historySelect.dataset.originalTime);
          const manual = historyChanged || !input.disabled;
          const savedEntry=(swimmer.individualEntries || []).find(entry=>entry.eventCode===eventCode);
          if(portalState.selectedEngagementCompetition?.napSource===true && savedEntry?.entryTimeMode==="native" && !manual && dialogRow.dataset.nativeAutoRequested!=="true") continue;
          const validTime = !manual || (historyChanged
            ? Boolean(portalActions.formatEngagementEntryTimeInput(historyValue))
            : portalActions.normalizeEngagementEntryTimeInput(input));
          const value = historyChanged ? historyValue : manual ? String(input.value || "").trim() : "";
          if (manual && !value) {
            if (portalContext.elements.engagementsClubTimesDialogMessage) {
              portalContext.elements.engagementsClubTimesDialogMessage.textContent = "Renseignez le temps modifié ou rétablissez le temps automatique.";
              portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "error";
            }
            input.focus?.();
            return;
          }
          if (!validTime) {
            if (portalContext.elements.engagementsClubTimesDialogMessage) {
              portalContext.elements.engagementsClubTimesDialogMessage.textContent = "Temps invalide : utilisez MM:SS.CC ou saisissez uniquement les chiffres.";
              portalContext.elements.engagementsClubTimesDialogMessage.dataset.tone = "error";
            }
            input.reportValidity?.();
            input.focus?.();
            return;
          }
          overrides.set(eventCode, { manual, value, known: historyChanged && !portalActions.engagementManualIndividualTimesAllowed() });
        }
        const matrixRow = Array.from(portalContext.elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-entry-row]") || [])
          .find((candidate) => candidate.dataset.engagementClubEntrySwimmerId === swimmer.swimmerIndexId);
        overrides.forEach((override, eventCode) => {
          const timeInput = Array.from(matrixRow?.querySelectorAll("[data-engagement-club-swimmer-event-time]") || [])
            .find((input) => input.dataset.engagementClubSwimmerEventTime === eventCode);
          if (!timeInput) return;
          timeInput.value = override.value;
          timeInput.disabled = !override.manual || override.known;
        });
        const previewByCode = new Map((portalConfig.engagementClubSwimmerEventTimesCache.get(portalActions.engagementClubSwimmerEventTimesCacheKey(swimmer)) || [])
          .map((entry) => [entry.eventCode, entry]));
        const swimmers = portalActions.selectedEngagementClubSwimmerRows().map((candidate) => {
          if (candidate.swimmerIndexId !== swimmer.swimmerIndexId) return candidate;
          return {
            ...candidate,
            individualEntries: (candidate.individualEntries || []).map((entry) => {
              const override = overrides.get(entry.eventCode);
              if (!override) return entry;
              if (override.known) {
                return { ...entry, entryTimeMode: "known", entryTime: override.value, manualEntryTime: "" };
              }
              if (override.manual) {
                return { ...entry, entryTimeMode: "manual", entryTime: override.value, manualEntryTime: override.value };
              }
              const preview = previewByCode.get(entry.eventCode);
              return preview ? { ...entry, ...preview, manualEntryTime: "" } : { ...entry, manualEntryTime: "" };
            })
          };
        });
        const swimmerIndexId = swimmer.swimmerIndexId;
        const changedSwimmer = swimmers.find((candidate) => candidate.swimmerIndexId === swimmerIndexId);
        portalState.selectedEngagementClubEntry = { ...(portalState.selectedEngagementClubEntry || {}), swimmers };
        moduleActions.closeEngagementClubTimesDialog(false);
        moduleActions.renderEngagementClubEntries();
        Array.from(portalContext.elements.engagementsClubEntriesList?.querySelectorAll("[data-engagement-club-times-open]") || [])
          .find((button) => button.dataset.engagementClubTimesOpen === swimmerIndexId)?.focus?.();
        if (changedSwimmer) void portalActions.persistEngagementClubIndividualEntries(changedSwimmer);
      }

    function engagementRelayLegPlaceholder(genderMode = "", index = 0) {
        if (genderMode === "female") return `Relayeuse ${index + 1}`;
        if (genderMode === "mixed") return `${index % 2 === 0 ? "Relayeur" : "Relayeuse"} ${index + 1} (${index % 2 === 0 ? "Homme" : "Femme"})`;
        return `Relayeur ${index + 1}`;
      }

    function engagementRelayLegChoiceLabel(genderMode = "", index = 0) {
        const expectedSex = moduleActions.engagementRelayExpectedMemberSex(genderMode, index);
        return `${expectedSex === "F" ? "Relayeuse" : "Relayeur"} ${index + 1}`;
      }

    function engagementRelayExpectedMemberSex(genderMode = "", index = 0) {
        if (genderMode === "female") return "F";
        if (genderMode === "male") return "M";
        if (genderMode === "mixed") return index % 2 === 0 ? "M" : "F";
        return "";
      }

    function engagementRelayMemberOptionLabel(swimmer = {}, competitionDate = "") {
        const name = portalActions.engagementSwimmerDisplayName(swimmer);
        const category = portalActions.engagementSwimmerCategory(swimmer, competitionDate);
        return category ? `${name} (${category})` : name;
      }

    function engagementRelaySameDistanceNature(event = {}, candidate = {}) {
        return String(event.distance || "") === String(candidate.distance || "") &&
          String(event.discipline || "") === String(candidate.discipline || "");
      }

    function engagementRelayMemberAlreadyUsed(swimmerIndexId = "", rows = [], rowIndex = -1, memberIndex = -1, event = {}) {
        if (!swimmerIndexId) return false;
        const relayEvents = new Map(moduleActions.engagementClubRelayEvents().map((item) => [item.code, item]));
        return rows.some((relay, relayIndex) => {
          const relayEvent = relayEvents.get(relay.eventCode);
          if (!relayEvent || !moduleActions.engagementRelaySameDistanceNature(event, relayEvent)) return false;
          const memberIds = Array.isArray(relay.memberIds)
            ? relay.memberIds
            : (relay.members || []).map((member) => member.swimmerIndexId).filter(Boolean);
          return memberIds.some((memberId, currentMemberIndex) =>
            memberId === swimmerIndexId && (relayIndex !== rowIndex || currentMemberIndex !== memberIndex)
          );
        });
      }

    function reconcileEngagementClubRelayDraft(relay = {}, previousRelay = {}, changedField = "") {
        const event = moduleActions.engagementClubRelayEvents().find((item) => item.code === relay.eventCode) || {};
        const categories = moduleActions.engagementRelayCategoryOptions(event);
        const category = categories.some(([code]) => code === relay.category) ? relay.category : "";
        const genderOptions = moduleActions.engagementRelayGenderOptions(event, category);
        const genderMode = genderOptions.length === 1
          ? genderOptions[0][0]
          : genderOptions.some(([mode]) => mode === relay.genderMode) ? relay.genderMode : "";
        const eventChanged = changedField === "event" && previousRelay.eventCode && previousRelay.eventCode !== relay.eventCode;
        if (eventChanged) {
          return {
            ...relay,
            category,
            genderMode,
            manualEntryTime: "",
            memberIds: Array.from({ length: moduleActions.engagementRelayLegCount(event) }, () => ""),
            draftNotice: "Épreuve modifiée : vérifiez le temps et les relayeurs."
          };
        }
        const competitionDate = portalState.selectedEngagementCompetition?.date || "";
        const swimmers = new Map(moduleActions.engagementClubRelaySwimmerOptions().map((swimmer) => [swimmer.swimmerIndexId, swimmer]));
        const memberIds = Array.from({ length: moduleActions.engagementRelayLegCount(event) }, (_, memberIndex) => {
          const swimmerId = Array.isArray(relay.memberIds) ? relay.memberIds[memberIndex] || "" : "";
          const swimmer = swimmers.get(swimmerId);
          const expectedSex = moduleActions.engagementRelayExpectedMemberSex(genderMode, memberIndex);
          if (!swimmer || !category || !genderMode) return "";
          if (expectedSex && swimmer.sex !== expectedSex) return "";
          return moduleActions.engagementRelaySwimmerAllowedForCategory(swimmer, category, competitionDate) ? swimmerId : "";
        });
        return {
          ...relay,
          category,
          genderMode,
          memberIds
        };
      }

    function focusEngagementClubRelayControl(relayId = "", selector = "", memberIndex = -1) {
        global.requestAnimationFrame?.(() => {
          const row = Array.from(portalContext.elements.engagementsClubRelaysList?.querySelectorAll("[data-engagement-club-relay-row]") || [])
            .find((item) => item.dataset.engagementClubRelayId === relayId);
          if (!row) return;
          const controls = selector ? Array.from(row.querySelectorAll(selector)) : [];
          const control = memberIndex >= 0 ? controls[memberIndex] : controls[0];
          control?.focus?.();
          row.scrollIntoView?.({ block: "nearest" });
        });
      }

    function engagementClubRelayDialogRelay() {
        return portalState.engagementClubRelayDialogDraft;
      }

    function readEngagementClubRelayDialogDraft() {
        const relay = moduleActions.engagementClubRelayDialogRelay();
        if (!relay) return null;
        return {
          ...relay,
          eventCode: portalContext.elements.engagementsClubRelayDialogEvent?.value || "",
          category: portalContext.elements.engagementsClubRelayDialogCategory?.value || "",
          genderMode: portalContext.elements.engagementsClubRelayDialogGender?.value || "",
          manualEntryTime: portalContext.elements.engagementsClubRelayDialogTime?.value || "",
          memberIds: Array.from(portalContext.elements.engagementsClubRelayDialogList?.querySelectorAll("[data-engagement-club-relay-dialog-member]") || [])
            .map((select) => select.value || "")
        };
      }

    function syncEngagementClubRelayDialogMemberOptions() {
        const selects = Array.from(portalContext.elements.engagementsClubRelayDialogList?.querySelectorAll("[data-engagement-club-relay-dialog-member]") || []);
        const selectedIds = selects.map((select) => select.value).filter(Boolean);
        selects.forEach((select) => {
          Array.from(select.options).forEach((option) => {
            if (!option.value) return;
            const selectedElsewhere = option.value !== select.value && selectedIds.includes(option.value);
            option.hidden = selectedElsewhere;
            option.disabled = selectedElsewhere;
          });
        });
      }

    function renderEngagementClubRelayDialog() {
        const relay = moduleActions.engagementClubRelayDialogRelay();
        const mount = portalContext.elements.engagementsClubRelayDialogList;
        if (!relay || !mount) return;
        const membersWereOpen = portalContext.elements.engagementsClubRelayDialogMembers?.open === true;
        const relayEvents = moduleActions.engagementClubRelayEvents();
        const event = relayEvents.find((candidate) => candidate.code === relay.eventCode) || {};
        const relayIndex = portalState.engagementClubRelaysDraft.findIndex((candidate) => candidate.relayId === relay.relayId);
        const memberIds = Array.isArray(relay.memberIds) ? relay.memberIds : [];
        const dialogRelayIndex = relayIndex >= 0 ? relayIndex : portalState.engagementClubRelaysDraft.length;
        const relaysWithDialogDraft = relayIndex >= 0
          ? portalState.engagementClubRelaysDraft.map((candidate, candidateIndex) => candidateIndex === relayIndex ? relay : candidate)
          : [...portalState.engagementClubRelaysDraft, relay];
        const relaysWithoutCurrentMembers = relaysWithDialogDraft.map((candidate, candidateIndex) => candidateIndex === dialogRelayIndex
          ? { ...candidate, memberIds: [] }
          : candidate);
        const relayLegs = moduleActions.engagementRelayLegCount(event);
        const competitionDate = portalState.selectedEngagementCompetition?.date || "";
        const swimmerOptions = moduleActions.engagementClubRelaySwimmerOptions();
        const sessionLabel = moduleActions.engagementClubRelaySessionLabel(relay.eventCode, relay.genderMode);
        const peopleWording = moduleActions.engagementRelayPeopleWording(relay.genderMode);
        const categories = moduleActions.engagementRelayCategoryOptions(event);
        const genderOptions = moduleActions.engagementRelayGenderOptions(event, relay.category);
        const selectedMemberCount = memberIds.filter(Boolean).length;
        if (portalContext.elements.engagementsClubRelayDialogTitle) {
          portalContext.elements.engagementsClubRelayDialogTitle.textContent = relay.persisted ? "Modifier le relais" : "Nouveau relais";
        }
        if (portalContext.elements.engagementsClubRelayDialogMeta) {
          portalContext.elements.engagementsClubRelayDialogMeta.textContent = sessionLabel || "Renseignez les informations puis validez.";
        }
        if (portalContext.elements.engagementsClubRelayDialogEvent) {
          portalContext.elements.engagementsClubRelayDialogEvent.innerHTML = `
        <option value="" ${event.code ? "" : "selected"} disabled>Choisir</option>
        ${relayEvents.map((option) => `<option value="${portalActions.escapeHtml(option.code)}" ${option.code === event.code ? "selected" : ""}>${portalActions.escapeHtml(option.shortLabel || option.code)}</option>`).join("")}
      `;
          portalContext.elements.engagementsClubRelayDialogEvent.disabled = portalState.engagementClubRelayDialogSaving;
        }
        if (portalContext.elements.engagementsClubRelayDialogCategory) {
          portalContext.elements.engagementsClubRelayDialogCategory.innerHTML = `
        <option value="" ${relay.category ? "" : "selected"} disabled>Choisir</option>
        ${categories.map(([code, label]) => `<option value="${portalActions.escapeHtml(code)}" ${code === relay.category ? "selected" : ""}>${portalActions.escapeHtml(label)}</option>`).join("")}
      `;
          portalContext.elements.engagementsClubRelayDialogCategory.disabled = portalState.engagementClubRelayDialogSaving || !event.code;
        }
        if (portalContext.elements.engagementsClubRelayDialogGender) {
          portalContext.elements.engagementsClubRelayDialogGender.innerHTML = `
        <option value="" ${relay.genderMode ? "" : "selected"} disabled>Choisir</option>
        ${genderOptions.map(([mode, label]) => `<option value="${portalActions.escapeHtml(mode)}" ${mode === relay.genderMode ? "selected" : ""}>${portalActions.escapeHtml(label)}</option>`).join("")}
      `;
          portalContext.elements.engagementsClubRelayDialogGender.dataset.gender = relay.genderMode || "";
          portalContext.elements.engagementsClubRelayDialogGender.disabled = portalState.engagementClubRelayDialogSaving || !relay.category || genderOptions.length === 1;
        }
        if (portalContext.elements.engagementsClubRelayDialogTime) {
          const openWater = portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater";
          const timeField = portalContext.elements.engagementsClubRelayDialogTime.closest("[data-engagements-relay-time-field]");
          if (timeField) timeField.hidden = openWater;
          portalContext.elements.engagementsClubRelayDialogTime.required = !openWater;
          portalContext.elements.engagementsClubRelayDialogTime.value = portalActions.formatEngagementEntryTimeInput(relay.manualEntryTime || "") || relay.manualEntryTime || "";
          portalContext.elements.engagementsClubRelayDialogTime.disabled = portalState.engagementClubRelayDialogSaving;
        }
        if (portalContext.elements.engagementsClubRelayDialogMembersSummary) {
          portalContext.elements.engagementsClubRelayDialogMembersSummary.textContent = selectedMemberCount
            ? `Participants · ${selectedMemberCount}/${relayLegs}`
            : `Choisir les ${peopleWording.plural}`;
        }
        if (portalContext.elements.engagementsClubRelayDialogMembersHelp) {
          portalContext.elements.engagementsClubRelayDialogMembersHelp.textContent = event.code && relay.category && relay.genderMode
            ? `Sélectionnez les ${relayLegs} ${peopleWording.plural}, ou laissez la composition vide.`
            : "Choisissez d'abord la distance, la catégorie et le sexe.";
        }
        mount.innerHTML = event.code && relay.category && relay.genderMode ? `
      <div class="admin-engagements-club-relay-dialog-grid">
        ${Array.from({ length: relayLegs }, (_, memberIndex) => {
              const expectedSex = moduleActions.engagementRelayExpectedMemberSex(relay.genderMode, memberIndex);
              const currentMemberId = memberIds[memberIndex] || "";
              const options = swimmerOptions.filter((swimmer) => {
                if (expectedSex && swimmer.sex !== expectedSex) return false;
                if (!moduleActions.engagementRelaySwimmerAllowedForCategory(swimmer, relay.category, competitionDate)) return false;
                return !moduleActions.engagementRelayMemberAlreadyUsed(swimmer.swimmerIndexId, relaysWithoutCurrentMembers, dialogRelayIndex, memberIndex, event);
              });
              const label = moduleActions.engagementRelayLegPlaceholder(relay.genderMode, memberIndex);
              const choiceLabel = moduleActions.engagementRelayLegChoiceLabel(relay.genderMode, memberIndex);
              return `
            <label data-expected-sex="${portalActions.escapeHtml(expectedSex)}">
              <span aria-hidden="true">${memberIndex + 1}</span>
              <select data-engagement-club-relay-dialog-member aria-label="${portalActions.escapeHtml(label)}" ${portalState.engagementClubRelayDialogSaving ? "disabled" : ""}>
                <option value="">${portalActions.escapeHtml(choiceLabel)}</option>
                ${options.map((swimmer) => `<option value="${portalActions.escapeHtml(swimmer.swimmerIndexId)}" ${currentMemberId === swimmer.swimmerIndexId ? "selected" : ""}>${portalActions.escapeHtml(moduleActions.engagementRelayMemberOptionLabel(swimmer, competitionDate))}</option>`).join("")}
              </select>
            </label>
          `;
            }).join("")}
      </div>
    ` : "";
        if (portalContext.elements.engagementsClubRelayDialogMembers) {
          portalContext.elements.engagementsClubRelayDialogMembers.open = membersWereOpen;
          portalContext.elements.engagementsClubRelayDialogMembers.classList.toggle("is-unavailable", !event.code || !relay.category || !relay.genderMode);
        }
        moduleActions.syncEngagementClubRelayDialogMemberOptions();
        if (portalContext.elements.engagementsClubRelayDialogApply) {
          portalContext.elements.engagementsClubRelayDialogApply.textContent = portalState.engagementClubRelayDialogSaving ? "Enregistrement..." : "Valider le relais";
          portalContext.elements.engagementsClubRelayDialogApply.disabled = portalState.engagementClubRelayDialogSaving;
        }
        if (portalContext.elements.engagementsClubRelayDialogReset) portalContext.elements.engagementsClubRelayDialogReset.disabled = portalState.engagementClubRelayDialogSaving;
        if (portalContext.elements.engagementsClubRelayDialogCancel) portalContext.elements.engagementsClubRelayDialogCancel.disabled = portalState.engagementClubRelayDialogSaving;
        if (portalContext.elements.engagementsClubRelayDialogClose) portalContext.elements.engagementsClubRelayDialogClose.disabled = portalState.engagementClubRelayDialogSaving;
      }

    function openEngagementClubRelayDialog(relayId = "", opener = null) {
        portalState.engagementClubRelaysDraft = moduleActions.selectedEngagementClubRelayRowsFromDom();
        const savedRelay = relayId ? portalState.engagementClubRelaysDraft.find((candidate) => candidate.relayId === relayId) : null;
        if (relayId && !savedRelay) return;
        const relay = savedRelay
          ? {
              ...savedRelay,
              memberIds: Array.isArray(savedRelay.memberIds)
                ? [...savedRelay.memberIds]
                : (savedRelay.members || []).map((member) => member.swimmerIndexId).filter(Boolean)
            }
          : {
              relayId: `relay-${Date.now()}`,
              eventCode: "",
              category: "",
              genderMode: "",
              manualEntryTime: "",
              memberIds: [],
              persisted: false
            };
        portalState.engagementClubRelayDialogRelayId = relayId;
        portalState.engagementClubRelayDialogDraft = relay;
        portalState.engagementClubRelayDialogOpener = opener;
        portalState.engagementClubRelayDialogSaving = false;
        if (portalContext.elements.engagementsClubRelayDialogMessage) {
          portalContext.elements.engagementsClubRelayDialogMessage.textContent = "";
          portalContext.elements.engagementsClubRelayDialogMessage.dataset.tone = "";
        }
        moduleActions.renderEngagementClubRelayDialog();
        if (portalContext.elements.engagementsClubRelayDialog && !portalContext.elements.engagementsClubRelayDialog.open) {
          portalContext.elements.engagementsClubRelayDialog.showModal();
        }
        global.requestAnimationFrame?.(() => portalContext.elements.engagementsClubRelayDialogEvent?.focus?.());
      }

    function closeEngagementClubRelayDialog(restoreFocus = true) {
        if (portalState.engagementClubRelayDialogSaving) return;
        if (portalContext.elements.engagementsClubRelayDialog?.open) portalContext.elements.engagementsClubRelayDialog.close();
        const opener = portalState.engagementClubRelayDialogOpener;
        portalState.engagementClubRelayDialogRelayId = "";
        portalState.engagementClubRelayDialogDraft = null;
        portalState.engagementClubRelayDialogOpener = null;
        if (restoreFocus) opener?.focus?.();
      }

    function resetEngagementClubRelayDialogMembers() {
        if (portalState.engagementClubRelayDialogSaving) return;
        Array.from(portalContext.elements.engagementsClubRelayDialogList?.querySelectorAll("[data-engagement-club-relay-dialog-member]") || [])
          .forEach((select) => { select.value = ""; });
        moduleActions.syncEngagementClubRelayDialogMemberOptions();
        portalState.engagementClubRelayDialogDraft = moduleActions.readEngagementClubRelayDialogDraft();
        if (portalContext.elements.engagementsClubRelayDialogMembersSummary) {
          portalContext.elements.engagementsClubRelayDialogMembersSummary.textContent = `Choisir les ${moduleActions.engagementRelayPeopleWording(portalState.engagementClubRelayDialogDraft?.genderMode).plural}`;
        }
        if (portalContext.elements.engagementsClubRelayDialogMessage) {
          portalContext.elements.engagementsClubRelayDialogMessage.textContent = "Sélection des participants réinitialisée.";
          portalContext.elements.engagementsClubRelayDialogMessage.dataset.tone = "";
        }
        portalContext.elements.engagementsClubRelayDialogList?.querySelector("[data-engagement-club-relay-dialog-member]")?.focus?.();
      }

    function engagementClosureAutomationStatusLabel(status) {
        return {
          processing: "En cours",
          completed: "Terminée",
          completed_with_errors: "Terminée avec erreurs",
          failed: "Erreur"
        }[String(status || "")] || "En attente";
      }

    function engagementClosureAutomationStatusTone(status) {
        return {
          processing: "processing",
          completed: "sent",
          completed_with_errors: "warning",
          failed: "failed"
        }[String(status || "")] || "pending";
      }
    return { setEngagementClubSwimmerActivityStatus, requestEngagementClubSwimmerDeletion, loadEngagementClubEntryTimeHistory, openEngagementClubTimesDialog, applyEngagementClubRelayDialog , engagementClubTimesDialogEventCodes, engagementClubEntryTimeHistoryLabel, populateEngagementClubEntryTimeHistory, renderEngagementClubTimesDialog, focusFirstIncompleteEngagementClubRelay, selectedEngagementClubRelayRowsFromElement , renderEngagementClubSwimmersDirectory, engagementClubTimesDialogSwimmer, updateEngagementClubTimeDialogHelp, closeEngagementClubTimesDialog, applyEngagementClubTimesDialog, engagementRelayLegPlaceholder, engagementRelayLegChoiceLabel, engagementRelayExpectedMemberSex, engagementRelayMemberOptionLabel, engagementRelaySameDistanceNature, engagementRelayMemberAlreadyUsed, reconcileEngagementClubRelayDraft, focusEngagementClubRelayControl, engagementClubRelayDialogRelay, readEngagementClubRelayDialogDraft, syncEngagementClubRelayDialogMemberOptions, renderEngagementClubRelayDialog, openEngagementClubRelayDialog, closeEngagementClubRelayDialog, resetEngagementClubRelayDialogMembers, engagementClosureAutomationStatusLabel, engagementClosureAutomationStatusTone };
  });
})(window);
