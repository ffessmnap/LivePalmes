// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_engagementEntryTimeWarning(backendContext) {
  function engagementRecordReferencesForEntry(referenceMap, swimmer = {}, entry = {}, competition = {}) {
    const eventCode = backendContext.normalizeCourseCode(entry.eventCode);
    const sex = backendContext.normalizeCategoryCode(swimmer.sex);
    const category = backendContext.ageCategoryFromDates(competition.date, swimmer.birthDate);
    if (!eventCode || (sex !== "F" && sex !== "M") || !category || !backendContext.POOL_COURSES.includes(eventCode)) {
      return [];
    }
    const perf = {
      sex,
      course: eventCode
    };
    const references = [];
    if ((0, backendContext.local$engagementCompetitionAppliesToFranceRecords)(competition)) {
      references.push(backendContext.recordReferenceForPerformance(referenceMap, "RF", perf, category));
      if (backendContext.isYouthCategory(category)) {
        references.push(backendContext.recordReferenceForPerformance(referenceMap, "RFJ", perf, category));
      }
    }
    if ((0, backendContext.local$engagementCompetitionAppliesToMpf)(competition)) {
      references.push(backendContext.recordReferenceForPerformance(referenceMap, "MPF", perf, category));
    }
    return references.filter(Boolean);
  }

  function engagementEntryTimeWarning(entry = {}, references = []) {
    const timeValue = Number(entry.entryTimeValue || 0) || 0;
    if (!timeValue || backendContext.cleanText(entry.entryTimeMode) !== "manual") return "";
    const fastestReference = references
      .map((reference) => Number(reference.value || 0) || 0)
      .filter(Boolean)
      .sort((a, b) => a - b)[0] || 0;
    if (!fastestReference) return "";
    return timeValue >= fastestReference * 5
      ? "Temps manuel tres lent par rapport aux references connues."
      : "";
  }

  function validateEngagementIndividualEntryTimes(swimmers = [], competition = {}, recordsData = {}) {
    const referenceMap = backendContext.recordReferenceMap(recordsData);
    return swimmers.map((swimmer) => ({
      ...swimmer,
      individualEntries: (Array.isArray(swimmer.individualEntries) ? swimmer.individualEntries : []).map((entry) => {
        const timeValue = Number(entry.entryTimeValue || 0) || 0;
        const references = engagementRecordReferencesForEntry(referenceMap, swimmer, entry, competition);
        const manualEntry = backendContext.cleanText(entry.entryTimeMode) === "manual";
        const blockingReference = references
          .filter((reference) => manualEntry && timeValue > 0 && timeValue < Number(reference.value || 0))
          .sort((a, b) => Number(a.value || 0) - Number(b.value || 0))[0];
        if (blockingReference) {
          const swimmerName = backendContext.cleanText(swimmer.name) ||
            [backendContext.cleanText(swimmer.firstName), backendContext.cleanText(swimmer.lastName)].filter(Boolean).join(" ");
          const label = backendContext.cleanText(blockingReference.alertLabel || blockingReference.recordTypeLabel || blockingReference.alertType);
          const referenceTime = backendContext.cleanText(blockingReference.time) || backendContext.formatTimeValue(blockingReference.value);
          throw new backendContext.HttpsError(
            "failed-precondition",
            `Temps impossible pour ${swimmerName || "nageur"} - ${entry.eventCode} : ${backendContext.formatTimeValue(timeValue)} est sous ${label} (${referenceTime}).`
          );
        }
        const entryTimeWarning = engagementEntryTimeWarning(entry, references);
        return {
          ...entry,
          ...(entryTimeWarning ? { entryTimeWarning } : {})
        };
      })
    }));
  }

  return { engagementRecordReferencesForEntry, engagementEntryTimeWarning, validateEngagementIndividualEntryTimes };
}

module.exports = { createEntryModelService_engagementEntryTimeWarning };
