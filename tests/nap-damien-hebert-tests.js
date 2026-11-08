"use strict";

const assert = require("node:assert/strict");
const { gzipSync } = require("node:zlib");
const { bestTrophyCourses, rankTrophyCategory } = require("../functions/nap-damien-hebert-ranking");
const { buildEdition, createPublicReader } = require("../functions/nap-damien-hebert-edition");
const { readTrophyResults } = require("../functions/nap-damien-hebert-results");

async function testQualificationQueries(edition) {
  const queries = [];
  await readTrophyResults({ execute(query, values) {
    queries.push({ ...query, values });
    return [queries.length === 1 ? [{ id: 5206 }] : []];
  } }, edition);
  assert.equal(queries.length, 2, "Deux lectures groupées, y compris pour une départementale");
  const [competitions, performances] = queries;
  const levelList = competitions.sql.match(/cp\.niveau IN \(([\d, ]+)\)/);
  assert.ok(levelList, "Niveaux explicitement autorisés, sans valeur par défaut");
  const levels = levelList[1].split(",").map(Number);
  assert.deepEqual(levels, [0, 1, 2, 3, 4, 5, 6, 7]);
  for (const unknown of [null, undefined, -1, 8, 99]) assert.ok(!levels.includes(unknown));
  assert.doesNotMatch(competitions.sql, /COALESCE\(cp\.niveau|cp\.niveau IS NULL/);
  assert.match(competitions.sql, /cp\.compet = c\.id/);
  assert.match(competitions.sql, /FORCE INDEX \(livepalmes_date_id\)/);
  assert.match(competitions.sql, /c\.date >= \? AND c\.date < DATE_ADD\(\?, INTERVAL 1 DAY\)/);
  assert.match(competitions.sql, /COALESCE\(c\.ld, 0\) = 0/);
  assert.match(competitions.sql, /NOT EXISTS \(SELECT 1 FROM livepalmes_competition_options co WHERE co\.competition_id = c\.id AND co\.canceled = 1\)/);
  assert.match(competitions.sql, /ORDER BY c\.date, c\.id LIMIT 501/);
  assert.deepEqual(competitions.values, [edition.from, edition.through]);
  assert.match(performances.sql, /FORCE INDEX \(livepalmes_compet_id\)/);
  assert.match(performances.sql, /p\.compet IN \(\?\) AND p\.course IN \(\?,\?,\?,\?,\?\)/);
  assert.match(performances.sql, /p\.relais = 0 AND p\.passage = 0 AND TRIM\(p\.tps\) <> '595999' AND YEAR\(n\.date\) IN \(\?, \?\)/);
  assert.match(performances.sql, /TRIM\(n\.sexe\) IN \('F', 'M'\)/);
  assert.match(performances.sql, /NOT EXISTS \(SELECT 1 FROM livepalmes_performance_visibility lpv FORCE INDEX \(PRIMARY\) WHERE lpv\.performance_id=p\.id AND lpv\.hidden=1\)/);
  assert.match(performances.sql, /ORDER BY p\.compet, p\.id LIMIT 25001/);
  assert.deepEqual(performances.values, [5206, "50SF", "50BI", "100IS", "400SF", "800SF", 2015, 2014]);
  assert.ok(queries.every(query => query.timeout === 10000));

  let reads = 0;
  assert.deepEqual(await readTrophyResults({ execute() { reads++; return [[]]; } }, edition), []);
  assert.equal(reads, 1, "Aucune performance lue si aucune compétition n'est éligible");
  reads = 0;
  await assert.rejects(readTrophyResults({ execute() {
    reads++;
    return [Array.from({ length: 501 }, (_, id) => ({ id: id + 1 }))];
  } }, edition), RangeError);
  assert.equal(reads, 1, "Dépassement du plafond : aucun recalcul ou repli large");
  reads = 0;
  await assert.rejects(readTrophyResults({ execute() {
    reads++;
    return [reads === 1 ? [{ id: 5206 }] : Array(25001).fill({})];
  } }, edition), RangeError);
  assert.equal(reads, 2);
}

async function main() {
  const edition = { title: "Amnéville", seasonEndYear: 2027, from: "2026-09-01", through: "2027-05-16" };
  await testQualificationQueries(edition);
  const result = { swimmerId: 1, course: "50SF", lastName: "Démo", firstName: "Camille",
    birthYear: 2014, sex: "F", club: "DEMO" };
  const rows = [
    { ...result, time: "002500", points: 900 },
    { ...result, time: "002400", points: 850 },
    { ...result, time: "006000", points: 999 }
  ];
  const calls = [];
  const pool = { execute(_query, params) {
    calls.push(params);
    return [calls.length === 1 ? [{ id: 5206 }] : rows];
  } };
  assert.equal(bestTrophyCourses(rows).get(1).get("50SF").points, 850);
  const data = await buildEdition(pool, edition);
  assert.deepEqual(calls[0], ["2026-09-01", "2027-05-16"]);
  assert.deepEqual(calls[1], [5206, "50SF", "50BI", "100IS", "400SF", "800SF", 2015, 2014]);
  assert.deepEqual(data.groups.F[0].events, [{ time: "24.00", points: 850 }, null, null, null, null]);
  assert.equal(data.groups.F[0].totalPoints, 850);
  assert.equal(data.groups.M.length, 0);
  const swimmers = Array.from({ length: 35 }, (_, index) => ({
    swimmerId: index + 1, totalPoints: index === 32 ? 69 : 100 - index, complete: true
  }));
  const ranked = rankTrophyCategory(swimmers.reverse());
  assert.equal(ranked.length, 35);
  assert.deepEqual(ranked.slice(31).map(row => row.rank), [32, 32, 34, 35]);
  assert.equal(rankTrophyCategory([...swimmers, { swimmerId: 90, totalPoints: 2000, complete: false }]).at(-1).rank, 36);
  let configReads = 0;
  const db = { collection: () => ({ doc: () => ({ get() {
    configReads += 1;
    return { data: () => ({ published: { edition, frozenGzip: gzipSync(JSON.stringify({ ...data, final: true })) } }) };
  } }) }) };
  const read = createPublicReader(db, { execute() { assert.fail("Édition arrêtée : aucune lecture NAP"); } });
  const concurrent = await Promise.all([read(), read()]);
  assert.equal(concurrent[0].final, true);
  assert.equal(concurrent[0], concurrent[1]);
  assert.equal(configReads, 1);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
