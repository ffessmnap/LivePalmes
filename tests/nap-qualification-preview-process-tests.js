"use strict";
const assert=require('node:assert/strict');
const {processPreview}=require('../functions/nap-qualification-preview-process');
const {fingerprint}=require('../functions/nap-portal-workspaces');
const pack={event:{id:'legacy-nap-5162',date:'2026-11-07'}};
const input={competitionId:5162,jobId:'a'.repeat(64),national:true,actorUid:'national',now:'2026-10-08 19:00:00.000000'};
function fixture({stale=false,state='preview',started=false}={}){
 let reads=0,pages=0,saves=0,writes=0,releases=0;
 const row={id:input.jobId,competition_id:5162,state,version:'1',cursor:'',payload:{rules:{enabled:false},expectedFingerprint:stale?'stale':fingerprint(pack),count:0,applyStarted:started}};
 const connection={release:()=>releases++,destroy:()=>releases++,execute:async(statement)=>{
  if(statement.sql.includes('GET_LOCK'))return [[{acquired:1}]];
  if(statement.sql.includes('RELEASE_LOCK'))return [[{released:1}]];
  if(statement.sql.startsWith('SELECT id,competition_id')){reads++;return [[row]];}
  if(statement.sql.startsWith('UPDATE')){writes++;return [{affectedRows:1}];}
  throw new Error('Unexpected query');
 }};
 const services={authorize:()=>{},categoryFor:()=> 'S',eventsFor:()=>[],readCompetition:async(c,id,authorize)=>{await authorize(pack.event);return pack;},previewPage:async()=>{pages++;return {items:[],finished:true,cursor:''};},savePage:async()=>{saves++;return {state:'ready',count:0,cursor:''};}};
 return {pool:{getConnection:async()=>connection},services,counts:()=>({reads,pages,saves,writes,releases})};
}
async function main(){
 const ok=fixture();assert.equal((await processPreview(ok.pool,input,ok.services)).state,'ready');assert.deepEqual(ok.counts(),{reads:1,pages:1,saves:1,writes:0,releases:1});
 const stale=fixture({stale:true});await assert.rejects(processPreview(stale.pool,input,stale.services),TypeError);assert.equal(stale.counts().saves,0);
 const cancel=fixture();assert.equal((await processPreview(cancel.pool,{...input,action:'cancel'},cancel.services)).state,'cancelled');assert.equal(cancel.counts().writes,1);assert.equal(cancel.counts().pages,0);
 const applied=fixture({state:'apply',started:true});await assert.rejects(processPreview(applied.pool,{...input,action:'cancel'},applied.services),TypeError);assert.equal(applied.counts().writes,0);
 const ready=fixture({state:'ready'});assert.equal((await processPreview(ready.pool,input,ready.services)).state,'ready');assert.equal(ready.counts().pages,0);
 const denied=fixture();await assert.rejects(processPreview(denied.pool,{...input,national:false},denied.services));assert.equal(denied.counts().reads,0);
 console.log('NAP qualification preview process: native authorized job, competition-scoped lock, stored page advance, stale rules refusal and safe cancellation before apply; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
