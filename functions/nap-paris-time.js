"use strict";
const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
function civilAt(value) {
  const p = Object.fromEntries(formatter.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
// NAP DATETIME values are Paris civil time, not UTC. Reject non-existent or
// ambiguous clock times instead of inventing an offset. No native value changes.
function parisDeadline(value) {
  const raw = String(value ?? "");
  if (!raw || raw === "0000-00-00 00:00:00") return { iso: "", warning: "" };
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) return { iso: "", warning: "invalid-native-deadline" };
  const utc = Date.parse(`${raw.replace(" ", "T")}Z`);
  if (!Number.isFinite(utc)) return { iso: "", warning: "invalid-native-deadline" };
  const candidates = [1, 2].map(hours => utc - hours * 3600000).filter(ms => civilAt(ms) === raw);
  return candidates.length === 1 ? { iso: new Date(candidates[0]).toISOString(), warning: "" }
    : { iso: "", warning: candidates.length ? "ambiguous-native-deadline" : "invalid-native-deadline" };
}
function entryState(parameters, now = Date.now()) {
  const deadline = parisDeadline(parameters.date_limit);
  const expired = deadline.iso ? now >= Date.parse(deadline.iso) : false;
  return { entryDeadlineAt: deadline.iso, nativeEntryDeadline: parameters.date_limit ?? null,
    entryStatus: expired ? "closed" : Number(parameters.actif) === 1 ? "open" : "upcoming",
    deadlineWarning: deadline.warning };
}
module.exports = { civilAt, parisDeadline, entryState };
