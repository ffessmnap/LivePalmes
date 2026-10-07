"use strict";
// Private EXPLAIN proof only. Never execute the prepared INSERT/UPDATE/DELETE,
// even if a plan is indexed. No identity or sporting value leaves this proof.
const {readNativeCompetition}=require("./nap-portal-competitions");
const {statements}=require("./nap-individual-entry-statements");
async function inspectStatements(connection,pack,readCompetition=readNativeCompetition) {
  const link=pack.inscriptions.find(link=>pack.inscriptions.filter(row=>Number(row.nageur)===Number(link.nageur)).length===1 && pack.individual.some(row=>Number(row.engagement)===Number(link.id) && /^[A-Z0-9]{1,32}$/.test(row.course) && /^\d{1,6}$/.test(row.tps) && Number(row.tps.slice(-4,-2)||0)<=59));
  if(!link) return {available:false,reason:"no-unambiguous-course",writesExecuted:false};
  const row=pack.individual.find(row=>Number(row.engagement)===Number(link.id) && /^[A-Z0-9]{1,32}$/.test(row.course) && /^\d{1,6}$/.test(row.tps) && Number(row.tps.slice(-4,-2)||0)<=59);
  const competition=await readCompetition(connection,pack.competitionId,()=>{});
  if(!competition || competition.event.entryStatus!=="open" || !competition.event.entryDeadlineAt) return {available:false,reason:"competition-not-open",writesExecuted:false};
  const authority={competitions:competition.nativeSnapshot.competition,compet_parametres:competition.nativeSnapshot.parameters,options:competition.options,...(pack.leaders?.length===1?{nativeLeader:pack.leaders[0]}:{})};
  const base={swimmerId:link.nageur,inscriptionId:link.id,before:[row],removals:[],updates:[],additions:[]};
  const samples=[{...base,removals:[row]},{...base,updates:[{before:row,tps:row.tps}]},{...base,before:[],additions:[{engagement:row.engagement,course:row.course,tps:row.tps}]}];
  const plans=[];
  for(const sample of samples) {
    const [statement]=statements({competitionId:pack.competitionId,clubId:pack.clubId,plans:[sample]},authority,competition.event.entryDeadlineAt);
    const [raw]=await connection.execute({sql:`EXPLAIN ${statement.sql}`,timeout:10000},statement.values);
    plans.push({kind:statement.kind,plan:raw.map(({select_type,table,type,key,rows,Extra})=>({select_type,table,type,key,rows,Extra}))});
  }
  const indexed=plans.every(item=>item.plan.length && item.plan.every(row=>item.kind==="insert" && row.select_type==="INSERT" && row.table==="engagements" || String(row.table).startsWith("<") || ["const","system"].includes(row.type) || row.rows!=null && Number(row.rows)===0 || row.table==null && row.type==null && /^(?:Impossible WHERE(?: noticed after reading const tables)?|no matching row in const table|No tables used)$/i.test(String(row.Extra||"")) || row.type!=="ALL" && Boolean(row.key)));
  return {available:true,indexed,plans,explainCount:3,writesExecuted:false};
}
module.exports={inspectStatements};
