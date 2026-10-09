"use strict";
const assert=require("node:assert/strict"),service=require("../functions/nap-club-provenance");
const rows=new Map(),ref=id=>({id,get:async()=>({exists:rows.has(id),data:()=>rows.get(id)})});
const db={collection:name=>{assert.equal(name,"auditLogs");return{doc:ref};},runTransaction:async fn=>fn({get:r=>r.get(),create:(r,value)=>{assert.ok(!rows.has(r.id));rows.set(r.id,value);}})};
(async()=>{
 assert.equal(await service.eligibility(db,"123"),null);await assert.rejects(service.creation(db,"123"),/historique/);
 const operation="a".repeat(64),target={clubId:"123",created:true,verified:true};await service.record(db,operation,target,"national");await service.record(db,operation,target,"national");assert.equal(rows.size,1);
 await assert.rejects(service.record(db,"b".repeat(64),target,"national"),/Origine/);
 await assert.rejects(service.creation(db,"123"),/incomplete/);
 const plan={operation,phase:"identified",nativeId:123,actorUid:"national"};rows.set(`nap-club-create-${operation}-before`,{target:plan});assert.deepEqual(await service.creation(db,"123"),plan);
 rows.get(`nap-club-create-${operation}-before`).target={...plan,actorUid:"other"};await assert.rejects(service.creation(db,"123"),/incomplete/);
 await assert.rejects(service.record(db,operation,{...target,verified:false},"national"));
 console.log("Club provenance: historical refusal, fixed technical receipts, idempotency and identity checks passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
