"use strict";
const assert=require("node:assert/strict"),{readImportHistory}=require("../functions/nap-import-history");
const {pointerId}=require('../functions/nap-import-lifecycle');
(async()=>{
 let calls=0;
 const result=await readImportHistory({execute:async({sql},values)=>{calls++;if(calls===2){assert.match(sql,/FORCE INDEX \(PRIMARY\).*LIMIT 50$/);assert.deepEqual(values,[pointerId(5162)]);return [[{id:pointerId(5162),metadata:{currentImportId:'import'}}]];}assert.match(sql,/FORCE INDEX \(created_import\).*LIMIT 50$/);assert.match(sql,/JSON_EXTRACT\(metadata,'\$\.display'\)/);assert.match(sql,/JSON_LENGTH\(metadata,'\$\.people'\)/);return [[{id:"pointer",source_type:"pointer"},{id:'deletion',source_type:'results-deletion'},{id:"import",competition_id:5162,file_name:"test.txt",source_type:"ffessm-txt",status:"completed",created_at:"2026-10-09",swimmer_count:3,club_count:2,display:JSON.stringify({metadata:{competitionName:"Test"},summary:{individual:{additions:1,unchanged:4},relays:{additions:1,unchanged:0},statuses:2}})}]];}});
 assert.equal(calls,2);assert.equal(result.source,"nap");assert.equal(result.imports.length,1);assert.equal(result.imports[0].metadata.competitionName,"Test");assert.equal(result.imports[0].competitionId,5162);assert.deepEqual(result.imports[0].metrics,{performances:5,relays:1,statuses:2,swimmers:3,clubs:2});assert.equal(result.imports[0].canDelete,true);
 const empty=await readImportHistory({execute:async()=>[[]]});assert.deepEqual(empty.imports,[]);
 for(const review_status of ['ready','pending',null]){
  let query=0;const rows=await readImportHistory({execute:async({sql})=>{query++;if(query===2)return [[]];assert.match(sql,/JSON_UNQUOTE\(JSON_EXTRACT\(metadata,'\$\.recordReview.status'\)\)/);return [[{id:'new-import',competition_id:5162,source_type:'ffessm-txt',status:'completed',display:{},detection_version:'1',review_status,candidate_count:3}]];}});
  assert.equal(rows.imports[0].recordReview.eligible,true);assert.equal(rows.imports[0].recordReview.status,review_status==='ready'?'ready':'pending');assert.equal(rows.imports[0].recordReview.count,3);
 }
 console.log("NAP import history: two bounded grouped queries, technical-row filtering, historical counters and current-version action verified.");
})().catch(error=>{console.error(error);process.exitCode=1;});
