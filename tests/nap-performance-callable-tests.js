"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("functions/index.js","utf8"),start=source.indexOf("const NAP_PERFORMANCE_OPTIONS="),end=source.indexOf("  const data = request.data || {};",start);
const section=source.slice(start,end)+"});";
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
function fixture(){
 const exports={},trace=[],options=[];
 const authorize=request=>{if(!request.auth?.token?.livepalmesCapabilities?.["competitions.import"])throw new HttpsError("permission-denied","denied");};
 vm.runInNewContext(section,{exports,ENVIRONMENT:{sportingDataSource:"nap",projectId:"livepalmes"},CALLABLE_OPTIONS:{},defineSecret:x=>x,onCall:(o,fn)=>{options.push(o);return fn;},ADMIN_UIDS:new Set(),HttpsError,TypeError,RangeError,assertCapability:authorize,process:{env:{LIVEPALMES_NAP_PASSWORD:"test-only"}},require:name=>{
  if(name==="./nap-portal-swimmers")return{portalPool:()=>{trace.push("pool");return {};}};
  if(name==="./nap-performance-administration")return{createPerformanceAdministration:o=>async request=>{await o.authorize(request);await o.getPool();return{source:"nap"};}};
  if(name==="./nap-performance-write")return{createPerformanceWriter:o=>({change:async(request,input)=>{const actor=await o.authorize(request);await o.getPool();if(input.fail)throw Error("secret sql driver error");return{source:"nap",national:actor.national};}})};
  throw Error("Unexpected dependency");
 }});return{exports,trace,options};
}
(async()=>{
 const f=fixture(),request={auth:{uid:"regional",token:{livepalmesCapabilities:{"competitions.import":true}}},data:{}};
 assert.equal((await f.exports.savePerformanceCorrection(request)).national,false);
 request.data.national=true;assert.equal((await f.exports.savePerformanceCorrection(request)).national,false,"client cannot elevate deletion rights");
 request.auth.token.livepalmesCapabilities["engagements.national.manage"]=true;assert.equal((await f.exports.savePerformanceCorrection(request)).national,true);
 assert.equal((await f.exports.getNapPerformanceAdministration(request)).source,"nap");assert.ok(f.options.every(o=>o.secrets.includes("LIVEPALMES_NAP_PASSWORD")));
 const denied=fixture();await assert.rejects(()=>denied.exports.savePerformanceCorrection({auth:{uid:"x",token:{}},data:{}}),e=>e.code==="permission-denied");assert.equal(denied.trace.length,0);
 request.data.fail=true;await assert.rejects(()=>f.exports.savePerformanceCorrection(request),e=>e.code==="unavailable"&&!/secret|driver|sql/.test(e.message));
 console.log("NAP correction callables: native dispatch, server-held national rights, denied before pool, secret scope and sanitized errors verified.");
})().catch(e=>{console.error(e);process.exitCode=1;});
