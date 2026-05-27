(function attachLivePalmesUiEventsOptions(global) {
  const functionKeys = [
    "acquireRoleLock", "applyProgramRow", "askRolePin", "availableSeriesNumbers",
    "cancelDecision", "cleanLegacyResultPdfs", "clearPublishedResults", "clearPublishedResultsForSession",
    "clearResultUploadState", "clearSearch", "clearSeriesImportState", "closeAdminSeriesModal",
    "closeAlertDetail", "closeDecisionModal", "closeProgramModal", "closeResultImportModal",
    "closeRoleCodesModal", "competitionModeEnabled", "createDecisionAlert", "currentRolePins",
    "decisionDraftIsReady", "defaultDecisionDetail", "deleteResultPdf", "dismissLiveAlert",
    "downloadJson", "ensureResultsAdminSession", "eventLabel", "exportDsqPdf",
    "finalProgramRowsForRace", "finalRowKey", "finalRowsCount", "finishRolePin",
    "firstSeriesSelectionForCurrentRace", "goToNextProgramRace", "goToPreviousProgramRace",
    "importSeriesPdf", "isFinalStage", "markFinalistWithdrawn", "markSpeakerAlertDoneLocally",
    "openAdminSeriesModal", "openAlertDetail", "openDecisionModal", "openDsqRows",
    "openFinalCompositionModal", "openFinalCompositionResultModal", "openFinalWithdrawalsModal",
    "openFinalistsAnnouncementModal", "openProgramModal", "openResultArchiveRows", "openResultImportModal",
    "openSessionResultsImportModal", "performResetHistoryWithArchive", "programKey", "programRowFromRaceOption",
    "programRows", "publishFinalistsAfterSpeaker", "publishPublicResultsIndex", "publishReplacementAfterSpeaker",
    "publishResultPdf", "publishSessionResultsPdf", "recordKey", "refreshFirebaseOnce",
    "refreshPresenceCounts", "reinstateFinalist", "releaseConsolePresence", "render",
    "renderDataStatus", "renderDecisionModal", "renderEntrants", "renderHeaderReferences",
    "renderHistoryArchivesModal", "renderPublicSessionInfosModal", "renderResetResultsModal",
    "renderResultsAdminPanel", "renderRoleCodesModal", "renderRoleHistory", "renderRolePanels",
    "renderSpeakerHistory", "requestRoleAccess", "rereadPublishedResult", "resetHistory",
    "resetSeriesForNextCompetition", "restoreAlertLocally", "resultForProgramRow", "resultPhaseLabelForProgramRow",
    "resultProgramRows", "resultSessions", "resultUploadKeyForProgram", "resultUploadKeyForSessionResults",
    "saveRoleCodesFromModal", "saveUnlockedRoles", "selectRecordForCategory", "selectedEntrant",
    "setPublicPositionEnabled", "setRefereeProgressHere", "setResultUploadState", "setSeriesImportState",
    "sexDisplayLabel", "showPerformanceDiagnosticModal", "showTechnicalDiagnosticModal", "showToast",
    "switchRoleUnlocked", "syncAlertChangesToFirestoreStrict", "toggleCompetitionMode", "toggleFinalPreWithdrawal",
    "togglePublicResultsOnline", "unlockRole", "updateAlert", "updateConsolePresence",
    "updateLiveNotes", "updateSpeakerInfoFromGoogleSheet"
  ];

  const stateKeys = [
    "alerts", "data", "decisionDraft", "expandedHistories", "firestoreDb",
    "historyFilters", "currentResultImportRow", "currentSessionResultsImport",
    "raceResults", "state", "unlockedRoles", "profileHomeActive",
    "resultsAdminSession", "secretaryFinalsSession", "isFullscreenMode"
  ];

  function create(context = {}) {
    const source = context.source || global;
    const options = {
      ...(context.appDom || {}),
      ...(context.constants || {}),
      ...(context.helpers || {})
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

  global.LivePalmesUiEventsOptions = { create, functionKeys: [...functionKeys], stateKeys: [...stateKeys] };
})(window);
