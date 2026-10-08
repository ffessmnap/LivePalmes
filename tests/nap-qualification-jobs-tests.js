"use strict";
const assert=require('node:assert/strict'),jobs=require('../functions/nap-qualification-jobs');
const input={jobId:'a'.repeat(64),competitionId:5162,national:true,actorUid:'national',state:'apply',cursor:'',confirmed:true,now:'2026-10-08 18:00:00.000000',payload:{applyStarted:true,confirmedBy:'national'}};
const row={id:input.jobId,competition_id:5162,actor_uid:'national',state:'ready',payload:{count:3},cursor:'106',version:'9007199254740993'};
async function main(){
 const stmt=jobs.transitionStatement(row,input);assert.match(stmt.sql,/AND state=\? AND version=\? AND BINARY cursor=BINARY \? LIMIT 1$/);assert.equal(stmt.values.at(-2),row.version);assert.equal(stmt.values.at(-1),'106');
 for(const patch of [{national:false},{confirmed:false},{competitionId:1},{cursor:'1'},{payload:{applyStarted:true,confirmedBy:'other'}}])assert.throws(()=>jobs.transitionStatement(row,{...input,...patch}));
 assert.throws(()=>jobs.transitionStatement({...row,state:'done',payload:{}},{...input,state:'preview'}));
 const started={...row,state:'apply',payload:input.payload};assert.throws(()=>jobs.transitionStatement(started,{...input,state:'cancelled'}));
 assert.throws(()=>jobs.transitionStatement(started,{...input,state:'preview',payload:{}}));
 assert.doesNotThrow(()=>jobs.transitionStatement(started,{...input,state:'preview'}),'Changed sporting proofs may restart the preview while retaining the application history');
 assert.throws(()=>jobs.payload({value:'x'.repeat(500001)}),RangeError);
 let queries=0;const connection={execute:async(statement,values)=>{queries++;assert.match(statement.sql,/WHERE id=\? LIMIT 1$/);assert.deepEqual(values,[input.jobId]);return [[{...row,payload:JSON.stringify(row.payload)}]];}};
 assert.deepEqual((await jobs.readJob(connection,input)).payload,row.payload);assert.equal(queries,1);
 await assert.rejects(jobs.readJob(connection,{...input,competitionId:1}));assert.equal(queries,2);
 const activeConnection={execute:async(statement,values)=>{assert.match(statement.sql,/FORCE INDEX \(competition_state\)/);assert.match(statement.sql,/LIMIT 2$/);assert.deepEqual(values,[5162]);return [[{id:input.jobId}]];}};
 assert.equal(await jobs.activeControl(activeConnection,5162),input.jobId);
 assert.equal(await jobs.activeControl({execute:async()=>[[]]},5162),'');
 await assert.rejects(jobs.activeControl({execute:async()=>[[{id:input.jobId},{id:'b'.repeat(64)}]]},5162),/ambigus/);
 await assert.rejects(jobs.activeControl({execute:async()=>[[{id:'invalid'}]]},5162),/ambigus/);
 console.log('NAP qualification jobs: indexed single-row read, preserved preview confirmation, guarded cursor/version, no cancellation after apply, bounded payload and sporting-proof restart; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
