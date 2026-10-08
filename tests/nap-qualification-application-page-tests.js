"use strict";
const assert=require('node:assert/strict');
const {previewPage}=require('../functions/nap-qualification-preview-page');
const {applicationPage}=require('../functions/nap-qualification-application-page');
const id='a'.repeat(64),rules={enabled:true,groups:[{categories:['S'],mode:'each',startDate:'2025-01-01',endDate:'2026-12-31',pools:['50'],competitionMode:'all'}],standards:{'S|M|50BI':2500,'S|F|50BI':2500}};
const input={competitionId:5162,national:true,actorUid:'national',jobId:id,confirmed:true,cursor:'',date:'2026-11-07',events:[{code:'50BI',type:'individual',categories:['S']}],rules,competition:{qualifications:rules}};
const identity={inscription_id:100,id:912,nom:'Test',prenom:'Nageur',date:'1990-01-01',sexe:'M',club:'00106'};
async function main(){
 let queries=0,historyQueries=0,courses=[{id:44,engagement:100,course:'50BI',tps:'002600'}],known=true,authorized=false;
 const connection={execute:async statement=>{assert.equal(authorized,true);queries++;assert.match(statement.sql,/^SELECT/);if(statement.sql.includes('FROM nageursengager'))return [[identity]];if(statement.sql.includes('FROM engagements '))return [courses];if(statement.sql.includes('FROM livepalmes_qualification_grants'))return [[]];throw Error('Unexpected query');}};
 const services={authorize:()=>{authorized=true;},categoryFor:()=> 'S',automatic:()=>({entryTimeMode:'known',entryTimeValue:2400}),readHistory:async()=>{historyQueries++;return new Map([['912',known?[{competitionId:'5140',course:'50BI',timeValue:2400,date:'2026-01-01',pool:'50',chrono:'E'}]:[]]]);}};
 const preview=await previewPage(connection,input,services),saved={parentId:id,previousCursor:'',nextCursor:preview.cursor,finished:preview.finished,items:preview.items};
 const application={...input,previous:{id,competition_id:5162,state:'apply',version:'3',cursor:'',payload:{rules,applyStarted:true,count:0,pageIds:[],generation:0}}};
 queries=0;historyQueries=0;let result=await applicationPage(connection,application,saved,services);assert.equal(result.writes.length,1);assert.equal(result.writes[0].tps,'002400');assert.equal(queries,3);assert.equal(historyQueries,1);
 courses=[{...courses[0],tps:'002400'}];result=await applicationPage(connection,application,saved,services);assert.equal(result.writes.length,0);assert.equal(result.applied,1,'Reread recognizes already applied time while evaluating the original saved course');
 known=false;assert.equal((await applicationPage(connection,application,saved,services)).restart,true);
 known=true;courses=[];await assert.rejects(applicationPage(connection,application,saved,services),/disparu/);
 const oldQueries=queries;await assert.rejects(applicationPage(connection,{...application,national:false},saved,services));assert.equal(queries,oldQueries);
 console.log('NAP qualification application page: grouped fresh NAP proofs, original-course evaluation, partial-time recovery and no writes; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
