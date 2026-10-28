"use strict";
const assert=require("node:assert/strict");
const fs=require("./helpers/source-files");
const docs=require("../functions/nap-competition-documents");
const helpers=require("../functions/engagement-competition-documents");
const authority={id:5162,date:"2026-11-07",enddate:null,comite:1,parameter_id:100,niveau:1};
const legacy={id:42,name:"Protocole",type:11,location:"/documents/test.pdf",date:"2026-10-08 12:00:00",user:null,competition:5162,sent:0,comment:"",public:"Y",element:34,type_label:"Résultats"};
function fixture(initial=[],extended=false){
 let current=structuredClone(initial),saved=null,writes=0,queryCount=0,uploaded=false,failedWrite=false,failedFile=false;
 const history=[];
 const connection={release:()=>history.push("release"),execute:async(query,values=[])=>{
  queryCount++;const sql=query.sql;
  if(sql.includes("GET_LOCK"))return [[{acquired:1}]];
  if(sql.includes("RELEASE_LOCK"))return [[{released:1}]];
  if(sql.includes("information_schema.TABLES"))return [[{TABLE_NAME:"documents",ENGINE:"MyISAM"},{TABLE_NAME:"livepalmes_document_options",ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}]];
  if(sql.includes("information_schema.COLUMNS")){
   const nullable=require("../functions/nap-document-options-contract").NULLABLE_FILE_FIELDS;
   const columns=docs.OPTION_SCHEMA.map(([COLUMN_NAME,COLUMN_TYPE])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:extended&&nullable.has(COLUMN_NAME)?"YES":"NO",COLUMN_DEFAULT:null,EXTRA:""}));
   if(extended)columns.push({COLUMN_NAME:"featured_rank",COLUMN_TYPE:"tinyint unsigned",IS_NULLABLE:"YES",COLUMN_DEFAULT:null,EXTRA:""});
   return [columns];
  }
  if(sql.includes("information_schema.STATISTICS")){
   const indexes=[{INDEX_NAME:"PRIMARY",COLUMN_NAME:"document_id",SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null}];
   if(extended)indexes.unshift({INDEX_NAME:"livepalmes_document_featured_rank",COLUMN_NAME:"featured_rank",SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null});
   return [indexes];
  }
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
 const large=Buffer.alloc(2*1024*1024+1,32);large.write('%PDF-1.4\n');
 const largeUpload={...upload,national:true,fileDataUrl:`data:application/pdf;base64,${large.toString('base64')}`};
 const tooLarge=fixture();await assert.rejects(docs.mutate(tooLarge.pool,largeUpload,tooLarge.services),/2 Mo/);assert.equal(tooLarge.writes,0);assert.equal(tooLarge.uploaded,false);assert.equal(tooLarge.saved,null);
 const nationalUpload=fixture();nationalUpload.services.national=true;const nationalSaved=await docs.mutate(nationalUpload.pool,largeUpload,nationalUpload.services);assert.equal(nationalSaved.documents[0].size,large.length);
 const regionalMetadata=fixture(nationalUpload.rows);await docs.mutate(regionalMetadata.pool,{...upload,action:'update',documentId:'nap-42',expectedFingerprint:nationalSaved.documents[0].napFingerprint},regionalMetadata.services);assert.equal(regionalMetadata.rows[0].size,large.length);assert.equal(regionalMetadata.uploaded,false);
 const regionalReplace=fixture(nationalUpload.rows);await assert.rejects(docs.mutate(regionalReplace.pool,{...largeUpload,documentId:'nap-42',expectedFingerprint:nationalSaved.documents[0].napFingerprint},regionalReplace.services),/2 Mo/);assert.equal(regionalReplace.uploaded,false);assert.equal(regionalReplace.writes,0);
 const f=fixture();const created=await docs.mutate(f.pool,upload,f.services);
 assert.equal(created.source,"nap");assert.equal(created.documentId,"nap-42");assert.equal(created.documents[0].category,"rules");assert.equal(f.rows[0].element,34);assert.equal(f.rows[0].type,7);
 assert.equal(f.writes,2);assert.ok(f.queries<=12);assert.ok(f.rows[0].location.length<=255);assert.ok(f.rows[0].storage_path.length<=160);
 assert.ok(f.history.indexOf("journal")<f.history.indexOf("upload"));assert.ok(f.history.indexOf("upload")<f.history.indexOf("write"));
 assert.ok(f.history.includes("complete"));assert.equal(f.history.at(-1),"release");
 assert.equal(docs.item(f.rows[0]).uploadedBy,undefined,"club and public reads exclude uploader identities");assert.equal(docs.item(f.rows[0],{includeUploader:true}).uploadedBy.uid,"administrator");
 const edit=fixture(f.rows);const edited=await docs.mutate(edit.pool,{...upload,action:"update",documentId:"nap-42",expectedFingerprint:created.documents[0].napFingerprint,title:"Titre corrigé",category:"access"},edit.services);
 assert.equal(edited.documents[0].title,"Titre corrigé");assert.equal(edited.documents[0].category,"access");assert.equal(edit.uploaded,false);assert.equal(edit.rows[0].location,f.rows[0].location);
 const migrated=fixture(f.rows.map(row=>({...row,featured_rank:6})),true);
 const migratedEdit=await docs.mutate(migrated.pool,{...upload,action:"update",documentId:"nap-42",expectedFingerprint:created.documents[0].napFingerprint,title:"Schéma enrichi",category:"access"},migrated.services);
 assert.equal(migratedEdit.documents[0].title,"Schéma enrichi");assert.equal(migrated.rows[0].featured_rank,6,"ordinary metadata upsert preserves editorial rank");
 const migratedUpload=fixture([],true);assert.equal((await docs.mutate(migratedUpload.pool,upload,migratedUpload.services)).ok,true);
 const replace=fixture(f.rows);const replaced=await docs.mutate(replace.pool,{...upload,documentId:"nap-42",expectedFingerprint:created.documents[0].napFingerprint,fileName:"nouvelle-version.pdf"},replace.services);assert.notEqual(replaced.documents[0].url,created.documents[0].url);assert.equal(replace.rows[0].id,42);assert.ok(replace.history.indexOf("cleanup")>replace.history.indexOf("complete"));
 const deletion=fixture(edit.rows);const deleted=await docs.mutate(deletion.pool,{action:"delete",competitionId:5162,actorUid:"administrator",documentId:"nap-42",expectedFingerprint:edited.documents[0].napFingerprint},deletion.services);
 assert.deepEqual(deleted.documents,[]);assert.equal(deleted.storageDeleted,true);assert.equal(deletion.writes,2);assert.ok(deletion.history.includes("cleanup"));
 const concurrent=fixture(f.rows);await assert.rejects(docs.mutate(concurrent.pool,{...upload,documentId:"nap-42",expectedFingerprint:"obsolete"},concurrent.services),/changé/);assert.equal(concurrent.writes,0);
 const refused=fixture();refused.services.authorize=async()=>{throw Error("Forbidden");};await assert.rejects(docs.mutate(refused.pool,upload,refused.services),/Forbidden/);assert.equal(refused.writes,0);assert.equal(refused.uploaded,false);
 const drift=fixture();const execute=drift.connection.execute;drift.connection.execute=async(query,values)=>query.sql.includes("information_schema.COLUMNS")?[[]]:execute(query,values);await assert.rejects(docs.mutate(drift.pool,upload,drift.services),/incompatible/);assert.equal(drift.writes,0);assert.equal(drift.uploaded,false);assert.equal(drift.saved,null);
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
