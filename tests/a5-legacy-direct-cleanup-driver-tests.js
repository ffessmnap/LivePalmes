"use strict";
const assert=require("node:assert/strict"),driver=require("../tools/a5-legacy-direct-cleanup-driver"),cleanup=require("../tools/a5-legacy-direct-cleanup"),core=require("../tools/a2-backup-core");
async function test(){
 const project="livepalmes",base="https://firestore.googleapis.com/v1/projects/livepalmes/databases/(default)/documents/competitions/";
 const calls=[],request=async(url,init)=>{calls.push({url,init});return new Response("{}",{status:200});};
 const api=driver.client("fixture",project,cleanup.BUCKETS[project],request);
 await api(base+"livepalmes-active");assert.equal(calls.length,1);assert.equal(calls[0].init.redirect,"error");
 const query={structuredQuery:{from:[{allDescendants:true}],limit:200}};await api(base+"livepalmes-active:runQuery",query);assert.equal(calls.at(-1).init.method,"POST");
 for(const [url,body] of [["https://foreign.test/api",undefined],[base+"other",undefined],[base+"livepalmes-active/public/test",undefined],[base+"livepalmes-active",{}],[base+"livepalmes-active:runQuery",{structuredQuery:{from:[{allDescendants:true}],limit:201}}],["https://storage.googleapis.com/storage/v1/b/livepalmes-public-data-718081132564/o?prefix=entry-documents/&versions=true&maxResults=129",undefined],["https://storage.googleapis.com/storage/v1/b/foreign/o?prefix=competition-pdfs/livepalmes-active/&versions=true&maxResults=129",undefined]]){
  const count=calls.length;await assert.rejects(api(url,body));assert.equal(calls.length,count);
 }
 const missing=driver.client("fixture",project,cleanup.BUCKETS[project],async()=>new Response("missing",{status:404}));assert.deepEqual(await missing(base+"livepalmes-active"),{missing:true});
 const denied=driver.client("fixture",project,cleanup.BUCKETS[project],async()=>new Response("{}",{status:403}));await assert.rejects(denied("https://firebaserules.googleapis.com/v1/projects/livepalmes/releases/cloud.firestore"),/A5_RULES_HTTP_403/);
 const empty={project,documents:[],protectedDocuments:[],objects:[],readBuckets:[...cleanup.BUCKETS[project]]},key=Buffer.alloc(32,7),packed=cleanup.backup(empty,key);
 assert.equal(packed.report.fullReadScope,true);assert.deepEqual(packed.report.storageCountsByBucket,Object.fromEntries(cleanup.BUCKETS[project].map(b=>[b,0])));
 assert.throws(()=>cleanup.backup({...empty,readBuckets:[cleanup.BUCKETS[project][0]]},key),/A5_FULL_BACKUP_READ_REQUIRED/);
 assert.deepEqual(driver.readBuckets(project,"apply"),[cleanup.BUCKETS[project][0]]);assert.equal(driver.readBuckets(project,"verify").length,2);
 const gate={closureRun:123,rulesAfterSha256:"a".repeat(64)};
 const env={A5_RULES_RESULT:"rules-closed",A5_RULES_SHA:gate.rulesAfterSha256,A5_APPLY_RESULT:"writable-targets-removed",A5_BACKUP_SHA:packed.report.encryptedSha256,A5_DELETED_DOCUMENTS:"0",A5_DELETED_OBJECTS:"0",A5_ALREADY_ABSENT:"0"};
 assert.equal(driver.finalReport(empty,gate,packed.report,env).allStoragePrefixesRead,true);
 assert.throws(()=>driver.rulesWitness(gate,{...env,A5_RULES_SHA:"b".repeat(64)}),/A5_EXISTING_ACTOR_RULES_WITNESS_REQUIRED/);
 assert.throws(()=>driver.rulesWitness(gate,{}),/A5_EXISTING_ACTOR_RULES_WITNESS_REQUIRED/);
 assert.throws(()=>driver.finalReport({...empty,readBuckets:[cleanup.BUCKETS[project][0]]},gate,packed.report,env),/A5_FULL_FINAL_COVERAGE/);
 assert.throws(()=>driver.finalReport(empty,gate,packed.report,{...env,A5_APPLY_RESULT:"success"}),/A5_APPLY_JOB_REQUIRED/);
 assert.throws(()=>driver.finalReport(empty,gate,packed.report,{...env,A5_DELETED_DOCUMENTS:"1"}),/A5_FINAL_COUNTS/);
 assert.throws(()=>driver.finalReport(empty,gate,{...packed.report,protectedHash:"0".repeat(64)},env),/A5_FULL_FINAL_STATE/);
 const doc={name:"projects/livepalmes/databases/(default)/documents/competitions/livepalmes-active/public/current",updateTime:"2026-11-19T00:00:00Z",fields:{}};
 assert.throws(()=>driver.finalReport({...empty,documents:[doc]},gate,packed.report,env),/A5_FULL_FINAL_STATE/);
 const urls=[...driver.deletionUrls({...empty,documents:[doc]})];assert.equal(urls.length,1);assert.equal(new URL(urls[0]).searchParams.get("currentDocument.updateTime"),doc.updateTime);
 assert.throws(()=>driver.deletionUrls({...empty,documents:[{...doc,name:doc.name.replace("livepalmes-active","new-direct")}]}));
 const row={name:"projects/livepalmes/locations/europe-west1/functions/verifyPin",revision:"revision",state:"ACTIVE",updateTime:"now",commit:"a".repeat(40)};
 const actual={name:row.name,state:row.state,updateTime:row.updateTime,serviceConfig:{revision:row.revision},labels:{"livepalmes-commit":row.commit}};
 await driver.currentFunctions(async()=>actual,{project,functions:[row]});await assert.rejects(driver.currentFunctions(async()=>({...actual,updateTime:"changed"}),{project,functions:[row]}),/A5_SOURCE_DRIFT/);
 const text="rules";const ruleApi=async url=>url.includes("/releases/")?{rulesetName:"projects/livepalmes/rulesets/id"}:{source:{files:[{name:"firestore.rules",content:text}]}};
 await driver.currentRules(ruleApi,project,core.hash(text));await assert.rejects(driver.currentRules(ruleApi,project,"0".repeat(64)),/A5_RULE_REOPENED/);
 assert.throws(()=>driver.context("apply",project,".",{}),/A5_MAIN_WORKFLOW/);
 console.log("A5 driver: fixed read scopes, no redirects, immutable source/Rules, conditional URLs and separate full final verification pass on fixtures.");
}
test().catch(error=>{console.error(error);process.exitCode=1;});
