"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require.resolve('../functions/index.js'),'utf8');
function endpoint(name){const start=source.indexOf(`exports.${name} =`),end=source.indexOf('\n});',start)+4;assert.ok(start>0&&end>start);return source.slice(start,end);}
async function main(){
  let reads=0,writes=0,national=false;
  const control={TEST_ADDRESS:'livepalmes@nap-ffessm.fr',read:async()=>{reads++;return {enabled:true,revision:1};},
    update:async(_db,input,actor)=>{assert.equal(actor.national,true);writes++;return {enabled:input.enabled,revision:2};},decision:()=>({allowed:true})};
  const sandbox={exports:{},CALLABLE_OPTIONS:{},ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS:{},onCall:(_options,handler)=>handler,
    HttpsError:class extends Error{constructor(code,message){super(message);this.code=code;}},
    ENVIRONMENT:{projectId:'livepalmes-test'},db:{},engagementAccessContext:async()=>({national,uid:'actor'}),writeAuditLog:async()=>{},
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
    require:name=>name==='./nap-direct-calendar'?require('../functions/nap-direct-calendar'):control});
  vm.runInNewContext(endpoint('listEngagementCompetitionMailJobs'),sandbox);
  const result=await sandbox.exports.listEngagementCompetitionMailJobs({data:{competitionId:'legacy-nap-5162'}});
  assert.equal(calls[0],'NAP authorization');assert.equal(result.jobs[0].toEmail,'livepalmes@nap-ffessm.fr');assert.equal(result.hasMore,false);
  console.log('Mail control callables: national authorization before reads/writes, TEST target and bounded NAP outbox listing verified.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
