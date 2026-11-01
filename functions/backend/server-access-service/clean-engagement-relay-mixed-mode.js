// Existing operation bodies; live services arrive through explicit accessors.
function createAccessService_cleanEngagementRelayMixedMode(backendContext) {
  function engagementCategoryCodesForEvent(code) {
    const definition = backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(code);
    return definition?.type === "relay"
      ? backendContext.ENGAGEMENT_RELAY_CATEGORY_CODES
      : backendContext.ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES;
  }

  function normalizeEngagementEventCategoryRestrictions(code, categories = []) {
    const allowedCategories = engagementCategoryCodesForEvent(code)
      .filter((category) => !(backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code] || new Set()).has(category));
    const restrictionSet = new Set(categories.filter((category) => allowedCategories.includes(category)));
    if (code === "50AP") {
      const legacyDefault = ["C", "J", "S", "M30+", "M40+", "M50+"];
      if (legacyDefault.every((category) => restrictionSet.has(category)) && ["M60+", "M70+", "M80+"].some((category) => !restrictionSet.has(category))) {
        return allowedCategories;
      }
    }
    return Array.from(restrictionSet);
  }

  function cleanEngagementRelayMixedMode(rawEvent = {}, definition = {}) {
    if (definition.type !== "relay") return "";
    if (definition.relayMixedRule === "required") return "required";
    if (definition.relayMixedRule === "mastersOnly") {
      const mode = backendContext.cleanText(rawEvent.relayMixedMode).trim();
      return backendContext.ENGAGEMENT_RELAY_MIXED_MODES.has(mode) && mode === "masters" ? "masters" : "none";
    }
    return "";
  }

  return { engagementCategoryCodesForEvent, normalizeEngagementEventCategoryRestrictions, cleanEngagementRelayMixedMode };
}

module.exports = { createAccessService_cleanEngagementRelayMixedMode };
