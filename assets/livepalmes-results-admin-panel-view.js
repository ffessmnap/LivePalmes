(function attachLivePalmesResultsAdminPanelView(global) {
  function create(context = {}) {
    const {
      alerts = [],
      computerFooterPanel,
      data = {},
      finalCompositionDefinitiveDate,
      finalCompositionIsDefinitive,
      finalCompositionPendingDeadlineLabel,
      finalRowsCount,
      formatDeadlineTime,
      livePalmesAdminDiagnostics = {},
      livePalmesAdminResults = {},
      raceResults = [],
      resultForProgramRow,
      resultPhaseLabelForProgramRow,
      resultStatusBadgeForProgramRow,
      resultStatusControlHtml,
      resultStatusForProgramRow,
      resultUploadBadgeHtml,
      resultUploadKeyForProgram,
      resultUploadKeyForSessionResults,
      resultUploadStates,
      sessionResultsPdfsForAdminSession,
      sessionRows,
      sexDisplayLabel,
      state = {},
      programKey
    } = context;

    function renderCompetitionDiagnostic() {
      const sessions = sessionRows();
      const programCount = data.program?.length || 0;
      const resultCount = raceResults.length;
      const publicResultCount = raceResults.filter((result) => !result.hasFinal || result.finalistsAnnouncedAt).length;
      const seriesPdfCount = Array.isArray(data.notes?.publicSeriesPdfs) ? data.notes.publicSeriesPdfs.length : 0;
      const pendingAlerts = alerts.filter((alert) => (
        alert.speakerStatus === "pending" ||
        alert.videoStatus === "pending" ||
        alert.informaticsStatus === "pending" ||
        alert.secretaryStatus === "pending"
      )).length;
      const speakerInfoUpdatedAt = data.notes?.speakerInfoUpdatedAt || "";
      return livePalmesAdminDiagnostics.renderCompetitionDiagnosticHtml({
        pendingAlerts,
        programCount,
        publicResultCount,
        resultCount,
        seriesCount: data.series?.length || 0,
        seriesPdfCount,
        sessionCount: sessions.length || 0,
        speakerInfoUpdatedAt
      });
    }

    function renderComputerFooterPanel() {
      if (!computerFooterPanel) return;
      if (state.role !== "computer") {
        computerFooterPanel.hidden = true;
        computerFooterPanel.innerHTML = "";
        return;
      }
      computerFooterPanel.hidden = false;
      computerFooterPanel.innerHTML = `
        ${renderCompetitionDiagnostic()}
        <div class="results-admin-danger-zone">
          <button class="ghost-button compact danger-button" type="button" data-results-reset>RAZ</button>
        </div>
      `;
    }

    function renderSessionResultsImportRow(activeSession) {
      const published = sessionResultsPdfsForAdminSession(activeSession);
      const latest = published[0];
      const uploadState = resultUploadStates.get(resultUploadKeyForSessionResults(activeSession));
      const blockingUpload = uploadState && uploadState.tone !== "error";
      return livePalmesAdminResults.renderSessionResultsImportRowHtml({
        activeSession,
        blockingUpload,
        latest,
        latestUpdatedLabel: latest?.updatedAt ? new Date(latest.updatedAt).toLocaleString("fr-FR") : "",
        uploadState,
        uploadStateHtml: uploadState ? resultUploadBadgeHtml(uploadState) : ""
      });
    }

    function relatedFinalCompositionResult(row, result) {
      if (result?.hasFinal) return result;
      const isFinalRow = /^finale/i.test(String(row.stage || ""));
      if (!isFinalRow) return null;
      return raceResults.find((item) =>
        item?.hasFinal &&
        item.eventId === row.eventId &&
        item.sex === row.sex &&
        finalRowsCount(item.finalists) > 0
      ) || null;
    }

    function renderResultProgramRow(row) {
      const result = resultForProgramRow(row);
      const finalCompositionResult = relatedFinalCompositionResult(row, result);
      const uploadState = resultUploadStates.get(resultUploadKeyForProgram(row));
      const blockingUpload = uploadState && uploadState.tone !== "error";
      const status = resultStatusForProgramRow(row);
      const event = data.events.find((item) => item.id === row.eventId);
      const phaseLabel = resultPhaseLabelForProgramRow(row);
      const finalistCount = finalRowsCount(finalCompositionResult?.finalists);
      const isFinalCompositionDefinitive = finalCompositionIsDefinitive(result);
      const definitiveDate = result?.hasFinal && !isFinalCompositionDefinitive
        ? finalCompositionDefinitiveDate(result)
        : null;
      const statusBadge = resultStatusBadgeForProgramRow(row, result, isFinalCompositionDefinitive);
      const definitiveLabel = result?.hasFinal && !isFinalCompositionDefinitive
        ? (definitiveDate ? `D\u00e9finitif \u00e0 partir de ${formatDeadlineTime(definitiveDate)}` : finalCompositionPendingDeadlineLabel(result))
        : "";
      return livePalmesAdminResults.renderResultProgramRowHtml({
        blockingUpload,
        definitiveLabel,
        eventLabel: event?.label || row.label || row.eventId,
        finalCompositionResultId: finalCompositionResult && finalCompositionResult.id !== result?.id ? finalCompositionResult.id : "",
        finalistCount,
        hasFinal: Boolean(result?.hasFinal),
        phaseLabel,
        programKeyValue: programKey(row),
        result,
        resultId: result?.id || "",
        row,
        sexLabel: sexDisplayLabel(row.sex),
        status,
        statusControlHtml: resultStatusControlHtml(row, result, statusBadge),
        uploadState,
        uploadStateHtml: uploadState ? resultUploadBadgeHtml(uploadState) : ""
      });
    }

    return {
      renderCompetitionDiagnostic,
      renderComputerFooterPanel,
      renderResultProgramRow,
      renderSessionResultsImportRow
    };
  }

  global.LivePalmesResultsAdminPanelView = { create };
})(window);
