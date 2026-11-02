(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("competition-actions", function create(portalContext, moduleActions) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function loadEngagementCompetitionDetail(competitionId, initialTab = "general") {
        const cleanId = String(competitionId || "").trim();
        if (!cleanId) return;
        if (portalContext.elements.engagementsDetailRetry) portalContext.elements.engagementsDetailRetry.hidden = true;
        if (portalState.selectedEngagementCompetitionId && portalState.selectedEngagementCompetitionId !== cleanId && !portalActions.confirmLeaveDirtyEngagementTab()) return;
        portalActions.closeEngagementCompetitionDocumentForm();
        if (portalConfig.engagementClubSelectionChanges.size) void portalActions.flushEngagementClubSwimmerSelections();
        const clubMode = !portalActions.isEngagementAdminMode() && portalActions.canUse("engagements.club.manage");
        const cachedWorkspace = clubMode ? portalActions.readEngagementClubWorkspaceCache(cleanId) : null;
        const nativeWorkspace = /^legacy-nap-/.test(cleanId) || cachedWorkspace?.competition?.napSource === true;
        const cachedWorkspaceFresh = Boolean(!nativeWorkspace && cachedWorkspace?.cachedAt && Date.now() - cachedWorkspace.cachedAt < portalConfig.ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS);
        portalActions.clearEngagementDetailTabDirty();
        if (portalState.selectedEngagementCompetitionId !== cleanId) portalState.qualificationExceptionScope = "";
        portalActions.setEngagementSaveState("");
        portalState.selectedEngagementCompetitionId = cleanId;
        portalState.engagementClubEntryMutationRevision += 1;
        portalState.engagementClubLastPersistedEntry = null;
        portalActions.resetEngagementClubEntriesAutosave();
        portalState.engagementClubSwimmersRenderedCompetitionId = "";
        portalState.engagementClubEntriesRenderedCompetitionId = "";
        portalState.engagementClubRelaysRenderedCompetitionId = "";
        portalState.engagementClubPersistedSwimmerIds.clear();
        portalActions.setEngagementClubEntriesDirty(false);
        portalConfig.engagementClubEntryTimeHistoryCache.clear();
        portalConfig.engagementClubEntryTimeHistoryRequests.clear();
        portalConfig.engagementClubSwimmerEventTimesCache.clear();
        portalConfig.engagementClubSwimmerEventTimesRequests.clear();
        portalState.engagementClubRecapEntries = [];
        portalState.engagementClubRecapEntriesCompetitionId = "";
        portalState.engagementClubRecapEntriesLoading = false;
        portalState.engagementMailJobs = [];
        portalState.engagementMailJobsCompetitionId = "";
        portalState.engagementMailJobsLoading = false;
        portalState.engagementCompetitionStatistics = null;
        portalState.engagementCompetitionStatisticsCompetitionId = "";
        portalState.engagementCompetitionStatisticsLoading = false;
        portalActions.resetEngagementClubTransientMessages();
        portalActions.renderEngagementCompetitions();
        portalActions.setEngagementCompetitionDetailVisible(true);
        if (cachedWorkspace) {
          portalActions.setEngagementClubEntryLoadingState("");
          portalState.selectedEngagementCompetition = portalActions.cloneEngagementClubEntry(cachedWorkspace.competition);
          portalState.selectedEngagementClubEntry = portalActions.cloneEngagementClubEntry(cachedWorkspace.entry);
          portalActions.setEngagementsDetailTab(initialTab);
          moduleActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition);
          portalActions.setEngagementClubPersistedSwimmers(portalState.selectedEngagementClubEntry);
          portalActions.renderEngagementClubEntry(portalState.selectedEngagementClubEntry);
          portalActions.clearEngagementDetailTabDirty();
          if (cachedWorkspaceFresh) return;
        } else {
          const calendarCompetition = portalState.engagementCompetitions.find((competition) => competition.id === cleanId) || null;
          if (calendarCompetition) {
            portalState.selectedEngagementCompetition = portalActions.cloneEngagementClubEntry(calendarCompetition);
            portalActions.setEngagementsDetailTab(initialTab);
            moduleActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition);
          } else {
            portalState.selectedEngagementCompetition = null;
            portalActions.setEngagementsDetailTab("general");
            if (portalContext.elements.engagementsDetailTitle) portalContext.elements.engagementsDetailTitle.textContent = "Chargement...";
            if (portalContext.elements.engagementsDetailSubtitle) portalContext.elements.engagementsDetailSubtitle.textContent = "";
            if (portalContext.elements.engagementsDetailMeta) portalContext.elements.engagementsDetailMeta.innerHTML = "";
          }
          if (clubMode) portalActions.setEngagementClubEntryLoadingState("loading");
          if (portalContext.elements.engagementsDetailStatus) {
            portalContext.elements.engagementsDetailStatus.textContent = clubMode
              ? "Chargement de vos engagements enregistrés..."
              : "Chargement de la fiche...";
            portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
          }
        }
        const pendingEntryMutations = portalState.engagementClubEntryMutationQueue;
        try {
          const result = await (clubMode
            ? pendingEntryMutations.then(async () => {
                const preloadRequest = portalActions.pendingEngagementClubWorkspaceRequest(cleanId);
                if (preloadRequest) await preloadRequest;
                const prefetchedWorkspace = portalActions.readEngagementClubWorkspaceCache(cleanId);
                if (!nativeWorkspace && prefetchedWorkspace?.cachedAt && Date.now() - prefetchedWorkspace.cachedAt < portalConfig.ENGAGEMENT_CLUB_WORKSPACE_CACHE_TTL_MS) {
                  return prefetchedWorkspace;
                }
                return portalActions.callFunctionWithTimeout("getEngagementClubEntry", { competitionId: cleanId });
              })
            : portalActions.callFunction("getEngagementCompetition", { competitionId: cleanId }));
          if (portalState.selectedEngagementCompetitionId !== cleanId) return;
          portalState.selectedEngagementCompetition = result.competition || null;
          portalActions.setEngagementClubEntryLoadingState("");
          moduleActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition || {});
          portalActions.clearEngagementDetailTabDirty();
          if (clubMode) {
            portalState.selectedEngagementClubEntry = result.entry || {};
            portalActions.setEngagementClubPersistedSwimmers(portalState.selectedEngagementClubEntry);
            portalActions.renderEngagementClubEntry(portalState.selectedEngagementClubEntry);
            portalActions.writeEngagementClubWorkspaceCache(cleanId, {
              competition: portalActions.cloneEngagementClubEntry(portalState.selectedEngagementCompetition || {}),
              entry: portalActions.cloneEngagementClubEntry(portalState.selectedEngagementClubEntry)
            });
            if (portalContext.elements.engagementsClubTeamMessage) {
              const writeLockReason = portalState.selectedEngagementCompetition?.nativeTeamLeaderEditable === true ? portalActions.engagementClubWriteLockReason({ ...portalState.selectedEngagementCompetition, nativeReadOnly: false }) : portalActions.engagementClubWriteLockReason();
              portalContext.elements.engagementsClubTeamMessage.textContent = writeLockReason || "";
              portalContext.elements.engagementsClubTeamMessage.dataset.tone = writeLockReason ? "error" : "ok";
            }
          } else {
            portalState.selectedEngagementClubEntry = null;
            portalActions.renderEngagementClubEntry({});
          }
        } catch (error) {
          if (portalState.selectedEngagementCompetitionId !== cleanId) return;
          portalActions.setEngagementClubEntryLoadingState(clubMode && !cachedWorkspace ? "error" : "");
          if (portalContext.elements.engagementsDetailStatus) {
            portalContext.elements.engagementsDetailStatus.textContent = cachedWorkspace
              ? "Actualisation impossible. La dernière version chargée reste affichée. Vous pouvez réessayer le chargement."
              : "Impossible de charger ce dossier. Vérifiez votre connexion puis réessayez le chargement.";
            portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
          }
          if (portalContext.elements.engagementsDetailRetry) portalContext.elements.engagementsDetailRetry.hidden = !clubMode;
        }
      }

    async function retryEngagementCompetitionRead() {
        if (portalState.engagementDetailRetryPending || !portalState.selectedEngagementCompetitionId) return false;
        if (portalActions.isEngagementAdminMode() || !portalActions.canUse("engagements.club.manage")) return false;
        // Relire seulement : ne pas appeler le chargeur de navigation qui peut vider
        // une file d'autosauvegarde. Les reprises NAP incertaines restent inchangées.
        if (moduleActions.engagementClubReadRetryBlocked()) {
          if (portalContext.elements.engagementsDetailStatus) {
            portalContext.elements.engagementsDetailStatus.textContent = "Des modifications sont en cours ou restent à vérifier. Consultez l’étape concernée avant de recharger.";
            portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
          }
          return false;
        }
        const competitionId = portalState.selectedEngagementCompetitionId;
        const revision = portalState.engagementClubEntryMutationRevision;
        const cachedWorkspace = portalActions.readEngagementClubWorkspaceCache(competitionId);
        portalState.engagementDetailRetryPending = true;
        if (portalContext.elements.engagementsDetailRetry) portalContext.elements.engagementsDetailRetry.disabled = true;
        if (!cachedWorkspace) portalActions.setEngagementClubEntryLoadingState("loading");
        if (portalContext.elements.engagementsDetailStatus) {
          portalContext.elements.engagementsDetailStatus.textContent = "Chargement du dossier… Vos enregistrements ne sont pas renvoyés.";
          portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
        }
        try {
          await portalState.engagementClubEntryMutationQueue;
          const result = await portalActions.callFunctionWithTimeout("getEngagementClubEntry", { competitionId });
          if (competitionId !== portalState.selectedEngagementCompetitionId) return false;
          if (revision !== portalState.engagementClubEntryMutationRevision || moduleActions.engagementClubReadRetryBlocked()) throw new Error("Dossier modifié pendant la lecture");
          portalState.selectedEngagementCompetition = result.competition || {};
          portalActions.setEngagementClubEntryLoadingState("");
          moduleActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition);
          portalState.selectedEngagementClubEntry = result.entry || {};
          portalActions.setEngagementClubPersistedSwimmers(portalState.selectedEngagementClubEntry);
          portalActions.renderEngagementClubEntry(portalState.selectedEngagementClubEntry);
          portalActions.writeEngagementClubWorkspaceCache(competitionId, { competition: portalActions.cloneEngagementClubEntry(portalState.selectedEngagementCompetition), entry: portalActions.cloneEngagementClubEntry(portalState.selectedEngagementClubEntry) });
          Array.from(portalContext.elements.engagementsDetailTabButtons || []).find(button => button.getAttribute("aria-selected") === "true" && !button.hidden)?.focus();
          return true;
        } catch (_) {
          if (competitionId !== portalState.selectedEngagementCompetitionId) return false;
          portalActions.setEngagementClubEntryLoadingState(!cachedWorkspace ? "error" : "");
          if (portalContext.elements.engagementsDetailStatus) {
            portalContext.elements.engagementsDetailStatus.textContent = cachedWorkspace
              ? "Actualisation impossible. La dernière version chargée reste affichée. Réessayez lorsque la connexion est rétablie."
              : "Le dossier reste indisponible. Vérifiez votre connexion puis réessayez.";
            portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
          }
          return false;
        } finally {
          portalState.engagementDetailRetryPending = false;
          if (portalContext.elements.engagementsDetailRetry) portalContext.elements.engagementsDetailRetry.disabled = false;
        }
      }

    async function saveEngagementClubTeamLeader(event) {
        event?.preventDefault?.();
        if (portalState.engagementClubTeamSaving) return false;
        if (!portalState.selectedEngagementCompetitionId || !portalActions.canUse("engagements.club.manage")) return false;
        const saveCompetitionId = portalState.selectedEngagementCompetitionId;
        const saveClubId = String(portalActions.activeEngagementClubProfile().clubId || "");
        const saveScopeCurrent = () => portalState.selectedEngagementCompetitionId === saveCompetitionId && String(portalActions.activeEngagementClubProfile().clubId || "") === saveClubId;
        const nativeLeaderEdit = portalState.selectedEngagementCompetition?.nativeReadOnly === true && portalState.selectedEngagementCompetition?.nativeTeamLeaderEditable === true;
        if (nativeLeaderEdit ? Boolean(portalActions.engagementClubWriteLockReason({ ...portalState.selectedEngagementCompetition, nativeReadOnly: false })) : portalActions.showEngagementClubWriteLock(portalContext.elements.engagementsClubTeamMessage)) return false;
        portalActions.updateEngagementClubTeamFormMode();
        if (portalContext.elements.engagementsClubTeamForm && !portalContext.elements.engagementsClubTeamForm.checkValidity()) {
          portalContext.elements.engagementsClubTeamForm.reportValidity?.();
          return false;
        }
        portalState.engagementClubTeamSaving = true;
        portalContext.elements.engagementsClubTeamForm?.setAttribute("aria-busy", "true");
        if (nativeLeaderEdit) { portalActions.setEngagementClubFormControlsLocked(portalContext.elements.engagementsClubTeamForm, true); }
        if (portalContext.elements.engagementsClubTeamSaveButton) portalContext.elements.engagementsClubTeamSaveButton.disabled = true;
        portalActions.setEngagementSaveState("saving");
        if (portalContext.elements.engagementsClubTeamMessage) {
          const name = [portalContext.elements.engagementsClubTeamFirstName?.value, portalContext.elements.engagementsClubTeamLastName?.value].filter(Boolean).join(" ");
          portalContext.elements.engagementsClubTeamMessage.textContent = `Enregistrement ${name ? `de ${name}` : "du chef d’équipe"} en cours… Attendez la confirmation avant de continuer.`;
          portalContext.elements.engagementsClubTeamMessage.dataset.tone = "loading";
        }
        try {
          if (nativeLeaderEdit) {
            const result = await portalActions.callFunction("saveEngagementClubTeamLeader", {
              competitionId: saveCompetitionId,
              leaderId: portalState.selectedEngagementClubEntry?.teamLeader?.nativeLeaderId,
              expectedFingerprint: portalState.selectedEngagementClubEntry?.napFingerprint,
              patch: portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.value === "renounced"
                ? { mode: "renounced", renunciationAccepted: portalContext.elements.engagementsClubTeamRenunciation?.checked === true }
                : { firstName: portalContext.elements.engagementsClubTeamFirstName?.value || "", lastName: portalContext.elements.engagementsClubTeamLastName?.value || "", birthDate: portalContext.elements.engagementsClubTeamBirthDate?.value || "" }
            });
            if (!saveScopeCurrent()) return true;
            portalState.selectedEngagementCompetition = result.competition;
            portalActions.renderEngagementClubEntry(result.entry);
            if (portalContext.elements.engagementsClubTeamMessage) { portalContext.elements.engagementsClubTeamMessage.textContent = "Chef d'équipe enregistré dans NAP. Vous pouvez continuer les engagements."; portalContext.elements.engagementsClubTeamMessage.dataset.tone = "ok"; }
            portalActions.setEngagementSaveState("saved");
            return true;
          }
          let teamLeader = portalActions.selectedEngagementTeamLeaderFromForm();
          if (teamLeader.mode === "person" && !teamLeader.externalClub) {
            let person = portalState.engagementClubPeople.find((candidate) => candidate.id === teamLeader.personId) || null;
            if (person && (person.active === false || !person.birthDate || !person.sex)) {
              const personResult = await portalActions.callFunction("saveEngagementClubPerson", {
                personId: person.id,
                person: {
                  ...portalActions.engagementClubPersonPayloadWithRole(person, "teamLeader"),
                  ...portalActions.engagementClubPersonPayloadWithRole(teamLeader, "teamLeader"),
                  roles: {
                    teamLeader: true,
                    official: person.roles?.official === true
                  }
                }
              });
              person = personResult.person || null;
              if (!person?.id) throw new Error("Membre non retourné après la mise à jour de son identité.");
              portalState.engagementClubPeople = [
                ...portalState.engagementClubPeople.filter((candidate) => candidate.id !== person.id),
                person
              ];
            }
            if (!person) {
              const resolution = portalActions.resolveEngagementClubPersonIdentity(teamLeader, "chef d'équipe");
              if (resolution.cancelled) {
                if (portalContext.elements.engagementsClubTeamMessage) {
                  portalContext.elements.engagementsClubTeamMessage.textContent = "Création annulée : choisissez le membre existant ou corrigez l'identité.";
                  portalContext.elements.engagementsClubTeamMessage.dataset.tone = "warning";
                }
                portalActions.setEngagementSaveState("");
                return false;
              }
              person = resolution.person;
            }
            if (!person) {
              const personResult = await portalActions.callFunction("saveEngagementClubPerson", {
                person: portalActions.engagementClubPersonPayloadWithRole(teamLeader, "teamLeader")
              });
              person = personResult.person || null;
              if (!person?.id) throw new Error("Membre non retourné après sa création.");
              portalState.engagementClubPeople = [
                ...portalState.engagementClubPeople.filter((candidate) => candidate.id !== person.id),
                person
              ];
            }
            teamLeader = {
              ...teamLeader,
              ...portalActions.engagementClubPersonPayloadWithRole(person, "teamLeader"),
              personId: person.id,
              externalClub: false,
              clubId: portalState.currentAccessProfile?.clubId || "",
              clubName: portalState.currentAccessProfile?.clubName || ""
            };
          }
          const result = await portalActions.callFunction("saveEngagementClubTeamLeader", {
            competitionId: saveCompetitionId,
            teamLeader
          });
          if (!saveScopeCurrent()) return true;
          portalState.selectedEngagementClubEntry = result.entry || {};
          portalActions.setSelectedEngagementCompetitionClubEntryExists(true);
          portalActions.renderEngagementClubEntry(portalState.selectedEngagementClubEntry);
          if (portalContext.elements.engagementsClubTeamMessage) {
            portalContext.elements.engagementsClubTeamMessage.textContent = "Étape chef d'équipe enregistrée. Vous pouvez continuer les engagements.";
            portalContext.elements.engagementsClubTeamMessage.dataset.tone = "ok";
          }
          portalActions.setEngagementSaveState("saved");
          return true;
        } catch (error) {
          if (!saveScopeCurrent()) return false;
          if (error?.details?.outsideClubExistingPerson === true) {
            if (portalContext.elements.engagementsClubTeamMessage) {
              portalContext.elements.engagementsClubTeamMessage.textContent = "Cette personne existe déjà dans un autre club. Déclarez-la comme chef d'équipe hors club.";
              portalContext.elements.engagementsClubTeamMessage.dataset.tone = "warning";
            }
            portalActions.openEngagementClubExternalTeamDialog();
            return false;
          }
          if (portalContext.elements.engagementsClubTeamMessage) {
            portalContext.elements.engagementsClubTeamMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubTeamMessage.dataset.tone = "error";
          }
          portalActions.setEngagementSaveState("error");
          return false;
        } finally {
          portalState.engagementClubTeamSaving = false;
          portalContext.elements.engagementsClubTeamForm?.removeAttribute("aria-busy");
          if (saveScopeCurrent()) {
            if (nativeLeaderEdit) portalActions.renderEngagementClubTeamPersonOptions();
            if (portalContext.elements.engagementsClubTeamSaveButton) portalContext.elements.engagementsClubTeamSaveButton.disabled = nativeLeaderEdit ? Boolean(portalActions.engagementClubWriteLockReason({ ...portalState.selectedEngagementCompetition, nativeReadOnly: false })) : portalActions.engagementClubWriteLocked();
          }
          portalActions.updateEngagementClubTeamLeaderActions();
        }
      }

    async function removeEngagementClubTeamLeader() {
        if (portalState.engagementClubTeamSaving || !portalState.selectedEngagementCompetitionId || !portalActions.canUse("engagements.club.manage")) return false;
        const leader = portalState.selectedEngagementClubEntry?.teamLeader || {};
        if (leader.mode !== "person" || !portalActions.engagementClubTeamComplete()) return false;
        return portalActions.openEngagementClubTeamRenunciationDialog();
      }

    async function saveEngagementClubOfficials(event) {
        event?.preventDefault?.();
        if (!portalState.selectedEngagementCompetitionId || !portalActions.canUse("engagements.club.manage")) return false;
        if(portalState.selectedEngagementCompetition?.napSource===true) {
          if(!portalState.engagementClubNativeOfficialRetry && (portalActions.engagementClubOfficialsLockReason() || !portalActions.engagementClubTeamComplete())) return false;
          if(portalState.engagementClubNativeSelectionRetry || portalState.engagementClubNativeIndividualRetry) return false;
          if(!portalState.engagementClubNativeOfficialRetry) {
            await portalState.engagementClubEntryMutationQueue;
            if(!portalState.engagementClubNativeOfficialRetry) portalState.engagementClubNativeOfficialRetry={competitionId:portalState.selectedEngagementCompetitionId,officialPersonIds:[...new Set((portalState.selectedEngagementClubEntry?.officials || []).map(row=>row.personId))],expectedFingerprint:portalState.engagementClubLastPersistedEntry?.napFingerprint,mutationId:global.crypto.randomUUID()};
          }
          const payload=portalState.engagementClubNativeOfficialRetry;
          if(payload.competitionId!==portalState.selectedEngagementCompetitionId) return false;
          const saved=await portalActions.queueEngagementClubEntryMutation({competitionId:payload.competitionId,messageElement:portalContext.elements.engagementsClubOfficialsMessage,loadingMessage:"Enregistrement des officiels...",execute:async()=>{
            const result=await portalActions.callFunction("saveEngagementClubOfficials",payload);
            portalState.engagementClubNativeOfficialRetry=null;
            return result;
          }});
          portalActions.renderEngagementClubOfficials();
          return saved;
        }
        if (portalActions.showEngagementClubWriteLock(portalContext.elements.engagementsClubOfficialsMessage)) return false;
        if (!portalActions.engagementClubTeamComplete()) {
          if (portalContext.elements.engagementsClubOfficialsMessage) {
          portalContext.elements.engagementsClubOfficialsMessage.textContent = "Validez le chef d'équipe ou la renonciation avant les officiels.";
            portalContext.elements.engagementsClubOfficialsMessage.dataset.tone = "error";
          }
          return false;
        }
        if (portalContext.elements.engagementsClubOfficialsSaveButton) {
          portalContext.elements.engagementsClubOfficialsSaveButton.hidden = true;
          portalContext.elements.engagementsClubOfficialsSaveButton.disabled = true;
        }
        portalActions.setEngagementSaveState("saving");
        if (portalContext.elements.engagementsClubOfficialsMessage) {
          portalContext.elements.engagementsClubOfficialsMessage.textContent = "Enregistrement des officiels...";
          portalContext.elements.engagementsClubOfficialsMessage.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("saveEngagementClubOfficials", {
            competitionId: portalState.selectedEngagementCompetitionId,
            officialPersonIds: portalActions.selectedEngagementClubOfficialIds()
          });
          portalState.selectedEngagementClubEntry = result.entry || portalState.selectedEngagementClubEntry || {};
          portalActions.renderEngagementClubEntry(portalState.selectedEngagementClubEntry);
          if (portalContext.elements.engagementsClubOfficialsMessage) {
          portalContext.elements.engagementsClubOfficialsMessage.textContent = "Officiels enregistrés.";
            portalContext.elements.engagementsClubOfficialsMessage.dataset.tone = "ok";
          }
          portalActions.setEngagementSaveState("saved");
          if (portalContext.elements.engagementsClubOfficialsSaveButton) portalContext.elements.engagementsClubOfficialsSaveButton.hidden = true;
          return true;
        } catch (error) {
          if (portalContext.elements.engagementsClubOfficialsMessage) {
            portalContext.elements.engagementsClubOfficialsMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubOfficialsMessage.dataset.tone = "error";
          }
          portalActions.setEngagementSaveState("error");
          if (portalContext.elements.engagementsClubOfficialsSaveButton) portalContext.elements.engagementsClubOfficialsSaveButton.hidden = false;
          return false;
        } finally {
          if (portalContext.elements.engagementsClubOfficialsSaveButton) portalContext.elements.engagementsClubOfficialsSaveButton.disabled = !portalActions.engagementClubTeamComplete() || portalActions.engagementClubWriteLocked();
        }
      }

    async function loadEngagementClubSwimmers({ force = false, silent = false } = {}) {
        if (!portalActions.canUse("engagements.club.manage")) return [];
        if (portalState.engagementClubSwimmersLoadPromise) {
          return force
            ? portalState.engagementClubSwimmersLoadPromise.then(() => loadEngagementClubSwimmers({ force: true, silent }))
            : portalState.engagementClubSwimmersLoadPromise;
        }
        const expectedClubId = portalActions.engagementClubScope();
        if (portalState.engagementClubSwimmersClubId && expectedClubId && portalState.engagementClubSwimmersClubId !== expectedClubId) {
          portalState.engagementClubSwimmers = [];
          portalState.engagementClubSwimmersLoaded = false;
          portalState.engagementClubSwimmersClubId = "";
          portalState.engagementClubSwimmersCachedAt = 0;
        }
        if (!portalState.engagementClubSwimmersLoaded && !force && global.LivePalmesEnvironment?.sportingDataSource !== "nap") {
          const cached = portalActions.readEngagementClubSwimmersCache();
          if (cached) {
            portalState.engagementClubSwimmers = cached.swimmers;
            portalState.engagementClubSwimmersClubId = cached.clubId || expectedClubId || "";
            portalState.engagementClubSwimmersCachedAt = cached.cachedAt;
            portalState.engagementClubSwimmersLoaded = true;
          }
        }
        const cacheFresh = Boolean(portalState.engagementClubSwimmersLoaded && portalState.engagementClubSwimmersCachedAt && Date.now() - portalState.engagementClubSwimmersCachedAt < portalConfig.ENGAGEMENT_CLUB_SWIMMERS_CACHE_TTL_MS);
        if (!force && cacheFresh) {
          moduleActions.renderActiveEngagementClubSwimmerConsumer();
          return portalState.engagementClubSwimmers;
        }
        const cachedListVisible = portalState.engagementClubSwimmersLoaded;
        portalState.engagementClubSwimmersLoading = true;
        if (!silent && !cachedListVisible && portalContext.elements.engagementsClubSwimmersMessage) {
          portalContext.elements.engagementsClubSwimmersMessage.textContent = "Chargement des nageurs du club...";
          portalContext.elements.engagementsClubSwimmersMessage.dataset.tone = "loading";
        }
        moduleActions.renderActiveEngagementClubSwimmerConsumer();
        const requestPromise = (async () => {
          try {
            const result = await portalActions.callFunctionWithTimeout("listEngagementClubSwimmers", { limit: 800 }, 30000);
            if (expectedClubId && portalActions.engagementClubScope() !== expectedClubId) return [];
            const resultClubId = String(result.clubId || "").trim();
            if (expectedClubId && resultClubId && resultClubId !== expectedClubId) {
              throw new Error(`Profil club incoherent : ${resultClubId} retourne au lieu de ${expectedClubId}.`);
            }
            portalState.engagementClubSwimmers = Array.isArray(result.swimmers) ? result.swimmers : [];
            portalState.engagementClubSwimmersClubId = resultClubId || expectedClubId || "";
            portalState.engagementClubSwimmersLoaded = true;
            portalActions.writeEngagementClubSwimmersCache();
            if (!silent && portalContext.elements.engagementsClubSwimmersMessage) {
              portalContext.elements.engagementsClubSwimmersMessage.textContent = "";
              portalContext.elements.engagementsClubSwimmersMessage.dataset.tone = "neutral";
            }
            return portalState.engagementClubSwimmers;
          } catch (error) {
            if (!silent && portalContext.elements.engagementsClubSwimmersMessage) {
              portalContext.elements.engagementsClubSwimmersMessage.textContent = cachedListVisible
                ? `Effectif affiché depuis le cache ; actualisation impossible : ${error?.message || error}`
                : `Lecture impossible : ${error?.message || error}`;
              portalContext.elements.engagementsClubSwimmersMessage.dataset.tone = cachedListVisible ? "warning" : "error";
            }
            if (!silent && portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
              portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = cachedListVisible
                ? "Effectif affiché depuis le cache ; actualisation momentanément indisponible."
                : `Lecture impossible : ${error?.message || error}`;
              portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = cachedListVisible ? "warning" : "error";
            }
            return cachedListVisible ? portalState.engagementClubSwimmers : [];
          } finally {
            portalState.engagementClubSwimmersLoading = false;
            if (portalState.engagementClubSwimmersLoadPromise === requestPromise) portalState.engagementClubSwimmersLoadPromise = null;
            try {
              moduleActions.renderActiveEngagementClubSwimmerConsumer();
            } catch (renderError) {
              if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
                portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = `Affichage nageurs impossible : ${renderError?.message || renderError}`;
                portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "error";
              }
            }
          }
        })();
        portalState.engagementClubSwimmersLoadPromise = requestPromise;
        return requestPromise;
      }

    async function saveEngagementClubSwimmers(event) {
        event?.preventDefault?.();
        if (!portalState.selectedEngagementCompetitionId || !portalActions.canUse("engagements.club.manage")) return;
        const fromEntries = event?.target === portalContext.elements.engagementsClubEntriesForm;
        const messageElement = fromEntries ? portalContext.elements.engagementsClubEntriesMessage : portalContext.elements.engagementsClubSwimmersMessage;
        const saveButton = fromEntries ? portalContext.elements.engagementsClubEntriesSaveButton : portalContext.elements.engagementsClubSwimmersSaveButton;
        if(portalState.selectedEngagementCompetition?.napSource===true && fromEntries) {
          if(portalState.engagementClubNativeIndividualRetry) {
            const payload=portalState.engagementClubNativeIndividualRetry;
            if(payload.competitionId!==portalState.selectedEngagementCompetitionId) {messageElement.textContent="Reouvrez la competition de l'enregistrement en attente pour le verifier.";return;}
            return portalActions.queueEngagementClubEntryMutation({competitionId:payload.competitionId,renderScope:"entries",messageElement,loadingMessage:"Verification de l'enregistrement NAP...",execute:async()=>{const result=await portalActions.callFunction("saveEngagementClubIndividualEntries",payload);portalState.engagementClubNativeIndividualRetry=null;return result;}});
          }
          const reason=portalActions.engagementClubIndividualEntriesLockReason();
          if(reason) {if(messageElement) {messageElement.textContent=reason;messageElement.dataset.tone="error";}return;}
          await portalActions.flushEngagementClubIndividualEntriesAutosave();
          await portalState.engagementClubEntryMutationQueue;
          return;
        }
        if(portalState.selectedEngagementCompetition?.napSource===true && !fromEntries) {
          const reason=portalActions.engagementClubSwimmerSelectionLockReason();
          if(reason) {if(messageElement) {messageElement.textContent=reason;messageElement.dataset.tone="error";}return;}
          if(portalState.engagementClubNativeSelectionRetry) {
            const payload=portalState.engagementClubNativeSelectionRetry;
            if(payload.competitionId!==portalState.selectedEngagementCompetitionId) {messageElement.textContent="Reouvrez la competition de l'enregistrement en attente pour le verifier.";return;}
            return portalActions.queueEngagementClubEntryMutation({competitionId:payload.competitionId,messageElement,loadingMessage:"Verification de l'enregistrement NAP...",execute:async()=>{const result=await portalActions.callFunction("saveEngagementClubSwimmerSelections",payload);portalState.engagementClubNativeSelectionRetry=null;return result;}});
          }
          await portalActions.flushEngagementClubSwimmerSelections();
          await portalState.engagementClubEntryMutationQueue;
          return;
        }
        if (portalActions.showEngagementClubWriteLock(messageElement)) return;
        if (!portalActions.engagementClubTeamComplete()) {
          if (messageElement) {
          messageElement.textContent = "Validez le chef d'équipe ou la renonciation avant les engagements.";
            messageElement.dataset.tone = "error";
          }
          return;
        }
        if (!portalState.engagementClubSwimmersLoaded) await moduleActions.loadEngagementClubSwimmers({ silent: true });
        const selectedSwimmers = portalActions.selectedEngagementClubSwimmerRows();
        const missingLicense = portalConfig.ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE && selectedSwimmers.some((swimmer) => !swimmer.licenseNumber);
        if (missingLicense) {
          if (messageElement) {
            messageElement.textContent = "Numéro de licence obligatoire pour chaque nageur engagé.";
            messageElement.dataset.tone = "error";
          }
          const missingLicenseInput = Array.from(portalContext.elements.engagementsClubSwimmersForm?.querySelectorAll("[data-engagement-club-swimmer-id]:checked") || [])
            .map((checkbox) => checkbox.closest("[data-engagement-club-swimmer-row]")?.querySelector("input[data-engagement-club-swimmer-license]:invalid"))
            .find(Boolean);
          portalActions.setEngagementClubSwimmerRowExpanded(missingLicenseInput?.closest("[data-engagement-club-swimmer-row]"), true);
          portalContext.elements.engagementsClubSwimmersForm?.reportValidity?.();
          missingLicenseInput?.focus?.();
          return;
        }
        const invalidLicense = selectedSwimmers.some((swimmer) => swimmer.licenseNumber && !portalConfig.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(swimmer.licenseNumber));
        if (invalidLicense) {
          if (messageElement) {
            messageElement.textContent = "Chaque licence doit respecter le format A-12-34567.";
            messageElement.dataset.tone = "error";
          }
          const invalidLicenseInput = Array.from(portalContext.elements.engagementsClubSwimmersForm?.querySelectorAll("[data-engagement-club-swimmer-id]:checked") || [])
            .map((checkbox) => checkbox.closest("[data-engagement-club-swimmer-row]")?.querySelector("input[data-engagement-club-swimmer-license]:invalid"))
            .find(Boolean);
          portalActions.setEngagementClubSwimmerRowExpanded(invalidLicenseInput?.closest("[data-engagement-club-swimmer-row]"), true);
          portalContext.elements.engagementsClubSwimmersForm?.reportValidity?.();
          invalidLicenseInput?.focus?.();
          return;
        }
        if (saveButton) saveButton.disabled = true;
        portalActions.setEngagementSaveState("saving");
        if (messageElement) {
          messageElement.textContent = fromEntries ? "Enregistrement des courses..." : "Enregistrement des nageurs...";
          messageElement.dataset.tone = "loading";
        }
        try {
          const dirtySwimmerIds = new Set(portalConfig.engagementClubEntriesDirtySwimmerIds);
          const useIndividualEntriesSave = fromEntries && dirtySwimmerIds.size > 0 &&
            Array.from(dirtySwimmerIds).every((swimmerIndexId) => portalState.engagementClubPersistedSwimmerIds.has(swimmerIndexId));
          const swimmersForRequest = useIndividualEntriesSave
            ? selectedSwimmers
              .filter((swimmer) => dirtySwimmerIds.has(swimmer.swimmerIndexId))
              .map((swimmer) => ({
                swimmerIndexId: swimmer.swimmerIndexId,
                individualEntries: swimmer.individualEntries || []
              }))
            : selectedSwimmers;
          const result = await portalActions.callFunction(useIndividualEntriesSave ? "saveEngagementClubIndividualEntries" : "saveEngagementClubSwimmers", {
            competitionId: portalState.selectedEngagementCompetitionId,
            swimmers: swimmersForRequest
          });
          portalState.selectedEngagementClubEntry = result.entry || portalState.selectedEngagementClubEntry || {};
          portalActions.setEngagementClubPersistedSwimmers(portalState.selectedEngagementClubEntry);
          portalActions.setEngagementClubEntriesDirty(false);
          portalActions.renderEngagementClubEntry(portalState.selectedEngagementClubEntry);
          if (messageElement) {
          messageElement.textContent = fromEntries ? "Courses enregistrées." : "Nageurs enregistrés.";
            messageElement.dataset.tone = "ok";
          }
          portalActions.setEngagementSaveState("saved");
        } catch (error) {
          if (messageElement) {
            messageElement.textContent = `Enregistrement impossible : ${error?.message || error}`;
            messageElement.dataset.tone = "error";
          }
          portalActions.setEngagementSaveState("error");
        } finally {
          if (fromEntries) portalActions.syncEngagementClubEntriesSaveBar();
          else if (saveButton) saveButton.disabled = !portalActions.engagementClubTeamComplete() || portalActions.engagementClubWriteLocked();
        }
      }

    async function saveEngagementClubRelays(event, messageElement = portalContext.elements.engagementsClubRelaysMessage, relayRowsOverride = null, removeRelayId = "", nativeRelay = null) {
        event?.preventDefault?.();
        if (!portalState.selectedEngagementCompetitionId || !portalActions.canUse("engagements.club.manage")) return false;
        const native=global.LivePalmesEnvironment?.sportingDataSource === "nap" && portalState.selectedEngagementCompetition?.napSource===true;
        if(native && !portalState.engagementClubNativeRelayRetry && (portalState.engagementClubNativeOfficialRetry || portalState.engagementClubNativeSelectionRetry || portalState.engagementClubNativeIndividualRetry)) {
          if(messageElement) {messageElement.textContent="Un enregistrement NAP reste à vérifier avant de modifier les relais.";messageElement.dataset.tone="error";}
          return false;
        }
        const reason=portalActions.engagementClubRelaysLockReason();
        if(reason && !portalState.engagementClubNativeRelayRetry) {if(messageElement){messageElement.textContent=reason;messageElement.dataset.tone="error";}return false;}
        if (!portalActions.engagementClubTeamComplete()) {
          if (messageElement) {
          messageElement.textContent = "Validez le chef d'équipe ou la renonciation avant les relais.";
            messageElement.dataset.tone = "error";
          }
          return false;
        }
        portalState.engagementClubRelaysDraft = Array.isArray(relayRowsOverride)
          ? relayRowsOverride
          : portalActions.selectedEngagementClubRelayRowsFromDom();
        const validationIssues = removeRelayId || native && portalState.engagementClubNativeRelayRetry ? [] : portalActions.engagementClubRelayValidationIssues(native ? [nativeRelay || {}] : portalState.engagementClubRelaysDraft);
        if (validationIssues.length) {
          if (messageElement) {
            messageElement.textContent = validationIssues[0];
            messageElement.dataset.tone = "error";
          }
          if (messageElement === portalContext.elements.engagementsClubRelaysMessage) {
            portalActions.renderEngagementClubRelays();
            portalActions.focusFirstIncompleteEngagementClubRelay();
          }
          return false;
        }
        if (messageElement) {
          messageElement.textContent = "Enregistrement du relais...";
          messageElement.dataset.tone = "loading";
        }
        portalActions.setEngagementSaveState("saving");
        try {
          const legacyPayload = {
            competitionId: portalState.selectedEngagementCompetitionId,
            ...(removeRelayId ? { removeRelayId } : {}),
            relays: portalState.engagementClubRelaysDraft.map((relay) => ({
              relayId: relay.relayId || "",
              eventCode: relay.eventCode || "",
              category: relay.category || "",
              genderMode: relay.genderMode || "",
              manualEntryTime: relay.manualEntryTime || "",
              memberIds: Array.isArray(relay.memberIds)
                ? relay.memberIds
                : (Array.isArray(relay.members) ? relay.members.map((member) => member.swimmerIndexId).filter(Boolean) : [])
            }))
          };
          let payload=legacyPayload;
          if(native) {
            if(!portalState.engagementClubNativeRelayRetry) {
              if(!removeRelayId && !nativeRelay) throw new Error("Choisissez le relais à enregistrer.");
              const persisted=(portalState.engagementClubLastPersistedEntry?.relays || []).some(row=>row.relayId===nativeRelay?.relayId);
              const relayChange=removeRelayId ? null : {action:persisted?"compose":"create",...(persisted?{relayId:nativeRelay.relayId}:{}),relay:{eventCode:nativeRelay.eventCode,category:nativeRelay.category,genderMode:nativeRelay.genderMode,manualEntryTime:nativeRelay.manualEntryTime,memberIds:nativeRelay.memberIds || []}};
              portalState.engagementClubNativeRelayRetry={competitionId:portalState.selectedEngagementCompetitionId,expectedFingerprint:portalState.engagementClubLastPersistedEntry?.napFingerprint,mutationId:global.crypto.randomUUID(),...(removeRelayId?{removeRelayId}:{relayChange})};
            }
            payload=portalState.engagementClubNativeRelayRetry;
            if(payload.competitionId!==portalState.selectedEngagementCompetitionId) throw new Error("Reouvrez la competition de l'enregistrement en attente.");
          }
          const result=await portalActions.callFunction("saveEngagementClubRelays",payload);
          if(native) portalState.engagementClubNativeRelayRetry=null;
          portalState.selectedEngagementClubEntry = result.entry || portalState.selectedEngagementClubEntry || {};
          portalActions.renderEngagementClubEntry(portalState.selectedEngagementClubEntry);
          if (portalContext.elements.engagementsClubRelaysMessage) {
            portalContext.elements.engagementsClubRelaysMessage.textContent = removeRelayId ? "Relais supprimé." : "Relais enregistré.";
            portalContext.elements.engagementsClubRelaysMessage.dataset.tone = "ok";
          }
          portalActions.setEngagementSaveState("saved");
          return true;
        } catch (error) {
          if (messageElement) {
            messageElement.textContent = `Enregistrement impossible : ${error?.message || error}`;
            messageElement.dataset.tone = "error";
          }
          portalActions.setEngagementSaveState("error");
          return false;
        }
      }

    async function downloadEngagementClubSummaryPdf() {
        if (!portalState.selectedEngagementCompetitionId || !portalActions.canUse("engagements.club.manage")) return;
        if (portalContext.elements.engagementsClubSummaryPdfButton) portalContext.elements.engagementsClubSummaryPdfButton.disabled = true;
        if (portalContext.elements.engagementsClubSummaryStatus) {
          portalContext.elements.engagementsClubSummaryStatus.hidden = false;
          portalContext.elements.engagementsClubSummaryStatus.textContent = "Generation du PDF en cours...";
          portalContext.elements.engagementsClubSummaryStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("generateEngagementClubRecapPdf", {
            competitionId: portalState.selectedEngagementCompetitionId
          });
          if (!result.pdfBase64) throw new Error("PDF non retourne par le serveur.");
          portalActions.downloadBase64File(result.pdfBase64, result.fileName || "recap-engagements-livepalmes.pdf", result.contentType || "application/pdf");
          if (result.document) {
            portalState.selectedEngagementClubEntry = {
              ...(portalState.selectedEngagementClubEntry || {}),
              documents: {
                ...(portalState.selectedEngagementClubEntry?.documents || {}),
                clubRecapPdf: result.document
              }
            };
            portalState.selectedEngagementCompetition = {
              ...(portalState.selectedEngagementCompetition || {}),
              documents: {
                ...(portalState.selectedEngagementCompetition?.documents || {}),
                clubRecapPdf: {
                  status: "generated",
                  generatedAt: result.document.generatedAt || new Date().toISOString()
                }
              }
            };
          }
          if (portalContext.elements.engagementsClubSummaryStatus) {
            portalContext.elements.engagementsClubSummaryStatus.textContent = result.fromStorage ? "PDF téléchargé depuis la GED." : "PDF généré et téléchargé.";
            portalContext.elements.engagementsClubSummaryStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsClubSummaryStatus) {
            portalContext.elements.engagementsClubSummaryStatus.textContent = `Generation PDF impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubSummaryStatus.dataset.tone = "error";
          }
        } finally {
          if (portalContext.elements.engagementsClubSummaryPdfButton) {
            portalContext.elements.engagementsClubSummaryPdfButton.disabled = !portalActions.engagementClubTeamComplete() || !portalActions.engagementClubEntryHasParticipants();
          }
        }
      }

    async function downloadEngagementAdminClubRecapPdf(clubId) {
        const cleanClubId = String(clubId || "").trim();
        if (!portalState.selectedEngagementCompetitionId || !cleanClubId || !portalActions.isEngagementAdminMode()) return;
        const button = portalContext.elements.engagementsClubPdfDownloadButton;
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsClubRecapFiles) portalContext.elements.engagementsClubRecapFiles.innerHTML = '<p class="admin-engagements-empty">Préparation du PDF…</p>';
        try {
          const result = await portalActions.callFunction("generateEngagementClubRecapPdfForAdmin", {
            competitionId: portalState.selectedEngagementCompetitionId,
            clubId: cleanClubId
          });
          if (!result.pdfBase64) throw new Error("PDF non retourne par le serveur.");
          portalActions.downloadBase64File(result.pdfBase64, result.fileName || "recap-engagements-livepalmes.pdf", result.contentType || "application/pdf");
          if (result.document) {
            portalState.engagementClubRecapEntries = portalState.engagementClubRecapEntries.map((entry) =>
              entry.clubId === cleanClubId
                ? { ...entry, recapPdf: result.document }
                : entry
            );
            portalState.selectedEngagementCompetition = {
              ...(portalState.selectedEngagementCompetition || {}),
              documents: {
                ...(portalState.selectedEngagementCompetition?.documents || {}),
                clubRecapPdf: {
                  status: "generated",
                  generatedAt: result.document.generatedAt || new Date().toISOString()
                }
              }
            };
            portalActions.renderEngagementDocuments(portalState.selectedEngagementCompetition);
            portalActions.renderEngagementClubRecapSelector();
          }
          if (portalContext.elements.engagementsClubRecapFiles) {
            portalContext.elements.engagementsClubRecapFiles.innerHTML = `<p class="admin-portal-message" data-tone="ok">PDF ${portalActions.escapeHtml(result.fromStorage ? "téléchargé" : "préparé et téléchargé")}.</p>`;
          }
        } catch (error) {
          if (portalContext.elements.engagementsClubRecapFiles) {
            portalContext.elements.engagementsClubRecapFiles.innerHTML = `<p class="admin-portal-message" data-tone="error">Téléchargement PDF impossible : ${portalActions.escapeHtml(error?.message || error)}</p>`;
          }
        } finally {
          if (button) button.disabled = !portalContext.elements.engagementsClubPdfSelect?.value;
        }
      }

    async function generateEngagementAdminClubRecapPdfs() {
        if (!portalState.selectedEngagementCompetitionId || !portalActions.isEngagementAdminMode()) return;
        const button = portalContext.elements.engagementsGenerateClubRecapsButton;
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsDocumentsSummary) {
          portalContext.elements.engagementsDocumentsSummary.textContent = "Generation des PDF clubs en cours...";
        }
        portalActions.startEngagementLongOperation(
          "Génération des PDF clubs en cours...",
          portalState.selectedEngagementCompetition?.napSource === true ? "Les dossiers NAP sont réunis dans un ZIP à télécharger." : "Les récapitulatifs de tous les clubs engagés sont générés ou réutilisés s'ils sont déjà à jour."
        );
        try {
          const result = await portalActions.callFunction("generateEngagementCompetitionClubRecapPdfs", {
            competitionId: portalState.selectedEngagementCompetitionId
          });
          if (result.zipBase64) portalActions.downloadBase64File(result.zipBase64, result.fileName || "recapitulatifs-clubs.zip", "application/zip");
          if (Array.isArray(result.entries) && result.entries.length) {
            const byClubId = new Map(result.entries.map((entry) => [entry.clubId, entry]));
            portalState.engagementClubRecapEntries = portalState.engagementClubRecapEntries.map((entry) =>
              byClubId.has(entry.clubId) ? { ...entry, ...byClubId.get(entry.clubId) } : entry
            );
            const knownClubIds = new Set(portalState.engagementClubRecapEntries.map((entry) => entry.clubId));
            result.entries.forEach((entry) => {
              if (entry.clubId && !knownClubIds.has(entry.clubId)) portalState.engagementClubRecapEntries.push(entry);
            });
          }
          const hasReadyPdf = Number(result.generatedCount || 0) + Number(result.reusedCount || 0) > 0;
          if (hasReadyPdf) {
            portalState.selectedEngagementCompetition = {
              ...(portalState.selectedEngagementCompetition || {}),
              documents: {
                ...(portalState.selectedEngagementCompetition?.documents || {}),
                clubRecapPdf: {
                  status: "generated",
                  generatedAt: new Date().toISOString()
                }
              }
            };
          }
          portalActions.renderEngagementDocuments(portalState.selectedEngagementCompetition);
          portalActions.renderEngagementClubRecapSelector();
          if (portalContext.elements.engagementsDocumentsSummary) {
            const generatedCount = Number(result.generatedCount || 0);
            const reusedCount = Number(result.reusedCount || 0);
            const skippedCount = Number(result.skippedCount || 0);
            const errorCount = Number(result.errorCount || 0);
            portalContext.elements.engagementsDocumentsSummary.textContent = [
              `${generatedCount} PDF généré${generatedCount > 1 ? "s" : ""}`,
            `${reusedCount} déjà à jour`,
              skippedCount ? `${skippedCount} ignore${skippedCount > 1 ? "s" : ""}` : "",
              errorCount ? `${errorCount} erreur${errorCount > 1 ? "s" : ""}` : ""
            ].filter(Boolean).join(" - ");
            portalActions.finishEngagementLongOperation(
              errorCount ? "error" : "success",
              errorCount ? "Génération terminée avec des erreurs" : "PDF clubs prêts",
              portalContext.elements.engagementsDocumentsSummary.textContent
            );
          }
          if (Array.isArray(result.errors) && result.errors.length && portalContext.elements.engagementsClubRecapFiles) {
            const details = result.errors.slice(0, 5).map((item) =>
              `${portalActions.clubDisplayLabel(item, { fallback: "Club" })} : ${item.message || "erreur inconnue"}`
            ).join(" | ");
            portalContext.elements.engagementsClubRecapFiles.insertAdjacentHTML(
              "afterbegin",
              `<p class="admin-portal-message" data-tone="error">PDF non générés : ${portalActions.escapeHtml(details)}</p>`
            );
          }
        } catch (error) {
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = `Generation PDF clubs impossible : ${error?.message || error}`;
          }
          portalActions.finishEngagementLongOperation("error", "Génération des PDF impossible", error?.message || String(error));
        } finally {
          if (button) button.disabled = false;
        }
      }

    async function generateEngagementAdminTxtExport() {
        if (!portalState.selectedEngagementCompetitionId || !portalActions.isEngagementAdminMode()) return;
        if (portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater" && !portalActions.canDownloadEngagementOpenWaterTxt(portalState.selectedEngagementCompetition)) {
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = "L’export TXT eau libre nécessite une compétition issue de NAP.";
          }
          return;
        }
        const button = portalContext.elements.engagementsGenerateTxtExportButton;
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsDocumentsSummary) {
          portalContext.elements.engagementsDocumentsSummary.textContent = "Préparation de l'export WinPalme…";
        }
        try {
          const result = await portalActions.callFunction("generateEngagementCompetitionTxtExport", {
            competitionId: portalState.selectedEngagementCompetitionId
          });
          if (!result.txtBase64) throw new Error("TXT WinPalme non retourne par le serveur.");
          portalActions.downloadBase64File(result.txtBase64, result.fileName || "export-engagements-livepalmes.txt", result.contentType || "text/plain");
          const generatedAt = result.generatedAt || new Date().toISOString();
          portalState.selectedEngagementCompetition = {
            ...(portalState.selectedEngagementCompetition || {}),
            documents: {
              ...(portalState.selectedEngagementCompetition?.documents || {}),
              entriesTxt: {
                status: "generated",
                generatedAt
              }
            },
            generatedFiles: Array.isArray(result.generatedFiles)
              ? result.generatedFiles
              : (result.file ? [
                  result.file,
                  ...((portalState.selectedEngagementCompetition?.generatedFiles || []).filter((file) => file.type !== "entriesTxt"))
                ] : portalState.selectedEngagementCompetition?.generatedFiles || [])
          };
          portalActions.renderEngagementDocuments(portalState.selectedEngagementCompetition);
          if (portalContext.elements.engagementsDocumentsSummary) {
            const entryCount = Number(result.entryCount || 0);
            portalContext.elements.engagementsDocumentsSummary.textContent = `Export WinPalme téléchargé pour ${entryCount} club${entryCount > 1 ? "s" : ""}.`;
          }
        } catch (error) {
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = `Téléchargement TXT impossible : ${error?.message || error}`;
          }
        } finally {
          if (button) button.disabled = false;
        }
      }

    async function prepareEngagementOpeningEmails() {
        if (!portalState.selectedEngagementCompetitionId || !portalActions.isEngagementAdminMode()) return;
        const button = portalContext.elements.engagementsPrepareOpeningEmailsButton;
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsNotificationPreviewStatus) portalContext.elements.engagementsNotificationPreviewStatus.textContent = "Calcul des destinataires…";
        if (portalContext.elements.engagementsDocumentsSummary) {
          portalContext.elements.engagementsDocumentsSummary.textContent = "Vérification des destinataires de l'ouverture…";
        }
        portalActions.startEngagementLongOperation(
          "Vérification des destinataires de l'ouverture…",
          "Les destinataires éligibles sont calculés sans déclencher d'envoi."
        );
        try {
          const result = await portalActions.callFunction("prepareEngagementOpeningNotificationEmails", {
            competitionId: portalState.selectedEngagementCompetitionId
          });
          if (result.disabled) {
            const message = `Aperçu actuel : ${Number(result.recipientCount || 0)} destinataire(s) éligibles pour l'ouverture. Cette vérification ne prépare ni n'envoie de mail et ne décrit pas les envois précédents.`;
            if (portalContext.elements.engagementsDocumentsSummary) portalContext.elements.engagementsDocumentsSummary.textContent = message;
            if (portalContext.elements.engagementsNotificationPreviewStatus) portalContext.elements.engagementsNotificationPreviewStatus.textContent = message;
            portalActions.finishEngagementLongOperation("success", "Aperçu des notifications", message);
            return;
          }
          await portalActions.loadEngagementMailJobs({ force: true });
          if (portalContext.elements.engagementsDocumentsSummary) {
            const count = Number(result.jobCount || 0);
            portalContext.elements.engagementsDocumentsSummary.textContent = `${count} e-mail${count > 1 ? "s" : ""} d'ouverture préparé${count > 1 ? "s" : ""}, non envoyé${count > 1 ? "s" : ""}.`;
            portalActions.finishEngagementLongOperation("success", "Courriels d'ouverture préparés", portalContext.elements.engagementsDocumentsSummary.textContent);
          }
        } catch (error) {
          if (portalContext.elements.engagementsNotificationPreviewStatus) portalContext.elements.engagementsNotificationPreviewStatus.textContent = `Aperçu impossible : ${error?.message || error}`;
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = `Preparation mails ouverture impossible : ${error?.message || error}`;
          }
          portalActions.finishEngagementLongOperation("error", "Préparation des courriels impossible", error?.message || String(error));
        } finally {
          if (button) button.disabled = false;
        }
      }

    async function prepareEngagementClubRecapEmails() {
        if (!portalState.selectedEngagementCompetitionId || !portalActions.isEngagementAdminMode()) return;
        const button = portalContext.elements.engagementsPrepareClubRecapEmailsButton;
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsNotificationPreviewStatus) portalContext.elements.engagementsNotificationPreviewStatus.textContent = "Vérification des récapitulatifs…";
        if (portalContext.elements.engagementsDocumentsSummary) {
          portalContext.elements.engagementsDocumentsSummary.textContent = "Vérification des récapitulatifs des clubs…";
        }
        portalActions.startEngagementLongOperation(
          "Vérification des récapitulatifs des clubs…",
          "Les récapitulatifs disponibles et les destinataires éligibles sont contrôlés sans déclencher d'envoi."
        );
        try {
          const result = await portalActions.callFunction("prepareEngagementClubRecapEmails", {
            competitionId: portalState.selectedEngagementCompetitionId
          });
          if (result.disabled) {
            const message = `Aperçu actuel : ${Number(result.recipientCount || 0)} destinataire(s) éligibles pour ${Number(result.clubCount || 0)} club(s). Cette vérification ne prépare ni n'envoie de mail et ne décrit pas les envois précédents.`;
            if (portalContext.elements.engagementsDocumentsSummary) portalContext.elements.engagementsDocumentsSummary.textContent = message;
            if (portalContext.elements.engagementsNotificationPreviewStatus) portalContext.elements.engagementsNotificationPreviewStatus.textContent = message;
            portalActions.finishEngagementLongOperation("success", "Aperçu des récapitulatifs", message);
            return;
          }
          if (Number(result.jobCount || 0)) {
            portalActions.updateSelectedEngagementDocumentStatus("clubRecapEmails", "generated");
          }
          await portalActions.loadEngagementMailJobs({ force: true });
          if (portalContext.elements.engagementsDocumentsSummary) {
            const jobCount = Number(result.jobCount || 0);
            const skippedCount = Number(result.skippedClubCount || 0);
            const errorCount = Number(result.errorCount || 0);
            portalContext.elements.engagementsDocumentsSummary.textContent = [
              `${jobCount} e-mail${jobCount > 1 ? "s" : ""} PDF préparé${jobCount > 1 ? "s" : ""}, non envoyé${jobCount > 1 ? "s" : ""}`,
              skippedCount ? `${skippedCount} club${skippedCount > 1 ? "s" : ""} ignoré${skippedCount > 1 ? "s" : ""}` : "",
              errorCount ? `${errorCount} erreur${errorCount > 1 ? "s" : ""}` : ""
            ].filter(Boolean).join(" - ");
            portalActions.finishEngagementLongOperation(
              errorCount ? "error" : "success",
              errorCount ? "Préparation terminée avec des erreurs" : "Courriels PDF clubs préparés",
              portalContext.elements.engagementsDocumentsSummary.textContent
            );
          }
          if (Array.isArray(result.errors) && result.errors.length && portalContext.elements.engagementsMailJobsList) {
            const details = result.errors.slice(0, 5).map((item) =>
              `${portalActions.clubDisplayLabel(item, { fallback: "Club" })} : ${item.message || "erreur inconnue"}`
            ).join(" | ");
            portalContext.elements.engagementsMailJobsList.insertAdjacentHTML(
              "afterbegin",
              `<p class="admin-portal-message" data-tone="error">E-mails PDF non préparés : ${portalActions.escapeHtml(details)}</p>`
            );
          }
        } catch (error) {
          if (portalContext.elements.engagementsNotificationPreviewStatus) portalContext.elements.engagementsNotificationPreviewStatus.textContent = `Aperçu impossible : ${error?.message || error}`;
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = `Préparation des e-mails PDF impossible : ${error?.message || error}`;
          }
          portalActions.finishEngagementLongOperation("error", "Préparation des courriels impossible", error?.message || String(error));
        } finally {
          if (button) button.disabled = false;
        }
      }

    async function sendEngagementPreparedEmails(type = "opening_notification") {
        if (!portalState.selectedEngagementCompetitionId || !portalActions.isEngagementAdminMode()) return;
        if (portalState.engagementMailJobsCompetitionId !== portalState.selectedEngagementCompetitionId) {
          await portalActions.loadEngagementMailJobs({ force: true });
        }
        const matchingJobs = portalState.engagementMailJobs.filter((job) => job.type === type);
        const pendingJobs = matchingJobs.filter((job) => job.status !== "sent");
        const pendingCount = pendingJobs.length;
        const actionLabel = moduleActions.engagementMailSendActionLabel(type);
        if (!pendingCount && !portalState.engagementMailJobsHasMore) {
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = `Aucun e-mail ${actionLabel} à envoyer.`;
          }
          return;
        }
        const sampleRecipients = pendingJobs.slice(0, 6).map((job) => job.toEmail).filter(Boolean);
        const confirmed = global.confirm(
          [
            portalState.engagementMailJobsHasMore
              ? `${pendingCount ? `Envoyer au moins ${pendingCount} e-mail${pendingCount > 1 ? "s" : ""}` : "Envoyer les e-mails non affichés"} ${actionLabel} ?`
              : `Envoyer ${pendingCount} e-mail${pendingCount > 1 ? "s" : ""} ${actionLabel} ?`,
            sampleRecipients.length ? `Destinataires : ${sampleRecipients.join(", ")}${pendingCount > sampleRecipients.length ? ", ..." : ""}` : "",
            portalState.engagementMailJobsHasMore ? "La liste affichée est paginée ; l'envoi inclura aussi les courriels suivants." : "",
            "Seuls les e-mails préparés, bloqués ou en erreur seront envoyés."
          ].filter(Boolean).join("\n\n")
        );
        if (!confirmed) return;
        const button = moduleActions.engagementMailSendButton(type);
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsDocumentsSummary) {
          portalContext.elements.engagementsDocumentsSummary.textContent = `Envoi des e-mails ${actionLabel}...`;
        }
        portalActions.startEngagementLongOperation(
          `Envoi des courriels ${actionLabel} en cours...`,
          "Les courriels préparés sont transmis. Ne relancez pas l'action pendant l'envoi."
        );
        try {
          const result = await portalActions.callFunction("sendEngagementPreparedEmails", {
            competitionId: portalState.selectedEngagementCompetitionId,
            type,
            limit: 500
          });
          if ((type === "club_recap_pdf" || type === "entries_txt") && Number(result.attemptedCount || 0)) {
            portalActions.updateSelectedEngagementDocumentStatus(
              type === "entries_txt" ? "entriesTxt" : "clubRecapEmails",
              Number(result.errorCount || 0) ? "generated" : "sent"
            );
          }
          await portalActions.loadEngagementMailJobs({ force: true });
          if (portalContext.elements.engagementsDocumentsSummary) {
            const sentCount = Number(result.sentCount || 0);
            const errorCount = Number(result.errorCount || 0);
            const attemptedCount = Number(result.attemptedCount || 0);
            portalContext.elements.engagementsDocumentsSummary.textContent = [
              `${sentCount}/${attemptedCount} e-mail${attemptedCount > 1 ? "s" : ""} ${actionLabel} envoyé${sentCount > 1 ? "s" : ""}`,
              errorCount ? `${errorCount} erreur${errorCount > 1 ? "s" : ""}` : ""
            ].filter(Boolean).join(" - ");
            portalActions.finishEngagementLongOperation(
              errorCount ? "error" : "success",
              errorCount ? "Envoi terminé avec des erreurs" : "Courriels envoyés",
              portalContext.elements.engagementsDocumentsSummary.textContent
            );
          }
        } catch (error) {
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = `Envoi des e-mails impossible : ${error?.message || error}`;
          }
          portalActions.finishEngagementLongOperation("error", "Envoi des courriels impossible", error?.message || String(error));
        } finally {
          if (button) button.disabled = false;
        }
      }

    async function createEngagementClubSwimmer() {
        if (!portalActions.canUse("engagements.club.manage")) return;
        const dialog = portalContext.elements.engagementsClubNewSwimmerDialog;
        if (dialog?.dataset?.busy === "true") return;
        const directory = dialog?.dataset?.origin === "directory";
        const requestClubId = String(portalActions.engagementClubScope() || "");
        const requestVersion = dialog?.dataset?.requestVersion;
        const competitionId = portalState.selectedEngagementCompetitionId;
        const current = () => portalActions.canUse("engagements.club.manage") && String(portalActions.engagementClubScope() || "") === requestClubId &&
          dialog?.dataset?.requestVersion === requestVersion && (directory
            ? dialog.open && dialog.dataset.origin === "directory" && portalState.activeEngagementsTab === "clubSwimmers" && portalActions.requestedNavigationView() === "engagements"
            : portalState.selectedEngagementCompetitionId === competitionId);
        const lockReason = moduleActions.engagementClubNewSwimmerLockReason();
        if (lockReason) {
          moduleActions.setEngagementClubNewSwimmerMessage(lockReason, "error");
          moduleActions.updateEngagementClubNewSwimmerControls();
          return;
        }
        const swimmer = moduleActions.selectedEngagementClubNewSwimmerFromForm();
        if (!swimmer.licenseNumber) {
          if (portalContext.elements.engagementsClubNewSwimmerAlerts) portalContext.elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
          moduleActions.setEngagementClubNewSwimmerMessage("Le numéro de licence est obligatoire pour vérifier ou créer un nageur.", "error");
          return;
        }
        if (!portalConfig.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(swimmer.licenseNumber)) {
          if (portalContext.elements.engagementsClubNewSwimmerLicense) {
            portalContext.elements.engagementsClubNewSwimmerLicense.value = swimmer.licenseNumber;
            portalContext.elements.engagementsClubNewSwimmerLicense.reportValidity?.();
          }
          moduleActions.setEngagementClubNewSwimmerMessage("Le numéro de licence doit respecter le format A-12-34567.", "error");
          return;
        }
        portalState.engagementClubSwimmerRecovery = null;
        if (portalContext.elements.engagementsClubRecoverSwimmerButton) portalContext.elements.engagementsClubRecoverSwimmerButton.hidden = true;
        if (portalContext.elements.engagementsClubNewSwimmerSaveButton) portalContext.elements.engagementsClubNewSwimmerSaveButton.disabled = true;
        if (dialog?.dataset) dialog.dataset.busy = "true";
        moduleActions.updateEngagementClubNewSwimmerControls();
        moduleActions.setEngagementClubNewSwimmerMessage("Vérification des rapprochements...", "loading");
        try {
          let result;
          if (portalState.engagementClubSwimmerCreationRetry && JSON.stringify(portalState.engagementClubSwimmerCreationRetry.swimmer) === JSON.stringify(swimmer)) {
            result = await portalActions.callFunction("createEngagementClubSwimmer", portalState.engagementClubSwimmerCreationRetry);
          } else {
          const recovery = await portalActions.callFunction("previewEngagementClubSwimmerRecovery", {
            licenseNumber: swimmer.licenseNumber
          });
          if (!current()) return;
          if (recovery.found) {
            portalState.engagementClubSwimmerRecovery = recovery;
            moduleActions.renderEngagementClubSwimmerRecovery(recovery);
            moduleActions.setEngagementClubNewSwimmerMessage(
              recovery.eligible
                ? "Vérifiez le nageur puis choisissez « Récupérer ce nageur »."
                : recovery.sameClub ? "Ce nageur est déjà connu dans votre club."
                : "Récupération impossible sans dérogation nationale.",
              recovery.eligible ? "warning" : recovery.sameClub ? "ok" : "error"
            );
            return;
          }
          if (!swimmer.firstName || !swimmer.lastName || !swimmer.birthDate || !swimmer.sex) {
            if (portalContext.elements.engagementsClubNewSwimmerAlerts) portalContext.elements.engagementsClubNewSwimmerAlerts.innerHTML = "";
            moduleActions.setEngagementClubNewSwimmerMessage("Prénom, nom, date de naissance et sexe sont obligatoires pour créer un nouveau nageur.", "error");
            return;
          }
          const preview = await portalActions.callFunction("previewEngagementClubSwimmerCreation", {
            swimmer
          });
          if (!current()) return;
          const alerts = Array.isArray(preview.alerts) ? preview.alerts : [];
          moduleActions.renderEngagementClubNewSwimmerAlerts(alerts, { confirmed: false });
          const blockingAlert = alerts.find((alert) => alert.type === "inverted-identity");
          if (preview.blocksCreation === true || blockingAlert) {
            const matchingName = blockingAlert?.name ? ` : ${blockingAlert.name}` : "";
            moduleActions.setEngagementClubNewSwimmerMessage(`Création impossible${matchingName}. Le nom et le prénom sont inversés pour la même date de naissance.`, "error");
            return;
          }
          if (alerts.length && !global.confirm(moduleActions.engagementClubNewSwimmerConfirmationMessage(alerts))) {
            moduleActions.setEngagementClubNewSwimmerMessage("Création annulée : rapprochement à vérifier.", "error");
            return;
          }
          moduleActions.setEngagementClubNewSwimmerMessage("Création du nageur...", "loading");
          if (!current()) return;
          const payload = {
            competitionId: directory ? "" : competitionId || "",
            swimmer,
            confirmAlerts: alerts.length > 0,
            ...(preview.source === "nap" ? {creationId: global.crypto.randomUUID()} : {})
          };
          if (preview.source === "nap") portalState.engagementClubSwimmerCreationRetry = payload;
          result = await portalActions.callFunction("createEngagementClubSwimmer", payload);
          }
          if (!current()) return;
          portalActions.invalidateEngagementClubSwimmersCache();
          await moduleActions.loadEngagementClubSwimmers({ force: true, silent: true });
          if (!current()) return;
          moduleActions.renderEngagementClubNewSwimmerAlerts(Array.isArray(result.alerts) ? result.alerts : [], { confirmed: true });
          moduleActions.resetEngagementClubNewSwimmerForm();
          moduleActions.closeEngagementClubNewSwimmerDialog({ force: true, restoreFocus: false });
          if (directory) {
            if (portalContext.elements.engagementsClubSwimmersDirectorySearch) portalContext.elements.engagementsClubSwimmersDirectorySearch.value = result.swimmer?.lastName || swimmer.lastName || "";
            portalState.engagementClubSwimmersDirectorySexFilter = "all";
            portalActions.renderEngagementClubSwimmersDirectory();
            const status = portalContext.elements.engagementsClubSwimmersDirectoryStatus;
            if (status) {
              const visible = portalState.engagementClubSwimmers?.some(row => String(row.licenseNumber || "") === String(result.swimmer?.licenseNumber || swimmer.licenseNumber));
              status.textContent = visible === false ? "Nageur créé ; actualisez la liste pour vérifier son affichage." : "Nageur créé pour ce club.";
              status.dataset.tone = visible === false ? "warning" : "ok";
            }
            document.getElementById("adminEngagementsClubSwimmersDirectoryAddButton")?.focus();
            return;
          }
          if (portalContext.elements.engagementsClubSwimmersSearch) {
            portalContext.elements.engagementsClubSwimmersSearch.value = result.swimmer?.lastName || swimmer.lastName || "";
            portalActions.renderEngagementClubSwimmers();
          }
          if (portalContext.elements.engagementsClubSwimmersMessage) {
            portalContext.elements.engagementsClubSwimmersMessage.textContent = "Nageur créé. Vous pouvez maintenant le sélectionner dans la liste.";
            portalContext.elements.engagementsClubSwimmersMessage.dataset.tone = "ok";
          }
        } catch (error) {
          if (current()) moduleActions.setEngagementClubNewSwimmerMessage(`Création impossible : ${error?.message || error}`, "error");
        } finally {
          if (dialog?.dataset?.requestVersion === requestVersion) {
            if (dialog?.dataset) delete dialog.dataset.busy;
            moduleActions.updateEngagementClubNewSwimmerControls();
          }
        }
      }

    async function recoverEngagementClubSwimmer() {
        const recovery = portalState.engagementClubSwimmerRecovery;
        if (!recovery?.eligible || !recovery?.swimmer?.licenseNumber || !portalActions.canUse("engagements.club.manage")) return;
        const dialog = portalContext.elements.engagementsClubNewSwimmerDialog;
        if (dialog?.dataset?.busy === "true") return;
        const directory = dialog?.dataset?.origin === "directory";
        const requestClubId = String(portalActions.engagementClubScope() || "");
        const requestVersion = dialog?.dataset?.requestVersion;
        const competitionId = portalState.selectedEngagementCompetitionId;
        const current = () => portalActions.canUse("engagements.club.manage") && String(portalActions.engagementClubScope() || "") === requestClubId &&
          dialog?.dataset?.requestVersion === requestVersion && (directory
            ? dialog.open && dialog.dataset.origin === "directory" && portalState.activeEngagementsTab === "clubSwimmers" && portalActions.requestedNavigationView() === "engagements"
            : portalState.selectedEngagementCompetitionId === competitionId);
        const lockReason = moduleActions.engagementClubNewSwimmerLockReason();
        if (lockReason) {
          moduleActions.setEngagementClubNewSwimmerMessage(lockReason, "error");
          moduleActions.updateEngagementClubNewSwimmerControls();
          return;
        }
        const name = portalActions.engagementSwimmerDisplayName(recovery.swimmer, "ce nageur");
        if (!global.confirm(`Récupérer ${name} pour votre club ? Cette action est possible car aucun résultat n'est publié cette saison.`)) return;
        if (!current()) return;
        if (dialog?.dataset) dialog.dataset.busy = "true";
        moduleActions.updateEngagementClubNewSwimmerControls();
        if (portalContext.elements.engagementsClubRecoverSwimmerButton) portalContext.elements.engagementsClubRecoverSwimmerButton.disabled = true;
        moduleActions.setEngagementClubNewSwimmerMessage("Récupération du nageur...", "loading");
        try {
          if (recovery.source === "nap" && !recovery.mutationId) recovery.mutationId = global.crypto.randomUUID();
          const result = await portalActions.callFunction("recoverEngagementClubSwimmer", {
            licenseNumber: recovery.swimmer.licenseNumber,
            ...(recovery.source === "nap" ? {mutationId:recovery.mutationId,expectedFingerprint:recovery.swimmer.napFingerprint} : {}),
            competitionId: directory ? "" : competitionId || ""
          });
          if (!current()) return;
          portalActions.invalidateEngagementClubSwimmersCache();
          await moduleActions.loadEngagementClubSwimmers({ force: true, silent: true });
          if (!current()) return;
          moduleActions.resetEngagementClubNewSwimmerForm();
          moduleActions.closeEngagementClubNewSwimmerDialog({ force: true, restoreFocus: false });
          if (directory) {
            if (portalContext.elements.engagementsClubSwimmersDirectorySearch) portalContext.elements.engagementsClubSwimmersDirectorySearch.value = result.swimmer?.lastName || "";
            portalState.engagementClubSwimmersDirectorySexFilter = "all";
            portalActions.renderEngagementClubSwimmersDirectory();
            const status = portalContext.elements.engagementsClubSwimmersDirectoryStatus;
            if (status) {
              const visible = portalState.engagementClubSwimmers?.some(row => String(row.licenseNumber || "") === String(result.swimmer?.licenseNumber || recovery.swimmer.licenseNumber));
              status.textContent = visible === false ? "Nageur récupéré ; actualisez la liste pour vérifier son affichage." : "Nageur récupéré pour ce club.";
              status.dataset.tone = visible === false ? "warning" : "ok";
            }
            document.getElementById("adminEngagementsClubSwimmersDirectoryAddButton")?.focus();
            return;
          }
          if (portalContext.elements.engagementsClubSwimmersSearch) {
            portalContext.elements.engagementsClubSwimmersSearch.value = result.swimmer?.lastName || "";
            portalActions.renderEngagementClubSwimmers();
          }
          if (portalContext.elements.engagementsClubSwimmersMessage) {
            portalContext.elements.engagementsClubSwimmersMessage.textContent = "Nageur récupéré. Vous pouvez maintenant le sélectionner dans la liste.";
            portalContext.elements.engagementsClubSwimmersMessage.dataset.tone = "ok";
          }
        } catch (error) {
          if (current()) moduleActions.setEngagementClubNewSwimmerMessage(`Récupération impossible : ${error?.message || error}`, "error");
        } finally {
          if (dialog?.dataset?.requestVersion === requestVersion) {
            if (dialog?.dataset) delete dialog.dataset.busy;
            moduleActions.updateEngagementClubNewSwimmerControls();
          }
        }
      }

    async function deleteOrRequestEngagementCompetitionDeletion() {
        if (!portalState.selectedEngagementCompetition?.id || !portalActions.canManageEngagementCompetitionScope(portalState.selectedEngagementCompetition)) return;
        if (portalState.engagementDetailEditing && !portalActions.confirmLeaveDirtyEngagementTab()) return;

        const competition = portalState.selectedEngagementCompetition;
        const directDelete = portalActions.canDeleteEngagementCompetitionImmediately(competition);
        const actionLabel = directDelete ? "Supprimer définitivement" : "Demander la suppression de";
        let nativePreview = null;
        if (competition.napSource === true) {
          if (!directDelete) return;
          if (portalContext.elements.engagementsDeleteButton) portalContext.elements.engagementsDeleteButton.disabled = true;
          if (portalContext.elements.engagementsDetailStatus) portalContext.elements.engagementsDetailStatus.textContent = "Vérification des engagements et résultats…";
          try {
            nativePreview = await portalActions.callFunction("deleteEngagementCompetition", { competitionId: competition.id, previewOnly: true });
            if (nativePreview?.source !== "nap" || !nativePreview.expectedFingerprint) throw new Error("Aperçu de suppression indisponible.");
          } catch (error) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = `Suppression impossible : ${error?.message || error}`;
              portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
            }
            return;
          } finally {
            if (portalContext.elements.engagementsDeleteButton) portalContext.elements.engagementsDeleteButton.disabled = false;
          }
        }
        const confirmMessage = nativePreview
          ? `Supprimer définitivement la compétition "${nativePreview.name || competition.name || "sans nom"}" ?\n\nÉléments retirés : ${nativePreview.documents} document(s) rattaché(s), ${nativePreview.courses} course(s), ${nativePreview.programSessions} session(s), ${nativePreview.programCourses} passage(s)${nativePreview.detailedProgram ? ", programme détaillé" : ""}, ainsi que les paramètres de la compétition.\n\nAucun engagement ni résultat n'est présent. Cette action est irréversible.`
          : directDelete
            ? `${actionLabel} la compétition "${competition.name || "sans nom"}" ? Cette action est irréversible.`
            : `${actionLabel} la compétition "${competition.name || "sans nom"}" ? Un administrateur national devra valider la suppression.`;
        if (!global.confirm(confirmMessage)) {
          if (nativePreview && portalContext.elements.engagementsDetailStatus) portalContext.elements.engagementsDetailStatus.textContent = "Suppression annulée.";
          return;
        }

        const deleteButtonLabel = portalContext.elements.engagementsDeleteButton?.textContent || "";
        let deletionCompleted = false;
        if (portalContext.elements.engagementsDeleteButton) {
          portalContext.elements.engagementsDeleteButton.disabled = true;
          portalContext.elements.engagementsDeleteButton.textContent = directDelete ? "Suppression en cours..." : "Envoi en cours...";
          portalContext.elements.engagementsDeleteButton.setAttribute("aria-busy", "true");
        }
        if (portalContext.elements.engagementsDetailStatus) {
          portalContext.elements.engagementsDetailStatus.textContent = directDelete
            ? "Suppression de la compétition..."
            : "Envoi de la demande de suppression...";
          portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
        }

        try {
          await portalActions.callFunction(directDelete ? "deleteEngagementCompetition" : "requestEngagementCompetitionDeletion", {
            competitionId: competition.id,
            ...(nativePreview ? { confirmPermanent: true, expectedFingerprint: nativePreview.expectedFingerprint } : {})
          });
          deletionCompleted = true;
          if (directDelete) {
            const remainingCompetitions = portalState.engagementCompetitions.filter((item) => item.id !== competition.id);
            portalActions.invalidateEngagementCalendarCaches();
            const filters = portalActions.engagementCalendarFiltersPayload();
            const requestedRange = portalActions.engagementCalendarRequestedRange(filters);
            const cacheKey = portalActions.engagementCalendarCacheKey("admin", requestedRange);
            portalActions.activateEngagementCalendarCache(cacheKey, requestedRange, portalActions.writeEngagementCalendarCache(cacheKey, remainingCompetitions));
            portalActions.clearEngagementDetailTabDirty();
            moduleActions.closeEngagementCompetitionDetail();
            if (portalContext.elements.engagementsStatus) {
              const successMessage = "Compétition supprimée.";
              portalContext.elements.engagementsStatus.hidden = false;
              portalContext.elements.engagementsStatus.textContent = successMessage;
              portalContext.elements.engagementsStatus.dataset.tone = "ok";
              global.setTimeout(() => {
                if (portalContext.elements.engagementsStatus?.textContent !== successMessage || portalContext.elements.engagementsStatus?.dataset.tone !== "ok") return;
                portalContext.elements.engagementsStatus.textContent = "";
                delete portalContext.elements.engagementsStatus.dataset.tone;
                portalContext.elements.engagementsStatus.hidden = true;
              }, 4000);
            }
          } else if (portalContext.elements.engagementsDetailStatus) {
            portalState.selectedEngagementCompetition = {
              ...portalState.selectedEngagementCompetition,
              deletionRequestStatus: "pending"
            };
            moduleActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition || {});
            portalContext.elements.engagementsDetailStatus.textContent = "Demande de suppression envoyée au niveau national.";
            portalContext.elements.engagementsDetailStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsDetailStatus) {
            portalContext.elements.engagementsDetailStatus.textContent = `Suppression impossible : ${error?.message || error}`;
            portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
          }
        } finally {
          if (portalContext.elements.engagementsDeleteButton) {
            portalContext.elements.engagementsDeleteButton.removeAttribute("aria-busy");
            if (!deletionCompleted) {
              portalContext.elements.engagementsDeleteButton.disabled = false;
              portalContext.elements.engagementsDeleteButton.textContent = deleteButtonLabel;
            }
          }
        }
      }
    return { loadEngagementCompetitionDetail, retryEngagementCompetitionRead, saveEngagementClubTeamLeader, removeEngagementClubTeamLeader, saveEngagementClubOfficials, loadEngagementClubSwimmers, saveEngagementClubSwimmers, saveEngagementClubRelays, downloadEngagementClubSummaryPdf, downloadEngagementAdminClubRecapPdf, generateEngagementAdminClubRecapPdfs, generateEngagementAdminTxtExport, prepareEngagementOpeningEmails, prepareEngagementClubRecapEmails, sendEngagementPreparedEmails, createEngagementClubSwimmer, recoverEngagementClubSwimmer, deleteOrRequestEngagementCompetitionDeletion };
  });
})(window);
