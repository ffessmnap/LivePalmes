"use strict";
// Existing singleton, values or query bodies; no business change.
function swimmerId(input) {
  const id = Number(input);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) throw new TypeError("Identifiant nageur invalide.");
  return id;
}

module.exports = { swimmerId };
