"use strict";
const assert=require("node:assert/strict"),themes=require("../functions/nap-document-themes"),docs=require("../functions/nap-public-documents");
(async()=>{
 let now=1,calls=0,fail=false;
 const reader=themes.createReader(async()=>{calls++;if(fail)throw Error("offline");return [{id:2,label:"Comités/clubs"}];},()=>now);
 await Promise.all([reader(),reader(),reader()]);assert.equal(calls,1);
 now+=themes.CACHE_MS-1;await reader();assert.equal(calls,1);now++;fail=true;
 await assert.rejects(reader(),/offline/);await assert.rejects(reader(),/offline/);assert.equal(calls,2);
 now+=themes.CACHE_MS;fail=false;await reader();assert.equal(calls,3);
 const source={cibles:[{id:6,label:"Haut Niveau",pos:6},{id:2,label:"Comités/clubs",pos:2},{id:99,label:"Absent",pos:1}],elements:[{id:41,name:"publications"},{id:99,name:"admin"}],elements_cibles:[{element:41,cible:2},{element:41,cible:6},{element:41,cible:6},{element:99,cible:99}]};
 const pool={execute:async({sql})=>{const key=/FROM (\w+)/.exec(sql)[1];return [source[key]];}};
 assert.deepEqual(await themes.readThemes(pool),[{id:2,label:"Comités/clubs"},{id:6,label:"Haut Niveau"}]);
 await assert.rejects(themes.readThemes({execute:async()=>[Array(101).fill({})]}),/vérifier/);
 for(const theme of [-1,Infinity,1.5,"x"]){assert.throws(()=>docs.catalogueRequest({theme}),/invalide/);}
 const corpus=Array.from({length:1263},(_,i)=>({id:2000-i,name:"Document",type:1,type_label:"Circulaire",element:0,location:"/documents/a.pdf",theme_match:i%17===0?1:0}));
 let sqls=[],values=[];
 const cataloguePool={execute:async(spec,params)=>{sqls.push(spec.sql);values.push(params);return [corpus.filter(row=>row.id<params[1]).slice(0,501)];}};
 let after=null,ids=[];
 for(let page=0;page<5;page++){
  const result=await docs.readCatalogue(cataloguePool,{types:[],rubrics:[]},{theme:2,after});ids.push(...result.documents.map(row=>row.id));
  if(!result.hasMore)break;assert.ok(result.nextAfterId<(after||2147483648));after=result.nextAfterId;
 }
 assert.deepEqual(ids,corpus.filter(row=>row.theme_match).map(row=>row.id));assert.equal(new Set(ids).size,ids.length);
 assert.equal(sqls.length,4);assert.deepEqual(values[0],[2,2147483648]);
 assert.match(sqls[0],/FROM \(SELECT id FROM documents FORCE INDEX \(livepalmes_compet_public_id\).*LIMIT 501\) window_ids/);
 assert.match(sqls[0],/EXISTS\(SELECT 1 FROM documents_cibles dc FORCE INDEX \(livepalmes_document_cible\) WHERE dc.document=d.id AND dc.cible=\?\)/);
 assert.match(sqls[0],/d.competition=0 AND d.public='Y'/);
 assert.equal(ids.some(id=>id===999),false);
 const missing=await docs.readCatalogue({execute:async()=>[[...corpus.slice(0,501).map(row=>({...row,theme_match:0}))]]},{types:[],rubrics:[]},{theme:2});
 assert.equal(missing.documents.length,0);assert.equal(missing.hasMore,true);
 await assert.rejects(docs.readLibrary(pool,{types:[],rubrics:[]},{theme:99}),/inconnu/);
 console.log("Native document themes: menu bindings, shared cache/failure recovery, bounded membership, sparse pagination and unknown-theme rejection passed.");
})().catch(error=>{console.error(error);process.exitCode=1;});
