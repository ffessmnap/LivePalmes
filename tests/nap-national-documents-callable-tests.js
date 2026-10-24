'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(require.resolve('../functions/index.js'),'utf8');
let national=true,reads=0,smtp=0,writes=0,enabled=true;
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
const context={exports:{},CALLABLE_OPTIONS:{},ENGAGEMENT_DOCUMENT_UPLOAD_OPTIONS:{},ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS:{secrets:['LIVEPALMES_NAP_PASSWORD']},ENGAGEMENT_MAIL_CALLABLE_OPTIONS:{},ENGAGEMENT_NOTIFICATION_MAIL_SECRETS:['SMTP_SECRET'],ENVIRONMENT:{sportingDataSource:'nap',projectId:'livepalmes-test'},process:{env:{}},crypto,HttpsError,Date,Set,
 defineSecret:x=>x,onCall:(options,fn)=>Object.assign(fn,{options}),
 engagementAccessContext:async r=>{if(!r.auth)throw new HttpsError('unauthenticated','Connexion requise');return {uid:'trusted',national};},
 engagementMailRecipientIndexStateRef:()=>({get:async()=>({data:()=>({status:'ready'})})}),engagementMailRecipientsFromIndex:async()=>[{uid:'club-user',email:'club@example.org',clubId:'12',capabilities:['engagements.club.manage'],napClubRegionId:'Ile de France'}],
 engagementCompetitionNotificationRecipients:r=>r.filter(x=>x.competitionNotificationsEnabled!==false),engagementDedupMailRecipients:r=>r,engagementRecipientHasCapability:(r,c)=>r.capabilities.includes(c),
 engagementMailSmtpConfig:()=>{smtp++;throw Error('SMTP forbidden on TEST');},
 db:{collection:()=>{writes++;throw Error('Outbox forbidden on TEST');}},
 require:name=>{
  if(name==='./nap-portal-swimmers')return {portalPool:()=>({})};
  if(name==='./nap-national-documents')return {record:async()=>{reads++;return {};},view:()=>({id:42,title:'Test',fingerprint:'document'}),list:async()=>{reads++;return {documents:[]};}};
  if(name==='./nap-notification-preview')return {nativeClubScopes:async(_p,r)=>r};
  if(name==='./engagement-mail-control')return {read:async()=>({enabled,scope:'all',revision:1}),clubAllowed:()=>true};
  throw Error(`Unexpected module ${name}`);
 }};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('async function nationalLibraryContext'),source.indexOf('async function mutateNativeCompetitionDocument')),context);
