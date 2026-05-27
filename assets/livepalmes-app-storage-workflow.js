(function () {
  function init(context = {}) {
    with (context) {
      function loadData() {
        return livePalmesLocalState.loadData(STORAGE_KEY, sampleData, normalizeData);
      }
      
      function loadAlerts() {
        return livePalmesLocalState.loadJson(ALERTS_KEY, []);
      }
      
      function saveAlerts() {
        livePalmesLocalState.saveJson(ALERTS_KEY, alerts);
      }
      
      function normalizeData(nextData) {
        return {
          meet: nextData.meet || sampleData.meet,
          events: Array.isArray(nextData.events) ? nextData.events : [],
          entrants: Array.isArray(nextData.entrants) ? nextData.entrants : [],
          series: Array.isArray(nextData.series) ? nextData.series : [],
          program: Array.isArray(nextData.program) ? nextData.program : [],
          qualifications: Array.isArray(nextData.qualifications) ? nextData.qualifications : [],
          top2025: Array.isArray(nextData.top2025) ? nextData.top2025 : [],
          records: Array.isArray(nextData.records) ? nextData.records.filter(shouldKeepRecord) : [],
          edfMembers: Array.isArray(nextData.edfMembers) ? nextData.edfMembers : (sampleData.edfMembers || []),
          internationalMedals: Array.isArray(nextData.internationalMedals) ? nextData.internationalMedals : (sampleData.internationalMedals || []),
          competitionStats: Array.isArray(nextData.competitionStats) ? nextData.competitionStats : [],
          swimmerInfos: Array.isArray(nextData.swimmerInfos) ? nextData.swimmerInfos : [],
          sourceVersion: nextData.sourceVersion || sampleData.sourceVersion || "",
          notes: nextData.notes || {}
        };
      }
      
      function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
      }

      return {
        loadData,
        loadAlerts,
        saveAlerts,
        normalizeData,
        saveData
      };
    }
  }

  window.LivePalmesAppStorageWorkflow = { init };
})();
