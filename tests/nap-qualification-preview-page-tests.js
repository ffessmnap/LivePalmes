"use strict";
const assert=require('node:assert/strict');
const {previewPage}=require('../functions/nap-qualification-preview-page');
const input={competitionId:5162,national:true,cursor:'',date:'2026-11-07',events:[{code:'50BI',type:'individual',categories:['S']}],rules:{enabled:true,groups:[{categories:['S'],mode:'each',startDate:'2025-01-01',endDate:'2026-12-31',pools:['50'],competitionMode:'all'}],standards:{'S|F|50BI':2500,'S|M|50BI':2500}}};
const swimmer={inscription_id:100,id:912,nom:'Test',prenom:'Nageur',date:'1990-01-01',sexe:'M',club:'00106'};
function fixture({enrolled=[swimmer],approved=[],qualified=false}={}){
 let queries=0,historyQueries=0,authorized=false;
 const connection={execute:async(statement,values)=>{assert.equal(authorized,true);queries++;assert.match(statement.sql,/^SELECT/);
  if(statement.sql.includes('FROM nageursengager')){assert.match(statement.sql,/LIMIT 6$/);assert.deepEqual(values,[5162,0,0,0]);return [enrolled];}
  if(statement.sql.includes('FROM engagements '))return [[{id:44,engagement:100,course:'50BI',tps:'002400'}]];
  if(statement.sql.includes('FROM livepalmes_qualification_grants'))return [approved];
  throw new Error('Unexpected query');
 }};
 const services={authorize:async()=>{authorized=true;},categoryFor:()=> 'S',readHistory:async(connection,people)=>{historyQueries++;return new Map(people.map(p=>[p.id,qualified?[{competitionId:'5140',course:'50BI',timeValue:2400,date:'2026-01-01',pool:'50',chrono:'E'}]:[]]));}};
 return {connection,services,counts:()=>({queries,historyQueries})};
}
async function main(){
 const absent=fixture();const result=await previewPage(absent.connection,input,absent.services);assert.equal(result.items[0].removed.length,1);assert.equal(result.items[0].removed[0].nativeId,44);assert.equal(result.items[0].removed[0].nativeTime,'002400');assert.equal(result.finished,true);assert.deepEqual(absent.counts(),{queries:3,historyQueries:1});
 const known=fixture({qualified:true});assert.equal((await previewPage(known.connection,input,known.services)).items[0].entries.length,1);
 const grant={competition_id:5162,swimmer_id:912,club_id:'00106',event_code:'50BI',status:'accepted',version:'1'};
 const approved=fixture({approved:[grant]});assert.equal((await previewPage(approved.connection,input,approved.services)).items[0].entries.length,1);
 const wrong=fixture({approved:[{...grant,club_id:'106'}]});await assert.rejects(previewPage(wrong.connection,input,wrong.services),TypeError);
 const duplicate=fixture({enrolled:[swimmer,swimmer]});await assert.rejects(previewPage(duplicate.connection,input,duplicate.services),TypeError);assert.equal(duplicate.counts().historyQueries,0);
 const page=fixture({enrolled:Array.from({length:6},(_,i)=>({...swimmer,id:912+i,inscription_id:100+i}))});const next=await previewPage(page.connection,input,page.services);assert.equal(next.items.length,5);assert.equal(next.finished,false);assert.deepEqual(JSON.parse(next.cursor),{swimmerId:916,inscriptionId:104});assert.equal(page.counts().historyQueries,1,'Six candidate swimmers still cause only one grouped history query');
 const empty=fixture({enrolled:[]});assert.equal((await previewPage(empty.connection,input,empty.services)).items.length,0);assert.deepEqual(empty.counts(),{queries:1,historyQueries:0});
 const denied=fixture();await assert.rejects(previewPage(denied.connection,{...input,national:false},denied.services),TypeError);assert.equal(denied.counts().queries,0);
 console.log('NAP qualification preview page: five swimmers, grouped native proofs, exact scoped exceptions, existing sporting reconciliation, stable native ids/times, pagination and zero writes; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
