"use strict";
const assert=require('node:assert/strict');
const {readEvaluations}=require('../functions/nap-qualification-people');
const input={pack:{event:{id:'legacy-nap-5162',date:'2026-11-07'},nativeParameters:{qualif:29},options:null},people:[{id:912,clubId:'00106',birthDate:'1990-01-01',sex:'M'},{id:913,clubId:'00106',birthDate:'1990-01-01',sex:'F'}],histories:new Map([['912',[]],['913',[]]]),events:[],categoryFor:()=> 'S'};
async function main(){
 let calls=0,rows=[];const connection={execute:async(statement,values)=>{calls++;assert.match(statement.sql,/FORCE INDEX \(PRIMARY\).*LIMIT 129$/);assert.deepEqual(values,[5162,912,913]);return [rows];}};
 const result=await readEvaluations(connection,input);assert.equal(calls,1);assert.equal(result.size,2);assert.equal(result.get('912').enabled,false);
 rows=[{competition_id:5162,swimmer_id:912,event_code:'50BI',club_id:'106',status:'accepted',version:1}];
 await assert.rejects(readEvaluations(connection,input),/perimetre/);
 rows=[{competition_id:5162,swimmer_id:999,event_code:'50BI',club_id:'00106',status:'accepted',version:1}];await assert.rejects(readEvaluations(connection,input),/selection/);
 const count=calls;await assert.rejects(readEvaluations(connection,{...input,people:[input.people[0],input.people[0]]}));assert.equal(calls,count);
 assert.equal((await readEvaluations(connection,{...input,people:[]})).size,0);assert.equal(calls,count);
 console.log('Grouped qualification people: one primary-key exception query, exact raw club scope, no duplicate/foreign swimmer and empty selection without reads; offline.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
