"use strict";

function text(value, maximum = 0) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  return maximum ? cleaned.slice(0, maximum) : cleaned;
}

function clubFromReferenceRow(row = []) {
  return {
    clubId: text(row[0], 40),
    clubCode: text(row[1], 40),
    clubName: text(row[2], 140),
    regionId: text(row[3], 80),
    federalNumber: text(row[4], 24),
    city: text(row[5], 100),
    postalCode: text(row[6], 16),
    active: row[7] !== false && row[7] !== 0 && row[7] !== "0",
    source: "intranap"
  };
}

function cleanClubPayload(raw = {}, current = {}) {
  const federalNumber = text(raw.federalNumber ?? current.federalNumber, 24).toUpperCase();
  const clubCode = text(raw.clubCode ?? current.clubCode, 40).toUpperCase();
  const clubName = text(raw.clubName ?? current.clubName, 140);
  const regionId = text(raw.regionId ?? current.regionId, 80);
  const city = text(raw.city ?? current.city, 100);
  const postalCode = text(raw.postalCode ?? current.postalCode, 16).toUpperCase();
  if (!federalNumber || !/^[A-Z0-9][A-Z0-9-]{1,23}$/.test(federalNumber)) {
    throw new Error("Numero federal de club invalide.");
  }
  if (!clubCode) throw new Error("Sigle du club obligatoire.");
  if (!clubName) throw new Error("Nom officiel du club obligatoire.");
  if (!regionId) throw new Error("Region ou comite du club obligatoire.");
  return {
    clubCode,
    clubName,
    regionId,
    federalNumber,
    city,
    postalCode,
    active: raw.active !== false,
    source: text(current.source || raw.source || "national", 40)
  };
}

function mergeClubDirectory(referenceRows = [], storedClubs = []) {
  const byId = new Map(referenceRows
    .map(clubFromReferenceRow)
    .filter((club) => club.clubId)
    .map((club) => [club.clubId, club]));
  storedClubs.forEach((stored = {}) => {
    const clubId = text(stored.clubId || stored.id, 40);
    if (!clubId) return;
    const base = byId.get(clubId) || {};
    byId.set(clubId, {
      ...base,
      ...stored,
      clubId,
      clubCode: text(stored.clubCode || base.clubCode, 40),
      clubName: text(stored.clubName || base.clubName, 140),
      regionId: text(stored.regionId || base.regionId, 80),
      federalNumber: text(stored.federalNumber || base.federalNumber, 24),
      city: text(stored.city || base.city, 100),
      postalCode: text(stored.postalCode || base.postalCode, 16),
      active: stored.active !== false
    });
  });
  return Array.from(byId.values()).sort((left, right) =>
    left.clubName.localeCompare(right.clubName, "fr") || left.clubCode.localeCompare(right.clubCode, "fr")
  );
}

module.exports = {
  cleanClubPayload,
  clubFromReferenceRow,
  mergeClubDirectory
};
