(function attachLivePalmesResultsUploadState(global) {
  function create(context = {}) {
    const {
      getSeriesImportState = () => null,
      livePalmesAdminResults = {},
      programKey,
      renderResultsAdminPanel,
      resultUploadStates,
      setSeriesImportStateValue = () => {}
    } = context;

    function resultUploadKeyForProgram(row) {
      if (typeof livePalmesAdminResults.resultUploadKeyForProgram === "function") {
        return livePalmesAdminResults.resultUploadKeyForProgram(programKey(row));
      }
      return `result:${programKey(row)}`;
    }

    function resultUploadKeyForSessionResults(session) {
      if (typeof livePalmesAdminResults.resultUploadKeyForSessionResults === "function") {
        return livePalmesAdminResults.resultUploadKeyForSessionResults(session);
      }
      return `session-results:${String(session || "current")}`;
    }

    function setResultUploadState(key, label, tone = "loading") {
      if (!key) return;
      resultUploadStates.set(key, { label, tone });
      renderResultsAdminPanel();
    }

    function clearResultUploadState(key) {
      if (!key) return;
      resultUploadStates.delete(key);
      renderResultsAdminPanel();
    }

    function setSeriesImportState(label, tone = "loading") {
      setSeriesImportStateValue({ label, tone });
      renderResultsAdminPanel();
    }

    function clearSeriesImportState() {
      setSeriesImportStateValue(null);
      renderResultsAdminPanel();
    }

    function resultUploadBadgeHtml(uploadState = getSeriesImportState()) {
      if (typeof livePalmesAdminResults.resultUploadBadgeHtml === "function") {
        return livePalmesAdminResults.resultUploadBadgeHtml(uploadState);
      }
      return "";
    }

    return {
      clearResultUploadState,
      clearSeriesImportState,
      resultUploadBadgeHtml,
      resultUploadKeyForProgram,
      resultUploadKeyForSessionResults,
      setResultUploadState,
      setSeriesImportState
    };
  }

  global.LivePalmesResultsUploadState = { create };
})(window);
