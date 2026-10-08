"use strict";
const assert=require('node:assert/strict'),{reviewControl}=require('../functions/nap-qualification-control-review');
const {fingerprint}=require('../functions/nap-portal-workspaces');
const pack={event:{id:'legacy-nap-5162'}},id='a'.repeat(64),pageId='b'.repeat(64);
const input={competitionId:5162,jobId:id,actorUid:'national',national:true,now:'2026-10-08 19:00:00.000000'};
function fixture({stale=false,pageParent=id,affected=1}={}){
 let writes=0,grouped=0,authorized=false;
 let job={id,competition_id:5162,state:'ready',cursor:'',version:'1',payload:{expectedFingerprint:stale?'stale':fingerprint(pack),pageIds:[pageId],count:1,applyStarted:false}};
 const page={parentId:pageParent,items:[{before:{swimmerId:'912',name:'Test Nageur',clubId:'00106'},removed:[{eventCode:'50BI',nativeId:44,nativeTime:'002400'}]}]};
 const connection={execute:async(statement,values)=>{
  assert.equal(authorized,true);
  if(statement.sql.includes('WHERE id IN')){grouped++;assert.deepEqual(values,[pageId]);assert.match(statement.sql,/LIMIT 6$/);return [[{id:pageId,competition_id:5162,state:'page',payload:JSON.stringify(page)}]];}
  if(statement.sql.startsWith('SELECT'))return [[job]];
  if(statement.sql.startsWith('UPDATE')){writes++;if(affected===1)job={...job,state:values[0],payload:JSON.parse(values[1]),cursor:values[2],version:'2'};return [{affectedRows:affected}];}
  throw new Error('Unexpected SQL');
 }};
 const services={authorize:()=>{authorized=true;},readCompetition:async(c,id,authorize)=>{await authorize(pack.event);return pack;}};
 return {connection,services,counts:()=>({writes,grouped})};
}
async function main(){
 const detail=fixture();const result=await reviewControl(detail.connection,{...input,action:'details',cursor:''},detail.services);assert.equal(result.removed[0].name,'Test Nageur');assert.equal(result.removed[0].nativeTime,'002400');assert.deepEqual(detail.counts(),{writes:0,grouped:1});
 const other=fixture({pageParent:'c'.repeat(64)});await assert.rejects(reviewControl(other.connection,{...input,action:'details'},other.services),TypeError);
 const no=fixture();await assert.rejects(reviewControl(no.connection,{...input,action:'confirm'},no.services),TypeError);assert.equal(no.counts().writes,0);
 const yes=fixture();assert.equal((await reviewControl(yes.connection,{...input,action:'confirm',confirmed:true},yes.services)).state,'apply');assert.equal(yes.counts().writes,1);
 for(const options of [{stale:true},{affected:0}]){const bad=fixture(options);await assert.rejects(reviewControl(bad.connection,{...input,action:'confirm',confirmed:true},bad.services),TypeError);}
 const denied=fixture();await assert.rejects(reviewControl(denied.connection,{...input,national:false,action:'details'},denied.services));assert.equal(denied.counts().grouped,0);
 console.log('NAP control review: bounded grouped native impact details, exact parent scope, explicit national confirmation, stale/concurrent control refusal and zero sporting writes; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
