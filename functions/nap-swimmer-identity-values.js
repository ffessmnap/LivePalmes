"use strict";
// Existing singleton, values or query bodies; no business change.
const { createHash } = require("node:crypto");
function fingerprint(row) {
  return createHash("sha256").update(JSON.stringify([row.id, row.nom, row.prenom, row.date, row.sexe, row.club])).digest("hex");
}

module.exports = { fingerprint };
