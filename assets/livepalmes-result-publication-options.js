(function attachLivePalmesResultPublicationOptions(global) {
  const functionKeys = [
    "buildPublicResultsIndex", "compactRaceTitle", "createFinalistReplacementSpeakerAlert",
    "deleteFinalResultAlerts", "extractPdfLines", "fileToDataUrl", "finalRowKey",
    "finalistRowName", "fixPdfEncoding", "formatDisplayName", "importedBirthYear",
    "importedSeriesTime", "isFinalStage", "markAlertAlreadyClosedError", "markSpeakerAlertDoneLocally",
    "normalizePersonName", "programKey", "publishPublicResultsIndex", "raceOptionKey",
    "rebuildFinalistsFromParsedResult", "render", "renderDataStatus", "resultForProgramRow",
    "resultIdForProgramRow", "resultMetadataPayload", "resultPdfPayload", "resultPhaseLabelForProgramRow",
    "resultWithoutPdf", "saveAlerts", "sexDisplayLabel", "splitImportedPersonName",
    "stampReplacementAnnouncement", "syncAlertChangesToFirestore", "syncAlertChangesToFirestoreStrict",
    "syncAlertToFirestore"
  ];
  const stateKeys = [
    "alerts", "data", "finalistAlertRepairRunning", "raceResults",
    "replacementAlertRepairRunning", "resultPdfMigrationAttempted",
    "resultPdfMigrationRunning", "state"
  ];

  function create(context = {}) {
    const source = context.source || global;
    const options = {
      ...(context.collections || {}),
      data: context.data,
      livePalmesResults: context.livePalmesResults || global.LivePalmesResults,
      window: context.window || global
    };
    functionKeys.forEach((key) => {
      if (typeof source[key] !== "undefined") options[key] = source[key];
    });
    if (typeof context.bindOptionState === "function") context.bindOptionState(options, stateKeys);
    return options;
  }

  global.LivePalmesResultPublicationOptions = { create, functionKeys: [...functionKeys], stateKeys: [...stateKeys] };
})(window);
