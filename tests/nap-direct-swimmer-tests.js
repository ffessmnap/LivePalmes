"use strict";
const assert = require("node:assert/strict");
const { swimmerId, readDirectSwimmer } = require("../functions/nap-direct-swimmer");
const person = { id: 1, nom: "TEST", prenom: "Paul", date: "2000-01-01", sexe: "M", club: "10" };
const perf = { id: 0, course: "50SF", cat: "HSE", tps: "002000", competition_id: 1, date: "2025-05-01", bassin: 50, chrono: "E", ld: 0, relais: 0 };
(async () => {
  assert.throws(() => swimmerId("1 OR 1"), TypeError);
  const queries = [];
  let time = perf.tps;
  const pool = { execute: async (query, parameters) => {
    queries.push({ query, parameters });
    return [query.sql.startsWith("SELECT n.") ? [person] : [{ ...perf, tps: time }]];
  } };
  const first = await readDirectSwimmer(pool, 1);
  assert.equal(first.swimmer.rows[0].id, "0");
  assert.equal(first.swimmer.rows[0].timeValue, 2000);
  time = "002100";
  assert.equal((await readDirectSwimmer(pool, 1)).swimmer.rows[0].timeValue, 2100);
  assert.equal(queries.length, 4); // Each consultation reads NAP again.
  assert.ok(queries.every(({ query }) => query.timeout === 10000 && /LIMIT (1|2001)$/.test(query.sql)));
  assert.ok(queries.every(({ query }) => !/number|license|password/i.test(query.sql)));
  await assert.rejects(readDirectSwimmer({ execute: async query => [query.sql.startsWith("SELECT n.") ? [person] : Array(2001).fill(perf)] }, 1), RangeError);
  console.log("NAP fiche directe : relecture actuelle, id zero, requetes groupees et historique borne sans troncature silencieuse.");
})().catch(error => { console.error(error); process.exitCode = 1; });
