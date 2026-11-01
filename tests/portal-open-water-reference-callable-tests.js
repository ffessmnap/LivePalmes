"use strict";
const assert=require('node:assert/strict');
const {createCompetitionHandlers}=require('../functions/portal-competition-handlers');
const library=require('../functions/nap-open-water-library');
const swimmers=require('../functions/nap-portal-pool');
const native=require('../functions/nap-open-water-reference-addition');
const cryptoBackup=require('../functions/nap-open-water-reference-backup');
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
const saved={pool:swimmers.portalPool,read:library.readStored,change:library.change,ensure:native.ensureDistanceReferences,backup:cryptoBackup.backupVerified};
const course=(distance,discipline='SF')=>({id:`${distance===150?'150-elimination':distance}-${discipline}`,distance,discipline,label:`${distance} ${discipline}`,format:distance===150?'elimination':'standard',active:true});
async function run(){try{
 const trace=[];let profile={uid:'regional',region:true,regionId:'7'},initialCourses=[],created=4,nativeFailure=false,libraryFailure=false;
 const pool={},db={};
 swimmers.portalPool=()=>pool;
 library.readStored=async candidate=>{assert.equal(candidate,pool);trace.push('preflight');return library.snapshot({id:1,version:1,courses:initialCourses});};
 native.ensureDistanceReferences=async(candidate,input,backup)=>{assert.equal(candidate,pool);assert.equal(input.actorUid,profile.uid);trace.push('native');if(nativeFailure){const error=Error('partial native');error.nativeReferencesCreated=2;throw error;}if(created)await backup({distance:input.distance});return {created};};
 cryptoBackup.backupVerified=async(candidate,actor,payload)=>{assert.equal(candidate,db);assert.equal(actor,profile.uid);assert.equal(payload.distance,1200);trace.push('verified-backup');return {verified:true};};
 library.change=async(candidate,input,actor)=>{assert.equal(candidate,pool);assert.equal(actor,profile.uid);trace.push('library');if(libraryFailure)throw Error('library unavailable');assert.equal(input.action,'addDistance');assert.equal(input.expectedFingerprint,library.snapshot({id:1,version:1,courses:initialCourses}).fingerprint);return {ok:true,courses:input.courses};};
 const context={HttpsError,ENVIRONMENT:{sportingDataSource:'nap'},engagementAccessContext:async()=>profile,cleanEngagementOpenWaterCourse:input=>course(input.distance,input.discipline),db,writeAuditLog:async()=>{throw Error('unexpected direct audit');}};
 const call=createCompetitionHandlers(context).addEngagementOpenWaterCourse;
 let response=await call({data:{distance:1200}});assert.equal(response.nativeReferencesReady,true);assert.equal(response.nativeReferencesCreated,4);assert.equal(response.courses.length,3);assert.deepEqual(trace,['preflight','native','verified-backup','library']);
 for(const denied of [{uid:'club'},{uid:'region',region:true,regionId:''}]){profile=denied;trace.length=0;await assert.rejects(call({data:{distance:1200}}),error=>error.code==='permission-denied');assert.deepEqual(trace,[]);}
 profile={uid:'national',national:true};trace.length=0;created=0;response=await call({data:{distance:2000}});assert.equal(response.nativeReferencesCreated,0);assert.deepEqual(trace,['preflight','native','library']);
 for(const distance of [0,-1,2.5,100001,'bad']){trace.length=0;await assert.rejects(call({data:{distance}}),error=>error.code==='invalid-argument');assert.deepEqual(trace,[]);}
 initialCourses=Array.from({length:100},(_,index)=>course(index+2000));trace.length=0;await assert.rejects(call({data:{distance:1200}}),error=>error.code==='resource-exhausted');assert.deepEqual(trace,['preflight'],'Library capacity is checked before any native registration');
 initialCourses=[];created=4;libraryFailure=true;trace.length=0;await assert.rejects(call({data:{distance:1200}}),error=>error.code==='unavailable'&&/4 référence/.test(error.message)&&/aucun engagement/.test(error.message));assert.deepEqual(trace,['preflight','native','verified-backup','library']);
 libraryFailure=false;created=0;response=await call({data:{distance:1200}});assert.equal(response.nativeReferencesReady,true);assert.equal(response.nativeReferencesCreated,0);
 nativeFailure=true;trace.length=0;await assert.rejects(call({data:{distance:1200}}),error=>/2 référence/.test(error.message));assert.deepEqual(trace,['preflight','native']);
 console.log('Callable distance eau libre : autorité existante, prévalidation avant écriture, sauvegarde raccordée, associations complètes et reprise explicite vérifiées hors réseau.');
}finally{swimmers.portalPool=saved.pool;library.readStored=saved.read;library.change=saved.change;native.ensureDistanceReferences=saved.ensure;cryptoBackup.backupVerified=saved.backup;}}
run().catch(error=>{console.error(error);process.exitCode=1;});
