"use strict";

function normalizeImportIdentityText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function competitionImportFallbackIdentity(metadata = {}) {
  return [
    String(metadata.date || "").slice(0, 10),
    normalizeImportIdentityText(metadata.competitionName),
    normalizeImportIdentityText(metadata.location),
    normalizeImportIdentityText(metadata.poolSize)
  ].join("|");
}

function competitionImportIdentity(metadata = {}) {
  const competitionCode = normalizeImportIdentityText(
    metadata.competitionCode || metadata.externalCompetitionId
  );
  return competitionCode
    ? `code:${competitionCode}`
    : `event:${competitionImportFallbackIdentity(metadata)}`;
}

function sameCompetitionImport(left = {}, right = {}) {
  const leftCode = normalizeImportIdentityText(left.competitionCode || left.externalCompetitionId);
  const rightCode = normalizeImportIdentityText(right.competitionCode || right.externalCompetitionId);
  if (leftCode && rightCode) return leftCode === rightCode;
  return competitionImportFallbackIdentity(left) === competitionImportFallbackIdentity(right);
}

module.exports = {
  competitionImportFallbackIdentity,
  competitionImportIdentity,
  normalizeImportIdentityText,
  sameCompetitionImport
};
