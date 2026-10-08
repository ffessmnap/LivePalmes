"use strict";
// Existing IntraNAP region codes. No new scope or alias is inferred.
const REGIONS=Object.freeze({1:"Grand Est",2:"Nouvelle Aquitaine",3:"Ile de France",6:"Bretagne Pays de la Loire",8:"Centre",9:"Guadeloupe",10:"Pyrénées Méditerranée Occitanie",11:"Martinique Guyane",12:"Corse",13:"Hauts de France",15:"Normandie",16:"Sud",17:"Auvergne Rhône Alpes",18:"Réunion",22:"Bourgogne Franche Comté"});
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
