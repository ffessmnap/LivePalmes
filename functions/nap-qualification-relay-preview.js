"use strict";
// Two relay headers and their members, grouped and keyset-paginated on the
// existing competition/club/id index. Qualification anchors come from the
// individual preview, never from an old sporting Firebase document.
const {sourceHash}=require('./nap-qualification-source-hash');
const {positiveId}=require('./nap-direct-calendar');
const engine=require('./engagement-qualification');
function cursor(value){
  if(!value)return {clubId:'',relayId:0};
  const parsed=JSON.parse(value);
  if(Object.keys(parsed).sort().join(',')!=='clubId,relayId'||typeof parsed.clubId!=='string'||!/^\d{1,16}$/.test(parsed.clubId))throw new TypeError('Curseur relais invalide.');
  return {clubId:parsed.clubId,relayId:positiveId(parsed.relayId)};
}
async function relayPreview(connection,input,services){
  if(input.national!==true)throw new TypeError('Apercu national des relais requis.');
  const id=positiveId(input.competitionId),position=cursor(input.cursor);
  const query=async(sql,values,max)=>{const [rows]=await connection.execute({sql,timeout:10000},values);if(rows.length>max)throw new RangeError('Trop de relais dans le lot.');return rows;};
  const after=position.relayId?' AND (club>? OR (club=? AND id>?))':'';
  const raw=await query(`SELECT id,compet,categorie,club,course,tps FROM engagements_relais FORCE INDEX (livepalmes_compet_club_id) WHERE compet=?${after} ORDER BY club,id LIMIT 3`,position.relayId?[id,position.clubId,position.clubId,position.relayId]:[id],3),relays=raw.slice(0,2);
  const ids=relays.map(row=>positiveId(row.id));
  if(new Set(ids).size!==ids.length)throw new TypeError('Relais natifs ambigus.');
  const members=ids.length?await query(`SELECT id,relais,pos,nageur FROM engagements_relayeurs FORCE INDEX (livepalmes_relais_pos_id) WHERE relais IN (${ids.map(()=>'?').join(',')}) ORDER BY relais,pos,id LIMIT 13`,ids,12):[];
  if(members.some(row=>!ids.includes(Number(row.relais))))throw new TypeError('Relayeur hors du lot.');
  const freshAnchors=input.enabled&&members.length?await readAnchors(connection,input,[...new Set(members.map(member=>positiveId(member.nageur)))],services):[];
  const items=relays.map(row=>{
    if(Number(row.compet)!==id||!/^\d{1,16}$/.test(String(row.club)))throw new TypeError('Relais hors competition.');
    positiveId(row.club);
    positiveId(row.course);
    const team=members.filter(member=>Number(member.relais)===Number(row.id));
    if(team.length>6||new Set(team.map(member=>Number(member.pos))).size!==team.length||team.some(member=>!Number.isSafeInteger(Number(member.pos))||Number(member.pos)<1||Number(member.pos)>6))throw new TypeError('Composition de relais ambigue.');
    const anchors=freshAnchors.filter(anchor=>BigInt(anchor.clubId)===BigInt(row.club));
    const swimmers=anchors.map(anchor=>({swimmerIndexId:String(anchor.swimmerId),individualEntries:[{eventCode:'anchor'}]}));
    const evaluations=Object.fromEntries(anchors.map(anchor=>[String(anchor.swimmerId),{courses:{anchor:{qualified:true}}}]));
    const memberIds=team.map(member=>String(positiveId(member.nageur)));
    const allowed=!input.enabled||engine.relayEligible({memberIds},swimmers,evaluations);
    const before={relayId:positiveId(row.id),clubId:String(row.club),entry:row,members:team};
    return {before,sourceHash:sourceHash(before),remove:!allowed};
  });
  const last=relays.at(-1);
  return {kind:'relay',items,finished:raw.length<3,cursor:raw.length===3?JSON.stringify({clubId:String(last.club),relayId:positiveId(last.id)}):''};
}
async function readAnchors(connection,input,ids,services){
  if(ids.length>12||typeof services?.categoryFor!=='function')throw new TypeError('Preuves groupees des relayeurs requises.');
  if(!ids.length)return [];
  const query=async(sql,values,max)=>{const [rows]=await connection.execute({sql,timeout:10000},values);if(rows.length>max)throw new RangeError('Preuves des relayeurs trop volumineuses.');return rows;};
  const id=positiveId(input.competitionId),marks=values=>values.map(()=>'?').join(',');
  const raw=await query(`SELECT n.id,n.nom,n.prenom,n.date,n.sexe,n.club,e.id AS inscription_id FROM nageurs n FORCE INDEX (PRIMARY) LEFT JOIN nageursengager e FORCE INDEX (livepalmes_compet_nageur_id) ON e.compet=? AND e.nageur=n.id WHERE n.id IN (${marks(ids)}) ORDER BY n.id,e.id LIMIT 13`,[id,...ids],12);
  if(raw.length!==ids.length||raw.some(row=>!ids.includes(Number(row.id)))||new Set(raw.map(row=>Number(row.id))).size!==ids.length)throw new TypeError('Identites ou inscriptions des relayeurs ambigues.');
  const people=raw.map(require('./nap-portal-swimmers').person),links=raw.filter(row=>row.inscription_id!=null).map(row=>positiveId(row.inscription_id));
  const courses=links.length?await query(`SELECT id,engagement,course,tps FROM engagements FORCE INDEX (engagements_clef) WHERE engagement IN (${marks(links)}) ORDER BY engagement,course,id LIMIT 3601`,links,3600):[];
  const exceptions=await query(`SELECT competition_id,swimmer_id,event_code,club_id,status,reason,approved_by,approved_at,revoked_by,revoked_at,version FROM livepalmes_qualification_grants FORCE INDEX (PRIMARY) WHERE competition_id=? AND swimmer_id IN (${marks(ids)}) ORDER BY swimmer_id,event_code LIMIT 769`,[id,...ids],768);
  if(courses.some(row=>!links.includes(Number(row.engagement)))||exceptions.some(row=>!ids.includes(Number(row.swimmer_id))))throw new TypeError('Preuves des relayeurs hors selection.');
  const histories=await (services.readHistory||require('./nap-entry-performance-history').readEntryHistory)(connection,people);
  return people.flatMap((person,index)=>{
    const approved=require('./nap-qualification-grants').validate(exceptions.filter(row=>Number(row.swimmer_id)===Number(person.id)),{competitionId:id,swimmerId:person.id,clubId:person.clubId});
    const rows=histories.get(String(person.id));if(!Array.isArray(rows)||rows.length>2000)throw new RangeError('Historique des relayeurs incomplet.');
    const entries=courses.filter(row=>Number(row.engagement)===Number(raw[index].inscription_id)).map(row=>({eventCode:String(row.course).trim().toUpperCase()}));
    const evaluation=engine.evaluate({rules:input.rules,category:services.categoryFor(input.date,person.birthDate),sex:person.sex,events:input.events,rows,approvals:approved.map(row=>({eventCode:row.event_code,status:row.status}))});
    return engine.reconcile(entries,evaluation).entries.some(entry=>evaluation.courses[entry.eventCode]?.qualified)?[{clubId:person.clubId,swimmerId:String(person.id)}]:[];
  });
}
module.exports={cursor,relayPreview,readAnchors};
