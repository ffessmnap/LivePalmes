"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),acorn=require("./firestore-rules/node_modules/acorn");
class Refusal extends Error {constructor(code,message){super(message);this.code=code;}}
const operations=[
 ["portal-access-handlers/verify-pin","createAccessHandlers_verifyPin","verifyPin"],
 ["portal-access-handlers/set-role-pins","createAccessHandlers_setRolePins","setRolePins"],
 ["portal-performance-handlers/store-competition-pdf","createPerformanceHandlers_storeCompetitionPdf","storeCompetitionPdf"],
 ["portal-performance-handlers/delete-competition-pdf","createPerformanceHandlers_deleteCompetitionPdf","deleteCompetitionPdf"]
];
(async()=>{
 for(const [file,factory,name] of operations){
  let profileChecks=0,touches=0;
  const context=new Proxy({HttpsError:Refusal,assertCapability:async(_request,capability)=>{profileChecks++;assert.equal(capability,"consoles.manage");}},{get(target,key){if(key in target)return target[key];touches++;throw Error("Unexpected retired service access: "+String(key));}});
  const handler=require("../functions/backend/"+file)[factory](context)[name];
  for(const request of [undefined,{},{auth:{uid:"old-admin"},data:{competitionId:"livepalmes-active",role:"computer",pin:"fixture"}},{auth:{uid:"cached-client"},data:{competitionId:"livepalmes-test",pdfDataUrl:"data:application/pdf;base64,JVBERi0="}}])
   await assert.rejects(()=>handler(request),error=>error.code==="failed-precondition"&&/retiré/.test(error.message));
  assert.equal(touches,0,name+" cannot read a grant, sporting document or Storage");assert.equal(profileChecks,name==="setRolePins"?4:0,"Only the existing setRolePins capability check remains");
 }
 const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8"),tree=acorn.parse(source,{ecmaVersion:"latest"});
 const node=tree.body.find(node=>node.type==="ExpressionStatement"&&node.expression.type==="AssignmentExpression"&&node.expression.left.object?.name==="exports"&&node.expression.left.property?.name==="syncOfficialResultToPublicIndex");
 assert(node);let callback;const context={exports:{},PUBLIC_RESULT_TRIGGER_OPTIONS:{},onDocumentUpdated:(_options,fn)=>{callback=fn;return fn;}};
 vm.runInNewContext(source.slice(node.start,node.end),context);assert.equal(await callback({params:{competitionId:"livepalmes-active",resultId:"result-1"},data:{after:{exists:true}}}),null);
 console.log("A5: four installed callable URLs refuse, no sporting-data/Storage access; historical trigger has no publication effect.");
})().catch(error=>{console.error(error);process.exitCode=1;});
