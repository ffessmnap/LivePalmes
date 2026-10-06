"use strict";
const assert = require("node:assert/strict");
const calendar = require("../functions/nap-direct-calendar");
const { readCompetitionResults } = require("../functions/nap-direct-competition-results");
(async () => {
  assert.throws(() => calendar.positiveId("2 OR 1=1"), TypeError);
  assert.equal(calendar.positiveId("legacy-nap-2652"), 2652);
  assert.equal(calendar.publicUrl("javascript:alert(1)"), "");
  assert.equal(calendar.publicUrl("https://user:pass@example.com/a.pdf"), "");
  assert.equal(calendar.publicUrl("ged/2026/a b.pdf"), "https://nap.ffessm.fr/ged/2026/a%20b.pdf");
  const raw = { id: 2, libelle: "Compétition", date: "2004-02-29", lieu: "Verdun", bassin: 0, chrono: "E", ld: 0, type_label: "Piscine", level_label: "Championnat de Zones", has_results: 1 };
  const mapped = calendar.eventFromRow(raw);
  assert.equal(mapped.poolLength, ""); assert.equal(mapped.level, "regional"); assert.equal(mapped.timingType, "electronic");
  let queries = [];
  const pool = { execute: async (query, values) => {
    queries.push({ query, values });
    return [query.sql.includes("FROM competitions c") ? [raw] : query.sql.includes("FROM documents d") ? [{ id: 1, name: "Protocole", location: "ged/p.pdf", type_label: "Résultats" }] : []];
  } };
  const detail = await calendar.readCompetition(pool, "legacy-nap-2");
  assert.equal(detail.event.results.pdfUrl, "https://nap.ffessm.fr/ged/p.pdf");
  assert.equal(queries.length, 3);
  assert.ok(queries[1].query.sql.includes("d.public='Y'"));
  assert.ok(queries[1].query.sql.includes("FORCE INDEX (livepalmes_compet_public_id)"));
  assert.deepEqual(queries.map(item => item.values), [[2], [2], [2]]);
  await assert.rejects(calendar.readCalendarSeason({ execute: async () => [Array(501).fill(raw)] }, 2026), RangeError);
  queries = [];
  const performance = { id: 973, nageur: 168, nom: "Exemple", prenom: "Nageur", birth_date: "1980-01-01", sexe: "M", competition_id: 2, libelle: "Compétition", date: "2004-02-29", bassin: 50, chrono: "E", ld: 0, course: "100SF", cat: "HSE", tps: "14200", passage: 0, relais: 0 };
  const resultPool = { execute: async (query, values) => {
    queries.push({ query, values });
    return [query.sql.includes("COUNT(*)") ? [{ count: 2 }] : query.sql.includes("WHERE p.compet=?") ? [performance] : [performance, { ...performance, id: 974, tps: "014200" }]];
  } };
  const result = await readCompetitionResults(resultPool, 2);
  assert.equal(result.groups[0].performances[0].time, "1:42.00");
  assert.equal(result.groups[0].performances[0].personalBest, true);
  assert.equal(queries.length, 3);
  assert.deepEqual(queries[1].values, [168]);
  const changed = { execute: async (query, values) => {
    const [rows] = await resultPool.execute(query, values);
    return [query.sql.includes("WHERE p.nageur IN") ? rows.map(row => ({ ...row, tps: "013000" })) : rows];
  } };
  assert.equal((await readCompetitionResults(changed, 2)).groups[0].performances[0].personalBest, false);
  await assert.rejects(readCompetitionResults({ execute: async () => [Array(5001).fill(performance)] }, 2), RangeError);
  const vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
  const requests = [];
  let revision = 1, available = true;
  const browser = { window: { LivePalmesEnvironment: { isTest: true, publicStorageUrl: () => "https://old-data.invalid/calendar" }, location: { hostname: "livepalmes-test.web.app" } }, URL,
    fetch: async (url, options) => { requests.push({ url: String(url), options }); return { ok: available, json: async () => ({ source: "nap", event: { id: "legacy-nap-2", name: `Revision ${revision}` } }) }; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../assets/public/livepalmes-public-calendar.js"), "utf8"), browser);
  assert.equal((await browser.window.LivePalmesPublicCalendar.json("events/legacy-nap-2.json")).name, "Revision 1");
  revision = 2;
  assert.equal((await browser.window.LivePalmesPublicCalendar.json("events/legacy-nap-2.json")).name, "Revision 2");
  available = false;
  await assert.rejects(browser.window.LivePalmesPublicCalendar.json("events/legacy-nap-2.json"), /indisponible/);
  assert.ok(requests.every(request => !request.url.includes("old-data") && request.options.cache === "no-store"));
  console.log("Calendrier NAP : index, documents publics, budgets, temps bruts et PB frais verifies.");
})().catch(error => { console.error(error); process.exitCode = 1; });
