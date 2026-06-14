(function () {
  function init(context = {}) {
    const {
      ALERTS_KEY,
      livePalmesLocalState,
      localStorage,
      sampleData,
      shouldKeepRecord,
      STORAGE_KEY
    } = context;

    function loadData() {
      return livePalmesLocalState.loadData(STORAGE_KEY, sampleData, normalizeData);
    }

    function loadAlerts() {
      return livePalmesLocalState.loadJson(ALERTS_KEY, []);
    }

    function saveAlerts() {
      livePalmesLocalState.saveJson(ALERTS_KEY, context.alerts);
    }

    function normalizeData(nextData = {}) {
      const normalized = {
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
      return window.LivePalmesPublicRecordsSource?.mergeIntoLiveData?.(normalized) || normalized;
    }

    function localStorageSafeData(value) {
      const strip = (item) => {
        if (Array.isArray(item)) return item.map(strip);
        if (!item || typeof item !== "object") return item;
        return Object.entries(item).reduce((clean, [key, entry]) => {
          if (key === "pdfDataUrl") return clean;
          clean[key] = strip(entry);
          return clean;
        }, {});
      };
      const clean = strip(value || {});
      if (Array.isArray(clean.notes?.importHistory) && clean.notes.importHistory.length > 80) {
        clean.notes.importHistory = clean.notes.importHistory.slice(-80);
      }
      return clean;
    }

    function localStorageFallbackData(value) {
      const clean = localStorageSafeData(value);
      return {
        meet: clean.meet,
        events: clean.events,
        entrants: clean.entrants,
        series: clean.series,
        program: clean.program,
        qualifications: clean.qualifications,
        sourceVersion: clean.sourceVersion,
        notes: {
          ...(clean.notes || {}),
          publicSeriesPdfs: [],
          publicSessionResultsPdfs: []
        }
      };
    }

    function saveData() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localStorageSafeData(context.data), null, 2));
      } catch (error) {
        console.warn("Sauvegarde locale LivePalmes impossible, tentative allegee", error);
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(localStorageFallbackData(context.data), null, 2));
        } catch (fallbackError) {
          console.warn("Sauvegarde locale LivePalmes ignoree", fallbackError);
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
        }
      }
    }

    return {
      loadData,
      loadAlerts,
      saveAlerts,
      normalizeData,
      saveData
    };
  }

  window.LivePalmesAppStorageWorkflow = { init };
})();
