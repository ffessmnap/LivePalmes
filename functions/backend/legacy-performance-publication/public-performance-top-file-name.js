// Existing operation bodies; live services arrive through explicit accessors.
function createLegacyPerformancePublication_publicPerformanceTopFileName(backendContext) {
  function publicPerformanceTopFileName(sex, category) {
    return `${(0, backendContext.cleanText)(sex)}-${(0, backendContext.cleanText)(category).replace(/\+/g, "")}.json`;
  }

  return { publicPerformanceTopFileName };
}

module.exports = { createLegacyPerformancePublication_publicPerformanceTopFileName };
