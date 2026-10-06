"use strict";
// EXPLAIN inspects plans without reading performance rows or modifying NAP.
const QUERIES = {
  search: "EXPLAIN SELECT id, nom, prenom, date, sexe FROM nageurs WHERE nom LIKE 'A%' ORDER BY nom, id LIMIT 21",
  swimmer: "EXPLAIN SELECT p.id, p.nageur, p.compet, p.course, p.cat, p.tps, c.date, c.bassin, c.chrono FROM perfs p LEFT JOIN competitions c ON c.id = p.compet WHERE p.nageur = 7322 AND p.id > -1 ORDER BY p.id LIMIT 51",
  top: "EXPLAIN SELECT p.id, p.nageur, p.tps FROM perfs p JOIN competitions c ON c.id = p.compet WHERE p.course = '100SF' AND p.cat = 'HSE' AND p.relais = 0 AND c.bassin = 50 AND c.ld = 0 ORDER BY p.tps, p.id LIMIT 101"
};
async function inspectDirectQueries(pool) {
  const [indexes] = await pool.execute({ sql: "SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, CARDINALITY FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('nageurs','perfs','competitions','clubs') ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX", timeout: 10000 });
  const plans = {};
  for (const [name, sql] of Object.entries(QUERIES)) {
    const [rows] = await pool.execute({ sql, timeout: 10000 });
    plans[name] = rows;
  }
  return { source: "nap", mode: "explain-only", indexes, plans };
}
async function inspectTimeShape(pool, input) {
  const after = Number(input ?? -1);
  if (!Number.isSafeInteger(after) || after < -1 || after > 2147483647) throw new TypeError("Borne invalide.");
  const [maximum] = await pool.execute({ sql: "SELECT MAX(id) AS lastId FROM perfs", timeout: 10000 });
  const lastId = Number(maximum[0]?.lastId ?? -1);
  const through = Math.min(after + 10000, lastId);
  const [counts] = await pool.execute({ sql: "SELECT CHAR_LENGTH(tps) AS width, SUM(tps REGEXP '^[0-9]+$') AS numericRows, COUNT(*) AS rowCount FROM perfs WHERE id > ? AND id <= ? GROUP BY CHAR_LENGTH(tps)", timeout: 10000 }, [after, through]);
  return { source: "nap", mode: "time-shape-counts-only", counts, next: through, hasMore: through < lastId };
}
module.exports = { QUERIES, inspectDirectQueries, inspectTimeShape };
