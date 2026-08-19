(function (global) {
  "use strict";

  const TYPES = { training: "Formation", stage: "Stage", meeting: "Réunion", other: "Autre" };
  const LEVELS = { departemental: "Départemental", regional: "Régional", national: "National" };
  const CATEGORIES = { poster: "Affiche", circular: "Circulaire", rules: "Règlement", information: "Information", access: "Plan / accès", other: "Autre" };
  let current = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function isoToLocalInput(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function functionsService() {
    const firebase = global.firebase;
    const config = global.LivePalmesAppConfig?.firebaseConfig;
    if (!firebase?.initializeApp || !config) throw new Error("Firebase indisponible.");
    if (!firebase.apps?.length) firebase.initializeApp(config);
    const service = firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
    return global.LivePalmesAppConfig?.configureFunctionsService?.(service) || service;
  }

  async function call(name, payload) {
    const result = await functionsService().httpsCallable(name)(payload || {});
    return result.data || {};
  }

  function ensureDialog() {
    let dialog = document.querySelector("#adminCalendarEventDialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "adminCalendarEventDialog";
    dialog.className = "admin-engagements-create-dialog admin-calendar-event-dialog";
    dialog.setAttribute("aria-labelledby", "adminCalendarEventTitle");
    document.body.append(dialog);
    dialog.addEventListener("click", (event) => {
      if (event.target.closest("[data-calendar-event-close]")) dialog.close();
      if (event.target.closest("[data-calendar-program-add]")) addProgramRow();
      const removeProgram = event.target.closest("[data-calendar-program-remove]");
      if (removeProgram) removeProgram.closest("[data-calendar-program-row]")?.remove();
      const deleteDocument = event.target.closest("[data-calendar-document-delete]");
      if (deleteDocument) deleteEventDocument(deleteDocument.dataset.calendarDocumentDelete);
      if (event.target.closest("[data-calendar-event-delete]")) deleteEvent();
    });
    dialog.addEventListener("submit", (event) => {
      if (event.target.matches("[data-calendar-event-form]")) saveEvent(event);
      if (event.target.matches("[data-calendar-document-form]")) uploadDocument(event);
    });
    return dialog;
  }

  function regionOptions(selected) {
    const source = document.querySelector("#adminEngagementsRegionId");
    return Array.from(source?.options || []).map((option) =>
      `<option value="${escapeHtml(option.value)}" ${option.value === selected ? "selected" : ""}>${escapeHtml(option.textContent)}</option>`
    ).join("");
  }

  function renderProgram(program = []) {
    return program.map((session, index) => `
      <div class="admin-calendar-program-row" data-calendar-program-row>
        <label>Réunion<input data-program-label maxlength="80" value="${escapeHtml(session.label || `Réunion ${index + 1}`)}" required></label>
        <label>Date<input data-program-date type="date" value="${escapeHtml(session.date || current?.date || "")}"></label>
        <label>Début<input data-program-start type="time" value="${escapeHtml(session.startTime || "")}"></label>
        <label>Fin<input data-program-end type="time" value="${escapeHtml(session.endTime || "")}"></label>
        <label class="admin-calendar-program-summary">Résumé<input data-program-summary maxlength="240" value="${escapeHtml(session.summary || "")}"></label>
        <button class="ghost-button compact" type="button" data-calendar-program-remove aria-label="Supprimer cette réunion">Supprimer</button>
      </div>`).join("");
  }

  function renderDocuments(documents = []) {
    if (!documents.length) return "<p>Aucun document public.</p>";
    return documents.map((document) => `
      <article class="admin-calendar-document">
        <div><strong>${escapeHtml(document.title || document.fileName)}</strong><small>${escapeHtml(CATEGORIES[document.category] || "Autre")} · ${escapeHtml(document.fileName || "")}</small></div>
        <div class="admin-portal-actions"><a class="ghost-button compact" href="${escapeHtml(document.url || "#")}" target="_blank" rel="noopener">Ouvrir</a><button class="ghost-button compact" type="button" data-calendar-document-delete="${escapeHtml(document.id)}">Supprimer</button></div>
      </article>`).join("");
  }

  function render(event) {
    current = event;
    const dialog = ensureDialog();
    dialog.innerHTML = `
      <form class="admin-engagements-form" data-calendar-event-form>
        <header class="admin-engagements-create-header"><div><p class="eyebrow">Calendrier public</p><h2 id="adminCalendarEventTitle">${escapeHtml(event.name || "Événement")}</h2></div><button class="ghost-button compact" type="button" data-calendar-event-close>Fermer</button></header>
        <fieldset class="admin-engagements-form-section"><legend>Informations publiques</legend><div class="admin-engagements-form-section-grid">
          <label>Type<select name="eventType" required>${Object.entries(TYPES).map(([value, label]) => `<option value="${value}" ${event.eventType === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label>Nom<input name="name" maxlength="160" value="${escapeHtml(event.name)}" required></label>
          <label>Date<input name="date" type="date" value="${escapeHtml(event.date)}" required></label>
          <label>Date de fin<input name="endDate" type="date" value="${escapeHtml(event.endDate || event.date)}" required></label>
          <label>Lieu<input name="location" maxlength="160" value="${escapeHtml(event.location)}" required></label>
          <label>Ville<input name="city" maxlength="120" value="${escapeHtml(event.city || event.location)}" required></label>
          <label>Adresse<input name="address" maxlength="300" value="${escapeHtml(event.address)}"></label>
          <label>Organisateur<input name="organizer" maxlength="160" value="${escapeHtml(event.organizer)}"></label>
          <label>Niveau<select name="level">${Object.entries(LEVELS).map(([value, label]) => `<option value="${value}" ${event.level === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
          <label>Région<select name="regionId">${regionOptions(event.regionId)}</select></label>
          <label>Clôture des inscriptions<input name="entryDeadlineAt" type="datetime-local" value="${escapeHtml(isoToLocalInput(event.entryDeadlineAt))}"></label>
          <label>Lien d’inscription<input name="registrationUrl" type="url" maxlength="500" value="${escapeHtml(event.registrationUrl)}" placeholder="https://..."></label>
          <label>Publication<select name="publicationStatus"><option value="draft">Brouillon</option><option value="published" ${event.publicationStatus === "published" ? "selected" : ""}>Publié</option></select></label>
          <label class="admin-calendar-event-check"><input name="canceled" type="checkbox" ${event.canceled ? "checked" : ""}> Événement annulé</label>
          <label class="admin-calendar-event-description">Présentation<textarea name="publicDescription" maxlength="3000" rows="4">${escapeHtml(event.publicDescription)}</textarea></label>
        </div></fieldset>
        <fieldset class="admin-engagements-form-section"><legend>Programme synthétique</legend><div data-calendar-program-list>${renderProgram(event.program || [])}</div><button class="ghost-button compact" type="button" data-calendar-program-add>Ajouter une réunion</button></fieldset>
        <p class="admin-portal-message" data-calendar-event-message aria-live="polite"></p>
        <div class="admin-portal-actions"><button class="ghost-button danger" type="button" data-calendar-event-delete>Supprimer</button><button type="submit">Enregistrer</button></div>
      </form>
      <section class="admin-engagements-card admin-calendar-documents"><h3>Documents publics</h3><p>Tous les fichiers ajoutés ici sont accessibles sans connexion. Un remplacement conserve la même URL publique.</p>
        <form class="admin-engagements-form" data-calendar-document-form><div class="admin-engagements-form-section-grid"><label>Fichier<input name="file" type="file" required></label><label>Titre<input name="title" maxlength="160" required></label><label>Catégorie<select name="category">${Object.entries(CATEGORIES).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label><label>Description<input name="description" maxlength="500"></label></div><button type="submit">Mettre en ligne</button><p class="admin-portal-message" data-calendar-document-message aria-live="polite"></p></form>
        <div data-calendar-document-list>${renderDocuments(event.clubDocuments || [])}</div>
      </section>`;
  }

  function addProgramRow() {
    const list = ensureDialog().querySelector("[data-calendar-program-list]");
    const index = list.querySelectorAll("[data-calendar-program-row]").length;
    list.insertAdjacentHTML("beforeend", renderProgram([{ label: `Réunion ${index + 1}`, date: current?.date || "" }]));
  }

  function payloadFromForm(form) {
    const data = new FormData(form);
    const deadline = data.get("entryDeadlineAt") ? new Date(data.get("entryDeadlineAt")) : null;
    const program = Array.from(form.querySelectorAll("[data-calendar-program-row]")).map((row) => ({
      label: row.querySelector("[data-program-label]").value,
      date: row.querySelector("[data-program-date]").value,
      startTime: row.querySelector("[data-program-start]").value,
      endTime: row.querySelector("[data-program-end]").value,
      summary: row.querySelector("[data-program-summary]").value
    }));
    const payload = Object.fromEntries(["eventType", "name", "date", "endDate", "location", "city", "address", "organizer", "level", "regionId", "registrationUrl", "publicationStatus", "publicDescription"].map((name) => [name, data.get(name) || ""]));
    return { ...payload, entryDeadlineAt: deadline && !Number.isNaN(deadline.getTime()) ? deadline.toISOString() : "", canceled: data.get("canceled") === "on", programSessions: program };
  }

  async function saveEvent(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = form.querySelector("[data-calendar-event-message]");
    message.textContent = "Enregistrement…";
    try {
      const result = await call("updateEngagementCalendarEvent", { calendarEventId: current.id, ...payloadFromForm(form) });
      render(result.event);
      ensureDialog().querySelector("[data-calendar-event-message]").textContent = "Événement enregistré.";
      global.dispatchEvent(new CustomEvent("livepalmes:calendar-events-changed", { detail: { action: "upsert", event: result.event } }));
    } catch (error) { message.textContent = `Enregistrement impossible : ${error?.message || error}`; }
  }

  function readFile(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
  }

  async function uploadDocument(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = form.querySelector("[data-calendar-document-message]");
    const file = form.elements.file.files[0];
    if (!file || file.size > 10 * 1024 * 1024) { message.textContent = "Choisissez un fichier de 10 Mo maximum."; return; }
    message.textContent = "Mise en ligne…";
    try {
      const result = await call("uploadEngagementCompetitionDocument", { calendarEventId: current.id, fileName: file.name, fileDataUrl: await readFile(file), title: form.elements.title.value, category: form.elements.category.value, description: form.elements.description.value });
      current.clubDocuments = result.documents || [];
      form.reset();
      ensureDialog().querySelector("[data-calendar-document-list]").innerHTML = renderDocuments(current.clubDocuments);
      message.textContent = "Document public mis en ligne.";
      global.dispatchEvent(new CustomEvent("livepalmes:calendar-events-changed", { detail: { action: "upsert", event: { ...current, documentCount: current.clubDocuments.length } } }));
    } catch (error) { message.textContent = `Mise en ligne impossible : ${error?.message || error}`; }
  }

  async function deleteEventDocument(documentId) {
    if (!global.confirm("Supprimer ce document public ?")) return;
    const result = await call("deleteEngagementCompetitionDocument", { calendarEventId: current.id, documentId });
    current.clubDocuments = result.documents || [];
    ensureDialog().querySelector("[data-calendar-document-list]").innerHTML = renderDocuments(current.clubDocuments);
    global.dispatchEvent(new CustomEvent("livepalmes:calendar-events-changed", { detail: { action: "upsert", event: { ...current, documentCount: current.clubDocuments.length } } }));
  }

  async function deleteEvent() {
    if (!global.confirm(`Supprimer définitivement « ${current.name} » ?`)) return;
    const calendarEventId = current.id;
    await call("deleteEngagementCalendarEvent", { calendarEventId });
    ensureDialog().close();
    global.dispatchEvent(new CustomEvent("livepalmes:calendar-events-changed", { detail: { action: "delete", calendarEventId } }));
  }

  async function open(calendarEventId) {
    const dialog = ensureDialog();
    dialog.innerHTML = "<p class=\"admin-portal-message\">Chargement de l’événement…</p>";
    dialog.showModal();
    try { const result = await call("getEngagementCalendarEvent", { calendarEventId }); render(result.event); }
    catch (error) { dialog.innerHTML = `<p class="admin-portal-message">Ouverture impossible : ${escapeHtml(error?.message || error)}</p><button class="ghost-button" type="button" data-calendar-event-close>Fermer</button>`; }
  }

  global.LivePalmesCalendarEvents = { open };
})(window);
