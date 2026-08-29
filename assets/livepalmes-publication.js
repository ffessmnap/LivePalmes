(function attachLivePalmesPublication(global) {
  const PUBLIC_INDEX_WARNING_BYTES = 650000;
  const PUBLIC_INDEX_MAX_BYTES = 900000;

  function publicIndexByteSize(payload) {
    const json = JSON.stringify(payload || {});
    if (typeof TextEncoder === "function") return new TextEncoder().encode(json).length;
    return unescape(encodeURIComponent(json)).length;
  }

  function publicIndexSizeReport(payload, options = {}) {
    const warningBytes = Number(options.warningBytes || PUBLIC_INDEX_WARNING_BYTES);
    const maxBytes = Number(options.maxBytes || PUBLIC_INDEX_MAX_BYTES);
    const bytes = publicIndexByteSize(payload);
    return {
      bytes,
      warningBytes,
      maxBytes,
      warning: bytes >= warningBytes,
      tooLarge: bytes > maxBytes
    };
  }

  function assertPublicIndexSize(label, payload, options = {}) {
    const report = publicIndexSizeReport(payload, options);
    if (report.tooLarge) {
      throw new Error(`${label} trop lourd : ${report.bytes.toLocaleString("fr-FR")} octets. Limite de securite LivePalmes : ${report.maxBytes.toLocaleString("fr-FR")} octets.`);
    }
    if (report.warning && global.console?.warn) {
      global.console.warn(`${label} approche de la limite Firestore : ${report.bytes.toLocaleString("fr-FR")} octets.`);
    }
    return report.bytes;
  }

  function buildPublicResultsIndex(options = {}) {
    const {
      data = {},
      raceResults = [],
      publicResultPayload = (result) => result,
      publicSeriesPdfPayload = (pdf) => pdf,
      publicSessionResultsPdfPayload = (pdf) => pdf,
      updatedAt = new Date().toISOString()
    } = options;
    const publicDirectDisabled = data.notes?.publicDirectDisabled === true;
    return {
      id: "resultsIndex",
      meet: publicDirectDisabled ? {} : (data.meet || {}),
      events: publicDirectDisabled ? [] : (data.events || []),
      program: publicDirectDisabled ? [] : (data.program || []),
      entrants: [],
      series: [],
      results: publicDirectDisabled ? [] : raceResults.map(publicResultPayload).filter(Boolean),
      records: [],
      qualifications: [],
      seriesPdfs: publicDirectDisabled ? [] : (data.notes?.publicSeriesPdfs || []).map(publicSeriesPdfPayload).filter(Boolean),
      sessionResultsPdfs: publicDirectDisabled ? [] : (data.notes?.publicSessionResultsPdfs || []).map(publicSessionResultsPdfPayload).filter(Boolean),
      sessionInfos: publicDirectDisabled ? {} : (data.notes?.publicSessionInfos || {}),
      publicAccess: {
        online: !publicDirectDisabled,
        updatedAt: data.notes?.livePublishedAt || updatedAt
      },
      updatedAt,
      sourceVersion: data.sourceVersion || "",
      sourceLabel: data.notes?.sourceLabel || "",
      lastUpdatedSession: data.notes?.lastUpdatedSession || ""
    };
  }

  function buildPublicSeriesIndex(options = {}) {
    const {
      data = {},
      publicSeriesPdfPayload = (pdf) => pdf,
      updatedAt = new Date().toISOString()
    } = options;
    const publicDirectDisabled = data.notes?.publicDirectDisabled === true;
    return {
      id: "seriesIndex",
      meet: publicDirectDisabled ? {} : (data.meet || {}),
      events: publicDirectDisabled ? [] : (data.events || []),
      program: publicDirectDisabled ? [] : (data.program || []),
      entrants: publicDirectDisabled ? [] : (data.entrants || []),
      series: publicDirectDisabled ? [] : (data.series || []),
      results: [],
      records: publicDirectDisabled ? [] : (data.records || []),
      qualifications: publicDirectDisabled ? [] : (data.qualifications || []),
      seriesPdfs: publicDirectDisabled ? [] : (data.notes?.publicSeriesPdfs || []).map(publicSeriesPdfPayload).filter(Boolean),
      sessionResultsPdfs: [],
      sessionInfos: publicDirectDisabled ? {} : (data.notes?.publicSessionInfos || {}),
      publicAccess: {
        online: !publicDirectDisabled,
        updatedAt: data.notes?.livePublishedAt || updatedAt
      },
      updatedAt,
      sourceVersion: data.sourceVersion || "",
      sourceLabel: data.notes?.sourceLabel || "",
      lastUpdatedSession: data.notes?.lastUpdatedSession || ""
    };
  }

  function publicMeetKey(index = {}) {
    const meet = index.meet || {};
    return [
      meet.name || meet.title || "",
      meet.city || meet.location || "",
      meet.year || meet.season || "",
      meet.date || meet.startDate || ""
    ].map((value) => String(value || "").trim()).join("|");
  }

  function resultCountsBySession(results = []) {
    return (Array.isArray(results) ? results : []).reduce((counts, result) => {
      const session = String(result?.session || "");
      if (!session) return counts;
      counts[session] = (counts[session] || 0) + 1;
      return counts;
    }, {});
  }

  function publicResultsRegressions(currentIndex = {}, nextIndex = {}) {
    if (!currentIndex || !nextIndex) return [];
    const currentMeet = publicMeetKey(currentIndex);
    const nextMeet = publicMeetKey(nextIndex);
    if (currentMeet && nextMeet && currentMeet !== nextMeet) return [];
    const currentCounts = resultCountsBySession(currentIndex.results);
    const nextCounts = resultCountsBySession(nextIndex.results);
    return Object.entries(currentCounts)
      .filter(([session, count]) => count > 0 && (nextCounts[session] || 0) < count)
      .map(([session, count]) => ({
        session,
        before: count,
        after: nextCounts[session] || 0
      }));
  }

  function mergePublicResultsPreservingCurrent(currentIndex = {}, nextIndex = {}) {
    const currentResults = Array.isArray(currentIndex.results) ? currentIndex.results : [];
    const nextResults = Array.isArray(nextIndex.results) ? nextIndex.results : [];
    if (!currentResults.length) return nextIndex;
    const byKey = new Map();
    currentResults.forEach((result) => {
      const key = result?.id || result?.programKey || "";
      if (key) byKey.set(key, result);
    });
    nextResults.forEach((result) => {
      const key = result?.id || result?.programKey || "";
      if (key) byKey.set(key, result);
    });
    return {
      ...nextIndex,
      results: [...byKey.values()]
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
    PUBLIC_INDEX_WARNING_BYTES,
    PUBLIC_INDEX_MAX_BYTES,
    publicIndexByteSize,
    publicIndexSizeReport,
    assertPublicIndexSize,
    buildPublicResultsIndex,
    buildPublicSeriesIndex,
    mergePublicResultsPreservingCurrent,
    publicResultsRegressions,
    nextPublicSeriesPdfMetadata,
    nextPublicSessionResultsPdfMetadata
  };
})(window);
