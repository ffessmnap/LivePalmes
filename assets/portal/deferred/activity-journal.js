(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("activity-journal", function create(portalContext, moduleActions) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function searchEngagementNationalAuditActors(query = "", sequence = 0) {
        if (query.length < 2) return;
        if (portalContext.elements.engagementsNationalAuditActorSearch) portalContext.elements.engagementsNationalAuditActorSearch.setAttribute("aria-busy", "true");
        try {
          const result = await portalActions.callFunction("listAccessUsers", { pageSize: 25, search: query });
          if (sequence !== portalState.engagementNationalAuditActorSearchSequence) return;
          moduleActions.renderEngagementNationalAuditActorSuggestions(Array.isArray(result.users) ? result.users : []);
        } catch {
          if (sequence === portalState.engagementNationalAuditActorSearchSequence) moduleActions.renderEngagementNationalAuditActorSuggestions([]);
        } finally {
          if (sequence === portalState.engagementNationalAuditActorSearchSequence && portalContext.elements.engagementsNationalAuditActorSearch) {
            portalContext.elements.engagementsNationalAuditActorSearch.removeAttribute("aria-busy");
          }
        }
      }

    async function loadEngagementNationalAuditLogs({ force = false, silent = false, append = false } = {}) {
        if (!portalActions.canViewActivityLog() || portalState.engagementNationalAuditLogsLoading) return;
        if (portalState.engagementNationalAuditLogsLoaded && !force && !append) return;
        if (append && (!portalState.engagementNationalAuditHasMore || !portalState.engagementNationalAuditNextCursor)) return;
        portalState.engagementNationalAuditLogsLoading = true;
        if (force) {
          portalState.engagementNationalAuditLogs = [];
          portalState.engagementNationalAuditNextCursor = null;
          portalState.engagementNationalAuditHasMore = false;
        }
        if (portalContext.elements.engagementsNationalAuditRefresh) portalContext.elements.engagementsNationalAuditRefresh.disabled = true;
        if (portalContext.elements.engagementsNationalAuditLoadMore) portalContext.elements.engagementsNationalAuditLoadMore.disabled = true;
        if (portalContext.elements.engagementsNationalAuditStatus && !silent) {
          portalContext.elements.engagementsNationalAuditStatus.textContent = append ? "Chargement des actions précédentes..." : "Chargement du journal...";
          portalContext.elements.engagementsNationalAuditStatus.dataset.tone = "loading";
        }
        try {
          const requestFilters = {
            limit: 50,
            days: Number(portalContext.elements.engagementsNationalAuditPeriod?.value || 7),
            actorUid: portalContext.elements.engagementsNationalAuditActor?.value || "",
            clubId: portalContext.elements.engagementsNationalAuditClub?.value || "",
            cursor: append ? portalState.engagementNationalAuditNextCursor : null,
            knownActorUids: [...portalConfig.engagementNationalAuditActors.entries()]
              .filter(([, actor]) => actor.name || actor.email)
              .map(([uid]) => uid)
              .slice(0, 100),
            knownCompetitionIds: [...portalConfig.engagementNationalAuditCompetitions.entries()]
              .filter(([, competition]) => competition.name)
              .map(([competitionId]) => competitionId)
              .slice(0, 100),
            knownPersonIds: [...portalConfig.engagementNationalAuditPeople.entries()]
              .map(([personId]) => personId)
              .slice(0, 100)
          };
          // Club labels must not delay the journal or change its captured filters.
          void Promise.resolve().then(() => portalActions.loadAccessClubReference()).then(() => {
            if (portalState.engagementNationalAuditLogsLoaded) moduleActions.renderEngagementNationalAuditLogs();
          }).catch(() => {});
          const result = await portalActions.callFunction("listEngagementNationalAuditLogs", requestFilters);
          portalState.engagementNationalAuditAppliedActorUid = requestFilters.actorUid;
          (Array.isArray(result.actors) ? result.actors : []).forEach((actor) => {
            if (actor?.uid) portalConfig.engagementNationalAuditActors.set(actor.uid, actor);
          });
          (Array.isArray(result.competitions) ? result.competitions : []).forEach((competition) => {
            if (competition?.id) portalConfig.engagementNationalAuditCompetitions.set(competition.id, competition);
          });
          (Array.isArray(result.people) ? result.people : []).forEach((person) => {
            if (person?.id) portalConfig.engagementNationalAuditPeople.set(person.id, person);
          });
          const returnedLogs = Array.isArray(result.logs) ? result.logs : [];
          returnedLogs.forEach((log) => {
            const uid = String(log.actorUid || "");
            if (uid && !uid.startsWith("system:") && uid !== "public-login-page" && !portalConfig.engagementNationalAuditActors.has(uid)) {
              portalConfig.engagementNationalAuditActors.set(uid, { uid, name: "", email: "" });
            }
          });
          portalState.engagementNationalAuditLogs = global.LivePalmesActivityJournal.merge(append ? portalState.engagementNationalAuditLogs : [], returnedLogs);
          portalState.engagementNationalAuditNextCursor = result.nextCursor || null;
          portalState.engagementNationalAuditHasMore = result.hasMore === true;
          portalState.engagementNationalAuditVisibleFrom = result.visibleFrom || "";
          portalState.engagementNationalAuditLogsLoaded = true;
        } catch (error) {
          if (portalContext.elements.engagementsNationalAuditStatus && !silent) {
            portalContext.elements.engagementsNationalAuditStatus.textContent = `Lecture du journal impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalAuditStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementNationalAuditLogsLoading = false;
          if (portalContext.elements.engagementsNationalAuditRefresh) portalContext.elements.engagementsNationalAuditRefresh.disabled = false;
          if (portalContext.elements.engagementsNationalAuditLoadMore) portalContext.elements.engagementsNationalAuditLoadMore.disabled = false;
          if (portalState.engagementNationalAuditLogsLoaded) moduleActions.renderEngagementNationalAuditLogs();
        }
      }
    return { searchEngagementNationalAuditActors, loadEngagementNationalAuditLogs };
  });
})(window);
