"use strict";
const fs=require("./helpers/source-files"),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require.resolve('../functions/index.js'),'utf8');
function endpoint(name){const start=source.indexOf(`exports.${name} =`),end=source.indexOf('\n});',start)+4;assert.ok(start>0&&end>start);return source.slice(start,end);}
async function main(){
  let reads=0,writes=0,national=false;
  const control={TEST_ADDRESS:'livepalmes@nap-ffessm.fr',read:async()=>{reads++;return {enabled:true,revision:1};},
    update:async(_db,input,actor)=>{assert.equal(actor.national,true);writes++;return {enabled:input.enabled,revision:2};},
    ...Object.fromEntries(['eventDecision','audienceAllowed'].map(name=>[name,require('../functions/engagement-mail-control')[name]]))};
  const sandbox={exports:{},CALLABLE_OPTIONS:{},ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS:{},onCall:(_options,handler)=>handler,
    HttpsError:class extends Error{constructor(code,message){super(message);this.code=code;}},
    ENVIRONMENT:{sportingDataSource:"nap",projectId:'livepalmes-test'},db:{},engagementAccessContext:async()=>({national,uid:'actor'}),writeAuditLog:async()=>{},
    require:name=>{assert.equal(name,'./engagement-mail-control');return control;}};
  for(const name of ['getEngagementAutomaticMailControl','updateEngagementAutomaticMailControl'])vm.runInNewContext(endpoint(name),sandbox);
  for(const name of Object.keys(sandbox.exports))await assert.rejects(()=>sandbox.exports[name]({data:{enabled:false,expectedRevision:1}}),error=>error.code==='permission-denied');
  assert.equal(reads,0);assert.equal(writes,0);
  national=true;
  assert.equal((await sandbox.exports.getEngagementAutomaticMailControl({})).testRecipient,'livepalmes@nap-ffessm.fr');
  assert.equal((await sandbox.exports.updateEngagementAutomaticMailControl({data:{enabled:false,expectedRevision:1}})).enabled,false);
  const calls=[],query={where:(key,operator,value)=>{assert.equal(key,'competitionId');assert.equal(operator,'==');assert.equal(value,'5162');return query;},orderBy:()=>query,
    limit:n=>{assert.equal(n,101);return query;},get:async()=>({size:1,docs:[{id:'mail',data:()=>({source:'nap',toEmail:'club@example.org',status:'sent',updatedAt:'2026-10-09T10:00:00.000Z'}),get:key=>'2026-10-09T10:00:00.000Z'}]}),
    count:()=>({get:async()=>({data:()=>({count:1})})})};
  Object.assign(sandbox,{cleanText:value=>String(value||''),FieldPath:{documentId:()=> '__name__'},ENGAGEMENT_MAIL_JOBS_COLLECTION:'engagementMailJobs',
    nativePortalCompetition:async(_id,authorize)=>{calls.push('NAP authorization');authorize({});},assertCanManageEngagementCompetition:()=>{},
    engagementMailJobItemFromData:(data,id)=>({...data,id}),db:{collection:name=>{calls.push(name);assert.equal(name,'engagementMailJobs');return query;}},
    require:name=>['./nap-direct-calendar','./nap-calendar-values'].includes(name)?require('../functions/nap-direct-calendar'):control});
  vm.runInNewContext(endpoint('listEngagementCompetitionMailJobs'),sandbox);
  const result=await sandbox.exports.listEngagementCompetitionMailJobs({data:{competitionId:'legacy-nap-5162'}});
  assert.equal(calls[0],'NAP authorization');assert.equal(result.jobs[0].toEmail,'livepalmes@nap-ffessm.fr');assert.equal(result.hasMore,false);
  const createdAt='2026-11-01T14:24:00.000Z',base={source:'nap',type:'opening_notification',createdAt,updatedAt:createdAt,
    deliveryMode:'bcc-v1',toEmail:'',recipients:[{email:'club@example.org',clubId:'106',recipientRegionId:'Ile de France'}],
    recipientCount:1,sentCount:1,failedCount:0,uncertainCount:0};
  let rows=[],setting={enabled:true,scope:'all',discardThrough:'',enabledSince:''};
  control.read=async()=>setting;
  control.decision=()=>{throw new Error('History must never validate an SMTP delivery');};
  query.get=async()=>({size:rows.length,docs:rows.map((data,index)=>({id:`mail-${index}`,data:()=>data,get:key=>data[key]}))});
  query.count=()=>({get:async()=>({data:()=>({count:rows.length})})});
  const list=()=>sandbox.exports.listEngagementCompetitionMailJobs({data:{competitionId:'5162'}});
  // Production used to throw for every group, even when it was already sent.
  // TEST's substituted individual address had hidden that incompatibility.
  for(const projectId of ['livepalmes','livepalmes-test']){
    sandbox.ENVIRONMENT.projectId=projectId;
    rows=['sent','partial','failed','uncertain','sending','cancelled','disabled','blocked_missing_config','cancelled_no_participants']
      .map(status=>({...base,status,reason:'historical-reason'}));
    const before=JSON.stringify(rows);
    for(const enabled of [true,false]){
      setting={enabled,scope:'idf',discardThrough:'2026-11-02T00:00:00.000Z',enabledSince:''};
      const history=await list();
      assert.deepEqual(Array.from(history.jobs,job=>job.status),rows.map(job=>job.status));
      assert.ok(history.jobs.every(job=>job.reason==='historical-reason'&&job.sentCount===1&&job.deliveryMode==='bcc-v1'));
      assert.equal(JSON.stringify(rows),before,'Listing cannot mutate stored jobs');
    }
  }
  sandbox.ENVIRONMENT.projectId='livepalmes';
  setting={enabled:true,scope:'idf',discardThrough:'',enabledSince:''};
  rows=[{...base,status:'ready'},
    {...base,status:'pending',recipients:[{email:'bpl@example.org',clubId:'107',recipientRegionId:'Bretagne-Pays de la Loire'}]},
    {...base,status:'ready',deliveryMode:'',toEmail:'club@example.org',clubId:'106',recipientRegionId:'Ile de France'}];
  assert.deepEqual(Array.from((await list()).jobs,job=>job.status),['ready','cancelled','ready']);
  assert.equal((await list()).jobs[1].reason,'automatic-mail-outside-pilot');
  setting={...setting,enabled:false};
  assert.ok((await list()).jobs.every(job=>job.status==='cancelled'&&job.reason==='automatic-mails-disabled'));
  assert.equal(writes,1,'Only the explicit setting update above writes; history remains read-only');
  console.log('Mail control callables: national authorization before reads/writes, TEST target and bounded NAP outbox listing verified.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
