(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#resetEngagementCalendarFilters */
    function resetEngagementCalendarFilters(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "resetEngagementCalendarFilters", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementCalendarRequestedRange */
    function engagementCalendarRequestedRange(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementCalendarRequestedRange", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementCalendarScopeKey */
    function engagementCalendarScopeKey(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementCalendarScopeKey", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementCalendarCacheKey */
    function engagementCalendarCacheKey(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementCalendarCacheKey", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementCalendarCacheCompetition */
    function engagementCalendarCacheCompetition(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementCalendarCacheCompetition", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#readEngagementCalendarCache */
    function readEngagementCalendarCache(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "readEngagementCalendarCache", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#writeEngagementCalendarCache */
    function writeEngagementCalendarCache(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "writeEngagementCalendarCache", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#activateEngagementCalendarCache */
    function activateEngagementCalendarCache(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "activateEngagementCalendarCache", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#persistActiveEngagementCalendarCache */
    function persistActiveEngagementCalendarCache(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "persistActiveEngagementCalendarCache", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#upsertEngagementCalendarItemFromServer */
    function upsertEngagementCalendarItemFromServer(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "upsertEngagementCalendarItemFromServer", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#removeEngagementCalendarItemFromCache */
    function removeEngagementCalendarItemFromCache(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "removeEngagementCalendarItemFromCache", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#invalidateEngagementCalendarCaches */
    function invalidateEngagementCalendarCaches(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "invalidateEngagementCalendarCaches", args, moduleActions);
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
        // Reads start only after the authorised home has painted, at idle priority.
        global.LivePalmesPortalPreload?.schedule();
        if (global.location.hash === "#club-competitions") void portalActions.restoreEngagementNavigation();
      }

    function renderPortalScopeContext(user = {}) {
        if (!portalContext.elements.scopeContext) return;
        user = portalActions.activeEngagementClubProfile(user);
        const clubScope = user.accessScopes?.["engagements.club.manage"] || {};
        const clubId = portalActions.engagementClubScope(user);
        const referencedClub = portalActions.accessClubFromId(clubId);
        const clubName = referencedClub?.clubName || user.clubName || clubScope.scopeName || "";
        const clubCode = portalActions.clubDisplayCode({ clubId, clubName }, "");
        const clubLabel = clubCode || clubName || (portalActions.canSwitchEngagementClub(portalState.currentAccessProfile || user) ? "Choisir un club" : "");
        const accountClubCode = String(
          referencedClub?.clubCode || user.clubCode || portalState.portalClubCodeReferenceById.get(String(clubId || "").trim())?.clubCode || ""
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#updateEngagementInvitedRegionField */
    function updateEngagementInvitedRegionField(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "updateEngagementInvitedRegionField", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#updateEngagementEditFormAccess */
    function updateEngagementEditFormAccess(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "updateEngagementEditFormAccess", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#setDefaultEngagementOfficialsRequired */
    function setDefaultEngagementOfficialsRequired(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "setDefaultEngagementOfficialsRequired", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#resetCreateCompetitionDialog */
    function resetCreateCompetitionDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "resetCreateCompetitionDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#openCreateCompetitionDialog */
    function openCreateCompetitionDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "openCreateCompetitionDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#syncInvitedRegionChoice */
    function syncInvitedRegionChoice(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "syncInvitedRegionChoice", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#openInvitedRegionsDialog */
    function openInvitedRegionsDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "openInvitedRegionsDialog", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#closeInvitedRegionsDialog */
    function closeInvitedRegionsDialog(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "closeInvitedRegionsDialog", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#confirmQualificationException */
    async function confirmQualificationException(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-settings", "confirmQualificationException", args, moduleActions);
    }

    function engagementManualIndividualTimesAllowed(competition = portalState.selectedEngagementCompetition || {}) {
        return !competition.qualifications?.enabled && competition.missingEntryTimeMode === "manual";
      }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementKnownIndividualTimesSelectable */
    function engagementKnownIndividualTimesSelectable(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementKnownIndividualTimesSelectable", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#clearUncheckedQualificationException */
    function clearUncheckedQualificationException(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "clearUncheckedQualificationException", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#updateEngagementManualEntryTimeField */
    function updateEngagementManualEntryTimeField(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "updateEngagementManualEntryTimeField", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#renderQualificationJobActions */
    function renderQualificationJobActions(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "renderQualificationJobActions", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#renderQualificationEditor */
    function renderQualificationEditor(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "renderQualificationEditor", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#finishQualificationJob */
    async function finishQualificationJob(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-settings", "finishQualificationJob", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#updateCompetitionWithQualifications */
    async function updateCompetitionWithQualifications(...args) {
      return global.LivePalmesPortalDeferred.invoke(portalContext, "competition-settings", "updateCompetitionWithQualifications", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#fillEngagementEditForm */
    function fillEngagementEditForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "fillEngagementEditForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#setEngagementEditMode */
    function setEngagementEditMode(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "setEngagementEditMode", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#isoToDatetimeLocal */
    function isoToDatetimeLocal(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "isoToDatetimeLocal", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#normalizeEngagementDeadlineField */
    function normalizeEngagementDeadlineField(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "normalizeEngagementDeadlineField", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#syncEngagementEndDate */
    function syncEngagementEndDate(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "syncEngagementEndDate", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#markEngagementEndDateManual */
    function markEngagementEndDateManual(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "markEngagementEndDateManual", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementOperationalStatusLabel */
    function engagementOperationalStatusLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementOperationalStatusLabel", args, moduleActions);
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
        portalActions.refreshEngagementCompetitionStatuses?.();
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#updateEngagementSportFields */
    function updateEngagementSportFields(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "updateEngagementSportFields", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#mergeNationalClubsIntoAccessReference */
    function mergeNationalClubsIntoAccessReference(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "mergeNationalClubsIntoAccessReference", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#setSelectedEngagementCompetitionClubEntryExists */
    function setSelectedEngagementCompetitionClubEntryExists(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "setSelectedEngagementCompetitionClubEntryExists", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementPoolLengthLabel */
    function engagementPoolLengthLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementPoolLengthLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementPoolLabel */
    function engagementPoolLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementPoolLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementTimingTypeLabel */
    function engagementTimingTypeLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementTimingTypeLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementVenueLabel */
    function engagementVenueLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementVenueLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementFacilityLabel */
    function engagementFacilityLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementFacilityLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementQualificationPeriodLabel */
    function engagementQualificationPeriodLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementQualificationPeriodLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementMissingEntryTimeModeLabel */
    function engagementMissingEntryTimeModeLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementMissingEntryTimeModeLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementEntryTimeRulesLabel */
    function engagementEntryTimeRulesLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementEntryTimeRulesLabel", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementMaxEventsLabel */
    function engagementMaxEventsLabel(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementMaxEventsLabel", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementFeesSummary */
    function engagementFeesSummary(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementFeesSummary", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementEmailLinkValue */
    function engagementEmailLinkValue(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementEmailLinkValue", args, moduleActions);
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

    /* deferred-function: assets/portal/deferred/competition-settings.js#engagementCompetitionProgramOverview */
    function engagementCompetitionProgramOverview(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "engagementCompetitionProgramOverview", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#selectedEngagementFeesFromForm */
    function selectedEngagementFeesFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "selectedEngagementFeesFromForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#selectedCreateEngagementFeesFromForm */
    function selectedCreateEngagementFeesFromForm(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "selectedCreateEngagementFeesFromForm", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#updateCreateEngagementFeesMode */
    function updateCreateEngagementFeesMode(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "updateCreateEngagementFeesMode", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#updateEngagementFeesFormMode */
    function updateEngagementFeesFormMode(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "updateEngagementFeesFormMode", args, moduleActions);
    }

    /* deferred-function: assets/portal/deferred/competition-settings.js#renderEngagementFees */
    function renderEngagementFees(...args) {
      return global.LivePalmesPortalDeferred.sync(portalContext, "competition-settings", "renderEngagementFees", args, moduleActions);
    }

    const moduleActions = { updateEngagementDetailStepLabels, initializeEngagementCalendarFilters, applyEngagementCalendarRegionScope, resetEngagementCalendarFilters, engagementCalendarFiltersPayload, engagementCalendarSeptemberPreview, engagementCalendarRequestedRange, engagementCalendarScopeKey, engagementCalendarCacheKey, engagementCalendarCacheCompetition, readEngagementCalendarCache, writeEngagementCalendarCache, activateEngagementCalendarCache, persistActiveEngagementCalendarCache, upsertEngagementCalendarItemFromServer, removeEngagementCalendarItemFromCache, invalidateEngagementCalendarCaches, engagementCompetitionIsInSeptemberPreview, filteredEngagementCompetitions, engagementCalendarSections, renderCurrentUser, renderPortalScopeContext, renderEngagementsProfile, updateEngagementRegionField, updateEngagementInvitedRegionField, updateEngagementCreateFormAccess, updateEngagementEditFormAccess, updateEngagementQualificationFields, updateEngagementMaxEventsFields, setDefaultEngagementOfficialsRequired, prepareCreateCompetitionDialog, resetCreateCompetitionDialog, openCreateCompetitionDialog, syncInvitedRegionChoice, openInvitedRegionsDialog, closeInvitedRegionsDialog, qualificationExceptionContext, qualificationExceptionsEnabled, renderQualificationExceptionToggle, confirmQualificationException, engagementManualIndividualTimesAllowed, engagementKnownIndividualTimesSelectable, clearUncheckedQualificationException, renderQualificationAlert, updateEngagementManualEntryTimeField, renderQualificationJobActions, renderQualificationEditor, finishQualificationJob, updateCompetitionWithQualifications, updateQualificationCheckboxes, fillEngagementEditForm, setEngagementEditMode, formatShortDate, formatDeadline, isoToDatetimeLocal, normalizeEngagementDeadlineField, syncEngagementEndDate, markEngagementEndDateManual, engagementLevelLabel, engagementStatusLabel, engagementDeadlineTone, engagementOperationalStatusLabel, formatEngagementCompetitionDate, engagementDeadlineDisplay, renderEngagementDetailStatus, refreshEngagementDeadlineCountdowns, engagementCompetitionMonthLabel, engagementCompetitionAction, updateEngagementSportFields, mergeNationalClubsIntoAccessReference, setSelectedEngagementCompetitionClubEntryExists, engagementPoolLengthLabel, engagementPoolLabel, engagementTimingTypeLabel, engagementVenueLabel, engagementFacilityLabel, engagementQualificationPeriodLabel, engagementMissingEntryTimeModeLabel, engagementEntryTimeRulesLabel, engagementMaxEventsLabel, engagementFeeAmount, formatEngagementFee, engagementFeesSummary, engagementExternalHttpUrl, engagementEmailLinkValue, engagementRowValueHtml, engagementTeamLeadersWhatsAppUrl, engagementTeamLeadersWhatsAppValue, engagementCompetitionProgramOverview, selectedEngagementFeesFromForm, selectedCreateEngagementFeesFromForm, updateCreateEngagementFeesMode, updateEngagementFeesFormMode, renderEngagementFees };
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