vm.runInContext(source.slice(source.indexOf('exports.getNationalFeaturedDocuments ='),source.indexOf('// End national document selection.')),context);
const notifyStart=source.indexOf('exports.notifyEngagementCompetitionDocuments =');
vm.runInContext(source.slice(notifyStart,source.indexOf('\n});',notifyStart)+4),context);
(async()=>{
 const request={auth:{uid:'trusted'},data:{library:true,action:'preview',documentId:42}};
 const preview=await context.exports.notifyEngagementCompetitionDocuments(request);assert.equal(preview.test,true);assert.equal(preview.disabled,true);assert.equal(preview.recipientCount,1);
 const sent=await context.exports.notifyEngagementCompetitionDocuments({...request,data:{library:true,action:'send',documentId:42,expectedFingerprint:preview.fingerprint}});assert.equal(sent.sentCount,0);assert.equal(sent.done,true);assert.equal(smtp,0);assert.equal(writes,0);
 assert.deepEqual(Array.from(context.exports.notifyEngagementCompetitionDocuments.options.secrets),['LIVEPALMES_NAP_PASSWORD']);
 await assert.rejects(context.exports.notifyEngagementCompetitionDocuments({...request,data:{library:true,action:'send',documentId:42,expectedFingerprint:'stale'}}),/changé/);
 national=false;const count=reads;await assert.rejects(context.exports.getNationalFeaturedDocuments({...request,data:{library:true,action:'list',national:true}}),e=>e.code==='permission-denied');await assert.rejects(context.exports.notifyEngagementCompetitionDocuments(request),e=>e.code==='permission-denied');assert.equal(reads,count);
 await assert.rejects(context.exports.getNationalFeaturedDocuments({data:{library:true,action:'list',national:true}}),e=>e.code==='unauthenticated');
 // Exercise the future PROD branch with in-memory jobs and a fake transport.
 // No network, SMTP socket, Firebase or sporting write is permitted here.
 national=true;context.ENVIRONMENT.projectId='livepalmes';context.ENVIRONMENT.hostingOrigin='https://example.org';
 const jobs=new Map();let sentCount=0;
 context.ENGAGEMENT_MAIL_JOBS_COLLECTION='engagementMailJobs';
 context.engagementMailRecipientsFromIndex=async()=>Array.from({length:45},(_,i)=>({uid:`club-${String(i).padStart(2,'0')}`,email:`club${i}@example.org`,clubId:String(i+1),capabilities:['engagements.club.manage']}));
 context.db={collection:()=>({doc:id=>({id})}),runTransaction:async fn=>fn({get:async ref=>({exists:jobs.has(ref.id)}),create:(ref,job)=>jobs.set(ref.id,job)})};
 context.engagementMailSmtpConfig=()=>({ready:true,transport:{}});context.nodemailer={createTransport:()=>({close:()=>{}})};
 context.sendEngagementMailJob=async()=>{sentCount++;return {status:'sent'};};context.writeAuditLog=async()=>{};
 const prod=await context.exports.notifyEngagementCompetitionDocuments(request);assert.equal(prod.disabled,false);assert.equal(prod.recipientCount,45);
 const send=offset=>context.exports.notifyEngagementCompetitionDocuments({...request,data:{library:true,action:'send',documentId:42,expectedFingerprint:prod.fingerprint,offset}});
 const first=await send(0);assert.equal(first.sentCount,20);assert.equal(first.done,false);assert.equal(first.nextOffset,20);
 const duplicate=await send(0);assert.equal(duplicate.sentCount,0,'Duplicate batch must never resend');assert.equal(duplicate.skippedCount,20);assert.equal(sentCount,20);
 await send(20);assert.equal((await send(40)).sentCount,5);assert.equal(sentCount,45);assert.equal(jobs.size,45);
 await assert.rejects(send(1),/Page de notification invalide/);
 enabled=false;const stopped=await context.exports.notifyEngagementCompetitionDocuments(request);assert.equal(stopped.disabled,true);
 // The deployed callable metadata is evaluated separately for PROD.
 context.ENGAGEMENT_NOTIFICATION_MAIL_SECRETS=['LIVEPALMES_SMTP_HOST','LIVEPALMES_SMTP_PORT','LIVEPALMES_SMTP_USER','LIVEPALMES_SMTP_PASS','LIVEPALMES_SMTP_SECURE','LIVEPALMES_MAIL_FROM','LIVEPALMES_NOTIFICATION_LINK_SECRET'];
 vm.runInContext(source.slice(notifyStart,source.indexOf('\n});',notifyStart)+4),context);
 assert.equal(context.exports.notifyEngagementCompetitionDocuments.options.timeoutSeconds,300);
 assert.deepEqual(Array.from(context.exports.notifyEngagementCompetitionDocuments.options.secrets),['LIVEPALMES_NAP_PASSWORD',...context.ENGAGEMENT_NOTIFICATION_MAIL_SECRETS]);
 // Actual IDF control, with fixtures for region, opt-out and capability boundaries.
 const realControl=require('../functions/engagement-mail-control'),priorRequire=context.require;
 let setting={enabled:true,scope:'idf',revision:4,enabledSince:'2026-10-20T10:00:00Z',discardThrough:'2026-10-20T10:00:00Z'};
 context.require=name=>name==='./engagement-mail-control'?{...realControl,read:async()=>setting}:priorRequire(name);
 const fixture=(uid,region,extra={})=>({uid,email:`${uid}@example.invalid`,clubId:'12',capabilities:['engagements.club.manage'],napClubRegionId:region,...extra});
 context.engagementMailRecipientsFromIndex=async()=>[fixture('idf','Ile de France'),fixture('outside','Bretagne'),fixture('optout','Ile de France',{competitionNotificationsEnabled:false}),fixture('rights','Ile de France',{capabilities:[]})];
 const sentBefore=sentCount;
 const scoped=await context.exports.notifyEngagementCompetitionDocuments(request);assert.equal(scoped.recipientCount,1);assert.equal(scoped.scope,'idf');
 setting={...setting,revision:5};
 await assert.rejects(context.exports.notifyEngagementCompetitionDocuments({...request,data:{...request.data,action:'send',expectedFingerprint:scoped.fingerprint}}),/changé/);assert.equal(sentCount,sentBefore);
 setting={...setting,revision:4};
 context.sendEngagementMailJob=async(_transport,snapshot)=>{assert.equal(snapshot.data().recipientRegionId,'Ile de France');assert.equal(snapshot.data().recipientUid,'idf');sentCount++;return {status:'blocked',stopDelivery:true};};
 const stoppedBatch=await context.exports.notifyEngagementCompetitionDocuments({...request,data:{...request.data,action:'send',expectedFingerprint:scoped.fingerprint}});
 assert.equal(stoppedBatch.interrupted,true);assert.equal(stoppedBatch.done,true);assert.equal(sentCount,sentBefore+1);
 const replay=await context.exports.notifyEngagementCompetitionDocuments({...request,data:{...request.data,action:'send',expectedFingerprint:scoped.fingerprint}});assert.equal(replay.skippedCount,1);assert.equal(sentCount,sentBefore+1);
 setting={...setting,enabled:false};const off=await context.exports.notifyEngagementCompetitionDocuments(request);assert.equal(off.disabled,true);
 console.log('National library: authority, TEST zero SMTP/outbox, PROD runtime, IDF/preferences, 20-item batches, replay, stale preview and delivery stop passed offline.');
})().catch(error=>{console.error(error);process.exitCode=1;});
