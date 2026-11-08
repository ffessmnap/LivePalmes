(function (global) {
  "use strict";
  let instance;
  function create(root, call) {
    root.innerHTML = `<div class="admin-national-home-group-head"><h3>Modèles de mails</h3></div>
      <p>Les modifications s’appliquent uniquement aux prochaines préparations. Les mails déjà préparés conservent leur texte. Enregistrer n’envoie aucun mail.</p>
      <p><button type="button" data-mail-refresh class="ghost-button">Actualiser les modèles</button></p>
      <p data-mail-status role="status" aria-live="polite"></p>
      <form class="admin-mail-template-form" data-mail-form hidden>
        <label>Type de mail<select data-mail-type></select></label>
        <p data-mail-meta></p><p data-mail-note></p>
        <label>Objet<input data-mail-subject maxlength="220" autocomplete="off" required></label>
        <label>Texte<textarea data-mail-text rows="16" maxlength="5000" required></textarea></label>
        <div data-mail-variables><p>Variables automatiques : choisissez une variable pour l’insérer. Les blocs obligatoires doivent rester présents une seule fois, sur une ligne distincte dans le texte.</p><div data-mail-tokens class="admin-mail-template-tokens"></div></div>
        <div class="admin-mail-template-actions"><button type="button" data-mail-preview class="ghost-button">Aperçu fictif</button><button type="submit" data-mail-save class="admin-primary-button">Enregistrer</button><button type="button" data-mail-reset class="ghost-button">Revenir au modèle par défaut</button></div>
      </form>
      <section data-mail-preview-panel hidden aria-label="Aperçu fictif du mail"><h4>Aperçu avec des données fictives</h4><p><strong data-mail-preview-subject></strong></p><div data-mail-preview-text class="admin-mail-template-preview"></div></section>`;
    const el = name => root.querySelector(`[data-mail-${name}]`), form = el("form"), subject = el("subject"), text = el("text"), selector = el("type");
    let data, busy = false, dirty = false, disposed = false, field = text, loadedAt = 0, generation = 0;
    const model = () => data?.models.find(item => item.id === selector.value);
    function message(value, error = false) { if (disposed) return; el("status").textContent = value; el("status").dataset.tone = error ? "error" : "ok"; }
    function pending(value) {
      if (disposed) return;
      busy = value;
      root.querySelectorAll("button,input,textarea,select").forEach(node => { node.disabled = value; });
      if (!value && data) { subject.disabled = text.disabled = !model().editable; el("save").disabled = el("reset").disabled = el("preview").disabled = !model().editable; }
      form.setAttribute("aria-busy", String(value));
    }
    function show() {
      if (disposed) return;
      const item = model(); if (!item) return;
      generation++; dirty = false; subject.value = item.subject; text.value = item.text;
      el("preview-panel").hidden = true;
      el("meta").textContent = item.updatedAt
        ? `${item.customized ? "Modèle personnalisé" : "Modèle par défaut rétabli"} — version ${item.revision} — ${new Date(item.updatedAt).toLocaleString("fr-FR")} — ${item.updatedByEmail || item.updatedBy}`
        : "Modèle par défaut LivePalmes";
      el("note").textContent = item.note || "Les destinataires, pièces jointes et liens de gestion des notifications restent gérés automatiquement.";
      el("variables").hidden = !item.editable;
      el("tokens").replaceChildren();
      for (const token of item.variables) {
        const button = document.createElement("button"); button.type = "button"; button.className = "ghost-button";
        button.textContent = `{{${token}}}${item.required.includes(token) ? " — obligatoire" : ""}`;
        button.addEventListener("click", () => {
          if (busy) return;
          if (item.blocks.includes(token)) field = text;
          const start = field.selectionStart, end = field.selectionEnd;
          const separate = item.blocks.includes(token);
          const value = `${separate && start > 0 && field.value[start - 1] !== "\n" ? "\n" : ""}{{${token}}}${separate && end < field.value.length && field.value[end] !== "\n" ? "\n" : ""}`;
          if (field.value.length - (end - start) + value.length > field.maxLength) { message("Le champ a atteint sa longueur maximale.", true); return; }
          field.setRangeText(value, start, end, "end"); field.focus(); edited();
        });
        el("tokens").append(button);
      }
      pending(false);
    }
    function edited() { dirty = true; generation++; el("preview-panel").hidden = true; message("Modifications non enregistrées."); }
    function discard() { return !dirty || global.confirm("Abandonner les modifications non enregistrées ?"); }
    async function load(force = false) {
      if (disposed || busy || (!force && (dirty || data && Date.now() - loadedAt < 30000))) return;
      if (force && !discard()) return;
      pending(true); message("Chargement des modèles…");
      try {
        const selected = selector.value;
        data = await call("getEngagementAutomaticMailControl", { action: "mailTemplates" }); loadedAt = Date.now();
        if (disposed) return;
        selector.replaceChildren(...data.models.map(item => { const option = document.createElement("option"); option.value = item.id; option.textContent = item.label + (!item.editable ? " — géré séparément" : ""); return option; }));
        if (data.models.some(item => item.id === selected)) selector.value = selected;
        selector.dataset.previous = selector.value; form.hidden = false; show(); message("Modèles chargés. Aucun mail envoyé.");
      } catch (error) { message(error.message || "Chargement impossible. Réessayez avec Actualiser.", true); }
      finally { pending(false); }
    }
    selector.addEventListener("change", () => {
      if (!discard()) { selector.value = selector.dataset.previous; return; }
      selector.dataset.previous = selector.value; show(); message("");
    });
    for (const input of [subject, text]) { input.addEventListener("focus", () => { field = input; }); input.addEventListener("input", edited); }
    el("refresh").addEventListener("click", () => load(true));
    el("preview").addEventListener("click", async () => {
      if (busy || !model()?.editable) return;
      const version = generation; pending(true); message("Préparation de l’aperçu fictif…");
      try {
        const result = await call("getEngagementAutomaticMailControl", { action: "previewMailTemplate", id: model().id, subject: subject.value, text: text.value });
        if (disposed || version !== generation) return;
        el("preview-subject").textContent = result.subject;
        // The preview is deliberately inert: no image, iframe or remote link is loaded.
        el("preview-text").textContent = result.text; el("preview-panel").hidden = false;
        message("Aperçu fictif. Aucun mail envoyé.");
      } catch (error) { message(error.message || "Aperçu impossible.", true); }
      finally { pending(false); }
    });
    async function save(operation) {
      if (busy || !model()?.editable) return;
      if (operation === "reset" && !global.confirm("Revenir au modèle par défaut pour les prochaines préparations ? Aucun mail ne sera envoyé.")) return;
      const id = model().id; pending(true); message("Enregistrement…");
      try {
        data = await call("updateEngagementAutomaticMailControl", { action: "mailTemplate", operation, id, expectedRevision: data.revision, subject: subject.value, text: text.value });
        loadedAt = Date.now(); show(); message(operation === "reset" ? "Modèle par défaut rétabli. Aucun mail envoyé." : "Modèle enregistré pour les prochaines préparations. Aucun mail envoyé.");
      } catch (error) { message(error.message || "Enregistrement impossible. Actualisez pour vérifier la version enregistrée.", true); }
      finally { pending(false); }
    }
    form.addEventListener("submit", event => { event.preventDefault(); void save("save"); });
    el("reset").addEventListener("click", () => save("reset"));
    const beforeUnload = event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    global.addEventListener("beforeunload", beforeUnload);
    return { load, dispose: () => { disposed = true; global.removeEventListener("beforeunload", beforeUnload); root.replaceChildren(); root.hidden = true; } };
  }
  function setIdentity(identity = "") {
    if (instance && instance.identity !== identity) { instance.dispose(); instance = null; }
  }
  global.LivePalmesMailTemplateEditor = { setIdentity, open({ root, callFunction, identity = "" }) {
    setIdentity(identity);
    instance ||= { ...create(root, callFunction), identity }; root.hidden = false; return instance.load();
  } };
})(window);
