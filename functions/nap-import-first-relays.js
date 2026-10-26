"use strict";
const {parseCompactTime}=require("./nap-duration");
const parse=value=>typeof value==="string"?JSON.parse(value):value;
const validId=value=>Number.isSafeInteger(value)&&value>0&&value<=2147483647;
// Old ZIP journals already contain the complete verified after images. The
// writer consumes identical native rows in id order: individual source rows
// first, derived first legs last. Reproduce that allocation, not a guess based
// on a swimmer having the same time in the current relay table.
function legacyIds(perfs,relays,competitionId){
  if(!Array.isArray(perfs)||perfs.length>5000||!Array.isArray(relays)||relays.length>1000)throw new TypeError("Origine des premiers relayeurs à vérifier.");
  if(new Set(perfs.map(r=>r.id)).size!==perfs.length||new Set(relays.map(r=>r.id)).size!==relays.length)throw new TypeError("Journal de relais en doublon.");
  const buckets=new Map(),key=(person,club,course,time)=>JSON.stringify([Number(person),String(club),course,time]);
  for(const r of perfs){
    if(!validId(r.id)||Number(r.compet)!==competitionId)throw new TypeError("Journal de performances incohérent.");
    if(Number(r.passage)!==0||Number(r.relais)!==0||Number(r.points)!==0||Number(r.classement)!==0)continue;
    const time=parseCompactTime(r.tps);if(!time)continue;
    const k=key(r.nageur,r.club,r.course,time),bucket=buckets.get(k)||[];bucket.push(r);buckets.set(k,bucket);
  }
  const needed=new Map();
  for(const r of relays){
    const course=/^4X(\d+)(SF|BI|IS|AP)$/.exec(r.distance),time=parseCompactTime(r.tps1),final=parseCompactTime(r.tps4);
    if(!validId(r.id)||Number(r.compet)!==competitionId||!course||!validId(Number(r.nageur1))||!time||!final||time>=final)throw new TypeError("Journal de relais incohérent.");
    const k=key(r.nageur1,r.club,`${course[1]}${course[2]}`,time);needed.set(k,(needed.get(k)||0)+1);
  }
  const ids=[];
  for(const [k,count] of needed){
    const bucket=buckets.get(k)||[];
    if(bucket.length<count||new Set(bucket.map(r=>r.cat)).size!==1)throw new TypeError("Origine des premiers relayeurs ambiguë : contrôle national requis.");
    ids.push(...bucket.sort((a,b)=>a.id-b.id).slice(-count).map(r=>r.id));
  }
  return ids;
}
async function readFirstRelayIds(pool,competitionId,importId){
  const [rows]=await pool.execute({sql:"SELECT JSON_UNQUOTE(JSON_EXTRACT(metadata,'$.sourceType')) AS source_type,JSON_EXTRACT(metadata,'$.plan.perfs.firstRelayIds') AS first_ids,CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(metadata,'$.sourceType'))='winpalme-zip-preview' AND JSON_EXTRACT(metadata,'$.plan.perfs.firstRelayIds') IS NULL THEN JSON_EXTRACT(metadata,'$.plan.perfs.after') ELSE NULL END AS legacy_perfs,CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(metadata,'$.sourceType'))='winpalme-zip-preview' AND JSON_EXTRACT(metadata,'$.plan.perfs.firstRelayIds') IS NULL THEN JSON_EXTRACT(metadata,'$.plan.relays.after') ELSE NULL END AS legacy_relays FROM livepalmes_performance_imports WHERE id=? AND competition_id=? AND status='completed' LIMIT 1",timeout:10000},[importId,competitionId]);
  if(rows.length!==1)throw new TypeError("Import courant modifié : actualisez les résultats.");
  const row=rows[0],explicit=parse(row.first_ids);
  const ids=explicit!=null?explicit:row.source_type==="winpalme-zip-preview"?legacyIds(parse(row.legacy_perfs),parse(row.legacy_relays),competitionId):[];
  if(!Array.isArray(ids)||ids.length>1000||ids.some(id=>!validId(id))||new Set(ids).size!==ids.length)throw new TypeError("Origine des premiers relayeurs invalide.");
  return ids;
}
module.exports={legacyIds,readFirstRelayIds};
