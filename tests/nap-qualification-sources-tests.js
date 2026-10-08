"use strict";
const assert=require("node:assert/strict");
const {statement,listSources}=require("../functions/nap-qualification-sources");
const input={startDate:"2025-09-01",endDate:"2026-08-31"};
assert.deepEqual(statement(input).values,["2025-01-01","2026-12-31"]);
for(const change of [{startDate:"2025-02-30"},{startDate:"2027-01-01"},{cursor:"bad"},{cursor:JSON.stringify({startDate:"2020-01-01",endDate:input.endDate,date:"2026-01-01",id:1})}]) assert.throws(()=>statement({...input,...change}));
(async()=>{
 let calls=0;
 const rows=Array.from({length:51},(_,i)=>({id:i+1,date:"2026-01-01",ld:2,libelle:"Formation",bassin:50,chrono:"E"}));
 const pool={execute:async({sql},values)=>{calls++;assert.match(sql,/FORCE INDEX \(livepalmes_date_id\)/);assert.match(sql,/LIMIT 51$/);assert.ok(!sql.includes("ld="));return [rows];}};
 const empty=await listSources(pool,input);assert.equal(calls,1);assert.deepEqual(empty.sources,[]);assert.ok(empty.cursor,"An empty filtered page must still advance using native rows");
 assert.deepEqual(statement({...input,cursor:empty.cursor}).values,["2025-01-01","2026-12-31","2026-01-01","2026-01-01",50]);
 rows.splice(0,rows.length,{id:5140,date:"2026-01-01",ld:0,libelle:"Club &amp; compétition",bassin:50,chrono:"E"});
 const result=await listSources(pool,input);assert.equal(calls,2);assert.equal(result.cursor,"");assert.deepEqual(result.sources,[{id:"5140",name:"Club & compétition",date:"2026-01-01",pool:"50",chrono:"electronic"}]);
 console.log("NAP qualification sources: one bounded indexed page, annual window, native ids and pagination through non-pool events tested offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
