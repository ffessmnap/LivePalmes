"use strict";
// Reuse the existing LivePalmes automatic-time resolver. Keep original NAP
// times in the preview and record target times separately for safe application.
const {compact}=require('./nap-individual-entry-resolution');
function targetTimes(entries,rows,competition,automatic){
  if(!Array.isArray(entries)||entries.length>300||typeof automatic!=='function')throw new TypeError('Calcul automatique des temps requis.');
  return entries.map(entry=>{
    const result=automatic({eventCode:entry.eventCode},rows,competition);
    if(!result||!['known','default595999'].includes(result.entryTimeMode))throw new TypeError('Temps automatique de qualification incomplet.');
    const desired=result.entryTimeMode==='default595999'?'599999':compact(result.entryTimeValue);
    return {nativeId:entry.nativeId,tps:Number(desired)===Number(entry.nativeTime)?entry.nativeTime:desired};
  });
}
module.exports={targetTimes};
