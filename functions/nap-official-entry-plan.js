"use strict";
// Preparation only: no database connection or write. The future caller must
// authorize the native competition/club before loading the bounded dossier.
// 80 selected identities at most, one grouped PK read for new selections.
const {positiveId,date}=require("./nap-direct-calendar");
const {person}=require("./nap-club-people");
const {identity}=require("./nap-club-person-edit");
function officialIds(values) {
  if(!Array.isArray(values) || values.length>80) throw new RangeError("80 officiels maximum.");
  return [...new Set(values.map(value=>{
    if(typeof value!=="string" || !/^nap-official-[1-9]\d*$/.test(value)) throw new TypeError("Fiche officiel NAP requise.");
    return positiveId(value.slice("nap-official-".length));
  }))];
}
function planOfficials(pack,values,people) {
  const selected=officialIds(values),selectedSet=new Set(selected);
  if(!pack || !/^\d{1,16}$/.test(String(pack.clubId)) || !Array.isArray(pack.officials) || pack.officials.length>200 || !Array.isArray(people) || people.length>80) throw new TypeError("Dossier NAP borne requis.");
  const competitionId=positiveId(pack.competitionId),clubId=String(pack.clubId);
  const before=pack.officials.map(row=>{
    if(Number(row.compet)!==competitionId || String(row.club)!==clubId) throw new TypeError("Officiel hors du dossier autorise.");
    return {id:positiveId(row.id),compet:row.compet,officiel:positiveId(row.officiel),club:row.club};
  });
  if(new Set(before.map(row=>row.id)).size!==before.length) throw new TypeError("Liens NAP ambigus.");
  const present=new Set(before.map(row=>row.officiel)),addIds=selected.filter(id=>!present.has(id));
  const removals=before.filter(row=>!selectedSet.has(row.officiel));
  if(before.length-removals.length+addIds.length>200) throw new RangeError("200 liens officiels maximum dans ce dossier borne.");
  // Keep historical duplicates/orphans unchanged when their person remains
  // selected. Do not use this action to repair or merge native identities.
  if(!addIds.length && !removals.length) return {competitionId,clubId,before,additions:[],removals};
  if(!Array.isArray(pack.leaders) || pack.leaders.length!==1 || !String(pack.leaders[0].nom || "").trim() || !String(pack.leaders[0].prenom || "").trim()) throw new TypeError("Chef d'equipe NAP a verifier avant l'ajout. Renonciation encore a raccorder.");
  const leader=pack.leaders[0];
  if(Number(leader.compet)!==competitionId || ![String(leader.club),String(leader.pourclub)].includes(clubId)) throw new TypeError("Chef hors du dossier autorise.");
  if(!addIds.length) return {competitionId,clubId,before,additions:[],removals};
  const enrolled=new Set((pack.inscriptions || []).map(row=>String(row.nageur)));
  for(const row of pack.members || []) enrolled.add(String(row.nageur));
  const participants=(pack.swimmers || []).filter(row=>enrolled.has(String(row.id))).map(row=>({nom:row.lastName,prenom:row.firstName,date:row.birthDate}));
  const used=pack.officials.filter(row=>selectedSet.has(Number(row.officiel)));
  const additions=[];
  for(const id of addIds) {
    const matches=people.filter(item=>Number(item.native?.id)===id);
    if(matches.length!==1) throw new TypeError("Officiel NAP introuvable ou ambigu.");
    const {native,options}=matches[0],dto=person(native,"officials",options);
    if(!dto.firstName || !dto.lastName || dto.clubId!==clubId || !dto.active || !dto.roles.official) throw new TypeError("Officiel hors club, inactif ou sans role officiel.");
    if(date(native.date) && [leader,...participants,...used,...additions].some(row=>identity(row)===identity(native))) throw new TypeError("Cette personne est deja chef, nageur ou officiel dans ce dossier.");
    additions.push({...native});
  }
  return {competitionId,clubId,before,additions,removals};
}
module.exports={officialIds,planOfficials};
