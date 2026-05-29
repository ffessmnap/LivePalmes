(function attachLivePalmesResultDetailView(global) {
  function create(helpers = {}) {
    const escapeHtml = helpers.escapeHtml || ((value) => String(value ?? ""));
    const finalistRowName = helpers.finalistRowName || ((row) => row?.displayName || row?.name || "");
    const sexDisplayLabel = helpers.sexDisplayLabel || ((sex) => sex || "");

    function rowName(row) {
      return finalistRowName(row) || row?.displayName || row?.name || [row?.lastName, row?.firstName].filter(Boolean).join(" ") || "Concurrent";
    }

    function rowValue(row) {
      const status = String(row?.resultStatus || row?.status || "").trim().toLowerCase();
      if (status === "dsq") return "DSQ";
      if (status === "ab" || status === "abd") return "ABD";
      if (status === "dns") return "Forfait";
      return String(row?.statusLabel || row?.time || "").trim();
    }

    function timeValue(row) {
      const text = String(row?.time || "").trim();
      if (!text) return Number.POSITIVE_INFINITY;
      const parts = text.split(":");
      const last = parts.pop() || "0";
      const seconds = Number(last.replace(",", "."));
      if (!Number.isFinite(seconds)) return Number.POSITIVE_INFINITY;
      const minutes = parts.length ? Number(parts.pop() || 0) : 0;
      const hours = parts.length ? Number(parts.pop() || 0) : 0;
      return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }

    function isFinalStage(stage) {
      return String(stage || "").toLowerCase().includes("final");
    }

    function detailRows(result) {
      const rankingRows = Array.isArray(result?.ranking) ? result.ranking : [];
      const sourceRows = rankingRows.length ? rankingRows : (Array.isArray(result?.performances) ? result.performances : []);
      return [...sourceRows].sort((a, b) => {
        if (result?.isPartial) {
          return timeValue(a) - timeValue(b) || rowName(a).localeCompare(rowName(b), "fr");
        }
        if (isFinalStage(result?.stage)) {
          return Number(a.sourceIndex ?? 9999) - Number(b.sourceIndex ?? 9999) ||
            Number(a.rank || 9999) - Number(b.rank || 9999);
        }
        return Number(a.rank || 9999) - Number(b.rank || 9999) ||
          Number(a.sourceIndex ?? 9999) - Number(b.sourceIndex ?? 9999);
      });
    }

    function rowCategoryTitle(row) {
      return String(row?.categoryLabel || row?.category || "").trim();
    }

    function categoryGroups(rows = []) {
      const groups = [];
      const byTitle = new Map();
      rows.forEach((row) => {
        const title = rowCategoryTitle(row);
        const key = title || "__uncategorized";
        if (!byTitle.has(key)) {
          const group = { title, rows: [] };
          byTitle.set(key, group);
          groups.push(group);
        }
        byTitle.get(key).rows.push(row);
      });
      return groups;
    }

    function renderRows(title, rows = [], options = {}) {
      if (!rows.length) return "";
      const ordered = options.ordered !== false;
      const items = rows.map((row, index) => {
        const closed = Boolean(row.resultStatus || row.status);
        const rank = closed ? "" : (row.rank || (ordered ? index + 1 : ""));
        const value = rowValue(row);
        const label = [
          rank ? `${rank}. ${rowName(row)}` : rowName(row),
          row.club,
          row.birthYear ? `(${row.birthYear})` : "",
          value
        ].filter(Boolean).join(" - ");
        return `
          <li ${ordered && rank ? `value="${escapeHtml(rank)}"` : ""} class="${closed ? "closed" : ""}">
            <div>
              <span>${escapeHtml(label)}</span>
            </div>
          </li>
        `;
      }).join("");
      return `
        <div class="final-withdrawal-group">
          <strong>${escapeHtml(title)}</strong>
          <ol>
            ${items}
          </ol>
        </div>
      `;
    }

    function detailGroups(result, rows = []) {
      if (!isFinalStage(result?.stage)) {
        const baseTitle = result.isPartial ? "Resultat partiel" : "Resultats de la course";
        const groups = categoryGroups(rows);
        if (groups.length > 1 || groups.some((group) => group.title)) {
          return groups.map((group) => ({
            title: group.title ? `${baseTitle} - ${group.title}` : baseTitle,
            rows: group.rows
          }));
        }
        return [{ title: baseTitle, rows }];
      }
      if (rows.length <= 8) {
        const phase = String(result.phaseLabel || "").trim();
        const title = /finale\s+[ab]/i.test(phase)
          ? `Resultats ${phase}`
          : (String(result.stage || "").toLowerCase().includes("b") ? "Resultats Finale B" : "Resultats Finale A");
        return [{ title, rows }];
      }
      const byRankA = rows.filter((row) => Number(row.rank || 0) >= 1 && Number(row.rank || 0) <= 8);
      const byRankB = rows.filter((row) => Number(row.rank || 0) >= 9 && Number(row.rank || 0) <= 16);
      const finalA = byRankA.length ? byRankA : rows.slice(0, 8);
      const finalB = byRankB.length ? byRankB : rows.slice(8, 16);
      return [
        { title: "Resultats Finale A", rows: finalA },
        { title: "Resultats Finale B", rows: finalB }
      ].filter((group) => group.rows.length);
    }

    function renderModalHtml(result) {
      const rows = detailRows(result);
      const rowsHtml = detailGroups(result, rows)
        .map((group) => renderRows(group.title, group.rows, { ordered: !result.isPartial }))
        .join("");
      const pdfLink = result.id
        ? `<a class="ghost-button compact confirm-button" href="pdf.html?type=resultat&id=${encodeURIComponent(result.id)}" target="_blank" rel="noopener">PDF</a>`
        : "";
      return `
        <div class="decision-dialog alert-detail-dialog final-withdrawal-dialog result-detail-dialog" role="dialog" aria-modal="true" aria-label="Detail du resultat">
          <div class="decision-modal-head">
            <div>
              <span>Bureau des performances</span>
              <h2>${escapeHtml(result.isPartial ? "Resultat partiel" : "Resultat publie")}</h2>
              <p>${escapeHtml(result.eventLabel || result.eventId)} ${escapeHtml(result.sexLabel || sexDisplayLabel(result.sex))}${result.phaseLabel ? ` - ${escapeHtml(result.phaseLabel)}` : ""}</p>
            </div>
            <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
          </div>
          <div class="final-withdrawal-list">
            ${rowsHtml || `<p class="panel-subtitle">Aucun detail de resultat lu pour cette course.</p>`}
          </div>
          <div class="decision-actions">
            ${pdfLink}
            <button class="ghost-button" type="button" data-close-alert-detail>Fermer</button>
          </div>
        </div>
      `;
    }

    return {
      detailGroups,
      detailRows,
      renderModalHtml,
      renderRows
    };
  }

  global.LivePalmesResultDetailView = { create };
})(window);
