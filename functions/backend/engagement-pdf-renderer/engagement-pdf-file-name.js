// Existing operation bodies; live services arrive through explicit accessors.
function createEngagementPdfRenderer_engagementPdfFileName(backendContext) {
  function engagementPdfFileName(value) {
    return (0, backendContext.cleanText)(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 80) || "engagements";
  }

  return { engagementPdfFileName };
}

module.exports = { createEngagementPdfRenderer_engagementPdfFileName };
