(function () {
  function init(context = {}) {
    const {
      alertClubShortLabel,
      alertStatusLabel,
      alertTimelineItems,
      archiveCurrentHistory,
      decisionMotifLabel,
      finalRowsCount,
      finalStageLabel,
      formatAlertDateTime,
      isFinalStage,
      isRequalificationAlert,
      livePalmesAdminArchives,
      livePalmesExportActions,
      sexDisplayLabel,
      window
    } = context;
    const getAlerts = () => context.alerts || [];
    const getData = () => context.data || {};

    function downloadJson() {
      livePalmesExportActions.downloadJson(getData(), "donnees-speaker-france-2026.json");
    }

    function dsqReportRows() {
      return getAlerts()
        .filter((alert) => alert.roleSource === "referee" || alert.originalAlertId || isRequalificationAlert(alert))
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    }

    function buildDsqReportHtml() {
      return buildDsqReportHtmlFromRows(dsqReportRows(), "Journal d'arbitrage");
    }

    function buildDsqReportHtmlFromRows(rows, title = "Journal d'arbitrage", options = {}) {
      return livePalmesAdminArchives.buildDsqReportHtmlFromRows(rows, title, {
        ...options,
        data: getData(),
        helpers: {
          alertClubShortLabel,
          alertStatusLabel,
          alertTimelineItems,
          decisionMotifLabel,
          finalStageLabel,
          formatAlertDateTime,
          isFinalStage
        }
      });
    }

    function printDsqRows(rows, title = "Journal d'arbitrage") {
      livePalmesExportActions.openHtmlWindow(buildDsqReportHtmlFromRows(rows, title), {
        blockedMessage: "La fen\u00eatre PDF a \u00e9t\u00e9 bloqu\u00e9e par le navigateur.",
        print: true
      });
    }

    function openDsqRows(rows, title = "Journal d'arbitrage") {
      livePalmesExportActions.openHtmlWindow(buildDsqReportHtmlFromRows(rows, title, { includePrint: false }), {
        blockedMessage: "La fen\u00eatre d'archive a \u00e9t\u00e9 bloqu\u00e9e par le navigateur."
      });
    }

    function buildResultArchiveHtmlFromRows(rows, archive = {}, options = {}) {
      return livePalmesAdminArchives.buildResultArchiveHtmlFromRows(rows, archive, {
        ...options,
        meet: getData().meet,
        helpers: {
          finalRowsCount,
          formatAlertDateTime,
          sexDisplayLabel
        }
      });
    }

    function printResultArchiveRows(rows, archive = {}) {
      livePalmesExportActions.openHtmlWindow(buildResultArchiveHtmlFromRows(rows, archive), {
        blockedMessage: "La fen\u00eatre PDF a \u00e9t\u00e9 bloqu\u00e9e par le navigateur.",
        print: true
      });
    }

    function openResultArchiveRows(rows, archive = {}) {
      livePalmesExportActions.openHtmlWindow(buildResultArchiveHtmlFromRows(rows, archive, { includePrint: false }), {
        blockedMessage: "La fen\u00eatre d'archive a \u00e9t\u00e9 bloqu\u00e9e par le navigateur."
      });
    }

    async function exportDsqPdf() {
      try {
        await archiveCurrentHistory();
      } catch (error) {
        const ok = window.confirm(`Impossible d'archiver le journal avant export. Continuer quand m\u00eame l'export PDF ?`);
        if (!ok) return;
      }
      printDsqRows(dsqReportRows(), "Journal d'arbitrage");
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    return {
      downloadJson,
      dsqReportRows,
      buildDsqReportHtml,
      buildDsqReportHtmlFromRows,
      printDsqRows,
      openDsqRows,
      buildResultArchiveHtmlFromRows,
      printResultArchiveRows,
      openResultArchiveRows,
      exportDsqPdf,
      escapeHtml
    };
  }

  window.LivePalmesExportReportsWorkflow = { init };
})();
