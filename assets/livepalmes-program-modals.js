(function () {
  function init(context = {}) {
    const {
      adminSeriesModal,
      compactRaceTitle,
      currentRefereeProgressPayload,
      finalStageLabel,
      hasRowsForProgram,
      isFinalStage,
      isLastProgramPartForRace,
      isSplitRaceAcrossSessions,
      livePalmesAdminModals,
      livePalmesAdminResults,
      livePalmesProgramView,
      normalizeData,
      programBtn,
      programFloatBtn,
      programKey,
      programModal,
      raceOptionKey,
      refereeProgress,
      refereeProgressLabel,
      render,
      resultForProgramRow,
      resultImportModal,
      resultPhaseLabelForProgramRow,
      resultSessions,
      sexDisplayLabel,
      splitRaceNote,
      updateLiveNotes
    } = context;
    const getData = () => context.data || { events: [], program: [], series: [], notes: {} };
    const getResultsAdminSession = () => context.resultsAdminSession || "";
    const getRoleStates = () => context.roleStates || {};
    const getState = () => context.state || {};
    const setData = (value) => { context.data = value; };

      function renderProgramButtons() {
        if (programBtn) {
          const inlineProgram = ["speaker", "referee", "live"].includes(getState().role);
          programBtn.textContent = inlineProgram ? "Programme" : "P";
          programBtn.title = "Programme";
          programBtn.setAttribute("aria-label", "Programme");
        }
        if (programFloatBtn) {
          programFloatBtn.textContent = "P";
          programFloatBtn.title = "Programme";
          programFloatBtn.setAttribute("aria-label", "Programme");
        }
      }
      
      function programSeriesItems(row) {
        if (!row) return [];
        if (isFinalStage(row.stage) || row.hasEntrants === false) {
          return [{
            series: row.stage || "finale",
            label: row.stage ? finalStageLabel(row.stage) : "Finale",
            time: row.startTime || "",
            stage: row.stage || "finale"
          }];
        }
        const rows = (getData().series || [])
          .filter((seriesRow) => seriesRow.eventId === row.eventId && seriesRow.sex === row.sex)
          .filter((seriesRow) => !row.session || !seriesRow.session || seriesRow.session === row.session)
          .filter((seriesRow) => !isFinalStage(seriesRow.stage))
          .sort((a, b) => Number(a.series || 999) - Number(b.series || 999) || Number(a.line || 99) - Number(b.line || 99));
        const bySeries = new Map();
        rows.forEach((seriesRow) => {
          const key = String(seriesRow.series || "");
          if (!key || bySeries.has(key)) return;
          bySeries.set(key, {
            series: key,
            label: `Série ${key}`,
            time: seriesRow.startTime || "",
            stage: "series"
          });
        });
        return [...bySeries.values()];
      }
      
      function programItemMatchesState(row, item, compareState) {
        return row.eventId === compareState.eventId &&
          row.sex === compareState.sex &&
          (!row.session || compareState.session === "all" || row.session === compareState.session) &&
          (
            (item.stage && isFinalStage(item.stage) && compareState.series === item.stage) ||
            (!isFinalStage(item.stage) && String(compareState.series) === String(item.series))
          );
      }
      
      function programItemIsCurrent(row, item) {
        const state = getState();
        const viewState = ["video", "computer"].includes(state.role) ? (getRoleStates().speaker || state) : state;
        return programItemMatchesState(row, item, viewState);
      }
      
      function programItemIsSpeakerCurrent(row, item) {
        const state = getState();
        if (state.role !== "referee") return false;
        return programItemMatchesState(row, item, getRoleStates().speaker || state);
      }
      
      function programProgressValue(row, item = null) {
        const session = Number(row?.session || 0);
        const order = Number(row?.order || 0);
        const stage = item?.stage || row?.stage || "series";
        const series = isFinalStage(stage)
          ? (String(stage).toUpperCase().includes("B") ? 200 : 100)
          : Number(item?.series || 0);
        return [session, order, series];
      }
      
      function compareProgramProgressValues(a, b) {
        for (let index = 0; index < 3; index += 1) {
          const diff = Number(a[index] || 0) - Number(b[index] || 0);
          if (diff) return diff;
        }
        return 0;
      }
      
      function progressValueFromMarker(progress = refereeProgress()) {
        if (!progress?.programKey) return null;
        const row = (getData().program || []).find((item) => programKey(item) === progress.programKey);
        if (!row) return null;
        return programProgressValue(row, {
          series: progress.series,
          stage: progress.stage || row.stage || "series"
        });
      }
      
      function programItemProgressClass(row, item) {
        const markerValue = progressValueFromMarker();
        if (!markerValue) return "";
        const comparison = compareProgramProgressValues(programProgressValue(row, item), markerValue);
        if (comparison < 0) return "ja-passed";
        if (comparison === 0) return "ja-current";
        return "";
      }
      
      function programRowProgressClass(row) {
        const markerValue = progressValueFromMarker();
        if (!markerValue) return "";
        return compareProgramProgressValues(programProgressValue(row), markerValue) < 0 ? "ja-passed-row" : "";
      }
      
      function speakerProgramPositionLabel() {
        const speakerState = getRoleStates().speaker || getState();
        const event = (getData().events || []).find((item) => item.id === speakerState.eventId);
        const seriesLabel = isFinalStage(speakerState.series)
          ? finalStageLabel(speakerState.series)
          : `Série ${speakerState.series || "-"}`;
        return `Repère speaker : ${speakerState.session && speakerState.session !== "all" ? `S${speakerState.session} - ` : ""}${event?.label || "Course"} ${sexDisplayLabel(speakerState.sex)} - ${seriesLabel}`;
      }
      
      function renderProgramModal() {
        if (!programModal || programModal.hidden) return;
        const state = getState();
        const viewState = ["video", "computer"].includes(state.role) ? (getRoleStates().speaker || state) : state;
        const readOnlyProgram = ["video", "computer"].includes(state.role);
        const compactProgram = false;
        const rows = (getData().program || [])
          .filter((row) => viewState.session === "all" || !row.session || row.session === viewState.session)
          .filter((row) => row.hasEntrants === false || hasRowsForProgram(row))
          .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
        const currentKey = raceOptionKey(viewState.eventId, viewState.sex);
        programModal.innerHTML = livePalmesProgramView.renderProgramModalHtml({
          compactProgram,
          readOnlyProgram,
          rows: rows.map((row) => {
            const event = (getData().events || []).find((item) => item.id === row.eventId);
            const rowKey = raceOptionKey(row.eventId, row.sex);
            return {
              current: rowKey === currentKey && (!row.session || state.session === "all" || row.session === state.session),
              eventLabel: event?.label || row.label || row.eventId,
              items: programSeriesItems(row).map((item) => ({
                ...item,
                current: programItemIsCurrent(row, item),
                progressClass: programItemProgressClass(row, item),
                speakerCurrent: programItemIsSpeakerCurrent(row, item)
              })),
              programKey: programKey(row),
              progressClass: programRowProgressClass(row),
              session: row.session || "",
              sexLabel: sexDisplayLabel(row.sex),
              splitNote: splitRaceNote(row.eventId, row.sex),
              startTime: row.startTime || ""
            };
          }),
          sessionLabel: compactProgram
            ? (viewState.session === "all" ? "Toutes les sessions" : `Session ${viewState.session}`)
            : `${viewState.session === "all" ? "Toutes les sessions" : `Session ${viewState.session}`} - courses, séries et horaires indicatifs.`,
          speakerMarker: state.role === "referee" ? speakerProgramPositionLabel() : ""
        });
      }
      
      function openProgramModal() {
        if (!programModal) return;
        programModal.hidden = false;
        renderProgramModal();
      }
      
      function closeProgramModal() {
        if (!programModal) return;
        programModal.hidden = true;
        programModal.innerHTML = "";
      }
      
      async function setRefereeProgressHere() {
        const state = getState();
        if (state.role !== "referee") return;
        const progress = currentRefereeProgressPayload();
        if (!progress) return;
        const label = refereeProgressLabel(progress);
        const data = getData();
        setData(normalizeData({
          ...data,
          notes: {
            ...(data.notes || {}),
            refereeProgress: progress
          }
        }));
        render();
        if (!programModal.hidden) renderProgramModal();
        updateLiveNotes(`Point JA : ${label || compactRaceTitle()}`, { refereeProgress: progress }).catch((error) => {
          console.error(error);
          window.alert(`Point JA non publié : ${error?.message || error}`);
        });
      }
      
      function openAdminSeriesModal() {
        if (!adminSeriesModal) return;
        adminSeriesModal.hidden = false;
        adminSeriesModal.innerHTML = livePalmesAdminModals.renderAdminSeriesModalHtml();
      }
      
      function closeAdminSeriesModal() {
        if (!adminSeriesModal) return;
        adminSeriesModal.hidden = true;
        adminSeriesModal.innerHTML = "";
      }
      
      function openResultImportModal(row) {
        if (!resultImportModal || !row) return;
        context.currentResultImportRow = row;
        context.currentSessionResultsImport = null;
        const event = (getData().events || []).find((item) => item.id === row.eventId);
        const phaseLabel = resultPhaseLabelForProgramRow(row);
        const isFinalResult = isFinalStage(row.stage);
        const defaultPartial = !isFinalResult && isSplitRaceAcrossSessions(row.eventId, row.sex) && !isLastProgramPartForRace(row);
        const existingResult = resultForProgramRow(row);
        const protectedFinalists = Boolean(existingResult?.hasFinal && (
          existingResult.finalistsAnnouncedAt ||
          (existingResult.finalWithdrawals || []).length ||
          (existingResult.finalPreWithdrawals || []).length ||
          ["a", "b"].some((key) => (existingResult.finalists?.[key] || []).some((finalist) => finalist.withdrawnAt || finalist.repechaged))
        ));
        resultImportModal.hidden = false;
        resultImportModal.innerHTML = livePalmesAdminResults.renderResultImportModalHtml({
          defaultPartial,
          eventLabel: event?.label || row.label || row.eventId,
          isFinalResult,
          phaseLabel,
          protectedFinalists,
          sexLabel: sexDisplayLabel(row.sex),
          subtitle: [row.session ? `Session ${row.session}` : "", row.startTime || ""].filter(Boolean).join(" - ") || "Importer le PDF résultat"
        });
      }
      
      function openSessionResultsImportModal(defaultSession = "") {
        if (!resultImportModal) return;
        context.currentResultImportRow = null;
        const sessions = resultSessions();
        const selectedSession = defaultSession || getResultsAdminSession() || sessions[0]?.number || "";
        context.currentSessionResultsImport = { defaultSession: selectedSession };
        resultImportModal.hidden = false;
        resultImportModal.innerHTML = livePalmesAdminResults.renderSessionResultsImportModalHtml({
          selectedSession,
          sessions
        });
      }
      
      function closeResultImportModal() {
        if (!resultImportModal) return;
        resultImportModal.hidden = true;
        resultImportModal.innerHTML = "";
        context.currentResultImportRow = null;
        context.currentSessionResultsImport = null;
      }

      return {
        renderProgramButtons,
        programSeriesItems,
        programItemMatchesState,
        programItemIsCurrent,
        programItemIsSpeakerCurrent,
        programProgressValue,
        compareProgramProgressValues,
        progressValueFromMarker,
        programItemProgressClass,
        programRowProgressClass,
        speakerProgramPositionLabel,
        renderProgramModal,
        openProgramModal,
        closeProgramModal,
        setRefereeProgressHere,
        openAdminSeriesModal,
        closeAdminSeriesModal,
        openResultImportModal,
        openSessionResultsImportModal,
        closeResultImportModal
      };
  }

  window.LivePalmesProgramModals = { init };
}());
