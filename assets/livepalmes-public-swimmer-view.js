(function attachLivePalmesPublicSwimmerView(global) {
  function create(helpers = {}) {
    const cleanText = helpers.cleanText || ((value) => String(value ?? ""));
    const normalizeText = helpers.normalizeText || ((value) => cleanText(value).toLowerCase().trim());
    const escapeHtmlFallback = helpers.escapeHtmlFallback || ((value) => String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;"));
    const categoryLabel = helpers.categoryLabel || ((category) => cleanText(category || ""));
    const categoryClass = helpers.categoryClass || (() => "cat-other");
    const birthYearLabel = helpers.birthYearLabel || (() => "");
    const clubLabel = helpers.clubLabel || (() => "");
    const swimmerName = helpers.swimmerName || (() => "Nageur");
    const swimmerKey = helpers.swimmerKey || (() => "");
    const isForfait = helpers.isForfait || (() => false);
    const performancesForProgramRow = helpers.performancesForProgramRow || (() => []);
    const resultPdfLinksForProgramRow = helpers.resultPdfLinksForProgramRow || (() => []);
    const resultPdfLabel = helpers.resultPdfLabel || (() => "PDF");
    const isFinalStage = helpers.isFinalStage || (() => false);
    const performanceDeltaLabel = helpers.performanceDeltaLabel || (() => "");
    const seedLabel = helpers.seedLabel || (() => "");
    const lineLabel = helpers.lineLabel || (() => "-");
    const performanceInlinePhaseLabel = helpers.performanceInlinePhaseLabel || (() => "serie");
    const performanceValueLabel = helpers.performanceValueLabel || (() => "-");

    function swimmerCategoryBirthHtml(row, options = {}) {
      const escapeHtml = options.escapeHtml || escapeHtmlFallback;
      const category = categoryLabel(row?.category, row?.sex);
      const birthYear = birthYearLabel(row);
      if (!category && !birthYear) return "-";
      return [
        category ? `<span class="public-swimmer-category ${categoryClass(row?.category)}">${escapeHtml(category)}</span>` : "",
        birthYear ? `<span class="public-swimmer-birth">&middot; ${escapeHtml(birthYear)}</span>` : ""
      ].filter(Boolean).join("");
    }

    function renderSwimmerResultPdfLinks(row, performances = [], options = {}) {
      const escapeHtml = options.escapeHtml || escapeHtmlFallback;
      const results = resultPdfLinksForProgramRow(row, performances, options);
      if (!results.length) return "";
      return `
        <span class="public-swimmer-pdf-actions">
          ${results.map((result) => `
            <a class="public-swimmer-pdf-link" href="pdf.html?type=resultat&id=${encodeURIComponent(result.id || "")}" aria-label="Voir le PDF r&eacute;sultat">
              ${escapeHtml(resultPdfLabel(result))}
            </a>
          `).join("")}
        </span>
      `;
    }

    function renderPerformanceLines(row, options = {}) {
      const escapeHtml = options.escapeHtml || escapeHtmlFallback;
      const performances = options.performances || performancesForProgramRow(row, options);
      if (!performances.length) return "";
      const engagementReference = seedLabel(row, options.entrants || []);
      let seriesReference = "";
      return performances.map((performance) => {
        const final = isFinalStage(performance.stage);
        const reference = final ? seriesReference : engagementReference;
        const delta = performanceDeltaLabel(performance, reference, final ? "s\u00e9rie" : "eng.");
        if (!final && performance.time) seriesReference = performance.time;
        return `
          <span class="public-performance-line">
            R&eacute;alis&eacute; ${escapeHtml(performanceInlinePhaseLabel(performance))} : <strong>${escapeHtml(performanceValueLabel(performance))}</strong>
            ${delta ? `<em class="public-performance-delta ${delta.startsWith("-") ? "faster" : "slower"}">${escapeHtml(delta)}</em>` : ""}
          </span>
        `;
      }).join("");
    }

    function renderSwimmerProgramMeta(row, options = {}) {
      const escapeHtml = options.escapeHtml || escapeHtmlFallback;
      const performances = options.performances || performancesForProgramRow(row, options);
      const engagement = options.forfait ? "Forfait" : (seedLabel(row, options.entrants || []) || "-");
      if (performances.length) {
        return `<span class="public-entry-line">Engagement : ${escapeHtml(engagement)}</span>`;
      }
      return `<span>S&eacute;rie ${escapeHtml(row?.series || "-")} &middot; Ligne ${escapeHtml(lineLabel(row))} &middot; Engagement : ${escapeHtml(engagement)}</span>`;
    }

    function renderProgramRow(row, options = {}) {
      const escapeHtml = options.escapeHtml || escapeHtmlFallback;
      const rowStartTime = options.rowStartTime || ((item) => item?.startTime || "");
      const eventLabel = options.eventLabel || ((eventId, fallback = "") => cleanText(fallback || eventId || "Course"));
      const sexLabel = options.sexLabel || ((sex) => sex === "F" ? "Femmes" : (sex === "M" ? "Hommes" : "Mixte"));
      const rowIsForfait = options.isForfait || isForfait;
      const time = row.startTime || rowStartTime(row);
      const forfait = rowIsForfait(row);
      const performances = performancesForProgramRow(row, options);
      const timeLabel = performances.length ? "" : (time ? ` &middot; ${escapeHtml(time)}` : "");
      return `
        <div class="public-swimmer-program-row ${forfait ? "is-forfait" : ""}">
          <div class="public-swimmer-program-row-head">
            <strong>S${escapeHtml(row.session || "-")}${timeLabel} &middot; ${escapeHtml(eventLabel(row.eventId, row.label))} ${escapeHtml(sexLabel(row.sex))}</strong>
            ${renderSwimmerResultPdfLinks(row, performances, options)}
          </div>
          ${renderSwimmerProgramMeta(row, { ...options, forfait, performances })}
          ${renderPerformanceLines(row, { ...options, performances })}
        </div>
      `;
    }

    function renderInlineSwimmerProgram(key, options = {}) {
      const escapeHtml = options.escapeHtml || escapeHtmlFallback;
      const rows = options.rows || [];
      const swimmer = rows[0];
      if (!swimmer) return "";
      const programHead = `
        <div class="public-search-program-head">
          <span>${escapeHtml(clubLabel(swimmer, options.entrants || []) || "-")}</span>
          <strong>${escapeHtml(swimmerName(swimmer, options.entrants || []))}</strong>
          <em>${swimmerCategoryBirthHtml(swimmer, options)}</em>
        </div>
      `;
      if (options.loading) {
        return `
          <div class="public-search-program">
            ${programHead}
            <p class="panel-subtitle public-search-empty">Chargement des temps du nageur...</p>
          </div>
        `;
      }
      return `
        <div class="public-search-program">
          ${programHead}
          <div class="public-swimmer-program">
            ${rows.map((row) => renderProgramRow(row, options)).join("")}
          </div>
        </div>
      `;
    }

    function renderSwimmerProgramRows(rows = [], options = {}) {
      return rows.map((row) => renderProgramRow(row, options)).join("");
    }

    function renderSwimmerSheetProgram(key, options = {}) {
      const escapeHtml = options.escapeHtml || escapeHtmlFallback;
      const rows = options.rows || [];
      const swimmer = rows[0];
      if (!swimmer) return "";
      return `
        <div class="public-swimmer-head">
          <div>
            <span>${escapeHtml(clubLabel(swimmer, options.entrants || []))}</span>
            <h2>${escapeHtml(swimmerName(swimmer, options.entrants || []))}</h2>
            <em>${swimmerCategoryBirthHtml(swimmer, options)}</em>
          </div>
          <button class="${escapeHtml(options.closeButtonClass || "decision-close")}" type="button" ${options.closeAttr || "data-close-swimmer"} aria-label="Fermer">&times;</button>
        </div>
        ${options.subtitle ? `<p class="panel-subtitle">${options.subtitle}</p>` : ""}
        <div class="public-swimmer-program">
          ${options.loading
            ? `<p class="panel-subtitle public-search-empty">Chargement des temps du nageur...</p>`
            : renderSwimmerProgramRows(rows, options)}
        </div>
      `;
    }

    function renderSwimmerSheet(key, options = {}) {
      const escapeHtml = options.escapeHtml || escapeHtmlFallback;
      const closeAttr = String(options.closeAttr || "data-close-swimmer").replace(/[^\w:-]/g, "") || "data-close-swimmer";
      const panelClass = ["public-swimmer-panel", options.panelClass || ""].filter(Boolean).join(" ");
      const content = options.content || renderSwimmerSheetProgram(key, { ...options, closeAttr });
      if (!content) return "";
      const closeButton = options.content
        ? `<button class="${escapeHtml(options.closeButtonClass || "public-swimmer-close")}" type="button" ${closeAttr} aria-label="Fermer">&times;</button>`
        : "";
      const panelTag = options.panelTag || "section";
      return `
        <div class="public-swimmer-backdrop" ${closeAttr}></div>
        <${panelTag} class="${escapeHtml(panelClass)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(options.label || "Fiche nageur")}">
          ${closeButton}
          ${content}
        </${panelTag}>
      `;
    }

    function renderSwimmerSearchContent(options = {}) {
      const escapeHtml = options.escapeHtml || escapeHtmlFallback;
      const query = options.query || "";
      const selectedKey = options.selectedKey || "";
      const renderProgram = options.renderProgram || (() => "");
      const matches = options.matches || [];
      if (selectedKey) return renderProgram(selectedKey);
      if (normalizeText(query).length < 2) {
        return `<p class="panel-subtitle public-search-empty">Tape au moins 2 lettres pour chercher un nageur.</p>`;
      }
      if (!matches.length) {
        return `<p class="panel-subtitle public-search-empty">Aucun nageur trouv&eacute;.</p>`;
      }
      return `
        <div class="public-search-results" aria-label="Nageurs trouv&eacute;s">
          ${matches.map((row) => {
            const key = swimmerKey(row);
            return `
              <button class="public-search-result ${key === selectedKey ? "active" : ""}" type="button" data-search-swimmer-key="${escapeHtml(key)}">
                <strong>${escapeHtml(swimmerName(row, options.entrants || []))}</strong>
                <span>${escapeHtml(clubLabel(row, options.entrants || []) || "-")}</span>
              </button>
            `;
          }).join("")}
        </div>
      `;
    }

    function renderSwimmerSearchSection(options = {}) {
      const escapeHtml = options.escapeHtml || escapeHtmlFallback;
      if (options.hidden) return "";
      return `
        <section class="panel public-swimmer-search-panel">
          <label class="public-swimmer-search">
            <span>Recherche nageur</span>
            <input id="publicSwimmerSearchInput" type="search" inputmode="search" autocomplete="off" placeholder="Nom ou club" value="${escapeHtml(options.query || "")}">
          </label>
          <div id="publicSwimmerSearchOutput" class="public-swimmer-search-output">
            ${renderSwimmerSearchContent(options)}
          </div>
        </section>
      `;
    }

    return {
      renderInlineSwimmerProgram,
      renderPerformanceLines,
      renderSwimmerSheet,
      renderSwimmerProgramRows,
      renderSwimmerSearchContent,
      renderSwimmerSearchSection,
      renderSwimmerProgramMeta,
      renderSwimmerResultPdfLinks,
      swimmerCategoryBirthHtml
    };
  }

  global.LivePalmesPublicSwimmerView = { create };
})(window);
