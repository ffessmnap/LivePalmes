"use strict";
const {positiveId}=require("./nap-direct-calendar");

// Prepare only explicitly selected/deselected swimmers, using the trusted NAP
// dossier. Licence numbers are intentionally not consulted.
function planSelection(pack, changes) {
  if (!pack || !/^\d{1,16}$/.test(String(pack.clubId)) || !Array.isArray(changes) || !changes.length || changes.length>50) throw new TypeError("Selection NAP bornee requise.");
  for (const [key,limit] of [["swimmers",800],["inscriptions",800],["individual",5000],["members",1200],["relays",200]]) {
    if (!Array.isArray(pack[key]) || pack[key].length>limit) throw new TypeError("Dossier NAP incomplet.");
  }
  const competitionId=positiveId(pack.competitionId),clubId=String(pack.clubId),seen=new Set();
  const additions=[],removals=[];
  for (const change of changes) {
    const id=positiveId(change?.swimmerId);
    if (seen.has(id) || typeof change.selected!=="boolean") throw new TypeError("Selection invalide ou dupliquee.");
    seen.add(id);
    const people=pack.swimmers.filter(row=>Number(row.id)===id && String(row.clubId)===clubId);
    if (people.length!==1) throw new TypeError("Nageur hors du club autorise.");
    const inscriptions=pack.inscriptions.filter(row=>Number(row.nageur)===id);
    if (inscriptions.some(row=>Number(row.compet)!==competitionId) || inscriptions.length>1) throw new TypeError("Inscription native ambigue a verifier.");
    if (change.selected) { if (!inscriptions.length) additions.push({...people[0]}); continue; }
    if (!inscriptions.length) continue;
    const inscription=inscriptions[0],entries=pack.individual.filter(row=>Number(row.engagement)===Number(inscription.id));
    const members=pack.members.filter(row=>Number(row.nageur)===id);
    if (members.some(row=>!pack.relays.some(relay=>Number(relay.id)===Number(row.relais) && Number(relay.compet)===competitionId && String(relay.club)===clubId))) throw new TypeError("Participation relais hors du dossier.");
    removals.push({swimmer:{...people[0]},inscription:{...inscription},entries:entries.map(row=>({...row})),members:members.map(row=>({...row}))});
  }
  return {competitionId,clubId,additions,removals};
}
// Do not route the separate open-water tables, or bypass an unmapped native
// participation/category/qualification restriction, through pool inscriptions.
function selectionLockReason(competition) {
  const parameters=competition?.nativeParameters;
  const type=competition?.event?.eventType || competition?.eventType;
  if(type!=="pool") return "Le circuit des engagements eau libre NAP reste a raccorder avant cette selection.";
  if(!parameters) return "Parametres natifs a verifier avant la selection.";
  if(Number(parameters.qualif||0)!==0 || Number(competition.options?.qualifications_enabled||0)!==0 || competition.qualifications?.enabled===true) return "Le controle des qualifications reste a raccorder pour modifier ce dossier.";
  const participations=competition.participations || competition.nativeRules?.participations;
  if(!Array.isArray(participations) || participations.length) return "Le controle de participation aux competitions requises reste a raccorder avant cette selection.";
  if([parameters.cat_d,parameters.cat_f].some(value=>value!=null && value!=="")) return "Les limites de categories natives restent a verifier avant cette selection.";
  return "";
}
module.exports={planSelection,selectionLockReason};
