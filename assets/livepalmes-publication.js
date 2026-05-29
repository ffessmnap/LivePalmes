(function attachLivePalmesPublication(global) {
  function buildPublicResultsIndex(options = {}) {
    const {
      data = {},
      raceResults = [],
      publicResultPayload = (result) => result,
      publicSeriesPdfPayload = (pdf) => pdf,
      publicSessionResultsPdfPayload = (pdf) => pdf,
      updatedAt = new Date().toISOString()
    } = options;
    return {
      id: "resultsIndex",
      meet: data.meet || {},
      events: data.events || [],
      program: data.program || [],
      entrants: data.entrants || [],
      series: data.series || [],
      results: raceResults.map(publicResultPayload).filter(Boolean),
      seriesPdfs: (data.notes?.publicSeriesPdfs || []).map(publicSeriesPdfPayload).filter(Boolean),
      sessionResultsPdfs: (data.notes?.publicSessionResultsPdfs || []).map(publicSessionResultsPdfPayload).filter(Boolean),
      sessionInfos: data.notes?.publicSessionInfos || {},
      publicAccess: {
        online: true,
        updatedAt: data.notes?.livePublishedAt || updatedAt
      },
      updatedAt,
      sourceVersion: data.sourceVersion || "",
      sourceLabel: data.notes?.sourceLabel || "",
      lastUpdatedSession: data.notes?.lastUpdatedSession || ""
    };
  }

  function nextPublicSeriesPdfMetadata(current = [], metadata) {
    if (!metadata) return Array.isArray(current) ? current : [];
    return metadata.scope === "full"
      ? [metadata]
      : [
        ...(Array.isArray(current) ? current : []).filter((item) => item.id !== metadata.id),
        metadata
      ];
  }

  function nextPublicSessionResultsPdfMetadata(current = [], metadata) {
    if (!metadata) return Array.isArray(current) ? current : [];
    return [
      ...(Array.isArray(current) ? current : []).filter((item) => item.id !== metadata.id),
      metadata
    ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  global.LivePalmesPublication = {
    buildPublicResultsIndex,
    nextPublicSeriesPdfMetadata,
    nextPublicSessionResultsPdfMetadata
  };
})(window);
