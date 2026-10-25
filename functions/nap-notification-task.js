"use strict";
const automation=require('./nap-notification-automation');

async function enqueue(db,eventId,services,notBefore=Date.now()){
  if(!/^nap-[1-9]\d{0,15}-[a-f0-9]{40}$/.test(eventId))throw new TypeError('Evenement technique invalide.');
  const event=(await db.collection(automation.COLLECTION).doc(eventId).get()).data();
  if(!event||event.deliveryMode!=='bcc-v1'||!event.runAt||['blocked','cancelled'].includes(event.status))return {skipped:true};
  const at=Math.max(notBefore,new Date(event.runAt).getTime());
  // Automatic deadlines can be months away. They stay with the existing sweep.
  if(event.automatic&&event.runAt>new Date().toISOString())return {skipped:true};
  try {
    await services.enqueue({eventId},{id:automation.hash([eventId,event.updatedAt,Math.floor(at/60000)]),
      scheduleTime:new Date(at),dispatchDeadlineSeconds:540});
    return {queued:true};
  } catch(error){
    if(error.code==='functions/task-already-exists')return {queued:true,reused:true};
    // The durable event and its runAt remain available to the existing sweep.
    services.warn?.('notification-task-enqueue-unavailable');
    return {queued:false};
  }
}

async function run(db,eventId,services){
  if(!/^nap-[1-9]\d{0,15}-[a-f0-9]{40}$/.test(eventId))throw new TypeError('Evenement technique invalide.');
  const ref=db.collection(automation.COLLECTION).doc(eventId),clock=services.clock||Date.now,started=clock();
  let event=(await ref.get()).data();
  if(!event||event.deliveryMode!=='bcc-v1'||!event.runAt||['cancelled','blocked'].includes(event.status))return {skipped:true};
  if(services.projectId!=='livepalmes'){
    await ref.set({status:'cancelled',reason:'test-emails-disabled',deliveryPending:false,runAt:services.deleteField(),updatedAt:new Date(clock()).toISOString()},{merge:true});
    return {disabled:true,sent:0};
  }
  if(event.runAt>new Date(clock()).toISOString())return enqueue(db,eventId,services,clock());
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
  // Bounded continuations; the periodic fallback is unchanged.
  return enqueue(db,eventId,services,clock()+60000);
}
module.exports={enqueue,run};
