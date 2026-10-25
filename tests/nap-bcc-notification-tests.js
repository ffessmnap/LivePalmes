"use strict";
const assert=require('node:assert/strict');
const automation=require('../functions/nap-notification-automation');
const {page}=require('../functions/nap-notification-pages');
const delivery=require('../functions/nap-bcc-delivery');
const tasks=require('../functions/nap-notification-task');
const deleted=Symbol('delete');
function fixture(){
  const rows=new Map(),refs=new Map();let tail=Promise.resolve();
  const snapshot=ref=>({id:ref.id,ref,exists:rows.has(ref.path),data:()=>rows.has(ref.path)?structuredClone(rows.get(ref.path)):undefined});
  const reference=(collection,id)=>{
    const path=`${collection}/${id}`;
    if(!refs.has(path))refs.set(path,{id,path,get:async()=>snapshot(refs.get(path)),set:async(value,options)=>write(refs.get(path),value,options?.merge)});
    return refs.get(path);
  };
  function write(ref,value,merge){
    const next=merge?{...rows.get(ref.path)}:{};
    for(const [key,item]of Object.entries(value)){if(item===deleted)delete next[key];else next[key]=structuredClone(item);}
    rows.set(ref.path,next);
  }
  const db={rows,collection:name=>({doc:id=>reference(name,id)}),getAll:async(...items)=>items.map(snapshot),
    runTransaction:callback=>{
      const run=tail.then(async()=>{
        const writes=[],tx={get:async ref=>snapshot(ref),getAll:async(...items)=>items.map(snapshot),
          create:(ref,value)=>writes.push(()=>{assert.ok(!rows.has(ref.path));write(ref,value,false);}),
          set:(ref,value,options)=>writes.push(()=>write(ref,value,options?.merge)),update:(ref,value)=>writes.push(()=>write(ref,value,true))};
        const result=await callback(tx);writes.forEach(fn=>fn());return result;
      });tail=run.catch(()=>{});return run;
    }};
  return db;
}
const now='2026-10-25T10:00:00.000Z';
const recipients=Array.from({length:246},(_,i)=>({uid:`u${i}`,email:`club-admin-${i}@example.org`,clubId:String(i%129+1)}));
const competition={source:'nap',napSource:true,id:'5135',napFingerprint:'stable',clubDocuments:[{id:'nap-6122'},{id:'nap-6123'}]};
async function windows(){
  const db=fixture(),input={competitionId:'5135',operation:'a'.repeat(64),documentIds:['nap-6122']};
  const first=await automation.armDocuments(db,input,now);
  const [second,third]=await Promise.all([
    automation.armDocuments(db,{...input,operation:'b'.repeat(64),documentIds:['nap-6123']},'2026-10-25T10:04:59.000Z'),
    automation.armDocuments(db,{...input,operation:'c'.repeat(64),documentIds:['nap-6123']},'2026-10-25T10:04:59.001Z')]);
  assert.equal(first.eventId,second.eventId);assert.equal(first.eventId,third.eventId);
  assert.equal(second.runAt,'2026-10-25T10:05:00.000Z');
  const event=db.rows.get(`engagementClosureQueue/${first.eventId}`);
  assert.deepEqual(event.documentIds,['nap-6122','nap-6123']);
  const later=await automation.armDocuments(db,{...input,operation:'d'.repeat(64)},'2026-10-25T10:05:00.000Z');
  assert.notEqual(later.eventId,first.eventId);
  assert.equal((await automation.armDocuments(db,input,'2026-10-25T12:00:00.000Z')).eventId,first.eventId,'retry cannot create a new notification');
  assert.ok(!db.rows.get(`engagementClosureQueue/${first.eventId}`).lease);
  const revision=await automation.armDocuments(db,{...input,operation:'e'.repeat(64),controlRevision:2},'2026-10-25T10:05:01.000Z');
  assert.notEqual(revision.eventId,later.eventId,'a change to delivery settings starts a fresh window, with no catch-up');
  let enqueues=[];
  await tasks.enqueue(db,first.eventId,{enqueue:async(...args)=>enqueues.push(args)});
  assert.equal(enqueues.length,1);assert.equal(enqueues[0][1].dispatchDeadlineSeconds,540);
  return {db,event,ref:db.collection(automation.COLLECTION).doc(first.eventId)};
}
function pageServices(){return {simulation:true,recipients:async()=>recipients,select:(_kind,items)=>items,clubRecipients:items=>items,
  mail:(type,_competition,recipient,details)=>({type,toEmail:recipient.email,clubId:recipient.clubId,...details})};}
