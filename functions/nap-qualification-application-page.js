"use strict";
// Recheck one immutable preview page using four grouped indexed reads at most.
// Evaluate the saved original entries, so a partially applied MyISAM operation
// cannot erase its own proof or turn an interruption into an unrelated removal.
const {positiveId}=require('./nap-direct-calendar');
const {person}=require('./nap-portal-swimmers');
const {readEntryHistory}=require('./nap-entry-performance-history');
const grants=require('./nap-qualification-grants');
const engine=require('./engagement-qualification');
const {targetTimes}=require('./nap-qualification-target-times');
const {applicationPlan}=require('./nap-qualification-application-plan');
async function applicationPage(connection,input,saved,services){
  const id=positiveId(input.competitionId);
  if(input.national!==true||input.confirmed!==true||!Array.isArray(saved.items)||saved.items.length>5||typeof services?.authorize!=='function'||typeof services.categoryFor!=='function')throw new TypeError('Controle national borne requis.');
  await services.authorize({competitionId:id});
  if(!saved.items.length)return applicationPlan(input,saved,[]);
  const links=saved.items.map(item=>positiveId(item.before.inscriptionId));
  if(new Set(links).size!==links.length)throw new TypeError('Inscriptions du controle ambigues.');
  const marks=values=>values.map(()=>'?').join(',');
  const query=async(sql,values,max)=>{const [rows]=await connection.execute({sql,timeout:10000},values);if(rows.length>max)throw new RangeError('Controle trop volumineux.');return rows;};
  const identities=await query(`SELECT e.id AS inscription_id,e.nageur AS id,n.nom,n.prenom,n.date,n.sexe,n.club FROM nageursengager e FORCE INDEX (PRIMARY) LEFT JOIN nageurs n FORCE INDEX (PRIMARY) ON n.id=e.nageur WHERE e.id IN (${marks(links)}) AND e.compet=? ORDER BY e.id LIMIT 6`,[...links,id],5);
  if(identities.length!==links.length||new Set(identities.map(row=>Number(row.inscription_id))).size!==links.length)throw new TypeError('Inscriptions du controle modifiees.');
  const people=identities.map(person),ids=people.map(p=>positiveId(p.id));
  const courses=await query(`SELECT id,engagement,course,tps FROM engagements FORCE INDEX (engagements_clef) WHERE engagement IN (${marks(links)}) ORDER BY engagement,course,id LIMIT 1501`,links,1500);
  const exceptions=await query(`SELECT competition_id,swimmer_id,event_code,club_id,status,reason,approved_by,approved_at,revoked_by,revoked_at,version FROM livepalmes_qualification_grants FORCE INDEX (PRIMARY) WHERE competition_id=? AND swimmer_id IN (${marks(ids)}) ORDER BY swimmer_id,event_code LIMIT 321`,[id,...ids],320);
  if(courses.some(row=>!links.includes(Number(row.engagement)))||exceptions.some(row=>!ids.includes(Number(row.swimmer_id))))throw new TypeError('Dossier hors du controle.');
  const histories=await (services.readHistory||readEntryHistory)(connection,people),rules=input.previous.payload.rules;
  const current=identities.map((identity,index)=>{
    const p=people[index],link=positiveId(identity.inscription_id),original=saved.items.find(item=>item.before.inscriptionId===link);
    if(!original)throw new TypeError('Inscription hors de la page.');
    const approved=grants.validate(exceptions.filter(row=>Number(row.swimmer_id)===Number(p.id)),{competitionId:id,swimmerId:p.id,clubId:p.clubId});
    const rows=histories.get(String(p.id));if(!Array.isArray(rows)||rows.length>2000)throw new RangeError('Historique du controle incomplet.');
    const evaluation=engine.evaluate({rules,category:services.categoryFor(input.date,p.birthDate),sex:p.sex,events:input.events,rows,approvals:approved.map(row=>({eventCode:row.event_code,status:row.status}))});
    const result=engine.reconcile(original.before.entries,evaluation);
    return {before:{swimmerId:p.id,clubId:p.clubId,birthDate:p.birthDate,sex:p.sex,inscriptionId:link,entries:courses.filter(row=>Number(row.engagement)===link).map(row=>({eventCode:String(row.course).trim().toUpperCase(),nativeId:positiveId(row.id),nativeTime:row.tps}))},evaluation,targetTimes:rules.enabled?targetTimes(result.entries,rows,input.competition,services.automatic):result.entries.map(row=>({nativeId:row.nativeId,tps:row.nativeTime}))};
  });
  return applicationPlan(input,saved,current);
}
module.exports={applicationPage};
