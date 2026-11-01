"use strict";
const {positiveId}=require("./nap-calendar-values");
const {notMerged}=require("./nap-swimmer-merge-state");
const {fingerprint}=require("./nap-swimmer-identity-values");
// Display names are normalized by person(). Guard writes with the exact native
// names after checking the original fingerprint. One grouped primary-key read,
// at most 50 rows; no roster lookup and no identity write.
async function nativeIdentityPlan(query,plan) {
  const people=[...plan.additions,...plan.removals.map(item=>item.swimmer)];
  if(!people.length||people.length>50)throw new TypeError("Selection native bornee requise.");
  const ids=people.map(person=>positiveId(person.id));
  const rows=await query(`SELECT id,nom,prenom,date,sexe,club FROM nageurs FORCE INDEX (PRIMARY) WHERE id IN (${ids.map(()=>"?").join(",")}) AND ${notMerged()} ORDER BY id LIMIT 50`,ids);
  if(rows.length!==people.length)throw new TypeError("Identite NAP modifiee. Rechargez le dossier.");
  const native=person=>{
    const matches=rows.filter(row=>Number(row.id)===Number(person.id));
    if(matches.length!==1||String(matches[0].club)!==String(plan.clubId)||fingerprint(matches[0])!==person.napFingerprint)throw new TypeError("Identite NAP modifiee. Rechargez le dossier.");
    return {...person,lastName:matches[0].nom,firstName:matches[0].prenom};
  };
  return {...plan,additions:plan.additions.map(native),removals:plan.removals.map(item=>({...item,swimmer:native(item.swimmer)}))};
}
module.exports={nativeIdentityPlan};
