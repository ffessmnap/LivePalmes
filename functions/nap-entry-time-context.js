"use strict";
// Read-only context for at most 50 previewed swimmers, or one saved-course
// history. Never load the full dossier (relays, officials and options).
const { positiveId } = require("./nap-calendar-values");
const { bounded } = require("./nap-competition-query");
const { person } = require("./nap-swimmer-profile");
const license=require("./nap-license-state"),merge=require("./nap-swimmer-merge-state");
async function readEntryTimeContext(connection,input,authorize) {
  if(typeof authorize!=="function" || !/^\d{1,16}$/.test(String(input?.clubId)) || !Array.isArray(input?.swimmerIds) || !input.swimmerIds.length || input.swimmerIds.length>50) throw new TypeError("Contexte d'apercu borne et autorise requis.");
  const competitionId=positiveId(input.competitionId),clubId=String(input.clubId),ids=input.swimmerIds.map(positiveId);
  if(new Set(ids).size!==ids.length) throw new TypeError("Nageurs dupliques.");
  const includeIndividualEntries=input.includeIndividualEntries===true;
  if(includeIndividualEntries && ids.length!==1) throw new TypeError("Historique des courses reserve a un nageur.");
  await authorize({competitionId,clubId});
  const marks=ids.map(()=>"?").join(","),limit=ids.length+1;
  const rows=await bounded(connection,
    `SELECT n.*,cl.abre_club,cl.nom_club,${license.projection()},${merge.projection} FROM nageurs n FORCE INDEX (PRIMARY) LEFT JOIN clubs cl ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club ${license.join()} ${merge.join} WHERE n.id IN (${marks}) AND n.club=? AND m.swimmer_id IS NULL ORDER BY n.id LIMIT ${limit}`,
    [...ids,clubId],ids.length);
  const swimmers=rows.map(person);
  if(swimmers.some(row=>!ids.includes(Number(row.id)) || row.clubId!==clubId) || new Set(swimmers.map(row=>row.id)).size!==swimmers.length) throw new TypeError("Nageurs hors du club autorise ou ambigus.");
  if(includeIndividualEntries && swimmers.length!==1) throw new TypeError("Nageur non engage ou hors du club autorise.");
  // Previews need membership only. History needs every saved inscription ID,
  // including duplicates, to recover the swimmer's actual saved courses.
  const inscriptions=await bounded(connection,
    includeIndividualEntries
      ? `SELECT id,nageur,compet FROM nageursengager FORCE INDEX (livepalmes_compet_nageur_id) WHERE compet=? AND nageur IN (${marks}) ORDER BY nageur,id LIMIT 801`
      : `SELECT nageur FROM nageursengager FORCE INDEX (livepalmes_compet_nageur_id) WHERE compet=? AND nageur IN (${marks}) GROUP BY nageur ORDER BY nageur LIMIT ${limit}`,
    [competitionId,...ids],includeIndividualEntries?800:ids.length);
  if(inscriptions.some(row=>!ids.includes(Number(row.nageur)))) throw new TypeError("Inscription hors selection.");
  const leaders=await bounded(connection,
    "SELECT id,compet,nom,prenom,date,club,pourclub FROM chefsdequipe FORCE INDEX (livepalmes_compet_id) WHERE compet=? AND (club=? OR pourclub=?) ORDER BY id LIMIT 21",
    [competitionId,clubId,clubId],20);
  if(!includeIndividualEntries) return {swimmers,inscriptions,leaders};
  const inscriptionIds=inscriptions.map(row=>positiveId(row.id));
  const individual=inscriptionIds.length ? await bounded(connection,
    `SELECT id,engagement,course,tps FROM engagements FORCE INDEX (engagements_clef) WHERE engagement IN (${inscriptionIds.map(()=>"?").join(",")}) ORDER BY engagement,course,id LIMIT 5001`,
    inscriptionIds,5000) : [];
  return {swimmers,inscriptions,leaders,individual};
}
module.exports={readEntryTimeContext};
