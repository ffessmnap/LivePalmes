"use strict";
// Read-only context for at most 50 previewed swimmers. Never load the full dossier.
const {positiveId}=require("./nap-direct-calendar");
const {bounded}=require("./nap-portal-competitions");
const {person}=require("./nap-portal-swimmers");
const license=require("./nap-license-state"),merge=require("./nap-swimmer-merge-state");
async function readEntryTimeContext(connection,input,authorize) {
  if(typeof authorize!=="function" || !/^\d{1,16}$/.test(String(input?.clubId)) || !Array.isArray(input?.swimmerIds) || !input.swimmerIds.length || input.swimmerIds.length>50) throw new TypeError("Contexte d'apercu borne et autorise requis.");
  const competitionId=positiveId(input.competitionId),clubId=String(input.clubId),ids=input.swimmerIds.map(positiveId);
  if(new Set(ids).size!==ids.length) throw new TypeError("Nageurs dupliques.");
  await authorize({competitionId,clubId});
  const marks=ids.map(()=>"?").join(","),limit=ids.length+1;
  const rows=await bounded(connection,
    `SELECT n.*,cl.abre_club,cl.nom_club,${license.projection()},${merge.projection} FROM nageurs n FORCE INDEX (PRIMARY) LEFT JOIN clubs cl ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club ${license.join()} ${merge.join} WHERE n.id IN (${marks}) AND n.club=? AND m.swimmer_id IS NULL ORDER BY n.id LIMIT ${limit}`,
    [...ids,clubId],ids.length);
  const swimmers=rows.map(person);
  if(swimmers.some(row=>!ids.includes(Number(row.id)) || row.clubId!==clubId) || new Set(swimmers.map(row=>row.id)).size!==swimmers.length) throw new TypeError("Nageurs hors du club autorise ou ambigus.");
  // Membership only: duplicate native inscriptions keep their existing meaning.
  const inscriptions=await bounded(connection,
    `SELECT nageur FROM nageursengager FORCE INDEX (livepalmes_compet_nageur_id) WHERE compet=? AND nageur IN (${marks}) GROUP BY nageur ORDER BY nageur LIMIT ${limit}`,
    [competitionId,...ids],ids.length);
  if(inscriptions.some(row=>!ids.includes(Number(row.nageur)))) throw new TypeError("Inscription hors selection.");
  const leaders=await bounded(connection,
    "SELECT id,compet,nom,prenom,date,club,pourclub FROM chefsdequipe FORCE INDEX (livepalmes_compet_id) WHERE compet=? AND (club=? OR pourclub=?) ORDER BY id LIMIT 21",
    [competitionId,clubId,clubId],20);
  return {swimmers,inscriptions,leaders};
}
module.exports={readEntryTimeContext};
