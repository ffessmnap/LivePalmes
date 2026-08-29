"use strict";

function cleanText(value) {
  return String(value ?? "").trim();
}

function referenceSwimmerIds(swimmer = {}) {
  return Array.from(new Set([
    swimmer.id,
    swimmer.swimmerId,
    swimmer.swimmerIndexId,
    ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : []),
    ...(Array.isArray(swimmer.aliases) ? swimmer.aliases : [])
  ].map(cleanText).filter(Boolean)));
}

function swimmerMergeIds(swimmer = {}, requestedId = "") {
  return Array.from(new Set([
    requestedId,
    ...referenceSwimmerIds(swimmer)
  ].map(cleanText).filter(Boolean)));
}

function recoveredPerformanceRowsAreComplete(rows = [], expectedRowCount = 0) {
  const expected = Math.max(0, Math.trunc(Number(expectedRowCount) || 0));
  return expected === 0 || (Array.isArray(rows) && rows.length >= expected);
}

function findReferenceSwimmerCorrectionTarget(reference = [], request = {}) {
  const swimmerId = cleanText(request.swimmerId);
  const identityKey = cleanText(request.identityKey);
  const rows = Array.isArray(reference) ? reference : [];
  const idMatches = swimmerId
    ? rows.filter((swimmer) => referenceSwimmerIds(swimmer).includes(swimmerId))
    : [];
  const identityMatches = identityKey
    ? rows.filter((swimmer) => cleanText(swimmer.identityKey) === identityKey)
    : [];
  const candidates = idMatches.length ? idMatches : identityMatches;
  if (!candidates.length) return { swimmer: null, ambiguous: false, matchedBy: "" };
  if (candidates.length === 1) {
    const swimmer = candidates[0];
    if (idMatches.length && identityKey && cleanText(swimmer.identityKey) !== identityKey) {
      return { swimmer: null, ambiguous: false, stale: true, matchedBy: "id" };
    }
    return {
      swimmer,
      ambiguous: false,
      stale: false,
      matchedBy: idMatches.length ? "id" : "identity"
    };
  }
  if (identityKey) {
    const exact = candidates.filter((swimmer) => cleanText(swimmer.identityKey) === identityKey);
    if (exact.length === 1) {
      return { swimmer: exact[0], ambiguous: false, stale: false, matchedBy: "id+identity" };
    }
  }
  return { swimmer: null, ambiguous: true, stale: false, matchedBy: idMatches.length ? "id" : "identity" };
}

module.exports = {
  findReferenceSwimmerCorrectionTarget,
  referenceSwimmerIds,
  swimmerMergeIds,
  recoveredPerformanceRowsAreComplete
};
