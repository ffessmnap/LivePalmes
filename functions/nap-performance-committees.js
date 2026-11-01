"use strict";
// Existing singleton, values or query bodies; no business change.
const COMMITTEE_LABELS = {
  1: "Est",
  2: "Nouvelle-Aquitaine",
  3: "\u00cele-de-France",
  4: "National / f\u00e9d\u00e9ral",
  5: "\u00c9tranger",
  6: "Bretagne - Pays de la Loire",
  8: "Centre-Val de Loire",
  9: "Guadeloupe",
  10: "Occitanie",
  11: "Martinique",
  12: "Autres",
  13: "Hauts-de-France",
  15: "Normandie",
  16: "Provence-Alpes-C\u00f4te d'Azur",
  17: "Auvergne-Rh\u00f4ne-Alpes",
  18: "Saint-Pierre-et-Miquelon",
  19: "Open / f\u00e9d\u00e9ral",
  21: "Hauts-de-France",
  22: "Bourgogne-Franche-Comt\u00e9"
};

function committeeId(value) {
  const id = Number(String(value || "").trim());
  return Number.isFinite(id) && id > 0 ? String(id) : "";
}

function committeeLabel(value) {
  const id = committeeId(value);
  return id ? (COMMITTEE_LABELS[id] || `Comit\u00e9 ${id}`) : "";
}

module.exports = { COMMITTEE_LABELS, committeeId, committeeLabel };
