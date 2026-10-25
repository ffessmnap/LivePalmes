"use strict";
const control=require('./engagement-mail-control');
const automation=require('./nap-notification-automation');
const legacy=require('./nap-mail-delivery');
const {randomUUID}=require('node:crypto');
const email=value=>String(value?.address||value||'').trim().toLowerCase();

// Each claim is terminal for automatic retries, including a worker killed after
// SMTP DATA. Only untouched groups are resumed. No real SMTP on TEST.
async function deliver(db,reference,services,now=new Date().toISOString()) {
  if(services.projectId!=='livepalmes')return {skipped:true,reason:'test-smtp-disabled'};
  const prepared=(await reference.get()).data();
  if(prepared?.status!=='ready'||prepared?.deliveryMode!=='bcc-v1')return {skipped:true};
  let attachments,attachmentError;
  try{attachments=await services.attachments(prepared);}catch(error){attachmentError=error;}
  const claimed=await db.runTransaction(async tx=>{
    const [snapshot,settingSnapshot]=await tx.getAll(reference,control.ref(db));
    const job=snapshot.data();
    if(!job||job.source!=='nap'||job.deliveryMode!=='bcc-v1'||job.status!=='ready')return null;
    if(!Array.isArray(job.recipients)||!job.recipients.length||job.recipients.length>50)throw new TypeError('Groupe CCI invalide.');
    const [pointer,...users]=await tx.getAll(automation.stateRef(db,job.competitionId),
      ...job.recipients.filter(item=>item.uid).map(item=>db.collection('users').doc(item.uid)));
    const setting=control.state(settingSnapshot.data()),gate=control.eventDecision(setting,job);
    let userIndex=0;
    const recipients=job.recipients.map(item=>{
      const user=item.uid?users[userIndex++]:null;
      const allowed=gate.allowed&&automation.currentEvent(job.notificationEvent,pointer.data()||{})&&
        control.audienceAllowed(setting,{...job,...item})&&services.eligible(job,item,user);
      return {...item,status:allowed?'sending':'cancelled'};
    });
    const active=recipients.filter(item=>item.status==='sending');
    if(new Set(active.map(item=>email(item.email))).size!==active.length)throw new TypeError('Adresse CCI dupliquee.');
    const status=active.length?'sending':'cancelled';
    tx.update(reference,{status,recipients,recipientCount:recipients.length,cancelledCount:recipients.length-active.length,
      attemptedAt:active.length?now:'',reason:gate.reason||'',updatedAt:now});
    return active.length?{...job,recipients,active}:null;
  });
  if(!claimed)return {skipped:true};
  let smtpStarted=false,smtpAccepted=false;
  try {
    if(attachmentError)throw attachmentError;
    if(attachments.length!==(claimed.attachments||[]).length)throw new TypeError('Piece jointe manquante.');
    // The emergency switch is checked again after file retrieval, before DATA.
    const gate=control.eventDecision(await control.read(db),claimed);
    if(!gate.allowed){
      await reference.set({status:'cancelled',reason:gate.reason,recipients:claimed.recipients.map(item=>({...item,status:'cancelled'})),
        cancelledCount:claimed.recipients.length,updatedAt:new Date().toISOString()},{merge:true});
      return {status:'cancelled'};
    }
    const to=claimed.active.map(item=>email(item.email));
    const content=services.content(claimed);
    smtpStarted=true;
    const info=await services.send({from:`LivePalmes <${services.fromEmail}>`,to:services.fromEmail,bcc:to,
      envelope:{from:services.fromEmail,to},subject:claimed.subject,...content,attachments});
    smtpAccepted=true;
    const accepted=new Set((info.accepted||[]).map(email)),rejected=new Set((info.rejected||[]).map(email));
    const recipients=claimed.recipients.map(item=>({...item,status:item.status==='cancelled'?'cancelled':
      accepted.has(email(item.email))?'sent':rejected.has(email(item.email))?'failed':'uncertain'}));
    const sentCount=recipients.filter(item=>item.status==='sent').length,failedCount=recipients.filter(item=>item.status==='failed').length;
    const uncertainCount=recipients.filter(item=>item.status==='uncertain').length;
    const status=uncertainCount?'uncertain':failedCount?(sentCount?'partial':'failed'):'sent';
    const rejectionStop=(info.rejectedErrors||[]).some(error=>legacy.failure(error,{smtpStarted:true}).stop);
    await reference.set({status,recipients,sentCount,failedCount,uncertainCount,sentAt:sentCount?new Date().toISOString():'',
      failedAt:failedCount?new Date().toISOString():'',
      providerMessageId:String(info.messageId||'').slice(0,180),updatedAt:new Date().toISOString()},{merge:true});
    return {status,sentCount,stopDelivery:uncertainCount>0||rejectionStop};
  } catch(error){
    const outcome=legacy.failure(error,{smtpStarted,smtpAccepted});
    await reference.set({status:outcome.status,recipients:claimed.recipients.map(item=>({...item,
      status:item.status==='cancelled'?'cancelled':outcome.status})),
      sentCount:0,failedCount:outcome.status==='failed'?claimed.active.length:0,
      uncertainCount:outcome.status==='uncertain'?claimed.active.length:0,
      reason:outcome.status==='uncertain'?'Resultat SMTP incertain : verification requise, aucun renvoi automatique.':'Envoi refuse ou piece jointe indisponible : aucun renvoi automatique.',
      failedAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{merge:true});
    return {status:outcome.status,stopDelivery:outcome.stop};
  }
}

async function drain(db,eventRef,services){
  if(services.projectId!=='livepalmes')return {done:true,sent:0,reason:'test-smtp-disabled'};
  const clock=services.clock||Date.now,sleep=services.sleep||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
  const started=clock(),owner=randomUUID(),worker=legacy.workerRef(db);
  const acquired=await db.runTransaction(async tx=>{
    const state=(await tx.get(worker)).data()||{};
    if(Number(state.leaseUntil||0)>started||Number(state.pauseUntil||0)>started)return false;
    tx.set(worker,{owner,leaseUntil:started+240000},{merge:true});return true;
  });
  if(!acquired)return {done:false,sent:0,reason:'worker-busy-or-paused'};
  let pauseUntil=0,sent=0;
  try{
    const event=(await eventRef.get()).data();
    if(!event)return {done:true,sent:0};
    const ids=event.jobIds||[];if(ids.length>1000)throw new RangeError('Trop de groupes.');
    let cursor=Number(event.deliveryCursor||0),processed=0;
    while(cursor<ids.length&&processed<50&&clock()-started<120000){
      const snapshot=await db.getAll(...ids.slice(cursor,cursor+20).map(id=>db.collection('engagementMailJobs').doc(id)));
      for(const doc of snapshot){
        if(processed>=50||clock()-started>=120000)break;
        const lease=(await worker.get()).data()||{};
        if(lease.owner!==owner||lease.leaseUntil<=clock())return {done:false,sent,reason:'lease-lost'};
        const result=await deliver(db,doc.ref,services,new Date(clock()).toISOString());
        cursor++;processed++;sent+=result.sentCount||0;
        await eventRef.set({deliveryCursor:cursor,updatedAt:new Date(clock()).toISOString()},{merge:true});
        if(result.stopDelivery){pauseUntil=clock()+300000;return {done:false,sent,reason:'delivery-interrupted'};}
        if(!result.skipped)await sleep(1000);
      }
    }
    return {done:cursor>=ids.length,sent};
  } finally {
    await db.runTransaction(async tx=>{
      if((await tx.get(worker)).data()?.owner===owner)tx.set(worker,{owner:'',leaseUntil:0,pauseUntil},{merge:true});
    });
  }
}
module.exports={deliver,drain};
