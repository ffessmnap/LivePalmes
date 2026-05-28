(function () {
  const context = {};
  let api;
  let alertDetailModal;
  let alerts;
  let canWithdrawBeforeReplacementAnnouncement;
  let canWithdrawFinalist;
  let escapeHtml;
  let finalRowCountsAsFinalist;
  let finalistRowName;
  let finalWithdrawalLimitDate;
  let finalWithdrawalLimitLabel;
  let formatDeadlineTime;
  let hasFinalWithdrawalDeadline;
  let isFinalWithdrawalDeadlineExpired;
  let livePalmesAlertDetailView;
  let livePalmesSecretaryFinals;
  let markAlertAlreadyClosedError;
  let markSpeakerAlertDoneLocally;
  let normalizePersonName;
  let publishPublicResultsIndex;
  let raceResults;
  let render;
  let replacementAlertMatches;
  let resultParserFunction;
  let resultParserOptions;
  let resultsCollection;
  let saveAlerts;
  let sexDisplayLabel;
  let syncAlertChangesToFirestoreStrict;
  let syncAlertToFirestore;

  function finalRowKey(row) {
    return resultParserFunction("finalRowKey")(row, resultParserOptions());
  }
  
  function finalRowOrderValue(row, fallback = 9999) {
    return resultParserFunction("finalRowOrderValue")(row, fallback, resultParserOptions());
  }
  
  function sortedFinalRows(rows = []) {
    return resultParserFunction("sortedFinalRows")(rows, resultParserOptions());
  }
  
  function normalizeFinalistsOrder(finalists = {}) {
    return resultParserFunction("normalizeFinalistsOrder")(finalists, resultParserOptions());
  }
  
  function activeFinalPreWithdrawals(result) {
    return (result?.finalPreWithdrawals || []).filter((item) => !item.cancelledAt);
  }
  
  function finalPreWithdrawalForRow(result, row) {
    const key = finalRowKey(row);
    return activeFinalPreWithdrawals(result).find((item) => item.rowKey === key);
  }
  
  function isFinalPreWithdrawn(result, row) {
    return Boolean(finalPreWithdrawalForRow(result, row));
  }
  
  function availableReplacementForResult(result, finalists) {
    const used = new Set(["a", "b"].flatMap((finalKey) => (finalists?.[finalKey] || []).map(finalRowKey)));
    return (result.nextUnqualified || []).find((row) => row.time && !row.resultStatus && !used.has(finalRowKey(row))) || null;
  }
  
  function buildReplacementFinalistRow(result, row, reference, now) {
    const preWithdrawal = finalPreWithdrawalForRow(result, row);
    return {
      ...row,
      qualified: true,
      repechaged: true,
      repechageAt: now,
      repechageAnnouncedAt: preWithdrawal ? now : "",
      withdrawnAt: preWithdrawal ? (preWithdrawal.at || now) : "",
      preWithdrawnAt: preWithdrawal ? (preWithdrawal.at || now) : "",
      replacesRank: reference?.rank || "",
      replacesName: finalistRowName(reference)
    };
  }
  
  function buildFinalWithdrawalEntry({ at, finalKey, withdrawn, replacement = null, promoted = null, preWithdrawal = false }) {
    return {
      at,
      final: String(finalKey || "").toUpperCase(),
      preWithdrawal,
      withdrawn: {
        rank: withdrawn?.rank || "",
        name: finalistRowName(withdrawn),
        club: withdrawn?.club || "",
        time: withdrawn?.time || ""
      },
      replacement: replacement ? {
        final: String(replacement.finalKey || finalKey || "").toUpperCase(),
        rank: replacement.row?.rank || "",
        name: finalistRowName(replacement.row),
        club: replacement.row?.club || "",
        time: replacement.row?.time || ""
      } : null,
      promoted: promoted ? {
        fromFinal: "B",
        toFinal: "A",
        rank: promoted.rank || "",
        name: finalistRowName(promoted),
        club: promoted.club || "",
        time: promoted.time || ""
      } : null
    };
  }
  
  function addReplacementChain(result, finalists, finalKey, firstReference, now) {
    const added = [];
    let reference = firstReference;
    while (true) {
      const row = availableReplacementForResult(result, finalists);
      if (!row) break;
      const finalistRow = buildReplacementFinalistRow(result, row, reference, now);
      finalists[finalKey].push(finalistRow);
      const item = {
        finalKey,
        row,
        finalistRow,
        reference,
        preWithdrawn: Boolean(finalistRow.withdrawnAt)
      };
      added.push(item);
      if (!item.preWithdrawn) break;
      reference = finalistRow;
    }
    return added;
  }
  
  function finalistRowsWithFinalKey(finalists = {}) {
    return ["a", "b"].flatMap((finalKey) =>
      (finalists?.[finalKey] || []).map((row) => ({ finalKey, row }))
    );
  }
  
  function finalistRowsMatch(a, b) {
    if (!a || !b) return false;
    if (finalRowKey(a) === finalRowKey(b)) return true;
    return normalizePersonName(finalistRowName(a)) === normalizePersonName(finalistRowName(b)) &&
      String(a.time || "") === String(b.time || "");
  }
  
  function findPreservedFinalistRow(existingRows, row) {
    return existingRows.find((item) => finalistRowsMatch(item.row, row))?.row || null;
  }
  
  function finalistPositionByRow(finalists, reference) {
    for (const finalKey of ["a", "b"]) {
      const index = (finalists?.[finalKey] || []).findIndex((row) => finalistRowsMatch(row, reference));
      if (index !== -1) return { finalKey, index };
    }
    return null;
  }
  
  function applyPreservedReplacementAnnouncement(row, existingRows) {
    const preserved = findPreservedFinalistRow(existingRows, row);
    if (!preserved) return row;
    if (preserved.repechageAnnouncedAt) row.repechageAnnouncedAt = preserved.repechageAnnouncedAt;
    if (preserved.repechageAt) row.repechageAt = preserved.repechageAt;
    return row;
  }
  
  function rebuildFinalistsFromParsedResult(parsedRows, existingResult, now) {
    const parsedHasFinalists = Boolean(parsedRows?.finalists?.a?.length || parsedRows?.finalists?.b?.length);
    if (!parsedHasFinalists) {
      return {
        finalists: existingResult?.finalists || { a: [], b: [] },
        nextUnqualified: parsedRows?.nextUnqualified?.length ? parsedRows.nextUnqualified : (existingResult?.nextUnqualified || []),
        finalWithdrawals: existingResult?.finalWithdrawals || []
      };
    }
    const finalists = {
      a: (parsedRows.finalists.a || []).map((row) => ({ ...row })),
      b: (parsedRows.finalists.b || []).map((row) => ({ ...row }))
    };
    const draftResult = {
      ...existingResult,
      finalists,
      nextUnqualified: parsedRows.nextUnqualified || [],
      finalPreWithdrawals: existingResult?.finalPreWithdrawals || []
    };
    const existingRows = finalistRowsWithFinalKey(existingResult?.finalists || {});
    const preservedWithdrawals = existingRows
      .filter((item) => item.row?.withdrawnAt)
      .sort((a, b) => String(a.row.withdrawnAt || "").localeCompare(String(b.row.withdrawnAt || "")));
    const finalWithdrawals = [];
    preservedWithdrawals.forEach(({ row: withdrawnReference }) => {
      const position = finalistPositionByRow(finalists, withdrawnReference);
      if (!position) return;
      const sourceRow = finalists[position.finalKey][position.index];
      const at = withdrawnReference.withdrawnAt || now;
      finalists[position.finalKey][position.index] = {
        ...sourceRow,
        withdrawnAt: at,
        preWithdrawnAt: withdrawnReference.preWithdrawnAt || sourceRow.preWithdrawnAt || ""
      };
      const withdrawn = finalists[position.finalKey][position.index];
      let promoted = null;
      let replacementFinalKey = position.finalKey;
      let replacementReference = withdrawn;
      if (position.finalKey === "a" && finalists.b.length) {
        const promotedIndex = firstActiveFinalistIndex(finalists.b);
        if (promotedIndex !== -1) {
          const promotedSource = finalists.b.splice(promotedIndex, 1)[0];
          promoted = {
            ...promotedSource,
            promotedFromFinal: "B",
            promotedAt: at,
            replacesRank: withdrawn.rank || "",
            replacesName: finalistRowName(withdrawn)
          };
          finalists.a.push(promoted);
          replacementFinalKey = "b";
          replacementReference = promotedSource;
        }
      }
      const replacements = addReplacementChain(draftResult, finalists, replacementFinalKey, replacementReference, at);
      replacements.forEach((item) => applyPreservedReplacementAnnouncement(item.finalistRow, existingRows));
      const firstReplacement = replacements[0] || null;
      finalWithdrawals.push(
        buildFinalWithdrawalEntry({
          at,
          finalKey: position.finalKey,
          withdrawn,
          replacement: firstReplacement,
          promoted
        }),
        ...replacements
          .filter((item) => item.preWithdrawn)
          .map((item, index) => buildFinalWithdrawalEntry({
            at: item.finalistRow.withdrawnAt || at,
            finalKey: item.finalKey,
            withdrawn: item.finalistRow,
            replacement: replacements[index + 1] || null,
            preWithdrawal: true
          }))
      );
      draftResult.finalists = finalists;
    });
    return {
      finalists: normalizeFinalistsOrder(finalists),
      nextUnqualified: parsedRows.nextUnqualified || [],
      finalWithdrawals
    };
  }
  
  function firstActiveFinalistIndex(rows = []) {
    let bestIndex = -1;
    let bestOrder = Infinity;
    rows.forEach((row, index) => {
      if (!row || row.withdrawnAt) return;
      const order = finalRowOrderValue(row, 20000 + index);
      if (order < bestOrder) {
        bestOrder = order;
        bestIndex = index;
      }
    });
    return bestIndex;
  }
  
  function finalCompositionRows(result) {
    const finalists = normalizeFinalistsOrder(result.finalists || {});
    const finalRows = ["a", "b"].flatMap((key) => (finalists[key] || []).map((row) => ({
      ...row,
      finalLabel: key.toUpperCase()
    })));
    return finalRows;
  }
  
  function finalCompositionKey(result) {
    return finalCompositionRows(result)
      .map((row) => [row.finalLabel, row.rank, finalistRowName(row), row.time, row.withdrawnAt ? "F" : "Q", row.repechaged ? "R" : ""].join("|"))
      .join(";");
  }
  
  function finalCompositionIsDefinitive(result, now = new Date()) {
    if (!result?.hasFinal || !result.finalistsAnnouncedAt) return false;
    const activeRows = finalCompositionRows(result).filter(finalRowCountsAsFinalist);
    if (!activeRows.length) return false;
    return activeRows.every((row) => {
      const limit = finalWithdrawalLimitDate(row, result);
      return Boolean(limit) && now > limit;
    });
  }
  
  function finalCompositionDefinitiveDate(result) {
    if (!result?.hasFinal || !result.finalistsAnnouncedAt) return null;
    const activeRows = finalCompositionRows(result).filter(finalRowCountsAsFinalist);
    const limits = activeRows
      .map((row) => finalWithdrawalLimitDate(row, result))
      .filter((date) => date && !Number.isNaN(date.getTime()));
    if (!activeRows.length || limits.length !== activeRows.length) return null;
    return new Date(Math.max(...limits.map((date) => date.getTime())));
  }
  
  function finalCompositionPendingDeadlineLabel(result) {
    if (!result?.finalistsAnnouncedAt) return "Définitif 30 min après annonce speaker";
    const activeRows = finalCompositionRows(result).filter(finalRowCountsAsFinalist);
    const unannouncedReplacementCount = activeRows.filter((row) => row.repechaged && !row.repechageAnnouncedAt).length;
    if (unannouncedReplacementCount > 1) return "Définitif 30 min après annonce des repêchés";
    if (unannouncedReplacementCount === 1) return "Définitif 30 min après annonce du repêché";
    return "Définitif après fin des délais de forfait";
  }
  
  function finalRowIndexByKey(finalists, finalKey, finalIndex, rowKey = "") {
    const rows = finalists?.[finalKey] || [];
    if (rowKey) {
      const byKey = rows.findIndex((row) => finalRowKey(row) === rowKey);
      if (byKey !== -1) return byKey;
    }
    const index = Number(finalIndex);
    return Number.isFinite(index) ? index : -1;
  }
  
  function nextUnqualifiedRowsForSecretary(result) {
    const used = new Set(["a", "b"].flatMap((finalKey) => (result.finalists?.[finalKey] || []).map(finalRowKey)));
    return (result.nextUnqualified || []).filter((row) => !used.has(finalRowKey(row)));
  }
  
  const finalWithdrawalView = window.LivePalmesFinalWithdrawalsView?.create({
    canWithdrawBeforeReplacementAnnouncement: (...args) => canWithdrawBeforeReplacementAnnouncement(...args),
    canWithdrawFinalist: (...args) => canWithdrawFinalist(...args),
    escapeHtml: (...args) => escapeHtml(...args),
    finalPreWithdrawalForRow: (...args) => finalPreWithdrawalForRow(...args),
    finalRowKey: (...args) => finalRowKey(...args),
    finalistRowName: (...args) => finalistRowName(...args),
    finalWithdrawalLimitLabel: (...args) => finalWithdrawalLimitLabel(...args),
    formatDeadlineTime: (...args) => formatDeadlineTime(...args),
    hasFinalWithdrawalDeadline: (...args) => hasFinalWithdrawalDeadline(...args),
    isFinalWithdrawalDeadlineExpired: (...args) => isFinalWithdrawalDeadlineExpired(...args),
    livePalmesSecretaryFinals: {
      renderCompositionListHtml: (...args) => livePalmesSecretaryFinals.renderCompositionListHtml(...args),
      renderUnqualifiedGroupHtml: (...args) => livePalmesSecretaryFinals.renderUnqualifiedGroupHtml(...args),
      renderWithdrawalGroupHtml: (...args) => livePalmesSecretaryFinals.renderWithdrawalGroupHtml(...args)
    },
    nextUnqualifiedRowsForSecretary: (...args) => nextUnqualifiedRowsForSecretary(...args),
    normalizeFinalistsOrder: (...args) => normalizeFinalistsOrder(...args)
  }) || {};

  const renderFinalWithdrawalGroup = finalWithdrawalView.renderFinalWithdrawalGroup || (() => "");
  const renderSecretaryUnqualifiedGroup = finalWithdrawalView.renderSecretaryUnqualifiedGroup || (() => "");
  const renderFinalCompositionList = finalWithdrawalView.renderFinalCompositionList || (() => "");

  function setAlertDetailModalHtml(html) {
    if (!alertDetailModal) return;
    alertDetailModal.innerHTML = html;
    alertDetailModal.hidden = false;
  }

  function renderAlertDetailErrorHtml(title, message) {
    return `
      <div class="decision-dialog alert-detail-dialog final-withdrawal-dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="decision-modal-head">
          <div>
            <span>Bureau des performances</span>
            <h2>${escapeHtml(title)}</h2>
          </div>
          <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
        </div>
        <div class="alert-detail-note">
          <span>Erreur</span>
          <strong>${escapeHtml(message || "Impossible d'ouvrir cette fenetre pour le moment.")}</strong>
        </div>
        <div class="decision-actions">
          <button class="ghost-button" type="button" data-close-alert-detail>Fermer</button>
        </div>
      </div>
    `;
  }

  function openFinalWithdrawalsModal(resultId, options = {}) {
    const result = raceResults.find((item) => item.id === resultId);
    if (!result || !alertDetailModal) return;
    try {
      const finalists = normalizeFinalistsOrder(result.finalists || {});
      const html = livePalmesAlertDetailView.renderFinalWithdrawalsModalHtml({
        eventLabel: result.eventLabel || result.eventId,
        finalAHtml: renderFinalWithdrawalGroup("Finale A", result, "a", finalists.a || []),
        finalBHtml: renderFinalWithdrawalGroup("Finale B", result, "b", finalists.b || []),
        sexLabel: result.sexLabel || sexDisplayLabel(result.sex),
        unqualifiedHtml: renderSecretaryUnqualifiedGroup(result, { open: Boolean(options.openUnqualified) })
      });
      setAlertDetailModalHtml(html);
    } catch (error) {
      console.error("Impossible d'ouvrir la gestion des forfaits finales", error);
      setAlertDetailModalHtml(renderAlertDetailErrorHtml("Finales indisponibles", error?.message || String(error || "")));
    }
  }
  
  async function toggleFinalPreWithdrawal(resultId, rowKey) {
    const collection = resultsCollection();
    if (!collection) throw new Error("Firebase n'est pas disponible pour gérer ce pré-forfait.");
    const resultIndex = raceResults.findIndex((item) => item.id === resultId);
    const result = raceResults[resultIndex];
    if (resultIndex === -1 || !result) throw new Error("Résultat introuvable.");
    const row = (result.nextUnqualified || []).find((item) => finalRowKey(item) === rowKey);
    if (!row) throw new Error("Nageur non qualifié introuvable.");
    const now = new Date().toISOString();
    const active = finalPreWithdrawalForRow(result, row);
    const finalPreWithdrawals = active
      ? (result.finalPreWithdrawals || []).map((item) => item.rowKey === rowKey && !item.cancelledAt ? { ...item, cancelledAt: now } : item)
      : [
        ...(result.finalPreWithdrawals || []),
        {
          rowKey,
          rank: row.rank || "",
          name: finalistRowName(row),
          club: row.club || "",
          time: row.time || "",
          at: now
        }
      ];
    await collection.doc(result.id).update({
      finalPreWithdrawals,
      updatedAt: now
    });
    raceResults[resultIndex] = {
      ...result,
      finalPreWithdrawals,
      updatedAt: now
    };
    render();
    openFinalWithdrawalsModal(result.id, { openUnqualified: true });
  }
  
  function openFinalCompositionResultModal(resultId) {
    const result = raceResults.find((item) => item.id === resultId);
    if (!result || !alertDetailModal) return;
    try {
      const definitive = finalCompositionIsDefinitive(result);
      const html = `
      <div class="decision-dialog alert-detail-dialog final-withdrawal-dialog" role="dialog" aria-modal="true" aria-label="Composition finale">
        <div class="decision-modal-head">
          <div>
            <span>Bureau des performances</span>
            <h2>${definitive ? "Finalistes définitifs" : "Finalistes provisoires"}</h2>
            <p>${escapeHtml(result.eventLabel || result.eventId)} ${escapeHtml(result.sexLabel || sexDisplayLabel(result.sex))}</p>
          </div>
          <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
        </div>
        <div class="alert-detail-note">
          <span>Info</span>
          <strong>${definitive ? "Tous les délais de forfait sont passés." : "Des délais de forfait sont encore ouverts."} Voici les qualifiés, repêchés et forfaits.</strong>
        </div>
        ${renderFinalCompositionList(result)}
        <div class="decision-actions">
          <button class="ghost-button" type="button" data-close-alert-detail>Fermer</button>
        </div>
      </div>
      `;
      setAlertDetailModalHtml(html);
    } catch (error) {
      console.error("Impossible d'ouvrir la composition finale", error);
      setAlertDetailModalHtml(renderAlertDetailErrorHtml("Finalistes indisponibles", error?.message || String(error || "")));
    }
  }

  function resultDetailRows(result) {
    const rankingRows = Array.isArray(result?.ranking) ? result.ranking : [];
    const sourceRows = rankingRows.length ? rankingRows : (Array.isArray(result?.performances) ? result.performances : []);
    return [...sourceRows].sort((a, b) => {
      if (result?.isPartial) {
        return resultDetailTimeValue(a) - resultDetailTimeValue(b) ||
          resultDetailRowName(a).localeCompare(resultDetailRowName(b), "fr");
      }
      if (resultDetailIsFinalStage(result?.stage)) {
        return Number(a.sourceIndex ?? 9999) - Number(b.sourceIndex ?? 9999) ||
          Number(a.rank || 9999) - Number(b.rank || 9999);
      }
      return Number(a.rank || 9999) - Number(b.rank || 9999) ||
        Number(a.sourceIndex ?? 9999) - Number(b.sourceIndex ?? 9999);
    });
  }

  function resultDetailRowName(row) {
    return finalistRowName(row) || row?.displayName || row?.name || [row?.lastName, row?.firstName].filter(Boolean).join(" ") || "Concurrent";
  }

  function resultDetailRowValue(row) {
    const status = String(row?.resultStatus || row?.status || "").trim().toLowerCase();
    if (status === "dsq") return "DSQ";
    if (status === "ab" || status === "abd") return "ABD";
    if (status === "dns") return "Forfait";
    return String(row?.statusLabel || row?.time || "").trim();
  }

  function resultDetailTimeValue(row) {
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

  function resultDetailIsFinalStage(stage) {
    return String(stage || "").toLowerCase().includes("final");
  }

  function renderResultDetailRows(title, rows = [], options = {}) {
    if (!rows.length) return "";
    const ordered = options.ordered !== false;
    const items = rows.map((row, index) => {
      const rank = row.rank || (ordered ? index + 1 : "");
      const value = resultDetailRowValue(row);
      const label = [
        rank ? `${rank}. ${resultDetailRowName(row)}` : resultDetailRowName(row),
        row.club,
        row.birthYear ? `(${row.birthYear})` : "",
        value
      ].filter(Boolean).join(" - ");
      return `
        <li ${ordered && rank ? `value="${escapeHtml(rank)}"` : ""} class="${row.resultStatus || row.status ? "closed" : ""}">
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

  function resultDetailGroups(result, rows = []) {
    if (!resultDetailIsFinalStage(result?.stage)) {
      return [{ title: result.isPartial ? "Resultat partiel" : "Resultats de la course", rows }];
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

  function openResultDetailsModal(resultId) {
    const result = raceResults.find((item) => item.id === resultId);
    if (!result || !alertDetailModal) return;
    try {
      const rows = resultDetailRows(result);
      const rowsHtml = resultDetailGroups(result, rows)
        .map((group) => renderResultDetailRows(group.title, group.rows, { ordered: !result.isPartial }))
        .join("");
      const pdfLink = result.id
        ? `<a class="ghost-button compact confirm-button" href="pdf.html?type=resultat&id=${encodeURIComponent(result.id)}" target="_blank" rel="noopener">PDF</a>`
        : "";
      const html = `
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
      setAlertDetailModalHtml(html);
    } catch (error) {
      console.error("Impossible d'ouvrir le detail du resultat", error);
      setAlertDetailModalHtml(renderAlertDetailErrorHtml("Resultat indisponible", error?.message || String(error || "")));
    }
  }
  
  function openFinalCompositionModal(alertId) {
    const alert = alerts.find((item) => item.id === alertId);
    if (alert?.resultId) openFinalCompositionResultModal(alert.resultId);
  }
  
  async function markFinalistWithdrawn(resultId, finalKey, finalIndex, { allowExpired = false, rowKey = "" } = {}) {
    const collection = resultsCollection();
    if (!collection) throw new Error("Firebase n'est pas disponible pour gérer les forfaits.");
    const resultIndex = raceResults.findIndex((item) => item.id === resultId);
    const result = raceResults[resultIndex];
    const sourceIndex = finalRowIndexByKey(result?.finalists, finalKey, finalIndex, rowKey);
    const row = result?.finalists?.[finalKey]?.[sourceIndex];
    if (resultIndex === -1 || sourceIndex === -1 || !row) throw new Error("Finaliste introuvable.");
    const isUnannouncedReplacement = canWithdrawBeforeReplacementAnnouncement(row);
    if (!hasFinalWithdrawalDeadline(row, result) && !isUnannouncedReplacement) {
      throw new Error("Le délai de ce finaliste n'a pas encore démarré.");
    }
    if (!isUnannouncedReplacement && !allowExpired && !canWithdrawFinalist(row, result)) {
      throw new Error("Le délai de forfait de ce finaliste est terminé.");
    }
    const now = new Date().toISOString();
    const finalists = {
      a: (result.finalists?.a || []).map((item) => ({ ...item })),
      b: (result.finalists?.b || []).map((item) => ({ ...item }))
    };
    finalists[finalKey][sourceIndex] = {
      ...row,
      withdrawnAt: now
    };
    let promoted = null;
    let replacementFinalKey = finalKey;
    let replacementReference = row;
    if (finalKey === "a" && finalists.b.length) {
      const promotedIndex = firstActiveFinalistIndex(finalists.b);
      if (promotedIndex !== -1) {
        promoted = finalists.b.splice(promotedIndex, 1)[0];
        finalists.a.push({
          ...promoted,
          promotedFromFinal: "B",
          promotedAt: now,
          replacesRank: row.rank || "",
          replacesName: finalistRowName(row)
        });
        replacementFinalKey = "b";
        replacementReference = promoted;
      }
    }
    const replacements = addReplacementChain(result, finalists, replacementFinalKey, replacementReference, now);
    const announcedReplacement = replacements.find((item) => !item.preWithdrawn) || null;
    const firstReplacement = replacements[0] || null;
    const finalWithdrawals = [
      ...(result.finalWithdrawals || []),
      buildFinalWithdrawalEntry({
        at: now,
        finalKey,
        withdrawn: row,
        replacement: firstReplacement,
        promoted
      }),
      ...replacements
        .filter((item) => item.preWithdrawn)
        .map((item, index) => buildFinalWithdrawalEntry({
          at: item.finalistRow.withdrawnAt || now,
          finalKey: item.finalKey,
          withdrawn: item.finalistRow,
          replacement: replacements[index + 1] || null,
          preWithdrawal: true
        }))
    ];
    const orderedFinalists = normalizeFinalistsOrder(finalists);
    const updated = {
      ...result,
      finalists: orderedFinalists,
      finalWithdrawals,
      updatedAt: now
    };
    await collection.doc(result.id).update({
      finalists: orderedFinalists,
      finalWithdrawals,
      updatedAt: now
    });
    raceResults[resultIndex] = updated;
    if (isUnannouncedReplacement) {
      await cancelPendingReplacementSpeakerAlert(result, row, now);
    }
    if (announcedReplacement) {
      await createFinalistReplacementSpeakerAlert(updated, announcedReplacement.reference, announcedReplacement.row, now);
    }
    await publishPublicResultsIndex();
    render();
    openFinalWithdrawalsModal(result.id);
  }
  
  async function reinstateFinalist(resultId, finalKey, finalIndex, rowKey = "") {
    const collection = resultsCollection();
    if (!collection) throw new Error("Firebase n'est pas disponible pour réintégrer ce finaliste.");
    const resultIndex = raceResults.findIndex((item) => item.id === resultId);
    const result = raceResults[resultIndex];
    const sourceIndex = finalRowIndexByKey(result?.finalists, finalKey, finalIndex, rowKey);
    const row = result?.finalists?.[finalKey]?.[sourceIndex];
    if (resultIndex === -1 || sourceIndex === -1 || !row?.withdrawnAt) throw new Error("Finaliste forfait introuvable.");
    const now = new Date().toISOString();
    const finalists = {
      a: (result.finalists?.a || []).map((item) => ({ ...item })),
      b: (result.finalists?.b || []).map((item) => ({ ...item }))
    };
    const reinstated = { ...row };
    delete reinstated.withdrawnAt;
    reinstated.reinstatedAt = now;
    finalists[finalKey][sourceIndex] = reinstated;
    const withdrawal = [...(result.finalWithdrawals || [])]
      .reverse()
      .find((item) => item.withdrawn?.name === finalistRowName(row) && !item.reinstatedAt);
    const replacementName = withdrawal?.replacement?.name || "";
    const replacementReferenceName = withdrawal?.promoted?.name || finalistRowName(row);
    if (replacementName) {
      for (const key of ["a", "b"]) {
        const replacementIndex = finalists[key].findIndex((item) =>
          item.repechaged &&
          finalistRowName(item) === replacementName &&
          String(item.replacesName || "") === replacementReferenceName
        );
        if (replacementIndex !== -1) {
          const replacement = finalists[key][replacementIndex];
          if (!replacement.repechageAnnouncedAt) {
            await cancelPendingReplacementSpeakerAlert(result, replacement, now);
          }
          finalists[key].splice(replacementIndex, 1);
        }
      }
    }
    const promotedName = withdrawal?.promoted?.name || "";
    if (promotedName) {
      const promotedIndex = finalists.a.findIndex((item) =>
        item.promotedFromFinal === "B" &&
        finalistRowName(item) === promotedName &&
        String(item.replacesName || "") === finalistRowName(row)
      );
      if (promotedIndex !== -1) {
        const promoted = { ...finalists.a[promotedIndex] };
        delete promoted.promotedFromFinal;
        delete promoted.promotedAt;
        delete promoted.replacesRank;
        delete promoted.replacesName;
        finalists.a.splice(promotedIndex, 1);
        finalists.b.push(promoted);
      }
    }
    const finalWithdrawals = (result.finalWithdrawals || []).map((item) => {
      if (item === withdrawal || (item.withdrawn?.name === finalistRowName(row) && !item.reinstatedAt && item.at === withdrawal?.at)) {
        return { ...item, reinstatedAt: now };
      }
      return item;
    });
    const orderedFinalists = normalizeFinalistsOrder(finalists);
    await collection.doc(result.id).update({
      finalists: orderedFinalists,
      finalWithdrawals,
      updatedAt: now
    });
    raceResults[resultIndex] = {
      ...result,
      finalists: orderedFinalists,
      finalWithdrawals,
      updatedAt: now
    };
    await publishPublicResultsIndex();
    render();
    openFinalWithdrawalsModal(result.id);
  }
  
  async function createFinalistReplacementSpeakerAlert(result, withdrawn, replacement, now = new Date().toISOString()) {
    const existing = alerts.find((alert) =>
      replacementAlertMatches(alert, result, replacement) &&
      alert.speakerStatus === "pending"
    );
    if (existing) return existing;
    const replacementRowKey = finalRowKey(replacement);
    const alert = {
      id: `replacement-${result.id}-${replacementRowKey.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80)}`,
      type: "finalist_replacement_announcement",
      roleSource: "secretary",
      resultId: result.id,
      eventId: result.eventId,
      eventLabel: result.eventLabel,
      sex: result.sex,
      sexLabel: result.sexLabel,
      session: result.session || "",
      startTime: result.startTime || "",
      withdrawnName: finalistRowName(withdrawn),
      withdrawnClub: withdrawn.club || "",
      replacementName: finalistRowName(replacement),
      replacementClub: replacement.club || "",
      replacementRowKey,
      replacementRank: replacement.rank || "",
      replacementTime: replacement.time || "",
      requiresVideo: false,
      videoStatus: "none",
      speakerStatus: "pending",
      informaticsStatus: "none",
      createdAt: now,
      updatedAt: now
    };
    alerts.unshift(alert);
    saveAlerts();
    await syncAlertToFirestore(alert);
  }
  
  async function cancelPendingReplacementSpeakerAlert(result, row, now = new Date().toISOString()) {
    const pending = alerts.filter((alert) =>
      replacementAlertMatches(alert, result, row) &&
      alert.speakerStatus === "pending"
    );
    for (const alert of pending) {
      alert.speakerStatus = "none";
      alert.cancelledAt = now;
      alert.updatedAt = now;
      await syncAlertToFirestore(alert);
    }
    if (pending.length) {
      saveAlerts();
    }
  }
  
  async function updateReplacementRowAnnouncement(resultId, matcher, announcedAt) {
    const index = raceResults.findIndex((result) => result.id === resultId);
    const result = raceResults[index];
    if (!result) return false;
    const finalists = {
      a: (result.finalists?.a || []).map((row) => ({ ...row })),
      b: (result.finalists?.b || []).map((row) => ({ ...row }))
    };
    let changed = false;
    ["a", "b"].forEach((key) => {
      finalists[key] = finalists[key].map((row) => {
        if (row.repechaged && matcher(row) && !row.repechageAnnouncedAt) {
          changed = true;
          return { ...row, repechageAnnouncedAt: announcedAt };
        }
        return row;
      });
    });
    if (!changed) return false;
    const orderedFinalists = normalizeFinalistsOrder(finalists);
    const collection = resultsCollection();
    if (collection) {
      await collection.doc(result.id).update({
        finalists: orderedFinalists,
        updatedAt: announcedAt
      });
    }
    raceResults[index] = {
      ...result,
      finalists: orderedFinalists,
      updatedAt: announcedAt
    };
    await publishPublicResultsIndex();
    return true;
  }
  
  async function stampReplacementAnnouncement(result, row, announcedAt) {
    return updateReplacementRowAnnouncement(
      result.id,
      (candidate) => finalistRowName(candidate) === finalistRowName(row) &&
        String(candidate.rank || "") === String(row.rank || "") &&
        String(candidate.time || "") === String(row.time || ""),
      announcedAt
    );
  }
  
  async function publishReplacementAfterSpeaker(alertId) {
    const alert = alerts.find((item) => item.id === alertId);
    const now = new Date().toISOString();
    const changes = { speakerStatus: "done", speakerAnnouncedAt: now, updatedAt: now };
    await syncAlertChangesToFirestoreStrict(alertId, changes);
    markSpeakerAlertDoneLocally(alertId, now);
    if (!alert?.resultId) {
      return;
    }
    try {
      await updateReplacementRowAnnouncement(
        alert.resultId,
        (row) => {
          const sameName = finalistRowName(row) === alert.replacementName;
          const sameRank = !alert.replacementRank || String(row.rank || "") === String(alert.replacementRank || "");
          const sameTime = !alert.replacementTime || String(row.time || "") === String(alert.replacementTime || "");
          return sameName && sameRank && sameTime;
        },
        now
      );
    } catch (error) {
      throw markAlertAlreadyClosedError(error);
    }
  }
  api = {
    finalRowKey,
    finalRowOrderValue,
    sortedFinalRows,
    normalizeFinalistsOrder,
    activeFinalPreWithdrawals,
    finalPreWithdrawalForRow,
    isFinalPreWithdrawn,
    availableReplacementForResult,
    buildReplacementFinalistRow,
    buildFinalWithdrawalEntry,
    addReplacementChain,
    finalistRowsWithFinalKey,
    finalistRowsMatch,
    findPreservedFinalistRow,
    finalistPositionByRow,
    applyPreservedReplacementAnnouncement,
    rebuildFinalistsFromParsedResult,
    firstActiveFinalistIndex,
    finalCompositionRows,
    finalCompositionKey,
    finalCompositionIsDefinitive,
    finalCompositionDefinitiveDate,
    finalCompositionPendingDeadlineLabel,
    renderFinalWithdrawalGroup,
    finalRowIndexByKey,
    nextUnqualifiedRowsForSecretary,
    renderSecretaryUnqualifiedGroup,
    openFinalWithdrawalsModal,
    toggleFinalPreWithdrawal,
    renderFinalCompositionList,
    openFinalCompositionResultModal,
    openFinalCompositionModal,
    openResultDetailsModal,
    markFinalistWithdrawn,
    reinstateFinalist,
    createFinalistReplacementSpeakerAlert,
    cancelPendingReplacementSpeakerAlert,
    updateReplacementRowAnnouncement,
    stampReplacementAnnouncement,
    publishReplacementAfterSpeaker
  };

  function useContext(nextContext = {}) {
    Object.keys(context).forEach((key) => { delete context[key]; });
    Object.assign(context, nextContext || {});
    alertDetailModal = context.alertDetailModal;
    alerts = context.alerts;
    canWithdrawBeforeReplacementAnnouncement = typeof context.canWithdrawBeforeReplacementAnnouncement === "function"
      ? context.canWithdrawBeforeReplacementAnnouncement
      : (() => false);
    canWithdrawFinalist = typeof context.canWithdrawFinalist === "function"
      ? context.canWithdrawFinalist
      : (() => false);
    escapeHtml = typeof context.escapeHtml === "function"
      ? context.escapeHtml
      : ((value) => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;"));
    finalRowCountsAsFinalist = typeof context.finalRowCountsAsFinalist === "function"
      ? context.finalRowCountsAsFinalist
      : ((row) => Boolean(row && !row.withdrawnAt && !row.resultStatus));
    finalistRowName = context.finalistRowName || ((row) => row?.displayName || row?.name || [row?.lastName, row?.firstName].filter(Boolean).join(" "));
    finalWithdrawalLimitDate = typeof context.finalWithdrawalLimitDate === "function"
      ? context.finalWithdrawalLimitDate
      : (() => null);
    finalWithdrawalLimitLabel = typeof context.finalWithdrawalLimitLabel === "function"
      ? context.finalWithdrawalLimitLabel
      : (() => "");
    formatDeadlineTime = typeof context.formatDeadlineTime === "function"
      ? context.formatDeadlineTime
      : ((date) => {
        const value = date instanceof Date ? date : new Date(date);
        return Number.isNaN(value.getTime()) ? "" : value.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      });
    hasFinalWithdrawalDeadline = typeof context.hasFinalWithdrawalDeadline === "function"
      ? context.hasFinalWithdrawalDeadline
      : ((row, result) => Boolean(finalWithdrawalLimitDate(row, result)));
    isFinalWithdrawalDeadlineExpired = typeof context.isFinalWithdrawalDeadlineExpired === "function"
      ? context.isFinalWithdrawalDeadlineExpired
      : (() => false);
    livePalmesAlertDetailView = {
      renderFinalWithdrawalsModalHtml: ({ eventLabel = "", finalAHtml = "", finalBHtml = "", sexLabel = "", unqualifiedHtml = "" } = {}) => `
        <div class="decision-dialog alert-detail-dialog final-withdrawal-dialog" role="dialog" aria-modal="true" aria-label="Forfaits finales">
          <div class="decision-modal-head">
            <div>
              <span>Secretariat</span>
              <h2>Forfaits finales</h2>
              <p>${escapeHtml(eventLabel)} ${escapeHtml(sexLabel)}</p>
            </div>
            <button class="icon-button decision-close" type="button" data-close-alert-detail aria-label="Fermer">×</button>
          </div>
          <div class="final-withdrawal-list">${finalAHtml}${finalBHtml}${unqualifiedHtml}</div>
          <div class="decision-actions"><button class="ghost-button" type="button" data-close-alert-detail>Fermer</button></div>
        </div>
      `,
      ...(context.livePalmesAlertDetailView || {})
    };
    livePalmesSecretaryFinals = {
      renderCompositionListHtml: (options = {}) => `<div class="final-withdrawal-list">${options.finalAHtml || ""}${options.finalBHtml || ""}${options.unqualifiedHtml || ""}</div>`,
      renderUnqualifiedGroupHtml: () => "",
      renderWithdrawalGroupHtml: () => "",
      ...(context.livePalmesSecretaryFinals || {})
    };
    markAlertAlreadyClosedError = context.markAlertAlreadyClosedError;
    markSpeakerAlertDoneLocally = context.markSpeakerAlertDoneLocally;
    normalizePersonName = context.normalizePersonName;
    publishPublicResultsIndex = context.publishPublicResultsIndex;
    raceResults = context.raceResults;
    render = context.render;
    replacementAlertMatches = context.replacementAlertMatches;
    resultParserFunction = context.resultParserFunction;
    resultParserOptions = context.resultParserOptions;
    resultsCollection = context.resultsCollection;
    saveAlerts = context.saveAlerts;
    sexDisplayLabel = context.sexDisplayLabel;
    syncAlertChangesToFirestoreStrict = context.syncAlertChangesToFirestoreStrict;
    syncAlertToFirestore = context.syncAlertToFirestore;
  }

  window.LivePalmesFinalWithdrawalsWorkflow = {
    finalRowKey: (...args) => { useContext(args.pop() || {}); return api.finalRowKey(...args); },
    finalRowOrderValue: (...args) => { useContext(args.pop() || {}); return api.finalRowOrderValue(...args); },
    sortedFinalRows: (...args) => { useContext(args.pop() || {}); return api.sortedFinalRows(...args); },
    normalizeFinalistsOrder: (...args) => { useContext(args.pop() || {}); return api.normalizeFinalistsOrder(...args); },
    activeFinalPreWithdrawals: (...args) => { useContext(args.pop() || {}); return api.activeFinalPreWithdrawals(...args); },
    finalPreWithdrawalForRow: (...args) => { useContext(args.pop() || {}); return api.finalPreWithdrawalForRow(...args); },
    isFinalPreWithdrawn: (...args) => { useContext(args.pop() || {}); return api.isFinalPreWithdrawn(...args); },
    availableReplacementForResult: (...args) => { useContext(args.pop() || {}); return api.availableReplacementForResult(...args); },
    buildReplacementFinalistRow: (...args) => { useContext(args.pop() || {}); return api.buildReplacementFinalistRow(...args); },
    buildFinalWithdrawalEntry: (...args) => { useContext(args.pop() || {}); return api.buildFinalWithdrawalEntry(...args); },
    addReplacementChain: (...args) => { useContext(args.pop() || {}); return api.addReplacementChain(...args); },
    finalistRowsWithFinalKey: (...args) => { useContext(args.pop() || {}); return api.finalistRowsWithFinalKey(...args); },
    finalistRowsMatch: (...args) => { useContext(args.pop() || {}); return api.finalistRowsMatch(...args); },
    findPreservedFinalistRow: (...args) => { useContext(args.pop() || {}); return api.findPreservedFinalistRow(...args); },
    finalistPositionByRow: (...args) => { useContext(args.pop() || {}); return api.finalistPositionByRow(...args); },
    applyPreservedReplacementAnnouncement: (...args) => { useContext(args.pop() || {}); return api.applyPreservedReplacementAnnouncement(...args); },
    rebuildFinalistsFromParsedResult: (...args) => { useContext(args.pop() || {}); return api.rebuildFinalistsFromParsedResult(...args); },
    firstActiveFinalistIndex: (...args) => { useContext(args.pop() || {}); return api.firstActiveFinalistIndex(...args); },
    finalCompositionRows: (...args) => { useContext(args.pop() || {}); return api.finalCompositionRows(...args); },
    finalCompositionKey: (...args) => { useContext(args.pop() || {}); return api.finalCompositionKey(...args); },
    finalCompositionIsDefinitive: (...args) => { useContext(args.pop() || {}); return api.finalCompositionIsDefinitive(...args); },
    finalCompositionDefinitiveDate: (...args) => { useContext(args.pop() || {}); return api.finalCompositionDefinitiveDate(...args); },
    finalCompositionPendingDeadlineLabel: (...args) => { useContext(args.pop() || {}); return api.finalCompositionPendingDeadlineLabel(...args); },
    renderFinalWithdrawalGroup: (...args) => { useContext(args.pop() || {}); return api.renderFinalWithdrawalGroup(...args); },
    finalRowIndexByKey: (...args) => { useContext(args.pop() || {}); return api.finalRowIndexByKey(...args); },
    nextUnqualifiedRowsForSecretary: (...args) => { useContext(args.pop() || {}); return api.nextUnqualifiedRowsForSecretary(...args); },
    renderSecretaryUnqualifiedGroup: (...args) => { useContext(args.pop() || {}); return api.renderSecretaryUnqualifiedGroup(...args); },
    openFinalWithdrawalsModal: (...args) => { useContext(args.pop() || {}); return api.openFinalWithdrawalsModal(...args); },
    toggleFinalPreWithdrawal: (...args) => { useContext(args.pop() || {}); return api.toggleFinalPreWithdrawal(...args); },
    renderFinalCompositionList: (...args) => { useContext(args.pop() || {}); return api.renderFinalCompositionList(...args); },
    openFinalCompositionResultModal: (...args) => { useContext(args.pop() || {}); return api.openFinalCompositionResultModal(...args); },
    openFinalCompositionModal: (...args) => { useContext(args.pop() || {}); return api.openFinalCompositionModal(...args); },
    openResultDetailsModal: (...args) => { useContext(args.pop() || {}); return api.openResultDetailsModal(...args); },
    markFinalistWithdrawn: (...args) => { useContext(args.pop() || {}); return api.markFinalistWithdrawn(...args); },
    reinstateFinalist: (...args) => { useContext(args.pop() || {}); return api.reinstateFinalist(...args); },
    createFinalistReplacementSpeakerAlert: (...args) => { useContext(args.pop() || {}); return api.createFinalistReplacementSpeakerAlert(...args); },
    cancelPendingReplacementSpeakerAlert: (...args) => { useContext(args.pop() || {}); return api.cancelPendingReplacementSpeakerAlert(...args); },
    updateReplacementRowAnnouncement: (...args) => { useContext(args.pop() || {}); return api.updateReplacementRowAnnouncement(...args); },
    stampReplacementAnnouncement: (...args) => { useContext(args.pop() || {}); return api.stampReplacementAnnouncement(...args); },
    publishReplacementAfterSpeaker: (...args) => { useContext(args.pop() || {}); return api.publishReplacementAfterSpeaker(...args); }
  };
}());
