// Existing operation bodies; live services arrive through explicit accessors.
function createDtnService_performanceSearchPrefixes(backendContext) {
  function performanceSearchPrefixes(value) {
    const prefixes = new Set();
    (0, backendContext.local$performanceSearchTokens)(value).forEach((token) => {
      const max = Math.min(token.length, 18);
      for (let length = 2; length <= max; length += 1) {
        prefixes.add(token.slice(0, length));
      }
    });
    return Array.from(prefixes).slice(0, 300);
  }

  return { performanceSearchPrefixes };
}

module.exports = { createDtnService_performanceSearchPrefixes };
