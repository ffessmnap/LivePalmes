(function attachLivePalmesAdminResults(global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function sessionResultsPdfsForSession(items = [], session = "") {
    return (Array.isArray(items) ? items : [])
      .filter((pdf) => pdf.scope === "full" || (pdf.sessions || []).map(String).includes(String(session || "")) || String(pdf.session || "") === String(session || ""))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  function latestResultSession(results = []) {
    const latest = (Array.isArray(results) ? results : [])
      .filter((result) => result.updatedAt && result.session)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    return latest?.session ? String(latest.session) : "";
  }

  function resultStatusLabel(result) {
    if (!result) return "";
    if (result.hasFinal && result.finalistsAnnouncedAt) return "Finalistes annoncés";
    if (result.hasFinal) return "En attente annonce speaker";
    return "Publié";
  }

  function resultStatusBadge(result, isFinalCompositionDefinitive = false) {
    if (!result) return { label: "À importer", tone: "missing" };
    if (result.hasFinal && !result.finalistsAnnouncedAt) return { label: "Attente speaker", tone: "waiting" };
    if (result.hasFinal) {
      return isFinalCompositionDefinitive
        ? { label: "Finalistes définitifs", tone: "done" }
        : { label: "Finalistes provisoires", tone: "pending" };
    }
    if (result.isPartial) return { label: "Résultat partiel", tone: "partial" };
    return { label: "Résultat publié", tone: "done" };
  }

  function resultUploadKeyForProgram(programKeyValue) {
    return `result:${programKeyValue || ""}`;
  }

  function resultUploadKeyForSessionResults(session) {
    return `session-results:${String(session || "current")}`;
  }

  function resultUploadBadgeHtml(uploadState) {
    if (!uploadState) return "";
    const tone = uploadState.tone || "loading";
    const label = uploadState.label || "Chargement en cours...";
    return `<span class="result-status-badge ${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
  }

  function resultStatusControlHtml(options = {}) {
    const {
      programKeyValue = "",
      result = null,
      statusBadge = resultStatusBadge(result),
      resultId = result?.id || ""
    } = options;
    const className = `result-status-badge ${escapeHtml(statusBadge.tone)}`;
    if (!result) {
      return `<button class="${className} status-action" type="button" data-result-import="${escapeHtml(programKeyValue)}">${escapeHtml(statusBadge.label)}</button>`;
    }
    if (result.hasFinal) {
      return `<button class="${className} status-action" type="button" data-final-composition-result="${escapeHtml(resultId)}">${escapeHtml(statusBadge.label)}</button>`;
    }
    return `<span class="${className}">${escapeHtml(statusBadge.label)}</span>`;
  }

  global.LivePalmesAdminResults = {
    latestResultSession,
    resultStatusBadge,
    resultStatusControlHtml,
    resultStatusLabel,
    resultUploadBadgeHtml,
    resultUploadKeyForProgram,
    resultUploadKeyForSessionResults,
    sessionResultsPdfsForSession
  };
})(window);
