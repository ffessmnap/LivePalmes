(function attachLivePalmesSwimmerPerformances(global) {
  function build(options = {}) {
    const {
      escapeHtml,
      finalStageLabel,
      formatPersonNameParts,
      formatRank,
      isFinalStage,
      isSpeakerView,
      livePalmesResults,
      normalizePersonName,
      raceResults,
      recordEventMatches
    } = options;

    const resultHelpers = livePalmesResults || global.LivePalmesResults || {};
    const matchOptions = {
      formatPersonNameParts,
      normalizePersonName,
      recordEventMatches
    };

    function entrantPerformanceNameKey(row) {
      return resultHelpers.entrantPerformanceNameKey(row, {
        formatPersonNameParts,
        normalizePersonName
      });
    }

    function performanceBirthYear(row) {
      return resultHelpers.performanceBirthYear(row);
    }

    function performanceMatchesEntrant(performance, entrant) {
      return resultHelpers.performanceMatchesEntrant(performance, entrant, matchOptions);
    }

    function performanceStatusResultLabel(performance) {
      return resultHelpers.performanceStatusResultLabel(performance);
    }

    function performanceDisplayValue(performance) {
      return resultHelpers.performanceDisplayValue(performance);
    }

    function resultRankForPerformance(performance, result) {
      return resultHelpers.resultRankForPerformance(performance, result, matchOptions);
    }

    function performanceRankLabel(performance) {
      return resultHelpers.performanceRankLabel(performance, { formatRank });
    }

    function swimmerBestPerformanceForEntry(entry) {
      return resultHelpers.swimmerBestPerformanceForEntry(entry, raceResults, {
        ...matchOptions,
        isFinalStage
      });
    }

    function compactProgramPerformanceLabel(entry) {
      return resultHelpers.compactProgramPerformanceLabel(entry, raceResults, {
        ...matchOptions,
        escapeHtml,
        finalStageLabel,
        formatRank,
        isFinalStage,
        isSpeakerView
      });
    }

    return {
      compactProgramPerformanceLabel,
      entrantPerformanceNameKey,
      performanceBirthYear,
      performanceDisplayValue,
      performanceMatchesEntrant,
      performanceRankLabel,
      performanceStatusResultLabel,
      resultRankForPerformance,
      swimmerBestPerformanceForEntry
    };
  }

  global.LivePalmesSwimmerPerformances = { build };
})(window);
