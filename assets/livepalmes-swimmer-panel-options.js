(function attachLivePalmesSwimmerPanelOptions(global) {
  const functionKeys = [
    "activeLineAlertsForEntrant", "alertDetailLabel", "availableSeriesNumbers",
    "categoryLabel", "compactRaceTitle", "currentEvent", "currentRefereeProgressIsHere",
    "currentSeriesRows", "displayedWord", "entrantKey", "entrantWord",
    "finalStageLabel", "formatDisplayName", "formatName", "formatSeriesDisplayName",
    "isFemaleContext", "isFinalStage", "isLastSeriesOfCurrentSession", "isLastRaceOfCurrentSession",
    "isSpeakerView", "matchesRace", "programRows", "raceEntrants",
    "raceEntrantsForStats", "recordEventMatches", "recordMatchesRace", "refereeProgress",
    "refereeProgressLabel", "renderLineAlertBadges", "renderLineTimeStatus",
    "selectedProgramRow", "selectedSeriesLabel", "selectedSeriesTime",
    "sexDisplayLabel", "shortClubName", "swimmerWord", "splitRaceNote"
  ];

  function create(context = {}) {
    const source = context.source || global;
    const options = {
      ...(context.dom || {}),
      ...(context.helpers || {}),
      data: context.data,
      raceResults: context.raceResults,
      state: context.state
    };
    functionKeys.forEach((key) => {
      if (typeof source[key] !== "undefined") {
        options[key] = source[key];
      }
    });
    return options;
  }

  global.LivePalmesSwimmerPanelOptions = { create, functionKeys: [...functionKeys] };
})(window);
