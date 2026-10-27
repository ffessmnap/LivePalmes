"use strict";
const automation=require('./nap-notification-automation');
// Cloud Tasks accepts at most 30 days ahead. Stable checkpoints, anchored to
// the deadline, keep even distant closures scheduled without a polling scan.
const HORIZON_MS=28*24*60*60*1000;

async function current(db,ref,services){
  return db.runTransaction(async tx=>{
    const event=(await tx.get(ref)).data();
    if(!event||event.deliveryMode!=='bcc-v1'||!event.runAt||['blocked','cancelled'].includes(event.status))return null;
    if(event.kind!=='documents'){
      const pointer=(await tx.get(automation.stateRef(db,event.competitionId))).data()||{};
      if(!automation.currentEvent(event,pointer)){
        tx.update(ref,{status:'cancelled',reason:'superseded',runAt:services.deleteField(),
          deliveryPending:false,updatedAt:new Date((services.clock||Date.now)()).toISOString()});
        return null;
      }
    }
    return event;
  });
}

function scheduleAt(target,now){
  if(!Number.isFinite(target)||!Number.isFinite(now))throw new TypeError('Echeance de la tache invalide.');
  const steps=Math.max(0,Math.ceil((target-now)/HORIZON_MS)-1);
  return target-steps*HORIZON_MS;
}

async function continueTask(db,eventId,services,notBefore){
  const result=await enqueue(db,eventId,services,notBefore);
  // A dispatched checkpoint must fail when its successor cannot be created,
  // so Cloud Tasks retries it instead of acknowledging an unscheduled future.
  if(result.queued===false)throw new Error('Programmation de la notification a reprendre.');
  return result;
}

async function enqueue(db,eventId,services,notBefore=(services.clock||Date.now)()){
  if(!/^nap-[1-9]\d{0,15}-[a-f0-9]{40}$/.test(eventId))throw new TypeError('Evenement technique invalide.');
  const event=await current(db,db.collection(automation.COLLECTION).doc(eventId),services);
  if(!event)return {skipped:true};
  const now=(services.clock||Date.now)(),at=scheduleAt(Math.max(notBefore,new Date(event.runAt).getTime()),now);
  try {
    await services.enqueue({eventId},{id:automation.hash([eventId,event.updatedAt,Math.floor(at/60000)]),
      scheduleTime:new Date(at),dispatchDeadlineSeconds:540});
    return {queued:true};
  } catch(error){
    if(error.code==='functions/task-already-exists')return {queued:true,reused:true};
    // The durable event remains available to the hourly recovery sweep.
    services.warn?.('notification-task-enqueue-unavailable');
    return {queued:false};
  }
}

async function run(db,eventId,services){
  if(!/^nap-[1-9]\d{0,15}-[a-f0-9]{40}$/.test(eventId))throw new TypeError('Evenement technique invalide.');
  const ref=db.collection(automation.COLLECTION).doc(eventId),clock=services.clock||Date.now,started=clock();
  let event=await current(db,ref,services);
  if(!event)return {skipped:true};
  // Checkpoints and early invocations never prepare or deliver a mail, on
  // either environment. Superseded tasks have already been cancelled above.
  if(event.runAt>new Date(clock()).toISOString())return continueTask(db,eventId,services,clock());
  if(services.projectId!=='livepalmes'){
    await ref.set({status:'cancelled',reason:'test-emails-disabled',deliveryPending:false,runAt:services.deleteField(),updatedAt:new Date(clock()).toISOString()},{merge:true});
    return {disabled:true,sent:0};
  }
  for(let pages=0;pages<101&&clock()-started<180000;pages++){
    if(event.status==='completed')break;
    const result=await automation.processEvent(db,ref,services,new Date(clock()).toISOString());
    if(result.skipped)break;
    event=(await ref.get()).data();
  }
  event=(await ref.get()).data();
  if(event.status==='completed'&&event.deliveryPending){
    const result=await services.deliver(ref);
    if(result.done){
      await ref.set({deliveryPending:false,runAt:services.deleteField(),deliveryCompletedAt:new Date(clock()).toISOString(),updatedAt:new Date(clock()).toISOString()},{merge:true});
      return result;
    }
  }
  // Bounded continuations; the hourly sweep is only a recovery path.
  return continueTask(db,eventId,services,clock()+60000);
}
module.exports={enqueue,run,scheduleAt,HORIZON_MS};
