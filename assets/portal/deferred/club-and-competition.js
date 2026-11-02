(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("club-and-competition", function create(portalContext, moduleActions) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function loadEngagementClubPeople({ force = false, silent = false, append = false, background = false } = {}) {
        const visible = () => !background || portalContext.elements.engagementsView?.hidden === false;
        if (!portalActions.canUse("engagements.club.manage") || portalState.engagementClubPeopleLoading) return;
        if(append && !portalState.engagementClubPeopleHasMore) return;
        if (portalState.engagementClubPeopleLoaded && !force && !append) {
          if (!visible()) return;
          if (portalState.activeEngagementsTab === "clubPeople") moduleActions.renderEngagementClubPeople();
          portalActions.renderEngagementClubPersonSwimmerOptions();
          portalActions.renderEngagementClubTeamPersonOptions(portalContext.elements.engagementsClubTeamPersonSelect?.value || "");
          if (portalState.activeEngagementsDetailTab === "officials") portalActions.renderEngagementClubOfficials();
          return;
        }
        portalState.engagementClubPeopleLoading = true;
        const requestVersion = portalState.engagementClubPeopleRequestVersion;
        if (visible()) {
          if (portalContext.elements.engagementsClubPeopleRetry) {
            portalContext.elements.engagementsClubPeopleRetry.hidden = true;
            portalContext.elements.engagementsClubPeopleRetry.disabled = true;
          }
          if(portalContext.elements.engagementsClubPeopleAddButton && global.LivePalmesEnvironment?.sportingDataSource === "nap") portalContext.elements.engagementsClubPeopleAddButton.disabled = true;
          if(portalContext.elements.engagementsClubPeopleLoadMore) portalContext.elements.engagementsClubPeopleLoadMore.disabled = true;
          if (portalContext.elements.engagementsClubPeopleStatus && !silent) {
            portalContext.elements.engagementsClubPeopleStatus.textContent = "Chargement de Mes officiels...";
            portalContext.elements.engagementsClubPeopleStatus.dataset.tone = "loading";
          }
        }
        try {
          const result = await portalActions.callFunction("listEngagementClubPeople", { includeInactive: true, ...(append ? {cursor:portalState.engagementClubPeopleCursor} : {}) });
          if(requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
          const people = Array.isArray(result.people) ? result.people : [];
          portalState.engagementClubPeople = append ? [...new Map([...portalState.engagementClubPeople,...people].map(person=>[person.id,person])).values()] : people;
          portalState.engagementClubPeopleCursor = result.nextCursor || null;
          portalState.engagementClubPeopleHasMore = result.source === "nap" && result.hasMore === true;
          portalState.engagementClubPeopleLoaded = true;
          if (visible()) {
            if (portalState.activeEngagementsTab === "clubPeople") moduleActions.renderEngagementClubPeople();
            portalActions.renderEngagementClubPersonSwimmerOptions();
            portalActions.renderEngagementClubTeamPersonOptions(portalContext.elements.engagementsClubTeamPersonSelect?.value || "");
            if (portalState.activeEngagementsDetailTab === "officials") portalActions.renderEngagementClubOfficials();
            if (portalContext.elements.engagementsClubPeopleStatus && !silent) {
              portalContext.elements.engagementsClubPeopleStatus.textContent = "";
              portalContext.elements.engagementsClubPeopleStatus.dataset.tone = "neutral";
            }
          }
        } catch (error) {
          if(requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
          if (visible() && portalContext.elements.engagementsClubPeopleRetry) portalContext.elements.engagementsClubPeopleRetry.hidden = false;
          if (visible() && portalContext.elements.engagementsClubPeopleStatus && (!silent || background)) {
            portalContext.elements.engagementsClubPeopleStatus.textContent = `Lecture impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubPeopleStatus.dataset.tone = "error";
          }
        } finally {
          if(requestVersion===portalState.engagementClubPeopleRequestVersion) {
            portalState.engagementClubPeopleLoading = false;
            if (visible()) {
              if (portalContext.elements.engagementsClubPeopleRetry) portalContext.elements.engagementsClubPeopleRetry.disabled = false;
              moduleActions.renderEngagementClubPeople();
              if(portalContext.elements.engagementsClubPeopleLoadMore) portalContext.elements.engagementsClubPeopleLoadMore.disabled = false;
              if (portalState.activeEngagementsDetailTab === "officials") portalActions.renderEngagementClubOfficials();
            }
          }
        }
      }

    async function saveEngagementClubPerson(event) {
        event?.preventDefault?.();
        if (!portalActions.canUse("engagements.club.manage")) return;
        const native=global.LivePalmesEnvironment?.sportingDataSource === "nap";
        if(native && portalState.engagementClubPersonSaving) return;
        const requestVersion=portalState.engagementClubPeopleRequestVersion;
        if (!native && !portalContext.elements.engagementsClubPersonRoleTeamLeader?.checked && !portalContext.elements.engagementsClubPersonRoleOfficial?.checked) {
          if (portalContext.elements.engagementsClubPersonMessage) {
          portalContext.elements.engagementsClubPersonMessage.textContent = "Sélectionnez au moins un rôle.";
            portalContext.elements.engagementsClubPersonMessage.dataset.tone = "error";
          }
          return;
        }
        if (portalContext.elements.engagementsClubPersonForm && !portalContext.elements.engagementsClubPersonForm.checkValidity()) {
          portalContext.elements.engagementsClubPersonForm.reportValidity?.();
          return;
        }
        const button = portalContext.elements.engagementsClubPersonForm?.querySelector('button[type="submit"]');
        if(native) {portalState.engagementClubPersonSaving=true;if(portalContext.elements.engagementsClubPersonForm) portalContext.elements.engagementsClubPersonForm.inert=true;moduleActions.renderEngagementClubPeople();}
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsClubPersonMessage) {
          portalContext.elements.engagementsClubPersonMessage.textContent = "Enregistrement...";
          portalContext.elements.engagementsClubPersonMessage.dataset.tone = "loading";
        }
        try {
          let personId = portalContext.elements.engagementsClubPersonId?.value || "";
          if(native) {
            const current=portalState.engagementClubPeople.find(item=>item.id===personId);
            const creating=!personId;
            if(!creating && !current?.nativeIdentityEditable) throw new Error("Cette fiche ne peut pas être corrigée ici.");
            const identity={
              firstName:String(portalContext.elements.engagementsClubPersonFirstName?.value || "").trim(),
              lastName:String(portalContext.elements.engagementsClubPersonLastName?.value || "").trim(),
              birthDate:String(portalContext.elements.engagementsClubPersonBirthDate?.value || "").trim(),
              sex:String(portalContext.elements.engagementsClubPersonSex?.value||""),licenseNumber:String(portalContext.elements.engagementsClubPersonLicense?.value||"").trim()
            };
            const roles={teamLeader:portalContext.elements.engagementsClubPersonRoleTeamLeader?.checked===true,official:portalContext.elements.engagementsClubPersonRoleOfficial?.checked===true};
            const payload=creating ? {creationId:portalContext.elements.engagementsClubPersonForm?.dataset.napCreationId,person:{...identity,roles}} : {personId,expectedFingerprint:portalContext.elements.engagementsClubPersonForm?.dataset.napFingerprint,roles,active:current.active};
            const result=await portalActions.callFunction("saveEngagementClubPerson",payload);
            if(requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
            if(result.source!=="nap" || !/^nap-official-\d+$/.test(result.person?.id || "") || !creating && result.person.id!==personId) throw new Error("Réponse NAP à vérifier avant de poursuivre.");
            portalState.engagementClubPeople=portalState.engagementClubPeople.filter(item=>item.id!==result.person.id).concat(result.person);
            const fromCompetition=portalState.engagementClubPersonFormHome?.fromCompetition===true;
            portalActions.closeEngagementClubPersonDialog();
            portalActions.resetEngagementClubPersonForm();
            if(portalContext.elements.engagementsClubPersonForm) portalContext.elements.engagementsClubPersonForm.hidden=true;
            if(fromCompetition && portalContext.elements.engagementsClubTeamMessage) {
              portalContext.elements.engagementsClubTeamMessage.textContent="Personne ajoutée au club. Aucun engagement en compétition n’a été créé.";
              portalContext.elements.engagementsClubTeamMessage.dataset.tone="neutral";
            }
            moduleActions.renderEngagementClubPeople();
            portalActions.renderEngagementClubTeamPersonOptions(portalContext.elements.engagementsClubTeamPersonSelect?.value || "");
            if(portalState.activeEngagementsDetailTab==="officials") portalActions.renderEngagementClubOfficials();
            return;
          }
          let person = moduleActions.selectedEngagementClubPersonFromForm();
          if (!personId && person.swimmerIndexId) {
            const swimmer = portalActions.engagementClubSwimmerFromReferenceValue(portalActions.engagementClubSwimmerReferenceValue({
              swimmerIndexId: person.swimmerIndexId,
              source: person.swimmerSource || "performances"
            }));
            personId = portalActions.engagementClubPersonForSwimmer(swimmer || {})?.id || "";
          }
          if (!personId) {
            const roleLabel = person.roles.official ? "officiel" : "chef d'équipe";
            const resolution = portalActions.resolveEngagementClubPersonIdentity(person, roleLabel);
            if (resolution.cancelled) {
              if (portalContext.elements.engagementsClubPersonMessage) {
                portalContext.elements.engagementsClubPersonMessage.textContent = "Création annulée : utilisez la personne proposée ou corrigez l'identité.";
                portalContext.elements.engagementsClubPersonMessage.dataset.tone = "warning";
              }
              return;
            }
            if (resolution.person) {
              personId = resolution.person.id;
              person = {
                ...portalActions.engagementClubPersonPayloadWithRole(resolution.person),
                roles: {
                  teamLeader: resolution.person.roles?.teamLeader === true || person.roles.teamLeader,
                  official: resolution.person.roles?.official === true || person.roles.official
                }
              };
            }
          }
          await portalActions.callFunction("saveEngagementClubPerson", {
            personId,
            person
          });
          portalActions.resetEngagementClubPersonForm();
          if (portalContext.elements.engagementsClubPersonForm) portalContext.elements.engagementsClubPersonForm.hidden = true;
          portalState.engagementClubPeopleLoaded = false;
          await moduleActions.loadEngagementClubPeople({ force: true });
          portalActions.renderEngagementClubTeamPersonOptions(portalContext.elements.engagementsClubTeamPersonSelect?.value || "");
        } catch (error) {
          if(native && requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
          if (portalContext.elements.engagementsClubPersonMessage) {
            portalContext.elements.engagementsClubPersonMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubPersonMessage.dataset.tone = "error";
          }
        } finally {
          if(!native || requestVersion===portalState.engagementClubPeopleRequestVersion) {
            if (button) button.disabled = false;
            if(native) {portalState.engagementClubPersonSaving=false;if(portalContext.elements.engagementsClubPersonForm) portalContext.elements.engagementsClubPersonForm.inert=false;moduleActions.renderEngagementClubPeople();}
          }
        }
      }

    async function setEngagementClubPersonStatus(personId, active) {
        const person = portalState.engagementClubPeople.find((item) => item.id === personId);
        if (!person || person.statusSaving) return;
        const label = [person.firstName, person.lastName].filter(Boolean).join(" ") || person.licenseNumber;
        if (!global.confirm(`${active ? "Réactiver" : "Désactiver"} ${label} ? Les engagements déjà saisis seront conservés.`)) return;
        const requestVersion=portalState.engagementClubPeopleRequestVersion;
        person.statusSaving=true;moduleActions.renderEngagementClubPeople();
        try {
          const result=await portalActions.callFunction("setEngagementClubPersonStatus", { personId, active, ...(person.napSource?{expectedFingerprint:person.napFingerprint}:{}) });
          if(requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
          if(result.source==="nap" && result.person?.id===personId) {
            portalState.engagementClubPeople=portalState.engagementClubPeople.map(item=>item.id===personId?result.person:item);
            moduleActions.renderEngagementClubPeople();
            portalActions.renderEngagementClubTeamPersonOptions(portalContext.elements.engagementsClubTeamPersonSelect?.value || "");
            if(portalState.activeEngagementsDetailTab==="officials") portalActions.renderEngagementClubOfficials();
            return;
          }
          portalState.engagementClubPeopleLoaded = false;
          await moduleActions.loadEngagementClubPeople({ force: true });
        } catch (error) {
          if(requestVersion!==portalState.engagementClubPeopleRequestVersion) return;
          if (portalContext.elements.engagementsClubPeopleStatus) {
            portalContext.elements.engagementsClubPeopleStatus.textContent = `Changement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubPeopleStatus.dataset.tone = "error";
          }
        } finally {
          delete person.statusSaving;
          if(requestVersion===portalState.engagementClubPeopleRequestVersion) moduleActions.renderEngagementClubPeople();
        }
      }

    async function loadEngagementCompetitions({ force = false, mode = portalActions.engagementNavigationMode(), activate = null, silent = false } = {}) {
        const requestedMode = mode === "admin" ? "admin" : "club";
        const allowed = requestedMode === "admin" ? portalActions.canCreateEngagementCompetition() : portalActions.canUse("engagements.club.manage");
        if (!allowed) return;
        const filters = portalActions.engagementCalendarFiltersPayload();
        const septemberPreview = portalActions.engagementCalendarSeptemberPreview(filters);
        const requestedRange = portalActions.engagementCalendarRequestedRange(filters);
        const cacheKey = portalActions.engagementCalendarCacheKey(requestedMode, requestedRange);
        const clubCalendarAlreadyOpen = requestedMode === "club" && global.location.hash === "#club-competitions";
        const shouldActivate = activate === null
          ? requestedMode === portalActions.engagementNavigationMode()
          : activate === true || clubCalendarAlreadyOpen;
        const cachedEntry = portalActions.readEngagementCalendarCache(cacheKey) || (portalState.engagementCompetitionsLoadedCacheKey === cacheKey && portalState.engagementCompetitionsLoaded
          ? { competitions: portalState.engagementCompetitions, cachedAt: portalState.engagementCompetitionsCachedAt }
          : null);
        if (cachedEntry && shouldActivate) {
          portalActions.activateEngagementCalendarCache(cacheKey, requestedRange, cachedEntry);
        }
        // Only a successful read in this page is authoritative. Stored data may
        // paint immediately, but never suppresses the first server read on F5.
        const cacheFresh = cachedEntry?.loadedInPage === true;
        if (!force && cacheFresh) {
          if (requestedMode === "club") portalActions.scheduleEngagementClubWorkspacePreload(cachedEntry.competitions);
          return cachedEntry;
        }
        const cachedListVisible = Boolean(cachedEntry && shouldActivate);
        if (!cachedListVisible && shouldActivate && portalContext.elements.engagementsCalendarList) {
          portalContext.elements.engagementsCalendarList.innerHTML = `
        <div class="admin-engagements-calendar-loading" role="status">
          <strong>Chargement des compétitions...</strong>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </div>
      `;
        }
        if (!silent && !cachedListVisible && shouldActivate && portalContext.elements.engagementsStatus) {
          portalContext.elements.engagementsStatus.hidden = false;
          portalContext.elements.engagementsStatus.textContent = "Chargement du calendrier...";
          portalContext.elements.engagementsStatus.dataset.tone = "loading";
        }
        const pendingRequest = portalConfig.engagementCompetitionCalendarRequests.get(cacheKey);
        if (pendingRequest) {
          return pendingRequest.then((entry) => {
            if (!entry && shouldActivate) {
              return loadEngagementCompetitions({ force: true, mode: requestedMode, activate: true, silent: false });
            }
            const currentFilters = portalActions.engagementCalendarFiltersPayload();
            const stillActive = entry && shouldActivate && requestedMode === portalActions.engagementNavigationMode() &&
              portalActions.engagementCalendarCacheKey(requestedMode, portalActions.engagementCalendarRequestedRange(currentFilters)) === cacheKey;
            if (stillActive) {
              portalActions.activateEngagementCalendarCache(cacheKey, requestedRange, entry);
              if (portalContext.elements.engagementsStatus) {
                portalContext.elements.engagementsStatus.textContent = "";
                delete portalContext.elements.engagementsStatus.dataset.tone;
                portalContext.elements.engagementsStatus.hidden = true;
              }
            }
            return entry;
          });
        }
        const cacheRevision = portalState.engagementCalendarCacheRevision;
        const requestPromise = (async () => {
          try {
            const ranges = [
              { startDate: filters.startDate, endDate: filters.endDate },
              ...(septemberPreview ? [septemberPreview] : [])
            ];
            const result = await portalActions.callFunction("listEngagementCompetitions", {
              ranges: ranges.map((range) => ({ fromDate: range.startDate, toDate: range.endDate })),
              manageOnly: requestedMode === "admin",
              includeCalendarEvents: requestedMode === "admin",
              limit: 250
            });
            // Older/Firestore backends retain their existing second endpoint.
            const calendarEventResult = requestedMode === "admin"
              ? Array.isArray(result.calendarEvents) ? { events: result.calendarEvents }
                : await portalActions.callFunction("listEngagementCalendarEvents", {
                    ranges: ranges.map((range) => ({ fromDate: range.startDate, toDate: range.endDate })),
                    limit: 250
                  })
              : { events: [] };
            if (cacheRevision !== portalState.engagementCalendarCacheRevision) return null;
            let competitions = [
              ...(Array.isArray(result.competitions) ? result.competitions.map((item) => ({ ...item, sourceType: "competition" })) : []),
              ...(Array.isArray(calendarEventResult.events) ? calendarEventResult.events.map((item) => ({ ...item, sourceType: item.napSource ? "competition" : "calendarEvent" })) : [])
            ];
            if (requestedMode === "admin" && !portalActions.canUse("engagements.national.manage")) {
              competitions = competitions.filter((competition) => portalActions.canManageEngagementCompetitionScope(competition));
            }
            const entry = portalActions.writeEngagementCalendarCache(cacheKey, competitions, Date.now(), result.source === "nap" ? "nap" : "");
            entry.loadedInPage = true;
            if (requestedMode === "club") portalActions.scheduleEngagementClubWorkspacePreload(entry.competitions);
            const currentFilters = portalActions.engagementCalendarFiltersPayload();
            const stillActive = shouldActivate && requestedMode === portalActions.engagementNavigationMode() &&
              portalActions.engagementCalendarCacheKey(requestedMode, portalActions.engagementCalendarRequestedRange(currentFilters)) === cacheKey;
            if (stillActive) portalActions.activateEngagementCalendarCache(cacheKey, requestedRange, entry);
            const deepLinkedCompetitionId = new URLSearchParams(global.location.search).get("competition") || "";
            if (stillActive && requestedMode === "club" && deepLinkedCompetitionId && !portalState.engagementPublicDeepLinkHandled) {
              portalState.engagementPublicDeepLinkHandled = true;
              portalActions.loadEngagementCompetitionDetail(deepLinkedCompetitionId, "general");
            }
            if (stillActive && portalContext.elements.engagementsStatus) {
              portalContext.elements.engagementsStatus.textContent = "";
              delete portalContext.elements.engagementsStatus.dataset.tone;
              portalContext.elements.engagementsStatus.hidden = true;
            }
            return entry;
          } catch (error) {
            if (shouldActivate && requestedMode === portalActions.engagementNavigationMode() && portalContext.elements.engagementsStatus) {
              portalContext.elements.engagementsStatus.hidden = false;
              portalContext.elements.engagementsStatus.textContent = cachedEntry
                ? `Liste affichée depuis le cache ; actualisation impossible : ${error?.message || error}`
                : `Calendrier indisponible : ${error?.message || error}`;
              portalContext.elements.engagementsStatus.dataset.tone = "error";
            }
            if (!cachedEntry && shouldActivate && portalContext.elements.engagementsCalendarList) {
              portalContext.elements.engagementsCalendarList.innerHTML = '<p class="admin-engagements-empty">Le calendrier est momentanément indisponible. Réessayez dans quelques instants.</p>';
            }
            return cachedEntry || null;
          } finally {
            if (portalConfig.engagementCompetitionCalendarRequests.get(cacheKey) === requestPromise) {
              portalConfig.engagementCompetitionCalendarRequests.delete(cacheKey);
            }
          }
        })();
        portalConfig.engagementCompetitionCalendarRequests.set(cacheKey, requestPromise);
        return requestPromise;
      }

    async function saveNativeCompetitionDetail(options = {}) {
        const button = portalContext.elements.engagementsSaveButton;
        let nativeCoursesAdded = false;
        let nativeCoursesRemoved = false;
        try {
          const selectionError=portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition)==="openWater"&&(portalActions.selectedEngagementEventsCategoryError()||portalActions.selectedEngagementProgramError());
          if(selectionError)throw new Error(selectionError);
          const patch = moduleActions.nativeCompetitionPatchFromForm();
          const existingCodes = new Set((portalState.selectedEngagementCompetition.events || []).map(event => event.code));
          const additions = portalActions.selectedEngagementEventsFromForm().filter(event => !existingCodes.has(event.code));
          const selectedCodes=new Set(portalActions.selectedEngagementEventsFromForm().map(event=>event.code));
          const removedEvents=portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition)==="openWater"?(portalState.selectedEngagementCompetition.events||[]).filter(event=>event.nativeRecognized===true&&!selectedCodes.has(event.code)):[];
          const removalIds=removedEvents.flatMap(event=>(event.nativeCourses||[]).map(row=>Number(row.id)));
          if(removedEvents.length&&(!removalIds.length||removedEvents.some(event=>!event.nativeCourses?.length)))throw new Error("Références natives des courses à retirer absentes. Rechargez la fiche.");
          if (!Object.keys(patch).length) {
            if (portalContext.elements.engagementsDetailStatus) portalContext.elements.engagementsDetailStatus.textContent = "Aucune modification à enregistrer.";
            return false;
          }
          if(removalIds.length&&!global.confirm("Retirer les courses décochées de cette compétition ? Les engagements existants seront conservés. En présence d’engagements, ce retrait est réservé au National."))return false;
          if (patch.entryStatus === "closed" && !global.confirm("Fermer les engagements dans LivePalmes ? Les engagements existants et la date limite seront conservés.")) return false;
          if (["level","regionId","invitedRegionIds"].some(key=>Object.hasOwn(patch,key)) && !global.confirm("Modifier le niveau, la région organisatrice ou les régions invitées dans LivePalmes ? Les engagements déjà enregistrés seront conservés.")) return false;
          if (patch.entryStatus === "open" && !global.confirm("Ouvrir les engagements dans LivePalmes ? Les notifications autorisées par le réglage national partiront uniquement vers livepalmes@nap-ffessm.fr sur TEST.")) return false;
          const notificationOpeningRequested=patch.entryStatus==='open' && (portalState.selectedEngagementCompetition.entryStatus!=='closed'||moduleActions.confirmEngagementReopeningMail({...portalState.selectedEngagementCompetition,...patch}));
          if (button) button.disabled = true;
          if (portalContext.elements.engagementsDetailStatus) { portalContext.elements.engagementsDetailStatus.textContent = "Enregistrement dans NAP..."; portalContext.elements.engagementsDetailStatus.dataset.tone = "loading"; }
          let result;
          if (additions.length) {
            result = await portalActions.callFunction("updateEngagementCompetition", { competitionId:portalState.selectedEngagementCompetition.id, expectedFingerprint:portalState.selectedEngagementCompetition.napFingerprint, patch:{addNativeCourses:additions.map(event=>({code:event.code,relayMixedMode:event.relayMixedMode||""}))} });
            portalState.selectedEngagementCompetition = result.competition;
            nativeCoursesAdded = true;
            // Preserve pending settings; the second save uses the new native fingerprint.
            if (portalContext.elements.engagementsDetailStatus) portalContext.elements.engagementsDetailStatus.textContent = "Courses ajoutées dans NAP ; enregistrement des réglages...";
          }
          if(removalIds.length){
            result=await portalActions.callFunction("updateEngagementCompetition",{competitionId:portalState.selectedEngagementCompetition.id,expectedFingerprint:portalState.selectedEngagementCompetition.napFingerprint,patch:{removeNativeCourseIds:removalIds,confirmCourseRemoval:true}});
            portalState.selectedEngagementCompetition=result.competition;
            nativeCoursesRemoved=true;
          }
          result = await portalActions.callFunction("updateEngagementCompetition", { competitionId:portalState.selectedEngagementCompetition.id, expectedFingerprint:portalState.selectedEngagementCompetition.napFingerprint, patch,notificationOpeningRequested });
          if (result.qualificationJobId) {
            portalState.selectedEngagementCompetition.qualificationJobId = result.qualificationJobId;
            portalActions.renderQualificationJobActions();
            result = await portalActions.finishQualificationJob(result.qualificationJobId);
          }
          portalState.selectedEngagementCompetition = result.competition;
          portalState.nativeCompetitionEditBaseline = null;
          portalActions.invalidateEngagementCalendarCaches();
          await moduleActions.loadEngagementCompetitions({ force:true });
          portalActions.upsertEngagementCalendarItemFromServer(portalState.selectedEngagementCompetition, "competition");
          portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition);
          portalActions.clearEngagementDetailTabDirty();
          if (options.continueEditing === true) portalActions.setEngagementEditMode(true);
          if (portalContext.elements.engagementsDetailStatus) { portalContext.elements.engagementsDetailStatus.textContent = "Modifications enregistrées dans NAP."; portalContext.elements.engagementsDetailStatus.dataset.tone = "ok"; }
          return true;
        } catch (error) {
          if (portalContext.elements.engagementsDetailStatus) { portalContext.elements.engagementsDetailStatus.textContent = `${nativeCoursesRemoved ? "Les modifications de courses déjà effectuées dans NAP sont conservées ; les autres réglages restent à enregistrer. " : nativeCoursesAdded ? "Les courses ont été ajoutées dans NAP, mais les autres réglages restent à enregistrer. " : ""}Enregistrement impossible : ${error?.message || error}`; portalContext.elements.engagementsDetailStatus.dataset.tone = "error"; }
          return false;
        } finally { if (button) button.disabled = false; }
      }

    async function prepareAndSendEngagementOpeningEmails(competitionId, statusTarget = portalContext.elements.engagementsDetailStatus) {
        if (!competitionId) return null;
        if (statusTarget) {
          statusTarget.textContent = "Preparation du mail d'ouverture...";
          statusTarget.dataset.tone = "loading";
          statusTarget.hidden = false;
        }
        portalActions.startEngagementLongOperation(
          "Préparation des courriels d'ouverture en cours...",
          "La compétition est ouverte ; LivePalmes prépare maintenant les destinataires avant l'envoi."
        );
        try {
          const preparation = await portalActions.callFunction("prepareEngagementOpeningNotificationEmails", { competitionId });
          if (preparation.disabled) {
            const message = `Engagements ouverts. TEST : ${Number(preparation.recipientCount || 0)} destinataire(s) prévus. Notifications programmées selon le réglage national, uniquement vers livepalmes@nap-ffessm.fr.`;
            if (statusTarget) { statusTarget.textContent = message; statusTarget.dataset.tone = "ok"; }
            portalActions.finishEngagementLongOperation("success", "Engagements ouverts", message);
            return preparation;
          }
          const jobCount = Number(preparation.jobCount || 0);
          if (!jobCount) {
            if (statusTarget) {
              statusTarget.textContent = "Engagements ouverts. Aucun destinataire d'e-mail trouvé.";
              statusTarget.dataset.tone = "ok";
            }
            portalActions.finishEngagementLongOperation("success", "Engagements ouverts", "Aucun destinataire de courriel n'a été trouvé.");
            return preparation;
          }
          if (statusTarget) {
            statusTarget.textContent = `Envoi de ${jobCount} mail${jobCount > 1 ? "s" : ""} d'ouverture...`;
          }
          portalActions.updateEngagementLongOperation(
            "Envoi des courriels d'ouverture en cours...",
            `${jobCount} courriel${jobCount > 1 ? "s" : ""} préparé${jobCount > 1 ? "s" : ""} ${jobCount > 1 ? "sont" : "est"} maintenant transmis.`
          );
          const sendResult = await portalActions.callFunction("sendEngagementPreparedEmails", {
            competitionId,
            type: "opening_notification",
            limit: 500
          });
          if (portalState.engagementMailJobsCompetitionId === competitionId || portalState.selectedEngagementCompetitionId === competitionId) {
            await portalActions.loadEngagementMailJobs({ force: true });
          }
          const sentCount = Number(sendResult.sentCount || 0);
          const errorCount = Number(sendResult.errorCount || 0);
          if (statusTarget) {
            statusTarget.textContent = [
              `Engagements ouverts. ${sentCount}/${jobCount} mail${jobCount > 1 ? "s" : ""} d'ouverture envoye${sentCount > 1 ? "s" : ""}.`,
              errorCount ? `${errorCount} erreur${errorCount > 1 ? "s" : ""}.` : ""
            ].filter(Boolean).join(" ");
            statusTarget.dataset.tone = errorCount ? "error" : "ok";
          }
          portalActions.finishEngagementLongOperation(
            errorCount ? "error" : "success",
            errorCount ? "Ouverture terminée avec des erreurs d'envoi" : "Engagements ouverts et courriels envoyés",
            `${sentCount}/${jobCount} courriel${jobCount > 1 ? "s" : ""} envoyé${sentCount > 1 ? "s" : ""}${errorCount ? ` · ${errorCount} erreur${errorCount > 1 ? "s" : ""}` : ""}.`
          );
          return sendResult;
        } catch (error) {
          portalActions.finishEngagementLongOperation("error", "Envoi des courriels d'ouverture impossible", error?.message || String(error));
          throw error;
        }
      }

    async function createEngagementCompetition(event) {
        event?.preventDefault?.();
        if (!portalActions.canCreateEngagementCompetition()) {
          if (portalContext.elements.engagementsCreateMessage) {
          portalContext.elements.engagementsCreateMessage.textContent = "Droit de création des compétitions d'engagements requis.";
            portalContext.elements.engagementsCreateMessage.dataset.tone = "error";
          }
          return;
        }
        const payload = moduleActions.engagementCompetitionPayloadFromForm();
        if (portalContext.elements.engagementsCreateForm && !portalContext.elements.engagementsCreateForm.dataset.napCreationId) portalContext.elements.engagementsCreateForm.dataset.napCreationId=global.crypto.randomUUID();
        payload.creationId=portalContext.elements.engagementsCreateForm?.dataset.napCreationId;
        const button = portalContext.elements.engagementsCreateForm?.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsCreateMessage) {
          portalContext.elements.engagementsCreateMessage.textContent = "Création en cours...";
          portalContext.elements.engagementsCreateMessage.dataset.tone = "loading";
        }
        try {
          const genericEvent = ["training", "stage", "meeting", "other"].includes(portalContext.elements.engagementsCompetitionType?.value || "");
          const result = await portalActions.callFunction(genericEvent ? "createEngagementCalendarEvent" : "createEngagementCompetition", genericEvent ? {
            creationId: payload.creationId,
            eventType: portalContext.elements.engagementsCompetitionType.value,
            name: payload.name,
            date: payload.date,
            endDate: payload.endDate,
            location: payload.location,
            city: payload.city,
            level: payload.level,
            regionId: payload.regionId
          } : payload);
          portalContext.elements.engagementsCreateForm?.reset();
          if (portalContext.elements.engagementsCreateForm) delete portalContext.elements.engagementsCreateForm.dataset.napCreationId;
          portalActions.updateEngagementMaxEventsFields("create");
          portalActions.updateEngagementCreateFormAccess();
          portalActions.invalidateEngagementCalendarCaches();
          portalContext.elements.engagementsCreateDialog?.close();
          portalActions.setEngagementsTab("calendar");
          await moduleActions.loadEngagementCompetitions({ force: true });
          portalActions.upsertEngagementCalendarItemFromServer(
            genericEvent ? result.event : result.competition,
            result.source === "nap" ? "competition" : genericEvent ? "calendarEvent" : "competition"
          );
          portalState.newlyCreatedEngagementCompetitionId = genericEvent ? "" : result.competition?.id || "";
          if (portalContext.elements.engagementsCreateMessage) {
            portalContext.elements.engagementsCreateMessage.textContent = `Événement créé : ${result.event?.name || result.competition?.name || "calendrier"}.`;
            portalContext.elements.engagementsCreateMessage.dataset.tone = "ok";
          }
          if (portalState.newlyCreatedEngagementCompetitionId) portalContext.elements.engagementsCreateChecklist?.showModal();
          if (genericEvent && result.event?.id) global.LivePalmesCalendarEvents?.open?.(result.event.id);
        } catch (error) {
          if (portalContext.elements.engagementsCreateMessage) {
            portalContext.elements.engagementsCreateMessage.textContent = `Création impossible : ${error?.message || error}`;
            portalContext.elements.engagementsCreateMessage.dataset.tone = "error";
          }
        } finally {
          if (button) button.disabled = false;
          portalActions.updateEngagementCreateFormAccess();
        }
      }

    async function completeNewlyCreatedEngagementCompetition() {
        const competitionId = portalState.newlyCreatedEngagementCompetitionId;
        portalState.newlyCreatedEngagementCompetitionId = "";
        portalContext.elements.engagementsCreateChecklist?.close("complete");
        if (competitionId) await portalActions.loadEngagementCompetitionDetail(competitionId, "general");
      }

    async function updateEngagementCompetition(event) {
        event?.preventDefault?.();
        if (!portalState.selectedEngagementCompetition?.id || !portalActions.canEditEngagementCompetition()) return;
        const button = portalContext.elements.engagementsEditForm?.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsDetailStatus) {
          portalContext.elements.engagementsDetailStatus.textContent = "Enregistrement en cours...";
          portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
        }
        try {
          const payload = {
            competitionId: portalState.selectedEngagementCompetition.id,
            ...moduleActions.engagementCompetitionPayloadFromEditForm()
          };
          const openingDeadlineError = moduleActions.engagementOpeningDeadlineError(payload);
          if (openingDeadlineError) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = openingDeadlineError;
              portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
            }
            return;
          }
          const previousStatus = portalState.selectedEngagementCompetition.entryStatus || "upcoming";
          if (previousStatus === "open" && !moduleActions.confirmOpenedCompetitionSensitiveChanges(portalState.selectedEngagementCompetition, payload)) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = "Modification annulée.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
            }
            return;
          }
          const reopening = previousStatus === "closed" && payload.entryStatus === "open";
          let sendOpeningMail = moduleActions.shouldSendEngagementOpeningMail(previousStatus, payload.entryStatus);
          if (reopening) sendOpeningMail = moduleActions.confirmEngagementReopeningMail(payload);
          if (!reopening && sendOpeningMail && !moduleActions.confirmEngagementOpeningMail(payload)) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = "Ouverture annulee.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
            }
            return;
          }
          const result = await portalActions.updateCompetitionWithQualifications(payload);
          portalState.selectedEngagementCompetition = result.competition || null;
          portalActions.invalidateEngagementCalendarCaches();
          await moduleActions.loadEngagementCompetitions({ force: true });
          portalActions.upsertEngagementCalendarItemFromServer(portalState.selectedEngagementCompetition, "competition");
          portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition || {});
          portalActions.clearEngagementDetailTabDirty("general");
          if (sendOpeningMail && portalState.selectedEngagementCompetition?.id) {
            try {
              await moduleActions.prepareAndSendEngagementOpeningEmails(portalState.selectedEngagementCompetition.id, portalContext.elements.engagementsDetailStatus);
            } catch (mailError) {
              if (portalContext.elements.engagementsDetailStatus) {
                portalContext.elements.engagementsDetailStatus.textContent = `Paramètres enregistrés, mais e-mail d'ouverture impossible : ${mailError?.message || mailError}`;
                portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
              }
            }
          }
          if (portalContext.elements.engagementsDetailStatus) {
            if (!sendOpeningMail) {
              portalContext.elements.engagementsDetailStatus.textContent = reopening
                ? "Compétition rouverte sans renvoi de l'e-mail d'ouverture."
                : "Paramètres enregistrés.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "ok";
            }
          }
        } catch (error) {
          if (portalContext.elements.engagementsDetailStatus) {
            portalContext.elements.engagementsDetailStatus.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
          }
        } finally {
          if (button) button.disabled = false;
          portalActions.updateEngagementEditFormAccess();
        }
      }

    async function saveEngagementCompetitionDetail(event, options = {}) {
        event?.preventDefault?.();
        if (!portalState.engagementDetailEditing || !portalState.selectedEngagementCompetition?.id || !portalActions.canEditEngagementCompetition()) return false;
        if (portalState.selectedEngagementCompetition.napSource === true) return moduleActions.saveNativeCompetitionDetail(options);
        if (portalContext.elements.engagementsEditForm && !portalContext.elements.engagementsEditForm.checkValidity()) {
          portalActions.setEngagementsDetailTab("general");
          portalContext.elements.engagementsEditForm.reportValidity();
          return false;
        }
        const categoryError = portalActions.selectedEngagementEventsCategoryError();
        if (categoryError) {
          portalActions.setEngagementsDetailTab("courses");
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = categoryError;
            portalContext.elements.engagementsEventsMessage.dataset.tone = "error";
          }
          return false;
        }
        const programError = portalActions.selectedEngagementProgramError();
        if (programError) {
          portalActions.setEngagementsDetailTab("courses");
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = programError;
            portalContext.elements.engagementsEventsMessage.dataset.tone = "error";
          }
          return false;
        }
        const button = portalContext.elements.engagementsSaveButton;
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsDetailStatus) {
          portalContext.elements.engagementsDetailStatus.textContent = "Enregistrement de la fiche...";
          portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
        }
        try {
          const payload = {
            competitionId: portalState.selectedEngagementCompetition.id,
            ...moduleActions.engagementCompetitionPayloadFromEditForm(),
            events: portalActions.selectedEngagementEventsFromForm(),
            programSessions: portalActions.selectedEngagementProgramSessionsFromForm(),
            fees: portalActions.selectedEngagementFeesFromForm()
          };
          const openingDeadlineError = moduleActions.engagementOpeningDeadlineError(payload);
          if (openingDeadlineError) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = openingDeadlineError;
              portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
            }
            return false;
          }
          const previousStatus = portalState.selectedEngagementCompetition.entryStatus || "upcoming";
          if (previousStatus === "open" && !moduleActions.confirmOpenedCompetitionSensitiveChanges(portalState.selectedEngagementCompetition, payload)) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = "Modification annulée.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
            }
            return false;
          }
          const reopening = previousStatus === "closed" && payload.entryStatus === "open";
          let sendOpeningMail = moduleActions.shouldSendEngagementOpeningMail(previousStatus, payload.entryStatus);
          if (reopening) sendOpeningMail = moduleActions.confirmEngagementReopeningMail(payload);
          if (!reopening && sendOpeningMail && !moduleActions.confirmEngagementOpeningMail(payload)) {
            if (portalContext.elements.engagementsDetailStatus) {
              portalContext.elements.engagementsDetailStatus.textContent = "Ouverture annulee.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "loading";
            }
            return false;
          }
          const expectedProgramItemCount = payload.programSessions.reduce((sum, session) => sum + (session.items || []).length, 0);
          const result = await portalActions.updateCompetitionWithQualifications(payload);
          const returnedCompetition = result.competition || {};
          const returnedProgramItemCount = (returnedCompetition.programSessions || []).reduce((sum, session) => sum + (session.items || []).length, 0);
          portalState.selectedEngagementCompetition = {
            ...returnedCompetition,
            ...(expectedProgramItemCount && !returnedProgramItemCount ? { programSessions: payload.programSessions } : {})
          };
          portalActions.invalidateEngagementCalendarCaches();
          await moduleActions.loadEngagementCompetitions({ force: true });
          portalActions.upsertEngagementCalendarItemFromServer(portalState.selectedEngagementCompetition, "competition");
          portalState.activeEngagementProgramSessionId = "";
          portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition || {});
          if (options.continueEditing === true) portalActions.setEngagementEditMode(true);
          portalActions.clearEngagementDetailTabDirty();
          if (sendOpeningMail && portalState.selectedEngagementCompetition?.id) {
            try {
              await moduleActions.prepareAndSendEngagementOpeningEmails(portalState.selectedEngagementCompetition.id, portalContext.elements.engagementsDetailStatus);
            } catch (mailError) {
              if (portalContext.elements.engagementsDetailStatus) {
                portalContext.elements.engagementsDetailStatus.textContent = `Fiche enregistrée, mais e-mail d'ouverture impossible : ${mailError?.message || mailError}`;
                portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
              }
            }
          }
          if (portalContext.elements.engagementsDetailStatus) {
            if (!sendOpeningMail) {
              portalContext.elements.engagementsDetailStatus.textContent = reopening
              ? "Compétition rouverte sans renvoi de l'e-mail d'ouverture."
              : "Fiche compétition enregistrée.";
              portalContext.elements.engagementsDetailStatus.dataset.tone = "ok";
            }
          }
          return true;
        } catch (error) {
          if (portalContext.elements.engagementsDetailStatus) {
            portalContext.elements.engagementsDetailStatus.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsDetailStatus.dataset.tone = "error";
          }
          return false;
        } finally {
          if (button) button.disabled = false;
        }
      }

    async function updateEngagementCompetitionEvents(event) {
        event?.preventDefault?.();
        if (!portalActions.isEngagementAdminMode() || !portalState.selectedEngagementCompetition?.id || !portalActions.canEditEngagementCompetition()) return;
        if(portalState.selectedEngagementCompetition.napSource === true) return moduleActions.saveNativeCompetitionDetail({continueEditing:true});
        const button = portalContext.elements.engagementsEventsSaveButton;
        const categoryError = portalActions.selectedEngagementEventsCategoryError();
        if (categoryError) {
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = categoryError;
            portalContext.elements.engagementsEventsMessage.dataset.tone = "error";
          }
          return;
        }
        const programError = portalActions.selectedEngagementProgramError();
        if (programError) {
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = programError;
            portalContext.elements.engagementsEventsMessage.dataset.tone = "error";
          }
          return;
        }
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsEventsMessage) {
          portalContext.elements.engagementsEventsMessage.textContent = "Enregistrement du programme...";
          portalContext.elements.engagementsEventsMessage.dataset.tone = "loading";
        }
        try {
          const payload = moduleActions.engagementCompetitionPayloadFromSelection({
            events: portalActions.selectedEngagementEventsFromForm(),
            programSessions: portalActions.selectedEngagementProgramSessionsFromForm()
          });
          const expectedProgramItemCount = payload.programSessions.reduce((sum, session) => sum + (session.items || []).length, 0);
          const result = await portalActions.updateCompetitionWithQualifications(payload);
          const returnedCompetition = result.competition || {};
          const returnedProgramItemCount = (returnedCompetition.programSessions || []).reduce((sum, session) => sum + (session.items || []).length, 0);
          const programConfirmed = expectedProgramItemCount === 0 || returnedProgramItemCount > 0;
          portalState.selectedEngagementCompetition = {
            ...returnedCompetition,
            ...(!programConfirmed ? { programSessions: payload.programSessions } : {})
          };
          portalActions.invalidateEngagementCalendarCaches();
          await moduleActions.loadEngagementCompetitions({ force: true });
          portalState.activeEngagementProgramSessionId = "";
          portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition || {});
          portalActions.clearEngagementDetailTabDirty("courses");
          portalActions.setEngagementsDetailTab("courses");
          portalActions.setEngagementEventsSectionOpen(portalContext.elements.engagementsEventsChoiceSection, false);
          portalActions.setEngagementEventsSectionOpen(portalContext.elements.engagementsProgramSection, true);
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = programConfirmed
              ? "Programme enregistré."
              : "Programme conservé à l'écran, mais non confirmé par le serveur. Redéployez les Functions avant de tester l'enregistrement réel.";
            portalContext.elements.engagementsEventsMessage.dataset.tone = programConfirmed ? "ok" : "error";
          }
        } catch (error) {
          if (portalContext.elements.engagementsEventsMessage) {
            portalContext.elements.engagementsEventsMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsEventsMessage.dataset.tone = "error";
          }
        } finally {
          if (button) button.disabled = !portalActions.isEngagementAdminMode() || !portalActions.canEditEngagementCompetition();
        }
      }

    async function updateEngagementCompetitionFees(event) {
        event?.preventDefault?.();
        if (!portalActions.isEngagementAdminMode() || !portalState.selectedEngagementCompetition?.id || !portalActions.canEditEngagementCompetition()) return;
        const button = portalContext.elements.engagementsFeesSaveButton;
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsFeesMessage) {
          portalContext.elements.engagementsFeesMessage.textContent = "Enregistrement des frais...";
          portalContext.elements.engagementsFeesMessage.dataset.tone = "loading";
        }
        try {
          const payload = moduleActions.engagementCompetitionPayloadFromSelection({
            fees: portalActions.selectedEngagementFeesFromForm()
          });
          const result = await portalActions.updateCompetitionWithQualifications(payload);
          portalState.selectedEngagementCompetition = result.competition || null;
          portalActions.invalidateEngagementCalendarCaches();
          await moduleActions.loadEngagementCompetitions({ force: true });
          portalActions.renderEngagementCompetitionDetail(portalState.selectedEngagementCompetition || {});
          portalActions.clearEngagementDetailTabDirty("fees");
          portalActions.setEngagementsDetailTab("fees");
          if (portalContext.elements.engagementsFeesMessage) {
          portalContext.elements.engagementsFeesMessage.textContent = "Frais enregistrés.";
            portalContext.elements.engagementsFeesMessage.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsFeesMessage) {
            portalContext.elements.engagementsFeesMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsFeesMessage.dataset.tone = "error";
          }
        } finally {
          if (button) button.disabled = !portalActions.canEditEngagementCompetition();
        }
      }
    return { loadEngagementClubPeople, saveEngagementClubPerson, setEngagementClubPersonStatus, loadEngagementCompetitions, saveNativeCompetitionDetail, prepareAndSendEngagementOpeningEmails, createEngagementCompetition, completeNewlyCreatedEngagementCompetition, updateEngagementCompetition, saveEngagementCompetitionDetail, updateEngagementCompetitionEvents, updateEngagementCompetitionFees };
  });
})(window);
