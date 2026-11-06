"use strict";
const {createHash} = require("node:crypto");
const duration = require("./nap-duration");
const ROLES = ["computer","live","speaker","referee","video","secretary"];
const MAX_EVENTS = 300, MAX_ENTRIES = 1000, MAX_MEET_ENTRIES = 15000;
const clean = (value,max=160) => String(value ?? "").replace(/[\u0000-\u001f]/g," ").trim().slice(0,max);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const hash = value => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const parseJson = (value,fallback={}) => value == null ? fallback : typeof value === "string" ? JSON.parse(value) : value;
function competitionId(value) { const id=Number(String(value).replace(/^legacy-nap-/,"")); if(!Number.isSafeInteger(id)||id<=0)throw new TypeError("Compétition invalide.");return id; }
function time(raw, engagement=false) {
  const value=clean(raw,32), normalized=value.replace(",",".").replace(/\s/g,"");
  if (engagement && ["595999","59:59.99","00:59:59.99"].includes(normalized)) return {raw:value,cs:null,status:"no_reference"};
  const formatted=/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\.(\d{2})$/.exec(normalized);
  const seconds=/^(\d{1,2})\.(\d{2})$/.exec(normalized);
  const cs=formatted && Number(formatted[3])<60 ? ((Number(formatted[1]||0)*60+Number(formatted[2]))*60+Number(formatted[3]))*100+Number(formatted[4]) : seconds && Number(seconds[1])<60 ? Number(seconds[1])*100+Number(seconds[2]) : duration.parseCompactTime(value);
  return {raw:value,cs:cs||null,status:cs?"known":value?"invalid":"missing"};
}
function event(input,competition) {
  const code=clean(input.eventCode,32).toLowerCase(),sex=clean(input.sex,1),phase=clean(input.phase||"series",32),session=clean(input.sessionKey||"1",64);
  if(!code||!/[FMX]/.test(sex)||!/^[a-z0-9_-]+$/i.test(code)||!/^\d{4}-\d\d-\d\d$/.test(input.date||competition.date))throw new TypeError("Épreuve, sexe ou date invalide.");
  if((input.date||competition.date)<competition.date||(input.date||competition.date)>(competition.endDate||competition.date))throw new TypeError("Date hors de la compétition du calendrier.");
  const identity=[competition.id,code,sex,phase,session];
  const schedule={};
  if(input.heatSchedule!=null){
    if(!Array.isArray(input.heatSchedule)||input.heatSchedule.length>1000)throw new TypeError("Horaires des séries invalides.");
    const seen=new Set();schedule.heatSchedule=input.heatSchedule.map(heat=>{
      if(!heat||typeof heat!=='object')throw new TypeError("Horaire de série invalide.");
      const number=Number(heat.number),scheduledAt=clean(heat.scheduledAt,32);
      if(!Number.isInteger(number)||number<1||number>1000||seen.has(number)||scheduledAt&&!/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(scheduledAt))throw new TypeError("Horaire ou numéro de série invalide.");
      seen.add(number);return {number,scheduledAt};
    }).sort((a,b)=>a.number-b.number);
  }
  return {id:hash(identity),eventCode:code,eventLabel:clean(input.eventLabel||code),sex,phase,date:input.date||competition.date,sessionKey:session,sessionLabel:clean(input.sessionLabel||`Session ${session}`,120),order:Math.max(0,Math.min(10000,Number(input.order)||0)),eventNumber:clean(input.eventNumber,16),scheduledAt:clean(input.scheduledAt,32),sourceEventId:clean(input.sourceEventId,100)||null,...schedule};
}
function entry(row) {
  const firstName=clean(row.firstName),lastName=clean(row.lastName||row.displayName),club=clean(row.club||row.clubLabel,200),year=Number(row.birthYear)||null;
  const relay=row.relay===true,sourceId=clean(row.sourceEntryId,100)||null;
  if(!lastName||!club||(!relay&&(!Number.isInteger(year)||year<1900||year>2100)))throw new TypeError("Identité, année ou club manquant : ligne à contrôler.");
  const identity=[relay?'relay':'individual',lastName.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(),firstName.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(),year,club.toLowerCase()];
  const seed=time(row.entryTime,true),result=time(row.resultTime),status=clean(row.resultStatus,32);
  if(seed.status==="invalid"||result.status==="invalid")throw new TypeError("Temps non reconnu : ligne à contrôler.");
  const series=Number(row.series)||null,lane=row.lane==null||row.lane===''?null:Number(row.lane),rank=Number(row.rank)||null;
  if(series!=null&&(!Number.isInteger(series)||series<1||series>1000)||lane!=null&&(!Number.isInteger(lane)||lane<0||lane>20)||rank!=null&&(!Number.isInteger(rank)||rank<1||rank>1000))throw new TypeError("Série, couloir ou rang invalide.");
  const members=Array.isArray(row.relayMembers)?row.relayMembers.slice(0,8).map(m=>({firstName:clean(m.firstName),lastName:clean(m.lastName||m.displayName),birthYear:Number(m.birthYear)||null,time:clean(m.time,32)})):[];
  const splits=Array.isArray(row.splits)?row.splits.slice(0,60).map(s=>({distance:clean(s.distance,20),time:clean(s.time,32)})):[];
  return {key:hash(identity),sourceEntryId:sourceId,kind:relay?'relay':'individual',firstName,lastName,birthYear:year,club,clubId:clean(row.clubId,32)||null,swimmerId:Number.isSafeInteger(Number(row.swimmerId))&&Number(row.swimmerId)>0?Number(row.swimmerId):null,category:clean(row.category,32),series,lane,seed,result,status,rank,members,splits};
}
function prepare(input,competition) {
  if(!["series","results"].includes(input.kind)||!Array.isArray(input.rows)||!input.rows.length||input.rows.length>MAX_ENTRIES)throw new TypeError("Lot de publication invalide (1 à 1 000 lignes).");
  const meet=event(input.event||{},competition),rows=input.rows.map(entry),seen=new Set(),sources=new Set();
  for(const row of rows){if(seen.has(row.key)||row.sourceEntryId&&sources.has(row.sourceEntryId))throw new TypeError("Participation ambiguë ou dupliquée dans le lot.");seen.add(row.key);if(row.sourceEntryId)sources.add(row.sourceEntryId);if(input.kind==='results'&&!row.result.cs&&!row.status)throw new TypeError("Résultat sans temps ni statut.");}
  const seriesNumber=input.seriesNumber==null?null:Number(input.seriesNumber);
  if(seriesNumber!=null&&(!Number.isInteger(seriesNumber)||seriesNumber<1||seriesNumber>1000||rows.some(row=>row.series!==seriesNumber)||meet.heatSchedule?.some(heat=>heat.number!==seriesNumber)))throw new TypeError("Périmètre de série incohérent.");
  return {kind:input.kind,seriesNumber,event:meet,rows,source:{type:clean(input.source?.type||"pdf",24),name:clean(input.source?.name,200),hash:clean(input.source?.hash,64)}};
}
function publicEntry(row,showSeries,showResults) {
  showSeries=showSeries&&Boolean(row.has_series);showResults=showResults&&Boolean(row.has_result);
  const seed=showSeries||showResults&&!row.has_series?{raw:row.entry_time_raw,cs:row.entry_time_cs==null?null:Number(row.entry_time_cs),status:row.entry_time_status}:{raw:"",cs:null,status:"missing"};
  const result=showResults?{raw:row.result_time_raw,cs:row.result_time_cs==null?null:Number(row.result_time_cs),status:row.result_status}:{raw:"",cs:null,status:""};
  return {key:row.participant_key,firstName:row.first_name,lastName:row.last_name,birthYear:row.birth_year,club:row.club_label,category:row.category_code,series:row.series_number,lane:row.lane,kind:row.entry_kind,seed,result,rank:showResults?row.published_rank:null,delta:seed.status==="known"&&seed.cs&&result.cs&&!result.status?result.cs-seed.cs:null,members:parseJson(row.relay_members_json,[]),splits:showResults?parseJson(row.splits_json,[]):[]};
}
function prepareBatch(input,competition){
  if(!Array.isArray(input.groups)||!input.groups.length||input.groups.length>MAX_EVENTS)throw new TypeError("Sélectionner de 1 à 300 épreuves par publication.");
  const scopes=new Map(),identities=new Map(),perEvent=new Map(),keys=new Set();let count=0;
  const groups=input.groups.map(group=>{
    if(!/^[a-zA-Z0-9_-]{16,64}$/.test(group.operationKey||'')||keys.has(group.operationKey))throw new TypeError("Identifiant de demande dupliqué ou invalide.");
    keys.add(group.operationKey);const prepared=prepare(group,competition),key=prepared.event.id+':'+prepared.kind;
    const ranges=scopes.get(key)||[],seen=identities.get(key)||new Set();
    if(ranges.some(scope=>scope==null||prepared.seriesNumber==null||scope===prepared.seriesNumber))throw new TypeError("Deux documents se recouvrent pour la même épreuve. Décocher le doublon avant publication.");
    const participants=perEvent.get(prepared.event.id)||new Set();
    for(const row of prepared.rows){if(seen.has(row.key))throw new TypeError("Participation dupliquée entre plusieurs séries du lot.");seen.add(row.key);participants.add(row.key);}
    if(participants.size>MAX_ENTRIES)throw new TypeError("1 000 participations au maximum par épreuve.");
    perEvent.set(prepared.event.id,participants);ranges.push(prepared.seriesNumber);scopes.set(key,ranges);identities.set(key,seen);count+=prepared.rows.length;
    if(count>MAX_MEET_ENTRIES)throw new TypeError("15 000 participations au maximum par publication groupée.");return prepared;
  });
  if(count>MAX_MEET_ENTRIES)throw new TypeError("15 000 participations au maximum par publication groupée.");
  return {groups,count,contentHash:hash(groups),operationKey:hash(['direct-batch',input.groups.map(group=>group.operationKey)])};
}
const visibleEntry=(row,series,results)=>Boolean(series&&row.has_series||results&&row.has_result);
module.exports={ROLES,MAX_EVENTS,MAX_ENTRIES,MAX_MEET_ENTRIES,clean,hash,parseJson,competitionId,time,event,entry,prepare,prepareBatch,publicEntry,visibleEntry};
