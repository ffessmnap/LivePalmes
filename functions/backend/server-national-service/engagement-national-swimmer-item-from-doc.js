// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_engagementNationalSwimmerItemFromDoc(backendContext) {
  function engagementNationalSwimmerItemFromDoc(doc, source = "") {
    return backendContext.cleanText(source) === "performances"
      ? backendContext.engagementClubSwimmerItem(doc)
      : backendContext.engagementNewSwimmerItem(doc);
  }

  return { engagementNationalSwimmerItemFromDoc };
}

module.exports = { createNationalService_engagementNationalSwimmerItemFromDoc };
