"use strict";
const {createStore,fail}=require("./nap-direct-store"),model=require("./nap-direct-model");
const {SELECT_EVENT,EVENT_JOINS,eventFromRow}=require("./nap-calendar-event");
const cache=new Map(),pending=new Map();
async function readPublic(pool,environment,input) {
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
      const events=await store.q(`SELECT * FROM livepalmes_direct_events WHERE environment=? AND competition_id=? ORDER BY program_order,id LIMIT ${model.MAX_EVENTS+1}`,store.scope(id));
      if(events.length>model.MAX_EVENTS)throw fail("Programme trop volumineux.");
      const visible=events.filter(e=>{const p=model.parseJson(e.publication_state_json);return p.series||p.results;});
      const selected=input.eventId?visible.find(e=>e.id===input.eventId):visible[0];
      const limit=clubView?model.MAX_MEET_ENTRIES:model.MAX_ENTRIES;
      const entries=selected?await store.q(`SELECT * FROM livepalmes_direct_entries WHERE environment=? AND competition_id=?${clubView?'':' AND event_id=?'} ORDER BY ${clubView?'event_id,':''}series_number,lane,participant_key LIMIT ${limit+1}`,[...store.scope(id),...(clubView?[]:[selected.id])]):[];
      if(entries.length>limit)throw fail("Affichage trop volumineux.");
      const eventMap=new Map(visible.map(e=>[e.id,e]));
      const publicRows=entries.flatMap(row=>{const event=eventMap.get(row.event_id);if(!event)return [];const p=model.parseJson(event.publication_state_json);return model.visibleEntry(row,p.series,p.results)?[{...model.publicEntry(row,Boolean(p.series),Boolean(p.results)),eventId:row.event_id}]:[];});
      const result={view:clubView?'club':'event',events:visible.map(store.eventView),selectedEventId:selected?.id||null,entries:publicRows};
      if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
    })().finally(()=>pending.delete(key)));
    payload=await pending.get(key);
  }
  return {source:'nap',competition,config:{state:metadata.direct_state,revision:Number(metadata.direct_revision),documents:model.parseJson(metadata.direct_documents,[])},...payload};
}
async function attachLinks(pool,environment,events) {
  if(!events.length)return events;
  const ids=events.map(e=>model.competitionId(e.id));
  let rows;
  try {rows=await require('./nap-query').execute(pool,`SELECT competition_id,state FROM livepalmes_direct_competitions WHERE environment=? AND public_visible=1 AND state IN ('active','archived') AND competition_id IN (${ids.map(()=>'?').join(',')}) LIMIT 501`,[environment,...ids]);}
  catch(error){if(error.code==='ER_NO_SUCH_TABLE')return events;throw error;}
  const byId=new Map(rows.map(r=>[Number(r.competition_id),r.state]));
  return events.map(event=>byId.has(model.competitionId(event.id))?{...event,direct:{state:byId.get(model.competitionId(event.id)),url:`direct.html?id=${model.competitionId(event.id)}`}}:event);
}
module.exports={readPublic,attachLinks};
