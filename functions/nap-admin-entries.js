"use strict";
// One competition, nine grouped queries maximum after authorization. No
// per-club dossier or performance history read, cache reconstruction or write.
const {positiveId}=require("./nap-direct-calendar");
const {bounded}=require("./nap-portal-competitions");
const {person}=require("./nap-portal-swimmers");
const {entryItem}=require("./nap-portal-workspaces");
const {storedCategory}=require("./nap-relay-resolution");
const licenseState=require("./nap-license-state");
const LIMITS=Object.freeze({inscriptions:5000,individual:20000,relays:2000,members:8000,officials:2000,leaders:1000,options:500,clubs:500,categories:200});
async function readAdminEntries(connection,input,authorize,services) {
  const id=positiveId(input?.competitionId);
  if(typeof authorize!=="function" || typeof services?.category!=="function" || !input.competition) throw new TypeError("Competition et controle administrateur requis.");
  await authorize(input.competition);
  const read=(key,sql,values=[id])=>bounded(connection,sql,values,LIMITS[key]);
  const inscriptions=await read("inscriptions",`SELECT e.id AS inscription_id,e.compet,n.id,n.nom,n.prenom,n.date,n.sexe,n.number,n.club,${licenseState.projection()} FROM nageursengager e FORCE INDEX (livepalmes_compet_nageur_id) LEFT JOIN nageurs n ON n.id=e.nageur ${licenseState.join()} WHERE e.compet=? ORDER BY e.nageur,e.id LIMIT 5001`);
  if(inscriptions.some(row=>!row.id || !row.club)) throw new TypeError("Inscription NAP sans fiche ou club : verification requise.");
  const individual=await read("individual","SELECT g.id,g.engagement,g.course,g.tps FROM nageursengager e FORCE INDEX (livepalmes_compet_nageur_id) STRAIGHT_JOIN engagements g FORCE INDEX (engagements_clef) ON g.engagement=e.id WHERE e.compet=? ORDER BY e.nageur,e.id,g.course,g.id LIMIT 20001");
  const relays=await read("relays","SELECT r.id,r.compet,r.categorie,r.club,r.course,r.tps,d.course AS course_code,d.sexe,d.relais FROM engagements_relais r FORCE INDEX (livepalmes_compet_club_id) LEFT JOIN course_dispo d ON d.id=r.course WHERE r.compet=? ORDER BY r.club,r.id LIMIT 2001");
  const members=await read("members",`SELECT m.id,m.relais,m.pos,m.nageur,n.nom,n.prenom,n.date,n.sexe,n.number,n.club,${licenseState.projection()} FROM engagements_relais r FORCE INDEX (livepalmes_compet_club_id) STRAIGHT_JOIN engagements_relayeurs m FORCE INDEX (livepalmes_relais_pos_id) ON m.relais=r.id LEFT JOIN nageurs n ON n.id=m.nageur ${licenseState.join()} WHERE r.compet=? ORDER BY r.club,r.id,m.pos,m.id LIMIT 8001`);
  const officials=await read("officials","SELECT e.id,e.compet,e.officiel,e.club,COALESCE(h.nom,o.nom) AS nom,COALESCE(h.prenom,o.prenom) AS prenom,COALESCE(h.date,o.date) AS date FROM officielsengager e FORCE INDEX (livepalmes_compet_club_id) LEFT JOIN officiels o ON o.id=e.officiel LEFT JOIN livepalmes_deleted_people_history h ON h.engagement_id=e.id AND h.person_id=e.officiel AND h.competition_id=e.compet AND h.entry_club=e.club WHERE e.compet=? ORDER BY e.club,e.id LIMIT 2001");
  const leaders=await read("leaders","SELECT id,compet,nom,prenom,date,club,pourclub FROM chefsdequipe FORCE INDEX (livepalmes_compet_id) WHERE compet=? ORDER BY id LIMIT 1001");
  const options=await read("options","SELECT * FROM livepalmes_club_entry_options FORCE INDEX (PRIMARY) WHERE competition_id=? ORDER BY club_id LIMIT 501");
  const clubId=row=>String(row.club),ids=new Set([...inscriptions,...relays,...officials].map(clubId));
  leaders.forEach(row=>ids.add(String(row.pourclub && row.pourclub!=="0" ? row.pourclub : row.club)));
  if(ids.size>500 || [...ids].some(value=>!/^\d{1,16}$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value)<=0)) throw new TypeError("Clubs NAP absents ou ambigus : verification requise.");
  const clubs=ids.size ? await read("clubs",`SELECT num_club,abre_club,nom_club,federal_club,comite_club FROM clubs FORCE INDEX (PRIMARY) WHERE num_club IN (${[...ids].map(()=>"?").join(",")}) ORDER BY num_club LIMIT 501`,[...ids]) : [];
  if(clubs.length!==ids.size || clubs.some(row=>!ids.has(String(row.num_club)))) throw new TypeError("Referentiel des clubs NAP incomplet.");
  const categories=relays.length ? await read("categories","SELECT id,abbr,sexe FROM categories FORCE INDEX (PRIMARY) WHERE id>0 ORDER BY id LIMIT 201",[]) : [];
  const readAt=new Date().toISOString(),entries=[];
  for(const club of clubs) {
    const clubId=String(club.num_club),selected=inscriptions.filter(row=>String(row.club)===clubId),links=selected.map(row=>({id:row.inscription_id,nageur:row.id,compet:row.compet}));
    const linkIds=new Set(links.map(row=>String(row.id))),teams=relays.filter(row=>String(row.club)===clubId),teamIds=new Set(teams.map(row=>String(row.id)));
    const pack={competitionId:String(id),clubId,readAt,swimmers:selected.map(person),inscriptions:links,individual:individual.filter(row=>linkIds.has(String(row.engagement))),relays:teams,members:members.filter(row=>teamIds.has(String(row.relais))),officials:officials.filter(row=>String(row.club)===clubId),leaders:leaders.filter(row=>String(row.club)===clubId || String(row.pourclub)===clubId),options:options.find(row=>String(row.club_id)===clubId)||null};
    const entry=entryItem(pack,{clubCode:club.abre_club,clubName:club.nom_club},birthDate=>services.category(input.competition.date,birthDate),input.competition);
    entry.relays.forEach((relay,index)=>{const detail=storedCategory(teams[index],categories,pack.options?.submission_metadata);if(detail) Object.assign(relay,detail);});
    entries.push(entry);
  }
  return {source:"nap",entries,clubsById:new Map(clubs.map(club=>[String(club.num_club),{id:String(club.num_club),clubCode:club.abre_club,clubName:club.nom_club,federalNumber:club.federal_club,regionId:String(club.comite_club)}])),generatedAt:readAt,sqlBudget:{queriesMax:9,rowsMax:Object.values(LIMITS).reduce((sum,value)=>sum+value,0),writesMax:0}};
}
module.exports={LIMITS,readAdminEntries};
