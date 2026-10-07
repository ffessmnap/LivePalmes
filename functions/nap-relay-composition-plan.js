"use strict";
// Pure native mapping after existing LivePalmes sporting validation. Explicit
// positions/category/course come from the trusted resolver, never the client.
// No database, generated-id allocation, licence lookup or old-row rewrite.
const {positiveId}=require("./nap-direct-calendar");
const fields=["id","compet","categorie","club","course","tps"];
const shape=(row,keys)=>Object.fromEntries(keys.map(key=>[key,row[key]]));
function planComposition(pack,resolved) {
  const competitionId=positiveId(pack?.competitionId),clubId=String(pack?.clubId);
  if(!/^\d{1,16}$/.test(clubId) || !Array.isArray(pack.relays) || pack.relays.length>200 || !Array.isArray(pack.members) || pack.members.length>1200 || !Array.isArray(pack.inscriptions) || pack.inscriptions.length>800 || !Array.isArray(pack.swimmers) || pack.swimmers.length>800 || !resolved || !["create","compose"].includes(resolved.action)) throw new TypeError("Composition native bornee requise.");
  const native=resolved.native;
  if(!native || positiveId(native.compet)!==competitionId || String(native.club)!==clubId || !Number.isSafeInteger(native.categorie) || native.categorie<0 || !/^\d{6}$/.test(native.tps) || Number(native.tps.slice(-4,-2))>=60) throw new TypeError("Relais valide et dans le club requis.");
  positiveId(native.course);
  const selected=new Set(pack.inscriptions.filter(row=>Number(row.compet)===competitionId).map(row=>Number(row.nageur)));
  const people=new Map(pack.swimmers.filter(row=>String(row.clubId)===clubId).map(row=>[Number(row.id),row]));
  if(!Array.isArray(resolved.members) || ![0,4].includes(resolved.members.length)) throw new TypeError("Quatre relayeurs ou une composition vide requis.");
  const members=resolved.members.map(row=>{
    const nageur=positiveId(row?.nageur),pos=row?.pos;
    if(!selected.has(nageur) || !people.has(nageur) || !Number.isSafeInteger(pos) || pos<1 || pos>4) throw new TypeError("Relayeur selectionne et position native verifiee requis.");
    return {nageur,pos};
  });
  if(new Set(members.map(row=>row.nageur)).size!==members.length || new Set(members.map(row=>row.pos)).size!==members.length) throw new TypeError("Relayeurs et positions uniques requis.");
  const after=shape(native,["compet","categorie","club","course","tps"]);
  // engagements_relais.club is INT; unlike nageurs.club it is not VARCHAR.
  // Match the actual driver representation when verifying an applied INSERT.
  after.club=positiveId(clubId);
  if(resolved.action==="create") {
    if(pack.relays.length>=200 || resolved.relayId!=null || Object.hasOwn(native,"id")) throw new TypeError("Creation sans identifiant existant requise.");
    return {competitionId,clubId,action:"create",after,membersAfter:members};
  }
  const relayId=positiveId(resolved.relayId),rows=pack.relays.filter(row=>Number(row.id)===relayId);
  if(rows.length!==1 || fields.some(key=>!Object.hasOwn(rows[0],key)) || Number(rows[0].compet)!==competitionId || String(rows[0].club)!==clubId) throw new TypeError("Relais existant du dossier requis.");
  const membersBefore=pack.members.filter(row=>Number(row.relais)===relayId).map(row=>{
    positiveId(row.id);positiveId(row.nageur);
    return shape(row,["id","relais","pos","nageur"]);
  });
  if(new Set(membersBefore.map(row=>Number(row.id))).size!==membersBefore.length) throw new TypeError("Composition native ambigue.");
  return {competitionId,clubId,action:"compose",relayId,before:shape(rows[0],fields),after:{id:rows[0].id,...after},membersBefore,membersAfter:members};
}
module.exports={planComposition};
