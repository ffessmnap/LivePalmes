(function () {
  const context = {};
  let api;
  with (context) {
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
  
  function renderFinalWithdrawalGroup(title, result, finalKey, rows = []) {
    if (!rows.length) return "";
    const now = new Date();
    return livePalmesSecretaryFinals.renderWithdrawalGroupHtml(title, rows.map((row, index) => {
      const limit = finalWithdrawalLimitLabel(row, result);
      const canWithdraw = canWithdrawFinalist(row, result, now);
      const hasDeadline = hasFinalWithdrawalDeadline(row, result);
      const canWithdrawUnannouncedReplacement = canWithdrawBeforeReplacementAnnouncement(row);
      const expired = isFinalWithdrawalDeadlineExpired(row, result, now);
      return {
        actionDisabled: !(hasDeadline || canWithdrawUnannouncedReplacement),
        className: `${row.withdrawnAt ? "withdrawn" : ""}${!canWithdraw && !row.withdrawnAt ? " closed" : ""}`,
        expired,
        finalKey,
        index,
        label: [row.rank ? `${row.rank}. ${finalistRowName(row)}` : finalistRowName(row), row.club, row.time || row.statusLabel].filter(Boolean).join(" - "),
        rank: row.rank || "",
        repechaged: Boolean(row.repechaged && !row.withdrawnAt),
        resultId: result.id,
        rowKey: finalRowKey(row),
        sex: result.sex,
        status: row.withdrawnAt
          ? `Forfait ${formatDeadlineTime(new Date(row.withdrawnAt))}`
          : (limit ? (canWithdraw ? `Forfait possible jusqu'à ${limit}` : "Forfait fermé") : (canWithdrawUnannouncedReplacement ? "Repêchage non annoncé" : "En attente annonce speaker")),
        withdrawn: Boolean(row.withdrawnAt)
      };
    }));
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
  
  function renderSecretaryUnqualifiedGroup(result, { actions = true, open = false } = {}) {
    const rows = nextUnqualifiedRowsForSecretary(result);
    if (!rows.length) return "";
    return livePalmesSecretaryFinals.renderUnqualifiedGroupHtml({
      actions,
      open,
      rows: rows.map((row) => {
        const preWithdrawal = finalPreWithdrawalForRow(result, row);
        return {
          actionAllowed: Boolean(!row.resultStatus && row.time),
          label: [row.rank ? `${row.rank}. ${finalistRowName(row)}` : finalistRowName(row), row.club, row.time || row.statusLabel].filter(Boolean).join(" - "),
          preWithdrawal: Boolean(preWithdrawal),
          rank: row.rank || "",
          resultId: result.id,
          rowKey: finalRowKey(row),
          status: preWithdrawal ? `Pré-forfait déclaré à ${formatDeadlineTime(new Date(preWithdrawal.at))}` : (row.statusLabel || `Non qualifié${result.sex === "F" ? "e" : ""}`)
        };
      })
    });
  }
  
  function openFinalWithdrawalsModal(resultId, options = {}) {
    const result = raceResults.find((item) => item.id === resultId);
    if (!result || !alertDetailModal) return;
    const finalists = normalizeFinalistsOrder(result.finalists || {});
    alertDetailModal.hidden = false;
    alertDetailModal.innerHTML = livePalmesAlertDetailView.renderFinalWithdrawalsModalHtml({
      eventLabel: result.eventLabel || result.eventId,
      finalAHtml: renderFinalWithdrawalGroup("Finale A", result, "a", finalists.a || []),
      finalBHtml: renderFinalWithdrawalGroup("Finale B", result, "b", finalists.b || []),
      sexLabel: result.sexLabel || sexDisplayLabel(result.sex),
      unqualifiedHtml: renderSecretaryUnqualifiedGroup(result, { open: Boolean(options.openUnqualified) })
    });
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
  
  function renderFinalCompositionList(result) {
    const finalists = normalizeFinalistsOrder(result.finalists || {});
    const renderRows = (title, rows = []) => rows.length ? `
      <div class="final-withdrawal-group">
        <strong>${escapeHtml(title)}</strong>
        <ol>
          ${rows.map((row) => `
            <li value="${escapeHtml(row.rank || "")}" class="${row.withdrawnAt ? "withdrawn" : ""}">
              <div>
                <span>${escapeHtml([row.rank ? `${row.rank}. ${finalistRowName(row)}` : finalistRowName(row), row.club, row.time || row.statusLabel].filter(Boolean).join(" - "))}</span>
                ${row.withdrawnAt ? `<small>Forfait à ${escapeHtml(formatDeadlineTime(new Date(row.withdrawnAt)))}</small>` : ""}
                ${row.repechaged && !row.withdrawnAt ? `<small class="repechage-label">Repêché${result.sex === "F" ? "e" : ""}</small>` : ""}
              </div>
            </li>
          `).join("")}
        </ol>
      </div>
    ` : "";
    return livePalmesSecretaryFinals.renderCompositionListHtml({
      finalAHtml: renderRows("Finale A", finalists.a || []),
      finalBHtml: renderRows("Finale B", finalists.b || []),
      unqualifiedHtml: renderSecretaryUnqualifiedGroup(result, { actions: false })
    });
  }
  
  function openFinalCompositionResultModal(resultId) {
    const result = raceResults.find((item) => item.id === resultId);
    if (!result || !alertDetailModal) return;
    const definitive = finalCompositionIsDefinitive(result);
    alertDetailModal.hidden = false;
    alertDetailModal.innerHTML = `
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
    markFinalistWithdrawn,
    reinstateFinalist,
    createFinalistReplacementSpeakerAlert,
    cancelPendingReplacementSpeakerAlert,
    updateReplacementRowAnnouncement,
    stampReplacementAnnouncement,
    publishReplacementAfterSpeaker
  };
  }

  function useContext(nextContext = {}) {
    Object.keys(context).forEach((key) => { delete context[key]; });
    Object.assign(context, nextContext || {});
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
    markFinalistWithdrawn: (...args) => { useContext(args.pop() || {}); return api.markFinalistWithdrawn(...args); },
    reinstateFinalist: (...args) => { useContext(args.pop() || {}); return api.reinstateFinalist(...args); },
    createFinalistReplacementSpeakerAlert: (...args) => { useContext(args.pop() || {}); return api.createFinalistReplacementSpeakerAlert(...args); },
    cancelPendingReplacementSpeakerAlert: (...args) => { useContext(args.pop() || {}); return api.cancelPendingReplacementSpeakerAlert(...args); },
    updateReplacementRowAnnouncement: (...args) => { useContext(args.pop() || {}); return api.updateReplacementRowAnnouncement(...args); },
    stampReplacementAnnouncement: (...args) => { useContext(args.pop() || {}); return api.stampReplacementAnnouncement(...args); },
    publishReplacementAfterSpeaker: (...args) => { useContext(args.pop() || {}); return api.publishReplacementAfterSpeaker(...args); }
  };
}());
