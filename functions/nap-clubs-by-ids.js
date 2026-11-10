"use strict";
const { COLUMNS, club } = require("./nap-club-values");

// One primary-key lookup for the distinct clubs of one bounded operation.
async function readClubsByIds(pool, values = []) {
  const ids = [...new Set(values.map(value => String(value ?? "").trim()).filter(Boolean))];
  if (ids.length > 500) throw new RangeError("Lecture limitée à 500 clubs par opération.");
  if (ids.some(id => !/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id)))) {
    throw new TypeError("Identifiant club NAP invalide.");
  }
  if (!ids.length) return new Map();
  const [rows] = await pool.execute({
    sql: `SELECT ${COLUMNS.map(column => `\`${column}\``).join(",")} FROM clubs FORCE INDEX (PRIMARY) WHERE num_club IN (${ids.map(() => "?").join(",")}) ORDER BY num_club LIMIT 501`,
    values: ids.map(Number), timeout: 10000
  });
  if (rows.length > ids.length) throw new RangeError("Réponse clubs NAP incohérente.");
  const requested = new Set(ids), result = new Map();
  for (const row of rows) {
    const item = club(row);
    if (!requested.has(item.clubId) || result.has(item.clubId)) throw new TypeError("Réponse clubs NAP incohérente.");
    result.set(item.clubId, item);
  }
  return result;
}

module.exports = { readClubsByIds };
