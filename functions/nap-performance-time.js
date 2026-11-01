"use strict";
// Existing singleton, values or query bodies; no business change.
function parseCompactTime(value) {
  const raw = String(value || "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const padded = raw.padStart(6, "0");
  const centiseconds = Number(padded.slice(-2));
  const seconds = Number(padded.slice(-4, -2));
  const minutes = Number(padded.slice(0, -4));
  if (!Number.isFinite(minutes) || seconds >= 60 || minutes > 99) return null;
  const total = ((minutes * 60) + seconds) * 100 + centiseconds;
  return total > 0 ? total : null;
}

function formatTime(value) {
  const total = Number(value || 0);
  const minutes = Math.floor(total / 6000);
  const seconds = Math.floor((total % 6000) / 100);
  const centiseconds = total % 100;
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
  }
  return `${seconds}.${String(centiseconds).padStart(2, "0")}`;
}

module.exports = { parseCompactTime, formatTime };
