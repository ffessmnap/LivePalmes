(function (global) {
  "use strict";
  const { courses, categories } = global.LivePalmesPerformanceReference;
  const region = document.getElementById("regionFilter");
  const category = document.getElementById("categoryFilter");
  const buttons = document.querySelectorAll("#sexFilter button");
  const status = document.getElementById("recordsLoadStatus");
  const results = document.getElementById("results");
  const body = document.getElementById("recordsBody");
  const retry = document.getElementById("retry");
  let sex = "F";
  let controller;
  let regionsReady = false;

  async function fetchNap(params, signal) {
    const url = new URL(global.LivePalmesEnvironment.napReaderUrl);
    url.search = new URLSearchParams(params);
    const response = await fetch(url, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("Lecture NAP indisponible.");
    const data = await response.json();
    if (data.source !== "nap") throw new Error("Source NAP indisponible.");
    return data;
  }

  function setSex(value) {
    sex = value;
    for (const button of buttons) {
      const active = button.dataset.value === sex;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    const previous = category.value;
    category.replaceChildren(new Option("Toutes catégories", ""));
    for (const item of categories.filter(item => item.sex === sex)) category.add(new Option(item.label, item.code));
    category.value = Array.from(category.options).some(item => item.value === previous) ? previous : "";
    document.getElementById("swimmerHeader").textContent = sex === "F" ? "Nageuse" : "Nageur";
  }

  function showRows(rows, filters) {
    const fragment = document.createDocumentFragment();
    for (const course of courses) {
      for (const row of rows.filter(item => item.course === course.code)) {
        const line = document.createElement("tr");
        line.className = sex === "F" ? "sex-f" : "sex-m";
        const link = document.createElement("a");
        link.href = "tops.html?" + new URLSearchParams({ ...filters, course: course.code });
        link.textContent = course.shortLabel;
        link.setAttribute("aria-label", "Consulter le TOP · " + course.label);
        const swimmerLabel = sex === "F" ? "Nageuse" : "Nageur";
        const date = String(row.date || "").replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, "$3/$2/$1");
        for (const [label, value] of [["Course", link], ["Temps", row.time], [swimmerLabel, row.swimmer],
          ["Club", row.club], ["Bassin", row.pool ? row.pool + " m" : ""], ["Date", date]]) {
          const cell = line.insertCell();
          cell.dataset.label = label;
          cell.append(value || "—");
        }
        fragment.append(line);
      }
    }
    body.replaceChildren(fragment);
    document.getElementById("regionalTitle").textContent = [region.selectedOptions[0].text,
      sex === "F" ? "Femmes" : "Hommes", category.selectedOptions[0].text].join(" · ");
    results.hidden = !rows.length;
    status.textContent = rows.length ? "" : "Aucune performance pour cette sélection.";
  }

  async function refresh() {
    controller?.abort();
    const request = new AbortController();
    controller = request;
    const timeout = setTimeout(() => request.abort(), 30000);
    retry.hidden = true;
    results.hidden = true;
    body.replaceChildren();
    try {
      if (!regionsReady) {
        status.textContent = "Chargement des régions…";
        const data = await fetchNap({ action: "top-metadata" }, request.signal);
        if (controller !== request) return;
        for (const option of global.LivePalmesTopRegions(data.regions)) region.add(new Option(option.label, option.value));
        regionsReady = true;
      }
      if (!region.value) {
        status.textContent = region.options.length > 1 ? "Choisissez une région pour afficher ses records." : "Aucune région disponible.";
        return;
      }
      const filters = { region: region.value, sex };
      if (category.value) filters.category = category.value;
      status.textContent = "Chargement des records régionaux…";
      const data = await fetchNap({ action: "top", view: "regional-records", ...filters }, request.signal);
      if (controller === request) showRows(data.rows, filters);
    } catch {
      if (controller !== request) return;
      status.textContent = regionsReady ? "Les records régionaux sont indisponibles." : "La liste des régions est indisponible.";
      retry.hidden = false;
    } finally {
      clearTimeout(timeout);
    }
  }

  for (const button of buttons) button.addEventListener("click", () => {
    if (button.dataset.value !== sex) { setSex(button.dataset.value); refresh(); }
  });
  region.addEventListener("change", refresh);
  category.addEventListener("change", refresh);
  retry.addEventListener("click", refresh);
  setSex(sex);
  refresh();
})(window);
