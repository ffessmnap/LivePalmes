"use strict";
const assert = require("node:assert/strict");
const { inspectSourceInventory } = require("../functions/nap-source-inventory");
(async () => {
  const queries = [];
  const result = await inspectSourceInventory({ execute: async (query, values) => {
    queries.push({ query, values });
    return [query.sql.includes("information_schema.TABLES") ? [{ TABLE_NAME: "competitions" }, { TABLE_NAME: "documents" }, { TABLE_NAME: "comptes" }] : []];
  } });
  assert.equal(result.mode, "structure-only");
  assert.deepEqual(result.relevant, ["competitions", "documents"]);
  assert.equal(queries.length, 4);
  assert.ok(queries.every(({query}) => query.timeout === 10000 && /LIMIT (201|501)$/.test(query.sql)));
  assert.deepEqual(queries[1].values, ["competitions", "documents"]);
  assert.ok(queries.every(({query}) => query.sql.startsWith("EXPLAIN") || query.sql.includes("information_schema.")));
  await assert.rejects(inspectSourceInventory({ execute: async () => [Array(201).fill({ TABLE_NAME: "x" })] }), RangeError);
  console.log("Inventaire NAP prive : metadonnees bornees, aucune ligne sportive ou privee lue, depassement refuse.");
})().catch(error => { console.error(error); process.exitCode = 1; });
