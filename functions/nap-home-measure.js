"use strict";
const {civilAt}=require("./nap-paris-time");
async function measure(pool,{direct=false}={}){
 const connection=await pool.getConnection(),today=civilAt(Date.now()).slice(0,10);
 try{
  const [indexes]=await connection.execute({sql:"SELECT INDEX_NAME,COLUMN_NAME,SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='competitions' ORDER BY INDEX_NAME,SEQ_IN_INDEX LIMIT 50",timeout:10000});
  const queries={future:{sql:"SELECT id,date,enddate,libelle,lieu,type,typecnc,ld FROM competitions FORCE INDEX (livepalmes_date_id) WHERE date>=? ORDER BY date,id LIMIT 101",values:[today]},ongoing:{sql:"SELECT id,date,enddate FROM competitions WHERE date<? AND enddate>=? ORDER BY enddate,id LIMIT 101",values:[today,today]}};
  if(direct){const actual=require("./nap-home-direct").queries(today);queries.future=actual[0];queries.ongoing=actual[1];}
  const checks=[];
  for(const [name,query]of Object.entries(queries)){
   const [plan]=await connection.execute({sql:`EXPLAIN ${query.sql}`,timeout:10000},query.values);
   // The fixed event-type reference has five rows on NAP; MySQL deliberately
   // scans it instead of its key. Only that alias (max 50) and bounded windows
   // may scan; competition/performance history scans remain forbidden.
   const boundedScan=row=>direct&&(((row.table==="home_candidates"||/^<derived/.test(row.table))&&Number(row.rows)<=501)||(row.table==="t"&&Number(row.rows)<=50));
   const fullScan=plan.some(row=>(row.type==="ALL"||row.type==="index")&&!boundedScan(row)),overBudget=!direct&&name==="ongoing"&&plan.some(row=>Number(row.rows)>501),samples=[];
   // Inspect only: never execute an unbounded history scan.
   if(!fullScan&&!overBudget)for(let i=0;i<3;i++){
    const counters=async()=>Object.fromEntries((await connection.query("SHOW SESSION STATUS WHERE Variable_name LIKE 'Handler_read_%'"))[0].map(row=>[row.Variable_name,Number(row.Value)]));
    const before=await counters(),started=performance.now(),[rows]=await connection.execute({sql:query.sql,timeout:10000},query.values),durationMs=performance.now()-started,after=await counters();
    samples.push({returned:rows.length,durationMs:Math.round(durationMs*100)/100,handlers:Object.fromEntries(Object.keys(after).map(key=>[key,after[key]-before[key]]))});
   }
   checks.push({name,fullScan,overBudget,plan:plan.map(row=>({table:row.table,type:row.type,key:row.key,estimatedRows:row.rows,extra:row.Extra})),samples});
  }
  return {measuredAt:new Date().toISOString(),today,napWrites:0,source:"nap",direct,indexes,checks};
 }finally{connection.release();}
}
module.exports={measure};
