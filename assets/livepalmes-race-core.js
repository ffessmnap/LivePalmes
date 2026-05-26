(function attachLivePalmesRaceCore(global) {
  function isFinalStage(stage) {
    return String(stage || "").startsWith("finale");
  }

  function finalStageLabel(stage) {
    const letter = String(stage || "").split("-")[1]?.toUpperCase();
    return letter ? `Finale ${letter}` : "Finale";
  }

  function raceOptionKey(eventId, sex) {
    return `${eventId || ""}|${sex || ""}`;
  }

  function programKey(row = {}) {
    return [row.order, row.session || "", row.eventId, row.sex, row.stage || "series"].join("|");
  }

  global.LivePalmesRaceCore = {
    finalStageLabel,
    isFinalStage,
    programKey,
    raceOptionKey
  };
})(window);
