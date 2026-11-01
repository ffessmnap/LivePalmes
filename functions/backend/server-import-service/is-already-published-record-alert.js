// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_isAlreadyPublishedRecordAlert(backendContext) {
  function isAlreadyPublishedRecordAlert(alert = {}) {
    return backendContext.cleanText(alert.status) === "equal" &&
      Number(alert.timeValue || 0) === Number(alert.referenceValue || 0) &&
      (0, backendContext.local$sameRecordAlertSwimmer)(alert.swimmer, alert.referenceSwimmer);
  }

  return { isAlreadyPublishedRecordAlert };
}

module.exports = { createImportService_isAlreadyPublishedRecordAlert };
