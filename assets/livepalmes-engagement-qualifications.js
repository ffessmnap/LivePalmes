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

  function editor(mount, { rules = {}, events = [], national = false, competitionDate = "", onDirty = () => {}, loadSources }) {
    let draft = structuredClone({ enabled: false, groups: [], standards: {}, ...rules });
    let sources = [], sourceCursor = "", sourcesStarted = false;
    function capture() {
      draft.enabled = mount.querySelector("[data-q-enabled]")?.checked === true;
      draft.groups = [...mount.querySelectorAll("[data-q-group]")].map((row) => ({
        categories: [...row.querySelectorAll("[data-q-category]:checked")].map((input) => input.value),
        mode: row.querySelector("[data-q-mode]").value,
        startDate: row.querySelector("[data-q-start]").value, endDate: row.querySelector("[data-q-end]").value,
        pools: [...row.querySelectorAll("[data-q-pool]:checked")].map((input) => input.value),
        electronicOnly: row.querySelector("[data-q-electronic]").checked,
        competitionMode: row.querySelector("[data-q-source-mode]").value,
        competitionIds: [...row.querySelectorAll("[data-q-source]:checked")].map((input) => input.value),
        bonusRequiresSelectedCompetition: row.querySelector("[data-q-bonus]").checked
      }));
      const standards = { ...draft.standards };
      for (const cell of mount.querySelectorAll("[data-q-standard]")) {
        const id = cell.dataset.qStandard;
        const value = cell.querySelector("select").value === "none" ? null : parse(cell.querySelector("input").value);
        if (value === undefined) delete standards[id]; else standards[id] = value;
      }
      draft.standards = standards;
      return draft;
    }
    function render() {
      const selectedCategories = [...new Set(draft.groups.flatMap((group) => group.categories))];
      mount.innerHTML = `<legend>Qualifications</legend>
        <label><input type="checkbox" data-q-enabled ${draft.enabled ? "checked" : ""}> Appliquer une grille de qualification</label>
        <div data-q-content ${draft.enabled ? "" : "hidden"}>
          <p>Une même grille pour les bassins de 25 et 50 m. Les catégories sont celles de la saison de cette compétition.</p>
          ${draft.groups.map((group, index) => `<fieldset data-q-group class="qualification-group"><legend>Groupe ${index + 1}</legend>
            <div class="qualification-categories">${categories.map((category) => `<label><input type="checkbox" data-q-category value="${category}" ${group.categories.includes(category) ? "checked" : ""}> ${category}</label>`).join("")}</div>
            <div class="qualification-fields">
              <label>Mode<select data-q-mode><option value="each" ${group.mode === "each" ? "selected" : ""}>Minimum sur chaque course</option><option value="one" ${group.mode === "one" ? "selected" : ""}>Au moins une course qualifiée et engagée</option></select></label>
              <label>Début de période<input type="date" data-q-start value="${escape(group.startDate)}"></label>
              <label>Fin de période<input type="date" data-q-end value="${escape(group.endDate)}"></label>
            </div>
            <div class="qualification-categories">Bassins ${["25", "50"].map((pool) => `<label><input type="checkbox" data-q-pool value="${pool}" ${group.pools.includes(pool) ? "checked" : ""}> ${pool} m</label>`).join("")}</div>
            <label><input type="checkbox" data-q-electronic ${group.electronicOnly !== false ? "checked" : ""}> Chronométrage électronique uniquement</label>
            <label>Compétitions qualificatives<select data-q-source-mode><option value="all" ${group.competitionMode === "all" ? "selected" : ""}>Toutes les compétitions de la période</option><option value="selected" ${group.competitionMode === "selected" ? "selected" : ""}>Sélection de compétitions</option></select></label>
            <div data-q-source-list ${group.competitionMode === "selected" ? "" : "hidden"}>
              <input type="search" data-q-search aria-label="Rechercher dans les compétitions chargées" placeholder="Rechercher une compétition chargée">
              ${[...new Set([...(group.competitionIds || []), ...sources.map((source) => source.id)])].map((id) => { const source = sources.find((item) => item.id === id); return `<label data-q-source-label><input type="checkbox" data-q-source value="${escape(id)}" ${(group.competitionIds || []).includes(id) ? "checked" : ""}> ${escape(source ? `${source.date || ""} · ${source.name}` : `Compétition sélectionnée (${id})`)}</label>`; }).join("")}
              <button type="button" data-q-load ${sourcesStarted && !sourceCursor ? "disabled" : ""}>${sourcesStarted ? "Charger la suite" : "Charger les compétitions"}</button>
            </div>
            <label><input type="checkbox" data-q-bonus ${group.bonusRequiresSelectedCompetition ? "checked" : ""}> Exiger aussi une compétition qualificative pour les courses bonus</label>
            <button class="ghost-button" type="button" data-q-remove="${index}">Retirer ce groupe</button>
          </fieldset>`).join("")}
          <button class="ghost-button" type="button" data-q-add>Ajouter un groupe de catégories</button>
          <p>Renseignez chaque case ou choisissez explicitement « Sans minimum ». Une case vide empêchera l’ouverture des engagements.</p>
          ${selectedCategories.map((category) => `<details open><summary>${escape(category)}</summary><div class="qualification-table-shell"><table><thead><tr><th>Course</th><th>Femmes</th><th>Hommes</th></tr></thead><tbody>${events.filter((event) => event.type === "individual" && event.categories.includes(category)).map((event) => `<tr><th>${escape(event.shortLabel || event.code)}</th>${["F", "M"].map((sex) => {
            const id = [category, sex, event.code].join("|"); const value = draft.standards[id];
            return `<td data-q-standard="${escape(id)}"><select aria-label="Règle ${escape(id)}"><option value="time">Minimum</option><option value="none" ${value === null ? "selected" : ""}>Sans minimum</option></select><input inputmode="decimal" aria-label="Temps ${escape(id)}" placeholder="MM:SS.CC" value="${display(value)}" ${value === null ? "disabled" : ""}></td>`;
          }).join("")}</tr>`).join("")}</tbody></table></div></details>`).join("")}
        </div><p data-q-error role="status"></p>`;
      if (!national) mount.querySelectorAll("input,select,button").forEach((input) => { input.disabled = true; });
    }
    function error(caught) { mount.querySelector("[data-q-error]").textContent = caught.message || String(caught); }
    mount.onchange = (event) => {
      if (!national) return;
      try {
        const cell = event.target.closest("[data-q-standard]");
        if (cell) cell.querySelector("input").disabled = cell.querySelector("select").value === "none";
        capture(); onDirty();
        if (event.target.matches("[data-q-start],[data-q-end]")) { sources = []; sourceCursor = ""; sourcesStarted = false; render(); }
        if (event.target.matches("[data-q-enabled],[data-q-category],[data-q-source-mode]")) render();
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
        if (button.matches("[data-q-add]")) {
          const year = Number(competitionDate.slice(0, 4)) || new Date().getFullYear();
          const used = new Set(draft.groups.flatMap((group) => group.categories));
          draft.groups.push({ categories: categories.filter((category) => !used.has(category)), mode: "each", startDate: `${year - 1}-09-01`, endDate: competitionDate, pools: ["25", "50"], electronicOnly: true, competitionMode: "all", competitionIds: [], bonusRequiresSelectedCompetition: true });
        }
        if (button.matches("[data-q-remove]")) draft.groups.splice(Number(button.dataset.qRemove), 1);
        if (button.matches("[data-q-load]")) {
          button.disabled = true;
          const result = await loadSources(sourceCursor, { startDate: draft.groups.map((group) => group.startDate).sort()[0], endDate: draft.groups.map((group) => group.endDate).sort().at(-1) });
          sources.push(...result.sources); sourceCursor = result.cursor || ""; sourcesStarted = true;
        } else onDirty();
        render();
      } catch (caught) { error(caught); button.disabled = false; }
    };
    render();
    return { read: () => national ? structuredClone(capture()) : structuredClone(rules) };
  }
  global.LivePalmesEngagementQualifications = { editor, display, parse };
})(window);
