"use strict";
const assert=require('node:assert/strict');
const dispatch=require('../functions/nap-qualification-callables').process;
const input={national:true,actorUid:'national',competitionId:5162,jobId:'a'.repeat(64)};
async function main(){
 let connections=0,releases=0,calls=[];const connection={release:()=>releases++},pool={getConnection:async()=>{connections++;return connection;}};
 const services={readJob:async(c,i)=>{assert.equal(i.competitionId,5162);return {state:'apply'};},applyControl:async(p,i)=>{assert.equal(p,pool);assert.equal(i.competitionId,5162);calls.push(i.action);return {state:'apply'};},processPreview:async(p,i)=>{assert.equal(i.competitionId,5162);calls.push(i.action);return {state:'preview'};},reviewControl:async(c,i)=>{assert.equal(c,connection);assert.equal(i.competitionId,5162);assert.equal(i.confirmed,i.action==='confirm');calls.push(i.action);return {state:'ready'};}};
 await dispatch(pool,input,services);await dispatch(pool,{...input,action:'preview'},services);await dispatch(pool,{...input,action:'cancel'},services);await dispatch(pool,{...input,action:'confirm'},services);await dispatch(pool,{...input,action:'details'},services);
 assert.deepEqual(calls,['apply','preview','cancel','confirm','details']);assert.equal(connections,3);assert.equal(releases,3);
 for(const action of [undefined,'preview','cancel','confirm','details'])await dispatch(pool,{...input,competitionId:'legacy-nap-5162',...(action?{action}:{})},services);
 assert.deepEqual(calls.slice(5),['apply','preview','cancel','confirm','details']);assert.equal(connections,6);assert.equal(releases,6,'Portal ids preserve the same bounded dispatch');
 const count=connections;await assert.rejects(dispatch(pool,{...input,national:false},services));await assert.rejects(dispatch(pool,{...input,action:'invented'},services));assert.equal(connections,count);
 console.log('Native qualification dispatch: resume current phase, explicit confirmation, bounded scope and released connections; offline.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
