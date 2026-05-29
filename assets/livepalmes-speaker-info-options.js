(function attachLivePalmesSpeakerInfoOptions(global) {
  const functionKeys = [
    "appendImportHistory", "applyFreshData", "categoryLabel", "eventSignature",
    "fixPdfEncoding", "formatPersonNameParts", "importedEventId", "importedSeriesTime",
    "normalizeClubMatch", "normalizeData", "normalizePdfLabel", "normalizePersonName",
    "ensureConsoleWriteAccess", "publishLiveDataToFirestore", "renderDataStatus", "sameCategory", "seedSourceLookupKeys",
    "shouldKeepRecord", "timeToMs"
  ];
  const stateKeys = ["data"];

  function create(context = {}) {
    const source = context.source || global;
    const options = {
      document: context.document || global.document,
      livePalmesSpeakerInfo: context.livePalmesSpeakerInfo,
      SPEAKER_INFO_SHEETS: context.SPEAKER_INFO_SHEETS,
      SPEAKER_SHEET_ID: context.SPEAKER_SHEET_ID,
      window: context.window || global
    };
    functionKeys.forEach((key) => {
      if (typeof source[key] !== "undefined") options[key] = source[key];
    });
    if (typeof context.bindOptionState === "function") context.bindOptionState(options, stateKeys);
    return options;
  }

  global.LivePalmesSpeakerInfoOptions = { create, functionKeys: [...functionKeys], stateKeys: [...stateKeys] };
})(window);
