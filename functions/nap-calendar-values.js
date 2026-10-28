"use strict";
// Shared scalar values; no calendar reads, writes or application dependencies.
function positiveId(input) {
  const value = String(input ?? "").replace(/^legacy-nap-/, "");
  if (!/^[1-9][0-9]{0,9}$/.test(value) || Number(value) > 2147483647) throw new TypeError("Competition invalide.");
  return Number(value);
}

function date(value) { return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(String(value || "")) ? String(value) : ""; }

function text(value) {
  const entities = { amp: "&", apos: "'", quot: '"', eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", ccedil: "ç", nbsp: " " };
  return String(value ?? "").replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] || match).trim();
}

function publicUrl(value) {
  const input = text(value);
  if (!input || /^\/\//.test(input) || /[\u0000-\u001f]/.test(input)) return "";
  try {
    const url = new URL(input, "https://nap.ffessm.fr/");
    if (url.protocol === "http:" && url.hostname === "nap.ffessm.fr") url.protocol = "https:";
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch (_) { return ""; }
}

module.exports = { positiveId, date, text, publicUrl };
