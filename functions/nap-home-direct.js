"use strict";
const calendar=require("./nap-direct-calendar"),home=require("./nap-home-events"),{civilAt}=require("./nap-paris-time");
const CACHE_MS=5*60*1000,MAX_CANDIDATES=500;
function queries(today){
 // Bound the driving index window BEFORE the one-to-one joins and result checks.
 return [
  {index:"livepalmes_date_id",column:"date"},
  {index:"livepalmes_enddate_id",column:"enddate"}
 ].map(({index,column})=>({sql:`${calendar.SELECT_EVENT.replace("FROM competitions c",`FROM (SELECT id FROM competitions FORCE INDEX (${index}) WHERE ${column}>=? ORDER BY ${column},id LIMIT ${MAX_CANDIDATES+1}) home_candidates JOIN competitions c ON c.id=home_candidates.id`)}${calendar.EVENT_JOINS}`,values:[today]}));
}
async function read(pool,now=Date.now()){
 const today=civilAt(now).slice(0,10),events=new Map();
 for(const query of queries(today)){
  const [rows]=await pool.execute({sql:query.sql,timeout:5000},query.values);
  if(rows.length>MAX_CANDIDATES)throw new RangeError("Fenêtre des rendez-vous trop volumineuse.");
  for(const row of rows){
   const event=calendar.eventFromRow(row);
   if(event.date&&event.date>="1900-01-01"&&event.endDate>=event.date&&event.endDate>=today)events.set(event.id,home.eventSummary(event));
  }
 }
 return home.validateSnapshot({schemaVersion:1,source:"nap",generatedAt:new Date(now).toISOString(),events:[...events.values()]},now);
}
function createReader(load,clock=()=>Date.now()){
 let saved=null,loadedAt=0,pending=null,lastError=null,failed=false;
 return async()=>{
  const now=clock();
  if(!pending&&(saved||lastError)&&now-loadedAt<CACHE_MS){if(!saved)throw lastError;return {...saved,stale:failed};}
  if(!pending)pending=Promise.resolve().then(load).then(value=>{saved=home.validateSnapshot({schemaVersion:1,...value},clock());lastError=null;failed=false;}).catch(error=>{lastError=error;failed=true;if(!saved)throw error;}).finally(()=>{loadedAt=clock();pending=null;});
  await pending;return {...saved,stale:failed};
 };
}
module.exports={CACHE_MS,MAX_CANDIDATES,queries,read,createReader};
