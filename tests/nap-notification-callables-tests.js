"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('functions/index.js','utf8');
const start=source.indexOf('exports.processNapCompetitionNotifications ='),end=source.indexOf('\n});',start)+4;
assert.ok(start>0&&end>start);
const code=source.slice(start,end);
async function run(){
  const calls=[];
  const automation={COLLECTION:'engagementClosureQueue',currentEvent:()=>true,processEvent:async()=>{calls.push('process');return {done:true,jobCount:1,attachmentCount:1};},adoptOpenCompetitions:async(_db,input)=>{calls.push('adopt');assert.equal(input.season,2027);return {openingCount:0};}};
  let national=true,allowed=true;
  const sandbox={exports:{},ENVIRONMENT:{projectId:'livepalmes-test'},ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS:{},onCall:(_options,handler)=>handler,
    HttpsError:class extends Error{constructor(code,message){super(message);this.code=code;}},
    engagementAccessContext:async()=>({national}),assertCanManageEngagementCompetition:()=>{if(!allowed)throw Error('denied');},
    nativePortalCompetition:async(id,authorize)=>{calls.push('competition');await authorize({id});},
    nativeNotificationAutomationServices:()=>({simulation:true}),require:name=>{
      if(name==='./nap-notification-automation')return automation;
      if(name==='./nap-direct-calendar')return require('../functions/nap-direct-calendar');
      throw Error('Unexpected dependency '+name);
    },db:{collection:name=>{calls.push(name);assert.equal(name,'engagementClosureQueue');return {where:(key,_op,value)=>{
      assert.equal(key,'competitionId');assert.equal(value,'5162');return {limit:maximum=>{assert.equal(maximum,101);return {get:async()=>({size:1,docs:[{id:'event',ref:{},data:()=>({source:'nap',kind:'opening',runAt:'2000-01-01T00:00:00.000Z',status:'pending'})}]})};}};
    }}}}};
  vm.runInNewContext(code,sandbox);
  await sandbox.exports.processNapCompetitionNotifications({data:{action:'process',competitionId:'legacy-nap-5162'}});
  assert.deepEqual(calls,['competition','engagementClosureQueue','process']);
  calls.length=0;allowed=false;
  await assert.rejects(sandbox.exports.processNapCompetitionNotifications({data:{action:'process',competitionId:'5162'}}));
  assert.deepEqual(calls,['competition'],'scope precedes technical queue');
  calls.length=0;national=false;
  await assert.rejects(sandbox.exports.processNapCompetitionNotifications({data:{action:'adopt-open-season',season:2027}}),error=>error.code==='permission-denied');
  assert.deepEqual(calls,[]);
  national=true;
  const adopted=await sandbox.exports.processNapCompetitionNotifications({data:{action:'adopt-open-season',season:2027}});
  assert.equal(adopted.openingCount,0);assert.deepEqual(calls,['adopt']);
  calls.length=0;sandbox.ENVIRONMENT.projectId='livepalmes';
  await assert.rejects(sandbox.exports.processNapCompetitionNotifications({data:{action:'process'}}),error=>error.code==='failed-precondition');
  assert.deepEqual(calls,[],'PROD cannot execute TEST simulation');
  const schedulerStart=source.indexOf('const ENGAGEMENT_CLOSURE_SCHEDULER_OPTIONS ='),schedulerEnd=source.indexOf('\n};',schedulerStart)+3;
  for(const projectId of ['livepalmes-test','livepalmes']){
    const options={ENVIRONMENT:{projectId},REGION:'europe-west1',defineSecret:name=>name,ENGAGEMENT_NOTIFICATION_MAIL_SECRETS:['smtp']};
    vm.runInNewContext(source.slice(schedulerStart,schedulerEnd)+'\nthis.options=ENGAGEMENT_CLOSURE_SCHEDULER_OPTIONS;',options);
    assert.deepEqual(Array.from(options.options.secrets),projectId==='livepalmes-test'?['LIVEPALMES_NAP_PASSWORD']:['smtp']);
  }
  assert.match(source.slice(source.indexOf('exports.closeDueEngagementCompetitions ='),source.indexOf('exports.saveEngagementClubTeamLeader =')),/if\(ENVIRONMENT.projectId==='livepalmes-test'\)[\s\S]*return null;[\s\S]*engagementCompetitions/);
  let armed=0;
  const armSandbox={nativePortalCompetition:async(_id,authorize)=>{authorize({});return {id:'legacy-nap-5162',entryStatus:'open',entryDeadlineAt:'2026-11-06T18:00:00.000Z'};},
    assertCanManageEngagementCompetition:()=>{},db:{collection:name=>{assert.equal(name,'auditLogs');return {doc:()=>({get:async()=>({exists:true,data:()=>({target:{notificationOpeningRequested:true}})})})};}},
    require:name=>name==='./nap-direct-calendar'?require('../functions/nap-direct-calendar'):{arm:async(_db,input)=>{armed++;assert.equal(input.competitionId,'5162');assert.equal(input.openingRequested,true,'saved choice wins over later retry payload');}}};
  vm.runInNewContext(source.slice(source.indexOf('async function armNativeCompetitionNotification('),source.indexOf('async function queueNativeDocumentNotification(')),armSandbox);
  await armSandbox.armNativeCompetitionNotification({uid:'admin'},{competitionId:'legacy-nap-5162',patch:{name:'renamed'}},'operation');
  assert.equal(armed,0);
  await armSandbox.armNativeCompetitionNotification({uid:'admin'},{competitionId:'legacy-nap-5162',patch:{entryDeadlineLocal:'2026-11-06 19:00:00'}},'operation');
  assert.equal(armed,1,'Paris local deadline edits rearm the closure');
  console.log('NAP notification callable: scope first, bounded technical queue, national adoption, TEST-only processing and no SMTP secrets passed.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
