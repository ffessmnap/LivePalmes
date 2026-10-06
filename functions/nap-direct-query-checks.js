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
  const top = require("./nap-direct-tops").queryFor({ course: "100SF", sex: "M", category: "S", pool: "50" });
  const [topPlan] = await pool.execute({ sql: `EXPLAIN ${top.sql}`, timeout: 10000 }, top.values);
  plans.directTop = topPlan;
  const calendar = require("./nap-direct-calendar");
  const calendarQueries = {
    calendarSeason: { sql: `${calendar.SELECT_EVENT} FORCE INDEX (livepalmes_date_id)${calendar.EVENT_JOINS} WHERE c.date >= ? AND c.date < ? ORDER BY c.date,c.id LIMIT 501`, values: ["2025-09-01", "2026-09-01"] },
    competitionDocuments: { sql: "SELECT d.id,d.name,d.location,t.label FROM documents d FORCE INDEX (livepalmes_compet_public_id) LEFT JOIN documents_types t ON t.id=d.type WHERE d.competition=? AND d.public='Y' ORDER BY d.id LIMIT 101", values: [2652] },
    competitionResults: { sql: "SELECT STRAIGHT_JOIN p.id,p.nageur,p.tps,n.nom,c.date FROM perfs p FORCE INDEX (livepalmes_compet_id) JOIN competitions c ON c.id=p.compet LEFT JOIN nageurs n ON n.id=p.nageur WHERE p.compet=? ORDER BY p.id LIMIT 5001", values: [2652] },
    competitionHistories: { sql: "SELECT STRAIGHT_JOIN p.id,p.nageur,p.tps,n.nom,c.date FROM perfs p FORCE INDEX (nageur) JOIN competitions c ON c.id=p.compet JOIN nageurs n ON n.id=p.nageur WHERE p.nageur IN (?,?) LIMIT 100001", values: [7322, 4196] }
  };
  for (const [name, query] of Object.entries(calendarQueries)) {
    const [rows] = await pool.execute({ sql: `EXPLAIN ${query.sql}`, timeout: 10000 }, query.values);
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
  const [shortTimes] = await pool.execute({ sql: "SELECT course, tps FROM perfs WHERE id > ? AND id <= ? AND tps REGEXP '^[0-9]{1,5}$' LIMIT 11", timeout: 10000 }, [after, through]);
  const rules = require("./nap-performance-normalization");
  const validShortNumericRows = shortTimes.filter(row => rules.CURRENT_POOL_COURSES.includes(row.course) &&
    rules.parseCompactTime(row.tps) >= rules.MIN_TIME_BY_COURSE[row.course]).length;
  return { source: "nap", mode: "time-shape-counts-only", counts, validShortNumericRows, shortTimesTruncated: shortTimes.length > 10, next: through, hasMore: through < lastId };
}
module.exports = { QUERIES, inspectDirectQueries, inspectTimeShape };
