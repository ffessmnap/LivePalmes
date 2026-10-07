"use strict";
// Preparation only. A server-side resolver must apply the existing sporting
// rules before calling this module. No connection, SQL or generated id here.
const {positiveId}=require("./nap-direct-calendar");
const {isDeepStrictEqual}=require("node:util");
const FIELDS=["id","compet","categorie","club","course","tps"];
function nativeRelay(row,competitionId,clubId) {
  if(!row || FIELDS.some(key=>!Object.hasOwn(row,key)) || positiveId(row.compet)!==competitionId || String(row.club)!==clubId) throw new TypeError("Relais hors du dossier autorise.");
  positiveId(row.id); positiveId(row.course);
  return Object.fromEntries(FIELDS.map(key=>[key,row[key]]));
}
function planRelayChanges(pack,changes) {
  const competitionId=positiveId(pack?.competitionId),clubId=String(pack?.clubId);
  if(!/^\d{1,16}$/.test(clubId) || !Array.isArray(pack.relays) || pack.relays.length>200 || !Array.isArray(pack.members) || pack.members.length>1200 || !Array.isArray(changes) || changes.length>10) throw new TypeError("Dossier et modifications de relais bornes requis.");
  const before=pack.relays.map(row=>nativeRelay(row,competitionId,clubId));
  if(new Set(before.map(row=>Number(row.id))).size!==before.length) throw new TypeError("Identifiants de relais ambigus.");
  const plans=[],seen=new Set();
  for(const change of changes) {
    const relayId=positiveId(change?.relayId);
    if(seen.has(relayId)) throw new TypeError("Relais modifie deux fois."); seen.add(relayId);
    const row=before.find(item=>Number(item.id)===relayId);
    if(!row) throw new TypeError("Relais absent du dossier autorise.");
    const members=pack.members.filter(item=>Number(item.relais)===relayId).map(item=>({id:positiveId(item.id),relais:item.relais,pos:item.pos,nageur:positiveId(item.nageur)}));
    if(new Set(members.map(item=>item.id)).size!==members.length) throw new TypeError("Identifiants de relayeurs ambigus.");
    if(change.action==="remove") {
      if(Object.keys(change).some(key=>!["relayId","action"].includes(key))) throw new TypeError("Retrait explicite seul requis.");
      plans.push({relayId,before:row,membersBefore:members,remove:true});
      continue;
    }
    // This first plan supports a time correction without rebuilding the relay,
    // guessing its historic category, or changing member positions.
    if(change.action!=="time" || Object.keys(change).some(key=>!["relayId","action","time"].includes(key)) || typeof change.time!=="string" || !/^\d{6}$/.test(change.time) || Number(change.time.slice(-4,-2))>=60) throw new TypeError("Temps compact deja valide par le serveur requis.");
    const after={...row,tps:change.time};
    if(!isDeepStrictEqual(row,after)) plans.push({relayId,before:row,after,membersBefore:members,remove:false});
  }
  return {competitionId,clubId,plans};
}
module.exports={planRelayChanges};
