"use strict";
const assert=require('node:assert/strict');
const {applyGrid}=require('../functions/nap-qualification-grid-apply');
const {SPECS}=require('../functions/nap-portal-competition-change');
const schema=require('../functions/nap-approved-portal-schema');
const {plan}=require('../functions/nap-qualification-plan');
const {fingerprint}=require('../functions/nap-portal-workspaces');
const pack={event:{id:'legacy-nap-5162',competitionType:'pool'},nativeParameters:{qualif:29},nativeSnapshot:{competition:Object.fromEntries(SPECS.competitions.columns.map(c=>[c,c==='id'?5162:null])),parameters:Object.fromEntries(SPECS.compet_parametres.columns.map(c=>[c,c==='id'?4000:c==='compet'?5162:null]))},options:null,groups:[],standards:[],qualifyingCompetitions:[]};
const input={competitionId:5162,national:true,confirmed:true,actorUid:'national',now:'2026-10-08 19:00:00.000000',events:[{type:'individual',code:'50BI',categories:['S']}],rules:{enabled:true,groups:[{categories:['S'],mode:'each',startDate:'2025-01-01',endDate:'2026-12-31',pools:['50'],competitionMode:'selected',competitionIds:['5140']}],standards:{'S|F|50BI':null,'S|M|50BI':2500}}};
input.before=plan(pack,{...input,expectedFingerprint:fingerprint(pack)}).before;
function fixture(fail=false){
 let data=structuredClone(pack),backup,rollbacks=0,commits=0,writes=0;
 const names={livepalmes_competition_options:SPECS.livepalmes_competition_options.columns,livepalmes_qualification_groups:schema.tables[3].columns.map(c=>c.name).filter(c=>c!=='id'),livepalmes_qualification_standards:['competition_id','category','sex','event_code','minimum_centiseconds','version','created_at','updated_at','created_by','updated_by'],livepalmes_qualification_competitions:['group_id','qualifying_competition_id','version','created_at','updated_at','created_by','updated_by']};
 const keys={livepalmes_qualification_groups:'groups',livepalmes_qualification_standards:'standards',livepalmes_qualification_competitions:'qualifyingCompetitions'};
 const connection={beginTransaction:async()=>{backup=structuredClone(data);},commit:async()=>commits++,rollback:async()=>{data=backup;rollbacks++;},execute:async(statement,values)=>{
  const sql=statement.sql;
  if(sql.startsWith('SELECT * FROM'))return [[].concat(data.options||[])];
  if(sql.startsWith('SELECT id'))return [data.groups.map(row=>({id:row.id,position:row.position}))];
  assert.match(sql,/^(INSERT INTO|DELETE FROM) [`]*livepalmes_/,'Only additive qualification tables may be written');writes++;
  const table=sql.match(/(?:INTO|FROM) [`]*([a-z_]+)/)[1];
  if(sql.startsWith('DELETE')){data[keys[table]]=[];return [{affectedRows:0}];}
  const columns=names[table],chunks=table==='livepalmes_competition_options'?[values.slice(0,columns.length)]:Array.from({length:values.length/columns.length},(_,i)=>values.slice(i*columns.length,(i+1)*columns.length));
  const rows=chunks.map((values,i)=>({...Object.fromEntries(columns.map((name,j)=>[name,values[j]])),...(table==='livepalmes_qualification_groups'?{id:700+i}:{})}));
  if(table==='livepalmes_competition_options')data.options=rows[0];else data[keys[table]]=rows;
  return [{affectedRows:rows.length}];
 }};
 const services={authorize:()=>{},readCompetition:async()=>fail?{...data,nativeSnapshot:{changed:true}}:data};
 return {connection,services,data:()=>data,counts:()=>({rollbacks,commits,writes})};
}
async function main(){
 const ok=fixture();assert.equal((await applyGrid(ok.connection,input,pack,ok.services)).verified,true);assert.equal(ok.data().groups[0].id,700);assert.equal(ok.data().qualifyingCompetitions[0].group_id,700,'Use allocated native ids, never infer auto-increment sequences');assert.equal(ok.data().standards[0].minimum_centiseconds,null);assert.equal(ok.counts().commits,1);
 assert.equal((await applyGrid(ok.connection,input,ok.data(),ok.services)).unchanged,true,'A lost completion response can be verified without rewriting the grid');
 const bad=fixture(true);await assert.rejects(applyGrid(bad.connection,input,pack,bad.services));assert.equal(bad.counts().rollbacks,1);assert.deepEqual(bad.data(),pack,'Failed final verification rolls back every supplemental row');
 const denied=fixture();await assert.rejects(applyGrid(denied.connection,{...input,confirmed:false},pack,denied.services),TypeError);assert.equal(denied.counts().writes,0);
 console.log('NAP qualification grid: atomic supplemental replacement, allocated group ids, null minima preserved, failed-scope rollback, explicit national confirmation and idempotent completion; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
