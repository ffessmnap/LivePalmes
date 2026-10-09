"use strict";
const {COLUMNS,positiveId,nativeRow}=require("./nap-performance-change-plan");
const {parseCompactTime}=require("./nap-performance-normalization");
const {hash}=require("./nap-import-preview");
const {planImportDiff}=require("./nap-import-diff");
const RELAY_COLUMNS=["id","club","distance","nageur1","nageur2","nageur3","nageur4","tps1","tps2","tps3","tps4","categorie","pts","compet"];
function canonical(row,columns,{equivalentTimes=false}={}) {
  return JSON.stringify(columns.map(key=>[key,row[key]===null?null:equivalentTimes&&/^(tps|tps[1-4])$/.test(key)?parseCompactTime(row[key])||String(row[key]):String(row[key])]));
}
function tableDiff(before,incoming,columns) {
  const queues=new Map(),fields=columns.filter(c=>c!=="id");
  // WinPalme does not supply NAP's secondary score or parent reference.
  // Matching an unchanged sporting result must retain those native values.
  const matchingFields=fields.filter(c=>c!=="newpoints"&&c!=="pid");
  for(const row of [...before].sort((a,b)=>a.id-b.id)) {
    positiveId(row.id);
    if(columns.some(c=>!Object.hasOwn(row,c)))throw new TypeError("Avant-image native incomplete.");
    const key=canonical(row,matchingFields,{equivalentTimes:true}),queue=queues.get(key)||[];queue.push(row);queues.set(key,queue);
  }
  if(new Set(before.map(r=>r.id)).size!==before.length)throw new TypeError("Avant-image en doublon.");
  const unchanged=[],additions=[];
  for(const item of incoming) {
    if(fields.some(c=>!Object.hasOwn(item.row,c))||Object.keys(item.row).length!==fields.length)throw new TypeError("Resultat propose incomplet.");
    const key=canonical(item.row,matchingFields,{equivalentTimes:true}),match=queues.get(key)?.shift();
    if(match)unchanged.push({sourceLine:item.sourceLine,row:match});else additions.push(item);
  }
  return {unchanged,additions,removals:[...queues.values()].flat().sort((a,b)=>a.id-b.id)};
}
function previewImportDifferences(pack) {
  if(!pack?.canConfirm)throw new TypeError("Resoudre toutes les lignes et rattachements avant confirmation.");
  if(pack.incoming.length)planImportDiff({competitionId:pack.competition.id,existing:[],incoming:pack.incoming.map(i=>i.row)});
  for(const {row} of pack.incomingRelays) {
    for(const key of ["nageur1","nageur2","nageur3","nageur4","compet"])positiveId(row[key]);
    if(new Set([row.nageur1,row.nageur2,row.nageur3,row.nageur4]).size!==4||row.compet!==pack.competition.id)throw new TypeError("Composition de relais invalide.");
    if(typeof row.club!=="string"||!/^\d{1,16}$/.test(row.club)||typeof row.distance!=="string"||!/^4X\d{2,4}(SF|BI|IS|AP)$/.test(row.distance)||row.distance.length>10||typeof row.categorie!=="string"||!row.categorie||row.categorie.length>6||!Number.isSafeInteger(row.pts)||row.pts<0||row.pts>2147483647)throw new TypeError("Resultat de relais natif invalide.");
    for(const key of ["tps1","tps2","tps3","tps4"])if(typeof row[key]!=="string"||!/^\d{6}$/.test(row[key])||row[key]!=="000000"&&!parseCompactTime(row[key]))throw new TypeError("Temps de relais invalide.");
    if(!parseCompactTime(row.tps4))throw new TypeError("Temps final de relais requis.");
  }
  const individual=tableDiff(pack.existing,pack.incoming,COLUMNS),relays=tableDiff(pack.existingRelays,pack.incomingRelays,RELAY_COLUMNS);
  const summary=diff=>({unchanged:diff.unchanged.length,additions:diff.additions.length,removals:diff.removals.length});
  return {individual,relays,summary:{individual:summary(individual),relays:summary(relays),statuses:pack.statusRows.length,excluded:pack.decoded.excluded.length},requiresReplacementConfirmation:individual.removals.length+relays.removals.length>0};
}
function prepareImportOperation(pack,next,input) {
  if(!input||input.expectedFingerprint!==pack.expectedFingerprint||input.previewFingerprint!==pack.previewFingerprint)throw new TypeError("L'aperçu a change. Recommencez avant confirmation.");
  const diff=previewImportDifferences(pack);
  if(diff.requiresReplacementConfirmation&&input.confirmReplacement!==true)throw new TypeError("Confirmez explicitement les resultats retires avant remplacement.");
  const assemble=(before,change,first,columns)=>{
    positiveId(first);
    if(first+change.additions.length>2147483647)throw new RangeError("Identifiants natifs hors limite.");
    if(before.some(r=>r.id>=first))throw new TypeError("Allocation native incoherente.");
    const additions=change.additions.map((item,index)=>({...item,row:Object.fromEntries(columns.map(key=>[key,key==="id"?first+index:item.row[key]]))}));
    return {before,after:[...change.unchanged.map(i=>i.row),...additions.map(i=>i.row)].sort((a,b)=>a.id-b.id),additions,removals:change.removals};
  };
  return {competitionId:positiveId(pack.competition.id),expectedFingerprint:pack.expectedFingerprint,previewFingerprint:pack.previewFingerprint,
    perfs:assemble(pack.existing,diff.individual,next.perfs,COLUMNS),relays:assemble(pack.existingRelays,diff.relays,next.relays,RELAY_COLUMNS),
    statusRows:pack.statusRows,excluded:pack.decoded.excluded,summary:diff.summary};
}
function pendingTableChanges(current,plan,columns) {
  if(new Set(current.map(r=>r.id)).size!==current.length)throw new TypeError("Etat natif ambigu.");
  const before=new Map(plan.before.map(r=>[r.id,r])),after=new Map(plan.after.map(r=>[r.id,r])),actual=new Map(current.map(r=>[r.id,r]));
  const equal=(a,b)=>Boolean(a&&b)&&canonical(a,columns)===canonical(b,columns);
  for(const row of current)if(!equal(row,before.get(row.id))&&!equal(row,after.get(row.id)))throw new TypeError("Resultats modifies pendant l'import. Verification requise.");
  for(const row of plan.after)if(before.has(row.id)&&!actual.has(row.id))throw new TypeError("Un resultat conserve a disparu.");
  for(const row of plan.before)if(after.has(row.id)&&!equal(actual.get(row.id),row))throw new TypeError("Un resultat conserve a change.");
  return {removals:plan.removals.filter(row=>actual.has(row.id)),additions:plan.additions.filter(item=>!actual.has(item.row.id))};
}
function tableFingerprint(rows,columns){return hash([...rows].sort((a,b)=>a.id-b.id).map(r=>canonical(r,columns)));}
module.exports={RELAY_COLUMNS,canonical,tableDiff,previewImportDifferences,prepareImportOperation,pendingTableChanges,tableFingerprint};
