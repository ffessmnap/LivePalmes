(function attachLivePalmesAppMethodBindings(global) {
  const bindings = [
    {
      target: "livePalmesRoleSessionWorkflow",
      methods: [
      "createRoleState", "cloneRoleState", "defaultRoleStates", "normalizeRoleState",
      "loadRoleStates", "saveRoleStates", "loadUnlockedRoles", "saveUnlockedRoles",
      "pinLockEnabled", "competitionModeEnabled", "realtimeSyncEnabled", "publicPositionEnabled",
      "currentRolePins", "knownRole", "lastActivityTimestamp", "saveLastActivityTimestamp",
      "shouldReturnHomeForInactivity", "loadActiveView", "saveActiveView", "unlockRole",
      "roleIsUnlocked", "requestRoleAccess", "saveCurrentRoleState", "currentClientId",
      "protectedRole", "roleConnectionLimit", "switchRoleUnlocked", "switchRole",
      "initializeRoleSession"
    ],
    },
    {
      target: "livePalmesAppStorageWorkflow",
      methods: [
      "loadData", "loadAlerts", "saveAlerts", "normalizeData",
      "saveData"
    ],
    },
    {
      target: "livePalmesPublicProgressWorkflow",
      methods: [
      "emptyPresenceCounts", "presenceLabel", "renderPresenceCounts", "refereeProgress",
      "progressProgramRow", "refereeProgressLabel", "refereeProgressShortLabel", "currentRefereeProgressPayload",
      "sameRefereeProgress", "currentRefereeProgressIsHere", "currentPublicProgressPayload", "programRowForRoleState",
      "publicProgressPayloadFromState", "publicProgressSignature", "publishPublicProgressIfNeeded", "setPublicPositionEnabled",
      "homeActionCounts", "actionCountLabel", "renderHomeActionCounts", "updateStickyAlertOffset"
    ],
    },
    {
      target: "livePalmesConsoleSync",
      methods: [
      "updateConsolePresence", "releaseConsolePresence", "refreshPresenceCounts", "sanitizeAlertForFirestore",
      "syncAlertToFirestore", "syncAlertToFirestoreStrict", "syncAlertChangesToFirestore", "syncAlertChangesToFirestoreStrict",
      "markAlertAlreadyClosedError", "showToast", "isFinalResultAlert", "deleteFinalResultAlerts",
      "cleanupOrphanFinalResultAlerts", "cleanupResolvedSpeakerResultAlerts", "clearFirestoreAlerts", "deleteCollectionDocuments",
      "publishLiveDataToFirestore", "publishLiveDataToCompetition", "updateLiveNotes", "lockExpired",
      "lockLastActivityTime", "lockLooksAbandoned", "releaseRoleLock", "acquireRoleLock",
      "heartbeatRoleLock", "mergeRemoteLiveData", "applyRemoteLiveData"
    ],
    },
    {
      target: "livePalmesAdminActions",
      methods: [
      "renderRoleCodesModal", "renderRoleCodesAdminModal", "renderResetHistoryModal", "renderResetResultsModal",
      "renderPublicSessionInfosModal", "renderHistoryArchivesModal", "renderRolePinModal", "askRolePin",
      "finishRolePin", "closeRoleCodesModal", "readRolePinsFromModal", "saveRoleCodesFromModal",
      "ensureComputerWriteAccess", "ensureConsoleWriteAccess", "toggleRoleLock", "downloadAdminBackup", "restoreAdminBackupFile",
      "toggleCompetitionMode"
    ],
    },
    {
      target: "livePalmesRealtimeSync",
      methods: [
      "endCompetitionSession", "markConsoleActivity", "returnHomeAfterLocalInactivity", "disableCompetitionModeAfterInactivity",
      "stopFirebaseRealtimeSync", "applyResultsSnapshot", "startCompetitionSync", "refreshFirebaseOnce",
      "initFirebaseSync", "checkFirebaseConnection"
    ],
    },
    {
      target: "livePalmesHistoryActions",
      methods: [
      "loadLiveDismissedAlerts", "saveLiveDismissedAlerts", "archiveCurrentHistory", "archiveCurrentResults",
      "resetHistory", "performResetHistoryWithArchive", "clearHistoryAndAlertsForFullImport", "dismissLiveAlert"
    ],
    },
    {
      target: "livePalmesResults",
      methods: [
      "resultWithoutPdf", "resultMetadataPayload"
    ],
    },
    {
      target: "livePalmesDiagnostics",
      methods: [
      "dataUrlApproxBytes", "formatByteSize", "performanceDiagnosticLines"
    ],
    },
    {
      target: "livePalmesEntrantHelpers",
      methods: [
      "formatName", "formatDisplayName", "formatSeriesDisplayName", "clearSearch",
      "isSpeakerView", "shortClubName", "entrantPersonKey"
    ],
    },
    {
      target: "livePalmesProgramNavigation",
      methods: [
      "currentEvent", "matchesRace", "comparableEventId", "eventSignature",
      "recordEventMatches", "recordMatchesRace", "isFinalStage", "finalStageLabel",
      "isFemaleContext", "sexDisplayLabel", "categoryLabel", "entrantWord",
      "swimmerWord", "displayedWord", "availableSexesForEvent", "raceEntrants",
      "raceEntrantsForStats", "updateEventSelect", "raceOptionKey", "raceProgramRowsForOption",
      "seriesNumbersForRaceOption", "finalRowsForRaceOption", "raceOptionPhaseLabel", "programRowFromRaceOption",
      "programKey", "programLabel", "selectedProgramRow", "applyProgramRow",
      "sessionRows", "firstSessionNumber", "preferredInitialSession", "firstProgramRowForSession",
      "firstSeriesForRace", "initialProgramPosition", "normalizeLivePosition", "programRowsForSession",
      "programRows", "currentProgramIndex", "isLastRaceOfCurrentSession", "isLastSeriesOfCurrentSession",
      "isSplitRaceAcrossSessions", "shouldShowSplitRaceNote", "splitRaceNote", "raceSeries",
      "raceSeriesFor", "availableSeriesNumbers", "selectedSeriesTime", "selectedSeriesLabel",
      "compactRaceTitle", "hasNextProgramSeries", "hasPreviousProgramSeries", "goToNextProgramRace",
      "goToPreviousProgramRace", "currentSeriesRows", "hasRowsForProgram", "programRowsForCurrentRace",
      "finalProgramRowsForRace", "firstSeriesSelectionForCurrentRace", "lastSeriesSelectionForCurrentRace"
    ],
      optionFactory: "programNavigationOptions"
    },
    {
      target: "livePalmesConsoleRenderWorkflow",
      methods: [
      "render", "syncProgramButtonPlacement", "syncLineOrderButtonPlacement", "renderSessionControls"
    ],
    },
    {
      target: "livePalmesAlertPresenter",
      methods: [
      "currentRoleAlertFilter", "speakerAlertAlreadyResolvedByResult", "isRequalificationAlert", "alertRaceLabel",
      "alertSwimmerLabel", "alertIdentityLabel", "fullAlertIdentityLabel", "alertClubShortLabel",
      "alertDetailLabel", "alertCommentLabel", "decisionMotifLabel", "speakerAlertSentence",
      "isDsqAlert", "activeDsqAlertsForEntrant", "activeLineAlertsForEntrant", "alertLineCode",
      "renderLineAlertBadges", "terminalLineStatus", "importedLineStatusLabel", "renderImportedLineStatusBadge",
      "renderLineTimeStatus", "finalistRowName", "finalRowsForAnnouncementAlert", "renderFinalistsAlertList",
      "alertPriority", "alertPriorityMeta", "compareAlertsForAction", "historySentence",
      "renderAlertCard", "renderVideoInfoCard", "renderRolePanels"
    ],
    },
    {
      target: "livePalmesResultsAccess",
      methods: [
      "resultIdForProgramRow", "resultForProgramRow", "resultPdfPayload", "publicResultPayload",
      "buildPublicResultsIndex", "publishPublicResultsIndex", "isLastProgramPartForRace", "resultSessions",
      "latestResultSession", "resultProgramRows", "resultPhaseLabelForProgramRow"
    ],
    },
    {
      target: "livePalmesResultsAdminWorkflow",
      methods: [
      "publicSeriesPdfId", "updatePublicSeriesPdfMetadata",
      "clearPublicSeriesPdfMetadata", "hydratePublicSeriesPdfMetadataIfNeeded", "clearPublicSeriesPdfs", "clearPublicSessionResultsPdfMetadata",
      "clearPublicSessionResultsPdfs", "clearPublicSessionResultsPdfsForSession", "publishPublicSeriesPdf", "sessionResultsPdfId",
      "updatePublicSessionResultsPdfMetadata", "hydratePublicSessionResultsPdfMetadataIfNeeded", "publishSessionResultsPdf",
      "sessionResultsPdfsForAdminSession", "ensureResultsAdminSession",
      "resultStatusForProgramRow", "resultStatusBadgeForProgramRow",
      "resultStatusControlHtml", "resultUploadKeyForProgram", "resultUploadKeyForSessionResults", "setResultUploadState",
      "clearResultUploadState", "setSeriesImportState", "clearSeriesImportState", "resultUploadBadgeHtml",
      "renderResultsAdminPanel", "renderCompetitionDiagnostic", "renderComputerFooterPanel", "renderSessionResultsImportRow",
      "renderResultProgramRow"
    ],
      optionFactory: "resultsAdminWorkflowOptions"
    },
    {
      target: "livePalmesHistoryPresenter",
      methods: [
      "renderOfficialAlerts", "formatAlertTime", "formatAlertDateTime", "alertStatusLabel",
      "alertStatusClass", "alertTimeline", "alertTimelineItems", "renderHistoryItem",
      "openAlertDetail", "closeAlertDetail", "openFinalistsAnnouncementModal", "historyActionForAlert",
      "historyFilterKey", "historyFilterValue", "historyAlertMatchesFilter", "filteredHistoryRows",
      "historyFilterControl", "historyEmptyLabel", "renderSpeakerHistory", "renderRoleHistory",
      "historyToggleButton"
    ],
    },
    {
      target: "livePalmesDecisionWorkflow",
      methods: [
      "selectedEntrant", "entrantSeriesRow", "relayLegCount", "decisionOptionsForEntrant",
      "renderDecisionPanel", "createDecisionDraft", "openDecisionModal", "closeDecisionModal",
      "decisionNeedsDetail", "decisionNeedsRelayLeg", "decisionNeedsLengthPosition", "decisionDraftIsReady",
      "defaultDecisionDetail", "renderDecisionModal", "decisionRoute", "createDecisionAlert",
      "renderRoleQueue", "updateAlert", "markSpeakerAlertDoneLocally", "restoreAlertLocally",
      "cloneAlertForCancellation", "cancelDecision"
    ],
    },
    {
      target: "livePalmesDiagnosticsWorkflow",
      methods: [
      "renderDataStatus", "firebaseStatusMeta", "renderFirebaseHeaderStatus", "shortStatusDate",
      "appendImportHistory", "countCollectionDocuments", "collectPerformanceDiagnostic", "renderPerformanceDiagnosticModal",
      "showPerformanceDiagnosticModal", "safeCountCollection", "safeDocumentData", "alertPendingTargets",
      "alertPendingBreakdown", "alertTargetsLabel", "collectTechnicalDiagnostic", "resultHasDetailsForDiagnostic",
      "renderTechnicalDiagnosticModal", "showTechnicalDiagnosticModal", "cleanLegacyResultPdfs",
      "showTechnicalLogModal", "clearTechnicalLog", "showDataDiagnostic"
    ],
      optionFactory: "diagnosticsWorkflowOptions"
    },
    {
      target: "livePalmesProgramModals",
      methods: [
      "renderProgramButtons", "programSeriesItems", "programItemMatchesState", "programItemIsCurrent",
      "programItemIsSpeakerCurrent", "programProgressValue", "compareProgramProgressValues", "progressValueFromMarker",
      "programItemProgressClass", "programRowProgressClass", "speakerProgramPositionLabel", "renderProgramModal",
      "openProgramModal", "closeProgramModal", "setRefereeProgressHere", "openAdminSeriesModal",
      "closeAdminSeriesModal", "openResultImportModal", "openSessionResultsImportModal", "closeResultImportModal"
    ],
    },
    {
      target: "livePalmesResultPublicationWorkflow",
      methods: [
      "fileToDataUrl", "loadResultPdfData", "resultPdfDataUrl", "saveResultPdfPayload",
      "deleteResultPdfPayload", "migrateResultPdfsOutOfResults", "dataUrlToFile", "resultParserOptions",
      "resultParserFunction", "normalizeResultLineText", "parseResultRow", "parseUnrankedResultRow",
      "resultStatusFromText", "parseResultStatusRow", "resultImportRowKey", "parseFinalistsFromResultLines",
      "emptyParsedFinals", "resolveParsedFinals", "shouldPreserveFinalistsOnReread", "buildPublishedResult",
      "finalRowCountsAsFinalist", "finalRowsCount", "performanceStageForResultRow", "resultPerformanceDuplicateKey",
      "resultPerformanceRows", "publishResultPdf", "rereadPublishedResult", "createFinalistsSpeakerAlert",
      "stampFinalistsAnnouncement", "ensurePendingFinalistsSpeakerAlerts", "replacementAlertMatches", "replacementAlertKey",
      "dedupePendingReplacementAlerts", "ensurePendingReplacementSpeakerAlerts", "publishFinalistsAfterSpeaker"
    ],
    },
    {
      target: "livePalmesFinalWithdrawalsWorkflow",
      methods: [
      "finalRowKey", "finalRowOrderValue", "sortedFinalRows", "normalizeFinalistsOrder",
      "activeFinalPreWithdrawals", "finalPreWithdrawalForRow", "isFinalPreWithdrawn", "availableReplacementForResult",
      "buildReplacementFinalistRow", "buildFinalWithdrawalEntry", "addReplacementChain", "finalistRowsWithFinalKey",
      "finalistRowsMatch", "findPreservedFinalistRow", "finalistPositionByRow", "applyPreservedReplacementAnnouncement",
      "rebuildFinalistsFromParsedResult", "firstActiveFinalistIndex", "finalCompositionRows", "finalCompositionKey",
      "finalCompositionIsDefinitive", "finalCompositionDefinitiveDate", "finalCompositionPendingDeadlineLabel", "renderFinalWithdrawalGroup",
      "finalRowIndexByKey", "nextUnqualifiedRowsForSecretary", "renderSecretaryUnqualifiedGroup", "openFinalWithdrawalsModal",
      "toggleFinalPreWithdrawal", "renderFinalCompositionList", "openFinalCompositionResultModal", "openFinalCompositionModal", "openResultDetailsModal",
      "markFinalistWithdrawn", "reinstateFinalist", "createFinalistReplacementSpeakerAlert", "cancelPendingReplacementSpeakerAlert",
      "updateReplacementRowAnnouncement", "stampReplacementAnnouncement", "publishReplacementAfterSpeaker"
    ],
      optionFactory: "finalWithdrawalsWorkflowOptions"
    },
    {
      target: "livePalmesResultMaintenanceWorkflow",
      methods: [
      "deleteResultPdf", "clearPublishedResults", "clearPublishedResultsForSession", "resetSeriesForNextCompetition"
    ],
    },
    {
      target: "livePalmesSwimmerPanel",
      methods: [
      "renderCategorySelect", "renderHeader", "renderRefereeProgressControl", "headerReferenceChipsHtml",
      "selectedHeaderReferenceDetailsHtml", "renderHeaderReferences", "renderHeaderRefDetails", "recordKey",
      "renderEntrants", "getEntrantReference", "recordTargetsForEntrant", "renderRecordGapAlert",
      "renderEdfBadges", "renderCompetitionStatBadges", "renderNonSelectableBadge", "findEdfMemberships",
      "findCompetitionStatsForEntrant", "normalizeClubMatch", "findSwimmerInfosForEntrant", "findInternationalMedals",
      "findInternationalMedalsForRace", "shortChampionshipLabel", "findRecordByTime", "isRelayEntrant",
      "isNationalTeamRelayRecord", "shouldKeepRecord", "isBestClubRelayEntry", "findRelayClubRecords",
      "findRecordsHeldByEntrant", "findAllRecordsHeldByEntrant", "sameTime", "isQualificationEligible",
      "findTop2025ForEntrant", "entrantPerformanceNameKey", "performanceBirthYear", "performanceMatchesEntrant",
      "performanceStatusResultLabel", "performanceDisplayValue", "resultRankForPerformance", "performanceRankLabel",
      "swimmerBestPerformanceForEntry", "compactProgramPerformanceLabel", "selectRecordForCategory", "renderSwimmerDetails",
      "eventOrder", "eventLabel", "shortEventLabel", "findFrance2025Results",
      "medalForRank", "medalClass", "currentRecordRows", "shortRecordLabel",
      "recordFlagText", "renderRecordFlag", "shortCategoryLabel", "renderRecordCategoryFlag",
      "renderTop2025", "recordDescription"
    ],
      optionFactory: "swimmerPanelOptions"
    },
    {
      target: "livePalmesSpeakerInfoWorkflow",
      methods: [
      "speakerInfoOptions", "fetchSpeakerSheetRows", "parseTopSheet", "parseRecordsSheet",
      "parseEdfSheet", "parseCompetitionStatsSheet", "parseInternationalSheet", "parseQualificationsSheet",
      "parseClubSheet", "parseSwimmerInfosSheet", "parseSeedSourceSheet", "sheetSex",
      "seedSourceTimeKey", "applySpeakerInfoToEntrants", "updateSpeakerInfoFromGoogleSheet"
    ],
    },
    {
      target: "livePalmesExportReportsWorkflow",
      methods: [
      "downloadJson", "dsqReportRows", "buildDsqReportHtml", "buildDsqReportHtmlFromRows",
      "printDsqRows", "openDsqRows", "buildResultArchiveHtmlFromRows", "printResultArchiveRows",
      "openResultArchiveRows", "exportDsqPdf", "escapeHtml"
    ],
    },
    {
      target: "livePalmesSeriesImportWorkflow",
      methods: [
      "normalizePdfLabel", "fixPdfEncoding", "importedEventId", "importedEventInfo",
      "importedCategoryLabel", "importedBirthYear", "normalizePdfUppercaseEToken", "splitImportedPersonName",
      "isImportedRelayEvent", "seriesImportOptions", "extractPdfLines", "parseImportedSeriesLines",
      "showPdfImportDebug", "prepareImportedSeriesForMode", "seedSourceLookupKeys", "inheritImportedSeedSources",
      "mergeImportedSeriesData", "importSeriesPdf"
    ],
    },
    {
      target: "livePalmesAppLifecycle",
      methods: [
      "fetchGeneratedData", "applyFreshData", "checkForGeneratedUpdates"
    ],
    }
  ];

  function bind(context = {}) {
    const targetFactories = context.targetFactories || {};
    const optionFactories = context.optionFactories || {};
    const host = context.window || global;
    bindings.forEach((binding) => {
      const targetFactory = targetFactories[binding.target];
      if (typeof targetFactory !== "function") return;
      const optionFactory = binding.optionFactory ? optionFactories[binding.optionFactory] : null;
      binding.methods.forEach((name) => {
        host[name] = (...args) => {
          const target = targetFactory();
          if (typeof target?.[name] !== "function") return undefined;
          const options = optionFactory ? [optionFactory()] : [];
          return target[name](...args, ...options);
        };
      });
    });
  }

  global.LivePalmesAppMethodBindings = { bind };
})(window);
