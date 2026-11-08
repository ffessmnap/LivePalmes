"use strict";

const { COURSES } = require("./nap-damien-hebert-ranking");
const { visiblePerformanceSql } = require("./nap-performance-visibility-sql");

const MAX_COMPETITIONS = 500;
const MAX_PERFORMANCES = 25000;
const TIMEOUT_MS = 10000;

function parseDay(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp : NaN;
}

function validateWindow({ from, through, seasonEndYear }) {
  const start = parseDay(from);
  const end = parseDay(through);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 366 * 86400000
    || !Number.isInteger(seasonEndYear) || seasonEndYear < 2000 || seasonEndYear > 2100) {
    throw new TypeError("Période de qualification invalide.");
  }
}

async function readTrophyResults(pool, { from, through, seasonEndYear }) {
  validateWindow({ from, through, seasonEndYear });
  const [competitions] = await pool.execute({
    sql: `SELECT c.id
      FROM competitions c FORCE INDEX (livepalmes_date_id)
      WHERE c.date >= ? AND c.date < DATE_ADD(?, INTERVAL 1 DAY)
        AND COALESCE(c.ld, 0) = 0
        AND EXISTS (SELECT 1 FROM compet_parametres cp WHERE cp.compet = c.id AND cp.niveau IN (0, 1, 2, 3, 4, 5, 6, 7))
        AND NOT EXISTS (SELECT 1 FROM livepalmes_competition_options co WHERE co.competition_id = c.id AND co.canceled = 1)
      ORDER BY c.date, c.id LIMIT ${MAX_COMPETITIONS + 1}`,
    timeout: TIMEOUT_MS
  }, [from, through]);
  if (competitions.length > MAX_COMPETITIONS) throw new RangeError("Trop de compétitions pour cette période.");
  if (!competitions.length) return [];

  const ids = competitions.map(({ id }) => id);
  const [rows] = await pool.execute({
    sql: `SELECT p.id AS performanceId, p.nageur AS swimmerId, p.course, p.tps AS time, p.points,
        n.nom AS lastName, n.prenom AS firstName, YEAR(n.date) AS birthYear, TRIM(n.sexe) AS sex,
        COALESCE(cp.abre_club, cn.abre_club) AS club
      FROM perfs p FORCE INDEX (livepalmes_compet_id)
      STRAIGHT_JOIN nageurs n ON n.id = p.nageur
      LEFT JOIN clubs cp ON cp.num_club = p.club AND CAST(cp.num_club AS CHAR) = p.club
      LEFT JOIN clubs cn ON cn.num_club = n.club AND CAST(cn.num_club AS CHAR) = n.club
      WHERE p.compet IN (${ids.map(() => "?").join(",")}) AND p.course IN (${COURSES.map(() => "?").join(",")})
        AND p.relais = 0 AND p.passage = 0 AND TRIM(p.tps) <> '595999' AND YEAR(n.date) IN (?, ?)
        AND TRIM(n.sexe) IN ('F', 'M') AND ${visiblePerformanceSql()}
      ORDER BY p.compet, p.id LIMIT ${MAX_PERFORMANCES + 1}`,
    timeout: TIMEOUT_MS
  }, [...ids, ...COURSES, seasonEndYear - 12, seasonEndYear - 13]);
  if (rows.length > MAX_PERFORMANCES) throw new RangeError("Trop de performances pour cette période.");
  return rows;
}

module.exports = { readTrophyResults, validateWindow };
