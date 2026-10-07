"use strict";
const {createNativeDtnSeasonService}=require("./nap-dtn-season-service"),repo=require("./nap-dtn-season-repository"),{sourceStamp}=require("./nap-dtn-source-stamp"),{indexed}=require("./nap-dtn-source");
async function inspectDtnService(pool) {
  const plans=[];let statements=0;
  const execute=async(executor,query,values=[])=>{
    if(!/^(SELECT |SET SESSION information_schema_stats_expiry=0$)/.test(query.sql) || /FOR UPDATE|GET_LOCK|RELEASE_LOCK/.test(query.sql)) throw new TypeError("Diagnostic DTN en lecture seule uniquement.");
    if(/ FROM (livepalmes_dtn_|competitions)/.test(query.sql)) {
      const [plan]=await executor.execute({sql:`EXPLAIN ${query.sql}`,timeout:10000},values);statements++;
      if(!indexed(plan)) throw new TypeError("Plan du service DTN a verifier.");
      plans.push(plan.map(r=>({table:r.table,type:r.type,key:r.key,rows:r.rows,extra:r.Extra||""})));
    }
    statements++;return executor.execute(query,values);
  };
  const readonly={execute:(q,v)=>execute(pool,q,v),getConnection:async()=>{
    const c=await pool.getConnection();return {execute:(q,v)=>execute(c,q,v),release:()=>c.release()};
  }};
  const service=createNativeDtnSeasonService({getPool:()=>readonly,authorize:async()=>{},canManage:()=>true,fail:message=>{throw new TypeError(message);}});
  const listed=await service.list({});
  const sources=await service.sources({data:{id:listed.catalog.current}});
  const views=await repo.readViews(readonly,[listed.catalog.current]);
  let changeTrackingAvailable=false;
  try {await sourceStamp(readonly,{settled:true});changeTrackingAvailable=true;}catch { /* expose availability only, never server details */ }
  const complete=changeTrackingAvailable && plans.every(p=>!p.some(r=>/filesort/i.test(r.extra)));
  if(statements>15) throw new RangeError("Diagnostic DTN trop volumineux.");
  return {source:"nap",mode:"dtn-service-contract-readonly",catalog:listed.catalog,seasons:listed.seasons.map(s=>({id:s.id,revision:s.revision})),sourcePageRows:sources.sources.length,existingNativeViews:views.length,changeTrackingAvailable,plans,complete,writesExecuted:false,sqlBudget:{queriesExecuted:statements,queriesMax:15}};
}
module.exports={inspectDtnService};
