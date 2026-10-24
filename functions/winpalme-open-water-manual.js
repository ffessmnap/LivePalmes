"use strict";

// Export-only projection. Native category 0 is the mixed relay sentinel, not
// a WinPalme category. The supplied Jumièges TXT establishes XSE for this event.
function prepareManualOpenWaterEntries(entries) {
  return entries.map(entry => ({
    ...entry,
    relays: (entry.relays || []).map(relay => {
      if (!/^NAP-/i.test(String(relay.category || ""))) return relay;
      if (relay.category === "NAP-0" && String(relay.nativeCategory) === "0"
          && relay.genderMode === "mixed" && relay.eventCode === "4X1000SBMIXTE") {
        return { ...relay, category: "S" };
      }
      throw new Error(`Categorie native du relais eau libre non raccordee : ${relay.eventCode}.`);
    })
  }));
}

// e-NAP meeting identity: committee code + meeting date + native meeting ID.
// Verified against Jumièges 4982 and Beaumont 4760 supplied TXT references.
async function readManualOpenWaterCompetition(connection, competition) {
  const { positiveId } = require("./nap-direct-calendar");
  const { regionCode } = require("./winpalme-export");
  const id = positiveId(competition.id);
  const [rows] = await connection.execute({
    sql: "SELECT id,date,comite FROM competitions FORCE INDEX (PRIMARY) WHERE id=? LIMIT 2",
    timeout: 10000
  }, [id]);
  if (rows.length !== 1 || Number(rows[0].id) !== id || rows[0].date !== competition.date
      || !/^\d{4}-\d{2}-\d{2}$/.test(rows[0].date) || !/^\d+$/.test(String(rows[0].comite))) {
    throw new Error("Reference e-NAP de la competition absente ou modifiee : rechargez la fiche.");
  }
  const prefix = regionCode({ regionId: String(rows[0].comite) });
  if (!/^[A-Z]{2,8}$/.test(prefix)) throw new Error("Code du comite e-NAP non raccorde pour le WID.");
  return { ...competition, winPalmeId: `${prefix}${rows[0].date.replace(/-/g, "")}${id}` };
}

module.exports = { prepareManualOpenWaterEntries, readManualOpenWaterCompetition };
