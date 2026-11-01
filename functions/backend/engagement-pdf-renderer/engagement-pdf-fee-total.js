// Existing operation bodies; live services arrive through explicit accessors.
function createEngagementPdfRenderer_engagementPdfFeeTotal(backendContext) {
  function engagementPdfFeeTotal(entry = {}, competition = {}) {
    const fees = competition.fees || {};
    if (fees.enabled === false) return 0;
    const stats = (0, backendContext.local$engagementPdfEntryStats)(entry);
    return (Number(fees.swimmerFee || 0) || 0) * stats.swimmerCount +
      (Number(fees.individualEventFee || 0) || 0) * stats.individualCount +
      (Number(fees.relayFee || 0) || 0) * stats.relayCount;
  }

  return { engagementPdfFeeTotal };
}

module.exports = { createEngagementPdfRenderer_engagementPdfFeeTotal };
