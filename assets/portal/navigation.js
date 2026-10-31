(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    function engagementCompetitionType(competition = {}) {
        if (competition?.sourceType === "calendarEvent") return String(competition.eventType || "other");
        if (competition?.napSource === true) return String(competition.eventType || competition.competitionType || "other");
        return competition?.competitionType === "openWater" ? "openWater" : "pool";
      }

    function engagementCompetitionTypeLabel(value) {
        return {
          pool: "Piscine",
          openWater: "Eau libre",
          training: "Formation",
          stage: "Stage",
          meeting: "Réunion",
          other: "Autre"
        }[value] || "Autre";
      }

    function publicCalendarPublicationLabel(value) {
        return value === "published" ? "Publié" : "Non publié";
      }

    function engagementWaterBodyTypeLabel(value) {
        return { sea: "Mer", lake: "Lac", river: "Rivière", other: "Autre" }[value] || "Non renseigné";
      }

    function engagementOpenWaterEventCode(course = {}) {
        return `OW${Math.trunc(Number(course.distance) || 0)}${course.format === "elimination" ? "ELIM" : ""}${course.discipline || ""}`;
      }

    function engagementOpenWaterEventDefinitions(competition = portalState.selectedEngagementCompetition || {}) {
        const selectedCourseIds = new Set((competition.events || []).map((event) => event.openWaterCourseId).filter(Boolean));
        const coursesById = new Map(portalState.engagementOpenWaterCourses.map((course) => [course.id, course]));
        (competition.events || []).filter((event) => event.openWaterCourseId && event.distance).forEach((event) => {
          if (coursesById.has(event.openWaterCourseId)) return;
          coursesById.set(event.openWaterCourseId, {
            id: event.openWaterCourseId,
            distance: Number(event.distance),
            discipline: event.discipline,
            label: event.label || event.shortLabel,
            format: event.openWaterFormat || "standard",
            active: false
          });
        });
        return Array.from(coursesById.values())
          .filter((course) => course.active !== false || selectedCourseIds.has(course.id))
          .sort((left, right) => Number(left.distance || 0) - Number(right.distance || 0) || left.label.localeCompare(right.label, "fr"))
          .map((course) => ({
          code: engagementOpenWaterEventCode(course),
          type: "individual",
          label: course.label,
          shortLabel: course.label,
          discipline: course.discipline,
          distance: Number(course.distance),
          openWaterCourseId: course.id,
          openWaterFormat: course.format || "standard"
        }));
      }

    function engagementEventDefinitionsForCompetition(competition = portalState.selectedEngagementCompetition || {}) {
        return engagementCompetitionType(competition) === "openWater"
          ? [...engagementOpenWaterEventDefinitions(competition), portalConfig.ENGAGEMENT_OPEN_WATER_RELAY_EVENT]
          : portalConfig.ENGAGEMENT_EVENT_DEFINITIONS;
      }

    function engagementEventDefinition(eventCode = "", competition = portalState.selectedEngagementCompetition || {}) {
        const openWaterMatch = String(eventCode || "").match(/^OW(\d+)(ELIM)?(SF|BI|SUP)$/);
        const openWaterDefinition = openWaterMatch ? (() => {
          const distanceValue = Number(openWaterMatch[1]);
          const format = openWaterMatch[2] ? "elimination" : "standard";
          const discipline = openWaterMatch[3];
          const disciplineLabel = Object.fromEntries(portalConfig.ENGAGEMENT_OPEN_WATER_DISCIPLINES)[discipline];
          const course = portalState.engagementOpenWaterCourses.find((item) =>
            Number(item.distance) === distanceValue && (item.format || "standard") === format && item.discipline === discipline
          ) || {
            id: `${format === "elimination" ? `${distanceValue}-elimination` : distanceValue}-${discipline}`,
            distance: distanceValue,
            discipline,
            label: `${format === "elimination" ? `${distanceValue} m élimination` : `${distanceValue} m`} ${disciplineLabel}`,
            format
          };
          return {
            code: eventCode,
            type: "individual",
            label: course.label,
            shortLabel: course.label,
            discipline,
            distance: distanceValue,
            openWaterCourseId: course.id,
            openWaterFormat: format
          };
        })() : null;
        return engagementEventDefinitionsForCompetition(competition).find((event) => event.code === eventCode) ||
          (competition.events || []).find((event) => event.code === eventCode) ||
          openWaterDefinition ||
          portalConfig.ENGAGEMENT_EVENT_BY_CODE.get(eventCode);
      }

    function ensureEngagementLongOperation() {
        if (!portalState.engagementLongOperation && global.LivePalmesLongOperation?.create) {
          portalState.engagementLongOperation = global.LivePalmesLongOperation.create({
            element: portalContext.elements.engagementsLongOperation,
            busyTargets: [portalContext.elements.engagementsView]
          });
        }
        return portalState.engagementLongOperation;
      }

    function startEngagementLongOperation(title, detail) {
        [
          portalContext.elements.engagementsGenerateClubRecapsButton,
          portalContext.elements.engagementsPrepareOpeningEmailsButton,
          portalContext.elements.engagementsPrepareClubRecapEmailsButton,
          portalContext.elements.engagementsSendOpeningEmailsButton,
          portalContext.elements.engagementsSendClubRecapEmailsButton
        ].filter(Boolean).forEach((control) => {
          if (!portalConfig.engagementLongOperationControlStates.has(control)) portalConfig.engagementLongOperationControlStates.set(control, control.disabled);
          control.disabled = true;
        });
        ensureEngagementLongOperation()?.start({ title, detail });
      }

    function updateEngagementLongOperation(title, detail) {
        ensureEngagementLongOperation()?.update({ title, detail });
      }

    function finishEngagementLongOperation(state, title, detail) {
        ensureEngagementLongOperation()?.finish({ state, title, detail });
        portalConfig.engagementLongOperationControlStates.forEach((disabled, control) => { control.disabled = disabled; });
        portalConfig.engagementLongOperationControlStates.clear();
      }

    function ensureFirebaseApp() {
        const firebase = global.firebase;
        const config = global.LivePalmesAppConfig?.firebaseConfig;
        if (!firebase?.initializeApp || !config) return false;
        if (!firebase.apps?.length) firebase.initializeApp(config);
        return true;
      }

    function ensureAdminAuth() {
        if (portalState.adminAuth) return portalState.adminAuth;
        if (!ensureFirebaseApp() || !global.LivePalmesAdminAuth?.init) return null;
        portalState.adminAuth = global.LivePalmesAdminAuth.init({
          firebase: global.firebase,
          authConfig: global.LivePalmesAppConfig?.adminAuth || {}
        });
        global.LivePalmesPortalAuth = portalState.adminAuth;
        portalState.adminAuth.onChange(portalActions.updateView);
        return portalState.adminAuth;
      }

    function functionsService() {
        if (!ensureFirebaseApp() || !global.firebase?.functions) return null;
        try {
          const service = global.firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
          return global.LivePalmesAppConfig?.configureFunctionsService?.(service) || service;
        } catch {
          const service = global.firebase.functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
          return global.LivePalmesAppConfig?.configureFunctionsService?.(service) || service;
        }
      }

    function normalizePortalFrenchError(error) {
        const source = String(error?.message || "");
        const code = String(error?.code || "").replace(/^functions\//, "");
        const technicalMessage = !source || /^(?:(?:Firebase|Error)\s*:\s*|Error\s*\(\s*)*(?:functions\/)?(?:internal|unavailable|deadline[-_ ]exceeded)[).\s]*$/i.test(source) ||
          /^(?:Failed to fetch|Network request failed)$/i.test(source) || /\b(?:ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND)\b/.test(source);
        const serviceMessage = technicalMessage && ({
          unavailable: "Le service LivePalmes est temporairement indisponible. Réessayez le chargement dans quelques instants.",
          "deadline-exceeded": "Le serveur n'a pas répondu à temps. Si vous venez d'enregistrer une modification, vérifiez son état avant de recommencer.",
          internal: "Le service LivePalmes a rencontré une erreur. Vérifiez l'état de votre demande avant de recommencer."
        })[code];
        const message = portalConfig.PORTAL_FRENCH_ERROR_REPLACEMENTS.reduce(
          (value, [pattern, replacement]) => value.replace(pattern, replacement),
          serviceMessage || source
        );
        if (!message || message === source) return error;
        try {
          error.message = message;
          if (error.message === message) return error;
        } catch {}
        const normalizedError = new Error(message);
        normalizedError.code = error?.code;
        normalizedError.details = error?.details;
        return normalizedError;
      }

    function recordPortalCall(name, startedAt, data, ok) {
        const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
        let responseBytes = 0;
        try {
          responseBytes = new TextEncoder().encode(JSON.stringify(data || {})).length;
        } catch {}
        const samples = portalConfig.portalCallSamples.get(name) || [];
        samples.push({ durationMs, responseBytes, ok, measuredAt: new Date().toISOString() });
        if (samples.length > 100) samples.splice(0, samples.length - 100);
        portalConfig.portalCallSamples.set(name, samples);
      }

    function portalCallMetrics() {
        return Object.fromEntries([...portalConfig.portalCallSamples.entries()].map(([name, samples]) => {
          const durations = samples.map((sample) => sample.durationMs).sort((left, right) => left - right);
          const percentile = (ratio) => durations[Math.min(durations.length - 1, Math.max(0, Math.ceil(durations.length * ratio) - 1))] || 0;
          return [name, {
            count: samples.length,
            errorCount: samples.filter((sample) => !sample.ok).length,
            p50Ms: percentile(0.5),
            p95Ms: percentile(0.95),
            lastResponseBytes: samples.at(-1)?.responseBytes || 0
          }];
        }));
      }

    async function callFunction(name, payload) {
        const functions = functionsService();
        if (!functions?.httpsCallable) throw new Error("Cloud Functions LivePalmes indisponibles.");
        const activeClubId = activeEngagementClubIdForProfile(portalState.currentAccessProfile);
        const startedAt = performance.now();
        try {
          const result = await functions.httpsCallable(name)({
            ...(payload || {}),
            ...(activeClubId ? { activeClubId } : {})
          });
          const data = result.data || {};
          recordPortalCall(name, startedAt, data, true);
          return data;
        } catch (error) {
          recordPortalCall(name, startedAt, null, false);
          throw normalizePortalFrenchError(error);
        }
      }

    async function callFunctionWithTimeout(name, payload, timeoutMs = 30000) {
        let timeoutId = null;
        try {
          return await Promise.race([
            callFunction(name, payload),
            new Promise((_, reject) => {
              timeoutId = setTimeout(() => reject(new Error("Délai de lecture dépassé. Réessayez dans quelques instants.")), timeoutMs);
            })
          ]);
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      }

    function downloadBase64File(base64, fileName, contentType = "application/octet-stream") {
        const binary = atob(String(base64 || ""));
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        const url = URL.createObjectURL(new Blob([bytes], { type: contentType }));
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || "livepalmes.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

    function setMessage(message, tone = "error") {
        if (!portalContext.elements.message) return;
        portalContext.elements.message.textContent = message || "";
        portalContext.elements.message.dataset.tone = tone;
      }

    function setAccessMessage(message, tone = "error") {
        if (!portalContext.elements.accessMessage) return;
        portalContext.elements.accessMessage.textContent = message || "";
        portalContext.elements.accessMessage.dataset.tone = tone;
      }

    function setPublicAccessRequestMessage(message, tone = "error") {
        if (!portalContext.elements.publicAccessRequestMessage) return;
        portalContext.elements.publicAccessRequestMessage.textContent = message || "";
        portalContext.elements.publicAccessRequestMessage.dataset.tone = tone;
      }

    function setFormPending(form, pending, pendingLabel = "Traitement en cours…") {
        const button = form?.querySelector("button[type='submit']");
        if (!button) return;
        if (pending) {
          if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent.trim();
          button.textContent = pendingLabel;
          button.disabled = true;
          button.classList.add("admin-portal-submit-pending");
          button.setAttribute("aria-busy", "true");
          form.setAttribute("aria-busy", "true");
          return;
        }
        button.textContent = button.dataset.idleLabel || button.textContent;
        button.disabled = false;
        button.classList.remove("admin-portal-submit-pending");
        button.removeAttribute("aria-busy");
        form.removeAttribute("aria-busy");
      }

    function setAccountMessage(element, message, tone = "error") {
        if (!element) return;
        element.textContent = message || "";
        element.dataset.tone = tone;
      }

    function markLastRefresh(element) {
        if (element) element.dataset.lastRefreshAt = new Date().toISOString();
      }

    function lastRefreshTime(element) {
        const value = element?.dataset.lastRefreshAt || "";
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
      }

    function lastRefreshSuffix(element) {
        const time = lastRefreshTime(element);
        return time ? ` Dernière actualisation à ${time}.` : "";
      }

    function toggleLoginPasswordVisibility() {
        if (!portalContext.elements.password || !portalContext.elements.passwordToggle) return;
        const visible = portalContext.elements.password.type === "password";
        portalContext.elements.password.type = visible ? "text" : "password";
        portalContext.elements.passwordToggle.textContent = visible ? "Masquer" : "Afficher";
        portalContext.elements.passwordToggle.setAttribute("aria-pressed", visible ? "true" : "false");
      }

    function closeAccountMenu() {
        portalContext.elements.accountToggle?.setAttribute("aria-expanded", "false");
        if (portalContext.elements.accountActions) portalContext.elements.accountActions.hidden = true;
      }

    function canManagePerformances() {
        return canUse("records.manage") || canUse("competitions.import");
      }

    function setPortalNavigationPinned(pinned, { persist = true } = {}) {
        const nextPinned = Boolean(pinned);
        if (nextPinned) portalContext.elements.sidebar?.classList.remove("is-collapsed-after-navigation");
        portalContext.elements.sidebar?.classList.toggle("is-pinned", nextPinned);
        portalContext.elements.navPin?.setAttribute("aria-pressed", nextPinned ? "true" : "false");
        const label = nextPinned ? "Libérer la navigation" : "Épingler la navigation ouverte";
        portalContext.elements.navPin?.setAttribute("aria-label", label);
        if (portalContext.elements.navPin) portalContext.elements.navPin.title = label;
        if (!persist) return;
        try {
          global.localStorage?.setItem(portalConfig.PORTAL_NAV_PIN_STORAGE_KEY, nextPinned ? "true" : "false");
        } catch {}
      }

    function restorePortalNavigationPinned() {
        let pinned = false;
        try {
          pinned = global.localStorage?.getItem(portalConfig.PORTAL_NAV_PIN_STORAGE_KEY) === "true";
        } catch {}
        setPortalNavigationPinned(pinned, { persist: false });
      }

    function initializePortalNavigationLabels() {
        portalContext.elements.navigation?.querySelectorAll("a, .admin-portal-nav-parent").forEach((item) => {
          if (item.title) return;
          const label = item.querySelector(":scope > span:not(.admin-portal-nav-icon)")?.textContent?.trim() || item.textContent?.trim();
          if (label) item.title = label;
        });
      }

    function setMobilePortalNavigationOpen(open) {
        const expanded = Boolean(open);
        portalContext.elements.navToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
        portalContext.elements.sidebar?.classList.toggle("is-open", expanded);
        const label = `${expanded ? "Fermer" : "Ouvrir"} le menu de navigation`;
        portalContext.elements.navToggle?.setAttribute("aria-label", label);
        if (portalContext.elements.navToggle) portalContext.elements.navToggle.title = label;
      }

    function collapsePortalNavigationAfterSelection() {
        const mobileNavigation = global.matchMedia?.("(max-width: 1080px)")?.matches;
        if (mobileNavigation) {
          setMobilePortalNavigationOpen(false);
        }
      }

    function canManageEngagements() {
        return canUse("engagements.club.manage") ||
          canUse("engagements.region.manage") ||
          canUse("engagements.national.manage");
      }

    function canViewActivityLog() {
        return canUse("admin.full");
      }

    function canAccessEngagementsView() {
        return canManageEngagements() || canViewActivityLog();
      }

    function canCreateEngagementCompetition() {
        return canUse("engagements.region.manage") || canUse("engagements.national.manage");
      }

    function canDeleteEngagementCompetitionDirectly() {
        return canUse("engagements.national.manage");
      }

    function canDeleteEngagementCompetitionImmediately(competition = {}) {
        return canDeleteEngagementCompetitionDirectly() || (
          canEditEngagementCompetition(competition) && (competition.entryStatus || "upcoming") === "upcoming"
        );
      }

    function canReviewEngagementAccessRequests() {
        return canUse("engagements.region.manage") || canUse("engagements.national.manage");
      }

    function canAccessEngagementRoute(entry) {
        if (["club", "clubSwimmers", "clubPeople"].includes(entry)) {
          return canUse("engagements.club.manage");
        }
        if (entry === "adminDeletionRequests") return canDeleteEngagementCompetitionDirectly();
        if (entry === "adminAudit") return canViewActivityLog();
        if (entry === "adminAccessRequests") return canReviewEngagementAccessRequests();
        if (entry === "adminCalendar" || entry === "adminCreate") return canCreateEngagementCompetition();
        return false;
      }

    function preferredEngagementRouteHash() {
        if (canUse("engagements.club.manage")) return "#club-competitions";
        if (canCreateEngagementCompetition()) return "#competitions-calendrier";
        if (canViewActivityLog()) return "#administration-historique";
        return "#accueil";
      }

    function canManageAccessDirectory() {
        return canUse("admin.full") || canUse("engagements.region.manage") || canUse("engagements.national.manage");
      }

    function canDeleteAccessUserDirectly() {
        return canUse("engagements.national.manage") || canUse("admin.full");
      }

    function engagementClubScope(user = portalState.currentAccessProfile || {}) {
        const activeClubId = activeEngagementClubIdForProfile(user);
        if (activeClubId) return activeClubId;
        const clubScope = user.accessScopes?.["engagements.club.manage"] || {};
        return clubScope.scopeId || user.clubId || "";
      }

    function canSwitchEngagementClub(user = portalState.currentAccessProfile || {}) {
        const capabilities = new Set(user?.capabilities || []);
        return capabilities.has("engagements.region.manage") || (capabilities.has("engagements.club.manage") && capabilities.has("engagements.club.switch"));
      }

    function activeEngagementClubIdForProfile(user = portalState.currentAccessProfile || {}) {
        if (!portalState.activeEngagementClubId || !canSwitchEngagementClub(user)) return "";
        const club = portalState.accessClubReferenceById.get(portalState.activeEngagementClubId);
        const regional = user.capabilities?.includes("engagements.region.manage") && !user.capabilities?.some(cap => ["admin.full", "engagements.national.manage"].includes(cap));
        return club && (!regional || portalActions.sameLivePalmesRegion(club.regionId, engagementRegionScope(user))) ? club.clubId : "";
      }

    function activeEngagementClubProfile(user = portalState.currentAccessProfile || {}) {
        const activeClubId = activeEngagementClubIdForProfile(user);
        const activeClub = portalActions.accessClubFromId(activeClubId);
        if (!activeClub) return user;
        return {
          ...user,
          clubId: activeClub.clubId,
          clubName: activeClub.clubName,
          regionId: activeClub.regionId || user.regionId || "",
          accessScopes: {
            ...(user.accessScopes || {}),
            "engagements.club.manage": {
              ...(user.accessScopes?.["engagements.club.manage"] || {}),
              scopeType: "club",
              scopeId: activeClub.clubId,
              scopeName: activeClub.clubName
            }
          }
        };
      }

    function restoreActiveEngagementClubFromSession() {
        try {
          portalState.activeEngagementClubId = String(global.sessionStorage?.getItem(portalConfig.PORTAL_ACTIVE_CLUB_SESSION_KEY) || "").trim();
        } catch {
          portalState.activeEngagementClubId = "";
        }
      }

    function clearActiveEngagementClub() {
        portalState.qualificationExceptionScope = "";
        portalState.activeEngagementClubId = "";
        try {
          global.sessionStorage?.removeItem(portalConfig.PORTAL_ACTIVE_CLUB_SESSION_KEY);
        } catch {}
      }

    function setActiveEngagementClub(clubId = "") {
        portalState.qualificationExceptionScope = "";
        const nextClubId = String(clubId || "").trim();
        const homeClubId = portalState.currentAccessProfile?.accessScopes?.["engagements.club.manage"]?.scopeId || portalState.currentAccessProfile?.clubId || "";
        if (!nextClubId || (nextClubId === homeClubId && !portalState.currentAccessProfile?.capabilities?.includes("engagements.region.manage"))) {
          clearActiveEngagementClub();
        } else {
          portalState.activeEngagementClubId = nextClubId;
          try {
            global.sessionStorage?.setItem(portalConfig.PORTAL_ACTIVE_CLUB_SESSION_KEY, nextClubId);
          } catch {}
        }
        resetEngagementClubData();
        portalActions.renderCurrentUser(portalState.currentAccessProfile || {});
        updateNavigationView();
      }

    function resetEngagementClubData() {
        if (portalContext.elements.engagementsClubNewSwimmerDialog?.open) portalContext.elements.engagementsClubNewSwimmerDialog.close();
        if (portalContext.elements.engagementsClubTimesDialog?.open) portalContext.elements.engagementsClubTimesDialog.close();
        if (portalContext.elements.engagementsClubRelayDialog?.open) portalContext.elements.engagementsClubRelayDialog.close();
        if (portalContext.elements.engagementsSwimmerCorrectionDialog?.open) portalContext.elements.engagementsSwimmerCorrectionDialog.close();
        portalState.engagementClubTimesDialogSwimmerId = "";
        portalState.engagementClubTimesDialogLoading = false;
        portalState.engagementClubTimesDialogOpener = null;
        portalState.engagementClubRelayDialogRelayId = "";
        portalState.engagementClubRelayDialogDraft = null;
        portalState.engagementClubRelayDialogOpener = null;
        portalState.engagementClubRelayDialogSaving = false;
        portalConfig.engagementClubEntryTimeHistoryCache.clear();
        portalConfig.engagementClubEntryTimeHistoryRequests.clear();
        portalState.engagementClubEntryMutationRevision += 1;
        portalState.engagementClubLastPersistedEntry = null;
        portalActions.resetEngagementClubEntriesAutosave();
        portalState.engagementClubPersistedSwimmerIds.clear();
        portalActions.setEngagementClubEntriesDirty(false);
        portalState.engagementClubPeople = [];
        portalState.engagementClubPeopleLoaded = false;
        portalState.engagementClubPeopleLoading = false;
        portalState.engagementClubPeopleCursor = null;
        portalState.engagementClubPeopleHasMore = false;
        portalState.engagementClubPeopleRequestVersion += 1;
        portalState.engagementClubPersonSaving=false;
        if(portalContext.elements.engagementsClubPersonForm) {portalContext.elements.engagementsClubPersonForm.inert=false;const button=portalContext.elements.engagementsClubPersonForm.querySelector('button[type="submit"]');if(button) button.disabled=false;}
        portalActions.closeEngagementClubPersonDialog();
        portalContext.elements.engagementsClubPersonForm?.reset();
        if(portalContext.elements.engagementsClubPersonForm) portalContext.elements.engagementsClubPersonForm.hidden=true;
        portalState.engagementClubSwimmers = [];
        portalState.engagementClubSwimmersLoaded = false;
        portalState.engagementClubSwimmersLoading = false;
        portalState.engagementClubSwimmersClubId = "";
        portalState.engagementClubSwimmersCachedAt = 0;
        portalState.engagementClubSwimmersLoadPromise = null;
        portalState.engagementClubSwimmersRenderedCompetitionId = "";
        portalState.engagementClubEntriesRenderedCompetitionId = "";
        portalState.engagementClubRelaysRenderedCompetitionId = "";
        portalState.engagementClubRecapEntries = [];
        portalState.engagementClubRecapEntriesCompetitionId = "";
        portalState.engagementMailJobs = [];
        portalState.engagementMailJobsCompetitionId = "";
        portalState.engagementCompetitionDocumentFiles = [];
        portalState.engagementCompetitionDocumentEditingId = "";
        portalState.engagementCompetitionDocumentSaving = false;
        portalState.selectedEngagementClubEntry = null;
        portalConfig.engagementClubWorkspaceCache.clear();
        portalConfig.engagementClubWorkspaceRequests.clear();
        portalState.engagementSwimmerCorrectionOpener = null;
      }

    function engagementRegionScope(user = portalState.currentAccessProfile || {}) {
        const regionScope = user.accessScopes?.["engagements.region.manage"] || {};
        return regionScope.scopeId || user.regionId || "";
      }

    function canManageEngagementCompetitionScope(competition = portalState.selectedEngagementCompetition || {}) {
        if (!competition?.id) return false;
        const capabilities = new Set(portalState.currentAccessProfile?.capabilities || []);
        if (capabilities.has("engagements.national.manage")) return true;
        return capabilities.has("engagements.region.manage") &&
          !["national", "international"].includes(competition.level) &&
          portalActions.sameLivePalmesRegion(competition.regionId, engagementRegionScope());
      }

    function isRegionalPastEngagementReadOnly(competition = portalState.selectedEngagementCompetition || {}) {
        return competition?.regionalPastReadOnly === true && !canUse("engagements.national.manage");
      }

    function canEditEngagementCompetition(competition = portalState.selectedEngagementCompetition || {}) {
        return (competition.nativeReadOnly !== true || competition.nativeCompetitionEditable === true) && canManageEngagementCompetitionScope(competition) && !isRegionalPastEngagementReadOnly(competition);
      }

    function setPerformanceMenuOpen(open) {
        const expanded = Boolean(open) && canManagePerformances();
        portalContext.elements.performanceToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
        if (portalContext.elements.performanceSubmenu) portalContext.elements.performanceSubmenu.hidden = !expanded;
      }

    function setClubMenuOpen(open) {
        const expanded = Boolean(open) && canUse("engagements.club.manage");
        portalContext.elements.clubToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
        if (portalContext.elements.clubSubmenu) portalContext.elements.clubSubmenu.hidden = !expanded;
      }

    function setDtnMenuOpen(open) {
        const expanded = Boolean(open) && canUse("dtn.view");
        portalContext.elements.dtnToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
        if (portalContext.elements.dtnSubmenu) portalContext.elements.dtnSubmenu.hidden = !expanded;
      }

    function setEngagementsAdminMenuOpen(open) {
        const expanded = Boolean(open) && canCreateEngagementCompetition();
        portalContext.elements.engagementsAdminToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
        if (portalContext.elements.engagementsAdminSubmenu) portalContext.elements.engagementsAdminSubmenu.hidden = !expanded;
      }

    function setNationalMenuOpen(open) {
        const expanded = Boolean(open) && (canDeleteEngagementCompetitionDirectly() || canViewActivityLog());
        portalContext.elements.nationalToggle?.removeAttribute("aria-expanded");
        document.getElementById("adminPortalNationalDisclosure")?.setAttribute("aria-expanded", String(expanded));
        if (portalContext.elements.nationalSubmenu) portalContext.elements.nationalSubmenu.hidden = !expanded;
      }

    function setAccessMenuOpen(open) {
        const expanded = Boolean(open) && canManageAccessDirectory();
        portalContext.elements.accessToggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
        if (portalContext.elements.accessSubmenu) portalContext.elements.accessSubmenu.hidden = !expanded;
      }

    function setExclusivePortalMenu(menu, open = true) {
        setClubMenuOpen(Boolean(open) && menu === "club");
        setPerformanceMenuOpen(Boolean(open) && menu === "performance");
        setDtnMenuOpen(Boolean(open) && menu === "dtn");
        setEngagementsAdminMenuOpen(Boolean(open) && menu === "engagementsAdmin");
        setNationalMenuOpen(Boolean(open) && menu === "national");
        setAccessMenuOpen(Boolean(open) && menu === "access");
      }

    function togglePortalSpace(menu, homeView, hash, toggle) {
        const onHome = requestedNavigationView() === homeView;
        const open = onHome ? toggle?.getAttribute("aria-expanded") !== "true" : true;
        setExclusivePortalMenu(menu, open);
        if (!onHome) global.location.hash = `#${hash}`;
      }

    function setOverviewSpaceExpanded(card, expanded) {
        if (!card) return;
        const toggle = card.querySelector(".admin-overview-space-toggle");
        const label = toggle?.querySelector("span:first-child");
        card.classList.toggle("is-expanded", Boolean(expanded));
        toggle?.setAttribute("aria-expanded", expanded ? "true" : "false");
        if (label) {
          label.textContent = expanded
            ? "Masquer les rubriques"
            : "Afficher les rubriques";
        }
      }

    function updateOverviewSpaceTools() {
        document.querySelectorAll("[data-overview-space]").forEach((card) => {
          const visibleTools = Array.from(card.querySelectorAll("[data-overview-tool]")).filter((tool) => !tool.hidden);
          card.dataset.overviewToolCount = String(visibleTools.length);
          const toggle = card.querySelector(".admin-overview-space-toggle");
          if (toggle) toggle.hidden = visibleTools.length === 0;
          setOverviewSpaceExpanded(card, card.classList.contains("is-expanded") && visibleTools.length > 0);
        });
      }

    function isEngagementAdminMode() {
        return portalState.activeEngagementsNavEntry.startsWith("admin");
      }

    function engagementNavigationMode(entry = portalState.activeEngagementsNavEntry) {
        return String(entry || "").startsWith("admin") ? "admin" : "club";
      }

    function engagementNationalPageTitle(tab = portalState.activeEngagementNationalTab) {
        return {
          deletions: "Demandes à traiter",
          clubs: "Clubs",
          licenses: "Vérification des licences",
          swimmers: "Nageurs",
          people: "Officiels",
          audit: "Journal d'activité"
        }[tab] || "Administration nationale";
      }

    function renderEngagementClubContext(user = portalState.currentAccessProfile || {}) {
        if (!portalContext.elements.engagementsClubContext) return;
        const profileClubId = String(user.clubId || "").trim();
        const profileClubCode = user.clubCode;
        user = activeEngagementClubProfile(user);
        const clubId = engagementClubScope(user);
        const clubLabel = clubId ? portalActions.clubDisplayCode({ clubId, clubName: user.clubName, clubCode: clubId === profileClubId ? profileClubCode : "" }, "") : "";
        const visible = !isEngagementAdminMode() && canUse("engagements.club.manage") && Boolean(clubLabel);
        portalContext.elements.engagementsClubContext.hidden = !visible;
        if (portalContext.elements.engagementsClubContextName) portalContext.elements.engagementsClubContextName.textContent = clubLabel || "Votre club";
      }

    function updateEngagementsModeView() {
        const adminMode = isEngagementAdminMode();
        const regionAllOption = portalContext.elements.engagementsRegionFilter?.options?.[0];
        if (regionAllOption) regionAllOption.textContent = adminMode ? "Toutes les régions" : "Toutes";
        const nextMode = adminMode ? "admin" : "club";
        const previousMode = portalContext.elements.engagementsView?.dataset.engagementsMode || "";
        const peopleMode = portalState.activeEngagementsTab === "clubPeople";
        const swimmersMode = portalState.activeEngagementsTab === "clubSwimmers";
        const accessRequestsMode = portalState.activeEngagementsTab === "accessRequests";
        const adminCalendarMode = adminMode && portalState.activeEngagementsTab === "calendar";
        const createMode = portalState.activeEngagementsTab === "create";
        const nationalMode = portalState.activeEngagementsTab === "deletionRequests";
        if (portalContext.elements.engagementsView) {
          portalContext.elements.engagementsView.dataset.engagementsMode = nextMode;
          portalContext.elements.engagementsView.dataset.engagementsTab = portalState.activeEngagementsTab;
        }
        renderEngagementClubContext();
        if (portalContext.elements.engagementsViewTitle) {
          portalContext.elements.engagementsViewTitle.textContent = accessRequestsMode
            ? "Demandes d'accès"
            : adminCalendarMode
              ? "Compétitions"
              : createMode
                ? "Cr\u00e9er une comp\u00e9tition"
                : nationalMode
                  ? engagementNationalPageTitle()
                  : peopleMode
                    ? "Mes officiels"
                    : swimmersMode
                      ? "Mes nageurs"
                      : "Engagements en comp\u00e9tition";
        }
        const workspaceHead = portalContext.elements.engagementsViewTitle?.closest(".admin-portal-workspace-head");
        workspaceHead?.classList.toggle("admin-overview-head", adminCalendarMode);
        workspaceHead?.classList.toggle("admin-competition-workspace-head", adminCalendarMode);
        workspaceHead?.classList.toggle("admin-tool-workspace-head", !adminCalendarMode);
        if (portalContext.elements.engagementsViewEyebrow) portalContext.elements.engagementsViewEyebrow.hidden = !adminCalendarMode;
        if (portalContext.elements.engagementsViewDescription) portalContext.elements.engagementsViewDescription.hidden = !adminCalendarMode;
        if (portalContext.elements.engagementsCalendarActions) {
          portalContext.elements.engagementsCalendarActions.hidden = !adminCalendarMode || portalContext.elements.engagementsCalendarCard?.dataset.detailOpen === "true";
        }
        if (portalContext.elements.engagementsClubPeopleActions) portalContext.elements.engagementsClubPeopleActions.hidden = !peopleMode;
        if (portalContext.elements.engagementsNationalAuditRefresh) {
          portalContext.elements.engagementsNationalAuditRefresh.hidden = !nationalMode || portalState.activeEngagementNationalTab !== "audit";
        }
        if (portalContext.elements.engagementsDetailEyebrow) portalContext.elements.engagementsDetailEyebrow.hidden = true;
        if (portalContext.elements.engagementsMineFilterLabel) portalContext.elements.engagementsMineFilterLabel.hidden = true;
        if (portalContext.elements.engagementsMineFilter) portalContext.elements.engagementsMineFilter.checked = false;
        if (portalContext.elements.engagementsStatusFilterLabel) portalContext.elements.engagementsStatusFilterLabel.hidden = !adminMode;
        if (portalContext.elements.engagementsStatusSegments) portalContext.elements.engagementsStatusSegments.hidden = adminMode;
        if (portalContext.elements.engagementsAdvancedFilters && previousMode !== nextMode) portalContext.elements.engagementsAdvancedFilters.open = false;
        if (previousMode && previousMode !== nextMode && portalContext.elements.engagementsStatusFilter) {
          portalContext.elements.engagementsStatusFilter.value = "";
          portalState.engagementCompetitionsVisibleLimit = 24;
          portalState.engagementPastCompetitionsVisibleLimit = 24;
          portalState.engagementPastCompetitionsExpanded = false;
        }
        const staleInitialCalendar = !previousMode && portalState.engagementCompetitionsLoaded;
        if ((previousMode && previousMode !== nextMode) || staleInitialCalendar) {
          portalActions.applyEngagementCalendarRegionScope(portalState.currentAccessProfile, nextMode);
          portalState.engagementCompetitions = [];
          portalState.engagementCompetitionsLoaded = false;
          portalState.engagementCompetitionsLoadedRange = "";
          portalState.engagementCompetitionsLoadedCacheKey = "";
          portalState.engagementCompetitionsCachedAt = 0;
        }
        portalActions.syncEngagementStatusSegments();
        portalActions.updateEngagementDetailStepLabels();
        if (!isEngagementAdminMode() && isClubEngagementWorkflowTab(portalState.activeEngagementsDetailTab) && !canOpenClubEngagementTab(portalState.activeEngagementsDetailTab)) {
          setEngagementsDetailTab("team");
        } else {
          setEngagementsDetailTab(portalState.activeEngagementsDetailTab);
        }
      }

    function updateEngagementDirtyTabIndicators() {
        portalContext.elements.engagementsDetailTabButtons?.forEach((button) => {
          const dirty = portalState.dirtyEngagementDetailTabs.has(button.dataset.engagementsDetailTabButton);
          button.dataset.dirty = dirty ? "true" : "false";
        });
        updateEngagementDetailEditState();
      }

    function loadActiveEngagementNationalTab() {
        if (portalState.activeEngagementNationalTab === "audit") {
          if (canViewActivityLog()) portalActions.loadEngagementNationalAuditLogs();
          return;
        }
        if (!canDeleteEngagementCompetitionDirectly()) return;
        if (portalState.activeEngagementNationalTab === "clubs") {
          portalActions.loadEngagementNationalClubs();
        } else if (portalState.activeEngagementNationalTab === "licenses") {
          document.dispatchEvent(new CustomEvent("livepalmes:license-admin-open"));
        } else if (portalState.activeEngagementNationalTab === "swimmers") {
          portalActions.loadEngagementNationalSwimmers();
        } else if (portalState.activeEngagementNationalTab === "people") {
          portalActions.loadEngagementNationalPeople();
        } else {
          portalActions.loadEngagementDeletionRequests();
          portalActions.loadEngagementSwimmerChangeRequests();
          portalActions.loadAccessDeletionRequests();
        }
      }

    function setEngagementNationalTab(tab = "deletions") {
        const allowedTabs = new Set(["deletions", "clubs", "licenses", "swimmers", "people", "audit"]);
        const requestedTab = allowedTabs.has(tab) ? tab : "deletions";
        const nextTab = requestedTab === "audit"
          ? (canViewActivityLog() ? "audit" : "deletions")
          : (canDeleteEngagementCompetitionDirectly() ? requestedTab : "audit");
        portalState.activeEngagementNationalTab = nextTab;
        portalContext.elements.engagementsNationalTabButtons?.forEach((button) => {
          const selected = button.dataset.engagementsNationalTabButton === nextTab;
          button.setAttribute("aria-selected", selected ? "true" : "false");
          button.tabIndex = selected ? 0 : -1;
        });
        portalContext.elements.engagementsNationalPanels?.forEach((panel) => {
          panel.hidden = panel.dataset.engagementsNationalPanel !== nextTab;
        });
        updateEngagementsModeView();
        if (portalState.activeEngagementsTab === "deletionRequests" && requestedNavigationView() === "engagements") {
          loadActiveEngagementNationalTab();
        }
      }

    function renderEngagementNationalOverview(counts = null) {
        const safeCounts = counts && typeof counts === "object" ? counts : null;
        const total = safeCounts ? Math.max(0, Number(safeCounts.total) || 0) : 0;
        if (portalContext.elements.nationalOverviewCounts) portalContext.elements.nationalOverviewCounts.hidden = total === 0;
        if (portalContext.elements.nationalOverviewPendingCount) {
          portalContext.elements.nationalOverviewPendingCount.hidden = total === 0;
          portalContext.elements.nationalOverviewPendingCount.textContent = total > 99 ? "99+" : String(total);
          portalContext.elements.nationalOverviewPendingCount.setAttribute("aria-label", `${total} demande${total > 1 ? "s" : ""} en attente`);
        }
        if (portalContext.elements.nationalOverviewPendingBreakdown) {
          portalContext.elements.nationalOverviewPendingBreakdown.textContent = safeCounts
            ? [
                `${Math.max(0, Number(safeCounts.swimmerChanges) || 0)} correction${Number(safeCounts.swimmerChanges) === 1 ? "" : "s"}`,
                `${Math.max(0, Number(safeCounts.dataDeletions) || 0)} suppression${Number(safeCounts.dataDeletions) === 1 ? "" : "s"} de données`,
                `${Math.max(0, Number(safeCounts.accountDeletions) || 0)} suppression${Number(safeCounts.accountDeletions) === 1 ? "" : "s"} de comptes`
              ].join(" · ")
            : portalState.portalPendingOverviewLoading ? "Comptage en cours..." : "Comptage indisponible";
        }
      }

    function renderPendingBadgeCollection(
        badges,
        count = 0,
        singularLabel = "demande en attente",
        pluralLabel = "demandes en attente"
      ) {
        const safeCount = Math.max(0, Number(count) || 0);
        const accessibleLabel = safeCount === 1
          ? `1 ${singularLabel}`
          : `${safeCount} ${pluralLabel}`;
        badges?.forEach((badge) => {
          badge.hidden = safeCount === 0;
          badge.textContent = safeCount > 99 ? "99+" : String(safeCount);
          badge.setAttribute("aria-label", accessibleLabel);
          badge.title = accessibleLabel;
        });
      }

    function renderPortalPendingOverview(overview = null) {
        const accessCount = Math.max(0, Number(overview?.accessRequests?.pending) || 0);
        const nationalCounts = overview?.nationalRequests && typeof overview.nationalRequests === "object"
          ? overview.nationalRequests
          : null;
        const nationalCount = Math.max(0, Number(nationalCounts?.total) || 0);
        renderPendingBadgeCollection(
          portalContext.elements.accessPendingBadges,
          accessCount,
          "demande d'accès en attente",
          "demandes d'accès en attente"
        );
        renderPendingBadgeCollection(
          portalContext.elements.nationalPendingBadges,
          nationalCount,
          "demande nationale en attente",
          "demandes nationales en attente"
        );
        renderEngagementNationalOverview(nationalCounts);
      }

    async function loadPortalPendingOverview({ force = false } = {}) {
        if (!canManageAccessDirectory() || portalState.portalPendingOverviewLoading) return;
        if (portalState.portalPendingOverviewLoaded && !force) return;
        portalState.portalPendingOverviewLoading = true;
        if (!portalState.portalPendingOverviewLoaded) renderPortalPendingOverview();
        try {
          const result = await callFunction("getPortalPendingRequestOverview", {});
          portalState.portalPendingOverviewLoaded = true;
          renderPortalPendingOverview(result);
        } catch (error) {
          portalState.portalPendingOverviewLoaded = false;
        } finally {
          portalState.portalPendingOverviewLoading = false;
          if (!portalState.portalPendingOverviewLoaded) renderPortalPendingOverview();
        }
      }

    async function loadEngagementNationalOverview({ force = false } = {}) {
        if (!canDeleteEngagementCompetitionDirectly()) return;
        loadNationalAutomaticMailControl(force);
        await loadPortalPendingOverview({ force });
      }

    async function loadNationalAutomaticMailControl(force = false) {
        const panel = document.getElementById('adminNationalMailControl');
        const status = document.getElementById('adminNationalMailControlStatus');
        const button = document.getElementById('adminNationalMailControlToggle');
        if (!panel || !status || !button || !canDeleteEngagementCompetitionDirectly()) return;
        panel.hidden = false;
        if (portalState.nationalAutomaticMailLoading || (!force && Date.now() - portalState.nationalAutomaticMailLoadedAt < 30000)) return;
        portalState.nationalAutomaticMailLoading = true; button.disabled = true;
        try {
          portalState.nationalAutomaticMailControl = await callFunction('getEngagementAutomaticMailControl', {});
          portalState.nationalAutomaticMailLoadedAt = Date.now();
          renderNationalAutomaticMailControl(status, button);
        } catch (error) { portalState.nationalAutomaticMailControl = null; status.textContent = error.message || 'Réglage indisponible.'; }
        finally { portalState.nationalAutomaticMailLoading = false; renderNationalAutomaticMailControls(); }
        button.onclick = async () => {
          const setting = portalState.nationalAutomaticMailControl;
          if (button.disabled || portalState.nationalAutomaticMailLoading || !setting) return;
          const enabled = !setting.enabled;
          if (!global.confirm(enabled ? 'Activer les mails automatiques pour les prochaines notifications ?'
            : 'Désactiver les mails automatiques ? Les mails en attente seront annulés, sans rattrapage à la réactivation.')) return;
          portalState.nationalAutomaticMailLoading = true; renderNationalAutomaticMailControls();
          try {
            // Preserve the server setting: removing a selector must never widen delivery.
            portalState.nationalAutomaticMailControl = await callFunction('updateEngagementAutomaticMailControl', {
              enabled, scope: setting.scope, expectedRevision: setting.revision
            });
            portalState.nationalAutomaticMailLoadedAt = Date.now();
            renderNationalAutomaticMailControl(status, button);
          } catch (error) {
            status.textContent = error.message || 'Modification impossible.';
            portalState.nationalAutomaticMailControl = null; portalState.nationalAutomaticMailLoadedAt = 0;
          } finally {
            portalState.nationalAutomaticMailLoading = false; renderNationalAutomaticMailControls();
            if (!portalState.nationalAutomaticMailControl) loadNationalAutomaticMailControl(true);
          }
        };
      }

    function renderNationalAutomaticMailControls() {
        const button = document.getElementById('adminNationalMailControlToggle');
        if (!button) return;
        const setting = portalState.nationalAutomaticMailControl;
        // Allow emergency switch-off, including an old or unavailable configuration.
        button.disabled = portalState.nationalAutomaticMailLoading || !setting || (!setting.enabled && setting.scope !== 'all');
      }

    function renderNationalAutomaticMailControl(status, button) {
        const setting = portalState.nationalAutomaticMailControl;
        status.textContent = 'Mails automatiques ' + (setting.enabled ? 'activés' : 'désactivés') + '.' + (setting.scope !== 'all' ? ' Configuration nationale à vérifier avant activation.' : '') + (setting.testRecipient ? ' TEST : tous les mails sont dirigés vers ' + setting.testRecipient + '.' : '');
        button.textContent = setting.enabled ? 'Désactiver les mails automatiques' : 'Activer les mails automatiques';
        button.setAttribute('aria-pressed', String(setting.enabled));
      }

    function updateEngagementDetailEditState() {
        if (!portalContext.elements.engagementsEditState) return;
        if (!portalState.selectedEngagementCompetition?.id || !isEngagementAdminMode()) {
          portalContext.elements.engagementsEditState.hidden = true;
          return;
        }
        const canEdit = isEngagementAdminMode() && canEditEngagementCompetition(portalState.selectedEngagementCompetition);
        const regionalPastReadOnly = isRegionalPastEngagementReadOnly(portalState.selectedEngagementCompetition);
        const hasDirty = portalState.dirtyEngagementDetailTabs.size > 0;
        const deletionPending = isEngagementAdminMode() && portalState.selectedEngagementCompetition.deletionRequestStatus === "pending";
        portalContext.elements.engagementsEditState.hidden = false;
        portalContext.elements.engagementsEditState.dataset.state = deletionPending
          ? "deletion-pending"
          : hasDirty
            ? "dirty"
            : portalState.engagementDetailEditing
              ? "editing"
              : canEdit
                ? "readonly"
                : "consultation";
        portalContext.elements.engagementsEditState.textContent = deletionPending
          ? "Suppression demandée"
          : hasDirty
            ? "Modifications non enregistrées"
            : portalState.engagementDetailEditing
              ? "Modification en cours"
              : regionalPastReadOnly
                ? "Événement passé · consultation uniquement"
              : canEdit
                ? "Lecture seule"
                : "Consultation";
      }

    function markEngagementDetailTabDirty(tab = portalState.activeEngagementsDetailTab) {
        if (!portalState.engagementDetailEditing || !isEngagementAdminMode() || !portalState.selectedEngagementCompetition?.id) return;
        portalState.dirtyEngagementDetailTabs.add(tab);
        updateEngagementDirtyTabIndicators();
      }

    function clearEngagementDetailTabDirty(tab) {
        if (tab) {
          portalState.dirtyEngagementDetailTabs.delete(tab);
        } else {
          portalState.dirtyEngagementDetailTabs = new Set();
        }
        updateEngagementDirtyTabIndicators();
      }

    function confirmLeaveDirtyEngagementTab(tab = portalState.activeEngagementsDetailTab) {
        if (!portalState.dirtyEngagementDetailTabs.has(tab)) return true;
        return global.confirm("Des modifications n'ont pas été enregistrées sur cet onglet. Changer d'onglet sans enregistrer ?");
      }

    function resolveEngagementUnsavedDecision(decision = "stay") {
        portalContext.elements.engagementsUnsavedDialog?.close(decision);
        const resolve = portalState.engagementUnsavedDecisionResolver;
        portalState.engagementUnsavedDecisionResolver = null;
        if (resolve) resolve(decision);
      }

    function requestEngagementUnsavedDecision() {
        if (!portalContext.elements.engagementsUnsavedDialog?.showModal) {
          return Promise.resolve(confirmLeaveDirtyEngagementTab() ? "discard" : "stay");
        }
        if (portalState.engagementUnsavedDecisionResolver) return Promise.resolve("stay");
        portalContext.elements.engagementsUnsavedDialog.showModal();
        return new Promise((resolve) => { portalState.engagementUnsavedDecisionResolver = resolve; });
      }

    function discardEngagementDetailTabChanges(tab = portalState.activeEngagementsDetailTab) {
        if (tab === "general") portalActions.fillEngagementEditForm(portalState.selectedEngagementCompetition || {});
        if (tab === "courses") portalActions.renderEngagementEvents(portalState.selectedEngagementCompetition || {});
        if (tab === "fees") portalActions.renderEngagementFees(portalState.selectedEngagementCompetition || {});
        clearEngagementDetailTabDirty(tab);
      }

    function isClubEngagementWorkflowTab(tab = "") {
        return ["documents", "team", "officials", "swimmers", "entries", "relays", "summary"].includes(tab);
      }

    function engagementClubTeamComplete(entry = portalState.selectedEngagementClubEntry || {}) {
        return entry.teamLeaderComplete === true;
      }

    function engagementClubEntryHasParticipants(entry = portalState.selectedEngagementClubEntry || {}) {
        return (Array.isArray(entry.swimmers) && entry.swimmers.length > 0) ||
          (Array.isArray(entry.officials) && entry.officials.length > 0) ||
          (Array.isArray(entry.relays) && entry.relays.length > 0);
      }

    function updateNativeCompetitionPersonCreationButton() {
        const button=portalContext.elements.engagementsClubTeamNativePersonCreate;
        if(!button) return;
        const native=global.LivePalmesEnvironment?.sportingDataSource === "nap" && portalState.selectedEngagementCompetition?.nativeReadOnly===true;
        button.hidden=!native || portalState.selectedEngagementCompetition?.nativeTeamLeaderEditable === true;
        button.disabled=!native || portalState.engagementClubPersonSaving || !canUse("engagements.club.manage") || Boolean(engagementClubWriteLockReason({...portalState.selectedEngagementCompetition,nativeReadOnly:false}));
      }

    function updateEngagementClubTeamLeaderActions(entry = portalState.selectedEngagementClubEntry || {}) {
        const teamLeader = entry.teamLeader || {};
        const nativeLeaderEdit = portalState.selectedEngagementCompetition?.nativeReadOnly === true && portalState.selectedEngagementCompetition?.nativeTeamLeaderEditable === true;
        const writeLockReason = nativeLeaderEdit ? engagementClubWriteLockReason({ ...portalState.selectedEngagementCompetition, nativeReadOnly: false }) : engagementClubWriteLockReason();
        // The form lock includes the summary buttons: restore their states afterwards.
        if (nativeLeaderEdit) portalActions.updateEngagementClubTeamFormMode();
        updateNativeCompetitionPersonCreationButton();
        const teamLeaderComplete = engagementClubTeamComplete(entry);
        const editorVisible = !teamLeaderComplete || portalState.engagementClubTeamEditing;
        if (portalContext.elements.engagementsClubTeamChoices) portalContext.elements.engagementsClubTeamChoices.hidden = !editorVisible;
        if (portalContext.elements.engagementsClubTeamEditCancel) {
          portalContext.elements.engagementsClubTeamEditCancel.hidden = !teamLeaderComplete || !editorVisible;
          portalContext.elements.engagementsClubTeamEditCancel.disabled = portalState.engagementClubTeamSaving;
        }
        if (portalContext.elements.engagementsClubTeamModifyButton) {
          portalContext.elements.engagementsClubTeamModifyButton.hidden = !teamLeaderComplete || editorVisible;
          portalContext.elements.engagementsClubTeamModifyButton.disabled = Boolean(writeLockReason || portalState.engagementClubTeamSaving);
          portalContext.elements.engagementsClubTeamModifyButton.textContent = teamLeader.mode === "renounced" ? "Désigner un chef d’équipe" : "Remplacer";
        }
        if (portalContext.elements.engagementsClubTeamExternalOpen) {
          portalContext.elements.engagementsClubTeamExternalOpen.textContent = teamLeaderComplete && teamLeader.externalClub
            ? "Modifier le chef d’équipe hors du club"
            : "Déclarer exceptionnellement un chef d’équipe hors du club";
        }
        if (portalContext.elements.engagementsClubTeamSaveButton) {
          portalContext.elements.engagementsClubTeamSaveButton.disabled = Boolean(writeLockReason);
          portalContext.elements.engagementsClubTeamSaveButton.textContent = teamLeader.mode === "person" && teamLeaderComplete
            ? "Remplacer le chef d'équipe"
            : "Valider le chef d'équipe";
          if (nativeLeaderEdit) portalContext.elements.engagementsClubTeamSaveButton.textContent = teamLeaderComplete ? "Enregistrer les modifications" : "Valider le chef d'équipe";
        }
        if (portalContext.elements.engagementsClubTeamRemoveButton) {
          const canRemoveTeamLeader = teamLeader.mode === "person" && teamLeaderComplete;
          portalContext.elements.engagementsClubTeamRemoveButton.hidden = !canRemoveTeamLeader || editorVisible;
          portalContext.elements.engagementsClubTeamRemoveButton.disabled = Boolean(writeLockReason || portalState.engagementClubTeamSaving);
          if (nativeLeaderEdit && teamLeader.externalClub) portalContext.elements.engagementsClubTeamRemoveButton.disabled = true;
          portalContext.elements.engagementsClubTeamRemoveButton.title = writeLockReason || "Participer sans chef d’équipe après confirmation de la renonciation au droit de réclamation. Les engagements sont conservés.";
          if (nativeLeaderEdit && teamLeader.externalClub) portalContext.elements.engagementsClubTeamRemoveButton.title = "Déclaration pour un autre club à faire vérifier par le gestionnaire avant retrait.";
        }
      }

    function engagementClubWriteLockReason(competition = portalState.selectedEngagementCompetition || {}) {
        if(competition.qualificationJobId)return "Contrôle des qualifications en cours. Attendez sa validation par l’administration nationale.";
        if (competition.nativeReadOnly === true) return competition.nativeSelectionLockReason || "Ce dossier est consultable. Vérifiez les conditions d’engagement avec l’administration de la compétition.";
        const status = competition.entryStatus || "upcoming";
        if (status === "closed") return "Les engagements sont fermes.";
        if (status !== "open") return "Les engagements ne sont pas ouverts.";
        if (!competition.entryDeadlineAt) return "";
        const deadline = new Date(competition.entryDeadlineAt);
        if (Number.isNaN(deadline.getTime())) return "";
        return deadline.getTime() < Date.now()
          ? "La date limite des engagements est depassee."
          : "";
      }

    function engagementClubWriteLocked() {
        return Boolean(engagementClubWriteLockReason());
      }

    function engagementClubSwimmerSelectionLockReason() {
        const competition=portalState.selectedEngagementCompetition || {};
        return engagementClubWriteLockReason(global.LivePalmesEnvironment?.sportingDataSource === "nap" && competition.nativeSwimmerSelectionEditable===true ? {...competition,nativeReadOnly:false} : competition);
      }

    function engagementClubIndividualEntriesLockReason() {
        const competition=portalState.selectedEngagementCompetition || {};
        return engagementClubWriteLockReason(global.LivePalmesEnvironment?.sportingDataSource === "nap" && competition.nativeIndividualEntriesEditable===true ? {...competition,nativeReadOnly:false} : competition);
      }

    function engagementClubOfficialsLockReason() {
        const competition=portalState.selectedEngagementCompetition || {};
        return engagementClubWriteLockReason(global.LivePalmesEnvironment?.sportingDataSource === "nap" && competition.nativeOfficialsEditable===true ? {...competition,nativeReadOnly:false} : competition);
      }

    function engagementClubRelaysLockReason() {
        const competition=portalState.selectedEngagementCompetition || {};
        return engagementClubWriteLockReason(global.LivePalmesEnvironment?.sportingDataSource === "nap" && competition.nativeRelaysEditable===true ? {...competition,nativeReadOnly:false} : competition);
      }

    function engagementClubTeamLeaderLockReason() {
        const competition = portalState.selectedEngagementCompetition || {};
        return engagementClubWriteLockReason(competition.nativeReadOnly === true && competition.nativeTeamLeaderEditable === true ? {...competition, nativeReadOnly: false} : competition);
      }

    function engagementClubStepLockReason(step) {
        switch (step) {
          case "swimmers": return engagementClubSwimmerSelectionLockReason();
          case "entries": return engagementClubIndividualEntriesLockReason();
          case "officials": return engagementClubOfficialsLockReason();
          case "relays": return engagementClubRelaysLockReason();
          case "summary": return portalState.selectedEngagementCompetition?.napSource === true ? "" : engagementClubWriteLockReason();
          default: return engagementClubWriteLockReason();
        }
      }

    function engagementClubInformationOnly(competition = portalState.selectedEngagementCompetition || {}) {
        return !isEngagementAdminMode() && (competition.entryStatus || "upcoming") === "upcoming";
      }

    function setEngagementClubFormControlsLocked(form, locked) {
        form?.querySelectorAll("input, select, textarea, button").forEach((control) => {
          control.disabled = locked;
        });
      }

    function setEngagementClubCompetitionFormsLocked(locked) {
        [
          portalContext.elements.engagementsClubTeamForm,
          portalContext.elements.engagementsClubOfficialsForm,
          portalContext.elements.engagementsClubSwimmersForm,
          portalContext.elements.engagementsClubEntriesForm,
          portalContext.elements.engagementsClubRelaysForm
        ].forEach((form) => setEngagementClubFormControlsLocked(form, locked));
      }

    function showEngagementClubWriteLock(messageElement) {
        const reason = engagementClubWriteLockReason();
        if (!reason) return false;
        if (messageElement) {
          messageElement.textContent = reason;
          messageElement.dataset.tone = "error";
        }
        return true;
      }

    function canOpenClubEngagementTab(tab = "") {
        if (tab === "documents") return true;
        if (tab === "summary" && engagementClubWriteLocked()) return true;
        return tab === "team" || engagementClubTeamComplete();
      }

    function clubEngagementTabHiddenWhenWriteLocked(tab = "") {
        if(tab==="relays" && !engagementClubRelaysLockReason()) return false;
        if(tab==="officials" && !engagementClubOfficialsLockReason()) return false;
        if(tab==="swimmers" && !engagementClubSwimmerSelectionLockReason()) return false;
        if(tab==="entries" && !engagementClubIndividualEntriesLockReason()) return false;
        return ["officials", "swimmers", "entries", "relays"].includes(tab);
      }

    function engagementDetailTabLabel(tab = "") {
        if (tab === "documents" && !isEngagementAdminMode()) return "Documents";
        return portalConfig.ENGAGEMENT_DETAIL_TAB_LABELS[tab] || tab;
      }

    function engagementDetailTabsForGroup(group = "") {
        const tabs = portalConfig.ENGAGEMENT_DETAIL_TAB_GROUPS[group] || [];
        if (isEngagementAdminMode()) return tabs;
        if (group === "information") return [...tabs, "documents"];
        if (group === "documents") return [];
        return tabs;
      }

    function visibleEngagementDetailTabs() {
        return Array.from(portalContext.elements.engagementsDetailTabButtons || [])
          .filter((button) => !button.hidden)
          .map((button) => button.dataset.engagementsDetailTabButton)
          .filter(Boolean);
      }

    function engagementLastTabStorageKey(competitionId = portalState.selectedEngagementCompetitionId) {
        const clubId = String(engagementClubScope(portalState.currentAccessProfile || {}) || "club").trim();
        return `livepalmes.engagement.lastTab.${clubId}.${String(competitionId || "").trim()}`;
      }

    function storedEngagementDetailTab(competitionId = "") {
        if (!competitionId) return "";
        try {
          const tab = global.localStorage?.getItem(engagementLastTabStorageKey(competitionId)) || "";
          return isClubEngagementWorkflowTab(tab) ? tab : "";
        } catch (_) {
          return "";
        }
      }

    function rememberEngagementDetailTab(tab = "") {
        if (isEngagementAdminMode() || !portalState.selectedEngagementCompetitionId || !isClubEngagementWorkflowTab(tab)) return;
        try {
          global.localStorage?.setItem(engagementLastTabStorageKey(), tab);
        } catch (_) {
          // La navigation reste fonctionnelle si le stockage local est indisponible.
        }
      }

    function setEngagementSaveState(state = "", message = "") {
        const node = portalContext.elements.engagementsSaveState;
        if (!node) return;
        node.hidden = !state;
        node.dataset.state = state;
        node.textContent = message || (state === "saving" ? "Enregistrement en cours…" : state === "saved" ? "Dernier enregistrement confirmé ✓" : state === "error" ? "Enregistrement non confirmé : consultez le message dans l’étape concernée." : "");
      }

    function engagementClubEmptySwimmersHtml(message = "Aucun nageur sélectionné pour cette compétition.") {
        return `<div class="admin-engagements-empty"><p>${portalActions.escapeHtml(message)}</p><button type="button" class="ghost-button admin-button-compact" data-engagement-go-swimmers>Choisir les nageurs</button></div>`;
      }

    function engagementDetailTabGroup(tab = "") {
        if (tab === "documents" && !isEngagementAdminMode()) return "information";
        return Object.entries(portalConfig.ENGAGEMENT_DETAIL_TAB_GROUPS).find(([, tabs]) => tabs.includes(tab))?.[0] || "information";
      }

    function updateEngagementStepNavigation() {
        const tabs = visibleEngagementDetailTabs();
        const activeGroup = engagementDetailTabGroup(portalState.activeEngagementsDetailTab);
        const visibleTabs = new Set(tabs);
        let visibleStepIndex = 0;
        portalContext.elements.engagementsDetailStepButtons?.forEach((button) => {
          const group = button.dataset.engagementStepButton || "";
          const groupVisible = engagementDetailTabsForGroup(group).some((tab) => visibleTabs.has(tab));
          button.hidden = !groupVisible;
          const number = button.querySelector("span");
          if (groupVisible) visibleStepIndex += 1;
          if (number && groupVisible) number.textContent = String(visibleStepIndex);
          button.setAttribute("aria-pressed", group === activeGroup ? "true" : "false");
        });
        portalContext.elements.engagementsDetailTabGroups?.forEach((group) => {
          const groupName = group.dataset.engagementStepGroup || "";
          const visibleGroupTabCount = engagementDetailTabsForGroup(groupName).filter((tab) => visibleTabs.has(tab)).length;
          group.hidden = groupName !== activeGroup || visibleGroupTabCount < 2;
        });
      }

    async function requestEngagementDetailTab(tab) {
        if (tab === portalState.activeEngagementsDetailTab) return;
        if (portalState.dirtyEngagementDetailTabs.has(portalState.activeEngagementsDetailTab)) {
          const decision = await requestEngagementUnsavedDecision();
          if (decision === "stay") return;
          if (decision === "save") {
            const saved = await portalActions.saveEngagementCompetitionDetail(null, { continueEditing: true });
            if (!saved) return;
          } else {
            discardEngagementDetailTabChanges(portalState.activeEngagementsDetailTab);
          }
        }
        if (!isEngagementAdminMode() && engagementClubWriteLocked() && clubEngagementTabHiddenWhenWriteLocked(tab)) {
          setEngagementsDetailTab("summary");
          return;
        }
        if (!isEngagementAdminMode() && isClubEngagementWorkflowTab(tab) && !canOpenClubEngagementTab(tab)) {
          setEngagementsDetailTab("team");
          if (portalContext.elements.engagementsClubTeamMessage) {
            portalContext.elements.engagementsClubTeamMessage.textContent = "Renseignez le chef d'équipe ou confirmez la renonciation avant de commencer les engagements.";
            portalContext.elements.engagementsClubTeamMessage.dataset.tone = "error";
          }
          return;
        }
        setEngagementsDetailTab(tab);
      }

    function setEngagementsTab(tab) {
        portalState.qualificationExceptionScope = "";
        const canCreate = canCreateEngagementCompetition();
        const canNationalRequests = canDeleteEngagementCompetitionDirectly();
        const canAudit = canViewActivityLog();
        const canAccessRequests = canReviewEngagementAccessRequests();
        const canClubPeople = canUse("engagements.club.manage");
        const canClubSwimmers = canUse("engagements.club.manage");
        const allowedTabs = new Set(["calendar"]);
        if (canNationalRequests || canAudit) allowedTabs.add("deletionRequests");
        if (canAccessRequests) allowedTabs.add("accessRequests");
        if (canClubPeople) allowedTabs.add("clubPeople");
        if (canClubSwimmers) allowedTabs.add("clubSwimmers");
        const nextTab = allowedTabs.has(tab) ? tab : "calendar";
        portalState.activeEngagementsTab = nextTab;
        if (nextTab === "accessRequests") {
          portalState.activeEngagementsNavEntry = "adminAccessRequests";
        } else if (nextTab === "deletionRequests") {
          portalState.activeEngagementsNavEntry = portalState.activeEngagementsNavEntry === "adminAudit" ? "adminAudit" : "adminDeletionRequests";
        } else if (nextTab === "clubPeople") {
          portalState.activeEngagementsNavEntry = "clubPeople";
        } else if (nextTab === "clubSwimmers") {
          portalState.activeEngagementsNavEntry = "clubSwimmers";
        } else if (portalState.activeEngagementsNavEntry === "adminCreate" || portalState.activeEngagementsNavEntry === "adminAccessRequests" || portalState.activeEngagementsNavEntry === "adminDeletionRequests" || portalState.activeEngagementsNavEntry === "adminAudit" || portalState.activeEngagementsNavEntry === "clubPeople" || portalState.activeEngagementsNavEntry === "clubSwimmers") {
          portalState.activeEngagementsNavEntry = canCreate ? "adminCalendar" : "club";
        }
        portalContext.elements.engagementsTabButtons?.forEach((button) => {
          const buttonTab = button.dataset.engagementsTabButton;
          const nationalOnly = buttonTab === "deletionRequests";
          const accessRequestsOnly = buttonTab === "accessRequests";
          const clubOnly = buttonTab === "clubPeople";
          const clubSwimmersOnly = buttonTab === "clubSwimmers";
          button.hidden = buttonTab === "create" || (nationalOnly && !canNationalRequests && !canAudit) || (accessRequestsOnly && !canAccessRequests) || (clubOnly && !canClubPeople) || (clubSwimmersOnly && !canClubSwimmers);
          const selected = buttonTab === nextTab;
          button.setAttribute("aria-selected", selected ? "true" : "false");
          button.tabIndex = selected ? 0 : -1;
        });
        portalContext.elements.engagementsTabPanels?.forEach((panel) => {
          const panelTab = panel.dataset.engagementsTabPanel;
          const nationalOnly = panelTab === "deletionRequests";
          const accessRequestsOnly = panelTab === "accessRequests";
          const clubOnly = panelTab === "clubPeople";
          const clubSwimmersOnly = panelTab === "clubSwimmers";
          panel.hidden = panelTab === "create" || panelTab !== nextTab || (nationalOnly && !canNationalRequests && !canAudit) || (accessRequestsOnly && !canAccessRequests) || (clubOnly && !canClubPeople) || (clubSwimmersOnly && !canClubSwimmers);
        });
        if (nextTab === "deletionRequests") setEngagementNationalTab(portalState.activeEngagementNationalTab);
      }

    function setEngagementsDetailTab(tab) {
        const allowedTabs = new Set(["general", "courses", "team", "officials", "swimmers", "entries", "relays", "summary", "statistics", "documents", "delivery"]);
        const adminOnlyTabs = new Set(["statistics", "delivery"]);
        const clubOnlyTabs = new Set(["team", "officials", "swimmers", "entries", "relays", "summary"]);
        const requestedTab = allowedTabs.has(tab) ? tab : "general";
        const clubWriteLocked = !isEngagementAdminMode() && engagementClubWriteLocked();
        const clubInformationOnly = engagementClubInformationOnly();
        const clubOfficialsNotRequired = !isEngagementAdminMode() && portalState.selectedEngagementCompetition?.officialsRequired === false;
        const requestedTabHiddenByClubLock = clubWriteLocked && clubEngagementTabHiddenWhenWriteLocked(requestedTab);
        const nextTab = clubInformationOnly && clubOnlyTabs.has(requestedTab)
          ? "general"
          : requestedTabHiddenByClubLock
          ? "summary"
          : clubOfficialsNotRequired && requestedTab === "officials"
          ? (engagementClubTeamComplete() ? "swimmers" : "team")
          : !isEngagementAdminMode() && adminOnlyTabs.has(requestedTab)
          ? "general"
          : isEngagementAdminMode() && clubOnlyTabs.has(requestedTab)
            ? "general"
            : requestedTab;
        portalState.activeEngagementsDetailTab = nextTab;
        if (!isEngagementAdminMode() && nextTab === "team") updateEngagementClubTeamLeaderActions();
        portalContext.elements.engagementsDetailTabButtons?.forEach((button) => {
          const buttonTab = button.dataset.engagementsDetailTabButton;
          const adminOnly = adminOnlyTabs.has(buttonTab);
          const clubOnly = clubOnlyTabs.has(buttonTab);
          const hiddenByClubLock = clubWriteLocked && clubEngagementTabHiddenWhenWriteLocked(buttonTab);
          const hiddenBecauseOfficialsNotRequired = clubOfficialsNotRequired && buttonTab === "officials";
          const lockedClubStep = !isEngagementAdminMode() && isClubEngagementWorkflowTab(buttonTab) && !canOpenClubEngagementTab(buttonTab);
          const hiddenForMode = (button.hasAttribute("data-engagements-club-documents-tab") && isEngagementAdminMode())
            || (button.hasAttribute("data-engagements-admin-documents-tab") && !isEngagementAdminMode());
          button.hidden = hiddenForMode || (adminOnly && !isEngagementAdminMode()) || (clubOnly && (isEngagementAdminMode() || clubInformationOnly)) || hiddenByClubLock || hiddenBecauseOfficialsNotRequired;
          button.dataset.locked = lockedClubStep ? "true" : "false";
          button.setAttribute("aria-disabled", lockedClubStep ? "true" : "false");
          const selected = buttonTab === nextTab;
          button.setAttribute("aria-selected", selected ? "true" : "false");
          button.tabIndex = selected ? 0 : -1;
        });
        portalContext.elements.engagementsDetailTabPanels?.forEach((panel) => {
          const panelTab = panel.dataset.engagementsDetailTabPanel;
          const adminOnly = adminOnlyTabs.has(panelTab);
          const clubOnly = clubOnlyTabs.has(panelTab);
          const hiddenByClubLock = clubWriteLocked && clubEngagementTabHiddenWhenWriteLocked(panelTab);
          const hiddenBecauseOfficialsNotRequired = clubOfficialsNotRequired && panelTab === "officials";
          panel.hidden = panelTab !== nextTab || (adminOnly && !isEngagementAdminMode()) || (clubOnly && (isEngagementAdminMode() || clubInformationOnly)) || hiddenByClubLock || hiddenBecauseOfficialsNotRequired;
        });
        if (!isEngagementAdminMode() && (nextTab === "team" || nextTab === "officials") && canUse("engagements.club.manage") && !portalState.engagementClubPeopleLoaded) {
          void portalActions.loadEngagementClubPeople({ silent: true });
        }
        if (!isEngagementAdminMode() && (nextTab === "team" || nextTab === "officials" || nextTab === "swimmers" || nextTab === "entries" || nextTab === "relays") && canUse("engagements.club.manage")) {
          if (!portalState.engagementClubSwimmersLoaded) {
            void portalActions.loadEngagementClubSwimmers({ silent: portalState.engagementClubSwimmersLoaded });
          } else if (nextTab === "officials") {
            portalActions.renderEngagementClubOfficials();
          } else if (nextTab === "swimmers" && portalState.engagementClubSwimmersRenderedCompetitionId !== portalState.selectedEngagementCompetitionId) {
            portalActions.renderEngagementClubSwimmers();
          } else if (nextTab === "entries" && portalState.engagementClubEntriesRenderedCompetitionId !== portalState.selectedEngagementCompetitionId) {
            portalActions.renderEngagementClubEntries();
          } else if (nextTab === "relays" && portalState.engagementClubRelaysRenderedCompetitionId !== portalState.selectedEngagementCompetitionId) {
            portalActions.renderEngagementClubRelays();
          }
        }
        if (!isEngagementAdminMode() && nextTab === "summary" && canUse("engagements.club.manage")) {
          portalActions.renderEngagementClubSummary();
        }
        if (isEngagementAdminMode() && nextTab === "statistics") {
          portalActions.loadEngagementCompetitionStatistics();
        }
        if (isEngagementAdminMode() && nextTab === "documents") {
          portalActions.loadEngagementClubRecapFiles();
        }
        if (isEngagementAdminMode() && nextTab === "delivery") {
          portalActions.loadEngagementMailJobs();
        }
        rememberEngagementDetailTab(nextTab);
        updateEngagementStepNavigation();
      }

    function firebaseAccountError(error) {
        const code = String(error?.code || "");
        if (code.includes("wrong-password") || code.includes("invalid-credential")) return "Le mot de passe actuel est incorrect.";
        if (code.includes("email-already-in-use") || code.includes("already-exists")) return "Cette adresse email est déjà utilisée.";
        if (code.includes("invalid-email")) return "L’adresse email n’est pas valide.";
        if (code.includes("weak-password")) return "Le nouveau mot de passe n’est pas assez sécurisé.";
        if (code.includes("too-many-requests")) return "Trop de tentatives. Réessayez dans quelques minutes.";
        if (code.includes("requires-recent-login") || code.includes("failed-precondition")) return "Votre session doit être confirmée à nouveau. Vérifiez votre mot de passe actuel.";
        return error?.message || String(error);
      }

    async function reauthenticateCurrentUser(password) {
        const firebase = global.firebase;
        const user = firebase?.auth?.().currentUser;
        if (!user?.email || !firebase?.auth?.EmailAuthProvider?.credential || !user.reauthenticateWithCredential) {
          throw new Error("Compte Firebase indisponible.");
        }
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
        await user.getIdToken?.(true);
        return user;
      }

    function canUse(capability) {
        const auth = ensureAdminAuth();
        if (capability === "engagements.club.manage" && auth?.hasCapability?.("engagements.region.manage") && activeEngagementClubIdForProfile()) return true;
        if (capability === "dtn.view" || capability.startsWith("engagements.")) {
          return Boolean(auth?.hasCapability?.(capability));
        }
        return Boolean(auth?.hasCapability?.("admin.full") || auth?.hasCapability?.(capability));
      }

    function isClubOnlyPortalProfile() {
        if (!canUse("engagements.club.manage")) return false;
        return ![
          "admin.full",
          "engagements.region.manage",
          "engagements.national.manage",
          "records.manage",
          "competitions.import",
          "dtn.view"
        ].some((capability) => canUse(capability));
      }

    function applyPortalHomeForProfile() {
        const clubOnly = isClubOnlyPortalProfile();
        document.body.dataset.portalHome = clubOnly ? "club" : "overview";
        if (portalContext.elements.homeLink) {
          portalContext.elements.homeLink.href = clubOnly ? "#espace-club" : "#accueil";
          portalContext.elements.homeLink.dataset.adminViewLink = clubOnly ? "clubHome" : "dashboard";
        }
        if (portalContext.elements.homeLabel) portalContext.elements.homeLabel.textContent = clubOnly ? "Accueil club" : "Vue d’ensemble";
        document.dispatchEvent(new CustomEvent("livepalmes:portal-home-change"));
        const removedAccessRequestRoute = global.location.hash === "#demande-acces";
        if (removedAccessRequestRoute || (clubOnly && (!global.location.hash || global.location.hash === "#accueil"))) {
          global.location.hash = clubOnly ? "#espace-club" : "#accueil";
        }
      }

    function updateCapabilityView() {
        document.querySelectorAll("[data-capability-nav]").forEach((item) => {
          item.hidden = !canUse(item.dataset.capabilityNav);
        });
        document.querySelectorAll("[data-engagements-nav], [data-engagements-panel]").forEach((item) => {
          item.hidden = !canAccessEngagementsView();
        });
        document.querySelectorAll("[data-engagements-admin-nav]").forEach((item) => {
          item.hidden = !canCreateEngagementCompetition();
        });
        document.querySelectorAll("[data-engagements-admin-home]").forEach((item) => {
          item.hidden = !canCreateEngagementCompetition();
        });
        document.querySelectorAll("[data-engagements-club-nav]").forEach((item) => {
          item.hidden = !canUse("engagements.club.manage");
        });
        document.querySelectorAll("[data-engagements-club-home]").forEach((item) => {
          item.hidden = !canUse("engagements.club.manage");
        });
        document.querySelectorAll("[data-engagements-national-nav]").forEach((item) => {
          item.hidden = !canDeleteEngagementCompetitionDirectly();
        });
        document.querySelectorAll('[data-engagements-national-target]:not([data-engagements-national-target="audit"])').forEach((item) => {
          item.hidden = !canDeleteEngagementCompetitionDirectly();
        });
        document.querySelectorAll('[data-engagements-national-target="audit"]').forEach((item) => {
          item.hidden = !canViewActivityLog();
        });
        document.querySelectorAll("[data-engagements-national-home]").forEach((item) => {
          item.hidden = !canDeleteEngagementCompetitionDirectly() && !canViewActivityLog();
        });
        document.querySelectorAll("[data-overview-club]").forEach((item) => {
          item.hidden = !canUse("engagements.club.manage");
        });
        document.querySelectorAll("[data-overview-competition]").forEach((item) => {
          item.hidden = !canCreateEngagementCompetition();
        });
        document.querySelectorAll("[data-overview-performance]").forEach((item) => {
          item.hidden = !canManagePerformances();
        });
        document.querySelectorAll("[data-overview-national]").forEach((item) => {
          item.hidden = !canDeleteEngagementCompetitionDirectly() && !canViewActivityLog();
        });
        document.querySelectorAll("[data-engagements-admin-request-nav]").forEach((item) => {
          item.hidden = !canReviewEngagementAccessRequests();
        });
        document.querySelectorAll("[data-access-management-nav], [data-access-management-panel]").forEach((item) => {
          item.hidden = !canManageAccessDirectory();
        });
        if (portalContext.elements.clubMenu) portalContext.elements.clubMenu.hidden = !canUse("engagements.club.manage");
        if (portalContext.elements.nationalMenu) portalContext.elements.nationalMenu.hidden = !canDeleteEngagementCompetitionDirectly() && !canViewActivityLog();
        if (portalContext.elements.accessAdd) portalContext.elements.accessAdd.hidden = !(canUse("admin.full") || canUse("engagements.region.manage"));
        if (portalContext.elements.accessPanel) portalContext.elements.accessPanel.hidden = !(canUse("admin.full") || canUse("engagements.region.manage"));
        if (portalContext.elements.accessDeletionRequestsPanel) portalContext.elements.accessDeletionRequestsPanel.hidden = !canDeleteAccessUserDirectly();
        if (!canDeleteEngagementCompetitionDirectly()) {
          renderPendingBadgeCollection(portalContext.elements.nationalPendingBadges, 0);
          renderEngagementNationalOverview();
        }
        document.querySelectorAll(".admin-national-home-group").forEach((group) => {
          group.hidden = !Array.from(group.querySelectorAll("a")).some((link) => !link.hidden);
        });
        if (!canReviewEngagementAccessRequests()) renderPendingBadgeCollection(portalContext.elements.accessPendingBadges, 0);
        setEngagementsTab(portalState.activeEngagementsTab);
        if (portalContext.elements.performanceMenu) portalContext.elements.performanceMenu.hidden = !canManagePerformances();
        if (portalContext.elements.dtnMenu) portalContext.elements.dtnMenu.hidden = !canUse("dtn.view");
        document.querySelectorAll(".admin-portal-nav-group").forEach((group) => {
          group.hidden = !Array.from(group.children).some((child) => {
            if (child.tagName === "A") return !child.hidden;
            return child.classList?.contains("admin-portal-nav-nested") && !child.hidden;
          });
        });
        document.querySelectorAll("[data-capability-panel]").forEach((item) => {
          item.hidden = !canUse(item.dataset.capabilityPanel);
        });
        updateOverviewSpaceTools();
        setExclusivePortalMenu("", false);
        updateNavigationView();
      }

    function syncEngagementRouteFromHash() {
        let route = portalConfig.ENGAGEMENT_ROUTE_BY_HASH[global.location.hash];
        if (global.location.hash === "#engagements" || (route && !canAccessEngagementRoute(route.entry))) {
          const fallbackHash = preferredEngagementRouteHash();
          if (global.location.hash !== fallbackHash) global.history.replaceState(null, "", fallbackHash);
          route = portalConfig.ENGAGEMENT_ROUTE_BY_HASH[fallbackHash];
        }
        const nationalLanding = ["#administration-nationale", "#administration-annuaires", "#administration-notifications"].includes(global.location.hash);
        if (!route && !nationalLanding) return false;
        const previousMode = portalContext.elements.engagementsView?.dataset.engagementsMode || "";
        const nextMode = route ? engagementNavigationMode(route.entry) : "admin";
        const contextChanged = Boolean(previousMode && previousMode !== nextMode);
        const closesCompetitionDetail = Boolean(portalState.selectedEngagementCompetitionId && (!route || route.tab !== "calendar"));
        if ((contextChanged || closesCompetitionDetail) && portalState.selectedEngagementCompetitionId && !confirmLeaveDirtyEngagementTab()) {
          portalState.activeEngagementsNavEntry = previousMode === "admin" ? "adminCalendar" : "club";
          setEngagementsTab("calendar");
          const previousHash = previousMode === "admin" ? "#competitions-calendrier" : "#club-competitions";
          if (global.location.hash !== previousHash) global.history.replaceState(null, "", previousHash);
          return false;
        }
        if (!route) {
          if (closesCompetitionDetail) portalActions.closeEngagementCompetitionDetail({ skipConfirmation: true });
          return false;
        }
        portalState.activeEngagementsNavEntry = route.entry;
        setEngagementsTab(route.tab);
        if (route.nationalTab) setEngagementNationalTab(route.nationalTab);
        if (contextChanged || closesCompetitionDetail) portalActions.closeEngagementCompetitionDetail({ skipConfirmation: true });
        return true;
      }

    function requestedNavigationView() {
        if (!global.location.hash || global.location.hash === "#accueil") return "dashboard";
        if (global.location.hash === "#espace-club") return "clubHome";
        if (global.location.hash === "#gestion-performances") return "performanceHome";
        if (global.location.hash === "#gestion-acces") return "accessHome";
        if (global.location.hash === "#gestion-utilisateurs") return "access";
        if (global.location.hash === "#mon-compte") return "account";
        if (global.location.hash === "#nouveautes") return "news";
        if (global.location.hash === "#records-mpf") return "records";
        if (global.location.hash === "#import-competitions") return "import";
        if (global.location.hash === "#correction-performance") return "correction";
        if (["#organisation-competitions", "#administration-competitions"].includes(global.location.hash)) return "engagementsAdminHome";
        if (global.location.hash === "#administration-nationale") return "nationalHome";
        if (global.location.hash === "#administration-annuaires") return "nationalDirectories";
        if (global.location.hash === "#administration-notifications") return "nationalNotifications";
        if (["#administration-documents", "#administration-documents-accueil"].includes(global.location.hash)) return "nationalDocuments";
        if (global.location.hash === "#engagements" || portalConfig.ENGAGEMENT_ROUTE_BY_HASH[global.location.hash]) return "engagements";
        if (global.location.hash === "#espace-dtn") return "dtnHome";
        if (["#espace-dtn-france", "#espace-dtn-edf", "#espace-dtn-listes", "#espace-dtn-parametres"].includes(global.location.hash)) return "dtn";
        return "dashboard";
      }

    function updateNavigationView() {
        if (global.LivePalmesNationalDocuments?.beforeNavigate() === false) return;
        document.querySelectorAll("[data-portal-news-nav]").forEach((item) => {
          item.hidden = !canCreateEngagementCompetition() && !canViewActivityLog();
        });
        syncEngagementRouteFromHash();
        const requestedView = requestedNavigationView();
        const accessDenied = (requestedView === "access" || requestedView === "accessHome") && !canManageAccessDirectory();
        const recordsDenied = requestedView === "records" && !canUse("records.manage");
        const importDenied = requestedView === "import" && !canUse("competitions.import");
        const correctionDenied = requestedView === "correction" && !canUse("competitions.import");
        const performanceHomeDenied = requestedView === "performanceHome" && !canManagePerformances();
        const clubHomeDenied = requestedView === "clubHome" && !canUse("engagements.club.manage");
        const dtnDenied = (requestedView === "dtn" || requestedView === "dtnHome") && !canUse("dtn.view");
        const engagementsAdminHomeDenied = requestedView === "engagementsAdminHome" && !canCreateEngagementCompetition();
        const nationalHomeDenied = requestedView === "nationalHome" && !canDeleteEngagementCompetitionDirectly() && !canViewActivityLog();
        const nationalToolsDenied = ["nationalDirectories", "nationalNotifications"].includes(requestedView) && !canDeleteEngagementCompetitionDirectly();
        const nationalDocumentsDenied = requestedView === "nationalDocuments" && !canUse("engagements.national.manage");
        const engagementsDenied = requestedView === "engagements" && !canAccessEngagementsView();
        const newsDenied = requestedView === "news" && !canCreateEngagementCompetition() && !canViewActivityLog();
        const activeView = accessDenied || recordsDenied || importDenied || correctionDenied || performanceHomeDenied || clubHomeDenied || dtnDenied || engagementsAdminHomeDenied || nationalHomeDenied || nationalToolsDenied || nationalDocumentsDenied || engagementsDenied || newsDenied
          ? "dashboard"
          : requestedView;
        document.querySelectorAll("[data-admin-view]").forEach((section) => {
          section.hidden = section.dataset.adminView !== activeView;
        });
        document.querySelectorAll("[data-admin-view-link]").forEach((link) => {
          const dtnHash = link.dataset.dtnGridLink ? `#espace-dtn-${link.dataset.dtnGridLink}` : "";
          const engagementsEntry = link.dataset.engagementsNavEntry || "";
          const engagementLinkMatches = activeView !== "engagements" || !engagementsEntry || engagementsEntry === portalState.activeEngagementsNavEntry;
          const nationalTarget = link.dataset.engagementsNationalTarget || "";
          const nationalLinkMatches = !nationalTarget || nationalTarget === portalState.activeEngagementNationalTab;
          const isActive = link.dataset.adminViewLink === activeView &&
            engagementLinkMatches &&
            nationalLinkMatches &&
            (!dtnHash || global.location.hash === dtnHash);
          link.classList.toggle("active", isActive);
          if (isActive) {
            link.setAttribute("aria-current", "page");
          } else {
            link.removeAttribute("aria-current");
          }
        });
        const performanceSpaceActive = ["performanceHome", "records", "import", "correction"].includes(activeView);
        const dtnSpaceActive = ["dtnHome", "dtn"].includes(activeView);
        const clubSpaceActive = activeView === "clubHome" || (activeView === "engagements" && ["club", "clubSwimmers", "clubPeople"].includes(portalState.activeEngagementsNavEntry));
        const nationalSpaceActive = ["nationalHome", "nationalDirectories", "nationalDocuments", "nationalNotifications"].includes(activeView) || (activeView === "engagements" && ["adminDeletionRequests", "adminAudit"].includes(portalState.activeEngagementsNavEntry));
        const accessSpaceActive = activeView === "accessHome" || activeView === "access" || (activeView === "engagements" && portalState.activeEngagementsNavEntry === "adminAccessRequests");
        const engagementsAdminSpaceActive = activeView === "engagementsAdminHome" || (activeView === "engagements" && portalState.activeEngagementsNavEntry.startsWith("admin") && !["adminAccessRequests", "adminDeletionRequests", "adminAudit"].includes(portalState.activeEngagementsNavEntry));
        const activeMenu = clubSpaceActive ? "club" : performanceSpaceActive ? "performance" : dtnSpaceActive ? "dtn" : nationalSpaceActive ? "national" : accessSpaceActive ? "access" : engagementsAdminSpaceActive ? "engagementsAdmin" : "";
        setExclusivePortalMenu(activeMenu, Boolean(activeMenu));
        [
          [portalContext.elements.clubToggle, activeView === "clubHome" && document.body.dataset.portalHome !== "club"],
          [portalContext.elements.performanceToggle, activeView === "performanceHome"],
          [portalContext.elements.dtnToggle, activeView === "dtnHome"],
          [portalContext.elements.engagementsAdminToggle, activeView === "engagementsAdminHome"],
          [portalContext.elements.nationalToggle, nationalSpaceActive],
          [portalContext.elements.accessToggle, activeView === "accessHome"]
        ].forEach(([toggle, active]) => {
          toggle?.classList.toggle("active", active);
          if (active) toggle?.setAttribute("aria-current", "page");
          else toggle?.removeAttribute("aria-current");
        });
        document.querySelectorAll("[data-national-module]").forEach((link) => {
          link.hidden = link.dataset.nationalModule === "audit" ? !canViewActivityLog() : !canDeleteEngagementCompetitionDirectly();
        });
        document.querySelectorAll("[data-national-directory-menu]").forEach((menu) => { menu.hidden = !canDeleteEngagementCompetitionDirectly(); });
        const directoryActive = activeView === "nationalDirectories" || (activeView === "engagements" && ["clubs", "swimmers", "people"].includes(portalState.activeEngagementNationalTab));
        const directories = document.getElementById("adminPortalNationalDirectoriesSubmenu");
        if (directoryActive && directories) directories.hidden = false;
        document.getElementById("adminPortalNationalDirectoriesDisclosure")?.setAttribute("aria-expanded", String(Boolean(directories && !directories.hidden)));
        const modulesReturn = document.getElementById("adminNationalModulesReturn");
        if (modulesReturn) modulesReturn.hidden = !nationalSpaceActive || activeView === "nationalHome";
        const activeLink = document.querySelector("[data-admin-view-link].active");
        const activeParent = document.querySelector(".admin-portal-nav-parent.active");
        const activeParentLabel = activeParent?.children?.[1]?.textContent?.trim();
        if (portalContext.elements.navCurrent) portalContext.elements.navCurrent.textContent = activeLink?.textContent?.trim() || activeParentLabel || "Navigation";
        const recordsActive = activeView === "records";
        const importActive = activeView === "import";
        const correctionActive = activeView === "correction";
        const engagementsActive = activeView === "engagements";
        const importModuleActive = importActive || correctionActive;
        const performanceModuleActive = recordsActive || importModuleActive;
        if (engagementsActive) updateEngagementsModeView();
        if (portalContext.elements.performanceStyles) portalContext.elements.performanceStyles.disabled = !performanceModuleActive;
        if (portalContext.elements.importStyles) portalContext.elements.importStyles.disabled = !importModuleActive;
        document.body.classList.toggle("performance-admin-page", performanceModuleActive);
        if (recordsActive) portalActions.loadRecordModule();
        if (importModuleActive) portalActions.loadImportModule();
        if (dtnSpaceActive && activeView === "dtn") portalActions.loadDtnModule();
        if (activeView === "nationalHome") loadPortalPendingOverview();
        if (activeView === "nationalNotifications") loadNationalAutomaticMailControl();
        global.LivePalmesNationalDocuments?.setActive(activeView === "nationalDocuments");
        if (engagementsActive && portalState.activeEngagementsTab === "calendar") portalActions.loadEngagementCompetitions();
        if (engagementsActive && global.location.hash === "#club-competitions") void portalActions.restoreEngagementNavigation();
        if (engagementsActive && portalState.activeEngagementsTab === "accessRequests") portalActions.loadEngagementAccessRequests();
        if (engagementsActive && portalState.activeEngagementsTab === "deletionRequests") loadActiveEngagementNationalTab();
        if (engagementsActive && portalState.activeEngagementsTab === "clubPeople") {
          portalActions.loadEngagementClubPeople();
          portalActions.loadEngagementClubSwimmers({ silent: true });
        }
        if (engagementsActive && portalState.activeEngagementsTab === "clubSwimmers") portalActions.loadEngagementClubSwimmers();
        if (activeView === "access") {
          portalActions.loadAccessUsers();
          if (canDeleteAccessUserDirectly()) portalActions.loadAccessDeletionRequests();
        }
      }

    return {
      engagementCompetitionType,
      engagementCompetitionTypeLabel,
      publicCalendarPublicationLabel,
      engagementWaterBodyTypeLabel,
      engagementOpenWaterEventCode,
      engagementOpenWaterEventDefinitions,
      engagementEventDefinitionsForCompetition,
      engagementEventDefinition,
      ensureEngagementLongOperation,
      startEngagementLongOperation,
      updateEngagementLongOperation,
      finishEngagementLongOperation,
      ensureFirebaseApp,
      ensureAdminAuth,
      functionsService,
      normalizePortalFrenchError,
      recordPortalCall,
      portalCallMetrics,
      callFunction,
      callFunctionWithTimeout,
      downloadBase64File,
      setMessage,
      setAccessMessage,
      setPublicAccessRequestMessage,
      setFormPending,
      setAccountMessage,
      markLastRefresh,
      lastRefreshTime,
      lastRefreshSuffix,
      toggleLoginPasswordVisibility,
      closeAccountMenu,
      canManagePerformances,
      setPortalNavigationPinned,
      restorePortalNavigationPinned,
      initializePortalNavigationLabels,
      setMobilePortalNavigationOpen,
      collapsePortalNavigationAfterSelection,
      canManageEngagements,
      canViewActivityLog,
      canAccessEngagementsView,
      canCreateEngagementCompetition,
      canDeleteEngagementCompetitionDirectly,
      canDeleteEngagementCompetitionImmediately,
      canReviewEngagementAccessRequests,
      canAccessEngagementRoute,
      preferredEngagementRouteHash,
      canManageAccessDirectory,
      canDeleteAccessUserDirectly,
      engagementClubScope,
      canSwitchEngagementClub,
      activeEngagementClubIdForProfile,
      activeEngagementClubProfile,
      restoreActiveEngagementClubFromSession,
      clearActiveEngagementClub,
      setActiveEngagementClub,
      resetEngagementClubData,
      engagementRegionScope,
      canManageEngagementCompetitionScope,
      isRegionalPastEngagementReadOnly,
      canEditEngagementCompetition,
      setPerformanceMenuOpen,
      setClubMenuOpen,
      setDtnMenuOpen,
      setEngagementsAdminMenuOpen,
      setNationalMenuOpen,
      setAccessMenuOpen,
      setExclusivePortalMenu,
      togglePortalSpace,
      setOverviewSpaceExpanded,
      updateOverviewSpaceTools,
      isEngagementAdminMode,
      engagementNavigationMode,
      engagementNationalPageTitle,
      renderEngagementClubContext,
      updateEngagementsModeView,
      updateEngagementDirtyTabIndicators,
      loadActiveEngagementNationalTab,
      setEngagementNationalTab,
      renderEngagementNationalOverview,
      renderPendingBadgeCollection,
      renderPortalPendingOverview,
      loadPortalPendingOverview,
      loadEngagementNationalOverview,
      loadNationalAutomaticMailControl,
      renderNationalAutomaticMailControls,
      renderNationalAutomaticMailControl,
      updateEngagementDetailEditState,
      markEngagementDetailTabDirty,
      clearEngagementDetailTabDirty,
      confirmLeaveDirtyEngagementTab,
      resolveEngagementUnsavedDecision,
      requestEngagementUnsavedDecision,
      discardEngagementDetailTabChanges,
      isClubEngagementWorkflowTab,
      engagementClubTeamComplete,
      engagementClubEntryHasParticipants,
      updateNativeCompetitionPersonCreationButton,
      updateEngagementClubTeamLeaderActions,
      engagementClubWriteLockReason,
      engagementClubWriteLocked,
      engagementClubSwimmerSelectionLockReason,
      engagementClubIndividualEntriesLockReason,
      engagementClubOfficialsLockReason,
      engagementClubRelaysLockReason,
      engagementClubTeamLeaderLockReason,
      engagementClubStepLockReason,
      engagementClubInformationOnly,
      setEngagementClubFormControlsLocked,
      setEngagementClubCompetitionFormsLocked,
      showEngagementClubWriteLock,
      canOpenClubEngagementTab,
      clubEngagementTabHiddenWhenWriteLocked,
      engagementDetailTabLabel,
      engagementDetailTabsForGroup,
      visibleEngagementDetailTabs,
      engagementLastTabStorageKey,
      storedEngagementDetailTab,
      rememberEngagementDetailTab,
      setEngagementSaveState,
      engagementClubEmptySwimmersHtml,
      engagementDetailTabGroup,
      updateEngagementStepNavigation,
      requestEngagementDetailTab,
      setEngagementsTab,
      setEngagementsDetailTab,
      firebaseAccountError,
      reauthenticateCurrentUser,
      canUse,
      isClubOnlyPortalProfile,
      applyPortalHomeForProfile,
      updateCapabilityView,
      syncEngagementRouteFromHash,
      requestedNavigationView,
      updateNavigationView
    };
  }
  global.LivePalmesPortalNavigation = { create };
})(window);
