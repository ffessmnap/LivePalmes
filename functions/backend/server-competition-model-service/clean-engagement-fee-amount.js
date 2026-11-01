// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementFeeAmount(backendContext) {
  function cleanEngagementFeeAmount(value) {
    const amount = Number(value) || 0;
    return Math.min(9999, Math.max(0, Math.round(amount * 100) / 100));
  }

  function cleanEngagementFees(rawFees = {}, options = {}) {
    if (!rawFees || typeof rawFees !== "object") {
      return {
        enabled: true,
        swimmerFee: 0,
        individualEventFee: 0,
        relayFee: 0,
        helloAssoUrl: "",
        latePaymentSurcharge: 50
      };
    }
    const strict = options.strict !== false;
    const enabled = rawFees.enabled !== false;
    const helloAssoUrl = backendContext.cleanText(rawFees.helloAssoUrl).slice(0, 300);
    if (helloAssoUrl && !/^https?:\/\/\S+$/i.test(helloAssoUrl)) {
      if (strict) throw new backendContext.HttpsError("invalid-argument", "Lien HelloAsso invalide.");
    }
    return {
      enabled,
      swimmerFee: enabled ? cleanEngagementFeeAmount(rawFees.swimmerFee) : 0,
      individualEventFee: enabled ? cleanEngagementFeeAmount(rawFees.individualEventFee) : 0,
      relayFee: enabled ? cleanEngagementFeeAmount(rawFees.relayFee) : 0,
      helloAssoUrl: enabled && /^https?:\/\/\S+$/i.test(helloAssoUrl) ? helloAssoUrl : "",
      latePaymentSurcharge: 50
    };
  }

  function engagementCompetitionListItem(doc) {
    return (0, backendContext.local$engagementCompetitionCalendarItem)(doc.data() || {}, doc.id);
  }

  return { cleanEngagementFeeAmount, cleanEngagementFees, engagementCompetitionListItem };
}

module.exports = { createCompetitionModelService_cleanEngagementFeeAmount };
