"use strict";
const {createStore,fail}=require("./nap-direct-store"),model=require("./nap-direct-model");
const {SELECT_EVENT,EVENT_JOINS,eventFromRow}=require("./nap-calendar-event");
const courses=require('./nap-direct-public-courses'),archive=require('./nap-direct-state');
const cache=new Map(),pending=new Map(),programs=new Map();
async function cachedProgram(store,id,key){
  if(!programs.has(key)){if(programs.size>=100)programs.delete(programs.keys().next().value);const request=store.program(id).catch(error=>{programs.delete(key);throw error;});programs.set(key,request);}
  return programs.get(key);
}
async function readPublic(pool,environment,input,{clock=Date.now}={}) {
  const id=model.competitionId(input.id),store=createStore(pool,environment);
  if(input.eventId&&!/^[a-f0-9]{64}$/.test(input.eventId))throw new TypeError("Épreuve invalide.");
  const selection=SELECT_EVENT.replace(' FROM competitions c',',d.state AS direct_state,d.public_visible AS direct_visible,d.public_revision AS direct_revision,d.documents_json AS direct_documents FROM competitions c');
  const rows=await store.q(`${selection}${EVENT_JOINS} LEFT JOIN livepalmes_direct_competitions d ON d.competition_id=c.id AND d.environment=? WHERE c.id=? LIMIT 2`,[environment,id]);
  if(rows.length!==1||!rows[0].direct_visible||!['active','archived'].includes(rows[0].direct_state))throw fail("Le Direct de cette compétition n’est pas ouvert.","not-found");
  const metadata=rows[0],competition=eventFromRow(metadata);
  const clubView=input.view==='club';
  const key=`${environment}:${id}:${metadata.direct_revision}:${input.eventId||''}:${clubView?'club':'event'}`;
  let payload=cache.get(key);
  if(!payload) {
    if(!pending.has(key))pending.set(key,(async()=>{
      const events=await cachedProgram(store,id,`${environment}:${id}:${metadata.direct_revision}`);
      if(events.length>model.MAX_EVENTS)throw fail("Programme trop volumineux.");
      const visible=events.filter(e=>{const p=model.parseJson(e.publication_state_json);return p.series||p.results;});
      const views=visible.map(row=>{const event=store.eventView(row);return {...event,progress:require('./nap-direct-progress').visible(event.progress,event.publication)};});
      const selected=input.eventId?views.find(e=>e.id===input.eventId):courses.choose(views);
      let sources=courses.sourceEvents(views,selected),grouped=courses.course(selected,sources);
      const limit=clubView?model.MAX_MEET_ENTRIES:model.MAX_ENTRIES;
      let entries=selected?await store.q(`SELECT * FROM livepalmes_direct_entries WHERE environment=? AND competition_id=?${clubView?'':sources.length>1?' AND event_id IN ('+sources.map(()=>'?').join(',')+')':' AND event_id=?'} ORDER BY ${clubView?'event_id,':''}series_number,lane,participant_key LIMIT ${limit+1}`,[...store.scope(id),...(clubView?[]:sources.map(event=>event.id))]):[];
      if(entries.length>limit)throw fail("Affichage trop volumineux.");
      const eventMap=new Map(visible.map(e=>[e.id,e]));
      entries=entries.filter(row=>{const event=eventMap.get(row.event_id);if(!event)return false;const p=model.parseJson(event.publication_state_json);return model.visibleEntry(row,p.series,p.results);});
      if(!clubView&&sources.length>1&&courses.duplicateParticipants(entries)){sources=[selected];entries=entries.filter(row=>row.event_id===selected.id);grouped={...selected,groupingWarning:'Le classement commun est indisponible : les séries doivent être vérifiées par l’organisation.'};}
      const publicRows=entries.flatMap(row=>{const event=eventMap.get(row.event_id);if(!event)return [];const p=model.parseJson(event.publication_state_json);return model.visibleEntry(row,p.series,p.results)?[{...model.publicEntry(row,Boolean(p.series),Boolean(p.results),model.participationFor(p,row.participant_key)),eventId:row.event_id}]:[];});
      const qualifications=require('./nap-direct-public-qualifications');
      const state=(await store.q("SELECT JSON_EXTRACT(after_json,'$.races') AS races_json,JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.rankingMode')) AS ranking_mode FROM livepalmes_direct_publications WHERE environment=? AND competition_id=? AND id=? LIMIT 1",[...store.scope(id),qualifications.stateId]))[0];
      const navigation=views.map(event=>{const fragments=courses.sourceEvents(views,event),summary=courses.course(event,fragments);return {...event,sessionState:courses.sessionState(event),...(fragments.length>1?{courseProgress:summary.progress,coursePublication:summary.publication}:{})};});
      const result={rankingMode:model.rankingMode(state?.ranking_mode),view:clubView?'club':'event',events:navigation,selectedEventId:selected?.id||null,...(clubView?{rankingGroups:courses.rankingGroups(views,entries)}:grouped?{course:grouped}:{}),entries:qualifications.attach(events,publicRows,model.parseJson(state?.races_json,{}))};
      if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
    })().finally(()=>pending.delete(key)));
    payload=await pending.get(key);
  }
  return {source:'nap',competition,config:{state:archive.effective(metadata.direct_state,metadata.date,metadata.enddate,clock()),revision:Number(metadata.direct_revision),documents:model.parseJson(metadata.direct_documents,[])},...payload};
}
async function attachLinks(pool,environment,events,rawDates=new Map(),{clock=Date.now}={}) {
  if(!events.length)return events;
  const ids=events.map(e=>model.competitionId(e.id));
  let rows;
  try {rows=await require('./nap-query').execute(pool,`SELECT competition_id,state FROM livepalmes_direct_competitions WHERE environment=? AND public_visible=1 AND state IN ('active','archived') AND competition_id IN (${ids.map(()=>'?').join(',')}) LIMIT 501`,[environment,...ids]);}
  catch(error){if(error.code==='ER_NO_SUCH_TABLE')return events;throw error;}
  const byId=new Map(rows.map(r=>[Number(r.competition_id),r.state]));
  return events.map(event=>byId.has(model.competitionId(event.id))?{...event,direct:{state:archive.effective(byId.get(model.competitionId(event.id)),(rawDates.get(model.competitionId(event.id))||event).date,(rawDates.get(model.competitionId(event.id))||event).enddate??event.endDate,clock()),url:`direct.html?id=${model.competitionId(event.id)}`}}:event);
}
module.exports={readPublic,attachLinks};
