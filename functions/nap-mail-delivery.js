"use strict";
const control=require('./engagement-mail-control'),automation=require('./nap-notification-automation');
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
  const snapshot=await db.collection('engagementMailJobs').where('status','==','ready').limit(21).get();
  const candidates=snapshot.docs.filter(doc=>doc.data().source==='nap'&&(!services.competitionId||doc.data().competitionId===services.competitionId)).slice(0,10);
  const results=[];
  for(const doc of candidates)results.push(await deliver(db,doc.ref,services));
  return {processed:results.length,sent:results.filter(result=>result.status==='sent').length};
}
module.exports={deliver,drain};
