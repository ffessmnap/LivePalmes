"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("functions/index.js","utf8");
const endings={previewCompetitionImport:"  const parsed = parseCompetitionImportPayload",createCompetitionImport:"  const fileName = cleanText",listCompetitionImports:"  const snapshot = await db"};
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
function fixture() {
 const trace=[],exports={};
 const authorize=request=>{trace.push("auth");if(!request.auth?.uid)throw new HttpsError("permission-denied","denied");return{uid:request.auth.uid};};
 const context={exports,COMPETITION_IMPORT_CALLABLE_OPTIONS:{},onCall:(_,handler)=>handler,ENVIRONMENT:{projectId:"livepalmes-test"},assertCapability:authorize,authorizeNativePerformance:authorize,HttpsError,process:{env:{LIVEPALMES_NAP_PASSWORD:"fixture"}},nativePerformanceFailure:error=>new HttpsError("unavailable","Native operation interrupted"),
 db:new Proxy({},{get(){throw Error("Legacy sporting Firebase accessed");}}),require:name=>{
  if(name==="./nap-portal-swimmers")return{portalPool:()=>{trace.push("pool");return{};}};
  if(name==="./nap-import-preview")return{previewNativeImport:async()=>{trace.push("preview");return{};}};
  if(name==="./nap-import-response")return{importPreviewResponse:()=>({source:"nap"})};
  if(name==="./nap-import-history")return{readImportHistory:async()=>{trace.push("history");return{source:"nap"};}};
  if(name==="./nap-import-write")return{createNativeImportWriter:options=>async request=>{await options.authorize(request);await options.getPool();trace.push("write");return{source:"nap"};}};
  throw Error("Unexpected dependency "+name);
 }};
 for(const [name,end] of Object.entries(endings)) {
  const start=source.indexOf(`exports.${name} = onCall(`),stop=source.indexOf(end,start);
  assert.ok(start>0&&stop>start);vm.runInNewContext(source.slice(start,stop)+"});",context);
 }
 return{trace,exports};
}
(async()=>{
 for(const name of Object.keys(endings)) {
  let f=fixture();assert.equal((await f.exports[name]({auth:{uid:"importer"},data:{}})).source,"nap");assert.ok(f.trace.indexOf("auth")<f.trace.indexOf("pool"));
  f=fixture();await assert.rejects(()=>f.exports[name]({data:{}}),error=>error.code==="permission-denied");assert.ok(!f.trace.includes("pool"));
 }
 const f=fixture();await assert.rejects(()=>f.exports.previewCompetitionImport({auth:{uid:"importer"},data:{sourceType:"international-xlsx"}}),error=>error.code==="failed-precondition");assert.ok(!f.trace.includes("pool"));
 console.log("NAP import callables: native-only TEST preview/write/history, authorization before pool and deferred Excel refusal verified.");
})().catch(error=>{console.error(error);process.exitCode=1;});
