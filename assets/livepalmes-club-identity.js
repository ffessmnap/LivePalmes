(function(global){
  "use strict";
  const fields=["firstName","lastName","birthDate","sex","licenseNumber"];
  function changes(before,after){return Object.fromEntries(fields.filter(key=>String(before[key]||"").trim()!==String(after[key]||"").trim()).map(key=>[key,String(after[key]||"").trim()]));}
  function classify(before,after,official=false){
    const patch=changes(before,after),keys=Object.keys(patch);
    if(!keys.length)return {action:"none",patch};
    if(Object.hasOwn(patch,"licenseNumber")&&before.licenseNumber)throw Error("La licence est verrouillée. Contactez l’administration nationale.");
    const correction=keys.some(key=>key!=="licenseNumber"&&(!official||String(before[key]||"").trim()));
    if(correction&&Object.hasOwn(patch,"licenseNumber"))throw Error("Enregistrez d’abord la licence seule, puis demandez la correction des autres champs.");
    return {action:correction?"request":"complete",patch};
  }
  global.LivePalmesClubIdentity={classify};
  if(typeof module!=="undefined"&&module.exports)module.exports={classify};
})(typeof window!=="undefined"?window:globalThis);
