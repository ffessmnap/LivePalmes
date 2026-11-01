// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementCompetitionEvents(backendContext) {
  function engagementOpenWaterEventDefinition(rawEvent = {}) {
    const code = backendContext.cleanText(rawEvent.code).toUpperCase().replace(/\s+/g, "");
    const match = code.match(/^OW(\d{1,6})(ELIM)?(SF|BI|SUP)$/);
    if (!match) return null;
    const distance = Number(match[1]);
    const format = match[2] ? "elimination" : "standard";
    const discipline = match[3];
    if ((distance === 150) !== (format === "elimination")) return null;
    const cleanedCourse = (0, backendContext.local$cleanEngagementOpenWaterCourse)({ distance, discipline }, { strict: false });
    if (!cleanedCourse) return null;
    return {
      code,
      type: "individual",
      label: cleanedCourse.label,
      shortLabel: cleanedCourse.label,
      discipline,
      distance,
      openWaterCourseId: cleanedCourse.id,
      openWaterFormat: format
    };
  }

  function cleanEngagementCompetitionEvents(rawEvents = [], options = {}) {
    if (!Array.isArray(rawEvents)) return [];
    const strict = options.strict !== false;
    const seen = new Set();
    const events = [];
    rawEvents.slice(0, 80).forEach((rawEvent) => {
      const code = backendContext.cleanText(rawEvent?.code).toUpperCase().replace(/\s+/g, "");
      const competitionType = (0, backendContext.local$cleanEngagementCompetitionType)(options.competitionType);
      const staticDefinition = backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(code);
      const definition = competitionType === "openWater"
        ? (code === "OW4X1000SB" ? staticDefinition : engagementOpenWaterEventDefinition(rawEvent))
        : (code === "OW4X1000SB" ? null : staticDefinition);
      if (!definition) {
        if (strict) throw new backendContext.HttpsError("invalid-argument", `Course engagements inconnue : ${code || "-"}.`);
        return;
      }
      if (seen.has(code)) return;
      seen.add(code);
      const forbiddenCategories = backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code] || new Set();
      const allowedCategories = backendContext.engagementCategoryCodesForEvent(code).filter((category) => !forbiddenCategories.has(category));
      const categoryRestrictions = [];
      const seenCategories = new Set();
      if (Array.isArray(rawEvent?.categoryRestrictions)) {
        rawEvent.categoryRestrictions.slice(0, 20).forEach((rawCategory) => {
          const category = backendContext.cleanText(rawCategory).toUpperCase().replace(/\s+/g, "");
          if (!category) return;
          if (!backendContext.ENGAGEMENT_CATEGORY_CODE_SET.has(category)) {
            if (strict) throw new backendContext.HttpsError("invalid-argument", `Categorie inconnue pour ${code} : ${category}.`);
            return;
          }
          if (!allowedCategories.includes(category)) {
            if (strict) throw new backendContext.HttpsError("invalid-argument", `Categorie non autorisee pour ${code} : ${category}.`);
            return;
          }
          if (forbiddenCategories.has(category)) return;
          if (seenCategories.has(category)) return;
          seenCategories.add(category);
          categoryRestrictions.push(category);
        });
      }
      const normalizedCategoryRestrictions = backendContext.normalizeEngagementEventCategoryRestrictions(
        code,
        forbiddenCategories.size && !categoryRestrictions.length ? allowedCategories : categoryRestrictions
      );
      const relayMixedMode = backendContext.cleanEngagementRelayMixedMode(rawEvent, definition);
      events.push({
        ...definition,
        categoryRestrictions: normalizedCategoryRestrictions,
        ...(relayMixedMode ? { relayMixedMode } : {}),
        ...(definition.type === "relay" ? { multipleRelaysAllowed: rawEvent?.multipleRelaysAllowed === true } : {})
      });
    });
    return events;
  }

  return { engagementOpenWaterEventDefinition, cleanEngagementCompetitionEvents };
}

module.exports = { createCompetitionModelService_cleanEngagementCompetitionEvents };
