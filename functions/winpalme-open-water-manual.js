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

module.exports = { prepareManualOpenWaterEntries };
