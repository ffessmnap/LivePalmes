"use strict";
// Existing singleton, values or query bodies; no business change.
const calendar = require("./nap-calendar-event");
const { entryState } = require("./nap-paris-time");
function portalEventFromRow(row) {
  const code = row.niveau == null ? "" : String(row.niveau);
  const level = calendar.nativeLevel(code);
  const event = calendar.eventFromRow({ ...row, level_label: ({ departemental: "Départementale", regional: "Régionale", national: "Nationale", international: "International" })[level] || "Nationale", scope_label: "" });
  return { ...event, ...entryState(row), competitionType: event.eventType, nativeLevelCode: row.niveau ?? null,
    nativeLevelRecognized: Boolean(level), nationalManagementOnly: !level || ["national", "international"].includes(level),
    // Unknown legacy codes fail closed for regional management.
    level: level || "national", regionId: level && ["regional", "departemental"].includes(level) ? event.regionId : "",
    regionLabel: level && ["regional", "departemental"].includes(level) ? event.regionLabel : "" };
}

module.exports = { portalEventFromRow };
