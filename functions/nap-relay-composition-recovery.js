"use strict";
const {isDeepStrictEqual}=require("node:util");
const {positiveId}=require("./nap-direct-calendar");
const fields=["id","compet","categorie","club","course","tps"];
const shape=(row,keys)=>Object.fromEntries(keys.map(key=>[key,row[key]]));
// The generated relay identifier must have been durably checkpointed. An
// interrupted INSERT with an unknown identifier is never inferred or repeated.
function remainingComposition(plan,relayId,relays,members) {
  relayId=positiveId(relayId);
  if(!plan || !["create","compose"].includes(plan.action) || !Array.isArray(relays) || relays.length>200 || !Array.isArray(members) || members.length>1200 || !Array.isArray(plan.membersAfter) || ![0,4].includes(plan.membersAfter.length)) throw new TypeError("Reprise de composition bornee requise.");
  if(plan.action==="compose" && positiveId(plan.relayId)!==relayId) throw new TypeError("Identifiant du relais modifie incompatible.");
  const rows=relays.filter(row=>Number(row.id)===relayId);
  if(rows.length!==1) throw new TypeError("Relais cree ou modifie a verifier.");
  const after={id:rows[0].id,...plan.after},before=plan.action==="compose"?plan.before:null;
  const current=shape(rows[0],fields);
  const afterRow=shape(after,fields);
  if(!isDeepStrictEqual(current,afterRow) && (!before || !isDeepStrictEqual(current,before))) throw new TypeError("Le relais a change pendant l'enregistrement.");
  const linked=members.filter(row=>Number(row.relais)===relayId);
  if(new Set(linked.map(row=>Number(row.id))).size!==linked.length) throw new TypeError("Identifiant de relayeur ambigu.");
  const retained=[],removals=[],seenPositions=new Set();
  for(const row of linked) {
    const desired=plan.membersAfter.find(member=>member.pos===row.pos && Number(member.nageur)===Number(row.nageur));
    if(desired) {
      if(seenPositions.has(row.pos)) throw new TypeError("Composition dupliquee a verifier.");
      seenPositions.add(row.pos);retained.push(desired);continue;
    }
    if(!before || !plan.membersBefore.some(member=>isDeepStrictEqual(shape(row,["id","relais","pos","nageur"]),member))) throw new TypeError("Un nouveau relayeur est apparu. Aucun retrait automatique.");
    removals.push(shape(row,["id","relais","pos","nageur"]));
  }
  const additions=plan.membersAfter.filter(member=>!retained.includes(member));
  return {complete:isDeepStrictEqual(current,afterRow) && !removals.length && !additions.length,relayId,update:!isDeepStrictEqual(current,afterRow),removals,additions};
}
module.exports={remainingComposition};
