(function attachLivePalmesDecisionOptions(global) {
  const functionKeys = [
    "activeDsqAlertsForEntrant", "activeLineAlertsForEntrant", "alertCommentLabel", "alertDetailLabel",
    "alertIdentityLabel", "alertLineCode", "alertRaceLabel", "alertSwimmerLabel",
    "alertStatusLabel", "categoryLabel", "closeAlertDetail", "currentEvent",
    "currentRoleAlertFilter", "currentSeriesRows", "decisionMotifLabel", "entrantKey",
    "finalStageLabel", "formatAlertTime", "formatDisplayName", "isDsqAlert",
    "isFinalStage", "isRequalificationAlert", "isRelayEntrant", "isSpeakerView",
    "markAlertAlreadyClosedError", "openAlertDetail", "raceEntrants", "render",
    "renderEntrants", "renderDecisionModal", "saveAlerts", "sexDisplayLabel",
    "shortClubName", "syncAlertChangesToFirestore", "syncAlertChangesToFirestoreStrict",
    "syncAlertToFirestore", "syncAlertToFirestoreStrict"
  ];

  const stateKeys = ["alerts", "decisionDraft", "state"];

  function create(context = {}) {
    const source = context.source || global;
    const options = {
      ...(context.dom || {}),
      ...(context.modules || {}),
      DECISION_LABELS: context.DECISION_LABELS,
      alerts: context.alerts,
      data: context.data,
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

  global.LivePalmesDecisionOptions = { create, functionKeys: [...functionKeys], stateKeys: [...stateKeys] };
})(window);
