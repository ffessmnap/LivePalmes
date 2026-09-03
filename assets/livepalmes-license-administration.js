(() => {
  "use strict";

  const bridge = window.LivePalmesLicenseAdministration;
  const panel = document.querySelector('[data-engagements-national-panel="licenses"]');
  if (!bridge || !panel) return;

  const elements = {
    season: document.querySelector("#adminLicenseControlSeason"),
    requiredDate: document.querySelector("#adminLicenseControlRequiredDate"),
    competitions: document.querySelector("#adminLicenseControlCompetitions"),
    reload: document.querySelector("#adminLicenseControlReloadCompetitions"),
    prepare: document.querySelector("#adminLicenseControlPrepare"),
    workspace: document.querySelector("#adminLicenseControlWorkspace"),
    summary: document.querySelector("#adminLicenseControlSummary"),
    exportButton: document.querySelector("#adminLicenseControlExport"),
    importInput: document.querySelector("#adminLicenseControlImport"),
    selectPending: document.querySelector("#adminLicenseControlSelectPending"),
    validate: document.querySelector("#adminLicenseControlValidate"),
    results: document.querySelector("#adminLicenseControlResults"),
    status: document.querySelector("#adminLicenseControlStatus")
  };
  const state = { competitions: [], batch: null, imported: new Map(), loadingCompetitions: false, validating: false };
  const LICENSE_PATTERN = /^[A-Z]-\d{2}-\d+$/;

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function currentSeasonStartYear(date = new Date()) {
    return date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  }

  function seasonBounds(label) {
    const match = String(label || "").match(/^(\d{4})-(\d{4})$/);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) return null;
    return { start: `${match[1]}-09-01`, end: `${match[2]}-08-31`, required: `${match[2]}-12-31` };
  }

  function displayDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value || "—";
  }

  function setStatus(message, tone = "ok") {
    elements.status.textContent = message;
    elements.status.dataset.tone = tone;
  }

  function normalizeLicense(value) {
    const compact = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!compact) return "";
    const letter = compact.match(/[A-Z]/)?.[0] || "";
    const digits = compact.replace(/\D/g, "");
    return [letter, digits.slice(0, 2), digits.slice(2)].filter(Boolean).join("-");
  }

  function initializeSeasons() {
    const start = currentSeasonStartYear();
    elements.season.innerHTML = Array.from({ length: 6 }, (_, index) => start - 1 + index)
      .map((year) => `<option value="${year}-${year + 1}" ${year === start ? "selected" : ""}>${year}-${year + 1}</option>`)
      .join("");
    updateSeasonPresentation();
  }

  function updateSeasonPresentation() {
    const bounds = seasonBounds(elements.season.value);
    if (elements.requiredDate) elements.requiredDate.textContent = displayDate(bounds?.required || "");
  }

  function selectedCompetitionIds() {
    return Array.from(elements.competitions.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
  }

  function syncPrepareButton() {
    const count = selectedCompetitionIds().length;
    elements.prepare.disabled = state.loadingCompetitions || count < 1 || count > 5;
  }

  function renderCompetitions() {
    if (!state.competitions.length) {
      elements.competitions.innerHTML = '<p class="admin-engagements-empty">Aucune compétition trouvée pour cette saison.</p>';
      syncPrepareButton();
      return;
    }
    const statusLabels = { open: "Engagements ouverts", upcoming: "À venir", closed: "Engagements fermés" };
    elements.competitions.innerHTML = state.competitions.map((competition) => `
      <label class="admin-license-admin-competition">
        <input type="checkbox" value="${escapeHtml(competition.id)}">
        <strong>${escapeHtml(competition.name || competition.title || "Compétition")}</strong>
        <span class="admin-license-admin-competition-state">${escapeHtml(statusLabels[competition.entryStatus] || "Compétition")}</span>
        <small>${escapeHtml(displayDate(competition.date))} · ${escapeHtml(competition.location || competition.city || "Lieu non renseigné")}</small>
      </label>`).join("");
    syncPrepareButton();
  }

  async function loadCompetitions() {
    if (!bridge.canManage() || state.loadingCompetitions) return;
    const bounds = seasonBounds(elements.season.value);
    if (!bounds) return;
    state.loadingCompetitions = true;
    elements.reload.disabled = true;
    elements.prepare.disabled = true;
    setStatus("Chargement des compétitions de la saison…", "loading");
    try {
      const result = await bridge.callFunction("listEngagementCompetitions", {
        manageOnly: true,
        ranges: [{ fromDate: bounds.start, toDate: bounds.end }],
        limit: 250
      });
      state.competitions = Array.isArray(result.competitions) ? result.competitions : [];
      renderCompetitions();
      setStatus(`${state.competitions.length} compétition${state.competitions.length > 1 ? "s" : ""} disponible${state.competitions.length > 1 ? "s" : ""}.`, "ok");
    } catch (error) {
      state.competitions = [];
      renderCompetitions();
      setStatus(`Chargement impossible : ${error?.message || error}`, "error");
    } finally {
      state.loadingCompetitions = false;
      elements.reload.disabled = false;
      syncPrepareButton();
    }
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function download(content, fileName) {
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportBatch() {
    if (!state.batch) return;
    const header = ["lot_id", "saison", "livepalmes_id", "nom", "prenom", "date_naissance", "licence_livepalmes", "competitions_sources"];
    const rows = state.batch.people.map((person) => [
      state.batch.batchId, state.batch.season.label, person.livePalmesId, person.lastName, person.firstName,
      displayDate(person.birthDate), person.licenseNumber, person.competitions.join(" | ")
    ]);
    download(`\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`, `lot-licences-${state.batch.season.label}.csv`);
  }

  function chooseDelimiter(text) {
    const line = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] || "";
    return ["\t", ";", ","].sort((left, right) => line.split(right).length - line.split(left).length)[0];
  }

  function parseDelimited(text) {
    const delimiter = chooseDelimiter(text);
    const rows = [];
    let row = [], cell = "", quoted = false;
    const source = String(text || "").replace(/^\uFEFF/, "");
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quoted && char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = !quoted;
      else if (!quoted && char === delimiter) { row.push(cell.trim()); cell = ""; }
      else if (!quoted && char === "\n") { row.push(cell.replace(/\r$/, "").trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
      else cell += char;
    }
    if (quoted) throw new Error("CSV invalide : guillemet non fermé.");
    if (cell || row.length) { row.push(cell.replace(/\r$/, "").trim()); if (row.some(Boolean)) rows.push(row); }
    return rows;
  }

  function importResults(text) {
    if (!state.batch) throw new Error("Préparez d’abord un lot LivePalmes.");
    const rows = parseDelimited(text);
    if (rows.length < 2) throw new Error("Le fichier de retour ne contient aucun résultat.");
    const headers = rows[0].map((header) => header.trim().toLowerCase());
    const at = (name) => headers.indexOf(name);
    ["lot_id", "saison", "livepalmes_id", "statut"].forEach((name) => {
      if (at(name) < 0) throw new Error(`Colonne absente : ${name}.`);
    });
    const imported = new Map();
    rows.slice(1).forEach((values) => {
      const batchId = values[at("lot_id")] || "";
      const season = values[at("saison")] || "";
      if (batchId !== state.batch.batchId || season !== state.batch.season.label) throw new Error("Le fichier ne correspond pas au lot et à la saison affichés.");
      const id = values[at("livepalmes_id")] || "";
      const result = {
        status: values[at("statut")] || "",
        licenseNumber: normalizeLicense(values[at("licence_ffessm")] || ""),
        validity: values[at("validite_ffessm")] || "",
        details: values[at("details")] || ""
      };
      const previous = imported.get(id);
      if (!previous || result.status === "validable") imported.set(id, result);
    });
    state.imported = imported;
    state.batch.people.forEach((person) => {
      const result = imported.get(person.livePalmesId);
      if (result?.status === "validable" && result.licenseNumber) person.licenseNumber = result.licenseNumber;
      person.selected = person.seasonStatus !== "valid" && result?.status === "validable";
    });
    renderBatch();
    const validable = Array.from(imported.values()).filter((result) => result.status === "validable").length;
    setStatus(`Retour importé : ${validable} licence${validable > 1 ? "s" : ""} validable${validable > 1 ? "s" : ""}, les anomalies restent non cochées.`, validable ? "ok" : "warning");
  }

  function rowState(person) {
    if (person.seasonStatus === "valid") return { code: "valid", label: "Validée" };
    const imported = state.imported.get(person.livePalmesId);
    if (imported) return { code: imported.status, label: {
      validable: "Validable", licence_expiree: "Expirée", anomalie_licence: "Licence différente",
      anomalie_identite: "Identité à vérifier", ambigu: "Ambigu", introuvable: "Introuvable",
      timeout: "Délai dépassé", erreur: "Erreur"
    }[imported.status] || imported.status };
    return { code: "to_check", label: "À contrôler" };
  }

  function selectedPeople() {
    return state.batch?.people.filter((person) => person.selected && person.seasonStatus !== "valid") || [];
  }

  function syncValidateButton() {
    const selected = selectedPeople();
    elements.validate.disabled = state.validating || !selected.length || selected.some((person) => !LICENSE_PATTERN.test(person.licenseNumber));
    elements.validate.textContent = selected.length ? `Valider la sélection (${selected.length})` : "Valider la sélection";
  }

  function renderBatch() {
    if (!state.batch) { elements.workspace.hidden = true; return; }
    elements.workspace.hidden = false;
    const validCount = state.batch.people.filter((person) => person.seasonStatus === "valid").length;
    elements.summary.textContent = `${state.batch.people.length} nageurs · ${validCount} déjà validés · validité requise ${displayDate(state.batch.season.requiredValidityDate)}`;
    elements.results.innerHTML = `<table class="admin-license-admin-table"><thead><tr><th></th><th>Nageur</th><th>Licence</th><th>Compétitions</th><th>Contrôle</th><th>Actions</th></tr></thead><tbody>${state.batch.people.map((person) => {
      const status = rowState(person);
      const imported = state.imported.get(person.livePalmesId);
      return `<tr data-license-person-id="${escapeHtml(person.livePalmesId)}">
        <td><input type="checkbox" data-license-select ${person.selected ? "checked" : ""} ${person.seasonStatus === "valid" ? "disabled" : ""} aria-label="Sélectionner ${escapeHtml(`${person.firstName} ${person.lastName}`)}"></td>
        <td><span class="admin-license-admin-person"><strong>${escapeHtml(`${person.lastName} ${person.firstName}`)}</strong><small>${escapeHtml(displayDate(person.birthDate))} · ${escapeHtml(person.clubName || person.clubId || "Club non renseigné")}</small></span></td>
        <td><input type="text" value="${escapeHtml(person.licenseNumber)}" data-license-number aria-label="Licence de ${escapeHtml(`${person.firstName} ${person.lastName}`)}"><small>${LICENSE_PATTERN.test(person.licenseNumber) ? "" : "Format attendu : A-12-34567"}</small></td>
        <td><span class="admin-license-admin-source">${person.competitions.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}</span></td>
        <td><span class="admin-license-admin-state" data-state="${escapeHtml(status.code)}">${escapeHtml(status.label)}</span>${imported?.validity ? `<small> jusqu’au ${escapeHtml(imported.validity)}</small>` : ""}${imported?.details ? `<small>${escapeHtml(imported.details)}</small>` : ""}</td>
        <td><span class="admin-license-admin-row-actions"><button class="ghost-button" type="button" data-license-edit>Modifier la fiche</button>${person.seasonStatus === "valid" ? "" : `<button type="button" data-license-validate-one ${LICENSE_PATTERN.test(person.licenseNumber) ? "" : "disabled"}>Valider</button>`}</span></td>
      </tr>`;
    }).join("")}</tbody></table>`;
    syncValidateButton();
  }

  async function prepareBatch() {
    const competitionIds = selectedCompetitionIds();
    if (!competitionIds.length || competitionIds.length > 5) return;
    elements.prepare.disabled = true;
    setStatus("Préparation et dédoublonnage du lot…", "loading");
    try {
      const result = await bridge.callFunction("prepareEngagementLicenseControlBatch", { season: elements.season.value, competitionIds });
      state.batch = result;
      state.imported.clear();
      state.batch.people.forEach((person) => { person.selected = false; });
      renderBatch();
      setStatus(`Lot ${result.batchId} prêt. Les nageurs déjà validés pour ${result.season.label} sont conservés dans l’historique.`, "ok");
    } catch (error) {
      setStatus(`Préparation impossible : ${error?.message || error}`, "error");
    } finally {
      syncPrepareButton();
    }
  }

  function validationPayload(person) {
    const imported = state.imported.get(person.livePalmesId);
    const validity = imported?.status === "validable" ? imported.validity : "";
    const validityMatch = String(validity).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return {
      ...person,
      licenseNumber: normalizeLicense(person.licenseNumber),
      federalValidityEndDate: validityMatch ? `${validityMatch[3]}-${validityMatch[2]}-${validityMatch[1]}` : ""
    };
  }

  async function validatePeople(people) {
    if (!people.length || state.validating) return;
    const invalid = people.find((person) => !LICENSE_PATTERN.test(person.licenseNumber));
    if (invalid) { setStatus(`Format de licence invalide pour ${invalid.firstName} ${invalid.lastName}.`, "error"); return; }
    if (!window.confirm(`Valider ${people.length} licence${people.length > 1 ? "s" : ""} pour la saison ${state.batch.season.label} ?`)) return;
    state.validating = true;
    syncValidateButton();
    setStatus(`Validation de ${people.length} licence${people.length > 1 ? "s" : ""}…`, "loading");
    try {
      const imported = people.filter((person) => state.imported.get(person.livePalmesId)?.status === "validable");
      const manual = people.filter((person) => !imported.includes(person));
      for (const [group, source] of [[imported, "admin_import"], [manual, "national_manual"]]) {
        for (let index = 0; index < group.length; index += 100) {
          await bridge.callFunction("validateEngagementSwimmerLicenses", {
            season: state.batch.season.label,
            source,
            items: group.slice(index, index + 100).map(validationPayload)
          });
        }
      }
      people.forEach((person) => { person.seasonStatus = "valid"; person.selected = false; });
      renderBatch();
      setStatus(`${people.length} licence${people.length > 1 ? "s ont" : " a"} été validée${people.length > 1 ? "s" : ""} pour ${state.batch.season.label}.`, "ok");
    } catch (error) {
      setStatus(`Validation impossible : ${error?.message || error}`, "error");
    } finally {
      state.validating = false;
      renderBatch();
    }
  }

  elements.competitions.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    const checked = selectedCompetitionIds();
    if (checked.length > 5) { event.target.checked = false; setStatus("Un lot peut contenir au maximum 5 compétitions.", "warning"); }
    syncPrepareButton();
  });
  elements.results.addEventListener("change", (event) => {
    const row = event.target.closest("[data-license-person-id]");
    const person = state.batch?.people.find((item) => item.livePalmesId === row?.dataset.licensePersonId);
    if (!person) return;
    if (event.target.matches("[data-license-select]")) person.selected = event.target.checked;
    if (event.target.matches("[data-license-number]")) { person.licenseNumber = normalizeLicense(event.target.value); event.target.value = person.licenseNumber; }
    renderBatch();
  });
  elements.results.addEventListener("input", (event) => {
    if (!event.target.matches("[data-license-number]")) return;
    const row = event.target.closest("[data-license-person-id]");
    const person = state.batch?.people.find((item) => item.livePalmesId === row?.dataset.licensePersonId);
    if (person) { person.licenseNumber = normalizeLicense(event.target.value); syncValidateButton(); }
  });
  elements.results.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    const row = button?.closest("[data-license-person-id]");
    const person = state.batch?.people.find((item) => item.livePalmesId === row?.dataset.licensePersonId);
    if (!button || !person) return;
    if (button.matches("[data-license-edit]")) bridge.openSwimmer(person, button);
    if (button.matches("[data-license-validate-one]")) void validatePeople([person]);
  });
  elements.reload.addEventListener("click", loadCompetitions);
  elements.season.addEventListener("change", () => { updateSeasonPresentation(); state.batch = null; state.imported.clear(); renderBatch(); void loadCompetitions(); });
  elements.prepare.addEventListener("click", prepareBatch);
  elements.exportButton.addEventListener("click", exportBatch);
  elements.importInput.addEventListener("change", async (event) => {
    try { importResults(await event.target.files?.[0]?.text()); }
    catch (error) { setStatus(`Import impossible : ${error?.message || error}`, "error"); }
    event.target.value = "";
  });
  elements.selectPending.addEventListener("click", () => {
    state.batch?.people.forEach((person) => { person.selected = person.seasonStatus !== "valid"; });
    renderBatch();
  });
  elements.validate.addEventListener("click", () => void validatePeople(selectedPeople()));
  document.addEventListener("livepalmes:license-admin-open", () => { if (!state.competitions.length) void loadCompetitions(); });

  initializeSeasons();
  renderBatch();
  if (window.location.hash === "#administration-licences") void loadCompetitions();
})();
