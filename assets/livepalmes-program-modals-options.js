(function attachLivePalmesProgramModalsOptions(global) {
  const functionKeys = [
    "compactRaceTitle", "currentRefereeProgressPayload", "finalStageLabel", "hasRowsForProgram",
    "isFinalStage", "isLastProgramPartForRace", "isSplitRaceAcrossSessions", "normalizeData",
    "programKey", "raceOptionKey", "refereeProgress", "refereeProgressLabel",
    "render", "resultForProgramRow", "resultPhaseLabelForProgramRow", "resultSessions",
    "sexDisplayLabel", "splitRaceNote", "updateLiveNotes"
  ];
  const stateKeys = ["currentResultImportRow", "currentSessionResultsImport", "data", "resultsAdminSession", "state"];

  function create(context = {}) {
    const source = context.source || global;
    const options = {
      ...(context.dom || {}),
      ...(context.modules || {}),
      data: context.data,
      roleStates: context.roleStates,
      state: context.state
    };
    functionKeys.forEach((key) => {
      if (typeof source[key] !== "undefined") options[key] = source[key];
    });
    if (typeof context.bindOptionState === "function") context.bindOptionState(options, stateKeys);
    return options;
  }

  global.LivePalmesProgramModalsOptions = { create, functionKeys: [...functionKeys], stateKeys: [...stateKeys] };
})(window);
