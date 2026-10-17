"use strict";
// Native IntraNAP contract verified read-only on competition 5193 / club 106.
// A missing declaration is never a waiver. No extra SQL or parallel flag.
function isWaiver(row) {
  return Boolean(row && row.nom === "-1" && row.prenom === "-1" && row.date === "0000-00-00" && String(row.club) === String(row.pourclub));
}
function declarationComplete(leaders) {
  if (!Array.isArray(leaders) || leaders.length !== 1) return false;
  const row = leaders[0];
  return isWaiver(row) || Boolean(String(row.nom || "").trim() && String(row.prenom || "").trim() && row.nom !== "-1" && row.prenom !== "-1");
}
module.exports = { isWaiver, declarationComplete };
