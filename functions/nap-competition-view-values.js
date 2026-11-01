"use strict";
// Existing singleton, values or query bodies; no business change.
const text = value => String(value ?? "").trim();

const code = value => text(value).toUpperCase().replace(/\s+/g, "");

const nativeCourseCode = value => code(value).replace(/^(4X50SF|4X100SF|4X200SF|4X100BI|4X100SB)MIXTE$/, "$1");

function json(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { throw new TypeError("Complement NAP illisible."); }
}

module.exports = { text, code, nativeCourseCode, json };
