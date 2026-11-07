"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('functions/index.js','utf8'),start=source.indexOf('exports.updateCompetitionImportRecordAlertDecision = onCall('),end=source.indexOf('  assertCapability(request, "competitions.import");',start);
function fixture(){const calls=[],exports={};const context={exports,COMPETITION_IMPORT_CALLABLE_OPTIONS:{native:true},onCall:(options,handler)=>{assert.equal(options.native,true);return handler;},portalSessionService:()=>({assertSession:async()=>calls.push('session')}),ENVIRONMENT:{sportingDataSource:'nap'},process:{env:{}},nativePerformanceFailure:error=>error,
 authorizeNativePerformance:request=>{calls.push('import-right');if(!request.auth)throw Error('no session');return {uid:'user'};},authorizeNapRecords:request=>{calls.push('records-right');if(!request.auth.manage)throw Error('no records rights');},
 require:name=>{if(name==='./nap-portal-pool')return {portalPool:()=>{calls.push('pool');return {};}};if(name==='./nap-import-record-review')return {action:async(pool,input,actor)=>{calls.push(input.action);assert.equal(actor.uid,'user');return {source:'nap'};}};throw Error(name);}};
 vm.runInNewContext(source.slice(start,end)+'});',context);return {calls,run:exports.updateCompetitionImportRecordAlertDecision};}
(async()=>{
 for(const action of ['read','detect','decision','draft']){const f=fixture();await f.run({auth:{manage:true},data:{action}});assert.equal(f.calls[0],'session');assert.ok(f.calls.indexOf('import-right')<f.calls.indexOf('pool'));if(['decision','draft'].includes(action))assert.ok(f.calls.indexOf('records-right')<f.calls.indexOf('pool'));}
 for(const action of ['decision','draft']){const f=fixture();await assert.rejects(f.run({auth:{manage:false},data:{action}}),/records rights/);assert.ok(!f.calls.includes('pool'));}
 const f=fixture();await assert.rejects(f.run({data:{action:'detect'}}),/session/);assert.ok(!f.calls.includes('pool'));
 console.log('Import Records callable: session/import right before SQL, records.manage required for decisions/drafts, native secret option; offline.');
})().catch(error=>{console.error(error);process.exitCode=1;});
