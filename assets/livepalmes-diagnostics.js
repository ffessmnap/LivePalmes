(function attachLivePalmesDiagnostics(global) {
  function formatByteSize(bytes) {
    const value = Number(bytes || 0);
    if (!Number.isFinite(value) || value <= 0) return "0 ko";
    if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
    return `${Math.max(1, Math.round(value / 1024))} ko`;
  }

  function dataUrlApproxBytes(value) {
    const text = String(value || "");
    const base64 = text.includes(",") ? text.split(",").at(-1) : text;
    return Math.round((base64.length * 3) / 4);
  }

  function performanceDiagnosticLines(report) {
    if (!report?.available) return [report?.message || "Diagnostic performance indisponible."];
    return [
      `Competition : ${report.competitionId}`,
      `Resultats : ${report.publicResultCount}/${report.resultCount} visibles/publics`,
      `PDF dans resultPdfs : ${report.resultPdfCount}`,
      `PDF encore dans results : ${report.legacyPdfCount}`,
      `Poids a nettoyer : ${formatByteSize(report.legacyBytes)}`,
      `Index public : ${formatByteSize(report.publicIndexBytes)}`,
      `Index public MAJ : ${report.publicIndexUpdatedAt || "inconnue"}`,
      `Temps lecture diagnostic : ${report.readMs} ms`
    ];
  }

  global.LivePalmesDiagnostics = {
    dataUrlApproxBytes,
    formatByteSize,
    performanceDiagnosticLines
  };
})(window);
