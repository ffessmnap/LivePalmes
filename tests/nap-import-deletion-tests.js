"use strict";
const assert=require("node:assert/strict");
const {createNativeResultDeletion,LIMITS}=require("../functions/nap-import-deletion");
const {hash,pointerId,initialReview,invalidateReview,sourceReference}=require("../functions/nap-import-lifecycle");
const importId="a".repeat(64),competitionId=5162,operationId="11111111-1111-4111-8111-111111111111";
const perf={id:10,nageur:168,compet:competitionId,course:"100SF",cat:"HSE",tps:"014200",points:"0",newpoints:"0",passage:0,club:"106",relais:0,pid:null,classement:1};
const relay={id:20,club:"106",distance:"4X100SF",nageur1:168,nageur2:169,nageur3:170,nageur4:171,tps1:"010000",tps2:"020000",tps3:"030000",tps4:"040000",categorie:"HSE",pts:0,compet:competitionId};
function fixture({national=true,lock=true,overflow=false}={}){
  const state={authorized:false,pools:0,locked:false,released:0,queries:[],mutations:[],lost:"",pointer:{currentImportId:importId,protocol:{documentId:12},textManifest:{hash:"kept"}},pointerStatus:"current",sourceStatus:"completed",review:initialReview(),receipts:new Map(),perfs:[perf,{...perf,id:11,passage:1,course:"50SF"},{...perf,id:12,tps:"010000"}],relays:[relay],visibility:[{performance_id:10,hidden:1,version:1,updated_at:"2026-11-07 12:00:00.000000",updated_by:"national"}],statuses:[{row_number:4,expected_row:JSON.stringify({table:"status",row:{kind:"NAG",status:"DSQ",swimmerId:172,clubId:"107"}})}]};
  const lose=stage=>{if(state.lost===stage){state.lost="";throw Error("lost "+stage+" reply");}};
  const execute=async({sql},values=[])=>{
    assert.equal(state.authorized,true);state.queries.push({sql,values});
    if(sql.startsWith("SELECT GET_LOCK"))return [[{acquired:lock?1:0}]];
    if(sql.startsWith("SELECT RELEASE_LOCK"))return [[{released:1}]];
    if(sql.includes("information_schema.TRIGGERS"))return [[]];
    if(sql.includes("FROM competitions"))return [[{id:competitionId,libelle:"Fixture",date:"2026-11-07",lieu:"Paris"}]];
    if(sql.startsWith("SELECT metadata"))return [[{metadata:structuredClone(state.pointer)}]];
    if(sql.startsWith("SELECT competition_id"))return [values[0]===importId?[{competition_id:competitionId,source_type:"ffessm-txt",status:state.sourceStatus}]:state.receipts.has(values[0])?[structuredClone(state.receipts.get(values[0]))]:[]];
    if(sql.startsWith("SELECT JSON_EXTRACT"))return [[{record_review:structuredClone(state.review)}]];
    if(sql.startsWith("SELECT row_number"))return [structuredClone(state.statuses)];
    if(sql.startsWith("SELECT")&&sql.includes("FROM perfs_relais"))return [structuredClone(state.relays)];
    if(sql.startsWith("SELECT")&&sql.includes("FROM perfs "))return [overflow?Array.from({length:LIMITS.perfs+1},(_,i)=>({...perf,id:i+1})):structuredClone(state.perfs)];
    if(sql.startsWith("SELECT")&&sql.includes("FROM livepalmes_performance_visibility"))return [structuredClone(state.visibility.filter(r=>values.includes(r.performance_id)))];
    assert.equal(state.locked,true,"Every mutation has the native table lock");
    state.mutations.push(sql);
    if(sql.startsWith("INSERT INTO livepalmes_performance_imports")){
      assert.match(sql,/'results-deletion'/);const saved=JSON.parse(values[3]);assert.ok(!JSON.stringify(saved).includes('"tps"'),"No copied sporting before-image");
      state.receipts.set(values[0],{competition_id:values[1],source_type:"results-deletion",status:"prepared",metadata:saved});lose("receipt");return [{affectedRows:1}];
    }
    if(sql.startsWith("UPDATE livepalmes_performance_imports SET metadata=?")){
      assert.equal(values[2],pointerId(competitionId));state.pointer=JSON.parse(values[0]);state.pointerStatus=values[1];lose(state.pointer.resultsDeleted?"final-pointer":"pointer");return [{affectedRows:1}];
    }
    if(sql.startsWith("UPDATE livepalmes_performance_imports SET metadata=JSON_SET")){state.review=JSON.parse(values[0]);lose("review");return [{affectedRows:1}];}
    if(sql.startsWith("UPDATE livepalmes_performance_imports SET status='deleted'")){assert.equal(values[0],importId);state.sourceStatus="deleted";lose("source");return [{affectedRows:1}];}
    if(sql.startsWith("UPDATE livepalmes_performance_imports SET status='completed'")){state.receipts.get(values[0]).status="completed";lose("completed");return [{affectedRows:1}];}
    if(sql.startsWith("DELETE FROM perfs WHERE")){assert.equal(values[0],competitionId);state.perfs=state.perfs.filter(r=>!values.slice(1).includes(r.id));lose("perfs");return [{affectedRows:values.length-1}];}
    if(sql.startsWith("DELETE FROM perfs_relais")){state.relays=state.relays.filter(r=>!values.slice(1).includes(r.id));lose("relays");return [{affectedRows:values.length-1}];}
    if(sql.startsWith("DELETE FROM livepalmes_performance_visibility")){state.visibility=state.visibility.filter(r=>!values.includes(r.performance_id));lose("visibility");return [{affectedRows:values.length}];}
    throw Error("Unexpected SQL "+sql);
  };
  const conn={execute,query:async({sql})=>{state.locked=sql.startsWith("LOCK TABLES");},release:()=>{state.released++;}};
  const run=createNativeResultDeletion({authorize:()=>{state.authorized=true;return {uid:"national",national};},getPool:()=>{state.pools++;return {getConnection:async()=>conn};}});
  const preview=()=>run({data:{action:"preview",competitionId,importId}});
  const payload=p=>({action:"delete",competitionId,importId,operationId:p.operationId||operationId,expectedFingerprint:p.expectedFingerprint,confirmDeletion:true,...(p.deletionId?{deletionId:p.deletionId}:{})});
  return {state,run,preview,payload};
}
(async()=>{
  let f=fixture(),preview=await f.preview();assert.deepEqual(preview.summary,{performances:3,relays:1,statuses:1,swimmers:5,clubs:2});assert.equal(f.state.mutations.length,0);assert.equal(f.state.queries.filter(q=>q.sql.startsWith("SELECT")&&!q.sql.includes("LOCK")).length,7);
  let result=await f.run({data:f.payload(preview)});assert.equal(result.deleted,true);assert.equal(f.state.perfs.length+f.state.relays.length+f.state.visibility.length,0);assert.equal(f.state.statuses.length,1,"Existing history is retained");assert.equal(f.state.pointer.resultsDeleted,true);assert.equal(f.state.pointerStatus,"deleted","Calendar no longer advertises active results");assert.equal(f.state.pointer.protocol.documentId,12);assert.equal(f.state.pointer.textManifest.hash,"kept");assert.equal(f.state.sourceStatus,"deleted");assert.ok(f.state.mutations.every(sql=>!/DELETE FROM (competitions|nageurs|clubs|documents|livepalmes_performance_import)/.test(sql)));
  const writes=f.state.mutations.length;assert.equal((await f.run({data:f.payload(preview)})).replayed,true);assert.equal(f.state.mutations.length,writes);f.state.pointer={currentImportId:"b".repeat(64)};f.state.perfs=[perf];await f.run({data:f.payload(preview)});assert.equal(f.state.perfs.length,1,"A retry never deletes a later import");
  f=fixture({national:false});await assert.rejects(f.preview(),/nationale/);assert.equal(f.state.pools,0);
  f=fixture({lock:false});await assert.rejects(f.preview(),/déjà en cours/);assert.equal(f.state.mutations.length,0);
  f=fixture({overflow:true});await assert.rejects(f.preview(),/limites/);assert.equal(f.state.mutations.length,0);
  f=fixture();preview=await f.preview();f.state.perfs[0]={...perf,tps:"014100"};await assert.rejects(f.run({data:f.payload(preview)}),/changé/);assert.equal(f.state.mutations.length,0);
  f=fixture();preview=await f.preview();await assert.rejects(f.run({data:{...f.payload(preview),confirmDeletion:false}}),/Confirmation/);assert.equal(f.state.mutations.length,0);
  f=fixture();f.state.pointer.activeImportId="b".repeat(64);await assert.rejects(f.preview(),/interrompu/);
  for(const stage of ["receipt","pointer","perfs","relays","visibility","review","source","completed","final-pointer"]){
    f=fixture();f.state.review.candidates=[{id:"pending",state:"pending"},{id:"published",state:"published",publishedRevision:7}];preview=await f.preview();f.state.lost=stage;const data=f.payload(preview);
    await assert.rejects(f.run({data}),/lost/);await f.run({data});assert.equal(f.state.perfs.length+f.state.relays.length+f.state.visibility.length,0,stage);assert.equal(f.state.pointer.resultsDeleted,true,stage);assert.equal(f.state.pointer.activeDeletionId,undefined);assert.equal(f.state.review.candidates[0].state,"invalidated");assert.equal(f.state.review.candidates[1].publishedRevision,7);assert.equal(f.state.review.candidates[1].requiresReview,true);assert.equal(f.state.locked,false);
  }
  f=fixture();preview=await f.preview();f.state.lost="perfs";await assert.rejects(f.run({data:f.payload(preview)}));const resume=await f.preview();assert.equal(resume.resume,true);assert.equal(resume.summary.performances,3);await f.run({data:f.payload(resume)});assert.equal(f.state.visibility.length,0,"Orphan visibility is recovered after performance deletion");
  f=fixture();preview=await f.preview();f.state.lost="perfs";await assert.rejects(f.run({data:f.payload(preview)}));f.state.perfs.push({...perf,id:99});await assert.rejects(f.run({data:f.payload(preview)}),/changé/);assert.equal(f.state.perfs[0].id,99,"Unexpected result is preserved");
  const source=sourceReference(importId,{performanceId:10,sourceLine:7,origin:"passage",fingerprint:hash(perf)});assert.equal(source.key,`${importId}:perfs:10`);assert.equal(source.origin,"passage");
  const review=invalidateReview({version:1,state:"current",candidates:[{id:"x",state:"accepted"},{id:"y",state:"published",publishedRevision:3}]},{reason:"replaced",operationId:"b".repeat(64)});assert.equal(review.candidates[0].state,"invalidated");assert.equal(review.candidates[1].requiresReview,true);assert.equal(invalidateReview(null,{reason:"deleted",operationId:importId}),null,"No historical candidate creation");
  console.log("Native result deletion: national-only, bounded reads, all current results, no new before-images, stale/concurrent refusal, every lost-reply stage, orphan visibility recovery, immutable history/documents, no resurrection and Records review lifecycle verified offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
