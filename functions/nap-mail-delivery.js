"use strict";
const control=require('./engagement-mail-control'),automation=require('./nap-notification-automation');
const {randomUUID}=require('node:crypto');
const LIMITS=Object.freeze({pageSize:20,maxScanned:600,maxProcessed:300,durationMs:120000,intervalMs:1000,leaseMs:240000});
function workerRef(db){return db.collection('engagementConfigurations').doc('napMailDeliveryWorker');}
// A failure after DATA may hide a successful delivery. Never automatically replay it.
function failure(error,{smtpStarted=false,smtpAccepted=false}={}){
  const code=Number(error?.responseCode||0);
  if(smtpAccepted)return {status:'uncertain',stop:true};
  if(smtpStarted&&!(code>=400&&code<=599))return {status:'uncertain',stop:true};
  return {status:'failed',stop:!smtpStarted||code<500||['EAUTH','ECONNECTION'].includes(error?.code)};
}
async function deliver(db, reference, services, now=new Date().toISOString()){
  const claimed=await db.runTransaction(async transaction=>{
    const [snapshot,settingSnapshot]=await transaction.getAll(reference,control.ref(db));
    const job=snapshot.data();
    if(!job||job.source!=='nap'||job.status!=='ready')return null;
    const pointer=await transaction.get(automation.stateRef(db,job.competitionId));
    const gate=control.decision(control.state(settingSnapshot.data()),job,services.projectId);
    if(!gate.allowed||!automation.currentEvent(job.notificationEvent,pointer.data()||{})){
      transaction.update(reference,{status:'cancelled',reason:gate.reason||'superseded',updatedAt:now});return null;
    }
    // SMTP has no exactly-once acknowledgement. Never automatically resend a
    // claimed job after a process interruption; its technical status is visible.
    transaction.update(reference,{status:'sending',attemptedAt:now,updatedAt:now});
    return {...job,toEmail:gate.to,testDelivery:gate.test};
  });
  if(!claimed)return {skipped:true};
  return services.send({id:reference.id,ref:reference,data:()=>claimed});
}
async function drain(db,services){
  const clock=services.clock||Date.now,sleep=services.sleep||(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
  const started=clock(),owner=randomUUID(),reference=workerRef(db);
  let cursorId='';
  const acquired=await db.runTransaction(async transaction=>{
    const state=(await transaction.get(reference)).data()||{};
    if(Number(state.leaseUntil||0)>started||Number(state.pauseUntil||0)>started)return false;
    cursorId=String(state.cursorId||'');
    transaction.set(reference,{owner,leaseUntil:started+LIMITS.leaseMs},{merge:true});return true;
  });
  if(!acquired)return {processed:0,sent:0,scanned:0,reason:'worker-busy-or-paused'};
  const result={processed:0,sent:0,scanned:0,reason:'empty'};
  let pauseUntil=0;
  try{
    while(result.scanned<LIMITS.maxScanned&&result.processed<LIMITS.maxProcessed&&clock()-started<LIMITS.durationMs){
      let query=db.collection('engagementMailJobs').where('status','==','ready').orderBy('__name__').limit(LIMITS.pageSize);
      if(cursorId)query=query.startAfter(cursorId);
      const snapshot=await query.get();
      if(!snapshot.docs.length){cursorId='';break;}
      // One shared lease read per page, never an additional read per displayed recipient.
      const lease=(await reference.get()).data()||{};
      if(lease.owner!==owner||Number(lease.leaseUntil||0)<=clock()){result.reason='lease-lost';return result;}
      for(const doc of snapshot.docs){
        if(result.processed>=LIMITS.maxProcessed||clock()-started>=LIMITS.durationMs){result.reason='budget';return result;}
        result.scanned++;
        cursorId=doc.id;
        const job=doc.data();
        if(job.source!=='nap'||(services.competitionId&&job.competitionId!==services.competitionId))continue;
        const outcome=await deliver(db,doc.ref,services,new Date(clock()).toISOString());
        if(outcome.skipped)continue;
        result.processed++;if(outcome.status==='sent')result.sent++;
        if(outcome.stopDelivery||outcome.status==='uncertain'){
          // Leave all unclaimed messages untouched. No automatic retry of failed attempts.
          pauseUntil=clock()+5*60*1000;result.reason='delivery-interrupted';return result;
        }
        await sleep(LIMITS.intervalMs);
      }
      if(snapshot.docs.length<LIMITS.pageSize){cursorId='';break;}
      result.reason='budget';
    }
    return result;
  }finally{
    await db.runTransaction(async transaction=>{
      const lease=(await transaction.get(reference)).data()||{};
      if(lease.owner===owner)transaction.set(reference,{owner:'',leaseUntil:0,pauseUntil,cursorId},{merge:true});
    });
  }
}
module.exports={deliver,drain,failure,LIMITS};
