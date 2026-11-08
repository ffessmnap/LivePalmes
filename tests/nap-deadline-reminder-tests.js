"use strict";
require('./helpers/offline-network');
const assert=require('node:assert/strict'),automation=require('../functions/nap-notification-automation'),reminder=require('../functions/nap-deadline-reminder');
const pages=require('../functions/nap-notification-pages'),delivery=require('../functions/nap-bcc-delivery'),tasks=require('../functions/nap-notification-task');
const deleted=Symbol('delete'),deadline='2026-11-12T21:00:00.000Z',due='2026-11-11T21:00:00.000Z',now='2026-11-10T10:00:00.000Z';
function memory(){
 const rows=new Map(),refs=new Map();let tail=Promise.resolve();
 const snap=ref=>({id:ref.id,ref,exists:rows.has(ref.path),data:()=>rows.has(ref.path)?structuredClone(rows.get(ref.path)):undefined});
 const write=(ref,value,merge)=>{const next=merge?{...rows.get(ref.path)}:{};for(const[k,v]of Object.entries(value)){if(v===deleted)delete next[k];else next[k]=structuredClone(v);}rows.set(ref.path,next);};
 const ref=(name,id)=>{const key=`${name}/${id}`;if(!refs.has(key))refs.set(key,{id,path:key,get:async()=>snap(refs.get(key)),set:async(v,o)=>write(refs.get(key),v,o?.merge)});return refs.get(key);};
 return {rows,collection:name=>({doc:id=>ref(name,id)}),getAll:async(...r)=>r.map(snap),runTransaction:fn=>{const run=tail.then(async()=>{const changes=[],tx={get:async r=>snap(r),getAll:async(...r)=>r.map(snap),create:(r,v)=>changes.push(()=>{assert.ok(!rows.has(r.path));write(r,v);}),set:(r,v,o)=>changes.push(()=>write(r,v,o?.merge)),update:(r,v)=>changes.push(()=>write(r,v,true))};const result=await fn(tx);changes.forEach(f=>f());return result;});tail=run.catch(()=>{});return run;}};
}
const competition={id:'5162',source:'nap',napSource:true,name:'Fictive',entryStatus:'open',entryDeadlineAt:deadline,organizerEmail:'org@example.org',computerEmail:'it@example.org'};
async function arm(){
 for(const changed of [{entryStatus:'closed'},{entryStatus:'upcoming'},{canceled:true},{entryStatus:'open'}])assert.equal((await reminder.arm({}, {...competition,entryDeadlineAt:'',...changed},now)).queued,false,'inapplicable/missing deadline never reads data or converts an invalid date');
 const db=memory(),input={competitionId:'5162',operation:'a'.repeat(64),action:'open',deadline,openingRequested:false,deliveryMode:'bcc-v1'};
 await automation.arm(db,input,now);const first=await reminder.arm(db,competition,now);
 const ref=db.collection(automation.COLLECTION).doc(first.eventId),event=db.rows.get(ref.path);
 assert.equal(event.runAt,due);assert.equal(event.reminderDueAt,due);assert.equal(event.kind,'deadline_reminder');
 assert.equal((await reminder.arm(db,competition,now)).eventId,first.eventId);assert.equal(db.rows.size,3);
 let scheduled;await tasks.enqueue(db,first.eventId,{clock:()=>Date.parse(now),deleteField:()=>deleted,enqueue:async(_data,options)=>{scheduled=options.scheduleTime.toISOString();}});assert.equal(scheduled,due,'task is scheduled at J-1, not at closure');
 assert.equal(automation.eligible(event,competition,due),true);
 assert.equal(automation.eligible(event,competition,'2026-11-12T20:59:59.000Z'),true,'late task can truthfully quote exact deadline');
 for(const changed of [{entryStatus:'closed'},{canceled:true},{entryDeadlineAt:'2026-11-13T21:00:00.000Z'}])assert.equal(automation.eligible(event,{...competition,...changed},due),false);
 assert.equal(automation.eligible(event,competition,deadline),false);
 assert.equal(automation.eligible(event,competition,now),false);
 assert.equal((await reminder.arm(db,competition,'2026-11-11T21:00:00.001Z')).queued,false,'no retroactive occurrence');
 const later='2026-11-14T21:00:00.000Z';await automation.arm(db,{...input,operation:'b'.repeat(64),deadline:later,newCycle:false},now);
 const second=await reminder.arm(db,{...competition,entryDeadlineAt:later},now);assert.notEqual(second.eventId,first.eventId);
 assert.equal(automation.currentEvent(event,db.rows.get(automation.stateRef(db,'5162').path)),false);
 await tasks.enqueue(db,first.eventId,{clock:()=>Date.parse(now),deleteField:()=>deleted,enqueue:()=>assert.fail('stale task queued')});
 assert.equal(db.rows.get(ref.path).status,'cancelled');
 await automation.arm(db,{...input,operation:'c'.repeat(64),newCycle:false},now);
 assert.equal((await reminder.arm(db,competition,now)).eventId,first.eventId);assert.equal(db.rows.get(ref.path).status,'pending','untouched date restored');
 db.rows.get(ref.path).status='completed';db.rows.get(ref.path).preparedCount=1;db.rows.get(ref.path).jobIds=['frozen'];
 assert.equal((await reminder.arm(db,competition,now)).queued,false,'completed occurrence never recreated');
 db.rows.get(ref.path).status='blocked';await assert.rejects(automation.resumeBlocked(db,ref,{simulation:true},now),/doublon/);
 for(const value of ['2027-03-29T21:00:00.000Z','2027-10-31T22:00:00.000Z']){
  const temp=memory();await automation.arm(temp,{...input,deadline:value},now);const result=await reminder.arm(temp,{...competition,entryDeadlineAt:value},now);
  assert.equal(Date.parse(value)-Date.parse(temp.rows.get(`${automation.COLLECTION}/${result.eventId}`).runAt),86400000,'24 elapsed hours across Paris DST');
 }
 return {db,ref,event};
}
async function snapshot(){
 let bytes,builds=0,downloads=0,saves=0;
 const event={operation:'a'.repeat(64),deadline,competitionId:'5162'};
 const file={download:async(options)=>{assert.deepEqual(options,{start:0,end:reminder.MAX_BYTES,decompress:false});downloads++;if(!bytes)throw {code:404};return [bytes];},save:async(value,options)=>{saves++;assert.equal(options.preconditionOpts.ifGenerationMatch,0);bytes=value;}};
 const build=async()=>{builds++;return {competition,recipients:[],entries:[]};};
 const first=await reminder.frozen(file,event,build),second=await reminder.frozen(file,event,()=>assert.fail('source rebuilt'));
 assert.deepEqual(second,first);assert.equal(builds,1);assert.equal(saves,1);assert.equal(downloads,2);
 await assert.rejects(reminder.frozen({...file,download:async()=>{throw Error('storage unavailable');}},event,build),/unavailable/);assert.equal(builds,1);
 const race={download:async()=>{if(++downloads===3)throw {code:404};return [bytes];},save:async()=>{throw {code:412};}};
 assert.deepEqual(await reminder.frozen(race,event,build),first,'conditional loser reads exact winner');
 await assert.rejects(reminder.frozen(file,{...event,deadline:'different'},build),/incompatible/);
 await assert.rejects(reminder.frozen({...file,download:async()=>[Buffer.alloc(reminder.MAX_BYTES+1)]},event,build),/volumineux/);
}
async function pagination(){
 const recipients=[1,2,3,4].map(id=>({uid:`u${id}`,clubId:String(id),email:`club${id}@example.org`,napClubRegionId:'Ile de France'}));
 let source,reads=0,pdf=0;
 const entries=[{clubId:'1',clubName:'Club nageurs',swimmers:[{name:'Camille'}],teamLeaderComplete:false},
  {clubId:'2',clubName:'Club officiels',swimmers:[],officials:[{name:'Juge exemple'}],teamLeaderComplete:false},
  {clubId:'4',swimmers:[{name:'Hors audience'}]}];
 const services={simulation:true,recipients:async()=>{reads++;return recipients;},mailSetting:async()=>({scope:'all'}),select:(kind,rows)=>{assert.equal(kind,'opening');return rows.filter(r=>r.clubId!=='4');},
  entries:async()=>({source:'nap',entries}),hasParticipants:entry=>(entry.swimmers||[]).length>0,
  reminderSnapshot:async(_event,build)=>source||=({...structuredClone(await build()),generatedAt:now}),
  clubPdf:async(_comp,entry,options)=>{pdf++;assert.equal(options.provisional,true);assert.equal(options.generatedAt,now);return {buffer:Buffer.from(entry.clubId),fileName:`PROVISOIRE-${entry.clubId}.pdf`};},
  mail:(kind,comp,recipient,details)=>({type:kind,competitionId:comp.id,textBody:reminder.text(comp,details),attachments:details.attachments||[]})};
 const event={kind:'deadline_reminder',phase:'empty',cursor:'',deliveryMode:'bcc-v1'};
 const empty=await pages.page(event,competition,services);assert.equal(empty.jobs.length,1);assert.equal(empty.jobs[0].recipients[0].clubId,'3');assert.equal(empty.jobs[0].attachments.length,0);assert.match(empty.jobs[0].textBody,/pas de pièce jointe/);assert.equal(pdf,0);
 const filled=await pages.page({...event,phase:'clubs',sourceHash:empty.sourceHash},competition,services);assert.equal(filled.jobs.length,2);assert.equal(pdf,2);assert.equal(reads,1);assert.ok(filled.done);
 for(const job of filled.jobs){assert.ok(job.recipients.every(r=>r.clubId===job.clubId));assert.equal(job.attachments[0].fileName,`PROVISOIRE-${job.clubId}.pdf`);assert.match(job.textBody,/VERSION PROVISOIRE/);assert.deepEqual(job.cc,['org@example.org','it@example.org']);}
 entries[0].swimmers=[];entries[1].officials=[];
 const retry=await pages.page({...event,phase:'clubs',sourceHash:empty.sourceHash},competition,services);
 assert.deepEqual(retry,filled,'a persisted snapshot is isolated from new NAP values');
 const custom=require('../functions/mail-template-catalog').definition('deadline_reminder');
 assert.throws(()=>require('../functions/mail-templates').validate(custom.id,{...custom,text:'Bonjour'}),/bloc/);
 const rendered=require('../functions/mail-template-rendering').competitionMail(custom.id,{schema:1,revision:1,templates:{[custom.id]:custom}},competition,{entry:{clubName:'Exemple'},attachments:[{}]},{subject:'fallback',text:'fallback'},'https://example.org');
 assert.match(rendered.text,/VERSION PROVISOIRE/);assert.doesNotMatch(rendered.text,/dans 24/);
}
async function fresh(){
 let queries=0;
 const connection={execute:async(options,values)=>{queries++;assert.match(options.sql,/WHERE c.id=\? LIMIT 2/);assert.deepEqual(values,[5162]);return [[{id:5162,actif:1,date_limit:'2026-11-12 22:00:00',canceled:0}]];}};
 assert.equal((await reminder.currentCompetition(connection,'5162',Date.parse(due))).entryDeadlineAt,deadline);assert.equal(queries,1);
 await assert.rejects(reminder.currentCompetition({execute:async()=>[[{},{}]]},'5162'),/volumineuse/);
 const db=memory(),reference=db.collection('engagementMailJobs').doc('frozen'),state=automation.stateRef(db,'5162');
 const notificationEvent={kind:'deadline_reminder',cycleKey:'cycle',reminderKey:'reminder',deadline,reminderDueAt:due};
 db.rows.set(state.path,{cycleKey:'cycle',lifecycle:'open',reminderKey:'reminder',deadline});
 db.rows.set('engagementConfigurations/notificationDelivery',{enabled:true,scope:'all'});
 db.rows.set(reference.path,{status:'ready',source:'nap',deliveryMode:'bcc-v1',competitionId:'5162',notificationEvent,notificationDueAt:due,recipients:[{email:'club@example.org',clubId:'1'}],attachments:[]});
 let sent=0,checked=0;
 const services={projectId:'livepalmes',attachments:async()=>[],eligible:()=>true,beforeSend:async()=>{checked++;assert.equal(db.rows.get(reference.path).status,'sending');return false;},content:()=>({text:'frozen'}),send:async()=>{sent++;}};
 assert.equal((await delivery.deliver(db,reference,services)).status,'cancelled');assert.equal(checked,1);assert.equal(sent,0,'closure/cancellation/date mutation after claim blocks SMTP');
 const eventId='nap-5162-'+'a'.repeat(40);
 db.rows.set(`${automation.COLLECTION}/${eventId}`,{source:'nap',competitionId:'5162',deliveryMode:'bcc-v1',status:'pending',runAt:due,...notificationEvent});
 assert.equal((await tasks.run(db,eventId,{projectId:'livepalmes-test',clock:()=>Date.parse(due),deleteField:()=>deleted,competition:()=>assert.fail('TEST business read')})).disabled,true);
}
async function volume(){
 const recipients=Array.from({length:10000},(_,i)=>({uid:`u${i}`,clubId:String(i%1000+1),email:`p${i}@example.org`,napClubRegionId:'Ile de France'}));
 let frozen,pdfs=0,reads=0,total=0,recipientsCount=0;
 const services={simulation:true,mailSetting:async()=>({scope:'all'}),select:(_kind,rows)=>rows,recipients:async()=>{reads++;return recipients;},entries:async()=>({source:'nap',entries:Array.from({length:500},(_,i)=>({clubId:String(i+1),officials:[{name:'Fictif'}]}))}),hasParticipants:()=>false,
  reminderSnapshot:async(_event,build)=>frozen||=({...await build(),generatedAt:now}),clubPdf:async()=>{pdfs++;return {buffer:Buffer.from('fixture'),fileName:'PROVISOIRE.pdf'};},mail:(type,comp,recipient,details)=>({type,attachments:details.attachments||[]})};
 const comp={...competition,organizerEmail:Array.from({length:5},(_,i)=>`o${i}@example.org`).join(';'),computerEmail:Array.from({length:5},(_,i)=>`i${i}@example.org`).join(';')};
 let event={kind:'deadline_reminder',phase:'empty',cursor:'',deliveryMode:'bcc-v1'},done=false;
 for(let pageCount=0;!done&&pageCount<120;pageCount++){
  const result=await pages.page(event,comp,services);assert.ok(result.jobs.length<=250);assert.ok(result.attachmentCount<=5);
  for(const job of result.jobs){assert.ok(job.recipients.length+job.cc.length<=50);recipientsCount+=job.recipients.length;}
  total+=result.jobs.length;done=result.done;event={...event,phase:result.nextPhase||event.phase,cursor:result.nextCursor,sourceHash:result.sourceHash};
 }
 assert.ok(done);assert.equal(reads,1);assert.equal(pdfs,500);assert.equal(recipientsCount,10000);assert.ok(total<=750);
}
async function invalidateDuringPreparation(){
 for(const patch of [{entryStatus:'closed'},{canceled:true},{entryDeadlineAt:'2026-11-15T21:00:00.000Z'}]){
  const db=memory();await automation.arm(db,{competitionId:'5162',operation:'e'.repeat(64),action:'open',deadline,openingRequested:false,deliveryMode:'bcc-v1'},now);
  const armed=await reminder.arm(db,competition,now),ref=db.collection(automation.COLLECTION).doc(armed.eventId);let changed;
  await automation.processEvent(db,ref,{clock:()=>Date.parse(due),deleteField:()=>deleted,competition:async()=>competition,
    page:async()=>{changed={...competition,...patch};return {jobs:[{id:'obsolete'}],done:true};},currentReminderCompetition:async()=>changed,job:()=>assert.fail('obsolete group committed')},due);
  assert.equal(db.rows.get(ref.path).status,'cancelled');assert.ok(!db.rows.has('engagementMailJobs/obsolete'));
 }
}
(async()=>{await arm();await snapshot();await pagination();await fresh();await volume();await invalidateDuringPreparation();console.log('J-1: exact opening scope, empty/incomplete/official-only clubs, immutable snapshots, late/change/back/DST scheduling, 10000 recipients and fresh preparation/post-claim guards passed offline.');})().catch(error=>{console.error(error);process.exitCode=1;});
