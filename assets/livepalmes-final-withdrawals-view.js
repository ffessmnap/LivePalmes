(function attachLivePalmesFinalWithdrawalsView(global) {
  function create(helpers = {}) {
    const escapeHtml = helpers.escapeHtml || ((value) => String(value ?? ""));
    const finalRowKey = helpers.finalRowKey || (() => "");
    const finalistRowName = helpers.finalistRowName || (() => "");
    const finalPreWithdrawalForRow = helpers.finalPreWithdrawalForRow || (() => null);
    const formatDeadlineTime = helpers.formatDeadlineTime || (() => "");
    const normalizeFinalistsOrder = helpers.normalizeFinalistsOrder || ((finalists) => finalists || {});
    const nextUnqualifiedRowsForSecretary = helpers.nextUnqualifiedRowsForSecretary || (() => []);
    const secretaryFinals = helpers.livePalmesSecretaryFinals || {};

    function renderFinalWithdrawalGroup(title, result, finalKey, rows = []) {
      if (!rows.length) return "";
      const now = new Date();
      return secretaryFinals.renderWithdrawalGroupHtml(title, rows.map((row, index) => {
        const limit = helpers.finalWithdrawalLimitLabel(row, result);
        const canWithdraw = helpers.canWithdrawFinalist(row, result, now);
        const hasDeadline = helpers.hasFinalWithdrawalDeadline(row, result);
        const canWithdrawUnannouncedReplacement = helpers.canWithdrawBeforeReplacementAnnouncement(row);
        const expired = helpers.isFinalWithdrawalDeadlineExpired(row, result, now);
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
            : (limit ? (canWithdraw ? `Forfait possible jusqu'\u00e0 ${limit}` : "Forfait ferm\u00e9") : (canWithdrawUnannouncedReplacement ? "Rep\u00eachage non annonc\u00e9" : "En attente annonce speaker")),
          withdrawn: Boolean(row.withdrawnAt)
        };
      }));
    }

    function renderSecretaryUnqualifiedGroup(result, { actions = true, open = false } = {}) {
      const rows = nextUnqualifiedRowsForSecretary(result);
      if (!rows.length) return "";
      return secretaryFinals.renderUnqualifiedGroupHtml({
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
            status: preWithdrawal ? `Pr\u00e9-forfait d\u00e9clar\u00e9 \u00e0 ${formatDeadlineTime(new Date(preWithdrawal.at))}` : (row.statusLabel || `Non qualifi\u00e9${result.sex === "F" ? "e" : ""}`)
          };
        })
      });
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
                  ${row.withdrawnAt ? `<small>Forfait \u00e0 ${escapeHtml(formatDeadlineTime(new Date(row.withdrawnAt)))}</small>` : ""}
                  ${row.repechaged && !row.withdrawnAt ? `<small class="repechage-label">Rep\u00each\u00e9${result.sex === "F" ? "e" : ""}</small>` : ""}
                </div>
              </li>
            `).join("")}
          </ol>
        </div>
      ` : "";
      return secretaryFinals.renderCompositionListHtml({
        finalAHtml: renderRows("Finale A", finalists.a || []),
        finalBHtml: renderRows("Finale B", finalists.b || []),
        unqualifiedHtml: renderSecretaryUnqualifiedGroup(result, { actions: false })
      });
    }

    return {
      renderFinalCompositionList,
      renderFinalWithdrawalGroup,
      renderSecretaryUnqualifiedGroup
    };
  }

  global.LivePalmesFinalWithdrawalsView = { create };
})(window);
