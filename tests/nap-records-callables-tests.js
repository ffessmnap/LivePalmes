"use strict";
const assert=require("node:assert/strict"),fs=require("./helpers/source-files"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index"),"utf8");
const acorn=require("./firestore-rules/node_modules/acorn");
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
let reads=0,writes=0,audits=0;
const context={exports:{},CALLABLE_OPTIONS:{},defineSecret:x=>x,onCall:(options,handler)=>Object.assign(handler,{options}),HttpsError,ADMIN_UIDS:new Set(["legacy"]),ENVIRONMENT:{sportingDataSource:"nap"},process:{env:{LIVEPALMES_NAP_PASSWORD:"private"}},nativePerformanceFailure:e=>e,writeAuditLogOnce:async()=>{audits++;},require:name=>{
  if(name==="./nap-portal-swimmers")return {portalPool:()=>({native:true})};
  if(name==="./nap-records-store")return {read:async(pool,options)=>{assert.equal(pool.native,true);assert.equal(options.administration,true);reads++;return {source:"nap",revision:1,data:{}};},publish:async(pool,input,actor)=>{assert.equal(pool.native,true);assert.equal(actor.uid,"manager");writes++;return {source:"nap",revision:2,data:{updatedAt:"2026-10-12"}};}};
  throw Error(name);
}};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf("function assertCapability("),source.indexOf("async function assertLivePalmesAccess(")),context);
vm.runInContext(source.slice(source.indexOf("function authorizeNapRecords("),source.indexOf("function authorizeNativePerformance(")),context);
for(const node of acorn.parse(source,{ecmaVersion:"latest"}).body){
  const expression=node.expression;
  if(expression?.type==="AssignmentExpression" && expression.left.object?.name==="exports" && ["getNapPerformanceAdministration","savePerformanceCorrection"].includes(expression.left.property?.name))vm.runInContext(source.slice(node.start,node.end),context);
}
const request=(uid,caps,recordsAction="read")=>({auth:{uid,token:{livepalmesAccess:true,livepalmesCapabilities:caps,email:"actor@example.test"}},data:{operationId:"operation",recordsAction}});
(async()=>{
 const read=context.exports.getNapPerformanceAdministration,write=context.exports.savePerformanceCorrection;
 await assert.rejects(()=>read({data:{recordsAction:"read"}}),e=>e.code==="unauthenticated");
 await assert.rejects(()=>read(request("no-right",{})),e=>e.code==="permission-denied");
 await assert.rejects(()=>write(request("national-only",{"engagements.national.manage":true},"publish")),e=>e.code==="permission-denied");
  const inactive=request("inactive",{"records.manage":true});inactive.auth.token.livepalmesAccess=false;
  await assert.rejects(()=>read(inactive),e=>e.code==="permission-denied");
 assert.equal(reads+writes,0);
 await read(request("manager",{"records.manage":true}));
 await read(request("full",{"admin.full":true}));await read(request("legacy",{}));
 await write(request("manager",{"records.manage":true},"publish"));
 await assert.rejects(()=>write(request("manager",{"records.manage":true},"read")),e=>e.code==="invalid-argument");
 assert.equal(reads,3);assert.equal(writes,1);assert.equal(audits,1);assert.deepEqual([...read.options.secrets],["LIVEPALMES_NAP_PASSWORD"]);
 console.log("Records callables: existing rights preserved, unauthenticated/unauthorised stopped before SQL, native source and audit verified.");
})().catch(e=>{console.error(e);process.exitCode=1;});
