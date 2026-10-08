"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const docs=require("../functions/nap-competition-documents");
const helpers=require("../functions/engagement-competition-documents");
const authority={id:5162,date:"2026-11-07",enddate:null,comite:1,parameter_id:100,niveau:1};
const legacy={id:42,name:"Protocole",type:11,location:"/documents/test.pdf",date:"2026-10-08 12:00:00",user:null,competition:5162,sent:0,comment:"",public:"Y",element:34,type_label:"Résultats"};
function fixture(initial=[]){
 let current=structuredClone(initial),saved=null,writes=0,queryCount=0,uploaded=false,failedWrite=false,failedFile=false;
 const history=[];
 const connection={release:()=>history.push("release"),execute:async(query,values=[])=>{
  queryCount++;const sql=query.sql;
  if(sql.includes("GET_LOCK"))return [[{acquired:1}]];
  if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
  if(sql.includes("FROM documents d"))return [structuredClone(current)];
  if(sql.includes("information_schema.TRIGGERS"))return [[]];
  if(/^(INSERT|UPDATE|DELETE) /.test(sql)){assert.ok(saved,"journal precedes every write");writes++;history.push("write");if(failedWrite)return [{affectedRows:0}];}
  if(sql.startsWith("INSERT INTO documents")){const row=Object.fromEntries(docs.FIELDS.slice(1).map((k,i)=>[k,values[i]]));current.push({id:42,...row,type_label:"Compétitions"});return [{affectedRows:1,insertId:42}];}
  if(sql.startsWith("UPDATE documents")){const row=current.find(x=>x.id===values[5]);["name","type","location","comment","date"].forEach((k,i)=>row[k]=values[i]);return [{affectedRows:1}];}
  if(sql.startsWith("DELETE FROM documents")){current=current.filter(x=>x.id!==values[0]);return [{affectedRows:1}];}
  if(sql.startsWith("INSERT INTO livepalmes_document_options")){const row=current.find(x=>x.id===values[0]);docs.OPTIONS.forEach((k,i)=>row[k]=values[i]);return [{affectedRows:1}];}
  if(sql.startsWith("DELETE FROM livepalmes_document_options"))return [{affectedRows:1}];
  throw Error(`Unexpected query ${sql}`);
 }};
 const services={authorize:async()=>structuredClone(authority),downloadUrl:(path,token)=>helpers.competitionDocumentDownloadUrl("livepalmes-test.appspot.com",path,token),
  saveFile:async()=>{assert.ok(saved);if(failedFile)throw Error("Storage unavailable");uploaded=true;history.push("upload");},
  deleteFile:async()=>{assert.ok(history.includes("complete"));history.push("cleanup");},
  audit:{read:async()=>saved,prepare:async(_key,plan)=>{saved=structuredClone(plan);history.push("journal");},complete:async()=>history.push("complete")}};
 return {pool:{getConnection:async()=>connection},services,connection,history,get rows(){return current;},get saved(){return saved;},get writes(){return writes;},get queries(){return queryCount;},get uploaded(){return uploaded;},failWrite:()=>failedWrite=true,failFile:()=>failedFile=true};
}
const upload={action:"upload",competitionId:"5162",actorUid:"administrator",fileName:"test.pdf",title:"Règlement",category:"rules",description:"Document d'essai",fileDataUrl:`data:application/pdf;base64,${Buffer.from("%PDF-1.4\nDocument").toString("base64")}`};
(async()=>{
 const f=fixture();const created=await docs.mutate(f.pool,upload,f.services);
 assert.equal(created.source,"nap");assert.equal(created.documentId,"nap-42");assert.equal(created.documents[0].category,"rules");assert.equal(f.rows[0].element,34);assert.equal(f.rows[0].type,7);
 assert.equal(f.writes,2);assert.ok(f.queries<=12);assert.ok(f.rows[0].location.length<=255);assert.ok(f.rows[0].storage_path.length<=160);
 assert.ok(f.history.indexOf("journal")<f.history.indexOf("upload"));assert.ok(f.history.indexOf("upload")<f.history.indexOf("write"));
 assert.ok(f.history.includes("complete"));assert.equal(f.history.at(-1),"release");
 const edit=fixture(f.rows);const edited=await docs.mutate(edit.pool,{...upload,action:"update",documentId:"nap-42",expectedFingerprint:created.documents[0].napFingerprint,title:"Titre corrigé",category:"access"},edit.services);
 assert.equal(edited.documents[0].title,"Titre corrigé");assert.equal(edited.documents[0].category,"access");assert.equal(edit.uploaded,false);assert.equal(edit.rows[0].location,f.rows[0].location);
 const replace=fixture(f.rows);const replaced=await docs.mutate(replace.pool,{...upload,documentId:"nap-42",expectedFingerprint:created.documents[0].napFingerprint,fileName:"nouvelle-version.pdf"},replace.services);assert.notEqual(replaced.documents[0].url,created.documents[0].url);assert.equal(replace.rows[0].id,42);assert.ok(replace.history.indexOf("cleanup")>replace.history.indexOf("complete"));
 const deletion=fixture(edit.rows);const deleted=await docs.mutate(deletion.pool,{action:"delete",competitionId:5162,actorUid:"administrator",documentId:"nap-42",expectedFingerprint:edited.documents[0].napFingerprint},deletion.services);
 assert.deepEqual(deleted.documents,[]);assert.equal(deleted.storageDeleted,true);assert.equal(deletion.writes,2);assert.ok(deletion.history.includes("cleanup"));
 const concurrent=fixture(f.rows);await assert.rejects(docs.mutate(concurrent.pool,{...upload,documentId:"nap-42",expectedFingerprint:"obsolete"},concurrent.services),/changé/);assert.equal(concurrent.writes,0);
 const refused=fixture();refused.services.authorize=async()=>{throw Error("Forbidden");};await assert.rejects(docs.mutate(refused.pool,upload,refused.services),/Forbidden/);assert.equal(refused.writes,0);assert.equal(refused.uploaded,false);
 const failed=fixture();failed.failWrite();await assert.rejects(docs.mutate(failed.pool,upload,failed.services),/vérifier/);assert.equal(failed.writes,1);assert.ok(failed.saved);assert.ok(!failed.history.includes("complete"));
 const fileFail=fixture();fileFail.failFile();await assert.rejects(docs.mutate(fileFail.pool,upload,fileFail.services),/Storage/);assert.equal(fileFail.writes,0);assert.ok(fileFail.saved);
 const tooMany=fixture(Array.from({length:20},(_,i)=>({...legacy,id:i+1})));await assert.rejects(docs.mutate(tooMany.pool,upload,tooMany.services),/20 documents/);assert.equal(tooMany.writes,0);
 const item=docs.item(legacy);assert.equal(item.source,"legacy");assert.equal(item.fileName,"test.pdf");assert.equal(item.category,"results");assert.ok(item.url.startsWith("https://nap.ffessm.fr/"));
 const old=fixture([legacy]);const renamed=await docs.mutate(old.pool,{...upload,action:"update",documentId:"nap-42",expectedFingerprint:item.napFingerprint,title:"Ancien protocole renommé"},old.services);assert.equal(renamed.documents[0].source,"legacy");assert.equal(old.rows[0].location,legacy.location);
 const plan=docs.writePlan("update",legacy,{...legacy,name:"Corrigé"},authority);assert.match(plan.sql,/WHERE id=\?/);assert.match(plan.sql,/compet_parametres cp FORCE INDEX \(PRIMARY\)/);assert.equal((plan.sql.match(/\?/g)||[]).length,plan.values.length);
 const read=fixture([legacy]);assert.equal((await docs.readDocuments(read.connection,5162)).length,1);assert.equal(read.queries,1);
 const index=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");for(const action of ["upload","update","delete"]){assert.ok(index.includes(`return mutateNativeCompetitionDocument(request,"${action}")`));}
 console.log("NAP documents: creation, metadata, withdrawal, scope, concurrency, failure journal and bounded reads passed without network.");
})().catch(error=>{console.error(error);process.exitCode=1;});
