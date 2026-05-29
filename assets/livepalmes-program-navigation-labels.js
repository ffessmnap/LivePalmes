(function attachLivePalmesProgramNavigationLabels(global) {
  function create(options = {}) {
    const {
      isRelayEntrant = () => false,
      livePalmesRaceCore = {},
      normalizePdfLabel = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase(),
      sameCategory = (left, right) => String(left || "").toLowerCase() === String(right || "").toLowerCase(),
      sheetSex = (value) => String(value || "").trim(),
      state = {}
    } = options;

    function comparableEventId(value) {
      return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    }

    function eventSignature(value) {
      const compact = String(normalizePdfLabel(value) || "").replace(/[^a-z0-9x]+/g, "");
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

    return {
      categoryLabel,
      comparableEventId,
      displayedWord,
      entrantWord,
      eventSignature,
      finalStageLabel,
      isFemaleContext,
      isFinalStage,
      recordEventMatches,
      recordMatchesRace,
      sexDisplayLabel,
      swimmerWord
    };
  }

  global.LivePalmesProgramNavigationLabels = { create };
})(window);
