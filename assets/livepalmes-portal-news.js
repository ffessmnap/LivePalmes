(function (global) {
  "use strict";
  function create(options = {}) {
    const auth = () => options.auth || global.LivePalmesPortalAuth;
    const canRead = () => auth()?.isAdminAuthenticated() && ["engagements.national.manage", "engagements.region.manage", "admin.full"].some(cap => auth().hasCapability(cap));
    const canEdit = () => canRead() && ["engagements.national.manage", "admin.full"].some(cap => auth().hasCapability(cap));
    const el = suffix => document.getElementById("adminNews" + suffix);
    const node = (tag, text, className) => { const item = document.createElement(tag); if (text) item.textContent = text; if (className) item.className = className; return item; };
    const call = options.call || (async input => {
      const service = global.firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
      return (await (global.LivePalmesAppConfig?.configureFunctionsService?.(service) || service).httpsCallable("managePortalNews")(input)).data;
    });
    let entries = [], revision = null, loadedAt = 0, busy = false, active = false, editingId = null, baseline = "", generation = 0, limit = 20, initialized = false, uid = "";
    const message = text => { el("Status").textContent = text; };
    const dirty = () => !el("Form").hidden && baseline !== JSON.stringify([el("Date").value, el("Text").value]);
    function setBusy(value) {
      busy = value;
      document.querySelectorAll("#adminNewsView button, #adminNewsForm input, #adminNewsForm textarea").forEach(item => { item.disabled = value || item.id === "adminNewsAdd" && revision === null; });
    }
    function dateLabel(value) {
      const parts = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).formatToParts(new Date(value));
      const part = type => parts.find(item => item.type === type)?.value;
      return `${part("day")} ${part("month")} ${part("year")} à ${part("hour")} h ${part("minute")}`;
    }
    function render() {
      el("Add").hidden = !canEdit();
      const list = el("PublishedEntries"); list.replaceChildren();
      if (revision !== null && !entries.length) list.append(node("p", "Aucune nouveauté publiée pour le moment."));
      for (const entry of entries.slice(0, limit)) {
        const article = node("article"), head = node("div", "", "admin-news-entry-head"), title = node("h3"), time = node("time", dateLabel(entry.publishedAt));
        time.dateTime = entry.publishedAt; title.append(time); head.append(title);
        if (canEdit()) {
          const controls = node("div", "", "admin-news-actions");
          for (const [action, label] of [["edit", "✎ Modifier"], ["delete", "Supprimer"]]) {
            const button = node("button", label, "ghost-button compact"); button.type = "button";
            button.dataset.newsAction = action; button.dataset.newsId = entry.id;
            button.setAttribute("aria-label", `${action === "edit" ? "Modifier" : "Supprimer"} la nouveauté du ${dateLabel(entry.publishedAt)}`);
            controls.append(button);
          }
          head.append(controls);
        }
        const lines = node("ul"); entry.lines.forEach(line => lines.append(node("li", line)));
        article.append(head, lines); list.append(article);
      }
      el("More").hidden = entries.length <= limit;
      setBusy(busy);
    }
    function accept(result) { entries = result.entries; revision = result.revision; loadedAt = Date.now(); render(); }
    function closeEditor() { el("Form").hidden = true; editingId = null; baseline = ""; }
    function confirmDiscard() { return !dirty() || global.confirm("Abandonner les modifications non enregistrées ?"); }
    async function load() {
      if (busy || !canRead()) return;
      const run = generation; setBusy(true); message("Chargement des nouveautés…");
      try {
        const result = await call({ action: "list" });
        if (run !== generation || !canRead()) return;
        accept(result); message("");
      } catch (error) {
        if (run === generation) message(error.message || "Chargement indisponible. Utilisez Actualiser pour réessayer.");
      } finally { if (run === generation) setBusy(false); }
    }
    function edit(id) {
      if (busy || !canEdit() || revision === null || !confirmDiscard()) return;
      const entry = entries.find(item => item.id === id);
      editingId = entry?.id || null;
      const date = entry ? new Date(entry.publishedAt) : new Date();
      el("Date").value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      el("Text").value = entry?.lines.join("\n") || "";
      el("FormTitle").textContent = entry ? "Modifier la nouveauté" : "Ajouter une nouveauté";
      el("Save").textContent = entry ? "Enregistrer" : "Publier";
      baseline = JSON.stringify([el("Date").value, el("Text").value]);
      el("Form").hidden = false; message(""); el("Text").focus();
    }
    async function mutate(input) {
      if (busy || !canEdit() || revision === null) return;
      const run = generation; setBusy(true); message("Enregistrement…");
      try {
        const result = await call({ ...input, expectedRevision: revision });
        if (run !== generation || !canEdit()) return;
        closeEditor(); limit = 20; accept(result); message(input.action === "delete" ? "Nouveauté supprimée." : "Nouveauté enregistrée."); el("Add").focus();
      } catch (error) {
        if (run === generation) message((error.message || "Enregistrement non confirmé. Actualisez avant de réessayer.") + " Votre texte reste dans le formulaire.");
      } finally { if (run === generation) setBusy(false); }
    }
    function ensure() {
      if (initialized) return; initialized = true;
      el("Add").addEventListener("click", () => edit(null));
      // A refresh deliberately preserves the draft, including after a conflict.
      el("Refresh").addEventListener("click", () => { void load(); });
      el("Cancel").addEventListener("click", () => { if (confirmDiscard()) { closeEditor(); el("Add").focus(); } });
      el("More").addEventListener("click", () => { limit += 20; render(); });
      el("Form").addEventListener("submit", event => {
        event.preventDefault();
        const date = new Date(el("Date").value);
        if (!Number.isFinite(date.getTime())) { message("Date et heure invalides."); return; }
        void mutate({ action: "save", id: editingId, text: el("Text").value, publishedAt: date.toISOString() });
      });
      el("PublishedEntries").addEventListener("click", event => {
        const button = event.target.closest("[data-news-action]"); if (!button || busy || !canEdit()) return;
        if (button.dataset.newsAction === "edit") edit(button.dataset.newsId);
        else if (confirmDiscard() && global.confirm("Supprimer définitivement cette nouveauté ?")) void mutate({ action: "delete", id: button.dataset.newsId });
      });
      global.addEventListener("beforeunload", event => { if (canEdit() && (busy || dirty())) { event.preventDefault(); event.returnValue = ""; } });
    }
    function reset() {
      generation++; entries = []; revision = null; loadedAt = 0; busy = false; limit = 20;
      closeEditor(); el("PublishedEntries").replaceChildren(); el("Add").hidden = true; el("More").hidden = true; message(""); setBusy(false);
    }
    function refreshAuth() {
      const nextUid = options.uid?.() || global.firebase?.auth?.()?.currentUser?.uid || "";
      if (!canRead() || uid !== nextUid) reset();
      uid = nextUid;
      if (!canEdit()) closeEditor();
      if (canRead()) { render(); if (active && revision === null) void load(); }
    }
    function setActive(value) {
      ensure(); active = value && canRead();
      if (!active) return;
      render();
      if (revision === null || !dirty() && Date.now() - loadedAt >= 60000) void load();
    }
    function beforeNavigate() {
      if (!active || global.location.hash === "#nouveautes") return true;
      if (busy || !confirmDiscard()) { global.history.replaceState(null, "", "#nouveautes"); return false; }
      closeEditor(); return true;
    }
    return { setActive, beforeNavigate, refreshAuth };
  }
  const instance = create(); global.LivePalmesPortalNews = { ...instance, create };
  let attempts = 0;
  function subscribe() {
    if (global.LivePalmesPortalAuth?.onChange) {
      global.LivePalmesPortalAuth.onChange(() => { instance.refreshAuth(); instance.setActive(global.location.hash === "#nouveautes"); });
      instance.refreshAuth(); instance.setActive(global.location.hash === "#nouveautes");
    } else if (attempts++ < 20) global.setTimeout(subscribe, 100);
  }
  subscribe();
})(window);
