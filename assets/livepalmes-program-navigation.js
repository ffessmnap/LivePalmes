(function () {
  const livePalmesRaceCore = window.LivePalmesRaceCore || {};
  let context = {};
  let data = { events: [], entrants: [], series: [], program: [] };
  let state = {};
  let eventSelect = null;

  function useContext(nextContext = {}) {
    context = nextContext || {};
    data = context.data || data || { events: [], entrants: [], series: [], program: [] };
    state = context.state || state || {};
    eventSelect = context.eventSelect || eventSelect;
  }

  function callDependency(name, fallback, ...args) {
    return typeof context[name] === "function" ? context[name](...args) : fallback(...args);
  }

  function clearSearch() {
    return callDependency("clearSearch", () => {}, undefined);
  }

  function entrantKey(entrant) {
    return callDependency("entrantKey", (row) => [row?.lastName, row?.firstName, row?.birthDate, row?.sex].join("|"), entrant);
  }

  function escapeHtml(value) {
    return callDependency("escapeHtml", (input) => String(input ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])), value);
  }

  function isLastProgramPartForRace(row) {
    return callDependency("isLastProgramPartForRace", () => false, row);
  }

  function isRelayEntrant(entrant) {
    return callDependency("isRelayEntrant", () => false, entrant);
  }

  function normalizePdfLabel(value) {
    return callDependency("normalizePdfLabel", (input) => String(input || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase(), value);
  }

  function sameCategory(a, b) {
    return callDependency("sameCategory", (left, right) => String(left || "").toLowerCase() === String(right || "").toLowerCase(), a, b);
  }

  function sheetSex(value) {
    return callDependency("sheetSex", (input) => String(input || "").trim(), value);
  }

  function timeToMs(value) {
    return callDependency("timeToMs", () => Number.NaN, value);
  }

  function currentEvent() {
    return data.events.find((event) => event.id === state.eventId) || data.events[0];
  }
  
  function matchesRace(item) {
    return item.eventId === state.eventId &&
      item.sex === state.sex;
  }
  
  function comparableEventId(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  }
  
  function eventSignature(value) {
    const compact = normalizePdfLabel(value).replace(/[^a-z0-9x]+/g, "");
    const direct = compact.match(/(\d+x\d+|\d+)(?:m)?(apnee|ap|immersion|is|surface|sf|bipalmes|bipalme|bi|sb)/i);
    if (!direct) return "";
    const distance = direct[1].toLowerCase();
    const disciplineText = direct[2].toLowerCase();
    let discipline = "";
    if (disciplineText === "ap" || disciplineText === "apnee") discipline = "ap";
    else if (disciplineText === "is" || disciplineText === "immersion") discipline = "is";
    else if (disciplineText === "sf" || disciplineText === "surface") discipline = "sf";
    else if (disciplineText === "bi" || disciplineText === "bipalme" || disciplineText === "bipalmes") discipline = "bi";
    else if (disciplineText === "sb") discipline = "sb";
    return discipline ? `${distance}${discipline}` : "";
  }
  
  function recordEventMatches(recordEventId, eventId) {
    const recordId = comparableEventId(recordEventId);
    const raceId = comparableEventId(eventId);
    if (recordId === raceId) return true;
    const recordSignature = eventSignature(recordEventId);
    const raceSignature = eventSignature(eventId);
    if (recordSignature && raceSignature && recordSignature === raceSignature) return true;
    if (recordSignature && raceId && recordSignature === raceId) return true;
    if (raceSignature && recordId && raceSignature === recordId) return true;
    if (/^(\d+x)/i.test(raceId) && raceId.endsWith("x") && recordId === raceId.slice(0, -1)) return true;
    if (/^(\d+x)/i.test(recordId) && recordId.endsWith("x") && raceId === recordId.slice(0, -1)) return true;
    return false;
  }
  
  function recordMatchesRace(record, eventId = state.eventId, sex = state.sex) {
    if (!recordEventMatches(record.eventId, eventId)) return false;
    if (sex === "X" && isRelayEntrant({ eventId })) {
      return ["F", "M", "X"].includes(sheetSex(record.sex));
    }
    return sheetSex(record.sex) === sex;
  }
  
  function isFinalStage(stage) {
    return livePalmesRaceCore.isFinalStage(stage);
  }
  
  function finalStageLabel(stage) {
    return livePalmesRaceCore.finalStageLabel(stage);
  }
  
  function isFemaleContext(sex = state.sex) {
    return sex === "F";
  }
  
  function sexDisplayLabel(sex = state.sex) {
    if (sex === "F") return "Femmes";
    if (sex === "M") return "Hommes";
    return "Mixte";
  }
  
  function categoryLabel(category, sex = state.sex) {
    if (isFemaleContext(sex)) {
      if (sameCategory(category, "Cadet")) return "Cadette";
      if (sameCategory(category, "Junior")) return "Junior";
      if (sameCategory(category, "Senior")) return "Senior";
    }
    return category || "";
  }
  
  function entrantWord(count = 2, sex = state.sex) {
    const female = isFemaleContext(sex);
    if (Number(count) === 1) return female ? "engagée" : "engagé";
    return female ? "engagées" : "engagés";
  }
  
  function swimmerWord(count = 1, sex = state.sex) {
    const female = isFemaleContext(sex);
    if (Number(count) === 1) return female ? "nageuse" : "nageur";
    return female ? "nageuses" : "nageurs";
  }
  
  function displayedWord(count = 2, sex = state.sex) {
    if (Number(count) === 1) return isFemaleContext(sex) ? "affichée" : "affiché";
    return isFemaleContext(sex) ? "affichées" : "affichés";
  }
  
  function availableSexesForEvent(eventId = state.eventId) {
    const order = ["F", "M", "X"];
    const sexes = new Set([
      ...data.entrants.filter((item) => item.eventId === eventId).map((item) => item.sex),
      ...data.series.filter((item) => item.eventId === eventId).map((item) => item.sex),
      ...data.program.filter((item) => item.eventId === eventId).map((item) => item.sex)
    ].filter(Boolean));
    return order.filter((sex) => sexes.has(sex));
  }
  
  function raceEntrants() {
    const query = state.search.trim().toLowerCase();
    const seriesRows = currentSeriesRows();
    const seriesMap = new Map(seriesRows.map((row) => [row.swimmerId || entrantKey(row), row]));
    const hasSeriesFilter = state.series !== "all";
    return data.entrants
      .filter(matchesRace)
      .filter((entrant) => {
        if (!hasSeriesFilter) return true;
        const seriesRow = seriesMap.get(entrant.swimmerId || entrantKey(entrant));
        return Boolean(seriesRow) && (!seriesRow.session || !entrant.session || entrant.session === seriesRow.session);
      })
      .filter((entrant) => state.category === "all" || sameCategory(entrant.category, state.category))
      .filter((entrant) => {
        const haystack = [
          entrant.lane,
          entrant.lastName,
          entrant.firstName,
          entrant.name,
          entrant.club,
          entrant.category,
          entrant.seedTime,
          entrant.note
        ].join(" ").toLowerCase();
        return haystack.includes(query);
      })
      .map((entrant) => ({ ...entrant, seriesInfo: seriesMap.get(entrant.swimmerId || entrantKey(entrant)) }))
      .sort((a, b) => {
        if (hasSeriesFilter) {
          const direction = state.lineOrder === "desc" ? -1 : 1;
          return direction * (Number(a.seriesInfo?.line || 99) - Number(b.seriesInfo?.line || 99));
        }
        return timeToMs(a.seedTime) - timeToMs(b.seedTime);
      });
  }
  
  function raceEntrantsForStats() {
    const raceItems = data.entrants.filter(matchesRace);
    const seriesItems = raceItems.filter((entrant) => {
      if (isFinalStage(entrant.stage)) return false;
      const row = (data.series || []).find((seriesRow) => (
        seriesRow.eventId === entrant.eventId &&
        seriesRow.sex === entrant.sex &&
        (seriesRow.swimmerId || entrantKey(seriesRow)) === (entrant.swimmerId || entrantKey(entrant)) &&
        (!entrant.session || !seriesRow.session || entrant.session === seriesRow.session)
      ));
      return !row || !isFinalStage(row.stage);
    });
    const source = seriesItems.length ? seriesItems : raceItems;
    const bySwimmer = new Map();
    source.forEach((entrant) => {
      const key = entrant.swimmerId || entrantKey(entrant);
      const current = bySwimmer.get(key);
      if (!current || timeToMs(entrant.seedTime) < timeToMs(current.seedTime)) {
        bySwimmer.set(key, entrant);
      }
    });
    return [...bySwimmer.values()];
  }
  
  function updateEventSelect() {
    const rows = programRows();
    if (rows.length) {
      const options = [];
      const seen = new Set();
      rows.forEach((row) => {
        const optionKey = raceOptionKey(row.eventId, row.sex);
        if (seen.has(optionKey)) return;
        const event = data.events.find((item) => item.id === row.eventId);
        seen.add(optionKey);
        options.push({
          id: optionKey,
          label: `${event?.label || row.label || row.eventId.toUpperCase()} ${sexDisplayLabel(row.sex)} - ${raceOptionPhaseLabel(row.eventId, row.sex)}`
        });
      });
      if (!options.some((option) => option.id === raceOptionKey(state.eventId, state.sex))) {
        applyProgramRow(rows[0]);
      }
      eventSelect.innerHTML = options.map((option) => (
        `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`
      )).join("");
      eventSelect.value = raceOptionKey(state.eventId, state.sex);
      return;
    }
    const fallbackOptions = [];
    data.events.forEach((event) => {
      const sexes = availableSexesForEvent(event.id);
      (sexes.length ? sexes : ["F", "M"]).forEach((sex) => {
        fallbackOptions.push({
          id: raceOptionKey(event.id, sex),
          label: `${event.label} ${sexDisplayLabel(sex)} - ${raceOptionPhaseLabel(event.id, sex)}`
        });
      });
    });
    eventSelect.innerHTML = fallbackOptions.map((option) => (
      `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`
    )).join("");
    eventSelect.value = raceOptionKey(state.eventId, state.sex);
  }
  
  function raceOptionKey(eventId, sex) {
    return livePalmesRaceCore.raceOptionKey(eventId, sex);
  }
  
  function raceProgramRowsForOption(eventId, sex) {
    return programRows().filter((row) => row.eventId === eventId && row.sex === sex);
  }
  
  function seriesNumbersForRaceOption(eventId, sex) {
    const rows = (data.series || [])
      .filter((row) => row.eventId === eventId && row.sex === sex)
      .filter((row) => state.session === "all" || !row.session || row.session === state.session)
      .filter((row) => !isFinalStage(row.stage));
    return [...new Set(rows.map((row) => Number(row.series)).filter(Number.isFinite))].sort((a, b) => a - b);
  }
  
  function finalRowsForRaceOption(eventId, sex) {
    const seen = new Set();
    return raceProgramRowsForOption(eventId, sex)
      .filter((row) => isFinalStage(row.stage))
      .filter((row) => {
        const key = row.stage || programKey(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }
  
  function raceOptionPhaseLabel(eventId, sex) {
    const currentOption = eventId === state.eventId && sex === state.sex;
    const finals = finalRowsForRaceOption(eventId, sex);
    if (currentOption && isFinalStage(state.series) && finals.length) {
      return `${finals.length} finale${finals.length > 1 ? "s" : ""}`;
    }
    const seriesNumbers = seriesNumbersForRaceOption(eventId, sex);
    const rows = raceProgramRowsForOption(eventId, sex);
    const lastRegularRow = rows.filter((row) => !isFinalStage(row.stage)).at(-1);
    const isBestSeries = !finals.length && lastRegularRow && isSplitRaceAcrossSessions(eventId, sex) && isLastProgramPartForRace(lastRegularRow);
    if (isBestSeries) return "meilleure série";
    if (seriesNumbers.length) {
      return `${seriesNumbers.length} série${seriesNumbers.length > 1 ? "s" : ""}`;
    }
    if (finals.length) return `${finals.length} finale${finals.length > 1 ? "s" : ""}`;
    return "série";
  }
  
  function programRowFromRaceOption(value) {
    const [eventId, sex] = String(value || "").split("|");
    return programRows().find((row) => row.eventId === eventId && row.sex === sex)
      || { eventId, sex };
  }
  
  function programKey(row) {
    return livePalmesRaceCore.programKey(row);
  }
  
  function programLabel(row) {
    const sexLabel = sexDisplayLabel(row.sex);
    const time = row.startTime ? ` - ${row.startTime}` : "";
    const session = row.session ? `S${row.session} - ` : "";
    return `${session}${row.label} - ${sexLabel}${time}`;
  }
  
  function selectedProgramRow() {
    if (state.programKey) {
      const exact = programRows().find((row) => programKey(row) === state.programKey);
      if (exact) return exact;
    }
    if (isFinalStage(state.series)) {
      const finalRow = finalProgramRowsForRace().find((row) => row.stage === state.series);
      if (finalRow) return finalRow;
    }
    return programRows().find((row) => row.eventId === state.eventId && row.sex === state.sex) || null;
  }
  
  function applyProgramRow(row) {
    if (!row) return;
    state.programKey = programKey(row);
    state.eventId = row.eventId;
    state.sex = row.sex;
  }
  
  function sessionRows() {
    const rows = (data.program || []).filter((row) => row.session);
    const bySession = new Map();
    rows.forEach((row) => {
      if (!bySession.has(row.session)) {
        bySession.set(row.session, {
          number: row.session,
          label: row.sessionLabel || `Session ${row.session}`,
          order: Number(row.order || 9999)
        });
      }
    });
    return [...bySession.values()].sort((a, b) => Number(a.number) - Number(b.number) || a.order - b.order);
  }
  
  function firstSessionNumber() {
    return sessionRows()[0]?.number || "all";
  }
  
  function preferredInitialSession() {
    const sessions = sessionRows();
    if (!sessions.length) return "all";
    const updatedSession = String(data.notes?.lastUpdatedSession || "");
    if (data.notes?.lastImportedMode === "Mise à jour session" && sessions.some((session) => session.number === updatedSession)) {
      return updatedSession;
    }
    return sessions.find((session) => session.number === "1")?.number || sessions[0].number;
  }
  
  function firstProgramRowForSession(sessionNumber) {
    const rows = (data.program || [])
      .filter((row) => !sessionNumber || sessionNumber === "all" || row.session === sessionNumber)
      .filter((row) => row.hasEntrants === false || hasRowsForProgram(row))
      .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
    return rows[0] || null;
  }
  
  function firstSeriesForRace(eventId, sex, sessionNumber) {
    const rows = (data.series || [])
      .filter((row) => row.eventId === eventId && row.sex === sex)
      .filter((row) => !sessionNumber || sessionNumber === "all" || !row.session || row.session === sessionNumber);
    const firstRegular = rows
      .filter((row) => !isFinalStage(row.stage))
      .map((row) => Number(row.series))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)[0];
    if (firstRegular) return String(firstRegular);
    return rows.find((row) => isFinalStage(row.stage))?.stage || "all";
  }
  
  function initialProgramPosition() {
    const session = preferredInitialSession();
    const row = firstProgramRowForSession(session);
    if (!row) {
      return {
        eventId: data.events[0]?.id || "",
        sex: "F",
        session,
        series: "all",
        programKey: ""
      };
    }
    return {
      eventId: row.eventId,
      sex: row.sex,
      session: row.session || session,
      series: firstSeriesForRace(row.eventId, row.sex, row.session || session),
      programKey: programKey(row)
    };
  }
  
  function normalizeLivePosition() {
    const sessions = sessionRows();
    if (!sessions.length) {
      state.session = "all";
      return;
    }
      if (state.session === "all" || !sessions.some((session) => session.number === state.session)) {
        const initial = initialProgramPosition();
        state.session = initial.session;
      state.eventId = initial.eventId;
      state.sex = initial.sex;
      state.programKey = initial.programKey;
      state.series = initial.series;
      return;
    }
    if (state.series === "all") {
      state.series = firstSeriesSelectionForCurrentRace();
    }
  }
  
  function programRowsForSession() {
    const rows = data.program || [];
    if (!state.session || state.session === "all") return rows;
    return rows.filter((row) => row.session === state.session);
  }
  
  function programRows() {
    const explicitProgram = programRowsForSession()
      .filter((row) => row.hasEntrants === false || hasRowsForProgram(row))
      .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
    if (explicitProgram.length) return explicitProgram;
  
    const seen = new Set();
    return (data.series || [])
      .filter((row) => row.eventId && row.sex)
      .sort((a, b) => Number(a.heatOrder || 9999) - Number(b.heatOrder || 9999))
      .reduce((rows, row) => {
        const key = `${row.eventId}|${row.sex}`;
        if (seen.has(key)) return rows;
        seen.add(key);
        rows.push({
          eventId: row.eventId,
          sex: row.sex,
          order: Number(row.heatOrder || rows.length + 1)
        });
        return rows;
      }, []);
  }
  
  function currentProgramIndex() {
    const current = selectedProgramRow();
    if (!current) return -1;
    return programRows().findIndex((row) => programKey(row) === programKey(current));
  }
  
  function isLastRaceOfCurrentSession() {
    if (state.session === "all") return false;
    const rows = programRows();
    const index = currentProgramIndex();
    return rows.length > 0 && index === rows.length - 1;
  }
  
  function isLastSeriesOfCurrentSession() {
    if (state.session === "all" || state.series === "all") return false;
    return isLastRaceOfCurrentSession() && String(state.series) === String(lastSeriesSelectionForCurrentRace());
  }
  
  function isSplitRaceAcrossSessions(eventId = state.eventId, sex = state.sex) {
    const sessions = new Set((data.series || [])
      .filter((row) => row.eventId === eventId && row.sex === sex && row.session && !isFinalStage(row.stage))
      .map((row) => row.session));
    return sessions.size > 1;
  }
  
  function shouldShowSplitRaceNote() {
    return ["live", "speaker"].includes(state.role);
  }
  
  function splitRaceNote(eventId = state.eventId, sex = state.sex) {
    if (!shouldShowSplitRaceNote() || !isSplitRaceAcrossSessions(eventId, sex)) return "";
    return `<span class="session-end-note">[séries lentes matin, série rapide soir]</span>`;
  }
  
  function raceSeries() {
    return raceSeriesFor(state.eventId, state.sex);
  }
  
  function raceSeriesFor(eventId, sex) {
    let officialRows = (data.series || [])
      .filter((row) => row.eventId === eventId && row.sex === sex)
      .sort((a, b) => Number(a.heatOrder || a.series || 999) - Number(b.heatOrder || b.series || 999) || Number(a.line || 99) - Number(b.line || 99));
    if (isFinalStage(state.series)) {
      officialRows = officialRows.filter((row) => row.stage === state.series);
    } else {
      officialRows = officialRows
        .filter((row) => !isFinalStage(row.stage))
        .filter((row) => !state.session || state.session === "all" || state.series === "all" || !row.session || row.session === state.session);
    }
    if (officialRows.length) return officialRows;
    const entrants = data.entrants
      .filter((entrant) => entrant.eventId === eventId && entrant.sex === sex)
      .sort((a, b) => timeToMs(b.seedTime) - timeToMs(a.seedTime));
    const total = Math.max(1, Math.ceil(entrants.length / 8));
    return entrants.map((entrant, index) => {
      const zeroBasedSeries = Math.floor(index / 8);
      const inSeriesIndex = index % 8;
      return {
        ...entrant,
        series: zeroBasedSeries + 1,
        seriesCount: total,
        line: inSeriesIndex + 1,
        isPreview: true
      };
    });
  }
  
  function availableSeriesNumbers() {
    const officialRows = (data.series || [])
      .filter(matchesRace)
      .filter((row) => !state.session || state.session === "all" || !row.session || row.session === state.session);
    const regularRows = officialRows.filter((row) => !isFinalStage(row.stage));
    const sourceRows = officialRows.length ? regularRows : raceSeries().filter((row) => !isFinalStage(row.stage));
    return [...new Set(sourceRows.map((row) => Number(row.series)).filter(Number.isFinite))].sort((a, b) => a - b);
  }
  
  function selectedSeriesTime() {
    if (state.series === "all") return "";
    if (isFinalStage(state.series)) {
      return finalProgramRowsForRace().find((row) => row.stage === state.series)?.startTime ||
        raceSeries().find((row) => row.stage === state.series)?.startTime ||
        "";
    }
    return raceSeries().find((row) => Number(row.series) === Number(state.series))?.startTime || "";
  }
  
  function selectedSeriesLabel() {
    if (state.series === "all") return "";
    if (isFinalStage(state.series)) return finalStageLabel(state.series);
    const selectedSeries = Number(state.series);
    const seriesNumbers = availableSeriesNumbers();
    const selectedSeriesCount = currentSeriesRows()[0]?.seriesCount || seriesNumbers.length || selectedSeries;
    return `Série ${selectedSeries}/${selectedSeriesCount}`;
  }
  
  function compactRaceTitle() {
    return [
      currentEvent()?.label || "Course",
      sexDisplayLabel(state.sex),
      selectedSeriesLabel()
    ].filter(Boolean).join(" · ");
  }
  
  function hasNextProgramSeries() {
    const rows = programRows();
    const index = currentProgramIndex();
    return index >= 0 && index < rows.length - 1;
  }
  
  function hasPreviousProgramSeries() {
    const rows = programRows();
    const index = currentProgramIndex();
    return index > 0;
  }
  
  function goToNextProgramRace() {
    const rows = programRows();
    const programIndex = currentProgramIndex();
    const nextRace = rows[programIndex + 1];
    if (!nextRace) return false;
    applyProgramRow(nextRace);
    state.category = "all";
    clearSearch();
    state.selectedRecordKey = "";
    const nextNumbers = availableSeriesNumbers();
    const nextFinal = finalProgramRowsForRace()[0]?.stage;
    state.series = String(nextNumbers[0] || nextFinal || "all");
    return true;
  }
  
  function goToPreviousProgramRace() {
    const rows = programRows();
    const programIndex = currentProgramIndex();
    const previousRace = rows[programIndex - 1];
    if (!previousRace) return false;
    applyProgramRow(previousRace);
    state.category = "all";
    clearSearch();
    state.selectedRecordKey = "";
    state.series = lastSeriesSelectionForCurrentRace();
    return true;
  }
  
  function currentSeriesRows() {
    if (state.series === "all") return [];
    if (isFinalStage(state.series)) {
      return raceSeries().filter((row) => row.stage === state.series);
    }
    const selected = Number(state.series);
    return raceSeries().filter((row) => Number(row.series) === selected);
  }
  
  function hasRowsForProgram(row) {
    return (data.series || []).some((seriesRow) => (
      seriesRow.eventId === row.eventId &&
      seriesRow.sex === row.sex &&
      (!row.session || !seriesRow.session || seriesRow.session === row.session) &&
      (!isFinalStage(row.stage) || seriesRow.stage === row.stage)
    ));
  }
  
  function programRowsForCurrentRace() {
    return programRowsForSession()
      .filter((row) => row.eventId === state.eventId && row.sex === state.sex)
      .sort((a, b) => Number(a.order || 9999) - Number(b.order || 9999));
  }
  
  function finalProgramRowsForRace() {
    const seen = new Set();
    return programRowsForCurrentRace()
      .filter((row) => isFinalStage(row.stage))
      .filter((row) => {
        if (seen.has(row.stage)) return false;
        seen.add(row.stage);
        return true;
      });
  }
  
  function firstSeriesSelectionForCurrentRace() {
    const numbers = availableSeriesNumbers();
    if (numbers.length) return String(numbers[0]);
    return finalProgramRowsForRace()[0]?.stage || "all";
  }
  
  function lastSeriesSelectionForCurrentRace() {
    const finals = finalProgramRowsForRace();
    if (finals.length) return finals[finals.length - 1].stage;
    const numbers = availableSeriesNumbers();
    if (numbers.length) return String(numbers[numbers.length - 1]);
    return "all";
  }

  const withContext = (nextContext, callback) => {
    useContext(nextContext);
    return callback();
  };

  window.LivePalmesProgramNavigation = {
    currentEvent: (...args) => withContext(args.pop() || {}, () => currentEvent(...args)),
    matchesRace: (...args) => withContext(args.pop() || {}, () => matchesRace(...args)),
    comparableEventId: (...args) => withContext(args.pop() || {}, () => comparableEventId(...args)),
    eventSignature: (...args) => withContext(args.pop() || {}, () => eventSignature(...args)),
    recordEventMatches: (...args) => withContext(args.pop() || {}, () => recordEventMatches(...args)),
    recordMatchesRace: (...args) => withContext(args.pop() || {}, () => recordMatchesRace(...args)),
    isFinalStage: (...args) => withContext(args.pop() || {}, () => isFinalStage(...args)),
    finalStageLabel: (...args) => withContext(args.pop() || {}, () => finalStageLabel(...args)),
    isFemaleContext: (...args) => withContext(args.pop() || {}, () => isFemaleContext(...args)),
    sexDisplayLabel: (...args) => withContext(args.pop() || {}, () => sexDisplayLabel(...args)),
    categoryLabel: (...args) => withContext(args.pop() || {}, () => categoryLabel(...args)),
    entrantWord: (...args) => withContext(args.pop() || {}, () => entrantWord(...args)),
    swimmerWord: (...args) => withContext(args.pop() || {}, () => swimmerWord(...args)),
    displayedWord: (...args) => withContext(args.pop() || {}, () => displayedWord(...args)),
    availableSexesForEvent: (...args) => withContext(args.pop() || {}, () => availableSexesForEvent(...args)),
    raceEntrants: (...args) => withContext(args.pop() || {}, () => raceEntrants(...args)),
    raceEntrantsForStats: (...args) => withContext(args.pop() || {}, () => raceEntrantsForStats(...args)),
    updateEventSelect: (...args) => withContext(args.pop() || {}, () => updateEventSelect(...args)),
    raceOptionKey: (...args) => withContext(args.pop() || {}, () => raceOptionKey(...args)),
    raceProgramRowsForOption: (...args) => withContext(args.pop() || {}, () => raceProgramRowsForOption(...args)),
    seriesNumbersForRaceOption: (...args) => withContext(args.pop() || {}, () => seriesNumbersForRaceOption(...args)),
    finalRowsForRaceOption: (...args) => withContext(args.pop() || {}, () => finalRowsForRaceOption(...args)),
    raceOptionPhaseLabel: (...args) => withContext(args.pop() || {}, () => raceOptionPhaseLabel(...args)),
    programRowFromRaceOption: (...args) => withContext(args.pop() || {}, () => programRowFromRaceOption(...args)),
    programKey: (...args) => withContext(args.pop() || {}, () => programKey(...args)),
    programLabel: (...args) => withContext(args.pop() || {}, () => programLabel(...args)),
    selectedProgramRow: (...args) => withContext(args.pop() || {}, () => selectedProgramRow(...args)),
    applyProgramRow: (...args) => withContext(args.pop() || {}, () => applyProgramRow(...args)),
    sessionRows: (...args) => withContext(args.pop() || {}, () => sessionRows(...args)),
    firstSessionNumber: (...args) => withContext(args.pop() || {}, () => firstSessionNumber(...args)),
    preferredInitialSession: (...args) => withContext(args.pop() || {}, () => preferredInitialSession(...args)),
    firstProgramRowForSession: (...args) => withContext(args.pop() || {}, () => firstProgramRowForSession(...args)),
    firstSeriesForRace: (...args) => withContext(args.pop() || {}, () => firstSeriesForRace(...args)),
    initialProgramPosition: (...args) => withContext(args.pop() || {}, () => initialProgramPosition(...args)),
    normalizeLivePosition: (...args) => withContext(args.pop() || {}, () => normalizeLivePosition(...args)),
    programRowsForSession: (...args) => withContext(args.pop() || {}, () => programRowsForSession(...args)),
    programRows: (...args) => withContext(args.pop() || {}, () => programRows(...args)),
    currentProgramIndex: (...args) => withContext(args.pop() || {}, () => currentProgramIndex(...args)),
    isLastRaceOfCurrentSession: (...args) => withContext(args.pop() || {}, () => isLastRaceOfCurrentSession(...args)),
    isLastSeriesOfCurrentSession: (...args) => withContext(args.pop() || {}, () => isLastSeriesOfCurrentSession(...args)),
    isSplitRaceAcrossSessions: (...args) => withContext(args.pop() || {}, () => isSplitRaceAcrossSessions(...args)),
    shouldShowSplitRaceNote: (...args) => withContext(args.pop() || {}, () => shouldShowSplitRaceNote(...args)),
    splitRaceNote: (...args) => withContext(args.pop() || {}, () => splitRaceNote(...args)),
    raceSeries: (...args) => withContext(args.pop() || {}, () => raceSeries(...args)),
    raceSeriesFor: (...args) => withContext(args.pop() || {}, () => raceSeriesFor(...args)),
    availableSeriesNumbers: (...args) => withContext(args.pop() || {}, () => availableSeriesNumbers(...args)),
    selectedSeriesTime: (...args) => withContext(args.pop() || {}, () => selectedSeriesTime(...args)),
    selectedSeriesLabel: (...args) => withContext(args.pop() || {}, () => selectedSeriesLabel(...args)),
    compactRaceTitle: (...args) => withContext(args.pop() || {}, () => compactRaceTitle(...args)),
    hasNextProgramSeries: (...args) => withContext(args.pop() || {}, () => hasNextProgramSeries(...args)),
    hasPreviousProgramSeries: (...args) => withContext(args.pop() || {}, () => hasPreviousProgramSeries(...args)),
    goToNextProgramRace: (...args) => withContext(args.pop() || {}, () => goToNextProgramRace(...args)),
    goToPreviousProgramRace: (...args) => withContext(args.pop() || {}, () => goToPreviousProgramRace(...args)),
    currentSeriesRows: (...args) => withContext(args.pop() || {}, () => currentSeriesRows(...args)),
    hasRowsForProgram: (...args) => withContext(args.pop() || {}, () => hasRowsForProgram(...args)),
    programRowsForCurrentRace: (...args) => withContext(args.pop() || {}, () => programRowsForCurrentRace(...args)),
    finalProgramRowsForRace: (...args) => withContext(args.pop() || {}, () => finalProgramRowsForRace(...args)),
    firstSeriesSelectionForCurrentRace: (...args) => withContext(args.pop() || {}, () => firstSeriesSelectionForCurrentRace(...args)),
    lastSeriesSelectionForCurrentRace: (...args) => withContext(args.pop() || {}, () => lastSeriesSelectionForCurrentRace(...args))
  };
}());
