"use strict";
// Inspection only: never execute prepared writes or return people's identities.
const {readNativeCompetition}=require("./nap-portal-competitions");
const {planSelection}=require("./nap-swimmer-entry-plan");
const {statements}=require("./nap-swimmer-entry-statements");
const {indexed}=require("./nap-swimmer-entry-change");
async function inspectSelection(connection,pack,readCompetition=readNativeCompetition) {
  if(pack.leaders.length!==1 || !pack.inscriptions.length) return {available:false,writesExecuted:false};
  const link=pack.inscriptions.find(row=>pack.inscriptions.filter(peer=>Number(peer.nageur)===Number(row.nageur)).length===1 && pack.members.some(member=>Number(member.nageur)===Number(row.nageur))) || pack.inscriptions.find(row=>pack.inscriptions.filter(peer=>Number(peer.nageur)===Number(row.nageur)).length===1);
  if(!link) return {available:false,writesExecuted:false};
  const competition=await readCompetition(connection,pack.competitionId,()=>{});
  if(!competition || Number(competition.nativeSnapshot.parameters.actif)!==1 || !competition.event.entryDeadlineAt) return {available:false,writesExecuted:false};
  const authority={competitions:competition.nativeSnapshot.competition,compet_parametres:competition.nativeSnapshot.parameters,options:competition.options,nativeLeader:pack.leaders[0]};
  const removal=planSelection(pack,[{swimmerId:link.nageur,selected:false}]);
  const person=removal.removals[0].swimmer;
  const samples=[...statements(removal,authority,competition.event.entryDeadlineAt),...statements({competitionId:removal.competitionId,clubId:removal.clubId,additions:[person],removals:[]},authority,competition.event.entryDeadlineAt)];
  const plans=[];
  for(const sample of samples) {
    const [rows]=await connection.execute({sql:`EXPLAIN ${sample.sql}`,timeout:10000},sample.values);
    plans.push({kind:sample.kind,indexed:indexed(sample,rows),plan:rows.map(({select_type,table,type,key,rows,Extra})=>({select_type,table,type,key,rows,Extra}))});
  }
  return {available:true,indexed:plans.every(row=>row.indexed),explainCount:plans.length,relayRemovalInspected:plans.some(row=>row.kind==="engagements_relayeurs"),plans,writesExecuted:false};
}
module.exports={inspectSelection};
