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
    exportScope: document.querySelector("#adminLicenseControlExportScope"),
    importInput: document.querySelector("#adminLicenseControlImport"),
    selectPending: document.querySelector("#adminLicenseControlSelectPending"),
    validate: document.querySelector("#adminLicenseControlValidate"),
    results: document.querySelector("#adminLicenseControlResults"),
    status: document.querySelector("#adminLicenseControlStatus"),
    competitionSearch: document.querySelector("#adminLicenseControlCompetitionSearch"),
    competitionFilter: document.querySelector("#adminLicenseControlCompetitionFilter"),
    selectionCount: document.querySelector("#adminLicenseControlSelectionCount"),
    search: document.querySelector("#adminLicenseControlSearch"),
    filter: document.querySelector("#adminLicenseControlFilter"),
    rowCount: document.querySelector("#adminLicenseControlRowCount"),
    empty: document.querySelector("#adminLicenseControlEmpty"),
    report: document.querySelector("#adminLicenseControlReport"),
    dialog: document.querySelector("#adminLicenseControlDialog"),
    dialogContent: document.querySelector("#adminLicenseControlDialogContent")
  };
  const state = { competitions: [], selectedCompetitions: new Set(), reports: {}, reportsAvailable: false, batch: null, imported: new Map(), loadingCompetitions: false, validating: false, reportBusy: false, reportId: "", reportData: null, preview: null, dialogRequest: 0 };
  const LICENSE_PATTERN = /^[A-Z]-\d{2}-\d+$/;
  const competitionKey = value => String(value || "").replace(/^legacy-nap-/, "");
  const searchText = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const controlLabels = { none: "Non contrôlé", ok: "Fait · tout est bon", issues: "Fait · incohérences" };
  const finalStatuses = new Set(["validable", "licence_expiree", "introuvable", "anomalie_licence", "anomalie_identite", "ambigu"]);

  function batchCurrent() {
    return Boolean(state.batch && state.batch.season.label === elements.season.value &&
      state.batch.competitions.map(c => competitionKey(c.id)).sort().join("|") === [...state.selectedCompetitions].map(competitionKey).sort().join("|"));
  }
  function controlReport(id) {
    const report = state.reports[competitionKey(id)];
    return report?.current === false ? null : report;
  }

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
    if (state.batch?.source === "nap") return String(value ?? "").trim();
    const compact = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!compact) return "";
    const letter = compact.match(/[A-Z]/)?.[0] || "";
    const digits = compact.replace(/\D/g, "");
    return [letter, digits.slice(0, 2), digits.slice(2)].filter(Boolean).join("-");
  }

  function acceptableLicense(value) {
    return state.batch?.source === "nap" ? Boolean(String(value ?? "").trim() && String(value).length <= 100 && !/[\u0000-\u001f\u007f]/.test(value)) : LICENSE_PATTERN.test(value);
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
    return [...state.selectedCompetitions];
  }

  function syncPrepareButton() {
    const count = selectedCompetitionIds().length;
    elements.prepare.disabled = state.loadingCompetitions || state.validating || state.reportBusy || count < 1 || count > 5;
    elements.selectionCount.textContent = `${count} compétition${count > 1 ? "s" : ""} sélectionnée${count > 1 ? "s" : ""} sur 5`;
  }

  function renderCompetitions() {
    if (!state.competitions.length) {
      elements.competitions.innerHTML = '<p class="admin-engagements-empty">Aucune compétition trouvée pour cette saison.</p>';
      syncPrepareButton();
      return;
    }
    const query = searchText(elements.competitionSearch.value);
    const filtered = state.competitions.filter(c => searchText(`${c.name || c.title} ${c.location || ""} ${c.city || ""}`).includes(query) &&
      (elements.competitionFilter.value === "all" || (controlReport(c.id)?.status || "none") === elements.competitionFilter.value));
    elements.competitions.innerHTML = filtered.map((competition) => `
      <div class="admin-license-admin-competition-entry"><label class="admin-license-admin-competition">
        <input type="checkbox" value="${escapeHtml(competition.id)}" ${state.selectedCompetitions.has(competition.id) ? "checked" : ""} ${state.validating || state.reportBusy || (!state.selectedCompetitions.has(competition.id) && state.selectedCompetitions.size >= 5) ? "disabled" : ""}>
        <strong>${escapeHtml(competition.name || competition.title || "Compétition")}</strong>
        <small>${escapeHtml(displayDate(competition.date))} · ${escapeHtml(competition.location || competition.city || "Lieu non renseigné")}</small>
      </label><button class="admin-license-admin-competition-state" type="button" data-license-report="${escapeHtml(competition.id)}" data-control-state="${escapeHtml(controlReport(competition.id)?.status || "none")}">${escapeHtml(state.reportsAvailable ? controlLabels[controlReport(competition.id)?.status || "none"] : "Statut indisponible")} ↗</button>${controlReport(competition.id)?.completedAt ? `<small class="admin-license-admin-control-date">Bilan du ${escapeHtml(new Date(controlReport(competition.id).completedAt).toLocaleDateString("fr-FR"))}</small>` : ""}</div>`).join("") || '<p class="admin-engagements-empty">Aucune compétition pour ce filtre.</p>';
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
    const season = elements.season.value;
    try {
      const [result, reports] = await Promise.all([bridge.callFunction("listEngagementCompetitions", {
        manageOnly: true,
        ranges: [{ fromDate: bounds.start, toDate: bounds.end }],
        limit: 250
      }), bridge.callFunction("prepareEngagementLicenseControlBatch", {action: "summaries", season})]);
      if (season !== elements.season.value) return;
      state.competitions = Array.isArray(result.competitions) ? result.competitions.map(c => ({...c, id: String(c.id)})) : [];
      state.reports = reports.reports || {};
      state.reportsAvailable = true;
      renderCompetitions();
      setStatus(`${state.competitions.length} compétition${state.competitions.length > 1 ? "s" : ""} disponible${state.competitions.length > 1 ? "s" : ""}.`, "ok");
    } catch (error) {
      if (season !== elements.season.value) return;
      state.reportsAvailable = false;
      state.competitions = [];
      renderCompetitions();
      setStatus(`Chargement impossible : ${error?.message || error}`, "error");
    } finally {
      state.loadingCompetitions = false;
      elements.reload.disabled = false;
      syncPrepareButton();
      if (season !== elements.season.value) void loadCompetitions();
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
    const header = ["lot_id", "saison", "livepalmes_id", "nom", "prenom", "date_naissance", "licence_livepalmes", "competitions_sources", "club_livepalmes"];
    const people = elements.exportScope?.value === "all" ? state.batch.people : state.batch.people.filter(person => person.seasonStatus !== "valid");
    if (!people.length) { setStatus("Toutes les licences du lot sont déjà validées pour cette saison.", "ok"); return; }
    const rows = people.map((person) => [
      state.batch.batchId, state.batch.season.label, person.livePalmesId, person.lastName, person.firstName,
      displayDate(person.birthDate), person.licenseNumber, person.competitions.join(" | "), person.clubName || person.clubId || ""
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
      if (state.batch.source === "nap" && (!state.batch.people.some(person => person.livePalmesId === id) || imported.has(id))) throw new Error("Le retour contient un identifiant NAP inconnu ou dupliqué.");
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
    elements.validate.disabled = state.validating || state.reportBusy || !batchCurrent() || !selected.length;
    elements.validate.textContent = selected.length ? `Valider la sélection (${selected.length})` : "Valider la sélection";
  }

  function renderBatch() {
    elements.empty.hidden = Boolean(state.batch);
    if (!state.batch) { elements.workspace.hidden = true; return; }
    elements.workspace.hidden = false;
    const validCount = state.batch.people.filter((person) => person.seasonStatus === "valid").length;
    const current = batchCurrent();
    const blocked = state.validating || state.reportBusy || !current;
    [elements.exportButton, elements.importInput, elements.selectPending].forEach(element => { element.disabled = blocked; });
    elements.summary.textContent = current ? `${state.batch.people.length} nageurs · ${validCount} déjà validés · validité requise ${displayDate(state.batch.season.requiredValidityDate)}` : "Sélection modifiée : créez le nouveau lot. Le tableau affiche encore le lot précédent.";
    const query = searchText(elements.search.value), filter = elements.filter.value;
    const visible = state.batch.people.filter(p => {
      const code = rowState(p).code;
      return searchText(`${p.lastName} ${p.firstName} ${p.clubName || p.clubId} ${p.licenseNumber}`).includes(query) &&
        (filter === "all" || filter === code || (filter === "issues" && !["valid", "validable", "to_check"].includes(code)));
    });
    elements.rowCount.textContent = `${visible.length} nageurs affichés sur ${state.batch.people.length} · tous les résultats du filtre, sans pagination`;
    elements.results.innerHTML = `<table class="admin-license-admin-table"><thead><tr><th></th><th>Nageur</th><th>Licence</th><th>Compétitions</th><th>Contrôle</th><th>Actions</th></tr></thead><tbody>${visible.map((person) => {
      const status = rowState(person);
      const imported = state.imported.get(person.livePalmesId);
      return `<tr data-license-person-id="${escapeHtml(person.livePalmesId)}">
        <td><input type="checkbox" data-license-select ${person.selected ? "checked" : ""} ${person.seasonStatus === "valid" || blocked ? "disabled" : ""} aria-label="Sélectionner ${escapeHtml(`${person.firstName} ${person.lastName}`)}"></td>
        <td><span class="admin-license-admin-person"><strong>${escapeHtml(`${person.lastName} ${person.firstName}`)}</strong><small>${escapeHtml(displayDate(person.birthDate))} · ${escapeHtml(person.clubName || person.clubId || "Club non renseigné")}</small></span></td>
        <td><input type="text" value="${escapeHtml(person.licenseNumber)}" data-license-number ${blocked ? "disabled" : ""} aria-label="Licence de ${escapeHtml(`${person.firstName} ${person.lastName}`)}"><small>${acceptableLicense(person.licenseNumber) ? "" : "Format attendu : A-12-34567"}</small></td>
        <td><span class="admin-license-admin-source">${person.competitions.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}</span></td>
        <td><span class="admin-license-admin-state" data-state="${escapeHtml(status.code)}">${escapeHtml(status.label)}</span>${imported?.validity ? `<small> jusqu’au ${escapeHtml(imported.validity)}</small>` : ""}${imported?.details ? `<small>${escapeHtml(imported.details)}</small>` : ""}${person.validationError ? `<small role="alert">Enregistrement bloqué : ${escapeHtml(person.validationError)}</small>` : ""}</td>
        <td><span class="admin-license-admin-row-actions"><button class="ghost-button" type="button" data-license-edit ${blocked ? "disabled" : ""}>Modifier la fiche</button>${person.seasonStatus === "valid" ? "" : `<button type="button" data-license-validate-one ${acceptableLicense(person.licenseNumber) && !blocked ? "" : "disabled"}>Valider</button>`}</span></td>
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
      const previous = state.batch, imported = new Map(state.imported);
      state.batch = result;
      Object.assign(state.reports, result.controlReports || {});
      state.imported.clear();
      if (previous?.season.label === result.season.label) for (const person of result.people) {
        const old = previous.people.find(p => p.livePalmesId === person.livePalmesId);
        if (old && old.licenseNumber === person.licenseNumber && old.firstName === person.firstName && old.lastName === person.lastName && old.birthDate === person.birthDate && old.clubId === person.clubId && imported.has(person.livePalmesId)) state.imported.set(person.livePalmesId, imported.get(person.livePalmesId));
      }
      state.batch.people.forEach((person) => { person.selected = false; });
      renderBatch();
      renderCompetitions();
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
    if (!people.length || state.validating || state.reportBusy || !batchCurrent()) return;
    if (!window.confirm(`Valider ${people.length} licence${people.length > 1 ? "s" : ""} pour la saison ${state.batch.season.label} ?`)) return;
    state.validating = true;
    [elements.season, elements.prepare, elements.reload, elements.importInput, elements.selectPending].forEach(element => { element.disabled = true; });
    renderBatch();
    setStatus(`Validation de ${people.length} licence${people.length > 1 ? "s" : ""}…`, "loading");
    let validatedCount = 0, blockedCount = 0;
    try {
      const imported = people.filter((person) => state.imported.get(person.livePalmesId)?.status === "validable");
      const manual = people.filter((person) => !imported.includes(person));
      for (const [group, source] of [[imported, "admin_import"], [manual, "national_manual"]]) {
        for (let index = 0; index < group.length; index += 100) {
          const chunk = group.slice(index, index + 100);
          try {
            const result = await bridge.callFunction("validateEngagementSwimmerLicenses", {
              season: state.batch.season.label,
              source,
              items: group.slice(index, index + 100).map(validationPayload),
              partialValidation: true
            });
            const validated = new Set(result.validatedIds || (state.batch.source !== "nap" && result.ok && result.validatedCount === chunk.length ? chunk.map(person => person.livePalmesId) : []));
            for (const person of chunk) {
              if (validated.has(person.livePalmesId)) {
                person.seasonStatus = "valid"; person.selected = false;
                person.expectedLicenseNumber = person.licenseNumber; person.validationError = "";
                validatedCount++;
              } else {
                const failure = result.blocked?.find(item => item.id === person.livePalmesId);
                person.validationError = failure ? `${failure.reason}${failure.conflictingSwimmerIds?.length ? ` Fiche(s) NAP : ${failure.conflictingSwimmerIds.join(", ")}.` : ""}` : "Enregistrement non confirmé. Rechargez le lot avant de réessayer.";
                blockedCount++;
              }
            }
            if (validated.size) bridge.licensesChanged?.();
          } catch (error) {
            for (const person of chunk) person.validationError = `Enregistrement non confirmé : ${error?.message || error}. Rechargez le lot avant de réessayer.`;
            blockedCount += chunk.length;
          }
          renderBatch();
        }
      }
      renderBatch();
      setStatus(`${validatedCount} fiche(s) validée(s), ${blockedCount} fiche(s) bloquée(s) pour ${state.batch.season.label}. Les motifs sont indiqués sur les lignes concernées.`, blockedCount ? "warning" : "ok");
      if (validatedCount) people.forEach(markReportsStale);
    } catch (error) {
      setStatus(`Validation impossible : ${error?.message || error}`, "error");
    } finally {
      state.validating = false;
      [elements.season, elements.reload, elements.importInput, elements.selectPending].forEach(element => { element.disabled = false; });
      syncPrepareButton();
      renderBatch();
      renderCompetitions();
    }
  }

  function markReportsStale(person) {
    for (const id of person.competitionIds || []) {
      const key = competitionKey(id);
      if (state.reports[key]) state.reports[key] = {...state.reports[key], current: false};
    }
    state.preview = null;
  }

  function reportPeople(id) {
    return state.batch?.people.filter(p => p.competitionIds.some(value => competitionKey(value) === competitionKey(id))) || [];
  }

  function renderReport() {
    const id = state.reportId, data = state.reportData, report = data?.report;
    const current = report?.current !== false && Boolean(report);
    const members = reportPeople(id);
    const inBatch = batchCurrent() && state.batch?.competitions.some(c => competitionKey(c.id) === competitionKey(id));
    const pending = members.filter(p => p.seasonStatus !== "valid" && !finalStatuses.has(state.imported.get(p.livePalmesId)?.status)).length;
    const counts = report?.counts;
    const preview = state.preview;
    const disabled = state.reportBusy || state.validating;
    elements.dialogContent.innerHTML = `<header><h3>Bilan de la compétition</h3><button type="button" class="ghost-button" data-report-close>Fermer</button></header>
      <label>Compétition<select data-report-competition ${disabled ? "disabled" : ""}>${state.competitions.map(c => `<option value="${escapeHtml(c.id)}" ${c.id === id ? "selected" : ""}>${escapeHtml(c.name || c.title)} · ${escapeHtml(displayDate(c.date))}</option>`).join("")}</select></label>
      <p aria-live="polite">${state.reportBusy ? "Traitement en cours…" : !data ? "Chargement du bilan…" : escapeHtml(current ? `Contrôle fait · ${report.status === "ok" ? "tout est bon" : "incohérences"}` : "Non contrôlé")}</p>
      ${report ? `<p>${report.current === false ? "Le dernier bilan ne correspond plus aux engagés ou aux licences actuels. Nouveau contrôle nécessaire. " : ""}Bilan du ${escapeHtml(new Date(report.completedAt).toLocaleString("fr-FR"))} · ${counts.total} compétiteurs contrôlés.</p><p>Valides : ${counts.valid} · expirées : ${counts.expired} · non retrouvées : ${counts.notFound} · autres incohérences : ${counts.other}</p>` : ""}
      ${data && !current ? `<p>${inBatch ? `${pending} licence(s) encore sans résultat exploitable. Les erreurs techniques restent à contrôler.` : "Préparez un lot contenant cette compétition pour terminer son contrôle."}</p>` : ""}
      <div class="admin-license-admin-actions"><button type="button" data-report-complete ${disabled || !data || !inBatch || !members.length || pending ? "disabled" : ""}>${current ? "Actualiser le bilan" : "Terminer le contrôle"}</button><button type="button" class="ghost-button" data-report-preview ${disabled || !current ? "disabled" : ""}>Prévisualiser le mail</button></div>
      <p>${report?.mail?.sentAt ? `Mail envoyé le ${escapeHtml(new Date(report.mail.sentAt).toLocaleString("fr-FR"))} à ${report.mail.recipientCount} destinataires.` : "Mail non envoyé."}</p>
      ${preview ? `<h3>Destinataires (${preview.recipients.length})</h3><ul>${preview.recipients.map(r => `<li>${escapeHtml(r.name || r.role)} · ${escapeHtml(r.email)}</li>`).join("")}</ul>${preview.missingRegion ? "<p>Région organisatrice non renseignée : aucun administrateur régional ne peut être ciblé.</p>" : ""}${preview.missingComputer ? "<p>Adresse de l’informatique de la compétition non renseignée.</p>" : ""}<p><strong>${escapeHtml(preview.subject)}</strong></p><pre>${escapeHtml(preview.text)}</pre><div class="admin-license-admin-actions"><button type="button" data-report-send ${disabled || preview.disabled || !preview.recipients.length ? "disabled" : ""}>Envoyer le mail</button></div>${preview.disabled ? `<p>${preview.previewOnly ? "TEST : aperçu uniquement, aucun mail réel envoyé." : "Envois désactivés dans le réglage des notifications."}</p>` : "<p>Envoi volontaire aux destinataires affichés, sans doublon.</p>"}` : ""}`;
    if (report?.mail?.sentAt) {
      const sentButton = elements.dialogContent.querySelector("[data-report-send]");
      if (sentButton) { sentButton.disabled = true; sentButton.textContent = "Mail déjà envoyé"; }
    }
  }

  async function openReport(id) {
    if (state.validating || state.reportBusy) return;
    state.reportId = id; state.reportData = null; state.preview = null;
    const request = ++state.dialogRequest;
    renderReport();
    if (!elements.dialog.open) elements.dialog.showModal();
    try {
      const result = await bridge.callFunction("prepareEngagementLicenseControlBatch", {action: "readReport", season: elements.season.value, competitionId: id});
      if (request !== state.dialogRequest || !elements.dialog.open) return;
      state.reportData = result;
      if (result.report) state.reports[competitionKey(id)] = result.report;
      renderReport(); renderCompetitions();
    } catch (error) {
      if (request !== state.dialogRequest || !elements.dialog.open) return;
      elements.dialogContent.insertAdjacentHTML("beforeend", `<p role="alert">${escapeHtml(error?.message || error)}</p>`);
    }
  }

  async function reportAction(action) {
    if (state.reportBusy || state.validating || !state.reportData) return;
    const id = state.reportId, season = elements.season.value, request = state.dialogRequest;
    const payload = {action, season, competitionId: id};
    if (action === "completeReport") {
      if (!batchCurrent()) return;
      const nativeId = competitionKey(id);
      payload.expectedMembership = state.batch.controlMemberships?.[nativeId];
      payload.expectedRevision = state.reportData.report?.revision || "";
      payload.results = reportPeople(id).filter(p => p.seasonStatus !== "valid").map(p => {
        const r = state.imported.get(p.livePalmesId), match = String(r?.validity || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        return {id: p.livePalmesId, status: r?.status || "to_check", licenseNumber: p.licenseNumber, validity: match ? `${match[3]}-${match[2]}-${match[1]}` : r?.validity || ""};
      });
    }
    if (action === "sendReport") {
      if (state.reportData.report?.mail?.sentAt) return;
      if (!state.preview || state.preview.disabled || !window.confirm(`Envoyer le bilan de cette compétition à ${state.preview.recipients.length} destinataires ?`)) return;
      payload.expectedFingerprint = state.preview.fingerprint;
    }
    state.reportBusy = true; renderReport(); renderBatch(); renderCompetitions();
    try {
      let result;
      do {
        result = await bridge.callFunction("prepareEngagementLicenseControlBatch", payload);
        payload.offset = result.nextOffset;
      } while (action === "sendReport" && !result.done);
      if (request !== state.dialogRequest || !elements.dialog.open) return;
      if (action === "previewReport") state.preview = result;
      if (action === "completeReport") { state.reportData.report = result.report; state.reports[competitionKey(id)] = result.report; state.preview = null; }
      if (action === "sendReport") {
        state.preview = null;
        const fresh = await bridge.callFunction("prepareEngagementLicenseControlBatch", {action: "readReport", season, competitionId: id});
        if (request !== state.dialogRequest || !elements.dialog.open) return;
        state.reportData = fresh;
        if (fresh.report) state.reports[competitionKey(id)] = fresh.report;
      }
    } catch (error) {
      if (request === state.dialogRequest && elements.dialog.open) {
        state.reportBusy = false; renderReport();
        elements.dialogContent.insertAdjacentHTML("beforeend", `<p role="alert">${escapeHtml(error?.message || error)}</p>`);
        return;
      }
    } finally {
      state.reportBusy = false; renderBatch(); renderCompetitions();
    }
    if (request === state.dialogRequest && elements.dialog.open) renderReport();
  }

  elements.dialogContent.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.matches("[data-report-close]")) elements.dialog.close();
    if (button.matches("[data-report-complete]")) void reportAction("completeReport");
    if (button.matches("[data-report-preview]")) void reportAction("previewReport");
    if (button.matches("[data-report-send]")) void reportAction("sendReport");
  });
  elements.dialogContent.addEventListener("change", event => { if (event.target.matches("[data-report-competition]")) void openReport(event.target.value); });
  elements.dialog.addEventListener("close", () => { state.dialogRequest++; });
  elements.competitions.addEventListener("click", event => { const button = event.target.closest("[data-license-report]"); if (button) void openReport(button.dataset.licenseReport); });
  elements.report.addEventListener("click", () => { if (state.batch?.competitions.length) void openReport(state.competitions.find(c => competitionKey(c.id) === competitionKey(state.batch.competitions[0].id))?.id || state.batch.competitions[0].id); });
  elements.competitionSearch.addEventListener("input", renderCompetitions);
  elements.competitionFilter.addEventListener("change", renderCompetitions);
  elements.search.addEventListener("input", renderBatch);
  elements.filter.addEventListener("change", renderBatch);

  elements.competitions.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    if (event.target.checked) state.selectedCompetitions.add(event.target.value); else state.selectedCompetitions.delete(event.target.value);
    if (state.selectedCompetitions.size > 5) { state.selectedCompetitions.delete(event.target.value); setStatus("Un lot peut contenir au maximum 5 compétitions.", "warning"); }
    renderCompetitions(); renderBatch();
  });
  elements.results.addEventListener("change", (event) => {
    const row = event.target.closest("[data-license-person-id]");
    const person = state.batch?.people.find((item) => item.livePalmesId === row?.dataset.licensePersonId);
    if (!person) return;
    if (event.target.matches("[data-license-select]")) person.selected = event.target.checked;
    if (event.target.matches("[data-license-number]")) { person.licenseNumber = normalizeLicense(event.target.value); person.seasonStatus = "to_check"; state.imported.delete(person.livePalmesId); event.target.value = person.licenseNumber; markReportsStale(person); renderCompetitions(); }
    renderBatch();
  });
  elements.results.addEventListener("input", (event) => {
    if (!event.target.matches("[data-license-number]")) return;
    const row = event.target.closest("[data-license-person-id]");
    const person = state.batch?.people.find((item) => item.livePalmesId === row?.dataset.licensePersonId);
    if (person) { person.licenseNumber = normalizeLicense(event.target.value); person.seasonStatus = "to_check"; state.imported.delete(person.livePalmesId); markReportsStale(person); syncValidateButton(); }
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
  elements.season.addEventListener("change", () => { updateSeasonPresentation(); state.batch = null; state.selectedCompetitions.clear(); state.reports = {}; state.reportsAvailable = false; state.imported.clear(); elements.dialog.close(); renderBatch(); void loadCompetitions(); });
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
