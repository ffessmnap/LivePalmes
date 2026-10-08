"use strict";
// Native preview only: no engagement writes and no exported performance cache.
// Budget: existing competition (14), dossier (8), one grouped history query.
const {positiveId}=require("./nap-direct-calendar");
const {readNativeCompetition}=require("./nap-portal-competitions");
const {readNativeClubEntry}=require("./nap-portal-entries");
const {readEntryHistory}=require("./nap-entry-performance-history");
async function previewNativeTimes(connection,input,services) {
  if(typeof services?.authorize!=="function" || typeof services?.preview!=="function" || !/^\d{1,16}$/.test(String(input?.clubId)) || !Array.isArray(input?.swimmerIds) || !input.swimmerIds.length || input.swimmerIds.length>50) throw new TypeError("Apercu NAP borne et autorise requis.");
  const competitionId=positiveId(input.competitionId),clubId=String(input.clubId),ids=input.swimmerIds.map(positiveId);
  if(new Set(ids).size!==ids.length) throw new TypeError("Nageurs dupliques.");
  await services.authorize({competitionId,clubId});
  const readers=services.readers||{competition:readNativeCompetition,entry:readNativeClubEntry,history:readEntryHistory};
  const competition=await readers.competition(connection,competitionId,event=>services.authorize({competitionId,clubId,event}));
  if(!competition) throw new TypeError("Competition NAP introuvable.");
  const pack=await readers.entry(connection,{competitionId,clubId},services.authorize);
  if(pack.leaders.length!==1 || !String(pack.leaders[0].nom||"").trim() || !String(pack.leaders[0].prenom||"").trim()) throw new TypeError("Chef d'equipe NAP a verifier avant les courses.");
  if(require("./nap-entry-qualification-policy").qualificationPending(competition,{engineReady:typeof services.prepareQualifications==='function'})) throw new TypeError("Le controle des qualifications NAP reste a raccorder avant cet apercu.");
  const people=ids.map(id=>{
    const matches=pack.swimmers.filter(row=>Number(row.id)===id && String(row.clubId)===clubId);
    if(matches.length!==1 || input.enrolledOnly && !pack.inscriptions.some(row=>Number(row.nageur)===id)) throw new TypeError("Nageur non engage ou hors du club autorise.");
    return matches[0];
  });
  const participation=require("./nap-entry-participation-rules"),presence=participation.requirements(competition).presence.size>0;
  const evidence=await participation.readEvidence(connection,people,competition);
  if(competition.event.eventType==="openWater") return {ok:true,source:"nap",swimmers:people.map(person=>({swimmerIndexId:String(person.id),individualEntries:[]})),sqlBudget:{queriesMax:presence?23:22,historyQueries:0}};
  const histories=await readers.history(connection,people);
  const active=Number(competition.options?.qualifications_enabled)===1||competition.qualifications?.enabled===true;
  const evaluations=active?await services.prepareQualifications(connection,{pack:competition,people,histories}):null;
  if(active&&(!(evaluations instanceof Map)||people.some(person=>evaluations.get(String(person.id))?.enabled!==true)))throw new TypeError('Evaluations de qualification incompletes.');
  const swimmers=people.map(person=>({swimmerIndexId:String(person.id),individualEntries:require("./nap-entry-birth-policy").eligible(competition,person) && participation.eligible(competition,person.id,evidence) ? services.preview(person,participation.filterTimes(histories.get(String(person.id))||[],competition),competition,pack,evaluations?.get(String(person.id))) : []}));
  return {ok:true,source:"nap",swimmers,sqlBudget:{queriesMax:(presence?24:23)+(active?1:0),historyQueries:1,historyRowsMax:20000}};
}
module.exports={previewNativeTimes};
