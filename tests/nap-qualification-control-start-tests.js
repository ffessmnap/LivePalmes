"use strict";
const assert=require('node:assert/strict');
const {beginControl}=require('../functions/nap-qualification-control-start');
const {fingerprint}=require('../functions/nap-portal-workspaces');
const {SPECS}=require('../functions/nap-portal-competition-change');
const competition=Object.fromEntries(SPECS.competitions.columns.map(name=>[name,name==='id'?5162:null]));
const parameters=Object.fromEntries(SPECS.compet_parametres.columns.map(name=>[name,name==='id'?4000:name==='compet'?5162:null]));
const pack={event:{id:'legacy-nap-5162',competitionType:'pool'},nativeParameters:{parameter_id:4000,qualif:29},nativeSnapshot:{competition,parameters},options:null,groups:[],standards:[],qualifyingCompetitions:[]};
const input={competitionId:5162,actorUid:'national',national:true,expectedFingerprint:fingerprint(pack),events:[{code:'50BI',type:'individual',categories:['S']}],rules:{enabled:true,groups:[{categories:['S'],mode:'each',startDate:'2025-01-01',endDate:'2026-12-31',pools:['50'],competitionMode:'all'}],standards:{'S|F|50BI':null,'S|M|50BI':2500}}};
function fixture({busy=false,lock=1,affected=1}={}){
 let stored=null,writes=0,released=0,scopeChecks=0;
 const connection={execute:async(statement,values)=>{
  const sql=statement.sql;
  if(sql.startsWith('SELECT GET_LOCK'))return [[{acquired:lock}]];
  if(sql.startsWith('SELECT RELEASE_LOCK'))return [[{released:1}]];
  if(sql.startsWith('SELECT id,competition_id'))return [stored?[stored]:[]];
  if(sql.startsWith('SELECT id FROM')){assert.match(sql,/FORCE INDEX \(competition_state\).*LIMIT 2$/);return [busy?[{id:'other'}]:[]];}
  if(sql.startsWith('INSERT')){
   writes++;assert.match(sql,/INSERT INTO livepalmes_qualification_jobs/);assert.match(sql,/NOT EXISTS.*livepalmes_competition_options/);assert.match(sql,/qualif <=> \?/);assert.doesNotMatch(sql,/UPDATE|DELETE|REPLACE/);
   if(affected===1)stored={id:values[0],competition_id:values[1],actor_uid:values[2],payload:values[3],state:'preview',cursor:'',version:'1'};
   return [{affectedRows:affected}];
  }
  throw new Error('Unexpected SQL');
 },release:()=>released++,destroy:()=>released++};
 const services={authorize:()=>scopeChecks++,readCompetition:async(c,id,authorize)=>{assert.equal(id,5162);await authorize(pack.event);return pack;}};
 return {pool:{getConnection:async()=>connection},services,counts:()=>({writes,released,scopeChecks})};
}
async function main(){
 const ok=fixture(),result=await beginControl(ok.pool,input,ok.services);assert.equal(result.state,'preview');assert.equal(result.resumed,false);assert.equal(ok.counts().writes,1);
 const again=await beginControl(ok.pool,input,ok.services);assert.equal(again.qualificationJobId,result.qualificationJobId);assert.equal(again.resumed,true);assert.equal(ok.counts().writes,1,'Same request resumes the saved native preview without duplicating it');
 for(const options of [{busy:true},{lock:0},{affected:0}]){const failed=fixture(options);await assert.rejects(beginControl(failed.pool,input,failed.services),TypeError);assert.equal(failed.counts().released,1);assert.equal(failed.counts().writes,options.affected===0?1:0);}
 const stale=fixture();await assert.rejects(beginControl(stale.pool,{...input,expectedFingerprint:'stale'},stale.services),TypeError);assert.equal(stale.counts().writes,0);
 const unchanged=fixture();assert.equal((await beginControl(unchanged.pool,{...input,rules:{enabled:false}},unchanged.services)).unchanged,true);assert.equal(unchanged.counts().writes,0);
 const denied=fixture();await assert.rejects(beginControl(denied.pool,{...input,national:false},denied.services),TypeError);assert.equal(denied.counts().scopeChecks,0);
 console.log('NAP qualification preview start: native saved plan, unchanged grid/entries, national authorization, stale scope refusal, active-job lock and idempotent resume; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
