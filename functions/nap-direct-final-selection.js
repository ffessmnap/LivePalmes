'use strict';
const {hash}=require('./nap-direct-model');
// Chronological selection, independent of public numbering. A quota applies to
// each final separately; skipped guests may enter the next final or be reserves.
function select(rows,{lanes,capacity,invitedLimit,resolutions={},source,knownRows=rows}){
  const chosen=new Set(),ties=[],pending=new Set(),byKey=new Map(knownRows.map(row=>[row.key,row])),byTime=new Map();
  for(const value of Object.values(resolutions)){const time=byKey.get(value.order?.[0])?.result.cs;if(value.source!==source||!time||new Set(value.order).size!==value.order.length||!value.order.every(key=>byKey.get(key)?.result.cs===time))continue;if(!byTime.has(time))byTime.set(time,[]);byTime.get(time).push({...value,positions:new Map(value.order.map((key,index)=>[key,index]))});}
  // Apply explicit tie orders to the same slots before either final is selected.
  // This also preserves the order of the remaining reserves after a swim-off.
  const ordered=[...rows];
  for(const values of byTime.values())for(const value of values){const positions=[];for(let i=0;i<ordered.length;i++)if(value.positions.has(ordered[i].key))positions.push(i);const sorted=positions.map(i=>ordered[i]).sort((a,b)=>value.positions.get(a.key)-value.positions.get(b.key));positions.forEach((index,n)=>{ordered[index]=sorted[n];});}
  rows=ordered;const positions=new Map(rows.map((row,index)=>[row.key,index]));
  function final(size,offset){
    const available=rows.filter(row=>!chosen.has(row.key)),groups=[];
    for(const row of available){const previous=groups.at(-1);if(previous?.time===row.result.cs)previous.rows.push(row);else groups.push({time:row.result.cs,rows:[row]});}
    const selected=[];let invited=0;
    for(const group of groups){
      const seats=size-selected.length;if(!seats)break;
      const quota=invitedLimit==null?size:Math.max(0,invitedLimit-invited),ordinary=group.rows.filter(row=>row.participationStatus!=='IN'),guests=group.rows.filter(row=>row.participationStatus==='IN'),candidates=group.rows.filter(row=>row.participationStatus!=='IN'||quota>0);
      const take=Math.min(seats,ordinary.length+Math.min(guests.length,quota));if(!take)continue;
      const certain=candidates.filter(row=>ordinary.length-Number(row.participationStatus!=='IN')+Math.min(guests.length-Number(row.participationStatus==='IN'),quota)<take),certainKeys=new Set(certain.map(row=>row.key)),contested=candidates.filter(row=>!certainKeys.has(row.key));
      const resolution=contested.length?(byTime.get(group.time)||[]).find(value=>contested.every(row=>value.positions.has(row.key))):null;
      if(contested.length&&!resolution){const keys=contested.map(row=>row.key);ties.push({id:hash([...keys].sort()),time:group.time,from:offset+selected.length+certain.length+1,to:offset+selected.length+certain.length+keys.length,keys,names:contested.map(row=>[String(row.lastName||'').toUpperCase(),row.firstName].filter(Boolean).join(' '))});keys.forEach(key=>pending.add(key));}
      if(resolution)contested.sort((a,b)=>resolution.positions.get(a.key)-resolution.positions.get(b.key));
      const picks=[];let taken=0;for(const row of [...certain,...contested]){if(taken===take)break;if(row.participationStatus==='IN'&&invitedLimit!=null&&invited>=invitedLimit)continue;picks.push(row.key);chosen.add(row.key);if(row.participationStatus==='IN')invited++;taken++;}
      selected.push(...picks.sort((a,b)=>positions.get(a)-positions.get(b)));
    }
    return selected;
  }
  const a=capacity?final(Math.min(lanes,capacity),0):[],b=capacity>lanes?final(lanes,lanes):[],reserve=capacity?rows.filter(row=>!chosen.has(row.key)).map(row=>row.key):[];
  return {proposal:{a,b,reserve},ties:[...new Map(ties.map(tie=>[tie.id,tie])).values()],pendingKeys:[...pending]};
}
module.exports={select};
