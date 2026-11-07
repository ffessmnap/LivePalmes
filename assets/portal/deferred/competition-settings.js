(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("competition-settings", function create(portalContext, moduleActions) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function confirmQualificationException(box, row) {
        if (!moduleActions.qualificationExceptionsEnabled()) return false;
        const scope = moduleActions.qualificationExceptionContext();
        const competitionId = portalState.selectedEngagementCompetitionId;
        const swimmerId = row.dataset.engagementClubEntrySwimmerId;
        const eventCode = box.dataset.engagementClubSwimmerEvent;
        if (!global.confirm(`Confirmer l’exception pour ${eventCode} ?\n${box.title}\n\nCette autorisation du National concerne uniquement cette course. Elle ne qualifie pas le nageur pour des bonus ou un relais.`)) return false;
        box.disabled = true;
        try {
          await portalActions.flushEngagementClubIndividualEntriesAutosave();
          await portalState.engagementClubEntryMutationQueue;
          if (scope !== moduleActions.qualificationExceptionContext() || !moduleActions.qualificationExceptionsEnabled()) return false;
          if (row.isConnected === false) return false;
          const result = await portalActions.callFunction("grantEngagementQualificationException", { competitionId, swimmerIndexId: swimmerId, eventCode, confirmed: true });
          if (scope !== moduleActions.qualificationExceptionContext() || !moduleActions.qualificationExceptionsEnabled()) return false;
          if (row.isConnected === false) return false;
          portalState.selectedEngagementCompetition.hasQualificationGrants = true;
          const swimmer = portalActions.selectedEngagementClubSwimmerRows().find((item) => item.swimmerIndexId === swimmerId);
          const key = portalActions.engagementClubSwimmerEventTimesCacheKey(swimmer || { swimmerIndexId: swimmerId });
          const previews = portalConfig.engagementClubSwimmerEventTimesCache.get(key) || [];
          const previous = previews.find((item) => item.eventCode === eventCode) || { eventCode };
          portalConfig.engagementClubSwimmerEventTimesCache.set(key, [...previews.filter((item) => item.eventCode !== eventCode), { ...previous, qualification: result.qualification }]);
          box.dataset.qualificationApproved = "true";
          box.dataset.qualificationExceptionRequired = "false";
          return true;
        } catch (error) {
          if (scope === moduleActions.qualificationExceptionContext() && portalContext.elements.engagementsClubEntriesMessage) portalContext.elements.engagementsClubEntriesMessage.textContent = error.message;
          return false;
        } finally { box.disabled = false; }
      }

    async function finishQualificationJob(jobId) {
        let result = { state: "preview" }; const removed = [];
        while (["preview", "apply"].includes(result.state)) {
          try {
            result = await portalActions.callFunction("processEngagementQualificationJob", { competitionId: portalState.selectedEngagementCompetition.id, jobId });
          } catch (error) {
            if (error.details?.qualificationJobCancelled && portalState.selectedEngagementCompetition?.qualificationJobId === jobId) portalState.selectedEngagementCompetition.qualificationJobId = "";
            moduleActions.renderQualificationJobActions();
            throw error;
          }
          removed.push(...(result.removed || []));
          if (portalContext.elements.engagementsDetailStatus) portalContext.elements.engagementsDetailStatus.textContent = `${result.state === "apply" ? "Application" : "Contrôle"} des qualifications : ${result.count || 0} engagement(s) concerné(s).`;
          if (result.state === "ready") {
            removed.length = 0;
            let cursor = "";
            do {
              const page = await portalActions.callFunction("processEngagementQualificationJob", { competitionId: portalState.selectedEngagementCompetition.id, jobId, action: "details", cursor });
              removed.push(...(page.removed || [])); cursor = page.cursor || "";
            } while (cursor);
            const details = removed.map((item) => `${item.club || ""} · ${item.name || item.swimmerIndexId || "Relais"} · ${item.eventCode}`).join("\n");
            if (!global.confirm(`Enregistrer les règles de qualification ?\n${result.count || 0} engagement(s) seront supprimés. Avec une grille active, les temps individuels seront recalculés automatiquement. Les performances historiques seront conservées.\n\n${details}`)) {
              if (result.applyStarted) throw new Error("Application partiellement effectuée. Reprenez le contrôle pour confirmer les changements restants.");
              await portalActions.callFunction("processEngagementQualificationJob", { competitionId: portalState.selectedEngagementCompetition.id, jobId, action: "cancel" });
              portalState.selectedEngagementCompetition.qualificationJobId = "";
              moduleActions.renderQualificationJobActions();
              throw new Error("Modification des qualifications annulée.");
            }
            result = await portalActions.callFunction("processEngagementQualificationJob", { competitionId: portalState.selectedEngagementCompetition.id, jobId, action: "confirm" });
          }
        }
        if (result.state !== "done") throw new Error("Contrôle interrompu. Reprenez-le depuis la fiche compétition.");
        portalConfig.engagementClubSwimmerEventTimesCache.clear();
        return portalActions.callFunction("getEngagementCompetition", { competitionId: portalState.selectedEngagementCompetition.id });
      }

    async function updateCompetitionWithQualifications(payload) {
        const pendingMessage = "Utilisez Reprendre le contrôle ou Annuler le contrôle dans le bandeau en haut de la fiche avant d’enregistrer.";
        if (portalState.selectedEngagementCompetition?.qualificationJobId) {
          moduleActions.renderQualificationJobActions();
          document.querySelector("#adminQualificationJobActions")?.scrollIntoView({ block: "center", behavior: "smooth" });
          throw new Error(pendingMessage);
        }
        if (portalActions.canUse("engagements.national.manage") && portalState.qualificationEditor && portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "pool") payload.qualifications = portalState.qualificationEditor.read();
        let result;
        try {
          result = await portalActions.callFunction("updateEngagementCompetition", payload);
        } catch (error) {
          // Refresh only after a lock conflict: no extra reads on normal saves, and
          // no form re-render that would discard the user's current draft.
          if (/contrôle.*(?:déjà|en cours)/i.test(error.message || "")) {
            const latest = await portalActions.callFunction("getEngagementCompetition", { competitionId: payload.competitionId || portalState.selectedEngagementCompetition.id });
            portalState.selectedEngagementCompetition.qualificationJobId = latest.competition?.qualificationJobId || "";
            moduleActions.renderQualificationJobActions();
            if (portalState.selectedEngagementCompetition.qualificationJobId) {
              document.querySelector("#adminQualificationJobActions")?.scrollIntoView({ block: "center", behavior: "smooth" });
              throw new Error(pendingMessage);
            }
          }
          throw error;
        }
        if (!result.qualificationJobId) return result;
        portalState.selectedEngagementCompetition.qualificationJobId = result.qualificationJobId;
        moduleActions.renderQualificationJobActions();
        return moduleActions.finishQualificationJob(result.qualificationJobId);
      }

    function engagementCalendarScopeKey(mode = portalActions.engagementNavigationMode()) {
        if (mode === "admin") {
          return portalActions.canUse("engagements.national.manage")
            ? "national"
            : `region:${portalActions.engagementRegionScope(portalState.currentAccessProfile || {}) || "none"}`;
        }
        const profile = portalActions.activeEngagementClubProfile(portalState.currentAccessProfile || {});
        return `club:${portalActions.engagementClubScope(profile) || "none"}`;
      }

    function engagementCalendarCacheKey(mode, requestedRange) {
        const uid = portalState.currentAccessProfile?.uid || portalState.activeAuthUid || global.firebase?.auth?.().currentUser?.uid || "anonymous";
        return [uid, mode, moduleActions.engagementCalendarScopeKey(mode), requestedRange]
          .map((part) => encodeURIComponent(String(part || "")))
          .join(".");
      }

    function readEngagementCalendarCache(cacheKey) {
        const memoryEntry = portalConfig.engagementCompetitionCalendarMemoryCache.get(cacheKey);
        if (memoryEntry) return memoryEntry;
        try {
          const stored = JSON.parse(global.sessionStorage?.getItem(`${portalConfig.ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX}${cacheKey}`) || "null");
          if (!stored || stored.version !== 3 || !Array.isArray(stored.competitions) || !Number(stored.cachedAt)) return null;
          const entry = {
            competitions: stored.competitions.map(moduleActions.engagementCalendarCacheCompetition).filter((competition) => competition.id),
            source: stored.source === "nap" ? "nap" : "",
            cachedAt: Number(stored.cachedAt)
          };
          portalConfig.engagementCompetitionCalendarMemoryCache.set(cacheKey, entry);
          return entry;
        } catch (_) {
          return null;
        }
      }

    function activateEngagementCalendarCache(cacheKey, requestedRange, entry) {
        portalState.engagementCompetitions = entry.competitions.map((competition) => ({ ...competition }));
        portalState.engagementCompetitionsLoaded = true;
        portalState.engagementCompetitionsLoadedRange = requestedRange;
        portalState.engagementCompetitionsLoadedCacheKey = cacheKey;
        portalState.engagementCompetitionsCachedAt = entry.cachedAt;
        portalActions.renderEngagementCompetitions();
      }

    function openInvitedRegionsDialog() {
        if (!portalContext.elements.engagementsInvitedRegionDialog || !portalContext.elements.engagementsInvitedRegionIds) return;
        portalState.invitedRegionsBeforeDialog = portalActions.selectedRegionMultiSelectValues(portalContext.elements.engagementsInvitedRegionIds);
        portalActions.renderInvitedRegionChoices(portalContext.elements.engagementsInvitedRegionIds, portalContext.elements.engagementsInvitedRegionChoices);
        portalContext.elements.engagementsInvitedRegionDialog.showModal();
      }

    function closeInvitedRegionsDialog() {
        if (portalContext.elements.engagementsInvitedRegionDialog?.returnValue === "confirm") {
          portalActions.renderInvitedRegionChoices(portalContext.elements.engagementsInvitedRegionIds, portalContext.elements.engagementsInvitedRegionChoices);
          return;
        }
        portalActions.setRegionMultiSelectValues(portalContext.elements.engagementsInvitedRegionIds, portalState.invitedRegionsBeforeDialog, portalContext.elements.engagementsRegionId?.value || "");
        portalActions.renderInvitedRegionChoices(portalContext.elements.engagementsInvitedRegionIds, portalContext.elements.engagementsInvitedRegionChoices);
      }

    function engagementKnownIndividualTimesSelectable(competition = portalState.selectedEngagementCompetition || {}) {
        return !competition.qualifications?.enabled && (moduleActions.engagementManualIndividualTimesAllowed(competition) || (competition.napSource === true && Number(competition.nativeParameters?.saisie) === 0));
      }

    function setSelectedEngagementCompetitionClubEntryExists(entryExists) {
        if (!portalState.selectedEngagementCompetitionId) return;
        const nextValue = entryExists === true;
        portalState.selectedEngagementCompetition = {
          ...(portalState.selectedEngagementCompetition || {}),
          clubEntryExists: nextValue
        };
        portalState.engagementCompetitions = portalState.engagementCompetitions.map((competition) => competition.id === portalState.selectedEngagementCompetitionId
          ? { ...competition, clubEntryExists: nextValue }
          : competition);
        moduleActions.persistActiveEngagementCalendarCache();
      }

    function selectedCreateEngagementFeesFromForm() {
        const enabled = portalContext.elements.engagementsCreateFeesEnabled?.value === "true";
        return {
          enabled,
          swimmerFee: enabled ? moduleActions.engagementFeeAmount(portalContext.elements.engagementsCreateSwimmerFee?.value) : 0,
          individualEventFee: enabled ? moduleActions.engagementFeeAmount(portalContext.elements.engagementsCreateIndividualEventFee?.value) : 0,
          relayFee: enabled ? moduleActions.engagementFeeAmount(portalContext.elements.engagementsCreateRelayFee?.value) : 0,
          helloAssoUrl: enabled ? String(portalContext.elements.engagementsCreateHelloAssoUrl?.value || "").trim() : "",
          latePaymentSurcharge: 50
        };
      }

    function updateCreateEngagementFeesMode() {
        const enabled = portalContext.elements.engagementsCreateFeesEnabled?.value === "true";
        if (portalContext.elements.engagementsCreateFeesGrid) portalContext.elements.engagementsCreateFeesGrid.hidden = !enabled;
      }

    function resetEngagementCalendarFilters() {
        if (portalContext.elements.engagementsSeasonFilter) {
          portalContext.elements.engagementsSeasonFilter.value = String(portalActions.currentEngagementSeasonStartYear());
        }
        portalActions.setRegionSelectValue(portalContext.elements.engagementsRegionFilter, "");
        if (portalContext.elements.engagementsLevelFilter) portalContext.elements.engagementsLevelFilter.value = "";
        if (portalContext.elements.engagementsTypeFilter) portalContext.elements.engagementsTypeFilter.value = "";
        if (portalContext.elements.engagementsStatusFilter) portalContext.elements.engagementsStatusFilter.value = "";
        if (portalContext.elements.engagementsMineFilter) portalContext.elements.engagementsMineFilter.checked = false;
        portalState.engagementCompetitionsVisibleLimit = 24;
        portalState.engagementPastCompetitionsVisibleLimit = 24;
        portalState.engagementPastCompetitionsExpanded = false;
        portalActions.syncEngagementStatusSegments();
      }

    function engagementCalendarRequestedRange(filters = {}, date = new Date()) {
        const preview = moduleActions.engagementCalendarSeptemberPreview(filters, date);
        return [filters.startDate, filters.endDate, preview?.startDate, preview?.endDate]
          .filter(Boolean)
          .join("|");
      }

    function engagementCalendarCacheCompetition(competition = {}) {
        return {
          id: String(competition.id || ""),
          napSource: competition.napSource === true,
          nativeReadOnly: competition.nativeReadOnly === true,
          nativeTeamLeaderEditable: competition.nativeTeamLeaderEditable === true,
          nativeTeamLeaderRequired: competition.nativeTeamLeaderRequired === true,
          legacyCompetitionId: String(competition.legacyCompetitionId || ""),
          sourceType: competition.sourceType === "calendarEvent" ? "calendarEvent" : "competition",
          eventType: String(competition.eventType || ""),
          name: String(competition.name || ""),
          date: String(competition.date || ""),
          endDate: String(competition.endDate || competition.date || ""),
          location: String(competition.location || ""),
          city: String(competition.city || ""),
          address: String(competition.address || ""),
          organizerEmail: String(competition.organizerEmail || ""),
          teamLeadersWhatsAppUrl: moduleActions.engagementTeamLeadersWhatsAppUrl(competition.teamLeadersWhatsAppUrl),
          regionId: String(competition.regionId || ""),
          invitedRegionIds: Array.isArray(competition.invitedRegionIds) ? competition.invitedRegionIds.map(String) : [],
          level: String(competition.level || ""),
          competitionType: portalActions.engagementCompetitionType(competition),
          waterBodyType: String(competition.waterBodyType || ""),
          entryDeadlineAt: String(competition.entryDeadlineAt || ""),
          entryStatus: String(competition.entryStatus || ""),
          entryStatusKnown: competition.entryStatusKnown,
          deadlineWarning: String(competition.deadlineWarning || ""),
          resultsPublishedAt: String(competition.resultsPublishedAt || ""),
          resultsUrl: String(competition.resultsUrl || competition.results?.url || ""),
          resultsPdfUrl: String(competition.resultsPdfUrl || competition.results?.pdfUrl || ""),
          publicationStatus: String(competition.publicationStatus || "draft"),
          canceled: competition.canceled === true,
          documentCount: Math.max(0, Number(competition.documentCount) || 0),
          clubEntryExists: competition.clubEntryExists === true,
          updatedAt: String(competition.updatedAt || "")
        };
      }

    function writeEngagementCalendarCache(cacheKey, competitions = [], cachedAt = Date.now(), source = "") {
        const entry = {
          competitions: competitions.map(moduleActions.engagementCalendarCacheCompetition).filter((competition) => competition.id),
          source,
          cachedAt,
          loadedInPage: portalConfig.engagementCompetitionCalendarMemoryCache.get(cacheKey)?.loadedInPage === true
        };
        portalConfig.engagementCompetitionCalendarMemoryCache.set(cacheKey, entry);
        try {
          global.sessionStorage?.setItem(`${portalConfig.ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX}${cacheKey}`, JSON.stringify({
            version: 3,
            source,
            cachedAt,
            competitions: entry.competitions
          }));
        } catch (_) {
          // Le cache reste facultatif si le stockage de session est indisponible.
        }
        return entry;
      }

    function persistActiveEngagementCalendarCache() {
        if (!portalState.engagementCompetitionsLoadedCacheKey || !portalState.engagementCompetitionsLoadedRange) return;
        const entry = moduleActions.writeEngagementCalendarCache(portalState.engagementCompetitionsLoadedCacheKey, portalState.engagementCompetitions);
        portalState.engagementCompetitionsCachedAt = entry.cachedAt;
      }

    function upsertEngagementCalendarItemFromServer(item = {}, sourceType = "competition") {
        if (!item?.id) return;
        const cachedItem = moduleActions.engagementCalendarCacheCompetition({ ...item, sourceType });
        const index = portalState.engagementCompetitions.findIndex((competition) => (
          competition.id === cachedItem.id
          && (competition.sourceType || "competition") === cachedItem.sourceType
        ));
        if (index >= 0) portalState.engagementCompetitions[index] = { ...portalState.engagementCompetitions[index], ...cachedItem };
        else portalState.engagementCompetitions.push(cachedItem);
        moduleActions.persistActiveEngagementCalendarCache();
        portalActions.renderEngagementCompetitions();
      }

    function removeEngagementCalendarItemFromCache(itemId, sourceType = "calendarEvent") {
        const cleanId = String(itemId || "");
        if (!cleanId) return;
        portalState.engagementCompetitions = portalState.engagementCompetitions.filter((competition) => !(
          competition.id === cleanId
          && (competition.sourceType || "competition") === sourceType
        ));
        moduleActions.persistActiveEngagementCalendarCache();
        portalActions.renderEngagementCompetitions();
      }

    function invalidateEngagementCalendarCaches() {
        portalState.engagementCalendarCacheRevision += 1;
        portalConfig.engagementCompetitionCalendarMemoryCache.clear();
        portalConfig.engagementCompetitionCalendarRequests.clear();
        try {
          const keys = [];
          for (let index = 0; index < (global.sessionStorage?.length || 0); index += 1) {
            const key = global.sessionStorage?.key(index) || "";
            if (key.startsWith(portalConfig.ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX)) keys.push(key);
          }
          keys.forEach((key) => global.sessionStorage?.removeItem(key));
        } catch (_) {}
        portalState.engagementCompetitionsLoaded = false;
        portalState.engagementCompetitionsLoadedRange = "";
        portalState.engagementCompetitionsLoadedCacheKey = "";
        portalState.engagementCompetitionsCachedAt = 0;
      }

    function updateEngagementInvitedRegionField({ field, levelInput, primaryRegionField }) {
        if (!field) return;
        const nationalCompetition = ["national", "international"].includes(levelInput?.value || "regional");
        const container = field.closest("[data-engagements-conditional-region]");
        if (container) container.hidden = nationalCompetition;
        field.disabled = nationalCompetition || !portalActions.canCreateEngagementCompetition();
        const primaryRegion = primaryRegionField?.value || "";
        Array.from(field.options).forEach((option) => {
          const sameAsPrimary = portalActions.normalizedRegionKey(option.value) === portalActions.normalizedRegionKey(primaryRegion);
          option.disabled = sameAsPrimary;
          if (sameAsPrimary) option.selected = false;
        });
        if (nationalCompetition) {
          Array.from(field.options).forEach((option) => {
            option.selected = false;
          });
        }
        portalActions.renderInvitedRegionChoices(field, field === portalContext.elements.engagementsEditInvitedRegionIds
          ? portalContext.elements.engagementsEditInvitedRegionChoices
          : portalContext.elements.engagementsInvitedRegionChoices);
        if (field === portalContext.elements.engagementsInvitedRegionIds && portalContext.elements.engagementsInvitedRegionDialogOpen) {
          portalContext.elements.engagementsInvitedRegionDialogOpen.disabled = field.disabled;
        }
      }

    function updateEngagementEditFormAccess(user = portalState.currentAccessProfile || {}) {
        const capabilities = new Set(user.capabilities || []);
        const isNational = capabilities.has("engagements.national.manage");
        moduleActions.updateEngagementRegionField({
          field: portalContext.elements.engagementsEditRegionId,
          note: portalContext.elements.engagementsEditRegionNote,
          levelInput: portalContext.elements.engagementsEditLevel,
          user,
          submitButton: portalContext.elements.engagementsEditForm?.querySelector("button[type='submit']")
        });
        moduleActions.updateEngagementInvitedRegionField({
          field: portalContext.elements.engagementsEditInvitedRegionIds,
          levelInput: portalContext.elements.engagementsEditLevel,
          primaryRegionField: portalContext.elements.engagementsEditRegionId
        });
        const nationalOption = portalContext.elements.engagementsEditLevel?.querySelector("option[value='national']");
        if (nationalOption) nationalOption.disabled = !isNational;
        const internationalOption = portalContext.elements.engagementsEditLevel?.querySelector("option[value='international']");
        if (internationalOption) internationalOption.disabled = !isNational;
        const closedStatusOption = portalContext.elements.engagementsEditEntryStatus?.querySelector("option[value='closed']");
        if (closedStatusOption) closedStatusOption.disabled = true;
        if (portalContext.elements.engagementsEditEntryStatus) {
          portalContext.elements.engagementsEditEntryStatus.disabled = !isNational && portalContext.elements.engagementsEditEntryStatus.value === "closed";
        }
        const whatsAppAllowed = isNational && ["national", "international"].includes(portalContext.elements.engagementsEditLevel?.value || "");
        if (portalContext.elements.engagementsEditWhatsAppLabel) portalContext.elements.engagementsEditWhatsAppLabel.hidden = !whatsAppAllowed;
        if (portalContext.elements.engagementsEditWhatsAppUrl) {
          portalContext.elements.engagementsEditWhatsAppUrl.disabled = !whatsAppAllowed;
          if (!whatsAppAllowed) portalContext.elements.engagementsEditWhatsAppUrl.value = "";
        }
        if (!isNational && ["national", "international"].includes(portalContext.elements.engagementsEditLevel?.value)) {
          portalContext.elements.engagementsEditLevel.value = "regional";
          moduleActions.updateEngagementRegionField({
            field: portalContext.elements.engagementsEditRegionId,
            note: portalContext.elements.engagementsEditRegionNote,
            levelInput: portalContext.elements.engagementsEditLevel,
            user,
            submitButton: portalContext.elements.engagementsEditForm?.querySelector("button[type='submit']")
          });
          moduleActions.updateEngagementInvitedRegionField({
            field: portalContext.elements.engagementsEditInvitedRegionIds,
            levelInput: portalContext.elements.engagementsEditLevel,
            primaryRegionField: portalContext.elements.engagementsEditRegionId
          });
        }
        if(portalState.selectedEngagementCompetition?.napSource) {
          for(const select of [portalContext.elements.engagementsEditRegionId,portalContext.elements.engagementsEditInvitedRegionIds]) if(select) for(const option of select.options) if(option.value && !Object.values(portalConfig.LIVEPALMES_REFERENCE_REGION_LABELS).includes(option.value)) option.disabled=true;
          if(portalContext.elements.engagementsEditLevel) portalContext.elements.engagementsEditLevel.disabled=!isNational || portalState.selectedEngagementCompetition.nativeLevelRecognized===false;
          if(portalContext.elements.engagementsEditRegionId) portalContext.elements.engagementsEditRegionId.disabled=!isNational || !["regional","departemental"].includes(portalContext.elements.engagementsEditLevel?.value);
          if(portalContext.elements.engagementsEditInvitedRegionIds) portalContext.elements.engagementsEditInvitedRegionIds.disabled=portalState.selectedEngagementCompetition.nativeInvitationsEditable===false || !["regional","departemental"].includes(portalContext.elements.engagementsEditLevel?.value);
          portalActions.renderInvitedRegionChoices(portalContext.elements.engagementsEditInvitedRegionIds,portalContext.elements.engagementsEditInvitedRegionChoices);
          if(portalContext.elements.engagementsEditNationalKindLabel) portalContext.elements.engagementsEditNationalKindLabel.hidden=portalContext.elements.engagementsEditLevel?.value!=="national" || portalState.selectedEngagementCompetition.level!=="national" || !["pool","openWater"].includes(portalState.selectedEngagementCompetition.competitionType);
        }
      }

    function setDefaultEngagementOfficialsRequired(prefix = "create") {
        const level = prefix === "edit" ? portalContext.elements.engagementsEditLevel : portalContext.elements.engagementsLevel;
        const officialsRequired = prefix === "edit" ? portalContext.elements.engagementsEditOfficialsRequired : portalContext.elements.engagementsOfficialsRequired;
        if (level && officialsRequired) officialsRequired.value = ["national", "international"].includes(level.value) ? "false" : "true";
      }

    function resetCreateCompetitionDialog() {
        const form = portalContext.elements.engagementsCreateForm;
        if (!form) return;
        form.reset();
        if (portalContext.elements.engagementsEndDate) {
          portalContext.elements.engagementsEndDate.value = "";
          portalContext.elements.engagementsEndDate.dataset.autoFromStart = "true";
        }
        if (portalContext.elements.engagementsCreateMessage) {
          portalContext.elements.engagementsCreateMessage.textContent = "";
          delete portalContext.elements.engagementsCreateMessage.dataset.tone;
        }
        moduleActions.updateEngagementCreateFormAccess();
      }

    function openCreateCompetitionDialog() {
        if (!portalActions.canCreateEngagementCompetition()) return;
        moduleActions.prepareCreateCompetitionDialog();
        moduleActions.resetCreateCompetitionDialog();
        portalContext.elements.engagementsCreateDialog?.showModal();
      }

    function syncInvitedRegionChoice(event, select) {
        const input = event.target.closest("input[type='checkbox']");
        if (!input || input.disabled || !select || select.disabled) return;
        const option = Array.from(select.options).find((item) => item.value === input.value);
        if (option && !option.disabled) option.selected = input.checked;
        portalActions.updateInvitedRegionWarning(select);
      }

    function clearUncheckedQualificationException(box, row) {
        if (box.checked || box.dataset.qualificationApproved !== "true") return false;
        const swimmerId = row.dataset.engagementClubEntrySwimmerId;
        const swimmer = portalActions.selectedEngagementClubSwimmerRows().find((item) => item.swimmerIndexId === swimmerId);
        const key = portalActions.engagementClubSwimmerEventTimesCacheKey(swimmer || { swimmerIndexId: swimmerId });
        const previews = portalConfig.engagementClubSwimmerEventTimesCache.get(key) || [];
        portalConfig.engagementClubSwimmerEventTimesCache.set(key, previews.map((entry) => {
          if (entry.eventCode !== box.dataset.engagementClubSwimmerEvent || !entry.qualification) return entry;
          const result = entry.qualification;
          return { ...entry, qualification: { ...result, approved: false,
            allowed: Boolean(result.exceptionEligible && (result.qualified || (result.bonus && (result.minimum === null || result.mode === "one")))) } };
        }));
        box.dataset.qualificationApproved = "false";
        return true;
      }

    function updateEngagementManualEntryTimeField() {
        const field = portalContext.elements.engagementsEditMissingEntryTimeMode;
        if (!field) return;
        const enabled = document.querySelector("#adminQualificationEditor [data-q-enabled]")?.checked === true;
        if (enabled && portalState.selectedEngagementCompetition?.napSource !== true) field.value = "default595999";
        field.disabled = enabled || !portalActions.canEditEngagementCompetition();
        const hint = document.querySelector("#adminQualificationManualTimeHint");
        if (hint) hint.hidden = !enabled;
      }

    function renderQualificationJobActions(competition = portalState.selectedEngagementCompetition || {}) {
        const mount = document.querySelector("#adminQualificationJobActions");
        if (!mount) return;
        mount.replaceChildren();
        mount.hidden = !competition.qualificationJobId || !portalActions.canUse("engagements.national.manage");
        if (mount.hidden) return;
        const jobId = competition.qualificationJobId;
        const message = document.createElement("p");
        message.textContent = "Un contrôle de qualification est en attente. Reprendre utilise la grille du contrôle précédent. Annuler le contrôle permet d’enregistrer votre saisie actuelle, si son application n’a pas commencé.";
        const resume = document.createElement("button");
        resume.type = "button"; resume.className = "admin-button-compact"; resume.textContent = "Reprendre le contrôle des qualifications";
        const cancel = document.createElement("button");
        cancel.type = "button"; cancel.className = "ghost-button admin-button-compact"; cancel.textContent = "Annuler le contrôle";
        const status = document.createElement("p"); status.setAttribute("aria-live", "polite");
        async function act(action) {
          if (action === "cancel" && !global.confirm("Annuler le contrôle précédent ? Les engagements seront conservés. Votre saisie actuelle restera dans le formulaire et pourra être enregistrée ensuite.")) return;
          resume.disabled = cancel.disabled = true;
          status.textContent = action === "cancel" ? "Annulation du contrôle…" : "Reprise du contrôle…";
          try {
            if (action === "cancel") {
              await portalActions.callFunction("processEngagementQualificationJob", { competitionId: competition.id, jobId, action: "cancel" });
              if (portalState.selectedEngagementCompetition?.id === competition.id) portalState.selectedEngagementCompetition.qualificationJobId = "";
              renderQualificationJobActions();
              portalContext.elements.engagementsDetailStatus.textContent = "Contrôle annulé. Vous pouvez maintenant enregistrer votre saisie.";
            } else {
              const result = await moduleActions.finishQualificationJob(jobId);
              portalState.selectedEngagementCompetition = result.competition;
              portalActions.renderEngagementCompetitionDetail(result.competition);
              portalActions.clearEngagementDetailTabDirty("general");
            }
          } catch (error) {
            status.textContent = error.message;
            portalContext.elements.engagementsDetailStatus.textContent = error.message;
          } finally { resume.disabled = cancel.disabled = false; }
        }
        resume.onclick = () => act("resume"); cancel.onclick = () => act("cancel");
        mount.append(message, resume, cancel, status);
      }

    function renderQualificationEditor() {
        let mount = document.querySelector("#adminQualificationEditor");
        if (!mount) {
          mount = document.createElement("fieldset"); mount.id = "adminQualificationEditor";
          mount.className = "qualification-editor";
          portalContext.elements.engagementsEditForm?.querySelector(".admin-engagements-compact-section--sports")?.append(mount);
        }
        const competition = portalState.selectedEngagementCompetition || {};
        mount.hidden = portalActions.engagementCompetitionType(competition) !== "pool";
        portalState.qualificationEditor = global.LivePalmesEngagementQualifications.editor(mount, {
          rules: competition.qualifications || { enabled: false }, national: portalActions.canUse("engagements.national.manage"),
          competitionDate: competition.date || "",
          getPeriod: () => portalContext.elements.engagementsEditQualificationMode?.value === "period"
            ? { startDate: portalContext.elements.engagementsEditQualificationStart?.value || "", endDate: portalContext.elements.engagementsEditQualificationEnd?.value || "" }
            : { startDate: "0001-01-01", endDate: "9999-12-31" },
          events: (competition.events || []).map((item) => ({ ...item, categories: item.categoryRestrictions?.length ? item.categoryRestrictions : portalActions.engagementAllowedCategoryCodes(item.code) })),
          onDirty: () => { portalActions.markEngagementDetailTabDirty("general"); moduleActions.updateEngagementManualEntryTimeField(); },
          loadSpreadsheet: portalActions.loadImportSpreadsheet,
          loadSources: (cursor, period) => portalActions.callFunction("listEngagementQualificationSources", { cursor, ...period })
        });
        moduleActions.renderQualificationJobActions(competition);
        moduleActions.updateEngagementManualEntryTimeField();
      }

    function fillEngagementEditForm(competition = portalState.selectedEngagementCompetition || {}) {
        if (!competition?.id) return;
        if (portalContext.elements.engagementsEditName) portalContext.elements.engagementsEditName.value = competition.name || "";
        if (portalContext.elements.engagementsEditCompetitionType) {
          portalContext.elements.engagementsEditCompetitionType.value = portalActions.engagementCompetitionTypeLabel(portalActions.engagementCompetitionType(competition));
          portalContext.elements.engagementsEditCompetitionType.dataset.value = portalActions.engagementCompetitionType(competition);
        }
        if (portalContext.elements.engagementsEditWaterBodyType) portalContext.elements.engagementsEditWaterBodyType.value = competition.waterBodyType || "";
        if (portalContext.elements.engagementsEditDate) portalContext.elements.engagementsEditDate.value = competition.date || "";
        if (portalContext.elements.engagementsEditEndDate) {
          portalContext.elements.engagementsEditEndDate.value = competition.endDate || competition.date || "";
          portalContext.elements.engagementsEditEndDate.dataset.autoFromStart = portalContext.elements.engagementsEditEndDate.value === (competition.date || "") ? "true" : "false";
        }
        if (portalContext.elements.engagementsEditLocation) portalContext.elements.engagementsEditLocation.value = competition.location || "";
        if (portalContext.elements.engagementsEditCity) portalContext.elements.engagementsEditCity.value = competition.city || competition.location || "";
        if (portalContext.elements.engagementsEditAddress) portalContext.elements.engagementsEditAddress.value = competition.address || "";
        if (portalContext.elements.engagementsEditOrganizer) portalContext.elements.engagementsEditOrganizer.value = competition.organizer || "";
        if (portalContext.elements.engagementsEditOrganizerEmail) portalContext.elements.engagementsEditOrganizerEmail.value = competition.organizerEmail || "";
        if (portalContext.elements.engagementsEditWhatsAppUrl) portalContext.elements.engagementsEditWhatsAppUrl.value = competition.teamLeadersWhatsAppUrl || "";
        if (portalContext.elements.engagementsEditPublicDescription) portalContext.elements.engagementsEditPublicDescription.value = competition.publicDescription || "";
        if (portalContext.elements.engagementsEditCanceled) portalContext.elements.engagementsEditCanceled.checked = competition.canceled === true;
        if (portalContext.elements.engagementsEditLevel) portalContext.elements.engagementsEditLevel.value = competition.level || "regional";
        portalActions.setRegionSelectValue(portalContext.elements.engagementsEditRegionId, competition.regionId || "");
        portalActions.setRegionMultiSelectValues(portalContext.elements.engagementsEditInvitedRegionIds, competition.invitedRegionIds || [], competition.regionId || "");
        if (portalContext.elements.engagementsEditDeadline) portalContext.elements.engagementsEditDeadline.value = moduleActions.isoToDatetimeLocal(competition.entryDeadlineAt);
        if (portalContext.elements.engagementsEditComputerEmail) portalContext.elements.engagementsEditComputerEmail.value = competition.computerEmail || "";
        if (portalContext.elements.engagementsEditOfficialsManagerEmail) portalContext.elements.engagementsEditOfficialsManagerEmail.value = competition.officialsManagerEmail || "";
        if (portalContext.elements.engagementsEditPoolLength) portalContext.elements.engagementsEditPoolLength.value = competition.poolLength || "";
        if (portalContext.elements.engagementsEditPoolLaneCount) portalContext.elements.engagementsEditPoolLaneCount.value = competition.poolLaneCount || "";
        if (portalContext.elements.engagementsEditTimingType) portalContext.elements.engagementsEditTimingType.value = competition.timingType || "";
        if (portalContext.elements.engagementsEditQualificationMode) portalContext.elements.engagementsEditQualificationMode.value = competition.qualificationTimesMode || "all";
        if (portalContext.elements.engagementsEditQualificationStart) portalContext.elements.engagementsEditQualificationStart.value = competition.qualificationStartDate || "";
        if (portalContext.elements.engagementsEditQualificationEnd) portalContext.elements.engagementsEditQualificationEnd.value = competition.qualificationEndDate || "";
        if (portalContext.elements.engagementsEditMissingEntryTimeMode) portalContext.elements.engagementsEditMissingEntryTimeMode.value = competition.missingEntryTimeMode || (competition.napSource === true ? "" : "manual");
        const maxEventsPerSwimmer = Math.max(0, Math.trunc(Number(competition.maxEventsPerSwimmer) || 0));
        if (portalContext.elements.engagementsEditMaxEvents) portalContext.elements.engagementsEditMaxEvents.value = String(Math.min(5, maxEventsPerSwimmer));
        if (portalContext.elements.engagementsEditEntryStatus) portalContext.elements.engagementsEditEntryStatus.value = competition.entryStatus || "upcoming";
        if (portalContext.elements.engagementsEditOfficialsRequired) portalContext.elements.engagementsEditOfficialsRequired.value = competition.officialsRequired === true ? "true" : "false";
        moduleActions.updateEngagementSportFields(competition);
        moduleActions.updateEngagementEditFormAccess();
        moduleActions.updateEngagementQualificationFields("edit");
        moduleActions.updateEngagementMaxEventsFields("edit");
        moduleActions.renderQualificationEditor();
        const nationalKindVisible=competition.napSource === true && competition.level === "national" && ["pool","openWater"].includes(competition.competitionType);
        if(portalContext.elements.engagementsEditNationalKindLabel) portalContext.elements.engagementsEditNationalKindLabel.hidden=!nationalKindVisible;
        if(portalContext.elements.engagementsEditNationalKind) {
          portalContext.elements.engagementsEditNationalKind.value=String(competition.nativeLevelCode ?? "");
          portalContext.elements.engagementsEditNationalKind.disabled=!nationalKindVisible || !(portalState.currentAccessProfile?.capabilities || []).includes("engagements.national.manage") || ![2,3,4,5,7].includes(Number(competition.nativeLevelCode));
        }
        if (competition.napSource === true) {
          const fields = portalActions.editCompetitionFields();
          const national=(portalState.currentAccessProfile?.capabilities || []).includes("engagements.national.manage");
          if(fields.level) fields.level.disabled=!national || competition.nativeLevelRecognized===false;
          if(fields.regionId) fields.regionId.disabled=!national || !["regional","departemental"].includes(fields.level?.value);
          if(fields.invitedRegionIds) fields.invitedRegionIds.disabled=competition.nativeInvitationsEditable===false || !["regional","departemental"].includes(fields.level?.value);
          if (fields.missingEntryTimeMode) {
            if(!fields.missingEntryTimeMode.querySelector("option[value='forbidden']")){
              const option=document.createElement('option');option.value='forbidden';option.textContent='Aucune saisie — meilleur temps connu obligatoire';fields.missingEntryTimeMode.append(option);
            }
            fields.missingEntryTimeMode.value=competition.missingEntryTimeMode || '';
            fields.missingEntryTimeMode.disabled = competition.qualifications?.enabled === true;
            const labels = {manual: "Saisie possible", forbidden: "Aucune saisie — meilleur temps connu obligatoire", default595999: "Aucune saisie — temps connu au choix, sinon sans temps"};
            for (const option of fields.missingEntryTimeMode.options) if (labels[option.value]) option.textContent = labels[option.value];
          }
          if (fields.deadline) { fields.deadline.step = "1"; fields.deadline.value = (competition.nativeEntryDeadline || "").replace(" ", "T"); }
          const closed = fields.entryStatus?.querySelector("option[value='closed']");
          if (closed) closed.disabled = false;
          if (fields.entryStatus) fields.entryStatus.disabled = false;
          const qualificationMount = document.querySelector("#adminQualificationEditor");
          if (qualificationMount) qualificationMount.disabled = !national || ![0,29].includes(Number(competition.nativeParameters?.qualif || 0)) || Boolean(competition.qualificationJobId);
          if(!portalState.nativeCompetitionEditBaseline) portalState.nativeCompetitionEditBaseline = portalActions.nativeCompetitionFormValues();
        } else portalState.nativeCompetitionEditBaseline = null;
      }

    function setEngagementEditMode(editing) {
        if (!portalActions.isEngagementAdminMode() || !portalState.selectedEngagementCompetition?.id || !portalActions.canEditEngagementCompetition()) return;
        portalState.engagementDetailEditing = Boolean(editing);
        if (editing) {
          portalState.nativeCompetitionEditBaseline = null;
          moduleActions.fillEngagementEditForm();
        }
        if (portalContext.elements.engagementsEditForm) portalContext.elements.engagementsEditForm.hidden = !editing;
        if (portalContext.elements.engagementsDetailList) portalContext.elements.engagementsDetailList.hidden = editing;
        if (portalContext.elements.engagementsPublicInfo) {
          portalContext.elements.engagementsPublicInfo.hidden = (editing && !portalState.selectedEngagementCompetition.legacyDescription) || !String(portalState.selectedEngagementCompetition.publicDescription || portalState.selectedEngagementCompetition.legacyDescription || "").trim();
        }
        if (portalContext.elements.engagementsEditButton) portalContext.elements.engagementsEditButton.hidden = editing;
        if (portalContext.elements.engagementsSaveButton) portalContext.elements.engagementsSaveButton.hidden = !editing;
        if (portalContext.elements.engagementsEditCancelTop) portalContext.elements.engagementsEditCancelTop.hidden = !editing;
        if (portalContext.elements.engagementsDeleteButton) portalContext.elements.engagementsDeleteButton.hidden = editing || portalState.selectedEngagementCompetition.napSource === true;
        portalActions.updateEngagementDetailEditState();
        portalActions.renderEngagementEvents(portalState.selectedEngagementCompetition || {});
        moduleActions.renderEngagementFees(portalState.selectedEngagementCompetition || {});
        if(editing && portalState.selectedEngagementCompetition.napSource === true) portalState.nativeCompetitionEditBaseline = portalActions.nativeCompetitionFormValues();
      }

    function isoToDatetimeLocal(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
      }

    function normalizeEngagementDeadlineField(field) {
        if (!field?.value) return "";
        if (portalState.selectedEngagementCompetition?.napSource === true && field === portalContext.elements.engagementsEditDeadline) return field.value;
        const date = new Date(field.value);
        if (Number.isNaN(date.getTime())) return field.value;
        date.setMinutes(0, 0, 0);
        const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        field.value = normalized;
        return normalized;
      }

    function syncEngagementEndDate(startField, endField) {
        if (!startField || !endField) return;
        const shouldSync = !endField.value || endField.dataset.autoFromStart !== "false";
        if (shouldSync) {
          endField.value = startField.value || "";
          endField.dataset.autoFromStart = "true";
        }
        if (endField.value && startField.value && endField.value < startField.value) {
          endField.value = startField.value;
          endField.dataset.autoFromStart = "true";
        }
      }

    function markEngagementEndDateManual(startField, endField) {
        if (!startField || !endField) return;
        endField.dataset.autoFromStart = !endField.value || endField.value === startField.value ? "true" : "false";
      }

    function engagementOperationalStatusLabel(competition = {}) {
        const tone = moduleActions.engagementDeadlineTone(competition);
        if (tone === "deadline-passed") return "Date limite dépassée";
        if (tone === "closing-soon") return "Fermeture proche";
        return moduleActions.engagementStatusLabel(competition.entryStatus);
      }

    function updateEngagementSportFields(competition = portalState.selectedEngagementCompetition || {}) {
        const openWater = portalActions.engagementCompetitionType(competition) === "openWater";
        document.querySelectorAll("[data-engagements-pool-field], [data-engagements-pool-time-field]").forEach((field) => {
          field.hidden = openWater;
        });
        document.querySelectorAll("[data-engagements-open-water-field]").forEach((field) => {
          field.hidden = !openWater;
        });
        if (portalContext.elements.engagementsEditPoolLength) portalContext.elements.engagementsEditPoolLength.required = !openWater;
        if (portalContext.elements.engagementsEditPoolLaneCount) portalContext.elements.engagementsEditPoolLaneCount.required = !openWater;
      }

    function mergeNationalClubsIntoAccessReference(clubs = []) {
        if (!Array.isArray(clubs) || !clubs.length) return;
        const byId = new Map(portalState.accessClubReference.map((club) => [club.clubId, club]));
        clubs.map(portalActions.normalizeAccessClubReference).filter((club) => club.clubId && club.clubName).forEach((club) => byId.set(club.clubId, club));
        portalState.accessClubReference = Array.from(byId.values());
        portalState.accessClubReferenceById = new Map(portalState.accessClubReference.map((club) => [club.clubId, club]));
      }

    function engagementPoolLengthLabel(value) {
        return ["25", "33", "50"].includes(String(value || "")) ? `${value} m` : "-";
      }

    function engagementPoolLabel(competition = {}) {
        const length = moduleActions.engagementPoolLengthLabel(competition.poolLength);
        const laneCount = Math.trunc(Number(competition.poolLaneCount) || 0);
        if (length === "-" && !laneCount) return "Non renseigné";
        return laneCount >= 4 && laneCount <= 10
          ? `${length} · ${laneCount} lignes d'eau`
          : `${length} · nombre de lignes non renseigné`;
      }

    function engagementTimingTypeLabel(value) {
        return value === "manual" ? "Manuel" : value === "electronic" ? "Électronique" : "Non renseigné";
      }

    function engagementVenueLabel(competition = {}) {
        const seen = new Set();
        const address = String(competition.address || "").trim();
        const city = String(competition.city || "").trim();
        const addressIncludesCity = Boolean(address && city && address.toLocaleLowerCase("fr-FR").includes(city.toLocaleLowerCase("fr-FR")));
        const parts = [competition.location, address, addressIncludesCity ? "" : city]
          .map((value) => String(value || "").trim())
          .filter((value) => {
            const key = value.toLocaleLowerCase("fr-FR");
            if (!value || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        return parts.join(" · ") || "-";
      }

    function engagementFacilityLabel(competition = {}) {
        const openWater = portalActions.engagementCompetitionType(competition) === "openWater";
        const facility = openWater
          ? portalActions.engagementWaterBodyTypeLabel(competition.waterBodyType)
          : moduleActions.engagementPoolLabel(competition);
        const timing = moduleActions.engagementTimingTypeLabel(competition.timingType);
        const timingLabel = timing === "Non renseigné"
          ? "Chronométrage non renseigné"
          : `Chronométrage ${timing.toLocaleLowerCase("fr-FR")}`;
        return `${facility} · ${timingLabel}`;
      }

    function engagementQualificationPeriodLabel(competition = {}) {
        if (competition.napSource === true && !competition.qualificationTimesMode) return "Période NAP non renseignée";
        if (competition.qualificationTimesMode !== "period") return "Meilleur temps parmi tous les temps connus";
        const start = moduleActions.formatShortDate(competition.qualificationStartDate);
        const end = moduleActions.formatShortDate(competition.qualificationEndDate);
        return `Meilleur temps connu réalisé du ${start} au ${end} inclus`;
      }

    function engagementMissingEntryTimeModeLabel(value) {
        return {
          manual: "Saisie manuelle autorisée",
          forbidden: "Saisie manuelle non autorisée",
          default595999: "Temps par défaut : 59:59.99"
        }[value] || "Saisie manuelle autorisée";
      }

    function engagementEntryTimeRulesLabel(competition = {}) {
        if (competition.napSource === true && !competition.missingEntryTimeMode) return `${moduleActions.engagementQualificationPeriodLabel(competition)} · paramètres natifs conservés`;
        const manualLabel = moduleActions.engagementManualIndividualTimesAllowed(competition)
          ? "saisie manuelle autorisée"
          : "saisie manuelle non autorisée";
        return `${moduleActions.engagementQualificationPeriodLabel(competition)} · ${manualLabel}`;
      }

    function engagementMaxEventsLabel(value) {
        const count = Math.trunc(Number(value) || 0);
        return count > 0 ? `${count} épreuve${count > 1 ? "s" : ""}` : "Non limité";
      }

    function engagementFeesSummary(fees = {}, entryFormat = "classic") {
        if (fees.enabled === false) return "Aucun frais d'engagement";
        if (entryFormat === "clubs" || entryFormat === "clubs_masters") {
          const euro = value => moduleActions.engagementFeeAmount(value).toLocaleString("fr-FR", {
            style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2
          });
          const rates = [`${euro(fees.teamFee)} par équipe`];
          if (entryFormat === "clubs") {
            rates.push(`${euro(fees.swimmerFee)} par nageur hors concours`, `${euro(fees.individualEventFee)} par course hors concours`);
          }
          return rates.join(" · ");
        }
        const parts = [
          `nageur ${moduleActions.formatEngagementFee(fees.swimmerFee)}`,
          `course ${moduleActions.formatEngagementFee(fees.individualEventFee)}`,
          `relais ${moduleActions.formatEngagementFee(fees.relayFee)}`
        ];
        return parts.join(" - ");
      }

    function engagementEmailLinkValue(value) {
        const email = String(value || "").trim().toLocaleLowerCase("fr-FR");
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          ? { href: `mailto:${email}`, label: email, kind: "email" }
          : email;
      }

    function engagementCompetitionProgramOverview(competition = {}) {
        const events = Array.isArray(competition.events) ? competition.events : [];
        const sessions = portalActions.normalizedEngagementProgramSessions(
          competition.programSessions || [],
          events.map((event) => ({ code: event.code, label: event.shortLabel || event.code }))
        );
        return portalActions.engagementProgramStatusSummary(events, sessions);
      }

    function selectedEngagementFeesFromForm() {
        const enabled = portalContext.elements.engagementsNoFees?.checked !== true;
        return {
          enabled,
          swimmerFee: enabled ? moduleActions.engagementFeeAmount(portalContext.elements.engagementsSwimmerFee?.value) : 0,
          individualEventFee: enabled ? moduleActions.engagementFeeAmount(portalContext.elements.engagementsIndividualEventFee?.value) : 0,
          relayFee: enabled ? moduleActions.engagementFeeAmount(portalContext.elements.engagementsRelayFee?.value) : 0,
          helloAssoUrl: enabled ? String(portalContext.elements.engagementsHelloAssoUrl?.value || "").trim() : "",
          latePaymentSurcharge: 50
        };
      }

    function updateEngagementFeesFormMode(canEdit = false) {
        const noFees = portalContext.elements.engagementsNoFees?.checked === true;
        if (portalContext.elements.engagementsFeesGrid) portalContext.elements.engagementsFeesGrid.hidden = noFees;
        if (portalContext.elements.engagementsPaymentNote) portalContext.elements.engagementsPaymentNote.hidden = noFees;
        [portalContext.elements.engagementsSwimmerFee, portalContext.elements.engagementsIndividualEventFee, portalContext.elements.engagementsRelayFee, portalContext.elements.engagementsHelloAssoUrl].forEach((field) => {
          if (field) field.disabled = !canEdit || noFees;
        });
      }

    function renderEngagementFees(competition = portalState.selectedEngagementCompetition || {}) {
        const fees = competition.fees || {};
        const adminMode = portalActions.isEngagementAdminMode();
        const canEdit = adminMode && portalState.engagementDetailEditing && portalActions.canEditEngagementCompetition(competition);
        const noFees = fees.enabled === false;
        if (portalContext.elements.engagementsFeesForm?.parentElement) portalContext.elements.engagementsFeesForm.parentElement.hidden = !canEdit;
        if (portalContext.elements.engagementsFeesForm) portalContext.elements.engagementsFeesForm.dataset.readonly = canEdit ? "false" : "true";
        if (portalContext.elements.engagementsNoFees) {
          portalContext.elements.engagementsNoFees.checked = noFees;
          portalContext.elements.engagementsNoFees.disabled = !canEdit;
        }
        if (portalContext.elements.engagementsSwimmerFee) portalContext.elements.engagementsSwimmerFee.value = fees.swimmerFee || "";
        if (portalContext.elements.engagementsIndividualEventFee) portalContext.elements.engagementsIndividualEventFee.value = fees.individualEventFee || "";
        if (portalContext.elements.engagementsRelayFee) portalContext.elements.engagementsRelayFee.value = fees.relayFee || "";
        if (portalContext.elements.engagementsHelloAssoUrl) portalContext.elements.engagementsHelloAssoUrl.value = fees.helloAssoUrl || "";
        if (portalContext.elements.engagementsSwimmerFeeRead) portalContext.elements.engagementsSwimmerFeeRead.textContent = moduleActions.formatEngagementFee(fees.swimmerFee);
        if (portalContext.elements.engagementsIndividualEventFeeRead) portalContext.elements.engagementsIndividualEventFeeRead.textContent = moduleActions.formatEngagementFee(fees.individualEventFee);
        if (portalContext.elements.engagementsRelayFeeRead) portalContext.elements.engagementsRelayFeeRead.textContent = moduleActions.formatEngagementFee(fees.relayFee);
        if (portalContext.elements.engagementsHelloAssoUrlRead) portalContext.elements.engagementsHelloAssoUrlRead.textContent = fees.helloAssoUrl || "Lien en attente";
        moduleActions.updateEngagementFeesFormMode(canEdit);
        if (portalContext.elements.engagementsFeesSummary) portalContext.elements.engagementsFeesSummary.textContent = moduleActions.engagementFeesSummary(fees, competition.entryFormat);
        portalActions.renderEngagementClubSummary();
        if (portalContext.elements.engagementsFeesSaveButton) {
          portalContext.elements.engagementsFeesSaveButton.hidden = true;
          portalContext.elements.engagementsFeesSaveButton.disabled = true;
        }
        if (portalContext.elements.engagementsFeesMessage) {
          portalContext.elements.engagementsFeesMessage.textContent = !adminMode
            ? ""
            : portalActions.canEditEngagementCompetition(competition) ? "" : "Frais consultables uniquement avec un droit de gestion sur cette compétition.";
          portalContext.elements.engagementsFeesMessage.dataset.tone = canEdit ? "ok" : "loading";
        }
      }
    return { confirmQualificationException, finishQualificationJob, updateCompetitionWithQualifications , engagementCalendarScopeKey, engagementCalendarCacheKey, readEngagementCalendarCache, activateEngagementCalendarCache, openInvitedRegionsDialog, closeInvitedRegionsDialog, engagementKnownIndividualTimesSelectable, setSelectedEngagementCompetitionClubEntryExists, selectedCreateEngagementFeesFromForm, updateCreateEngagementFeesMode , resetEngagementCalendarFilters, engagementCalendarRequestedRange, engagementCalendarCacheCompetition, writeEngagementCalendarCache, persistActiveEngagementCalendarCache, upsertEngagementCalendarItemFromServer, removeEngagementCalendarItemFromCache, invalidateEngagementCalendarCaches, updateEngagementInvitedRegionField, updateEngagementEditFormAccess, setDefaultEngagementOfficialsRequired, resetCreateCompetitionDialog, openCreateCompetitionDialog, syncInvitedRegionChoice, clearUncheckedQualificationException, updateEngagementManualEntryTimeField, renderQualificationJobActions, renderQualificationEditor, fillEngagementEditForm, setEngagementEditMode, isoToDatetimeLocal, normalizeEngagementDeadlineField, syncEngagementEndDate, markEngagementEndDateManual, engagementOperationalStatusLabel, updateEngagementSportFields, mergeNationalClubsIntoAccessReference, engagementPoolLengthLabel, engagementPoolLabel, engagementTimingTypeLabel, engagementVenueLabel, engagementFacilityLabel, engagementQualificationPeriodLabel, engagementMissingEntryTimeModeLabel, engagementEntryTimeRulesLabel, engagementMaxEventsLabel, engagementFeesSummary, engagementEmailLinkValue, engagementCompetitionProgramOverview, selectedEngagementFeesFromForm, updateEngagementFeesFormMode, renderEngagementFees };
  });
})(window);
