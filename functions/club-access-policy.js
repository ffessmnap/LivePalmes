"use strict";

// Committee 5 is an international club grouping, not a regional authority.
function isForeignClubRegion(value) {
  return ["5", "CMAS", "CLUBS ETRANGERS (CMAS)", "AUTRE / CODE 5"].includes(
    String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase()
  );
}

module.exports = { isForeignClubRegion };
