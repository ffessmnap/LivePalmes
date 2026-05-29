(function attachLivePalmesFinalWithdrawalsModals(global) {
  function create(options = {}) {
    const {
      alertDetailModal,
      escapeHtml,
      finalCompositionIsDefinitive,
      livePalmesAlertDetailView,
      normalizeFinalistsOrder,
      raceResults = [],
      renderFinalCompositionList,
      renderFinalWithdrawalGroup,
      renderSecretaryUnqualifiedGroup,
      resultDetailView,
      sexDisplayLabel
    } = options;

    function setHtml(html) {
      if (!alertDetailModal) return;
      alertDetailModal.innerHTML = html;
      alertDetailModal.hidden = false;
    }

    function renderErrorHtml(title, message) {
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

    function openFinalWithdrawalsModal(resultId, modalOptions = {}) {
      const result = raceResults.find((item) => item.id === resultId);
      if (!result || !alertDetailModal) return;
      try {
        const finalists = normalizeFinalistsOrder(result.finalists || {});
        const html = livePalmesAlertDetailView.renderFinalWithdrawalsModalHtml({
          eventLabel: result.eventLabel || result.eventId,
          finalAHtml: renderFinalWithdrawalGroup("Finale A", result, "a", finalists.a || []),
          finalBHtml: renderFinalWithdrawalGroup("Finale B", result, "b", finalists.b || []),
          sexLabel: result.sexLabel || sexDisplayLabel(result.sex),
          unqualifiedHtml: renderSecretaryUnqualifiedGroup(result, { open: Boolean(modalOptions.openUnqualified) })
        });
        setHtml(html);
      } catch (error) {
        console.error("Impossible d'ouvrir la gestion des forfaits finales", error);
        setHtml(renderErrorHtml("Finales indisponibles", error?.message || String(error || "")));
      }
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
        setHtml(html);
      } catch (error) {
        console.error("Impossible d'ouvrir la composition finale", error);
        setHtml(renderErrorHtml("Finalistes indisponibles", error?.message || String(error || "")));
      }
    }

    function openResultDetailsModal(resultId) {
      const result = raceResults.find((item) => item.id === resultId);
      if (!result || !alertDetailModal) return;
      try {
        setHtml(resultDetailView.renderModalHtml(result));
      } catch (error) {
        console.error("Impossible d'ouvrir le detail du resultat", error);
        setHtml(renderErrorHtml("Resultat indisponible", error?.message || String(error || "")));
      }
    }

    return {
      openFinalCompositionResultModal,
      openFinalWithdrawalsModal,
      openResultDetailsModal,
      renderErrorHtml,
      setHtml
    };
  }

  global.LivePalmesFinalWithdrawalsModals = { create };
})(window);
