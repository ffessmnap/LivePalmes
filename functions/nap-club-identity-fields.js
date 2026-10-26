"use strict";
const FIELDS={firstName:"prenom",lastName:"nom",birthDate:"date",sex:"sexe",licenseNumber:"number"};
const {date}=require("./nap-direct-calendar");
function empty(value,key) {
  const text=String(value??"").trim();
  return !text || key==="birthDate" && /^(0000-00-00|00\/00\/0000)/.test(text);
}
function clean(key,value) {
  if(typeof value!=="string") throw new TypeError("Champ d’identité invalide.");
  const text=value.trim();
  if(!text) return "";
  if(key==="birthDate") {
    const date=new Date(`${text}T12:00:00Z`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==text) throw new TypeError("Date de naissance invalide.");
  } else if(key==="sex") {
    if(!["F","M"].includes(text)) throw new TypeError("Choisissez Femme ou Homme.");
  } else if(key==="licenseNumber") {
    if(text.length>100||! /^[A-Z]-\d{2}-\d+$/i.test(text)) throw new TypeError("Licence invalide. Format attendu : A-12-34567.");
    return text.toUpperCase();
  } else if(text.length>100||/[\u0000-\u001f\u007f]/.test(text)) throw new TypeError("Nom et prénom limités à 100 caractères.");
  return text;
}
function plan(row,patch,{fillOnly=false,requireComplete=false}={}) {
  if(!patch||typeof patch!=="object"||Array.isArray(patch)||Object.keys(patch).some(key=>!Object.hasOwn(FIELDS,key))) throw new TypeError("Champs d’identité invalides.");
  const after={...row},changed=[];
  for(const [key,column] of Object.entries(FIELDS)) {
    const before=empty(row[column],key)?"":key==="birthDate"?date(row[column]):String(row[column]).trim();
    const raw=Object.hasOwn(patch,key)?patch[key]:before;
    // Preserve legacy values verbatim until a deliberate correction.
    if(String(raw??"").trim()===before) {
      if(requireComplete&&!before) throw new TypeError("Nom, prénom, naissance, sexe et licence obligatoires.");
      continue;
    }
    const value=clean(key,raw);
    if(!value) throw new TypeError("Une information renseignée ne peut pas être effacée.");
    if(before&&key==="licenseNumber") throw new TypeError("La licence est verrouillée dès sa première saisie. Contactez l’administration nationale.");
    if(fillOnly&&before) throw new TypeError("La correction d’un champ renseigné nécessite un visa national.");
    after[column]=value;changed.push(column);
  }
  return {after,changed};
}
module.exports={FIELDS,empty,clean,plan};
