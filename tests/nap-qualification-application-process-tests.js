"use strict";
const assert=require('node:assert/strict');
const {applyControl}=require('../functions/nap-qualification-application-process');
const {fingerprint}=require('../functions/nap-portal-workspaces');
const {SPECS}=require('../functions/nap-portal-competition-change');
const id='a'.repeat(64),pageId='b'.repeat(64),input={national:true,actorUid:'national',competitionId:5162,jobId:id,now:'2026-10-08 20:00:00.000000'};
const pack={event:{id:'legacy-nap-5162',date:'2026-11-07'},nativeParameters:{qualif:29},options:null,nativeSnapshot:{competition:Object.fromEntries(SPECS.competitions.columns.map(c=>[c,c==='id'?5162:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(c=>[c,c==='id'?4000:c==='compet'?5162:null]))}};
function fixture({failEffects=false,stale=false,restart=false,patch=false}={}){
 let job={id,competition_id:5162,state:'apply',cursor:'',version:'3',payload:{rules:{enabled:false},confirmedBy:'national',applyStarted:true,pageIds:[pageId],applyPage:0,count:1,generation:0,nativeSnapshot:pack.nativeSnapshot,expectedFingerprint:stale?'stale':fingerprint(pack)}};
 let sportingPresent=true,rollbacks=0,commits=0,releases=0,grids=0,effects=0,backup;
 if(patch)job.payload.patch={name:'Competition corrigee'};
 const connection={release:()=>releases++,destroy:()=>releases++,beginTransaction:async()=>{backup=structuredClone(job);},rollback:async()=>{job=backup;rollbacks++;},commit:async()=>commits++,execute:async(statement,values)=>{
  const sql=statement.sql;
  if(sql.includes('GET_LOCK'))return [[{acquired:1}]];if(sql.includes('RELEASE_LOCK'))return [[{released:1}]];
  if(sql.startsWith('SELECT TRIGGER_NAME'))return [[]];if(sql.startsWith('EXPLAIN'))return [[{table:'engagements',type:'range',key:'PRIMARY',rows:1}]];
  if(sql.startsWith('SELECT id,competition_id,actor_uid'))return [[job]];
  if(sql.startsWith('SELECT id,competition_id,state'))return [[{id:pageId,competition_id:5162,state:'page',payload:{parentId:id,kind:'individual',items:[{before:{clubId:'106',swimmerId:'912'},removed:[{eventCode:'50BI',nativeId:44}]}]}}]];
  if(sql.startsWith('DELETE FROM engagements')){sportingPresent=false;assert.equal((sql.match(/\?/g)||[]).length,values.length);return [{affectedRows:1}];}
  if(sql.startsWith('UPDATE livepalmes_qualification_jobs')){job={...job,state:values[0],payload:JSON.parse(values[1]),cursor:values[2],version:String(Number(job.version)+1)};return [{affectedRows:1}];}
  throw Error('Unexpected query');
 }};
 const services={authorize:()=>{},eventsFor:()=>[],competitionFor:()=>({}),readCompetition:async()=>pack,applicationPage:async()=>({restart,writes:sportingPresent?[{kind:'delete',before:{nativeId:44,eventCode:'50BI',nativeTime:'002400'},inscriptionId:100,swimmerId:912,clubId:'106'}]:[]}),effects:async()=>{effects++;if(failEffects)throw Error('Effects unavailable');},applyGrid:async()=>{grids++;return {verified:true};}};
 return {pool:{getConnection:async()=>connection},services,job:()=>job,counts:()=>({sportingPresent,rollbacks,commits,releases,grids,effects})};
}
async function main(){
 const ok=fixture();assert.equal((await applyControl(ok.pool,input,ok.services)).state,'apply');assert.equal(ok.job().payload.applyPage,1);assert.equal(ok.counts().sportingPresent,false);assert.equal(ok.counts().commits,1);
 assert.equal((await applyControl(ok.pool,input,ok.services)).state,'done');assert.equal(ok.counts().grids,1);assert.equal((await applyControl(ok.pool,input,ok.services)).state,'done');assert.equal(ok.counts().grids,1,'Lost completion resumes without rewriting the grid');
 const partial=fixture({failEffects:true});await assert.rejects(applyControl(partial.pool,input,partial.services),/Effects/);assert.equal(partial.counts().sportingPresent,false,'Never claim MyISAM sporting rows rolled back');assert.equal(partial.job().payload.applyPage,0);assert.equal(partial.counts().rollbacks,1);
 partial.services.effects=async()=>{};assert.equal((await applyControl(partial.pool,input,partial.services)).state,'apply');assert.equal(partial.job().payload.applyPage,1,'Same immutable page recognizes previously applied sporting effect');
 const proof=fixture({restart:true});assert.equal((await applyControl(proof.pool,input,proof.services)).state,'preview');assert.equal(proof.counts().sportingPresent,true);assert.equal(proof.job().payload.generation,1);assert.equal(proof.job().payload.applyStarted,true);assert.deepEqual(proof.job().payload.pageIds,[]);
 const stale=fixture({stale:true});await assert.rejects(applyControl(stale.pool,input,stale.services));assert.equal(stale.counts().sportingPresent,true);
 const combined=fixture({patch:true});await applyControl(combined.pool,input,combined.services);
 const resumed=[];combined.services.applyNativePatch=async request=>{resumed.push(request);if(resumed.length===1)throw Error('Native patch interrupted');};
 await assert.rejects(applyControl(combined.pool,input,combined.services),/interrupted/);
 assert.equal(combined.job().state,'apply');assert.equal(combined.job().payload.finalizing,true);
 assert.equal((await applyControl(combined.pool,input,combined.services)).state,'done');
 assert.deepEqual(resumed[0],resumed[1],'Partial native parameter update resumes the same journal identity');
 assert.equal(combined.counts().grids,1,'Finalization checkpoint does not reapply the grid after a native patch failure');
 const denied=fixture();await assert.rejects(applyControl(denied.pool,{...input,national:false},denied.services));assert.equal(denied.counts().releases,0);
 console.log('NAP qualification application: confirmed journal, scoped lock, conditional MyISAM effect, transactional progress, partial recovery, proof restart and idempotent final grid; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
