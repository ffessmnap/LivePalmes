"use strict";
// Existing singleton, values or query bodies; no business change.
function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeIdentityText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function swimmerIdentityKey(firstName, lastName, birthDate) {
  const first = normalizeIdentityText(firstName);
  const last = normalizeIdentityText(lastName);
  const birth = cleanText(birthDate);
  return first && last && birth ? `${last}|${first}|${birth}` : "";
}

function canonicalSwimmerId(ids) {
  return ids
    .map((id) => String(id || "").trim())
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, "fr-FR", { numeric: true }))[0] || "";
}

module.exports = { cleanText, normalizeIdentityText, swimmerIdentityKey, canonicalSwimmerId };
