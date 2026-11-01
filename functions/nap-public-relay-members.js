"use strict";
const {parseCompactTime,formatTime}=require("./nap-duration");
const { text } = require("./nap-calendar-values");
const MAX_MEMBERS=4000;
const memberIds=row=>[1,2,3,4].map(position=>Number(row[`nageur${position}`]||row.memberIds?.[position-1]||0));
async function readMembers(pool,relays){
  const ids=[...new Set(relays.flatMap(memberIds).filter(id=>Number.isSafeInteger(id)&&id>0&&id<=2147483647))];
  if(ids.length>MAX_MEMBERS)return {available:false,profiles:new Map()};
  const [rows]=ids.length?await pool.execute({sql:`SELECT id,nom,prenom FROM nageurs FORCE INDEX (PRIMARY) WHERE id IN (${ids.map(()=>"?").join(",")}) ORDER BY id LIMIT ${MAX_MEMBERS+1}`,timeout:10000},ids):[[]];
  if(rows.length>MAX_MEMBERS)throw new RangeError("Trop de membres de relais.");
  return {available:true,profiles:new Map(rows.map(row=>[Number(row.id),{id:String(row.id),name:[text(row.prenom),text(row.nom)].filter(Boolean).join(" ")}]))};
}
function membersFor(row,profiles){
  const cumulative=[1,2,3,4].map(position=>row.status?null:parseCompactTime(row[`tps${position}`]));
  const final=cumulative[3];
  return memberIds(row).map((id,index)=>{
    const person=profiles.get(id),current=cumulative[index],previous=index===0?0:cumulative[index-1];
    const split=current!=null&&previous!=null&&current>previous&&(!final||current<=final)?current-previous:null;
    return {position:index+1,swimmer:person?.name||"Nageur non renseigné",swimmerId:person?.name?person.id:"",cumulativeTime:current?formatTime(current):"",splitTime:split?formatTime(split):""};
  });
}
module.exports={MAX_MEMBERS,readMembers,membersFor};
