(function attachLivePalmesResultsAdminProgram(global) {
  function build(options = {}) {
    const {
      data = {},
      isFinalStage,
      isSplitRaceAcrossSessions,
      livePalmesAdminResults = {},
      programKey,
      raceOptionKey,
      raceResults = [],
      roleStates = {},
      sessionRows,
      state = {}
    } = options;

    function resultIdForProgramRow(row) {
      const base = `result-${raceOptionKey(row.eventId, row.sex).replace(/[^a-z0-9_-]+/gi, "-")}`;
      if (!isFinalStage(row.stage)) return base;
      const stage = String(row.stage || "finale").replace(/[^a-z0-9_-]+/gi, "-");
      return `${base}-${stage}`;
    }

    function resultForProgramRow(row) {
      const raceKey = raceOptionKey(row.eventId, row.sex);
      const exact = raceResults.find((result) =>
        result.programKey === programKey(row) ||
        result.id === resultIdForProgramRow(row)
      );
      if (exact) return exact;
      if (isFinalStage(row.stage)) {
        const rowStages = new Set([row.stage, ...(row.finalStages || [])].map((stage) => String(stage || "")));
        return raceResults.find((result) => {
          if (result.raceKey !== raceKey || !isFinalStage(result.stage)) return false;
          if (row.session && result.session && String(row.session) !== String(result.session)) return false;
          const resultStage = String(result.stage || "");
          return rowStages.has(resultStage) ||
            row.stage === "finales" ||
            resultStage === "finales" ||
            result.programKey === programKey(row);
        }) || null;
      }
      return raceResults.find((result) => result.raceKey === raceKey && !isFinalStage(result.stage)) || null;
    }

    function isLastProgramPartForRace(row) {
      const raceRows = (data.program || [])
        .filter((item) => item.eventId === row.eventId && item.sex === row.sex && !isFinalStage(item.stage))
        .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
      if (!raceRows.length) return true;
      return programKey(raceRows[raceRows.length - 1]) === programKey(row);
    }

    function resultSessions() {
      return sessionRows().filter((session) =>
        (data.program || []).some((row) => row.session === session.number && row.eventId && row.sex)
      );
    }

    function sessionResultsPdfsForAdminSession(session) {
      if (typeof livePalmesAdminResults.sessionResultsPdfsForSession === "function") {
        return livePalmesAdminResults.sessionResultsPdfsForSession(data.notes?.publicSessionResultsPdfs || [], session);
      }
      return [];
    }

    function latestResultSession() {
      if (typeof livePalmesAdminResults.latestResultSession === "function") {
        return livePalmesAdminResults.latestResultSession(raceResults);
      }
      return "";
    }

    function ensureResultsAdminSession() {
      const sessions = resultSessions();
      if (!sessions.length) {
        options.setResultsAdminSessionValue("");
        return "";
      }
      const selectedSession = options.selectedResultsAdminSession();
      if (selectedSession && sessions.some((session) => session.number === selectedSession)) {
        options.setResultsAdminSessionValue(selectedSession);
        return selectedSession;
      }
      const speakerSession = roleStates.speaker?.session && roleStates.speaker.session !== "all" ? String(roleStates.speaker.session) : "";
      const currentSession = state.session && state.session !== "all" ? String(state.session) : "";
      const latestSession = latestResultSession();
      const fallbackSession = [speakerSession, currentSession, latestSession, "1", sessions[0].number]
        .find((candidate) => candidate && sessions.some((session) => session.number === candidate)) || sessions[0].number;
      options.setResultsAdminSessionValue(fallbackSession);
      return fallbackSession;
    }

    function resultProgramRows(sessionNumber = "") {
      const seenRegular = new Set();
      const seenFinals = new Set();
      const sortedRows = (data.program || [])
        .filter((row) => row.eventId && row.sex)
        .filter((row) => !sessionNumber || row.session === sessionNumber)
        .sort((a, b) => Number(a.session || 0) - Number(b.session || 0) || Number(a.order || 9999) - Number(b.order || 9999));
      const rows = [];
      sortedRows.forEach((row) => {
        if (isFinalStage(row.stage)) {
          const key = `${row.session || ""}|${row.eventId}|${row.sex}|finales`;
          if (seenFinals.has(key)) return;
          seenFinals.add(key);
          const finalRows = sortedRows.filter((item) =>
            item.session === row.session &&
            item.eventId === row.eventId &&
            item.sex === row.sex &&
            isFinalStage(item.stage)
          );
          rows.push({
            ...row,
            finalStageCount: finalRows.length,
            finalStages: finalRows.map((item) => item.stage).filter(Boolean),
            stage: finalRows.length > 1 ? "finales" : row.stage,
            startTime: finalRows.map((item) => item.startTime).filter(Boolean)[0] || row.startTime || ""
          });
          return;
        }
        const raceKey = raceOptionKey(row.eventId, row.sex);
        if (!isLastProgramPartForRace(row) && !resultForProgramRow(row)) {
          rows.push(row);
          return;
        }
        if (seenRegular.has(raceKey)) return;
        seenRegular.add(raceKey);
        rows.push(row);
      });
      return rows;
    }

    function resultPhaseLabelForProgramRow(row) {
      if (isFinalStage(row.stage)) {
        return Number(row.finalStageCount || 0) > 1 || row.stage === "finales" ? "finales" : "finale";
      }
      const finals = (data.program || []).filter((item) => item.eventId === row.eventId && item.sex === row.sex && isFinalStage(item.stage));
      const seriesNumbers = (data.series || [])
        .filter((item) => item.eventId === row.eventId && item.sex === row.sex)
        .filter((item) => !row.session || !item.session || item.session === row.session)
        .filter((item) => !isFinalStage(item.stage))
        .map((item) => Number(item.series))
        .filter(Number.isFinite);
      const uniqueSeries = [...new Set(seriesNumbers)];
      if (!finals.length && isSplitRaceAcrossSessions(row.eventId, row.sex) && isLastProgramPartForRace(row)) {
        return "meilleure série";
      }
      return uniqueSeries.length > 1 ? "séries" : "série";
    }

    function resultStatusForProgramRow(row) {
      const result = resultForProgramRow(row);
      if (typeof livePalmesAdminResults.resultStatusLabel === "function") {
        return livePalmesAdminResults.resultStatusLabel(result);
      }
      return "";
    }

    function resultStatusBadgeForProgramRow(row, result, isFinalCompositionDefinitive) {
      if (typeof livePalmesAdminResults.resultStatusBadge === "function") {
        return livePalmesAdminResults.resultStatusBadge(result, isFinalCompositionDefinitive);
      }
      return result ? { label: "Résultat publié", tone: "done" } : { label: "À importer", tone: "missing" };
    }

    function resultStatusControlHtml(row, result, statusBadge) {
      if (typeof livePalmesAdminResults.resultStatusControlHtml === "function") {
        return livePalmesAdminResults.resultStatusControlHtml({
          programKeyValue: programKey(row),
          result,
          resultId: result?.id || "",
          statusBadge
        });
      }
      return "";
    }

    return {
      ensureResultsAdminSession,
      isLastProgramPartForRace,
      latestResultSession,
      resultForProgramRow,
      resultIdForProgramRow,
      resultPhaseLabelForProgramRow,
      resultProgramRows,
      resultSessions,
      resultStatusBadgeForProgramRow,
      resultStatusControlHtml,
      resultStatusForProgramRow,
      sessionResultsPdfsForAdminSession
    };
  }

  global.LivePalmesResultsAdminProgram = { build };
})(window);
