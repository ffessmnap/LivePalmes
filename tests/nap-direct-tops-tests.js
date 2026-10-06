"use strict";
const assert = require("node:assert/strict");
const top = require("../functions/nap-direct-tops");
function raw(id, swimmer, tps, date = "2020-01-01") {
  return { id, swimmer_id: swimmer, prenom: `Prenom${swimmer}`, nom: "Nom", birth_date: "1990-01-01", sexe: "M", competition_id: 2, course: "100SF", relais: 0, cat: "HSE", tps, date, bassin: 50, ld: 0 };
}
(async () => {
  const input = { course: "100SF", sex: "M", limit: 2 };
  const query = top.queryFor({ ...input, category: "M30+", season: "2020", region: "13,21", pool: "50", birthYear: "1990" });
  assert.match(query.sql, /FORCE INDEX \(livepalmes_course_relais_tps\)/);
  assert.match(query.sql, /ORDER BY CAST\(TRIM\(p.tps\) AS UNSIGNED\), c.date, p.id LIMIT 5001/);
  assert.deepEqual(query.values, ["100SF", "M", 3000, "M30+", 2020, 50, 1990, 13, 21]);
  assert.match(top.CATEGORY_SQL, /YEAR\(n.date\) BETWEEN 1900 AND 2100/);
  assert.match(top.CATEGORY_SQL, /'HM0'/);
  assert.throws(() => top.filters({ ...input, course: "100SF' OR 1=1" }), TypeError);
  assert.throws(() => top.filters({ ...input, region: "1);DROP" }), TypeError);
  assert.throws(() => top.filters({ ...input, limit: 2001 }), TypeError);
  let records = [raw(1, 168, "14200"), raw(2, 168, "014200", "2019-01-01"), raw(3, 169, "10000"), raw(4, 170, "11000")];
  let reads = 0;
  const pool = { execute: async query => { reads++; return query.sql.startsWith("SELECT COUNT") ? [[{ rowCount: 100 }]] : [records]; } };
  const result = await top.readDirectTop(pool, input);
  assert.equal(reads, 2);
  assert.deepEqual(result.rows.map(row => row.swimmerId), ["169", "170"]);
  assert.equal(result.hasMore, true);
  const all = await top.readDirectTop(pool, { ...input, limit: 25 });
  assert.equal(all.rows[2].id, "2");
  assert.equal(all.rows[2].time, "1:42.00");
  assert.equal(all.rows[2].category, "S");
  records = [raw(1, 168, "14300")];
  assert.equal((await top.readDirectTop(pool, input)).rows[0].time, "1:43.00");
  await assert.rejects(top.readDirectTop({ execute: async () => [[{ rowCount: 150001 }]] }, input), RangeError);
  records = Array.from({ length: 5001 }, (_, i) => raw(i + 1, 168, "14200"));
  await assert.rejects(top.readDirectTop(pool, input), RangeError);
  console.log("TOP NAP : temps courts, meilleure performance, categories partagees, filtres, fraicheur et plafonds verifies.");
})().catch(error => { console.error(error); process.exitCode = 1; });
