"use strict";
const assert=require("node:assert/strict");
const featured=require("../functions/nap-featured-documents");
const {FILE_SCHEMA,NULLABLE_FILE_FIELDS}=require("../functions/nap-document-options-contract");
function fixture(selected=[],settings={}){
 const initial=selected.map((id,i)=>({document_id:id,featured_rank:i+1,version:5,category:"information",file_name:"preserved.pdf",storage_path:"preserved-path",created_by:"historical"}));
 let state=structuredClone(initial),rollbackState=null,writes=0,eligibleReads=0;
 const history=[],eligible=new Set(Array.from({length:12},(_,i)=>i+1));
 const native=id=>eligible.has(id)?{id,name:`Document ${id}`,date:"2026-10-13 10:00:00",location:`/documents/${id}.pdf`,type:1,element:0,type_label:"Circulaire",element_label:null}:{id:null};
 const connection={
  beginTransaction:async()=>{rollbackState=structuredClone(state);history.push("begin");},
  rollback:async()=>{state=rollbackState;history.push("rollback");},
  commit:async()=>history.push("commit"),release:()=>history.push("release"),
  execute:async({sql},values=[])=>{
   if(sql.includes("GET_LOCK"))return [[{acquired:settings.locked?0:1}]];
   if(sql.includes("RELEASE_LOCK")){history.push("unlock");return [[{released:1}]];}
   if(sql.includes("information_schema.COLUMNS"))return [[...FILE_SCHEMA.map(([COLUMN_NAME,COLUMN_TYPE])=>({COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE:!settings.original&&NULLABLE_FILE_FIELDS.has(COLUMN_NAME)?"YES":"NO",COLUMN_DEFAULT:null,EXTRA:""})),...settings.original?[]:[{COLUMN_NAME:"featured_rank",COLUMN_TYPE:"tinyint unsigned",IS_NULLABLE:"YES",COLUMN_DEFAULT:null,EXTRA:""}]]];
   if(sql.includes("information_schema.STATISTICS"))return [[...settings.original?[]:[{INDEX_NAME:"livepalmes_document_featured_rank",COLUMN_NAME:"featured_rank",SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null}],{INDEX_NAME:"PRIMARY",COLUMN_NAME:"document_id",SEQ_IN_INDEX:1,NON_UNIQUE:0,SUB_PART:null}]];
   if(sql.includes("information_schema.TABLES"))return [[{TABLE_NAME:"documents",ENGINE:"MyISAM"},{TABLE_NAME:"livepalmes_document_options",ENGINE:"InnoDB",TABLE_COLLATION:"utf8mb4_unicode_ci"}]];
   if(sql.includes("information_schema.TRIGGERS"))return [settings.trigger?[{TRIGGER_NAME:"unexpected"}]:[]];
   if(sql.startsWith("SELECT o.document_id"))return [state.filter(row=>row.featured_rank!=null).sort((a,b)=>a.featured_rank-b.featured_rank).map(row=>({...row,...native(row.document_id)}))];
   if(sql.startsWith("SELECT id,location FROM documents")){
    eligibleReads++;if(settings.revokeOnRecheck&&eligibleReads===2)eligible.delete(settings.revokeOnRecheck);
    assert.ok(values.length<=6);return [values.filter(id=>eligible.has(id)).map(id=>({id,location:`/documents/${id}.pdf`}))];
   }
   if(sql.startsWith("SELECT document_id,version"))return [state.filter(row=>values.includes(row.document_id)).map(({document_id,version})=>({document_id,version}))];
   if(sql.startsWith("UPDATE")){
    assert.ok(history.includes("prepare"));writes++;for(const row of state)if(row.featured_rank!=null){row.featured_rank=null;row.version++;}return [{affectedRows:state.length}];
   }
   if(sql.startsWith("INSERT")){
    assert.ok(history.includes("prepare"));writes++;if(settings.failWrite)throw Error("write failure");
    const [id,created_at,updated_at,created_by,updated_by,rank]=values;
    let row=state.find(item=>item.document_id===id);
    if(row){row.featured_rank=rank;row.version++;row.updated_at=updated_at;row.updated_by=updated_by;}
    else state.push({document_id:id,featured_rank:rank,version:1,category:null,file_name:null,storage_path:null,content_type:null,size:null,created_at,updated_at,created_by,updated_by});
    return [{affectedRows:1}];
   }
   throw Error(`Unexpected query ${sql}`);
  }
 };
 const audit={read:async()=>settings.existingAudit?{}:null,prepare:async()=>history.push("prepare"),complete:async()=>{if(settings.failComplete)throw Error("journal failure");history.push("complete");}};
 const services={authorize:async()=>({uid:"trusted-national",national:!settings.denied}),audit};
 return {connection,pool:{getConnection:async()=>connection},services,history,eligible,get state(){return state;},get writes(){return writes;},initial};
}
async function save(f,ids,expected){
 return featured.saveSelection(f.pool,{documentIds:ids,expectedFingerprint:expected||(await featured.readSelection(f.connection)).fingerprint},f.services);
}
(async()=>{
 const f=fixture([1,2]);const before=await featured.readSelection(f.connection);
 const result=await save(f,[2,3,1]);assert.deepEqual(result.documents.map(row=>row.id),[2,3,1]);
 assert.equal(f.state.find(row=>row.document_id===1).storage_path,"preserved-path");
 assert.equal(f.state.find(row=>row.document_id===1).created_by,"historical");
 assert.equal(f.state.find(row=>row.document_id===3).storage_path,null);
 assert.equal(f.state.find(row=>row.document_id===3).created_by,"trusted-national");
 assert.ok(f.history.indexOf("prepare")<f.history.indexOf("commit"));assert.ok(f.history.indexOf("commit")<f.history.indexOf("complete"));assert.equal(f.history.at(-1),"release");
 await assert.rejects(save(f,[1],before.fingerprint),/changé/);
 const unchanged=fixture([1,2]);assert.equal((await save(unchanged,[1,2])).unchanged,true);assert.equal(unchanged.writes,0);
 const empty=fixture([1,2]);assert.deepEqual((await save(empty,[])).documents,[]);assert.equal(empty.state.length,2,"withdrawal preserves complementary rows");
 assert.equal((await save(fixture(),[1,2,3,4,5,6])).documents.length,6);
 for(const ids of [[1,1],[1,2,3,4,5,6,7],[0],[-1],[1.5],["1"]])assert.throws(()=>featured.selectionInput({documentIds:ids,expectedFingerprint:before.fingerprint}),/invalide/);
 for(const [settings,pattern] of [[{denied:true},/nationale/],[{locked:true},/en cours/],[{original:true},/pas encore/],[{existingAudit:true},/sauvegarde/],[{trigger:true},/Déclencheur/]]){
  const denied=fixture([1],settings);await assert.rejects(save(denied,[2]),pattern);assert.equal(denied.writes,0);
 }
 const privateDocument=fixture([1]);privateDocument.eligible.delete(2);await assert.rejects(save(privateDocument,[2]),/encore publics/);assert.equal(privateDocument.writes,0);
 const revoked=fixture([1],{revokeOnRecheck:2});await assert.rejects(save(revoked,[2]),/encore publics/);assert.deepEqual(revoked.state,revoked.initial);assert.ok(revoked.history.includes("rollback"));assert.ok(!revoked.history.includes("complete"));
 const failed=fixture([1],{failWrite:true});await assert.rejects(save(failed,[2]),/write failure/);assert.deepEqual(failed.state,failed.initial);
 const journal=fixture([1],{failComplete:true});await assert.rejects(save(journal,[2]),/journal failure/);assert.ok(journal.history.includes("commit"));assert.deepEqual((await featured.readSelection(journal.connection)).documents.map(row=>row.id),[2]);assert.ok(!journal.history.includes("rollback"));
 const hidden=fixture([1]);hidden.eligible.delete(1);const hiddenState=await featured.readSelection(hidden.connection);assert.equal(hiddenState.documents[0].available,false);assert.equal(JSON.stringify(hiddenState.documents).includes("preserved"),false);assert.deepEqual((await save(hidden,[])).documents,[]);
 console.log("Featured documents: national authority, global CAS, transaction rollback, metadata preservation, six ranks, private withdrawal and uncertain journal completion passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
