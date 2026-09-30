(function (global) {
  "use strict";
  const LABELS = { france: "Championnats de France", edf: "Équipes de France", listing: "Mise en liste", settings: "Paramètres DTN" };
  const HASHES = { "#espace-dtn-france": "france", "#espace-dtn-edf": "edf", "#espace-dtn-listes": "listing", "#espace-dtn-parametres": "settings" };
  const state = { ready: false, id: "", device: "france", profile: "", sex: "F", club: "", course: "", page: 0, near: false, percent: 2, selectedCourse: null, performance: "", preferences: {}, editorDevice: "france", editorProfile: "C", dirty: false, views: new Map(), sources: new Map(), token: 0 };
  let el, model, booting, service, uid = "";
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const button = (action, label, extra = "", className = "ghost-button") => `<button type="button" class="${className}" data-action="${action}" ${extra}>${esc(label)}</button>`;
  const option = (value, label, selected) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`;
  const checked = (v) => v ? "checked" : "";
  const season = () => state.seasons.find((s) => s.id === state.id);
  const editable = () => state.canManage && state.catalog.previous !== state.id;
  const activeProfile = () => state.editor[state.editorDevice].find((p) => p.id === state.editorProfile) || state.editor[state.editorDevice][0];
  const viewKey = () => `${state.id}|${state.device}`;
  function loadScript(src, check) {
    if (check()) return Promise.resolve();
    return new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = src; script.onload = resolve; script.onerror = () => reject(new Error("Chargement du module impossible.")); document.head.append(script); });
  }
  async function call(name, data = {}) {
    const firebase = global.firebase, config = global.LivePalmesAppConfig;
    if (!firebase?.auth?.().currentUser) throw new Error("Connexion au portail requise.");
    const user = firebase.auth().currentUser;
    if (uid && uid !== user.uid) { state.views.clear(); state.sources.clear(); throw new Error("Le compte a changé. Rechargez le portail."); }
    uid = user.uid;
    if (!service) { service = firebase.app().functions(config?.firebaseFunctionsRegion || "europe-west1"); service = config?.configureFunctionsService?.(service) || service; }
    return (await service.httpsCallable(name)(data)).data;
  }
  function message(value, error = false) { el.status.textContent = value; el.status.dataset.tone = error ? "error" : ""; }
  function resetEditor() { state.editor = clone(season()); state.dirty = false; }
  function discard() { return !state.dirty || global.confirm("Abandonner les modifications non enregistrées ?"); }
  function header() {
    document.querySelector("#adminDtnViewTitle").textContent = LABELS[state.device];
    el.season.innerHTML = state.seasons.map((s) => option(s.id, `${s.label} · ${s.id === state.catalog.draft ? "Brouillon" : s.id === state.catalog.current ? "En cours" : "Précédente"}`, state.id)).join("");
    el.toolbar.hidden = false;
    el.refreshBox.hidden = true;
    el.grid.before(el.definitions);
    el.definitions.hidden = false;
    el.definitions.textContent = `Saison ${season().label} · ${state.id === state.catalog.draft ? "Simulation du brouillon" : state.id === state.catalog.previous ? "Consultation seule" : "Saison active"} · Paramètres version ${season().revision}`;
  }
  async function refreshCatalog() {
    const result = await call("getDtnSeasons");
    Object.assign(state, result);
    if (!state.seasons.some((s) => s.id === state.id)) state.id = state.catalog.current;
    resetEditor();
  }
  function modal(html) {
    const dialog = document.createElement("dialog"); dialog.className = "admin-dtn-dialog";
    dialog.innerHTML = html; document.body.append(dialog);
    dialog.addEventListener("close", () => dialog.remove(), { once: true }); dialog.showModal();
    dialog.querySelectorAll("[data-close]").forEach((b) => b.onclick = () => dialog.close());
    return dialog;
  }
  async function render() {
    if (!state.ready) return;
    const token = ++state.token;
    header();
    if (state.device === "settings") { settings(); return; }
    const key = viewKey();
    if (state.views.has(key)) { results(state.views.get(key)); return; }
    el.grid.innerHTML = "<p>Chargement des résultats…</p>";
    try {
      const view = await call("getDtnSeasonOverview", { id: state.id, device: state.device });
      if (token !== state.token) return;
      if (view.hit) state.views.set(key, view);
      results(view);
    } catch (error) { if (token === state.token) el.grid.innerHTML = `<p role="alert">${esc(error.message)}</p>${button("reload", "Réessayer")}`; }
  }
  function courseLabel(code) { return code.replace(/(SF|IS|AP|BI)$/, " $1"); }
  function athleteLabel(row) { return row.swimmer || `${row.firstName || ""} ${row.lastName || ""}`.trim(); }
  function filtered(rows) { return rows.filter((r) => (!state.sex || r.sex === state.sex) && (!state.club || r.club === state.club) && (!state.course || r.course === state.course || r.qualifications?.some((q) => q.course === state.course))); }
  function resultProfiles(view, id = state.profile) {
    const profiles = view.profiles || [];
    if (id === "summary" || id === "all") return profiles;
    if (id === "espoir") return profiles.filter((p) => ["TEC1", "TEP"].includes(p.id) && (!state.performance || p.id === state.performance));
    return profiles.filter((p) => p.id === id);
  }
  function resultOptions() {
    const profiles = season()[state.device].filter((p) => p.enabled);
    if (state.device === "listing") return [
      ...profiles.filter((p) => p.id === "RELEVE").map((p) => ({ id: p.id, label: p.label })),
      ...(profiles.some((p) => ["TEC1", "TEP"].includes(p.id)) ? [{ id: "espoir", label: "Espoir" }] : []),
      ...profiles.filter((p) => !["RELEVE", "TEC1", "TEP"].includes(p.id))
    ];
    return [...profiles, ...(state.device === "edf" ? [{ id: "summary", label: "Synthèse des sportifs" }] : [])];
  }
  function shortTime(value) { return value ? model.display(value).replace(/^00:/, "").replace(/^0(?=\d:)/, "") : "—"; }
  function criteria(cell) { return cell ? [cell.time ? shortTime(cell.time) : "", cell.top ? `Top ${cell.top}` : ""].filter(Boolean).join(" ou ") || "—" : "—"; }
  function profileGrid(profile) { return profile.sourceId ? season().edf.find((p) => p.id === profile.sourceId)?.grid || {} : profile.grid || {}; }
  function athleteRows(profiles) {
    const rows = new Map();
    for (const p of profiles) for (const a of p.athletes || []) {
      const identity = a.swimmerIdentityKey || (a.firstName && a.lastName && a.birthDate ? `${a.lastName}|${a.firstName}|${a.birthDate}` : a.swimmerId || a.swimmer);
      const key = `${a.sex}|${identity}`;
      if (!rows.has(key)) rows.set(key, { ...a, qualifications: [], profileLabels: [] });
      const row = rows.get(key), config = season()[state.device].find((item) => item.id === p.id);
      const label = config?.sourceId || p.id;
      row.profileLabels.push(label);
      row.qualifications.push(...a.qualifications.map((q) => ({ ...q, profileLabel: label })));
    }
    return [...rows.values()].map((r) => ({ ...r, profileLabel: r.profileLabels.join(" · ") }));
  }
  function sexButtons(rows, listing = false) {
    return `<div class="admin-dtn-segment ${listing ? "admin-dtn-listing-sex" : "admin-dtn-sex-segment"}" role="group" aria-label="Sexe">${(listing || state.profile === "summary" ? [["", "Tous"], ["F", "Femmes"], ["M", "Hommes"]] : [["F", "Femmes"], ["M", "Hommes"]]).map(([sex, label]) => `<button type="button" data-action="result-sex" data-value="${sex}" aria-pressed="${state.sex === sex}">${label}${listing ? ` · ${rows.filter((r) => !sex || r.sex === sex).length}` : ""}</button>`).join("")}</div>`;
  }
  function resultTabs(options, view) {
    const listing = state.device === "listing";
    return `<div class="${listing ? "admin-dtn-listing-tabs" : "admin-dtn-edf-tabs"}" role="tablist" aria-label="${listing ? "Type de mise en liste" : "Temps Équipe de France"}">${options.map((p) => {
      const group = ["TSP", "TRP"].includes(p.id) ? "senior" : ["TJP", "TEP"].includes(p.id) ? "junior" : ["TU16C1", "TU16C2"].includes(p.id) ? "u16" : "";
      const countProfiles = p.id === "espoir" ? (view.profiles || []).filter((r) => ["TEC1", "TEP"].includes(r.id)) : (view.profiles || []).filter((r) => r.id === p.id);
      return `<button type="button" role="tab" data-action="result-profile" data-value="${esc(p.id)}" data-dtn-edf-group="${group}" title="${esc(p.label)}" aria-selected="${state.profile === p.id}" aria-controls="adminDtnSeasonResults">${esc(listing || p.id === "summary" ? p.label : p.id)}${listing && view.hit ? ` · ${athleteRows(countProfiles).length}` : ""}</button>`;
    }).join("")}</div>`;
  }
  function resultFilters(athletes, clubs) {
    const beforeSex = athletes.filter((r) => (!state.club || r.club === state.club) && (!state.course || r.qualifications.some((q) => q.course === state.course)));
    return `<div class="admin-dtn-listing-filters" data-listing-tab="${state.device === "listing" && state.profile === "espoir" ? "espoir" : "releve"}" aria-label="Filtres des sportifs">
      ${state.device === "listing" && state.profile === "espoir" ? `<label>Performance<select data-result="performance">${option("", "Tous", state.performance)}${season().listing.filter((p) => p.enabled && ["TEC1", "TEP"].includes(p.id)).map((p) => option(p.id, p.id, state.performance)).join("")}</select></label>` : ""}
      ${sexButtons(beforeSex, true)}
      <label>Club<select data-result="club">${option("", "Tous", state.club)}${clubs.map((c) => option(c, c, state.club)).join("")}</select></label>
      <label>Épreuve<select data-result="course">${option("", "Toutes", state.course)}${model.COURSES.map((c) => option(c, courseLabel(c), state.course)).join("")}</select></label>
      ${button("export-results", "Exporter Excel")}
    </div>`;
  }
  function scope(profiles) {
    const s = season();
    el.definitions.innerHTML = `<span class="admin-dtn-competition-scope admin-dtn-season-scope"><strong>Règles ${esc(s.label)}</strong>${profiles.map((p) => {
      const pools = p.legacyUnrestricted ? "tous bassins" : `${p.pools.join(" / ")} m`;
      return `<span><b>${esc(p.label)}</b> : ${p.minAge}–${p.maxAge} ans · ${esc(p.startDate)} au ${esc(p.endDate)} · ${pools}${p.electronicOnly ? " électronique" : ""} · ${p.allowIntermediate ? "temps intermédiaires admis" : "sans temps intermédiaires"} · ${p.competitionMode === "all" ? "toutes les compétitions" : esc(p.competitions.map((c) => c.name).join(" · ") || "aucune compétition sélectionnée")}</span>`;
    }).join("<br>")}</span>`;
    el.grid.after(el.definitions);
  }
  function courseDetail(view) {
    if (!state.selectedCourse) return "";
    const { profile, sex, course } = state.selectedCourse;
    const p = view.profiles?.find((item) => item.id === profile), c = p?.courses.find((item) => item.sex === sex && item.course === course);
    if (!c || !view.hit) return "";
    const rows = c.qualifiers.filter((r) => !state.club || r.club === state.club);
    return `<section class="admin-dtn-season-detail" aria-label="Nageurs qualifiés"><div class="admin-dtn-grid-head"><div><span>${esc(courseLabel(course))} · ${sex === "F" ? "Femmes" : "Hommes"} · ${esc(p.label)}</span><strong>Nageurs qualifiés · ${rows.length}</strong></div>${button("close-course", "Fermer")}</div>${paged(rows, (slice) => performanceTable(slice))}</section>`;
  }
  function franceResults(view) {
    const profiles = season().france.filter((p) => p.enabled).sort((a, b) => ["S", "J", "C"].indexOf(a.id) - ["S", "J", "C"].indexOf(b.id));
    const codes = { S: "SE", J: "JU", C: "CA" };
    return `<div class="admin-dtn-table-wrap"><table class="admin-dtn-standards-table"><thead><tr><th>Catégorie</th>${model.COURSES.map((c) => `<th>${courseLabel(c)}</th>`).join("")}</tr></thead><tbody>${profiles.flatMap((p) => ["F", "M"].map((sex) => `<tr class="sex-${sex.toLowerCase()}"><th title="${sex === "F" ? "Femmes" : "Hommes"} ${esc(p.label)}"><span class="admin-dtn-category-code">${sex === "F" ? "F" : "H"}${codes[p.id] || esc(p.label)}</span></th>${model.COURSES.map((course) => {
      const cell = profileGrid(p)[`${sex}|${course}`], selected = state.selectedCourse;
      return `<td>${cell && (cell.time || cell.top) ? `<button type="button" class="admin-dtn-time" data-action="show-course" data-profile="${esc(p.id)}" data-sex="${sex}" data-course="${course}" aria-label="${sex === "F" ? "Femmes" : "Hommes"} ${esc(p.label)} ${courseLabel(course)} : ${criteria(cell)}" aria-pressed="${selected?.profile === p.id && selected?.sex === sex && selected?.course === course}" ${view.hit ? "" : "disabled"}>${esc(criteria(cell))}</button>` : '<span class="admin-dtn-no-time">—</span>'}</td>`;
    }).join("")}</tr>`)).join("") || '<tr><td colspan="15" class="admin-dtn-empty">Aucune catégorie activée pour cette saison.</td></tr>'}</tbody></table></div>${courseDetail(view)}`;
  }
  function edfResults(view, profiles) {
    const p = season().edf.find((item) => item.id === state.profile);
    if (!p) return '<p class="admin-dtn-empty">Aucun référentiel activé.</p>';
    const courses = profiles.flatMap((item) => item.courses), grid = profileGrid(p);
    return `<div class="admin-dtn-edf-standard-head"><div><strong>${esc(p.label)}</strong><span>${p.minAge}–${p.maxAge} ans au 31 décembre ${season().year}</span></div><small>Une seule performance, la meilleure admissible, par sportif et par course.</small></div>
      <div class="admin-dtn-table-wrap"><table class="admin-dtn-standards-table admin-dtn-edf-table"><thead><tr><th>Course</th><th>Temps</th><th>Qualifiés</th><th>Détail</th></tr></thead><tbody>${model.COURSES.map((course) => {
        const cell = grid[`${state.sex}|${course}`], c = courses.find((item) => item.sex === state.sex && item.course === course);
        return `<tr><th>${courseLabel(course)}</th><td class="admin-dtn-edf-threshold${cell ? "" : " is-unavailable"}">${esc(criteria(cell))}</td><td class="admin-dtn-edf-count${cell ? "" : " is-unavailable"}">${cell ? view.hit ? c?.qualifiers.length || 0 : "…" : "—"}</td><td>${cell ? button("show-course", "Voir les sportifs", `data-profile="${esc(p.id)}" data-sex="${state.sex}" data-course="${course}" ${view.hit ? "" : "disabled"}`, "ghost-button admin-dtn-detail-button") : ""}</td></tr>`;
      }).join("")}</tbody></table></div>${courseDetail(view)}`;
  }
  function results(view) {
    const options = resultOptions();
    if (!options.some((p) => p.id === state.profile)) state.profile = options[0]?.id || "";
    if (state.device === "edf" && state.profile !== "summary" && !state.sex) state.sex = "F";
    const profiles = view.hit ? resultProfiles(view) : [];
    const athletes = athleteRows(profiles);
    const clubs = [...new Set(athletes.map((r) => r.club).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
    const isList = state.device === "listing" || state.profile === "summary";
    const nearAvailable = state.device === "edf" && ["TSP", "TRP"].includes(state.profile);
    const nearClubs = [...new Set(profiles.flatMap((p) => p.courses.flatMap((c) => c.nearMinimum.map((r) => r.club))).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
    const freshness = view.hit ? `Saison ${season().label} · Dernier calcul : ${new Date(view.generatedAt).toLocaleString("fr-FR")} · paramètres version ${view.revision}` : view.pending ? "Calcul en cours. Actualisez l’affichage dans quelques instants." : view.error || "Résultats absents ou périmés. Recalculez pour utiliser les paramètres actuels.";
    el.grid.innerHTML = `<div class="admin-dtn-grid-head"><div><span>${LABELS[state.device]}</span><strong>${state.device === "france" ? "Épreuves individuelles" : isList ? "Sportifs éligibles" : "Temps piscine"}</strong></div><div class="admin-dtn-grid-actions">
      ${state.device === "edf" && !isList ? sexButtons([]) : ""}
      ${state.id !== state.catalog.previous ? button("rebuild", "Recalculer", 'title="Recalculer les trois dispositifs de cette saison"') : ""}${button("reload", "Actualiser l’affichage")}
    </div></div>
    ${state.device === "france" ? "" : resultTabs(options, view)}
    <p class="admin-dtn-freshness" role="status">${esc(freshness)}</p>
    ${nearAvailable ? `<div class="admin-dtn-near-controls"><label><input type="checkbox" data-near ${checked(state.near)}> Voir les nageurs proches du minimum</label>${state.near ? `<label>Écart inférieur à <input type="number" data-percent min="0.1" max="5" step="0.1" required value="${state.percent}"> %</label><label>Club<select data-result="club">${option("", "Tous", state.club)}${nearClubs.map((c) => option(c, c, state.club)).join("")}</select></label><label>Épreuve<select data-result="course">${option("", "Toutes", state.course)}${model.COURSES.map((c) => option(c, courseLabel(c), state.course)).join("")}</select></label>` : ""}</div>` : ""}
    <div id="adminDtnSeasonResults" data-results>${state.device === "france" ? franceResults(view) : isList ? view.hit ? resultFilters(athletes, clubs) + paged(filtered(athletes).sort((a, b) => (a.lastName || athleteLabel(a)).localeCompare(b.lastName || athleteLabel(b), "fr")), (slice) => athleteTable(slice)) : "" : edfResults(view, profiles)}</div>
    ${view.hit && !isList ? `<details class="admin-dtn-export"><summary>Exporter Excel</summary><div class="admin-dtn-export-content">${button("export-results", "Choisir les référentiels à exporter")}</div></details>` : ""}`;
    const configs = season()[state.device].filter((p) => p.enabled && (state.device === "france" || state.profile === "summary" || state.profile === "espoir" && ["TEC1", "TEP"].includes(p.id) || p.id === state.profile));
    scope(configs);
    if (view.hit && nearAvailable && state.near) {
      const rows = filtered(profiles.flatMap((p) => p.courses.flatMap((c) => c.nearMinimum.map((r) => ({ ...r, threshold: c.threshold }))))).filter((r) => (r.timeValue - r.threshold) * 100 < r.threshold * state.percent).sort((a, b) => (a.timeValue - a.threshold) / a.threshold - (b.timeValue - b.threshold) / b.threshold);
      el.grid.querySelector("[data-results]").insertAdjacentHTML("beforeend", `<section class="admin-dtn-near-results"><h3>Proches du minimum</h3><p>${rows.length} performance(s) à moins de ${state.percent} % · minima non réalisés sur ces courses</p>${paged(rows, (slice) => performanceTable(slice, true))}</section>`);
    }
  }
  function paged(rows, renderer) {
    const pages = Math.max(1, Math.ceil(rows.length / 50)); state.page = Math.min(state.page, pages - 1);
    return renderer(rows.slice(state.page * 50, state.page * 50 + 50)) + (pages > 1 ? `<div class="admin-dtn-controls">${button("previous", "Précédent", state.page ? "" : "disabled")}<span>Page ${state.page + 1} / ${pages}</span>${button("next", "Suivant", state.page + 1 < pages ? "" : "disabled")}</div>` : "");
  }
  function performanceTable(rows, near = false) {
    if (!rows.length) return "<p>Aucun résultat.</p>";
    return `<div class="admin-dtn-table-wrap"><table class="admin-dtn-results-table"><thead><tr><th>Nageur</th><th>Club</th><th>Course</th><th>Temps</th>${near ? "<th>Minimum</th><th>Écart</th>" : "<th>Rang</th><th>Critère satisfait</th>"}<th>Compétition</th><th>Date</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(athleteLabel(r))}</td><td>${esc(r.club)}</td><td>${courseLabel(r.course)}</td><td>${esc(r.time || model.display(r.timeValue))}</td>${near ? `<td>${model.display(r.threshold)}</td><td>+${((r.timeValue - r.threshold) / 100).toFixed(2)} s · +${((r.timeValue - r.threshold) * 100 / r.threshold).toFixed(2)} %</td>` : `<td>${r.rank}</td><td>${r.minimum && r.top ? "Les deux" : r.top ? "Top" : "Minimum"}</td>`}<td>${esc(r.competition || r.location)}</td><td>${esc(r.date)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  function athleteTable(rows) {
    return `<div class="admin-dtn-results-wrap"><table class="admin-dtn-results-table admin-dtn-listing-table"><thead><tr><th>Nom</th><th>Prénom</th><th>Année</th><th>Sexe</th><th>Club</th><th>Performance</th><th>Détail</th></tr></thead><tbody>${rows.map((r) => `<tr data-sex="${esc(r.sex)}"><td>${esc(r.lastName || r.swimmer)}</td><td>${esc(r.firstName || "")}</td><td>${esc(String(r.birthDate || "").slice(0, 4))}</td><td>${r.sex === "F" ? "F" : "H"}</td><td>${esc(r.club)}</td><td>${r.profileLabels.map((label) => `<span class="admin-dtn-listing-badge" data-level="${esc(label)}">${esc(label)}</span>`).join(" ")}</td><td><details class="admin-dtn-listing-details"><summary>${r.qualifications.length} performance${r.qualifications.length > 1 ? "s" : ""}</summary><div class="admin-dtn-qualified-courses">${r.qualifications.map((q) => `<span class="admin-dtn-qualified-course"><span><strong>${esc(courseLabel(q.course))}</strong>${esc(q.time || shortTime(q.timeValue))}</span><small>${esc(q.profileLabel)} · Minimum ${shortTime(q.threshold)} · ${esc(q.competition || "—")} · ${esc(q.date || "—")}</small></span>`).join("")}</div></details></td></tr>`).join("") || '<tr><td colspan="7" class="admin-dtn-empty">Aucun sportif ne correspond aux critères.</td></tr>'}</tbody></table></div>`;
  }
  function field(name, label, value, type = "text", extra = "") { return `<label>${label}<input data-field="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`; }
  function settings() {
    const profile = activeProfile(); state.editorProfile = profile.id;
    const disabled = editable() ? "" : "disabled";
    const grid = profile.sourceId ? state.editor.edf.find((p) => p.id === profile.sourceId)?.grid || {} : profile.grid;
    el.grid.innerHTML = `<div class="admin-dtn-controls">
      <label>Dispositif<select data-editor-device>${Object.entries(LABELS).filter(([id]) => id !== "settings").map(([id, label]) => option(id, label, state.editorDevice)).join("")}</select></label>
      <label>Référentiel<select data-editor-profile>${state.editor[state.editorDevice].map((p) => option(p.id, p.label, profile.id)).join("")}</select></label>
      ${editable() ? button("save", "Enregistrer les paramètres") : ""}
      ${state.canManage && !state.catalog.draft ? button("create", "Préparer la saison suivante") : ""}
      ${state.canManage && state.id === state.catalog.draft ? button("activate", "Activer cette saison") : ""}
      ${button("reload-settings", "Recharger les paramètres")}
    </div>
    <p>${state.id === state.catalog.previous ? "La saison précédente est verrouillée." : "L’enregistrement invalide les anciens calculs. Le recalcul reste volontaire."}</p>
    ${state.id === state.catalog.draft ? `<p>Avant activation : compléter les compétitions et les grilles, enregistrer, puis recalculer et vérifier les trois dispositifs.</p>${button("rebuild", "Calculer le brouillon")}` : ""}
    <form data-settings-form><fieldset ${disabled}>
      <legend>${esc(profile.label)}</legend>
      <div class="admin-dtn-controls">
        <label><input type="checkbox" data-field="enabled" ${checked(profile.enabled)}> Référentiel actif</label>
        ${field("label", "Libellé", profile.label, "text", 'required maxlength="80"')}
        ${field("minAge", "Âge minimum", profile.minAge, "number", 'min="0" max="120" required')}
        ${field("maxAge", "Âge maximum", profile.maxAge, "number", 'min="0" max="120" required')}
      </div>
      <p>Âge au 31 décembre ${state.editor.year}. Les étrangers comptent dans les Top ; tous les ex æquo au dernier rang sont admis.</p>
      <details open><summary>Conditions de réalisation</summary><div class="admin-dtn-controls">
        ${field("startDate", "Du (inclus)", profile.startDate, "date", `min="${state.editor.year - 1}-09-01" max="${state.editor.year}-08-31" required`)}
        ${field("endDate", "Au (inclus)", profile.endDate, "date", `min="${state.editor.year - 1}-09-01" max="${state.editor.year}-08-31" required`)}
        <label><input type="checkbox" data-pool="25" ${checked(profile.pools.includes("25"))}> 25 m</label>
        <label><input type="checkbox" data-pool="50" ${checked(profile.pools.includes("50"))}> 50 m</label>
        <label><input type="checkbox" data-field="electronicOnly" ${checked(profile.electronicOnly)}> Chronométrage électronique uniquement</label>
        <label><input type="checkbox" data-field="allowIntermediate" ${checked(profile.allowIntermediate)}> Temps intermédiaires admis</label>
        <label>Compétitions<select data-field="competitionMode">${option("all", "Toutes, régionales comprises", profile.competitionMode)}${option("selected", "Liste de compétitions", profile.competitionMode)}</select></label>
      </div>${profile.legacyUnrestricted ? '<p>Reprise historique : aucun filtre de bassin. Cocher un bassin remplace cette règle.</p>' : ""}
      ${profile.competitionMode === "selected" ? `<p>${profile.competitions.length} compétition(s) : ${profile.competitions.map((c) => esc(c.name)).join(" · ") || "à sélectionner"}</p>${button("sources", "Choisir les compétitions")}` : ""}</details>
      ${state.editorDevice === "listing" ? `<div class="admin-dtn-controls"><label>Grille utilisée<select data-field="sourceId">${option("", "Grille spécifique à cette liste", profile.sourceId || "")}${state.editor.edf.map((p) => option(p.id, `${p.label} · même saison`, profile.sourceId)).join("")}</select></label></div><p>Une grille liée suit les modifications du référentiel EDF de cette saison.</p>` : ""}
      <details open><summary>Grille femmes / hommes</summary>
      <div class="admin-dtn-controls">${button("template", "Télécharger la trame Excel")}${!profile.sourceId ? `${button("import", "Importer une grille")}<input type="file" data-import-file accept=".xlsx" hidden>` : ""}</div>
      <p>Décochez une course pour la désactiver. ${state.editorDevice === "france" ? "Temps et Top renseignés ensemble : l’un des deux suffit." : "Temps au format 01:23.45."}</p>
      <div class="admin-dtn-table-wrap"><table class="admin-dtn-results-table admin-dtn-edit-grid"><thead><tr><th>Course</th>${["F", "M"].map((sex) => `<th>${sex === "F" ? "Femmes" : "Hommes"} · active</th><th>Temps minimum</th>${state.editorDevice === "france" ? "<th>Top</th>" : ""}`).join("")}</tr></thead><tbody>${model.COURSES.map((course) => `<tr><th>${courseLabel(course)}</th>${["F", "M"].map((sex) => { const key = `${sex}|${course}`, cell = grid[key]; return `<td><input type="checkbox" data-grid-enabled="${key}" aria-label="Activer ${sex} ${course}" ${checked(cell)} ${profile.sourceId ? "disabled" : ""}></td><td><input data-grid-time="${key}" aria-label="Temps ${sex} ${course}" value="${esc(model.display(cell?.time))}" placeholder="01:23.45" ${!cell || profile.sourceId ? "disabled" : ""}></td>${state.editorDevice === "france" ? `<td><select data-grid-top="${key}" aria-label="Top ${sex} ${course}" ${cell ? "" : "disabled"}>${option("", "Aucun", String(cell?.top || ""))}${option("8", "8", String(cell?.top))}${option("16", "16", String(cell?.top))}</select></td>` : ""}`; }).join("")}</tr>`).join("")}</tbody></table></div></details>
      ${state.editorDevice !== "france" ? `<details><summary>Nombre de minima et combinaisons</summary><label>Combiner les conditions<select data-requirements-mode>${option("any", "OU : au moins une condition", profile.requirements.mode)}${option("all", "ET : toutes les conditions", profile.requirements.mode)}</select></label>${profile.requirements.groups.map((g, i) => `<div class="admin-dtn-condition"><label>Au moins<input type="number" min="1" max="14" required data-group-count="${i}" value="${g.count}"> course(s) distincte(s) parmi :</label><div class="admin-dtn-course-choices">${model.COURSES.map((c) => `<label><input type="checkbox" data-group-course="${i}" value="${c}" ${checked(g.courses.includes(c))}> ${courseLabel(c)}</label>`).join("")}</div>${profile.requirements.groups.length > 1 ? button("remove-condition", "Retirer cette condition", `data-index="${i}"`) : ""}</div>`).join("")}${profile.requirements.groups.length < 8 ? button("add-condition", "Ajouter une condition") : ""}<p>Une même course n’est comptée qu’une fois dans chaque condition.</p></details>
      <details><summary>Priorité entre référentiels</summary><p>Exclure de cette liste les sportifs satisfaisant à :</p>${state.editor[state.editorDevice].filter((p) => p.id !== profile.id).map((p) => `<label><input type="checkbox" data-exclude="${p.id}" ${checked(profile.excludeIf.includes(p.id))}> ${esc(p.label)}</label>`).join(" ")}</details>` : ""}
    </fieldset></form>
    ${editable() && state.editorDevice !== "france" ? button("add-profile", "Ajouter un référentiel") : ""}`;
  }
  async function save() {
    if (!editable() || !el.grid.querySelector("form").reportValidity()) return;
    if (!global.confirm(`Appliquer les paramètres à ${state.id} ? Les résultats devront être recalculés. Les grilles liées de cette saison suivront ces changements.`)) return;
    const result = await call("updateDtnSeason", { action: "save", id: state.id, revision: season().revision, catalogRevision: state.catalog.revision, season: state.editor });
    state.catalog = result.catalog; state.seasons = state.seasons.map((s) => s.id === state.id ? result.season : s); state.views.clear(); resetEditor();
    message("Paramètres enregistrés. Vous pouvez recalculer les résultats."); render();
  }
  async function create() {
    if (!discard()) return;
    const source = state.seasons.find((s) => s.id === state.catalog.current), year = source.year + 1;
    const dialog = modal(`<h3>Préparer ${year - 1}–${year}</h3><p>Les compétitions seront à sélectionner à nouveau. Les conditions initiales seront 50 m électronique, temps intermédiaires admis.</p><label><input type="checkbox" data-duplicate checked> Dupliquer les grilles et les conditions de la saison active</label><div class="admin-dtn-controls">${button("confirm", "Créer le brouillon")}${button("cancel", "Annuler", "data-close")}</div><p role="status"></p>`);
    dialog.querySelector('[data-action="confirm"]').onclick = async (event) => {
      event.target.disabled = true;
      try {
        const result = await call("updateDtnSeason", { action: "create", id: `${year - 1}-${year}`, catalogRevision: state.catalog.revision, duplicate: dialog.querySelector("[data-duplicate]").checked });
        state.catalog = result.catalog; state.seasons.push(result.season); state.id = result.season.id; resetEditor(); dialog.close(); render();
      } catch (error) { dialog.querySelector('[role="status"]').textContent = error.message; event.target.disabled = false; }
    };
  }
  async function activate() {
    if (state.dirty) throw new Error("Enregistrez les paramètres avant activation.");
    if (!global.confirm(`Activer ${state.id} ? ${state.catalog.current} deviendra la saison précédente.${state.catalog.previous ? ` ${state.catalog.previous} sera retirée de l’espace DTN.` : ""} Aucune performance ne sera supprimée.`)) return;
    await call("updateDtnSeason", { action: "activate", id: state.id, revision: season().revision, catalogRevision: state.catalog.revision, confirmed: true });
    await refreshCatalog(); state.views.clear(); message("Saison activée."); render();
  }
  async function rebuild() {
    if (state.dirty) throw new Error("Enregistrez les paramètres avant le calcul.");
    if (!global.confirm("Recalculer les trois dispositifs avec les paramètres enregistrés ? Les performances de cette saison seront analysées en arrière-plan.")) return;
    const target = state.device === "settings" ? "france" : state.device;
    const result = await call("getDtnSeasonOverview", { id: state.id, device: target, rebuild: true });
    state.views.clear(); message(result.pending ? "Calcul lancé en arrière-plan. Utilisez Actualiser l’affichage pour vérifier sa fin." : result.error || "Recalcul demandé.");
    if (state.device !== "settings") results(result);
  }
  async function spreadsheet() { await loadScript("performances/public/vendor/xlsx.full.min.js?v=20260722-dtn-export-1", () => global.XLSX); return global.XLSX; }
  async function template() {
    const XLSX = await spreadsheet(), device = state.editorDevice;
    const headers = device === "france" ? ["Catégorie", "Sexe", "Course", "Temps minimum", "Top", "Action"] : ["Référentiel", "Sexe", "Course", "Temps minimum", "Action"];
    const rows = [headers];
    for (const p of state.editor[device].filter((p) => !p.sourceId)) for (const sex of ["F", "M"]) for (const course of model.COURSES) {
      const cell = p.grid[`${sex}|${course}`]; rows.push([p.id, sex === "M" ? "H" : "F", course, model.display(cell?.time), ...(device === "france" ? [cell?.top || ""] : []), ""]);
    }
    const sheet = XLSX.utils.aoa_to_sheet(rows); sheet["!cols"] = headers.map(() => ({ wch: 22 }));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Grille"); XLSX.writeFile(book, `Trame_DTN_${device}_${state.id}.xlsx`);
  }
  async function importFile(file) {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name) || file.size > 2 * 1024 * 1024) throw new Error("Choisissez un fichier .xlsx de 2 Mo maximum.");
    const XLSX = await spreadsheet(), workbook = XLSX.read(await file.arrayBuffer(), { type: "array", sheetRows: 1001 });
    if (workbook.SheetNames.length !== 1 || workbook.SheetNames[0] !== "Grille") throw new Error("Utilisez la trame avec l’onglet Grille.");
    const sheet = workbook.Sheets.Grille;
    if (Object.entries(sheet).some(([k, v]) => !k.startsWith("!") && v.f)) throw new Error("Les formules ne sont pas acceptées : collez leurs valeurs.");
    if (XLSX.utils.decode_range(sheet["!fullref"] || sheet["!ref"]).e.r >= 1000) throw new Error("La grille dépasse 1 000 lignes.");
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
    const dialog = modal(`<h3>Aperçu de l’import · ${esc(LABELS[state.editorDevice])}</h3><label>Mode<select data-mode><option value="update">Compléter / modifier</option><option value="replace">Remplacer la grille</option></select></label><p data-explanation></p><label>Afficher<select data-filter>${["Tous", "Ajouts", "Modifications", "Suppressions", "Identiques", "Erreurs"].map((t) => option(t, t, "Tous")).join("")}</select></label><div data-diff></div><div class="admin-dtn-controls">${button("apply", "Appliquer à la grille")}${button("cancel", "Annuler", "data-close")}</div><p>Rien n’est enregistré avant « Enregistrer les paramètres ».</p>`);
    let preview;
    const draw = () => {
      const replace = dialog.querySelector("[data-mode]").value === "replace";
      preview = model.preview(state.editor[state.editorDevice], rows, state.editorDevice, replace);
      const filter = dialog.querySelector("[data-filter]").value;
      dialog.querySelector("[data-explanation]").textContent = replace ? "Les cases absentes ou vides sont supprimées dans les grilles spécifiques de ce dispositif. Les grilles liées sont conservées." : "Les cases absentes ou vides restent inchangées. La colonne Action accepte Supprimer pour retirer une course.";
      const cellLabel = (c) => c ? `${model.display(c.time) || "—"}${c.top ? ` / Top ${c.top}` : ""}` : "—";
      dialog.querySelector("[data-diff]").innerHTML = `${["Tous", "Erreurs"].includes(filter) ? preview.errors.map((e) => `<p role="alert">${esc(e)}</p>`).join("") : ""}<p>${["Ajouts", "Modifications", "Suppressions", "Identiques"].map((type) => `${type} : ${preview.changes.filter((c) => c.type === type).length}`).join(" · ")} · Erreurs : ${preview.errors.length}</p><div class="admin-dtn-table-wrap"><table class="admin-dtn-results-table"><thead><tr><th>État</th><th>Case</th><th>Avant</th><th>Après</th></tr></thead><tbody>${preview.changes.filter((c) => filter === "Tous" || c.type === filter).map((c) => `<tr><td>${c.type}</td><td>${esc(c.profile)} · ${esc(c.key)}</td><td>${cellLabel(c.before)}</td><td>${cellLabel(c.after)}</td></tr>`).join("")}</tbody></table></div>`;
      dialog.querySelector('[data-action="apply"]').disabled = preview.errors.length > 0;
    };
    dialog.querySelector("[data-mode]").onchange = draw; dialog.querySelector("[data-filter]").onchange = draw;
    dialog.querySelector('[data-action="apply"]').onclick = () => { if (preview.errors.length) return; state.editor[state.editorDevice] = preview.next; state.dirty = true; dialog.close(); settings(); message("Import appliqué au brouillon. Enregistrez pour le conserver."); }; draw();
  }
  async function sources() {
    const id = state.id, p = activeProfile(), selected = new Map(p.competitions.map((c) => [c.id, c]));
    let data = state.sources.get(id) || { sources: [], cursor: null };
    const dialog = modal(`<h3>Compétitions de ${esc(id)}</h3><p>Sources historiques ou résultats importés. Une compétition future sans résultats ne figure pas encore ici.</p><label>Rechercher<input data-search></label><div data-list></div><div class="admin-dtn-controls">${button("more", "Charger les compétitions")}${button("apply", "Appliquer la sélection")}${button("cancel", "Annuler", "data-close")}</div><p role="status"></p>`);
    const draw = () => {
      const q = dialog.querySelector("[data-search]").value.toLocaleLowerCase("fr");
      const all = new Map([...selected, ...data.sources.map((c) => [c.id, c])]);
      dialog.querySelector("[data-list]").innerHTML = [...all.values()].filter((c) => `${c.name} ${c.date || ""}`.toLocaleLowerCase("fr").includes(q)).map((c) => `<label class="admin-dtn-source"><input type="checkbox" data-source="${esc(c.id)}" ${checked(selected.has(c.id))}> ${esc(c.name)} · ${esc(c.date || "")}</label>`).join("") || "<p>Aucune compétition chargée ne correspond.</p>";
      dialog.querySelector('[data-action="more"]').disabled = data.cursor === "";
      dialog.querySelector('[role="status"]').textContent = `${selected.size} sélectionnée(s).`;
    };
    dialog.querySelector('[data-action="more"]').onclick = async (event) => {
      event.target.disabled = true;
      try { const page = await call("listDtnSeasonSources", { id, cursor: data.cursor || "" }); data = { sources: [...data.sources, ...page.sources], cursor: page.cursor }; state.sources.set(id, data); draw(); }
      catch (error) { dialog.querySelector('[role="status"]').textContent = error.message; event.target.disabled = false; }
    };
    dialog.querySelector("[data-search]").oninput = draw;
    dialog.querySelector("[data-list]").onchange = (event) => { const sourceId = event.target.dataset.source; if (!sourceId) return; if (event.target.checked) selected.set(sourceId, data.sources.find((c) => c.id === sourceId) || selected.get(sourceId)); else selected.delete(sourceId); draw(); };
    dialog.querySelector('[data-action="apply"]').onclick = () => { p.competitions = [...selected.values()]; state.dirty = true; dialog.close(); settings(); };
    draw();
  }
  async function exportResults() {
    const view = state.views.get(viewKey()); if (!view?.hit) return;
    const dialog = modal(`<h3>Exporter les résultats</h3>${view.profiles.map((p) => `<label class="admin-dtn-source"><input type="checkbox" data-export-profile value="${p.id}" ${checked(state.device !== "listing" || resultProfiles(view).some((selected) => selected.id === p.id))}> ${esc(p.label)}</label>`).join("")}<p>Les filtres de sexe, club et course sont conservés.</p>${button("export", "Exporter")}${button("cancel", "Annuler", "data-close")}<p role="status"></p>`);
    dialog.querySelector('[data-action="export"]').onclick = async (event) => {
      event.target.disabled = true;
      try {
        const ids = [...dialog.querySelectorAll("[data-export-profile]:checked")].map((c) => c.value);
        if (!ids.length) throw new Error("Choisissez au moins un référentiel.");
        const XLSX = await spreadsheet(), book = XLSX.utils.book_new();
        for (const p of view.profiles.filter((p) => ids.includes(p.id))) {
          const rows = filtered(p.athletes).flatMap((a) => a.qualifications.filter((q) => !state.course || q.course === state.course).map((q) => ({ Saison: state.id, Référentiel: p.label, Sportif: athleteLabel(a), Sexe: a.sex === "F" ? "F" : "H", Club: a.club, Course: q.course, Temps: model.display(q.timeValue), Minimum: model.display(q.threshold), Rang: q.rank, Critère: q.minimum && q.top ? "Les deux" : q.top ? "Top" : "Minimum", Compétition: q.competition, Date: q.date })));
          const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Résultat: "Aucun sportif" }]); sheet["!cols"] = Array.from({ length: 12 }, () => ({ wch: 22 })); XLSX.utils.book_append_sheet(book, sheet, p.id);
        }
        XLSX.writeFile(book, `DTN_${state.device}_${state.id}.xlsx`); dialog.close();
      } catch (error) { dialog.querySelector('[role="status"]').textContent = error.message; event.target.disabled = false; }
    };
  }
  function change(event) {
    const target = event.target;
    try {
      if (target.dataset.result) { state[target.dataset.result] = target.value; state.selectedCourse = null; state.page = 0; render(); return; }
      if (target.matches("[data-near]")) { state.near = target.checked; state.selectedCourse = null; state.page = 0; render(); return; }
      if (target.matches("[data-percent]")) { if (!target.reportValidity()) return; state.percent = Number(target.value); state.page = 0; render(); return; }
      if (target.matches("[data-editor-device]")) { state.editorDevice = target.value; state.editorProfile = state.editor[target.value][0].id; settings(); return; }
      if (target.matches("[data-editor-profile]")) { state.editorProfile = target.value; settings(); return; }
      if (!editable()) return;
      const p = activeProfile();
      if (target.matches("[data-import-file]")) { importFile(target.files?.[0]).catch((e) => message(e.message, true)); target.value = ""; return; }
      if (target.dataset.field) {
        if (target.dataset.field === "sourceId" && !target.value && p.sourceId) p.grid = clone(state.editor.edf.find((source) => source.id === p.sourceId)?.grid || {});
        p[target.dataset.field] = target.type === "checkbox" ? target.checked : target.type === "number" ? Number(target.value) : target.value;
        state.dirty = true;
        if (["sourceId", "competitionMode"].includes(target.dataset.field)) settings();
      }
      if (target.dataset.pool) { p.pools = [...el.grid.querySelectorAll("[data-pool]:checked")].map((c) => c.dataset.pool); delete p.legacyUnrestricted; state.dirty = true; }
      if (target.dataset.gridEnabled) { const key = target.dataset.gridEnabled; if (target.checked) p.grid[key] = { time: null, top: null }; else delete p.grid[key]; state.dirty = true; settings(); }
      if (target.dataset.gridTime) { p.grid[target.dataset.gridTime].time = model.parse(target.value); target.value = model.display(p.grid[target.dataset.gridTime].time); state.dirty = true; }
      if (target.dataset.gridTop) { p.grid[target.dataset.gridTop].top = target.value ? Number(target.value) : null; state.dirty = true; }
      if (target.matches("[data-requirements-mode]")) { p.requirements.mode = target.value; state.dirty = true; }
      if (target.dataset.groupCount !== undefined) { p.requirements.groups[Number(target.dataset.groupCount)].count = Number(target.value); state.dirty = true; }
      if (target.dataset.groupCourse !== undefined) { const i = Number(target.dataset.groupCourse); p.requirements.groups[i].courses = [...el.grid.querySelectorAll(`[data-group-course="${i}"]:checked`)].map((c) => c.value); state.dirty = true; }
      if (target.dataset.exclude) { p.excludeIf = [...el.grid.querySelectorAll("[data-exclude]:checked")].map((c) => c.dataset.exclude); state.dirty = true; }
      message(state.dirty ? "Modifications non enregistrées." : "");
    } catch (error) { target.setCustomValidity?.(error.message); target.reportValidity?.(); message(error.message, true); }
  }
  async function action(event) {
    const b = event.target.closest("[data-action]"); if (!b) return;
    const name = b.dataset.action;
    b.disabled = true;
    try {
      if (name === "result-profile") { state.profile = b.dataset.value; state.performance = ""; state.club = ""; state.course = ""; state.selectedCourse = null; state.page = 0; await render(); el.grid.querySelector(`[data-action="result-profile"][data-value="${b.dataset.value}"]`)?.focus(); }
      if (name === "result-sex") { state.sex = b.dataset.value; state.selectedCourse = null; state.page = 0; await render(); }
      if (name === "show-course") { state.selectedCourse = { profile: b.dataset.profile, sex: b.dataset.sex, course: b.dataset.course }; state.page = 0; state.near = false; await render(); el.grid.querySelector(".admin-dtn-season-detail")?.scrollIntoView({ block: "nearest" }); }
      if (name === "close-course") { state.selectedCourse = null; state.page = 0; await render(); }
      if (name === "save") await save();
      if (name === "create") await create();
      if (name === "activate") await activate();
      if (name === "rebuild") await rebuild();
      if (name === "reload") { state.views.delete(viewKey()); await render(); }
      if (name === "reload-settings" && discard()) { await refreshCatalog(); state.views.clear(); await render(); }
      if (name === "template") await template();
      if (name === "export-results") await exportResults();
      if (name === "import" && editable()) el.grid.querySelector("[data-import-file]").click();
      if (name === "sources" && editable()) await sources();
      if (name === "previous" || name === "next") { state.page = Math.max(0, state.page + (name === "next" ? 1 : -1)); render(); }
      if (name === "add-condition" && editable()) { activeProfile().requirements.groups.push({ count: 1, courses: [...model.COURSES] }); state.dirty = true; settings(); }
      if (name === "remove-condition" && editable()) { activeProfile().requirements.groups.splice(Number(b.dataset.index), 1); state.dirty = true; settings(); }
      if (name === "add-profile" && editable()) {
        const id = global.prompt("Identifiant unique (lettres majuscules, chiffres, tiret bas, 20 caractères maximum) :");
        if (!id) return;
        if (!/^[A-Z][A-Z0-9_]{0,19}$/.test(id) || state.editor[state.editorDevice].some((p) => p.id === id) || state.editor[state.editorDevice].length >= 12) throw new Error("Identifiant invalide, déjà utilisé ou limite de 12 référentiels atteinte.");
        const p = clone(activeProfile()); p.id = id; p.label = id; p.enabled = false; p.grid = {}; p.sourceId = ""; p.excludeIf = []; state.editor[state.editorDevice].push(p); state.editorProfile = id; state.dirty = true; settings();
      }
    } catch (error) { message(error.message, true); }
    finally { if (b.isConnected) b.disabled = false; }
  }
  async function init() {
    if (booting) return booting;
    booting = (async () => {
      el = { grid: document.querySelector("#adminDtnGrid"), season: document.querySelector("#adminDtnSeason"), toolbar: document.querySelector("#adminDtnToolbar"), refreshBox: document.querySelector("#adminDtnRefreshBox"), definitions: document.querySelector("#adminDtnDefinitions"), status: document.querySelector("#adminDtnRefreshStatus") };
      if (!el.grid) return;
      el.grid.textContent = "Chargement des saisons DTN…";
      await loadScript("assets/livepalmes-dtn-import.js?v=20260930-seasons-1", () => global.LivePalmesDtnImport); model = global.LivePalmesDtnImport;
      await refreshCatalog();
      // Keep the shared status visible even when the former refresh box is hidden.
      el.toolbar.append(el.status); state.device = HASHES[global.location.hash] || "france"; if (state.device === "listing") state.sex = ""; state.ready = true;
      el.grid.addEventListener("click", action); el.grid.addEventListener("change", change);
      el.grid.addEventListener("input", (event) => event.target.setCustomValidity?.(""));
      el.grid.addEventListener("toggle", (event) => { if (event.target.matches(".admin-dtn-listing-details[open]")) el.grid.querySelectorAll(".admin-dtn-listing-details[open]").forEach((detail) => { if (detail !== event.target) detail.open = false; }); }, true);
      el.grid.addEventListener("submit", (event) => event.preventDefault());
      el.season.onchange = () => { if (!discard()) { el.season.value = state.id; return; } state.id = el.season.value; state.selectedCourse = null; state.performance = ""; state.course = ""; state.profile = ""; state.club = ""; state.page = 0; resetEditor(); message(""); render(); };
      global.addEventListener("hashchange", () => { const next = HASHES[global.location.hash]; if (!next) return; state.preferences[state.device] = { profile: state.profile, sex: state.sex }; state.device = next; Object.assign(state, state.preferences[next] || { profile: "", sex: next === "listing" ? "" : "F" }); state.selectedCourse = null; state.performance = ""; state.course = ""; state.club = ""; state.page = 0; render(); });
      global.addEventListener("beforeunload", (event) => { if (state.dirty) { event.preventDefault(); event.returnValue = ""; } });
      await render();
    })().catch((error) => { booting = null; if (el?.grid) { el.grid.textContent = error.message; const retry = document.createElement("button"); retry.textContent = "Réessayer"; retry.onclick = init; el.grid.append(retry); } });
    return booting;
  }
  global.LivePalmesDtnQualifications = { init };
})(window);
