"use strict";
// Existing singleton, values or query bodies; no business change.
const calendar = require("./nap-query");
async function bounded(connection, sql, values, maximum) {
  const rows = await calendar.execute(connection, sql, values);
  if (rows.length > maximum) throw new RangeError("Fiche NAP trop volumineuse : pagination requise.");
  return rows;
}

module.exports = { bounded };
