"use strict";
// Native club directory, two keyset pages at most. No identity merging, old
// LivePalmes directory, licence lookup, N+1 query or unbounded fallback.
const { PAGE_SIZE, OPTION_COLUMNS, SOURCES, normalizeOptions, cursors, person } = require("./nap-club-people-values");







const { readClubPeople } = require("./nap-club-people-page");
const { readNationalPeople } = require("./nap-national-people-page");
module.exports={PAGE_SIZE,SOURCES,OPTION_COLUMNS,normalizeOptions,cursors,person,readClubPeople,readNationalPeople};
