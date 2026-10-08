"use strict";
// One native impact-preview page, never an entry write. <=5 swimmers, 4 grouped
// indexed queries (enrolments, courses, exceptions, history). No query per course
// or swimmer; rows are checked before a single sporting evaluation is returned.
const {createHash}=require('node:crypto');
const {positiveId}=require('./nap-direct-calendar');
const {person}=require('./nap-portal-swimmers');
const {readEntryHistory}=require('./nap-entry-performance-history');
const grants=require('./nap-qualification-grants');
const engine=require('./engagement-qualification');
function cursor(value){
  if(value==='')return {swimmerId:0,inscriptionId:0};
  if(typeof value!=='string'||value.length>128)throw new TypeError('Curseur de controle invalide.');
  const parsed=JSON.parse(value);
  if(!parsed||Object.keys(parsed).sort().join(',')!=='inscriptionId,swimmerId')throw new TypeError('Curseur de controle invalide.');
  return {swimmerId:positiveId(parsed.swimmerId),inscriptionId:positiveId(parsed.inscriptionId)};
}
async function previewPage(connection,input,services){
  const id=positiveId(input.competitionId),position=cursor(input.cursor),rules=engine.validateRules(input.rules,input.events,true);
  if(input.national!==true||typeof services?.authorize!=='function'||typeof services.categoryFor!=='function')throw new TypeError('Apercu national requis.');
  await services.authorize({competitionId:id});
  const query=async(sql,values,max)=>{const [rows]=await connection.execute({sql,timeout:10000},values);if(rows.length>max)throw new RangeError('Lot de controle trop volumineux.');return rows;};
  const raw=await query('SELECT e.id AS inscription_id,e.nageur AS id,n.nom,n.prenom,n.date,n.sexe,n.club FROM nageursengager e FORCE INDEX (livepalmes_compet_nageur_id) LEFT JOIN nageurs n FORCE INDEX (PRIMARY) ON n.id=e.nageur WHERE e.compet=? AND (e.nageur>? OR (e.nageur=? AND e.id>?)) ORDER BY e.nageur,e.id LIMIT 6',[id,position.swimmerId,position.swimmerId,position.inscriptionId],6);
  const seen=new Set();
  for(const row of raw){const swimmer=positiveId(row.id);positiveId(row.inscription_id);if(swimmer===position.swimmerId||seen.has(swimmer)||!row.club||!row.date||!['M','F'].includes(row.sexe))throw new TypeError('Inscription NAP ambigue ou identite incomplete.');seen.add(swimmer);}
  const selected=raw.slice(0,5),people=selected.map(person),links=selected.map(row=>positiveId(row.inscription_id)),ids=people.map(p=>positiveId(p.id));
  if(!people.length)return {items:[],cursor:'',finished:true,sqlBudget:{queries:1,swimmersMax:5}};
  const marks=values=>values.map(()=>'?').join(',');
  const courses=await query(`SELECT id,engagement,course,tps FROM engagements FORCE INDEX (engagements_clef) WHERE engagement IN (${marks(links)}) ORDER BY engagement,course,id LIMIT 1501`,links,1500);
  const exceptions=await query(`SELECT competition_id,swimmer_id,event_code,club_id,status,reason,approved_by,approved_at,revoked_by,revoked_at,version FROM livepalmes_qualification_grants FORCE INDEX (PRIMARY) WHERE competition_id=? AND swimmer_id IN (${marks(ids)}) ORDER BY swimmer_id,event_code LIMIT 321`,[id,...ids],320);
  if(courses.some(row=>!links.includes(Number(row.engagement)))||exceptions.some(row=>!ids.includes(Number(row.swimmer_id))))throw new TypeError('Resultat de controle hors selection.');
  const histories=await (services.readHistory||readEntryHistory)(connection,people);
  const items=people.map((p,index)=>{
    const approved=grants.validate(exceptions.filter(row=>Number(row.swimmer_id)===Number(p.id)),{competitionId:id,swimmerId:p.id,clubId:p.clubId});
    const rows=histories.get(String(p.id));if(!Array.isArray(rows)||rows.length>2000)throw new RangeError('Historique de qualification incomplet.');
    const original=courses.filter(row=>Number(row.engagement)===links[index]).map(row=>({eventCode:String(row.course).trim().toUpperCase(),nativeId:positiveId(row.id),nativeTime:row.tps}));
    if(new Set(original.map(row=>row.eventCode)).size!==original.length||original.some(row=>!input.events.some(event=>event.code===row.eventCode&&event.type==='individual')))throw new TypeError('Anciennes courses NAP a verifier avant controle.');
    const evaluation=engine.evaluate({rules,category:services.categoryFor(input.date,p.birthDate),sex:p.sex,events:input.events,rows,approvals:approved.map(row=>({eventCode:row.event_code,status:row.status}))});
    const result=engine.reconcile(original,evaluation);
    const before={swimmerId:p.id,clubId:p.clubId,birthDate:p.birthDate,sex:p.sex,inscriptionId:links[index],entries:original};
    return {before,sourceHash:createHash('sha256').update(JSON.stringify(before)).digest('hex'),entries:result.entries,removed:result.removed,evaluation};
  });
  const last=selected.at(-1);
  return {items,cursor:raw.length===6?JSON.stringify({swimmerId:positiveId(last.id),inscriptionId:positiveId(last.inscription_id)}):'',finished:raw.length<6,sqlBudget:{queries:4,swimmersMax:5,historyRowsMax:20000}};
}
module.exports={cursor,previewPage};
