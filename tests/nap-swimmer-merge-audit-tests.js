"use strict";
const assert=require("node:assert/strict"),{createAudit}=require("../functions/nap-swimmer-merge-audit");
const documents=new Map();
const snapshot=ref=>({exists:documents.has(ref.id),data:()=>structuredClone(documents.get(ref.id))});
const db={collection:name=>{assert.equal(name,"auditLogs");return {doc:id=>({id,get:async()=>snapshot({id})})};},runTransaction:async callback=>{
  const queued=[];
  await callback({getAll:async(...refs)=>refs.map(snapshot),create:(ref,value)=>{assert.equal(documents.has(ref.id),false);queued.push([ref.id,value]);},set:(ref,value)=>queued.push([ref.id,value])});
  for(const [id,value] of queued)documents.set(id,structuredClone(value));
}};
(async()=>{
  let failComplete=true;
  const audit=createAudit(db,{sourceSwimmerId:"12",targetSwimmerId:"13",actorUid:"national"},async()=>{if(failComplete)throw Error("Journal unavailable");});
  assert.equal(await audit.read("first"),null);
  await audit.prepare("first",{kind:"saved"});assert.deepEqual(await audit.read("first"),{kind:"saved"});
  const other=createAudit(db,{sourceSwimmerId:"14",targetSwimmerId:"13",actorUid:"national"},async()=>{});
  await assert.rejects(other.read("second"),/autre fusion/);await assert.rejects(other.prepare("second",{}),/autre fusion/);assert.equal(documents.has("nap-swimmer-merge-second-before"),false);
  await assert.rejects(audit.complete("first",{}));assert.equal(documents.get("nap-swimmer-merge-person-13").state,"pending");
  failComplete=false;await audit.complete("first",{});assert.equal(documents.get("nap-swimmer-merge-person-13").state,"complete");
  assert.equal(await other.read("second"),null);await other.prepare("second",{});assert.equal(documents.get("nap-swimmer-merge-person-13").operation,"second");
  console.log("Swimmer merge audit: atomic source/target reservations, cross-operation conflict, backup before reservation release and failed completion retry passed without Firebase access.");
})().catch(error=>{console.error(error);process.exitCode=1;});
