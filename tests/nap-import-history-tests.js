"use strict";
const assert=require("node:assert/strict"),{readImportHistory}=require("../functions/nap-import-history");
(async()=>{
 let calls=0;
 const result=await readImportHistory({execute:async({sql})=>{calls++;assert.match(sql,/FORCE INDEX \(created_import\).*LIMIT 50$/);assert.match(sql,/JSON_EXTRACT\(metadata,'\$\.display'\)/);return [[{id:"pointer",source_type:"pointer"},{id:"import",competition_id:5162,file_name:"test.txt",source_type:"ffessm-txt",status:"completed",created_at:"2026-10-09",display:JSON.stringify({metadata:{competitionName:"Test"},summary:{individual:{additions:1}}})}]];}});
 assert.equal(calls,1);assert.equal(result.source,"nap");assert.equal(result.imports.length,1);assert.equal(result.imports[0].metadata.competitionName,"Test");assert.equal(result.imports[0].competitionId,5162);
 console.log("NAP import history: one bounded indexed query, pointer filtering and display-only journal projection verified.");
})().catch(error=>{console.error(error);process.exitCode=1;});
