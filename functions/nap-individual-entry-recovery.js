"use strict";
// Recognize only the recorded operation's partial effects. MyISAM cannot
// roll back several writes; an unrelated native edit requires a fresh review.
const {isDeepStrictEqual}=require("node:util");
const {positiveId}=require("./nap-direct-calendar");
const same=(a,b)=>["id","engagement","course","tps"].every(key=>isDeepStrictEqual(a[key],b[key]));
function remaining(plan,current) {
  if(!plan || !Array.isArray(plan.plans) || plan.plans.length>100 || !Array.isArray(current) || current.length>5000) throw new TypeError("Reprise NAP bornee requise.");
  const ids=new Set();
  for(const row of current) {const id=positiveId(row.id); if(ids.has(id)) throw new TypeError("Courses natives ambigues.");ids.add(id);}
  const result={competitionId:plan.competitionId,clubId:plan.clubId,plans:[]},links=new Set();
  for(const saved of plan.plans) {
    const id=positiveId(saved.inscriptionId);
    if(links.has(id)) throw new TypeError("Inscription ambigue.");links.add(id);
    for(const key of ["before","updates","removals","additions"]) if(!Array.isArray(saved[key]) || saved[key].length>5000) throw new TypeError("Sauvegarde incomplete.");
    const rows=current.filter(row=>Number(row.engagement)===id),byId=new Map(rows.map(row=>[Number(row.id),row]));
    const beforeIds=new Set(saved.before.map(row=>positiveId(row.id))),updates=[],removals=[];
    if(beforeIds.size!==saved.before.length) throw new TypeError("Sauvegarde ambigue.");
    for(const old of saved.before) {
      if(Number(old.engagement)!==id) throw new TypeError("Sauvegarde hors inscription.");
      const row=byId.get(Number(old.id)),remove=saved.removals.find(item=>Number(item.id)===Number(old.id)),update=saved.updates.find(item=>Number(item.before.id)===Number(old.id));
      if(remove && update || remove && !same(remove,old) || update && !same(update.before,old)) throw new TypeError("Operation incoherente.");
      if(remove) {if(row) {if(!same(row,old)) throw new TypeError("Course modifiee ailleurs.");removals.push(remove);} }
      else if(!row) throw new TypeError("Course retiree ailleurs.");
      else if(update) {if(same(row,old)) updates.push(update);else if(!same(row,{...old,tps:update.tps})) throw new TypeError("Temps modifie ailleurs.");}
      else if(!same(row,old)) throw new TypeError("Course modifiee ailleurs.");
    }
    for(const remove of saved.removals) if(!beforeIds.has(Number(remove.id))) throw new TypeError("Retrait non sauvegarde.");
    for(const update of saved.updates) if(!beforeIds.has(Number(update.before.id))) throw new TypeError("Correction non sauvegardee.");
    const extras=rows.filter(row=>!beforeIds.has(Number(row.id))),matched=new Set(),additions=[];
    for(const addition of saved.additions) {
      if(Number(addition.engagement)!==id || saved.before.some(row=>row.course===addition.course)) throw new TypeError("Ajout incoherent.");
      const matches=extras.filter(row=>row.course===addition.course && row.tps===addition.tps);
      if(matches.length>1) throw new TypeError("Ajout natif duplique.");
      if(matches.length===1) {if(matched.has(matches[0].id)) throw new TypeError("Ajout duplique dans la sauvegarde.");matched.add(matches[0].id);} else additions.push(addition);
    }
    if(extras.some(row=>!matched.has(row.id))) throw new TypeError("Course ajoutee ailleurs.");
    result.plans.push({...saved,before:rows.map(row=>({...row})),updates,removals,additions});
  }
  // Entries of swimmers outside the operation may change independently.
  return {...result,complete:result.plans.every(row=>!row.updates.length && !row.removals.length && !row.additions.length)};
}
module.exports={remaining};
