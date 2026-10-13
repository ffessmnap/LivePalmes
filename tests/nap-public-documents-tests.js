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
 assert.equal(docs.publicDocument({...row,location:"javascript:alert(1)"}).url,"");
 assert.equal(docs.publicDocument({...row,location:""}).linkAvailable,false);
 assert.equal(docs.publicDocument({...row,date:"2026-02-30 12:00:00"}).publishedAt,"");
 const ambiguous=docs.publicDocument({...row,date:"2026-10-25 02:30:00"});assert.equal(ambiguous.publishedAt,"");assert.equal(ambiguous.publishedOn,"2026-10-25");
 assert.equal(docs.publicDocument({...row,date:"2026-02-30 12:00:00"}).publishedOn,"");
 const calls=[];
 const pool={execute:async({sql},values)=>{calls.push({sql,values});return [[{...row,featured_rank:1},{featured_rank:2,id:null}]];}};
 assert.equal((await docs.readFeatured(pool)).length,1);
 assert.equal(calls.length,1);assert.match(calls[0].sql,/d.public='Y' AND d.competition=0/);assert.match(calls[0].sql,/LIMIT 7/);
 await assert.rejects(docs.readFeatured({execute:async()=>[[{...row,featured_rank:7}]]}),/vérifier/);
 const index={types:[],rubrics:[]};
 let reads=0,requestedAfter=[];
 const cataloguePool={execute:async({sql},values)=>{
  reads++;requestedAfter=values;assert.equal(values.length,1);assert.match(sql,/FORCE INDEX \(livepalmes_compet_public_id\)/);assert.match(sql,/d.competition=0 AND d.public='Y'/);
  const limit=Number(/LIMIT (\d+)/.exec(sql)[1]);
  return [Array.from({length:limit},(_,i)=>({...row,id:(values[0]===2147483648?200:values[0])-i-1,element:2,element_label:"Rubrique"}))];
 }};
 let page=await docs.readCatalogue(cataloguePool,index,{search:"reglement",type:"1",rubric:"2"});
 assert.equal(page.documents.length,25);assert.equal(page.hasMore,true);assert.equal(page.nextAfterId,175);assert.equal(reads,1);
 await docs.readCatalogue(cataloguePool,index,{after:175});assert.equal(requestedAfter[0],175);
 page=await docs.readCatalogue(cataloguePool,index,{search:"introuvable"});assert.equal(page.documents.length,0);assert.equal(reads,3);assert.equal(page.hasMore,true);assert.equal(page.nextAfterId,100);
 await assert.rejects(docs.readCatalogue(cataloguePool,null),/indisponible/);
 for(const input of [{after:-1},{after:"bad"},{search:"x".repeat(101)},{type:1.5},{rubric:Infinity}])assert.throws(()=>docs.catalogueRequest(input),/invalide/);
 assert.equal(docs.catalogueRequest({rubric:"other"}).rubric,-1);
 assert.throws(()=>docs.catalogueRequest({rubric:-1}),/invalide/);
 const corpus=Array.from({length:263},(_,i)=>({...row,id:1000-i,name:i%3?`Document ${i}`:`Règlement ${i}`}));
 const pagingPool={execute:async({sql},values)=>[corpus.filter(item=>item.id<values[0]).slice(0,Number(/LIMIT (\d+)/.exec(sql)[1]))]};
 let cursor=null,matched=[];
 for(let count=0;count<20;count++){
  const result=await docs.readCatalogue(pagingPool,index,{search:"reglement",after:cursor});matched.push(...result.documents.map(item=>item.id));
  if(!result.hasMore)break;assert.ok(result.nextAfterId<(cursor||2147483648));cursor=result.nextAfterId;
 }
 assert.deepEqual(matched,corpus.filter(item=>item.name.startsWith("Règlement")).map(item=>item.id));assert.equal(new Set(matched).size,matched.length);
 console.log("Public documents: native dates, safe URLs, no private metadata, current eligibility, ranked bound, grouped hydration and no refill passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
