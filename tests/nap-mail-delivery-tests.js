"use strict";
const assert=require('node:assert/strict'),delivery=require('../functions/nap-mail-delivery');
async function main(){
  const store=new Map(),references=new Map();
  const ref=path=>{if(!references.has(path))references.set(path,{id:path.split('/').at(-1),path});return references.get(path);};
  const snapshot=reference=>({data:()=>store.get(reference.path)});
  const db={collection:name=>({doc:id=>ref(`${name}/${id}`)}),runTransaction:async callback=>callback({
    get:async reference=>snapshot(reference),getAll:async(...items)=>items.map(snapshot),
    update:(reference,patch)=>store.set(reference.path,{...store.get(reference.path),...patch})})};
  const jobRef=ref('engagementMailJobs/job'),settingRef=ref('engagementConfigurations/notificationDelivery');
  const pointerRef=ref('engagementClosureQueue/nap-state-5162');
  const job={source:'nap',status:'ready',competitionId:'5162',toEmail:'real-club@example.org',createdAt:'2026-10-09T11:00:00.000Z',
    notificationEvent:{kind:'opening',cycleKey:'current'},notificationDueAt:'2026-10-09T11:00:00.000Z'};
  const enabled={enabled:true,enabledSince:'2026-10-09T10:00:00.000Z',discardThrough:''};
  store.set(settingRef.path,enabled);store.set(pointerRef.path,{cycleKey:'current',lifecycle:'open'});
  let sends=0;
  const services={projectId:'livepalmes-test',send:async document=>{
    sends++;assert.equal(document.data().toEmail,'livepalmes@nap-ffessm.fr');
    store.set(document.ref.path,{...document.data(),status:'sent'});return {status:'sent'};
  }};
  store.set(jobRef.path,{...job});assert.equal((await delivery.deliver(db,jobRef,services)).status,'sent');
  await delivery.deliver(db,jobRef,services);assert.equal(sends,1,'A sent mail is not sent again.');
  for(const setting of [{...enabled,enabled:false},{...enabled,enabledSince:'2026-10-09T12:00:00.000Z'},{...enabled,discardThrough:'2026-10-09T11:30:00.000Z'}]){
    store.set(settingRef.path,setting);store.set(jobRef.path,{...job});
    await delivery.deliver(db,jobRef,services);assert.equal(store.get(jobRef.path).status,'cancelled');assert.equal(sends,1);
  }
  store.set(settingRef.path,enabled);store.set(jobRef.path,{...job});store.set(pointerRef.path,{cycleKey:'reopened',lifecycle:'open'});
  await delivery.deliver(db,jobRef,services);assert.equal(sends,1,'An old lifecycle cannot send.');
  store.set(pointerRef.path,{cycleKey:'current',lifecycle:'open'});store.set(jobRef.path,{...job,status:'sending'});
  await delivery.deliver(db,jobRef,services);assert.equal(sends,1,'A claimed SMTP attempt is never blindly replayed.');
  console.log('NAP mail delivery: TEST recipient, kill switch, no catch-up, lifecycle and duplicate protection verified.');
  await batches();
  await senderOutcomes();
  trackingUI();
}
function trackingUI(){
  const fs=require('node:fs'),vm=require('node:vm');
  const source=fs.readFileSync('assets/livepalmes-admin-portal.js','utf8');
  const start=source.indexOf('  function renderEngagementMailJobs()'),end=source.indexOf('\n  async function loadEngagementMailJobs',start);
  const mount={innerHTML:''},now=new Date().toISOString();
  const jobs=['ready','sending','sent','failed','uncertain'].map((status,i)=>({id:String(i),status,type:'opening_notification',
    toEmail:'simulation@example.org',subject:'Ouverture des engagements — simulation',clubName:'Club de simulation',updatedAt:now}));
  const sandbox={Date,elements:{engagementsMailJobsList:mount},isEngagementAdminMode:()=>true,
    engagementMailJobs:jobs,engagementMailJobsLoading:false,selectedEngagementCompetitionId:'5162',engagementMailJobsCompetitionId:'5162',
    engagementMailJobsTotalCount:320,engagementMailJobsHasMore:true,engagementMailJobTypeLabel:()=> 'Ouverture',
    escapeHtml:x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
    formatDeadline:x=>x,clubDisplayLabel:job=>job.clubName};
  vm.runInNewContext(source.slice(start,end),sandbox);sandbox.renderEngagementMailJobs();
  assert.match(mount.innerHTML,/5 sur 320/);assert.match(mount.innerHTML,/Sur les lignes affichées/);
  assert.match(mount.innerHTML,/1 en cours/);assert.match(mount.innerHTML,/1 à vérifier/);
  assert.match(mount.innerHTML,/data-engagement-mail-jobs-refresh/);
  assert.match(mount.innerHTML,/Afficher plus/);
  if(process.env.NAP_MAIL_UI_FIXTURE){
    fs.mkdirSync(require('node:path').dirname(process.env.NAP_MAIL_UI_FIXTURE),{recursive:true});
    fs.writeFileSync(process.env.NAP_MAIL_UI_FIXTURE,'<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Suivi des envois — simulation sans mail</title><style>'+fs.readFileSync('assets/livepalmes-admin-portal.css','utf8')+'</style><body style="padding:16px;margin:0"><main class="admin-portal"><h1>Diffusion — simulation sans envoi</h1><div class="admin-engagements-mail-jobs">'+mount.innerHTML+'</div></main></body></html>');
  }
  jobs[1].updatedAt='2000-01-01T00:00:00Z';sandbox.renderEngagementMailJobs();assert.match(mount.innerHTML,/2 à vérifier/);
  sandbox.engagementMailJobs=[];sandbox.renderEngagementMailJobs();assert.match(mount.innerHTML,/data-engagement-mail-jobs-refresh/);
  console.log('Tracking UI: page-local counts, refresh, uncertain/stale sends, empty state and pagination verified.');
}
async function senderOutcomes(){
  const fs=require('node:fs'),vm=require('node:vm');
  const source=fs.readFileSync('functions/index.js','utf8');
  const start=source.indexOf('async function sendEngagementMailJob('),end=source.indexOf('\nfunction cleanEngagementClubPerson',start);
  const updates=[],sandbox={Date,normalizeEmail:x=>x,cleanText:x=>String(x||''),cleanFirestoreValue:x=>x,
    OPTIONAL_COMPETITION_MAIL_TYPES:new Set(),engagementMailAttachments:async()=>[],livePalmesMailHtml:x=>x,
    ENVIRONMENT:{projectId:'livepalmes-test'},db:{},engagementMailJobItemFromData:x=>x,
    require:name=>name==='./nap-mail-delivery'?delivery:{read:async()=>({}),decision:()=>({allowed:true,to:'fixture@example.org',test:true})}};
  vm.runInNewContext(source.slice(start,end),sandbox);
  let rejectSentWrite=false;
  const doc={id:'fixture',data:()=>({source:'nap',toEmail:'fixture@example.org',subject:'Simulation',textBody:'Fixture'}),
    ref:{set:async update=>{if(rejectSentWrite&&update.status==='sent')throw Error('write interrupted');updates.push(update);}}};
  let result=await sandbox.sendEngagementMailJob({sendMail:async()=>({messageId:'mock'})},doc,{fromEmail:'fixture@example.org'},{});
  assert.equal(result.status,'sent');
  rejectSentWrite=true;
  result=await sandbox.sendEngagementMailJob({sendMail:async()=>({messageId:'mock'})},doc,{fromEmail:'fixture@example.org'},{});
  assert.equal(result.status,'uncertain','SMTP accepted but recording failed must never become retryable');
  rejectSentWrite=false;
  result=await sandbox.sendEngagementMailJob({sendMail:async()=>{throw Object.assign(Error('timeout'),{code:'ETIMEDOUT'});}},doc,{fromEmail:'fixture@example.org'},{});
  assert.equal(result.status,'uncertain');assert.equal(result.stopDelivery,true);
  result=await sandbox.sendEngagementMailJob({sendMail:async()=>{throw Object.assign(Error('rejected'),{responseCode:451});}},doc,{fromEmail:'fixture@example.org'},{});
  assert.equal(result.status,'failed');assert.equal(result.stopDelivery,true);
  console.log('Real sender handler isolated: success, SMTP timeout, explicit rejection and post-acceptance storage failure verified without SMTP/Firebase.');
}
function fixture(count=320){
  const store=new Map(),refs=new Map();let now=Date.parse('2026-10-20T12:00:00Z'),lock=Promise.resolve();
  const ref=path=>{if(!refs.has(path))refs.set(path,{id:path.split('/').at(-1),path,get:async()=>snap(path)});return refs.get(path);};
  const snap=path=>({id:path.split('/').at(-1),ref:ref(path),data:()=>store.get(path)});
  function query(filters=[],after='',limit=20){return {
    where:(key,op,value)=>query([...filters,[key,value]],after,limit),orderBy:()=>query(filters,after,limit),
    startAfter:id=>query(filters,id,limit),limit:n=>query(filters,after,n),
    get:async()=>({docs:[...store.keys()].filter(path=>path.startsWith('engagementMailJobs/'))
      .sort().filter(path=>path.split('/').at(-1)>after&&filters.every(([key,value])=>store.get(path)[key]===value)).slice(0,limit).map(snap)})};}
  const transaction={get:async r=>snap(r.path),getAll:async(...rs)=>rs.map(r=>snap(r.path)),
    set:(r,value)=>store.set(r.path,{...store.get(r.path),...value}),update:(r,value)=>store.set(r.path,{...store.get(r.path),...value})};
  const db={collection:name=>({doc:id=>ref(`${name}/${id}`),...query()}),runTransaction:callback=>{
    const task=lock.then(()=>callback(transaction));lock=task.catch(()=>{});return task;}};
  store.set('engagementConfigurations/notificationDelivery',{enabled:true});
  store.set('engagementClosureQueue/nap-state-5162',{cycleKey:'current',lifecycle:'open'});
  for(let i=0;i<count;i++)store.set(`engagementMailJobs/${String(i).padStart(4,'0')}`,{source:'nap',status:'ready',competitionId:'5162',
    createdAt:'2026-10-20T10:00:00Z',toEmail:'fixture@example.org',notificationEvent:{kind:'opening',cycleKey:'current'}});
  const sent=new Set();
  const services={projectId:'livepalmes-test',clock:()=>now,sleep:async ms=>{now+=ms;},send:async doc=>{
    assert(!sent.has(doc.id),'No duplicate SMTP attempt');sent.add(doc.id);
    store.set(doc.ref.path,{...store.get(doc.ref.path),status:'sent'});return {status:'sent'};
  }};
  return {db,store,services,sent,advance:ms=>{now+=ms;}};
}
async function batches(){
  const f=fixture();
  const runs=await Promise.all([delivery.drain(f.db,f.services),delivery.drain(f.db,f.services)]);
  assert(runs.some(r=>r.reason==='worker-busy-or-paused'),'Only one worker runs');
  assert.equal(f.sent.size,120,'Multiple pages chained, bounded by time');
  await delivery.drain(f.db,f.services);await delivery.drain(f.db,f.services);
  assert.equal(f.sent.size,320,'300+ recipients eventually delivered once');
  await delivery.drain(f.db,f.services);assert.equal(f.sent.size,320);
  const interrupted=fixture(60);let calls=0;
  interrupted.services.send=async doc=>{calls++;interrupted.store.set(doc.ref.path,{...doc.data(),status:'uncertain'});return {status:'uncertain'};};
  assert.equal((await delivery.drain(interrupted.db,interrupted.services)).reason,'delivery-interrupted');
  await delivery.drain(interrupted.db,interrupted.services);assert.equal(calls,1,'Pause after an uncertain send');
  interrupted.advance(5*60*1000);
  const ids=[];interrupted.services.send=async doc=>{ids.push(doc.id);interrupted.store.set(doc.ref.path,{...doc.data(),status:'sent'});return {status:'sent'};};
  await delivery.drain(interrupted.db,interrupted.services);assert(!ids.includes('0000'),'Uncertain message never replayed');
  const skipped=fixture(640);for(let i=0;i<620;i++)skipped.store.get(`engagementMailJobs/${String(i).padStart(4,'0')}`).source='legacy';
  assert.equal((await delivery.drain(skipped.db,skipped.services)).scanned,600,'Read budget enforced');
  await delivery.drain(skipped.db,skipped.services);assert.equal(skipped.sent.size,20,'Cursor passes unrelated ready jobs');
  const killed=fixture(40),send=killed.services.send;
  killed.services.send=async doc=>{const r=await send(doc);killed.store.set('engagementConfigurations/notificationDelivery',{enabled:false});return r;};
  await delivery.drain(killed.db,killed.services);assert.equal(killed.sent.size,1,'Kill switch rechecked between messages');
  assert.equal(delivery.failure({responseCode:451},{smtpStarted:true}).status,'failed');
  assert.equal(delivery.failure({responseCode:550},{smtpStarted:true}).status,'failed');
  assert.equal(delivery.failure({code:'ETIMEDOUT'},{smtpStarted:true}).status,'uncertain');
  assert.equal(delivery.failure(new Error('Firestore write'),{smtpStarted:true,smtpAccepted:true}).status,'uncertain');
  const invalid=fixture(30),validSend=invalid.services.send;
  invalid.services.send=async doc=>{if(doc.id==='0000'){
    invalid.store.set(doc.ref.path,{...doc.data(),status:'failed'});return {status:'failed',stopDelivery:false};
  }return validSend(doc);};
  await delivery.drain(invalid.db,invalid.services);assert.equal(invalid.sent.size,29,'A permanently rejected address does not block the other clubs');
  console.log('NAP mail batches: 320 simulated sends, concurrent workers, continuation, bounded reads, kill switch and uncertain outcomes verified; no network.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
