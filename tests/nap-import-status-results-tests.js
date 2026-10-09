"use strict";
const assert=require("node:assert/strict"),{readImportStatusResults}=require("../functions/nap-import-status-results");
(async()=>{
 const queries=[];const pool={execute:async(query,values)=>{queries.push({query,values});return [query.sql.includes("FROM livepalmes_performance_imports")?[{metadata:JSON.stringify({currentImportId:"current"})}]:[{row_number:5,expected_row:JSON.stringify({table:"status",row:{kind:"NAG",status:"DSQ",course:"100SF",sex:"M",firstName:"Test",lastName:"Person",swimmerId:168,clubCode:"TEST",category:"HSE",rawFinalTime:"014200"}})}]];}};
 const rows=await readImportStatusResults(pool,5162);assert.equal(queries.length,2);assert.match(queries[1].query.sql,/FORCE INDEX \(PRIMARY\).*LIMIT 5001$/);assert.equal(rows[0].time,"Disqualification");assert.equal(rows[0].personalBest,false);assert.equal(rows[0].swimmerId,"168");assert.equal(rows[0].timeValue,undefined,"no valid sporting time published");
 await assert.rejects(readImportStatusResults({execute:async()=>[[{metadata:{activeImportId:"active"}}]]},5162),/en cours/);
 assert.deepEqual(await readImportStatusResults({execute:async()=>[[]]},5162),[]);
 console.log("NAP imported statuses: indexed current version, no valid sporting time and interrupted-import refusal verified.");
})().catch(error=>{console.error(error);process.exitCode=1;});
