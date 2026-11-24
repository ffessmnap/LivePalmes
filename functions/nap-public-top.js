"use strict";
const { readDirectTop } = require("./nap-direct-tops");
const { cleanText } = require("./nap-performance-identity");

async function readPublicTop(pool, input) {
  const result = await readDirectTop(pool, input);
  if (!result.rows.length) return result;

  // Only look up competitions represented on the returned page, once per competition.
  const competitionIds = [...new Set(result.rows.map(row => Number(row.competitionId)))];
  const placeholders = competitionIds.map(() => "?").join(",");
  const sql = `SELECT competition_id, city FROM livepalmes_competition_options FORCE INDEX (PRIMARY)
    WHERE competition_id IN (${placeholders}) LIMIT ${competitionIds.length}`;
  const [options] = await pool.execute({ sql, timeout: 10000 }, competitionIds);
  const cities = new Map(options.map(option => [Number(option.competition_id), cleanText(option.city)]));
  for (const row of result.rows) {
    row.location = cities.get(Number(row.competitionId)) || row.location;
  }
  return result;
}

module.exports = { readPublicTop };
