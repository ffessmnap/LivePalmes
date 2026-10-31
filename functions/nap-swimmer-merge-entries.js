"use strict";
const {createHash}=require("node:crypto"),{isDeepStrictEqual:equal}=require("node:util");
const canonical=row=>Object.keys(row).sort().map(key=>[key,row[key]]);
function resolve(input,snapshots){
  const parents=new Map(snapshots.nageursengager.map(row=>[Number(row.id),row]));
  const byCompetition=new Map(),redirect=new Map(),groups=new Map();
  for(const row of snapshots.nageursengager){
    const key=JSON.stringify([row.compet,String(row.nageur)]);
    if(byCompetition.has(key))throw new TypeError("Inscription native ambigue a verifier.");
    byCompetition.set(key,row);
  }
  for(const row of snapshots.nageursengager){
    const target=byCompetition.get(JSON.stringify([row.compet,String(input.targetSwimmerId)]));
    if(target&&Number(target.id)!==Number(row.id))redirect.set(Number(row.id),Number(target.id));
  }
  for(const row of snapshots.engagements){
    const parent=parents.get(Number(row.engagement));
    if(!parent)throw new TypeError("Course hors inscriptions capturees.");
    const key=JSON.stringify([redirect.get(Number(parent.id))||Number(parent.id),row.course]);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }
  const token=createHash("sha256").update(JSON.stringify([String(input.sourceSwimmerId),String(input.targetSwimmerId),...['nageursengager','engagements'].map(table=>snapshots[table].slice().sort((a,b)=>Number(a.id)-Number(b.id)).map(canonical))])).digest("hex");
  const selections=input.entryConflictChoices;
  if(selections!==undefined&&(!Array.isArray(selections)||selections.length>100||selections.some(row=>!row||Object.keys(row).sort().join(",")!=="id,key"||typeof row.key!=="string"||!Number.isSafeInteger(Number(row.id))||Number(row.id)<=0)||new Set(selections.map(row=>row.key)).size!==selections.length))throw new TypeError("Choix des engagements invalides.");
  if((selections!==undefined||input.entryConflictToken!==undefined)&&input.entryConflictToken!==token)throw new TypeError("Les engagements ont change. Relancez la fusion pour refaire les choix.");
  const choices=new Map((selections||[]).map(row=>[row.key,String(row.id)])),conflicts=[],used=new Set(),removals=new Set();
  for(const [key,rows] of groups){
    const targetRows=rows.filter(row=>Number(parents.get(Number(row.engagement)).nageur)===Number(input.targetSwimmerId));
    const priority=(targetRows.length?targetRows:rows).slice().sort((a,b)=>Number(a.id)-Number(b.id));
    const fields=row=>Object.fromEntries(Object.entries(row).filter(([name])=>!['id','engagement'].includes(name)));
    let kept=priority[0];
    if(priority.some(row=>!equal(fields(row),fields(kept)))){
      const selected=choices.get(key);used.add(key);
      if(selected){kept=priority.find(row=>String(row.id)===selected);if(!kept)throw new TypeError("Engagement choisi hors de la fiche prioritaire.");}
      else{
        const parent=parents.get(Number(kept.engagement));
        conflicts.push({key,competitionId:String(parent.compet),course:String(kept.course),swimmerId:String(parent.nageur),choices:priority.map(row=>({id:String(row.id),fields:fields(row)}))});
      }
    }
    for(const row of rows)if(row!==kept)removals.add(Number(row.id));
  }
  if([...choices.keys()].some(key=>!used.has(key)))throw new TypeError("Choix d'engagement sans conflit correspondant.");
  if(conflicts.length>100)throw new RangeError("Plus de 100 conflits d'engagements. Verification specifique requise.");
  if(conflicts.length){const error=new TypeError("Choisissez les engagements a conserver avant de fusionner.");error.mergeConflicts={token,conflicts};throw error;}
  return {redirect,removals,...(used.size?{resolution:{version:1,token,choices:[...choices].map(([key,id])=>({key,id})).sort((a,b)=>a.key.localeCompare(b.key))}}:{})};
}
module.exports={resolve};
