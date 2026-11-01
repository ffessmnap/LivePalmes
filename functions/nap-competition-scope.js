"use strict";
// Existing IntraNAP region codes. No new scope or alias is inferred.
const { REGIONS } = require("./nap-competition-regions");
function region(value) {
  const found=Object.keys(REGIONS).find(id=>String(value)===id || value===REGIONS[id]);
  if(!found) throw new TypeError("Region NAP non reconnue.");
  return Number(found);
}
function invitations(value,primary) {
  if(!Array.isArray(value) || value.length>15) throw new TypeError("Liste de regions invalide.");
  return [...new Set(value.map(region))].filter(id=>id!==primary).sort((a,b)=>a-b);
}
module.exports={REGIONS,region,invitations};
