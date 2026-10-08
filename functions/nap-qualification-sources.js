"use strict";
// One indexed date/id page, 51 rows max. Filter pool events after pagination,
// so an empty pool-only page cannot scan all other event types in SQL.
const {positiveId,date,text}=require("./nap-direct-calendar");
const {cleanTimingType}=require("./performance-import-timing");
function validDate(value) {
  if(typeof value!=="string"||!date(value)||new Date(`${value}T12:00:00Z`).toISOString().slice(0,10)!==value) throw new TypeError("Periode de qualification invalide.");
  return value;
}
function statement(input) {
  const startDate=validDate(input?.startDate),endDate=validDate(input?.endDate);
  if(startDate>endDate) throw new TypeError("Periode de qualification inversee.");
  const start=`${startDate.slice(0,4)}-01-01`,end=`${endDate.slice(0,4)}-12-31`;
  let cursor=null;
  if(input.cursor) {
    if(typeof input.cursor!=="string"||input.cursor.length>300) throw new TypeError("Pagination de qualification invalide.");
    try {cursor=JSON.parse(input.cursor);} catch {throw new TypeError("Pagination de qualification invalide.");}
    if(cursor.startDate!==startDate||cursor.endDate!==endDate||validDate(cursor.date)<start||cursor.date>end||!Number.isSafeInteger(cursor.id)||positiveId(cursor.id)!==cursor.id) throw new TypeError("Pagination de qualification incompatible.");
  }
  return {sql:`SELECT id,libelle,date,bassin,chrono,ld FROM competitions FORCE INDEX (livepalmes_date_id) WHERE date>=? AND date<=?${cursor?" AND (date>? OR (date=? AND id>?))":""} ORDER BY date,id LIMIT 51`,values:[start,end,...(cursor?[cursor.date,cursor.date,cursor.id]:[])],startDate,endDate};
}
async function listSources(connection,input) {
  const query=statement(input),[rows]=await connection.execute({sql:query.sql,timeout:10000},query.values);
  if(rows.length>51||new Set(rows.map(row=>row.id)).size!==rows.length) throw new TypeError("Page de competitions NAP ambigue.");
  const page=rows.slice(0,50),last=page.at(-1);
  const sources=page.filter(row=>Number(row.ld)===0).map(row=>({id:String(positiveId(row.id)),name:text(row.libelle),date:validDate(row.date),pool:[25,50].includes(Number(row.bassin))?String(row.bassin):"",chrono:cleanTimingType(row.chrono)}));
  return {sources,cursor:rows.length>50?JSON.stringify({startDate:query.startDate,endDate:query.endDate,date:validDate(last.date),id:positiveId(last.id)}):"",source:"nap"};
}
module.exports={statement,listSources};
