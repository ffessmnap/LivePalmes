// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_decodeEngagementCompetitionStatisticsCache(backendContext) {
  function decodeEngagementCompetitionStatisticsCache(data = {}, competition = {}) {
    if (data.status !== "ready" || data.payloadEncoding !== "gzip-base64") return null;
    if (backendContext.cleanText(data.competitionUpdatedAt) !== backendContext.cleanText(competition.updatedAt)) return null;
    const payloadGzip = typeof data.payloadGzip === "string" ? data.payloadGzip : "";
    if (!payloadGzip || payloadGzip.length > 850000) return null;
    try {
      const payload = JSON.parse(backendContext.zlib.gunzipSync(Buffer.from(payloadGzip, "base64"), {
        maxOutputLength: 10 * 1024 * 1024
      }).toString("utf8"));
      if (!payload || typeof payload !== "object" || !payload.counts || !Array.isArray(payload.events) || !Array.isArray(payload.clubs)) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  function encodeEngagementCompetitionStatisticsCache(payload = {}) {
    try {
      const payloadGzip = backendContext.zlib.gzipSync(Buffer.from(JSON.stringify(payload), "utf8"), { level: 6 }).toString("base64");
      return payloadGzip.length <= 780000 ? payloadGzip : "";
    } catch {
      return "";
    }
  }

  return { decodeEngagementCompetitionStatisticsCache, encodeEngagementCompetitionStatisticsCache };
}

module.exports = { createDocumentsService_decodeEngagementCompetitionStatisticsCache };
