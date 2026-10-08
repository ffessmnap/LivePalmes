"use strict";
const assert=require('node:assert/strict'),{prepare,savePage}=require('../functions/nap-qualification-preview-store');
const previous={id:'a'.repeat(64),competition_id:5162,state:'preview',payload:{count:0,applyStarted:false},cursor:'',version:'1'};
const input={jobId:previous.id,competitionId:5162,national:true,actorUid:'national',previous,now:'2026-10-08 19:00:00.000000'};
const page={items:[],finished:true,cursor:''};
function fixture(fail=false){let current=structuredClone(previous),saved=[],backup=null,rollbacks=0,commits=0;
 const connection={beginTransaction:async()=>{backup={current:structuredClone(current),saved:structuredClone(saved)};},commit:async()=>{commits++;},rollback:async()=>{current=backup.current;saved=backup.saved;rollbacks++;},execute:async(statement,values)=>{
  const sql=statement.sql;if(sql.includes('FOR UPDATE'))return [[current]];
  if(sql.startsWith('SELECT id,competition_id,state'))return [saved];
  if(sql.startsWith('INSERT')){assert.match(sql,/'page'/);saved=[{id:values[0],competition_id:values[1],state:'page',payload:values[3]}];return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE')){if(fail)return [{affectedRows:0}];current={...current,state:values[0],payload:JSON.parse(values[1]),cursor:values[2],version:'2'};return [{affectedRows:1}];}
  throw new Error('Unexpected query');
 }};return {connection,counts:()=>({saved:saved.length,rollbacks,commits})};
}
async function main(){
 const ok=fixture();assert.equal((await savePage(ok.connection,input,page)).state,'ready');assert.equal(ok.counts().saved,1);
 assert.equal((await savePage(ok.connection,input,page)).resumed,true);assert.equal(ok.counts().saved,1,'A lost response resumes without saving the page twice');
 const bad=fixture(true);await assert.rejects(savePage(bad.connection,input,page),TypeError);assert.deepEqual(bad.counts(),{saved:0,rollbacks:1,commits:0},'The page and parent progress roll back together');
 assert.throws(()=>prepare({...input,national:false},page));assert.throws(()=>prepare(input,{...page,finished:false,cursor:''}));
 assert.throws(()=>prepare(input,{...page,items:[{before:{swimmerId:'912'},sourceHash:'b'.repeat(64),entries:[],removed:[]}]}));
 console.log('NAP qualification preview storage: atomic native page/progress, replay without duplication, concurrent failure rollback, scope and immutable dossier hashes; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
