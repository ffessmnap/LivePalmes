'use strict';
const model=require('./nap-direct-model');
const stateId=model.hash(['direct-console-state-v1']);
// Only announced places are public. Proposed replacements, accounts and decisions stay private.
function signature(state){return model.hash(Object.entries(state.races||{}).filter(([,race])=>race.announced&&['a','ab'].includes(race.format)).map(([id,race])=>[id,race.format,...['a','b'].map(group=>(race.announced.roster?.[group]||[]).filter(key=>!race.withdrawals?.[key]).slice().sort())]).sort((a,b)=>a[0].localeCompare(b[0])));}

function attach(events,entries,races){
  const byId=new Map(events.map(event=>[event.id,event])),groups=new Map();
  for(const [id,race] of Object.entries(races||{})){
    const event=byId.get(id);if(!event||event.phase!=='series'||!['a','ab'].includes(race.format)||!race.announced)continue;
    const markers=new Map(),withdrawn=new Set(Object.keys(race.withdrawals||{}));
    for(const group of ['a','b'])for(const key of race.announced.roster?.[group]||[])if(!withdrawn.has(key)&&!(group==='b'&&race.format==='a'))markers.set(key,race.format==='a'?'Q':group==='a'?'QA':'QB');
    groups.set(event.event_code+'|'+event.sex,markers);
  }
  return entries.map(row=>{const event=byId.get(row.eventId),marker=event?.phase==='series'&&row.result?.cs>0&&!row.result.status&&groups.get(event.event_code+'|'+event.sex)?.get(row.key);return marker?{...row,qualification:marker}:row;});
}
module.exports={stateId,signature,attach};
