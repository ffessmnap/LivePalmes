"use strict";
// One grouped exception query for a previously grouped NAP history. No old
// sporting collection, per-person query, performance export or hidden scan.
const {positiveId}=require('./nap-direct-calendar');
const {evaluatePerson}=require('./nap-qualification-evaluation');
const grants=require('./nap-qualification-grants');
async function readEvaluations(connection,input){
  const {pack,people,histories,events,categoryFor}=input;
  if(!Array.isArray(people)||people.length>100||!(histories instanceof Map)||typeof categoryFor!=='function')throw new TypeError('Evaluations NAP groupees requises.');
  const result=new Map();if(!people.length)return result;
  const ids=people.map(person=>positiveId(person.id));if(new Set(ids).size!==ids.length)throw new TypeError('Nageurs dupliques dans le controle.');
  const id=positiveId(pack.event.id),maximum=people.length*64;
  const [rows]=await connection.execute({sql:`SELECT competition_id,swimmer_id,event_code,club_id,status,reason,approved_by,approved_at,revoked_by,revoked_at,version FROM livepalmes_qualification_grants FORCE INDEX (PRIMARY) WHERE competition_id=? AND swimmer_id IN (${ids.map(()=>'?').join(',')}) ORDER BY swimmer_id,event_code LIMIT ${maximum+1}`,timeout:10000},[id,...ids]);
  if(rows.length>maximum||rows.some(row=>Number(row.competition_id)!==id||!ids.includes(Number(row.swimmer_id))))throw new TypeError('Exceptions de qualification hors selection.');
  for(const person of people){
    const approved=grants.validate(rows.filter(row=>Number(row.swimmer_id)===Number(person.id)),{competitionId:id,swimmerId:person.id,clubId:person.clubId});
    result.set(String(person.id),evaluatePerson({pack,person,events,rows:histories.get(String(person.id))||[],grants:approved,categoryFor}).evaluation);
  }
  return result;
}
module.exports={readEvaluations};
