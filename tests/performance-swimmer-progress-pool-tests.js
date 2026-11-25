const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const {performancePool, filteredPerfs} = extract("performances/public/swimmer.js", ["performancePool","filteredPerfs"]);
const {careerGroups} = require("../performances/public/swimmer-explorer").LivePalmesSwimmerExplorer;
const careerHistory = [
  {course:"100SF",category:"J",seasonYear:2022,timeValue:4300,pool:"50"},
  {course:"100SF",category:"J",seasonYear:2022,timeValue:4100,pool:"25"},
  {course:"100SF",category:"J",seasonYear:2022,timeValue:3900,pool:"50",isIntermediate:true},
  {course:"200SF",category:"J",seasonYear:2024,timeValue:8300,pool:"50"},
  {course:"100SF",category:"S",seasonYear:2025,timeValue:4000,pool:"50"}
];
const groups = careerGroups(careerHistory,"100SF","",performancePool);
assert.deepEqual(groups.map(g=>[g.cat,g.pool,g.best.timeValue,g.years]),[
  ["J","25",4100,[2022,2024]],["J","50",4300,[2022,2024]],["S","50",4000,[2025]]
]);
const filters={season:"range",from:2022,to:2024,course:"100SF",pool:"50",excludeSplits:true};
assert.deepEqual(filteredPerfs(careerHistory,filters),[careerHistory[0]]);
assert.deepEqual(filteredPerfs(careerHistory,{...filters,excludeSplits:false}),[careerHistory[0],careerHistory[2]]);
assert.deepEqual(filteredPerfs(careerHistory,{...filters,season:"2025"}),[careerHistory[4]]);
assert.equal(performancePool({bassin:"Bassin 33 m"}),"33");

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


const source = fs.readFileSync(path.join(root, "performances/public/swimmer.js"), "utf8");
assert.match(
  source,
  /elements\.pool\.querySelectorAll\("\.segment"\)[\s\S]*?setSegmentValue\(elements\.pool, button\.dataset\.value\);[\s\S]*?render\(\);/,
  "Le clic sur le filtre bassin doit continuer à relancer immédiatement le rendu"
);


const personal = extract("performances/public/swimmer.js", [
  "validRecordDate", "performancePool", "personalBestsByPerformance", "personalBestDetail"
], { escapeHtml: (value) => String(value) });
function swim(date, timeValue, time, pool = "50", course = "100SF") {
  return { date, seasonYear: Number(date.slice(0, 4)) + (date.slice(5, 7) >= "09" ? 1 : 0), course, pool, time, timeValue };
}
const initial = swim("2026-02-10", 3908, "39.08");
const equal = swim("2026-09-12", 3908, "39.08");
const recent = swim("2026-10-12", 3862, "38.62");
const equalAfter = swim("2026-11-12", 3862, "38.62");
const first200 = swim("2026-10-12", 8640, "1:26.40", "50", "200SF");
const shortPool = swim("2026-03-10", 3800, "38.00", "25");
const history = [equalAfter, recent, first200, initial, shortPool, equal];
const in50 = personal.personalBestsByPerformance(history, "50", 2027);
assert.equal(in50.get(recent).previous, initial);
assert.equal(in50.has(equal), false);
assert.equal(in50.has(equalAfter), false);
assert.equal(in50.get(first200).first, true);
assert.match(personal.personalBestDetail(in50.get(first200), first200), /^<p[^>]+>Premier chrono enregistré sur cette épreuve\.<\/p>$/);
assert.match(personal.personalBestDetail(in50.get(recent), recent), /Ancien record : 39\.08.*gain de 0,46 s/);
assert.equal(personal.personalBestsByPerformance(history, "", 2027).has(recent), false);
assert.equal(personal.personalBestsByPerformance(history, "50", 2028).has(recent), false);
const sameDay = swim(recent.date, 3890, "38.90");
const ambiguous = personal.personalBestsByPerformance([recent, initial, sameDay], "", 2027);
assert.equal(ambiguous.get(recent).previous, null);
assert.equal(ambiguous.has(sameDay), false);
assert.doesNotMatch(personal.personalBestDetail(ambiguous.get(recent), recent), /gain|Ancien/);
assert.equal(personal.personalBestsByPerformance([recent, { ...recent }, initial], "", 2027).has(recent), false);
assert.equal(personal.personalBestsByPerformance([recent, sameDay], "", 2027).size, 0);
assert.equal(personal.personalBestsByPerformance([recent, { ...initial, date: "" }], "", 2027).size, 0);

console.log("Fiche nageur : progression filtrée par bassin et recalcul immédiat OK");
