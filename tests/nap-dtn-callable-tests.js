"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("functions/index.js","utf8");
const section=source.slice(source.indexOf("function dtnSeasonService()"),source.indexOf("function dtnQualificationRow"));
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
function fixture(projectId) {
  const trace=[],exports={},requests=[];
  const native={list:async request=>{trace.push("native.list");return {source:"nap"};},overview:async()=>{throw new TypeError("Settled source required");},update:async()=>{throw new Error("Sensitive SQL credential");},sources:async()=>({source:"nap"})};
  const context={ENVIRONMENT:{projectId},CALLABLE_OPTIONS:{region:"test",invoker:"public"},db:{collection:()=>{throw new Error("Abandoned data accessed");}},FieldPath:{},exports,HttpsError,TypeError,RangeError,publicPerformanceBaseRow:()=>{},ADMIN_UIDS:new Set(),onCall:(options,fn)=>{requests.push(options);return fn;},assertLivePalmesAccess:async()=>{},assertCapability:()=>{},writeAuditLogOnce:async()=>{},createDtnSeasonService:()=>{trace.push("old.factory");return {list:async()=>({source:"old"})};},require:name=>{
    if(name==="./nap-dtn-season-service") return {createNativeDtnSeasonService:options=>{trace.push("native.factory");assert.equal(typeof options.authorize,"function");assert.equal(typeof options.canManage,"function");return native;}};
    throw new Error(`Unexpected dependency ${name}`);
  }};
  vm.runInNewContext(section,context);return {exports,trace,requests};
}
(async()=>{
  const test=fixture("livepalmes-test");assert.equal((await test.exports.getDtnSeasons({})).source,"nap");assert.ok(!test.trace.includes("old.factory"));
  assert.ok(test.requests.every(options=>options.secrets.includes("LIVEPALMES_NAP_PASSWORD") && options.timeoutSeconds===540));
  await assert.rejects(()=>test.exports.getDtnSeasonOverview({}),e=>e.code==="failed-precondition" && e.message==="Settled source required");
  await assert.rejects(()=>test.exports.updateDtnSeason({}),e=>e.code==="unavailable" && !/Sensitive|credential/.test(e.message));
  const prod=fixture("livepalmes");assert.equal((await prod.exports.getDtnSeasons({})).source,"old");assert.ok(!prod.trace.includes("native.factory"));assert.ok(prod.requests.every(o=>!o.secrets));
  for(const name of ["refreshDtnQualificationCache","getDtnQualificationOverview","refreshDtnListingCache","getDtnListingOverview"]) {
    const start=source.indexOf(`exports.${name} =`),body=source.slice(start,source.indexOf("  const seasonYear",start))+"});";
    const exports={};vm.runInNewContext(body,{exports,onCall:(_o,fn)=>fn,CALLABLE_OPTIONS:{},ENVIRONMENT:{projectId:"livepalmes-test"},assertCapability:()=>{},HttpsError,Date});
    await assert.rejects(()=>exports[name]({}),e=>e.code==="failed-precondition");
  }
  const start=source.indexOf("exports.buildDtnQualificationView ="),builder=source.slice(start,source.indexOf("  const snapshot",start))+"});";
  const exports={};vm.runInNewContext(builder,{exports,onDocumentCreated:(_o,fn)=>fn,DTN_QUALIFICATION_JOB_OPTIONS:{},ENVIRONMENT:{projectId:"livepalmes-test"}});
  await exports.buildDtnQualificationView({get data(){throw new Error("Old sporting job accessed");}});
  console.log("DTN TEST callables: native-only seasonal dispatch, existing production path, NAP secret scope, useful sanitized failures and abandoned sporting entry points refused.");
})().catch(e=>{console.error(e);process.exitCode=1;});
