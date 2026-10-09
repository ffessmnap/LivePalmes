"use strict";
const {createHash}=require('node:crypto');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function ordered(value,keys){
  if(!value||typeof value!=='object'||Array.isArray(value))return value;
  return Object.fromEntries([...keys.filter(key=>Object.hasOwn(value,key)),...Object.keys(value).filter(key=>!keys.includes(key)).sort()].map(key=>[key,value[key]]));
}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
function sourceHash(before){return digest(canonical(before));}
// MySQL JSON may reorder object keys. Recover the exact historical writer order
// for pending controls, without discarding any field or changing array order.
function matches(before,hash,relay=false){
  if(sourceHash(before)===hash||digest(before)===hash)return true;
  const legacy=ordered(before,relay?['relayId','clubId','entry','members']:['swimmerId','name','clubId','birthDate','sex','inscriptionId','entries']);
  if(relay){
    legacy.entry=ordered(before.entry,['id','compet','categorie','club','course','tps']);
    legacy.members=before.members.map(row=>ordered(row,['id','relais','pos','nageur']));
  }else legacy.entries=before.entries.map(row=>ordered(row,['eventCode','nativeId','nativeTime']));
  return digest(legacy)===hash;
}
module.exports={sourceHash,matches};
