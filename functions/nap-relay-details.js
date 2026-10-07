"use strict";
// Additive detail in the already approved club-entry JSON. Native relay rows
// remain the shared source; a stale companion never changes their identity.
const {positiveId}=require("./nap-direct-calendar");
const CATEGORIES=new Set(["P","B","M","C","J","S","R140","R180","R220","R260"]);
const MODES=new Set(["female","male","mixed"]);
const KEY="relay_details_v1";
const witness=row=>[Number(row.compet),String(row.club),Number(row.course),Number(row.categorie)];
function metadata(raw) {
  const value=typeof raw==="string"?JSON.parse(raw):raw;
  if(value==null) return {};
  if(typeof value!=="object" || Array.isArray(value) || Buffer.byteLength(JSON.stringify(value))>250000) throw new TypeError("Complement du dossier a verifier.");
  return value;
}
function detail(row,raw) {
  try {
    const saved=metadata(raw)[KEY]?.[String(positiveId(row.id))];
    if(saved && CATEGORIES.has(saved.category) && MODES.has(saved.genderMode) && JSON.stringify(saved.nativeWitness)===JSON.stringify(witness(row))) return {category:saved.category,genderMode:saved.genderMode};
  }catch { /* Consultation keeps the original native category on invalid JSON. */ }
  return null;
}
function changed(raw,row,value,activeRelayIds=null) {
  const before=metadata(raw),id=String(positiveId(row.id));
  const existing=before[KEY];
  if(existing!=null && (typeof existing!=="object" || Array.isArray(existing))) throw new TypeError("Details des relais a verifier avant enregistrement.");
  const entries={...(existing||{})};
  if(activeRelayIds!==null) {
    if(!Array.isArray(activeRelayIds) || activeRelayIds.length>200) throw new TypeError("Liste native des relais requise.");
    const active=new Set(activeRelayIds.map(value=>String(positiveId(value))));
    for(const key of Object.keys(entries)) if(!active.has(key)) delete entries[key];
  }
  if(value===null) delete entries[id];
  else {
    if(!CATEGORIES.has(value?.category) || !MODES.has(value?.genderMode)) throw new TypeError("Categorie et nature du relais requises.");
    entries[id]={category:value.category,genderMode:value.genderMode,nativeWitness:witness(row)};
  }
  if(Object.keys(entries).length>200) throw new RangeError("Complement des relais trop volumineux.");
  return {...before,[KEY]:entries};
}
module.exports={detail,changed};
