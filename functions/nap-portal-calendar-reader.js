"use strict";
// Existing singleton, values or query bodies; no business change.
const calendar = require("./nap-calendar-event");
const { bounded } = require("./nap-competition-query");
const { portalEventFromRow } = require("./nap-portal-event");
async function readNativeCompetitionSeason(connection, input) {
  const year = Number(input);
  if (!Number.isInteger(year) || year < 1901 || year > 2101) throw new TypeError("Saison invalide.");
  const select = calendar.SELECT_EVENT.replace(" FROM competitions c", ",cp.niveau,cp.actif,cp.date_limit,co.entry_closed FROM competitions c");
  const rows = await bounded(connection, `${select} FORCE INDEX (livepalmes_date_id)${calendar.EVENT_JOINS} WHERE c.date >= ? AND c.date < ? ORDER BY c.date,c.id LIMIT 501`, [`${year - 1}-09-01`, `${year}-09-01`], calendar.MAX_EVENTS);
  if (new Set(rows.map(row => String(row.id))).size !== rows.length) throw new RangeError("Parametres de competition ambigus.");
  return { source: "nap", readAt: new Date().toISOString(), events: rows.map(portalEventFromRow).filter(event => event.date && event.name) };
}

module.exports = { readNativeCompetitionSeason };
