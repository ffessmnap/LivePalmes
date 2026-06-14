(function attachLivePalmesResultMaintenanceOptions(global) {
  const functionKeys = [
    "appendImportHistory", "archiveCurrentHistory", "archiveCurrentResults", "clearFirestoreAlerts",
    "clearPublicSessionResultsPdfs", "clearPublicSessionResultsPdfsForSession", "clearPublicSeriesPdfs", "competitionModeEnabled",
    "deleteFinalResultAlerts", "deleteResultPdfPayload", "normalizeData", "publishLiveDataToFirestore",
    "publicResultsIndexDocument", "publishPublicResultsIndex", "render", "renderResultsAdminPanel", "resultWithoutPdf",
    "saveAlerts", "saveData", "saveLiveDismissedAlerts"
  ];
  const stateKeys = ["alerts", "data", "liveDismissedAlertIds", "raceResults", "resultsAdminSession", "state"];

  function create(context = {}) {
    const source = context.source || global;
    const options = {
      livePalmesAdminMaintenance: context.livePalmesAdminMaintenance,
      resultsCollection: context.resultsCollection,
      window: context.window || global
    };
    functionKeys.forEach((key) => {
      if (typeof source[key] !== "undefined") options[key] = source[key];
    });
    if (typeof context.bindOptionState === "function") context.bindOptionState(options, stateKeys);
    return options;
  }

  global.LivePalmesResultMaintenanceOptions = { create, functionKeys: [...functionKeys], stateKeys: [...stateKeys] };
})(window);
