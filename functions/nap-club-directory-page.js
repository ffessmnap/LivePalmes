"use strict";
// Existing singleton, values or query bodies; no business change.
const { COLUMNS, club } = require("./nap-club-values");
async function directory(pool) {
 const [rows]=await pool.execute({sql:`SELECT ${COLUMNS.map(k=>`\`${k}\``).join(",")} FROM clubs FORCE INDEX (PRIMARY) ORDER BY num_club LIMIT 1001`,timeout:10000});
 if(rows.length>1000) throw new RangeError("Annuaire NAP superieur a 1000 clubs : pagination requise.");
 return {ok:true,source:"nap",clubs:rows.map(club),replaceDirectory:true,hasMore:false,cursor:null,syncWatermark:new Date().toISOString(),sqlBudget:{queriesMax:1,rowsMax:1001}};
}

module.exports = { directory };
