"use strict";
const assert=require("node:assert/strict"),m=require("../tools/a5-legacy-direct-cleanup"),core=require("../tools/a2-backup-core"),data=require("../tools/a2-firebase-data");
const project="livepalmes",prefix="projects/livepalmes/databases/(default)/documents/",stamp="2026-11-19T12:00:00.000001Z",key=Buffer.alloc(32,7);
const doc=(path,value="fixture")=>({name:prefix+path,fields:{value:{stringValue:value}},createTime:stamp,updateTime:stamp});
const bytes=Buffer.from("%PDF-1.4\n%%EOF"),object={bucket:m.BUCKETS[project][0],metadata:{name:"competition-pdfs/livepalmes-active/series/demo-0123456789abcdef.pdf",generation:"7",size:String(bytes.length),crc32c:data.crc32c(bytes)},content:bytes.toString("base64"),sha256:core.hash(bytes)};
const snapshot=()=>({project,documents:[doc("competitions/livepalmes-active/seriesPdfs/demo","not-a-real-secret"),doc("competitions/livepalmes-test/public/resultsIndex")],protectedDocuments:[doc("competitions/livepalmes-active/performanceData/records","preserve-records")],objects:[structuredClone(object)]});
const expectFailure=fn=>assert.throws(fn);
(async()=>{
 const value=snapshot(),packed=m.backup(value,key);assert.equal(packed.report.recoveryVerified,true);assert.equal(packed.report.documentCount,2);assert.equal(packed.report.objectVersionCount,1);
 const recovered=core.unpack(packed.encrypted,key,m.LIMITS.maxBackupBytes);assert.deepEqual(recovered.documents,value.documents);assert.equal(recovered.objects[0].content,object.content);
 assert.equal(JSON.stringify(packed.report).includes("not-a-real-secret"),false);assert.equal(JSON.stringify(packed.report).includes("seriesPdfs/demo"),false);assert.equal(recovered.documents.some(d=>d.name.includes("performanceData")),false,"Protected Records are not archived as cleanup targets");
 const altered=Buffer.from(packed.encrypted);altered[altered.length-1]^=1;expectFailure(()=>core.unpack(altered,key,m.LIMITS.maxBackupBytes));expectFailure(()=>core.unpack(packed.encrypted,Buffer.alloc(32,8),m.LIMITS.maxBackupBytes));
 for(const path of ["users/fixture","livepalmesDirectSignals/test-900001/signal/current","competitions/new-direct/public/resultsIndex","competitions/livepalmes-active/unqualified/demo"]){const bad=snapshot();bad.documents=[doc(path)];expectFailure(()=>m.validateSnapshot(bad));}
 const protectedTarget=snapshot();protectedTarget.documents=[protectedTarget.protectedDocuments[0]];expectFailure(()=>m.backup(protectedTarget,key));
 for(const mutation of [o=>o.bucket="livepalmes-public-data-foreign",o=>o.metadata.name="entry-documents/keep.pdf",o=>o.metadata.generation="",o=>o.metadata.size=String(m.LIMITS.maxFileBytes+1)]){const bad=snapshot();mutation(bad.objects[0]);expectFailure(()=>m.backup(bad,key));}
 const missingPdf=snapshot();delete missingPdf.objects[0].content;expectFailure(()=>m.backup(missingPdf,key));
 const changed=snapshot();changed.documents[0].updateTime="2026-11-19T12:00:01.000001Z";expectFailure(()=>m.approvedSubset(m.validateSnapshot(changed),packed.report));
 const newVersion=snapshot();newVersion.objects[0].metadata.generation="8";expectFailure(()=>m.approvedSubset(m.validateSnapshot(newVersion),packed.report));
 const changedRecords=snapshot();changedRecords.protectedDocuments[0].fields.value.stringValue="changed";expectFailure(()=>m.approvedSubset(m.validateSnapshot(changedRecords),packed.report));
 const duplicate=snapshot();duplicate.documents.push(duplicate.documents[0]);expectFailure(()=>m.validateSnapshot(duplicate));
 let calls=0,progress=[];const final={...snapshot(),documents:[],objects:[]};
 const applied=await m.apply(snapshot(),packed.report,{remove:async url=>{calls++;const u=new URL(url);if(u.hostname==="firestore.googleapis.com")assert.equal(u.searchParams.get("currentDocument.updateTime"),stamp);else{assert.equal(u.searchParams.get("generation"),"7");assert.equal(u.searchParams.get("ifGenerationMatch"),"7");}assert(!url.includes("performanceData"));return {status:204};},refresh:async()=>final,saveProgress:async p=>progress.push(structuredClone(p))});
 assert.equal(calls,3);assert.equal(applied.result,"success");assert.equal(applied.protectedRecordsUnchanged,true);assert.equal(progress.at(-1).result,"success");
 let driftCalls=0;await assert.rejects(()=>m.apply(changed,packed.report,{remove:async()=>{driftCalls++;},refresh:async()=>final,saveProgress:async()=>{}}));assert.equal(driftCalls,0,"Drift refuses before the first deletion");
 const partial=[];await assert.rejects(()=>m.apply(snapshot(),packed.report,{remove:async()=>{throw Error("fixture request failed");},refresh:async()=>final,saveProgress:async p=>partial.push(structuredClone(p))}));assert.equal(partial.at(-1).result,"partial");
 const resumed=await m.apply(final,packed.report,{remove:async()=>{throw Error("Nothing remains to delete");},refresh:async()=>final,saveProgress:async()=>{}});assert.equal(resumed.result,"success");assert.equal(resumed.alreadyAbsent,3);
 const urls=[];const empty=await m.collect(project,async(url,body)=>{urls.push(url);if(url.includes("storage.googleapis.com"))return {};assert(url.includes("/documents/competitions/"),"No database-wide query");if(url.endsWith(":runAggregationQuery"))return [{result:{aggregateFields:{total:{integerValue:"0"}}},readTime:stamp}];if(url.endsWith(":runQuery"))return [];return {missing:true};});
 assert.equal(urls.length,10);assert.equal(empty.documents.length,0);assert.equal(empty.objects.length,0);
 await assert.rejects(()=>m.collect(project,async url=>url.includes("storage.googleapis.com")?{nextPageToken:"more"}:url.endsWith(":runAggregationQuery")?[{result:{aggregateFields:{total:{integerValue:"0"}}},readTime:stamp}]:url.endsWith(":runQuery")?[]:{missing:true}),/A5_INCOMPLETE/);
 console.log("A5 cleanup: existing A2 encryption/recovery, fixed scopes, Records preservation, drift/preconditions, partial failure and safe repeat verified on fixtures; no real service.");
})().catch(error=>{console.error(error);process.exitCode=1;});
