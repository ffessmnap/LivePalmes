"use strict";
const assert=require("node:assert/strict");
const {fixture,pack,input}=require("./nap-import-write-tests");
const protocol=require("../functions/nap-import-protocol"),{hash}=require("../functions/nap-import-preview");
const {FIELDS,OPTIONS}=require("../functions/nap-competition-documents"),{FILE_SCHEMA}=require("../functions/nap-document-options-contract");
const {prepareImportOperation}=require("../functions/nap-import-operation-plan");
const pdf=Buffer.from("%PDF-1.4\nSynthetic protocol only\n%%EOF"),manifest={fileName:"ProtocoleComplet.pdf",size:pdf.length,hash:protocol.digest(pdf)};
const zipInput={...input,sourceType:"winpalme-zip-preview",protocolManifest:manifest,protocolDataUrl:`data:application/pdf;base64,${pdf.toString("base64")}`,courseBindings:[],clubAcknowledgements:[],replacementReviewFingerprint:pack.previewFingerprint};
const zipPack=()=>{const result=structuredClone(pack);result.review={};result.existingStatuses=[];result.expectedFingerprint=hash({competition:result.competition,existing:result.existing,existingRelays:[],statuses:[]});return result;};
function zipFixture({lost="",storageLost=false,storageAbsent=false,override,invalidOptions=false}={}){
 const proposed=override||zipPack(),state={documents:[],options:[],staged:false,uploads:0,pdfChecks:0,documentWrites:0,lost,statements:[]};
 const storage={downloadUrl:path=>"https://fixture.test/"+path.split("/").pop(),ensure:async(plan,buffer)=>{state.pdfChecks++;if(storageAbsent){storageAbsent=false;throw Error("storage unavailable before upload");}if(buffer)assert.equal(protocol.digest(buffer),plan.manifest.hash);if(!state.staged){assert.ok(buffer,"A first attempt must include the PDF");state.staged=true;state.uploads++;}if(storageLost){storageLost=false;throw Error("lost storage reply");}}};
 const f=fixture({zip:true,protocolStorage:storage,packOverride:proposed,executeExtra:async(sql,values,base)=>{
  state.statements.push(sql);
  if(sql.includes("AUTO_INCREMENT FROM information_schema.TABLES"))return [[{TABLE_NAME:"perfs",ENGINE:"MyISAM",AUTO_INCREMENT:1000},{TABLE_NAME:"perfs_relais",ENGINE:"MyISAM",AUTO_INCREMENT:100},{TABLE_NAME:"documents",ENGINE:"MyISAM",AUTO_INCREMENT:2000},{TABLE_NAME:"livepalmes_document_options",ENGINE:"InnoDB",AUTO_INCREMENT:null}]];
  if(sql.includes("information_schema.COLUMNS"))return [invalidOptions?[]:FILE_SCHEMA.map(([COLUMN_NAME,COLUMN_TYPE])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:"NO",COLUMN_DEFAULT:null,EXTRA:""}))];
  if(sql.includes("information_schema.STATISTICS"))return [[{INDEX_NAME:"PRIMARY",COLUMN_NAME:"document_id",SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null}]];
  if(sql.includes("FROM course_dispo"))return [[]];
  if(sql.includes("FROM documents d"))return [state.documents.map(row=>({...row,...(state.options.find(o=>o.document_id===row.id)||Object.fromEntries(OPTIONS.map(k=>[k,null]))),type_label:"Résultats"}))];
  if(sql.startsWith("INSERT INTO documents")){assert.ok(base.locked);assert.equal(state.staged,true);state.documents.push(Object.fromEntries(FIELDS.map((key,i)=>[key,values[i]])));state.documentWrites++;if(state.lost==="document"){state.lost="";throw Error("lost document reply");}return [{affectedRows:1}];}
  if(sql.startsWith("UPDATE documents")){const row=state.documents.find(r=>r.id===values[5]);assert.ok(row);[row.name,row.type,row.location,row.comment,row.date]=values.slice(0,5);state.documentWrites++;return [{affectedRows:1}];}
  if(sql.startsWith("INSERT INTO livepalmes_document_options")){const row=Object.fromEntries(OPTIONS.map((key,i)=>[key,values[i]]));state.options=state.options.filter(o=>o.document_id!==row.document_id);state.options.push(row);if(state.lost==="options"){state.lost="";throw Error("lost options reply");}return [{affectedRows:1}];}
  if(sql.startsWith("UPDATE livepalmes_performance_imports SET status='replaced'"))return [{affectedRows:1}];
  return undefined;
 }});
 return {...f,pdfState:state,pack:proposed,data:{...zipInput,expectedFingerprint:proposed.expectedFingerprint}};
}
if(require.main===module)(async()=>{
 let f=zipFixture();await f.writer({data:f.data});assert.equal(f.state.writes,2);assert.equal(f.pdfState.documentWrites,1);assert.equal(f.pdfState.uploads,1);assert.equal(f.state.pointer.protocol.hash,manifest.hash);assert.equal(f.state.pointer.protocol.documentId,2000);assert.equal(f.state.journal.status,"completed");
 assert.equal(f.state.previewInput.sourceType,"winpalme-zip-preview");assert.deepEqual(f.state.previewInput.clubAcknowledgements,[]);assert.deepEqual(f.state.previewInput.courseBindings,[]);assert.equal(f.state.journal.metadata.includes("base64"),false,"SQL stores no PDF bytes");assert.equal(JSON.parse(f.state.journal.metadata).sourceType,"winpalme-zip-preview");
 await f.writer({data:f.data});assert.equal(f.pdfState.documentWrites,1);assert.equal(f.pdfState.pdfChecks,1,"Completed retries do not mutate or reload PDF");assert.equal(f.state.writes,2);
 for(const lost of ["document","options"]){f=zipFixture({lost});await assert.rejects(()=>f.writer({data:f.data}),/lost/);assert.ok(f.state.pointer.activeImportId);await f.writer({data:{resumeImportId:f.state.pointer.activeImportId}});assert.equal(f.state.writes,2);assert.equal(f.pdfState.documentWrites,1,"Lost PDF insert response must not duplicate its document");assert.equal(f.pdfState.documents.length,1);assert.equal(f.pdfState.options.length,1);assert.equal(f.state.journal.status,"completed");assert.equal(f.pdfState.uploads,1);}
 f=zipFixture({storageLost:true});await assert.rejects(()=>f.writer({data:f.data}),/lost storage/);assert.equal(f.state.writes,0);await f.writer({data:{resumeImportId:f.state.pointer.activeImportId}});assert.equal(f.pdfState.uploads,1);assert.equal(f.state.journal.status,"completed");
 f=zipFixture({storageAbsent:true});await assert.rejects(()=>f.writer({data:f.data}),/before upload/);assert.equal(f.state.writes,0);await f.writer({data:{resumeImportId:f.state.pointer.activeImportId,protocolDataUrl:f.data.protocolDataUrl}});assert.equal(f.pdfState.uploads,1,"History can reattach original PDF if first upload never happened");
 for(const change of [{protocolDataUrl:"data:application/pdf;base64,ZmFrZQ=="},{protocolManifest:{...manifest,hash:"0".repeat(64)}},{protocolManifest:undefined}]){f=zipFixture();await assert.rejects(()=>f.writer({data:{...f.data,...change}}));assert.equal(f.state.pools,0);assert.equal(f.state.writes,0);assert.equal(f.pdfState.uploads,0);}
 f=zipFixture({invalidOptions:true});await assert.rejects(()=>f.writer({data:f.data}),/incompatible/);assert.equal(f.state.journal,null);assert.equal(f.state.writes,0);assert.equal(f.pdfState.uploads,0);
 f=zipFixture();await assert.rejects(()=>f.writer({data:{...f.data,replacementReviewFingerprint:"stale"}}),/bilan/);assert.equal(f.state.journal,null);
 const additive=zipPack();additive.incoming.push({...additive.incoming[0],row:{...additive.incoming[0].row,course:"200SF"}});additive.incoming[0].row={...additive.existing[0]};delete additive.incoming[0].row.id;
 assert.throws(()=>prepareImportOperation(additive,{perfs:1000,relays:100},{...zipInput,expectedFingerprint:additive.expectedFingerprint,confirmReplacement:false}),/bilan/,"Additions alone also require national replacement confirmation");
 const pdfOnly=zipPack();pdfOnly.incoming[0].row={...pdfOnly.existing[0]};delete pdfOnly.incoming[0].row.id;pdfOnly.existingProtocol={hash:"0".repeat(64)};
 assert.throws(()=>prepareImportOperation(pdfOnly,{perfs:1000,relays:100},{...zipInput,expectedFingerprint:pdfOnly.expectedFingerprint,confirmReplacement:false}),/bilan/,"A changed PDF alone requires fresh replacement confirmation");
 const changedCatalog=zipPack();changedCatalog.courseReview={courses:[{id:'1',code:'LD02KM'}]};f=zipFixture({override:changedCatalog});await assert.rejects(()=>f.writer({data:f.data}),/catalogue/);assert.equal(f.state.writes,0);assert.equal(f.pdfState.uploads,0);
 const {publish}=protocol;f=zipFixture();await f.writer({data:f.data});const saved=JSON.parse(f.state.journal.metadata).protocol;f.pdfState.documents[0].name="Changed independently";
 const connection={execute:async({sql})=>{assert.ok(sql.includes("FROM documents d"));return [f.pdfState.documents.map(row=>({...row,...f.pdfState.options[0]}))];}};
 await assert.rejects(()=>publish(connection,saved),/modifié/);
 const sporting=zipPack(),base=sporting.incoming[0].row;
 sporting.incoming.push({sourceLine:4,origin:"passage",row:{...base,passage:1,tps:"010000",points:0,classement:0}},{sourceLine:7,origin:"first-relay",row:{...base,tps:"010100",points:0,classement:0}},{sourceLine:8,origin:"individual",row:{...base,course:"LD02KM",tps:"1 033500"}});
 f=zipFixture({override:sporting});await f.writer({data:f.data});assert.equal(f.state.rows.length,4);assert.ok(f.state.rows.some(r=>r.passage===1&&r.tps==='010000'));assert.ok(f.state.rows.some(r=>r.passage===0&&r.tps==='010100'));assert.ok(f.state.rows.some(r=>r.course==='LD02KM'&&r.tps==='1 033500'));
 const journal=JSON.parse(f.state.journal.metadata);assert.ok(journal.plan.perfs.additions.some(r=>r.origin==='first-relay'));assert.equal(journal.plan.statusRows[0].status,'DSQ');
 const previous=zipFixture();await previous.writer({data:previous.data});const replacement=zipPack();replacement.existingProtocol=previous.state.pointer.protocol;
 f=zipFixture({override:replacement});f.state.pointer={currentImportId:"older-import",protocol:previous.state.pointer.protocol};f.pdfState.documents=structuredClone(previous.pdfState.documents);f.pdfState.options=structuredClone(previous.pdfState.options);
 await f.writer({data:f.data});assert.equal(f.pdfState.documentWrites,0,"Identical PDF reuses its document and storage path");assert.equal(f.pdfState.documents.length,1);assert.equal(JSON.parse(f.state.journal.metadata).protocol.before.id,2000);
 const newPdf=Buffer.from("%PDF-1.4\nRevised synthetic protocol\n%%EOF");f=zipFixture({override:replacement});f.state.pointer={currentImportId:"older-import",protocol:previous.state.pointer.protocol};f.pdfState.documents=structuredClone(previous.pdfState.documents);f.pdfState.options=structuredClone(previous.pdfState.options);f.data.protocolManifest={...manifest,size:newPdf.length,hash:protocol.digest(newPdf)};f.data.protocolDataUrl=`data:application/pdf;base64,${newPdf.toString('base64')}`;await f.writer({data:f.data});assert.equal(f.pdfState.documentWrites,1);assert.equal(f.pdfState.documents.length,1,"Replacement updates the associated document instead of accumulating PDFs");assert.equal(f.pdfState.options[0].version,2);assert.notEqual(f.pdfState.options[0].storage_path,previous.pdfState.options[0].storage_path);assert.equal(JSON.parse(f.state.journal.metadata).protocol.previous.storage_path,previous.pdfState.options[0].storage_path,"Previous PDF is retained in durable backup");
 const {createProtocolStorage}=require('../functions/nap-import-protocol-storage');let uploadCount=0,stored;
 const object={save:async(buffer,options)=>{assert.equal(options.preconditionOpts.ifGenerationMatch,0);uploadCount++;if(stored){const error=Error('already exists');error.code=412;throw error;}stored=buffer;},download:async()=>[stored]};
 const storage=createProtocolStorage({name:'fixture',file:()=>object}),p=JSON.parse(previous.state.journal.metadata).protocol;
 await storage.ensure(p,pdf);await storage.ensure(p,pdf);await storage.ensure(p);assert.equal(uploadCount,2);stored=Buffer.from('altered');await assert.rejects(()=>storage.ensure(p),/différent/);
 console.log("ZIP writes simulated: national-only, all reviewed choices retained, fresh replacement approval including additions, no PDF bytes in SQL, durable PDF/results recovery after lost Storage/native/metadata replies, no duplicate results/documents and no real writes.");
})().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={zipFixture,manifest,pdf};
