(function () {
  function init(context = {}) {
    const {
      adminSeriesModal,
      clearResultUploadState,
      clearSeriesImportState,
      closeAdminSeriesModal,
      closeResultImportModal,
      competitionModeEnabled,
      computerFooterPanel,
      deleteResultPdf,
      finalRowsCount,
      importSeriesPdf,
      isFinalStage,
      openAdminSeriesModal,
      openFinalCompositionResultModal,
      openFinalWithdrawalsModal,
      openResultDetailsModal,
      openResultImportModal,
      openSessionResultsImportModal,
      programKey,
      publishResultPdf,
      publishSessionResultsPdf,
      renderDataStatus,
      renderPublicSessionInfosModal,
      renderResetResultsModal,
      renderResultsAdminPanel,
      renderSecretaryFinalsPanel,
      rereadPublishedResult,
      resultForProgramRow,
      resultImportModal,
      resultPhaseLabelForProgramRow,
      resultProgramRows,
      resultSessions,
      resultsAdminPanel,
      resultUploadKeyForProgram,
      resultUploadKeyForSessionResults,
      secretaryFinalsPanel,
      setResultUploadState,
      setSeriesImportState,
      sexDisplayLabel,
      toggleCompetitionMode,
      updateLiveNotes
    } = context;
    const getData = () => context.data || { events: [], program: [] };
    const getRaceResults = () => context.raceResults || [];
    const getResultsAdminSession = () => context.resultsAdminSession || "";
    const setResultsAdminSession = (value) => { context.resultsAdminSession = value; };

    function prepareManualModeForReset() {
      if (!competitionModeEnabled()) return true;
      const ok = window.confirm([
        "L'actualisation directe est active.",
        "",
        "Pour faire une RAZ, LivePalmes doit d'abord passer en Manuel.",
        "Passer en Manuel et continuer la RAZ ?"
      ].join("\n"));
      if (!ok) return false;
      toggleCompetitionMode();
      return true;
    }

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
        if (event.target.closest("[data-results-reset]")) {
          if (!prepareManualModeForReset()) return;
          renderResetResultsModal();
          return;
        }
        const compositionButton = event.target.closest("[data-final-composition-result]");
        if (compositionButton) {
          openFinalCompositionResultModal(compositionButton.dataset.finalCompositionResult);
          return;
        }
        const resultDetailButton = event.target.closest("[data-result-detail]");
        if (resultDetailButton) {
          openResultDetailsModal(resultDetailButton.dataset.resultDetail);
          return;
        }
        const sessionResultsButton = event.target.closest("[data-session-results-import]");
        if (sessionResultsButton) {
          openSessionResultsImportModal(sessionResultsButton.dataset.sessionResultsImport || getResultsAdminSession());
          return;
        }
        const rereadButton = event.target.closest("[data-result-reread]");
        if (rereadButton) {
          const data = getData();
          const row = resultProgramRows(getResultsAdminSession()).find((item) => programKey(item) === rereadButton.dataset.resultReread)
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
          const result = getRaceResults().find((item) => item.id === deleteButton.dataset.resultDelete);
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
        const data = getData();
        const row = resultProgramRows(getResultsAdminSession()).find((item) => programKey(item) === button.dataset.resultImport)
          || (data.program || []).find((item) => programKey(item) === button.dataset.resultImport);
        if (!row) return;
        openResultImportModal(row);
      });
      
      resultsAdminPanel?.addEventListener("change", (event) => {
        if (event.target?.id !== "resultsAdminSessionSelect") return;
        setResultsAdminSession(event.target.value);
        renderResultsAdminPanel();
      });
      
      computerFooterPanel?.addEventListener("click", (event) => {
        if (!event.target.closest("[data-results-reset]")) return;
        if (!prepareManualModeForReset()) return;
        renderResetResultsModal();
      });
      
      secretaryFinalsPanel?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-final-withdrawals]");
        if (!button) return;
        openFinalWithdrawalsModal(button.dataset.finalWithdrawals);
      });
      
      secretaryFinalsPanel?.addEventListener("change", (event) => {
        if (event.target?.id !== "secretaryFinalsSessionSelect") return;
        context.secretaryFinalsSession = event.target.value || "";
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
              : [context.currentSessionResultsImport?.defaultSession || getResultsAdminSession()].filter(Boolean));
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
          const visibleSession = context.currentSessionResultsImport?.defaultSession || getResultsAdminSession() || selectedSessions[0] || "";
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
        if (!file || !context.currentResultImportRow) return;
        const rowToImport = context.currentResultImportRow;
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
          (getData().events || []).find((item) => item.id === rowToImport.eventId)?.label || rowToImport.label || rowToImport.eventId,
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
  }

  window.LivePalmesUiResultsEvents = { init };
}());