async function groups(){
  const {event}=await windows(),services=pageServices();
  const result=await page(event,competition,services);
  assert.equal(result.jobs.length,5,'246 recipients and two deposits => five SMTP submissions');
  assert.deepEqual(result.jobs.map(job=>job.recipients.length),[50,50,50,50,46]);
  assert.ok(result.jobs.every(job=>job.documents.length===2&&!job.toEmail&&!job.recipientUid));
  const seen=result.jobs.flatMap(job=>job.recipients.map(item=>item.email));assert.equal(new Set(seen).size,246);
  const noDocs=await page(event,{...competition,clubDocuments:[]},services);assert.equal(noDocs.cancelled,true);
  const byClub=Array.from({length:103},(_,i)=>({uid:`u${i}`,email:`p${i}@example.org`,clubId:i<102?'1':'2'}));
  const closed=await page({deliveryMode:'bcc-v1',kind:'closure',phase:'clubs',cursor:''},competition,{
    ...services,recipients:async()=>byClub,entries:async()=>({source:'nap',entries:[{clubId:'1',teamLeaderComplete:true},{clubId:'2',teamLeaderComplete:true}],clubsById:new Map()}),
    hasParticipants:()=>true,clubPdf:async(_c,entry)=>({buffer:Buffer.from(entry.clubId),fileName:`club-${entry.clubId}.pdf`})});
  assert.equal(closed.jobs.length,4);
  for(const job of closed.jobs){assert.ok(job.recipients.every(recipient=>recipient.clubId===job.clubId));assert.equal(job.attachments[0].fileName,`club-${job.clubId}.pdf`);}
}
async function smtp(){
  const db=fixture(),ref=db.collection('engagementMailJobs').doc('group');
  db.rows.set('engagementConfigurations/notificationDelivery',{enabled:true,scope:'all',enabledSince:'2026-10-01'});
  const base={source:'nap',deliveryMode:'bcc-v1',status:'ready',competitionId:'5135',type:'club_recap_pdf',clubId:'1',
    notificationEvent:{kind:'documents'},notificationDueAt:now,subject:'Simulation',textBody:'Simulation',attachments:[],
    recipients:[{uid:'u1',email:'first@example.org',clubId:'1'},{uid:'u2',email:'second@example.org',clubId:'1'}]};
  db.rows.set('users/u1',{status:'active',clubId:'1',enabled:true});db.rows.set('users/u2',{status:'active',clubId:'1',enabled:true});
  let sends=0,attachments=0;
  const services={projectId:'livepalmes',fromEmail:'sender@example.org',content:()=>({text:'Simulation — /portail.html#mon-compte'}),
    attachments:async()=>{attachments++;return [];},eligible:(job,item,snapshot)=>snapshot.data()?.enabled&&snapshot.data()?.status==='active'&&snapshot.data()?.clubId===job.clubId,
    send:async message=>{sends++;assert.equal(message.to,'sender@example.org');assert.deepEqual(message.envelope.to,message.bcc);return {accepted:message.bcc,rejected:[],messageId:'mock'};}};
  db.rows.set(ref.path,structuredClone(base));
  await delivery.deliver(db,ref,{...services,projectId:'livepalmes-test'});assert.equal(sends,0);assert.equal(attachments,0);
  await Promise.all([delivery.deliver(db,ref,services),delivery.deliver(db,ref,services)]);assert.equal(sends,1);
  assert.equal(db.rows.get(ref.path).sentCount,2);
  db.rows.set(ref.path,structuredClone(base));
  await delivery.deliver(db,ref,{...services,attachments:async()=>{db.rows.get('users/u2').enabled=false;return [];}});
  assert.deepEqual(db.rows.get(ref.path).recipients.map(item=>item.status),['sent','cancelled'],'opt-out during file retrieval is applied before SMTP');
  db.rows.get('users/u2').enabled=true;db.rows.get('users/u2').clubId='2';db.rows.set(ref.path,structuredClone(base));
  await delivery.deliver(db,ref,services);assert.equal(db.rows.get(ref.path).cancelledCount,1,'changed club cannot receive the previous club PDF');
  db.rows.get('users/u2').clubId='1';db.rows.set(ref.path,structuredClone(base));
  await delivery.deliver(db,ref,{...services,send:async()=>({accepted:['first@example.org'],rejected:['second@example.org']})});
  assert.equal(db.rows.get(ref.path).status,'partial');assert.equal(db.rows.get(ref.path).sentCount,1);assert.equal(db.rows.get(ref.path).failedCount,1);
  const before=sends;await delivery.deliver(db,ref,services);assert.equal(sends,before,'partial group is never replayed');
  db.rows.set(ref.path,structuredClone(base));
  await delivery.deliver(db,ref,{...services,send:async()=>{throw Error('SMTP timeout');}});
  assert.equal(db.rows.get(ref.path).status,'uncertain');await delivery.deliver(db,ref,services);assert.equal(sends,before);
  db.rows.set(ref.path,structuredClone(base));db.rows.get('engagementConfigurations/notificationDelivery').enabled=false;
  await delivery.deliver(db,ref,services);assert.equal(sends,before);assert.equal(db.rows.get(ref.path).status,'cancelled');
  // MIME is built in memory by the real library, without any network transport.
  const nodemailer=require('../functions/node_modules/nodemailer');
  const mime=await nodemailer.createTransport({name:'memory-smtp',version:'1',send:(mail,callback)=>
    mail.message.build((error,message)=>callback(error,{message,envelope:mail.message.getEnvelope()}))}).sendMail({from:services.fromEmail,to:services.fromEmail,
    bcc:['secret-one@example.org','secret-two@example.org'],envelope:{from:services.fromEmail,to:['secret-one@example.org','secret-two@example.org']},subject:'Simulation',text:'Texte commun'});
  assert.ok(!mime.message.toString().includes('secret-'));assert.ok(!/^Bcc:/im.test(mime.message.toString()));
  assert.equal(mime.envelope.to.length,2);
}
async function worker(){
  const {db,ref,event}=await windows();let prepared=0,delivered=0,scheduled=0;
  const services={projectId:'livepalmes',clock:()=>Date.parse('2026-10-25T10:06:00Z'),deleteField:()=>deleted,
    competition:async()=>competition,page:async()=>{prepared++;return {jobs:[{id:'group'}],done:true};},job:(_e,_c,job)=>({...job,status:'ready'}),
    deliver:async()=>{delivered++;return {done:true,sent:246};},enqueue:async()=>{scheduled++;}};
  await tasks.run(db,ref.id,services);await tasks.run(db,ref.id,services);
  assert.equal(prepared,1);assert.equal(delivered,1);assert.equal(scheduled,0);
  assert.deepEqual(db.rows.get(ref.path).jobIds,['group']);assert.ok(!db.rows.get(ref.path).runAt);
  db.rows.set(ref.path,structuredClone(event));
  await tasks.run(db,ref.id,{...services,projectId:'livepalmes-test'});assert.equal(prepared,1);assert.equal(delivered,1);assert.equal(db.rows.get(ref.path).reason,'test-emails-disabled');
}
async function batches(){
  const db=fixture(),ref=db.collection(automation.COLLECTION).doc('batch');let tick=Date.parse(now),sends=0;
  db.rows.set('engagementConfigurations/notificationDelivery',{enabled:true,scope:'all'});
  const ids=Array.from({length:55},(_,i)=>String(i));
  db.rows.set(ref.path,{jobIds:ids});
  for(const id of ids)db.rows.set(`engagementMailJobs/${id}`,{source:'nap',deliveryMode:'bcc-v1',status:'ready',competitionId:'5135',notificationDueAt:now,
    notificationEvent:{kind:'documents'},recipients:[{email:`p${id}@example.org`,clubId:'1'}],attachments:[]});
  const services={projectId:'livepalmes',clock:()=>tick,sleep:async ms=>{tick+=ms;},fromEmail:'from@example.org',eligible:()=>true,
    attachments:async()=>[],content:()=>({text:'Fixture'}),send:async message=>{sends++;return {accepted:message.bcc};}};
  const result=await delivery.drain(db,ref,services);assert.equal(result.done,false);assert.equal(sends,50);
  assert.equal(db.rows.get(ref.path).deliveryCursor,50);
  assert.equal((await delivery.drain(db,ref,services)).done,true);assert.equal(sends,55);
  await delivery.drain(db,ref,services);assert.equal(sends,55,'continuation does not resend completed groups');
  db.rows.set('engagementConfigurations/napMailDeliveryWorker',{owner:'another',leaseUntil:tick+60000});
  assert.equal((await delivery.drain(db,ref,services)).reason,'worker-busy-or-paused','one shared SMTP lease across formats');
}
async function adapter(){
  const fs=require('node:fs'),vm=require('node:vm'),source=fs.readFileSync('functions/index.js','utf8');
  const start=source.indexOf('function nativeNotificationTaskServices('),end=source.indexOf('async function enqueueNativeNotificationTask(',start);
  let captured,transports=0;
  const sandbox={ENVIRONMENT:{projectId:'livepalmes',hostingOrigin:'https://example.org'},db:{},
    nativeNotificationAutomationServices:()=>({competition:async()=>competition}),engagementMailSmtpConfig:()=>({ready:true,transport:{},fromEmail:'from@example.org'}),
    nodemailer:{createTransport:()=>{transports++;return {close:()=>{},sendMail:()=>{throw Error('No SMTP allowed in fixture');}};}},
    engagementMailAttachments:async()=>[],livePalmesMailHtml:text=>text,normalizeEmail:text=>String(text||'').toLowerCase(),
    engagementMailRecipientFromUserDoc:snapshot=>snapshot.data(),engagementRecipientHasCapability:recipient=>recipient.capabilities.includes('engagements.club.manage'),
    require:name=>{assert.equal(name,'./nap-bcc-delivery');return {drain:async(_db,_ref,services)=>{captured=services;return {done:true};}};}};
  vm.runInNewContext(source.slice(start,end),sandbox);
  const services=sandbox.nativeNotificationTaskServices();
  await services.deliver({get:async()=>({data:()=>({competitionId:'5135'})})});
  const content=captured.content({type:'club_recap_pdf',recipientUid:'personal-secret',textBody:'Fixture'});
  assert.match(content.text,/https:\/\/example.org\/portail.html#mon-compte/);assert.ok(!content.text.includes('personal-secret'));
  const item={email:'member@example.org',clubId:'1',recipientRegionId:''};
  const good={status:'active',email:item.email,clubId:'1',competitionNotificationsEnabled:true,capabilities:['engagements.club.manage']};
  assert.equal(captured.eligible({type:'club_recap_pdf',clubId:'1'},item,{data:()=>good}),true);
  for(const change of [{status:'disabled'},{clubId:'2'},{email:'changed@example.org'},{competitionNotificationsEnabled:false},{capabilities:[]}])
    assert.equal(captured.eligible({type:'club_recap_pdf',clubId:'1'},item,{data:()=>({...good,...change})}),false);
  sandbox.ENVIRONMENT.projectId='livepalmes-test';await services.deliver({get:()=>{throw Error('No business read on TEST');}});assert.equal(transports,1);
}
(async()=>{await groups();await smtp();await worker();await batches();await adapter();console.log('BCC notifications: fixed five-minute window, concurrent deposits/tasks, 246 => 5, club PDF isolation, fresh preferences, partial SMTP, MIME privacy, continuations and TEST hard stop verified without network.');})().catch(error=>{console.error(error);process.exitCode=1;});
