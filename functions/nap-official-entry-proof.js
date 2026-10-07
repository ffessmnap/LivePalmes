"use strict";
// Private EXPLAIN-only proof: no sports write, identifiers/contacts or SQL
// parameters in its result. Existing dossier/directory are reused.
const {positiveId}=require("./nap-direct-calendar");
const {readNativeCompetition}=require("./nap-portal-competitions");
const {readPeople,indexed}=require("./nap-official-entry-change");
const {selectedStatement,insertion,deletion}=require("./nap-official-entry-statements");
async function inspectOfficialStatements(connection,pack,directory,reader=readNativeCompetition) {
  const candidate=directory?.people?.find(person=>person.nativePersonKind==="officials" && person.active && person.roles?.official && String(person.clubId)===String(pack.clubId));
  if(!candidate || pack.leaders?.length!==1) return {available:false,reason:!candidate?"no-native-official":"leader-to-verify",writesExecuted:false};
  const id=positiveId(candidate.nativePersonId),competitionId=positiveId(pack.competitionId),clubId=String(pack.clubId),selection=selectedStatement([id],clubId),plans=[];
  async function explain(statement) {
    const [rows]=await connection.execute({sql:`EXPLAIN ${statement.sql}`,timeout:10000},statement.values);
    plans.push({kind:statement.kind||"selection",plan:rows.map(({select_type,table,type,key,rows,Extra})=>({select_type,table,type,key,rows,Extra}))});
    return indexed(statement,rows);
  }
  if(!await explain(selection)) return {available:true,indexed:false,plans,explainCount:1,writesExecuted:false};
  const people=await readPeople(connection,[id],clubId);
  if(people.length!==1) return {available:false,reason:"person-to-verify",plans,writesExecuted:false};
  const competition=await reader(connection,competitionId,()=>{});
  if(!competition?.event.entryDeadlineAt) return {available:false,reason:"deadline-to-verify",plans,writesExecuted:false};
  const authority={competitions:competition.nativeSnapshot.competition,compet_parametres:competition.nativeSnapshot.parameters,options:competition.options,nativeLeader:pack.leaders[0]};
  const before=pack.officials[0] || {id:1,compet:competitionId,officiel:id,club:clubId};
  const plan={competitionId,clubId,additions:[people[0].native],removals:[before]};
  await explain(insertion(plan,people,authority,competition.event.entryDeadlineAt));
  await explain(deletion(plan,[before],authority,competition.event.entryDeadlineAt));
  return {available:true,indexed:plans.every(item=>indexed({kind:item.kind},item.plan)),plans,explainCount:3,writesExecuted:false};
}
module.exports={inspectOfficialStatements};
