(function attachLivePalmesSeriesControls(global) {
  function seriesChipIsRefereeProgress(row, series, stage, context = {}) {
    const progress = context.refereeProgress?.();
    if (!row || !progress?.programKey) return false;
    return String(progress.programKey) === String(context.programKey?.(row)) &&
      String(progress.stage || "series") === String(stage || "series") &&
      String(progress.series || "") === String(series || "");
  }

  function setSeriesNavigation(previousDisabled, previousLabel, nextDisabled, nextLabel, context = {}) {
    [context.previousSeriesBtn, context.previousSeriesFloatBtn].forEach((button) => {
      if (!button) return;
      button.disabled = previousDisabled;
      button.textContent = "<";
      button.title = previousLabel;
      button.setAttribute("aria-label", previousLabel);
    });
    [context.nextSeriesBtn, context.nextSeriesFloatBtn].forEach((button) => {
      if (!button) return;
      button.disabled = nextDisabled;
      button.textContent = ">";
      button.title = nextLabel;
      button.setAttribute("aria-label", nextLabel);
    });
    if (context.previousSeriesInlineBtn) {
      context.previousSeriesInlineBtn.disabled = previousDisabled;
      context.previousSeriesInlineBtn.textContent = previousLabel;
      context.previousSeriesInlineBtn.title = previousLabel;
      context.previousSeriesInlineBtn.setAttribute("aria-label", previousLabel);
    }
    if (context.nextSeriesInlineBtn) {
      context.nextSeriesInlineBtn.disabled = nextDisabled;
      context.nextSeriesInlineBtn.textContent = nextLabel;
      context.nextSeriesInlineBtn.title = nextLabel;
      context.nextSeriesInlineBtn.setAttribute("aria-label", nextLabel);
    }
  }

  function renderSeriesControls(context = {}) {
    const {
      availableSeriesNumbers,
      data,
      escapeHtml,
      finalProgramRowsForRace,
      finalStageLabel,
      hasNextProgramSeries,
      hasPreviousProgramSeries,
      isFinalStage,
      matchesRace,
      raceSeries,
      selectedProgramRow,
      seriesControls,
      state
    } = context;
    if (!seriesControls || !state) return;
    const numbers = availableSeriesNumbers();
    const finalRows = finalProgramRowsForRace();
    const finalStages = finalRows.map((row) => row.stage);
    if (isFinalStage(state.series) && !finalStages.includes(state.series)) {
      state.series = String(numbers[0] || finalStages[0] || "all");
    }
    if (!isFinalStage(state.series) && state.series !== "all" && !numbers.includes(Number(state.series))) {
      state.series = String(numbers[0] || finalStages[0] || "all");
    }
    if (!numbers.length && finalStages.length && state.series === "all") {
      state.series = finalStages[0];
    } else if (numbers.length && state.series === "all") {
      state.series = String(numbers[0]);
    }
    const preview = raceSeries().some((row) => row.isPreview);
    const programRow = selectedProgramRow();
    if (programRow?.hasEntrants === false) {
      const jaMark = seriesChipIsRefereeProgress(programRow, "", programRow.stage || "final", context)
        ? `<span class="series-ja-marker">JA</span>`
        : "";
      seriesControls.innerHTML = `<span class="no-series-note">${escapeHtml(programRow.startTime ? `Finale - ${programRow.startTime}` : "Finale")}${jaMark}</span>`;
      setSeriesNavigation(
        !hasPreviousProgramSeries(),
        "Course pr\u00e9c\u00e9dente",
        !hasNextProgramSeries(),
        "Course suivante",
        context
      );
      return;
    }
    const controls = [
      ...numbers.map((number) => {
        const time = (data.series || [])
          .filter(matchesRace)
          .filter((row) => !isFinalStage(row.stage))
          .find((row) => Number(row.series) === number)?.startTime || "";
        const jaCurrent = seriesChipIsRefereeProgress(programRow, number, "series", context);
        return `
          <button class="series-chip ${Number(state.series) === number ? "active" : ""} ${jaCurrent ? "ja-current" : ""}" type="button" data-series="${number}">
            <strong>${number}</strong>${time ? `<span>${escapeHtml(time)}</span>` : ""}${jaCurrent ? `<em>JA</em>` : ""}
          </button>
        `;
      }),
      ...finalRows.map((row) => {
        const jaCurrent = seriesChipIsRefereeProgress(row, "", row.stage, context);
        return `
          <button class="series-chip final-chip ${state.series === row.stage ? "active" : ""} ${jaCurrent ? "ja-current" : ""}" type="button" data-series="${escapeHtml(row.stage)}">
            <strong>${escapeHtml(finalStageLabel(row.stage))}</strong>${row.startTime ? `<span>${escapeHtml(row.startTime)}</span>` : ""}${jaCurrent ? `<em>JA</em>` : ""}
          </button>
        `;
      })
    ];
    seriesControls.innerHTML = controls.length
      ? controls.join("")
      : `<span class="no-series-note">Aucune s\u00e9rie disponible</span>`;
    const atLastCurrentRace = isFinalStage(state.series)
      ? finalStages.indexOf(state.series) >= finalStages.length - 1
      : state.series !== "all" && Number(state.series) >= numbers[numbers.length - 1];
    const atFirstCurrentRace = isFinalStage(state.series)
      ? !numbers.length && finalStages.indexOf(state.series) <= 0
      : Number(state.series) <= numbers[0];
    setSeriesNavigation(
      atFirstCurrentRace && !hasPreviousProgramSeries(),
      atFirstCurrentRace ? "Course pr\u00e9c\u00e9dente" : "S\u00e9rie pr\u00e9c\u00e9dente",
      (!numbers.length && !finalStages.length) || (atLastCurrentRace && !hasNextProgramSeries()),
      atLastCurrentRace ? "Course suivante" : "S\u00e9rie suivante",
      context
    );
    seriesControls.title = preview ? "Aper\u00e7u g\u00e9n\u00e9r\u00e9 automatiquement en attendant le fichier officiel des s\u00e9ries" : "";
  }

  global.LivePalmesSeriesControls = {
    renderSeriesControls,
    seriesChipIsRefereeProgress,
    setSeriesNavigation
  };
})(window);
