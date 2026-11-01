"use strict";
// One indexed bounded page; directory mode refuses overflow rather than truncating.
const { CLUB_REGIONS, portalRegion, region, COLUMNS, fingerprint, club } = require("./nap-club-values");

// Portal code 12 is Corse; NAP's club committee 12 is Nouvelle Caledonie.
// Preserve committees outside the portal list with an explicit native prefix.






const { directory } = require("./nap-club-directory-page");
const { findClub } = require("./nap-club-read-by-id");
module.exports={findClub,COLUMNS,CLUB_REGIONS,portalRegion,region,club,directory,fingerprint};
