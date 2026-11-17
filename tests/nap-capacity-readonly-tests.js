"use strict";
require('./helpers/offline-network');
const assert=require("node:assert/strict");
const {collect,context,readPassword,QUERIES,STATUS}=require("../tools/nap-capacity-readonly.js");
const limits={serverVersion:"5.7.44-log",maxConnections:"151",accountMaxConnections:"20",defaultMaxUserConnections:"0",unexpectedSecret:"DO-NOT-EXPORT"};
const values=()=>STATUS.map((name,index)=>({Variable_name:name,Value:String(index+1),privateField:"DO-NOT-EXPORT"}));
function fixture(first=[limits],second=values()){const queries=[];return {queries,connection:{query:async options=>{assert.equal(options.timeout,5000);assert.equal(options.sql,QUERIES[queries.length]);queries.push(options.sql);return [queries.length===1?first:second];}}};}
const denied=(promise,code)=>assert.rejects(promise,error=>error.safeCode===code);
(async()=>{
 const valid=fixture(),report=await collect(valid.connection);assert.equal(valid.queries.length,2);assert.equal(report.server.accountMaxConnections,20);assert.equal(report.server.defaultMaxUserConnections,0);assert.equal(report.maxConnectionsCreated,1);assert.equal(report.writes,0);assert(!JSON.stringify(report).includes("DO-NOT-EXPORT"));assert.deepEqual(Object.keys(report.observations).sort(),[...STATUS].sort());assert.equal(report.limits.globalBudgetApproved,false);assert.equal(report.limits.functionSqlAccountMatchingVerified,false);assert.equal(report.limits.accountLimitScope,"current collector session only");
 const zero=fixture([{...limits,accountMaxConnections:0}]);assert.equal((await collect(zero.connection)).server.accountMaxConnections,0,"No arbitrary account limit invented for zero");
 for(const first of [[],[limits,limits],[{...limits,serverVersion:"8.0.99"}],[{...limits,serverVersion:"5.7.44",maxConnections:0}]]){const f=fixture(first);await assert.rejects(collect(f.connection));assert.equal(f.queries.length,1,"Invalid target refuses further metadata calls");}
 for(const broken of [values().slice(1),values().map((x,i)=>i===0?{...x,Variable_name:"Password"}:x),values().map((x,i)=>i===0?{...x,Value:"-1"}:x),values().map((x,i)=>i===0?{...x,Value:"9007199254740992"}:x),values().map((x,i)=>i===1?{...x,Variable_name:STATUS[0]}:x)])await assert.rejects(collect(fixture([limits],broken).connection));
 const env={GITHUB_REPOSITORY:"ffessmnap/LivePalmes",GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_dispatch",GITHUB_RUN_ATTEMPT:"1",GITHUB_WORKFLOW_REF:"ffessmnap/LivePalmes/.github/workflows/nap-capacity-readonly.yml@refs/heads/main",GITHUB_SHA:"a".repeat(40),EXPECTED_COMMIT:"a".repeat(40),GITHUB_RUN_ID:"123"};context(env);
 for(const key of Object.keys(env))assert.throws(()=>context({...env,[key]:"wrong"}),error=>error.safeCode==="READONLY_WORKFLOW_CONTEXT_REQUIRED");
 let calls=0;const request=async(url,options)=>{calls++;assert.equal(url,"https://secretmanager.googleapis.com/v1/projects/livepalmes-test/secrets/LIVEPALMES_NAP_PASSWORD/versions/latest:access");assert.equal(options.headers.Authorization,"Bearer FAKE-TOKEN");return {ok:true,json:async()=>({payload:{data:Buffer.from("FAKE-PASSWORD").toString("base64")}})};};assert.equal(await readPassword(request,"FAKE-TOKEN"),"FAKE-PASSWORD");assert.equal(calls,1);
 await denied(readPassword(async()=>({ok:false,status:403}),"fake"),"SECRET_ACCESS_HTTP_403");await denied(readPassword(async()=>({ok:true,json:async()=>({payload:{data:""}})}),"fake"),"NAP_PASSWORD_MISSING");
 console.log("Candidate SQL collector passed offline: exact two-query budget; target, numeric metadata and privacy refusals; fixed secret target; context guard. No network connection.");
})().catch(error=>{console.error(error);process.exitCode=1;});
