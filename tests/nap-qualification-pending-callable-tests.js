"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
const start=source.indexOf("const nativeQualificationOptions="),end=source.indexOf("// Retired endpoints",start);
let legacyWrites=0,nativeWrites=0,national=true,pools=0;
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
const context={exports:{},ENVIRONMENT:{sportingDataSource:"nap",projectId:"livepalmes-test"},CALLABLE_OPTIONS:{},defineSecret:x=>x,onCall:(_,handler)=>handler,HttpsError,process:{env:{}},nativeQualificationServices:()=>({}),engagementAccessContext:async()=>({uid:'national',national}),engagementClubAccessContext:async()=>({uid:'club',clubId:'106'}),qualificationService:{process:()=>legacyWrites++,grantException:()=>legacyWrites++,acknowledgeAlert:()=>legacyWrites++},require:path=>path==='./nap-portal-swimmers'?{portalPool:()=>{pools++;return {getConnection:async()=>({release:()=>{},destroy:()=>{}})};}}:path==='./nap-qualification-callables'?{process:async()=>nativeWrites++}:path==='./nap-qualification-grant-change'?{grantException:async(pool,input)=>{assert.match(input.now,/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/);nativeWrites++;}}:path==='./nap-qualification-effects'?{acknowledge:async(c,input)=>{await input.authorize({clubId:'106'});nativeWrites++;}}:(()=>{throw Error('Unexpected source');})()};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
async function main(){
 national=false;await assert.rejects(context.exports.processEngagementQualificationJob({}),e=>e.code==='permission-denied');await assert.rejects(context.exports.grantEngagementQualificationException({}),e=>e.code==='permission-denied');assert.equal(pools,0);national=true;
 for(const handler of Object.values(context.exports))await handler({data:{competitionId:5162}});
 assert.equal(nativeWrites,3);assert.equal(legacyWrites,0,'TEST must not write old sporting Firebase collections');
 context.ENVIRONMENT.projectId='livepalmes';for(const handler of Object.values(context.exports))await handler({});assert.equal(legacyWrites,0);assert.equal(nativeWrites,6);
 const triggerStart=source.indexOf('exports.syncEngagementQualificationTargets ='),triggerEnd=source.indexOf('function engagementQualificationRowAllowed',triggerStart);
 context.onDocumentWritten=(_,handler)=>handler;context.REGION='europe-west1';context.ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION='cache';context.qualificationService.syncTargets=()=>legacyWrites++;context.qualificationService.revalidateCache=()=>legacyWrites++;
 vm.runInContext(source.slice(triggerStart,triggerEnd),context);
 context.ENVIRONMENT.projectId='livepalmes-test';await context.exports.syncEngagementQualificationTargets({});await context.exports.revalidateEngagementQualificationCache({});assert.equal(legacyWrites,0,'Retired sporting Firebase triggers must do nothing on TEST');
 context.ENVIRONMENT.projectId='livepalmes';await context.exports.syncEngagementQualificationTargets({});await context.exports.revalidateEngagementQualificationCache({});assert.equal(legacyWrites,0,'Retired sporting Firebase triggers must do nothing on PROD');
 console.log('Native qualification callables: authorization before NAP connection, native TEST routes and timestamps, old sporting Firebase excluded, PROD unchanged; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
