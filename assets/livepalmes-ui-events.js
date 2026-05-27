(function () {
  function init(context = {}) {
    with (context) {
      eventSelect.addEventListener("change", () => {
        const row = programRowFromRaceOption(eventSelect.value);
        if (row.eventId) state.eventId = row.eventId;
        if (row.sex) state.sex = row.sex;
        state.programKey = row.order ? programKey(row) : "";
        clearSearch();
        state.category = "all";
        state.series = firstSeriesSelectionForCurrentRace();
        state.selectedSwimmerId = "";
        state.selectedRecordKey = "";
        render();
      });
      
      function changeSession(sessionNumber) {
        state.session = sessionNumber;
        const firstProgram = programRows()[0];
        if (firstProgram) {
          applyProgramRow(firstProgram);
        }
        clearSearch();
        state.category = "all";
        state.series = firstSeriesSelectionForCurrentRace();
        state.selectedSwimmerId = "";
        state.selectedRecordKey = "";
        render();
      }
      
      sessionControls?.addEventListener("change", (event) => {
        if (event.target?.id !== "sessionSelect") return;
        changeSession(event.target.value);
      });
      
      publicPositionToggle?.addEventListener("change", (event) => {
        const enabled = event.target.checked;
        event.target.disabled = true;
        setPublicPositionEnabled(enabled).catch((error) => {
          console.warn("Modification du repère public impossible", error);
          event.target.checked = !enabled;
        }).finally(() => {
          event.target.disabled = state.role !== "speaker" || !firestoreDb;
          render();
        });
      });
      
      async function openRoleConsole(nextRole) {
        if (!ROLE_LABELS[nextRole]) return;
        if (!requestRoleAccess(nextRole)) {
          const access = await askRolePin(nextRole);
          if (!access?.allowed) return;
          const reserved = await acquireRoleLock(nextRole, { adminBypass: access.adminBypass });
          if (!reserved) {
            unlockedRoles = unlockedRoles.filter((role) => role !== nextRole);
            saveUnlockedRoles();
            return;
          }
        } else {
          const reserved = await acquireRoleLock(nextRole, { adminBypass: false });
          if (!reserved) {
            unlockedRoles = unlockedRoles.filter((role) => role !== nextRole);
            saveUnlockedRoles();
            return;
          }
        }
        profileHomeActive = false;
        switchRoleUnlocked(nextRole);
        render();
        updateConsolePresence(true);
      }
      
      document.querySelectorAll(".role-chip").forEach((button) => {
        button.addEventListener("click", async () => {
          await openRoleConsole(button.dataset.role || "speaker");
        });
      });
      
      profileHome?.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-home-role]");
        if (!button) return;
        await openRoleConsole(button.dataset.homeRole || "live");
      });
      
      profileHomeBtn?.addEventListener("click", () => {
        profileHomeActive = true;
        render();
        releaseConsolePresence();
        refreshPresenceCounts();
      });
      
      competitionModeTopBtn?.addEventListener("click", () => {
        toggleCompetitionMode();
      });
      
      manualRefreshBtn?.addEventListener("click", async () => {
        manualRefreshBtn.disabled = true;
        manualRefreshBtn.textContent = "Actualisation...";
        await refreshFirebaseOnce(true);
        manualRefreshBtn.disabled = false;
        manualRefreshBtn.textContent = "Actualiser";
      });
      
      headerRefs.addEventListener("click", (event) => {
        const button = event.target.closest(".ref-chip-button");
        if (!button) return;
        state.selectedRecordKey = state.selectedRecordKey === button.dataset.recordKey ? "" : button.dataset.recordKey;
        renderHeaderReferences();
        renderEntrants();
      });
      
      headerRefDetails.addEventListener("click", (event) => {
        if (!event.target.closest(".close-ref-details")) return;
        state.selectedRecordKey = "";
        renderHeaderReferences();
        renderEntrants();
      });
      
      entrantsSubtitle?.addEventListener("click", (event) => {
        const closeButton = event.target.closest(".close-ref-details");
        if (closeButton) {
          state.selectedRecordKey = "";
          renderHeaderReferences();
          renderEntrants();
          return;
        }
        const button = event.target.closest(".ref-chip-button");
        if (!button) return;
        state.selectedRecordKey = state.selectedRecordKey === button.dataset.recordKey ? "" : button.dataset.recordKey;
        renderHeaderReferences();
        renderEntrants();
      });
      
      seriesControls.addEventListener("click", (event) => {
        const button = event.target.closest("[data-series]");
        if (!button) return;
        state.series = button.dataset.series;
        if (isFinalStage(state.series)) {
          const row = finalProgramRowsForRace().find((item) => item.stage === state.series);
          if (row) applyProgramRow(row);
        }
        state.selectedSwimmerId = "";
        render();
      });
      
      programBtn?.addEventListener("click", openProgramModal);
      refereeProgressBtn?.addEventListener("click", (event) => {
        if (event.currentTarget.dataset.refereeProgressAction !== "set") return;
        setRefereeProgressHere();
      });
      programModal?.addEventListener("click", (event) => {
        if (event.target === programModal || event.target.closest("[data-program-close]")) {
          closeProgramModal();
          return;
        }
        if (["video", "computer"].includes(state.role)) return;
        const button = event.target.closest("[data-program-race]");
        if (!button) return;
        const row = (data.program || []).find((item) => programKey(item) === button.dataset.programRace);
        if (!row) return;
        applyProgramRow(row);
        if (row.session) state.session = row.session;
        const stage = button.dataset.programStage;
        const series = button.dataset.programSeries;
        if (stage && isFinalStage(stage)) {
          state.series = stage;
        } else if (series) {
          state.series = String(series);
        } else {
          state.series = firstSeriesSelectionForCurrentRace();
        }
        clearSearch();
        state.category = "all";
        state.selectedSwimmerId = "";
        state.selectedRecordKey = "";
        closeProgramModal();
        render();
      });
      
      adminSeriesBtn?.addEventListener("click", openAdminSeriesModal);
      archivesBtn?.addEventListener("click", () => {
        renderHistoryArchivesModal({ canDelete: false });
      });
      
      resultsAdminPanel?.addEventListener("click", async (event) => {
        if (event.target.closest("[data-competition-mode]")) {
          toggleCompetitionMode();
          return;
        }
        if (event.target.closest("[data-public-session-infos]")) {
          renderPublicSessionInfosModal();
          return;
        }
        if (event.target.closest("[data-computer-admin-series]")) {
          openAdminSeriesModal();
          return;
        }
        if (event.target.closest("[data-public-results-online-toggle]")) {
          togglePublicResultsOnline();
          return;
        }
        if (event.target.closest("[data-results-reset]")) {
          if (competitionModeEnabled()) {
            window.alert("RAZ indisponible quand l'actualisation directe est active.");
            return;
          }
          renderResetResultsModal();
          return;
        }
        const compositionButton = event.target.closest("[data-final-composition-result]");
        if (compositionButton) {
          openFinalCompositionResultModal(compositionButton.dataset.finalCompositionResult);
          return;
        }
        const sessionResultsButton = event.target.closest("[data-session-results-import]");
        if (sessionResultsButton) {
          openSessionResultsImportModal(sessionResultsButton.dataset.sessionResultsImport || resultsAdminSession);
          return;
        }
        const rereadButton = event.target.closest("[data-result-reread]");
        if (rereadButton) {
          const row = resultProgramRows(resultsAdminSession).find((item) => programKey(item) === rereadButton.dataset.resultReread)
            || (data.program || []).find((item) => programKey(item) === rereadButton.dataset.resultReread);
          const result = row ? resultForProgramRow(row) : null;
          if (!row || !result) return;
          const label = [
            row.session ? `Session ${row.session}` : "",
            data.events.find((item) => item.id === row.eventId)?.label || row.label || row.eventId,
            `${sexDisplayLabel(row.sex)} - ${resultPhaseLabelForProgramRow(row)}`
          ].filter(Boolean).join(" - ");
          const ok = window.confirm([
            "Relire le PDF déjà publié pour mettre à jour les données extraites ?",
            "",
            `Course : ${label}`,
            `PDF : ${result.pdfName || "PDF résultat"}`,
            "",
            "Le fichier PDF ne sera pas remplacé."
          ].join("\n"));
          if (!ok) return;
          const uploadKey = resultUploadKeyForProgram(row);
          setResultUploadState(uploadKey, "Relecture en cours...");
          try {
            renderDataStatus("Relecture du résultat en cours...");
            const rereadResult = await rereadPublishedResult(row);
            clearResultUploadState(uploadKey);
            renderDataStatus();
            updateLiveNotes(`Résultat relu : ${rereadResult.eventLabel} ${rereadResult.sexLabel} - ${rereadResult.phaseLabel || resultPhaseLabelForProgramRow(row)}${rereadResult.session ? ` S${rereadResult.session}` : ""}`).catch((error) => console.warn("Note de relecture non mise à jour", error));
            window.alert(`Résultat relu : ${rereadResult.ranking?.length || 0} ligne${Number(rereadResult.ranking?.length || 0) > 1 ? "s" : ""} détectée${Number(rereadResult.ranking?.length || 0) > 1 ? "s" : ""}.`);
          } catch (error) {
            console.error(error);
            setResultUploadState(uploadKey, "Relecture impossible. Réessaie.", "error");
            renderDataStatus();
            window.alert(`Relecture impossible : ${error?.message || error}`);
          }
          return;
        }
        const deleteButton = event.target.closest("[data-result-delete]");
        if (deleteButton) {
          const result = raceResults.find((item) => item.id === deleteButton.dataset.resultDelete);
          const label = [result?.eventLabel, result?.sexLabel, result?.session ? `S${result.session}` : ""].filter(Boolean).join(" - ") || "ce résultat";
          const ok = window.confirm(`Supprimer le PDF publié pour ${label} ?\n\nIl disparaîtra aussi de la page publique.`);
          if (!ok) return;
          deleteResultPdf(deleteButton.dataset.resultDelete)
            .then(async () => {
              await updateLiveNotes(`Résultat supprimé : ${label}`);
              renderResultsAdminPanel();
              window.alert("Résultat supprimé de la page publique.");
            })
            .catch((error) => {
              console.error(error);
              window.alert(`Suppression impossible : ${error?.message || error}`);
            });
          return;
        }
        const button = event.target.closest("[data-result-import]");
        if (!button) return;
        const row = resultProgramRows(resultsAdminSession).find((item) => programKey(item) === button.dataset.resultImport)
          || (data.program || []).find((item) => programKey(item) === button.dataset.resultImport);
        if (!row) return;
        openResultImportModal(row);
      });
      
      resultsAdminPanel?.addEventListener("change", (event) => {
        if (event.target?.id !== "resultsAdminSessionSelect") return;
        resultsAdminSession = event.target.value;
        renderResultsAdminPanel();
      });
      
      computerFooterPanel?.addEventListener("click", (event) => {
        if (!event.target.closest("[data-results-reset]")) return;
        if (competitionModeEnabled()) {
          window.alert("RAZ indisponible quand l'actualisation directe est active.");
          return;
        }
        renderResetResultsModal();
      });
      
      secretaryFinalsPanel?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-final-withdrawals]");
        if (!button) return;
        openFinalWithdrawalsModal(button.dataset.finalWithdrawals);
      });
      
      secretaryFinalsPanel?.addEventListener("change", (event) => {
        if (event.target?.id !== "secretaryFinalsSessionSelect") return;
        secretaryFinalsSession = event.target.value || "";
        renderSecretaryFinalsPanel();
      });
      
      adminSeriesModal?.addEventListener("click", (event) => {
        if (event.target === adminSeriesModal || event.target.closest("[data-admin-series-close]")) {
          closeAdminSeriesModal();
        }
      });
      
      resultImportModal?.addEventListener("click", (event) => {
        if (event.target === resultImportModal || event.target.closest("[data-result-import-close]")) {
          closeResultImportModal();
        }
      });
      
      resultImportModal?.addEventListener("change", async (event) => {
        if (event.target?.name === "sessionResultsScope") {
          const multipleField = resultImportModal.querySelector(".session-results-checkboxes");
          if (multipleField) multipleField.hidden = event.target.value !== "multiple";
          return;
        }
        if (event.target?.id === "sessionResultsPdfInput") {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const scope = resultImportModal.querySelector("input[name='sessionResultsScope']:checked")?.value || "current";
          const selectedSessions = scope === "full"
            ? resultSessions().map((session) => session.number)
            : (scope === "multiple"
              ? [...resultImportModal.querySelectorAll("input[name='sessionResultsSession']:checked")].map((input) => input.value)
              : [currentSessionResultsImport?.defaultSession || resultsAdminSession].filter(Boolean));
          if (scope !== "full" && !selectedSessions.length) {
            window.alert("Sélectionne au moins une session.");
            return;
          }
          const sessionLabel = scope === "full"
            ? "toutes les sessions"
            : selectedSessions.map((session) => `S${session}`).join(", ");
          const ok = window.confirm([
            "Publier ce PDF comme résultats complets de consultation ?",
            "",
            `Portée : ${sessionLabel}`,
            `Fichier : ${file.name}`,
            "",
            "Le PDF sera visible sur la page publique, sans lecture automatique des finalistes."
          ].join("\n"));
          if (!ok) return;
          const visibleSession = currentSessionResultsImport?.defaultSession || resultsAdminSession || selectedSessions[0] || "";
          const uploadKey = resultUploadKeyForSessionResults(visibleSession);
          closeResultImportModal();
          setResultUploadState(uploadKey, "Chargement en cours...");
          try {
            renderDataStatus("Publication du PDF résultats complets...");
            const pdf = await publishSessionResultsPdf(file, scope === "full" ? "full" : "sessions", selectedSessions);
            clearResultUploadState(uploadKey);
            renderDataStatus();
            updateLiveNotes(`PDF résultats complets publié : ${pdf.sourceLabel}`).catch((error) => console.warn("Note de publication non mise à jour", error));
            window.alert("PDF résultats complets publié sur la page publique.");
          } catch (error) {
            console.error(error);
            renderDataStatus();
            setResultUploadState(uploadKey, "Chargement impossible. Réessaie.", "error");
            window.alert(`Publication impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target?.id !== "resultPdfInput") return;
        const file = event.target.files?.[0];
        if (!file || !currentResultImportRow) return;
        const rowToImport = currentResultImportRow;
        const existingResult = resultForProgramRow(rowToImport);
        const finalListMode = resultImportModal.querySelector("input[name='resultFinalListMode']:checked")?.value || "";
        const preserveFinalists = Boolean(existingResult?.hasFinal && finalListMode === "preserve");
        const overwriteFinalists = Boolean(existingResult?.hasFinal && finalListMode === "overwrite");
        const hasFinal = !isFinalStage(rowToImport.stage) && (
          overwriteFinalists ||
          (!preserveFinalists && resultImportModal.querySelector("input[name='resultFinalMode']:checked")?.value === "yes")
        );
        const isPartial = preserveFinalists
          ? Boolean(existingResult?.isPartial)
          : resultImportModal.querySelector("input[name='resultCompletionMode']:checked")?.value === "partial";
        const message = preserveFinalists
          ? "Remplacer le PDF résultat en conservant la liste des finalistes déjà annoncés, les forfaits et les repêchages ?"
          : (overwriteFinalists
            ? "ATTENTION : relire ce PDF et écraser la liste des finalistes déjà annoncés, les forfaits et les repêchages ?"
          : (hasFinal
            ? `Publier ce résultat ${isPartial ? "partiel" : "complet"} et détecter les finalistes ?`
            : `Publier ce résultat ${isPartial ? "partiel" : "complet"} sans finale ?`));
        const importLabel = [
          rowToImport.session ? `Session ${rowToImport.session}` : "",
          data.events.find((item) => item.id === rowToImport.eventId)?.label || rowToImport.label || rowToImport.eventId,
          `${sexDisplayLabel(rowToImport.sex)} - ${resultPhaseLabelForProgramRow(rowToImport)}`
        ].filter(Boolean).join(" - ");
        if (!window.confirm([message, "", `Course : ${importLabel}`, `Fichier : ${file.name}`].join("\n"))) return;
        const uploadKey = resultUploadKeyForProgram(rowToImport);
        closeResultImportModal();
        setResultUploadState(uploadKey, "Chargement en cours...");
        try {
          renderDataStatus("Publication du résultat en cours...");
          const result = await publishResultPdf(file, rowToImport, hasFinal, isPartial, { preserveFinalists });
          clearResultUploadState(uploadKey);
          renderDataStatus();
          updateLiveNotes(`Résultat publié : ${result.eventLabel} ${result.sexLabel} - ${result.phaseLabel || resultPhaseLabelForProgramRow(rowToImport)}${result.session ? ` S${result.session}` : ""}`).catch((error) => console.warn("Note de publication non mise à jour", error));
          const finalistCount = finalRowsCount(result.finalists);
          window.alert(hasFinal
            ? `Résultat publié : ${finalistCount} finaliste${finalistCount > 1 ? "s" : ""} détecté${finalistCount > 1 ? "s" : ""}.`
            : "Résultat publié sur la page publique.");
        } catch (error) {
          console.error(error);
          setResultUploadState(uploadKey, "Chargement impossible. Réessaie.", "error");
          window.alert(`Publication impossible : ${error?.message || error}`);
          renderDataStatus();
        } finally {
          event.target.value = "";
        }
      });
      
      adminSeriesModal?.addEventListener("change", async (event) => {
        if (event.target?.name === "seriesImportMode") {
          const mode = adminSeriesModal.querySelector("input[name='seriesImportMode']:checked")?.value || "full";
          const sessionField = adminSeriesModal.querySelector(".admin-session-field");
          if (sessionField) sessionField.hidden = mode !== "session";
          return;
        }
        if (event.target?.id !== "seriesPdfInput") return;
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const mode = adminSeriesModal.querySelector("input[name='seriesImportMode']:checked")?.value || "session";
        const forcedSession = mode === "session"
          ? String(adminSeriesModal.querySelector("#seriesSessionOverride")?.value || "").trim()
          : "";
        if (mode === "session" && !forcedSession) {
          window.alert("Indique le numéro de la session à remplacer avant de choisir le PDF.");
          return;
        }
        if (competitionModeEnabled()) {
          const continueLiveImport = window.confirm([
            "L'actualisation directe est active.",
            "",
            "Si tu importes ce PDF, les consoles en direct seront mises à jour immédiatement.",
            "Continuer ?"
          ].join("\n"));
          if (!continueLiveImport) return;
        }
        const message = mode === "full"
          ? `Confirmer l'import comme PDF général ?\n\nFichier : ${file.name}\n\nCela remplace toutes les séries actuellement publiées.`
          : `Confirmer l'import comme mise à jour de la session ${forcedSession} ?\n\nFichier : ${file.name}\n\nCette session sera remplacée par le PDF choisi.`;
        if (!window.confirm(message)) return;
        closeAdminSeriesModal();
        setSeriesImportState(mode === "full" ? "Chargement du PDF général..." : `Chargement de la session ${forcedSession}...`);
        try {
          await importSeriesPdf(file, mode, forcedSession);
          clearSeriesImportState();
        } catch (error) {
          console.error(error);
          setSeriesImportState("Chargement impossible. Réessaie.", "error");
        }
      });
      
      roleCodesModal?.addEventListener("click", async (event) => {
        if (event.target === roleCodesModal && roleCodesModal.querySelector(".session-infos-dialog")) {
          return;
        }
        if (event.target === roleCodesModal || event.target.closest("[data-role-codes-close]")) {
          closeRoleCodesModal();
          return;
        }
        if (event.target.closest("[data-open-history-archives]")) {
          await renderHistoryArchivesModal({ canDelete: true });
          return;
        }
        if (event.target.closest("[data-technical-diagnostic]")) {
          try {
            await showTechnicalDiagnosticModal();
          } catch (error) {
            console.error(error);
            window.alert(`Diagnostic technique impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-performance-diagnostic]")) {
          try {
            await showPerformanceDiagnosticModal();
          } catch (error) {
            console.error(error);
            window.alert(`Diagnostic performance impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-clean-result-pdfs]")) {
          const ok = window.confirm("Nettoyer les anciens PDF résultats encore stockés dans results ?\n\nLes PDF resteront consultables, mais seront déplacés dans resultPdfs pour accélérer les consoles.");
          if (!ok) return;
          try {
            const count = await cleanLegacyResultPdfs();
            window.alert(`${count} PDF résultat${count > 1 ? "s" : ""} nettoyé${count > 1 ? "s" : ""}.`);
            await showPerformanceDiagnosticModal();
          } catch (error) {
            console.error(error);
            window.alert(`Nettoyage impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-public-index-republish]")) {
          try {
            await publishPublicResultsIndex();
            window.alert("Index public republié. Les pages Séries/Résultats peuvent utiliser les données à jour sans modifier l'heure des séries.");
          } catch (error) {
            console.error(error);
            window.alert(`Republication impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-role-codes-back]")) {
          renderRoleCodesModal();
          return;
        }
        if (event.target.closest("[data-confirm-reset-history]")) {
          const confirmation = String(roleCodesModal.querySelector("#resetHistoryInput")?.value || "").trim().toUpperCase();
          if (confirmation !== "RAZ") {
            window.alert("RAZ annulée : il faut écrire RAZ.");
            return;
          }
          closeRoleCodesModal();
          await performResetHistoryWithArchive();
          return;
        }
        if (event.target.closest("[data-confirm-reset-results]")) {
          const confirmation = String(roleCodesModal.querySelector("#resetResultsInput")?.value || "").trim().toUpperCase();
          if (confirmation !== "RAZ") {
            window.alert("RAZ annulée : il faut écrire RAZ.");
            return;
          }
          if (competitionModeEnabled()) {
            window.alert("RAZ indisponible quand l'actualisation directe est active.");
            closeRoleCodesModal();
            return;
          }
          const scope = roleCodesModal.querySelector("input[name='resetResultsScope']:checked")?.value || "results-session";
          const selectedResetSession = String(roleCodesModal.querySelector("#resetResultsSessionSelect")?.value || ensureResultsAdminSession() || "").trim();
          closeRoleCodesModal();
          try {
            if (scope === "history") {
              await performResetHistoryWithArchive();
            } else if (scope === "series-all") {
              await resetSeriesForNextCompetition();
            } else if (scope === "results-all") {
              const count = await clearPublishedResults();
              await updateLiveNotes("RAZ résultats publics compétition");
              window.alert(`${count} résultat${count > 1 ? "s" : ""} public${count > 1 ? "s" : ""} archivé${count > 1 ? "s" : ""} puis supprimé${count > 1 ? "s" : ""}.`);
            } else if (selectedResetSession) {
              const summary = await clearPublishedResultsForSession(selectedResetSession);
              await updateLiveNotes(`RAZ résultats publics S${selectedResetSession}`);
              window.alert(`${summary.results} résultat${summary.results > 1 ? "s" : ""} public${summary.results > 1 ? "s" : ""} et ${summary.sessionPdfs} PDF complet${summary.sessionPdfs > 1 ? "s" : ""} de session archivés puis supprimés pour S${selectedResetSession}.`);
            } else {
              window.alert("Aucune session sélectionnée pour le RAZ résultats.");
            }
          } catch (error) {
            console.error(error);
            window.alert(`RAZ impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-save-public-session-infos]")) {
          const nextInfos = {};
          roleCodesModal.querySelectorAll("[data-session-info-input]").forEach((field) => {
            const session = String(field.dataset.sessionInfoInput || "").trim();
            const value = String(field.value || "").trim();
            if (session && value) nextInfos[session] = value;
          });
          closeRoleCodesModal();
          updateLiveNotes("Informations sessions publiques", {
            publicSessionInfos: nextInfos,
            publicSessionInfosUpdatedAt: new Date().toISOString()
          }).then(async () => {
            await publishPublicResultsIndex({ silent: true });
            renderResultsAdminPanel();
            window.alert("Informations de session publiées sur les pages Résultats et Séries.");
          }).catch((error) => {
            console.error(error);
            window.alert(`Publication impossible : ${error?.message || error}`);
          });
          return;
        }
        const openArchiveButton = event.target.closest("[data-open-archive]");
        if (openArchiveButton) {
          const id = openArchiveButton.dataset.openArchive;
          const collection = historyArchivesCollection();
          if (!collection) return;
          const snapshot = await collection.doc(id).get();
          if (!snapshot.exists) {
            window.alert("Archive introuvable.");
            return;
          }
          const archive = snapshot.data();
          openDsqRows(Array.isArray(archive.alerts) ? archive.alerts : [], `Archive journal d'arbitrage - ${archive.createdLabel || id}`);
          return;
        }
        const deleteArchiveButton = event.target.closest("[data-delete-archive]");
        if (deleteArchiveButton) {
          if (roleCodesModal.querySelector(".history-archives-dialog")?.dataset.archivesCanDelete !== "1") {
            window.alert("Suppression réservée à l'administrateur général.");
            return;
          }
          const ok = window.confirm("Supprimer définitivement cette archive ?");
          if (!ok) return;
          const collection = historyArchivesCollection();
          if (!collection) return;
          await collection.doc(deleteArchiveButton.dataset.deleteArchive).delete();
          await renderHistoryArchivesModal({ canDelete: true });
          return;
        }
        const openResultArchiveButton = event.target.closest("[data-open-result-archive]");
        if (openResultArchiveButton) {
          const id = openResultArchiveButton.dataset.openResultArchive;
          const collection = resultArchivesCollection();
          if (!collection) return;
          const archiveSnapshot = await collection.doc(id).get();
          if (!archiveSnapshot.exists) {
            window.alert("Archive introuvable.");
            return;
          }
          const itemSnapshot = await collection.doc(id).collection("items").get();
          const rows = itemSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          openResultArchiveRows(rows, archiveSnapshot.data());
          return;
        }
        const deleteResultArchiveButton = event.target.closest("[data-delete-result-archive]");
        if (deleteResultArchiveButton) {
          if (roleCodesModal.querySelector(".history-archives-dialog")?.dataset.archivesCanDelete !== "1") {
            window.alert("Suppression réservée à l'administrateur général.");
            return;
          }
          const ok = window.confirm("Supprimer définitivement cette archive de résultats ?");
          if (!ok) return;
          const collection = resultArchivesCollection();
          if (!collection || !firestoreDb) return;
          const archiveRef = collection.doc(deleteResultArchiveButton.dataset.deleteResultArchive);
          const itemSnapshot = await archiveRef.collection("items").get();
          const batch = firestoreDb.batch();
          itemSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
          batch.delete(archiveRef);
          await batch.commit();
          await renderHistoryArchivesModal({ canDelete: true });
          return;
        }
        if (event.target.closest("[data-role-pin-cancel]")) {
          finishRolePin(false);
          return;
        }
        if (event.target.closest("[data-confirm-role-code-admin]")) {
          const code = String(roleCodesModal.querySelector("#roleCodeAdminInput")?.value || "").trim();
          if (code !== ADMIN_PIN) {
            window.alert("Code admin incorrect.");
            return;
          }
          const action = event.target.closest("[data-confirm-role-code-admin]")?.dataset.confirmRoleCodeAdmin || "codes";
          if (action === "reset") {
            closeRoleCodesModal();
            await performResetHistoryWithArchive();
            return;
          }
          renderRoleCodesModal();
          return;
        }
        const pinButton = event.target.closest("[data-confirm-role-pin]");
        if (pinButton) {
          const role = pinButton.dataset.confirmRolePin;
          const code = String(roleCodesModal.querySelector("#rolePinInput")?.value || "").trim();
          if (code === ADMIN_PIN) {
            finishRolePin({ allowed: true, adminBypass: true });
          } else if (code === currentRolePins()[role]) {
            unlockRole(role);
            finishRolePin({ allowed: true, adminBypass: false });
          } else {
            window.alert("Code incorrect.");
          }
          return;
        }
        const saveButton = event.target.closest("[data-save-role-codes]");
        if (saveButton) {
          await saveRoleCodesFromModal(true);
          return;
        }
        if (event.target.closest("[data-disable-role-codes]")) {
          const ok = window.confirm("Désactiver les codes pour toutes les consoles ?");
          if (ok) await saveRoleCodesFromModal(false);
        }
      });
      
      roleCodesModal?.addEventListener("input", (event) => {
        if (event.target?.matches("[data-role-code]")) {
          event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0, 4);
          return;
        }
        if (event.target?.matches("#roleCodeAdminInput, #rolePinInput")) {
          event.target.value = String(event.target.value || "").replace(/[^0-9!]/g, "").slice(0, 5);
          return;
        }
        if (event.target?.matches("#resetHistoryInput, #resetResultsInput")) {
          event.target.value = String(event.target.value || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
        }
      });
      
      roleCodesModal?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        const adminInput = event.target?.closest("#roleCodeAdminInput");
        if (adminInput) {
          event.preventDefault();
          roleCodesModal.querySelector("[data-confirm-role-code-admin]")?.click();
          return;
        }
        const pinInput = event.target?.closest("#rolePinInput");
        if (pinInput) {
          event.preventDefault();
          roleCodesModal.querySelector("[data-confirm-role-pin]")?.click();
          return;
        }
        const resetInput = event.target?.closest("#resetHistoryInput");
        if (resetInput) {
          event.preventDefault();
          roleCodesModal.querySelector("[data-confirm-reset-history]")?.click();
          return;
        }
        const resetResultsInput = event.target?.closest("#resetResultsInput");
        if (resetResultsInput) {
          event.preventDefault();
          roleCodesModal.querySelector("[data-confirm-reset-results]")?.click();
        }
      });
      
      officialAlerts?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-alert-action]");
        const card = event.target.closest("[data-alert-id]");
        if (!card) return;
        const alert = alerts.find((item) => item.id === card.dataset.alertId);
        if (alert?.type === "finalists_announcement") {
          if (state.role === "speaker") openFinalistsAnnouncementModal(card.dataset.alertId);
          return;
        }
        if (state.role === "live") {
          dismissLiveAlert(card.dataset.alertId);
          return;
        }
        if (!button) return;
        if (button.dataset.alertAction === "Annoncé") {
          const alertId = card.dataset.alertId;
          const announcedAt = new Date().toISOString();
          const previousAlert = markSpeakerAlertDoneLocally(alertId, announcedAt);
          if (!previousAlert) return;
          if (alert?.type === "finalist_replacement_announcement") {
            publishReplacementAfterSpeaker(alertId).catch((error) => {
              console.error(error);
              if (!error?.alertAlreadyClosed) restoreAlertLocally(previousAlert);
              showToast(`Annonce du repêchage impossible : ${error?.message || error}`);
            });
            return;
          }
          syncAlertChangesToFirestoreStrict(alertId, {
            speakerStatus: "done",
            speakerAnnouncedAt: announcedAt,
            updatedAt: announcedAt
          }).catch((error) => {
            console.error(error);
            restoreAlertLocally(previousAlert);
            showToast(`Annonce impossible : ${error?.message || error}`);
          });
        }
      });
      
      alertDetailModal?.addEventListener("click", (event) => {
        const finalistsButton = event.target.closest("[data-finalists-announced]");
        if (finalistsButton) {
          const alertId = finalistsButton.dataset.finalistsAnnounced;
          const announcedAt = new Date().toISOString();
          finalistsButton.disabled = true;
          finalistsButton.textContent = "Pris en compte";
          closeAlertDetail();
          const previousAlert = markSpeakerAlertDoneLocally(alertId, announcedAt);
          publishFinalistsAfterSpeaker(alertId).catch((error) => {
            console.error(error);
            if (!error?.alertAlreadyClosed) restoreAlertLocally(previousAlert);
            showToast(`Publication des finalistes impossible : ${error?.message || error}`);
          });
          return;
        }
        const withdrawButton = event.target.closest("[data-final-withdraw]");
        if (withdrawButton) {
          const expired = withdrawButton.dataset.finalExpired === "1";
          const message = expired
            ? "Attention, le délai de forfait est dépassé. Souhaitez-vous quand même valider ce forfait et repêcher le nageur suivant si possible ?"
            : "Déclarer ce forfait en finale et repêcher le nageur suivant si possible ?";
          const ok = window.confirm(message);
          if (!ok) return;
          markFinalistWithdrawn(
            withdrawButton.dataset.finalWithdraw,
            withdrawButton.dataset.finalKey,
            withdrawButton.dataset.finalIndex,
            { allowExpired: expired, rowKey: withdrawButton.dataset.finalRowKey || "" }
          ).catch((error) => {
            console.error(error);
            window.alert(`Forfait impossible : ${error?.message || error}`);
          });
          return;
        }
        const preWithdrawButton = event.target.closest("[data-final-prewithdraw]");
        if (preWithdrawButton) {
          const activeLabel = preWithdrawButton.textContent.includes("Annuler") ? "Annuler ce pré-forfait ?" : "Enregistrer ce pré-forfait si le nageur est repêché ?";
          const ok = window.confirm(activeLabel);
          if (!ok) return;
          toggleFinalPreWithdrawal(
            preWithdrawButton.dataset.finalPrewithdraw,
            preWithdrawButton.dataset.finalRowKey
          ).catch((error) => {
            console.error(error);
            window.alert(`Pré-forfait impossible : ${error?.message || error}`);
          });
          return;
        }
        const reinstateButton = event.target.closest("[data-final-reinstate]");
        if (reinstateButton) {
          const ok = window.confirm("Réintégrer ce nageur dans la finale ? Si le repêchage n'a pas encore été annoncé, l'alerte speaker sera annulée.");
          if (!ok) return;
          reinstateFinalist(
            reinstateButton.dataset.finalReinstate,
            reinstateButton.dataset.finalKey,
            reinstateButton.dataset.finalIndex,
            reinstateButton.dataset.finalRowKey || ""
          ).catch((error) => {
            console.error(error);
            window.alert(`Réintégration impossible : ${error?.message || error}`);
          });
          return;
        }
        const compositionDoneButton = event.target.closest("[data-final-composition-done]");
        if (compositionDoneButton) {
          updateAlert(compositionDoneButton.dataset.finalCompositionDone, {
            informaticsStatus: "done",
            informaticsDoneAt: new Date().toISOString()
          });
          closeAlertDetail();
          return;
        }
        if (event.target === alertDetailModal || event.target.closest("[data-close-alert-detail]")) {
          closeAlertDetail();
        }
      });
      
      decisionModal?.addEventListener("click", (event) => {
        if (event.target === decisionModal || event.target.closest("[data-close-decision]")) {
          closeDecisionModal({ clearSelection: true });
          return;
        }
        const entrant = selectedEntrant();
        if (!entrant) return;
        const cancelButton = event.target.closest("[data-cancel-active-decision]");
        if (cancelButton) {
          const ok = window.confirm("Annuler cette DSQ ? Une alerte sera envoyée si le speaker ou le bureau des performances doit corriger l'information.");
          if (ok) {
            closeDecisionModal({ clearSelection: true });
            cancelDecision(cancelButton.dataset.cancelActiveDecision, "referee");
          }
          return;
        }
        const typeButton = event.target.closest("[data-decision-type]");
        if (typeButton) {
          decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
          decisionDraft.type = typeButton.dataset.decisionType || "";
          defaultDecisionDetail(decisionDraft.type, entrant);
          renderDecisionModal();
          return;
        }
        const relayButton = event.target.closest("[data-relay-leg]");
        if (relayButton) {
          decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
          decisionDraft.relayLeg = relayButton.dataset.relayLeg || "";
          renderDecisionModal();
          return;
        }
        const lengthButton = event.target.closest("[data-length-type]");
        if (lengthButton) {
          decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
          decisionDraft.lengthType = lengthButton.dataset.lengthType || "start";
          renderDecisionModal();
          return;
        }
        const stepButton = event.target.closest("[data-length-step]");
        if (stepButton) {
          decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || decisionDraft.comment;
          const current = Math.max(1, Number.parseInt(decisionDraft.lengthNumber || "1", 10) || 1);
          const step = Number.parseInt(stepButton.dataset.lengthStep || "0", 10) || 0;
          decisionDraft.lengthNumber = String(Math.max(1, current + step));
          decisionDraft.lengthType = "length";
          renderDecisionModal();
          return;
        }
        if (event.target.closest("[data-submit-decision]")) {
          decisionDraft.comment = document.querySelector("#modalDecisionComment")?.value || "";
          decisionDraft.lengthNumber = document.querySelector("#modalLengthNumber")?.value || decisionDraft.lengthNumber;
          if (!decisionDraftIsReady(entrant)) return;
          createDecisionAlert(decisionDraft);
          closeDecisionModal();
        }
      });
      
      decisionModal?.addEventListener("input", (event) => {
        if (event.target?.id === "modalDecisionComment") {
          decisionDraft.comment = event.target.value;
        } else if (event.target?.id === "modalLengthNumber") {
          decisionDraft.lengthNumber = event.target.value;
        }
      });
      
      roleQueue?.addEventListener("click", (event) => {
        const compositionButton = event.target.closest("[data-final-composition-open]");
        if (compositionButton) {
          openFinalCompositionModal(compositionButton.dataset.finalCompositionOpen);
          return;
        }
        const button = event.target.closest("[data-queue-action]");
        const item = event.target.closest("[data-alert-id]");
        if (!item) return;
        if (!button) return;
        const id = item.dataset.alertId;
        if (button.dataset.queueAction === "confirm-video") {
          updateAlert(id, { videoStatus: "confirmed", videoConfirmedAt: new Date().toISOString(), speakerStatus: "pending", informaticsStatus: "pending" });
        } else if (button.dataset.queueAction === "reject-video") {
          updateAlert(id, { videoStatus: "rejected", videoRejectedAt: new Date().toISOString(), speakerStatus: "none", informaticsStatus: "none" });
        } else if (button.dataset.queueAction === "done-computer") {
          updateAlert(id, { informaticsStatus: "done", informaticsDoneAt: new Date().toISOString() });
        } else if (button.dataset.queueAction === "done-secretary") {
          updateAlert(id, { secretaryStatus: "done", secretaryDoneAt: new Date().toISOString() });
        }
      });
      
      roleHistory?.addEventListener("click", (event) => {
        if (event.target.closest("[data-results-reset]")) {
          if (competitionModeEnabled()) {
            window.alert("RAZ indisponible quand l'actualisation directe est active.");
            return;
          }
          renderResetResultsModal();
          return;
        }
        if (event.target.closest("[data-history-export-pdf]")) {
          exportDsqPdf();
          return;
        }
        if (event.target.closest("[data-history-reset]")) {
          resetHistory();
          return;
        }
        const toggle = event.target.closest("[data-history-toggle]");
        if (toggle) {
          const key = toggle.dataset.historyToggle;
          expandedHistories[key] = !expandedHistories[key];
          renderRoleHistory();
          return;
        }
        const button = event.target.closest("[data-history-action]");
        const item = event.target.closest("[data-history-alert-id]");
        if (!item) return;
        const alert = alerts.find((row) => row.id === item.dataset.historyAlertId);
        if (!alert) return;
        if (!button) {
          openAlertDetail(alert.id);
          return;
        }
        if (button.dataset.historyAction === "cancel-ja") {
          const ok = window.confirm("Annuler cette décision ? Une alerte sera envoyée si le speaker ou le bureau des performances doit corriger l'information.");
          if (ok) cancelDecision(alert.id, "referee");
        } else if (button.dataset.historyAction === "delegate-cancel") {
          const ok = window.confirm("Confirmer l'annulation par le délégué de la compétition ? Le speaker et le bureau des performances recevront une alerte de requalification.");
          if (ok) cancelDecision(alert.id, "delegate");
        }
      });
      
      roleHistory?.addEventListener("change", (event) => {
        const select = event.target.closest("[data-history-filter]");
        if (!select) return;
        historyFilters[select.dataset.historyFilter] = select.value;
        expandedHistories.role = false;
        renderRoleHistory();
      });
      
      speakerHistory?.addEventListener("click", (event) => {
        const toggle = event.target.closest("[data-history-toggle]");
        if (toggle) {
          const key = toggle.dataset.historyToggle;
          expandedHistories[key] = !expandedHistories[key];
          renderSpeakerHistory();
          return;
        }
        const item = event.target.closest("[data-history-alert-id]");
        if (!item) return;
        openAlertDetail(item.dataset.historyAlertId);
      });
      
      speakerHistory?.addEventListener("change", (event) => {
        const select = event.target.closest("[data-history-filter]");
        if (!select) return;
        historyFilters[select.dataset.historyFilter] = select.value;
        expandedHistories.speaker = false;
        renderSpeakerHistory();
      });
      
      fullscreenBtn?.addEventListener("click", async () => {
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          } else if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          } else {
            isFullscreenMode = !isFullscreenMode;
            render();
          }
        } catch {
          isFullscreenMode = !isFullscreenMode;
          render();
        }
      });
      
      document.addEventListener("fullscreenchange", () => {
        isFullscreenMode = Boolean(document.fullscreenElement);
        render();
      });
      
      function goToNextSeries() {
        const numbers = availableSeriesNumbers();
        const finals = finalProgramRowsForRace();
        const finalStages = finals.map((row) => row.stage);
        if (!numbers.length && !finalStages.length) return;
        if (state.series === "all") {
          state.series = String(numbers[0] || finalStages[0] || "all");
        } else if (isFinalStage(state.series)) {
          const currentFinalIndex = finalStages.indexOf(state.series);
          const nextFinalRow = finals[currentFinalIndex + 1];
          if (nextFinalRow) {
            applyProgramRow(nextFinalRow);
            state.series = nextFinalRow.stage;
          } else {
            goToNextProgramRace();
          }
        } else {
          const currentIndex = numbers.indexOf(Number(state.series));
          const next = numbers[currentIndex + 1];
          if (next) {
            state.series = String(next);
          } else {
            goToNextProgramRace();
          }
        }
        state.selectedSwimmerId = "";
        render();
      }
      
      function goToPreviousSeries() {
        const numbers = availableSeriesNumbers();
        const finals = finalProgramRowsForRace();
        const finalStages = finals.map((row) => row.stage);
        if (!numbers.length && !finalStages.length) return;
        if (isFinalStage(state.series)) {
          const currentFinalIndex = finalStages.indexOf(state.series);
          const previousFinalRow = finals[currentFinalIndex - 1];
          if (previousFinalRow) {
            applyProgramRow(previousFinalRow);
            state.series = previousFinalRow.stage;
          } else if (numbers.length) {
            state.series = String(numbers[numbers.length - 1]);
          } else {
            goToPreviousProgramRace();
          }
        } else if (state.series === "all") {
          goToPreviousProgramRace();
        } else {
          const currentIndex = numbers.indexOf(Number(state.series));
          const previous = numbers[currentIndex - 1];
          if (previous) {
            state.series = String(previous);
          } else {
            goToPreviousProgramRace();
          }
        }
        state.selectedSwimmerId = "";
        render();
      }
      
      function toggleAntoineOverlay() {
        if (!antoineOverlay) return;
        antoineOverlay.hidden = !antoineOverlay.hidden;
      }
      
      previousSeriesBtn?.addEventListener("click", goToPreviousSeries);
      previousSeriesInlineBtn?.addEventListener("click", goToPreviousSeries);
      previousSeriesFloatBtn?.addEventListener("click", goToPreviousSeries);
      nextSeriesBtn?.addEventListener("click", goToNextSeries);
      nextSeriesInlineBtn?.addEventListener("click", goToNextSeries);
      nextSeriesFloatBtn?.addEventListener("click", goToNextSeries);
      programFloatBtn?.addEventListener("click", openProgramModal);
      
      document.addEventListener("keydown", (event) => {
        const target = event.target;
        if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          goToNextSeries();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          goToPreviousSeries();
        } else if (event.key.toLowerCase() === "s") {
          event.preventDefault();
          sessionControls?.querySelector("#sessionSelect")?.focus();
        } else if (event.key.toLowerCase() === "a") {
          event.preventDefault();
          toggleAntoineOverlay();
        }
      });
      
      lineOrderBtn?.addEventListener("click", () => {
        state.lineOrder = state.lineOrder === "desc" ? "asc" : "desc";
        renderEntrants();
      });
      
      searchInput?.addEventListener("input", () => {
        state.search = searchInput.value;
        state.selectedSwimmerId = "";
        renderEntrants();
      });
      
      categorySelect.addEventListener("change", () => {
        state.category = categorySelect.value;
        state.selectedSwimmerId = "";
        selectRecordForCategory(state.category);
        renderHeaderReferences();
        renderEntrants();
      });
      
      entrantsBody.addEventListener("click", (event) => {
        const row = event.target.closest("tr[data-swimmer-id]");
        if (!row) return;
        if (state.role === "referee" && row.dataset.importedForfait === "1") return;
        state.selectedSwimmerId = row.dataset.swimmerId;
        renderEntrants();
        renderRolePanels();
        if (state.role === "referee") {
          openDecisionModal();
        }
      });
      
      swimmerDetails.addEventListener("click", (event) => {
        if (!event.target.closest(".close-details")) return;
        state.selectedSwimmerId = "";
        renderEntrants();
      });
      
      document.querySelector("#printBtn")?.addEventListener("click", () => window.print());
      document.querySelector("#exportBtn")?.addEventListener("click", downloadJson);
      document.querySelector("#exportDsqPdfBtn")?.addEventListener("click", exportDsqPdf);
      document.querySelector("#updateSpeakerInfoBtn")?.addEventListener("click", updateSpeakerInfoFromGoogleSheet);
      document.querySelector("#updateSpeakerInfoPanelBtn")?.addEventListener("click", updateSpeakerInfoFromGoogleSheet);
    }
  }

  window.LivePalmesUiEvents = { init };
}());
