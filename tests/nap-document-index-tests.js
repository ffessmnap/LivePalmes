"use strict";
const assert=require("node:assert/strict");
const {buildDocumentIndex}=require("../tools/build-nap-document-index");
(async()=>{
 let reads=0;
 const pool={execute:async({sql},values)=>{
  reads++;assert.match(sql,/d.competition=0 AND d.public='Y' AND d.id>\?/);assert.match(sql,/LIMIT 101/);assert.match(sql,/FORCE INDEX \(livepalmes_compet_public_id\)/);
  return [Array.from({length:values[0]===0?101:2},(_,i)=>({id:values[0]+i+1,name:`Titre ${i}`,type:7,element:8,type_label:values[0]===0?"Règlement":null,element_label:null}))];
 }};
 const index=await buildDocumentIndex(pool);
 assert.equal(reads,2);assert.equal(index.documentCount,103);assert.equal(index.documents,undefined,"document membership is always read live");
 assert.deepEqual(index.types.map(type=>type.id),[0,7]);
 assert.deepEqual(index.rubrics,[{id:0,label:"Autres documents"}]);
 await assert.rejects(buildDocumentIndex({execute:async()=>[[{id:0}]]}),/invalide/);
 console.log("Document index: explicit public-only preparation, indexed keyset pages, missing classification and minimal server metadata passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
