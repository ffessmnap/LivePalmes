"use strict";
const assert=require('node:assert/strict');
const {grantException}=require('../functions/nap-qualification-grant-change');
const {SPECS}=require('../functions/nap-portal-competition-change');
const rules={enabled:true,groups:[{categories:['S'],mode:'each',startDate:'2025-01-01',endDate:'2026-12-31',pools:['50'],competitionMode:'all'}],standards:{'S|M|50BI':2500,'S|F|50BI':2500}};
const input={national:true,confirmed:true,competitionId:5162,swimmerId:912,clubId:'00106',eventCode:'50BI',actorUid:'national',now:'2026-10-08 20:00:00.000000'};
const pack={event:{id:'legacy-nap-5162',date:'2026-11-07'},nativeParameters:{qualif:29},options:{version:'1'},nativeSnapshot:{competition:Object.fromEntries(SPECS.competitions.columns.map(c=>[c,c==='id'?5162:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(c=>[c,c==='id'?4000:c==='compet'?5162:null]))}};
function fixture({stale=false,wrongClub=false,active=false,previous=[]}={}){
 let writes=0,releases=0,reads=0,approved=structuredClone(previous);
 const connection={release:()=>releases++,destroy:()=>releases++,execute:async(statement,values)=>{
  const sql=statement.sql;if(sql.includes('GET_LOCK'))return [[{acquired:1}]];if(sql.includes('RELEASE_LOCK'))return [[{released:1}]];
  if(sql.startsWith('SELECT')&&sql.includes('FROM livepalmes_qualification_jobs'))return [active?[{id:'a'.repeat(64)}]:[]];
  if(sql.startsWith('SELECT')&&sql.includes('FROM livepalmes_qualification_grants'))return [approved];
  if(sql.startsWith('INSERT')){assert.match(sql,/SELECT .* FROM DUAL WHERE/);assert.match(sql,/scope_j.state IN/);assert.match(sql,/scope_o.version/);assert.equal((sql.match(/\?/g)||[]).length,values.length);writes++;approved=[{competition_id:5162,swimmer_id:912,event_code:'50BI',club_id:'00106',status:'accepted',reason:values[4],approved_by:values[5],approved_at:values[6],version:'1'}];return [{affectedRows:1}];}
  throw Error('Unexpected query');
 }};
 const services={authorize:()=>{},assertOpen:()=>{},eventsFor:()=>[{type:'individual',code:'50BI',categories:['S']}],categoryFor:()=> 'S',competitionFor:()=>({date:'2026-11-07',qualifications:rules,entryDeadlineAt:'2026-11-06T22:59:00.000Z'}),readCompetition:async()=>{reads++;return stale&&reads>1?{...pack,event:{...pack.event,name:'changed'}}:pack;},readEntry:async()=>({swimmers:[{id:'912',clubId:wrongClub?'106':'00106',birthDate:'1990-01-01',sex:'M'}],inscriptions:[{id:100,nageur:912}],individual:[]}),readHistory:async()=>new Map([['912',[]]])};
 return {pool:{getConnection:async()=>connection},services,counts:()=>({writes,releases})};
}
async function main(){
 const ok=fixture();const result=await grantException(ok.pool,input,ok.services);assert.equal(result.qualification.approved,true);assert.equal(result.exception.approvedBy,'national');assert.equal(ok.counts().writes,1);assert.equal(ok.counts().releases,1);
 const accepted={competition_id:5162,swimmer_id:912,event_code:'50BI',club_id:'00106',status:'accepted',reason:'original',approved_by:'first-admin',approved_at:'2026-10-01 20:00:00.000000',version:'1'};
 const resumed=fixture({previous:[accepted]});assert.equal((await grantException(resumed.pool,input,resumed.services)).exception.approvedBy,'first-admin');assert.equal(resumed.counts().writes,0);
 for(const options of [{stale:true},{wrongClub:true},{active:true},{previous:[{...accepted,club_id:'106'}]}]){const bad=fixture(options);await assert.rejects(grantException(bad.pool,input,bad.services));assert.equal(bad.counts().writes,0);}
 const denied=fixture();await assert.rejects(grantException(denied.pool,{...input,national:false},denied.services));assert.equal(denied.counts().releases,0);
 console.log('NAP national exceptions: native sporting evaluation, real club/enrolment scope, active-job refusal, unchanged accepted grant, conditional NAP insertion and stale-rule rejection; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
