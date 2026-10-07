"use strict";
// Pure retry classification only. No database or audit write is performed.
const {isDeepStrictEqual}=require("node:util");
const {positiveId}=require("./nap-direct-calendar");
const columns=["id","compet","officiel","club"];
function row(value,plan) {
  if(!value || columns.some(key=>!Object.hasOwn(value,key))) throw new TypeError("Lien officiel incomplet.");
  if(Number(value.compet)!==plan.competitionId || String(value.club)!==plan.clubId) throw new TypeError("Lien hors dossier.");
  return {id:positiveId(value.id),compet:value.compet,officiel:positiveId(value.officiel),club:value.club};
}
function remainingOfficials(plan,current) {
  if(!plan || !Array.isArray(plan.before) || !Array.isArray(plan.removals) || !Array.isArray(plan.additions) || !Array.isArray(current) || Math.max(plan.before.length,current.length)>200 || plan.additions.length>80) throw new TypeError("Reprise bornee requise.");
  const before=plan.before.map(value=>row(value,plan)),now=current.map(value=>row(value,plan));
  const byId=new Map(now.map(value=>[value.id,value]));
  if(byId.size!==now.length || new Set(before.map(value=>value.id)).size!==before.length) throw new TypeError("Liens ambigus.");
  const removable=new Map(plan.removals.map(value=>{const saved=row(value,plan);return [saved.id,saved];}));
  if(removable.size!==plan.removals.length || [...removable.values()].some(value=>!before.some(saved=>isDeepStrictEqual(saved,value)))) throw new TypeError("Retrait sans sauvegarde.");
  const additions=new Set(plan.additions.map(value=>positiveId(value.id)));
  if(additions.size!==plan.additions.length || before.some(value=>additions.has(value.officiel))) throw new TypeError("Plan d'ajout ambigu.");
  const removals=[];
  for(const saved of before) {
    const present=byId.get(saved.id);
    if(present && !isDeepStrictEqual(saved,present)) throw new TypeError("Lien modifie depuis la sauvegarde.");
    if(!present && !removable.has(saved.id)) throw new TypeError("Lien conserve disparu.");
    if(present && removable.has(saved.id)) removals.push(saved);
    byId.delete(saved.id);
  }
  const completed=new Set();
  for(const added of byId.values()) {
    if(!additions.has(added.officiel) || completed.has(added.officiel)) throw new TypeError("Engagement nouveau ou doublon concurrent : rechargez le dossier.");
    completed.add(added.officiel);
  }
  return {removals,additions:plan.additions.filter(value=>!completed.has(Number(value.id))),complete:!removals.length && completed.size===additions.size};
}
module.exports={remainingOfficials};
