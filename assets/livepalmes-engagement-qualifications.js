(function (global) {
  "use strict";
  const categories = ["P", "B", "M", "C", "J", "S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"];
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const display = (value) => Number.isInteger(value) ? `${String(Math.floor(value / 6000)).padStart(2, "0")}:${String(Math.floor(value / 100) % 60).padStart(2, "0")}.${String(value % 100).padStart(2, "0")}` : "";
  function parse(value) {
    const raw = String(value || "").trim();
    if (!raw) return undefined;
    const digits = /^\d{1,6}$/.test(raw) ? raw.padStart(6, "0") : null;
    const match = digits ? [null, digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)] : raw.match(/^(\d{1,2}):(\d{2})[.,](\d{2})$/);
    if (!match || Number(match[2]) >= 60) throw new Error("Temps invalide. Exemple : 01:23.45 ou 12345.");
    const time = Number(match[1]) * 6000 + Number(match[2]) * 100 + Number(match[3]);
    if (time <= 0 || time >= 359999) throw new Error("Le minimum doit être un temps positif, inférieur à 59:59.99.");
    return time;
  }

  function importRows(rows, events, selectedCategories) {
    const values = {}, errors = [], ignored = [];
    let sex = "", headers = [], seenSections = new Set(), seenRows = new Set();
    rows.forEach((row, index) => {
      const first = String(row[0] ?? "").trim();
      if (["Femmes", "Hommes"].includes(first)) {
        sex = first === "Femmes" ? "F" : "M";
        if (seenSections.has(sex)) errors.push(`Ligne ${index + 1} : section ${first} en double.`);
        seenSections.add(sex); headers = []; return;
      }
      if (first === "Catégorie") {
        if (!sex || headers.length) errors.push(`Ligne ${index + 1} : en-tête inattendu.`);
        headers = row.slice(1).map((value) => String(value ?? "").replace(/\s/g, "").toUpperCase());
        if (new Set(headers).size !== headers.length) errors.push(`Ligne ${index + 1} : courses en double.`);
        return;
      }
      if (!headers.length || !first) return;
      if (!categories.includes(first)) {
        if (row.slice(1).some((value) => value !== null && value !== undefined && value !== "")) errors.push(`Ligne ${index + 1} : catégorie inconnue ${first}.`);
        return;
      }
      const rowKey = `${sex}|${first}`;
      if (seenRows.has(rowKey)) errors.push(`Ligne ${index + 1} : catégorie en double.`);
      seenRows.add(rowKey);
      row.slice(1).forEach((raw, col) => {
        if (raw === null || raw === undefined || String(raw).trim() === "") return;
        const code = headers[col], label = `${first} ${sex} ${code || `colonne ${col + 2}`}`;
        try {
          let time;
          if (String(raw).trim().toUpperCase() === "LIBRE") time = null;
          else if (typeof raw === "number" && raw > 0 && raw < 1) {
            time = Math.round(raw * 8640000); parse(display(time));
          } else time = parse(raw);
          if (!code || !/^\d+(SF|AP|IS|BI)$/.test(code)) throw new Error("Course inconnue ou relais non autorisé.");
          const event = events.find((item) => item.type === "individual" && item.code === code);
          if (!selectedCategories.includes(first) || !event?.categories.includes(first)) { ignored.push(label); return; }
          values[`${first}|${sex}|${code}`] = time;
        } catch (caught) { errors.push(`${label} : ${caught.message}`); }
      });
    });
    if (seenSections.size !== 2) errors.push("Les sections Femmes et Hommes sont requises dans l’onglet Minima.");
    if (!Object.keys(values).length) errors.push("Aucun minimum applicable à importer. Vérifiez les groupes et le programme.");
    return { values, errors, ignored };
  }

  function sourceState(source, group) {
    if (!source) return "unknown";
    const pool = String(source.pool || "").replace(/\s*m$/i, "");
    const chrono = String(source.chrono || "").toLowerCase();
    const knownPool = ["25", "50"].includes(pool);
    const electronic = ["e", "electronic", "electronique", "électronique"].includes(chrono);
    const manual = ["m", "manual", "manuel"].includes(chrono);
    if ((knownPool && !group.pools.includes(pool)) || (group.electronicOnly && manual)) return "excluded";
    return !knownPool || (group.electronicOnly && !electronic && !manual) ? "unknown" : "compatible";
  }

  function editor(mount, { rules = {}, events = [], national = false, competitionDate = "", getPeriod, onDirty = () => {}, loadSources, loadSpreadsheet }) {
    let draft = structuredClone({ enabled: false, groups: [], standards: {}, ...rules });
    let sources = [], sourceCursor = "", sourcesStarted = false;
    function capture() {
      draft.enabled = mount.querySelector("[data-q-enabled]")?.checked === true;
      draft.groups = [...mount.querySelectorAll("[data-q-group]")].map((row) => ({
        categories: [...row.querySelectorAll("[data-q-category]:checked")].map((input) => input.value),
        mode: row.querySelector("[data-q-mode]").value,
        ...(getPeriod ? getPeriod() : { startDate: row.querySelector("[data-q-start]").value, endDate: row.querySelector("[data-q-end]").value }),
        pools: [...row.querySelectorAll("[data-q-pool]:checked")].map((input) => input.value),
        electronicOnly: row.querySelector("[data-q-electronic]").checked,
        competitionMode: row.querySelector("[data-q-source-mode]").value,
        competitionIds: [...row.querySelectorAll("[data-q-source]:checked")].map((input) => input.value),
        bonusRequiresSelectedCompetition: row.querySelector("[data-q-mode]").value === "one" && row.querySelector("[data-q-bonus]").checked
      }));
      const standards = { ...draft.standards };
      for (const cell of mount.querySelectorAll("[data-q-standard]")) {
        const id = cell.dataset.qStandard;
        const value = cell.dataset.qNone === "true" ? null : parse(cell.querySelector("input").value);
        if (value === undefined) delete standards[id]; else standards[id] = value;
      }
      draft.standards = standards;
      return draft;
    }
    function render() {
      const selectedCategories = categories.filter((category) => draft.groups.some((group) => group.categories.includes(category)));
      mount.innerHTML = `<legend>Qualifications</legend>
        <label class="qualification-enable">
          <span><strong>Grille de qualification</strong><small>Contrôler automatiquement les engagements individuels</small></span>
          <input type="checkbox" data-q-enabled ${draft.enabled ? "checked" : ""} aria-label="Appliquer une grille de qualification">
        </label>
        <div data-q-content ${draft.enabled ? "" : "hidden"}>
          <p class="qualification-intro">Les catégories sont celles de la saison de la compétition. Les minima sont communs aux bassins sélectionnés.</p>
          ${draft.groups.map((group, index) => `<fieldset data-q-group class="qualification-group"><legend>Règles du groupe ${index + 1}</legend>
            <div class="qualification-categories" aria-label="Catégories du groupe">${categories.map((category) => {
              const unavailable = !group.categories.includes(category) && draft.groups.some((other, otherIndex) => otherIndex !== index && other.categories.includes(category));
              return `<label title="${unavailable ? "Catégorie déjà affectée à un autre groupe" : ""}"><input type="checkbox" data-q-category value="${category}" ${group.categories.includes(category) ? "checked" : ""} ${unavailable ? "disabled" : ""}><span>${category}</span></label>`;
            }).join("")}</div>
            <div class="qualification-fields">
              <label>Mode<select data-q-mode><option value="each" ${group.mode === "each" ? "selected" : ""}>Minimum sur chaque course</option><option value="one" ${group.mode === "one" ? "selected" : ""}>Au moins une course qualifiée et engagée</option></select></label>
              ${getPeriod ? "<p>La période est celle des temps d’engagement définie ci-dessus, commune à tous les groupes.</p>" : `<label>Début de période<input type="date" data-q-start value="${escape(group.startDate)}"></label><label>Fin de période<input type="date" data-q-end value="${escape(group.endDate)}"></label>`}
            </div>
            <div class="qualification-options">
              <span>Bassins</span>${["25", "50"].map((pool) => `<label><input type="checkbox" data-q-pool value="${pool}" ${group.pools.includes(pool) ? "checked" : ""}><span>${pool} m</span></label>`).join("")}
              <label><input type="checkbox" data-q-electronic ${group.electronicOnly !== false ? "checked" : ""}><span>Chronométrage électronique uniquement</span></label>
              <label data-q-bonus-option ${group.mode !== "one" ? "hidden" : ""}><input type="checkbox" data-q-bonus ${group.mode === "one" && group.bonusRequiresSelectedCompetition ? "checked" : ""} ${group.mode !== "one" ? "disabled" : ""}><span>Course bonus nagée dans une compétition qualificative</span></label>
            </div>
            <label class="qualification-source-mode">Compétitions qualificatives<select data-q-source-mode><option value="all" ${group.competitionMode === "all" ? "selected" : ""}>Toutes les compétitions de la période</option><option value="selected" ${group.competitionMode === "selected" ? "selected" : ""}>Sélection de compétitions</option></select></label>
            <div data-q-source-list ${group.competitionMode === "selected" ? "" : "hidden"}>
              <input type="search" data-q-search aria-label="Rechercher dans les compétitions chargées" placeholder="Rechercher une compétition chargée">
              <p>Liste filtrée sur les informations connues. Les informations inconnues restent à vérifier ; les performances sont toujours contrôlées.</p>
              ${[...new Set([...(group.competitionIds || []), ...sources.map((source) => source.id)])].map((id) => {
                const source = sources.find((item) => item.id === id), selected = (group.competitionIds || []).includes(id), state = sourceState(source, group);
                if (state === "excluded" && !selected) return "";
                return `<label data-q-source-label><input type="checkbox" data-q-source value="${escape(id)}" ${selected ? "checked" : ""}> ${escape(source ? `${source.date || ""} · ${source.name}` : `Compétition sélectionnée (${id})`)} ${state === "unknown" ? "— bassin ou chronométrage à vérifier" : state === "excluded" ? "— hors critères (sélection conservée)" : ""}</label>`;
              }).join("")}
              <button class="qualification-button" type="button" data-q-load ${sourcesStarted && !sourceCursor ? "disabled" : ""}>${sourcesStarted ? "Charger la suite" : "Charger les compétitions"}</button>
            </div>
            <div class="qualification-group-actions"><button class="qualification-button qualification-button--danger" type="button" data-q-remove="${index}">Retirer ce groupe</button></div>
          </fieldset>`).join("")}
          <button class="qualification-button qualification-button--add" type="button" data-q-add>+ Ajouter un groupe de catégories</button>
          <section class="qualification-standards">
            ${national ? `<div class="qualification-import-actions"><a class="qualification-button" href="docs/Trame_minima_LivePalmes.xlsx" download>Télécharger la trame Excel</a><button class="qualification-button" type="button" data-q-import>Importer les minima</button><input data-q-file type="file" accept=".xlsx" hidden></div>` : ""}
            <p ${selectedCategories.length ? "hidden" : ""}>Pour saisir les temps, ajoutez un groupe puis sélectionnez ses catégories ci-dessus. Chaque catégorie fera apparaître une colonne de saisie.</p>
            <div ${selectedCategories.length ? "" : "hidden"}>
            <div class="qualification-standards-head"><div><h3>Minima par course</h3><p>Saisissez 12345 pour obtenir 01:23.45. « Libre » signifie sans minimum.</p></div><button class="qualification-button" type="button" data-q-copy-sex>Copier Femmes vers Hommes</button></div>
            ${["F", "M"].map((sex) => `<div class="qualification-grid-block"><h4>${sex === "F" ? "Femmes" : "Hommes"}</h4><div class="qualification-table-shell"><table class="qualification-grid"><thead><tr><th>Course</th>${selectedCategories.map((category) => `<th>${escape(category)}</th>`).join("")}</tr></thead><tbody>${events.filter((event) => event.type === "individual").map((event) => `<tr><th title="${escape(event.label || event.code)}">${escape(event.shortLabel || event.code)}</th>${selectedCategories.map((category) => {
              if (!event.categories.includes(category)) return `<td class="qualification-cell-blocked" aria-label="${escape(category)} non autorisée">—</td>`;
              const id = [category, sex, event.code].join("|"); const value = draft.standards[id]; const none = value === null;
              return `<td data-q-standard="${escape(id)}" data-q-none="${none}"><input inputmode="decimal" autocomplete="off" aria-label="Minimum ${escape(event.shortLabel || event.code)} ${escape(category)} ${sex}" placeholder="MM:SS.CC" value="${display(value)}" ${none ? "disabled" : ""}><button type="button" data-q-none title="${none ? "Saisir un minimum" : "Définir sans minimum"}" aria-label="${none ? "Saisir un minimum" : "Sans minimum"}">${none ? "Libre" : "×"}</button></td>`;
            }).join("")}</tr>`).join("")}</tbody></table></div></div>`).join("")}
            </div>
          </section>
        </div><p data-q-error role="status"></p>`;
      if (!national) mount.querySelectorAll("input,select,button").forEach((input) => { input.disabled = true; });
    }
    function error(caught) { mount.querySelector("[data-q-error]").textContent = caught.message || String(caught); }
    mount.onchange = async (event) => {
      if (!national) return;
      try {
        if (event.target.matches("[data-q-file]")) {
          const file = event.target.files?.[0]; if (!file) return;
          if (!/\.xlsx$/i.test(file.name) || file.size > 2 * 1024 * 1024) throw new Error("Choisissez un fichier .xlsx de 2 Mo maximum.");
          await loadSpreadsheet();
          const workbook = global.XLSX.read(await file.arrayBuffer(), { type: "array", sheetRows: 201 });
          if (workbook.SheetNames.length !== 1 || workbook.SheetNames[0] !== "Minima") throw new Error("Utilisez la trame à un seul onglet nommé Minima.");
          const sheet = workbook.Sheets.Minima;
          if (Object.entries(sheet).some(([key, cell]) => !key.startsWith("!") && cell.f)) throw new Error("Les formules ne sont pas acceptées. Collez les valeurs des temps.");
          const rows = global.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
          if (rows.length > 200 || rows.some((row) => row.length > 30)) throw new Error("La grille dépasse les dimensions autorisées.");
          capture();
          const result = importRows(rows, events, categories.filter((category) => draft.groups.some((group) => group.categories.includes(category))));
          const dialog = document.createElement("dialog"); dialog.className = "qualification-dialog";
          dialog.innerHTML = `<h3>Prévisualisation de l’import</h3><p>Les cases vides conservent les minima existants. Rien n’est enregistré avant la sauvegarde de la compétition.</p>${result.errors.map((message) => `<p>${escape(message)}</p>`).join("")}<p>${result.ignored.length} case(s) hors programme ou groupes ignorée(s).</p><details><summary>Voir les cases ignorées</summary>${result.ignored.map(escape).join("<br>")}</details><table><thead><tr><th>Catégorie / Sexe / Course</th><th>Actuel</th><th>Importé</th></tr></thead><tbody>${Object.entries(result.values).map(([id, value]) => `<tr><td>${escape(id)}</td><td>${draft.standards[id] === null ? "Libre" : display(draft.standards[id]) || "Vide"}</td><td>${value === null ? "Libre" : display(value)}</td></tr>`).join("")}</tbody></table><button type="button" data-confirm ${result.errors.length ? "disabled" : ""}>Appliquer à la grille</button><button type="button" data-cancel>Annuler</button>`;
          document.body.append(dialog);
          dialog.querySelector("[data-confirm]").onclick = () => { draft.standards = { ...draft.standards, ...result.values }; onDirty(); render(); dialog.close(); };
          dialog.querySelector("[data-cancel]").onclick = () => dialog.close();
          dialog.addEventListener("close", () => dialog.remove(), { once: true }); dialog.showModal();
          event.target.value = ""; return;
        }
        const cell = event.target.closest("[data-q-standard]");
        if (cell && event.target.matches("input") && event.target.value.trim()) event.target.value = display(parse(event.target.value));
        capture(); onDirty();
        if (event.target.matches("[data-q-start],[data-q-end]")) { sources = []; sourceCursor = ""; sourcesStarted = false; render(); }
        if (event.target.matches("[data-q-enabled],[data-q-category],[data-q-source-mode],[data-q-mode],[data-q-pool],[data-q-electronic]")) render();
      } catch (caught) { error(caught); }
    };
    mount.oninput = (event) => {
      if (event.target.matches("[data-q-search]")) {
        const search = event.target.value.toLocaleLowerCase("fr");
        event.target.parentElement.querySelectorAll("[data-q-source-label]").forEach((label) => { label.hidden = !label.textContent.toLocaleLowerCase("fr").includes(search); });
      } else onDirty();
    };
    mount.onclick = async (event) => {
      if (!national) return;
      const button = event.target.closest("button"); if (!button) return;
      try {
        capture();
        if (button.matches("[data-q-import]")) { mount.querySelector("[data-q-file]").click(); return; }
        if (button.matches("[data-q-add]")) {
          const year = Number(competitionDate.slice(0, 4)) || new Date().getFullYear();
          const used = new Set(draft.groups.flatMap((group) => group.categories));
          draft.groups.push({ categories: categories.filter((category) => !used.has(category)), mode: "each", startDate: `${year - 1}-09-01`, endDate: competitionDate, pools: ["25", "50"], electronicOnly: true, competitionMode: "all", competitionIds: [], bonusRequiresSelectedCompetition: true });
        }
        if (button.matches("[data-q-remove]")) draft.groups.splice(Number(button.dataset.qRemove), 1);
        if (button.matches("[data-q-none]")) {
          const cell = button.closest("[data-q-standard]");
          cell.dataset.qNone = cell.dataset.qNone === "true" ? "false" : "true";
          if (cell.dataset.qNone === "true") cell.querySelector("input").value = "";
          capture(); onDirty(); render(); return;
        }
        if (button.matches("[data-q-copy-sex]")) {
          const selectedCategories = [...new Set(draft.groups.flatMap((group) => group.categories))];
          for (const category of selectedCategories) for (const event of events.filter((item) => item.type === "individual" && item.categories.includes(category))) {
            const source = draft.standards[[category, "F", event.code].join("|")];
            if (source === undefined) delete draft.standards[[category, "M", event.code].join("|")];
            else draft.standards[[category, "M", event.code].join("|")] = source;
          }
          onDirty(); render(); return;
        }
        if (button.matches("[data-q-load]")) {
          button.disabled = true;
          const result = await loadSources(sourceCursor, { startDate: draft.groups.map((group) => group.startDate).sort()[0], endDate: draft.groups.map((group) => group.endDate).sort().at(-1) });
          sources.push(...result.sources); sourceCursor = result.cursor || ""; sourcesStarted = true;
        } else onDirty();
        render();
      } catch (caught) { error(caught); button.disabled = false; }
    };
    render();
    return { read: () => national ? structuredClone(capture()) : structuredClone(rules), refreshPeriod: () => { capture(); sources = []; sourceCursor = ""; sourcesStarted = false; render(); } };
  }
  global.LivePalmesEngagementQualifications = { editor, display, parse, importRows, sourceState };
})(window);
