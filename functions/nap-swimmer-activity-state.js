"use strict";
// Stable state/identity projection shared by readers and writers.
const {createHash}=require("node:crypto");
function fingerprint(row) { return createHash("sha256").update(JSON.stringify([String(row.id),String(row.club),Number(row.actif)])).digest("hex"); }

function status(row) {
  if(![0,1].includes(Number(row.actif))) throw new TypeError("Statut NAP a verifier.");
  return Number(row.actif)===1?"active":"inactive";
}

module.exports = { fingerprint, status };
