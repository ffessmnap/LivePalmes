"use strict";
const assert = require("node:assert/strict");
const { QUERIES, inspectDirectQueries } = require("../functions/nap-direct-query-checks");
(async () => {
  const calls = [];
  const result = await inspectDirectQueries({ execute: async query => { calls.push(query); return [[{ key: "test" }]]; } });
  assert.equal(result.mode, "explain-only");
  assert.equal(calls.length, 4);
  assert.ok(calls.every(query => query.timeout === 10000));
  assert.ok(Object.values(QUERIES).every(sql => sql.startsWith("EXPLAIN SELECT ") && /LIMIT (21|51|101)$/.test(sql)));
  assert.deepEqual(Object.keys(result.plans), ["search", "swimmer", "top"]);
  console.log("NAP direct : diagnostic prive, plans seuls, aucune ligne sportive ni ecriture.");
})().catch(error => { console.error(error); process.exitCode = 1; });
