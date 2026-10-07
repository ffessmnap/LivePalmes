"use strict";
const {isDeepStrictEqual}=require("node:util");
const RELAY_COLUMNS=["id","compet","categorie","club","course","tps"];
const shape=(row,keys)=>Object.fromEntries(keys.map(key=>[key,row[key]]));
function remainingRelays(plan,relays,members) {
  if(!Array.isArray(plan?.plans) || plan.plans.length>10 || !Array.isArray(relays) || relays.length>200 || !Array.isArray(members) || members.length>1200) throw new TypeError("Reprise de relais bornee requise.");
  const pending=[];
  for(const item of plan.plans) {
    const rows=relays.filter(row=>Number(row.id)===Number(item.relayId));
    if(rows.length>1) throw new TypeError("Identifiant relais ambigu.");
    const current=rows[0],linked=members.filter(row=>Number(row.relais)===Number(item.relayId));
    if(item.remove) {
      if(!current) {
        if(linked.length) throw new TypeError("Relayeurs sans relais : verification requise.");
        continue;
      }
      if(!isDeepStrictEqual(shape(current,RELAY_COLUMNS),item.before)) throw new TypeError("Le relais a change pendant le retrait.");
      for(const member of linked) if(!item.membersBefore.some(before=>isDeepStrictEqual(shape(member,["id","relais","pos","nageur"]),before))) throw new TypeError("La composition du relais a change. Aucun nouveau relayeur retire.");
      pending.push({...item,membersBefore:linked.map(row=>shape(row,["id","relais","pos","nageur"]))});
    } else {
      if(!current) throw new TypeError("Le relais a ete retire.");
      if(isDeepStrictEqual(shape(current,RELAY_COLUMNS),item.after)) continue;
      if(!isDeepStrictEqual(shape(current,RELAY_COLUMNS),item.before)) throw new TypeError("Le temps ou le relais a change.");
      pending.push(item);
    }
  }
  return {complete:!pending.length,plan:{...plan,plans:pending}};
}
module.exports={remainingRelays};
