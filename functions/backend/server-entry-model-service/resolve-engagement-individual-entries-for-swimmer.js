// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_resolveEngagementIndividualEntriesForSwimmer(backendContext) {
  async function resolveEngagementIndividualEntriesForSwimmer(swimmer = {}, entries = [], competition = {}) {
    if (!entries.length) return [];
    const rows = competition.qualifications?.enabled ? await (0, backendContext.local$getEngagementQualificationRows)(swimmer, competition) : await (0, backendContext.local$getEngagementEntryTimeRowsForSwimmer)(swimmer);
    const evaluation = competition.qualifications?.enabled ? await (0, backendContext.local$qualificationService)().evaluate(swimmer, competition, rows) : { enabled: false };
    if (!competition.qualificationPreview && backendContext.qualificationEngine.reconcile(entries, evaluation).removed.length) {
      throw new backendContext.HttpsError("failed-precondition", "Engagement non conforme aux qualifications. Sélectionnez une course qualifiée et vérifiez les conditions des courses supplémentaires.");
    }
    const resolved = entries.map((entry) => {
      const eventCode = backendContext.cleanText(entry.eventCode).toUpperCase().replace(/\s+/g, "");
      const manualMode = backendContext.cleanText(entry.entryTimeMode) === "manual";
      const manualRaw = manualMode
        ? backendContext.cleanText(entry.manualEntryTime || entry.entryTime)
        : backendContext.cleanText(entry.manualEntryTime);
      const manualAllowed = !competition.qualifications?.enabled && competition.missingEntryTimeMode === "manual";
      if (manualAllowed && manualRaw) {
        const manual = (0, backendContext.local$parseEngagementEntryTime)(manualRaw);
        if (!manual) {
          throw new backendContext.HttpsError("invalid-argument", `Temps manuel invalide pour ${eventCode}.`);
        }
        return (0, backendContext.local$cleanEngagementEntryIndividualEntries)([{
          eventCode,
          entryTimeMode: "manual",
          manualEntryTime: manualRaw,
          entryTime: manual.display,
          entryTimeValue: manual.value
        }])[0];
      }
      return (0, backendContext.local$automaticEngagementIndividualEntry)({ eventCode }, rows, competition);
    }).filter(Boolean);
    return resolved.map((entry) => ({ ...entry, ...(evaluation.enabled ? { qualification: { ...evaluation.courses[entry.eventCode], mode: evaluation.mode } } : {}) }));
  }

  return { resolveEngagementIndividualEntriesForSwimmer };
}

module.exports = { createEntryModelService_resolveEngagementIndividualEntriesForSwimmer };
