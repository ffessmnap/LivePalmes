(function attachLivePalmesFinalWithdrawalsCore(global) {
  function create(options = {}) {
    const deps = {
      finalRowCountsAsFinalist: options.finalRowCountsAsFinalist || (() => false),
      finalistRowName: options.finalistRowName || ((row) => row?.displayName || row?.name || ""),
      finalWithdrawalLimitDate: options.finalWithdrawalLimitDate || (() => null),
      normalizePersonName: options.normalizePersonName || ((value) => String(value || "").trim().toLowerCase()),
      resultParserFunction: options.resultParserFunction || (() => () => null),
      resultParserOptions: options.resultParserOptions || (() => ({}))
    };

    function parserCall(name, ...args) {
      return deps.resultParserFunction(name)(...args, deps.resultParserOptions());
    }

    function finalRowKey(row) {
      return parserCall("finalRowKey", row);
    }

    function finalRowOrderValue(row, fallback = 9999) {
      return parserCall("finalRowOrderValue", row, fallback);
    }

    function sortedFinalRows(rows = []) {
      return parserCall("sortedFinalRows", rows);
    }

    function normalizeFinalistsOrder(finalists = {}) {
      return parserCall("normalizeFinalistsOrder", finalists);
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
        replacesName: deps.finalistRowName(reference)
      };
    }

    function buildFinalWithdrawalEntry({ at, finalKey, withdrawn, replacement = null, promoted = null, preWithdrawal = false }) {
      return {
        at,
        final: String(finalKey || "").toUpperCase(),
        preWithdrawal,
        withdrawn: {
          rank: withdrawn?.rank || "",
          name: deps.finalistRowName(withdrawn),
          club: withdrawn?.club || "",
          time: withdrawn?.time || ""
        },
        replacement: replacement ? {
          final: String(replacement.finalKey || finalKey || "").toUpperCase(),
          rank: replacement.row?.rank || "",
          name: deps.finalistRowName(replacement.row),
          club: replacement.row?.club || "",
          time: replacement.row?.time || ""
        } : null,
        promoted: promoted ? {
          fromFinal: "B",
          toFinal: "A",
          rank: promoted.rank || "",
          name: deps.finalistRowName(promoted),
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
      return deps.normalizePersonName(deps.finalistRowName(a)) === deps.normalizePersonName(deps.finalistRowName(b)) &&
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
              replacesName: deps.finalistRowName(withdrawn)
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
      return ["a", "b"].flatMap((key) => (finalists[key] || []).map((row) => ({
        ...row,
        finalLabel: key.toUpperCase()
      })));
    }

    function finalCompositionKey(result) {
      return finalCompositionRows(result)
        .map((row) => [row.finalLabel, row.rank, deps.finalistRowName(row), row.time, row.withdrawnAt ? "F" : "Q", row.repechaged ? "R" : ""].join("|"))
        .join(";");
    }

    function finalCompositionIsDefinitive(result, now = new Date()) {
      if (!result?.hasFinal || !result.finalistsAnnouncedAt) return false;
      const activeRows = finalCompositionRows(result).filter(deps.finalRowCountsAsFinalist);
      if (!activeRows.length) return false;
      return activeRows.every((row) => {
        const limit = deps.finalWithdrawalLimitDate(row, result);
        return Boolean(limit) && now > limit;
      });
    }

    function finalCompositionDefinitiveDate(result) {
      if (!result?.hasFinal || !result.finalistsAnnouncedAt) return null;
      const activeRows = finalCompositionRows(result).filter(deps.finalRowCountsAsFinalist);
      const limits = activeRows
        .map((row) => deps.finalWithdrawalLimitDate(row, result))
        .filter((date) => date && !Number.isNaN(date.getTime()));
      if (!activeRows.length || limits.length !== activeRows.length) return null;
      return new Date(Math.max(...limits.map((date) => date.getTime())));
    }

    function finalCompositionPendingDeadlineLabel(result) {
      if (!result?.finalistsAnnouncedAt) return "Définitif 30 min après annonce speaker";
      const activeRows = finalCompositionRows(result).filter(deps.finalRowCountsAsFinalist);
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

    return {
      activeFinalPreWithdrawals,
      addReplacementChain,
      applyPreservedReplacementAnnouncement,
      availableReplacementForResult,
      buildFinalWithdrawalEntry,
      buildReplacementFinalistRow,
      finalCompositionDefinitiveDate,
      finalCompositionIsDefinitive,
      finalCompositionKey,
      finalCompositionPendingDeadlineLabel,
      finalCompositionRows,
      finalPreWithdrawalForRow,
      finalRowIndexByKey,
      finalRowKey,
      finalRowOrderValue,
      finalistPositionByRow,
      finalistRowsMatch,
      finalistRowsWithFinalKey,
      findPreservedFinalistRow,
      firstActiveFinalistIndex,
      isFinalPreWithdrawn,
      nextUnqualifiedRowsForSecretary,
      normalizeFinalistsOrder,
      rebuildFinalistsFromParsedResult,
      sortedFinalRows
    };
  }

  global.LivePalmesFinalWithdrawalsCore = { create };
})(window);
