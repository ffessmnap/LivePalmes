"use strict";
const assert = require("node:assert/strict");
const { visiblePerformanceSql, visibilityStamp } = require("../functions/nap-performance-visibility");
const { queryFor } = require("../functions/nap-direct-tops");
const { historyStatement } = require("../functions/nap-entry-performance-history");
const { statement } = require("../functions/nap-dtn-source");
assert.throws(() => visiblePerformanceSql("p;DELETE"), /Alias/);
for (const sql of [queryFor({ course: "50SF", sex: "F" }).sql, historyStatement([{ id: 912 }]).sql, statement(2026, null, [2]).sql]) {
  assert.match(sql, /NOT EXISTS \(SELECT 1 FROM livepalmes_performance_visibility/);
  assert.match(sql, /lpv FORCE INDEX \(PRIMARY\) WHERE lpv\.performance_id=p\.id AND lpv\.hidden=1/);
}
(async () => {
  let calls = 0;
  const connection = { async execute({ sql }) { calls++; assert.match(sql, /FORCE INDEX \(livepalmes_visibility_updated\)/); assert.match(sql, /LIMIT 1$/); return [[]]; } };
  assert.equal(await visibilityStamp(connection), null); assert.equal(calls, 1);
  const row = { performance_id: 973, version: "1", changed_at: "2026-10-09 13:00:00.000001", age_seconds: 5 };
  const fixture = value => ({ async execute() { return [[value]]; } });
  assert.deepEqual(await visibilityStamp(fixture(row), { settled: true }), ["973", "1", row.changed_at]);
  await assert.rejects(visibilityStamp(fixture({ ...row, age_seconds: 0 }), { settled: true }), /quelques secondes/);
  for (const changed of [{ version: "0" }, { age_seconds: -1 }, { changed_at: null }, { performance_id: 0 }]) await assert.rejects(visibilityStamp(fixture({ ...row, ...changed })), /indisponible/);
  console.log("NAP visibility: primary-key exclusions in TOP/entry/DTN queries, one-row indexed freshness and unsettled/invalid-state refusal passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
