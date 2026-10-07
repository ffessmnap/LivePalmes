"use strict";
const source=require("./nap-dtn-source");
async function inspectDtnSource(pool) {
  const plans=[];
  const capture=async(executor,query,values)=>{
    const result=await executor.execute(query,values);
    if(query.sql.startsWith("EXPLAIN ")) plans.push(result[0].map(r=>({table:r.table,type:r.type,key:r.key,rows:r.rows,extra:r.Extra||""})));
    return result;
  };
  const readonly={execute:(q,v)=>capture(pool,q,v),getConnection:async()=>{
    const connection=await pool.getConnection();
    return {execute:(q,v)=>capture(connection,q,v),release:()=>connection.release()};
  }};
  const competitionIds=await source.readCompetitionIds(readonly,2026,()=>{});
  const page=competitionIds.length?await source.readPage(readonly,{year:2026,competitionIds,cursor:null},()=>{}):null;
  const repeatedSort=plans.some(plan=>plan.some(row=>/filesort/i.test(row.extra)));
  return {source:"nap",mode:"dtn-source-contract-readonly",year:2026,competitionCount:competitionIds.length,scannedRows:page?.scannedRows||0,excludedRows:page?.excludedRows||0,normalizedRows:page?.rows.length||0,hasMore:page?.hasMore||false,plans,complete:!repeatedSort,writesExecuted:false,sqlBudget:{queriesExecuted:page?4:2}};
}
module.exports={inspectDtnSource};
