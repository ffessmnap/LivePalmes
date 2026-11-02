(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("documents-and-program", function create(portalContext, moduleActions) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function loadEngagementClubRecapFiles({ force = false } = {}) {
        if (!portalActions.isEngagementAdminMode() || !portalState.selectedEngagementCompetitionId || portalState.engagementClubRecapEntriesLoading) return;
        if (!force && portalState.engagementClubRecapEntriesCompetitionId === portalState.selectedEngagementCompetitionId) {
          moduleActions.renderEngagementClubRecapSelector();
          return;
        }
        portalState.engagementClubRecapEntriesLoading = true;
        moduleActions.renderEngagementClubRecapSelector();
        try {
          const result = await portalActions.callFunction("listEngagementCompetitionClubRecaps", {
            competitionId: portalState.selectedEngagementCompetitionId
          });
          portalState.engagementClubRecapEntries = Array.isArray(result.entries) ? result.entries : [];
          portalState.engagementClubRecapEntriesCompetitionId = portalState.selectedEngagementCompetitionId;
        } catch (error) {
          portalState.engagementClubRecapEntries = [];
          portalState.engagementClubRecapEntriesCompetitionId = portalState.selectedEngagementCompetitionId;
          if (portalContext.elements.engagementsClubRecapFiles) {
            portalContext.elements.engagementsClubRecapFiles.innerHTML = `<p class="admin-portal-message" data-tone="error">Lecture recap clubs impossible : ${portalActions.escapeHtml(error?.message || error)}</p>`;
          }
          return;
        } finally {
          portalState.engagementClubRecapEntriesLoading = false;
        }
        moduleActions.renderEngagementClubRecapSelector();
      }

    async function loadEngagementCompetitionStatistics({ force = false } = {}) {
        if (!portalActions.isEngagementAdminMode() || !portalState.selectedEngagementCompetitionId || portalState.engagementCompetitionStatisticsLoading) return;
        if (!force && portalState.engagementCompetitionStatisticsCompetitionId === portalState.selectedEngagementCompetitionId && portalState.engagementCompetitionStatistics) {
          moduleActions.renderEngagementCompetitionStatistics();
          return;
        }
        portalState.engagementCompetitionStatisticsLoading = true;
        moduleActions.renderEngagementCompetitionStatistics();
        try {
          portalState.engagementCompetitionStatistics = await portalActions.callFunction("getEngagementCompetitionStatistics", {
            competitionId: portalState.selectedEngagementCompetitionId,
            force
          });
          portalState.engagementCompetitionStatisticsCompetitionId = portalState.selectedEngagementCompetitionId;
          if (portalContext.elements.engagementsStatisticsUpdatedAt) {
            portalContext.elements.engagementsStatisticsUpdatedAt.textContent = `Actualisé ${portalActions.formatDeadline(portalState.engagementCompetitionStatistics.generatedAt).replace(/^Limite /, "")}`;
          }
        } catch (error) {
          portalState.engagementCompetitionStatistics = { error: error?.message || String(error) };
          portalState.engagementCompetitionStatisticsCompetitionId = portalState.selectedEngagementCompetitionId;
        } finally {
          portalState.engagementCompetitionStatisticsLoading = false;
        }
        moduleActions.renderEngagementCompetitionStatistics();
      }

    async function loadEngagementMailJobs({ force = false, append = false } = {}) {
        if (!portalActions.isEngagementAdminMode() || !portalState.selectedEngagementCompetitionId || portalState.engagementMailJobsLoading) return;
        if (!force && !append && portalState.engagementMailJobsCompetitionId === portalState.selectedEngagementCompetitionId) {
          moduleActions.renderEngagementMailJobs();
          return;
        }
        portalState.engagementMailJobsLoading = true;
        const requestedCompetitionId = portalState.selectedEngagementCompetitionId;
        if (force || portalState.engagementMailJobsCompetitionId !== portalState.selectedEngagementCompetitionId) {
          portalState.engagementMailJobs = [];
          portalState.engagementMailJobsCursor = null;
          portalState.engagementMailJobsHasMore = false;
          portalState.engagementMailJobsTotalCount = 0;
        }
        moduleActions.renderEngagementMailJobs();
        try {
          const result = await portalActions.callFunction("listEngagementCompetitionMailJobs", {
            competitionId: requestedCompetitionId,
            pageSize: 100,
            ...(append && portalState.engagementMailJobsCursor ? { cursor: portalState.engagementMailJobsCursor } : {})
          });
          if (requestedCompetitionId !== portalState.selectedEngagementCompetitionId) return;
          const nextJobs = Array.isArray(result.jobs) ? result.jobs : [];
          portalState.engagementMailJobs = append ? [...new Map([...portalState.engagementMailJobs, ...nextJobs].map(job => [job.id, job])).values()] : nextJobs;
          portalState.engagementMailJobsCursor = result.nextCursor || null;
          portalState.engagementMailJobsHasMore = result.hasMore === true;
          if (result.totalCount !== null && result.totalCount !== undefined && Number.isFinite(Number(result.totalCount))) {
            portalState.engagementMailJobsTotalCount = Number(result.totalCount);
          }
          portalState.engagementMailJobsCompetitionId = portalState.selectedEngagementCompetitionId;
        } catch (error) {
          if (requestedCompetitionId !== portalState.selectedEngagementCompetitionId) return;
          if (!append) {
            portalState.engagementMailJobs = [];
            portalState.engagementMailJobsCompetitionId = portalState.selectedEngagementCompetitionId;
            if (portalContext.elements.engagementsMailJobsList) {
              portalContext.elements.engagementsMailJobsList.innerHTML = `<p class="admin-portal-message" data-tone="error">Lecture des e-mails préparés impossible : ${portalActions.escapeHtml(error?.message || error)}</p>`;
            }
            return;
          }
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = `Lecture de la page suivante impossible : ${error?.message || error}`;
          }
        } finally {
          portalState.engagementMailJobsLoading = false;
        }
        moduleActions.renderEngagementMailJobs();
      }

    async function saveEngagementCompetitionDocuments(event) {
        event?.preventDefault();
        if (!portalState.selectedEngagementCompetitionId || !portalActions.isEngagementAdminMode() || portalState.engagementCompetitionDocumentSaving) return;
        const editingDocument = (portalState.selectedEngagementCompetition?.clubDocuments || [])
          .find((document) => document.id === portalState.engagementCompetitionDocumentEditingId) || null;
        const values = moduleActions.engagementCompetitionDocumentDraftValues();
        if (!values.length || values.some((draft) => !draft.title)) {
          if (portalContext.elements.engagementsDocumentFormMessage) {
            portalContext.elements.engagementsDocumentFormMessage.textContent = portalState.engagementCompetitionDocumentEditingId
              ? "Renseignez le titre du document."
              : "Choisissez au moins un fichier et renseignez chaque titre.";
            portalContext.elements.engagementsDocumentFormMessage.dataset.tone = "error";
          }
          return;
        }
        const publishesFile = portalState.engagementCompetitionDocumentFiles.length > 0;
        if (publishesFile) {
          const national = portalActions.canUse("engagements.national.manage");
          const maximum = national ? portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_NATIONAL_MAX_BYTES : portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES;
          if (portalState.engagementCompetitionDocumentFiles.some((file) => file.size > maximum)) {
            if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = `Chaque fichier est limité à ${maximum / (1024 * 1024)} Mo.`;
            return;
          }
          if (national && portalState.engagementCompetitionDocumentFiles.some((file) => file.size > portalConfig.ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES) && !global.confirm("Ce dépôt contient un ou plusieurs fichiers de plus de 2 Mo. Votre droit national autorise un dépassement jusqu’à 10 Mo par fichier. Continuer la mise en ligne ?")) {
            if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = "Mise en ligne annulée.";
            return;
          }
        }
        const notify = publishesFile && portalContext.elements.engagementsDocumentNotify?.checked === true;
        if (notify) {
          try {
            if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = "Calcul des destinataires…";
            const audience = await portalActions.callFunction("previewEngagementCompetitionDocumentNotification", {
              competitionId: portalState.selectedEngagementCompetitionId
            });
            const confirmed = global.confirm(
              audience.disabled
                ? `Mettre en ligne ${portalState.engagementCompetitionDocumentFiles.length} document(s) ? Les notifications autorisées par le réglage national partiront uniquement vers livepalmes@nap-ffessm.fr sur TEST.`
                : `Mettre en ligne ${portalState.engagementCompetitionDocumentFiles.length} document${portalState.engagementCompetitionDocumentFiles.length > 1 ? "s" : ""} et envoyer un e-mail à ${Number(audience.recipientCount || 0)} administrateur${Number(audience.recipientCount || 0) > 1 ? "s" : ""} de ${Number(audience.clubCount || 0)} club${Number(audience.clubCount || 0) > 1 ? "s" : ""} ?`
            );
            if (!confirmed) {
              if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = "Mise en ligne annulée.";
              return;
            }
          } catch (error) {
            if (portalContext.elements.engagementsDocumentFormMessage) {
              portalContext.elements.engagementsDocumentFormMessage.textContent = `Calcul des destinataires impossible : ${error?.message || error}`;
              portalContext.elements.engagementsDocumentFormMessage.dataset.tone = "error";
            }
            return;
          }
        }
        portalState.engagementCompetitionDocumentSaving = true;
        if (portalContext.elements.engagementsDocumentSubmitButton) portalContext.elements.engagementsDocumentSubmitButton.disabled = true;
        if (portalContext.elements.engagementsDocumentCancelButton) portalContext.elements.engagementsDocumentCancelButton.disabled = true;
        if (portalContext.elements.engagementsDocumentFiles) portalContext.elements.engagementsDocumentFiles.disabled = true;
        const publishedIds = [];
        const errors = [];
        try {
          if (editingDocument && !publishesFile) {
            if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = "Enregistrement…";
            const result = await portalActions.callFunction("updateEngagementCompetitionDocument", {
              competitionId: portalState.selectedEngagementCompetitionId,
              documentId: editingDocument.id,
              expectedFingerprint: editingDocument.napFingerprint,
              ...values[0]
            });
            moduleActions.updateSelectedEngagementCompetitionDocuments(result.documents || []);
          } else {
            for (let index = 0; index < portalState.engagementCompetitionDocumentFiles.length; index += 1) {
              const file = portalState.engagementCompetitionDocumentFiles[index];
              const draft = values[editingDocument ? 0 : index];
              if (portalContext.elements.engagementsDocumentFormMessage) {
                portalContext.elements.engagementsDocumentFormMessage.textContent = `Mise en ligne ${index + 1}/${portalState.engagementCompetitionDocumentFiles.length} : ${file.name}`;
              }
              try {
                const fileDataUrl = await moduleActions.readEngagementCompetitionDocumentFile(file);
                const result = await portalActions.callFunction("uploadEngagementCompetitionDocument", {
                  competitionId: portalState.selectedEngagementCompetitionId,
                  ...(editingDocument ? { documentId: editingDocument.id, expectedFingerprint:editingDocument.napFingerprint } : {}),
                  ...draft,
                  fileName: file.name,
                  fileDataUrl
                });
                publishedIds.push(result.documentId);
                moduleActions.updateSelectedEngagementCompetitionDocuments(result.documents || []);
              } catch (error) {
                errors.push(`${file.name} : ${error?.message || error}`);
              }
            }
          }
          let notification = null;
          if (notify && publishedIds.length) {
            if (portalContext.elements.engagementsDocumentFormMessage) portalContext.elements.engagementsDocumentFormMessage.textContent = "Envoi de la notification aux clubs…";
            try {
              notification = await portalActions.callFunction("notifyEngagementCompetitionDocuments", {
                competitionId: portalState.selectedEngagementCompetitionId,
                documentIds: publishedIds
              });
              portalState.engagementMailJobsCompetitionId = "";
            } catch (error) {
              errors.push(`Notification : ${error?.message || error}`);
            }
          }
          if (!errors.length) {
            moduleActions.closeEngagementCompetitionDocumentForm();
          } else if (portalContext.elements.engagementsDocumentFormMessage) {
            portalContext.elements.engagementsDocumentFormMessage.textContent = errors.join(" · ");
            portalContext.elements.engagementsDocumentFormMessage.dataset.tone = "error";
          }
          moduleActions.renderEngagementDocuments(portalState.selectedEngagementCompetition || {});
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = errors.length
              ? `${publishedIds.length} document${publishedIds.length > 1 ? "s" : ""} mis en ligne. ${errors.join(" · ")}`
              : notification
                ? notification.queued ? `${publishedIds.length} document(s) mis en ligne. Notification regroupée cinq minutes après le premier dépôt, selon le réglage national. Sur TEST, aucun mail envoyé.` : notification.disabled ? `${publishedIds.length} document(s) mis en ligne. TEST : aucun mail envoyé.`
                  : `${publishedIds.length} document${publishedIds.length > 1 ? "s" : ""} mis en ligne · ${Number(notification.sentCount || 0)} e-mail${Number(notification.sentCount || 0) > 1 ? "s" : ""} envoyé${Number(notification.sentCount || 0) > 1 ? "s" : ""}${notification.configurationMissing ? " · configuration e-mail manquante" : Number(notification.errorCount || 0) ? ` · ${notification.errorCount} en erreur` : ""}.`
                : editingDocument && !publishesFile
                  ? "Informations du document enregistrées."
                  : `${publishedIds.length} document${publishedIds.length > 1 ? "s" : ""} mis en ligne.`;
            portalContext.elements.engagementsDocumentsSummary.dataset.tone = errors.length || notification?.configurationMissing || Number(notification?.errorCount || 0) ? "warning" : "success";
          }
        } finally {
          portalState.engagementCompetitionDocumentSaving = false;
          if (portalContext.elements.engagementsDocumentSubmitButton) portalContext.elements.engagementsDocumentSubmitButton.disabled = false;
          if (portalContext.elements.engagementsDocumentCancelButton) portalContext.elements.engagementsDocumentCancelButton.disabled = false;
          if (portalContext.elements.engagementsDocumentFiles) portalContext.elements.engagementsDocumentFiles.disabled = false;
        }
      }

    async function deleteEngagementCompetitionDocument(documentId = "") {
        const document = (portalState.selectedEngagementCompetition?.clubDocuments || []).find((item) => item.id === documentId);
        if (!document || portalState.engagementCompetitionDocumentSaving || portalActions.isRegionalPastEngagementReadOnly()) return;
        if (!global.confirm(`Supprimer définitivement « ${document.title || document.fileName} » ? Les clubs ne seront pas informés.`)) return;
        portalState.engagementCompetitionDocumentSaving = true;
        try {
          const result = await portalActions.callFunction("deleteEngagementCompetitionDocument", {
            competitionId: portalState.selectedEngagementCompetitionId,
            documentId,
            expectedFingerprint:document.napFingerprint
          });
          moduleActions.updateSelectedEngagementCompetitionDocuments(result.documents || []);
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = result.storageDeleted === false
              ? "Document retiré de la compétition. Le nettoyage du fichier de stockage devra être vérifié."
              : "Document supprimé.";
            portalContext.elements.engagementsDocumentsSummary.dataset.tone = result.storageDeleted === false ? "warning" : "success";
          }
        } catch (error) {
          if (portalContext.elements.engagementsDocumentsSummary) {
            portalContext.elements.engagementsDocumentsSummary.textContent = `Suppression impossible : ${error?.message || error}`;
            portalContext.elements.engagementsDocumentsSummary.dataset.tone = "error";
          }
        } finally {
          portalState.engagementCompetitionDocumentSaving = false;
        }
      }

    async function loadEngagementOpenWaterCourses({ force = false } = {}) {
        if (portalState.engagementOpenWaterCoursesLoading || (portalState.engagementOpenWaterCoursesLoaded && !force)) return;
        portalState.engagementOpenWaterCoursesLoading = true;
        if (portalContext.elements.engagementsOpenWaterCourseMessage) {
          portalContext.elements.engagementsOpenWaterCourseMessage.textContent = "Chargement de la bibliothèque...";
          portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("listEngagementOpenWaterCourses", {});
          const draft = portalState.engagementDetailEditing && portalContext.elements.engagementsEventsForm
            ? {events:moduleActions.selectedEngagementEventsFromForm(),programSessions:moduleActions.selectedEngagementProgramSessionsFromForm()}
            : {};
          portalState.engagementOpenWaterCourses = Array.isArray(result.courses) ? result.courses : portalState.engagementOpenWaterCourses;
          portalState.engagementOpenWaterCoursesLoaded = true;
          moduleActions.renderEngagementOpenWaterCourseLibrary();
          if (portalActions.engagementCompetitionType(portalState.selectedEngagementCompetition) === "openWater") moduleActions.renderEngagementEvents({...portalState.selectedEngagementCompetition,...draft});
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {portalContext.elements.engagementsOpenWaterCourseMessage.textContent = "";delete portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone;}
        } catch (error) {
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {
            portalContext.elements.engagementsOpenWaterCourseMessage.textContent = `Bibliothèque indisponible : ${error?.message || error}`;
            portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
          }
        } finally {
          portalState.engagementOpenWaterCoursesLoading = false;
        }
      }

    async function setEngagementOpenWaterCourseStatus(button) {
        const courseId = button?.dataset.openWaterCourseId || "";
        const active = button?.dataset.openWaterCourseNextActive === "true";
        if (!courseId) return;
        const preservedEvents = moduleActions.selectedEngagementEventsFromForm();
        const preservedSessions = moduleActions.selectedEngagementProgramSessionsFromForm();
        try {
          const result = await portalActions.callFunction("setEngagementOpenWaterCourseStatus", { courseId, active });
          portalState.engagementOpenWaterCourses = Array.isArray(result.courses) ? result.courses : portalState.engagementOpenWaterCourses;
          moduleActions.renderEngagementEvents({ ...portalState.selectedEngagementCompetition, events: preservedEvents, programSessions: preservedSessions });
        } catch (error) {
          if (portalContext.elements.engagementsOpenWaterCourseMessage) {
            portalContext.elements.engagementsOpenWaterCourseMessage.textContent = `Modification impossible : ${error?.message || error}`;
            portalContext.elements.engagementsOpenWaterCourseMessage.dataset.tone = "error";
          }
        }
      }
    return { loadEngagementClubRecapFiles, loadEngagementCompetitionStatistics, loadEngagementMailJobs, saveEngagementCompetitionDocuments, deleteEngagementCompetitionDocument, loadEngagementOpenWaterCourses, setEngagementOpenWaterCourseStatus };
  });
})(window);
