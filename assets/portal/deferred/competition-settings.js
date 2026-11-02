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
    return { confirmQualificationException, finishQualificationJob, updateCompetitionWithQualifications };
  });
})(window);
