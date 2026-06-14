(function attachLivePalmesResultDetailView(global) {
  function create(helpers = {}) {
    const escapeHtml = helpers.escapeHtml || ((value) => String(value ?? ""));
    const finalistRowName = helpers.finalistRowName || ((row) => row?.displayName || row?.name || "");
    const sexDisplayLabel = helpers.sexDisplayLabel || ((sex) => sex || "");

    function rowName(row) {
      let name = finalistRowName(row) || row?.displayName || row?.name || [row?.lastName, row?.firstName].filter(Boolean).join(" ") || "Concurrent";
      const club = String(row?.club || "").trim();
      if (row?.relay || legacyRelayCodeFromRow(row)) {
        name = String(name || "").replace(/\s+(?:[FHX](?:MI|CA|JU|SE|MA|\d{2,3}\+?)|X\d{2,3}\+?|X\d{3})\s*$/i, "").trim();
        if (club) name = name.replace(new RegExp(`\\s+${club.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i"), "").trim();
      }
      return name || "Concurrent";
    }

    function rowValue(row) {
      const status = String(row?.resultStatus || row?.status || "").trim().toLowerCase();
      if (status === "dsq") return "DSQ";
      if (status === "ab" || status === "abd") return "ABD";
      if (status === "dns") return "Forfait";
      const value = String(row?.statusLabel || row?.time || "").trim();
      const points = String(row?.points || "").trim();
      return points && value ? `${value} (${points} pts)` : (value || (points ? `${points} pts` : ""));
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
      const section = String(row?.sectionCategoryLabel || row?.sectionCategory || "").trim();
      if (/^R\s*\d{3}$/i.test(section)) return section.replace(/\s+/g, "").toUpperCase();
      const direct = String(row?.categoryLabel || row?.category || "").trim();
      if (/^R\s*\d{3}$/i.test(direct)) return direct.replace(/\s+/g, "").toUpperCase();
      const name = String(finalistRowName(row) || row?.displayName || row?.name || "").trim();
      const codeMatch = name.match(/\bX(140|160|180|220)\b/i) || String(row?.categoryCode || "").match(/^X(140|160|180|220)$/i);
      if (row?.relay && codeMatch) return `R${codeMatch[1]}`;
      return direct;
    }

    function legacyRelayCodeFromRow(row = {}) {
      const text = [row.displayName, row.name, row.lastName, row.categoryCode]
        .map((value) => String(value || "").trim().toUpperCase())
        .join(" ");
      return /\bX(?:MI|CA|JU|SE|MA|\d{2,3}\+?|\d{3})\b/.test(text);
    }

    function relayMasterSectionCodeFromRow(row = {}) {
      const direct = [row.sectionCategoryLabel, row.sectionCategory, row.categoryLabel, row.category]
        .map((value) => String(value || "").trim().toUpperCase().replace(/\s+/g, ""))
        .find((value) => /^R\d{3}$/.test(value));
      if (direct) return direct;
      const text = [row.displayName, row.name, row.lastName, row.categoryCode]
        .map((value) => String(value || "").trim().toUpperCase())
        .join(" ");
      const match = text.match(/\bX(140|160|180|220)\b/);
      return match ? `R${match[1]}` : "";
    }

    function inferRelayMasterSectionLabels(groups = []) {
      const labels = groups.map((group) => group.label || "");
      if (!labels.some(Boolean)) return labels;
      if (groups.length === 3 && labels[0] === "R220" && labels[2] === "R140") return ["R220", "R180", "R140"];
      if (groups.length === 4 && labels[0] === "R220" && labels[3] === "R140") return ["R220", "R180", "R160", "R140"];
      return labels;
    }

    function hydrateLegacyRelayMasterSections(rows = []) {
      if (!rows.length || rows.some((row) => /^R\d{3}$/i.test(String(row?.sectionCategoryLabel || row?.sectionCategory || "").trim()))) {
        return rows;
      }
      const relayRows = rows.filter((row) => row?.relay || legacyRelayCodeFromRow(row));
      if (relayRows.length < 2) return rows;
      const sourceRows = rows.some((row) => Number.isFinite(Number(row?.sourceIndex)))
        ? [...rows].sort((a, b) => Number(a?.sourceIndex ?? 9999) - Number(b?.sourceIndex ?? 9999))
        : rows;
      const groups = [];
      let current = null;
      sourceRows.forEach((row) => {
        const startsSection = current && Number(row?.rank || 0) === 1 && legacyRelayCodeFromRow(row);
        if (!current || startsSection) {
          current = { rows: [], label: "" };
          groups.push(current);
        }
        current.rows.push(row);
        current.label = current.label || relayMasterSectionCodeFromRow(row);
      });
      if (groups.length < 2) return rows;
      const labels = inferRelayMasterSectionLabels(groups);
      return sourceRows.map((row) => {
        const groupIndex = groups.findIndex((group) => group.rows.includes(row));
        const label = labels[groupIndex] || groups[groupIndex]?.label || "";
        if (!label || !/^R\d{3}$/.test(label)) return row;
        return {
          ...row,
          categoryCode: label,
          category: label,
          categoryLabel: label,
          sectionCategory: label,
          sectionCategoryLabel: label
        };
      });
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

    function renderRelayLegs(row) {
      const legs = Array.isArray(row?.relayLegs) ? row.relayLegs.filter((leg) => leg?.name || leg?.time) : [];
      if (!legs.length) return "";
      return `
        <small class="result-detail-relay-legs">
          ${legs.map((leg, index) => `
            <span>${escapeHtml(`${index + 1}. ${[leg.name, leg.time].filter(Boolean).join(" ")}`)}</span>
          `).join("")}
        </small>
      `;
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
              ${renderRelayLegs(row)}
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
        const groups = categoryGroups(hydrateLegacyRelayMasterSections(rows));
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
