'use strict';
const model=require('./nap-direct-model');
// Existing UTC journal only. Limit the indexed window before filtering JSON;
// never scan the whole history or return private decisions/source filenames.
const SQL="SELECT event_id,action,source_type,JSON_UNQUOTE(JSON_EXTRACT(after_json,'$.kind')) AS publication_kind,JSON_EXTRACT(after_json,'$.seriesNumber') AS series_number,DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS published_at FROM livepalmes_direct_publications FORCE INDEX (history_page) WHERE environment=? AND competition_id=? ORDER BY created_at DESC,id DESC LIMIT 512";
async function read(store,id,events){
  const visible=new Set(events.filter(event=>model.parseJson(event.publication_state_json).results&&event.progress?.resultEntries>0).map(event=>event.id));
  const heatTimes=new Map();let lastResultsPublishedAt=null;
  if(!visible.size)return {lastResultsPublishedAt,heatTimes};
  const rows=await store.q(SQL,store.scope(id));
  for(const row of rows){
    if(!visible.has(row.event_id)||row.source_type!=='winpalme-txt'||!['publish','replace'].includes(row.action)||row.publication_kind!=='results')continue;
    const date=new Date(row.published_at);if(!row.published_at||!Number.isFinite(date.getTime()))continue;
    const iso=date.toISOString();if(!lastResultsPublishedAt||iso>lastResultsPublishedAt)lastResultsPublishedAt=iso;
    const heat=Number(row.series_number);if(!Number.isInteger(heat)||heat<1||heat>1000)continue;
    if(!heatTimes.has(row.event_id))heatTimes.set(row.event_id,{});
    const times=heatTimes.get(row.event_id);if(!times[heat]||iso>times[heat])times[heat]=iso;
  }
  return {lastResultsPublishedAt,heatTimes};
}
module.exports={read,SQL};
