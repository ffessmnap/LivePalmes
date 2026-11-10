'use strict';
const {hash}=require('./nap-direct-model');
// Chronological selection, independent of public numbering. A quota applies to
// each final separately; skipped guests may enter the next final or be reserves.
function select(rows,{lanes,capacity,invitedLimit,resolutions={},source}){
  const chosen=new Set(),ties=[],pending=new Set(),byKey=new Map(rows.map(row=>[row.key,row])),byTime=new Map();
  for(const value of Object.values(resolutions)){const time=byKey.get(value.order?.[0])?.result.cs;if(value.source!==source||!time||new Set(value.order).size!==value.order.length||!value.order.every(key=>byKey.get(key)?.result.cs===time))continue;if(!byTime.has(time))byTime.set(time,[]);byTime.get(time).push(value);}
  function final(size,offset){
    const available=rows.filter(row=>!chosen.has(row.key)),groups=[];
    for(const row of available){const previous=groups.at(-1);if(previous?.time===row.result.cs)previous.rows.push(row);else groups.push({time:row.result.cs,rows:[row]});}
    const selected=[];let invited=0;
    for(const group of groups){
      const seats=size-selected.length;if(!seats)break;
      const quota=invitedLimit==null?size:Math.max(0,invitedLimit-invited),ordinary=group.rows.filter(row=>row.participationStatus!=='IN'),guests=group.rows.filter(row=>row.participationStatus==='IN'),candidates=[...ordinary,...(quota?guests:[])];
      const take=Math.min(seats,ordinary.length+Math.min(guests.length,quota));if(!take)continue;
      const certain=candidates.filter(row=>ordinary.length-Number(row.participationStatus!=='IN')+Math.min(guests.length-Number(row.participationStatus==='IN'),quota)<take),certainKeys=new Set(certain.map(row=>row.key)),contested=candidates.filter(row=>!certainKeys.has(row.key));
      const resolution=contested.length?(byTime.get(group.time)||[]).find(value=>contested.every(row=>value.order.includes(row.key))):null;
      if(contested.length&&!resolution){const keys=contested.map(row=>row.key);ties.push({id:hash([...keys].sort()),time:group.time,from:offset+selected.length+certain.length+1,to:offset+selected.length+certain.length+keys.length,keys,names:contested.map(row=>[String(row.lastName||'').toUpperCase(),row.firstName].filter(Boolean).join(' '))});keys.forEach(key=>pending.add(key));}
      if(resolution)contested.sort((a,b)=>resolution.order.indexOf(a.key)-resolution.order.indexOf(b.key));
      let taken=0;for(const row of [...certain,...contested]){if(taken===take)break;if(row.participationStatus==='IN'&&invitedLimit!=null&&invited>=invitedLimit)continue;selected.push(row.key);chosen.add(row.key);if(row.participationStatus==='IN')invited++;taken++;}
    }
    return selected;
  }
  const a=capacity?final(Math.min(lanes,capacity),0):[],b=capacity>lanes?final(lanes,lanes):[],reserve=capacity?rows.filter(row=>!chosen.has(row.key)).map(row=>row.key):[];
  return {proposal:{a,b,reserve},ties:[...new Map(ties.map(tie=>[tie.id,tie])).values()],pendingKeys:[...pending]};
}
module.exports={select};
