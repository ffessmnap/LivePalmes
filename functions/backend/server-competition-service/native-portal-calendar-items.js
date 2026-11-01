// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_nativePortalCalendarItems(backendContext) {
  async function nativePortalCalendarItems(ranges) {
    const { readNativeCompetitionSeason: __nativeMember0 } = require("../../nap-portal-calendar-reader");
const native = { readNativeCompetitionSeason: __nativeMember0 };
    const { listItem: __nativeMember1 } = require("../../nap-competition-list-item");
const view = { listItem: __nativeMember1 };
    const pool = require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
    const years = [...new Set(ranges.map(range => range.season.endYear))];
    const events = [];
    for (const year of years) events.push(...(await native.readNativeCompetitionSeason(pool, year)).events);
    return [...new Map(events.map(event => [event.id, view.listItem(event)])).values()];
  }

  return { nativePortalCalendarItems };
}

module.exports = { createCompetitionService_nativePortalCalendarItems };
