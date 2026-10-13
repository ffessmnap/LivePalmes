"use strict";
const assert=require("node:assert/strict");
const docs=require("../functions/nap-public-documents");
const row={id:6113,name:"Règlement",date:"2026-10-11 15:11:15",location:"/documents/test.pdf",type:1,element:0,type_label:"Règlement",element_label:null};
(async()=>{
 const item=docs.publicDocument({...row,user:"private",created_by:"private",storage_path:"private"});
 assert.equal(item.publishedAt,"2026-10-11T13:11:15.000Z");
 assert.equal(item.rubricLabel,"Autres documents");
 assert.equal(item.url,"https://nap.ffessm.fr/documents/test.pdf");
 assert.equal(JSON.stringify(item).includes("private"),false);
 assert.equal(docs.publicDocument({...row,location:"javascript:alert(1)"}),null);
 assert.equal(docs.publicDocument({...row,date:"2026-02-30 12:00:00"}).publishedAt,"");
 const calls=[];
 const pool={execute:async({sql},values)=>{calls.push({sql,values});return [[{...row,featured_rank:1},{featured_rank:2,id:null}]];}};
 assert.equal((await docs.readFeatured(pool)).length,1);
 assert.equal(calls.length,1);assert.match(calls[0].sql,/d.public='Y' AND d.competition=0/);assert.match(calls[0].sql,/LIMIT 7/);
 await assert.rejects(docs.readFeatured({execute:async()=>[[{...row,featured_rank:7}]]}),/vérifier/);
 const index={documents:Array.from({length:100},(_,i)=>({id:i+1,title:`Règlement ${i}`,typeId:1,rubricId:2}))};
 let reads=0,requestedIds=[];
 const cataloguePool={execute:async({sql},values)=>{
  reads++;requestedIds=values;assert.equal(values.length,25);assert.match(sql,/FORCE INDEX \(PRIMARY\)/);assert.match(sql,/d.public='Y' AND d.competition=0/);
  return [[{...row,id:values[0],element:2,element_label:"Rubrique"}]]; // Other candidates have since become private.
 }};
 let page=await docs.readCatalogue(cataloguePool,index,{search:"reglement",type:"1",rubric:"2"});
 assert.equal(page.documents.length,1);assert.equal(page.hasMore,true);assert.equal(page.nextAfterId,76);assert.equal(reads,1);
 await docs.readCatalogue(cataloguePool,index,{after:76});assert.equal(requestedIds[0],75);
 page=await docs.readCatalogue(cataloguePool,index,{search:"introuvable"});assert.equal(page.documents.length,0);assert.equal(reads,2);
 await assert.rejects(docs.readCatalogue(cataloguePool,null),/indisponible/);
 for(const input of [{after:-1},{after:"bad"},{search:"x".repeat(101)},{type:1.5},{rubric:Infinity}])assert.throws(()=>docs.catalogueRequest(input),/invalide/);
 assert.equal(docs.catalogueRequest({rubric:"other"}).rubric,-1);
 assert.throws(()=>docs.catalogueRequest({rubric:-1}),/invalide/);
 console.log("Public documents: native dates, safe URLs, no private metadata, current eligibility, ranked bound, grouped hydration and no refill passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
