(function attachLivePalmesFinalWithdrawalsOptions(global) {
  const functionKeys = [
    "canWithdrawBeforeReplacementAnnouncement", "canWithdrawFinalist", "escapeHtml",
    "finalRowCountsAsFinalist", "finalWithdrawalLimitDate", "finalWithdrawalLimitLabel",
    "formatDeadlineTime", "hasFinalWithdrawalDeadline", "isFinalWithdrawalDeadlineExpired",
    "markAlertAlreadyClosedError", "markSpeakerAlertDoneLocally", "normalizePersonName",
    "publishPublicResultsIndex", "render", "replacementAlertMatches", "resultParserFunction",
    "resultParserOptions", "saveAlerts", "sexDisplayLabel", "syncAlertChangesToFirestoreStrict",
    "syncAlertToFirestore"
  ];

  function create(context = {}) {
    const source = context.source || global;
    const options = {
      ...(context.dom || {}),
      ...(context.modules || {}),
      alerts: context.alerts,
      raceResults: context.raceResults,
      resultsCollection: context.resultsCollection
    };
    functionKeys.forEach((key) => {
      if (typeof source[key] !== "undefined") options[key] = source[key];
    });
    return options;
  }

  global.LivePalmesFinalWithdrawalsOptions = { create, functionKeys: [...functionKeys] };
})(window);
