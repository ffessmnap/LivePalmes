(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("club-people", function create(portalContext, moduleActions) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function confirmEngagementClubTeamLeaderCandidate(candidate = {}) {
        if (!candidate?.selectionId) return null;
        if (global.LivePalmesEnvironment?.sportingDataSource === "nap") return candidate;
        const conflict = moduleActions.engagementClubMemberRoleConflict(candidate, "teamLeader");
        if (conflict) {
          global.alert(conflict);
          throw new Error(conflict);
        }
        if (candidate.roles?.teamLeader === true) return candidate;
        const name = moduleActions.engagementClubPersonDisplayName(candidate);
        if (!global.confirm(`${name} n'est pas encore déclaré comme chef d'équipe. Voulez-vous lui attribuer ce rôle ?`)) {
          return null;
        }
        if (candidate.candidateType !== "swimmer") return candidate;
        const result = await portalActions.callFunction("saveEngagementClubPerson", {
          person: moduleActions.engagementClubPersonPayloadWithRole(candidate, "teamLeader")
        });
        const person = result.person || null;
        if (!person?.id) throw new Error("Membre non retourné après l'ajout du rôle chef d'équipe.");
        portalState.engagementClubPeople = [
          ...portalState.engagementClubPeople.filter((item) => item.id !== person.id),
          person
        ];
        return { ...person, selectionId: person.id, candidateType: "person" };
      }

    async function selectEngagementClubTeamRenunciation(event) {
        event?.preventDefault?.();
        if (portalState.engagementClubTeamRenunciationSaving) return;
        const context = portalState.engagementClubTeamRenunciationContext;
        if (!context || context.competitionId !== portalState.selectedEngagementCompetitionId || context.clubId !== String(portalActions.activeEngagementClubProfile().clubId || "")) return;
        if (context.fingerprint !== portalState.selectedEngagementClubEntry?.napFingerprint || context.leader !== JSON.stringify(portalState.selectedEngagementClubEntry?.teamLeader || {})) {
          moduleActions.closeEngagementClubTeamRenunciationDialog();
          if (portalContext.elements.engagementsClubTeamMessage) {
            portalContext.elements.engagementsClubTeamMessage.textContent = "Le dossier a changé. Rouvrez la confirmation après avoir vérifié le chef d’équipe actuel.";
            portalContext.elements.engagementsClubTeamMessage.dataset.tone = "warning";
          }
          return;
        }
        if (portalState.engagementClubTeamSaving || portalActions.engagementClubTeamLeaderLockReason() || !portalActions.canUse("engagements.club.manage")) return;
        portalState.engagementClubTeamRenunciationContext = null;
        if (portalContext.elements.engagementsClubTeamRenunciationDialog?.open) portalContext.elements.engagementsClubTeamRenunciationDialog.close();
        const radio = portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"][value="renounced"]');
        if (radio) radio.checked = true;
        if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = false;
        if (portalContext.elements.engagementsClubTeamRenunciation) portalContext.elements.engagementsClubTeamRenunciation.checked = true;
        portalActions.updateEngagementClubTeamFormMode();
        portalState.engagementClubTeamRenunciationSaving = true;
        try {
          const saved = await portalActions.saveEngagementClubTeamLeader();
          if (!saved && context.competitionId === portalState.selectedEngagementCompetitionId && context.clubId === String(portalActions.activeEngagementClubProfile().clubId || "")) moduleActions.restoreEngagementClubTeamLeaderChoice();
        } finally {
          portalState.engagementClubTeamRenunciationSaving = false;
        }
      }

    async function saveEngagementClubExternalTeamLeader(event) {
        event?.preventDefault?.();
        if (portalContext.elements.engagementsClubTeamExternalDialogForm && !portalContext.elements.engagementsClubTeamExternalDialogForm.checkValidity()) {
          portalContext.elements.engagementsClubTeamExternalDialogForm.reportValidity?.();
          return;
        }
        if (portalContext.elements.engagementsClubTeamLastName) portalContext.elements.engagementsClubTeamLastName.value = portalContext.elements.engagementsClubTeamExternalLastName?.value.trim().toLocaleUpperCase("fr-FR") || "";
        if (portalContext.elements.engagementsClubTeamFirstName) portalContext.elements.engagementsClubTeamFirstName.value = portalContext.elements.engagementsClubTeamExternalFirstName?.value.trim() || "";
        if (portalContext.elements.engagementsClubTeamExternalClubName) portalContext.elements.engagementsClubTeamExternalClubName.value = portalContext.elements.engagementsClubTeamExternalDialogClubName?.value.trim() || "";
        if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = true;
        portalActions.updateEngagementClubTeamFormMode();
        if (portalContext.elements.engagementsClubTeamExternalDialogApply) portalContext.elements.engagementsClubTeamExternalDialogApply.disabled = true;
        const saved = await portalActions.saveEngagementClubTeamLeader();
        if (portalContext.elements.engagementsClubTeamExternalDialogApply) portalContext.elements.engagementsClubTeamExternalDialogApply.disabled = false;
        if (saved) {
          moduleActions.closeEngagementClubExternalTeamDialog();
        } else if (portalContext.elements.engagementsClubTeamExternalDialogMessage) {
          portalContext.elements.engagementsClubTeamExternalDialogMessage.textContent = portalContext.elements.engagementsClubTeamMessage?.textContent || "Enregistrement impossible.";
          portalContext.elements.engagementsClubTeamExternalDialogMessage.dataset.tone = "error";
        }
      }

    async function handleEngagementClubOfficialSelection(event) {
        if(portalState.engagementClubNativeRelayRetry || portalState.engagementClubNativeOfficialRetry || portalState.engagementClubNativeSelectionRetry || portalState.engagementClubNativeIndividualRetry) {
          moduleActions.renderEngagementClubOfficials();
          if(portalContext.elements.engagementsClubOfficialsMessage) portalContext.elements.engagementsClubOfficialsMessage.textContent="Un enregistrement NAP reste à vérifier. Cliquez sur Enregistrer pour le reprendre.";
          return;
        }
        const checkbox = event.target.closest("[data-engagement-club-official-selection]");
        if (!checkbox) return;
        const selectionId = checkbox.dataset.engagementClubOfficialSelection || "";
        let candidate = moduleActions.engagementClubOfficialPeople().find((person) => (person.selectionId || person.id) === selectionId) || null;
        if (!candidate) return;
        const previousOfficials = portalActions.cloneEngagementClubEntry(portalState.selectedEngagementClubEntry?.officials || []);
        if (!checkbox.checked) {
          portalState.selectedEngagementClubEntry = {
            ...(portalState.selectedEngagementClubEntry || {}),
            officials: (portalState.selectedEngagementClubEntry?.officials || []).filter((official) => official.personId !== candidate.id)
          };
          moduleActions.renderEngagementClubOfficials();
          const saved = await portalActions.saveEngagementClubOfficials();
          if (!saved) {
            portalState.selectedEngagementClubEntry = { ...(portalState.selectedEngagementClubEntry || {}), officials: previousOfficials };
            moduleActions.renderEngagementClubOfficials();
          }
          return;
        }
        const conflict = moduleActions.engagementClubMemberRoleConflict(candidate, "official");
        if (conflict) {
          checkbox.checked = false;
          global.alert(conflict);
          if (portalContext.elements.engagementsClubOfficialsMessage) {
            portalContext.elements.engagementsClubOfficialsMessage.textContent = conflict;
            portalContext.elements.engagementsClubOfficialsMessage.dataset.tone = "error";
          }
          return;
        }
        try {
          if (candidate.roles?.official !== true) {
            const name = moduleActions.engagementClubPersonDisplayName(candidate);
            if (!global.confirm(`${name} n'est pas encore déclaré comme officiel. Voulez-vous lui attribuer ce rôle ?`)) {
              checkbox.checked = false;
              return;
            }
            const existingPerson = candidate.candidateType === "swimmer" ? moduleActions.engagementClubPersonForSwimmer(candidate) : candidate;
            const personResult = await portalActions.callFunction("saveEngagementClubPerson", {
              personId: existingPerson?.id || "",
              person: moduleActions.engagementClubPersonPayloadWithRole({ ...candidate, ...(existingPerson || {}) }, "official")
            });
            const person = personResult.person || null;
            if (!person?.id) throw new Error("Personne non retournée après l'ajout du rôle officiel.");
            portalState.engagementClubPeople = [...portalState.engagementClubPeople.filter((item) => item.id !== person.id), person];
            candidate = { ...person, candidateType: "person", selectionId: person.id };
          }
          portalState.selectedEngagementClubEntry = {
            ...(portalState.selectedEngagementClubEntry || {}),
            officials: [
              ...(portalState.selectedEngagementClubEntry?.officials || []).filter((official) => official.personId !== candidate.id),
              {
                personId: candidate.id,
                firstName: candidate.firstName || "",
                lastName: candidate.lastName || "",
                licenseNumber: candidate.licenseNumber || ""
              }
            ]
          };
          moduleActions.renderEngagementClubOfficials();
          const saved = await portalActions.saveEngagementClubOfficials();
          if (!saved) {
            portalState.selectedEngagementClubEntry = { ...(portalState.selectedEngagementClubEntry || {}), officials: previousOfficials };
            moduleActions.renderEngagementClubOfficials();
          }
        } catch (error) {
          checkbox.checked = false;
          if (portalContext.elements.engagementsClubOfficialsMessage) {
            portalContext.elements.engagementsClubOfficialsMessage.textContent = `Ajout impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubOfficialsMessage.dataset.tone = "error";
          }
        }
      }

    async function loadEngagementAdminPublicSwimmerSearchShard(shard = "") {
        const cleanShard = String(shard || "").trim();
        if (!cleanShard) return [];
        if (portalConfig.publicPerformanceSwimmerSearchShards.has(cleanShard)) {
          return portalConfig.publicPerformanceSwimmerSearchShards.get(cleanShard);
        }
        const promise = fetch(`${portalConfig.PERFORMANCE_PUBLIC_SEARCH_BASE}/search/${encodeURIComponent(cleanShard)}.json?v=${portalConfig.ENGAGEMENT_ADMIN_PUBLIC_SWIMMER_SEARCH_VERSION}`, {
          cache: "no-cache"
        })
          .then((response) => {
            if (response.status === 404) return [];
            if (!response.ok) throw new Error("Index public nageurs indisponible.");
            return response.json();
          })
          .then((rows) => Array.isArray(rows) ? rows : [])
          .catch(() => []);
        portalConfig.publicPerformanceSwimmerSearchShards.set(cleanShard, promise);
        return promise;
      }

    async function searchEngagementAdminPublicSwimmers(query = "", limit = 80) {
        const terms = moduleActions.engagementAdminPublicSwimmerSearchTokens(query).slice(0, 5);
        if (!terms.length) return [];
        const shard = moduleActions.engagementAdminPublicSwimmerSearchShard(query);
        const rows = await moduleActions.loadEngagementAdminPublicSwimmerSearchShard(shard);
        const results = rows
          .map(moduleActions.engagementAdminPublicSwimmerItem)
          .filter((swimmer) => {
            const haystack = moduleActions.normalizedEngagementClubSearch(swimmer.searchText || [
              swimmer.firstName,
              swimmer.lastName,
              swimmer.name,
              swimmer.birthDate,
              swimmer.sex,
              swimmer.clubId,
              swimmer.clubName,
              ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : []),
              ...(Array.isArray(swimmer.aliases) ? swimmer.aliases : [])
            ].filter(Boolean).join(" "));
            return terms.every((term) => haystack.includes(term));
          })
          .sort((left, right) =>
            moduleActions.engagementAdminPublicSwimmerScore(left, terms) - moduleActions.engagementAdminPublicSwimmerScore(right, terms) ||
            String(right.latestDate || "").localeCompare(String(left.latestDate || "")) ||
            String(left.lastName || "").localeCompare(String(right.lastName || ""), "fr-FR") ||
            String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr-FR")
          );
        return results.slice(0, limit);
      }
    return { confirmEngagementClubTeamLeaderCandidate, selectEngagementClubTeamRenunciation, saveEngagementClubExternalTeamLeader, handleEngagementClubOfficialSelection, loadEngagementAdminPublicSwimmerSearchShard, searchEngagementAdminPublicSwimmers };
  });
})(window);
