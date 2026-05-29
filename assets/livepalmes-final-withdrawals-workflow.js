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

  const finalWithdrawalCore = window.LivePalmesFinalWithdrawalsCore?.create({
    finalRowCountsAsFinalist: (...args) => finalRowCountsAsFinalist(...args),
    finalistRowName: (...args) => finalistRowName(...args),
    finalWithdrawalLimitDate: (...args) => finalWithdrawalLimitDate(...args),
    normalizePersonName: (...args) => normalizePersonName(...args),
    resultParserFunction: (...args) => resultParserFunction(...args),
    resultParserOptions: (...args) => resultParserOptions(...args)
  }) || {};

  function finalRowKey(...args) { return finalWithdrawalCore.finalRowKey?.(...args); }
  function finalRowOrderValue(...args) { return finalWithdrawalCore.finalRowOrderValue?.(...args); }
  function sortedFinalRows(...args) { return finalWithdrawalCore.sortedFinalRows?.(...args); }
  function normalizeFinalistsOrder(...args) { return finalWithdrawalCore.normalizeFinalistsOrder?.(...args); }
  function activeFinalPreWithdrawals(...args) { return finalWithdrawalCore.activeFinalPreWithdrawals?.(...args) || []; }
  function finalPreWithdrawalForRow(...args) { return finalWithdrawalCore.finalPreWithdrawalForRow?.(...args); }
  function isFinalPreWithdrawn(...args) { return Boolean(finalWithdrawalCore.isFinalPreWithdrawn?.(...args)); }
  function availableReplacementForResult(...args) { return finalWithdrawalCore.availableReplacementForResult?.(...args); }
  function buildReplacementFinalistRow(...args) { return finalWithdrawalCore.buildReplacementFinalistRow?.(...args); }
  function buildFinalWithdrawalEntry(...args) { return finalWithdrawalCore.buildFinalWithdrawalEntry?.(...args); }
  function addReplacementChain(...args) { return finalWithdrawalCore.addReplacementChain?.(...args) || []; }
  function finalistRowsWithFinalKey(...args) { return finalWithdrawalCore.finalistRowsWithFinalKey?.(...args) || []; }
  function finalistRowsMatch(...args) { return Boolean(finalWithdrawalCore.finalistRowsMatch?.(...args)); }
  function findPreservedFinalistRow(...args) { return finalWithdrawalCore.findPreservedFinalistRow?.(...args); }
  function finalistPositionByRow(...args) { return finalWithdrawalCore.finalistPositionByRow?.(...args); }
  function applyPreservedReplacementAnnouncement(...args) { return finalWithdrawalCore.applyPreservedReplacementAnnouncement?.(...args); }
  function rebuildFinalistsFromParsedResult(...args) { return finalWithdrawalCore.rebuildFinalistsFromParsedResult?.(...args); }
  function firstActiveFinalistIndex(...args) { return finalWithdrawalCore.firstActiveFinalistIndex?.(...args) ?? -1; }
  function finalCompositionRows(...args) { return finalWithdrawalCore.finalCompositionRows?.(...args) || []; }
  function finalCompositionKey(...args) { return finalWithdrawalCore.finalCompositionKey?.(...args) || ""; }
  function finalCompositionIsDefinitive(...args) { return Boolean(finalWithdrawalCore.finalCompositionIsDefinitive?.(...args)); }
  function finalCompositionDefinitiveDate(...args) { return finalWithdrawalCore.finalCompositionDefinitiveDate?.(...args); }
  function finalCompositionPendingDeadlineLabel(...args) { return finalWithdrawalCore.finalCompositionPendingDeadlineLabel?.(...args) || ""; }
  function finalRowIndexByKey(...args) { return finalWithdrawalCore.finalRowIndexByKey?.(...args) ?? -1; }
  function nextUnqualifiedRowsForSecretary(...args) { return finalWithdrawalCore.nextUnqualifiedRowsForSecretary?.(...args) || []; }
  
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
  const resultDetailView = window.LivePalmesResultDetailView?.create({
    escapeHtml: (...args) => escapeHtml(...args),
    finalistRowName: (...args) => finalistRowName(...args),
    sexDisplayLabel: (...args) => sexDisplayLabel(...args)
  }) || {};

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

  function openResultDetailsModal(resultId) {
    const result = raceResults.find((item) => item.id === resultId);
    if (!result || !alertDetailModal) return;
    try {
      const html = resultDetailView.renderModalHtml(result);
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
