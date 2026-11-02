(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("national-directories", function create(portalContext, moduleActions) {
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
          moduleActions.closeEngagementNationalClubDialog();
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
          moduleActions.closeEngagementNationalClubDialog();
        } catch (error) {
          if (portalContext.elements.engagementsNationalClubMessage) {
            portalContext.elements.engagementsNationalClubMessage.textContent = `Suppression impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalClubMessage.dataset.tone = "error";
          }
        } finally {
          if (portalContext.elements.engagementsNationalClubDelete) portalContext.elements.engagementsNationalClubDelete.disabled = false;
        }
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
            portalActions.updateEngagementNationalSwimmersStatus(moduleActions.filteredEngagementNationalSwimmers().length);
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
          await moduleActions.loadEngagementNationalSwimmers({ force: true });
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
          await moduleActions.loadEngagementNationalSwimmers({ force: true });
        } catch (error) {
          if (portalContext.elements.engagementsNationalSwimmersStatus) {
            portalContext.elements.engagementsNationalSwimmersStatus.textContent = `Suppression impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = "error";
          }
        }
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
          const result = await moduleActions.executeSwimmerMerge({
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
          moduleActions.resetEngagementNationalSwimmerMergeState();
          portalState.engagementNationalSwimmersLoaded = false;
          portalActions.invalidateEngagementClubSwimmersCache();
          await moduleActions.loadEngagementNationalSwimmers({ force: true });
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
            const result = await moduleActions.executeSwimmerMerge({
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
        moduleActions.resetEngagementNationalSwimmerMergeState();
        portalState.engagementNationalSwimmersLoaded = false;
        portalActions.invalidateEngagementClubSwimmersCache();
        await moduleActions.loadEngagementNationalSwimmers({ force: true, silent: true });
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
            await moduleActions.executeSwimmerMerge({sourceSwimmerId:swimmerId,targetSwimmerId:target.id,finalClubId:finalClub.clubId,sourceFingerprint:swimmer.napFingerprint,targetFingerprint:target.napFingerprint,sourceLicenseNumber:String(swimmer.licenseNumber||"").trim(),targetLicenseNumber:String(target.licenseNumber||"").trim(),confirmMerge:true,confirmClubMismatch:true,confirmLicenseMismatch:true});
            await moduleActions.loadEngagementNationalSwimmers({force:true,silent:true});
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
          await moduleActions.loadEngagementNationalSwimmers({ force: true, silent: true });
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
          moduleActions.renderEngagementNationalPeople();
          if (portalContext.elements.engagementsNationalPeopleStatus && !silent) {
            moduleActions.updateEngagementNationalPeopleStatus(moduleActions.filteredEngagementNationalPeople().length);
          }
        } catch (error) {
          if (portalContext.elements.engagementsNationalPeopleStatus && !silent) {
            portalContext.elements.engagementsNationalPeopleStatus.textContent = `Lecture officiels impossible : ${error?.message || error}`;
            portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementNationalPeopleLoading = false;
          if (portalContext.elements.engagementsNationalPeopleRefresh) portalContext.elements.engagementsNationalPeopleRefresh.disabled = false;
          if (portalState.engagementNationalPeopleLoaded) moduleActions.renderEngagementNationalPeople();
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
          await moduleActions.loadEngagementNationalPeople({ force: true });
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
          await moduleActions.loadEngagementNationalPeople({ force: true });
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
          await moduleActions.loadEngagementNationalPeople({ force: true });
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
        const targetId = moduleActions.selectedEngagementNationalPersonKeepId();
        const sourceIds = moduleActions.selectedEngagementNationalPersonMergeIds().filter((id) => id !== targetId);
        if (!targetId || !sourceIds.length || !portalActions.canDeleteEngagementCompetitionDirectly()) {
          moduleActions.updateEngagementNationalPeopleSelectionState();
          return;
        }
        const target = moduleActions.engagementNationalPersonById(targetId);
        const sources = sourceIds.map(moduleActions.engagementNationalPersonById).filter(Boolean);
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
        moduleActions.updateEngagementNationalPeopleSelectionState();
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
        await moduleActions.loadEngagementNationalPeople({ force: true, silent: true });
        if (portalContext.elements.engagementsNationalPeopleStatus) {
          portalContext.elements.engagementsNationalPeopleStatus.textContent = errors.length
            ? `${successCount} fusion${successCount > 1 ? "s" : ""} realisee${successCount > 1 ? "s" : ""}. Erreurs : ${errors.slice(0, 3).join(" | ")}`
            : `${successCount} fusion${successCount > 1 ? "s" : ""} realisee${successCount > 1 ? "s" : ""}.`;
          portalContext.elements.engagementsNationalPeopleStatus.dataset.tone = errors.length ? "error" : "ok";
        }
      }
    return { loadEngagementNationalClubs, saveEngagementNationalClub, deleteEngagementNationalClub, loadEngagementNationalSwimmers, setEngagementNationalSwimmerStatus, deleteEngagementNationalSwimmer, searchEngagementNationalSwimmerMergeTargets, mergeEngagementNationalSwimmer, mergeSelectedEngagementNationalSwimmers, repairEngagementNationalSwimmerMergePublication, loadEngagementNationalPeople, setEngagementNationalPersonStatus, deleteEngagementNationalPerson, mergeEngagementNationalPerson, mergeSelectedEngagementNationalPeople };
  });
})(window);
