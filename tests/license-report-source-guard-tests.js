"use strict";
const assert=require('node:assert/strict');
const {verify}=require('../tools/check-license-report-source');
const {hash}=require('../functions/nap-license-reports');
const reports=Array.from({length:10},(_,i)=>({season:'2026-2027',competitionId:String(5000+i),status:'ok',people:[{status:'valid'}],revision:'a'.repeat(64),fingerprint:'b'.repeat(64),completedAt:'2026-10-27T12:00:00Z',completedBy:'fixture',counts:{total:1,valid:1,expired:0,notFound:0,other:0}}));
function db(rows){return {collection:name=>{assert.equal(name,'engagementConfigurations');return {orderBy:key=>{assert.equal(key,'__name__');return {startAt:start=>{assert.equal(start,'license-control-');return {endBefore:end=>{assert.equal(end,'license-control.');return {limit:max=>{assert.equal(max,1001);return {get:async()=>({size:rows.length,docs:rows.map(r=>({id:`license-control-${r.season}-${r.competitionId}`,data:()=>r}))})};}};}};}};}};}};}
(async()=>{
 assert.deepEqual(await verify(db(reports),hash(reports)),{schema:1,sourceHash:hash(reports),count:10,readOnly:true});
 await assert.rejects(verify(db(reports),'0'.repeat(64)));
 await assert.rejects(verify(db(reports.slice(1)),hash(reports.slice(1))));
 await assert.rejects(verify(db([...reports,{...reports[0],competitionId:'6000'}]),hash(reports)));
 await assert.rejects(verify(db(reports.map((r,i)=>i? r : {...r,revision:'c'.repeat(64)})),hash(reports)));
 console.log('Licence source guard: bounded official read, changed/missing/additional reports refused, no write adapter.');
})().catch(e=>{console.error(e);process.exitCode=1;});
