"use strict";

// Use the validated manual water serializer; never infer a new sporting format.
// Water adds two bounded primary-key reads per export, not per participant.
async function build(competition, entries, clubsById, services) {
  const normalized = entries.map(entry => ({ ...entry, swimmers: (entry.swimmers || []).map(person => ({
    ...person, individualEntries: (person.individualEntries || []).map(course => course.nativeTime === "599999"
      ? { ...course, entryTime: "", manualEntryTime: "", entryTimeValue: 0, entryTimeMode: "default595999" }
      : course)
  })) }));
  if (competition.competitionType === "pool") return services.poolTxt(competition, normalized, clubsById);
  if (competition.competitionType !== "openWater") throw new TypeError("Type de competition incompatible avec le TXT engagements.");
  const water = require("./winpalme-open-water-manual");
  const event = await water.readManualOpenWaterCompetition(services.pool, competition);
  const projected = water.prepareManualOpenWaterEntries(normalized).map(entry => ({ ...entry,
    swimmers: entry.swimmers.map(person => ({ ...person, category: services.category(person, event) }))
  }));
  return { ...water.buildNativeManualOpenWaterTxt(event, projected, clubsById), fileName: services.fileName(event) };
}

module.exports = { build };
