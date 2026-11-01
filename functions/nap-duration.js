"use strict";
// Legacy NAP: hours + space + MMSSCC, sometimes without leading zeros.
// Compare durations numerically without rewriting historical stored values.
const { parseCompactTime: __nativeMember0, formatTime: __nativeMember1 } = require("./nap-performance-time");
const pool={ parseCompactTime: __nativeMember0, formatTime: __nativeMember1 };
function parseCompactTime(value){
  const raw=String(value??"").trim(),match=/^(\d{1,2}) (\d{1,6})$/.exec(raw);
  if(!match)return pool.parseCompactTime(value);
  const tail=match[2].padStart(6,"0"),hours=Number(match[1]),minutes=Number(tail.slice(0,2)),seconds=Number(tail.slice(2,4)),cc=Number(tail.slice(4));
  if(minutes>59||seconds>59)return null;
  const total=((hours*60+minutes)*60+seconds)*100+cc;
  return total>0?total:null;
}
function formatTime(value){
  const total=Number(value||0);
  if(total<360000)return pool.formatTime(value);
  const hours=Math.floor(total/360000),minutes=Math.floor(total%360000/6000),seconds=Math.floor(total%6000/100),cc=total%100;
  return `${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}.${String(cc).padStart(2,"0")}`;
}
function storedTime(value){
  if(!Number.isSafeInteger(value)||value<=0||value>=100*360000)return null;
  const hours=Math.floor(value/360000),tail=value%360000,minutes=Math.floor(tail/6000),seconds=Math.floor(tail%6000/100),cc=tail%100;
  const compact=`${String(minutes).padStart(2,"0")}${String(seconds).padStart(2,"0")}${String(cc).padStart(2,"0")}`;
  return hours?`${hours} ${compact}`:compact;
}
module.exports={parseCompactTime,formatTime,storedTime};
