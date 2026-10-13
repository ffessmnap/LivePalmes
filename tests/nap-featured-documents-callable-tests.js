"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
let national=true,reads=0,saves=0,audits=0;
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
const context={exports:{},CALLABLE_OPTIONS:{region:"europe-west1"},ENVIRONMENT:{sportingDataSource:"nap"},process:{env:{}},Date,HttpsError,
 defineSecret:name=>name,onCall:(options,fn)=>Object.assign(fn,{options}),
 engagementAccessContext:async request=>{if(!request.auth)throw new HttpsError("unauthenticated","Connexion requise");return {uid:"trusted",national};},
 writeAuditLogOnce:async(action,uid)=>{assert.equal(action,"nap.featured.saved");assert.equal(uid,"trusted");},
 db:{collection:name=>{assert.equal(name,"auditLogs");return {doc:()=>({get:async()=>({exists:false}),create:async record=>{audits++;assert.equal(record.actorUid,"trusted");}})};}},
 require:name=>{
  if(name==="./nap-portal-swimmers")return {portalPool:()=>({})};
  if(name==="./nap-featured-documents")return {
   readSelection:async()=>{reads++;return {documents:[{id:1}],fingerprint:"current",state:["internal"]};},
   saveSelection:async(_pool,_input,services)=>{
    const actor=await services.authorize();if(!actor.national)throw new HttpsError("permission-denied","National requis");
    assert.equal(actor.uid,"trusted");saves++;
    await services.audit.read("operation");await services.audit.prepare("operation",{actorUid:actor.uid});await services.audit.complete("operation",{verified:true});
    return {documents:[{id:1}],fingerprint:"next"};
   }
  };
  throw Error("Unexpected module");
 }};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf("exports.getNationalFeaturedDocuments ="),source.indexOf("// End national document selection.")),context);
(async()=>{
 const request={auth:{uid:"trusted"},data:{documentIds:[1],expectedFingerprint:"old",national:true,actorUid:"forged"}};
 const result=await context.exports.getNationalFeaturedDocuments(request);assert.equal(result.state,undefined);assert.equal(result.source,"nap");assert.equal(reads,1);
 assert.equal((await context.exports.saveNationalFeaturedDocuments(request)).fingerprint,"next");assert.equal(saves,1);assert.equal(audits,1);
 national=false;await assert.rejects(context.exports.getNationalFeaturedDocuments(request),error=>error.code==="permission-denied");assert.equal(reads,1);
 await assert.rejects(context.exports.saveNationalFeaturedDocuments(request),error=>error.code==="permission-denied");assert.equal(saves,1);
 await assert.rejects(context.exports.getNationalFeaturedDocuments({data:{national:true}}),error=>error.code==="unauthenticated");
 assert.deepEqual(Array.from(context.exports.saveNationalFeaturedDocuments.options.secrets),["LIVEPALMES_NAP_PASSWORD"]);
 console.log("Featured document callables: national server authority, trusted actor, technical existing audit only and no internal state disclosure passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
