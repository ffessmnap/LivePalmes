"use strict";
// Translate already-loaded NAP supplements for the existing sporting engine.
// No database, export, Firebase fallback or inferred qualification rule.
const engine=require("./engagement-qualification");
const {positiveId,date}=require("./nap-direct-calendar");
function array(value) {
  const parsed=typeof value==="string"?JSON.parse(value):value;
  if(!Array.isArray(parsed)) throw new TypeError("Liste de qualification NAP invalide.");
  return parsed;
}
function fromPack(pack,events=[]) {
  if(Number(pack.options?.qualifications_enabled)!==1) return engine.validateRules({enabled:false});
  const id=positiveId(pack.event?.id);
  const groups=pack.groups,standards=pack.standards,links=pack.qualifyingCompetitions;
  if(!Array.isArray(groups)||groups.length>12||!Array.isArray(standards)||standards.length>3000||!Array.isArray(links)||links.length>2400) throw new TypeError("Grille NAP incomplete ou trop volumineuse.");
  const ids=new Set(),positions=new Set();
  for(const group of groups) {
    if(Number(group.competition_id)!==id||!Number.isSafeInteger(group.id)||group.id<=0||ids.has(group.id)||!Number.isSafeInteger(group.position)||group.position<0||positions.has(group.position)) throw new TypeError("Groupe NAP ambigu ou hors competition.");
    ids.add(group.id);positions.add(group.position);
  }
  const selections=new Map(groups.map(group=>[group.id,[]]));
  for(const link of links) {
    const target=positiveId(link.qualifying_competition_id),selection=selections.get(link.group_id);
    if(!selection||selection.includes(`legacy-nap-${target}`)) throw new TypeError("Competition qualificative NAP ambigue.");
    selection.push(`legacy-nap-${target}`);
  }
  const values={};
  for(const row of standards) {
    const key=engine.key(row.category,row.sex,row.event_code);
    if(Number(row.competition_id)!==id||Object.hasOwn(values,key)) throw new TypeError("Minimum NAP ambigu ou hors competition.");
    values[key]=row.minimum_centiseconds;
  }
  return engine.validateRules({enabled:true,groups:[...groups].sort((a,b)=>a.position-b.position).map(group=>({
    label:group.label,categories:array(group.categories),mode:group.mode,startDate:date(group.start_date),endDate:date(group.end_date),
    pools:array(group.pools),electronicOnly:Number(group.electronic_only)===1,competitionMode:group.competition_mode,
    competitionIds:selections.get(group.id),bonusRequiresSelectedCompetition:Number(group.bonus_requires_selected)===1
  })),standards:values},events);
}
module.exports={fromPack};
