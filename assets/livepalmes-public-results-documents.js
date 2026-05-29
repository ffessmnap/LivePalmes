(function attachLivePalmesPublicResultsDocuments(global) {
  const publicSwimmers = global.LivePalmesPublicSwimmers || {};
  const escapeHtmlFallback = publicSwimmers.escapeHtml || ((value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;"));

  function sessionResultsPdfsForSession(session, options = {}) {
    return (options.sessionResultsPdfs || [])
      .filter((pdf) =>
        pdf.scope === "full" ||
        (pdf.sessions || []).map(String).includes(String(session || "")) ||
        String(pdf.session || "") === String(session || "")
      )
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }

  function renderSeriesPdfLink(session, options = {}) {
    const escapeHtml = options.escapeHtml || escapeHtmlFallback;
    const formatDate = options.formatDate || ((value) => String(value || ""));
    const pdfHref = options.pdfHref || ((type, id) => `pdf.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id || "")}`);
    const pdf = publicSwimmers.seriesPdfForSession(options.seriesPdfs || [], session);
    if (!pdf) return "";
    const label = pdf.scope === "session" ? `S&eacute;ries publi&eacute;es - session ${session}` : "S&eacute;ries publi&eacute;es compl&egrave;tes";
    const updated = pdf.updatedAt ? `Mis &agrave; jour le ${formatDate(pdf.updatedAt)}` : "";
    return `
      <div class="public-series-pdf public-series-program-pdf">
        <div>
          <span class="public-document-kind">S&eacute;ries</span>
          <strong>${label}</strong>
          ${updated ? `<span>${escapeHtml(updated)}</span>` : ""}
        </div>
        <a class="ghost-button compact" href="${escapeHtml(pdfHref("series", pdf.id || ""))}">Voir les s&eacute;ries</a>
      </div>
    `;
  }

  function renderSessionResultsPdfLinks(session, options = {}) {
    const escapeHtml = options.escapeHtml || escapeHtmlFallback;
    const pdfHref = options.pdfHref || ((type, id) => `pdf.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id || "")}`);
    const pdfs = sessionResultsPdfsForSession(session, options);
    if (!pdfs.length) return "";
    return `
      <div class="public-series-pdf public-session-results-pdf">
        <div>
          <span class="public-document-kind">R&eacute;sultats</span>
          <strong>R&eacute;sultats complets</strong>
          <span>${escapeHtml(pdfs.length > 1 ? `${pdfs.length} PDF disponibles` : (pdfs[0].sourceLabel || "PDF de consultation"))}</span>
        </div>
        <div class="public-pdf-link-actions">
          ${pdfs.map((pdf) => `
            <a class="ghost-button compact confirm-button" href="${escapeHtml(pdfHref("session-result", pdf.id || ""))}">
              ${escapeHtml(pdfs.length > 1 ? (pdf.sourceLabel || "Voir") : "Voir")}
            </a>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderPublicDocumentsSection(documentsHtml) {
    if (!documentsHtml) return "";
    return `
      <div class="public-results-section-title public-documents-title">
        <h3>Documents</h3>
        <span>S&eacute;ries et PDF publi&eacute;s</span>
      </div>
      <section class="public-documents-section" aria-label="Documents de la session">
        ${documentsHtml}
      </section>
    `;
  }

  function renderSessionResultsPdfSection(session, options = {}) {
    const pdfLinks = renderSessionResultsPdfLinks(session, options);
    if (!pdfLinks) return "";
    return `
      <div class="public-results-section-title public-documents-title">
        <h3>R&eacute;sultats complets</h3>
        <span>PDF de la session</span>
      </div>
      <section class="public-documents-section public-session-results-section" aria-label="PDF r&eacute;sultats de la session">
        ${pdfLinks}
      </section>
    `;
  }

  global.LivePalmesPublicResultsDocuments = {
    renderPublicDocumentsSection,
    renderSeriesPdfLink,
    renderSessionResultsPdfLinks,
    renderSessionResultsPdfSection,
    sessionResultsPdfsForSession
  };
})(window);
