"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('functions/index.js','utf8');
const start=source.indexOf('exports.deleteCompetitionImport = onCall('),end=source.indexOf('  assertCapability(request, "competitions.import");',start);
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
function fixture(national=true){
 const calls=[],exports={},context={exports,COMPETITION_IMPORT_CALLABLE_OPTIONS:{secret:'native'},onCall:(options,handler)=>{assert.equal(options.secret,'native');return handler;},portalSessionService:()=>({assertSession:async()=>calls.push('session')}),ENVIRONMENT:{sportingDataSource:'nap'},authorizeNativePerformance:request=>{calls.push('auth');if(!request.auth)throw new HttpsError('unauthenticated','denied');return {uid:'user',national};},HttpsError,process:{env:{}},nativePerformanceFailure:error=>error,
 require:name=>{if(name==='./nap-import-deletion')return {createNativeResultDeletion:options=>async request=>{await options.authorize(request);await options.getPool();calls.push(request.data.action);return {source:'nap',deleted:request.data.action==='delete'};}};if(name==='./nap-portal-pool')return {portalPool:()=>{calls.push('pool');return {};}};throw Error(name);}};
 vm.runInNewContext(source.slice(start,end)+'});',context);return {calls,run:request=>exports.deleteCompetitionImport(request)};
}
(async()=>{
 for(const action of ['preview','delete']){const f=fixture();assert.equal((await f.run({auth:{uid:'national'},data:{action}})).source,'nap');assert.deepEqual(f.calls.slice(0,2),['session','auth']);assert.ok(f.calls.indexOf('auth')<f.calls.indexOf('pool'));}
 let f=fixture(false);await assert.rejects(f.run({auth:{uid:'regional'},data:{action:'delete'}}),e=>e.code==='permission-denied');assert.ok(!f.calls.includes('pool'));
 f=fixture();await assert.rejects(f.run({data:{action:'delete'}}),e=>e.code==='unauthenticated');assert.ok(!f.calls.includes('pool'));
 console.log('Native deletion callable: session then national authority, NAP secret options and no pool for unauthenticated/regional users; no real data.');
})().catch(error=>{console.error(error);process.exitCode=1;});
