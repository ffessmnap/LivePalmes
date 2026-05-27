(function attachLivePalmesResultsAdminOptions(global) {
  const functionKeys = [
    "alertPendingBreakdown", "appendImportHistory", "categoryLabel", "clearPublishedResults",
    "competitionModeEnabled", "countCollectionDocuments", "deleteFinalResultAlerts", "deleteResultPdfPayload",
    "emptyPresenceCounts", "escapeHtml", "finalCompositionIsDefinitive", "finalCompositionPendingDeadlineLabel",
    "finalRowsCount", "formatAlertDateTime", "formatByteSize", "formatDeadlineTime",
    "formatRank", "isFinalStage", "normalizeData", "programKey",
    "programRows", "raceOptionKey", "renderDataStatus", "resultHasDetailsForDiagnostic",
    "safeCountCollection", "safeDocumentData", "sessionRows", "sexDisplayLabel",
    "showToast", "updateLiveNotes"
  ];

  const stateKeys = ["resultsAdminSession", "seriesImportState"];

  function create(context = {}) {
    const source = context.source || global;
    const options = {
      ...(context.collections || {}),
      ...(context.modules || {}),
      activeCompetitionId: context.activeCompetitionId,
      alerts: context.alerts,
      data: context.data,
      finalResultSessions: context.finalResultSessions,
      firestoreDb: context.firestoreDb,
      raceResults: context.raceResults,
      resultPdfMigrationRunning: context.resultPdfMigrationRunning,
      resultUploadStates: context.resultUploadStates,
      resultsAdminPanel: context.resultsAdminPanel,
      roleStates: context.roleStates,
      state: context.state
    };
    functionKeys.forEach((key) => {
      if (typeof source[key] !== "undefined") {
        options[key] = source[key];
      }
    });
    if (typeof context.bindOptionState === "function") {
      context.bindOptionState(options, stateKeys);
    }
    return options;
  }

  global.LivePalmesResultsAdminOptions = { create, functionKeys: [...functionKeys], stateKeys: [...stateKeys] };
})(window);
