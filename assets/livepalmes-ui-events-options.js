(function attachLivePalmesUiEventsOptions(global) {
  const functionKeys = [
    "acquireRoleLock", "applyProgramRow", "askRolePin", "availableSeriesNumbers",
    "cancelDecision", "cleanLegacyResultPdfs", "clearPublishedResults", "clearPublishedResultsForSession", "clearTechnicalLog",
    "clearResultUploadState", "clearSearch", "clearSeriesImportState", "closeAdminSeriesModal",
    "closeAlertDetail", "closeDecisionModal", "closeProgramModal", "closeResultImportModal",
    "closeRoleCodesModal", "competitionModeEnabled", "createDecisionAlert", "currentClientId", "currentRolePins",
    "decisionDraftIsReady", "defaultDecisionDetail", "deleteResultPdf", "dismissLiveAlert",
    "downloadAdminBackup", "downloadJson", "ensureResultsAdminSession", "eventLabel", "exportDsqPdf",
    "finalProgramRowsForRace", "finalRowKey", "finalRowsCount", "finishRolePin",
    "firstSeriesSelectionForCurrentRace", "goToNextProgramRace", "goToPreviousProgramRace",
    "importSeriesPdf", "isFinalStage", "archiveCurrentResults", "markFinalistWithdrawn", "markSpeakerAlertDoneLocally",
    "openAdminSeriesModal", "openAlertDetail", "openDecisionModal", "openDsqRows",
    "openFinalCompositionModal", "openFinalCompositionResultModal", "openFinalWithdrawalsModal",
    "openFinalistsAnnouncementModal", "openProgramModal", "openResultArchiveRows", "openResultDetailsModal", "openResultImportModal",
    "openSessionResultsImportModal", "performResetHistoryWithArchive", "programKey", "programRowFromRaceOption",
    "programRows", "publishFinalistsAfterSpeaker", "publishPublicResultsIndex", "publishReplacementAfterSpeaker",
    "publishResultPdf", "publishSessionResultsPdf", "recordKey", "refreshFirebaseOnce",
    "refreshPresenceCounts", "reinstateFinalist", "releaseConsolePresence", "render",
    "renderDataStatus", "renderDecisionModal", "renderEntrants", "renderHeaderReferences",
    "renderHistoryArchivesModal", "renderPublicSessionInfosModal", "renderResetResultsModal",
    "renderResultsAdminPanel", "renderRoleCodesModal", "renderRoleHistory", "renderRolePanels",
    "renderSpeakerHistory", "requestRoleAccess", "rereadPublishedResult", "resetHistory",
    "resetSeriesForNextCompetition", "restoreAdminBackupFile", "restoreAlertLocally", "resultForProgramRow", "resultPhaseLabelForProgramRow",
    "resultProgramRows", "resultSessions", "resultUploadKeyForProgram", "resultUploadKeyForSessionResults",
    "saveActiveView", "saveRoleCodesFromModal", "saveUnlockedRoles", "selectRecordForCategory", "selectedEntrant",
    "setPublicPositionEnabled", "setRefereeProgressHere", "setResultUploadState", "setSeriesImportState",
    "sexDisplayLabel", "showPerformanceDiagnosticModal", "showTechnicalDiagnosticModal", "showTechnicalLogModal", "showToast",
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
