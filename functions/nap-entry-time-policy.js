"use strict";
// NAP's existing three modes, confirmed by Antoine on 8 October. No reads.
function policy(value) {
  if(value == null || value === "" || ![-1,0,1].includes(Number(value))) throw new TypeError("Mode natif de saisie des temps inconnu.");
  return Number(value)===1 ? "manual" : Number(value)===0 ? "default595999" : "forbidden";
}
function known(entry,rows,competition,parse) {
  if(String(entry.manualEntryTime||"").trim()) throw new TypeError("La saisie libre n'est pas autorisee dans ce mode.");
  const code=String(entry.eventCode||"").toUpperCase().replace(/\s+/g,"");
  const choices=rows.filter(row=>row.course===code && Number(row.timeValue)>0 && row.active!==false && row.status!=="hidden" &&
    (!competition.qualificationStartDate || row.date>=competition.qualificationStartDate) &&
    (!competition.qualificationEndDate || row.date<=competition.qualificationEndDate));
  const requested=parse(String(entry.entryTime||"").trim());
  const row=choices.find(row=>requested && Number(row.timeValue)===Number(requested.value));
  if(!row) throw new TypeError("Choisissez un temps connu dans NAP pendant la periode autorisee.");
  return {eventCode:code,status:"selected",entryTimeMode:"known",entryTime:row.time,entryTimeValue:row.timeValue,sourcePerformanceId:String(row.id),date:row.date,location:row.location};
}
module.exports={policy,known};
