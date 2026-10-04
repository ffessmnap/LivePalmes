const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function extract(file, names, context = {}) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const code = names.map((name) => {
    const match = source.match(new RegExp(`(^[ \\t]*)function ${name}\\([^]*?^\\1\\}`, "m"));
    assert.ok(match, name);
    return match[0];
  }).join("\n");
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

function progressElement() {
  const classes = new Set();
  return {
    innerHTML: "",
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); }
    }
  };
}

const rows = [
  { id: "2025-25", seasonYear: 2025, course: "200BI", pool: "25", timeValue: 1000, time: "10.00", date: "2025-01-10", location: "A" },
  { id: "2025-50", seasonYear: 2025, course: "200BI", pool: "50", timeValue: 900, time: "09.00", date: "2025-02-10", location: "B" },
  { id: "2026-25", seasonYear: 2026, course: "200BI", pool: "25", timeValue: 800, time: "08.00", date: "2026-01-10", location: "C" },
  { id: "2026-50", seasonYear: 2026, course: "200BI", pool: "50", timeValue: 850, time: "08.50", date: "2026-02-10", location: "D" },
  { id: "other-course", seasonYear: 2026, course: "100BI", pool: "25", timeValue: 700, time: "07.00", date: "2026-03-10", location: "E" }
];

let activePool = "";
const progress = progressElement();
const context = extract(
  "performances/public/swimmer.js",
  ["performancePool", "filteredPerfs", "renderProgress"],
  {
    selectedPerfs: rows,
    currentFilters: () => ({ season: "", course: "200BI", pool: activePool, mode: "best" }),
    elements: { progress },
    courseShortLabel: (course) => course,
    escapeHtml: (value) => String(value ?? ""),
    formatTimeDelta: (value) => String(value),
    progressPointAttributes: (_point, index) => `data-progress-point="${index}"`,
    formatDate: (value) => value
  }
);

function renderForPool(pool) {
  activePool = pool;
  context.renderProgress();
  return progress.innerHTML;
}

const allPoolsHtml = renderForPool("");
assert.equal(progress.classList.contains("active"), true);
assert.match(allPoolsHtml, /Meilleure performance par saison · Tous bassins/);
assert.match(allPoolsHtml, />09\.00</);
assert.match(allPoolsHtml, />08\.00</);
assert.doesNotMatch(allPoolsHtml, />10\.00</);
assert.doesNotMatch(allPoolsHtml, />08\.50</);

const pool25Html = renderForPool("25");
assert.match(pool25Html, /Meilleure performance par saison · Bassin 25 m/);
assert.match(pool25Html, />10\.00</);
assert.match(pool25Html, />08\.00</);
assert.doesNotMatch(pool25Html, />09\.00</);
assert.doesNotMatch(pool25Html, />08\.50</);
assert.notEqual(pool25Html, allPoolsHtml, "Le changement de bassin doit recalculer la courbe");

const pool50Html = renderForPool("50");
assert.match(pool50Html, /Meilleure performance par saison · Bassin 50 m/);
assert.match(pool50Html, />09\.00</);
assert.match(pool50Html, />08\.50</);
assert.doesNotMatch(pool50Html, />10\.00</);
assert.doesNotMatch(pool50Html, />08\.00</);
assert.notEqual(pool50Html, pool25Html, "Le changement 25 m / 50 m doit recalculer la courbe");

const listFiltered = context.filteredPerfs(rows, { season: "2025", course: "200BI", pool: "25" });
assert.deepEqual(Array.from(listFiltered, (row) => row.id), ["2025-25"], "Les filtres existants de la liste restent inchangés");

context.selectedPerfs = rows.filter((row) => row.id !== "2026-25");
activePool = "25";
context.renderProgress();
assert.equal(progress.classList.contains("active"), false, "Une seule saison après filtrage ne doit pas afficher de courbe");
assert.equal(progress.innerHTML, "");

const source = fs.readFileSync(path.join(root, "performances/public/swimmer.js"), "utf8");
assert.match(
  source,
  /elements\.pool\.querySelectorAll\("\.segment"\)[\s\S]*?setSegmentValue\(elements\.pool, button\.dataset\.value\);[\s\S]*?render\(\);/,
  "Le clic sur le filtre bassin doit continuer à relancer immédiatement le rendu"
);

console.log("Fiche nageur : progression filtrée par bassin et recalcul immédiat OK");
