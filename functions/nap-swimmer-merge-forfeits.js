"use strict";
// Historic engagement may identify an inscription or a course. Never guess
// which interpretation applies, and never rewrite a forfait during a merge.
const LIMIT=500,COLUMNS=["id","compet","engagement","forfait"];
const SQL="SELECT id,compet,engagement,forfait FROM forfait FORCE INDEX (PRIMARY) ORDER BY id LIMIT 501";
function policy(rows,snapshots){
  if(!Array.isArray(rows)||rows.length>LIMIT)throw new RangeError("Trop de forfaits historiques pour verifier cette fusion directement.");
  if(!snapshots||![snapshots.nageursengager,snapshots.engagements].every(Array.isArray))throw new TypeError("Inscriptions et courses requises pour verifier les forfaits.");
  const affected=new Set([...snapshots.nageursengager,...snapshots.engagements].map(row=>Number(row.id)));
  let previous=0;
  for(const row of rows){
    if(!row||Object.keys(row).length!==COLUMNS.length||COLUMNS.some(key=>!Object.hasOwn(row,key))||!Number.isSafeInteger(Number(row.id))||Number(row.id)<=previous)throw new TypeError("Historique des forfaits incomplet ou incoherent.");
    previous=Number(row.id);
    // Check the raw reference even when compet is stale or inconsistent.
    if(affected.has(Number(row.engagement)))throw new TypeError("Un forfait historique reference une inscription ou une course des fiches choisies. Verification nationale requise avant fusion.");
  }
  return {version:1,rows:rows.map(row=>Object.fromEntries(COLUMNS.map(key=>[key,row[key]])))};
}
function validate(value,snapshots){
  if(!value||value.version!==1||Object.keys(value).sort().join(",")!=="rows,version")throw new TypeError("Controle sauvegarde des forfaits invalide.");
  return policy(value.rows,snapshots);
}
module.exports={LIMIT,SQL,policy,validate};
