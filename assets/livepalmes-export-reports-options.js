(function attachLivePalmesExportReportsOptions(global) {
  const functionKeys = [
    "alertClubShortLabel", "alertStatusLabel", "alertTimelineItems", "archiveCurrentHistory",
    "decisionMotifLabel", "finalRowsCount", "finalStageLabel", "formatAlertDateTime",
    "isFinalStage", "isRequalificationAlert", "sexDisplayLabel"
  ];
  const stateKeys = ["alerts", "data"];

  function create(context = {}) {
    const source = context.source || global;
    const options = {
      livePalmesAdminArchives: context.livePalmesAdminArchives,
      livePalmesExportActions: context.livePalmesExportActions,
      window: context.window || global
    };
    functionKeys.forEach((key) => {
      if (typeof source[key] !== "undefined") options[key] = source[key];
    });
    if (typeof context.bindOptionState === "function") context.bindOptionState(options, stateKeys);
    return options;
  }

  global.LivePalmesExportReportsOptions = { create, functionKeys: [...functionKeys], stateKeys: [...stateKeys] };
})(window);
