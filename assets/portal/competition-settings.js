(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    let clubHomePreloadGeneration = 0;
    function updateEngagementDetailStepLabels() {
        const adminMode = portalActions.isEngagementAdminMode();
        const labels = adminMode
          ? {
              information: "Paramétrage",
              participants: "Participants",
              entries: "Engagements",
              summary: "Récapitulatif",
              statistics: "Statistiques",
              documents: "GED",
              delivery: "Diffusion"
            }
          : {
              information: "Informations",
              participants: "Participants",
              entries: "Engagements",
              summary: "Récapitulatif",
              statistics: "Statistiques",
              documents: "Documents",
              delivery: "Diffusion"
            };
        document.querySelectorAll("[data-engagement-step-label]").forEach((label) => {
          label.textContent = labels[label.dataset.engagementStepLabel] || "";
        });
        const navigation = document.querySelector(".admin-engagements-detail-step-bar");
        if (navigation) navigation.setAttribute("aria-label", adminMode ? "Rubriques de la compétition" : "Étapes");
      }

    function initializeEngagementCalendarFilters(user = portalState.currentAccessProfile || {}) {
        if (portalState.engagementCalendarFiltersInitialized) return;
        if (portalContext.elements.engagementsSeasonFilter) {
          portalContext.elements.engagementsSeasonFilter.value = String(portalActions.currentEngagementSeasonStartYear());
        }
        if (portalContext.elements.engagementsStatusFilter) {
          portalContext.elements.engagementsStatusFilter.value = "";
        }
        applyEngagementCalendarRegionScope(user, portalActions.engagementNavigationMode());
        portalState.engagementCalendarFiltersInitialized = true;
        portalActions.syncEngagementStatusSegments();
      }

    function applyEngagementCalendarRegionScope(user = portalState.currentAccessProfile || {}, mode = portalActions.engagementNavigationMode()) {
        if (!portalContext.elements.engagementsRegionFilter) return;
        const capabilities = new Set(user.capabilities || []);
        const regionalAdministration = mode === "admin" &&
          capabilities.has("engagements.region.manage") &&
          !capabilities.has("engagements.national.manage");
        portalActions.setRegionSelectValue(portalContext.elements.engagementsRegionFilter, regionalAdministration ? portalActions.engagementRegionScope(user) : "");
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

    function engagementCalendarFiltersPayload() {
        const season = portalActions.engagementSeasonBounds(portalContext.elements.engagementsSeasonFilter?.value);
        return {
          ...season,
          regionId: portalActions.canonicalLivePalmesRegion(portalContext.elements.engagementsRegionFilter?.value),
          level: portalContext.elements.engagementsLevelFilter?.value || "",
          competitionType: portalContext.elements.engagementsTypeFilter?.value || "",
          entryStatus: portalContext.elements.engagementsStatusFilter?.value || "",
          mineOnly: portalContext.elements.engagementsMineFilter?.checked === true
        };
      }

    function engagementCalendarSeptemberPreview(filters = {}, date = new Date()) {
        const currentSeason = portalActions.currentEngagementSeasonStartYear(date);
        if (date.getMonth() !== 7 || Number(filters.startYear) !== currentSeason) return null;
        const septemberYear = currentSeason + 1;
        return {
          startYear: septemberYear,
          startDate: `${septemberYear}-09-01`,
          endDate: `${septemberYear}-09-30`
        };
      }

    function engagementCalendarRequestedRange(filters = {}, date = new Date()) {
        const preview = engagementCalendarSeptemberPreview(filters, date);
        return [filters.startDate, filters.endDate, preview?.startDate, preview?.endDate]
          .filter(Boolean)
          .join("|");
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
        return [uid, mode, engagementCalendarScopeKey(mode), requestedRange]
          .map((part) => encodeURIComponent(String(part || "")))
          .join(".");
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
          teamLeadersWhatsAppUrl: engagementTeamLeadersWhatsAppUrl(competition.teamLeadersWhatsAppUrl),
          regionId: String(competition.regionId || ""),
          invitedRegionIds: Array.isArray(competition.invitedRegionIds) ? competition.invitedRegionIds.map(String) : [],
          level: String(competition.level || ""),
          competitionType: portalActions.engagementCompetitionType(competition),
          waterBodyType: String(competition.waterBodyType || ""),
          entryDeadlineAt: String(competition.entryDeadlineAt || ""),
          entryStatus: String(competition.entryStatus || "upcoming"),
          publicationStatus: String(competition.publicationStatus || "draft"),
          canceled: competition.canceled === true,
          documentCount: Math.max(0, Number(competition.documentCount) || 0),
          clubEntryExists: competition.clubEntryExists === true,
          updatedAt: String(competition.updatedAt || "")
        };
      }

    function readEngagementCalendarCache(cacheKey) {
        const memoryEntry = portalConfig.engagementCompetitionCalendarMemoryCache.get(cacheKey);
        if (memoryEntry) return memoryEntry;
        try {
          const stored = JSON.parse(global.sessionStorage?.getItem(`${portalConfig.ENGAGEMENT_CALENDAR_SESSION_CACHE_PREFIX}${cacheKey}`) || "null");
          if (!stored || stored.version !== 3 || !Array.isArray(stored.competitions) || !Number(stored.cachedAt)) return null;
          const entry = {
            competitions: stored.competitions.map(engagementCalendarCacheCompetition).filter((competition) => competition.id),
            source: stored.source === "nap" ? "nap" : "",
            cachedAt: Number(stored.cachedAt)
          };
          portalConfig.engagementCompetitionCalendarMemoryCache.set(cacheKey, entry);
          return entry;
        } catch (_) {
          return null;
        }
      }

    function writeEngagementCalendarCache(cacheKey, competitions = [], cachedAt = Date.now(), source = "") {
        const entry = {
          competitions: competitions.map(engagementCalendarCacheCompetition).filter((competition) => competition.id),
          source,
          cachedAt
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

    function activateEngagementCalendarCache(cacheKey, requestedRange, entry) {
        portalState.engagementCompetitions = entry.competitions.map((competition) => ({ ...competition }));
        portalState.engagementCompetitionsLoaded = true;
        portalState.engagementCompetitionsLoadedRange = requestedRange;
        portalState.engagementCompetitionsLoadedCacheKey = cacheKey;
        portalState.engagementCompetitionsCachedAt = entry.cachedAt;
        portalActions.renderEngagementCompetitions();
      }

    function persistActiveEngagementCalendarCache() {
        if (!portalState.engagementCompetitionsLoadedCacheKey || !portalState.engagementCompetitionsLoadedRange) return;
        const entry = writeEngagementCalendarCache(portalState.engagementCompetitionsLoadedCacheKey, portalState.engagementCompetitions);
        portalState.engagementCompetitionsCachedAt = entry.cachedAt;
      }

    function upsertEngagementCalendarItemFromServer(item = {}, sourceType = "competition") {
        if (!item?.id) return;
        const cachedItem = engagementCalendarCacheCompetition({ ...item, sourceType });
        const index = portalState.engagementCompetitions.findIndex((competition) => (
          competition.id === cachedItem.id
          && (competition.sourceType || "competition") === cachedItem.sourceType
        ));
        if (index >= 0) portalState.engagementCompetitions[index] = { ...portalState.engagementCompetitions[index], ...cachedItem };
        else portalState.engagementCompetitions.push(cachedItem);
        persistActiveEngagementCalendarCache();
        portalActions.renderEngagementCompetitions();
      }

    function removeEngagementCalendarItemFromCache(itemId, sourceType = "calendarEvent") {
        const cleanId = String(itemId || "");
        if (!cleanId) return;
        portalState.engagementCompetitions = portalState.engagementCompetitions.filter((competition) => !(
          competition.id === cleanId
          && (competition.sourceType || "competition") === sourceType
        ));
        persistActiveEngagementCalendarCache();
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

    function engagementCompetitionIsInSeptemberPreview(competition = {}, filters = {}, date = new Date()) {
        const preview = engagementCalendarSeptemberPreview(filters, date);
        return Boolean(competition.date && preview && competition.date >= preview.startDate && competition.date <= preview.endDate);
      }

    function filteredEngagementCompetitions(date = new Date()) {
        const filters = engagementCalendarFiltersPayload();
        const septemberPreview = engagementCalendarSeptemberPreview(filters, date);
        return portalState.engagementCompetitions
          .filter((competition) => !competition.date ||
            (competition.date >= filters.startDate && competition.date <= filters.endDate) ||
            (septemberPreview && competition.date >= septemberPreview.startDate && competition.date <= septemberPreview.endDate))
          .filter((competition) => !filters.regionId || portalActions.canonicalLivePalmesRegion(competition.regionId) === filters.regionId)
          .filter((competition) => !filters.level || competition.level === filters.level)
          .filter((competition) => !filters.competitionType || portalActions.engagementCompetitionType(competition) === filters.competitionType)
          .filter((competition) => !filters.entryStatus || competition.entryStatus === filters.entryStatus)
          .filter((competition) => !filters.mineOnly || portalActions.canEditEngagementCompetition(competition))
          .sort((left, right) => {
            return String(left.date || "9999-12-31").localeCompare(String(right.date || "9999-12-31")) ||
              String(left.name || "").localeCompare(String(right.name || ""), "fr") ||
              String(left.id || "").localeCompare(String(right.id || ""));
          });
      }

    function engagementCalendarSections(competitions, date = new Date()) {
        const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
        const value = type => parts.find(part => part.type === type).value;
        const today = `${value("year")}-${value("month")}-${value("day")}`;
        const past = [], upcoming = [];
        competitions.forEach(competition => {
          const end = competition.endDate || competition.date;
          (end && end < today ? past : upcoming).push(competition);
        });
        past.sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")) ||
          String(left.name || "").localeCompare(String(right.name || ""), "fr") || String(left.id || "").localeCompare(String(right.id || "")));
        return { upcoming, past };
      }

    function renderCurrentUser(user = {}) {
        const previousClubId = portalActions.engagementClubScope(portalState.currentAccessProfile || {});
        const nextClubId = portalActions.engagementClubScope(user || {});
        if (previousClubId && nextClubId && previousClubId !== nextClubId) {
          portalActions.resetEngagementClubData();
        }
        portalState.currentAccessProfile = user;
        portalConfig.accessRequestHistory?.onProfileChange();
        void portalActions.loadPortalClubCodeReference();
        portalActions.preloadAccessDirectoryFirestore();
        portalActions.applyPortalHomeForProfile();
        const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Profil LivePalmes";
        const accountEmail = user.email || portalActions.ensureAdminAuth()?.status?.().email || "";
        if (portalContext.elements.sessionLabel) portalContext.elements.sessionLabel.textContent = name;
        if (portalContext.elements.accountFullName) portalContext.elements.accountFullName.textContent = name;
        if (portalContext.elements.accountIdentityEmail) portalContext.elements.accountIdentityEmail.textContent = accountEmail || "Email non renseigné";
        if (portalContext.elements.accountEmailSummary) portalContext.elements.accountEmailSummary.textContent = accountEmail ? `Adresse actuelle : ${accountEmail}` : "Adresse actuelle non renseignée";
        if (portalContext.elements.accountLicenseMeta) portalContext.elements.accountLicenseMeta.hidden = !user.licenseNumber;
        if (portalContext.elements.accountLicenseNumber) portalContext.elements.accountLicenseNumber.textContent = user.licenseNumber || "";
        if (portalContext.elements.accountEmail && document.activeElement !== portalContext.elements.accountEmail) {
          portalContext.elements.accountEmail.value = accountEmail;
        }
        const competitionNotificationsEnabled = user.competitionNotificationsEnabled !== false;
        if (portalContext.elements.accountCompetitionNotifications) {
          portalContext.elements.accountCompetitionNotifications.setAttribute("aria-checked", String(competitionNotificationsEnabled));
          portalContext.elements.accountCompetitionNotifications.setAttribute(
            "aria-label",
            `Notifications de compétition ${competitionNotificationsEnabled ? "activées" : "désactivées"}`
          );
          portalContext.elements.accountCompetitionNotifications.dataset.enabled = String(competitionNotificationsEnabled);
        }
        if (portalContext.elements.accountCompetitionNotificationsState) {
          portalContext.elements.accountCompetitionNotificationsState.textContent = competitionNotificationsEnabled ? "ON" : "OFF";
        }
        if (portalContext.elements.accountNotificationsSummary) {
          portalContext.elements.accountNotificationsSummary.textContent = competitionNotificationsEnabled
            ? "Notifications de compétition activées."
            : "Notifications de compétition désactivées.";
        }
        renderPortalScopeContext(user);
        renderEngagementsProfile(user);
        initializeEngagementCalendarFilters(user);
        updateEngagementCreateFormAccess(user);
        void portalActions.loadPortalPendingOverview();
        const preloadGeneration = ++clubHomePreloadGeneration;
        if (portalActions.canUse("engagements.club.manage")) {
          const authUid = portalState.activeAuthUid;
          const clubId = portalActions.engagementClubScope(user);
          const preload = () => {
            if (preloadGeneration !== clubHomePreloadGeneration || authUid !== portalState.activeAuthUid
              || clubId !== portalActions.engagementClubScope(portalState.currentAccessProfile || {})
              || !portalActions.canUse("engagements.club.manage")) return;
            void portalActions.loadEngagementCompetitions({ mode: "club", activate: false, silent: true });
            void portalActions.loadEngagementClubSwimmers({ silent: true });
          };
          // Give the home view a paint opportunity before warming optional data.
          if (global.requestAnimationFrame) global.requestAnimationFrame(() => global.setTimeout(preload, 0));
          else global.setTimeout(preload, 0);
        }
        void portalActions.restoreEngagementNavigation();
      }

    function renderPortalScopeContext(user = {}) {
        if (!portalContext.elements.scopeContext) return;
        user = portalActions.activeEngagementClubProfile(user);
        const clubScope = user.accessScopes?.["engagements.club.manage"] || {};
        const clubId = portalActions.engagementClubScope(user);
        const referencedClub = portalActions.accessClubFromId(clubId);
        const clubName = user.clubName || clubScope.scopeName || referencedClub?.clubName || "";
        const clubCode = portalActions.clubDisplayCode({ clubId, clubName }, "");
        const clubLabel = clubCode || clubName || (portalActions.canSwitchEngagementClub(portalState.currentAccessProfile || user) ? "Choisir un club" : "");
        const accountClubCode = String(
          user.clubCode || referencedClub?.clubCode || portalState.portalClubCodeReferenceById.get(String(clubId || "").trim())?.clubCode || ""
        ).trim();

        portalContext.elements.scopeContext.hidden = !clubLabel;
        portalContext.elements.scopeContext.title = clubName
          ? `Club : ${clubCode ? `${clubCode} — ` : ""}${clubName}`
          : clubLabel;
        if (portalContext.elements.scopeClubPrefix) portalContext.elements.scopeClubPrefix.hidden = !clubLabel;
        if (portalContext.elements.scopeClubCode) {
          portalContext.elements.scopeClubCode.hidden = !clubLabel;
          portalContext.elements.scopeClubCode.textContent = clubLabel;
        }
        const switchEnabled = Boolean(clubLabel) && portalActions.canSwitchEngagementClub(portalState.currentAccessProfile || user);
        if (portalContext.elements.scopeClubButton) {
          portalContext.elements.scopeClubButton.hidden = !clubLabel;
          portalContext.elements.scopeClubButton.disabled = !switchEnabled;
          portalContext.elements.scopeClubButton.title = switchEnabled ? "Changer de club pour cette session" : "Club de la session";
          portalContext.elements.scopeClubButton.setAttribute("aria-label", switchEnabled
            ? `Changer de club pour cette session. Club actif : ${clubLabel}`
            : `Club de la session : ${clubLabel}`);
        }
        if (portalContext.elements.accountClubSwitch) portalContext.elements.accountClubSwitch.hidden = !switchEnabled;
        if (portalContext.elements.scopeRole) portalContext.elements.scopeRole.hidden = true;
        if (portalContext.elements.scopeRoleLong) portalContext.elements.scopeRoleLong.textContent = "";
        if (portalContext.elements.accountClubCode) {
          portalContext.elements.accountClubCode.textContent = accountClubCode || (clubId ? "Club" : "Profil");
          portalContext.elements.accountClubCode.title = clubName ? `Club : ${clubName}` : clubLabel || "Profil";
        }
      }

    function renderEngagementsProfile(user = {}) {
        const contextProfile = user;
        user = portalActions.activeEngagementClubProfile(user);
        const capabilities = new Set(user.capabilities || []);
        const scopeFor = (capability) => user.accessScopes?.[capability] || {};
        const clubScope = scopeFor("engagements.club.manage");
        const regionScope = scopeFor("engagements.region.manage");
        const clubId = portalActions.engagementClubScope(user);
        const referencedClub = portalActions.accessClubFromId(clubId);
        const clubValue = portalActions.clubDisplayLabel({ clubId, clubName: user.clubName || clubScope.scopeName }, { fallback: "Club indisponible" });
        const regionValue = portalActions.regionDisplayLabel(regionScope.scopeId || user.regionId || referencedClub?.regionId);
        portalActions.renderEngagementClubContext(contextProfile);
        if (portalContext.elements.accountScopeSentence) {
          if (capabilities.has("engagements.national.manage")) {
            portalContext.elements.accountScopeSentence.innerHTML = `Vos droits LivePalmes sont de niveau national. Votre club pour les engagements est <strong>${portalActions.escapeHtml(clubValue)}</strong>.`;
          } else if (capabilities.has("engagements.region.manage")) {
            portalContext.elements.accountScopeSentence.innerHTML = `Vos droits LivePalmes sont de niveau régional${regionValue && regionValue !== "-" ? ` (<strong>${portalActions.escapeHtml(regionValue)}</strong>)` : ""}. Votre club pour les engagements est <strong>${portalActions.escapeHtml(clubValue)}</strong>.`;
          } else if (capabilities.has("engagements.club.manage")) {
            const regionSuffix = regionValue && regionValue !== "-"
              ? `, région <strong>${portalActions.escapeHtml(regionValue)}</strong>`
              : "";
            portalContext.elements.accountScopeSentence.innerHTML = `Vous gérez les engagements du club <strong>${portalActions.escapeHtml(clubValue)}</strong>${regionSuffix}.`;
          } else {
            portalContext.elements.accountScopeSentence.textContent = "Aucun périmètre d’engagement n’est associé à ce compte.";
          }
        }
        if (portalContext.elements.accountCapabilities) {
          const capabilityValues = Array.from(capabilities).sort();
          portalContext.elements.accountCapabilities.innerHTML = capabilityValues.length
            ? capabilityValues.map((capability) => `<span>${portalActions.escapeHtml(portalActions.capabilityLabel(capability))}</span>`).join("")
            : "-";
        }
        if (portalContext.elements.engagementsStatus) {
          portalContext.elements.engagementsStatus.textContent = "";
          portalContext.elements.engagementsStatus.hidden = true;
          delete portalContext.elements.engagementsStatus.dataset.tone;
        }
      }

    function updateEngagementRegionField({ field, note, levelInput, user = portalState.currentAccessProfile || {}, submitButton = null }) {
        const capabilities = new Set(user.capabilities || []);
        const isNational = capabilities.has("engagements.national.manage");
        const isRegional = capabilities.has("engagements.region.manage");
        const regionId = portalActions.engagementRegionScope(user);
        const level = levelInput?.value || "regional";
        const nationalCompetition = ["national", "international"].includes(level);
        const container = field?.closest("[data-engagements-conditional-region]");
        if (container) container.hidden = nationalCompetition;
        if (field) {
          if (nationalCompetition) portalActions.setRegionSelectValue(field, "");
          if (!isNational && isRegional && !nationalCompetition) portalActions.setRegionSelectValue(field, regionId);
          field.disabled = nationalCompetition || !isNational;
          field.required = !nationalCompetition;
        }
        if (note) {
          if (nationalCompetition) {
            note.textContent = "Non requis pour une compétition nationale.";
          } else if (isNational) {
            note.textContent = "Région obligatoire pour une compétition départementale ou régionale.";
          } else if (isRegional && regionId) {
            note.textContent = `Région imposée par votre droit régional : ${portalActions.regionDisplayLabel(regionId)}.`;
          } else if (isRegional) {
            note.textContent = "Région manquante sur votre accès. Mettez à jour le compte avant de créer une compétition.";
          } else {
            note.textContent = "Droit régional ou national requis pour créer une compétition.";
          }
        }
        if (submitButton) submitButton.disabled = Boolean(!nationalCompetition && isRegional && !isNational && !regionId);
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

    function updateEngagementCreateFormAccess(user = portalState.currentAccessProfile || {}) {
        const capabilities = new Set(user.capabilities || []);
        const isNational = capabilities.has("engagements.national.manage");
        updateEngagementRegionField({
          field: portalContext.elements.engagementsRegionId,
          note: portalContext.elements.engagementsRegionNote,
          levelInput: portalContext.elements.engagementsLevel,
          user,
          submitButton: portalContext.elements.engagementsCreateForm?.querySelector("button[type='submit']")
        });
        const nationalOption = portalContext.elements.engagementsLevel?.querySelector("option[value='national']");
        if (nationalOption) nationalOption.disabled = !isNational;
        const internationalOption = portalContext.elements.engagementsLevel?.querySelector("option[value='international']");
        if (internationalOption) internationalOption.disabled = !isNational;
        if (!isNational && ["national", "international"].includes(portalContext.elements.engagementsLevel?.value)) {
          portalContext.elements.engagementsLevel.value = "regional";
          updateEngagementRegionField({
            field: portalContext.elements.engagementsRegionId,
            note: portalContext.elements.engagementsRegionNote,
            levelInput: portalContext.elements.engagementsLevel,
            user,
            submitButton: portalContext.elements.engagementsCreateForm?.querySelector("button[type='submit']")
          });
        }
      }

    function updateEngagementEditFormAccess(user = portalState.currentAccessProfile || {}) {
        const capabilities = new Set(user.capabilities || []);
        const isNational = capabilities.has("engagements.national.manage");
        updateEngagementRegionField({
          field: portalContext.elements.engagementsEditRegionId,
          note: portalContext.elements.engagementsEditRegionNote,
          levelInput: portalContext.elements.engagementsEditLevel,
          user,
          submitButton: portalContext.elements.engagementsEditForm?.querySelector("button[type='submit']")
        });
        updateEngagementInvitedRegionField({
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
          updateEngagementRegionField({
            field: portalContext.elements.engagementsEditRegionId,
            note: portalContext.elements.engagementsEditRegionNote,
            levelInput: portalContext.elements.engagementsEditLevel,
            user,
            submitButton: portalContext.elements.engagementsEditForm?.querySelector("button[type='submit']")
          });
          updateEngagementInvitedRegionField({
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

    function updateEngagementQualificationFields(prefix = "create") {
        const mode = prefix === "edit" ? portalContext.elements.engagementsEditQualificationMode : portalContext.elements.engagementsQualificationMode;
        const start = prefix === "edit" ? portalContext.elements.engagementsEditQualificationStart : portalContext.elements.engagementsQualificationStart;
        const end = prefix === "edit" ? portalContext.elements.engagementsEditQualificationEnd : portalContext.elements.engagementsQualificationEnd;
        const periodMode = mode?.value === "period";
        [start, end].forEach((field) => {
          if (!field) return;
          field.disabled = !periodMode;
          field.required = periodMode;
          if (!periodMode) field.value = "";
        });
      }

    function updateEngagementMaxEventsFields(prefix = "create") {
        const unlimited = prefix === "edit" ? portalContext.elements.engagementsEditMaxEventsUnlimited : portalContext.elements.engagementsMaxEventsUnlimited;
        const input = prefix === "edit" ? portalContext.elements.engagementsEditMaxEvents : portalContext.elements.engagementsMaxEvents;
        if (!unlimited || !input) return;
        input.disabled = unlimited.checked;
        input.required = !unlimited.checked;
        if (unlimited.checked) input.value = "";
      }

    function setDefaultEngagementOfficialsRequired(prefix = "create") {
        const level = prefix === "edit" ? portalContext.elements.engagementsEditLevel : portalContext.elements.engagementsLevel;
        const officialsRequired = prefix === "edit" ? portalContext.elements.engagementsEditOfficialsRequired : portalContext.elements.engagementsOfficialsRequired;
        if (level && officialsRequired) officialsRequired.value = ["national", "international"].includes(level.value) ? "false" : "true";
      }

    function prepareCreateCompetitionDialog() {
        const dialog = portalContext.elements.engagementsCreateDialog;
        const form = portalContext.elements.engagementsCreateForm;
        if (!dialog || !form) return;
        [portalContext.elements.engagementsCreateChecklist].forEach((modal) => {
          if (modal && modal.parentElement !== dialog.parentElement) dialog.insertAdjacentElement("afterend", modal);
        });
        if (dialog.contains(form)) return;
        dialog.append(form);
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
        updateEngagementCreateFormAccess();
      }

    function openCreateCompetitionDialog() {
        if (!portalActions.canCreateEngagementCompetition()) return;
        prepareCreateCompetitionDialog();
        resetCreateCompetitionDialog();
        portalContext.elements.engagementsCreateDialog?.showModal();
      }

    function syncInvitedRegionChoice(event, select) {
        const input = event.target.closest("input[type='checkbox']");
        if (!input || input.disabled || !select || select.disabled) return;
        const option = Array.from(select.options).find((item) => item.value === input.value);
        if (option && !option.disabled) option.selected = input.checked;
        portalActions.updateInvitedRegionWarning(select);
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

    function qualificationExceptionContext() {
        const club = portalActions.activeEngagementClubProfile(portalState.currentAccessProfile || {});
        return [portalState.selectedEngagementCompetitionId, club?.clubId || portalActions.activeEngagementClubIdForProfile(portalState.currentAccessProfile), portalState.currentAccessProfile?.uid || portalState.currentAccessProfile?.id || ""].join("|");
      }

    function qualificationExceptionsEnabled() {
        if (!portalActions.canUse("engagements.national.manage") || !portalState.selectedEngagementCompetition?.qualifications?.enabled || portalState.qualificationExceptionScope !== qualificationExceptionContext()) {
          portalState.qualificationExceptionScope = "";
          return false;
        }
        return Boolean(portalState.qualificationExceptionScope);
      }

    function renderQualificationExceptionToggle(mount) {
        if (!portalState.selectedEngagementCompetition?.qualifications?.enabled || !portalActions.canUse("engagements.national.manage")) return;
        const active = qualificationExceptionsEnabled();
        const toolbar = document.createElement("div"); toolbar.className = "qualification-exception-toggle";
        const button = document.createElement("button"); button.type = "button"; button.className = "ghost-button admin-button-compact";
        button.textContent = active ? "Désactiver les exceptions" : "Activer les exceptions";
        button.setAttribute("aria-pressed", String(active));
        button.onclick = () => { portalState.qualificationExceptionScope = qualificationExceptionsEnabled() ? "" : qualificationExceptionContext(); portalActions.renderEngagementClubEntries(); };
        toolbar.append(button);
        if (active) { const note = document.createElement("small"); note.textContent = "Mode National : chaque exception doit être confirmée. Les temps individuels restent automatiques."; toolbar.append(note); }
        mount.prepend(toolbar);
      }

    async function confirmQualificationException(box, row) {
        if (!qualificationExceptionsEnabled()) return false;
        const scope = qualificationExceptionContext();
        const competitionId = portalState.selectedEngagementCompetitionId;
        const swimmerId = row.dataset.engagementClubEntrySwimmerId;
        const eventCode = box.dataset.engagementClubSwimmerEvent;
        if (!global.confirm(`Confirmer l’exception pour ${eventCode} ?\n${box.title}\n\nCette autorisation du National concerne uniquement cette course. Elle ne qualifie pas le nageur pour des bonus ou un relais.`)) return false;
        box.disabled = true;
        try {
          await portalActions.flushEngagementClubIndividualEntriesAutosave();
          await portalState.engagementClubEntryMutationQueue;
          if (scope !== qualificationExceptionContext() || !qualificationExceptionsEnabled()) return false;
          if (row.isConnected === false) return false;
          const result = await portalActions.callFunction("grantEngagementQualificationException", { competitionId, swimmerIndexId: swimmerId, eventCode, confirmed: true });
          if (scope !== qualificationExceptionContext() || !qualificationExceptionsEnabled()) return false;
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
          if (scope === qualificationExceptionContext() && portalContext.elements.engagementsClubEntriesMessage) portalContext.elements.engagementsClubEntriesMessage.textContent = error.message;
          return false;
        } finally { box.disabled = false; }
      }

    function engagementManualIndividualTimesAllowed(competition = portalState.selectedEngagementCompetition || {}) {
        return !competition.qualifications?.enabled && competition.missingEntryTimeMode === "manual";
      }

    function engagementKnownIndividualTimesSelectable(competition = portalState.selectedEngagementCompetition || {}) {
        return !competition.qualifications?.enabled && (engagementManualIndividualTimesAllowed(competition) || (competition.napSource === true && Number(competition.nativeParameters?.saisie) === 0));
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

    function renderQualificationAlert(mount) {
        const alert = portalState.selectedEngagementClubEntry?.qualificationAlert;
        if (!alert) return;
        const scope = qualificationExceptionContext();
        const competitionId = portalState.selectedEngagementCompetitionId;
        const warning = document.createElement("div"); warning.setAttribute("role", "status");
        const text = document.createElement("p");
        text.textContent = `Attention : ${alert.reason}. Engagements supprimés : ${(alert.removed || []).map((item) => `${item.name || ""} ${item.eventCode}`).join(", ")}`;
        const button = document.createElement("button"); button.type = "button"; button.className = "ghost-button admin-button-compact";
        button.textContent = "J’ai pris connaissance";
        const errorText = document.createElement("small");
        button.onclick = async () => {
          button.disabled = true; errorText.textContent = "";
          try {
            await portalActions.flushEngagementClubIndividualEntriesAutosave();
            await portalState.engagementClubEntryMutationQueue;
            if (scope !== qualificationExceptionContext()) return;
            if (portalState.selectedEngagementClubEntry?.napSource === true) {
              const saved = await portalActions.queueEngagementClubEntryMutation({
                competitionId, renderScope: "entries", messageElement: errorText,
                errorPrefix: "Impossible de fermer l’alerte",
                execute: async () => {
                  if (scope !== qualificationExceptionContext()) throw new Error("Le dossier sélectionné a changé.");
                  await portalActions.callFunction("acknowledgeEngagementQualificationAlert", { competitionId, alertAt: alert.at });
                  return portalActions.callFunction("getEngagementClubEntry", { competitionId });
                }
              });
              if (!saved || scope !== qualificationExceptionContext()) return;
              warning.remove();
              return;
            }
            await portalActions.callFunction("acknowledgeEngagementQualificationAlert", { competitionId, alertAt: alert.at });
            if (scope !== qualificationExceptionContext()) return;
            if (portalState.selectedEngagementClubEntry?.qualificationAlert?.at === alert.at) portalState.selectedEngagementClubEntry.qualificationAlert = null;
            if (portalState.engagementClubLastPersistedEntry?.qualificationAlert?.at === alert.at) portalState.engagementClubLastPersistedEntry.qualificationAlert = null;
            warning.remove();
            portalActions.renderEngagementClubEntries();
          } catch (error) { errorText.textContent = error.message || "Impossible de fermer l’alerte."; }
          finally { button.disabled = false; }
        };
        warning.append(text, button, errorText); mount.prepend(warning);
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
              const result = await finishQualificationJob(jobId);
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
          onDirty: () => { portalActions.markEngagementDetailTabDirty("general"); updateEngagementManualEntryTimeField(); },
          loadSpreadsheet: portalActions.loadImportSpreadsheet,
          loadSources: (cursor, period) => portalActions.callFunction("listEngagementQualificationSources", { cursor, ...period })
        });
        renderQualificationJobActions(competition);
        updateEngagementManualEntryTimeField();
      }

    async function finishQualificationJob(jobId) {
        let result = { state: "preview" }; const removed = [];
        while (["preview", "apply"].includes(result.state)) {
          try {
            result = await portalActions.callFunction("processEngagementQualificationJob", { competitionId: portalState.selectedEngagementCompetition.id, jobId });
          } catch (error) {
            if (error.details?.qualificationJobCancelled && portalState.selectedEngagementCompetition?.qualificationJobId === jobId) portalState.selectedEngagementCompetition.qualificationJobId = "";
            renderQualificationJobActions();
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
              renderQualificationJobActions();
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
          renderQualificationJobActions();
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
            renderQualificationJobActions();
            if (portalState.selectedEngagementCompetition.qualificationJobId) {
              document.querySelector("#adminQualificationJobActions")?.scrollIntoView({ block: "center", behavior: "smooth" });
              throw new Error(pendingMessage);
            }
          }
          throw error;
        }
        if (!result.qualificationJobId) return result;
        portalState.selectedEngagementCompetition.qualificationJobId = result.qualificationJobId;
        renderQualificationJobActions();
        return finishQualificationJob(result.qualificationJobId);
      }

    function updateQualificationCheckboxes(row, previewEntries) {
        if (!portalState.selectedEngagementCompetition?.qualifications?.enabled || !row) return;
        const swimmerId = row.dataset.engagementClubEntrySwimmerId;
        const swimmer = portalActions.selectedEngagementClubSwimmerRows().find((item) => item.swimmerIndexId === swimmerId);
        const entries = previewEntries || portalConfig.engagementClubSwimmerEventTimesCache.get(portalActions.engagementClubSwimmerEventTimesCacheKey(swimmer || { swimmerIndexId: swimmerId })) || [];
        const results = new Map(entries.map((entry) => [entry.eventCode, entry.qualification]));
        const boxes = [...row.querySelectorAll("[data-engagement-club-swimmer-event]")];
        const anchor = boxes.some((box) => box.checked && results.get(box.dataset.engagementClubSwimmerEvent)?.qualified);
        boxes.forEach((box) => {
          const cachedResult = results.get(box.dataset.engagementClubSwimmerEvent);
          const result = cachedResult?.approved && !box.checked ? { ...cachedResult, approved: false,
            allowed: Boolean(cachedResult.exceptionEligible && (cachedResult.qualified || (cachedResult.bonus && (cachedResult.minimum === null || cachedResult.mode === "one")))) } : cachedResult;
          box.dataset.qualificationAnchor = result?.qualified ? "true" : "false";
          box.dataset.qualificationMode = result?.mode || "";
          box.dataset.qualificationApproved = result?.approved ? "true" : "false";
          const blocked = !result || !result.allowed || (result.mode === "one" && !anchor && !result.qualified && !result.approved);
          const override = qualificationExceptionsEnabled() && result?.exceptionEligible;
          box.dataset.qualificationExceptionRequired = blocked && override ? "true" : "false";
          box.hidden = blocked && !override && !box.checked;
          box.disabled = !result || (blocked && !override && !box.checked);
          const minimum = result?.minimum === null ? "Sans minimum" : Number.isInteger(result?.minimum) ? `Minimum : ${global.LivePalmesEngagementQualifications.display(result.minimum)}` : "";
          const proof = result?.proof ? `${global.LivePalmesEngagementQualifications.display(result.proof.timeValue)} · ${result.proof.date} · ${result.proof.location}` : "";
          box.title = result ? [result.approved ? "Exception nationale enregistrée" : "", minimum, proof, blocked && result.allowed ? "Cochez d’abord une course qualifiée." : result.reason].filter(Boolean).join(" · ") : "Vérification des qualifications…";
          box.closest("label")?.setAttribute("title", box.title);
        });
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
        if (portalContext.elements.engagementsEditDeadline) portalContext.elements.engagementsEditDeadline.value = isoToDatetimeLocal(competition.entryDeadlineAt);
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
        updateEngagementSportFields(competition);
        updateEngagementEditFormAccess();
        updateEngagementQualificationFields("edit");
        updateEngagementMaxEventsFields("edit");
        renderQualificationEditor();
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
          fillEngagementEditForm();
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
        renderEngagementFees(portalState.selectedEngagementCompetition || {});
        if(editing && portalState.selectedEngagementCompetition.napSource === true) portalState.nativeCompetitionEditBaseline = portalActions.nativeCompetitionFormValues();
      }

    function formatShortDate(value) {
        if (!value) return "-";
        const date = new Date(`${value}T12:00:00`);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
      }

    function formatDeadline(value) {
        if (!value) return "Limite non definie";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return `Limite ${date.toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })}`;
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

    function engagementLevelLabel(level) {
        return {
          departemental: "Départemental",
          regional: "Régional",
          national: "National",
          international: "International"
        }[level] || "Régional";
      }

    function engagementStatusLabel(status) {
        return {
          upcoming: "À venir",
          open: "Ouverts",
          closed: "Fermés"
        }[status] || "À venir";
      }

    function engagementDeadlineTone(competition = {}) {
        const status = competition.entryStatus || "upcoming";
        if (status !== "open" || !competition.entryDeadlineAt) return status;
        const deadline = new Date(competition.entryDeadlineAt);
        if (Number.isNaN(deadline.getTime())) return status;
        const remainingMs = deadline.getTime() - Date.now();
        if (remainingMs <= 0) return "deadline-passed";
        if (remainingMs <= 72 * 60 * 60 * 1000) return "closing-soon";
        return status;
      }

    function engagementOperationalStatusLabel(competition = {}) {
        const tone = engagementDeadlineTone(competition);
        if (tone === "deadline-passed") return "Date limite dépassée";
        if (tone === "closing-soon") return "Fermeture proche";
        return engagementStatusLabel(competition.entryStatus);
      }

    function formatEngagementCompetitionDate(competition = {}) {
        const start = formatShortDate(competition.date);
        const end = formatShortDate(competition.endDate || competition.date);
        return competition.endDate && competition.endDate !== competition.date
          ? `${start} au ${end}`
          : start;
      }

    function engagementDeadlineDisplay(competition = {}) {
        const status = competition.entryStatus || "upcoming";
        if (status !== "open") return "";
        if (!competition.entryDeadlineAt) return "Engagements ouverts";
        const deadline = new Date(competition.entryDeadlineAt);
        if (Number.isNaN(deadline.getTime())) return "Engagements ouverts";
        const remainingMs = deadline.getTime() - Date.now();
        if (remainingMs <= 0) return "Date limite dépassée";
        const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        const parts = [];
        if (days) parts.push(`${days} j`);
        if (days || hours) parts.push(`${hours} h`);
        parts.push(`${minutes} min`);
        return `Ferme dans ${parts.join(" ")}`;
      }

    function renderEngagementDetailStatus(competition) {
        const badge = portalContext.elements.engagementsDetailEntryStatus;
        if (!badge) return;
        const tone = engagementDeadlineTone(competition);
        const label = competition.canceled ? "Compétition annulée"
          : tone === "deadline-passed" ? "Date limite dépassée"
          : tone === "closing-soon" ? "Engagements ouverts — fermeture proche"
          : `Engagements ${engagementStatusLabel(competition.entryStatus).toLocaleLowerCase("fr-FR")}`;
        badge.textContent = label;
        badge.dataset.entryStatus = competition.canceled ? "closed" : tone;
        badge.hidden = false;
        badge.setAttribute("aria-label", `Statut : ${label}`);
        if (portalContext.elements.engagementsDetailDeadline) {
          const validDeadline = competition.entryDeadlineAt && !Number.isNaN(new Date(competition.entryDeadlineAt).getTime());
          portalContext.elements.engagementsDetailDeadline.hidden = !validDeadline;
          portalContext.elements.engagementsDetailDeadline.textContent = validDeadline ? `Date limite : ${formatDeadline(competition.entryDeadlineAt).replace(/^Limite /, "")}` : "";
        }
      }

    function refreshEngagementDeadlineCountdowns() {
        if (portalState.selectedEngagementCompetition && portalContext.elements.engagementsDetail && !portalContext.elements.engagementsDetail.hidden) renderEngagementDetailStatus(portalState.selectedEngagementCompetition);
        document.querySelectorAll("[data-engagement-deadline-competition-id]").forEach((node) => {
          const competition = portalState.engagementCompetitions.find((item) => item.id === node.dataset.engagementDeadlineCompetitionId);
          if (!competition) return;
          node.textContent = engagementDeadlineDisplay(competition);
          node.dataset.entryStatus = engagementDeadlineTone(competition);
        });
      }

    function engagementCompetitionMonthLabel(competition = {}) {
        if (!competition.date) return "Date à confirmer";
        const date = new Date(`${competition.date}T12:00:00`);
        if (Number.isNaN(date.getTime())) return "Date à confirmer";
        const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        const monthLabel = label.charAt(0).toUpperCase() + label.slice(1);
        return engagementCompetitionIsInSeptemberPreview(competition, engagementCalendarFiltersPayload())
          ? `${monthLabel} — saison suivante`
          : monthLabel;
      }

    function engagementCompetitionAction(competition = {}) {
        if (portalActions.isEngagementAdminMode()) {
          return {
            label: "Administrer",
            tab: "general"
          };
        }
        if (competition.entryStatus === "open" && engagementDeadlineTone(competition) !== "deadline-passed") {
          const rememberedTab = portalActions.storedEngagementDetailTab(competition.id);
          const hasClubEntry = competition.clubEntryExists === true;
          return hasClubEntry
            ? { label: "Mes engagements", tab: rememberedTab || "team" }
            : { label: "S’engager", tab: "team" };
        }
        if (competition.entryStatus === "closed" || engagementDeadlineTone(competition) === "deadline-passed") {
          return { label: "Consulter le récapitulatif", tab: "summary" };
        }
        return { label: "Voir les informations", tab: "general" };
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
        persistActiveEngagementCalendarCache();
      }

    function engagementPoolLengthLabel(value) {
        return ["25", "33", "50"].includes(String(value || "")) ? `${value} m` : "-";
      }

    function engagementPoolLabel(competition = {}) {
        const length = engagementPoolLengthLabel(competition.poolLength);
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
          : engagementPoolLabel(competition);
        const timing = engagementTimingTypeLabel(competition.timingType);
        const timingLabel = timing === "Non renseigné"
          ? "Chronométrage non renseigné"
          : `Chronométrage ${timing.toLocaleLowerCase("fr-FR")}`;
        return `${facility} · ${timingLabel}`;
      }

    function engagementQualificationPeriodLabel(competition = {}) {
        if (competition.napSource === true && !competition.qualificationTimesMode) return "Période NAP non renseignée";
        if (competition.qualificationTimesMode !== "period") return "Meilleur temps parmi tous les temps connus";
        const start = formatShortDate(competition.qualificationStartDate);
        const end = formatShortDate(competition.qualificationEndDate);
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
        if (competition.napSource === true && !competition.missingEntryTimeMode) return `${engagementQualificationPeriodLabel(competition)} · paramètres natifs conservés`;
        const manualLabel = engagementManualIndividualTimesAllowed(competition)
          ? "saisie manuelle autorisée"
          : "saisie manuelle non autorisée";
        return `${engagementQualificationPeriodLabel(competition)} · ${manualLabel}`;
      }

    function engagementMaxEventsLabel(value) {
        const count = Math.trunc(Number(value) || 0);
        return count > 0 ? `${count} épreuve${count > 1 ? "s" : ""}` : "Non limité";
      }

    function engagementFeeAmount(value) {
        const amount = Number(value);
        return Number.isFinite(amount) && amount > 0 ? amount : 0;
      }

    function formatEngagementFee(value) {
        const amount = engagementFeeAmount(value);
        return amount
          ? `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`
          : "0,00 EUR";
      }

    function engagementFeesSummary(fees = {}) {
        if (fees.enabled === false) return "Aucun frais d'engagement";
        const parts = [
          `nageur ${formatEngagementFee(fees.swimmerFee)}`,
          `course ${formatEngagementFee(fees.individualEventFee)}`,
          `relais ${formatEngagementFee(fees.relayFee)}`
        ];
        return parts.join(" - ");
      }

    function engagementExternalHttpUrl(value) {
        const rawValue = String(value || "").trim();
        if (!rawValue) return "";
        try {
          const url = new URL(rawValue);
          return ["http:", "https:"].includes(url.protocol) ? url.href : "";
        } catch (_) {
          return "";
        }
      }

    function engagementEmailLinkValue(value) {
        const email = String(value || "").trim().toLocaleLowerCase("fr-FR");
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          ? { href: `mailto:${email}`, label: email, kind: "email" }
          : email;
      }

    function engagementRowValueHtml(value) {
        if (!value || typeof value !== "object" || !value.href) return portalActions.escapeHtml(value);
        if (value.kind === "whatsapp") {
          const url = engagementTeamLeadersWhatsAppUrl(value.href);
          if (!url) return "";
          return `<a class="whatsapp-qr-trigger" href="${portalActions.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" data-whatsapp-qr-url="${portalActions.escapeHtml(url)}" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 14h2v2h-2zM18 14h2v3h-2zM14 18h3v2h-3zM19 19h1v1h-1z"></path></svg><span>${portalActions.escapeHtml(value.label || "Afficher le groupe WhatsApp")}</span></a>`;
        }
        const payment = value.kind === "payment";
        return `<a class="${payment ? "admin-engagements-payment-link" : "admin-engagements-contact-link"}" href="${portalActions.escapeHtml(value.href)}"${payment ? ' target="_blank" rel="noopener noreferrer"' : ""}>${portalActions.escapeHtml(value.label)}</a>`;
      }

    function engagementTeamLeadersWhatsAppUrl(value) {
        const url = String(value || "").trim();
        return /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{10,}\/?$/i.test(url) ? url : "";
      }

    function engagementTeamLeadersWhatsAppValue(competition = {}) {
        if (!["national", "international"].includes(competition.level)) return null;
        const url = engagementTeamLeadersWhatsAppUrl(competition.teamLeadersWhatsAppUrl);
        return url ? { href: url, label: "Afficher le groupe WhatsApp", kind: "whatsapp" } : null;
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
          swimmerFee: enabled ? engagementFeeAmount(portalContext.elements.engagementsSwimmerFee?.value) : 0,
          individualEventFee: enabled ? engagementFeeAmount(portalContext.elements.engagementsIndividualEventFee?.value) : 0,
          relayFee: enabled ? engagementFeeAmount(portalContext.elements.engagementsRelayFee?.value) : 0,
          helloAssoUrl: enabled ? String(portalContext.elements.engagementsHelloAssoUrl?.value || "").trim() : "",
          latePaymentSurcharge: 50
        };
      }

    function selectedCreateEngagementFeesFromForm() {
        const enabled = portalContext.elements.engagementsCreateFeesEnabled?.value === "true";
        return {
          enabled,
          swimmerFee: enabled ? engagementFeeAmount(portalContext.elements.engagementsCreateSwimmerFee?.value) : 0,
          individualEventFee: enabled ? engagementFeeAmount(portalContext.elements.engagementsCreateIndividualEventFee?.value) : 0,
          relayFee: enabled ? engagementFeeAmount(portalContext.elements.engagementsCreateRelayFee?.value) : 0,
          helloAssoUrl: enabled ? String(portalContext.elements.engagementsCreateHelloAssoUrl?.value || "").trim() : "",
          latePaymentSurcharge: 50
        };
      }

    function updateCreateEngagementFeesMode() {
        const enabled = portalContext.elements.engagementsCreateFeesEnabled?.value === "true";
        if (portalContext.elements.engagementsCreateFeesGrid) portalContext.elements.engagementsCreateFeesGrid.hidden = !enabled;
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
        if (portalContext.elements.engagementsSwimmerFeeRead) portalContext.elements.engagementsSwimmerFeeRead.textContent = formatEngagementFee(fees.swimmerFee);
        if (portalContext.elements.engagementsIndividualEventFeeRead) portalContext.elements.engagementsIndividualEventFeeRead.textContent = formatEngagementFee(fees.individualEventFee);
        if (portalContext.elements.engagementsRelayFeeRead) portalContext.elements.engagementsRelayFeeRead.textContent = formatEngagementFee(fees.relayFee);
        if (portalContext.elements.engagementsHelloAssoUrlRead) portalContext.elements.engagementsHelloAssoUrlRead.textContent = fees.helloAssoUrl || "Lien en attente";
        updateEngagementFeesFormMode(canEdit);
        if (portalContext.elements.engagementsFeesSummary) portalContext.elements.engagementsFeesSummary.textContent = engagementFeesSummary(fees);
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

    return {
      updateEngagementDetailStepLabels,
      initializeEngagementCalendarFilters,
      applyEngagementCalendarRegionScope,
      resetEngagementCalendarFilters,
      engagementCalendarFiltersPayload,
      engagementCalendarSeptemberPreview,
      engagementCalendarRequestedRange,
      engagementCalendarScopeKey,
      engagementCalendarCacheKey,
      engagementCalendarCacheCompetition,
      readEngagementCalendarCache,
      writeEngagementCalendarCache,
      activateEngagementCalendarCache,
      persistActiveEngagementCalendarCache,
      upsertEngagementCalendarItemFromServer,
      removeEngagementCalendarItemFromCache,
      invalidateEngagementCalendarCaches,
      engagementCompetitionIsInSeptemberPreview,
      filteredEngagementCompetitions,
      engagementCalendarSections,
      renderCurrentUser,
      renderPortalScopeContext,
      renderEngagementsProfile,
      updateEngagementRegionField,
      updateEngagementInvitedRegionField,
      updateEngagementCreateFormAccess,
      updateEngagementEditFormAccess,
      updateEngagementQualificationFields,
      updateEngagementMaxEventsFields,
      setDefaultEngagementOfficialsRequired,
      prepareCreateCompetitionDialog,
      resetCreateCompetitionDialog,
      openCreateCompetitionDialog,
      syncInvitedRegionChoice,
      openInvitedRegionsDialog,
      closeInvitedRegionsDialog,
      qualificationExceptionContext,
      qualificationExceptionsEnabled,
      renderQualificationExceptionToggle,
      confirmQualificationException,
      engagementManualIndividualTimesAllowed,
      engagementKnownIndividualTimesSelectable,
      clearUncheckedQualificationException,
      renderQualificationAlert,
      updateEngagementManualEntryTimeField,
      renderQualificationJobActions,
      renderQualificationEditor,
      finishQualificationJob,
      updateCompetitionWithQualifications,
      updateQualificationCheckboxes,
      fillEngagementEditForm,
      setEngagementEditMode,
      formatShortDate,
      formatDeadline,
      isoToDatetimeLocal,
      normalizeEngagementDeadlineField,
      syncEngagementEndDate,
      markEngagementEndDateManual,
      engagementLevelLabel,
      engagementStatusLabel,
      engagementDeadlineTone,
      engagementOperationalStatusLabel,
      formatEngagementCompetitionDate,
      engagementDeadlineDisplay,
      renderEngagementDetailStatus,
      refreshEngagementDeadlineCountdowns,
      engagementCompetitionMonthLabel,
      engagementCompetitionAction,
      updateEngagementSportFields,
      mergeNationalClubsIntoAccessReference,
      setSelectedEngagementCompetitionClubEntryExists,
      engagementPoolLengthLabel,
      engagementPoolLabel,
      engagementTimingTypeLabel,
      engagementVenueLabel,
      engagementFacilityLabel,
      engagementQualificationPeriodLabel,
      engagementMissingEntryTimeModeLabel,
      engagementEntryTimeRulesLabel,
      engagementMaxEventsLabel,
      engagementFeeAmount,
      formatEngagementFee,
      engagementFeesSummary,
      engagementExternalHttpUrl,
      engagementEmailLinkValue,
      engagementRowValueHtml,
      engagementTeamLeadersWhatsAppUrl,
      engagementTeamLeadersWhatsAppValue,
      engagementCompetitionProgramOverview,
      selectedEngagementFeesFromForm,
      selectedCreateEngagementFeesFromForm,
      updateCreateEngagementFeesMode,
      updateEngagementFeesFormMode,
      renderEngagementFees
    };
  }
  global.LivePalmesPortalCompetitionSettings = { create };
})(window);
