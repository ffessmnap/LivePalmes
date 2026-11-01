// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_nativePortalCalendarItems(backendContext) {
  async function nativePortalCalendarItems(ranges) {
    const native = require("../../nap-portal-competitions");
    const view = require("../../nap-portal-workspaces");
    const pool = require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
    const years = [...new Set(ranges.map(range => range.season.endYear))];
    const events = [];
    for (const year of years) events.push(...(await native.readNativeCompetitionSeason(pool, year)).events);
    return [...new Map(events.map(event => [event.id, view.listItem(event)])).values()];
  }

  return { nativePortalCalendarItems };
}

module.exports = { createCompetitionService_nativePortalCalendarItems };
