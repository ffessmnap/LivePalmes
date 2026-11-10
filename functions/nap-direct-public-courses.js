"use strict";
// Public presentation only. Stored event IDs and WinPalme session matching stay intact.
const sessionKey=event=>JSON.stringify([event.date||'',String(event.sessionKey||'1')]);
const order=(a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.sessionKey||'1').localeCompare(String(b.sessionKey||'1'),'fr',{numeric:true})||Number(a.order||0)-Number(b.order||0)||String(a.scheduledAt||'').localeCompare(String(b.scheduledAt||''));
function sessionState(event){
  const p=event.progress||{};if(!event.publication.results||!p.resultEntries)return 'upcoming';
  const expected=event.heatSchedule?.length||Number(p.seriesCount)||Number(event.expectedSeries)||0;
  return p.seriesEntries>0&&p.matchedResults===p.seriesEntries&&!p.unassignedResults&&expected>0&&p.completeSeriesCount>=expected?'complete':'ongoing';
}
function choose(events){
  const ordered=[...events].sort(order),published=ordered.filter(event=>sessionState(event)!=='upcoming');if(!published.length)return ordered[0];
  const latest=published.at(-1),pending=published.filter(event=>sessionKey(event)===sessionKey(latest)&&sessionState(event)==='ongoing');return pending.at(-1)||latest;
}
function sourceEvents(events,selected){
  if(!selected||!['series','meilleure-serie'].includes(selected.phase))return selected?[selected]:[];
  const list=events.filter(event=>event.eventCode===selected.eventCode&&event.sex===selected.sex&&event.phase===selected.phase).sort(order);
  if(list.length<2)return list;
  const expected=Number(list[0].expectedSeries),seen=new Set();
  if(expected<2||!Number.isInteger(expected)||new Set(list.map(sessionKey)).size!==list.length)return [selected];
  for(const event of list){
    const schedule=event.heatSchedule||[];
    if(Number(event.expectedSeries)!==expected||!schedule.length||schedule.length>=expected)return [selected];
    for(const heat of schedule){const number=Number(heat.number);if(!Number.isInteger(number)||number<1||number>expected||seen.has(number))return [selected];seen.add(number);}
  }
  return list;
}
function duplicateParticipants(rows){const seen=new Map();for(const row of rows){const previous=seen.get(row.participant_key);if(previous&&previous!==row.event_id)return true;seen.set(row.participant_key,row.event_id);}return false;}
function course(selected,sources){
  if(!selected||sources.length<2)return selected;
  const fields=['entries','seriesEntries','resultEntries','matchedResults','seriesCount','resultSeriesCount','completeSeriesCount','unassignedResults'],progress=Object.fromEntries(fields.map(field=>[field,sources.reduce((n,event)=>n+(Number(event.progress?.[field])||0),0)]));
  return {...selected,id:sources[0].id,sourceEventIds:sources.map(event=>event.id),sessionLabel:sources.map(event=>event.sessionLabel||'Session '+event.sessionKey).join(' · '),scheduledAt:'',progress,publication:{series:sources.every(event=>event.publication.series),results:sources.some(event=>event.publication.results)},heatSchedule:sources.flatMap(event=>(event.heatSchedule||[]).map(heat=>({...heat,sessionKey:event.sessionKey,sessionLabel:event.sessionLabel||'Session '+event.sessionKey,date:event.date,eventId:event.id}))).sort((a,b)=>Number(a.number)-Number(b.number))};
}
function rankingGroups(events,entries){
  const groups=[],seen=new Set(),byEvent=new Map();for(const row of entries){if(!byEvent.has(row.event_id))byEvent.set(row.event_id,[]);byEvent.get(row.event_id).push(row);}
  for(const event of events){if(seen.has(event.id))continue;const sources=sourceEvents(events,event),rows=sources.flatMap(source=>byEvent.get(source.id)||[]);if(duplicateParticipants(rows)){for(const source of sources){groups.push([source.id]);seen.add(source.id);}}else{groups.push(sources.map(source=>source.id));sources.forEach(source=>seen.add(source.id));}}
  return groups;
}
module.exports={sessionKey,order,sessionState,choose,sourceEvents,duplicateParticipants,course,rankingGroups};
