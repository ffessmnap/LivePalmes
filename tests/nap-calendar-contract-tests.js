"use strict";
const assert = require("node:assert/strict");
const { inspectCalendarContract } = require("../functions/nap-calendar-contract");
(async () => {
  const queries = [];
  const result = await inspectCalendarContract({ execute: async query => {
    queries.push(query);
    return [query.sql.includes("AS count") ? [{ count: 3068 }] : [{ id: 1, label: "Piscine" }]];
  } });
  assert.equal(result.mode, "calendar-contract");
  assert.equal(queries.length, 7);
  assert.ok(queries.every(query => query.timeout === 10000 && !/location|name|comment|perfs|nageurs/.test(query.sql)));
  assert.ok(queries.every(query => /LIMIT (51|201|10001|21)/.test(query.sql)));
  assert.match(queries[4].sql, /age_d,age_f,sexe,record_categorie FROM categories FORCE INDEX \(PRIMARY\)/);
  await assert.rejects(inspectCalendarContract({ execute: async query => [query.sql.includes("FROM categories") ? Array(201).fill({}) : []] }), RangeError);
  await assert.rejects(inspectCalendarContract({ execute: async () => [Array(51).fill({})] }), RangeError);
  console.log("Contrat calendrier : seuls libelles et compteurs de publication, budgets bornes.");
})().catch(error => { console.error(error); process.exitCode = 1; });
