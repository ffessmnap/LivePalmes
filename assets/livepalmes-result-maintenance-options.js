(function attachLivePalmesResultMaintenanceOptions(global) {
  const functionKeys = [
    "appendImportHistory", "archiveCurrentResults", "clearPublicSessionResultsPdfs",
    "clearPublicSessionResultsPdfsForSession", "clearPublicSeriesPdfs", "competitionModeEnabled",
    "deleteFinalResultAlerts", "deleteResultPdfPayload", "normalizeData", "publishLiveDataToFirestore",
    "publishPublicResultsIndex", "render", "renderResultsAdminPanel", "resultWithoutPdf",
    "saveData"
  ];
  const stateKeys = ["data", "raceResults", "resultsAdminSession", "state"];

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
