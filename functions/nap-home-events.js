"use strict";
const calendar=require("./nap-direct-calendar");
const {civilAt}=require("./nap-paris-time");
const parisToday=()=>civilAt(Date.now()).slice(0,10);
function validDate(value){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const millis=Date.parse(`${value}T12:00:00Z`);return Number.isFinite(millis)&&new Date(millis).toISOString().slice(0,10)===value;
}
const OBJECT_PATH="site-home/events-v1.json";
const MAX_AGE_MS=3*60*60*1000;
const MAX_BYTES=2*1024*1024;
function eventSummary(event){
 const resultUrl=event.results?.url||"";
 return {...Object.fromEntries(["id","name","date","endDate","city","location","eventType","level","canceled"].map(key=>[key,event[key]])),results:{url:/^competition\.html\?id=legacy-nap-[1-9]\d*#competitionResultsTitle$/.test(resultUrl)?resultUrl:"",pdfUrl:calendar.publicUrl(event.results?.pdfUrl||"")}};
}
async function readPage(pool,input={}){
 const after=Number(input.after||0),today=input.today||parisToday();
 if(!Number.isSafeInteger(after)||after<0||after>2147483647||!validDate(today))throw new TypeError("Préparation du calendrier invalide.");
 const [rows]=await pool.execute({sql:`${calendar.SELECT_EVENT} FORCE INDEX (PRIMARY)${calendar.EVENT_JOINS} WHERE c.id>? AND (c.date>=? OR c.enddate>=?) ORDER BY c.id LIMIT 101`,timeout:10000},[after,today,today]);
 if(rows.some((row,i)=>!Number.isSafeInteger(Number(row.id))||Number(row.id)<=(i?Number(rows[i-1].id):after)))throw new TypeError("Calendrier ambigu à vérifier.");
 const page=rows.slice(0,100),hasMore=rows.length>100;
 return {source:"nap",today,events:page.map(calendar.eventFromRow).filter(event=>validDate(event.date)&&validDate(event.endDate)&&event.endDate>=event.date&&event.endDate>=today).map(eventSummary),hasMore,nextAfterId:hasMore?Number(page.at(-1).id):null};
}
function validateSnapshot(value,now=Date.now()){
 const generatedAt=Date.parse(value?.generatedAt||"");
 if(value?.schemaVersion!==1||value.source!=="nap"||!Number.isFinite(generatedAt)||generatedAt>now+5*60*1000||now-generatedAt>MAX_AGE_MS||!Array.isArray(value.events)||value.events.length>10000)throw new TypeError("Rendez-vous momentanément indisponibles.");
 if(new Set(value.events.map(event=>event.id)).size!==value.events.length||value.events.some(event=>!/^legacy-nap-[1-9]\d*$/.test(event.id||"")||Number(event.id.slice(11))>2147483647||!validDate(event.date)||!validDate(event.endDate)||event.endDate<event.date||["name","city","location","eventType","level"].some(key=>typeof event[key]!=="string"||event[key].length>2000)||typeof event.canceled!=="boolean"||[event.results?.url,event.results?.pdfUrl].some(link=>link!=null&&typeof link!=="string")))throw new TypeError("Rendez-vous momentanément indisponibles.");
 return {source:"nap",generatedAt:value.generatedAt,events:value.events.map(eventSummary)};
}
function createReader(load,clock=()=>Date.now()){
 let saved=null,loadedAt=0,pending=null;
 return async()=>{
  const now=clock();
  if(saved&&now-loadedAt<60000)return validateSnapshot(saved,now);
  if(!pending)pending=(async()=>{
   const bytes=await load();if(bytes.length>MAX_BYTES)throw new TypeError("Rendez-vous momentanément indisponibles.");
   const value=JSON.parse(bytes.toString("utf8"));validateSnapshot(value,clock());saved=value;loadedAt=clock();
  })().finally(()=>{pending=null;});
  await pending;return validateSnapshot(saved,clock());
 };
}
module.exports={OBJECT_PATH,MAX_AGE_MS,MAX_BYTES,eventSummary,readPage,validateSnapshot,createReader};
