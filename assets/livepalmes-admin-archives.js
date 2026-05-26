(function attachLivePalmesAdminArchives(global) {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function reportPrintStyles() {
    return `
      <style>
        @page { margin: 12mm; }
        body { font-family: Arial, sans-serif; color: #15232d; font-size: 11px; }
        h1 { margin: 0 0 4px; font-size: 18px; }
        p { margin: 0 0 10px; color: #52616b; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #d8e0e6; padding: 5px 6px; vertical-align: top; text-align: left; }
        th { background: #eef4f7; font-size: 10px; text-transform: uppercase; }
        td:first-child { width: 24px; text-align: center; font-weight: 700; }
        small { color: #60717c; font-size: 10px; }
        .empty { text-align: center; color: #60717c; }
        .print-actions { margin-bottom: 10px; }
        button { min-height: 32px; padding: 0 10px; border: 1px solid #b9c8d1; border-radius: 6px; background: #eef4f7; font-weight: 700; cursor: pointer; }
        @media print { .print-actions { display: none; } body { font-size: 10px; } }
      </style>
    `;
  }

  function generatedLabel() {
    return new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function buildDsqReportHtmlFromRows(rows, title = "Journal d'arbitrage", options = {}) {
    const includePrint = options.includePrint !== false;
    const helpers = options.helpers || {};
    const data = options.data || {};
    const meetName = `${data.meet?.name || "Compétition"}${data.meet?.city ? ` - ${data.meet.city}` : ""}`;
    const body = rows.length ? rows.map((alert, index) => {
      const event = (data.events || []).find((item) => item.id === alert.eventId);
      const sexLabel = alert.sex === "F" ? "Femmes" : (alert.sex === "M" ? "Hommes" : "Mixte");
      const seriesLabel = alert.stage && helpers.isFinalStage?.(alert.stage) ? helpers.finalStageLabel(alert.stage) : `Série ${alert.series || "-"}`;
      const sessionLabel = alert.session && alert.session !== "all" ? `Session ${alert.session}` : "Session -";
      const club = helpers.alertClubShortLabel?.(alert) || "";
      const identity = `${alert.displayName || "Concurrent"}${club ? ` - ${club}` : ""}`;
      const timeline = (helpers.alertTimelineItems?.(alert) || [])
        .map(([label, value]) => `${label} ${helpers.formatAlertDateTime?.(value) || value || ""}`)
        .join(" | ");
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(event?.label || alert.eventId)} ${escapeHtml(sexLabel)}<br><small>${escapeHtml(sessionLabel)} - ${escapeHtml(seriesLabel)} - ligne ${escapeHtml(alert.line || "-")}</small></td>
          <td>${escapeHtml(identity)}</td>
          <td>${escapeHtml(helpers.decisionMotifLabel?.(alert) || alert.type || "")}<br><small>${escapeHtml(helpers.alertStatusLabel?.(alert) || "")}</small></td>
          <td>${escapeHtml(timeline || "-")}</td>
        </tr>
      `;
    }).join("") : `<tr><td colspan="5" class="empty">Aucune action d'arbitrage enregistrée.</td></tr>`;
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Journal d'arbitrage</title>
  ${reportPrintStyles()}
</head>
<body>
  ${includePrint ? `<div class="print-actions"><button onclick="window.print()">Enregistrer en PDF</button></div>` : ""}
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(meetName)} - généré le ${escapeHtml(generatedLabel())} - ${rows.length} lignes</p>
  <table>
    <thead>
      <tr><th>#</th><th>Course / session</th><th>Nageur / relais</th><th>Décision / action</th><th>Vie de la décision</th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
  }

  function buildResultArchiveHtmlFromRows(rows, archive = {}, options = {}) {
    const includePrint = options.includePrint !== false;
    const helpers = options.helpers || {};
    const meet = archive.meet || options.meet || {};
    const meetName = `${meet.name || "Compétition"}${meet.city ? ` - ${meet.city}` : ""}`;
    const body = rows.length ? rows
      .slice()
      .sort((a, b) => String(a.session || "").localeCompare(String(b.session || ""), "fr", { numeric: true }) || String(a.eventLabel || "").localeCompare(String(b.eventLabel || "")))
      .map((result, index) => {
        const sexLabel = result.sexLabel || helpers.sexDisplayLabel?.(result.sex) || "";
        const finalistCount = helpers.finalRowsCount?.(result.finalists) || 0;
        const withdrawalCount = (result.finalWithdrawals || []).filter((item) => item.withdrawnAt).length;
        const status = result.hasFinal
          ? (result.finalistsAnnouncedAt ? "Publié avec finalistes" : "En attente annonce speaker")
          : "Publié";
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(result.eventLabel || result.eventId || "-")} ${escapeHtml(sexLabel)}<br><small>Session ${escapeHtml(result.session || "-")}</small></td>
            <td>${escapeHtml(status)}${result.isPartial ? "<br><small>Résultat partiel</small>" : ""}</td>
            <td>${result.id ? `<a href="pdf.html?type=resultat&id=${encodeURIComponent(result.id)}" target="_blank" rel="noopener">${escapeHtml(result.pdfName || "Ouvrir le PDF")}</a>` : escapeHtml(result.pdfName || "-")}</td>
            <td>${finalistCount ? `${escapeHtml(String(finalistCount))} finaliste${finalistCount > 1 ? "s" : ""}${withdrawalCount ? `<br><small>${escapeHtml(String(withdrawalCount))} forfait${withdrawalCount > 1 ? "s" : ""}</small>` : ""}` : "-"}</td>
          </tr>
        `;
      }).join("") : `<tr><td colspan="5" class="empty">Aucun résultat archivé.</td></tr>`;
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Archive résultats publics</title>
  ${reportPrintStyles()}
</head>
<body>
  ${includePrint ? `<div class="print-actions"><button onclick="window.print()">Enregistrer en PDF</button></div>` : ""}
  <h1>Archive résultats publics</h1>
  <p>${escapeHtml(meetName)} - archive du ${escapeHtml(archive.createdLabel || helpers.formatAlertDateTime?.(archive.createdAt) || "-")} - généré le ${escapeHtml(generatedLabel())} - ${rows.length} résultats</p>
  <table>
    <thead>
      <tr><th>#</th><th>Course / session</th><th>Statut</th><th>PDF</th><th>Finales</th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
  }

  global.LivePalmesAdminArchives = {
    buildDsqReportHtmlFromRows,
    buildResultArchiveHtmlFromRows
  };
})(window);
