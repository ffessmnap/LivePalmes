// Existing operation bodies; live services arrive through explicit accessors.
function createEngagementPdfRenderer_engagementPdfEventLabel(backendContext) {
  function engagementPdfEventLabel(code) {
    const definition = backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get((0, backendContext.normalizeCourseCode)(code));
    return definition?.shortLabel || (0, backendContext.normalizeCourseCode)(code) || "-";
  }

  return { engagementPdfEventLabel };
}

module.exports = { createEngagementPdfRenderer_engagementPdfEventLabel };
