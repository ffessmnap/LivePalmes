(function (global) {
  "use strict";
  let active = false;
  function collect({ decision, comment = "", notifyRequester = true, title = "Traiter la demande" }) {
    if (active) return Promise.resolve(null);
    active = true;
    return new Promise(resolve => {
      const dialog = document.createElement("dialog");
      dialog.className = "admin-engagements-create-dialog admin-request-decision";
      dialog.setAttribute("aria-label", title);
      dialog.innerHTML = '<form class="admin-access-form"><h3></h3><label>Commentaire transmis au demandeur<textarea rows="3" maxlength="500" data-decision-comment></textarea></label><label class="admin-request-notify"><input type="checkbox" data-decision-notify> Informer le demandeur par e-mail</label><p class="admin-portal-message" data-decision-message></p><div class="admin-portal-actions"><button type="submit">Confirmer</button><button type="button" class="ghost-button" data-decision-cancel>Annuler</button></div></form>';
      dialog.querySelector("h3").textContent = title;
      const input = dialog.querySelector("textarea"), notify = dialog.querySelector("input");
      input.value = comment;
      input.required = decision === "rejected";
      input.placeholder = input.required ? "Motif du refus obligatoire, même sans e-mail" : "Commentaire facultatif";
      notify.checked = notifyRequester;
      function finish(value) { dialog.close(); dialog.remove(); active = false; resolve(value); }
      dialog.querySelector("form").addEventListener("submit", event => {
        event.preventDefault();
        if (input.required && !input.value.trim()) { input.setCustomValidity("Le commentaire du refus est obligatoire."); input.reportValidity(); return; }
        finish({ resolutionNote: input.value.trim(), notifyRequester: notify.checked });
      });
      input.addEventListener("input", () => input.setCustomValidity(""));
      dialog.querySelector("[data-decision-cancel]").addEventListener("click", () => finish(null));
      dialog.addEventListener("cancel", event => { event.preventDefault(); finish(null); });
      document.body.append(dialog); dialog.showModal(); input.focus();
    });
  }
  function message(state = {}) {
    return ({ sent: "Demandeur informé par e-mail.", opted_out: "Notification désactivée pour cette décision.",
      blocked_test: "Notification préparée ; aucun e-mail envoyé sur TEST.", failed: "Décision enregistrée ; notification en échec.",
      uncertain: "Décision enregistrée ; envoi à vérifier, sans renvoi automatique.",
      pending: "Décision enregistrée ; notification en attente.", preparing: "Préparation du mail en cours ou à vérifier.", sending: "Envoi en cours ou à vérifier." })[state.status] || "Aucune notification enregistrée pour cette ancienne décision.";
  }
  function report(element, result, callable, callFunction) {
    if (!element) return;
    const state = result?.resolutionNotification || result?.request?.resolutionNotification || {};
    element.append(document.createTextNode(" " + message(state)));
    if (!["pending", "failed", "preparing", "sending"].includes(state.status) || !state.key) return;
    const button = document.createElement("button"); button.type = "button"; button.className = "ghost-button";
    button.textContent = state.status === "pending" ? "Envoyer la notification" : state.status === "failed" ? "Réessayer la notification" : "Vérifier la notification";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const retry = await callFunction(callable, { action: "retryNotification", requestId: result.requestId || result.request?.id,
          notificationKey: state.key });
        element.textContent = "Décision déjà enregistrée."; report(element, { ...retry, requestId: result.requestId || result.request?.id }, callable, callFunction);
      } catch { button.disabled = false; }
    });
    element.append(document.createTextNode(" "), button);
  }
  function history({ root, name, callable, resolver, callFunction, valid }) {
    if (!root || root.querySelector(`[data-decision-history="${name}"]`)) return;
    const section = document.createElement("details"); section.dataset.decisionHistory = name;
    section.innerHTML = '<summary></summary><p data-history-status></p><div data-history-rows></div><button type="button" class="ghost-button" data-history-refresh>Actualiser</button> <button type="button" class="ghost-button" data-history-next hidden>Page suivante</button>';
    section.querySelector("summary").textContent = name === "accounts" ? "Décisions traitées — suppressions de comptes" : "Décisions traitées — corrections, NS et signalements";
    const list = section.querySelector("[data-history-rows]"), status = section.querySelector("[data-history-status]"), next = section.querySelector("[data-history-next]");
    let cursor = null, loading = false;
    async function load(more = false) {
      if (loading || !valid()) return;
      loading = true; status.textContent = "Chargement…";
      try {
        const response = await callFunction(callable, { status: "history", ...(more ? { cursor } : {}) });
        if (!valid() || !section.isConnected) return;
        list.replaceChildren();
        for (const row of response.requests || []) {
          const card = document.createElement("article"); card.className = "admin-engagements-request-card";
          const text = document.createElement("p");
          const identity = row.targetEmail || [row.current?.lastName, row.current?.firstName].filter(Boolean).join(" ") || row.id;
          text.textContent = `${identity} — ${row.status === "approved" ? "Validée / clôturée" : "Refusée"} — ${row.resolvedAt || ""}${row.resolutionNote ? " — " + row.resolutionNote : ""}`;
          card.append(text); report(card, { requestId: row.id, resolutionNotification: row.resolutionNotification }, resolver, callFunction); list.append(card);
        }
        cursor = response.nextCursor; next.hidden = !cursor; status.textContent = list.children.length ? `${list.children.length} décision(s) — 25 maximum par page.` : "Aucune décision conservée.";
      } catch { status.textContent = "Historique indisponible. Réessayez avec Actualiser."; }
      finally { loading = false; }
    }
    section.addEventListener("toggle", () => { if (section.open) load(); });
    next.addEventListener("click", () => load(true)); section.querySelector("[data-history-refresh]").addEventListener("click", () => load());
    root.append(section);
  }
  global.LivePalmesRequestDecision = { collect, message, report, history };
})(window);
