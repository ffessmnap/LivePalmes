"use strict";

const assert = require("node:assert/strict");
const { bestTrophyCourses, rankTrophyCategory } = require("../functions/nap-damien-hebert-ranking");
const { buildEdition, createPublicReader } = require("../functions/nap-damien-hebert-edition");

async function main() {
  const edition = { title: "Amnéville", seasonEndYear: 2027, from: "2026-09-01", through: "2027-05-16" };
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
    return [calls.length === 1 ? [{ id: 12 }] : rows];
  } };
  assert.equal(bestTrophyCourses(rows).get(1).get("50SF").points, 850);
  const data = await buildEdition(pool, edition);
  assert.deepEqual(calls[0], ["2026-09-01", "2027-05-16"]);
  assert.deepEqual(calls[1], [12, "50SF", "50BI", "100IS", "400SF", "800SF", 2015, 2014]);
  assert.deepEqual(data.groups.F[0].events, [{ time: "24.00", points: 850 }, null, null, null, null]);
  assert.equal(data.groups.F[0].totalPoints, 850);
  assert.equal(data.groups.M.length, 0);
  const swimmers = Array.from({ length: 35 }, (_, index) => ({
    swimmerId: index + 1, totalPoints: index === 32 ? 69 : 100 - index, complete: true
  }));
  const ranked = rankTrophyCategory(swimmers.reverse());
  assert.equal(ranked.length, 33);
  assert.deepEqual(ranked.slice(-2).map(row => row.rank), [32, 32]);
  assert.equal(rankTrophyCategory([...swimmers, { swimmerId: 90, totalPoints: 2000, complete: false }]).length, 33);
  let configReads = 0;
  const db = { collection: () => ({ doc: () => ({ get() {
    configReads += 1;
    return { data: () => ({ published: { edition, frozen: { ...data, final: true } } }) };
  } }) }) };
  const read = createPublicReader(db, { execute() { assert.fail("Édition arrêtée : aucune lecture NAP"); } });
  const concurrent = await Promise.all([read(), read()]);
  assert.equal(concurrent[0].final, true);
  assert.equal(concurrent[0], concurrent[1]);
  assert.equal(configReads, 1);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
