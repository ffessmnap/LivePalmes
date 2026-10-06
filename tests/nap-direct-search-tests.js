"use strict";
const assert = require("node:assert/strict");
const { searchDirectSwimmers, likeLiteral } = require("../functions/nap-direct-search");
(async () => {
  assert.equal(likeLiteral("a%_=b"), "a=%=_==b");
  const calls = [];
  const pool = { execute: async (query, parameters) => {
    calls.push({ query, parameters });
    return [Array.from({ length: 21 }, (_, index) => ({ id: index + 1, nom: "TEST", prenom: "Paul", date: "2000-01-01", sexe: "M", club: "1" }))];
  } };
  const result = await searchDirectSwimmers(pool, "Pa% Te_st");
  assert.equal(result.swimmers.length, 20);
  assert.equal(result.hasMore, true);
  assert.deepEqual(calls[0].parameters, ["Pa=%%", "%Te=_st%", "Pa=%%", "%Te=_st%"]);
  assert.ok(!calls[0].query.sql.includes("Te_st"));
  assert.ok(calls[0].query.sql.includes("FORCE INDEX (livepalmes_prenom_nom)"));
  assert.ok(!/password|license|number/i.test(calls[0].query.sql));
  await searchDirectSwimmers(pool, "7322");
  assert.deepEqual(calls[1].parameters, [7322]);
  assert.ok(calls[1].query.sql.includes("WHERE id = ? LIMIT 1"));
  await searchDirectSwimmers(pool, "Paul");
  assert.equal(calls.length, 3);
  await assert.rejects(searchDirectSwimmers(pool, ["Paul"]), TypeError);
  await assert.rejects(searchDirectSwimmers(pool, "P"), TypeError);
  await assert.rejects(searchDirectSwimmers(pool, "x".repeat(81)), TypeError);
  console.log("NAP recherche : valeurs parametrees, jokers litteraux, identifiant direct, limites et relecture verifies.");
})().catch(error => { console.error(error); process.exitCode = 1; });
