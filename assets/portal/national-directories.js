(function attachPortalModule(global) {
  // Private functions use the shared state, immutable configuration and action interfaces.
  // Creating this module performs no reads, writes, listener registration or rendering.
  function create(portalContext) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function loadEngagementNationalClubs({ force = false } = {}) {
        if (!portalActions.canDeleteEngagementCompetitionDirectly() || portalState.engagementNationalClubsLoading) return;
        if (portalState.engagementNationalClubsLoaded && !force) {
          portalActions.renderEngagementNationalClubs();
          return;
        }
        portalState.engagementNationalClubsLoading = true;
        portalState.engagementNationalClubsVisibleLimit = portalConfig.ENGAGEMENT_NATIONAL_CLUB_PAGE_SIZE;
        if (force) {
          portalState.engagementNationalClubAdministratorsByClub = new Map();
          portalState.engagementNationalClubAdministratorsLoaded = false;
          portalState.engagementNationalClubAdministratorsAvailable = false;
        }
        if (portalContext.elements.engagementsNationalClubsStatus) {
          portalContext.elements.engagementsNationalClubsStatus.textContent = "Chargement du référentiel clubs...";
          portalContext.elements.engagementsNationalClubsStatus.dataset.tone = "loading";
        }
        try {
          // NAP returns the complete fresh directory below; reuse that response
          // for club labels instead of reading the same directory twice.
          if (global.LivePalmesEnvironment?.sportingDataSource !== "nap") await portalActions.loadAccessClubReference();
          const referenceRows = global.LivePalmesEnvironment?.sportingDataSource === "nap" ? [] : global.LIVEPALMES_CLUB_REFERENCE?.clubs || [];
          const cached = force ? { clubs: [], syncedThrough: "" } : portalActions.readEngagementNationalClubCache();
          const storedById = new Map(cached.clubs.map((club) => [club.clubId, club]));
          if (!force || !portalState.engagementNationalClubsLoaded) {
            portalState.engagementNationalClubs = portalActions.mergeEngagementNationalClubDirectory(referenceRows, cached.clubs);
          }
          portalActions.mergeNationalClubsIntoAccessReference(cached.clubs);
          portalActions.renderEngagementNationalClubs();
          const updatedAfter = force ? "" : portalActions.engagementNationalClubSyncStart(cached.syncedThrough);
          let pageUpdatedAfter = updatedAfter;
          let afterClubId = "";
          let syncedThrough = cached.syncedThrough;
          let hasMore = true;
          let includeAdministrators = true;
          const seenCursors = new Set();
          while (hasMore) {
            const result = await portalActions.callFunction("listEngagementNationalClubs", {
              limit: 250,
              includeAdministrators,
              directoryMode: true,
              ...(pageUpdatedAfter ? { updatedAfter: pageUpdatedAfter } : {}),
              ...(afterClubId ? { afterClubId } : {})
            });
            if (includeAdministrators && Array.isArray(result.clubAdministrators)) {
              portalActions.setEngagementNationalClubAdministrators(
                result.clubAdministrators,
                result.clubAdministratorsAvailable !== false
              );
              portalActions.renderEngagementNationalClubs();
            }
            if (includeAdministrators && result.replaceDirectory === true) storedById.clear();
            includeAdministrators = false;
            (Array.isArray(result.clubs) ? result.clubs : [])
              .map(portalActions.normalizeEngagementNationalClub)
              .filter((club) => club.clubId)
              .forEach((club) => {
                if (club.deleted === true) storedById.delete(club.clubId);
                else storedById.set(club.clubId, club);
              });
            hasMore = result.hasMore === true;
            if (hasMore) {
              if (!result.cursor?.updatedAt || !result.cursor?.clubId) throw new Error("La suite de l’annuaire est indisponible. Réessayez le chargement dans quelques instants.");
              const cursorKey = JSON.stringify([String(result.cursor.updatedAt), String(result.cursor.clubId)]);
              if (seenCursors.has(cursorKey)) throw new Error("La lecture des clubs n'a pas progressé. Réessayez le chargement dans quelques instants.");
              seenCursors.add(cursorKey);
              pageUpdatedAfter = String(result.cursor.updatedAt);
              afterClubId = String(result.cursor.clubId);
            }
            const watermark = String(result.syncWatermark || "");
            if (watermark && (!syncedThrough || watermark > syncedThrough)) syncedThrough = watermark;
          }
          const storedClubs = Array.from(storedById.values());
          portalActions.writeEngagementNationalClubCache(storedClubs, syncedThrough);
          portalState.engagementNationalClubs = portalActions.mergeEngagementNationalClubDirectory(referenceRows, storedClubs);
          portalActions.mergeNationalClubsIntoAccessReference(storedClubs);
          portalState.engagementNationalClubsLoaded = true;
          portalActions.renderEngagementNationalClubs();
        } catch (error) {
          if (portalContext.elements.engagementsNationalClubsStatus) {
            portalContext.elements.engagementsNationalClubsStatus.textContent = `Lecture des clubs impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalClubsStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementNationalClubsLoading = false;
        }
      }

    function closeEngagementNationalClubDialog() {
        if (portalContext.elements.engagementsNationalClubDialog?.open) portalContext.elements.engagementsNationalClubDialog.close();
      }

    function openEngagementNationalClubDialog(clubId = "") {
        portalState.engagementNationalClubCreationRetry = null;
        const club = portalState.engagementNationalClubs.find((item) => item.clubId === clubId) || {};
        if (portalContext.elements.engagementsNationalClubForm) portalContext.elements.engagementsNationalClubForm.reset();
        if (portalContext.elements.engagementsNationalClubId) portalContext.elements.engagementsNationalClubId.value = club.clubId || "";
        if (portalContext.elements.engagementsNationalClubFederalNumber) {
          portalContext.elements.engagementsNationalClubFederalNumber.value = club.federalNumber || "";
          portalContext.elements.engagementsNationalClubFederalNumber.readOnly = false;
          portalContext.elements.engagementsNationalClubFederalNumber.dataset.originalValue = club.federalNumber || "";
        }
        if (portalContext.elements.engagementsNationalClubCode) portalContext.elements.engagementsNationalClubCode.value = club.clubCode || "";
        if (portalContext.elements.engagementsNationalClubName) portalContext.elements.engagementsNationalClubName.value = club.clubName || "";
        if (portalContext.elements.engagementsNationalClubRegion) {
          const select=portalContext.elements.engagementsNationalClubRegion;
          if(club.napSource&&club.regionId&&!Array.from(select.options).some(option=>option.value===club.regionId))select.add(new Option(club.regionLabel||club.regionId,club.regionId));
          select.value = club.regionId || "";
        }
        if (portalContext.elements.engagementsNationalClubCity) portalContext.elements.engagementsNationalClubCity.value = club.city || "";
        if (portalContext.elements.engagementsNationalClubPostalCode) portalContext.elements.engagementsNationalClubPostalCode.value = club.postalCode || "";
        if (portalContext.elements.engagementsNationalClubActive) portalContext.elements.engagementsNationalClubActive.checked = club.active !== false;
        if (portalContext.elements.engagementsNationalClubDelete) portalContext.elements.engagementsNationalClubDelete.hidden = !club.clubId || club.source !== "national";
        if (portalContext.elements.engagementsNationalClubDialogTitle) portalContext.elements.engagementsNationalClubDialogTitle.textContent = club.clubId ? `Modifier ${club.clubCode || club.clubName}` : "Ajouter un club";
        if (portalContext.elements.engagementsNationalClubMessage) {
          portalContext.elements.engagementsNationalClubMessage.textContent = club.clubId && club.federalNumber
            ? "Une correction du numéro fédéral demandera une confirmation et sera journalisée."
            : "";
          portalContext.elements.engagementsNationalClubMessage.dataset.tone = "loading";
        }
        if (!portalContext.elements.engagementsNationalClubDialog?.open) portalContext.elements.engagementsNationalClubDialog?.showModal();
        portalContext.elements.engagementsNationalClubFederalNumber?.focus();
        if(club.napSource&&club.clubId){
          club.napDeletionEligible=false;
          portalActions.callFunction("listEngagementNationalClubs",{deletionClubId:club.clubId}).then(result=>{
            club.napDeletionEligible=result?.deletionEligible===true;
            if(portalContext.elements.engagementsNationalClubId?.value===club.clubId&&portalContext.elements.engagementsNationalClubDelete)portalContext.elements.engagementsNationalClubDelete.hidden=!club.napDeletionEligible;
          }).catch(()=>{});
        }
      }

    async function saveEngagementNationalClub(event) {
        event.preventDefault();
        const clubId = portalContext.elements.engagementsNationalClubId?.value || "";
        const previousFederalNumber = String(portalContext.elements.engagementsNationalClubFederalNumber?.dataset.originalValue || "").trim().toUpperCase();
        const nextFederalNumber = String(portalContext.elements.engagementsNationalClubFederalNumber?.value || "").trim().toUpperCase();
        const federalNumberChanged = Boolean(clubId && previousFederalNumber && previousFederalNumber !== nextFederalNumber);
        if (federalNumberChanged && !global.confirm(`Corriger le numéro fédéral de ${previousFederalNumber} vers ${nextFederalNumber} ? Cette modification sera journalisée.`)) return;
        const submit = portalContext.elements.engagementsNationalClubForm?.querySelector('button[type="submit"]');
        if (submit) submit.disabled = true;
        if (portalContext.elements.engagementsNationalClubMessage) {
          portalContext.elements.engagementsNationalClubMessage.textContent = "Enregistrement du club...";
          portalContext.elements.engagementsNationalClubMessage.dataset.tone = "loading";
        }
        try {
          const payload = {
            clubId,
            confirmFederalNumberChange: federalNumberChanged,
            expectedFingerprint: portalState.engagementNationalClubs.find(item=>item.clubId===clubId)?.napFingerprint,
            club: {
              federalNumber: portalContext.elements.engagementsNationalClubFederalNumber?.value || "",
              clubCode: portalContext.elements.engagementsNationalClubCode?.value || "",
              clubName: portalContext.elements.engagementsNationalClubName?.value || "",
              regionId: portalContext.elements.engagementsNationalClubRegion?.value || "",
              city: portalContext.elements.engagementsNationalClubCity?.value || "",
              postalCode: portalContext.elements.engagementsNationalClubPostalCode?.value || "",
              active: portalContext.elements.engagementsNationalClubActive?.checked === true
            }
          };
          if(!clubId && global.LivePalmesEnvironment?.sportingDataSource === "nap") {
            if(!portalState.engagementNationalClubCreationRetry || JSON.stringify(portalState.engagementNationalClubCreationRetry.club)!==JSON.stringify(payload.club)) portalState.engagementNationalClubCreationRetry = {...payload,creationId:global.crypto.randomUUID()};
          }
          const result = await portalActions.callFunction("saveEngagementNationalClub", !clubId && portalState.engagementNationalClubCreationRetry ? portalState.engagementNationalClubCreationRetry : payload);
          portalState.engagementNationalClubCreationRetry = null;
          const saved = result.club || {};
          portalState.engagementNationalClubs = portalState.engagementNationalClubs.filter((club) => club.clubId !== saved.clubId).concat(saved)
            .sort((left, right) => String(left.clubName || "").localeCompare(String(right.clubName || ""), "fr"));
          portalActions.mergeNationalClubsIntoAccessReference([saved]);
          portalState.engagementNationalClubsLoaded = true;
          portalActions.renderEngagementNationalClubs();
          closeEngagementNationalClubDialog();
        } catch (error) {
          if (portalContext.elements.engagementsNationalClubMessage) {
            portalContext.elements.engagementsNationalClubMessage.textContent = `Enregistrement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalClubMessage.dataset.tone = "error";
          }
        } finally {
          if (submit) submit.disabled = false;
        }
      }

    async function deleteEngagementNationalClub() {
        const clubId = portalContext.elements.engagementsNationalClubId?.value || "";
        const club = portalState.engagementNationalClubs.find((item) => item.clubId === clubId);
        if (!club || (club.source !== "national" && !club.napDeletionEligible)) return;
        if (!global.confirm(`Supprimer définitivement ${club.clubCode || club.clubName} ? Cette action n'est possible que si aucune donnée n'est liée à ce club.`)) return;
        if (portalContext.elements.engagementsNationalClubDelete) portalContext.elements.engagementsNationalClubDelete.disabled = true;
        if (portalContext.elements.engagementsNationalClubMessage) {
          portalContext.elements.engagementsNationalClubMessage.textContent = "Vérification des données liées au club...";
          portalContext.elements.engagementsNationalClubMessage.dataset.tone = "loading";
        }
        try {
          await portalActions.callFunction("deleteEngagementNationalClub", { clubId, confirmPermanent: true, ...(club.napSource?{expectedFingerprint:club.napFingerprint}:{}) });
          portalState.engagementNationalClubs = portalState.engagementNationalClubs.filter((item) => item.clubId !== clubId);
          portalState.accessClubReference = portalState.accessClubReference.filter((item) => item.clubId !== clubId);
          portalState.accessClubReferenceById.delete(clubId);
          portalState.engagementNationalClubsLoaded = true;
          portalActions.renderEngagementNationalClubs();
          closeEngagementNationalClubDialog();
        } catch (error) {
          if (portalContext.elements.engagementsNationalClubMessage) {
            portalContext.elements.engagementsNationalClubMessage.textContent = `Suppression impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalClubMessage.dataset.tone = "error";
          }
        } finally {
          if (portalContext.elements.engagementsNationalClubDelete) portalContext.elements.engagementsNationalClubDelete.disabled = false;
        }
      }

    function engagementNationalStatusMatches(item = {}, status = "") {
        const merged = item.status === "merged" || Boolean(item.mergedIntoId);
        if (status === "merged") return merged;
        if (status === "active") return !merged && item.active !== false;
        if (status === "inactive") return !merged && item.active === false;
        return true;
      }

    function filteredEngagementNationalSwimmers() {
        const terms = portalActions.normalizedEngagementClubSearch(portalContext.elements.engagementsNationalSwimmersSearch?.value || "").split(/\s+/).filter(Boolean);
        const status = portalContext.elements.engagementsNationalSwimmersStatusFilter?.value || "";
        return portalState.engagementNationalSwimmers.filter((swimmer) => {
          if (!engagementNationalStatusMatches(swimmer, status)) return false;
          if (!terms.length) return true;
          const haystack = portalActions.normalizedEngagementClubSearch([
            swimmer.firstName,
            swimmer.lastName,
            swimmer.name,
            swimmer.licenseNumber,
            swimmer.clubId,
            swimmer.clubName,
            swimmer.sex,
            swimmer.birthDate,
            swimmer.searchText,
            ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : []),
            ...(Array.isArray(swimmer.aliases) ? swimmer.aliases : [])
          ].filter(Boolean).join(" "));
          return terms.every((term) => haystack.includes(term));
        });
      }

    function resetEngagementNationalSwimmerFilters() {
        if (portalContext.elements.engagementsNationalSwimmersSearch) portalContext.elements.engagementsNationalSwimmersSearch.value = "";
        if (portalContext.elements.engagementsNationalSwimmersStatusFilter) portalContext.elements.engagementsNationalSwimmersStatusFilter.value = "";
        portalState.engagementNationalSwimmers = [];
        portalState.engagementNationalSwimmersLoaded = true;
        resetEngagementNationalSwimmerMergeState();
        portalActions.renderEngagementNationalSwimmers();
      }

    async function loadEngagementNationalSwimmers({ force = false, silent = false } = {}) {
        if (!portalActions.canDeleteEngagementCompetitionDirectly() || portalState.engagementNationalSwimmersLoading) return;
        if (portalState.engagementNationalSwimmersLoaded && !force) return;
        const query = String(portalContext.elements.engagementsNationalSwimmersSearch?.value || "").trim();
        if (query.length < 2) {
          portalState.engagementNationalSwimmers = [];
          portalState.engagementNationalSwimmersLoaded = true;
          portalActions.renderEngagementNationalSwimmers();
          if (portalContext.elements.engagementsNationalSwimmersStatus && !silent) {
            portalContext.elements.engagementsNationalSwimmersStatus.textContent = "Saisissez au moins 2 caracteres pour chercher dans la base nageurs.";
            portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
          }
          return;
        }
        portalState.engagementNationalSwimmersLoading = true;
        if (portalContext.elements.engagementsNationalSwimmersRefresh) portalContext.elements.engagementsNationalSwimmersRefresh.disabled = true;
        if (portalContext.elements.engagementsNationalSwimmersStatus && !silent) {
          portalContext.elements.engagementsNationalSwimmersStatus.textContent = "Recherche des nageurs...";
          portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
        }
        try {
          const [result, publicSwimmers] = await Promise.all([
            portalActions.callFunction("searchEngagementNationalSwimmers", { query, limit: 60 }),
            (global.LivePalmesEnvironment.sportingDataSource === "nap") ? Promise.resolve([]) : portalActions.searchEngagementAdminPublicSwimmers(query, 80)
          ]);
          portalState.engagementNationalSwimmers = portalActions.mergeEngagementNationalSwimmerResults([
            ...publicSwimmers,
            ...(Array.isArray(result.swimmers) ? result.swimmers : [])
          ]).slice(0, 100);
          portalState.engagementNationalSwimmersLoaded = true;
          portalActions.renderEngagementNationalSwimmers();
          if (portalContext.elements.engagementsNationalSwimmersStatus && !silent) {
            portalActions.updateEngagementNationalSwimmersStatus(filteredEngagementNationalSwimmers().length);
            if (result.hasMore) portalContext.elements.engagementsNationalSwimmersStatus.textContent += " Précisez la recherche pour afficher les autres nageurs.";
          }
        } catch (error) {
          if (portalContext.elements.engagementsNationalSwimmersStatus && !silent) {
            portalContext.elements.engagementsNationalSwimmersStatus.textContent = `Lecture nageurs impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementNationalSwimmersLoading = false;
          if (portalContext.elements.engagementsNationalSwimmersRefresh) portalContext.elements.engagementsNationalSwimmersRefresh.disabled = false;
          if (portalState.engagementNationalSwimmersLoaded) portalActions.renderEngagementNationalSwimmers();
        }
      }

    async function setEngagementNationalSwimmerStatus(swimmerId, active) {
        const cleanId = String(swimmerId || "").trim();
        if (!cleanId || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const swimmer = portalState.engagementNationalSwimmers.find((item) => item.id === cleanId || item.swimmerIndexId === cleanId) || {};
        const name = portalActions.engagementSwimmerDisplayName(swimmer, "ce nageur");
        const message = active
          ? `Réactiver ${name} ? Il redeviendra utilisable par son club.`
          : `Désactiver ${name} ? Il ne sera plus proposable dans les engagements du club.`;
        if (!global.confirm(message)) return;
        if (portalContext.elements.engagementsNationalSwimmersStatus) {
          portalContext.elements.engagementsNationalSwimmersStatus.textContent = active ? "Réactivation en cours..." : "Désactivation en cours...";
          portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
        }
        try {
          await portalActions.callFunction("setEngagementNationalClubSwimmerStatus", {
            swimmerId: cleanId,
            expectedFingerprint: swimmer.napActivityFingerprint,
            active
          });
          portalState.engagementNationalSwimmersLoaded = false;
          portalActions.invalidateEngagementClubSwimmersCache();
          await loadEngagementNationalSwimmers({ force: true });
        } catch (error) {
          if (portalContext.elements.engagementsNationalSwimmersStatus) {
            portalContext.elements.engagementsNationalSwimmersStatus.textContent = `Action impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
          }
        }
      }

    async function deleteEngagementNationalSwimmer(swimmerId) {
        const cleanId = String(swimmerId || "").trim();
        if (!cleanId || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const swimmer = portalState.engagementNationalSwimmers.find((item) => item.id === cleanId || item.swimmerIndexId === cleanId) || {};
        const name = portalActions.engagementSwimmerDisplayName(swimmer, "ce nageur");
        if (!global.confirm(`Supprimer définitivement ${name} ? Cette action est irréversible et sera refusée si la fiche possède un historique. Dans ce cas, utilisez « Désactiver ».`)) return;
        if (portalContext.elements.engagementsNationalSwimmersStatus) {
          portalContext.elements.engagementsNationalSwimmersStatus.textContent = "Suppression définitive en cours...";
          portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
        }
        try {
          await portalActions.callFunction("deleteEngagementNationalClubSwimmer", {
            swimmerId: cleanId,
            confirmPermanent: true,
            ...(swimmer.napSource ? {expectedFingerprint:swimmer.napFingerprint,expectedActivityFingerprint:swimmer.napActivityFingerprint,expectedLicenseNumber:swimmer.licenseNumber||""} : {})
          });
          portalState.engagementNationalSwimmersLoaded = false;
          portalActions.invalidateEngagementClubSwimmersCache();
          await loadEngagementNationalSwimmers({ force: true });
        } catch (error) {
          if (portalContext.elements.engagementsNationalSwimmersStatus) {
            portalContext.elements.engagementsNationalSwimmersStatus.textContent = `Suppression impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
          }
        }
      }

    function resetEngagementNationalSwimmerMergeState() {
        portalState.engagementNationalSwimmerMergeSourceId = "";
        portalState.engagementNationalSwimmerMergeTargets = [];
        portalState.engagementNationalSwimmerMergeQuery = "";
        portalState.engagementNationalSwimmerMergeLoading = false;
      }

    async function searchEngagementNationalSwimmerMergeTargets(sourceSwimmerId, sourceSource = "engagement") {
        const sourceId = String(sourceSwimmerId || "").trim();
        const sourceType = String(sourceSource || "engagement").trim() || "engagement";
        if (!sourceId || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const sourceKey = `${sourceType}:${sourceId}`;
        const card = portalContext.elements.engagementsNationalSwimmersList?.querySelector(`[data-engagement-national-swimmer-key="${CSS.escape(sourceKey)}"]`);
        const query = String(card?.querySelector("[data-engagement-national-swimmer-merge-query]")?.value || portalState.engagementNationalSwimmerMergeQuery || "").trim();
        portalState.engagementNationalSwimmerMergeQuery = query;
        portalState.engagementNationalSwimmerMergeLoading = true;
        portalActions.renderEngagementNationalSwimmers();
        try {
          const [result, publicSwimmers] = await Promise.all([
            portalActions.callFunction("searchEngagementNationalSwimmerMergeTargets", {
              sourceSwimmerId: sourceId,
              sourceSource: sourceType,
              query,
              limit: 25
            }),
            query && global.LivePalmesEnvironment?.sportingDataSource !== "nap" ? portalActions.searchEngagementAdminPublicSwimmers(query, 40) : Promise.resolve([])
          ]);
          portalState.engagementNationalSwimmerMergeTargets = portalActions.mergeEngagementNationalSwimmerResults([
            ...publicSwimmers,
            ...(Array.isArray(result.swimmers) ? result.swimmers : [])
          ])
            .filter((swimmer) => `${swimmer.source || "performances"}:${swimmer.id || swimmer.swimmerIndexId}` !== sourceKey)
            .filter((swimmer) => swimmer.status !== "merged" && !swimmer.mergedIntoId)
            .slice(0, 40);
          if (portalContext.elements.engagementsNationalSwimmersStatus) {
            portalContext.elements.engagementsNationalSwimmersStatus.textContent = `${portalState.engagementNationalSwimmerMergeTargets.length} fiche${portalState.engagementNationalSwimmerMergeTargets.length > 1 ? "s" : ""} cible${portalState.engagementNationalSwimmerMergeTargets.length > 1 ? "s" : ""} trouvée${portalState.engagementNationalSwimmerMergeTargets.length > 1 ? "s" : ""}.`;
            portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
          }
        } catch (error) {
          portalState.engagementNationalSwimmerMergeTargets = [];
          if (portalContext.elements.engagementsNationalSwimmersStatus) {
            portalContext.elements.engagementsNationalSwimmersStatus.textContent = `Recherche impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementNationalSwimmerMergeLoading = false;
          portalActions.renderEngagementNationalSwimmers();
        }
      }

    function chooseMergeEngagements(summary) {
        const document=global.document,dialog=document.createElement("dialog"),form=document.createElement("form"),heading=document.createElement("h2"),intro=document.createElement("p"),actions=document.createElement("div"),confirm=document.createElement("button"),cancel=document.createElement("button"),controls=[];
        const opener=document.activeElement;
        dialog.className="admin-swimmer-club-dialog";dialog.setAttribute("aria-label","Choisir les engagements conservés");heading.textContent="Choisir les engagements conservés";
        intro.textContent="Plusieurs engagements diffèrent sur la fiche prioritaire. Choisissez celui à conserver pour chaque course. Les autres courses seront réunies automatiquement. Aucune fusion n’a encore été effectuée pour ces deux fiches.";
        form.append(heading,intro);
        for(const [index,conflict] of summary.conflicts.entries()){
          const field=document.createElement("fieldset"),legend=document.createElement("legend"),radios=[];
          field.className="admin-swimmer-merge-conflict";
          legend.textContent=`Compétition ${conflict.competitionId} — ${conflict.course} — fiche ${conflict.swimmerId}`;field.append(legend);
          for(const choice of conflict.choices){
            const label=document.createElement("label"),radio=document.createElement("input"),text=document.createElement("span");
            const detail=Object.entries(choice.fields).filter(([key])=>key!=="course").map(([key,value])=>`${key==="tps"?"Temps d’engagement":key} : ${value===null?"non renseigné":String(value)}`).join(" ; ");
            radio.type="radio";radio.name=`merge-engagement-choice-${index}`;radio.value=choice.id;radio.required=true;text.textContent=`Engagement ${choice.id} — ${detail}`;
            label.append(radio,text);field.append(label);radios.push(radio);
          }
          form.append(field);controls.push({key:conflict.key,radios});
        }
        actions.className="admin-portal-actions";confirm.type="submit";confirm.textContent="Valider et fusionner";cancel.type="button";cancel.textContent="Annuler";cancel.className="ghost-button";
        actions.append(cancel,confirm);form.append(actions);dialog.append(form);document.body.append(dialog);
        return new Promise(resolve=>{let result=null;
          cancel.addEventListener("click",()=>dialog.close());
          form.addEventListener("submit",event=>{event.preventDefault();if(!form.reportValidity())return;result=controls.map(({key,radios})=>({key,id:radios.find(radio=>radio.checked).value}));dialog.close();});
          dialog.addEventListener("close",()=>{dialog.remove();if(opener?.isConnected)opener.focus();resolve(result);},{once:true});dialog.showModal();controls[0]?.radios[0]?.focus();
        });
      }

    let swimmerMergePending=false;
    async function executeSwimmerMerge(payload) {
        if(swimmerMergePending)throw new Error("Une fusion est déjà en cours. Terminez-la avant d’en lancer une autre.");
        swimmerMergePending=true;
        payload={...payload,entryConflictProtocol:1};
        try{
        let result=await portalActions.callFunction("mergeEngagementNationalClubSwimmer",payload);
        if(result?.mergeConflicts){
          const choices=await chooseMergeEngagements(result.mergeConflicts);
          if(!choices){const error=new Error("Fusion annulée avant modification.");error.mergeCancelled=true;throw error;}
          result=await portalActions.callFunction("mergeEngagementNationalClubSwimmer",{...payload,entryConflictToken:result.mergeConflicts.token,entryConflictChoices:choices});
          if(result?.mergeConflicts)throw new Error("Les engagements ont changé. Relancez la fusion pour refaire les choix.");
        }
        return result;
        }finally{swimmerMergePending=false;}
      }

    async function mergeEngagementNationalSwimmer(sourceSwimmerId, sourceSource, targetValue) {
        const sourceId = String(sourceSwimmerId || "").trim();
        const sourceType = String(sourceSource || "engagement").trim() || "engagement";
        const [targetSourceRaw, targetIdRaw] = String(targetValue || "").split(":");
        const targetSource = targetSourceRaw || "performances";
        const targetId = targetIdRaw || "";
        if (!sourceId || !targetId || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const source = portalState.engagementNationalSwimmers.find((item) =>
          (item.source || "performances") === sourceType && (item.id === sourceId || item.swimmerIndexId === sourceId)
        ) || {};
        const target = portalState.engagementNationalSwimmerMergeTargets.find((item) =>
          (item.source || "performances") === targetSource && (item.id === targetId || item.swimmerIndexId === targetId)
        ) || {};
        const sourceName = [source.firstName, source.lastName].filter(Boolean).join(" ") || source.name || "cette fiche";
        const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.name || "la fiche cible";
        const finalClub=source.napSource?await global.LivePalmesSwimmerClubs.getTools(portalActions.callFunction).chooseFinalClub({target,sources:[source]}):null;
        if(source.napSource&&!finalClub)return;
        if (!global.confirm(`Fusionner ${sourceName} vers ${targetName} ?${finalClub ? ` Club final : ${finalClub.label}.` : ""} ${source.napSource ? "Les performances et les liens seront transférés, puis la fiche source sera supprimée définitivement. Le journal d’audit sera conservé." : "La fiche source sera marquée comme fusionnée et retirée des listes club."}`)) return;
        const licenseMismatch = Boolean(source.licenseNumber && target.licenseNumber && source.licenseNumber !== target.licenseNumber);
        if (licenseMismatch && !global.confirm(`Attention : les numéros de licence sont différents (${source.licenseNumber} / ${target.licenseNumber}). Confirmer quand même la fusion ?`)) return;
        const clubMismatch = Boolean(source.clubId && target.clubId && source.clubId !== target.clubId);
        if (clubMismatch && !global.confirm(`Attention : les clubs sont différents (${portalActions.clubDisplayLabel(source)} / ${portalActions.clubDisplayLabel(target)}). Confirmer quand même la fusion ?`)) return;
        if (portalContext.elements.engagementsNationalSwimmersStatus) {
          portalContext.elements.engagementsNationalSwimmersStatus.textContent = "Fusion nageur en cours...";
          portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
        }
        try {
          const result = await executeSwimmerMerge({
            ...(finalClub?{finalClubId:finalClub.clubId}:{}),
            sourceSwimmerId: sourceId,
            sourceSource: sourceType,
            sourceIdentityKey: source.identityKey || "",
            targetSwimmerId: targetId,
            targetSource,
            targetIdentityKey: target.identityKey || "",
            sourceFingerprint: source.napFingerprint || "",
            targetFingerprint: target.napFingerprint || "",
            sourceLicenseNumber: String(source.licenseNumber || "").trim(),
            targetLicenseNumber: String(target.licenseNumber || "").trim(),
            confirmMerge: true,
            confirmLicenseMismatch: licenseMismatch,
            confirmClubMismatch: Boolean(finalClub) || clubMismatch
          });
          resetEngagementNationalSwimmerMergeState();
          portalState.engagementNationalSwimmersLoaded = false;
          portalActions.invalidateEngagementClubSwimmersCache();
          await loadEngagementNationalSwimmers({ force: true });
          if (portalContext.elements.engagementsNationalSwimmersStatus) {
            const totalUpdates = Number(result.entrySwimmerUpdateCount || 0) + Number(result.relayUpdateCount || 0) + Number(result.performanceUpdateCount || 0);
            portalContext.elements.engagementsNationalSwimmersStatus.textContent = `Fusion terminée.${result.sourceDeleted ? " Fiche doublon supprimée définitivement ; journal d’audit conservé." : ""} ${totalUpdates} élément${totalUpdates > 1 ? "s" : ""} mis à jour.`;
            portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsNationalSwimmersStatus) {
            portalContext.elements.engagementsNationalSwimmersStatus.textContent = `Fusion impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
          }
        }
      }

    async function mergeSelectedEngagementNationalSwimmers() {
        const targetKey = portalActions.selectedEngagementNationalSwimmerKeepKey();
        const sourceKeys = portalActions.selectedEngagementNationalSwimmerMergeKeys().filter((key) => key !== targetKey);
        if (!targetKey || !sourceKeys.length || !portalActions.canDeleteEngagementCompetitionDirectly()) {
          portalActions.updateEngagementNationalSwimmerSelectionState();
          return;
        }
        const target = portalActions.engagementNationalSwimmerByKey(targetKey);
        const sources = sourceKeys.map(portalActions.engagementNationalSwimmerByKey).filter(Boolean);
        if (!target || !sources.length) return;
        const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.name || targetKey;
        const licenseMismatch = new Set([target,...sources].map(person=>String(person.licenseNumber||"").trim()).filter(Boolean)).size>1;
        const clubMismatch = sources.some((source) => source.clubId && target.clubId && source.clubId !== target.clubId);
        const warning = [
          licenseMismatch ? "numéros de licence différents" : "",
          clubMismatch ? "clubs différents" : ""
        ].filter(Boolean).join(", ");
        const finalClub=target.napSource?await global.LivePalmesSwimmerClubs.getTools(portalActions.callFunction).chooseFinalClub({target,sources}):null;
        if(target.napSource&&!finalClub)return;
        const message = `Fusionner ${sources.length} fiche${sources.length > 1 ? "s" : ""} vers ${targetName} ?${finalClub ? ` Club final : ${finalClub.label}.` : ""} ${target.napSource ? "Les performances et les liens seront transférés à la fiche conservée, puis les fiches sources seront supprimées définitivement. Le journal d’audit sera conservé." : "Les performances, engagements et relais seront rattaches a la fiche conservee."}${warning ? ` Attention : ${warning}.` : ""}`;
        if (!global.confirm(message)) return;
        portalState.engagementNationalSwimmerMergeLoading = true;
        portalActions.updateEngagementNationalSwimmerSelectionState();
        if (portalContext.elements.engagementsNationalSwimmersStatus) {
          portalContext.elements.engagementsNationalSwimmersStatus.textContent = "Fusion groupee en cours...";
          portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
        }
        let successCount = 0;
        const errors = [];
        const [targetSourceRaw, targetIdRaw] = targetKey.split(":");
        for (const source of sources) {
          const sourceKey = portalActions.engagementNationalSwimmerKey(source);
          const [sourceSourceRaw, sourceIdRaw] = sourceKey.split(":");
          try {
            const result = await executeSwimmerMerge({
              ...(finalClub?{finalClubId:finalClub.clubId}:{}),
              sourceSwimmerId: sourceIdRaw,
              sourceSource: sourceSourceRaw || "engagement",
              sourceIdentityKey: source.identityKey || "",
              targetSwimmerId: targetIdRaw,
              targetSource: targetSourceRaw || "performances",
              targetIdentityKey: target.identityKey || "",
              sourceFingerprint: source.napFingerprint || "",
              targetFingerprint: target.napFingerprint || "",
              sourceLicenseNumber: String(source.licenseNumber || "").trim(),
              targetLicenseNumber: String(target.licenseNumber || "").trim(),
              confirmMerge: true,
              confirmLicenseMismatch: true,
              confirmClubMismatch: true
            });
            if(result?.target?.napSource)Object.assign(target,result.target);
            successCount += 1;
          } catch (error) {
            const sourceName = [source.firstName, source.lastName].filter(Boolean).join(" ") || source.name || sourceKey;
            errors.push(`${sourceName} : ${error?.message || error}`);
            if(error?.mergeCancelled)break;
          }
        }
        portalState.engagementNationalSwimmerMergeLoading = false;
        resetEngagementNationalSwimmerMergeState();
        portalState.engagementNationalSwimmersLoaded = false;
        portalActions.invalidateEngagementClubSwimmersCache();
        await loadEngagementNationalSwimmers({ force: true, silent: true });
        if (portalContext.elements.engagementsNationalSwimmersStatus) {
          portalContext.elements.engagementsNationalSwimmersStatus.textContent = errors.length
            ? `${successCount} fusion${successCount > 1 ? "s" : ""} realisee${successCount > 1 ? "s" : ""}. Erreurs : ${errors.slice(0, 3).join(" | ")}`
            : `${successCount} fusion${successCount > 1 ? "s" : ""} realisee${successCount > 1 ? "s" : ""}.`;
          portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = errors.length ? "error" : "ok";
        }
      }

    async function repairEngagementNationalSwimmerMergePublication(swimmerId = "", swimmerSource = "performances") {
        const swimmer = portalState.engagementNationalSwimmers.find((item) =>
          (item.source || "performances") === swimmerSource && (item.id === swimmerId || item.swimmerIndexId === swimmerId)
        ) || {};
        if(swimmer.napSource) {

          try {
            const found=await portalActions.callFunction("searchEngagementNationalSwimmerMergeTargets",{sourceSwimmerId:swimmerId,query:String(swimmer.mergedIntoId||"")});
            const target=found.swimmers?.find(item=>String(item.id)===String(swimmer.mergedIntoId));
            if(!target)throw new Error("La fiche conservée est introuvable.");
            const finalClub=await global.LivePalmesSwimmerClubs.getTools(portalActions.callFunction).chooseFinalClub({target,sources:[swimmer]});
            if(!finalClub||!global.confirm(`Finaliser la fusion vers ${portalActions.engagementSwimmerDisplayName(target)} ? Club final : ${finalClub.label}. La fiche doublon sera supprimée définitivement ; le journal sera conservé.`))return;
            await executeSwimmerMerge({sourceSwimmerId:swimmerId,targetSwimmerId:target.id,finalClubId:finalClub.clubId,sourceFingerprint:swimmer.napFingerprint,targetFingerprint:target.napFingerprint,sourceLicenseNumber:String(swimmer.licenseNumber||"").trim(),targetLicenseNumber:String(target.licenseNumber||"").trim(),confirmMerge:true,confirmClubMismatch:true,confirmLicenseMismatch:true});
            await loadEngagementNationalSwimmers({force:true,silent:true});
            if(portalContext.elements.engagementsNationalSwimmersStatus)portalContext.elements.engagementsNationalSwimmersStatus.textContent="Fusion NAP vérifiée et finalisée.";
          }catch(error){if(portalContext.elements.engagementsNationalSwimmersStatus)portalContext.elements.engagementsNationalSwimmersStatus.textContent=`Finalisation impossible : ${error?.message||error}`;}
          return;
        }
        const name = portalActions.engagementSwimmerDisplayName(swimmer, "cette fiche fusionnée");
        if (!swimmerId || !global.confirm(`Réparer la publication publique de ${name} ? À utiliser seulement si la fiche publique ou les performances ne sont pas correctement synchronisées après la fusion. L’ancienne fiche publique sera retirée et ses performances seront rattachées à la fiche conservée.`)) return;
        if (portalContext.elements.engagementsNationalSwimmersStatus) {
          portalContext.elements.engagementsNationalSwimmersStatus.textContent = "Publication de la fusion en cours...";
          portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("repairEngagementNationalSwimmerMergePublication", {
            sourceSwimmerId: swimmerId,
            sourceSource: swimmerSource,
            sourceIdentityKey: swimmer.identityKey || ""
          });
          portalState.engagementNationalSwimmersLoaded = false;
          await loadEngagementNationalSwimmers({ force: true, silent: true });
          if (portalContext.elements.engagementsNationalSwimmersStatus) {
            portalContext.elements.engagementsNationalSwimmersStatus.textContent = `Publication finalisée. ${Number(result?.publicSnapshot?.affectedRows || 0)} ligne${Number(result?.publicSnapshot?.affectedRows || 0) > 1 ? "s" : ""} synchronisée${Number(result?.publicSnapshot?.affectedRows || 0) > 1 ? "s" : ""}.`;
            portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsNationalSwimmersStatus) {
            portalContext.elements.engagementsNationalSwimmersStatus.textContent = `Publication impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
          }
        }
      }

    function renderEngagementNationalPeople() {
        if (!portalContext.elements.engagementsNationalPeopleList) return;
        if (!portalActions.canDeleteEngagementCompetitionDirectly()) {
          portalContext.elements.engagementsNationalPeopleList.innerHTML = "";
          updateEngagementNationalPeopleSelectionState();
          return;
        }
        if (!portalState.engagementNationalPeople.length) {
          updateEngagementNationalPeopleStatus(0);
          portalContext.elements.engagementsNationalPeopleList.innerHTML = '<p class="admin-engagements-empty">Aucun officiel ou chef d\'équipe créé par un club.</p>';
          updateEngagementNationalPeopleSelectionState();
          return;
        }
        const people = filteredEngagementNationalPeople();
        updateEngagementNationalPeopleStatus(people.length);
        if (!people.length) {
          portalContext.elements.engagementsNationalPeopleList.innerHTML = '<p class="admin-engagements-empty">Aucun officiel ne correspond aux filtres.</p>';
          updateEngagementNationalPeopleSelectionState();
          return;
        }
        const rows = people.map((person) => {
          const active = person.active !== false;
          const merged = person.status === "merged" || Boolean(person.mergedIntoId);
          const name = [person.lastName, person.firstName].filter(Boolean).join(" ") || "Personne sans nom";
          const statusLabel = merged
            ? `Fusionnee vers ${person.mergedIntoName || person.mergedIntoId || "une autre fiche"}`
            : active ? "Actif" : "Desactive";
          const sourceId = person.id || "";
          const historical = person.napSource && person.nativePersonKind === "leaders";
          const mergeOpen = !historical && portalState.engagementNationalPeopleMergeMode && portalState.engagementNationalPersonMergeSourceId === sourceId;
          const mergeCandidates = engagementNationalPersonMergeCandidates(sourceId);
          const alertLabel = engagementNationalPersonDuplicateAlertLabel(person, people);
          const clubLabel = portalActions.clubDisplayLabel(person, { fallback: "Club non renseigné" });
          return `
        <tr class="admin-engagements-national-person-row" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}" data-active="${active ? "true" : "false"}" data-merged="${merged ? "true" : "false"}">
          <td class="admin-engagements-national-choice">${merged || historical ? "" : `<input type="radio" name="adminEngagementsNationalPersonKeep" value="${portalActions.escapeHtml(sourceId)}" title="Conserver cette fiche" data-engagement-national-person-keep>`}</td>
          <td class="admin-engagements-national-choice">${merged || historical ? "" : `<input type="checkbox" value="${portalActions.escapeHtml(sourceId)}" title="Fusionner cette fiche vers la fiche conservee" data-engagement-national-person-merge-check>`}</td>
          <td class="admin-engagements-national-merge-only"><span class="admin-engagements-duplicate-badge" data-score="${portalActions.escapeHtml(alertLabel.score)}">${portalActions.escapeHtml(alertLabel.label)}</span></td>
          <td><strong>${portalActions.escapeHtml(person.lastName || name)}</strong></td>
          <td>${portalActions.escapeHtml(person.firstName || "")}</td>
          <td>${portalActions.escapeHtml(person.licenseNumber || "-")}</td>
          <td>${portalActions.escapeHtml(portalActions.engagementClubPersonRoleLabel(person))}</td>
          <td>${portalActions.escapeHtml(clubLabel)}</td>
          <td>${portalActions.escapeHtml(statusLabel)}</td>
          <td class="admin-engagements-national-table-actions">
            ${historical ? '<span>Déclaration historique</span>' : `<details class="admin-national-row-menu">
              <summary aria-label="Actions pour ${portalActions.escapeHtml(name)}" title="Actions">&#8942;</summary>
              <div>
                ${merged || !portalState.engagementNationalPeopleMergeMode ? "" : `<button class="ghost-button" type="button" data-engagement-national-person-action="merge" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}">Choisir une autre cible</button>`}
                ${merged ? "" : `<button class="ghost-button" type="button" data-engagement-national-person-action="${active ? "disable" : "enable"}" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}">${active ? "Désactiver" : "Réactiver"}</button>`}
                <button class="ghost-button admin-engagements-danger-button" type="button" data-engagement-national-person-action="delete" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}">Supprimer</button>
              </div>
            </details>`}
          </td>
        </tr>
        ${mergeOpen ? `
          <tr class="admin-engagements-national-merge-row">
            <td colspan="10">
              <div class="admin-engagements-national-merge" data-engagement-national-person-merge="${portalActions.escapeHtml(sourceId)}">
                <label>
                  <span>Fusionner vers</span>
                  <select data-engagement-national-person-merge-target>
                    <option value="">Choisir la fiche à conserver</option>
                    ${mergeCandidates.map((candidate) => `
                      <option value="${portalActions.escapeHtml(candidate.id)}">${portalActions.escapeHtml([candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || candidate.licenseNumber || candidate.id)} - ${portalActions.escapeHtml(candidate.licenseNumber || "sans licence")} - ${portalActions.escapeHtml(portalActions.clubDisplayLabel(candidate, { fallback: "club non renseigné" }))}</option>
                    `).join("")}
                  </select>
                </label>
                <div class="admin-engagements-request-actions">
                  <button class="ghost-button" type="button" data-engagement-national-person-action="cancel-merge" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}">Annuler</button>
                  <button type="button" data-engagement-national-person-action="confirm-merge" data-engagement-national-person-id="${portalActions.escapeHtml(sourceId)}" ${mergeCandidates.length ? "" : "disabled"}>Confirmer la fusion</button>
                </div>
                ${mergeCandidates.length ? "" : '<p class="admin-engagements-request-note">Aucune autre fiche n est chargee dans la liste.</p>'}
              </div>
            </td>
          </tr>
        ` : ""}
      `;
        }).join("");
        portalContext.elements.engagementsNationalPeopleList.innerHTML = `
      <div class="admin-engagements-national-table-wrap">
        <table class="admin-engagements-national-table admin-engagements-national-people-table" data-merge-mode="${portalState.engagementNationalPeopleMergeMode ? "true" : "false"}">
          <thead>
            <tr>
              <th class="admin-engagements-national-choice">Conserver</th>
              <th class="admin-engagements-national-choice">Fusionner</th>
              <th class="admin-engagements-national-merge-only">Alerte</th>
              <th>Nom</th>
              <th>Prénom</th>
              <th>Licence</th>
              <th>Role</th>
              <th>Club</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
        updateEngagementNationalPeopleSelectionState();
      }

    function updateEngagementNationalPeopleStatus(filteredCount = portalState.engagementNationalPeople.length) {
        if (!portalContext.elements.engagementsNationalPeopleStatus) return;
        const total = visibleNativePeople(portalState.engagementNationalPeople).length;
        if (!total) {
          portalContext.elements.engagementsNationalPeopleStatus.textContent = "Aucun officiel chargé.";
          portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "ok";
          return;
        }
        const filtered = Math.max(0, Math.min(total, Number(filteredCount) || 0));
        portalContext.elements.engagementsNationalPeopleStatus.textContent = filtered === total
          ? `${total} personne${total > 1 ? "s" : ""} chargée${total > 1 ? "s" : ""}.`
          : `${filtered} personne${filtered > 1 ? "s" : ""} affichée${filtered > 1 ? "s" : ""} sur ${total}.`;
        portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "ok";
      }

    function visibleNativePeople(people) {
        const key = person => {
          if (!person.napSource || !person.firstName || !person.lastName || !person.birthDate || !person.clubId) return null;
          return JSON.stringify([person.clubId, person.lastName.trim(), person.firstName.trim(), person.birthDate]);
        };
        const officials = new Map();
        for (const person of people) {
          if (person.nativePersonKind !== "officials" || !person.roles?.teamLeader) continue;
          const identity = key(person);
          if (identity) officials.set(identity, (officials.get(identity) || 0) + 1);
        }
        const seen = new Set();
        return people.filter(person => {
          if (person.nativePersonKind !== "leaders") return true;
          const identity = key(person);
          if (!identity) return true;
          if (officials.get(identity) === 1 || seen.has(identity)) return false;
          seen.add(identity);
          return true;
        });
      }

    function filteredEngagementNationalPeople() {
        const terms = portalActions.normalizedEngagementClubSearch(portalContext.elements.engagementsNationalPeopleSearch?.value || "").split(/\s+/).filter(Boolean);
        const status = portalContext.elements.engagementsNationalPeopleStatusFilter?.value || "";
        return visibleNativePeople(portalState.engagementNationalPeople).filter((person) => {
          if (!engagementNationalStatusMatches(person, status)) return false;
          if (!terms.length) return true;
          const haystack = portalActions.normalizedEngagementClubSearch([
            person.firstName,
            person.lastName,
            person.licenseNumber,
            person.clubId,
            person.clubName,
            portalActions.engagementClubPersonRoleLabel(person)
          ].filter(Boolean).join(" "));
          return terms.every((term) => haystack.includes(term));
        });
      }

    function resetEngagementNationalPeopleFilters() {
        if (portalContext.elements.engagementsNationalPeopleSearch) portalContext.elements.engagementsNationalPeopleSearch.value = "";
        if (portalContext.elements.engagementsNationalPeopleStatusFilter) portalContext.elements.engagementsNationalPeopleStatusFilter.value = "";
        renderEngagementNationalPeople();
      }

    function engagementNationalPersonMergeCandidates(sourceId = "") {
        const source = portalState.engagementNationalPeople.find((person) => person.id === sourceId);
        if (!source) return [];
        return portalState.engagementNationalPeople
          .filter((person) => person.id && person.id !== sourceId && !(person.napSource && person.nativePersonKind === "leaders"))
          .filter((person) => person.status !== "merged" && !person.mergedIntoId)
          .sort((left, right) =>
            Number(right.clubId === source.clubId) - Number(left.clubId === source.clubId) ||
            `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr")
          );
      }

    function engagementNationalPersonDuplicateAlertLabel(person = {}, people = []) {
        const personId = person.id || "";
        const license = String(person.licenseNumber || "").trim();
        const normalizedName = portalActions.normalizedEngagementClubSearch([person.lastName, person.firstName].filter(Boolean).join(" "));
        const sameLicense = license && people.some((candidate) => candidate.id !== personId && String(candidate.licenseNumber || "").trim() === license);
        if (sameLicense) return { score: "high", label: "Même licence" };
        const sameNameClub = normalizedName && people.some((candidate) =>
          candidate.id !== personId &&
          portalActions.normalizedEngagementClubSearch([candidate.lastName, candidate.firstName].filter(Boolean).join(" ")) === normalizedName &&
          (!person.clubId || !candidate.clubId || person.clubId === candidate.clubId)
        );
        if (sameNameClub) return { score: "high", label: "Même identité" };
        const nearName = normalizedName && people.some((candidate) => {
          if (candidate.id === personId) return false;
          const candidateName = portalActions.normalizedEngagementClubSearch([candidate.lastName, candidate.firstName].filter(Boolean).join(" "));
          return candidateName && (candidateName.includes(normalizedName) || normalizedName.includes(candidateName));
        });
        if (nearName) return { score: "medium", label: "A verifier" };
        return { score: "low", label: "Simple" };
      }

    function engagementNationalPersonById(personId = "") {
        return portalState.engagementNationalPeople.find((person) => person.id === personId) || null;
      }

    function selectedEngagementNationalPersonMergeIds() {
        return Array.from(portalContext.elements.engagementsNationalPeopleList?.querySelectorAll("[data-engagement-national-person-merge-check]:checked") || [])
          .map((item) => item.value)
          .filter(Boolean);
      }

    function selectedEngagementNationalPersonKeepId() {
        return portalContext.elements.engagementsNationalPeopleList?.querySelector("[data-engagement-national-person-keep]:checked")?.value || "";
      }

    function updateEngagementNationalPeopleSelectionState() {
        if (portalContext.elements.engagementsNationalPeopleBulk) portalContext.elements.engagementsNationalPeopleBulk.hidden = !portalState.engagementNationalPeopleMergeMode;
        if (portalContext.elements.engagementsNationalPeopleMergeMode) {
          portalContext.elements.engagementsNationalPeopleMergeMode.setAttribute("aria-pressed", portalState.engagementNationalPeopleMergeMode ? "true" : "false");
          portalContext.elements.engagementsNationalPeopleMergeMode.textContent = portalState.engagementNationalPeopleMergeMode ? "Quitter le mode doublons" : "Gérer les doublons";
        }
        const keepId = selectedEngagementNationalPersonKeepId();
        const mergeIds = selectedEngagementNationalPersonMergeIds().filter((id) => id !== keepId);
        if (portalContext.elements.engagementsNationalPeopleBulkMerge) {
          portalContext.elements.engagementsNationalPeopleBulkMerge.disabled = !keepId || !mergeIds.length || portalState.engagementNationalPeopleLoading;
        }
        if (portalContext.elements.engagementsNationalPeopleSelectionSummary) {
          const keep = engagementNationalPersonById(keepId);
          const keepName = keep ? ([keep.firstName, keep.lastName].filter(Boolean).join(" ") || keep.licenseNumber || keepId) : "";
          portalContext.elements.engagementsNationalPeopleSelectionSummary.textContent = keepId && mergeIds.length
            ? `${mergeIds.length} fiche${mergeIds.length > 1 ? "s" : ""} à fusionner vers ${keepName}.`
            : "Choisissez une fiche à conserver et au moins une fiche à fusionner.";
        }
      }

    function setEngagementNationalPeopleMergeMode(enabled) {
        portalState.engagementNationalPeopleMergeMode = enabled === true;
        if (!portalState.engagementNationalPeopleMergeMode) portalState.engagementNationalPersonMergeSourceId = "";
        renderEngagementNationalPeople();
      }

    async function loadEngagementNationalPeople({ force = false, silent = false, append = false } = {}) {
        if (!portalActions.canDeleteEngagementCompetitionDirectly() || portalState.engagementNationalPeopleLoading) return;
        if (portalState.engagementNationalPeopleLoaded && !force && !append) return;
        portalState.engagementNationalPeopleLoading = true;
        if (portalContext.elements.engagementsNationalPeopleRefresh) portalContext.elements.engagementsNationalPeopleRefresh.disabled = true;
        if (portalContext.elements.engagementsNationalPeopleStatus && !silent) {
          portalContext.elements.engagementsNationalPeopleStatus.textContent = "Chargement des officiels...";
          portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("listEngagementNationalClubPeople", { limit: 120, ...(append && portalState.engagementNationalPeopleCursor ? {cursor:portalState.engagementNationalPeopleCursor} : {}) });
          const page = Array.isArray(result.people) ? result.people : [];
          portalState.engagementNationalPeople = append ? Array.from(new Map([...portalState.engagementNationalPeople,...page].map(item=>[item.id,item])).values()) : page;
          portalState.engagementNationalPeopleCursor = result.hasMore === true ? result.nextCursor : null;
          if(portalContext.elements.engagementsNationalPeopleMore) portalContext.elements.engagementsNationalPeopleMore.hidden = !portalState.engagementNationalPeopleCursor;
          portalState.engagementNationalPeopleLoaded = true;
          portalActions.markLastRefresh(portalContext.elements.engagementsNationalPeopleStatus);
          renderEngagementNationalPeople();
          if (portalContext.elements.engagementsNationalPeopleStatus && !silent) {
            updateEngagementNationalPeopleStatus(filteredEngagementNationalPeople().length);
          }
        } catch (error) {
          if (portalContext.elements.engagementsNationalPeopleStatus && !silent) {
            portalContext.elements.engagementsNationalPeopleStatus.textContent = `Lecture officiels impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementNationalPeopleLoading = false;
          if (portalContext.elements.engagementsNationalPeopleRefresh) portalContext.elements.engagementsNationalPeopleRefresh.disabled = false;
          if (portalState.engagementNationalPeopleLoaded) renderEngagementNationalPeople();
        }
      }

    async function setEngagementNationalPersonStatus(personId, active) {
        const cleanId = String(personId || "").trim();
        if (!cleanId || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const person = portalState.engagementNationalPeople.find((item) => item.id === cleanId) || {};
        const name = [person.firstName, person.lastName].filter(Boolean).join(" ") || "cette personne";
        const message = active
          ? `Réactiver ${name} ? Cette personne redeviendra utilisable par son club.`
          : `Désactiver ${name} ? Cette personne ne sera plus proposable comme officiel ou chef d'équipe.`;
        if (!global.confirm(message)) return;
        if (portalContext.elements.engagementsNationalPeopleStatus) {
          portalContext.elements.engagementsNationalPeopleStatus.textContent = active ? "Réactivation en cours..." : "Désactivation en cours...";
          portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "loading";
        }
        try {
          await portalActions.callFunction("setEngagementNationalClubPersonStatus", {
            personId: cleanId,
            expectedFingerprint: person.napFingerprint,
            active
          });
          portalState.engagementNationalPeopleLoaded = false;
          portalState.engagementClubPeopleLoaded = false;
          await loadEngagementNationalPeople({ force: true });
        } catch (error) {
          if (portalContext.elements.engagementsNationalPeopleStatus) {
            portalContext.elements.engagementsNationalPeopleStatus.textContent = `Action impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "error";
          }
        }
      }

    async function deleteEngagementNationalPerson(personId) {
        const cleanId = String(personId || "").trim();
        if (!cleanId || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const person = portalState.engagementNationalPeople.find((item) => item.id === cleanId) || {};
        const name = [person.firstName, person.lastName].filter(Boolean).join(" ") || "cette personne";
        if (!global.confirm(`Supprimer définitivement ${name} de la base des officiels / chefs d'équipe ? Cette action est irréversible.`)) return;
        if (portalContext.elements.engagementsNationalPeopleStatus) {
          portalContext.elements.engagementsNationalPeopleStatus.textContent = "Suppression définitive en cours...";
          portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "loading";
        }
        try {
          await portalActions.callFunction("deleteEngagementNationalClubPerson", {
            personId: cleanId,
            expectedFingerprint: person.napFingerprint,
            confirmPermanent: true
          });
          portalState.engagementNationalPeopleLoaded = false;
          portalState.engagementClubPeopleLoaded = false;
          await loadEngagementNationalPeople({ force: true });
        } catch (error) {
          if (portalContext.elements.engagementsNationalPeopleStatus) {
            portalContext.elements.engagementsNationalPeopleStatus.textContent = `Suppression impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "error";
          }
        }
      }

    async function mergeEngagementNationalPerson(sourcePersonId, targetPersonId) {
        const sourceId = String(sourcePersonId || "").trim();
        const targetId = String(targetPersonId || "").trim();
        if (!sourceId || !targetId || sourceId === targetId || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const source = portalState.engagementNationalPeople.find((item) => item.id === sourceId) || {};
        const target = portalState.engagementNationalPeople.find((item) => item.id === targetId) || {};
        const sourceName = [source.firstName, source.lastName].filter(Boolean).join(" ") || source.licenseNumber || "cette fiche";
        const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.licenseNumber || "la fiche cible";
        if (!global.confirm(`Fusionner ${sourceName} vers ${targetName} ? Les rôles et engagements seront repris sur la fiche choisie ; la fiche source sera retirée des listes club.`)) return;
        const licenseMismatch = Boolean(source.licenseNumber && target.licenseNumber && source.licenseNumber !== target.licenseNumber);
        if (licenseMismatch && !global.confirm(`Attention : les numéros de licence sont différents (${source.licenseNumber} / ${target.licenseNumber}). Confirmer quand même la fusion ?`)) return;
        const clubMismatch = Boolean(source.clubId && target.clubId && source.clubId !== target.clubId);
        if (clubMismatch && !global.confirm(`Attention : les clubs sont différents (${portalActions.clubDisplayLabel(source)} / ${portalActions.clubDisplayLabel(target)}). Confirmer quand même la fusion ?`)) return;
        if (portalContext.elements.engagementsNationalPeopleStatus) {
          portalContext.elements.engagementsNationalPeopleStatus.textContent = "Fusion en cours...";
          portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("mergeEngagementNationalClubPerson", {
            sourcePersonId: sourceId,
            targetPersonId: targetId,
            sourceFingerprint: source.napFingerprint,
            targetFingerprint: target.napFingerprint,
            confirmMerge: true,
            confirmLicenseMismatch: licenseMismatch,
            confirmClubMismatch: clubMismatch
          });
          portalState.engagementNationalPersonMergeSourceId = "";
          portalState.engagementNationalPeopleLoaded = false;
          portalState.engagementClubPeopleLoaded = false;
          await loadEngagementNationalPeople({ force: true });
          if (portalContext.elements.engagementsNationalPeopleStatus) {
            const totalUpdates = Number(result.teamLeaderUpdateCount || 0) + Number(result.officialsUpdateCount || 0);
            portalContext.elements.engagementsNationalPeopleStatus.textContent = `Fusion terminée. ${totalUpdates} engagement${totalUpdates > 1 ? "s" : ""} mis à jour.`;
            portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsNationalPeopleStatus) {
            portalContext.elements.engagementsNationalPeopleStatus.textContent = `Fusion impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "error";
          }
        }
      }

    async function mergeSelectedEngagementNationalPeople() {
        const targetId = selectedEngagementNationalPersonKeepId();
        const sourceIds = selectedEngagementNationalPersonMergeIds().filter((id) => id !== targetId);
        if (!targetId || !sourceIds.length || !portalActions.canDeleteEngagementCompetitionDirectly()) {
          updateEngagementNationalPeopleSelectionState();
          return;
        }
        const target = engagementNationalPersonById(targetId);
        const sources = sourceIds.map(engagementNationalPersonById).filter(Boolean);
        if (!target || !sources.length) return;
        const targetName = [target.firstName, target.lastName].filter(Boolean).join(" ") || target.licenseNumber || targetId;
        const licenseMismatch = sources.some((source) => source.licenseNumber && target.licenseNumber && source.licenseNumber !== target.licenseNumber);
        const clubMismatch = sources.some((source) => source.clubId && target.clubId && source.clubId !== target.clubId);
        const warning = [
          licenseMismatch ? "numéros de licence différents" : "",
          clubMismatch ? "clubs différents" : ""
        ].filter(Boolean).join(", ");
        if (!global.confirm(`Fusionner ${sources.length} fiche${sources.length > 1 ? "s" : ""} vers ${targetName} ?${warning ? ` Attention : ${warning}.` : ""}`)) return;
        portalState.engagementNationalPeopleLoading = true;
        updateEngagementNationalPeopleSelectionState();
        if (portalContext.elements.engagementsNationalPeopleStatus) {
          portalContext.elements.engagementsNationalPeopleStatus.textContent = "Fusion groupee en cours...";
          portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "loading";
        }
        let successCount = 0;
        const errors = [];
        for (const source of sources) {
          try {
            const result = await portalActions.callFunction("mergeEngagementNationalClubPerson", {
              sourcePersonId: source.id,
              targetPersonId: targetId,
              sourceFingerprint: source.napFingerprint,
              targetFingerprint: target.napFingerprint,
              confirmMerge: true,
              confirmLicenseMismatch: true,
              confirmClubMismatch: true
            });
            if(result.targetPerson) Object.assign(target,result.targetPerson);
            successCount += 1;
          } catch (error) {
            const sourceName = [source.firstName, source.lastName].filter(Boolean).join(" ") || source.licenseNumber || source.id;
            errors.push(`${sourceName} : ${error?.message || error}`);
          }
        }
        portalState.engagementNationalPeopleLoading = false;
        portalState.engagementNationalPersonMergeSourceId = "";
        portalState.engagementNationalPeopleLoaded = false;
        portalState.engagementClubPeopleLoaded = false;
        await loadEngagementNationalPeople({ force: true, silent: true });
        if (portalContext.elements.engagementsNationalPeopleStatus) {
          portalContext.elements.engagementsNationalPeopleStatus.textContent = errors.length
            ? `${successCount} fusion${successCount > 1 ? "s" : ""} realisee${successCount > 1 ? "s" : ""}. Erreurs : ${errors.slice(0, 3).join(" | ")}`
            : `${successCount} fusion${successCount > 1 ? "s" : ""} realisee${successCount > 1 ? "s" : ""}.`;
          portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = errors.length ? "error" : "ok";
        }
      }

    return {
      loadEngagementNationalClubs,
      closeEngagementNationalClubDialog,
      openEngagementNationalClubDialog,
      saveEngagementNationalClub,
      deleteEngagementNationalClub,
      engagementNationalStatusMatches,
      filteredEngagementNationalSwimmers,
      resetEngagementNationalSwimmerFilters,
      loadEngagementNationalSwimmers,
      setEngagementNationalSwimmerStatus,
      deleteEngagementNationalSwimmer,
      resetEngagementNationalSwimmerMergeState,
      searchEngagementNationalSwimmerMergeTargets,
      mergeEngagementNationalSwimmer,
      mergeSelectedEngagementNationalSwimmers,
      repairEngagementNationalSwimmerMergePublication,
      renderEngagementNationalPeople,
      updateEngagementNationalPeopleStatus,
      visibleNativePeople,
      filteredEngagementNationalPeople,
      resetEngagementNationalPeopleFilters,
      engagementNationalPersonMergeCandidates,
      engagementNationalPersonDuplicateAlertLabel,
      engagementNationalPersonById,
      selectedEngagementNationalPersonMergeIds,
      selectedEngagementNationalPersonKeepId,
      updateEngagementNationalPeopleSelectionState,
      setEngagementNationalPeopleMergeMode,
      loadEngagementNationalPeople,
      setEngagementNationalPersonStatus,
      deleteEngagementNationalPerson,
      mergeEngagementNationalPerson,
      mergeSelectedEngagementNationalPeople
    };
  }
  global.LivePalmesPortalNationalDirectories = { create };
})(window);
