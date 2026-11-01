// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyService_nativePerformanceFailure(backendContext) {
  function nativePerformanceFailure(error) {
    if(error instanceof backendContext.HttpsError)return error;
    return new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":error instanceof RangeError?"resource-exhausted":"unavailable",
      error instanceof TypeError||error instanceof RangeError?error.message:"Operation NAP interrompue. Reprenez la meme operation ; la sauvegarde est conservee.");
  }

  return { nativePerformanceFailure };
}

module.exports = { createLegacyService_nativePerformanceFailure };
