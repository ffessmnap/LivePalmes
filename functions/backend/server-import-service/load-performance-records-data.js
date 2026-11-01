// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_loadPerformanceRecordsData(backendContext) {
  async function loadPerformanceRecordsData() {
    const snapshot = await backendContext.db
      .collection("competitions")
      .doc("livepalmes-active")
      .collection("performanceData")
      .doc("records")
      .get();
    return snapshot.exists ? snapshot.data() || {} : {};
  }

  return { loadPerformanceRecordsData };
}

module.exports = { createImportService_loadPerformanceRecordsData };
